import React, { useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, MapPin, Navigation, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/settingsContext/SettingsContext";
import { speak } from "../services/speechService";

const classes = [
  { id: 1, time: "09:00", end: "10:00", name: "Data Structures", room: "Room 101", building: "Main Building", status: "upcoming" },
  { id: 2, time: "11:00", end: "12:00", name: "Mathematics Tutorial", room: "Room 204", building: "Science Building", status: "upcoming" },
  { id: 3, time: "14:00", end: "16:00", name: "Computer Lab", room: "Lab 3", building: "Technology Building", status: "upcoming" },
];

export default function Schedule() {
  const { t, locale } = useSettings();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(classes[0]);
  const [speechStatus, setSpeechStatus] = useState("");

  async function readSchedule() {
    const text = classes
      .map((item) => `${item.time} to ${item.end}: ${item.name}, ${item.room}, ${item.building}`)
      .join(". ");

    try {
      const result = await speak(text, { locale: locale || "en-ZA" });
      setSpeechStatus(
        result.started
          ? "Reading today’s schedule aloud."
          : "Speech is unavailable on this device. The schedule remains available on screen."
      );
    } catch (error) {
      console.error("Could not read the schedule aloud:", error);
      setSpeechStatus("Could not start speech. Use your screen reader or the schedule shown on screen.");
    }
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("schedule")}</p>
          <h1>{t("mySchedule")}</h1>
          <p className="muted">{t("scheduleDescription")}</p>
        </div>
        <div>
          <span className="profile-saved"><CalendarDays size={16} /> {classes.length} {t("classesToday")}</span>
          <button type="button" className="secondary-btn" onClick={readSchedule}>
            <Volume2 size={17} aria-hidden="true" /> Read schedule aloud
          </button>
        </div>
      </div>
      {speechStatus && <p role="status" aria-live="polite">{speechStatus}</p>}

      <div className="schedule-layout">
        <div className="panel">
          <div className="panel-title">
            <h2>{t("todaysClasses")}</h2>
          </div>

          <div className="schedule-list">
            {classes.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`schedule-item ${selected.id === item.id ? "selected" : ""}`}
                onClick={() => setSelected(item)}
              >
                <span className="schedule-time"><Clock3 size={15} /> {item.time}</span>
                <span className="schedule-main">
                  <strong>{item.name}</strong>
                  <small>{item.room} · {item.building}</small>
                </span>
                <CheckCircle2 size={18} />
              </button>
            ))}
          </div>
        </div>

        <div className="panel schedule-detail">
          <span className="eyebrow">{t("selectedClass")}</span>
          <h2>{selected.name}</h2>
          <p className="muted">{selected.time}–{selected.end}</p>

          <div className="detail-row"><MapPin size={18} /><span>{selected.room}, {selected.building}</span></div>
          <div className="detail-row"><AccessibilityIcon /><span>{t("accessibleRoom")}</span></div>

          <button className="primary-btn" type="button" onClick={() => navigate("/campus")}>
            <Navigation size={17} /> {t("navigateToClass")}
          </button>
        </div>
      </div>
    </section>
  );
}

function AccessibilityIcon() {
  return <span aria-hidden="true" className="inline-accessibility-mark">A</span>;
}
