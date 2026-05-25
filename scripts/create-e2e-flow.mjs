import fs from "node:fs";

const ROOT = new URL("..", import.meta.url);
const OUT = new URL("tmp/e2e-flow-local.json", ROOT);
const COMPANY_ID = "00000000-0000-0000-0000-000000000001";
const ADMIN_EMAIL = "admin@assur.cl";
const ADMIN_PASSWORD = process.env.SUPABASE_LOGIN_PASSWORD || "admin12345";

function readEnv() {
  const path = new URL(".env.local", ROOT);
  const env = {};
  for (const line of fs.readFileSync(path, "utf8").split(/\n/)) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;
    const idx = clean.indexOf("=");
    if (idx === -1) continue;
    env[clean.slice(0, idx)] = clean.slice(idx + 1);
  }
  return env;
}

const env = readEnv();
const base = String(env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const anonKey = env.VITE_SUPABASE_ANON_KEY;

if (!base || !anonKey) {
  console.error("Falta VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env.local");
  process.exit(1);
}

const now = new Date().toISOString();
const today = new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const ids = {
  client: "qa-flujo-cliente",
  site: "qa-flujo-instalacion",
  opportunity: "qa-flujo-oportunidad",
  proposal: "qa-flujo-propuesta",
  quote: "qa-flujo-cotizacion",
  project: "qa-flujo-proyecto",
  service: "qa-flujo-servicio",
  invoice1: "qa-flujo-factura-anticipo",
  invoice2: "qa-flujo-factura-cierre",
  payment1: "qa-flujo-pago-anticipo",
  ap1: "qa-flujo-cxp-materiales",
  ap2: "qa-flujo-cxp-subcontrato",
};

const local = {
  clientes: [{
    id: ids.client,
    razonSocial: "QA Agroindustrial Los Robles SpA",
    nombreComercial: "Los Robles QA",
    rut: "76.987.654-3",
    rubro: "Agroindustria",
    ejecutivo: "Demo Comercial",
    contacto: "María Valenzuela",
    telefono: "+56 9 1111 2222",
    email: "maria.valenzuela@losrobles.qa",
    direccion: "Ruta K-55 km 12, Curicó",
    notas: "Cliente ficticio para validar flujo integral ASSUR Control.",
    estado: "Activo",
    centroCosto: "QA-ROBLES",
    origen: "manual",
    createdAt: now,
    updatedAt: now,
  }],
  instalaciones: [{
    id: ids.site,
    clienteId: ids.client,
    nombre: "Planta Curicó",
    direccion: "Ruta K-55 km 12, Curicó",
    comuna: "Curicó",
    ciudad: "Curicó",
    region: "Maule",
    responsable: "Jorge Paredes",
    telefono: "+56 9 3333 4444",
    observaciones: "Instalación ficticia con cámaras, alarmas y protocolo de monitoreo.",
    estado: "Activa",
    geoLat: -34.982,
    geoLng: -71.239,
    geoRadioMetros: 160,
    origen: "manual",
    createdAt: now,
    updatedAt: now,
  }],
  oportunidades: [{
    id: ids.opportunity,
    numero: "OP-QA-001",
    titulo: "Integración CCTV y monitoreo planta Curicó",
    clienteId: ids.client,
    instalacionId: ids.site,
    ejecutivo: "Demo Comercial",
    etapa: "Ganada",
    probabilidad: 100,
    valorEstimado: 18500000,
    mrrEstimado: 1450000,
    fechaContacto: addDays(-20),
    fechaCierreEstimada: today,
    origenLead: "Cliente existente",
    notas: "Oportunidad QA para validar pipeline, propuesta, proyecto y recurrente.",
    propuestaId: ids.proposal,
    createdAt: now,
    updatedAt: now,
  }],
  propuestas: [{
    id: ids.proposal,
    numero: "PROP-QA-001",
    nombre: "Integración CCTV y monitoreo planta Curicó",
    clienteId: ids.client,
    instalacionId: ids.site,
    oportunidadId: ids.opportunity,
    ejecutivo: "Demo Comercial",
    fecha: today,
    vigencia: addDays(30),
    estado: "Aprobada",
    tipoVenta: "Proyecto + Monitoreo",
    categoria: "Seguridad electrónica",
    baseProyectoNeto: 18500000,
    valorProyecto: 18500000,
    valorFinal: 18500000,
    costoEstimado: 11350000,
    descuento: 0,
    baseRecMes: 1450000,
    mrr: 1450000,
    camaras: 24,
    alarmas: 4,
    videoVerificacion: 1,
    duracionContrato: 36,
    fechaInicio: addDays(18),
    condicionesPago: [
      { id: "qa-cond-1", nombre: "Anticipo", pct: 40 },
      { id: "qa-cond-2", nombre: "Cierre técnico", pct: 60 },
    ],
    notas: "Propuesta aprobada con servicio recurrente mensual.",
    historial: [{ fecha: now, estado: "Aprobada", nota: "QA: convertida a proyecto." }],
    origen: "manual",
    createdAt: now,
    updatedAt: now,
  }],
  cotizaciones: [{
    id: ids.quote,
    numero: "COT-QA-001",
    estado: "Cerrada",
    clienteId: ids.client,
    instalacionId: ids.site,
    propuestaId: ids.proposal,
    tipoProyectoId: "cctv",
    descripcion: "QA CLOUD cotizacion exportable para CCTV, alarmas y monitoreo.",
    fecha: today,
    tieneProyecto: true,
    tieneRecurrente: true,
    precioNeto: 18500000,
    materiales: [
      { id: "qa-cot-mat-1", desc: "Sistema CCTV IP y accesorios", cant: 1, precio: 14200000 },
      { id: "qa-cot-mat-2", desc: "Configuracion alarma y monitoreo", cant: 1, precio: 4300000 },
    ],
    serviciosRec: [{ id: "qa-cot-svc-1", nombre: "Videoverificacion y monitoreo", cantidad: 1, ufUnitario: 36 }],
    documentoClienteTemplate: "cctv",
    documentoClienteHtml: "<article class=\"quote-page\"><main class=\"quote-body\"><h1 contenteditable=\"true\">QA CLOUD documento editable de cotizacion</h1><p contenteditable=\"true\">Documento generado para validar persistencia cloud de PDF editable.</p></main></article>",
    documentoClienteUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  }],
  proyectos: [{
    id: ids.project,
    codigo: "PRY-QA-001",
    numero: "PRY-QA-001",
    propuestaId: ids.proposal,
    nombre: "Integración CCTV y monitoreo planta Curicó",
    clienteId: ids.client,
    instalacionId: ids.site,
    ejecutivo: "Demo Comercial",
    categoria: "Seguridad electrónica",
    centroCosto: "QA-ROBLES",
    subCentroCosto: "CURICO-SEG",
    valorVendido: 18500000,
    valorProyecto: 18500000,
    valorFinal: 18500000,
    costoEstimado: 11350000,
    fechaAprobacion: today,
    fechaInicio: addDays(3),
    fechaTermino: addDays(28),
    estadoOp: "En ejecución",
    estadoFin: "Cobrado parcial",
    nroFactura: "QA-F001",
    montoFacturado: 7400000,
    hitosFacturacion: [
      { id: "qa-hito-1", nombre: "Anticipo 40%", pct: 40, monto: 7400000, estado: "Cobrado", nroFactura: "QA-F001", facturaId: ids.invoice1, fechaFacturacion: addDays(-4), fechaCobro: addDays(-2) },
      { id: "qa-hito-2", nombre: "Cierre técnico 60%", pct: 60, monto: 11100000, estado: "Pendiente", nroFactura: "", fechaFacturacion: addDays(25) },
    ],
    tareas: [
      { id: "qa-tarea-1", nombre: "Levantamiento técnico", descripcion: "Validar puntos críticos y canalizaciones.", estado: "Completada", etapa: "Plan", duracionEstimada: 5, fechaTerminada: addDays(-3), orden: 0 },
      { id: "qa-tarea-2", nombre: "Montaje de cámaras", descripcion: "Instalar 24 cámaras IP.", estado: "En ejecución", etapa: "En terreno", duracionEstimada: 24, orden: 1 },
      { id: "qa-tarea-3", nombre: "Configuración alarmas", descripcion: "Configurar 4 alarmas y pruebas de señal.", estado: "Pendiente", etapa: "En terreno", duracionEstimada: 8, orden: 2 },
      { id: "qa-tarea-4", nombre: "Pruebas de monitoreo", descripcion: "Validar eventos con central.", estado: "Pendiente", etapa: "Análisis", duracionEstimada: 6, orden: 3 },
      { id: "qa-tarea-5", nombre: "Acta y activación", descripcion: "Firma de cierre y activación recurrente.", estado: "Pendiente", etapa: "Cierre", duracionEstimada: 4, orden: 4 },
    ],
    costos: [
      { id: "qa-costo-1", tipo: "Materiales", desc: "Cámaras, NVR, alarmas, cableado y accesorios", monto: 8200000, total: 8200000, origen: "manual", fecha: today },
      { id: "qa-costo-2", tipo: "Mano de obra", desc: "Equipo técnico interno", monto: 2100000, total: 2100000, origen: "manual", fecha: today },
      { id: "qa-costo-3", tipo: "Subcontrato", desc: "Apoyo montaje altura", monto: 1050000, total: 1050000, origen: "manual", fecha: today },
    ],
    solicitudesMaterial: [{
      id: "qa-sol-1",
      tecnicoNombre: "Técnico QA",
      estado: "entregada",
      fecha: today,
      items: [{ nombre: "Cable UTP Cat6 exterior", cantidad: 800, unidad: "m" }, { nombre: "Conectores RJ45", cantidad: 120, unidad: "un" }],
      fechaDecision: now,
    }],
    timeline: [{ fecha: now, tipo: "qa", desc: "Flujo integral QA cargado." }],
    observaciones: "Proyecto QA creado para validar dashboard, pipeline, proyectos, técnico, servicios recurrentes y finanzas.",
    createdAt: now,
    updatedAt: now,
  }],
  facturas: [
    { id: ids.invoice1, folio: "QA-F001", origen: "softland", rutCliente: "76.987.654-3", clienteId: ids.client, proyectoId: ids.project, centroCosto: "QA-ROBLES", fechaEmision: addDays(-4), fechaVencimiento: addDays(11), monto: 7400000, montoPagado: 7400000, saldo: 0, estado: "Emitida", hitoId: "qa-hito-1", observaciones: "Anticipo proyecto QA." },
    { id: ids.invoice2, folio: "QA-F002", origen: "softland", rutCliente: "76.987.654-3", clienteId: ids.client, proyectoId: ids.project, centroCosto: "QA-ROBLES", fechaEmision: addDays(25), fechaVencimiento: addDays(55), monto: 11100000, montoPagado: 0, saldo: 11100000, estado: "Programada", hitoId: "qa-hito-2", observaciones: "Factura esperada al cierre técnico." },
  ],
  pagos: [{ id: ids.payment1, facturaId: ids.invoice1, folioFactura: "QA-F001", origen: "softland", fechaPago: addDays(-2), monto: 7400000, medio: "Transferencia", observaciones: "Pago QA anticipo.", createdAt: now }],
  cuentasPagar: [
    { id: ids.ap1, origen: "softland", numeroDocumento: "QA-OC-001", folio: "QA-OC-001", proveedor: "Proveedor Seguridad QA", rutProveedor: "77.111.222-3", proyectoId: ids.project, fechaEmision: addDays(-5), fechaVencimiento: addDays(20), vencimiento: addDays(20), monto: 8200000, montoPagado: 0, saldo: 8200000, estado: "Pendiente", centroCosto: "QA-ROBLES" },
    { id: ids.ap2, origen: "manual", numeroDocumento: "QA-OC-002", folio: "QA-OC-002", proveedor: "Montajes Altura QA", rutProveedor: "76.222.333-4", proyectoId: ids.project, fechaEmision: today, fechaVencimiento: addDays(35), vencimiento: addDays(35), monto: 1050000, montoPagado: 0, saldo: 1050000, estado: "Pendiente", centroCosto: "QA-ROBLES" },
  ],
  serviciosRecurrentes: [{
    id: ids.service,
    codigo: "SRV-QA-001",
    clienteId: ids.client,
    instalacionId: ids.site,
    proyectoId: ids.project,
    propuestaId: ids.proposal,
    tipoServicio: "Videoverificación",
    estado: "Activo",
    valorMensual: 1450000,
    camaras: 24,
    alarmas: 4,
    videoVerificacion: 1,
    periodicidad: "Mensual",
    periodicidadFacturacion: "Mensual",
    fechaInicio: addDays(30),
    responsable: "Central de monitoreo",
    horario: "Lunes a domingo 20:00 a 08:00",
    instrucciones: "Validar eventos por video, contactar responsable operativo y escalar a administración si existe evidencia crítica.",
    contactos: [
      { id: "qa-contacto-1", nombre: "Jorge Paredes", telefono: "+56 9 3333 4444", email: "", rol: "Operativo" },
      { id: "qa-contacto-2", nombre: "María Valenzuela", telefono: "+56 9 1111 2222", email: "maria.valenzuela@losrobles.qa", rol: "Administración" },
    ],
    activos: [
      { id: "qa-activo-1", tipo: "Cámara", nombre: "Cámara acceso principal", estado: "Activo" },
      { id: "qa-activo-2", tipo: "Alarma", nombre: "Panel bodega norte", estado: "Activo" },
    ],
    origen: "assur",
    createdAt: now,
    updatedAt: now,
  }],
  serviceBillingExpectations: [0, 1, 2].map((idx) => {
    const date = new Date(addDays(30));
    date.setMonth(date.getMonth() + idx);
    const expectedMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
    return {
      id: `exp-${ids.service}-${expectedMonth}`,
      servicioId: ids.service,
      clienteId: ids.client,
      instalacionId: ids.site,
      proyectoId: ids.project,
      expectedMonth,
      expectedAmount: 1450000,
      status: "Esperada",
      source: "assur",
      updatedAt: now,
    };
  }),
};

function metadataWithout(row, fields = []) {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !fields.includes(key)));
}

const rows = {
  companies: [{ id: COMPANY_ID, name: "ASSUR Chile", rut: null }],
  clients: local.clientes.map((c) => ({
    id: c.id, company_id: COMPANY_ID, rut: c.rut, legal_name: c.razonSocial, commercial_name: c.nombreComercial,
    status: c.estado, executive: c.ejecutivo, source: c.origen, external_id: null,
    metadata: metadataWithout(c, ["id", "rut", "razonSocial", "nombreComercial", "estado", "ejecutivo", "origen"]),
    created_at: c.createdAt, updated_at: c.updatedAt,
  })),
  sites: local.instalaciones.map((i) => ({
    id: i.id, company_id: COMPANY_ID, client_id: i.clienteId, name: i.nombre, city: i.ciudad, region: i.region,
    address: i.direccion, status: i.estado,
    metadata: metadataWithout(i, ["id", "clienteId", "nombre", "ciudad", "region", "direccion", "estado"]),
    created_at: i.createdAt, updated_at: i.updatedAt,
  })),
  opportunities: local.oportunidades.map((o) => ({
    id: o.id, company_id: COMPANY_ID, client_id: o.clienteId, site_id: o.instalacionId, title: o.titulo,
    stage: o.etapa, probability: o.probabilidad, estimated_value: o.valorEstimado, estimated_mrr: o.mrrEstimado,
    executive: o.ejecutivo, expected_close_date: o.fechaCierreEstimada,
    metadata: metadataWithout(o, ["id", "clienteId", "instalacionId", "titulo", "etapa", "probabilidad", "valorEstimado", "mrrEstimado", "ejecutivo", "fechaCierreEstimada"]),
    created_at: o.createdAt, updated_at: o.updatedAt,
  })),
  proposals: local.propuestas.map((p) => ({
    id: p.id, company_id: COMPANY_ID, client_id: p.clienteId, site_id: p.instalacionId, opportunity_id: p.oportunidadId,
    number: p.numero, name: p.nombre, status: p.estado, executive: p.ejecutivo, net_project_value: p.valorFinal,
    estimated_cost: p.costoEstimado, monthly_recurring_value: p.mrr, source: p.origen,
    metadata: metadataWithout(p, ["id", "clienteId", "instalacionId", "oportunidadId", "numero", "nombre", "estado", "ejecutivo", "valorFinal", "costoEstimado", "mrr", "origen"]),
    created_at: p.createdAt, updated_at: p.updatedAt,
  })),
  quotes: local.cotizaciones.map((q) => ({
    id: q.id, company_id: COMPANY_ID, client_id: q.clienteId, site_id: q.instalacionId, proposal_id: q.propuestaId,
    number: q.numero, status: q.estado, net_amount: q.precioNeto,
    metadata: metadataWithout(q, ["id", "clienteId", "instalacionId", "propuestaId", "numero", "estado", "precioNeto"]),
    created_at: q.createdAt, updated_at: q.updatedAt,
  })),
  projects: local.proyectos.map((p) => ({
    id: p.id, company_id: COMPANY_ID, client_id: p.clienteId, site_id: p.instalacionId, proposal_id: p.propuestaId,
    code: p.codigo, name: p.nombre, category: p.categoria, operational_status: p.estadoOp, financial_status: p.estadoFin,
    sold_value: p.valorVendido, estimated_cost: p.costoEstimado, cost_center: p.centroCosto, start_date: p.fechaInicio, end_date: p.fechaTermino,
    metadata: metadataWithout(p, ["id", "clienteId", "instalacionId", "propuestaId", "codigo", "nombre", "categoria", "estadoOp", "estadoFin", "valorVendido", "costoEstimado", "centroCosto", "fechaInicio", "fechaTermino"]),
    created_at: p.createdAt, updated_at: p.updatedAt,
  })),
  project_tasks: local.proyectos.flatMap((p) => p.tareas.map((t) => ({
    id: t.id, company_id: COMPANY_ID, project_id: p.id, title: t.nombre, stage: t.etapa, status: t.estado,
    assigned_to: null, estimated_hours: t.duracionEstimada, started_at: null, completed_at: null,
    metadata: metadataWithout(t, ["id", "nombre", "etapa", "estado", "duracionEstimada"]),
    created_at: now, updated_at: now,
  }))),
  recurring_services: local.serviciosRecurrentes.map((s) => ({
    id: s.id, company_id: COMPANY_ID, client_id: s.clienteId, site_id: s.instalacionId, project_id: s.proyectoId,
    proposal_id: s.propuestaId, code: s.codigo, service_type: s.tipoServicio, status: s.estado, monthly_value: s.valorMensual,
    cameras: s.camaras, alarms: s.alarmas, video_verification: s.videoVerificacion, billing_frequency: s.periodicidadFacturacion,
    start_date: s.fechaInicio, responsible: s.responsable, source: s.origen, external_id: null,
    metadata: metadataWithout(s, ["id", "clienteId", "instalacionId", "proyectoId", "propuestaId", "codigo", "tipoServicio", "estado", "valorMensual", "camaras", "alarmas", "videoVerificacion", "periodicidadFacturacion", "fechaInicio", "responsable", "origen"]),
    created_at: s.createdAt, updated_at: s.updatedAt,
  })),
  invoices: local.facturas.map((f) => ({
    id: f.id, company_id: COMPANY_ID, client_id: f.clienteId, project_id: f.proyectoId, folio: f.folio,
    issue_date: f.fechaEmision, due_date: f.fechaVencimiento, amount: f.monto, paid_amount: f.montoPagado,
    status: f.estado, source: f.origen, external_id: null,
    metadata: metadataWithout(f, ["id", "clienteId", "proyectoId", "folio", "fechaEmision", "fechaVencimiento", "monto", "montoPagado", "estado", "origen"]),
    created_at: now, updated_at: now,
  })),
  payments: local.pagos.map((p) => ({
    id: p.id, company_id: COMPANY_ID, invoice_id: p.facturaId, payment_date: p.fechaPago,
    amount: p.monto, method: p.medio, source: p.origen, external_id: null,
    metadata: metadataWithout(p, ["id", "facturaId", "fechaPago", "monto", "medio", "origen"]),
    created_at: now,
  })),
  accounts_payable: local.cuentasPagar.map((c) => ({
    id: c.id, company_id: COMPANY_ID, project_id: c.proyectoId, supplier_name: c.proveedor, folio: c.folio || c.numeroDocumento,
    issue_date: c.fechaEmision, due_date: c.fechaVencimiento || c.vencimiento, amount: c.monto, paid_amount: c.montoPagado || 0,
    status: c.estado, source: c.origen, external_id: null,
    metadata: metadataWithout(c, ["id", "proyectoId", "proveedor", "folio", "numeroDocumento", "fechaEmision", "fechaVencimiento", "vencimiento", "monto", "montoPagado", "estado", "origen"]),
    created_at: now, updated_at: now,
  })),
  service_billing_expectations: local.serviceBillingExpectations.map((e) => ({
    id: e.id, company_id: COMPANY_ID, recurring_service_id: e.servicioId, client_id: e.clienteId,
    expected_month: e.expectedMonth, expected_amount: e.expectedAmount, status: e.status, invoice_id: null,
    metadata: metadataWithout(e, ["id", "servicioId", "clienteId", "expectedMonth", "expectedAmount", "status"]),
    created_at: now, updated_at: now,
  })),
};

async function request(path, { method = "GET", body, token, prefer = "resolution=merge-duplicates,return=representation" } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token || anonKey}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${await response.text()}`);
  if (response.status === 204) return null;
  return response.json();
}

async function login() {
  return request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
}

fs.mkdirSync(new URL("tmp", ROOT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(local, null, 2));

const auth = await login();
const token = auth.access_token;
const result = {};
for (const table of [
  "clients", "sites", "opportunities", "proposals", "quotes", "projects", "project_tasks",
  "recurring_services", "invoices", "payments", "accounts_payable", "service_billing_expectations",
]) {
  const data = rows[table] || [];
  result[table] = data.length
    ? (await request(`/rest/v1/${table}?on_conflict=id`, { method: "POST", token, body: data })).length
    : 0;
}

console.log(JSON.stringify({ ok: true, localFile: OUT.pathname, result }, null, 2));
