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
    console.info("[UniAble Voice] Existing listening state:", state);

    if (state.listening) {
      await SpeechRecognition.stop();
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
    finish();
    onError?.(error);
    throw error;
  }

  // Handle the final result in the background so the caller receives
  // the stop function immediately.
  startPromise
    .then((result) => {
      if (ended) return;

      const matches = Array.isArray(result?.matches)
        ? result.matches.map((item) => String(item || "").trim()).filter(Boolean)
        : [];

      if (matches.length) {
        onResult?.(matches[0], true, {
          alternatives: matches,
        });
      }

      finish();
    })
    .catch((error) => {
      if (ended) return;

      onError?.(error);
      finish();
    });

  // The existing voice guide can call this when it needs to pause,
  // speak a greeting, or leave the page.
  return async () => {
    if (ended) return;

    try {
      await SpeechRecognition.stop();
    } catch (error) {
      console.warn("Speech recognition stop failed.", error);
    } finally {
      finish();
    }
  };
}

export { isNative };

