import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { keyToName } from "../server/collections.mjs";
import { buildSupabaseSeedPayload, validateSupabaseSeedPayload } from "../src/services/supabaseTransformService.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA_FILE = process.env.ASSUR_DATA_FILE || resolve(ROOT, "server", "data", "app-data.json");
const OUT_FILE = process.argv.includes("--write")
  ? resolve(ROOT, "supabase", "seed.preview.json")
  : null;

function parseArgs() {
  const args = new Map();
  for (const arg of process.argv.slice(2)) {
    if (!arg.startsWith("--") || !arg.includes("=")) continue;
    const [key, value] = arg.slice(2).split("=");
    args.set(key, value);
  }
  return args;
}

async function loadLocalDomainData() {
  const raw = await readFile(DATA_FILE, "utf8");
  const technical = JSON.parse(raw);
  return Object.fromEntries(Object.entries(technical).map(([key, value]) => [keyToName(key), value]));
}

function countRows(payload) {
  return Object.fromEntries(Object.entries(payload).map(([table, rows]) => [table, Array.isArray(rows) ? rows.length : 0]));
}

const args = parseArgs();
const data = await loadLocalDomainData();
const payload = buildSupabaseSeedPayload(data, {
  companyName: args.get("company") || "ASSUR Chile",
  companyRut: args.get("rut") || null,
});
const validation = validateSupabaseSeedPayload(payload);
const summary = {
  ok: validation.ok,
  source: DATA_FILE,
  counts: countRows(payload),
  warnings: validation.warnings,
  errors: validation.errors,
};

if (OUT_FILE) {
  await mkdir(dirname(OUT_FILE), { recursive: true });
  await writeFile(OUT_FILE, JSON.stringify(payload, null, 2));
  summary.output = OUT_FILE;
}

console.log(JSON.stringify(summary, null, 2));

if (!validation.ok) {
  process.exitCode = 1;
}
