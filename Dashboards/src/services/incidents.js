import { createStore } from "../lib/createStore.js";
import { can } from "../auth/roles.js";
import { recordAudit } from "./auditLog.js";

// Safety incidents (SOS and unresponsive check-ins). Location is kept only
// while an incident is active and is cleared when it is resolved or cancelled.

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

const SEED = {
  incidents: [
    {
      id: "INC-2041", studentName: "Nande Mtsi", studentUid: "u-student", type: "Unresponsive to check-in",
      createdAt: minutesAgo(15), status: "en_route", location: { label: "Library, 2nd Floor" }, locationNote: null,
      officer: "T. Nemavhola", assignedPeer: "Thabo M.", resolutionNote: null,
    },
    {
      id: "INC-2038", studentName: "Karabo M.", studentUid: null, type: "Emergency SOS",
      createdAt: minutesAgo(1300), status: "resolved", location: null, locationNote: "Cleared after resolution",
      officer: "T. Nemavhola", assignedPeer: null, resolutionNote: "Student assisted to the clinic; no further action.",
    },
  ],
};

const store = createStore("uniable.incidents.v2", SEED);

export const useIncidents = () => store.use().incidents;

export const ACTIVE_STATUSES = ["new", "acknowledged", "en_route", "on_scene"];

export const STATUS_LABELS = {
  new: "New",
  acknowledged: "Acknowledged",
  en_route: "En route",
  on_scene: "On scene",
  resolved: "Resolved",
  cancelled: "Cancelled by student",
};

const NEXT = { new: "acknowledged", acknowledged: "en_route", en_route: "on_scene", on_scene: "resolved" };
export const NEXT_ACTION_LABEL = {
  new: "Acknowledge",
  acknowledged: "Mark en route",
  en_route: "Mark on scene",
  on_scene: "Resolve…",
};

function patch(id, changes) {
  store.set((s) => ({ incidents: s.incidents.map((i) => (i.id === id ? { ...i, ...changes } : i)) }));
}

export function createIncident({ studentName, studentUid, type }) {
  const incident = {
    id: `INC-${Math.floor(3000 + Math.random() * 6000)}`,
    studentName, studentUid, type,
    createdAt: new Date().toISOString(),
    status: "new", location: null, locationNote: "Locating…",
    officer: null, assignedPeer: null, resolutionNote: null,
  };
  store.set((s) => ({ incidents: [incident, ...s.incidents] }));
  return incident;
}

export function updateIncidentLocation(id, location, note = null) {
  const current = store.get().incidents.find((i) => i.id === id);
  if (!current || !ACTIVE_STATUSES.includes(current.status)) return;
  patch(id, { location, locationNote: note });
}

export function cancelIncident(id) {
  patch(id, { status: "cancelled", location: null, locationNote: "Cleared after cancellation" });
}

export function advanceIncident(actor, id, note) {
  const target = `incident:${id}`;
  if (!can(actor.role, "incidents.respond")) {
    recordAudit({ actor, action: "incident.status.changed", target, outcome: "denied" });
    return { ok: false, error: "You are not permitted to respond to incidents." };
  }
  const incident = store.get().incidents.find((i) => i.id === id);
  if (!incident || !NEXT[incident.status]) return { ok: false, error: "This incident can no longer be updated." };

  const next = NEXT[incident.status];
  if (next === "resolved" && (!note || note.trim().length < 5)) {
    return { ok: false, error: "Add a short resolution note." };
  }
  patch(id, {
    status: next,
    officer: incident.officer ?? actor.name,
    ...(next === "resolved"
      ? { location: null, locationNote: "Cleared after resolution", resolutionNote: note.trim() }
      : {}),
  });
  recordAudit({ actor, action: "incident.status.changed", target, detail: `${incident.status} -> ${next}` });
  return { ok: true };
}
