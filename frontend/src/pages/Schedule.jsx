import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  MapPin,
  Navigation,
  Volume2,
  Square,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/settingsContext/SettingsContext";
import { api } from "../services/api";
import { speak, stopSpeaking } from "../services/speechService";
import VoiceCommandButton from "../components/VoiceCommandButton";

function localDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getClassDateTime(item) {
  if (!item?.date || !item?.startTime) return null;

  const value = new Date(`${item.date}T${item.startTime}`);
  return Number.isNaN(value.getTime()) ? null : value;
}

function formatDate(value, locale) {
  if (!value) return "Date not available";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat(locale || "en-ZA", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

function formatTime(value) {
  if (!value) return "Time not available";

  const match = String(value).match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;

  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHours = hours % 12 || 12;

  return `${displayHours}:${minutes} ${suffix}`;
}

function sortTimetable(items) {
  return [...items].sort((a, b) => {
    const first = getClassDateTime(a)?.getTime() ?? 0;
    const second = getClassDateTime(b)?.getTime() ?? 0;
    return first - second;
  });
}

export default function Schedule() {
  const { t, locale } = useSettings();
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [speechMessage, setSpeechMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadTimetable() {
      setLoading(true);
      setError("");

      try {
        const result = await api.getAcademicTimetable();
        const rows = Array.isArray(result)
          ? result
          : Array.isArray(result?.timetable)
            ? result.timetable
            : [];

        if (!active) return;

        const sorted = sortTimetable(rows);
        setEntries(sorted);
        setSelectedId(sorted[0]?.id ?? null);
      } catch (err) {
        if (active) {
          setError(err?.message || "Could not load your timetable.");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadTimetable();

    return () => {
      active = false;
      stopSpeaking();
    };
  }, []);

  const today = localDateKey();

  const todayClasses = useMemo(
    () => entries.filter((item) => item.date === today),
    [entries, today]
  );

  const selected = todayClasses.find((item) => item.id === selectedId)
    || todayClasses[0]
    || null;

  const nextClass = useMemo(() => {
    const now = Date.now();

    return entries.find((item) => {
      const start = getClassDateTime(item);
      return start && start.getTime() > now;
    }) || null;
  }, [entries]);

  async function readAloud(message) {
    if (!message) return;

    try {
      setSpeechMessage("Speaking...");
      const result = await speak(message, {
        locale: locale || "en-ZA",
        rate: 0.96,
      });

      if (!result?.started) {
        setSpeechMessage(
          result?.reason || "Speech could not start on this device."
        );
        return;
      }

      setSpeechMessage("Schedule is being read aloud.");
    } catch (err) {
      setSpeechMessage(err?.message || "Could not read the schedule aloud.");
    }
  }

  function describeClass(item) {
    return `${item.title || "Untitled class"} on ${formatDate(item.date, locale)}, from ${formatTime(item.startTime)} to ${formatTime(item.endTime)}, at ${item.venue || "venue not specified"}.`;
  }

  function readToday() {
    if (todayClasses.length === 0) {
      readAloud("You have no timetable entries scheduled for today.");
      return;
    }

    const message = `You have ${todayClasses.length} ${todayClasses.length === 1 ? "class" : "classes"} today. ${todayClasses.map((item, index) => `Class ${index + 1}. ${describeClass(item)}`).join(" ")}`;
    readAloud(message);
  }

  function readFullSchedule() {
    if (entries.length === 0) {
      readAloud("Your timetable is currently empty.");
      return;
    }

    const message = `Here is your timetable. ${entries.map((item, index) => `Entry ${index + 1}. ${describeClass(item)}`).join(" ")}`;
    readAloud(message);
  }

  function readNextClass(includeVenue = false) {
    if (!nextClass) {
      readAloud("You have no upcoming classes in your timetable.");
      return;
    }

    const message = includeVenue
      ? `Your next class is ${nextClass.title}, on ${formatDate(nextClass.date, locale)}, from ${formatTime(nextClass.startTime)} to ${formatTime(nextClass.endTime)}. It is at ${nextClass.venue || "a venue that has not been specified"}.`
      : `Your next class is ${nextClass.title}, on ${formatDate(nextClass.date, locale)}, starting at ${formatTime(nextClass.startTime)}.`;

    readAloud(message);
  }

  function handleVoiceCommand(rawCommand) {
    const command = String(rawCommand || "").toLowerCase().trim();

    if (
      command.includes("stop reading") ||
      command.includes("stop speaking") ||
      command === "be quiet" ||
      command === "stop"
    ) {
      stopSpeaking();
      setSpeechMessage("Speech stopped.");
      return;
    }

    if (
      command.includes("where") &&
      (command.includes("next class") || command.includes("class"))
    ) {
      readNextClass(true);
      return;
    }

    if (
      command.includes("next class") ||
      command.includes("class is next") ||
      command.includes("what's next") ||
      command.includes("what is next")
    ) {
      readNextClass();
      return;
    }

    if (
      command.includes("today") ||
      command.includes("classes today") ||
      command.includes("what do i have")
    ) {
      readToday();
      return;
    }

    if (
      command.includes("read my schedule") ||
      command.includes("read my timetable") ||
      command.includes("full schedule") ||
      command.includes("full timetable")
    ) {
      readFullSchedule();
      return;
    }

    readAloud(
      "I can read your schedule, tell you what classes you have today, identify your next class, or tell you where your next class is. Please try one of those commands."
    );
  }

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("schedule")}</p>
          <h1>{t("mySchedule")}</h1>
          <p className="muted">{t("scheduleDescription")}</p>
        </div>

        <span className="profile-saved">
          <CalendarDays size={16} />
          {todayClasses.length} {t("classesToday")}
        </span>
      </div>

      <div className="panel">
        <div className="panel-title">
          <div>
            <h2>Voice schedule assistant</h2>
            <p className="muted">
              Ask UniAble to read your timetable or find your next class.
            </p>
          </div>
          <Volume2 size={22} />
        </div>

        <VoiceCommandButton onCommand={handleVoiceCommand} />

        <div className="schedule-voice-actions">
          <button type="button" className="secondary-btn" onClick={readToday}>
            <Volume2 size={16} /> Read today's classes
          </button>

          <button type="button" className="secondary-btn" onClick={readNextClass}>
            <Clock3 size={16} /> Read next class
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => {
              stopSpeaking();
              setSpeechMessage("Speech stopped.");
            }}
          >
            <Square size={15} /> Stop reading
          </button>
        </div>

        {speechMessage && (
          <p className="muted" role="status" aria-live="polite">
            {speechMessage}
          </p>
        )}
      </div>

      {loading && (
        <div className="panel" role="status">
          Loading your timetable...
        </div>
      )}

      {error && (
        <div className="panel" role="alert">
          <p>{error}</p>
          <button
            type="button"
            className="secondary-btn"
            onClick={() => window.location.reload()}
          >
            Try again
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="schedule-layout">
          <div className="panel">
            <div className="panel-title">
              <h2>{t("todaysClasses")}</h2>
            </div>

            <div className="schedule-list">
              {todayClasses.length === 0 && (
                <p className="muted">
                  You have no classes scheduled for today.
                </p>
              )}

              {todayClasses.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`schedule-item ${selected?.id === item.id ? "selected" : ""}`}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="schedule-time">
                    <Clock3 size={15} /> {formatTime(item.startTime)}
                  </span>

                  <span className="schedule-main">
                    <strong>{item.title || "Untitled class"}</strong>
                    <small>
                      {item.venue || "Venue not specified"} · {formatDate(item.date, locale)}
                    </small>
                  </span>

                  <CheckCircle2 size={18} />
                </button>
              ))}
            </div>
          </div>

          <div className="panel schedule-detail">
            <span className="eyebrow">{t("selectedClass")}</span>

            {selected ? (
              <>
                <h2>{selected.title || "Untitled class"}</h2>

                <p className="muted">
                  {formatDate(selected.date, locale)}
                </p>

                <p className="muted">
                  {formatTime(selected.startTime)} – {formatTime(selected.endTime)}
                </p>

                <div className="detail-row">
                  <MapPin size={18} />
                  <span>{selected.venue || "Venue not specified"}</span>
                </div>

                <button
                  className="primary-btn"
                  type="button"
                  onClick={() => navigate("/campus")}
                >
                  <Navigation size={17} /> {t("navigateToClass")}
                </button>

                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => readAloud(describeClass(selected))}
                >
                  <Volume2 size={16} /> Read this class aloud
                </button>
              </>
            ) : (
              <p className="muted">
                Select a class to view its details. Your upcoming timetable
                entries will appear here when scheduled for today.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
