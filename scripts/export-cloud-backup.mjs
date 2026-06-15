import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const ENVIRONMENTS = {
  prod: "nexo-assur-supabase-prod-credentials",
  production: "nexo-assur-supabase-prod-credentials",
  staging: "nexo-assur-supabase-staging-credentials",
};

const TABLES = [
  "companies",
  "profiles",
  "roles",
  "role_permissions",
  "profile_permissions",
  "legal_entities",
  "business_units",
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
  "attachments",
  "document_templates",
  "generated_documents",
  "document_versions",
  "activity_events",
  "error_logs",
];

function readKeychain(service) {
  const result = spawnSync("security", ["find-generic-password", "-a", "macmoises", "-s", service, "-w"], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.status !== 0) return null;
  const raw = result.stdout.trim();
  if (/^[0-9a-f]+$/i.test(raw) && raw.length % 2 === 0 && raw.startsWith("7b")) {
    return Buffer.from(raw, "hex").toString("utf8");
  }
  return result.stdout;
}

async function readCredentials() {
  if (process.env.NEXO_CREDENTIALS_FILE) {
    return JSON.parse(await fs.readFile(process.env.NEXO_CREDENTIALS_FILE, "utf8"));
  }

  const service = process.env.NEXO_CREDENTIALS_KEYCHAIN_SERVICE
    || ENVIRONMENTS[String(process.env.BACKUP_ENV || "prod").toLowerCase()];
  if (!service) throw new Error("Ambiente de backup no reconocido. Usa BACKUP_ENV=prod o BACKUP_ENV=staging.");

  const raw = readKeychain(service);
  if (!raw) throw new Error(`No se encontraron credenciales en Keychain para ${service}.`);
  return JSON.parse(raw);
}

async function request(base, anonKey, path, { method = "GET", token, body, headers = {} } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token || anonKey}`,
      "Content-Type": "application/json",
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text().catch(() => "");
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text || response.statusText}`);
  return text ? JSON.parse(text) : [];
}

async function login(base, anonKey, email, password) {
  return request(base, anonKey, "/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
}

async function exportTable(base, anonKey, token, table) {
  const pageSize = 1000;
  const rows = [];
  for (let from = 0; ; from += pageSize) {
    const to = from + pageSize - 1;
    const page = await request(base, anonKey, `/rest/v1/${table}?select=*`, {
      token,
      headers: { Range: `${from}-${to}`, Prefer: "count=exact" },
    });
    rows.push(...page);
    if (!Array.isArray(page) || page.length < pageSize) break;
  }
  return rows;
}

const credentials = await readCredentials();
const base = String(credentials.url || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const anonKey = credentials.frontendAnonKey || process.env.VITE_SUPABASE_ANON_KEY;
const admin = credentials.users?.find((user) => user.email === "admin@assur.cl");
if (!base || !anonKey || !admin?.password) throw new Error("Credenciales incompletas para backup cloud.");

const session = await login(base, anonKey, admin.email, admin.password);
const startedAt = new Date();
const backup = {
  schema: "nexo-assur-cloud-backup-v1",
  environment: process.env.BACKUP_ENV || "prod",
  projectUrl: base,
  exportedAt: startedAt.toISOString(),
  tables: {},
  counts: {},
  warnings: [],
};

for (const table of TABLES) {
  try {
    const rows = await exportTable(base, anonKey, session.access_token, table);
    backup.tables[table] = rows;
    backup.counts[table] = rows.length;
  } catch (error) {
    backup.warnings.push({ table, message: error.message });
  }
}

await fs.mkdir("backups", { recursive: true });
const stamp = startedAt.toISOString().replace(/[:.]/g, "-");
const file = `backups/nexo-assur-${backup.environment}-${stamp}.json`;
await fs.writeFile(file, JSON.stringify(backup, null, 2), "utf8");

console.log(JSON.stringify({
  ok: true,
  file,
  environment: backup.environment,
  tables: Object.keys(backup.tables).length,
  totalRows: Object.values(backup.counts).reduce((sum, count) => sum + count, 0),
  warnings: backup.warnings,
}, null, 2));
