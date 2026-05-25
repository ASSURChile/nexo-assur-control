import { repositories as repo } from "./repositories.js";
import { normalizeRole } from "../domain/roles.js";

export const AUTH_MODE = import.meta.env?.VITE_AUTH_MODE || "demo";
export const DEMO_AUTH_ENABLED = AUTH_MODE !== "supabase";
const SUPABASE_URL = (import.meta.env?.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";

export function getSession(){
  return repo.session.get();
}

export function saveSession(session){
  repo.session.set(session);
  return session;
}

export function clearSession(){
  repo.session.set(null);
}

export function loginDemoUser({email,password}){
  if(!DEMO_AUTH_ENABLED)return null;
  const normalized=(email||"").trim().toLowerCase();
  const user=repo.usuarios.list().find(u=>
    (u.email||"").toLowerCase()===normalized&&u.password===password
  );
  if(!user)return null;
  if(user.activo===false)return null;
  const rol=normalizeRole(user.rol);
  const tecnicoId=user.tecnicoId||findLinkedTechnician(user)?.id||"";
  return saveSession({
    userId:user.id,
    tecnicoId,
    linkedIds:[user.id,tecnicoId].filter(Boolean),
    nombre:user.nombre,
    rol,
    email:user.email,
  });
}

function assertSupabaseAuthConfig(){
  if(!SUPABASE_URL||!SUPABASE_ANON_KEY){
    throw new Error("Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }
}

async function supabaseRequest(path,{method="GET",accessToken,body}={}){
  assertSupabaseAuthConfig();
  const response=await fetch(`${SUPABASE_URL}${path}`,{
    method,
    headers:{
      apikey:SUPABASE_ANON_KEY,
      Authorization:`Bearer ${accessToken||SUPABASE_ANON_KEY}`,
      "Content-Type":"application/json",
    },
    body:body==null?undefined:JSON.stringify(body),
  });
  const text=await response.text().catch(()=>"");
  const data=text?JSON.parse(text):null;
  if(!response.ok){
    const message=data?.msg||data?.message||data?.error_description||data?.error||response.statusText;
    const error=new Error(message||"No se pudo completar la solicitud a Supabase.");
    error.status=response.status;
    error.payload=data;
    throw error;
  }
  return data;
}

async function getProfileForAuthUser({authUserId,accessToken}){
  const query=`/rest/v1/profiles?id=eq.${encodeURIComponent(authUserId)}&select=*`;
  const rows=await supabaseRequest(query,{accessToken});
  return Array.isArray(rows)?rows[0]:null;
}

export async function loginSupabaseUser({email,password}){
  const normalized=(email||"").trim().toLowerCase();
  const auth=await supabaseRequest("/auth/v1/token?grant_type=password",{
    method:"POST",
    body:{email:normalized,password},
  });
  const accessToken=auth?.access_token;
  const refreshToken=auth?.refresh_token;
  const authUser=auth?.user;
  if(!accessToken||!authUser?.id)return null;

  const profile=await getProfileForAuthUser({authUserId:authUser.id,accessToken});
  if(!profile||profile.active===false)return null;

  const user={
    id:profile.id||authUser.id,
    tecnicoId:profile.technician_id||"",
    email:profile.email||authUser.email||normalized,
    nombre:profile.full_name||authUser.email||normalized,
  };
  const tecnicoId=user.tecnicoId||findLinkedTechnician(user)?.id||"";
  const rol=normalizeRole(profile.role);
  return saveSession({
    userId:user.id,
    authUserId:authUser.id,
    companyId:profile.company_id||"",
    tecnicoId,
    linkedIds:[user.id,tecnicoId].filter(Boolean),
    nombre:user.nombre,
    rol,
    email:user.email,
    accessToken,
    refreshToken,
    provider:"supabase",
  });
}

export function getSessionAccessToken(){
  return getSession()?.accessToken||"";
}

export function findLinkedTechnician(user){
  if(!user)return null;
  const tecnicos=repo.tecnicos.list();
  return tecnicos.find(t=>t.id===user.tecnicoId)||
    tecnicos.find(t=>(t.usuarioId||"")===user.id)||
    tecnicos.find(t=>user.email&&t.email&&(t.email||"").toLowerCase()===(user.email||"").toLowerCase())||
    tecnicos.find(t=>user.nombre&&t.nombre&&(t.nombre||"").toLowerCase()===(user.nombre||"").toLowerCase())||
    null;
}

export function sanitizeUserForExport(user){
  if(!user)return user;
  const {password,...safe}=user;
  return safe;
}
