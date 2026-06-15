const QUEUE_KEY = "af_offline_queue";
const newId = (prefix) => globalThis.crypto?.randomUUID?.() || `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function readQueue() {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeQueue(items) {
  if (typeof localStorage === "undefined") return items;
  localStorage.setItem(QUEUE_KEY, JSON.stringify(items));
  return items;
}

export function enqueueOfflineAction(action) {
  const item = {
    id: action?.id || newId("offline"),
    status: "pending",
    createdAt: new Date().toISOString(),
    ...action,
  };
  writeQueue([...readQueue(), item]);
  return item;
}

export function listOfflineQueue() {
  return readQueue();
}

export function clearSyncedOfflineActions() {
  return writeQueue(readQueue().filter((item) => item.status !== "synced"));
}

export async function syncOfflineQueue(handler) {
  if (typeof handler !== "function") throw new Error("Falta handler de sincronización offline.");
  const next = [];
  const results = [];
  for (const item of readQueue()) {
    if (item.status === "synced") {
      next.push(item);
      continue;
    }
    try {
      const result = await handler(item);
      const synced = { ...item, status: "synced", syncedAt: new Date().toISOString() };
      next.push(synced);
      results.push({ item: synced, result });
    } catch (error) {
      const failed = { ...item, status: "error", error: error.message || "No se pudo sincronizar.", lastAttemptAt: new Date().toISOString() };
      next.push(failed);
      results.push({ item: failed, error });
    }
  }
  writeQueue(next);
  return results;
}
