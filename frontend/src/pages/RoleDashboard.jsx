import React, { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Activity, ArrowRight, ClipboardList, HeartHandshake,
  LifeBuoy, LockKeyhole, MapPinned, RefreshCw,
  ShieldCheck, UserRoundCheck, CheckCircle2, LogOut, LayoutDashboard, Users
} from "lucide-react";
import { api } from "../services/api";
import { getCurrentUser, signOutAccount } from "../services/firebaseAuth";
import "./Dashboards.css";
import AdminDashboard from "./AdminDashboard";
import LecturerDashboard from "./LecturerDashboard";

const workspaces = {
  lecturer: {
    title: "Lecturer",
    description: "Manage lecture assistance requests and coordinate student support.",
  },
  volunteer: {
    title: "Volunteer",
    description: "Manage your availability and assigned peer-assistance requests.",
  },
  disability: {
    title: "Disability Office",
    description: "Review student accessibility profiles and coordinate support.",
  },
  security: {
    title: "Campus Security",
    description: "Monitor and respond to campus emergency alerts.",
  },
};

function Metric({ label, value, icon: Icon }) {
  return (
    <article className="admin-stat-card">
      <div className="admin-stat-top">
        <span>{label}</span><Icon size={20} />
      </div>
      <strong>{value ?? 0}</strong>
      <small>Live database information</small>
    </article>
  );
}

function RecordList({ items, emptyMessage, children }) {
  if (!items?.length) {
    return <div className="admin-empty-state"><span>{emptyMessage}</span></div>;
  }

  return (
    <div className="dashboard-role-module-grid">
      {items.map((item) => (
        <article className="dashboard-role-module" key={item.id || item.studentId}>
          {children(item)}
        </article>
      ))}
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleString();
}

export default function RoleDashboard() {
  const { role = "" } = useParams();
  const navigate = useNavigate();
  const normalRole = String(role).toLowerCase();
  const backendRole = normalRole === "disability" ? "disability_office" : normalRole;
  const isDedicatedStaffRole = ["disability", "security"].includes(normalRole);

  async function handleStaffLogout() {
    try {
      sessionStorage.setItem("uniableStaffLogout", "1");
      navigate("/staff", { replace: true });
    } catch (err) {
      setError(err.message || "Could not log out. Please try again.");
    }
  }

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [workingId, setWorkingId] = useState("");

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getDashboard();
      if (result.role !== backendRole) {
        throw new Error("Your account does not have access to this workspace.");
      }
      setData(result);
    } catch (err) {
      setError(err.message || "Could not load dashboard information.");
    } finally {
      setLoading(false);
    }
  }, [normalRole]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (normalRole === "admin") return <AdminDashboard />;
if (normalRole === "lecturer") return <LecturerDashboard requests={data?.requests || []} onRefreshRequests={loadDashboard} />;

  const workspace = workspaces[normalRole];

  if (!workspace) {
    return (
      <section className="page dashboard-page">
        <h1>Workspace not found</h1>
        <button onClick={() => navigate("/dashboard")}>
          Return to student dashboard
        </button>
      </section>
    );
  }

  const stats = data?.stats || {};
  const requests = data?.requests || [];
  const alerts = data?.alerts || [];
  const profiles = data?.accessibilityProfiles || [];

  async function performAction(id, action) {
    setWorkingId(id);
    setActionError("");
    try {
      await action();
      await loadDashboard();
    } catch (err) {
      setActionError(err.message || "The action could not be completed.");
    } finally {
      setWorkingId("");
    }
  }

  return (
    <div className={`staff-operations-shell role-dashboard role-dashboard-${normalRole}`}>
      {isDedicatedStaffRole && (
        <aside className="staff-operations-sidebar">
          <div className="staff-sidebar-brand">
            <span className="staff-brand-mark">U</span>
            <div>
              <strong>UniAble</strong>
              <small>STAFF SERVICES</small>
            </div>
          </div>

          <div className="staff-sidebar-profile">
            <span className="staff-sidebar-role-icon">
              {normalRole === "security" ? <ShieldCheck size={22} /> : <UserRoundCheck size={22} />}
            </span>
            <div>
              <strong>{normalRole === "security" ? "Campus Security" : "Disability Office"}</strong>
              <small>Staff workspace</small>
            </div>
          </div>

          <p className="staff-sidebar-label">WORKSPACE</p>
          <nav className="staff-sidebar-nav" aria-label="Staff dashboard navigation">
            <a href="#staff-overview">
              <LayoutDashboard size={18} /> Overview
            </a>
            <a href="#staff-records">
              {normalRole === "security" ? <LifeBuoy size={18} /> : <ClipboardList size={18} />}
              {normalRole === "security" ? "Emergency alerts" : "Support requests"}
            </a>
            {normalRole === "disability" && (
              <a href="#staff-accessibility-profiles">
                <Users size={18} /> Accessibility profiles
              </a>
            )}
          </nav>

          <div className="staff-sidebar-bottom">
            <div className="staff-sidebar-status">
              <span></span>
              Connected staff workspace
            </div>
            <button type="button" className="staff-logout-button" onClick={handleStaffLogout}>
              <LogOut size={18} /> Log out
            </button>
          </div>
        </aside>
      )}

      <main className={isDedicatedStaffRole ? "staff-operations-main" : ""}>
      <div className="dashboard-page-heading" id="staff-overview">
        <div>
          <p className="dashboard-eyebrow">UNIABLE STAFF SERVICES</p>
          <h1>{workspace.title} dashboard</h1>
          <p className="dashboard-date">{workspace.description}</p>
        </div>
        <span className="dashboard-role-badge">
          <LockKeyhole size={15} /> {workspace.title} workspace
        </span>
        {normalRole === "volunteer" && (
          <button
            type="button"
            className="staff-logout-button"
            onClick={handleStaffLogout}
          >
            <LogOut size={17} /> Log out
          </button>
        )}
      </div>

      <section className="dashboard-role-welcome">
        <div>
          <p className="dashboard-eyebrow">LIVE STAFF WORKSPACE</p>
          <h2>{workspace.title} operations</h2>
          <p>Information from the shared UniAble database for your signed-in account.</p>
        </div>
        <ShieldCheck size={34} />
      </section>

      <div className="dashboard-role-summary">
        {normalRole === "lecturer" && <>
          <Metric label="Lecture requests" value={stats.totalRequests} icon={ClipboardList} />
          <Metric label="Open requests" value={stats.openRequests} icon={Activity} />
          <Metric label="Completed requests" value={stats.completedRequests} icon={CheckCircle2} />
        </>}

        {normalRole === "volunteer" && <>
          <Metric label="Assigned requests" value={stats.assignedRequests} icon={ClipboardList} />
          <Metric label="Open assigned requests" value={stats.openRequests} icon={Activity} />
          <Metric label="Completed requests" value={stats.completedRequests} icon={CheckCircle2} />
          <Metric label="Availability" value={data?.availability ? "Available" : "Unavailable"} icon={HeartHandshake} />
        </>}

        {normalRole === "disability" && <>
          <Metric label="Support requests" value={stats.supportRequests} icon={ClipboardList} />
          <Metric label="Pending requests" value={stats.pendingRequests} icon={Activity} />
          <Metric label="Accessibility profiles" value={stats.accessibilityProfiles} icon={UserRoundCheck} />
        </>}

        {normalRole === "security" && <>
          <Metric label="Active SOS alerts" value={stats.activeSOS} icon={LifeBuoy} />
          <Metric label="Recent alerts" value={stats.totalRecentAlerts} icon={MapPinned} />
        </>}
      </div>

      <div className="dashboard-section-heading dashboard-role-section-heading" id="staff-records">
        <div>
          <p className="dashboard-eyebrow">LIVE DATABASE RECORDS</p>
          <h2>{normalRole === "security" ? "Emergency alerts" :
            normalRole === "disability" ? "Student support requests" :
            "Assistance requests"}</h2>
        </div>
        <button type="button" className="dashboard-primary-button"
          onClick={loadDashboard} disabled={loading}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {loading && <p role="status">Loading dashboard information...</p>}
      {error && <div className="dashboard-integration-notice" role="alert">{error}</div>}
      {actionError && <div className="dashboard-integration-notice" role="alert">{actionError}</div>}

      {!loading && !error && normalRole === "security" && (
        <RecordList items={alerts} emptyMessage="No emergency alerts have been recorded.">
          {(alert) => <>
            <span className="dashboard-module-status pending">{alert.status}</span>
            <h3>SOS emergency alert</h3>
            <p>Student: {alert.student || alert.studentId || "Not supplied"}</p>
            <p>Location: {alert.location?.lat ?? "—"}, {alert.location?.lng ?? "—"}</p>
            <p>Received: {formatDate(alert.createdAt)}</p>
            {alert.status === "active" && (
              <button className="dashboard-text-button"
                disabled={workingId === alert.id}
                onClick={() => performAction(alert.id,
                  () => api.updateSOS(alert.id, "acknowledged"))}>
                Acknowledge alert
              </button>
            )}
            {alert.status !== "resolved" && (
              <button className="dashboard-text-button"
                disabled={workingId === alert.id}
                onClick={() => performAction(alert.id,
                  () => api.updateSOS(alert.id, "resolved"))}>
                Resolve alert
              </button>
            )}
          </>}
        </RecordList>
      )}

      {!loading && !error && normalRole !== "security" && (
        <RecordList items={requests}
          emptyMessage="There are currently no matching assistance requests.">
          {(item) => <>
            <span className="dashboard-module-status available">{item.status || "unknown"}</span>
            <h3>{item.type || "Assistance request"}</h3>
            <p>{item.detail || "No additional details supplied."}</p>
            <p>Student: {item.student || item.studentId || "Not supplied"}</p>
            <p>Location: {item.location || "Not supplied"}</p>
            <p>Priority: {item.priority || "Normal"}</p>
            <p>Created: {formatDate(item.createdAt)}</p>
            {normalRole === "lecturer" && item.status !== "completed" && (
              <button className="dashboard-text-button"
                disabled={workingId === item.id}
                onClick={() => performAction(item.id,
                  () => api.updateRequest(item.id, "completed"))}>
                Mark completed
              </button>
            )}
          </>}
        </RecordList>
      )}

      {normalRole === "volunteer" && (
        <section className="admin-panel">
          <h2>Volunteer availability</h2>
          <p>Current status: <strong>{data?.availability ? "Available" : "Unavailable"}</strong></p>
          <button className="dashboard-primary-button"
            disabled={workingId === "availability" || !data?.volunteerRegistered}
            onClick={() => {
              const user = getCurrentUser();
              if (!user) {
                setActionError("Please sign in again.");
                return;
              }
              performAction("availability",
                () => api.setAvailability(user.uid, !data?.availability));
            }}>
            Change availability
          </button>
          {!data?.volunteerRegistered && (
            <p>Your volunteer account has not yet been registered or approved.</p>
          )}
        </section>
      )}

      {normalRole === "disability" && (
        <section className="admin-panel" id="staff-accessibility-profiles"><p className="dashboard-eyebrow">ACCESSIBILITY SERVICES</p>
          <h2>Student accessibility profiles</h2>
          <RecordList items={profiles}
            emptyMessage="No accessibility profiles have been recorded.">
            {(profile) => <>
              <h3>{profile.displayName || profile.studentId}</h3>
              <p>Student ID: {profile.studentId}</p>
              <p>Preferred language: {profile.language || "Not specified"}</p>
              <p>Font size: {profile.fontSize || "Default"}</p>
              <p>High contrast: {profile.highContrast ? "Enabled" : "Disabled"}</p>
              <p>Screen reader: {profile.screenReader ? "Enabled" : "Disabled"}</p>
            </>}
          </RecordList>
        </section>
      )}
    </main>
  </div>
  );
}

