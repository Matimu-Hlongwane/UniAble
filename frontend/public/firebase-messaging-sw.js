/* Firebase Cloud Messaging background worker for UniAble web clients. */
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.1.0/firebase-messaging-compat.js");

const config = Object.fromEntries(new URLSearchParams(self.location.search).entries());
if (config.apiKey && config.projectId && config.messagingSenderId && config.appId) {
  firebase.initializeApp(config);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    const notification = payload.notification || {};
    const alertId = payload.data?.alertId || "";
    const url = payload.data?.route || (alertId
      ? `/role/security?tab=emergency&alertId=${encodeURIComponent(alertId)}`
      : "/role/security?tab=emergency");

    self.registration.showNotification(notification.title || "UniAble emergency SOS", {
      body: notification.body || "A student needs emergency assistance.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: alertId ? `uniable-sos-${alertId}` : "uniable-emergency",
      requireInteraction: true,
      data: { url },
    });
  });
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/role/security", self.location.origin).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(target);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
