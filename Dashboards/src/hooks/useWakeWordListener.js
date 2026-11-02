import { useCallback, useEffect, useRef, useState } from "react";

// Continuous "Hey UniAble" wake-word listening.
//
// Honest limitation: browsers only grant microphone access to an open,
// foreground tab — there is no web API for listening while the screen is
// locked or another app has focus. True system-wide wake-word detection
// (what the product concept shows on a lock screen) needs a native app
// with a background/foreground service — e.g. wrapping this UI in
// Capacitor/Android with a native speech service. This hook gives the
// best web-platform approximation: it keeps listening for as long as
// this tab stays open and visible, restarting itself after every pause
// in speech, and surfaces that constraint in state rather than hiding it.

const SpeechRecognitionImpl =
  typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const WAKE_PHRASE = "hey uniable";

const INTENTS = [
  { id: "emergency", test: (t) => /\bemergency\b|\bsos\b|\bhelp\b/.test(t) },
  { id: "navigate", test: (t) => /\bwhere is\b|\bnavigate\b|\bdirections?\b/.test(t) },
  { id: "timetable", test: (t) => /\btimetable\b|\bschedule\b|\bclass(es)?\b/.test(t) },
];

function matchIntent(textAfterWake) {
  const t = textAfterWake.toLowerCase();
  const hit = INTENTS.find((intent) => intent.test(t));
  return hit ? hit.id : null;
}

/**
 * state: "unsupported" | "idle" | "listening" | "wake-detected" | "intent-matched"
 */
export function useWakeWordListener({ enabled }) {
  const [isSupported] = useState(Boolean(SpeechRecognitionImpl));
  const [state, setState] = useState(isSupported ? "idle" : "unsupported");
  const [heardText, setHeardText] = useState("");
  const [matchedIntent, setMatchedIntent] = useState(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognitionImpl) return undefined;

    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-ZA";

    recognition.onresult = (event) => {
      let fullText = "";
      for (let i = 0; i < event.results.length; i += 1) {
        fullText += `${event.results[i][0].transcript} `;
      }
      const normalized = fullText.trim().toLowerCase();
      setHeardText(fullText.trim());

      const wakeIndex = normalized.lastIndexOf(WAKE_PHRASE);
      if (wakeIndex === -1) {
        setState("listening");
        return;
      }

      setState("wake-detected");
      const afterWake = normalized.slice(wakeIndex + WAKE_PHRASE.length);
      const intent = matchIntent(afterWake);
      if (intent) {
        setMatchedIntent(intent);
        setState("intent-matched");
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setPermissionDenied(true);
        shouldListenRef.current = false;
      }
      // "no-speech" and "aborted" are routine during continuous listening
      // and are handled by the restart-on-end logic below.
    };

    recognition.onend = () => {
      if (shouldListenRef.current) {
        try {
          recognition.start();
        } catch {
          // Already starting — ignore.
        }
      } else {
        setState("idle");
      }
    };

    recognitionRef.current = recognition;
    return () => {
      shouldListenRef.current = false;
      recognition.stop();
    };
  }, []);

  useEffect(() => {
    if (!recognitionRef.current) return;
    if (enabled) {
      shouldListenRef.current = true;
      setMatchedIntent(null);
      setState("listening");
      try {
        recognitionRef.current.start();
      } catch {
        // start() throws if already started — safe to ignore.
      }
    } else {
      shouldListenRef.current = false;
      recognitionRef.current.stop();
    }
  }, [enabled]);

  const reset = useCallback(() => {
    setMatchedIntent(null);
    setState(shouldListenRef.current ? "listening" : "idle");
  }, []);

  return { isSupported, state, heardText, matchedIntent, permissionDenied, reset };
}

export const WAKE_WORD_PROMPT = "Hey UniAble";
