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

const validationSql = `-- Validaciones post montaje ASSUR Control.
-- Ejecutar despues de aplicar 01-05.

select 'companies' as table_name, count(*) as rows from public.companies
union all select 'profiles', count(*) from public.profiles
union all select 'clients', count(*) from public.clients
union all select 'sites', count(*) from public.sites
union all select 'projects', count(*) from public.projects
union all select 'project_tasks', count(*) from public.project_tasks
union all select 'commercial_packages', count(*) from public.commercial_packages
union all select 'quick_quotes', count(*) from public.quick_quotes
union all select 'invoices', count(*) from public.invoices
union all select 'accounts_payable', count(*) from public.accounts_payable
order by table_name;

select id, full_name, email, role, active
from public.profiles
order by role, email;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'clients','sites','projects','project_tasks','invoices',
    'accounts_payable','recurring_services','service_billing_expectations',
    'commercial_packages','commercial_package_items','commercial_package_services','quick_quotes'
  )
order by tablename;

select id, public
from storage.buckets
where id in ('project-evidence','project-reports','signatures','service-documents')
order by id;
`;

const envTemplate = `# ASSUR Control - Supabase real
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
  return `# Kit De Montaje Supabase - ASSUR Control

Este directorio contiene los archivos listos para aplicar en Supabase SQL Editor.

## Orden De Ejecucion

1. \`01_schema.sql\`
2. \`02_seed_preview.sql\`
3. Crear usuarios en Supabase Authentication > Users.
4. Copiar UUID de cada usuario Auth.
5. Editar \`03_bootstrap_profiles_TEMPLATE.sql\`, reemplazando \`AUTH_UUID_*\`.
6. Ejecutar \`03_bootstrap_profiles_TEMPLATE.sql\`.
7. \`04_policies.sql\`
8. \`10_role_based_write_policies.sql\`
9. \`05_storage.sql\`
10. Opcional QA/staging: \`08_reset_demo_auth_passwords.sql\`
11. \`06_validation_queries.sql\`

## Usuarios Sugeridos Para Auth

- admin@assur.cl -> admin
- oper@assur.cl -> operaciones
- super@assur.cl -> supervisor
- tec@assur.cl -> tecnico
- almacen@assur.cl -> almacen
- view@assur.cl -> viewer

Las contrasenas se crean directamente en Supabase Auth. No se guardan en el repo.

Para QA local se puede ejecutar \`08_reset_demo_auth_passwords.sql\`, que deja todos los usuarios sugeridos con \`admin12345\`.
No usar esa contrasena en produccion.

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
    "06_validation_queries.sql",
    ".env.supabase.example",
  ],
}, null, 2));
