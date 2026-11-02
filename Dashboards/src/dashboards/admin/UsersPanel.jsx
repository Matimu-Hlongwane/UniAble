import { useState } from "react";
import { Badge, Notice, Panel, StatGrid } from "../ui.jsx";
import StepUpDialog from "../../components/StepUpDialog.jsx";
import { useSession } from "../../auth/SessionContext.jsx";
import { PRIVILEGED_ROLES, ROLE_LABELS, ROLES } from "../../auth/roles.js";
import { useDirectory } from "../../services/directory.js";
import { requestRoleChange, requestStatusChange } from "../../services/adminStore.js";

export default function UsersPanel() {
  const { user: actor } = useSession();
  const { users } = useDirectory();
  const [dialog, setDialog] = useState(null); // { kind: "role" | "status", target }
  const [newRole, setNewRole] = useState(ROLES.STUDENT);
  const [flash, setFlash] = useState("");

  const active = users.filter((u) => u.status === "active").length;
  const roleOptions = Object.values(ROLES).filter((r) => dialog && r !== dialog.target.role);
  const needsApproval =
    dialog?.kind === "role" &&
    (PRIVILEGED_ROLES.includes(newRole) || PRIVILEGED_ROLES.includes(dialog.target.role));

  function openRole(target) {
    setNewRole(Object.values(ROLES).find((r) => r !== target.role));
    setDialog({ kind: "role", target });
  }

  function confirm(reason) {
    const { kind, target } = dialog;
    const result =
      kind === "role"
        ? requestRoleChange(actor, target, newRole, reason)
        : requestStatusChange(actor, target, target.status === "active" ? "suspended" : "active", reason);
    if (result.ok) {
      setDialog(null);
      setFlash(
        result.pending
          ? "Submitted. A different administrator must approve this change before it takes effect."
          : "Change applied and recorded in the audit trail."
      );
    }
    return result;
  }

  return (
    <>
      <StatGrid
        items={[
          { label: "Accounts", value: users.length },
          { label: "Active", value: active },
          { label: "Suspended", value: users.length - active },
        ]}
      />
      <p role="status" aria-live="polite" className="muted">{flash}</p>

      <Panel title="Accounts" subtitle="Name, email, role and status only." id="accounts">
        <div className="table-wrap">
          <table className="dash-table">
            <caption className="sr-only">User accounts</caption>
            <thead>
              <tr>
                <th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th>
                <th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.uid === actor.uid;
                return (
                  <tr key={u.uid}>
                    <td>{u.name} {isSelf && <Badge>You</Badge>}</td>
                    <td>{u.email}</td>
                    <td>{ROLE_LABELS[u.role]}</td>
                    <td><Badge tone={u.status === "active" ? "success" : "danger"}>{u.status === "active" ? "Active" : "Suspended"}</Badge></td>
                    <td>
                      <div className="cell-actions">
                        <button type="button" className="btn" disabled={isSelf} onClick={() => openRole(u)}>
                          Change role<span className="sr-only"> for {u.name}</span>
                        </button>
                        <button
                          type="button"
                          className={`btn ${u.status === "active" ? "btn--danger" : ""}`}
                          disabled={isSelf}
                          onClick={() => setDialog({ kind: "status", target: u })}
                        >
                          {u.status === "active" ? "Suspend" : "Reactivate"}<span className="sr-only"> {u.name}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted">You can’t change your own role or status.</p>
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
            {needsApproval && (
              <Notice tone="warning">
                This involves a privileged role, so a second administrator must approve it.
              </Notice>
            )}
          </>
        )}
      </StepUpDialog>
    </>
  );
}
