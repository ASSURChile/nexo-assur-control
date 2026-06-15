-- Politicas RLS base para Assur Control.
-- Aplicar despues de crear usuarios con Supabase Auth y poblar profiles.company_id.

create or replace function public.current_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
  limit 1
$$;

create or replace function public.can_manage()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin','gerente_general','gerente_operaciones_admin','operaciones','supervisor'), false)
$$;

create or replace function public.can_field_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin','gerente_general','gerente_operaciones_admin','operaciones','supervisor','tecnico'), false)
$$;

create or replace function public.can_warehouse_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin','gerente_general','gerente_operaciones_admin','operaciones','supervisor','almacen'), false)
$$;

alter table companies enable row level security;
alter table profiles enable row level security;
alter table app_collections enable row level security;
alter table clients enable row level security;
alter table sites enable row level security;
alter table opportunities enable row level security;
alter table proposals enable row level security;
alter table quote_templates enable row level security;
alter table quotes enable row level security;
alter table commercial_packages enable row level security;
alter table commercial_package_items enable row level security;
alter table commercial_package_services enable row level security;
alter table quick_quotes enable row level security;
alter table projects enable row level security;
alter table project_tasks enable row level security;
alter table technicians enable row level security;
alter table contractors enable row level security;
alter table materials enable row level security;
alter table material_requests enable row level security;
alter table material_request_items enable row level security;
alter table time_entries enable row level security;
alter table field_clock_events enable row level security;
alter table incidents enable row level security;
alter table expenses enable row level security;
alter table billing_milestones enable row level security;
alter table invoices enable row level security;
alter table payments enable row level security;
alter table accounts_payable enable row level security;
alter table recurring_services enable row level security;
alter table monitoring_protocols enable row level security;
alter table service_contacts enable row level security;
alter table installed_assets enable row level security;
alter table service_events enable row level security;
alter table service_billing_expectations enable row level security;
alter table audit_logs enable row level security;
alter table sync_logs enable row level security;
alter table legal_entities enable row level security;
alter table business_units enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table profile_permissions enable row level security;
alter table attachments enable row level security;
alter table document_templates enable row level security;
alter table generated_documents enable row level security;
alter table document_versions enable row level security;
alter table activity_events enable row level security;
alter table error_logs enable row level security;

drop policy if exists companies_select_own on companies;
create policy companies_select_own on companies
  for select using (id = public.current_company_id());

drop policy if exists profiles_select_own_company on profiles;
create policy profiles_select_own_company on profiles
  for select using (company_id = public.current_company_id() or id = auth.uid());

drop policy if exists profiles_admin_manage on profiles;
create policy profiles_admin_manage on profiles
  for all using (public.current_role() = 'admin')
  with check (public.current_role() = 'admin');

drop policy if exists app_collections_select_own on app_collections;
create policy app_collections_select_own on app_collections
  for select using (company_id = public.current_company_id() or company_id is null);

drop policy if exists app_collections_manage_own on app_collections;
create policy app_collections_manage_own on app_collections
  for all using (public.can_manage() and (company_id = public.current_company_id() or company_id is null))
  with check (public.can_manage() and (company_id = public.current_company_id() or company_id is null));

drop policy if exists audit_logs_select_admin on audit_logs;
create policy audit_logs_select_admin on audit_logs
  for select using (public.current_role() = 'admin' and company_id = public.current_company_id());

drop policy if exists sync_logs_select_admin on sync_logs;
create policy sync_logs_select_admin on sync_logs
  for select using (public.current_role() = 'admin' and company_id = public.current_company_id());

drop policy if exists sync_logs_manage_admin on sync_logs;
create policy sync_logs_manage_admin on sync_logs
  for all using (public.current_role() = 'admin' and company_id = public.current_company_id())
  with check (public.current_role() = 'admin' and company_id = public.current_company_id());

do $$
declare
  t text;
begin
  foreach t in array array[
    'clients','sites','opportunities','proposals','quote_templates','quotes',
    'commercial_packages','commercial_package_items','commercial_package_services','quick_quotes',
    'projects','project_tasks','technicians','contractors','materials',
    'material_requests','material_request_items',
    'time_entries','field_clock_events','incidents','expenses','billing_milestones',
    'invoices','payments','accounts_payable','recurring_services','monitoring_protocols',
    'service_contacts','installed_assets','service_events','service_billing_expectations',
    'legal_entities','business_units','roles','role_permissions','profile_permissions',
    'attachments','document_templates','generated_documents','document_versions',
    'activity_events','error_logs'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_select_own_company', t);
    execute format('drop policy if exists %I on %I', t || '_manage_own_company', t);
    execute format('create policy %I on %I for select using (company_id = public.current_company_id())', t || '_select_own_company', t);
    execute format('create policy %I on %I for all using (public.can_manage() and company_id = public.current_company_id()) with check (public.can_manage() and company_id = public.current_company_id())', t || '_manage_own_company', t);
  end loop;
end $$;

drop policy if exists field_clock_events_field_insert on field_clock_events;
create policy field_clock_events_field_insert on field_clock_events
  for insert with check (public.can_field_write() and company_id = public.current_company_id());

drop policy if exists field_clock_events_field_update on field_clock_events;
create policy field_clock_events_field_update on field_clock_events
  for update using (public.can_field_write() and company_id = public.current_company_id())
  with check (public.can_field_write() and company_id = public.current_company_id());

drop policy if exists time_entries_field_insert on time_entries;
create policy time_entries_field_insert on time_entries
  for insert with check (public.can_field_write() and company_id = public.current_company_id());

drop policy if exists incidents_field_insert on incidents;
create policy incidents_field_insert on incidents
  for insert with check (public.can_field_write() and company_id = public.current_company_id());

drop policy if exists material_requests_field_insert on material_requests;
create policy material_requests_field_insert on material_requests
  for insert with check (public.can_field_write() and company_id = public.current_company_id());

drop policy if exists material_request_items_field_insert on material_request_items;
create policy material_request_items_field_insert on material_request_items
  for insert with check (public.can_field_write() and company_id = public.current_company_id());

drop policy if exists material_requests_warehouse_update on material_requests;
create policy material_requests_warehouse_update on material_requests
  for update using (public.can_warehouse_write() and company_id = public.current_company_id())
  with check (public.can_warehouse_write() and company_id = public.current_company_id());

drop policy if exists material_request_items_warehouse_update on material_request_items;
create policy material_request_items_warehouse_update on material_request_items
  for update using (public.can_warehouse_write() and company_id = public.current_company_id())
  with check (public.can_warehouse_write() and company_id = public.current_company_id());

drop policy if exists materials_warehouse_update on materials;
create policy materials_warehouse_update on materials
  for update using (public.can_warehouse_write() and company_id = public.current_company_id())
  with check (public.can_warehouse_write() and company_id = public.current_company_id());
