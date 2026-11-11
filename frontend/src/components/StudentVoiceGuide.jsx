import React from "react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { getCurrentUser, getVoiceFirstPreference } from "../services/firebaseAuth";
import { speak, stopSpeaking } from "../services/speechService";
import { isNative, startNativeVoiceRecognition } from "../services/platformVoice";

const pageNames = {
  "/dashboard": "Student dashboard. You can ask for your modules, timetable, or say campus navigation, peer assistance, UniPal, emergency support, accessibility settings, or settings.",
  "/campus": "Campus navigation. Say dashboard, timetable, peer assistance, UniPal, or emergency support to move to another student service.",
  "/schedule": "Your timetable. Say what classes do I have today, what is my next class, or dashboard.",
  "/scan-read": "Scan and Read. Use the page controls to scan a document or read accessible text. Say dashboard to return home.",
  "/peer-assistance": "Peer assistance. You can request student support here. Say dashboard or timetable to navigate.",
  "/unipal": "UniPal, your UniAble companion. Ask your study question using the assistant controls. Say dashboard to return home.",
  "/emergency": "Emergency support. You can request assistance using the emergency control. I will not send an SOS unless you explicitly confirm the action.",
  "/accessibility": "Accessibility settings. Review your accessibility and voice-first preferences. Say dashboard to return home.",
  "/accessibility-application": "Accessibility support application. Review the form and submit supporting documents if required. Say dashboard to return home.",
  "/settings": "Settings. Review your language, spoken responses and account preferences. Say dashboard to return home.",
};
const routes = [
  ["dashboard", "/dashboard"], ["home", "/dashboard"], ["campus navigation", "/campus"], ["campus", "/campus"],
  ["timetable", "/schedule"], ["schedule", "/schedule"], ["classes", "/schedule"],
  ["scan and read", "/scan-read"], ["read document", "/scan-read"],
  ["peer assistance", "/peer-assistance"], ["peer support", "/peer-assistance"],
  ["unipal", "/unipal"], ["uni pal", "/unipal"], ["emergency support", "/emergency"], ["sos", "/emergency"],
  ["accessibility settings", "/accessibility"], ["accessibility application", "/accessibility-application"], ["settings", "/settings"],
];
const studentPaths = Object.keys(pageNames);
const clean = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

export default function StudentVoiceGuide() {
  const location = useLocation();
  const navigate = useNavigate();
  const recognitionRef = useRef(null);
  const nativeStopRef = useRef(null);
  const nativeStartingRef = useRef(false);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const routeRef = useRef("");
  const restartRef = useRef(null);
  const startRef = useRef(null);
  const pendingSOSRef = useRef(false);
  const [voicePreferenceOverride, setVoicePreferenceOverride] = useState(null);

  useEffect(() => {
    const handlePreferenceChange = (event) => {
      if (typeof event.detail?.enabled === "boolean") setVoicePreferenceOverride(event.detail.enabled);
    };
    window.addEventListener("uniable-voice-first-change", handlePreferenceChange);
    return () => window.removeEventListener("uniable-voice-first-change", handlePreferenceChange);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const path = location.pathname;
    if (!studentPaths.includes(path)) return undefined;
    const activationKey = `${path}:${voicePreferenceOverride === null ? "stored" : voicePreferenceOverride}`;
    if (routeRef.current === activationKey) return undefined;
    routeRef.current = activationKey;
    activeRef.current = false;
    try { recognitionRef.current?.stop(); } catch { /* no active recognizer */ }
    stopSpeaking();

    const say = async (message) => {
      const shouldResume = activeRef.current;
      busyRef.current = true;
      activeRef.current = false;
      try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
      if (nativeStopRef.current) {
        try { await nativeStopRef.current(); } catch { /* native recognition already stopped */ }
        nativeStopRef.current = null;
      }
      try {
        await new Promise((resolve) => {
          let finished = false;
          const finish = () => { if (!finished) { finished = true; resolve(); } };
          speak(message, { locale: "en-ZA", rate: 0.94, onEnd: finish, onError: finish })
            .then((result) => { if (!result?.started) finish(); })
            .catch(finish);
        });
      } finally {
        busyRef.current = false;
        if (!cancelled && shouldResume) {
          activeRef.current = true;
          startRef.current?.();
        }
      }
    };

    const handleCommand = async (transcript) => {
      const command = clean(transcript);
      if (!command || busyRef.current) return;
      if (["stop", "stop speaking", "be quiet", "cancel speech"].includes(command)) { stopSpeaking(); return; }
      if (path === "/emergency" && pendingSOSRef.current && ["confirm sos", "confirm emergency", "yes send sos"].includes(command)) {
        pendingSOSRef.current = false;
        const button = document.querySelector(".sos-button");
        if (button && !button.disabled) {
          const card = document.querySelector(".sos-card");
          const initialHeading = card?.querySelector("h2")?.textContent?.trim() || "";
          const initialMessage = card?.querySelector("p")?.textContent?.trim() || "";
          let finished = false;
          let observer = null;
          let timer = null;
          const waitForResult = new Promise((resolve) => {
            const finish = () => {
              if (finished) return;
              finished = true;
              observer?.disconnect();
              window.clearTimeout(timer);
              resolve();
            };
            const checkResult = () => {
              const heading = card?.querySelector("h2")?.textContent?.trim() || "";
              const message = card?.querySelector("p")?.textContent?.trim() || "";
              if (card?.querySelector('[role="alert"]') || heading !== initialHeading || message !== initialMessage) finish();
            };
            observer = new MutationObserver(checkResult);
            if (card) observer.observe(card, { childList: true, subtree: true, characterData: true });
            timer = window.setTimeout(finish, 20000);
            button.click();
            checkResult();
          });
          await waitForResult;
          const finalHeading = card?.querySelector("h2")?.textContent?.trim() || "";
          const finalMessage = card?.querySelector("p")?.textContent?.trim() || "";
          const errorMessage = card?.querySelector('[role="alert"]')?.textContent?.trim();
          if (errorMessage) await say(errorMessage);
          else if (finalHeading !== initialHeading || finalMessage !== initialMessage) {
            await say(finalMessage || "Your emergency request has been recorded. Check the notification status on the page, and contact campus security directly if you need immediate help.");
          } else {
            await say("The emergency request is taking longer than expected. Check the status on the page and contact campus security directly if you need immediate help.");
          }
        } else await say("The emergency action is not available right now. Please use the visible page status or contact campus security directly.");
        return;
      }
      if (path === "/emergency" && ["request sos", "send sos", "emergency assistance", "i need help"].includes(command)) {
        pendingSOSRef.current = true;
        await say("You are about to submit an emergency assistance request. This is a serious action. Say confirm SOS to submit, or say cancel to stop.");
        return;
      }
      if (command === "cancel" && pendingSOSRef.current) { pendingSOSRef.current = false; await say("Emergency request cancelled. No SOS was sent."); return; }
      if (/modules|my subjects|my qualification/.test(command)) {
        try {
          const result = await api.getAcademicModules();
          const modules = Array.isArray(result) ? result : result?.modules || [];
          await say(modules.length ? `Your qualification has ${modules.length} available modules: ${modules.slice(0, 8).map((item) => `${item.code || ""} ${item.name || ""}`).join(". ")}.` : "No modules have been assigned to your qualification yet.");
        } catch { await say("I could not load your modules right now. Please try again later."); }
        return;
      }
      if (/study materials|learning materials|course materials/.test(command)) {
        try {
          const result = await api.getAcademicMaterials();
          const materials = Array.isArray(result) ? result : result?.materials || [];
          await say(materials.length ? `You have ${materials.length} published study materials: ${materials.slice(0, 6).map((item) => item.title || item.fileName || "Untitled resource").join(". ")}. Open the dashboard to access the files.` : "There are no published study materials for your qualification yet.");
        } catch { await say("I could not load your study materials right now."); }
        return;
      }
      if (/what classes|next class|today.?s classes|my timetable/.test(command)) {
        try {
          const result = await api.getAcademicTimetable();
          const rows = Array.isArray(result) ? result : result?.timetable || [];
          const now = new Date();
          const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
          const todayRows = rows.filter((item) => item.date === today).sort((a, b) => String(a.startTime).localeCompare(String(b.startTime)));
          await say(todayRows.length ? `You have ${todayRows.length} scheduled classes today. ${todayRows.slice(0, 5).map((item) => `${item.title || "Class"}, ${item.startTime || "time not set"}, ${item.venue || "venue not set"}`).join(". ")}.` : "There are no timetable entries recorded for today.");
        } catch { await say("I could not load your timetable right now."); }
        return;
      }
      const match = routes.find(([phrase]) => command.includes(phrase));
      if (match) {
        pendingSOSRef.current = false;
        if (match[1] === "/emergency") await say("Opening emergency support. I will not submit an SOS without your confirmation.");
        navigate(match[1]);
        return;
      }
      await say("I did not understand that request. Try dashboard, timetable, modules, study materials, campus navigation, peer assistance, UniPal, emergency support, accessibility settings, or settings.");
    };

    let recognizer = null;
    const start = async () => {
      if (!activeRef.current || cancelled || busyRef.current) return;
      if (isNative()) {
        if (nativeStartingRef.current || nativeStopRef.current) return;
        nativeStartingRef.current = true;
        try {
          const stop = await startNativeVoiceRecognition({
            language: "en-ZA",
            onResult: (transcript, isFinal) => {
              if (isFinal && transcript) void handleCommand(transcript);
            },
            onError: (error) => {
              console.warn("Student native voice recognition:", error);
              activeRef.current = false;
            },
            onEnd: () => {
              nativeStopRef.current = null;
              nativeStartingRef.current = false;
              if (activeRef.current && !busyRef.current && !cancelled) {
                restartRef.current = window.setTimeout(start, 450);
              }
            },
          });
          nativeStartingRef.current = false;
          if (cancelled || !activeRef.current) await stop();
          else nativeStopRef.current = stop;
        } catch (error) {
          nativeStartingRef.current = false;
          activeRef.current = false;
          console.warn("Student native voice guide could not start:", error);
        }
        return;
      }
      const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!Recognition) return;
      try {
        if (!recognizer) {
          recognizer = new Recognition();
          recognizer.lang = "en-ZA";
          recognizer.continuous = true;
          recognizer.interimResults = false;
          recognizer.onresult = (event) => {
            const transcript = event.results?.[event.resultIndex]?.[0]?.transcript || "";
            if (transcript) void handleCommand(transcript);
          };
          recognizer.onerror = (event) => {
            if (["not-allowed", "service-not-allowed"].includes(event.error)) activeRef.current = false;
          };
          recognizer.onend = () => {
            if (activeRef.current && !busyRef.current && !cancelled) restartRef.current = window.setTimeout(start, 450);
          };
          recognitionRef.current = recognizer;
        }
        recognizer.start();
      } catch (error) { if (error?.name !== "InvalidStateError") console.warn("Student voice guide:", error); }
    };
    startRef.current = start;

    const activate = async () => {
      try {
        const storedPreference = voicePreferenceOverride === null
          ? await getVoiceFirstPreference(getCurrentUser())
          : voicePreferenceOverride;
        if (cancelled || !storedPreference) return;
        activeRef.current = true;
        await say(pageNames[path]);
      } catch (error) { console.warn("Could not activate student voice guide:", error); }
    };
    const timer = window.setTimeout(activate, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (restartRef.current) window.clearTimeout(restartRef.current);
      activeRef.current = false;
      try { recognizer?.stop(); } catch { /* already stopped */ }
      if (nativeStopRef.current) {
        nativeStopRef.current().catch(() => {});
        nativeStopRef.current = null;
      }
      stopSpeaking();
    };
  }, [location.pathname, navigate, voicePreferenceOverride]);

  return <div className="sr-only" data-uniable-student-voice-guide="true" aria-live="polite">Hands-free student voice guidance is available when voice-first access is enabled.</div>;
}
