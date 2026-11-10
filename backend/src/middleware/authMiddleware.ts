import type { RequestHandler } from "express";
import { getAdminAuth, getAdminDb } from "../services/firebase.js";
import { isRole, type Role, type UserProfile } from "../types.js";
import { errorMessage } from "../utils.js";

const isDisabled = (profile: UserProfile): boolean =>
  profile.isActive === false || profile.accessStatus === "disabled";

export const requireFirebaseUser: RequestHandler = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    if (!token) {
      res.status(401).json({ error: "Sign in is required." });
      return;
    }

    // checkRevoked=true also checks whether the Firebase account
    // has been disabled or its refresh tokens have been revoked.
    const decoded = await getAdminAuth().verifyIdToken(token, true);
    req.firebaseToken = decoded;

    const snapshot = await getAdminDb().collection("users").doc(decoded.uid).get();

    if (snapshot.exists) {
      const profile = (snapshot.data() ?? {}) as UserProfile;

      if (isDisabled(profile)) {
        res.status(403).json({
          error: "Your account access has been disabled. Contact your administrator.",
        });
        return;
      }
    }

    next();
  } catch (error) {
    console.error("Firebase authentication failed:", errorMessage(error));

    res.status(401).json({
      error: "Your session is invalid, disabled or expired. Please sign in again.",
    });
  }
};

export function requireRole(...allowedRoles: Role[]): RequestHandler {
  const permittedRoles = allowedRoles.map((role) => String(role).toLowerCase());

  return async (req, res, next) => {
    try {
      if (!req.firebaseToken?.uid) {
        res.status(401).json({ error: "Authentication is required." });
        return;
      }

      const snapshot = await getAdminDb().collection("users").doc(req.firebaseToken.uid).get();

      if (!snapshot.exists) {
        res.status(403).json({ error: "User profile not found." });
        return;
      }

      const profile = (snapshot.data() ?? {}) as UserProfile;

      if (isDisabled(profile)) {
        res.status(403).json({ error: "Your account access has been disabled." });
        return;
      }

      const role = String(profile.role || "student").toLowerCase();

      if (!isRole(role) || !permittedRoles.includes(role)) {
        res.status(403).json({ error: "You do not have permission to access this resource." });
        return;
      }

      req.userRole = role;
      next();
    } catch (error) {
      console.error("Role verification failed:", errorMessage(error));

      res.status(500).json({ error: "Could not verify your account permissions." });
    }
  };
}
