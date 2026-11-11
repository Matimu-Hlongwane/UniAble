import { Router } from "express";
import { getAdminDb } from "../services/firebase.js";
import { sendEmergencyNotifications } from "../services/emergencyNotifications.js";
import { requireFirebaseUser, requireRole } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireFirebaseUser);

router.post("/sos", requireRole("student"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const location = req.body?.location || null;
    const source = String(req.body?.source || "button").slice(0, 50);

    if (location && (
      !Number.isFinite(Number(location.lat)) ||
      !Number.isFinite(Number(location.lng)) ||
      Math.abs(Number(location.lat)) > 90 ||
      Math.abs(Number(location.lng)) > 180
    )) {
      return res.status(400).json({ error: "The supplied location is invalid." });
    }

    const db = getAdminDb();
    const studentSnapshot = await db.collection("users").doc(uid).get();
    const studentProfile = studentSnapshot.exists ? studentSnapshot.data() || {} : {};
    const ref = db.collection("sosAlerts").doc();
    const alert = {
      studentId: uid,
      student: studentProfile.displayName || studentProfile.name || req.firebaseToken.name || "UniAble student",
      location: location ? { lat: Number(location.lat), lng: Number(location.lng) } : null,
      source,
      status: "active",
      createdAt: new Date().toISOString(),
      acknowledgedBy: null,
      resolvedAt: null,
      notificationDelivery: { status: "pending", sent: 0, failed: 0 },
    };

    // Persist the SOS first. Notification failure must never discard the emergency record.
    await ref.set(alert);
    console.log("SOS alert stored:", ref.id);

    let delivery;
    try {
      delivery = await sendEmergencyNotifications({
        alertId: ref.id,
        alert,
        studentProfile,
      });
    } catch (notificationError) {
      console.error("SOS notification dispatch failed:", notificationError.message);
      delivery = {
        status: "failed",
        targetUsers: 0,
        targetRoles: [],
        registeredDevices: 0,
        sent: 0,
        failed: 0,
        error: "Notification dispatch failed. Contact campus security directly.",
        attemptedAt: new Date().toISOString(),
      };
    }

    await ref.update({
      notificationDelivery: delivery,
      notificationSentAt: delivery.sent > 0 ? delivery.attemptedAt : null,
    });

    const message = delivery.sent > 0
      ? `SOS recorded. Push notification sent to ${delivery.sent} responder device(s).`
      : "SOS recorded, but no responder device confirmed notification delivery. Contact campus security directly if you need immediate help.";

    return res.status(201).json({
      message,
      alert: { id: ref.id, ...alert, notificationDelivery: delivery },
      delivery,
      notified: delivery.sent > 0 ? delivery.targetRoles : [],
    });
  } catch (error) {
    console.error("Create SOS failed:", error.message);
    return res.status(500).json({ error: "Could not create the SOS alert." });
  }
});

router.get("/sos", requireRole("security", "volunteer", "admin"), async (_req, res) => {
  try {
    const snapshot = await getAdminDb()
      .collection("sosAlerts")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    return res.json({
      alerts: snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(alert => alert.status !== "resolved")
    });
  } catch (error) {
    console.error("Load SOS alerts failed:", error.message);
    return res.status(500).json({ error: "Could not load SOS alerts." });
  }
});

router.patch("/sos/:id", requireRole("security", "volunteer", "admin"), async (req, res) => {
  try {
    const status = String(req.body?.status || "");
    if (!["active", "acknowledged", "resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid SOS status." });
    }

    const ref = getAdminDb().collection("sosAlerts").doc(req.params.id);
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: "SOS alert not found." });

    const updates = {
      status,
      updatedAt: new Date().toISOString()
    };

    if (status === "acknowledged") {
      updates.acknowledgedBy = req.firebaseToken.uid;
      updates.acknowledgedRole = req.userRole;
    }
    if (status === "resolved") {
      updates.resolvedAt = new Date().toISOString();
      updates.resolvedBy = req.firebaseToken.uid;
    }

    await ref.update(updates);
    return res.json({ alert: { id: ref.id, ...snapshot.data(), ...updates } });
  } catch (error) {
    console.error("Update SOS failed:", error.message);
    return res.status(500).json({ error: "Could not update the SOS alert." });
  }
});

export default router;
