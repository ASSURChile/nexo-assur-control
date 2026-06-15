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

async function request(base, anonKey, path, { method = "GET", token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token || anonKey}`,
      "Content-Type": "application/json",
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text().catch(() => "");
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text || response.statusText}`);
  return data;
}

const environment = String(process.env.ASSISTANT_ENV || "prod").toLowerCase();
const credentials = await readCredentials(environment);
const supabaseUrl = String(credentials.url || process.env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const anonKey = credentials.frontendAnonKey || process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.ASSISTANT_TEST_EMAIL || "admin@assur.cl";
const user = credentials.users?.find((item) => item.email === email) || credentials.users?.[0];
const workerUrl = String(process.env.ASSISTANT_API_URL || process.env.VITE_ASSISTANT_API_URL || "").replace(/\/+$/, "");

if (!workerUrl) throw new Error("Falta ASSISTANT_API_URL o VITE_ASSISTANT_API_URL.");
if (!supabaseUrl || !anonKey || !user?.email || !user?.password) throw new Error("Credenciales incompletas para QA del asistente.");

const health = await fetch(`${workerUrl}/api/assistant/health`).then((r) => r.json());
const unauthorized = await fetch(`${workerUrl}/api/assistant/query`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ message: "Estado del sistema" }),
});

const session = await request(supabaseUrl, anonKey, "/auth/v1/token?grant_type=password", {
  method: "POST",
  body: { email: user.email, password: user.password },
});
const query = await fetch(`${workerUrl}/api/assistant/query`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  },
  body: JSON.stringify({ message: process.env.ASSISTANT_TEST_MESSAGE || "¿Qué requiere atención hoy?" }),
}).then(async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Worker query -> ${response.status}: ${JSON.stringify(data)}`);
  return data;
});

console.log(JSON.stringify({
  ok: true,
  environment,
  workerUrl,
  health,
  unauthorizedStatus: unauthorized.status,
  user: user.email,
  role: query.role,
  toolName: query.toolName,
  used: query.used,
  limit: query.limit,
  answerPreview: String(query.answer || "").slice(0, 240),
}, null, 2));
