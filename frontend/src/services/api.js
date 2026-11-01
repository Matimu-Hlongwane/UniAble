import { Capacitor } from "@capacitor/core";
import { getCurrentUser } from "./firebaseAuth";

// Android emulator uses 10.0.2.2 to reach the development computer.
const DEFAULT_API_URL =
  Capacitor.getPlatform() === "android"
    ? "http://10.0.2.2:4000/api"
    : "http://localhost:4000/api";

const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/$/, "");

async function request(path, options = {}, requiresAuth = true) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (requiresAuth) {
    const user = getCurrentUser();

    if (!user) {
      throw new Error("Please sign in before accessing this UniAble feature.");
    }

    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error(`UniAble API request failed (${API_URL}${path})`, error);
    throw new Error(
      `Cannot connect to the UniAble server at ${API_URL}. Start the backend on port 4000 and make sure the emulator can reach your computer.`
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.error || data.message || data.detail || `Request failed (${response.status})`
    );
  }

  return data;
}

export const api = {
  getDashboard: () => request('/dashboard'),
  getRequests: () => request("/peer/requests"),
  createRequest: (payload) =>
    request("/peer/requests", { method: "POST", body: JSON.stringify(payload) }),
  updateRequest: (id, status) =>
    request(`/peer/requests/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }),
  getVolunteers: () => request("/peer/volunteers"),
  registerVolunteer: (payload) =>
    request("/peer/volunteers/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  setAvailability: (id, available) =>
    request(`/peer/volunteers/${id}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ available }),
    }),
  getSOS: () => request("/emergency/sos"),
  updateSOS: (id, status) => request(`/emergency/sos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  }),
  createSOS: (payload) =>
    request("/emergency/sos", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAccessibilityProfile: (studentId) =>
    request(`/accessibility/${encodeURIComponent(studentId)}`),
  saveAccessibilityProfile: (studentId, profile) =>
    request(`/accessibility/${encodeURIComponent(studentId)}`, {
      method: "PUT",
      body: JSON.stringify(profile),
    }),
  chatWithUniPal: (payload) =>
    request("/unipal/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAcademicModules: () => request("/academics/modules"),
createAcademicModule: (payload) => request("/academics/modules", { method: "POST", body: JSON.stringify(payload) }),
updateAcademicModule: (id, payload) => request(`/academics/modules/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),

getAcademicTimetable: () => request("/academics/timetable"),
createAcademicTimetable: (payload) => request("/academics/timetable", { method: "POST", body: JSON.stringify(payload) }),

getAcademicMaterials: () => request("/academics/materials"),
createAcademicMaterial: (payload) => request("/academics/materials", { method: "POST", body: JSON.stringify(payload) }),
publishAcademicMaterial: (id, published) => request(`/academics/materials/${encodeURIComponent(id)}/publish`, { method: "PATCH", body: JSON.stringify({ published }) }),

getAcademicAttendance: () => request("/academics/attendance"),
recordAcademicAttendance: (payload) => request("/academics/attendance", { method: "POST", body: JSON.stringify(payload) }),
getUniPalCapabilities: () => request("/unipal/capabilities", {}, false),
};
