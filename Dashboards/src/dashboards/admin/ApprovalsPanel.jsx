import { useState } from "react";
import { Badge, Panel, formatDateTime } from "../ui.jsx";
import StepUpDialog from "../../components/StepUpDialog.jsx";
import { useSession } from "../../auth/SessionContext.jsx";
import { decideApproval, describeApproval, useAdminState } from "../../services/adminStore.js";

export default function ApprovalsPanel() {
  const { user: actor } = useSession();
  const { approvals } = useAdminState();
  const [decision, setDecision] = useState(null); // { id, kind: "approve" | "reject" }
  const pending = approvals.filter((a) => a.status === "pending");
  const decided = approvals.filter((a) => a.status !== "pending").slice(0, 8);

  return (
    <>
      <Panel
        title="Waiting for a second administrator"
        subtitle="Privileged-role changes and safety-critical settings need someone other than the requester."
        id="pending"
      >
        {pending.length === 0 ? (
          <p className="muted">Nothing is waiting.</p>
        ) : (
          <ul className="list">
            {pending.map((a) => {
              const own = a.requestedBy.uid === actor.uid;
              return (
                <li key={a.id} className="list__item">
                  <strong>{describeApproval(a)}</strong>
                  <span className="muted">
                    Requested by {a.requestedBy.name} · {formatDateTime(a.requestedAt)} — “{a.reason}”
                  </span>
                  {own ? (
                    <Badge tone="warning">Awaiting a different administrator</Badge>
                  ) : (
                    <div className="cell-actions">
                      <button type="button" className="btn btn--primary" onClick={() => setDecision({ id: a.id, kind: "approve" })}>
                        Approve<span className="sr-only"> request</span>
                      </button>
                      <button type="button" className="btn btn--danger" onClick={() => setDecision({ id: a.id, kind: "reject" })}>
                        Reject<span className="sr-only"> request</span>
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>

      {decided.length > 0 && (
        <Panel title="Recently decided" id="decided">
          <ul className="list">
            {decided.map((a) => (
              <li key={a.id} className="list__item">
                <div className="list__row">
                  <strong>{describeApproval(a)}</strong>
                  <Badge tone={a.status === "approved" ? "success" : a.status === "rejected" ? "danger" : "neutral"}>
                    {a.status}
                  </Badge>
                </div>
                <span className="muted">
                  {a.decidedBy ? `By ${a.decidedBy.name} · ` : ""}{a.decidedAt ? formatDateTime(a.decidedAt) : ""}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <StepUpDialog
        open={Boolean(decision)}
        title={decision?.kind === "approve" ? "Approve this change" : "Reject this change"}
        confirmLabel={decision?.kind === "approve" ? "Approve" : "Reject"}
        onConfirm={(reason) => {
          const result = decideApproval(actor, decision.id, decision.kind, reason);
          if (result.ok) setDecision(null);
          return result;
        }}
        onCancel={() => setDecision(null)}
      />
    </>
  );
}
