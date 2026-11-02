import { useState } from "react";
import { signIn } from "../../services/firebase.js";
import "./EmailLoginForm.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function EmailLoginForm({ onSuccess, onUseVoiceInstead }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate() {
    const errors = {};
    if (!email.trim()) errors.email = "Enter your student email address.";
    else if (!EMAIL_PATTERN.test(email)) errors.email = "Enter a valid email address.";
    if (!password) errors.password = "Enter your password.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setFormError(null);
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const signedInUser = await signIn(email.trim(), password);
      onSuccess(signedInUser);
    } catch (err) {
      const messages = {
        "auth/invalid-credential": "That email and password don't match our records.",
        "auth/wrong-password": "That email and password don't match our records.",
        "auth/user-disabled": "This account has been suspended. Contact your administrator.",
        "auth/too-many-requests": "Too many attempts. Wait a few minutes and try again.",
        "auth/no-role": "This account has no role assigned yet. Contact your administrator.",
      };
      setFormError(messages[err.code] ?? "We couldn't sign you in. Check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="email-form" onSubmit={handleSubmit} noValidate>
      <div className="email-form__field">
        <label htmlFor="login-email">Student email</label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
        />
        {fieldErrors.email && (
          <p id="login-email-error" className="email-form__error">
            {fieldErrors.email}
          </p>
        )}
      </div>

      <div className="email-form__field">
        <label htmlFor="login-password">Password</label>
        <div className="email-form__password-row">
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
          />
          <button
            type="button"
            className="email-form__toggle-visibility"
            onClick={() => setShowPassword((v) => !v)}
            aria-pressed={showPassword}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>
        {fieldErrors.password && (
          <p id="login-password-error" className="email-form__error">
            {fieldErrors.password}
          </p>
        )}
      </div>

      {formError && (
        <p className="email-form__form-error" role="alert">
          {formError}
        </p>
      )}

      <button type="submit" className="email-form__submit" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Log in"}
      </button>

      <button type="button" className="email-form__voice-link" onClick={onUseVoiceInstead}>
        Use voice login instead
      </button>
    </form>
  );
}
