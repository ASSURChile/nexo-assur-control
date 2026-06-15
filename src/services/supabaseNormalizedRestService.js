const TABLE_ORDER = [
  "companies",
  "clients",
  "sites",
  "materials",
  "technicians",
  "contractors",
  "opportunities",
  "proposals",
  "quotes",
  "commercial_packages",
  "commercial_package_items",
  "commercial_package_services",
  "projects",
  "project_tasks",
  "material_requests",
  "material_request_items",
  "time_entries",
  "field_clock_events",
  "incidents",
  "expenses",
  "billing_milestones",
  "recurring_services",
  "monitoring_protocols",
  "service_contacts",
  "installed_assets",
  "service_events",
  "service_billing_expectations",
  "invoices",
  "payments",
  "accounts_payable",
  "quick_quotes",
  "legal_entities",
  "business_units",
  "roles",
  "role_permissions",
  "profile_permissions",
  "attachments",
  "document_templates",
  "generated_documents",
  "document_versions",
  "activity_events",
  "error_logs",
];

function assertConfig({ url, key }) {
  if (!url || !key) throw new Error("Falta configurar URL/key de Supabase.");
}

function baseUrl(url) {
  return String(url || "").replace(/\/+$/, "");
}

function headers({ key, accessToken, prefer = "resolution=merge-duplicates,return=representation" }) {
  return {
    apikey: key,
    Authorization: `Bearer ${accessToken || key}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

async function request({ url, key, accessToken, table, method = "GET", body, prefer }) {
  const response = await fetch(`${baseUrl(url)}/rest/v1/${table}`, {
    method,
    headers: headers({ key, accessToken, prefer }),
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Supabase ${table} ${response.status}: ${detail || response.statusText}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export function createSupabaseNormalizedRestService({ url, anonKey, serviceRoleKey, getAccessToken } = {}) {
  const key = serviceRoleKey || anonKey;
  assertConfig({ url, key });
  const accessToken = () => serviceRoleKey || getAccessToken?.() || anonKey;

  return {
    tableOrder: TABLE_ORDER,
    async upsertTable(table, rows = []) {
      if (!Array.isArray(rows) || rows.length === 0) return [];
      return request({
        url,
        key,
        accessToken: accessToken(),
        table: `${encodeURIComponent(table)}?on_conflict=id`,
        method: "POST",
        body: rows,
      });
    },
    async selectTable(table, query = "select=*") {
      return request({
        url,
        key,
        accessToken: accessToken(),
        table: `${encodeURIComponent(table)}?${query}`,
      });
    },
    async deleteById(table, id) {
      if (!id) return null;
      return request({
        url,
        key,
        accessToken: accessToken(),
        table: `${encodeURIComponent(table)}?id=eq.${encodeURIComponent(id)}`,
        method: "DELETE",
        prefer: "return=minimal",
      });
    },
    async upsertSeedPayload(payload = {}, { tables = TABLE_ORDER } = {}) {
      const result = {};
      for (const table of tables) {
        const rows = payload[table] || [];
        result[table] = {
          input: Array.isArray(rows) ? rows.length : 0,
          output: rows.length ? (await this.upsertTable(table, rows)).length : 0,
        };
      }
      return result;
    },
  };
}

export { TABLE_ORDER };
