# Backend local ASSUR Control

Este backend es un puente lean antes de pasar a Supabase. No reemplaza a Softland ni intenta ser un ERP: entrega una API REST mínima para persistir datos fuera del navegador, probar sincronización y ordenar la transición hacia PostgreSQL/Auth/Storage.

## Ejecutar

```bash
npm run backend
```

Por defecto queda disponible en:

```text
http://127.0.0.1:8787
```

Variables útiles:

```bash
VITE_DATA_PROVIDER=backend
VITE_BACKEND_SYNC_ENABLED=true
VITE_ASSUR_BACKEND_URL=http://127.0.0.1:8787
ASSUR_BACKEND_PORT=8787
ASSUR_BACKEND_HOST=127.0.0.1
ASSUR_DATA_FILE=server/data/app-data.json
ASSUR_BACKEND_URL=http://127.0.0.1:8787
```

En modo `local`, la app no intenta sincronizar con este backend salvo que `VITE_BACKEND_SYNC_ENABLED=true`.

## Verificar

Con el backend encendido:

```bash
npm run backend:check
```

La prueba valida `/health` y una colección base (`af_clientes`).

Para validar CRUD por entidad:

```bash
npm run backend:test
```

## Endpoints

- `GET /health`: estado del servicio y cantidad de claves persistidas.
- `GET /api/collections`: catálogo de colecciones disponibles, prioridad y cantidad de registros.
- `GET /api/data/:key`: obtiene una colección o valor por clave técnica.
- `PUT /api/data/:key`: reemplaza una colección o valor por clave técnica.
- `DELETE /api/data/:key`: elimina una clave técnica.
- `GET /api/entities/:name`: obtiene una entidad por nombre de negocio, por ejemplo `clientes`.
- `GET /api/entities/:name/:id`: obtiene un registro.
- `POST /api/entities/:name`: crea un registro.
- `PUT /api/entities/:name/:id`: reemplaza un registro.
- `PATCH /api/entities/:name/:id`: actualiza parcialmente un registro.
- `DELETE /api/entities/:name/:id`: elimina un registro.
- `GET /api/backup?safe=true`: obtiene snapshot completo sin sesión ni contraseñas.
- `GET /api/backup?safe=false`: obtiene snapshot completo sin filtrar, solo para uso local controlado.
- `PUT /api/backup`: reemplaza todo el archivo de datos.
- `POST /api/backup/merge`: fusiona claves recibidas sobre el archivo actual.
- `GET /api/domain-backup`: obtiene snapshot con nombres de dominio (`clientes`, `proyectos`, etc.).
- `POST /api/domain-backup/merge`: fusiona snapshot con nombres de dominio.

## Decisiones de seguridad

- No se deben guardar tokens Softland en frontend ni `localStorage`.
- El endpoint seguro elimina `af_session`, omite passwords de `af_usuarios` y limpia token de `af_api_config`.
- `server/data/*.json` queda ignorado por git para no subir datos reales.

## Próxima migración

La ruta natural después de este puente es:

1. Mantener frontend estable con repositorios actuales.
2. Usar `src/services/backendEntityService.js` para nuevas pantallas o migraciones por módulo.
3. Definir tablas finales en Supabase desde `supabase/schema.sql`.
4. Crear adaptador API/Supabase por módulo, empezando por clientes, instalaciones, proyectos y servicios recurrentes.
5. Mover autenticación a Supabase Auth antes de producción.
6. Dejar Softland como fuente contable mediante CSV/API backend, nunca desde credenciales en navegador.

## Módulos conectados en modo híbrido

Ya existen servicios frontend que sincronizan en segundo plano con el backend local:

- `src/services/masterDataBackendService.js`: clientes e instalaciones.
- `src/services/operationalBackendService.js`: proyectos, servicios recurrentes, eventos de servicio y facturación esperada.
- `src/services/financialBackendService.js`: facturas, pagos, cuentas por pagar y gastos.

El patrón actual es deliberadamente conservador:

- La app sigue usando repositorios síncronos/locales para no romper pantallas existentes.
- Al iniciar, cada bloque hace merge por `id` y `updatedAt` solo cuando la sincronización backend está activada.
- Si el backend está vacío, se inicializa con los datos locales.
- Cada guardado local intenta sincronizar con `/api/entities/*`.
- Las expectativas recurrentes se sincronizan como colección completa para evitar residuos de meses eliminados.
