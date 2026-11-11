import { Router } from "express";
import { getAdminDb } from "../services/firebase.js";
import { requireFirebaseUser, requireRole } from "../middleware/authMiddleware.js";
import { hashPushToken } from "../services/emergencyNotifications.js";

const router = Router();
router.use(requireFirebaseUser);

router.post("/devices", requireRole("security", "volunteer"), async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    const platform = String(req.body?.platform || "web").toLowerCase();
    if (token.length < 20 || token.length > 4096) {
      return res.status(400).json({ error: "A valid push notification token is required." });
    }
    if (!["web", "android", "ios"].includes(platform)) {
      return res.status(400).json({ error: "Unsupported notification platform." });
    }

    const db = getAdminDb();
    const uid = req.firebaseToken.uid;
    const profileRef = db.collection("users").doc(uid);
    const profileSnapshot = await profileRef.get();
    if (!profileSnapshot.exists) return res.status(403).json({ error: "Responder profile not found." });
    const profile = profileSnapshot.data() || {};
    if (!["security", "volunteer"].includes(String(profile.role || "").toLowerCase())) {
      return res.status(403).json({ error: "Only security staff and volunteers can register responder notifications." });
    }

    // Move a token if this device was previously registered under another signed-in account.
    const existing = await db.collectionGroup("pushDevices").where("token", "==", token).get();
    const batch = db.batch();
    existing.docs.forEach((doc) => batch.delete(doc.ref));
    const deviceRef = profileRef.collection("pushDevices").doc(hashPushToken(token));
    batch.set(deviceRef, {
      token,
      platform,
      role: profile.role,
      registeredAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await batch.commit();

    return res.status(201).json({ registered: true, platform });
  } catch (error) {
    console.error("Register push device failed:", error.message);
    return res.status(500).json({ error: "Could not register this device for emergency notifications." });
  }
});

export default router;
