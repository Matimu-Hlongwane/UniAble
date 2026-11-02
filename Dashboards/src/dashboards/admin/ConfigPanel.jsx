import { useState } from "react";
import { Badge, Notice, Panel } from "../ui.jsx";
import StepUpDialog from "../../components/StepUpDialog.jsx";
import { useSession } from "../../auth/SessionContext.jsx";
import { CONFIG_META, requestConfigChange, useAdminState } from "../../services/adminStore.js";

export default function ConfigPanel() {
  const { user: actor } = useSession();
  const { config, approvals } = useAdminState();
  const [editing, setEditing] = useState(null); // key
  const [draft, setDraft] = useState("");
  const [flash, setFlash] = useState("");

  const meta = editing ? CONFIG_META[editing] : null;

  function startEdit(key) {
    setEditing(key);
    setDraft(String(config[key]));
  }

  function confirm(reason) {
    const value = meta.type === "boolean" ? draft === "true" : Number(draft);
    const result = requestConfigChange(actor, editing, value, reason);
    if (result.ok) {
      setEditing(null);
      setFlash(result.pending ? "Submitted for approval by a second administrator." : "Setting updated and recorded.");
    }
    return result;
  }

  return (
    <>
      <p role="status" aria-live="polite" className="muted">{flash}</p>
      <Panel title="Settings" subtitle="These settings take effect across the student experience." id="settings">
        <ul className="list">
          {Object.entries(CONFIG_META).map(([key, m]) => {
            const waiting = approvals.some((a) => a.kind === "config" && a.key === key && a.status === "pending");
            return (
              <li key={key} className="list__item">
                <div className="list__row">
                  <strong>{m.label}</strong>
                  <span>
                    {m.sensitivity === "critical" && <Badge tone="warning">Needs second approval</Badge>}{" "}
                    <Badge>{m.type === "boolean" ? (config[key] ? "On" : "Off") : config[key]}</Badge>
                  </span>
                </div>
                <span className="muted">{m.description}</span>
                {waiting && <Badge tone="warning">Change awaiting approval</Badge>}
                <div>
                  <button type="button" className="btn" onClick={() => startEdit(key)} disabled={waiting}>
                    Change<span className="sr-only"> {m.label}</span>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>

      <StepUpDialog
        open={Boolean(editing)}
        title={meta ? `Change: ${meta.label}` : ""}
        confirmLabel={meta?.sensitivity === "critical" ? "Submit for approval" : "Save change"}
        onConfirm={confirm}
        onCancel={() => setEditing(null)}
      >
        {meta?.type === "boolean" && (
          <div className="stepup__field">
            <label htmlFor="cfg-value">New value</label>
            <select id="cfg-value" value={draft} onChange={(e) => setDraft(e.target.value)}>
              <option value="true">On</option>
              <option value="false">Off</option>
            </select>
          </div>
        )}
        {meta?.type === "number" && (
          <div className="stepup__field">
            <label htmlFor="cfg-value">New value ({meta.min}–{meta.max})</label>
            <input id="cfg-value" type="number" min={meta.min} max={meta.max} value={draft} onChange={(e) => setDraft(e.target.value)} />
          </div>
        )}
        {meta?.sensitivity === "critical" && (
          <Notice tone="warning">This is a safety-critical setting. It only changes after a second administrator approves.</Notice>
        )}
      </StepUpDialog>
    </>
  );
}
