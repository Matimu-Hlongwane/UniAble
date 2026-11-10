import { ExternalLink } from "lucide-react";
import type { GeoPoint } from "../types/api";
import { directionsUrl, formatCoordinates, mapEmbedUrl } from "../utils/geo";

interface Props {
  /** The place the map is centred on and marked. */
  marker: GeoPoint;
  /** A second point (for example the responder) that the view is widened to include. */
  also?: GeoPoint | null;
  /** Accessible name for the map, e.g. "Reported location of Sam". */
  label: string;
  height?: number;
}

/**
 * An OpenStreetMap view with a text alternative. The map is a visual aid only: the coordinates and
 * the directions link below it carry the same information for screen-reader users and offline devices.
 */
export default function LocationMap({ marker, also = null, label, height = 240 }: Props) {
  return (
    <figure className="location-map">
      <iframe
        title={label}
        src={mapEmbedUrl(marker, also)}
        height={height}
        loading="lazy"
        referrerPolicy="no-referrer"
        sandbox="allow-scripts allow-same-origin"
      />
      <figcaption>
        <span>{formatCoordinates(marker)}</span>
        <a href={directionsUrl(marker)} target="_blank" rel="noopener noreferrer">
          Open directions <ExternalLink size={14} aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
}
