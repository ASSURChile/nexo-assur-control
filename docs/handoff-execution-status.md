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

## Hallazgos De Acceso

### Cloudflare

El CLI local `wrangler` está autenticado actualmente con una cuenta personal:

```txt
moisesahc5@gmail.com
```

Esto significa que el deploy desde este computador todavía depende de una sesión personal.  
Antes del traspaso final, Cloudflare debe quedar accesible desde `integracion@mdsg.cl` o desde una organización/cuenta corporativa donde esa cuenta tenga permisos administrativos.

Acción requerida:

```txt
[ ] Invitar/agregar integracion@mdsg.cl a Cloudflare.
[ ] Validar que puede ver el proyecto Pages assur-control.
[ ] Validar que puede publicar o administrar deploys.
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
[ ] Invitar/agregar integracion@mdsg.cl a Supabase.
[ ] Validar acceso a nexo-assur-prod.
[ ] Validar acceso a nexo-assur-staging.
[ ] Confirmar permisos para Auth, Database, Storage y SQL Editor.
```

### Git / Repositorio

Desde este workspace no hay remoto Git configurado.

Acción requerida:

```txt
[ ] Crear repositorio privado en GitHub bajo cuenta/organización corporativa.
[ ] Subir el proyecto desde este workspace.
[ ] Invitar al informático con su correo propio.
[ ] Mantener a Moisés como respaldo temporal.
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
[ ] Repositorio corporativo creado.
[ ] Proyecto subido sin .env.local, tmp, backups ni dist.
[ ] Cloudflare accesible por integracion@mdsg.cl.
[ ] Supabase accesible por integracion@mdsg.cl.
[ ] Informático invitado con correo propio.
[ ] Informático puede clonar repo.
[ ] Informático puede ejecutar npm install.
[ ] Informático puede ejecutar npm run build.
[ ] Informático puede ejecutar npm run stage:check.
[ ] Informático puede desplegar staging.
[ ] Moisés mantiene acceso de respaldo.
[ ] Tokens personales temporales revisados/revocados.
```
