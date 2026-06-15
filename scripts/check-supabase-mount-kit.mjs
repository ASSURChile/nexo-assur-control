import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(".");
const DIR = resolve(ROOT, "supabase", "mount");

const required = [
  "00_README.md",
  "01_schema.sql",
  "02_seed_preview.sql",
  "03_bootstrap_profiles_TEMPLATE.sql",
  "04_policies.sql",
  "10_role_based_write_policies.sql",
  "05_storage.sql",
  "06_validation_queries.sql",
  "07_fix_authenticated_grants.sql",
  "09_extend_profile_roles.sql",
  "11_commercial_packages_cloud.sql",
  "12_operating_context_optional.sql",
  "13_seed_roles_permissions.sql",
  "14_assistant_ai.sql",
  ".env.supabase.example",
];

const errors = [];
const warnings = [];

for (const file of required) {
  if (!existsSync(resolve(DIR, file))) errors.push(`Falta supabase/mount/${file}.`);
}

function read(file) {
  const path = resolve(DIR, file);
  return existsSync(path) ? readFileSync(path, "utf8") : "";
}

const schema = read("01_schema.sql");
const seed = read("02_seed_preview.sql");
const profiles = read("03_bootstrap_profiles_TEMPLATE.sql");
const policies = read("04_policies.sql");
const rolePolicies = read("10_role_based_write_policies.sql");
const storage = read("05_storage.sql");
const validation = read("06_validation_queries.sql");
const roleSeed = read("13_seed_roles_permissions.sql");
const assistantAi = read("14_assistant_ai.sql");
const operatingContext = read("12_operating_context_optional.sql");
const env = read(".env.supabase.example");

if (schema && !schema.includes("create table if not exists clients")) errors.push("01_schema.sql no contiene tabla clients.");
if (schema && !schema.includes("id text primary key")) errors.push("01_schema.sql no conserva IDs de dominio como text.");
if (seed && !seed.includes("insert into public.\"companies\"")) errors.push("02_seed_preview.sql no contiene seed de companies.");
if (profiles && !profiles.includes("AUTH_UUID_ADMIN")) warnings.push("03_bootstrap_profiles_TEMPLATE.sql no conserva placeholder AUTH_UUID_ADMIN.");
for (const placeholder of [
  "AUTH_UUID_GERENCIA",
  "AUTH_UUID_COMERCIAL",
  "AUTH_UUID_JEFE_COMERCIAL",
  "AUTH_UUID_ADMINOPS",
  "AUTH_UUID_MONITOREO",
  "AUTH_UUID_FINANZAS",
]) {
  if (profiles && !profiles.includes(placeholder)) errors.push(`03_bootstrap_profiles_TEMPLATE.sql no contiene ${placeholder}.`);
}
if (policies && !policies.includes("enable row level security")) errors.push("04_policies.sql no activa RLS.");
if (rolePolicies && !rolePolicies.includes("can_commercial_write")) errors.push("10_role_based_write_policies.sql no contiene permisos comerciales.");
if (rolePolicies && !rolePolicies.includes("can_finance_write")) errors.push("10_role_based_write_policies.sql no contiene permisos financieros.");
if (storage && !storage.includes("project-evidence")) errors.push("05_storage.sql no contiene bucket project-evidence.");
if (validation && !validation.includes("storage.buckets")) errors.push("06_validation_queries.sql no valida buckets.");
if (validation && !validation.includes("role_permissions")) errors.push("06_validation_queries.sql no valida role_permissions.");
if (validation && !validation.includes("legal_entities")) errors.push("06_validation_queries.sql no valida legal_entities.");
for (const role of [
  "admin",
  "gerencia",
  "comercial",
  "jefe_comercial",
  "operaciones",
  "administrativo_operaciones",
  "supervisor",
  "tecnico",
  "monitoreo",
  "finanzas",
  "almacen",
  "viewer",
]) {
  if (roleSeed && !roleSeed.includes(`'${role}'`)) errors.push(`13_seed_roles_permissions.sql no contiene rol ${role}.`);
}
for (const moduleId of ["cotizacion_rapida", "paquetes", "finanzas", "almacen", "servicios", "config"]) {
  if (roleSeed && !roleSeed.includes(`'${moduleId}'`)) errors.push(`13_seed_roles_permissions.sql no contiene modulo ${moduleId}.`);
}
if (roleSeed && !roleSeed.includes("'assistant'")) errors.push("13_seed_roles_permissions.sql no contiene modulo assistant.");
for (const table of ["assistant_threads", "assistant_messages", "assistant_tool_calls", "assistant_feedback", "assistant_usage_limits"]) {
  if (assistantAi && !assistantAi.includes(table)) errors.push(`14_assistant_ai.sql no contiene tabla ${table}.`);
}
if (assistantAi && !assistantAi.includes("enable row level security")) errors.push("14_assistant_ai.sql no activa RLS.");
if (operatingContext && !operatingContext.includes("Alerta MD")) errors.push("12_operating_context_optional.sql no siembra Alerta MD.");
if (operatingContext && !operatingContext.includes("Servicios Electronicos")) errors.push("12_operating_context_optional.sql no siembra Servicios Electronicos.");
if (operatingContext && !operatingContext.includes("ASSUR Chile futura")) errors.push("12_operating_context_optional.sql no siembra ASSUR Chile futura.");
if (env && env.includes("TU_SERVICE_ROLE_KEY") && env.includes("VITE_SUPABASE_ANON_KEY")) {
  // ok
} else if (env) {
  errors.push(".env.supabase.example no documenta claves esperadas.");
}

const result = {
  ok: errors.length === 0,
  files: required.length,
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
