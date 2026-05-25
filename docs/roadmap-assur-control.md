# Roadmap maestro Assur Control

Fecha: 2026-05-04  
Estado: plan de seguimiento para MVP, afinamiento y publicacion  
Fuente considerada: auditoria Claude sobre ASSUR Finance, auditoria Codex de Assur Control, matriz Assur EST -> Assur Control.

## Principio rector

Assur Control sera una sola plataforma para el ciclo completo:

1. Comercial: oportunidades, cotizaciones, propuestas.
2. Operacion: proyectos, tareas, tecnicos, materiales, horas, evidencias, cierre tecnico.
3. Finanzas: hitos, facturas, pagos, cobranza, CxP, rentabilidad.
4. Integraciones: Softland por CSV en MVP; API mediante backend/serverless en publicacion.
5. Publicacion: bajo costo, idealmente Vercel/Netlify + Supabase.

No se recomienda separar Assur EST como producto independiente. Su alcance operativo debe incorporarse como modulos y vistas dentro de Assur Control.

## Estados de seguimiento

| Estado | Significado |
| --- | --- |
| Pendiente | No iniciado. |
| En curso | Ya se esta implementando. |
| Bloqueado | Requiere decision, credenciales, datos o infraestructura. |
| Validacion | Implementado, pendiente de prueba funcional. |
| Completo | Implementado, probado y aceptado. |

## Hitos principales

| Hito | Objetivo | Resultado esperado |
| --- | --- | --- |
| H0 - Base recuperada | Traer la version correcta del sistema y documentar alcance | Assur Control corre localmente con la ultima version y roadmap definido. |
| H1 - MVP funcional local | Cerrar flujo comercial-operativo-financiero usando localStorage | El sistema sirve para operar y validar procesos internos sin nube. |
| H2 - Afinamiento UX y roles | Ajustar experiencia por rol, front y controles operativos | Cada usuario entra a una interfaz util para su trabajo diario. |
| H3 - Datos y backend | Preparar persistencia cloud y multiusuario real | Base de datos, auth, permisos y API/lista de migracion. |
| H4 - Publicacion controlada | Publicar version online de bajo costo | Sistema accesible en web con datos persistentes y backups. |
| H5 - Integraciones avanzadas | Softland API, alertas, PWA offline y automatizaciones | Sistema robusto para operacion diaria y terreno. |

## Etapa 0 - Fundacion y control del proyecto

Prioridad: critica  
Estado actual: en curso  
Objetivo: dejar el proyecto listo para desarrollo controlado.

### Alcance

- Confirmar version correcta del codigo.
- Mantener copia independiente del proyecto original usado con Claude.
- Documentar integracion Assur EST.
- Crear roadmap maestro.
- Inicializar seguimiento en Git.
- Crear convencion de trabajo por etapas.

### Criterio de terminado

- El proyecto corre localmente.
- `npm run build` compila.
- Existe documentacion de roadmap.
- Existe matriz Assur EST -> Assur Control.
- No se toca el proyecto original de Claude.

## Etapa 1 - Cierre del ciclo financiero MVP

Prioridad: critica  
Dependencias: version actual de Assur Control, importador Softland CSV.  
Objetivo: que gerencia vea rentabilidad, cobranza y caja con datos reales o importados.

### Sub-etapas

| ID | Tarea | Estado sugerido | Criterio de terminado |
| --- | --- | --- | --- |
| 1.1 | Vincular factura con hito/proyecto | Validacion | Desde proyecto se puede asociar factura a hito y ver estado. |
| 1.2 | Caja proyectada 30/60/90 dias | Validacion | Vista muestra vencimientos, cobros esperados y pagos esperados. |
| 1.3 | Capital de trabajo y liquidez | Validacion | KPI calcula CxC pendiente - CxP pendiente y liquidez 90 dias con caja proyectada. |
| 1.4 | Cuentas por pagar CxP | Validacion | Vista espejo muestra CxP, vencidos, proximos 30 dias e impacto en caja. |
| 1.5 | Pipeline ponderado en dashboard | Validacion | Dashboard incluye valor ponderado por probabilidad y MRR ponderado. |
| 1.6 | Rentabilidad cobrada por proyecto | Validacion | Proyecto muestra facturado, cobrado, pendiente, costo real y margen sobre caja cobrada. |

### Notas Softland

Para MVP se mantiene importacion CSV/Excel. La API Softland queda preparada, pero las credenciales no deben vivir en frontend cuando pasemos a produccion.

## Etapa 2 - Operacion tecnica integrada

Prioridad: critica-alta  
Dependencias: matriz Assur EST.  
Objetivo: consolidar el frente operativo dentro de Assur Control.

### Sub-etapas

| ID | Tarea | Estado sugerido | Criterio de terminado |
| --- | --- | --- | --- |
| 2.1 | Homologar etapas operativas de tareas | En curso | Tareas tienen etapa y se muestran en desktop/movil/reportes. |
| 2.2 | Bandeja de aprobaciones operativas | Validacion | Jefe/supervisor ve horas, incidencias, materiales y cierres pendientes en una bandeja central. |
| 2.3 | Checklist de cierre tecnico | Validacion | Cierre movil exige checklist antes de firma y queda visible en reporte/bandeja. |
| 2.4 | Aprobacion de cierre tecnico | Validacion | Cierre tecnico se aprueba desde bandeja operativa y queda trazado en aprobaciones/timeline. |
| 2.5 | Modelo de materiales operativo | Validacion | Solicitud pasa por aprobacion/entrega/rechazo e imputa costo real al entregar si hay precio de catalogo. |
| 2.6 | Vista supervisor | Validacion | Supervisor ve avance por proyecto, equipo activo, incidencias, fotos y cierres listos. |
| 2.7 | Vista almacen | Validacion | Almacen gestiona solicitudes, entregas, imputacion de costos y stock bajo. |

### Criterio de terminado

- El tecnico puede operar desde la web movil.
- El jefe de operaciones puede controlar avance real.
- Las evidencias y horas quedan trazables.
- El cierre tecnico alimenta control financiero.

## Etapa 3 - Dashboards por rol

Prioridad: alta  
Objetivo: que cada rol vea decisiones accionables, no solo informacion general.

### Sub-etapas

| ID | Dashboard | Contenido minimo |
| --- | --- | --- |
| 3.1 | Gerencial | Validacion | Dashboard general incluye pipeline ponderado, caja, rentabilidad, morosidad y margen real. |
| 3.2 | Comercial | Validacion | Dashboard comercial muestra oportunidades, propuestas por estado, tasa de cierre, MRR y acciones pendientes. |
| 3.3 | Operaciones | Validacion | Operaciones entra a aprobaciones y tiene proyectos, tecnicos, incidencias y cierres pendientes. |
| 3.4 | Finanzas | Validacion | Control financiero incluye CxC, CxP, aging, pagos, caja proyectada e importaciones Softland. |
| 3.5 | Tecnico | Validacion | App tecnica muestra mis proyectos, tareas, fichaje, incidencias, solicitudes y cierre. |
| 3.6 | Almacen | Validacion | Almacen entra a vista dedicada con solicitudes, stock bajo y entregas pendientes. |

### Criterio de terminado

- Al iniciar sesion, cada rol entra a su vista util.
- Los KPIs tienen fuente de datos clara.
- No hay duplicidad de dashboards innecesaria.

## Etapa 4 - KPIs cruzados Assur + Softland

Prioridad: alta  
Objetivo: responder preguntas gerenciales que Softland por si solo no resuelve.

### KPIs objetivo

| KPI | Fuente | Estado |
| --- | --- | --- |
| Rentabilidad real por cliente | Proyectos + costos + facturas + pagos. | Validacion |
| Rentabilidad por ejecutivo | Propuestas vendidas + margen real cobrado. | Validacion |
| Rentabilidad por tipo de proyecto | Tipo proyecto + costos reales + cobranza. | Validacion |
| Margen estimado vs real | Cotizacion/propuesta vs ejecucion. | Validacion |
| Costo financiero por plazo de pago | Dias de cobranza + monto + costo capital estimado. | Validacion |
| Desviacion costo/hora/material | Plan operativo vs ejecucion real. | Validacion |

### Criterio de terminado

- Los KPIs son calculables con datos actuales.
- Cada KPI indica si usa dato manual, Softland o mixto.
- Existen filtros por periodo, cliente, ejecutivo y tipo proyecto.

## Etapa 5 - Backend minimo y base de datos cloud

Prioridad: critica para produccion  
Objetivo: sacar Assur Control de `localStorage` y dejarlo multiusuario, seguro y persistente.

### Opcion recomendada

Supabase como primera opcion de bajo costo:

- PostgreSQL administrado.
- Auth.
- Row Level Security.
- Storage para fotos, firmas y PDFs.
- Edge Functions para integraciones sensibles.
- Plan gratis o bajo costo al inicio.

### Alternativa

Backend propio Node/Express + Prisma + PostgreSQL:

- Mayor control.
- Mas trabajo y mas mantencion.
- Conveniente si Softland exige logica compleja o integracion dedicada.

### Sub-etapas

| ID | Tarea | Criterio de terminado |
| --- | --- | --- |
| 5.1 | Disenar modelo de datos | Validacion - Modelo inicial documentado en `docs/data-model-cloud.md` y `supabase/schema.sql`; incluye puente `app_collections` y tablas finales. |
| 5.2 | Crear capa `dataService` | Completo - `dataService`, `repositories` y `authService` concentran almacenamiento, sesión e IDs; no quedan accesos directos `LS.get/set` en vistas. |
| 5.3 | Auth real | Pendiente - Plan de Supabase Auth documentado en `docs/security-auth-plan.md`; usuarios demo siguen solo para desarrollo local. |
| 5.4 | Migrar entidades core | Clientes, instalaciones, proyectos, usuarios, propuestas. |
| 5.5 | Migrar entidades operativas | Tareas, fichajes, materiales, incidencias, evidencias. |
| 5.6 | Migrar finanzas | Facturas, pagos, CxP, hitos, importaciones Softland. |
| 5.7 | Storage | Fotos, firmas y PDFs se guardan como archivos, no base64 local. |
| 5.8 | Backups | Politica de respaldo definida y probada. |
| 5.9 | Smoke checks | Validacion automatica minima de dominio, backup y recurrentes con `npm run smoke`. |

### Criterio de terminado

- Dos usuarios pueden entrar desde dispositivos distintos y ver los mismos datos.
- Roles/permisos funcionan.
- Datos persisten aunque se limpie cache.
- No hay secretos ni tokens en frontend.

## Etapa 6 - Integracion Softland

Prioridad: critica-alta  
Objetivo: integrar Softland sin reemplazarlo.

### Fase 6A - MVP por CSV/Excel

| Tarea | Criterio |
| --- | --- |
| Mantener importador de clientes | Importa, identifica origen y evita duplicados. |
| Mantener importador de materiales | Actualiza catalogo y stock. |
| Mantener importador de facturas | Alimenta CxC y proyectos. |
| Mantener importador de pagos | Concilia facturas y aging. |
| Agregar CxP por importacion | Proveedores y vencimientos alimentan caja. |

### Fase 6B - API segura

| Tarea | Criterio |
| --- | --- |
| Definir credenciales/alcance Softland | Saber si existe API, DB directa, export programado o middleware. |
| Crear funcion serverless/backend | Token Softland queda fuera del navegador. |
| Sincronizacion read-only inicial | Leer clientes, facturas, pagos, CxP. |
| Logs de sincronizacion | Fecha, resultado, errores, registros procesados. |
| Mapeo contable | Cuentas Softland -> categorias Assur Control. |

### Regla de seguridad

Ningun token, password o secreto de Softland debe guardarse en React/localStorage.

## Etapa 7 - Aprobaciones, auditoria y control

Prioridad: media-alta  
Objetivo: evitar que cualquier usuario apruebe cualquier decision sensible.

### Sub-etapas

| ID | Tarea | Criterio |
| --- | --- | --- |
| 7.1 | Matriz de aprobacion de propuestas | Montos y descuentos tienen umbrales por rol. |
| 7.2 | Matriz de subsidios/descuentos | Se controla margen minimo y excepciones. |
| 7.3 | Aprobacion de horas/materiales/cierre | Flujo operativo queda trazable. |
| 7.4 | Audit log | Se registra quien, cuando, que cambio y motivo. |
| 7.5 | Notificacion al aprobador | En pantalla en MVP; email cuando exista backend. |

## Etapa 8 - Imputacion automatica de costos

Prioridad: media-alta  
Objetivo: reducir trabajo manual y obtener margen real confiable.

### Fuentes de costo

| Fuente | Formula/accion |
| --- | --- |
| Horas aprobadas | horas x costo hora por rol. |
| Materiales entregados/consumidos | cantidad x costo unitario. |
| Gastos Softland | factura proveedor vinculada a proyecto/centro de costo. |
| Viaticos/traslados | reglas de parametros operativos. |
| Adicionales | incidencias/change orders aprobados. |

### Criterio de terminado

- El margen real se recalcula automaticamente.
- El usuario puede ver detalle de cada costo imputado.
- Se distingue costo estimado, costo real y desviacion.

## Etapa 9 - Alertas y notificaciones

Prioridad: media  
Objetivo: pasar de sistema pasivo a sistema proactivo.

### Alertas MVP

| Alerta | Condicion |
| --- | --- |
| Factura proxima a vencer | vencimiento <= 7 dias y saldo > 0. |
| Cliente moroso | deuda > 60 dias. |
| Proyecto desviado | costo real o horas supera umbral. |
| Caja critica | caja proyectada negativa o bajo umbral. |
| Cierre pendiente | tareas completas sin cierre/aprobacion. |
| UF desactualizada | ultima actualizacion > 3 dias. |
| Stock bajo | stock <= minimo. |

### Criterio de terminado

- Alertas visibles en dashboard.
- Se pueden marcar como revisadas o resueltas.
- Email/push queda para etapa posterior al backend.

## Etapa 10 - Frontend, diseno y usabilidad

Prioridad: transversal  
Objetivo: que el sistema se sienta profesional, rapido y facil de operar.

### Lineas de trabajo

| Area | Ajuste |
| --- | --- |
| Arquitectura UI | Separar `App.jsx` en vistas, componentes, servicios y constantes. |
| Navegacion | Simplificar menus por rol. |
| Formularios | Validaciones, mensajes de error y campos obligatorios claros. |
| Tablas | Filtros, busqueda, orden, estados vacios y acciones consistentes. |
| Movil tecnico | Botones grandes, flujo corto, menos texto, estado offline futuro. |
| Marca | Consistencia visual con Assur Control. |
| Performance | Code splitting y carga por modulo. |
| Accesibilidad | Contraste, tamanos, foco, etiquetas. |

### Criterio de terminado

- El usuario puede completar los flujos criticos sin explicacion externa.
- La app no se siente como prototipo.
- El bundle se reduce al separar modulos.

## Etapa 11 - Publicacion de bajo costo

Prioridad: alta despues de MVP local  
Objetivo: publicar sin inflar costos.

### Arquitectura recomendada inicial

| Capa | Opcion recomendada |
| --- | --- |
| Frontend | Vercel o Netlify. |
| Base de datos | Supabase PostgreSQL. |
| Auth | Supabase Auth. |
| Storage | Supabase Storage. |
| Funciones | Supabase Edge Functions o Vercel Functions. |
| Dominio | Dominio propio cuando el MVP este validado. |
| Backups | Export y snapshots segun plan. |

### Criterio de terminado

- URL publica protegida por login.
- Datos compartidos entre usuarios.
- Backups definidos.
- Softland usa importacion o funcion segura, no secretos en frontend.

## Etapa 12 - PWA y offline real

Prioridad: media-baja para MVP, alta para terreno maduro  
Objetivo: que tecnicos operen con mala senal.

### Sub-etapas

| ID | Tarea | Criterio |
| --- | --- | --- |
| 12.1 | Manifest PWA | Instalable en celular. |
| 12.2 | Service Worker | UI cacheada. |
| 12.3 | IndexedDB | Datos asignados al tecnico disponibles offline. |
| 12.4 | Cola de sincronizacion | Acciones pendientes suben al reconectar. |
| 12.5 | Upload diferido | Fotos/firma se suben cuando hay conexion. |
| 12.6 | Conflictos | Reglas basicas para resolver cambios simultaneos. |

## Etapa 13 - IA y prediccion

Prioridad: futuro  
Objetivo: analitica predictiva cuando exista data historica suficiente.

### Ideas futuras

- Score de oportunidades.
- Prediccion de margen real.
- Proyectos en riesgo.
- Sugerencias de pricing.
- Deteccion de desviaciones tempranas.

No debe priorizarse antes de tener datos confiables de 6 a 12 meses.

## Orden recomendado de ejecucion

### Bloque 1 - MVP local coherente

1. Etapa 1 - Cierre del ciclo financiero.
2. Etapa 2 - Operacion tecnica integrada.
3. Etapa 3 - Dashboards por rol.
4. Etapa 4 - KPIs cruzados.

### Bloque 2 - Preparacion productiva

5. Etapa 5 - Backend/base cloud.
6. Etapa 6 - Softland seguro.
7. Etapa 10 - Frontend/diseno/refactor.
8. Etapa 11 - Publicacion bajo costo.

### Bloque 3 - Robustez operativa

9. Etapa 7 - Aprobaciones/auditoria.
10. Etapa 8 - Imputacion automatica.
11. Etapa 9 - Alertas.
12. Etapa 12 - PWA/offline.

### Bloque 4 - Futuro

13. Etapa 13 - IA/prediccion.

## Siguiente sprint recomendado

Sprint 1: Cierre financiero + operacion minima conectada.

### Objetivo

Que un proyecto cerrado tecnicamente pueda conectarse con facturacion, cobranza, costos y KPIs gerenciales.

### Tareas

1. Vincular facturas con hitos/proyectos desde la UI del proyecto.
2. Agregar caja proyectada 30/60/90.
3. Agregar CxP basico.
4. Agregar pipeline ponderado al dashboard.
5. Crear bandeja inicial de aprobaciones operativas.

### Resultado esperado

Al terminar el sprint, Assur Control debe mostrar una vision real de:

- Que se vendio.
- Que se esta ejecutando.
- Que se cerro tecnicamente.
- Que se facturo.
- Que se cobro.
- Que falta pagar/cobrar.
- Cual es la rentabilidad real o esperada.

## Decisiones pendientes

| Tema | Decision requerida |
| --- | --- |
| Backend | Supabase primero o Node/Express propio. Recomendacion: Supabase. |
| Softland | Confirmar si habra API, DB directa, export CSV o middleware. |
| Usuarios reales | Definir roles finales y permisos por modulo. |
| Publicacion | Elegir Vercel/Netlify y dominio. |
| Datos iniciales | Decidir si se migran backups JSON actuales o se parte limpio. |
| Seguridad | Definir nivel de auditoria y aprobaciones antes de publicar. |
