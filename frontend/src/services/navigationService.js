import { API_URL } from "./apiConfig.js";
import { getCurrentUser } from "./firebaseAuth.js";

async function navigationRequest(path) {
  const user = getCurrentUser();

  if (!user) {
    throw new Error("Please sign in to use campus navigation.");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_URL}/navigation${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  let data;

  try {
    data = await response.json();
  } catch {
    throw new Error("The navigation server returned an invalid response.");
  }

  if (!response.ok || data.success === false) {
    throw new Error(
      data.message ||
      data.error ||
      "Unable to complete the navigation request."
    );
  }

  return data;
}

export async function getNavigationLocations() {
  const data = await navigationRequest("/locations");

  if (!Array.isArray(data.locations)) {
    throw new Error("The server returned an invalid campus locations list.");
  }

  return data.locations;
}

export async function calculateNavigationRoute(start, destination) {
  if (!start || !destination) {
    throw new Error("Select both a starting point and a destination.");
  }

  const params = new URLSearchParams({
    start: String(start),
    destination: String(destination),
  });

  const data = await navigationRequest(`/route?${params.toString()}`);

  if (!Array.isArray(data.route) || !Array.isArray(data.connections)) {
    throw new Error("The server returned an invalid navigation route.");
  }

  return data;
}
