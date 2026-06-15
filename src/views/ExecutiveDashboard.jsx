import { useMemo } from "react";
import { COL_E, ff } from "../config/appConstants";
import { Btn } from "../components/ui";
import { calcProp } from "../domain/commercial";
import { calcServiciosKpis } from "../domain/recurringServices";
import { rolLabel } from "../domain/roles";
import { fmtCLP, fmtPct } from "../utils/formatters";

const PIPELINE_STAGES = ["Lead", "Calificado", "Propuesta", "Negociación"];
const CLOSED_PROJECT = ["Cerrado", "Cerrado técnicamente"];
const CLOSED_ISSUE = ["Cerrada", "Resuelta"];

function moneyCompact(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "$0";
  if (Math.abs(n) >= 1000000) return "$" + (n / 1000000).toLocaleString("es-CL", { maximumFractionDigits: 1 }) + "M";
  if (Math.abs(n) >= 1000) return "$" + Math.round(n / 1000).toLocaleString("es-CL") + "K";
  return fmtCLP(n).replace("$ ", "$");
}

function numberOrDash(value) {
  return Number(value || 0).toLocaleString("es-CL");
}

function isOverdue(date, today) {
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  return d < today;
}

function isNext30(date, today) {
  if (!date) return false;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return false;
  const limit = new Date(today);
  limit.setDate(limit.getDate() + 30);
  return d >= today && d <= limit;
}

function itemAmount(item) {
  return Number(item?.saldo ?? item?.montoPendiente ?? item?.pendiente ?? item?.total ?? item?.monto ?? item?.valor ?? 0);
}

function RolePanelHeader({ C, role, title, subtitle, cta, onGoTab }) {
  const first = title.split(" ")[0];
  const orange = C.orange || "#E17327";
  return (
    <div className="assur-page-title-row" style={{ marginBottom: 22 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ marginBottom: 7, color: orange, fontSize: 11, fontWeight: 950, letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: ff }}>
          Panel diario · {rolLabel(role)}
        </div>
        <h1 style={{ margin: 0, color: C.text, fontSize: 31, lineHeight: 1.08, fontWeight: 950, fontFamily: ff, letterSpacing: 0 }}>{title}</h1>
        <p style={{ maxWidth: 760, margin: "8px 0 0", color: C.textM, fontSize: 14, fontFamily: ff, lineHeight: 1.45 }}>
          {subtitle || `Vista de trabajo ${first.toLowerCase()} con foco en pendientes, riesgos y próximas acciones.`}
        </p>
      </div>
      {cta?.tab && onGoTab && <Btn C={C} color={orange} onClick={() => onGoTab(cta.tab)}>{cta.label}</Btn>}
    </div>
  );
}

function DashboardKpiGrid({ C, items = [] }) {
  return (
    <div className="assur-kpi-grid" style={{ marginBottom: 18 }}>
      {items.slice(0, 4).map((item) => (
        <div key={item.label} className="assur-stat" style={{
          background: C.isLight ? "#FFFFFF" : "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.045))",
          border: "1px solid " + (C.isLight ? C.border : "rgba(210,226,245,0.13)"),
          borderRadius: 18,
          padding: 18,
          minWidth: 0,
          minHeight: 142,
          overflow: "hidden",
          boxShadow: C.isLight ? "0 14px 30px rgba(23,34,53,0.055)" : "inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 40px rgba(0,0,0,0.18)",
        }}>
          <div style={{ minHeight: 30, fontSize: 10.5, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 950, fontFamily: ff, lineHeight: 1.3 }}>{item.label}</div>
          <div style={{ marginTop: 14, fontSize: String(item.value).length > 8 ? 26 : 31, fontWeight: 950, color: item.color || C.text, fontFamily: ff, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {item.value}
          </div>
          {item.sub && <div style={{ fontSize: 12.5, color: C.textM, fontFamily: ff, marginTop: 10, lineHeight: 1.35, fontWeight: 650 }}>{item.sub}</div>}
        </div>
      ))}
    </div>
  );
}

function Badge({ C, children, tone }) {
  const color = tone || C.orange || "#E17327";
  return (
    <span style={{ borderRadius: 999, padding: "6px 10px", background: color + "18", color, fontSize: 10.5, fontWeight: 950, letterSpacing: "0.03em", textTransform: "uppercase", whiteSpace: "nowrap", fontFamily: ff, maxWidth: 142, overflow: "hidden", textOverflow: "ellipsis", flexShrink: 0 }}>
      {children}
    </span>
  );
}

function PanelCard({ C, eyebrow, title, children, actionLabel, actionTab, onGoTab }) {
  const orange = C.orange || "#E17327";
  return (
    <div style={{
      background: C.isLight ? "#FFFFFF" : "linear-gradient(180deg, rgba(255,255,255,0.075), rgba(255,255,255,0.045))",
      border: "1px solid " + (C.isLight ? C.border : "rgba(210,226,245,0.13)"),
      borderRadius: 18,
      padding: 20,
      minWidth: 0,
      overflow: "hidden",
      boxShadow: C.isLight ? "0 14px 30px rgba(23,34,53,0.055)" : "inset 0 1px 0 rgba(255,255,255,0.06), 0 18px 40px rgba(0,0,0,0.18)",
    }}>
      {eyebrow && <div style={{ color: orange, fontSize: 10.5, fontWeight: 950, letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: ff }}>{eyebrow}</div>}
      {title && <h2 style={{ margin: "7px 0 16px", color: C.text, fontSize: 20, lineHeight: 1.15, fontWeight: 950, fontFamily: ff }}>{title}</h2>}
      {children}
      {actionLabel && actionTab && onGoTab && <button onClick={() => onGoTab(actionTab)} style={{ marginTop: 16, border: 0, background: "transparent", color: orange, fontSize: 12, fontWeight: 950, letterSpacing: "0.05em", textTransform: "uppercase", cursor: "pointer", fontFamily: ff }}>{actionLabel}</button>}
    </div>
  );
}

function DecisionList({ C, items = [], emptyTitle = "Todo al día" }) {
  const list = items.filter(Boolean).slice(0, 5);
  if (!list.length) {
    return <div style={{ border: "1px dashed " + C.border, borderRadius: 14, padding: 18, color: C.textM, fontSize: 13, fontFamily: ff, lineHeight: 1.45 }}>{emptyTitle}</div>;
  }
  return (
    <div>
      {list.map((item) => (
        <div key={item.title} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "12px 0", borderBottom: "1px solid " + (C.isLight ? C.border : "rgba(219,230,243,0.1)") }}>
          <div style={{ minWidth: 0 }}>
            <strong style={{ display: "block", color: C.text, fontSize: 13.5, fontFamily: ff, lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis" }}>{item.title}</strong>
            {item.sub && <span style={{ display: "block", marginTop: 2, color: C.textM, fontSize: 12, fontFamily: ff, lineHeight: 1.35 }}>{item.sub}</span>}
          </div>
          <Badge C={C} tone={item.tone}>{item.badge}</Badge>
        </div>
      ))}
    </div>
  );
}

function StatusFlow({ C, rows = [] }) {
  return (
    <div>
      {rows.slice(0, 6).map((row) => (
        <div key={row.label} style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 12, alignItems: "center", padding: "11px 0", borderBottom: "1px solid " + (C.isLight ? C.border : "rgba(219,230,243,0.1)") }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: C.text, fontSize: 13.5, fontWeight: 850, fontFamily: ff, lineHeight: 1.25 }}>{row.label}</div>
            {row.sub && <div style={{ color: C.textM, fontSize: 11.5, fontFamily: ff, marginTop: 2 }}>{row.sub}</div>}
          </div>
          <Badge C={C} tone={row.tone}>{row.value}</Badge>
        </div>
      ))}
    </div>
  );
}

function PipelineSummary({ C, stages = [], detailed = false }) {
  const orange = C.orange || "#E17327";
  const orangeD = C.orangeD || "#C55A1B";
  const max = Math.max(1, ...stages.map((s) => s.amount));
  const total = stages.reduce((sum, s) => sum + s.amount, 0);
  const weighted = stages.reduce((sum, s) => sum + s.weighted, 0);
  const count = stages.reduce((sum, s) => sum + s.count, 0);

  if (!detailed) {
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10 }}>
        {[
          ["Oportunidades", numberOrDash(count), C.blue],
          ["Pipeline total", moneyCompact(total), orange],
          ["Ponderado", moneyCompact(weighted), C.green],
        ].map(([label, value, color]) => (
          <div key={label} style={{ minWidth: 0, background: C.isLight ? C.bg2 : "rgba(255,255,255,0.045)", border: "1px solid " + (C.isLight ? C.border : "rgba(210,226,245,0.1)"), borderRadius: 12, padding: 12 }}>
            <div style={{ fontSize: 10, color: C.textM, textTransform: "uppercase", fontWeight: 950, lineHeight: 1.25 }}>{label}</div>
            <div style={{ fontSize: 18, color, fontWeight: 950, marginTop: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 13 }}>
      {stages.map((stage) => (
        <div key={stage.stage}>
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "end", marginBottom: 6 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: C.text, fontSize: 13.5, fontWeight: 900, fontFamily: ff }}>{stage.stage}</div>
              <div style={{ color: C.textM, fontSize: 11.5, fontFamily: ff, marginTop: 1 }}>{stage.count} oportunidades · {moneyCompact(stage.weighted)} ponderado</div>
            </div>
            <div style={{ color: C.text, fontSize: 13, fontWeight: 950, fontFamily: ff, whiteSpace: "nowrap" }}>{moneyCompact(stage.amount)}</div>
          </div>
          <div style={{ height: 7, borderRadius: 999, overflow: "hidden", background: C.isLight ? C.bg3 : "rgba(255,255,255,0.07)" }}>
            <div style={{ width: (stage.amount / max * 100) + "%", height: "100%", borderRadius: 999, background: "linear-gradient(90deg," + orangeD + "," + orange + ")" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExecutiveDashboard({
  C,
  role = "admin",
  sessionName = "Moisés",
  clientes = [],
  propuestas = [],
  proyectos = [],
  servicios = [],
  eventosServicio = [],
  params = {},
  incidencias = [],
  fichajes = [],
  registrosHoras = [],
  tecnicos = [],
  contratistas = [],
  oportunidades = [],
  facturas = [],
  cuentasPagar = [],
  materiales = [],
  onGoTab,
}) {
  const data = useMemo(() => {
    const today = new Date();
    const approved = propuestas.filter((p) => p.estado === "Aprobada").map((p) => ({ ...p, _c: calcProp(p, params) }));
    const serviceKpis = calcServiciosKpis(servicios || []);
    const activeOpps = (oportunidades || []).filter((o) => !["Ganado", "Perdido"].includes(o.etapa));
    const stageRows = PIPELINE_STAGES.map((stage) => {
      const rows = activeOpps.filter((o) => o.etapa === stage);
      const amount = rows.reduce((sum, o) => sum + Number(o.valorEstimado || 0), 0);
      const weighted = rows.reduce((sum, o) => sum + Number(o.valorEstimado || 0) * Number(o.probabilidad || 0) / 100, 0);
      return { stage, count: rows.length, amount, weighted };
    });
    const projectApproved = approved.filter((p) => p._c?.tieneProj);
    const projectSales = projectApproved.reduce((sum, p) => sum + Number(p.valorFinal || p.valorProyecto || 0), 0);
    const activeProjects = proyectos.filter((p) => !CLOSED_PROJECT.includes(p.estadoOp));
    const overdueProjects = activeProjects.filter((p) => isOverdue(p.fechaTermino || p.fechaTerminoEstimada, today));
    const stalledProjects = activeProjects.filter((p) => !(p.tareas || []).some((t) => t.estado === "En curso" || t.estado === "Completada"));
    const closuresPending = proyectos.filter((p) => {
      const tasks = p.tareas || [];
      return tasks.length > 0 && tasks.every((t) => t.estado === "Completada") && !CLOSED_PROJECT.includes(p.estadoOp);
    });
    const quoteRequests = (oportunidades || []).filter((o) => o.requiereCotizacion || o.etapa === "Solicitud de cotización");
    const quoteNew = quoteRequests.filter((o) => !o.responsableOperaciones && !o.propuestaId);
    const quotePreparing = quoteRequests.filter((o) => o.propuestaId || o.etapa === "Cotizando" || o.etapa === "En preparación");
    const quoteReview = propuestas.filter((p) => p.estado === "En revisión");
    const quoteSent = propuestas.filter((p) => ["Enviada", "Aprobada", "Rechazada"].includes(p.estado));
    const nextFollowUps = activeOpps.filter((o) => o.proximaAccion || o.fechaCierreEsperado).length;
    const invoicesOverdue = (facturas || []).filter((f) => itemAmount(f) > 0 && isOverdue(f.fechaVencimiento || f.vencimiento || f.dueDate, today));
    const invoicesNext = (facturas || []).filter((f) => itemAmount(f) > 0 && isNext30(f.fechaVencimiento || f.vencimiento || f.dueDate, today));
    const cxcOverdue = invoicesOverdue.reduce((sum, f) => sum + itemAmount(f), 0);
    const cxcNext = invoicesNext.reduce((sum, f) => sum + itemAmount(f), 0);
    const payablesOverdue = (cuentasPagar || []).filter((p) => itemAmount(p) > 0 && isOverdue(p.fechaVencimiento || p.vencimiento || p.dueDate || p.fechaPago, today));
    const payablesNext = (cuentasPagar || []).filter((p) => itemAmount(p) > 0 && isNext30(p.fechaVencimiento || p.vencimiento || p.dueDate || p.fechaPago, today));
    const cxpNext = payablesNext.reduce((sum, p) => sum + itemAmount(p), 0);
    const cxpOverdue = payablesOverdue.reduce((sum, p) => sum + itemAmount(p), 0);
    const cash30 = cxcNext - cxpNext;
    const recurrentExpected = (servicios || []).filter((s) => s.estado === "Activo").reduce((sum, s) => sum + Number(s.valorMensual || s.montoMensual || s.mrr || 0), 0);
    const projectsReadyToInvoice = activeProjects.filter((p) => ["Cerrado técnicamente", "Listo para facturar"].includes(p.estadoFin) || p.fechaCierreTec).length;
    const projectProfit = proyectos.filter((p) => (p.costos || []).length > 0).map((p) => {
      const direct = (p.costos || []).reduce((sum, c) => sum + Number(c.total || 0), 0);
      const total = direct + direct * ((p.pctGG ?? params.pctGG ?? 10) / 100) + direct * ((p.pctImp ?? params.pctImp ?? 5) / 100);
      const utility = Number(p.valorVendido || 0) - total;
      const margin = Number(p.valorVendido || 0) > 0 ? utility / Number(p.valorVendido || 0) : 0;
      return { ...p, _profit: { total, utility, margin } };
    });
    const marginMin = Number(params.pctMargenMinimo || 15) / 100;
    const avgMargin = projectProfit.length ? projectProfit.reduce((sum, p) => sum + p._profit.margin, 0) / projectProfit.length : 0;
    const lowMarginProjects = projectProfit.filter((p) => p._profit.margin >= 0 && p._profit.margin < marginMin);
    const incidentsOpen = (incidencias || []).filter((i) => !CLOSED_ISSUE.includes(i.estado));
    const criticalIncidents = incidentsOpen.filter((i) => ["Crítica", "Alta"].includes(i.prioridad));
    const serviceEventsOpen = (eventosServicio || []).filter((e) => e.estado !== "Cerrado");
    const servicesActivation = (servicios || []).filter((s) => s.estado === "En activación");
    const servicesFailure = (servicios || []).filter((s) => s.estado === "Con falla" || s.estado === "Suspendido");
    const protocolsIncomplete = (servicios || []).filter((s) => !s.protocoloCompleto && !(s.protocolo?.contactos?.length || s.contactos?.length));
    const hourApprovals = (registrosHoras || []).filter((r) => r.estado === "pendiente" || !r.estado);
    const materialRequests = proyectos.flatMap((p) => (p.solicitudesMaterial || []).map((s) => ({ ...s, proyectoId: p.id, proyectoNombre: p.nombre || p.numero || "Proyecto" })));
    const materialPending = materialRequests.filter((s) => ["pendiente", "Pendiente", undefined, ""].includes(s.estado));
    const materialDeliveredPending = materialRequests.filter((s) => ["entregado", "Entregado", "despachado", "Despachado"].includes(s.estado) && !s.confirmado);
    const stockCritical = (materiales || []).filter((m) => Number(m.stockActual ?? m.stock ?? 0) <= Number(m.stockMinimo ?? m.minimo ?? 0));
    const activeStaff = [ ...(tecnicos || []), ...(contratistas || []) ].filter((p) => p.activo !== false).length;
    const activeClockIns = (fichajes || []).filter((f) => f.estado === "activo").length;
    const globalAlerts = criticalIncidents.length + serviceEventsOpen.length + servicesActivation.length + servicesFailure.length + protocolsIncomplete.length + overdueProjects.length + closuresPending.length + invoicesOverdue.length + payablesOverdue.length;
    return {
      approved,
      projectSales,
      projectApproved,
      serviceKpis,
      mrrActive: serviceKpis.mrrActivo || approved.reduce((sum, p) => sum + Number(p._c?.iRec || 0), 0),
      activeOpps,
      stageRows,
      pipelineTotal: activeOpps.reduce((sum, o) => sum + Number(o.valorEstimado || 0), 0),
      pipelineWeighted: activeOpps.reduce((sum, o) => sum + Number(o.valorEstimado || 0) * Number(o.probabilidad || 0) / 100, 0),
      activeProjects,
      overdueProjects,
      stalledProjects,
      closuresPending,
      quoteRequests,
      quoteNew,
      quotePreparing,
      quoteReview,
      quoteSent,
      nextFollowUps,
      invoicesOverdue,
      cxcOverdue,
      invoicesNext,
      cxcNext,
      payablesOverdue,
      cxpOverdue,
      payablesNext,
      cxpNext,
      cash30,
      recurrentExpected,
      projectsReadyToInvoice,
      avgMargin,
      lowMarginProjects,
      criticalIncidents,
      incidentsOpen,
      serviceEventsOpen,
      servicesActivation,
      servicesFailure,
      protocolsIncomplete,
      hourApprovals,
      materialPending,
      materialDeliveredPending,
      stockCritical,
      activeStaff,
      activeClockIns,
      globalAlerts,
    };
  }, [clientes, propuestas, proyectos, servicios, eventosServicio, params, incidencias, fichajes, registrosHoras, tecnicos, contratistas, oportunidades, facturas, cuentasPagar, materiales]);

  const firstName = String(sessionName || "Usuario").split(" ")[0] || "Usuario";
  const orange = C.orange || "#E17327";
  const surface = {
    background: C.isLight
      ? "linear-gradient(180deg,#F8FAFC,#F4F7FB)"
      : "radial-gradient(circle at 82% 4%, rgba(251,139,51,.12), transparent 28%), linear-gradient(135deg,#182231 0%,#101A27 48%,#162130 100%)",
    borderRadius: 24,
    padding: 30,
    border: "1px solid " + (C.isLight ? C.border : "rgba(210,226,245,0.1)"),
    boxShadow: C.isLight ? "0 22px 52px rgba(23,34,53,0.06)" : "0 28px 70px rgba(0,0,0,0.22)",
  };

  const commonBusiness = [
    { label: "Ventas aprobadas", value: moneyCompact(data.projectSales), sub: `${data.projectApproved.length} proyectos aprobados`, color: C.text },
    { label: "Pipeline ponderado", value: moneyCompact(data.pipelineWeighted), sub: `${data.activeOpps.length} oportunidades activas`, color: orange },
    { label: "Proyectos activos", value: numberOrDash(data.activeProjects.length), sub: `${data.overdueProjects.length} atrasados`, color: data.overdueProjects.length ? C.amber : C.green },
    { label: "MRR activo", value: moneyCompact(data.mrrActive), sub: moneyCompact(data.mrrActive * 12) + " anual", color: C.green },
  ];

  const configs = {
    admin: {
      title: `Buenos días, ${firstName}`,
      subtitle: "Vista global para decidir dónde poner foco: caja, proyectos críticos, cobranza, activaciones y rentabilidad.",
      cta: { label: "Ver alertas", tab: "aprobaciones" },
      kpis: [
        { label: "CxC vencida", value: moneyCompact(data.cxcOverdue), sub: `${data.invoicesOverdue.length} facturas vencidas`, color: data.cxcOverdue ? C.red : C.green },
        { label: "Caja 30 días", value: moneyCompact(data.cash30), sub: "ingresos menos egresos próximos", color: data.cash30 >= 0 ? C.green : C.red },
        { label: "Proyectos críticos", value: numberOrDash(data.overdueProjects.length + data.criticalIncidents.length), sub: "atrasos e incidencias altas", color: data.overdueProjects.length || data.criticalIncidents.length ? C.amber : C.green },
        { label: "MRR activo", value: moneyCompact(data.mrrActive), sub: moneyCompact(data.mrrActive * 12) + " anual", color: C.green },
      ],
      left: { eyebrow: "Requiere atención hoy", title: "Urgencias gerenciales", tab: "aprobaciones", label: "Ver todas las alertas", items: [
        data.quoteReview.length && { title: "Aprobar cotizaciones en revisión", sub: `${data.quoteReview.length} requieren decisión`, badge: "Decidir", tone: C.amber },
        data.overdueProjects.length && { title: "Proyectos atrasados", sub: `${data.overdueProjects.length} con fecha vencida`, badge: "Riesgo", tone: C.red },
        data.cxcOverdue && { title: "Cobranza vencida", sub: `${data.invoicesOverdue.length} facturas por gestionar`, badge: "Cobrar", tone: C.red },
        data.servicesFailure.length && { title: "Servicios con falla", sub: `${data.servicesFailure.length} servicios requieren continuidad`, badge: "Operar", tone: C.amber },
      ] },
      right: { eyebrow: "Estado del negocio", title: "Resumen ejecutivo", component: <PipelineSummary C={C} stages={data.stageRows} /> },
      bottom: { eyebrow: "Flujo operativo", title: "Estados clave", tab: "proyectos", label: "Ir a proyectos", rows: [
        { label: "Ventas aprobadas", value: moneyCompact(data.projectSales), tone: C.green, sub: `${data.projectApproved.length} proyectos` },
        { label: "Pipeline total", value: moneyCompact(data.pipelineTotal), tone: orange, sub: `${data.activeOpps.length} oportunidades` },
        { label: "Margen promedio", value: data.avgMargin ? fmtPct(data.avgMargin) : "Sin datos", tone: data.avgMargin ? C.green : C.textM },
        { label: "Alertas totales", value: `${data.globalAlerts} abiertas`, tone: data.globalAlerts ? C.amber : C.green },
      ] },
    },
    gerencia: null,
    comercial: {
      title: `Buenos días, ${firstName}`,
      subtitle: "Mesa comercial para avanzar contactos, oportunidades, solicitudes de cotización y propuestas enviadas.",
      cta: { label: "Pedir cotización", tab: "solicitudes_cotizacion" },
      kpis: [
        { label: "Oportunidades activas", value: numberOrDash(data.activeOpps.length), sub: moneyCompact(data.pipelineTotal) + " en pipeline", color: C.blue },
        { label: "Seguimientos pendientes", value: numberOrDash(data.nextFollowUps), sub: "con próxima acción o cierre", color: data.nextFollowUps ? C.amber : C.green },
        { label: "Solicitudes abiertas", value: numberOrDash(data.quoteRequests.length), sub: "pendientes de operaciones", color: orange },
        { label: "Propuestas enviadas", value: numberOrDash(data.quoteSent.length), sub: `${data.quoteReview.length} en revisión`, color: C.green },
      ],
      left: { eyebrow: "Acciones comerciales", title: "Qué mover hoy", tab: "pipeline", label: "Abrir pipeline", items: [
        { title: "Actualizar próxima acción", sub: `${data.nextFollowUps} oportunidades con seguimiento`, badge: "Seguir", tone: C.amber },
        { title: "Pedir cotización a operaciones", sub: `${data.quoteRequests.length} solicitudes abiertas`, badge: "Pedir", tone: orange },
        { title: "Revisar propuestas enviadas", sub: `${data.quoteSent.length} propuestas para seguimiento`, badge: "Cliente", tone: C.green },
      ] },
      right: { eyebrow: "Pipeline comercial", title: "Etapas con cantidad y monto", component: <PipelineSummary C={C} stages={data.stageRows} detailed /> },
      bottom: { eyebrow: "Sin costos internos", title: "Vista comercial segura", rows: [
        { label: "Lead y calificación", value: `${data.stageRows[0].count + data.stageRows[1].count} abiertos`, tone: C.blue },
        { label: "Propuesta y negociación", value: `${data.stageRows[2].count + data.stageRows[3].count} en avance`, tone: C.green },
        { label: "Solicitudes a operaciones", value: `${data.quoteRequests.length} abiertas`, tone: orange },
      ] },
    },
    jefe_comercial: null,
    operaciones: {
      title: `Buenos días, ${firstName}`,
      subtitle: "Mesa operacional para preparar cotizaciones, coordinar recursos, destrabar proyectos y cerrar entregas.",
      cta: { label: "Cotizaciones por preparar", tab: "bandeja_cotizaciones" },
      kpis: [
        { label: "Solicitudes nuevas", value: numberOrDash(data.quoteNew.length), sub: "por tomar en operaciones", color: orange },
        { label: "Cotizaciones en preparación", value: numberOrDash(data.quotePreparing.length + data.quoteReview.length), sub: "costeo o revisión", color: C.amber },
        { label: "Proyectos activos", value: numberOrDash(data.activeProjects.length), sub: `${data.overdueProjects.length} atrasados`, color: data.overdueProjects.length ? C.amber : C.green },
        { label: "Cierres pendientes", value: numberOrDash(data.closuresPending.length), sub: "tareas completas sin cierre", color: data.closuresPending.length ? C.red : C.green },
      ],
      left: { eyebrow: "Bandeja de trabajo", title: "Cotizaciones y preparación", tab: "bandeja_cotizaciones", label: "Abrir bandeja", items: [
        data.quoteNew.length && { title: "Tomar solicitudes nuevas", sub: `${data.quoteNew.length} sin responsable operacional`, badge: "Nueva", tone: orange },
        data.quotePreparing.length && { title: "Terminar cotizaciones", sub: `${data.quotePreparing.length} en preparación`, badge: "Costeo", tone: C.amber },
        data.quoteReview.length && { title: "Enviar a revisión gerencial", sub: `${data.quoteReview.length} propuestas en revisión`, badge: "Revisar", tone: C.purple },
      ] },
      right: { eyebrow: "Riesgos operativos", title: "Qué puede detener terreno", tab: "aprobaciones", label: "Ver aprobaciones", items: [
        data.materialPending.length && { title: "Materiales pendientes", sub: `${data.materialPending.length} solicitudes sin resolver`, badge: "Material", tone: C.amber },
        data.criticalIncidents.length && { title: "Incidencias críticas", sub: `${data.criticalIncidents.length} abiertas`, badge: "Incidencia", tone: C.red },
        data.stalledProjects.length && { title: "Proyectos sin avance", sub: `${data.stalledProjects.length} requieren coordinación`, badge: "Avance", tone: C.red },
        data.hourApprovals.length && { title: "Horas por aprobar", sub: `${data.hourApprovals.length} registros pendientes`, badge: "Horas", tone: C.blue },
      ] },
      bottom: { eyebrow: "Equipo y ejecución", title: "Capacidad operativa", rows: [
        { label: "Personal activo", value: `${data.activeStaff} personas`, tone: C.blue },
        { label: "Fichajes activos", value: `${data.activeClockIns} en curso`, tone: C.green },
        { label: "Incidencias abiertas", value: `${data.incidentsOpen.length}`, tone: data.incidentsOpen.length ? C.amber : C.green },
      ] },
    },
    administrativo_operaciones: null,
    supervisor: null,
    finanzas: {
      title: `Buenos días, ${firstName}`,
      subtitle: "Mesa financiera para cobrar, pagar, proyectar caja y detectar pérdida de margen.",
      cta: { label: "Facturación y cobranza", tab: "finanzas" },
      kpis: [
        { label: "CxC vencida", value: moneyCompact(data.cxcOverdue), sub: `${data.invoicesOverdue.length} facturas vencidas`, color: data.cxcOverdue ? C.red : C.green },
        { label: "CxP próxima", value: moneyCompact(data.cxpNext + data.cxpOverdue), sub: `${data.payablesNext.length + data.payablesOverdue.length} compromisos`, color: data.cxpOverdue ? C.red : C.amber },
        { label: "Facturación esperada", value: moneyCompact(data.recurrentExpected), sub: `${data.projectsReadyToInvoice} proyectos listos`, color: C.green },
        { label: "Caja 30 días", value: moneyCompact(data.cash30), sub: "ingresos menos egresos próximos", color: data.cash30 >= 0 ? C.green : C.red },
      ],
      left: { eyebrow: "Qué cobrar", title: "Cobranza prioritaria", tab: "finanzas", label: "Abrir cobranza", items: [
        data.invoicesOverdue.length && { title: "Facturas vencidas", sub: `${moneyCompact(data.cxcOverdue)} por gestionar`, badge: "Vencida", tone: C.red },
        data.invoicesNext.length && { title: "Próximos vencimientos", sub: `${moneyCompact(data.cxcNext)} dentro de 30 días`, badge: "30 días", tone: C.amber },
        data.projectsReadyToInvoice && { title: "Proyectos listos para facturar", sub: `${data.projectsReadyToInvoice} cierres o entregas`, badge: "Facturar", tone: C.green },
      ] },
      right: { eyebrow: "Qué pagar", title: "Compromisos próximos", tab: "hitos", label: "Ver control financiero", items: [
        data.payablesOverdue.length && { title: "Pagos vencidos", sub: `${moneyCompact(data.cxpOverdue)} vencido`, badge: "Vencido", tone: C.red },
        data.payablesNext.length && { title: "Pagos próximos", sub: `${moneyCompact(data.cxpNext)} dentro de 30 días`, badge: "Próximo", tone: C.amber },
        data.lowMarginProjects.length && { title: "Proyectos bajo margen", sub: `${data.lowMarginProjects.length} bajo mínimo`, badge: "Margen", tone: C.red },
      ] },
      bottom: { eyebrow: "Rentabilidad", title: "Señales de margen", rows: [
        { label: "Margen promedio", value: data.avgMargin ? fmtPct(data.avgMargin) : "Sin datos", tone: data.avgMargin ? C.green : C.textM },
        { label: "Proyectos bajo mínimo", value: `${data.lowMarginProjects.length}`, tone: data.lowMarginProjects.length ? C.red : C.green },
        { label: "Servicios por facturar", value: moneyCompact(data.recurrentExpected), tone: C.green },
      ] },
    },
    monitoreo: {
      title: `Buenos días, ${firstName}`,
      subtitle: "Mesa de continuidad para servicios recurrentes, activaciones, protocolos y fallas.",
      cta: { label: "Ver servicios", tab: "servicios" },
      kpis: [
        { label: "MRR activo", value: moneyCompact(data.mrrActive), sub: moneyCompact(data.mrrActive * 12) + " anual", color: C.green },
        { label: "En activación", value: numberOrDash(data.servicesActivation.length), sub: "servicios por habilitar", color: orange },
        { label: "Con falla", value: numberOrDash(data.servicesFailure.length), sub: "requieren revisión", color: data.servicesFailure.length ? C.red : C.green },
        { label: "Protocolos incompletos", value: numberOrDash(data.protocolsIncomplete.length), sub: "datos operativos faltantes", color: data.protocolsIncomplete.length ? C.amber : C.green },
      ],
      left: { eyebrow: "Continuidad operativa", title: "Qué revisar hoy", tab: "servicios", label: "Abrir servicios", items: [
        data.protocolsIncomplete.length && { title: "Completar protocolos", sub: `${data.protocolsIncomplete.length} servicios incompletos`, badge: "Protocolo", tone: C.amber },
        data.servicesActivation.length && { title: "Activar servicios nuevos", sub: `${data.servicesActivation.length} en activación`, badge: "Activar", tone: orange },
        data.servicesFailure.length && { title: "Revisar servicios con falla", sub: `${data.servicesFailure.length} con riesgo operativo`, badge: "Falla", tone: C.red },
      ] },
      right: { eyebrow: "Facturación esperada", title: "Base recurrente", component: <PipelineSummary C={C} stages={[{stage:"Activo",count:servicios.filter(s=>s.estado==="Activo").length,amount:data.mrrActive,weighted:data.mrrActive},{stage:"Activación",count:data.servicesActivation.length,amount:data.servicesActivation.reduce((s,x)=>s+Number(x.valorMensual||0),0),weighted:0},{stage:"Falla",count:data.servicesFailure.length,amount:data.servicesFailure.reduce((s,x)=>s+Number(x.valorMensual||0),0),weighted:0}]} detailed /> },
      bottom: { eyebrow: "Eventos", title: "Estado de servicios", rows: [
        { label: "Eventos abiertos", value: `${data.serviceEventsOpen.length}`, tone: data.serviceEventsOpen.length ? C.amber : C.green },
        { label: "Servicios activos", value: `${servicios.filter(s=>s.estado==="Activo").length}`, tone: C.green },
        { label: "Protocolos completos", value: `${Math.max(0, servicios.length - data.protocolsIncomplete.length)}`, tone: C.blue },
      ] },
    },
    almacen: {
      title: `Buenos días, ${firstName}`,
      subtitle: "Mesa de almacén para solicitudes, stock crítico y entregas asociadas a proyectos.",
      cta: { label: "Ver almacén", tab: "almacen" },
      kpis: [
        { label: "Solicitudes abiertas", value: numberOrDash(data.materialPending.length), sub: "material pendiente", color: data.materialPending.length ? C.amber : C.green },
        { label: "Stock crítico", value: numberOrDash(data.stockCritical.length), sub: "materiales bajo mínimo", color: data.stockCritical.length ? C.red : C.green },
        { label: "Entregas pendientes", value: numberOrDash(data.materialDeliveredPending.length), sub: "por confirmar", color: data.materialDeliveredPending.length ? C.amber : C.green },
        { label: "Proyectos activos", value: numberOrDash(data.activeProjects.length), sub: "con posible consumo", color: C.blue },
      ],
      left: { eyebrow: "Solicitudes", title: "Qué preparar", tab: "almacen", label: "Abrir solicitudes", items: [
        data.materialPending.length && { title: "Preparar materiales pendientes", sub: `${data.materialPending.length} solicitudes abiertas`, badge: "Preparar", tone: C.amber },
        data.materialDeliveredPending.length && { title: "Confirmar entregas", sub: `${data.materialDeliveredPending.length} entregas sin confirmar`, badge: "Confirmar", tone: C.blue },
        data.stockCritical.length && { title: "Revisar stock crítico", sub: `${data.stockCritical.length} materiales bajo mínimo`, badge: "Stock", tone: C.red },
      ] },
      right: { eyebrow: "Disponibilidad", title: "Estado del inventario", rows: [
        { label: "Materiales cargados", value: `${materiales.length}`, tone: C.blue },
        { label: "Stock crítico", value: `${data.stockCritical.length}`, tone: data.stockCritical.length ? C.red : C.green },
        { label: "Solicitudes por proyecto", value: `${data.materialPending.length}`, tone: C.amber },
      ] },
      bottom: { eyebrow: "Operación", title: "Impacto en proyectos", rows: [
        { label: "Proyectos activos", value: `${data.activeProjects.length}`, tone: C.green },
        { label: "Incidencias abiertas", value: `${data.incidentsOpen.length}`, tone: data.incidentsOpen.length ? C.amber : C.green },
        { label: "Cierres pendientes", value: `${data.closuresPending.length}`, tone: data.closuresPending.length ? C.red : C.green },
      ] },
    },
    viewer: {
      title: `Buenos días, ${firstName}`,
      subtitle: "Vista de lectura para revisar estado general sin modificar datos.",
      cta: { label: "Ver proyectos", tab: "proyectos" },
      kpis: commonBusiness,
      left: { eyebrow: "Resumen", title: "Estado general", component: <PipelineSummary C={C} stages={data.stageRows} /> },
      right: { eyebrow: "Operación", title: "Indicadores visibles", rows: [
        { label: "Proyectos activos", value: `${data.activeProjects.length}`, tone: C.green },
        { label: "Servicios activos", value: `${servicios.filter(s=>s.estado==="Activo").length}`, tone: C.green },
        { label: "Alertas abiertas", value: `${data.globalAlerts}`, tone: data.globalAlerts ? C.amber : C.green },
      ] },
    },
  };

  configs.gerente_general = {
    ...configs.admin,
    title: `Buenos días, ${firstName}`,
    subtitle: "Vista completa del negocio: caja, proyectos críticos, cobranza, activaciones, rentabilidad y decisiones transversales.",
    cta: { label: "Ver sistema", tab: "config" },
  };
  configs.gerente_operaciones_admin = {
    ...configs.admin,
    title: `Buenos días, ${firstName}`,
    subtitle: "Vista consolidada financiera, administrativa, comercial y operacional, sin gestión de configuración sensible.",
    cta: { label: "Control financiero", tab: "hitos" },
  };
  configs.gerencia = configs.admin;
  configs.jefe_comercial = configs.comercial;
  configs.administrativo_operaciones = configs.operaciones;
  configs.supervisor = configs.operaciones;

  const config = configs[role] || configs.viewer;
  const left = config.left;
  const right = config.right;
  const bottom = config.bottom;

  return (
    <div style={surface}>
      <RolePanelHeader C={C} role={role} title={config.title} subtitle={config.subtitle} cta={config.cta} onGoTab={onGoTab} />
      <DashboardKpiGrid C={C} items={config.kpis || commonBusiness} />

      <div className="assur-two-col" style={{ gridTemplateColumns: "minmax(0,1.1fr) minmax(340px,0.9fr)", gap: 16, marginBottom: 18 }}>
        <PanelCard C={C} eyebrow={left?.eyebrow} title={left?.title} actionLabel={left?.label} actionTab={left?.tab} onGoTab={onGoTab}>
          {left?.component || <DecisionList C={C} items={left?.items || []} emptyTitle="Sin pendientes críticos para este rol." />}
        </PanelCard>
        <PanelCard C={C} eyebrow={right?.eyebrow} title={right?.title} actionLabel={right?.label} actionTab={right?.tab} onGoTab={onGoTab}>
          {right?.component || (right?.rows ? <StatusFlow C={C} rows={right.rows} /> : <DecisionList C={C} items={right?.items || []} emptyTitle="Sin riesgos visibles." />)}
        </PanelCard>
      </div>

      {bottom && <PanelCard C={C} eyebrow={bottom.eyebrow} title={bottom.title} actionLabel={bottom.label} actionTab={bottom.tab} onGoTab={onGoTab}>
        {bottom.component || <StatusFlow C={C} rows={bottom.rows || []} />}
      </PanelCard>}

      <div style={{ marginTop: 14, color: C.textM, fontSize: 11.5, fontFamily: ff, lineHeight: 1.45 }}>
        Panel filtrado por rol. La información detallada sigue disponible en los módulos laterales.
      </div>
    </div>
  );
}
