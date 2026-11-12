import React, { useEffect, useState } from "react";
import { BookOpen, FileText, RefreshCw } from "lucide-react";
import { api } from "../services/api";

export default function LearningMaterials() {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadMaterials() {
    setLoading(true);
    setError("");
    try {
      const result = await api.getAcademicMaterials();
      setMaterials(Array.isArray(result?.materials) ? result.materials : []);
    } catch (err) {
      setError(err?.message || "Your learning materials could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadMaterials(); }, []);

  return (
    <section className="page" aria-labelledby="learning-materials-title">
      <div className="page-heading">
        <div>
          <p className="eyebrow">STUDY SUPPORT</p>
          <h1 id="learning-materials-title">My learning materials</h1>
          <p className="muted">Published resources assigned to your modules.</p>
        </div>
        <button type="button" className="secondary-btn" onClick={loadMaterials} disabled={loading}>
          <RefreshCw size={17} aria-hidden="true" /> Refresh materials
        </button>
      </div>

      {loading && <p role="status" aria-live="polite">Loading your published learning materials…</p>}
      {error && <p role="alert" className="error-message">{error}</p>}
      {!loading && !error && materials.length === 0 && (
        <div className="panel" role="status">
          <BookOpen size={28} aria-hidden="true" />
          <h2>No published materials yet</h2>
          <p>Your lecturers have not published learning materials for your modules yet.</p>
        </div>
      )}
      {!loading && !error && materials.length > 0 && (
        <div className="panel">
          <h2>Available resources ({materials.length})</h2>
          <ul className="learning-material-list">
            {materials.map((item) => (
              <li key={item.id} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: "1px solid var(--border, #555)" }}>
                <FileText size={22} aria-hidden="true" />
                <div>
                  <h3>{item.title || item.fileName || "Untitled material"}</h3>
                  {item.description && <p>{item.description}</p>}
                  <p className="muted">File: {item.fileName || "File name not provided"}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="muted">Your lecturer's published resources are listed here. Direct file opening will be enabled when authenticated download links are provided by the storage service.</p>
        </div>
      )}
    </section>
  );
}
