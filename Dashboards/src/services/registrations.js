import { createStore } from "../lib/createStore.js";
import { can } from "../auth/roles.js";
import { recordAudit } from "./auditLog.js";

// Disability registrations — special personal information. Only the
// Disability Office role may read or change these. Audit entries refer to
// registrations by ID only and never copy the category or document names.

export const ACCOMMODATION_OPTIONS = [
  "Extra time",
  "Captioning",
  "Sign-language interpreter",
  "Alternative formats",
  "Audio-first materials",
  "Accessible venue",
];

const SEED = {
  registrations: [
    {
      id: "REG-1042", studentName: "Lindiwe S.", category: "Hearing", status: "pending", submittedAt: "2026-10-19",
      documents: [
        { id: "d1", name: "Audiology report.pdf", type: "Medical report" },
        { id: "d2", name: "Student card.jpg", type: "Identity" },
      ],
      accommodations: [], decisionNote: null,
    },
    {
      id: "REG-1043", studentName: "Sipho N.", category: "Visual", status: "pending", submittedAt: "2026-10-20",
      documents: [{ id: "d3", name: "Ophthalmology letter.pdf", type: "Medical report" }],
      accommodations: [], decisionNote: null,
    },
    {
      id: "REG-1039", studentName: "Thandi M.", category: "Neurodiverse", status: "needs_info", submittedAt: "2026-10-12",
      documents: [{ id: "d4", name: "Assessment summary.pdf", type: "Assessment" }],
      accommodations: [], decisionNote: "Please upload the full assessment, not only the summary page.",
    },
    {
      id: "REG-1031", studentName: "Bongani T.", category: "Mobility", status: "approved", submittedAt: "2026-10-03",
      documents: [{ id: "d5", name: "Occupational therapy report.pdf", type: "Medical report" }],
      accommodations: ["Accessible venue"], decisionNote: null,
    },
    {
      id: "REG-1027", studentName: "Nande M.", category: "Visual", status: "approved", submittedAt: "2026-09-28",
      documents: [{ id: "d6", name: "Low-vision assessment.pdf", type: "Assessment" }],
      accommodations: ["Alternative formats", "Audio-first materials"], decisionNote: null,
    },
  ],
};

const store = createStore("uniable.registrations.v2", SEED);

export const useRegistrations = () => store.use().registrations;

export function recordDocumentView(actor, registrationId, documentId) {
  if (!can(actor.role, "documents.verify")) return false;
  recordAudit({
    actor,
    action: "registration.document.viewed",
    target: `registration:${registrationId}`,
    detail: `document ${documentId}`,
  });
  return true;
}

export function decideRegistration(actor, id, { decision, note, accommodations }) {
  const target = `registration:${id}`;
  if (!can(actor.role, "registrations.review")) {
    recordAudit({ actor, action: "registration.decision", target, outcome: "denied" });
    return { ok: false, error: "You are not permitted to review registrations." };
  }
  if ((decision === "rejected" || decision === "needs_info") && (!note || note.trim().length < 5)) {
    return { ok: false, error: "Add a short note explaining the decision to the student." };
  }
  store.set((s) => ({
    registrations: s.registrations.map((r) =>
      r.id === id
        ? {
            ...r,
            status: decision,
            decisionNote: note?.trim() || null,
            accommodations: decision === "approved" ? accommodations : [],
          }
        : r
    ),
  }));
  recordAudit({ actor, action: "registration.decision", target, detail: decision });
  return { ok: true };
}
