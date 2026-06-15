# Estado De Endurecimiento Productivo - NEXO por ASSUR

Fecha: 2026-06-04

## Estado Ejecutivo

El frontend y el kit de base de datos ya abandonaron el Supabase anterior y montaron dos proyectos nuevos:

- `nexo-assur-prod`: `ldodrcedviorjvbpladb`
- `nexo-assur-staging`: `vdegakzslrrdvpdkarmn`

Produccion fue publicada en Cloudflare Pages con Supabase Auth real.

## Ejecutado

- Supabase CLI disponible: `2.105.0`.
- Supabase CLI autenticado por access token temporal.
- Cloudflare Wrangler autenticado y proyecto `assur-control` visible.
- Proyecto Supabase `nexo-assur-prod` creado en region `sa-east-1`.
- Proyecto Supabase `nexo-assur-staging` creado en region `sa-east-1`.
- Auth users creados en ambos proyectos.
- Produccion desplegada en Cloudflare: `https://24ef39f2.assur-control.pages.dev`.
- Despliegue de cierre post-pendientes: `https://a138fa67.assur-control.pages.dev`.
- URL principal validada: `https://assur-control.pages.dev`.
- Kit de montaje Supabase regenerado y validado.
- Bootstrap de perfiles ampliado a todos los roles operativos.
- Semilla de roles y permisos creada en `13_seed_roles_permissions.sql`.
- Contexto multiempresa creado:
  - Alerta MD;
  - Servicios Electronicos;
  - ASSUR Chile futura.
- Unidades operativas creadas:
  - Monitoreo;
  - Proyectos;
  - ASSUR Home;
  - ASSUR Empresas.
- Script viejo `03_bootstrap_profiles_READY.sql` eliminado para evitar reutilizar UUID del Supabase caido.
- Runbook productivo actualizado con comandos de creacion, montaje y deploy.
- Checks ejecutados correctamente:
  - `npm run supabase:mount:check`;
  - `npm run hardening:check`;
  - `npm run build`;
  - `npm run stage:check`.
- Login productivo validado:
  - `admin@assur.cl` autentica correctamente;
  - `profiles` devuelve rol `admin`;
  - la vista publicada carga dashboard sin credenciales demo visibles.
- QA intensiva cloud ejecutada y documentada en `docs/qa-hardening-report.md`:
  - staging valido flujo `QA CLOUD`, paquete comercial, documentos, evidencias, Storage, eventos y logs;
  - produccion se valido en modo no destructivo;
  - los 12 roles iniciales autentican, estan activos y tienen `company_id`;
  - limpieza QA de staging dejo residuos documentales y operativos en cero;
  - `https://assur-control.pages.dev` responde HTTP 200.

## Credenciales

Las credenciales iniciales fueron movidas a Keychain y los archivos temporales fueron eliminados.

```txt
nexo-assur-supabase-prod-credentials
nexo-assur-supabase-staging-credentials
```

Los backups cloud usan esas entradas de Keychain mediante `npm run backup:cloud`.

## Seguridad

Access token temporal `codex-nexo-hardening` revocado desde Supabase Account Tokens.
Sesion local de Supabase CLI cerrada con `supabase logout`.

## Backup Inicial

Backup inicial de produccion ejecutado:

```txt
backups/nexo-assur-prod-2026-06-05T03-11-04-378Z.json
```

La carpeta `backups/` queda ignorada por git.

## Validacion Post-Pendientes

- `npm run hardening:check`: OK.
- `npm run build`: OK.
- `npm run perf:check`: OK.
- `https://assur-control.pages.dev`: HTTP 200.
- Build publica validada: `index-srEB7VBH.js`.
- Branding tecnico movil actualizado y publicado.

## Pendientes Antes Del Piloto

1. Iniciar piloto interno controlado con pocos usuarios.
2. Revisar checklist diario de errores durante la primera semana.
3. Mantener exportacion semanal:
   - `BACKUP_ENV=prod npm run backup:cloud`.
4. Continuar etapa UX/redisenio luego de validar uso real.
