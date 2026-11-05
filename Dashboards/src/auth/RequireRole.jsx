import { useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useSession } from "./SessionContext.jsx";
import { ROLE_HOME, ROLE_LABELS } from "./roles.js";
import { recordAudit } from "../services/auditLog.js";
import AuthShell from "../components/AuthShell.jsx";

export function DashboardRedirect() {
  const { user } = useSession();
  return <Navigate to={user ? ROLE_HOME[user.role] : "/login"} replace />;
}

export default function RequireRole({ allow, children }) {
  const { user } = useSession();
  const location = useLocation();
  const denied = Boolean(user) && !allow.includes(user.role);
  const uid = user?.uid;

  useEffect(() => {
    if (denied) {
      recordAudit({ actor: user, action: "access.denied", target: location.pathname, outcome: "denied" });
    }
    // user identity is tracked by uid to avoid re-logging on every render
  }, [denied, uid, location.pathname]);

  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;

  if (denied) {
    return (
      <AuthShell>
        <div style={{ display: "grid", gap: 12, textAlign: "center" }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)" }}>
            You don&rsquo;t have access to this page
          </h1>
          <p style={{ color: "var(--uni-muted)", fontSize: "var(--text-sm)" }}>
            Your {ROLE_LABELS[user.role]} account can&rsquo;t open this area. The attempt has been recorded.
          </p>
          <Link to={ROLE_HOME[user.role]} style={{ color: "var(--uni-violet-600)", fontWeight: 600 }}>
            Go to your dashboard
          </Link>
        </div>
      </AuthShell>
    );
  }

  return children;
}
