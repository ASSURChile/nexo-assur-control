# Handoff Técnico - NEXO por ASSUR

## Objetivo

Entregar la administración técnica del sistema NEXO por ASSUR al responsable de producción sin compartir credenciales personales de Moisés ni depender del computador local.

La cuenta técnica corporativa definida para centralizar propiedad y continuidad es:

```txt
integracion@mdsg.cl
```

Esta cuenta debe usarse como cuenta institucional de administración, no como correo personal del informático.

## Principio De Seguridad

No se deben entregar contraseñas personales, sesiones abiertas, tokens privados ni claves por correo, WhatsApp o chat.

El traspaso debe hacerse por:

- invitaciones formales a servicios;
- roles/permisos por plataforma;
- documentación técnica;
- rotación de secretos temporales;
- repositorio privado;
- backups controlados.

## Arquitectura Actual

```txt
Cloudflare Pages
  Frontend React/Vite

Supabase
  Auth
  PostgreSQL
  Storage privado
  RLS

Cloudflare Worker
  Asistente NEXO MVP

Softland
  En standby
  Preparado por contrato API/CSV futuro
```

## Ambientes

### Producción

```txt
URL: https://assur-control.pages.dev
Supabase: nexo-assur-prod
Uso: piloto productivo controlado
```

### Staging

```txt
Supabase: nexo-assur-staging
Uso: QA CLOUD, pruebas destructivas y validaciones antes de publicar
```

### Local

```txt
Uso: desarrollo y diseño
Auth: demo
Data provider: local
```

## Accesos Que Deben Quedar En La Cuenta Corporativa

### GitHub

Responsable recomendado:

```txt
integracion@mdsg.cl
```

Acciones:

1. Crear o usar cuenta GitHub con `integracion@mdsg.cl`.
2. Crear organización privada, por ejemplo `mdsg` o `nexo-assur`.
3. Transferir o publicar el repositorio del proyecto en esa organización.
4. Invitar al informático con su correo propio.
5. Mantener a Moisés como owner/respaldo administrativo durante la transición.

Permiso recomendado para el informático:

```txt
Maintainer/Admin del repositorio
```

### Cloudflare

Responsable recomendado:

```txt
integracion@mdsg.cl
```

Acciones:

1. Agregar `integracion@mdsg.cl` como miembro/admin de la cuenta Cloudflare donde está Pages.
2. Validar acceso al proyecto `assur-control`.
3. Validar permisos sobre Pages, Workers y variables.
4. Mantener a Moisés como owner/respaldo hasta terminar el traspaso.
5. No entregar token personal de Cloudflare.

Permiso recomendado para el informático:

```txt
Admin técnico del proyecto Pages/Workers
```

### Supabase

Responsable recomendado:

```txt
integracion@mdsg.cl
```

Acciones:

1. Invitar `integracion@mdsg.cl` a la organización/proyectos Supabase.
2. Validar acceso a:
   - `nexo-assur-prod`;
   - `nexo-assur-staging`.
3. Invitar al informático con su propio correo.
4. Mantener a Moisés como owner/respaldo durante la transición.
5. No compartir service role key por mensajes.

Permiso recomendado para el informático:

```txt
Developer/Admin del proyecto
```

Owner solo si será responsable final de infraestructura.

## Variables De Entorno Productivas

Cloudflare Pages debe compilar con:

```txt
VITE_DATA_PROVIDER=supabase_normalized
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=<url_supabase_prod>
VITE_SUPABASE_ANON_KEY=<anon_key_prod>
VITE_ASSISTANT_API_URL=<url_worker_asistente_prod>
VITE_BACKEND_SYNC_ENABLED=false
```

No se debe agregar a Cloudflare Pages:

```txt
SUPABASE_SERVICE_ROLE_KEY
Tokens Softland
Passwords de usuarios
Credenciales personales
```

## Secretos Y Rotación

Antes de completar el traspaso:

1. Revocar tokens temporales usados para montaje.
2. Revisar Cloudflare API tokens personales.
3. Revisar Supabase access tokens.
4. Confirmar que `.env.local`, `tmp/` y `backups/` no se suben al repo.
5. Regenerar cualquier credencial que haya sido compartida fuera de un gestor seguro.
6. Guardar claves corporativas en gestor de contraseñas.

Gestor recomendado:

```txt
Bitwarden / 1Password / gestor corporativo equivalente
```

## Repositorio Y Ejecución Local

Repositorio corporativo:

```txt
https://github.com/ASSURChile/nexo-assur-control
```

Comandos base:

```bash
npm install
npm run dev
npm run build
npm run stage:check
npm run hardening:check
```

Modo local recomendado:

```txt
VITE_DATA_PROVIDER=local
VITE_AUTH_MODE=demo
```

Producción/staging deben usar Supabase real.

## Deploy Productivo

Deploy directo desde workspace:

```bash
npm run pages:deploy:prod
```

Deploy manual equivalente:

```bash
npm run build
npx wrangler pages deploy dist --project-name assur-control --branch main
```

Antes de publicar:

```bash
npm run stage:check
npm run hardening:check
npm run build
```

Después de publicar:

1. Abrir `https://assur-control.pages.dev`.
2. Probar login admin/gerencia/operaciones/técnico/finanzas.
3. Confirmar que producción no está en modo demo.
4. Confirmar persistencia tras logout/reload.
5. Revisar Configuración > Salud.

## Supabase

Orden de montaje si se recrea un proyecto:

```txt
01_schema.sql
03_bootstrap_profiles_TEMPLATE.sql
04_policies.sql
05_storage.sql
07_fix_authenticated_grants.sql
09_extend_profile_roles.sql
10_role_based_write_policies.sql
11_commercial_packages_cloud.sql
12_operating_context_optional.sql
13_seed_roles_permissions.sql
14_assistant_ai.sql
06_validation_queries.sql
```

`08_reset_demo_auth_passwords.sql` solo puede ejecutarse en staging/desarrollo, nunca en producción.

## Roles Iniciales

Usuarios/roles operativos definidos:

```txt
gerente@assur.cl       -> gerente_general
gerops@assur.cl        -> gerente_operaciones_admin
admin@assur.cl         -> admin
gerencia@assur.cl      -> gerencia
vendedor@assur.cl      -> comercial
jefecomercial@assur.cl -> jefe_comercial
oper@assur.cl          -> operaciones
adminops@assur.cl      -> administrativo_operaciones
super@assur.cl         -> supervisor
tec@assur.cl           -> tecnico
monitoreo@assur.cl     -> monitoreo
finanzas@assur.cl      -> finanzas
almacen@assur.cl       -> almacen
view@assur.cl          -> viewer
```

## Backups

Backup productivo:

```bash
BACKUP_ENV=prod npm run backup:cloud
```

Backup staging:

```bash
BACKUP_ENV=staging npm run backup:cloud
```

Reglas:

- `backups/` no se sube al repo.
- Los backups pueden contener datos sensibles.
- Deben guardarse en almacenamiento corporativo seguro.
- Hacer backup antes de cambios mayores.

## Pendientes Técnicos

### Prioridad Alta

- QA del piloto con usuarios reales.
- Confirmar usuarios reales en Supabase Auth.
- Confirmar permisos por rol en producción.
- Validar técnico móvil en celular real.
- Validar Storage con evidencias reales controladas.

### Prioridad Media

- Rediseño UX profundo por rol.
- Afinar cotizaciones PDF.
- Consolidar panel de salud.
- Mejorar observabilidad de errores.

### Standby

- Integración Softland API.
- Asistente IA MVP+.
- VPS/backend dedicado.

## Riesgos Conocidos

- La integración Softland aún no está activa.
- Producción está pensada como piloto controlado, no lanzamiento masivo.
- Los cambios grandes deben probarse primero en staging.
- No se debe trabajar directo sobre producción con datos reales sin backup.

## Checklist De Traspaso

```txt
[ ] Cuenta integracion@mdsg.cl creada.
[ ] 2FA activo en integracion@mdsg.cl.
[ ] GitHub/organización creada.
[ ] Repositorio privado disponible.
[ ] Informático invitado con su correo propio.
[ ] Cloudflare accesible por integracion@mdsg.cl.
[ ] Supabase accesible por integracion@mdsg.cl.
[ ] Variables productivas documentadas sin exponer secretos.
[ ] Backups realizados.
[ ] Tokens temporales revocados.
[ ] Informático puede correr npm install.
[ ] Informático puede correr npm run build.
[ ] Informático puede correr npm run stage:check.
[ ] Informático puede desplegar staging.
[ ] Informático puede validar producción.
```

## Regla Final

No entregar cuentas personales.  
No entregar tokens por chat.  
No mover propiedad sin validar accesos paralelos.  
Primero acceso, luego respaldo, luego transferencia.
