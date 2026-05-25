export const DIAS_SEM = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function getISOWeek(d) {
  const dt = new Date(d);
  const day = dt.getDay() || 7;
  dt.setDate(dt.getDate() + 4 - day);
  const y = dt.getFullYear();
  const w1 = new Date(y, 0, 4);
  return [y, 1 + Math.round(((dt - w1) / 86400000 - 3 + (w1.getDay() || 7)) / 7)];
}

export function weekStart(y, w) {
  const s = new Date(y, 0, 4);
  s.setDate(s.getDate() - ((s.getDay() || 7) - 1) + (w - 1) * 7);
  return s;
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function fmtDay(d) {
  return d.toISOString().slice(0, 10);
}

export function weekLabel(y, w) {
  const s = weekStart(y, w);
  const e = addDays(s, 6);
  return `Sem ${w} · ${s.getDate()}/${s.getMonth() + 1} – ${e.getDate()}/${e.getMonth() + 1}/${y}`;
}

export const UNIDADES_OPT = ["unidad", "metro", "metro²", "kg", "litro", "caja", "rollo", "par", "juego", "hora", "global"];
export const CATS_MAT = ["Cámaras y NVR", "Alarmas", "Control acceso", "Incendios", "Cableado", "Fuentes y baterías", "Ferretería", "Herramientas", "Consumibles", "Otro"];

export const TIPOS_INC = ["Técnica", "Logística", "Comercial", "Seguridad", "Materiales", "Subcontrato", "Otro"];
export const PRIORIDADES_INC = ["Baja", "Media", "Alta", "Crítica"];
export const ESTADOS_INC = ["Abierta", "En proceso", "Resuelta", "Cerrada", "Rechazada"];
export const COL_PRIO = { Baja: "#0D9F6E", Media: "#C77700", Alta: "#EF4444", Crítica: "#7C3AED" };
export const COL_EST_INC = { Abierta: "#EF4444", "En proceso": "#C77700", Resuelta: "#0D9F6E", Cerrada: "#6B7280", Rechazada: "#9CA3AF" };
