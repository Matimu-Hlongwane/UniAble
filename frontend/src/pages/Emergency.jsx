import React, { useState } from "react";
import CampusSecurityCall from "../components/CampusSecurityCall";
import { api } from "../services/api";
import { getCurrentUser } from "../services/firebaseAuth";
import { MapPin, Phone, ShieldAlert, Users } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";

export default function Emergency() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [delivery, setDelivery] = useState(null);
  const { t } = useSettings();

  async function sendSOS() {
    if (sending || sent) return;
    setError("");
    setSending(true);
    try {
      const user = getCurrentUser();
      if (!user) throw new Error("Please sign in before requesting emergency assistance.");

      const location = await new Promise((resolve) => {
        if (!navigator.geolocation) return resolve(null);
        navigator.geolocation.getCurrentPosition(
          (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
        );
      });

      const result = await api.createSOS({ studentId: user.uid, location, source: "student-dashboard" });
      setDelivery(result.delivery || result.alert?.notificationDelivery || null);
      setSent(true);
    } catch (err) {
      console.error("UniAble SOS request failed:", err);
      setError(err?.message || t("connectionProblem"));
    } finally {
      setSending(false);
    }
  }

  const acceptedCount = Number(delivery?.sent || 0);
  const deliveryMessage = acceptedCount > 0
    ? `UniAble submitted push notifications to Firebase Cloud Messaging for ${acceptedCount} responder device(s). This does not confirm that a person has seen or acknowledged the alert.`
    : "Your SOS has been recorded, but no responder device confirmed notification submission. Contact campus security directly if you need immediate help.";

  return (
    <section className="page narrow">
      <CampusSecurityCall />
      <p className="eyebrow">{t("emergencyResponse")}</p>
      <h1>{t("emergencySos")}</h1>
      <p className="muted">{t("emergencyDescription")}</p>
      <div className="sos-card">
        <ShieldAlert size={48} />
        <h2>{sent ? t("sosSent") : t("helpImmediate")}</h2>
        <p>{sent ? deliveryMessage : t("genuineEmergency")}</p>
        {sent && delivery && (
          <p className="muted" role="status">
            Notification status: {String(delivery.status || "unknown").replaceAll("_", " ")} · {acceptedCount} accepted · {Number(delivery.failed || 0)} failed
          </p>
        )}
        {error && <p className="muted" role="alert">{error}</p>}
        <button className="sos-button" onClick={sendSOS} disabled={sent || sending} type="button">
          {sending ? "Sending SOS…" : sent ? t("helpRequested") : t("sendEmergency")}
        </button>
        <div className="sos-details">
          <span><MapPin size={17} /> {t("lastLocation")}</span>
          <span><Users size={17} /> Security staff and available, registered volunteers are targeted</span>
          <span><Phone size={17} /> Contact campus security directly for immediate assistance</span>
        </div>
      </div>
    </section>
  );
}
