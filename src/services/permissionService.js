import { getSession } from "./authService.js";
import { restRequest } from "./supabaseAppClient.js";

function mergePermission(rows = []) {
  return rows.reduce((acc, row) => {
    if (!row.module_id || !row.action) return acc;
    acc[row.module_id] = { ...(acc[row.module_id] || {}), [row.action]: row.allowed === true };
    return acc;
  }, {});
}

export async function getEffectivePermissions(profileId = getSession()?.userId) {
  const session = getSession();
  if (!profileId || !session?.companyId) return {};
  const profileRows = await restRequest(`/profile_permissions?profile_id=eq.${encodeURIComponent(profileId)}&select=*`);
  const roleRows = await restRequest(`/roles?code=eq.${encodeURIComponent(session.rol || "")}&select=id`);
  const roleId = Array.isArray(roleRows) ? roleRows[0]?.id : null;
  const rolePerms = roleId
    ? await restRequest(`/role_permissions?role_id=eq.${encodeURIComponent(roleId)}&select=*`)
    : [];
  return {
    ...mergePermission(Array.isArray(rolePerms) ? rolePerms : []),
    ...mergePermission(Array.isArray(profileRows) ? profileRows : []),
  };
}
