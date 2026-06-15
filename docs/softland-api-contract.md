# Contrato API Intermedia Softland

Este documento define el formato minimo que ASSUR Control puede consumir desde
una API creada sobre SQL/tablas Softland.

## Forma Recomendada

Un endpoint de sincronizacion puede entregar varias entidades:

```json
{
  "clientes": [],
  "facturas": [],
  "pagos": [],
  "cxc": [],
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

O se puede entregar un endpoint por entidad:

```json
{
  "data": []
}
```

## Campos Transversales Deseables

En todos los registros, idealmente incluir:

- `empresa`: Alerta MD Ltda. o Servicios Electronicos Ltda.
- `rutEmpresa`
- `lineaNegocio`
- `codigo` o `id`
- `fechaActualizacion`

Esto permite consolidar ASSUR sin perder trazabilidad legal.

## Entidades Minimas

### Clientes

Campos minimos:

- `rut`
- `razonSocial`

Campos utiles:

- `codigo`
- `nombreFantasia`
- `direccion`
- `telefono`
- `email`
- `estado`
- `centroCosto`

### Facturas

Campos minimos:

- `folio`
- `rutCliente`
- `montoTotal`

Campos utiles:

- `fechaEmision`
- `fechaVencimiento`
- `montoPagado`
- `saldo`
- `estado`
- `centroCosto`

### Pagos

Campos minimos:

- `folioFactura`
- `fechaPago`
- `monto`

Campos utiles:

- `medio`
- `glosa`
- `idPago`

### Cuentas Por Pagar

Campos minimos:

- `folio` o `numeroDocumento`
- `proveedor`
- `montoTotal`

Campos utiles:

- `rutProveedor`
- `fechaEmision`
- `fechaVencimiento`
- `saldo`
- `estado`
- `centroCosto`

### Resultado Operacional

Campos minimos:

- `anio`
- `mes`
- `monto`

Campos utiles:

- `familia`
- `gestion`
- `centroCosto`
- `cuentaContable`
- `tipoResultado`

### Costos Y Gastos

Campos minimos:

- `anio`
- `mes`
- `cuentaContable`
- `monto`

Campos utiles:

- `nombreCuenta`
- `centroCosto`
- `tipoGasto`
- `familia`
- `gestion`
- `recurrente`

### Costos De Personal / Nomina Operativa

Campos minimos:

- `anio`
- `mes`
- `costoEmpresa`

Campos utiles:

- `area`
- `rolCargo`
- `centroCosto`
- `horasBaseMes`
- `horasReales`
- `tecnicosActivos`

ASSUR calcula:

```txt
costoHoraReal = costoEmpresa / horasDisponibles
```

Si no hay `horasReales`, usa `horasBaseMes`. Si tampoco existe, usa
`tecnicosActivos * 180` horas mensuales como referencia.

### Servicios Recurrentes

Campos minimos:

- `rutCliente`
- `valorMensual`

Campos utiles:

- `codigo`
- `tipoServicio`
- `estado`
- `fechaInicio`
- `camaras`
- `alarmas`
- `periodicidad`

### Materiales / Stock

Campos minimos:

- `codigo`
- `nombre`

Campos utiles:

- `categoria`
- `unidad`
- `costoUnitario`
- `stockActual`
- `bodega`
- `fechaActualizacion`

### Movimientos De Materiales

Opcional para segunda etapa.

Campos minimos:

- `codigo`
- `fecha`
- `cantidad`

Campos utiles:

- `tipoMovimiento`
- `costoUnitario`
- `costoTotal`
- `bodega`
- `centroCosto`
- `proyectoCodigo`
- `documento`

## Validacion En ASSUR

El proyecto ya incluye:

- Adaptador: `server/softlandAdapter.mjs`
- Fixture: `server/fixtures/softland-api-sample.json`
- Script: `npm run softland:contract`
- Endpoint backend: `POST /api/softland/normalize`

Cuando Control de Gestion entregue una muestra JSON, se puede guardar como
archivo temporal y ejecutar:

```bash
npm run softland:contract ruta/al/archivo.json
```

Si pasa, la API ya calza con el contrato minimo.
