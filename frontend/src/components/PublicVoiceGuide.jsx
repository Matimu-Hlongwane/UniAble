import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { speak, stopSpeaking } from "../services/speechService";
import { startNativeVoiceRecognition, isNative } from "../services/platformVoice";
import { getCurrentUser, getVoiceFirstPreference } from "../services/firebaseAuth";
import { isValidStudentNumber, STUDENT_EMAIL_DOMAIN } from "../auth-signup/utils/validation";
import SpokenOutputToggle from "./SpokenOutputToggle";

const FIELD_STEPS = [
  ["fullName", "first name or names", "Please say your first name or names."],
  ["surname", "surname", "Please say your surname."],
  ["studentNumber", "student number", "Please say your student number, digit by digit."],
  ["qualification", "Richfield qualification", "Please say the exact name of your Richfield qualification."],
  ["dateOfBirth", "date of birth", "Please say your date of birth, for example, 15 March 2002."],
  ["yearOfStudy", "year of study", "Please say your year of study, for example 2026."],
  ["phoneNumber", "optional cellphone number", "Say your cellphone number, including the country code, or say skip."],
  ["accountType", "account type", "Your account type is Student. I will select Student for you."],
  ["accessibility", "accessibility needs", "Please say visual, hearing, mobility, speech, neurodiverse, or no accessibility needs."],
  ["additionalNeeds", "additional support information", "Would you like to add any other information about the support you need? Say skip if not."],
];

const clean = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9@.+ ]/g, " ").replace(/\s+/g, " ").trim().replace(/[.,!?;:]+$/g, "");
const isStop = (value) => /^(stop|stop talking|stop speaking|stop reading|be quiet|quiet|silence|cancel speech|enough)$/.test(clean(value));

function setReactField(element, value) {
  if (!element) return false;
  const prototype = element instanceof HTMLSelectElement
    ? HTMLSelectElement.prototype
    : element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(element, value);
  else element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new Event("blur", { bubbles: true }));
  return true;
}

function normaliseEmail(value) {
  return String(value || "").toLowerCase().trim()
    .replace(/\bat\s+the\s+rate\b|\bat\s+sign\b|\bat\b/g, "@")
    .replace(/\bdot\b/g, ".")
    .replace(/\s+/g, "")
    .replace(/[.,!?;:]+$/g, "");
}

function spokenDigits(value) {
  const words = { zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9" };
  return String(value || "").toLowerCase().split(/\s+/).map((part) => words[part] ?? part).join("").replace(/[^0-9]/g, "");
}

function spokenDate(value) {
  const raw = String(value || "").trim();
  const direct = raw.match(/^(\d{1,2})[ /-](\d{1,2})[ /-](\d{4})$/);
  if (direct) return `${direct[3]}-${direct[2].padStart(2, "0")}-${direct[1].padStart(2, "0")}`;
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime()) && /\b(19|20)\d{2}\b/.test(raw)) {
    return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  }
  return "";
}

export default function PublicVoiceGuide() {
  const location = useLocation();
  const navigate = useNavigate();
  const [voicePreferenceEnabled, setVoicePreferenceEnabled] = useState(null);
  const recognitionRef = useRef(null);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const routeRef = useRef("");
  const stepRef = useRef(0);
  const pendingRef = useRef(null);
  const reviewRef = useRef(false);
  const signupReadyRef = useRef(false);
  const verificationAnnouncedRef = useRef(false);
  const currentPathRef = useRef(location.pathname);
  const restartRef = useRef(null);
  const nativeStopRef = useRef(null);
  const startingRef = useRef(false);

  useEffect(() => {
    let active = true;
    const loadPreference = async () => {
      try {
        const enabled = await getVoiceFirstPreference(getCurrentUser());
        if (active) setVoicePreferenceEnabled(enabled);
      } catch (error) {
        console.warn("Could not load the public voice guidance preference:", error);
        if (active) setVoicePreferenceEnabled(false);
      }
    };
    const handlePreferenceChange = (event) => {
      if (typeof event.detail?.enabled !== "boolean") return;
      setVoicePreferenceEnabled(event.detail.enabled);
      if (!event.detail.enabled) {
        try {
          window.sessionStorage.removeItem("uniable-voice-onboarding-active");
          window.sessionStorage.removeItem("uniable-public-voice-guide");
        } catch (error) {
          console.warn("Could not clear the public voice onboarding state:", error);
        }
      }
    };

    void loadPreference();
    window.addEventListener("uniable-voice-first-change", handlePreferenceChange);
    return () => {
      active = false;
      window.removeEventListener("uniable-voice-first-change", handlePreferenceChange);
    };
  }, []);

  const stopListening = useCallback(() => {
    activeRef.current = false;
    if (restartRef.current) window.clearTimeout(restartRef.current);
    restartRef.current = null;
    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    try {
      const stopNative = nativeStopRef.current;
      nativeStopRef.current = null;
      if (stopNative) void stopNative().catch(() => {});
    } catch { /* native recognition already stopped */ }
  }, []);

  const startListening = useCallback(async () => {
    if (!activeRef.current || busyRef.current || startingRef.current) return;

    const scheduleRestart = (delay = 350) => {
      if (!activeRef.current || busyRef.current || restartRef.current) return;

      restartRef.current = window.setTimeout(() => {
        restartRef.current = null;

        if (!activeRef.current || busyRef.current) return;

        if (startingRef.current) {
          scheduleRestart(250);
          return;
        }

        startListeningRef.current();
      }, delay);
    };

    // Android and iOS: use native Capacitor speech recognition.
    if (isNative()) {
      startingRef.current = true;

      try {
        const stopNative = await startNativeVoiceRecognition({
          language: "en-ZA",

          onResult: (transcript, isFinal) => {
            if (!isFinal || busyRef.current || !activeRef.current) return;

            if (transcript?.trim()) {
              void handleSpeechRef.current(transcript.trim());
            }
          },

          onError: (error) => {
            const message = String(error?.message || error || "");
            const permissionError = /permission|not.?allowed|denied/i.test(message);

            if (permissionError) {
              activeRef.current = false;

              window.dispatchEvent(new CustomEvent("uniable-voice-guide-status", {
                detail: "Microphone permission is required. Allow microphone access in your device settings."
              }));
            } else {
              console.warn("Native voice recognition diagnostic:", error);
              scheduleRestart(2000);
            }
          },

          onEnd: () => {
            nativeStopRef.current = null;
            scheduleRestart(350);
          }
        });

        if (!activeRef.current || busyRef.current) {
          if (stopNative) void stopNative().catch(() => {});
        } else {
          nativeStopRef.current = stopNative;
        }
      } catch (error) {
        console.warn("Native voice recognition could not start:", error);

        if (activeRef.current && !busyRef.current) {
          scheduleRestart(2000);
        }
      } finally {
        startingRef.current = false;
      }

      return;
    }

    // Desktop browsers: retain the existing Web Speech API implementation.
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!Recognition) {
      activeRef.current = false;
      window.dispatchEvent(new CustomEvent("uniable-voice-guide-status", {
        detail: "Speech recognition is not supported by this browser."
      }));
      return;
    }

    try {
      let recognition = recognitionRef.current;

      if (!recognition) {
        recognition = new Recognition();
        recognition.lang = "en-ZA";
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.maxAlternatives = 4;

        recognition.onresult = (event) => {
          if (busyRef.current || !activeRef.current) return;

          const result = event.results?.[event.resultIndex || 0];
          const transcript = Array.from(result || [])
            .map((item) => item.transcript || "")
            .sort((a, b) => b.length - a.length)[0] || "";

          if (transcript.trim()) {
            void handleSpeechRef.current(transcript.trim());
          }
        };

        recognition.onerror = (event) => {
          const error = event.error;

          if (["not-allowed", "service-not-allowed", "audio-capture"].includes(error)) {
            activeRef.current = false;
            if (restartRef.current) window.clearTimeout(restartRef.current);
            restartRef.current = null;

            window.dispatchEvent(new CustomEvent("uniable-voice-guide-status", {
              detail: error === "audio-capture"
                ? "The microphone could not be accessed. Check that it is connected and available."
                : "Microphone permission is required. Allow microphone access in Edge and reload the page."
            }));
            return;
          }

          if (error === "network") {
            if (restartRef.current) window.clearTimeout(restartRef.current);
            busyRef.current = true;

            restartRef.current = window.setTimeout(() => {
              restartRef.current = null;
              busyRef.current = false;
              if (activeRef.current) startListeningRef.current();
            }, 5000);

            window.dispatchEvent(new CustomEvent("uniable-voice-guide-status", {
              detail: "Voice recognition has a network problem. Retrying shortly."
            }));
            return;
          }

          if (!["no-speech", "aborted"].includes(error)) {
            console.warn("Voice recognition diagnostic:", {
              error,
              message: event.message,
              time: new Date().toISOString(),
              language: recognition.lang
            });
            scheduleRestart(2000);
          }
        };

        recognition.onend = () => {
          scheduleRestart(350);
        };

        recognitionRef.current = recognition;
      }

      recognition.start();
    } catch (error) {
      if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
        activeRef.current = false;
        window.dispatchEvent(new CustomEvent("uniable-voice-guide-status", {
          detail: "Edge blocked microphone access. Allow microphone permission and reload the page."
        }));
      } else if (error?.name !== "InvalidStateError") {
        console.warn("Public voice guide could not start:", error);
        scheduleRestart(2000);
      }
    }
  }, []);
  const startListeningRef = useRef(startListening);
  startListeningRef.current = startListening;

  const say = useCallback(async (message) => {
    busyRef.current = true;

    if (restartRef.current) window.clearTimeout(restartRef.current);
    restartRef.current = null;

    try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
    try {
      const stopNative = nativeStopRef.current;
      nativeStopRef.current = null;
      if (stopNative) void stopNative().catch(() => {});
    } catch { /* native recognition already stopped */ }

    let playbackStarted = false;
    let watchdog = null;

    try {
      await new Promise((resolve) => {
        let finished = false;

        const finish = () => {
          if (finished) return;
          finished = true;
          if (watchdog) window.clearTimeout(watchdog);
          resolve();
        };

        const estimatedDuration = Math.min(
          45000,
          Math.max(10000, String(message).split(/\s+/).length * 700 + 10000)
        );

        watchdog = window.setTimeout(() => {
          if (!playbackStarted) {
            console.warn("Public voice guidance did not begin playback.");
            window.dispatchEvent(new CustomEvent("uniable-voice-guide-status", {
              detail: "Automatic speech could not start. Your browser may require an initial interaction."
            }));
          } else {
            console.warn("Public voice guidance exceeded its expected playback time.");
          }
          finish();
        }, estimatedDuration);

        speak(message, {
          locale: "en-ZA",
          rate: 0.94,
          onStart: () => {
            playbackStarted = true;
          },
          onEnd: finish,
          onError: (error) => {
            console.warn("Public voice playback error:", error);
            finish();
          }
        })
          .then((result) => {
            if (!result?.started) {
              if (result?.reason === "paused") {
                window.dispatchEvent(new CustomEvent("uniable-voice-guide-status", {
                  detail: "Spoken output is paused for this tab. Resume it using the spoken-output control."
                }));
                finish();
                return;
              }
              console.warn("Public voice guidance was unavailable:", result?.reason);
              window.dispatchEvent(new CustomEvent("uniable-voice-guide-status", {
                detail: "Speech playback is unavailable. Check your device's speech settings."
              }));
              finish();
            }
          })
          .catch((error) => {
            console.warn("Public voice guidance failed:", error);
            finish();
          });
      });
    } finally {
      if (watchdog) window.clearTimeout(watchdog);
      busyRef.current = false;

      if (activeRef.current) {
        restartRef.current = window.setTimeout(() => {
          startListeningRef.current();
        }, 350);
      }
    }
  }, []);

  const promptSignupField = useCallback(async (index) => {
    const [name, label, prompt] = FIELD_STEPS[index] || [];
    if (!name) return;
    stepRef.current = index;
    const input = document.querySelector(`[name="${name}"]`);
    if (!input) {
      await say(`I cannot see the ${label} field yet. I will try again in a moment.`);
      return;
    }
    input.focus?.();
    if (input instanceof HTMLSelectElement && name !== "accountType") {
      const options = Array.from(input.options).filter((option) => option.value).map((option) => option.textContent.trim());
      const sample = options.join(", ");
      await say(`${prompt} Available choices include: ${sample}.`);
      return;
    }
    if (name === "accountType") {
      setReactField(input, "student");
      pendingRef.current = { name, label, value: "Student" };
      await say("Your account type is Student. I have selected Student. Say confirm to continue.");
      return;
    }
    await say(prompt);
  }, [say]);

  const beginSignup = useCallback(async () => {
    if (signupReadyRef.current) return;
    signupReadyRef.current = true;
    // The existing sign-up screen initially opens in voice mode. Switch to its
    // accessible full form so the guide can populate the actual React fields.
    const switchButton = Array.from(document.querySelectorAll("button")).find((button) => /switch to typing/i.test(button.textContent || ""));
    if (switchButton) switchButton.click();
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    const form = document.querySelector(".typing-signup");
    if (!form) {
      signupReadyRef.current = false;
      await say("The sign-up form is not ready. Please choose Switch to Typing once, then I can guide you through the fields.");
      return;
    }
    await say("The sign-up page is open. I will guide you through each field one at a time. After each answer, I will repeat what I heard and ask you to confirm it. I will not ask you to speak your password. We will enter that privately at the end. Let's begin.");
    await promptSignupField(0);
  }, [promptSignupField, say]);

  const finishSignupReview = useCallback(async () => {
    const summary = FIELD_STEPS.map(([name, label]) => {
      const element = document.querySelector(`[name="${name}"]`);
      let value = element?.value || "not provided";
      if (name === "accessibility" && element?.selectedOptions?.[0]) value = element.selectedOptions[0].textContent;
      if (name === "dateOfBirth" && value !== "not provided") {
        const parsed = new Date(`${value}T00:00:00`);
        if (!Number.isNaN(parsed.getTime())) value = parsed.toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
      }
      return `${label}: ${value}`;
    }).join(". ");
    reviewRef.current = true;
    await say(`Please review your information. ${summary}. Your password will remain private and will not be read aloud. Say change followed by the field name, or say continue if everything is correct.`);
  }, [say]);

  const handleSpeech = useCallback(async (transcript) => {
    const command = clean(transcript);
    if (!command) return;
    if (isStop(command)) {
      stopSpeaking();
      busyRef.current = false;
      window.dispatchEvent(new CustomEvent("uniable-voice-guide-status", { detail: "Speech stopped." }));
      return;
    }
    if (busyRef.current) return;
    const path = currentPathRef.current;

    const navigationRoutes = {
      "login": { path: "/login", label: "Login" },
    "sign in": { path: "/login", label: "Login" },
    "voice login": { path: "/voice-login", label: "Voice Login" },
    "signup": { path: "/signup", label: "Sign Up" },
    "sign up": { path: "/signup", label: "Sign Up" },
    "home": { path: "/", label: "Home" },
      "landing page": { path: "/", label: "Home" },
      "main page": { path: "/", label: "Home" },
      "dashboard": { path: "/dashboard", label: "Dashboard" },
      "student dashboard": { path: "/dashboard", label: "Dashboard" },
      "campus": { path: "/campus", label: "Campus" },
      "campus map": { path: "/campus", label: "Campus" },
      "map": { path: "/campus", label: "Campus" },
      "timetable": { path: "/schedule", label: "Timetable" },
      "schedule": { path: "/schedule", label: "Timetable" },
      "classes": { path: "/schedule", label: "Classes" },
      "peer assistance": { path: "/peer-assistance", label: "Peer Assistance" },
      "peer support": { path: "/peer-assistance", label: "Peer Assistance" },
      "unipal": { path: "/unipal", label: "UniPal" },
      "uni pal": { path: "/unipal", label: "UniPal" },
      "emergency": { path: "/emergency", label: "Emergency" },
      "sos": { path: "/emergency", label: "Emergency" },
      "accessibility": { path: "/accessibility", label: "Accessibility" },
      "accessibility settings": { path: "/accessibility", label: "Accessibility" },
      "settings": { path: "/settings", label: "Settings" },
      "staff": { path: "/staff", label: "Staff" },
      "staff landing": { path: "/staff", label: "Staff" },
      "admin dashboard": { path: "/role/admin", label: "Admin Dashboard" },
      "lecturer dashboard": { path: "/role/lecturer", label: "Lecturer Dashboard" },
      "volunteer dashboard": { path: "/role/volunteer", label: "Volunteer Dashboard" },
      "disability dashboard": { path: "/role/disability", label: "Disability Dashboard" },
      "security dashboard": { path: "/role/security", label: "Security Dashboard" }
    };

    const navigationMatch = command.match(
      /^(?:please )?(?:open|go to|navigate to|take me to|show me)\s+(.+)$/
    );

    if (navigationMatch) {
      const target = navigationMatch[1].trim();
      const destination = navigationRoutes[target];

      if (destination) {
        if (destination.path === path) {
          await say(`You are already on ${destination.label}.`);
          return;
        }

        await say(`Opening ${destination.label}.`);
        navigate(destination.path);
        return;
      }
    }

    if (path === "/") {
      if (/voice or text\s*(sign ?up|signup)|voice and text\s*(sign ?up|signup)/.test(command)) {
        await say("Would you prefer Voice Signup or Text Signup? Say Voice Signup or Text Signup.");
      } else if (/text\s*(sign ?up|signup)|typing\s*(sign ?up|signup)/.test(command)) {
        stopListening();
        try { window.sessionStorage.removeItem("uniable-voice-onboarding-active"); } catch { /* optional */ }
        await say("Opening text sign-up.");
        navigate("/signup?mode=text");
      } else if (/voice\s*(sign ?up|signup)|sign ?up|create account/.test(command)) {
        stopListening();
        try { window.sessionStorage.setItem("uniable-voice-onboarding-active", "1"); } catch { /* optional */ }
        await say("Opening the voice sign-up page.");
        navigate("/signup");
      } else if (/voice\s*(login|sign.?in)|speak.*login/.test(command)) {
        stopListening();
        try { window.sessionStorage.setItem("uniable-voice-onboarding-active", "1"); } catch { /* optional */ }
        await say("Opening voice sign-in.");
        navigate("/voice-login");
      } else if (/email\s*(login|sign.?in)|password\s*(login|sign.?in)|login/.test(command)) {
        stopListening();
        try { window.sessionStorage.setItem("uniable-voice-onboarding-active", "1"); } catch { /* optional */ }
        await say("Opening email and password sign-in.");
        navigate("/login");
      } else {
        await say("I heard you. Please say Voice sign-up, Type sign-up, Voice sign-in, or Email sign-in.");
      }
      return;
    }

    if (path === "/signup") {
      if (!signupReadyRef.current && !document.querySelector("#verification-heading")) { await beginSignup(); return; }
      if (document.querySelector("#verification-heading")) {
        const codeInput = document.querySelector("#verification-code");
        if (/^(email otp|email verification|use email)$/.test(command)) {
          await say("Email verification is the only method. Say send code to my email when you are ready.");
          return;
        }
        if (/^(send code|send email code|send code to my email)$/.test(command)) {
          Array.from(document.querySelectorAll("button")).find((button) => /send code to my email/i.test(button.textContent))?.click();
          await say("I have requested your verification code. Check your student email. When you have the six-digit code, say the digits clearly.");
          return;
        }
        if (codeInput && /^\d{6}$/.test(spokenDigits(transcript))) {
          const code = spokenDigits(transcript);
          setReactField(codeInput, code);
          await say("I captured six digits for your verification code. Say confirm code to verify it, or repeat the six digits. I will not read the code aloud.");
          return;
        }
        if (/^(confirm code|verify code|confirm|yes)$/.test(command) && codeInput?.value?.length === 6) {
          Array.from(document.querySelectorAll("button")).find((button) => /^verify code$/i.test(button.textContent.trim()))?.click();
          await say("I am submitting your verification code. I will tell you when verification is complete.");
          return;
        }
        if (/^(repeat|try again)$/.test(command) && codeInput) {
          setReactField(codeInput, "");
          await say("Please say the six-digit verification code again.");
          return;
        }
        await say("Your account details have been accepted. Say send code to my email. After receiving the code, say the six digits and confirm code. I will not read the code aloud.");
        return;
      }
      if (!signupReadyRef.current) { await beginSignup(); return; }
      if (pendingRef.current) {
        if (/^(confirm|yes|correct|that's right|that is right|continue)$/.test(command)) {
          const pending = pendingRef.current;
          const input = document.querySelector(`[name="${pending.name}"]`);
          if (input && pending.name !== "accountType") setReactField(input, pending.value);
          pendingRef.current = null;
          const next = stepRef.current + 1;
          if (next < FIELD_STEPS.length) await promptSignupField(next);
          else await finishSignupReview();
          return;
        }
        if (/^(repeat|try again|again|no)$/.test(command)) {
          pendingRef.current = null;
          await promptSignupField(stepRef.current);
          return;
        }
        await say("I am waiting for confirmation. Say confirm if the information is correct, or repeat to enter it again.");
        return;
      }
      if (reviewRef.current) {
        if (/^(yes|change something|i want to change)$/.test(command)) {
          await say("Which field would you like to change? Say change name, change surname, change student number, change qualification, change date of birth, change year of study, change cellphone number, change accessibility, or change additional information.");
          return;
        }
        if (/^(continue|no|no changes|everything is correct|correct)$/.test(command)) {
          reviewRef.current = false;
          await say("Your information is confirmed. For account security, please enter your password and confirm password in the password fields. Do not speak your password aloud. When both fields are complete, say create account.");
          return;
        }
        const change = command.match(/(?:change|edit)\s+(first name|name|surname|student number|qualification|date of birth|year of study|cellphone|phone number|accessibility|additional information)/);
        if (change) {
          const key = ({ "first name": "fullName", name: "fullName", surname: "surname", "student number": "studentNumber", qualification: "qualification", "date of birth": "dateOfBirth", "year of study": "yearOfStudy", cellphone: "phoneNumber", "phone number": "phoneNumber", accessibility: "accessibility", "additional information": "additionalNeeds" })[change[1]];
          const index = FIELD_STEPS.findIndex(([field]) => field === key);
          if (index >= 0) { reviewRef.current = false; await promptSignupField(index); }
          return;
        }
      }
      if (command === "create account" || command === "submit account" || command === "register") {
        const password = document.querySelector('[name="password"]')?.value;
        const confirmPassword = document.querySelector('[name="confirmPassword"]')?.value;
        if (!password || !confirmPassword) {
          await say("The password and confirm password fields are still empty. Please enter them privately, then say create account.");
          return;
        }
        const createButton = Array.from(document.querySelectorAll("button")).find((button) => /create account/i.test(button.textContent || ""));
        await say("Submitting your account details now.");
        createButton?.click();
        return;
      }
      const index = stepRef.current;
      const [name, label] = FIELD_STEPS[index] || [];
      const element = document.querySelector(`[name="${name}"]`);
      if (!element) { await beginSignup(); return; }
      let value = transcript.trim().replace(/[.,!?;:]+$/g, "");
      if (/^(skip|none|no|not applicable)$/.test(command) && ["additionalNeeds", "phoneNumber"].includes(name)) value = "";
      if (name === "email") value = normaliseEmail(value);
      if (name === "studentNumber") value = spokenDigits(value);
      if (name === "phoneNumber") {
        const digits = spokenDigits(value);
        value = digits.startsWith("0") ? `+27${digits.slice(1)}` : (value.trim().startsWith("+") ? value.replace(/[\s()-]/g, "") : `+${digits}`);
      }
      if (name === "dateOfBirth") value = spokenDate(value);
      if (element instanceof HTMLSelectElement) {
        let selectCommand = command;
        if (name === "accessibility") {
          if (/blind|low vision|visually impaired|visual|colour|color/.test(command)) selectCommand = "visual";
          else if (/deaf|hard of hearing|hearing loss|hearing/.test(command)) selectCommand = "hearing";
          else if (/no (accessibility )?needs|none|not applicable/.test(command)) selectCommand = "no accessibility needs";
          else if (/wheelchair|mobility|walking support/.test(command)) selectCommand = "mobility";
          else if (/speech|non verbal|stutter/.test(command)) selectCommand = "speech";
          else if (/neurodiv/.test(command)) selectCommand = "neurodiverse";
        }
        const option = Array.from(element.options).filter((item) => item.value).sort((a, b) => {
          const aText = clean(`${a.textContent} ${a.value}`); const bText = clean(`${b.textContent} ${b.value}`);
          return Number(bText.includes(selectCommand)) - Number(aText.includes(selectCommand));
        }).find((item) => clean(`${item.textContent} ${item.value}`).includes(selectCommand) || selectCommand.includes(clean(item.textContent)));
        if (!option) {
          await say(`I could not match that to an available ${label}. Please say one of the options I listed, or use the keyboard to choose it.`);
          return;
        }
        value = option.value;
      }
      if (name === "dateOfBirth" && !value) { await say("I could not understand that date. Please say the day, month and year, for example 15 March 2002."); return; }

      if (name === "studentNumber" && !isValidStudentNumber(value)) { await say("The student number must be exactly nine digits and begin with 401, 402 or 403. Please say it again, digit by digit."); return; }
      if (name === "phoneNumber" && value && !/^\+?[1-9]\d{7,14}$/.test(value)) { await say("I could not confirm that cellphone number. Please say the full number with its country code, or say skip."); return; }
      if (name === "accountType") value = "student";
      const display = element instanceof HTMLSelectElement ? Array.from(element.options).find((option) => option.value === value)?.textContent || value : value || "no additional information";
      if (name !== "accountType") setReactField(element, value);
      pendingRef.current = { name, label, value };
      if (name === "studentNumber") {
        await say(`I heard ${display} for your student number. UniAble will generate your institutional email as ${value}@${STUDENT_EMAIL_DOMAIN}. Say confirm if your student number is correct, or repeat it.`);
      } else {
        await say(`I heard ${display} for ${label}. Say confirm if that is correct, or repeat to try again.`);
      }
      return;
    }

    if (path === "/forgot-password") {
      const emailField = document.querySelector("#recovery-email");
      if (/^(back to login|back to sign in|login)$/.test(command)) { navigate("/login"); return; }
      if (!emailField?.value && (command.includes("@") || command.includes(" at ") || command.includes(" dot "))) {
        const email = normaliseEmail(transcript);
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setReactField(emailField, email);
          await say(`I entered ${email}. Say send reset link when you are ready.`);
        } else await say("I could not understand that email address. Please say it again.");
        return;
      }
      if (/^(send reset link|send password reset|submit|send)$/.test(command)) {
        if (!emailField?.value) { await say("Please enter the email address linked to your account first."); return; }
        document.querySelector('form button[type="submit"]')?.click();
        await say("Your password reset request is being processed. Check your inbox and spam folder if an account matches that email address.");
        return;
      }
      await say("Forgot password page. Say your email address, then say send reset link. You can also say back to login.");
      return;
    }

    if (path === "/login" || path === "/voice-login") {
      const emailField = document.querySelector('input[type="email"]');
      const passwordField = document.querySelector('input[type="password"]');
      if (/^(voice login|open voice login)$/.test(command)) { navigate("/voice-login"); return; }
      if (/^(forgot password|reset password|password help)$/.test(command)) { navigate("/forgot-password"); return; }
      if (/^(email login|password login)$/.test(command) && path !== "/login") { navigate("/login"); return; }
      if (/^(email sign in link|passwordless login|send me a sign in link)$/.test(command) && path === "/login") {
        const modeButton = Array.from(document.querySelectorAll("button")).find((button) => /email sign-in link/i.test(button.textContent || ""));
        modeButton?.click();
        await say("Email sign-in link has been selected. Say your email address, then say send link.");
        return;
      }
      if (!emailField?.value && (command.includes("@") || command.includes(" at ") || command.includes(" dot "))) {
        const email = normaliseEmail(transcript);
        if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setReactField(emailField, email);
          await say(`I heard ${email}. Your email address has been entered. Passwords are private. Please enter your password using your secure keyboard or password manager, then say sign in.`);
        } else await say("I could not confirm that email address. Please say it again.");
        return;
      }
      if (/^(sign in|log in|login|submit)$/.test(command)) {
        if (path === "/login" && document.querySelector('button[type="submit"]')) {
          if (document.querySelector('button[type="submit"]')?.textContent?.toLowerCase().includes("email me")) {
            document.querySelector('button[type="submit"]')?.click();
            await say("Your secure sign-in link request has been submitted. Check your email inbox and open the link on this device.");
            return;
          }
        }
        if (passwordField && !passwordField.value) { await say("Your password field is empty. Please enter your password privately, then say sign in again."); return; }
        document.querySelector('form button[type="submit"]')?.click();
        await say("Your sign-in request is being processed. I will announce when your dashboard opens.");
        return;
      }
      if (emailField?.value) await say("I am ready. You can say sign in after entering your password privately, or say email sign-in link to use a secure email link.");
      else await say("Please say your email address. I will repeat it for confirmation. Your password must be entered privately.");
      return;
    }
  }, [beginSignup, finishSignupReview, navigate, promptSignupField, say, stopListening]);

  const handleSpeechRef = useRef(handleSpeech);
  handleSpeechRef.current = handleSpeech;

  useEffect(() => {
    const path = location.pathname;
    currentPathRef.current = path;
    const routeKey = `${path}:${location.search}:${voicePreferenceEnabled}`;
    if (routeRef.current === routeKey) return undefined;
    routeRef.current = routeKey;

    if (voicePreferenceEnabled === null) return undefined;

    const publicVoiceRoutes = [
      "/", "/signup", "/login", "/voice-login", "/forgot-password"
    ];

    let explicitVoiceOnboarding = false;
    try {
      explicitVoiceOnboarding = window.sessionStorage.getItem("uniable-voice-onboarding-active") === "1";
    } catch (error) {
      console.warn("Could not read the public voice onboarding state:", error);
    }

    if (!voicePreferenceEnabled && !explicitVoiceOnboarding) {
      stopListening();
      stopSpeaking();
      return undefined;
    }

    if (!publicVoiceRoutes.includes(path)) {
      stopListening();
      activeRef.current = true;

      const timer = window.setTimeout(() => {
        startListeningRef.current();
      }, 500);

      return () => {
        window.clearTimeout(timer);
        stopListening();
      };
    }
    signupReadyRef.current = false;
    verificationAnnouncedRef.current = false;
    stepRef.current = 0;
    pendingRef.current = null;
    reviewRef.current = false;
    stopListening();
    activeRef.current = true;

    const timer = window.setTimeout(async () => {
      if (path === "/") {
        await say("Welcome to the UniAble landing page. Your options are Voice sign-up, Type sign-up, Voice sign-in, and Email or password sign-in. Say Voice sign-up, Type sign-up, Voice sign-in, or Email sign-in. I am listening for your choice.");
      } else if (path === "/signup") {
        const textMode = new URLSearchParams(location.search).get("mode") === "text";
        if (textMode) {
          await say("The text sign-up page is open. You can complete the form using your preferred input method. Say switch to voice if you want spoken field guidance.");
          activeRef.current = false;
        } else {
          try { window.sessionStorage.setItem("uniable-voice-onboarding-active", "1"); } catch { /* optional */ }
          await beginSignup();
        }
      } else if (path === "/voice-login") {
        try { window.sessionStorage.setItem("uniable-voice-onboarding-active", "1"); } catch { /* optional */ }
        await say("The voice sign-in page is open. I can capture your email address by voice. For your security, enter your password privately, then say sign in. You can also return to the landing page.");
      } else if (path === "/login") {
        try { if (window.sessionStorage.getItem("uniable-voice-onboarding-active") === "1") window.sessionStorage.setItem("uniable-public-voice-guide", "1"); } catch { /* optional */ }
        await say("The email and password sign-in page is open. You can also request a secure email sign-in link. Say your email address to enter it by voice. Passwords are never spoken or recorded. Enter your password privately, then say sign in, or say email sign-in link. You can also say forgot password.");
      } else if (path === "/forgot-password") {
        await say("Forgot password page. Say your email address, then say send reset link. You can also say back to login.");
      }
    }, 500);
    return () => { window.clearTimeout(timer); stopListening(); };
  }, [location.pathname, location.search, beginSignup, say, stopListening, voicePreferenceEnabled]);


  useEffect(() => {
    if (location.pathname !== "/signup") return undefined;
    const announceVerification = () => {
      if (document.querySelector("#verification-heading") && !verificationAnnouncedRef.current) {
        verificationAnnouncedRef.current = true;
        void say("Your account has been created. The account verification page is open. Verification is by email only. Say send code to my email when you are ready.");
      }
    };
    const observer = new MutationObserver(announceVerification);
    observer.observe(document.body, { childList: true, subtree: true });
    announceVerification();
    return () => observer.disconnect();
  }, [location.pathname, say]);

  useEffect(() => () => { stopListening(); stopSpeaking(); }, [stopListening]);

  const publicVoiceRoutes = ["/", "/signup", "/login", "/voice-login", "/forgot-password"];
  return publicVoiceRoutes.includes(location.pathname)
    ? <SpokenOutputToggle floating />
    : null;
}




