# Plan de autenticacion y seguridad

Estado actual: el MVP local usa usuarios demo almacenados en el navegador. Esto sirve para validar flujos por rol, pero no es apto para produccion.

## Decision recomendada

Usar Supabase Auth como autenticacion real en la primera publicacion.

Motivos:

- Evita guardar passwords en React o `localStorage`.
- Incluye recuperacion de password.
- Se integra con PostgreSQL y Row Level Security.
- Tiene plan gratuito suficiente para el MVP.

## Cambios obligatorios antes de publicar

| Tarea | Estado | Nota |
| --- | --- | --- |
| Reemplazar `af_usuarios` por Supabase Auth + `profiles` | Pendiente | Los usuarios demo solo quedan para desarrollo local. |
| Eliminar passwords de datos exportables | En curso | La exportacion operativa no debe incluir usuarios, sesiones ni credenciales. |
| Crear policies RLS por `company_id` y rol | Validacion | Base inicial creada en `supabase/policies.sql`; se ajusta al activar Auth real. |
| Mover tokens Softland al backend/serverless | En curso | La UI ya no guarda token; falta Edge Function/backend real. |
| Crear audit log para cambios sensibles | Pendiente | Aprobaciones, pagos, costos, usuarios, permisos. |
| Definir puente cloud transitorio | Validacion | `app_collections` permite publicar MVP sin transformar aun todo el modelo local. |
| Preparar scripts RLS/Storage | Validacion | Scripts iniciales en `supabase/policies.sql` y `supabase/storage.sql`. |

## Roles iniciales

| Rol | Alcance |
| --- | --- |
| `admin` | Configuracion, usuarios, finanzas, operaciones, reportes. |
| `operaciones` | Proyectos, aprobaciones, personal, materiales, incidencias. |
| `supervisor` | Equipo, cierres, aprobaciones operativas y proyectos asignados. |
| `tecnico` | Vista movil, tareas asignadas, fichaje, fotos, solicitudes y cierre. |
| `almacen` | Solicitudes de material, stock, entregas y recepciones. |
| `viewer` | Solo lectura segun permisos definidos. |

## RLS operativo minimo

Las policies deben permitir que el sistema siga funcionando por rol:

- `admin`, `operaciones` y `supervisor` pueden administrar datos operativos de su empresa.
- `tecnico` puede crear fichajes, horas, incidencias y solicitudes de material de su empresa.
- `almacen` puede actualizar solicitudes de material, items y stock de su empresa.
- `viewer` solo consulta datos de su empresa.

El filtro fino por proyecto asignado debe implementarse en una segunda pasada cuando las tareas y asignaciones ya vivan normalizadas en PostgreSQL.

## Regla para integraciones

Softland, correo, almacenamiento de archivos y cualquier API externa deben ejecutarse desde backend, edge function o servidor propio. El frontend solo consume endpoints internos autorizados.

## Publicacion gradual recomendada

1. Mantener usuarios demo solo en desarrollo local.
2. Activar Supabase Auth antes de abrir acceso externo.
3. Usar `app_collections` como persistencia transitoria si se necesita publicar rapido.
4. Migrar por entidad a tablas normalizadas cuando los flujos esten validados.

## Interruptor de autenticacion

El frontend reconoce `VITE_AUTH_MODE`.

- `VITE_AUTH_MODE=demo`: mantiene usuarios locales de prueba para desarrollo.
- `VITE_AUTH_MODE=supabase`: no crea usuarios demo, no muestra credenciales demo en login y elimina passwords locales existentes durante bootstrap.

Antes de publicar, cambiar a:

```bash
VITE_AUTH_MODE=supabase
```

Luego ejecutar:

```bash
npm run prod:check
```
