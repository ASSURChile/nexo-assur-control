export const fmtCLP = (n) => (!n && n !== 0) ? "—" : "$ " + Math.round(n).toLocaleString("es-CL");
export const fmtPct = (n) => (n * 100).toFixed(1) + "%";
export const fmtN = (n, d = 1) => (!isFinite(n) || isNaN(n)) ? "∞" : n.toFixed(d);
export const fmtMil = (v) => v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? "$" + (v / 1e3).toFixed(0) + "K" : "$" + Math.round(v);
export const fmtMes = (iso) => {
  try {
    const d = new Date(iso);
    return d.toLocaleString("es-CL", { month: "short" }) + " " + d.getFullYear();
  } catch {
    return "";
  }
};
export const todayISO = () => new Date().toISOString().slice(0, 10);
