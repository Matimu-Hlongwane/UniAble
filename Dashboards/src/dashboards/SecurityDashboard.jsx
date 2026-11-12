import { useEffect, useState } from "react";
import DashboardShell from "./DashboardShell.jsx";
import { Badge, Notice, Panel, formatDateTime, minutesSince } from "./ui.jsx";
import { useSession } from "../auth/SessionContext.jsx";
import { useAdminState } from "../services/adminStore.js";
import {
  ACTIVE_STATUSES,
  NEXT_ACTION_LABEL,
  STATUS_LABELS,
  advanceIncident,
  useIncidents,
} from "../services/incidents.js";

export default function SecurityDashboard() {
  const incidents = useIncidents();
  const { config } = useAdminState();
  const [active, setActive] = useState("active");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const activeIncidents = incidents.filter((i) => ACTIVE_STATUSES.includes(i.status));
  const history = incidents.filter((i) => !ACTIVE_STATUSES.includes(i.status));

  const nav = [
    { id: "active", label: "Active incidents", title: "Active incidents", badge: activeIncidents.length || undefined },
    { id: "history", label: "History", title: "Closed incidents" },
  ];

  return (
    <DashboardShell nav={nav} active={active} onSelect={setActive}>
      <Notice>
        Wellbeing alert threshold: {config.unresponsiveCheckInMinutes} minutes without a check-in reply.
        You see the student’s name and location only while an incident is active — never their
        registration or disability details.
      </Notice>
      {active === "active" && (
        <Panel title="Needs a response" id="active">
          {activeIncidents.length === 0 ? (
            <p className="muted">No active incidents.</p>
          ) : (
            <ul className="list">
              {activeIncidents.map((i) => <IncidentCard key={i.id} incident={i} now={now} />)}
            </ul>
          )}
        </Panel>
      )}
      {active === "history" && (
        <Panel title="Closed incidents" subtitle="Locations are cleared once an incident closes." id="history">
          {history.length === 0 ? (
            <p className="muted">Nothing closed yet.</p>
          ) : (
            <ul className="list">
              {history.map((i) => (
                <li key={i.id} className="list__item">
                  <div className="list__row">
                    <strong>{i.id} · {i.type}</strong>
                    <Badge tone={i.status === "resolved" ? "success" : "neutral"}>{STATUS_LABELS[i.status]}</Badge>
                  </div>
                  <span>{i.studentName} · {formatDateTime(i.createdAt)}</span>
                  {i.resolutionNote && <span className="muted">{i.resolutionNote}</span>}
                  <span className="muted">{i.locationNote}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}
    </DashboardShell>
  );
}

function IncidentCard({ incident, now }) {
  const { user } = useSession();
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState(null);
  const nextLabel = NEXT_ACTION_LABEL[incident.status];
  const location = incident.location
    ? incident.location.label ??
      `${incident.location.lat.toFixed(5)}, ${incident.location.lng.toFixed(5)} (±${incident.location.accuracy} m)`
    : incident.locationNote;

  function advance(withNote) {
    const result = advanceIncident(user, incident.id, withNote);
    if (!result.ok) setError(result.error);
    else {
      setError(null);
      setResolving(false);
      setNote("");
    }
  }

  return (
    <li className="list__item">
      <div className="list__row">
        <strong>{incident.id} · {incident.type}</strong>
        <Badge tone={incident.status === "new" ? "danger" : "warning"}>{STATUS_LABELS[incident.status]}</Badge>
      </div>
      <span>{incident.studentName} · {minutesSince(incident.createdAt, now)} min ago</span>
      <span>Location: {location}</span>
      <span className="muted">
        {incident.officer ? `Officer: ${incident.officer}` : "No officer assigned"}
        {incident.assignedPeer ? ` · Peer: ${incident.assignedPeer}` : ""}
      </span>

      {resolving ? (
        <div className="field">
          <label htmlFor={`note-${incident.id}`}>Resolution note</label>
          <textarea id={`note-${incident.id}`} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn--primary" onClick={() => advance(note)}>Confirm resolved</button>
            <button type="button" className="btn" onClick={() => setResolving(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => (incident.status === "on_scene" ? setResolving(true) : advance())}
          >
            {nextLabel}
          </button>
        </div>
      )}
      {error && <Notice tone="danger" role="alert">{error}</Notice>}
    </li>
  );
}
