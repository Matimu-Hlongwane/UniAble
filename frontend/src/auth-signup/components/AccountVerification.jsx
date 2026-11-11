import React, { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { isNative, startNativeVoiceRecognition } from "../../services/platformVoice";
import { speak } from "../../services/speechService";
import { normalizeSpokenOtp } from "../utils/otpSpeech";

export default function AccountVerification({
  stage, method, setMethod, phoneNumber, setPhoneNumber, code, setCode,
  busy, error, email, locale = "en-ZA", onSendEmail, onSendPhone, onVerify, onResend, onBack,
}) {
  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "13px", border: "1px solid #777", borderRadius: 9, fontSize: 16, marginTop: 7, marginBottom: 14 };
  const buttonStyle = { padding: "12px 16px", borderRadius: 9, border: "1px solid currentColor", cursor: busy ? "wait" : "pointer", fontSize: 15, fontWeight: 600, margin: "5px 6px 5px 0" };
  const [listening, setListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");
  const [voiceError, setVoiceError] = useState("");
  const [transcript, setTranscript] = useState("");
  const nativeStopRef = useRef(null);
  const browserRecognitionRef = useRef(null);

  useEffect(() => () => {
    browserRecognitionRef.current?.abort?.();
    void nativeStopRef.current?.();
  }, []);

  async function handleSpeakCode() {
    setVoiceError("");
    setVoiceStatus("");
    setTranscript("");

    if (listening) {
      if (isNative()) {
        await nativeStopRef.current?.();
      } else {
        browserRecognitionRef.current?.stop();
      }
      return;
    }

    try {
      if (isNative()) {
        setListening(true);
        nativeStopRef.current = await startNativeVoiceRecognition({
          language: locale,
          onResult: (spokenText, isFinal) => {
            setTranscript(spokenText);
            if (!isFinal) return;
            const spokenCode = normalizeSpokenOtp(spokenText);
            if (!spokenCode) {
              setVoiceError("I couldn't recognise six digits. Try again, saying each digit separately.");
              return;
            }
            setCode(spokenCode);
            setVoiceStatus("Six-digit code captured. Check it before verifying.");
          },
          onEnd: () => {
            nativeStopRef.current = null;
            setListening(false);
          },
          onError: (recognitionError) => {
            nativeStopRef.current = null;
            setListening(false);
            setVoiceError(recognitionError?.message || "Voice input failed. You can type the code instead.");
          },
        });
        return;
      }

      const BrowserRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!BrowserRecognition) {
        throw new Error("Voice recognition is not available in this browser. You can type the code instead.");
      }

      const recognition = new BrowserRecognition();
      browserRecognitionRef.current = recognition;
      recognition.lang = locale;
      recognition.maxAlternatives = 1;
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.onresult = (event) => {
        const result = event.results?.[event.resultIndex];
        const spokenText = String(result?.[0]?.transcript || "").trim();
        if (!spokenText) return;
        setTranscript(spokenText);
        if (!result.isFinal) return;
        const spokenCode = normalizeSpokenOtp(spokenText);
        if (!spokenCode) {
          setVoiceError("I couldn't recognise six digits. Try again, saying each digit separately.");
          return;
        }
        setCode(spokenCode);
        setVoiceStatus("Six-digit code captured. Check it before verifying.");
      };
      recognition.onerror = (recognitionError) => {
        setListening(false);
        setVoiceError(recognitionError.error === "not-allowed"
          ? "Microphone permission was denied. Allow microphone access or type the code."
          : "Voice input failed. Please try again or type the code.");
      };
      recognition.onend = () => {
        browserRecognitionRef.current = null;
        setListening(false);
      };
      recognition.start();
      setListening(true);
    } catch (recognitionError) {
      nativeStopRef.current = null;
      setListening(false);
      setVoiceError(recognitionError?.message || "Voice input failed. You can type the code instead.");
    }
  }

  async function handleReadCode() {
    try {
      const result = await speak(
        `Your verification code is ${code.split("").join(", ")}.`,
        { locale }
      );
      if (!result.started) {
        setVoiceError("Spoken code is unavailable on this device. The code remains visible on screen.");
      } else {
        setVoiceStatus("Reading the code aloud. Make sure others cannot hear it.");
      }
    } catch (speechError) {
      console.error("Could not read the verification code aloud:", speechError);
      setVoiceError("Could not read the code aloud. The code remains visible on screen.");
    }
  }

  return (
    <section aria-labelledby="verification-heading" style={{ maxWidth: 520, margin: "0 auto", padding: 18 }}>
      <h2 id="verification-heading">Verify your UniAble account</h2>
      <div id="uniable-phone-recaptcha" />
      {stage === "choose" ? <>
        <p>Choose one method. You only need to verify using email or SMS.</p>
        <p><strong>Email address:</strong> {email || "Not available"}</p>
        <div role="group" aria-label="Choose verification method">
          <button type="button" style={{ ...buttonStyle, background: method === "email" ? "#e8eefc" : "transparent" }} aria-pressed={method === "email"} onClick={() => setMethod("email")}>Email OTP</button>
          <button type="button" style={{ ...buttonStyle, background: method === "sms" ? "#e8eefc" : "transparent" }} aria-pressed={method === "sms"} onClick={() => setMethod("sms")}>SMS OTP</button>
        </div>
        {method === "email" && <button type="button" style={buttonStyle} disabled={busy} onClick={onSendEmail}>{busy ? "Sending…" : "Send code to my email"}</button>}
        {method === "sms" && <>
          <label htmlFor="verification-phone">South African mobile number</label>
          <input id="verification-phone" type="tel" autoComplete="tel" placeholder="0821234567, 821234567 or +27821234567" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} style={inputStyle} />
          <button type="button" style={buttonStyle} disabled={busy} onClick={onSendPhone}>{busy ? "Sending…" : "Send SMS code"}</button>
          <p>Enter your number with or without the first 0. UniAble will add South Africa&apos;s +27 country code.</p>
        </>}
      </> : <>
        <p>Enter the six-digit code sent to {method === "email" ? email : phoneNumber}. The code expires after 10 minutes.</p>
        <label htmlFor="verification-code">Six-digit verification code</label>
        <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} style={inputStyle} />
        <div role="group" aria-label="Voice verification code controls">
          <button type="button" style={buttonStyle} disabled={busy} onClick={handleSpeakCode}>
            {listening ? <><MicOff size={16} aria-hidden="true" /> Stop listening</> : <><Mic size={16} aria-hidden="true" /> Speak code</>}
          </button>
          <button type="button" style={buttonStyle} disabled={busy || code.length !== 6} onClick={handleReadCode}>
            <Volume2 size={16} aria-hidden="true" /> Read code aloud
          </button>
        </div>
        <p>To enter it by voice, say the six digits one at a time. Read-aloud only runs when you select it; use it somewhere private.</p>
        {transcript && <p role="status" aria-live="polite">Heard: {transcript}</p>}
        {voiceStatus && <p role="status" aria-live="polite">{voiceStatus}</p>}
        {voiceError && <p role="alert" style={{ color: "#b00020" }}>{voiceError}</p>}
        <button type="button" style={buttonStyle} disabled={busy || code.length !== 6} onClick={onVerify}>{busy ? "Verifying…" : "Verify code"}</button>
        <button type="button" style={buttonStyle} disabled={busy} onClick={onResend}>Send another code</button>
        <button type="button" style={buttonStyle} disabled={busy} onClick={onBack}>Choose another method</button>
      </>}
      {error && <p role="alert" style={{ color: "#b00020", marginTop: 12 }}>{error}</p>}
      <p style={{ fontSize: 13, marginTop: 18 }}>Keep your verification code private. UniAble staff will never ask you to share it.</p>
    </section>
  );
}
