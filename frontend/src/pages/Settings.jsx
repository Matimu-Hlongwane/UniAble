import React, { useCallback, useEffect, useState , useRef} from "react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Settings, Siren, Users, MapPin, CalendarDays, ArrowLeft, Volume2, LogOut, ScanText } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import VoiceCommandButton from "../components/VoiceCommandButton";
import { getVoiceFirstPreference, subscribeToAuth, getVerificationStatus, signOutAccount, getCurrentUser, getCurrentUserRole } from "../services/firebaseAuth";
import { speak, stopSpeaking } from "../services/speechService";

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
  const { t, locale } = useSettings();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPage = location.pathname === "/staff/admin";
  const canGoBack = location.pathname !== "/dashboard";
  const [voiceFirstEnabled, setVoiceFirstEnabled] = useState(false);
  const [guidanceStatus, setGuidanceStatus] = useState("");
  const [authChecking, setAuthChecking] = useState(true);
  const [authUser, setAuthUser] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

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
          navigate(
            intentionalLogoutRef.current ? "/staff" : "/login",
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
    const handlePreferenceChange = (event) => setVoiceFirstEnabled(Boolean(event.detail?.enabled));
    window.addEventListener("uniable-voice-first-change", handlePreferenceChange);
    return () => window.removeEventListener("uniable-voice-first-change", handlePreferenceChange);
  }, []);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeToAuth(async (user) => {
      try {
        // Also honour the locally saved Blind / Low-Vision profile when a user
        // is not signed in. The previous code forced this to false.
        const preference = await getVoiceFirstPreference(user || null);
        if (active) setVoiceFirstEnabled(Boolean(preference));
      } catch (error) {
        console.warn("Could not load voice-first accessibility settings:", error);
        if (active) setVoiceFirstEnabled(false);
      }
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (!voiceFirstEnabled) return undefined;
    let cancelled = false;
    const guidance = routeGuidance[location.pathname] || (
      `You are on the ${location.pathname.split("/").filter(Boolean).join(" ").replace(/[-_]/g, " ") || "UniAble home"} page. ` +
      "Use the visible page controls, the back button, or activate the microphone to navigate. " +
      "The microphone only listens when you activate it."
    );
    const timer = window.setTimeout(async () => {
      if (cancelled) return;
      try {
        const result = await speak(guidance, { locale: locale || "en-ZA", rate: 0.94 });
        if (!cancelled) {
          setGuidanceStatus(result?.started ? "Spoken page guidance started." : "Automatic speech is unavailable. Use Read this page aloud or your screen reader.");
        }
      } catch (error) {
        console.warn("Automatic page guidance failed:", error);
        if (!cancelled) setGuidanceStatus("Spoken page guidance failed. Use your screen reader or the visible controls.");
      }
    }, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopSpeaking();
    };
  }, [location.pathname, locale, voiceFirstEnabled]);

  const handleVoiceCommand = useCallback((spokenText) => {
    const command = String(spokenText || "").toLowerCase().trim();
    if (!command) return;
    const matches = (...phrases) => phrases.some((phrase) => phrase && command.includes(String(phrase).toLowerCase()));
    if (matches("emergency", "sos", "help me", t("emergency"))) { navigate("/emergency"); return; }
    if (matches("campus", "navigate", "map", t("navigateCampus"))) { navigate("/campus"); return; }
    if (matches("schedule", "timetable", "classes", t("mySchedule"))) { navigate("/schedule"); return; }
    if (matches("peer assistance", "peer help", "peer support", t("peerAssistance"))) { navigate("/peer-assistance"); return; }
    if (matches("unipal", "uni pal", "companion")) { navigate("/unipal"); return; }
    if (matches("accessibility", "accessibility settings")) { navigate("/accessibility"); return; }
    if (matches("scan and read", "scan read", "scan document", "read document", "ocr")) { navigate("/scan-read"); return; }
    if (matches("home", "dashboard", t("home"))) { navigate("/dashboard"); return; }
    if (voiceFirstEnabled) speak("I did not recognise that destination. Try dashboard, campus, schedule, scan and read, peer assistance, UniPal, emergency, accessibility, or settings.", { locale: locale || "en-ZA" });
  }, [navigate, t, locale, voiceFirstEnabled]);

  const profileInitial =
    (profileName || authUser?.email || "G").trim().charAt(0).toUpperCase() || "G";

  const handleProfileLogout = async () => {
    try {
      const currentUser = getCurrentUser();
      const role = currentUser ? await getCurrentUserRole(currentUser) : "student";
      const isStaff = ["admin", "lecturer", "volunteer", "disability_office", "security"].includes(role);

      intentionalLogoutRef.current = true;
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
        {voiceFirstEnabled && (
          <div className="voice-first-navigation" aria-label="Voice-first navigation">
            <p className="muted">Voice-first guidance is enabled. If Edge blocks the first automatic announcement, select Read this page aloud once. Page guidance can then speak as you navigate. The microphone only listens when you activate it.</p>
            <button
              type="button"
              className="voice-first-read-guidance"
              onClick={async () => {
                const guidance = routeGuidance[location.pathname] || "You are in UniAble. Use the navigation options to move between pages.";
                try {
                  const result = await speak(guidance, { locale: locale || "en-ZA", rate: 0.94 });
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
            <VoiceCommandButton onCommand={handleVoiceCommand} />
          </div>
        )}
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
