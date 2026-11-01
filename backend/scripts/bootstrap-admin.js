import "dotenv/config";
import { getAdminAuth, getAdminDb } from "../src/services/firebase.js";

const uid = String(process.argv[2] || "").trim();

if (!uid) {
  console.error("Usage: node scripts/bootstrap-admin.js FIREBASE_UID");
  process.exit(1);
}

try {
  const db = getAdminDb();
  const auth = getAdminAuth();

  const existingAdmins = await db.collection("users")
    .where("role", "==", "admin")
    .limit(1)
    .get();

  if (!existingAdmins.empty) {
    throw new Error("An administrator already exists. Bootstrap is disabled.");
  }

  const user = await auth.getUser(uid);

  await db.collection("users").doc(uid).set({
    role: "admin",
    email: user.email || null,
    roleAssignedAt: new Date().toISOString(),
    roleAssignedBy: "initial-bootstrap",
    updatedAt: new Date().toISOString()
  }, { merge: true });

  await auth.setCustomUserClaims(uid, {
    ...(user.customClaims || {}),
    role: "admin"
  });

  console.log("Initial administrator successfully created.");
  console.log("UID:", uid);
  console.log("Email:", user.email || "No email on account");
} catch (error) {
  console.error("Administrator bootstrap failed:", error.message);
  process.exitCode = 1;
}
