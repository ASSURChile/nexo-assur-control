const baseUrl = process.env.ASSUR_BACKEND_URL || "http://127.0.0.1:8787";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

const { response: statusResponse, body: status } = await request("/api/softland/status");
if (!statusResponse.ok) {
  console.error("No se pudo leer estado Softland", status);
  process.exit(1);
}

console.log(JSON.stringify(status, null, 2));

const { response: probeResponse, body: probe } = await request("/api/softland/probe", {
  method: "POST",
  body: JSON.stringify({
    entity: process.env.SOFTLAND_PROBE_ENTITY || "clientes",
    companyCode: process.env.SOFTLAND_PROBE_COMPANY || status?.companies?.alertaMd?.code || "",
    limit: Number(process.env.SOFTLAND_PROBE_LIMIT || 5),
    dryRun: true,
  }),
});

if (!probeResponse.ok) {
  console.error("Probe Softland no preparado", JSON.stringify(probe, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(probe, null, 2));
