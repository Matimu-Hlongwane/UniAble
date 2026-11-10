import type { GeoPoint } from "../types/api";

const EARTH_RADIUS_M = 6_371_000;
const toRad = (degrees: number): number => (degrees * Math.PI) / 180;
const toDeg = (radians: number): number => (radians * 180) / Math.PI;

/** Great-circle distance between two points, in metres. */
export function distanceMeters(from: GeoPoint, to: GeoPoint): number {
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Initial compass bearing from one point to another, 0-360 degrees clockwise from north. */
export function bearingDegrees(from: GeoPoint, to: GeoPoint): number {
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(toRad(to.lat));
  const x =
    Math.cos(toRad(from.lat)) * Math.sin(toRad(to.lat)) -
    Math.sin(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

const COMPASS = ["north", "north-east", "east", "south-east", "south", "south-west", "west", "north-west"];

export const compassDirection = (bearing: number): string =>
  COMPASS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8] ?? "north";

/** "85 m" under a kilometre, "1.4 km" above. Spoken-friendly and screen-reader-friendly. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "unknown distance";
  if (meters < 1000) return `${Math.max(1, Math.round(meters / 5) * 5)} m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)} km`;
}

export const formatAccuracy = (meters: number | undefined): string =>
  meters === undefined ? "accuracy unknown" : `accurate to about ${Math.max(1, Math.round(meters))} m`;

export const formatCoordinates = (point: GeoPoint): string =>
  `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`;

/** Walking directions in the device's maps app or the browser. Origin defaults to the device position. */
export function directionsUrl(destination: GeoPoint): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=walking`;
}

export function openStreetMapDirectionsUrl(destination: GeoPoint, origin?: GeoPoint): string {
  const route = origin
    ? `${origin.lat}%2C${origin.lng}%3B${destination.lat}%2C${destination.lng}`
    : `%3B${destination.lat}%2C${destination.lng}`;
  return `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${route}`;
}

/**
 * OpenStreetMap embed URL centred on `marker`. When a second point is given, the view is widened
 * to include both. The embed needs no API key and no extra package.
 */
export function mapEmbedUrl(marker: GeoPoint, also?: GeoPoint | null): string {
  const points = also ? [marker, also] : [marker];
  const pad = 0.0025;
  const minLat = Math.min(...points.map((p) => p.lat)) - pad;
  const maxLat = Math.max(...points.map((p) => p.lat)) + pad;
  const minLng = Math.min(...points.map((p) => p.lng)) - pad;
  const maxLng = Math.max(...points.map((p) => p.lng)) + pad;
  const bbox = [minLng, minLat, maxLng, maxLat].map((value) => value.toFixed(6)).join("%2C");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker.lat}%2C${marker.lng}`;
}
