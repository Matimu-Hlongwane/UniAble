import React, { useState } from "react";

import CampusSecurityCall from "../components/CampusSecurityCall";
import { api } from "../services/api";

import { MapPin, ShieldAlert } from "lucide-react";

import { useSettings } from "../context/settingsContext/SettingsContext";


export default function Emergency() {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [locationShared, setLocationShared] = useState(false);
  const [error, setError] = useState("");
  const { t } = useSettings();

  function getCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return Promise.resolve(null);
    }

    return new Promise((resolve) => {
      let completed = false;
      const finish = (location) => {
        if (completed) return;
        completed = true;
        window.clearTimeout(timeoutId);
        resolve(location);
      };
      const timeoutId = window.setTimeout(() => finish(null), 4000);

      try {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => finish({ lat: coords.latitude, lng: coords.longitude }),
          () => finish(null),
          { enableHighAccuracy: false, maximumAge: 60000, timeout: 3500 }
        );
      } catch {
        finish(null);
      }
    });
  }

  async function sendSOS() {
    setError("");
    setSending(true);
    try {
      const location = await getCurrentLocation();
      await api.createSOS({ location, source: "button" });
      setLocationShared(Boolean(location));
      setSent(true);
    } catch (err) {
      console.error("UniAble SOS request failed:", err);
      setError(err?.message || t("connectionProblem"));
    } finally {
      setSending(false);
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
        <p>{sent ? t("sosRecordedNotice") : t("genuineEmergency")}</p>
        {error && <p className="muted" role="alert">{error}</p>}
        <button className="sos-button" onClick={sendSOS} disabled={sent || sending} type="button">
          {sending ? t("connecting") : sent ? t("sosSent") : t("sendEmergency")}
        </button>
        <div className="sos-details">
          <span>
            <MapPin size={17}/>
            {sent
              ? locationShared ? t("sosLocationShared") : t("sosLocationUnavailable")
              : t("sosLocationWillBeRequested")}
          </span>
        </div>
      </div>
    </section>
  );
}
