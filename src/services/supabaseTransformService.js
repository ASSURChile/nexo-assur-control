const DEFAULT_COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const toArray = (value) => Array.isArray(value) ? value : [];
const text = (value) => String(value || "").trim();
const money = (value) => Number(value) || 0;
const dateOnly = (value) => text(value).slice(0, 10) || null;
const iso = (value) => text(value) || new Date().toISOString();
const uuidOrNull = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text(value)) ? text(value) : null;
const metadataWithout = (row, fields = []) => {
  const blocked = new Set(["password", ...fields]);
  return Object.fromEntries(Object.entries(row || {}).filter(([key]) => !blocked.has(key)));
};

function rowId(row, prefix, index) {
  return text(row?.id) || `${prefix}-${String(index + 1).padStart(4, "0")}`;
}

function clienteNombre(cliente) {
  return text(cliente?.razonSocial) || text(cliente?.nombre) || text(cliente?.legalName) || "Cliente sin nombre";
}

function instalacionNombre(instalacion) {
  return text(instalacion?.nombre) || text(instalacion?.name) || "Instalación sin nombre";
}

function projectValue(project) {
  return money(project?.valorVendido ?? project?.valorVenta ?? project?.precioNeto ?? project?.monto ?? project?.total);
}

function proposalValue(proposal) {
  return money(proposal?.valorFinal ?? proposal?.precioNeto ?? proposal?._c?.precioNeto ?? proposal?._c?.vf ?? proposal?.monto);
}

function proposalMrr(proposal) {
  return money(proposal?.mrr ?? proposal?.baseRecMes ?? proposal?.iRec ?? proposal?._c?.iRec ?? proposal?._c?.totalMesCLP);
}

function packagePrice(pkg) {
  return money(pkg?.precioInstalacionNeto ?? pkg?.installationPrice ?? pkg?.precioNeto);
}

function packageMrr(pkg) {
  return money(pkg?.valorMensual ?? pkg?.monthlyValue ?? pkg?.mrr);
}

function invoiceAmount(invoice) {
  return money(invoice?.monto ?? invoice?.montoTotal ?? invoice?.total ?? invoice?.neto);
}

function paidAmount(row) {
  return money(row?.montoPagado ?? row?.pagado ?? row?.paidAmount);
}

function normalizeStatus(value, fallback) {
  return text(value) || fallback;
}

function buildClients({ companyId, clientes }) {
  return toArray(clientes).map((cliente, index) => ({
    id: rowId(cliente, "client", index),
    company_id: companyId,
    rut: text(cliente.rut),
    legal_name: clienteNombre(cliente),
    commercial_name: text(cliente.nombreFantasia || cliente.nombreComercial || cliente.alias),
    status: normalizeStatus(cliente.estado, "Activo"),
    executive: text(cliente.ejecutivo || cliente.ejecutivoResponsable),
    source: text(cliente.origen) || "manual",
    external_id: text(cliente.externalId || cliente.softlandId),
    metadata: metadataWithout(cliente, ["id", "rut", "razonSocial", "nombre", "nombreFantasia", "estado", "ejecutivo", "origen", "externalId", "softlandId"]),
    created_at: iso(cliente.createdAt),
    updated_at: iso(cliente.updatedAt || cliente.createdAt),
  }));
}

function buildSites({ companyId, instalaciones }) {
  return toArray(instalaciones).map((instalacion, index) => ({
    id: rowId(instalacion, "site", index),
    company_id: companyId,
    client_id: text(instalacion.clienteId) || null,
    name: instalacionNombre(instalacion),
    city: text(instalacion.ciudad),
    region: text(instalacion.region),
    address: text(instalacion.direccion),
    status: normalizeStatus(instalacion.estado, "Activa"),
    metadata: metadataWithout(instalacion, ["id", "clienteId", "nombre", "ciudad", "region", "direccion", "estado"]),
    created_at: iso(instalacion.createdAt),
    updated_at: iso(instalacion.updatedAt || instalacion.createdAt),
  }));
}

function buildOpportunities({ companyId, oportunidades }) {
  return toArray(oportunidades).map((oportunidad, index) => ({
    id: rowId(oportunidad, "opportunity", index),
    company_id: companyId,
    client_id: text(oportunidad.clienteId) || null,
    site_id: text(oportunidad.instalacionId) || null,
    title: text(oportunidad.titulo || oportunidad.nombre) || "Oportunidad sin título",
    stage: normalizeStatus(oportunidad.etapa || oportunidad.estado, "Lead nuevo"),
    probability: money(oportunidad.probabilidad),
    estimated_value: money(oportunidad.valorEstimado || oportunidad.monto),
    estimated_mrr: money(oportunidad.mrrEstimado),
    executive: text(oportunidad.ejecutivo || oportunidad.responsable),
    expected_close_date: dateOnly(oportunidad.fechaCierreEstimada),
    metadata: metadataWithout(oportunidad, ["id", "clienteId", "instalacionId", "titulo", "nombre", "etapa", "estado", "probabilidad", "valorEstimado", "monto", "mrrEstimado", "ejecutivo", "responsable", "fechaCierreEstimada"]),
    created_at: iso(oportunidad.createdAt),
    updated_at: iso(oportunidad.updatedAt || oportunidad.createdAt),
  }));
}

function buildProposals({ companyId, propuestas }) {
  return toArray(propuestas).map((propuesta, index) => ({
    id: rowId(propuesta, "proposal", index),
    company_id: companyId,
    client_id: text(propuesta.clienteId) || null,
    site_id: text(propuesta.instalacionId) || null,
    opportunity_id: text(propuesta.oportunidadId) || null,
    number: text(propuesta.numero),
    name: text(propuesta.nombre || propuesta.titulo) || "Propuesta sin nombre",
    status: normalizeStatus(propuesta.estado, "Borrador"),
    executive: text(propuesta.ejecutivo),
    net_project_value: proposalValue(propuesta),
    estimated_cost: money(propuesta.costoEstimado ?? propuesta._c?.costoTotal ?? propuesta._c?.costoDirecto),
    monthly_recurring_value: proposalMrr(propuesta),
    source: text(propuesta.origen) || "manual",
    metadata: metadataWithout(propuesta, ["id", "clienteId", "instalacionId", "oportunidadId", "numero", "nombre", "titulo", "estado", "ejecutivo", "valorFinal", "precioNeto", "mrr", "iRec", "origen"]),
    created_at: iso(propuesta.createdAt),
    updated_at: iso(propuesta.updatedAt || propuesta.createdAt),
  }));
}

function quoteAmount(quote) {
  return money(quote?.precioNeto ?? quote?.netAmount ?? quote?._c?.precioNeto);
}

function buildQuotes({ companyId, cotizaciones }) {
  return toArray(cotizaciones).map((quote, index) => ({
    id: rowId(quote, "quote", index),
    company_id: companyId,
    client_id: text(quote.clienteId || quote.clientId) || null,
    site_id: text(quote.instalacionId || quote.siteId) || null,
    proposal_id: text(quote.propuestaId || quote.proposalId) || null,
    number: text(quote.numero || quote.number),
    status: normalizeStatus(quote.estado || quote.status, "Borrador"),
    net_amount: quoteAmount(quote),
    metadata: metadataWithout(quote, [
      "id","clienteId","clientId","instalacionId","siteId","propuestaId","proposalId",
      "numero","number","estado","status","precioNeto","netAmount"
    ]),
    created_at: iso(quote.createdAt),
    updated_at: iso(quote.updatedAt || quote.documentoClienteUpdatedAt || quote.createdAt),
  }));
}

function buildCommercialPackages({ companyId, paquetesComerciales }) {
  return toArray(paquetesComerciales).map((pkg, index) => ({
    id: rowId(pkg, "pkg", index),
    company_id: companyId,
    name: text(pkg.nombre || pkg.name) || "Paquete sin nombre",
    line: text(pkg.linea || pkg.line) || "ASSUR Home",
    category: text(pkg.categoria || pkg.category) || "Alarma",
    status: normalizeStatus(pkg.estado || pkg.status, "Borrador"),
    description: text(pkg.descripcionComercial || pkg.description),
    installation_price: packagePrice(pkg),
    installation_currency: text(pkg.monedaPrecio || pkg.installationCurrency) || "CLP",
    monthly_value: packageMrr(pkg),
    monthly_currency: text(pkg.monedaMensual || pkg.monthlyCurrency) || "UF",
    contract_months: money(pkg.duracionContratoMeses || pkg.contractMonths) || 24,
    estimated_cost: money(pkg.costoEstimado || pkg.estimatedCost),
    expected_margin: money(pkg.margenEsperado || pkg.expectedMargin),
    requires_approval: Boolean(pkg.requiereAprobacion ?? pkg.requiresApproval ?? true),
    valid_from: dateOnly(pkg.vigenciaDesde || pkg.validFrom),
    valid_until: dateOnly(pkg.vigenciaHasta || pkg.validUntil),
    conditions: text(pkg.condiciones || pkg.conditions),
    metadata: metadataWithout(pkg, [
      "id","nombre","name","linea","line","categoria","category","estado","status",
      "descripcionComercial","description","precioInstalacionNeto","installationPrice",
      "precioNeto","monedaPrecio","installationCurrency","valorMensual","monthlyValue",
      "mrr","monedaMensual","monthlyCurrency","duracionContratoMeses","contractMonths",
      "costoEstimado","estimatedCost","margenEsperado","expectedMargin","requiereAprobacion",
      "requiresApproval","vigenciaDesde","validFrom","vigenciaHasta","validUntil","condiciones",
      "conditions","materialesIncluidos","manoObraIncluida","serviciosIncluidos"
    ]),
    created_at: iso(pkg.createdAt),
    updated_at: iso(pkg.updatedAt || pkg.createdAt),
  }));
}

function packageItemRow({ companyId, pkg, item, itemType, index }) {
  const packageId = text(pkg?.id);
  return {
    id: rowId(item, `pkg-item-${packageId || "package"}`, index),
    company_id: companyId,
    package_id: packageId || null,
    material_id: text(item?.materialId || item?.idMaterial || (itemType === "material" ? item?.id : "")) || null,
    item_type: itemType,
    name: text(item?.nombre || item?.name || item?.descripcion || item?.description) || "Item sin nombre",
    quantity: money(item?.cantidad || item?.quantity) || 1,
    unit: text(item?.unidad || item?.unit),
    unit_cost: money(item?.costoUnitario || item?.unitCost || item?.precioUnitario),
    metadata: metadataWithout(item, ["id","materialId","idMaterial","nombre","name","descripcion","description","cantidad","quantity","unidad","unit","costoUnitario","unitCost","precioUnitario"]),
    created_at: iso(item?.createdAt),
    updated_at: iso(item?.updatedAt || item?.createdAt),
  };
}

function buildCommercialPackageItems({ companyId, paquetesComerciales }) {
  return toArray(paquetesComerciales).flatMap((pkg) => [
    ...toArray(pkg.materialesIncluidos).map((item, index) => packageItemRow({ companyId, pkg, item, itemType: "material", index })),
    ...toArray(pkg.manoObraIncluida).map((item, index) => packageItemRow({ companyId, pkg, item, itemType: "labor", index })),
  ]).filter((row) => row.package_id);
}

function buildCommercialPackageServices({ companyId, paquetesComerciales }) {
  return toArray(paquetesComerciales).flatMap((pkg) => {
    const packageId = text(pkg?.id);
    const explicit = toArray(pkg.serviciosIncluidos).map((service, index) => ({
      id: rowId(service, `pkg-service-${packageId || "package"}`, index),
      company_id: companyId,
      package_id: packageId || null,
      service_type: text(service?.tipoServicio || service?.tipo || service?.nombre) || text(pkg.categoria) || "Monitoreo",
      monthly_value: money(service?.valorMensual || service?.monthlyValue || service?.mrr),
      currency: text(service?.monedaMensual || service?.currency) || text(pkg.monedaMensual) || "UF",
      cameras: money(service?.camaras || service?.cameras),
      alarms: money(service?.alarmas || service?.alarms),
      metadata: metadataWithout(service, ["id","tipoServicio","tipo","nombre","valorMensual","monthlyValue","mrr","monedaMensual","currency","camaras","cameras","alarmas","alarms"]),
      created_at: iso(service?.createdAt),
      updated_at: iso(service?.updatedAt || service?.createdAt),
    })).filter((row) => row.package_id);
    if (explicit.length || !packageId || !packageMrr(pkg)) return explicit;
    return [{
      id: `pkg-service-${packageId}-recurring`,
      company_id: companyId,
      package_id: packageId,
      service_type: text(pkg.categoria) || "Monitoreo",
      monthly_value: packageMrr(pkg),
      currency: text(pkg.monedaMensual) || "UF",
      cameras: money(pkg.camaras),
      alarms: money(pkg.alarmas),
      metadata: {},
      created_at: iso(pkg.createdAt),
      updated_at: iso(pkg.updatedAt || pkg.createdAt),
    }];
  });
}

function buildQuickQuotes({ companyId, quickQuotes }) {
  return toArray(quickQuotes).map((quote, index) => ({
    id: rowId(quote, "quick-quote", index),
    company_id: companyId,
    package_id: text(quote.paqueteId || quote.packageId) || null,
    client_id: text(quote.clienteId || quote.clientId) || null,
    site_id: text(quote.instalacionId || quote.siteId) || null,
    opportunity_id: text(quote.oportunidadId || quote.opportunityId) || null,
    proposal_id: text(quote.propuestaId || quote.proposalId) || null,
    status: normalizeStatus(quote.estado || quote.status, "Generada"),
    net_project_value: money(quote.valorProyecto || quote.netProjectValue),
    monthly_recurring_value: money(quote.valorMensual || quote.monthlyRecurringValue),
    created_by: uuidOrNull(quote.creadoPorId || quote.createdBy),
    metadata: metadataWithout(quote, ["id","paqueteId","packageId","clienteId","clientId","instalacionId","siteId","oportunidadId","opportunityId","propuestaId","proposalId","estado","status","valorProyecto","netProjectValue","valorMensual","monthlyRecurringValue","creadoPorId","createdBy"]),
    created_at: iso(quote.createdAt),
    updated_at: iso(quote.updatedAt || quote.createdAt),
  }));
}

function buildProjects({ companyId, proyectos }) {
  return toArray(proyectos).map((proyecto, index) => ({
    id: rowId(proyecto, "project", index),
    company_id: companyId,
    client_id: text(proyecto.clienteId) || null,
    site_id: text(proyecto.instalacionId) || null,
    proposal_id: text(proyecto.propuestaId) || null,
    code: text(proyecto.codigo || proyecto.numero),
    name: text(proyecto.nombre) || "Proyecto sin nombre",
    category: text(proyecto.tipo || proyecto.categoria),
    operational_status: normalizeStatus(proyecto.estadoOp, "Planificacion"),
    financial_status: normalizeStatus(proyecto.estadoFin, "Pendiente"),
    sold_value: projectValue(proyecto),
    estimated_cost: money(proyecto.costoEstimado),
    cost_center: text(proyecto.centroCosto),
    start_date: dateOnly(proyecto.fechaInicio),
    end_date: dateOnly(proyecto.fechaTermino || proyecto.fechaFin),
    metadata: metadataWithout(proyecto, ["id", "clienteId", "instalacionId", "propuestaId", "codigo", "numero", "nombre", "tipo", "categoria", "estadoOp", "estadoFin", "valorVendido", "valorVenta", "precioNeto", "monto", "total", "costoEstimado", "centroCosto", "fechaInicio", "fechaTermino", "fechaFin"]),
    created_at: iso(proyecto.createdAt),
    updated_at: iso(proyecto.updatedAt || proyecto.createdAt),
  }));
}

function buildProjectTasks({ companyId, proyectos }) {
  return toArray(proyectos).flatMap((proyecto) => toArray(proyecto.tareas).map((tarea, index) => ({
    id: rowId(tarea, `task-${proyecto.id || "project"}`, index),
    company_id: companyId,
    project_id: text(proyecto.id) || null,
    title: text(tarea.nombre || tarea.titulo) || "Tarea sin nombre",
    stage: text(tarea.etapa),
    status: normalizeStatus(tarea.estado, "Pendiente"),
    assigned_to: uuidOrNull(tarea.asignadoAId),
    estimated_hours: money(tarea.duracionEstimada || tarea.horasEstimadas),
    started_at: text(tarea.iniciadoEl) || null,
    completed_at: text(tarea.completadoEl) || null,
    metadata: metadataWithout(tarea, ["id", "nombre", "titulo", "etapa", "estado", "asignadoAId", "duracionEstimada", "horasEstimadas", "iniciadoEl", "completadoEl"]),
    created_at: iso(tarea.createdAt),
    updated_at: iso(tarea.updatedAt || tarea.createdAt),
  })));
}

function buildRecurringServices({ companyId, serviciosRecurrentes }) {
  return toArray(serviciosRecurrentes).map((servicio, index) => ({
    id: rowId(servicio, "service", index),
    company_id: companyId,
    client_id: text(servicio.clienteId) || null,
    site_id: text(servicio.instalacionId) || null,
    project_id: text(servicio.proyectoId) || null,
    proposal_id: text(servicio.propuestaId) || null,
    code: text(servicio.codigo),
    service_type: text(servicio.tipoServicio || servicio.tipo) || "Monitoreo",
    status: normalizeStatus(servicio.estado, "En activación"),
    monthly_value: money(servicio.valorMensual),
    cameras: money(servicio.camaras || servicio.cantidadCamaras),
    alarms: money(servicio.alarmas || servicio.cantidadAlarmas),
    video_verification: money(servicio.videoVerificacion || servicio.videoverificacion),
    billing_frequency: text(servicio.periodicidadFacturacion) || "Mensual",
    start_date: dateOnly(servicio.fechaInicio),
    responsible: text(servicio.responsable),
    source: text(servicio.origen) || "assur",
    external_id: text(servicio.externalId || servicio.softlandId),
    metadata: metadataWithout(servicio, ["id", "clienteId", "instalacionId", "proyectoId", "propuestaId", "codigo", "tipoServicio", "tipo", "estado", "valorMensual", "camaras", "cantidadCamaras", "alarmas", "cantidadAlarmas", "videoVerificacion", "videoverificacion", "periodicidadFacturacion", "fechaInicio", "responsable", "origen", "externalId", "softlandId"]),
    created_at: iso(servicio.createdAt),
    updated_at: iso(servicio.updatedAt || servicio.createdAt),
  }));
}

function buildInvoices({ companyId, facturas }) {
  return toArray(facturas).map((factura, index) => ({
    id: rowId(factura, "invoice", index),
    company_id: companyId,
    client_id: text(factura.clienteId) || null,
    project_id: text(factura.proyectoId) || null,
    folio: text(factura.folio || factura.numeroFactura) || `SIN-FOLIO-${index + 1}`,
    issue_date: dateOnly(factura.fechaEmision),
    due_date: dateOnly(factura.fechaVencimiento),
    amount: invoiceAmount(factura),
    paid_amount: paidAmount(factura),
    status: normalizeStatus(factura.estado, "Emitida"),
    source: text(factura.origen) || "manual",
    external_id: text(factura.externalId || factura.softlandId),
    metadata: metadataWithout(factura, ["id", "clienteId", "proyectoId", "folio", "numeroFactura", "fechaEmision", "fechaVencimiento", "monto", "montoTotal", "total", "neto", "montoPagado", "pagado", "estado", "origen", "externalId", "softlandId"]),
    created_at: iso(factura.createdAt),
    updated_at: iso(factura.updatedAt || factura.createdAt),
  }));
}

function buildPayments({ companyId, pagos, facturas }) {
  const invoiceByFolio = new Map(toArray(facturas).map((factura) => [text(factura.folio || factura.numeroFactura), text(factura.id)]).filter(([folio]) => folio));
  return toArray(pagos).map((pago, index) => {
    const folio = text(pago.folioFactura || pago.folio || pago.numeroFactura);
    return {
      id: rowId(pago, "payment", index),
      company_id: companyId,
      invoice_id: text(pago.facturaId) || invoiceByFolio.get(folio) || null,
      payment_date: dateOnly(pago.fechaPago || pago.fecha),
      amount: money(pago.monto || pago.montoPagado),
      method: text(pago.medio || pago.formaPago),
      source: text(pago.origen) || "manual",
      external_id: text(pago.externalId || pago.softlandId),
      metadata: metadataWithout(pago, ["id", "facturaId", "folioFactura", "folio", "numeroFactura", "fechaPago", "fecha", "monto", "montoPagado", "medio", "formaPago", "origen", "externalId", "softlandId"]),
      created_at: iso(pago.createdAt),
    };
  }).filter((payment) => payment.invoice_id && payment.payment_date);
}

function buildAccountsPayable({ companyId, cuentasPagar }) {
  return toArray(cuentasPagar).map((cuenta, index) => ({
    id: rowId(cuenta, "ap", index),
    company_id: companyId,
    project_id: text(cuenta.proyectoId) || null,
    supplier_name: text(cuenta.proveedor || cuenta.supplierName) || "Proveedor sin nombre",
    folio: text(cuenta.folio || cuenta.numeroDocumento),
    issue_date: dateOnly(cuenta.fechaEmision),
    due_date: dateOnly(cuenta.fechaVencimiento || cuenta.vencimiento),
    amount: money(cuenta.monto || cuenta.montoTotal),
    paid_amount: paidAmount(cuenta),
    status: normalizeStatus(cuenta.estado, "Pendiente"),
    source: text(cuenta.origen) || "manual",
    external_id: text(cuenta.externalId || cuenta.softlandId),
    metadata: metadataWithout(cuenta, ["id", "proyectoId", "proveedor", "supplierName", "folio", "numeroDocumento", "fechaEmision", "fechaVencimiento", "vencimiento", "monto", "montoTotal", "montoPagado", "pagado", "estado", "origen", "externalId", "softlandId"]),
    created_at: iso(cuenta.createdAt),
    updated_at: iso(cuenta.updatedAt || cuenta.createdAt),
  }));
}

function buildMaterials({ companyId, materiales }) {
  return toArray(materiales).map((material, index) => ({
    id: rowId(material, "material", index),
    company_id: companyId,
    sku: text(material.codigo || material.sku),
    name: text(material.nombre || material.name || material.descripcion) || "Material sin nombre",
    unit: text(material.unidad || material.unit),
    unit_cost: money(material.costoUnitario ?? material.precioUnitario ?? material.costo ?? material.unitCost),
    stock: money(material.stockActual ?? material.stock ?? material.existencia),
    source: text(material.origen || material.source) || "manual",
    external_id: text(material.externalId || material.softlandId || material.codigoSoftland),
    metadata: metadataWithout(material, ["id","codigo","sku","nombre","name","descripcion","unidad","unit","costoUnitario","precioUnitario","costo","unitCost","stockActual","stock","existencia","origen","source","externalId","softlandId","codigoSoftland"]),
    created_at: iso(material.createdAt),
    updated_at: iso(material.updatedAt || material.createdAt),
  }));
}

function buildTechnicians({ companyId, tecnicos }) {
  return toArray(tecnicos).map((tecnico, index) => ({
    id: rowId(tecnico, "technician", index),
    company_id: companyId,
    full_name: text(tecnico.nombre || tecnico.fullName) || "Técnico sin nombre",
    status: tecnico.activo === false ? "Inactivo" : normalizeStatus(tecnico.estado || tecnico.status, "Activo"),
    hourly_cost: money(tecnico.costoHora || tecnico.hourlyCost),
    metadata: metadataWithout(tecnico, ["id","nombre","fullName","activo","estado","status","costoHora","hourlyCost"]),
    created_at: iso(tecnico.createdAt),
    updated_at: iso(tecnico.updatedAt || tecnico.createdAt),
  }));
}

function buildContractors({ companyId, contratistas }) {
  return toArray(contratistas).map((contratista, index) => ({
    id: rowId(contratista, "contractor", index),
    company_id: companyId,
    name: text(contratista.nombre || contratista.name || contratista.razonSocial) || "Contratista sin nombre",
    status: contratista.activo === false ? "Inactivo" : normalizeStatus(contratista.estado || contratista.status, "Activo"),
    hourly_cost: money(contratista.costoHora || contratista.hourlyCost),
    metadata: metadataWithout(contratista, ["id","nombre","name","razonSocial","activo","estado","status","costoHora","hourlyCost"]),
    created_at: iso(contratista.createdAt),
    updated_at: iso(contratista.updatedAt || contratista.createdAt),
  }));
}

function buildMaterialRequests({ companyId, proyectos }) {
  return toArray(proyectos).flatMap((proyecto) => toArray(proyecto.solicitudesMaterial).map((solicitud, index) => ({
    id: rowId(solicitud, `matreq-${proyecto.id || "project"}`, index),
    company_id: companyId,
    project_id: text(proyecto.id) || null,
    requested_by: uuidOrNull(solicitud.requestedBy || solicitud.usuarioId),
    technician_id: text(solicitud.tecnicoId) || null,
    status: normalizeStatus(solicitud.estado || solicitud.status, "pendiente"),
    priority: normalizeStatus(solicitud.prioridad || solicitud.priority, "Normal"),
    requested_at: iso(solicitud.fecha || solicitud.requestedAt),
    approved_at: text(solicitud.approvedAt) || null,
    delivered_at: text(solicitud.deliveredAt || solicitud.fechaEntrega) || null,
    rejected_at: text(solicitud.rejectedAt) || null,
    notes: text(solicitud.notas || solicitud.observaciones),
    source: text(solicitud.origen || solicitud.source) || "mobile",
    metadata: metadataWithout(solicitud, ["id","requestedBy","usuarioId","tecnicoId","estado","status","prioridad","priority","fecha","requestedAt","approvedAt","deliveredAt","fechaEntrega","rejectedAt","notas","observaciones","origen","source","items"]),
    created_at: iso(solicitud.createdAt || solicitud.fecha),
    updated_at: iso(solicitud.updatedAt || solicitud.createdAt || solicitud.fecha),
  })));
}

function buildMaterialRequestItems({ companyId, proyectos }) {
  return toArray(proyectos).flatMap((proyecto) => toArray(proyecto.solicitudesMaterial).flatMap((solicitud, solicitudIndex) => {
    const requestId = rowId(solicitud, `matreq-${proyecto.id || "project"}`, solicitudIndex);
    return toArray(solicitud.items).map((item, index) => ({
      id: rowId(item, `matitem-${requestId}`, index),
      company_id: companyId,
      material_request_id: requestId,
      material_id: text(item.materialId || item.idMaterial) || null,
      description: text(item.nombre || item.descripcion || item.name) || "Material solicitado",
      quantity: money(item.cantidad || item.quantity) || 1,
      unit: text(item.unidad || item.unit),
      unit_cost: money(item.costoUnitario || item.unitCost || item.precioUnitario),
      delivered_quantity: money(item.cantidadEntregada || item.deliveredQuantity),
      metadata: metadataWithout(item, ["id","materialId","idMaterial","nombre","descripcion","name","cantidad","quantity","unidad","unit","costoUnitario","unitCost","precioUnitario","cantidadEntregada","deliveredQuantity"]),
      created_at: iso(item.createdAt || solicitud.createdAt || solicitud.fecha),
      updated_at: iso(item.updatedAt || item.createdAt || solicitud.updatedAt || solicitud.fecha),
    }));
  }));
}

function buildTimeEntries({ companyId, horas }) {
  return toArray(horas).map((hora, index) => ({
    id: rowId(hora, "time", index),
    company_id: companyId,
    project_id: text(hora.proyectoId || hora.projectId) || null,
    profile_id: uuidOrNull(hora.profileId || hora.usuarioId),
    technician_id: text(hora.tecnicoId || hora.technicianId) || null,
    entry_date: dateOnly(hora.fecha || hora.entryDate) || new Date().toISOString().slice(0, 10),
    hours: money(hora.horas || hora.hours),
    cost: money(hora.costo || hora.total || hora.cost),
    status: normalizeStatus(hora.estado || hora.status, "Pendiente"),
    metadata: metadataWithout(hora, ["id","proyectoId","projectId","profileId","usuarioId","tecnicoId","technicianId","fecha","entryDate","horas","hours","costo","total","cost","estado","status"]),
    created_at: iso(hora.createdAt),
    updated_at: iso(hora.updatedAt || hora.createdAt),
  }));
}

function buildFieldClockEvents({ companyId, fichajes }) {
  return toArray(fichajes).map((fichaje, index) => ({
    id: rowId(fichaje, "clock", index),
    company_id: companyId,
    project_id: text(fichaje.proyectoId || fichaje.projectId) || null,
    profile_id: uuidOrNull(fichaje.profileId || fichaje.usuarioId),
    event_type: text(fichaje.tipo || fichaje.eventType || fichaje.accion) || "fichaje",
    event_at: iso(fichaje.fecha || fichaje.eventAt),
    latitude: money(fichaje.lat || fichaje.latitude),
    longitude: money(fichaje.lng || fichaje.longitude),
    metadata: metadataWithout(fichaje, ["id","proyectoId","projectId","profileId","usuarioId","tipo","eventType","accion","fecha","eventAt","lat","latitude","lng","longitude"]),
    created_at: iso(fichaje.createdAt || fichaje.fecha),
  }));
}

function buildIncidents({ companyId, incidencias }) {
  return toArray(incidencias).map((incidencia, index) => ({
    id: rowId(incidencia, "incident", index),
    company_id: companyId,
    project_id: text(incidencia.proyectoId || incidencia.projectId) || null,
    client_id: text(incidencia.clienteId || incidencia.clientId) || null,
    title: text(incidencia.titulo || incidencia.title || incidencia.descripcion) || "Incidencia sin título",
    severity: normalizeStatus(incidencia.severidad || incidencia.prioridad || incidencia.severity, "Media"),
    status: normalizeStatus(incidencia.estado || incidencia.status, "Abierta"),
    metadata: metadataWithout(incidencia, ["id","proyectoId","projectId","clienteId","clientId","titulo","title","descripcion","severidad","prioridad","severity","estado","status"]),
    created_at: iso(incidencia.createdAt || incidencia.fecha),
    updated_at: iso(incidencia.updatedAt || incidencia.createdAt || incidencia.fecha),
  }));
}

function buildExpenses({ companyId, gastos }) {
  return toArray(gastos).map((gasto, index) => ({
    id: rowId(gasto, "expense", index),
    company_id: companyId,
    project_id: text(gasto.proyectoId || gasto.projectId) || null,
    category: text(gasto.categoria || gasto.tipo || gasto.category) || "Gasto",
    description: text(gasto.descripcion || gasto.description),
    expense_date: dateOnly(gasto.fecha || gasto.expenseDate),
    amount: money(gasto.monto || gasto.amount),
    recurring: Boolean(gasto.recurrente || gasto.recurring),
    source: text(gasto.origen || gasto.source) || "manual",
    external_id: text(gasto.externalId || gasto.softlandId),
    metadata: metadataWithout(gasto, ["id","proyectoId","projectId","categoria","tipo","category","descripcion","description","fecha","expenseDate","monto","amount","recurrente","recurring","origen","source","externalId","softlandId"]),
    created_at: iso(gasto.createdAt),
    updated_at: iso(gasto.updatedAt || gasto.createdAt),
  }));
}

function buildBillingMilestones({ companyId, proyectos }) {
  return toArray(proyectos).flatMap((proyecto) => toArray(proyecto.hitosFacturacion).map((hito, index) => ({
    id: rowId(hito, `milestone-${proyecto.id || "project"}`, index),
    company_id: companyId,
    project_id: text(proyecto.id) || null,
    name: text(hito.nombre || hito.name) || "Hito de facturación",
    amount: money(hito.monto || hito.amount),
    percent: money(hito.pct || hito.percent),
    status: normalizeStatus(hito.estado || hito.status, "Pendiente"),
    due_date: dateOnly(hito.fecha || hito.fechaVencimiento || hito.dueDate),
    invoice_id: text(hito.facturaId || hito.invoiceId) || null,
    metadata: metadataWithout(hito, ["id","nombre","name","monto","amount","pct","percent","estado","status","fecha","fechaVencimiento","dueDate","facturaId","invoiceId"]),
    created_at: iso(hito.createdAt),
    updated_at: iso(hito.updatedAt || hito.createdAt),
  })));
}

function buildMonitoringProtocols({ companyId, serviciosRecurrentes }) {
  return toArray(serviciosRecurrentes).map((servicio, index) => ({
    id: text(servicio.protocoloId) || `protocol-${rowId(servicio, "service", index)}`,
    company_id: companyId,
    recurring_service_id: text(servicio.id) || null,
    site_id: text(servicio.instalacionId) || null,
    schedule: text(servicio.horario || servicio.schedule),
    instructions: text(servicio.instrucciones || servicio.instructions),
    status: servicio.protocoloCompleto === false ? "Incompleto" : normalizeStatus(servicio.protocoloEstado || servicio.protocolStatus, "Incompleto"),
    metadata: metadataWithout(servicio.protocolo || {}, []),
    created_at: iso(servicio.createdAt),
    updated_at: iso(servicio.updatedAt || servicio.createdAt),
  })).filter((row) => row.recurring_service_id);
}

function buildServiceContacts({ companyId, serviciosRecurrentes }) {
  return toArray(serviciosRecurrentes).flatMap((servicio) => toArray(servicio.contactos).map((contacto, index) => ({
    id: rowId(contacto, `service-contact-${servicio.id || "service"}`, index),
    company_id: companyId,
    recurring_service_id: text(servicio.id) || null,
    name: text(contacto.nombre || contacto.name) || "Contacto sin nombre",
    phone: text(contacto.telefono || contacto.phone),
    email: text(contacto.email || contacto.correo),
    role: text(contacto.rol || contacto.role),
    priority: money(contacto.prioridad || contacto.priority) || index + 1,
    metadata: metadataWithout(contacto, ["id","nombre","name","telefono","phone","email","correo","rol","role","prioridad","priority"]),
    created_at: iso(contacto.createdAt || servicio.createdAt),
  }))).filter((row) => row.recurring_service_id);
}

function buildServiceEvents({ companyId, eventosServicio }) {
  return toArray(eventosServicio).map((evento, index) => ({
    id: rowId(evento, "service-event", index),
    company_id: companyId,
    recurring_service_id: text(evento.servicioId || evento.recurringServiceId) || null,
    event_type: text(evento.tipo || evento.eventType) || "evento",
    severity: normalizeStatus(evento.severidad || evento.severity, "Normal"),
    status: normalizeStatus(evento.estado || evento.status, "Abierto"),
    event_date: iso(evento.fecha || evento.eventDate),
    description: text(evento.descripcion || evento.description),
    metadata: metadataWithout(evento, ["id","servicioId","recurringServiceId","tipo","eventType","severidad","severity","estado","status","fecha","eventDate","descripcion","description"]),
    created_at: iso(evento.createdAt || evento.fecha),
    updated_at: iso(evento.updatedAt || evento.createdAt || evento.fecha),
  }));
}

function buildServiceBillingExpectations({ companyId, serviceBillingExpectations }) {
  return toArray(serviceBillingExpectations).map((expectation, index) => ({
    id: rowId(expectation, "billing-exp", index),
    company_id: companyId,
    recurring_service_id: text(expectation.servicioId || expectation.recurringServiceId) || null,
    client_id: text(expectation.clienteId || expectation.clientId) || null,
    expected_month: dateOnly(expectation.expectedMonth || expectation.mes || expectation.periodo) || new Date().toISOString().slice(0, 10),
    expected_amount: money(expectation.expectedAmount || expectation.montoEsperado || expectation.monto),
    status: normalizeStatus(expectation.status || expectation.estado, "Esperada"),
    invoice_id: text(expectation.facturaId || expectation.invoiceId) || null,
    metadata: metadataWithout(expectation, ["id","servicioId","recurringServiceId","clienteId","clientId","expectedMonth","mes","periodo","expectedAmount","montoEsperado","monto","status","estado","facturaId","invoiceId"]),
    created_at: iso(expectation.createdAt),
    updated_at: iso(expectation.updatedAt || expectation.createdAt),
  }));
}

export function buildSupabaseSeedPayload(data = {}, options = {}) {
  const companyId = options.companyId || DEFAULT_COMPANY_ID;
  const payload = {
    companies: [{ id: companyId, name: options.companyName || "ASSUR Chile", rut: options.companyRut || null }],
    clients: buildClients({ companyId, clientes: data.clientes }),
    sites: buildSites({ companyId, instalaciones: data.instalaciones }),
    materials: buildMaterials({ companyId, materiales: data.materiales }),
    technicians: buildTechnicians({ companyId, tecnicos: data.tecnicos }),
    contractors: buildContractors({ companyId, contratistas: data.contratistas }),
    opportunities: buildOpportunities({ companyId, oportunidades: data.oportunidades }),
    proposals: buildProposals({ companyId, propuestas: data.propuestas }),
    quotes: buildQuotes({ companyId, cotizaciones: data.cotizaciones }),
    commercial_packages: buildCommercialPackages({ companyId, paquetesComerciales: data.paquetesComerciales }),
    commercial_package_items: buildCommercialPackageItems({ companyId, paquetesComerciales: data.paquetesComerciales }),
    commercial_package_services: buildCommercialPackageServices({ companyId, paquetesComerciales: data.paquetesComerciales }),
    projects: buildProjects({ companyId, proyectos: data.proyectos }),
    project_tasks: buildProjectTasks({ companyId, proyectos: data.proyectos }),
    material_requests: buildMaterialRequests({ companyId, proyectos: data.proyectos }),
    material_request_items: buildMaterialRequestItems({ companyId, proyectos: data.proyectos }),
    time_entries: buildTimeEntries({ companyId, horas: data.horas }),
    field_clock_events: buildFieldClockEvents({ companyId, fichajes: data.fichajes }),
    incidents: buildIncidents({ companyId, incidencias: data.incidencias }),
    expenses: buildExpenses({ companyId, gastos: data.gastos }),
    billing_milestones: buildBillingMilestones({ companyId, proyectos: data.proyectos }),
    recurring_services: buildRecurringServices({ companyId, serviciosRecurrentes: data.serviciosRecurrentes }),
    monitoring_protocols: buildMonitoringProtocols({ companyId, serviciosRecurrentes: data.serviciosRecurrentes }),
    service_contacts: buildServiceContacts({ companyId, serviciosRecurrentes: data.serviciosRecurrentes }),
    service_events: buildServiceEvents({ companyId, eventosServicio: data.eventosServicio }),
    service_billing_expectations: buildServiceBillingExpectations({ companyId, serviceBillingExpectations: data.serviceBillingExpectations }),
    invoices: buildInvoices({ companyId, facturas: data.facturas }),
    payments: buildPayments({ companyId, pagos: data.pagos, facturas: data.facturas }),
    accounts_payable: buildAccountsPayable({ companyId, cuentasPagar: data.cuentasPagar }),
    quick_quotes: buildQuickQuotes({ companyId, quickQuotes: data.quickQuotes }),
  };
  return normalizeOptionalForeignKeys(payload);
}

function normalizeOptionalForeignKeys(payload) {
  const ids = {
    clients: tableIds(payload.clients),
    sites: tableIds(payload.sites),
    opportunities: tableIds(payload.opportunities),
    proposals: tableIds(payload.proposals),
    quotes: tableIds(payload.quotes),
    materials: tableIds(payload.materials),
    technicians: tableIds(payload.technicians),
    commercial_packages: tableIds(payload.commercial_packages),
    projects: tableIds(payload.projects),
    recurring_services: tableIds(payload.recurring_services),
    invoices: tableIds(payload.invoices),
  };
  const clearMissing = (rows, field, allowed) => toArray(rows).map((row) => {
    const value = text(row[field]);
    return value && !allowed.has(value) ? { ...row, [field]: null } : row;
  });

  return {
    ...payload,
    sites: clearMissing(payload.sites, "client_id", ids.clients),
    opportunities: clearMissing(clearMissing(payload.opportunities, "client_id", ids.clients), "site_id", ids.sites),
    proposals: clearMissing(clearMissing(clearMissing(payload.proposals, "client_id", ids.clients), "site_id", ids.sites), "opportunity_id", ids.opportunities),
    quotes: clearMissing(clearMissing(clearMissing(payload.quotes, "client_id", ids.clients), "site_id", ids.sites), "proposal_id", ids.proposals),
    commercial_package_items: clearMissing(clearMissing(payload.commercial_package_items, "package_id", ids.commercial_packages), "material_id", ids.materials),
    commercial_package_services: clearMissing(payload.commercial_package_services, "package_id", ids.commercial_packages),
    projects: clearMissing(clearMissing(clearMissing(payload.projects, "client_id", ids.clients), "site_id", ids.sites), "proposal_id", ids.proposals),
    project_tasks: clearMissing(payload.project_tasks, "project_id", ids.projects),
    material_requests: clearMissing(clearMissing(payload.material_requests, "project_id", ids.projects), "technician_id", ids.technicians),
    material_request_items: clearMissing(clearMissing(payload.material_request_items, "material_request_id", tableIds(payload.material_requests)), "material_id", ids.materials),
    time_entries: clearMissing(clearMissing(payload.time_entries, "project_id", ids.projects), "technician_id", ids.technicians),
    field_clock_events: clearMissing(payload.field_clock_events, "project_id", ids.projects),
    incidents: clearMissing(clearMissing(payload.incidents, "project_id", ids.projects), "client_id", ids.clients),
    expenses: clearMissing(payload.expenses, "project_id", ids.projects),
    billing_milestones: clearMissing(clearMissing(payload.billing_milestones, "project_id", ids.projects), "invoice_id", ids.invoices),
    recurring_services: clearMissing(clearMissing(clearMissing(clearMissing(payload.recurring_services, "client_id", ids.clients), "site_id", ids.sites), "project_id", ids.projects), "proposal_id", ids.proposals),
    monitoring_protocols: clearMissing(clearMissing(payload.monitoring_protocols, "recurring_service_id", ids.recurring_services), "site_id", ids.sites),
    service_contacts: clearMissing(payload.service_contacts, "recurring_service_id", ids.recurring_services),
    service_events: clearMissing(payload.service_events, "recurring_service_id", ids.recurring_services),
    service_billing_expectations: clearMissing(clearMissing(clearMissing(payload.service_billing_expectations, "recurring_service_id", ids.recurring_services), "client_id", ids.clients), "invoice_id", ids.invoices),
    invoices: clearMissing(clearMissing(payload.invoices, "client_id", ids.clients), "project_id", ids.projects),
    payments: clearMissing(payload.payments, "invoice_id", ids.invoices),
    accounts_payable: clearMissing(payload.accounts_payable, "project_id", ids.projects),
    quick_quotes: clearMissing(clearMissing(clearMissing(clearMissing(clearMissing(payload.quick_quotes, "package_id", ids.commercial_packages), "client_id", ids.clients), "site_id", ids.sites), "opportunity_id", ids.opportunities), "proposal_id", ids.proposals),
  };
}

function tableIds(rows) {
  return new Set(toArray(rows).map((row) => text(row.id)).filter(Boolean));
}

function warnMissing({ rows, field, allowedIds, table, label, warnings }) {
  for (const row of toArray(rows)) {
    const value = text(row[field]);
    if (value && !allowedIds.has(value)) {
      warnings.push(`${table}.${field}: ${label} inexistente (${value}) en ${row.id || row.name || row.folio || "registro"}.`);
    }
  }
}

export function validateSupabaseSeedPayload(payload = {}) {
  const warnings = [];
  const errors = [];
  const ids = {
    clients: tableIds(payload.clients),
    sites: tableIds(payload.sites),
    opportunities: tableIds(payload.opportunities),
    proposals: tableIds(payload.proposals),
    commercial_packages: tableIds(payload.commercial_packages),
    projects: tableIds(payload.projects),
    recurring_services: tableIds(payload.recurring_services),
    invoices: tableIds(payload.invoices),
  };

  for (const table of Object.keys(payload)) {
    const duplicated = findDuplicates(toArray(payload[table]).map((row) => row.id));
    for (const id of duplicated) errors.push(`${table}: id duplicado ${id}.`);
  }

  warnMissing({ rows: payload.sites, field: "client_id", allowedIds: ids.clients, table: "sites", label: "cliente", warnings });
  warnMissing({ rows: payload.opportunities, field: "client_id", allowedIds: ids.clients, table: "opportunities", label: "cliente", warnings });
  warnMissing({ rows: payload.opportunities, field: "site_id", allowedIds: ids.sites, table: "opportunities", label: "instalación", warnings });
  warnMissing({ rows: payload.proposals, field: "client_id", allowedIds: ids.clients, table: "proposals", label: "cliente", warnings });
  warnMissing({ rows: payload.proposals, field: "site_id", allowedIds: ids.sites, table: "proposals", label: "instalación", warnings });
  warnMissing({ rows: payload.quotes, field: "client_id", allowedIds: ids.clients, table: "quotes", label: "cliente", warnings });
  warnMissing({ rows: payload.quotes, field: "site_id", allowedIds: ids.sites, table: "quotes", label: "instalación", warnings });
  warnMissing({ rows: payload.quotes, field: "proposal_id", allowedIds: ids.proposals, table: "quotes", label: "propuesta", warnings });
  warnMissing({ rows: payload.commercial_package_items, field: "package_id", allowedIds: ids.commercial_packages, table: "commercial_package_items", label: "paquete", warnings });
  warnMissing({ rows: payload.commercial_package_services, field: "package_id", allowedIds: ids.commercial_packages, table: "commercial_package_services", label: "paquete", warnings });
  warnMissing({ rows: payload.projects, field: "client_id", allowedIds: ids.clients, table: "projects", label: "cliente", warnings });
  warnMissing({ rows: payload.projects, field: "site_id", allowedIds: ids.sites, table: "projects", label: "instalación", warnings });
  warnMissing({ rows: payload.projects, field: "proposal_id", allowedIds: ids.proposals, table: "projects", label: "propuesta", warnings });
  warnMissing({ rows: payload.project_tasks, field: "project_id", allowedIds: ids.projects, table: "project_tasks", label: "proyecto", warnings });
  warnMissing({ rows: payload.recurring_services, field: "client_id", allowedIds: ids.clients, table: "recurring_services", label: "cliente", warnings });
  warnMissing({ rows: payload.recurring_services, field: "site_id", allowedIds: ids.sites, table: "recurring_services", label: "instalación", warnings });
  warnMissing({ rows: payload.recurring_services, field: "project_id", allowedIds: ids.projects, table: "recurring_services", label: "proyecto", warnings });
  warnMissing({ rows: payload.invoices, field: "client_id", allowedIds: ids.clients, table: "invoices", label: "cliente", warnings });
  warnMissing({ rows: payload.invoices, field: "project_id", allowedIds: ids.projects, table: "invoices", label: "proyecto", warnings });
  warnMissing({ rows: payload.payments, field: "invoice_id", allowedIds: ids.invoices, table: "payments", label: "factura", warnings });
  warnMissing({ rows: payload.accounts_payable, field: "project_id", allowedIds: ids.projects, table: "accounts_payable", label: "proyecto", warnings });
  warnMissing({ rows: payload.quick_quotes, field: "package_id", allowedIds: ids.commercial_packages, table: "quick_quotes", label: "paquete", warnings });

  return { ok: errors.length === 0, errors, warnings };
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicated = new Set();
  for (const value of values.filter(Boolean)) {
    if (seen.has(value)) duplicated.add(value);
    seen.add(value);
  }
  return [...duplicated];
}

export { DEFAULT_COMPANY_ID };
