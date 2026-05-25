-- Crear perfiles despues de usuarios Auth
-- Fuente: supabase/bootstrap-profiles.template.sql

-- Bootstrap inicial de empresa y perfiles.
-- 1) Crear usuarios en Supabase Auth desde Authentication > Users.
-- 2) Copiar el UUID de cada usuario Auth.
-- 3) Reemplazar los placeholders AUTH_UUID_* antes de ejecutar este archivo.

begin;

insert into public.companies (id, name, rut)
values ('00000000-0000-0000-0000-000000000001', 'ASSUR Chile', null)
on conflict (id) do update set
  name = excluded.name,
  rut = excluded.rut;

insert into public.profiles (id, company_id, full_name, email, role, active)
values
  ('AUTH_UUID_ADMIN', '00000000-0000-0000-0000-000000000001', 'Administrador', 'admin@assur.cl', 'admin', true),
  ('AUTH_UUID_OPERACIONES', '00000000-0000-0000-0000-000000000001', 'Jefe Operaciones', 'oper@assur.cl', 'operaciones', true),
  ('AUTH_UUID_SUPERVISOR', '00000000-0000-0000-0000-000000000001', 'Supervisor Campo', 'super@assur.cl', 'supervisor', true),
  ('AUTH_UUID_TECNICO', '00000000-0000-0000-0000-000000000001', 'Juan Perez Tecnico', 'tec@assur.cl', 'tecnico', true),
  ('AUTH_UUID_ALMACEN', '00000000-0000-0000-0000-000000000001', 'Almacen Central', 'almacen@assur.cl', 'almacen', true),
  ('AUTH_UUID_VIEWER', '00000000-0000-0000-0000-000000000001', 'Visualizador', 'view@assur.cl', 'viewer', true)
on conflict (id) do update set
  company_id = excluded.company_id,
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  active = excluded.active,
  updated_at = now();

commit;
