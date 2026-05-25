import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { TABLE_ORDER } from "../src/services/supabaseNormalizedRestService.js";

const ROOT = resolve(".");
const SEED_JSON = resolve(ROOT, "supabase", "seed.preview.json");
const OUT_SQL = resolve(ROOT, "supabase", "seed.preview.sql");

const JSONB_COLUMNS = new Set(["metadata", "value", "before_data", "after_data"]);

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlValue(column, value) {
  if (value === null || value === undefined || value === "") return "null";
  if (JSONB_COLUMNS.has(column) || typeof value === "object") return `${sqlString(JSON.stringify(value))}::jsonb`;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return sqlString(value);
}

function uniqueColumns(rows) {
  const cols = [];
  const seen = new Set();
  for (const row of rows) {
    for (const col of Object.keys(row)) {
      if (seen.has(col)) continue;
      seen.add(col);
      cols.push(col);
    }
  }
  return cols;
}

function tableInsert(table, rows) {
  const safeRows = dedupeRowsById(rows || []);
  if (!safeRows.length) return `-- ${table}: sin registros\n`;
  const cols = uniqueColumns(safeRows);
  const values = safeRows.map((row) => `  (${cols.map((col) => sqlValue(col, row[col])).join(", ")})`).join(",\n");
  const updateCols = cols.filter((col) => col !== "id");
  const conflict = cols.includes("id")
    ? `\non conflict (id) do update set\n${updateCols.map((col) => `  ${quoteIdent(col)} = excluded.${quoteIdent(col)}`).join(",\n")};`
    : ";";
  return [
    `-- ${table}: ${safeRows.length} registro(s)`,
    `insert into public.${quoteIdent(table)} (${cols.map(quoteIdent).join(", ")})`,
    `values`,
    values + conflict,
    "",
  ].join("\n");
}

function dedupeRowsById(rows) {
  const byId = new Map();
  const withoutId = [];
  for (const row of rows) {
    if (!row?.id) {
      withoutId.push(row);
      continue;
    }
    byId.set(row.id, row);
  }
  return [...withoutId, ...byId.values()];
}

const payload = JSON.parse(await readFile(SEED_JSON, "utf8"));
const lines = [
  "-- Seed preview generado para ASSUR Control.",
  "-- Recomendado: ejecutar despues de supabase/schema.sql y antes de policies.sql si se usa service role.",
  "-- Revisar datos antes de usar en produccion.",
  "begin;",
  "",
];

for (const table of TABLE_ORDER) {
  lines.push(tableInsert(table, payload[table] || []));
}

lines.push("commit;", "");

await mkdir(dirname(OUT_SQL), { recursive: true });
await writeFile(OUT_SQL, lines.join("\n"));

console.log(JSON.stringify({
  ok: true,
  input: SEED_JSON,
  output: OUT_SQL,
  tables: Object.fromEntries(TABLE_ORDER.map((table) => [table, payload[table]?.length || 0])),
}, null, 2));
