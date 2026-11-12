import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ListeningRing from "../components/ListeningRing.jsx";
import { useWakeWordListener, WAKE_WORD_PROMPT } from "../hooks/useWakeWordListener.js";
import "./VoiceActivation.css";

const SUGGESTIONS = [
  `"${WAKE_WORD_PROMPT}, where is the library?"`,
  `"${WAKE_WORD_PROMPT}, read my timetable"`,
  `"${WAKE_WORD_PROMPT}, emergency"`,
];

export default function VoiceActivation() {
  const [armed, setArmed] = useState(false);
  const [launching, setLaunching] = useState(false);
  const { isSupported, state, heardText, matchedIntent, permissionDenied, reset } =
    useWakeWordListener({ enabled: armed });
  const navigate = useNavigate();

  useEffect(() => {
    if (matchedIntent === "emergency" && !launching) {
      setLaunching(true);
      const timer = setTimeout(() => navigate("/emergency"), 1400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [matchedIntent, launching, navigate]);

  const ringState =
    state === "intent-matched"
      ? matchedIntent === "emergency"
        ? "emergency"
        : "success"
      : state === "wake-detected"
        ? "verifying"
        : state === "listening"
          ? "listening"
          : "idle";

  return (
    <div className="voice-activation">
      <div className="voice-activation__topbar">
        <span className="voice-activation__dot" />
        VOICE ACTIVATION DEMO · This tab must stay open
      </div>

      <div className="voice-activation__body">
        <ListeningRing state={ringState} />

        <h1 className="voice-activation__headline">
          {matchedIntent === "emergency"
            ? `"${WAKE_WORD_PROMPT}, emergency!"`
            : `Say "${WAKE_WORD_PROMPT}" to begin`}
        </h1>

        <p className="voice-activation__description">
          While this page is open, UniAble listens continuously for its wake word and acts on
          the command that follows — no need to tap anything first.
        </p>

        {!isSupported && (
          <p className="voice-activation__notice">
            Your browser doesn&rsquo;t support continuous voice recognition. Try the latest
            Chrome or Edge.
          </p>
        )}

        {permissionDenied && (
          <p className="voice-activation__notice">
            Microphone access was denied. Allow it in your browser&rsquo;s site settings, then
            try again.
          </p>
        )}

        {isSupported && !permissionDenied && (
          <button
            type="button"
            className={`voice-activation__toggle ${armed ? "is-active" : ""}`}
            onClick={() => {
              setLaunching(false);
              setArmed((v) => !v);
              reset();
            }}
          >
            {armed ? "Stop listening" : "Start always-on listening"}
          </button>
        )}

        <p role="status" aria-live="polite" className="voice-activation__live-status">
          {armed && heardText ? `Heard: "${heardText}"` : ""}
        </p>

        <section className="voice-activation__card">
          <h2>⚙ Always-On Voice Activation</h2>
          <p>
            Listens continuously while the UniAble tab is open, even if it&rsquo;s in the
            background of your browser. A native UniAble app would extend this to the lock
            screen and other apps using a background service — this web build demonstrates the
            same wake-word and command matching in the browser.
          </p>
        </section>

        <section className="voice-activation__card">
          <h2>🗨 Try saying</h2>
          <ul>
            {SUGGESTIONS.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>

        {launching && (
          <section className="voice-activation__launch" role="status">
            <h2>🔊 App is launching…</h2>
            <p>Opening Emergency SOS automatically based on your voice command.</p>
          </section>
        )}
      </div>
    </div>
  );
}
