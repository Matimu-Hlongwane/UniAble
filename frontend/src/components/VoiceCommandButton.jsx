import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2, AlertCircle } from "lucide-react";
import {
  isNative,
  isVoiceRecognitionAvailable,
  startNativeVoiceRecognition,
} from "../services/platformVoice";
import { useSettings } from "../context/settingsContext/SettingsContext";

export default function VoiceCommandButton({ onCommand }) {
  const { locale, t } = useSettings();

  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState("");

  const recognitionRef = useRef(null);
  const nativeStopRef = useRef(null);
  const latestTranscriptRef = useRef("");
  const commandHandledRef = useRef(false);
  const onCommandRef = useRef(onCommand);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  const processLatestCommand = () => {
    const spokenText = latestTranscriptRef.current.trim();

    if (!spokenText || commandHandledRef.current) return;

    commandHandledRef.current = true;
    onCommandRef.current?.(spokenText);
  };

  useEffect(() => {
    if (isNative()) return undefined;

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = locale || "en-ZA";
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError("");
      setTranscript("");
      latestTranscriptRef.current = "";
      commandHandledRef.current = false;
    };

    recognition.onresult = (event) => {
      const spokenText = String(
        event.results?.[0]?.[0]?.transcript || ""
      ).trim();

      if (!spokenText) return;

      setTranscript(spokenText);
      latestTranscriptRef.current = spokenText;

      // A browser final result is already complete, so execute it once.
      processLatestCommand();
    };

    recognition.onerror = (event) => {
      setListening(false);

      if (event.error === "not-allowed") {
        setError("Microphone permission was denied. Please allow microphone access.");
      } else if (event.error === "no-speech") {
        setError("I didn't hear anything. Please try again.");
      } else if (event.error !== "aborted") {
        setError("Voice recognition could not start. Please try again.");
      }
    };

    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.abort();
      } catch (_) {
        // Recognition is already stopped.
      }
    };
  }, [locale]);

  useEffect(() => {
    return () => {
      nativeStopRef.current?.();
    };
  }, []);

  const startListening = async () => {
    setError("");
    setTranscript("");
    latestTranscriptRef.current = "";
    commandHandledRef.current = false;

    try {
      const available = await isVoiceRecognitionAvailable();

      if (!available) {
        setError("Voice recognition is not available on this device.");
        return;
      }

      if (isNative()) {
        setListening(true);

        nativeStopRef.current = await startNativeVoiceRecognition({
          language: locale || "en-ZA",

          onResult: (spokenText) => {
            const text = String(spokenText || "").trim();
            if (!text) return;

            latestTranscriptRef.current = text;
            setTranscript(text);
          },

          onEnd: () => {
            setListening(false);
            processLatestCommand();
            nativeStopRef.current = null;
          },

          onError: (voiceError) => {
            console.error("Native voice error:", voiceError);
            setListening(false);
            nativeStopRef.current = null;
            setError(
              voiceError?.message ||
                "Voice recognition could not start. Please try again."
            );
          },
        });

        return;
      }

      recognitionRef.current?.start();
    } catch (err) {
      console.error("Voice recognition error:", err);
      setListening(false);
      nativeStopRef.current = null;
      setError(
        err?.message || "Voice recognition could not start. Please try again."
      );
    }
  };

  const stopListening = async () => {
    if (isNative()) {
      const stop = nativeStopRef.current;
      nativeStopRef.current = null;

      try {
        await stop?.();
      } catch (err) {
        console.warn("Native voice stop failed:", err);
      }

      setListening(false);
      processLatestCommand();
      return;
    }

    try {
      recognitionRef.current?.stop();
    } catch (_) {
      // Already stopped.
    }

    setListening(false);
    processLatestCommand();
  };

  return (
    <div className="voice-command-wrapper">
      <button
        className={`voice-btn ${listening ? "listening" : ""}`}
        onClick={listening ? stopListening : startListening}
        type="button"
        aria-label={listening ? t("stopListening") : t("voiceCommand")}
        aria-pressed={listening}
      >
        {listening ? (
          <>
            <MicOff size={20} />
            <span>{t("stopListening")}</span>
          </>
        ) : (
          <>
            <Mic size={20} />
            <span>{t("tapToSpeak")}</span>
          </>
        )}
      </button>

      {listening && (
        <div className="voice-status" role="status">
          <Volume2 size={16} />
          <span>{t("listening")}</span>
        </div>
      )}

      {transcript && (
        <div className="voice-transcript" aria-live="polite">
          <strong>{t("youSaid")}</strong>
          <span>{transcript}</span>
        </div>
      )}

      {error && (
        <div className="voice-error" role="alert">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
