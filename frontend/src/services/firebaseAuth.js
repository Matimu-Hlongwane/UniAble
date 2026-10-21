import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, RecaptchaVerifier, signOut, updatePassword, sendEmailVerification, updateProfile, updateEmail, deleteUser, linkWithPhoneNumber, signInWithPhoneNumber } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);

let app = null;
let auth = null;
let storage = null;

if (firebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  storage = getStorage(app);
}

export function getCurrentUser() {
  return auth?.currentUser || null;
}

export function subscribeToAuth(callback) {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

function requireAuth() {
  if (!auth || !auth.currentUser) {
    throw new Error(
      "Your UniAble account is not connected to Firebase authentication. Sign in with the shared Firebase account first."
    );
  }
  return auth.currentUser;
}

export async function sendVerificationEmail(newEmail) {
  const user = requireAuth();
  if (newEmail && newEmail !== user.email) {
    await updateEmail(user, newEmail);
  }
  if (user.emailVerified) return { alreadyVerified: true };
  await sendEmailVerification(user);
  return { alreadyVerified: false };
}

export async function refreshCurrentUser() {
  const user = requireAuth();
  await user.reload();
  return auth.currentUser;
}

export async function saveFirebaseProfile({ displayName, photoFile }) {
  const user = requireAuth();
  let photoURL = user.photoURL || "";

  if (photoFile) {
    if (!storage) throw new Error("Firebase Storage is not configured.");
    const fileRef = ref(storage, `profile-images/${user.uid}/profile`);
    await uploadBytes(fileRef, photoFile, {
      contentType: photoFile.type || "image/jpeg",
    });
    photoURL = await getDownloadURL(fileRef);
  }

  await updateProfile(user, {
    displayName,
    ...(photoURL ? { photoURL } : {}),
  });

  return { displayName: user.displayName, photoURL };
}

export async function sendPhoneOtp(phoneNumber, recaptchaContainerId) {
  if (!auth) throw new Error("Firebase authentication is not configured.");

  const verifier = new RecaptchaVerifier(auth, recaptchaContainerId, {
    size: "invisible",
  });

  try {
    const user = auth.currentUser;
    const confirmation = user
      ? await linkWithPhoneNumber(user, phoneNumber, verifier)
      : await signInWithPhoneNumber(auth, phoneNumber, verifier);

    return {
      confirmation,
      verifier,
    };
  } catch (error) {
    verifier.clear();
    throw error;
  }
}

export async function verifyPhoneOtp(confirmation, code, verifier) {
  if (!confirmation) throw new Error("Please request an OTP first.");
  const result = await confirmation.confirm(code);
  verifier?.clear();
  return result.user;
}

export async function changeAccountPassword(newPassword) {
  const user = requireAuth();
  await updatePassword(user, newPassword);
}

export async function signOutAccount() {
  if (!auth) throw new Error("Firebase authentication is not configured.");
  await signOut(auth);
}

export async function deleteAccount() {
  const user = requireAuth();
  await deleteUser(user);
}

export async function getVoiceAuthenticationState() {
  return localStorage.getItem("uniableVoiceAuthentication") === "true";
}

export async function setVoiceAuthenticationState(enabled) {
  localStorage.setItem("uniableVoiceAuthentication", String(enabled));
  return enabled;
}

export { auth };
