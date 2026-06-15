import { isSupabaseConfigured, restRequest } from "./supabaseAppClient.js";
import { getSession } from "./authService.js";

const newId = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export async function getSystemHealth() {
  const checks = {
    supabaseConfigured: isSupabaseConfigured(),
    syncLogs: null,
    recentErrors: null,
  };
  if (!checks.supabaseConfigured) return checks;
  try {
    checks.syncLogs = await restRequest("/sync_logs?select=source,entity,status,created_at&order=created_at.desc&limit=10");
  } catch (error) {
    checks.syncLogs = { error: error.message };
  }
  try {
    checks.recentErrors = await restRequest("/error_logs?select=source,severity,message,created_at&order=created_at.desc&limit=10");
  } catch (error) {
    checks.recentErrors = { error: error.message };
  }
  return checks;
}

export async function logFrontendError(error, metadata = {}) {
  try {
    if (!isSupabaseConfigured()) return null;
    const session = getSession();
    const companyId = metadata.companyId || session?.companyId;
    if (!companyId) return null;
    await restRequest("/error_logs?on_conflict=id", {
      method: "POST",
      body: [{
        id: newId("error"),
        company_id: companyId,
        profile_id: metadata.profileId || session?.userId || session?.authUserId || null,
        source: "frontend",
        severity: metadata.severity || "error",
        message: error?.message || String(error || "Error desconocido"),
        stack: error?.stack || "",
        metadata,
      }],
    });
  } catch {
    // El logging nunca debe romper la experiencia principal.
  }
}
