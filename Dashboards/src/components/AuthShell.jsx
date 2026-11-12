import AccessibilityQuickBar from "./AccessibilityQuickBar.jsx";
import "./AuthShell.css";

export default function AuthShell({ children, footer }) {
  return (
    <div className="auth-shell">
      <div className="auth-shell__stage">
        <header className="auth-shell__top">
          <div className="auth-shell__brand">
            <span className="auth-shell__mark" aria-hidden="true">
              <AccessMarkIcon />
            </span>
            <span className="auth-shell__brand-name">UniAble</span>
          </div>
          <AccessibilityQuickBar />
        </header>

        <main className="auth-shell__card" role="main">
          {children}
        </main>

        {footer && <p className="auth-shell__footer">{footer}</p>}
      </div>
    </div>
  );
}

function AccessMarkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="5" r="2.1" fill="currentColor" />
      <path
        d="M4.5 9.5h15M12 9.5v4.2M8 20.5l4-6.8 4 6.8M8.6 14.3h6.8"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
