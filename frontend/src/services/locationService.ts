import type { DeviceLocation, SosLocationIssue } from "../types/api";

/**
 * One GPS service shared by Campus Navigation, the SOS page, voice commands and the responder
 * navigator. They all read the same fix, so a student who has already granted permission and
 * has a position never waits for a second, separate GPS request when they press SOS.
 */

export type LocationIssue = Exclude<SosLocationIssue, "unknown">;
export type LocationPermission = "granted" | "denied" | "prompt" | "unknown";

export interface LocationFix extends DeviceLocation {
  /** When the device produced this position (ms since epoch). */
  timestamp: number;
}

export type LocationResult =
  | { ok: true; fix: LocationFix }
  | { ok: false; issue: LocationIssue };

export interface LocationState {
  status: "idle" | "locating" | "ready" | "error";
  fix: LocationFix | null;
  issue: LocationIssue | null;
}

const FRESH_FIX_MS = 20_000;
const DEFAULT_TIMEOUT_MS = 8_000;

let state: LocationState = { status: "idle", fix: null, issue: null };
const listeners = new Set<() => void>();
let watchId: number | null = null;
let watchers = 0;

function setState(next: LocationState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export const getLocationState = (): LocationState => state;

export function subscribeLocation(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const isSupported = (): boolean => typeof navigator !== "undefined" && "geolocation" in navigator;

function issueFromError(error: GeolocationPositionError): LocationIssue {
  if (error.code === error.PERMISSION_DENIED) return "denied";
  if (error.code === error.TIMEOUT) return "timeout";
  return "unavailable";
}

function toFix(position: GeolocationPosition): LocationFix {
  const accuracy = position.coords.accuracy;
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    ...(Number.isFinite(accuracy) ? { accuracyMeters: Math.round(accuracy) } : {}),
    timestamp: position.timestamp || Date.now(),
  };
}

function acceptFix(fix: LocationFix): void {
  setState({ status: "ready", fix, issue: null });
}

function recordIssue(issue: LocationIssue): void {
  // Keep the last good fix: a brief signal loss should not erase a known position.
  setState({ status: "error", fix: state.fix, issue });
}

export async function queryLocationPermission(): Promise<LocationPermission> {
  try {
    if (!navigator.permissions?.query) return "unknown";
    const result = await navigator.permissions.query({ name: "geolocation" });
    return result.state;
  } catch {
    return "unknown";
  }
}

export interface RequestOptions {
  /** Accept a cached fix younger than this many ms. Use 0 to force a fresh reading. */
  maxAgeMs?: number;
  timeoutMs?: number;
}

/**
 * Resolves with a position or the reason there is none. It never rejects and never hangs past
 * `timeoutMs`, so callers such as SOS can always carry on without GPS.
 */
export function requestLocation({
  maxAgeMs = FRESH_FIX_MS,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: RequestOptions = {}): Promise<LocationResult> {
  if (!isSupported()) {
    recordIssue("unsupported");
    return Promise.resolve({ ok: false, issue: "unsupported" });
  }

  const cached = state.fix;
  if (cached && maxAgeMs > 0 && Date.now() - cached.timestamp <= maxAgeMs) {
    return Promise.resolve({ ok: true, fix: cached });
  }

  if (state.status !== "ready") setState({ ...state, status: "locating" });

  return new Promise<LocationResult>((resolve) => {
    let settled = false;
    const finish = (result: LocationResult): void => {
      if (settled) return;
      settled = true;
      window.clearTimeout(guard);
      resolve(result);
    };
    // Backstop: some WebViews never call back when the permission prompt is ignored.
    const guard = window.setTimeout(() => {
      // A watch may have produced a usable fix while we waited.
      if (state.fix && Date.now() - state.fix.timestamp <= Math.max(maxAgeMs, FRESH_FIX_MS)) {
        finish({ ok: true, fix: state.fix });
      } else {
        recordIssue("timeout");
        finish({ ok: false, issue: "timeout" });
      }
    }, timeoutMs + 1500);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const fix = toFix(position);
        acceptFix(fix);
        finish({ ok: true, fix });
      },
      (error) => {
        const issue = issueFromError(error);
        recordIssue(issue);
        finish({ ok: false, issue });
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: maxAgeMs }
    );
  });
}

/**
 * Keeps the shared fix live while at least one screen needs it. Returns a release function;
 * the underlying watch stops when the last holder releases.
 */
export function acquireLocationWatch(): () => void {
  watchers += 1;
  if (watchers === 1 && isSupported()) {
    if (state.status !== "ready") setState({ ...state, status: "locating" });
    watchId = navigator.geolocation.watchPosition(
      (position) => acceptFix(toFix(position)),
      (error) => recordIssue(issueFromError(error)),
      { enableHighAccuracy: true, maximumAge: 5_000, timeout: 20_000 }
    );
  } else if (watchers === 1) {
    recordIssue("unsupported");
  }

  let released = false;
  return () => {
    if (released) return;
    released = true;
    watchers = Math.max(0, watchers - 1);
    if (watchers === 0 && watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  };
}

const ISSUE_TEXT: Record<LocationIssue, string> = {
  denied: "Location permission is turned off. Allow location access for UniAble in your device or browser settings.",
  unavailable: "Your device could not determine its position. Try moving near a window or outdoors.",
  timeout: "Finding your location took too long.",
  unsupported: "This device or browser does not support location.",
};

export const describeLocationIssue = (issue: LocationIssue | null): string =>
  issue ? ISSUE_TEXT[issue] : "";

/** Converts a fix to the payload the API expects. */
export const toDeviceLocation = (fix: LocationFix): DeviceLocation => ({
  lat: fix.lat,
  lng: fix.lng,
  ...(fix.accuracyMeters !== undefined ? { accuracyMeters: fix.accuracyMeters } : {}),
});
