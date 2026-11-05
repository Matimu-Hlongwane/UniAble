import React, { useCallback, useEffect, useState , useRef} from "react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Settings, Siren, Users, MapPin, CalendarDays, ArrowLeft, Volume2, LogOut, ScanText } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import VoiceCommandButton from "./VoiceCommandButton";
import VoiceAssistanceToggle from "./VoiceAssistanceToggle";
import { subscribeToAuth, getVerificationStatus, signOutAccount, getCurrentUser, getCurrentUserRole } from "../services/firebaseAuth";
import { speak, stopSpeaking } from "../services/speechService";
import { resolveVoiceNavigationCommand } from "../services/voiceNavigation";

const links = [
  { to: "/dashboard", label: "home", icon: Home },
  { to: "/campus", label: "navigateCampus", icon: MapPin },
  { to: "/schedule", label: "mySchedule", icon: CalendarDays },
  { to: "/scan-read", label: "Scan & Read", icon: ScanText },
  { to: "/peer-assistance", label: "peerAssistance", icon: Users },
  { to: "/emergency", label: "emergency", icon: Siren }
];

const routeGuidance = {
  "/dashboard": "Dashboard. Your main options are campus navigation, your schedule, peer assistance, UniPal, emergency support, and settings. Say the name of a destination after activating the microphone.",
  "/campus": "Campus navigation. Explore campus destinations and route guidance. Use the back button or voice command to return to the dashboard.",
  "/schedule": "Your schedule. Review your classes and timetable. Use the back button or say dashboard to return home.",
  "/peer-assistance": "Peer assistance. Find student support and request help when available.",
  "/unipal": "UniPal, your UniAble companion. Ask a question or use the available text and spoken-response controls.",
  "/emergency": "Emergency support. Review the available SOS options. Activate an emergency action only when you intend to request help.",
  "/accessibility": "Accessibility settings. Choose your support profile and turn voice-first spoken guidance on or off.",
  "/settings": "Settings. Manage your language, spoken responses, privacy, and account options.",
};

export default function Layout() {
  const intentionalLogoutRef = useRef(false);
  const { t, locale, voiceAssistanceEnabled } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPage = location.pathname === "/staff/admin";
  const canGoBack = location.pathname !== "/dashboard";
  const [guidanceStatus, setGuidanceStatus] = useState("");
  const [authChecking, setAuthChecking] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const voiceAnnouncementRef = useRef("");

  useEffect(() => {
    const syncProfile = (user, updatedProfile = null) => {
      let savedProfile = {};
      try {
        savedProfile = JSON.parse(localStorage.getItem("uniableProfile") || "{}");
      } catch {
        savedProfile = {};
      }

      const currentUser = user || null;
      const name = updatedProfile?.displayName ||
        [savedProfile.firstName, savedProfile.lastName].filter(Boolean).join(" ") ||
        currentUser?.displayName ||
        "";

      setAuthUser(currentUser);
      setProfilePhoto(updatedProfile?.photoURL || currentUser?.photoURL || savedProfile.photo || "");
      setProfileName(name);
    };

    const unsubscribe = subscribeToAuth((user) => syncProfile(user));

    const handleProfileUpdate = (event) => {
      syncProfile(getCurrentUser(), event.detail || {});
    };

    const handleStorageUpdate = (event) => {
      if (event.key === "uniableProfile") {
        syncProfile(getCurrentUser());
      }
    };

    window.addEventListener("uniable-profile-updated", handleProfileUpdate);
    window.addEventListener("storage", handleStorageUpdate);

    return () => {
      unsubscribe?.();
      window.removeEventListener("uniable-profile-updated", handleProfileUpdate);
      window.removeEventListener("storage", handleStorageUpdate);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuth(async (user) => {
      if (!user) {
        if (active) {
          setAuthChecking(false);
          const shouldReturnToStaff =
            intentionalLogoutRef.current ||
            sessionStorage.getItem("uniableStaffLogout") === "1";

          sessionStorage.removeItem("uniableStaffLogout");

          navigate(
            shouldReturnToStaff ? "/staff" : "/login",
            { replace: true }
          );
        }
        return;
      }

      intentionalLogoutRef.current = false;
      try {
        const status = await getVerificationStatus();
        if (!active) return;
        if (status.required && !status.verified) {
          navigate("/signup?verification=pending", { replace: true });
          return;
        }
        setAuthChecking(false);
      } catch (error) {
        console.error("Could not confirm account verification:", error);
        if (active) { setAuthChecking(false); navigate("/login?verification=check", { replace: true }); }
      }
    });
    return () => { active = false; unsubscribe?.(); };
  }, [navigate]);

  useEffect(() => {
    if (!voiceAssistanceEnabled) return undefined;
    let cancelled = false;
    const guidance = voiceAnnouncementRef.current || routeGuidance[location.pathname] || (
      `You are on the ${location.pathname.split("/").filter(Boolean).join(" ").replace(/[-_]/g, " ") || "UniAble home"} page. ` +
      "Use the visible page controls, the back button, or activate the microphone to navigate. " +
      "The microphone only listens when you activate it."
    );
    voiceAnnouncementRef.current = "";
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const result = await speak(guidance, { locale: locale || "en-ZA" });
        if (!cancelled) {
          setGuidanceStatus(result?.started ? "Spoken page guidance started." : "Automatic speech is unavailable. Use Read this page aloud or your screen reader.");
        }
      } catch (error) {
        console.warn("Automatic page guidance failed:", error);
        if (!cancelled) setGuidanceStatus("Spoken page guidance failed. Use your screen reader or the visible controls.");
      }
    }, 100);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopSpeaking();
    };
  }, [location.pathname, locale, voiceAssistanceEnabled]);

  const handleVoiceCommand = useCallback((spokenText) => {
    const intent = resolveVoiceNavigationCommand(spokenText);
    if (!intent) {
      void speak(
        "I didn't recognise that command. Try dashboard, campus navigation, schedule, Scan and Read, peer assistance, UniPal, emergency support, accessibility settings, or settings.",
        { locale: locale || "en-ZA" }
      );
      return;
    }

    if (intent.action === "read") {
      const guidance = routeGuidance[location.pathname] ||
        "Use the visible page controls or say the name of a UniAble destination to navigate.";
      void speak(`I heard ${spokenText}. ${guidance}`, { locale: locale || "en-ZA" });
      return;
    }

    if (intent.action === "back") {
      if (location.pathname === "/dashboard") {
        voiceAnnouncementRef.current = `I heard ${spokenText}. You are already on your dashboard.`;
        void speak(voiceAnnouncementRef.current, { locale: locale || "en-ZA" });
        return;
      }
      voiceAnnouncementRef.current = `I heard ${spokenText}. Going back.`;
      navigate(-1);
      return;
    }

    if (location.pathname === intent.path) {
      void speak(`I heard ${spokenText}. You are already on ${intent.label}.`, { locale: locale || "en-ZA" });
      return;
    }

    voiceAnnouncementRef.current =
      `I heard ${spokenText}. Opening ${intent.label}. ${routeGuidance[intent.path] || ""}`;
    navigate(intent.path);
  }, [navigate, location.pathname, locale]);

  const profileInitial =
    (profileName || authUser?.email || "G").trim().charAt(0).toUpperCase() || "G";

  const handleProfileLogout = async () => {
    try {
      const currentUser = getCurrentUser();
      const role = currentUser ? await getCurrentUserRole(currentUser) : "student";
      const isStaff = ["admin", "lecturer", "volunteer", "disability_office", "security"].includes(role);

      intentionalLogoutRef.current = isStaff; if (isStaff) sessionStorage.setItem("uniableStaffLogout", "1");
    await signOutAccount();
      localStorage.removeItem("uniableProfile");
      setProfileMenuOpen(false);
      setAuthUser(null);
      setProfilePhoto("");
      setProfileName("");
      navigate(isStaff ? "/staff" : "/login", { replace: true });
    } catch (error) {
      console.error("Could not sign out:", error);
    }
  };

  if (authChecking) {
    return <main className="main-content" role="status" aria-live="polite">Checking your UniAble account...</main>;
  }

  return (
    <div className={`app-shell mobile-app-shell${isAdminPage ? " admin-route-shell" : ""}`}>
      <header className="topbar mobile-topbar">
        <Link to="/dashboard" className="brand" aria-label="UniAble home">UniAble <span></span></Link>
        <div className="top-actions">
          <div className="profile-menu-container">
            <button
              type="button"
              className="avatar profile-avatar-button"
              aria-label="Open profile menu"
              aria-haspopup="menu"
              aria-expanded={profileMenuOpen}
              onClick={() => setProfileMenuOpen((open) => !open)}
            >
              {profilePhoto ? (
                <img src={profilePhoto} alt="" className="profile-avatar-image" />
              ) : (
                profileInitial
              )}
            </button>

            {profileMenuOpen && (
              <div className="profile-dropdown" role="menu">
                <div className="profile-dropdown-user">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt="" className="profile-dropdown-image" />
                  ) : (
                    <span className="profile-dropdown-initial">{profileInitial}</span>
                  )}
                  <div className="profile-dropdown-details">
                    <strong>{profileName || "UniAble user"}</strong>
                    <span>{authUser?.email || ""}</span>
                  </div>
                </div>

                <Link
                  to="/settings"
                  className="profile-dropdown-link"
                  role="menuitem"
                  onClick={() => setProfileMenuOpen(false)}
                >
                  <Settings size={17} />
                  Profile settings
                </Link>

                <button
                  type="button"
                  className="profile-dropdown-logout"
                  role="menuitem"
                  onClick={handleProfileLogout}
                >
                  <LogOut size={17} />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="main-content mobile-main-content">
        <VoiceAssistanceToggle />
        <div className="voice-first-navigation" aria-label="Voice assistance controls">
            {voiceAssistanceEnabled && <p className="muted">Voice assistance is enabled. Use your device&apos;s Voice Control, Voice Access, or switch control to activate the Voice command button hands-free. UniAble listens only after you activate it.</p>}
            <button
              type="button"
              className="voice-first-read-guidance"
              onClick={async () => {
                const guidance = routeGuidance[location.pathname] || "You are in UniAble. Use the navigation options to move between pages.";
                try {
                  const result = await speak(guidance, { locale: locale || "en-ZA" });
                  setGuidanceStatus(result?.started ? "Reading page guidance aloud." : "Speech is unavailable on this device. Use your screen reader or the visible navigation controls.");
                } catch (error) {
                  console.warn("Manual page guidance failed:", error);
                  setGuidanceStatus("Speech failed to start. Use your screen reader or the visible navigation controls.");
                }
              }}
              style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", marginBottom: 10, borderRadius: 10, border: "1px solid currentColor", background: "transparent", color: "inherit", cursor: "pointer" }}
            >
              <Volume2 size={18} aria-hidden="true" /> Read this page aloud
            </button>
            {guidanceStatus && <p className="muted" role="status" aria-live="polite">{guidanceStatus}</p>}
            {voiceAssistanceEnabled && <VoiceCommandButton onCommand={handleVoiceCommand} />}
        </div>
        {canGoBack && <button className="page-back-button" type="button" onClick={() => navigate(-1)}><ArrowLeft size={17} />{t("back")}</button>}
        <Outlet />
      </main>
      <nav className="mobile-bottom-nav" aria-label={t("mainNavigation")}>
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? "mobile-nav-item active" : "mobile-nav-item"}>
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
