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
  ('AUTH_UUID_GERENTE_GENERAL', '00000000-0000-0000-0000-000000000001', 'Gerente General', 'gerente@assur.cl', 'gerente_general', true),
  ('AUTH_UUID_GERENTE_OPERACIONES_ADMIN', '00000000-0000-0000-0000-000000000001', 'Gerente Operaciones y Administracion', 'gerops@assur.cl', 'gerente_operaciones_admin', true),
  ('AUTH_UUID_ADMIN', '00000000-0000-0000-0000-000000000001', 'Administrador Sistema', 'admin@assur.cl', 'admin', true),
  ('AUTH_UUID_GERENCIA', '00000000-0000-0000-0000-000000000001', 'Gerencia', 'gerencia@assur.cl', 'gerencia', true),
  ('AUTH_UUID_COMERCIAL', '00000000-0000-0000-0000-000000000001', 'Vendedor Demo', 'vendedor@assur.cl', 'comercial', true),
  ('AUTH_UUID_JEFE_COMERCIAL', '00000000-0000-0000-0000-000000000001', 'Jefe Comercial', 'jefecomercial@assur.cl', 'jefe_comercial', true),
  ('AUTH_UUID_OPERACIONES', '00000000-0000-0000-0000-000000000001', 'Jefe Operaciones', 'oper@assur.cl', 'operaciones', true),
  ('AUTH_UUID_ADMINOPS', '00000000-0000-0000-0000-000000000001', 'Administrativo Operaciones', 'adminops@assur.cl', 'administrativo_operaciones', true),
  ('AUTH_UUID_SUPERVISOR', '00000000-0000-0000-0000-000000000001', 'Supervisor Campo', 'super@assur.cl', 'supervisor', true),
  ('AUTH_UUID_TECNICO', '00000000-0000-0000-0000-000000000001', 'Juan Perez Tecnico', 'tec@assur.cl', 'tecnico', true),
  ('AUTH_UUID_MONITOREO', '00000000-0000-0000-0000-000000000001', 'Encargado Monitoreo', 'monitoreo@assur.cl', 'monitoreo', true),
  ('AUTH_UUID_FINANZAS', '00000000-0000-0000-0000-000000000001', 'Finanzas', 'finanzas@assur.cl', 'finanzas', true),
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
