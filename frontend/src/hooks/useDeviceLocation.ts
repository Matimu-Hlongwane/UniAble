import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  acquireLocationWatch,
  getLocationState,
  requestLocation,
  subscribeLocation,
  type LocationResult,
  type LocationState,
} from "../services/locationService";

interface Options {
  /** Keep the position live while the component is mounted. */
  watch?: boolean;
}

/** React view of the shared GPS service. */
export function useDeviceLocation({ watch = false }: Options = {}): LocationState & {
  refresh: () => Promise<LocationResult>;
} {
  const state = useSyncExternalStore(subscribeLocation, getLocationState, getLocationState);

  useEffect(() => (watch ? acquireLocationWatch() : undefined), [watch]);

  const refresh = useCallback(() => requestLocation({ maxAgeMs: 0 }), []);
  return { ...state, refresh };
}
