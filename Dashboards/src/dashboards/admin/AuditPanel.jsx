import { useState } from "react";
import { Badge, Notice, Panel, formatDateTime } from "../ui.jsx";
import { ROLE_LABELS } from "../../auth/roles.js";
import { useAuditEntries } from "../../services/auditLog.js";

export default function AuditPanel() {
  const entries = useAuditEntries();
  const [filter, setFilter] = useState("");
  const needle = filter.trim().toLowerCase();
  const shown = needle
    ? entries.filter((e) => `${e.actorName} ${e.action} ${e.target} ${e.outcome}`.toLowerCase().includes(needle))
    : entries;

  return (
    <>
      <Notice>
        Read-only. Entries can’t be edited or deleted from this console. Records are referenced by ID,
        never by student details.
      </Notice>
      <Panel title="Recorded events" subtitle={`${shown.length} of ${entries.length} shown, newest first`} id="audit">
        <div className="field">
          <label htmlFor="audit-filter">Filter by person, action or target</label>
          <input id="audit-filter" type="text" value={filter} onChange={(e) => setFilter(e.target.value)} />
        </div>
        {shown.length === 0 ? (
          <p className="muted">No matching events.</p>
        ) : (
          <div className="table-wrap">
            <table className="dash-table">
              <caption className="sr-only">Audit trail</caption>
              <thead>
                <tr>
                  <th scope="col">When</th><th scope="col">Who</th><th scope="col">Action</th>
                  <th scope="col">Target</th><th scope="col">Outcome</th><th scope="col">Reason / detail</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td>{formatDateTime(e.at)}</td>
                    <td>{e.actorName}<br /><span className="muted">{ROLE_LABELS[e.actorRole] ?? e.actorRole}</span></td>
                    <td className="mono">{e.action}</td>
                    <td className="mono">{e.target}</td>
                    <td><Badge tone={e.outcome === "success" ? "success" : "danger"}>{e.outcome}</Badge></td>
                    <td>{e.reason}{e.reason && e.detail ? " — " : ""}<span className="muted">{e.detail}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
