import { backendEntityService } from "./backendEntityService";
import { dataService } from "./dataService";
import { repositories as repo } from "./repositories";

const ENTITY = {
  facturas: "facturas",
  pagos: "pagos",
  cuentasPagar: "cuentasPagar",
  gastos: "gastos",
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
    const remoteTime = timestamp(item.updatedAt || item.updated_at || item.fechaEmision || item.fecha);
    const localTime = timestamp(current?.updatedAt || current?.updated_at || current?.fechaEmision || current?.fecha);
    if (!current || remoteTime >= localTime) map.set(item.id, item);
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

function syncQuiet(entity, item, label) {
  upsertEntity(entity, item)
    .then(() => appendSyncLog({ tipo: "financial-save", entidad: entity, estado: "ok", registros: 1, mensaje: `${label} sincronizado.` }))
    .catch((error) => appendSyncLog({ tipo: "financial-save", entidad: entity, estado: "error", registros: 0, mensaje: error.message || `No se pudo sincronizar ${label}.` }));
}

function deleteQuiet(entity, id, label) {
  backendEntityService.remove(entity, id)
    .then(() => appendSyncLog({ tipo: "financial-delete", entidad: entity, estado: "ok", registros: 1, mensaje: `${label} eliminado: ${id}` }))
    .catch((error) => appendSyncLog({ tipo: "financial-delete", entidad: entity, estado: "error", registros: 0, mensaje: error.message || `No se pudo eliminar ${label}.` }));
}

function syncCollectionQuiet(entity, rows, label) {
  Promise.all(rows.map((row) => upsertEntity(entity, row)))
    .then(() => appendSyncLog({ tipo: "financial-bulk-save", entidad: entity, estado: "ok", registros: rows.length, mensaje: `${label} sincronizados.` }))
    .catch((error) => appendSyncLog({ tipo: "financial-bulk-save", entidad: entity, estado: "error", registros: 0, mensaje: error.message || `No se pudo sincronizar ${label}.` }));
}

export const syncFacturaToBackendQuiet = (factura) => syncQuiet(ENTITY.facturas, factura, "Factura");
export const syncPagoToBackendQuiet = (pago) => syncQuiet(ENTITY.pagos, pago, "Pago");
export const syncCuentaPagarToBackendQuiet = (cuenta) => syncQuiet(ENTITY.cuentasPagar, cuenta, "Cuenta por pagar");
export const syncGastoToBackendQuiet = (gasto) => syncQuiet(ENTITY.gastos, gasto, "Gasto");

export const deleteFacturaFromBackendQuiet = (id) => deleteQuiet(ENTITY.facturas, id, "Factura");
export const deletePagoFromBackendQuiet = (id) => deleteQuiet(ENTITY.pagos, id, "Pago");
export const deleteCuentaPagarFromBackendQuiet = (id) => deleteQuiet(ENTITY.cuentasPagar, id, "Cuenta por pagar");
export const deleteGastoFromBackendQuiet = (id) => deleteQuiet(ENTITY.gastos, id, "Gasto");

export const syncFacturasToBackendQuiet = (rows) => syncCollectionQuiet(ENTITY.facturas, rows, "Facturas");
export const syncPagosToBackendQuiet = (rows) => syncCollectionQuiet(ENTITY.pagos, rows, "Pagos");
export const syncCuentasPagarToBackendQuiet = (rows) => syncCollectionQuiet(ENTITY.cuentasPagar, rows, "Cuentas por pagar");
export const syncGastosToBackendQuiet = (rows) => syncCollectionQuiet(ENTITY.gastos, rows, "Gastos");

export async function hydrateFinancialDataFromBackend({ facturas = [], pagos = [], cuentasPagar = [], gastos = [] } = {}) {
  const [backendFacturas, backendPagos, backendCuentas, backendGastos] = await Promise.all([
    backendEntityService.list(ENTITY.facturas),
    backendEntityService.list(ENTITY.pagos),
    backendEntityService.list(ENTITY.cuentasPagar),
    backendEntityService.list(ENTITY.gastos),
  ]);

  const hasBackendData = backendFacturas.length > 0 || backendPagos.length > 0 || backendCuentas.length > 0 || backendGastos.length > 0;
  const hasLocalData = facturas.length > 0 || pagos.length > 0 || cuentasPagar.length > 0 || gastos.length > 0;

  if (!hasBackendData && hasLocalData) {
    await Promise.all([
      ...facturas.map((row) => upsertEntity(ENTITY.facturas, row)),
      ...pagos.map((row) => upsertEntity(ENTITY.pagos, row)),
      ...cuentasPagar.map((row) => upsertEntity(ENTITY.cuentasPagar, row)),
      ...gastos.map((row) => upsertEntity(ENTITY.gastos, row)),
    ]);
    appendSyncLog({ tipo: "financial-bootstrap", entidad: "finanzas", estado: "ok", registros: facturas.length + pagos.length + cuentasPagar.length + gastos.length, mensaje: "Backend inicializado con finanzas locales." });
    return { facturas, pagos, cuentasPagar, gastos, source: "local-pushed" };
  }

  if (hasBackendData) {
    const nextFacturas = mergeByIdAndUpdatedAt(facturas, backendFacturas);
    const nextPagos = mergeByIdAndUpdatedAt(pagos, backendPagos);
    const nextCuentas = mergeByIdAndUpdatedAt(cuentasPagar, backendCuentas);
    const nextGastos = mergeByIdAndUpdatedAt(gastos, backendGastos);

    repo.facturas.replaceAll(nextFacturas);
    repo.pagos.replaceAll(nextPagos);
    repo.cuentasPagar.replaceAll(nextCuentas);
    repo.gastos.replaceAll(nextGastos);

    await Promise.all([
      ...nextFacturas.map((row) => upsertEntity(ENTITY.facturas, row)),
      ...nextPagos.map((row) => upsertEntity(ENTITY.pagos, row)),
      ...nextCuentas.map((row) => upsertEntity(ENTITY.cuentasPagar, row)),
      ...nextGastos.map((row) => upsertEntity(ENTITY.gastos, row)),
    ]);

    appendSyncLog({ tipo: "financial-hydrate", entidad: "finanzas", estado: "ok", registros: nextFacturas.length + nextPagos.length + nextCuentas.length + nextGastos.length, mensaje: "Finanzas cargadas desde backend." });
    return { facturas: nextFacturas, pagos: nextPagos, cuentasPagar: nextCuentas, gastos: nextGastos, source: "backend-merged" };
  }

  return { facturas, pagos, cuentasPagar, gastos, source: "empty" };
}
