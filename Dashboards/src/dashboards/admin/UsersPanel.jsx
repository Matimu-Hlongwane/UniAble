import { useState, useMemo } from "react";
import { Badge, Notice, Panel, StatGrid } from "../ui.jsx";
import StepUpDialog from "../../components/StepUpDialog.jsx";
import { useSession } from "../../auth/SessionContext.jsx";
import { PRIVILEGED_ROLES, ROLE_LABELS, ROLES, can } from "../../auth/roles.js";
import { useDirectory } from "../../services/directory.js";
import { requestRoleChange, requestStatusChange } from "../../services/adminStore.js";
import { recordAudit } from "../../services/auditLog.js";

// Mock volunteer activity - replace with real service
const VOLUNTEER_ACTIVITY = {
  "vol_1": { sessions: 47, hours: 62, helped: 23, rating: 4.9, lastActive: "2026-05-11" },
  "vol_2": { sessions: 38, hours: 51, helped: 19, rating: 4.8, lastActive: "2026-05-10" },
  "vol_3": { sessions: 31, hours: 44, helped: 18, rating: 4.7, lastActive: "2026-05-09" },
};

function getVolunteerStats(user) {
  return VOLUNTEER_ACTIVITY[user.uid] || { sessions: Math.floor(Math.random()*20), hours: Math.floor(Math.random()*30), helped: Math.floor(Math.random()*10), rating: (4.2 + Math.random()*0.7).toFixed(1), lastActive: "2026-05-08" };
}

function MiniBar({ value, max, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ width: '80px', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ width: `${(value/max)*100}%`, height: '100%', background: color }} />
      </div>
      <span style={{ fontSize: '12px', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export default function UsersPanel() {
  const { user: actor } = useSession();
  const { users } = useDirectory();
  const [dialog, setDialog] = useState(null);
  const [newRole, setNewRole] = useState(ROLES.STUDENT);
  const [flash, setFlash] = useState("");
  const [tab, setTab] = useState("all"); // all | volunteers
  const [search, setSearch] = useState("");

  const active = users.filter((u) => u.status === "active").length;
  const roleOptions = Object.values(ROLES).filter((r) => dialog && r !== dialog.target.role);
  const needsApproval = dialog?.kind === "role" && (PRIVILEGED_ROLES.includes(newRole) || PRIVILEGED_ROLES.includes(dialog.target.role));

  const volunteers = useMemo(() => users.filter(u => u.role === 'volunteer' || u.role === 'VOLUNTEER' || u.role === ROLES.VOLUNTEER), [users]);
  const volunteersWithStats = useMemo(() => {
    return volunteers.map(v => ({ ...v, stats: getVolunteerStats(v) }))
      .sort((a,b) => b.stats.sessions - a.stats.sessions);
  }, [volunteers]);

  const filteredUsers = useMemo(() => {
    let list = tab === 'volunteers' ? volunteersWithStats : users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    return list;
  }, [users, volunteersWithStats, tab, search]);

  const maxSessions = Math.max(...volunteersWithStats.map(v => v.stats.sessions), 1);

  function openRole(target) {
    setNewRole(Object.values(ROLES).find((r) => r !== target.role));
    setDialog({ kind: "role", target });
  }

  function confirm(reason) {
    const { kind, target } = dialog;
    const result = kind === "role" ? requestRoleChange(actor, target, newRole, reason) : requestStatusChange(actor, target, target.status === "active" ? "suspended" : "active", reason);
    if (result.ok) {
      setDialog(null);
      setFlash(result.pending ? "Submitted. A different administrator must approve this change before it takes effect." : "Change applied and recorded in the audit trail.");
    }
    return result;
  }

  function downloadUsers() {
    if (!can(actor.role, "reports.aggregate")) return;
    recordAudit({ actor, action: "users.exported", target: `users:${tab}` });
    const header = "Name,Email,Role,Status,Sessions,Hours,Students Helped,Rating\n";
    const rows = filteredUsers.map(u => {
      const s = u.stats || getVolunteerStats(u);
      return `${u.name},${u.email},${u.role},${u.status},${s.sessions || 0},${s.hours || 0},${s.helped || 0},${s.rating || ''}`;
    }).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `uniable-${tab}-users-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <StatGrid
        items={[
          { label: "Accounts", value: users.length },
          { label: "Active", value: active },
          { label: "Suspended", value: users.length - active },
          { label: "Volunteers", value: volunteers.length },
        ]}
      />

      {/* VOLUNTEER LEADERBOARD HIGHLIGHT */}
      {volunteersWithStats.length > 0 && (
        <Panel title="🏆 Volunteer Leaderboard — Most Helpful" id="volunteer-leaderboard" subtitle="Sorted by sessions completed">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {volunteersWithStats.slice(0,3).map((v, idx) => (
              <div key={v.uid} style={{ padding: '12px', border: `2px solid ${idx===0 ? '#fbbf24' : '#e5e7eb'}`, borderRadius: '10px', background: idx===0 ? '#fffbeb' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: 700 }}>{idx===0 ? '🥇' : idx===1 ? '🥈' : '🥉'} {v.name}</span>
                  <Badge tone={idx===0 ? 'warning' : 'success'}>⭐ {v.stats.rating}</Badge>
                </div>
                <div className="muted" style={{ fontSize: '12px', marginTop: '6px' }}>
                  {v.stats.sessions} sessions · {v.stats.hours}h · {v.stats.helped} students
                </div>
                <MiniBar value={v.stats.sessions} max={maxSessions} color={idx===0 ? '#f59e0b' : '#6366f1'} />
              </div>
            ))}
          </div>

          <div className="table-wrap">
            <table className="dash-table">
              <thead><tr><th>Rank</th><th>Volunteer</th><th>Sessions (Graph)</th><th>Hours</th><th>Students Helped</th><th>Rating</th><th>Last Active</th></tr></thead>
              <tbody>
                {volunteersWithStats.map((v, idx) => (
                  <tr key={v.uid} style={{ background: idx===0 ? '#fffbeb' : '' }}>
                    <td>{idx===0 ? '🏆 1' : idx+1}</td>
                    <td><strong>{v.name}</strong><div className="muted" style={{ fontSize: '11px' }}>{v.email}</div></td>
                    <td><MiniBar value={v.stats.sessions} max={maxSessions} color="#6366f1" /></td>
                    <td>{v.stats.hours}h</td>
                    <td>{v.stats.helped}</td>
                    <td>⭐ {v.stats.rating}</td>
                    <td className="muted">{v.stats.lastActive}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <p role="status" aria-live="polite" className="muted">{flash}</p>

      <Panel 
        title={tab === 'volunteers' ? 'Volunteer Accounts' : 'Accounts'} 
        subtitle="Name, email, role and status only." 
        id="accounts"
        actions={
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-subtle)', padding: '4px', borderRadius: '8px' }}>
              <button className={`btn ${tab==='all' ? 'btn--primary' : ''}`} style={{ fontSize: '12px', padding: '6px 10px' }} onClick={() => setTab('all')}>All ({users.length})</button>
              <button className={`btn ${tab==='volunteers' ? 'btn--primary' : ''}`} style={{ fontSize: '12px', padding: '6px 10px' }} onClick={() => setTab('volunteers')}>Volunteers ({volunteers.length})</button>
            </div>
            <input type="search" placeholder="Search name or email..." value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ minWidth: '180px' }} />
            <button className="btn btn--primary" onClick={downloadUsers}>Download CSV</button>
          </div>
        }
      >
        <div className="table-wrap">
          <table className="dash-table">
            <caption className="sr-only">User accounts</caption>
            <thead>
              <tr>
                <th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Stats</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const isSelf = u.uid === actor.uid;
                const s = u.stats || getVolunteerStats(u);
                return (
                  <tr key={u.uid}>
                    <td>{u.name} {isSelf && <Badge>You</Badge>} {tab==='volunteers' && u.uid===volunteersWithStats[0]?.uid && <Badge tone="warning">Top</Badge>}</td>
                    <td className="muted" style={{ fontSize: '13px' }}>{u.email}</td>
                    <td>{ROLE_LABELS[u.role] || u.role}</td>
                    <td><Badge tone={u.status === "active" ? "success" : "danger"}>{u.status === "active" ? "Active" : "Suspended"}</Badge></td>
                    <td style={{ fontSize: '12px' }}>{u.role === ROLES.VOLUNTEER || tab==='volunteers' ? `${s.sessions} sess · ${s.hours}h` : '—'}</td>
                    <td>
                      <div className="cell-actions">
                        <button type="button" className="btn" disabled={isSelf} onClick={() => openRole(u)}>Change role</button>
                        <button type="button" className={`btn ${u.status === "active" ? "btn--danger" : ""}`} disabled={isSelf} onClick={() => setDialog({ kind: "status", target: u })}>
                          {u.status === "active" ? "Suspend" : "Reactivate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted">You can’t change your own role or status. Volunteer stats come from support sessions.</p>
      </Panel>

      <StepUpDialog
        open={Boolean(dialog)}
        title={dialog?.kind === "role" ? `Change role for ${dialog.target.name}` : `${dialog?.target.status === "active" ? "Suspend" : "Reactivate"} ${dialog?.target.name}`}
        description={dialog?.kind === "status" && dialog.target.status === "active" ? "A suspended account is signed out and cannot sign in." : undefined}
        confirmLabel={needsApproval ? "Submit for approval" : "Confirm"}
        onConfirm={confirm}
        onCancel={() => setDialog(null)}
      >
        {dialog?.kind === "role" && (
          <>
            <div className="stepup__field">
              <label htmlFor="new-role">New role</label>
              <select id="new-role" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                {roleOptions.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            {needsApproval && <Notice tone="warning">This involves a privileged role, so a second administrator must approve it.</Notice>}
          </>
        )}
      </StepUpDialog>
    </>
  );
}
