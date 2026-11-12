import React, { useState } from "react";
import {
  startSpeechRecognition,
  speakText
} from "../services/speechService";

const spokenDigitMap = {
  zero: "0",
  oh: "0",
  one: "1",
  two: "2",
  three: "3",
  four: "4",
  five: "5",
  six: "6",
  seven: "7",
  eight: "8",
  nine: "9"
};

function convertSpokenDigits(transcript) {
  const tokens = transcript.toLowerCase().match(/[a-z]+|\d+/g) || [];

  if (tokens.length === 0) return null;

  let digits = "";

  for (const token of tokens) {
    if (/^\d+$/.test(token)) {
      digits += token;
    } else if (Object.prototype.hasOwnProperty.call(spokenDigitMap, token)) {
      digits += spokenDigitMap[token];
    } else {
      return null;
    }
  }

  return digits;
}

export default function AccountVerification({
  stage, code, setCode, busy, error, email, onSendEmail, onVerify, onResend, onBack,
}) {
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState("");

  const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    border: "1px solid #777",
    borderRadius: 9,
    fontSize: 16,
    marginTop: 7,
    marginBottom: 14
  };

  const buttonStyle = {
    padding: "12px 16px",
    borderRadius: 9,
    border: "1px solid currentColor",
    cursor: busy || isListening ? "wait" : "pointer",
    fontSize: 15,
    fontWeight: 600,
    margin: "5px 6px 5px 0"
  };

  function startVoiceInput() {
    if (busy || isListening) return;

    setVoiceError("");

    try {
      const recognition = startSpeechRecognition({
        onStart: () => {
          setIsListening(true);
        },

        onResult: (transcript) => {
          const spoken = transcript.trim();

          const digits = convertSpokenDigits(spoken);

          if (!digits || !/^\d{6}$/.test(digits)) {
            const message =
              "I could not recognise exactly six digits. Please try saying the code one digit at a time.";
            setVoiceError(message);
            speakText(message);
            return;
          }

          setCode(digits);
          speakText("Six-digit code entered. You can now select Verify code.");
        },

        onEnd: () => {
          setIsListening(false);
        },

        onError: (recognitionError) => {
          setIsListening(false);
          const message =
            recognitionError?.message || "Voice recognition failed. Please try again.";
          setVoiceError(message);
          speakText(message);
        }
      });

      if (!recognition) {
        setIsListening(false);
      }
    } catch (recognitionError) {
      setIsListening(false);
      const message =
        recognitionError?.message || "Unable to start voice recognition.";
      setVoiceError(message);
      speakText(message);
    }
  }

  function readInstructions() {
    if (stage === "choose") {
      speakText(
        `Account verification. A code will be sent to ${email || "your student email address"}. Select Send code to email to continue.`
      );
    } else {
      speakText(
        "Enter the six-digit code sent to your student email address. You can type the code or select Speak verification code and say all six digits."
      );
    }
  }

  return (
    <section
      aria-labelledby="verification-heading"
      style={{ maxWidth: 520, margin: "0 auto", padding: 18 }}
    >
      <h2 id="verification-heading">Verify your UniAble account</h2>

      <button
        type="button"
        style={buttonStyle}
        onClick={readInstructions}
        disabled={busy || isListening}
      >
        Read instructions aloud
      </button>

      {stage === "choose" ? (
        <>
          <p>Verify your account using the email address linked to your student number.</p>
          <p><strong>Email address:</strong> {email || "Not available"}</p>
          <button
            type="button"
            style={buttonStyle}
            disabled={busy || isListening}
            onClick={onSendEmail}
          >
            {busy ? "Sending..." : "Send code to my email"}
          </button>
        </>
      ) : (
        <>
          <p>
            Enter the six-digit code sent to {email || "your student email address"}.
            The code expires after 10 minutes.
          </p>

          <label htmlFor="verification-code">
            Six-digit verification code
          </label>

          <input
            id="verification-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            pattern="[0-9]{6}"
            value={code}
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
            style={inputStyle}
            disabled={busy || isListening}
          />

          <button
            type="button"
            style={buttonStyle}
            disabled={busy || isListening}
            onClick={startVoiceInput}
          >
            {isListening ? "Listening..." : "Speak verification code"}
          </button>

          <p>Say the six digits one at a time.</p>

          <button
            type="button"
            style={buttonStyle}
            disabled={busy || isListening || code.length !== 6}
            onClick={onVerify}
          >
            {busy ? "Verifying..." : "Verify code"}
          </button>

          <button
            type="button"
            style={buttonStyle}
            disabled={busy || isListening}
            onClick={onResend}
          >
            Send another code
          </button>

          <button
            type="button"
            style={buttonStyle}
            disabled={busy || isListening}
            onClick={onBack}
          >
            Back to email verification
          </button>
        </>
      )}

      {voiceError && (
        <p role="status" aria-live="polite" style={{ color: "#b00020", marginTop: 12 }}>
          {voiceError}
        </p>
      )}

      {error && (
        <p role="alert" style={{ color: "#b00020", marginTop: 12 }}>
          {error}
        </p>
      )}

      <p style={{ fontSize: 13, marginTop: 18 }}>
        Keep your verification code private. UniAble staff will never ask you to share it.
      </p>
    </section>
  );
}
