import { Router } from "express";
import { getAdminDb } from "../services/firebase.js";
import {
  requireFirebaseUser,
  requireRole,
} from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireFirebaseUser);

const db = () => getAdminDb();
const now = () => new Date().toISOString();
const supportedQualifications = new Set([
  "Bachelor of Science in Information Technology (BSc IT)",
  "Bachelor of Commerce (BCom)",
]);
const isSupportedQualification = (qualification) =>
  supportedQualifications.has(String(qualification || "").trim());

async function getRole(uid) {
  const user = await db().collection("users").doc(uid).get();
  return String(user.data()?.role || "student").toLowerCase();
}

async function getModule(moduleId, uid, role) {
  const snapshot = await db().collection("modules").doc(moduleId).get();
  if (!snapshot.exists) return null;

  const item = { id: snapshot.id, ...snapshot.data() };
  if (!isSupportedQualification(item.qualification)) return null;

  const allowed =
    role === "admin" ||
    (role === "lecturer" && item.lecturerId === uid) ||
    (role === "student" && (item.studentIds || []).includes(uid));

  return allowed ? item : null;
}

router.get("/modules", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = await getRole(uid);

    if (!["admin", "lecturer", "student"].includes(role)) {
      return res.status(403).json({ error: "Access denied." });
    }

    let query = db().collection("modules");
    if (role === "lecturer") query = query.where("lecturerId", "==", uid);
    const snapshot = await query.get();
    let modules = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(item => isSupportedQualification(item.qualification));

    if (role === "lecturer") {
      query = query.where("lecturerId", "==", uid);
    }

    if (role === "student") {
      query = query.where("studentIds", "array-contains", uid);
    }

    const snapshot = await query.get();

    res.json({
      modules: snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })),
    });
  } catch (error) {
    console.error("Get modules:", error.message);
    res.status(500).json({ error: "Could not load modules." });
  }
});

router.post("/modules", requireRole("admin", "lecturer"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = req.userRole;
    const { code, name, description = "", lecturerId = "", studentIds = [] } = req.body;
    const assignedLecturerId = role === "lecturer" ? uid : String(lecturerId).trim();

    if (!code?.trim() || !name?.trim() || !Array.isArray(studentIds) || !isSupportedQualification(qualification)) {
      return res.status(400).json({ error: "Valid module details are required." });
    }

    const ref = db().collection("modules").doc();

    const module = {
      code: code.trim().toUpperCase(),
      name: name.trim(),
      description: String(description).trim(),
      lecturerId: assignedLecturerId,
      studentIds: [...new Set(studentIds.map(String))],
      createdAt: now(),
      updatedAt: now(),
    };

    await ref.set(module);

    res.status(201).json({
      module: { id: ref.id, ...module },
    });
  } catch (error) {
    console.error("Create module:", error.message);
    res.status(500).json({ error: "Could not create module." });
  }
});

router.patch("/modules/:id", requireRole("admin", "lecturer"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = req.userRole;
    const ref = db().collection("modules").doc(req.params.id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: "Module not found." });
    }

    if (role === "lecturer" && snapshot.data().lecturerId !== uid) {
      return res.status(403).json({ error: "You cannot edit this module." });
    }

    const keys = role === "admin"
      ? ["code", "name", "description", "lecturerId", "studentIds"]
      : ["description"];

    const changes = {};

    for (const key of keys) {
      if (Object.hasOwn(req.body, key)) {
        changes[key] = req.body[key];
      }
    }

    if (changes.studentIds !== undefined) {
      if (!Array.isArray(changes.studentIds)) {
        return res.status(400).json({ error: "Student IDs must be a list." });
      }
      changes.studentIds = [...new Set(changes.studentIds.map(String))];
    }

    if (changes.code) changes.code = String(changes.code).trim().toUpperCase();
    if (changes.name) changes.name = String(changes.name).trim();
    if (changes.description !== undefined) {
      changes.description = String(changes.description).trim();
    }
    if (changes.qualification !== undefined) {
      changes.qualification = String(changes.qualification).trim();
      if (!isSupportedQualification(changes.qualification)) {
        return res.status(400).json({ error: "Choose BSc IT or BCOM for the module qualification." });
      }
    }

    changes.updatedAt = now();
    await ref.update(changes);

    const updated = await ref.get();
    res.json({ module: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error("Update module:", error.message);
    res.status(500).json({ error: "Could not update module." });
  }
});

router.get("/timetable", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = await getRole(uid);

    if (!["admin", "lecturer", "student"].includes(role)) {
      return res.status(403).json({ error: "Access denied." });
    }

    const snapshot = await db().collection("timetables").get();
    const entries = [];

    for (const doc of snapshot.docs) {
      const entry = { id: doc.id, ...doc.data() };

      if (await getModule(entry.moduleId, uid, role)) {
        entries.push(entry);
      }
    }

    res.json({ timetable: entries });
  } catch (error) {
    console.error("Get timetable:", error.message);
    res.status(500).json({ error: "Could not load timetable." });
  }
});

router.post("/timetable", requireRole("admin", "lecturer"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = req.userRole;
    const { moduleId, title, date, startTime, endTime, venue } = req.body;

    if (!moduleId || !title?.trim() || !date || !startTime || !endTime || !venue?.trim()) {
      return res.status(400).json({ error: "Complete all timetable fields." });
    }

    if (!(await getModule(moduleId, uid, role))) {
      return res.status(403).json({ error: "You cannot schedule this module." });
    }

    const ref = db().collection("timetables").doc();

    const entry = {
      moduleId,
      title: title.trim(),
      date,
      startTime,
      endTime,
      venue: venue.trim(),
      createdBy: uid,
      createdAt: now(),
      updatedAt: now(),
    };

    await ref.set(entry);

    res.status(201).json({
      timetableEntry: { id: ref.id, ...entry },
    });
  } catch (error) {
    console.error("Create timetable:", error.message);
    res.status(500).json({ error: "Could not create timetable entry." });
  }
});

router.get("/materials", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = await getRole(uid);

    if (!["admin", "lecturer", "student"].includes(role)) {
      return res.status(403).json({ error: "Access denied." });
    }

    const snapshot = await db().collection("studyMaterials").get();
    const materials = [];

    for (const doc of snapshot.docs) {
      const item = { id: doc.id, ...doc.data() };
      const module = await getModule(item.moduleId, uid, role);

      if (module && (role !== "student" || item.published === true)) {
        materials.push(item);
      }
    }

    res.json({ materials });
  } catch (error) {
    console.error("Get materials:", error.message);
    res.status(500).json({ error: "Could not load study materials." });
  }
});

router.post("/materials", requireRole("admin", "lecturer"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = req.userRole;
    const {
      moduleId,
      title,
      description = "",
      fileName,
      storagePath,
      contentType,
    } = req.body;

    if (!moduleId || !title?.trim() || !fileName?.trim() || !storagePath?.trim()) {
      return res.status(400).json({ error: "Material details are incomplete." });
    }

    if (!(await getModule(moduleId, uid, role))) {
      return res.status(403).json({ error: "You cannot add material to this module." });
    }

    const ref = db().collection("studyMaterials").doc();

    const material = {
      moduleId,
      title: title.trim(),
      description: String(description).trim(),
      fileName: fileName.trim(),
      storagePath: storagePath.trim(),
      contentType: String(contentType || ""),
      published: false,
      uploadedBy: uid,
      createdAt: now(),
      updatedAt: now(),
    };

    await ref.set(material);

    res.status(201).json({
      material: { id: ref.id, ...material },
    });
  } catch (error) {
    console.error("Save material:", error.message);
    res.status(500).json({ error: "Could not save material." });
  }
});

router.patch("/materials/:id/publish", requireRole("admin", "lecturer"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = req.userRole;
    const ref = db().collection("studyMaterials").doc(req.params.id);
    const snapshot = await ref.get();

    if (!snapshot.exists) {
      return res.status(404).json({ error: "Material not found." });
    }

    const item = snapshot.data();

    if (!(await getModule(item.moduleId, uid, role))) {
      return res.status(403).json({ error: "You cannot publish this material." });
    }

    if (typeof req.body?.published !== "boolean") {
      return res.status(400).json({ error: "Published must be true or false." });
    }

    await ref.update({
      published: req.body.published,
      updatedAt: now(),
    });

    res.json({ id: ref.id, published: req.body.published });
  } catch (error) {
    console.error("Publish material:", error.message);
    res.status(500).json({ error: "Could not publish material." });
  }
});

router.get("/announcements", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = await getRole(uid);

    if (!["admin", "lecturer", "student"].includes(role)) {
      return res.status(403).json({ error: "Access denied." });
    }

    let snapshots;

    if (role === "admin") {
      snapshots = [await db().collection("announcements")
        .orderBy("createdAt", "desc")
        .limit(100)
        .get()];
    } else {
      let moduleQuery = db().collection("modules");
      moduleQuery = role === "lecturer"
        ? moduleQuery.where("lecturerId", "==", uid)
        : moduleQuery.where("studentIds", "array-contains", uid);
      const modules = await moduleQuery.get();
      const moduleIds = modules.docs.map(doc => doc.id);

      snapshots = await Promise.all(moduleIds.map(moduleId =>
        db().collection("announcements")
          .where("moduleId", "==", moduleId)
          .limit(100)
          .get()
      ));
    }

    const announcements = snapshots
      .flatMap(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })))
      .filter(item => role !== "student" || item.published === true)
      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
      .slice(0, 100);

    res.json({ announcements });
  } catch (error) {
    console.error("Get announcements:", error.message);
    res.status(500).json({ error: "Could not load announcements." });
  }
});

router.post("/announcements", requireRole("lecturer"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const { moduleId, title, message, importance = "normal" } = req.body || {};
    const cleanModuleId = typeof moduleId === "string" ? moduleId.trim() : "";
    const cleanTitle = typeof title === "string" ? title.trim() : "";
    const cleanMessage = typeof message === "string" ? message.trim() : "";

    if (
      !cleanModuleId ||
      !cleanTitle ||
      cleanTitle.length > 120 ||
      !cleanMessage ||
      cleanMessage.length > 2000 ||
      !["normal", "important"].includes(importance)
    ) {
      return res.status(400).json({
        error: "Provide a module, a title (up to 120 characters), a message (up to 2000 characters), and a valid importance level.",
      });
    }

    const module = await getModule(cleanModuleId, uid, req.userRole);

    if (!module) {
      return res.status(403).json({
        error: "You can only publish announcements to your assigned modules.",
      });
    }

    const ref = db().collection("announcements").doc();
    const announcement = {
      moduleId: cleanModuleId,
      moduleName: module.name || module.code || "Module",
      title: cleanTitle,
      message: cleanMessage,
      importance,
      published: true,
      createdBy: uid,
      createdAt: now(),
      updatedAt: now(),
    };

    await ref.set(announcement);

    res.status(201).json({
      announcement: { id: ref.id, ...announcement },
    });
  } catch (error) {
    console.error("Create announcement:", error.message);
    res.status(500).json({ error: "Could not publish announcement." });
  }
});

router.get("/attendance", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = await getRole(uid);

    if (!["admin", "lecturer", "student"].includes(role)) {
      return res.status(403).json({ error: "Access denied." });
    }

    const snapshot = await db().collection("attendance").get();
    const records = [];

    for (const doc of snapshot.docs) {
      const item = { id: doc.id, ...doc.data() };

      if (
        (role === "student" && item.studentId === uid) ||
        (role !== "student" && await getModule(item.moduleId, uid, role))
      ) {
        records.push(item);
      }
    }

    res.json({ attendance: records });
  } catch (error) {
    console.error("Get attendance:", error.message);
    res.status(500).json({ error: "Could not load attendance." });
  }
});

router.post("/attendance", requireRole("admin", "lecturer"), async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const role = req.userRole;
    const { moduleId, timetableId, studentId, status, notes = "" } = req.body;

    if (
      !moduleId ||
      !timetableId ||
      !studentId ||
      !["present", "absent", "late", "excused"].includes(status)
    ) {
      return res.status(400).json({ error: "Attendance details are incomplete." });
    }

    const module = await getModule(moduleId, uid, role);

    if (!module || !(module.studentIds || []).includes(studentId)) {
      return res.status(403).json({ error: "You cannot record this student's attendance." });
    }

    const classSnapshot = await db().collection("timetables").doc(timetableId).get();

    if (!classSnapshot.exists || classSnapshot.data().moduleId !== moduleId) {
      return res.status(400).json({ error: "Invalid timetable entry for this module." });
    }

    const ref = db().collection("attendance").doc(`${timetableId}_${studentId}`);

    const record = {
      moduleId,
      timetableId,
      studentId,
      status,
      notes: String(notes).trim(),
      recordedBy: uid,
      updatedAt: now(),
    };

    await ref.set(record, { merge: true });

    res.json({ attendance: { id: ref.id, ...record } });
  } catch (error) {
    console.error("Record attendance:", error.message);
    res.status(500).json({ error: "Could not record attendance." });
  }
});

export default router;
