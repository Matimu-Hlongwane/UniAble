import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../services/api";
import { useSettings } from "../context/settingsContext/SettingsContext";
import { isNative, startNativeVoiceRecognition } from "../services/platformVoice";
import { setSpeechPaused, speak, stopSpeaking } from "../services/speechService";
import { setVoiceFirstPreference } from "../services/firebaseAuth";
import { VolumeX } from "lucide-react";

const ROUTES = [
  { path: "/dashboard", words: ["dashboard", "home", "student home"] },
  { path: "/schedule", words: ["schedule", "timetable", "classes", "my classes"] },
  { path: "/learning-materials", words: ["learning materials", "study materials", "course materials", "my materials", "notes"] },
  { path: "/campus", words: ["campus", "campus navigation", "directions", "navigate"] },
  { path: "/peer-assistance", words: ["peer assistance", "peer support", "student support", "volunteer help"] },
  { path: "/scan-read", words: ["scan and read", "scan document", "read document", "ocr"] },
  { path: "/accessibility", words: ["accessibility", "accessibility settings"] },
  { path: "/settings", words: ["settings", "my settings"] },
  { path: "/emergency", words: ["emergency", "emergency page", "emergency options"] },
  { path: "/unipal", words: ["unipal page", "open unipal"] },
];

const normalise = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const isStopCommand = (command) => /^(please )?(stop|stop now|stop talking|stop speaking|stop reading|be quiet|quiet|silence|cancel speech|thats enough|enough)$/.test(command);
const isDisableVoiceCommand = (command) => /^(please )?(turn off|disable|stop) (hands free( mode)?|handsfree( mode)?|voice access|voice guidance|spoken guidance|voice navigation|listening)$/.test(command);
const isPauseSpeechCommand = (command) => /^(please )?(pause|mute) (spoken output|speech|voice responses|reading)$/.test(command);
const isResumeSpeechCommand = (command) => /^(please )?(resume|unmute|turn on) (spoken output|speech|voice responses|reading)$/.test(command);

function findRouteCommand(command) {
  const explicitPrefixes = ["open ", "go to ", "navigate to ", "take me to ", "show me "];
  for (const route of ROUTES) {
    for (const phrase of route.words) {
      if (command === phrase || explicitPrefixes.some((prefix) => command === `${prefix}${phrase}`)) return route;
    }
  }
  return null;
}

function commandPriority(value) {
  const command = normalise(value);
  if (isDisableVoiceCommand(command)) return 101;
  if (isPauseSpeechCommand(command) || isResumeSpeechCommand(command)) return 100;
  if (isStopCommand(command)) return 100;
  if (/^(sos|send sos|send emergency alert|activate sos)$/.test(command)) return 95;
  if (/\b(timetable|schedule|classes|class)\b/.test(command) && (/\b(today|next|upcoming|tomorrow|week|full|all|my)\b/.test(command) || /^(what|when|show|read|tell me|open)\b/.test(command))) return 90;
  if (/^(open|show|read|find) (my )?(learning materials|study materials|course materials|materials|notes)$/.test(command) || /^(learning materials|study materials|course materials|my materials)$/.test(command)) return 90;
  if (/^(open |go to |request |i need )?(peer assistance|peer support|volunteer help)$/.test(command) || /^(request help|request a volunteer)$/.test(command)) return 85;
  if (/^(i need help|help me|what can you do|help)$/.test(command)) return 80;
  if (findRouteCommand(command)) return 75;
  return 0;
}

function chooseTranscript(rawText, metadata = {}) {
  const candidates = [...new Set([...(metadata.alternatives || []), rawText].map((item) => String(item || "").trim()).filter(Boolean))];
  if (!candidates.length) return String(rawText || "").trim();
  return candidates.sort((a, b) => commandPriority(b) - commandPriority(a))[0];
}

function dateLabel(value) {
  if (!value) return "date not provided";
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

export default function HandsFreeUniPal({ enabled = false }) {
  const { locale = "en-ZA", language = "English", theme, fontSize } = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const previousPathRef = useRef(location.pathname);
  const [status, setStatus] = useState("Starting voice access");
  const [lastHeard, setLastHeard] = useState("");
  const [lastReply, setLastReply] = useState("UniPal is preparing your hands-free assistant.");
  const [problem, setProblem] = useState("");
  const [preferenceError, setPreferenceError] = useState("");
  const activeRef = useRef(false);
  const startingRef = useRef(false);
  const processingRef = useRef(false);
  const speakingRef = useRef(false);
  const cancelSpeechRef = useRef(false);
  const greetedRef = useRef(false);
  const browserRef = useRef(null);
  const nativeStopRef = useRef(null);
  const restartTimerRef = useRef(null);
  const startListeningRef = useRef(null);
  const pendingRef = useRef(null);
  const conversationRef = useRef([]);

  const scheduleRestart = useCallback((delay = 500) => {
    if (!activeRef.current) return;
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      void startListeningRef.current?.();
    }, delay);
  }, []);

  const stopRecognition = useCallback(async () => {
    if (restartTimerRef.current) window.clearTimeout(restartTimerRef.current);
    restartTimerRef.current = null;
    const nativeStop = nativeStopRef.current;
    nativeStopRef.current = null;
    if (nativeStop) {
      try { await nativeStop(); } catch (error) { console.warn("UniPal native stop:", error); }
    }
    const browser = browserRef.current;
    if (browser) {
      try { browser.stop(); } catch { /* already stopped */ }
    }
    startingRef.current = false;
  }, []);

  const startListening = useCallback(async () => {
    if (!activeRef.current || startingRef.current || processingRef.current) return;
    startingRef.current = true;
    setProblem("");
    setStatus("Listening for your voice");
    try {
      if (isNative()) {
        const stop = await startNativeVoiceRecognition({
          language: locale || "en-ZA",
          onResult: (text, isFinal, metadata) => {
            if (isFinal && String(text || "").trim()) void handleUtteranceRef.current(text, metadata);
          },
          onError: (error) => {
            startingRef.current = false;
            setProblem(error?.message || "Voice recognition is unavailable. Check microphone permission and speech services.");
            setStatus("Voice access needs attention");
          },
          onEnd: () => {
            nativeStopRef.current = null;
            startingRef.current = false;
            if (activeRef.current && !processingRef.current) scheduleRestart();
          },
        });
        nativeStopRef.current = stop;
      } else {
        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) throw new Error("This browser does not support speech recognition. Try the UniAble Android app or a supported browser.");
        let recognition = browserRef.current;
        if (!recognition) {
          recognition = new Recognition();
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.maxAlternatives = 5;
          browserRef.current = recognition;
          recognition.onresult = (event) => {
            for (let index = event.resultIndex; index < event.results.length; index += 1) {
              const result = event.results[index];
              if (result.isFinal && result[0]?.transcript) {
                const alternatives = Array.from(result).map((item) => String(item?.transcript || "").trim()).filter(Boolean);
                void handleUtteranceRef.current(result[0].transcript, { confidence: Number(result[0]?.confidence) || 0, alternatives });
              }
            }
          };
          recognition.onerror = (event) => {
            if (["not-allowed", "service-not-allowed"].includes(event.error)) {
              setProblem("Microphone permission is required. Allow microphone access in your browser or device settings, then reload UniAble.");
              setStatus("Microphone permission required");
              activeRef.current = false;
            } else if (event.error !== "no-speech" && event.error !== "aborted") {
              setProblem(`Voice recognition issue: ${event.error}. UniPal will try again.`);
            }
          };
          recognition.onend = () => {
            startingRef.current = false;
            if (activeRef.current && !processingRef.current) scheduleRestart();
          };
        }
        recognition.lang = locale || "en-ZA";
        recognition.start();
      }
    } catch (error) {
      startingRef.current = false;
      setProblem(error?.message || "Voice recognition could not start.");
      setStatus("Voice access unavailable");
    }
  // Command handling and listening restarts use refs to avoid stale callbacks.
  }, [locale, scheduleRestart]);

  startListeningRef.current = startListening;

  const say = useCallback(async (text) => {
    const message = String(text || "").trim();
    if (!message || cancelSpeechRef.current) return;
    setLastReply(message);
    setStatus("UniPal is speaking");
    speakingRef.current = true;
    await stopRecognition();

    let completed = false;
    const resume = () => {
      if (completed) return;
      completed = true;
      speakingRef.current = false;
      if (activeRef.current) setStatus("Listening for your voice");
      if (activeRef.current && !processingRef.current) scheduleRestart(450);
    };
    try {
      const result = await speak(message, {
        locale: locale || "en-ZA",
        rate: 0.96,
        onEnd: resume,
        onError: resume,
      });
      if (!result.started) {
        if (result.reason === "paused") {
          setProblem("");
          setStatus("Spoken output paused");
          resume();
          return;
        }
        setProblem("Spoken output is not available for this language or device. Your response remains available to a screen reader.");
        resume();
      }
    } catch (error) {
      setProblem(error?.message || "UniPal could not speak this response.");
      resume();
    }
  }, [locale, stopRecognition, scheduleRestart]);

  const readTimetable = useCallback(async (mode = "full") => {
    setStatus("Loading your timetable");

    try {
      const result = await api.getAcademicTimetable();
      const entries = Array.isArray(result)
        ? result
        : Array.isArray(result?.timetable)
          ? result.timetable
          : [];

      if (!entries.length) {
        await say("I could not find any timetable entries assigned to your UniAble account yet. Please check with your lecturer or department. Opening your timetable now.");
        navigate("/schedule");
        return;
      }

      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      const getDate = (item) => String(item.date || "").slice(0, 10);

      const sorted = [...entries].sort((a, b) =>
        `${getDate(a)} ${a.startTime || ""}`.localeCompare(`${getDate(b)} ${b.startTime || ""}`)
      );

      let selected = sorted;
      let introduction = `I found ${entries.length} timetable ${entries.length === 1 ? "entry" : "entries"}.`;

      if (mode === "today") {
        selected = sorted.filter((item) => getDate(item) === today);
        introduction = selected.length
          ? `You have ${selected.length} scheduled ${selected.length === 1 ? "class" : "classes"} today.`
          : "There are no timetable entries recorded for today.";
      }

      if (mode === "next") {
        selected = sorted.filter((item) => {
          const date = getDate(item);
          const time = String(item.startTime || "");
          if (!date || !/^\d{2}:\d{2}/.test(time)) return false;
          return new Date(`${date}T${time.slice(0, 5)}:00`) >= now;
        });

        selected = selected.slice(0, 1);
        introduction = selected.length
          ? "Your next upcoming class is:"
          : "I could not find any upcoming class in your published timetable.";
      }

      if (selected.length) {
        const summary = selected.slice(0, mode === "full" ? 12 : 5).map((item, index) => {
          const title = item.title || "Class";
          const date = dateLabel(item.date);
          return `${mode === "full" ? `Class ${index + 1}: ` : ""}${title}, ${date}, from ${item.startTime || "time not set"} to ${item.endTime || "end time not set"}, venue ${item.venue || "venue not provided"}.`;
        }).join(" ");

        await say(`${introduction} ${summary}${mode === "full" && selected.length > 12 ? " There are more entries on your timetable page." : ""}`);
      } else {
        await say(introduction);
      }

      navigate("/schedule");
    } catch (error) {
      console.error("Could not load the UniAble timetable:", error);
      await say("I could not load your UniAble timetable right now. Please try again later.");
    }
  }, [navigate, say]);

  const readMaterials = useCallback(async () => {
    setStatus("Loading your learning materials");
    const result = await api.getAcademicMaterials();
    const materials = Array.isArray(result?.materials) ? result.materials : [];
    if (!materials.length) {
      await say("The learning materials option has been selected. Your lecturers have not published any learning materials for your modules yet. Opening the learning materials page now.");
      navigate("/learning-materials");
      return;
    }
    const summary = materials.slice(0, 10).map((item, index) => `${index + 1}. ${item.title || item.fileName || "Untitled material"}${item.description ? `. ${item.description}` : ""}`).join(". ");
    await say(`The learning materials option has been selected. I found ${materials.length} published learning ${materials.length === 1 ? "resource" : "resources"}. ${summary}${materials.length > 10 ? ". More resources are listed on your learning materials page." : ""}`);
    navigate("/learning-materials");
  }, [navigate, say]);

  const executeSOS = useCallback(async () => {
    setStatus("Recording emergency alert");
    let locationData = null;
    if (navigator.geolocation) {
      locationData = await new Promise((resolve) => navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 7000, maximumAge: 60000 },
      ));
    }
    const result = await api.createSOS({ location: locationData, source: "hands-free-unipal" });
    pendingRef.current = null;
    await say(`${result.message || "The SOS alert was recorded."} Important: the current UniAble server confirms that the alert is stored, but notification delivery to responders is not configured. Please contact campus security or local emergency services directly if you are in immediate danger.`);
  }, [say]);

  const disableHandsFree = useCallback(async () => {
    setPreferenceError("");
    cancelSpeechRef.current = true;
    stopSpeaking();
    speakingRef.current = false;
    try {
      await setVoiceFirstPreference(false);
    } catch (error) {
      console.error("Could not save the hands-free voice preference:", error);
      setPreferenceError("Voice access stopped here, but the preference could not sync. Turn it off in Accessibility settings.");
      activeRef.current = false;
      await stopRecognition();
      setStatus("Voice assistant paused");
    }
  }, [stopRecognition]);

  const handleUtterance = useCallback(async (rawText, metadata = {}) => {
    const text = chooseTranscript(rawText, metadata);
    const command = normalise(text);
    if (!command) return;

    if (isDisableVoiceCommand(command)) {
      setLastHeard(text);
      await disableHandsFree();
      return;
    }

    if (isPauseSpeechCommand(command)) {
      setLastHeard(text);
      setSpeechPaused(true);
      setStatus("Spoken output paused");
      return;
    }

    if (isResumeSpeechCommand(command)) {
      setLastHeard(text);
      setSpeechPaused(false);
      await say("Spoken output is resumed. You can say pause speech whenever you need quiet.");
      return;
    }

    // Stop always wins, including while an AI request or long read is still processing.
    if (isStopCommand(command)) {
      cancelSpeechRef.current = true;
      stopSpeaking();
      speakingRef.current = false;
      setLastHeard(text);
      setLastReply("Speech stopped. I am listening.");
      setStatus("Listening for your voice");
      return;
    }
    if (processingRef.current) return;
    cancelSpeechRef.current = false;

    // Ignore likely speech-synthesis echo instead of treating UniPal's own words as a command.
    if (speakingRef.current) {
      const heard = normalise(text);
      const spoken = normalise(lastReply);
      if (spoken && (heard === spoken || (heard.length > 12 && spoken.includes(heard)))) return;
    }

    if (metadata.confidence > 0 && metadata.confidence < 0.38) {
      setLastHeard(text);
      await say("I did not catch that clearly. Please say the command or question again.");
      return;
    }

    processingRef.current = true;
    setLastHeard(text);
    setProblem("");
    stopSpeaking();
    speakingRef.current = false;

    try {
      if (pendingRef.current?.type === "sos") {
        if (/^(yes|confirm|confirm sos|send sos|do it)$/.test(command)) {
          await executeSOS();
          return;
        }
        if (/^(no|cancel|cancel sos|do not)$/.test(command)) {
          pendingRef.current = null;
          await say("I have cancelled the SOS request. No alert was recorded.");
          return;
        }
        await say("I am waiting for you to say confirm SOS or cancel SOS.");
        return;
      }
      if (pendingRef.current?.type === "peer") {
        if (/^(yes|confirm|submit|send request|send it)$/.test(command)) {
          const detail = pendingRef.current.detail;
          await api.createRequest({ type: "General assistance", detail, location: "Campus", priority: "Normal" });
          pendingRef.current = null;
          await say("Your peer assistance request has been submitted.");
          return;
        }
        if (/^(no|cancel|cancel request)$/.test(command)) {
          pendingRef.current = null;
          await say("I cancelled the assistance request. Nothing was submitted.");
          return;
        }
        pendingRef.current.detail = text;
        await say(`You said: ${text}. Should I submit this peer assistance request? Say confirm or cancel.`);
        return;
      }
      if (/\b(timetable|schedule|classes|class)\b/.test(command) &&
          (/^(what|when|show|read|tell me|open|describe)\b/.test(command) ||
           /\b(today|next|upcoming|full|my)\b/.test(command))) {
        const mode = /\b(next|upcoming)\b/.test(command)
          ? "next"
          : /\b(today)\b/.test(command)
            ? "today"
            : "full";

        await readTimetable(mode);
        return;
      }
      if (/^(open|show|read|find) (my )?(learning materials|study materials|course materials|materials|notes)$/.test(command) || /^(learning materials|study materials|course materials|my materials)$/.test(command)) {
        await readMaterials();
        return;
      }
      if (/^(send|trigger|activate) (an )?(sos|emergency alert)$/.test(command) || command === "sos" || command === "send sos") {
        pendingRef.current = { type: "sos" };
        await say("The emergency SOS option has been selected. You are asking me to record an emergency alert. The current server does not send notifications to responders. If you need immediate help, contact campus security or local emergency services. Do you still want me to record the alert? Say confirm SOS or cancel SOS.");
        return;
      }
      if (/^(open |go to |request |i need )?(peer assistance|peer support|volunteer help)$/.test(command) || /^(request help|request a volunteer)$/.test(command)) {
        pendingRef.current = { type: "peer", detail: "Student requested peer assistance." };
        await say("The peer assistance option has been selected. I can prepare a request. Please tell me what help you need and where you are on campus.");
        return;
      }
      if (/^(i need help|help me|what can you do|help)$/.test(command)) {
        await say("The help option has been selected. I can read your timetable, find your published learning materials, open campus navigation, help you request peer assistance, explain accessibility settings, and guide you through emergency options. You can also ask me ordinary questions and I will send them to the UniPal AI assistant. What would you like help with?");
        return;
      }
      const destination = findRouteCommand(command);
      if (destination) {
        const label = destination.words[0].replace(/\b\w/g, (letter) => letter.toUpperCase());
        await say(`The ${label} option has been selected. Opening ${label} now.`);
        navigate(destination.path);
        return;
      }
      const history = [...conversationRef.current, { role: "user", content: text }].slice(-8);
      const data = await api.chatWithUniPal({
        message: text,
        language,
        locale,
        profile: { accessibility: "voice-first", preferences: { theme, fontSize } },
        messages: history,
      });
      const reply = data?.message || "I could not get an answer just now. Please try asking in a different way.";
      conversationRef.current = [...history, { role: "assistant", content: reply }].slice(-8);
      await say(`I heard you ask: ${text}. ${reply}`);
    } catch (error) {
      const message = error?.message || "I could not complete that request.";
      setProblem(message);
      await say(`I could not complete that. ${message}`);
    } finally {
      processingRef.current = false;
      if (activeRef.current && !speakingRef.current) scheduleRestart(500);
    }
  }, [disableHandsFree, executeSOS, language, locale, navigate, readMaterials, readTimetable, say, theme, fontSize, lastReply, scheduleRestart]);

  const handleUtteranceRef = useRef(handleUtterance);
  useEffect(() => { handleUtteranceRef.current = handleUtterance; }, [handleUtterance]);

  useEffect(() => {
    if (!enabled) {
      pendingRef.current = null;
      previousPathRef.current = location.pathname;
      return undefined;
    }
    if (previousPathRef.current === location.pathname) return undefined;

    if (
      previousPathRef.current === "/emergency" &&
      location.pathname !== "/emergency"
    ) {
      pendingRef.current = null;
    }

    previousPathRef.current = location.pathname;
    const guidance = {
      "/dashboard": "The student dashboard is now open. Your options are timetable, learning materials, campus navigation, Scan and Read, peer assistance, UniPal, emergency support, accessibility settings, and general settings. Say the option you want to open.",
      "/schedule": "The timetable page is now open. I can read today's classes, your next class, or your full timetable. Say read my timetable, today's classes, or dashboard.",
      "/learning-materials": "The learning materials page is now open. I can read the published resources available to you. Say read my learning materials or dashboard.",
      "/campus": "The campus navigation page is now open. You can ask for directions or a campus destination. Say dashboard to return home.",
      "/peer-assistance": "The peer assistance page is now open. Tell me what help you need and where you are. I will read the request back and ask you to confirm before submitting it.",
      "/scan-read": "The Scan and Read page is now open. You can use its document reading tools. Say dashboard to return home.",
      "/unipal": "The UniPal AI assistant page is now open. Ask a question or continue our conversation by voice.",
      "/accessibility": "The accessibility settings page is now open. You can ask me to explain the available accessibility options or say dashboard.",
      "/settings": "The settings page is now open. You can ask about your language, display, and account settings.",
      "/emergency": "The emergency support page is now open. I can explain the emergency options. Any SOS alert requires your spoken confirmation before it is recorded.",
    };
    void say(guidance[location.pathname] || `The ${location.pathname.split("/").filter(Boolean).join(" ")} page is now open. Tell me what you would like to do.`);
    return undefined;
  }, [enabled, location.pathname, say]);

  useEffect(() => {
    if (!enabled) {
      activeRef.current = false;
      void stopRecognition();
      stopSpeaking();
      speakingRef.current = false;
      setStatus("Voice assistant paused");
      return undefined;
    }
    activeRef.current = true;
    void startListening();
    if (!greetedRef.current) {
      greetedRef.current = true;
      void say("Welcome to your UniAble student dashboard. I am UniPal, your hands-free assistant. Your options are timetable, learning materials, campus navigation, Scan and Read, peer assistance, UniPal, emergency support, accessibility settings, and general settings. Say the option you want to open, or ask me a question.");
    } else {
      scheduleRestart(250);
    }
    return () => {
      activeRef.current = false;
      void stopRecognition();
      stopSpeaking();
      speakingRef.current = false;
    };
  }, [enabled, say, startListening, stopRecognition, scheduleRestart]);


  if (!enabled) return null;

  return (
    <aside className="uniable-handsfree" role="region" aria-label="UniPal hands-free voice controls" style={{ position: "fixed", right: 16, bottom: 92, zIndex: 1200, width: "min(360px, calc(100vw - 32px))", display: "flex", alignItems: "flex-start", gap: 12, padding: 14, borderRadius: 14, border: "1px solid var(--border, #555)", background: "var(--surface, #171717)", color: "var(--text, #fff)", boxShadow: "0 8px 28px rgba(0,0,0,.28)" }}>
      <span className={`uniable-handsfree-indicator ${status.toLowerCase().includes("listen") ? "is-listening" : ""}`} aria-hidden="true" style={{ flex: "0 0 10px", width: 10, height: 10, marginTop: 5, borderRadius: "50%", background: status.toLowerCase().includes("listen") ? "#22c55e" : "#9ca3af" }} />
      <div className="uniable-handsfree-copy" style={{ minWidth: 0, display: "grid", gap: 4, overflowWrap: "anywhere" }}>
        <strong role="status" aria-live="polite">UniPal Â· {status}</strong>
        <span>{lastHeard ? `You said: ${lastHeard}` : lastReply}</span>
        {problem && <span className="uniable-handsfree-error" style={{ color: "#fca5a5" }}>{problem}</span>}
        {preferenceError && <span role="alert" style={{ color: "#fca5a5" }}>{preferenceError}</span>}
        <button
          type="button"
          onClick={() => void disableHandsFree()}
          aria-label="Turn off hands-free voice access"
          style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 7, marginTop: 6, padding: "8px 10px", borderRadius: 8, border: "1px solid currentColor", background: "transparent", color: "inherit", font: "inherit", cursor: "pointer" }}
        >
          <VolumeX size={16} aria-hidden="true" />
          Turn off hands-free
        </button>
      </div>
    </aside>
  );
}
