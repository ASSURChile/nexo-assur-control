import { readFileSync, existsSync } from "node:fs";

const files = {
  prodEnv: ".env.production.example",
  stagingEnv: ".env.staging.example",
  schema: "supabase/schema.sql",
  policies: "supabase/policies.sql",
  storage: "supabase/storage.sql",
  appClient: "src/services/supabaseAppClient.js",
  attachmentService: "src/services/attachmentService.js",
  documentService: "src/services/documentService.js",
  activityService: "src/services/activityEventService.js",
  healthService: "src/services/healthService.js",
  app: "src/App.jsx",
  opsDoc: "docs/production-operations-runbook.md",
  bootstrapProfiles: "supabase/mount/03_bootstrap_profiles_TEMPLATE.sql",
  roleSeed: "supabase/mount/13_seed_roles_permissions.sql",
  assistantAi: "supabase/mount/14_assistant_ai.sql",
  operatingContext: "supabase/mount/12_operating_context_optional.sql",
};

const errors = [];
const warnings = [];

function read(key) {
  const file = files[key];
  if (!existsSync(file)) {
    errors.push(`Falta ${file}.`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function mustInclude(text, needle, message) {
  if (!text.includes(needle)) errors.push(message);
}

function mustNotInclude(text, needle, message) {
  if (text.includes(needle)) errors.push(message);
}

const prodEnv = read("prodEnv");
const stagingEnv = read("stagingEnv");
const schema = read("schema");
const policies = read("policies");
const storage = read("storage");
const appClient = read("appClient");
const attachmentService = read("attachmentService");
const documentService = read("documentService");
const activityService = read("activityService");
const healthService = read("healthService");
const app = read("app");
const opsDoc = read("opsDoc");
const bootstrapProfiles = read("bootstrapProfiles");
const roleSeed = read("roleSeed");
const assistantAi = read("assistantAi");
const operatingContext = read("operatingContext");

mustInclude(prodEnv, "VITE_DATA_PROVIDER=supabase_normalized", "Producción debe usar Supabase normalizado.");
mustInclude(prodEnv, "VITE_AUTH_MODE=supabase", "Producción debe usar Supabase Auth.");
mustInclude(stagingEnv, "VITE_DATA_PROVIDER=supabase_normalized", "Staging debe probar Supabase normalizado.");
mustInclude(stagingEnv, "VITE_AUTH_MODE=supabase", "Staging debe probar Supabase Auth.");
mustNotInclude(prodEnv, "SUPABASE_SERVICE_ROLE_KEY=", "El ejemplo frontend productivo no debe exponer service role.");
mustNotInclude(stagingEnv, "SUPABASE_SERVICE_ROLE_KEY=", "El ejemplo frontend staging no debe exponer service role.");

for (const table of [
  "attachments",
  "document_templates",
  "generated_documents",
  "document_versions",
  "activity_events",
  "error_logs",
  "roles",
  "role_permissions",
  "profile_permissions",
  "legal_entities",
  "business_units",
]) {
  mustInclude(schema, `create table if not exists ${table}`, `Falta tabla ${table}.`);
  mustInclude(policies, `alter table ${table} enable row level security`, `${table} debe tener RLS.`);
}

for (const bucket of ["project-evidence", "project-reports", "signatures", "service-documents"]) {
  mustInclude(storage, bucket, `Falta bucket Storage ${bucket}.`);
}

mustInclude(appClient, "Authorization", "Cliente Supabase debe enviar Authorization.");
mustInclude(attachmentService, "storageUpload", "Adjuntos deben usar Supabase Storage.");
mustInclude(documentService, "document_versions", "Documentos deben versionarse.");
mustInclude(activityService, "activity_events", "Actividad debe persistir en activity_events.");
mustInclude(healthService, "error_logs", "Salud debe registrar/leer error_logs.");
mustInclude(app, "logFrontendError", "App debe registrar errores frontend.");
mustInclude(opsDoc, "Producción", "Runbook debe documentar producción.");
mustInclude(opsDoc, "Staging", "Runbook debe documentar staging.");
mustInclude(opsDoc, "Backup", "Runbook debe documentar backups.");
mustInclude(bootstrapProfiles, "AUTH_UUID_GERENCIA", "Bootstrap debe incluir usuario gerencia.");
mustInclude(bootstrapProfiles, "AUTH_UUID_COMERCIAL", "Bootstrap debe incluir usuario comercial.");
mustInclude(bootstrapProfiles, "AUTH_UUID_FINANZAS", "Bootstrap debe incluir usuario finanzas.");
mustInclude(roleSeed, "role_permissions", "Seed debe poblar role_permissions.");
mustInclude(roleSeed, "'gestionar_materiales'", "Seed debe incluir permiso gestionar_materiales.");
mustInclude(roleSeed, "'gestionar_costos'", "Seed debe incluir permiso gestionar_costos.");
mustInclude(roleSeed, "'assistant'", "Seed debe incluir modulo assistant.");
for (const table of ["assistant_threads", "assistant_messages", "assistant_tool_calls", "assistant_feedback", "assistant_usage_limits"]) {
  mustInclude(assistantAi, `create table if not exists public.${table}`, `Falta tabla ${table} del asistente.`);
  mustInclude(assistantAi, `alter table public.${table} enable row level security`, `${table} debe tener RLS.`);
}
mustInclude(prodEnv, "VITE_ASSISTANT_API_URL", "Producción debe documentar VITE_ASSISTANT_API_URL.");
mustInclude(stagingEnv, "VITE_ASSISTANT_API_URL", "Staging debe documentar VITE_ASSISTANT_API_URL.");
mustInclude(operatingContext, "Alerta MD", "Contexto operativo debe incluir Alerta MD.");
mustInclude(operatingContext, "Servicios Electronicos", "Contexto operativo debe incluir Servicios Electronicos.");

if (prodEnv.includes("TU-PROYECTO.supabase.co")) warnings.push("Producción example sigue con placeholder; configurar valor real en Cloudflare.");
if (stagingEnv.includes("TU-STAGING.supabase.co")) warnings.push("Staging example sigue con placeholder; configurar valor real en Cloudflare.");

const result = { ok: errors.length === 0, warnings, errors };
console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
