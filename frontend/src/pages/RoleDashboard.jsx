import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  ClipboardList,
  FileCheck2,
  HeartHandshake,
  LifeBuoy,
  LockKeyhole,
  MapPinned,
  ShieldCheck,
  Users,
  UserRoundCheck,
  Wrench,
} from "lucide-react";
import "./Dashboards.css";

const roleWorkspaces = {
  admin: {
    title: "Administration",
    shortTitle: "Administrator",
    eyebrow: "UNIABLE OPERATIONS",
    description: "A central workspace for platform oversight, account administration and service coordination.",
    welcome: "Platform administration",
    notice: "The administrator interface is a frontend design foundation. Account controls, approval workflows and reporting data still need to be connected to secured backend services.",
    modules: [
      { title: "User and role management", description: "Manage account access and staff permissions.", icon: Users, status: "Integration pending" },
      { title: "Approvals and verification", description: "Review registration and account-verification workflows.", icon: FileCheck2, status: "Integration pending" },
      { title: "Service activity", description: "Review platform activity and service availability.", icon: Activity, status: "Integration pending" },
      { title: "System configuration", description: "Manage institution-wide platform settings.", icon: Wrench, status: "Integration pending" },
    ],
  },
  lecturer: {
    title: "Lecturer",
    shortTitle: "Lecturer",
    eyebrow: "TEACHING SUPPORT",
    description: "A focused workspace for accessible teaching, class communication and student support coordination.",
    welcome: "Teaching and student support",
    notice: "Class lists, learning materials and lecturer-to-student support workflows are not yet connected to the current frontend API.",
    modules: [
      { title: "Class information", description: "View teaching groups, class details and student lists.", icon: Users, status: "Integration pending" },
      { title: "Accessible learning materials", description: "Coordinate accessible formats and learning resources.", icon: FileCheck2, status: "Integration pending" },
      { title: "Student support referrals", description: "Coordinate referrals with the relevant support office.", icon: HeartHandshake, status: "Integration pending" },
      { title: "Class communications", description: "Prepare accessible class notices and updates.", icon: ClipboardList, status: "Integration pending" },
    ],
  },
  disability: {
    title: "Disability Office",
    shortTitle: "Disability Office",
    eyebrow: "STUDENT ACCESS SERVICES",
    description: "A workspace for accessibility coordination, accommodation reviews and student support services.",
    welcome: "Accessibility services",
    notice: "Student accommodation records, case management and approval permissions still need secure backend integration.",
    modules: [
      { title: "Accommodation requests", description: "Review and coordinate student accommodation needs.", icon: ClipboardList, status: "Integration pending" },
      { title: "Accessibility profiles", description: "Review verified student support requirements.", icon: UserRoundCheck, status: "Integration pending" },
      { title: "Support coordination", description: "Coordinate services with lecturers and campus teams.", icon: HeartHandshake, status: "Integration pending" },
      { title: "Service records", description: "Maintain support history and institutional records.", icon: FileCheck2, status: "Integration pending" },
    ],
  },
  security: {
    title: "Campus Security",
    shortTitle: "Campus Security",
    eyebrow: "CAMPUS SAFETY",
    description: "A dedicated operational workspace for emergency response, incident coordination and campus safety.",
    welcome: "Safety operations",
    notice: "Live SOS dispatch, incident assignment and response tracking require authenticated security permissions and backend workflows. They are not available in this preview.",
    modules: [
      { title: "Emergency response queue", description: "Receive and prioritise verified SOS alerts.", icon: LifeBuoy, status: "Integration pending" },
      { title: "Incident coordination", description: "Assign responders and monitor incident progress.", icon: ClipboardList, status: "Integration pending" },
      { title: "Campus location support", description: "Coordinate response teams across campus locations.", icon: MapPinned, status: "Integration pending" },
      { title: "Response records", description: "Review completed responses and incident records.", icon: FileCheck2, status: "Integration pending" },
    ],
  },
  volunteer: {
    title: "Volunteer",
    shortTitle: "Volunteer",
    eyebrow: "PEER SUPPORT SERVICES",
    description: "A workspace for peer-support availability and assistance activity.",
    welcome: "Volunteer workspace",
    notice: "Volunteer availability and peer-assistance functions are currently accessed through the shared Peer Assistance page. A separate assigned-request queue and volunteer-only permissions still need backend integration.",
    modules: [
      { title: "Availability and peer assistance", description: "Open the existing page to review volunteer availability and peer-support activity.", icon: HeartHandshake, status: "Available page", path: "/peer-assistance" },
      { title: "Assigned assistance requests", description: "View requests assigned specifically to your volunteer account.", icon: ClipboardList, status: "Integration pending" },
      { title: "Volunteer activity", description: "Review completed support tasks and activity history.", icon: Activity, status: "Integration pending" },
      { title: "Volunteer guidance", description: "Review support procedures and escalation guidance.", icon: ShieldCheck, status: "Integration pending" },
    ],
  },
};

export default function RoleDashboard() {
  const { role = "" } = useParams();
  const navigate = useNavigate();
  const workspace = roleWorkspaces[String(role).toLowerCase()];

  if (!workspace) {
    return (
      <section className="page dashboard-page role-dashboard">
        <div className="dashboard-role-not-found">
          <p className="dashboard-eyebrow">ROLE WORKSPACE</p>
          <h1>Workspace not found</h1>
          <p>The requested role does not have a dashboard configuration.</p>
          <button type="button" className="dashboard-primary-button" onClick={() => navigate("/dashboard")}>
            Return to student dashboard <ArrowRight size={17} />
          </button>
        </div>
      </section>
    );
  }

  const availableModules = workspace.modules.filter((module) => module.path).length;

  return (
    <section className="page dashboard-page role-dashboard">
      <div className="dashboard-page-heading">
        <div>
          <p className="dashboard-eyebrow">{workspace.eyebrow}</p>
          <h1>{workspace.title} dashboard</h1>
          <p className="dashboard-date">{workspace.description}</p>
        </div>
        <span className="dashboard-role-badge">
          <LockKeyhole size={15} />
          {workspace.shortTitle} workspace
        </span>
      </div>

      <section className="dashboard-role-welcome">
        <div>
          <p className="dashboard-eyebrow">ROLE WORKSPACE</p>
          <h2>{workspace.welcome}</h2>
          <p>{workspace.description}</p>
        </div>
        <div className="dashboard-role-welcome-icon" aria-hidden="true">
          <ShieldCheck size={32} strokeWidth={1.6} />
        </div>
      </section>

      <div className="dashboard-role-summary">
        <div>
          <span className="dashboard-role-summary-label">Workspace modules</span>
          <strong>{workspace.modules.length}</strong>
          <small>Defined for this role</small>
        </div>
        <div>
          <span className="dashboard-role-summary-label">Connected pages</span>
          <strong>{availableModules}</strong>
          <small>Available in the current frontend</small>
        </div>
        <div>
          <span className="dashboard-role-summary-label">Data integration</span>
          <strong>In progress</strong>
          <small>Live role data is not connected yet</small>
        </div>
      </div>

      <div className="dashboard-section-heading dashboard-role-section-heading">
        <div>
          <p className="dashboard-eyebrow">WORKSPACE</p>
          <h2>Role-specific modules</h2>
        </div>
      </div>

      <div className="dashboard-role-module-grid">
        {workspace.modules.map((module) => {
          const ModuleIcon = module.icon;
          const isAvailable = Boolean(module.path);
          return (
            <article className="dashboard-role-module" key={module.title}>
              <div className="dashboard-role-module-top">
                <span className="dashboard-tool-icon"><ModuleIcon size={21} /></span>
                <span className={isAvailable ? "dashboard-module-status available" : "dashboard-module-status pending"}>
                  {module.status}
                </span>
              </div>
              <h3>{module.title}</h3>
              <p>{module.description}</p>
              {isAvailable ? (
                <button type="button" className="dashboard-text-button" onClick={() => navigate(module.path)}>
                  Open page <ArrowRight size={16} />
                </button>
              ) : (
                <span className="dashboard-module-footnote">Requires backend integration</span>
              )}
            </article>
          );
        })}
      </div>

      <div className="dashboard-integration-notice" role="note">
        <div className="dashboard-announcement-icon"><LockKeyhole size={19} /></div>
        <div>
          <p className="dashboard-eyebrow">IMPLEMENTATION STATUS</p>
          <h2>Frontend workspace preview</h2>
          <p>{workspace.notice}</p>
        </div>
      </div>
    </section>
  );
}

