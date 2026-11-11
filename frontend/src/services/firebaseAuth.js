import { Capacitor } from "@capacitor/core";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, sendPasswordResetEmail } from "firebase/auth";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, onAuthStateChanged, getIdTokenResult, signOut, updatePassword, sendEmailVerification, updateProfile, updateEmail, deleteUser } from "firebase/auth";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, where, updateDoc, arrayUnion } from "firebase/firestore";
import { ACCESSIBILITY_CATEGORIES, ACCESSIBILITY_NONE, ACCESSIBILITY_PROFILES, isSupportedAccessibilityCategory, normalizeAccessibilityCategory } from "../data/accessibilityCategories";
import {
  isValidStudentNumber,
  STUDENT_EMAIL_DOMAIN,
  validateInstitutionalStudentEmail,
} from "../auth-signup/utils/validation";

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
  auth = getAuth(app);
  storage = getStorage(app);
  db = getFirestore(app);
}

export function getCurrentUser() {
  return auth?.currentUser || null;
}

export function getFirebaseApp() {
  return app;
}


export async function getCurrentUserRole(user = auth?.currentUser) {
  if (!user) return null;

  const tokenResult = await getIdTokenResult(user, true);
  const role = String(tokenResult.claims?.role || "student").toLowerCase();

  const allowedRoles = new Set([
    "student",
    "admin",
    "volunteer",
    "disability_office",
    "security",
    "lecturer"
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

export async function uploadAcademicMaterialFile(file, moduleId) {
  const user = requireAuth();
  if (!storage) throw new Error("Firebase Storage is not configured.");
  if (!file || !moduleId) throw new Error("Choose a module and a study material file.");
  const safeName = String(file.name || "study-material").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 120);
  const storagePath = `study-materials/${moduleId}/${Date.now()}-${safeName}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream", customMetadata: { uploadedBy: user.uid, moduleId } });
  return { storagePath, fileName: file.name, contentType: file.type || "application/octet-stream" };
}

export async function getAcademicMaterialUrl(storagePath) {
  requireAuth();
  if (!storage || !storagePath) throw new Error("Study material storage is unavailable.");
  return getDownloadURL(ref(storage, storagePath));
}
export async function sendPasswordResetEmailToUser(email) {
  if (!auth) {
    throw new Error("Firebase is not configured. Please try again later.");
  }

  const normalizedEmail = String(email || "").trim();
  if (!normalizedEmail) {
    throw new Error("Enter your email address.");
  }

  const validatedEmail = validateInstitutionalStudentEmail(normalizedEmail);
  await sendPasswordResetEmail(auth, validatedEmail);
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

const voiceFirstStorageKey = (uid) => `uniableVoiceFirst:${uid}`;

/** Read the signed-in user's voice-first navigation preference. */
export async function getVoiceFirstPreference(user = auth?.currentUser) {
  const isVoiceFirstProfile = (profile, accessibility) => {
    const value = String(accessibility || "").toLowerCase();
    return profile?.id === "visual" ||
      value.includes("visual") ||
      value.includes("blind") ||
      value.includes("low vision") ||
      value.includes("colour") ||
      value.includes("color");
  };

  // A visual profile enables spoken navigation by default. Only a
  // deliberate change made through the preference toggle can override that default.
  if (user && db) {
    try {
      const snapshot = await getDoc(doc(db, "users", user.uid));
      if (snapshot.exists()) {
        const data = snapshot.data();
        const blindProfile = isVoiceFirstProfile(data.accessibilityProfile, data.accessibility);
        const explicitlySet = data.voiceFirstManuallySet === true;

        if (blindProfile && !explicitlySet) {
          try {
            localStorage.setItem(voiceFirstStorageKey(user.uid), "true");
            localStorage.setItem(`uniableVoiceFirstManual:${user.uid}`, "false");
          } catch { /* Best-effort browser operation; continue without optional state. */ }
          return true;
        }

        if (typeof data.voiceFirstEnabled === "boolean") {
          try {
            localStorage.setItem(voiceFirstStorageKey(user.uid), String(data.voiceFirstEnabled));
            if (explicitlySet) localStorage.setItem(`uniableVoiceFirstManual:${user.uid}`, "true");
          } catch { /* Best-effort browser operation; continue without optional state. */ }
          return data.voiceFirstEnabled;
        }
      }
    } catch (error) {
      console.warn("Could not load voice-first preference from Firebase:", error);
    }
  }

  try {
    if (user) {
      const accessibility = String(localStorage.getItem(`uniableAccessibility:${user.uid}`) || "");
      let profile = null;
      try { profile = JSON.parse(localStorage.getItem("uniableAccessibilityProfile") || "null"); } catch { /* Best-effort browser operation; continue without optional state. */ }
      const manual = localStorage.getItem(`uniableVoiceFirstManual:${user.uid}`) === "true";
      const cached = localStorage.getItem(voiceFirstStorageKey(user.uid));

      if (isVoiceFirstProfile(profile, accessibility) && !manual) return true;
      if (cached === "true" || cached === "false") return cached === "true";
      return isVoiceFirstProfile(profile, accessibility);
    }

    let profile = null;
    try { profile = JSON.parse(localStorage.getItem("uniableAccessibilityProfile") || "null"); } catch { /* Best-effort browser operation; continue without optional state. */ }
    const manual = localStorage.getItem("uniableVoiceFirstManual") === "true";
    if (isVoiceFirstProfile(profile, "") && !manual) return true;
    return localStorage.getItem("uniableVoiceFirstEnabled") === "true";
  } catch {
    return false;
  }
}

/** Save voice-first preference to this user's own profile, not a shared device-wide key. */
export async function setVoiceFirstPreference(enabled, user = auth?.currentUser) {
  const value = Boolean(enabled);
  try {
    if (user) {
      localStorage.setItem(voiceFirstStorageKey(user.uid), String(value));
      localStorage.setItem(`uniableVoiceFirstManual:${user.uid}`, "true");
    } else {
      localStorage.setItem("uniableVoiceFirstEnabled", String(value));
      localStorage.setItem("uniableVoiceFirstManual", "true");
    }
  } catch (error) {
    console.warn("Could not cache voice-first preference:", error);
  }
  try {
    window.dispatchEvent(new CustomEvent("uniable-voice-first-change", { detail: { enabled: value } }));
  } catch {
    // Preference remains saved even where custom events are unavailable.
  }

  if (user && db) {
    await setDoc(doc(db, "users", user.uid), {
      voiceFirstEnabled: value,
      voiceFirstManuallySet: true,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }
  return value;
}



const UNIABLe_API_BASE = (import.meta.env.VITE_API_BASE_URL || (Capacitor.getPlatform() === "android" ? "http://10.0.2.2:4000" : "http://localhost:4000")).replace(/\/$/, "");

async function verificationApi(path, body) {
  const user = auth?.currentUser;
  if (!user) throw new Error("Please sign in before verifying your account.");
  const token = await user.getIdToken();
  const response = await fetch(`${UNIABLe_API_BASE}/api/auth${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Authorization: `Bearer ${token}`, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || "The verification service is unavailable.");
    error.status = response.status;
    throw error;
  }
  return result;
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

async function ensureAccountVerified(user) {
  const status = await verificationApi("/verification-status");
  if (status.required && !status.verified) {
    const error = new Error("Your account has not been verified yet. Choose Create an account to finish email verification.");
    error.code = "auth/account-not-verified";
    throw error;
  }
  return user;
}
export async function createAccountWithEmailPassword(
  email,
  password,
  displayName,
  accessibility = "None",
  accountType = "student",
  studentProfile = {}
) {
  if (!firebaseConfigured || !auth) {
    throw new Error("Firebase is not configured. Check the frontend environment variables.");
  }

  const studentNumber = String(studentProfile.studentNumber || "").trim();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const expectedEmail = `${studentNumber}@${STUDENT_EMAIL_DOMAIN}`;
  const institutionalEmail = String(studentProfile.institutionalEmail || normalizedEmail).trim().toLowerCase();
  const selectedAccessibility = accessibility?.trim() || ACCESSIBILITY_NONE;

  if (!isValidStudentNumber(studentNumber) || normalizedEmail !== expectedEmail || institutionalEmail !== expectedEmail) {
    throw new Error("Enter a nine-digit student number beginning with 401, 402 or 403 and use its generated Richfield student email.");
  }
  if (!isSupportedAccessibilityCategory(selectedAccessibility)) {
    throw new Error("Choose one of the supported accessibility categories or no accessibility needs.");
  }

  const credential = await createUserWithEmailAndPassword(
    auth,
    normalizedEmail,
    password
  );

  if (displayName?.trim()) {
    await updateProfile(credential.user, {
      displayName: displayName.trim()
    });
  }

  const voiceFirstEnabled = selectedAccessibility === "Visual";

  try {
    localStorage.setItem(`uniableAccessibility:${credential.user.uid}`, selectedAccessibility);
    localStorage.setItem(voiceFirstStorageKey(credential.user.uid), String(voiceFirstEnabled));
  } catch (error) {
    console.warn("Could not save local accessibility preference:", error);
  }

  if (db) {
    try {
      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          institutionalEmail,
          studentNumber,
          surname: String(studentProfile.surname || "").trim(),
          qualification: String(studentProfile.qualification || "").trim(),
          yearOfStudy: String(studentProfile.yearOfStudy || "").trim(),
          dateOfBirth: String(studentProfile.dateOfBirth || "").trim(),
          phoneNumber: String(studentProfile.phoneNumber || "").trim(),
          modules: Array.isArray(studentProfile.modules) ? studentProfile.modules : [],
          displayName: displayName?.trim() || "",
          accountType: accountType?.trim() || "student",
          accessibility: selectedAccessibility,
          voiceFirstEnabled,
          voiceFirstManuallySet: false,
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (error) {
      console.warn("Could not save accessibility profile to Firestore:", error);
    }
  }

  return credential.user;
}


export async function saveUserAccessibilityProfile(profile) {
  const user = requireAuth();

  const profileId = String(profile?.id || ACCESSIBILITY_NONE.toLowerCase()).toLowerCase();
  const selectedProfile = ACCESSIBILITY_PROFILES.find(({ id }) => id === profileId);
  if (!selectedProfile && profileId !== ACCESSIBILITY_NONE.toLowerCase()) {
    throw new Error("Choose one of the supported accessibility categories or no accessibility needs.");
  }
  const accessibility = selectedProfile?.value || ACCESSIBILITY_NONE;
  const accessibilityProfile = {
    id: selectedProfile?.id || ACCESSIBILITY_NONE.toLowerCase(),
    title: accessibility,
    description: String(profile?.description || ""),
  };
  const serializedProfile = JSON.stringify(accessibilityProfile);
  const autoEnableVoiceFirst = accessibility === "Visual";

  try {
    localStorage.setItem("uniableAccessibilityProfile", serializedProfile);
    localStorage.setItem(
      `uniableAccessibility:${user.uid}`,
      accessibility
    );
  } catch (error) {
    console.warn("Could not cache the accessibility profile locally:", error);
  }

  if (!db) {
    throw new Error(
      "Your selection is saved on this device, but Firebase Firestore is not configured."
    );
  }

  try {
    const existingSnapshot = await getDoc(doc(db, "users", user.uid));
    const existingData = existingSnapshot.exists() ? existingSnapshot.data() : {};
    const shouldAutoEnableVoiceFirst = autoEnableVoiceFirst && existingData.voiceFirstManuallySet !== true;
    await setDoc(
      doc(db, "users", user.uid),
      {
        displayName: user.displayName || "",
        accessibility,
        accessibilityProfile,
        ...(shouldAutoEnableVoiceFirst ? { voiceFirstEnabled: true, voiceFirstManuallySet: false } : {}),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    if (shouldAutoEnableVoiceFirst) {
      try {
        localStorage.setItem(voiceFirstStorageKey(user.uid), "true");
        localStorage.setItem(`uniableVoiceFirstManual:${user.uid}`, "false");
      } catch { /* Best-effort browser operation; continue without optional state. */ }
      try {
        window.dispatchEvent(new CustomEvent("uniable-voice-first-change", { detail: { enabled: true } }));
      } catch { /* Best-effort browser operation; continue without optional state. */ }
    }
  } catch (error) {
    console.error("Could not sync the accessibility profile to Firebase:", error);
    throw new Error(
      "Your selection is saved on this device, but Firebase could not sync it. Check your Firestore rules and connection."
    );
  }

  return { accessibility, accessibilityProfile };
}
export async function getUserAccessibilityProfile(user = auth?.currentUser) {
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
            // Continue using the Firestore profile if local storage is unavailable.
          }
        }

        const accessibility = normalizeAccessibilityCategory(profile.accessibility);
        const profileOption = ACCESSIBILITY_PROFILES.find(({ value }) => value === accessibility);
        return {
          ...profile,
          accessibility,
          accessibilityProfile: profileOption
            ? {
                ...profile.accessibilityProfile,
                id: profileOption.id,
                title: profileOption.value,
              }
            : {
                ...profile.accessibilityProfile,
                id: ACCESSIBILITY_NONE.toLowerCase(),
                title: ACCESSIBILITY_NONE,
              },
        };
      }
    } catch (error) {
      console.warn("Could not read the Firestore accessibility profile:", error);
    }
  }

  try {
    const accessibility = localStorage.getItem(
      `uniableAccessibility:${user.uid}`
    );
    return accessibility
      ? { accessibility: normalizeAccessibilityCategory(accessibility) }
      : null;
  } catch {
    return null;
  }
}
export async function signInWithEmailPassword(email, password) {
  if (!firebaseConfigured || !auth) {
    throw new Error("Firebase is not configured. Check the frontend environment variables.");
  }

  const normalizedEmail = validateInstitutionalStudentEmail(email);
  const credential = await signInWithEmailAndPassword(
    auth,
    normalizedEmail,
    password
  );

  return ensureAccountVerified(credential.user);
}
export async function sendPasswordlessSignInLink(email) {
  if (!firebaseConfigured || !auth) {
    throw new Error("Firebase is not configured. Check the frontend environment variables.");
  }

  const normalizedEmail = validateInstitutionalStudentEmail(email);
  if (!normalizedEmail) {
    throw new Error("Enter your email address first.");
  }

  const actionCodeSettings = {
    url: `${window.location.origin}/login`,
    handleCodeInApp: true,
  };

  await sendSignInLinkToEmail(auth, normalizedEmail, actionCodeSettings);

  // Session-only storage; never store a password here.
  try {
    window.sessionStorage.setItem(
      "uniableEmailForSignIn",
      normalizedEmail
    );
  } catch {
    // The user can enter their email again after opening the link.
  }
}

export function isPasswordlessSignInLink(link = window.location.href) {
  return Boolean(auth && isSignInWithEmailLink(auth, link));
}

export async function completePasswordlessSignIn(email, link = window.location.href) {
  if (!firebaseConfigured || !auth) {
    throw new Error("Firebase is not configured. Check the frontend environment variables.");
  }

  if (!isSignInWithEmailLink(auth, link)) {
    throw new Error("This is not a valid UniAble sign-in link. Request a new link.");
  }

  const normalizedEmail = validateInstitutionalStudentEmail(email);
  if (!normalizedEmail) {
    throw new Error("Enter the email address that received the sign-in link.");
  }

  const credential = await signInWithEmailLink(auth, normalizedEmail, link);

  try {
    window.sessionStorage.removeItem("uniableEmailForSignIn");
  } catch {
    // Authentication has succeeded; storage cleanup is optional.
  }

  return ensureAccountVerified(credential.user);
}
export { auth };


// Accessibility applications contain special personal information. The Firestore
// and Storage security rules must restrict access to the student and Disability Office.
const ACCESSIBILITY_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;
const ACCESSIBILITY_UPLOAD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
]);

function safeUploadName(name) {
  return String(name || "document")
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100) || "document";
}

function requireFirestore() {
  requireAuth();
  if (!db) throw new Error("Firebase Firestore is not configured.");
}

function requireFirestoreAndStorage() {
  requireFirestore();
  if (!storage) throw new Error("Firebase Storage is not configured before submitting documents.");
}

export async function submitAccessibilityApplication({ category, description, accommodations = [], files = [] }) {
  const user = requireAuth();
  requireFirestoreAndStorage();
  const role = await getCurrentUserRole(user);
  if (role !== "student") throw new Error("Only student accounts can submit accessibility applications.");
  if (!ACCESSIBILITY_CATEGORIES.includes(String(category || "").trim())) {
    throw new Error("Choose one of the supported accessibility categories.");
  }
  if (!description || String(description).trim().length < 10) {
    throw new Error("Please describe the support you need using at least 10 characters.");
  }
  if (!Array.isArray(files) || files.length === 0) {
    throw new Error("Attach at least one supporting document.");
  }

  for (const file of files) {
    if (!ACCESSIBILITY_UPLOAD_TYPES.has(file.type)) {
      throw new Error(`${file.name} is not supported. Upload a PDF, JPG or PNG file.`);
    }
    if (file.size > ACCESSIBILITY_UPLOAD_MAX_BYTES) {
      throw new Error(`${file.name} is larger than 10 MB.`);
    }
  }

  const applicationId = crypto.randomUUID();
  const documents = [];
  for (const file of files) {
    const documentId = crypto.randomUUID();
    const storagePath = `accessibilityApplications/${user.uid}/${applicationId}/${documentId}-${safeUploadName(file.name)}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file, { contentType: file.type });
    documents.push({
      id: documentId,
      name: file.name,
      contentType: file.type,
      size: file.size,
      storagePath,
      uploadedAt: new Date().toISOString(),
    });
  }

  const application = {
    id: applicationId,
    studentUid: user.uid,
    studentName: user.displayName || user.email || "Student",
    studentEmail: user.email || "",
    category: normalizeAccessibilityCategory(category),
    description: String(description).trim(),
    requestedAccommodations: Array.isArray(accommodations) ? accommodations : [],
    accommodations: [],
    documents,
    status: "pending",
    decisionNote: null,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await setDoc(doc(db, "registrations", applicationId), application);
  return application;
}

export async function getMyAccessibilityApplications(user = auth?.currentUser) {
  if (!user) throw new Error("Please sign in to view your applications.");
  requireFirestore();
  const snapshot = await getDocs(query(
    collection(db, "registrations"),
    where("studentUid", "==", user.uid)
  ));
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
    category: normalizeAccessibilityCategory(item.data().category),
  }))
    .sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
}

export async function getAccessibilityApplications() {
  const user = requireAuth();
  requireFirestore();
  if (await getCurrentUserRole(user) !== "disability_office") {
    throw new Error("Only the Disability Office can review accessibility applications.");
  }
  const snapshot = await getDocs(collection(db, "registrations"));
  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
    category: normalizeAccessibilityCategory(item.data().category),
  }))
    .sort((a, b) => String(b.submittedAt || "").localeCompare(String(a.submittedAt || "")));
}

export async function getAccessibilityDocumentUrl(applicationId, storagePath) {
  const user = requireAuth();
  requireFirestoreAndStorage();
  const snapshot = await getDoc(doc(db, "registrations", applicationId));
  if (!snapshot.exists()) throw new Error("The accessibility application could not be found.");
  const application = snapshot.data();
  const role = await getCurrentUserRole(user);
  if (role !== "disability_office" && application.studentUid !== user.uid) {
    throw new Error("You are not permitted to open this supporting document.");
  }
  const documentRecord = (application.documents || []).find((item) => item.storagePath === storagePath);
  if (!documentRecord) throw new Error("The document does not belong to this application.");
  if (role === "disability_office") {
    await updateDoc(doc(db, "registrations", applicationId), {
      documentViewLog: arrayUnion({ documentId: documentRecord.id, viewedBy: user.uid, viewedAt: new Date().toISOString() }),
    });
  }
  return getDownloadURL(ref(storage, storagePath));
}

export async function reviewAccessibilityApplication(applicationId, { decision, note = "", accommodations = [] }) {
  const user = requireAuth();
  requireFirestore();
  if (await getCurrentUserRole(user) !== "disability_office") {
    throw new Error("Only the Disability Office can make application decisions.");
  }
  if (!["approved", "needs_info", "rejected"].includes(decision)) {
    throw new Error("Choose a valid application decision.");
  }
  if (["needs_info", "rejected"].includes(decision) && String(note).trim().length < 5) {
    throw new Error("Add a note of at least five characters for this decision.");
  }
  const applicationRef = doc(db, "registrations", applicationId);
  const existing = await getDoc(applicationRef);
  if (!existing.exists()) throw new Error("This application no longer exists.");
  if (existing.data().status !== "pending" && existing.data().status !== "needs_info") {
    throw new Error("This application has already been reviewed.");
  }
  await updateDoc(applicationRef, {
    status: decision,
    decisionNote: String(note).trim() || null,
    accommodations: decision === "approved" ? accommodations : [],
    reviewedBy: user.uid,
    reviewedAt: new Date().toISOString(),
    reviewHistory: arrayUnion({ decision, note: String(note).trim() || null, reviewerUid: user.uid, reviewedAt: new Date().toISOString() }),
    updatedAt: new Date().toISOString(),
  });
  return { ok: true };
}

// Admin workspace reads only the metadata collections permitted by the role rules.
// Role changes, approvals and audit writes must be performed by trusted server functions.
export async function getAdminWorkspaceData() {
  const user = requireAuth();
  requireFirestore();
  if (await getCurrentUserRole(user) !== "admin") {
    throw new Error("Administrator access is required.");
  }
  const [usersSnapshot, approvalsSnapshot, configSnapshot, auditSnapshot] = await Promise.all([
    getDocs(collection(db, "users")),
    getDocs(collection(db, "approvals")),
    getDocs(collection(db, "adminConfig")),
    getDocs(collection(db, "auditLog")),
  ]);
  const rows = (snapshot) => snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  return {
    users: rows(usersSnapshot),
    approvals: rows(approvalsSnapshot),
    config: rows(configSnapshot),
    audit: rows(auditSnapshot).sort((a, b) => String(b.createdAt || b.timestamp || "").localeCompare(String(a.createdAt || a.timestamp || ""))),
  };
}
