import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import {
  subscribeToAuth,
  getCurrentUserRole
} from "../services/firebaseAuth";

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

    const unsubscribe = subscribeToAuth(async (user) => {
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

    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  return result;
}

export function StudentDashboardGuard({ children }) {
  const { loading, user, role } = useAuthenticatedRole();

  if (loading) return <p className="page">Checking your account...</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (role !== "student") {
    const destination = getStaffDashboardPath(role);

    return <Navigate to={destination} replace />;
  }

  return children;
}

export function RoleDashboardGuard({ children }) {
  const { role: requestedRole = "" } = useParams();
  const { loading, user, role } = useAuthenticatedRole();

  const routeAliases = {
    disability: "disability_office",
    disability_office: "disability_office"
  };

  const requested = routeAliases[requestedRole.toLowerCase()]
    || requestedRole.toLowerCase();

  if (loading) return <p className="page">Checking your account...</p>;
  if (!user) return <Navigate to="/login" replace />;

  if (requested !== role || role === "student") {
    const destination = role === "student"
      ? "/dashboard"
      : getStaffDashboardPath(role);

    return <Navigate to={destination} replace />;
  }

  return children;
}
