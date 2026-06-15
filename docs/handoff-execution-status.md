# Estado De Ejecución Del Traspaso - NEXO por ASSUR

Fecha de revisión: 2026-06-15

## Estado Actual

El proyecto está publicado y operativo como piloto productivo en:

```txt
https://assur-control.pages.dev
```

La cuenta corporativa definida para continuidad técnica es:

```txt
integracion@mdsg.cl
```

La pauta operativa exacta para completar invitaciones en consola está en:

```txt
docs/access-transfer-console-steps.md
```

## Hallazgos De Acceso

### Cloudflare

El CLI local `wrangler` está autenticado actualmente con una cuenta personal:

```txt
moisesahc5@gmail.com
```

Esto significa que el deploy desde este computador todavía usa una sesión personal.
La consola Cloudflare ya muestra `integracion@mdsg.cl` como miembro activo de la cuenta, por lo que el acceso administrativo queda compartido. El siguiente paso recomendado es que el informático inicie sesión con `integracion@mdsg.cl` y ejecute un deploy de prueba o revise Pages desde su propio equipo.

Acción requerida:

```txt
[x] Invitar/agregar integracion@mdsg.cl a Cloudflare.
[x] Validar que puede ver la cuenta Cloudflare.
[ ] Validar desde la cuenta corporativa que puede ver el proyecto Pages assur-control.
[ ] Validar desde la cuenta corporativa que puede publicar o administrar deploys.
[ ] Mantener a Moisés como respaldo hasta completar transición.
```

### Supabase

Los proyectos actuales documentados son:

```txt
Producción: nexo-assur-prod / ldodrcedviorjvbpladb
Staging: nexo-assur-staging / vdegakzslrrdvpdkarmn
```

Acción requerida:

```txt
[x] Invitar/agregar integracion@mdsg.cl a Supabase.
[x] Validar acceso a nexo-assur-prod.
[x] Validar acceso a nexo-assur-staging.
[x] Confirmar permisos administrativos visibles para ambos proyectos.
```

Estado técnico validado el 2026-06-15:

```txt
Producción: nexo-assur-prod / Healthy / https://ldodrcedviorjvbpladb.supabase.co
Staging: nexo-assur-staging / Healthy / https://vdegakzslrrdvpdkarmn.supabase.co
```

La validación remota del schema respondió correctamente para tablas principales en producción y staging.

### Git / Repositorio

El repositorio corporativo ya está configurado y publicado.

```txt
Repositorio: https://github.com/ASSURChile/nexo-assur-control
Remoto local: git@github.com:ASSURChile/nexo-assur-control.git
Rama: main
Commit handoff: 0fdf52f Preparar release productivo y handoff tecnico
```

Acción requerida:

```txt
[x] Crear repositorio privado en GitHub bajo cuenta/organización corporativa.
[x] Subir el proyecto desde este workspace.
[ ] Invitar al informático con su correo propio, si será distinto de integracion@mdsg.cl.
[ ] Mantener a Moisés como respaldo temporal.
```

El remoto local responde por SSH con la llave de deploy del proyecto:

```txt
origin -> git@github.com:ASSURChile/nexo-assur-control.git
main -> 5684150 Documentar pasos de traspaso de accesos
```

## Archivos Que No Deben Entregarse Por Repositorio

Estos paths están presentes localmente y deben mantenerse fuera de Git:

```txt
.env.local
tmp/
backups/
dist/
node_modules/
```

`tmp/` puede contener configuraciones temporales, summaries de Supabase o archivos generados por scripts.

`backups/` puede contener datos sensibles del negocio.

## Revisión Rápida De Secretos

No se detectaron tokens reales tipo `sbp_` o JWT en archivos versionables revisados.

Sí existen contraseñas demo en el código local para modo desarrollo:

```txt
src/services/bootstrapService.js
src/views/LoginScreen.jsx
```

Estas contraseñas no deben considerarse credenciales productivas.  
Producción debe ejecutarse con:

```txt
VITE_AUTH_MODE=supabase
```

## Decisión Recomendada

No transferir propiedad todavía.

Primero:

1. Crear repositorio corporativo.
2. Subir release actual.
3. Invitar `integracion@mdsg.cl` a Cloudflare y Supabase.
4. Validar accesos.
5. Rotar/revocar tokens personales temporales.
6. Hacer deploy de prueba desde la cuenta corporativa.
7. Recién después transferir propiedad o dejar ownership compartido.

## Checklist Para Cerrar Handoff

```txt
[x] Repositorio corporativo creado.
[x] Proyecto subido sin .env.local, tmp, backups ni dist.
[x] Cloudflare con integracion@mdsg.cl como miembro activo.
[x] Supabase con integracion@mdsg.cl como Administrator en prod/staging.
[ ] Informático invitado con correo propio, si no usará integracion@mdsg.cl.
[ ] Informático puede clonar repo.
[ ] Informático puede ejecutar npm install.
[ ] Informático puede ejecutar npm run build.
[ ] Informático puede ejecutar npm run stage:check.
[ ] Informático puede desplegar staging.
[ ] Moisés mantiene acceso de respaldo.
[ ] Tokens personales temporales revisados/revocados.
```

## Checks Ejecutados

```txt
[x] supabase:mount:check
[x] hardening:check
[x] supabase remote schema check contra producción
[x] supabase remote schema check contra staging
[x] git ls-remote origin main
```

Notas:

- `hardening:check` queda OK con advertencias esperadas porque los archivos `.env.*.example` mantienen placeholders para no versionar claves reales.
- El CLI `wrangler` local sigue autenticado con `moisesahc5@gmail.com`; eso no bloquea la operación, pero el cierre limpio exige que `integracion@mdsg.cl` o el informático hagan login propio para futuros deploys.
- `gh` CLI no está instalado en este Mac, por lo que la verificación GitHub se hizo por remoto SSH.
