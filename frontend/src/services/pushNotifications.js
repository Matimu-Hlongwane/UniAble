import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { getFirebaseApp } from "./firebaseAuth";
import { api } from "./api";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "";

function firebaseWorkerUrl() {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };
  const query = new URLSearchParams(
    Object.entries(config).filter(([, value]) => Boolean(value))
  );
  return `/firebase-messaging-sw.js?${query.toString()}`;
}

async function registerNativeResponderDevice(role) {
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive !== "granted") {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== "granted") {
    return { enabled: false, reason: "permission-denied" };
  }

  const handles = [];
  handles.push(await PushNotifications.addListener("registration", async ({ value }) => {
    try {
      await api.registerPushDevice(value, Capacitor.getPlatform());
      window.dispatchEvent(new CustomEvent("uniable-push-registration", { detail: { role } }));
    } catch (error) {
      console.error("Could not register the UniAble responder device:", error);
    }
  }));
  handles.push(await PushNotifications.addListener("registrationError", (error) => {
    console.error("UniAble push registration failed:", error);
  }));
  handles.push(await PushNotifications.addListener("pushNotificationReceived", (notification) => {
    window.dispatchEvent(new CustomEvent("uniable-push-notification", { detail: notification }));
  }));
  handles.push(await PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
    const alertId = action.notification?.data?.alertId;
    const destination = role === "security" ? "/role/security" : "/role/volunteer";
    window.location.assign(alertId
      ? `${destination}?tab=emergency&alertId=${encodeURIComponent(alertId)}`
      : `${destination}?tab=emergency`);
  }));

  if (Capacitor.getPlatform() === "android") {
    await PushNotifications.createChannel({
      id: "uniable-emergency",
      name: "Emergency alerts",
      description: "Urgent campus emergency notifications",
      importance: 5,
      sound: "default",
      vibration: true,
    });
  }
  await PushNotifications.register();
  return {
    enabled: true,
    cleanup: () => handles.forEach((handle) => handle.remove().catch(() => {})),
  };
}

async function registerWebResponderDevice(role) {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) {
    return { enabled: false, reason: "unsupported" };
  }

  let permission = Notification.permission;
  if (permission === "default") permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { enabled: false, reason: "permission-denied" };
  }
  if (!VAPID_KEY) {
    console.warn("VITE_FIREBASE_VAPID_KEY is not configured; web push registration was skipped.");
    return { enabled: false, reason: "missing-vapid-key" };
  }
  if (!(await isSupported())) return { enabled: false, reason: "unsupported" };

  const serviceWorkerRegistration = await navigator.serviceWorker.register(firebaseWorkerUrl(), {
    scope: "/",
  });
  const app = getFirebaseApp();
  if (!app) throw new Error("Firebase is not configured for push notifications.");
  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration,
  });
  if (!token) return { enabled: false, reason: "token-unavailable" };

  await api.registerPushDevice(token, "web");
  const unsubscribe = onMessage(messaging, (payload) => {
    window.dispatchEvent(new CustomEvent("uniable-push-notification", { detail: payload }));
  });
  return { enabled: true, cleanup: unsubscribe, role };
}

export async function registerResponderPushNotifications(role) {
  if (!["security", "volunteer"].includes(role)) {
    return { enabled: false, reason: "not-a-responder" };
  }
  if (Capacitor.isNativePlatform()) return registerNativeResponderDevice(role);
  return registerWebResponderDevice(role);
}
