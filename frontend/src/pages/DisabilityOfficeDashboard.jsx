import React, { useCallback, useEffect, useState } from "react";
import { FileText, RefreshCw, ShieldCheck } from "lucide-react";
import {
  getAccessibilityApplications,
  getAccessibilityDocumentUrl,
  reviewAccessibilityApplication,
  signOutAccount,
} from "../services/firebaseAuth";
import { useNavigate } from "react-router-dom";

const OPTIONS = ["Extra time", "Captioning", "Sign-language interpreter", "Alternative formats", "Audio-first materials", "Accessible venue", "Assistive technology"];

export default function DisabilityOfficeDashboard() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [accommodations, setAccommodations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [documentLink, setDocumentLink] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getAccessibilityApplications();
      setApplications(rows);
      setSelected((current) => current ? rows.find((item) => item.id === current.id) || null : null);
    } catch (err) {
      setError(err.message || "Could not load accessibility applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function openDocument(application, document) {
    setError("");
    try {
      const url = await getAccessibilityDocumentUrl(application.id, document.storagePath);
      setDocumentLink({ url, name: document.name });
    } catch (err) {
      setError(err.message || "Could not open the supporting document.");
    }
  }

  async function decide(decision) {
    if (!selected) return;
    setWorking(true);
    setError("");
    setNotice("");
    try {
      await reviewAccessibilityApplication(selected.id, { decision, note, accommodations });
      setNotice(`Application ${selected.id} marked ${decision.replace("_", " ")}.`);
      setSelected(null);
      setNote("");
      await refresh();
    } catch (err) {
      setError(err.message || "The decision could not be saved.");
    } finally {
      setWorking(false);
    }
  }

  async function logout() {
    setWorking(true);
    try {
      await signOutAccount();
      sessionStorage.setItem("uniableStaffLogout", "1");
      navigate("/staff", { replace: true });
    } catch (err) {
      setError(err.message || "Could not log out.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="page dashboard-page" style={{ maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div><p className="dashboard-eyebrow">UNIABLE STAFF SERVICES</p><h1>Disability Office</h1><p>Review student accessibility applications and supporting documents.</p></div>
        <button type="button" onClick={logout} disabled={working}>Log out</button>
      </header>
      <section className="admin-stat-grid" style={{ marginTop: 18 }}>
        <article className="admin-stat-card"><span>All applications</span><strong>{applications.length}</strong></article>
        <article className="admin-stat-card"><span>Pending review</span><strong>{applications.filter((item) => item.status === "pending").length}</strong></article>
        <article className="admin-stat-card"><span>More information needed</span><strong>{applications.filter((item) => item.status === "needs_info").length}</strong></article>
        <article className="admin-stat-card"><span>Approved</span><strong>{applications.filter((item) => item.status === "approved").length}</strong></article>
      </section>
      <div style={{ display: "flex", justifyContent: "flex-end", margin: "16px 0" }}>
        <button type="button" onClick={refresh} disabled={loading}><RefreshCw size={16} /> Refresh applications</button>
      </div>
      {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
      {notice && <p role="status" style={{ color: "#067647" }}>{notice}</p>}
      <section className="admin-panel">
        <h2>Application queue</h2>
        {loading ? <p role="status">Loading applications…</p> : applications.length === 0 ? <p>No accessibility applications have been submitted.</p> : (
          <div style={{ display: "grid", gap: 10 }}>
            {applications.map((application) => (
              <article key={application.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 14, border: "1px solid var(--border, #ccc)", borderRadius: 10 }}>
                <div><strong>{application.studentName || "Student"}</strong><p>{application.category} · {application.id}</p><small>{application.status} · {application.documents?.length || 0} document(s)</small></div>
                <button type="button" onClick={() => { setSelected(application); setNote(""); setAccommodations(application.accommodations || []); }}>Review application</button>
              </article>
            ))}
          </div>
        )}
      </section>
      {selected && (
        <section className="admin-panel" style={{ marginTop: 18 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><h2>Review {selected.id}</h2><button type="button" onClick={() => setSelected(null)}>Close</button></div>
          <p><strong>Student:</strong> {selected.studentName} ({selected.studentEmail})</p>
          <p><strong>Category:</strong> {selected.category}</p>
          <p><strong>Support requested:</strong> {selected.description}</p>
          <p><strong>Submitted:</strong> {selected.submittedAt ? new Date(selected.submittedAt).toLocaleString() : "Date unavailable"}</p>
          <h3>Supporting documents</h3>
          {documentLink && <p role="status">Document ready: <a href={documentLink.url} target="_blank" rel="noreferrer">Open {documentLink.name}</a></p>}
          <ul>{(selected.documents || []).map((document) => <li key={document.id} style={{ marginBottom: 8 }}><FileText size={15} style={{ verticalAlign: "middle" }} /> {document.name} <button type="button" onClick={() => openDocument(selected, document)}>Open securely</button></li>)}</ul>
          <fieldset style={{ display: "grid", gap: 8, padding: 12 }}><legend>Accommodations to grant</legend>{OPTIONS.map((item) => <label key={item}><input type="checkbox" checked={accommodations.includes(item)} onChange={() => setAccommodations((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])} /> {item}</label>)}</fieldset>
          <label style={{ display: "grid", gap: 6, marginTop: 12 }}>Decision note (required for rejection or more information)<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} /></label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" disabled={working} onClick={() => decide("approved")}><ShieldCheck size={15} /> Approve</button>
            <button type="button" disabled={working} onClick={() => decide("needs_info")}>Request more information</button>
            <button type="button" disabled={working} onClick={() => decide("rejected")}>Reject</button>
          </div>
        </section>
      )}
      <p style={{ marginTop: 16, fontSize: 13 }}>Access to supporting documents is restricted by Firebase Storage rules. Document openings and review decisions should also be audited server-side before production use.</p>
    </main>
  );
}
