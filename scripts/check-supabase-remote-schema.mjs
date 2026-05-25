import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envPath = path.join(root, ".env.local");

function parseEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs.readFileSync(file, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1)];
      })
  );
}

const env = { ...parseEnv(envPath), ...process.env };
const url = String(env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const anonKey = env.VITE_SUPABASE_ANON_KEY;

const requiredTables = [
  "clients",
  "sites",
  "opportunities",
  "proposals",
  "quotes",
  "projects",
  "project_tasks",
  "invoices",
  "payments",
  "accounts_payable",
  "recurring_services",
  "commercial_packages",
  "commercial_package_items",
  "commercial_package_services",
  "quick_quotes",
];

if (!url || !anonKey) {
  console.error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

const results = [];

for (const table of requiredTables) {
  const response = await fetch(`${url}/rest/v1/${table}?select=id&limit=1`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
  });

  let message = "";
  if (!response.ok) {
    message = (await response.text()).slice(0, 240);
  }

  results.push({
    table,
    exists: response.status !== 404,
    readableWithAnon: response.ok,
    status: response.status,
    message,
  });
}

const missing = results.filter((result) => result.status === 404);
const blocked = results.filter((result) => !result.readableWithAnon && result.status !== 404 && result.status !== 401);

console.log(JSON.stringify({
  ok: missing.length === 0 && blocked.length === 0,
  note: "HTTP 401 significa que la tabla existe, pero RLS/grants impiden lectura anonima. Eso es esperable en produccion.",
  results,
}, null, 2));

if (missing.length || blocked.length) {
  process.exit(1);
}
