# Cierre Pre-Produccion ASSUR Control

Fecha: 2026-05-24

## Estado

ASSUR Control queda en estado pre-produccion para piloto controlado. La version actual compila, valida el modelo Supabase, sincroniza las entidades criticas y soporta cotizaciones exportables con documento editable.

Deploy Cloudflare Pages:

- URL estable: `https://assur-control.pages.dev`
- Deploy validado: `https://247ed460.assur-control.pages.dev`
- Ambiente: Production / branch `main`

## Alcance Validado

- Autenticacion Supabase configurada.
- Proveedor productivo esperado: `supabase_normalized`.
- Frontend listo para Cloudflare Pages.
- Roles y permisos operativos activos.
- Navegacion reorganizada por proceso: Comercial, Cotizaciones y Propuestas, Operaciones, Monitoreo, Finanzas y Sistema.
- Cotizaciones con documento cliente editable.
- Plantillas de documento por linea: automatica, CCTV, alarmas, cerco electrico, monitoreo y mantencion.
- Exportacion PDF desde el documento de cotizacion.
- Persistencia cloud de cotizaciones mediante tabla `quotes`; el documento editable queda guardado en `metadata`.
- Flujo QA cloud integral probado y limpiado.

## Validaciones Ejecutadas

- `npm run build`
- `npm run prod:check`
- `npm run stage:check`
- `npm run supabase:schema:check`
- `npm run supabase:remote-schema:check`
- `npm run supabase:check`
- `npm run audit:data`
- `npm run qa:e2e-cloud`
- `npm run qa:cleanup-cloud`
- `npx wrangler pages deploy dist --project-name assur-control --branch main`

## Resultado QA Cloud

El flujo QA cargo correctamente:

- cliente;
- instalacion;
- oportunidad;
- propuesta;
- cotizacion con documento editable;
- proyecto;
- tareas;
- servicio recurrente;
- facturas;
- pagos;
- cuentas por pagar;
- expectativas de facturacion.

Luego se eliminaron los registros QA y quedaron en cero los residuos controlados.

## Pendientes Antes De Uso Interno

1. Validar login en la URL productiva.
2. Confirmar que Cloudflare Pages muestra la ultima version en `https://assur-control.pages.dev`.
3. Probar desde navegador externo y celular:
   - admin;
   - operaciones;
   - comercial;
   - tecnico;
   - finanzas;
   - almacen.
4. Crear una cotizacion real o ficticia desde la URL publicada y confirmar:
   - guardado;
   - documento cliente;
   - plantilla correcta;
   - exportacion PDF;
   - persistencia tras logout/reload.
5. Definir si se habilita uso piloto con datos reales limitados.

## Criterio Para Pasar A Produccion Piloto

El piloto puede comenzar cuando el flujo de cotizacion/documento PDF persista correctamente en Supabase desde la URL publicada y los usuarios reales validen acceso por rol.
