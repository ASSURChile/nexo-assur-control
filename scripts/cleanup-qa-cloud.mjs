import fs from "node:fs/promises";

async function readEnv(path) {
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
}

const env = { ...(await readEnv(".env.local")), ...process.env };
const base = String(env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const email = env.SUPABASE_LOGIN_EMAIL || "admin@assur.cl";
const password = env.SUPABASE_LOGIN_PASSWORD || "admin12345";

if (!base || !anonKey) throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.");

async function request(path, { method = "GET", token, body, prefer = "return=representation" } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token || anonKey}`,
      "Content-Type": "application/json",
      Prefer: prefer,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`${method} ${path} -> ${response.status}: ${detail || response.statusText}`);
  }
  if (response.status === 204) return [];
  return response.json();
}

async function login() {
  const auth = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: { email, password },
  });
  return auth.access_token;
}

function encodeQuery(query) {
  return query
    .split("&")
    .map((part) => {
      const index = part.indexOf("=");
      if (index === -1) return encodeURIComponent(part);
      return `${encodeURIComponent(part.slice(0, index))}=${encodeURIComponent(part.slice(index + 1))}`;
    })
    .join("&")
    .replaceAll("%3E", ">")
    .replaceAll("%2A", "*")
    .replaceAll("%2C", ",")
    .replaceAll("%28", "(")
    .replaceAll("%29", ")");
}

async function selectIds(token, table, filter) {
  const rows = await request(`/rest/v1/${table}?${encodeQuery(`select=id&${filter}`)}`, { token });
  return rows.map((row) => row.id).filter(Boolean);
}

async function deleteIds(token, table, ids) {
  if (!ids.length) return 0;
  const unique = [...new Set(ids)];
  const filter = `id=in.(${unique.map((id) => `"${String(id).replaceAll('"', '\\"')}"`).join(",")})`;
  const rows = await request(`/rest/v1/${table}?${encodeQuery(filter)}`, {
    method: "DELETE",
    token,
    prefer: "return=representation",
  });
  return rows.length;
}

async function deleteStorageObjects(token, bucket, paths) {
  const unique = [...new Set(paths.filter(Boolean))];
  if (!unique.length) return 0;
  await request(`/storage/v1/object/${bucket}`, {
    method: "DELETE",
    token,
    body: { prefixes: unique },
    prefer: null,
  });
  return unique.length;
}

async function collect(token, table, filters) {
  const ids = [];
  for (const filter of filters) {
    try {
      ids.push(...await selectIds(token, table, filter));
    } catch (error) {
      if (!String(error.message).includes("42703")) throw error;
    }
  }
  return [...new Set(ids)];
}

const token = await login();
const companyId = "00000000-0000-0000-0000-000000000001";
const hardeningStorageBucket = "project-evidence";
const hardeningStoragePath = `${companyId}/qa-hardening/qa-hardening-check.txt`;

const flowIds = {
  clients: ["qa-flujo-cliente"],
  sites: ["qa-flujo-instalacion"],
  opportunities: ["qa-flujo-oportunidad"],
  proposals: ["qa-flujo-propuesta"],
  quotes: ["qa-flujo-cotizacion"],
  projects: ["qa-flujo-proyecto"],
  project_tasks: ["qa-tarea-1", "qa-tarea-2", "qa-tarea-3", "qa-tarea-4", "qa-tarea-5"],
  recurring_services: ["qa-flujo-servicio"],
  invoices: ["qa-flujo-factura-anticipo", "qa-flujo-factura-cierre"],
  payments: ["qa-flujo-pago-anticipo"],
  accounts_payable: ["qa-flujo-cxp-materiales", "qa-flujo-cxp-subcontrato"],
  service_billing_expectations: [],
};

const hardeningIds = {
  attachments: ["qa-hardening-attachment"],
  document_templates: ["qa-hardening-template"],
  generated_documents: ["qa-hardening-document"],
  document_versions: ["qa-hardening-document-v1"],
  activity_events: ["qa-hardening-activity"],
  error_logs: ["qa-hardening-error"],
};

const targets = {
  document_versions: [
    ...hardeningIds.document_versions,
    ...await collect(token, "document_versions", [
      "metadata->>qa=eq.true",
      "id=like.qa-hardening-*",
    ]),
  ],
  generated_documents: [
    ...hardeningIds.generated_documents,
    ...await collect(token, "generated_documents", [
      "metadata->>qa=eq.true",
      "id=like.qa-hardening-*",
    ]),
  ],
  attachments: [
    ...hardeningIds.attachments,
    ...await collect(token, "attachments", [
      "metadata->>qa=eq.true",
      "id=like.qa-hardening-*",
      `storage_path=eq.${hardeningStoragePath}`,
    ]),
  ],
  document_templates: [
    ...hardeningIds.document_templates,
    ...await collect(token, "document_templates", [
      "metadata->>qa=eq.true",
      "id=like.qa-hardening-*",
    ]),
  ],
  activity_events: [
    ...hardeningIds.activity_events,
    ...await collect(token, "activity_events", [
      "metadata->>qa=eq.true",
      "id=like.qa-hardening-*",
    ]),
  ],
  error_logs: [
    ...hardeningIds.error_logs,
    ...await collect(token, "error_logs", [
      "metadata->>qa=eq.true",
      "id=like.qa-hardening-*",
    ]),
  ],
  service_billing_expectations: [
    ...flowIds.service_billing_expectations,
    ...await collect(token, "service_billing_expectations", [
      "recurring_service_id=eq.qa-flujo-servicio",
      "id=like.exp-qa-flujo-servicio-*",
    ]),
  ],
  quick_quotes: await collect(token, "quick_quotes", [
    "metadata->>qa=eq.true",
    "id=like.qa-cloud-package-*",
  ]),
  commercial_package_items: await collect(token, "commercial_package_items", [
    "metadata->>qa=eq.true",
    "id=like.qa-cloud-package-*",
  ]),
  commercial_package_services: await collect(token, "commercial_package_services", [
    "metadata->>qa=eq.true",
    "id=like.qa-cloud-package-*",
  ]),
  payments: flowIds.payments,
  invoices: flowIds.invoices,
  accounts_payable: flowIds.accounts_payable,
  recurring_services: flowIds.recurring_services,
  project_tasks: flowIds.project_tasks,
  projects: flowIds.projects,
  quotes: [
    ...flowIds.quotes,
    ...await collect(token, "quotes", [
      "metadata->>qa=eq.true",
      "id=like.qa-cloud-package-*",
      "number=ilike.QA CLOUD*",
    ]),
  ],
  proposals: [
    ...flowIds.proposals,
    ...await collect(token, "proposals", [
      "metadata->>qa=eq.true",
      "id=like.qa-cloud-package-*",
      "name=ilike.QA CLOUD*",
    ]),
  ],
  opportunities: [
    ...flowIds.opportunities,
    ...await collect(token, "opportunities", [
      "metadata->>qa=eq.true",
      "id=like.qa-cloud-package-*",
      "title=ilike.QA CLOUD*",
    ]),
  ],
  commercial_packages: await collect(token, "commercial_packages", [
    "metadata->>qa=eq.true",
    "id=like.qa-cloud-package-*",
    "name=ilike.QA CLOUD*",
  ]),
  sites: flowIds.sites,
  clients: flowIds.clients,
};

const deleteOrder = [
  "document_versions",
  "generated_documents",
  "attachments",
  "document_templates",
  "activity_events",
  "error_logs",
  "service_billing_expectations",
  "quick_quotes",
  "commercial_package_items",
  "commercial_package_services",
  "payments",
  "invoices",
  "accounts_payable",
  "recurring_services",
  "project_tasks",
  "projects",
  "quotes",
  "proposals",
  "opportunities",
  "commercial_packages",
  "sites",
  "clients",
];

const deleted = {};
for (const table of deleteOrder) {
  deleted[table] = await deleteIds(token, table, targets[table] || []);
}
deleted.storage_objects = await deleteStorageObjects(token, hardeningStorageBucket, [hardeningStoragePath]);

const remaining = {};
for (const table of [
  "attachments",
  "document_templates",
  "generated_documents",
  "document_versions",
  "activity_events",
  "error_logs",
  "commercial_packages",
  "commercial_package_items",
  "commercial_package_services",
  "quick_quotes",
  "quotes",
  "opportunities",
  "proposals",
]) {
  remaining[table] = (await collect(token, table, [
    "metadata->>qa=eq.true",
    "id=like.qa-cloud-package-*",
  ])).length;
}

console.log(JSON.stringify({
  ok: true,
  user: email,
  deleted,
  remaining,
}, null, 2));
