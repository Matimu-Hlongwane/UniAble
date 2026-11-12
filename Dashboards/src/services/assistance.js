import { createStore } from "../lib/createStore.js";
import { newId } from "../lib/id.js";

// Peer assistance requests. Only the requesting student sees their own
// requests; no admin or staff view of request content exists.

const store = createStore("uniable.assistance.v1", { requests: [] });

export const ASSISTANCE_TYPES = ["Navigation help", "Lecture explanation", "Reading support", "Wellbeing check"];

export const useAssistanceRequests = () => store.use().requests;

export function createAssistanceRequest(user, { type, note }) {
  const request = {
    id: newId("req"),
    studentUid: user.uid,
    type,
    note: note?.trim() || "",
    status: "open",
    createdAt: new Date().toISOString(),
  };
  store.set((s) => ({ requests: [request, ...s.requests] }));
  return request;
}

export function cancelAssistanceRequest(user, id) {
  store.set((s) => ({
    requests: s.requests.map((r) =>
      r.id === id && r.studentUid === user.uid && r.status === "open" ? { ...r, status: "cancelled" } : r
    ),
  }));
}
