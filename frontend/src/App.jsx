import React from "react";
import PushNotificationManager from "./components/PushNotificationManager";
import PublicVoiceGuide from "./components/PublicVoiceGuide";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import LandingEntry from "./pages/LandingEntry";
import StaffLanding from "./pages/StaffLanding";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import VoiceLogin from "./pages/VoiceLogin";
import SignUp from "./auth-signup/pages/SignUp";
import StudentDashboard from "./pages/StudentDashboard";
import Emergency from "./pages/Emergency";
import AccessibilityHub from "./pages/AccessibilityHub";
import AccessibilityApplication from "./pages/AccessibilityApplication";
import RoleDashboard from "./pages/RoleDashboard";
import { StudentDashboardGuard, RoleDashboardGuard } from "./components/RoleGuard";
import NotFound from "./pages/NotFound";
import SettingsPage from "./pages/Settings";
import CampusNavigation from "./pages/CampusNavigation";
import Schedule from "./pages/Schedule";
import LearningMaterials from "./pages/LearningMaterials";
import PeerAssistance from "./pages/PeerAssistance";
import UniPal from "./pages/UniPal";
import ScanRead from "./pages/ScanRead";

export default function App() {
  return (
    <>
      <PushNotificationManager />
      <PublicVoiceGuide />
      <Routes>
      <Route path="/" element={<LandingEntry />} />
      <Route path="/staff" element={<StaffLanding />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/voice-login" element={<VoiceLogin />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Student routes use the student layout and navigation. */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<StudentDashboardGuard><StudentDashboard /></StudentDashboardGuard>} />
        <Route path="/campus" element={<CampusNavigation />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/learning-materials" element={<LearningMaterials />} />
        <Route path="/scan-read" element={<ScanRead />} />
        <Route path="/peer-assistance" element={<PeerAssistance />} />
        <Route path="/unipal" element={<UniPal />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/accessibility" element={<AccessibilityHub />} />
        <Route path="/accessibility-application" element={<StudentDashboardGuard><AccessibilityApplication /></StudentDashboardGuard>} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Staff routes render without the student navigation. */}
      <Route path="/role/:role" element={<RoleDashboardGuard><RoleDashboard /></RoleDashboardGuard>} />
      <Route path="/staff/:role" element={<RoleDashboardGuard><RoleDashboard /></RoleDashboardGuard>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
    </>
  );
}


