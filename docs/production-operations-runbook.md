# Runbook De Producción - NEXO por ASSUR

## Ambientes

- Producción: `https://assur-control.pages.dev`
  - Variables esperadas: `VITE_DATA_PROVIDER=supabase_normalized`, `VITE_AUTH_MODE=supabase`, `VITE_BACKEND_SYNC_ENABLED=false`, `VITE_ASSISTANT_API_URL`.
  - Uso: datos reales, usuarios reales y operación controlada.
- Staging:
  - Variables esperadas iguales a producción, pero apuntando a un proyecto Supabase separado.
  - Uso: pruebas `QA CLOUD`, validaciones de roles y simulaciones antes de publicar.
- Local:
  - Variables esperadas: `VITE_DATA_PROVIDER=local`, `VITE_AUTH_MODE=demo`.
  - Uso: desarrollo, diseño y pruebas sin datos reales.

## Checklist De Recuperación Supabase

1. Confirmar que el Project URL de Supabase resuelve por DNS.
2. Confirmar que `profiles` contiene usuarios activos con `company_id`.
3. Confirmar que `companies` contiene el tenant ASSUR.
4. Ejecutar en orden los scripts de `supabase/mount`.
5. Validar buckets privados: `project-evidence`, `project-reports`, `signatures`, `service-documents`.
6. Configurar Cloudflare Pages con URL y anon key correctas.
7. Publicar build productivo y probar login por rol.

## Montaje Nuevo Supabase

El backend productivo anterior `rerqodxtornjpeqqvebq` se considera abandonado si no resuelve DNS o no aparece en la cuenta Supabase. La ruta correcta es crear dos proyectos limpios:

- `nexo-assur-prod`: producción real.
- `nexo-assur-staging`: QA CLOUD y pruebas.

Proyectos creados:

- Producción: `nexo-assur-prod` / `ldodrcedviorjvbpladb` / `https://ldodrcedviorjvbpladb.supabase.co`
- Staging: `nexo-assur-staging` / `vdegakzslrrdvpdkarmn` / `https://vdegakzslrrdvpdkarmn.supabase.co`

Comandos base con Supabase CLI:

```bash
supabase login
supabase projects list
supabase projects create nexo-assur-prod --org-id <ORG_ID> --db-password '<PASSWORD_SEGURA>' --region sa-east-1 --size nano
supabase projects create nexo-assur-staging --org-id <ORG_ID> --db-password '<PASSWORD_SEGURA>' --region sa-east-1 --size nano
supabase projects api-keys --project-ref <PROJECT_REF_PROD>
supabase projects api-keys --project-ref <PROJECT_REF_STAGING>
```

Si no hay `sa-east-1` disponible para la cuenta/plan, usar `us-east-1`.

Orden de montaje SQL en ambos proyectos:

```txt
01_schema.sql
03_bootstrap_profiles_TEMPLATE.sql
04_policies.sql
05_storage.sql
07_fix_authenticated_grants.sql
09_extend_profile_roles.sql
10_role_based_write_policies.sql
11_commercial_packages_cloud.sql
12_operating_context_optional.sql
13_seed_roles_permissions.sql
14_assistant_ai.sql
06_validation_queries.sql
```

Antes de ejecutar `03_bootstrap_profiles_TEMPLATE.sql`:

1. Crear usuarios en Supabase Auth.
2. Copiar cada `auth.users.id`.
3. Reemplazar los placeholders `AUTH_UUID_*`.
4. Ejecutar el SQL editado.

Usuarios productivos iniciales:

```txt
gerente@assur.cl       -> gerente_general
gerops@assur.cl        -> gerente_operaciones_admin
admin@assur.cl         -> admin
gerencia@assur.cl      -> gerencia
vendedor@assur.cl      -> comercial
jefecomercial@assur.cl -> jefe_comercial
oper@assur.cl          -> operaciones
adminops@assur.cl      -> administrativo_operaciones
super@assur.cl         -> supervisor
tec@assur.cl           -> tecnico
monitoreo@assur.cl     -> monitoreo
finanzas@assur.cl      -> finanzas
almacen@assur.cl       -> almacen
view@assur.cl          -> viewer
```

`08_reset_demo_auth_passwords.sql` solo se permite en staging.

## Publicación Cloudflare Pages

Para despliegues directos desde este workspace, las variables `VITE_*` se inyectan en el build local. Crear un `.env.production` privado con:

```bash
VITE_DATA_PROVIDER=supabase_normalized
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=https://<PROJECT_REF_PROD>.supabase.co
VITE_SUPABASE_ANON_KEY=<ANON_KEY_PROD>
VITE_ASSISTANT_API_URL=https://nexo-assur-assistant-prod.<SUBDOMINIO>.workers.dev
VITE_BACKEND_SYNC_ENABLED=false
```

Luego ejecutar:

```bash
npm run hardening:check
npm run stage:check
npm run build
npx wrangler pages deploy dist --project-name assur-control --branch main
```

Para staging, usar `.env.staging` con el proyecto `nexo-assur-staging` y desplegar a una rama/preview separada si se requiere validar antes de producción.

No usar `wrangler pages secret` para `VITE_*` en un despliegue estático directo; esas variables deben existir antes del build. Las secrets de Cloudflare quedan reservadas para Workers/funciones serverless futuras.

## Asistente NEXO

El asistente corre en Cloudflare Worker y usa Cloudflare Workers AI. El frontend solo conoce `VITE_ASSISTANT_API_URL`; nunca consulta IA directo ni recibe claves privadas.

Despliegue recomendado:

```bash
ASSISTANT_ENV=staging npm run assistant:deploy
ASSISTANT_ENV=prod npm run assistant:deploy
```

QA recomendado:

```bash
ASSISTANT_API_URL=https://nexo-assur-assistant-staging.<SUBDOMINIO>.workers.dev ASSISTANT_ENV=staging npm run assistant:check
ASSISTANT_API_URL=https://nexo-assur-assistant-prod.<SUBDOMINIO>.workers.dev ASSISTANT_ENV=prod npm run assistant:check
```

Reglas productivas:

- MVP solo lectura.
- El Worker valida JWT Supabase en `/auth/v1/user`.
- El Worker obtiene `profile`, `role_permissions` y `profile_permissions`.
- La IA no genera SQL libre ni consulta tablas directamente.
- Las consultas quedan auditadas en `assistant_threads`, `assistant_messages` y `assistant_tool_calls`.
- Si Workers AI falla, el Worker responde con fallback operacional breve y registra el intento cuando las tablas existen.

## Seguridad Operativa

- Nunca agregar `SUPABASE_SERVICE_ROLE_KEY` al frontend ni a Cloudflare Pages.
- Nunca guardar tokens Softland en `localStorage`.
- Usuarios productivos se crean en Supabase Auth.
- Roles y permisos operativos se gestionan con `profiles`, `roles`, `role_permissions` y `profile_permissions`.
- RLS debe permanecer activo en tablas de dominio, documentos, adjuntos, eventos y errores.

## Documentos Y Evidencias

- Fotos, firmas, PDFs, actas y documentos de servicio deben vivir en Supabase Storage.
- Cada archivo debe tener registro en `attachments`.
- Cada cotización/documento emitido debe tener registro en `generated_documents`.
- Cada edición importante debe crear una fila en `document_versions`.
- No usar base64 como almacenamiento permanente.

## Auditoría Y Salud

- Cambios críticos deben registrar `activity_events`.
- Errores de frontend, permisos, Storage, PDF y sincronización deben registrar `error_logs`.
- Consultas del asistente deben registrar mensajes y herramientas usadas.
- Admin debe revisar Configuración > Salud después de cada despliegue productivo.
- Las pruebas `QA CLOUD` deben limpiarse antes de abrir uso real.

## Backup

- Exportación semanal durante piloto:

```bash
BACKUP_ENV=prod npm run backup:cloud
```

- Exportación de staging antes de pruebas destructivas:

```bash
BACKUP_ENV=staging npm run backup:cloud
```

- Los archivos quedan en `backups/`, carpeta ignorada por git porque contiene datos de negocio.
- Exportación mensual para archivo administrativo.
- Prueba de restauración trimestral en staging.
- Antes de cambios grandes: exportar backup y registrar fecha, responsable y motivo.
- Las credenciales iniciales deben vivir en Keychain:
  - `nexo-assur-supabase-prod-credentials`;
  - `nexo-assur-supabase-staging-credentials`.

## Criterios Para Salir De Modo Demo

- Supabase Auth activo y probado.
- Producción usa `VITE_AUTH_MODE=supabase`.
- Cloudflare usa `VITE_DATA_PROVIDER=supabase_normalized`.
- Todos los roles iniciales pueden entrar.
- Flujo cliente → cotización → proyecto → técnico → servicio → finanzas persiste tras logout/reload.
- No hay datos `QA CLOUD` residuales en producción.
