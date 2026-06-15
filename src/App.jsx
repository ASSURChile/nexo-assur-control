import { Component, lazy, Suspense, useState, useEffect, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { dataService } from "./services/dataService";
import { repositories as repo, repositoryForKey } from "./services/repositories";
import { clearSession, getSession, logoutSupabaseUser, saveSession } from "./services/authService";
import { createActivityEvent } from "./services/activityEventService";
import { initDefaults, seedPatagoniaFreshDemo } from "./services/bootstrapService";
import { createDocumentVersion, generateQuoteDocument } from "./services/documentService";
import {
  deleteClienteFromBackendQuiet,
  deleteInstalacionFromBackendQuiet,
  hydrateMasterDataFromBackend,
  syncClienteToBackendQuiet,
  syncInstalacionToBackendQuiet,
} from "./services/masterDataBackendService";
import {
  deleteEventoServicioFromBackendQuiet,
  deleteProyectoFromBackendQuiet,
  deleteServicioFromBackendQuiet,
  hydrateOperationalDataFromBackend,
  syncBillingExpectationsToBackendQuiet,
  syncEventoServicioToBackendQuiet,
  syncProyectoToBackendQuiet,
  syncServicioToBackendQuiet,
} from "./services/operationalBackendService";
import { hydrateFinancialDataFromBackend } from "./services/financialBackendService";
import { getRuntimeProviderConfig, shouldUseBackendSync } from "./services/providerRegistry";
import { deleteSupabaseNormalizedEntityQuiet, syncSupabaseNormalizedDataQuiet, syncSupabaseNormalizedEntityQuiet, syncSupabaseNormalizedTablesQuiet } from "./services/supabaseNormalizedSyncService";
import { logFrontendError } from "./services/healthService";
import PipelineView, { buildOportunidad } from "./views/PipelineView";
import LoginScreen from "./views/LoginScreen";
import GlobalSearch from "./components/GlobalSearch";
import QuoteDocumentEditor from "./components/QuoteDocumentEditor";
import { AssistantFloatingButton, AssistantPanel } from "./components/AssistantPanel";
import { ShellSidebar, ShellTopBar } from "./layout/AppShell";
import {
  Lbl,
  Inp,
  Sel,
  SelBusca,
  Fld,
  Stat,
  Bdg,
  Btn,
  Card,
  STitle,
  Modal,
  G,
  EmptyState,
  ModuleHero,
  QuickActions,
  WorkflowSteps,
} from "./components/ui";
import {
  DARK,
  LIGHT,
  ff,
  ESTADOS,
  ESTADOS_C,
  ESTADOS_I,
  TIPOS_V,
  RUBROS,
  REGIONES,
  EJEC_DEF,
  CATS_DEF,
  COL_E,
  ROLES_TEC_DEF,
  TIPOS_PROYECTO_DEF,
  SERVICIOS_REC_DEF,
  ESTADOS_COT,
  ESTADOS_PROP,
  DEF,
} from "./config/appConstants";
import {
  TAB_GROUPS,
  EST_OP,
  EST_FIN,
  COL_OP,
  COL_FIN,
  CHECKLIST_CIERRE_DEF,
} from "./config/navigation";
import {
  COL_SERVICIO,
  servicioTieneProtocoloCompleto,
  buildServicioDesdeProyecto,
  buildBillingExpectationsForService,
} from "./domain/recurringServices";
import {
  semaforo,
  getNombreCliente,
  isPropNueva,
  tieneRecurrente,
  calcProp,
  calcEsc,
} from "./domain/commercial";
import { calcCostoKm } from "./domain/operations";
import { canEdit, defaultTabForRol, getPermisos, hasPermission, normalizeRole, rolColor, rolLabel } from "./domain/roles";
import { bCliente, bInstalacion, bPropuesta, bProyecto } from "./domain/factories";
import {
  CATS_MAT,
  COL_EST_INC,
  COL_PRIO,
  DIAS_SEM,
  ESTADOS_INC,
  PRIORIDADES_INC,
  TIPOS_INC,
  UNIDADES_OPT,
  addDays,
  fmtDay,
  getISOWeek,
  weekLabel,
  weekStart,
} from "./domain/operationsCatalogs";
import { COL_COT, bCotizacion, calcCotizacion, nextNroCot, nextNroProp } from "./domain/quoting";
import { fmtCLP, fmtMes, fmtMil, fmtN, fmtPct, todayISO } from "./utils/formatters";

const ServiciosRecurrentesView = lazy(() => import("./views/ServiciosRecurrentesView"));
const ComercialDashboardView = lazy(() => import("./views/ComercialDashboardView"));
const ClientesView = lazy(() => import("./views/ClientesInstalacionesView").then((module) => ({ default: module.ClientesView })));
const InstalacionesView = lazy(() => import("./views/ClientesInstalacionesView").then((module) => ({ default: module.InstalacionesView })));
const ProyectosView = lazy(() => import("./views/ProyectosView"));
const MobileApp = lazy(() => import("./views/ProyectosView").then((module) => ({ default: module.MobileApp })));
const ControlFinancieroView = lazy(() => import("./views/ControlFinancieroView"));
const FinanzasView = lazy(() => import("./views/FinanzasView"));
const UsuariosView = lazy(() => import("./views/UsuariosView"));
const PaquetesComercialesView = lazy(() => import("./views/PaquetesComercialesView"));
const SolicitudesCotizacionView = lazy(() => import("./views/PaquetesComercialesView").then((module) => ({ default: module.SolicitudesCotizacionView })));
const ConfigView = lazy(() => import("./views/ConfigView"));
const ExecutiveDashboard = lazy(() => import("./views/ExecutiveDashboard"));

const newId=()=>dataService.id();
const TODAY=todayISO;
const COLORES_TEC=["#1E3A8A","#2545A6","#0D9F6E","#C77700","#7C3AED","#C0392B","#0891B2","#059669","#D97706","#7C3AED"];
const ESPECIALIDADES_OPT=["CCTV","Alarmas","Control de acceso","Incendios","Redes / Infraestructura","Automatización","Eléctrico","Portería remota","Soporte técnico","Otro"];

function nextNumero(prefijo){
  const pref=(prefijo||"COT").toUpperCase();
  const year=new Date().getFullYear();
  const stored=repo.cotCounter.get();
  const n=(stored.counter||0)+1;
  repo.cotCounter.set({counter:n});
  return pref+"-"+year+"-"+String(n).padStart(3,"0");
}

const bOportunidad=()=>buildOportunidad(newId());

function Empty({ C, icon = "◈", title, sub, action }) {
  return <EmptyState C={C} icon={icon} title={title} sub={sub} action={action} />;
}

function ViewLoading({ C, label = "Cargando vista..." }) {
  return (
    <div style={{ background: C.bg1, border: "1px solid " + C.border, borderRadius: 10, padding: 24, color: C.textM, fontFamily: ff, fontSize: 13 }}>
      {label}
    </div>
  );
}

class RuntimeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("ASSUR runtime error", error, info);
    logFrontendError(error, { severity: "error", area: "runtime-boundary", componentStack: info?.componentStack }).catch(() => {});
  }
  render() {
    if (!this.state.error) return this.props.children;
    const C = this.props.C;
    return (
      <div style={{ minHeight: "100vh", background: C.bg0, color: C.text, fontFamily: ff, padding: 32 }}>
        <div style={{ maxWidth: 780, margin: "70px auto", background: C.bg1, border: "1px solid " + C.border, borderRadius: 10, padding: 26 }}>
          <div style={{ fontSize: 12, color: C.red, textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900, marginBottom: 10 }}>Error de vista</div>
          <div style={{ fontSize: 24, fontWeight: 850, marginBottom: 10 }}>Esta pantalla encontró un dato incompatible</div>
          <div style={{ fontSize: 13, color: C.textM, lineHeight: 1.6, marginBottom: 16 }}>
            El sistema no perdió datos. Recarga la página o vuelve al dashboard mientras se revisa el detalle técnico.
          </div>
          <pre style={{ whiteSpace: "pre-wrap", background: C.bg2, border: "1px solid " + C.border, borderRadius: 8, padding: 12, fontSize: 12, color: C.textS, overflow: "auto" }}>{this.state.error?.message || String(this.state.error)}</pre>
          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            <button onClick={() => window.location.reload()} style={{ background: C.blue, color: "#fff", border: "none", borderRadius: 7, padding: "9px 14px", fontWeight: 800, cursor: "pointer" }}>Recargar</button>
            <button onClick={() => { localStorage.removeItem("af_session"); window.location.reload(); }} style={{ background: C.bg2, color: C.text, border: "1px solid " + C.border, borderRadius: 7, padding: "9px 14px", fontWeight: 800, cursor: "pointer" }}>Volver a login</button>
          </div>
        </div>
      </div>
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLIENTE DETALLE
// ─────────────────────────────────────────────────────────────────────────────
function ClienteDetalle({C,cliente,clientes,instalaciones,propuestas,params,categorias,ejecutivos,onRefresh,onBack,onCalc,onSaveCliente,onSaveInstalacion,onDeleteInstalacion,readonly}){
  const [instModal,setInstModal]=useState(null);
  const [propModal,setPropModal]=useState(null);
  const [editModal,setEditModal]=useState(false);
  const [instForm,setInstForm]=useState({});
  const [propForm,setPropForm]=useState({});
  const [cliForm,setCliForm]=useState({...cliente});
  const [expandedInst,setExpandedInst]=useState({});
  const [confInstId,setConfInstId]=useState(null);
  const [confPropId,setConfPropId]=useState(null);
  const [activeTab,setActiveTab]=useState("resumen");

  const myInst=instalaciones.filter(i=>i.clienteId===cliente.id);
  const myProps=propuestas.filter(p=>p.clienteId===cliente.id);
  const aprobadas=myProps.filter(p=>p.estado==="Aprobada");

  // KPIs del cliente
  const aCalc=aprobadas.map(p=>({...p,_c:calcProp(p,params)}));
  const mrrTotal=aCalc.filter(p=>p._c?.tieneSvc).reduce((a,p)=>a+(p._c?.iRec||0),0);
  const projTotal=aCalc.filter(p=>p._c?.tieneProj).reduce((a,p)=>a+(p.valorFinal||p.valorProyecto||0),0);
  const subTotal=aCalc.reduce((a,p)=>a+(p._c?.sub||0),0);
  const pbs=aCalc.filter(p=>isFinite(p._c?.meses)&&p._c?.meses>0).map(p=>p._c.meses);
  const pbMed=pbs.length>0?pbs.reduce((a,b)=>a+b,0)/pbs.length:0;
  const sent=myProps.filter(p=>["Enviada","Aprobada","Rechazada"].includes(p.estado));
  const conv=sent.length>0?aprobadas.length/sent.length:0;
  const totalIngr=projTotal+mrrTotal*12;

  // Riesgo global del cliente: peor semáforo entre sus propuestas aprobadas con proyecto+servicio
  const semaforos=aCalc.filter(p=>p._c?.tieneProj&&p._c?.tieneSvc).map(p=>p._c.sem.pct);
  const maxRiesgo=semaforos.length>0?Math.max(...semaforos):0;
  const riesgoCliente=semaforos.length>0?semaforo(maxRiesgo*24,24):{label:"Sin datos",color:"#64748B",pct:0};

  const sif=(k,v)=>setInstForm(f=>({...f,[k]:v}));
  const spf=(k,v)=>setPropForm(f=>({...f,[k]:v}));
  const scf=(k,v)=>setCliForm(f=>({...f,[k]:v}));

  const saveCliente=()=>{
    if(!cliForm.razonSocial?.trim())return;
    const item={...cliForm,updatedAt:new Date().toISOString()};
    onSaveCliente ? onSaveCliente(item) : repo.clientes.save(item);
    setEditModal(false);onRefresh();
  };
  const saveInst=()=>{
    if(!instForm.nombre?.trim())return;
    const item={...instForm,clienteId:cliente.id,updatedAt:new Date().toISOString()};
    onSaveInstalacion ? onSaveInstalacion(item) : repo.instalaciones.save(item);setInstModal(null);onRefresh();
  };
  const saveProp=()=>{
    if(!propForm.nombre?.trim())return;
    const l=repo.propuestas.list();const i=l.findIndex(x=>x.id===propForm.id);
    let hist=propForm.historial||[];
    const prev=i>=0?l[i]:null;
    if(prev&&prev.estado!==propForm.estado)hist=[...hist,{fecha:new Date().toISOString(),estado:propForm.estado,nota:`Cambio: "${prev.estado}" → "${propForm.estado}"`}];
    const item={...propForm,historial:hist,clienteId:cliente.id,updatedAt:new Date().toISOString()};
    repo.propuestas.save(item);syncSupabaseNormalizedEntityQuiet("propuestas",item.id);setPropModal(null);onRefresh();
  };
  const removeInst=id=>{
    if(propuestas.some(p=>p.instalacionId===id)){alert("Esta instalación tiene propuestas asociadas.");return;}
    onDeleteInstalacion ? onDeleteInstalacion(id) : repo.instalaciones.remove(id);setConfInstId(null);onRefresh();
  };
  const removeProp=id=>{
    repo.propuestas.remove(id);setConfPropId(null);onRefresh();
  };
  const changeStateProp=(p,estado)=>{
    const l=repo.propuestas.list();const i=l.findIndex(x=>x.id===p.id);if(i<0)return;
    const hist=[...(l[i].historial||[]),{fecha:new Date().toISOString(),estado,nota:`Estado → "${estado}"`}];
    l[i]={...l[i],estado,historial:hist,updatedAt:new Date().toISOString()};
    repo.propuestas.replaceAll(l);syncSupabaseNormalizedEntityQuiet("propuestas",l[i].id);onRefresh();
  };

  const estColor=cliente.estado==="Activo"?C.green:cliente.estado==="Inactivo"?C.red:C.amber;
  const thS={padding:"6px 10px",color:C.textM,fontWeight:600,textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,whiteSpace:"nowrap"};
  const tdS={padding:"8px 10px",fontFamily:ff,fontSize:12};

  return <div>
    {/* ── Breadcrumb ── */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:18}}>
      <button onClick={onBack} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:5,color:C.textM,cursor:"pointer",padding:"5px 12px",fontSize:11,fontFamily:ff,display:"flex",alignItems:"center",gap:5}}>← Clientes</button>
      <span style={{color:C.textM,fontSize:12,fontFamily:ff}}>/</span>
      <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>{cliente.razonSocial||cliente.nombreComercial||"—"}</span>
      <Bdg color={estColor} small>{cliente.estado||"Prospecto"}</Bdg>
      {riesgoCliente.label!=="Sin datos"&&<Bdg color={riesgoCliente.color} small>Riesgo: {riesgoCliente.label}</Bdg>}
    </div>

    {/* ── Header del cliente ── */}
    <Card C={C} style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",gap:18,flexWrap:"wrap",flex:1}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
              <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:ff}}>Razón social</div>
              {cliente.origen==="softland"
                ?<span style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:C.blue+"22",color:C.blue,fontWeight:600,fontFamily:ff}}>SOFTLAND</span>
                :<span style={{fontSize:9,padding:"2px 7px",borderRadius:10,background:C.amber+"22",color:C.amber,fontWeight:600,fontFamily:ff}}>MANUAL</span>
              }
            </div>
            <div style={{fontSize:18,fontWeight:600,color:C.text,fontFamily:ff}}>{cliente.razonSocial||"—"}</div>
            {cliente.nombreComercial&&cliente.nombreComercial!==cliente.razonSocial&&<div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:2}}>{cliente.nombreComercial}</div>}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:"6px 20px",flex:1}}>
            {cliente.rut&&<div><div style={{fontSize:8,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:2}}>RUT</div><div style={{fontSize:12,color:C.textS,fontFamily:ff}}>{cliente.rut}</div></div>}
            {cliente.rubro&&<div><div style={{fontSize:8,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:2}}>Rubro</div><div style={{fontSize:12,color:C.textS,fontFamily:ff}}>{cliente.rubro}</div></div>}
            {cliente.ejecutivo&&<div><div style={{fontSize:8,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:2}}>Ejecutivo</div><div style={{fontSize:12,color:C.textS,fontFamily:ff}}>{cliente.ejecutivo}</div></div>}
            {cliente.contacto&&<div><div style={{fontSize:8,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:2}}>Contacto</div><div style={{fontSize:12,color:C.textS,fontFamily:ff}}>{cliente.contacto}</div></div>}
            {cliente.email&&<div><div style={{fontSize:8,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:2}}>Email</div><div style={{fontSize:12,color:C.textS,fontFamily:ff}}>{cliente.email}</div></div>}
            {cliente.telefono&&<div><div style={{fontSize:8,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:2}}>Teléfono</div><div style={{fontSize:12,color:C.textS,fontFamily:ff}}>{cliente.telefono}</div></div>}
            {cliente.direccion&&<div style={{gridColumn:"span 2"}}><div style={{fontSize:8,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:2}}>Dirección</div><div style={{fontSize:12,color:C.textS,fontFamily:ff}}>{cliente.direccion}</div></div>}
          </div>
        </div>
        {!readonly&&<div style={{display:"flex",gap:6,flexShrink:0}}>
          <Btn C={C} ghost small onClick={()=>{setCliForm({...cliente});setEditModal(true);}}>Editar cliente</Btn>
          <Btn C={C} small onClick={()=>{setInstForm(bInstalacion(cliente.id));setInstModal("new");}}>+ Instalación</Btn>
          <Btn C={C} small onClick={()=>{const p1=bPropuesta(cliente.id,"");p1.numero=nextNumero(params.cotPrefijo);setPropForm(p1);setPropModal("new");}}>+ Propuesta</Btn>
        </div>}
      </div>
      {cliente.notas&&<div style={{marginTop:12,padding:"8px 12px",background:C.bg2,borderRadius:5,fontSize:12,color:C.textM,fontFamily:ff,borderLeft:"3px solid "+C.border}}>{cliente.notas}</div>}
    </Card>

    {/* ── KPIs del cliente ── */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:14}}>
      <Stat C={C} label="MRR aprobado" value={fmtCLP(mrrTotal)} color={C.green} sub="recurrente/mes"/>
      <Stat C={C} label="Proyección anual" value={fmtCLP(mrrTotal*12)} color={C.green}/>
      <Stat C={C} label="Proyectos" value={fmtCLP(projTotal)} color={C.blue} sub={aCalc.filter(p=>p._c?.tieneProj).length+" aprobados"}/>
      <Stat C={C} label="Subsidio total" value={fmtCLP(subTotal)} color={C.amber} sub={pbMed>0?"Payback prom.: "+fmtN(pbMed,0)+" m":""}/>
      <Stat C={C} label="Conversión" value={fmtPct(conv)} color={conv>0.5?C.green:conv>0.3?C.amber:C.red} sub={aprobadas.length+" de "+sent.length+" enviadas"}/>
      <Stat C={C} label="Ingreso total" value={fmtCLP(totalIngr)} sub="proyecto + MRR anual"/>
    </div>

    {/* ── Tabs de contenido ── */}
    <div style={{display:"flex",gap:3,marginBottom:14,background:C.bg1,padding:3,borderRadius:6,border:"1px solid "+C.border,width:"fit-content"}}>
      {[["resumen","Resumen"],["instalaciones","Instalaciones ("+myInst.length+")"],["propuestas","Propuestas ("+myProps.length+")"]].map(([id,lbl])=>(
        <button key={id} onClick={()=>setActiveTab(id)} style={{padding:"6px 16px",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:600,background:activeTab===id?C.blue:"transparent",color:activeTab===id?"#fff":C.textM,border:"none",fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{lbl}</button>
      ))}
    </div>

    {/* ── TAB: RESUMEN ── */}
    {activeTab==="resumen"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        {/* Pipeline del cliente */}
        <Card C={C} style={{marginBottom:0}}>
          <STitle C={C}>Pipeline por estado</STitle>
          {ESTADOS.filter(s=>myProps.some(p=>p.estado===s)).length===0
            ?<Empty C={C} title="Sin propuestas" sub="Crea la primera propuesta para este cliente" action={!readonly&&<Btn C={C} small onClick={()=>{const p1=bPropuesta(cliente.id,"");p1.numero=nextNumero(params.cotPrefijo);setPropForm(p1);setPropModal("new");}}>+ Propuesta</Btn>}/>
            :<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:7}}>
              {ESTADOS.filter(s=>myProps.some(p=>p.estado===s)).map(s=>{const n=myProps.filter(p=>p.estado===s).length,col=COL_E[s]||"#64748B";return <div key={s} style={{background:C.bg2,borderRadius:5,padding:"9px 11px",border:"1px solid "+col+"44"}}><div style={{fontSize:8,color:col,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,fontWeight:700,marginBottom:3}}>{s}</div><div style={{fontSize:22,fontWeight:300,color:col,fontFamily:ff}}>{n}</div></div>;})}
            </div>
          }
        </Card>
        {/* Desglose MRR */}
        <Card C={C} style={{marginBottom:0}}>
          <STitle C={C}>Desglose ingresos aprobados</STitle>
          {aCalc.length===0?<Empty C={C} title="Sin propuestas aprobadas"/>:<div>
            {[["Cámaras",aCalc.reduce((a,p)=>a+(p._c?.iC||0),0),C.blue],["Video verif.",aCalc.reduce((a,p)=>a+(p._c?.iV||0),0),C.purple],["Alarmas",aCalc.reduce((a,p)=>a+(p._c?.iA||0),0),C.amber]].map(([l,v,c])=>{const pct=mrrTotal>0?v/mrrTotal:0;return v>0&&<div key={l} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:12,color:C.textS,fontFamily:ff}}>{l}</span><span style={{fontSize:12,color:c,fontFamily:ff,fontWeight:600}}>{fmtCLP(v)}/mes</span></div><div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:c,width:(pct*100).toFixed(1)+"%",borderRadius:3}}/></div></div>;})}
            <div style={{marginTop:8,paddingTop:8,borderTop:"1px solid "+C.border,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:11,color:C.textM,fontFamily:ff}}>Total MRR neto</span><span style={{fontSize:14,fontWeight:300,color:C.green,fontFamily:ff}}>{fmtCLP(mrrTotal)}/mes</span></div>
          </div>}
        </Card>
      </div>
      {/* Propuestas recientes del cliente */}
      {myProps.length>0&&<Card C={C} style={{marginTop:14}}>
        <STitle C={C}>Últimas propuestas</STitle>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:"1px solid "+C.border}}>{["Estado","Propuesta","Instalación","Tipo","MRR/mes","Proyecto","Semáforo","Fecha"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
          <tbody>{[...myProps].sort((a,b)=>(b.fecha||b.createdAt||"").localeCompare(a.fecha||a.createdAt||"")).slice(0,8).map((p,i)=>{
            const inst=instalaciones.find(i=>i.id===p.instalacionId);
            const r=calcProp(p,params);
            return <tr key={p.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent"}}>
              <td style={tdS}><Bdg color={COL_E[p.estado]||"#64748B"} small>{p.estado||"Borrador"}</Bdg></td>
              <td style={{...tdS,fontWeight:600,color:C.text}}>{p.nombre||"—"}</td>
              <td style={{...tdS,color:C.textM}}>{inst?.nombre||"—"}</td>
              <td style={tdS}><Bdg color={C.blue} small>{p.tipoVenta||"—"}</Bdg></td>
              <td style={{...tdS,color:r?.tieneSvc?C.green:C.textM}}>{r?.tieneSvc?fmtCLP(r.iRec)+"/mes":"—"}</td>
              <td style={{...tdS,color:r?.tieneProj?C.blue:C.textM}}>{r?.tieneProj?fmtCLP(r.vf):"—"}</td>
              <td style={tdS}>{r&&r.tieneProj&&r.tieneSvc?<Bdg color={r.sem.color} small>{r.sem.label}</Bdg>:<span style={{color:C.textM,fontSize:10}}>—</span>}</td>
              <td style={{...tdS,color:C.textM,fontSize:10}}>{p.fecha||p.createdAt?.slice(0,10)||"—"}</td>
            </tr>;
          })}</tbody>
        </table></div>
      </Card>}
    </div>}

    {/* ── TAB: INSTALACIONES ── */}
    {activeTab==="instalaciones"&&<div>
      {!readonly&&<div style={{marginBottom:12}}><Btn C={C} onClick={()=>{setInstForm(bInstalacion(cliente.id));setInstModal("new");}}>+ Nueva instalación</Btn></div>}
      {myInst.length===0?<Empty C={C} icon="◫" title="Sin instalaciones" sub="Agrega la primera instalación de este cliente" action={!readonly&&<Btn C={C} onClick={()=>{setInstForm(bInstalacion(cliente.id));setInstModal("new");}}>+ Nueva instalación</Btn>}/>
      :myInst.map(inst=>{
        const instProps=propuestas.filter(p=>p.instalacionId===inst.id);
        const open=expandedInst[inst.id];
        const aprobInst=instProps.filter(p=>p.estado==="Aprobada");
        const mrrInst=aprobInst.reduce((a,p)=>a+(calcProp(p,params)?.iRec||0),0);
        const eCol=inst.estado==="Activa"?C.green:C.red;
        return <div key={inst.id} style={{marginBottom:10,background:C.bg1,border:"1px solid "+C.border,borderRadius:7,overflow:"hidden"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 16px",cursor:"pointer"}} onClick={()=>setExpandedInst(e=>({...e,[inst.id]:!open}))}>
            <span style={{color:open?C.blue:C.textM,fontSize:11,flexShrink:0}}>{open?"▾":"▸"}</span>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>{inst.nombre}</span>
                <Bdg color={eCol} small>{inst.estado||"Activa"}</Bdg>
                {mrrInst>0&&<Bdg color={C.green} small>MRR {fmtCLP(mrrInst)}/mes</Bdg>}
              </div>
              <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:2}}>
                {[inst.direccion,inst.comuna,inst.region].filter(Boolean).join(", ")}
                {inst.responsable?" · Resp: "+inst.responsable:""}
                {instProps.length>0?" · "+instProps.length+" propuesta"+(instProps.length!==1?"s":""):""}
              </div>
            </div>
            {!readonly&&<div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
              <Btn C={C} ghost small onClick={()=>{setInstForm({...inst});setInstModal("edit");}}>Editar</Btn>
              <Btn C={C} small onClick={()=>{const p2=bPropuesta(cliente.id,inst.id);p2.numero=nextNumero(params.cotPrefijo);setPropForm(p2);setPropModal("new");}}>+ Propuesta</Btn>
              {confInstId===inst.id
                ?<><Btn C={C} color={C.red} small onClick={()=>removeInst(inst.id)}>Confirmar</Btn><Btn C={C} ghost small onClick={()=>setConfInstId(null)}>No</Btn></>
                :<Btn C={C} ghost color={C.red} small onClick={()=>setConfInstId(inst.id)}>🗑</Btn>}
            </div>}
          </div>
          {open&&<div style={{borderTop:"1px solid "+C.border,padding:"10px 16px"}}>
            {instProps.length===0
              ?<div style={{color:C.textM,fontSize:12,fontFamily:ff,textAlign:"center",padding:"14px 0"}}>
                Sin propuestas.{!readonly&&<> <span style={{color:C.blue,cursor:"pointer"}} onClick={()=>{const p2=bPropuesta(cliente.id,inst.id);p2.numero=nextNumero(params.cotPrefijo);setPropForm(p2);setPropModal("new");}}>Crear una</span></>}
              </div>
              :<div>{instProps.map((p,i)=>{
                const r=calcProp(p,params);
                return <div key={p.id} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 11px",background:i%2?C.bg2:"transparent",borderRadius:5,marginBottom:4}}>
                  <div style={{flexShrink:0,paddingTop:2}}>
                    {readonly?<Bdg color={COL_E[p.estado]||"#64748B"} small>{p.estado||"Borrador"}</Bdg>
                    :<select value={p.estado||"Borrador"} onChange={e=>changeStateProp(p,e.target.value)} style={{background:"transparent",border:"1px solid "+(COL_E[p.estado]||"#64748B")+"66",color:COL_E[p.estado]||"#64748B",borderRadius:4,fontSize:10,fontFamily:ff,cursor:"pointer",padding:"2px 5px",outline:"none"}}>
                      {ESTADOS.map(s=><option key={s} value={s} style={{background:C.bg1,color:C.text}}>{s}</option>)}
                    </select>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:3}}>
                      <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>{p.nombre}</span>
                      <Bdg color={C.blue} small>{p.tipoVenta||"—"}</Bdg>
                      {r&&r.tieneProj&&r.tieneSvc&&<Bdg color={r.sem.color} small>{r.sem.label}</Bdg>}
                    </div>
                    <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:11,color:C.textM,fontFamily:ff}}>
                      {r?.tieneProj&&<span>Proyecto: <span style={{color:C.blue}}>{fmtCLP(r.vf)}</span></span>}
                      {r?.tieneSvc&&<span>MRR: <span style={{color:C.green}}>{fmtCLP(r.iRec)}/mes</span></span>}
                      {r?.sub>0&&<span>Subsidio: <span style={{color:C.amber}}>{fmtCLP(r.sub)}</span></span>}
                      {isFinite(r?.meses)&&r?.meses>0&&<span>Payback: {fmtN(r.meses,0)} m</span>}
                      <span style={{color:C.textM}}>{p.fecha||p.createdAt?.slice(0,10)||"—"}</span>
                    </div>
                  </div>
                  <div style={{display:"flex",gap:3,flexShrink:0}}>
                    <Btn C={C} small onClick={()=>onCalc&&onCalc(p)}>Calc.</Btn>
                    {!readonly&&<Btn C={C} ghost small onClick={()=>{setPropForm({...p});setPropModal("edit");}}>Editar</Btn>}
                    {!readonly&&(confPropId===p.id
                      ?<><Btn C={C} color={C.red} small onClick={()=>removeProp(p.id)}>OK</Btn><Btn C={C} ghost small onClick={()=>setConfPropId(null)}>No</Btn></>
                      :<Btn C={C} ghost color={C.red} small onClick={()=>setConfPropId(p.id)}>🗑</Btn>)}
                  </div>
                </div>;
              })}</div>
            }
          </div>}
        </div>;
      })}
    </div>}

    {/* ── TAB: PROPUESTAS ── */}
    {activeTab==="propuestas"&&<div>
      {!readonly&&<div style={{marginBottom:12,display:"flex",gap:7}}>
        <Btn C={C} onClick={()=>{const p1=bPropuesta(cliente.id,"");p1.numero=nextNumero(params.cotPrefijo);setPropForm(p1);setPropModal("new");}}>+ Nueva propuesta</Btn>
      </div>}
      {myProps.length===0?<Empty C={C} title="Sin propuestas" sub="Crea la primera propuesta para este cliente"/>
      :<Card C={C} style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:"1px solid "+C.border,background:C.bg2}}>
            {["Estado","N°","Propuesta","Instalación","Tipo","MRR/mes","Proyecto","Semáforo","Acciones"].map(h=><th key={h} style={thS}>{h}</th>)}
          </tr></thead>
          <tbody>{[...myProps].sort((a,b)=>(b.fecha||b.createdAt||"").localeCompare(a.fecha||a.createdAt||"")).map((p,i)=>{
            const inst=instalaciones.find(i=>i.id===p.instalacionId);
            const r=calcProp(p,params);
            return <tr key={p.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent"}}>
              <td style={tdS}>
                {readonly?<Bdg color={COL_E[p.estado]||"#64748B"} small>{p.estado||"Borrador"}</Bdg>
                :<select value={p.estado||"Borrador"} onChange={e=>changeStateProp(p,e.target.value)} style={{background:"transparent",border:"1px solid "+(COL_E[p.estado]||"#64748B")+"66",color:COL_E[p.estado]||"#64748B",borderRadius:4,fontSize:10,fontFamily:ff,cursor:"pointer",padding:"2px 5px",outline:"none"}}>
                  {ESTADOS.map(s=><option key={s} value={s} style={{background:C.bg1,color:C.text}}>{s}</option>)}
                </select>}
              </td>
              <td style={{...tdS,color:C.textM,fontSize:10}}>{p.numero||"—"}</td>
              <td style={{...tdS,fontWeight:600,color:C.text}}>{p.nombre||"—"}</td>
              <td style={{...tdS,color:C.textM}}>{inst?.nombre||"—"}</td>
              <td style={tdS}><Bdg color={C.blue} small>{p.tipoVenta||"—"}</Bdg></td>
              <td style={{...tdS,color:r?.tieneSvc?C.green:C.textM}}>{r?.tieneSvc?fmtCLP(r.iRec)+"/mes":"—"}</td>
              <td style={{...tdS,color:r?.tieneProj?C.blue:C.textM}}>{r?.tieneProj?fmtCLP(r.vf):"—"}</td>
              <td style={tdS}>{r&&r.tieneProj&&r.tieneSvc?<Bdg color={r.sem.color} small>{r.sem.label}</Bdg>:<span style={{color:C.textM,fontSize:10}}>—</span>}</td>
              <td style={tdS}><div style={{display:"flex",gap:3}}>
                <Btn C={C} small onClick={()=>onCalc&&onCalc(p)}>Calc.</Btn>
                {!readonly&&<Btn C={C} ghost small onClick={()=>{setPropForm({...p});setPropModal("edit");}}>Editar</Btn>}
                {!readonly&&(confPropId===p.id
                  ?<><Btn C={C} color={C.red} small onClick={()=>removeProp(p.id)}>OK</Btn><Btn C={C} ghost small onClick={()=>setConfPropId(null)}>No</Btn></>
                  :<Btn C={C} ghost color={C.red} small onClick={()=>setConfPropId(p.id)}>🗑</Btn>)}
              </div></td>
            </tr>;
          })}</tbody>
        </table></div>
      </Card>}
    </div>}

    {/* ── Modal editar cliente ── */}
    {editModal&&<Modal C={C} title="Editar cliente" onClose={()=>setEditModal(false)} width={640}>
      <G cols={2}>
        <Fld C={C} label="Razón social" req><Inp C={C} value={cliForm.razonSocial||""} onChange={v=>scf("razonSocial",v)}/></Fld>
        <Fld C={C} label="Nombre comercial"><Inp C={C} value={cliForm.nombreComercial||""} onChange={v=>scf("nombreComercial",v)}/></Fld>
        <Fld C={C} label="RUT"><Inp C={C} value={cliForm.rut||""} onChange={v=>scf("rut",v)}/></Fld>
        <Fld C={C} label="Rubro"><Sel C={C} value={cliForm.rubro||""} onChange={v=>scf("rubro",v)} opts={RUBROS}/></Fld>
        <Fld C={C} label="Estado"><Sel C={C} value={cliForm.estado||"Prospecto"} onChange={v=>scf("estado",v)} opts={ESTADOS_C}/></Fld>
        <Fld C={C} label="Ejecutivo responsable"><Sel C={C} value={cliForm.ejecutivo||""} onChange={v=>scf("ejecutivo",v)} opts={ejecutivos} placeholder="— seleccionar —"/></Fld>
        <Fld C={C} label="Contacto"><Inp C={C} value={cliForm.contacto||""} onChange={v=>scf("contacto",v)}/></Fld>
        <Fld C={C} label="Teléfono"><Inp C={C} value={cliForm.telefono||""} onChange={v=>scf("telefono",v)}/></Fld>
        <Fld C={C} label="Email"><Inp C={C} value={cliForm.email||""} onChange={v=>scf("email",v)} type="email"/></Fld>
        <Fld C={C} label="Dirección"><Inp C={C} value={cliForm.direccion||""} onChange={v=>scf("direccion",v)}/></Fld>
      </G>
      <Fld C={C} label="Notas"><Inp C={C} value={cliForm.notas||""} onChange={v=>scf("notas",v)}/></Fld>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}>
        <Btn C={C} ghost onClick={()=>setEditModal(false)}>Cancelar</Btn>
        <Btn C={C} onClick={saveCliente} disabled={!cliForm.razonSocial?.trim()}>Guardar</Btn>
      </div>
    </Modal>}

    {/* ── Modal instalación ── */}
    {instModal&&<Modal C={C} title={instModal==="new"?"Nueva instalación":"Editar instalación"} onClose={()=>setInstModal(null)} width={620}>
      <G cols={2}>
        <Fld C={C} label="Nombre instalación" req><Inp C={C} value={instForm.nombre||""} onChange={v=>sif("nombre",v)}/></Fld>
        <Fld C={C} label="Estado"><Sel C={C} value={instForm.estado||"Activa"} onChange={v=>sif("estado",v)} opts={ESTADOS_I}/></Fld>
        <Fld C={C} label="Dirección"><Inp C={C} value={instForm.direccion||""} onChange={v=>sif("direccion",v)}/></Fld>
        <Fld C={C} label="Comuna"><Inp C={C} value={instForm.comuna||""} onChange={v=>sif("comuna",v)}/></Fld>
        <Fld C={C} label="Región"><Sel C={C} value={instForm.region||""} onChange={v=>sif("region",v)} opts={REGIONES}/></Fld>
        <Fld C={C} label="Responsable local"><Inp C={C} value={instForm.responsable||""} onChange={v=>sif("responsable",v)}/></Fld>
        <Fld C={C} label="Teléfono"><Inp C={C} value={instForm.telefono||""} onChange={v=>sif("telefono",v)}/></Fld>
      </G>
      <Fld C={C} label="Observaciones"><Inp C={C} value={instForm.observaciones||""} onChange={v=>sif("observaciones",v)}/></Fld>

      {/* ── GEOCERCA ── */}
      <div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:7,padding:"12px 14px",marginTop:4}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:ff}}>📍 Geocerca (validación GPS para técnicos)</div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:2}}>Define la ubicación física donde el técnico debe estar para iniciar una tarea.</div>
          </div>
          <Btn C={C} ghost small onClick={()=>{if(!navigator.geolocation){alert("Geolocalización no disponible");return;}navigator.geolocation.getCurrentPosition(p=>{sif("geoLat",+p.coords.latitude.toFixed(6));sif("geoLng",+p.coords.longitude.toFixed(6));},{},{ enableHighAccuracy:true,timeout:8000});}} >📍 Capturar mi ubicación</Btn>
        </div>
        <G cols={3}>
          <Fld C={C} label="Latitud"><Inp C={C} value={instForm.geoLat||""} onChange={v=>sif("geoLat",v?+v:null)} placeholder="-33.4569" type="number"/></Fld>
          <Fld C={C} label="Longitud"><Inp C={C} value={instForm.geoLng||""} onChange={v=>sif("geoLng",v?+v:null)} placeholder="-70.6483" type="number"/></Fld>
          <Fld C={C} label="Radio geocerca" suffix="m"><Inp C={C} value={instForm.geoRadioMetros||100} onChange={v=>sif("geoRadioMetros",+v||100)} type="number"/></Fld>
        </G>
        {instForm.geoLat&&instForm.geoLng&&<div style={{marginTop:8}}>
          <a href={`https://maps.google.com/?q=${instForm.geoLat},${instForm.geoLng}`} target="_blank" rel="noopener noreferrer" style={{fontSize:11,color:C.blue,fontFamily:ff}}>🗺 Ver en Google Maps</a>
          <span style={{fontSize:11,color:C.green,fontFamily:ff,marginLeft:12}}>✓ Geocerca configurada · Radio: {instForm.geoRadioMetros||100}m</span>
        </div>}
        {!instForm.geoLat&&<div style={{fontSize:11,color:C.amber,fontFamily:ff,marginTop:4}}>⚠ Sin geocerca — los técnicos podrán iniciar tareas desde cualquier ubicación</div>}
      </div>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:10}}>
        <Btn C={C} ghost onClick={()=>setInstModal(null)}>Cancelar</Btn>
        <Btn C={C} onClick={saveInst} disabled={!instForm.nombre?.trim()}>Guardar</Btn>
      </div>
    </Modal>}

    {/* ── Modal propuesta (simplificado desde detalle) ── */}
    {propModal&&<Modal C={C} title={propModal==="new"?"Nueva propuesta":"Editar propuesta"} onClose={()=>setPropModal(null)} width={700}>
      <G cols={2}>
        <Fld C={C} label="Nombre propuesta" req><Inp C={C} value={propForm.nombre||""} onChange={v=>spf("nombre",v)}/></Fld>
        <Fld C={C} label="N° cotización"><Inp C={C} value={propForm.numero||""} onChange={v=>spf("numero",v)}/></Fld>
        <Fld C={C} label="Instalación">
          <Sel C={C} value={propForm.instalacionId||""} onChange={v=>spf("instalacionId",v)}
            opts={myInst.map(i=>({value:i.id,label:i.nombre||"—"}))} placeholder="— sin instalación específica —"/>
        </Fld>
        <Fld C={C} label="Estado"><Sel C={C} value={propForm.estado||"Borrador"} onChange={v=>spf("estado",v)} opts={ESTADOS}/></Fld>
        <Fld C={C} label="Tipo de venta"><Sel C={C} value={propForm.tipoVenta||TIPOS_V[0]} onChange={v=>spf("tipoVenta",v)} opts={TIPOS_V}/></Fld>
        <Fld C={C} label="Categoría"><Sel C={C} value={propForm.categoria||""} onChange={v=>spf("categoria",v)} opts={categorias}/></Fld>
        <Fld C={C} label="Fecha"><Inp C={C} value={propForm.fecha||""} onChange={v=>spf("fecha",v)} type="date"/></Fld>
        <Fld C={C} label="Vigencia"><Inp C={C} value={propForm.vigencia||""} onChange={v=>spf("vigencia",v)} type="date"/></Fld>
        <Fld C={C} label="Valor proyecto" prefix="$"><Inp C={C} value={propForm.valorProyecto||0} onChange={v=>setPropForm(f=>({...f,valorProyecto:v,valorFinal:v*(1-(f.descuento||0)/100)}))} type="number"/></Fld>
        <Fld C={C} label="Descuento proyecto" suffix="%"><Inp C={C} value={propForm.descuento||0} onChange={v=>setPropForm(f=>({...f,descuento:v,valorFinal:(f.valorProyecto||0)*(1-v/100)}))} type="number"/></Fld>
        <Fld C={C} label="Cámaras monitoreo"><Inp C={C} value={propForm.camaras||0} onChange={v=>spf("camaras",v)} type="number"/></Fld>
        <Fld C={C} label="Duración contrato" suffix="meses"><Inp C={C} value={propForm.duracionContrato||0} onChange={v=>spf("duracionContrato",v)} type="number"/></Fld>
      </G>
      <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginBottom:10}}>Para configurar todos los servicios y costos en detalle, usa el módulo de Propuestas.</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn C={C} ghost onClick={()=>setPropModal(null)}>Cancelar</Btn>
        <Btn C={C} onClick={saveProp} disabled={!propForm.nombre?.trim()}>Guardar propuesta</Btn>
      </div>
    </Modal>}
  </div>;
}


// CLIENTES

// PROPUESTAS
// ─────────────────────────────────────────────────────────────────────────────
// COTIZACIONES VIEW — Módulo completo: lista + detalle scrolleable
// ─────────────────────────────────────────────────────────────────────────────
function CotizacionesView({C,cotizaciones,plantillas,clientes,instalaciones,materiales,params,propuestas,onSave,onDelete,onSavePlantilla,onDeletePlantilla,readonly}){
  const [vista,setVista]=useState("lista"); // "lista" | "detalle"
  const [selId,setSelId]=useState(null);
  const [confId,setConfId]=useState(null);
  const [buscar,setBuscar]=useState("");
  const [filtroEst,setFiltroEst]=useState("Todos");

  const cot=cotizaciones.find(c=>c.id===selId)||null;

  const abrir=id=>{setSelId(id);setVista("detalle");};
  const nueva=()=>{
    const c=bCotizacion(params);
    c.numero=nextNroCot(cotizaciones,params?.cotPrefijo||"COT");
    onSave(c);setSelId(c.id);setVista("detalle");
  };
  const desde=pl=>{
    const c={...bCotizacion(params),...pl.datos};
    c.id=newId();c.numero=nextNroCot(cotizaciones,params?.cotPrefijo||"COT");
    c.estado="Borrador";c.createdAt=new Date().toISOString();
    c.clienteId="";c.instalacionId="";
    onSave(c);setSelId(c.id);setVista("detalle");
  };

  const filtradas=cotizaciones.filter(c=>{
    const okE=filtroEst==="Todos"||c.estado===filtroEst;
    const cl=clientes.find(x=>x.id===c.clienteId);
    const okB=!buscar||(c.numero||"").toLowerCase().includes(buscar.toLowerCase())||(cl?.razonSocial||"").toLowerCase().includes(buscar.toLowerCase())||(c.descripcion||"").toLowerCase().includes(buscar.toLowerCase());
    return okE&&okB;
  }).sort((a,b)=>b.createdAt?.localeCompare(a.createdAt||"")||0);

  if(vista==="detalle"&&cot){
    return <CotizacionDetalle C={C} cot={cot} clientes={clientes} instalaciones={instalaciones} materiales={materiales} params={params} plantillas={plantillas} propuestas={propuestas} onSave={c=>{onSave(c);}} onSavePlantilla={onSavePlantilla} onVolver={()=>{setVista("lista");setSelId(null);}} readonly={readonly}/>;
  }

  // ── LISTA ──
  const thS={padding:"8px 12px",color:C.textM,fontWeight:600,textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff};
  const tdS={padding:"9px 12px",fontFamily:ff,fontSize:13};
  const pendientes=cotizaciones.filter(c=>["Borrador","En curso"].includes(c.estado||"Borrador")).length;
  const conDocumento=cotizaciones.filter(c=>c.documentoClienteHtml||c.documentoClienteCloudStatus).length;

  return <div>
    <ModuleHero
      C={C}
      eyebrow="Cotizaciones y propuestas"
      title="Preparar ofertas para cliente"
      subtitle="Trabaja por etapas: primero solicitud y datos base, luego costeo interno, documento cliente y revisión antes de convertir a propuesta."
      actions={!readonly&&<Btn C={C} onClick={nueva}>Nueva cotización</Btn>}
    >
      <WorkflowSteps C={C} active={1} steps={["Solicitud recibida","Costeo interno","Documento cliente","Revisión / propuesta"]}/>
      <div style={{marginTop:12}}>
        <QuickActions C={C} items={[
          {label:`${pendientes} por preparar`,description:"Borradores y cotizaciones en curso",tone:pendientes?C.amber:C.green,onClick:()=>setFiltroEst("En curso")},
          {label:`${conDocumento} con documento`,description:"Versiones cliente disponibles",tone:conDocumento?C.green:C.textM,onClick:()=>setFiltroEst("Todos")},
          {label:"Usar plantilla",description:"Partir desde un formato ya armado",tone:C.orange||C.blue,disabled:readonly||plantillas.length===0},
          {label:"Revisión gerencial",description:"Control de margen y excepciones",tone:C.purple,onClick:()=>setFiltroEst("Cerrada")},
        ]}/>
      </div>
    </ModuleHero>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,flexWrap:"wrap"}}>
      <input placeholder="Buscar cotización, cliente..." value={buscar} onChange={e=>setBuscar(e.target.value)} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:5,color:C.text,padding:"7px 12px",fontSize:13,fontFamily:ff,outline:"none",flex:"1 1 220px"}}/>
      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
        {["Todos",...ESTADOS_COT].map(e=><button key={e} onClick={()=>setFiltroEst(e)} style={{padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:filtroEst===e?700:400,cursor:"pointer",background:filtroEst===e?(COL_COT[e]||C.blue)+"22":"transparent",color:filtroEst===e?(COL_COT[e]||C.blue):C.textM,border:"1px solid "+(filtroEst===e?(COL_COT[e]||C.blue):C.border),fontFamily:ff}}>{e} ({e==="Todos"?cotizaciones.length:cotizaciones.filter(c=>c.estado===e).length})</button>)}
      </div>
      {!readonly&&<div style={{display:"flex",gap:7}}>
        {plantillas.length>0&&<Sel C={C} value="" onChange={v=>{if(v){const pl=plantillas.find(p=>p.id===v);if(pl)desde(pl);}}}
          opts={[{value:"",label:"Partir de plantilla..."},...plantillas.map(p=>({value:p.id,label:p.nombre}))]}/>}
        <Btn C={C} onClick={nueva}>Nueva cotización</Btn>
      </div>}
    </div>

    {/* KPIs */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      {[
        {label:"Solicitudes",val:cotizaciones.length,color:C.blue},
        {label:"Por preparar",val:pendientes,color:C.amber},
        {label:"Documento cliente",val:conDocumento,color:C.green},
        {label:"Con propuesta",val:cotizaciones.filter(c=>propuestas.some(p=>p.cotizacionId===c.id)).length,color:C.textM},
      ].map(k=><div key={k.label} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:12,padding:"12px 14px",minWidth:0}}>
        <div style={{fontSize:9,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.label}</div>
        <div style={{fontSize:20,fontWeight:700,color:k.color,fontFamily:ff,marginTop:3}}>{k.val}</div>
      </div>)}
    </div>

    {filtradas.length===0
      ?<EmptyState C={C} icon="📄" title="Sin cotizaciones" sub="Crea tu primera cotización técnica. El jefe de operaciones cuantifica todos los costos reales del proyecto." action={!readonly&&<Btn C={C} onClick={nueva}>+ Primera cotización</Btn>}/>
      :<Card C={C} style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:"1px solid "+C.border,background:C.bg2}}>
            {["Estado","N°","Cliente","Tipo","Descripción","Precio neto","Propuestas","Fecha",""].map(h=><th key={h} style={thS}>{h}</th>)}
          </tr></thead>
          <tbody>{filtradas.map((c,i)=>{
            const cl=clientes.find(x=>x.id===c.clienteId);
            const tp=(params?.tiposProyecto||TIPOS_PROYECTO_DEF).find(t=>t.id===c.tipoProyectoId);
            const calc=c.tieneProyecto?calcCotizacion(c,params):null;
            const nProp=propuestas.filter(p=>p.cotizacionId===c.id).length;
            return <tr key={c.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent",cursor:"pointer"}} onClick={()=>abrir(c.id)}>
              <td style={tdS}><select value={c.estado||"Borrador"} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();onSave({...c,estado:e.target.value});}} style={{background:"transparent",border:"1px solid "+(COL_COT[c.estado]||"#64748B")+"66",color:COL_COT[c.estado]||"#64748B",borderRadius:4,fontSize:10,fontFamily:ff,cursor:"pointer",padding:"2px 5px",outline:"none"}}>{ESTADOS_COT.map(s=><option key={s} value={s} style={{background:C.bg1,color:C.text}}>{s}</option>)}</select></td>
              <td style={{...tdS,color:C.textM,fontSize:10,fontFamily:"monospace"}}>{c.numero||"—"}</td>
              <td style={{...tdS,fontWeight:600,color:C.text}}>{cl?.razonSocial||cl?.nombreComercial||"Sin cliente"}</td>
              <td style={tdS}>{tp?<Bdg color={C.blue} small>{tp.nombre}</Bdg>:<span style={{color:C.textM}}>—</span>}</td>
              <td style={{...tdS,color:C.textM,maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.descripcion||"—"}</td>
              <td style={{...tdS,fontWeight:700,color:calc?C.blue:C.textM}}>{calc?fmtCLP(calc.precioNeto):"Solo serv."}</td>
              <td style={{...tdS,textAlign:"center"}}>{nProp>0?<Bdg color={C.green} small>{nProp} propuesta{nProp!==1?"s":""}</Bdg>:<span style={{color:C.textM,fontSize:11}}>—</span>}</td>
              <td style={{...tdS,color:C.textM,fontSize:11}}>{c.fecha||"—"}</td>
              <td style={tdS} onClick={e=>e.stopPropagation()}><div style={{display:"flex",gap:5}}>
                <Btn C={C} ghost small onClick={()=>abrir(c.id)}>Ver</Btn>
                {!readonly&&(confId===c.id?<><Btn C={C} color={C.red} small onClick={()=>{onDelete(c.id);setConfId(null);}}>✓</Btn><Btn C={C} ghost small onClick={()=>setConfId(null)}>✕</Btn></>:<Btn C={C} ghost small color={C.red} onClick={()=>setConfId(c.id)}>🗑</Btn>)}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div></Card>
    }
  </div>;
}

function CotizacionDetalle({C,cot:cotInit,clientes,instalaciones,materiales,params,plantillas,propuestas,onSave,onSavePlantilla,onVolver,readonly}){
  const [form,setForm]=useState({...cotInit});
  const [saved,setSaved]=useState(false);
  const [modalPlantilla,setModalPlantilla]=useState(false);
  const [docOpen,setDocOpen]=useState(false);
  const [nombrePlantilla,setNombrePlantilla]=useState("");
  const [nuevoMat,setNuevoMat]=useState({desc:"",cant:1,precio:0});
  const [nuevoSvc,setNuevoSvc]=useState({svcId:"",cantidad:1,ufUnitario:""});
  const [nuevoPago,setNuevoPago]=useState({nombre:"",pct:50});

  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const guardar=()=>{onSave({...form,updatedAt:new Date().toISOString()});setSaved(true);setTimeout(()=>setSaved(false),2500);};
  const guardarDocumentoCliente=async(html,templateId)=>{
    const now=new Date().toISOString();
    const selectedTemplate=templateId||form.documentoClienteTemplate||"auto";
    let cloudPatch={};
    try{
      let generatedId=form.documentoClienteCloudId||form.generatedDocumentId||"";
      if(!generatedId){
        const doc=await generateQuoteDocument(form.id, null, {
          quoteNumber:form.numero||"",
          templateId:selectedTemplate,
          status:"editable",
        });
        generatedId=doc?.id||"";
      }
      const nextVersion=(form.documentoClienteVersion||0)+1;
      const version=generatedId?await createDocumentVersion(generatedId,{
        contentHtml:html,
        versionNumber:nextVersion,
        metadata:{
          quoteNumber:form.numero||"",
          templateId:selectedTemplate,
          clientId:form.clienteId||"",
          netAmount:calc?.precioNeto||0,
          savedAt:now,
        },
      }):null;
      await createActivityEvent("quote",form.id,"document_version_created",{
        summary:`Documento de cotización ${form.numero||form.id} versionado`,
        metadata:{generatedDocumentId:generatedId,versionId:version?.id||"",versionNumber:nextVersion,templateId:selectedTemplate},
      }).catch(()=>null);
      cloudPatch={
        documentoClienteCloudId:generatedId,
        documentoClienteVersion:nextVersion,
        documentoClienteVersionId:version?.id||"",
        documentoClienteCloudStatus:"versionado",
        documentoClienteCloudError:"",
      };
    }catch(error){
      cloudPatch={
        documentoClienteCloudStatus:"local",
        documentoClienteCloudError:error.message||"No se pudo versionar en cloud.",
      };
    }
    const updated={...form,documentoClienteHtml:html,documentoClienteTemplate:selectedTemplate,documentoClienteUpdatedAt:now,updatedAt:now,...cloudPatch};
    setForm(updated);
    onSave(updated);
    setSaved(true);
    setTimeout(()=>setSaved(false),2500);
    return {cloudVersion:cloudPatch.documentoClienteVersion||0, cloudStatus:cloudPatch.documentoClienteCloudStatus};
  };

  const calc=useMemo(()=>calcCotizacion(form,params),[form,params]);
  const fmtR=v=>"$"+Math.round(v).toLocaleString("es-CL");
  const costoKm=calcCostoKm(params);
  const roles=params?.rolesTecnicos||ROLES_TEC_DEF;
  const tiposP=params?.tiposProyecto||TIPOS_PROYECTO_DEF;
  const svcsDisp=params?.serviciosRecurrentes||SERVICIOS_REC_DEF;
  const instCliente=instalaciones.filter(i=>i.clienteId===form.clienteId);
  const clienteDoc=clientes.find(c=>c.id===form.clienteId);
  const instalacionDoc=instalaciones.find(i=>i.id===form.instalacionId);

  // Materiales helpers
  const addMat=()=>{if(!nuevoMat.desc.trim())return;sf("materiales",[...form.materiales,{id:newId(),...nuevoMat}]);setNuevoMat({desc:"",cant:1,precio:0});};
  const addMatCat=matId=>{const m=materiales.find(x=>x.id===matId);if(!m)return;sf("materiales",[...form.materiales,{id:newId(),desc:m.nombre,cant:1,precio:m.precioUnitario||0,materialId:m.id}]);};
  const delMat=id=>sf("materiales",form.materiales.filter(m=>m.id!==id));
  const updMat=(id,k,v)=>sf("materiales",form.materiales.map(m=>m.id===id?{...m,[k]:v}:m));

  // Servicios recurrentes helpers
  const addSvc=()=>{
    if(!nuevoSvc.svcId)return;
    const svc=svcsDisp.find(s=>s.id===nuevoSvc.svcId);
    sf("serviciosRec",[...(form.serviciosRec||[]),{id:newId(),svcId:nuevoSvc.svcId,nombre:svc?.nombre||"",cantidad:nuevoSvc.cantidad||1,ufUnitario:nuevoSvc.ufUnitario!==""?+nuevoSvc.ufUnitario:(svc?.ufUnitario||0)}]);
    setNuevoSvc({svcId:"",cantidad:1,ufUnitario:""});
  };
  const delSvc=id=>sf("serviciosRec",(form.serviciosRec||[]).filter(s=>s.id!==id));

  // Condiciones pago helpers
  const addPago=()=>{
    const monto=Math.round((calc?.precioNeto||0)*(nuevoPago.pct||0)/100);
    sf("condicionesPago",[...(form.condicionesPago||[]),{id:newId(),nombre:nuevoPago.nombre||`Pago ${(form.condicionesPago||[]).length+1}`,pct:nuevoPago.pct||50,monto}]);
    setNuevoPago({nombre:"",pct:50});
  };
  const delPago=id=>sf("condicionesPago",(form.condicionesPago||[]).filter(p=>p.id!==id));

  // Guardar plantilla
  const guardarPlantilla=()=>{
    if(!nombrePlantilla.trim())return;
    const datos={tieneProyecto:form.tieneProyecto,tieneRecurrente:form.tieneRecurrente,tipoProyectoId:form.tipoProyectoId,nTecnicos:form.nTecnicos,horasDia:form.horasDia,diasTrabajo:form.diasTrabajo,rolId:form.rolId,km:form.km,nViajes:form.nViajes,nPeajes:form.nPeajes,conEncomienda:form.conEncomienda,nDesayunos:form.nDesayunos,nAlmuerzos:form.nAlmuerzos,nCenas:form.nCenas,nNoches:form.nNoches,usarBonoKm:form.usarBonoKm,usarBonoTraslado:form.usarBonoTraslado,usarBonoTrato:form.usarBonoTrato,materiales:form.materiales.map(m=>({...m,id:newId()})),arriendo:form.arriendo,pctGG:form.pctGG,pctImp:form.pctImp,pctMargen:form.pctMargen,serviciosRec:(form.serviciosRec||[]).map(s=>({...s,id:newId()})),duracionContrato:form.duracionContrato};
    onSavePlantilla({id:newId(),nombre:nombrePlantilla,datos,createdAt:new Date().toISOString()});
    setModalPlantilla(false);setNombrePlantilla("");
  };

  const colMargen=calc?calc.margenReal>=0.25?C.green:calc.margenReal>=0.15?C.amber:C.red:C.textM;
  const nProp=propuestas.filter(p=>p.cotizacionId===form.id).length;
  const docReady=!!(form.documentoClienteHtml||form.documentoClienteCloudStatus);
  const activeStep=nProp>0?3:docReady?2:((form.materiales?.length||form.tieneProyecto)?1:0);

  return <div style={{maxWidth:1100,margin:"0 auto"}}>
    {/* Breadcrumb */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,fontSize:13,fontFamily:ff}}>
      <button onClick={onVolver} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:4,padding:0,fontFamily:ff}}>← Cotizaciones</button>
      <span style={{color:C.textM}}>/</span>
      <span style={{color:C.text,fontFamily:"monospace",fontSize:12}}>{form.numero||"Nueva"}</span>
    </div>

    <Card C={C} style={{marginBottom:14}}>
      <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:14,alignItems:"center",marginBottom:14}}>
        <div>
          <div style={{fontSize:11,color:C.orange||C.blue,textTransform:"uppercase",letterSpacing:"0.08em",fontWeight:900,fontFamily:ff,marginBottom:5}}>Flujo de preparación</div>
          <div style={{fontSize:18,color:C.text,fontWeight:900,fontFamily:ff,lineHeight:1.15}}>Solicitud → costeo → documento cliente → propuesta</div>
        </div>
        <Bdg color={activeStep>=2?C.green:C.amber} small>{docReady?"Documento listo":"Documento pendiente"}</Bdg>
      </div>
      <WorkflowSteps C={C} active={activeStep} steps={["Solicitud","Costeo interno","Documento cliente","Propuesta"]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginTop:14}}>
        <Stat C={C} small compact label="Precio neto" value={calc?fmtCLP(calc.precioNeto):"—"} color={C.orange||C.blue}/>
        <Stat C={C} small compact label="Margen" value={calc?fmtPct(calc.margenReal):"—"} color={colMargen}/>
        <Stat C={C} small compact label="Recurrente mensual" value={calc?fmtCLP(calc.totalMesCLP||0):"—"} color={C.green}/>
        <Stat C={C} small compact label="Propuestas" value={String(nProp)} color={nProp?C.green:C.textM}/>
      </div>
    </Card>

    {/* CABECERA */}
    <Card C={C} style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.blue}}>{form.numero||"Sin número"}</span>
        <select value={form.estado||"Borrador"} onChange={e=>sf("estado",e.target.value)} disabled={readonly} style={{background:"transparent",border:"1px solid "+(COL_COT[form.estado]||"#64748B")+"88",color:COL_COT[form.estado]||"#64748B",borderRadius:4,fontSize:11,fontFamily:ff,cursor:"pointer",padding:"3px 8px",outline:"none"}}>
          {ESTADOS_COT.map(s=><option key={s} value={s} style={{background:C.bg1,color:C.text}}>{s}</option>)}
        </select>
        {nProp>0&&<Bdg color={C.green} small>{nProp} propuesta{nProp!==1?"s":""} vinculadas</Bdg>}
        <div style={{flex:1}}/>
        {form.documentoClienteCloudStatus&&<Bdg color={form.documentoClienteCloudStatus==="versionado"?C.green:C.amber} small>
          {form.documentoClienteCloudStatus==="versionado"?`Doc v${form.documentoClienteVersion||1}`:"Doc local"}
        </Bdg>}
        <Btn C={C} variant="soft" small onClick={()=>setDocOpen(true)}>🧾 Documento cliente</Btn>
        {!readonly&&<div style={{display:"flex",gap:7}}>
          <Btn C={C} ghost small onClick={()=>setModalPlantilla(true)}>📋 Guardar plantilla</Btn>
          <Btn C={C} onClick={guardar}>{saved?"✓ Guardado":"💾 Guardar"}</Btn>
        </div>}
      </div>
      <G cols={2}>
        <Fld C={C} label="Cliente">
          <SelBusca C={C} value={form.clienteId} onChange={v=>{sf("clienteId",v);sf("instalacionId","");}}
            opts={[{value:"",label:"— Seleccionar cliente —"},...clientes.map(c=>({value:c.id,label:c.razonSocial||c.nombreComercial}))]}/>
        </Fld>
        <Fld C={C} label="Instalación">
          <Sel C={C} value={form.instalacionId} onChange={v=>sf("instalacionId",v)}
            opts={[{value:"",label:"— Seleccionar instalación —"},...instCliente.map(i=>({value:i.id,label:i.nombre||i.direccion||i.id}))]}/>
        </Fld>
      </G>
      <G cols={3}>
        <Fld C={C} label="Tipo de proyecto">
          <SelBusca C={C} value={form.tipoProyectoId} onChange={v=>sf("tipoProyectoId",v)}
            opts={[{value:"",label:"— Tipo de proyecto —"},...tiposP.filter(t=>t.activo!==false).map(t=>({value:t.id,label:t.nombre}))]}/>
        </Fld>
        <Fld C={C} label="Fecha">
          <Inp C={C} value={form.fecha||""} onChange={v=>sf("fecha",v)} type="date"/>
        </Fld>
        <Fld C={C} label="Descripción">
          <Inp C={C} value={form.descripcion||""} onChange={v=>sf("descripcion",v)} placeholder="Descripción breve del trabajo"/>
        </Fld>
      </G>
    </Card>

    {/* ¿QUÉ INCLUYE? */}
    <Card C={C} style={{marginBottom:14}}>
      <STitle C={C}>¿Qué incluye esta cotización?</STitle>
      <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
        {[["tieneProyecto","Proyecto / Trabajo a terreno"],["tieneRecurrente","Servicios recurrentes (monitoreo u otro)"]].map(([k,lbl])=>(
          <label key={k} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,fontFamily:ff,color:C.text}}>
            <input type="checkbox" checked={!!form[k]} onChange={e=>sf(k,e.target.checked)} style={{accentColor:C.blue,width:16,height:16}}/>
            {lbl}
          </label>
        ))}
      </div>
    </Card>

    {/* PROYECTO */}
    {form.tieneProyecto&&<>
      <div style={{fontSize:11,fontWeight:700,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8,marginTop:4}}>── Proyecto / Trabajo a terreno ──────────────────</div>

      {/* MO */}
      <Card C={C} style={{marginBottom:10}}>
        <STitle C={C}>👷 Mano de obra</STitle>
        <G cols={4}>
          <Fld C={C} label="N° técnicos" suffix="téc"><Inp C={C} value={form.nTecnicos||0} onChange={v=>sf("nTecnicos",+v||0)} type="number" disabled={readonly}/></Fld>
          <Fld C={C} label="Horas/día" suffix="h"><Inp C={C} value={form.horasDia||0} onChange={v=>sf("horasDia",+v||0)} type="number" disabled={readonly}/></Fld>
          <Fld C={C} label="Días" suffix="días"><Inp C={C} value={form.diasTrabajo||0} onChange={v=>sf("diasTrabajo",+v||0)} type="number" disabled={readonly}/></Fld>
          <Fld C={C} label="Total horas">
            <div style={{padding:"8px 11px",background:C.bg0,borderRadius:5,border:"1px solid "+C.border,fontSize:14,fontWeight:700,color:C.blue,fontFamily:ff}}>{calc?.totalHoras||0}h</div>
          </Fld>
        </G>
        <Fld C={C} label="Rol del técnico">
          <SelBusca C={C} value={form.rolId} onChange={v=>sf("rolId",v)}
            opts={roles.filter(r=>r.activo!==false).map(r=>({value:r.id,label:`${r.nombre} — ${fmtCLP(r.costoHora)}/h`}))}/>
        </Fld>
        <div style={{textAlign:"right",fontSize:12,fontFamily:ff,color:C.textM,marginTop:4}}>
          Costo MO: <b style={{color:C.blue,fontSize:14}}>{fmtCLP(calc?.costoMO||0)}</b>
          <span style={{marginLeft:8,color:C.textM}}>({form.nTecnicos} × {form.horasDia}h × {form.diasTrabajo}d × ${(calc?.rol?.costoHora||0).toLocaleString("es-CL")}/h)</span>
        </div>
      </Card>

      {/* TRASLADOS */}
      <Card C={C} style={{marginBottom:10}}>
        <STitle C={C} action={<span style={{fontSize:10,color:C.textM,fontFamily:ff}}>Config: ${costoKm.total.toLocaleString("es-CL")}/km</span>}>🚗 Traslados</STitle>
        <G cols={3}>
          <Fld C={C} label="Distancia" suffix="km"><Inp C={C} value={form.km||0} onChange={v=>sf("km",+v||0)} type="number" disabled={readonly}/></Fld>
          <Fld C={C} label="N° viajes" suffix="viajes"><Inp C={C} value={form.nViajes||1} onChange={v=>sf("nViajes",+v||1)} type="number" disabled={readonly}/></Fld>
          <Fld C={C} label="N° peajes (por viaje)" suffix="peajes"><Inp C={C} value={form.nPeajes||0} onChange={v=>sf("nPeajes",+v||0)} type="number" disabled={readonly}/></Fld>
        </G>
        <div style={{display:"flex",gap:20,alignItems:"center",marginTop:6,flexWrap:"wrap"}}>
          <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",fontSize:13,fontFamily:ff,color:C.text}}>
            <input type="checkbox" checked={!!form.conEncomienda} onChange={e=>sf("conEncomienda",e.target.checked)} style={{accentColor:C.blue}}/> Encomienda (${(params?.encomiendaReferencial||0).toLocaleString("es-CL")})
          </label>
          <div style={{flex:1,textAlign:"right",fontSize:12,fontFamily:ff,color:C.textM}}>
            Traslado: {fmtCLP(calc?.costoKmTotal||0)} · Peajes: {fmtCLP(calc?.costoPeajes||0)} · Encomienda: {fmtCLP(calc?.costoEncomienda||0)}
            <b style={{color:C.blue,fontSize:14,marginLeft:10}}>= {fmtCLP(calc?.totalTraslados||0)}</b>
          </div>
        </div>
      </Card>

      {/* VIÁTICOS */}
      <Card C={C} style={{marginBottom:10}}>
        <STitle C={C}>🍽 Viáticos y alojamiento</STitle>
        <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginBottom:10}}>Por técnico · por día (colaciones) o por noche (hospedaje)</div>
        <G cols={4}>
          {[["nDesayunos","Desayunos",params?.desayuno||0],["nAlmuerzos","Almuerzos",params?.almuerzo||0],["nCenas","Cenas",params?.cena||0],["nNoches","Noches",params?.hospedajeNoche||0]].map(([k,lbl,p])=>(
            <Fld key={k} C={C} label={lbl} suffix={`$${p.toLocaleString("es-CL")}/u`}><Inp C={C} value={form[k]||0} onChange={v=>sf(k,+v||0)} type="number" disabled={readonly}/></Fld>
          ))}
        </G>
        <div style={{textAlign:"right",fontSize:12,fontFamily:ff,color:C.textM}}>Total viáticos: <b style={{color:C.blue,fontSize:14}}>{fmtCLP(calc?.totalViaticos||0)}</b></div>
      </Card>

      {/* BONOS */}
      <Card C={C} style={{marginBottom:10}}>
        <STitle C={C}>⭐ Bonos especiales</STitle>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          {(form.nNoches||0)>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,fontSize:12,fontFamily:ff}}>
            <span style={{color:C.text}}>Bono noche fuera — {form.nNoches} noches × {form.nTecnicos} téc × ${(params?.bonoNocheFuera||0).toLocaleString("es-CL")}</span>
            <b style={{color:C.blue}}>{fmtCLP(calc?.costoBonoNoche||0)}</b>
          </div>}
          {[["usarBonoKm",`Bono kilometraje — ${(params?.bonoKilometraje||0)?("$"+(params.bonoKilometraje).toLocaleString("es-CL")+"/km"):"(no configurado)"}`,calc?.costoBonoKm||0,!!(params?.bonoKilometraje)],
            ["usarBonoTraslado",`Bono horas traslado — ${(params?.bonoHorasTraslado||0)?("$"+(params.bonoHorasTraslado).toLocaleString("es-CL")+"/h"):"(no configurado)"}`,calc?.costoBonoTraslado||0,!!(params?.bonoHorasTraslado)],
            ["usarBonoTrato",`Bono trato especial — ${(params?.bonoTratoEspecial||0)?("$"+(params.bonoTratoEspecial).toLocaleString("es-CL")):"(no configurado)"}`,calc?.costoBonoTrato||0,!!(params?.bonoTratoEspecial)]
          ].map(([k,lbl,monto,disponible])=>(
            <label key={k} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,cursor:disponible?"pointer":"not-allowed",opacity:disponible?1:0.5}}>
              <input type="checkbox" checked={!!form[k]} onChange={e=>sf(k,e.target.checked)} disabled={!disponible||readonly} style={{accentColor:C.blue}}/>
              <span style={{flex:1,fontSize:12,fontFamily:ff,color:C.text}}>{lbl}</span>
              {form[k]&&disponible&&<b style={{fontSize:12,color:C.blue,fontFamily:ff}}>{fmtCLP(monto)}</b>}
            </label>
          ))}
          <div style={{textAlign:"right",fontSize:12,fontFamily:ff,color:C.textM}}>Total bonos: <b style={{color:C.blue,fontSize:14}}>{fmtCLP(calc?.totalBonos||0)}</b></div>
        </div>
      </Card>

      {/* MATERIALES */}
      <Card C={C} style={{marginBottom:10}}>
        <STitle C={C}>📦 Materiales</STitle>
        {form.materiales.length>0&&<div style={{marginBottom:10,background:C.bg2,border:"1px solid "+C.border,borderRadius:6,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff}}>
            <thead><tr style={{background:C.bg1,borderBottom:"1px solid "+C.border}}>
              <th style={{padding:"7px 12px",textAlign:"left",color:C.textM,fontWeight:600,fontSize:10,textTransform:"uppercase"}}>Ítem</th>
              <th style={{padding:"7px 8px",textAlign:"center",color:C.textM,fontWeight:600,fontSize:10,textTransform:"uppercase",width:70}}>Cant.</th>
              <th style={{padding:"7px 8px",textAlign:"right",color:C.textM,fontWeight:600,fontSize:10,textTransform:"uppercase",width:110}}>Precio unit.</th>
              <th style={{padding:"7px 8px",textAlign:"right",color:C.textM,fontWeight:600,fontSize:10,textTransform:"uppercase",width:110}}>Total</th>
              <th style={{width:36}}></th>
            </tr></thead>
            <tbody>{form.materiales.map((m,i)=>(
              <tr key={m.id} style={{borderBottom:"1px solid "+C.border}}>
                <td style={{padding:"6px 12px"}}>
                  {readonly?<span style={{color:C.text}}>{m.desc}</span>:<input value={m.desc} onChange={e=>updMat(m.id,"desc",e.target.value)} style={{width:"100%",background:"transparent",border:"none",color:C.text,fontSize:12,fontFamily:ff,outline:"none"}}/>}
                </td>
                <td style={{padding:"6px 8px",textAlign:"center"}}>
                  {readonly?<span>{m.cant}</span>:<input type="number" value={m.cant} onChange={e=>updMat(m.id,"cant",+e.target.value||1)} style={{width:60,background:C.bg0,border:"1px solid "+C.border,borderRadius:3,color:C.text,fontSize:12,fontFamily:ff,textAlign:"center",padding:"3px 4px",outline:"none"}}/>}
                </td>
                <td style={{padding:"6px 8px",textAlign:"right"}}>
                  {readonly?<span>${(m.precio||0).toLocaleString("es-CL")}</span>:<div style={{display:"flex",alignItems:"center",gap:3,justifyContent:"flex-end"}}><span style={{fontSize:11,color:C.textM}}>$</span><input type="number" value={m.precio||0} onChange={e=>updMat(m.id,"precio",+e.target.value||0)} style={{width:80,background:C.bg0,border:"1px solid "+C.border,borderRadius:3,color:C.text,fontSize:12,fontFamily:ff,textAlign:"right",padding:"3px 6px",outline:"none"}}/></div>}
                </td>
                <td style={{padding:"6px 8px",textAlign:"right",fontWeight:700,color:C.blue}}>{fmtCLP((m.cant||0)*(m.precio||0))}</td>
                <td style={{padding:"6px 4px",textAlign:"center"}}>{!readonly&&<button onClick={()=>delMat(m.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:"0 4px"}}>✕</button>}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr style={{background:C.bg2,borderTop:"2px solid "+C.border}}>
              <td colSpan={3} style={{padding:"8px 12px",fontWeight:700,color:C.text,fontFamily:ff,fontSize:12}}>Total materiales</td>
              <td style={{padding:"8px 8px",textAlign:"right",fontWeight:700,color:C.blue,fontSize:14}}>{fmtCLP(calc?.totalMateriales||0)}</td>
              <td></td>
            </tr></tfoot>
          </table>
        </div>}
        {!readonly&&<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end"}}>
          <Fld C={C} label="Desde catálogo" style={{flex:1,minWidth:200}}>
            <SelBusca C={C} value="" onChange={addMatCat} opts={[{value:"",label:"Agregar desde catálogo..."},...materiales.map(m=>({value:m.id,label:`${m.nombre} — $${(m.precioUnitario||0).toLocaleString("es-CL")}/${m.unidad||"u"}`}))]}/>
          </Fld>
          <div style={{display:"flex",gap:6,flex:2,minWidth:300,alignItems:"flex-end"}}>
            <Fld C={C} label="Ítem manual" style={{flex:2}}><Inp C={C} value={nuevoMat.desc} onChange={v=>setNuevoMat(n=>({...n,desc:v}))} placeholder="Descripción del material"/></Fld>
            <Fld C={C} label="Cant." style={{flex:0.5}}><Inp C={C} value={nuevoMat.cant} onChange={v=>setNuevoMat(n=>({...n,cant:+v||1}))} type="number"/></Fld>
            <Fld C={C} label="Precio" prefix="$" style={{flex:1}}><Inp C={C} value={nuevoMat.precio} onChange={v=>setNuevoMat(n=>({...n,precio:+v||0}))} type="number"/></Fld>
            <div style={{marginBottom:14}}><Btn C={C} variant="soft" small onClick={addMat} disabled={!nuevoMat.desc.trim()}>+ Ítem</Btn></div>
          </div>
        </div>}
      </Card>

      {/* ARRIENDO */}
      <Card C={C} style={{marginBottom:10}}>
        <STitle C={C}>🔧 Arriendo maquinaria / subcontrato</STitle>
        <Fld C={C} label="Monto total" prefix="$">
          <Inp C={C} value={form.arriendo||0} onChange={v=>sf("arriendo",+v||0)} type="number" disabled={readonly}/>
        </Fld>
      </Card>

      {/* PARÁMETROS DE RENTABILIDAD */}
      <Card C={C} style={{marginBottom:10}}>
        <STitle C={C}>⚙️ Parámetros de rentabilidad</STitle>
        <G cols={3}>
          <Fld C={C} label="Gastos generales" suffix="%"><Inp C={C} value={form.pctGG??params?.pctGG??4} onChange={v=>sf("pctGG",+v||0)} type="number" disabled={readonly}/></Fld>
          <Fld C={C} label="Imprevistos" suffix="%"><Inp C={C} value={form.pctImp??params?.pctImp??0} onChange={v=>sf("pctImp",+v||0)} type="number" disabled={readonly}/></Fld>
          <Fld C={C} label="Utilidad / Margen" suffix="%"><Inp C={C} value={form.pctMargen??params?.margenInstalacion??25} onChange={v=>sf("pctMargen",+v||0)} type="number" disabled={readonly}/></Fld>
        </G>
      </Card>

      {/* RESUMEN PROYECTO */}
      <Card C={C} style={{marginBottom:14,border:"1px solid "+C.blue+"44"}}>
        <STitle C={C} action={<Bdg color={colMargen} small>{calc?(calc.margenReal*100).toFixed(1)+"%":""}</Bdg>}>📊 Resumen del proyecto</STitle>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div>
            {calc&&[
              {lbl:"Mano de obra",val:calc.costoMO},
              {lbl:"Traslados",val:calc.totalTraslados},
              {lbl:"Viáticos / Alojamiento",val:calc.totalViaticos},
              {lbl:"Bonos técnicos",val:calc.totalBonos},
              {lbl:"Materiales",val:calc.totalMateriales},
              {lbl:"Arriendo / Subcontrato",val:calc.totalArriendo},
            ].map(r=><div key={r.lbl} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.border,opacity:r.val===0?0.4:1}}>
              <span style={{fontSize:12,color:C.textS,fontFamily:ff}}>{r.lbl}</span>
              <span style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{fmtCLP(r.val)} <span style={{fontSize:10,color:C.textM,fontWeight:400}}>({calc.totalGastos>0?(r.val/calc.totalGastos*100).toFixed(0):0}%)</span></span>
            </div>)}
          </div>
          <div>
            {calc&&[
              {lbl:"Total gastos",val:calc.totalGastos,bold:true},
              {lbl:`GG (${calc.pctGG}%)`,val:calc.montoGG,color:C.textM},
              {lbl:`Imprevistos (${calc.pctImp}%)`,val:calc.montoImp,color:C.textM},
              {lbl:`Utilidad (${calc.pctMargen}%)`,val:calc.montoMargen,color:C.green},
            ].map(r=><div key={r.lbl} style={{display:"flex",justifyContent:"space-between",padding:"5px 0",borderBottom:"1px solid "+C.border}}>
              <span style={{fontSize:12,color:r.color||C.textS,fontFamily:ff,fontWeight:r.bold?700:400}}>{r.lbl}</span>
              <span style={{fontSize:12,fontWeight:r.bold?700:600,color:r.color||(r.bold?C.text:C.textS),fontFamily:ff}}>{fmtCLP(r.val)}</span>
            </div>)}
            <div style={{marginTop:12,padding:"12px 14px",background:C.blue+"11",borderRadius:7,border:"2px solid "+C.blue+"44"}}>
              <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>Precio final neto</div>
              <div style={{fontSize:28,fontWeight:700,color:C.blue,fontFamily:ff,fontVariantNumeric:"tabular-nums",lineHeight:1.1}}>{fmtCLP(calc?.precioNeto||0)}</div>
              <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:4}}>Con IVA 19%: <b style={{color:C.text}}>{fmtCLP(calc?.precioIVA||0)}</b></div>
            </div>
          </div>
        </div>
      </Card>
    </>}

    {/* SERVICIOS RECURRENTES */}
    {form.tieneRecurrente&&<>
      <div style={{fontSize:11,fontWeight:700,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:8}}>── Servicios recurrentes ──────────────────────────</div>
      <Card C={C} style={{marginBottom:14}}>
        <STitle C={C} action={<span style={{fontSize:11,color:C.textM,fontFamily:ff}}>UF: ${(params?.ufValue||0).toLocaleString("es-CL")}</span>}>📡 Servicios de monitoreo y recurrentes</STitle>
        {(form.serviciosRec||[]).length>0&&<div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:6,overflow:"hidden",marginBottom:10}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff}}>
            <thead><tr style={{background:C.bg1,borderBottom:"1px solid "+C.border}}>
              <th style={{padding:"7px 12px",textAlign:"left",color:C.textM,fontWeight:600,fontSize:10,textTransform:"uppercase"}}>Servicio</th>
              <th style={{padding:"7px 8px",textAlign:"center",color:C.textM,fontWeight:600,fontSize:10,textTransform:"uppercase",width:80}}>Cantidad</th>
              <th style={{padding:"7px 8px",textAlign:"center",color:C.textM,fontWeight:600,fontSize:10,textTransform:"uppercase",width:80}}>UF/u</th>
              <th style={{padding:"7px 8px",textAlign:"right",color:C.textM,fontWeight:600,fontSize:10,textTransform:"uppercase",width:90}}>UF total</th>
              <th style={{padding:"7px 8px",textAlign:"right",color:C.textM,fontWeight:600,fontSize:10,textTransform:"uppercase",width:110}}>$/mes</th>
              <th style={{width:36}}></th>
            </tr></thead>
            <tbody>{(form.serviciosRec||[]).map(s=>{
              const ufTotal=(s.cantidad||0)*(s.ufUnitario||0);
              const mesClp=Math.round(ufTotal*(params?.ufValue||0));
              return <tr key={s.id} style={{borderBottom:"1px solid "+C.border}}>
                <td style={{padding:"7px 12px",fontWeight:600,color:C.text}}>{s.nombre||"—"}</td>
                <td style={{padding:"7px 8px",textAlign:"center"}}>{s.cantidad}</td>
                <td style={{padding:"7px 8px",textAlign:"center",color:C.blue,fontWeight:600}}>{s.ufUnitario}</td>
                <td style={{padding:"7px 8px",textAlign:"right",color:C.blue,fontWeight:700}}>{ufTotal.toFixed(2)} UF</td>
                <td style={{padding:"7px 8px",textAlign:"right",fontWeight:700,color:C.green}}>{fmtCLP(mesClp)}</td>
                <td style={{padding:"7px 4px",textAlign:"center"}}>{!readonly&&<button onClick={()=>delSvc(s.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:14,padding:"0 4px"}}>✕</button>}</td>
              </tr>;
            })}</tbody>
            <tfoot><tr style={{background:C.bg2,borderTop:"2px solid "+C.border}}>
              <td colSpan={2} style={{padding:"8px 12px",fontWeight:700,color:C.text,fontFamily:ff,fontSize:12}}>Total mensual</td>
              <td></td>
              <td style={{padding:"8px 8px",textAlign:"right",fontWeight:700,color:C.blue,fontSize:13}}>{(calc?.totalUFMes||0).toFixed(2)} UF</td>
              <td style={{padding:"8px 8px",textAlign:"right",fontWeight:700,color:C.green,fontSize:14}}>{fmtCLP(calc?.totalMesCLP||0)}</td>
              <td></td>
            </tr></tfoot>
          </table>
        </div>}
        {!readonly&&<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginBottom:10}}>
          <Fld C={C} label="Servicio" style={{flex:2,minWidth:200}}>
            <SelBusca C={C} value={nuevoSvc.svcId} onChange={v=>{const s=svcsDisp.find(x=>x.id===v);setNuevoSvc(n=>({...n,svcId:v,ufUnitario:s?.ufUnitario||""}));}}
              opts={[{value:"",label:"— Seleccionar servicio —"},...svcsDisp.filter(s=>s.activo!==false).map(s=>({value:s.id,label:s.nombre}))]}/>
          </Fld>
          <Fld C={C} label="Cantidad" style={{flex:0.5,minWidth:80}}><Inp C={C} value={nuevoSvc.cantidad||1} onChange={v=>setNuevoSvc(n=>({...n,cantidad:+v||1}))} type="number"/></Fld>
          <Fld C={C} label="UF/unidad" suffix="UF" style={{flex:0.8,minWidth:100}}><Inp C={C} value={nuevoSvc.ufUnitario} onChange={v=>setNuevoSvc(n=>({...n,ufUnitario:v}))} type="number"/></Fld>
          <div style={{marginBottom:14}}><Btn C={C} variant="soft" small onClick={addSvc} disabled={!nuevoSvc.svcId}>+ Agregar</Btn></div>
        </div>}
        {(calc?.totalUFMes||0)>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginTop:10,padding:"12px",background:C.bg2,borderRadius:6,border:"1px solid "+C.border}}>
          <Fld C={C} label="Duración contrato" suffix="meses">
            <Inp C={C} value={form.duracionContrato||24} onChange={v=>sf("duracionContrato",+v||24)} type="number" disabled={readonly}/>
          </Fld>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Total recurrente contrato</div>
            <div style={{fontSize:15,fontWeight:700,color:C.green,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(calc?.totalContratoRec||0)}</div>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{(calc?.totalUFMes||0).toFixed(2)} UF × {form.duracionContrato||24} meses</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",justifyContent:"flex-end"}}>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Total general contrato</div>
            <div style={{fontSize:16,fontWeight:700,color:C.blue,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{fmtCLP((calc?.precioNeto||0)+(calc?.totalContratoRec||0))}</div>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>Proyecto + recurrente</div>
          </div>
        </div>}
      </Card>
    </>}

    {/* CONDICIONES DE PAGO */}
    <Card C={C} style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:form.tieneCondicionesPago?12:0}}>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,fontFamily:ff,color:C.text}}>
          <input type="checkbox" checked={!!form.tieneCondicionesPago} onChange={e=>sf("tieneCondicionesPago",e.target.checked)} style={{accentColor:C.blue,width:16,height:16}}/> Definir condiciones de pago del proyecto
        </label>
      </div>
      {form.tieneCondicionesPago&&<>
        {(form.condicionesPago||[]).map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,marginBottom:6}}>
            <span style={{flex:1,fontSize:13,fontFamily:ff,fontWeight:600,color:C.text}}>{p.nombre}</span>
            <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{p.pct}% →</span>
            <span style={{fontSize:13,fontWeight:700,color:C.blue,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(p.monto||Math.round((calc?.precioNeto||0)*p.pct/100))}</span>
            {!readonly&&<button onClick={()=>delPago(p.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:14}}>✕</button>}
          </div>
        ))}
        {!readonly&&<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:8}}>
          <Fld C={C} label="Nombre del hito" style={{flex:2}}><Inp C={C} value={nuevoPago.nombre} onChange={v=>setNuevoPago(n=>({...n,nombre:v}))} placeholder="Ej: Primer pago al firmar contrato"/></Fld>
          <Fld C={C} label="Porcentaje" suffix="%"><Inp C={C} value={nuevoPago.pct||50} onChange={v=>setNuevoPago(n=>({...n,pct:+v||0}))} type="number"/></Fld>
          <div style={{marginBottom:14,fontSize:12,fontFamily:ff,color:C.textM,alignSelf:"flex-end",paddingBottom:16}}>
            → {fmtCLP(Math.round((calc?.precioNeto||0)*(nuevoPago.pct||0)/100))}
          </div>
          <div style={{marginBottom:14}}><Btn C={C} variant="soft" small onClick={addPago} disabled={!nuevoPago.nombre.trim()}>+ Hito</Btn></div>
        </div>}
        {/* Plantillas rápidas */}
        {!readonly&&(form.condicionesPago||[]).length===0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:4}}>
          <span style={{fontSize:11,color:C.textM,fontFamily:ff,alignSelf:"center"}}>Plantillas:</span>
          {[["50/50",[{nombre:"Primer pago al inicio",pct:50},{nombre:"Pago final a la entrega",pct:50}]],["100% entrega",[{nombre:"Pago a la entrega",pct:100}]],["30/40/30",[{nombre:"Anticipo al firmar",pct:30},{nombre:"Avance 50%",pct:40},{nombre:"Liquidación",pct:30}]]].map(([lbl,pagos])=>(
            <Btn key={lbl} C={C} ghost small onClick={()=>sf("condicionesPago",pagos.map(p=>({...p,id:newId(),monto:Math.round((calc?.precioNeto||0)*p.pct/100)})))}>{lbl}</Btn>
          ))}
        </div>}
      </>}
    </Card>

    {/* RESUMEN TOTAL */}
    <Card C={C} style={{background:C.bg2,border:"2px solid "+C.blue+"44",marginBottom:24}}>
      <STitle C={C}>📋 Resumen total de la cotización</STitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14}}>
        {form.tieneProyecto&&calc&&<>
          <div style={{padding:"14px",background:C.bg1,borderRadius:7,border:"1px solid "+C.border}}>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>Proyecto (neto)</div>
            <div style={{fontSize:20,fontWeight:700,color:C.blue,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(calc.precioNeto)}</div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Con IVA: {fmtCLP(calc.precioIVA)}</div>
          </div>
          <div style={{padding:"14px",background:C.bg1,borderRadius:7,border:"1px solid "+C.border}}>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>Margen</div>
            <div style={{fontSize:20,fontWeight:700,color:colMargen,fontFamily:ff,marginTop:4}}>{(calc.margenReal*100).toFixed(1)}%</div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{calc.margenReal>=0.25?"✅ Saludable":calc.margenReal>=0.15?"⚠️ Ajustado":"❌ Bajo"}</div>
          </div>
        </>}
        {form.tieneRecurrente&&calc&&(calc.totalUFMes||0)>0&&<>
          <div style={{padding:"14px",background:C.bg1,borderRadius:7,border:"1px solid "+C.border}}>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>Recurrente / mes</div>
            <div style={{fontSize:20,fontWeight:700,color:C.green,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(calc.totalMesCLP)}</div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{(calc.totalUFMes||0).toFixed(2)} UF/mes</div>
          </div>
          <div style={{padding:"14px",background:C.bg1,borderRadius:7,border:"1px solid "+C.border}}>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>Total contrato ({form.duracionContrato||24}m)</div>
            <div style={{fontSize:20,fontWeight:700,color:C.blue,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{fmtCLP((calc?.precioNeto||0)+(calc?.totalContratoRec||0))}</div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Proyecto + recurrente</div>
          </div>
        </>}
      </div>
      {!readonly&&<div style={{display:"flex",gap:8,marginTop:14,flexWrap:"wrap"}}>
        <Btn C={C} onClick={guardar} style={{flex:1,justifyContent:"center"}}>{saved?"✓ Guardado":"💾 Guardar cotización"}</Btn>
        <Btn C={C} variant="soft" onClick={()=>setDocOpen(true)}>🧾 Documento cliente</Btn>
        <Btn C={C} ghost onClick={()=>setModalPlantilla(true)}>📋 Guardar como plantilla</Btn>
      </div>}
    </Card>

    {docOpen&&<QuoteDocumentEditor
      C={C}
      cot={form}
      calc={calc}
      cliente={clienteDoc}
      instalacion={instalacionDoc}
      params={params}
      readonly={readonly}
      onClose={()=>setDocOpen(false)}
      onSaveDocumento={guardarDocumentoCliente}
    />}

    {/* Modal guardar plantilla */}
    {modalPlantilla&&<Modal C={C} title="Guardar como plantilla" onClose={()=>setModalPlantilla(false)} width={420}>
      <Fld C={C} label="Nombre de la plantilla">
        <Inp C={C} value={nombrePlantilla} onChange={setNombrePlantilla} placeholder="Ej: CCTV Ruta Sur con pernocta"/>
      </Fld>
      <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:14}}>
        Guarda los parámetros actuales (técnicos, km, materiales, etc.) para reutilizarlos en futuras cotizaciones.
      </div>
      <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
        <Btn C={C} ghost onClick={()=>setModalPlantilla(false)}>Cancelar</Btn>
        <Btn C={C} onClick={guardarPlantilla} disabled={!nombrePlantilla.trim()}>Guardar plantilla</Btn>
      </div>
    </Modal>}
  </div>;
}

function PropuestasView({C,clientes,instalaciones,propuestas,cotizaciones,params,categorias,ejecutivos,proyectos,onRefresh,onCalc,onConvertir,readonly}){
  const [vista,setVista]=useState("lista"); // "lista"|"detalle"
  const [selId,setSelId]=useState(null);
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});const [tab,setTab]=useState("general");
  const [fE,setFE]=useState("Todos");const [search,setSearch]=useState("");
  const [confId,setConf]=useState(null);const [histP,setHistP]=useState(null);
  const [cotizandoP,setCotizandoP]=useState(null);
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));

  const prop=propuestas.find(p=>p.id===selId)||null;

  const abrir=id=>{setSelId(id);setVista("detalle");};
  const nueva=()=>{
    const num=nextNroProp(propuestas,params?.propPrefijo||"PRO");
    const p={id:newId(),numero:num,nombre:"",estado:"Borrador",clienteId:"",instalacionId:"",cotizacionId:"",ejecutivo:"",fecha:new Date().toISOString().slice(0,10),vigencia:"",notas:"",baseProyectoNeto:0,baseRecMes:0,duracionContrato:params?.duracionContrato||24,historial:[{fecha:new Date().toISOString(),estado:"Borrador",nota:"Creada"}],createdAt:new Date().toISOString()};
    repo.propuestas.save(p);syncSupabaseNormalizedEntityQuiet("propuestas",p.id);onRefresh();
    setSelId(p.id);setVista("detalle");
  };
  const saveProp=p=>{repo.propuestas.save(p);syncSupabaseNormalizedEntityQuiet("propuestas",p.id);onRefresh();};
  const changeState=(p,estado)=>{const l=repo.propuestas.list();const i=l.findIndex(x=>x.id===p.id);if(i<0)return;const hist=[...(l[i].historial||[]),{fecha:new Date().toISOString(),estado,nota:`Estado → "${estado}"`}];l[i]={...l[i],estado,historial:hist,updatedAt:new Date().toISOString()};repo.propuestas.replaceAll(l);syncSupabaseNormalizedEntityQuiet("propuestas",l[i].id);onRefresh();};
  const dup=p=>{const l=repo.propuestas.list();const num=nextNroProp([...l,{}],params?.propPrefijo||"PRO");const copy={...p,id:newId(),numero:num,nombre:p.nombre+" (copia)",estado:"Borrador",historial:[{fecha:new Date().toISOString(),estado:"Borrador",nota:"Duplicada"}],createdAt:new Date().toISOString()};repo.propuestas.save(copy);syncSupabaseNormalizedEntityQuiet("propuestas",copy.id);onRefresh();};
  const remove=id=>{repo.propuestas.remove(id);setConf(null);onRefresh();};

  const filtered=propuestas.filter(p=>(fE==="Todos"||p.estado===fE)&&(!search||((p.nombre||"").toLowerCase().includes(search.toLowerCase())||(clientes.find(c=>c.id===p.clienteId)?.razonSocial||"").toLowerCase().includes(search.toLowerCase())))).sort((a,b)=>(b.createdAt||"").localeCompare(a.createdAt||""));
  const counts=ESTADOS_PROP.reduce((acc,s)=>({...acc,[s]:propuestas.filter(p=>p.estado===s).length}),{});
  const thS={padding:"6px 10px",color:C.textM,fontWeight:600,textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff};
  const tdS={padding:"8px 10px",fontFamily:ff,fontSize:12};

  if(vista==="detalle"&&prop){
    return <PropuestaDetalle C={C} prop={prop} cotizaciones={cotizaciones} clientes={clientes} params={params} ejecutivos={ejecutivos} proyectos={proyectos} onSave={saveProp} onConvertir={p=>{onConvertir&&onConvertir(p);}} onVolver={()=>{setVista("lista");setSelId(null);}} onCalc={onCalc} readonly={readonly}/>;
  }

  return <div>
    {/* Header */}
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,flexWrap:"wrap"}}>
      <input placeholder="Buscar propuesta, cliente..." value={search} onChange={e=>setSearch(e.target.value)} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:5,color:C.text,padding:"7px 12px",fontSize:13,fontFamily:ff,outline:"none",flex:"1 1 200px"}}/>
      {!readonly&&<Btn C={C} onClick={nueva}>+ Nueva propuesta</Btn>}
    </div>
    <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
      {["Todos",...ESTADOS_PROP].map(s=>{const n=s==="Todos"?propuestas.length:counts[s]||0;const col=COL_E[s]||C.blue;return <button key={s} onClick={()=>setFE(s)} style={{padding:"4px 12px",borderRadius:20,fontSize:10,fontWeight:fE===s?700:400,cursor:"pointer",background:fE===s?col+"22":"transparent",color:fE===s?col:C.textM,border:"1px solid "+(fE===s?col:C.border),fontFamily:ff}}>{s} ({n})</button>;})}
    </div>
    {filtered.length===0
      ?<EmptyState C={C} icon="📊" title="Sin propuestas" sub="Las propuestas permiten al equipo comercial simular y presentar cotizaciones al cliente con análisis de escenarios." action={!readonly&&<Btn C={C} onClick={nueva}>+ Nueva propuesta</Btn>}/>
      :<Card C={C} style={{padding:0,overflow:"hidden"}}><div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:"1px solid "+C.border,background:C.bg2}}>
            {["Estado","N°","Propuesta","Cliente","Cotización base","Precio proyecto","MRR/mes","Ejecutivo","Fecha",""].map(h=><th key={h} style={thS}>{h}</th>)}
          </tr></thead>
          <tbody>{filtered.map((p,i)=>{
            const cl=clientes.find(c=>c.id===p.clienteId);
            const cot=cotizaciones.find(c=>c.id===p.cotizacionId);
            const cotCalc=cot?calcCotizacion(cot,params):null;
            const baseNeto=p.baseProyectoNeto||(cotCalc?.precioNeto||0);
            const baseRec=p.baseRecMes||(cotCalc?.totalMesCLP||0);
            return <tr key={p.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent",cursor:"pointer"}} onClick={()=>abrir(p.id)}>
              <td style={tdS}>{readonly?<Bdg color={COL_E[p.estado]||"#64748B"} small>{p.estado||"Borrador"}</Bdg>:<select value={p.estado||"Borrador"} onClick={e=>e.stopPropagation()} onChange={e=>{e.stopPropagation();changeState(p,e.target.value);}} style={{background:"transparent",border:"1px solid "+(COL_E[p.estado]||"#64748B")+"66",color:COL_E[p.estado]||"#64748B",borderRadius:4,fontSize:10,fontFamily:ff,cursor:"pointer",padding:"2px 5px",outline:"none"}}>{ESTADOS_PROP.map(s=><option key={s} value={s} style={{background:C.bg1,color:C.text}}>{s}</option>)}</select>}</td>
              <td style={{...tdS,color:C.textM,fontSize:10,fontFamily:"monospace"}}>{p.numero||"—"}</td>
              <td style={{...tdS,fontWeight:600,color:C.text}}>{p.nombre||<span style={{color:C.textM,fontStyle:"italic"}}>Sin nombre</span>}</td>
              <td style={{...tdS,color:C.textS}}>{cl?.razonSocial||cl?.nombreComercial||"—"}</td>
              <td style={tdS}>{cot?<span style={{fontFamily:"monospace",fontSize:10,color:C.blue}}>{cot.numero}</span>:<span style={{color:C.textM,fontSize:11}}>Libre</span>}</td>
              <td style={{...tdS,color:baseNeto>0?C.blue:C.textM,fontWeight:700}}>{baseNeto>0?fmtCLP(baseNeto):"—"}</td>
              <td style={{...tdS,color:baseRec>0?C.green:C.textM}}>{baseRec>0?fmtCLP(baseRec)+"/mes":"—"}</td>
              <td style={{...tdS,color:C.textM}}>{p.ejecutivo||"—"}</td>
              <td style={{...tdS,color:C.textM,fontSize:11}}>{p.fecha||"—"}</td>
              <td style={tdS} onClick={e=>e.stopPropagation()}><div style={{display:"flex",gap:4}}>
                <Btn C={C} ghost small onClick={()=>abrir(p.id)}>Ver</Btn>
                {!readonly&&<Btn C={C} ghost small onClick={()=>dup(p)}>Dup.</Btn>}
                {!readonly&&(confId===p.id?<><Btn C={C} color={C.red} small onClick={()=>remove(p.id)}>✓</Btn><Btn C={C} ghost small onClick={()=>setConf(null)}>✕</Btn></>:<Btn C={C} ghost small color={C.red} onClick={e=>{e.stopPropagation();setConf(p.id);}}>🗑</Btn>)}
              </div></td>
            </tr>;
          })}</tbody>
        </table>
      </div></Card>
    }
    {histP&&<Modal C={C} title={"Historial · "+histP.nombre} onClose={()=>setHistP(null)} width={500}>
      {(histP.historial||[]).length===0?<div style={{color:C.textM,fontSize:12,fontFamily:ff,textAlign:"center",padding:20}}>Sin historial.</div>:(histP.historial||[]).slice().reverse().map((h,i)=><div key={i} style={{padding:"9px 12px",background:C.bg2,borderRadius:5,marginBottom:7,border:"1px solid "+C.border}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}><Bdg color={COL_E[h.estado]||"#64748B"} small>{h.estado}</Bdg><span style={{fontSize:10,color:C.textM,fontFamily:ff}}>{new Date(h.fecha).toLocaleString("es-CL",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span></div><div style={{fontSize:12,color:C.textS,fontFamily:ff}}>{h.nota}</div></div>)}
    </Modal>}
    {cotizandoP&&<CotizadorOperativo C={C} propuesta={cotizandoP} cliente={clientes.find(c=>c.id===cotizandoP.clienteId)||null} params={params} onClose={()=>setCotizandoP(null)} onGuardar={costoEstimado=>{const l=repo.propuestas.list();const i=l.findIndex(x=>x.id===cotizandoP.id);if(i>=0){l[i]={...l[i],costoEstimado,updatedAt:new Date().toISOString()};repo.propuestas.replaceAll(l);onRefresh();}setCotizandoP(null);}}/>}
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPUESTA DETALLE — Vista scrolleable con simulador de escenarios
// ─────────────────────────────────────────────────────────────────────────────
const ESCENARIOS_DEF=[
  {id:"base",      label:"Precio base", pct:0},
  {id:"moderado",  label:"Moderado",    pct:10},
  {id:"avanzado",  label:"Avanzado",    pct:20},
  {id:"agresivo",  label:"Agresivo",    pct:30},
];

function PropuestaDetalle({C,prop,cotizaciones,clientes,params,ejecutivos,proyectos,onSave,onConvertir,onVolver,onCalc,readonly}){
  const [form,setForm]=useState({...prop});
  const [saved,setSaved]=useState(false);
  const [escenarios,setEscenarios]=useState(prop.escenarios||ESCENARIOS_DEF.map(e=>({...e})));
  const [escSelId,setEscSelId]=useState(prop.escSelId||"base");
  const [nuevoPago,setNuevoPago]=useState({nombre:"",pct:50});

  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const updEsc=(id,k,v)=>setEscenarios(es=>es.map(e=>e.id===id?{...e,[k]:v}:e));

  const guardar=()=>{
    const upd={...form,escenarios,escSelId,updatedAt:new Date().toISOString()};
    onSave(upd);setSaved(true);setTimeout(()=>setSaved(false),2500);
  };

  // Base de cálculo: desde cotización vinculada o ingresada manualmente
  const cotVinc=cotizaciones.find(c=>c.id===form.cotizacionId)||null;
  const cotCalc=cotVinc?calcCotizacion(cotVinc,params):null;
  const baseNeto=form.overrideBase?form.baseProyectoNeto:(cotCalc?.precioNeto||form.baseProyectoNeto||0);
  const baseRecMes=form.overrideBase?form.baseRecMes:(cotCalc?.totalMesCLP||form.baseRecMes||0);
  const duracion=form.duracionContrato||cotVinc?.duracionContrato||params?.duracionContrato||24;

  // Calcular escenario: descuento = subsidio (cliente pone parte del costo)
  const calcEscenario=(pct)=>{
    const subsidio=Math.round(baseNeto*pct/100);
    const precioFinal=baseNeto-subsidio;
    const margen=baseNeto>0?(precioFinal-(cotCalc?.totalGastos||0))/precioFinal:0;
    const rec=baseRecMes;
    const totalContrato=precioFinal+rec*duracion;
    const recM=rec>0&&cotCalc?.montoMargen>0?Math.ceil(subsidio/(cotCalc.montoMargen/duracion||1)):null;
    return {subsidio,precioFinal,margen,rec,totalContrato,recM,precioIVA:Math.round(precioFinal*1.19)};
  };

  const escSel=escenarios.find(e=>e.id===escSelId)||escenarios[0];
  const calcEscSel=calcEscenario(escSel?.pct||0);

  // Condiciones de pago
  const addPago=()=>{
    const monto=Math.round(calcEscSel.precioFinal*(nuevoPago.pct||0)/100);
    sf("condicionesPago",[...(form.condicionesPago||[]),{id:newId(),nombre:nuevoPago.nombre||`Pago ${(form.condicionesPago||[]).length+1}`,pct:nuevoPago.pct||50,monto}]);
    setNuevoPago({nombre:"",pct:50});
  };
  const delPago=id=>sf("condicionesPago",(form.condicionesPago||[]).filter(p=>p.id!==id));

  const colMar=(m)=>m>=0.25?C.green:m>=0.15?C.amber:C.red;
  const fmtR=v=>"$"+Math.round(v).toLocaleString("es-CL");

  return <div style={{maxWidth:1000,margin:"0 auto"}}>
    {/* Breadcrumb */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16,fontSize:13,fontFamily:ff}}>
      <button onClick={onVolver} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",gap:4,padding:0,fontFamily:ff}}>← Propuestas</button>
      <span style={{color:C.textM}}>/</span>
      <span style={{color:C.text,fontFamily:"monospace",fontSize:12}}>{form.numero||"Nueva"}</span>
    </div>

    {/* CABECERA */}
    <Card C={C} style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <span style={{fontFamily:"monospace",fontSize:12,fontWeight:700,color:C.blue}}>{form.numero||"Sin número"}</span>
        <select value={form.estado||"Borrador"} onChange={e=>sf("estado",e.target.value)} disabled={readonly} style={{background:"transparent",border:"1px solid "+(COL_E[form.estado]||"#64748B")+"88",color:COL_E[form.estado]||"#64748B",borderRadius:4,fontSize:11,fontFamily:ff,cursor:"pointer",padding:"3px 8px",outline:"none"}}>
          {ESTADOS_PROP.map(s=><option key={s} value={s} style={{background:C.bg1,color:C.text}}>{s}</option>)}
        </select>
        <div style={{flex:1}}/>
        {!readonly&&<div style={{display:"flex",gap:7}}>
          {form.estado==="Aprobada"&&!proyectos?.find(x=>x.propuestaId===form.id)&&<Btn C={C} variant="soft" color={C.green} small onClick={()=>onConvertir&&onConvertir(form)}>→ Convertir a proyecto</Btn>}
          {proyectos?.find(x=>x.propuestaId===form.id)&&<Bdg color={C.green} small>✓ Proyecto creado</Bdg>}
          <Btn C={C} onClick={guardar}>{saved?"✓ Guardado":"💾 Guardar"}</Btn>
        </div>}
      </div>
      <G cols={2}>
        <Fld C={C} label="Nombre de la propuesta">
          <Inp C={C} value={form.nombre||""} onChange={v=>sf("nombre",v)} placeholder="Nombre comercial de la propuesta" disabled={readonly}/>
        </Fld>
        <Fld C={C} label="Ejecutivo comercial">
          <SelBusca C={C} value={form.ejecutivo||""} onChange={v=>sf("ejecutivo",v)} opts={[{value:"",label:"— Sin asignar —"},...ejecutivos.map(e=>({value:e,label:e}))]}/>
        </Fld>
      </G>
      <G cols={3}>
        <Fld C={C} label="Cliente">
          <SelBusca C={C} value={form.clienteId||""} onChange={v=>sf("clienteId",v)} opts={[{value:"",label:"— Seleccionar cliente —"},...clientes.map(c=>({value:c.id,label:c.razonSocial||c.nombreComercial}))]}/>
        </Fld>
        <Fld C={C} label="Fecha">
          <Inp C={C} value={form.fecha||""} onChange={v=>sf("fecha",v)} type="date" disabled={readonly}/>
        </Fld>
        <Fld C={C} label="Vigencia hasta">
          <Inp C={C} value={form.vigencia||""} onChange={v=>sf("vigencia",v)} type="date" disabled={readonly}/>
        </Fld>
      </G>
      <Fld C={C} label="Notas internas">
        <textarea value={form.notas||""} onChange={e=>sf("notas",e.target.value)} placeholder="Observaciones, antecedentes, condiciones especiales..." disabled={readonly} style={{width:"100%",minHeight:50,padding:"8px 11px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:13,color:C.text,fontFamily:ff,resize:"vertical",boxSizing:"border-box"}}/>
      </Fld>
    </Card>

    {/* BASE DE CÁLCULO */}
    <Card C={C} style={{marginBottom:14}}>
      <STitle C={C}>📐 Base de cálculo</STitle>
      <Fld C={C} label="Cotización técnica vinculada">
        <SelBusca C={C} value={form.cotizacionId||""} onChange={v=>{sf("cotizacionId",v);sf("overrideBase",false);}}
          opts={[{value:"",label:"— Sin cotización (ingresar manualmente) —"},...cotizaciones.map(c=>{const cl=clientes.find(x=>x.id===c.clienteId);return {value:c.id,label:`${c.numero||"Sin N°"} · ${cl?.razonSocial||"Sin cliente"} · ${c.descripcion||c.tipoProyectoId||""}`};})]}/>
      </Fld>
      {cotVinc&&cotCalc&&<div style={{padding:"10px 14px",background:C.green+"11",border:"1px solid "+C.green+"33",borderRadius:6,fontSize:12,fontFamily:ff,color:C.green,marginBottom:10}}>
        ✓ Cotización vinculada: {cotVinc.numero} · Precio neto: <b>{fmtR(cotCalc.precioNeto)}</b> · MRR: <b>{fmtR(cotCalc.totalMesCLP)}/mes</b>
      </div>}
      <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:13,fontFamily:ff,color:C.text,marginBottom:form.overrideBase?10:0}}>
        <input type="checkbox" checked={!!form.overrideBase} onChange={e=>sf("overrideBase",e.target.checked)} style={{accentColor:C.blue}}/> Ingresar valores manualmente (override)
      </label>
      {(!cotVinc||form.overrideBase)&&<G cols={3}>
        <Fld C={C} label="Precio proyecto (neto)" prefix="$">
          <Inp C={C} value={form.baseProyectoNeto||0} onChange={v=>sf("baseProyectoNeto",+v||0)} type="number" disabled={readonly}/>
        </Fld>
        <Fld C={C} label="Recurrente/mes (neto)" prefix="$">
          <Inp C={C} value={form.baseRecMes||0} onChange={v=>sf("baseRecMes",+v||0)} type="number" disabled={readonly}/>
        </Fld>
        <Fld C={C} label="Duración contrato" suffix="meses">
          <Inp C={C} value={form.duracionContrato||24} onChange={v=>sf("duracionContrato",+v||24)} type="number" disabled={readonly}/>
        </Fld>
      </G>}
    </Card>

    {/* SIMULADOR DE ESCENARIOS */}
    {baseNeto>0&&<Card C={C} style={{marginBottom:14}}>
      <STitle C={C}>🎯 Simulador comercial</STitle>
      <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:12}}>
        Cada escenario aplica un porcentaje de subsidio (descuento sobre el precio del proyecto). Ajusta los sliders para simular distintos precios al cliente.
      </div>

      {/* Tabla de escenarios */}
      <div style={{overflowX:"auto",marginBottom:14}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontFamily:ff}}>
          <thead>
            <tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
              <th style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:C.textM,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em",width:180}}>Escenario</th>
              {escenarios.map(e=><th key={e.id} style={{padding:"8px 12px",textAlign:"center",fontSize:11,color:escSelId===e.id?C.blue:C.textM,fontWeight:escSelId===e.id?700:600,cursor:"pointer",background:escSelId===e.id?C.blue+"11":""}} onClick={()=>setEscSelId(e.id)}>{e.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {/* Sliders */}
            <tr style={{borderBottom:"1px solid "+C.border}}>
              <td style={{padding:"8px 12px",fontSize:11,color:C.textM,fontWeight:600}}>Subsidio %</td>
              {escenarios.map(e=>(
                <td key={e.id} style={{padding:"8px 12px",textAlign:"center"}}>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <input type="range" min="0" max="50" step="1" value={e.pct} onChange={ev=>updEsc(e.id,"pct",+ev.target.value)} disabled={readonly} style={{width:"100%",accentColor:C.blue}}/>
                    <span style={{fontSize:13,fontWeight:700,color:C.blue}}>{e.pct}%</span>
                  </div>
                </td>
              ))}
            </tr>
            {/* Filas de datos */}
            {[
              {lbl:"Subsidio",fn:(e)=>fmtR(calcEscenario(e.pct).subsidio),highlight:false},
              {lbl:"Precio proyecto al cliente",fn:(e)=>fmtR(calcEscenario(e.pct).precioFinal),highlight:true,color:(e)=>C.blue},
              {lbl:"Con IVA 19%",fn:(e)=>fmtR(calcEscenario(e.pct).precioIVA),highlight:false},
              {lbl:"Recurrente/mes",fn:(e)=>baseRecMes>0?fmtR(calcEscenario(e.pct).rec):"—",highlight:false,color:()=>C.green},
              {lbl:"Total contrato",fn:(e)=>fmtR(calcEscenario(e.pct).totalContrato),highlight:true},
              {lbl:"Margen real",fn:(e)=>{const m=calcEscenario(e.pct).margen;return(m*100).toFixed(1)+"%";},highlight:false,color:(e)=>{const m=calcEscenario(e.pct).margen;return colMar(m);}},
              {lbl:"Recuperación",fn:(e)=>{const r=calcEscenario(e.pct).recM;return r&&baseRecMes>0?(r+" meses"):"—";},highlight:false},
            ].map(row=>(
              <tr key={row.lbl} style={{borderBottom:"1px solid "+C.border,background:row.highlight?C.blue+"08":""}}>
                <td style={{padding:"7px 12px",fontSize:11,color:C.textM,fontFamily:ff,fontWeight:row.highlight?600:400}}>{row.lbl}</td>
                {escenarios.map(e=>{
                  const col=row.color?row.color(e):(row.highlight?C.text:C.textS);
                  return <td key={e.id} style={{padding:"7px 12px",textAlign:"center",fontSize:row.highlight?14:12,fontWeight:row.highlight?700:500,color:col,fontFamily:ff,fontVariantNumeric:"tabular-nums",background:escSelId===e.id?C.blue+"08":""}}>{row.fn(e)}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Selector escenario */}
      <div style={{padding:"12px 14px",background:C.bg2,borderRadius:6,border:"1px solid "+C.border}}>
        <div style={{fontSize:11,fontWeight:700,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Escenario a presentar al cliente</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {escenarios.map(e=><button key={e.id} onClick={()=>setEscSelId(e.id)}
            style={{padding:"6px 16px",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:escSelId===e.id?700:500,background:escSelId===e.id?C.blue:"transparent",color:escSelId===e.id?"#fff":C.textM,border:"1px solid "+(escSelId===e.id?C.blue:C.border),fontFamily:ff}}>
            {e.label} ({e.pct}%)
          </button>)}
        </div>
        {escSel&&<div style={{marginTop:12,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
          {[
            {lbl:"Precio proyecto",val:fmtR(calcEscSel.precioFinal),color:C.blue},
            {lbl:"Con IVA",val:fmtR(calcEscSel.precioIVA),color:C.text},
            {lbl:"Recurrente/mes",val:baseRecMes>0?fmtR(calcEscSel.rec):"-",color:C.green},
            {lbl:"Total contrato",val:fmtR(calcEscSel.totalContrato),color:C.blue},
            {lbl:"Margen real",val:(calcEscSel.margen*100).toFixed(1)+"%",color:colMar(calcEscSel.margen)},
          ].map(k=><div key={k.lbl} style={{textAlign:"center",padding:"10px",background:C.bg1,borderRadius:6,border:"1px solid "+C.border}}>
            <div style={{fontSize:9,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.lbl}</div>
            <div style={{fontSize:15,fontWeight:700,color:k.color,fontFamily:ff,marginTop:3,fontVariantNumeric:"tabular-nums"}}>{k.val}</div>
          </div>)}
        </div>}
      </div>
    </Card>}

    {/* CONDICIONES DE PAGO */}
    <Card C={C} style={{marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:form.tieneCondicionesPago?12:0}}>
        <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",fontSize:14,fontFamily:ff,color:C.text}}>
          <input type="checkbox" checked={!!form.tieneCondicionesPago} onChange={e=>sf("tieneCondicionesPago",e.target.checked)} style={{accentColor:C.blue,width:16,height:16}}/> Definir condiciones de pago
        </label>
      </div>
      {form.tieneCondicionesPago&&<>
        {(form.condicionesPago||[]).map(p=>(
          <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,marginBottom:6}}>
            <span style={{flex:1,fontSize:13,fontFamily:ff,fontWeight:600,color:C.text}}>{p.nombre}</span>
            <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{p.pct}%</span>
            <span style={{fontSize:13,fontWeight:700,color:C.blue,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{fmtR(Math.round(calcEscSel.precioFinal*p.pct/100))}</span>
            {!readonly&&<button onClick={()=>delPago(p.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:14}}>✕</button>}
          </div>
        ))}
        {!readonly&&<div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"flex-end",marginTop:8}}>
          <Fld C={C} label="Nombre del hito" style={{flex:2}}><Inp C={C} value={nuevoPago.nombre} onChange={v=>setNuevoPago(n=>({...n,nombre:v}))} placeholder="Ej: 50% al inicio del proyecto"/></Fld>
          <Fld C={C} label="Porcentaje" suffix="%"><Inp C={C} value={nuevoPago.pct||50} onChange={v=>setNuevoPago(n=>({...n,pct:+v||0}))} type="number"/></Fld>
          <div style={{marginBottom:14,fontSize:12,color:C.textM,fontFamily:ff,alignSelf:"flex-end",paddingBottom:16}}>→ {fmtR(Math.round(calcEscSel.precioFinal*(nuevoPago.pct||0)/100))}</div>
          <div style={{marginBottom:14}}><Btn C={C} variant="soft" small onClick={addPago} disabled={!nuevoPago.nombre.trim()}>+ Hito</Btn></div>
        </div>}
        {!readonly&&(form.condicionesPago||[]).length===0&&<div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:4}}>
          <span style={{fontSize:11,color:C.textM,fontFamily:ff,alignSelf:"center"}}>Plantillas:</span>
          {[["50/50",[{nombre:"50% al inicio",pct:50},{nombre:"50% a la entrega",pct:50}]],["100% entrega",[{nombre:"Pago total a la entrega",pct:100}]],["30/40/30",[{nombre:"Anticipo",pct:30},{nombre:"Avance 50%",pct:40},{nombre:"Liquidación",pct:30}]]].map(([lbl,pagos])=>(
            <Btn key={lbl} C={C} ghost small onClick={()=>sf("condicionesPago",pagos.map(p=>({...p,id:newId(),monto:Math.round(calcEscSel.precioFinal*p.pct/100)})))}>{lbl}</Btn>
          ))}
        </div>}
      </>}
    </Card>

    {/* RESUMEN FINAL */}
    <Card C={C} style={{background:C.bg2,border:"2px solid "+C.blue+"44",marginBottom:24}}>
      <STitle C={C}>📋 Resumen · Escenario: {escSel?.label} ({escSel?.pct}%)</STitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:14}}>
        {[
          {lbl:"Precio proyecto (neto)",val:fmtR(calcEscSel.precioFinal),color:C.blue},
          {lbl:"Precio con IVA",val:fmtR(calcEscSel.precioIVA),color:C.text},
          {lbl:"Recurrente/mes",val:baseRecMes>0?fmtR(calcEscSel.rec):"-",color:C.green},
          {lbl:"Total contrato "+duracion+"m",val:fmtR(calcEscSel.totalContrato),color:C.blue},
          {lbl:"Margen real",val:(calcEscSel.margen*100).toFixed(1)+"%",color:colMar(calcEscSel.margen)},
        ].map(k=><div key={k.lbl} style={{padding:"12px 14px",background:C.bg1,borderRadius:7,border:"1px solid "+C.border}}>
          <div style={{fontSize:9,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.lbl}</div>
          <div style={{fontSize:17,fontWeight:700,color:k.color,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.val}</div>
        </div>)}
      </div>
      {!readonly&&<Btn C={C} onClick={guardar} style={{width:"100%",justifyContent:"center"}}>{saved?"✓ Guardado":"💾 Guardar propuesta"}</Btn>}
    </Card>
  </div>;
}

// Espejo del Excel de cotización, usa costos operativos del sistema
// ─────────────────────────────────────────────────────────────────────────────
function CotizadorOperativo({C,propuesta,cliente,params,onClose,onGuardar}){
  const costoKm=calcCostoKm(params);
  const roles=params?.rolesTecnicos||ROLES_TEC_DEF;
  const margenDef=params?.margenInstalacion||25;

  // Estado inicial precargado con valores de configuración
  const [cot,setCot]=useState({
    // Personal
    nTecnicos:2,
    horasDia:9,
    diasTrabajo:3,
    rolId:roles[1]?.id||"tec_normal",
    // Movilización
    km:0,
    nViajes:1,
    nPeajes:0,
    conEncomienda:false,
    // Viáticos por técnico por día
    nDesayunos:0,
    nAlmuerzos:1,
    nCenas:0,
    nNoches:0,
    // Bonos
    usarBonoKm:false,
    usarBonoTraslado:false,
    usarBonoTrato:false,
    // Arriendo maquinaria
    arriendo:0,
    // Materiales (items manuales)
    materiales:[],
    // Margen y GG
    pctGG:params?.pctGG||10,
    pctImp:params?.pctImp||5,
    pctMargen:margenDef,
  });
  const sc=(k,v)=>setCot(c=>({...c,[k]:v}));
  const [nuevoMat,setNuevoMat]=useState({desc:"",cant:1,precio:0});
  const [guardado,setGuardado]=useState(false);

  const rolSelec=roles.find(r=>r.id===cot.rolId)||roles[0]||{costoHora:0};

  // ── CÁLCULOS ──
  const totalHoras=cot.nTecnicos*(cot.horasDia||0)*(cot.diasTrabajo||0);
  const costoMO=totalHoras*(rolSelec.costoHora||0);

  const costoTraslado=cot.km*costoKm.total*cot.nTecnicos*cot.nViajes;
  const costoPeajes=(cot.nPeajes||0)*(params?.peajeReferencial||0)*cot.nViajes*2;
  const costoEncomienda=cot.conEncomienda?(params?.encomiendaReferencial||0):0;
  const totalTraslados=costoTraslado+costoPeajes+costoEncomienda;

  const costoDesayunos=(cot.nDesayunos||0)*cot.nTecnicos*(params?.desayuno||0)*cot.diasTrabajo;
  const costoAlmuerzos=(cot.nAlmuerzos||0)*cot.nTecnicos*(params?.almuerzo||0)*cot.diasTrabajo;
  const costoCenas=(cot.nCenas||0)*cot.nTecnicos*(params?.cena||0)*cot.diasTrabajo;
  const costoHospedaje=(cot.nNoches||0)*cot.nTecnicos*(params?.hospedajeNoche||0);
  const totalViaticos=costoDesayunos+costoAlmuerzos+costoCenas+costoHospedaje;

  const costoBonoNoche=(cot.nNoches||0)*cot.nTecnicos*(params?.bonoNocheFuera||0);
  const costoBonoKm=cot.usarBonoKm?cot.km*cot.nTecnicos*(params?.bonoKilometraje||0):0;
  const costoBonoTraslado=cot.usarBonoTraslado?totalHoras*(params?.bonoHorasTraslado||0):0;
  const costoBonoTrato=cot.usarBonoTrato?(params?.bonoTratoEspecial||0):0;
  const totalBonos=costoBonoNoche+costoBonoKm+costoBonoTraslado+costoBonoTrato;

  const totalMateriales=cot.materiales.reduce((s,m)=>s+(m.cant||0)*(m.precio||0),0);
  const totalArriendo=cot.arriendo||0;

  const totalGastos=costoMO+totalTraslados+totalViaticos+totalBonos+totalMateriales+totalArriendo;
  const montoGG=Math.round(totalGastos*(cot.pctGG||0)/100);
  const montoImp=Math.round(totalGastos*(cot.pctImp||0)/100);
  const baseMargen=totalGastos+montoGG+montoImp;
  const montoMargen=Math.round(baseMargen*(cot.pctMargen||0)/100);
  const precioFinalNeto=baseMargen+montoMargen;
  const precioConIVA=Math.round(precioFinalNeto*1.19);
  const margenReal=precioFinalNeto>0?montoMargen/precioFinalNeto:0;

  const addMat=()=>{
    if(!nuevoMat.desc.trim())return;
    sc("materiales",[...cot.materiales,{id:newId(),...nuevoMat}]);
    setNuevoMat({desc:"",cant:1,precio:0});
  };
  const delMat=id=>sc("materiales",cot.materiales.filter(m=>m.id!==id));

  const guardar=()=>{
    onGuardar(totalGastos); // guarda el costo estimado en la propuesta
    setGuardado(true);setTimeout(()=>{setGuardado(false);},2000);
  };

  const fmtR=v=>"$"+Math.round(v).toLocaleString("es-CL");
  const pct=(v,total)=>total>0?(v/total*100).toFixed(1)+"%":"0%";

  // Colores semáforo margen
  const colMargen=margenReal>=0.25?C.green:margenReal>=0.15?C.amber:C.red;

  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",zIndex:200,overflowY:"auto",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:28,paddingBottom:28}}>
    <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:10,width:1020,maxWidth:"97vw",padding:28,boxShadow:"0 20px 60px rgba(0,0,0,0.4)"}}>

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
        <div>
          <div style={{fontSize:11,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Cotizador de costos operativos</div>
          <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:ff}}>{propuesta.nombre||"Nueva cotización"}</div>
          {cliente&&<div style={{fontSize:12,color:C.blue,fontFamily:ff,marginTop:2}}>{cliente.razonSocial||cliente.nombreComercial}</div>}
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:C.textM,cursor:"pointer",fontSize:22,padding:0}}>✕</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:20}}>

        {/* ─── COLUMNA IZQUIERDA: Inputs ─── */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>

          {/* PERSONAL */}
          <Card C={C}>
            <STitle C={C}>👷 Mano de obra</STitle>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginBottom:10}}>
              Las horas de traslado se incluyen en la jornada diaria (metodología actual).
            </div>
            <G cols={4}>
              <Fld C={C} label="N° técnicos" suffix="téc">
                <Inp C={C} value={cot.nTecnicos} onChange={v=>sc("nTecnicos",+v||1)} type="number"/>
              </Fld>
              <Fld C={C} label="Horas/día" suffix="h">
                <Inp C={C} value={cot.horasDia} onChange={v=>sc("horasDia",+v||0)} type="number"/>
              </Fld>
              <Fld C={C} label="Días trabajo" suffix="días">
                <Inp C={C} value={cot.diasTrabajo} onChange={v=>sc("diasTrabajo",+v||0)} type="number"/>
              </Fld>
              <Fld C={C} label="Jornada total">
                <div style={{padding:"8px 11px",background:C.bg0,borderRadius:5,border:"1px solid "+C.border,fontSize:13,fontWeight:700,color:C.blue,fontFamily:ff}}>{totalHoras}h</div>
              </Fld>
            </G>
            <Fld C={C} label="Rol del técnico">
              <SelBusca C={C} value={cot.rolId} onChange={v=>sc("rolId",v)}
                opts={roles.filter(r=>r.activo!==false).map(r=>({value:r.id,label:`${r.nombre} — $${(r.costoHora||0).toLocaleString("es-CL")}/h`}))}/>
            </Fld>
            <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}>
              <div style={{padding:"8px 16px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,fontSize:13,fontFamily:ff}}>
                <span style={{color:C.textM}}>Costo MO: </span>
                <span style={{fontWeight:700,color:C.blue}}>{fmtR(costoMO)}</span>
                <span style={{color:C.textM,marginLeft:8,fontSize:11}}>({cot.nTecnicos} × {cot.horasDia}h × {cot.diasTrabajo}d × ${(rolSelec.costoHora||0).toLocaleString("es-CL")}/h)</span>
              </div>
            </div>
          </Card>

          {/* MOVILIZACIÓN */}
          <Card C={C}>
            <STitle C={C} action={<span style={{fontSize:10,color:C.textM,fontFamily:ff}}>${costoKm.total.toLocaleString("es-CL")}/km (config.)</span>}>🚗 Movilización</STitle>
            <G cols={3}>
              <Fld C={C} label="Distancia" suffix="km">
                <Inp C={C} value={cot.km} onChange={v=>sc("km",+v||0)} type="number"/>
              </Fld>
              <Fld C={C} label="N° viajes" suffix="viajes">
                <Inp C={C} value={cot.nViajes} onChange={v=>sc("nViajes",+v||1)} type="number"/>
              </Fld>
              <Fld C={C} label="Costo traslado">
                <div style={{padding:"8px 11px",background:C.bg0,borderRadius:5,border:"1px solid "+C.border,fontSize:13,fontWeight:700,color:costoTraslado>0?C.text:C.textM,fontFamily:ff}}>{fmtR(costoTraslado)}</div>
              </Fld>
            </G>
            <G cols={2}>
              <Fld C={C} label="N° peajes (ida/vuelta)" suffix="peajes">
                <Inp C={C} value={cot.nPeajes} onChange={v=>sc("nPeajes",+v||0)} type="number"/>
              </Fld>
              <Fld C={C} label="Costo peajes">
                <div style={{padding:"8px 11px",background:C.bg0,borderRadius:5,border:"1px solid "+C.border,fontSize:13,fontWeight:700,color:costoPeajes>0?C.text:C.textM,fontFamily:ff}}>{fmtR(costoPeajes)}</div>
              </Fld>
            </G>
            <label style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer",marginBottom:6}}>
              <input type="checkbox" checked={cot.conEncomienda} onChange={e=>sc("conEncomienda",e.target.checked)} style={{accentColor:C.blue}}/>
              <span style={{fontSize:12,fontFamily:ff,color:C.text}}>Incluir encomienda (${(params?.encomiendaReferencial||0).toLocaleString("es-CL")})</span>
            </label>
          </Card>

          {/* VIÁTICOS */}
          <Card C={C}>
            <STitle C={C}>🍽 Viáticos y alojamiento</STitle>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginBottom:10}}>Cantidad de comidas/noches por técnico por día</div>
            <G cols={4}>
              {[
                ["nDesayunos","Desayunos",params?.desayuno||0],
                ["nAlmuerzos","Almuerzos",params?.almuerzo||0],
                ["nCenas","Cenas",params?.cena||0],
                ["nNoches","Noches",params?.hospedajeNoche||0],
              ].map(([k,lbl,precio])=>(
                <Fld key={k} C={C} label={`${lbl}`} suffix={`$${precio.toLocaleString("es-CL")}/u`}>
                  <Inp C={C} value={cot[k]} onChange={v=>sc(k,+v||0)} type="number"/>
                </Fld>
              ))}
            </G>
            {totalViaticos>0&&<div style={{fontSize:11,color:C.textM,fontFamily:ff,textAlign:"right",marginTop:4}}>Total viáticos: <b style={{color:C.text}}>{fmtR(totalViaticos)}</b></div>}
          </Card>

          {/* BONOS */}
          <Card C={C}>
            <STitle C={C}>⭐ Bonos especiales</STitle>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {/* Bono noche fuera (automático si hay noches) */}
              {(cot.nNoches||0)>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,fontSize:12,fontFamily:ff}}>
                <span style={{color:C.text}}>Bono noche fuera ({cot.nNoches} × {cot.nTecnicos} téc.)</span>
                <span style={{fontWeight:700,color:C.text}}>{fmtR(costoBonoNoche)}</span>
              </div>}
              {[
                ["usarBonoKm",`Bono kilometraje ($${(params?.bonoKilometraje||0).toLocaleString("es-CL")}/km × ${cot.km}km)`,costoBonoKm,!!params?.bonoKilometraje],
                ["usarBonoTraslado",`Bono horas traslado ($${(params?.bonoHorasTraslado||0).toLocaleString("es-CL")}/h)`,costoBonoTraslado,!!params?.bonoHorasTraslado],
                ["usarBonoTrato",`Bono trato especial ($${(params?.bonoTratoEspecial||0).toLocaleString("es-CL")})`,costoBonoTrato,!!params?.bonoTratoEspecial],
              ].filter(([,,, activo])=>activo).map(([k,lbl,monto])=>(
                <label key={k} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,cursor:"pointer"}}>
                  <input type="checkbox" checked={cot[k]||false} onChange={e=>sc(k,e.target.checked)} style={{accentColor:C.blue}}/>
                  <span style={{flex:1,fontSize:12,fontFamily:ff,color:C.text}}>{lbl}</span>
                  {cot[k]&&<span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:ff}}>{fmtR(monto)}</span>}
                </label>
              ))}
              {totalBonos===0&&costoBonoNoche===0&&<div style={{fontSize:11,color:C.textM,fontFamily:ff,textAlign:"center",padding:"8px 0"}}>Sin bonos aplicados</div>}
            </div>
          </Card>

          {/* MATERIALES */}
          <Card C={C}>
            <STitle C={C}>📦 Materiales</STitle>
            {cot.materiales.length>0&&<div style={{marginBottom:10}}>
              {cot.materiales.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,marginBottom:5}}>
                  <span style={{flex:1,fontSize:12,fontFamily:ff,color:C.text}}>{m.desc}</span>
                  <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>×{m.cant}</span>
                  <span style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff,minWidth:80,textAlign:"right"}}>{fmtR((m.cant||0)*(m.precio||0))}</span>
                  <button onClick={()=>delMat(m.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:13,padding:"0 4px"}}>✕</button>
                </div>
              ))}
            </div>}
            <div style={{display:"flex",gap:7,alignItems:"flex-end"}}>
              <Fld C={C} label="Descripción" style={{flex:2}}>
                <Inp C={C} value={nuevoMat.desc} onChange={v=>setNuevoMat(n=>({...n,desc:v}))} placeholder="Ej: Cable UTP CAT6 exterior"/>
              </Fld>
              <Fld C={C} label="Cant." style={{flex:0.5}}>
                <Inp C={C} value={nuevoMat.cant} onChange={v=>setNuevoMat(n=>({...n,cant:+v||1}))} type="number"/>
              </Fld>
              <Fld C={C} label="Precio unit." prefix="$" style={{flex:1}}>
                <Inp C={C} value={nuevoMat.precio} onChange={v=>setNuevoMat(n=>({...n,precio:+v||0}))} type="number"/>
              </Fld>
              <div style={{marginBottom:14}}><Btn C={C} variant="soft" small onClick={addMat} disabled={!nuevoMat.desc.trim()}>+ Agregar</Btn></div>
            </div>
          </Card>

          {/* ARRIENDO MAQUINARIA */}
          <Card C={C}>
            <STitle C={C}>🔧 Arriendo maquinaria / subcontrato</STitle>
            <Fld C={C} label="Monto total" prefix="$">
              <Inp C={C} value={cot.arriendo||0} onChange={v=>sc("arriendo",+v||0)} type="number"/>
            </Fld>
          </Card>

        </div>

        {/* ─── COLUMNA DERECHA: Resumen ─── */}
        <div>
          <div style={{position:"sticky",top:20,display:"flex",flexDirection:"column",gap:12}}>

            {/* Parámetros de margen */}
            <Card C={C}>
              <STitle C={C}>⚙️ Rentabilidad</STitle>
              <G cols={3}>
                <Fld C={C} label="GG" suffix="%"><Inp C={C} value={cot.pctGG} onChange={v=>sc("pctGG",+v||0)} type="number"/></Fld>
                <Fld C={C} label="Imprevistos" suffix="%"><Inp C={C} value={cot.pctImp} onChange={v=>sc("pctImp",+v||0)} type="number"/></Fld>
                <Fld C={C} label="Margen" suffix="%"><Inp C={C} value={cot.pctMargen} onChange={v=>sc("pctMargen",+v||0)} type="number"/></Fld>
              </G>
            </Card>

            {/* Resumen de costos */}
            <Card C={C} style={{background:C.bg2}}>
              <STitle C={C}>📊 Resumen de costos</STitle>
              <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {[
                  {lbl:"Mano de obra",val:costoMO,pct:pct(costoMO,totalGastos)},
                  {lbl:"Traslados",val:totalTraslados,pct:pct(totalTraslados,totalGastos)},
                  {lbl:"Viáticos / Alojamiento",val:totalViaticos,pct:pct(totalViaticos,totalGastos)},
                  {lbl:"Bonos técnicos",val:totalBonos,pct:pct(totalBonos,totalGastos)},
                  {lbl:"Materiales",val:totalMateriales,pct:pct(totalMateriales,totalGastos)},
                  {lbl:"Arriendo / Subcontrato",val:totalArriendo,pct:pct(totalArriendo,totalGastos)},
                ].map(r=><div key={r.lbl} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid "+C.border,opacity:r.val===0?0.35:1}}>
                  <span style={{fontSize:11,color:C.textS,fontFamily:ff}}>{r.lbl}</span>
                  <div style={{textAlign:"right"}}>
                    <span style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{fmtR(r.val)}</span>
                    <span style={{fontSize:10,color:C.textM,fontFamily:ff,marginLeft:5}}>{r.pct}</span>
                  </div>
                </div>)}

                {/* Subtotal */}
                <div style={{display:"flex",justifyContent:"space-between",padding:"9px 0",borderBottom:"2px solid "+C.border,marginTop:4}}>
                  <span style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:ff}}>Total gastos</span>
                  <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{fmtR(totalGastos)}</span>
                </div>

                {/* GG + Imp + Margen */}
                {[
                  {lbl:`Gastos generales (${cot.pctGG}%)`,val:montoGG,color:C.textM},
                  {lbl:`Imprevistos (${cot.pctImp}%)`,val:montoImp,color:C.textM},
                  {lbl:`Utilidad (${cot.pctMargen}%)`,val:montoMargen,color:C.green},
                ].map(r=><div key={r.lbl} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+C.border}}>
                  <span style={{fontSize:11,color:r.color,fontFamily:ff}}>{r.lbl}</span>
                  <span style={{fontSize:12,fontWeight:600,color:r.color,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{fmtR(r.val)}</span>
                </div>)}
              </div>

              {/* Precio final */}
              <div style={{marginTop:12,padding:"14px 16px",background:C.blue+"11",borderRadius:8,border:"2px solid "+C.blue+"44"}}>
                <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>Precio final neto</div>
                <div style={{fontSize:26,fontWeight:700,color:C.blue,fontFamily:ff,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{fmtR(precioFinalNeto)}</div>
                <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:4}}>Con IVA 19%: <b style={{color:C.text}}>{fmtR(precioConIVA)}</b></div>
              </div>

              {/* Semáforo margen */}
              <div style={{marginTop:10,padding:"10px 14px",background:colMargen+"11",borderRadius:6,border:"1px solid "+colMargen+"44",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontSize:11,fontFamily:ff,color:colMargen,fontWeight:700}}>
                  {margenReal>=0.25?"✅ Margen saludable":margenReal>=0.15?"⚠️ Margen ajustado":"❌ Margen bajo"}
                </span>
                <span style={{fontSize:16,fontWeight:700,color:colMargen,fontFamily:ff}}>{(margenReal*100).toFixed(1)}%</span>
              </div>
            </Card>

            {/* Acciones */}
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <Btn C={C} onClick={guardar} style={{width:"100%",justifyContent:"center"}}>
                {guardado?"✓ Guardado como costo estimado":"💾 Guardar costo estimado en propuesta"}
              </Btn>
              <div style={{padding:"10px 14px",background:C.amber+"11",border:"1px solid "+C.amber+"33",borderRadius:6,fontSize:11,color:C.amber,fontFamily:ff}}>
                💡 Al guardar, el costo estimado ({fmtR(totalGastos)}) queda en la propuesta y se usa en el panel comparativo real vs cotizado cuando se convierta en proyecto.
              </div>
              <Btn C={C} ghost style={{width:"100%",justifyContent:"center"}} onClick={onClose}>Cerrar sin guardar</Btn>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>;
}
function Calculadora({C,propuesta,cliente,instalacion,params,onClose}){

  const [lp,setLp]=useState({...params,duracionContrato:propuesta.duracionContrato||params.duracionContrato||DEF.duracionContrato});
  const [showProj,setShowP]=useState(false);
  const [escs,setEscs]=useState([{id:0,label:"Sin subsidio",pct:0},{id:1,label:"Conservador",pct:7},{id:2,label:"Medio",pct:17},{id:3,label:"Agresivo",pct:27}]);
  const slp=(k,v)=>setLp(p=>({...p,[k]:v}));
  const updPct=(id,pct)=>setEscs(es=>es.map(e=>e.id===id?{...e,pct}:e));
  // Los params del calculador siempre tienen prioridad sobre los valores de la propuesta
  const propCalc={...propuesta,ufCamara:0,ufVideoVerif:0,ufAlarma:0,duracionContrato:0};
  const r=calcProp(propCalc,lp);
  const projData=useMemo(()=>{
    if(!r||!r.iRec||r.iRec<=0)return[];
    const d=[];let ci=0;
    for(let m=1;m<=Math.max(36,r?.dur||24);m++){ci+=r.iRec;d.push({mes:"M"+m,ingreso:Math.round(ci),balance:Math.round(ci-(r?.sub||0))});}
    return d;
  },[r?.iRec,r?.sub,r?.dur]);
  if(!r)return null;
  const recM=projData.findIndex(d=>d.balance>=0)+1;
  const axT={fill:C.textM,fontSize:10,fontFamily:ff};
  const fM=v=>v>=1e6?"$"+(v/1e6).toFixed(1)+"M":"$"+(v/1e3).toFixed(0)+"K";
  const g4={display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:12};
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.75)",zIndex:200,overflowY:"auto",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:34,paddingBottom:34}}>
    <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,width:960,maxWidth:"96vw",padding:26}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18}}>
        <div>
          <div style={{fontSize:16,fontWeight:600,color:C.text,fontFamily:ff,marginBottom:4}}>{propuesta.nombre}</div>
          <div style={{display:"flex",gap:7,alignItems:"center",flexWrap:"wrap",fontSize:12,color:C.textM,fontFamily:ff}}>
            {cliente&&<span>{cliente.razonSocial||cliente.nombreComercial}</span>}
            {instalacion&&<span>· {instalacion.nombre}</span>}
            <Bdg color={COL_E[propuesta.estado]||"#64748B"} small>{propuesta.estado||"Borrador"}</Bdg>
            <Bdg color={C.blue} small>{propuesta.tipoVenta||"—"}</Bdg>
          </div>
        </div>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:C.textM,cursor:"pointer",fontSize:20,padding:0}}>✕</button>
      </div>
      <Card C={C}>
        <STitle C={C}>Parámetros</STitle>
        <G cols={4}>
          <Fld C={C} label="Valor UF" prefix="$"><Inp C={C} value={lp.ufValue} onChange={v=>slp("ufValue",v)} type="number"/></Fld>
          <Fld C={C} label="UF cámara" suffix="UF"><Inp C={C} value={lp.ufCamara} onChange={v=>slp("ufCamara",v)} type="number"/></Fld>
          <Fld C={C} label="UF video verif." suffix="UF"><Inp C={C} value={lp.ufVideoVerif} onChange={v=>slp("ufVideoVerif",v)} type="number"/></Fld>
          <Fld C={C} label="UF alarma" suffix="UF"><Inp C={C} value={lp.ufAlarma} onChange={v=>slp("ufAlarma",v)} type="number"/></Fld>
          <Fld C={C} label="Duración contrato" suffix="meses"><Inp C={C} value={lp.duracionContrato} onChange={v=>slp("duracionContrato",v)} type="number"/></Fld>
          <Fld C={C} label="Costo op. mensual total"><div style={{padding:"8px 11px",background:C.bg0,borderRadius:5,border:"1px solid "+C.border,fontSize:13,color:C.blue,fontFamily:ff}}>{fmtCLP((lp.costoPlatforma||0)+(lp.costoPersonal||0)+(lp.costoSoporte||0)+(lp.costoConectividad||0)+(lp.costoAdmin||0))}</div></Fld>
        </G>
      </Card>
      <Card C={C}>
        <STitle C={C}>Resultado — propuesta actual</STitle>
        <div style={g4}>
          <Stat C={C} label="Ingreso rec. mensual (neto)" value={fmtCLP(r.iRec)} color={C.green} sub={r.descSvcMonto>0?"Bruto: "+fmtCLP(r.iRecBruto):""}/>
          <Stat C={C} label="Margen mensual" value={fmtCLP(r.margen)} color={r.margen>=0?C.green:C.red}/>
          <Stat C={C} label="Subsidio" value={fmtCLP(r.sub)} color={C.amber}/>
          <Stat C={C} label="Valor final" value={fmtCLP(r.vf)} color={C.blue}/>
        </div>
        {r.tieneSvc&&(r.iC>0||r.iV>0||r.iA>0)&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:r.descSvcMonto>0?6:12}}>
          {r.iC>0&&<Stat C={C} label="Cámaras monitoreo" value={fmtCLP(r.iC)} color={C.blue} small sub="por mes"/>}
          {r.iV>0&&<Stat C={C} label="Video verificación" value={fmtCLP(r.iV)} color={C.purple} small sub="por mes"/>}
          {r.iA>0&&<Stat C={C} label="Alarmas" value={fmtCLP(r.iA)} color={C.amber} small sub="por mes"/>}
        </div>}
        {r.tieneSvc&&r.descSvcMonto>0&&<div style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:C.amber+"11",border:"1px solid "+C.amber+"33",borderRadius:5,marginBottom:12,fontSize:12,fontFamily:ff,flexWrap:"wrap"}}>
          <span style={{color:C.textM}}>Servicio bruto:</span><span style={{color:C.textS,fontWeight:600}}>{fmtCLP(r.iRecBruto)}/mes</span>
          <span style={{color:C.amber}}>− Descuento: {fmtCLP(r.descSvcMonto)} ({r.descSvcPct.toFixed(1)}%)</span>
          <span style={{color:C.textM}}>→</span>
          <span style={{color:C.green,fontWeight:700}}>Neto: {fmtCLP(r.iRec)}/mes</span>
        </div>}
        <div style={g4}>
          <Stat C={C} label="Meses recuperación" value={isFinite(r.meses)?fmtN(r.meses,0)+" m":"∞"} color={r.sem.color} sub={r.sem.label}/>
          <Stat C={C} label="Margen proyecto" value={r.tieneProj?fmtPct(r.mProjPct):"—"} color={r.mProjPct>0.2?C.green:C.amber}/>
          <Stat C={C} label="Total contrato" value={fmtCLP(r.totalContrato)}/>
          <Stat C={C} label="Proyección anual MRR" value={fmtCLP(r.iRecAnual)} color={C.green}/>
        </div>
        {r.tieneProj&&r.tieneSvc&&<div style={{background:r.sem.color+"22",border:"1px solid "+r.sem.color+"55",borderRadius:5,padding:"10px 16px",display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:14,height:14,borderRadius:"50%",background:r.sem.color,flexShrink:0}}/>
          <div style={{fontFamily:ff}}><span style={{fontSize:13,fontWeight:700,color:r.sem.color}}>{r.sem.label}</span>{isFinite(r.meses)&&r.meses>0&&<span style={{fontSize:12,color:C.textM}}> — recupera en {fmtN(r.meses,0)} de {r.dur} meses ({fmtPct(r.sem.pct)} del contrato)</span>}</div>
        </div>}
      </Card>
      <div style={{marginBottom:14}}>
        <Btn C={C} variant="soft" small onClick={()=>setShowP(!showProj)}>{showProj?"▾ Ocultar proyección":"▸ Ver proyección de ingresos"}</Btn>
        {showProj&&projData.length>0&&<Card C={C} style={{marginTop:8,marginBottom:0}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
            <STitle C={C}>Proyección acumulada</STitle>
            {recM>0&&recM<=projData.length&&<Bdg color={C.green}>Equilibrio: mes {recM}</Bdg>}
          </div>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={projData} margin={{top:4,right:12,left:12,bottom:4}}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
              <XAxis dataKey="mes" tick={axT} axisLine={false} tickLine={false} tickFormatter={(v,i)=>i%6===0?v:""} interval={0}/>
              <YAxis tickFormatter={fM} tick={axT} axisLine={false} tickLine={false} width={58}/>
              <Tooltip content={({active,payload,label})=>active&&payload?.length?<div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:5,padding:"8px 12px",fontSize:11,fontFamily:ff}}><div style={{color:C.textM,marginBottom:3}}>{label}</div><div style={{color:C.blue}}>Ingreso: {fmtCLP(payload[0]?.value)}</div><div style={{color:(payload[1]?.value||0)>=0?C.green:C.red}}>Balance: {fmtCLP(payload[1]?.value)}</div></div>:null}/>
              <Bar dataKey="ingreso" name="Ingreso acumulado" fill={C.blue} radius={[3,3,0,0]}/>
              <Bar dataKey="balance" name="Balance neto" fill={C.green} radius={[3,3,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>}
      </div>
      <Card C={C}>
        <STitle C={C}>Comparador de 4 escenarios</STitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
          {escs.map(esc=>{const rE=calcEsc(propCalc,lp,esc.pct);return <div key={esc.id} style={{background:C.bg2,border:"1px solid "+C.borderL,borderRadius:6,padding:"12px 13px"}}>
            <input value={esc.label} onChange={e=>setEscs(es=>es.map(x=>x.id===esc.id?{...x,label:e.target.value}:x))} style={{width:"100%",background:"transparent",border:"none",color:C.text,fontSize:11,fontWeight:700,fontFamily:ff,outline:"none",marginBottom:8}}/>
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
              <input type="range" min="0" max="100" step="1" value={esc.pct} onChange={e=>updPct(esc.id,+e.target.value)} style={{flex:1,accentColor:C.blue}}/>
              <span style={{fontSize:15,fontWeight:300,color:C.blue,fontFamily:ff,minWidth:32,textAlign:"right"}}>{esc.pct}%</span>
            </div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:3}}>Subsidio: <span style={{color:C.amber}}>{fmtCLP(rE?.sub||0)}</span></div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:3}}>Precio final: <span style={{color:C.blue}}>{fmtCLP(rE?.vf||0)}</span></div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:6}}>Ing./mes: <span style={{color:C.green}}>{fmtCLP(rE?.iRec||0)}</span></div>
            {rE&&rE.tieneProj&&rE.tieneSvc&&<div style={{padding:"5px 8px",background:rE.sem.color+"22",border:"1px solid "+rE.sem.color+"44",borderRadius:4,fontSize:10,color:rE.sem.color,fontFamily:ff,fontWeight:600}}>{rE.sem.label}{isFinite(rE.meses)&&rE.meses>0&&<span style={{fontWeight:400}}> · {fmtN(rE.meses,0)} m</span>}</div>}
          </div>;})}
        </div>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
            <thead><tr style={{borderBottom:"1px solid "+C.border}}>
              <th style={{padding:"6px 10px",color:C.textM,fontWeight:600,textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff}}>Indicador</th>
              {escs.map(e=><th key={e.id} style={{padding:"6px 10px",color:C.blue,fontWeight:700,textAlign:"center",fontSize:10,fontFamily:ff}}>{e.label} ({e.pct}%)</th>)}
            </tr></thead>
            <tbody>
              {[{lbl:"Valor final",fn:rE=>fmtCLP(rE?.vf||0)},{lbl:"Subsidio",fn:rE=>fmtCLP(rE?.sub||0)},{lbl:"Ing. rec./mes",fn:rE=>fmtCLP(rE?.iRec||0)},{lbl:"Margen mensual",fn:rE=>fmtCLP(rE?.margen||0)},{lbl:"Meses recuperación",fn:rE=>rE?.tieneSvc&&rE?.tieneProj?(isFinite(rE?.meses)?fmtN(rE.meses,0)+" m":"∞"):"N/A"},{lbl:"Total contrato",fn:rE=>fmtCLP(rE?.totalContrato||0)}].map(row=><tr key={row.lbl} style={{borderBottom:"1px solid "+C.border}}>
                <td style={{padding:"7px 10px",color:C.textM,fontFamily:ff,fontSize:11}}>{row.lbl}</td>
                {escs.map(e=>{const rE=calcEsc(propCalc,lp,e.pct);return <td key={e.id} style={{padding:"7px 10px",color:C.textS,fontFamily:ff,textAlign:"center"}}>{row.fn(rE)}</td>;})}
              </tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  </div>;
}

// ANÁLISIS
// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISIS POR CATEGORÍA
// ─────────────────────────────────────────────────────────────────────────────
function CategoriaTab({C,sortedCat,catChartData,togCat,catSort,catDir,params}){
  const [selected,setSelected]=useState(null);
  const axT={fill:C.textM,fontSize:10,fontFamily:ff};
  const fmtM=v=>v>=1e6?"$"+(v/1e6).toFixed(1)+"M":v>=1e3?"$"+(v/1e3).toFixed(0)+"K":"$"+Math.round(v);
  const TT=({active,payload,label})=>{
    if(!active||!payload?.length)return null;
    return <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:5,padding:"9px 13px",fontSize:11,fontFamily:ff}}>
      <div style={{color:C.textM,marginBottom:5,fontWeight:600}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color,marginBottom:2}}>{p.name}: {p.name==="Propuestas"?p.value:fmtM(p.value)}</div>)}
    </div>;
  };
  const thS={padding:"7px 10px",color:C.textM,fontWeight:600,textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,whiteSpace:"nowrap",cursor:"pointer",userSelect:"none"};
  const tdS={padding:"9px 10px",fontFamily:ff,fontSize:12};
  const SIcon=({col})=>catSort===col?<span style={{marginLeft:4,fontSize:9,color:C.blue}}>{catDir==="asc"?"▲":"▼"}</span>:null;

  const totals={
    total:sortedCat.reduce((a,c)=>a+c.total,0),
    aprobadas:sortedCat.reduce((a,c)=>a+c.aprobadas,0),
    proj:sortedCat.reduce((a,c)=>a+c.proj,0),
    mrr:sortedCat.reduce((a,c)=>a+c.mrr,0),
    sub:sortedCat.reduce((a,c)=>a+c.sub,0),
  };
  const convTotal=sortedCat.reduce((a,c)=>a+c.enviadas,0)>0?totals.aprobadas/sortedCat.reduce((a,c)=>a+c.enviadas,0):0;

  // Color palette for categories
  const COLORS=["#3B82F6","#10B981","#8B5CF6","#F59E0B","#EF4444","#06B6D4","#84CC16","#F97316","#EC4899","#6366F1","#14B8A6","#A855F7"];
  const catColor=cat=>{const idx=sortedCat.findIndex(c=>c.cat===cat);return COLORS[idx%COLORS.length]||"#64748B";};

  if(sortedCat.length===0)return <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,padding:40,textAlign:"center",color:C.textM,fontFamily:ff}}>
    <div style={{fontSize:24,marginBottom:10,opacity:0.2}}>◈</div>
    <div style={{fontSize:14,fontWeight:500,color:C.textS,marginBottom:6}}>Sin datos de categorías</div>
    <div style={{fontSize:12}}>Asigna una categoría a tus propuestas para ver el análisis.</div>
  </div>;

  return <div>
    {/* KPIs globales */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
      <Stat C={C} label="Categorías activas"   value={""+sortedCat.length}/>
      <Stat C={C} label="Propuestas totales"   value={""+totals.total} sub={totals.aprobadas+" aprobadas"}/>
      <Stat C={C} label="Conversión global"    value={(convTotal*100).toFixed(1)+"%"} color={convTotal>0.5?C.green:convTotal>0.3?C.amber:C.red}/>
      <Stat C={C} label="Venta proyectos"      value={fmtCLP(totals.proj)}  color={C.blue}/>
      <Stat C={C} label="MRR total"            value={fmtCLP(totals.mrr)}   color={C.green} sub="aprobado/mes"/>
    </div>

    {/* Gráfico */}
    {catChartData.length>0&&<Card C={C}>
      <STitle C={C}>Proyectos y MRR por categoría</STitle>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={catChartData} margin={{top:4,right:16,left:8,bottom:30}}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
          <XAxis dataKey="name" tick={{fill:C.textM,fontSize:9,fontFamily:ff}} axisLine={false} tickLine={false} angle={-25} textAnchor="end" interval={0}/>
          <YAxis yAxisId="left"  tickFormatter={fmtM} tick={axT} axisLine={false} tickLine={false} width={58}/>
          <YAxis yAxisId="right" orientation="right" tick={axT} axisLine={false} tickLine={false} width={30}/>
          <Tooltip content={<TT/>}/>
          <Legend wrapperStyle={{fontSize:11,color:C.textM,fontFamily:ff}}/>
          <Bar yAxisId="left"  dataKey="proj"  name="Proyectos" fill={C.blue}  radius={[3,3,0,0]} maxBarSize={26}/>
          <Bar yAxisId="left"  dataKey="mrr"   name="MRR/mes"   fill={C.green} radius={[3,3,0,0]} maxBarSize={26}/>
          <Bar yAxisId="right" dataKey="props" name="Propuestas" fill={C.amber} radius={[3,3,0,0]} maxBarSize={14} opacity={0.7}/>
        </BarChart>
      </ResponsiveContainer>
    </Card>}

    {/* Distribución visual */}
    {totals.proj>0&&<Card C={C}>
      <STitle C={C}>Distribución de venta de proyectos por categoría</STitle>
      <div style={{display:"flex",height:14,borderRadius:7,overflow:"hidden",marginBottom:12,gap:1}}>
        {sortedCat.filter(c=>c.proj>0).map(c=>(
          <div key={c.cat} title={c.cat+": "+fmtCLP(c.proj)} style={{flex:c.proj/totals.proj,background:catColor(c.cat),minWidth:2,cursor:"pointer",transition:"opacity 0.15s",opacity:selected===c.cat?1:0.8}} onClick={()=>setSelected(selected===c.cat?null:c.cat)}/>
        ))}
      </div>
      <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
        {sortedCat.filter(c=>c.proj>0||c.mrr>0).map(c=>(
          <div key={c.cat} onClick={()=>setSelected(selected===c.cat?null:c.cat)} style={{display:"flex",alignItems:"center",gap:5,cursor:"pointer",padding:"3px 8px",borderRadius:4,background:selected===c.cat?catColor(c.cat)+"22":"transparent",border:"1px solid "+(selected===c.cat?catColor(c.cat)+"66":C.border)}}>
            <div style={{width:8,height:8,borderRadius:2,background:catColor(c.cat),flexShrink:0}}/>
            <span style={{fontSize:11,color:selected===c.cat?catColor(c.cat):C.textS,fontFamily:ff,fontWeight:selected===c.cat?700:400}}>{c.cat}</span>
            <span style={{fontSize:10,color:C.textM,fontFamily:ff}}>{totals.proj>0?(c.proj/totals.proj*100).toFixed(0)+"%":""}</span>
          </div>
        ))}
      </div>
    </Card>}

    {/* Tabla detallada */}
    <Card C={C} style={{padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:"1px solid "+C.border,background:C.bg2}}>
            {[
              ["Categoría","cat",false],["Total","total",true],["Aprobadas","aprobadas",true],
              ["Conversión","conv",true],["Proyectos","proj",true],["Ticket prom.","ticketProm",true],
              ["MRR aprobado","mrr",true],["Subsidio","sub",true],["Payback prom.","paybackProm",true],["Ingreso total","totalIngr",true],
            ].map(([h,col,sortable])=>(
              <th key={h} onClick={sortable?()=>togCat(col):undefined} style={{...thS,cursor:sortable?"pointer":"default"}}>
                {h}{sortable&&catSort===col&&<SIcon col={col}/>}
              </th>
            ))}
          </tr></thead>
          <tbody>
            {sortedCat.map((c,i)=>(
              <tr key={c.cat} onClick={()=>setSelected(selected===c.cat?null:c.cat)}
                style={{borderBottom:"1px solid "+C.border,background:selected===c.cat?catColor(c.cat)+"11":i%2?C.bg2:"transparent",cursor:"pointer"}}>
                <td style={{...tdS,fontWeight:600}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:10,height:10,borderRadius:2,background:catColor(c.cat),flexShrink:0}}/>
                    <span style={{color:C.text}}>{c.cat}</span>
                  </div>
                </td>
                <td style={{...tdS,color:C.textS,textAlign:"center"}}>{c.total}</td>
                <td style={{...tdS,color:C.green,textAlign:"center",fontWeight:600}}>{c.aprobadas}</td>
                <td style={{...tdS,textAlign:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"center"}}>
                    <div style={{height:4,width:40,background:C.border,borderRadius:2,overflow:"hidden"}}>
                      <div style={{height:"100%",background:c.conv>0.5?C.green:c.conv>0.3?C.amber:C.red,width:(c.conv*100).toFixed(0)+"%"}}/>
                    </div>
                    <span style={{color:c.conv>0.5?C.green:c.conv>0.3?C.amber:C.red,fontWeight:600}}>{(c.conv*100).toFixed(0)}%</span>
                  </div>
                </td>
                <td style={{...tdS,color:C.blue,textAlign:"right"}}>{c.proj>0?fmtCLP(c.proj):"—"}</td>
                <td style={{...tdS,color:C.textM,textAlign:"right"}}>{c.ticketProm>0?fmtCLP(c.ticketProm):"—"}</td>
                <td style={{...tdS,color:C.green,textAlign:"right",fontWeight:600}}>{c.mrr>0?fmtCLP(c.mrr)+"/mes":"—"}</td>
                <td style={{...tdS,color:C.amber,textAlign:"right"}}>{c.sub>0?fmtCLP(c.sub):"—"}</td>
                <td style={{...tdS,color:C.textM,textAlign:"center"}}>{c.paybackProm>0?fmtN(c.paybackProm,1)+" m":"—"}</td>
                <td style={{...tdS,color:C.textS,textAlign:"right",fontWeight:600}}>{c.totalIngr>0?fmtCLP(c.totalIngr):"—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{borderTop:"2px solid "+C.blue+"44",background:C.bg2}}>
              <td style={{...tdS,fontWeight:700,color:C.blue}}>TOTAL</td>
              <td style={{...tdS,textAlign:"center",fontWeight:700}}>{totals.total}</td>
              <td style={{...tdS,color:C.green,textAlign:"center",fontWeight:700}}>{totals.aprobadas}</td>
              <td style={{...tdS,textAlign:"center",fontWeight:700,color:convTotal>0.5?C.green:convTotal>0.3?C.amber:C.red}}>{(convTotal*100).toFixed(0)}%</td>
              <td style={{...tdS,color:C.blue,textAlign:"right",fontWeight:700}}>{fmtCLP(totals.proj)}</td>
              <td style={tdS}>—</td>
              <td style={{...tdS,color:C.green,textAlign:"right",fontWeight:700}}>{fmtCLP(totals.mrr)}/mes</td>
              <td style={{...tdS,color:C.amber,textAlign:"right",fontWeight:700}}>{fmtCLP(totals.sub)}</td>
              <td style={tdS}>—</td>
              <td style={{...tdS,color:C.textS,textAlign:"right",fontWeight:700}}>{fmtCLP(totals.proj+totals.mrr*12)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>

    {/* Detalle expandido de la categoría seleccionada */}
    {selected&&(()=>{
      const c=sortedCat.find(x=>x.cat===selected);
      if(!c)return null;
      const apProp=c.props.filter(p=>p.estado==="Aprobada");
      const color=catColor(c.cat);
      return <Card C={C} style={{border:"1px solid "+color+"55",marginTop:-14}}>
        <STitle C={C} action={<button onClick={()=>setSelected(null)} style={{background:"transparent",border:"none",color:C.textM,cursor:"pointer",fontSize:13}}>✕</button>}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:10,height:10,borderRadius:2,background:color}}/>
            {c.cat}
          </div>
        </STitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:14}}>
          <Stat C={C} label="Propuestas totales"  value={""+c.total}              small/>
          <Stat C={C} label="Conversión"          value={(c.conv*100).toFixed(1)+"%"} color={c.conv>0.5?C.green:c.conv>0.3?C.amber:C.red} small/>
          <Stat C={C} label="Proyectos aprobados" value={fmtCLP(c.proj)}          color={C.blue}  small/>
          <Stat C={C} label="MRR aprobado"        value={fmtCLP(c.mrr)+"/mes"}   color={C.green} small/>
          <Stat C={C} label="Ticket promedio"     value={c.ticketProm>0?fmtCLP(c.ticketProm):"—"} small/>
          <Stat C={C} label="Payback promedio"    value={c.paybackProm>0?fmtN(c.paybackProm,1)+" m":"—"} small/>
          <Stat C={C} label="Subsidio total"      value={fmtCLP(c.sub)}           color={C.amber} small/>
          <Stat C={C} label="Ingreso total"       value={fmtCLP(c.totalIngr)}     small/>
        </div>
        {apProp.length>0&&<div>
          <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:ff,fontWeight:600,marginBottom:8}}>Propuestas aprobadas</div>
          <div style={{display:"grid",gap:5}}>
            {apProp.map(p=>{
              const r=calcProp(p,params);
              return <div key={p.id} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
                <div style={{width:7,height:7,borderRadius:2,background:color,flexShrink:0}}/>
                <div style={{flex:1,fontSize:12,fontWeight:500,color:C.text,fontFamily:ff}}>{p.nombre||"—"}</div>
                {p.ejecutivo&&<span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{p.ejecutivo}</span>}
                {r?.tieneProj&&<span style={{fontSize:12,color:C.blue,fontFamily:ff}}>{fmtCLP(r.vf)}</span>}
                {r?.tieneSvc&&<span style={{fontSize:12,color:C.green,fontFamily:ff}}>{fmtCLP(r.iRec)}/mes</span>}
                {r?.tieneProj&&r?.tieneSvc&&<Bdg color={r.sem.color} small>{r.sem.label}</Bdg>}
              </div>;
            })}
          </div>
        </div>}
      </Card>;
    })()}
  </div>;
}


// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISIS POR EJECUTIVO
// ─────────────────────────────────────────────────────────────────────────────
function EjecutivosTab({C,byEjec,ejChartData,togEj,ejSort,ejDir,params}){
  const [selected,setSelected]=useState(null);
  const axT={fill:C.textM,fontSize:10,fontFamily:ff};
  const fmtM=v=>v>=1e6?"$"+(v/1e6).toFixed(1)+"M":v>=1e3?"$"+(v/1e3).toFixed(0)+"K":"$"+Math.round(v);
  const TT=({active,payload,label})=>{
    if(!active||!payload?.length)return null;
    return <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:5,padding:"9px 13px",fontSize:11,fontFamily:ff}}>
      <div style={{color:C.textM,marginBottom:5,fontWeight:600}}>{label}</div>
      {payload.map((p,i)=><div key={i} style={{color:p.color,marginBottom:2}}>{p.name}: {p.name==="Conv. %"?p.value+"%":fmtM(p.value)}</div>)}
    </div>;
  };
  const thS={padding:"7px 10px",color:C.textM,fontWeight:600,textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,whiteSpace:"nowrap",cursor:"pointer",userSelect:"none"};
  const tdS={padding:"9px 10px",fontFamily:ff,fontSize:12};
  const SIcon=({col})=>ejSort===col?<span style={{marginLeft:4,fontSize:9,color:C.blue}}>{ejDir==="asc"?"▲":"▼"}</span>:null;

  const totals={
    total:byEjec.reduce((a,e)=>a+e.total,0),
    enviadas:byEjec.reduce((a,e)=>a+e.enviadas,0),
    aprobadas:byEjec.reduce((a,e)=>a+e.aprobadas,0),
    proj:byEjec.reduce((a,e)=>a+e.proj,0),
    mrr:byEjec.reduce((a,e)=>a+e.mrr,0),
    subsidio:byEjec.reduce((a,e)=>a+e.subsidio,0),
  };
  const convTotal=totals.enviadas>0?totals.aprobadas/totals.enviadas:0;

  if(byEjec.length===0)return <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,padding:40,textAlign:"center",color:C.textM,fontFamily:ff}}>
    <div style={{fontSize:24,marginBottom:10,opacity:0.2}}>◎</div>
    <div style={{fontSize:14,fontWeight:500,color:C.textS,marginBottom:6}}>Sin datos de ejecutivos</div>
    <div style={{fontSize:12}}>Asigna ejecutivos a tus clientes o propuestas para ver el análisis.</div>
  </div>;

  return <div>
    {/* KPIs globales del equipo */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
      <Stat C={C} label="Ejecutivos activos" value={""+byEjec.length}/>
      <Stat C={C} label="Propuestas totales" value={""+totals.total} sub={totals.aprobadas+" aprobadas"}/>
      <Stat C={C} label="Conversión equipo" value={(convTotal*100).toFixed(1)+"%" } color={convTotal>0.5?C.green:convTotal>0.3?C.amber:C.red} sub={totals.aprobadas+" de "+totals.enviadas+" enviadas"}/>
      <Stat C={C} label="Venta total equipo" value={fmtCLP(totals.proj)} color={C.blue}/>
      <Stat C={C} label="MRR total equipo" value={fmtCLP(totals.mrr)} color={C.green} sub="aprobado/mes"/>
    </div>

    {/* Gráfico comparativo */}
    {ejChartData.length>0&&<Card C={C}>
      <STitle C={C}>Comparativo por ejecutivo — proyectos y MRR aprobados</STitle>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={ejChartData} margin={{top:4,right:16,left:8,bottom:4}}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border}/>
          <XAxis dataKey="name" tick={axT} axisLine={false} tickLine={false}/>
          <YAxis yAxisId="left" tickFormatter={fmtM} tick={axT} axisLine={false} tickLine={false} width={58}/>
          <YAxis yAxisId="right" orientation="right" tickFormatter={v=>v+"%"} tick={axT} axisLine={false} tickLine={false} width={36}/>
          <Tooltip content={<TT/>}/>
          <Legend wrapperStyle={{fontSize:11,color:C.textM,fontFamily:ff}}/>
          <Bar yAxisId="left" dataKey="proj" name="Proyectos" fill={C.blue} radius={[3,3,0,0]} maxBarSize={28}/>
          <Bar yAxisId="left" dataKey="mrr" name="MRR/mes" fill={C.green} radius={[3,3,0,0]} maxBarSize={28}/>
          <Bar yAxisId="right" dataKey="conv" name="Conv. %" fill={C.amber} radius={[3,3,0,0]} maxBarSize={16} opacity={0.7}/>
        </BarChart>
      </ResponsiveContainer>
    </Card>}

    {/* Tabla completa */}
    <Card C={C} style={{padding:0,overflow:"hidden"}}>
      <div style={{overflowX:"auto"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{borderBottom:"1px solid "+C.border,background:C.bg2}}>
            {[
              ["Ejecutivo","name",false],["Prop. total","total",true],["Enviadas","enviadas",true],
              ["Aprobadas","aprobadas",true],["Conversión","conv",true],["Proyectos","proj",true],
              ["Ticket prom.","ticketProm",true],["MRR aprobado","mrr",true],["Subsidio","subsidio",true],
              ["Payback prom.","paybackProm",true],["Ingreso total","totalIngr",true],
            ].map(([h,col,sortable])=><th key={h} onClick={sortable?()=>togEj(col):undefined} style={{...thS,cursor:sortable?"pointer":"default"}}>
              {h}{sortable&&ejSort===col&&<SIcon col={col}/>}
            </th>)}
          </tr></thead>
          <tbody>
            {byEjec.map((e,i)=>(
              <tr key={e.name} style={{borderBottom:"1px solid "+C.border,background:selected===e.name?C.blue+"11":i%2?C.bg2:"transparent",cursor:"pointer"}} onClick={()=>setSelected(selected===e.name?null:e.name)}>
                <td style={{...tdS,fontWeight:600,color:C.text}}>
                  <div style={{display:"flex",alignItems:"center",gap:7}}>
                    <div style={{width:26,height:26,borderRadius:"50%",background:C.blue+"22",border:"1px solid "+C.blue+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.blue,flexShrink:0}}>{e.name.slice(0,1).toUpperCase()}</div>
                    {e.name}
                  </div>
                </td>
                <td style={{...tdS,color:C.textS,textAlign:"center"}}>{e.total}</td>
                <td style={{...tdS,color:C.textM,textAlign:"center"}}>{e.enviadas}</td>
                <td style={{...tdS,color:C.green,textAlign:"center",fontWeight:600}}>{e.aprobadas}</td>
                <td style={{...tdS,textAlign:"center"}}>
                  <div style={{display:"flex",alignItems:"center",gap:5,justifyContent:"center"}}>
                    <div style={{height:4,width:40,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:e.conv>0.5?C.green:e.conv>0.3?C.amber:C.red,width:(e.conv*100).toFixed(0)+"%"}}/></div>
                    <span style={{color:e.conv>0.5?C.green:e.conv>0.3?C.amber:C.red,fontWeight:600}}>{(e.conv*100).toFixed(0)}%</span>
                  </div>
                </td>
                <td style={{...tdS,color:C.blue,textAlign:"right"}}>{e.proj>0?fmtCLP(e.proj):"—"}</td>
                <td style={{...tdS,color:C.textM,textAlign:"right"}}>{e.ticketProm>0?fmtCLP(e.ticketProm):"—"}</td>
                <td style={{...tdS,color:C.green,textAlign:"right",fontWeight:600}}>{e.mrr>0?fmtCLP(e.mrr)+"/mes":"—"}</td>
                <td style={{...tdS,color:C.amber,textAlign:"right"}}>{e.subsidio>0?fmtCLP(e.subsidio):"—"}</td>
                <td style={{...tdS,color:C.textM,textAlign:"center"}}>{e.paybackProm>0?fmtN(e.paybackProm,1)+" m":"—"}</td>
                <td style={{...tdS,color:C.textS,textAlign:"right",fontWeight:600}}>{e.totalIngr>0?fmtCLP(e.totalIngr):"—"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{borderTop:"2px solid "+C.blue+"44",background:C.bg2}}>
              <td style={{...tdS,fontWeight:700,color:C.blue}}>TOTAL EQUIPO</td>
              <td style={{...tdS,color:C.textS,textAlign:"center",fontWeight:700}}>{totals.total}</td>
              <td style={{...tdS,color:C.textM,textAlign:"center"}}>{totals.enviadas}</td>
              <td style={{...tdS,color:C.green,textAlign:"center",fontWeight:700}}>{totals.aprobadas}</td>
              <td style={{...tdS,textAlign:"center",color:convTotal>0.5?C.green:convTotal>0.3?C.amber:C.red,fontWeight:700}}>{(convTotal*100).toFixed(0)}%</td>
              <td style={{...tdS,color:C.blue,textAlign:"right",fontWeight:700}}>{fmtCLP(totals.proj)}</td>
              <td style={tdS}>—</td>
              <td style={{...tdS,color:C.green,textAlign:"right",fontWeight:700}}>{fmtCLP(totals.mrr)}/mes</td>
              <td style={{...tdS,color:C.amber,textAlign:"right",fontWeight:700}}>{fmtCLP(totals.subsidio)}</td>
              <td style={tdS}>—</td>
              <td style={{...tdS,color:C.textS,textAlign:"right",fontWeight:700}}>{fmtCLP(totals.proj+totals.mrr*12)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>

    {/* Detalle expandido del ejecutivo seleccionado */}
    {selected&&(()=>{
      const e=byEjec.find(x=>x.name===selected);
      if(!e)return null;
      const apProp=e.props.filter(p=>p.estado==="Aprobada");
      return <Card C={C} style={{border:"1px solid "+C.blue+"44"}}>
        <STitle C={C} action={<button onClick={()=>setSelected(null)} style={{background:"transparent",border:"none",color:C.textM,cursor:"pointer",fontSize:13}}>✕</button>}>
          Detalle · {e.name}
        </STitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9,marginBottom:14}}>
          <Stat C={C} label="Propuestas totales"  value={""+e.total}            small/>
          <Stat C={C} label="Conversión"          value={(e.conv*100).toFixed(1)+"%"} color={e.conv>0.5?C.green:e.conv>0.3?C.amber:C.red} small/>
          <Stat C={C} label="Proyectos aprobados" value={fmtCLP(e.proj)}        color={C.blue}  small/>
          <Stat C={C} label="MRR aprobado"        value={fmtCLP(e.mrr)+"/mes"} color={C.green} small/>
          <Stat C={C} label="Ticket promedio"     value={e.ticketProm>0?fmtCLP(e.ticketProm):"—"} small/>
          <Stat C={C} label="Payback promedio"    value={e.paybackProm>0?fmtN(e.paybackProm,1)+" m":"—"} small/>
          <Stat C={C} label="Subsidio total"      value={fmtCLP(e.subsidio)}    color={C.amber} small/>
          <Stat C={C} label="Ingreso total"       value={fmtCLP(e.totalIngr)}   color={C.textS} small/>
        </div>
        {apProp.length>0&&<div>
          <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:ff,fontWeight:600,marginBottom:8}}>Propuestas aprobadas</div>
          <div style={{display:"grid",gap:6}}>
            {apProp.map(p=>{
              const r=calcProp(p,params);
              return <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
                <Bdg color={COL_E[p.estado]||"#64748B"} small>{p.estado}</Bdg>
                <div style={{flex:1,fontSize:12,fontWeight:500,color:C.text,fontFamily:ff}}>{p.nombre||"—"}</div>
                {r?.tieneProj&&<span style={{fontSize:12,color:C.blue,fontFamily:ff}}>{fmtCLP(r.vf)}</span>}
                {r?.tieneSvc&&<span style={{fontSize:12,color:C.green,fontFamily:ff}}>{fmtCLP(r.iRec)}/mes</span>}
                {r?.tieneProj&&r?.tieneSvc&&<Bdg color={r.sem.color} small>{r.sem.label}</Bdg>}
              </div>;
            })}
          </div>
        </div>}
      </Card>;
    })()}
  </div>;
}


function KpisCruzadosTab({C,clientes,propuestas,proyectos,registrosHoras,params}){
  const facturas=repo.facturas.list();
  const pagos=repo.pagos.list();
  const costoCapitalAnual=(params?.costoCapitalAnual||18)/100;
  const montoFactura=f=>f.monto??f.montoTotal??0;
  const saldoFactura=f=>f.saldo??Math.max(0,montoFactura(f)-(f.montoPagado||0));
  const costoRealProyecto=p=>{
    const directo=(p.costos||[]).reduce((s,c)=>s+(c.total||0),0);
    const gg=directo*((p.pctGG??params?.pctGG??10)/100);
    const imp=directo*((p.pctImp??params?.pctImp??5)/100);
    return directo+gg+imp;
  };
  const ventaProyecto=p=>p.valorVendido||p.valorFinal||p.valorProyecto||0;
  const propuestaProyecto=p=>propuestas.find(x=>x.id===p.propuestaId)||{};
  const clienteProyecto=p=>clientes.find(c=>c.id===p.clienteId);
  const facturasProyecto=p=>facturas.filter(f=>f.proyectoId===p.id||f.rutCliente===clienteProyecto(p)?.rut);
  const finProyecto=p=>{
    const fs=facturasProyecto(p);
    const facturado=fs.reduce((s,f)=>s+montoFactura(f),0);
    const cobrado=fs.reduce((s,f)=>s+(f.montoPagado||0),0);
    const pendienteCxC=fs.reduce((s,f)=>s+saldoFactura(f),0);
    const venta=ventaProyecto(p);
    const costoReal=costoRealProyecto(p);
    const costoEstimado=p.costoEstimado||propuestaProyecto(p).costoEstimado||0;
    const utilidadReal=venta-costoReal;
    const utilidadCobrada=cobrado-costoReal;
    return{
      venta,facturado,cobrado,pendienteCxC,costoReal,costoEstimado,
      utilidadReal,utilidadCobrada,
      margenReal:venta>0?utilidadReal/venta:0,
      margenCobrado:venta>0?utilidadCobrada/venta:0,
      margenEstimado:venta>0?(venta-costoEstimado)/venta:0,
    };
  };
  const groupBy=(labelFn,keyFn,rows)=>Object.values(rows.reduce((acc,p)=>{
    const key=keyFn(p)||"sin-asignar";
    const label=labelFn(p)||"Sin asignar";
    if(!acc[key])acc[key]={key,label,count:0,venta:0,facturado:0,cobrado:0,costoReal:0,utilidadReal:0,utilidadCobrada:0,pendienteCxC:0};
    const f=finProyecto(p);
    acc[key].count++;
    ["venta","facturado","cobrado","costoReal","utilidadReal","utilidadCobrada","pendienteCxC"].forEach(k=>acc[key][k]+=f[k]||0);
    return acc;
  },{})).map(r=>({...r,margenReal:r.venta>0?r.utilidadReal/r.venta:0,margenCobrado:r.venta>0?r.utilidadCobrada/r.venta:0})).sort((a,b)=>b.utilidadCobrada-a.utilidadCobrada);
  const rows=proyectos.filter(p=>ventaProyecto(p)>0);
  const porCliente=groupBy(p=>getNombreCliente(clienteProyecto(p)),p=>p.clienteId,rows).slice(0,8);
  const porEjecutivo=groupBy(p=>p.ejecutivo||propuestaProyecto(p).ejecutivo||clienteProyecto(p)?.ejecutivo,p=>p.ejecutivo||propuestaProyecto(p).ejecutivo||clienteProyecto(p)?.ejecutivo,rows).slice(0,8);
  const porTipo=groupBy(p=>p.categoria||propuestaProyecto(p).categoria||propuestaProyecto(p).tipoVenta,p=>p.categoria||propuestaProyecto(p).categoria||propuestaProyecto(p).tipoVenta,rows).slice(0,8);
  const desviaciones=rows.map(p=>{
    const f=finProyecto(p);
    const horasPlan=(p.tareas||[]).reduce((s,t)=>s+(t.horasEstimadas||t.estimadoHoras||t.duracionEstimada||0),0);
    const horasReal=(registrosHoras||[]).filter(r=>r.proyectoId===p.id&&r.estado==="aprobado").reduce((s,r)=>s+(r.horas||0),0);
    const matReal=(p.costos||[]).filter(c=>c.autoMat||c.cat==="Materiales"||c.tipo==="Materiales").reduce((s,c)=>s+(c.total||0),0);
    const moReal=(p.costos||[]).filter(c=>c.autoMO||c.cat==="Mano de obra"||c.tipo==="Mano de obra").reduce((s,c)=>s+(c.total||0),0);
    const desvCosto=f.costoEstimado>0?(f.costoReal-f.costoEstimado)/f.costoEstimado:0;
    const desvHoras=horasPlan>0?(horasReal-horasPlan)/horasPlan:0;
    return{proyecto:p,costoEstimado:f.costoEstimado,costoReal:f.costoReal,desvCosto,horasPlan,horasReal,desvHoras,matReal,moReal};
  }).sort((a,b)=>Math.abs(b.desvCosto)-Math.abs(a.desvCosto)).slice(0,10);
  const resumen=rows.reduce((acc,p)=>{
    const f=finProyecto(p);
    Object.keys(acc).forEach(k=>acc[k]+=f[k]||0);
    return acc;
  },{venta:0,facturado:0,cobrado:0,costoReal:0,costoEstimado:0,utilidadReal:0,utilidadCobrada:0,pendienteCxC:0});
  const margenReal=resumen.venta>0?resumen.utilidadReal/resumen.venta:0;
  const margenCobrado=resumen.venta>0?resumen.utilidadCobrada/resumen.venta:0;
  const margenEstimado=resumen.venta>0?(resumen.venta-resumen.costoEstimado)/resumen.venta:0;
  const costoFinanciero=facturas.reduce((s,f)=>{
    const em=f.fechaEmision?new Date(f.fechaEmision):null;
    const ven=f.fechaVencimiento?new Date(f.fechaVencimiento):null;
    if(!em||!ven||isNaN(em)||isNaN(ven))return s;
    const dias=Math.max(0,Math.round((ven-em)/(1000*60*60*24)));
    return s+saldoFactura(f)*(dias/365)*costoCapitalAnual;
  },0);
  const thS={padding:"7px 10px",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,color:C.textM,textAlign:"left",borderBottom:"1px solid "+C.border};
  const tdS={padding:"9px 10px",fontSize:12,fontFamily:ff,borderBottom:"1px solid "+C.border};
  const pct=v=>((v||0)*100).toFixed(1)+"%";
  const Tabla=({title,rows})=><Card C={C} pad={16}>
    <STitle C={C}>{title}</STitle>
    {rows.length===0?<Empty C={C} title="Sin datos" sub="Faltan proyectos valorizados para calcular este KPI."/>:
    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><tr>{["Dimensión","Proy.","Venta","Cobrado","CxC","Costo real","Utilidad cobrada","Margen cobrado","Fuente"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r,i)=><tr key={r.key} style={{background:i%2?C.bg2:"transparent"}}>
        <td style={{...tdS,color:C.text,fontWeight:700}}>{r.label}</td>
        <td style={tdS}>{r.count}</td>
        <td style={{...tdS,color:C.blue}}>{fmtCLP(r.venta)}</td>
        <td style={{...tdS,color:C.green}}>{fmtCLP(r.cobrado)}</td>
        <td style={{...tdS,color:C.amber}}>{fmtCLP(r.pendienteCxC)}</td>
        <td style={tdS}>{fmtCLP(r.costoReal)}</td>
        <td style={{...tdS,color:r.utilidadCobrada>=0?C.green:C.red,fontWeight:700}}>{fmtCLP(r.utilidadCobrada)}</td>
        <td style={{...tdS,color:r.margenCobrado>=0?C.green:C.red}}>{pct(r.margenCobrado)}</td>
        <td style={{...tdS,color:C.textM}}>Mixto</td>
      </tr>)}</tbody>
    </table></div>}
  </Card>;
  const TablaDesv=()=> <Card C={C} pad={16}>
    <STitle C={C}>Desviación costo / hora / material</STitle>
    {desviaciones.length===0?<Empty C={C} title="Sin datos" sub="Faltan proyectos con costos estimados y reales."/>:
    <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}>
      <thead><tr>{["Proyecto","Costo estimado","Costo real","Desv. costo","Horas plan","Horas reales","Desv. horas","Material real","MO real"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
      <tbody>{desviaciones.map((r,i)=><tr key={r.proyecto.id} style={{background:i%2?C.bg2:"transparent"}}>
        <td style={{...tdS,color:C.text,fontWeight:700}}>{r.proyecto.codigo||"—"} · {r.proyecto.nombre}</td>
        <td style={tdS}>{fmtCLP(r.costoEstimado)}</td>
        <td style={tdS}>{fmtCLP(r.costoReal)}</td>
        <td style={{...tdS,color:Math.abs(r.desvCosto)<=0.08?C.green:Math.abs(r.desvCosto)<=0.18?C.amber:C.red,fontWeight:700}}>{r.costoEstimado>0?pct(r.desvCosto):"—"}</td>
        <td style={tdS}>{r.horasPlan?r.horasPlan.toFixed(1)+"h":"—"}</td>
        <td style={tdS}>{r.horasReal?r.horasReal.toFixed(1)+"h":"—"}</td>
        <td style={{...tdS,color:Math.abs(r.desvHoras)<=0.1?C.green:Math.abs(r.desvHoras)<=0.25?C.amber:C.red}}>{r.horasPlan>0?pct(r.desvHoras):"—"}</td>
        <td style={{...tdS,color:C.blue}}>{fmtCLP(r.matReal)}</td>
        <td style={{...tdS,color:C.textS}}>{fmtCLP(r.moReal)}</td>
      </tr>)}</tbody>
    </table></div>}
    <div style={{marginTop:10,fontSize:11,color:C.textM,fontFamily:ff}}>Fuente mixta: costo estimado comercial, costos imputados de operación, registros de horas aprobados y materiales entregados.</div>
  </Card>;
  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:9,marginBottom:14}}>
      <Stat C={C} label="Venta neta" value={fmtCLP(resumen.venta)} color={C.blue} small/>
      <Stat C={C} label="Cobrado" value={fmtCLP(resumen.cobrado)} color={C.green} sub={pct(resumen.venta>0?resumen.cobrado/resumen.venta:0)} small/>
      <Stat C={C} label="Utilidad cobrada" value={fmtCLP(resumen.utilidadCobrada)} color={resumen.utilidadCobrada>=0?C.green:C.red} small/>
      <Stat C={C} label="Margen estimado / real" value={`${pct(margenEstimado)} / ${pct(margenReal)}`} color={margenReal>=margenEstimado?C.green:C.amber} small/>
      <Stat C={C} label="Costo financiero est." value={fmtCLP(costoFinanciero)} color={C.amber} sub={`${(costoCapitalAnual*100).toFixed(0)}% anual`} small/>
    </div>
    <Card C={C} pad={16} style={{borderLeft:"3px solid "+C.blue}}>
      <STitle C={C}>Margen estimado vs real</STitle>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:9}}>
        <Stat C={C} label="Costo estimado" value={fmtCLP(resumen.costoEstimado)} small/>
        <Stat C={C} label="Costo real" value={fmtCLP(resumen.costoReal)} color={C.textS} small/>
        <Stat C={C} label="Margen real" value={pct(margenReal)} color={margenReal>=0.25?C.green:margenReal>=0.12?C.amber:C.red} small/>
        <Stat C={C} label="Margen cobrado" value={pct(margenCobrado)} color={margenCobrado>=0?C.green:C.red} small/>
      </div>
      <div style={{marginTop:10,fontSize:11,color:C.textM,fontFamily:ff}}>Fuente mixta: proyectos y costos operativos Assur + facturas/pagos importados o registrados desde Softland.</div>
    </Card>
    <Tabla title="Rentabilidad real por cliente" rows={porCliente}/>
    <Tabla title="Rentabilidad por ejecutivo" rows={porEjecutivo}/>
    <Tabla title="Rentabilidad por tipo de proyecto" rows={porTipo}/>
    <TablaDesv/>
  </div>;
}

function AnalisisView({C,clientes,instalaciones,propuestas,proyectos,registrosHoras,params,categorias}){
  const [mainTab,setMainTab]=useState("general");
  const allD=useMemo(()=>propuestas.map(p=>(p.fecha||p.createdAt||"").slice(0,7)).filter(Boolean).sort(),[propuestas]);
  const minD=allD[0]||new Date().toISOString().slice(0,7);
  const maxD=allD[allD.length-1]||new Date().toISOString().slice(0,7);
  const [fromM,setFrom]=useState(minD);const [toM,setTo]=useState(maxD);
  const [fE,setFE]=useState("Aprobada");const [fT,setFT]=useState("Todos");const [view,setView]=useState("chart");
  const approved=useMemo(()=>propuestas.filter(p=>p.estado==="Aprobada"),[propuestas]);
  const sent=useMemo(()=>propuestas.filter(p=>["Enviada","Aprobada","Rechazada"].includes(p.estado)),[propuestas]);
  const conv=sent.length>0?approved.length/sent.length:0;
  const aCalc=useMemo(()=>approved.map(p=>({...p,_c:calcProp(p,params)})),[approved,params]);
  const mrrTotal=aCalc.filter(p=>p._c?.tieneSvc).reduce((a,p)=>a+(p._c?.iRec||0),0);
  const mrrC=aCalc.reduce((a,p)=>a+(p._c?.iC||0),0);
  const mrrV=aCalc.reduce((a,p)=>a+(p._c?.iV||0),0);
  const mrrA=aCalc.reduce((a,p)=>a+(p._c?.iA||0),0);
  const projTotal=aCalc.filter(p=>p._c?.tieneProj).reduce((a,p)=>a+(p.valorFinal||p.valorProyecto||0),0);
  const subTotal=aCalc.reduce((a,p)=>a+(p._c?.sub||0),0);
  const recPct=(mrrTotal*12+projTotal)>0?(mrrTotal*12)/(mrrTotal*12+projTotal):0;
  const filtrados=useMemo(()=>propuestas.filter(p=>(fE==="Todos"||p.estado===fE)&&(fT==="Todos"||p.tipoVenta===fT)),[propuestas,fE,fT]);
  const buckets=useMemo(()=>{
    const m={};
    filtrados.forEach(p=>{const dk=(p.fecha||p.createdAt||"").slice(0,7);if(!dk||dk<fromM||dk>toM)return;const lbl=fmtMes(p.fecha||p.createdAt);if(!m[dk])m[dk]={key:dk,mes:lbl,proyecto:0,monitoreoAnual:0,videoVerifAnual:0,alarmaAnual:0,subsidio:0,count:0,props:[]};const c=calcProp(p,params);if(!c)return;if(c.tieneProj)m[dk].proyecto+=p.valorFinal||p.valorProyecto||0;if(c.tieneSvc){m[dk].monitoreoAnual+=c.iC*12;m[dk].videoVerifAnual+=c.iV*12;m[dk].alarmaAnual+=c.iA*12;}if(c.tieneProj)m[dk].subsidio+=c.sub;m[dk].count++;m[dk].props.push({...p,_c:c});});
    return Object.values(m).sort((a,b)=>a.key.localeCompare(b.key));
  },[filtrados,fromM,toM,params]);
  const kpis={proyecto:buckets.reduce((a,m)=>a+m.proyecto,0),monitoreoAnual:buckets.reduce((a,m)=>a+m.monitoreoAnual,0),videoVerifAnual:buckets.reduce((a,m)=>a+(m.videoVerifAnual||0),0),alarmaAnual:buckets.reduce((a,m)=>a+(m.alarmaAnual||0),0),subsidio:buckets.reduce((a,m)=>a+m.subsidio,0),count:buckets.reduce((a,m)=>a+m.count,0)};
  const byC=useMemo(()=>clientes.map(c=>{const cp=aCalc.filter(p=>p.clienteId===c.id);return{name:(c.razonSocial||c.nombreComercial||"?").slice(0,16),mrr:Math.round(cp.reduce((a,p)=>a+(p._c?.iRec||0),0)),proj:Math.round(cp.reduce((a,p)=>a+(p.valorFinal||p.valorProyecto||0),0))};}).filter(x=>x.mrr>0||x.proj>0).sort((a,b)=>b.proj-a.proj).slice(0,8),[aCalc,clientes]);
  const pipeD=ESTADOS.map(s=>({state:s,count:propuestas.filter(p=>p.estado===s).length,color:COL_E[s]||"#64748B"})).filter(x=>x.count>0);
  const maxP=Math.max(...pipeD.map(d=>d.count),1);
  const axT={fill:C.textM,fontSize:10,fontFamily:ff};
  const TT=({active,payload,label})=>{if(!active||!payload?.length)return null;return <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:5,padding:"9px 13px",fontSize:11,fontFamily:ff}}><div style={{color:C.textM,marginBottom:5,fontWeight:600}}>{label}</div>{payload.map((p,i)=><div key={i} style={{color:p.color,marginBottom:2}}>{p.name}: {fmtMil(p.value)}</div>)}</div>;};
  const thS={padding:"6px 9px",color:C.textM,fontWeight:600,textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff};
  const tdS={padding:"8px 9px",fontFamily:ff,fontSize:12};
  const exportCSV=()=>{const h=["Mes","Prop.","Proyecto","Mon. anual","VV anual","Alarm. anual","Total"];const rows=buckets.map(m=>[m.mes,m.count,Math.round(m.proyecto),Math.round(m.monitoreoAnual),Math.round(m.videoVerifAnual||0),Math.round(m.alarmaAnual||0),Math.round((m.proyecto||0)+(m.monitoreoAnual||0)+(m.videoVerifAnual||0)+(m.alarmaAnual||0))].join(";"));const blob=new Blob(["\uFEFF",[h.join(";"),...rows].join("\n")],{type:"text/csv;charset=utf-8;"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="analisis-assur.csv";a.click();URL.revokeObjectURL(url);};

  // ── Datos por categoría ──
  const byCat=useMemo(()=>{
    const allCats=[...(categorias||[]),"Sin categoría"];
    return allCats.map(cat=>{
      const catProps=propuestas.filter(p=>(p.categoria||"Sin categoría")===cat);
      const aprobadas=catProps.filter(p=>p.estado==="Aprobada");
      const aCalcCat=aprobadas.map(p=>({...p,_c:calcProp(p,params)}));
      const enviadas=catProps.filter(p=>["Enviada","Aprobada","Rechazada"].includes(p.estado));
      const mrr=aCalcCat.filter(p=>p._c?.tieneSvc).reduce((a,p)=>a+(p._c?.iRec||0),0);
      const proj=aCalcCat.filter(p=>p._c?.tieneProj).reduce((a,p)=>a+(p.valorFinal||p.valorProyecto||0),0);
      const sub=aCalcCat.reduce((a,p)=>a+(p._c?.sub||0),0);
      const tickets=aCalcCat.filter(p=>p._c?.tieneProj&&(p.valorFinal||p.valorProyecto)>0).map(p=>p.valorFinal||p.valorProyecto||0);
      const paybacks=aCalcCat.filter(p=>isFinite(p._c?.meses)&&p._c?.meses>0).map(p=>p._c.meses);
      const conv=enviadas.length>0?aprobadas.length/enviadas.length:0;
      if(catProps.length===0)return null;
      return{
        cat,total:catProps.length,enviadas:enviadas.length,aprobadas:aprobadas.length,
        conv,mrr,proj,sub,
        ticketProm:tickets.length>0?tickets.reduce((a,b)=>a+b,0)/tickets.length:0,
        paybackProm:paybacks.length>0?paybacks.reduce((a,b)=>a+b,0)/paybacks.length:0,
        totalIngr:proj+mrr*12,
        props:catProps,
      };
    }).filter(Boolean).sort((a,b)=>b.totalIngr-a.totalIngr);
  },[propuestas,categorias,params]);

  const [catSort,setCatSort]=useState("totalIngr");
  const [catDir,setCatDir]=useState("desc");
  const sortedCat=useMemo(()=>[...byCat].sort((a,b)=>{
    let cmp=0;
    if(catSort==="cat")cmp=a.cat.localeCompare(b.cat);
    else if(catSort==="conv")cmp=a.conv-b.conv;
    else cmp=(a[catSort]||0)-(b[catSort]||0);
    return catDir==="asc"?cmp:-cmp;
  }),[byCat,catSort,catDir]);
  const togCat=col=>{if(catSort===col)setCatDir(d=>d==="asc"?"desc":"asc");else{setCatSort(col);setCatDir("desc");}};
  const catChartData=byCat.slice(0,10).map(c=>({name:c.cat.length>14?c.cat.slice(0,13)+"…":c.cat,proj:Math.round(c.proj),mrr:Math.round(c.mrr),props:c.total}));

  // ── Datos por ejecutivo ──
  const byEjec=useMemo(()=>{
    const map={};
    propuestas.forEach(p=>{
      const ej=(p.ejecutivo||(clientes.find(c=>c.id===p.clienteId)?.ejecutivo)||"Sin asignar").trim()||"Sin asignar";
      if(!map[ej])map[ej]={name:ej,total:0,enviadas:0,aprobadas:0,rechazadas:0,proj:0,mrr:0,subsidio:0,tickets:[],paybacks:[],props:[]};
      map[ej].total++;
      if(["Enviada","Aprobada","Rechazada"].includes(p.estado))map[ej].enviadas++;
      if(p.estado==="Aprobada"){
        map[ej].aprobadas++;
        const r=calcProp(p,params);
        if(r){
          if(r.tieneProj){map[ej].proj+=r.vf;if(r.vf>0)map[ej].tickets.push(r.vf);}
          if(r.tieneSvc)map[ej].mrr+=r.iRec;
          map[ej].subsidio+=r.sub;
          if(isFinite(r.meses)&&r.meses>0)map[ej].paybacks.push(r.meses);
        }
      }
      if(p.estado==="Rechazada")map[ej].rechazadas++;
      map[ej].props.push(p);
    });
    return Object.values(map).map(e=>({
      ...e,
      conv:e.enviadas>0?e.aprobadas/e.enviadas:0,
      ticketProm:e.tickets.length>0?e.tickets.reduce((a,b)=>a+b,0)/e.tickets.length:0,
      paybackProm:e.paybacks.length>0?e.paybacks.reduce((a,b)=>a+b,0)/e.paybacks.length:0,
      totalIngr:e.proj+e.mrr*12,
    })).sort((a,b)=>b.totalIngr-a.totalIngr);
  },[propuestas,clientes,params]);

  const [ejSort,setEjSort]=useState("totalIngr");
  const [ejDir,setEjDir]=useState("desc");
  const sortedEjec=useMemo(()=>[...byEjec].sort((a,b)=>{const cmp=a[ejSort]-b[ejSort];return ejDir==="asc"?cmp:-cmp;}),[byEjec,ejSort,ejDir]);
  const togEj=col=>{if(ejSort===col)setEjDir(d=>d==="asc"?"desc":"asc");else{setEjSort(col);setEjDir("desc");}};
  const ejChartData=byEjec.slice(0,8).map(e=>({name:e.name.slice(0,12),proj:Math.round(e.proj),mrr:Math.round(e.mrr),conv:Math.round(e.conv*100)}));

  return <div>
    <div style={{display:"flex",gap:3,marginBottom:16,background:C.bg1,padding:3,borderRadius:6,border:"1px solid "+C.border,width:"fit-content",flexWrap:"wrap"}}>{[["general","Resumen general"],["ejecutivos","Por ejecutivo"],["categorias","Por categoría"],["cruzados","KPIs cruzados"]].map(([id,lbl])=><button key={id} onClick={()=>setMainTab(id)} style={{padding:"6px 18px",borderRadius:5,cursor:"pointer",fontSize:10,fontWeight:600,background:mainTab===id?C.blue:"transparent",color:mainTab===id?"#fff":C.textM,border:"none",fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{lbl}</button>)}</div>
    {mainTab==="ejecutivos"&&<EjecutivosTab C={C} byEjec={sortedEjec} ejChartData={ejChartData} togEj={togEj} ejSort={ejSort} ejDir={ejDir} params={params}/>}
    {mainTab==="categorias"&&<CategoriaTab C={C} sortedCat={sortedCat} catChartData={catChartData} togCat={togCat} catSort={catSort} catDir={catDir} params={params}/>}
    {mainTab==="cruzados"&&<KpisCruzadosTab C={C} clientes={clientes} propuestas={propuestas} proyectos={proyectos||[]} registrosHoras={registrosHoras||[]} params={params}/>}
    {mainTab==="general"&&<div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
      <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,padding:20,borderLeft:"3px solid "+C.green}}>
        <div style={{fontSize:9,color:C.green,textTransform:"uppercase",letterSpacing:"0.15em",fontFamily:ff,fontWeight:700,marginBottom:5}}>Ingresos recurrentes — aprobados</div>
        <div style={{fontSize:30,fontWeight:300,color:C.green,fontFamily:ff,marginBottom:2}}>{fmtCLP(mrrTotal)}<span style={{fontSize:12,color:C.textM}}>/mes</span></div>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:12}}>Proyección anual: <strong style={{color:C.textS}}>{fmtCLP(mrrTotal*12)}</strong></div>
        {[["Cámaras",mrrC,C.blue],["Video verif.",mrrV,C.purple],["Alarmas",mrrA,C.amber]].map(([l,v,c])=>{const p=mrrTotal>0?v/mrrTotal:0;return <div key={l} style={{marginBottom:7}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}><span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{l}</span><span style={{fontSize:11,color:c,fontFamily:ff}}>{fmtCLP(v)}/mes</span></div><div style={{height:4,background:C.border,borderRadius:2,overflow:"hidden"}}><div style={{height:"100%",background:c,width:(p*100).toFixed(1)+"%",borderRadius:2}}/></div></div>;})}
      </div>
      <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,padding:20,borderLeft:"3px solid "+C.blue}}>
        <div style={{fontSize:9,color:C.blue,textTransform:"uppercase",letterSpacing:"0.15em",fontFamily:ff,fontWeight:700,marginBottom:5}}>Proyectos aprobados</div>
        <div style={{fontSize:30,fontWeight:300,color:C.blue,fontFamily:ff,marginBottom:2}}>{fmtCLP(projTotal)}</div>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:12}}>{aCalc.filter(p=>p._c?.tieneProj).length} proyectos · {approved.length} aprobadas de {sent.length} enviadas</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
          <div style={{background:C.bg2,borderRadius:5,padding:"9px 10px"}}><div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:3}}>Conversión</div><div style={{fontSize:20,fontWeight:300,color:conv>0.5?C.green:conv>0.3?C.amber:C.red,fontFamily:ff}}>{(conv*100).toFixed(0)}%</div></div>
          <div style={{background:C.bg2,borderRadius:5,padding:"9px 10px"}}><div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:3}}>% Recurrente</div><div style={{fontSize:20,fontWeight:300,color:C.green,fontFamily:ff}}>{(recPct*100).toFixed(0)}%</div><div style={{fontSize:10,color:C.textM,fontFamily:ff}}>del total anual</div></div>
          <div style={{background:C.bg2,borderRadius:5,padding:"9px 10px"}}><div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:3}}>Subsidio total</div><div style={{fontSize:16,fontWeight:300,color:C.amber,fontFamily:ff}}>{fmtCLP(subTotal)}</div></div>
        </div>
      </div>
    </div>
    <Card C={C}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,flexWrap:"wrap"}}>
        <div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:ff}}>Ventas por período</div>
        <div style={{display:"flex",gap:5,marginLeft:"auto",alignItems:"center",flexWrap:"wrap"}}>
          {["Todos",...TIPOS_V].map(v=><button key={v} onClick={()=>setFT(v)} style={{padding:"3px 9px",borderRadius:20,fontSize:10,cursor:"pointer",border:"1px solid "+(fT===v?C.blue:C.border),background:fT===v?C.blue+"22":"transparent",color:fT===v?C.blue:C.textM,fontFamily:ff}}>{v}</button>)}
          <select value={fE} onChange={e=>setFE(e.target.value)} style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:5,color:C.text,padding:"4px 8px",fontSize:11,fontFamily:ff,outline:"none"}}>
            {["Todos",...ESTADOS].map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <input type="month" value={fromM} onChange={e=>setFrom(e.target.value)} style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:5,color:C.text,padding:"4px 7px",fontSize:11,fontFamily:ff,outline:"none"}}/>
          <span style={{color:C.textM,fontSize:11}}>—</span>
          <input type="month" value={toM} onChange={e=>setTo(e.target.value)} style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:5,color:C.text,padding:"4px 7px",fontSize:11,fontFamily:ff,outline:"none"}}/>
          <div style={{display:"flex",gap:1,background:C.bg2,padding:2,borderRadius:5,border:"1px solid "+C.border}}>
            {["chart","table"].map(v=><button key={v} onClick={()=>setView(v)} style={{padding:"3px 9px",borderRadius:4,cursor:"pointer",fontSize:10,background:view===v?C.blue:"transparent",color:view===v?"#fff":C.textM,border:"none",fontFamily:ff}}>{v==="chart"?"Gráfico":"Tabla"}</button>)}
          </div>
          <Btn C={C} variant="ghost" small onClick={exportCSV}>↓ CSV</Btn>
        </div>
      </div>
      {buckets.length>0&&<div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:7,marginBottom:12}}>
        <Stat C={C} label="Propuestas" value={""+kpis.count} small/>
        <Stat C={C} label="Proyecto" value={fmtCLP(kpis.proyecto)} color={C.blue} small/>
        <Stat C={C} label="Mon. anual" value={fmtCLP(kpis.monitoreoAnual)} color={C.green} small/>
        <Stat C={C} label="VV anual" value={fmtCLP(kpis.videoVerifAnual||0)} color={C.purple} small/>
        <Stat C={C} label="Alarm. anual" value={fmtCLP(kpis.alarmaAnual||0)} color={C.amber} small/>
        <Stat C={C} label="Subsidio" value={fmtCLP(kpis.subsidio)} color={C.red} small/>
        <Stat C={C} label="Total período" value={fmtCLP((kpis.proyecto||0)+(kpis.monitoreoAnual||0)+(kpis.videoVerifAnual||0)+(kpis.alarmaAnual||0))} color={C.green} small/>
      </div>}
      {view==="chart"&&(buckets.length>0?<ResponsiveContainer width="100%" height={230}><BarChart data={buckets} margin={{top:4,right:8,left:8,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="mes" tick={axT} axisLine={false} tickLine={false}/><YAxis tickFormatter={fmtMil} tick={axT} axisLine={false} tickLine={false} width={58}/><Tooltip content={<TT/>}/><Legend wrapperStyle={{fontSize:11,color:C.textM,fontFamily:ff}}/><Bar dataKey="proyecto" name="Proyecto" fill={C.blue} radius={[3,3,0,0]} maxBarSize={30}/><Bar dataKey="monitoreoAnual" name="Monitoreo" fill={C.green} radius={[3,3,0,0]} maxBarSize={30}/><Bar dataKey="videoVerifAnual" name="Video verif." fill={C.purple} radius={[3,3,0,0]} maxBarSize={30}/><Bar dataKey="alarmaAnual" name="Alarma" fill={C.amber} radius={[3,3,0,0]} maxBarSize={30}/></BarChart></ResponsiveContainer>:<Empty C={C} title="Sin datos" sub="Ajusta los filtros"/>)}
      {view==="table"&&(buckets.length>0?<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{borderBottom:"1px solid "+C.border,background:C.bg2}}>{["Mes","Prop.","Proyecto","Mon. anual","VV anual","Alarm. anual","Subsidio","Total"].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead><tbody>{buckets.map((m,i)=><tr key={m.key} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent"}}><td style={{...tdS,fontWeight:700,color:C.text}}>{m.mes}</td><td style={tdS}>{m.count}</td><td style={{...tdS,color:C.blue}}>{fmtCLP(m.proyecto)}</td><td style={{...tdS,color:C.green}}>{fmtCLP(m.monitoreoAnual)}</td><td style={{...tdS,color:C.purple}}>{fmtCLP(m.videoVerifAnual||0)}</td><td style={{...tdS,color:C.amber}}>{fmtCLP(m.alarmaAnual||0)}</td><td style={{...tdS,color:C.red}}>{fmtCLP(m.subsidio)}</td><td style={{...tdS,color:C.green,fontWeight:700}}>{fmtCLP((m.proyecto||0)+(m.monitoreoAnual||0)+(m.videoVerifAnual||0)+(m.alarmaAnual||0))}</td></tr>)}<tr style={{borderTop:"2px solid "+C.blue+"44",background:C.bg2,fontWeight:700}}><td style={{...tdS,color:C.blue}}>TOTAL</td><td style={tdS}>{kpis.count}</td><td style={{...tdS,color:C.blue}}>{fmtCLP(kpis.proyecto)}</td><td style={{...tdS,color:C.green}}>{fmtCLP(kpis.monitoreoAnual)}</td><td style={{...tdS,color:C.purple}}>{fmtCLP(kpis.videoVerifAnual||0)}</td><td style={{...tdS,color:C.amber}}>{fmtCLP(kpis.alarmaAnual||0)}</td><td style={{...tdS,color:C.red}}>{fmtCLP(kpis.subsidio)}</td><td style={{...tdS,color:C.green}}>{fmtCLP((kpis.proyecto||0)+(kpis.monitoreoAnual||0)+(kpis.videoVerifAnual||0)+(kpis.alarmaAnual||0))}</td></tr></tbody></table></div>:<Empty C={C} title="Sin datos" sub="Ajusta los filtros"/>)}
    </Card>
    <div style={{display:"grid",gridTemplateColumns:byC.length>0?"3fr 2fr":"1fr",gap:12}}>
      {byC.length>0&&<Card C={C} style={{marginBottom:0}}><STitle C={C}>Ingresos por cliente — aprobados</STitle><ResponsiveContainer width="100%" height={Math.max(130,byC.length*38)}><BarChart data={byC} layout="vertical" margin={{top:4,right:8,left:8,bottom:4}}><CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false}/><XAxis type="number" tickFormatter={fmtMil} tick={axT} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="name" tick={axT} axisLine={false} tickLine={false} width={96}/><Tooltip content={<TT/>}/><Legend wrapperStyle={{fontSize:11,color:C.textM,fontFamily:ff}}/><Bar dataKey="proj" name="Proyecto" fill={C.blue} radius={[0,3,3,0]} maxBarSize={18}/><Bar dataKey="mrr" name="MRR mensual" fill={C.green} radius={[0,3,3,0]} maxBarSize={18}/></BarChart></ResponsiveContainer></Card>}
      <Card C={C} style={{marginBottom:0}}><STitle C={C}>Pipeline por estado</STitle>{pipeD.map(d=><div key={d.state} style={{marginBottom:9}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:7,height:7,borderRadius:2,background:d.color}}/><span style={{fontSize:12,color:C.textS,fontFamily:ff}}>{d.state}</span></div><span style={{fontSize:13,fontWeight:600,color:d.color,fontFamily:ff}}>{d.count}</span></div><div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",background:d.color,width:(d.count/maxP*100)+"%",borderRadius:3}}/></div></div>)}{pipeD.length===0&&<div style={{color:C.textM,fontSize:12,fontFamily:ff}}>Sin datos.</div>}</Card>
    </div>
  </div>}
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROYECTOS EJECUTADOS — MÓDULO 1 ETAPA 2
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 2 — COSTOS REALES POR ÍTEMS
// ─────────────────────────────────────────────────────────────────────────────
const CATS_COSTO = ["Materiales","Mano de obra","Transporte y logística","Gastos variables"];
const CAT_COLORS = {"Materiales":"#3B82F6","Mano de obra":"#10B981","Transporte y logística":"#F59E0B","Gastos variables":"#8B5CF6"};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-tabs DENTRO del detalle de un Proyecto
// Filtran datos globales por proyectoId
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// PROYECTO EN TERRENO — Bandeja del operador + monitoreo (read-only)
// El operador NO crea evidencia, solo aprueba/escala lo que llega del técnico
// ─────────────────────────────────────────────────────────────────────────────
function AprobacionesOperativasView({C,proyectos,clientes,tecnicos,contratistas,materiales,registrosHoras,incidencias,onSaveProyecto,onSaveRegistroHora,onSaveBulkHoras,onSaveIncidencia,onSaveMaterial,readonly,onGoTab}){
  const [filtro,setFiltro]=useState("todos");
  const personal=[...(tecnicos||[]),...(contratistas||[]).map(c=>({...c,_cont:true}))];
  const horasPend=(registrosHoras||[]).filter(r=>r.estado==="pendiente"||!r.estado);
  const solicitudes=proyectos.flatMap(p=>(p.solicitudesMaterial||[]).filter(s=>["pendiente","aprobada"].includes(s.estado||"pendiente")).map(s=>({...s,proyecto:p})));
  const incidenciasCrit=(incidencias||[]).filter(i=>i.estado!=="Cerrada"&&i.estado!=="Resuelta"&&["Alta","Crítica"].includes(i.prioridad));
  const cierresPend=proyectos.filter(p=>{
    const ts=p.tareas||[];
    return ts.length>0&&ts.every(t=>t.estado==="Completada")&&!["Cerrado técnico","Cerrado técnicamente","Cerrado"].includes(p.estadoOp);
  });
  const allCount=horasPend.length+solicitudes.length+incidenciasCrit.length+cierresPend.length;
  const card={background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px"};
  const chip=(id,lbl,n,col=C.blue)=>{
    const on=filtro===id;
    return <button onClick={()=>setFiltro(id)} style={{padding:"6px 13px",borderRadius:20,border:"1px solid "+(on?col:C.border),background:on?col+"22":"transparent",color:on?col:C.textM,fontSize:11,fontWeight:on?700:500,cursor:"pointer",fontFamily:ff}}>{lbl} {n>0&&`(${n})`}</button>;
  };
  const aprobarHora=r=>{
    const upd=(registrosHoras||[]).map(x=>x.id===r.id?{...x,estado:"aprobado",aprobadoEl:new Date().toISOString()}:x);
    onSaveBulkHoras(upd);
  };
  const rechazarHora=r=>{
    const motivo=window.prompt("Motivo del rechazo","");
    const upd=(registrosHoras||[]).map(x=>x.id===r.id?{...x,estado:"rechazado",rechazadoEl:new Date().toISOString(),motivoRechazo:motivo||""}:x);
    onSaveBulkHoras(upd);
  };
  const cambiarSolicitud=(sol,estado)=>{
    const p=sol.proyecto;
    const fecha=new Date().toISOString();
    const prevEstado=sol.estado||"pendiente";
    if(prevEstado==="entregada"&&estado==="entregada")return;
    const sinStock=(sol.items||[]).filter(item=>{
      const mat=(materiales||[]).find(m=>m.id===item.materialId);
      return mat&&estado==="entregada"&&(mat.stockActual||0)<(item.cantidad||1);
    });
    if(sinStock.length&&estado==="entregada"&&!window.confirm("Hay materiales con stock insuficiente. ¿Registrar entrega igualmente?"))return;
    const sols=(p.solicitudesMaterial||[]).map(s=>s.id===sol.id?{...s,estado,fechaDecision:fecha,fechaEntrega:estado==="entregada"?fecha:s.fechaEntrega,fechaRechazo:estado==="rechazada"?fecha:s.fechaRechazo}:s);
    const costosEntrega=estado==="entregada"?(sol.items||[]).map(item=>{
      const mat=(materiales||[]).find(m=>m.id===item.materialId);
      const cant=item.cantidad||1;
      const pu=mat?.precioUnitario||item.precioUnitario||0;
      if(mat&&onSaveMaterial&&prevEstado!=="entregada")onSaveMaterial({...mat,stockActual:Math.max(0,(mat.stockActual||0)-cant),updatedAt:fecha});
      if(!pu)return null;
      return{id:newId(),cat:"Materiales",tipo:"Materiales",desc:`${mat?.nombre||item.descripcion||item.nombre||"Material"} × ${cant}`,cant,precioUnit:pu,total:cant*pu,fecha:fecha.slice(0,10),materialId:mat?.id,solicitudId:sol.id,autoMat:true,origen:"solicitud_material"};
    }).filter(Boolean):[];
    const timeline=[...(p.timeline||[]),{fecha,tipo:"material",desc:`Solicitud de material ${estado}${costosEntrega.length?` · ${costosEntrega.length} costo(s) imputado(s)`:""}`}];
    const costosBase=(p.costos||[]).filter(c=>c.solicitudId!==sol.id);
    onSaveProyecto({...p,solicitudesMaterial:sols,costos:estado==="entregada"?[...costosBase,...costosEntrega]:(p.costos||[]),timeline,updatedAt:fecha});
  };
  const cerrarProyecto=p=>{
    const aprobacion={id:newId(),tipo:"cierre_tecnico",estado:"aprobado",fecha:new Date().toISOString(),origen:"bandeja_operativa"};
    const updated={...p,estadoOp:"Cerrado técnicamente",fechaCierreTec:new Date().toISOString().slice(0,10),cierreAprobadoEl:new Date().toISOString(),aprobaciones:[...(p.aprobaciones||[]),aprobacion],timeline:[...(p.timeline||[]),{fecha:new Date().toISOString(),tipo:"cierre",desc:"Cierre técnico aprobado desde bandeja operativa"}],updatedAt:new Date().toISOString()};
    onSaveProyecto(updated);
  };
  const seccionVisible=id=>filtro==="todos"||filtro===id;

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:16,flexWrap:"wrap"}}>
      <div>
        <h2 style={{margin:0,fontSize:20,fontWeight:600,color:C.text,fontFamily:ff}}>Aprobaciones operativas</h2>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>Horas, materiales, incidencias críticas y cierres técnicos pendientes.</div>
      </div>
      {onGoTab&&<Btn C={C} ghost small onClick={()=>onGoTab("proyectos")}>Abrir proyectos</Btn>}
    </div>

    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
      {[
        ["Pendientes",allCount,allCount>0?C.amber:C.green],
        ["Horas",horasPend.length,horasPend.length>0?C.amber:C.green],
        ["Materiales",solicitudes.length,solicitudes.length>0?C.blue:C.green],
        ["Incidencias",incidenciasCrit.length,incidenciasCrit.length>0?C.red:C.green],
        ["Cierres",cierresPend.length,cierresPend.length>0?C.purple:C.green],
      ].map(([l,v,col])=><div key={l} style={card}>
        <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600}}>{l}</div>
        <div style={{fontSize:22,fontWeight:700,color:col,fontFamily:ff,marginTop:4}}>{v}</div>
      </div>)}
    </div>

    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {chip("todos","Todo",allCount,C.textS)}
      {chip("horas","Horas",horasPend.length,C.amber)}
      {chip("materiales","Materiales",solicitudes.length,C.blue)}
      {chip("incidencias","Incidencias",incidenciasCrit.length,C.red)}
      {chip("cierres","Cierres",cierresPend.length,C.purple)}
    </div>

    {allCount===0&&<EmptyState C={C} icon="✓" title="Todo al día" sub="No hay aprobaciones operativas pendientes."/>}

    {seccionVisible("horas")&&horasPend.length>0&&<div style={{...card,marginBottom:14}}>
      <STitle C={C}>Horas por aprobar</STitle>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {horasPend.map(r=>{
          const p=proyectos.find(x=>x.id===r.proyectoId);
          const per=personal.find(x=>x.id===r.personalId||x.id===r.tecnicoId);
          return <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",background:C.bg2,border:"1px solid "+C.border,borderRadius:6}}>
            <Bdg color={C.amber} small>{r.horas||0}h</Bdg>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{per?.nombre||r.nombrePersonal||"Sin persona"} · {p?.nombre||"Sin proyecto"}</div>
              <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{r.fecha||"—"} · {r.tipoHoraId||"normal"} {r.notas?`· ${r.notas}`:""}</div>
            </div>
            {!readonly&&<><Btn C={C} ghost small color={C.green} onClick={()=>aprobarHora(r)}>Aprobar</Btn><Btn C={C} ghost small color={C.red} onClick={()=>rechazarHora(r)}>Rechazar</Btn></>}
          </div>;
        })}
      </div>
    </div>}

    {seccionVisible("materiales")&&solicitudes.length>0&&<div style={{...card,marginBottom:14}}>
      <STitle C={C}>Solicitudes de material</STitle>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {solicitudes.map(s=><div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",background:C.bg2,border:"1px solid "+C.border,borderRadius:6}}>
          <Bdg color={(s.estado||"pendiente")==="aprobada"?C.blue:C.amber} small>{s.estado||"pendiente"}</Bdg>
          <div style={{flex:1,minWidth:0}}>
            <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{s.proyecto?.nombre||"Proyecto"} · {s.tecnicoNombre||"Técnico"}</div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{(s.items||[]).map(i=>{const m=(materiales||[]).find(x=>x.id===i.materialId);const bajo=m&&(m.stockActual||0)<(i.cantidad||1);return `${m?.nombre||i.nombre||i.descripcion||"Material"} ${i.cantidad||""}${m?.unidad||i.unidad||""}${bajo?" (stock bajo)":""}`;}).join(" · ")||s.descripcion||"Solicitud sin detalle"}</div>
          </div>
          {!readonly&&<><Btn C={C} ghost small color={C.blue} onClick={()=>cambiarSolicitud(s,"aprobada")}>Aprobar</Btn><Btn C={C} ghost small color={C.green} onClick={()=>cambiarSolicitud(s,"entregada")}>Entregar</Btn><Btn C={C} ghost small color={C.red} onClick={()=>cambiarSolicitud(s,"rechazada")}>Rechazar</Btn></>}
        </div>)}
      </div>
    </div>}

    {seccionVisible("incidencias")&&incidenciasCrit.length>0&&<div style={{...card,marginBottom:14}}>
      <STitle C={C}>Incidencias críticas</STitle>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {incidenciasCrit.map(i=>{
          const p=proyectos.find(x=>x.id===i.proyectoId);
          const col=i.prioridad==="Crítica"?C.purple:C.red;
          return <div key={i.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",background:C.bg2,border:"1px solid "+col+"44",borderRadius:6}}>
            <Bdg color={col} small>{i.prioridad}</Bdg>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{i.titulo||"Incidencia"} · {p?.nombre||"Sin proyecto"}</div>
              <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{i.estado||"Abierta"} · {i.descripcion||"Sin descripción"}</div>
            </div>
            {!readonly&&<Btn C={C} ghost small color={C.green} onClick={()=>onSaveIncidencia({...i,estado:"Resuelta",fechaCierre:new Date().toISOString().slice(0,10)})}>Marcar resuelta</Btn>}
          </div>;
        })}
      </div>
    </div>}

    {seccionVisible("cierres")&&cierresPend.length>0&&<div style={{...card,marginBottom:14}}>
      <STitle C={C}>Cierres técnicos pendientes</STitle>
      <div style={{display:"flex",flexDirection:"column",gap:7}}>
        {cierresPend.map(p=>{
          const cl=clientes.find(c=>c.id===p.clienteId);
          const checklist=p.cierreTecnico?.checklist||p.checklistCierre||[];
          const done=checklist.filter(x=>x.ok).length;
          return <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 11px",background:C.bg2,border:"1px solid "+C.border,borderRadius:6}}>
            <Bdg color={C.purple} small>Listo</Bdg>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{p.nombre} · {cl?.razonSocial||"Sin cliente"}</div>
              <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{(p.tareas||[]).length} tareas completadas · {checklist.length?`checklist ${done}/${checklist.length}`:"sin checklist registrado"} · pendiente cierre técnico</div>
            </div>
            {!readonly&&<Btn C={C} ghost small color={C.green} onClick={()=>cerrarProyecto(p)}>Aprobar cierre</Btn>}
          </div>;
        })}
      </div>
    </div>}
  </div>;
}

function SupervisorView({C,proyectos,clientes,tecnicos,contratistas,registrosHoras,incidencias,fichajes=[],onGoTab}){
  const personal=[...(tecnicos||[]),...(contratistas||[]).map(c=>({...c,_cont:true}))];
  const activos=proyectos.filter(p=>!["Cerrado","Cerrado técnico","Cerrado técnicamente"].includes(p.estadoOp));
  const horasPend=(registrosHoras||[]).filter(r=>r.estado==="pendiente"||!r.estado);
  const incActivas=(incidencias||[]).filter(i=>!["Cerrada","Resuelta"].includes(i.estado));
  const hoy=new Date().toISOString().slice(0,10);
  const atrasados=activos.filter(p=>p.fechaTermino&&p.fechaTermino<hoy);
  const solPend=proyectos.flatMap(p=>(p.solicitudesMaterial||[]).filter(s=>["pendiente","aprobada"].includes(s.estado||"pendiente")).map(s=>({...s,proyecto:p})));
  const cierres=proyectos.filter(p=>{const ts=p.tareas||[];return ts.length>0&&ts.every(t=>t.estado==="Completada")&&!["Cerrado","Cerrado técnico","Cerrado técnicamente"].includes(p.estadoOp);});
  const fichajesActivos=(fichajes||[]).filter(f=>f.estado==="activo");
  const card={background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px"};
  const pctProyecto=p=>{const ts=p.tareas||[];return ts.length?Math.round(ts.filter(t=>t.estado==="Completada").length/ts.length*100):0;};
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:16,flexWrap:"wrap"}}>
      <div>
        <h2 style={{margin:0,fontSize:20,fontWeight:600,color:C.text,fontFamily:ff}}>Vista supervisor</h2>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>Control de avance, equipo, evidencias e incidencias en terreno.</div>
      </div>
      {onGoTab&&<Btn C={C} ghost small onClick={()=>onGoTab("aprobaciones")}>Ver aprobaciones</Btn>}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
      {[
        ["Proyectos activos",activos.length,C.blue],
        ["Equipo activo",fichajesActivos.length,fichajesActivos.length?C.green:C.textM],
        ["Atrasados",atrasados.length,atrasados.length?C.red:C.green],
        ["Solicitudes",solPend.length,solPend.length?C.amber:C.green],
        ["Cierres listos",cierres.length,cierres.length?C.purple:C.green],
      ].map(([l,v,col])=><div key={l} style={card}><div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600}}>{l}</div><div style={{fontSize:22,fontWeight:700,color:col,fontFamily:ff,marginTop:4}}>{v}</div></div>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
      <div style={card}>
        <STitle C={C}>Proyectos en terreno</STitle>
        {activos.length===0?<EmptyState C={C} icon="✓" title="Sin proyectos activos" sub="No hay proyectos operativos abiertos."/>:<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {activos.map(p=>{
            const cl=clientes.find(c=>c.id===p.clienteId);
            const pct=pctProyecto(p);
            const incs=incActivas.filter(i=>i.proyectoId===p.id);
            const fotos=(p.fotos||[]).length;
            const vencido=p.fechaTermino&&p.fechaTermino<hoy;
            const solicitudes=solPend.filter(s=>s.proyecto?.id===p.id).length;
            return <div key={p.id} style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:7,padding:"10px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:8}}>
                <div style={{minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.nombre}</div>
                  <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{p.numero||p.codigo||"—"} · {cl?.razonSocial||"Sin cliente"} · {fotos} foto{fotos!==1?"s":""} · término {p.fechaTermino||"s/f"}</div>
                </div>
                <Bdg color={pct===100?C.green:pct>=50?C.blue:C.amber} small>{pct}%</Bdg>
              </div>
              <div style={{height:5,background:C.border,borderRadius:3,overflow:"hidden",marginBottom:6}}><div style={{height:"100%",width:pct+"%",background:pct===100?C.green:C.blue}}/></div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {vencido&&<span style={{fontSize:11,color:C.red,fontFamily:ff,fontWeight:700}}>Atrasado</span>}
                {solicitudes>0&&<span style={{fontSize:11,color:C.amber,fontFamily:ff,fontWeight:700}}>{solicitudes} solicitud(es) material</span>}
              </div>
              {incs.length>0&&<div style={{fontSize:11,color:C.red,fontFamily:ff}}>{incs.length} incidencia{incs.length!==1?"s":""} activa{incs.length!==1?"s":""}</div>}
            </div>;
          })}
        </div>}
      </div>
      <div style={card}>
        <STitle C={C}>Equipo</STitle>
        {personal.filter(p=>p.activo!==false).slice(0,10).map(p=>{
          const f=fichajesActivos.find(x=>x.tecnicoId===p.id);
          const proy=f?proyectos.find(x=>x.id===f.proyectoId):null;
          return <div key={p.id} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 0",borderBottom:"1px solid "+C.border}}>
            <div style={{width:8,height:8,borderRadius:4,background:f?C.green:C.textM}}/>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.nombre}{p._cont?" (C)":""}</div>
              <div style={{fontSize:10,color:C.textM,fontFamily:ff,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f?proy?.nombre||"En proyecto":"Sin fichaje activo"}</div>
            </div>
          </div>;
        })}
        {(horasPend.length>0||incActivas.length>0)&&<div style={{marginTop:12,paddingTop:10,borderTop:"1px solid "+C.border}}>
          {horasPend.length>0&&<button onClick={()=>onGoTab&&onGoTab("aprobaciones")} style={{width:"100%",background:C.amber+"14",border:"1px solid "+C.amber+"44",borderRadius:8,padding:"9px 10px",fontSize:12,color:C.amber,fontWeight:800,fontFamily:ff,cursor:"pointer",marginBottom:7}}>Horas por aprobar: {horasPend.length}</button>}
          {incActivas.length>0&&<button onClick={()=>onGoTab&&onGoTab("incidencias")} style={{width:"100%",background:C.red+"12",border:"1px solid "+C.red+"44",borderRadius:8,padding:"9px 10px",fontSize:12,color:C.red,fontWeight:800,fontFamily:ff,cursor:"pointer"}}>Incidencias activas: {incActivas.length}</button>}
        </div>}
      </div>
    </div>
  </div>;
}

function AlmacenView({C,proyectos,materiales,onSaveProyecto,onSaveMaterial,readonly}){
  const [filtro,setFiltro]=useState("pendientes");
  const solicitudes=proyectos.flatMap(p=>(p.solicitudesMaterial||[]).map(s=>({...s,proyecto:p})));
  const visibles=solicitudes.filter(s=>filtro==="todas"||(s.estado||"pendiente")===filtro);
  const stockBajo=(materiales||[]).filter(m=>(m.stockActual||0)<=(m.stockMinimo||0));
  const valorPendiente=solicitudes.filter(s=>["pendiente","aprobada"].includes(s.estado||"pendiente")).reduce((sum,sol)=>sum+(sol.items||[]).reduce((s,item)=>{
    const mat=(materiales||[]).find(m=>m.id===item.materialId);
    return s+(item.cantidad||1)*(mat?.precioUnitario||item.precioUnitario||0);
  },0),0);
  const card={background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px"};
  const cambiar=(sol,estado)=>{
    const p=sol.proyecto;
    const fecha=new Date().toISOString();
    const prevEstado=sol.estado||"pendiente";
    if(prevEstado==="entregada"&&estado==="entregada")return;
    const sinStock=(sol.items||[]).filter(item=>{
      const mat=(materiales||[]).find(m=>m.id===item.materialId);
      return mat&&estado==="entregada"&&(mat.stockActual||0)<(item.cantidad||1);
    });
    if(sinStock.length&&estado==="entregada"&&!window.confirm("Hay materiales con stock insuficiente. ¿Registrar entrega igualmente?"))return;
    const sols=(p.solicitudesMaterial||[]).map(s=>s.id===sol.id?{...s,estado,fechaAlmacen:fecha,fechaEntrega:estado==="entregada"?fecha:s.fechaEntrega,fechaRechazo:estado==="rechazada"?fecha:s.fechaRechazo}:s);
    const costos=estado==="entregada"?(sol.items||[]).map(item=>{
      const mat=(materiales||[]).find(m=>m.id===item.materialId);
      const cant=item.cantidad||1;
      if(mat&&onSaveMaterial&&prevEstado!=="entregada")onSaveMaterial({...mat,stockActual:Math.max(0,(mat.stockActual||0)-cant),updatedAt:fecha});
      const pu=mat?.precioUnitario||item.precioUnitario||0;
      return pu?{id:newId(),cat:"Materiales",tipo:"Materiales",desc:`${mat?.nombre||item.descripcion||"Material"} × ${cant}`,cant,precioUnit:pu,total:cant*pu,fecha:fecha.slice(0,10),materialId:mat?.id,solicitudId:sol.id,autoMat:true,origen:"almacen"}:null;
    }).filter(Boolean):[];
    const costosBase=(p.costos||[]).filter(c=>c.solicitudId!==sol.id);
    onSaveProyecto({...p,solicitudesMaterial:sols,costos:estado==="entregada"?[...costosBase,...costos]:(p.costos||[]),timeline:[...(p.timeline||[]),{fecha,tipo:"material",desc:`Almacén marcó solicitud como ${estado}${sinStock.length?" con stock insuficiente":""}`}],updatedAt:fecha});
  };
  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:16,flexWrap:"wrap"}}>
      <div>
        <h2 style={{margin:0,fontSize:20,fontWeight:600,color:C.text,fontFamily:ff}}>Vista almacén</h2>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>Solicitudes, entregas y stock crítico.</div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
      {[
        ["Solicitudes pendientes",solicitudes.filter(s=>(s.estado||"pendiente")==="pendiente").length,C.amber],
        ["Aprobadas",solicitudes.filter(s=>s.estado==="aprobada").length,C.blue],
        ["Entregadas",solicitudes.filter(s=>s.estado==="entregada").length,C.green],
        ["Valor pendiente",valorPendiente?`$${Math.round(valorPendiente/1000)}K`:"$0",valorPendiente?C.amber:C.green],
      ].map(([l,v,col])=><div key={l} style={card}><div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600}}>{l}</div><div style={{fontSize:String(v).length>5?17:22,fontWeight:700,color:col,fontFamily:ff,marginTop:4}}>{v}</div></div>)}
    </div>
    <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:14}}>
      {["pendiente","aprobada","entregada","rechazada","todas"].map(id=><button key={id} onClick={()=>setFiltro(id)} style={{padding:"6px 13px",borderRadius:20,border:"1px solid "+(filtro===id?C.blue:C.border),background:filtro===id?C.blue+"22":"transparent",color:filtro===id?C.blue:C.textM,fontSize:11,fontWeight:filtro===id?700:500,cursor:"pointer",fontFamily:ff,textTransform:"capitalize"}}>{id}</button>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
      <div style={card}>
        <STitle C={C}>Solicitudes de material</STitle>
        {visibles.length===0?<EmptyState C={C} icon="✓" title="Sin solicitudes" sub="No hay solicitudes con este filtro."/>:<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {visibles.map(s=><div key={s.id} style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:7,padding:"10px 12px"}}>
            <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff}}>{s.proyecto?.nombre||"Proyecto"} · {s.tecnicoNombre||"Técnico"}</div>
                <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:3}}>{(s.items||[]).map(i=>{const m=(materiales||[]).find(x=>x.id===i.materialId);const bajo=m&&(m.stockActual||0)<(i.cantidad||1);return `${m?.nombre||i.descripcion||i.nombre||"Material"} ${i.cantidad||""}${m?.unidad||i.unidad||""}${bajo?" · stock insuficiente":""}`;}).join(" · ")||"Sin detalle"}</div>
                {s.notaTecnico&&<div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:4}}>Nota: {s.notaTecnico}</div>}
              </div>
              <Bdg color={(s.estado||"pendiente")==="entregada"?C.green:(s.estado||"pendiente")==="rechazada"?C.red:C.amber} small>{s.estado||"pendiente"}</Bdg>
            </div>
            {!readonly&&<div style={{display:"flex",gap:6,marginTop:10,flexWrap:"wrap"}}>
              <Btn C={C} ghost small color={C.blue} onClick={()=>cambiar(s,"aprobada")}>Aprobar</Btn>
              <Btn C={C} ghost small color={C.green} onClick={()=>cambiar(s,"entregada")}>Entregar</Btn>
              <Btn C={C} ghost small color={C.red} onClick={()=>cambiar(s,"rechazada")}>Rechazar</Btn>
            </div>}
          </div>)}
        </div>}
      </div>
      <div style={card}>
        <STitle C={C}>Stock bajo</STitle>
        {stockBajo.length===0?<div style={{fontSize:12,color:C.green,fontFamily:ff}}>Stock sin alertas críticas.</div>:stockBajo.slice(0,12).map(m=><div key={m.id} style={{padding:"8px 0",borderBottom:"1px solid "+C.border}}>
          <div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:ff}}>{m.nombre}</div>
          <div style={{fontSize:11,color:C.red,fontFamily:ff}}>Stock {m.stockActual||0} · mínimo {m.stockMinimo||0}</div>
          <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>Sugerido reponer: {Math.max(0,(m.stockMinimo||0)-(m.stockActual||0)+1)} {m.unidad||"u"}</div>
        </div>)}
      </div>
    </div>
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// FINANZAS (FASE A)
// ─────────────────────────────────────────────────────────────────────────────
function PersonalView({C,tecnicos,contratistas,params,proyectos,onSaveTecnico,onDeleteTecnico,onSaveContratista,onDeleteContratista,readonly}){
  const [subTab,setSubTab]=useState("tecnicos");
  const [modal,setModal]=useState(null); // null | {tipo:"tec"|"con", data:obj}
  const [confId,setConfId]=useState(null);

  const roles=params?.rolesTecnicos||ROLES_TEC_DEF;

  // Stats técnicos
  const tecActivos=tecnicos.filter(t=>t.activo!==false);
  const tecOcupados=tecnicos.filter(t=>{
    const ahora=new Date().toISOString().slice(0,10);
    return proyectos.some(p=>
      p.tecnicosAsignados?.some(ta=>ta.tecnicoId===t.id) &&
      p.estadoOp==="En ejecución"
    );
  });

  return <div>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text,fontFamily:ff}}>Personal operativo</h2>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>
          {tecActivos.length} técnicos · {contratistas.filter(c=>c.activo!==false).length} contratistas
        </div>
      </div>
      {!readonly&&<Btn C={C} onClick={()=>setModal({tipo:subTab==="tecnicos"?"tec":"con",data:null})}>
        + {subTab==="tecnicos"?"Nuevo técnico":"Nuevo contratista"}
      </Btn>}
    </div>

    {/* KPIs técnicos */}
    {subTab==="tecnicos"&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
      {[
        {label:"Total técnicos",val:tecnicos.length,color:C.blue},
        {label:"Activos",val:tecActivos.length,color:C.green},
        {label:"En campo hoy",val:tecOcupados.length,color:C.amber},
        {label:"Contratistas",val:contratistas.length,color:"#7C3AED"},
      ].map(k=><div key={k.label} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"12px 16px"}}>
        <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.label}</div>
        <div style={{fontSize:26,fontWeight:700,color:k.color,fontFamily:ff,marginTop:4}}>{k.val}</div>
      </div>)}
    </div>}

    {/* Sub-tabs */}
    <div style={{display:"flex",gap:3,marginBottom:16,background:C.bg1,padding:3,borderRadius:6,border:"1px solid "+C.border,width:"fit-content"}}>
      {[["tecnicos","Técnicos propios"],["contratistas","Contratistas"]].map(([id,lbl])=>
        <button key={id} onClick={()=>setSubTab(id)}
          style={{padding:"6px 18px",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:600,
            background:subTab===id?C.blue:"transparent",color:subTab===id?"#fff":C.textM,
            border:"none",fontFamily:ff}}>
          {lbl}
        </button>
      )}
    </div>

    {/* ── LISTA TÉCNICOS ── */}
    {subTab==="tecnicos"&&<div>
      {tecnicos.length===0
        ?<EmptyState C={C} icon="👷" title="Sin técnicos registrados"
            sub="Agrega técnicos para asignarlos a proyectos y calcular costos de mano de obra automáticamente."
            action={!readonly&&<Btn C={C} onClick={()=>setModal({tipo:"tec",data:null})}>+ Agregar primer técnico</Btn>}/>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
          {tecnicos.map(t=>{
            const rol=roles.find(r=>r.id===t.rolId)||{nombre:"Sin rol",costoHora:0};
            const proyActivos=proyectos.filter(p=>p.tecnicosAsignados?.some(ta=>ta.tecnicoId===t.id)&&p.estadoOp==="En ejecución");
            const avatarColor=t.color||COLORES_TEC[tecnicos.indexOf(t)%COLORES_TEC.length];
            return <div key={t.id} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:10,overflow:"hidden"}}>
              {/* Franja color */}
              <div style={{height:4,background:avatarColor}}/>
              <div style={{padding:"14px 16px"}}>
                {/* Header tarjeta */}
                <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:12}}>
                  <div style={{width:42,height:42,borderRadius:21,background:avatarColor,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:"#fff",flexShrink:0}}>
                    {t.iniciales||(t.nombre||"?").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase()}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:ff,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.nombre}</div>
                    <div style={{fontSize:11,color:C.blue,fontFamily:ff,fontWeight:600}}>{rol.nombre}</div>
                    <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{t.email||"Sin email"}</div>
                  </div>
                  <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                    <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,background:t.activo!==false?C.green+"22":C.red+"22",color:t.activo!==false?C.green:C.red,fontFamily:ff,textTransform:"uppercase"}}>
                      {t.activo!==false?"Activo":"Inactivo"}
                    </span>
                    {proyActivos.length>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,background:C.amber+"22",color:C.amber,fontFamily:ff}}>En campo</span>}
                  </div>
                </div>
                {/* Costo y especialidades */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12,padding:"10px 12px",background:C.bg2,borderRadius:6,border:"1px solid "+C.border}}>
                  <div>
                    <div style={{fontSize:9,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.05em"}}>Costo / hora</div>
                    <div style={{fontSize:16,fontWeight:700,color:C.blue,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>${(t.costoHora||rol.costoHora||0).toLocaleString("es-CL")}</div>
                  </div>
                  <div>
                    <div style={{fontSize:9,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.05em"}}>Jornada</div>
                    <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:ff}}>{t.horasSemana||params?.jornadaSemanalHoras||42}h/sem</div>
                  </div>
                </div>
                {/* Especialidades */}
                {(t.especialidades||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:12}}>
                  {t.especialidades.map(e=><span key={e} style={{fontSize:10,padding:"2px 8px",borderRadius:12,background:C.blue+"15",color:C.blue,fontFamily:ff,fontWeight:500}}>{e}</span>)}
                </div>}
                {/* Proyectos activos */}
                {proyActivos.length>0&&<div style={{marginBottom:10}}>
                  <div style={{fontSize:9,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Proyecto activo</div>
                  {proyActivos.slice(0,2).map(p=><div key={p.id} style={{fontSize:11,color:C.text,fontFamily:ff,padding:"4px 0",borderBottom:"1px solid "+C.border}}>
                    <span style={{fontFamily:"monospace",color:C.blue,marginRight:6}}>{p.codigo}</span>{p.nombre}
                  </div>)}
                </div>}
                {/* Acciones */}
                {!readonly&&<div style={{display:"flex",gap:6,marginTop:4}}>
                  <Btn C={C} ghost small style={{flex:1}} onClick={()=>setModal({tipo:"tec",data:t})}>✏ Editar</Btn>
                  {confId===t.id
                    ?<><Btn C={C} small color={C.red} onClick={()=>{onDeleteTecnico(t.id);setConfId(null);}}>✓ Confirmar</Btn>
                       <Btn C={C} ghost small onClick={()=>setConfId(null)}>✕</Btn></>
                    :<Btn C={C} ghost small color={C.red} onClick={()=>setConfId(t.id)}>🗑</Btn>
                  }
                </div>}
              </div>
            </div>;
          })}
        </div>
      }
    </div>}

    {/* ── LISTA CONTRATISTAS ── */}
    {subTab==="contratistas"&&<div>
      {contratistas.length===0
        ?<EmptyState C={C} icon="🏢" title="Sin contratistas registrados"
            sub="Agrega empresas o personas contratistas con sus tarifas para incluirlos en proyectos."
            action={!readonly&&<Btn C={C} onClick={()=>setModal({tipo:"con",data:null})}>+ Agregar primer contratista</Btn>}/>
        :<div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:ff}}>
            <thead>
              <tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
                {["Nombre / Empresa","RUT","Servicio","Tarifa","Tipo tarifa","Estado",""].map(h=>
                  <th key={h} style={{padding:"9px 14px",textAlign:"left",fontSize:10,color:C.textM,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.06em"}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {contratistas.map((c,i)=><tr key={c.id} style={{borderBottom:"1px solid "+C.border,background:i%2===0?C.bg1:C.bg2}}>
                <td style={{padding:"10px 14px"}}>
                  <div style={{fontWeight:600,color:C.text}}>{c.nombre}</div>
                  {c.contacto&&<div style={{fontSize:11,color:C.textM}}>{c.contacto}</div>}
                </td>
                <td style={{padding:"10px 14px",fontFamily:"monospace",fontSize:12,color:C.textM}}>{c.rut||"—"}</td>
                <td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                    {(c.servicios||[]).map(s=><span key={s} style={{fontSize:10,padding:"2px 7px",borderRadius:10,background:C.blue+"15",color:C.blue}}>{s}</span>)}
                    {(!c.servicios||c.servicios.length===0)&&<span style={{color:C.textM}}>—</span>}
                  </div>
                </td>
                <td style={{padding:"10px 14px",fontWeight:700,color:C.blue,fontVariantNumeric:"tabular-nums"}}>
                  ${(c.tarifa||0).toLocaleString("es-CL")}
                </td>
                <td style={{padding:"10px 14px",fontSize:11,color:C.textM}}>
                  {c.tipoTarifa==="hora"?"por hora":c.tipoTarifa==="dia"?"por día":c.tipoTarifa==="proyecto"?"por proyecto":"—"}
                </td>
                <td style={{padding:"10px 14px"}}>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,background:c.activo!==false?C.green+"22":C.red+"22",color:c.activo!==false?C.green:C.red,textTransform:"uppercase"}}>
                    {c.activo!==false?"Activo":"Inactivo"}
                  </span>
                </td>
                <td style={{padding:"10px 14px"}}>
                  {!readonly&&<div style={{display:"flex",gap:5}}>
                    <Btn C={C} ghost small onClick={()=>setModal({tipo:"con",data:c})}>✏</Btn>
                    {confId===c.id
                      ?<><Btn C={C} small color={C.red} onClick={()=>{onDeleteContratista(c.id);setConfId(null);}}>✓</Btn>
                         <Btn C={C} ghost small onClick={()=>setConfId(null)}>✕</Btn></>
                      :<Btn C={C} ghost small color={C.red} onClick={()=>setConfId(c.id)}>🗑</Btn>
                    }
                  </div>}
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>
      }
    </div>}

    {/* ── MODAL TÉCNICO ── */}
    {modal?.tipo==="tec"&&<ModalTecnico C={C} tec={modal.data} params={params} roles={roles}
      onClose={()=>setModal(null)}
      onSave={t=>{onSaveTecnico(t);setModal(null);}}/>}

    {/* ── MODAL CONTRATISTA ── */}
    {modal?.tipo==="con"&&<ModalContratista C={C} con={modal.data}
      onClose={()=>setModal(null)}
      onSave={c=>{onSaveContratista(c);setModal(null);}}/>}
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL TÉCNICO
// ─────────────────────────────────────────────────────────────────────────────
function ModalTecnico({C,tec,params,roles,onClose,onSave}){
  const isEdit=!!tec?.id;
  const [form,setForm]=useState(tec||{activo:true,especialidades:[],costoHoraPersonalizado:false});
  const [saved,setSaved]=useState(false);
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));

  const rolSeleccionado=roles.find(r=>r.id===form.rolId)||null;
  const costoHoraEfectivo=form.costoHoraPersonalizado?form.costoHora:(rolSeleccionado?.costoHora||0);

  const toggleEsp=e=>{
    const curr=form.especialidades||[];
    sf("especialidades",curr.includes(e)?curr.filter(x=>x!==e):[...curr,e]);
  };

  const guardar=()=>{
    if(!form.nombre?.trim())return;
    const ahora=new Date().toISOString();
    const iniciales=(form.nombre||"").split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    onSave({
      ...form,
      id:form.id||newId(),
      iniciales,
      costoHora:costoHoraEfectivo,
      horasSemana:form.horasSemana||params?.jornadaSemanalHoras||42,
      color:form.color||COLORES_TEC[Math.floor(Math.random()*COLORES_TEC.length)],
      createdAt:form.createdAt||ahora,
      updatedAt:ahora,
    });
  };

  return <Modal C={C} title={isEdit?"Editar técnico":"Nuevo técnico"} onClose={onClose} width={560}>
    <G cols={2}>
      <Fld C={C} label="Nombre completo *">
        <Inp C={C} value={form.nombre||""} onChange={v=>sf("nombre",v)} placeholder="Ej: Juan Pérez García"/>
      </Fld>
      <Fld C={C} label="RUT">
        <Inp C={C} value={form.rut||""} onChange={v=>sf("rut",v)} placeholder="12.345.678-9"/>
      </Fld>
      <Fld C={C} label="Email">
        <Inp C={C} value={form.email||""} onChange={v=>sf("email",v)} placeholder="juan@empresa.cl"/>
      </Fld>
      <Fld C={C} label="Teléfono">
        <Inp C={C} value={form.telefono||""} onChange={v=>sf("telefono",v)} placeholder="+56 9 1234 5678"/>
      </Fld>
    </G>

    <Fld C={C} label="Rol / categoría">
      <SelBusca C={C} value={form.rolId||""} onChange={v=>sf("rolId",v)}
        opts={[{value:"",label:"— Seleccionar rol —"},...roles.filter(r=>r.activo!==false).map(r=>({value:r.id,label:`${r.nombre} — $${r.costoHora.toLocaleString("es-CL")}/h`}))]}/>
    </Fld>

    {/* Costo por hora */}
    <div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:6,padding:"12px 14px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
        <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>Costo por hora</div>
        <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:11,color:C.textM,fontFamily:ff}}>
          <input type="checkbox" checked={!!form.costoHoraPersonalizado} onChange={e=>sf("costoHoraPersonalizado",e.target.checked)} style={{accentColor:C.blue}}/>
          Personalizar (override de rol)
        </label>
      </div>
      {form.costoHoraPersonalizado
        ?<Fld C={C} label="Costo personalizado" prefix="$">
           <Inp C={C} value={form.costoHora||0} onChange={v=>sf("costoHora",+v||0)} type="number"/>
         </Fld>
        :<div style={{padding:"8px 12px",background:C.bg0,borderRadius:5,border:"1px solid "+C.blue+"33",fontSize:15,fontWeight:700,color:C.blue,fontFamily:ff}}>
           ${costoHoraEfectivo.toLocaleString("es-CL")} / hora
           {!rolSeleccionado&&<span style={{fontSize:11,fontWeight:400,color:C.textM}}> · Selecciona un rol para ver el costo</span>}
         </div>
      }
    </div>

    <G cols={2}>
      <Fld C={C} label="Horas semanales" suffix="h">
        <Inp C={C} value={form.horasSemana||params?.jornadaSemanalHoras||42} onChange={v=>sf("horasSemana",+v||42)} type="number"/>
      </Fld>
      <Fld C={C} label="Color avatar">
        <div style={{display:"flex",gap:6,flexWrap:"wrap",padding:"6px 0"}}>
          {COLORES_TEC.map(c=><button key={c} onClick={()=>sf("color",c)} style={{width:24,height:24,borderRadius:12,background:c,border:form.color===c?"3px solid "+C.text:"2px solid transparent",cursor:"pointer",padding:0}}/>)}
        </div>
      </Fld>
    </G>

    {/* Especialidades */}
    <Fld C={C} label="Especialidades">
      <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"6px 0"}}>
        {ESPECIALIDADES_OPT.map(e=>{
          const sel=(form.especialidades||[]).includes(e);
          return <button key={e} onClick={()=>toggleEsp(e)} style={{
            fontSize:11,padding:"4px 12px",borderRadius:20,cursor:"pointer",fontFamily:ff,fontWeight:500,
            background:sel?C.blue+"22":"transparent",
            color:sel?C.blue:C.textM,
            border:"1px solid "+(sel?C.blue:C.border),
          }}>{e}</button>;
        })}
      </div>
    </Fld>

    <Fld C={C} label="Notas internas">
      <textarea value={form.notas||""} onChange={e=>sf("notas",e.target.value)}
        placeholder="Certificaciones, observaciones, disponibilidad especial..."
        style={{width:"100%",minHeight:60,padding:"8px 11px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:13,color:C.text,fontFamily:ff,resize:"vertical",boxSizing:"border-box"}}/>
    </Fld>

    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
      <input type="checkbox" id="tec-activo" checked={form.activo!==false} onChange={e=>sf("activo",e.target.checked)} style={{accentColor:C.blue}}/>
      <label htmlFor="tec-activo" style={{fontSize:13,color:C.text,fontFamily:ff,cursor:"pointer"}}>Técnico activo</label>
    </div>

    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar} disabled={!form.nombre?.trim()}>{isEdit?"Guardar cambios":"Crear técnico"}</Btn>
    </div>
  </Modal>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MODAL CONTRATISTA
// ─────────────────────────────────────────────────────────────────────────────
function ModalContratista({C,con,onClose,onSave}){
  const isEdit=!!con?.id;
  const [form,setForm]=useState(con||{activo:true,servicios:[],tipoTarifa:"hora"});
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));

  const toggleServ=s=>{
    const curr=form.servicios||[];
    sf("servicios",curr.includes(s)?curr.filter(x=>x!==s):[...curr,s]);
  };

  const guardar=()=>{
    if(!form.nombre?.trim())return;
    const ahora=new Date().toISOString();
    onSave({...form,id:form.id||newId(),createdAt:form.createdAt||ahora,updatedAt:ahora});
  };

  return <Modal C={C} title={isEdit?"Editar contratista":"Nuevo contratista"} onClose={onClose} width={520}>
    <G cols={2}>
      <Fld C={C} label="Nombre / Empresa *">
        <Inp C={C} value={form.nombre||""} onChange={v=>sf("nombre",v)} placeholder="Ej: Instalaciones Torres Ltda."/>
      </Fld>
      <Fld C={C} label="RUT">
        <Inp C={C} value={form.rut||""} onChange={v=>sf("rut",v)} placeholder="76.543.210-K"/>
      </Fld>
      <Fld C={C} label="Contacto">
        <Inp C={C} value={form.contacto||""} onChange={v=>sf("contacto",v)} placeholder="Nombre del contacto"/>
      </Fld>
      <Fld C={C} label="Teléfono / Email">
        <Inp C={C} value={form.telefono||""} onChange={v=>sf("telefono",v)} placeholder="+56 9 ... / correo"/>
      </Fld>
    </G>

    {/* Tarifa */}
    <div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:6,padding:"12px 14px",marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff,marginBottom:10}}>Tarifa de cobro</div>
      <G cols={2}>
        <Fld C={C} label="Monto" prefix="$">
          <Inp C={C} value={form.tarifa||0} onChange={v=>sf("tarifa",+v||0)} type="number"/>
        </Fld>
        <Fld C={C} label="Tipo de tarifa">
          <Sel C={C} value={form.tipoTarifa||"hora"} onChange={v=>sf("tipoTarifa",v)}
            opts={[{value:"hora",label:"Por hora"},{value:"dia",label:"Por día"},{value:"proyecto",label:"Por proyecto"}]}/>
        </Fld>
      </G>
    </div>

    {/* Servicios */}
    <Fld C={C} label="Servicios que presta">
      <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"6px 0"}}>
        {ESPECIALIDADES_OPT.map(s=>{
          const sel=(form.servicios||[]).includes(s);
          return <button key={s} onClick={()=>toggleServ(s)} style={{
            fontSize:11,padding:"4px 12px",borderRadius:20,cursor:"pointer",fontFamily:ff,fontWeight:500,
            background:sel?C.blue+"22":"transparent",color:sel?C.blue:C.textM,
            border:"1px solid "+(sel?C.blue:C.border),
          }}>{s}</button>;
        })}
      </div>
    </Fld>

    <Fld C={C} label="Notas">
      <textarea value={form.notas||""} onChange={e=>sf("notas",e.target.value)}
        placeholder="Condiciones de pago, observaciones, etc."
        style={{width:"100%",minHeight:55,padding:"8px 11px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:13,color:C.text,fontFamily:ff,resize:"vertical",boxSizing:"border-box"}}/>
    </Fld>

    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
      <input type="checkbox" id="con-activo" checked={form.activo!==false} onChange={e=>sf("activo",e.target.checked)} style={{accentColor:C.blue}}/>
      <label htmlFor="con-activo" style={{fontSize:13,color:C.text,fontFamily:ff,cursor:"pointer"}}>Contratista activo</label>
    </div>

    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar} disabled={!form.nombre?.trim()}>{isEdit?"Guardar cambios":"Crear contratista"}</Btn>
    </div>
  </Modal>;
}

// ─────────────────────────────────────────────────────────────────────────────
// HORAS VIEW — Registro semanal de hora-hombre
// ─────────────────────────────────────────────────────────────────────────────
function HorasView({C,registros,tecnicos,contratistas,proyectos,params,onSaveBulk,onSave,onDelete,onSaveProyecto,readonly}){
  const hoy=new Date();
  const [semY,semW]=getISOWeek(hoy);
  const [selY,setSelY]=useState(semY);
  const [selW,setSelW]=useState(semW);
  const [subTab,setSubTab]=useState("semana");
  const [modal,setModal]=useState(null);

  const tipos=params?.tiposHora||TIPOS_HORA_DEF;
  const roles=params?.rolesTecnicos||ROLES_TEC_DEF;
  const personal=[...tecnicos,...contratistas.map(c=>({...c,_esContratista:true}))];

  // Días de la semana seleccionada
  const diasSemana=Array.from({length:7},(_,i)=>{
    const d=addDays(weekStart(selY,selW),i);
    return {fecha:fmtDay(d),label:DIAS_SEM[i],d};
  });

  // Filtrar registros de la semana seleccionada
  const regsemana=registros.filter(r=>diasSemana.some(d=>d.fecha===r.fecha));

  // Navegar semanas
  const prevSem=()=>{let w=selW-1,y=selY;if(w<1){y--;w=52;}setSelW(w);setSelY(y);};
  const nextSem=()=>{let w=selW+1,y=selY;if(w>52){y++;w=1;}setSelW(w);setSelY(y);};

  // Calcular costo de un registro
  const calcCostoReg=r=>{
    const pers=personal.find(p=>p.id===r.personalId);
    const costoBase=pers?.costoHora||0;
    const tipo=tipos.find(t=>t.id===r.tipoHoraId)||{recargo:0};
    return Math.round(r.horas*(costoBase*(1+tipo.recargo/100)));
  };

  // Totales semana
  const totalHoras=regsemana.reduce((s,r)=>s+r.horas,0);
  const totalCosto=regsemana.reduce((s,r)=>s+calcCostoReg(r),0);
  const regsAprobados=regsemana.filter(r=>r.estado==="aprobado");
  const regsPendientes=regsemana.filter(r=>r.estado==="pendiente");

  // Aprobar todos los pendientes de la semana
  const aprobarSemana=()=>{
    const updated=[...registros];
    regsemana.filter(r=>r.estado==="pendiente").forEach(r=>{
      const i=updated.findIndex(x=>x.id===r.id);
      if(i>=0)updated[i]={...updated[i],estado:"aprobado",aprobadoEl:new Date().toISOString()};
    });
    onSaveBulk(updated);
    // Actualizar costos reales en proyectos afectados
    actualizarCostosProyectos(updated);
  };

  // Recalcular costos MO reales en todos los proyectos
  const actualizarCostosProyectos=regsAll=>{
    const porProyecto={};
    regsAll.filter(r=>r.estado==="aprobado").forEach(r=>{
      if(!r.proyectoId)return;
      if(!porProyecto[r.proyectoId])porProyecto[r.proyectoId]=0;
      porProyecto[r.proyectoId]+=calcCostoReg(r);
    });
    // Actualizar cada proyecto afectado
    Object.entries(porProyecto).forEach(([pid,costoMO])=>{
      const proy=proyectos.find(p=>p.id===pid);
      if(!proy)return;
      const costosMO=regsAll.filter(r=>r.proyectoId===pid&&r.estado==="aprobado").map(r=>{
        const pers=personal.find(p=>p.id===r.personalId);
        return{id:r.id,tipo:"Mano de obra",desc:`${pers?.nombre||"Personal"} · ${r.horas}h`,cant:r.horas,precio:Math.round(calcCostoReg(r)/r.horas),total:calcCostoReg(r),fecha:r.fecha,autoMO:true};
      });
      const costosSinMO=(proy.costos||[]).filter(c=>!c.autoMO);
      onSaveProyecto({...proy,costos:[...costosSinMO,...costosMO]});
    });
  };

  return <div>
    {/* Header */}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text,fontFamily:ff}}>Control de horas</h2>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>Registro y aprobación de hora-hombre por proyecto</div>
      </div>
      {!readonly&&<Btn C={C} onClick={()=>setModal({data:null})}>+ Registrar horas</Btn>}
    </div>

    {/* KPIs semana */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
      {[
        {label:"Horas esta semana",val:`${totalHoras.toFixed(1)}h`,color:C.blue},
        {label:"Costo semana",val:`$${totalCosto.toLocaleString("es-CL")}`,color:C.green},
        {label:"Aprobados",val:regsAprobados.length,color:C.green},
        {label:"Pendientes aprobación",val:regsPendientes.length,color:regsPendientes.length>0?C.amber:C.textM},
      ].map(k=><div key={k.label} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"12px 16px"}}>
        <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.label}</div>
        <div style={{fontSize:k.label.includes("Costo")?16:22,fontWeight:700,color:k.color,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.val}</div>
      </div>)}
    </div>

    {/* Navegador semana */}
    <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <button onClick={prevSem} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:5,padding:"5px 12px",cursor:"pointer",color:C.text,fontFamily:ff,fontSize:16}}>‹</button>
      <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:ff,minWidth:220,textAlign:"center"}}>{weekLabel(selY,selW)}</div>
      <button onClick={nextSem} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:5,padding:"5px 12px",cursor:"pointer",color:C.text,fontFamily:ff,fontSize:16}}>›</button>
      <button onClick={()=>{setSelY(semY);setSelW(semW);}} style={{background:"transparent",border:"none",fontSize:11,color:C.blue,cursor:"pointer",fontFamily:ff,fontWeight:600}}>Esta semana</button>
      {!readonly&&regsPendientes.length>0&&<Btn C={C} small variant="soft" onClick={aprobarSemana}>✓ Aprobar semana ({regsPendientes.length})</Btn>}
    </div>

    {/* Sub-tabs */}
    <div style={{display:"flex",gap:3,marginBottom:14,background:C.bg1,padding:3,borderRadius:6,border:"1px solid "+C.border,width:"fit-content"}}>
      {[["semana","Vista semana"],["lista","Todos los registros"]].map(([id,lbl])=>
        <button key={id} onClick={()=>setSubTab(id)}
          style={{padding:"5px 16px",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:600,
            background:subTab===id?C.blue:"transparent",color:subTab===id?"#fff":C.textM,border:"none",fontFamily:ff}}>
          {lbl}
        </button>
      )}
    </div>

    {/* ── VISTA SEMANA — grilla por persona/día ── */}
    {subTab==="semana"&&<div>
      {personal.length===0
        ?<EmptyState C={C} icon="⏱" title="Sin personal registrado" sub="Primero agrega técnicos o contratistas en la sección Personal."/>
        :<div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,overflow:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff,minWidth:820}}>
            <thead>
              <tr style={{background:C.bg2,borderBottom:"2px solid "+C.border}}>
                <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,color:C.textM,fontWeight:700,minWidth:160}}>Persona</th>
                <th style={{padding:"10px 14px",textAlign:"left",fontSize:11,color:C.textM,fontWeight:700,minWidth:160}}>Proyecto</th>
                {diasSemana.map(d=><th key={d.fecha} style={{padding:"8px 10px",textAlign:"center",fontSize:11,color:d.fecha===fmtDay(hoy)?C.blue:C.textM,fontWeight:d.fecha===fmtDay(hoy)?700:600,minWidth:56}}>
                  <div>{d.label}</div>
                  <div style={{fontSize:10,fontWeight:400,color:C.textM}}>{d.d.getDate()}/{d.d.getMonth()+1}</div>
                </th>)}
                <th style={{padding:"8px 10px",textAlign:"center",fontSize:11,color:C.textM,fontWeight:700,minWidth:60}}>Total</th>
                <th style={{padding:"8px 10px",textAlign:"center",fontSize:11,color:C.textM,fontWeight:700,minWidth:80}}>Costo</th>
                <th style={{width:60}}></th>
              </tr>
            </thead>
            <tbody>
              {personal.map((pers,pi)=>{
                const regsPersSem=regsemana.filter(r=>r.personalId===pers.id);
                const proyIds=[...new Set(regsPersSem.map(r=>r.proyectoId).filter(Boolean))];
                const rows=proyIds.length>0?proyIds:[null];
                return rows.map((proyId,ri)=>{
                  const proy=proyectos.find(p=>p.id===proyId);
                  const totalH=diasSemana.reduce((s,d)=>{
                    const r=regsPersSem.find(x=>x.fecha===d.fecha&&x.proyectoId===proyId);
                    return s+(r?.horas||0);
                  },0);
                  const totalC=regsPersSem.filter(r=>r.proyectoId===proyId).reduce((s,r)=>s+calcCostoReg(r),0);
                  return <tr key={`${pers.id}-${proyId||"sin"}`} style={{borderBottom:"1px solid "+C.border,background:pi%2===0?C.bg1:C.bg2}}>
                    {ri===0&&<td rowSpan={rows.length} style={{padding:"10px 14px",verticalAlign:"top",borderRight:"1px solid "+C.border}}>
                      <div style={{fontWeight:600,color:C.text}}>{pers.nombre}</div>
                      <div style={{fontSize:10,color:pers._esContratista?"#7C3AED":C.blue,marginTop:2}}>{pers._esContratista?"Contratista":"Técnico"}</div>
                      <div style={{fontSize:10,color:C.textM,marginTop:1}}>${(pers.costoHora||0).toLocaleString("es-CL")}/h</div>
                    </td>}
                    <td style={{padding:"8px 14px"}}>
                      {proy
                        ?<div><span style={{fontFamily:"monospace",fontSize:10,color:C.blue}}>{proy.codigo}</span><div style={{fontSize:11,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>{proy.nombre}</div></div>
                        :<span style={{fontSize:11,color:C.textM}}>Sin proyecto</span>
                      }
                    </td>
                    {diasSemana.map(d=>{
                      const reg=regsPersSem.find(r=>r.fecha===d.fecha&&r.proyectoId===proyId);
                      return <td key={d.fecha} style={{padding:"6px 4px",textAlign:"center"}}>
                        {reg
                          ?<div style={{position:"relative"}}>
                             <div style={{fontSize:13,fontWeight:700,color:reg.estado==="aprobado"?C.green:reg.estado==="rechazado"?C.red:C.amber,fontVariantNumeric:"tabular-nums"}}>{reg.horas}h</div>
                             <div style={{fontSize:9,color:C.textM}}>{tipos.find(t=>t.id===reg.tipoHoraId)?.nombre?.replace("Hora ","")?.replace("Domingo / festivo","Festivo")||""}</div>
                           </div>
                          :<div style={{fontSize:12,color:C.border}}>—</div>
                        }
                      </td>;
                    })}
                    <td style={{padding:"8px 10px",textAlign:"center",fontWeight:700,color:C.text,fontVariantNumeric:"tabular-nums"}}>{totalH>0?`${totalH}h`:"—"}</td>
                    <td style={{padding:"8px 10px",textAlign:"center",fontSize:11,color:C.green,fontWeight:600,fontVariantNumeric:"tabular-nums"}}>{totalC>0?`$${totalC.toLocaleString("es-CL")}`:"—"}</td>
                    <td style={{padding:"6px 8px",textAlign:"center"}}>
                      {!readonly&&<button onClick={()=>setModal({data:{personalId:pers.id,proyectoId:proyId}})} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:4,padding:"3px 7px",cursor:"pointer",fontSize:11,color:C.blue,fontFamily:ff}}>+</button>}
                    </td>
                  </tr>;
                });
              })}
            </tbody>
          </table>
        </div>
      }
    </div>}

    {/* ── LISTA TODOS ── */}
    {subTab==="lista"&&<div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,overflow:"hidden"}}>
      {registros.length===0
        ?<EmptyState C={C} icon="📋" title="Sin registros de horas" sub="Los registros aparecerán aquí una vez que comiences a registrar horas."/>
        :<table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff}}>
          <thead>
            <tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
              {["Fecha","Persona","Proyecto","Horas","Tipo","Costo","Estado",""].map(h=>
                <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10,color:C.textM,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {[...registros].sort((a,b)=>b.fecha.localeCompare(a.fecha)).map((r,i)=>{
              const pers=personal.find(p=>p.id===r.personalId);
              const proy=proyectos.find(p=>p.id===r.proyectoId);
              const tipo=tipos.find(t=>t.id===r.tipoHoraId);
              const costo=calcCostoReg(r);
              return <tr key={r.id} style={{borderBottom:"1px solid "+C.border,background:i%2===0?C.bg1:C.bg2}}>
                <td style={{padding:"9px 12px",fontFamily:"monospace",color:C.textM}}>{r.fecha}</td>
                <td style={{padding:"9px 12px",fontWeight:600,color:C.text}}>{pers?.nombre||"—"}</td>
                <td style={{padding:"9px 12px"}}>
                  {proy?<><span style={{fontFamily:"monospace",fontSize:10,color:C.blue}}>{proy.codigo}</span> <span style={{color:C.textM}}>{proy.nombre.slice(0,25)}</span></>:"—"}
                </td>
                <td style={{padding:"9px 12px",fontWeight:700,color:C.text,textAlign:"center"}}>{r.horas}h</td>
                <td style={{padding:"9px 12px",fontSize:11,color:C.textM}}>{tipo?.nombre||"—"}</td>
                <td style={{padding:"9px 12px",fontWeight:600,color:C.green,fontVariantNumeric:"tabular-nums"}}>${costo.toLocaleString("es-CL")}</td>
                <td style={{padding:"9px 12px"}}>
                  <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,
                    background:r.estado==="aprobado"?C.green+"22":r.estado==="rechazado"?C.red+"22":C.amber+"22",
                    color:r.estado==="aprobado"?C.green:r.estado==="rechazado"?C.red:C.amber,textTransform:"uppercase"}}>
                    {r.estado||"pendiente"}
                  </span>
                </td>
                <td style={{padding:"9px 12px"}}>
                  {!readonly&&<div style={{display:"flex",gap:4}}>
                    {r.estado==="pendiente"&&<button onClick={()=>{const updated=registros.map(x=>x.id===r.id?{...x,estado:"aprobado",aprobadoEl:new Date().toISOString()}:x);onSaveBulk(updated);actualizarCostosProyectos(updated);}} style={{background:C.green+"22",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:11,color:C.green,fontFamily:ff,fontWeight:600}}>✓</button>}
                    <button onClick={()=>onDelete(r.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:13}}>✕</button>
                  </div>}
                </td>
              </tr>;
            })}
          </tbody>
        </table>
      }
    </div>}

    {/* Modal registro horas */}
    {modal&&<ModalRegistroHoras C={C} init={modal.data} personal={personal} proyectos={proyectos} tipos={tipos} diasSemana={diasSemana}
      onClose={()=>setModal(null)}
      onSave={r=>{onSave(r);setModal(null);actualizarCostosProyectos([...registros,r]);}}/>}
  </div>;
}

function ModalRegistroHoras({C,init,personal,proyectos,tipos,diasSemana,onClose,onSave}){
  const [form,setForm]=useState({
    personalId:init?.personalId||"",
    proyectoId:init?.proyectoId||"",
    fecha:init?.fecha||diasSemana[0]?.fecha||fmtDay(new Date()),
    horas:8,
    tipoHoraId:"normal",
    estado:"pendiente",
    notas:"",
  });
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const guardar=()=>{
    if(!form.personalId||!form.horas)return;
    onSave({...form,id:newId(),creadoEl:new Date().toISOString()});
  };
  const pers=personal.find(p=>p.id===form.personalId);
  const tipo=tipos.find(t=>t.id===form.tipoHoraId)||{recargo:0};
  const costoH=pers?Math.round((pers.costoHora||0)*(1+tipo.recargo/100)):0;
  const costoTotal=Math.round(costoH*(form.horas||0));
  return <Modal C={C} title="Registrar horas" onClose={onClose} width={480}>
    <G cols={2}>
      <Fld C={C} label="Persona *">
        <SelBusca C={C} value={form.personalId} onChange={v=>sf("personalId",v)}
          opts={[{value:"",label:"— Seleccionar —"},...personal.map(p=>({value:p.id,label:`${p.nombre}${p._esContratista?" (Contratista)":""}`}))]}/>
      </Fld>
      <Fld C={C} label="Proyecto">
        <Sel C={C} value={form.proyectoId} onChange={v=>sf("proyectoId",v)}
          opts={[{value:"",label:"— Sin proyecto —"},...proyectos.filter(p=>p.estadoOp!=="Cerrado").map(p=>({value:p.id,label:`${p.codigo} · ${p.nombre.slice(0,30)}`}))]}/>
      </Fld>
      <Fld C={C} label="Fecha">
        <Sel C={C} value={form.fecha} onChange={v=>sf("fecha",v)}
          opts={diasSemana.map(d=>({value:d.fecha,label:`${d.label} ${d.d.getDate()}/${d.d.getMonth()+1}`}))}/>
      </Fld>
      <Fld C={C} label="Horas trabajadas" suffix="h">
        <Inp C={C} value={form.horas} onChange={v=>sf("horas",Math.max(0,+v||0))} type="number"/>
      </Fld>
    </G>
    <Fld C={C} label="Tipo de hora">
      <div style={{display:"flex",flexWrap:"wrap",gap:6,padding:"4px 0"}}>
        {tipos.filter(t=>t.activo!==false).map(t=><button key={t.id} onClick={()=>sf("tipoHoraId",t.id)}
          style={{fontSize:11,padding:"5px 12px",borderRadius:20,cursor:"pointer",fontFamily:ff,fontWeight:500,
            background:form.tipoHoraId===t.id?C.blue+"22":"transparent",
            color:form.tipoHoraId===t.id?C.blue:C.textM,
            border:"1px solid "+(form.tipoHoraId===t.id?C.blue:C.border)}}>
          {t.nombre} {t.recargo>0?`(+${t.recargo}%)`:""}</button>)}
      </div>
    </Fld>
    {/* Preview costo */}
    {pers&&<div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:6,padding:"12px 14px",marginBottom:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,textAlign:"center"}}>
        <div><div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase"}}>Costo base/h</div><div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:ff}}>${(pers.costoHora||0).toLocaleString("es-CL")}</div></div>
        <div><div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase"}}>Costo efectivo/h</div><div style={{fontSize:14,fontWeight:700,color:tipo.recargo>0?C.amber:C.text,fontFamily:ff}}>${costoH.toLocaleString("es-CL")}</div></div>
        <div><div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase"}}>Costo total</div><div style={{fontSize:16,fontWeight:700,color:C.green,fontFamily:ff}}>${costoTotal.toLocaleString("es-CL")}</div></div>
      </div>
    </div>}
    <Fld C={C} label="Notas"><textarea value={form.notas} onChange={e=>sf("notas",e.target.value)} placeholder="Descripción de actividades realizadas..." style={{width:"100%",minHeight:55,padding:"8px 11px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:13,color:C.text,fontFamily:ff,resize:"vertical",boxSizing:"border-box"}}/></Fld>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar} disabled={!form.personalId||!form.horas}>Guardar registro</Btn>
    </div>
  </Modal>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MATERIALES VIEW — Catálogo e imputación a proyectos
// ─────────────────────────────────────────────────────────────────────────────
function MaterialesView({C,materiales,proyectos,params,onSave,onDelete,onSaveProyecto,readonly}){
  const [modal,setModal]=useState(null);
  const [filtro,setFiltro]=useState("");
  const [catFiltro,setCatFiltro]=useState("todos");
  const [confId,setConfId]=useState(null);

  const matFiltrados=materiales.filter(m=>{
    const okCat=catFiltro==="todos"||m.categoria===catFiltro;
    const okBus=!filtro||m.nombre?.toLowerCase().includes(filtro.toLowerCase())||m.codigo?.toLowerCase().includes(filtro.toLowerCase());
    return okCat&&okBus;
  });

  const totalStock=materiales.reduce((s,m)=>(m.stockActual||0)>0?s+1:s,0);
  const totalValor=materiales.reduce((s,m)=>s+(m.stockActual||0)*(m.precioUnitario||0),0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text,fontFamily:ff}}>Catálogo de materiales</h2>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>{materiales.length} ítems · {totalStock} con stock · La imputación a proyectos se hace dentro de cada proyecto</div>
      </div>
      {!readonly&&<Btn C={C} onClick={()=>setModal({data:null})}>+ Nuevo material</Btn>}
    </div>

    {/* KPIs */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
      {[
        {label:"Ítems catálogo",val:materiales.length,color:C.blue},
        {label:"Con stock",val:totalStock,color:C.green},
        {label:"Stock bajo / agotado",val:materiales.filter(m=>(m.stockActual||0)<=(m.stockMinimo||0)).length,color:C.amber},
        {label:"Valor inventario",val:`$${Math.round(totalValor/1000)}K`,color:C.text},
      ].map(k=><div key={k.label} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"12px 16px"}}>
        <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.label}</div>
        <div style={{fontSize:k.label.includes("Valor")?16:22,fontWeight:700,color:k.color,fontFamily:ff,marginTop:4}}>{k.val}</div>
      </div>)}
    </div>

    {/* ── CATÁLOGO ── */}
    <>
      {/* Filtros */}
      <div style={{display:"flex",gap:8,marginBottom:12,flexWrap:"wrap",alignItems:"center"}}>
        <input value={filtro} onChange={e=>setFiltro(e.target.value)} placeholder="Buscar material o código..."
          style={{padding:"7px 12px",border:"1px solid "+C.border,borderRadius:6,background:C.bg1,color:C.text,fontSize:13,fontFamily:ff,outline:"none",width:240}}/>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {["todos",...CATS_MAT].map(c=><button key={c} onClick={()=>setCatFiltro(c)}
            style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontFamily:ff,fontWeight:500,
              background:catFiltro===c?C.blue+"22":"transparent",color:catFiltro===c?C.blue:C.textM,
              border:"1px solid "+(catFiltro===c?C.blue:C.border)}}>
            {c==="todos"?"Todos":c}
          </button>)}
        </div>
      </div>

      {matFiltrados.length===0
        ?<EmptyState C={C} icon="📦" title={materiales.length===0?"Sin materiales en catálogo":"Sin resultados"}
            sub={materiales.length===0?"Agrega materiales al catálogo para asignarlos a proyectos y calcular costos automáticamente.":"Prueba con otro filtro o búsqueda."}
            action={!readonly&&materiales.length===0&&<Btn C={C} onClick={()=>setModal({data:null})}>+ Agregar primer material</Btn>}/>
        :<div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:ff}}>
            <thead>
              <tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
                {["Código","Nombre","Categoría","Unidad","Precio unit.","Stock","Mín.","Estado",""].map(h=>
                  <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10,color:C.textM,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {matFiltrados.map((m,i)=>{
                const stockBajo=(m.stockActual||0)<=(m.stockMinimo||0);
                return <tr key={m.id} style={{borderBottom:"1px solid "+C.border,background:i%2===0?C.bg1:C.bg2}}>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11,color:C.blue,fontWeight:600}}>{m.codigo||"—"}</td>
                  <td style={{padding:"9px 12px",fontWeight:600,color:C.text}}>{m.nombre}</td>
                  <td style={{padding:"9px 12px",fontSize:11,color:C.textM}}>{m.categoria||"—"}</td>
                  <td style={{padding:"9px 12px",fontSize:11,color:C.textM}}>{m.unidad||"unidad"}</td>
                  <td style={{padding:"9px 12px",fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>${(m.precioUnitario||0).toLocaleString("es-CL")}</td>
                  <td style={{padding:"9px 12px",fontWeight:700,color:stockBajo?C.red:C.text,fontVariantNumeric:"tabular-nums",textAlign:"center"}}>{m.stockActual||0}</td>
                  <td style={{padding:"9px 12px",color:C.textM,textAlign:"center"}}>{m.stockMinimo||0}</td>
                  <td style={{padding:"9px 12px"}}>
                    <span style={{fontSize:9,fontWeight:700,padding:"2px 8px",borderRadius:20,
                      background:stockBajo?C.red+"22":C.green+"22",color:stockBajo?C.red:C.green,textTransform:"uppercase"}}>
                      {stockBajo?"Stock bajo":"OK"}
                    </span>
                  </td>
                  <td style={{padding:"9px 12px"}}>
                    {!readonly&&<div style={{display:"flex",gap:4}}>
                      <Btn C={C} ghost small onClick={()=>setModal({data:m})}>✏</Btn>
                      {confId===m.id
                        ?<><Btn C={C} small color={C.red} onClick={()=>{onDelete(m.id);setConfId(null);}}>✓</Btn>
                           <Btn C={C} ghost small onClick={()=>setConfId(null)}>✕</Btn></>
                        :<Btn C={C} ghost small color={C.red} onClick={()=>setConfId(m.id)}>🗑</Btn>
                      }
                    </div>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      }
    </>

    {/* Modal material */}
    {modal&&<ModalMaterial C={C} mat={modal.data} onClose={()=>setModal(null)} onSave={m=>{onSave(m);setModal(null);}}/>}
  </div>;
}

function ModalMaterial({C,mat,onClose,onSave}){
  const isEdit=!!mat?.id;
  const [form,setForm]=useState(mat||{unidad:"unidad",stockActual:0,stockMinimo:0,activo:true});
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const guardar=()=>{
    if(!form.nombre?.trim())return;
    onSave({...form,id:form.id||newId(),updatedAt:new Date().toISOString(),createdAt:form.createdAt||new Date().toISOString()});
  };
  return <Modal C={C} title={isEdit?"Editar material":"Nuevo material"} onClose={onClose} width={500}>
    <G cols={2}>
      <Fld C={C} label="Código interno"><Inp C={C} value={form.codigo||""} onChange={v=>sf("codigo",v)} placeholder="CAM-B8MP"/></Fld>
      <Fld C={C} label="Categoría"><Sel C={C} value={form.categoria||""} onChange={v=>sf("categoria",v)} opts={[{value:"",label:"— Categoría —"},...CATS_MAT.map(c=>({value:c,label:c}))]}/></Fld>
    </G>
    <Fld C={C} label="Nombre *"><Inp C={C} value={form.nombre||""} onChange={v=>sf("nombre",v)} placeholder="Ej: Cámara IP Bullet 8MP"/></Fld>
    <Fld C={C} label="Descripción"><textarea value={form.descripcion||""} onChange={e=>sf("descripcion",e.target.value)} placeholder="Especificaciones técnicas..." style={{width:"100%",minHeight:50,padding:"8px 11px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:13,color:C.text,fontFamily:ff,resize:"vertical",boxSizing:"border-box"}}/></Fld>
    <G cols={3}>
      <Fld C={C} label="Precio unitario" prefix="$"><Inp C={C} value={form.precioUnitario||0} onChange={v=>sf("precioUnitario",+v||0)} type="number"/></Fld>
      <Fld C={C} label="Unidad"><Sel C={C} value={form.unidad||"unidad"} onChange={v=>sf("unidad",v)} opts={UNIDADES_OPT.map(u=>({value:u,label:u}))}/></Fld>
      <Fld C={C} label="Proveedor"><Inp C={C} value={form.proveedor||""} onChange={v=>sf("proveedor",v)} placeholder="Nombre proveedor"/></Fld>
    </G>
    <G cols={2}>
      <Fld C={C} label="Stock actual" suffix={form.unidad||"u"}><Inp C={C} value={form.stockActual||0} onChange={v=>sf("stockActual",+v||0)} type="number"/></Fld>
      <Fld C={C} label="Stock mínimo" suffix={form.unidad||"u"}><Inp C={C} value={form.stockMinimo||0} onChange={v=>sf("stockMinimo",+v||0)} type="number"/></Fld>
    </G>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar} disabled={!form.nombre?.trim()}>{isEdit?"Guardar cambios":"Crear material"}</Btn>
    </div>
  </Modal>;
}

function ImputarMaterial({C,materiales,proyectos,onSaveProyecto,readonly}){
  const [proyId,setProyId]=useState("");
  const [matId,setMatId]=useState("");
  const [cant,setCant]=useState(1);
  const [saved,setSaved]=useState(false);

  const proy=proyectos.find(p=>p.id===proyId);
  const mat=materiales.find(m=>m.id===matId);
  const total=(mat?.precioUnitario||0)*cant;

  const imputar=()=>{
    if(!proy||!mat||cant<=0)return;
    const nuevoItem={id:newId(),tipo:"Materiales",desc:`${mat.nombre} × ${cant} ${mat.unidad||"u"}`,cant,precio:mat.precioUnitario||0,total,fecha:new Date().toISOString().slice(0,10),materialId:mat.id,autoMat:true};
    const costosSinEste=(proy.costos||[]).filter(c=>!(c.autoMat&&c.materialId===mat.id));
    const costoExistente=(proy.costos||[]).find(c=>c.autoMat&&c.materialId===mat.id);
    const costosFinal=costoExistente?[...costosSinEste,{...costoExistente,cant:costoExistente.cant+cant,total:costoExistente.total+total,desc:`${mat.nombre} × ${costoExistente.cant+cant} ${mat.unidad||"u"}`}]:[...costosSinEste,nuevoItem];
    onSaveProyecto({...proy,costos:costosFinal});
    setSaved(true);setTimeout(()=>setSaved(false),2000);
  };

  return <div>
    <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:20,marginBottom:14}}>
      <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff,marginBottom:14}}>Imputar material al costo real de un proyecto</div>
      <G cols={2}>
        <Fld C={C} label="Proyecto">
          <Sel C={C} value={proyId} onChange={setProyId}
            opts={[{value:"",label:"— Seleccionar proyecto —"},...proyectos.filter(p=>p.estadoOp!=="Cerrado").map(p=>({value:p.id,label:`${p.codigo} · ${p.nombre.slice(0,35)}`}))]}/>
        </Fld>
        <Fld C={C} label="Material">
          <SelBusca C={C} value={matId} onChange={setMatId}
            opts={[{value:"",label:"— Seleccionar material —"},...materiales.map(m=>({value:m.id,label:`${m.nombre} · $${(m.precioUnitario||0).toLocaleString("es-CL")}/${m.unidad||"u"}`}))]}/>
        </Fld>
      </G>
      <G cols={2}>
        <Fld C={C} label={`Cantidad${mat?` (${mat.unidad||"u"})`:`:`}`} suffix={mat?.unidad||""}>
          <Inp C={C} value={cant} onChange={v=>setCant(Math.max(0,+v||0))} type="number"/>
        </Fld>
        <Fld C={C} label="Costo total">
          <div style={{padding:"8px 11px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,fontSize:15,fontWeight:700,color:total>0?C.green:C.textM,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>
            ${total.toLocaleString("es-CL")}
          </div>
        </Fld>
      </G>
      {!readonly&&<div style={{display:"flex",gap:8,marginTop:8}}>
        <Btn C={C} onClick={imputar} disabled={!proyId||!matId||cant<=0}>{saved?"✓ Imputado":"Imputar al proyecto"}</Btn>
      </div>}
    </div>
    {/* Costos actuales del proyecto seleccionado */}
    {proy&&<div>
      <div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:ff,marginBottom:8}}>Costos actuales de {proy.codigo}:</div>
      <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,overflow:"hidden"}}>
        {(proy.costos||[]).length===0
          ?<div style={{padding:"20px",textAlign:"center",fontSize:12,color:C.textM,fontFamily:ff}}>Sin costos registrados</div>
          :(proy.costos||[]).map((cost,i)=><div key={cost.id||i} style={{display:"flex",alignItems:"center",padding:"10px 14px",borderBottom:"1px solid "+C.border,gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{cost.desc}</div>
              <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{cost.tipo} · {cost.fecha}</div>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:C.green,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>${(cost.total||0).toLocaleString("es-CL")}</div>
          </div>)
        }
        {(proy.costos||[]).length>0&&<div style={{padding:"10px 14px",background:C.bg2,display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:ff}}>
          <span style={{fontSize:12,fontWeight:700,color:C.text}}>Total costos</span>
          <span style={{fontSize:14,fontWeight:700,color:C.green,fontVariantNumeric:"tabular-nums"}}>${(proy.costos||[]).reduce((s,c)=>s+(c.total||0),0).toLocaleString("es-CL")}</span>
        </div>}
      </div>
    </div>}
  </div>;
}
// ─────────────────────────────────────────────────────────────────────────────
// INCIDENCIAS VIEW — Fase 5: Incidencias + Change Orders (Adicionales)
// ─────────────────────────────────────────────────────────────────────────────
function IncidenciasView({C,incidencias,proyectos,tecnicos,clientes,params,onSave,onDelete,onSaveProyecto,readonly}){
  const [modal,setModal]=useState(null); // null | {tipo:"inc"|"add", data}
  const [subTab,setSubTab]=useState("incidencias");
  const [filtroEst,setFiltroEst]=useState("todas");
  const [confId,setConfId]=useState(null);

  // Separar incidencias de adicionales
  const incs=incidencias.filter(i=>i.tipo!=="adicional");
  const adds=incidencias.filter(i=>i.tipo==="adicional");

  const incsFiltradas=filtroEst==="todas"?incs:incs.filter(i=>i.estado===filtroEst);

  // KPIs
  const abiertas=incs.filter(i=>i.estado==="Abierta"||i.estado==="En proceso").length;
  const criticas=incs.filter(i=>i.prioridad==="Crítica"&&i.estado!=="Cerrada").length;
  const addsAprobados=adds.filter(a=>a.estadoAdd==="Aprobado");
  const valorAdicional=addsAprobados.reduce((s,a)=>s+(a.monto||0),0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text,fontFamily:ff}}>Incidencias y adicionales</h2>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>
          {incs.length} incidencias · {adds.length} adicionales (change orders)
        </div>
      </div>
      {!readonly&&<div style={{display:"flex",gap:8}}>
        <Btn C={C} variant="soft" onClick={()=>setModal({tipo:"inc",data:null})}>+ Incidencia</Btn>
        <Btn C={C} onClick={()=>setModal({tipo:"add",data:null})}>+ Adicional</Btn>
      </div>}
    </div>

    {/* KPIs */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
      {[
        {label:"Incidencias abiertas",val:abiertas,color:abiertas>0?C.red:C.green},
        {label:"Críticas activas",val:criticas,color:criticas>0?"#7C3AED":C.textM},
        {label:"Adicionales aprobados",val:addsAprobados.length,color:C.green},
        {label:"Valor adicional aprobado",val:`$${Math.round(valorAdicional/1000)}K`,color:C.blue},
      ].map(k=><div key={k.label} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"12px 16px"}}>
        <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.label}</div>
        <div style={{fontSize:k.label.includes("Valor")?16:22,fontWeight:700,color:k.color,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.val}</div>
      </div>)}
    </div>

    {/* Sub-tabs */}
    <div style={{display:"flex",gap:3,marginBottom:14,background:C.bg1,padding:3,borderRadius:6,border:"1px solid "+C.border,width:"fit-content"}}>
      {[["incidencias",`Incidencias (${incs.length})`],["adicionales",`Adicionales (${adds.length})`]].map(([id,lbl])=>
        <button key={id} onClick={()=>setSubTab(id)}
          style={{padding:"5px 16px",borderRadius:5,cursor:"pointer",fontSize:11,fontWeight:600,
            background:subTab===id?C.blue:"transparent",color:subTab===id?"#fff":C.textM,border:"none",fontFamily:ff}}>
          {lbl}
        </button>
      )}
    </div>

    {/* ── INCIDENCIAS ── */}
    {subTab==="incidencias"&&<>
      {/* Filtros estado */}
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {["todas",...ESTADOS_INC].map(e=><button key={e} onClick={()=>setFiltroEst(e)}
          style={{padding:"4px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontFamily:ff,fontWeight:500,
            background:filtroEst===e?C.blue+"22":"transparent",color:filtroEst===e?C.blue:C.textM,
            border:"1px solid "+(filtroEst===e?C.blue:C.border)}}>
          {e}
        </button>)}
      </div>
      {incsFiltradas.length===0
        ?<EmptyState C={C} icon="🔧" title="Sin incidencias" sub={incs.length===0?"Sin incidencias registradas. Las incidencias permiten registrar y resolver problemas durante la ejecución de proyectos.":"No hay incidencias con este filtro."}
            action={!readonly&&incs.length===0&&<Btn C={C} onClick={()=>setModal({tipo:"inc",data:null})}>+ Primera incidencia</Btn>}/>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>
          {incsFiltradas.map(inc=>{
            const proy=proyectos.find(p=>p.id===inc.proyectoId);
            const tec=tecnicos.find(t=>t.id===inc.asignadoA);
            return <div key={inc.id} style={{background:C.bg1,border:"1px solid "+(inc.prioridad==="Crítica"?"#7C3AED44":inc.prioridad==="Alta"?C.red+"33":C.border),borderRadius:10,overflow:"hidden"}}>
              <div style={{height:3,background:COL_PRIO[inc.prioridad]||C.textM}}/>
              <div style={{padding:"14px 16px"}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                      <span style={{fontFamily:"monospace",fontSize:10,color:C.blue,fontWeight:600}}>{inc.codigo||"INC-"+inc.id?.slice(-4)}</span>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,background:COL_PRIO[inc.prioridad]+"22",color:COL_PRIO[inc.prioridad]||C.textM}}>{inc.prioridad}</span>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,background:(COL_EST_INC[inc.estado]||C.textM)+"22",color:COL_EST_INC[inc.estado]||C.textM}}>{inc.estado}</span>
                      <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:C.bg2,color:C.textM,border:"1px solid "+C.border}}>{inc.tipoInc}</span>
                    </div>
                    <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:ff,marginBottom:4}}>{inc.titulo}</div>
                    <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:8,lineHeight:1.5}}>{inc.descripcion}</div>
                    <div style={{display:"flex",gap:14,flexWrap:"wrap"}}>
                      {proy&&<span style={{fontSize:11,color:C.blue,fontFamily:ff}}>📁 {proy.codigo} · {proy.nombre.slice(0,30)}</span>}
                      {tec&&<span style={{fontSize:11,color:C.textM,fontFamily:ff}}>👷 Asignado: {tec.nombre}</span>}
                      <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>📅 {inc.fechaReporte||"—"}</span>
                      {inc.fechaCierre&&<span style={{fontSize:11,color:C.green,fontFamily:ff}}>✓ Cerrada: {inc.fechaCierre}</span>}
                    </div>
                    {inc.resolucion&&<div style={{marginTop:8,padding:"8px 10px",background:C.green+"11",borderRadius:5,border:"1px solid "+C.green+"33",fontSize:11,color:C.green,fontFamily:ff}}>
                      ✓ Resolución: {inc.resolucion}
                    </div>}
                  </div>
                  {!readonly&&<div style={{display:"flex",flexDirection:"column",gap:5,flexShrink:0}}>
                    <Btn C={C} ghost small onClick={()=>setModal({tipo:"inc",data:inc})}>✏ Editar</Btn>
                    {inc.estado!=="Cerrada"&&<Btn C={C} ghost small color={C.green} onClick={()=>onSave({...inc,estado:"Cerrada",fechaCierre:new Date().toISOString().slice(0,10)})}>✓ Cerrar</Btn>}
                    {confId===inc.id
                      ?<><Btn C={C} small color={C.red} onClick={()=>{onDelete(inc.id);setConfId(null);}}>✓</Btn><Btn C={C} ghost small onClick={()=>setConfId(null)}>✕</Btn></>
                      :<Btn C={C} ghost small color={C.red} onClick={()=>setConfId(inc.id)}>🗑</Btn>
                    }
                  </div>}
                </div>
              </div>
            </div>;
          })}
        </div>
      }
    </>}

    {/* ── ADICIONALES / CHANGE ORDERS ── */}
    {subTab==="adicionales"&&<>
      {adds.length===0
        ?<EmptyState C={C} icon="📋" title="Sin adicionales registrados"
            sub="Los adicionales (change orders) permiten registrar trabajos extras solicitados por el cliente durante la ejecución, con su correspondiente ajuste de precio."
            action={!readonly&&<Btn C={C} onClick={()=>setModal({tipo:"add",data:null})}>+ Primer adicional</Btn>}/>
        :<div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:ff}}>
            <thead>
              <tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
                {["Código","Proyecto","Descripción","Monto","Estado","Fecha",""].map(h=>
                  <th key={h} style={{padding:"9px 12px",textAlign:"left",fontSize:10,color:C.textM,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {adds.map((a,i)=>{
                const proy=proyectos.find(p=>p.id===a.proyectoId);
                const colEst=a.estadoAdd==="Aprobado"?C.green:a.estadoAdd==="Rechazado"?C.red:C.amber;
                return <tr key={a.id} style={{borderBottom:"1px solid "+C.border,background:i%2===0?C.bg1:C.bg2}}>
                  <td style={{padding:"9px 12px",fontFamily:"monospace",fontSize:11,color:C.blue,fontWeight:600}}>{a.codigo||"ADD-"+a.id?.slice(-4)}</td>
                  <td style={{padding:"9px 12px"}}>
                    {proy?<><div style={{fontSize:11,fontFamily:"monospace",color:C.blue}}>{proy.codigo}</div><div style={{fontSize:11,color:C.textM}}>{proy.nombre.slice(0,25)}</div></>:"—"}
                  </td>
                  <td style={{padding:"9px 12px"}}>
                    <div style={{fontWeight:600,color:C.text}}>{a.titulo}</div>
                    <div style={{fontSize:11,color:C.textM}}>{a.descripcion?.slice(0,50)}</div>
                  </td>
                  <td style={{padding:"9px 12px",fontWeight:700,color:a.estadoAdd==="Aprobado"?C.green:C.text,fontVariantNumeric:"tabular-nums"}}>${(a.monto||0).toLocaleString("es-CL")}</td>
                  <td style={{padding:"9px 12px"}}>
                    <span style={{fontSize:10,fontWeight:700,padding:"2px 8px",borderRadius:20,background:colEst+"22",color:colEst,textTransform:"uppercase"}}>{a.estadoAdd||"Pendiente"}</span>
                  </td>
                  <td style={{padding:"9px 12px",fontSize:11,color:C.textM}}>{a.fecha||"—"}</td>
                  <td style={{padding:"9px 12px"}}>
                    {!readonly&&<div style={{display:"flex",gap:4}}>
                      <Btn C={C} ghost small onClick={()=>setModal({tipo:"add",data:a})}>✏</Btn>
                      {a.estadoAdd==="Pendiente"&&<>
                        <Btn C={C} ghost small color={C.green} onClick={()=>{
                          const upd={...a,estadoAdd:"Aprobado"};
                          onSave(upd);
                          // Sumar al valor vendido del proyecto
                          const proy=proyectos.find(p=>p.id===a.proyectoId);
                          if(proy)onSaveProyecto({...proy,valorVendido:(proy.valorVendido||0)+(a.monto||0),adicionales:[...(proy.adicionales||[]),{id:a.id,desc:a.titulo,monto:a.monto,fecha:a.fecha}]});
                        }}>✓ Aprobar</Btn>
                        <Btn C={C} ghost small color={C.red} onClick={()=>onSave({...a,estadoAdd:"Rechazado"})}>✕ Rechazar</Btn>
                      </>}
                      {confId===a.id
                        ?<><Btn C={C} small color={C.red} onClick={()=>{onDelete(a.id);setConfId(null);}}>✓</Btn><Btn C={C} ghost small onClick={()=>setConfId(null)}>✕</Btn></>
                        :<Btn C={C} ghost small color={C.red} onClick={()=>setConfId(a.id)}>🗑</Btn>
                      }
                    </div>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
          {/* Resumen adicionales */}
          <div style={{padding:"10px 14px",background:C.bg2,display:"flex",gap:20,alignItems:"center",fontFamily:ff,flexWrap:"wrap"}}>
            <span style={{fontSize:12,color:C.textM}}>Pendientes: <b style={{color:C.amber}}>${adds.filter(a=>a.estadoAdd==="Pendiente").reduce((s,a)=>s+(a.monto||0),0).toLocaleString("es-CL")}</b></span>
            <span style={{fontSize:12,color:C.textM}}>Aprobados: <b style={{color:C.green}}>${valorAdicional.toLocaleString("es-CL")}</b></span>
            <span style={{fontSize:12,color:C.textM}}>Total adicional: <b style={{color:C.blue}}>${adds.reduce((s,a)=>s+(a.monto||0),0).toLocaleString("es-CL")}</b></span>
          </div>
        </div>
      }
    </>}

    {/* Modales */}
    {modal?.tipo==="inc"&&<ModalIncidencia C={C} inc={modal.data} proyectos={proyectos} tecnicos={tecnicos}
      onClose={()=>setModal(null)} onSave={i=>{onSave(i);setModal(null);}}/>}
    {modal?.tipo==="add"&&<ModalAdicional C={C} add={modal.data} proyectos={proyectos}
      onClose={()=>setModal(null)} onSave={a=>{onSave(a);setModal(null);}}/>}
  </div>;
}

function ModalIncidencia({C,inc,proyectos,tecnicos,onClose,onSave}){
  const isEdit=!!inc?.id;
  const hoy=new Date().toISOString().slice(0,10);
  const [form,setForm]=useState(inc||{estado:"Abierta",prioridad:"Media",tipoInc:"Técnica",fechaReporte:hoy,tipo:"incidencia"});
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const guardar=()=>{
    if(!form.titulo?.trim())return;
    const codigo=form.codigo||"INC-"+(Date.now().toString(36).slice(-5).toUpperCase());
    onSave({...form,id:form.id||newId(),codigo,creadoEl:form.creadoEl||new Date().toISOString()});
  };
  return <Modal C={C} title={isEdit?"Editar incidencia":"Nueva incidencia"} onClose={onClose} width={560}>
    <G cols={2}>
      <Fld C={C} label="Proyecto">
        <SelBusca C={C} value={form.proyectoId||""} onChange={v=>sf("proyectoId",v)}
          opts={[{value:"",label:"— Sin proyecto —"},...proyectos.map(p=>({value:p.id,label:`${p.codigo} · ${p.nombre.slice(0,30)}`}))]}/>
      </Fld>
      <Fld C={C} label="Tipo">
        <Sel C={C} value={form.tipoInc||"Técnica"} onChange={v=>sf("tipoInc",v)} opts={TIPOS_INC.map(t=>({value:t,label:t}))}/>
      </Fld>
    </G>
    <Fld C={C} label="Título *"><Inp C={C} value={form.titulo||""} onChange={v=>sf("titulo",v)} placeholder="Descripción breve del problema"/></Fld>
    <Fld C={C} label="Descripción detallada">
      <textarea value={form.descripcion||""} onChange={e=>sf("descripcion",e.target.value)} placeholder="Detalla el problema, contexto, impacto en el proyecto..."
        style={{width:"100%",minHeight:70,padding:"8px 11px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:13,color:C.text,fontFamily:ff,resize:"vertical",boxSizing:"border-box"}}/>
    </Fld>
    <G cols={3}>
      <Fld C={C} label="Prioridad">
        <Sel C={C} value={form.prioridad||"Media"} onChange={v=>sf("prioridad",v)} opts={PRIORIDADES_INC.map(p=>({value:p,label:p}))}/>
      </Fld>
      <Fld C={C} label="Estado">
        <Sel C={C} value={form.estado||"Abierta"} onChange={v=>sf("estado",v)} opts={ESTADOS_INC.map(e=>({value:e,label:e}))}/>
      </Fld>
      <Fld C={C} label="Asignado a">
        <SelBusca C={C} value={form.asignadoA||""} onChange={v=>sf("asignadoA",v)}
          opts={[{value:"",label:"— Sin asignar —"},...tecnicos.map(t=>({value:t.id,label:t.nombre}))]}/>
      </Fld>
    </G>
    <G cols={2}>
      <Fld C={C} label="Fecha reporte"><Inp C={C} value={form.fechaReporte||hoy} onChange={v=>sf("fechaReporte",v)} type="date"/></Fld>
      <Fld C={C} label="Fecha cierre (si aplica)"><Inp C={C} value={form.fechaCierre||""} onChange={v=>sf("fechaCierre",v)} type="date"/></Fld>
    </G>
    <Fld C={C} label="Resolución / Acción tomada">
      <textarea value={form.resolucion||""} onChange={e=>sf("resolucion",e.target.value)} placeholder="Describe cómo se resolvió la incidencia..."
        style={{width:"100%",minHeight:55,padding:"8px 11px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:13,color:C.text,fontFamily:ff,resize:"vertical",boxSizing:"border-box"}}/>
    </Fld>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar} disabled={!form.titulo?.trim()}>{isEdit?"Guardar cambios":"Crear incidencia"}</Btn>
    </div>
  </Modal>;
}

function ModalAdicional({C,add,proyectos,onClose,onSave}){
  const isEdit=!!add?.id;
  const hoy=new Date().toISOString().slice(0,10);
  const [form,setForm]=useState(add||{estadoAdd:"Pendiente",fecha:hoy,tipo:"adicional"});
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const guardar=()=>{
    if(!form.titulo?.trim())return;
    const codigo=form.codigo||"ADD-"+(Date.now().toString(36).slice(-5).toUpperCase());
    onSave({...form,id:form.id||newId(),codigo,creadoEl:form.creadoEl||new Date().toISOString()});
  };
  return <Modal C={C} title={isEdit?"Editar adicional":"Nuevo adicional (change order)"} onClose={onClose} width={520}>
    <Fld C={C} label="Proyecto">
      <SelBusca C={C} value={form.proyectoId||""} onChange={v=>sf("proyectoId",v)}
        opts={[{value:"",label:"— Seleccionar proyecto —"},...proyectos.map(p=>({value:p.id,label:`${p.codigo} · ${p.nombre.slice(0,35)}`}))]}/>
    </Fld>
    <Fld C={C} label="Título del adicional *"><Inp C={C} value={form.titulo||""} onChange={v=>sf("titulo",v)} placeholder="Ej: Instalación cámaras adicionales sector norte"/></Fld>
    <Fld C={C} label="Descripción del trabajo adicional">
      <textarea value={form.descripcion||""} onChange={e=>sf("descripcion",e.target.value)} placeholder="Detalla qué trabajo extra solicita el cliente y por qué..."
        style={{width:"100%",minHeight:70,padding:"8px 11px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:13,color:C.text,fontFamily:ff,resize:"vertical",boxSizing:"border-box"}}/>
    </Fld>
    <G cols={2}>
      <Fld C={C} label="Monto adicional (neto)" prefix="$">
        <Inp C={C} value={form.monto||0} onChange={v=>sf("monto",+v||0)} type="number"/>
      </Fld>
      <Fld C={C} label="Fecha solicitud"><Inp C={C} value={form.fecha||hoy} onChange={v=>sf("fecha",v)} type="date"/></Fld>
    </G>
    {form.monto>0&&<div style={{padding:"10px 14px",background:C.green+"11",borderRadius:5,border:"1px solid "+C.green+"33",fontSize:12,color:C.green,fontFamily:ff,marginBottom:8}}>
      💡 Al aprobar este adicional, el valor vendido del proyecto aumentará en <b>${(form.monto||0).toLocaleString("es-CL")}</b> automáticamente.
    </div>}
    <Fld C={C} label="Estado">
      <Sel C={C} value={form.estadoAdd||"Pendiente"} onChange={v=>sf("estadoAdd",v)}
        opts={["Pendiente","Aprobado","Rechazado"].map(e=>({value:e,label:e}))}/>
    </Fld>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar} disabled={!form.titulo?.trim()}>{isEdit?"Guardar cambios":"Crear adicional"}</Btn>
    </div>
  </Modal>;
}

// USUARIOS
// INIT + APP

const sanitizeTheme = (value) => value === "dark" ? "dark" : "light";
const themeKeyForUser = (session) => session?.userId ? `af_theme_${session.userId}` : null;
const getThemeForSession = (session) => {
  const key = themeKeyForUser(session);
  if (!key || typeof localStorage === "undefined") return sanitizeTheme(repo.theme.get());
  return sanitizeTheme(localStorage.getItem(key) || repo.theme.get());
};
const saveThemeForSession = (session, value) => {
  const next = sanitizeTheme(value);
  const key = themeKeyForUser(session);
  if (key && typeof localStorage !== "undefined") localStorage.setItem(key, next);
  else repo.theme.set(next);
  return next;
};

export default function App(){
  const [theme,setTheme]=useState(sanitizeTheme(repo.theme.get()));
  const C={...(theme==="dark"?DARK:LIGHT),isLight:theme==="light"};
  const isLight=theme==="light";
  const [session,setSession]=useState(null);
  const [tab,setTab]=useState("dashboard");
  const [clientes,setClientes]=useState([]);
  const [instalaciones,setInst]=useState([]);
  const [propuestas,setProps]=useState([]);
  const [params,setParams]=useState(DEF);
  const [categorias,setCats]=useState(CATS_DEF);
  const [ejecutivos,setEjecs]=useState(EJEC_DEF);
  const [calcP,setCalcP]=useState(null);
  const [usersOpen,setUsersOpen]=useState(false);
  const [assistantOpen,setAssistantOpen]=useState(false);
  const [selectedClienteId,setSelectedClienteId]=useState(null);
  const [permisos,setPermisos]=useState(getPermisos());
  const [proyectos,setProyectos]=useState([]);
  const [tecnicos,setTecnicos]=useState([]);
  const [contratistas,setContratistas]=useState([]);
  const [materiales,setMateriales]=useState([]);
  const [registrosHoras,setRegistrosHoras]=useState([]);
  const [incidencias,setIncidencias]=useState([]);
  const [cotizaciones,setCotizaciones]=useState([]);
  const [plantillasCot,setPlantillasCot]=useState([]);
  const [paquetesComerciales,setPaquetesComerciales]=useState([]);
  const [fichajes,setFichajes]=useState([]);
  const [oportunidades,setOportunidades]=useState([]);
  const [servicios,setServicios]=useState([]);
  const [eventosServicio,setEventosServicio]=useState([]);
  const [usdValue,setUsdValue]=useState(985);
  const runtimeConfig=useMemo(()=>getRuntimeProviderConfig(),[]);
  const backendSyncEnabled=useMemo(()=>shouldUseBackendSync(runtimeConfig),[runtimeConfig]);

  useEffect(()=>{
    const onError=(event)=>logFrontendError(event.error||event.message,{severity:"error",area:"window-error"}).catch(()=>{});
    const onRejection=(event)=>logFrontendError(event.reason||"Promise rejection",{severity:"error",area:"unhandled-rejection"}).catch(()=>{});
    window.addEventListener("error",onError);
    window.addEventListener("unhandledrejection",onRejection);
    return ()=>{
      window.removeEventListener("error",onError);
      window.removeEventListener("unhandledrejection",onRejection);
    };
  },[]);

  useEffect(()=>{initDefaults();if(new URLSearchParams(window.location.search).get("seed")==="patagonia"){seedPatagoniaFreshDemo();window.history.replaceState(null,"",window.location.pathname);}const s=getSession();if(s&&s.userId){setSession(s);setTheme(getThemeForSession(s));setTab(defaultTabForRol(s.rol));syncSupabaseNormalizedDataQuiet({onHydrated:loadAll});}loadAll();if(backendSyncEnabled){bootstrapMasterDataBackend();bootstrapOperationalBackend();bootstrapFinancialBackend();}fetchUSD();},[backendSyncEnabled]);
  const fetchUSD=async()=>{
    try{
      const res=await fetch("https://mindicador.cl/api/dolar");
      const data=await res.json();
      if(data?.serie?.[0]?.valor)setUsdValue(Math.round(data.serie[0].valor));
    }catch(e){console.log("USD fetch error:",e);}
  };
  const loadAll=()=>{setClientes(repo.clientes.list());setInst(repo.instalaciones.list());setProps(repo.propuestas.list());const p=repo.params.get();if(p)setParams(p);const c=repo.categorias.list();if(c.length)setCats(c);const ej=repo.ejecutivos.list();if(ej.length)setEjecs(ej);setProyectos(repo.proyectos.list());setTecnicos(repo.tecnicos.list());setContratistas(repo.contratistas.list());setMateriales(repo.materiales.list());setRegistrosHoras(repo.horas.list());setIncidencias(repo.incidencias.list());setCotizaciones(repo.cotizaciones.list());setPlantillasCot(repo.plantillasCot.list());setPaquetesComerciales(repo.paquetesComerciales.list());setFichajes(repo.fichajes.list());setOportunidades(repo.oportunidades.list());setServicios(repo.serviciosRecurrentes.list());setEventosServicio(repo.eventosServicio.list());};
  const bootstrapMasterDataBackend=()=>{
    if(!backendSyncEnabled)return;
    const localClientes=repo.clientes.list();
    const localInstalaciones=repo.instalaciones.list();
    hydrateMasterDataFromBackend({clientes:localClientes,instalaciones:localInstalaciones})
      .then(result=>{
        if(result.source==="backend-merged"){
          setClientes(result.clientes);
          setInst(result.instalaciones);
        }
      })
      .catch(error=>{
        repo.syncLog.append({id:newId(),fecha:new Date().toISOString(),origen:"backend-local",tipo:"masterdata-hydrate",entidad:"clientes+instalaciones",estado:"error",registros:0,mensaje:error.message||"No se pudo cargar cartera desde backend."});
      });
  };
  const bootstrapOperationalBackend=()=>{
    if(!backendSyncEnabled)return;
    hydrateOperationalDataFromBackend({
      proyectos:repo.proyectos.list(),
      servicios:repo.serviciosRecurrentes.list(),
      eventosServicio:repo.eventosServicio.list(),
      billingExpectations:repo.serviceBillingExpectations.list(),
    })
      .then(result=>{
        if(result.source==="backend-merged"){
          setProyectos(result.proyectos);
          setServicios(result.servicios);
          setEventosServicio(result.eventosServicio);
        }
      })
      .catch(error=>{
        repo.syncLog.append({id:newId(),fecha:new Date().toISOString(),origen:"backend-local",tipo:"operational-hydrate",entidad:"operacion",estado:"error",registros:0,mensaje:error.message||"No se pudo cargar operación desde backend."});
      });
  };
  const bootstrapFinancialBackend=()=>{
    if(!backendSyncEnabled)return;
    hydrateFinancialDataFromBackend({
      facturas:repo.facturas.list(),
      pagos:repo.pagos.list(),
      cuentasPagar:repo.cuentasPagar.list(),
      gastos:repo.gastos.list(),
    }).catch(error=>{
      repo.syncLog.append({id:newId(),fecha:new Date().toISOString(),origen:"backend-local",tipo:"financial-hydrate",entidad:"finanzas",estado:"error",registros:0,mensaje:error.message||"No se pudo cargar finanzas desde backend."});
    });
  };
  const saveOportunidad=o=>{const item={...o,updatedAt:o.updatedAt||new Date().toISOString()};const next=[...repo.oportunidades.save(item)];setOportunidades(next);syncSupabaseNormalizedEntityQuiet("oportunidades",item.id);return next;};
  const deleteOportunidad=id=>{const next=repo.oportunidades.remove(id);setOportunidades(next);deleteSupabaseNormalizedEntityQuiet("oportunidades",id);return next;};
  const saveFichaje=f=>setFichajes([...repo.fichajes.save(f)]);
  const deleteFichaje=id=>setFichajes(repo.fichajes.remove(id));
  const saveCotizacion=cot=>{const item={...cot,updatedAt:cot.updatedAt||new Date().toISOString()};const next=[...repo.cotizaciones.save(item)];setCotizaciones(next);syncSupabaseNormalizedEntityQuiet("cotizaciones",item.id);return next;};
  const deleteCotizacion=id=>{const next=repo.cotizaciones.remove(id);setCotizaciones(next);deleteSupabaseNormalizedEntityQuiet("cotizaciones",id);return next;};
  const syncBillingExpectations=svc=>{
    const current=repo.serviceBillingExpectations.list().filter(x=>x.servicioId!==svc.id);
    const next=buildBillingExpectationsForService({servicio:svc,months:3});
    const all=[...current,...next];
    repo.serviceBillingExpectations.replaceAll(all);
    if(backendSyncEnabled)syncBillingExpectationsToBackendQuiet(all);
    return all;
  };
  const saveServicio=svc=>{
    const item={...svc,updatedAt:svc.updatedAt||new Date().toISOString()};
    const saved=repo.serviciosRecurrentes.save(item);
    syncBillingExpectations(svc);
    setServicios([...saved]);
    if(backendSyncEnabled)syncServicioToBackendQuiet(item);
    if(svc.proyectoId){
      const ps=repo.proyectos.list();
      const pi=ps.findIndex(p=>p.id===svc.proyectoId);
      if(pi>=0){
        const estado=svc.estado==="Activo"
          ?"Activo"
          :servicioTieneProtocoloCompleto(svc)
            ?"Listo para activar"
            :"En activación";
        ps[pi]={...ps[pi],activacionServicioEstado:estado,servicioRecurrenteId:svc.id,requiereActivacionServicio:true,updatedAt:new Date().toISOString()};
        repo.proyectos.replaceAll(ps);
        setProyectos([...ps]);
        if(backendSyncEnabled)syncProyectoToBackendQuiet(ps[pi]);
      }
    }
    syncSupabaseNormalizedEntityQuiet("serviciosRecurrentes",item.id);
  };
  const deleteServicio=id=>{const next=repo.serviciosRecurrentes.remove(id);const expectations=repo.serviceBillingExpectations.list().filter(x=>x.servicioId!==id);repo.serviceBillingExpectations.replaceAll(expectations);setServicios(next);deleteSupabaseNormalizedEntityQuiet("serviciosRecurrentes",id);if(backendSyncEnabled){deleteServicioFromBackendQuiet(id);syncBillingExpectationsToBackendQuiet(expectations);}};
  const savePlantilla=pl=>setPlantillasCot([...repo.plantillasCot.save(pl)]);
  const deletePlantilla=id=>setPlantillasCot(repo.plantillasCot.remove(id));
  const syncPackageCatalog=()=>syncSupabaseNormalizedTablesQuiet(["commercial_packages","commercial_package_items","commercial_package_services"]);
  const savePaqueteComercial=pkg=>{const item={...pkg,updatedAt:pkg.updatedAt||new Date().toISOString()};const next=[...repo.paquetesComerciales.save(item)];setPaquetesComerciales(next);syncPackageCatalog();return next;};
  const deletePaqueteComercial=id=>{const next=repo.paquetesComerciales.remove(id);setPaquetesComerciales(next);deleteSupabaseNormalizedEntityQuiet("paquetesComerciales",id);return next;};
  const saveIncidencia=inc=>setIncidencias([...repo.incidencias.save(inc)]);
  const deleteIncidencia=id=>setIncidencias(repo.incidencias.remove(id));
  const saveEventoServicio=ev=>{const item={...ev,updatedAt:ev.updatedAt||new Date().toISOString()};const next=[...repo.eventosServicio.save(item)];setEventosServicio(next);if(backendSyncEnabled)syncEventoServicioToBackendQuiet(item);return next;};
  const deleteEventoServicio=id=>{const next=repo.eventosServicio.remove(id);setEventosServicio(next);if(backendSyncEnabled)deleteEventoServicioFromBackendQuiet(id);return next;};
  const saveTecnico=tec=>setTecnicos([...repo.tecnicos.save(tec)]);
  const deleteTecnico=id=>setTecnicos(repo.tecnicos.remove(id));
  const saveContratista=con=>setContratistas([...repo.contratistas.save(con)]);
  const deleteContratista=id=>setContratistas(repo.contratistas.remove(id));
  const saveMaterial=mat=>setMateriales([...repo.materiales.save(mat)]);
  const deleteMaterial=id=>setMateriales(repo.materiales.remove(id));
  const saveRegistroHora=reg=>setRegistrosHoras([...repo.horas.save(reg)]);
  const deleteRegistroHora=id=>setRegistrosHoras(repo.horas.remove(id));
  const saveRegistrosHorasBulk=regs=>setRegistrosHoras([...repo.horas.replaceAll(regs)]);
  const handleLogin=s=>{saveSession(s);setSession(s);setTheme(getThemeForSession(s));setTab(defaultTabForRol(s.rol));loadAll();syncSupabaseNormalizedDataQuiet({onHydrated:loadAll});};
  const handleLogout=()=>{const accessToken=session?.accessToken;clearSession();setSession(null);if(accessToken)logoutSupabaseUser(accessToken).catch(()=>{});};
  const toggleTheme=()=>setTheme(t=>saveThemeForSession(session,t==="light"?"dark":"light"));
  const saveParams=p=>{repo.params.set(p);setParams(p);};
  const saveCats=c=>{repo.categorias.replaceAll(c);setCats(c);};
  const saveEjecs=e=>{repo.ejecutivos.replaceAll(e);setEjecs(e);};
  const savePermisos=p=>{repo.permisos.set(p);setPermisos(p);};
  const saveProyecto=proy=>{const item={...proy,updatedAt:proy.updatedAt||new Date().toISOString()};const next=[...repo.proyectos.save(item)];setProyectos(next);syncSupabaseNormalizedEntityQuiet("proyectos",item.id);if(backendSyncEnabled)syncProyectoToBackendQuiet(item);return next;};
  const deleteProyecto=id=>{const next=repo.proyectos.remove(id);setProyectos(next);deleteSupabaseNormalizedEntityQuiet("proyectos",id);if(backendSyncEnabled)deleteProyectoFromBackendQuiet(id);return next;};
  const saveCliente=cli=>{const item={...cli,updatedAt:cli.updatedAt||new Date().toISOString()};const next=[...repo.clientes.save(item)];setClientes(next);syncSupabaseNormalizedEntityQuiet("clientes",item.id);if(backendSyncEnabled)syncClienteToBackendQuiet(item);return next;};
  const deleteCliente=id=>{const next=repo.clientes.remove(id);setClientes(next);deleteSupabaseNormalizedEntityQuiet("clientes",id);if(backendSyncEnabled)deleteClienteFromBackendQuiet(id);return next;};
  const saveInstalacion=inst=>{const item={...inst,updatedAt:inst.updatedAt||new Date().toISOString()};const next=[...repo.instalaciones.save(item)];setInst(next);syncSupabaseNormalizedEntityQuiet("instalaciones",item.id);if(backendSyncEnabled)syncInstalacionToBackendQuiet(item);return next;};
  const deleteInstalacion=id=>{const next=repo.instalaciones.remove(id);setInst(next);deleteSupabaseNormalizedEntityQuiet("instalaciones",id);if(backendSyncEnabled)deleteInstalacionFromBackendQuiet(id);return next;};
  const createQuickQuoteFromPackage=({paquete,clienteId,instalacionId})=>{
    const toCLP=(value,moneda)=>moneda==="UF"?Math.round((Number(value)||0)*(params.ufValue||DEF.ufValue)):Number(value)||0;
    const cliente=clientes.find(c=>c.id===clienteId);
    const now=new Date().toISOString();
    const oportunidadId=newId();
    const valorProyecto=toCLP(paquete.precioInstalacionNeto,paquete.monedaPrecio);
    const valorMensual=toCLP(paquete.valorMensual,paquete.monedaMensual);
    const prop={
      id:newId(),
      numero:nextNroProp(repo.propuestas.list(),params?.propPrefijo||"PRO"),
      nombre:paquete.nombre,
      clienteId,
      instalacionId:instalacionId||"",
      oportunidadId,
      ejecutivo:cliente?.ejecutivo||session?.nombre||"",
      fecha:now.slice(0,10),
      vigencia:paquete.vigenciaHasta||"",
      estado:paquete.requiereAprobacion?"En revisión":"Borrador",
      origen:"paquete_comercial",
      paqueteId:paquete.id,
      tipoVenta:(paquete.valorMensual||0)>0?"Proyecto + Monitoreo":"Solo proyecto",
      categoria:paquete.categoria||"",
      baseProyectoNeto:valorProyecto,
      valorProyecto,
      valorFinal:valorProyecto,
      baseRecMes:valorMensual,
      costoEstimado:paquete.costoEstimado||0,
      duracionContrato:paquete.duracionContratoMeses||params.duracionContrato||24,
      materialesIncluidos:paquete.materialesIncluidos||[],
      condicionesPago:[],
      notas:`Cotización rápida generada desde paquete comercial: ${paquete.nombre}.`,
      historial:[{fecha:now,estado:paquete.requiereAprobacion?"En revisión":"Borrador",nota:"Creada desde paquete comercial"}],
      createdAt:now,
      updatedAt:now,
    };
    const oportunidad={
      id:oportunidadId,
      numero:`OP-PKG-${Date.now().toString().slice(-6)}`,
      titulo:`${paquete.nombre} · ${cliente?.razonSocial||cliente?.nombreComercial||"Cliente"}`,
      clienteId,
      instalacionId:instalacionId||"",
      ejecutivo:cliente?.ejecutivo||session?.nombre||"",
      etapa:paquete.requiereAprobacion?"En cotización":"Propuesta lista",
      probabilidad:paquete.requiereAprobacion?50:70,
      valorEstimado:valorProyecto,
      mrrEstimado:valorMensual,
      fechaContacto:now.slice(0,10),
      fechaCierreEstimada:"",
      origenLead:"Paquete comercial",
      requiereCotizacion:false,
      propuestaId:prop.id,
      paqueteId:paquete.id,
      notas:`Oportunidad generada automáticamente desde cotización rápida por paquete: ${paquete.nombre}.`,
      historial:[{fecha:now,accion:"Creada desde paquete comercial"}],
      createdAt:now,
      updatedAt:now,
    };
    const nextOpps=[...repo.oportunidades.save(oportunidad)];
    setOportunidades(nextOpps);
    const next=[...repo.propuestas.save(prop)];
    setProps(next);
    const quickQuote={
      id:newId(),
      paqueteId:paquete.id,
      clienteId,
      instalacionId:instalacionId||"",
      oportunidadId:oportunidad.id,
      propuestaId:prop.id,
      estado:"Generada",
      valorProyecto,
      valorMensual,
      creadoPorId:session?.authUserId||session?.userId||"",
      nombrePaquete:paquete.nombre,
      createdAt:now,
      updatedAt:now,
    };
    repo.quickQuotes.save(quickQuote);
    syncSupabaseNormalizedTablesQuiet(["commercial_packages","commercial_package_items","commercial_package_services","opportunities","proposals","quick_quotes"]);
    goTab("propuestas");
    return prop;
  };
  const createProposalFromOpportunity=opo=>{
    const cli=clientes.find(c=>c.id===opo.clienteId);
    const prop={
      id:newId(),
      numero:"",
      nombre:opo.titulo||cli?.razonSocial||"",
      clienteId:opo.clienteId,
      instalacionId:opo.instalacionId,
      oportunidadId:opo.id,
      ejecutivo:opo.ejecutivo,
      fecha:new Date().toISOString().slice(0,10),
      estado:"Borrador",
      cotizacionId:"",
      baseProyectoNeto:opo.valorEstimado||0,
      baseRecMes:opo.mrrEstimado||0,
      duracionContrato:36,
      escenarios:[{id:newId(),label:"Base",pct:0},{id:newId(),label:"Moderado",pct:10},{id:newId(),label:"Avanzado",pct:20},{id:newId(),label:"Agresivo",pct:30}],
      historial:[{fecha:new Date().toISOString(),accion:`Creada desde oportunidad ${opo.numero||opo.titulo}`}],
      createdAt:new Date().toISOString(),
      updatedAt:new Date().toISOString(),
    };
    const ps=repo.propuestas.save(prop);
    setProps([...ps]);
    const updatedOpo={...opo,propuestaId:prop.id,requiereCotizacion:true,etapa:"Propuesta lista",probabilidad:50};
    const nextOpps=[...repo.oportunidades.save(updatedOpo)];
    setOportunidades(nextOpps);
    syncSupabaseNormalizedTablesQuiet(["opportunities","proposals"]);
    goTab("propuestas");
    return prop;
  };
  const rol=normalizeRole(session?.rol||"viewer");
  const canDo=(moduleId,action="ver")=>hasPermission(permisos,rol,moduleId,action);
  const canEditCurrent=moduleId=>canEdit(rol,moduleId, "editar", permisos);
  const readonly=!canEditCurrent(tab);

  // Calcular módulos visibles según rol y permisos configurados
  const canSeeModule=id=>{
    return canDo(id,"ver");
  };

  const roleWorkspace = (() => {
    const count = (items) => Array.isArray(items) ? items.length : 0;
    const activeProjects = proyectos.filter(p => !["Cerrado", "Cerrado técnicamente"].includes(p.estadoOp)).length;
    const activeOpps = oportunidades.filter(o => !["Ganado", "Perdido"].includes(o.etapa)).length;
    const overdueInvoices = repo.facturas.list().filter(f => (f.estado || "") === "Vencida").length;
    const pendingIncidents = incidencias.filter(i => !["Cerrada", "Resuelta"].includes(i.estado)).length;
    const servicesActivation = servicios.filter(s => ["En activación", "Con falla"].includes(s.estado)).length;
    const map = {
      gerente_general: {
        title: "Mesa diaria de gerencia general",
        text: "Acceso completo a salud financiera, comercial, operacional, servicios, usuarios y configuración del sistema.",
        actions: [
          { label: `${activeProjects} proyectos activos`, tab: "proyectos", tone: C.blue },
          { label: `${overdueInvoices} facturas vencidas`, tab: "finanzas", tone: overdueInvoices ? C.red : C.green },
          { label: "Salud del sistema", tab: "config", tone: C.purple },
        ],
      },
      gerente_operaciones_admin: {
        title: "Mesa gerencial de operaciones y administración",
        text: "Vista consolidada de finanzas, administración, comercial y operación, sin configuración sensible.",
        actions: [
          { label: `${activeProjects} proyectos activos`, tab: "proyectos", tone: C.blue },
          { label: `${overdueInvoices} facturas vencidas`, tab: "finanzas", tone: overdueInvoices ? C.red : C.green },
          { label: "Control financiero", tab: "hitos", tone: C.green },
        ],
      },
      admin: {
        title: "Mesa diaria de gerencia",
        text: "Parte por caja, proyectos críticos, servicios recurrentes y decisiones que destraban la operación.",
        actions: [
          { label: `${activeProjects} proyectos activos`, tab: "proyectos", tone: C.blue },
          { label: `${overdueInvoices} facturas vencidas`, tab: "finanzas", tone: overdueInvoices ? C.red : C.green },
          { label: `${servicesActivation} servicios por revisar`, tab: "servicios", tone: servicesActivation ? C.amber : C.green },
        ],
      },
      gerencia: {
        title: "Mesa diaria de gerencia",
        text: "Revisa salud comercial, caja y rentabilidad. Las áreas operan el detalle.",
        actions: [
          { label: `${activeOpps} oportunidades activas`, tab: "pipeline", tone: C.blue },
          { label: "Control financiero", tab: "hitos", tone: C.green },
          { label: "Análisis", tab: "analisis", tone: C.purple },
        ],
      },
      comercial: {
        title: "Mesa de vendedor",
        text: "Enfócate en seguimiento de leads, avance de oportunidades propias y solicitudes de cotización.",
        actions: [
          { label: `${activeOpps} oportunidades`, tab: "pipeline", tone: C.blue },
          { label: "Pedir cotización", tab: "solicitudes_cotizacion", tone: C.amber },
          { label: "Cotización rápida", tab: "cotizacion_rapida", tone: C.green },
        ],
      },
      jefe_comercial: {
        title: "Mesa de jefatura comercial",
        text: "Controla actividad de vendedores, pipeline, solicitudes y propuestas listas para seguimiento.",
        actions: [
          { label: `${activeOpps} oportunidades`, tab: "pipeline", tone: C.blue },
          { label: "Solicitudes", tab: "solicitudes_cotizacion", tone: C.amber },
          { label: "Análisis comercial", tab: "analisis", tone: C.purple },
        ],
      },
      operaciones: {
        title: "Mesa de operaciones",
        text: "Gestiona solicitudes de cotización, propuestas, recursos, materiales y cierre operativo.",
        actions: [
          { label: "Cotizaciones por preparar", tab: "bandeja_cotizaciones", tone: C.blue },
          { label: `${activeProjects} proyectos activos`, tab: "proyectos", tone: C.green },
          { label: "Almacén", tab: "almacen", tone: C.purple },
        ],
      },
      administrativo_operaciones: {
        title: "Mesa administrativa de operaciones",
        text: "Administra materiales, stock, recursos y datos de apoyo para cotizaciones y proyectos.",
        actions: [
          { label: "Stock / almacén", tab: "almacen", tone: C.blue },
          { label: "Materiales", tab: "materiales", tone: C.green },
          { label: "Cotizaciones por preparar", tab: "bandeja_cotizaciones", tone: C.amber },
        ],
      },
      supervisor: {
        title: "Supervisión de terreno",
        text: "Valida avances, incidencias y cierres técnicos del equipo.",
        actions: [
          { label: "Supervisor", tab: "supervisor", tone: C.blue },
          { label: `${pendingIncidents} incidencias`, tab: "incidencias", tone: pendingIncidents ? C.amber : C.green },
          { label: "Proyectos", tab: "proyectos", tone: C.green },
        ],
      },
      finanzas: {
        title: "Mesa financiera",
        text: "Parte por vencimientos, caja y conciliación esperada contra Softland.",
        actions: [
          { label: `${overdueInvoices} vencidas`, tab: "finanzas", tone: overdueInvoices ? C.red : C.green },
          { label: "Caja y CxC", tab: "hitos", tone: C.blue },
          { label: "Análisis", tab: "analisis", tone: C.purple },
        ],
      },
      monitoreo: {
        title: "Mesa de monitoreo",
        text: "Controla activaciones, protocolos incompletos y servicios con falla.",
        actions: [
          { label: `${servicesActivation} por revisar`, tab: "servicios", tone: servicesActivation ? C.amber : C.green },
          { label: "Instalaciones", tab: "instalaciones", tone: C.blue },
          { label: "Incidencias", tab: "incidencias", tone: C.purple },
        ],
      },
      almacen: {
        title: "Mesa de almacén",
        text: "Atiende solicitudes, disponibilidad y entregas a proyectos.",
        actions: [
          { label: "Almacén", tab: "almacen", tone: C.blue },
          { label: "Materiales", tab: "materiales", tone: C.green },
          { label: "Aprobaciones", tab: "aprobaciones", tone: C.amber },
        ],
      },
      viewer: {
        title: "Mesa de consulta",
        text: "Puedes revisar información sin modificar datos operativos.",
        actions: [
          { label: "Dashboard", tab: "dashboard", tone: C.blue },
          { label: "Proyectos", tab: "proyectos", tone: C.green },
          { label: "Finanzas", tab: "finanzas", tone: C.purple },
        ],
      },
    };
    return map[rol] || map.viewer;
  })();

  if(!session)return <RuntimeErrorBoundary C={C}><LoginScreen C={C} onLogin={handleLogin}/></RuntimeErrorBoundary>;

  // Vista móvil SOLO para técnico. Almacén usa su vista desktop dedicada.
  const isMobileRol = rol==="tecnico";
  if(isMobileRol){
    const usuarios=repo.usuarios.list();
    return <RuntimeErrorBoundary C={C}>
      <Suspense fallback={<ViewLoading C={C} label="Cargando vista técnica..." />}>
        <MobileApp C={C} session={session} rol={rol} proyectos={proyectos} tecnicos={tecnicos} contratistas={contratistas} materiales={materiales} incidencias={incidencias} fichajes={fichajes} instalaciones={instalaciones} params={params} usuarios={usuarios} onSaveProyecto={saveProyecto} onSaveFichaje={saveFichaje} onSaveIncidencia={saveIncidencia} onSaveProyectoFoto={(pid,foto)=>{const ps=repo.proyectos.list();const i=ps.findIndex(x=>x.id===pid);if(i>=0){const next={...ps[i],fotos:[...(ps[i].fotos||[]),foto],updatedAt:new Date().toISOString()};saveProyecto(next);};}} onSaveSolicitud={(sol)=>{const ps=repo.proyectos.list();const i=ps.findIndex(x=>x.id===sol.proyectoId);if(i>=0){const next={...ps[i],solicitudesMaterial:[...(ps[i].solicitudesMaterial||[]),sol],updatedAt:new Date().toISOString()};saveProyecto(next);};}} onLogout={handleLogout}/>
        <AssistantFloatingButton C={C} onClick={()=>setAssistantOpen(true)}/>
        <AssistantPanel C={C} isLight={isLight} open={assistantOpen} onClose={()=>setAssistantOpen(false)} session={session}/>
      </Suspense>
    </RuntimeErrorBoundary>;
  }

  const goTab=id=>{if(!canSeeModule(id))return;setTab(id);if(id!=="clientes")setSelectedClienteId(null);};
  
  // Encontrar el grupo activo basado en el tab actual
  const activeGroup=TAB_GROUPS.find(g=>g.tabs.some(t=>t.id===tab))||TAB_GROUPS[0];
  const currentTabLabel=activeGroup.tabs.find(t=>t.id===tab)?.label||activeGroup.label;

  return <RuntimeErrorBoundary C={C}><div style={{background:C.bg0,minHeight:"100vh",color:C.text,fontFamily:ff,fontSize:14}}>
    <style>{`
      * { box-sizing: border-box; }
      html { background: ${C.bg0}; }
      body { background: ${C.bg0}; font-size: 14px; margin: 0; }
      .assur-topbar-brand, .assur-topbar-current { display: none !important; }
      .assur-app-grid { display: grid; grid-template-columns: 252px minmax(0,1fr); min-height: calc(100vh - 78px); }
      .assur-page-head { padding: 28px 30px 0; max-width: 1480px; margin: 0 auto; }
      .assur-page-body { padding: 0 30px 38px; max-width: 1480px; margin: 0 auto; }
      .assur-page-title-row { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
      .assur-kpi-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 16px; }
      .assur-two-col { display: grid; grid-template-columns: minmax(0,1.45fr) minmax(340px,0.95fr); gap: 18px; }
      .assur-three-col { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 18px; }
      .assur-card, .assur-stat { min-width: 0; }
      .assur-page-body table { width: 100%; border-collapse: collapse; }
      .assur-page-body button, .assur-page-body input, .assur-page-body select, .assur-page-body textarea { font-family: ${ff}; }
      .assur-page-body h1, .assur-page-body h2, .assur-page-body h3 { letter-spacing: 0 !important; }
      .assur-page-body, .assur-page-body p, .assur-page-body div, .assur-page-body td, .assur-page-body th { overflow-wrap: anywhere; }
      .assur-page-body th { color: ${C.textM} !important; font-size: 11px !important; letter-spacing: 0.06em !important; }
      .assur-page-body td { font-size: 13px; line-height: 1.35; }
      .assur-page-body h1 { font-size: clamp(24px, 3vw, 32px) !important; line-height: 1.08 !important; }
      .assur-page-body h2 { font-size: clamp(18px, 2vw, 22px) !important; line-height: 1.16 !important; }
      .assur-page-body [style*="font-size: 42"], .assur-page-body [style*="font-size:42"] { font-size: clamp(28px, 4vw, 36px) !important; }
      .assur-page-body [style*="font-size: 34"], .assur-page-body [style*="font-size:34"] { font-size: clamp(25px, 3vw, 32px) !important; }
      @media (max-width: 1180px) {
        .assur-topbar { padding: 10px 18px !important; min-height: 86px !important; align-items: flex-start !important; gap: 10px !important; }
        .assur-topbar-brand { display: flex !important; width: auto !important; min-width: 190px !important; padding-top: 4px; }
        .assur-topbar-actions { flex-wrap: wrap !important; gap: 8px !important; }
        .assur-topbar-search { order: 10; width: min(520px, 100%) !important; max-width: 100% !important; min-width: 220px !important; flex-basis: 100%; }
        .assur-app-grid { grid-template-columns: 232px minmax(0,1fr); min-height: calc(100vh - 86px); }
        .assur-sidebar { top: 86px !important; height: calc(100vh - 86px) !important; }
        .assur-page-head { padding: 24px 24px 0; }
        .assur-page-body { padding: 0 24px 30px; }
        .assur-kpi-grid { grid-template-columns: repeat(2,minmax(0,1fr)); }
        .assur-two-col, .assur-three-col { grid-template-columns: 1fr; }
        .assur-page-body [style*="repeat(4,1fr)"], .assur-page-body [style*="repeat(4, 1fr)"], .assur-page-body [style*="repeat(4,minmax"] { grid-template-columns: repeat(2,minmax(0,1fr)) !important; }
      }
      @media (max-width: 820px) {
        .assur-topbar { min-height: auto !important; position: static !important; }
        .assur-market-pill, .assur-theme-button, .assur-user-chip { display: none !important; }
        .assur-new-action-button { flex: 1 1 148px !important; justify-content: center !important; }
        .assur-app-grid { display: block; min-height: auto; }
        .assur-sidebar { position: static !important; height: auto !important; border-right: none !important; border-bottom: 1px solid ${C.border}; padding: 10px 14px !important; max-height: none !important; overflow-x: auto !important; overflow-y: hidden !important; }
        .assur-sidebar > div:first-child { display: none; }
        .assur-sidebar-brand { display: none !important; }
        .assur-sidebar > div:nth-child(2) { display: none !important; }
        .assur-sidebar-group { margin-bottom: 0 !important; }
        .assur-sidebar-group:not(.is-active) { display: none !important; }
        .assur-sidebar-group-title { display: none !important; }
        .assur-sidebar-tabs { display: flex !important; gap: 8px !important; margin-top: 0 !important; padding-left: 0 !important; overflow-x: auto !important; }
        .assur-sidebar button { width: auto !important; flex: 0 0 auto !important; padding: 10px 14px !important; white-space: nowrap !important; }
        .assur-sidebar button span { display: none !important; }
        .assur-page-head { padding: 18px 14px 0; }
        .assur-page-body { padding: 0 14px 24px; }
        .assur-page-title-row { align-items: flex-start; flex-direction: column; }
        .assur-page-title-row h1 { font-size: 24px !important; }
        .assur-role-brief { grid-template-columns: 1fr !important; padding: 13px !important; }
        .assur-role-actions { justify-content: flex-start !important; }
        .assur-role-actions button { flex: 1 1 140px; white-space: normal !important; line-height: 1.15 !important; }
        .assur-module-actions { justify-content: flex-start !important; }
        .assur-quick-actions, .assur-workflow { grid-template-columns: 1fr !important; }
        .assur-kpi-grid { grid-template-columns: 1fr; gap: 12px; }
        .assur-page-body [style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
        .assur-page-body [style*="display: grid"] { gap: 12px !important; }
        .assur-page-body table { display: block; overflow-x: auto; white-space: nowrap; }
      }
      @media (max-width: 560px) {
        .assur-topbar { padding: 12px 14px !important; }
        .assur-topbar-brand span:first-child { font-size: 14px !important; }
        .assur-topbar-search { min-width: 0 !important; }
        .assur-assistant-floating { bottom: 84px !important; right: 14px !important; padding: 11px 14px !important; font-size: 12px !important; }
        .assur-sidebar { max-height: none; }
        .assur-page-body, .assur-page-head { padding-left: 14px !important; padding-right: 14px !important; }
      }
    `}</style>
    <ShellTopBar
      C={C}
      isLight={isLight}
      params={params}
      usdValue={usdValue}
      sessionName={session.nombre}
      roleLabel={rolLabel(rol)}
      roleColor={rolColor(rol,C)}
      searchSlot={<GlobalSearch C={C} clientes={clientes} instalaciones={instalaciones} propuestas={propuestas} params={params} onGoClient={c=>{setSelectedClienteId(c.id);goTab("clientes");}} onGoTab={goTab} dark={!isLight}/>}
      showUsers={rol==="admin"}
      onToggleTheme={toggleTheme}
      onAssistant={()=>setAssistantOpen(true)}
      onUsers={()=>setUsersOpen(true)}
      onNewAction={()=>goTab(canSeeModule("solicitudes_cotizacion") ? "solicitudes_cotizacion" : "dashboard")}
      onLogout={handleLogout}
    />
    
    <div className="assur-app-grid">
      <ShellSidebar C={C} isLight={isLight} groups={TAB_GROUPS} activeGroup={activeGroup} tab={tab} canSeeModule={canSeeModule} goTab={goTab} currentTabLabel={currentTabLabel}/>

      <main style={{minWidth:0}}>
        {tab !== "dashboard" && <div className="assur-page-head">
          <div className="assur-page-title-row">
            <div>
              <div style={{fontSize:12,color:C.textM,textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:800,fontFamily:ff,marginBottom:6}}>{activeGroup.label}</div>
              <h1 style={{fontSize:30,lineHeight:1.15,margin:0,color:C.text,fontFamily:ff,fontWeight:850,letterSpacing:0}}>{currentTabLabel}</h1>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"9px 12px",fontSize:12,color:C.textM,fontFamily:ff}}>Rol: <strong style={{color:rolColor(rol,C)}}>{rolLabel(rol)}</strong></div>
            </div>
          </div>
          {roleWorkspace&&<div className="assur-role-brief" style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:16,alignItems:"center",background:C.bg1,border:"1px solid "+C.border,borderRadius:10,padding:"14px 16px",margin:"0 0 18px",boxShadow:C.isLight?"0 10px 26px rgba(15,23,42,0.05)":"none"}}>
            <div style={{minWidth:0}}>
              <div style={{fontSize:13,color:C.text,fontWeight:900,fontFamily:ff,lineHeight:1.2}}>{roleWorkspace.title}</div>
              <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:4,lineHeight:1.45}}>{roleWorkspace.text}</div>
            </div>
            <div className="assur-role-actions" style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}>
              {roleWorkspace.actions.filter(a=>canSeeModule(a.tab)).map(action=><button key={action.label} onClick={()=>goTab(action.tab)} style={{border:"1px solid "+action.tone+"44",background:action.tone+"12",color:action.tone,borderRadius:8,padding:"9px 11px",fontSize:12,fontWeight:900,fontFamily:ff,cursor:"pointer",whiteSpace:"nowrap",lineHeight:1}}>
                {action.label}
              </button>)}
            </div>
          </div>}
        </div>}
        <div className="assur-page-body">
      <Suspense fallback={<ViewLoading C={C} />}>
      {tab==="dashboard"&&<ExecutiveDashboard C={C} role={rol} sessionName={session.nombre} clientes={clientes} propuestas={propuestas} proyectos={proyectos} servicios={servicios} eventosServicio={eventosServicio} params={params} incidencias={incidencias} fichajes={fichajes} registrosHoras={registrosHoras} tecnicos={tecnicos} contratistas={contratistas} oportunidades={oportunidades} facturas={repo.facturas.list()} cuentasPagar={repo.cuentasPagar.list()} materiales={materiales} onGoTab={goTab}/>}
      {tab==="comercial_dashboard"&&<ComercialDashboardView C={C} oportunidades={oportunidades} propuestas={propuestas} clientes={clientes} onGoTab={goTab}/>}
      {tab==="pipeline"&&<PipelineView C={C} oportunidades={oportunidades} clientes={clientes} instalaciones={instalaciones} ejecutivos={ejecutivos} propuestas={propuestas} onSave={saveOportunidad} onDelete={deleteOportunidad} onConvertirAPropuesta={(opo)=>saveOportunidad({...opo,requiereCotizacion:true,etapa:"Solicitud de cotización",historial:[...(opo.historial||[]),{fecha:new Date().toISOString(),accion:"Solicitud enviada a Cotizaciones y Propuestas"}]})} readonly={readonly} createOpportunity={bOportunidad} nextOpportunityNumber={()=>{const cnt=parseInt(repo.opCounter.get()||"0")+1;repo.opCounter.set(String(cnt));return `OP-${new Date().getFullYear()}-${String(cnt).padStart(3,"0")}`;}}/>}
      {tab==="solicitudes_cotizacion"&&<SolicitudesCotizacionView C={C} oportunidades={oportunidades} clientes={clientes} instalaciones={instalaciones} propuestas={propuestas} onSaveOportunidad={saveOportunidad} onCrearPropuesta={createProposalFromOpportunity} readonly={!canDo("solicitudes_cotizacion","editar")&&!canDo("solicitudes_cotizacion","crear")}/>}
      {tab==="cotizacion_rapida"&&<PaquetesComercialesView C={C} mode="quick" paquetes={paquetesComerciales} materiales={materiales} clientes={clientes} instalaciones={instalaciones} params={params} onSave={savePaqueteComercial} onDelete={deletePaqueteComercial} onCreateQuickQuote={createQuickQuoteFromPackage} readonly={!canDo("cotizacion_rapida","crear")}/>}
      {tab==="clientes"&&(!selectedClienteId
        ?<ClientesView C={C} clientes={clientes} instalaciones={instalaciones} propuestas={propuestas} params={params} ejecutivos={ejecutivos} createCliente={bCliente} onSaveCliente={saveCliente} onDeleteCliente={deleteCliente} readonly={readonly} onSelect={c=>setSelectedClienteId(c.id)}/>
        :<ClienteDetalle C={C} cliente={clientes.find(c=>c.id===selectedClienteId)} clientes={clientes} instalaciones={instalaciones} propuestas={propuestas} params={params} categorias={categorias} ejecutivos={ejecutivos} onRefresh={loadAll} onBack={()=>setSelectedClienteId(null)} onCalc={p=>setCalcP(p)} onSaveCliente={saveCliente} onSaveInstalacion={saveInstalacion} onDeleteInstalacion={deleteInstalacion} readonly={readonly}/>)}
      {tab==="instalaciones"&&<InstalacionesView C={C} clientes={clientes} instalaciones={instalaciones} propuestas={propuestas} createInstalacion={bInstalacion} onSaveInstalacion={saveInstalacion} onDeleteInstalacion={deleteInstalacion} readonly={readonly}/>}
      {tab==="cotizaciones"&&<CotizacionesView C={C} cotizaciones={cotizaciones} plantillas={plantillasCot} clientes={clientes} instalaciones={instalaciones} materiales={materiales} params={params} propuestas={propuestas} onSave={saveCotizacion} onDelete={deleteCotizacion} onSavePlantilla={savePlantilla} onDeletePlantilla={deletePlantilla} readonly={readonly}/>}
      {tab==="bandeja_cotizaciones"&&<SolicitudesCotizacionView C={C} oportunidades={oportunidades} clientes={clientes} instalaciones={instalaciones} propuestas={propuestas} onSaveOportunidad={saveOportunidad} onCrearPropuesta={createProposalFromOpportunity} readonly={readonly}/>}
      {tab==="paquetes"&&<PaquetesComercialesView C={C} paquetes={paquetesComerciales} materiales={materiales} clientes={clientes} instalaciones={instalaciones} params={params} onSave={savePaqueteComercial} onDelete={deletePaqueteComercial} onCreateQuickQuote={createQuickQuoteFromPackage} readonly={readonly}/>}
      {tab==="propuestas"&&<PropuestasView C={C} clientes={clientes} instalaciones={instalaciones} propuestas={propuestas} cotizaciones={cotizaciones} params={params} categorias={categorias} ejecutivos={ejecutivos} proyectos={proyectos} onRefresh={loadAll} onCalc={p=>setCalcP(p)} onConvertir={p=>{const proy=bProyecto(p,clientes,instalaciones);saveProyecto(proy);goTab("proyectos");}} readonly={readonly}/> }
      {tab==="proyectos"&&<ProyectosView C={C} clientes={clientes} instalaciones={instalaciones} propuestas={propuestas} proyectos={proyectos} servicios={servicios} ejecutivos={ejecutivos} params={params} tecnicos={tecnicos} contratistas={contratistas} materiales={materiales} registrosHoras={registrosHoras} incidencias={incidencias} fichajes={fichajes} facturasFin={repo.facturas.list()} pagosFin={repo.pagos.list()} usuarios={repo.usuarios.list()} newId={newId} onSave={saveProyecto} onDelete={deleteProyecto} onSaveServicio={saveServicio} onGoTab={goTab} onSaveRegistroHora={saveRegistroHora} onSaveBulkHoras={saveRegistrosHorasBulk} onDeleteRegistroHora={deleteRegistroHora} onSaveIncidencia={saveIncidencia} onDeleteIncidencia={deleteIncidencia} onSaveMaterial={saveMaterial} readonly={readonly}/> }
      {tab==="servicios"&&<ServiciosRecurrentesView C={C} servicios={servicios} eventosServicio={eventosServicio} clientes={clientes} instalaciones={instalaciones} proyectos={proyectos} propuestas={propuestas} params={params} facturas={repo.facturas.list()} onSave={saveServicio} onDelete={deleteServicio} onSaveProyecto={saveProyecto} onSaveEvento={saveEventoServicio} onDeleteEvento={deleteEventoServicio} readonly={readonly} onGoTab={goTab} ui={{Card,STitle,Btn,Bdg,ModuleHero,QuickActions,WorkflowSteps,Sel,Inp,Fld,G,Modal,Stat,EmptyState,fmtCLP,ff,id:newId}}/>}
      {tab==="aprobaciones"&&<AprobacionesOperativasView C={C} proyectos={proyectos} clientes={clientes} tecnicos={tecnicos} contratistas={contratistas} materiales={materiales} registrosHoras={registrosHoras} incidencias={incidencias} onSaveProyecto={saveProyecto} onSaveRegistroHora={saveRegistroHora} onSaveBulkHoras={saveRegistrosHorasBulk} onSaveIncidencia={saveIncidencia} onSaveMaterial={saveMaterial} readonly={readonly} onGoTab={goTab}/>}
      {tab==="supervisor"&&<SupervisorView C={C} proyectos={proyectos} clientes={clientes} tecnicos={tecnicos} contratistas={contratistas} registrosHoras={registrosHoras} incidencias={incidencias} fichajes={fichajes} onGoTab={goTab}/>}
      {tab==="personal"&&<PersonalView C={C} tecnicos={tecnicos} contratistas={contratistas} params={params} proyectos={proyectos} onSaveTecnico={saveTecnico} onDeleteTecnico={deleteTecnico} onSaveContratista={saveContratista} onDeleteContratista={deleteContratista} readonly={readonly}/>}
      {tab==="materiales"&&<MaterialesView C={C} materiales={materiales} proyectos={proyectos} params={params} onSave={saveMaterial} onDelete={deleteMaterial} onSaveProyecto={saveProyecto} readonly={readonly}/>}
      {tab==="almacen"&&<AlmacenView C={C} proyectos={proyectos} materiales={materiales} onSaveProyecto={saveProyecto} onSaveMaterial={saveMaterial} readonly={readonly}/>}
      {tab==="incidencias"&&<IncidenciasView C={C} incidencias={incidencias} proyectos={proyectos} tecnicos={tecnicos} clientes={clientes} params={params} onSave={saveIncidencia} onDelete={deleteIncidencia} onSaveProyecto={saveProyecto} readonly={readonly}/>}
      {tab==="analisis"&&<AnalisisView C={C} clientes={clientes} instalaciones={instalaciones} propuestas={propuestas} proyectos={proyectos} registrosHoras={registrosHoras} params={params} categorias={categorias}/>}
      {tab==="hitos"&&<ControlFinancieroView C={C} proyectos={proyectos} clientes={clientes} servicios={servicios} params={params} onSaveProyecto={saveProyecto} onRefresh={loadAll} readonly={readonly}/>}
      {tab==="finanzas"&&<FinanzasView C={C} clientes={clientes} proyectos={proyectos} params={params} onSaveCliente={saveCliente} onSaveProyecto={saveProyecto} readonly={readonly}/>}
      {tab==="config"&&<ConfigView C={C} params={params} categorias={categorias} onSaveParams={saveParams} onSaveCats={saveCats} ejecutivos={ejecutivos} onSaveEjecs={saveEjecs} permisos={permisos} onSavePermisos={savePermisos} readonly={readonly}/>}
      </Suspense>
        </div>
      </main>
    </div>
    {calcP&&<Calculadora C={C} propuesta={calcP} cliente={clientes.find(c=>c.id===calcP.clienteId)||null} instalacion={instalaciones.find(i=>i.id===calcP.instalacionId)||null} params={params} onClose={()=>setCalcP(null)}/>}
    <AssistantPanel C={C} isLight={isLight} open={assistantOpen} onClose={()=>setAssistantOpen(false)} session={session}/>
    {usersOpen&&<Suspense fallback={null}><UsuariosView C={C} currentUser={session} permisos={permisos} onSavePermisos={savePermisos} onClose={()=>setUsersOpen(false)}/></Suspense>}
  </div></RuntimeErrorBoundary>;
}
