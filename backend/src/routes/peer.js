import { Router } from "express";
import crypto from "node:crypto";
import { getAdminDb } from "../services/firebase.js";
import { requireFirebaseUser, requireRole } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireFirebaseUser);

const db = () => getAdminDb();
const allowedPriorities = ["Normal", "Urgent"];
const allowedStatuses = ["open", "accepted", "declined", "completed"];

async function getProfile(uid) {
  const snapshot = await db().collection("users").doc(uid).get();
  return snapshot.exists ? snapshot.data() : {};
}

function safeRequest(id, data) {
  return { id, ...data };
}

router.get("/requests", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = String((await getProfile(uid)).role || "student").toLowerCase();

    let query = db().collection("peerRequests");

    if (role === "student") {
      query = query.where("studentId", "==", uid);
    } else if (role === "volunteer") {
      query = query.where("status", "in", ["open", "accepted"]);
    } else if (role === "lecturer") {
      query = query.where("type", "==", "Lecture assistance");
    } else if (!["admin", "disability_office"].includes(role)) {
      return res.status(403).json({ error: "You cannot view assistance requests." });
    }

    const snapshot = await query.orderBy("createdAt", "desc").limit(100).get();
    const requests = snapshot.docs.map(doc => safeRequest(doc.id, doc.data()));
    return res.json({ requests });
  } catch (error) {
    console.error("Load peer requests failed:", error.message);
    return res.status(500).json({ error: "Could not load assistance requests." });
  }
});

router.post("/requests", requireRole("student"), async (req, res) => {
  try {
    const { type, detail, location, priority } = req.body || {};
    const cleanType = String(type || "General assistance").trim().slice(0, 100);
    const cleanDetail = String(detail || "").trim().slice(0, 2000);
    const cleanLocation = String(location || "Campus").trim().slice(0, 200);
    const cleanPriority = allowedPriorities.includes(priority) ? priority : "Normal";

    if (!cleanType || !cleanDetail) {
      return res.status(400).json({ error: "Request type and details are required." });
    }

    const uid = req.firebaseToken.uid;
    const profile = await getProfile(uid);
    const ref = db().collection("peerRequests").doc();

    const item = {
      studentId: uid,
      student: String(profile.displayName || req.firebaseToken.name || "Student").slice(0, 120),
      type: cleanType,
      detail: cleanDetail,
      location: cleanLocation,
      priority: cleanPriority,
      status: "open",
      assignedVolunteerId: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await ref.set(item);
    return res.status(201).json({ request: safeRequest(ref.id, item) });
  } catch (error) {
    console.error("Create peer request failed:", error.message);
    return res.status(500).json({ error: "Could not create the assistance request." });
  }
});

router.patch("/requests/:id", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const profile = await getProfile(uid);
    const role = String(profile.role || "student").toLowerCase();
    const ref = db().collection("peerRequests").doc(req.params.id);
    const snapshot = await ref.get();

    if (!snapshot.exists) return res.status(404).json({ error: "Request not found." });

    const item = snapshot.data();
    const status = String(req.body?.status || "");

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid request status." });
    }

    const isAdmin = role === "admin";
    const isAssignedVolunteer = role === "volunteer" && item.assignedVolunteerId === uid;
    const isLecturerRequest = role === "lecturer" && item.type === "Lecture assistance";
    const isDisabilityOffice = role === "disability_office";

    if (!isAdmin && !isAssignedVolunteer && !isLecturerRequest && !isDisabilityOffice) {
      return res.status(403).json({ error: "You cannot update this request." });
    }

    const updates = { status, updatedAt: new Date().toISOString() };

    if (role === "volunteer" && status === "accepted") {
      updates.assignedVolunteerId = uid;
    }

    if (role === "volunteer" && status === "completed" && item.assignedVolunteerId !== uid) {
      return res.status(403).json({ error: "You can only complete requests assigned to you." });
    }

    await ref.update(updates);
    return res.json({ request: safeRequest(ref.id, { ...item, ...updates }) });
  } catch (error) {
    console.error("Update peer request failed:", error.message);
    return res.status(500).json({ error: "Could not update the assistance request." });
  }
});

router.get("/volunteers", async (_req, res) => {
  try {
    const snapshot = await db().collection("volunteers").where("active", "==", true).limit(100).get();
    const volunteers = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return res.json({ volunteers });
  } catch (error) {
    console.error("Load volunteers failed:", error.message);
    return res.status(500).json({ error: "Could not load volunteers." });
  }
});

router.post("/volunteers/register", requireRole("student"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const profile = await getProfile(uid);
    const name = String(profile.displayName || req.firebaseToken.name || "").trim();

    if (!name) return res.status(400).json({ error: "Complete your profile before registering." });

    const ref = db().collection("volunteers").doc(uid);
    const existing = await ref.get();
    const volunteer = {
      name: name.slice(0, 120),
      available: true,
      active: true,
      userId: uid,
      updatedAt: new Date().toISOString()
    };

    if (!existing.exists) volunteer.createdAt = new Date().toISOString();
    await ref.set(volunteer, { merge: true });

    return res.status(existing.exists ? 200 : 201).json({
      volunteer: { id: uid, ...volunteer },
      alreadyRegistered: existing.exists
    });
  } catch (error) {
    console.error("Volunteer registration failed:", error.message);
    return res.status(500).json({ error: "Could not register as a volunteer." });
  }
});

router.patch("/volunteers/:id/availability", requireRole("volunteer"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    if (req.params.id !== uid) {
      return res.status(403).json({ error: "You can only change your own availability." });
    }

    if (typeof req.body?.available !== "boolean") {
      return res.status(400).json({ error: "Availability must be true or false." });
    }

    const ref = db().collection("volunteers").doc(uid);
    const snapshot = await ref.get();
    if (!snapshot.exists) return res.status(404).json({ error: "Volunteer profile not found." });

    await ref.update({ available: req.body.available, updatedAt: new Date().toISOString() });
    return res.json({ volunteer: { id: uid, ...snapshot.data(), available: req.body.available } });
  } catch (error) {
    console.error("Volunteer availability update failed:", error.message);
    return res.status(500).json({ error: "Could not update availability." });
  }
});

export default router;
