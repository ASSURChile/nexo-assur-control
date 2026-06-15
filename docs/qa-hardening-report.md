# Informe QA Intensivo Y Endurecimiento Arquitectonico - NEXO por ASSUR

Fecha: 2026-06-04

## Resultado Ejecutivo

La ronda QA de endurecimiento queda aprobada para pasar a correccion fina y piloto interno controlado. Se validaron los dos ambientes cloud:

- Produccion: `https://assur-control.pages.dev`
- Supabase prod: `https://ldodrcedviorjvbpladb.supabase.co`
- Supabase staging: `https://vdegakzslrrdvpdkarmn.supabase.co`

Produccion se valido en modo no destructivo. Staging se uso para flujo `QA CLOUD`, documentos, evidencias, logs, eventos y limpieza.

## Checks Locales Ejecutados

Todos quedaron OK:

- `npm run hardening:check`
- `npm run supabase:mount:check`
- `npm run supabase:schema:check`
- `npm run audit:ui`
- `npm run audit:data`
- `npm run perf:check`
- `npm run stage:check`
- `npm run build`

Observacion menor: `hardening:check` mantiene advertencias sobre archivos `.env.*.example` con placeholders. No bloquea, porque Cloudflare ya usa variables reales y esos archivos son ejemplos.

## QA Cloud Por Roles

Se validaron 12 usuarios en staging y produccion contra Supabase Auth real:

- `admin@assur.cl`
- `gerencia@assur.cl`
- `comercial@assur.cl`
- `jefecomercial@assur.cl`
- `oper@assur.cl`
- `adminops@assur.cl`
- `super@assur.cl`
- `tec@assur.cl`
- `monitoreo@assur.cl`
- `finanzas@assur.cl`
- `almacen@assur.cl`
- `view@assur.cl`

Resultado:

- Auth OK.
- `profiles` OK.
- Usuarios activos OK.
- `company_id` OK.
- Matriz de permisos OK, con 451 permisos activos.

## QA Funcional En Staging

Se creo y valido flujo completo `QA CLOUD`:

```txt
Cliente
-> Instalacion
-> Oportunidad
-> Propuesta
-> Cotizacion
-> Proyecto
-> Tareas tecnicas
-> Servicio recurrente
-> Facturas
-> Pago
-> CxP
-> Facturacion esperada
```

Tambien se valido flujo paquetizado:

```txt
Paquete comercial
-> Item de paquete
-> Servicio mensual del paquete
-> Oportunidad
-> Propuesta
-> Cotizacion rapida
```

## Documentos, Evidencias Y Trazabilidad

En staging se valido:

- Subida a Storage privado en `project-evidence`.
- URL firmada temporal.
- Registro en `attachments`.
- Plantilla en `document_templates`.
- Documento en `generated_documents`.
- Version editable en `document_versions`.
- Evento en `activity_events`.
- Log tecnico en `error_logs`.

Luego se ejecuto limpieza QA y quedaron en cero los residuos QA de:

- `attachments`
- `document_templates`
- `generated_documents`
- `document_versions`
- `activity_events`
- `error_logs`
- flujo comercial/operativo `QA CLOUD`
- paquete comercial QA
- objeto QA en Storage

## Produccion

Produccion se valido sin escrituras destructivas:

- `https://assur-control.pages.dev` responde HTTP 200.
- Supabase prod responde con Auth real.
- Los 12 roles existen, estan activos y tienen `company_id`.
- No se escribieron documentos, logs ni evidencias QA en produccion.
- Consulta de solo lectura confirma `0` registros QA en tablas de dominio, documentos, eventos y logs.

## QA Navegador Por Roles

Se recorrio la app publicada por rol. Resultado general:

- No se detectaron pantallas blancas en los roles probados.
- Admin ve el shell NEXO y modulos principales.
- Gerencia, comercial, jefe comercial, operaciones, adminops, supervisor, monitoreo, finanzas, almacen y viewer cargan sus vistas sin error visible.
- Tecnico entra a la vista movil "Mi jornada" y no queda en blanco.

Hallazgo no bloqueante:

- La vista movil de tecnico aun conserva branding antiguo `ASSUR CONTROL`. Debe actualizarse visualmente a `NEXO por ASSUR` en la etapa UX.

## Correcciones Aplicadas Durante QA

- `scripts/create-e2e-flow.mjs`: se corrigio la lectura de ambiente para priorizar `process.env` sobre `.env.local`.
- `scripts/qa-cloud-hardening.mjs`: se agrego QA cloud de roles, Storage, documentos, eventos y logs.
- `scripts/cleanup-qa-cloud.mjs`: se amplio limpieza para documentos, evidencias, eventos, logs y objeto Storage.
- `package.json`: se agrego `qa:hardening-cloud`.

## Brechas Pendientes Antes Del Piloto Real

Prioridad alta:

- Completado: access token temporal `codex-nexo-hardening` revocado desde Supabase Account Tokens.
- Completado: credenciales `tmp/supabase-*-credentials.json` movidas a Keychain y archivos locales eliminados.
- Completado: rutina de backup/exportacion semanal documentada y backup inicial de produccion ejecutado.

Prioridad media:

- Completado: branding de tecnico movil actualizado a `NEXO por ASSUR`.
- Agregar QA navegador automatizado mas profundo para subpestanas internas.
- Separar staging/production desde pipeline formal de Cloudflare, no solo por variables de despliegue.
- Implementar panel "Salud del sistema" con lectura real de `error_logs`, Storage y ultimos eventos.

Prioridad posterior:

- Redisenar UX profunda.
- Offline tecnico.
- Softland API.
- Asistente IA/chat.

## Decision De Salida

La arquitectura base cloud queda endurecida para piloto controlado. Las acciones de seguridad inmediatas ya fueron completadas.
