import { useState } from "react";
import { ff } from "../config/appConstants";
import { Bdg, Btn, EmptyState, Fld, G, Inp, Modal, Sel, SelBusca } from "../components/ui";

const ETAPAS_OP = ["Lead", "Calificado", "Solicitud de cotización", "En cotización", "Propuesta lista", "Negociación", "Ganado", "Perdido"];
const PROB_DEF = { Lead: 10, Calificado: 30, "Solicitud de cotización": 40, "En cotización": 45, "Propuesta lista": 55, Negociación: 75, Ganado: 100, Perdido: 0 };
const COL_ETAPA = { Lead: "#94A3B8", Calificado: "#3B82F6", "Solicitud de cotización": "#F59E0B", "En cotización": "#B58112", "Propuesta lista": "#8B5CF6", Negociación: "#F59E0B", Ganado: "#10B981", Perdido: "#EF4444" };

const fmtCLP = (n) => (!n && n !== 0 ? "—" : "$ " + Math.round(n).toLocaleString("es-CL"));
const fmtPct = (n) => (n * 100).toFixed(1) + "%";

export function buildOportunidad(id) {
  return {
    id,
    numero: "",
    titulo: "",
    clienteId: "",
    instalacionId: "",
    ejecutivo: "",
    etapa: "Lead",
    probabilidad: 10,
    valorEstimado: 0,
    mrrEstimado: 0,
    fechaContacto: new Date().toISOString().slice(0, 10),
    fechaCierreEsperado: "",
    origenLead: "",
    notas: "",
    historial: [],
    propuestaId: "",
    createdAt: new Date().toISOString(),
  };
}

export default function PipelineView({
  C,
  oportunidades,
  clientes,
  instalaciones,
  ejecutivos,
  propuestas,
  onSave,
  onDelete,
  onConvertirAPropuesta,
  readonly,
  createOpportunity,
  nextOpportunityNumber,
}) {
  const [vista, setVista] = useState("kanban");
  const [modal, setModal] = useState(null);
  const [filtroEjec, setFiltroEjec] = useState("todos");
  const [busca, setBusca] = useState("");

  const filtradas = oportunidades.filter((o) => {
    if (filtroEjec !== "todos" && o.ejecutivo !== filtroEjec) return false;
    if (busca) {
      const q = busca.toLowerCase();
      const cli = clientes.find((c) => c.id === o.clienteId);
      if (!o.titulo?.toLowerCase().includes(q) && !o.numero?.toLowerCase().includes(q) && !cli?.razonSocial?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const activas = filtradas.filter((o) => !["Ganado", "Perdido"].includes(o.etapa));
  const valorPipeline = activas.reduce((s, o) => s + (o.valorEstimado || 0), 0);
  const valorPonderado = activas.reduce((s, o) => s + ((o.valorEstimado || 0) * (o.probabilidad || 0)) / 100, 0);
  const ganadas = filtradas.filter((o) => o.etapa === "Ganado");
  const cerradas = filtradas.filter((o) => ["Ganado", "Perdido"].includes(o.etapa));
  const conversion = cerradas.length > 0 ? ganadas.length / cerradas.length : 0;
  const mrrPotencial = activas.reduce((s, o) => s + ((o.mrrEstimado || 0) * (o.probabilidad || 0)) / 100, 0);
  const porEtapa = {};
  ETAPAS_OP.forEach((e) => {
    porEtapa[e] = filtradas.filter((o) => o.etapa === e);
  });

  const openNew = () => setModal({ data: createOpportunity() });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: C.text, fontFamily: ff }}>Pipeline comercial</h2>
          <div style={{ fontSize: 12, color: C.textM, fontFamily: ff, marginTop: 3 }}>Seguimiento de oportunidades desde lead hasta cierre</div>
        </div>
        {!readonly && <Btn C={C} onClick={openNew}>+ Nueva oportunidad</Btn>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          { l: "Oportunidades activas", v: activas.length, c: C.blue },
          { l: "Valor pipeline", v: fmtCLP(valorPipeline), c: C.text },
          { l: "Pipeline ponderado", v: fmtCLP(valorPonderado), sub: "× probabilidad", c: C.green },
          { l: "MRR potencial pond.", v: fmtCLP(mrrPotencial), sub: "mensual", c: C.purple },
          { l: "Conversión histórica", v: fmtPct(conversion), sub: `${ganadas.length} de ${cerradas.length}`, c: conversion > 0.4 ? C.green : C.amber },
        ].map((k) => (
          <div key={k.l} style={{ background: C.bg1, border: "1px solid " + C.border, borderRadius: 7, padding: "11px 13px" }}>
            <div style={{ fontSize: 9, color: C.textM, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: ff, fontWeight: 500 }}>{k.l}</div>
            <div style={{ fontSize: k.v.toString().length > 10 ? 15 : 18, fontWeight: 600, color: k.c, fontFamily: ff, marginTop: 4, fontVariantNumeric: "tabular-nums" }}>{k.v}</div>
            {k.sub && <div style={{ fontSize: 10, color: C.textM, fontFamily: ff, marginTop: 2 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, flexWrap: "wrap" }}>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar oportunidad..." style={{ padding: "7px 12px", border: "1px solid " + C.border, borderRadius: 6, background: C.bg1, color: C.text, fontSize: 13, fontFamily: ff, outline: "none", width: 240 }} />
        <Sel C={C} value={filtroEjec} onChange={setFiltroEjec} opts={[{ value: "todos", label: "Todos los ejecutivos" }, ...(ejecutivos || []).map((e) => ({ value: e, label: e }))]} />
        <span style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 0, background: C.bg2, padding: 2, borderRadius: 6, border: "1px solid " + C.border }}>
          {[
            ["kanban", "Kanban"],
            ["lista", "Lista"],
          ].map(([id, lbl]) => (
            <button key={id} onClick={() => setVista(id)} style={{ padding: "5px 14px", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: 600, background: vista === id ? C.blue : "transparent", color: vista === id ? "#fff" : C.textM, border: "none", fontFamily: ff }}>{lbl}</button>
          ))}
        </div>
      </div>

      {vista === "kanban" && (
        <div>
          {oportunidades.length === 0 ? (
            <EmptyState C={C} icon="·" title="Sin oportunidades" sub="Crea tu primera oportunidad para empezar a hacer seguimiento del pipeline comercial." action={!readonly && <Btn C={C} onClick={openNew}>+ Primera oportunidad</Btn>} />
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10, minHeight: 400 }}>
              {ETAPAS_OP.map((etapa) => {
                const ops = porEtapa[etapa] || [];
                const valorEt = ops.reduce((s, o) => s + (o.valorEstimado || 0), 0);
                const colE = COL_ETAPA[etapa];
                return (
                  <div key={etapa} style={{ background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <div style={{ padding: "10px 12px", borderBottom: "2px solid " + colE, background: C.bg2 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: colE, fontFamily: ff, textTransform: "uppercase", letterSpacing: "0.05em" }}>{etapa}</div>
                      <div style={{ fontSize: 10, color: C.textM, fontFamily: ff, marginTop: 2 }}>{ops.length} · {fmtCLP(valorEt)}</div>
                    </div>
                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 6, flex: 1, maxHeight: 520, overflowY: "auto" }}>
                      {ops.map((o) => {
                        const cli = clientes.find((c) => c.id === o.clienteId);
                        return (
                          <div key={o.id} onClick={() => setModal({ data: o })} style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, padding: "8px 10px", cursor: "pointer", fontFamily: ff }}>
                            <div style={{ fontSize: 11, fontWeight: 600, color: C.text, marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.titulo || "Sin título"}</div>
                            <div style={{ fontSize: 10, color: C.textM, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cli ? cli.razonSocial : "Sin cliente"}</div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 5, fontSize: 10 }}>
                              <span style={{ color: C.green, fontWeight: 600 }}>{fmtCLP(o.valorEstimado || 0)}</span>
                              <span style={{ color: colE, fontWeight: 600 }}>{o.probabilidad || 0}%</span>
                            </div>
                            {o.ejecutivo && <div style={{ fontSize: 9, color: C.textM, marginTop: 3 }}>👤 {o.ejecutivo}</div>}
                          </div>
                        );
                      })}
                      {ops.length === 0 && <div style={{ fontSize: 10, color: C.textM, fontFamily: ff, textAlign: "center", padding: "20px 0" }}>Sin oportunidades</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {vista === "lista" && (
        <div>
          {oportunidades.length === 0 ? (
            <EmptyState C={C} icon="·" title="Sin oportunidades" sub="Crea tu primera oportunidad." />
          ) : (
            <div style={{ background: C.bg1, border: "1px solid " + C.border, borderRadius: 7, overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: ff }}>
                <thead>
                  <tr style={{ background: C.bg2, borderBottom: "1px solid " + C.border }}>
                    {["Etapa", "Título", "Cliente", "Ejecutivo", "Valor", "MRR", "Prob.", "Cierre esperado", ""].map((h) => <th key={h} style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: C.textM, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((o, i) => {
                    const cli = clientes.find((c) => c.id === o.clienteId);
                    const colE = COL_ETAPA[o.etapa];
                    return (
                      <tr key={o.id} style={{ borderBottom: "1px solid " + C.border, background: i % 2 === 0 ? "transparent" : C.bg2, cursor: "pointer" }} onClick={() => setModal({ data: o })}>
                        <td style={{ padding: "8px 12px" }}><span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 12, background: colE + "22", color: colE, fontWeight: 600 }}>{o.etapa}</span></td>
                        <td style={{ padding: "8px 12px", fontWeight: 500, color: C.text }}>{o.titulo || "—"}</td>
                        <td style={{ padding: "8px 12px", color: C.textM }}>{cli?.razonSocial || "—"}</td>
                        <td style={{ padding: "8px 12px", color: C.textM, fontSize: 11 }}>{o.ejecutivo || "—"}</td>
                        <td style={{ padding: "8px 12px", fontWeight: 600, color: C.green, fontVariantNumeric: "tabular-nums" }}>{fmtCLP(o.valorEstimado || 0)}</td>
                        <td style={{ padding: "8px 12px", color: C.purple, fontVariantNumeric: "tabular-nums" }}>{o.mrrEstimado > 0 ? fmtCLP(o.mrrEstimado) : "—"}</td>
                        <td style={{ padding: "8px 12px", color: colE, fontWeight: 600 }}>{o.probabilidad || 0}%</td>
                        <td style={{ padding: "8px 12px", fontFamily: "monospace", color: C.textM, fontSize: 11 }}>{o.fechaCierreEsperado || "—"}</td>
                        <td style={{ padding: "8px 12px" }}>
                          {!readonly && o.etapa === "Ganado" && !o.propuestaId && <button onClick={(e) => { e.stopPropagation(); onConvertirAPropuesta(o); }} style={{ background: C.green + "22", color: C.green, border: "none", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontSize: 10, fontFamily: ff, fontWeight: 600 }}>→ Propuesta</button>}
                          {o.propuestaId && <span style={{ fontSize: 10, color: C.green, fontFamily: ff }}>✓ Propuesta</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modal && (
        <ModalOportunidad
          C={C}
          oportunidad={modal.data}
          clientes={clientes}
          instalaciones={instalaciones}
          ejecutivos={ejecutivos}
          propuestas={propuestas}
          onClose={() => setModal(null)}
          onSave={(o) => {
            onSave(o);
            setModal(null);
          }}
          onDelete={!readonly && modal.data?.id && oportunidades.find((x) => x.id === modal.data.id) ? (() => { onDelete(modal.data.id); setModal(null); }) : null}
          onConvertirAPropuesta={!readonly && modal.data?.etapa === "Ganado" && !modal.data?.propuestaId ? (() => { onConvertirAPropuesta(modal.data); setModal(null); }) : null}
          nextOpportunityNumber={nextOpportunityNumber}
        />
      )}
    </div>
  );
}

function ModalOportunidad({ C, oportunidad, clientes, instalaciones, ejecutivos, propuestas, onClose, onSave, onDelete, onConvertirAPropuesta, nextOpportunityNumber }) {
  const [form, setForm] = useState(oportunidad || {});
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const isEdit = !!oportunidad?.id && clientes;
  const instCli = instalaciones.filter((i) => i.clienteId === form.clienteId);
  const propVinc = propuestas?.find((p) => p.id === form.propuestaId);

  const cambiarEtapa = (nueva) => {
    const probaAuto = PROB_DEF[nueva] || 0;
    const hist = [...(form.historial || []), { fecha: new Date().toISOString(), accion: `Movida a ${nueva}` }];
    setForm((f) => ({ ...f, etapa: nueva, probabilidad: probaAuto, historial: hist }));
  };

  const guardar = () => {
    if (!form.titulo?.trim() && !form.clienteId) {
      alert("Indica al menos título o cliente");
      return;
    }
    const item = { ...form };
    if (!item.numero) item.numero = nextOpportunityNumber();
    onSave(item);
  };

  return (
    <Modal C={C} title={isEdit ? `Oportunidad ${form.numero || ""}` : "Nueva oportunidad"} onClose={onClose} width={680}>
      <div style={{ marginBottom: 14, padding: "10px 12px", background: C.bg2, border: "1px solid " + C.border, borderRadius: 6 }}>
        <div style={{ fontSize: 10, color: C.textM, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: ff, fontWeight: 500, marginBottom: 8 }}>Etapa</div>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {ETAPAS_OP.map((e) => {
            const colE = COL_ETAPA[e];
            const on = form.etapa === e;
            return <button key={e} onClick={() => cambiarEtapa(e)} style={{ padding: "6px 12px", borderRadius: 20, border: "1px solid " + (on ? colE : C.border), background: on ? colE + "22" : "transparent", color: on ? colE : C.textM, fontSize: 11, fontWeight: on ? 600 : 400, cursor: "pointer", fontFamily: ff }}>{e}</button>;
          })}
        </div>
      </div>

      <Fld C={C} label="Título de la oportunidad *"><Inp C={C} value={form.titulo || ""} onChange={(v) => sf("titulo", v)} placeholder="Ej: Renovación CCTV planta Cosmito" /></Fld>

      <G cols={2}>
        <Fld C={C} label="Cliente"><SelBusca C={C} value={form.clienteId || ""} onChange={(v) => { sf("clienteId", v); sf("instalacionId", ""); }} opts={[{ value: "", label: "— Seleccionar —" }, ...clientes.map((c) => ({ value: c.id, label: c.razonSocial }))]} /></Fld>
        <Fld C={C} label="Instalación">
          <Sel C={C} value={form.instalacionId || ""} onChange={(v) => sf("instalacionId", v)} opts={[{ value: "", label: "— Sin instalación —" }, ...instCli.map((i) => ({ value: i.id, label: i.nombre || i.direccion || "Sin nombre" }))]} disabled={!form.clienteId} />
        </Fld>
      </G>

      <G cols={2}>
        <Fld C={C} label="Ejecutivo"><Sel C={C} value={form.ejecutivo || ""} onChange={(v) => sf("ejecutivo", v)} opts={[{ value: "", label: "— Sin asignar —" }, ...(ejecutivos || []).map((e) => ({ value: e, label: e }))]} /></Fld>
        <Fld C={C} label="Origen del lead"><Inp C={C} value={form.origenLead || ""} onChange={(v) => sf("origenLead", v)} placeholder="Web, recomendación, evento..." /></Fld>
      </G>

      <G cols={3}>
        <Fld C={C} label="Valor estimado proyecto" suffix="CLP"><Inp C={C} value={form.valorEstimado || ""} onChange={(v) => sf("valorEstimado", +v || 0)} type="number" /></Fld>
        <Fld C={C} label="MRR estimado" suffix="CLP/mes"><Inp C={C} value={form.mrrEstimado || ""} onChange={(v) => sf("mrrEstimado", +v || 0)} type="number" /></Fld>
        <Fld C={C} label="Probabilidad" suffix="%"><Inp C={C} value={form.probabilidad || ""} onChange={(v) => sf("probabilidad", Math.min(100, Math.max(0, +v || 0)))} type="number" /></Fld>
      </G>

      <G cols={2}>
        <Fld C={C} label="Fecha contacto"><Inp C={C} value={form.fechaContacto || ""} onChange={(v) => sf("fechaContacto", v)} type="date" /></Fld>
        <Fld C={C} label="Cierre esperado"><Inp C={C} value={form.fechaCierreEsperado || ""} onChange={(v) => sf("fechaCierreEsperado", v)} type="date" /></Fld>
      </G>

      <Fld C={C} label="Notas">
        <textarea value={form.notas || ""} onChange={(e) => sf("notas", e.target.value)} rows={3} style={{ width: "100%", padding: "8px 11px", background: C.bg0, border: "1px solid " + C.border, borderRadius: 5, fontSize: 13, color: C.text, fontFamily: ff, resize: "vertical", boxSizing: "border-box" }} />
      </Fld>

      {propVinc && <div style={{ padding: "8px 12px", background: C.green + "11", border: "1px solid " + C.green + "44", borderRadius: 6, marginTop: 8, fontSize: 11, color: C.green, fontFamily: ff }}>✓ Vinculada a propuesta: <b>{propVinc.numero || propVinc.nombre}</b></div>}

      {form.historial?.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: 11, color: C.textM, fontFamily: ff, fontWeight: 500 }}>Historial ({form.historial.length})</summary>
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4, maxHeight: 120, overflowY: "auto" }}>
            {[...form.historial].reverse().map((h, i) => <div key={i} style={{ fontSize: 10, color: C.textM, fontFamily: ff, padding: "4px 8px", background: C.bg2, borderRadius: 4 }}><span style={{ fontFamily: "monospace" }}>{h.fecha?.slice(0, 16).replace("T", " ")}</span> · {h.accion}</div>)}
          </div>
        </details>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 18 }}>
        <div>{onDelete && <Btn C={C} ghost color={C.red} onClick={() => { if (window.confirm("¿Eliminar esta oportunidad?")) onDelete(); }}>🗑 Eliminar</Btn>}</div>
        <div style={{ display: "flex", gap: 8 }}>
          {onConvertirAPropuesta && <Btn C={C} color={C.green} onClick={onConvertirAPropuesta}>Solicitar cotización</Btn>}
          <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
          <Btn C={C} onClick={guardar}>{isEdit ? "Guardar" : "Crear oportunidad"}</Btn>
        </div>
      </div>
    </Modal>
  );
}
