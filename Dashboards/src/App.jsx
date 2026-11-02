import { Navigate, Route, Routes } from "react-router-dom";
import WelcomeScreen from "./pages/WelcomeScreen.jsx";
import LoginScreen from "./pages/LoginScreen.jsx";
import SignUpPlaceholder from "./pages/SignUpPlaceholder.jsx";
import VoiceActivation from "./pages/VoiceActivation.jsx";
import EmergencySOS from "./pages/EmergencySOS.jsx";
import RequireRole, { DashboardRedirect } from "./auth/RequireRole.jsx";
import { ROLES } from "./auth/roles.js";
import StudentDashboard from "./dashboards/StudentDashboard.jsx";
import LecturerDashboard from "./dashboards/LecturerDashboard.jsx";
import DisabilityOfficeDashboard from "./dashboards/DisabilityOfficeDashboard.jsx";
import SecurityDashboard from "./dashboards/SecurityDashboard.jsx";
import AdminDashboard from "./dashboards/admin/AdminDashboard.jsx";

function guard(role, element) {
  return <RequireRole allow={[role]}>{element}</RequireRole>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<WelcomeScreen />} />
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/sign-up" element={<SignUpPlaceholder />} />
      <Route path="/voice-activation" element={<VoiceActivation />} />
      {/* Left public on purpose: emergency help must never be blocked by a login. */}
      <Route path="/emergency" element={<EmergencySOS />} />

      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/student" element={guard(ROLES.STUDENT, <StudentDashboard />)} />
      <Route path="/lecturer" element={guard(ROLES.LECTURER, <LecturerDashboard />)} />
      <Route path="/disability-office" element={guard(ROLES.DISABILITY_OFFICE, <DisabilityOfficeDashboard />)} />
      <Route path="/security" element={guard(ROLES.SECURITY, <SecurityDashboard />)} />
      <Route path="/admin" element={guard(ROLES.ADMIN, <AdminDashboard />)} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
