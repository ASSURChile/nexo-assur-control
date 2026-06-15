-- Contexto operativo para consolidar Alerta MD + Servicios Electronicos en ASSUR.
-- Mantiene una sola plataforma de control, pero separa empresa legal y unidad
-- operacional para operar la transicion hacia ASSUR sin perder trazabilidad.

begin;

insert into public.legal_entities (id, company_id, name, rut, status, metadata)
values
  (
    'legal-alerta-md',
    '00000000-0000-0000-0000-000000000001',
    'Alerta MD',
    null,
    'Activa',
    '{"tipo":"empresa_actual","linea_principal":"monitoreo"}'::jsonb
  ),
  (
    'legal-servicios-electronicos',
    '00000000-0000-0000-0000-000000000001',
    'Servicios Electronicos',
    null,
    'Activa',
    '{"tipo":"empresa_actual","linea_principal":"proyectos"}'::jsonb
  ),
  (
    'legal-assur-chile-futura',
    '00000000-0000-0000-0000-000000000001',
    'ASSUR Chile futura',
    null,
    'Planificada',
    '{"tipo":"empresa_futura","linea_principal":"consolidada"}'::jsonb
  )
on conflict (id) do update set
  company_id = excluded.company_id,
  name = excluded.name,
  rut = excluded.rut,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.business_units (id, company_id, legal_entity_id, name, code, status, metadata)
values
  (
    'bu-monitoreo',
    '00000000-0000-0000-0000-000000000001',
    'legal-alerta-md',
    'Monitoreo',
    'MONITOREO',
    'Activa',
    '{"descripcion":"Servicios recurrentes, monitoreo, videoverificacion y protocolos."}'::jsonb
  ),
  (
    'bu-proyectos',
    '00000000-0000-0000-0000-000000000001',
    'legal-servicios-electronicos',
    'Proyectos',
    'PROYECTOS',
    'Activa',
    '{"descripcion":"Implementaciones, obras, mantenciones y servicios tecnicos."}'::jsonb
  ),
  (
    'bu-assur-home',
    '00000000-0000-0000-0000-000000000001',
    'legal-assur-chile-futura',
    'ASSUR Home',
    'ASSUR_HOME',
    'Planificada',
    '{"descripcion":"Linea residencial y volumen paquetizado."}'::jsonb
  ),
  (
    'bu-assur-empresas',
    '00000000-0000-0000-0000-000000000001',
    'legal-assur-chile-futura',
    'ASSUR Empresas',
    'ASSUR_EMPRESAS',
    'Planificada',
    '{"descripcion":"Linea empresas, industrial, agricola y corporativa."}'::jsonb
  )
on conflict (id) do update set
  company_id = excluded.company_id,
  legal_entity_id = excluded.legal_entity_id,
  name = excluded.name,
  code = excluded.code,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = now();

alter table public.clients
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

alter table public.sites
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

alter table public.opportunities
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

alter table public.proposals
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

alter table public.quotes
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

alter table public.projects
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

alter table public.invoices
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

alter table public.payments
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

alter table public.accounts_payable
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

alter table public.recurring_services
  add column if not exists legal_entity_origin text,
  add column if not exists business_line text,
  add column if not exists source_company_rut text;

create index if not exists idx_clients_operating_context
  on public.clients(company_id, legal_entity_origin, business_line);

create index if not exists idx_projects_operating_context
  on public.projects(company_id, legal_entity_origin, business_line);

create index if not exists idx_invoices_operating_context
  on public.invoices(company_id, legal_entity_origin, business_line);

create index if not exists idx_recurring_services_operating_context
  on public.recurring_services(company_id, legal_entity_origin, business_line);

commit;
