import { Router } from "express";
import { getAdminAuth, getAdminDb, getAdminStorage } from "../services/firebase.js";
import { requireFirebaseUser, requireRole } from "../middleware/authMiddleware.js";

const router = Router();
const db = () => getAdminDb();
const now = () => new Date().toISOString();

router.use(requireFirebaseUser);

async function audit(req, action, targetType, targetId, details = {}) {
  await db().collection("auditLogs").add({
    actorId: req.firebaseToken.uid,
    actorEmail: req.firebaseToken.email || "",
    action,
    targetType,
    targetId: String(targetId || ""),
    details,
    createdAt: now()
  });
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function sendCsv(res, filename, rows, columns) {
  const lines = [
    columns.map(column => csvValue(column.label)).join(","),
    ...rows.map(row => columns.map(column => csvValue(column.value(row))).join(","))
  ];

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  return res.send("\uFEFF" + lines.join("\r\n"));
}

async function getUsers() {
  const [profiles, authUsers] = await Promise.all([
    db().collection("users").get(),
    getAdminAuth().listUsers(1000)
  ]);

  const authById = new Map(authUsers.users.map(user => [user.uid, user]));

  return profiles.docs.map(doc => {
    const profile = doc.data() || {};
    const authUser = authById.get(doc.id);

    return {
      uid: doc.id,
      displayName: profile.displayName || authUser?.displayName || "",
      email: authUser?.email || profile.email || "",
      role: String(profile.role || "student").toLowerCase(),
      accessibility: profile.accessibility || "",
      isActive: profile.isActive !== false && authUser?.disabled !== true,
      emailVerified: Boolean(authUser?.emailVerified),
      createdAt: profile.createdAt || authUser?.metadata?.creationTime || null,
      updatedAt: profile.updatedAt || null
    };
  });
}

router.get("/overview", requireRole("admin"), async (_req, res) => {
  try {
    const collections = [
      "users", "peerRequests", "sosAlerts", "accessibilityProfiles",
      "accessibilityApplications", "departments", "modules",
      "volunteers", "auditLogs"
    ];

    const counts = await Promise.all(collections.map(async name => {
      const result = await db().collection(name).count().get();
      return [name, result.data().count];
    }));

    const stats = Object.fromEntries(counts);
    const [openRequests, activeSOS, pendingApplications] = await Promise.all([
      db().collection("peerRequests").where("status", "==", "open").count().get(),
      db().collection("sosAlerts").where("status", "==", "active").count().get(),
      db().collection("accessibilityApplications").where("status", "==", "pending").count().get()
    ]);

    const users = await getUsers();
    const staff = users.filter(user => user.role !== "student");

    return res.json({
      stats: {
        totalUsers: stats.users,
        students: users.filter(user => user.role === "student").length,
        staff: staff.length,
        departments: stats.departments,
        pendingApprovals: pendingApplications.data().count,
        totalRequests: stats.peerRequests,
        openRequests: openRequests.data().count,
        activeSOS: activeSOS.data().count,
        accessibilityProfiles: stats.accessibilityProfiles,
        modules: stats.modules,
        volunteers: stats.volunteers
      }
    });
  } catch (error) {
    console.error("Admin overview failed:", error.message);
    return res.status(500).json({ error: "Could not load administration overview." });
  }
});

router.get("/users", requireRole("admin"), async (req, res) => {
  try {
    const users = await getUsers();
    const role = String(req.query.role || "").toLowerCase();
    const status = String(req.query.status || "").toLowerCase();
    const search = String(req.query.search || "").trim().toLowerCase();

    const filtered = users.filter(user => {
      if (role && user.role !== role) return false;
      if (status === "active" && !user.isActive) return false;
      if (status === "disabled" && user.isActive) return false;

      return !search ||
        user.displayName.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search) ||
        user.uid.toLowerCase().includes(search);
    });

    return res.json({ users: filtered });
  } catch (error) {
    console.error("Admin users failed:", error.message);
    return res.status(500).json({ error: "Could not load user accounts." });
  }
});

router.patch("/users/:uid/access", requireRole("admin"), async (req, res) => {
  try {
    const uid = req.params.uid;
    const { isActive } = req.body || {};

    if (typeof isActive !== "boolean") {
      return res.status(400).json({ error: "isActive must be true or false." });
    }

    if (uid === req.firebaseToken.uid && !isActive) {
      return res.status(400).json({ error: "You cannot disable your own administrator account." });
    }

    const userRef = db().collection("users").doc(uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: "User profile not found." });
    }

    const profile = snapshot.data() || {};

    if (!isActive && String(profile.role || "student").toLowerCase() === "admin") {
      const admins = await db().collection("users").where("role", "==", "admin").get();
      const activeAdmins = admins.docs.filter(doc => doc.data()?.isActive !== false);

      if (activeAdmins.length <= 1) {
        return res.status(400).json({ error: "The last active administrator cannot be disabled." });
      }
    }

    await getAdminAuth().updateUser(uid, { disabled: !isActive });
    await userRef.set({
      isActive,
      accessStatus: isActive ? "active" : "disabled",
      updatedAt: now(),
      updatedBy: req.firebaseToken.uid
    }, { merge: true });

    await audit(req, isActive ? "user_access_enabled" : "user_access_disabled", "user", uid);

    return res.json({ message: `Account access ${isActive ? "enabled" : "disabled"}.`, isActive });
  } catch (error) {
    console.error("Admin user access update failed:", error.message);
    return res.status(500).json({ error: "Could not update account access." });
  }
});

router.get("/departments", requireRole("admin"), async (_req, res) => {
  try {
    const snapshot = await db().collection("departments").orderBy("name").get();
    return res.json({
      departments: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    });
  } catch (error) {
    console.error("Departments load failed:", error.message);
    return res.status(500).json({ error: "Could not load departments." });
  }
});

router.post("/departments", requireRole("admin"), async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim();
    const description = String(req.body?.description || "").trim();

    if (!name || name.length > 120) {
      return res.status(400).json({ error: "Enter a department name of 1 to 120 characters." });
    }

    const ref = db().collection("departments").doc();
    const department = {
      name,
      description: description.slice(0, 500),
      staffIds: [],
      isActive: true,
      createdAt: now(),
      updatedAt: now(),
      createdBy: req.firebaseToken.uid
    };

    await ref.set(department);
    await audit(req, "department_created", "department", ref.id, { name });

    return res.status(201).json({ department: { id: ref.id, ...department } });
  } catch (error) {
    console.error("Department creation failed:", error.message);
    return res.status(500).json({ error: "Could not create department." });
  }
});

router.patch("/departments/:id", requireRole("admin"), async (req, res) => {
  try {
    const ref = db().collection("departments").doc(req.params.id);
    const snapshot = await ref.get();

    if (!snapshot.exists) return res.status(404).json({ error: "Department not found." });

    const changes = {};

    if (Object.hasOwn(req.body || {}, "name")) {
      const name = String(req.body.name || "").trim();
      if (!name || name.length > 120) {
        return res.status(400).json({ error: "Enter a valid department name." });
      }
      changes.name = name;
    }

    if (Object.hasOwn(req.body || {}, "description")) {
      changes.description = String(req.body.description || "").trim().slice(0, 500);
    }

    if (Object.hasOwn(req.body || {}, "isActive")) {
      if (typeof req.body.isActive !== "boolean") {
        return res.status(400).json({ error: "isActive must be true or false." });
      }
      changes.isActive = req.body.isActive;
    }

    if (Object.hasOwn(req.body || {}, "staffIds")) {
      if (!Array.isArray(req.body.staffIds)) {
        return res.status(400).json({ error: "staffIds must be a list." });
      }

      const staffIds = [...new Set(req.body.staffIds.map(String))];
      const users = await getUsers();
      const validStaff = new Set(users.filter(user => user.role !== "student").map(user => user.uid));

      if (staffIds.some(uid => !validStaff.has(uid))) {
        return res.status(400).json({ error: "Only registered staff accounts can be assigned." });
      }

      changes.staffIds = staffIds;
    }

    if (!Object.keys(changes).length) {
      return res.status(400).json({ error: "No valid department changes were supplied." });
    }

    changes.updatedAt = now();
    changes.updatedBy = req.firebaseToken.uid;

    await ref.update(changes);
    await audit(req, "department_updated", "department", ref.id, changes);

    return res.json({ department: { id: ref.id, ...snapshot.data(), ...changes } });
  } catch (error) {
    console.error("Department update failed:", error.message);
    return res.status(500).json({ error: "Could not update department." });
  }
});

router.get("/accessibility-applications", requireRole("admin", "disability_office"), async (_req, res) => {
  try {
    const snapshot = await db().collection("accessibilityApplications")
      .orderBy("createdAt", "desc").limit(200).get();

    return res.json({
      applications: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    });
  } catch (error) {
    console.error("Accessibility applications load failed:", error.message);
    return res.status(500).json({ error: "Could not load accessibility applications." });
  }
});

router.post("/accessibility-applications", requireRole("student"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const { accessibility, description = "", documents = [] } = req.body || {};

    if (!String(accessibility || "").trim()) {
      return res.status(400).json({ error: "Select an accessibility support category." });
    }

    if (!Array.isArray(documents) || documents.length > 10) {
      return res.status(400).json({ error: "Submit between zero and ten supporting documents." });
    }

    for (const document of documents) {
      const path = String(document?.storagePath || "");
      if (!path.startsWith(`accessibility-applications/${uid}/`)) {
        return res.status(400).json({ error: "A supporting document has an invalid storage path." });
      }
      if (!String(document?.fileName || "").trim()) {
        return res.status(400).json({ error: "Every supporting document needs a file name." });
      }
    }

    const profileSnapshot = await db().collection("users").doc(uid).get();
    const profile = profileSnapshot.data() || {};
    const ref = db().collection("accessibilityApplications").doc();

    const application = {
      studentId: uid,
      studentName: String(profile.displayName || req.firebaseToken.name || "Student").slice(0, 120),
      studentEmail: String(req.firebaseToken.email || "").slice(0, 160),
      accessibility: String(accessibility).trim().slice(0, 120),
      description: String(description).trim().slice(0, 2000),
      documents: documents.map(document => ({
        storagePath: String(document.storagePath),
        fileName: String(document.fileName).trim().slice(0, 180),
        contentType: String(document.contentType || "").slice(0, 100)
      })),
      status: "pending",
      reviewNote: "",
      createdAt: now(),
      updatedAt: now()
    };

    await ref.set(application);

    return res.status(201).json({
      application: { id: ref.id, ...application }
    });
  } catch (error) {
    console.error("Accessibility application submission failed:", error.message);
    return res.status(500).json({ error: "Could not submit the accessibility application." });
  }
});

router.patch("/accessibility-applications/:id/review", requireRole("admin", "disability_office"), async (req, res) => {
  try {
    const status = String(req.body?.status || "");
    const reviewNote = String(req.body?.reviewNote || "").trim().slice(0, 2000);

    if (!["approved", "rejected", "needs_information"].includes(status)) {
      return res.status(400).json({ error: "Choose approved, rejected or needs_information." });
    }

    const ref = db().collection("accessibilityApplications").doc(req.params.id);
    const snapshot = await ref.get();

    if (!snapshot.exists) return res.status(404).json({ error: "Application not found." });

    const updates = {
      status,
      reviewNote,
      reviewedBy: req.firebaseToken.uid,
      reviewedAt: now(),
      updatedAt: now()
    };

    await ref.update(updates);
    await audit(req, "accessibility_application_reviewed", "accessibility_application", ref.id, { status });

    return res.json({ application: { id: ref.id, ...snapshot.data(), ...updates } });
  } catch (error) {
    console.error("Accessibility application review failed:", error.message);
    return res.status(500).json({ error: "Could not review the application." });
  }
});

router.get("/accessibility-applications/:id/documents/:index", requireRole("admin", "disability_office"), async (req, res) => {
  try {
    const ref = db().collection("accessibilityApplications").doc(req.params.id);
    const snapshot = await ref.get();

    if (!snapshot.exists) return res.status(404).json({ error: "Application not found." });

    const index = Number(req.params.index);
    const documents = snapshot.data()?.documents || [];

    if (!Number.isInteger(index) || index < 0 || index >= documents.length) {
      return res.status(404).json({ error: "Supporting document not found." });
    }

    const storagePath = documents[index].storagePath;
    const uid = snapshot.data().studentId;

    if (!storagePath.startsWith(`accessibility-applications/${uid}/`)) {
      return res.status(403).json({ error: "Document path is not authorised." });
    }

    const [url] = await getAdminStorage().file(storagePath).getSignedUrl({
      action: "read",
      expires: Date.now() + 5 * 60 * 1000
    });

    await audit(req, "accessibility_document_view_link_created", "accessibility_application", req.params.id);

    return res.json({ url, expiresInSeconds: 300 });
  } catch (error) {
    console.error("Supporting document link failed:", error.message);
    return res.status(500).json({ error: "Could not create a secure document link. Check Firebase Storage configuration." });
  }
});

router.get("/analytics", requireRole("admin"), async (_req, res) => {
  try {
    const [users, requests, alerts, applications, modules, volunteers] = await Promise.all([
      getUsers(),
      db().collection("peerRequests").get(),
      db().collection("sosAlerts").get(),
      db().collection("accessibilityApplications").get(),
      db().collection("modules").get(),
      db().collection("volunteers").get()
    ]);

    const requestItems = requests.docs.map(doc => doc.data());
    const alertItems = alerts.docs.map(doc => doc.data());
    const applicationItems = applications.docs.map(doc => doc.data());

    const months = [];
    const today = new Date();

    for (let offset = 5; offset >= 0; offset--) {
      const date = new Date(today.getFullYear(), today.getMonth() - offset, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      months.push({
        month: date.toLocaleString("en-ZA", { month: "short", year: "2-digit" }),
        users: users.filter(user => String(user.createdAt || "").startsWith(key)).length,
        requests: requestItems.filter(item => String(item.createdAt || "").startsWith(key)).length
      });
    }

    return res.json({
      totals: {
        users: users.length,
        students: users.filter(user => user.role === "student").length,
        staff: users.filter(user => user.role !== "student").length,
        requests: requestItems.length,
        activeRequests: requestItems.filter(item => item.status === "open").length,
        completedRequests: requestItems.filter(item => item.status === "completed").length,
        sosAlerts: alertItems.length,
        activeSOS: alertItems.filter(item => item.status === "active").length,
        applications: applicationItems.length,
        pendingApplications: applicationItems.filter(item => item.status === "pending").length,
        approvedApplications: applicationItems.filter(item => item.status === "approved").length,
        modules: modules.size,
        volunteers: volunteers.size
      },
      monthly: months,
      accessibility: Object.entries(users.reduce((counts, user) => {
        const category = user.accessibility || "Not specified";
        counts[category] = (counts[category] || 0) + 1;
        return counts;
      }, {})).map(([category, count]) => ({ category, count })),
      applicationsByStatus: ["pending", "approved", "rejected", "needs_information"].map(status => ({
        status,
        count: applicationItems.filter(item => item.status === status).length
      }))
    });
  } catch (error) {
    console.error("Admin analytics failed:", error.message);
    return res.status(500).json({ error: "Could not load analytics." });
  }
});

router.get("/reports/:type.csv", requireRole("admin"), async (req, res) => {
  try {
    const type = String(req.params.type || "");

    if (type === "users" || type === "staff") {
      let users = await getUsers();
      if (type === "staff") users = users.filter(user => user.role !== "student");

      return sendCsv(res, `uniable-${type}-${Date.now()}.csv`, users, [
        { label: "User ID", value: row => row.uid },
        { label: "Name", value: row => row.displayName },
        { label: "Email", value: row => row.email },
        { label: "Role", value: row => row.role },
        { label: "Accessibility category", value: row => row.accessibility },
        { label: "Active", value: row => row.isActive },
        { label: "Email verified", value: row => row.emailVerified },
        { label: "Created", value: row => row.createdAt }
      ]);
    }

    if (type === "applications") {
      const snapshot = await db().collection("accessibilityApplications").get();
      const rows = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      return sendCsv(res, `uniable-accessibility-applications-${Date.now()}.csv`, rows, [
        { label: "Application ID", value: row => row.id },
        { label: "Student ID", value: row => row.studentId },
        { label: "Student name", value: row => row.studentName },
        { label: "Accessibility category", value: row => row.accessibility },
        { label: "Status", value: row => row.status },
        { label: "Document count", value: row => (row.documents || []).length },
        { label: "Submitted", value: row => row.createdAt },
        { label: "Reviewed", value: row => row.reviewedAt }
      ]);
    }

    if (type === "activity") {
      const [requests, alerts] = await Promise.all([
        db().collection("peerRequests").get(),
        db().collection("sosAlerts").get()
      ]);

      const rows = [
        ...requests.docs.map(doc => ({ id: doc.id, type: "Assistance request", ...doc.data() })),
        ...alerts.docs.map(doc => ({ id: doc.id, type: "SOS alert", ...doc.data() }))
      ];

      return sendCsv(res, `uniable-service-activity-${Date.now()}.csv`, rows, [
        { label: "Record ID", value: row => row.id },
        { label: "Type", value: row => row.type },
        { label: "Status", value: row => row.status },
        { label: "Created", value: row => row.createdAt },
        { label: "Updated", value: row => row.updatedAt }
      ]);
    }

    return res.status(400).json({ error: "Choose users, staff, applications or activity." });
  } catch (error) {
    console.error("Admin report generation failed:", error.message);
    return res.status(500).json({ error: "Could not generate the report." });
  }
});

router.get("/settings", requireRole("admin"), async (_req, res) => {
  try {
    const snapshot = await db().collection("systemSettings").doc("global").get();
    return res.json({
      settings: snapshot.exists ? snapshot.data() : {
        maintenanceMode: false,
        allowStudentRegistration: true,
        allowVolunteerRegistration: true,
        updatedAt: null
      }
    });
  } catch (error) {
    console.error("Admin settings load failed:", error.message);
    return res.status(500).json({ error: "Could not load system settings." });
  }
});

router.patch("/settings", requireRole("admin"), async (req, res) => {
  try {
    const allowed = ["maintenanceMode", "allowStudentRegistration", "allowVolunteerRegistration"];
    const changes = {};

    for (const key of allowed) {
      if (Object.hasOwn(req.body || {}, key)) {
        if (typeof req.body[key] !== "boolean") {
          return res.status(400).json({ error: `${key} must be true or false.` });
        }
        changes[key] = req.body[key];
      }
    }

    if (!Object.keys(changes).length) {
      return res.status(400).json({ error: "No supported settings were supplied." });
    }

    changes.updatedAt = now();
    changes.updatedBy = req.firebaseToken.uid;

    const ref = db().collection("systemSettings").doc("global");
    await ref.set(changes, { merge: true });
    await audit(req, "system_settings_updated", "system_settings", "global", changes);

    const updated = await ref.get();
    return res.json({ settings: updated.data() });
  } catch (error) {
    console.error("Admin settings update failed:", error.message);
    return res.status(500).json({ error: "Could not update system settings." });
  }
});

router.get("/audit", requireRole("admin"), async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 300);
    const snapshot = await db().collection("auditLogs")
      .orderBy("createdAt", "desc").limit(limit).get();

    return res.json({
      logs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    });
  } catch (error) {
    console.error("Admin audit log load failed:", error.message);
    return res.status(500).json({ error: "Could not load audit logs." });
  }
});

export default router;
