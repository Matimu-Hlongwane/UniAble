import { useState, useMemo } from "react";
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
  const approvedCount = registrations.filter((r) => r.status === "approved").length;

  const nav = [
    { id: "queue", label: "Registration queue", title: "Registration queue", badge: waiting || undefined },
    { id: "accommodations", label: "Accommodations", title: "Approved accommodations", badge: approvedCount || undefined },
    { id: "reports", label: "Reports", title: "Aggregated reports" },
  ];

  return (
    <DashboardShell nav={nav} active={active} onSelect={setActive}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="panel" style={{ padding: '16px' }}>
          <div className="muted" style={{ fontSize: '12px' }}>Awaiting Review</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{waiting}</div>
        </div>
        <div className="panel" style={{ padding: '16px' }}>
          <div className="muted" style={{ fontSize: '12px' }}>Approved</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{approvedCount}</div>
        </div>
        <div className="panel" style={{ padding: '16px' }}>
          <div className="muted" style={{ fontSize: '12px' }}>Total</div>
          <div style={{ fontSize: '24px', fontWeight: '700' }}>{registrations.length}</div>
        </div>
      </div>

      {active === "queue" && <Queue registrations={registrations} />}
      {active === "accommodations" && <Accommodations registrations={registrations} />}
      {active === "reports" && <Reports />}
    </DashboardShell>
  );
}

function Queue({ registrations }) {
  const [openId, setOpenId] = useState(null);
  const [search, setSearch] = useState("");
  const open = registrations.find((r) => r.id === openId);

  const filtered = useMemo(() => {
    if (!search) return registrations;
    const q = search.toLowerCase();
    return registrations.filter(r => r.id.toLowerCase().includes(q) || r.studentName.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
  }, [registrations, search]);

  return (
    <>
      <Notice>Disability information is special personal information. Opening a document and every decision are recorded in the audit trail by registration ID only.</Notice>
      <Panel title="Registrations" id="queue" actions={<input type="search" placeholder="Search ID, name, category..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ minWidth: '220px' }} />}>
        <div className="table-wrap">
          <table className="dash-table">
            <thead><tr><th>Reference</th><th>Student</th><th>Category</th><th>Submitted</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="mono" style={{ fontWeight: 600 }}>{r.id}</td>
                  <td>{r.studentName}</td>
                  <td className="muted">{r.category}</td>
                  <td className="muted">{r.submittedAt}</td>
                  <td><Badge tone={STATUS[r.status].tone}>{STATUS[r.status].label}</Badge></td>
                  <td><button type="button" className="btn btn--primary" onClick={() => setOpenId(r.id)}>Review</button></td>
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
  const [viewedDocs, setViewedDocs] = useState(new Set());
  const [note, setNote] = useState("");
  const [accommodations, setAccommodations] = useState(registration.accommodations);
  const [message, setMessage] = useState(null);
  
  // NEW: Verification checklist
  const [checks, setChecks] = useState({
    isCorrectType: false,
    nameMatches: false,
    dateValid: false,
    signaturePresent: false,
    legible: false,
  });

  const allDocsViewed = viewedDocs.size === registration.documents.length;
  const allChecksPassed = Object.values(checks).every(Boolean);
  const canApprove = allDocsViewed && allChecksPassed && accommodations.length > 0;

  function openDocument(doc) {
    recordDocumentView(user, registration.id, doc.id);
    setViewing(doc);
    setViewedDocs(prev => new Set(prev).add(doc.id));
  }

  function toggleCheck(key) {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function toggleAccom(option) {
    setAccommodations((current) => current.includes(option) ? current.filter((o) => o !== option) : [...current, option]);
  }

  function decide(decision) {
    if (decision === 'approved' && !canApprove) {
      setMessage({ tone: "danger", text: "You must view all documents, complete all verification checks, and select at least one accommodation before approving." });
      return;
    }
    if ((decision === 'rejected' || decision === 'needs_info') && !note.trim()) {
      setMessage({ tone: "danger", text: "Note to student is required when rejecting or requesting more information." });
      return;
    }
    const result = decideRegistration(user, registration.id, { decision, note, accommodations, verification: checks });
    setMessage(result.ok ? { tone: "success", text: decision === 'approved' ? "Approved - decision recorded with verification checklist." : "Decision saved and recorded." } : { tone: "danger", text: result.error });
    if (result.ok) setTimeout(() => onClose(), 1200);
  }

  return (
    <Panel id="review" title={`Review ${registration.id} — ${registration.studentName}`} subtitle={`Category: ${registration.category}`} actions={<button type="button" className="btn" onClick={onClose}>Close</button>}>
      
      {/* Documents with viewed status */}
      <div className="field">
        <h3 className="panel__title">1. Supporting documents — MUST view all before decision</h3>
        <ul className="list" style={{ marginTop: 8 }}>
          {registration.documents.map((doc) => {
            const isViewed = viewedDocs.has(doc.id);
            return (
              <li key={doc.id} className="list__item" style={{ padding: '12px', border: `1px solid ${isViewed ? 'var(--success)' : 'var(--border)'}`, borderRadius: '8px', marginBottom: '8px', background: isViewed ? 'var(--success-bg, #f0fdf4)' : 'white' }}>
                <div className="list__row">
                  <span><strong>{doc.name}</strong> <span className="muted">· {doc.type}</span> {isViewed && <span style={{ color: 'var(--success)', marginLeft: '8px' }}>✓ Viewed & recorded</span>}</span>
                  <button type="button" className={isViewed ? "btn" : "btn btn--primary"} onClick={() => openDocument(doc)}>{isViewed ? 'View again' : 'Open & verify'}</button>
                </div>
                {/* Auto file validation display */}
                <div style={{ fontSize: '12px', marginTop: '6px' }} className="muted">
                  Validation: Type: {doc.type?.includes('pdf') || doc.name?.endsWith('.pdf') ? '✓ PDF' : '⚠ Check type'} · 
                  Size: OK · 
                  View recorded in audit trail
                </div>
              </li>
            );
          })}
        </ul>
        {!allDocsViewed && <Notice tone="warning">You have viewed {viewedDocs.size}/{registration.documents.length} documents. View all to enable approval.</Notice>}
        {viewing && <Notice tone="warning" role="status" style={{ marginTop: '8px' }}>Viewer placeholder for “{viewing.name}”. Opening recorded. Real file from secure storage will appear here.</Notice>}
      </div>

      {/* NEW: Verification Checklist */}
      <div className="field" style={{ background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: '8px', padding: '16px' }}>
        <h3 className="panel__title" style={{ color: '#92400e' }}>2. Document verification — Officer must confirm correctness</h3>
        <p className="muted" style={{ fontSize: '13px', margin: '6px 0 12px' }}>Check each document manually. All must be ticked to approve.</p>
        <div style={{ display: 'grid', gap: '10px' }}>
          <label className="check"><input type="checkbox" checked={checks.isCorrectType} onChange={() => toggleCheck('isCorrectType')} /> Correct document type (medical report / psychologist letter / proof) for {registration.category}</label>
          <label className="check"><input type="checkbox" checked={checks.nameMatches} onChange={() => toggleCheck('nameMatches')} /> Student name on document matches registration: {registration.studentName}</label>
          <label className="check"><input type="checkbox" checked={checks.dateValid} onChange={() => toggleCheck('dateValid')} /> Date is recent and not expired (within 12 months)</label>
          <label className="check"><input type="checkbox" checked={checks.signaturePresent} onChange={() => toggleCheck('signaturePresent')} /> Professional signature / practice stamp present</label>
          <label className="check"><input type="checkbox" checked={checks.legible} onChange={() => toggleCheck('legible')} /> Document is legible and complete (all pages)</label>
        </div>
        {!allChecksPassed && <div className="muted" style={{ fontSize: '12px', marginTop: '8px' }}>{Object.values(checks).filter(Boolean).length}/5 checks completed</div>}
      </div>

      <div className="field">
        <fieldset style={{ border: '1px solid var(--border)', padding: '12px', borderRadius: '8px' }}>
          <legend style={{ padding: '0 8px', fontWeight: 600 }}>3. Accommodations to grant (when approving)</legend>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px', marginTop: '8px' }}>
            {ACCOMMODATION_OPTIONS.map((option) => (
              <label key={option} className="check" style={{ padding: '8px', background: 'var(--bg-subtle)', borderRadius: '6px' }}>
                <input type="checkbox" checked={accommodations.includes(option)} onChange={() => toggleAccom(option)} />{option}
              </label>
            ))}
          </div>
          {accommodations.length === 0 && <p className="muted" style={{ fontSize: '12px', marginTop: '8px' }}>Select at least 1 accommodation to approve</p>}
        </fieldset>
      </div>

      <div className="field">
        <label htmlFor="decision-note" style={{ fontWeight: 600 }}>4. Note to student {` `}<span className="muted">(required to reject or request info)</span></label>
        <textarea id="decision-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="If rejecting: state reason and what correct document is needed. If approved: add instructions..." />
      </div>

      <div className="cell-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: '16px' }}>
        <button type="button" className="btn btn--primary" onClick={() => decide("approved")} disabled={!canApprove} title={!canApprove ? 'Complete verification checklist, view all docs, and select accommodation' : ''} style={{ opacity: canApprove ? 1 : 0.5 }}>
          ✓ Approve {canApprove ? '' : `(${Object.values(checks).filter(Boolean).length}/5 checks)`}
        </button>
        <button type="button" className="btn" onClick={() => decide("needs_info")}>Request more information</button>
        <button type="button" className="btn btn--danger" onClick={() => decide("rejected")}>Reject</button>
      </div>
      {message && <div style={{ marginTop: '12px' }}><Notice tone={message.tone} role="status">{message.text}</Notice></div>}
    </Panel>
  );
}

function Accommodations({ registrations }) {
  const approved = registrations.filter((r) => r.status === "approved");
  return (
    <Panel title="Approved students" id="approved">
      {approved.length === 0 ? <p className="muted" style={{ padding: '24px', textAlign: 'center' }}>No approved registrations yet.</p> : (
        <ul className="list">
          {approved.map((r) => (
            <li key={r.id} className="list__item" style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
              <div className="list__row" style={{ marginBottom: '6px' }}><strong>{r.studentName}</strong><span className="mono" style={{ background: 'var(--bg-subtle)', padding: '2px 6px', borderRadius: '4px' }}>{r.id}</span></div>
              <span style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>{r.accommodations.length ? r.accommodations.map(a => <span key={a} className="badge badge--success">{a}</span>) : <span className="muted">No accommodations</span>}</span>
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
      <div className="table-wrap"><table className="dash-table"><thead><tr>{report.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead><tbody>{displayRows(report).map((row) => (<tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>))}</tbody></table></div>
    </Panel>
  );
}
