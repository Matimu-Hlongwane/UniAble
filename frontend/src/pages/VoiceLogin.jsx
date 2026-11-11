import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Accessibility, Mic, MicOff, Volume2 } from "lucide-react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { signInWithEmailPassword, getCurrentUserRole, getVoiceFirstPreference } from "../services/firebaseAuth";
import { speak } from "../services/speechService";
import { validateInstitutionalStudentEmail } from "../auth-signup/utils/validation";
import "./VoiceLogin.css";

function cleanSpokenEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\bat the rate\b|\bat sign\b|\bat\b/g, "@")
    .replace(/\bdot\b/g, ".")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/\s+/g, "");
}

function browserRecognizeEmail(setStopListening) {
  return new Promise((resolve, reject) => {
    const BrowserRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!BrowserRecognition) {
      reject(new Error("Voice recognition is not supported in this browser."));
      return;
    }

    const recognition = new BrowserRecognition();
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      setStopListening(null);
      callback(value);
    };
    recognition.lang = "en-ZA";
    recognition.maxAlternatives = 3;
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript) finish(resolve, transcript);
      else finish(reject, new Error("I could not hear an email address. Please try again."));
    };

    recognition.onerror = (event) => {
      const message = event.error === "not-allowed"
        ? "Microphone permission was denied. Allow microphone access or type your email."
        : "I could not recognise your email. Please try again or type it.";
      finish(reject, new Error(message));
    };

    recognition.onend = () => {
      if (!settled) finish(reject, new Error("Voice input ended before an email was captured. Please try again or type it."));
    };

    setStopListening(() => {
      if (settled) return;
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
      try {
        recognition.abort();
      } finally {
        finish(reject, new DOMException("Voice input cancelled.", "AbortError"));
      }
    });

    try {
      recognition.start();
    } catch (error) {
      finish(reject, error);
    }
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
  const stopListeningRef = useRef(null);
  const cancelCaptureRef = useRef(false);

  const instructionText = "Welcome to UniAble voice-assisted sign-in. You can activate the microphone to speak your email address, or type your email. For account security, passwords are not read aloud and should not be spoken into the microphone. You may type your password or choose the passwordless email sign-in link option. Use the back to home link to return to the landing page.";

  useEffect(() => {
    if (document.querySelector("[data-uniable-public-voice-guide=true]")) return undefined; const timer = window.setTimeout(async () => {
      try {
        if (!await getVoiceFirstPreference()) return;
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
  }, []);

  useEffect(() => () => {
    const stop = stopListeningRef.current;
    stopListeningRef.current = null;
    if (stop) {
      try {
        const result = stop();
        result?.catch?.((stopError) => console.warn("Could not stop voice email input on exit:", stopError));
      } catch (stopError) {
        console.warn("Could not stop voice email input on exit:", stopError);
      }
    }
  }, []);

  async function captureEmail() {
    if (listening || busy) return;

    cancelCaptureRef.current = false;
    setListening(true);
    setError("");
    setMessage("Listening for your email address…");

    try {
      let transcript = "";

      try {
        const availability = await SpeechRecognition.available();
        if (cancelCaptureRef.current) {
          throw new DOMException("Voice input cancelled.", "AbortError");
        }
        if (availability?.available) {
          const permission = await SpeechRecognition.requestPermissions();
          if (permission?.speechRecognition !== "granted") {
            throw new Error("Microphone permission was not granted. Allow microphone access or type your email.");
          }
          if (cancelCaptureRef.current) {
            throw new DOMException("Voice input cancelled.", "AbortError");
          }

          stopListeningRef.current = async () => {
            await SpeechRecognition.stop();
          };
          const result = await SpeechRecognition.start({
            language: "en-ZA",
            maxResults: 3,
            prompt: "Say your email address",
            partialResults: false
          });
          if (cancelCaptureRef.current) {
            throw new DOMException("Voice input cancelled.", "AbortError");
          }
          transcript = result?.matches?.[0] || "";
          stopListeningRef.current = null;
        } else {
          transcript = await browserRecognizeEmail((stop) => {
            stopListeningRef.current = stop;
          });
        }
      } catch (nativeError) {
        if (cancelCaptureRef.current) {
          throw new DOMException("Voice input cancelled.", "AbortError");
        }
        if (/permission|denied/i.test(nativeError?.message || "")) throw nativeError;
        if (nativeError?.name === "AbortError") throw nativeError;
        transcript = await browserRecognizeEmail((stop) => {
          stopListeningRef.current = stop;
        });
      }

      const cleaned = validateInstitutionalStudentEmail(cleanSpokenEmail(transcript));

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        throw new Error("That did not sound like a complete email address. Try again or type it.");
      }

      setEmail(cleaned);
      setMessage(`Email captured: ${cleaned}. Check it before signing in.`);
    } catch (captureError) {
      if (captureError?.name === "AbortError") {
        setMessage("Voice input stopped. You can try again or type your email.");
      } else {
        setError(captureError?.message || "Voice input failed. You can type your email instead.");
        setMessage("Voice input did not complete.");
      }
    } finally {
      stopListeningRef.current = null;
      cancelCaptureRef.current = false;
      setListening(false);
      try {
        await SpeechRecognition.stop();
      } catch {
        // It is okay if recognition has already stopped.
      }
    }
  }

  async function stopEmailCapture() {
    cancelCaptureRef.current = true;
    const stop = stopListeningRef.current;
    stopListeningRef.current = null;
    if (!stop) {
      setListening(false);
      setMessage("Voice input stopped. You can try again or type your email.");
      return;
    }
    try {
      await stop();
    } catch (stopError) {
      if (stopError?.name !== "AbortError") {
        console.warn("Could not stop voice email input:", stopError);
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
      if (await getVoiceFirstPreference()) {
        await new Promise((resolve) => {
          let finished = false;
          const finish = () => {
            if (!finished) {
              finished = true;
              resolve();
            }
          };
          speak("Successfully logged in. Your dashboard is opening now.", {
            locale: "en-ZA",
            rate: 0.94,
            onEnd: finish,
            onError: finish,
          }).then((result) => {
            if (!result?.started) finish();
          }).catch(finish);
        });
      }

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
      const result = await speak(instructionText, { locale: "en-ZA", rate: 0.94, force: true });
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

        <button
          className="voice-login-mic"
          type="button"
          onClick={listening ? stopEmailCapture : captureEmail}
          disabled={busy}
          aria-label={listening ? "Stop listening for email address" : "Speak email address"}
        >
          {listening ? <MicOff size={30} /> : <Mic size={30} />}
          <span>{listening ? "Stop listening" : "Speak your email"}</span>
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
            {busy ? "Signing inâ€¦" : "Confirm and sign in"}
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
