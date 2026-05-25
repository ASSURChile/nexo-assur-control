import { readFile } from "node:fs/promises";
import { assertProviderConfig, getRuntimeProviderConfig, providerLabel } from "../src/services/providerRegistry.js";

function parseEnvFile(raw = "") {
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    env[key] = rest.join("=");
  }
  return env;
}

async function readOptionalEnvFile(path) {
  try {
    return parseEnvFile(await readFile(path, "utf8"));
  } catch {
    return {};
  }
}

const baseEnv = await readOptionalEnvFile(".env");
const localEnv = await readOptionalEnvFile(".env.local");
const config = getRuntimeProviderConfig({ ...process.env, ...baseEnv, ...localEnv });
const validation = assertProviderConfig(config);

console.log(JSON.stringify({
  ok: validation.ok,
  provider: config.dataProvider,
  providerLabel: providerLabel(config.dataProvider),
  authMode: config.authMode,
  backendSyncEnabled: config.backendSyncEnabled,
  backendConfigured: Boolean(config.backendUrl),
  supabaseConfigured: Boolean(config.supabaseUrl && config.supabaseAnonKey),
  errors: validation.errors,
}, null, 2));

if (!validation.ok) process.exitCode = 1;
