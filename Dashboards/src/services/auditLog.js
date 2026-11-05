import { createStore } from "../lib/createStore.js";
import { newId } from "../lib/id.js";

// Append-only audit trail. This module exposes no update or delete.
//
// Entries reference people and records by opaque IDs (user:u-123,
// registration:REG-1042) rather than copying personal or disability data
// into the log, so the audit trail itself can be shown to administrators
// without exposing student information.
//
// IMPORTANT: in this demo the log lives in browser storage, which a user
// could tamper with. A real audit trail must be written server-side
// (Cloud Functions + Firestore rules that deny client writes) — see README.

const store = createStore("uniable.audit.v1", { entries: [] });

export function recordAudit({ actor, action, target, reason = null, outcome = "success", detail = null }) {
  const entry = Object.freeze({
    id: newId("aud"),
    at: new Date().toISOString(),
    actorId: actor?.uid ?? "anonymous",
    actorName: actor?.name ?? "Unidentified",
    actorRole: actor?.role ?? "none",
    action,
    target,
    reason,
    outcome,
    detail,
  });
  store.set((state) => ({ entries: [entry, ...state.entries] }));
  return entry;
}

export function useAuditEntries() {
  return store.use().entries;
}
