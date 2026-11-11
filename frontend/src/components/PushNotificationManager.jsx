import { useEffect, useState } from "react";
import { subscribeToAuth, getCurrentUserRole } from "../services/firebaseAuth";
import { registerResponderPushNotifications } from "../services/pushNotifications";

export default function PushNotificationManager() {
  const [incomingAlert, setIncomingAlert] = useState(null);

  useEffect(() => {
    let activeUid = null;
    let cleanupRegistration = null;
    let cancelled = false;

    const unsubscribeAuth = subscribeToAuth(async (user) => {
      if (!user) {
        activeUid = null;
        if (cleanupRegistration) cleanupRegistration();
        cleanupRegistration = null;
        return;
      }
      if (activeUid === user.uid) return;

      activeUid = user.uid;
      if (cleanupRegistration) cleanupRegistration();
      cleanupRegistration = null;

      try {
        const role = await getCurrentUserRole(user);
        if (cancelled || activeUid !== user.uid) return;
        if (!["security", "volunteer"].includes(role)) return;
        const result = await registerResponderPushNotifications(role);
        if (cancelled || activeUid !== user.uid) {
          result.cleanup?.();
          return;
        }
        cleanupRegistration = result.cleanup || null;
        if (!result.enabled) {
          console.info(`UniAble responder push notifications are not enabled: ${result.reason || "unknown"}`);
        }
      } catch (error) {
        console.error("UniAble responder notification setup failed:", error);
      }
    });

    return () => {
      cancelled = true;
      unsubscribeAuth();
      if (cleanupRegistration) cleanupRegistration();
    };
  }, []);

  useEffect(() => {
    function handleIncomingPush(event) {
      const payload = event.detail || {};
      const notification = payload.notification || payload;
      setIncomingAlert({
        title: notification.title || "UniAble emergency SOS",
        body: notification.body || "A student needs emergency assistance.",
        route: payload.data?.route || payload.data?.url || "/role/security?tab=emergency",
      });
    }
    window.addEventListener("uniable-push-notification", handleIncomingPush);
    return () => window.removeEventListener("uniable-push-notification", handleIncomingPush);
  }, []);

  if (!incomingAlert) return null;

  return (
    <aside
      role="alert"
      aria-live="assertive"
      style={{
        position: "fixed",
        zIndex: 10000,
        top: "1rem",
        left: "1rem",
        right: "1rem",
        maxWidth: "34rem",
        margin: "0 auto",
        padding: "1rem",
        border: "2px solid #b42318",
        borderRadius: "0.75rem",
        background: "#fff",
        color: "#1b1b1b",
        boxShadow: "0 8px 28px rgba(0,0,0,.24)",
      }}
    >
      <strong>{incomingAlert.title}</strong>
      <p style={{ margin: "0.5rem 0 0.75rem" }}>{incomingAlert.body}</p>
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        <button type="button" onClick={() => window.location.assign(incomingAlert.route)}>
          View emergency alert
        </button>
        <button type="button" onClick={() => setIncomingAlert(null)}>
          Dismiss
        </button>
      </div>
    </aside>
  );
}
