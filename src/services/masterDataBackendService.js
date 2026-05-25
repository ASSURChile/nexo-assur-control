import { backendEntityService } from "./backendEntityService";
import { dataService } from "./dataService";
import { repositories as repo } from "./repositories";

const ENTITY = {
  clientes: "clientes",
  instalaciones: "instalaciones",
};

function appendSyncLog(entry) {
  repo.syncLog.append({
    id: dataService.id(),
    fecha: new Date().toISOString(),
    origen: "backend-local",
    ...entry,
  });
}

async function upsertEntity(entity, item) {
  if (!item?.id) throw new Error(`No se puede sincronizar ${entity} sin id.`);
  try {
    return await backendEntityService.update(entity, item.id, item);
  } catch (error) {
    if (!String(error.message || "").includes("Registro no encontrado")) throw error;
    return backendEntityService.create(entity, item);
  }
}

function timestamp(value) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function mergeByIdAndUpdatedAt(localItems = [], backendItems = []) {
  const map = new Map();
  for (const item of localItems) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of backendItems) {
    if (!item?.id) continue;
    const current = map.get(item.id);
    if (!current || timestamp(item.updatedAt || item.updated_at) >= timestamp(current.updatedAt || current.updated_at)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
}

export async function syncClienteToBackend(cliente) {
  const saved = await upsertEntity(ENTITY.clientes, cliente);
  appendSyncLog({ tipo: "masterdata-save", entidad: "clientes", estado: "ok", registros: 1, mensaje: `Cliente sincronizado: ${cliente.razonSocial || cliente.id}` });
  return saved;
}

export async function syncInstalacionToBackend(instalacion) {
  const saved = await upsertEntity(ENTITY.instalaciones, instalacion);
  appendSyncLog({ tipo: "masterdata-save", entidad: "instalaciones", estado: "ok", registros: 1, mensaje: `Instalación sincronizada: ${instalacion.nombre || instalacion.id}` });
  return saved;
}

export async function deleteClienteFromBackend(id) {
  await backendEntityService.remove(ENTITY.clientes, id);
  appendSyncLog({ tipo: "masterdata-delete", entidad: "clientes", estado: "ok", registros: 1, mensaje: `Cliente eliminado: ${id}` });
}

export async function deleteInstalacionFromBackend(id) {
  await backendEntityService.remove(ENTITY.instalaciones, id);
  appendSyncLog({ tipo: "masterdata-delete", entidad: "instalaciones", estado: "ok", registros: 1, mensaje: `Instalación eliminada: ${id}` });
}

export function syncClienteToBackendQuiet(cliente) {
  syncClienteToBackend(cliente).catch((error) => appendSyncLog({ tipo: "masterdata-save", entidad: "clientes", estado: "error", registros: 0, mensaje: error.message || "No se pudo sincronizar cliente." }));
}

export function syncInstalacionToBackendQuiet(instalacion) {
  syncInstalacionToBackend(instalacion).catch((error) => appendSyncLog({ tipo: "masterdata-save", entidad: "instalaciones", estado: "error", registros: 0, mensaje: error.message || "No se pudo sincronizar instalación." }));
}

export function deleteClienteFromBackendQuiet(id) {
  deleteClienteFromBackend(id).catch((error) => appendSyncLog({ tipo: "masterdata-delete", entidad: "clientes", estado: "error", registros: 0, mensaje: error.message || "No se pudo eliminar cliente en backend." }));
}

export function deleteInstalacionFromBackendQuiet(id) {
  deleteInstalacionFromBackend(id).catch((error) => appendSyncLog({ tipo: "masterdata-delete", entidad: "instalaciones", estado: "error", registros: 0, mensaje: error.message || "No se pudo eliminar instalación en backend." }));
}

export async function hydrateMasterDataFromBackend({ clientes = [], instalaciones = [] } = {}) {
  const [backendClientes, backendInstalaciones] = await Promise.all([
    backendEntityService.list(ENTITY.clientes),
    backendEntityService.list(ENTITY.instalaciones),
  ]);

  const hasBackendData = backendClientes.length > 0 || backendInstalaciones.length > 0;
  const hasLocalData = clientes.length > 0 || instalaciones.length > 0;

  if (!hasBackendData && hasLocalData) {
    await Promise.all([
      ...clientes.map((cliente) => upsertEntity(ENTITY.clientes, cliente)),
      ...instalaciones.map((instalacion) => upsertEntity(ENTITY.instalaciones, instalacion)),
    ]);
    appendSyncLog({ tipo: "masterdata-bootstrap", entidad: "clientes+instalaciones", estado: "ok", registros: clientes.length + instalaciones.length, mensaje: "Backend inicializado con cartera local." });
    return { clientes, instalaciones, source: "local-pushed" };
  }

  if (hasBackendData) {
    const nextClientes = mergeByIdAndUpdatedAt(clientes, backendClientes);
    const nextInstalaciones = mergeByIdAndUpdatedAt(instalaciones, backendInstalaciones);
    repo.clientes.replaceAll(nextClientes);
    repo.instalaciones.replaceAll(nextInstalaciones);
    await Promise.all([
      ...nextClientes.map((cliente) => upsertEntity(ENTITY.clientes, cliente)),
      ...nextInstalaciones.map((instalacion) => upsertEntity(ENTITY.instalaciones, instalacion)),
    ]);
    appendSyncLog({ tipo: "masterdata-hydrate", entidad: "clientes+instalaciones", estado: "ok", registros: nextClientes.length + nextInstalaciones.length, mensaje: "Cartera cargada desde backend." });
    return { clientes: nextClientes, instalaciones: nextInstalaciones, source: "backend-merged" };
  }

  return { clientes, instalaciones, source: "empty" };
}
