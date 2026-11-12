import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, Clock3, MapPin, Navigation, RefreshCw, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSettings } from "../context/settingsContext/SettingsContext";
import { api } from "../services/api";
import { speak } from "../services/speechService";

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatClassDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export default function Schedule() {
  const { t, locale } = useSettings();
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [speechStatus, setSpeechStatus] = useState("");

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [timetableResult, modulesResult] = await Promise.all([
        api.getAcademicTimetable(),
        api.getAcademicModules(),
      ]);
      const modules = Array.isArray(modulesResult)
        ? modulesResult
        : modulesResult?.modules || [];
      const moduleNames = new Map(modules.map((module) => [module.id, module.name]));
      const timetable = Array.isArray(timetableResult)
        ? timetableResult
        : timetableResult?.timetable || [];
      const today = localDateKey(new Date());
      const todayClasses = timetable
        .filter((entry) => entry.date === today)
        .map((entry) => ({
          ...entry,
          name: entry.title || moduleNames.get(entry.moduleId) || "Class",
          venue: String(entry.venue || "").trim(),
        }))
        .sort((left, right) => String(left.startTime || "").localeCompare(String(right.startTime || "")));

      setClasses(todayClasses);
      setSelectedId((current) =>
        todayClasses.some((entry) => entry.id === current)
          ? current
          : todayClasses[0]?.id || ""
      );
    } catch (loadError) {
      console.error("Could not load the student's timetable:", loadError);
      setError(loadError.message || "Could not load your timetable. Please try again.");
      setClasses([]);
      setSelectedId("");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  const selected = useMemo(
    () => classes.find((item) => item.id === selectedId) || null,
    [classes, selectedId]
  );

  async function readSchedule() {
    const text = classes.length
      ? classes
        .map((item) => `${item.startTime || "Time unavailable"} to ${item.endTime || "Time unavailable"}: ${item.name}, ${item.venue || "venue not provided"}`)
        .join(". ")
      : "There are no classes in your timetable for today.";

    try {
      const result = await speak(text, { locale: locale || "en-ZA" });
      setSpeechStatus(
        result.started
          ? "Reading today’s schedule aloud."
          : "Speech is unavailable on this device. Your schedule remains available on screen."
      );
    } catch (speechError) {
      console.error("Could not read the schedule aloud:", speechError);
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
          <button type="button" className="secondary-btn" onClick={readSchedule} disabled={loading}>
            <Volume2 size={17} aria-hidden="true" /> Read schedule aloud
          </button>
          <button type="button" className="secondary-btn" onClick={() => void loadSchedule()} disabled={loading}>
            <RefreshCw size={17} aria-hidden="true" /> {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </div>
      {speechStatus && <p role="status" aria-live="polite">{speechStatus}</p>}
      {error && (
        <div className="panel" role="alert">
          <p>{error}</p>
          <button type="button" className="secondary-btn" onClick={() => void loadSchedule()} disabled={loading}>
            Try again
          </button>
        </div>
      )}

      <div className="schedule-layout">
        <div className="panel">
          <div className="panel-title">
            <h2>{t("todaysClasses")}</h2>
          </div>

          {loading ? (
            <p role="status" aria-live="polite">Loading your timetable…</p>
          ) : !error && !classes.length ? (
            <p className="muted">No classes were found in your timetable for today.</p>
          ) : (
            <div className="schedule-list">
              {classes.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`schedule-item ${selectedId === item.id ? "selected" : ""}`}
                  aria-pressed={selectedId === item.id}
                  onClick={() => setSelectedId(item.id)}
                >
                  <span className="schedule-time">
                    <Clock3 size={15} /> {item.startTime || "Time unavailable"}
                  </span>
                  <span className="schedule-main">
                    <strong>{item.name}</strong>
                    <small>{item.endTime || "End time unavailable"} · {item.venue || "Venue not provided"}</small>
                  </span>
                  <CheckCircle2 size={18} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="panel schedule-detail">
          {selected ? (
            <>
              <span className="eyebrow">{t("selectedClass")}</span>
              <h2>{selected.name}</h2>
              <p className="muted">{formatClassDate(selected.date)} · {selected.startTime || "Time unavailable"}–{selected.endTime || "Time unavailable"}</p>
              <div className="detail-row">
                <MapPin size={18} />
                <span>{selected.venue || "Venue not provided"}</span>
              </div>
              <button className="primary-btn" type="button" onClick={() => navigate("/campus")}>
                <Navigation size={17} /> {t("navigateToClass")}
              </button>
            </>
          ) : (
            <>
              <span className="eyebrow">{t("selectedClass")}</span>
              <h2>{loading ? "Loading…" : "No class selected"}</h2>
              <p className="muted">
                {loading
                  ? "Your timetable is being loaded."
                  : "When a class is scheduled today, its time and venue will appear here."}
              </p>
            </>
          )}
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
