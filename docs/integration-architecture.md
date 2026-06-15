# Arquitectura Flexible De Integraciones

ASSUR Control debe crecer como capa operativa/gerencial, no como un bloque rígido.
Por eso las fuentes externas se conectan mediante proveedores y adaptadores.

## Principio Base

Las vistas no deben conocer detalles de Supabase, Softland ni APIs externas.
Las vistas trabajan con servicios de dominio:

- clientes
- instalaciones
- oportunidades
- propuestas
- proyectos
- servicios recurrentes
- finanzas
- operación técnica

Los adaptadores traducen esos datos desde/hacia sistemas externos.

## Proveedores De Datos

Configurados por `VITE_DATA_PROVIDER`:

- `local`: modo actual/localStorage.
- `backend`: backend local/API propia.
- `supabase_collections`: Supabase como JSONB transitorio en `app_collections`.
- `supabase_normalized`: Supabase con tablas normalizadas.

La sincronización contra backend local/API queda apagada en modo local por defecto. Se activa solo con:

```bash
VITE_DATA_PROVIDER=backend
```

o, si se quiere seguir usando repositorios locales pero sincronizar en segundo plano:

```bash
VITE_BACKEND_SYNC_ENABLED=true
```

Validación:

```bash
npm run provider:check
npm run audit:data
```

## Supabase

Validar seed:

```bash
npm run supabase:check
```

Generar preview:

```bash
npm run supabase:seed:preview
```

Dry-run de carga:

```bash
npm run supabase:push:dry
```

Carga real, solo con variables server-side:

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run supabase:push
```

Nunca usar `SUPABASE_SERVICE_ROLE_KEY` en frontend.

## Softland

Softland debe quedar como proveedor financiero/contable, no como dueño de la
operación ASSUR.

ASSUR Control trabajara con una sola plataforma y un solo workspace de seguridad,
pero cada registro financiero/operativo debe conservar su empresa legal de
origen:

- `alerta_md`: monitoreo y servicios recurrentes.
- `servicios_electronicos`: implementacion tecnica, proyectos, materiales y horas.

El detalle de esta separacion esta en `docs/multi-company-architecture.md`.
La pauta para solicitar acceso API esta en `docs/softland-api-request.md`.
Las dos opciones tecnicas soportadas estan descritas en
`docs/softland-connection-options.md`.
El contrato JSON minimo para la API intermedia esta en
`docs/softland-api-contract.md`.

Fases recomendadas:

1. CSV manual controlado.
2. Importador backend.
3. API/credenciales en Edge Functions o backend.
4. Conciliación automática contra facturas, pagos, CxC, CxP y centros de costo.

El frontend no debe guardar tokens Softland ni credenciales privadas.

## Reglas Para Nuevas Integraciones

1. Crear un adaptador en `src/services`.
2. Mantener transformaciones en funciones puras.
3. Validar datos antes de guardarlos.
4. Guardar errores en `sync_logs`.
5. No mezclar lógica externa dentro de componentes React.
6. Permitir dry-run antes de cualquier sincronización destructiva.
7. Mantener `metadata` para campos externos que no tengan columna propia.

## Futuras Integraciones Posibles

- Softland API.
- Facturación electrónica.
- Google Drive/Storage para documentos.
- WhatsApp/email para alertas.
- Power BI/Looker Studio.
- App móvil/PWA offline.
- IA predictiva sobre datos históricos.
