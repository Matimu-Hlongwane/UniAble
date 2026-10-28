import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Accessibility,
  Mic,
  Volume2,
  Mail,
  Globe,
  Sparkles,
} from "lucide-react";
import "./LandingPrototype.css";

export default function Landing() {
  const [guestMessage, setGuestMessage] = useState("");

  return (
    <main className="landing-page" id="main-content">
      <a className="landing-skip-link" href="#landing-actions">
        Skip to main content
      </a>

      <div className="landing-container">
        <header className="landing-brand">
          <div className="landing-brand-icon" aria-hidden="true">
            <Accessibility size={36} strokeWidth={2} />
          </div>

          <h1>UniAble</h1>
          <p className="landing-tagline">
            Inclusion Starts With Access
          </p>
        </header>

        <section
          className="landing-entry-actions"
          id="landing-actions"
          aria-label="Choose how to use UniAble"
        >
          <Link
            className="landing-action-button landing-action-primary"
            to="/signup"
          >
            <Mic size={20} aria-hidden="true" />
            <span>Voice Sign-Up (New Student)</span>
          </Link>

          <Link
            className="landing-action-button landing-action-outline"
            to="/voice-login"
          >
            <Volume2 size={20} aria-hidden="true" />
            <span>Voice Login (Returning Student)</span>
          </Link>

          <Link
            className="landing-action-button landing-action-outline"
            to="/login"
          >
            <Mail size={20} aria-hidden="true" />
            <span>Login with Email</span>
          </Link>

          <button
            className="landing-action-button landing-action-guest"
            type="button"
            onClick={() =>
              setGuestMessage(
                "Guest access is not available yet. Please sign in or create an account."
              )
            }
          >
            <Accessibility size={20} aria-hidden="true" />
            <span>Continue as Guest</span>
          </button>
        </section>

        {guestMessage && (
          <p className="landing-status-message" role="status" aria-live="polite">
            {guestMessage}
          </p>
        )}

        <aside
          className="landing-information-card"
          aria-label="Language accessibility"
        >
          <Globe
            className="landing-information-icon"
            size={24}
            aria-hidden="true"
          />
          <p>
            South African language support for accessible,
            voice-guided student experiences.
          </p>
        </aside>

        <aside
          className="landing-assistant-card"
          aria-label="UniAble voice assistant information"
        >
          <div className="landing-assistant-heading">
            <Sparkles size={18} aria-hidden="true" />
            <strong>Say “Hey UniAble”</strong>
          </div>
          <p>
            Your accessible campus companion, designed around your needs.
          </p>
        </aside>

        <footer className="landing-footer">
          <Accessibility size={17} aria-hidden="true" />
          <p>Designed for access. Built for everyone.</p>
        </footer>
      </div>
    </main>
  );
}
