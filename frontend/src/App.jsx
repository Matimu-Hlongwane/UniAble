import React, { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { StudentDashboardGuard, RoleDashboardGuard } from "./components/RoleGuard";

const Layout = lazy(() => import("./components/Layout"));
const LandingEntry = lazy(() => import("./pages/LandingEntry"));
const StaffLanding = lazy(() => import("./pages/StaffLanding"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const VoiceLogin = lazy(() => import("./pages/VoiceLogin"));
const SignUp = lazy(() => import("./auth-signup/pages/SignUp"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const Emergency = lazy(() => import("./pages/Emergency"));
const AccessibilitySettings = lazy(() => import("./pages/AccessibilitySettings"));
const RoleDashboard = lazy(() => import("./pages/RoleDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));
const SettingsPage = lazy(() => import("./pages/Settings"));
const CampusNavigation = lazy(() => import("./pages/CampusNavigation"));
const Schedule = lazy(() => import("./pages/Schedule"));
const PeerAssistance = lazy(() => import("./pages/PeerAssistance"));
const UniPal = lazy(() => import("./pages/UniPal"));
const ScanRead = lazy(() => import("./pages/ScanRead"));

export default function App() {
  return (
    <Suspense fallback={<main className="page" role="status" aria-live="polite">Loading UniAble…</main>}>
      <Routes>
        <Route path="/" element={<LandingEntry />} />
        <Route path="/staff" element={<StaffLanding />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/voice-login" element={<VoiceLogin />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Student routes use the student layout and navigation. */}
        <Route element={<StudentDashboardGuard><Layout /></StudentDashboardGuard>}>
          <Route path="/dashboard" element={<StudentDashboard />} />
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
    </Suspense>
  );
}
