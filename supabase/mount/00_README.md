# Kit De Montaje Supabase - ASSUR Control

Este directorio contiene los archivos listos para aplicar en Supabase SQL Editor.

## Orden De Ejecucion

1. `01_schema.sql`
2. `02_seed_preview.sql`
3. Crear usuarios en Supabase Authentication > Users.
4. Copiar UUID de cada usuario Auth.
5. Editar `03_bootstrap_profiles_TEMPLATE.sql`, reemplazando `AUTH_UUID_*`.
6. Ejecutar `03_bootstrap_profiles_TEMPLATE.sql`.
7. `04_policies.sql`
8. `10_role_based_write_policies.sql`
9. `05_storage.sql`
10. Opcional QA/staging: `08_reset_demo_auth_passwords.sql`
11. `06_validation_queries.sql`

## Usuarios Sugeridos Para Auth

- admin@assur.cl -> admin
- oper@assur.cl -> operaciones
- super@assur.cl -> supervisor
- tec@assur.cl -> tecnico
- almacen@assur.cl -> almacen
- view@assur.cl -> viewer

Las contrasenas se crean directamente en Supabase Auth. No se guardan en el repo.

Para QA local se puede ejecutar `08_reset_demo_auth_passwords.sql`, que deja todos los usuarios sugeridos con `admin12345`.
No usar esa contrasena en produccion.

## Importante

- `service_role` nunca debe ir en variables `VITE_*`.
- Ejecutar `npm run stage:check` antes de aplicar cambios.
- Si cambia el seed o schema, regenerar este kit con `npm run supabase:mount:kit`.
