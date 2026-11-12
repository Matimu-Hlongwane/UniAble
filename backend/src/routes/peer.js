import { Router } from "express";
import { getAdminAuth, getAdminDb } from "../services/firebase.js";
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
    let requests = snapshot.docs.map(doc => safeRequest(doc.id, doc.data()));

    // Volunteers may see open requests and only their own accepted requests.
    if (role === "volunteer") {
      requests = requests.filter(item =>
        item.status === "open" || item.assignedVolunteerId === uid
      );
    }

    return res.json({ requests });
  } catch (error) {
    console.error("Load peer requests failed:", error);
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
    const timestamp = new Date().toISOString();

    const item = {
      studentId: uid,
      student: String(profile.displayName || req.firebaseToken.name || "Student").slice(0, 120),
      type: cleanType,
      detail: cleanDetail,
      location: cleanLocation,
      priority: cleanPriority,
      status: "open",
      assignedVolunteerId: null,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await ref.set(item);
    return res.status(201).json({ request: safeRequest(ref.id, item) });
  } catch (error) {
    console.error("Create peer request failed:", error);
    return res.status(500).json({ error: "Could not create the assistance request." });
  }
});

router.patch("/requests/:id", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const profile = await getProfile(uid);
    const role = String(profile.role || "student").toLowerCase();
    const status = String(req.body?.status || "");

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid request status." });
    }

    const requestRef = db().collection("peerRequests").doc(req.params.id);
    const volunteerRef = db().collection("volunteers").doc(uid);
    const timestamp = new Date().toISOString();
    let updatedRequest;

    await db().runTransaction(async transaction => {
      const requestSnapshot = await transaction.get(requestRef);
      if (!requestSnapshot.exists) {
        const error = new Error("Request not found.");
        error.status = 404;
        throw error;
      }

      const item = requestSnapshot.data();
      const isAdmin = role === "admin";
      const isDisabilityOffice = role === "disability_office";
      const isLecturerRequest =
        role === "lecturer" && item.type === "Lecture assistance";

      if (role === "volunteer") {
        const volunteerSnapshot = await transaction.get(volunteerRef);
        const volunteer = volunteerSnapshot.exists ? volunteerSnapshot.data() : {};

        if (
          !volunteerSnapshot.exists ||
          volunteer.active !== true ||
          volunteer.status !== "approved" ||
          profile.isActive === false ||
          profile.accessStatus === "disabled"
        ) {
          const error = new Error("Your volunteer account is not approved and active.");
          error.status = 403;
          throw error;
        }

        if (status === "accepted") {
          if (volunteer.available !== true) {
            const error = new Error("Set your volunteer availability to available before accepting a request.");
            error.status = 403;
            throw error;
          }

          if (item.status !== "open" || item.assignedVolunteerId) {
            const error = new Error("This request has already been claimed.");
            error.status = 409;
            throw error;
          }

          transaction.update(requestRef, {
            status: "accepted",
            assignedVolunteerId: uid,
            updatedAt: timestamp
          });

          updatedRequest = {
            ...item,
            status: "accepted",
            assignedVolunteerId: uid,
            updatedAt: timestamp
          };
          return;
        }

        if (
          status !== "completed" ||
          item.status !== "accepted" ||
          item.assignedVolunteerId !== uid
        ) {
          const error = new Error("You can only complete a request assigned to you.");
          error.status = 403;
          throw error;
        }

        transaction.update(requestRef, { status, updatedAt: timestamp });
        updatedRequest = { ...item, status, updatedAt: timestamp };
        return;
      }

      if (!isAdmin && !isDisabilityOffice && !isLecturerRequest) {
        const error = new Error("You cannot update this request.");
        error.status = 403;
        throw error;
      }

      transaction.update(requestRef, { status, updatedAt: timestamp });
      updatedRequest = { ...item, status, updatedAt: timestamp };
    });

    return res.json({
      request: safeRequest(req.params.id, updatedRequest)
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Update peer request failed:", error);
    return res.status(500).json({ error: "Could not update the assistance request." });
  }
});

// Public-to-authenticated users: only approved, active volunteers are listed.
router.get("/volunteers", async (_req, res) => {
  try {
    const snapshot = await db()
      .collection("volunteers")
      .where("active", "==", true)
      .limit(100)
      .get();

    const volunteers = snapshot.docs
      .filter(doc => doc.data().status === "approved")
      .map(doc => ({ id: doc.id, ...doc.data() }));

    return res.json({ volunteers });
  } catch (error) {
    console.error("Load volunteers failed:", error);
    return res.status(500).json({ error: "Could not load volunteers." });
  }
});

// Student volunteer application. The account remains a student until approval.
router.post("/volunteers/register", requireRole("student"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const profile = await getProfile(uid);
    const name = String(profile.displayName || req.firebaseToken.name || "").trim();

    if (!name) {
      return res.status(400).json({ error: "Complete your profile before registering." });
    }

    const settingsSnapshot = await db().collection("systemSettings").doc("global").get();
    const settings = settingsSnapshot.exists ? settingsSnapshot.data() : {};

    if (settings.allowVolunteerRegistration === false) {
      return res.status(403).json({ error: "Volunteer registration is currently closed." });
    }

    const ref = db().collection("volunteers").doc(uid);
    const existing = await ref.get();

    if (existing.exists) {
      const data = existing.data() || {};

      if (data.active === true && data.status === "approved") {
        return res.status(409).json({ error: "Your volunteer profile is already active." });
      }

      if (data.status === "pending") {
        return res.status(200).json({
          application: { id: uid, ...data },
          alreadyRegistered: true
        });
      }
    }

    const timestamp = new Date().toISOString();
    const volunteer = {
      name: name.slice(0, 120),
      available: false,
      active: false,
      status: "pending",
      userId: uid,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await ref.set(volunteer, { merge: true });

    return res.status(existing.exists ? 200 : 201).json({
      application: { id: uid, ...volunteer },
      alreadyRegistered: false
    });
  } catch (error) {
    console.error("Volunteer registration failed:", error);
    return res.status(500).json({ error: "Could not register as a volunteer." });
  }
});

// Admin-only list of pending volunteer applications.
router.get("/volunteers/applications", requireRole("admin"), async (_req, res) => {
  try {
    const snapshot = await db().collection("volunteers").limit(300).get();
    const applications = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => item.status === "pending")
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

    return res.json({ applications });
  } catch (error) {
    console.error("Load volunteer applications failed:", error);
    return res.status(500).json({ error: "Could not load volunteer applications." });
  }
});

// Admin approval/rejection. Approval grants the role and activates the record.
router.patch("/volunteers/:id/review", requireRole("admin"), async (req, res) => {
  try {
    const uid = String(req.params.id || "").trim();
    const decision = String(req.body?.decision || "").toLowerCase();

    if (!uid || !["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "Choose approve or reject for a valid application." });
    }

    const database = db();
    const volunteerRef = database.collection("volunteers").doc(uid);
    const userRef = database.collection("users").doc(uid);
    const volunteerSnapshot = await volunteerRef.get();

    if (!volunteerSnapshot.exists || volunteerSnapshot.data().status !== "pending") {
      return res.status(409).json({ error: "This application is no longer pending." });
    }

    const auth = getAdminAuth();
    const account = await auth.getUser(uid);
    const timestamp = new Date().toISOString();
    const existingClaims = account.customClaims || {};

    if (decision === "approved") {
      await userRef.set({
        role: "volunteer",
        roleAssignedAt: timestamp,
        roleAssignedBy: req.firebaseToken.uid,
        updatedAt: timestamp
      }, { merge: true });

      await auth.setCustomUserClaims(uid, {
        ...existingClaims,
        role: "volunteer"
      });

      await volunteerRef.set({
        active: true,
        available: false,
        status: "approved",
        approvedAt: timestamp,
        approvedBy: req.firebaseToken.uid,
        updatedAt: timestamp
      }, { merge: true });
    } else {
      await volunteerRef.set({
        active: false,
        available: false,
        status: "rejected",
        reviewedAt: timestamp,
        reviewedBy: req.firebaseToken.uid,
        updatedAt: timestamp
      }, { merge: true });
    }

    return res.json({
      success: true,
      message: decision === "approved"
        ? "Volunteer application approved. The volunteer can now sign in again to refresh their access."
        : "Volunteer application rejected.",
      application: { id: uid, status: decision }
    });
  } catch (error) {
    if (error.code === "auth/user-not-found") {
      return res.status(404).json({ error: "The applicant's account was not found." });
    }
    console.error("Volunteer application review failed:", error);
    return res.status(500).json({ error: "Could not review the volunteer application." });
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

    const profile = await getProfile(uid);
    if (profile.isActive === false || profile.accessStatus === "disabled") {
      return res.status(403).json({ error: "Your volunteer account is disabled." });
    }

    const ref = db().collection("volunteers").doc(uid);
    const snapshot = await ref.get();

    if (
      !snapshot.exists ||
      snapshot.data().active !== true ||
      snapshot.data().status !== "approved"
    ) {
      return res.status(403).json({ error: "Your volunteer profile is not approved and active." });
    }

    const timestamp = new Date().toISOString();
    await ref.update({ available: req.body.available, updatedAt: timestamp });

    return res.json({
      volunteer: {
        id: uid,
        ...snapshot.data(),
        available: req.body.available,
        updatedAt: timestamp
      }
    });
  } catch (error) {
    console.error("Volunteer availability update failed:", error);
    return res.status(500).json({ error: "Could not update availability." });
  }
});

export default router;
