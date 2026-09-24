function SignUpHeader({
  mode,
  isListening
}) {

  const isTyping =
    mode === "typing";


  let statusText =
    "🎙 Ready to listen";


  if (isTyping) {

    statusText =
      "⌨ Typing Mode";

  }

  else if (isListening) {

    statusText =
      "🎙 Listening...";

  }


  return (
    <header className="signup-header">

      <p className="signup-brand">
        UNIABLE
      </p>


      <h1>

        {isTyping
          ? "Accessible Sign-Up"
          : "Voice-Guided Sign-Up"}

      </h1>


      <p className="signup-step">

        {isTyping
          ? "Complete your account details"
          : "Step 2 of 5 • Identity & Accessibility Profile"}

      </p>


      <div className="listening-badge">

        {statusText}

      </div>

    </header>
  );
}

export default SignUpHeader;