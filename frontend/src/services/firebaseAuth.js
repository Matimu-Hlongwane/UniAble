import { Capacitor } from "@capacitor/core";
import { API_BASE_URL } from "./apiConfig";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  sendPasswordResetEmail,
  getAuth,
  initializeAuth,
  browserLocalPersistence,
  onAuthStateChanged,
  getIdTokenResult,
  RecaptchaVerifier,
  signOut,
  updatePassword,
  sendEmailVerification,
  updateProfile,
  updateEmail,
  deleteUser,
  linkWithPhoneNumber,
  signInWithPhoneNumber,
} from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";

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
let db = null;

if (firebaseConfigured) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth =
    Capacitor.getPlatform() === "ios"
      ? initializeAuth(app, {
          persistence: browserLocalPersistence,
        })
      : getAuth(app);
  storage = getStorage(app);
  db = getFirestore(app);
}

export function getCurrentUser() {
  return auth?.currentUser || null;
}

export async function getCurrentUserRole(user = auth?.currentUser) {
  if (!user) return null;

  const tokenResult = await getIdTokenResult(user);
  const role = String(tokenResult.claims?.role || "student").toLowerCase();

  const allowedRoles = new Set([
    "student",
    "admin",
    "volunteer",
    "disability_office",
    "security",
    "lecturer",
  ]);

  return allowedRoles.has(role) ? role : "student";
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
    if (!storage) {
      throw new Error("Firebase Storage is not configured.");
    }

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

let phoneRecaptchaVerifier = null;
let phoneRecaptchaContainer = null;

function clearPhoneRecaptchaVerifier() {
  if (phoneRecaptchaVerifier) {
    try {
      phoneRecaptchaVerifier.clear();
    } catch (error) {
      console.warn("Could not clear the previous reCAPTCHA verifier:", error);
    }
  }

  phoneRecaptchaVerifier = null;
  phoneRecaptchaContainer = null;
}

export async function sendPhoneOtp(phoneNumber, recaptchaContainerId) {
  if (!auth) {
    throw new Error("Firebase authentication is not configured.");
  }

  const container = document.getElementById(recaptchaContainerId);

  if (!container) {
    throw new Error(
      "The phone verification reCAPTCHA container was not found. Please refresh the page and try again."
    );
  }

  if (
    phoneRecaptchaVerifier &&
    phoneRecaptchaContainer !== container
  ) {
    clearPhoneRecaptchaVerifier();
  }

  if (!phoneRecaptchaVerifier) {
    phoneRecaptchaVerifier = new RecaptchaVerifier(
      auth,
      recaptchaContainerId,
      {
        size: "invisible",
      }
    );

    phoneRecaptchaContainer = container;
  }

  try {
    const user = auth.currentUser;

    const confirmation = user
      ? await linkWithPhoneNumber(
          user,
          phoneNumber,
          phoneRecaptchaVerifier
        )
      : await signInWithPhoneNumber(
          auth,
          phoneNumber,
          phoneRecaptchaVerifier
        );

    return {
      confirmation,
      verifier: phoneRecaptchaVerifier,
    };
  } catch (error) {
    clearPhoneRecaptchaVerifier();
    throw error;
  }
}

export async function verifyPhoneOtp(confirmation, code) {
  if (!confirmation) {
    throw new Error("Please request an OTP first.");
  }

  const result = await confirmation.confirm(code);
  await result.user.getIdToken(true);

  clearPhoneRecaptchaVerifier();

  return result.user;
}

export async function sendPasswordResetEmailToUser(email) {
  if (!auth) {
    throw new Error("Firebase is not configured. Please try again later.");
  }

  const normalizedEmail = String(email || "").trim();

  if (!normalizedEmail) {
    throw new Error("Enter your email address.");
  }

  await sendPasswordResetEmail(auth, normalizedEmail);
}

export async function changeAccountPassword(newPassword) {
  const user = requireAuth();
  await updatePassword(user, newPassword);
}

export async function signOutAccount() {
  if (!auth) {
    throw new Error("Firebase authentication is not configured.");
  }

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

const voiceFirstStorageKey = (uid) => `uniableVoiceFirst:${uid}`;

/** Read the signed-in user's voice-first navigation preference. */
export async function getVoiceFirstPreference(user = auth?.currentUser) {
  const isBlind = (profile, accessibility) => {
    const value = String(accessibility || "").toLowerCase();

    return (
      profile?.id === "blind" ||
      value.includes("visual impairment") ||
      value.includes("blind") ||
      value.includes("low vision")
    );
  };

  if (user && db) {
    try {
      const snapshot = await getDoc(doc(db, "users", user.uid));

      if (snapshot.exists()) {
        const data = snapshot.data();
        const blindProfile = isBlind(
          data.accessibilityProfile,
          data.accessibility
        );
        const explicitlySet = data.voiceFirstManuallySet === true;

        if (blindProfile && !explicitlySet) {
          try {
            localStorage.setItem(
              voiceFirstStorageKey(user.uid),
              "true"
            );
            localStorage.setItem(
              `uniableVoiceFirstManual:${user.uid}`,
              "false"
            );
          } catch {
            // Best-effort browser operation.
          }

          return true;
        }

        if (typeof data.voiceFirstEnabled === "boolean") {
          try {
            localStorage.setItem(
              voiceFirstStorageKey(user.uid),
              String(data.voiceFirstEnabled)
            );

            if (explicitlySet) {
              localStorage.setItem(
                `uniableVoiceFirstManual:${user.uid}`,
                "true"
              );
            }
          } catch {
            // Best-effort browser operation.
          }

          return data.voiceFirstEnabled;
        }
      }
    } catch (error) {
      console.warn(
        "Could not load voice-first preference from Firebase:",
        error
      );
    }
  }

  try {
    if (user) {
      const accessibility = String(
        localStorage.getItem(`uniableAccessibility:${user.uid}`) || ""
      );

      let profile = null;

      try {
        profile = JSON.parse(
          localStorage.getItem("uniableAccessibilityProfile") || "null"
        );
      } catch {
        // Best-effort browser operation.
      }

      const manual =
        localStorage.getItem(
          `uniableVoiceFirstManual:${user.uid}`
        ) === "true";

      const cached = localStorage.getItem(
        voiceFirstStorageKey(user.uid)
      );

      if (isBlind(profile, accessibility) && !manual) return true;

      if (cached === "true" || cached === "false") {
        return cached === "true";
      }

      return isBlind(profile, accessibility);
    }

    let profile = null;

    try {
      profile = JSON.parse(
        localStorage.getItem("uniableAccessibilityProfile") || "null"
      );
    } catch {
      // Best-effort browser operation.
    }

    const manual =
      localStorage.getItem("uniableVoiceFirstManual") === "true";

    if (isBlind(profile, "") && !manual) return true;

    return localStorage.getItem("uniableVoiceFirstEnabled") === "true";
  } catch {
    return false;
  }
}

/** Save voice-first preference to this user's own profile. */
export async function setVoiceFirstPreference(
  enabled,
  user = auth?.currentUser
) {
  const value = Boolean(enabled);

  try {
    if (user) {
      localStorage.setItem(
        voiceFirstStorageKey(user.uid),
        String(value)
      );

      localStorage.setItem(
        `uniableVoiceFirstManual:${user.uid}`,
        "true"
      );
    } else {
      localStorage.setItem(
        "uniableVoiceFirstEnabled",
        String(value)
      );

      localStorage.setItem(
        "uniableVoiceFirstManual",
        "true"
      );
    }
  } catch (error) {
    console.warn("Could not cache voice-first preference:", error);
  }

  try {
    window.dispatchEvent(
      new CustomEvent("uniable-voice-first-change", {
        detail: { enabled: value },
      })
    );
  } catch {
    // Preference remains saved even where custom events are unavailable.
  }

  if (user && db) {
    await setDoc(
      doc(db, "users", user.uid),
      {
        voiceFirstEnabled: value,
        voiceFirstManuallySet: true,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  return value;
}

/* -------------------------------------------------------
   API CONFIGURATION
------------------------------------------------------- */

/* -------------------------------------------------------
   VERIFICATION API
------------------------------------------------------- */

async function verificationApi(path, body) {
  const user = auth?.currentUser;

  if (!user) {
    throw new Error("Please sign in before verifying your account.");
  }

  const token = await user.getIdToken();

  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 15000);

  try {
    const response = await fetch(
      `${API_BASE_URL}/api/auth${path}`,
      {
        method: body === undefined ? "GET" : "POST",

        headers: {
          Authorization: `Bearer ${token}`,
          ...(body === undefined
            ? {}
            : { "Content-Type": "application/json" }),
        },

        ...(body === undefined
          ? {}
          : { body: JSON.stringify(body) }),

        signal: controller.signal,
      }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        result.error || "The verification service is unavailable."
      );

      error.status = response.status;

      throw error;
    }

    return result;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(
        "The UniAble verification server did not respond within 15 seconds. Check that your Mac and iPhone are connected to the same network and that the backend is running."
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function startAccountVerification() {
  const result = await verificationApi("/registration/start", {});

  await auth.currentUser.getIdToken(true);

  return result;
}

export async function getVerificationStatus() {
  return verificationApi("/verification-status");
}

export async function sendEmailOtp() {
  return verificationApi("/email-otp/send", {});
}

export async function verifyEmailOtp(code) {
  const result = await verificationApi("/email-otp/verify", { code });

  await auth.currentUser.getIdToken(true);

  return result;
}

export async function completePhoneVerification(phoneNumber) {
  const result = await verificationApi("/phone/verified", {
    phoneNumber,
  });

  await auth.currentUser.getIdToken(true);

  return result;
}

async function ensureAccountVerified(user) {
  const { claims } = await getIdTokenResult(user);

  if (
    claims.accountVerificationRequired === true &&
    claims.accountVerified !== true
  ) {
    const error = new Error(
      "Your account has not been verified yet. Choose Create an account to finish your email or SMS verification."
    );

    error.code = "auth/account-not-verified";

    throw error;
  }

  return user;
}

/* -------------------------------------------------------
   ACCOUNT REGISTRATION
------------------------------------------------------- */

export async function createAccountWithEmailPassword(
  email,
  password,
  displayName,
  accessibility = "None",
  accountType = "student",
  studentDetails = {}
) {
  if (!firebaseConfigured || !auth) {
    throw new Error(
      "Firebase is not configured. Check the frontend environment variables."
    );
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    email.trim(),
    password
  );

  if (displayName?.trim()) {
    await updateProfile(credential.user, {
      displayName: displayName.trim(),
    });
  }

  const selectedAccessibility = accessibility?.trim() || "None";

  const voiceFirstEnabled =
    selectedAccessibility === "Visual Impairment";

  try {
    localStorage.setItem(
      `uniableAccessibility:${credential.user.uid}`,
      selectedAccessibility
    );

    localStorage.setItem(
      voiceFirstStorageKey(credential.user.uid),
      String(voiceFirstEnabled)
    );
  } catch (error) {
    console.warn(
      "Could not save local accessibility preference:",
      error
    );
  }

  if (db) {
    try {
      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          displayName: displayName?.trim() || "",
          accountType: String(accountType || "student"),
          studentDetails: {
            surname: String(studentDetails.surname || "").trim(),
            studentNumber: String(studentDetails.studentNumber || "").trim(),
            qualification: String(studentDetails.qualification || "").trim(),
            yearOfStudy: String(studentDetails.yearOfStudy || "").trim(),
            modules: Array.isArray(studentDetails.modules)
              ? studentDetails.modules.map((module) => String(module).trim()).filter(Boolean)
              : [],
          },
          accessibility: selectedAccessibility,
          voiceFirstEnabled,
          voiceFirstManuallySet: false,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.warn(
        "Could not save accessibility profile to Firestore:",
        error
      );
    }
  }

  return credential.user;
}

/* -------------------------------------------------------
   ACCESSIBILITY PROFILE
------------------------------------------------------- */

export async function saveUserAccessibilityProfile(profile) {
  const user = requireAuth();

  const accessibilityProfile = {
    id: String(profile?.id || "multiple"),
    title: String(
      profile?.title || "Multi-Disability / Custom Adaptive"
    ),
    description: String(
      profile?.description || "Combine preferences in one profile"
    ),
  };

  const categoryById = {
    blind: "Visual Impairment",
    deaf: "Hearing Impairment",
    mobility: "Mobility Support",
    speech: "Speech Support",
    colour: "Colour Vision",
    dyslexia: "Neurodiverse Support",
    adhd: "Neurodiverse Support",
    autism: "Neurodiverse Support",
    down: "Neurodiverse Support",
    multiple: "Other",
  };

  const accessibility =
    categoryById[accessibilityProfile.id] || "Other";

  const serializedProfile = JSON.stringify(accessibilityProfile);

  const autoEnableVoiceFirst =
    accessibilityProfile.id === "blind";

  try {
    localStorage.setItem(
      "uniableAccessibilityProfile",
      serializedProfile
    );

    localStorage.setItem(
      `uniableAccessibility:${user.uid}`,
      accessibility
    );
  } catch (error) {
    console.warn(
      "Could not cache the accessibility profile locally:",
      error
    );
  }

  if (!db) {
    throw new Error(
      "Your selection is saved on this device, but Firebase Firestore is not configured."
    );
  }

  try {
    await setDoc(
      doc(db, "users", user.uid),
      {
        displayName: user.displayName || "",
        accessibility,
        accessibilityProfile,
        ...(autoEnableVoiceFirst
          ? {
              voiceFirstEnabled: true,
              voiceFirstManuallySet: false,
            }
          : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    if (autoEnableVoiceFirst) {
      try {
        localStorage.setItem(
          voiceFirstStorageKey(user.uid),
          "true"
        );

        localStorage.setItem(
          `uniableVoiceFirstManual:${user.uid}`,
          "false"
        );
      } catch {
        // Best-effort browser operation.
      }

      try {
        window.dispatchEvent(
          new CustomEvent("uniable-voice-first-change", {
            detail: { enabled: true },
          })
        );
      } catch {
        // Best-effort browser operation.
      }
    }
  } catch (error) {
    console.error(
      "Could not sync the accessibility profile to Firebase:",
      error
    );

    throw new Error(
      "Your selection is saved on this device, but Firebase could not sync it. Check your Firestore rules and connection."
    );
  }

  return { accessibility, accessibilityProfile };
}

export async function getUserAccessibilityProfile(
  user = auth?.currentUser
) {
  if (!user) return null;

  if (db) {
    try {
      const snapshot = await getDoc(doc(db, "users", user.uid));

      if (snapshot.exists()) {
        const profile = snapshot.data();

        if (profile.accessibility) {
          try {
            localStorage.setItem(
              `uniableAccessibility:${user.uid}`,
              profile.accessibility
            );
          } catch {
            // Continue using the Firestore profile.
          }

          return profile;
        }
      }
    } catch (error) {
      console.warn(
        "Could not read the Firestore accessibility profile:",
        error
      );
    }
  }

  try {
    const accessibility = localStorage.getItem(
      `uniableAccessibility:${user.uid}`
    );

    return accessibility ? { accessibility } : null;
  } catch {
    return null;
  }
}

/* -------------------------------------------------------
   EMAIL AND PASSWORD SIGN-IN
------------------------------------------------------- */

export async function signInWithEmailPassword(email, password) {
  if (!firebaseConfigured || !auth) {
    throw new Error(
      "Firebase is not configured. Check the frontend environment variables."
    );
  }

  let signInTimeoutId;
  const signInTimeout = new Promise((_, reject) => {
    signInTimeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "Firebase Authentication did not respond within 20 seconds. Check that this iPhone has internet access, then try another network or temporarily disable VPN/content filtering."
        )
      );
    }, 20000);
  });

  let credential;

  try {
    credential = await Promise.race([
      signInWithEmailAndPassword(auth, email.trim(), password),
      signInTimeout,
    ]);
  } finally {
    window.clearTimeout(signInTimeoutId);
  }

  let verificationTimeoutId;
  const verificationTimeout = new Promise((_, reject) => {
    verificationTimeoutId = window.setTimeout(() => {
      reject(
        new Error(
          "Firebase signed you in, but account verification did not finish. Check your internet connection and try again."
        )
      );
    }, 10000);
  });

  try {
    return await Promise.race([
      ensureAccountVerified(credential.user),
      verificationTimeout,
    ]);
  } finally {
    window.clearTimeout(verificationTimeoutId);
  }
}

/* -------------------------------------------------------
   PASSWORDLESS SIGN-IN
------------------------------------------------------- */

export async function sendPasswordlessSignInLink(email) {
  if (!firebaseConfigured || !auth) {
    throw new Error(
      "Firebase is not configured. Check the frontend environment variables."
    );
  }

  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    throw new Error("Enter your email address first.");
  }

  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(
    auth,
    normalizedEmail,
    actionCodeSettings
  );

  try {
    window.sessionStorage.setItem(
      "uniableEmailForSignIn",
      normalizedEmail
    );
  } catch {
    // The user can enter their email again after opening the link.
  }
}

export function isPasswordlessSignInLink(
  link = window.location.href
) {
  return Boolean(auth && isSignInWithEmailLink(auth, link));
}

export async function completePasswordlessSignIn(
  email,
  link = window.location.href
) {
  if (!firebaseConfigured || !auth) {
    throw new Error(
      "Firebase is not configured. Check the frontend environment variables."
    );
  }

  if (!isSignInWithEmailLink(auth, link)) {
    throw new Error(
      "This is not a valid UniAble sign-in link. Request a new link."
    );
  }

  const normalizedEmail = email.trim();

  if (!normalizedEmail) {
    throw new Error(
      "Enter the email address that received the sign-in link."
    );
  }

  const credential = await signInWithEmailLink(
    auth,
    normalizedEmail,
    link
  );

  try {
    window.sessionStorage.removeItem("uniableEmailForSignIn");
  } catch {
    // Authentication has succeeded; storage cleanup is optional.
  }

  return ensureAccountVerified(credential.user);
}

export { auth };