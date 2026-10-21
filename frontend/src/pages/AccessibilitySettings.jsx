import React, { useEffect, useState } from "react";
import { Accessibility, ArrowRight, Brain, CheckCircle2, Eye, HeartHandshake, MessageCircle, Sparkles, Zap } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";

const profiles = [
  ["blind","Blind / Low-Vision",Eye,"Voice-first and screen-reader-friendly"],
  ["deaf","Deaf / Hard-of-Hearing",MessageCircle,"Captions and visual alerts"],
  ["mobility","Mobility-Impaired",Accessibility,"Step-free navigation and transport"],
  ["speech","Speech-Impaired / Non-Verbal",MessageCircle,"Alternative communication tools"],
  ["colour","Colour-Vision Deficiency",Accessibility,"High contrast and colour-friendly UI"],
  ["dyslexia","Dyslexia",Brain,"Readable text and reduced clutter"],
  ["adhd","ADHD",Zap,"Focus, timers and task planning"],
  ["autism","Autism / Sensory-Friendly",Sparkles,"Predictable, calm and low-sensory"],
  ["down","Down Syndrome / Cognitive Support",HeartHandshake,"Simple steps and visual support"],
  ["multiple","Multi-Disability / Custom Adaptive",Accessibility,"Combine preferences in one profile"]
];

export default function AccessibilitySettings() {
  const { t } = useSettings();
  const [active, setActive] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("uniableAccessibilityProfile") || "{}").id || "multiple";
    } catch {
      return "multiple";
    }
  });

  useEffect(() => {
    const selected = profiles.find((item) => item[0] === active);
    if (selected) {
      localStorage.setItem("uniableAccessibilityProfile", JSON.stringify({
        id: selected[0],
        title: selected[1],
        description: selected[3],
      }));
    }
  }, [active]);

  return (
    <section className="page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("personalised")}</p>
          <h1>{t("accessibilityTitle")}</h1>
          <p className="muted">{t("accessibilityDescription")}</p>
        </div>
        <span className="profile-saved"><CheckCircle2 size={16}/> {t("profileReady")}</span>
      </div>

      <div className="settings-intro">
        <Accessibility size={28}/>
        <div><strong>{t("adaptiveProfile")}</strong><p>{t("adaptiveProfileDescription")}</p></div>
      </div>

      <div className="profile-grid">
        {profiles.map(([id,title,Icon,desc]) => (
          <button
            key={id}
            type="button"
            className={`profile-card ${active === id ? "selected" : ""}`}
            onClick={() => setActive(id)}
          >
            <div className="profile-card-icon"><Icon/></div>
            <div><strong>{title}</strong><p>{desc}</p></div>
            <ArrowRight size={17}/>
          </button>
        ))}
      </div>

      <div className="selected-profile">
        <div>
          <span className="eyebrow">{t("selectedExperience")}</span>
          <h2>{profiles.find(x => x[0] === active)?.[1]}</h2>
          <p className="muted">{t("adaptiveProfileDescription")}</p>
        </div>
        <span className="profile-saved"><CheckCircle2 size={16}/> {t("profileReady")}</span>
      </div>
    </section>
  );
}
