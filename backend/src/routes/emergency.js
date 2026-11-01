import { Router } from "express";
import crypto from "node:crypto";
import { getAdminDb } from "../services/firebase.js";
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

    const ref = getAdminDb().collection("sosAlerts").doc();
    const alert = {
      studentId: uid,
      location: location ? { lat: Number(location.lat), lng: Number(location.lng) } : null,
      source,
      status: "active",
      createdAt: new Date().toISOString(),
      acknowledgedBy: null,
      resolvedAt: null
    };

    await ref.set(alert);
    console.log("SOS alert stored:", ref.id);

    return res.status(201).json({
      message: "SOS alert recorded. Notification delivery must be configured separately.",
      alert: { id: ref.id, ...alert },
      notified: []
    });
  } catch (error) {
    console.error("Create SOS failed:", error.message);
    return res.status(500).json({ error: "Could not create the SOS alert." });
  }
});

router.get("/sos", requireRole("security", "admin"), async (_req, res) => {
  try {
    const snapshot = await getAdminDb()
      .collection("sosAlerts")
      .where("status", "==", "active")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    return res.json({
      alerts: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    });
  } catch (error) {
    console.error("Load SOS alerts failed:", error.message);
    return res.status(500).json({ error: "Could not load SOS alerts." });
  }
});

router.patch("/sos/:id", requireRole("security", "admin"), async (req, res) => {
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

    if (status === "acknowledged") updates.acknowledgedBy = req.firebaseToken.uid;
    if (status === "resolved") updates.resolvedAt = new Date().toISOString();

    await ref.update(updates);
    return res.json({ alert: { id: ref.id, ...snapshot.data(), ...updates } });
  } catch (error) {
    console.error("Update SOS failed:", error.message);
    return res.status(500).json({ error: "Could not update the SOS alert." });
  }
});

export default router;
