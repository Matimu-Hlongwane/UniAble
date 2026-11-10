import { Router, type Response } from "express";
import type { DecodedIdToken } from "firebase-admin/auth";
import { getAdminDb } from "../services/firebase.js";
import {
  sendEmergencyNotifications,
  sendSosUpdateNotification,
  type SosUpdateKind,
} from "../services/emergencyNotifications.js";
import {
  MIN_LOCATION_UPDATE_INTERVAL_MS,
  appendTimeline,
  cleanNote,
  decideAcknowledge,
  decideCancel,
  decideResolve,
  isOpenStatus,
  makeEvent,
  normaliseAlert,
  parseLocation,
  parseLocationIssue,
  parseResolution,
  sortForResponders,
  toResponderView,
  toStudentView,
  type TransitionDecision,
} from "../services/sosRules.js";
import { requireFirebaseUser, requireRole } from "../middleware/authMiddleware.js";
import type {
  NotificationDelivery,
  Role,
  SosAlert,
  SosResponder,
  UserProfile,
} from "../types.js";
import { authToken, bodyOf, errorMessage, nowIso, route } from "../utils.js";

const router = Router();
router.use(requireFirebaseUser);

const RESPONDER_ROLES: Role[] = ["security", "volunteer", "admin"];
const HISTORY_LIMIT = 200;
const STUDENT_HISTORY_LIMIT = 50;

/** Thrown inside a transaction to abort it with a specific HTTP answer. */
class HttpError extends Error {
  readonly httpStatus: number;

  constructor(httpStatus: number, message: string) {
    super(message);
    this.httpStatus = httpStatus;
  }
}

function sendHttpError(res: Response, error: unknown, fallback: string): Response {
  if (error instanceof HttpError) return res.status(error.httpStatus).json({ error: error.message });
  console.error(`${fallback}:`, errorMessage(error));
  return res.status(500).json({ error: fallback });
}

function reject(decision: TransitionDecision): void {
  if (!decision.allowed) throw new HttpError(decision.httpStatus, decision.error);
}

function displayNameOf(profile: UserProfile, token: DecodedIdToken, fallback: string): string {
  return String(
    profile.displayName || profile.fullName || profile.name || token.name || token.email || fallback
  ).slice(0, 100);
}

async function loadProfile(uid: string): Promise<UserProfile> {
  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  return snapshot.exists ? ((snapshot.data() ?? {}) as UserProfile) : {};
}

function fireUpdateNotification(args: Parameters<typeof sendSosUpdateNotification>[0]): void {
  // Informational only: a failure must never undo or delay the state change that triggered it.
  sendSosUpdateNotification(args).catch((error) =>
    console.error("SOS update notification failed:", errorMessage(error))
  );
}

// ---------------------------------------------------------------------------
// Student: raise an SOS
// ---------------------------------------------------------------------------

router.post(
  "/sos",
  requireRole("student"),
  route(async (req, res) => {
    try {
      const token = authToken(req);
      const uid = token.uid;
      const body = bodyOf(req);
      const source = String(body.source || "button").slice(0, 50);
      const createdAt = nowIso();

      // GPS is optional. A missing location is a valid SOS; a malformed one is a client bug.
      const parsed = parseLocation(body.location, createdAt);
      if (!parsed.ok) return res.status(400).json({ error: parsed.error });
      const location = parsed.location;

      const db = getAdminDb();
      const studentProfile = await loadProfile(uid);
      const studentName = displayNameOf(studentProfile, token, "UniAble student");
      const ref = db.collection("sosAlerts").doc();

      const alert: SosAlert = {
        studentId: uid,
        student: studentName,
        location,
        locationStatus: location ? "available" : "unavailable",
        locationIssue: location ? null : parseLocationIssue(body.locationIssue),
        locationUpdatedAt: location ? createdAt : null,
        source,
        status: "active",
        createdAt,
        updatedAt: createdAt,
        acknowledgedBy: null,
        acknowledgedAt: null,
        assignedResponder: null,
        resolvedAt: null,
        cancelledAt: null,
        notificationDelivery: { status: "pending", sent: 0, failed: 0 },
        timeline: [
          makeEvent(
            "created",
            createdAt,
            { id: uid, role: "student", name: studentName },
            { location, note: location ? undefined : "Sent without GPS location." }
          ),
        ],
      };

      // A student can have one open alert at a time. This makes a double tap or a repeated
      // voice command return the existing alert instead of paging responders twice.
      const existing = await db.runTransaction(async (tx) => {
        const open = await tx.get(
          db
            .collection("sosAlerts")
            .where("studentId", "==", uid)
            .where("status", "in", ["active", "acknowledged"])
            .limit(1)
        );
        const first = open.docs[0];
        if (first) return { id: first.id, data: first.data() as SosAlert };
        // Persist the SOS first. Notification failure must never discard the emergency record.
        tx.set(ref, alert);
        return null;
      });

      if (existing) {
        return res.status(200).json({
          message: "You already have an open SOS. Responders have been alerted.",
          alreadyOpen: true,
          alert: toStudentView(existing.id, existing.data),
          delivery: existing.data.notificationDelivery,
          notified: [],
        });
      }
      console.log("SOS alert stored:", ref.id);

      let delivery: NotificationDelivery;
      try {
        delivery = await sendEmergencyNotifications({ alertId: ref.id, alert, studentProfile });
      } catch (notificationError) {
        console.error("SOS notification dispatch failed:", errorMessage(notificationError));
        delivery = {
          status: "failed",
          targetUsers: 0,
          targetRoles: [],
          registeredDevices: 0,
          sent: 0,
          failed: 0,
          error: "Notification dispatch failed. Contact campus security directly.",
          attemptedAt: nowIso(),
        };
      }

      await ref.update({
        notificationDelivery: delivery,
        notificationSentAt: delivery.sent > 0 ? delivery.attemptedAt : null,
      });

      const gpsNote = location
        ? ""
        : " Your location could not be attached, so tell responders where you are if you can.";
      const message =
        delivery.sent > 0
          ? `SOS recorded. Push notification sent to ${delivery.sent} responder device(s).${gpsNote}`
          : `SOS recorded, but no responder device confirmed notification delivery. Contact campus security directly if you need immediate help.${gpsNote}`;

      return res.status(201).json({
        message,
        alreadyOpen: false,
        alert: toStudentView(ref.id, { ...alert, notificationDelivery: delivery }),
        delivery,
        notified: delivery.sent > 0 ? delivery.targetRoles : [],
      });
    } catch (error) {
      return sendHttpError(res, error, "Could not create the SOS alert.");
    }
  })
);

// ---------------------------------------------------------------------------
// Student: own history, cancel, location refresh
// ---------------------------------------------------------------------------

router.get(
  "/sos/mine",
  requireRole("student"),
  route(async (req, res) => {
    try {
      // Filtering on one field and sorting in memory avoids needing a composite index.
      const snapshot = await getAdminDb()
        .collection("sosAlerts")
        .where("studentId", "==", authToken(req).uid)
        .get();

      const alerts = snapshot.docs
        .map((doc) => toStudentView(doc.id, doc.data() as SosAlert))
        .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
        .slice(0, STUDENT_HISTORY_LIMIT);

      return res.json({
        alerts,
        openAlert: alerts.find((alert) => isOpenStatus(alert.status)) ?? null,
      });
    } catch (error) {
      return sendHttpError(res, error, "Could not load your emergency history.");
    }
  })
);

router.patch(
  "/sos/:id/cancel",
  requireRole("student"),
  route(async (req, res) => {
    try {
      const token = authToken(req);
      const note = cleanNote(bodyOf(req).reason);
      const profile = await loadProfile(token.uid);
      const name = displayNameOf(profile, token, "UniAble student");
      const db = getAdminDb();
      const ref = db.collection("sosAlerts").doc(req.params.id as string);

      const updated = await db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) throw new HttpError(404, "SOS alert not found.");
        const alert = snapshot.data() as SosAlert;
        if (alert.studentId !== token.uid) throw new HttpError(403, "This is not your SOS alert.");
        reject(decideCancel(alert));

        const at = nowIso();
        const changes: Partial<SosAlert> = {
          status: "cancelled",
          cancelledAt: at,
          updatedAt: at,
          ...(note ? { cancelReason: note } : {}),
          timeline: appendTimeline(
            alert.timeline,
            makeEvent("cancelled", at, { id: token.uid, role: "student", name }, { note })
          ),
        };
        tx.update(ref, changes);
        return { ...alert, ...changes };
      });

      fireUpdateNotification({
        alertId: ref.id,
        studentId: token.uid,
        kind: "cancelled",
        actorUid: token.uid,
      });
      return res.json({
        message: "SOS cancelled. The alert is kept on record.",
        alert: toStudentView(ref.id, updated),
      });
    } catch (error) {
      return sendHttpError(res, error, "Could not cancel the SOS alert.");
    }
  })
);

router.post(
  "/sos/:id/location",
  requireRole("student"),
  route(async (req, res) => {
    try {
      const token = authToken(req);
      const at = nowIso();
      const parsed = parseLocation(bodyOf(req).location, at);
      if (!parsed.ok) return res.status(400).json({ error: parsed.error });
      const location = parsed.location;
      if (!location) return res.status(400).json({ error: "A location is required." });

      const profile = await loadProfile(token.uid);
      const name = displayNameOf(profile, token, "UniAble student");
      const db = getAdminDb();
      const ref = db.collection("sosAlerts").doc(req.params.id as string);

      const updated = await db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) throw new HttpError(404, "SOS alert not found.");
        const alert = snapshot.data() as SosAlert;
        if (alert.studentId !== token.uid) throw new HttpError(403, "This is not your SOS alert.");
        if (!isOpenStatus(alert.status)) {
          throw new HttpError(409, "This SOS is closed, so its location can no longer be updated.");
        }
        const last = alert.locationUpdatedAt ? Date.parse(alert.locationUpdatedAt) : 0;
        if (last && Date.parse(at) - last < MIN_LOCATION_UPDATE_INTERVAL_MS) {
          throw new HttpError(429, "Location was updated a moment ago. Please wait a few seconds.");
        }

        const changes: Partial<SosAlert> = {
          location,
          locationStatus: "available",
          locationIssue: null,
          locationUpdatedAt: at,
          updatedAt: at,
          timeline: appendTimeline(
            alert.timeline,
            makeEvent("location_updated", at, { id: token.uid, role: "student", name }, { location })
          ),
        };
        tx.update(ref, changes);
        return { ...alert, ...changes };
      });

      return res.json({
        message: "Your location was updated for responders.",
        alert: toStudentView(ref.id, updated),
      });
    } catch (error) {
      return sendHttpError(res, error, "Could not update the SOS location.");
    }
  })
);

// ---------------------------------------------------------------------------
// Responders: list, read, acknowledge, resolve
// ---------------------------------------------------------------------------

router.get(
  "/sos",
  requireRole(...RESPONDER_ROLES),
  route(async (req, res) => {
    try {
      const view = String(req.query.view || "open");
      const db = getAdminDb();

      if (view === "history") {
        // Full history (including cancelled and false alarms) is for security and administrators.
        if (req.userRole !== "security" && req.userRole !== "admin") {
          return res.status(403).json({ error: "Only campus security can view emergency history." });
        }
        const snapshot = await db
          .collection("sosAlerts")
          .orderBy("createdAt", "desc")
          .limit(HISTORY_LIMIT)
          .get();
        const alerts = snapshot.docs
          .map((doc) => toResponderView(doc.id, doc.data() as SosAlert))
          .filter((alert) => !isOpenStatus(alert.status));
        return res.json({ alerts });
      }

      const snapshot = await db
        .collection("sosAlerts")
        .where("status", "in", ["active", "acknowledged"])
        .limit(100)
        .get();
      const alerts = sortForResponders(
        snapshot.docs.map((doc) => toResponderView(doc.id, doc.data() as SosAlert))
      );
      return res.json({ alerts });
    } catch (error) {
      return sendHttpError(res, error, "Could not load SOS alerts.");
    }
  })
);

router.get(
  "/sos/:id",
  requireRole("student", ...RESPONDER_ROLES),
  route(async (req, res) => {
    try {
      const snapshot = await getAdminDb()
        .collection("sosAlerts")
        .doc(req.params.id as string)
        .get();
      if (!snapshot.exists) return res.status(404).json({ error: "SOS alert not found." });
      const alert = snapshot.data() as SosAlert;

      if (req.userRole === "student") {
        if (alert.studentId !== authToken(req).uid) {
          return res.status(403).json({ error: "This is not your SOS alert." });
        }
        return res.json({ alert: toStudentView(snapshot.id, alert) });
      }
      return res.json({ alert: toResponderView(snapshot.id, alert) });
    } catch (error) {
      return sendHttpError(res, error, "Could not load the SOS alert.");
    }
  })
);

type PatchResult =
  | { changed: false; alert: SosAlert }
  | { changed: true; alert: SosAlert; kind: SosUpdateKind };

router.patch(
  "/sos/:id",
  requireRole(...RESPONDER_ROLES),
  route(async (req, res) => {
    try {
      const token = authToken(req);
      const body = bodyOf(req);
      const status = String(body.status || "");
      if (status !== "acknowledged" && status !== "resolved") {
        return res.status(400).json({ error: "Invalid SOS status." });
      }
      const role = req.userRole;
      if (!role) return res.status(403).json({ error: "Your role could not be verified." });

      const profile = await loadProfile(token.uid);
      const name = displayNameOf(profile, token, "UniAble responder");
      const actor = { id: token.uid, role, name };
      const db = getAdminDb();
      const ref = db.collection("sosAlerts").doc(req.params.id as string);

      const result = await db.runTransaction(async (tx): Promise<PatchResult> => {
        const snapshot = await tx.get(ref);
        if (!snapshot.exists) throw new HttpError(404, "SOS alert not found.");
        const alert = snapshot.data() as SosAlert;
        const at = nowIso();

        if (status === "acknowledged") {
          const decision = decideAcknowledge(normaliseAlert(snapshot.id, alert), {
            uid: token.uid,
            role,
          });
          reject(decision);
          // Re-acknowledging your own alert is a harmless repeat (for example a double tap).
          if (decision.allowed && decision.idempotent) return { changed: false, alert };

          const responder: SosResponder = { uid: token.uid, name, role };
          const changes: Partial<SosAlert> = {
            status: "acknowledged",
            acknowledgedBy: token.uid,
            acknowledgedRole: role,
            acknowledgedAt: at,
            assignedResponder: responder,
            updatedAt: at,
            timeline: appendTimeline(alert.timeline, makeEvent("acknowledged", at, actor)),
          };
          tx.update(ref, changes);
          return { changed: true, alert: { ...alert, ...changes }, kind: "acknowledged" };
        }

        const resolution = parseResolution(body.resolution);
        const note = cleanNote(body.note);
        reject(decideResolve(normaliseAlert(snapshot.id, alert), { uid: token.uid, role }));

        const falseAlarm = resolution === "false_alarm";
        const changes: Partial<SosAlert> = {
          status: "resolved",
          resolvedAt: at,
          resolvedBy: token.uid,
          resolvedByName: name,
          resolution,
          updatedAt: at,
          ...(note ? { resolutionNote: note } : {}),
          timeline: appendTimeline(
            alert.timeline,
            makeEvent(falseAlarm ? "false_alarm" : "resolved", at, actor, { note })
          ),
        };
        tx.update(ref, changes);
        return {
          changed: true,
          alert: { ...alert, ...changes },
          kind: falseAlarm ? "false_alarm" : "resolved",
        };
      });

      if (result.changed) {
        fireUpdateNotification({
          alertId: ref.id,
          studentId: result.alert.studentId,
          kind: result.kind,
          actorUid: token.uid,
          actorName: name,
        });
      }
      return res.json({ alert: toResponderView(ref.id, result.alert) });
    } catch (error) {
      return sendHttpError(res, error, "Could not update the SOS alert.");
    }
  })
);

export default router;
