-- Reset de contrasenas demo para QA.
-- Ejecutar solo en ambiente de desarrollo/staging.
-- No usar estas contrasenas en produccion.

create extension if not exists pgcrypto with schema extensions;

update auth.users
set
  encrypted_password = extensions.crypt('admin12345', extensions.gen_salt('bf')),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  updated_at = now()
where email in (
  'gerente@assur.cl',
  'gerops@assur.cl',
  'admin@assur.cl',
  'gerencia@assur.cl',
  'comercial@assur.cl',
  'vendedor@assur.cl',
  'jefecomercial@assur.cl',
  'oper@assur.cl',
  'adminops@assur.cl',
  'super@assur.cl',
  'tec@assur.cl',
  'monitoreo@assur.cl',
  'finanzas@assur.cl',
  'almacen@assur.cl',
  'view@assur.cl'
);
