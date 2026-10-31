import React, { useState } from "react";

import CampusSecurityCall from "../components/CampusSecurityCall";
import { api } from "../services/api";

import { MapPin, Phone, ShieldAlert, Users } from "lucide-react";

import { useSettings } from "../context/settingsContext/SettingsContext";


export default function Emergency() {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const { t } = useSettings();

  async function sendSOS() {
    setError("");
    try {
      await api.createSOS({ studentId:"student-001", location:{lat:-26.2,lng:28.04}, source:"button" });
      setSent(true);
    } catch (err) {
      console.error("UniAble SOS request failed:", err);
      setError(err?.message || t("connectionProblem"));
    }
  }

  return (
    <section className="page narrow">
      <CampusSecurityCall />
      <p className="eyebrow">{t("emergencyResponse")}</p>
      <h1>{t("emergencySos")}</h1>
      <p className="muted">{t("emergencyDescription")}</p>
      <div className="sos-card">
        <ShieldAlert size={48}/>
        <h2>{sent ? t("sosSent") : t("helpImmediate")}</h2>
        <p>{sent ? t("securityNotified") : t("genuineEmergency")}</p>
        {error && <p className="muted" role="alert">{error}</p>}
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
