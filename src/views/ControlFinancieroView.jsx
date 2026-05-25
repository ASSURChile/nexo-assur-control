import { useState } from "react";
import { ff } from "../config/appConstants";
import { Bdg, Btn, Card, EmptyState, Fld, G, Inp, Modal, Sel, SelBusca, Stat, STitle } from "../components/ui";
import { dataService } from "../services/dataService";
import { repositories as repo } from "../services/repositories";
import {
  deleteFacturaFromBackendQuiet,
  syncFacturaToBackendQuiet,
  syncFacturasToBackendQuiet,
  syncPagoToBackendQuiet,
} from "../services/financialBackendService";
import { syncProyectoToBackendQuiet } from "../services/operationalBackendService";
import {
  calcFinanceSummary,
  diasHasta,
  montoCxp,
  montoFactura,
  reconcileSoftlandFinancials,
  saldoFactura,
  vencCxp,
  vencFactura,
} from "../domain/finance";
import { reconcileBillingExpectations } from "../domain/recurringServices";
import {
  deleteSupabaseNormalizedEntityQuiet,
  syncSupabaseNormalizedEntityQuiet,
} from "../services/supabaseNormalizedSyncService";

const newId = () => dataService.id();

const fmtCLP = (n) => (!n && n !== 0 ? "—" : "$ " + Math.round(n).toLocaleString("es-CL"));
const asArray=value=>Array.isArray(value)?value:[];
const text=value=>String(value||"");

const ESTADOS_HITO=["Pendiente","Condición cumplida","Facturado","Cobrado","Vencido"];
const COL_HITO={Pendiente:C=>C.textM,"Condición cumplida":C=>C.amber,Facturado:C=>C.blue,Cobrado:C=>C.green,Vencido:C=>C.red};

// ─────────────────────────────────────────────────────────────────────────────
// CONTROL FINANCIERO — Vista de control de facturación, cobranza y aging
// Datos pueden venir manuales o importados desde Softland (config → Integraciones)
// Assur Control NO emite facturas — solo registra referencias para gestión
// ─────────────────────────────────────────────────────────────────────────────
export default function ControlFinancieroView({C,proyectos,clientes,servicios,params,onSaveProyecto,onRefresh,readonly}){
  const [vista,setVista]=useState("resumen"); // resumen | hitos | facturas | pagos
  const [modal,setModal]=useState(null);
  const [filtroEstado,setFiltroEstado]=useState("todos");

  // Datos
  const facturas=asArray(repo.facturas.list());
  const pagos=asArray(repo.pagos.list());
  const cuentasPorPagar=asArray(repo.cuentasPagar.list());
  const gastos=asArray(repo.gastos.list());
  const billingExpectations=asArray(repo.serviceBillingExpectations.list());
  const serviciosActivos=(servicios||[]).filter(s=>s.estado==="Activo");
  const serviciosEnActivacion=(servicios||[]).filter(s=>s.estado==="En activación");
  const facturacionRecurrenteEsperada=serviciosActivos.reduce((s,x)=>s+(x.valorMensual||0),0);
  const mrrEnActivacion=serviciosEnActivacion.reduce((s,x)=>s+(x.valorMensual||0),0);

  // Helper guardar factura/pago
  const saveFactura=f=>{
    const factura={...f,updatedAt:f.updatedAt||new Date().toISOString()};
    repo.facturas.save(factura);
    syncFacturaToBackendQuiet(factura);
    if(f.proyectoId&&f.hitoId){
      const ps=repo.proyectos.list();
      const pi=ps.findIndex(p=>p.id===f.proyectoId);
      if(pi>=0){
        const hs=(ps[pi].hitosFacturacion||[]).map(h=>h.id===f.hitoId?{
          ...h,
          estado:(f.montoPagado||0)>=(f.monto||0)&&f.monto>0?"Cobrado":"Facturado",
          nroFactura:f.folio,
          facturaId:f.id,
          fechaFacturacion:f.fechaEmision||h.fechaFacturacion
        }:h);
        ps[pi]={...ps[pi],hitosFacturacion:hs,updatedAt:new Date().toISOString()};
        repo.proyectos.replaceAll(ps);
        syncProyectoToBackendQuiet(ps[pi]);
      }
    }
    syncSupabaseNormalizedEntityQuiet("facturas",factura.id);
    onRefresh();
  };
  const deleteFactura=id=>{repo.facturas.remove(id);deleteFacturaFromBackendQuiet(id);deleteSupabaseNormalizedEntityQuiet("facturas",id);onRefresh();};
  const savePago=p=>{const pago={...p,updatedAt:p.updatedAt||new Date().toISOString()};repo.pagos.save(pago);syncPagoToBackendQuiet(pago);syncSupabaseNormalizedEntityQuiet("pagos",pago.id);onRefresh();};

  // Recolectar todos los hitos del sistema
  const todosHitos=asArray(proyectos).flatMap(p=>asArray(p.hitosFacturacion).map(h=>({...h,proyecto:p,cliente:asArray(clientes).find(c=>c.id===p.clienteId)})));

  // KPIs financieros
  const hoy=new Date().toISOString().slice(0,10);
  const {
    cxcPendientes,
    cxcTotal,
    cxcVencidas,
    montoVencido,
    cxpPendientes,
    totalCxp,
    cxpVencidas,
    montoCxpVencido,
    capitalTrabajo,
    aging,
    proxVencer,
    gastoRecurrenteMensual,
    cajaProyectada,
    ingresos90,
    egresos90,
    saldo90,
    liquidez90,
    cxp30,
  } = calcFinanceSummary({ facturas, cuentasPorPagar, gastos, hoy });
  const recurringReconciliation=reconcileBillingExpectations({expectations:billingExpectations,facturas,servicios,clientes,hoy});
  const softlandReconciliation=reconcileSoftlandFinancials({clientes,proyectos,facturas,pagos,cuentasPorPagar});
  const expectativasPendientes=recurringReconciliation.rows.filter(x=>x.reconciledStatus==="Esperada"||x.reconciledStatus==="Vencida");

  // Hitos pendientes de facturar
  const hitosListos=todosHitos.filter(h=>h.estado==="Cumplida"||h.estado==="Condición cumplida");

  // Pills helper
  const pill=(bg,col,t)=><span style={{fontSize:10,padding:"2px 8px",borderRadius:12,fontWeight:500,background:bg,color:col,display:"inline-block"}}>{t}</span>;
  const card={background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"16px 18px",boxShadow:C.isLight?"0 10px 28px rgba(20,35,55,0.045)":"none"};
  const tabBtn=on=>({padding:"10px 14px",cursor:"pointer",fontSize:12,fontWeight:on?900:700,background:on?C.blue+"12":"transparent",color:on?C.blue:C.textM,border:"1px solid "+(on?C.blue+"55":C.border),borderRadius:8,fontFamily:ff});

  // Sub-tabs
  return <div>
    <div style={{...card,padding:20,marginBottom:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16,flexWrap:"wrap",gap:18}}>
        <div>
          <div style={{fontSize:11,color:C.blue,textTransform:"uppercase",letterSpacing:"0.14em",fontWeight:900,fontFamily:ff,marginBottom:7}}>Gestión financiera</div>
          <div style={{margin:0,fontSize:22,fontWeight:850,color:C.text,fontFamily:ff,lineHeight:1.1}}>Control financiero</div>
          <div style={{fontSize:13,color:C.textM,fontFamily:ff,marginTop:6}}>Hitos, facturación, cobranza, aging y caja. Softland sigue siendo la fuente contable formal.</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(140px,1fr))",gap:10}}>
          <div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:8,padding:"11px 12px"}}>
            <div style={{fontSize:10,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:900,fontFamily:ff}}>CxC</div>
            <div style={{fontSize:20,color:C.blue,fontWeight:900,fontFamily:ff,marginTop:4}}>{fmtCLP(cxcTotal)}</div>
          </div>
          <div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:8,padding:"11px 12px"}}>
            <div style={{fontSize:10,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:900,fontFamily:ff}}>Caja 90 días</div>
            <div style={{fontSize:20,color:saldo90>=0?C.green:C.red,fontWeight:900,fontFamily:ff,marginTop:4}}>{fmtCLP(saldo90)}</div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
      {[["resumen","Resumen"],["recurrente","Recurrente esperado"],["caja","Caja 30/60/90"],["cxp","Cuentas por pagar"],["hitos","Hitos por facturar"],["facturas","Facturas emitidas"],["pagos","Pagos recibidos"]].map(([id,lbl])=>
        <button key={id} onClick={()=>setVista(id)} style={tabBtn(vista===id)}>{lbl}</button>
      )}
      </div>
    </div>

    {/* ═══════════ RESUMEN ═══════════ */}
    {vista==="resumen"&&<div>
      {/* KPIs principales */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[
          {l:"Cuentas por cobrar",v:fmtCLP(cxcTotal),sub:`${cxcPendientes.length} facturas pendientes`,c:C.blue},
          {l:"Cuentas por pagar",v:fmtCLP(totalCxp),sub:`${cxpPendientes.length} documentos pendientes`,c:totalCxp>0?C.amber:C.green},
          {l:"Caja 90 días",v:fmtCLP(saldo90),sub:`Ingresos ${fmtCLP(ingresos90)} · Egresos ${fmtCLP(egresos90)}`,c:saldo90>=0?C.green:C.red},
          {l:"Capital trabajo",v:fmtCLP(capitalTrabajo),sub:"CxC pendiente - CxP pendiente",c:capitalTrabajo>=0?C.blue:C.red},
        ].map(k=><div key={k.l} style={card}>
          <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:ff,fontWeight:500}}>{k.l}</div>
          <div style={{fontSize:k.v.length>12?14:18,fontWeight:600,color:k.c,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
          <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginTop:2}}>{k.sub}</div>
        </div>)}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[
          {l:"CxC vencida",v:fmtCLP(montoVencido),sub:`${cxcVencidas.length} facturas vencidas`,c:montoVencido>0?C.red:C.green},
          {l:"CxP vencida",v:fmtCLP(montoCxpVencido),sub:`${cxpVencidas.length} documentos vencidos`,c:montoCxpVencido>0?C.red:C.green},
          {l:"Liquidez 90 días",v:fmtCLP(liquidez90),sub:"Capital trabajo + saldo caja 90d",c:liquidez90>=0?C.green:C.red},
          {l:"Hitos por facturar",v:fmtCLP(hitosListos.reduce((s,h)=>s+(h.monto||0),0)),sub:`${hitosListos.length} hitos cumplidos`,c:C.purple},
        ].map(k=><div key={k.l} style={{...card,background:C.bg2}}>
          <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:ff,fontWeight:500}}>{k.l}</div>
          <div style={{fontSize:k.v.length>12?14:17,fontWeight:600,color:k.c,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
          <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginTop:2}}>{k.sub}</div>
        </div>)}
      </div>

      <div style={{...card,marginBottom:14,borderColor:C.blue+"44"}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <div>
            <div style={{fontSize:11,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:800}}>Conciliación Softland</div>
            <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:4}}>Cruce automático por RUT, centro de costo, folio y proyecto para detectar pendientes de vincular.</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(120px,1fr))",gap:8,flex:1,maxWidth:680}}>
            <Stat C={C} label="Facturas con cliente" value={`${softlandReconciliation.summary.facturasConCliente}/${softlandReconciliation.summary.facturas}`} color={C.blue}/>
            <Stat C={C} label="Facturas con proyecto" value={`${softlandReconciliation.summary.facturasConProyecto}/${softlandReconciliation.summary.facturas}`} color={C.green}/>
            <Stat C={C} label="Facturas con pagos" value={`${softlandReconciliation.summary.facturasConPagos}/${softlandReconciliation.summary.facturas}`} color={C.amber}/>
            <Stat C={C} label="CxP con proyecto" value={`${softlandReconciliation.summary.cuentasPagarConProyecto}/${softlandReconciliation.summary.cuentasPagar}`} color={C.purple}/>
          </div>
        </div>
      </div>

      {/* Aging cobranza */}
      <div style={{...card,marginBottom:14}}>
        <div style={{fontSize:11,color:C.textM,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:500,marginBottom:14}}>Aging de cobranza</div>
        {cxcVencidas.length===0
          ?<div style={{padding:"16px 0",textAlign:"center",color:C.green,fontSize:13,fontFamily:ff}}>✓ Sin facturas vencidas. Cobranza al día.</div>
          :<div>
            <div style={{display:"flex",gap:0,height:30,borderRadius:4,overflow:"hidden",border:"1px solid "+C.border,marginBottom:10}}>
              {Object.entries(aging).map(([rango,monto],i)=>{
                const pct=montoVencido>0?monto/montoVencido*100:0;
                if(pct===0)return null;
                const colors=[C.amber,"#F59E0B",C.red,"#991B1B"];
                return <div key={rango} style={{width:`${pct}%`,background:colors[i],display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",fontWeight:600,fontFamily:ff}}>
                  {pct>10&&`${rango} días`}
                </div>;
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              {Object.entries(aging).map(([rango,monto])=>{
                const colors=[C.amber,"#F59E0B",C.red,"#991B1B"];
                const idx=["0-30","30-60","60-90","+90"].indexOf(rango);
                return <div key={rango} style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:6,padding:"10px 12px"}}>
                  <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{rango} días</div>
                  <div style={{fontSize:15,fontWeight:600,color:colors[idx],fontFamily:ff,marginTop:3,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(monto)}</div>
                </div>;
              })}
            </div>
          </div>
        }
      </div>

      {/* Próximas vencer */}
      {proxVencer.length>0&&<div style={{...card,marginBottom:14,borderColor:C.amber+"55"}}>
        <div style={{fontSize:11,color:C.amber,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600,marginBottom:10}}>⚠ Próximas a vencer (7 días)</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {proxVencer.slice(0,5).map(f=>{
            const cli=clientes.find(c=>c.rut===f.rutCliente);
            const dias=Math.floor((new Date(vencFactura(f))-new Date(hoy))/(1000*60*60*24));
            return <div key={f.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
              <span style={{fontSize:11,fontFamily:"monospace",color:C.textM,minWidth:80}}>{f.folio}</span>
              <span style={{fontSize:12,fontWeight:500,color:C.text,flex:1,fontFamily:ff}}>{cli?.razonSocial||f.rutCliente||"—"}</span>
              <span style={{fontSize:11,color:C.amber,fontFamily:ff,fontWeight:600}}>en {dias}d</span>
              <span style={{fontSize:12,fontWeight:600,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(saldoFactura(f))}</span>
            </div>;
          })}
        </div>
      </div>}

      {/* Hitos listos para facturar */}
      {hitosListos.length>0&&<div style={card}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:11,color:C.green,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600}}>Hitos listos para facturar</div>
          <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{hitosListos.length} pendientes</span>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {hitosListos.slice(0,5).map((h,i)=>(
            <div key={h.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
              <span style={pill(C.green+"22",C.green,h.estado||"Cumplida")}/>
              <div style={{flex:1}}>
                <div style={{fontSize:12,fontWeight:500,color:C.text,fontFamily:ff}}>{h.nombre||"Hito sin nombre"}</div>
                <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{h.proyecto?.numero} · {h.cliente?.razonSocial||"—"}</div>
              </div>
              <span style={{fontSize:13,fontWeight:600,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(h.monto||0)}</span>
            </div>
          ))}
        </div>
      </div>}
      {serviciosActivos.length>0&&<div style={{...card,marginTop:14,borderColor:C.green+"55"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:11,color:C.green,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600}}>Facturación recurrente esperada</div>
          <span style={{fontSize:13,color:C.green,fontFamily:ff,fontWeight:700}}>{fmtCLP(facturacionRecurrenteEsperada)}/mes</span>
        </div>
        <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:9}}>ASSUR Control no emite estas facturas; las deja como expectativa mensual conciliable con Softland. Hay {expectativasPendientes.length} expectativas abiertas o vencidas para próximos meses.</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {serviciosActivos.slice(0,6).map(s=>{
            const cli=clientes.find(c=>c.id===s.clienteId);
            return <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
              <Bdg color={C.green} small>Activo</Bdg>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{cli?.razonSocial||"Sin cliente"}</div><div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{s.codigo||"—"} · {s.tipoServicio}</div></div>
              <span style={{fontSize:12,fontWeight:700,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(s.valorMensual||0)}</span>
            </div>;
          })}
        </div>
      </div>}
      {serviciosEnActivacion.length>0&&<div style={{...card,marginTop:14,borderColor:C.amber+"55"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
          <div style={{fontSize:11,color:C.amber,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600}}>MRR pendiente de activación</div>
          <span style={{fontSize:13,color:C.amber,fontFamily:ff,fontWeight:700}}>{fmtCLP(mrrEnActivacion)}/mes</span>
        </div>
        <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:9}}>Estos servicios aún no deben facturarse como recurrentes. Finanzas puede ver el potencial y esperar la activación/protocolo antes de conciliar con Softland.</div>
        <div style={{display:"flex",flexDirection:"column",gap:6}}>
          {serviciosEnActivacion.slice(0,6).map(s=>{
            const cli=clientes.find(c=>c.id===s.clienteId);
            return <div key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
              <Bdg color={C.amber} small>En activación</Bdg>
              <div style={{flex:1,minWidth:0}}><div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{cli?.razonSocial||"Sin cliente"}</div><div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{s.codigo||"—"} · {s.tipoServicio} · inicio {s.fechaInicio||"pendiente"}</div></div>
              <span style={{fontSize:12,fontWeight:700,color:C.amber,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(s.valorMensual||0)}</span>
            </div>;
          })}
        </div>
      </div>}
    </div>}

    {vista==="recurrente"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[
          {l:"Esperado total",v:fmtCLP(recurringReconciliation.summary.total),sub:`${recurringReconciliation.rows.length} expectativas`,c:C.blue},
          {l:"Facturado/Pagado",v:fmtCLP(recurringReconciliation.summary.montoFacturado+recurringReconciliation.summary.montoPagado),sub:`${recurringReconciliation.summary.facturadas+recurringReconciliation.summary.pagadas} conciliadas`,c:C.green},
          {l:"Pendiente esperado",v:fmtCLP(recurringReconciliation.summary.montoEsperado),sub:`${recurringReconciliation.summary.esperadas} por confirmar`,c:C.amber},
          {l:"En activación",v:fmtCLP(mrrEnActivacion),sub:`${serviciosEnActivacion.length} servicios aún no facturables`,c:serviciosEnActivacion.length?C.amber:C.green},
        ].map(k=><div key={k.l} style={card}>
          <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:ff,fontWeight:700}}>{k.l}</div>
          <div style={{fontSize:k.v.length>12?16:22,fontWeight:800,color:k.c,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
          <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:3}}>{k.sub}</div>
        </div>)}
      </div>
      <div style={card}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:12}}>
          <div>
            <div style={{fontSize:11,color:C.blue,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:700}}>Conciliación recurrente</div>
            <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>Cruza servicios activos esperados con facturas reales importadas o registradas desde Softland.</div>
          </div>
          <Bdg color={recurringReconciliation.summary.vencidas?C.red:C.green}>{recurringReconciliation.summary.vencidas?"Revisar vencidas":"Sin vencidas"}</Bdg>
        </div>
        {recurringReconciliation.rows.length===0
          ?<EmptyState C={C} icon="·" title="Sin expectativas recurrentes" sub="Activa servicios recurrentes para generar expectativas mensuales conciliables con Softland."/>
          :<div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead><tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
                {["Estado","Mes","Servicio","Cliente","Esperado","Factura Softland","Diferencia"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:9,color:C.textM,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}
              </tr></thead>
              <tbody>
                {recurringReconciliation.rows.map((r,i)=>{
                  const cli=clientes.find(c=>c.id===r.clienteId);
                  const color=r.reconciledStatus==="Pagada"?C.green:r.reconciledStatus==="Facturada"?C.blue:r.reconciledStatus==="Vencida"?C.red:C.amber;
                  return <tr key={r.id||i} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent"}}>
                    <td style={{padding:"8px 12px"}}><Bdg color={color} small>{r.reconciledStatus}</Bdg></td>
                    <td style={{padding:"8px 12px",fontFamily:"monospace",fontSize:11,color:C.textS}}>{r.expectedMonth||"—"}</td>
                    <td style={{padding:"8px 12px",fontSize:12,color:C.text,fontWeight:600}}>{r.servicio?.codigo||r.servicioId||"—"}<div style={{fontSize:10,color:C.textM,fontWeight:400}}>{r.servicio?.tipoServicio||"Servicio recurrente"}</div></td>
                    <td style={{padding:"8px 12px",fontSize:12,color:C.textS}}>{cli?.razonSocial||"—"}</td>
                    <td style={{padding:"8px 12px",fontSize:12,color:C.green,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(r.expectedAmount||0)}</td>
                    <td style={{padding:"8px 12px",fontSize:12,color:r.factura?C.text:C.textM}}>{r.factura?.folio||"Sin factura"}{r.factura&&<div style={{fontSize:10,color:C.textM}}>{fmtCLP(montoFactura(r.factura))} · {r.factura.fechaEmision||"s/f"}</div>}</td>
                    <td style={{padding:"8px 12px",fontSize:12,color:r.deltaAmount===null?C.textM:Math.abs(r.deltaAmount)<=1?C.green:r.deltaAmount<0?C.red:C.amber,fontWeight:700}}>{r.deltaAmount===null?"—":fmtCLP(r.deltaAmount)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>}
      </div>
    </div>}

    {/* ═══════════ CAJA 30/60/90 ═══════════ */}
    {vista==="caja"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[
          {l:"Ingresos esperados 90d",v:fmtCLP(ingresos90),sub:`${cxcPendientes.length} facturas por cobrar`,c:C.green},
          {l:"Egresos esperados 90d",v:fmtCLP(egresos90),sub:`CxP ${fmtCLP(totalCxp)} · Rec. ${fmtCLP(gastoRecurrenteMensual)}/mes`,c:C.red},
          {l:"Saldo proyectado 90d",v:fmtCLP(saldo90),sub:saldo90>=0?"proyección positiva":"déficit proyectado",c:saldo90>=0?C.blue:C.red},
          {l:"CxC vencida hoy",v:fmtCLP(montoVencido),sub:`${cxcVencidas.length} facturas vencidas`,c:montoVencido>0?C.red:C.green},
        ].map(k=><div key={k.l} style={card}>
          <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:ff,fontWeight:500}}>{k.l}</div>
          <div style={{fontSize:k.v.length>12?14:18,fontWeight:600,color:k.c,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
          <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginTop:2}}>{k.sub}</div>
        </div>)}
      </div>

      <div style={{...card,marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontSize:11,color:C.textM,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600}}>Proyección por ventana</div>
          <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Basado en vencimientos CxC/CxP y gastos recurrentes</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {cajaProyectada.map(b=><div key={b.id} style={{background:C.bg2,border:"1px solid "+(b.saldo>=0?C.border:C.red+"55"),borderRadius:7,padding:"12px 14px"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:ff}}>{b.label}</div>
              <Bdg color={b.saldo>=0?C.green:C.red} small>{b.saldo>=0?"OK":"Déficit"}</Bdg>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontFamily:ff,marginBottom:5}}>
              <span style={{color:C.textM}}>Cobros esperados</span>
              <span style={{color:C.green,fontWeight:600}}>{fmtCLP(b.ingresos)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontFamily:ff,marginBottom:5}}>
              <span style={{color:C.textM}}>Pagos proveedores</span>
              <span style={{color:C.red,fontWeight:600}}>{fmtCLP(b.egresosCxp)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontFamily:ff,marginBottom:8}}>
              <span style={{color:C.textM}}>Gastos recurrentes</span>
              <span style={{color:C.amber,fontWeight:600}}>{fmtCLP(b.egresosRecurrentes)}</span>
            </div>
            <div style={{borderTop:"1px solid "+C.border,paddingTop:8,display:"flex",justifyContent:"space-between",fontSize:13,fontFamily:ff}}>
              <span style={{color:C.text,fontWeight:700}}>Saldo ventana</span>
              <span style={{color:b.saldo>=0?C.green:C.red,fontWeight:700}}>{fmtCLP(b.saldo)}</span>
            </div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontFamily:ff,marginTop:5}}>
              <span style={{color:C.textM}}>Acumulado</span>
              <span style={{color:b.saldoAcum>=0?C.blue:C.red,fontWeight:600}}>{fmtCLP(b.saldoAcum)}</span>
            </div>
          </div>)}
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={card}>
          <div style={{fontSize:11,color:C.green,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600,marginBottom:10}}>Próximos cobros</div>
          {cxcPendientes.filter(f=>diasHasta(vencFactura(f))!==null&&diasHasta(vencFactura(f))>=0&&diasHasta(vencFactura(f))<=90).length===0
            ?<EmptyState C={C} icon="·" title="Sin cobros proyectados" sub="No hay facturas con vencimiento en los próximos 90 días."/>
            :<div style={{display:"flex",flexDirection:"column",gap:6}}>
              {cxcPendientes
                .filter(f=>diasHasta(vencFactura(f))!==null&&diasHasta(vencFactura(f))>=0&&diasHasta(vencFactura(f))<=90)
                .sort((a,b)=>text(vencFactura(a)).localeCompare(text(vencFactura(b))))
                .slice(0,8)
                .map(f=>{
                  const cli=clientes.find(c=>c.rut===f.rutCliente);
                  return <div key={f.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 10px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
                    <span style={{fontSize:11,fontFamily:"monospace",color:C.textM,width:76}}>{vencFactura(f)||"—"}</span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cli?.razonSocial||f.rutCliente||"—"}</div>
                      <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{f.folio||f.numeroFactura||"—"}</div>
                    </div>
                    <span style={{fontSize:12,fontWeight:700,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(saldoFactura(f))}</span>
                  </div>;
                })}
            </div>
          }
        </div>
        <div style={card}>
          <div style={{fontSize:11,color:C.red,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,fontWeight:600,marginBottom:10}}>Próximos pagos</div>
          {cxpPendientes.filter(c=>diasHasta(vencCxp(c))!==null&&diasHasta(vencCxp(c))>=0&&diasHasta(vencCxp(c))<=90).length===0
            ?<EmptyState C={C} icon="·" title="Sin pagos proyectados" sub="No hay CxP con vencimiento en los próximos 90 días."/>
            :<div style={{display:"flex",flexDirection:"column",gap:6}}>
              {cxpPendientes
                .filter(c=>diasHasta(vencCxp(c))!==null&&diasHasta(vencCxp(c))>=0&&diasHasta(vencCxp(c))<=90)
                .sort((a,b)=>text(vencCxp(a)).localeCompare(text(vencCxp(b))))
                .slice(0,8)
                .map(c=><div key={c.id} style={{display:"flex",gap:10,alignItems:"center",padding:"8px 10px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
                  <span style={{fontSize:11,fontFamily:"monospace",color:C.textM,width:76}}>{vencCxp(c)||"—"}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.proveedor||"Proveedor"}</div>
                    <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{c.numeroDocumento||"—"}</div>
                  </div>
                  <span style={{fontSize:12,fontWeight:700,color:C.red,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(montoCxp(c))}</span>
                </div>)}
            </div>
          }
        </div>
      </div>
    </div>}

    {/* ═══════════ CUENTAS POR PAGAR ═══════════ */}
    {vista==="cxp"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[
          {l:"Total por pagar",v:fmtCLP(totalCxp),sub:`${cxpPendientes.length} documentos pendientes`,c:C.amber},
          {l:"Vencido",v:fmtCLP(montoCxpVencido),sub:`${cxpVencidas.length} vencidos`,c:montoCxpVencido>0?C.red:C.green},
          {l:"Próximos 30 días",v:fmtCLP(cxp30),sub:"según fecha de vencimiento",c:cxp30>0?C.blue:C.green},
          {l:"Impacto caja 90d",v:fmtCLP(egresos90),sub:"CxP + gastos recurrentes",c:C.red},
        ].map(k=><div key={k.l} style={card}>
          <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:ff,fontWeight:500}}>{k.l}</div>
          <div style={{fontSize:k.v.length>12?14:18,fontWeight:600,color:k.c,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
          <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginTop:2}}>{k.sub}</div>
        </div>)}
      </div>

      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[["todos","Todas"],["pendientes","Pendientes"],["vencidas","Vencidas"],["pagadas","Pagadas"]].map(([id,lbl])=>{
            const on=filtroEstado===id;
            return <button key={id} onClick={()=>setFiltroEstado(id)} style={{padding:"5px 12px",borderRadius:20,border:"1px solid "+(on?C.blue:C.border),background:on?C.blue+"22":"transparent",color:on?C.blue:C.textM,fontSize:11,fontWeight:on?600:400,cursor:"pointer",fontFamily:ff}}>{lbl}</button>;
          })}
        </div>
        {!readonly&&<Btn C={C} ghost small onClick={()=>{alert("Para importación masiva: ve a Configuración → Integraciones → Cuentas por pagar");}}>📥 Importar Softland</Btn>}
      </div>

      {(()=>{
        const filtradas=cuentasPorPagar.filter(c=>{
          const saldo=montoCxp(c);
          const vencida=saldo>0&&vencCxp(c)&&vencCxp(c)<hoy;
          if(filtroEstado==="pendientes")return saldo>0&&c.estado!=="Anulada"&&c.estado!=="Pagada";
          if(filtroEstado==="vencidas")return vencida;
          if(filtroEstado==="pagadas")return saldo<=0||c.estado==="Pagada";
          return true;
        });
        if(filtradas.length===0)return <EmptyState C={C} icon="·" title="Sin cuentas por pagar" sub="Importa CxP desde Softland para alimentar caja proyectada y capital de trabajo."/>;
        return <div style={card}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff}}>
            <thead><tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
              {["Origen","Documento","Proveedor","Emisión","Vencimiento","Monto","Estado","Centro costo"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:9,color:C.textM,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[...filtradas].sort((a,b)=>text(vencCxp(a)).localeCompare(text(vencCxp(b)))).map((c,i)=>{
                const saldo=montoCxp(c);
                const vencida=saldo>0&&vencCxp(c)&&vencCxp(c)<hoy;
                const estado=saldo<=0||c.estado==="Pagada"?"PAGADA":vencida?"VENCIDA":c.estado||"Pendiente";
                const colE=estado==="PAGADA"?C.green:vencida?C.red:C.amber;
                return <tr key={c.id||i} style={{borderBottom:"1px solid "+C.border,background:i%2===0?"transparent":C.bg2}}>
                  <td style={{padding:"7px 12px"}}>{(c.origen||"softland")==="softland"?pill(C.blue+"22",C.blue,"SFT"):pill(C.amber+"22",C.amber,"MAN")}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:C.textS}}>{c.numeroDocumento||c.folio||c.documento||"—"}</td>
                  <td style={{padding:"7px 12px",fontWeight:500,color:C.text}}>{c.proveedor||c.razonSocial||c.rutProveedor||"—"}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:C.textM}}>{c.fechaEmision||c.emision||"—"}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:vencida?C.red:C.textM}}>{vencCxp(c)||"—"}</td>
                  <td style={{padding:"7px 12px",fontWeight:600,color:C.red,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(saldo)}</td>
                  <td style={{padding:"7px 12px"}}>{pill(colE+"22",colE,estado)}</td>
                  <td style={{padding:"7px 12px",fontSize:11,color:C.textM}}>{c.centroCosto||c.proyectoId||c.cuenta||"—"}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>;
      })()}
    </div>}

    {/* ═══════════ HITOS ═══════════ */}
    {vista==="hitos"&&<HitosView C={C} proyectos={proyectos} clientes={clientes} params={params} onSaveProyecto={onSaveProyecto} readonly={readonly}/>}

    {/* ═══════════ FACTURAS ═══════════ */}
    {vista==="facturas"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,gap:10,flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
          {[["todos","Todas"],["pendientes","Pendientes"],["vencidas","Vencidas"],["pagadas","Pagadas"]].map(([id,lbl])=>{
            const on=filtroEstado===id;
            return <button key={id} onClick={()=>setFiltroEstado(id)} style={{padding:"5px 12px",borderRadius:20,border:"1px solid "+(on?C.blue:C.border),background:on?C.blue+"22":"transparent",color:on?C.blue:C.textM,fontSize:11,fontWeight:on?600:400,cursor:"pointer",fontFamily:ff}}>{lbl}</button>;
          })}
        </div>
        <div style={{display:"flex",gap:8}}>
          {!readonly&&<Btn C={C} small onClick={()=>setModal({tipo:"factura",data:{id:newId(),fechaEmision:hoy,estado:"Emitida",origen:"manual",monto:0,montoPagado:0}})}>+ Registrar factura</Btn>}
          {!readonly&&<Btn C={C} ghost small onClick={()=>{alert("Para importación masiva: ve a Configuración → Integraciones → Facturas emitidas");}}>📥 Importar Softland</Btn>}
        </div>
      </div>

      {(()=>{
        const filtradas=facturas.filter(f=>{
          if(filtroEstado==="pendientes")return saldoFactura(f)>0&&f.estado!=="Anulada";
          if(filtroEstado==="vencidas")return saldoFactura(f)>0&&vencFactura(f)&&vencFactura(f)<hoy;
          if(filtroEstado==="pagadas")return saldoFactura(f)<=0&&montoFactura(f)>0;
          return true;
        });
        if(filtradas.length===0)return <EmptyState C={C} icon="·" title="Sin facturas registradas" sub="Registra facturas manualmente o importa desde Softland en Configuración → Integraciones."/>;
        return <div style={card}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff}}>
            <thead><tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
              {["Origen","Folio","Cliente","Proyecto / hito","Emisión","Vencimiento","Monto","Pagado","Saldo","Estado",""].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:9,color:C.textM,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtradas.map((f,i)=>{
                const cli=clientes.find(c=>c.rut===f.rutCliente);
                const proy=proyectos.find(p=>p.id===f.proyectoId);
                const hito=proy?.hitosFacturacion?.find(h=>h.id===f.hitoId);
                const saldo=saldoFactura(f);
                const vencida=saldo>0&&vencFactura(f)&&vencFactura(f)<hoy;
                const colE=saldo<=0?C.green:vencida?C.red:C.amber;
                return <tr key={f.id} style={{borderBottom:"1px solid "+C.border,background:i%2===0?"transparent":C.bg2,cursor:"pointer"}} onClick={()=>setModal({tipo:"factura",data:f})}>
                  <td style={{padding:"7px 12px"}}>
                    {f.origen==="softland"?pill(C.blue+"22",C.blue,"SFT"):pill(C.amber+"22",C.amber,"MAN")}
                  </td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:C.textS}}>{f.folio||"—"}</td>
                  <td style={{padding:"7px 12px",fontWeight:500,color:C.text}}>{cli?.razonSocial||f.rutCliente||"—"}</td>
                  <td style={{padding:"7px 12px",minWidth:150}}>
                    <div style={{fontSize:11,fontWeight:600,color:proy?C.text:C.textM,fontFamily:ff}}>{proy?.numero||proy?.codigo||"Sin proyecto"}</div>
                    <div style={{fontSize:10,color:hito?C.blue:C.textM,fontFamily:ff}}>{hito?.nombre||"Sin hito"}</div>
                  </td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:C.textM}}>{f.fechaEmision||"—"}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:vencida?C.red:C.textM}}>{vencFactura(f)||"—"}</td>
                  <td style={{padding:"7px 12px",fontWeight:600,color:C.text,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(montoFactura(f))}</td>
                  <td style={{padding:"7px 12px",color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(f.montoPagado||0)}</td>
                  <td style={{padding:"7px 12px",fontWeight:600,color:saldo>0?C.amber:C.green,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(saldo)}</td>
                  <td style={{padding:"7px 12px"}}>{pill(colE+"22",colE,saldo<=0?"PAGADA":vencida?"VENCIDA":f.estado||"Emitida")}</td>
                  <td style={{padding:"7px 12px"}}>
                    {!readonly&&<button onClick={(e)=>{e.stopPropagation();if(window.confirm("¿Eliminar factura?")){deleteFactura(f.id);}}} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:13}}>🗑</button>}
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>;
      })()}
    </div>}

    {/* ═══════════ PAGOS ═══════════ */}
    {vista==="pagos"&&<div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff}}>Registro de pagos recibidos. Cada pago concilia con su factura.</div>
        {!readonly&&<Btn C={C} small onClick={()=>setModal({tipo:"pago",data:{id:newId(),fechaPago:hoy,origen:"manual",monto:0,medio:"Transferencia"}})}>+ Registrar pago</Btn>}
      </div>
      {pagos.length===0
        ?<EmptyState C={C} icon="·" title="Sin pagos registrados" sub="Registra pagos manualmente o impórtalos desde Softland."/>
        :<div style={card}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff}}>
            <thead><tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
              {["Origen","Fecha","Folio factura","Monto","Medio","Observaciones"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:9,color:C.textM,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[...pagos].sort((a,b)=>text(b.fechaPago).localeCompare(text(a.fechaPago))).map((p,i)=>(
                <tr key={p.id} style={{borderBottom:"1px solid "+C.border,background:i%2===0?"transparent":C.bg2}}>
                  <td style={{padding:"7px 12px"}}>{p.origen==="softland"?pill(C.blue+"22",C.blue,"SFT"):pill(C.amber+"22",C.amber,"MAN")}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:C.textM}}>{p.fechaPago||"—"}</td>
                  <td style={{padding:"7px 12px",fontFamily:"monospace",fontSize:11,color:C.textS}}>{p.folioFactura||"—"}</td>
                  <td style={{padding:"7px 12px",fontWeight:600,color:C.green,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(p.monto||0)}</td>
                  <td style={{padding:"7px 12px",color:C.textS,fontSize:11}}>{p.medio||"—"}</td>
                  <td style={{padding:"7px 12px",color:C.textM,fontSize:11}}>{p.observaciones||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    </div>}

    {/* Modal Factura */}
    {modal?.tipo==="factura"&&<ModalFactura C={C} factura={modal.data} clientes={clientes} proyectos={proyectos} onClose={()=>setModal(null)} onSave={f=>{saveFactura(f);setModal(null);}}/>}
    {modal?.tipo==="pago"&&<ModalPago C={C} pago={modal.data} facturas={facturas} clientes={clientes} onClose={()=>setModal(null)} onSave={p=>{savePago(p);setModal(null);}}/>}
  </div>;
}

function ModalFactura({C,factura,clientes,proyectos,onClose,onSave}){
  const [form,setForm]=useState(factura);
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const proyectoSel=proyectos.find(p=>p.id===form.proyectoId);
  const hitosProyecto=proyectoSel?.hitosFacturacion||[];
  const hitoSel=hitosProyecto.find(h=>h.id===form.hitoId);
  const setProyecto=v=>setForm(f=>({...f,proyectoId:v,hitoId:""}));
  const setHito=v=>{
    const h=(proyectoSel?.hitosFacturacion||[]).find(x=>x.id===v);
    setForm(f=>({
      ...f,
      hitoId:v,
      monto:h?.monto&&(!f.monto||f.monto===0)?h.monto:f.monto,
      observaciones:f.observaciones||h?.nombre||""
    }));
  };
  const guardar=()=>{
    if(!form.folio?.trim()){alert("Indica el folio");return;}
    if(!form.monto||form.monto<=0){alert("Indica un monto válido");return;}
    onSave({...form,createdAt:form.createdAt||new Date().toISOString()});
  };
  return <Modal C={C} title={factura?.folio?`Factura ${factura.folio}`:"Registrar factura"} onClose={onClose} width={560}>
    <div style={{padding:"8px 12px",background:C.amber+"11",border:"1px solid "+C.amber+"33",borderRadius:5,marginBottom:12,fontSize:11,color:C.textS,fontFamily:ff}}>
      📌 Assur Control no emite la factura — solo registra la referencia. La emisión real ocurre en Softland.
    </div>
    <G cols={2}>
      <Fld C={C} label="Folio *"><Inp C={C} value={form.folio||""} onChange={v=>sf("folio",v)} placeholder="N° folio Softland"/></Fld>
      <Fld C={C} label="Origen">
        <Sel C={C} value={form.origen||"manual"} onChange={v=>sf("origen",v)} opts={[{value:"manual",label:"Manual"},{value:"softland",label:"Softland"}]}/>
      </Fld>
    </G>
    <Fld C={C} label="Cliente">
      <SelBusca C={C} value={form.rutCliente||""} onChange={v=>sf("rutCliente",v)} opts={[{value:"",label:"— Seleccionar por RUT —"},...clientes.filter(c=>c.rut).map(c=>({value:c.rut,label:`${c.razonSocial} (${c.rut})`}))]}/>
    </Fld>
    <G cols={2}>
      <Fld C={C} label="Fecha emisión"><Inp C={C} value={form.fechaEmision||""} onChange={v=>sf("fechaEmision",v)} type="date"/></Fld>
      <Fld C={C} label="Fecha vencimiento"><Inp C={C} value={form.fechaVencimiento||""} onChange={v=>sf("fechaVencimiento",v)} type="date"/></Fld>
    </G>
    <G cols={3}>
      <Fld C={C} label="Monto neto" suffix="CLP"><Inp C={C} value={form.monto||""} onChange={v=>sf("monto",+v||0)} type="number"/></Fld>
      <Fld C={C} label="Monto pagado" suffix="CLP"><Inp C={C} value={form.montoPagado||""} onChange={v=>sf("montoPagado",+v||0)} type="number"/></Fld>
      <Fld C={C} label="Estado">
        <Sel C={C} value={form.estado||"Emitida"} onChange={v=>sf("estado",v)} opts={["Emitida","Anulada"].map(e=>({value:e,label:e}))}/>
      </Fld>
    </G>
    <G cols={2}>
      <Fld C={C} label="Proyecto vinculado (opcional)">
        <SelBusca C={C} value={form.proyectoId||""} onChange={setProyecto} opts={[{value:"",label:"— Sin vincular —"},...proyectos.map(p=>({value:p.id,label:`${p.numero||p.codigo||"—"} · ${p.nombre}`}))]}/>
      </Fld>
      <Fld C={C} label="Hito vinculado (opcional)">
        <SelBusca C={C} value={form.hitoId||""} onChange={setHito} disabled={!form.proyectoId} opts={[{value:"",label:form.proyectoId?"— Sin hito —":"Selecciona proyecto primero"},...hitosProyecto.map(h=>({value:h.id,label:`${h.nombre||"Hito"} · ${fmtCLP(h.monto||0)} · ${h.estado||"Pendiente"}`}))]}/>
      </Fld>
    </G>
    {hitoSel&&<div style={{padding:"8px 12px",background:C.blue+"11",border:"1px solid "+C.blue+"33",borderRadius:5,marginBottom:12,fontSize:11,color:C.textS,fontFamily:ff}}>
      Al guardar, el hito <b style={{color:C.blue}}>{hitoSel.nombre}</b> quedará marcado como {(form.montoPagado||0)>=(form.monto||0)&&form.monto>0?"cobrado":"facturado"} y asociado al folio {form.folio||"indicado"}.
    </div>}
    <Fld C={C} label="Observaciones"><Inp C={C} value={form.observaciones||""} onChange={v=>sf("observaciones",v)}/></Fld>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar}>Guardar factura</Btn>
    </div>
  </Modal>;
}

function ModalPago({C,pago,facturas,clientes,onClose,onSave}){
  const [form,setForm]=useState(pago);
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const fact=facturas.find(f=>f.folio===form.folioFactura);
  const cli=fact?clientes.find(c=>c.rut===fact.rutCliente):null;
  const guardar=()=>{
    if(!form.folioFactura?.trim()){alert("Indica el folio de la factura");return;}
    if(!form.monto||form.monto<=0){alert("Indica un monto válido");return;}
    // Actualizar el monto pagado de la factura
    if(fact){
      const ftrs=repo.facturas.list();
      const i=ftrs.findIndex(x=>x.id===fact.id);
      if(i>=0){
        const montoPagado=(ftrs[i].montoPagado||0)+(+form.monto);
        ftrs[i]={...ftrs[i],montoPagado,updatedAt:new Date().toISOString()};
        repo.facturas.replaceAll(ftrs);
        syncFacturasToBackendQuiet(ftrs);
        if(ftrs[i].proyectoId&&ftrs[i].hitoId&&montoPagado>=(ftrs[i].monto||0)){
          const ps=repo.proyectos.list();
          const pi=ps.findIndex(p=>p.id===ftrs[i].proyectoId);
          if(pi>=0){
            const hs=(ps[pi].hitosFacturacion||[]).map(h=>h.id===ftrs[i].hitoId?{
              ...h,
              estado:"Cobrado",
              nroFactura:ftrs[i].folio,
              facturaId:ftrs[i].id,
              fechaCobro:form.fechaPago||new Date().toISOString().slice(0,10)
            }:h);
            ps[pi]={...ps[pi],hitosFacturacion:hs,updatedAt:new Date().toISOString()};
            repo.proyectos.replaceAll(ps);
            syncProyectoToBackendQuiet(ps[pi]);
          }
        }
      }
    }
    onSave({...form,createdAt:form.createdAt||new Date().toISOString()});
  };
  return <Modal C={C} title="Registrar pago" onClose={onClose} width={500}>
    <Fld C={C} label="Factura asociada (folio) *">
      <SelBusca C={C} value={form.folioFactura||""} onChange={v=>sf("folioFactura",v)} opts={[{value:"",label:"— Seleccionar factura —"},...facturas.filter(f=>(f.monto||0)>(f.montoPagado||0)).map(f=>{const c=clientes.find(x=>x.rut===f.rutCliente);return{value:f.folio,label:`${f.folio} · ${c?.razonSocial||f.rutCliente} · ${fmtCLP((f.monto||0)-(f.montoPagado||0))} pendiente`};})]}/>
    </Fld>
    {fact&&<div style={{padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,fontSize:11,color:C.textM,fontFamily:ff,marginBottom:10}}>
      <div>Cliente: <b style={{color:C.text}}>{cli?.razonSocial||fact.rutCliente}</b></div>
      <div>Saldo pendiente: <b style={{color:C.amber}}>{fmtCLP((fact.monto||0)-(fact.montoPagado||0))}</b></div>
    </div>}
    <G cols={2}>
      <Fld C={C} label="Fecha pago"><Inp C={C} value={form.fechaPago||""} onChange={v=>sf("fechaPago",v)} type="date"/></Fld>
      <Fld C={C} label="Monto" suffix="CLP"><Inp C={C} value={form.monto||""} onChange={v=>sf("monto",+v||0)} type="number"/></Fld>
    </G>
    <G cols={2}>
      <Fld C={C} label="Medio de pago">
        <Sel C={C} value={form.medio||"Transferencia"} onChange={v=>sf("medio",v)} opts={["Transferencia","Cheque","Efectivo","Tarjeta","Otro"].map(m=>({value:m,label:m}))}/>
      </Fld>
      <Fld C={C} label="Origen">
        <Sel C={C} value={form.origen||"manual"} onChange={v=>sf("origen",v)} opts={[{value:"manual",label:"Manual"},{value:"softland",label:"Softland"}]}/>
      </Fld>
    </G>
    <Fld C={C} label="Observaciones"><Inp C={C} value={form.observaciones||""} onChange={v=>sf("observaciones",v)}/></Fld>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:14}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar}>Registrar pago</Btn>
    </div>
  </Modal>;
}

function HitosView({C,proyectos,clientes,params,onSaveProyecto,readonly}){
  const [selProy,setSelProy]=useState("");
  const [modal,setModal]=useState(null);

  const proy=proyectos.find(p=>p.id===selProy);
  const hitos=proy?.hitosFacturacion||[];

  // Totales del proyecto seleccionado
  const totalVendido=proy?.valorVendido||0;
  const totalHitos=hitos.reduce((s,h)=>s+(h.monto||0),0);
  const totalFacturado=hitos.filter(h=>h.estado==="Facturado"||h.estado==="Cobrado").reduce((s,h)=>s+(h.monto||0),0);
  const totalCobrado=hitos.filter(h=>h.estado==="Cobrado").reduce((s,h)=>s+(h.monto||0),0);
  const pctPlanificado=totalVendido>0?Math.round(totalHitos/totalVendido*100):0;

  const saveHito=hito=>{
    if(!proy)return;
    const arr=[...(proy.hitosFacturacion||[])];
    const i=arr.findIndex(h=>h.id===hito.id);
    if(i>=0)arr[i]=hito;else arr.push(hito);
    onSaveProyecto({...proy,hitosFacturacion:arr});
    setModal(null);
  };
  const deleteHito=id=>{
    if(!proy)return;
    onSaveProyecto({...proy,hitosFacturacion:(proy.hitosFacturacion||[]).filter(h=>h.id!==id)});
  };

  // Vista global: todos los proyectos con hitos
  const proyConHitos=proyectos.filter(p=>(p.hitosFacturacion||[]).length>0);
  const resumenGlobal=proyConHitos.flatMap(p=>(p.hitosFacturacion||[]).map(h=>({...h,proy:p})));
  const pendientesGlobal=resumenGlobal.filter(h=>h.estado==="Condición cumplida");
  const vencidosGlobal=resumenGlobal.filter(h=>h.estado==="Vencido"||(!h.estado&&h.fechaLimite&&h.fechaLimite<new Date().toISOString().slice(0,10)));

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
      <div>
        <h2 style={{margin:0,fontSize:20,fontWeight:700,color:C.text,fontFamily:ff}}>Facturación por hitos</h2>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>Control de estados de pago y facturación parcial</div>
      </div>
    </div>

    {/* KPIs globales */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:18}}>
      {[
        {label:"Hitos pendientes de facturar",val:pendientesGlobal.length,color:pendientesGlobal.length>0?C.amber:C.textM},
        {label:"Hitos vencidos",val:vencidosGlobal.length,color:vencidosGlobal.length>0?C.red:C.textM},
        {label:"Total facturado (todos)",val:`$${Math.round(resumenGlobal.filter(h=>h.estado==="Facturado"||h.estado==="Cobrado").reduce((s,h)=>s+(h.monto||0),0)/1000)}K`,color:C.blue},
        {label:"Total cobrado (todos)",val:`$${Math.round(resumenGlobal.filter(h=>h.estado==="Cobrado").reduce((s,h)=>s+(h.monto||0),0)/1000)}K`,color:C.green},
      ].map(k=><div key={k.label} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"12px 16px"}}>
        <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.label}</div>
        <div style={{fontSize:k.label.includes("$")||k.label.includes("Total")?16:22,fontWeight:700,color:k.color,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.val}</div>
      </div>)}
    </div>

    {/* Alertas */}
    {(pendientesGlobal.length>0||vencidosGlobal.length>0)&&<div style={{marginBottom:16,display:"flex",flexDirection:"column",gap:8}}>
      {pendientesGlobal.length>0&&<div style={{padding:"10px 14px",background:C.amber+"11",border:"1px solid "+C.amber+"44",borderRadius:6,fontSize:12,color:C.amber,fontFamily:ff}}>
        ⚠️ {pendientesGlobal.length} hito{pendientesGlobal.length>1?"s":""} con condición cumplida esperando ser facturado{pendientesGlobal.length>1?"s":""}
      </div>}
      {vencidosGlobal.length>0&&<div style={{padding:"10px 14px",background:C.red+"11",border:"1px solid "+C.red+"44",borderRadius:6,fontSize:12,color:C.red,fontFamily:ff}}>
        🔴 {vencidosGlobal.length} hito{vencidosGlobal.length>1?"s":""} vencido{vencidosGlobal.length>1?"s":""}
      </div>}
    </div>}

    {/* Selector de proyecto */}
    <Card C={C}>
      <STitle C={C}>Gestionar hitos por proyecto</STitle>
      <Fld C={C} label="Seleccionar proyecto">
        <SelBusca C={C} value={selProy} onChange={v=>setSelProy(v)}
          opts={[{value:"",label:"— Seleccionar un proyecto —"},...proyectos.map(p=>({value:p.id,label:`${p.codigo} · ${p.nombre.slice(0,40)} · $${((p.valorVendido||0)/1000).toFixed(0)}K`}))]}/>
      </Fld>

      {proy&&<>
        {/* Resumen del proyecto */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,margin:"14px 0",padding:"12px",background:C.bg2,borderRadius:6,border:"1px solid "+C.border}}>
          {[
            {label:"Valor vendido",val:`$${(totalVendido/1000).toFixed(0)}K`,color:C.text},
            {label:"Planificado en hitos",val:`$${(totalHitos/1000).toFixed(0)}K (${pctPlanificado}%)`,color:pctPlanificado===100?C.green:pctPlanificado>100?C.red:C.amber},
            {label:"Facturado",val:`$${(totalFacturado/1000).toFixed(0)}K`,color:C.blue},
            {label:"Cobrado",val:`$${(totalCobrado/1000).toFixed(0)}K`,color:C.green},
          ].map(k=><div key={k.label} style={{textAlign:"center"}}>
            <div style={{fontSize:9,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{k.label}</div>
            <div style={{fontSize:13,fontWeight:700,color:k.color,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{k.val}</div>
          </div>)}
        </div>

        {/* Barra de progreso facturación */}
        {totalVendido>0&&<div style={{marginBottom:14}}>
          <div style={{height:8,background:C.bg2,borderRadius:4,overflow:"hidden",border:"1px solid "+C.border}}>
            <div style={{height:"100%",width:`${Math.min(100,totalFacturado/totalVendido*100)}%`,background:`linear-gradient(90deg,${C.blue},${C.green})`,borderRadius:4}}/>
          </div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:10,color:C.textM,fontFamily:ff,marginTop:4}}>
            <span>Facturado: {Math.round(totalFacturado/totalVendido*100)}%</span>
            <span>Cobrado: {Math.round(totalCobrado/totalVendido*100)}%</span>
          </div>
        </div>}

        {/* Lista de hitos */}
        {hitos.length===0
          ?<div style={{textAlign:"center",padding:"20px",color:C.textM,fontFamily:ff,fontSize:12}}>
            Sin hitos configurados. {!readonly&&"Agrega hitos para controlar la facturación por avance."}
          </div>
          :<div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:12}}>
            {hitos.map((h,i)=>{
              const colEst=(COL_HITO[h.estado]||((C)=>C.textM))(C);
              return <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:C.bg2,borderRadius:7,border:"1px solid "+C.border}}>
                <div style={{width:8,height:8,borderRadius:4,background:colEst,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff}}>{h.nombre||`Hito ${i+1}`}</span>
                    <span style={{fontSize:10,padding:"1px 7px",borderRadius:12,background:colEst+"22",color:colEst,fontWeight:600}}>{h.estado||"Pendiente"}</span>
                  </div>
                  <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:2}}>{h.condicion} {h.fechaLimite&&`· Límite: ${h.fechaLimite}`}</div>
                  {h.nroFactura&&<div style={{fontSize:10,color:C.blue,fontFamily:ff,marginTop:1}}>Factura: {h.nroFactura}</div>}
                </div>
                <div style={{textAlign:"right",minWidth:100}}>
                  <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>${(h.monto||0).toLocaleString("es-CL")}</div>
                  <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{Math.round((h.monto||0)/Math.max(1,totalVendido)*100)}% del total</div>
                </div>
                {!readonly&&<div style={{display:"flex",gap:5,flexShrink:0}}>
                  {h.estado==="Condición cumplida"&&<Btn C={C} ghost small color={C.blue} onClick={()=>saveHito({...h,estado:"Facturado"})}>Facturar</Btn>}
                  {h.estado==="Facturado"&&<Btn C={C} ghost small color={C.green} onClick={()=>saveHito({...h,estado:"Cobrado",fechaCobro:new Date().toISOString().slice(0,10)})}>✓ Cobrado</Btn>}
                  {(h.estado==="Pendiente"||!h.estado)&&<Btn C={C} ghost small color={C.amber} onClick={()=>saveHito({...h,estado:"Condición cumplida"})}>Cumplido</Btn>}
                  <Btn C={C} ghost small onClick={()=>setModal({data:h})}>✏</Btn>
                  <Btn C={C} ghost small color={C.red} onClick={()=>deleteHito(h.id)}>✕</Btn>
                </div>}
              </div>;
            })}
          </div>
        }

        {/* Plantillas rápidas */}
        {!readonly&&hitos.length===0&&<div style={{marginBottom:12}}>
          <div style={{fontSize:11,fontWeight:600,color:C.textM,fontFamily:ff,marginBottom:8}}>Plantillas rápidas:</div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[
              {label:"50% / 50%",hitos:[{nombre:"Primer pago",condicion:"Inicio de proyecto",pct:50},{nombre:"Pago final",condicion:"Cierre técnico",pct:50}]},
              {label:"100% al cierre",hitos:[{nombre:"Pago único",condicion:"Cierre técnico",pct:100}]},
              {label:"30% / 40% / 30%",hitos:[{nombre:"Anticipo",condicion:"Inicio de proyecto",pct:30},{nombre:"Avance 50%",condicion:"50% de avance",pct:40},{nombre:"Liquidación",condicion:"Cierre técnico",pct:30}]},
            ].map(tmpl=><Btn C={C} key={tmpl.label} ghost small onClick={()=>{
              const nuevos=tmpl.hitos.map((h,i)=>({...h,id:newId(),monto:Math.round(totalVendido*h.pct/100),estado:"Pendiente",pct:h.pct}));
              onSaveProyecto({...proy,hitosFacturacion:nuevos});
            }}>{tmpl.label}</Btn>)}
          </div>
        </div>}

        {!readonly&&<Btn C={C} variant="soft" small onClick={()=>setModal({data:null})}>+ Agregar hito</Btn>}
      </>}
    </Card>

    {/* Vista global de hitos próximos */}
    {proyConHitos.length>0&&<Card C={C}>
      <STitle C={C}>Próximos hitos a facturar</STitle>
      <div style={{display:"flex",flexDirection:"column",gap:6}}>
        {resumenGlobal
          .filter(h=>h.estado!=="Cobrado"&&h.estado!=="Rechazada")
          .sort((a,b)=>(a.fechaLimite||"9999").localeCompare(b.fechaLimite||"9999"))
          .slice(0,8)
          .map((h,i)=>{
            const colEst=(COL_HITO[h.estado]||((C)=>C.textM))(C);
            return <div key={h.id+i} style={{display:"flex",alignItems:"center",gap:12,padding:"9px 12px",background:C.bg2,borderRadius:6,border:"1px solid "+C.border}}>
              <span style={{fontSize:10,fontFamily:"monospace",color:C.blue,minWidth:90,fontWeight:600}}>{h.proy?.codigo}</span>
              <span style={{flex:1,fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{h.nombre}</span>
              <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{h.condicion}</span>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:12,background:colEst+"22",color:colEst,fontWeight:600}}>{h.estado||"Pendiente"}</span>
              <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff,fontVariantNumeric:"tabular-nums",minWidth:90,textAlign:"right"}}>${(h.monto||0).toLocaleString("es-CL")}</span>
            </div>;
          })
        }
      </div>
    </Card>}

    {/* Modal hito */}
    {modal&&<ModalHito C={C} hito={modal.data} valorVendido={proy?.valorVendido||0}
      onClose={()=>setModal(null)} onSave={saveHito}/>}
  </div>;
}

function ModalHito({C,hito,valorVendido,onClose,onSave}){
  const isEdit=!!hito?.id;
  const [form,setForm]=useState(hito||{estado:"Pendiente",condicion:"Inicio de proyecto",pct:50});
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const montoCalc=form.usarPct?Math.round(valorVendido*(form.pct||0)/100):(form.monto||0);
  const guardar=()=>{
    if(!form.nombre?.trim())return;
    onSave({...form,id:form.id||newId(),monto:montoCalc});
  };
  return <Modal C={C} title={isEdit?"Editar hito":"Nuevo hito de facturación"} onClose={onClose} width={480}>
    <Fld C={C} label="Nombre del hito *"><Inp C={C} value={form.nombre||""} onChange={v=>sf("nombre",v)} placeholder="Ej: Primer pago, Anticipo, Liquidación..."/></Fld>
    <Fld C={C} label="Condición para facturar">
      <Sel C={C} value={form.condicion||"Inicio de proyecto"} onChange={v=>sf("condicion",v)} opts={TIPOS_HITO.map(t=>({value:t,label:t}))}/>
    </Fld>
    <div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:6,padding:"12px 14px",marginBottom:14}}>
      <label style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,cursor:"pointer"}}>
        <input type="checkbox" checked={!!form.usarPct} onChange={e=>sf("usarPct",e.target.checked)} style={{accentColor:C.blue}}/>
        <span style={{fontSize:12,fontFamily:ff,color:C.text}}>Calcular como porcentaje del valor vendido</span>
      </label>
      {form.usarPct
        ?<G cols={2}>
           <Fld C={C} label="Porcentaje" suffix="%"><Inp C={C} value={form.pct||50} onChange={v=>sf("pct",+v||0)} type="number"/></Fld>
           <Fld C={C} label="Monto resultante">
             <div style={{padding:"8px 11px",background:C.bg0,borderRadius:5,border:"1px solid "+C.blue+"33",fontSize:15,fontWeight:700,color:C.blue,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>${montoCalc.toLocaleString("es-CL")}</div>
           </Fld>
         </G>
        :<Fld C={C} label="Monto fijo" prefix="$"><Inp C={C} value={form.monto||0} onChange={v=>sf("monto",+v||0)} type="number"/></Fld>
      }
    </div>
    <G cols={2}>
      <Fld C={C} label="Estado">
        <Sel C={C} value={form.estado||"Pendiente"} onChange={v=>sf("estado",v)} opts={ESTADOS_HITO.map(e=>({value:e,label:e}))}/>
      </Fld>
      <Fld C={C} label="Fecha límite (opcional)"><Inp C={C} value={form.fechaLimite||""} onChange={v=>sf("fechaLimite",v)} type="date"/></Fld>
    </G>
    <Fld C={C} label="Número de factura (si ya fue emitida)"><Inp C={C} value={form.nroFactura||""} onChange={v=>sf("nroFactura",v)} placeholder="Ej: 001234"/></Fld>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar} disabled={!form.nombre?.trim()}>{isEdit?"Guardar cambios":"Crear hito"}</Btn>
    </div>
  </Modal>;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG INTEGRACIONES — Importador CSV/Excel desde Softland
// Fase 1: ingreso manual de archivos exportados desde Softland
// El sistema marca cada registro con origen='softland' al importarlo
// ─────────────────────────────────────────────────────────────────────────────
