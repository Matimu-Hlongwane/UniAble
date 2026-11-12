import { Capacitor } from "@capacitor/core";
import { SpeechRecognition } from "@capacitor-community/speech-recognition";

const isNative = () => Capacitor.isNativePlatform();

export async function isVoiceRecognitionAvailable() {
  if (isNative()) {
    const { available } = await SpeechRecognition.available();
    return Boolean(available);
  }

  return Boolean(
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition)
  );
}

export async function requestVoicePermission() {
  if (!isNative()) return true;

  const permission = await SpeechRecognition.requestPermissions();
  return permission.speechRecognition === "granted";
}

function startBrowserVoiceRecognition({
  language = "en-ZA",
  onResult,
  onError,
  onEnd,
}) {
  const Recognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    throw new Error(
      "This browser does not support speech recognition. Try a supported browser or the UniAble mobile app."
    );
  }

  const recognition = new Recognition();

  recognition.lang = language;
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;

  let ended = false;
  let finalSent = false;

  const finish = () => {
    if (ended) return;
    ended = true;
    onEnd?.();
  };

  recognition.onresult = (event) => {
    const candidates = [];

    for (
      let index = event.resultIndex;
      index < event.results.length;
      index += 1
    ) {
      const result = event.results[index];

      for (let option = 0; option < result.length; option += 1) {
        const candidate = result[option];
        const transcript = String(candidate?.transcript || "").trim();

        if (transcript) {
          candidates.push({
            transcript,
            confidence: Number(candidate.confidence) || 0,
          });
        }
      }
    }

    const best = candidates.sort(
      (a, b) => b.confidence - a.confidence
    )[0];

    const latestResult = event.results[event.results.length - 1];

    if (best && latestResult?.isFinal && !finalSent) {
      finalSent = true;
      onResult?.(best.transcript, true, {
        confidence: best.confidence,
        alternatives: candidates.map((item) => item.transcript),
      });
    } else if (best) {
      onResult?.(best.transcript, false, { interim: true });
    }
  };

  recognition.onerror = (event) => {
    if (["not-allowed", "service-not-allowed"].includes(event.error)) {
      onError?.(
        new Error(
          "Microphone permission is required. Allow microphone access in your browser or device settings, then reload UniAble."
        )
      );
    } else if (!["no-speech", "aborted"].includes(event.error)) {
      onError?.(new Error(`Voice recognition issue: ${event.error}`));
    }

    if (
      ["not-allowed", "service-not-allowed", "audio-capture"].includes(
        event.error
      )
    ) {
      finish();
    }
  };

  recognition.onend = finish;

  try {
    recognition.start();
  } catch (error) {
    finish();
    throw error;
  }

  return async () => {
    if (ended) return;

    try {
      recognition.stop();
    } catch {
      // Recognition may already have stopped.
    }

    finish();
  };
}

async function getNativeLanguage(preferredLanguage) {
  const requested = String(preferredLanguage || "en-ZA");

  try {
    const result = await SpeechRecognition.getSupportedLanguages();
    const supported = (result.languages || []).map(String);

    if (!supported.length) return requested;

    const exact = supported.find(
      (item) => item.toLowerCase() === requested.toLowerCase()
    );

    if (exact) return exact;

    const base = requested.split("-")[0].toLowerCase();

    return (
      supported.find(
        (item) => item.split("-")[0].toLowerCase() === base
      ) ||
      supported.find((item) => item.toLowerCase() === "en-za") ||
      supported[0]
    );
  } catch {
    return requested;
  }
}

export async function startNativeVoiceRecognition({
  language = "en-ZA",
  onResult,
  onError,
  onEnd,
}) {
  if (!isNative()) {
    return startBrowserVoiceRecognition({
      language,
      onResult,
      onError,
      onEnd,
    });
  }

  const available = await isVoiceRecognitionAvailable();

  if (!available) {
    throw new Error("Voice recognition is not available on this device.");
  }

  const granted = await requestVoicePermission();

  if (!granted) {
    throw new Error("Microphone or speech recognition permission was denied.");
  }

  try {
    const state = await SpeechRecognition.isListening();

    if (state.listening) {
      await SpeechRecognition.stop();
    }
  } catch {
    // No active native recognition session needs stopping.
  }

  const recognitionLanguage = await getNativeLanguage(language);

  let ended = false;
  let finalSent = false;
  let latestText = "";
  let listeningTimeout;
  let resultListener;
  let stateListener;

  const removeListeners = async () => {
    globalThis.clearTimeout(listeningTimeout);

    await Promise.allSettled(
      [resultListener, stateListener]
        .filter(Boolean)
        .map((listener) => listener.remove())
    );
  };

  const finish = async (deliverFinal = true) => {
    if (ended) return;

    ended = true;
    globalThis.clearTimeout(listeningTimeout);

    if (deliverFinal && latestText && !finalSent) {
      finalSent = true;
      onResult?.(latestText, true);
    }

    onEnd?.();
    await removeListeners();
  };

  try {
    resultListener = await SpeechRecognition.addListener(
      "partialResults",
      (data) => {
        const matches = Array.isArray(data?.matches) ? data.matches : [];
        const text = String(matches[0] || "").trim();

        if (!text || ended) return;

        latestText = text;
        onResult?.(text, false);
      }
    );

    stateListener = await SpeechRecognition.addListener(
      "listeningState",
      (data) => {
        if (data?.status === "stopped") {
          void finish(true);
        }
      }
    );

    listeningTimeout = globalThis.setTimeout(() => {
      if (ended) return;

      onError?.(
        new Error("Voice recognition timed out. Please try again.")
      );

      void stopRecognition();
    }, 20000);

    const startResult = await SpeechRecognition.start({
      language: recognitionLanguage,
      maxResults: 5,
      partialResults: true,
      popup: false,
    });

    const matches = Array.isArray(startResult?.matches)
      ? startResult.matches
      : [];

    if (matches.length && !latestText && !ended) {
      latestText = String(matches[0] || "").trim();
    }
  } catch (error) {
    await finish(false);
    onError?.(error);
    throw error;
  }

  async function stopRecognition() {
    if (ended) return;

    try {
      await SpeechRecognition.stop();
    } catch (error) {
      console.warn("Speech recognition stop failed.", error);
    } finally {
      await finish(true);
    }
  }

  return stopRecognition;
}

export { isNative };
