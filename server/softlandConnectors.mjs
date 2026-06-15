const REQUIRED_COMMON = ["SOFTLAND_MODE"];
const REQUIRED_API = ["SOFTLAND_API_BASE_URL", "SOFTLAND_API_AUTH_TYPE"];
const REQUIRED_DB = ["SOFTLAND_DB_TYPE", "SOFTLAND_DB_HOST", "SOFTLAND_DB_NAME", "SOFTLAND_DB_USER"];

const SUPPORTED_MODES = new Set(["api", "database"]);

function env(name, fallback = "") {
  return String(process.env[name] || fallback).trim();
}

function mask(value = "") {
  if (!value) return "";
  if (value.length <= 6) return "***";
  return `${value.slice(0, 3)}***${value.slice(-3)}`;
}

function missingVars(names = []) {
  return names.filter((name) => !env(name));
}

export function getSoftlandConfigStatus() {
  const mode = env("SOFTLAND_MODE", "api").toLowerCase();
  const required = [
    ...REQUIRED_COMMON,
    ...(mode === "database" ? REQUIRED_DB : REQUIRED_API),
  ];
  const missing = missingVars(required);
  const validMode = SUPPORTED_MODES.has(mode);

  return {
    mode,
    validMode,
    configured: validMode && missing.length === 0,
    missing,
    api: {
      baseUrl: env("SOFTLAND_API_BASE_URL"),
      authType: env("SOFTLAND_API_AUTH_TYPE"),
      apiKey: mask(env("SOFTLAND_API_KEY")),
      username: env("SOFTLAND_API_USERNAME") ? "***" : "",
    },
    database: {
      type: env("SOFTLAND_DB_TYPE"),
      host: env("SOFTLAND_DB_HOST"),
      port: env("SOFTLAND_DB_PORT"),
      name: env("SOFTLAND_DB_NAME"),
      user: env("SOFTLAND_DB_USER") ? "***" : "",
      ssl: env("SOFTLAND_DB_SSL", "false"),
      readOnly: env("SOFTLAND_DB_READONLY", "true") !== "false",
    },
    companies: {
      alertaMd: {
        code: env("SOFTLAND_COMPANY_ALERTA_CODE"),
        rut: env("SOFTLAND_COMPANY_ALERTA_RUT"),
      },
      serviciosElectronicos: {
        code: env("SOFTLAND_COMPANY_SERVICIOS_CODE"),
        rut: env("SOFTLAND_COMPANY_SERVICIOS_RUT"),
      },
    },
  };
}

function endpointFor(entity) {
  const configured = env(`SOFTLAND_API_ENDPOINT_${String(entity || "").toUpperCase()}`);
  return configured || `/api/${entity}`;
}

function authHeaders() {
  const type = env("SOFTLAND_API_AUTH_TYPE", "bearer").toLowerCase();
  if (type === "apikey" || type === "api_key") {
    const header = env("SOFTLAND_API_KEY_HEADER", "x-api-key");
    return { [header]: env("SOFTLAND_API_KEY") };
  }
  if (type === "basic") {
    const raw = `${env("SOFTLAND_API_USERNAME")}:${env("SOFTLAND_API_PASSWORD")}`;
    return { Authorization: `Basic ${Buffer.from(raw).toString("base64")}` };
  }
  return { Authorization: `Bearer ${env("SOFTLAND_API_TOKEN") || env("SOFTLAND_API_KEY")}` };
}

async function fetchSoftlandApi({ entity, companyCode, since, limit = 100, dryRun = true } = {}) {
  const baseUrl = env("SOFTLAND_API_BASE_URL").replace(/\/$/, "");
  const path = endpointFor(entity);
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);
  if (companyCode) url.searchParams.set("empresa", companyCode);
  if (since) url.searchParams.set("desde", since);
  if (limit) url.searchParams.set("limit", String(limit));

  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      mode: "api",
      entity,
      companyCode,
      url: url.toString(),
      message: "Dry-run API preparado. No se consulto Softland.",
    };
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      ...authHeaders(),
    },
  });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return {
    ok: response.ok,
    status: response.status,
    mode: "api",
    entity,
    companyCode,
    body,
  };
}

function prepareDatabaseQuery({ entity, companyCode, since, limit = 100 } = {}) {
  const view = env(`SOFTLAND_DB_VIEW_${String(entity || "").toUpperCase()}`);
  if (!view) {
    throw new Error(`Falta SOFTLAND_DB_VIEW_${String(entity || "").toUpperCase()} para mapear ${entity}.`);
  }
  return {
    mode: "database",
    entity,
    companyCode,
    query: `select top (${Number(limit) || 100}) * from ${view} where (@companyCode is null or empresa_codigo = @companyCode) and (@since is null or fecha_actualizacion >= @since)`,
    params: { companyCode: companyCode || null, since: since || null },
  };
}

async function querySoftlandDatabase({ entity, companyCode, since, limit = 100, dryRun = true } = {}) {
  const prepared = prepareDatabaseQuery({ entity, companyCode, since, limit });
  if (dryRun) {
    return {
      ok: true,
      dryRun: true,
      ...prepared,
      message: "Dry-run BD preparado. No se abrio conexion a Softland.",
    };
  }
  return {
    ok: false,
    status: 501,
    ...prepared,
    message: "Conexion directa a BD requiere instalar el driver segun motor Softland: mssql, odbc, mysql2 o pg. No se ejecuta desde frontend.",
  };
}

export async function runSoftlandConnector(options = {}) {
  const status = getSoftlandConfigStatus();
  if (!status.validMode) {
    return { ok: false, status: 400, error: `SOFTLAND_MODE invalido: ${status.mode}` };
  }
  if (!status.configured) {
    return { ok: false, status: 400, error: "Conexion Softland incompleta.", statusConfig: status };
  }
  if (status.mode === "database") return querySoftlandDatabase(options);
  return fetchSoftlandApi(options);
}
