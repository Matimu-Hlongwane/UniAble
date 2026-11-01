import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  signInWithEmailPassword,
  sendPasswordlessSignInLink,
  isPasswordlessSignInLink,
  completePasswordlessSignIn,
  getCurrentUser,
  getVoiceFirstPreference,
  getCurrentUserRole,
} from "../services/firebaseAuth";
import { speak } from "../services/speechService";
import "./AuthPages.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState("password");
  const [emailLinkCallback, setEmailLinkCallback] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [guidanceStatus, setGuidanceStatus] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("mode") === "email-link") {
      setMode("email-link");
    }
    if (!isPasswordlessSignInLink(window.location.href)) return;

    setMode("email-link");
    setEmailLinkCallback(true);
    setNotice(
      "A sign-in link was detected. Enter the email address that received it to finish signing in."
    );

    try {
      const savedEmail = window.sessionStorage.getItem(
        "uniableEmailForSignIn"
      );
      if (savedEmail) setEmail(savedEmail);
    } catch {
      // The email can be entered manually if session storage is unavailable.
    }
  }, []);


  useEffect(() => {
    let cancelled = false;
    let timer;

    async function announcePage() {
      try {
        const profile = JSON.parse(window.localStorage.getItem("uniableAccessibilityProfile") || "null");
        const user = getCurrentUser();
        const userId = user?.uid;
        const userPreference = userId
          ? window.localStorage.getItem(`uniableVoiceFirst:${userId}`)
          : null;
        const userAccessibility = userId
          ? String(window.localStorage.getItem(`uniableAccessibility:${userId}`) || "").toLowerCase()
          : "";
        const isBlindProfile =
          profile?.id === "blind" ||
          userAccessibility.includes("visual impairment") ||
          userAccessibility.includes("blind") ||
          userAccessibility.includes("low vision");

        const manualPreference = userId
          ? window.localStorage.getItem(`uniableVoiceFirstManual:${userId}`) === "true"
          : window.localStorage.getItem("uniableVoiceFirstManual") === "true";
        let enabled = isBlindProfile && (userPreference !== "false" || !manualPreference);
        if (!enabled && user) enabled = await getVoiceFirstPreference(user);
        if (!enabled && !user) {
          enabled = window.localStorage.getItem("uniableVoiceFirstEnabled") === "true" ||
            (isBlindProfile && !manualPreference);
        }
        if (cancelled || !enabled) return;

        const guidance = isPasswordlessSignInLink(window.location.href)
          ? "UniAble email-link sign-in. The sign-in link has been opened. Enter the email address that received the link, then choose Complete sign-in. If the link has expired, request a new one. Never share your sign-in link."
          : mode === "email-link"
            ? emailLinkCallback
              ? "UniAble email-link sign-in. Enter the email address that received the sign-in link, then choose Complete sign-in. Never share your sign-in link."
              : "UniAble email sign-in. Enter your email address and choose Email me a sign-in link. Open the email on this device and follow the link. Never share your sign-in link."
            : "UniAble sign-in page. Enter your email address and password, or choose Email sign-in link. You can use Voice Login, create an account, or return to the landing page. Do not speak your password into the microphone.";

        timer = window.setTimeout(async () => {
          try {
            const result = await speak(guidance, { locale: "en-ZA", rate: 0.94 });
            if (!cancelled) {
              setGuidanceStatus(result?.started
                ? "Spoken guidance started."
                : "Spoken guidance could not start on this device. Use your screen reader or the Read this page aloud control.");
            }
          } catch (error) {
            console.warn("Sign-in page guidance failed:", error);
            if (!cancelled) setGuidanceStatus("Spoken guidance is unavailable. Use your screen reader and the visible sign-in instructions.");
          }
        }, 600);
      } catch (error) {
        console.warn("Could not determine voice-first preference:", error);
      }
    }

    announcePage();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [mode, emailLinkCallback]);


  async function redirectAfterSignIn() {
    const role = await getCurrentUserRole();

    const destinations = {
      student: "/dashboard",
      admin: "/staff/admin",
      lecturer: "/staff/lecturer",
      volunteer: "/staff/volunteer",
      disability_office: "/staff/disability",
      security: "/staff/security",
    };

    navigate(destinations[role] || "/dashboard", { replace: true });
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      if (mode === "email-link") {
        if (isPasswordlessSignInLink(window.location.href)) {
          await completePasswordlessSignIn(email, window.location.href);
          await redirectAfterSignIn();
        } else {
          await sendPasswordlessSignInLink(email);
          setNotice(
            "If the address can receive a sign-in link, check that inbox and follow the link on this device. Do not share the link with anyone."
          );
        }
      } else {
        await signInWithEmailPassword(email, password);
        await redirectAfterSignIn();
      }
    } catch (err) {
      console.error("UniAble sign-in failed:", err);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("The email address or password is incorrect.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait and try again.");
      } else if (
        err.code === "auth/invalid-action-code" ||
        err.code === "auth/expired-action-code"
      ) {
        setError("This sign-in link is invalid or expired. Request a new one.");
      } else {
        setError(
          err.message || "Unable to sign in. Please try again."
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function chooseMode(nextMode) {
    setMode(nextMode);
    setError("");
    setNotice("");
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-heading">
        <Link className="auth-brand" to="/">UniAble</Link>
        <p className="auth-eyebrow">YOUR ACCESSIBLE CAMPUS COMPANION</p>
        <h1 id="login-heading">Welcome back</h1>
        <p className="auth-description">
          Sign in using your password or a secure email link.
        </p>

        <div className="auth-mode-switch" aria-label="Sign-in method">
          <button
            type="button"
            className={mode === "password" ? "selected" : ""}
            aria-pressed={mode === "password"}
            onClick={() => chooseMode("password")}
          >
            Password
          </button>
          <button
            type="button"
            className={mode === "email-link" ? "selected" : ""}
            aria-pressed={mode === "email-link"}
            onClick={() => chooseMode("email-link")}
          >
            Email sign-in link
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="login-email">Email address</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {mode === "password" ? (
            <>
              <label htmlFor="login-password">Password</label>
              <div className="auth-password-field">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button
                  type="button"
                  className="auth-password-toggle"
                  aria-controls="login-password"
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? "Hide password" : "Show password"}
                </button>
              </div>
              <p className="auth-hint">
                You can use your screen reader, keyboard, or password manager.
                Do not speak your password into the microphone.
              </p>
            </>
          ) : (
            <p className="auth-hint">
              {emailLinkCallback
                ? "For your security, enter the email address that received the sign-in link."
                : "We will email you a one-time sign-in link. Open it on this device and never share it with anyone."}
            </p>
          )}

          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}

          <button className="auth-submit" type="submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : mode === "password"
                ? "Sign in"
                : emailLinkCallback
                  ? "Complete sign-in"
                  : "Email me a sign-in link"}
          </button>
        </form>

        <p className="auth-switch">
          Need voice-assisted sign-in? <Link to="/voice-login">Use Voice Login</Link>
        </p>
        <p className="auth-switch">
          New to UniAble? <Link to="/signup">Create an account</Link>
        </p>
        <Link className="auth-back" to="/">Back to home</Link>
        <button
          type="button"
          className="auth-back"
          onClick={async () => {
            const guidance = mode === "email-link"
              ? "UniAble email sign-in. Enter your email address and follow the instructions to request or complete your secure sign-in link. Never share the link."
              : "UniAble sign-in page. Enter your email address and password, or choose Email sign-in link. You can use Voice Login, create an account, or return to the landing page. Do not speak your password into the microphone.";
            try {
              const result = await speak(guidance, { locale: "en-ZA", rate: 0.94 });
              setGuidanceStatus(result?.started ? "Spoken guidance started." : "Speech could not start. Use your screen reader and the visible instructions.");
            } catch (error) {
              console.warn("Manual sign-in guidance failed:", error);
              setGuidanceStatus("Speech could not start. Use your screen reader and the visible instructions.");
            }
          }}
          style={{ display: "inline-flex", marginTop: 12, cursor: "pointer" }}
        >
          Read this page aloud
        </button>
        {guidanceStatus && <p className="auth-hint" role="status" aria-live="polite">{guidanceStatus}</p>}
      </section>
    </main>
  );
}
