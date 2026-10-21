import React from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./pages/Landing";
import StudentDashboard from "./pages/StudentDashboard";
import Emergency from "./pages/Emergency";
import AccessibilitySettings from "./pages/AccessibilitySettings";
import RoleDashboard from "./pages/RoleDashboard";
import NotFound from "./pages/NotFound";
import SettingsPage from "./pages/Settings";
import CampusNavigation from "./pages/CampusNavigation";
import Schedule from "./pages/Schedule";
import PeerAssistance from "./pages/PeerAssistance";
import UniPal from "./pages/UniPal";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<StudentDashboard />} />
        <Route path="/campus" element={<CampusNavigation />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/peer-assistance" element={<PeerAssistance />} />
        <Route path="/unipal" element={<UniPal />} />
        <Route path="/emergency" element={<Emergency />} />
        <Route path="/accessibility" element={<AccessibilitySettings />} />
        <Route path="/role/:role" element={<RoleDashboard />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
