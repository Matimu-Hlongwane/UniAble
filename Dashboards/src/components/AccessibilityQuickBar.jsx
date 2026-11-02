import { useAccessibilityProfile } from "../hooks/useAccessibilityProfile.jsx";
import "./AccessibilityQuickBar.css";

export default function AccessibilityQuickBar() {
  const { profile, toggleHighContrast, setTextScale } = useAccessibilityProfile();

  return (
    <div className="a11y-bar" role="group" aria-label="Display preferences">
      <button
        type="button"
        className={`a11y-bar__toggle ${profile.highContrast ? "is-active" : ""}`}
        aria-pressed={profile.highContrast}
        onClick={toggleHighContrast}
      >
        High contrast
      </button>

      <div className="a11y-bar__scale" role="group" aria-label="Text size">
        <button
          type="button"
          className="a11y-bar__step"
          onClick={() => setTextScale(profile.textScale - 0.1)}
          aria-label="Decrease text size"
        >
          A<span aria-hidden="true">−</span>
        </button>
        <span className="a11y-bar__step-label" aria-hidden="true">
          {Math.round(profile.textScale * 100)}%
        </span>
        <button
          type="button"
          className="a11y-bar__step"
          onClick={() => setTextScale(profile.textScale + 0.1)}
          aria-label="Increase text size"
        >
          A<span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
}
