/*
Production Firebase setup:
1. Create a Firebase project.
2. Enable Authentication, Firestore, Storage and Cloud Messaging.
3. Store credentials in environment variables.
4. Never commit service-account JSON or private keys.
This prototype intentionally uses an in-memory store until the team configures Firebase.
*/
export function firebaseStatus() {
  return {
    configured: Boolean(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY)
  };
}
