import { useState } from "react";
import DashboardShell from "./DashboardShell.jsx";
import { Badge, Notice, Panel } from "./ui.jsx";
import { useSession } from "../auth/SessionContext.jsx";
import {
  ACCOMMODATION_OPTIONS,
  decideRegistration,
  recordDocumentView,
  useRegistrations,
} from "../services/registrations.js";
import { REPORTS, displayRows } from "../services/reports.js";

const STATUS = {
  pending: { label: "Pending review", tone: "warning" },
  needs_info: { label: "More information needed", tone: "danger" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
};

export default function DisabilityOfficeDashboard() {
  const registrations = useRegistrations();
  const [active, setActive] = useState("queue");
  const waiting = registrations.filter((r) => r.status === "pending").length;

  const nav = [
    { id: "queue", label: "Registration queue", title: "Registration queue", badge: waiting || undefined },
    { id: "accommodations", label: "Accommodations", title: "Approved accommodations" },
    { id: "reports", label: "Reports", title: "Aggregated reports" },
  ];

  return (
    <DashboardShell nav={nav} active={active} onSelect={setActive}>
      {active === "queue" && <Queue registrations={registrations} />}
      {active === "accommodations" && <Accommodations registrations={registrations} />}
      {active === "reports" && <Reports />}
    </DashboardShell>
  );
}

function Queue({ registrations }) {
  const [openId, setOpenId] = useState(null);
  const open = registrations.find((r) => r.id === openId);
  return (
    <>
      <Notice>
        Disability information is special personal information. Opening a document and every
        decision are recorded in the audit trail by registration ID only.
      </Notice>
      <Panel title="Registrations" id="queue">
        <div className="table-wrap">
          <table className="dash-table">
            <caption className="sr-only">Disability registrations</caption>
            <thead>
              <tr>
                <th scope="col">Reference</th><th scope="col">Student</th><th scope="col">Category</th>
                <th scope="col">Submitted</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.id}</td>
                  <td>{r.studentName}</td>
                  <td>{r.category}</td>
                  <td>{r.submittedAt}</td>
                  <td><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge></td>
                  <td>
                    <button type="button" className="btn" onClick={() => setOpenId(r.id)}>
                      Review<span className="sr-only"> {r.id}</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {open && <ReviewPanel key={open.id} registration={open} onClose={() => setOpenId(null)} />}
    </>
  );
}

function ReviewPanel({ registration, onClose }) {
  const { user } = useSession();
  const [viewing, setViewing] = useState(null);
  const [note, setNote] = useState("");
  const [accommodations, setAccommodations] = useState(registration.accommodations);
  const [message, setMessage] = useState(null);

  function openDocument(doc) {
    recordDocumentView(user, registration.id, doc.id);
    setViewing(doc);
  }

  function toggle(option) {
    setAccommodations((current) =>
      current.includes(option) ? current.filter((o) => o !== option) : [...current, option]
    );
  }

  function decide(decision) {
    const result = decideRegistration(user, registration.id, { decision, note, accommodations });
    setMessage(result.ok ? { tone: "success", text: "Decision saved and recorded." } : { tone: "danger", text: result.error });
  }

  return (
    <Panel
      id="review"
      title={`Review ${registration.id} — ${registration.studentName}`}
      subtitle={`Category: ${registration.category}`}
      actions={<button type="button" className="btn" onClick={onClose}>Close</button>}
    >
      <div>
        <h3 className="panel__title">Supporting documents</h3>
        <ul className="list" style={{ marginTop: 8 }}>
          {registration.documents.map((doc) => (
            <li key={doc.id} className="list__item">
              <div className="list__row">
                <span><strong>{doc.name}</strong> <span className="muted">· {doc.type}</span></span>
                <button type="button" className="btn" onClick={() => openDocument(doc)}>Open document</button>
              </div>
            </li>
          ))}
        </ul>
        {viewing && (
          <Notice tone="warning" role="status">
            Document viewer placeholder for “{viewing.name}”. Opening it has been recorded in the audit
            trail. Real files will come from secure storage once connected.
          </Notice>
        )}
      </div>

      <div className="field">
        <fieldset>
          <legend>Accommodations to grant (when approving)</legend>
          {ACCOMMODATION_OPTIONS.map((option) => (
            <label key={option} className="check">
              <input type="checkbox" checked={accommodations.includes(option)} onChange={() => toggle(option)} />
              {option}
            </label>
          ))}
        </fieldset>
      </div>

      <div className="field">
        <label htmlFor="decision-note">Note to the student (required to reject or ask for more information)</label>
        <textarea id="decision-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <div className="cell-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn--primary" onClick={() => decide("approved")}>Approve</button>
        <button type="button" className="btn" onClick={() => decide("needs_info")}>Request more information</button>
        <button type="button" className="btn btn--danger" onClick={() => decide("rejected")}>Reject</button>
      </div>
      {message && <Notice tone={message.tone} role="status">{message.text}</Notice>}
    </Panel>
  );
}

function Accommodations({ registrations }) {
  const approved = registrations.filter((r) => r.status === "approved");
  return (
    <Panel title="Approved students" id="approved">
      {approved.length === 0 ? (
        <p className="muted">No approved registrations yet.</p>
      ) : (
        <ul className="list">
          {approved.map((r) => (
            <li key={r.id} className="list__item">
              <div className="list__row"><strong>{r.studentName}</strong><span className="mono">{r.id}</span></div>
              <span>{r.accommodations.length ? r.accommodations.join(" · ") : "No accommodations recorded"}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Reports() {
  const report = REPORTS.registrations;
  return (
    <Panel title={report.title} subtitle="Counts of 1–4 are hidden to protect individuals. Sample data." id="report">
      <div className="table-wrap">
        <table className="dash-table">
          <thead><tr>{report.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
          <tbody>
            {displayRows(report).map((row) => (
              <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
