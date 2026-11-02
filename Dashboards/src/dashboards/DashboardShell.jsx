import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../auth/SessionContext.jsx";
import { ROLE_LABELS } from "../auth/roles.js";
import AccessibilityQuickBar from "../components/AccessibilityQuickBar.jsx";
import "./dashboards.css";

export default function DashboardShell({ nav, active, onSelect, children }) {
  const { user, signOut } = useSession();
  const navigate = useNavigate();
  const headingRef = useRef(null);
  const firstRender = useRef(true);
  const current = nav.find((item) => item.id === active);

  // Move focus to the section heading when the section changes so screen
  // reader and keyboard users land at the top of the new content.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [active]);

  function handleSignOut() {
    signOut();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <a className="skip-link" href="#dash-main">Skip to main content</a>
      <div className="dash">
        <aside className="dash-side">
          <div className="dash-brand">
            <span className="dash-brand__name">UniAble</span>
            <span className="dash-brand__role">{ROLE_LABELS[user.role]}</span>
          </div>

          <nav aria-label="Dashboard sections">
            <ul className="dash-nav">
              {nav.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`dash-nav__btn ${active === item.id ? "is-active" : ""}`}
                    aria-current={active === item.id ? "page" : undefined}
                    onClick={() => onSelect(item.id)}
                  >
                    {item.label}
                    {item.badge ? (
                      <span className="dash-nav__badge">
                        {item.badge}
                        <span className="sr-only"> pending</span>
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="dash-side__foot">
            <AccessibilityQuickBar />
            <p className="dash-user">
              <span className="dash-user__name">{user.name}</span>
              <span className="dash-user__email">{user.email}</span>
            </p>
            <button type="button" className="dash-signout" onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </aside>

        <main id="dash-main" className="dash-main">
          <h1 ref={headingRef} tabIndex={-1} className="dash-title">
            {current?.title ?? current?.label}
          </h1>
          {children}
        </main>
      </div>
    </>
  );
}
