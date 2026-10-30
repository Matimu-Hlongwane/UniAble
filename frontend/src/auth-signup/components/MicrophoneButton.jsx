import React from "react";

function MicrophoneButton({
  onStartListening,
  isListening,
  voiceQuestion
}) {
  return (
    <div className="microphone-section">
      <button
        type="button"
        className={
          isListening
            ? "microphone-button microphone-listening"
            : "microphone-button"
        }
        aria-label={
          isListening
            ? "UniAble is listening"
            : "Tap to speak. Activate microphone for voice input."
        }
        onClick={onStartListening}
        disabled={isListening}
      >
        <span className="microphone-icon" aria-hidden="true">
          🎙
        </span>

        <span className="microphone-button-label">
          {isListening ? "Listening..." : "Tap to Speak"}
        </span>
      </button>

      <p className="voice-question" aria-live="polite">
        {isListening
          ? "Listening... speak now"
          : voiceQuestion}
      </p>
    </div>
  );
}

export default MicrophoneButton;
