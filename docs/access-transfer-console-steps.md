# Pasos De Consola Para Transferencia De Accesos

Fecha: 2026-06-15

## Objetivo

Completar el acceso de la cuenta técnica institucional:

```txt
integracion@mdsg.cl
```

sin compartir credenciales personales de Moisés.

## Estado Verificado

```txt
GitHub repo: https://github.com/ASSURChile/nexo-assur-control
Producción: https://assur-control.pages.dev
Supabase prod: nexo-assur-prod / ldodrcedviorjvbpladb
Supabase staging: nexo-assur-staging / vdegakzslrrdvpdkarmn
Cloudflare Pages project: assur-control
```

## Límite Técnico

Las invitaciones de Cloudflare y Supabase deben ejecutarse desde una cuenta con permisos de owner/admin y pueden requerir MFA.

Desde el workspace local se verificó que:

```txt
Cloudflare Wrangler está autenticado con una cuenta personal.
No hay token administrativo local para invitar miembros.
No se debe usar ni compartir credenciales personales.
```

Por seguridad, estas acciones deben completarse en consola web.

## Cloudflare

### Objetivo

Dar acceso a `integracion@mdsg.cl` al proyecto:

```txt
assur-control
```

### Pasos

1. Entrar a Cloudflare Dashboard.
2. Seleccionar la cuenta donde existe el proyecto Pages.
3. Ir a:

```txt
Manage Account > Members
```

4. Seleccionar:

```txt
Invite
```

5. Agregar:

```txt
integracion@mdsg.cl
```

6. Rol recomendado inicial:

```txt
Administrator
```

Si se quiere restringir más adelante, bajar a permisos específicos de:

```txt
Pages
Workers
AI
Account read
```

7. Enviar invitación.
8. Iniciar sesión con `integracion@mdsg.cl` y aceptar.
9. Validar que la cuenta pueda ver:

```txt
Pages > assur-control
Workers > nexo-assur-assistant-prod
Workers > nexo-assur-assistant-staging
```

10. Validar que pueda ver/configurar variables del proyecto Pages.

### Validación Técnica Posterior

Desde el computador donde quede configurada la cuenta técnica:

```bash
npx wrangler whoami
npm run build
npx wrangler pages deploy dist --project-name assur-control --branch main
```

No ejecutar deploy productivo real sin confirmar primero con Moisés.

## Supabase

### Objetivo

Dar acceso a `integracion@mdsg.cl` a:

```txt
nexo-assur-prod
nexo-assur-staging
```

### Pasos

1. Entrar a Supabase Dashboard.
2. Seleccionar organización donde están los proyectos.
3. Ir a:

```txt
Organization Settings > Team / Members
```

4. Invitar:

```txt
integracion@mdsg.cl
```

5. Rol recomendado:

```txt
Developer/Admin
```

Owner solo si la cuenta corporativa será propietaria final.

6. Validar acceso a:

```txt
nexo-assur-prod
nexo-assur-staging
```

7. Validar permisos en cada proyecto:

```txt
Authentication
Table Editor
SQL Editor
Storage
Project Settings
API Settings
```

### Validación Técnica Posterior

Desde la sesión corporativa:

```bash
supabase login
supabase projects list
```

Debe aparecer:

```txt
ldodrcedviorjvbpladb
vdegakzslrrdvpdkarmn
```

## GitHub

Estado:

```txt
Completado
```

Repositorio:

```txt
https://github.com/ASSURChile/nexo-assur-control
```

Validación:

```bash
git clone git@github.com:ASSURChile/nexo-assur-control.git
cd nexo-assur-control
npm install
npm run build
npm run stage:check
```

## Seguridad Después De Completar Invitaciones

Cuando `integracion@mdsg.cl` tenga acceso validado:

```txt
[ ] Confirmar 2FA activo en integracion@mdsg.cl.
[ ] Confirmar recovery email bajo control de la empresa.
[ ] Revisar Cloudflare API tokens personales.
[ ] Revisar Supabase access tokens personales.
[ ] Revocar tokens temporales que ya no se usen.
[ ] Guardar credenciales corporativas en gestor seguro.
```

No revocar accesos personales de Moisés hasta que el informático confirme que puede operar:

```txt
GitHub
Cloudflare
Supabase
Deploy staging
Build local
```

## Criterio De Cierre

El traspaso de accesos queda listo cuando:

```txt
[ ] integracion@mdsg.cl entra a GitHub.
[ ] integracion@mdsg.cl entra a Cloudflare.
[ ] integracion@mdsg.cl ve Pages assur-control.
[ ] integracion@mdsg.cl entra a Supabase.
[ ] integracion@mdsg.cl ve prod y staging.
[ ] Informático puede clonar repo.
[ ] Informático puede ejecutar build/checks.
[ ] Informático puede preparar deploy staging.
```
