import { createStore } from "../lib/createStore.js";
import { newId } from "../lib/id.js";
import { can, PRIVILEGED_ROLES, ROLES } from "../auth/roles.js";
import { recordAudit } from "./auditLog.js";
import { directoryStore, findByUid, setRole, setStatus } from "./directory.js";

// Administrative rules engine.
//
// Every sensitive change needs: (1) the right permission, (2) a written
// reason, (3) a fresh password check (done in StepUpDialog), and (4) an
// audit entry. "Critical" changes — privileged-role grants/removals and
// safety-critical settings — additionally wait for a DIFFERENT
// administrator to approve them (four-eyes principle). Denied attempts are
// audited too.
//
// These checks run in the browser for the demo. In production the same
// rules must be enforced server-side (Cloud Functions + Firestore rules),
// because client-side checks can be bypassed.

export const CONFIG_META = {
  peerAssistanceEnabled: {
    label: "Peer assistance matching",
    description: "Lets students request help from volunteer peers.",
    type: "boolean",
    sensitivity: "standard",
  },
  wakeWordEnabled: {
    label: "Voice wake-word activation",
    description: "Shows the “Hey UniAble” voice activation option to students.",
    type: "boolean",
    sensitivity: "standard",
  },
  unresponsiveCheckInMinutes: {
    label: "Unresponsive check-in threshold (minutes)",
    description:
      "How long a student can go without answering a wellbeing check-in before an alert is raised. Safety-critical.",
    type: "number",
    min: 5,
    max: 60,
    sensitivity: "critical",
  },
};

const store = createStore("uniable.admin.v1", {
  config: { peerAssistanceEnabled: true, wakeWordEnabled: true, unresponsiveCheckInMinutes: 15 },
  approvals: [],
});

export const useAdminState = () => store.use();

const MIN_REASON = 10;

function fail(error) {
  return { ok: false, error };
}

function deny(actor, action, target, reason, message) {
  recordAudit({ actor, action, target, reason, outcome: "denied", detail: message });
  return fail(message);
}

function activeAdminCount() {
  return directoryStore.get().users.filter((u) => u.role === ROLES.ADMIN && u.status === "active").length;
}

function reasonOk(reason) {
  return typeof reason === "string" && reason.trim().length >= MIN_REASON;
}

export function describeApproval(a) {
  if (a.kind === "role") return `Change ${a.targetName} from ${a.fromRole} to ${a.toRole}`;
  const meta = CONFIG_META[a.key];
  return `Change “${meta?.label ?? a.key}” from ${a.fromValue} to ${a.toValue}`;
}

export function requestRoleChange(actor, target, newRole, reason) {
  const ref = `user:${target.uid}`;
  if (!can(actor.role, "roles.assign")) return deny(actor, "role.change.requested", ref, reason, "You are not permitted to assign roles.");
  if (!reasonOk(reason)) return fail("A reason of at least 10 characters is required.");
  if (actor.uid === target.uid) return deny(actor, "role.change.requested", ref, reason, "You cannot change your own role.");
  if (target.role === newRole) return fail("That account already has this role.");
  if (target.role === ROLES.ADMIN && target.status === "active" && activeAdminCount() <= 1) {
    return deny(actor, "role.change.requested", ref, reason, "At least one active administrator must remain.");
  }

  const needsApproval = PRIVILEGED_ROLES.includes(newRole) || PRIVILEGED_ROLES.includes(target.role);
  if (!needsApproval) {
    setRole(target.uid, newRole);
    recordAudit({ actor, action: "role.changed", target: ref, reason, detail: `${target.role} -> ${newRole}` });
    return { ok: true, pending: false };
  }

  const approval = {
    id: newId("apr"),
    kind: "role",
    targetUid: target.uid,
    targetName: target.name,
    fromRole: target.role,
    toRole: newRole,
    requestedBy: { uid: actor.uid, name: actor.name },
    requestedAt: new Date().toISOString(),
    reason,
    status: "pending",
  };
  store.set((s) => ({ ...s, approvals: [approval, ...s.approvals] }));
  recordAudit({ actor, action: "role.change.requested", target: ref, reason, detail: `${target.role} -> ${newRole} (awaiting second administrator)` });
  return { ok: true, pending: true };
}

export function requestStatusChange(actor, target, status, reason) {
  const ref = `user:${target.uid}`;
  if (!can(actor.role, "accounts.status")) return deny(actor, "account.status.requested", ref, reason, "You are not permitted to change account status.");
  if (!reasonOk(reason)) return fail("A reason of at least 10 characters is required.");
  if (actor.uid === target.uid) return deny(actor, "account.status.requested", ref, reason, "You cannot change the status of your own account.");
  if (status === "suspended" && target.role === ROLES.ADMIN && target.status === "active" && activeAdminCount() <= 1) {
    return deny(actor, "account.status.requested", ref, reason, "At least one active administrator must remain.");
  }
  setStatus(target.uid, status);
  recordAudit({ actor, action: "account.status.changed", target: ref, reason, detail: `${target.status} -> ${status}` });
  return { ok: true, pending: false };
}

function validConfigValue(meta, value) {
  if (meta.type === "boolean") return typeof value === "boolean";
  return Number.isInteger(value) && value >= meta.min && value <= meta.max;
}

export function requestConfigChange(actor, key, value, reason) {
  const ref = `config:${key}`;
  const meta = CONFIG_META[key];
  if (!can(actor.role, "config.manage")) return deny(actor, "config.change.requested", ref, reason, "You are not permitted to change configuration.");
  if (!meta) return fail("Unknown setting.");
  if (!reasonOk(reason)) return fail("A reason of at least 10 characters is required.");
  if (!validConfigValue(meta, value)) {
    return fail(meta.type === "number" ? `Enter a whole number from ${meta.min} to ${meta.max}.` : "Invalid value.");
  }
  const current = store.get().config[key];
  if (current === value) return fail("That is already the current value.");

  if (meta.sensitivity !== "critical") {
    store.set((s) => ({ ...s, config: { ...s.config, [key]: value } }));
    recordAudit({ actor, action: "config.changed", target: ref, reason, detail: `${current} -> ${value}` });
    return { ok: true, pending: false };
  }

  const approval = {
    id: newId("apr"),
    kind: "config",
    key,
    fromValue: current,
    toValue: value,
    requestedBy: { uid: actor.uid, name: actor.name },
    requestedAt: new Date().toISOString(),
    reason,
    status: "pending",
  };
  store.set((s) => ({ ...s, approvals: [approval, ...s.approvals] }));
  recordAudit({ actor, action: "config.change.requested", target: ref, reason, detail: `${current} -> ${value} (awaiting second administrator)` });
  return { ok: true, pending: true };
}

function settle(id, patch) {
  store.set((s) => ({
    ...s,
    approvals: s.approvals.map((a) => (a.id === id ? { ...a, ...patch } : a)),
  }));
}

export function decideApproval(actor, id, decision, reason) {
  const ref = `approval:${id}`;
  if (!can(actor.role, "approvals.decide")) return deny(actor, "approval.decided", ref, reason, "You are not permitted to decide approvals.");
  if (!reasonOk(reason)) return fail("A reason of at least 10 characters is required.");

  const approval = store.get().approvals.find((a) => a.id === id && a.status === "pending");
  if (!approval) return fail("This request is no longer pending.");
  if (approval.requestedBy.uid === actor.uid) {
    return deny(actor, "approval.decided", ref, reason, "A different administrator must decide your request.");
  }

  const decidedBy = { uid: actor.uid, name: actor.name };
  const decidedAt = new Date().toISOString();

  if (decision === "reject") {
    settle(id, { status: "rejected", decidedBy, decidedAt, decisionReason: reason });
    recordAudit({ actor, action: "approval.rejected", target: ref, reason, detail: describeApproval(approval) });
    return { ok: true };
  }

  // Re-validate against current state before applying.
  if (approval.kind === "role") {
    const target = findByUid(approval.targetUid);
    if (!target || target.role !== approval.fromRole) {
      settle(id, { status: "expired", decidedBy, decidedAt, decisionReason: "Account changed since the request was made." });
      return fail("The account has changed since this request was made, so it was closed.");
    }
    if (target.role === ROLES.ADMIN && target.status === "active" && activeAdminCount() <= 1) {
      return deny(actor, "approval.decided", ref, reason, "At least one active administrator must remain.");
    }
    setRole(target.uid, approval.toRole);
  } else {
    const meta = CONFIG_META[approval.key];
    if (!meta || !validConfigValue(meta, approval.toValue)) return fail("This setting change is no longer valid.");
    store.set((s) => ({ ...s, config: { ...s.config, [approval.key]: approval.toValue } }));
  }

  settle(id, { status: "approved", decidedBy, decidedAt, decisionReason: reason });
  recordAudit({ actor, action: "approval.approved", target: ref, reason, detail: describeApproval(approval) });
  return { ok: true };
}
