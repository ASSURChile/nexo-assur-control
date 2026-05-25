export const CASH_BUCKETS_90 = [
  { id: "30", label: "0-30 días", from: 0, to: 30 },
  { id: "60", label: "31-60 días", from: 31, to: 60 },
  { id: "90", label: "61-90 días", from: 61, to: 90 },
];

export function montoFactura(factura) {
  return factura?.monto ?? factura?.montoTotal ?? 0;
}

export function saldoFactura(factura) {
  return factura?.saldo ?? Math.max(0, (montoFactura(factura) || 0) - (factura?.montoPagado || 0));
}

export function vencFactura(factura) {
  return factura?.fechaVencimiento || factura?.vencimiento || "";
}

export function montoCxp(cuenta) {
  return cuenta?.saldo ?? cuenta?.monto ?? cuenta?.montoTotal ?? 0;
}

export function vencCxp(cuenta) {
  return cuenta?.vencimiento || cuenta?.fechaVencimiento || "";
}

export function diasHasta(fecha, hoy = new Date().toISOString().slice(0, 10)) {
  return fecha ? Math.ceil((new Date(fecha) - new Date(hoy)) / 86400000) : null;
}

export function diasDesde(fecha, hoy = new Date().toISOString().slice(0, 10)) {
  return fecha ? Math.floor((new Date(hoy) - new Date(fecha)) / 86400000) : null;
}

export function calcAgingCxC(facturas, hoy = new Date().toISOString().slice(0, 10)) {
  const aging = { "0-30": 0, "30-60": 0, "60-90": 0, "+90": 0 };
  facturas.forEach((f) => {
    const dias = diasDesde(vencFactura(f), hoy);
    const monto = saldoFactura(f);
    if (dias === null || monto <= 0) return;
    if (dias <= 30) aging["0-30"] += monto;
    else if (dias <= 60) aging["30-60"] += monto;
    else if (dias <= 90) aging["60-90"] += monto;
    else aging["+90"] += monto;
  });
  return aging;
}

export function calcFinanceSummary({ facturas = [], cuentasPorPagar = [], gastos = [], hoy = new Date().toISOString().slice(0, 10), buckets = CASH_BUCKETS_90 }) {
  const facturasEmitidas = facturas.filter((f) => f.estado !== "Anulada");
  const cxcPendientes = facturasEmitidas.filter((f) => saldoFactura(f) > 0);
  const cxcTotal = cxcPendientes.reduce((s, f) => s + saldoFactura(f), 0);
  const cxcVencidas = cxcPendientes.filter((f) => vencFactura(f) && vencFactura(f) < hoy);
  const montoVencido = cxcVencidas.reduce((s, f) => s + saldoFactura(f), 0);

  const cxpPendientes = cuentasPorPagar.filter((c) => c.estado !== "Pagada" && c.estado !== "Anulada");
  const totalCxp = cxpPendientes.reduce((s, c) => s + montoCxp(c), 0);
  const cxpVencidas = cxpPendientes.filter((c) => vencCxp(c) && vencCxp(c) < hoy);
  const montoCxpVencido = cxpVencidas.reduce((s, c) => s + montoCxp(c), 0);
  const capitalTrabajo = cxcTotal - totalCxp;
  const aging = calcAgingCxC(cxcVencidas, hoy);

  const proxVencer = cxcPendientes.filter((f) => {
    const fv = vencFactura(f);
    if (!fv || fv < hoy) return false;
    const dias = diasHasta(fv, hoy);
    return dias !== null && dias <= 7;
  });

  const gastoRecurrenteMensual = gastos.filter((g) => g.recurrente).reduce((s, g) => s + (g.monto || 0), 0);
  const cajaProyectada = buckets.map((b) => {
    const ingresos = cxcPendientes
      .filter((f) => {
        const d = diasHasta(vencFactura(f), hoy);
        return d !== null && d >= b.from && d <= b.to;
      })
      .reduce((s, f) => s + saldoFactura(f), 0);
    const egresosCxp = cxpPendientes
      .filter((c) => {
        const d = diasHasta(vencCxp(c), hoy);
        return d !== null && d >= b.from && d <= b.to;
      })
      .reduce((s, c) => s + montoCxp(c), 0);
    const egresosRecurrentes = gastoRecurrenteMensual;
    const egresos = egresosCxp + egresosRecurrentes;
    return { ...b, ingresos, egresosCxp, egresosRecurrentes, egresos, saldo: ingresos - egresos, saldoAcum: 0 };
  });
  cajaProyectada.forEach((b, i) => {
    b.saldoAcum = cajaProyectada.slice(0, i + 1).reduce((s, x) => s + x.saldo, 0);
  });
  const ingresos90 = cajaProyectada.reduce((s, b) => s + b.ingresos, 0);
  const egresos90 = cajaProyectada.reduce((s, b) => s + b.egresos, 0);
  const saldo90 = ingresos90 - egresos90;
  const liquidez90 = capitalTrabajo + saldo90;
  const cxp30 = cxpPendientes
    .filter((c) => {
      const d = diasHasta(vencCxp(c), hoy);
      return d !== null && d >= 0 && d <= 30;
    })
    .reduce((s, c) => s + montoCxp(c), 0);

  return {
    facturasEmitidas,
    cxcPendientes,
    cxcTotal,
    cxcVencidas,
    montoVencido,
    cxpPendientes,
    totalCxp,
    cxpVencidas,
    montoCxpVencido,
    capitalTrabajo,
    aging,
    proxVencer,
    gastoRecurrenteMensual,
    cajaProyectada,
    ingresos90,
    egresos90,
    saldo90,
    liquidez90,
    cxp30,
  };
}

export function calcProjectFinance({ proyecto, facturas = [], pagos = [], params = {} }) {
  const facturasProyecto = facturas.filter((f) => f.proyectoId === proyecto.id);
  const folios = new Set(facturasProyecto.map((f) => f.folio).filter(Boolean));
  const pagosProyecto = pagos.filter((pg) => folios.has(pg.folioFactura));
  const facturado = facturasProyecto.reduce((s, f) => s + montoFactura(f), 0) || (proyecto.montoFacturado || 0);
  const cobradoFacturas = facturasProyecto.reduce((s, f) => s + (montoFactura(f) - saldoFactura(f)), 0);
  const cobradoPagos = pagosProyecto.reduce((s, pg) => s + (pg.monto || 0), 0);
  const cobrado = Math.max(cobradoFacturas, cobradoPagos, proyecto.estadoFin === "Cobrado" ? proyecto.montoFacturado || 0 : 0);
  const costosDirectos = (proyecto.costos || []).reduce((s, c) => s + (c.total || 0), 0);
  const gg = costosDirectos * ((proyecto.pctGG ?? params.pctGG ?? 10) / 100);
  const imp = costosDirectos * ((proyecto.pctImp ?? params.pctImp ?? 5) / 100);
  const costoReal = costosDirectos + gg + imp;
  const utilidadReal = (proyecto.valorVendido || 0) - costoReal;
  const utilidadCobrada = cobrado - costoReal;
  return {
    facturado,
    cobrado,
    pendienteVenta: Math.max(0, (proyecto.valorVendido || 0) - cobrado),
    pendienteCxC: Math.max(0, facturado - cobrado),
    costoReal,
    utilidadReal,
    utilidadCobrada,
    margenReal: (proyecto.valorVendido || 0) > 0 ? utilidadReal / (proyecto.valorVendido || 0) : 0,
    margenCobrado: cobrado > 0 ? utilidadCobrada / cobrado : null,
    avanceCobro: (proyecto.valorVendido || 0) > 0 ? cobrado / (proyecto.valorVendido || 0) : 0,
    facturas: facturasProyecto,
  };
}

export function normalizeRut(value = "") {
  return String(value || "").replace(/\./g, "").replace(/\s/g, "").toUpperCase();
}

export function reconcileSoftlandFinancials({ clientes = [], proyectos = [], facturas = [], pagos = [], cuentasPorPagar = [] } = {}) {
  const clientsByRut = new Map(clientes.map((cliente) => [normalizeRut(cliente.rut), cliente]).filter(([rut]) => rut));
  const clientsByCostCenter = new Map(clientes.map((cliente) => [cliente.centroCosto, cliente]).filter(([cc]) => cc));
  const projectsByCostCenter = new Map(proyectos.map((proyecto) => [proyecto.centroCosto, proyecto]).filter(([cc]) => cc));
  const projectsByClient = new Map();
  proyectos.forEach((proyecto) => {
    if (!proyecto.clienteId) return;
    projectsByClient.set(proyecto.clienteId, [...(projectsByClient.get(proyecto.clienteId) || []), proyecto]);
  });

  const invoices = facturas.map((factura) => {
    const folio = factura.folio || factura.numeroFactura || "";
    const cliente = clientsByRut.get(normalizeRut(factura.rutCliente)) || clientsByCostCenter.get(factura.centroCosto) || null;
    const project = factura.proyectoId
      ? proyectos.find((p) => p.id === factura.proyectoId)
      : projectsByCostCenter.get(factura.centroCosto) || (cliente && (projectsByClient.get(cliente.id) || []).length === 1 ? projectsByClient.get(cliente.id)[0] : null);
    const relatedPayments = pagos.filter((pago) => (pago.folioFactura || pago.folio || pago.numeroFactura) === folio || pago.facturaId === factura.id);
    const paidByPayments = relatedPayments.reduce((sum, pago) => sum + (pago.monto || pago.montoPagado || 0), 0);
    const paid = Math.max(factura.montoPagado || 0, paidByPayments);
    const amount = montoFactura(factura);
    const balance = Math.max(0, amount - paid);
    return {
      ...factura,
      folio,
      clienteId: factura.clienteId || cliente?.id || "",
      proyectoId: factura.proyectoId || project?.id || "",
      monto: amount,
      montoPagado: paid,
      saldo: balance,
      estado: balance <= 0 && amount > 0 ? "Pagada" : paid > 0 ? "Parcial" : factura.estado || "Emitida",
      conciliacion: {
        cliente: cliente ? "match" : "pendiente",
        proyecto: project ? "match" : "pendiente",
        pagos: relatedPayments.length,
      },
    };
  });

  const ap = cuentasPorPagar.map((cuenta) => {
    const project = cuenta.proyectoId ? proyectos.find((p) => p.id === cuenta.proyectoId) : projectsByCostCenter.get(cuenta.centroCosto) || null;
    return {
      ...cuenta,
      proyectoId: cuenta.proyectoId || project?.id || "",
      conciliacion: {
        proyecto: project ? "match" : "pendiente",
      },
    };
  });

  const summary = {
    facturas: invoices.length,
    facturasConCliente: invoices.filter((f) => f.clienteId).length,
    facturasConProyecto: invoices.filter((f) => f.proyectoId).length,
    facturasConPagos: invoices.filter((f) => f.conciliacion.pagos > 0).length,
    cuentasPagar: ap.length,
    cuentasPagarConProyecto: ap.filter((c) => c.proyectoId).length,
  };

  return { facturas: invoices, cuentasPorPagar: ap, summary };
}
