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
const env = read(".env.supabase.example");

if (schema && !schema.includes("create table if not exists clients")) errors.push("01_schema.sql no contiene tabla clients.");
if (schema && !schema.includes("id text primary key")) errors.push("01_schema.sql no conserva IDs de dominio como text.");
if (seed && !seed.includes("insert into public.\"companies\"")) errors.push("02_seed_preview.sql no contiene seed de companies.");
if (profiles && !profiles.includes("AUTH_UUID_ADMIN")) warnings.push("03_bootstrap_profiles_TEMPLATE.sql no conserva placeholder AUTH_UUID_ADMIN.");
if (policies && !policies.includes("enable row level security")) errors.push("04_policies.sql no activa RLS.");
if (rolePolicies && !rolePolicies.includes("can_commercial_write")) errors.push("10_role_based_write_policies.sql no contiene permisos comerciales.");
if (rolePolicies && !rolePolicies.includes("can_finance_write")) errors.push("10_role_based_write_policies.sql no contiene permisos financieros.");
if (storage && !storage.includes("project-evidence")) errors.push("05_storage.sql no contiene bucket project-evidence.");
if (validation && !validation.includes("storage.buckets")) errors.push("06_validation_queries.sql no valida buckets.");
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
