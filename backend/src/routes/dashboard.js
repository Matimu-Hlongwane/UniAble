import { Router } from "express";
import { getAdminDb } from "../services/firebase.js";
import { requireFirebaseUser, requireRole } from "../middleware/authMiddleware.js";

const router = Router();
const allowedRoles = ["student", "admin", "lecturer", "volunteer", "disability_office", "security"];

router.get("/", requireFirebaseUser, requireRole(...allowedRoles), async (req, res) => {
  try {
    const db = getAdminDb();
    const uid = req.firebaseToken.uid;
    const role = req.userRole;

    const count = async (query) => {
      const result = await query.count().get();
      return result.data().count;
    };

    const recent = async (collection, limit = 10) => {
      const snapshot = await db.collection(collection)
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    const sortNewest = (items) => items.sort((a, b) =>
      String(b.createdAt || "").localeCompare(String(a.createdAt || ""))
    );

    if (role === "admin") {
      const [
        totalUsers,
        adminCount,
        lecturerCount,
        volunteerCount,
        disabilityOfficeCount,
        securityCount,
        totalRequests,
        openRequests,
        activeSOS,
        accessibilityProfiles,
        recentRequests,
        recentAlerts
      ] = await Promise.all([
        count(db.collection("users")),
        count(db.collection("users").where("role", "==", "admin")),
        count(db.collection("users").where("role", "==", "lecturer")),
        count(db.collection("users").where("role", "==", "volunteer")),
        count(db.collection("users").where("role", "==", "disability_office")),
        count(db.collection("users").where("role", "==", "security")),
        count(db.collection("peerRequests")),
        count(db.collection("peerRequests").where("status", "==", "open")),
        count(db.collection("sosAlerts").where("status", "==", "active")),
        count(db.collection("accessibilityProfiles")),
        recent("peerRequests", 10),
        recent("sosAlerts", 10)
      ]);

      const staffCount = adminCount + lecturerCount + volunteerCount +
        disabilityOfficeCount + securityCount;

      const activity = sortNewest([
        ...recentRequests.map(item => ({
          id: item.id,
          kind: "peer_request",
          description: `Assistance request: ${item.type || "General assistance"}`,
          status: item.status || "unknown",
          createdAt: item.createdAt || null
        })),
        ...recentAlerts.map(item => ({
          id: item.id,
          kind: "sos_alert",
          description: "SOS alert",
          status: item.status || "unknown",
          createdAt: item.createdAt || null
        }))
      ]).slice(0, 15);

      return res.json({
        role,
        stats: {
          totalUsers,
          students: Math.max(0, totalUsers - staffCount),
          staff: staffCount,
          totalRequests,
          openRequests,
          activeSOS,
          accessibilityProfiles
        },
        staffCounts: {
          admin: adminCount,
          lecturer: lecturerCount,
          volunteer: volunteerCount,
          disabilityOffice: disabilityOfficeCount,
          security: securityCount
        },
        recentActivity: activity
      });
    }

    if (role === "lecturer") {
      const requests = await db.collection("peerRequests")
        .where("type", "==", "Lecture assistance")
        .limit(100)
        .get();

      const items = sortNewest(requests.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      return res.json({
        role,
        stats: {
          totalRequests: items.length,
          openRequests: items.filter(item => item.status === "open").length,
          completedRequests: items.filter(item => item.status === "completed").length
        },
        requests: items
      });
    }

    if (role === "volunteer") {
      const [requests, volunteerSnapshot] = await Promise.all([
        db.collection("peerRequests").where("assignedVolunteerId", "==", uid).limit(100).get(),
        db.collection("volunteers").doc(uid).get()
      ]);

      const items = sortNewest(requests.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const volunteer = volunteerSnapshot.exists ? volunteerSnapshot.data() : null;

      return res.json({
        role,
        stats: {
          assignedRequests: items.length,
          openRequests: items.filter(item => item.status === "open").length,
          completedRequests: items.filter(item => item.status === "completed").length
        },
        availability: volunteer?.available ?? false,
        volunteerRegistered: Boolean(volunteer),
        requests: items
      });
    }

    if (role === "disability_office") {
      const [requests, profiles, pendingRequests] = await Promise.all([
        db.collection("peerRequests").limit(100).get(),
        db.collection("accessibilityProfiles").limit(100).get(),
        count(db.collection("peerRequests").where("status", "==", "open"))
      ]);

      const items = sortNewest(requests.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      const accessibilityItems = profiles.docs.map(doc => ({
        studentId: doc.id,
        ...doc.data()
      }));

      return res.json({
        role,
        stats: {
          supportRequests: items.length,
          pendingRequests,
          accessibilityProfiles: accessibilityItems.length
        },
        requests: items,
        accessibilityProfiles: accessibilityItems
      });
    }

    if (role === "security") {
      const [alerts, activeCount] = await Promise.all([
        recent("sosAlerts", 100),
        count(db.collection("sosAlerts").where("status", "==", "active"))
      ]);

      return res.json({
        role,
        stats: {
          activeSOS: activeCount,
          totalRecentAlerts: alerts.length
        },
        alerts
      });
    }

    return res.status(403).json({ error: "This dashboard is not available for your role." });
  } catch (error) {
    console.error("Dashboard data load failed:", error.message);
    return res.status(500).json({ error: "Could not load dashboard data." });
  }
});

export default router;
