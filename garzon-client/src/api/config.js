// @ts-check
const configuredUrl = import.meta.env.VITE_API_URL?.trim();

if (import.meta.env.PROD && !configuredUrl) {
  throw new Error("VITE_API_URL must be configured for production builds.");
}

export const API_BASE_URL = (configuredUrl || "http://localhost:5000/api/v1").replace(/\/+$/, "");
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
