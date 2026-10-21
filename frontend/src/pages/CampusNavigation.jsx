import React, { useMemo, useState } from "react";
import { Check, Clock3, MapPin, Navigation, Accessibility, ArrowRight } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";

const destinations = [
  { id: "room101", name: "Room 101", building: "Main Building", time: "4 min", detail: "Step-free entrance via the east ramp." },
  { id: "room204", name: "Room 204", building: "Science Building", time: "7 min", detail: "Use the lift near the main reception." },
  { id: "lab3", name: "Computer Lab 3", building: "Technology Building", time: "9 min", detail: "Accessible entrance and automatic doors." },
  { id: "library", name: "Library", building: "Learning Centre", time: "6 min", detail: "Accessible entrance remains open during building hours." },
];

export default function CampusNavigation() {
  const { t } = useSettings();
  const [selected, setSelected] = useState(destinations[0]);
  const [started, setStarted] = useState(false);

  const routeSteps = useMemo(() => [
    "Start at the Student Centre",
    `Walk toward ${selected.building}`,
    selected.detail,
    `Arrive at ${selected.name}`,
  ], [selected]);

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("campusNavigation")}</p>
          <h1>{t("navigateCampus")}</h1>
          <p className="muted">{t("campusNavigationDescription")}</p>
        </div>
        <span className="profile-saved"><Check size={16} /> {t("locationReady")}</span>
      </div>

      <div className="campus-layout">
        <div className="panel">
          <div className="panel-title">
            <div>
              <h2>{t("chooseDestination")}</h2>
              <p className="muted">{t("accessibleRoutes")}</p>
            </div>
          </div>

          <div className="destination-list">
            {destinations.map((destination) => (
              <button
                key={destination.id}
                type="button"
                className={`destination-card ${selected.id === destination.id ? "selected" : ""}`}
                onClick={() => { setSelected(destination); setStarted(false); }}
              >
                <span className="destination-icon"><MapPin size={19} /></span>
                <span className="destination-copy">
                  <strong>{destination.name}</strong>
                  <small>{destination.building}</small>
                </span>
                <span className="destination-time"><Clock3 size={14} /> {destination.time}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="campus-route-card">
          <div className="route-map-placeholder" aria-label={t("routePreview")}>
            <MapPin size={34} />
            <strong>{selected.name}</strong>
            <span>{selected.building}</span>
          </div>

          <div className="route-summary">
            <div>
              <span className="eyebrow">{t("accessibleRoute")}</span>
              <h2>{selected.name}</h2>
              <p>{selected.detail}</p>
            </div>
            <button className="primary-btn" type="button" onClick={() => setStarted(true)}>
              <Navigation size={17} />
              {started ? t("routeStarted") : t("startRoute")}
            </button>
          </div>

          <div className="route-steps">
            {routeSteps.map((step, index) => (
              <div className="route-step" key={step}>
                <span>{index + 1}</span>
                <p>{step}</p>
                {index < routeSteps.length - 1 && <ArrowRight size={15} />}
              </div>
            ))}
          </div>

          {started && (
            <div className="success-banner" role="status">
              {t("routeStartedMessage")} {selected.name}.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
