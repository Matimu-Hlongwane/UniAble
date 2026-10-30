import React, { useEffect, useMemo, useRef, useState } from "react";
import { Bot, Copy, Mic, Send, Square, Volume2, VolumeX } from "lucide-react";
import { useSettings } from "../context/settingsContext/SettingsContext";
import { api } from "../services/api";
import { getUserAccessibilityProfile } from "../services/firebaseAuth";
import { startNativeVoiceRecognition } from "../services/platformVoice";
import { speak, stopSpeaking, resolveReplyLocale } from "../services/speechService";

const DEFAULT_PROFILE = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  photo: "",
};

const INITIAL_SUGGESTIONS = [
  { key: "unipalHowUse", fallback: "How do I use UniAble?" },
  { key: "unipalAccessibilityHelp", fallback: "Help me with accessibility settings" },
  { key: "unipalCampusHelp", fallback: "How can I find an accessible route?" },
  { key: "unipalStudyHelp", fallback: "Give me an accessible study tip" },
];

function loadProfile() {
  try {
    return { ...DEFAULT_PROFILE, ...(JSON.parse(localStorage.getItem("uniableProfile") || "{}")) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function loadLocalAccessibilityProfile() {
  try {
    return JSON.parse(localStorage.getItem("uniableAccessibilityProfile") || "null") || {};
  } catch {
    return {};
  }
}

export default function UniPal() {
  const { t, language, locale, theme, fontSize, spokenResponses } = useSettings();
  const profile = useMemo(loadProfile, []);
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: `${profile.firstName || "there"}, ${t("unipalWelcome")}`,
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceStop, setVoiceStop] = useState(null);
  const [speakingId, setSpeakingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const noticedLanguages = useRef(new Set());
  const [copiedId, setCopiedId] = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);

  useEffect(() => () => {
    voiceStop?.();
  }, [voiceStop]);

  // Never keep talking after the student leaves UniPal.
  useEffect(() => () => stopSpeaking(), []);

  // Turning spoken responses off in Settings silences any answer being read.
  useEffect(() => {
    if (!spokenResponses) {
      stopSpeaking();
      setSpeakingId(null);
    }
  }, [spokenResponses]);

  // Backend compatibility check: warn once if the server cannot answer in the chosen language.
  useEffect(() => {
    if (language === "English") return undefined;
    let cancelled = false;
    api.getUniPalCapabilities()
      .then((caps) => {
        if (!cancelled && caps?.features?.multilingualReplies === false) {
          setNotice(t("unipalBackendOutdated").replace("{language}", language));
        }
      })
      .catch((err) => {
        // A 404 means an older backend without the capabilities route.
        if (!cancelled && String(err?.message || "").includes("(404)")) {
          setNotice(t("unipalBackendOutdated").replace("{language}", language));
        }
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  /*
   * Reads a message aloud with a voice that matches the language the text is written in.
   * Unsupported languages / unavailable speech services never throw: the answer simply
   * stays on screen and a short notice explains why nothing was spoken.
   */
  const speakMessage = async (message, { automatic = false } = {}) => {
    const speechLocale = message.speechLocale || locale || "en-ZA";
    const speechLanguage = message.speechLocale && message.speechLocale !== locale ? "English" : language;

    const result = await speak(message.text, {
      locale: speechLocale,
      onStart: () => setSpeakingId(message.id),
      onEnd: () => setSpeakingId((current) => (current === message.id ? null : current)),
      onError: () => setNotice(t("unipalSpeechFailed")),
    });

    if (result.started) return true;

    if (["no-engine", "plugin-missing", "engine-error"].includes(result.reason)) {
      if (!automatic || !noticedLanguages.current.has("__engine__")) {
        noticedLanguages.current.add("__engine__");
        setNotice(t(result.reason === "plugin-missing" ? "spokenPluginMissing" : result.reason === "engine-error" ? "spokenEngineError" : "spokenVoiceNoEngine"));
      }
    } else if (result.reason !== "empty") {
      if (!automatic || !noticedLanguages.current.has(speechLanguage)) {
        noticedLanguages.current.add(speechLanguage);
        setNotice(t("unipalSpeechUnsupportedLanguage").replace("{language}", speechLanguage));
      }
    }
    return false;
  };

  const sendMessage = async (rawText) => {
    const text = String(rawText || "").trim();
    if (!text || busy) return;

    setError("");
    setNotice("");
    stopSpeaking();
    setSpeakingId(null);
    const userMessage = { id: crypto.randomUUID(), role: "user", text };
    const conversation = [...messages, userMessage].slice(-10);
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setBusy(true);

    try {
      const data = await api.chatWithUniPal({
        message: text,
        language,
        locale,
        profile: {
          firstName: profile.firstName || "",
          accessibility: await getUserAccessibilityProfile()
            .then((saved) => saved?.accessibilityProfile || loadLocalAccessibilityProfile())
            .catch(() => loadLocalAccessibilityProfile()),
          preferences: { theme, fontSize },
        },
        messages: conversation.map(({ role, text: messageText }) => ({
          role,
          content: messageText,
        })),
      });

      const reply = data.message || t("unipalGenericError");
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: reply,
        speechLocale: resolveReplyLocale(data, locale),
      };
      setMessages((current) => [...current, assistantMessage]);

      // Explain why an answer is not in the chosen language (AI service offline / no API key).
      const replyBase = String(assistantMessage.speechLocale).split("-")[0];
      const chosenBase = String(locale || "en-ZA").split("-")[0];
      if (replyBase !== chosenBase) setNotice(t("unipalReplyNotTranslated"));

      // Automatic spoken response (Settings > Language & Region > Spoken responses).
      if (spokenResponses && data.message) speakMessage(assistantMessage, { automatic: true });
    } catch (err) {
      const message = err?.message || t("unipalGenericError");
      setError(message);
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: message,
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const handleVoice = async () => {
    if (voiceListening) {
      await voiceStop?.();
      return;
    }

    setError("");
    // Stop UniPal talking so the microphone does not pick up its own voice.
    stopSpeaking();
    setSpeakingId(null);
    try {
      const stop = await startNativeVoiceRecognition({
        language: locale || "en-ZA",
        onResult: (text, isFinal) => {
          setInput(text);
          if (isFinal) sendMessage(text);
        },
        onError: (err) => {
          setError(err?.message || t("unipalVoiceError"));
          setVoiceListening(false);
          setVoiceStop(null);
        },
        onEnd: () => {
          setVoiceListening(false);
          setVoiceStop(null);
        },
      });
      setVoiceStop(() => stop);
      setVoiceListening(true);
    } catch (err) {
      setError(err?.message || t("unipalVoiceError"));
      setVoiceListening(false);
      setVoiceStop(null);
    }
  };

  const handleSpeak = (message) => {
    if (speakingId === message.id) {
      stopSpeaking();
      setSpeakingId(null);
      return;
    }
    setNotice("");
    speakMessage(message);
  };

  const handleCopy = async (message) => {
    try {
      await navigator.clipboard.writeText(message.text);
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1400);
    } catch {
      setError(t("unipalCopyError"));
    }
  };

  const suggestionText = (item) => t(item.key) || item.fallback;

  return (
    <section className="page unipal-page">
      <div className="unipal-header">
        <div className="unipal-brand-row">
          <div className="unipal-logo" aria-hidden="true">
            <Bot size={25} />
          </div>
          <div>
            <h1>UniPal</h1>
            <p>{t("unipalMotto")}</p>
          </div>
        </div>
        <span className="unipal-status"><span className="unipal-status-dot" /> {t("unipalReady")}</span>
      </div>

      <div className="unipal-intro-card">
        <div>
          <strong>{t("unipalScopeTitle")}</strong>
          <p>{t("unipalScopeDescription")}</p>
        </div>
      </div>

      <div className="unipal-chat-card" aria-live="polite">
        <div className="unipal-messages">
          {messages.map((message) => (
            <div key={message.id} className={`unipal-message-row ${message.role}`}>
              <div className={`unipal-message ${message.role}`}>
                {message.role === "assistant" && (
                  <div className="unipal-message-avatar" aria-hidden="true"><Bot size={16} /></div>
                )}
                <div className="unipal-message-content">
                  <p>{message.text}</p>
                  {message.role === "assistant" && message.id !== "welcome" && (
                    <div className="unipal-message-actions">
                      <button type="button" onClick={() => handleSpeak(message)} aria-label={speakingId === message.id ? t("unipalStopSpeaking") : t("unipalSpeak")} title={speakingId === message.id ? t("unipalStopSpeaking") : t("unipalSpeak")}>
                        {speakingId === message.id ? <VolumeX size={15} /> : <Volume2 size={15} />}
                      </button>
                      <button type="button" onClick={() => handleCopy(message)} aria-label={t("unipalCopy")} title={t("unipalCopy")}>
                        <Copy size={15} />
                      </button>
                      {copiedId === message.id && <span>{t("unipalCopied")}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {busy && (
            <div className="unipal-message-row assistant">
              <div className="unipal-message assistant">
                <div className="unipal-message-avatar" aria-hidden="true"><Bot size={16} /></div>
                <div className="unipal-typing" aria-label={t("unipalThinking")}>
                  <span /><span /><span />
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        <div className="unipal-suggestions">
          {INITIAL_SUGGESTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => sendMessage(suggestionText(item))}
              disabled={busy}
            >
              {suggestionText(item)}
            </button>
          ))}
        </div>

        {error && <div className="unipal-error" role="alert">{error}</div>}
        {notice && <div className="unipal-notice" role="status">{notice}</div>}

        <form className="unipal-composer" onSubmit={(event) => {
          event.preventDefault();
          sendMessage(input);
        }}>
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder={t("unipalPlaceholder")}
            aria-label={t("unipalPlaceholder")}
            disabled={busy}
          />
          <button
            type="button"
            className={`unipal-voice-button ${voiceListening ? "listening" : ""}`}
            onClick={handleVoice}
            aria-label={voiceListening ? t("unipalStopListening") : t("unipalVoiceInput")}
            title={voiceListening ? t("unipalStopListening") : t("unipalVoiceInput")}
            disabled={busy}
          >
            {voiceListening ? <Square size={18} fill="currentColor" /> : <Mic size={19} />}
          </button>
          <button type="submit" className="unipal-send-button" disabled={busy || !input.trim()} aria-label={t("unipalSend")}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </section>
  );
}
