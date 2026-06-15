import { readFileSync } from "node:fs";

const schema = readFileSync("supabase/schema.sql", "utf8");
const policies = readFileSync("supabase/policies.sql", "utf8");
const storage = readFileSync("supabase/storage.sql", "utf8");
const profileTemplate = readFileSync("supabase/bootstrap-profiles.template.sql", "utf8");

const errors = [];
const warnings = [];

const domainTables = [
  "clients",
  "sites",
  "opportunities",
  "proposals",
  "quote_templates",
  "quotes",
  "commercial_packages",
  "commercial_package_items",
  "commercial_package_services",
  "quick_quotes",
  "projects",
  "project_tasks",
  "technicians",
  "contractors",
  "materials",
  "material_requests",
  "material_request_items",
  "time_entries",
  "field_clock_events",
  "incidents",
  "expenses",
  "billing_milestones",
  "invoices",
  "payments",
  "accounts_payable",
  "recurring_services",
  "monitoring_protocols",
  "service_contacts",
  "installed_assets",
  "service_events",
  "service_billing_expectations",
  "audit_logs",
  "sync_logs",
  "legal_entities",
  "business_units",
  "roles",
  "role_permissions",
  "profile_permissions",
  "attachments",
  "document_templates",
  "generated_documents",
  "document_versions",
  "activity_events",
  "error_logs",
];

function tableBlock(table) {
  const match = schema.match(new RegExp(`create table if not exists ${table} \\(([\\s\\S]*?)\\n\\);`, "m"));
  return match?.[1] || "";
}

for (const table of domainTables) {
  const block = tableBlock(table);
  if (!block) {
    errors.push(`No existe tabla ${table} en supabase/schema.sql.`);
    continue;
  }
  if (!block.includes("id text primary key")) {
    errors.push(`${table}.id debe ser text para preservar IDs de dominio/locales.`);
  }
  if (!policies.includes(`alter table ${table} enable row level security`)) {
    errors.push(`${table} no tiene RLS habilitado en policies.sql.`);
  }
}

for (const table of ["companies", "profiles"]) {
  const block = tableBlock(table);
  if (!block) errors.push(`No existe tabla ${table}.`);
}

if (!tableBlock("companies").includes("id uuid primary key")) errors.push("companies.id debe mantenerse uuid.");
if (!tableBlock("profiles").includes("id uuid primary key")) errors.push("profiles.id debe mantenerse uuid para enlazar con auth.users.id.");
if (!schema.includes("create or replace function public.touch_updated_at()")) errors.push("Falta función touch_updated_at.");
if (!schema.includes("idx_profiles_company_email")) errors.push("Falta índice único profiles(company_id, email).");
if (!schema.includes("idx_service_billing_unique_month")) errors.push("Falta índice único para facturación esperada mensual.");
if (!policies.includes("public.current_company_id()")) errors.push("Policies no definen current_company_id().");
if (!policies.includes("public.can_manage()")) errors.push("Policies no definen can_manage().");
if (!storage.includes("project-evidence") || !storage.includes("service-documents")) errors.push("Storage no define buckets esperados.");
if (!profileTemplate.includes("AUTH_UUID_ADMIN")) warnings.push("Template de perfiles no conserva placeholders AUTH_UUID_*.");

const result = {
  ok: errors.length === 0,
  domainTables: domainTables.length,
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
