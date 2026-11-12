import React, { useEffect, useRef, useState } from "react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import VoiceAssistanceToggle from "../components/VoiceAssistanceToggle";
import { Link } from "react-router-dom";
import { Accessibility, Mic, MicOff, Volume2 } from "lucide-react";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";
import { sendPasswordlessSignInLink } from "../services/firebaseAuth";
import { speak } from "../services/speechService";
import { STUDENT_EMAIL_DOMAIN, validateInstitutionalStudentEmail } from "../auth-signup/utils/validation";
import { normalizeSpokenEmail } from "../auth-signup/utils/emailUtils";
import "./VoiceLogin.css";

function browserRecognizeEmail(onTranscript, setStopListening) {
  return new Promise((resolve, reject) => {
    const BrowserRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!BrowserRecognition) {
      reject(new Error("Voice recognition is not supported in this browser."));
      return;
    }

    const recognition = new BrowserRecognition();
    let settled = false;
    let latestTranscript = "";
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      setStopListening(null);
      callback(value);
    };
    recognition.lang = "en-ZA";
    recognition.maxAlternatives = 3;
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onresult = (event) => {
      latestTranscript = Array.from(event.results || [])
        .map((result) => result?.[0]?.transcript || "")
        .join(" ")
        .trim();
      if (latestTranscript) onTranscript(latestTranscript);
    };

    recognition.onerror = (event) => {
      const message = event.error === "not-allowed"
        ? "Microphone permission was denied. Allow microphone access or type your email."
        : "I could not recognise your email. Please try again or type it.";
      if (latestTranscript) finish(resolve, latestTranscript);
      else finish(reject, new Error(message));
    };

    recognition.onend = () => {
      if (latestTranscript) finish(resolve, latestTranscript);
      else finish(reject, new Error("Voice input ended before an email was captured. Please try again or type it."));
    };

    setStopListening(() => {
      if (settled) return;
        recognition.stop();
    });

    try {
      recognition.start();
    } catch (error) {
      finish(reject, error);
    }
  });
}

function emailFromSpokenStudentNumber(transcript) {
  const studentNumber = normalizeSpokenEmail(transcript).split("@")[0];
  return `${studentNumber}@${STUDENT_EMAIL_DOMAIN}`;
}

function nativeRecognizeEmail(onTranscript, setStopListening) {
  return new Promise((resolve, reject) => {
    let latestTranscript = "";
    let settled = false;
    let listeners = [];
    let finishTimer;
    let timeout;

    const cleanup = async () => {
      if (finishTimer) window.clearTimeout(finishTimer);
      if (timeout) window.clearTimeout(timeout);
      await Promise.all(listeners.map(async (listener) => {
        try {
          await listener.remove();
        } catch (error) {
          console.warn("Could not remove native email recognition listener:", error);
        }
      }));
      listeners = [];
      setStopListening(null);
    };

    const finish = (error) => {
      if (settled) return;
      settled = true;
      void cleanup().finally(() => {
        if (latestTranscript) resolve(latestTranscript);
        else reject(error || new Error("I could not hear an email address. Please try again or type it."));
      });
    };

    (async () => {
      listeners.push(await SpeechRecognition.addListener("partialResults", ({ matches }) => {
        latestTranscript = matches?.[0] || latestTranscript;
        if (latestTranscript) onTranscript(latestTranscript);
      }));
      listeners.push(await SpeechRecognition.addListener("listeningState", ({ status }) => {
        if (status === "stopped") {
          finishTimer = window.setTimeout(() => finish(), 500);
        }
      }));

      timeout = window.setTimeout(
        () => finish(new Error("Voice input timed out. Try again or type your email.")),
        30000
      );
      setStopListening(async () => {
        await SpeechRecognition.stop();
        finishTimer = window.setTimeout(() => finish(), 800);
      });
      await SpeechRecognition.start({
        language: "en-ZA",
        maxResults: 3,
        prompt: "Say the student number part of your Richfield email. The email domain is already filled in.",
        partialResults: true,
      });
    })().catch(finish);
  });
}

export default function VoiceLogin() {
  const { voiceAssistanceEnabled, locale } = useSettings();
  const emailSuffix = `@${STUDENT_EMAIL_DOMAIN}`;
  const [email, setEmail] = useState(emailSuffix);
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [listening, setListening] = useState(false);
  const [recordingTranscript, setRecordingTranscript] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Say the student number part of your Richfield email. The domain is already filled in.");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const emailInputRef = useRef(null);
  const emailRef = useRef(emailSuffix);
  const manualEditRef = useRef(false);
  const stopListeningRef = useRef(null);
  const cancelCaptureRef = useRef(false);
  const mountedRef = useRef(false);

  const instructionText = "Welcome to UniAble voice sign-in. Activate the microphone and say the student number part of your Richfield email. The email domain is already filled in, so you do not need to say the dots. The recognized number will appear in the email field as you speak, and you can type or correct it while listening. Review and confirm the complete email address before a sign-in link is sent. Open the link in your email on this device, then confirm the same email address on the sign-in page.";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      void stopListeningRef.current?.();
      stopListeningRef.current = null;
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

    cancelCaptureRef.current = false;
    manualEditRef.current = false;
    emailRef.current = emailSuffix;
    setEmail(emailSuffix);
    setEmailConfirmation("");
    setRecordingTranscript("");
    setListening(true);
    setError("");
    setNotice("");
    setMessage("Listening. Your student number will appear before the prefilled email domain; you can type or edit it at any time.");
    emailInputRef.current?.focus();
    window.requestAnimationFrame(() => emailInputRef.current?.setSelectionRange(0, 0));

    try {
      let transcript = "";
      const updateTranscript = (spokenText) => {
        if (manualEditRef.current) return;
        setRecordingTranscript(spokenText);
        const partialEmail = emailFromSpokenStudentNumber(spokenText);
        emailRef.current = partialEmail;
        setEmail(partialEmail);
      };

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

          transcript = await nativeRecognizeEmail(updateTranscript, (stop) => {
            stopListeningRef.current = stop;
          });
        } else {
          transcript = await browserRecognizeEmail(updateTranscript, (stop) => {
            stopListeningRef.current = stop;
          });
        }
      } catch (nativeError) {
        if (cancelCaptureRef.current) {
          throw new DOMException("Voice input cancelled.", "AbortError");
        }
        if (/permission|denied/i.test(nativeError?.message || "")) throw nativeError;
        if (nativeError?.name === "AbortError") throw nativeError;
        transcript = await browserRecognizeEmail(updateTranscript, (stop) => {
          stopListeningRef.current = stop;
        });
      }

      const cleaned = validateInstitutionalStudentEmail(
        manualEditRef.current ? emailRef.current : emailFromSpokenStudentNumber(transcript)
      );

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned)) {
        throw new Error("That did not sound like a complete email address. Review or type it in the email field.");
      }

      emailRef.current = cleaned;
      setEmail(cleaned);
      setMessage("Please review the email address in the field. It will not be sent until you confirm it.");
    } catch (captureError) {
      console.error("Voice email capture failed:", captureError);
      if (mountedRef.current) {
        setError(captureError?.message || "Voice input failed. You can type your email instead.");
        setMessage("Voice input did not complete.");
        setListening(false);
      }
    }
  }

  async function stopListening() {
    try {
      const stop = stopListeningRef.current;
      if (typeof stop === "function") {
        await stop();
      } else {
        setListening(false);
      }
    } catch (stopError) {
      console.warn("Could not stop email voice recognition:", stopError);
      setListening(false);
    } finally {
      stopListeningRef.current = null;
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const confirmedEmail = validateInstitutionalStudentEmail(email.trim());
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(confirmedEmail)) {
        throw new Error("Enter a complete email address before continuing.");
      }
      emailRef.current = confirmedEmail;
      setEmail(confirmedEmail);
      setEmailConfirmation(confirmedEmail);
      setMessage("Review the email address below. Confirm it to send the sign-in link.");
    } catch (err) {
      setError(err.message || "Unable to send a sign-in link. Please try again.");
    }
  }

  async function confirmAndSendLink() {
    if (!emailConfirmation || emailConfirmation !== email.trim()) {
      setEmailConfirmation("");
      setError("The email changed. Review it again before sending a link.");
      return;
    }

    setError("");
    setNotice("");
    setBusy(true);
    try {
      await sendPasswordlessSignInLink(emailConfirmation);
      setNotice(`If this address can receive a sign-in link, check ${emailConfirmation} and open the link on this device.`);
      setEmailConfirmation("");
      setMessage("The sign-in link request was submitted. You must enter the same email again after opening the link.");
    } catch (err) {
      console.error("UniAble voice sign-in link request failed:", err);
      setError(err.message || "Unable to send a sign-in link. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function handleEmailChange(event) {
    const value = event.target.value;
    emailRef.current = value;
    setEmail(value);
    setEmailConfirmation("");
    setError("");
    setNotice("");
    if (listening) manualEditRef.current = true;
  }

  function handleEmailFocus() {
    if (emailRef.current === emailSuffix) {
      emailInputRef.current?.setSelectionRange(0, 0);
    }
  }

  function changeConfirmedEmail() {
    setEmailConfirmation("");
    setError("");
    setNotice("");
    emailInputRef.current?.focus();
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
          Say or type your email address to receive a secure sign-in link. Open the link on this device, then confirm the same email address on the sign-in page.
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

        <form onSubmit={handleSubmit} className="voice-login-form" noValidate>
          <label htmlFor="voice-login-email">Email address</label>
          <input
            id="voice-login-email"
            ref={emailInputRef}
            type="text"
            autoComplete="email"
            value={email}
            onChange={handleEmailChange}
            onFocus={handleEmailFocus}
            autoCapitalize="none"
            spellCheck="false"
            inputMode="email"
            placeholder={`Student number@${STUDENT_EMAIL_DOMAIN}`}
            required
          />
          <p className="voice-login-email-help">
            The @my.richfield.ac.za domain is prefilled. Say or type only your student number before it; you do not need to speak the dots.
          </p>

          {emailConfirmation ? (
            <div className="voice-login-confirmation" role="group" aria-labelledby="voice-login-confirmation-label">
              <p id="voice-login-confirmation-label">Confirm that this is the email address where you want the sign-in link sent:</p>
              <strong>{emailConfirmation}</strong>
              <button
                type="button"
                className="voice-login-submit"
                data-voice-confirm-email
                onClick={confirmAndSendLink}
                disabled={busy || listening}
              >
                {busy ? "Sending link…" : "Confirm email and send link"}
              </button>
              <button
                type="button"
                className="voice-login-read"
                data-voice-change-email
                onClick={changeConfirmedEmail}
                disabled={busy}
              >
                Change email
              </button>
            </div>
          ) : (
            <button className="voice-login-submit" type="submit" disabled={busy || listening}>
              Review email before sending
            </button>
          )}

          {error && <p className="voice-login-error" role="alert">{error}</p>}
          {notice && <p className="voice-login-status" role="status">{notice}</p>}
        </form>

        <nav className="voice-login-navigation" aria-label="Other sign-in options">
          <Link className="voice-login-nav-link" to="/login">
            <span className="voice-login-nav-title">Login with Email and password</span>
            <span className="voice-login-nav-description">Use your email address and password.</span>
          </Link>

          <Link className="voice-login-nav-link" to="/login?mode=email-link">
            <span className="voice-login-nav-title">Use the email sign-in page</span>
            <span className="voice-login-nav-description">Request or complete a secure email sign-in link.</span>
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
