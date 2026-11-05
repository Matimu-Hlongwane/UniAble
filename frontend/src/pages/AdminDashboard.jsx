import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, Users, UserCog, Building2, ClipboardCheck,
  BarChart3, Settings, ShieldCheck, Search, Bell,
  Menu, X, LayoutDashboard, ChevronRight, LockKeyhole, LogOut,
  AlertTriangle, MapPin, RefreshCw
} from "lucide-react";
import "./AdminDashboard.css";
import { api } from "../services/api";
import StaffManagement from "./StaffManagement";
import VoiceNavigationControls from "../components/VoiceNavigationControls";
import { useSettings } from "../context/settingsContext/SettingsContext";
import { speak } from "../services/speechService";

const sections = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "users", label: "User management", icon: Users },
  { id: "staff", label: "Staff management", icon: UserCog },
  { id: "departments", label: "Departments", icon: Building2 },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck },
  { id: "analytics", label: "Analytics and reports", icon: BarChart3 },
  { id: "settings", label: "System settings", icon: Settings },
  { id: "audit", label: "Audit logs", icon: ShieldCheck },
];

const descriptions = {
  users: "Manage student accounts, account status and platform access.",
  staff: "Manage lecturers and authorised university support personnel.",
  departments: "Manage institutional departments and staff assignments.",
  approvals: "Review pending account and access requests.",
  analytics: "Review platform usage and accessibility-service performance.",
  settings: "Manage institution-wide platform configuration and permissions.",
  audit: "Review administrative actions and changes across the platform.",
};

function formatAlertTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Time unavailable" : date.toLocaleString();
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { locale, voiceAssistanceEnabled } = useSettings();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    setDashboardError("");

    try {
      sessionStorage.setItem("uniableStaffLogout", "1");
      navigate("/staff", { replace: true });
    } catch (error) {
      setDashboardError(error.message || "Could not log out. Please try again.");
    } finally {
      setLoggingOut(false);
    }
  }
  const [active, setActive] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dashboard, setDashboard] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");
  const [sosAlerts, setSosAlerts] = useState([]);
  const [sosLoading, setSosLoading] = useState(true);
  const [sosError, setSosError] = useState("");
  const [sosWorkingId, setSosWorkingId] = useState("");
  const [sosActionError, setSosActionError] = useState("");

  async function loadSosAlerts() {
    try {
      setSosError("");
      setSosLoading(true);
      const result = await api.getSOS();
      setSosAlerts(result.alerts || []);
    } catch (error) {
      setSosError(error.message || "Unable to load SOS alerts.");
    } finally {
      setSosLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setDashboardLoading(true);
        setDashboardError("");
        const result = await api.getDashboard();
        if (active) setDashboard(result);
      } catch (error) {
        if (active) {
          setDashboardError(error.message || "Unable to load administration data.");
        }
      } finally {
        if (active) setDashboardLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadSosAlerts();
    const timer = window.setInterval(() => {
      void loadSosAlerts();
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  async function updateSosAlert(alertId, status) {
    setSosWorkingId(alertId);
    setSosActionError("");
    try {
      await api.updateSOS(alertId, status);
      await loadSosAlerts();
    } catch (error) {
      setSosActionError(error.message || "Unable to update the SOS alert.");
    } finally {
      setSosWorkingId("");
    }
  }

  const stats = dashboard?.stats || {};
  const statCards = [
    {
      label: "Total student accounts",
      icon: Users,
      value: stats.students ?? stats.totalStudents ?? "—",
    },
    {
      label: "Registered staff",
      icon: UserCog,
      value: stats.staff ?? stats.totalStaff ?? "—",
    },
    {
      label: "Active SOS alerts",
      icon: AlertTriangle,
      value: sosLoading && sosAlerts.length === 0 ? "…" : sosAlerts.length,
    },
    {
      label: "Pending approvals",
      icon: ClipboardCheck,
      value: stats.pendingApprovals ?? stats.pending ?? "—",
    },
  ];

  const current = sections.find((item) => item.id === active);
  const Icon = current?.icon || LayoutDashboard;

  function handleVoiceCommand(spokenText) {
    const command = String(spokenText || "").toLowerCase();
    const section = sections.find((item) => command.includes(item.label.toLowerCase()));
    if (section) {
      selectSection(section.id);
      return;
    }

    if (command.includes("student dashboard") || command.includes("student home")) {
      navigate("/dashboard");
      return;
    }

    void speak(
      "Say overview, user management, staff management, departments, approvals, analytics, system settings, or audit logs.",
      { locale: locale || "en-ZA" }
    );
  }

  useEffect(() => {
    if (!voiceAssistanceEnabled) return undefined;
    const timer = window.setTimeout(() => {
      void speak(`Administrator dashboard. ${current?.label || "Overview"} section. Say a section name to navigate.`, {
        locale: locale || "en-ZA",
      });
    }, 100);
    return () => window.clearTimeout(timer);
  }, [active, current?.label, locale, voiceAssistanceEnabled]);

  function selectSection(id) {
    setActive(id);
    setMobileOpen(false);
    setSearch("");
  }

  return (
    <div className="admin-shell">
      <VoiceNavigationControls onCommand={handleVoiceCommand} />
      {mobileOpen && (
        <button
          className="admin-mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? "admin-sidebar-open" : ""}`}>
        <div className="admin-brand">
          <div className="admin-brand-mark">U</div>
          <div>
            <strong>UniAble</strong>
            <span>STAFF PORTAL</span>
          </div>
          <button className="admin-close-menu" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <div className="admin-sidebar-label">ADMINISTRATION</div>

        <nav className="admin-navigation">
          {sections.map((item) => {
            const ItemIcon = item.icon;
            return (
              <button
                key={item.id}
                className={`admin-nav-item ${active === item.id ? "active" : ""}`}
                onClick={() => selectSection(item.id)}
              >
                <ItemIcon size={19} />
                <span>{item.label}</span>
                {active === item.id && <ChevronRight size={16} />}
              </button>
            );
          })}
        </nav>

        <div className="admin-sidebar-bottom">
          <div className="admin-secure-note">
            <LockKeyhole size={17} />
            <span>Restricted administrator access</span>
          </div>
          <div className="admin-profile">
            <div className="admin-avatar">AD</div>
            <div>
              <strong>Administrator</strong>
              <span>Platform administration</span>
            </div>
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <button className="admin-menu-button" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <div className="admin-breadcrumb">
            UniAble <span>/</span> Administration <span>/</span> {current?.label}
          </div>
          <div className="admin-topbar-actions">
            <label className="admin-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search this workspace"
              />
            </label>
            <button className="admin-icon-button" aria-label="Notifications">
              <Bell size={19} />
            </button>
            <button
              type="button"
              className="admin-logout-button"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut size={17} />
              {loggingOut ? "Signing out..." : "Log out"}
            </button>
          </div>
        </header>

        <div className="admin-content">
          <div className="admin-heading">
            <div>
              <p className="admin-eyebrow">UNIABLE PLATFORM MANAGEMENT</p>
              <h1>{active === "overview" ? "Administration overview" : current?.label}</h1>
              <p>
                {active === "overview"
                  ? "Manage the platform, institutional accounts and administrative services."
                  : descriptions[active]}
              </p>
            </div>
            <span className="admin-access-badge">
              <ShieldCheck size={16} /> Administrator
            </span>
          </div>

          {active === "staff" ? (
            <StaffManagement />
          ) : active === "overview" ? (
            <>
              <section className="admin-welcome">
                <div>
                  <span>ADMINISTRATIVE WORKSPACE</span>
                  <h2>Platform oversight and management</h2>
                  <p>
                    A central workspace for managing UniAble accounts,
                    institutional teams and platform configuration.
                  </p>
                </div>
                <div className="admin-welcome-icon">
                  <Building2 size={42} />
                </div>
              </section>

              <div className="admin-stat-grid">
                {statCards.map(({ label, icon: StatIcon, value }) => (
                  <article className="admin-stat-card" key={label}>
                    <div className="admin-stat-top">
                      <span>{label}</span>
                      <StatIcon size={20} />
                    </div>
                    <strong>{dashboardLoading ? "…" : value}</strong>
                    <small>
                      {dashboardLoading
                        ? "Loading live data"
                        : dashboardError
                          ? "Data unavailable"
                          : "From the UniAble database"}
                    </small>
                  </article>
                ))}
              </div>

              {dashboardError && (
                <div className="admin-empty-state" role="alert">
                  <strong>Dashboard data could not be loaded</strong>
                  <span>{dashboardError}</span>
                </div>
              )}

              <section className="admin-panel admin-sos-panel" aria-labelledby="admin-sos-heading">
                <div className="admin-sos-heading">
                  <div>
                    <span className="admin-eyebrow">STUDENT SAFETY</span>
                    <h2 id="admin-sos-heading">Active SOS alerts</h2>
                    <p>New alerts are checked automatically every 15 seconds.</p>
                  </div>
                  <button
                    className="admin-sos-refresh"
                    type="button"
                    onClick={() => void loadSosAlerts()}
                    disabled={sosLoading}
                  >
                    <RefreshCw size={16} className={sosLoading ? "admin-sos-spinning" : ""} />
                    Refresh
                  </button>
                </div>

                {sosError && (
                  <div className="admin-sos-error" role="alert">
                    <span>{sosError}</span>
                    <button type="button" onClick={() => void loadSosAlerts()}>Try again</button>
                  </div>
                )}
                {sosActionError && <p className="admin-sos-error" role="alert">{sosActionError}</p>}

                {sosLoading && sosAlerts.length === 0 ? (
                  <p className="admin-sos-empty" role="status">Loading SOS alerts…</p>
                ) : !sosError && sosAlerts.length === 0 ? (
                  <p className="admin-sos-empty">No active SOS alerts.</p>
                ) : (
                  <div className="admin-sos-list">
                    {sosAlerts.map((alert) => (
                      <article className="admin-sos-alert" key={alert.id}>
                        <div className="admin-sos-alert-icon" aria-hidden="true">
                          <AlertTriangle size={20} />
                        </div>
                        <div className="admin-sos-alert-details">
                          <strong>Emergency SOS</strong>
                          <span>Student: {alert.student || alert.studentId || "Not supplied"}</span>
                          <span>
                            <MapPin size={14} />
                            {alert.location
                              ? `${alert.location.lat}, ${alert.location.lng}`
                              : "Location unavailable"}
                          </span>
                          <time dateTime={alert.createdAt || undefined}>
                            Received {formatAlertTime(alert.createdAt)}
                          </time>
                        </div>
                        <div className="admin-sos-alert-actions">
                          <button
                            type="button"
                            onClick={() => void updateSosAlert(alert.id, "acknowledged")}
                            disabled={sosWorkingId === alert.id}
                          >
                            {sosWorkingId === alert.id ? "Updating…" : "Acknowledge"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void updateSosAlert(alert.id, "resolved")}
                            disabled={sosWorkingId === alert.id}
                          >
                            Resolve
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : (
            <section className="admin-panel admin-module-panel">
              <div className="admin-module-icon"><Icon size={27} /></div>
              <span className="admin-eyebrow">ADMINISTRATION MODULE</span>
              <h2>{current?.label}</h2>
              <p>{descriptions[active]}</p>
              <div className="admin-empty-state">
                <Activity size={25} />
                <strong>
                  {search ? "Search is ready for connected records" : "Module awaiting integration"}
                </strong>
                <span>
                  {search
                    ? "Connect the relevant backend records to enable searchable results."
                    : "The interface is prepared. Live records and administrative actions must be connected to secured backend services."}
                </span>
              </div>
            </section>
          )}

          <footer className="admin-footer">
            <span>UniAble · Administration Portal</span>
            <span>Secure institutional workspace</span>
          </footer>
        </div>
      </main>
    </div>
  );
}
