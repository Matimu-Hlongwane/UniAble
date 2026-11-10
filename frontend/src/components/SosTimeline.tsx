import { formatDateTime } from "../services/emergencyService";
import type { SosEventType, SosTimelineEvent } from "../types/api";

const LABEL: Record<SosEventType, string> = {
  created: "SOS sent",
  acknowledged: "Acknowledged",
  location_updated: "Location updated",
  resolved: "Resolved",
  false_alarm: "Closed as a false alarm",
  cancelled: "Cancelled",
};

const BY: Partial<Record<SosEventType, string>> = {
  acknowledged: "by",
  resolved: "by",
  false_alarm: "by",
  cancelled: "by",
};

/**
 * The audit trail of an alert, oldest first. Repeated location updates are collapsed to the latest
 * one so the lifecycle (sent, acknowledged, resolved or cancelled) stays easy to read.
 */
export default function SosTimeline({ events }: { events: SosTimelineEvent[] }) {
  const lastLocationIndex = events.map((event) => event.type).lastIndexOf("location_updated");
  const visible = events.filter((event, index) => event.type !== "location_updated" || index === lastLocationIndex);

  if (!visible.length) return null;
  return (
    <ol className="sos-timeline" aria-label="Emergency timeline">
      {visible.map((event, index) => (
        <li key={`${event.type}-${event.at}-${index}`}>
          <strong>{LABEL[event.type]}</strong>
          {event.actorName && BY[event.type] ? <span> {BY[event.type]} {event.actorName}</span> : null}
          <time dateTime={event.at}>{formatDateTime(event.at)}</time>
          {event.note ? <p className="muted">{event.note}</p> : null}
        </li>
      ))}
    </ol>
  );
}
