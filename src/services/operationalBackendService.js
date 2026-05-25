import { backendEntityService } from "./backendEntityService";
import { BACKEND_SYNC_DEFAULT_URL } from "./backendSyncService";
import { dataService } from "./dataService";
import { repositories as repo } from "./repositories";

const ENTITY = {
  proyectos: "proyectos",
  servicios: "serviciosRecurrentes",
  billingExpectations: "serviceBillingExpectations",
  eventosServicio: "eventosServicio",
};

function appendSyncLog(entry) {
  repo.syncLog.append({
    id: dataService.id(),
    fecha: new Date().toISOString(),
    origen: "backend-local",
    ...entry,
  });
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
    if (!current || timestamp(item.updatedAt || item.updated_at || item.fecha) >= timestamp(current.updatedAt || current.updated_at || current.fecha)) {
      map.set(item.id, item);
    }
  }
  return Array.from(map.values());
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

async function mergeDomainBackup(payload) {
  const response = await fetch(`${BACKEND_SYNC_DEFAULT_URL}/api/domain-backup/merge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

export function syncProyectoToBackendQuiet(proyecto) {
  upsertEntity(ENTITY.proyectos, proyecto)
    .then(() => appendSyncLog({ tipo: "operational-save", entidad: "proyectos", estado: "ok", registros: 1, mensaje: `Proyecto sincronizado: ${proyecto.nombre || proyecto.id}` }))
    .catch((error) => appendSyncLog({ tipo: "operational-save", entidad: "proyectos", estado: "error", registros: 0, mensaje: error.message || "No se pudo sincronizar proyecto." }));
}

export function deleteProyectoFromBackendQuiet(id) {
  backendEntityService.remove(ENTITY.proyectos, id)
    .then(() => appendSyncLog({ tipo: "operational-delete", entidad: "proyectos", estado: "ok", registros: 1, mensaje: `Proyecto eliminado: ${id}` }))
    .catch((error) => appendSyncLog({ tipo: "operational-delete", entidad: "proyectos", estado: "error", registros: 0, mensaje: error.message || "No se pudo eliminar proyecto en backend." }));
}

export function syncServicioToBackendQuiet(servicio) {
  upsertEntity(ENTITY.servicios, servicio)
    .then(() => appendSyncLog({ tipo: "operational-save", entidad: "serviciosRecurrentes", estado: "ok", registros: 1, mensaje: `Servicio sincronizado: ${servicio.codigo || servicio.id}` }))
    .catch((error) => appendSyncLog({ tipo: "operational-save", entidad: "serviciosRecurrentes", estado: "error", registros: 0, mensaje: error.message || "No se pudo sincronizar servicio recurrente." }));
}

export function deleteServicioFromBackendQuiet(id) {
  backendEntityService.remove(ENTITY.servicios, id)
    .then(() => appendSyncLog({ tipo: "operational-delete", entidad: "serviciosRecurrentes", estado: "ok", registros: 1, mensaje: `Servicio eliminado: ${id}` }))
    .catch((error) => appendSyncLog({ tipo: "operational-delete", entidad: "serviciosRecurrentes", estado: "error", registros: 0, mensaje: error.message || "No se pudo eliminar servicio recurrente en backend." }));
}

export function syncEventoServicioToBackendQuiet(evento) {
  upsertEntity(ENTITY.eventosServicio, evento)
    .then(() => appendSyncLog({ tipo: "operational-save", entidad: "eventosServicio", estado: "ok", registros: 1, mensaje: `Evento de servicio sincronizado: ${evento.titulo || evento.id}` }))
    .catch((error) => appendSyncLog({ tipo: "operational-save", entidad: "eventosServicio", estado: "error", registros: 0, mensaje: error.message || "No se pudo sincronizar evento de servicio." }));
}

export function deleteEventoServicioFromBackendQuiet(id) {
  backendEntityService.remove(ENTITY.eventosServicio, id)
    .then(() => appendSyncLog({ tipo: "operational-delete", entidad: "eventosServicio", estado: "ok", registros: 1, mensaje: `Evento eliminado: ${id}` }))
    .catch((error) => appendSyncLog({ tipo: "operational-delete", entidad: "eventosServicio", estado: "error", registros: 0, mensaje: error.message || "No se pudo eliminar evento de servicio en backend." }));
}

export function syncBillingExpectationsToBackendQuiet(expectations = repo.serviceBillingExpectations.list()) {
  mergeDomainBackup({ serviceBillingExpectations: expectations })
    .then(() => appendSyncLog({ tipo: "operational-save", entidad: "serviceBillingExpectations", estado: "ok", registros: expectations.length, mensaje: "Facturación esperada sincronizada." }))
    .catch((error) => appendSyncLog({ tipo: "operational-save", entidad: "serviceBillingExpectations", estado: "error", registros: 0, mensaje: error.message || "No se pudo sincronizar facturación esperada." }));
}

export async function hydrateOperationalDataFromBackend({ proyectos = [], servicios = [], eventosServicio = [], billingExpectations = [] } = {}) {
  const [backendProyectos, backendServicios, backendEventos, backendExpectations] = await Promise.all([
    backendEntityService.list(ENTITY.proyectos),
    backendEntityService.list(ENTITY.servicios),
    backendEntityService.list(ENTITY.eventosServicio),
    backendEntityService.list(ENTITY.billingExpectations),
  ]);

  const hasBackendData = backendProyectos.length > 0 || backendServicios.length > 0 || backendEventos.length > 0 || backendExpectations.length > 0;
  const hasLocalData = proyectos.length > 0 || servicios.length > 0 || eventosServicio.length > 0 || billingExpectations.length > 0;

  if (!hasBackendData && hasLocalData) {
    await Promise.all([
      ...proyectos.map((proyecto) => upsertEntity(ENTITY.proyectos, proyecto)),
      ...servicios.map((servicio) => upsertEntity(ENTITY.servicios, servicio)),
      ...eventosServicio.map((evento) => upsertEntity(ENTITY.eventosServicio, evento)),
      mergeDomainBackup({ serviceBillingExpectations: billingExpectations }),
    ]);
    appendSyncLog({ tipo: "operational-bootstrap", entidad: "operacion", estado: "ok", registros: proyectos.length + servicios.length + eventosServicio.length + billingExpectations.length, mensaje: "Backend inicializado con operación local." });
    return { proyectos, servicios, eventosServicio, billingExpectations, source: "local-pushed" };
  }

  if (hasBackendData) {
    const nextProyectos = mergeByIdAndUpdatedAt(proyectos, backendProyectos);
    const nextServicios = mergeByIdAndUpdatedAt(servicios, backendServicios);
    const nextEventos = mergeByIdAndUpdatedAt(eventosServicio, backendEventos);
    const nextExpectations = mergeByIdAndUpdatedAt(billingExpectations, backendExpectations);

    repo.proyectos.replaceAll(nextProyectos);
    repo.serviciosRecurrentes.replaceAll(nextServicios);
    repo.eventosServicio.replaceAll(nextEventos);
    repo.serviceBillingExpectations.replaceAll(nextExpectations);

    await Promise.all([
      ...nextProyectos.map((proyecto) => upsertEntity(ENTITY.proyectos, proyecto)),
      ...nextServicios.map((servicio) => upsertEntity(ENTITY.servicios, servicio)),
      ...nextEventos.map((evento) => upsertEntity(ENTITY.eventosServicio, evento)),
      mergeDomainBackup({ serviceBillingExpectations: nextExpectations }),
    ]);

    appendSyncLog({ tipo: "operational-hydrate", entidad: "operacion", estado: "ok", registros: nextProyectos.length + nextServicios.length + nextEventos.length + nextExpectations.length, mensaje: "Operación cargada desde backend." });
    return { proyectos: nextProyectos, servicios: nextServicios, eventosServicio: nextEventos, billingExpectations: nextExpectations, source: "backend-merged" };
  }

  return { proyectos, servicios, eventosServicio, billingExpectations, source: "empty" };
}
