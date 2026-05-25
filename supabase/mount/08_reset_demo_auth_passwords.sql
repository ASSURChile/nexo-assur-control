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
  'admin@assur.cl',
  'oper@assur.cl',
  'super@assur.cl',
  'tec@assur.cl',
  'almacen@assur.cl',
  'view@assur.cl'
);
