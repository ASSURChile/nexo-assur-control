import fs from "node:fs/promises";
import { createSupabaseNormalizedRestService } from "../src/services/supabaseNormalizedRestService.js";

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
const url = String(env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const email = env.SUPABASE_LOGIN_EMAIL || "admin@assur.cl";
const password = env.SUPABASE_LOGIN_PASSWORD || "admin12345";

if (!url || !anonKey) throw new Error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.");

const loginResponse = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: {
    apikey: anonKey,
    "content-type": "application/json",
  },
  body: JSON.stringify({ email, password }),
});

const loginBody = await loginResponse.json().catch(() => ({}));
if (!loginResponse.ok) {
  throw new Error(loginBody.message || loginBody.error_description || "No se pudo autenticar en Supabase.");
}

const token = loginBody.access_token;
const userId = loginBody.user?.id || null;
const service = createSupabaseNormalizedRestService({ url, anonKey, getAccessToken: () => token });
const now = new Date().toISOString();
const companyId = "00000000-0000-0000-0000-000000000001";
const baseId = `qa-cloud-package-${Date.now()}`;
const clientId = "qa-flujo-cliente";
const siteId = "qa-flujo-instalacion";
const opportunityId = `${baseId}-opp`;
const proposalId = `${baseId}-prop`;
const quickQuoteId = `${baseId}-quick`;

const payload = {
  commercial_packages: [{
    id: baseId,
    company_id: companyId,
    name: `QA CLOUD Paquete Normalizado Script ${baseId}`,
    line: "ASSUR Home",
    category: "Alarma",
    status: "Activo",
    description: "Paquete QA para validar tablas normalizadas.",
    installation_price: 390000,
    installation_currency: "CLP",
    monthly_value: 0.8,
    monthly_currency: "UF",
    contract_months: 24,
    estimated_cost: 210000,
    expected_margin: 46,
    requires_approval: false,
    valid_from: null,
    valid_until: null,
    conditions: "QA sin datos reales.",
    metadata: { qa: true },
    created_at: now,
    updated_at: now,
  }],
  commercial_package_items: [{
    id: `${baseId}-item-1`,
    company_id: companyId,
    package_id: baseId,
    material_id: null,
    item_type: "material",
    name: "Sensor infrarrojo QA",
    quantity: 2,
    unit: "un",
    unit_cost: 25000,
    metadata: { qa: true },
    created_at: now,
    updated_at: now,
  }],
  commercial_package_services: [{
    id: `${baseId}-srv-1`,
    company_id: companyId,
    package_id: baseId,
    service_type: "Monitoreo alarmas",
    monthly_value: 0.8,
    currency: "UF",
    cameras: 0,
    alarms: 1,
    metadata: { qa: true },
    created_at: now,
    updated_at: now,
  }],
  opportunities: [{
    id: opportunityId,
    company_id: companyId,
    client_id: clientId,
    site_id: siteId,
    title: "QA CLOUD Cotización rápida paquete normalizado",
    stage: "Propuesta enviada",
    probability: 75,
    estimated_value: 390000,
    estimated_mrr: 31920,
    executive: "QA Script",
    expected_close_date: null,
    metadata: { qa: true, packageId: baseId },
    created_at: now,
    updated_at: now,
  }],
  proposals: [{
    id: proposalId,
    company_id: companyId,
    client_id: clientId,
    site_id: siteId,
    opportunity_id: opportunityId,
    number: "QA-PKG-SCRIPT",
    name: "QA CLOUD Propuesta paquete normalizado",
    status: "Borrador",
    executive: "QA Script",
    net_project_value: 390000,
    estimated_cost: 210000,
    monthly_recurring_value: 31920,
    metadata: { qa: true, packageId: baseId },
    created_at: now,
    updated_at: now,
  }],
  quick_quotes: [{
    id: quickQuoteId,
    company_id: companyId,
    package_id: baseId,
    client_id: clientId,
    site_id: siteId,
    opportunity_id: opportunityId,
    proposal_id: proposalId,
    status: "Generada",
    net_project_value: 390000,
    monthly_recurring_value: 31920,
    created_by: userId,
    metadata: { qa: true },
    created_at: now,
    updated_at: now,
  }],
};

const tables = [
  "commercial_packages",
  "commercial_package_items",
  "commercial_package_services",
  "opportunities",
  "proposals",
  "quick_quotes",
];

const result = await service.upsertSeedPayload(payload, { tables });
const readCounts = {};

for (const table of tables) {
  const rows = await service.selectTable(table, "select=id&metadata->>qa=eq.true&limit=20");
  readCounts[table] = rows.length;
}

console.log(JSON.stringify({
  ok: true,
  user: email,
  packageId: baseId,
  result,
  readCounts,
}, null, 2));
