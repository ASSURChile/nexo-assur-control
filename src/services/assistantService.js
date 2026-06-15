import { getSessionAccessToken } from "./authService.js";

const env = import.meta.env || {};
const ASSISTANT_API_URL = (env.VITE_ASSISTANT_API_URL || "").replace(/\/+$/, "");

export function isAssistantConfigured() {
  return Boolean(ASSISTANT_API_URL);
}

export async function askAssistant({ message, threadId } = {}) {
  if (!ASSISTANT_API_URL) {
    throw new Error("El asistente NEXO aun no tiene configurada su URL de Worker.");
  }
  const accessToken = getSessionAccessToken();
  if (!accessToken) throw new Error("Necesitas una sesion activa para consultar el asistente.");

  const response = await fetch(`${ASSISTANT_API_URL}/api/assistant/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ message, threadId }),
  });
  const text = await response.text().catch(() => "");
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const error = new Error(data?.error || response.statusText || "No se pudo consultar el asistente.");
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}
