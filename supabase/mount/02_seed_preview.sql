-- Cargar seed inicial
-- Fuente: supabase/seed.preview.sql

-- Seed preview generado para ASSUR Control.
-- Recomendado: ejecutar despues de supabase/schema.sql y antes de policies.sql si se usa service role.
-- Revisar datos antes de usar en produccion.
begin;

-- companies: 1 registro(s)
insert into public."companies" ("id", "name", "rut")
values
  ('00000000-0000-0000-0000-000000000001', 'ASSUR Chile', null)
on conflict (id) do update set
  "name" = excluded."name",
  "rut" = excluded."rut";

-- clients: 1 registro(s)
insert into public."clients" ("id", "company_id", "rut", "legal_name", "commercial_name", "status", "executive", "source", "external_id", "metadata", "created_at", "updated_at")
values
  ('demo-patagonia-cliente', '00000000-0000-0000-0000-000000000001', '76.543.210-9', 'Patagonia Fresh SpA', 'Patagonia Fresh', 'Activo', 'Demo Comercial', 'manual', null, '{"nombreComercial":"Patagonia Fresh","rubro":"Agroindustria","contacto":"Carolina Molina","telefono":"+56 9 4321 9876","email":"operaciones@patagoniafresh.test","direccion":"Ruta 5 Sur km 209, Molina, Región del Maule","notas":"Cliente ficticio creado para validar KPIs comerciales, operativos y financieros.","centroCosto":"PF-MOLINA","origenId":"demo","createdAt":"2026-05-04T04:05:28.321Z","updatedAt":"2026-05-11T02:41:09.172Z"}'::jsonb, '2026-05-04T04:05:28.321Z', '2026-05-11T02:41:09.172Z')
on conflict (id) do update set
  "company_id" = excluded."company_id",
  "rut" = excluded."rut",
  "legal_name" = excluded."legal_name",
  "commercial_name" = excluded."commercial_name",
  "status" = excluded."status",
  "executive" = excluded."executive",
  "source" = excluded."source",
  "external_id" = excluded."external_id",
  "metadata" = excluded."metadata",
  "created_at" = excluded."created_at",
  "updated_at" = excluded."updated_at";

-- sites: 1 registro(s)
insert into public."sites" ("id", "company_id", "client_id", "name", "city", "region", "address", "status", "metadata", "created_at", "updated_at")
values
  ('demo-patagonia-instalacion', '00000000-0000-0000-0000-000000000001', 'demo-patagonia-cliente', 'Molina', null, 'Maule', 'Planta Molina, Ruta 5 Sur km 209', 'Activa', '{"comuna":"Molina","responsable":"Luis Araya","telefono":"+56 9 8765 1234","observaciones":"Instalación ficticia para mejora tecnológica de seguridad.","geoLat":-35.116,"geoLng":-71.282,"geoRadioMetros":180,"origen":"manual","origenId":"demo","createdAt":"2026-05-04T04:05:28.321Z","updatedAt":"2026-05-11T16:17:37.947Z"}'::jsonb, '2026-05-04T04:05:28.321Z', '2026-05-11T16:17:37.947Z')
on conflict (id) do update set
  "company_id" = excluded."company_id",
  "client_id" = excluded."client_id",
  "name" = excluded."name",
  "city" = excluded."city",
  "region" = excluded."region",
  "address" = excluded."address",
  "status" = excluded."status",
  "metadata" = excluded."metadata",
  "created_at" = excluded."created_at",
  "updated_at" = excluded."updated_at";

-- opportunities: sin registros

-- proposals: sin registros

-- projects: 1 registro(s)
insert into public."projects" ("id", "company_id", "client_id", "site_id", "proposal_id", "code", "name", "category", "operational_status", "financial_status", "sold_value", "estimated_cost", "cost_center", "start_date", "end_date", "metadata", "created_at", "updated_at")
values
  ('demo-patagonia-proyecto', '00000000-0000-0000-0000-000000000001', 'demo-patagonia-cliente', 'demo-patagonia-instalacion', null, 'PRY-2026-900', 'Mejora tecnológica', 'Seguridad electrónica', 'En ejecución', 'Cobrado parcial', 16500000, 9850000, 'PF-MOLINA', '2026-05-11', '2026-06-18', '{"ejecutivo":"Demo Comercial","subCentroCosto":"MOL-SEG","valorProyecto":16500000,"valorFinal":16500000,"fechaAprobacion":"2026-05-04","fechaFacturacion":"","nroFactura":"F-DEMO-9001","montoFacturado":11550000,"hitosFacturacion":[{"id":"demo-patagonia-hito-1","nombre":"Anticipo 40%","pct":40,"monto":6600000,"estado":"Cobrado","nroFactura":"F-DEMO-9001","facturaId":"demo-patagonia-factura-1","fechaFacturacion":"2026-04-27","fechaCobro":"2026-05-02"},{"id":"demo-patagonia-hito-2","nombre":"Entrega equipos 30%","pct":30,"monto":4950000,"estado":"Cobrado","nroFactura":"F-DEMO-9002","facturaId":"demo-patagonia-factura-2","fechaFacturacion":"2026-05-04","fechaCobro":"2026-05-04"},{"id":"demo-patagonia-hito-3","nombre":"Cierre y puesta en marcha 30%","pct":30,"monto":4950000,"estado":"Pendiente"}],"tareas":[{"id":"demo-patagonia-tarea-1","nombre":"Levantamiento y replanteo técnico","descripcion":"Validar ubicación de cámaras, alarmas y red.","estado":"Completada","etapa":"Visita técnica","duracionEstimada":6,"fechaTerminada":"2026-04-29","orden":0},{"id":"demo-patagonia-tarea-2","nombre":"Cableado estructurado planta Molina","descripcion":"Tendido de canalizaciones y puntos de red.","estado":"En ejecución","etapa":"Cableado estructurado","duracionEstimada":24,"orden":1},{"id":"demo-patagonia-tarea-3","nombre":"Montaje de 20 cámaras IP","descripcion":"Montaje, orientación y etiquetado.","estado":"Pendiente","etapa":"Montaje de equipos","duracionEstimada":18,"orden":2},{"id":"demo-patagonia-tarea-4","nombre":"Configuración de 3 alarmas","descripcion":"Configuración sensores, particiones y comunicación.","estado":"Pendiente","etapa":"Configuración","duracionEstimada":8,"orden":3},{"id":"demo-patagonia-tarea-5","nombre":"Pruebas, acta y entrega","descripcion":"Pruebas de monitoreo, capacitación y cierre.","estado":"Pendiente","etapa":"Entrega y cierre","duracionEstimada":6,"orden":4}],"costos":[{"id":"demo-patagonia-costo-1","tipo":"Materiales","desc":"Cámaras, alarmas, NVR, cableado y accesorios","monto":7200000,"total":7200000,"origen":"manual","fecha":"2026-05-04"},{"id":"demo-patagonia-costo-2","tipo":"Mano de obra","desc":"Instalación técnica estimada","monto":2100000,"total":2100000,"origen":"manual","fecha":"2026-05-04"},{"id":"demo-patagonia-costo-3","tipo":"Traslados y viáticos","desc":"Equipo técnico Molina","monto":450000,"total":450000,"origen":"manual","fecha":"2026-05-04"}],"solicitudesMaterial":[{"id":"demo-patagonia-sol-1","tecnicoNombre":"Técnico Demo","estado":"entregada","fecha":"2026-05-04","items":[{"nombre":"Cable UTP Cat6 exterior","cantidad":600,"unidad":"m"}],"fechaDecision":"2026-05-04T04:15:16.938Z"}],"timeline":[{"fecha":"2026-05-04T04:05:28.321Z","tipo":"demo","desc":"Proyecto demo Patagonia Fresh cargado"},{"fecha":"2026-05-04T04:15:13.288Z","tipo":"material","desc":"Solicitud de material aprobada"},{"fecha":"2026-05-04T04:15:15.404Z","tipo":"material","desc":"Solicitud de material aprobada"},{"fecha":"2026-05-04T04:15:16.938Z","tipo":"material","desc":"Solicitud de material entregada"}],"observaciones":"Proyecto ficticio para validar dashboard, pipeline, caja, CxC/CxP y rentabilidad.","createdAt":"2026-05-04T04:05:28.321Z","updatedAt":"2026-05-11T16:18:28.925Z"}'::jsonb, '2026-05-04T04:05:28.321Z', '2026-05-11T16:18:28.925Z')
on conflict (id) do update set
  "company_id" = excluded."company_id",
  "client_id" = excluded."client_id",
  "site_id" = excluded."site_id",
  "proposal_id" = excluded."proposal_id",
  "code" = excluded."code",
  "name" = excluded."name",
  "category" = excluded."category",
  "operational_status" = excluded."operational_status",
  "financial_status" = excluded."financial_status",
  "sold_value" = excluded."sold_value",
  "estimated_cost" = excluded."estimated_cost",
  "cost_center" = excluded."cost_center",
  "start_date" = excluded."start_date",
  "end_date" = excluded."end_date",
  "metadata" = excluded."metadata",
  "created_at" = excluded."created_at",
  "updated_at" = excluded."updated_at";

-- project_tasks: 5 registro(s)
insert into public."project_tasks" ("id", "company_id", "project_id", "title", "stage", "status", "assigned_to", "estimated_hours", "started_at", "completed_at", "metadata", "created_at", "updated_at")
values
  ('demo-patagonia-tarea-1', '00000000-0000-0000-0000-000000000001', 'demo-patagonia-proyecto', 'Levantamiento y replanteo técnico', 'Visita técnica', 'Completada', null, 6, null, null, '{"descripcion":"Validar ubicación de cámaras, alarmas y red.","fechaTerminada":"2026-04-29","orden":0}'::jsonb, '2026-05-12T01:48:39.496Z', '2026-05-12T01:48:39.497Z'),
  ('demo-patagonia-tarea-2', '00000000-0000-0000-0000-000000000001', 'demo-patagonia-proyecto', 'Cableado estructurado planta Molina', 'Cableado estructurado', 'En ejecución', null, 24, null, null, '{"descripcion":"Tendido de canalizaciones y puntos de red.","orden":1}'::jsonb, '2026-05-12T01:48:39.497Z', '2026-05-12T01:48:39.497Z'),
  ('demo-patagonia-tarea-3', '00000000-0000-0000-0000-000000000001', 'demo-patagonia-proyecto', 'Montaje de 20 cámaras IP', 'Montaje de equipos', 'Pendiente', null, 18, null, null, '{"descripcion":"Montaje, orientación y etiquetado.","orden":2}'::jsonb, '2026-05-12T01:48:39.497Z', '2026-05-12T01:48:39.497Z'),
  ('demo-patagonia-tarea-4', '00000000-0000-0000-0000-000000000001', 'demo-patagonia-proyecto', 'Configuración de 3 alarmas', 'Configuración', 'Pendiente', null, 8, null, null, '{"descripcion":"Configuración sensores, particiones y comunicación.","orden":3}'::jsonb, '2026-05-12T01:48:39.497Z', '2026-05-12T01:48:39.497Z'),
  ('demo-patagonia-tarea-5', '00000000-0000-0000-0000-000000000001', 'demo-patagonia-proyecto', 'Pruebas, acta y entrega', 'Entrega y cierre', 'Pendiente', null, 6, null, null, '{"descripcion":"Pruebas de monitoreo, capacitación y cierre.","orden":4}'::jsonb, '2026-05-12T01:48:39.497Z', '2026-05-12T01:48:39.497Z')
on conflict (id) do update set
  "company_id" = excluded."company_id",
  "project_id" = excluded."project_id",
  "title" = excluded."title",
  "stage" = excluded."stage",
  "status" = excluded."status",
  "assigned_to" = excluded."assigned_to",
  "estimated_hours" = excluded."estimated_hours",
  "started_at" = excluded."started_at",
  "completed_at" = excluded."completed_at",
  "metadata" = excluded."metadata",
  "created_at" = excluded."created_at",
  "updated_at" = excluded."updated_at";

-- recurring_services: sin registros

-- invoices: 2 registro(s)
insert into public."invoices" ("id", "company_id", "client_id", "project_id", "folio", "issue_date", "due_date", "amount", "paid_amount", "status", "source", "external_id", "metadata", "created_at", "updated_at")
values
  ('demo-patagonia-factura-2', '00000000-0000-0000-0000-000000000001', null, 'demo-patagonia-proyecto', 'F-DEMO-9002', '2026-05-04', '2026-06-03', 4950000, 0, 'Emitida', 'manual', null, '{"rutCliente":"76.543.210-9","saldo":4950000,"hitoId":"demo-patagonia-hito-2","observaciones":"Entrega equipos 30%","createdAt":"2026-05-07T01:29:48.604Z","updatedAt":"2026-05-11T15:26:38.779Z"}'::jsonb, '2026-05-07T01:29:48.604Z', '2026-05-11T15:26:38.779Z'),
  ('demo-patagonia-factura-1', '00000000-0000-0000-0000-000000000001', null, 'demo-patagonia-proyecto', 'F-DEMO-9001', '2026-04-27', '2026-05-12', 6600000, 6600000, 'Emitida', 'manual', null, '{"rutCliente":"76.543.210-9","saldo":0,"hitoId":"demo-patagonia-hito-1","observaciones":"Anticipo 40%","createdAt":"2026-05-07T01:29:57.725Z","updatedAt":"2026-05-11T16:18:28.927Z"}'::jsonb, '2026-05-07T01:29:57.725Z', '2026-05-11T16:18:28.927Z')
on conflict (id) do update set
  "company_id" = excluded."company_id",
  "client_id" = excluded."client_id",
  "project_id" = excluded."project_id",
  "folio" = excluded."folio",
  "issue_date" = excluded."issue_date",
  "due_date" = excluded."due_date",
  "amount" = excluded."amount",
  "paid_amount" = excluded."paid_amount",
  "status" = excluded."status",
  "source" = excluded."source",
  "external_id" = excluded."external_id",
  "metadata" = excluded."metadata",
  "created_at" = excluded."created_at",
  "updated_at" = excluded."updated_at";

-- accounts_payable: 2 registro(s)
insert into public."accounts_payable" ("id", "company_id", "project_id", "supplier_name", "folio", "issue_date", "due_date", "amount", "paid_amount", "status", "source", "external_id", "metadata", "created_at", "updated_at")
values
  ('demo-patagonia-cxp-2', '00000000-0000-0000-0000-000000000001', null, 'Servicios Técnicos Demo', 'OC-DEMO-702', '2026-05-04', '2026-06-18', 1350000, 0, 'Pendiente', 'manual', null, '{"rutProveedor":"76.222.333-4","saldo":1350000,"centroCosto":"PF-MOLINA","createdAt":"2026-05-07T01:27:11.591Z","updatedAt":"2026-05-11T15:25:42.954Z"}'::jsonb, '2026-05-07T01:27:11.591Z', '2026-05-11T15:25:42.954Z'),
  ('demo-patagonia-cxp-1', '00000000-0000-0000-0000-000000000001', null, 'Proveedor Cámaras Demo', 'OC-DEMO-701', '2026-05-01', '2026-05-24', 4200000, 0, 'Pendiente', 'softland', null, '{"rutProveedor":"77.111.222-3","saldo":4200000,"centroCosto":"PF-MOLINA","createdAt":"2026-05-07T01:28:08.857Z","updatedAt":"2026-05-11T16:18:35.937Z"}'::jsonb, '2026-05-07T01:28:08.857Z', '2026-05-11T16:18:35.937Z')
on conflict (id) do update set
  "company_id" = excluded."company_id",
  "project_id" = excluded."project_id",
  "supplier_name" = excluded."supplier_name",
  "folio" = excluded."folio",
  "issue_date" = excluded."issue_date",
  "due_date" = excluded."due_date",
  "amount" = excluded."amount",
  "paid_amount" = excluded."paid_amount",
  "status" = excluded."status",
  "source" = excluded."source",
  "external_id" = excluded."external_id",
  "metadata" = excluded."metadata",
  "created_at" = excluded."created_at",
  "updated_at" = excluded."updated_at";

commit;
