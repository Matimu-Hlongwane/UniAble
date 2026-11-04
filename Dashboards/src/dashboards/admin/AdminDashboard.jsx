import { useState, useMemo } from "react";
import DashboardShell from "../DashboardShell.jsx";
import { Notice, Panel, Badge } from "../ui.jsx";
import { useAdminState } from "../../services/adminStore.js";
import { useDirectory } from "../../services/directory.js";
import { useRegistrations } from "../../services/registrations.js";
import UsersPanel from "./UsersPanel.jsx";
import ApprovalsPanel from "./ApprovalsPanel.jsx";
import ConfigPanel from "./ConfigPanel.jsx";
import ReportsPanel from "./ReportsPanel.jsx";
import AuditPanel from "./AuditPanel.jsx";

function MiniStat({ label, value, sub, color }) {
  return (
    <div className="panel" style={{ padding: '16px', borderLeft: `4px solid ${color}` }}>
      <div className="muted" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: '800', marginTop: '4px' }}>{value}</div>
      {sub && <div className="muted" style={{ fontSize: '12px', marginTop: '2px' }}>{sub}</div>}
    </div>
  );
}

function AdminOverview({ onNavigate }) {
  const { approvals } = useAdminState();
  const { users } = useDirectory();
  const registrations = useRegistrations();

  const stats = useMemo(() => {
    const pendingApprovals = approvals.filter(a => a.status === 'pending').length;
    const activeUsers = users.filter(u => u.status === 'active').length;
    const volunteers = users.filter(u => u.role?.toLowerCase() === 'volunteer').length;
    const totalRegs = registrations.length;
    const approvedRegs = registrations.filter(r => r.status === 'approved').length;
    const pendingRegs = registrations.filter(r => r.status === 'pending').length;
    return { pendingApprovals, activeUsers, volunteers, totalRegs, approvedRegs, pendingRegs, totalUsers: users.length };
  }, [approvals, users, registrations]);

  // Mock top volunteer for overview
  const topVolunteer = { name: "Thando M.", sessions: 47 };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <MiniStat label="Total Users" value={stats.totalUsers} sub={`${stats.activeUsers} active`} color="#6366f1" />
        <MiniStat label="Pending Approvals" value={stats.pendingApprovals} sub="Needs admin review" color="#f59e0b" />
        <MiniStat label="Volunteers" value={stats.volunteers} sub={`Top: ${topVolunteer.name}`} color="#22c55e" />
        <MiniStat label="Registrations" value={stats.totalRegs} sub={`${stats.approvedRegs} approved, ${stats.pendingRegs} pending`} color="#3b82f6" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <Panel title="Quick Actions" id="quick-actions">
          <div style={{ display: 'grid', gap: '8px' }}>
            <button className="btn btn--primary" onClick={() => onNavigate('approvals')} style={{ justifyContent: 'flex-start', padding: '12px' }}>
              🔔 Review {stats.pendingApprovals} pending approvals {stats.pendingApprovals > 0 && <Badge tone="warning">{stats.pendingApprovals}</Badge>}
            </button>
            <button className="btn" onClick={() => onNavigate('users')} style={{ justifyContent: 'flex-start', padding: '12px' }}>
              👥 Manage {stats.totalUsers} accounts · {stats.volunteers} volunteers
            </button>
            <button className="btn" onClick={() => onNavigate('reports')} style={{ justifyContent: 'flex-start', padding: '12px' }}>
              📊 Download reports · View graphs · Volunteer leaderboard
            </button>
            <button className="btn" onClick={() => onNavigate('audit')} style={{ justifyContent: 'flex-start', padding: '12px' }}>
              📝 Audit trail — all admin actions logged
            </button>
          </div>
        </Panel>

        <Panel title="System Health" id="system-health" subtitle="Sample data">
          <div style={{ display: 'grid', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Approval Rate</span><strong>{stats.totalRegs ? Math.round((stats.approvedRegs/stats.totalRegs)*100) : 0}%</strong></div>
            <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px' }}><div style={{ width: `${stats.totalRegs ? (stats.approvedRegs/stats.totalRegs)*100 : 0}%`, height: '100%', background: '#22c55e', borderRadius: '4px' }} /></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }} className="muted"><span>Active users: {stats.activeUsers}/{stats.totalUsers}</span><span>Volunteer: {topVolunteer.name} 🏆 {topVolunteer.sessions} sessions</span></div>
            <Notice tone="success">All reports downloadable as CSV + PDF. Graphs show category, status, and volunteer impact. Top helper highlighted in Reports → Volunteer Leaderboard.</Notice>
          </div>
        </Panel>
      </div>
    </>
  );
}

export default function AdminDashboard() {
  const [active, setActive] = useState("overview");
  const { approvals } = useAdminState();
  const pending = approvals.filter((a) => a.status === "pending").length;

  const nav = [
    { id: "overview", label: "Overview", title: "Admin Overview" },
    { id: "users", label: "Accounts and roles", title: "Accounts and roles" },
    { id: "approvals", label: "Approvals", title: "Pending approvals", badge: pending || undefined },
    { id: "config", label: "Service configuration", title: "Service configuration" },
    { id: "reports", label: "Reports", title: "Controlled reports" },
    { id: "audit", label: "Audit trail", title: "Audit trail" },
  ];

  return (
    <DashboardShell nav={nav} active={active} onSelect={setActive}>
      <Notice>
        Administrators manage accounts, settings and oversight. This console cannot open student
        registrations, disability documents, incident locations or assistance requests. Every action is audit-logged.
      </Notice>

      {active === "overview" && <AdminOverview onNavigate={setActive} />}
      {active === "users" && <UsersPanel />}
      {active === "approvals" && <ApprovalsPanel />}
      {active === "config" && <ConfigPanel />}
      {active === "reports" && <ReportsPanel />}
      {active === "audit" && <AuditPanel />}
    </DashboardShell>
  );
}
