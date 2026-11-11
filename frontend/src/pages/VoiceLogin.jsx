import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSettings } from "../context/settingsContext/SettingsContext";
import VoiceAssistanceToggle from "../components/VoiceAssistanceToggle";
import { Accessibility, Mic, MicOff, Volume2 } from "lucide-react";
import { signInWithEmailPassword, getCurrentUserRole } from "../services/firebaseAuth";
import { isNative, startNativeVoiceRecognition } from "../services/platformVoice";
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

export default function VoiceLogin() {
  const navigate = useNavigate();
  const { voiceAssistanceEnabled, locale } = useSettings();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [listening, setListening] = useState(false);
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Press the microphone and say your email address.");
  const [error, setError] = useState("");
  const nativeStopRef = useRef(null);
  const browserRecognitionRef = useRef(null);
  const mountedRef = useRef(true);

  const instructionText = "Welcome to UniAble voice-assisted sign-in. You can activate the microphone to speak your email address, or type your email. For account security, passwords are not read aloud and should not be spoken into the microphone. You may type your password or choose the passwordless email sign-in link option. Use the back to home link to return to the landing page.";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      browserRecognitionRef.current?.abort?.();
      void nativeStopRef.current?.();
    };
  }, []);

  useEffect(() => {
    if (!voiceAssistanceEnabled) return undefined;
    // This screen is explicitly opened by the user. Try to read the instructions
    // automatically; the visible read-aloud control remains if the browser blocks it.
    const timer = window.setTimeout(async () => {
      try {
        const result = await speak(instructionText, { locale: locale || "en-ZA" });
        if (!result?.started) {
          setMessage("Edge did not start automatic speech. Select Read instructions aloud once to allow spoken guidance, or continue with the visible controls.");
        } else {
          setMessage("Spoken sign-in instructions are playing. The microphone is off until you select Speak your email.");
        }
      } catch (speechError) {
        console.warn("Voice Login automatic guidance failed:", speechError);
        setMessage("Automatic speech could not start. Select Read instructions aloud or use your screen reader.");
      }
    }, 100);
    return () => window.clearTimeout(timer);
    // Read the fixed instructions once when this page opens.
  }, [voiceAssistanceEnabled, locale]);

  async function captureEmail() {
    if (busy) return;
    if (listening) {
      await stopListening();
      return;
    }

    setListening(true);
    setError("");
    setRecordingTranscript("");
    setMessage("Listening for your email address…");

    try {
      if (isNative()) {
        nativeStopRef.current = await startNativeVoiceRecognition({
          language: locale || "en-ZA",
          onResult: (transcript, isFinal) => {
            if (!mountedRef.current) return;
            setRecordingTranscript(transcript);
            if (isFinal) applySpokenEmail(transcript);
          },
          onError: (voiceError) => {
            console.error("Native email recognition failed:", voiceError);
            if (mountedRef.current) {
              setError(voiceError?.message || "Voice input failed. You can type your email instead.");
              setMessage("Voice input did not complete.");
              setListening(false);
            }
          },
          onEnd: () => {
            nativeStopRef.current = null;
            if (mountedRef.current) setListening(false);
          },
        });
        return;
      }

      const BrowserRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!BrowserRecognition) {
        throw new Error("Voice recognition is not supported in this browser. You can type your email instead.");
      }

      const recognition = new BrowserRecognition();
      browserRecognitionRef.current = recognition;
      recognition.lang = locale || "en-ZA";
      recognition.maxAlternatives = 1;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const result = event.results?.[event.resultIndex];
        const transcript = String(result?.[0]?.transcript || "").trim();
        if (!transcript || !mountedRef.current) return;
        setRecordingTranscript(transcript);
        if (result.isFinal) applySpokenEmail(transcript);
      };
      recognition.onerror = (event) => {
        if (!mountedRef.current) return;
        setError(event.error === "not-allowed"
          ? "Microphone permission was denied. Allow microphone access or type your email."
          : "Voice recognition failed. Please try again or type your email.");
        setMessage("Voice input did not complete.");
        setListening(false);
      };
      recognition.onend = () => {
        browserRecognitionRef.current = null;
        if (mountedRef.current) setListening(false);
      };
      recognition.start();
    } catch (captureError) {
      console.error("Voice email capture failed:", captureError);
      if (mountedRef.current) {
        setError(captureError?.message || "Voice input failed. You can type your email instead.");
        setMessage("Voice input did not complete.");
        setListening(false);
      }
    }
  }

  function applySpokenEmail(transcript) {
    const cleaned = cleanSpokenEmail(String(transcript || ""));
    if (!cleaned || !mountedRef.current) return;

    setEmail(cleaned);
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
      setError("");
      setMessage(`Email captured: ${cleaned}. Check it before signing in.`);
    } else {
      setMessage(`I heard "${cleaned}". Edit it or type the complete email address.`);
    }
  }

  async function stopListening() {
    if (isNative()) {
      await nativeStopRef.current?.();
      return;
    }

    try {
      browserRecognitionRef.current?.stop();
    } catch (stopError) {
      console.warn("Could not stop email voice recognition:", stopError);
      setListening(false);
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
      const result = await speak(instructionText, { locale: locale || "en-ZA" });
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
        <Link className="auth-logo" to="/" aria-label="UniAble home">
  <span className="auth-logo-icon">
    <Accessibility size={25} aria-hidden="true" />
  </span>
  <span className="auth-logo-word">UniAble</span>
</Link>
        <p className="voice-login-eyebrow">ACCESSIBLE SIGN-IN</p>
        <h1 id="voice-login-heading">Voice Login</h1>
        <p className="voice-login-description">
          Use your voice to enter your email, then sign in securely with your password.
        </p>

        <VoiceAssistanceToggle />

        <button
          className="voice-login-mic"
          type="button"
          onClick={captureEmail}
          disabled={busy}
          aria-label={listening ? "Stop listening for email address" : "Speak email address"}
        >
          {listening ? <MicOff size={30} /> : <Mic size={30} />}
          <span>{listening ? "Stop listening" : "Speak your email"}</span>
        </button>

        <p className="voice-login-status" role="status" aria-live="polite">
          {listening && recordingTranscript
            ? `Listening: ${recordingTranscript}`
            : message}
        </p>
        {recordingTranscript && (
          <p className="voice-login-status" aria-live="polite">
            Recognized: {recordingTranscript}
          </p>
        )}

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

          <button className="voice-login-submit" type="submit" disabled={busy}>
            {busy ? "Signing in…" : "Confirm and sign in"}
          </button>
        </form>

        <nav className="voice-login-navigation" aria-label="Other sign-in options">
          <Link className="voice-login-nav-link" to="/login">
            <span className="voice-login-nav-title">Login with Email and password</span>
            <span className="voice-login-nav-description">Use your email address and password.</span>
          </Link>

          <Link className="voice-login-nav-link" to="/login?mode=email-link">
            <span className="voice-login-nav-title">Don&apos;t want to enter a password?</span>
            <span className="voice-login-nav-description">Use a secure email sign-in link.</span>
          </Link>

          <Link className="voice-login-nav-link" to="/signup">
            <span className="voice-login-nav-title">Need an account?</span>
            <span className="voice-login-nav-description">Create an account.</span>
          </Link>

          <Link className="voice-login-nav-back" to="/">
            Back to landing page
          </Link>
        </nav>
      </section>
    </main>
  );
}
