import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { addStudent, findByEmail, findByUid } from "./directory.js";

// Firebase Authentication per the proposal's stack. With no credentials in
// .env the app uses a local mock so every screen still works.
//
// ROLES: in real mode the role is read from the signed-in user's ID-token
// custom claim (`role`). Claims can only be set server-side with the
// Firebase Admin SDK (e.g. a Cloud Function run when an approved role
// change is applied) — a client can never grant itself a role.

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const hasRealConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let auth = null;
if (hasRealConfig) {
  auth = getAuth(initializeApp(firebaseConfig));
}

export const isUsingMockAuth = !hasRealConfig;

const MOCK_DELAY_MS = 700;
// Demo only: every mock account shares this password.
const MOCK_PASSWORD = "Passw0rd!";

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function authError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

function toSessionUser(account) {
  return { uid: account.uid, email: account.email, name: account.name, role: account.role };
}

async function mockSignIn(email, password) {
  await delay(MOCK_DELAY_MS);
  const account = findByEmail(email);
  // Check the password first so a suspended-account message never confirms
  // that an email exists to someone who doesn't know the password.
  if (!account || password !== MOCK_PASSWORD) {
    throw authError("auth/invalid-credential", "Incorrect email or password.");
  }
  if (account.status !== "active") {
    throw authError("auth/user-disabled", "This account has been suspended.");
  }
  return toSessionUser(account);
}

/** Email + password sign-in. Resolves to { uid, email, name, role }. */
export async function signIn(email, password) {
  if (!hasRealConfig) return mockSignIn(email, password);

  const credential = await signInWithEmailAndPassword(auth, email, password);
  const token = await credential.user.getIdTokenResult();
  const role = token.claims.role;
  if (!role) {
    throw authError("auth/no-role", "This account has no role assigned yet.");
  }
  return {
    uid: credential.user.uid,
    email: credential.user.email,
    name: credential.user.displayName || credential.user.email,
    role,
  };
}

/**
 * Voice sign-in is a convenience for STUDENTS only. Staff and administrator
 * accounts always need a password, because a voice match is not strong
 * enough proof of identity for roles that can see sensitive data.
 */
export async function signInWithVoiceprint() {
  if (hasRealConfig) {
    throw authError(
      "auth/voiceprint-unavailable",
      "Voice sign-in needs the voiceprint service, which isn't connected yet. Use email and password."
    );
  }
  await delay(MOCK_DELAY_MS / 2);
  const account = findByUid("u-student");
  if (!account || account.status !== "active") {
    throw authError("auth/user-disabled", "This account has been suspended.");
  }
  return toSessionUser(account);
}

/** Step-up check before sensitive actions. Resolves true/false. */
export async function verifyPassword(email, password) {
  if (!hasRealConfig) {
    await delay(300);
    return password === MOCK_PASSWORD;
  }
  try {
    await reauthenticateWithCredential(
      auth.currentUser,
      EmailAuthProvider.credential(email, password)
    );
    return true;
  } catch {
    return false;
  }
}

export async function signUp(email, password) {
  if (hasRealConfig) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return credential.user;
  }
  await delay(MOCK_DELAY_MS);
  return toSessionUser(addStudent(email, "New student"));
}
