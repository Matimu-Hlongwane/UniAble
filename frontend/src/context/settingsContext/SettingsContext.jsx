import { translations, getLanguageLocale } from "./translations";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { stopSpeaking } from "../../services/speechService";

const SettingsContext = createContext(null);

const DEFAULT_SETTINGS = {
  theme: "light",
  language: "English",
  fontSize: "medium",
  voiceAssistanceEnabled: true,
  spokenResponses: true,
  notifications: { emergency: true, assistance: true, timetable: true, announcements: true, email: false, push: true },
  privacy: { location: true, activity: false, profileVisibility: true },
};

function getSavedSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem("uniableSettings") || "null");
    if (!parsed) return DEFAULT_SETTINGS;
    return {
      ...DEFAULT_SETTINGS, ...parsed,
      theme: parsed.theme === "system" ? "light" : (parsed.theme || "light"),
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
      privacy: { ...DEFAULT_SETTINGS.privacy, ...(parsed.privacy || {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(getSavedSettings);
  const { theme, language, fontSize, notifications, privacy } = settings;
  const voiceAssistanceEnabled = settings.voiceAssistanceEnabled !== false;
  const spokenResponses = settings.spokenResponses !== false;
  const t = useCallback((key) => translations[language]?.[key] || translations.English[key] || key, [language]);
  const locale = getLanguageLocale(language);

  useEffect(() => {
    localStorage.setItem("uniableSettings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!voiceAssistanceEnabled) stopSpeaking();
  }, [voiceAssistanceEnabled]);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", theme === "dark" ? "dark" : "light");
    root.setAttribute("data-font-size", fontSize);
    root.setAttribute("lang", locale);
  }, [theme, fontSize, locale]);

  const setTheme = (newTheme) => setSettings((p) => ({ ...p, theme: newTheme === "dark" ? "dark" : "light" }));
  const setVoiceAssistanceEnabled = useCallback(
    (enabled) => setSettings((p) => ({ ...p, voiceAssistanceEnabled: Boolean(enabled) })),
    []
  );
  const setSpokenResponses = (enabled) => setSettings((p) => ({ ...p, spokenResponses: Boolean(enabled) }));
  const setLanguage = (newLanguage) => setSettings((p) => ({ ...p, language: newLanguage }));
  const setFontSize = (newFontSize) => setSettings((p) => ({ ...p, fontSize: newFontSize }));
  const setNotification = (name, value) => setSettings((p) => ({ ...p, notifications: { ...p.notifications, [name]: value } }));
  const setPrivacy = (name, value) => setSettings((p) => ({ ...p, privacy: { ...p.privacy, [name]: value } }));
  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  const value = useMemo(() => ({
    settings, theme, setTheme, language, setLanguage, locale, t,
    voiceAssistanceEnabled, setVoiceAssistanceEnabled,
    fontSize, setFontSize, spokenResponses, setSpokenResponses, notifications, setNotification, privacy, setPrivacy, resetSettings,
  }), [settings, theme, language, locale, voiceAssistanceEnabled, setVoiceAssistanceEnabled, fontSize, spokenResponses, notifications, privacy, t]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

// This file intentionally exports its provider and matching context hook.
// eslint-disable-next-line react-refresh/only-export-components
export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used inside SettingsProvider");
  return context;
}
