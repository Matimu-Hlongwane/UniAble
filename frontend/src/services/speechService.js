import { Capacitor, registerPlugin } from "@capacitor/core";

/*
 * UniPal spoken responses.
 *
 * Engines, in order of preference:
 *   1. Native Android/iOS text-to-speech through @capacitor-community/text-to-speech.
 *      This is the most reliable option inside the Capacitor WebView. The plugin is
 *      registered by name, so the app still builds and runs if it has not been
 *      installed yet - it simply falls back to the web engine.
 *   2. The browser/WebView Web Speech API (window.speechSynthesis).
 *
 * A language is only spoken when a voice for that language really exists. We never
 * read isiXhosa (for example) with an English voice, because that is unintelligible.
 * When no voice exists the caller receives { supported: false } and shows the answer
 * as text only.
 */

const NativeTTS = registerPlugin("TextToSpeech");

// Three-letter language codes some Android engines report -> two-letter base codes.
const BASE_ALIASES = {
  eng: "en", afr: "af", zul: "zu", xho: "xh", nbl: "nr",
  sot: "st", tsn: "tn", ssw: "ss", ven: "ve", tso: "ts",
};

const SUPPORT_CACHE_MS = 60 * 1000;
const supportCache = new Map();

const normalise = (value) => String(value || "").replace(/_/g, "-").trim().toLowerCase();

function baseOf(value) {
  const base = normalise(value).split("-")[0];
  return BASE_ALIASES[base] || base;
}

/* ---------- text preparation ---------- */

export function cleanForSpeech(text) {
  let out = String(text || "");
  out = out.replace(/```[\s\S]*?```/g, " ");
  out = out.replace(/`([^`]*)`/g, "$1");
  out = out.replace(/!\[[^\]]*\]\([^)]*\)/g, " ");
  out = out.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  out = out.replace(/https?:\/\/\S+/g, " ");
  out = out.replace(/^\s{0,3}#{1,6}\s*/gm, "");
  out = out.replace(/^\s*[-*•]\s+/gm, "");
  out = out.replace(/[*_~>|]+/g, " ");
  try {
    out = out.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, " ");
  } catch (_) { /* very old engines: leave emoji in place */ }
  // Make line breaks sound like sentence breaks.
  out = out.replace(/([^.!?…:;\s])\s*\n+\s*/g, "$1. ");
  out = out.replace(/\s*\n+\s*/g, " ");
  return out.replace(/\s{2,}/g, " ").trim();
}

export function splitIntoChunks(text, maxLength = 220) {
  const sentences = String(text || "").match(/[^.!?…]+[.!?…]+["')\]]*\s*|[^.!?…]+$/g) || [];
  const chunks = [];
  let current = "";

  const push = (piece) => {
    const value = piece.trim();
    if (value) chunks.push(value);
  };

  for (const sentenceRaw of sentences) {
    const sentence = sentenceRaw.trim();
    if (!sentence) continue;

    if (sentence.length > maxLength) {
      push(current);
      current = "";
      let line = "";
      for (const word of sentence.split(/\s+/)) {
        if ((line + " " + word).trim().length > maxLength) {
          push(line);
          line = word;
        } else {
          line = (line + " " + word).trim();
        }
      }
      push(line);
      continue;
    }

    if ((current + " " + sentence).trim().length > maxLength) {
      push(current);
      current = sentence;
    } else {
      current = (current + " " + sentence).trim();
    }
  }
  push(current);
  return chunks;
}

/* ---------- voice / language matching ---------- */

/** Pick the best Web Speech voice for a locale, or null when none matches the language. */
export function findBestVoice(voices, locale) {
  const list = Array.isArray(voices) ? voices : [];
  const wanted = normalise(locale);
  const wantedBase = baseOf(locale);
  if (!wantedBase) return null;

  const rank = (voice) => (voice.default ? 0 : 1) + (voice.localService ? 0 : 0.5);
  const byRank = (a, b) => rank(a) - rank(b);

  const exact = list.filter((voice) => normalise(voice.lang) === wanted).sort(byRank);
  if (exact.length) return exact[0];

  const sameLanguage = list.filter((voice) => baseOf(voice.lang) === wantedBase).sort(byRank);
  return sameLanguage[0] || null;
}

/** Pick the best language tag from a plain list of tags (native engines). */
export function findBestLanguageTag(tags, locale) {
  const list = (Array.isArray(tags) ? tags : []).map(String);
  const wanted = normalise(locale);
  const wantedBase = baseOf(locale);
  if (!wantedBase) return null;
  return (
    list.find((tag) => normalise(tag) === wanted) ||
    list.find((tag) => baseOf(tag) === wantedBase) ||
    null
  );
}

function loadWebVoices(timeoutMs = 1500) {
  return new Promise((resolve) => {
    const synth = typeof window !== "undefined" ? window.speechSynthesis : null;
    if (!synth) return resolve([]);

    const immediate = synth.getVoices?.() || [];
    if (immediate.length) return resolve(immediate);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      synth.removeEventListener?.("voiceschanged", finish);
      resolve(synth.getVoices?.() || []);
    };
    synth.addEventListener?.("voiceschanged", finish);
    window.setTimeout(finish, timeoutMs);
  });
}

const hasNativeEngine = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("TextToSpeech");

const hasWebEngine = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  typeof window.SpeechSynthesisUtterance !== "undefined";

/**
 * Checks whether UniPal can speak in the given locale on this device.
 * Resolves to { supported, engine, lang, voice, reason } and never throws.
 * reason: "ok" | "no-engine" | "no-voice" | "unconfirmed-voice"
 */
export async function getSpeechSupport(locale, { force = false } = {}) {
  const key = normalise(locale) || "en-za";
  const cached = supportCache.get(key);
  if (!force && cached && Date.now() - cached.at < SUPPORT_CACHE_MS) return cached.value;

  const value = await detectSupport(locale);
  supportCache.set(key, { at: Date.now(), value });
  return value;
}

async function detectSupport(locale) {
  const unsupported = (reason, engine = null) => ({
    supported: false, engine, lang: null, voice: null, reason,
  });

  let nativeFailed = false;
  if (hasNativeEngine()) {
    try {
      const { languages = [] } = await NativeTTS.getSupportedLanguages();
      const match = findBestLanguageTag(languages, locale);
      if (match) return { supported: true, engine: "native", lang: match, voice: null, reason: "ok" };

      if (!languages.length) {
        const { supported } = await NativeTTS.isLanguageSupported({ lang: locale });
        if (supported) return { supported: true, engine: "native", lang: locale, voice: null, reason: "ok" };
      }
      return unsupported("no-voice", "native");
    } catch (error) {
      nativeFailed = true;
      console.warn("Native text-to-speech check failed; trying the web engine.", error);
    }
  }

  if (!hasWebEngine()) {
    // Be specific: Android's WebView normally has no speech engine of its own.
    if (nativeFailed) return unsupported("engine-error", "native");
    if (Capacitor.isNativePlatform()) return unsupported("plugin-missing");
    return unsupported("no-engine");
  }

  const voices = await loadWebVoices();
  const voice = findBestVoice(voices, locale);
  if (voice) return { supported: true, engine: "web", lang: voice.lang, voice, reason: "ok" };

  // Some WebViews expose speechSynthesis but never list voices. English can still be
  // spoken by the engine default; other languages cannot be verified, so we skip them.
  if (!voices.length && baseOf(locale) === "en") {
    return { supported: true, engine: "web", lang: locale, voice: null, reason: "ok" };
  }
  return unsupported(voices.length ? "no-voice" : "unconfirmed-voice", "web");
}

/** Small summary for compatibility checks and debugging. */
export function getSpeechDiagnostics() {
  return {
    platform: Capacitor.getPlatform(),
    nativePlatform: Capacitor.isNativePlatform(),
    nativeEngineAvailable: hasNativeEngine(),
    webEngineAvailable: hasWebEngine(),
    nativePluginMissing: Capacitor.isNativePlatform() && !Capacitor.isPluginAvailable("TextToSpeech"),
  };
}

/* ---------- playback ---------- */

let session = null;

function endSession(target, error) {
  if (!target || target.ended) return;
  target.ended = true;
  if (session === target) session = null;
  if (error) target.onError?.(error);
  target.onEnd?.();
}

/** Stops any speech that is currently playing. Safe to call at any time. */
export function stopSpeaking() {
  const current = session;
  session = null;
  if (current) {
    current.cancelled = true;
    endSession(current);
  }
  try { window.speechSynthesis?.cancel?.(); } catch (_) {}
  if (Capacitor.isNativePlatform() && Capacitor.isPluginAvailable("TextToSpeech")) {
    Promise.resolve(NativeTTS.stop()).catch(() => {});
  }
}

/**
 * Speaks text in the given locale.
 * Resolves to { started, reason } - started is false when the language/engine is
 * unavailable, in which case nothing was spoken and the UI should show text only.
 * onStart / onEnd / onError are optional callbacks; onEnd fires on finish or stop.
 */
export async function speak(text, { locale = "en-ZA", rate = 0.96, pitch = 1, onStart, onEnd, onError } = {}) {
  stopSpeaking();

  const clean = cleanForSpeech(text);
  if (!clean) return { started: false, reason: "empty" };

  const support = await getSpeechSupport(locale);
  if (!support.supported) return { started: false, reason: support.reason };

  const current = { cancelled: false, ended: false, onEnd, onError };
  session = current;

  const run = support.engine === "native"
    ? playNative(clean, support, { rate, pitch, current, onStart })
    : playWeb(clean, support, locale, { rate, pitch, current, onStart });

  run.catch((error) => endSession(current, error));
  return { started: true, reason: "ok", engine: support.engine };
}

async function playNative(text, support, { rate, pitch, current, onStart }) {
  const chunks = splitIntoChunks(text, 900);
  onStart?.();
  for (const chunk of chunks) {
    if (current.cancelled) return;
    await NativeTTS.speak({
      text: chunk,
      lang: support.lang,
      rate,
      pitch,
      volume: 1.0,
      category: "ambient",
      queueStrategy: 1,
    });
  }
  endSession(current);
}

function playWeb(text, support, locale, { rate, pitch, current, onStart }) {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis;
    const chunks = splitIntoChunks(text, 220);
    let index = 0;

    const next = () => {
      if (current.cancelled || current.ended) return resolve();
      if (index >= chunks.length) {
        endSession(current);
        return resolve();
      }

      const utterance = new window.SpeechSynthesisUtterance(chunks[index]);
      utterance.lang = support.voice?.lang || support.lang || locale;
      if (support.voice) utterance.voice = support.voice;
      utterance.rate = rate;
      utterance.pitch = pitch;
      if (index === 0) utterance.onstart = () => onStart?.();
      index += 1;

      utterance.onend = next;
      utterance.onerror = (event) => {
        if (current.cancelled || current.ended) return resolve();
        if (event?.error === "interrupted" || event?.error === "canceled") return resolve();
        endSession(current, new Error(event?.error || "speech-error"));
        resolve();
      };

      try {
        synth.speak(utterance);
      } catch (error) {
        endSession(current, error);
        resolve();
      }
    };

    try { synth.cancel(); } catch (_) {}
    next();
  });
}

/**
 * Decide which locale the reply text is actually written in, so we pick the right
 * voice. Newer backends send replyLocale; older ones do not, in which case an AI answer
 * is assumed to be in the selected language and any local/demo answer is English.
 */
export function resolveReplyLocale(data, selectedLocale) {
  if (data?.replyLocale) return String(data.replyLocale);
  if (data?.source === "ai") return selectedLocale || "en-ZA";
  return "en-ZA";
}
