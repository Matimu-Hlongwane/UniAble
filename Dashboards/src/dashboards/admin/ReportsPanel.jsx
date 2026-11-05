import { useState } from "react";
import { Notice, Panel } from "../ui.jsx";
import { useSession } from "../../auth/SessionContext.jsx";
import { can } from "../../auth/roles.js";
import { recordAudit } from "../../services/auditLog.js";
import { REPORTS, displayRows, reportToCsv } from "../../services/reports.js";

export default function ReportsPanel() {
  const { user } = useSession();
  const [reportId, setReportId] = useState("registrations");
  const report = REPORTS[reportId];

  function download() {
    if (!can(user.role, "reports.aggregate")) return;
    recordAudit({ actor: user, action: "report.exported", target: `report:${report.id}` });
    const blob = new Blob([reportToCsv(report)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `uniable-${report.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <Notice>
        Reports are aggregated and de-identified: no names, emails, locations or free text, and counts
        of 1–4 are hidden. Each export is recorded in the audit trail. Sample data.
      </Notice>
      <Panel
        title={report.title}
        id="report"
        actions={<button type="button" className="btn btn--primary" onClick={download}>Download CSV</button>}
      >
        <div className="field">
          <label htmlFor="report-choice">Report</label>
          <select id="report-choice" value={reportId} onChange={(e) => setReportId(e.target.value)}>
            {Object.values(REPORTS).map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </div>
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
      </Panel>
    </>
  );
}
