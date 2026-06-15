# Acta De Entrega Técnica Y Resumen Del Proyecto - NEXO por ASSUR

Fecha de entrega: 2026-06-15

## 1. Objetivo Del Sistema

NEXO por ASSUR es una plataforma de control operativo-gerencial para ordenar la gestión comercial, operacional, técnica, recurrente y financiera del negocio.

El sistema no reemplaza el ERP contable. Funciona como capa de gestión, trazabilidad y decisión sobre la operación diaria.

Objetivos principales:

- Centralizar clientes, instalaciones, oportunidades, solicitudes de cotización, propuestas y proyectos.
- Controlar ejecución técnica, fichajes, evidencias, materiales, incidencias y cierres.
- Administrar servicios recurrentes, protocolos, MRR y activaciones de monitoreo.
- Consolidar facturación esperada, cobranza, CxC, CxP, caja y rentabilidad gerencial.
- Preparar integración futura con Softland mediante API o importación controlada.

## 2. Alcance Actual Del MVP

| Área | Estado / alcance |
|---|---|
| Frontend | React + Vite publicado en Cloudflare Pages. |
| Backend cloud | Supabase Auth, PostgreSQL, Storage privado y RLS. |
| Roles | Roles operativos por módulo y acción: gerencia, comercial, operaciones, técnico, finanzas, almacén, viewer, entre otros. |
| Documentos | Plantilla editable de cotización y estructura para PDF/versiones. |
| Evidencias | Preparado para fotos, firmas, actas, PDFs y documentos en Storage. |
| Asistente IA | MVP conceptual/técnico preparado con Worker y tablas de auditoría; uso solo lectura. |
| Softland | En standby. Documentado para conexión futura por API/CSV; no implementado en producción. |

## 3. Arquitectura Técnica

| Capa | Tecnología | Uso |
|---|---|---|
| Frontend | React 18 + Vite | Aplicación web, shell administrativo, vistas por rol y técnico móvil. |
| Hosting | Cloudflare Pages | Publicación del frontend en URL pública controlada. |
| Base de datos | Supabase PostgreSQL | Datos operativos normalizados y multiempresa. |
| Autenticación | Supabase Auth | Login real por usuario y vínculo con profiles. |
| Seguridad | Supabase RLS | Restricción por company_id, rol y permisos. |
| Archivos | Supabase Storage | Evidencias, firmas, PDFs, actas y documentos. |
| IA / asistente | Cloudflare Worker + Workers AI | Consulta conversacional segura y solo lectura, según rol. |
| Integración ERP | Softland futuro | Fuente formal contable mediante API creada desde SQL/Control de Gestión. |

## 4. Ambientes

| Ambiente | Servicio | URL / referencia | Uso |
|---|---|---|---|
| Producción | Cloudflare Pages | https://assur-control.pages.dev | Piloto productivo controlado. |
| Supabase prod | nexo-assur-prod | https://ldodrcedviorjvbpladb.supabase.co | Auth, DB, Storage y RLS productivo. |
| Supabase staging | nexo-assur-staging | https://vdegakzslrrdvpdkarmn.supabase.co | QA CLOUD y pruebas destructivas. |
| Local | Vite dev server | http://127.0.0.1:5173 o similar | Desarrollo, diseño y pruebas locales. |

## 5. Repositorio Y Comandos Base

Repositorio corporativo:

```txt
https://github.com/ASSURChile/nexo-assur-control
```

Comandos:

```bash
npm install
npm run dev
npm run build
npm run stage:check
npm run hardening:check
npm run supabase:mount:check
npm run pages:deploy:prod
```

## 6. Variables De Entorno

Cloudflare Pages debe compilar con variables públicas `VITE_*`.

| Variable | Producción | Notas |
|---|---|---|
| VITE_DATA_PROVIDER | supabase_normalized | Proveedor productivo. |
| VITE_AUTH_MODE | supabase | Autenticación real. |
| VITE_SUPABASE_URL | Completar URL prod | Configurar en Cloudflare. |
| VITE_SUPABASE_ANON_KEY | Completar anon/publishable key | Clave pública de frontend. No usar service role. |
| VITE_ASSISTANT_API_URL | Completar URL Worker | Si el asistente está activo. |
| VITE_BACKEND_SYNC_ENABLED | false | Mantener desactivado salvo decisión técnica posterior. |

No configurar en frontend:

- `SUPABASE_SERVICE_ROLE_KEY`
- tokens Softland
- passwords de usuarios
- claves privadas de Cloudflare
- credenciales personales

## 7. Accesos Y Credenciales A Completar

Los campos de password y tokens quedan intencionalmente vacíos. Completar solo en una copia controlada o gestor de contraseñas.

| Servicio | Cuenta / usuario | Rol esperado | Password / secreto |
|---|---|---|---|
| GitHub | integracion@mdsg.cl | Owner/Admin organización o repo | Completar por Moisés |
| Cloudflare | integracion@mdsg.cl | Admin cuenta/proyecto Pages/Workers | Completar por Moisés |
| Supabase | integracion@mdsg.cl | Administrator prod/staging | Completar por Moisés |
| NEXO admin app | admin@assur.cl | admin | Completar por Moisés |
| NEXO gerencia | gerente@assur.cl / gerencia@assur.cl | gerente_general / gerencia | Completar por Moisés |
| NEXO operaciones | oper@assur.cl | operaciones | Completar por Moisés |
| NEXO técnico | tec@assur.cl | tecnico | Completar por Moisés |
| NEXO finanzas | finanzas@assur.cl | finanzas | Completar por Moisés |
| Supabase service role | No usar en frontend | Solo backend/operación segura | Guardar solo en gestor seguro |
| Softland futuro | Por definir Control de Gestión | API/SQL intermedio | Pendiente |

## 8. Roles Funcionales Principales

| Rol | Uso principal |
|---|---|
| Gerente General | Visión completa, dashboard consolidado, alertas críticas y decisiones transversales. |
| Gerente Operaciones y Administración | Visión consolidada financiera, administrativa, comercial y operacional, con menor exposición a configuración sensible. |
| Jefe Comercial | Equipo comercial, pipeline, seguimientos, solicitudes y propuestas listas. |
| Vendedor / Comercial | Leads, contactos, seguimiento comercial y solicitudes de cotización. |
| Jefe de Operaciones | Cotizaciones, costeo, propuestas, proyectos, materiales, recursos y cierres. |
| Administrativo de Operaciones | Productos, técnicos, stock, solicitudes de materiales y apoyo a proyectos. |
| Supervisor | Seguimiento de ejecuciones técnicas, incidencias y avance de campo. |
| Técnico | Aplicación móvil de terreno: jornada, tareas, fichaje, evidencia, materiales, incidencias y cierre. |
| Finanzas | Facturación, cobranza, CxC, CxP, caja, rentabilidad y control financiero. |
| Almacén | Stock, solicitudes, entregas y materiales críticos. |
| Viewer | Lectura restringida sin edición. |

## 9. Estado Validado Al Handoff

- Producción y staging Supabase se encuentran Healthy.
- Los endpoints Supabase prod/staging responden HTTP 200.
- El schema remoto principal fue validado contra producción y staging.
- El repositorio GitHub está publicado y accesible por remoto SSH.
- Cloudflare tiene `integracion@mdsg.cl` como miembro activo.
- Supabase tiene `integracion@mdsg.cl` como Administrator en prod/staging.
- Build productivo ejecutado correctamente.

## 10. Checklist De Recepción Para El Informático

- [ ] Iniciar sesión con `integracion@mdsg.cl` en GitHub, Cloudflare y Supabase.
- [ ] Clonar `https://github.com/ASSURChile/nexo-assur-control`.
- [ ] Ejecutar `npm install`.
- [ ] Ejecutar `npm run build`.
- [ ] Ejecutar `npm run stage:check`.
- [ ] Confirmar acceso a Cloudflare Pages `assur-control`.
- [ ] Confirmar acceso a Supabase `nexo-assur-prod` y `nexo-assur-staging`.
- [ ] Confirmar que puede ver Auth, Database, Storage y SQL Editor.
- [ ] Realizar deploy de prueba o preview desde cuenta corporativa.
- [ ] Documentar fecha de recepción y responsable técnico.

## 11. Pendientes Recomendados

- Rotar o revocar tokens personales temporales cuando el informático confirme acceso propio.
- Validar QA completa por rol antes de cargar datos reales masivos.
- Definir gestor de contraseñas corporativo para secrets y credenciales.
- Ejecutar backup antes de cada cambio mayor.
- Mantener Softland en standby hasta recibir especificación técnica de API/SQL.
- No transferir ownership final hasta tener un deploy confirmado desde la cuenta corporativa.

## 12. Firma De Entrega

| Rol | Nombre | Firma / conformidad | Fecha |
|---|---|---|---|
| Entrega | Moisés Herrera |  |  |
| Recibe | Informático a cargo |  |  |
| Cuenta corporativa | integracion@mdsg.cl |  |  |
