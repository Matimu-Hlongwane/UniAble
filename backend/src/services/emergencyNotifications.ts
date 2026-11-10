import crypto from "node:crypto";
import type { DocumentReference } from "firebase-admin/firestore";
import type { MulticastMessage } from "firebase-admin/messaging";
import { getAdminDb, getAdminMessaging } from "./firebase.js";
import type { NotificationDelivery, SosAlert, UserProfile } from "../types.js";
import { errorMessage } from "../utils.js";

const MAX_MULTICAST_TOKENS = 500;

type ResponderRole = "security" | "volunteer";

interface ResponderTarget {
  uid: string;
  role: ResponderRole;
}

interface TokenRecord extends ResponderTarget {
  ref: DocumentReference;
  token: string;
}

function tokenDocumentId(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

const isDisabled = (profile: UserProfile): boolean =>
  profile.isActive === false || profile.accessStatus === "disabled";

async function getResponderTargets(): Promise<ResponderTarget[]> {
  const db = getAdminDb();
  const [securityUsers, volunteerUsers] = await Promise.all([
    db.collection("users").where("role", "==", "security").get(),
    db.collection("users").where("role", "==", "volunteer").get(),
  ]);

  const targets: ResponderTarget[] = [];
  for (const userDoc of securityUsers.docs) {
    if (isDisabled(userDoc.data() as UserProfile)) continue;
    targets.push({ uid: userDoc.id, role: "security" });
  }

  for (const userDoc of volunteerUsers.docs) {
    if (isDisabled(userDoc.data() as UserProfile)) continue;

    // Volunteer availability is maintained in the existing volunteers/{uid} record.
    const volunteerDoc = await db.collection("volunteers").doc(userDoc.id).get();
    if (!volunteerDoc.exists || volunteerDoc.data()?.available !== true) continue;
    targets.push({ uid: userDoc.id, role: "volunteer" });
  }

  return targets;
}

async function readResponderTokens(targets: ResponderTarget[]): Promise<TokenRecord[]> {
  const db = getAdminDb();
  const tokenRecords = await Promise.all(
    targets.map(async (target): Promise<TokenRecord[]> => {
      const snapshot = await db
        .collection("users")
        .doc(target.uid)
        .collection("pushDevices")
        .get();

      const records: TokenRecord[] = [];
      for (const doc of snapshot.docs) {
        const token: unknown = doc.data()?.token;
        if (typeof token === "string" && token.length > 20) {
          records.push({ uid: target.uid, role: target.role, ref: doc.ref, token });
        }
      }
      return records;
    })
  );
  return tokenRecords.flat();
}

export interface SendEmergencyArgs {
  alertId: string;
  alert: Pick<SosAlert, "location" | "studentId" | "status">;
  studentProfile?: UserProfile;
}

interface Dispatch {
  title: string;
  body: string;
  data: Record<string, string>;
  /** Re-using one tag makes a later update replace the earlier notification on the device. */
  tag: string;
  urgent: boolean;
}

const routeFor = (role: ResponderRole, alertId: string): string =>
  `${role === "volunteer" ? "/role/volunteer" : "/role/security"}?tab=emergency&alertId=${encodeURIComponent(alertId)}`;

/** Sends one notification to every registered responder device, per role deep link. */
async function dispatchToResponders(
  targets: ResponderTarget[],
  content: Dispatch,
  alertId: string
): Promise<NotificationDelivery> {
  const tokenRecords = await readResponderTokens(targets);

  const uniqueTokens = new Map<string, TokenRecord>();
  for (const record of tokenRecords) {
    if (!uniqueTokens.has(record.token)) uniqueTokens.set(record.token, record);
  }

  const recordsByRole = new Map<ResponderRole, TokenRecord[]>();
  for (const record of uniqueTokens.values()) {
    const list = recordsByRole.get(record.role) ?? [];
    list.push(record);
    recordsByRole.set(record.role, list);
  }

  const tokens = [...uniqueTokens.keys()];
  const baseResult: NotificationDelivery = {
    status: "no_registered_devices",
    targetUsers: targets.length,
    targetRoles: [...new Set(targets.map((item) => item.role))],
    registeredDevices: tokens.length,
    sent: 0,
    failed: 0,
    attemptedAt: new Date().toISOString(),
  };

  if (!tokens.length) return baseResult;

  let sent = 0;
  let failed = 0;
  const invalidTokenRefs: DocumentReference[] = [];
  const dispatchErrors: string[] = [];

  for (const [role, records] of recordsByRole.entries()) {
    const deepLink = routeFor(role, alertId);
    const roleTokens = records.map((record) => record.token);

    for (let offset = 0; offset < roleTokens.length; offset += MAX_MULTICAST_TOKENS) {
      const chunk = roleTokens.slice(offset, offset + MAX_MULTICAST_TOKENS);

      const message: MulticastMessage = {
        tokens: chunk,
        notification: { title: content.title, body: content.body },
        data: { ...content.data, alertId: String(alertId), route: deepLink },
        android: {
          priority: "high",
          notification: {
            channelId: "uniable-emergency",
            priority: content.urgent ? "max" : "high",
            sound: "default",
            tag: content.tag,
          },
        },
        apns: {
          headers: { "apns-priority": content.urgent ? "10" : "5" },
          payload: { aps: { sound: "default", category: "EMERGENCY" } },
        },
        webpush: {
          headers: { Urgency: "high" },
          notification: {
            title: content.title,
            body: content.body,
            icon: "/icons/icon-192.png",
            tag: content.tag,
            requireInteraction: content.urgent,
            data: { url: deepLink },
          },
        },
      };

      let response;
      try {
        response = await getAdminMessaging().sendEachForMulticast(message);
      } catch (error) {
        failed += chunk.length;
        dispatchErrors.push((errorMessage(error) || "FCM dispatch failed").slice(0, 240));
        continue;
      }

      sent += response.successCount;
      failed += response.failureCount;
      response.responses.forEach((item, index) => {
        const code = item.error?.code ?? "";
        if (
          code.includes("registration-token-not-registered") ||
          code.includes("invalid-registration-token")
        ) {
          const record = records.find((candidate) => candidate.token === chunk[index]);
          if (record) invalidTokenRefs.push(record.ref);
        }
      });
    }
  }

  if (invalidTokenRefs.length) {
    await Promise.all(invalidTokenRefs.map((ref) => ref.delete().catch(() => null)));
  }

  return {
    ...baseResult,
    status: sent > 0 && failed === 0 ? "sent" : sent > 0 ? "partial" : "failed",
    sent,
    failed,
    invalidTokensRemoved: invalidTokenRefs.length,
    ...(dispatchErrors.length ? { errors: dispatchErrors.slice(0, 3) } : {}),
  };
}

/** Notifies security officers and available volunteers that a new SOS was raised. */
export async function sendEmergencyNotifications({
  alertId,
  alert,
  studentProfile = {},
}: SendEmergencyArgs): Promise<NotificationDelivery> {
  const targets = await getResponderTargets();

  const studentName = String(
    studentProfile.displayName || studentProfile.name || studentProfile.studentName || "A UniAble student"
  ).slice(0, 100);
  const location = alert.location;
  const locationText = location
    ? `Location: ${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}${
        location.accuracyMeters !== undefined ? ` (±${location.accuracyMeters} m)` : ""
      }`
    : "Location unavailable. Contact the student.";

  return dispatchToResponders(
    targets,
    {
      title: "UniAble emergency SOS",
      body: `${studentName} needs assistance. ${locationText}`,
      tag: `uniable-sos-${alertId}`,
      urgent: true,
      data: {
        type: "emergency_sos",
        studentId: String(alert.studentId),
        latitude: location ? String(location.lat) : "",
        longitude: location ? String(location.lng) : "",
        accuracyMeters: location?.accuracyMeters !== undefined ? String(location.accuracyMeters) : "",
        locationAvailable: location ? "true" : "false",
        status: String(alert.status || "active"),
      },
    },
    alertId
  );
}

export type SosUpdateKind = "acknowledged" | "resolved" | "cancelled" | "false_alarm";

export interface SendUpdateArgs {
  alertId: string;
  studentId: string;
  kind: SosUpdateKind;
  /** The person who caused the update; they do not need to be notified about their own action. */
  actorUid?: string;
  actorName?: string;
}

const UPDATE_TEXT: Record<SosUpdateKind, (actor: string) => string> = {
  acknowledged: (actor) => `${actor} is responding to this SOS.`,
  resolved: (actor) => `This SOS was resolved by ${actor}.`,
  false_alarm: (actor) => `This SOS was closed as a false alarm by ${actor}.`,
  cancelled: () => "The student cancelled this SOS. No response is needed unless they contact you.",
};

/**
 * Tells the other responders that an alert changed, so nobody keeps racing to an alert that
 * is already handled or cancelled. Reuses the original tag so it replaces the first notification.
 */
export async function sendSosUpdateNotification({
  alertId,
  studentId,
  kind,
  actorUid,
  actorName = "A responder",
}: SendUpdateArgs): Promise<NotificationDelivery> {
  const targets = (await getResponderTargets()).filter((target) => target.uid !== actorUid);

  return dispatchToResponders(
    targets,
    {
      title: "UniAble SOS update",
      body: UPDATE_TEXT[kind](actorName),
      tag: `uniable-sos-${alertId}`,
      urgent: false,
      data: { type: "emergency_sos_update", update: kind, studentId, status: kind },
    },
    alertId
  );
}

export function hashPushToken(token: string): string {
  return tokenDocumentId(token);
}
