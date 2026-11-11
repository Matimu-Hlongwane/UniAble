import React, { useEffect, useState } from "react";
import {
  Accessibility,
  ArrowRight,
  CheckCircle2,
  Eye,
  Brain,
  MessageCircle,
  Volume2,
} from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import {
  getCurrentUser,
  getUserAccessibilityProfile,
  saveUserAccessibilityProfile,
  getVoiceFirstPreference,
  setVoiceFirstPreference,
} from "../services/firebaseAuth";
import { ACCESSIBILITY_NONE, ACCESSIBILITY_PROFILES } from "../data/accessibilityCategories";

const profilePresentation = {
  visual: [Eye, "Spoken guidance, screen-reader compatibility and clear visual content"],
  hearing: [MessageCircle, "Captions, written instructions and visible alerts"],
  mobility: [Accessibility, "Keyboard access, voice controls and campus assistance"],
  speech: [MessageCircle, "Text-based communication and alternative help requests"],
  neurodiverse: [Brain, "Clear instructions, reading support and predictable navigation"],
};

const profiles = [
  ["none", ACCESSIBILITY_NONE, Accessibility, "Choose this if you do not need a specific accessibility profile."],
  ...ACCESSIBILITY_PROFILES.map(({ id, value }) => [
    id,
    value,
    ...profilePresentation[id],
  ]),
];

function readLocalProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem("uniableAccessibilityProfile") || "null");
    if (stored && profiles.some(([id]) => id === stored.id)) return stored;
  } catch {
    // Use the default profile when browser storage is unavailable or invalid.
  }

  return {
    id: "none",
    title: profiles.find(([id]) => id === "none")[1],
    description: profiles.find(([id]) => id === "none")[3],
  };
}

export default function AccessibilitySettings() {
  const { t } = useSettings();
  const [active, setActive] = useState(() => readLocalProfile().id);
  const [saveState, setSaveState] = useState("loading");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [voiceFirstEnabled, setVoiceFirstEnabled] = useState(false);
  const [voicePreferenceSaving, setVoicePreferenceSaving] = useState(false);
  const [voicePreferenceStatus, setVoicePreferenceStatus] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const saved = await getUserAccessibilityProfile();
        const detailed = saved?.accessibilityProfile;
        const voicePreference = await getVoiceFirstPreference();

        if (!cancelled && detailed && profiles.some(([id]) => id === detailed.id)) {
          setActive(detailed.id);
        }
        if (!cancelled) {
          setVoiceFirstEnabled(Boolean(voicePreference));
        }
      } catch (error) {
        console.error("Could not load the saved accessibility profile:", error);
      } finally {
        if (!cancelled) {
          setSaveState("ready");
          setProfileLoaded(true);
        }
      }
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profileLoaded) return undefined;
    const selected = profiles.find(([id]) => id === active);
    if (!selected) return undefined;

    const profile = {
      id: selected[0],
      title: selected[1],
      description: selected[3],
    };

    try {
      localStorage.setItem("uniableAccessibilityProfile", JSON.stringify(profile));
    } catch (error) {
      console.warn("Could not save the local accessibility profile:", error);
    }

    let cancelled = false;

    async function saveProfile() {
      if (!getCurrentUser()) {
        if (!cancelled) setSaveState("local");
        return;
      }

      if (!cancelled) setSaveState("saving");

      try {
        await saveUserAccessibilityProfile(profile);
        if (!cancelled) {
          const savedVoiceFirst = await getVoiceFirstPreference();
          setVoiceFirstEnabled(Boolean(savedVoiceFirst));
          setSaveState("saved");
        }
      } catch (error) {
        console.error("Accessibility profile sync failed:", error);
        if (!cancelled) setSaveState("error");
      }
    }

    saveProfile();

    return () => {
      cancelled = true;
    };
  }, [active, profileLoaded]);

  const selectedProfile = profiles.find(([id]) => id === active) || profiles[9];

  async function handleVoiceFirstToggle(event) {
    const enabled = event.target.checked;
    setVoiceFirstEnabled(enabled);
    setVoicePreferenceSaving(true);
    setVoicePreferenceStatus("");
    try {
      await setVoiceFirstPreference(enabled);
      setVoicePreferenceStatus("Preference saved.");
    } catch (error) {
      console.error("Could not save voice-first preference:", error);
      setVoicePreferenceStatus("Saved on this device, but could not sync to your account.");
    } finally {
      setVoicePreferenceSaving(false);
    }
  }

  const statusText = {
    loading: "Loading your profileÃ¢â‚¬Â¦",
    ready: "Profile loaded",
    saving: "Saving your profileÃ¢â‚¬Â¦",
    saved: "Profile synced to your account",
    local: "Saved on this device. Sign in to sync across devices.",
    error: "Saved on this device; account sync failed. Check your connection and Firestore rules.",
  }[saveState];

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("personalised")}</p>
          <h1>{t("accessibilityTitle")}</h1>
          <p className="muted">{t("accessibilityDescription")}</p>
        </div>
        <span className="profile-saved">
          <CheckCircle2 size={16} /> {t("profileReady")}
        </span>
      </div>

      <div className="settings-intro">
        <Accessibility size={28} />
        <div>
          <strong>{t("adaptiveProfile")}</strong>
          <p>{t("adaptiveProfileDescription")}</p>
        </div>
      </div>

      <p role="status" aria-live="polite" className="muted">
        {statusText}
      </p>

      <section className="screen-reader-card" aria-labelledby="screen-reader-heading">
        <span className="screen-reader-card-icon" aria-hidden="true">
          <Volume2 size={22} />
        </span>
        <div className="screen-reader-card-copy">
          <div className="screen-reader-card-heading">
            <div>
              <h2 id="screen-reader-heading">Screen reader &amp; spoken guidance</h2>
              <p>
                Enable UniAble&apos;s spoken page guidance and hands-free voice navigation.
                Your device&apos;s screen reader remains under your control.
              </p>
            </div>
            <label className="screen-reader-switch">
              <span className="sr-only">Enable UniAble spoken guidance</span>
              <input
                type="checkbox"
                role="switch"
                checked={voiceFirstEnabled}
                onChange={handleVoiceFirstToggle}
                disabled={voicePreferenceSaving || !profileLoaded}
                aria-describedby="screen-reader-status"
              />
              <span className="screen-reader-switch-track" aria-hidden="true" />
            </label>
          </div>
          <div className="screen-reader-card-footer">
            <span className={`screen-reader-state${voiceFirstEnabled ? " is-enabled" : ""}`}>
              <span aria-hidden="true" />
              {voiceFirstEnabled ? "On" : "Off"}
            </span>
            <p id="screen-reader-status" className="screen-reader-status" role="status" aria-live="polite">
              {voicePreferenceSaving
                ? "Saving preference…"
                : voicePreferenceStatus || (voiceFirstEnabled ? "Spoken guidance is enabled." : "Spoken guidance is disabled.")}
            </p>
          </div>
        </div>
      </section>

      <p className="screen-reader-note">
        This setting controls UniAble&apos;s voice features only. It does not turn your operating system&apos;s screen reader on or off.
        Microphone access is requested only when you choose a voice control.
      </p>

      <div className="profile-grid">
        {profiles.map(([id, title, Icon, desc]) => (
          <button
            key={id}
            type="button"
            className={`profile-card ${active === id ? "selected" : ""}`}
            aria-pressed={active === id}
            onClick={() => setActive(id)}
          >
            <div className="profile-card-icon"><Icon /></div>
            <div>
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
            <ArrowRight size={17} />
          </button>
        ))}
      </div>

      <div className="selected-profile">
        <div>
          <span className="eyebrow">{t("selectedExperience")}</span>
          <h2>{selectedProfile[1]}</h2>
          <p className="muted">{t("adaptiveProfileDescription")}</p>
        </div>
        <span className="profile-saved">
          <CheckCircle2 size={16} /> {t("profileReady")}
        </span>
      </div>
    </section>
  );
}
