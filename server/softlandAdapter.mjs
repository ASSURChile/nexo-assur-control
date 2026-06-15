import { attachOperatingContext, buildOperatingContext } from "../src/domain/companyContext.js";

export const SOFTLAND_ENTITIES = [
  "clientes",
  "facturas",
  "pagos",
  "cxc",
  "cxp",
  "centrosCosto",
  "planCuentas",
  "resultadoOperacional",
  "costosGastos",
  "costosPersonal",
  "nominaOperativa",
  "serviciosRecurrentes",
  "materiales",
  "stockMateriales",
  "movimientosMateriales",
];

const REQUIRED_FIELDS = {
  clientes: [["rut", "rutCliente"], ["razonSocial", "nombre", "cliente"]],
  facturas: [["folio", "numeroFactura", "documento"], ["rutCliente", "rut"], ["monto", "montoTotal", "total"]],
  pagos: [["folioFactura", "folio", "numeroFactura"], ["fechaPago", "fecha"], ["monto", "montoPagado"]],
  cxc: [["folio", "numeroFactura", "documento"], ["rutCliente", "rut"], ["saldo", "saldoPendiente"]],
  cxp: [["folio", "numeroDocumento", "documento"], ["proveedor", "razonSocial"], ["monto", "montoTotal", "total"]],
  centrosCosto: [["codigo", "centroCosto", "ccosto"], ["nombre", "descripcion"]],
  planCuentas: [["codigo", "cuentaContable"], ["nombre", "descripcion"]],
  resultadoOperacional: [["anio", "ano", "year"], ["mes", "month"], ["monto", "valor"]],
  costosGastos: [["anio", "ano", "year"], ["mes", "month"], ["monto", "valor"], ["cuentaContable", "cuenta"]],
  costosPersonal: [["anio", "ano", "year"], ["mes", "month"], ["costoEmpresa", "monto", "valor"]],
  nominaOperativa: [["anio", "ano", "year"], ["mes", "month"], ["costoEmpresa", "monto", "valor"]],
  serviciosRecurrentes: [["rutCliente", "rut"], ["valorMensual", "mrr", "montoMensual"]],
  materiales: [["codigo", "sku"], ["nombre", "descripcion"]],
  stockMateriales: [["codigo", "sku"], ["stockActual", "stock"]],
  movimientosMateriales: [["codigo", "sku"], ["fecha"], ["cantidad"]],
};

const normalizeKey = (key = "") => String(key)
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]/g, "")
  .toLowerCase();

const normalizeRow = (row = {}) => {
  const normalized = {};
  for (const [key, value] of Object.entries(row || {})) {
    normalized[normalizeKey(key)] = value;
  }
  return normalized;
};

const text = (value) => String(value ?? "").trim();
const money = (value) => Number(String(value ?? "0").replace(/\$/g, "").replace(/\./g, "").replace(",", ".")) || 0;
const dateOnly = (value) => text(value).slice(0, 10);
const pick = (row, names = []) => {
  const normalized = row.__normalized || normalizeRow(row);
  for (const name of names) {
    const value = normalized[normalizeKey(name)];
    if (value !== undefined && value !== null && text(value) !== "") return value;
  }
  return "";
};

function stableId(prefix, ...parts) {
  return [prefix, ...parts.map((part) => text(part).replace(/[^a-zA-Z0-9-]/g, "").toLowerCase()).filter(Boolean)].join("-");
}

function rowContext(row, fallbackLine = "") {
  const context = buildOperatingContext({
    empresaOrigen: pick(row, ["empresaOrigen", "empresa", "sociedad", "company", "empresaNombre"]),
    empresaRut: pick(row, ["empresaRut", "rutEmpresa"]),
    lineaNegocio: pick(row, ["lineaNegocio", "familia", "gestion", "tipoProyecto"]) || fallbackLine,
    sourceSystem: "softland_api",
    externalId: pick(row, ["id", "codigo", "folio", "numeroDocumento", "numeroFactura"]),
  });
  return context;
}

function prepareRows(rows = []) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({ ...row, __normalized: normalizeRow(row) }));
}

function sourceRows(payload = {}, entity) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload[entity])) return payload[entity];
  if (Array.isArray(payload.data)) return payload.data;
  if (Array.isArray(payload.items)) return payload.items;
  if (payload.data && Array.isArray(payload.data[entity])) return payload.data[entity];
  return [];
}

function validateRows(entity, rows = []) {
  const warnings = [];
  const errors = [];
  const requiredGroups = REQUIRED_FIELDS[entity] || [];
  rows.forEach((row, index) => {
    requiredGroups.forEach((group) => {
      const hasValue = group.some((field) => text(pick(row, [field])));
      if (!hasValue) errors.push(`${entity}[${index}]: falta ${group.join(" / ")}.`);
    });
  });
  return { ok: errors.length === 0, errors, warnings };
}

function normalizeClient(row) {
  const ctx = rowContext(row);
  const rut = text(pick(row, ["rut", "rutCliente"]));
  const code = text(pick(row, ["codigo", "codigoCliente", "codCliente", "id"]));
  return attachOperatingContext({
    id: stableId("softland-client", ctx.empresaOrigen, code || rut),
    rut,
    razonSocial: text(pick(row, ["razonSocial", "nombre", "cliente", "legalName"])),
    nombreFantasia: text(pick(row, ["nombreFantasia", "fantasia", "alias"])),
    direccion: text(pick(row, ["direccion", "address"])),
    telefono: text(pick(row, ["telefono", "fono"])),
    email: text(pick(row, ["email", "correo"])),
    estado: text(pick(row, ["estado"])) || "Activo",
    centroCosto: text(pick(row, ["centroCosto", "ccosto", "cc"])),
    origen: "softland",
    origenId: code,
    externalId: code,
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizeInvoice(row) {
  const ctx = rowContext(row);
  const folio = text(pick(row, ["folio", "numeroFactura", "documento", "numero"]));
  const amount = money(pick(row, ["monto", "montoTotal", "total", "neto"]));
  const paid = money(pick(row, ["montoPagado", "pagado"]));
  const explicitBalance = pick(row, ["saldo", "saldoPendiente"]);
  return attachOperatingContext({
    id: stableId("softland-invoice", ctx.empresaOrigen, folio),
    folio,
    numeroFactura: folio,
    rutCliente: text(pick(row, ["rutCliente", "rut"])),
    clienteId: "",
    proyectoId: "",
    centroCosto: text(pick(row, ["centroCosto", "ccosto", "cc"])),
    fechaEmision: dateOnly(pick(row, ["fechaEmision", "fecha"])),
    fechaVencimiento: dateOnly(pick(row, ["fechaVencimiento", "vencimiento"])),
    monto: amount,
    montoTotal: amount,
    montoPagado: paid,
    saldo: explicitBalance === "" ? Math.max(0, amount - paid) : money(explicitBalance),
    estado: text(pick(row, ["estado"])) || "Emitida",
    origen: "softland",
    origenId: folio,
    externalId: folio,
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizePayment(row) {
  const ctx = rowContext(row);
  const folio = text(pick(row, ["folioFactura", "folio", "numeroFactura"]));
  const date = dateOnly(pick(row, ["fechaPago", "fecha"]));
  const amount = money(pick(row, ["monto", "montoPagado"]));
  return attachOperatingContext({
    id: stableId("softland-payment", ctx.empresaOrigen, folio, date, amount),
    folioFactura: folio,
    fechaPago: date,
    monto: amount,
    medio: text(pick(row, ["medio", "formaPago"])) || "Softland",
    observaciones: text(pick(row, ["glosa", "observaciones"])),
    origen: "softland",
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizeAccountsPayable(row) {
  const ctx = rowContext(row);
  const folio = text(pick(row, ["folio", "numeroDocumento", "documento", "numero"]));
  const amount = money(pick(row, ["monto", "montoTotal", "total"]));
  const paid = money(pick(row, ["montoPagado", "pagado"]));
  const explicitBalance = pick(row, ["saldo", "saldoPendiente"]);
  return attachOperatingContext({
    id: stableId("softland-ap", ctx.empresaOrigen, folio),
    numeroDocumento: folio,
    folio,
    proveedor: text(pick(row, ["proveedor", "razonSocial", "nombre"])),
    rutProveedor: text(pick(row, ["rutProveedor", "rut"])),
    centroCosto: text(pick(row, ["centroCosto", "ccosto", "cc"])),
    fechaEmision: dateOnly(pick(row, ["fechaEmision", "fecha"])),
    fechaVencimiento: dateOnly(pick(row, ["fechaVencimiento", "vencimiento"])),
    vencimiento: dateOnly(pick(row, ["fechaVencimiento", "vencimiento"])),
    monto: amount,
    montoPagado: paid,
    saldo: explicitBalance === "" ? Math.max(0, amount - paid) : money(explicitBalance),
    estado: text(pick(row, ["estado"])) || "Pendiente",
    origen: "softland",
    origenId: folio,
    externalId: folio,
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizeRecurringService(row) {
  const ctx = rowContext(row, "monitoreo");
  const code = text(pick(row, ["codigo", "contrato", "idServicio", "id"]));
  return attachOperatingContext({
    id: stableId("softland-service", ctx.empresaOrigen, code || pick(row, ["rutCliente", "rut"])),
    codigo: code,
    clienteId: "",
    instalacionId: "",
    tipoServicio: text(pick(row, ["tipoServicio", "servicio", "categoria"])) || "Monitoreo",
    estado: text(pick(row, ["estado"])) || "Activo",
    valorMensual: money(pick(row, ["valorMensual", "mrr", "montoMensual"])),
    camaras: money(pick(row, ["camaras", "cantidadCamaras"])),
    alarmas: money(pick(row, ["alarmas", "cantidadAlarmas"])),
    fechaInicio: dateOnly(pick(row, ["fechaInicio", "inicio"])),
    periodicidadFacturacion: text(pick(row, ["periodicidad", "periodicidadFacturacion"])) || "Mensual",
    responsable: text(pick(row, ["responsable"])),
    origen: "softland",
    externalId: code,
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizeMaterial(row) {
  const ctx = rowContext(row, "tecnica");
  const code = text(pick(row, ["codigo", "sku"]));
  return attachOperatingContext({
    id: stableId("softland-material", ctx.empresaOrigen, code),
    codigo: code,
    nombre: text(pick(row, ["nombre", "descripcion"])),
    categoria: text(pick(row, ["categoria", "familia"])),
    unidad: text(pick(row, ["unidad", "um"])) || "un",
    precioUnitario: money(pick(row, ["precioUnitario", "costoUnitario", "precio", "costo"])),
    stockActual: money(pick(row, ["stockActual", "stock"])),
    bodega: text(pick(row, ["bodega", "almacen"])),
    fechaActualizacion: dateOnly(pick(row, ["fechaActualizacion", "fecha"])),
    stockSincronizado: pick(row, ["stockActual", "stock"]) !== "",
    origen: "softland",
    externalId: code,
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizeMaterialStock(row) {
  const material = normalizeMaterial(row);
  return {
    ...material,
    id: stableId("softland-material", material.empresaOrigen, material.codigo, material.bodega),
  };
}

function normalizeMaterialMovement(row) {
  const ctx = rowContext(row, "tecnica");
  const code = text(pick(row, ["codigo", "sku"]));
  const date = dateOnly(pick(row, ["fecha", "fechaMovimiento"]));
  const type = text(pick(row, ["tipoMovimiento", "tipo"])) || "movimiento";
  return attachOperatingContext({
    id: stableId("softland-material-move", ctx.empresaOrigen, code, date, type, pick(row, ["documento", "folio"])),
    codigo: code,
    materialCodigo: code,
    nombre: text(pick(row, ["nombre", "descripcion"])),
    fecha: date,
    tipoMovimiento: type,
    cantidad: money(pick(row, ["cantidad"])),
    costoUnitario: money(pick(row, ["costoUnitario", "precioUnitario", "costo"])),
    costoTotal: money(pick(row, ["costoTotal", "total"])) || money(pick(row, ["cantidad"])) * money(pick(row, ["costoUnitario", "precioUnitario", "costo"])),
    bodega: text(pick(row, ["bodega", "almacen"])),
    proyectoCodigo: text(pick(row, ["proyectoCodigo", "codigoProyecto", "centroCosto"])),
    centroCosto: text(pick(row, ["centroCosto", "ccosto", "cc"])),
    documento: text(pick(row, ["documento", "folio"])),
    origen: "softland",
    externalId: text(pick(row, ["id", "documento", "folio"])),
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizeCostExpense(row) {
  const ctx = rowContext(row);
  const year = Number(pick(row, ["anio", "ano", "year"])) || null;
  const month = Number(pick(row, ["mes", "month"])) || null;
  const account = text(pick(row, ["cuentaContable", "cuenta"]));
  const costCenter = text(pick(row, ["centroCosto", "ccosto", "cc"]));
  const amount = money(pick(row, ["monto", "valor"]));
  return attachOperatingContext({
    id: stableId("softland-expense", ctx.empresaOrigen, year, month, account, costCenter, pick(row, ["tipoGasto", "tipoResultado", "tipo"])),
    anio: year,
    mes: month,
    periodo: year && month ? `${year}-${String(month).padStart(2, "0")}` : "",
    cuentaContable: account,
    nombreCuenta: text(pick(row, ["nombreCuenta", "descripcionCuenta", "descripcion"])),
    centroCosto: costCenter,
    tipoGasto: text(pick(row, ["tipoGasto", "tipoResultado", "tipo", "clasificacion"])) || "gasto",
    monto: amount,
    recurrente: text(pick(row, ["recurrente"])).toLowerCase() === "true",
    origen: "softland",
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizeLaborCost(row) {
  const ctx = rowContext(row, "tecnica");
  const year = Number(pick(row, ["anio", "ano", "year"])) || null;
  const month = Number(pick(row, ["mes", "month"])) || null;
  const role = text(pick(row, ["rolCargo", "cargo", "rol", "tipoTecnico"])) || "tecnico";
  const area = text(pick(row, ["area", "departamento"])) || ctx.lineaNegocioNombre || "Operaciones";
  const cost = money(pick(row, ["costoEmpresa", "monto", "valor", "costo"]));
  const baseHours = money(pick(row, ["horasBaseMes", "horasDisponibles", "horasMes"]));
  const realHours = money(pick(row, ["horasReales", "horasRegistradas"]));
  const technicians = money(pick(row, ["tecnicosActivos", "dotacion", "cantidadPersonas"]));
  return attachOperatingContext({
    id: stableId("softland-labor-cost", ctx.empresaOrigen, year, month, area, role),
    anio: year,
    mes: month,
    periodo: year && month ? `${year}-${String(month).padStart(2, "0")}` : "",
    area,
    rolCargo: role,
    costoEmpresa: cost,
    horasBaseMes: baseHours,
    horasReales: realHours,
    tecnicosActivos: technicians,
    centroCosto: text(pick(row, ["centroCosto", "ccosto", "cc"])),
    origen: "softland",
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizeReferenceRow(row, entity) {
  const ctx = rowContext(row);
  const code = text(pick(row, ["codigo", "centroCosto", "ccosto", "cuentaContable"]));
  return attachOperatingContext({
    id: stableId(`softland-${entity}`, ctx.empresaOrigen, code),
    codigo: code,
    nombre: text(pick(row, ["nombre", "descripcion"])),
    tipo: text(pick(row, ["tipo", "clasificacion"])),
    origen: "softland",
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

function normalizeOperationalResult(row) {
  const ctx = rowContext(row);
  return attachOperatingContext({
    id: stableId("softland-result", ctx.empresaOrigen, pick(row, ["anio", "ano", "year"]), pick(row, ["mes", "month"]), pick(row, ["cuentaContable"]), pick(row, ["centroCosto"])),
    anio: Number(pick(row, ["anio", "ano", "year"])) || null,
    mes: Number(pick(row, ["mes", "month"])) || null,
    familia: text(pick(row, ["familia"])),
    gestion: text(pick(row, ["gestion"])),
    centroCosto: text(pick(row, ["centroCosto", "ccosto", "cc"])),
    cuentaContable: text(pick(row, ["cuentaContable", "cuenta"])),
    tipoResultado: text(pick(row, ["tipoResultado", "tipo", "clasificacion"])),
    monto: money(pick(row, ["monto", "valor"])),
    origen: "softland",
    rawSoftland: row,
    updatedAt: new Date().toISOString(),
  }, ctx);
}

const NORMALIZERS = {
  clientes: normalizeClient,
  facturas: normalizeInvoice,
  pagos: normalizePayment,
  cxc: normalizeInvoice,
  cxp: normalizeAccountsPayable,
  centrosCosto: (row) => normalizeReferenceRow(row, "centro-costo"),
  planCuentas: (row) => normalizeReferenceRow(row, "plan-cuenta"),
  resultadoOperacional: normalizeOperationalResult,
  costosGastos: normalizeCostExpense,
  costosPersonal: normalizeLaborCost,
  nominaOperativa: normalizeLaborCost,
  serviciosRecurrentes: normalizeRecurringService,
  materiales: normalizeMaterial,
  stockMateriales: normalizeMaterialStock,
  movimientosMateriales: normalizeMaterialMovement,
};

export function validateSoftlandApiPayload(payload = {}, entities = SOFTLAND_ENTITIES) {
  const results = {};
  const errors = [];
  for (const entity of entities) {
    const rows = prepareRows(sourceRows(payload, entity));
    if (!rows.length) {
      results[entity] = { ok: true, count: 0, errors: [], warnings: [`${entity}: sin registros.`] };
      continue;
    }
    const result = validateRows(entity, rows);
    results[entity] = { ...result, count: rows.length };
    errors.push(...result.errors);
  }
  return { ok: errors.length === 0, errors, results };
}

export function normalizeSoftlandApiPayload(payload = {}, entities = SOFTLAND_ENTITIES) {
  const normalized = {
    clientes: [],
    facturas: [],
    pagos: [],
    cuentasPagar: [],
    centrosCosto: [],
    planCuentas: [],
    resultadoOperacional: [],
    gastos: [],
    costosPersonal: [],
    costoHoraTecnica: [],
    serviciosRecurrentes: [],
    materiales: [],
    movimientosMateriales: [],
    syncSummary: {},
  };

  const mapTo = {
    clientes: "clientes",
    facturas: "facturas",
    pagos: "pagos",
    cxc: "facturas",
    cxp: "cuentasPagar",
    centrosCosto: "centrosCosto",
    planCuentas: "planCuentas",
    resultadoOperacional: "resultadoOperacional",
    costosGastos: "gastos",
    costosPersonal: "costosPersonal",
    nominaOperativa: "costosPersonal",
    serviciosRecurrentes: "serviciosRecurrentes",
    materiales: "materiales",
    stockMateriales: "materiales",
    movimientosMateriales: "movimientosMateriales",
  };

  for (const entity of entities) {
    const rows = prepareRows(sourceRows(payload, entity));
    const normalizer = NORMALIZERS[entity];
    if (!normalizer) continue;
    const outputKey = mapTo[entity];
    const mapped = rows.map((row) => {
      const { __normalized, ...raw } = row;
      return normalizer(raw);
    });
    normalized[outputKey].push(...mapped);
    normalized.syncSummary[entity] = mapped.length;
  }

  normalized.costoHoraTecnica = calculateTechnicalHourlyCosts(normalized.costosPersonal);
  normalized.syncSummary.costoHoraTecnica = normalized.costoHoraTecnica.length;

  return normalized;
}

export function calculateTechnicalHourlyCosts(costRows = [], { defaultMonthlyHours = 180 } = {}) {
  const grouped = new Map();
  for (const row of costRows) {
    const key = [
      row.empresaOrigen || "",
      row.lineaNegocio || "",
      row.periodo || "",
      row.area || "",
      row.rolCargo || "",
    ].join("|");
    const current = grouped.get(key) || {
      id: stableId("hourly-cost", row.empresaOrigen, row.lineaNegocio, row.periodo, row.area, row.rolCargo),
      empresaOrigen: row.empresaOrigen,
      empresaOrigenNombre: row.empresaOrigenNombre,
      empresaOrigenRut: row.empresaOrigenRut,
      lineaNegocio: row.lineaNegocio,
      lineaNegocioNombre: row.lineaNegocioNombre,
      periodo: row.periodo,
      anio: row.anio,
      mes: row.mes,
      area: row.area,
      rolCargo: row.rolCargo,
      costoEmpresaTotal: 0,
      horasBaseMes: 0,
      horasReales: 0,
      tecnicosActivos: 0,
      origen: "softland_api",
      metodo: "costo_personal_sobre_horas",
      registros: 0,
      metadata: { operatingContext: row.metadata?.operatingContext },
    };
    current.costoEmpresaTotal += money(row.costoEmpresa);
    current.horasBaseMes += money(row.horasBaseMes);
    current.horasReales += money(row.horasReales);
    current.tecnicosActivos += money(row.tecnicosActivos);
    current.registros += 1;
    grouped.set(key, current);
  }

  return [...grouped.values()].map((row) => {
    const horasDisponibles = row.horasReales || row.horasBaseMes || (row.tecnicosActivos ? row.tecnicosActivos * defaultMonthlyHours : defaultMonthlyHours);
    const costoHoraReal = horasDisponibles > 0 ? Math.round(row.costoEmpresaTotal / horasDisponibles) : 0;
    return {
      ...row,
      horasDisponibles,
      costoHoraReal,
      fallbackManual: costoHoraReal <= 0,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function buildSoftlandContractReport(payload = {}, entities = SOFTLAND_ENTITIES) {
  const validation = validateSoftlandApiPayload(payload, entities);
  const normalized = normalizeSoftlandApiPayload(payload, entities);
  return {
    ok: validation.ok,
    validation,
    counts: normalized.syncSummary,
    normalized,
  };
}
