import React, { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { isSpeechPaused, setSpeechPaused } from "../services/speechService";

const buttonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  minHeight: 42,
  padding: "10px 14px",
  borderRadius: 10,
  border: "1px solid currentColor",
  background: "var(--surface, #fff)",
  color: "var(--text-primary, #20243a)",
  font: "inherit",
  cursor: "pointer",
};

export default function SpokenOutputToggle({ floating = false }) {
  const [paused, setPaused] = useState(() => isSpeechPaused());

  useEffect(() => {
    const handlePauseChange = (event) => setPaused(Boolean(event.detail?.paused));
    window.addEventListener("uniable-speech-pause-change", handlePauseChange);
    return () => window.removeEventListener("uniable-speech-pause-change", handlePauseChange);
  }, []);

  const toggle = () => setPaused(setSpeechPaused(!paused));
  const button = (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={paused}
      aria-label={paused ? "Resume spoken output for this tab" : "Pause spoken output for this tab"}
      style={buttonStyle}
    >
      {paused ? <Volume2 size={18} aria-hidden="true" /> : <VolumeX size={18} aria-hidden="true" />}
      {paused ? "Resume spoken output" : "Pause spoken output"}
    </button>
  );

  if (!floating) return button;

  return (
    <aside
      aria-label="Spoken output controls"
      style={{
        position: "fixed",
        right: 16,
        bottom: "max(16px, env(safe-area-inset-bottom))",
        zIndex: 1300,
        padding: 8,
        border: "1px solid var(--border-color, #d8dced)",
        borderRadius: 13,
        background: "var(--bg-card, #fff)",
        boxShadow: "0 6px 22px rgb(22 29 62 / 18%)",
      }}
    >
      {button}
    </aside>
  );
}
