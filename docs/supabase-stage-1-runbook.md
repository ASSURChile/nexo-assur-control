# Etapa 1 - Supabase Real

Objetivo: dejar ASSUR Control con una base cloud preparada para persistencia real, multiusuario y futura integración con Softland.

## 1. Crear Proyecto

Crear un proyecto Supabase y guardar:

- Project URL.
- Anon public key.
- Service role key, solo para scripts locales/backend.

No usar `service_role` en variables `VITE_*`.

## 2. Validar Archivos Locales

Antes de tocar Supabase:

```bash
npm run supabase:seed:preview
npm run supabase:seed:sql
npm run supabase:mount:kit
npm run stage:check
```

Debe quedar todo en OK, especialmente:

- `supabase:schema:check`
- `supabase:check`
- `supabase:mount:check`
- `supabase:push:dry`
- `audit:data`

## 3. Ejecutar SQL En Supabase

Usar el kit generado en `supabase/mount/`.

En SQL Editor, ejecutar en este orden:

1. `supabase/mount/01_schema.sql`
2. `supabase/mount/02_seed_preview.sql`
3. Crear usuarios en Authentication > Users.
4. Copiar los UUID de Auth.
5. Editar y ejecutar `supabase/mount/03_bootstrap_profiles_TEMPLATE.sql`.
6. `supabase/mount/04_policies.sql`
7. `supabase/mount/10_role_based_write_policies.sql`
8. `supabase/mount/05_storage.sql`
9. `supabase/mount/06_validation_queries.sql`

El seed usa IDs de dominio tipo texto para clientes, proyectos y servicios. Esto es intencional para preservar trazabilidad con datos locales, importadores y Softland. `companies` y `profiles` se mantienen como UUID porque `profiles.id` enlaza con `auth.users.id`.

## 4. Variables Frontend

Para probar Supabase Auth y tablas normalizadas:

```bash
VITE_DATA_PROVIDER=supabase_normalized
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_BACKEND_SYNC_ENABLED=false
```

Para seguir trabajando localmente:

```bash
VITE_DATA_PROVIDER=local
VITE_AUTH_MODE=demo
VITE_BACKEND_SYNC_ENABLED=false
```

## 5. Carga Por API Opcional

Si se prefiere cargar seed por REST usando service role:

```bash
npm run supabase:seed:preview
npm run supabase:seed:sql
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run supabase:push
```

Usar esto solo desde terminal local/backend, nunca desde frontend.

## 6. Validaciones En Supabase

Ejecutar consultas rápidas:

```sql
select count(*) from public.clients;
select count(*) from public.projects;
select count(*) from public.project_tasks;
select count(*) from public.invoices;
select count(*) from public.accounts_payable;
select id, full_name, role, active from public.profiles order by role;
```

Validar Storage:

```sql
select id, public from storage.buckets
where id in ('project-evidence','project-reports','signatures','service-documents');
```

## 7. Prueba De Roles

Con usuarios reales:

- Admin ve todo.
- Operaciones ve proyectos, aprobaciones, supervisor, materiales, almacén y servicios.
- Técnico entra a vista móvil.
- Almacén entra a vista almacén.
- Viewer no puede editar.

## 8. Condición De Cierre De Etapa

La etapa 1 queda cerrada cuando:

- SQL aplicado sin errores.
- Usuarios Auth creados.
- `profiles` poblado.
- RLS activo.
- Storage creado.
- App puede iniciar con `VITE_AUTH_MODE=supabase`.
- Dashboard, proyectos, finanzas y técnico cargan sin pantalla blanca.
