import { useSyncExternalStore } from "react";

// Tiny persisted store used by the mock back end. In production each store
// below is replaced by Firestore collections guarded by security rules and
// Cloud Functions (see firestore.rules and README). It syncs across browser
// tabs so you can demo e.g. a student SOS in one tab and the Security
// dashboard in another.
export function createStore(key, initial) {
  const listeners = new Set();
  let state = read();

  function read() {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch {
      return initial;
    }
  }
  function notify() {
    listeners.forEach((listener) => listener());
  }
  function get() {
    return state;
  }
  function set(updater) {
    state = typeof updater === "function" ? updater(state) : updater;
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage unavailable — state still lives in memory for this session.
    }
    notify();
  }
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function use() {
    return useSyncExternalStore(subscribe, get);
  }

  window.addEventListener("storage", (event) => {
    if (event.key === key) {
      state = read();
      notify();
    }
  });

  return { get, set, subscribe, use };
}
