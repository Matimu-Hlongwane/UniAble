import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";

function getStaffDashboardPath(role) {
  const destinations = {
    admin: "/staff/admin",
    lecturer: "/staff/lecturer",
    volunteer: "/staff/volunteer",
    disability_office: "/staff/disability",
    security: "/staff/security"
  };

  return destinations[role] || "/staff";
}
function useAuthenticatedRole() {
  const [result, setResult] = useState({
    loading: true,
    user: null,
    role: null
  });

  useEffect(() => {
    let active = true;
    let unsubscribe;

    async function subscribeWhenReady() {
      try {
        const { subscribeToAuth, getCurrentUserRole } = await import("../services/firebaseAuth");
        if (!active) return;

        unsubscribe = subscribeToAuth(async (user) => {
          if (!user) {
            if (active) {
              setResult({ loading: false, user: null, role: null });
            }
            return;
          }

          try {
            const role = await getCurrentUserRole(user);

            if (active) {
              setResult({ loading: false, user, role });
            }
          } catch (error) {
            console.error("Could not determine account role:", error);

            if (active) {
              setResult({ loading: false, user, role: "student" });
            }
          }
        });
      } catch (error) {
        console.error("Could not load account sign-in service:", error);
        if (active) {
          setResult({ loading: false, user: null, role: null, error: true });
        }
      }
    }

    void subscribeWhenReady();

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return result;
}

export function StudentDashboardGuard({ children }) {
  const { loading, user, role, error } = useAuthenticatedRole();

  if (loading) return <p className="page">Checking your account...</p>;
  if (error) return <p className="page" role="alert">Could not load account sign-in. Please refresh and try again.</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (role !== "student") {
    const destination = getStaffDashboardPath(role);

    return <Navigate to={destination} replace />;
  }

  return children;
}

export function RoleDashboardGuard({ children }) {
  const { role: requestedRole = "" } = useParams();
  const { loading, user, role, error } = useAuthenticatedRole();

  const routeAliases = {
    disability: "disability_office",
    disability_office: "disability_office"
  };

  const requested = routeAliases[requestedRole.toLowerCase()]
    || requestedRole.toLowerCase();

  if (loading) return <p className="page">Checking your account...</p>;
  if (error) return <p className="page" role="alert">Could not load account sign-in. Please refresh and try again.</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (requested !== role || role === "student") {
    const destination = role === "student"
      ? "/dashboard"
      : getStaffDashboardPath(role);

    return <Navigate to={destination} replace />;
  }

  return children;
}
