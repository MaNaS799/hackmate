// Dynamic Configuration for API & WebSockets
// Automatically uses environment variables, falls back to same-origin in production,
// and http://localhost:5000 in development.

const isProd = import.meta.env.PROD;
const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5000";

export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  (isProd ? `${origin}/api` : "http://localhost:5000/api");

export const SOCKET_SERVER_URL =
  import.meta.env.VITE_SOCKET_URL ||
  (isProd ? origin : "http://localhost:5000");
