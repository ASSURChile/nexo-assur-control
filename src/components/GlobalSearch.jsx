import { useMemo, useState } from "react";
import { COL_E, ff } from "../config/appConstants";
import { calcProp } from "../domain/commercial";
import { Bdg } from "./ui";

const fmtCLP = (n) => (!n && n !== 0) ? "—" : "$ " + Math.round(n).toLocaleString("es-CL");

export default function GlobalSearch({ C, clientes, instalaciones, propuestas, params, onGoClient, onGoTab, dark = false }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    if (!q || q.length < 2) return { clientes: [], propuestas: [], instalaciones: [] };
    const ql = q.toLowerCase();
    return {
      clientes: clientes.filter((c) =>
        (c.razonSocial || "").toLowerCase().includes(ql) ||
        (c.nombreComercial || "").toLowerCase().includes(ql) ||
        (c.rut || "").toLowerCase().includes(ql) ||
        (c.contacto || "").toLowerCase().includes(ql) ||
        (c.ejecutivo || "").toLowerCase().includes(ql)
      ).slice(0, 5),
      propuestas: propuestas.filter((p) => {
        const cl = clientes.find((c) => c.id === p.clienteId);
        return (p.nombre || "").toLowerCase().includes(ql) ||
          (p.numero || "").toLowerCase().includes(ql) ||
          (cl?.razonSocial || "").toLowerCase().includes(ql) ||
          (p.ejecutivo || "").toLowerCase().includes(ql);
      }).slice(0, 5),
      instalaciones: instalaciones.filter((i) => {
        const cl = clientes.find((c) => c.id === i.clienteId);
        return (i.nombre || "").toLowerCase().includes(ql) ||
          (i.comuna || "").toLowerCase().includes(ql) ||
          (cl?.razonSocial || "").toLowerCase().includes(ql);
      }).slice(0, 4),
    };
  }, [q, clientes, propuestas, instalaciones]);

  const total = results.clientes.length + results.propuestas.length + results.instalaciones.length;
  const showDrop = open && q.length >= 2;

  return <div style={{ position: "relative", width: "100%" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 9, background: dark ? "#171F2C" : C.bg2, border: "1px solid " + (dark ? "#364353" : C.border), borderRadius: 8, padding: "9px 13px", width: "100%", boxSizing: "border-box", boxShadow: dark ? "none" : "0 1px 0 rgba(15,23,41,0.03)" }}>
      <span style={{ color: dark ? "#9AA8B8" : C.textM, fontSize: 14, flexShrink: 0 }}>⌕</span>
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Buscar clientes, propuestas..."
        style={{ background: "transparent", border: "none", color: dark ? "#F8FAFC" : C.text, fontSize: 13, fontFamily: ff, outline: "none", flex: 1, minWidth: 0 }}
      />
      {q && <button onClick={() => { setQ(""); setOpen(false); }} style={{ background: "transparent", border: "none", color: dark ? "#93A8BC" : C.textM, cursor: "pointer", fontSize: 13, padding: 0, flexShrink: 0, lineHeight: 1 }}>x</button>}
    </div>
    {showDrop && <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 420, maxWidth: "min(420px, calc(100vw - 32px))", background: C.bg1, border: "1px solid " + C.border, borderRadius: 9, boxShadow: "0 18px 42px rgba(15,23,41,0.18)", zIndex: 300, maxHeight: 420, overflowY: "auto" }}>
      {total === 0 && <div style={{ padding: "18px 16px", color: C.textM, fontSize: 12, fontFamily: ff, textAlign: "center" }}>Sin resultados para "{q}"</div>}
      {results.clientes.length > 0 && <div>
        <div style={{ padding: "8px 14px 4px", fontSize: 9, color: C.blue, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, fontFamily: ff, borderBottom: "1px solid " + C.border }}>Clientes ({results.clientes.length})</div>
        {results.clientes.map((c) => {
          const mrr = propuestas.filter((p) => p.clienteId === c.id && p.estado === "Aprobada").reduce((a, p) => a + (calcProp(p, params)?.iRec || 0), 0);
          return <div key={c.id} onMouseDown={() => { setQ(""); setOpen(false); onGoClient(c); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid " + C.border }} onMouseEnter={(e) => e.currentTarget.style.background = C.bg2} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: C.blue + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 11, color: C.blue, fontWeight: 700 }}>C</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: ff, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.razonSocial || c.nombreComercial || "—"}</div>
              <div style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>{c.rut}{c.rut && c.rubro ? " · " : ""}{c.rubro}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <Bdg color={c.estado === "Activo" ? C.green : c.estado === "Inactivo" ? C.red : C.amber} small>{c.estado || "Prospecto"}</Bdg>
              {mrr > 0 && <div style={{ fontSize: 9, color: C.green, fontFamily: ff, marginTop: 2 }}>{fmtCLP(mrr)}/mes</div>}
            </div>
          </div>;
        })}
      </div>}
      {results.propuestas.length > 0 && <div>
        <div style={{ padding: "8px 14px 4px", fontSize: 9, color: C.green, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, fontFamily: ff, borderBottom: "1px solid " + C.border }}>Propuestas ({results.propuestas.length})</div>
        {results.propuestas.map((p) => {
          const cl = clientes.find((c) => c.id === p.clienteId);
          const r = calcProp(p, params);
          return <div key={p.id} onMouseDown={() => { setQ(""); setOpen(false); onGoTab("propuestas"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer", borderBottom: "1px solid " + C.border }} onMouseEnter={(e) => e.currentTarget.style.background = C.bg2} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: COL_E[p.estado] + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 11, color: COL_E[p.estado] || C.textM, fontWeight: 700 }}>P</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: ff, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre || "—"}</div>
              <div style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>{cl?.razonSocial || "—"}{p.numero ? " · " + p.numero : ""}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <Bdg color={COL_E[p.estado] || "#64748B"} small>{p.estado || "Borrador"}</Bdg>
              {r?.tieneProj && <div style={{ fontSize: 9, color: C.blue, fontFamily: ff, marginTop: 2 }}>{fmtCLP(r.vf)}</div>}
            </div>
          </div>;
        })}
      </div>}
      {results.instalaciones.length > 0 && <div>
        <div style={{ padding: "8px 14px 4px", fontSize: 9, color: C.amber, textTransform: "uppercase", letterSpacing: "0.15em", fontWeight: 700, fontFamily: ff, borderBottom: "1px solid " + C.border }}>Instalaciones ({results.instalaciones.length})</div>
        {results.instalaciones.map((i) => {
          const cl = clientes.find((c) => c.id === i.clienteId);
          return <div key={i.id} onMouseDown={() => { setQ(""); setOpen(false); onGoTab("instalaciones"); }} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 14px", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.background = C.bg2} onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}>
            <div style={{ width: 28, height: 28, borderRadius: 5, background: C.amber + "22", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 11, color: C.amber, fontWeight: 700 }}>I</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: C.text, fontFamily: ff, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i.nombre || "—"}</div>
              <div style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>{cl?.razonSocial || "—"}{i.comuna ? " · " + i.comuna : ""}</div>
            </div>
            <Bdg color={i.estado === "Activa" ? C.green : C.red} small>{i.estado || "Activa"}</Bdg>
          </div>;
        })}
      </div>}
    </div>}
  </div>;
}
