import fs from "node:fs/promises";

async function readEnv(path) {
  try {
    const raw = await fs.readFile(path, "utf8");
    return Object.fromEntries(
      raw.split(/\n/)
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        })
    );
  } catch {
    return {};
  }
}

async function readJson(path) {
  if (!path) return null;
  return JSON.parse(await fs.readFile(path, "utf8"));
}

const env = { ...(await readEnv(".env.local")), ...process.env };
const credentials = await readJson(env.NEXO_CREDENTIALS_FILE);
const base = String(env.VITE_SUPABASE_URL || credentials?.url || "").replace(/\/+$/, "");
const anonKey = env.VITE_SUPABASE_ANON_KEY || credentials?.frontendAnonKey;
const mode = env.QA_MODE || "write";
const companyId = "00000000-0000-0000-0000-000000000001";

if (!base || !anonKey) throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.");

const qaIds = {
  attachment: "qa-hardening-attachment",
  generatedDocument: "qa-hardening-document",
  documentVersion: "qa-hardening-document-v1",
  activityEvent: "qa-hardening-activity",
  errorLog: "qa-hardening-error",
  template: "qa-hardening-template",
};
const bucket = "project-evidence";
const storagePath = `${companyId}/qa-hardening/qa-hardening-check.txt`;

async function request(path, { method = "GET", token, body, headers = {}, prefer = "return=representation" } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token || anonKey}`,
      ...(body instanceof Blob || typeof body === "string" ? {} : { "Content-Type": "application/json" }),
      ...(prefer ? { Prefer: prefer } : {}),
      ...headers,
    },
    body: body == null || body instanceof Blob || typeof body === "string" ? body : JSON.stringify(body),
  });
  const text = await response.text().catch(() => "");
  if (!response.ok) throw new Error(`${method} ${path} -> ${response.status}: ${text || response.statusText}`);
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function login(email, password) {
  const auth = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
    prefer: null,
  });
  return auth;
}

async function profileFor(email, token) {
  const rows = await request(`/rest/v1/profiles?select=id,email,role,active,company_id&email=eq.${encodeURIComponent(email)}`, { token });
  return Array.isArray(rows) ? rows[0] : null;
}

const users = credentials?.users?.length
  ? credentials.users
  : [{ email: env.SUPABASE_LOGIN_EMAIL || "admin@assur.cl", password: env.SUPABASE_LOGIN_PASSWORD }];

const roleResults = [];
let adminSession = null;
let adminProfile = null;

for (const user of users) {
  if (!user.password) continue;
  const session = await login(user.email, user.password);
  const profile = await profileFor(user.email, session.access_token);
  roleResults.push({
    email: user.email,
    authOk: Boolean(session.access_token),
    role: profile?.role || null,
    active: profile?.active === true,
    companyOk: profile?.company_id === companyId,
  });
  if (user.email === "admin@assur.cl") {
    adminSession = session;
    adminProfile = profile;
  }
}

if (!adminSession?.access_token || !adminProfile?.id) throw new Error("No se pudo autenticar admin para QA cloud.");

const rolePermissionCounts = await request("/rest/v1/role_permissions?select=role_id&allowed=eq.true", {
  token: adminSession.access_token,
});

let writeResults = null;
if (mode !== "readonly") {
  await request(`/storage/v1/object/${bucket}/${storagePath}`, {
    method: "POST",
    token: adminSession.access_token,
    body: `QA hardening ${new Date().toISOString()}`,
    headers: {
      "Content-Type": "text/plain",
      "x-upsert": "true",
    },
    prefer: null,
  });

  const signedUrl = await request(`/storage/v1/object/sign/${bucket}/${storagePath}`, {
    method: "POST",
    token: adminSession.access_token,
    body: { expiresIn: 120 },
    prefer: null,
  });

  const template = await request("/rest/v1/document_templates?on_conflict=id", {
    method: "POST",
    token: adminSession.access_token,
    body: [{
      id: qaIds.template,
      company_id: companyId,
      name: "QA CLOUD Plantilla hardening",
      document_type: "cotizacion",
      status: "Activo",
      template_html: "<article><h1>QA CLOUD</h1></article>",
      metadata: { qa: true },
    }],
  });

  const attachment = await request("/rest/v1/attachments?on_conflict=id", {
    method: "POST",
    token: adminSession.access_token,
    body: [{
      id: qaIds.attachment,
      company_id: companyId,
      entity_type: "quote",
      entity_id: "qa-flujo-cotizacion",
      bucket,
      storage_path: storagePath,
      file_name: "qa-hardening-check.txt",
      mime_type: "text/plain",
      file_size: 64,
      document_type: "evidencia",
      uploaded_by: adminProfile.id,
      metadata: { qa: true },
    }],
  });

  const generated = await request("/rest/v1/generated_documents?on_conflict=id", {
    method: "POST",
    token: adminSession.access_token,
    body: [{
      id: qaIds.generatedDocument,
      company_id: companyId,
      template_id: qaIds.template,
      attachment_id: qaIds.attachment,
      entity_type: "quote",
      entity_id: "qa-flujo-cotizacion",
      document_type: "cotizacion",
      status: "Generado",
      generated_by: adminProfile.id,
      generated_at: new Date().toISOString(),
      metadata: { qa: true },
    }],
  });

  const version = await request("/rest/v1/document_versions?on_conflict=id", {
    method: "POST",
    token: adminSession.access_token,
    body: [{
      id: qaIds.documentVersion,
      company_id: companyId,
      generated_document_id: qaIds.generatedDocument,
      version_number: 1,
      attachment_id: qaIds.attachment,
      content_html: "<article><h1>QA CLOUD documento editable</h1></article>",
      created_by: adminProfile.id,
      metadata: { qa: true },
    }],
  });

  const event = await request("/rest/v1/activity_events?on_conflict=id", {
    method: "POST",
    token: adminSession.access_token,
    body: [{
      id: qaIds.activityEvent,
      company_id: companyId,
      actor_id: adminProfile.id,
      entity_type: "quote",
      entity_id: "qa-flujo-cotizacion",
      action: "qa_hardening",
      summary: "QA CLOUD valida trazabilidad documental.",
      metadata: { qa: true },
    }],
  });

  const error = await request("/rest/v1/error_logs?on_conflict=id", {
    method: "POST",
    token: adminSession.access_token,
    body: [{
      id: qaIds.errorLog,
      company_id: companyId,
      profile_id: adminProfile.id,
      source: "qa",
      severity: "info",
      message: "QA CLOUD valida canal de error_logs.",
      metadata: { qa: true },
    }],
  });

  writeResults = {
    signedUrlOk: Boolean(signedUrl?.signedURL || signedUrl?.signedUrl),
    template: template.length,
    attachment: attachment.length,
    generatedDocument: generated.length,
    documentVersion: version.length,
    activityEvent: event.length,
    errorLog: error.length,
  };
}

const healthCounts = {};
for (const [key, table] of Object.entries({
  attachments: "attachments",
  documentTemplates: "document_templates",
  generatedDocuments: "generated_documents",
  documentVersions: "document_versions",
  activityEvents: "activity_events",
  errorLogs: "error_logs",
})) {
  const rows = await request(`/rest/v1/${table}?select=id&metadata->>qa=eq.true`, { token: adminSession.access_token });
  healthCounts[key] = Array.isArray(rows) ? rows.length : 0;
}

const result = {
  ok: true,
  mode,
  url: base,
  roles: {
    tested: roleResults.length,
    failures: roleResults.filter((row) => !row.authOk || !row.active || !row.companyOk),
    details: roleResults.map(({ email, role, active, companyOk }) => ({ email, role, active, companyOk })),
  },
  permissions: {
    allowedRows: Array.isArray(rolePermissionCounts) ? rolePermissionCounts.length : 0,
  },
  writes: writeResults,
  healthCounts,
};

console.log(JSON.stringify(result, null, 2));
if (result.roles.failures.length) process.exitCode = 1;
