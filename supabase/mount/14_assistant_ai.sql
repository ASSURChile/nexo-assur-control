-- NEXO Assistant MVP: auditoria, feedback y limites de uso.
-- Ejecutar despues de 13_seed_roles_permissions.sql.

create table if not exists public.assistant_threads (
  id text primary key default extensions.gen_random_uuid()::text,
  company_id uuid not null references public.companies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  title text,
  status text not null default 'Activo',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  delete_reason text
);

create table if not exists public.assistant_messages (
  id text primary key default extensions.gen_random_uuid()::text,
  company_id uuid not null references public.companies(id) on delete cascade,
  thread_id text not null references public.assistant_threads(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  sender text not null check (sender in ('user','assistant','system')),
  content text not null,
  response text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  deleted_by uuid references public.profiles(id),
  delete_reason text
);

create table if not exists public.assistant_tool_calls (
  id text primary key default extensions.gen_random_uuid()::text,
  company_id uuid not null references public.companies(id) on delete cascade,
  thread_id text not null references public.assistant_threads(id) on delete cascade,
  message_id text references public.assistant_messages(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  tool_name text not null,
  params jsonb not null default '{}'::jsonb,
  result_summary text,
  latency_ms integer,
  status text not null default 'ok',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_feedback (
  id text primary key default extensions.gen_random_uuid()::text,
  company_id uuid not null references public.companies(id) on delete cascade,
  thread_id text not null references public.assistant_threads(id) on delete cascade,
  message_id text references public.assistant_messages(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  rating text not null check (rating in ('util','no_util','neutral')),
  comment text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_usage_limits (
  id text primary key default extensions.gen_random_uuid()::text,
  company_id uuid not null references public.companies(id) on delete cascade,
  role text not null,
  profile_id uuid references public.profiles(id) on delete cascade,
  daily_limit integer not null default 15,
  status text not null default 'Activo',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, role, profile_id)
);

create index if not exists assistant_threads_company_profile_idx on public.assistant_threads(company_id, profile_id, created_at desc);
create index if not exists assistant_messages_thread_idx on public.assistant_messages(thread_id, created_at);
create index if not exists assistant_messages_usage_idx on public.assistant_messages(company_id, profile_id, sender, created_at desc);
create index if not exists assistant_tool_calls_company_idx on public.assistant_tool_calls(company_id, tool_name, created_at desc);
create index if not exists assistant_feedback_company_idx on public.assistant_feedback(company_id, rating, created_at desc);

alter table public.assistant_threads enable row level security;
alter table public.assistant_messages enable row level security;
alter table public.assistant_tool_calls enable row level security;
alter table public.assistant_feedback enable row level security;
alter table public.assistant_usage_limits enable row level security;

drop policy if exists assistant_threads_select_company on public.assistant_threads;
create policy assistant_threads_select_company
on public.assistant_threads for select
using (public.current_company_id() = company_id);

drop policy if exists assistant_threads_insert_own on public.assistant_threads;
create policy assistant_threads_insert_own
on public.assistant_threads for insert
with check (public.current_company_id() = company_id and profile_id = auth.uid());

drop policy if exists assistant_threads_update_own on public.assistant_threads;
create policy assistant_threads_update_own
on public.assistant_threads for update
using (public.current_company_id() = company_id and profile_id = auth.uid())
with check (public.current_company_id() = company_id and profile_id = auth.uid());

drop policy if exists assistant_messages_select_company on public.assistant_messages;
create policy assistant_messages_select_company
on public.assistant_messages for select
using (public.current_company_id() = company_id);

drop policy if exists assistant_messages_insert_own on public.assistant_messages;
create policy assistant_messages_insert_own
on public.assistant_messages for insert
with check (public.current_company_id() = company_id and profile_id = auth.uid());

drop policy if exists assistant_tool_calls_select_company on public.assistant_tool_calls;
create policy assistant_tool_calls_select_company
on public.assistant_tool_calls for select
using (public.current_company_id() = company_id);

drop policy if exists assistant_tool_calls_insert_own on public.assistant_tool_calls;
create policy assistant_tool_calls_insert_own
on public.assistant_tool_calls for insert
with check (public.current_company_id() = company_id and profile_id = auth.uid());

drop policy if exists assistant_feedback_select_company on public.assistant_feedback;
create policy assistant_feedback_select_company
on public.assistant_feedback for select
using (public.current_company_id() = company_id);

drop policy if exists assistant_feedback_insert_own on public.assistant_feedback;
create policy assistant_feedback_insert_own
on public.assistant_feedback for insert
with check (public.current_company_id() = company_id and profile_id = auth.uid());

drop policy if exists assistant_usage_limits_select_company on public.assistant_usage_limits;
create policy assistant_usage_limits_select_company
on public.assistant_usage_limits for select
using (public.current_company_id() = company_id);

drop policy if exists assistant_usage_limits_admin_manage on public.assistant_usage_limits;
create policy assistant_usage_limits_admin_manage
on public.assistant_usage_limits for all
using (public.current_company_id() = company_id and public.current_role() in ('admin','gerente_general'))
with check (public.current_company_id() = company_id and public.current_role() in ('admin','gerente_general'));

insert into public.assistant_usage_limits (company_id, role, daily_limit, status)
select c.id, x.role, x.daily_limit, 'Activo'
from public.companies c
cross join (values
  ('admin', 50),
  ('gerente_general', 50),
  ('gerente_operaciones_admin', 40),
  ('gerencia', 50),
  ('operaciones', 30),
  ('finanzas', 30),
  ('jefe_comercial', 30),
  ('administrativo_operaciones', 30),
  ('supervisor', 20),
  ('monitoreo', 20),
  ('comercial', 15),
  ('tecnico', 15),
  ('almacen', 15),
  ('viewer', 15)
) as x(role, daily_limit)
where c.name = 'ASSUR Chile'
on conflict (company_id, role, profile_id) do update
set daily_limit = excluded.daily_limit,
    status = excluded.status,
    updated_at = now();

insert into public.role_permissions (id, company_id, role_id, module_id, action, allowed)
select concat(r.id, '-assistant-ver'), r.company_id, r.id, 'assistant', 'ver', true
from public.roles r
where r.code in (
  'admin','gerente_general','gerente_operaciones_admin','gerencia','comercial','jefe_comercial','operaciones',
  'administrativo_operaciones','supervisor','tecnico','monitoreo',
  'finanzas','almacen','viewer'
)
on conflict (company_id, role_id, module_id, action) do update
set allowed = excluded.allowed;
