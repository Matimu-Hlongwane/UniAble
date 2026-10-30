import React, { useEffect, useState } from "react";
import {
  Accessibility,
  ArrowRight,
  Brain,
  CheckCircle2,
  Eye,
  Volume2,
  HeartHandshake,
  MessageCircle,
  Sparkles,
  Zap,
} from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import {
  getCurrentUser,
  getUserAccessibilityProfile,
  saveUserAccessibilityProfile,
  getVoiceFirstPreference,
  setVoiceFirstPreference,
} from "../services/firebaseAuth";

const profiles = [
  ["blind", "Blind / Low-Vision", Eye, "Voice-first and screen-reader-friendly"],
  ["deaf", "Deaf / Hard-of-Hearing", MessageCircle, "Captions and visual alerts"],
  ["mobility", "Mobility-Impaired", Accessibility, "Step-free navigation and transport"],
  ["speech", "Speech-Impaired / Non-Verbal", MessageCircle, "Alternative communication tools"],
  ["colour", "Colour-Vision Deficiency", Accessibility, "High contrast and colour-friendly UI"],
  ["dyslexia", "Dyslexia", Brain, "Readable text and reduced clutter"],
  ["adhd", "ADHD", Zap, "Focus, timers and task planning"],
  ["autism", "Autism / Sensory-Friendly", Sparkles, "Predictable, calm and low-sensory"],
  ["down", "Down Syndrome / Cognitive Support", HeartHandshake, "Simple steps and visual support"],
  ["multiple", "Multi-Disability / Custom Adaptive", Accessibility, "Combine preferences in one profile"],
];

function readLocalProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem("uniableAccessibilityProfile") || "null");
    if (stored && profiles.some(([id]) => id === stored.id)) return stored;
  } catch {
    // Use the default profile when browser storage is unavailable or invalid.
  }

  return {
    id: "multiple",
    title: profiles[9][1],
    description: profiles[9][3],
  };
}

export default function AccessibilitySettings() {
  const { t } = useSettings();
  const [active, setActive] = useState(() => readLocalProfile().id);
  const [saveState, setSaveState] = useState("loading");
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [voiceFirstEnabled, setVoiceFirstEnabled] = useState(false);
  const [voicePreferenceSaving, setVoicePreferenceSaving] = useState(false);

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
          if (profile.id === "blind") setVoiceFirstEnabled(true);
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
    try {
      await setVoiceFirstPreference(enabled);
    } catch (error) {
      console.error("Could not save voice-first preference:", error);
      setVoiceFirstEnabled(!enabled);
    } finally {
      setVoicePreferenceSaving(false);
    }
  }

  const statusText = {
    loading: "Loading your profileâ€¦",
    ready: "Profile loaded",
    saving: "Saving your profileâ€¦",
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

      <div className="settings-intro" style={{ marginTop: 16 }}>
        <Volume2 size={28} aria-hidden="true" />
        <div style={{ flex: 1 }}>
          <strong>Voice-first spoken guidance</strong>
          <p>Read out page guidance and show a microphone control for voice navigation. The microphone only listens when you activate it.</p>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
            <input type="checkbox" checked={voiceFirstEnabled} onChange={handleVoiceFirstToggle} disabled={voicePreferenceSaving} />
            {voicePreferenceSaving ? "Saving preference…" : voiceFirstEnabled ? "Enabled for this account" : "Disabled"}
          </label>
        </div>
      </div>

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
