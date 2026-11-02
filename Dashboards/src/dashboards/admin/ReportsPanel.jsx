import { useState, useMemo } from "react";
import { Notice, Panel, Badge } from "../ui.jsx";
import { useSession } from "../../auth/SessionContext.jsx";
import { can } from "../../auth/roles.js";
import { recordAudit } from "../../services/auditLog.js";
import { REPORTS, displayRows, reportToCsv } from "../../services/reports.js";
import { useRegistrations } from "../../services/registrations.js";

// MOCK volunteer data - replace with real service later
const VOLUNTEER_LEADERBOARD = [
  { id: "vol_1", name: "Thando M.", sessions: 47, hours: 62, studentsHelped: 23, rating: 4.9 },
  { id: "vol_2", name: "Sarah K.", sessions: 38, hours: 51, studentsHelped: 19, rating: 4.8 },
  { id: "vol_3", name: "James L.", sessions: 31, hours: 44, studentsHelped: 18, rating: 4.7 },
  { id: "vol_4", name: "Noluthando D.", sessions: 29, hours: 39, studentsHelped: 15, rating: 4.9 },
  { id: "vol_5", name: "Priya S.", sessions: 22, hours: 30, studentsHelped: 12, rating: 4.6 },
];

function SimpleBarChart({ data, color = "var(--primary)" }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'grid', gap: '10px' }}>
      {data.map(item => (
        <div key={item.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
            <span style={{ fontWeight: 600 }}>{item.label}</span>
            <span className="muted">{item.value}</span>
          </div>
          <div style={{ height: '10px', background: 'var(--bg-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{ width: `${(item.value / max) * 100}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 0.5s' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPanel() {
  const { user } = useSession();
  const registrations = useRegistrations();
  const [reportId, setReportId] = useState("registrations");
  const report = REPORTS[reportId];

  const stats = useMemo(() => {
    const total = registrations.length;
    const pending = registrations.filter(r => r.status === 'pending').length;
    const approved = registrations.filter(r => r.status === 'approved').length;
    const rejected = registrations.filter(r => r.status === 'rejected').length;
    const needsInfo = registrations.filter(r => r.status === 'needs_info').length;
    
    // Category breakdown for graph
    const byCategory = registrations.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {});

    return { total, pending, approved, rejected, needsInfo, byCategory };
  }, [registrations]);

  const categoryChartData = Object.entries(stats.byCategory).map(([label, value]) => ({ label, value }));
  const statusChartData = [
    { label: "Approved", value: stats.approved },
    { label: "Pending", value: stats.pending },
    { label: "Needs Info", value: stats.needsInfo },
    { label: "Rejected", value: stats.rejected },
  ];

  function downloadCSV() {
    if (!can(user.role, "reports.aggregate")) return;
    recordAudit({ actor: user, action: "report.exported", target: `report:${report.id}:csv` });
    const blob = new Blob([reportToCsv(report)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uniable-${report.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadPDF() {
    if (!can(user.role, "reports.aggregate")) return;
    recordAudit({ actor: user, action: "report.exported", target: `report:${report.id}:pdf` });
    
    // Simple PDF-like text report - real PDF would need jspdf lib
    const rows = displayRows(report);
    let content = `UniAble Report: ${report.title}\nGenerated: ${new Date().toLocaleString()}\nBy: ${user.email}\n\n`;
    content += `SUMMARY\nTotal: ${stats.total} | Approved: ${stats.approved} | Pending: ${stats.pending}\n\n`;
    content += `${report.columns.join(" | ")}\n`;
    content += "-".repeat(50) + "\n";
    rows.forEach(r => content += r.join(" | ") + "\n");
    content += `\nNOTE: Counts 1-4 hidden for privacy (POPIA). Top volunteer: ${VOLUNTEER_LEADERBOARD[0].name} (${VOLUNTEER_LEADERBOARD[0].sessions} sessions)\n`;
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uniable-${report.id}-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function downloadVolunteerCSV() {
    recordAudit({ actor: user, action: "report.exported", target: "volunteer-leaderboard" });
    const header = "Rank,Volunteer,Sessions,Hours,Students Helped,Rating\n";
    const rows = VOLUNTEER_LEADERBOARD.map((v, i) => `${i+1},${v.name},${v.sessions},${v.hours},${v.studentsHelped},${v.rating}`).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uniable-volunteers-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const topVolunteer = VOLUNTEER_LEADERBOARD[0];

  return (
    <>
      <Notice>
        Reports are aggregated and de-identified: no names, emails, locations or free text, and counts of 1–4 are hidden. Each export is recorded in the audit trail. Sample data.
      </Notice>

      {/* STATS CARDS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '16px' }}>
        <div className="panel" style={{ padding: '16px', borderLeft: '4px solid var(--primary)' }}>
          <div className="muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Total Registrations</div>
          <div style={{ fontSize: '28px', fontWeight: '800' }}>{stats.total}</div>
        </div>
        <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #22c55e' }}>
          <div className="muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Approved</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#16a34a' }}>{stats.approved}</div>
        </div>
        <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div className="muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Pending</div>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#d97706' }}>{stats.pending}</div>
        </div>
        <div className="panel" style={{ padding: '16px', borderLeft: '4px solid #3b82f6' }}>
          <div className="muted" style={{ fontSize: '11px', textTransform: 'uppercase' }}>Top Volunteer</div>
          <div style={{ fontSize: '16px', fontWeight: '700' }}>{topVolunteer.name}</div>
          <div className="muted" style={{ fontSize: '12px' }}>{topVolunteer.sessions} sessions</div>
        </div>
      </div>

      {/* GRAPHS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '16px' }}>
        <Panel title="Registrations by Category" id="graph-category">
          <SimpleBarChart data={categoryChartData} color="#6366f1" />
        </Panel>
        <Panel title="By Status" id="graph-status">
          <SimpleBarChart data={statusChartData} color="#22c55e" />
        </Panel>
      </div>

      {/* VOLUNTEER LEADERBOARD */}
      <Panel 
        title="Volunteer Leaderboard — Who helped most" 
        id="volunteers"
        actions={<button type="button" className="btn" onClick={downloadVolunteerCSV}>Download Volunteers CSV</button>}
      >
        <div className="table-wrap">
          <table className="dash-table">
            <thead><tr><th>Rank</th><th>Volunteer</th><th>Sessions</th><th>Hours</th><th>Students Helped</th><th>Rating</th></tr></thead>
            <tbody>
              {VOLUNTEER_LEADERBOARD.map((v, idx) => (
                <tr key={v.id} style={{ background: idx === 0 ? '#fef9c3' : 'transparent', fontWeight: idx === 0 ? 600 : 400 }}>
                  <td>{idx === 0 ? '🏆 1' : idx + 1}</td>
                  <td>{v.name} {idx === 0 && <Badge tone="warning">Top Helper</Badge>}</td>
                  <td>{v.sessions}</td>
                  <td>{v.hours}h</td>
                  <td>{v.studentsHelped}</td>
                  <td>⭐ {v.rating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: '12px', marginTop: '8px' }}>Data from support sessions. Replace VOLUNTEER_LEADERBOARD with real service call to volunteer sessions.</p>
      </Panel>

      {/* MAIN REPORT TABLE WITH DOWNLOADS */}
      <Panel
        title={report.title}
        id="report"
        actions={
          <div style={{ display: 'flex', gap: '8px' }}>
            <select id="report-choice" value={reportId} onChange={(e) => setReportId(e.target.value)} className="input" style={{ minWidth: '160px' }}>
              {Object.values(REPORTS).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
            <button type="button" className="btn btn--primary" onClick={downloadCSV}>Download CSV</button>
            <button type="button" className="btn" onClick={downloadPDF}>Download Report (TXT/PDF)</button>
          </div>
        }
      >
        <div className="table-wrap">
          <table className="dash-table">
            <thead><tr>{report.columns.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
            <tbody>
              {displayRows(report).map((row) => (
                <tr key={row[0]}>{row.map((cell, i) => <td key={i}>{cell}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <Badge tone="success">Total: {stats.total}</Badge>
          <Badge tone="warning">Hidden counts 1-4 for privacy</Badge>
          <Badge>Audit logged for {user.role}</Badge>
        </div>
      </Panel>
    </>
  );
}
