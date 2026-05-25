# Reporte QA Productiva - ASSUR Control

Fecha: 2026-05-24  
URL principal: `https://assur-control.pages.dev`  
Deploy directo validado: `https://4a665751.assur-control.pages.dev`  
Ambiente: Cloudflare Pages Production  
Base de datos/Auth/Storage: Supabase  
Resultado general: aprobado para piloto controlado con observaciones menores

## 1. Pre-check técnico

- URL principal responde `HTTP 200`.
- Deploy activo en Cloudflare Pages Production, branch `main`.
- Bundle productivo validado: `index-DsGG_uAn.js`.
- Headers básicos activos:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy`
- `npm run prod:check`: OK.
- `npm run stage:check`: OK.
- `npm run build`: OK.
- Provider productivo validado:
  - `VITE_DATA_PROVIDER=supabase_normalized`
  - `VITE_AUTH_MODE=supabase`
  - `VITE_BACKEND_SYNC_ENABLED=false`

## 2. Validación de reorganización operativa

La URL publicada muestra la nueva navegación:

- Comercial:
  - Dashboard comercial
  - Contactos / Prospectos
  - Pipeline
  - Solicitudes de cotización
  - Cotización rápida
- Cotizaciones y Propuestas:
  - Bandeja de solicitudes
  - Cotizaciones
  - Paquetes comerciales
  - Propuestas
- Operaciones:
  - Proyectos
  - Aprobaciones
  - Recursos
  - Materiales
  - Stock / almacén
  - Supervisor
  - Incidencias
- Monitoreo:
  - Servicios recurrentes
- Finanzas:
  - Costos y gastos
  - Control financiero
  - Análisis
- Sistema:
  - Configuración
  - Usuarios, disponible desde cabecera admin

No se detectaron pantallas blancas ni errores de consola en la pasada admin.

## 3. Validación de módulos admin

Módulos abiertos correctamente:

- Dashboard comercial
- Pipeline
- Solicitudes de cotización
- Cotización rápida
- Bandeja de solicitudes
- Paquetes comerciales
- Propuestas
- Proyectos
- Materiales
- Stock / almacén
- Servicios recurrentes
- Costos y gastos
- Control financiero
- Análisis
- Configuración

Resultado: OK.

## 4. Validación de permisos base

Checks automáticos sobre la matriz base:

- Comercial puede crear cotización rápida por paquete.
- Comercial no puede gestionar costos internos por defecto.
- Operaciones puede gestionar costos en cotizaciones.
- Administrativo de operaciones puede gestionar materiales.
- Finanzas mantiene acceso financiero.
- Técnico queda fuera de módulos administrativos y conserva flujo de terreno.

Resultado: OK.

## 5. Flujo QA especial cargado en Supabase

Se cargó un flujo QA completo:

- Cliente: `QA Agroindustrial Los Robles SpA`
- Instalación: `Planta Curicó`
- Oportunidad: `Integración CCTV y monitoreo planta Curicó`
- Propuesta: `PROP-QA-001`
- Proyecto: `PRY-QA-001`
- Servicio recurrente: `SRV-QA-001`
- Facturas: `QA-F001`, `QA-F002`
- Pago: anticipo QA
- CxP: materiales y subcontrato QA
- Expectativas de facturación recurrente: 3 meses

Resultado:

- Dashboard refleja venta, proyecto, MRR y último movimiento.
- Servicios recurrentes muestra `SRV-QA-001`.
- Finanzas muestra CxC, CxP, flujo y control financiero sin pantalla blanca.
- Datos persisten tras recarga.

## 6. Flujo QA paquetizado

Se creó un paquete ficticio en el MVP simple:

- Paquete: `QA CLOUD Alarma Home Base`
- Línea: `ASSUR Home`
- Categoría: `Alarma`
- Estado: `Activo`
- MRR: `0,8 UF`

Se validó:

- El módulo `Paquetes comerciales` permite crear paquete.
- `Cotización rápida` permite seleccionar cliente y paquete activo.
- La cotización rápida genera propuesta y oportunidad vinculadas.
- La propuesta paquetizada persiste en Supabase.
- La oportunidad paquetizada persiste en Supabase.
- El MRR paquetizado se guarda correctamente en Supabase.

Datos QA persistidos:

- Propuestas paquetizadas: 3 registros QA.
- Oportunidades paquetizadas: 3 registros QA.
- MRR esperado por registro: `$31.920`.

Observación: hay 3 registros paquetizados porque se repitió la prueba durante la corrección de sincronización. Son datos QA identificables y limpiables.

## 7. Correcciones aplicadas durante QA

- Se corrigió el flujo de cotización rápida para que genere oportunidad asociada a la propuesta.
- Se corrigió la sincronización Supabase para guardar oportunidad y propuesta juntas, evitando fallas por llave foránea.
- Se corrigió el transformador Supabase para que `baseRecMes` alimente `monthly_recurring_value`.
- Se actualizó el MRR de los registros QA paquetizados existentes.

## 8. Hallazgos

### Bloqueantes

No quedan bloqueantes detectados para piloto controlado.

### No bloqueantes

- Los paquetes comerciales ya tienen tablas normalizadas cloud; falta probarlos con usuarios reales durante el piloto.
- La limpieza de registros QA ya está automatizada con `npm run qa:cleanup-cloud`.

### UX / afinamiento posterior

- La interfaz sigue cargada visualmente en algunas vistas.
- La vista técnico debe rediseñarse antes de uso masivo en terreno.
- La vista de paquetes requiere formulario más guiado para usuarios no técnicos.

## 9. Decisión

ASSUR Control queda habilitado para piloto operativo controlado en la nube con la reorganización operativa publicada.

Condiciones:

- Usar datos reales limitados al inicio.
- Mantener prefijo `QA CLOUD` para futuras pruebas y limpiar con `npm run qa:cleanup-cloud`.
- No conectar Softland API todavía.
- Normalizar paquetes comerciales en Supabase antes de escalar ventas paquetizadas multiusuario.
- Pasar a rediseño UX/responsive después de validar esta base operacional.

## 10. Avance posterior: paquetes comerciales cloud

Se implementó la normalización de paquetes comerciales y cotizaciones rápidas para Supabase:

- Nuevas tablas esperadas:
  - `commercial_packages`
  - `commercial_package_items`
  - `commercial_package_services`
  - `quick_quotes`
- El frontend ahora sincroniza paquetes, líneas de materiales/servicios y cotizaciones rápidas cuando las tablas existen.
- La hidratación Supabase tolera tablas opcionales aún no montadas para evitar pantalla blanca durante transición.
- Se agregó el SQL incremental en `supabase/mount/11_commercial_packages_cloud.sql`.
- Se publicó el build productivo en Cloudflare:
  - URL principal: `https://assur-control.pages.dev`
  - Deploy directo: `https://4a665751.assur-control.pages.dev`
  - Bundle: `index-DsGG_uAn.js`

Checks ejecutados:

- `npm run audit:data`: OK.
- `npm run supabase:schema:check`: OK.
- `npm run supabase:mount:check`: OK.
- `npm run supabase:remote-schema:check`: detecta pendiente el montaje remoto de paquetes.
- `npm run prod:check`: OK.
- `npm run stage:check`: OK.
- `npm run build`: OK.

Validación final:

- Montaje Supabase aplicado correctamente: `commercial_packages`, `commercial_package_items`, `commercial_package_services`, `quick_quotes`.
- `npm run supabase:remote-schema:check`: OK. Las tablas existen en producción. Los `401` con `anon key` son esperables por RLS/grants.
- `npm run qa:packages-cloud`: OK. Se validó escritura autenticada de paquete, ítem, servicio incluido, oportunidad, propuesta y cotización rápida.
- QA navegador publicada: OK. Se recorrieron módulos admin principales sin pantalla blanca ni errores de consola.
- QA roles publicada: OK. Admin, operaciones, supervisor, técnico, almacén y viewer inician sesión sin pantalla blanca.
- `npm run qa:cleanup-cloud`: OK. Se limpiaron registros `QA CLOUD`, `qa-cloud-package-*` y `qa-flujo-*`.
- Remanente QA cloud tras limpieza:
  - `commercial_packages`: 0
  - `commercial_package_items`: 0
  - `commercial_package_services`: 0
  - `quick_quotes`: 0
  - `opportunities`: 0
  - `proposals`: 0
- Checks finales:
  - `npm run prod:check`: OK.
  - `npm run stage:check`: OK.
  - `npm run supabase:remote-schema:check`: OK.
