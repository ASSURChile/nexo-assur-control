# Solicitud Para Conexion API Softland

## Objetivo

Conectar ASSUR Control con Softland para consultar informacion financiera y
operativa de:

- Alerta MD Ltda.
- Servicios Electronicos Ltda.

ASSUR Control no reemplazara Softland. Usara sus datos como fuente formal para
facturas, pagos, cuentas por cobrar, cuentas por pagar, centros de costo,
clientes y resultados contables.

## Informacion Que Debo Pedir A Soporte / Informatica

Solicitar lo siguiente:

1. Confirmar si Softland disponible para nuestras empresas tiene API, web
   services, ODBC/SQL controlado, vistas SQL, stored procedures o algun conector
   oficial.
2. URL base del ambiente productivo.
3. URL base del ambiente de pruebas, si existe.
4. Metodo de autenticacion:
   - API key;
   - usuario/clave de integracion;
   - OAuth/client credentials;
   - token Bearer;
   - otro.
5. Credenciales para ambiente de pruebas.
6. Credenciales productivas, solo cuando pasemos a produccion.
7. Identificador interno de empresa para Alerta MD Ltda.
8. Identificador interno de empresa para Servicios Electronicos Ltda.
9. RUT legal configurado en Softland para cada empresa.
10. Documentacion tecnica de endpoints, web services o vistas disponibles.
11. Limites de uso:
    - cantidad de consultas por minuto;
    - horarios recomendados;
    - limites por volumen.
12. Requisitos de red:
    - IP fija;
    - VPN;
    - whitelist;
    - certificado;
    - acceso desde internet.
13. Formato de respuesta:
    - JSON;
    - XML;
    - CSV;
    - SQL view;
    - otro.
14. Campos llave para conciliar:
    - codigo cliente;
    - RUT cliente;
    - folio factura;
    - numero documento;
    - centro de costo;
    - cuenta contable;
    - codigo proyecto, si existe.
15. Procedimiento para renovar claves/tokens.
16. Contacto tecnico responsable de la integracion.

## Si Entregan API

Pedir especificamente:

- URL base de API.
- Endpoint de clientes.
- Endpoint de facturas.
- Endpoint de pagos.
- Endpoint de cuentas por cobrar.
- Endpoint de cuentas por pagar.
- Endpoint de centros de costo.
- Endpoint de plan de cuentas.
- Endpoint de resultado operacional mensual.
- Tipo de autenticacion.
- Ejemplo de request y response.
- Filtros disponibles por empresa, fecha, RUT, folio y centro de costo.

## Si Entregan Conexion Directa A Base De Datos

Pedir especificamente:

- Motor de base de datos: SQL Server, ODBC, MySQL, PostgreSQL u otro.
- Host/IP.
- Puerto.
- Nombre de base de datos.
- Usuario solo lectura.
- Password.
- Si requiere VPN, IP fija, whitelist o certificado.
- Nombre de vistas autorizadas para clientes, facturas, pagos, CxC, CxP,
  centros de costo, plan de cuentas y resultado operacional.
- Campos llave de cada vista.
- Horarios permitidos para consulta.
- Limites de volumen.

## Datos Minimos Que Necesitamos Leer

Primera etapa:

- clientes;
- facturas emitidas;
- pagos/recaudacion;
- cuentas por cobrar;
- cuentas por pagar;
- plan de cuentas;
- centros de costo;
- resultado operacional mensual;
- materiales/stock, si esta disponible;
- movimientos de materiales, si esta disponible;
- servicios recurrentes o contratos, si existe en Softland.

## Texto Corto Para Enviar

> Necesitamos conectar ASSUR Control con Softland para consultar datos de Alerta
> MD Ltda. y Servicios Electronicos Ltda. Favor confirmar el mecanismo disponible
> de integracion: API, web services, ODBC/SQL controlado o conector oficial.
> Necesitamos URL de pruebas, metodo de autenticacion, documentacion tecnica,
> identificador interno de cada empresa, RUT legal configurado, endpoints o
> vistas disponibles para clientes, facturas, pagos, CxC, CxP, plan de cuentas,
> centros de costo y resultado operacional mensual. Indicar tambien si requiere
> IP fija, VPN, whitelist o certificado.

## Seguridad

Las credenciales Softland no deben guardarse en:

- frontend;
- localStorage;
- variables `VITE_*`;
- archivos versionados;
- capturas de pantalla.

La conexion debe quedar server-side:

```txt
Cloudflare Pages frontend
        ↓
Supabase Edge Function o backend privado
        ↓
Softland API / Web Service / SQL controlado
```

## Decision Segun Tipo De Conexion

Si Softland entrega API HTTPS con token:

- usar Supabase Edge Functions o Cloudflare Worker;
- mantener secretos en el entorno server-side;
- sincronizar por demanda o programado.

Si Softland exige IP fija, VPN o acceso local:

- considerar VPS o servidor intermedio;
- ese backend consultara Softland y escribira en Supabase.

Si Softland solo entrega SQL/ODBC:

- no conectar directo desde frontend;
- crear backend seguro;
- limitar consultas a vistas autorizadas.

Si solo existe exportacion manual:

- mantener CSV temporalmente;
- preparar mismo contrato de datos para que luego API use la misma normalizacion.
