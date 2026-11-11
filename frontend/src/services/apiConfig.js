import { Capacitor } from "@capacitor/core";

const trimTrailingSlashes = (value) => String(value || "").trim().replace(/\/+$/, "");

const configuredApiUrl = trimTrailingSlashes(import.meta.env.VITE_API_URL);
const configuredApiBaseUrl = trimTrailingSlashes(
  import.meta.env.VITE_API_BASE_URL
).replace(/\/api$/i, "");

const defaultApiBaseUrl =
  Capacitor.getPlatform() === "android"
    ? "http://10.0.2.2:4000"
    : "http://localhost:4000";

export const API_BASE_URL = configuredApiUrl
  ? configuredApiUrl.replace(/\/api$/i, "")
  : configuredApiBaseUrl || defaultApiBaseUrl;

export const API_URL =
  configuredApiUrl || `${API_BASE_URL}/api`;
