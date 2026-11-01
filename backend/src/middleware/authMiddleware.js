import { getAdminAuth, getAdminDb } from "../services/firebase.js";

const VALID_ROLES = new Set([
  "student",
  "admin",
  "volunteer",
  "disability_office",
  "security",
  "lecturer",
]);

export async function requireFirebaseUser(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ")
      ? header.slice(7).trim()
      : "";

    if (!token) {
      return res.status(401).json({
        error: "Sign in is required."
      });
    }

    // checkRevoked=true also checks whether the Firebase account
    // has been disabled or its refresh tokens have been revoked.
    req.firebaseToken = await getAdminAuth().verifyIdToken(token, true);

    const snapshot = await getAdminDb()
      .collection("users")
      .doc(req.firebaseToken.uid)
      .get();

    if (snapshot.exists) {
      const profile = snapshot.data() || {};

      if (
        profile.isActive === false ||
        profile.accessStatus === "disabled"
      ) {
        return res.status(403).json({
          error: "Your account access has been disabled. Contact your administrator."
        });
      }
    }

    return next();
  } catch (error) {
    console.error("Firebase authentication failed:", error.message);

    return res.status(401).json({
      error: "Your session is invalid, disabled or expired. Please sign in again."
    });
  }
}

export function requireRole(...allowedRoles) {
  const permittedRoles = allowedRoles.map(role =>
    String(role).toLowerCase()
  );

  return async (req, res, next) => {
    try {
      if (!req.firebaseToken?.uid) {
        return res.status(401).json({
          error: "Authentication is required."
        });
      }

      const snapshot = await getAdminDb()
        .collection("users")
        .doc(req.firebaseToken.uid)
        .get();

      if (!snapshot.exists) {
        return res.status(403).json({
          error: "User profile not found."
        });
      }

      const profile = snapshot.data() || {};

      if (
        profile.isActive === false ||
        profile.accessStatus === "disabled"
      ) {
        return res.status(403).json({
          error: "Your account access has been disabled."
        });
      }

      const role = String(profile.role || "student").toLowerCase();

      if (!VALID_ROLES.has(role) || !permittedRoles.includes(role)) {
        return res.status(403).json({
          error: "You do not have permission to access this resource."
        });
      }

      req.userRole = role;
      return next();
    } catch (error) {
      console.error("Role verification failed:", error.message);

      return res.status(500).json({
        error: "Could not verify your account permissions."
      });
    }
  };
}
