-- Crear schema base
-- Fuente: supabase/schema.sql

create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rut text,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key,
  company_id uuid references companies(id) on delete cascade,
  full_name text not null,
  email text not null,
  role text not null check (role in ('admin','gerente_general','gerente_operaciones_admin','gerencia','comercial','jefe_comercial','operaciones','administrativo_operaciones','supervisor','tecnico','monitoreo','finanzas','almacen','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_collections (
  key text primary key,
  company_id uuid references companies(id) on delete cascade,
  value jsonb not null default '[]',
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  rut text,
  legal_name text not null,
  commercial_name text,
  status text not null default 'Activo',
  executive text,
  source text not null default 'manual',
  external_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sites (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  client_id text references clients(id) on delete cascade,
  name text not null,
  city text,
  region text,
  address text,
  status text not null default 'Activa',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists opportunities (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  client_id text references clients(id),
  site_id text references sites(id),
  title text not null,
  stage text not null,
  probability numeric not null default 0,
  estimated_value numeric not null default 0,
  estimated_mrr numeric not null default 0,
  executive text,
  expected_close_date date,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists proposals (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  client_id text references clients(id),
  site_id text references sites(id),
  opportunity_id text references opportunities(id),
  number text,
  name text not null,
  status text not null default 'Borrador',
  executive text,
  net_project_value numeric not null default 0,
  estimated_cost numeric not null default 0,
  monthly_recurring_value numeric not null default 0,
  source text not null default 'manual',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quote_templates (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quotes (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  client_id text references clients(id),
  site_id text references sites(id),
  proposal_id text references proposals(id),
  number text,
  status text not null default 'Borrador',
  net_amount numeric not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists commercial_packages (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  line text not null default 'ASSUR Home',
  category text not null default 'Alarma',
  status text not null default 'Borrador',
  description text,
  installation_price numeric not null default 0,
  installation_currency text not null default 'CLP',
  monthly_value numeric not null default 0,
  monthly_currency text not null default 'UF',
  contract_months integer not null default 24,
  estimated_cost numeric not null default 0,
  expected_margin numeric not null default 0,
  requires_approval boolean not null default true,
  valid_from date,
  valid_until date,
  conditions text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists materials (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  sku text,
  name text not null,
  unit text,
  unit_cost numeric not null default 0,
  stock numeric not null default 0,
  source text not null default 'manual',
  external_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists commercial_package_items (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  package_id text references commercial_packages(id) on delete cascade,
  material_id text references materials(id),
  item_type text not null default 'material',
  name text not null,
  quantity numeric not null default 1,
  unit text,
  unit_cost numeric not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists commercial_package_services (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  package_id text references commercial_packages(id) on delete cascade,
  service_type text not null,
  monthly_value numeric not null default 0,
  currency text not null default 'UF',
  cameras integer not null default 0,
  alarms integer not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists quick_quotes (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  package_id text references commercial_packages(id),
  client_id text references clients(id),
  site_id text references sites(id),
  opportunity_id text references opportunities(id),
  proposal_id text references proposals(id),
  status text not null default 'Generada',
  net_project_value numeric not null default 0,
  monthly_recurring_value numeric not null default 0,
  created_by uuid references profiles(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists projects (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  client_id text references clients(id),
  site_id text references sites(id),
  proposal_id text references proposals(id),
  code text,
  name text not null,
  category text,
  operational_status text not null default 'Planificacion',
  financial_status text not null default 'Pendiente',
  sold_value numeric not null default 0,
  estimated_cost numeric not null default 0,
  cost_center text,
  start_date date,
  end_date date,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_tasks (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  title text not null,
  stage text,
  status text not null default 'Pendiente',
  assigned_to uuid references profiles(id),
  estimated_hours numeric not null default 0,
  started_at timestamptz,
  completed_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists technicians (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  full_name text not null,
  status text not null default 'Activo',
  hourly_cost numeric not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists contractors (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  status text not null default 'Activo',
  hourly_cost numeric not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists material_requests (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  requested_by uuid references profiles(id),
  technician_id text references technicians(id),
  status text not null default 'pendiente',
  priority text not null default 'Normal',
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  delivered_at timestamptz,
  rejected_at timestamptz,
  notes text,
  source text not null default 'mobile',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists material_request_items (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  material_request_id text references material_requests(id) on delete cascade,
  material_id text references materials(id),
  description text,
  quantity numeric not null default 1,
  unit text,
  unit_cost numeric not null default 0,
  delivered_quantity numeric not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists time_entries (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  project_id text references projects(id),
  profile_id uuid references profiles(id),
  technician_id text references technicians(id),
  entry_date date not null,
  hours numeric not null default 0,
  cost numeric not null default 0,
  status text not null default 'Pendiente',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists field_clock_events (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  project_id text references projects(id),
  profile_id uuid references profiles(id),
  event_type text not null,
  event_at timestamptz not null default now(),
  latitude numeric,
  longitude numeric,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists incidents (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  project_id text references projects(id),
  client_id text references clients(id),
  title text not null,
  severity text not null default 'Media',
  status text not null default 'Abierta',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists expenses (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  project_id text references projects(id),
  category text not null,
  description text,
  expense_date date,
  amount numeric not null default 0,
  recurring boolean not null default false,
  source text not null default 'manual',
  external_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists billing_milestones (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  project_id text references projects(id) on delete cascade,
  name text not null,
  amount numeric not null default 0,
  percent numeric not null default 0,
  status text not null default 'Pendiente',
  due_date date,
  invoice_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists invoices (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  client_id text references clients(id),
  project_id text references projects(id),
  folio text not null,
  issue_date date,
  due_date date,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  status text not null default 'Emitida',
  source text not null default 'manual',
  external_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists payments (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  invoice_id text references invoices(id) on delete cascade,
  payment_date date not null,
  amount numeric not null default 0,
  method text,
  source text not null default 'manual',
  external_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists accounts_payable (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  project_id text references projects(id),
  supplier_name text not null,
  folio text,
  issue_date date,
  due_date date,
  amount numeric not null default 0,
  paid_amount numeric not null default 0,
  status text not null default 'Pendiente',
  source text not null default 'manual',
  external_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists recurring_services (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  client_id text references clients(id),
  site_id text references sites(id),
  project_id text references projects(id),
  proposal_id text references proposals(id),
  code text,
  service_type text not null,
  status text not null default 'En activación',
  monthly_value numeric not null default 0,
  cameras integer not null default 0,
  alarms integer not null default 0,
  video_verification integer not null default 0,
  billing_frequency text not null default 'Mensual',
  start_date date,
  responsible text,
  source text not null default 'assur',
  external_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists monitoring_protocols (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  recurring_service_id text references recurring_services(id) on delete cascade,
  site_id text references sites(id),
  schedule text,
  instructions text,
  status text not null default 'Incompleto',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_contacts (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  recurring_service_id text references recurring_services(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  role text,
  priority integer not null default 1,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists installed_assets (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  client_id text references clients(id),
  site_id text references sites(id),
  recurring_service_id text references recurring_services(id),
  project_id text references projects(id),
  asset_type text not null,
  name text,
  serial_number text,
  status text not null default 'Activo',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_events (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  recurring_service_id text references recurring_services(id) on delete cascade,
  event_type text not null,
  severity text not null default 'Normal',
  status text not null default 'Abierto',
  event_date timestamptz not null default now(),
  description text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists service_billing_expectations (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  recurring_service_id text references recurring_services(id) on delete cascade,
  client_id text references clients(id),
  expected_month date not null,
  expected_amount numeric not null default 0,
  status text not null default 'Esperada',
  invoice_id text references invoices(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  actor_id uuid references profiles(id),
  entity text not null,
  entity_id text,
  action text not null,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create table if not exists sync_logs (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  source text not null,
  entity text not null,
  status text not null,
  processed_count integer not null default 0,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists legal_entities (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  rut text,
  status text not null default 'Activa',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_units (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  legal_entity_id text references legal_entities(id),
  name text not null,
  code text,
  status text not null default 'Activa',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  code text not null,
  name text not null,
  status text not null default 'Activo',
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists role_permissions (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  role_id text references roles(id) on delete cascade,
  module_id text not null,
  action text not null,
  allowed boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profile_permissions (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  module_id text not null,
  action text not null,
  allowed boolean not null default false,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists attachments (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  bucket text not null,
  storage_path text not null,
  file_name text,
  mime_type text,
  file_size bigint,
  document_type text not null default 'evidencia',
  uploaded_by uuid references profiles(id),
  deleted_at timestamptz,
  deleted_by uuid references profiles(id),
  delete_reason text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_templates (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  document_type text not null default 'cotizacion',
  status text not null default 'Activo',
  template_html text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists generated_documents (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  template_id text references document_templates(id),
  attachment_id text references attachments(id),
  entity_type text not null,
  entity_id text not null,
  document_type text not null,
  status text not null default 'Borrador',
  generated_by uuid references profiles(id),
  generated_at timestamptz,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists document_versions (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  generated_document_id text not null references generated_documents(id) on delete cascade,
  version_number integer not null default 1,
  attachment_id text references attachments(id),
  content_html text,
  created_by uuid references profiles(id),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists activity_events (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  actor_id uuid references profiles(id),
  entity_type text not null,
  entity_id text not null,
  action text not null,
  summary text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists error_logs (
  id text primary key default gen_random_uuid()::text,
  company_id uuid references companies(id) on delete cascade,
  profile_id uuid references profiles(id),
  source text not null default 'frontend',
  severity text not null default 'error',
  message text not null,
  stack text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

do $$
declare
  t text;
begin
  foreach t in array array[
    'clients','sites','opportunities','proposals','quote_templates','quotes',
    'commercial_packages','quick_quotes','projects','project_tasks',
    'materials','material_requests','incidents','expenses','billing_milestones',
    'invoices','payments','accounts_payable','recurring_services',
    'monitoring_protocols','service_contacts','installed_assets','service_events',
    'service_billing_expectations','generated_documents'
  ]
  loop
    execute format('alter table public.%I add column if not exists deleted_at timestamptz', t);
    execute format('alter table public.%I add column if not exists deleted_by uuid references public.profiles(id)', t);
    execute format('alter table public.%I add column if not exists delete_reason text', t);
  end loop;
end $$;

create index if not exists idx_clients_company on clients(company_id);
create index if not exists idx_app_collections_company on app_collections(company_id);
create index if not exists idx_sites_client on sites(client_id);
create index if not exists idx_commercial_packages_status on commercial_packages(status);
create index if not exists idx_package_items_package on commercial_package_items(package_id);
create index if not exists idx_package_services_package on commercial_package_services(package_id);
create index if not exists idx_quick_quotes_package on quick_quotes(package_id);
create index if not exists idx_quick_quotes_client on quick_quotes(client_id);
create index if not exists idx_projects_client on projects(client_id);
create index if not exists idx_projects_status on projects(operational_status);
create index if not exists idx_tasks_project on project_tasks(project_id);
create index if not exists idx_material_requests_project on material_requests(project_id);
create index if not exists idx_material_requests_status on material_requests(status);
create index if not exists idx_material_request_items_request on material_request_items(material_request_id);
create index if not exists idx_time_entries_project on time_entries(project_id);
create index if not exists idx_clock_events_project on field_clock_events(project_id);
create index if not exists idx_incidents_project on incidents(project_id);
create index if not exists idx_expenses_project on expenses(project_id);
create index if not exists idx_invoices_project on invoices(project_id);
create index if not exists idx_invoices_due_date on invoices(due_date);
create index if not exists idx_payments_invoice on payments(invoice_id);
create index if not exists idx_ap_due_date on accounts_payable(due_date);
create index if not exists idx_recurring_services_client on recurring_services(client_id);
create index if not exists idx_recurring_services_status on recurring_services(status);
create index if not exists idx_protocol_service on monitoring_protocols(recurring_service_id);
create index if not exists idx_service_contacts_service on service_contacts(recurring_service_id);
create index if not exists idx_assets_site on installed_assets(site_id);
create index if not exists idx_service_events_service on service_events(recurring_service_id);
create index if not exists idx_service_billing_month on service_billing_expectations(expected_month);
create index if not exists idx_legal_entities_company on legal_entities(company_id);
create index if not exists idx_business_units_company on business_units(company_id);
create unique index if not exists idx_roles_company_code on roles(company_id, lower(code));
create unique index if not exists idx_role_permissions_unique on role_permissions(company_id, role_id, module_id, action);
create unique index if not exists idx_profile_permissions_unique on profile_permissions(company_id, profile_id, module_id, action);
create index if not exists idx_attachments_entity on attachments(company_id, entity_type, entity_id);
create index if not exists idx_attachments_storage on attachments(bucket, storage_path);
create index if not exists idx_document_templates_type on document_templates(company_id, document_type, status);
create index if not exists idx_generated_documents_entity on generated_documents(company_id, entity_type, entity_id);
create unique index if not exists idx_document_versions_unique on document_versions(company_id, generated_document_id, version_number);
create index if not exists idx_activity_events_entity on activity_events(company_id, entity_type, entity_id, created_at desc);
create index if not exists idx_error_logs_company_created on error_logs(company_id, created_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'profiles','app_collections','clients','sites','opportunities','proposals',
    'quote_templates','quotes','commercial_packages','commercial_package_items',
    'commercial_package_services','quick_quotes','projects','project_tasks','technicians',
    'contractors','materials','material_requests','material_request_items',
    'time_entries','incidents','expenses','billing_milestones','invoices',
    'accounts_payable','recurring_services','monitoring_protocols',
    'installed_assets','service_events','service_billing_expectations',
    'legal_entities','business_units','roles','role_permissions','profile_permissions',
    'attachments','document_templates','generated_documents','document_versions'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'touch_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', 'touch_' || t || '_updated_at', t);
  end loop;
end $$;

create unique index if not exists idx_profiles_company_email on profiles(company_id, lower(email));
create unique index if not exists idx_clients_company_rut on clients(company_id, rut) where rut is not null and rut <> '';
create unique index if not exists idx_sites_company_client_name on sites(company_id, client_id, lower(name));
create unique index if not exists idx_commercial_packages_company_name on commercial_packages(company_id, lower(name));
create unique index if not exists idx_projects_company_code on projects(company_id, code) where code is not null and code <> '';
create unique index if not exists idx_invoices_company_folio on invoices(company_id, folio) where folio is not null and folio <> '';
create unique index if not exists idx_recurring_services_company_code on recurring_services(company_id, code) where code is not null and code <> '';
create unique index if not exists idx_service_billing_unique_month on service_billing_expectations(company_id, recurring_service_id, expected_month);
