import { useState } from "react";
import { Link } from "react-router-dom";
import DashboardShell from "./DashboardShell.jsx";
import { Badge, Notice, Panel, formatDateTime } from "./ui.jsx";
import { useSession } from "../auth/SessionContext.jsx";
import { useAdminState } from "../services/adminStore.js";
import {
  ASSISTANCE_TYPES,
  cancelAssistanceRequest,
  createAssistanceRequest,
  useAssistanceRequests,
} from "../services/assistance.js";
import { useAccessibilityProfile } from "../hooks/useAccessibilityProfile.jsx";
import { DEADLINES, TIMETABLE } from "../data/sampleData.js";

const NAV = [
  { id: "home", label: "Home", title: "Your day" },
  { id: "help", label: "Get help", title: "Assistance and emergency" },
  { id: "accessibility", label: "Accessibility", title: "Accessibility controls" },
];

export default function StudentDashboard() {
  const [active, setActive] = useState("home");
  return (
    <DashboardShell nav={NAV} active={active} onSelect={setActive}>
      {active === "home" && <Home />}
      {active === "help" && <Help />}
      {active === "accessibility" && <AccessibilityControls />}
    </DashboardShell>
  );
}

function EmergencyButton() {
  return (
    <Link to="/emergency" className="sos-link">
      <span aria-hidden="true">⚠</span> Emergency SOS
    </Link>
  );
}

function Home() {
  const { user } = useSession();
  const { config } = useAdminState();
  const next = TIMETABLE[0];
  return (
    <>
      <div className="hero-card">
        <span className="hero-card__eyebrow">Next class</span>
        <span className="hero-card__title">{next.course}</span>
        <span>{next.time} · {next.room}</span>
      </div>

      <EmergencyButton />

      <Panel title="Upcoming deadlines" id="deadlines">
        <ul className="list">
          {DEADLINES.map((d) => (
            <li key={d.title} className="list__item">
              <div className="list__row">
                <strong>{d.course} — {d.title}</strong>
                <Badge tone="warning">Due {d.due}</Badge>
              </div>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel title="Timetable" subtitle={`Sample data for ${user.name}`} id="timetable">
        <div className="table-wrap">
          <table className="dash-table">
            <caption className="sr-only">Upcoming classes</caption>
            <thead>
              <tr><th scope="col">Day</th><th scope="col">Time</th><th scope="col">Course</th><th scope="col">Venue</th></tr>
            </thead>
            <tbody>
              {TIMETABLE.map((row) => (
                <tr key={`${row.day}-${row.time}`}>
                  <td>{row.day}</td><td>{row.time}</td><td>{row.course}</td><td>{row.room}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {config.wakeWordEnabled && (
        <Notice>
          Hands-free option: <Link to="/voice-activation">try “Hey UniAble” voice activation</Link>.
        </Notice>
      )}
    </>
  );
}

function Help() {
  const { user } = useSession();
  const { config } = useAdminState();
  const all = useAssistanceRequests();
  const mine = all.filter((r) => r.studentUid === user.uid);
  const [type, setType] = useState(ASSISTANCE_TYPES[0]);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    createAssistanceRequest(user, { type, note });
    setNote("");
    setMessage("Request sent. You can cancel it below at any time.");
  }

  return (
    <>
      <EmergencyButton />

      {config.peerAssistanceEnabled ? (
        <Panel title="Ask a peer for help" subtitle="Only you can see your requests and notes." id="ask">
          <form onSubmit={submit} className="field" style={{ gap: 16 }}>
            <div className="field">
              <label htmlFor="help-type">What do you need?</label>
              <select id="help-type" value={type} onChange={(e) => setType(e.target.value)}>
                {ASSISTANCE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="help-note">Anything we should know? (optional)</label>
              <textarea id="help-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <div><button type="submit" className="btn btn--primary">Send request</button></div>
          </form>
          <p role="status" aria-live="polite" className="muted">{message}</p>
          <Notice tone="warning">
            Volunteer matching needs the back end, which isn’t built yet — requests are saved but
            not yet delivered to volunteers.
          </Notice>
        </Panel>
      ) : (
        <Notice tone="warning">Peer assistance is switched off by the university right now.</Notice>
      )}

      <Panel title="Your requests" id="requests">
        {mine.length === 0 ? (
          <p className="muted">No requests yet.</p>
        ) : (
          <ul className="list">
            {mine.map((r) => (
              <li key={r.id} className="list__item">
                <div className="list__row">
                  <strong>{r.type}</strong>
                  <Badge tone={r.status === "open" ? "warning" : "neutral"}>{r.status === "open" ? "Waiting for a volunteer" : "Cancelled"}</Badge>
                </div>
                <span className="muted">{formatDateTime(r.createdAt)}{r.note ? ` · ${r.note}` : ""}</span>
                {r.status === "open" && (
                  <div>
                    <button type="button" className="btn btn--danger" onClick={() => cancelAssistanceRequest(user, r.id)}>
                      Cancel request
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}

function AccessibilityControls() {
  const { profile, toggleHighContrast, setTextScale } = useAccessibilityProfile();
  return (
    <Panel title="Display" subtitle="Changes apply immediately and are remembered on this device." id="display">
      <label className="check">
        <input type="checkbox" checked={profile.highContrast} onChange={toggleHighContrast} />
        High contrast mode
      </label>
      <div className="field">
        <label htmlFor="text-scale">Text size: {Math.round(profile.textScale * 100)}%</label>
        <input
          id="text-scale"
          type="range"
          min="0.9"
          max="1.4"
          step="0.1"
          value={profile.textScale}
          onChange={(e) => setTextScale(Number(e.target.value))}
        />
      </div>
      <p className="muted">Motion follows your device’s “reduce motion” setting automatically.</p>
    </Panel>
  );
}
