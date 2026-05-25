const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";

function assertConfig() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Falta configurar Supabase para gestionar perfiles.");
  }
}

async function request(path, { method = "GET", accessToken, body } = {}) {
  assertConfig();
  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const text = await response.text().catch(() => "");
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = data?.msg || data?.message || data?.error_description || data?.error || response.statusText;
    throw new Error(message || "No se pudo gestionar el perfil.");
  }
  return data;
}

export function profileToUser(profile = {}) {
  return {
    id: profile.id,
    nombre: profile.full_name || profile.email || "Usuario",
    email: profile.email || "",
    rol: profile.role || "viewer",
    activo: profile.active !== false,
    tecnicoId: profile.technician_id || "",
    companyId: profile.company_id || "",
    createdAt: profile.created_at || "",
    updatedAt: profile.updated_at || "",
  };
}

export async function listSupabaseProfiles(accessToken) {
  const rows = await request("/rest/v1/profiles?select=*&order=full_name.asc", { accessToken });
  return Array.isArray(rows) ? rows.map(profileToUser) : [];
}

export async function updateSupabaseProfile(accessToken, id, patch) {
  const body = {
    full_name: patch.nombre,
    email: patch.email,
    role: patch.rol,
    active: patch.activo !== false,
    technician_id: patch.tecnicoId || null,
    updated_at: new Date().toISOString(),
  };
  const rows = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    accessToken,
    body,
  });
  return profileToUser(Array.isArray(rows) ? rows[0] : rows);
}
