import React from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";

export default function VoiceAssistanceToggle() {
  const { voiceAssistanceEnabled, setVoiceAssistanceEnabled } = useSettings();

  return (
    <button
      className="voice-assistance-toggle"
      type="button"
      aria-pressed={voiceAssistanceEnabled}
      onClick={() => setVoiceAssistanceEnabled(!voiceAssistanceEnabled)}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minHeight: 44,
        padding: "10px 14px",
        border: "1px solid currentColor",
        borderRadius: 10,
        background: "transparent",
        color: "inherit",
        cursor: "pointer",
      }}
    >
      {voiceAssistanceEnabled ? (
        <Volume2 size={18} aria-hidden="true" />
      ) : (
        <VolumeX size={18} aria-hidden="true" />
      )}
      Voice assistance: {voiceAssistanceEnabled ? "On" : "Off"}
    </button>
  );
}
