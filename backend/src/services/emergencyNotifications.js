import crypto from "node:crypto";
import { getAdminDb, getAdminMessaging } from "./firebase.js";

const MAX_MULTICAST_TOKENS = 500;

function tokenDocumentId(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

async function getResponderTargets() {
  const db = getAdminDb();
  const [securityUsers, volunteerUsers] = await Promise.all([
    db.collection("users").where("role", "==", "security").get(),
    db.collection("users").where("role", "==", "volunteer").get(),
  ]);

  const targets = [];
  for (const userDoc of securityUsers.docs) {
    const profile = userDoc.data() || {};
    if (profile.isActive === false || profile.accessStatus === "disabled") continue;
    targets.push({ uid: userDoc.id, role: "security" });
  }

  for (const userDoc of volunteerUsers.docs) {
    const profile = userDoc.data() || {};
    if (profile.isActive === false || profile.accessStatus === "disabled") continue;

    // Volunteer availability is maintained in the existing volunteers/{uid} record.
    const volunteerDoc = await db.collection("volunteers").doc(userDoc.id).get();
    if (!volunteerDoc.exists || volunteerDoc.data()?.available !== true) continue;
    targets.push({ uid: userDoc.id, role: "volunteer" });
  }

  return targets;
}

async function readResponderTokens(targets) {
  const db = getAdminDb();
  const tokenRecords = await Promise.all(targets.map(async (target) => {
    const snapshot = await db.collection("users").doc(target.uid)
      .collection("pushDevices").get();
    return snapshot.docs.map((doc) => ({
      uid: target.uid,
      role: target.role,
      ref: doc.ref,
      token: doc.data()?.token,
    })).filter((item) => typeof item.token === "string" && item.token.length > 20);
  }));
  return tokenRecords.flat();
}

export async function sendEmergencyNotifications({ alertId, alert, studentProfile = {} }) {
  const targets = await getResponderTargets();
  const tokenRecords = await readResponderTokens(targets);
  const uniqueTokens = new Map();
  for (const record of tokenRecords) {
    if (!uniqueTokens.has(record.token)) uniqueTokens.set(record.token, record);
  }

  const recordsByRole = new Map();
  for (const record of uniqueTokens.values()) {
    if (!recordsByRole.has(record.role)) recordsByRole.set(record.role, []);
    recordsByRole.get(record.role).push(record);
  }
  const tokens = [...uniqueTokens.keys()];
  const baseResult = {
    status: "no_registered_devices",
    targetUsers: targets.length,
    targetRoles: [...new Set(targets.map((item) => item.role))],
    registeredDevices: tokens.length,
    sent: 0,
    failed: 0,
    attemptedAt: new Date().toISOString(),
  };

  if (!tokens.length) return baseResult;

  const studentName = String(
    studentProfile.displayName || studentProfile.name || studentProfile.studentName || "A UniAble student"
  ).slice(0, 100);
  const locationText = alert.location
    ? `${alert.location.lat}, ${alert.location.lng}`
    : "Location unavailable";

  let sent = 0;
  let failed = 0;
  const invalidTokenRefs = [];
  const dispatchErrors = [];

  for (const [role, records] of recordsByRole.entries()) {
    const roleRoute = role === "volunteer" ? "/role/volunteer?tab=emergency" : "/role/security?tab=emergency";
    const roleTokens = records.map((record) => record.token);
    for (let offset = 0; offset < roleTokens.length; offset += MAX_MULTICAST_TOKENS) {
      const chunk = roleTokens.slice(offset, offset + MAX_MULTICAST_TOKENS);
      let response;
      try {
        response = await getAdminMessaging().sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: "UniAble emergency SOS",
          body: `${studentName} needs assistance. Location: ${locationText}`,
        },
        data: {
          type: "emergency_sos",
          alertId: String(alertId),
          studentId: String(alert.studentId),
          latitude: alert.location ? String(alert.location.lat) : "",
          longitude: alert.location ? String(alert.location.lng) : "",
          status: String(alert.status || "active"),
          route: `${roleRoute}&alertId=${encodeURIComponent(alertId)}`,
        },
        android: {
          priority: "high",
          notification: { channelId: "uniable-emergency", priority: "max", sound: "default" },
        },
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { sound: "default", category: "EMERGENCY" } },
        },
        webpush: {
          headers: { Urgency: "high" },
          notification: {
            title: "UniAble emergency SOS",
            body: `${studentName} needs assistance. ${locationText}`,
            icon: "/icons/icon-192.png",
            tag: `uniable-sos-${alertId}`,
            requireInteraction: true,
            data: { url: `${roleRoute}&alertId=${encodeURIComponent(alertId)}` },
          },
        },
        });
      } catch (error) {
        failed += chunk.length;
        dispatchErrors.push(String(error.message || "FCM dispatch failed").slice(0, 240));
        continue;
      }

      sent += response.successCount;
      failed += response.failureCount;
      response.responses.forEach((item, index) => {
        const code = item.error?.code || "";
        if (code.includes("registration-token-not-registered") || code.includes("invalid-registration-token")) {
          const record = records.find((candidate) => candidate.token === chunk[index]);
          if (record) invalidTokenRefs.push(record.ref);
        }
      });
    }
  }

  if (invalidTokenRefs.length) {
    await Promise.all(invalidTokenRefs.map((ref) => ref.delete().catch(() => null)));
  }

  return {
    ...baseResult,
    status: sent > 0 && failed === 0 ? "sent" : sent > 0 ? "partial" : "failed",
    sent,
    failed,
    invalidTokensRemoved: invalidTokenRefs.length,
    ...(dispatchErrors.length ? { errors: dispatchErrors.slice(0, 3) } : {}),
  };
}

export function hashPushToken(token) {
  return tokenDocumentId(token);
}
