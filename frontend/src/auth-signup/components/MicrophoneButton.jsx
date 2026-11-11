import React from "react";

function MicrophoneButton({
  onStartListening,
  onStopListening,
  isListening,
  voiceQuestion,
  transcript
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
        aria-label={isListening ? "Stop voice input" : "Tap to speak. Activate microphone for voice input."}
        onClick={isListening ? onStopListening : onStartListening}
      >
        <span className="microphone-icon" aria-hidden="true">
          🎙
        </span>

        <span className="microphone-button-label">
          {isListening ? "Stop Listening" : "Tap to Speak"}
        </span>
      </button>

      <p className="voice-question" aria-live="polite">
        {isListening
          ? transcript
            ? `Listening: ${transcript}`
            : "Listening... speak now"
          : voiceQuestion}
      </p>
      {transcript && (
        <p className="voice-transcript" aria-live="polite">
          You said: {transcript}
        </p>
      )}
    </div>
  );
}

export default MicrophoneButton;
