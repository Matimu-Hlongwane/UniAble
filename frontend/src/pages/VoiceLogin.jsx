import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { signInWithEmailPassword, getCurrentUserRole } from "../services/firebaseAuth";
import { speak } from "../services/speechService";
import "./VoiceLogin.css";

function cleanSpokenEmail(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\bat sign\b|\bat\b/g, "@")
    .replace(/\bdot\b/g, ".")
    .replace(/\s+at\s+/g, "@")
    .replace(/\s+/g, "");
}

function browserRecognizeEmail() {
  return new Promise((resolve, reject) => {
    const BrowserRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!BrowserRecognition) {
      reject(new Error("Voice recognition is not supported in this browser."));
      return;
    }

    const recognition = new BrowserRecognition();
    recognition.lang = "en-ZA";
    recognition.maxAlternatives = 3;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) resolve(transcript);
      else reject(new Error("I could not hear an email address. Please try again."));
    };

    recognition.onerror = () => {
      reject(new Error("I could not recognise your email. Please try again or type it."));
    };

    recognition.onend = () => {};
    recognition.start();
  });
}

export default function VoiceLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Press the microphone and say your email address.");
  const [error, setError] = useState("");

  const instructionText = "Welcome to UniAble voice-assisted sign-in. You can activate the microphone to speak your email address, or type your email. For account security, passwords are not read aloud and should not be spoken into the microphone. You may type your password or choose the passwordless email sign-in link option. Use the back to home link to return to the landing page.";

  useEffect(() => {
    // This screen is explicitly opened by the user. Try to read the instructions
    // automatically; the visible read-aloud control remains if the browser blocks it.
    const timer = window.setTimeout(async () => {
      try {
        const result = await speak(instructionText, { locale: "en-ZA", rate: 0.94 });
        if (!result?.started) {
          setMessage("Edge did not start automatic speech. Select Read instructions aloud once to allow spoken guidance, or continue with the visible controls.");
        } else {
          setMessage("Spoken sign-in instructions are playing. The microphone is off until you select Speak your email.");
        }
      } catch (speechError) {
        console.warn("Voice Login automatic guidance failed:", speechError);
        setMessage("Automatic speech could not start. Select Read instructions aloud or use your screen reader.");
      }
    }, 400);
    return () => window.clearTimeout(timer);
    // Read the fixed instructions once when this page opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function captureEmail() {
    if (listening || busy) return;

    setListening(true);
    setError("");
    setMessage("Listening for your email address…");

    try {
      let transcript = "";

      try {
        const permission = await SpeechRecognition.requestPermissions();
        const state = permission?.speechRecognition;
        if (state && state !== "granted") {
          throw new Error("Microphone permission was not granted.");
        }

        const result = await SpeechRecognition.start({
          language: "en-ZA",
          maxResults: 3,
          prompt: "Say your email address",
          partialResults: false
        });

        transcript = result?.matches?.[0] || "";
      } catch (nativeError) {
        // Use browser speech recognition if the native plugin is unavailable.
        if (nativeError?.message?.includes("permission")) throw nativeError;
        transcript = await browserRecognizeEmail();
      }

      const cleaned = cleanSpokenEmail(transcript);

      if (!cleaned.includes("@") || !cleaned.includes(".")) {
        throw new Error("That did not sound like a complete email address. Try again or type it.");
      }

      setEmail(cleaned);
      setMessage(`Email captured: ${cleaned}. Check it before signing in.`);
    } catch (captureError) {
      setError(captureError?.message || "Voice input failed. You can type your email instead.");
      setMessage("Voice input did not complete.");
    } finally {
      setListening(false);
      try {
        await SpeechRecognition.stop();
      } catch {
        // It is okay if recognition has already stopped.
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);

    try {
      await signInWithEmailPassword(email.trim(), password);
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
    } catch (err) {
      console.error("UniAble voice-assisted login failed:", err);

      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/wrong-password" ||
        err.code === "auth/user-not-found"
      ) {
        setError("The email address or password is incorrect.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please wait and try again.");
      } else {
        setError(err.message || "Unable to sign in. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function readInstructions() {
    try {
      const result = await speak(instructionText, { locale: "en-ZA", rate: 0.94 });
      setMessage(result?.started
        ? "Reading the sign-in instructions aloud. The microphone remains off."
        : "Edge could not start speech. Check that Windows has an English speech voice installed.");
    } catch (speechError) {
      console.warn("Voice Login read-aloud failed:", speechError);
      setMessage("Speech could not start. Check your Windows speech settings and try again.");
    }
  }

  return (
    <main className="voice-login-page">
      <section className="voice-login-card" aria-labelledby="voice-login-heading">
        <Link className="voice-login-brand" to="/">UniAble</Link>
        <p className="voice-login-eyebrow">ACCESSIBLE SIGN-IN</p>
        <h1 id="voice-login-heading">Voice Login</h1>
        <p className="voice-login-description">
          Use your voice to enter your email, then sign in securely with your password.
        </p>

        <button
          className="voice-login-mic"
          type="button"
          onClick={captureEmail}
          disabled={listening || busy}
          aria-label={listening ? "Listening for email address" : "Speak email address"}
        >
          {listening ? <MicOff size={30} /> : <Mic size={30} />}
          <span>{listening ? "Listening…" : "Speak your email"}</span>
        </button>

        <p className="voice-login-status" role="status" aria-live="polite">
          {message}
        </p>

        <button className="voice-login-read" type="button" onClick={readInstructions}>
          <Volume2 size={18} /> Read instructions aloud
        </button>

        <form onSubmit={handleSubmit} className="voice-login-form">
          <label htmlFor="voice-login-email">Email address</label>
          <input
            id="voice-login-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Check or type your email"
            required
          />

          <label htmlFor="voice-login-password">Password</label>
          <input
            id="voice-login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            required
          />

          {error && <p className="voice-login-error" role="alert">{error}</p>}

          <button className="voice-login-submit" type="submit" disabled={busy || listening}>
            {busy ? "Signing in…" : "Confirm and sign in"}
          </button>
        </form>

        <p className="voice-login-switch">
          Prefer typing? <Link to="/login">Login with Email and password</Link>
        </p>
        <p className="voice-login-switch">
          Don&apos;t want to enter a password? <Link to="/login?mode=email-link">Use a secure email sign-in link</Link>
        </p>
        <p className="voice-login-switch">
          Need an account? <Link to="/signup">Create an account</Link>
        </p>
        <Link className="voice-login-back" to="/">← Back to landing page</Link>
      </section>
    </main>
  );
}
