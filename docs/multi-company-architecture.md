# Arquitectura Multiempresa ASSUR

## Respaldo Del Estado Actual

Antes de iniciar esta transicion se genero un respaldo recuperable:

- Rama Git: `codex/backup-pre-multiempresa-20260525-165208`
- Archivo comprimido: `/Users/macmoises/Documents/Codex/backups/assur-control-pre-multiempresa-20260525-165208.tar.gz`
- Commit base respaldado: `31aaa9cfeb7021464f5d2bdd1d5f1c93c430195b`

Este respaldo representa el MVP previo al ajuste multiempresa.

## Decision Principal

ASSUR Control seguira siendo una sola plataforma de gestion. No se crearan dos
sistemas separados para Alerta MD y Servicios Electronicos.

La separacion correcta sera:

```txt
Tenant de seguridad / workspace:
ASSUR Control

Grupo o marca gerencial:
ASSUR Chile

Empresas legales actuales:
- Alerta MD Ltda.
- Servicios Electronicos Ltda.

Lineas de negocio:
- Monitoreo
- Servicios tecnicos / proyectos
- Administracion
- Finanzas
- Comercial
```

En Supabase, `company_id` sigue representando el workspace/empresa usuaria del
sistema para seguridad y RLS. No debe usarse para separar Alerta MD y Servicios
Electronicos dentro del mismo grupo.

Para separar la gestion legal y operativa se usara contexto operativo por
registro:

- `grupoGestion`: `assur_chile`
- `empresaOrigen`: `alerta_md` o `servicios_electronicos`
- `empresaOrigenNombre`
- `empresaOrigenRut`
- `lineaNegocio`: `monitoreo`, `tecnica`, `administracion`, `finanzas`, `comercial`
- `sourceSystem`: `manual`, `softland`, `powerbi`
- `externalId`

## Como Se Vera En El Sistema

Las vistas deben permitir filtros simples:

- Ver todo ASSUR Chile.
- Ver solo Alerta MD.
- Ver solo Servicios Electronicos.
- Ver solo Monitoreo.
- Ver solo Servicios tecnicos / proyectos.

Los dashboards gerenciales podran consolidar todo, pero finanzas siempre podra
auditar el origen legal del dato.

## Regla De Migracion Futura

Cuando ambas operaciones migren legalmente a ASSUR, no se debe perder historia.
Los nuevos registros podran quedar bajo `empresaOrigen = assur_chile`, pero los
registros historicos conservaran:

- empresa legal original;
- RUT original;
- linea de negocio;
- origen Softland;
- folio/documento externo.

## Impacto En Datos Existentes

La primera capa ya esta implementada en codigo con:

- `src/domain/companyContext.js`
- enriquecimiento del importador CSV Softland en `src/services/softlandImportService.js`

Esto no rompe los datos actuales. Agrega contexto operativo a nuevas cargas,
especialmente cuando el dato venga desde Softland.

## Entidades Que Deben Respetar Contexto Operativo

Minimo:

- clientes;
- instalaciones;
- oportunidades;
- cotizaciones;
- propuestas;
- proyectos;
- facturas;
- pagos;
- cuentas por pagar;
- servicios recurrentes;
- materiales;
- movimientos de materiales;
- resultado operacional mensual.

## Ruta Recomendada

1. Mantener el MVP actual respaldado.
2. Preparar conexion Softland por API contra ambas empresas.
3. Crear un backend/Edge Function que consulte Softland con credenciales server-side.
4. Normalizar cada registro con `empresaOrigen` y `lineaNegocio`.
5. Guardar en Supabase como capa gerencial.
6. Construir filtros y KPIs consolidados por ASSUR, empresa y linea de negocio.

## No Hacer

- No crear dos aplicaciones separadas.
- No guardar claves Softland en frontend.
- No usar `company_id` como empresa legal origen.
- No mezclar facturas de ambas empresas sin `empresaOrigen`.
- No perder el RUT legal original en la migracion futura.
