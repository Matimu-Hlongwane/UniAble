import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, XCircle, RefreshCw, Users } from "lucide-react";
import { api } from "../services/api";

export default function VolunteerApplications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getVolunteerApplications();
      setApplications(result.applications || []);
    } catch (err) {
      setError(err.message || "Could not load volunteer applications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function review(application, decision) {
    const verb = decision === "approved" ? "approve" : "reject";
    if (!window.confirm(`Are you sure you want to ${verb} ${application.name || "this applicant"}?`)) return;

    setBusyId(application.id);
    setError("");
    setMessage("");

    try {
      const result = await api.reviewVolunteerApplication(application.id, decision);
      setApplications(current => current.filter(item => item.id !== application.id));
      setMessage(result.message || `Application ${decision}.`);
    } catch (err) {
      setError(err.message || "Could not review this application.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <section className="staff-management-panel" style={{ marginBottom: 24 }}>
      <div className="staff-directory-heading">
        <div>
          <span className="staff-eyebrow">VOLUNTEER ONBOARDING</span>
          <h2><Users size={21} /> Volunteer applications</h2>
          <p>Review student applications before granting volunteer access.</p>
        </div>
        <button type="button" className="staff-refresh-button" onClick={load} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      {loading ? (
        <div className="staff-empty">Loading volunteer applications...</div>
      ) : applications.length === 0 ? (
        <div className="staff-empty">
          <Users size={24} />
          <strong>No pending volunteer applications</strong>
          <span>New applications will appear here for administrator review.</span>
        </div>
      ) : (
        <div className="staff-table-wrap">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>
              {applications.map(application => (
                <tr key={application.id}>
                  <td>{application.name || "Student"}</td>
                  <td>{application.createdAt ? new Date(application.createdAt).toLocaleString() : "—"}</td>
                  <td>Pending</td>
                  <td>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        disabled={!!busyId}
                        onClick={() => review(application, "approved")}
                      >
                        <CheckCircle2 size={15} /> {busyId === application.id ? "Saving..." : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={!!busyId}
                        onClick={() => review(application, "rejected")}
                      >
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
