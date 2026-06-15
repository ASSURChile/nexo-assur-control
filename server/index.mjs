import { createServer } from "node:http";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ALLOWED_KEYS, COLLECTIONS, COLLECTION_BY_NAME, keyToName, nameToKey } from "./collections.mjs";
import { buildSoftlandContractReport } from "./softlandAdapter.mjs";
import { getSoftlandConfigStatus, runSoftlandConnector } from "./softlandConnectors.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const HOST = process.env.ASSUR_BACKEND_HOST || "127.0.0.1";
const PORT = Number(process.env.ASSUR_BACKEND_PORT || process.env.PORT || 8787);
const DATA_FILE = process.env.ASSUR_DATA_FILE || resolve(__dirname, "data", "app-data.json");

function send(res, status, body, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,PUT,PATCH,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    ...headers,
  });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return null;
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return null;
  return JSON.parse(raw);
}

async function loadStore() {
  try {
    const raw = await readFile(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw error;
  }
}

async function saveStore(store) {
  await mkdir(dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2));
  await rename(tmp, DATA_FILE);
}

function normalizeKey(pathname) {
  const prefix = "/api/data/";
  if (!pathname.startsWith(prefix)) return null;
  return decodeURIComponent(pathname.slice(prefix.length));
}

function normalizeEntityPath(pathname) {
  const prefix = "/api/entities/";
  if (!pathname.startsWith(prefix)) return null;
  const [name, id] = pathname.slice(prefix.length).split("/").map(decodeURIComponent);
  return { name, id };
}

function createId(prefix = "row") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toDomainBackup(store, safe = true) {
  const source = safe ? stripSecrets(store) : store;
  const backup = {};
  for (const [key, value] of Object.entries(source)) {
    backup[keyToName(key)] = value;
  }
  backup.exportedAt = new Date().toISOString();
  backup.version = "backend-domain-1";
  return backup;
}

function fromDomainBackup(body) {
  const technical = {};
  for (const [name, value] of Object.entries(body || {})) {
    const key = nameToKey(name);
    if (ALLOWED_KEYS.has(key)) technical[key] = value;
  }
  return technical;
}

function stripSecrets(payload) {
  if (!payload || typeof payload !== "object") return payload;
  const clone = structuredClone(payload);
  delete clone.af_session;
  if (Array.isArray(clone.af_usuarios)) {
    clone.af_usuarios = clone.af_usuarios.map(({ password, ...user }) => user);
  }
  if (clone.af_api_config?.credenciales?.token) {
    clone.af_api_config.credenciales.token = "";
  }
  return clone;
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    if (req.method === "OPTIONS") return send(res, 204, {});

    if (url.pathname === "/health") {
      const store = await loadStore();
      return send(res, 200, {
        ok: true,
        service: "assur-control-backend",
        keys: Object.keys(store).length,
        collections: COLLECTIONS.length,
        dataFile: DATA_FILE,
        now: new Date().toISOString(),
      });
    }

    if (url.pathname === "/api/collections" && req.method === "GET") {
      const store = await loadStore();
      return send(res, 200, COLLECTIONS.map((collection) => ({
        ...collection,
        count: Array.isArray(store[collection.key]) ? store[collection.key].length : store[collection.key] == null ? 0 : 1,
      })));
    }

    if (url.pathname === "/api/softland/status" && req.method === "GET") {
      return send(res, 200, getSoftlandConfigStatus());
    }

    if (url.pathname === "/api/softland/probe" && req.method === "POST") {
      const body = await readJson(req) || {};
      const result = await runSoftlandConnector({
        entity: body.entity || "clientes",
        companyCode: body.companyCode || "",
        since: body.since || "",
        limit: body.limit || 10,
        dryRun: body.dryRun !== false,
      });
      return send(res, result.ok ? 200 : (result.status || 400), result);
    }

    if (url.pathname === "/api/softland/normalize" && req.method === "POST") {
      const body = await readJson(req) || {};
      const result = buildSoftlandContractReport(body.payload || body, body.entities);
      return send(res, result.ok ? 200 : 422, result);
    }

    if (url.pathname === "/api/backup" && req.method === "GET") {
      const store = await loadStore();
      const safe = url.searchParams.get("safe") !== "false";
      return send(res, 200, safe ? stripSecrets(store) : store);
    }

    if (url.pathname === "/api/backup" && req.method === "PUT") {
      const body = await readJson(req);
      if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, { error: "Backup inválido." });
      await saveStore(body);
      return send(res, 200, { ok: true, keys: Object.keys(body).length });
    }

    if (url.pathname === "/api/backup/merge" && req.method === "POST") {
      const body = await readJson(req);
      if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, { error: "Backup inválido." });
      const current = await loadStore();
      const next = { ...current, ...body };
      await saveStore(next);
      return send(res, 200, { ok: true, keys: Object.keys(next).length });
    }

    if (url.pathname === "/api/domain-backup" && req.method === "GET") {
      const store = await loadStore();
      const safe = url.searchParams.get("safe") !== "false";
      return send(res, 200, toDomainBackup(store, safe));
    }

    if (url.pathname === "/api/domain-backup/merge" && req.method === "POST") {
      const body = await readJson(req);
      if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, { error: "Backup inválido." });
      const current = await loadStore();
      const technical = fromDomainBackup(body);
      const next = { ...current, ...technical };
      await saveStore(next);
      return send(res, 200, { ok: true, keys: Object.keys(technical).length, totalKeys: Object.keys(next).length });
    }

    const entity = normalizeEntityPath(url.pathname);
    if (entity?.name) {
      const collection = COLLECTION_BY_NAME.get(entity.name);
      if (!collection) return send(res, 404, { error: "Entidad no permitida.", entity: entity.name });
      if (collection.kind !== "array") return send(res, 400, { error: "La entidad no es una colección editable.", entity: entity.name });

      const store = await loadStore();
      const rows = toArray(store[collection.key]);

      if (req.method === "GET") {
        if (!entity.id) return send(res, 200, rows);
        const item = rows.find((row) => String(row?.id) === entity.id);
        return item ? send(res, 200, item) : send(res, 404, { error: "Registro no encontrado.", id: entity.id });
      }

      if (req.method === "POST" && !entity.id) {
        const body = await readJson(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, { error: "Registro inválido." });
        const now = new Date().toISOString();
        const item = { id: body.id || createId(entity.name), ...body, createdAt: body.createdAt || now, updatedAt: now };
        store[collection.key] = [...rows, item];
        await saveStore(store);
        return send(res, 201, item);
      }

      if ((req.method === "PUT" || req.method === "PATCH") && entity.id) {
        const body = await readJson(req);
        if (!body || typeof body !== "object" || Array.isArray(body)) return send(res, 400, { error: "Registro inválido." });
        const index = rows.findIndex((row) => String(row?.id) === entity.id);
        if (index < 0) return send(res, 404, { error: "Registro no encontrado.", id: entity.id });
        const updated = req.method === "PATCH"
          ? { ...rows[index], ...body, id: rows[index].id, updatedAt: new Date().toISOString() }
          : { ...body, id: rows[index].id, createdAt: body.createdAt || rows[index].createdAt, updatedAt: new Date().toISOString() };
        const next = [...rows];
        next[index] = updated;
        store[collection.key] = next;
        await saveStore(store);
        return send(res, 200, updated);
      }

      if (req.method === "DELETE" && entity.id) {
        store[collection.key] = rows.filter((row) => String(row?.id) !== entity.id);
        await saveStore(store);
        return send(res, 200, { ok: true });
      }
    }

    const key = normalizeKey(url.pathname);
    if (key) {
      if (!ALLOWED_KEYS.has(key)) return send(res, 404, { error: "Colección no permitida.", key });
      const store = await loadStore();
      if (req.method === "GET") return send(res, 200, store[key] ?? []);
      if (req.method === "PUT") {
        const body = await readJson(req);
        store[key] = body;
        await saveStore(store);
        return send(res, 200, store[key]);
      }
      if (req.method === "DELETE") {
        delete store[key];
        await saveStore(store);
        return send(res, 200, { ok: true });
      }
    }

    return send(res, 404, { error: "Ruta no encontrada." });
  } catch (error) {
    return send(res, 500, { error: error.message || "Error interno." });
  }
});

server.on("error", (error) => {
  console.error(`No se pudo iniciar ASSUR backend en ${HOST}:${PORT}`);
  console.error(error.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`ASSUR backend listening on http://${HOST}:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
