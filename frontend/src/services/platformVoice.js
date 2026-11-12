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

function startBrowserVoiceRecognition({ language, onResult, onError, onEnd }) {
  const Recognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!Recognition) {
    throw new Error(
      "This browser does not support speech recognition. Try the UniAble Android app or a supported browser."
    );
  }

  const recognition = new Recognition();
  recognition.lang = language || "en-ZA";
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.maxAlternatives = 5;

  let ended = false;
  let finalSent = false;
  let latestInterim = "";

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

      if (!result.isFinal && result[0]?.transcript) {
        latestInterim = String(result[0].transcript).trim();
      }
    }

    const finalResult = [...candidates].sort(
      (a, b) => b.confidence - a.confidence
    )[0];

    if (
      finalResult &&
      !finalSent &&
      event.results[event.results.length - 1]?.isFinal
    ) {
      finalSent = true;
      onResult?.(finalResult.transcript, true, {
        confidence: finalResult.confidence,
        alternatives: candidates.map((candidate) => candidate.transcript),
      });
    } else if (latestInterim) {
      onResult?.(latestInterim, false, { interim: true });
    }
  };

  recognition.onerror = (event) => {
    if (["not-allowed", "service-not-allowed"].includes(event.error)) {
      onError?.(
        new Error(
          "Microphone permission is required. Allow microphone access in your browser or device settings, then reload UniAble."
        )
      );
    } else if (event.error !== "no-speech" && event.error !== "aborted") {
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

// Keep the historical name for compatibility with existing components.
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

  console.info("[UniAble Voice] Checking recognition availability.");
  const available = await isVoiceRecognitionAvailable();
  console.info("[UniAble Voice] Recognition available:", available);

  if (!available) {
    throw new Error("Voice recognition is not available on this device.");
  }

  console.info("[UniAble Voice] Requesting speech permission.");
  const granted = await requestVoicePermission();
  console.info("[UniAble Voice] Speech permission granted:", granted);

  if (!granted) {
    throw new Error(
      "Microphone or speech recognition permission was denied."
    );
  }

  try {
    console.info("[UniAble Voice] Checking existing listening session.");
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
  } catch {
    // There may not be an active recognition session.
  }

  let recognitionLanguage = language || "en-ZA";

  try {
    console.info("[UniAble Voice] Loading supported languages.");
    const result = await SpeechRecognition.getSupportedLanguages();
    console.info("[UniAble Voice] Supported languages:", result?.languages);
    const supported = (result.languages || []).map(String);

    if (supported.length) {
      const exact = supported.find(
        (item) =>
          item.toLowerCase() === recognitionLanguage.toLowerCase()
      );

      const base = recognitionLanguage.split("-")[0].toLowerCase();

      recognitionLanguage =
        exact ||
        supported.find(
          (item) => item.split("-")[0].toLowerCase() === base
        ) ||
        supported.find((item) => item.toLowerCase() === "en-za") ||
        supported[0];
    }
  } catch {
    // Continue with the requested locale if language lookup fails.
  }

  let ended = false;

  const finish = () => {
    if (ended) return;
    ended = true;
    onEnd?.();
  };

  // In non-partial mode, Android resolves this promise with the final
  // recognised matches instead of sending partialResults events.
  let startPromise;

  try {
    console.info("[UniAble Voice] Calling native SpeechRecognition.start().", recognitionLanguage);
    startPromise = SpeechRecognition.start({
      language: recognitionLanguage,
      maxResults: 5,
      partialResults: false,
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
      console.warn("Speech recognition stop failed.", error);
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

