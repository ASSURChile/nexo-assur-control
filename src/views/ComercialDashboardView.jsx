import { ff, COL_E } from "../config/appConstants";
import { Bdg, Btn, EmptyState, ModuleHero, QuickActions, STitle, WorkflowSteps } from "../components/ui";

const COL_ETAPA = {
  Lead: "#94A3B8",
  Calificado: "#3B82F6",
  Propuesta: "#8B5CF6",
  Negociación: "#F59E0B",
  Ganado: "#10B981",
  Perdido: "#EF4444",
};

const fmtCLP = (n) => (!n && n !== 0 ? "—" : "$ " + Math.round(n).toLocaleString("es-CL"));
const fmtPct = (n) => (n * 100).toFixed(1) + "%";

export default function ComercialDashboardView({ C, oportunidades, propuestas, clientes, onGoTab }) {
  const activas = (oportunidades || []).filter((o) => !["Ganado", "Perdido"].includes(o.etapa));
  const valorPond = activas.reduce((s, o) => s + ((o.valorEstimado || 0) * (o.probabilidad || 0)) / 100, 0);
  const mrrPond = activas.reduce((s, o) => s + ((o.mrrEstimado || 0) * (o.probabilidad || 0)) / 100, 0);
  const enviadas = (propuestas || []).filter((p) => ["Enviada", "Aprobada", "Rechazada"].includes(p.estado));
  const aprobadas = (propuestas || []).filter((p) => p.estado === "Aprobada");
  const conv = enviadas.length ? aprobadas.length / enviadas.length : 0;
  const porEstado = ["Borrador", "En revisión", "Enviada", "Aprobada", "Rechazada", "Vencida"].map((e) => ({
    estado: e,
    count: (propuestas || []).filter((p) => p.estado === e).length,
    color: COL_E[e] || "#64748B",
  }));
  const acciones = [...activas].filter((o) => o.fechaCierreEsperado).sort((a, b) => (a.fechaCierreEsperado || "").localeCompare(b.fechaCierreEsperado || "")).slice(0, 8);
  const borradores = (propuestas || []).filter((p) => p.estado === "Borrador").length;
  const revision = (propuestas || []).filter((p) => p.estado === "En revisión").length;
  const card = { background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, padding: "14px 16px" };
  return (
    <div>
      <ModuleHero
        C={C}
        eyebrow="Comercial"
        title="Venta consultiva y seguimiento"
        subtitle="Ordena el día comercial desde el pipeline hacia propuestas aprobables. Menos lectura, más acción: revisar oportunidades, terminar borradores y empujar cierres."
        actions={onGoTab && <Btn C={C} small onClick={() => onGoTab("pipeline")}>Abrir pipeline</Btn>}
      >
        <WorkflowSteps C={C} active={Math.min(3, [clientes.length>0, activas.length>0, enviadas.length>0, aprobadas.length>0].filter(Boolean).length)} steps={["Cliente", "Oportunidad", "Propuesta", "Proyecto"]}/>
        <div style={{marginTop:12}}>
          <QuickActions C={C} items={[
            {label:`${activas.length} oportunidades activas`,description:"Negocios en curso",tone:C.blue,onClick:()=>onGoTab&&onGoTab("pipeline")},
            {label:`${borradores} borradores`,description:"Propuestas por terminar",tone:borradores?C.amber:C.green,onClick:()=>onGoTab&&onGoTab("propuestas")},
            {label:`${revision} en revisión`,description:"Requieren aprobación",tone:revision?C.amber:C.green,onClick:()=>onGoTab&&onGoTab("propuestas")},
            {label:`${clientes.length} clientes`,description:"Cartera comercial",tone:C.green,onClick:()=>onGoTab&&onGoTab("clientes")},
          ]}/>
        </div>
      </ModuleHero>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 10, marginBottom: 14 }}>
        {[
          ["Oportunidades activas", activas.length, C.blue, ""],
          ["Pipeline ponderado", fmtCLP(valorPond), C.green, "valor × probabilidad"],
          ["MRR ponderado", fmtCLP(mrrPond), C.purple, "mensual"],
          ["Propuestas enviadas", enviadas.length, C.amber, `${aprobadas.length} aprobadas`],
          ["Conversión", fmtPct(conv), conv > 0.45 ? C.green : conv > 0.25 ? C.amber : C.red, "aprobadas / enviadas"],
        ].map(([l, v, col, sub]) => (
          <div key={l} style={card}>
            <div style={{ fontSize: 9, color: C.textM, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: ff, fontWeight: 600 }}>{l}</div>
            <div style={{ fontSize: String(v).length > 12 ? 15 : 22, fontWeight: 700, color: col, fontFamily: ff, marginTop: 4 }}>{v}</div>
            {sub && <div style={{ fontSize: 10, color: C.textM, fontFamily: ff, marginTop: 2 }}>{sub}</div>}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <STitle C={C}>Propuestas por estado</STitle>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {porEstado.map((d) => (
              <div key={d.estado}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: ff, marginBottom: 3 }}>
                  <span style={{ color: C.textS }}>{d.estado}</span>
                  <span style={{ color: d.color, fontWeight: 700 }}>{d.count}</span>
                </div>
                <div style={{ height: 5, background: C.border, borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: (d.count / Math.max(1, ...porEstado.map((x) => x.count))) * 100 + "%", background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={card}>
          <STitle C={C}>Próximas acciones comerciales</STitle>
          {acciones.length === 0 ? (
            <EmptyState C={C} icon="·" title="Sin acciones próximas" sub="Las oportunidades con cierre esperado aparecerán aquí." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {acciones.map((o) => {
                const cli = clientes.find((c) => c.id === o.clienteId);
                return (
                  <div key={o.id} style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, padding: "9px 11px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: ff }}>{o.titulo || "Oportunidad"}</div>
                      <Bdg color={COL_ETAPA[o.etapa] || C.blue} small>{o.probabilidad || 0}%</Bdg>
                    </div>
                    <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginTop: 3 }}>{cli?.razonSocial || "Sin cliente"} · cierre {o.fechaCierreEsperado || "—"} · {fmtCLP(o.valorEstimado || 0)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
