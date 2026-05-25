const baseUrl = process.env.ASSUR_BACKEND_URL || "http://127.0.0.1:8787";

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error || `HTTP ${response.status}`);
  }
  return body;
}

try {
  const health = await request("/health");
  const collections = await request("/api/collections");
  const clientes = await request("/api/data/af_clientes");
  const domainBackup = await request("/api/domain-backup");

  if (!health.ok) throw new Error("Healthcheck no retornó ok=true.");
  if (!Array.isArray(collections)) throw new Error("El catálogo de colecciones debe responder como arreglo.");
  if (!Array.isArray(clientes)) throw new Error("af_clientes debe responder como arreglo.");
  if (!domainBackup.version) throw new Error("El backup de dominio no incluye versión.");

  console.log(`Backend OK: ${baseUrl}`);
  console.log(`Colecciones persistidas: ${health.keys}`);
  console.log(`Colecciones disponibles: ${collections.length}`);
  console.log(`Clientes cargados: ${clientes.length}`);
} catch (error) {
  console.error(`Backend no disponible en ${baseUrl}`);
  console.error(error.message);
  process.exit(1);
}
