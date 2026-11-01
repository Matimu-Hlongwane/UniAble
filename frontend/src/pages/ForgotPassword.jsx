import React, { useState } from "react";
import { Accessibility } from "lucide-react";
import { Link } from "react-router-dom";
import { sendPasswordResetEmailToUser } from "../services/firebaseAuth";
import "./AuthPages.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);

    try {
      await sendPasswordResetEmailToUser(email);
      setNotice("If an account is registered with that email address, a password-reset link will be sent. Check your inbox and spam folder.");
    } catch (err) {
      console.error("UniAble password-reset request failed:", err);
      if (err.code === "auth/invalid-email") {
        setError("Enter a valid email address and try again.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many requests. Please wait a little while before trying again.");
      } else {
        setError(err.message || "We could not process your request. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page auth-page--redesigned">
      <div className="auth-layout auth-layout--recovery">
        <aside className="auth-showcase" aria-label="UniAble account support">
          <Link className="auth-logo" to="/" aria-label="UniAble home">
  <span className="auth-logo-icon">
    <Accessibility size={25} aria-hidden="true" />
  </span>
  <span className="auth-logo-word">UniAble</span>
</Link>
          <div className="auth-showcase-copy">
            <p className="auth-showcase-kicker">YOUR ACCOUNT, YOUR ACCESS</p>
            <h1>A fresh start is just a link away.</h1>
            <p className="auth-showcase-description">
              We'll help you get back to your learning journey securely.
            </p>
          </div>
          <div className="auth-showcase-note">
            <span className="auth-showcase-mark" aria-hidden="true">U</span>
            <div>
              <strong>Your access matters.</strong>
              <p>Secure account recovery, with accessibility at every step.</p>
            </div>
          </div>
          <span className="auth-decoration auth-decoration--one" aria-hidden="true" />
          <span className="auth-decoration auth-decoration--two" aria-hidden="true" />
        </aside>

        <section className="auth-card auth-card--redesigned auth-card--recovery" aria-labelledby="recovery-heading">
          <div className="auth-mobile-brand">
            <Link className="auth-logo" to="/" aria-label="UniAble home">
  <span className="auth-logo-icon">
    <Accessibility size={25} aria-hidden="true" />
  </span>
  <span className="auth-logo-word">UniAble</span>
</Link>
          </div>
          <div className="auth-recovery-icon" aria-hidden="true">
            <svg viewBox="0 0 48 48" role="presentation">
              <path d="M8 13.5A3.5 3.5 0 0 1 11.5 10h25a3.5 3.5 0 0 1 3.5 3.5v21a3.5 3.5 0 0 1-3.5 3.5h-25A3.5 3.5 0 0 1 8 34.5v-21Z" />
              <path d="m10 13 14 11 14-11" />
              <path d="M18 31h12" />
            </svg>
          </div>
          <p className="auth-eyebrow">ACCOUNT RECOVERY</p>
          <h2 id="recovery-heading">Forgot your password?</h2>
          <p className="auth-description">
            Enter the email address linked to your UniAble account. If an account matches, we'll send you a secure reset link.
          </p>

          <form onSubmit={handleSubmit}>
            <label htmlFor="recovery-email">Email address</label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            {error && <p className="auth-error" role="alert">{error}</p>}
            {notice && <p className="auth-notice" role="status" aria-live="polite">{notice}</p>}

            <button className="auth-submit" type="submit" disabled={busy}>
              {busy ? "Sending reset linkâ€¦" : "Send password-reset link"}
            </button>
          </form>

          <Link className="auth-secondary-action auth-secondary-action--recovery" to="/login">
            Back to sign in
          </Link>
          <p className="auth-recovery-help">
            Still having trouble? Contact your campus support team.
          </p>
        </section>
      </div>
    </main>
  );
}
