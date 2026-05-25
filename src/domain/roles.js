import { PERMISOS_DEF } from "../config/navigation.js";
import { repositories as repo } from "../services/repositories.js";

export const ROLE_OPTIONS = [
  { value: "admin", label: "Administrador" },
  { value: "gerencia", label: "Gerencia" },
  { value: "comercial", label: "Comercial" },
  { value: "jefe_comercial", label: "Jefe Comercial" },
  { value: "operaciones", label: "Jefe Operaciones" },
  { value: "administrativo_operaciones", label: "Administrativo Operaciones" },
  { value: "supervisor", label: "Supervisor" },
  { value: "tecnico", label: "Técnico" },
  { value: "monitoreo", label: "Monitoreo" },
  { value: "finanzas", label: "Finanzas" },
  { value: "almacen", label: "Almacén" },
  { value: "viewer", label: "Solo visualización" },
];

export function normalizeRole(rol = "viewer") {
  const clean = String(rol || "viewer")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const map = {
    administrador: "admin",
    administracion: "admin",
    admin: "admin",
    gerente: "gerencia",
    gerencia: "gerencia",
    direccion: "gerencia",
    director: "gerencia",
    comercial: "comercial",
    ventas: "comercial",
    ejecutivo: "comercial",
    ejecutivo_comercial: "comercial",
    jefe_comercial: "jefe_comercial",
    jefatura_comercial: "jefe_comercial",
    ops: "operaciones",
    operacion: "operaciones",
    operaciones: "operaciones",
    jefe_operaciones: "operaciones",
    administrativo_operaciones: "administrativo_operaciones",
    administracion_operaciones: "administrativo_operaciones",
    admin_operaciones: "administrativo_operaciones",
    coordinador_operaciones: "administrativo_operaciones",
    supervisor: "supervisor",
    tecnico: "tecnico",
    tech: "tecnico",
    monitoreo: "monitoreo",
    monitorista: "monitoreo",
    central: "monitoreo",
    finanzas: "finanzas",
    financiero: "finanzas",
    administracion_finanzas: "finanzas",
    almacen: "almacen",
    bodega: "almacen",
    viewer: "viewer",
    visualizador: "viewer",
    lectura: "viewer",
  };
  return map[clean] || "viewer";
}

export function getPermisos(){
  const stored=repo.permisos.get();
  const merged = {};
  Object.keys(PERMISOS_DEF).forEach((rol) => {
    merged[rol] = mergeRolePermissions(PERMISOS_DEF[rol], stored?.[rol]);
  });
  Object.keys(stored || {}).forEach((rol) => {
    if (!merged[rol]) merged[rol] = normalizeRolePermissions(stored[rol]);
  });
  return merged;
}

export function normalizePermissionValue(value, defaults = {}) {
  if (value === false || value == null) return false;
  if (value === true) return { ...defaults, ver: true };
  if (typeof value === "object") return { ...defaults, ...value, ver: value.ver !== false };
  return false;
}

export function normalizeRolePermissions(rolePermissions = {}) {
  return Object.fromEntries(Object.entries(rolePermissions || {}).map(([moduleId, value]) => [moduleId, normalizePermissionValue(value)]));
}

function mergeRolePermissions(defaults = {}, stored = {}) {
  const keys = new Set([...Object.keys(defaults || {}), ...Object.keys(stored || {})]);
  const merged = {};
  keys.forEach((moduleId) => {
    const base = normalizePermissionValue(defaults?.[moduleId]);
    const override = stored?.[moduleId];
    if (override === undefined) merged[moduleId] = base;
    else if (override === false) merged[moduleId] = false;
    else if (override === true) merged[moduleId] = { ...(base || {}), ver: true };
    else merged[moduleId] = normalizePermissionValue(override, base || {});
  });
  return merged;
}

export function hasPermission(permisos, rol, moduleId, action = "ver") {
  const r=normalizeRole(rol);
  if (r === "admin") return true;
  if (r === "tecnico") return moduleId === "mobile" && action === "ver";
  if (moduleId === "config") return false;
  const value = normalizePermissionValue(permisos?.[r]?.[moduleId]);
  if (!value) return false;
  if (action === "ver") return value.ver !== false;
  return value[action] === true;
}

export function canEdit(rol,moduleId=null,action="editar",permisos=null){
  const r=normalizeRole(rol);
  if (r === "admin") return true;
  if (!moduleId || !permisos) return !["viewer","tecnico"].includes(r);
  return hasPermission(permisos,r,moduleId,action) || hasPermission(permisos,r,moduleId,"crear");
}

export function rolLabel(rol){
  rol = normalizeRole(rol);
  const map={admin:"Administrador",gerencia:"Gerencia",comercial:"Comercial",jefe_comercial:"Jefe Comercial",operaciones:"Jefe Operaciones",administrativo_operaciones:"Administrativo Operaciones",supervisor:"Supervisor",tecnico:"Técnico",monitoreo:"Monitoreo",finanzas:"Finanzas",almacen:"Almacén",viewer:"Visualización"};
  return map[rol]||"Usuario";
}

export function rolColor(rol,C){
  rol = normalizeRole(rol);
  const map={admin:C.blue,gerencia:C.purple,comercial:"#1B5F86",jefe_comercial:"#174F72",operaciones:C.amber,administrativo_operaciones:"#B58112",supervisor:"#7C3AED",tecnico:C.green,monitoreo:"#0891B2",finanzas:C.green,almacen:"#0891B2",viewer:C.textM};
  return map[rol]||C.textM;
}

export function defaultTabForRol(rol){
  rol = normalizeRole(rol);
  if(rol==="tecnico")return "mobile";
  if(rol==="supervisor")return "supervisor";
  if(rol==="almacen")return "almacen";
  if(rol==="finanzas")return "finanzas";
  if(rol==="monitoreo")return "servicios";
  if(rol==="operaciones")return "aprobaciones";
  if(rol==="administrativo_operaciones")return "almacen";
  if(rol==="jefe_comercial")return "comercial_dashboard";
  if(rol==="comercial")return "comercial_dashboard";
  if(rol==="viewer")return "dashboard";
  return "dashboard";
}
