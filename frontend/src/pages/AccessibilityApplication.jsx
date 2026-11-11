import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileUp, RefreshCw, Send } from "lucide-react";
import { getMyAccessibilityApplications, submitAccessibilityApplication } from "../services/firebaseAuth";
import { ACCESSIBILITY_CATEGORIES } from "../data/accessibilityCategories";

const CATEGORIES = ACCESSIBILITY_CATEGORIES;
const ACCOMMODATIONS = ["Extra time", "Captioning", "Sign-language interpreter", "Alternative formats", "Audio-first materials", "Accessible venue", "Assistive technology"];

function dateLabel(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString();
}

export default function AccessibilityApplication() {
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [accommodations, setAccommodations] = useState([]);
  const [files, setFiles] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadApplications = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      setApplications(await getMyAccessibilityApplications());
    } catch (err) {
      setError(err.message || "Could not load your applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadApplications(); }, [loadApplications]);

  function toggleAccommodation(value) {
    setAccommodations((current) => current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value]);
  }

  async function submit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await submitAccessibilityApplication({ category, description, accommodations, files });
      setDescription("");
      setAccommodations([]);
      setFiles([]);
      formElement.reset();
      setMessage("Your application and supporting documents have been submitted to the Disability Office.");
      await loadApplications();
    } catch (err) {
      setError(err.message || "Your application could not be submitted.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="page dashboard-page" style={{ maxWidth: 1000, margin: "0 auto", padding: 24 }}>
      <p className="dashboard-eyebrow">STUDENT ACCESSIBILITY SERVICES</p>
      <h1>Accessibility support application</h1>
      <p>Submit your support requirements and attach relevant documents for confidential review by the Disability Office.</p>
      <p><Link to="/accessibility">Back to accessibility settings</Link></p>

      <section className="admin-panel" style={{ marginTop: 20 }}>
        <h2>New application</h2>
        <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
          <label style={{ display: "grid", gap: 6 }}>
            Accessibility category
            <select value={category} onChange={(event) => setCategory(event.target.value)} required>
              <option value="">Select a category</option>
              {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            Describe the support you need
            <textarea rows={4} minLength={10} required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe how your studies or campus access are affected and what support would help." />
          </label>
          <fieldset style={{ display: "grid", gap: 8, border: "1px solid var(--border, #ccc)", padding: 14, borderRadius: 10 }}>
            <legend>Requested accommodations (optional)</legend>
            {ACCOMMODATIONS.map((item) => (
              <label key={item} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input type="checkbox" checked={accommodations.includes(item)} onChange={() => toggleAccommodation(item)} /> {item}
              </label>
            ))}
          </fieldset>
          <label style={{ display: "grid", gap: 6 }}>
            <span><FileUp size={17} style={{ verticalAlign: "middle" }} /> Supporting documents (PDF, JPG or PNG; up to 10 MB each)</span>
            <input type="file" multiple accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFiles(Array.from(event.target.files || []))} required />
          </label>
          {files.length > 0 && <p>{files.length} document(s) selected.</p>}
          {error && <p role="alert" style={{ color: "#b42318" }}>{error}</p>}
          {message && <p role="status" style={{ color: "#067647" }}>{message}</p>}
          <button type="submit" disabled={saving || files.length === 0}>
            <Send size={16} /> {saving ? "Submitting securely…" : "Submit application"}
          </button>
        </form>
      </section>

      <section className="admin-panel" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <h2>Your applications</h2>
          <button type="button" onClick={loadApplications} disabled={loading}><RefreshCw size={15} /> Refresh</button>
        </div>
        {loading ? <p role="status">Loading your applications…</p> : applications.length === 0 ? <p>No applications submitted yet.</p> : (
          <div style={{ display: "grid", gap: 12 }}>
            {applications.map((application) => (
              <article key={application.id} style={{ border: "1px solid var(--border, #ccc)", borderRadius: 10, padding: 14 }}>
                <strong>{application.category}</strong>
                <p>Reference: {application.id}</p>
                <p>Submitted: {dateLabel(application.submittedAt)}</p>
                <p>Status: <strong>{String(application.status || "pending").replace("_", " ")}</strong></p>
                {application.decisionNote && <p>Disability Office note: {application.decisionNote}</p>}
                <p>{application.documents?.length || 0} supporting document(s)</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
