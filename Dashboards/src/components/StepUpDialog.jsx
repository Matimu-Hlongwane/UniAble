import { useEffect, useRef, useState } from "react";
import { useSession } from "../auth/SessionContext.jsx";
import { verifyPassword } from "../services/firebase.js";
import "./StepUpDialog.css";

/**
 * Confirmation for sensitive actions: a written reason (recorded in the
 * audit trail) plus a fresh password check. Uses the native <dialog>
 * element, which traps focus and closes on Escape.
 */
export default function StepUpDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  requireReason = true,
  children,
  onConfirm,
  onCancel,
}) {
  const ref = useRef(null);
  const { user } = useSession();
  const [reason, setReason] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (open) {
      setReason("");
      setPassword("");
      setError(null);
      setBusy(false);
    }
  }, [open]);

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    if (requireReason && reason.trim().length < 10) {
      setError("Enter a reason of at least 10 characters. It is recorded in the audit trail.");
      return;
    }
    setBusy(true);
    try {
      const passwordOk = await verifyPassword(user.email, password);
      if (!passwordOk) {
        setError("That password is incorrect.");
        return;
      }
      const result = await onConfirm(reason.trim());
      if (result && result.ok === false) setError(result.error);
    } catch {
      setError("We couldn’t complete that. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="stepup"
      aria-labelledby="stepup-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <form onSubmit={handleSubmit} className="stepup__form" noValidate>
        <h2 id="stepup-title" className="stepup__title">{title}</h2>
        {description && <p className="stepup__desc">{description}</p>}

        {children}

        {requireReason && (
          <div className="stepup__field">
            <label htmlFor="stepup-reason">Reason (recorded in the audit trail)</label>
            <textarea
              id="stepup-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        )}

        <div className="stepup__field">
          <label htmlFor="stepup-password">Confirm your password</label>
          <input
            id="stepup-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="stepup__error" role="alert">{error}</p>
        )}

        <div className="stepup__actions">
          <button type="button" className="stepup__cancel" onClick={onCancel}>Cancel</button>
          <button type="submit" className="stepup__confirm" disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </form>
    </dialog>
  );
}
