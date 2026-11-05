import React from "react";
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
      >

        {isListening
          ? "⏹ Stop Listening"
          : "🎙 Continue Speaking"}

      </button>


      <button
        type="button"
        className="action-button secondary-action"

        onClick={onSwitchToTyping}
      >

        ⌨ Switch to Typing

      </button>

    </div>
  );
}

export default SignUpActions;
