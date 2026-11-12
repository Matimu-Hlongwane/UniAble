import { useEffect, useRef, useState } from "react";
import ListeningRing from "../../components/ListeningRing.jsx";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition.js";
import { matchVoice, VOICEPRINT_PROMPT } from "../../services/voiceprint.js";
import "./VoiceLoginPanel.css";

export default function VoiceLoginPanel({ onSuccess, onUseEmailInstead }) {
  const { isSupported, isListening, transcript, error: micError, start } =
    useSpeechRecognition();
  const [phase, setPhase] = useState("idle");
  const [confidence, setConfidence] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    isSupported
      ? `Tap the microphone and say "${VOICEPRINT_PROMPT}"`
      : "Voice recognition isn't available in this browser."
  );
  const verifyingRef = useRef(false);

  useEffect(() => {
    if (isListening) {
      setPhase("listening");
      setStatusMessage("Listening…");
    }
  }, [isListening]);

  useEffect(() => {
    if (micError) {
      setPhase("error");
      setStatusMessage(
        micError === "not-allowed"
          ? "Microphone access was denied. Allow microphone access, or type instead."
          : "We couldn't hear that clearly. Try again."
      );
    }
  }, [micError]);

  useEffect(() => {
    if (!isListening && transcript && !verifyingRef.current) {
      verifyingRef.current = true;
      setPhase("verifying");
      setStatusMessage("Verifying your voiceprint…");

      matchVoice(transcript).then(({ matched, confidence: score }) => {
        verifyingRef.current = false;
        setConfidence(score);
        if (matched) {
          setPhase("success");
          setStatusMessage(`Voiceprint matched · ${score}% confidence`);
        } else {
          setPhase("error");
          setStatusMessage("We didn't recognise that voiceprint. Try again, or type instead.");
        }
      });
    }
  }, [isListening, transcript]);

  const canRetry = phase === "error" || phase === "idle";

  return (
    <div className="voice-panel">
      <ListeningRing state={phase} />

      <button
        type="button"
        className="voice-panel__mic-button"
        onClick={start}
        disabled={!isSupported || phase === "listening" || phase === "verifying"}
        aria-describedby="voice-status"
      >
        {phase === "success" ? "Voiceprint matched" : `Say "${VOICEPRINT_PROMPT}"`}
      </button>

      <p id="voice-status" className="voice-panel__status" role="status" aria-live="polite">
        {statusMessage}
      </p>

      {transcript && phase !== "idle" && (
        <p className="voice-panel__transcript">
          Heard: <span>&ldquo;{transcript}&rdquo;</span>
        </p>
      )}

      {phase === "success" && (
        <div className="voice-panel__result" role="status">
          <span className="voice-panel__badge">✓ Voiceprint matched · {confidence}% confidence</span>
          <button type="button" className="voice-panel__continue" onClick={onSuccess}>
            Continue to dashboard
          </button>
        </div>
      )}

      {canRetry && isSupported && (
        <button type="button" className="voice-panel__retry" onClick={start}>
          {phase === "error" ? "Try again" : "Start listening"}
        </button>
      )}

      <button type="button" className="voice-panel__fallback" onClick={onUseEmailInstead}>
        {phase === "success" ? "Not you? Use email login" : "Use email and password instead"}
      </button>
    </div>
  );
}
