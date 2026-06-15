import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(".");
const OUT_DIR = resolve(ROOT, "supabase", "mount");

const files = [
  {
    source: "supabase/schema.sql",
    target: "01_schema.sql",
    title: "Crear schema base",
  },
  {
    source: "supabase/seed.preview.sql",
    target: "02_seed_preview.sql",
    title: "Cargar seed inicial",
  },
  {
    source: "supabase/bootstrap-profiles.template.sql",
    target: "03_bootstrap_profiles_TEMPLATE.sql",
    title: "Crear perfiles despues de usuarios Auth",
  },
  {
    source: "supabase/policies.sql",
    target: "04_policies.sql",
    title: "Activar RLS y policies",
  },
  {
    source: "supabase/mount/10_role_based_write_policies.sql",
    target: "10_role_based_write_policies.sql",
    title: "Extender permisos por rol operativo",
  },
  {
    source: "supabase/storage.sql",
    target: "05_storage.sql",
    title: "Crear Storage y policies de archivos",
  },
];

const validationSql = `-- Validaciones post montaje NEXO por ASSUR.
-- Ejecutar despues de aplicar el kit completo.

select 'companies' as table_name, count(*) as rows from public.companies
union all select 'profiles', count(*) from public.profiles
union all select 'clients', count(*) from public.clients
union all select 'sites', count(*) from public.sites
union all select 'projects', count(*) from public.projects
union all select 'project_tasks', count(*) from public.project_tasks
union all select 'roles', count(*) from public.roles
union all select 'role_permissions', count(*) from public.role_permissions
union all select 'legal_entities', count(*) from public.legal_entities
union all select 'business_units', count(*) from public.business_units
union all select 'commercial_packages', count(*) from public.commercial_packages
union all select 'quick_quotes', count(*) from public.quick_quotes
union all select 'invoices', count(*) from public.invoices
union all select 'accounts_payable', count(*) from public.accounts_payable
order by table_name;

select id, full_name, email, role, active
from public.profiles
order by role, email;

select r.code as role, rp.module_id, rp.action, rp.allowed
from public.roles r
join public.role_permissions rp on rp.role_id = r.id and rp.company_id = r.company_id
where rp.allowed = true
order by r.code, rp.module_id, rp.action;

select le.name as legal_entity, bu.name as business_unit, bu.code, bu.status
from public.business_units bu
left join public.legal_entities le on le.id = bu.legal_entity_id
order by le.name, bu.name;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'clients','sites','projects','project_tasks','invoices',
    'accounts_payable','recurring_services','service_billing_expectations',
    'commercial_packages','commercial_package_items','commercial_package_services','quick_quotes',
    'roles','role_permissions','profile_permissions','attachments','activity_events','error_logs'
  )
order by tablename;

select id, public
from storage.buckets
where id in ('project-evidence','project-reports','signatures','service-documents')
order by id;
`;

const envTemplate = `# NEXO por ASSUR - Supabase real
# Copiar a .env.local cuando se pruebe contra Supabase.

VITE_DATA_PROVIDER=supabase_normalized
VITE_AUTH_MODE=supabase
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
VITE_BACKEND_SYNC_ENABLED=false

# Solo terminal local/backend. No usar en frontend.
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SERVICE_ROLE_KEY=TU_SERVICE_ROLE_KEY
`;

function readme() {
  return `# Kit De Montaje Supabase - NEXO por ASSUR

Este directorio contiene los archivos listos para aplicar en Supabase SQL Editor.

## Orden De Ejecucion

1. \`01_schema.sql\`
2. Crear usuarios en Supabase Authentication > Users.
3. Copiar UUID de cada usuario Auth.
4. Editar \`03_bootstrap_profiles_TEMPLATE.sql\`, reemplazando \`AUTH_UUID_*\`.
5. Ejecutar \`03_bootstrap_profiles_TEMPLATE.sql\`.
6. \`04_policies.sql\`
7. \`05_storage.sql\`
8. \`07_fix_authenticated_grants.sql\`
9. \`09_extend_profile_roles.sql\`
10. \`10_role_based_write_policies.sql\`
11. \`11_commercial_packages_cloud.sql\`
12. \`12_operating_context_optional.sql\`
13. \`13_seed_roles_permissions.sql\`
14. Opcional QA/staging: \`02_seed_preview.sql\`
15. Opcional QA/staging: \`08_reset_demo_auth_passwords.sql\`
16. \`06_validation_queries.sql\`

## Usuarios Sugeridos Para Auth

- gerente@assur.cl -> gerente_general
- gerops@assur.cl -> gerente_operaciones_admin
- admin@assur.cl -> admin
- gerencia@assur.cl -> gerencia
- vendedor@assur.cl -> comercial
- jefecomercial@assur.cl -> jefe_comercial
- oper@assur.cl -> operaciones
- adminops@assur.cl -> administrativo_operaciones
- super@assur.cl -> supervisor
- tec@assur.cl -> tecnico
- monitoreo@assur.cl -> monitoreo
- finanzas@assur.cl -> finanzas
- almacen@assur.cl -> almacen
- view@assur.cl -> viewer

Las contrasenas se crean directamente en Supabase Auth. No se guardan en el repo.

Para QA/staging se puede ejecutar \`08_reset_demo_auth_passwords.sql\`.
No usar contrasenas demo en produccion.

## Contexto Operativo

- Tenant principal: ASSUR Chile.
- Entidades legales: Alerta MD, Servicios Electronicos, ASSUR Chile futura.
- Unidades de negocio: Monitoreo, Proyectos, ASSUR Home, ASSUR Empresas.

## Importante

- \`service_role\` nunca debe ir en variables \`VITE_*\`.
- Ejecutar \`npm run stage:check\` antes de aplicar cambios.
- Si cambia el seed o schema, regenerar este kit con \`npm run supabase:mount:kit\`.
`;
}

await mkdir(OUT_DIR, { recursive: true });

for (const file of files) {
  const body = await readFile(resolve(ROOT, file.source), "utf8");
  await writeFile(resolve(OUT_DIR, file.target), `-- ${file.title}\n-- Fuente: ${file.source}\n\n${body}`);
}

await writeFile(resolve(OUT_DIR, "00_README.md"), readme());
await writeFile(resolve(OUT_DIR, "06_validation_queries.sql"), validationSql);
await writeFile(resolve(OUT_DIR, ".env.supabase.example"), envTemplate);

console.log(JSON.stringify({
  ok: true,
  output: OUT_DIR,
  files: [
    "00_README.md",
    ...files.map((file) => file.target),
    "07_fix_authenticated_grants.sql",
    "09_extend_profile_roles.sql",
    "11_commercial_packages_cloud.sql",
    "12_operating_context_optional.sql",
    "13_seed_roles_permissions.sql",
    "06_validation_queries.sql",
    ".env.supabase.example",
  ],
}, null, 2));
