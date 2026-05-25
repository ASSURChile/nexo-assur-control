# Matriz de integracion Assur EST -> Assur Control

Fecha de revision: 2026-05-03  
Fuente revisada: `/Users/macmoises/Downloads/Assur EST.zip`  
Destino recomendado: Assur Control como plataforma unica

## Decision recomendada

Assur EST debe integrarse como frente operativo dentro de Assur Control, no como sistema separado.

El ZIP de Assur EST contiene una maqueta/prototipo por roles con HTML, CSS, componentes JSX y datos mock. No es una aplicacion productiva completa con backend, build o persistencia real. En cambio, Assur Control ya tiene una base funcional que cubre gran parte del alcance operativo: proyectos, tareas, personal tecnico, materiales, horas, incidencias, vista movil, fotos, geocerca, cierre tecnico y acta.

La estrategia recomendada es usar Assur EST como blueprint funcional y de UX para fortalecer los modulos operativos existentes en Assur Control.

## Resumen ejecutivo

| Area | Estado en Assur Control | Recomendacion |
| --- | --- | --- |
| Sistema unico | Parcial | Mantener Assur Control como plataforma principal. |
| Tecnico movil | Existe | Fortalecer con UX y reglas de Assur EST. |
| Jefe de operaciones | Existe | Completar dashboard operativo y aprobaciones. |
| Supervisor | Parcial | Dar vista propia de validacion y observaciones. |
| Almacen | Parcial | Completar flujo de solicitudes, despacho y stock. |
| Cliente | Falta | Dejar fuera del MVP o como fase posterior. |
| Offline | Falta | Implementar cuando exista backend/base cloud. |
| Backend/cloud | Falta | Fase posterior al MVP funcional local. |

## Modulos revisados en Assur EST

Assur EST define estos frentes principales:

| Frente | Alcance funcional |
| --- | --- |
| Tecnico movil | Proyectos asignados, tareas, cronometro, GPS, fotos, incidencias, materiales, cierre con firma. |
| Jefe de operaciones | Dashboard, proyectos, tecnicos, aprobaciones, agenda, materiales, clientes, reportes. |
| Supervisor | Validacion de avances, revision de evidencias, observaciones y aprobacion por etapa. |
| Almacen | Stock, despachos, movimientos, compras, proveedores, alertas de stock minimo. |
| Cliente | Seguimiento de proyecto, bitacora, evidencias, documentos y contacto con supervisor. |
| Integracion Finance | Cierre tecnico, horas aprobadas, despachos y compras alimentan facturacion/costos. |

## Matriz funcional

| Requerimiento Assur EST | Estado en Assur Control | Accion recomendada |
| --- | --- | --- |
| Crear proyecto operativo desde jefe de operaciones | Existe | Mantener y ordenar modelo de proyecto. |
| Asignar tecnicos a proyecto/tareas | Existe | Mejorar disponibilidad, carga semanal y cuadrillas. |
| Tareas por proyecto | Existe | Agregar etapas estandar: visita, cableado, montaje, configuracion, pruebas, entrega. |
| Estado de tareas | Existe | Homologar estados: pendiente, en curso, pausada, completada, cancelada. |
| App movil para tecnico | Existe | Fortalecer navegacion, perfil, historial y modo instalable PWA. |
| Ver proyectos asignados | Existe | Validar filtro por usuario/rol y proyectos cerrados. |
| Iniciar/pausar/finalizar tarea | Existe parcialmente | Revisar cronometro, pausas y cierre automatico de fichaje. |
| GPS check-in | Existe | Exigir validacion segun geocerca cuando la instalacion tenga coordenadas. |
| GPS check-out | Parcial | Agregar como configurable por proyecto/cliente. |
| Foto de llegada | Parcial | Agregar requisito especifico al iniciar jornada/tarea. |
| Fotos de avance | Existe | Asociarlas a tarea/etapa, no solo a proyecto. |
| Evidencias por etapa | Parcial | Crear checklist de evidencias requeridas por tipo de proyecto. |
| Consumo de materiales por tecnico | Parcial | Distinguir solicitud, despacho, consumo real y devolucion. |
| Solicitud de materiales desde movil | Existe | Completar flujo de aprobacion/rechazo/entrega por almacen. |
| Stock de materiales | Existe | Agregar movimientos, historial y stock reservado por proyecto. |
| Ordenes de compra | Falta | Dejar para fase posterior o MVP avanzado. |
| Control de horas | Existe | Agregar aprobacion formal por supervisor/jefe. |
| Tipos de hora | Existe en parametros | Automatizar normal, extra, nocturna, festiva segun reglas. |
| Supervisor valida evidencia | Parcial | Crear vista de supervisor o bandeja de aprobaciones. |
| Observaciones del supervisor | Falta/parcial | Agregar comentarios, devoluciones y re-trabajo por tarea. |
| Cierre tecnico con firma | Existe | Fortalecer checklist obligatorio antes de firmar. |
| Acta PDF | Existe | Estandarizar formato con marca Assur Control. |
| Reapertura de proyecto | Existe | Mantener historial y motivo obligatorio. |
| Portal cliente | Falta | Posponer para despues del MVP. |
| Offline-first | Falta | Diseñar con IndexedDB + cola de sincronizacion cuando exista backend. |
| Notificaciones push | Falta | Posponer para etapa cloud/PWA. |
| Transferencia a finanzas | Parcial | Conectar cierre tecnico con hitos/facturacion/costos reales. |
| Integracion Softland | Parcial | Mantener por CSV en MVP; API via backend/serverless en publicacion. |

## Entidades a unificar

Assur EST propone entidades que deben mapearse a Assur Control de esta forma:

| Entidad Assur EST | Entidad/estructura Assur Control | Observacion |
| --- | --- | --- |
| Proyecto | `af_proyectos` | Ya existe; requiere normalizar campos operativos. |
| Tarea | `proyecto.tareas[]` | Ya existe embebida; en cloud conviene tabla `tareas`. |
| RegistroHoras | `af_horas` / `af_fichajes` | Hay dos conceptos; conviene unificar o definir responsabilidades. |
| Material/Despacho | `af_materiales` + `proyecto.materiales` + `solicitudesMaterial` | Falta modelo claro de movimiento/reserva/consumo. |
| Evidencia | `proyecto.fotos[]` / `cierreTecnico.firmaBase64` | En cloud debe ir a Storage con URLs. |
| CierreProyecto | `proyecto.cierreTecnico` | Ya existe; falta aprobacion formal de operaciones. |
| Usuario/Rol | `af_usuarios` | Ya existe local; debe migrar a auth real en cloud. |

## Brechas criticas antes del MVP operativo

1. Definir el flujo unico de proyecto:
   - Comercial/cotizacion
   - Proyecto operativo
   - Ejecucion tecnica
   - Cierre tecnico
   - Aprobacion operaciones
   - Facturacion/control financiero

2. Resolver modelo de horas:
   - `af_horas` parece representar registros manuales/administrativos.
   - `af_fichajes` parece representar fichaje movil en terreno.
   - Debemos decidir si se fusionan o si `fichajes` alimenta `horas aprobadas`.

3. Resolver modelo de materiales:
   - Catalogo
   - Stock disponible
   - Stock reservado
   - Despacho a tecnico
   - Consumo real
   - Devolucion
   - Costo real imputado al proyecto

4. Completar aprobaciones:
   - Aprobacion de horas
   - Aprobacion de evidencias
   - Aprobacion de cierre tecnico
   - Aprobacion de materiales/adicionales

5. Fortalecer trazabilidad:
   - Timeline por proyecto
   - Usuario responsable
   - Fecha/hora
   - Cambios de estado
   - Motivo en acciones sensibles

## Roadmap recomendado

### Fase A - Integracion funcional local

Objetivo: dejar Assur Control como sistema unico y coherente antes de cloud.

- Crear documento de flujo operativo oficial.
- Homologar estados de proyectos, tareas, horas, incidencias y materiales.
- Ajustar tareas para incluir etapa obligatoria.
- Separar solicitudes de material, despacho, consumo y devolucion.
- Agregar bandeja de aprobaciones para jefe/supervisor.
- Mejorar cierre tecnico con checklist configurable.
- Conectar cierre tecnico con hitos por facturar y costos reales.

### Fase B - Arquitectura de datos

Objetivo: preparar migracion a base cloud sin reescribir todo.

- Crear capa `dataService` para encapsular `localStorage`.
- Definir esquema SQL/Supabase.
- Mapear entidades actuales a tablas.
- Diseñar Storage para fotos, firmas y PDFs.
- Definir permisos por rol.

### Fase C - Publicacion de bajo costo

Objetivo: MVP online de bajo costo.

- Frontend: Vercel o Netlify.
- Base de datos/Auth: Supabase free/low-cost.
- Storage: Supabase Storage.
- Funciones: Supabase Edge Functions o Vercel Functions para Softland/API.
- Backups: export automatico o snapshots segun plan.

### Fase D - PWA tecnico

Objetivo: soporte campo.

- Instalable como PWA.
- IndexedDB para cache offline.
- Cola de sincronizacion.
- Upload diferido de fotos.
- Resolucion de conflictos basica.

## Recomendacion para el proximo bloque de trabajo

Antes de copiar componentes de Assur EST, conviene mejorar Assur Control desde adentro:

1. Crear una vista/bandeja de aprobaciones operativas.
2. Ordenar el modelo de materiales en proyecto.
3. Homologar estados y etapas de tareas.
4. Agregar checklist de cierre tecnico.
5. Documentar el flujo operativo oficial.

Esto evita duplicar pantallas y mantiene el producto como una sola plataforma.
