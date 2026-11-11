import React from "react";
function SignUpHeader({
  mode,
  isListening,
  voiceStep
}) {
  const isTyping =
    mode === "typing";
  const stepLabels = [
    "Full name",
    "Accessibility needs",
    "Student number",
    "Voice details captured"
  ];
  const statusText = isTyping
    ? "⌨ Typing mode"
    : isListening
      ? "🎙 Listening..."
      : "🎙 Ready for voice input";

  return (
    <header className="signup-header">
      <p className="signup-brand">UNIABLE</p>
      <h1>{isTyping ? "Accessible Sign-Up" : "Voice-Guided Sign-Up"}</h1>
      <p className="signup-step">
        {isTyping
          ? "Complete your account details"
          : `Step ${Math.min(voiceStep + 1, 3)} of 3 · ${stepLabels[voiceStep]}`}
      </p>
      <div className="listening-badge" role="status" aria-live="polite">
        {statusText}
      </div>
    </header>
  );
}

export default SignUpHeader;
