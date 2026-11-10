import { api } from "./api";
import { describeLocationIssue, requestLocation, toDeviceLocation } from "./locationService";
import type { CreateSosResponse, StudentSosAlert } from "../types/api";
import { formatAccuracy } from "../utils/geo";

/**
 * Student-side SOS actions shared by the Emergency page and the voice assistant, so a spoken
 * command and a button press follow exactly the same rules.
 */

export const SOS_CHANGED_EVENT = "uniable-sos-changed";

/** Tells any mounted screen (the Emergency page) to reload the student's SOS state. */
export const announceSosChange = (): void => {
  window.dispatchEvent(new CustomEvent(SOS_CHANGED_EVENT));
};

export interface SendSosOutcome {
  response: CreateSosResponse;
  /** True when GPS was attached; false when the SOS went out without it. */
  hadLocation: boolean;
  locationProblem: string;
}

/**
 * Sends an SOS with the best available position. GPS never blocks the alert: if the position is
 * unavailable, denied or slow, the SOS is sent without it and the reason is recorded.
 */
export async function sendSos(source: string): Promise<SendSosOutcome> {
  const located = await requestLocation({ maxAgeMs: 0, timeoutMs: 20_000 });

  const response = await api.createSOS(
    located.ok
      ? { source, location: toDeviceLocation(located.fix) }
      : { source, location: null, locationIssue: located.issue }
  );
  announceSosChange();

  return {
    response,
    hadLocation: located.ok,
    locationProblem: located.ok ? "" : describeLocationIssue(located.issue),
  };
}

/** The student's current open alert, or null. */
export async function getOpenSos(): Promise<StudentSosAlert | null> {
  return (await api.getMySOS()).openAlert;
}

export async function cancelSos(id: string, reason = ""): Promise<StudentSosAlert> {
  const { alert } = await api.cancelSOS(id, reason);
  announceSosChange();
  return alert;
}

export type RefreshOutcome =
  | { ok: true; alert: StudentSosAlert }
  | { ok: false; reason: string };

/** Re-reads GPS and sends it to responders. Also used to add a location to an SOS sent without one. */
export async function refreshSosLocation(id: string): Promise<RefreshOutcome> {
  const located = await requestLocation({ maxAgeMs: 0, timeoutMs: 20_000 });
  if (!located.ok) return { ok: false, reason: describeLocationIssue(located.issue) };
  const { alert } = await api.updateSOSLocation(id, toDeviceLocation(located.fix));
  announceSosChange();
  return { ok: true, alert };
}

// ---------------------------------------------------------------------------
// Wording shared by the screen and the voice assistant
// ---------------------------------------------------------------------------

export const formatTime = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "Not recorded";
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : date.toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export const isOpen = (alert: Pick<StudentSosAlert, "status">): boolean =>
  alert.status === "active" || alert.status === "acknowledged";

const ROLE_LABEL: Record<string, string> = {
  security: "campus security officer",
  volunteer: "volunteer",
  admin: "administrator",
};

export const responderLabel = (alert: Pick<StudentSosAlert, "assignedResponder">): string => {
  const responder = alert.assignedResponder;
  return responder ? `${responder.name} (${ROLE_LABEL[responder.role] ?? responder.role})` : "";
};

export function statusHeadline(alert: Pick<StudentSosAlert, "status" | "resolution">): string {
  switch (alert.status) {
    case "active":
      return "SOS sent. Waiting for a responder";
    case "acknowledged":
      return "A responder is on the way";
    case "cancelled":
      return "SOS cancelled";
    case "resolved":
      return alert.resolution === "false_alarm" ? "Closed as a false alarm" : "SOS resolved";
  }
}

export function locationSummary(alert: Pick<StudentSosAlert, "location" | "locationStatus" | "locationUpdatedAt">): string {
  if (alert.locationStatus !== "available" || !alert.location) {
    return "No GPS location is attached to this SOS.";
  }
  const updated = formatTime(alert.locationUpdatedAt);
  return `Location shared, ${formatAccuracy(alert.location.accuracyMeters)}${updated ? `, last updated ${updated}` : ""}.`;
}

/** A complete, speakable status for the voice assistant. */
export function speakableStatus(alert: StudentSosAlert): string {
  const sent = formatTime(alert.createdAt);
  const parts: string[] = [];

  switch (alert.status) {
    case "active":
      parts.push(`Your SOS was sent at ${sent}. No responder has acknowledged it yet.`);
      break;
    case "acknowledged":
      parts.push(
        `Your SOS was sent at ${sent}. ${responderLabel(alert) || "A responder"} acknowledged it at ${formatTime(alert.acknowledgedAt)} and is responding.`
      );
      break;
    case "resolved":
      parts.push(
        alert.resolution === "false_alarm"
          ? `Your last SOS was closed as a false alarm at ${formatTime(alert.resolvedAt)}.`
          : `Your last SOS was resolved at ${formatTime(alert.resolvedAt)}.`
      );
      break;
    case "cancelled":
      parts.push(`Your last SOS was cancelled at ${formatTime(alert.cancelledAt)}. It is kept on record.`);
      break;
  }
  if (isOpen(alert)) parts.push(locationSummary(alert));
  return parts.join(" ");
}

