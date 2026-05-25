import { useMemo } from "react";
import { COL_E, ff } from "../config/appConstants";
import { Bdg, Btn } from "../components/ui";
import { calcProp } from "../domain/commercial";
import { calcServiciosKpis } from "../domain/recurringServices";
import { fmtCLP, fmtPct } from "../utils/formatters";

export default function ExecutiveDashboard({ C, clientes, propuestas, proyectos, servicios, eventosServicio, params, incidencias, fichajes, registrosHoras, tecnicos, contratistas, oportunidades, onGoTab }) {
  const aprobadas = useMemo(() => propuestas.filter((p) => p.estado === "Aprobada").map((p) => ({ ...p, _c: calcProp(p, params) })), [propuestas, params]);
  const mrrTotal = aprobadas.reduce((a, p) => a + (p._c?.iRec || 0), 0);
  const mrrC = aprobadas.reduce((a, p) => a + (p._c?.iC || 0), 0);
  const mrrV = aprobadas.reduce((a, p) => a + (p._c?.iV || 0), 0);
  const mrrA = aprobadas.reduce((a, p) => a + (p._c?.iA || 0), 0);
  const kServ = calcServiciosKpis(servicios || []);
  const mrrOperativo = kServ.mrrActivo || mrrTotal;
  const projList = aprobadas.filter((p) => p._c?.tieneProj);
  const ventaProyectos = projList.reduce((a, p) => a + (p.valorFinal || p.valorProyecto || 0), 0);
  const oportunidadesActivas = (oportunidades || []).filter((o) => !["Ganado", "Perdido"].includes(o.etapa));
  const pipelineAbierto = oportunidadesActivas.reduce((s, o) => s + (o.valorEstimado || 0), 0);
  const pipelinePonderado = oportunidadesActivas.reduce((s, o) => s + (o.valorEstimado || 0) * (o.probabilidad || 0) / 100, 0);
  const etapas = ["Lead", "Calificado", "Propuesta", "Negociación", "Ganado", "Perdido"];
  const colEtapa = { Lead: C.textM, Calificado: C.blue, Propuesta: C.purple, Negociación: C.amber, Ganado: C.green, Perdido: C.red };
  const pipelinePorEtapa = etapas.map((e) => {
    const ops = (oportunidades || []).filter((o) => o.etapa === e);
    return { etapa: e, count: ops.length, valor: ops.reduce((s, o) => s + (o.valorEstimado || 0), 0), color: colEtapa[e] };
  });
  const proyConCostos = proyectos.filter((p) => (p.costos || []).length > 0).map((p) => {
    const directo = (p.costos || []).reduce((s, c) => s + (c.total || 0), 0);
    const total = directo + directo * ((p.pctGG ?? params.pctGG ?? 10) / 100) + directo * ((p.pctImp ?? params.pctImp ?? 5) / 100);
    const utilidad = (p.valorVendido || 0) - total;
    const margen = (p.valorVendido || 0) > 0 ? utilidad / (p.valorVendido || 0) : 0;
    return { ...p, _r: { total, utilidad, margen } };
  });
  const utilidadReal = proyConCostos.reduce((s, p) => s + p._r.utilidad, 0);
  const margenProm = proyConCostos.length ? proyConCostos.reduce((s, p) => s + p._r.margen, 0) / proyConCostos.length : 0;
  const margenMin = (params.pctMargenMinimo || 15) / 100;
  const bajoMin = proyConCostos.filter((p) => p._r.margen >= 0 && p._r.margen < margenMin).length;
  const incCriticas = (incidencias || []).filter((i) => i.estado === "Abierta" && (i.prioridad === "Crítica" || i.prioridad === "Alta"));
  const eventosServicioAbiertos = (eventosServicio || []).filter((e) => e.estado !== "Cerrado");
  const serviciosPorActivar = (servicios || []).filter((s) => s.estado === "En activación");
  const horasPend = (registrosHoras || []).filter((r) => r.estado === "pendiente" || !r.estado);
  const solPend = proyectos.flatMap((p) => (p.solicitudesMaterial || []).filter((s) => s.estado === "pendiente"));
  const cierresPend = proyectos.filter((p) => {
    const ts = p.tareas || [];
    return ts.length > 0 && ts.every((t) => t.estado === "Completada") && !["Cerrado", "Cerrado técnicamente"].includes(p.estadoOp);
  });
  const totalAlertas = incCriticas.length + eventosServicioAbiertos.length + horasPend.length + solPend.length + cierresPend.length + serviciosPorActivar.length;
  const personal = [ ...(tecnicos || []), ...(contratistas || []).map((c) => ({ ...c, _cont: true })) ].filter((p) => p.activo !== false);
  const fichajesActivos = (fichajes || []).filter((f) => f.estado === "activo");
  const recent = [ ...propuestas ].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")).slice(0, 4);
  const fecha = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" });
  const hora = new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const panel = { background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, padding: 22, boxShadow: C.isLight ? "0 10px 26px rgba(20,35,55,0.05)" : "none" };
  const compactMoney = (v) => {
    if (typeof v !== "string" || !v.startsWith("$")) return v;
    const n = Number(v.replace(/[^\d-]/g, ""));
    if (!Number.isFinite(n)) return v;
    if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toLocaleString("es-CL", { maximumFractionDigits: 1 }) + "M";
    if (Math.abs(n) >= 1000) return "$" + Math.round(n / 1000).toLocaleString("es-CL") + "K";
    return v.replace("$ ", "$");
  };
  const K = ({ label, value, sub, color }) => <div className="assur-stat" style={{ background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, padding: "20px 22px", minHeight: 150, display: "flex", flexDirection: "column", justifyContent: "space-between", boxShadow: C.isLight ? "0 8px 20px rgba(20,35,55,0.05)" : "none" }}>
    <div style={{ fontSize: 11, color: C.textM, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900, fontFamily: ff, lineHeight: 1.25 }}>{label}</div>
    <div><div style={{ fontSize: String(value).length > 14 ? 32 : 38, fontWeight: 900, color: color || C.text, fontFamily: ff, lineHeight: 0.98, letterSpacing: "-0.01em" }}>{compactMoney(value)}</div>{sub && <div style={{ fontSize: 14, color: C.textM, fontFamily: ff, marginTop: 9, lineHeight: 1.3, fontWeight: 650 }}>{sub}</div>}</div>
  </div>;

  return <div>
    <div className="assur-kpi-grid" style={{ marginBottom: 22 }}>
      <K label="Venta proyectos" value={fmtCLP(ventaProyectos)} color={C.blue} sub={`${projList.length} proyectos aprobados`} />
      <K label="Pipeline ponderado" value={fmtCLP(pipelinePonderado)} color={C.green} sub="oportunidades × probabilidad" />
      <K label="Proyectos activos" value={String(proyectos.filter((p) => !["Cerrado", "Cerrado técnicamente"].includes(p.estadoOp)).length)} color={C.textS} sub={`${proyectos.length} proyectos totales`} />
      <K label="Alertas operativas" value={String(totalAlertas)} color={totalAlertas ? C.amber : C.green} sub={totalAlertas ? "requieren atención" : "todo al día"} />
    </div>

    <div className="assur-two-col" style={{ marginBottom: 22 }}>
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", marginBottom: 18 }}>
          <div><div style={{ fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900, fontFamily: ff, marginBottom: 8 }}>Vista ejecutiva</div><div style={{ fontSize: 28, fontWeight: 900, color: C.text, fontFamily: ff, lineHeight: 1.12 }}>Buenos días</div><div style={{ fontSize: 15, color: C.textM, fontFamily: ff, textTransform: "capitalize", marginTop: 5 }}>{fecha} · {hora}</div></div>
          {onGoTab && <Btn C={C} small onClick={() => onGoTab("analisis")}>Ver análisis</Btn>}
        </div>
        <div className="assur-two-col" style={{ gap: 14 }}>
          <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 9, padding: "17px 18px", minHeight: 136 }}>
            <div style={{ fontSize: 11, color: C.textM, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900, fontFamily: ff, marginBottom: 18 }}>Requiere tu atención hoy</div>
            {totalAlertas === 0 ? <div style={{ fontSize: 17, color: C.textS, fontWeight: 850, fontFamily: ff, display: "flex", alignItems: "center", minHeight: 64, lineHeight: 1.25 }}>Todo al día. Sin pendientes que requieran tu acción.</div> : <div style={{ display: "grid", gap: 11 }}>
              {[["Incidencias críticas", incCriticas.length, C.red], ["Eventos monitoreo", eventosServicioAbiertos.length, C.red], ["Servicios por activar", serviciosPorActivar.length, C.amber], ["Horas por aprobar", horasPend.length, C.amber], ["Solicitudes material", solPend.length, C.purple], ["Cierres técnicos", cierresPend.length, C.green]].filter((x) => x[1] > 0).map(([l, n, c]) => <div key={l} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontFamily: ff }}><span style={{ fontSize: 13, color: C.textS, fontWeight: 800 }}>{l}</span><span style={{ fontSize: 15, color: c, fontWeight: 900 }}>{n}</span></div>)}
            </div>}
          </div>
          <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 9, padding: "17px 18px", minHeight: 136 }}>
            <div style={{ fontSize: 11, color: C.textM, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900, fontFamily: ff, marginBottom: 18 }}>Equipo hoy</div>
            {personal.length === 0 ? <div style={{ fontSize: 15, color: C.textS, fontWeight: 800, fontFamily: ff }}>Sin personal cargado</div> : <div style={{ display: "grid", gap: 10 }}>
              {personal.slice(0, 5).map((t) => { const activo = fichajesActivos.find((f) => f.tecnicoId === t.id); return <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 9, height: 9, borderRadius: 9, background: activo ? C.green : C.borderL, flexShrink: 0 }} /><div style={{ minWidth: 0 }}><div style={{ fontSize: 13, color: C.text, fontWeight: 900, fontFamily: ff, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.nombre}</div><div style={{ fontSize: 11, color: C.textM, fontFamily: ff }}>{activo ? "Activo en terreno" : "Sin actividad hoy"}</div></div></div>; })}
            </div>}
          </div>
        </div>
      </div>
      <div style={panel}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 18 }}><div><div style={{ fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 900, fontFamily: ff, marginBottom: 8 }}>Pipeline</div><div style={{ fontSize: 22, fontWeight: 900, color: C.text, fontFamily: ff }}>Oportunidades</div></div>{onGoTab && <Btn C={C} ghost small onClick={() => onGoTab("pipeline")}>Abrir</Btn>}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>{[["Abierto", fmtCLP(pipelineAbierto), C.text], ["Ponderado", fmtCLP(pipelinePonderado), C.green]].map(([l, v, c]) => <div key={l} style={{ background: C.bg2, borderRadius: 8, padding: "15px 16px", border: "1px solid " + C.border }}><div style={{ fontSize: 11, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 900 }}>{l}</div><div style={{ fontSize: 24, color: c, fontWeight: 900, marginTop: 6, lineHeight: 1 }}>{compactMoney(v)}</div></div>)}</div>
        <div style={{ display: "grid", gap: 10 }}>{pipelinePorEtapa.filter((d) => d.count > 0).slice(0, 5).map((d) => { const max = Math.max(1, ...pipelinePorEtapa.map((x) => x.valor)); return <div key={d.etapa}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 900, color: C.textS, fontFamily: ff, marginBottom: 5 }}><span>{d.etapa}</span><span style={{ color: d.color }}>{d.count}</span></div><div style={{ height: 7, background: C.bg2, borderRadius: 10, overflow: "hidden" }}><div style={{ height: "100%", width: (d.valor / max * 100) + "%", background: d.color, borderRadius: 10 }} /></div></div>; })}{pipelinePorEtapa.every((d) => d.count === 0) && <div style={{ fontSize: 14, color: C.textM, fontFamily: ff }}>Sin oportunidades activas.</div>}</div>
      </div>
    </div>

    <div className="assur-three-col" style={{ marginBottom: 22 }}>
      <div style={panel}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 14 }}><div style={{ fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 900, fontFamily: ff }}>Ingresos recurrentes</div>{onGoTab && <Btn C={C} ghost small onClick={() => onGoTab("servicios")}>Servicios</Btn>}</div><div style={{ fontSize: 40, color: C.green, fontWeight: 900, fontFamily: ff, lineHeight: 1 }}>{compactMoney(fmtCLP(mrrOperativo))}</div><div style={{ fontSize: 14, color: C.textM, fontFamily: ff, marginTop: 10, fontWeight: 650 }}>{kServ.activos.length ? `MRR activo · ${fmtCLP(mrrOperativo * 12)} anual` : `MRR aprobado · ${fmtCLP(mrrTotal * 12)} anual`}</div><div style={{ display: "grid", gap: 13, marginTop: 20 }}>{(kServ.activos.length ? [["Activo", kServ.mrrActivo, C.green], ["En activación", kServ.mrrActivacion, C.amber], ["Suspendido/falla", kServ.mrrSuspendido, C.red]] : [["Cámaras", mrrC, C.blue], ["Video verif.", mrrV, C.purple], ["Alarmas", mrrA, C.amber]]).map(([l, v, c]) => <div key={l}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.textS, fontWeight: 900, marginBottom: 5 }}><span>{l}</span><span style={{ color: c }}>{fmtCLP(v)}</span></div><div style={{ height: 8, background: C.bg2, borderRadius: 10, overflow: "hidden" }}><div style={{ height: "100%", width: (mrrOperativo > 0 ? v / mrrOperativo * 100 : 0) + "%", background: c, borderRadius: 10 }} /></div></div>)}</div></div>
      <div style={panel}><div style={{ fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 900, fontFamily: ff, marginBottom: 14 }}>Rentabilidad</div><div style={{ fontSize: 13, color: C.textM, fontWeight: 900 }}>Margen real promedio</div><div style={{ fontSize: 34, color: margenProm >= margenMin ? C.green : margenProm >= 0 ? C.amber : C.red, fontWeight: 900, marginBottom: 14 }}>{proyConCostos.length ? fmtPct(margenProm) : "—"}</div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{[["Utilidad real", fmtCLP(utilidadReal), utilidadReal >= 0 ? C.green : C.red], ["Bajo mínimo", String(bajoMin), bajoMin ? C.amber : C.green]].map(([l, v, c]) => <div key={l} style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 8, padding: "12px" }}><div style={{ fontSize: 10, color: C.textM, textTransform: "uppercase", fontWeight: 900 }}>{l}</div><div style={{ fontSize: 18, color: c, fontWeight: 900, marginTop: 5 }}>{v}</div></div>)}</div></div>
      <div style={panel}><div style={{ fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 900, fontFamily: ff, marginBottom: 14 }}>Último movimiento</div>{recent.length === 0 ? <div style={{ fontSize: 14, color: C.textM, fontFamily: ff }}>Sin propuestas recientes.</div> : <div style={{ display: "grid", gap: 12 }}>{recent.map((p) => { const cl = clientes.find((c) => c.id === p.clienteId); return <div key={p.id} style={{ borderBottom: "1px solid " + C.border, paddingBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}><div style={{ fontSize: 14, color: C.text, fontWeight: 900, fontFamily: ff, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.nombre || "—"}</div><Bdg color={COL_E[p.estado] || "#64748B"} small>{p.estado || "Borrador"}</Bdg></div><div style={{ fontSize: 12, color: C.textM, fontFamily: ff, marginTop: 3 }}>{cl?.razonSocial || cl?.nombreComercial || "Sin cliente"}</div></div>; })}</div>}</div>
    </div>
  </div>;
}
