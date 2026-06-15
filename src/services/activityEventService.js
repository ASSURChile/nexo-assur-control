import { getSession } from "./authService.js";
import { restRequest } from "./supabaseAppClient.js";

const newId = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function createActivityEvent(entityType, entityId, action, payload = {}) {
  const session = getSession();
  if (!session?.companyId) throw new Error("No hay empresa activa para registrar actividad.");
  const rows = await restRequest("/activity_events?on_conflict=id", {
    method: "POST",
    body: [{
      id: payload.id || newId("activity"),
      company_id: session.companyId,
      actor_id: session.userId || null,
      entity_type: entityType,
      entity_id: entityId,
      action,
      summary: payload.summary || "",
      metadata: payload.metadata || payload,
    }],
  });
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function listActivityEvents(entityType, entityId, limit = 80) {
  const query = `/activity_events?entity_type=eq.${encodeURIComponent(entityType)}&entity_id=eq.${encodeURIComponent(entityId)}&select=*&order=created_at.desc&limit=${Number(limit) || 80}`;
  const rows = await restRequest(query);
  return Array.isArray(rows) ? rows : [];
}
