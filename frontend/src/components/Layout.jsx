import React from "react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Settings, Siren, Users, MapPin, CalendarDays, ArrowLeft, MessageCircle } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";

const links = [
  { to: "/dashboard", label: "home", icon: Home },
  { to: "/campus", label: "navigateCampus", icon: MapPin },
  { to: "/schedule", label: "mySchedule", icon: CalendarDays },
  { to: "/peer-assistance", label: "peerAssistance", icon: Users },
  { to: "/emergency", label: "emergency", icon: Siren }
];

export default function Layout() {
  const { t } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const canGoBack = location.pathname !== "/dashboard";

  return (
    <div className="app-shell mobile-app-shell">
      <header className="topbar mobile-topbar">
        <Link to="/dashboard" className="brand" aria-label="UniAble home">
          UniAble <span>•</span>
        </Link>

        <div className="top-actions">
          <Link
            to="/settings"
            className="icon-btn top-settings"
            aria-label={t("settings")}
            title={t("settings")}
          >
            <Settings size={20} />
          </Link>
          <div className="avatar" aria-label="Signed in user">G</div>
        </div>
      </header>

      <main className="main-content mobile-main-content">
        {canGoBack && (
          <button className="page-back-button" type="button" onClick={() => navigate(-1)}>
            <ArrowLeft size={17} />
            {t("back")}
          </button>
        )}
        <Outlet />
      </main>

      <nav className="mobile-bottom-nav" aria-label={t("mainNavigation")}>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}
          >
            <Icon size={21} strokeWidth={isActivePath(location.pathname, to) ? 2.3 : 1.9} />
            <span>{t(label)}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

function isActivePath(pathname, target) {
  return pathname === target || pathname.startsWith(`${target}/`);
}
