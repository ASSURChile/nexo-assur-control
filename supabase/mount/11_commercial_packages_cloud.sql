-- Normalizacion cloud de paquetes comerciales y cotizaciones rapidas.
-- Aplicar despues de 01_schema.sql, 04_policies.sql y 10_role_based_write_policies.sql.

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

create index if not exists idx_commercial_packages_status on commercial_packages(status);
create index if not exists idx_package_items_package on commercial_package_items(package_id);
create index if not exists idx_package_services_package on commercial_package_services(package_id);
create index if not exists idx_quick_quotes_package on quick_quotes(package_id);
create index if not exists idx_quick_quotes_client on quick_quotes(client_id);
create unique index if not exists idx_commercial_packages_company_name on commercial_packages(company_id, lower(name));

do $$
declare
  t text;
begin
  foreach t in array array[
    'commercial_packages','commercial_package_items',
    'commercial_package_services','quick_quotes'
  ]
  loop
    execute format('drop trigger if exists %I on public.%I', 'touch_' || t || '_updated_at', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.touch_updated_at()', 'touch_' || t || '_updated_at', t);
  end loop;
end $$;

alter table commercial_packages enable row level security;
alter table commercial_package_items enable row level security;
alter table commercial_package_services enable row level security;
alter table quick_quotes enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'commercial_packages','commercial_package_items',
    'commercial_package_services','quick_quotes'
  ]
  loop
    execute format('drop policy if exists %I on %I', t || '_select_own_company', t);
    execute format('drop policy if exists %I on %I', t || '_manage_own_company', t);
    execute format('drop policy if exists %I on %I', t || '_commercial_write', t);
    execute format('create policy %I on %I for select using (company_id = public.current_company_id())', t || '_select_own_company', t);
    execute format('create policy %I on %I for all using (public.can_manage() and company_id = public.current_company_id()) with check (public.can_manage() and company_id = public.current_company_id())', t || '_manage_own_company', t);
    execute format('create policy %I on %I for all using (public.can_commercial_write() and company_id = public.current_company_id()) with check (public.can_commercial_write() and company_id = public.current_company_id())', t || '_commercial_write', t);
  end loop;
end $$;

