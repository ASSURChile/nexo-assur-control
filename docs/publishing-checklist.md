# Checklist De Publicación ASSUR Control

Ruta recomendada para el MVP privado: Cloudflare Pages Free + Supabase.

URL gratuita esperada: `https://assur-control.pages.dev` o la variante que
entregue Cloudflare Pages.

## 1. Validar Estado Local

```bash
npm run stage:check
```

Debe quedar todo en OK antes de publicar.

## 2. Crear Supabase

1. Crear proyecto en Supabase.
2. Guardar:
   - Project URL.
   - Anon key.
   - Service role key solo para scripts/backend.
3. No pegar service role en variables `VITE_*`.

Guía operativa detallada: `docs/supabase-stage-1-runbook.md`.

## 3. Crear Base De Datos

Generar kit de montaje:

```bash
npm run supabase:seed:preview
npm run supabase:seed:sql
npm run supabase:mount:kit
npm run supabase:mount:check
```

Ejecutar en SQL Editor usando `supabase/mount/`:

1. `01_schema.sql`
2. `02_seed_preview.sql`
3. Crear usuarios en Supabase Auth.
4. Crear filas en `profiles` usando los `id` de Auth.
5. Ejecutar `03_bootstrap_profiles_TEMPLATE.sql`.
6. Ejecutar `04_policies.sql`.
7. Ejecutar `10_role_based_write_policies.sql`.
8. Ejecutar `05_storage.sql`.
9. Ejecutar `06_validation_queries.sql`.

## 4. Publicar Frontend En Cloudflare Pages

1. Subir el proyecto a un repositorio GitHub privado.
2. Crear proyecto en Cloudflare Pages.
3. Conectar el repositorio.
4. Configurar:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
5. Agregar las variables frontend productivas.
6. Ejecutar deploy y registrar la URL `*.pages.dev`.

El repo incluye `public/_redirects` para recargas de la SPA y `public/_headers`
con headers basicos de seguridad.

Vercel queda como alternativa, pero Cloudflare Pages es la opcion base gratuita
para este MVP.

## 5. Variables De Entorno Frontend

Para desarrollo cloud:

```bash
VITE_DATA_PROVIDER=supabase_normalized
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=https://...
VITE_SUPABASE_ANON_KEY=...
VITE_BACKEND_SYNC_ENABLED=false
```

Para mantener modo local:

```bash
VITE_DATA_PROVIDER=local
VITE_AUTH_MODE=demo
VITE_BACKEND_SYNC_ENABLED=false
```

Para usar backend propio/local como puente:

```bash
VITE_DATA_PROVIDER=backend
VITE_BACKEND_SYNC_ENABLED=true
VITE_ASSUR_BACKEND_URL=https://...
```

## 6. Variables Server-Side

Solo scripts/backend:

```bash
SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 7. Validar Seed

```bash
npm run supabase:check
npm run supabase:push:dry
```

Si se decide subir por API:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run supabase:push
```

## 8. Softland

MVP:

- Mantener CSV.
- Conciliar facturas, pagos, CxC y CxP.

Producción:

- API o credenciales solo desde backend/Edge Functions.
- Registrar sincronizaciones en `sync_logs`.
- Nunca guardar tokens en frontend ni `localStorage`.

## 9. Pendientes Antes De Abrir A Usuarios Reales

- Crear perfiles reales en Supabase Auth.
- Validar RLS con admin, operaciones, técnico, almacén y viewer.
- Probar carga de fotos/evidencias en Storage.
- Probar ciclo completo: cliente → propuesta → proyecto → cierre → servicio recurrente → facturación esperada.
- Revisar diseño final y contraste visual.
- Mantener `npm run perf:check` en verde para evitar regresiones de bundle.
- Mantener `npm run audit:data` en verde para evitar desalineación entre frontend, backend y exportaciones.
