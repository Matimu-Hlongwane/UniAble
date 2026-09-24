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
            ? "UNIABLE is listening"
            : "Start voice input"
        }

        onClick={onStartListening}

        disabled={isListening}
      >

        🎙️

      </button>


      <p className="voice-question">

        {isListening
          ? "Listening... speak now"
          : voiceQuestion}

      </p>

    </div>
  );
}

export default MicrophoneButton;