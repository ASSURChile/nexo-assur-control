# Opciones De Conexion Softland

ASSUR Control queda preparado para dos caminos, ambos server-side. Ninguna clave
Softland debe vivir en React, `localStorage` ni variables `VITE_*`.

```txt
Frontend Cloudflare Pages
        |
        v
Backend seguro / Edge Function / VPS
        |
        +--> Opcion A: API Softland
        |
        +--> Opcion B: Base de datos / vistas SQL read-only
        |
        v
Supabase ASSUR Control
```

## Opcion A: API Softland

Es la ruta preferida si soporte la tiene disponible.

Ventajas:

- Menor exposicion de base de datos.
- Compatible con Supabase Edge Functions, Cloudflare Workers o backend propio.
- Mas facil de auditar por endpoint.
- Menos dependencia de motor SQL interno.

Informacion requerida:

- `SOFTLAND_MODE=api`
- `SOFTLAND_API_BASE_URL`
- `SOFTLAND_API_AUTH_TYPE`: `bearer`, `apikey` o `basic`
- `SOFTLAND_API_TOKEN` o `SOFTLAND_API_KEY`
- `SOFTLAND_API_USERNAME` y `SOFTLAND_API_PASSWORD`, si usa Basic
- `SOFTLAND_COMPANY_ALERTA_CODE`
- `SOFTLAND_COMPANY_ALERTA_RUT`
- `SOFTLAND_COMPANY_SERVICIOS_CODE`
- `SOFTLAND_COMPANY_SERVICIOS_RUT`
- endpoints o rutas para:
  - clientes;
  - facturas;
  - pagos;
  - cuentas por cobrar;
  - cuentas por pagar;
  - centros de costo;
  - plan de cuentas;
  - resultado operacional mensual;
  - materiales/stock, si existe.

Variables opcionales por endpoint:

```bash
SOFTLAND_API_ENDPOINT_CLIENTES=/clientes
SOFTLAND_API_ENDPOINT_FACTURAS=/facturas
SOFTLAND_API_ENDPOINT_PAGOS=/pagos
SOFTLAND_API_ENDPOINT_CXC=/cuentas-cobrar
SOFTLAND_API_ENDPOINT_CXP=/cuentas-pagar
SOFTLAND_API_ENDPOINT_CENTROS_COSTO=/centros-costo
SOFTLAND_API_ENDPOINT_RESULTADO=/resultado-operacional
```

## Opcion B: Base De Datos / SQL Controlado

Es valida si Softland no entrega API o si Control de Gestion ya trabaja con
vistas SQL. Debe ser solo lectura.

Ventajas:

- Acceso flexible a vistas existentes.
- Permite leer el mismo origen que alimenta Power BI.
- Puede servir para cargas historicas masivas.

Riesgos:

- Normalmente requiere VPN, IP fija o red privada.
- Requiere driver especifico del motor: SQL Server, ODBC, MySQL, PostgreSQL u
  otro.
- No debe exponerse a Cloudflare Pages ni al navegador.

Informacion requerida:

- `SOFTLAND_MODE=database`
- `SOFTLAND_DB_TYPE`: `mssql`, `odbc`, `mysql`, `postgres`
- `SOFTLAND_DB_HOST`
- `SOFTLAND_DB_PORT`
- `SOFTLAND_DB_NAME`
- `SOFTLAND_DB_USER`
- `SOFTLAND_DB_PASSWORD`
- `SOFTLAND_DB_SSL`
- `SOFTLAND_DB_READONLY=true`
- nombre de vistas o stored procedures autorizadas:
  - `SOFTLAND_DB_VIEW_CLIENTES`
  - `SOFTLAND_DB_VIEW_FACTURAS`
  - `SOFTLAND_DB_VIEW_PAGOS`
  - `SOFTLAND_DB_VIEW_CXC`
  - `SOFTLAND_DB_VIEW_CXP`
  - `SOFTLAND_DB_VIEW_CENTROS_COSTO`
  - `SOFTLAND_DB_VIEW_RESULTADO`

## Backend Preparado

Se agregaron endpoints backend para validar configuracion sin tocar datos:

```bash
GET  /api/softland/status
POST /api/softland/probe
POST /api/softland/normalize
```

El `probe` corre por defecto en `dryRun`, por lo que arma la consulta o URL sin
consultar Softland.

El endpoint `normalize` recibe una respuesta JSON tipo Softland y la transforma
al contrato interno de ASSUR Control, agregando:

- `empresaOrigen`
- `lineaNegocio`
- `sourceSystem`
- `externalId`
- metadata original `rawSoftland`

Ejemplo:

```bash
npm run backend
npm run softland:check
npm run softland:contract
```

Existe un fixture de prueba en:

```txt
server/fixtures/softland-api-sample.json
```

## Contrato API Esperado

La API intermedia puede responder con objetos por entidad:

```json
{
  "clientes": [],
  "facturas": [],
  "pagos": [],
  "cxp": [],
  "centrosCosto": [],
  "planCuentas": [],
  "resultadoOperacional": [],
  "costosGastos": [],
  "costosPersonal": [],
  "serviciosRecurrentes": [],
  "materiales": [],
  "stockMateriales": [],
  "movimientosMateriales": []
}
```

Tambien se acepta una respuesta por endpoint en formato:

```json
{
  "data": []
}
```

Campos minimos por entidad:

- clientes: RUT y razon social.
- facturas: folio, RUT cliente y monto.
- pagos: folio factura, fecha pago y monto.
- CxP: folio/documento, proveedor y monto.
- centros de costo: codigo y nombre.
- plan de cuentas: codigo y nombre.
- resultado operacional: ano, mes y monto.
- costos/gastos: ano, mes, cuenta contable y monto.
- costos de personal: ano, mes y costo empresa.
- servicios recurrentes: RUT cliente y valor mensual.
- materiales: codigo y nombre.
- stock materiales: codigo y stock actual.

Cada registro deberia incluir, cuando sea posible:

- empresa o sociedad;
- RUT empresa;
- linea de negocio;
- centro de costo;
- fecha de actualizacion;
- codigo interno Softland.

## Decision Operativa

Usar API si:

- existe endpoint HTTPS documentado;
- no exige VPN;
- soporta filtros por empresa, fecha y folio;
- responde JSON o XML estable.

Usar base de datos si:

- no existe API;
- Power BI se alimenta desde vistas SQL ya disponibles;
- pueden entregar usuario read-only;
- aceptan IP fija/VPN/backend intermedio.

## Recomendacion Para ASSUR

Primero pedir ambas alternativas a soporte. Si entregan API estable, avanzar con
API. Si solo tienen SQL/vistas, preparar VPS o backend privado con IP fija para
conectar a la base y luego escribir datos normalizados en Supabase.
