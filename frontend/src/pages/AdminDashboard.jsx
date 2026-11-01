import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity, Users, UserCog, Building2, ClipboardCheck,
  BarChart3, Settings, ShieldCheck, Search, Bell,
  Menu, X, LayoutDashboard, ChevronRight, LockKeyhole, LogOut
} from "lucide-react";
import "./AdminDashboard.css";
import { api } from "../services/api";
import StaffManagement from "./StaffManagement";
import { signOutAccount } from "../services/firebaseAuth";

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

export default function AdminDashboard() {
  const navigate = useNavigate();
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
      label: "Departments",
      icon: Building2,
      value: stats.departments ?? stats.totalDepartments ?? "—",
    },
    {
      label: "Pending approvals",
      icon: ClipboardCheck,
      value: stats.pendingApprovals ?? stats.pending ?? "—",
    },
  ];

  const current = sections.find((item) => item.id === active);
  const Icon = current?.icon || LayoutDashboard;

  function selectSection(id) {
    setActive(id);
    setMobileOpen(false);
    setSearch("");
  }

  return (
    <div className="admin-shell">
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
