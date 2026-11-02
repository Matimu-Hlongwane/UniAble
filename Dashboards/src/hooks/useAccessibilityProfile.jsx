import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "uniable.accessibilityProfile";

const defaultProfile = {
  highContrast: false,
  textScale: 1,
  reduceMotion: false,
};

const AccessibilityContext = createContext(null);

function loadStoredProfile() {
  if (typeof window === "undefined") return defaultProfile;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? { ...defaultProfile, ...JSON.parse(raw) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

export function AccessibilityProvider({ children }) {
  const [profile, setProfile] = useState(loadStoredProfile);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.contrast = profile.highContrast ? "high" : "standard";
    root.style.setProperty("--text-scale", String(profile.textScale));
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Storage may be unavailable (private browsing) — profile still
      // applies for the current session via component state.
    }
  }, [profile]);

  const api = useMemo(
    () => ({
      profile,
      toggleHighContrast: () =>
        setProfile((p) => ({ ...p, highContrast: !p.highContrast })),
      setTextScale: (textScale) =>
        setProfile((p) => ({ ...p, textScale: Math.min(1.4, Math.max(0.9, textScale)) })),
    }),
    [profile]
  );

  return (
    <AccessibilityContext.Provider value={api}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibilityProfile() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error("useAccessibilityProfile must be used within AccessibilityProvider");
  }
  return ctx;
}
