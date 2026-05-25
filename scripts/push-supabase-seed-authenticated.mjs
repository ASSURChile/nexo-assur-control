import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createSupabaseNormalizedRestService, TABLE_ORDER } from "../src/services/supabaseNormalizedRestService.js";

const ROOT = resolve(".");
const SEED_FILE = resolve(ROOT, "supabase", "seed.preview.json");

async function readEnvFile(path) {
  try {
    const raw = await readFile(path, "utf8");
    return Object.fromEntries(raw.split(/\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !line.startsWith("#")).map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index), line.slice(index + 1)];
    }));
  } catch {
    return {};
  }
}

function requireValue(source, name) {
  const value = source[name] || process.env[name];
  if (!value) throw new Error(`Falta variable ${name}.`);
  return value;
}

function parseTables() {
  const arg = process.argv.find((item) => item.startsWith("--tables="));
  if (!arg) return TABLE_ORDER.filter((table) => table !== "companies");
  return arg.slice("--tables=".length).split(",").map((item) => item.trim()).filter(Boolean);
}

async function login({ url, anonKey, email, password }) {
  const response = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.msg || body.message || body.error_description || "No se pudo autenticar en Supabase.");
  if (!body.access_token) throw new Error("Supabase no devolvió access_token.");
  return body.access_token;
}

const env = { ...(await readEnvFile(resolve(ROOT, ".env"))), ...(await readEnvFile(resolve(ROOT, ".env.local"))), ...process.env };
const url = requireValue(env, "VITE_SUPABASE_URL");
const anonKey = requireValue(env, "VITE_SUPABASE_ANON_KEY");
const email = env.SUPABASE_LOGIN_EMAIL || "admin@assur.cl";
const password = requireValue(env, "SUPABASE_LOGIN_PASSWORD");
const payload = JSON.parse(await readFile(SEED_FILE, "utf8"));
const tables = parseTables();
const accessToken = await login({ url, anonKey, email, password });
const service = createSupabaseNormalizedRestService({
  url,
  anonKey,
  getAccessToken: () => accessToken,
});
const result = await service.upsertSeedPayload(payload, { tables });

console.log(JSON.stringify({
  ok: true,
  mode: "authenticated-apply",
  user: email,
  seedFile: SEED_FILE,
  result,
}, null, 2));
