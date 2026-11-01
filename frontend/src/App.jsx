import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LandingEntry from "./pages/LandingEntry";
import StaffLanding from "./pages/StaffLanding";
import Login from "./pages/Login";
import VoiceLogin from "./pages/VoiceLogin";
import SignUp from "./auth-signup/pages/SignUp";
import StudentDashboard from "./pages/StudentDashboard";
import Emergency from "./pages/Emergency";
import AccessibilitySettings from "./pages/AccessibilitySettings";
import RoleDashboard from "./pages/RoleDashboard";
import { StudentDashboardGuard, RoleDashboardGuard } from "./components/RoleGuard";
import NotFound from "./pages/NotFound";
import SettingsPage from "./pages/Settings";
import CampusNavigation from "./pages/CampusNavigation";
import Schedule from "./pages/Schedule";
import PeerAssistance from "./pages/PeerAssistance";
import UniPal from "./pages/UniPal";
import ScanRead from "./pages/ScanRead";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingEntry />} />
      <Route path="/staff" element={<StaffLanding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/voice-login" element={<VoiceLogin />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Student routes use the student layout and navigation. */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<StudentDashboardGuard><StudentDashboard /></StudentDashboardGuard>} />
        <Route path="/campus" element={<CampusNavigation />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/scan-read" element={<ScanRead />} />
        <Route path="/peer-assistance" element={<PeerAssistance />} />
        <Route path="/unipal" element={<UniPal />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/accessibility" element={<AccessibilitySettings />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Staff routes render without the student navigation. */}
      <Route path="/role/:role" element={<RoleDashboardGuard><RoleDashboard /></RoleDashboardGuard>} />
      <Route path="/staff/:role" element={<RoleDashboardGuard><RoleDashboard /></RoleDashboardGuard>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
