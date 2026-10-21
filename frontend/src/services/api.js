import { Capacitor } from "@capacitor/core";

// VITE_API_URL can override this for a deployed HTTPS API or a physical device.
// In the Android emulator, 10.0.2.2 points back to the development computer.
// "localhost" inside the emulator points to the emulator itself, not the computer.
const DEFAULT_API_URL =
  Capacitor.getPlatform() === "android"
    ? "http://10.0.2.2:4000/api"
    : "http://localhost:4000/api";

const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
      ...options,
    });
  } catch (error) {
    console.error(`UniAble API request failed (${API_URL}${path})`, error);
    throw new Error(
      `Cannot connect to the UniAble server at ${API_URL}. Start the backend on port 4000 and make sure the emulator can reach your computer.`
    );
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.detail || `Request failed (${response.status})`);
  return data;
}

export const api = {
  getRequests: () => request("/peer/requests"),
  createRequest: (payload) => request("/peer/requests", { method: "POST", body: JSON.stringify(payload) }),
  updateRequest: (id, status) => request(`/peer/requests/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  getVolunteers: () => request("/peer/volunteers"),
  setAvailability: (id, available) => request(`/peer/volunteers/${id}/availability`, { method: "PATCH", body: JSON.stringify({ available }) }),
  createSOS: (payload) => request("/emergency/sos", { method: "POST", body: JSON.stringify(payload) }),
  getAccessibilityProfile: (studentId) => request(`/accessibility/${studentId}`),
  saveAccessibilityProfile: (studentId, profile) => request(`/accessibility/${studentId}`, { method: "PUT", body: JSON.stringify(profile) }),
  chatWithUniPal: (payload) => request("/unipal/chat", { method: "POST", body: JSON.stringify(payload) }),
  getUniPalCapabilities: () => request("/unipal/capabilities"),
};
