import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createSupabaseNormalizedRestService, TABLE_ORDER } from "../src/services/supabaseNormalizedRestService.js";

const ROOT = resolve(".");
const SEED_FILE = resolve(ROOT, "supabase", "seed.preview.json");
const dryRun = !process.argv.includes("--apply");

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Falta variable ${name}.`);
  return value;
}

function parseTables() {
  const arg = process.argv.find((item) => item.startsWith("--tables="));
  if (!arg) return TABLE_ORDER;
  return arg.slice("--tables=".length).split(",").map((item) => item.trim()).filter(Boolean);
}

const payload = JSON.parse(await readFile(SEED_FILE, "utf8"));
const tables = parseTables();
const summary = Object.fromEntries(tables.map((table) => [table, Array.isArray(payload[table]) ? payload[table].length : 0]));

if (dryRun) {
  console.log(JSON.stringify({
    ok: true,
    mode: "dry-run",
    message: "No se escribió en Supabase. Usa --apply para ejecutar.",
    seedFile: SEED_FILE,
    tables: summary,
  }, null, 2));
  process.exit(0);
}

const service = createSupabaseNormalizedRestService({
  url: requireEnv("SUPABASE_URL"),
  serviceRoleKey: requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
});

const result = await service.upsertSeedPayload(payload, { tables });
console.log(JSON.stringify({
  ok: true,
  mode: "apply",
  seedFile: SEED_FILE,
  result,
}, null, 2));
