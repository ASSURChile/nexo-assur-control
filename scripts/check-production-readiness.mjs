import { readFile } from "node:fs/promises";

const files = [
  ".env.example",
  ".env.production.example",
  ".env.staging.example",
  "public/_redirects",
  "public/_headers",
  "vercel.json",
  "docs/controlled-mvp-publication.md",
  "docs/production-operations-runbook.md",
  "src/services/authService.js",
  "src/services/bootstrapService.js",
  "src/views/LoginScreen.jsx",
  "src/services/backupService.js",
  "server/index.mjs",
  "src/services/providerRegistry.js",
  "src/services/supabaseNormalizedRestService.js",
  "src/services/supabaseNormalizedSyncService.js",
  "scripts/push-supabase-seed.mjs",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const contents = new Map(await Promise.all(files.map(async (file) => [file, await readFile(file, "utf8")])));

const env = contents.get(".env.example");
const prodEnv = contents.get(".env.production.example");
const stagingEnv = contents.get(".env.staging.example");
const redirects = contents.get("public/_redirects");
const headers = contents.get("public/_headers");
const vercel = contents.get("vercel.json");
const publicationDoc = contents.get("docs/controlled-mvp-publication.md");
const opsDoc = contents.get("docs/production-operations-runbook.md");
const auth = contents.get("src/services/authService.js");
const bootstrap = contents.get("src/services/bootstrapService.js");
const login = contents.get("src/views/LoginScreen.jsx");
const backup = contents.get("src/services/backupService.js");
const server = contents.get("server/index.mjs");
const provider = contents.get("src/services/providerRegistry.js");
const normalized = contents.get("src/services/supabaseNormalizedRestService.js");
const normalizedSync = contents.get("src/services/supabaseNormalizedSyncService.js");
const pushSeed = contents.get("scripts/push-supabase-seed.mjs");

assert(env.includes("VITE_AUTH_MODE=demo"), "Falta documentar VITE_AUTH_MODE.");
assert(env.includes("VITE_DATA_PROVIDER=local"), "Falta documentar VITE_DATA_PROVIDER.");
assert(env.includes("SUPABASE_SERVICE_ROLE_KEY="), "Falta variable server-side SUPABASE_SERVICE_ROLE_KEY.");
assert(prodEnv.includes("VITE_DATA_PROVIDER=supabase_normalized"), "El ejemplo productivo debe usar Supabase normalizado.");
assert(prodEnv.includes("VITE_AUTH_MODE=supabase"), "El ejemplo productivo debe usar Supabase Auth.");
assert(!prodEnv.includes("SUPABASE_SERVICE_ROLE_KEY="), "El ejemplo productivo frontend no debe exponer SUPABASE_SERVICE_ROLE_KEY.");
assert(stagingEnv.includes("VITE_DATA_PROVIDER=supabase_normalized"), "El ejemplo staging debe usar Supabase normalizado.");
assert(stagingEnv.includes("VITE_AUTH_MODE=supabase"), "El ejemplo staging debe usar Supabase Auth.");
assert(!stagingEnv.includes("SUPABASE_SERVICE_ROLE_KEY="), "El ejemplo staging frontend no debe exponer SUPABASE_SERVICE_ROLE_KEY.");
assert(redirects.includes("/* /index.html 200"), "Cloudflare Pages debe tener fallback SPA en public/_redirects.");
assert(headers.includes("X-Frame-Options: DENY"), "Cloudflare Pages debe publicar headers basicos de seguridad.");
assert(publicationDoc.includes("Cloudflare Pages"), "La guia de publicacion debe priorizar Cloudflare Pages.");
assert(publicationDoc.includes("assur-control.pages.dev"), "La guia debe documentar la URL gratuita esperada.");
assert(opsDoc.includes("Producción") && opsDoc.includes("Staging"), "Runbook debe documentar ambientes.");
assert(vercel.includes('"buildCommand": "npm run build"'), "vercel.json debe usar npm run build.");
assert(vercel.includes('"outputDirectory": "dist"'), "vercel.json debe publicar dist.");
assert(auth.includes("DEMO_AUTH_ENABLED"), "Auth no tiene interruptor de modo demo.");
assert(bootstrap.includes("DEMO_AUTH_ENABLED"), "Bootstrap no respeta modo demo/Supabase.");
assert(login.includes("DEMO_AUTH_ENABLED"), "Login no oculta accesos demo por modo.");
assert(!backup.includes("usuarios:repo.usuarios"), "Backup exporta usuarios/passwords.");
assert(server.includes("delete clone.af_session"), "Backend no elimina sesión en backup seguro.");
assert(server.includes("password"), "Backend no filtra passwords en backup seguro.");
assert(provider.includes("supabase_normalized"), "Provider registry no contempla Supabase normalizado.");
assert(normalized.includes("serviceRoleKey"), "Servicio normalizado no separa service role server-side.");
assert(!normalized.includes("import.meta.env"), "Servicio normalizado no debe leer env frontend directamente.");
assert(normalizedSync.includes('table !== "companies"'), "El frontend no debe intentar escribir companies bajo RLS.");
assert(pushSeed.includes("SUPABASE_SERVICE_ROLE_KEY"), "Push de seed debe usar service role solo desde script/backend.");

console.log("Production readiness checks OK");
