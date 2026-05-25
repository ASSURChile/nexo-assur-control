import { dataService } from "./dataService";
import { repositories as repo } from "./repositories";
import { buildBackupPayload, restoreBackupPayload } from "./backupService";

export const BACKEND_SYNC_DEFAULT_URL =
  import.meta.env.VITE_ASSUR_BACKEND_URL || "http://127.0.0.1:8787";

function normalizeBaseUrl(baseUrl = BACKEND_SYNC_DEFAULT_URL) {
  return String(baseUrl || BACKEND_SYNC_DEFAULT_URL).replace(/\/+$/, "");
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${normalizeBaseUrl(baseUrl)}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

export async function checkBackendHealth(baseUrl) {
  return request(baseUrl, "/health");
}

export async function pushLocalSnapshotToBackend({ baseUrl = BACKEND_SYNC_DEFAULT_URL } = {}) {
  const snapshot = buildBackupPayload();
  const result = await request(baseUrl, "/api/domain-backup/merge", {
    method: "POST",
    body: JSON.stringify(snapshot),
  });
  repo.syncLog.append({
    id: dataService.id(),
    tipo: "backend-push",
    fecha: new Date().toISOString(),
    estado: "ok",
    registros: Object.keys(snapshot).length,
    mensaje: "Snapshot local enviado al backend.",
  });
  return result;
}

export async function pullBackendSnapshot({ baseUrl = BACKEND_SYNC_DEFAULT_URL } = {}) {
  const snapshot = await request(baseUrl, "/api/domain-backup?safe=false");
  restoreBackupPayload(snapshot);
  const restored = Object.keys(snapshot).filter((key) => !["exportedAt", "version"].includes(key)).length;
  repo.syncLog.append({
    id: dataService.id(),
    tipo: "backend-pull",
    fecha: new Date().toISOString(),
    estado: "ok",
    registros: restored,
    mensaje: "Snapshot restaurado desde backend local.",
  });
  return { restored, keys: Object.keys(snapshot).length };
}
