import { Router } from "express";
import { getAdminDb } from "../services/firebase.js";
import { requireFirebaseUser } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireFirebaseUser);

const allowedKeys = [
  "highContrast",
  "largeText",
  "screenReader",
  "voiceFirst",
  "reduceMotion",
  "fontSize",
  "theme",
  "language",
  "voiceCommands"
];

function cleanProfile(input = {}) {
  const result = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(input, key)) {
      const value = input[key];
      if (["highContrast", "largeText", "screenReader", "voiceFirst", "reduceMotion", "voiceCommands"].includes(key)) {
        if (typeof value === "boolean") result[key] = value;
      } else if (key === "fontSize" && ["small", "medium", "large"].includes(value)) {
        result[key] = value;
      } else if (key === "theme" && ["light", "dark"].includes(value)) {
        result[key] = value;
      } else if (key === "language" && typeof value === "string") {
        result[key] = value.slice(0, 40);
      }
    }
  }
  return result;
}

async function canAccessStudent(uid, studentId) {
  if (uid === studentId) return true;

  const snapshot = await getAdminDb().collection("users").doc(uid).get();
  const role = String(snapshot.data()?.role || "student").toLowerCase();
  return ["admin", "disability_office"].includes(role);
}

router.get("/:studentId", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const studentId = req.params.studentId;

    if (!(await canAccessStudent(uid, studentId))) {
      return res.status(403).json({ error: "You cannot view this accessibility profile." });
    }

    const snapshot = await getAdminDb().collection("accessibilityProfiles").doc(studentId).get();
    return res.json({ profile: snapshot.exists ? snapshot.data() : {} });
  } catch (error) {
    console.error("Load accessibility profile failed:", error.message);
    return res.status(500).json({ error: "Could not load the accessibility profile." });
  }
});

router.put("/:studentId", async (req, res) => {
  try {
    const uid = req.firebaseToken.uid;
    const studentId = req.params.studentId;

    if (!(await canAccessStudent(uid, studentId))) {
      return res.status(403).json({ error: "You cannot update this accessibility profile." });
    }

    const changes = cleanProfile(req.body);
    const ref = getAdminDb().collection("accessibilityProfiles").doc(studentId);
    const snapshot = await ref.get();
    const profile = {
      ...(snapshot.exists ? snapshot.data() : {}),
      ...changes,
      updatedAt: new Date().toISOString(),
      updatedBy: uid
    };

    await ref.set(profile, { merge: true });
    return res.json({ profile });
  } catch (error) {
    console.error("Save accessibility profile failed:", error.message);
    return res.status(500).json({ error: "Could not save the accessibility profile." });
  }
});

export default router;
