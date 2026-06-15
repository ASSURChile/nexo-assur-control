import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomBytes } from "node:crypto";

const ROOT = resolve(".");
const MOUNT_DIR = resolve(ROOT, "supabase", "mount");
const OUT_DIR = resolve(ROOT, "tmp");

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const PROJECT_REF = process.env.SUPABASE_PROJECT_REF;
const PROJECT_NAME = process.env.SUPABASE_PROJECT_NAME || PROJECT_REF;
const WRITE_CREDENTIALS = process.env.WRITE_CREDENTIALS !== "false";

if (!ACCESS_TOKEN) throw new Error("Falta SUPABASE_ACCESS_TOKEN.");
if (!PROJECT_REF) throw new Error("Falta SUPABASE_PROJECT_REF.");

const COMPANY_ID = "00000000-0000-0000-0000-000000000001";

const users = [
  ["AUTH_UUID_GERENTE_GENERAL", "gerente@assur.cl", "Gerente General", "gerente_general"],
  ["AUTH_UUID_GERENTE_OPERACIONES_ADMIN", "gerops@assur.cl", "Gerente Operaciones y Administracion", "gerente_operaciones_admin"],
  ["AUTH_UUID_ADMIN", "admin@assur.cl", "Administrador Sistema", "admin"],
  ["AUTH_UUID_GERENCIA", "gerencia@assur.cl", "Gerencia", "gerencia"],
  ["AUTH_UUID_COMERCIAL", "vendedor@assur.cl", "Vendedor Demo", "comercial"],
  ["AUTH_UUID_JEFE_COMERCIAL", "jefecomercial@assur.cl", "Jefe Comercial", "jefe_comercial"],
  ["AUTH_UUID_OPERACIONES", "oper@assur.cl", "Jefe Operaciones", "operaciones"],
  ["AUTH_UUID_ADMINOPS", "adminops@assur.cl", "Administrativo Operaciones", "administrativo_operaciones"],
  ["AUTH_UUID_SUPERVISOR", "super@assur.cl", "Supervisor Campo", "supervisor"],
  ["AUTH_UUID_TECNICO", "tec@assur.cl", "Juan Perez Tecnico", "tecnico"],
  ["AUTH_UUID_MONITOREO", "monitoreo@assur.cl", "Encargado Monitoreo", "monitoreo"],
  ["AUTH_UUID_FINANZAS", "finanzas@assur.cl", "Finanzas", "finanzas"],
  ["AUTH_UUID_ALMACEN", "almacen@assur.cl", "Almacen Central", "almacen"],
  ["AUTH_UUID_VIEWER", "view@assur.cl", "Visualizador", "viewer"],
];

function readMount(file) {
  return readFileSync(resolve(MOUNT_DIR, file), "utf8");
}

function password() {
  return `Nexo-${randomBytes(18).toString("base64url")}-26`;
}

async function management(path, init = {}) {
  const res = await fetch(`https://api.supabase.com/v1${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${ACCESS_TOKEN}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function query(sql, label) {
  const res = await management(`/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query: sql }),
  });
  console.log(`OK SQL ${label}`);
  return res;
}

async function getApiKeys() {
  const keys = await management(`/projects/${PROJECT_REF}/api-keys`);
  const legacyService = keys.find((key) => key.name === "service_role" || key.id === "service_role");
  const legacyAnon = keys.find((key) => key.name === "anon" || key.id === "anon");
  const publishable = keys.find((key) => key.type === "publishable");
  if (!legacyService?.api_key) throw new Error(`No se encontro service_role legacy para ${PROJECT_REF}.`);
  if (!legacyAnon?.api_key && !publishable?.api_key) throw new Error(`No se encontro anon/publishable para ${PROJECT_REF}.`);
  return {
    serviceRoleKey: legacyService.api_key,
    frontendAnonKey: publishable?.api_key || legacyAnon.api_key,
  };
}

async function authAdmin(serviceRoleKey, path, init = {}) {
  const res = await fetch(`https://${PROJECT_REF}.supabase.co/auth/v1${path}`, {
    ...init,
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${init.method || "GET"} auth ${path} -> ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function listAuthUsers(serviceRoleKey) {
  const data = await authAdmin(serviceRoleKey, "/admin/users?page=1&per_page=200");
  return Array.isArray(data?.users) ? data.users : [];
}

async function createUser(serviceRoleKey, [, email, fullName, role]) {
  const initialPassword = password();
  const existing = (await listAuthUsers(serviceRoleKey)).find((user) => String(user.email).toLowerCase() === email.toLowerCase());
  if (existing?.id) {
    const updated = await authAdmin(serviceRoleKey, `/admin/users/${existing.id}`, {
      method: "PUT",
      body: JSON.stringify({
        password: initialPassword,
        email_confirm: true,
        user_metadata: {
          ...(existing.user_metadata || {}),
          full_name: fullName,
          role,
          company_id: COMPANY_ID,
        },
      }),
    });
    return { id: updated.id || existing.id, email, fullName, role, password: initialPassword, created: false };
  }

  const body = {
    email,
    password: initialPassword,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      company_id: COMPANY_ID,
    },
  };
  const user = await authAdmin(serviceRoleKey, "/admin/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { id: user.id, email, fullName, role, password: initialPassword, created: true };
}

async function main() {
  console.log(`Montando ${PROJECT_NAME} (${PROJECT_REF})`);
  const keys = await getApiKeys();

  await query(readMount("01_schema.sql"), "01_schema");

  const createdUsers = [];
  for (const user of users) {
    const created = await createUser(keys.serviceRoleKey, user);
    createdUsers.push([user[0], created]);
    console.log(`OK Auth ${created.email}`);
  }

  let bootstrap = readMount("03_bootstrap_profiles_TEMPLATE.sql");
  for (const [placeholder, user] of [...createdUsers].sort((a, b) => b[0].length - a[0].length)) {
    bootstrap = bootstrap.replaceAll(placeholder, user.id);
  }
  await query(bootstrap, "03_bootstrap_profiles");

  for (const file of [
    "04_policies.sql",
    "05_storage.sql",
    "07_fix_authenticated_grants.sql",
    "09_extend_profile_roles.sql",
    "10_role_based_write_policies.sql",
    "11_commercial_packages_cloud.sql",
    "12_operating_context_optional.sql",
    "13_seed_roles_permissions.sql",
    "14_assistant_ai.sql",
  ]) {
    await query(readMount(file), file.replace(".sql", ""));
  }

  const validation = await query(readMount("06_validation_queries.sql"), "06_validation_queries");

  mkdirSync(OUT_DIR, { recursive: true });
  const summary = {
    projectName: PROJECT_NAME,
    projectRef: PROJECT_REF,
    url: `https://${PROJECT_REF}.supabase.co`,
    frontendAnonKey: keys.frontendAnonKey,
    users: createdUsers.map(([, user]) => ({
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      password: user.password,
    })),
    validation,
    generatedAt: new Date().toISOString(),
  };
  const safeSummary = {
    projectName: summary.projectName,
    projectRef: summary.projectRef,
    url: summary.url,
    frontendAnonKey: summary.frontendAnonKey,
    users: summary.users.map(({ password: _password, ...user }) => user),
    generatedAt: summary.generatedAt,
  };
  writeFileSync(resolve(OUT_DIR, `supabase-${PROJECT_NAME}-summary.json`), JSON.stringify(safeSummary, null, 2));
  if (WRITE_CREDENTIALS) {
    writeFileSync(resolve(OUT_DIR, `supabase-${PROJECT_NAME}-credentials.json`), JSON.stringify(summary, null, 2), { mode: 0o600 });
  }
  console.log(JSON.stringify({
    ok: true,
    projectName: PROJECT_NAME,
    projectRef: PROJECT_REF,
    url: summary.url,
    users: summary.users.length,
    summaryFile: `tmp/supabase-${PROJECT_NAME}-summary.json`,
    credentialsFile: WRITE_CREDENTIALS ? `tmp/supabase-${PROJECT_NAME}-credentials.json` : null,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
