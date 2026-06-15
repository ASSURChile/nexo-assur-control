import { repositories as repo } from "./repositories.js";
import { getSessionAccessToken } from "./authService.js";
import { getRuntimeProviderConfig, DATA_PROVIDERS } from "./providerRegistry.js";
import { createSupabaseNormalizedRestService, TABLE_ORDER } from "./supabaseNormalizedRestService.js";
import { buildSupabaseSeedPayload, DEFAULT_COMPANY_ID } from "./supabaseTransformService.js";

const SYNC_TABLES = [
  "clients",
  "sites",
  "opportunities",
  "proposals",
  "quotes",
  "commercial_packages",
  "commercial_package_items",
  "commercial_package_services",
  "projects",
  "project_tasks",
  "recurring_services",
  "invoices",
  "payments",
  "accounts_payable",
  "quick_quotes",
];

const LOCAL_TO_TABLE = {
  clientes: "clients",
  instalaciones: "sites",
  oportunidades: "opportunities",
  propuestas: "proposals",
  cotizaciones: "quotes",
  paquetesComerciales: "commercial_packages",
  proyectos: "projects",
  materiales: "materials",
  tecnicos: "technicians",
  contratistas: "contractors",
  horas: "time_entries",
  fichajes: "field_clock_events",
  incidencias: "incidents",
  gastos: "expenses",
  serviciosRecurrentes: "recurring_services",
  eventosServicio: "service_events",
  serviceBillingExpectations: "service_billing_expectations",
  facturas: "invoices",
  pagos: "payments",
  cuentasPagar: "accounts_payable",
  quickQuotes: "quick_quotes",
};

const toArray = (value) => Array.isArray(value) ? value : [];
const text = (value) => String(value || "").trim();
const number = (value) => Number(value) || 0;
const date = (value) => text(value) || "";

function isSupabaseNormalizedEnabled(config = getRuntimeProviderConfig()) {
  return config.dataProvider === DATA_PROVIDERS.supabaseNormalized && config.supabaseUrl && config.supabaseAnonKey;
}

function service(config = getRuntimeProviderConfig()) {
  if (!isSupabaseNormalizedEnabled(config)) return null;
  return createSupabaseNormalizedRestService({
    url: config.supabaseUrl,
    anonKey: config.supabaseAnonKey,
    getAccessToken: getSessionAccessToken,
  });
}

function stamp(value) {
  const parsed = value ? new Date(value).getTime() : 0;
  return Number.isFinite(parsed) ? parsed : 0;
}

function mergeById(localItems = [], remoteItems = []) {
  const map = new Map();
  for (const item of toArray(localItems)) {
    if (item?.id) map.set(item.id, item);
  }
  for (const item of toArray(remoteItems)) {
    if (!item?.id) continue;
    const current = map.get(item.id);
    if (!current || stamp(item.updatedAt || item.updated_at || item.createdAt) >= stamp(current.updatedAt || current.updated_at || current.createdAt)) {
      map.set(item.id, item);
    }
  }
  return [...map.values()];
}

function baseLocal(row) {
  return {
    ...(row?.metadata || {}),
    id: row.id,
    createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    updatedAt: row.updated_at || row.updatedAt || row.created_at || new Date().toISOString(),
  };
}

function fromClient(row) {
  return {
    ...baseLocal(row),
    rut: row.rut || "",
    razonSocial: row.legal_name || row.commercial_name || "Cliente sin nombre",
    nombreFantasia: row.commercial_name || "",
    estado: row.status || "Activo",
    ejecutivo: row.executive || "",
    origen: row.source || "manual",
    externalId: row.external_id || "",
  };
}

function fromSite(row) {
  return {
    ...baseLocal(row),
    clienteId: row.client_id || "",
    nombre: row.name || "Instalación sin nombre",
    ciudad: row.city || "",
    region: row.region || "",
    direccion: row.address || "",
    estado: row.status || "Activa",
  };
}

function fromOpportunity(row) {
  return {
    ...baseLocal(row),
    clienteId: row.client_id || "",
    instalacionId: row.site_id || "",
    titulo: row.title || "Oportunidad sin título",
    etapa: row.stage || "Lead nuevo",
    probabilidad: number(row.probability),
    valorEstimado: number(row.estimated_value),
    mrrEstimado: number(row.estimated_mrr),
    ejecutivo: row.executive || "",
    fechaCierreEstimada: date(row.expected_close_date),
  };
}

function fromProposal(row) {
  return {
    ...baseLocal(row),
    clienteId: row.client_id || "",
    instalacionId: row.site_id || "",
    oportunidadId: row.opportunity_id || "",
    numero: row.number || "",
    nombre: row.name || "Propuesta sin nombre",
    estado: row.status || "Borrador",
    ejecutivo: row.executive || "",
    valorFinal: number(row.net_project_value),
    costoEstimado: number(row.estimated_cost),
    mrr: number(row.monthly_recurring_value),
    origen: row.source || "manual",
  };
}

function fromQuote(row) {
  return {
    ...baseLocal(row),
    clienteId: row.client_id || "",
    instalacionId: row.site_id || "",
    propuestaId: row.proposal_id || "",
    numero: row.number || "",
    estado: row.status || "Borrador",
    precioNeto: number(row.net_amount),
  };
}

function fromCommercialPackage(row, itemRows = [], serviceRows = []) {
  const metadata = row?.metadata || {};
  return {
    ...baseLocal(row),
    nombre: row.name || "Paquete sin nombre",
    linea: row.line || "ASSUR Home",
    categoria: row.category || "Alarma",
    estado: row.status || "Borrador",
    descripcionComercial: row.description || "",
    precioInstalacionNeto: number(row.installation_price),
    monedaPrecio: row.installation_currency || "CLP",
    valorMensual: number(row.monthly_value),
    monedaMensual: row.monthly_currency || "UF",
    duracionContratoMeses: number(row.contract_months) || 24,
    costoEstimado: number(row.estimated_cost),
    margenEsperado: number(row.expected_margin),
    requiereAprobacion: Boolean(row.requires_approval),
    vigenciaDesde: date(row.valid_from),
    vigenciaHasta: date(row.valid_until),
    condiciones: row.conditions || "",
    materialesIncluidos: toArray(metadata.materialesIncluidos).length
      ? metadata.materialesIncluidos
      : itemRows.filter((item) => item.item_type === "material").map(fromCommercialPackageItem),
    manoObraIncluida: toArray(metadata.manoObraIncluida).length
      ? metadata.manoObraIncluida
      : itemRows.filter((item) => item.item_type === "labor").map(fromCommercialPackageItem),
    serviciosIncluidos: toArray(metadata.serviciosIncluidos).length
      ? metadata.serviciosIncluidos
      : serviceRows.map(fromCommercialPackageService),
  };
}

function fromCommercialPackageItem(row) {
  return {
    ...baseLocal(row),
    materialId: row.material_id || "",
    nombre: row.name || "Item sin nombre",
    cantidad: number(row.quantity) || 1,
    unidad: row.unit || "",
    costoUnitario: number(row.unit_cost),
    tipo: row.item_type || "material",
  };
}

function fromCommercialPackageService(row) {
  return {
    ...baseLocal(row),
    tipoServicio: row.service_type || "Monitoreo",
    valorMensual: number(row.monthly_value),
    monedaMensual: row.currency || "UF",
    camaras: number(row.cameras),
    alarmas: number(row.alarms),
  };
}

function fromProject(row, taskRows = []) {
  const metadata = row?.metadata || {};
  return {
    ...baseLocal(row),
    clienteId: row.client_id || "",
    instalacionId: row.site_id || "",
    propuestaId: row.proposal_id || "",
    codigo: row.code || "",
    nombre: row.name || "Proyecto sin nombre",
    tipo: row.category || "",
    estadoOp: row.operational_status || "Planificacion",
    estadoFin: row.financial_status || "Pendiente",
    valorVendido: number(row.sold_value),
    costoEstimado: number(row.estimated_cost),
    centroCosto: row.cost_center || "",
    fechaInicio: date(row.start_date),
    fechaTermino: date(row.end_date),
    tareas: toArray(metadata.tareas).length ? metadata.tareas : taskRows.map(fromProjectTask),
  };
}

function fromProjectTask(row) {
  return {
    ...baseLocal(row),
    nombre: row.title || "Tarea sin nombre",
    etapa: row.stage || "",
    estado: row.status || "Pendiente",
    asignadoAId: row.assigned_to || "",
    duracionEstimada: number(row.estimated_hours),
    iniciadoEl: row.started_at || "",
    completadoEl: row.completed_at || "",
  };
}

function fromRecurringService(row) {
  return {
    ...baseLocal(row),
    clienteId: row.client_id || "",
    instalacionId: row.site_id || "",
    proyectoId: row.project_id || "",
    propuestaId: row.proposal_id || "",
    codigo: row.code || "",
    tipoServicio: row.service_type || "Monitoreo",
    estado: row.status || "En activación",
    valorMensual: number(row.monthly_value),
    camaras: number(row.cameras),
    alarmas: number(row.alarms),
    videoVerificacion: number(row.video_verification),
    periodicidadFacturacion: row.billing_frequency || "Mensual",
    fechaInicio: date(row.start_date),
    responsable: row.responsible || "",
    origen: row.source || "assur",
    externalId: row.external_id || "",
  };
}

function fromInvoice(row) {
  return {
    ...baseLocal(row),
    clienteId: row.client_id || "",
    proyectoId: row.project_id || "",
    folio: row.folio || "",
    fechaEmision: date(row.issue_date),
    fechaVencimiento: date(row.due_date),
    monto: number(row.amount),
    montoPagado: number(row.paid_amount),
    estado: row.status || "Emitida",
    origen: row.source || "manual",
    externalId: row.external_id || "",
  };
}

function fromPayment(row, invoiceRows = []) {
  const invoice = invoiceRows.find((item) => item.id === row.invoice_id);
  return {
    ...baseLocal(row),
    facturaId: row.invoice_id || "",
    folioFactura: invoice?.folio || row.metadata?.folioFactura || "",
    fechaPago: date(row.payment_date),
    monto: number(row.amount),
    medio: row.method || "",
    origen: row.source || "manual",
    externalId: row.external_id || "",
  };
}

function fromAccountPayable(row) {
  return {
    ...baseLocal(row),
    proyectoId: row.project_id || "",
    proveedor: row.supplier_name || "Proveedor sin nombre",
    folio: row.folio || "",
    fechaEmision: date(row.issue_date),
    fechaVencimiento: date(row.due_date),
    monto: number(row.amount),
    montoPagado: number(row.paid_amount),
    estado: row.status || "Pendiente",
    origen: row.source || "manual",
    externalId: row.external_id || "",
  };
}

function fromQuickQuote(row) {
  return {
    ...baseLocal(row),
    paqueteId: row.package_id || "",
    clienteId: row.client_id || "",
    instalacionId: row.site_id || "",
    oportunidadId: row.opportunity_id || "",
    propuestaId: row.proposal_id || "",
    estado: row.status || "Generada",
    valorProyecto: number(row.net_project_value),
    valorMensual: number(row.monthly_recurring_value),
    creadoPorId: row.created_by || "",
  };
}

function localSnapshot() {
  return {
    clientes: repo.clientes.list(),
    instalaciones: repo.instalaciones.list(),
    oportunidades: repo.oportunidades.list(),
    propuestas: repo.propuestas.list(),
    cotizaciones: repo.cotizaciones.list(),
    paquetesComerciales: repo.paquetesComerciales.list(),
    proyectos: repo.proyectos.list(),
    materiales: repo.materiales.list(),
    tecnicos: repo.tecnicos.list(),
    contratistas: repo.contratistas.list(),
    horas: repo.horas.list(),
    fichajes: repo.fichajes.list(),
    incidencias: repo.incidencias.list(),
    gastos: repo.gastos.list(),
    serviciosRecurrentes: repo.serviciosRecurrentes.list(),
    eventosServicio: repo.eventosServicio.list(),
    serviceBillingExpectations: repo.serviceBillingExpectations.list(),
    facturas: repo.facturas.list(),
    pagos: repo.pagos.list(),
    cuentasPagar: repo.cuentasPagar.list(),
    quickQuotes: repo.quickQuotes.list(),
  };
}

function companyId() {
  return repo.session.get()?.companyId || DEFAULT_COMPANY_ID;
}

export async function pushLocalDataToSupabase() {
  const client = service();
  if (!client) return { skipped: true, reason: "supabase-not-configured" };
  const payload = buildSupabaseSeedPayload(localSnapshot(), { companyId: companyId() });
  const tables = TABLE_ORDER.filter((table) => table !== "companies" && payload[table]);
  const result = await client.upsertSeedPayload(payload, { tables });
  return { skipped: false, result };
}

export async function hydrateLocalDataFromSupabase() {
  const client = service();
  if (!client) return { skipped: true, reason: "supabase-not-configured" };

  const rows = Object.fromEntries(await Promise.all(SYNC_TABLES.map(async (table) => {
    try {
      const data = await client.selectTable(table, "select=*");
      return [table, data || []];
    } catch (error) {
      repo.syncLog.append({
        id: `sync-table-${table}-${Date.now()}`,
        fecha: new Date().toISOString(),
        origen: "supabase",
        tipo: "supabase-normalized-hydrate",
        entidad: table,
        estado: "warning",
        registros: 0,
        mensaje: error.message || `No se pudo leer ${table}.`,
      });
      return [table, []];
    }
  })));

  const taskGroups = new Map();
  for (const task of toArray(rows.project_tasks)) {
    if (!task.project_id) continue;
    taskGroups.set(task.project_id, [...(taskGroups.get(task.project_id) || []), task]);
  }
  const packageItemGroups = new Map();
  for (const item of toArray(rows.commercial_package_items)) {
    if (!item.package_id) continue;
    packageItemGroups.set(item.package_id, [...(packageItemGroups.get(item.package_id) || []), item]);
  }
  const packageServiceGroups = new Map();
  for (const serviceRow of toArray(rows.commercial_package_services)) {
    if (!serviceRow.package_id) continue;
    packageServiceGroups.set(serviceRow.package_id, [...(packageServiceGroups.get(serviceRow.package_id) || []), serviceRow]);
  }

  const next = {
    clientes: mergeById(repo.clientes.list(), rows.clients.map(fromClient)),
    instalaciones: mergeById(repo.instalaciones.list(), rows.sites.map(fromSite)),
    oportunidades: mergeById(repo.oportunidades.list(), rows.opportunities.map(fromOpportunity)),
    propuestas: mergeById(repo.propuestas.list(), rows.proposals.map(fromProposal)),
    cotizaciones: mergeById(repo.cotizaciones.list(), rows.quotes.map(fromQuote)),
    paquetesComerciales: mergeById(repo.paquetesComerciales.list(), rows.commercial_packages.map((pkg) => fromCommercialPackage(pkg, packageItemGroups.get(pkg.id) || [], packageServiceGroups.get(pkg.id) || []))),
    proyectos: mergeById(repo.proyectos.list(), rows.projects.map((project) => fromProject(project, taskGroups.get(project.id) || []))),
    servicios: mergeById(repo.serviciosRecurrentes.list(), rows.recurring_services.map(fromRecurringService)),
    facturas: mergeById(repo.facturas.list(), rows.invoices.map(fromInvoice)),
    pagos: mergeById(repo.pagos.list(), rows.payments.map((payment) => fromPayment(payment, rows.invoices))),
    cuentasPagar: mergeById(repo.cuentasPagar.list(), rows.accounts_payable.map(fromAccountPayable)),
    quickQuotes: mergeById(repo.quickQuotes.list(), rows.quick_quotes.map(fromQuickQuote)),
  };

  repo.clientes.replaceAll(next.clientes);
  repo.instalaciones.replaceAll(next.instalaciones);
  repo.oportunidades.replaceAll(next.oportunidades);
  repo.propuestas.replaceAll(next.propuestas);
  repo.cotizaciones.replaceAll(next.cotizaciones);
  repo.paquetesComerciales.replaceAll(next.paquetesComerciales);
  repo.proyectos.replaceAll(next.proyectos);
  repo.serviciosRecurrentes.replaceAll(next.servicios);
  repo.facturas.replaceAll(next.facturas);
  repo.pagos.replaceAll(next.pagos);
  repo.cuentasPagar.replaceAll(next.cuentasPagar);
  repo.quickQuotes.replaceAll(next.quickQuotes);

  return { skipped: false, ...next };
}

export async function syncSupabaseNormalizedData() {
  return hydrateLocalDataFromSupabase();
}

export async function syncSupabaseNormalizedTables(tables = []) {
  const client = service();
  if (!client) return { skipped: true, reason: "supabase-not-configured" };
  const allowed = new Set(TABLE_ORDER);
  const selectedTables = [...new Set(tables)].filter((table) => allowed.has(table) && table !== "companies");
  if (!selectedTables.length) return { skipped: true, reason: "no-tables" };
  const payload = buildSupabaseSeedPayload(localSnapshot(), { companyId: companyId() });
  const result = await client.upsertSeedPayload(payload, { tables: selectedTables });
  return { skipped: false, result };
}

export async function syncSupabaseNormalizedEntity(entity, id) {
  const table = LOCAL_TO_TABLE[entity];
  if (!table || !id) return { skipped: true, reason: "unknown-entity" };
  const client = service();
  if (!client) return { skipped: true, reason: "supabase-not-configured" };
  const payload = buildSupabaseSeedPayload(localSnapshot(), { companyId: companyId() });
  if (table === "projects") {
    payload.projects = toArray(payload.projects).filter((row) => row.id === id);
    payload.project_tasks = toArray(payload.project_tasks).filter((row) => row.project_id === id);
    const result = await client.upsertSeedPayload(payload, { tables: ["projects", "project_tasks"] });
    return { skipped: false, result };
  }
  if (table === "commercial_packages") {
    payload.commercial_packages = toArray(payload.commercial_packages).filter((row) => row.id === id);
    payload.commercial_package_items = toArray(payload.commercial_package_items).filter((row) => row.package_id === id);
    payload.commercial_package_services = toArray(payload.commercial_package_services).filter((row) => row.package_id === id);
    const result = await client.upsertSeedPayload(payload, { tables: ["commercial_packages", "commercial_package_items", "commercial_package_services"] });
    return { skipped: false, result };
  }
  payload[table] = toArray(payload[table]).filter((row) => row.id === id);
  const result = await client.upsertSeedPayload(payload, { tables: [table] });
  return { skipped: false, result };
}

export function syncSupabaseNormalizedDataQuiet({ onHydrated } = {}) {
  syncSupabaseNormalizedData()
    .then((result) => {
      if (!result?.skipped) onHydrated?.(result);
    })
    .catch((error) => {
      repo.syncLog.append({
        id: `sync-${Date.now()}`,
        fecha: new Date().toISOString(),
        origen: "supabase",
        tipo: "supabase-normalized-sync",
        entidad: "datos críticos",
        estado: "error",
        registros: 0,
        mensaje: error.message || "No se pudo sincronizar Supabase.",
      });
    });
}

export function syncSupabaseNormalizedTablesQuiet(tables = []) {
  syncSupabaseNormalizedTables(tables).catch((error) => {
    repo.syncLog.append({
      id: `sync-tables-${Date.now()}`,
      fecha: new Date().toISOString(),
      origen: "supabase",
      tipo: "supabase-normalized-sync",
      entidad: tables.join(",") || "tablas",
      estado: "error",
      registros: 0,
      mensaje: error.message || "No se pudo sincronizar Supabase.",
    });
  });
}

export function syncSupabaseNormalizedEntityQuiet(entity, id) {
  syncSupabaseNormalizedEntity(entity, id).catch((error) => {
    repo.syncLog.append({
      id: `sync-entity-${Date.now()}`,
      fecha: new Date().toISOString(),
      origen: "supabase",
      tipo: "supabase-normalized-sync",
      entidad: entity,
      estado: "error",
      registros: 0,
      mensaje: error.message || `No se pudo sincronizar ${entity} en Supabase.`,
    });
  });
}

export function deleteSupabaseNormalizedEntityQuiet(entity, id) {
  const table = LOCAL_TO_TABLE[entity];
  const client = service();
  if (!table || !client || !id) return;
  client.deleteById(table, id).catch((error) => {
    repo.syncLog.append({
      id: `sync-delete-${Date.now()}`,
      fecha: new Date().toISOString(),
      origen: "supabase",
      tipo: "supabase-normalized-delete",
      entidad: entity,
      estado: "error",
      registros: 0,
      mensaje: error.message || `No se pudo eliminar ${entity} en Supabase.`,
    });
  });
}
