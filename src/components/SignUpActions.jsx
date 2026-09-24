function SignUpActions({
  onContinueSpeaking,
  onSwitchToTyping,
  isListening
}) {

  return (
    <div className="signup-actions">

      <button
        type="button"
        className="action-button primary-action"

        onClick={onContinueSpeaking}

        disabled={isListening}
      >

        {isListening
          ? "🎙 Listening..."
          : "🎙 Continue Speaking"}

      </button>


      <button
        type="button"
        className="action-button secondary-action"

        onClick={onSwitchToTyping}

        disabled={isListening}
      >

        ⌨ Switch to Typing

      </button>

    </div>
  );
}

export default SignUpActions;