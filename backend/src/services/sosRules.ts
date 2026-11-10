import type {
  IsoString,
  Role,
  SosAlert,
  SosEventType,
  SosLocation,
  SosLocationIssue,
  SosResolution,
  SosResponder,
  SosTimelineEvent,
} from "../types.js";

/**
 * Pure SOS rules. Nothing here touches Firebase or Express, so the rules can be
 * tested on their own and shared by every route.
 */

export const OPEN_STATUSES = ["active", "acknowledged"] as const;
export const MAX_TIMELINE_EVENTS = 80;
export const MIN_LOCATION_UPDATE_INTERVAL_MS = 4000;
export const MAX_NOTE_LENGTH = 500;

const LOCATION_ISSUES: readonly SosLocationIssue[] = [
  "denied",
  "unavailable",
  "timeout",
  "unsupported",
  "unknown",
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type LocationParse =
  | { ok: true; location: SosLocation | null }
  | { ok: false; error: string };

/**
 * Validates a location sent by the client. Missing/null means "no GPS", which is a
 * valid way to send an SOS. A location that is present but malformed is rejected.
 */
export function parseLocation(raw: unknown, capturedAt: IsoString): LocationParse {
  if (raw === undefined || raw === null) return { ok: true, location: null };
  if (!isRecord(raw)) return { ok: false, error: "The supplied location is invalid." };

  const lat = typeof raw.lat === "number" ? raw.lat : Number.NaN;
  const lng = typeof raw.lng === "number" ? raw.lng : Number.NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return { ok: false, error: "The supplied location is invalid." };
  }

  const location: SosLocation = { lat, lng, capturedAt };
  if (raw.accuracyMeters !== undefined && raw.accuracyMeters !== null) {
    const accuracy = typeof raw.accuracyMeters === "number" ? raw.accuracyMeters : Number.NaN;
    if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 1_000_000) {
      return { ok: false, error: "The supplied location accuracy is invalid." };
    }
    location.accuracyMeters = Math.round(accuracy);
  }
  return { ok: true, location };
}

export function parseLocationIssue(raw: unknown): SosLocationIssue {
  return typeof raw === "string" && (LOCATION_ISSUES as readonly string[]).includes(raw)
    ? (raw as SosLocationIssue)
    : "unknown";
}

export function cleanNote(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().slice(0, MAX_NOTE_LENGTH) : "";
}

export const isOpenStatus = (status: string | undefined): boolean =>
  status === "active" || status === "acknowledged";

export function parseResolution(raw: unknown): SosResolution {
  return raw === "false_alarm" ? "false_alarm" : "resolved";
}

/** Appends an event and keeps the trail bounded by dropping the oldest location updates first. */
export function appendTimeline(
  timeline: SosTimelineEvent[] | undefined,
  event: SosTimelineEvent
): SosTimelineEvent[] {
  const next = [...(timeline ?? []), event];
  while (next.length > MAX_TIMELINE_EVENTS) {
    const oldestLocation = next.findIndex((item) => item.type === "location_updated");
    // Only location updates are ever dropped; lifecycle events are permanent audit history.
    if (oldestLocation === -1) break;
    next.splice(oldestLocation, 1);
  }
  return next;
}

export type TransitionDecision =
  | { allowed: true; idempotent?: boolean }
  | { allowed: false; httpStatus: 403 | 409; error: string };

interface ResponderContext {
  uid: string;
  role: Role;
}

/** Decides whether a responder may acknowledge an alert in its current state. */
export function decideAcknowledge(alert: SosAlert, actor: ResponderContext): TransitionDecision {
  if (alert.status === "resolved" || alert.status === "cancelled") {
    return { allowed: false, httpStatus: 409, error: `This alert is already ${alert.status}.` };
  }
  if (alert.status === "active") return { allowed: true };

  const current = alert.assignedResponder;
  if (!current || current.uid === actor.uid) return { allowed: true, idempotent: Boolean(current) };

  // Security and administrators may take over from a volunteer; nobody else may steal an alert.
  if ((actor.role === "security" || actor.role === "admin") && current.role === "volunteer") {
    return { allowed: true };
  }
  return {
    allowed: false,
    httpStatus: 409,
    error: `This alert is already being handled by ${current.name}.`,
  };
}

/** Decides whether a responder may close an alert. */
export function decideResolve(alert: SosAlert, actor: ResponderContext): TransitionDecision {
  if (alert.status === "resolved" || alert.status === "cancelled") {
    return { allowed: false, httpStatus: 409, error: `This alert is already ${alert.status}.` };
  }
  const privileged = actor.role === "security" || actor.role === "admin";
  if (privileged) return { allowed: true };

  if (alert.status === "active" || !alert.assignedResponder) {
    return {
      allowed: false,
      httpStatus: 409,
      error: "Acknowledge the alert before resolving it.",
    };
  }
  if (alert.assignedResponder.uid !== actor.uid) {
    return {
      allowed: false,
      httpStatus: 403,
      error: `Only ${alert.assignedResponder.name}, campus security or an administrator can resolve this alert.`,
    };
  }
  return { allowed: true };
}

export function decideCancel(alert: SosAlert): TransitionDecision {
  if (alert.status === "resolved" || alert.status === "cancelled") {
    return { allowed: false, httpStatus: 409, error: `This alert is already ${alert.status}.` };
  }
  return { allowed: true };
}

export function makeEvent(
  type: SosEventType,
  at: IsoString,
  actor: { id: string; role: string; name: string },
  extra: { note?: string; location?: SosLocation | null } = {}
): SosTimelineEvent {
  const event: SosTimelineEvent = {
    type,
    at,
    actorId: actor.id,
    actorRole: actor.role,
    actorName: actor.name,
  };
  if (extra.note) event.note = extra.note;
  if (extra.location) event.location = { lat: extra.location.lat, lng: extra.location.lng };
  return event;
}

/** Fills defaults for alerts stored before location status, timestamps and audit trails existed. */
export function normaliseAlert(id: string, data: Partial<SosAlert>): SosAlert & { id: string } {
  const location = data.location ?? null;
  return {
    studentId: data.studentId ?? "",
    student: data.student ?? "UniAble student",
    source: data.source ?? "button",
    status: data.status ?? "active",
    createdAt: data.createdAt ?? "",
    acknowledgedBy: data.acknowledgedBy ?? null,
    resolvedAt: data.resolvedAt ?? null,
    notificationDelivery: data.notificationDelivery ?? { status: "pending" },
    ...data,
    id,
    location,
    locationStatus: data.locationStatus ?? (location ? "available" : "unavailable"),
    locationUpdatedAt: data.locationUpdatedAt ?? (location ? data.createdAt ?? null : null),
    acknowledgedAt:
      data.acknowledgedAt ?? (data.acknowledgedBy && data.status !== "active" ? data.updatedAt ?? null : null),
    assignedResponder: data.assignedResponder ?? null,
    timeline: data.timeline ?? [],
  };
}

/** What a responder sees: everything the operation needs, including who is handling the alert. */
export function toResponderView(id: string, data: Partial<SosAlert>) {
  return normaliseAlert(id, data);
}

/**
 * What the student sees about their own alerts. Responder user ids and internal
 * delivery error text are not exposed; the responder's name and role are, so the
 * student knows who is coming.
 */
export function toStudentView(id: string, data: Partial<SosAlert>) {
  const alert = normaliseAlert(id, data);
  const responder: Pick<SosResponder, "name" | "role"> | null = alert.assignedResponder
    ? { name: alert.assignedResponder.name, role: alert.assignedResponder.role }
    : null;
  const delivery = alert.notificationDelivery;

  return {
    id: alert.id,
    status: alert.status,
    source: alert.source,
    location: alert.location,
    locationStatus: alert.locationStatus,
    locationIssue: alert.locationIssue ?? null,
    locationUpdatedAt: alert.locationUpdatedAt,
    createdAt: alert.createdAt,
    acknowledgedAt: alert.acknowledgedAt ?? null,
    assignedResponder: responder,
    resolvedAt: alert.resolvedAt,
    resolution: alert.resolution ?? null,
    cancelledAt: alert.cancelledAt ?? null,
    cancelReason: alert.cancelReason ?? null,
    notificationDelivery: {
      status: delivery.status,
      sent: Number(delivery.sent ?? 0),
      failed: Number(delivery.failed ?? 0),
    },
    timeline: (alert.timeline ?? []).map((event) => ({
      type: event.type,
      at: event.at,
      actorRole: event.actorRole,
      actorName: event.actorRole === "student" ? "You" : event.actorName,
      ...(event.note ? { note: event.note } : {}),
    })),
  };
}

/** Open alerts first (active before acknowledged), then newest first. */
export function sortForResponders<T extends { status: string; createdAt: string }>(items: T[]): T[] {
  const rank = (status: string): number => (status === "active" ? 0 : status === "acknowledged" ? 1 : 2);
  return [...items].sort(
    (a, b) => rank(a.status) - rank(b.status) || String(b.createdAt).localeCompare(String(a.createdAt))
  );
}
