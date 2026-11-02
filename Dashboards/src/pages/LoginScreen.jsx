import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell.jsx";
import VoiceLoginPanel from "./login/VoiceLoginPanel.jsx";
import EmailLoginForm from "./login/EmailLoginForm.jsx";
import { isUsingMockAuth, signInWithVoiceprint } from "../services/firebase.js";
import { useSession } from "../auth/SessionContext.jsx";
import { ROLE_HOME } from "../auth/roles.js";
import "./LoginScreen.css";

export default function LoginScreen() {
  const [mode, setMode] = useState("voice");
  const [voiceError, setVoiceError] = useState(null);
  const navigate = useNavigate();
  const { signIn: startSession } = useSession();

  function handleSignedIn(signedInUser) {
    startSession(signedInUser);
    navigate(ROLE_HOME[signedInUser.role], { replace: true });
  }

  async function handleVoiceSuccess() {
    setVoiceError(null);
    try {
      handleSignedIn(await signInWithVoiceprint());
    } catch (err) {
      setVoiceError(err.message);
    }
  }

  return (
    <AuthShell footer="Your credentials are encrypted. Prefer to sign in another way? Switch anytime.">
      <div className="login-screen">
        <p className="login-screen__eyebrow">Welcome back</p>
        <h1 className="login-screen__title">Log in to UniAble</h1>
        <p className="login-screen__subtitle">
          Returning students are recognised by voiceprint, or sign in with your email.
        </p>

        {isUsingMockAuth && (
          <p className="login-screen__demo-note" role="note">
            Demo mode — no Firebase project connected. Password for every demo account:{" "}
            <code>Passw0rd!</code>. Emails: <code>student@</code>, <code>lecturer@</code>,{" "}
            <code>disability@</code>, <code>security@</code>, <code>admin@</code>,{" "}
            <code>admin2@</code> (all <code>uniable.ac.za</code>). Voice login signs in the demo student.
          </p>
        )}

        <div className="login-screen__tabs" role="tablist" aria-label="Login method">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "voice"}
            className={`login-screen__tab ${mode === "voice" ? "is-active" : ""}`}
            onClick={() => setMode("voice")}
          >
            Voice
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "email"}
            className={`login-screen__tab ${mode === "email" ? "is-active" : ""}`}
            onClick={() => setMode("email")}
          >
            Email &amp; password
          </button>
        </div>

        {voiceError && (
          <p className="login-screen__demo-note" role="alert">{voiceError}</p>
        )}

        <div className="login-screen__panel">
          {mode === "voice" ? (
            <VoiceLoginPanel
              onSuccess={handleVoiceSuccess}
              onUseEmailInstead={() => setMode("email")}
            />
          ) : (
            <EmailLoginForm
              onSuccess={handleSignedIn}
              onUseVoiceInstead={() => setMode("voice")}
            />
          )}
        </div>

        <p className="login-screen__switch">
          New to UniAble?{" "}
          <Link to="/sign-up" className="login-screen__link">
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
