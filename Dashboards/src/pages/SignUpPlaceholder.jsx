import { Link } from "react-router-dom";
import AuthShell from "../components/AuthShell.jsx";

export default function SignUpPlaceholder() {
  return (
    <AuthShell>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>
          Sign-up is next
        </h1>
        <p style={{ color: "var(--uni-muted)", fontSize: "var(--text-sm)" }}>
          The voice-guided sign-up flow (Step 1 of 5) builds on this login module. Let&rsquo;s
          wire it up once the login screen is signed off.
        </p>
        <Link to="/login" style={{ color: "var(--uni-violet-600)", fontWeight: 600 }}>
          ← Back to login
        </Link>
      </div>
    </AuthShell>
  );
}
