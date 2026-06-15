# Kit De Montaje Supabase - NEXO por ASSUR

Este directorio contiene los archivos listos para aplicar en Supabase SQL Editor.

## Orden De Ejecucion

1. `01_schema.sql`
2. Crear usuarios en Supabase Authentication > Users.
3. Copiar UUID de cada usuario Auth.
4. Editar `03_bootstrap_profiles_TEMPLATE.sql`, reemplazando `AUTH_UUID_*`.
5. Ejecutar `03_bootstrap_profiles_TEMPLATE.sql`.
6. `04_policies.sql`
7. `05_storage.sql`
8. `07_fix_authenticated_grants.sql`
9. `09_extend_profile_roles.sql`
10. `10_role_based_write_policies.sql`
11. `11_commercial_packages_cloud.sql`
12. `12_operating_context_optional.sql`
13. `13_seed_roles_permissions.sql`
14. `14_assistant_ai.sql`
15. Opcional QA/staging: `02_seed_preview.sql`
16. Opcional QA/staging: `08_reset_demo_auth_passwords.sql`
17. `06_validation_queries.sql`

## Usuarios Sugeridos Para Auth

- gerente@assur.cl -> gerente_general
- gerops@assur.cl -> gerente_operaciones_admin
- admin@assur.cl -> admin
- gerencia@assur.cl -> gerencia
- vendedor@assur.cl -> comercial
- jefecomercial@assur.cl -> jefe_comercial
- oper@assur.cl -> operaciones
- adminops@assur.cl -> administrativo_operaciones
- super@assur.cl -> supervisor
- tec@assur.cl -> tecnico
- monitoreo@assur.cl -> monitoreo
- finanzas@assur.cl -> finanzas
- almacen@assur.cl -> almacen
- view@assur.cl -> viewer

Las contrasenas se crean directamente en Supabase Auth. No se guardan en el repo.

Para QA/staging se puede ejecutar `08_reset_demo_auth_passwords.sql`.
No usar contrasenas demo en produccion.

## Contexto Operativo

- Tenant principal: ASSUR Chile.
- Entidades legales: Alerta MD, Servicios Electronicos, ASSUR Chile futura.
- Unidades de negocio: Monitoreo, Proyectos, ASSUR Home, ASSUR Empresas.

## Importante

- `service_role` nunca debe ir en variables `VITE_*`.
- Ejecutar `npm run stage:check` antes de aplicar cambios.
- Si cambia el seed o schema, regenerar este kit con `npm run supabase:mount:kit`.
