import { getCurrentUser } from "./firebaseAuth";
import { API_URL } from "./apiConfig";

async function request(path, options = {}, requiresAuth = true) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (requiresAuth) {
    const user = getCurrentUser();

    if (!user) {
      throw new Error(
        "Please sign in before accessing this UniAble feature."
      );
    }

    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const error = new Error(
        data.error ||
          data.message ||
          data.detail ||
          `Request failed (${response.status})`
      );
      error.status = response.status;
      throw error;
    }

    return data;
  } catch (error) {
    console.error(
      `UniAble API request failed (${API_URL}${path}): ${
        error.status ? `HTTP ${error.status} - ` : ""
      }${error.message || "Network error"}`
    );

    if (error.name === "AbortError") {
      throw new Error(
        "The UniAble API did not respond within 15 seconds. Check your network and backend server."
      );
    }

    if (error.status) {
      throw error;
    }

    throw new Error(
      `Cannot connect to the UniAble API at ${API_URL}. Check your network connection and backend server.`
    );
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  getDashboard: () => request("/dashboard"),

  getRequests: () => request("/peer/requests"),

  createRequest: (payload) =>
    request("/peer/requests", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

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

  updateSOS: (id, status) =>
    request(`/emergency/sos/${id}`, {
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

  createAcademicModule: (payload) =>
    request("/academics/modules", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  updateAcademicModule: (id, payload) =>
    request(`/academics/modules/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),

  getAcademicTimetable: () => request("/academics/timetable"),

  createAcademicTimetable: (payload) =>
    request("/academics/timetable", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getAcademicMaterials: () => request("/academics/materials"),

  createAcademicMaterial: (payload) =>
    request("/academics/materials", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  publishAcademicMaterial: (id, published) =>
    request(
      `/academics/materials/${encodeURIComponent(id)}/publish`,
      {
        method: "PATCH",
        body: JSON.stringify({ published }),
      }
    ),

  getAcademicAttendance: () => request("/academics/attendance"),

  recordAcademicAttendance: (payload) =>
    request("/academics/attendance", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getUniPalCapabilities: () =>
    request("/unipal/capabilities", {}, false),
};