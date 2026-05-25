class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

const { repositories: repo } = await import("../src/services/repositories.js");
const { initDefaults, seedPatagoniaFreshDemo } = await import("../src/services/bootstrapService.js");
const { loginDemoUser, clearSession } = await import("../src/services/authService.js");
const { buildServicioDesdeProyecto, buildBillingExpectationsForService, calcServiciosKpis, reconcileBillingExpectations } = await import("../src/domain/recurringServices.js");
const { calcFinanceSummary, calcProjectFinance } = await import("../src/domain/finance.js");
const { buildBackupPayload } = await import("../src/services/backupService.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function save(repoApi, item) {
  repoApi.save(item);
  return item;
}

const now = new Date().toISOString();
const today = now.slice(0, 10);

initDefaults();
seedPatagoniaFreshDemo();

const admin = loginDemoUser({ email: "admin@assur.cl", password: "admin123" });
assert(admin?.rol === "admin", "Login admin no funciona.");
clearSession();
const tecnico = loginDemoUser({ email: "tec@assur.cl", password: "tec123" });
assert(tecnico?.rol === "tecnico" && tecnico?.tecnicoId, "Login técnico o vínculo técnico no funciona.");
clearSession();

const cliente = save(repo.clientes, {
  id: "qa-cliente",
  razonSocial: "QA Cliente Industrial SpA",
  nombreComercial: "QA Industrial",
  rut: "76.000.111-2",
  estado: "Activo",
  ejecutivo: "QA Ejecutivo",
  centroCosto: "QA-001",
  createdAt: now,
  updatedAt: now,
});

const instalacion = save(repo.instalaciones, {
  id: "qa-instalacion",
  nombre: "Planta QA",
  clienteId: cliente.id,
  comuna: "Molina",
  region: "Maule",
  estado: "Activa",
  updatedAt: now,
});

const oportunidad = save(repo.oportunidades, {
  id: "qa-oportunidad",
  numero: "QA-OP-001",
  clienteId: cliente.id,
  instalacionId: instalacion.id,
  titulo: "Proyecto QA integral",
  etapa: "Negociación",
  probabilidad: 80,
  valorEstimado: 18500000,
  mrrEstimado: 950000,
});

const propuesta = save(repo.propuestas, {
  id: "qa-propuesta",
  oportunidadId: oportunidad.id,
  nombre: "Proyecto QA integral",
  estado: "Aprobada",
  baseProyectoNeto: 18500000,
  valorProyecto: 18500000,
  valorFinal: 18500000,
  baseRecMes: 950000,
  camaras: 16,
  alarmas: 2,
  duracionContrato: 36,
  updatedAt: now,
});

const proyecto = save(repo.proyectos, {
  id: "qa-proyecto",
  codigo: "QA-PRY-001",
  nombre: "Proyecto QA integral",
  clienteId: cliente.id,
  instalacionId: instalacion.id,
  propuestaId: propuesta.id,
  valorVendido: 18500000,
  estadoOp: "En ejecución",
  costos: [{ id: "qa-costo-1", tipo: "Materiales", total: 9200000 }],
  hitosFacturacion: [
    { id: "qa-hito-1", nombre: "Anticipo", pct: 50, monto: 9250000, estado: "Facturado" },
    { id: "qa-hito-2", nombre: "Cierre", pct: 50, monto: 9250000, estado: "Pendiente" },
  ],
  tareas: [{ id: "qa-tarea-1", nombre: "Instalación cámaras", estado: "Pendiente" }],
  updatedAt: now,
});

const servicio = save(repo.serviciosRecurrentes, {
  ...buildServicioDesdeProyecto({ proyecto, propuesta, clientes: [cliente], instalaciones: [instalacion], mrr: 950000, id: () => `qa-id-${Math.random().toString(36).slice(2, 8)}`, now: () => new Date(now) }),
  id: "qa-servicio",
  estado: "Activo",
  fechaInicio: today,
  contactos: [{ id: "qa-contacto", nombre: "Responsable QA", telefono: "+56911111111", rol: "Operativo" }],
  horario: "24/7",
  instrucciones: "Protocolo QA",
  updatedAt: now,
});

const expectations = buildBillingExpectationsForService({ servicio, months: 3, startDate: today });
repo.serviceBillingExpectations.replaceAll([...repo.serviceBillingExpectations.list(), ...expectations]);

const factura = save(repo.facturas, {
  id: "qa-factura",
  folio: "QA-F-001",
  numeroFactura: "QA-F-001",
  rutCliente: cliente.rut,
  proyectoId: proyecto.id,
  hitoId: "qa-hito-1",
  fechaEmision: today,
  fechaVencimiento: today,
  monto: 9250000,
  montoTotal: 9250000,
  montoPagado: 3000000,
  saldo: 6250000,
  estado: "Emitida",
  origen: "manual",
  updatedAt: now,
});

save(repo.pagos, {
  id: "qa-pago",
  folioFactura: factura.folio,
  fechaPago: today,
  monto: 3000000,
  medio: "Transferencia",
  origen: "manual",
  updatedAt: now,
});

save(repo.cuentasPagar, {
  id: "qa-cxp",
  proveedor: "Proveedor QA",
  numeroDocumento: "QA-CXP-001",
  fecha: today,
  vencimiento: today,
  monto: 4100000,
  saldo: 4100000,
  estado: "Pendiente",
  centroCosto: "QA-001",
  origen: "manual",
  updatedAt: now,
});

save(repo.gastos, {
  id: "qa-gasto",
  fecha: today,
  categoria: "Otros administrativos",
  descripcion: "Gasto QA recurrente",
  monto: 250000,
  recurrente: true,
  updatedAt: now,
});

save(repo.incidencias, {
  id: "qa-incidencia",
  proyectoId: proyecto.id,
  titulo: "Incidencia QA",
  estado: "Abierta",
  prioridad: "Alta",
  updatedAt: now,
});

save(repo.fichajes, {
  id: "qa-fichaje",
  proyectoId: proyecto.id,
  tareaId: "qa-tarea-1",
  tecnicoId: tecnico.tecnicoId,
  inicio: now,
  estado: "activo",
});

const finance = calcFinanceSummary({
  facturas: repo.facturas.list(),
  cuentasPorPagar: repo.cuentasPagar.list(),
  gastos: repo.gastos.list(),
  hoy: today,
});
assert(finance.cxcTotal > 0, "CxC no calcula saldo pendiente.");
assert(finance.totalCxp > 0, "CxP no calcula saldo pendiente.");
assert(finance.gastoRecurrenteMensual > 0, "Gastos recurrentes no alimentan caja.");

const projectFinance = calcProjectFinance({ proyecto, facturas: repo.facturas.list(), pagos: repo.pagos.list(), params: repo.params.get() });
assert(projectFinance.facturado > 0, "Proyecto no vincula facturación.");
assert(projectFinance.costoReal > 0, "Proyecto no calcula costo real.");

const serviceKpis = calcServiciosKpis(repo.serviciosRecurrentes.list());
assert(serviceKpis.mrrActivo > 0, "Servicios no calculan MRR activo.");

const reconciliation = reconcileBillingExpectations({
  expectations: repo.serviceBillingExpectations.list(),
  facturas: repo.facturas.list(),
  servicios: repo.serviciosRecurrentes.list(),
  clientes: repo.clientes.list(),
  hoy: today,
});
assert(reconciliation.rows.length > 0, "Conciliación recurrente no genera filas.");

const backup = buildBackupPayload();
assert(!("usuarios" in backup), "Backup operativo no debe exportar usuarios.");

const report = {
  clientes: repo.clientes.list().length,
  instalaciones: repo.instalaciones.list().length,
  oportunidades: repo.oportunidades.list().length,
  propuestas: repo.propuestas.list().length,
  proyectos: repo.proyectos.list().length,
  servicios: repo.serviciosRecurrentes.list().length,
  facturas: repo.facturas.list().length,
  pagos: repo.pagos.list().length,
  cuentasPagar: repo.cuentasPagar.list().length,
  gastos: repo.gastos.list().length,
  incidencias: repo.incidencias.list().length,
  fichajes: repo.fichajes.list().length,
  cxcTotal: finance.cxcTotal,
  totalCxp: finance.totalCxp,
  mrrActivo: serviceKpis.mrrActivo,
};

console.log("Functional audit OK");
console.log(JSON.stringify(report, null, 2));
