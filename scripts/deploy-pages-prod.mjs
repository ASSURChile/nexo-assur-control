import { spawnSync } from "node:child_process";

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

const raw = readKeychain("nexo-assur-supabase-prod-credentials");
if (!raw) throw new Error("No se encontraron credenciales productivas en Keychain.");
const credentials = JSON.parse(raw);
const supabaseUrl = String(credentials.url || "").replace(/\/+$/, "");
const anonKey = credentials.frontendAnonKey;
const assistantUrl = process.env.VITE_ASSISTANT_API_URL || "https://nexo-assur-assistant-prod.nexo-assur.workers.dev";
if (!supabaseUrl || !anonKey || !assistantUrl) throw new Error("Faltan variables productivas para Pages.");

const build = spawnSync("npm", ["run", "build"], {
  stdio: "inherit",
  env: {
    ...process.env,
    VITE_DATA_PROVIDER: "supabase_normalized",
    VITE_AUTH_MODE: "supabase",
    VITE_SUPABASE_URL: supabaseUrl,
    VITE_SUPABASE_ANON_KEY: anonKey,
    VITE_ASSISTANT_API_URL: assistantUrl,
    VITE_BACKEND_SYNC_ENABLED: "false",
  },
});
if (build.status !== 0) process.exit(build.status || 1);

const deploy = spawnSync("npx", ["wrangler", "pages", "deploy", "dist", "--project-name", "assur-control", "--branch", "main"], {
  stdio: "inherit",
  env: process.env,
});
if (deploy.status !== 0) process.exit(deploy.status || 1);
