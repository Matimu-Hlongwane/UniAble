import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getMessaging } from "firebase-admin/messaging";

let adminApp = null;

function getOrInitializeAdminApp() {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Check the Firebase settings in backend/.env."
    );
  }

  adminApp = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({ projectId, clientEmail, privateKey }),
        ...(storageBucket ? { storageBucket } : {}),
      });

  return adminApp;
}

export function getAdminAuth() {
  return getAuth(getOrInitializeAdminApp());
}

export function getAdminDb() {
  return getFirestore(getOrInitializeAdminApp());
}
export function getAdminMessaging() {
  return getMessaging(getOrInitializeAdminApp());
}

export function getAdminStorage() {
  const bucket = getStorage(getOrInitializeAdminApp()).bucket();

  if (!bucket.name) {
    throw new Error("Firebase Storage bucket is not configured.");
  }

  return bucket;
}

export function firebaseStatus() {
  return {
    configured: Boolean(
      process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
    ),
    storageConfigured: Boolean(process.env.FIREBASE_STORAGE_BUCKET),
  };
}
