-- Bootstrap inicial de empresa y perfiles.
-- Archivo listo para ejecutar en Supabase SQL Editor.

begin;

insert into public.companies (id, name, rut)
values ('00000000-0000-0000-0000-000000000001', 'ASSUR Chile', null)
on conflict (id) do update set
  name = excluded.name,
  rut = excluded.rut;

insert into public.profiles (id, company_id, full_name, email, role, active)
values
  ('aa724f5e-b629-4a49-8ea2-b7c7d32df9b7', '00000000-0000-0000-0000-000000000001', 'Administrador', 'admin@assur.cl', 'admin', true),
  ('5a08e8bc-7bf4-4caf-a388-03a4e7d958f0', '00000000-0000-0000-0000-000000000001', 'Jefe Operaciones', 'oper@assur.cl', 'operaciones', true),
  ('1ec562fb-d476-465e-ba81-fc8f7bcf6825', '00000000-0000-0000-0000-000000000001', 'Supervisor Campo', 'super@assur.cl', 'supervisor', true),
  ('daaed226-3afe-4652-b48f-eacf512bbcc6', '00000000-0000-0000-0000-000000000001', 'Juan Perez Tecnico', 'tec@assur.cl', 'tecnico', true),
  ('efa326f2-0d38-4acc-9115-241a6c5976c4', '00000000-0000-0000-0000-000000000001', 'Almacen Central', 'almacen@assur.cl', 'almacen', true),
  ('0ebc24f4-d30f-4a8a-9f26-6e2a18e301aa', '00000000-0000-0000-0000-000000000001', 'Visualizador', 'view@assur.cl', 'viewer', true)
on conflict (id) do update set
  company_id = excluded.company_id,
  full_name = excluded.full_name,
  email = excluded.email,
  role = excluded.role,
  active = excluded.active,
  updated_at = now();

commit;
