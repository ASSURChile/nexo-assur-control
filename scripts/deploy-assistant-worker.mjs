import fs from "node:fs/promises";
import { spawnSync } from "node:child_process";

const ENVIRONMENTS = {
  prod: "nexo-assur-supabase-prod-credentials",
  production: "nexo-assur-supabase-prod-credentials",
  staging: "nexo-assur-supabase-staging-credentials",
};

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

async function readCredentials(environment) {
  if (process.env.NEXO_CREDENTIALS_FILE) {
    return JSON.parse(await fs.readFile(process.env.NEXO_CREDENTIALS_FILE, "utf8"));
  }
  const service = process.env.NEXO_CREDENTIALS_KEYCHAIN_SERVICE || ENVIRONMENTS[environment];
  const raw = readKeychain(service);
  if (!raw) throw new Error(`No se encontraron credenciales en Keychain para ${service}.`);
  return JSON.parse(raw);
}

const environment = String(process.env.ASSISTANT_ENV || "prod").toLowerCase();
const credentials = await readCredentials(environment);
const supabaseUrl = String(credentials.url || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const anonKey = credentials.frontendAnonKey || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !anonKey) throw new Error("Credenciales Supabase incompletas para desplegar asistente.");

const suffix = environment === "staging" ? "staging" : "prod";
const workerName = process.env.ASSISTANT_WORKER_NAME || `nexo-assur-assistant-${suffix}`;
const allowedOrigin = process.env.ASSISTANT_ALLOWED_ORIGIN || "https://assur-control.pages.dev,http://127.0.0.1:5173,http://127.0.0.1:5174,http://localhost:5173,http://localhost:5174";
const model = process.env.ASSISTANT_MODEL || "@cf/meta/llama-3.1-8b-instruct";

await fs.mkdir("tmp", { recursive: true });
const configPath = `tmp/wrangler.assistant.${suffix}.jsonc`;
const config = {
  $schema: "node_modules/wrangler/config-schema.json",
  name: workerName,
  main: "../worker/assistant/index.js",
  compatibility_date: "2026-06-05",
  observability: { enabled: true, head_sampling_rate: 1 },
  ai: { binding: "AI" },
  vars: {
    SUPABASE_URL: supabaseUrl,
    SUPABASE_ANON_KEY: anonKey,
    ALLOWED_ORIGIN: allowedOrigin,
    ASSISTANT_MODEL: model,
  },
};
await fs.writeFile(configPath, JSON.stringify(config, null, 2), "utf8");

const result = spawnSync("npx", ["wrangler", "deploy", "--config", configPath], {
  encoding: "utf8",
  stdio: "pipe",
  maxBuffer: 20 * 1024 * 1024,
});

const output = `${result.stdout || ""}${result.stderr || ""}`;
if (result.status !== 0) {
  console.error(output);
  process.exit(result.status || 1);
}

const workerUrl = output.match(/https:\/\/[^\s]+\.workers\.dev/)?.[0] || `https://${workerName}.workers.dev`;
console.log(JSON.stringify({
  ok: true,
  environment,
  workerName,
  workerUrl,
  model,
  configPath,
  note: "Config temporal generado en tmp/. No contiene service_role ni credenciales privadas.",
}, null, 2));
