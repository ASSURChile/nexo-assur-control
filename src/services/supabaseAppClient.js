import { getSessionAccessToken } from "./authService.js";

const env = import.meta.env || {};
const SUPABASE_URL = (env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY || "";

export function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function assertSupabaseConfigured() {
  if (!isSupabaseConfigured()) {
    throw new Error("Falta configurar Supabase.");
  }
}

function authHeaders({ accessToken, contentType = "application/json", prefer } = {}) {
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || getSessionAccessToken() || SUPABASE_ANON_KEY}`,
  };
  if (contentType) headers["Content-Type"] = contentType;
  if (prefer) headers.Prefer = prefer;
  return headers;
}

async function parseResponse(response) {
  const text = await response.text().catch(() => "");
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.message || data?.msg || data?.error_description || data?.error || response.statusText;
    throw new Error(message || "No se pudo completar la solicitud a Supabase.");
  }
  return data;
}

export async function restRequest(path, { method = "GET", body, accessToken, prefer = "return=representation" } = {}) {
  assertSupabaseConfigured();
  const response = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method,
    headers: authHeaders({ accessToken, prefer }),
    body: body == null ? undefined : JSON.stringify(body),
  });
  return parseResponse(response);
}

export async function storageUpload(bucket, path, file, { accessToken, contentType, upsert = true } = {}) {
  assertSupabaseConfigured();
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, {
    method: "POST",
    headers: {
      ...authHeaders({ accessToken, contentType: contentType || file?.type || "application/octet-stream" }),
      "x-upsert": upsert ? "true" : "false",
    },
    body: file,
  });
  return parseResponse(response);
}

export async function storageSignedUrl(bucket, path, { expiresIn = 3600, accessToken } = {}) {
  assertSupabaseConfigured();
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${encodeURIComponent(bucket)}/${path}`, {
    method: "POST",
    headers: authHeaders({ accessToken }),
    body: JSON.stringify({ expiresIn }),
  });
  return parseResponse(response);
}

export function storagePublicUrl(bucket, path) {
  assertSupabaseConfigured();
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}`;
}
