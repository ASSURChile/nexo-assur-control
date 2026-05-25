-- Role-based write policies for area ownership.
-- Apply after 04_policies.sql.

create or replace function public.can_commercial_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin','gerencia','comercial','jefe_comercial'), false)
$$;

create or replace function public.can_project_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin','gerencia','operaciones','administrativo_operaciones','supervisor','comercial','jefe_comercial'), false)
$$;

create or replace function public.can_finance_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin','gerencia','finanzas'), false)
$$;

create or replace function public.can_service_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin','gerencia','operaciones','administrativo_operaciones','supervisor','monitoreo'), false)
$$;

create or replace function public.can_warehouse_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() in ('admin','gerencia','operaciones','administrativo_operaciones','supervisor','almacen'), false)
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'clients','sites','opportunities','proposals','quote_templates','quotes',
    'commercial_packages','commercial_package_items','commercial_package_services','quick_quotes'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_commercial_write', t);
    execute format('create policy %I on %I for all using (public.can_commercial_write() and company_id = public.current_company_id()) with check (public.can_commercial_write() and company_id = public.current_company_id())', t || '_commercial_write', t);
  end loop;

  foreach t in array array[
    'projects','project_tasks','time_entries','field_clock_events','incidents'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_project_write', t);
    execute format('create policy %I on %I for all using (public.can_project_write() and company_id = public.current_company_id()) with check (public.can_project_write() and company_id = public.current_company_id())', t || '_project_write', t);
  end loop;

  foreach t in array array[
    'invoices','payments','accounts_payable','expenses','billing_milestones'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_finance_write', t);
    execute format('create policy %I on %I for all using (public.can_finance_write() and company_id = public.current_company_id()) with check (public.can_finance_write() and company_id = public.current_company_id())', t || '_finance_write', t);
  end loop;

  foreach t in array array[
    'recurring_services','monitoring_protocols','service_contacts',
    'installed_assets','service_events','service_billing_expectations'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_service_write', t);
    execute format('create policy %I on %I for all using (public.can_service_write() and company_id = public.current_company_id()) with check (public.can_service_write() and company_id = public.current_company_id())', t || '_service_write', t);
  end loop;

  foreach t in array array[
    'materials','material_requests','material_request_items'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_warehouse_write', t);
    execute format('create policy %I on %I for all using (public.can_warehouse_write() and company_id = public.current_company_id()) with check (public.can_warehouse_write() and company_id = public.current_company_id())', t || '_warehouse_write', t);
  end loop;

  foreach t in array array[
    'technicians','contractors'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_operations_resource_write', t);
    execute format('create policy %I on %I for all using (public.can_project_write() and company_id = public.current_company_id()) with check (public.can_project_write() and company_id = public.current_company_id())', t || '_operations_resource_write', t);
  end loop;
end $$;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (
    role in (
      'admin','gerencia','comercial','jefe_comercial','operaciones',
      'administrativo_operaciones','supervisor','tecnico','monitoreo',
      'finanzas','almacen','viewer'
    )
  );
