import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, ShieldAlert, MessageCircle } from "lucide-react";
import VoiceCommandButton from "../components/VoiceCommandButton";
import { useSettings } from "../context/settingsContext/SettingsContext";

const classes = [
  ["09:00", "Data Structures", "Room 101"],
  ["11:00", "Mathematics Tutorial", "Room 204"],
  ["14:00", "Computer Lab", "Lab 3"],
];

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { t, locale } = useSettings();

  const handleVoiceCommand = useCallback((spokenText) => {
    const command = spokenText.toLowerCase().trim();
    if (!command) return;

    const matches = (...phrases) =>
      phrases.some((phrase) => phrase && command.includes(String(phrase).toLowerCase()));

    if (matches("emergency", "sos", "help me", t("emergency"))) {
      navigate("/emergency");
      return;
    }

    if (matches("navigate", "campus", "map", t("navigateCampus"))) {
      navigate("/campus");
      return;
    }

    if (matches("schedule", "timetable", "classes", "my schedule", t("mySchedule"))) {
      navigate("/schedule");
      return;
    }

    if (matches("peer assistance", "peer help", "peer support", "get peer help", t("peerAssistance"), t("getPeerHelp"))) {
      navigate("/peer-assistance");
      return;
    }

    if (matches("accessibility", "access", t("accessibility"))) {
      navigate("/accessibility");
      return;
    }

    if (matches("setting", t("settings"))) {
      navigate("/settings");
      return;
    }

    if (matches("home", "dashboard", t("home"))) {
      navigate("/dashboard");
      return;
    }
  }, [navigate, t]);

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p>
            {new Date().toLocaleDateString(locale || "en-ZA", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1>{t("goodMorning")}</h1>
          <p className="muted">{t("assistQuestion")}</p>
        </div>
      </div>

      <div className="hero-card">
        <div>
          <span className="status-dot">{t("listeningReady")}</span>
          <h2>{t("heyUniAble")}</h2>
          <p>{t("voiceHelp")}</p>
        </div>
        <VoiceCommandButton onCommand={handleVoiceCommand} />
      </div>

      <div className="quick-grid">
        <button className="quick-card quick-card-button" type="button" onClick={() => navigate("/campus")}>
          <MapPin />
          <strong>{t("navigateCampus")}</strong>
          <span>{t("accessibleRoutes")}</span>
        </button>

        <button className="quick-card quick-card-button" type="button" onClick={() => navigate("/schedule")}>
          <CalendarDays />
          <strong>{t("mySchedule")}</strong>
          <span>{t("threeClassesToday")}</span>
        </button>

        <button className="quick-card quick-card-button" type="button" onClick={() => navigate("/accessibility")}>
          <ShieldAlert />
          <strong>{t("supportOptions")}</strong>
          <span>{t("accessibilityDescriptionShort")}</span>
        </button>

        <button className="quick-card quick-card-button danger" type="button" onClick={() => navigate("/emergency")}>
          <ShieldAlert />
          <strong>{t("emergency")}</strong>
          <span>{t("securityPeers")}</span>
        </button>

        <button className="quick-card quick-card-button unipal-quick-card" type="button" onClick={() => navigate("/unipal")}>
          <MessageCircle />
          <strong>{t("unipal")}</strong>
          <span>{t("unipalMotto")}</span>
        </button>
      </div>

      <div className="section-grid">
        <div className="panel">
          <div className="panel-title">
            <h2>{t("todaysClasses")}</h2>
            <button className="text-btn" type="button" onClick={() => navigate("/schedule")}>
              {t("viewAll")}
            </button>
          </div>

          {classes.map(([time, name, room]) => (
            <button
              className="list-row list-row-button"
              key={time}
              type="button"
              onClick={() => navigate("/schedule")}
              aria-label={`${name}, ${room}`}
            >
              <div className="time">{time}</div>
              <div>
                <strong>{name}</strong>
                <small>{room}</small>
              </div>
              <ArrowRight size={17} />
            </button>
          ))}
        </div>

        <div className="panel">
          <div className="panel-title">
            <h2>{t("recentAnnouncement")}</h2>
          </div>

          <div className="notice">{t("libraryAnnouncement")}</div>

          <div className="access-state">
            <span>{t("screenReader")}</span>
            <strong>{t("on")}</strong>
            <span>{t("highContrast")}</span>
            <strong>{t("on")}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
