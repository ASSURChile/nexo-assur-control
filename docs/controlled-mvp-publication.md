# Publicación Controlada Del MVP

Fecha objetivo inicial: 2026-05-18  
Última actualización: 2026-05-23  
Estado: reemplazado por endurecimiento productivo NEXO; no usar backend antiguo  
Hosting recomendado: Cloudflare Pages Free  
URL gratuita esperada: `https://assur-control.pages.dev`  
Base de datos/Auth/Storage: Supabase nuevo (`nexo-assur-prod` / `nexo-assur-staging`)

> Nota 2026-06-04: el proyecto Supabase anterior dejo de resolver DNS y se considera abandonado. La configuracion vigente esta en `docs/production-operations-runbook.md`.

## Arquitectura MVP

```txt
Cloudflare Pages
  React/Vite build estatico
        ↓
Supabase Cloud
  PostgreSQL + Auth + Storage + RLS
        ↓
Softland
  CSV manual ahora, API/backend despues
```

ASSUR Control se publica como capa operativa y gerencial. No reemplaza Softland
como sistema contable formal.

## Variables Frontend Permitidas

Configurar en Cloudflare Pages > Settings > Environment variables:

```bash
VITE_DATA_PROVIDER=supabase_normalized
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=https://<PROJECT_REF_NUEVO>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon public key nuevo>
VITE_BACKEND_SYNC_ENABLED=false
```

No configurar en Cloudflare Pages:

- `SUPABASE_SERVICE_ROLE_KEY`
- tokens Softland
- passwords de usuarios
- credenciales privadas

## Pasos De Publicación En Cloudflare Pages

1. Subir el proyecto a un repositorio GitHub privado.
2. En Cloudflare, crear Pages project y conectar el repositorio.
3. Configurar:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
4. Agregar las variables frontend permitidas.
5. Ejecutar deploy.
6. Usar la URL gratuita `*.pages.dev` generada.
7. Registrar la URL en la seccion "Resultado".

El proyecto incluye `public/_redirects` para que la app Vite funcione al recargar
rutas y `public/_headers` con headers basicos de seguridad.

## Alternativas

- Vercel: tecnicamente compatible, pero no es la primera opcion gratuita para uso empresarial.
- VPS: diferido hasta requerir backend propio, IP fija, VPN, cron o Softland API privada.
- Supabase Edge Functions: opcion futura si Softland puede integrarse sin servidor persistente.

## Validación En URL Publicada

Probar con usuarios Supabase Auth:

| Rol | Validación mínima |
| --- | --- |
| Admin | Dashboard, comercial, proyectos, servicios, finanzas, configuración y usuarios. |
| Operaciones | Proyectos, aprobaciones, supervisor, servicios y recursos operativos. |
| Supervisor | Vista supervisor, proyectos, tareas, incidencias y cierres. |
| Técnico | Vista móvil "Mi jornada", proyectos, tareas, fichaje, incidencias y materiales. |
| Almacén | Solicitudes, entregas y materiales sin finanzas restringidas. |
| Viewer | Lectura sin configuración sensible. |

Validar flujo:

1. Login.
2. Dashboard con datos persistentes.
3. Clientes e instalaciones.
4. Oportunidad, propuesta y conversion a proyecto.
5. Proyecto con tareas y tecnico asignado.
6. Fichaje/incidencia/material/evidencia.
7. Cierre tecnico.
8. Servicio recurrente.
9. Finanzas: CxC, CxP, flujo de caja y control financiero.
10. Logout/reload/login desde otro navegador.

## Operación Piloto Gratis

Mantener el piloto dentro del plan gratuito mientras:

- el volumen de usuarios sea bajo;
- las evidencias/fotos se mantengan livianas;
- no se dependan respaldos automaticos empresariales;
- Softland siga por CSV;
- el sistema no sea aun critico para la continuidad diaria.

Subir a plan pagado o evaluar VPS cuando:

- se usen datos reales criticos;
- se requieran backups formales;
- Storage o base de datos se acerquen al limite gratuito;
- Softland requiera API segura, IP fija o VPN;
- se necesiten procesos nocturnos/backend persistente.

## Resultado

- URL publicada: `https://assur-control.pages.dev`
- Deploy directo vigente: `https://31e9cd6d.assur-control.pages.dev`
- Fecha de deploy vigente: 2026-05-23
- Ambiente: Cloudflare Pages Production, branch `main`
- Resultado tecnico: deploy exitoso y URL principal responde HTTP 200
- Bundle validado: `index-BIg_oIVf.js`
- Reorganización publicada: Comercial, Cotizaciones y Propuestas, Operaciones, Monitoreo, Finanzas y Sistema
- QA productiva: flujo especial y flujo paquetizado `QA CLOUD` validados
- Bugs detectados: sin bloqueantes; ver `docs/qa-production-report.md`
- Decisión: iniciar piloto operativo controlado antes de abrir uso interno amplio
