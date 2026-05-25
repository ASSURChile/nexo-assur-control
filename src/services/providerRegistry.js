export const DATA_PROVIDERS = {
  local: "local",
  backend: "backend",
  supabaseCollections: "supabase_collections",
  supabaseNormalized: "supabase_normalized",
};

export const INTEGRATION_PROVIDERS = {
  softlandCsv: "softland_csv",
  softlandApi: "softland_api",
  customApi: "custom_api",
};

export function getRuntimeProviderConfig(env = import.meta.env || {}) {
  return {
    dataProvider: env.VITE_DATA_PROVIDER || DATA_PROVIDERS.local,
    authMode: env.VITE_AUTH_MODE || "demo",
    backendUrl: env.VITE_ASSUR_BACKEND_URL || "http://127.0.0.1:8787",
    backendSyncEnabled: String(env.VITE_BACKEND_SYNC_ENABLED || "").toLowerCase() === "true",
    supabaseUrl: env.VITE_SUPABASE_URL || "",
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || "",
  };
}

export function assertProviderConfig(config) {
  const errors = [];
  if (!Object.values(DATA_PROVIDERS).includes(config.dataProvider)) {
    errors.push(`Proveedor de datos no soportado: ${config.dataProvider}`);
  }
  if (config.dataProvider === DATA_PROVIDERS.backend && !config.backendUrl) {
    errors.push("Falta VITE_ASSUR_BACKEND_URL para proveedor backend.");
  }
  if (config.dataProvider.startsWith("supabase") && (!config.supabaseUrl || !config.supabaseAnonKey)) {
    errors.push("Faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY para proveedor Supabase.");
  }
  if (config.authMode === "supabase" && (!config.supabaseUrl || !config.supabaseAnonKey)) {
    errors.push("Auth Supabase requiere VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }
  if (config.backendSyncEnabled && !config.backendUrl) {
    errors.push("Backend sync requiere VITE_ASSUR_BACKEND_URL.");
  }
  return { ok: errors.length === 0, errors };
}

export function shouldUseBackendSync(config = getRuntimeProviderConfig()) {
  return config.dataProvider === DATA_PROVIDERS.backend || config.backendSyncEnabled;
}

export function providerLabel(provider) {
  const labels = {
    [DATA_PROVIDERS.local]: "Local navegador",
    [DATA_PROVIDERS.backend]: "Backend local/API",
    [DATA_PROVIDERS.supabaseCollections]: "Supabase JSONB transitorio",
    [DATA_PROVIDERS.supabaseNormalized]: "Supabase normalizado",
  };
  return labels[provider] || provider;
}
