import React from "react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import VoiceAssistanceToggle from "./VoiceAssistanceToggle";
import VoiceCommandButton from "./VoiceCommandButton";

export default function VoiceNavigationControls({ onCommand }) {
  const { voiceAssistanceEnabled } = useSettings();

  return (
    <div className="voice-navigation-controls" aria-label="Voice assistance controls">
      <VoiceAssistanceToggle />
      {voiceAssistanceEnabled && <VoiceCommandButton onCommand={onCommand} />}
    </div>
  );
}
