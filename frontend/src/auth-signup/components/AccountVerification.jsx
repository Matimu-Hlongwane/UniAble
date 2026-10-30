import React from "react";

export default function AccountVerification({
  stage, method, setMethod, phoneNumber, setPhoneNumber, code, setCode,
  busy, error, email, onSendEmail, onSendPhone, onVerify, onResend, onBack,
}) {
  const inputStyle = { width: "100%", boxSizing: "border-box", padding: "13px", border: "1px solid #777", borderRadius: 9, fontSize: 16, marginTop: 7, marginBottom: 14 };
  const buttonStyle = { padding: "12px 16px", borderRadius: 9, border: "1px solid currentColor", cursor: busy ? "wait" : "pointer", fontSize: 15, fontWeight: 600, margin: "5px 6px 5px 0" };

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
        {method === "email" && <button type="button" style={buttonStyle} disabled={busy} onClick={onSendEmail}>{busy ? "Sendingâ€¦" : "Send code to my email"}</button>}
        {method === "sms" && <>
          <label htmlFor="verification-phone">Mobile number (international format)</label>
          <input id="verification-phone" type="tel" autoComplete="tel" placeholder="+27821234567" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} style={inputStyle} />
          <button type="button" style={buttonStyle} disabled={busy} onClick={onSendPhone}>{busy ? "Sendingâ€¦" : "Send SMS code"}</button>
          <p>Enter your number with the country code, for example +27 for South Africa.</p>
        </>}
      </> : <>
        <p>Enter the six-digit code sent to {method === "email" ? email : phoneNumber}. The code expires after 10 minutes.</p>
        <label htmlFor="verification-code">Six-digit verification code</label>
        <input id="verification-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} pattern="[0-9]{6}" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} style={inputStyle} />
        <button type="button" style={buttonStyle} disabled={busy || code.length !== 6} onClick={onVerify}>{busy ? "Verifyingâ€¦" : "Verify code"}</button>
        <button type="button" style={buttonStyle} disabled={busy} onClick={onResend}>Send another code</button>
        <button type="button" style={buttonStyle} disabled={busy} onClick={onBack}>Choose another method</button>
      </>}
      {error && <p role="alert" style={{ color: "#b00020", marginTop: 12 }}>{error}</p>}
      <p style={{ fontSize: 13, marginTop: 18 }}>Keep your verification code private. UniAble staff will never ask you to share it.</p>
    </section>
  );
}
