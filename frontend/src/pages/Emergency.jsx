import React, { useState } from "react";
import { api } from "../services/api";
import { MapPin, Phone, ShieldAlert, Users } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";

export default function Emergency() {
  const [sent, setSent] = useState(false);
  const { t } = useSettings();

  async function sendSOS() {
    try {
      await api.createSOS({ studentId:"student-001", location:{lat:-26.2,lng:28.04}, source:"button" });
    } catch {}
    setSent(true);
  }

  return (
    <section className="page narrow">
      <p className="eyebrow">{t("emergencyResponse")}</p>
      <h1>{t("emergencySos")}</h1>
      <p className="muted">{t("emergencyDescription")}</p>
      <div className="sos-card">
        <ShieldAlert size={48}/>
        <h2>{sent ? t("sosSent") : t("helpImmediate")}</h2>
        <p>{sent ? t("securityNotified") : t("genuineEmergency")}</p>
        <button className="sos-button" onClick={sendSOS} disabled={sent} type="button">
          {sent ? t("helpRequested") : t("sendEmergency")}
        </button>
        <div className="sos-details">
          <span><MapPin size={17}/> {t("lastLocation")}</span>
          <span><Users size={17}/> {t("volunteersNotified")}</span>
          <span><Phone size={17}/> {t("securityNotifiedShort")}</span>
        </div>
      </div>
    </section>
  );
}
