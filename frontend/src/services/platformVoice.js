import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

const isNative = () => Capacitor.isNativePlatform();

export async function isVoiceRecognitionAvailable() {
  if (isNative()) {
    const { available } = await SpeechRecognition.available();
    return Boolean(available);
  }

  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export async function requestVoicePermission() {
  if (!isNative()) return true;

  const permission = await SpeechRecognition.requestPermissions();
  return permission.speechRecognition === "granted";
}

/*
 * Android speech recognition can expose different language lists depending
 * on the speech engine installed on the device. We ask the engine for its
 * supported languages and use English (South Africa) as a safe fallback.
 */
async function getNativeLanguage(preferredLanguage) {
  const fallback = "en-ZA";

  try {
    const result = await SpeechRecognition.getSupportedLanguages();
    const supported = (result.languages || []).map(String);

    if (!supported.length) return preferredLanguage || fallback;

    const exact = supported.find(
      (item) => item.toLowerCase() === String(preferredLanguage).toLowerCase()
    );

    if (exact) return exact;

    const base = String(preferredLanguage).split("-")[0].toLowerCase();
    const sameLanguage = supported.find(
      (item) => item.split("-")[0].toLowerCase() === base
    );

    if (sameLanguage) return sameLanguage;

    return supported.find((item) => item.toLowerCase() === fallback.toLowerCase()) || supported[0];
  } catch {
    return preferredLanguage || fallback;
  }
}

export async function startNativeVoiceRecognition({
  language = "en-ZA",
  onResult,
  onError,
  onEnd,
}) {
  const available = await isVoiceRecognitionAvailable();
  if (!available) throw new Error("Voice recognition is not available on this device.");

  const granted = await requestVoicePermission();
  if (!granted) throw new Error("Microphone or speech recognition permission was denied.");

  /*
   * The community plugin streams native Android/iOS speech through
   * partialResults. We deliberately install listeners before start() so the
   * first result cannot be missed. A short cleanup guard also prevents a
   * previous session's stopped event from ending a newly-started session.
   */
  try {
    const state = await SpeechRecognition.isListening();
    if (state.listening) await SpeechRecognition.stop();
  } catch {
    // No active native recognition session needs stopping.
  }


  const recognitionLanguage = await getNativeLanguage(language);
  let ended = false;
  let latestText = "";
  let listeningTimeout;

  const removeListeners = async () => {
    window.clearTimeout(listeningTimeout);
    await Promise.allSettled([resultListener.remove(), stateListener.remove()]);
  };

  const resultListener = await SpeechRecognition.addListener("partialResults", (data) => {
    const matches = Array.isArray(data?.matches) ? data.matches : [];
    const text = String(matches[0] || "").trim();
    if (!text || ended) return;
    latestText = text;
    onResult?.(text, false);
  });

  const stateListener = await SpeechRecognition.addListener("listeningState", (data) => {
    if (data?.status === "stopped" && !ended) {
      ended = true;
      if (latestText) onResult?.(latestText, true);
      onEnd?.();
      void removeListeners();
    }
  });

  try {
    await SpeechRecognition.start({
      language: recognitionLanguage,
      maxResults: 5,
      partialResults: true,
      popup: false,
    });
  } catch (error) {
    ended = true;
    await removeListeners();
    onError?.(error);
    throw error;
  }

  if (!ended) {
    listeningTimeout = window.setTimeout(() => {
      if (ended) return;
      onError?.(new Error("Voice recognition timed out. Please try again."));
      void stopRecognition();
    }, 20000);
  }

  async function stopRecognition() {
    if (ended) return;
    try {
      await SpeechRecognition.stop();
    } catch (error) {
      console.warn("Speech recognition stop failed; cleaning up listeners.", error);
    } finally {
      if (!ended) {
        ended = true;
        if (latestText) onResult?.(latestText, true);
        onEnd?.();
      }
      await removeListeners();
    }
  }

  return stopRecognition;
}

export { isNative };
