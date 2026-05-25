import { BACKEND_SYNC_DEFAULT_URL } from "./backendSyncService";

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

export function createBackendEntityService({ baseUrl = BACKEND_SYNC_DEFAULT_URL } = {}) {
  return {
    collections() {
      return request(baseUrl, "/api/collections");
    },
    list(entity) {
      return request(baseUrl, `/api/entities/${encodeURIComponent(entity)}`);
    },
    get(entity, id) {
      return request(baseUrl, `/api/entities/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`);
    },
    create(entity, item) {
      return request(baseUrl, `/api/entities/${encodeURIComponent(entity)}`, {
        method: "POST",
        body: JSON.stringify(item),
      });
    },
    replace(entity, id, item) {
      return request(baseUrl, `/api/entities/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: JSON.stringify(item),
      });
    },
    update(entity, id, patch) {
      return request(baseUrl, `/api/entities/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      });
    },
    remove(entity, id) {
      return request(baseUrl, `/api/entities/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
    },
  };
}

export const backendEntityService = createBackendEntityService();
