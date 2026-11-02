import "./ListeningRing.css";

/**
 * The app's signature element: concentric rings around the mic glyph
 * that visibly respond to voice state, so what's happening is legible
 * at a glance without reading text.
 *
 * state: "idle" | "listening" | "verifying" | "success" | "error" | "emergency"
 */
export default function ListeningRing({ state = "idle" }) {
  return (
    <div className={`ring ring--${state}`} aria-hidden="true">
      <span className="ring__wave ring__wave--outer" />
      <span className="ring__wave ring__wave--mid" />
      <span className="ring__core">
        <MicGlyph state={state} />
      </span>
    </div>
  );
}

function MicGlyph({ state }) {
  if (state === "success") {
    return (
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
        <path
          d="M5 13l4.5 4.5L19 7.5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (state === "error") {
    return (
      <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </svg>
    );
  }
  if (state === "emergency") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3l9 16H3L12 3z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path d="M12 10v4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <circle cx="12" cy="17" r="0.9" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <rect x="9" y="2" width="6" height="12" rx="3" fill="currentColor" />
      <path
        d="M5 11a7 7 0 0 0 14 0M12 18v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
