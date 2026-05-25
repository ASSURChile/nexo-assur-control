const baseUrl = process.env.ASSUR_BACKEND_URL || "http://127.0.0.1:8787";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || `HTTP ${response.status}`);
  return body;
}

const marker = `backend-test-${Date.now()}`;

async function crudEntity(entity, item, patch, assertPatched) {
  const created = await request(`/api/entities/${entity}`, {
    method: "POST",
    body: JSON.stringify(item),
  });

  if (!created.id) throw new Error(`${entity}: el registro creado no tiene id.`);

  const patched = await request(`/api/entities/${entity}/${encodeURIComponent(created.id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

  assertPatched(patched);

  const loaded = await request(`/api/entities/${entity}/${encodeURIComponent(created.id)}`);
  if (!loaded.id) throw new Error(`${entity}: GET por id no recuperó el registro.`);

  await request(`/api/entities/${entity}/${encodeURIComponent(created.id)}`, { method: "DELETE" });
}

try {
  await crudEntity("clientes", {
      razonSocial: marker,
      rut: "99.999.999-9",
      estado: "Prospecto",
      origen: "test",
    },
    { estado: "Activo" },
    (row) => {
      if (row.estado !== "Activo") throw new Error("clientes: PATCH no actualizó el estado.");
    });

  await crudEntity("proyectos", {
      nombre: marker,
      estadoOp: "Planificación",
      valorVendido: 1000000,
      origen: "test",
    },
    { estadoOp: "En ejecución" },
    (row) => {
      if (row.estadoOp !== "En ejecución") throw new Error("proyectos: PATCH no actualizó estadoOp.");
    });

  await crudEntity("serviciosRecurrentes", {
      codigo: marker,
      tipoServicio: "Videoverificación",
      estado: "En activación",
      valorMensual: 120000,
      origen: "test",
    },
    { estado: "Activo" },
    (row) => {
      if (row.estado !== "Activo") throw new Error("serviciosRecurrentes: PATCH no actualizó estado.");
    });

  await crudEntity("eventosServicio", {
      titulo: marker,
      tipo: "Falla",
      severidad: "Media",
      estado: "Abierto",
      origen: "test",
    },
    { estado: "Cerrado" },
    (row) => {
      if (row.estado !== "Cerrado") throw new Error("eventosServicio: PATCH no actualizó estado.");
    });

  await crudEntity("serviceBillingExpectations", {
      servicioId: marker,
      expectedMonth: "2026-05-01",
      expectedAmount: 120000,
      status: "Esperada",
    },
    { status: "Conciliada" },
    (row) => {
      if (row.status !== "Conciliada") throw new Error("serviceBillingExpectations: PATCH no actualizó status.");
    });

  await crudEntity("facturas", {
      folio: marker,
      rutCliente: "99.999.999-9",
      fechaEmision: "2026-05-01",
      monto: 200000,
      montoPagado: 0,
      estado: "Emitida",
    },
    { montoPagado: 50000 },
    (row) => {
      if (row.montoPagado !== 50000) throw new Error("facturas: PATCH no actualizó montoPagado.");
    });

  await crudEntity("pagos", {
      folioFactura: marker,
      fechaPago: "2026-05-02",
      monto: 50000,
      medio: "Transferencia",
    },
    { medio: "Banco" },
    (row) => {
      if (row.medio !== "Banco") throw new Error("pagos: PATCH no actualizó medio.");
    });

  await crudEntity("cuentasPagar", {
      proveedor: "Proveedor Test",
      numeroDocumento: marker,
      fecha: "2026-05-01",
      vencimiento: "2026-05-30",
      monto: 100000,
      estado: "Pendiente",
    },
    { estado: "Pagada" },
    (row) => {
      if (row.estado !== "Pagada") throw new Error("cuentasPagar: PATCH no actualizó estado.");
    });

  await crudEntity("gastos", {
      fecha: "2026-05-01",
      categoria: "Otros administrativos",
      descripcion: marker,
      monto: 30000,
      recurrente: false,
    },
    { recurrente: true },
    (row) => {
      if (row.recurrente !== true) throw new Error("gastos: PATCH no actualizó recurrente.");
    });

  console.log("Backend CRUD OK");
} catch (error) {
  console.error(`Backend CRUD falló en ${baseUrl}`);
  console.error(error.message);
  process.exit(1);
}
