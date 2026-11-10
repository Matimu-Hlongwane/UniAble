import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let adminApp: App | null = null;

function getOrInitializeAdminApp(): App {
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

  const existing = getApps()[0];
  adminApp =
    existing ??
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      ...(storageBucket ? { storageBucket } : {}),
    });

  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getOrInitializeAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getOrInitializeAdminApp());
}

export function getAdminMessaging(): Messaging {
  return getMessaging(getOrInitializeAdminApp());
}

export function getAdminStorage() {
  const bucket = getStorage(getOrInitializeAdminApp()).bucket();

  if (!bucket.name) {
    throw new Error("Firebase Storage bucket is not configured.");
  }

  return bucket;
}

export function firebaseStatus(): { configured: boolean; storageConfigured: boolean } {
  return {
    configured: Boolean(
      process.env.FIREBASE_PROJECT_ID &&
        process.env.FIREBASE_CLIENT_EMAIL &&
        process.env.FIREBASE_PRIVATE_KEY
    ),
    storageConfigured: Boolean(process.env.FIREBASE_STORAGE_BUCKET),
  };
}
