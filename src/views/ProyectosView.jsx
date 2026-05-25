import { useEffect, useRef, useState } from "react";
import { ff, COL_E, ESTADOS_PROP, TIPOS_PROYECTO_DEF, RUBROS, TIPOS_HORA_DEF } from "../config/appConstants";
import { EST_OP, EST_FIN, COL_OP, COL_FIN, CHECKLIST_CIERRE_DEF } from "../config/navigation";
import { Bdg, Btn, Card, EmptyState, Fld, G, Inp, Modal, ModuleHero, QuickActions, Sel, SelBusca, Stat, STitle, WorkflowSteps } from "../components/ui";
import { calcProp, getNombreCliente, tieneRecurrente } from "../domain/commercial";
import { calcProjectFinance } from "../domain/finance";
import { COL_EST_INC, COL_PRIO } from "../domain/operationsCatalogs";
import { COL_SERVICIO, buildServicioDesdeProyecto, servicioTieneProtocoloCompleto } from "../domain/recurringServices";
import { dataService } from "../services/dataService";
import assurHexDark from "../assets/brand/assur-hex-solid-darkOnLight.svg";
import assurHexWhite from "../assets/brand/assur-hex-solid-whiteOnDark.svg";

const newId = () => dataService.id();
const fmtCLP = (n) => (!n && n !== 0 ? "—" : "$ " + Math.round(n).toLocaleString("es-CL"));
const fmtPct = (n) => (n * 100).toFixed(1) + "%";
const fmtMil = (v) => v >= 1e6 ? "$" + (v / 1e6).toFixed(1) + "M" : v >= 1e3 ? "$" + (v / 1e3).toFixed(0) + "K" : "$" + Math.round(v || 0);
const COL_HITO = { Pendiente: (C) => C.textM, "Condición cumplida": (C) => C.amber, Facturado: (C) => C.blue, Cobrado: (C) => C.green, Vencido: (C) => C.red };
function Empty({ C, icon = "◈", title, sub, action }) { return <EmptyState C={C} icon={icon} title={title} sub={sub} action={action} />; }

function ProyectoEnTerreno({C,proyecto,tecnicos,contratistas,registrosHoras,incidencias,fichajes,params,onSaveRegistroHora,onSaveIncidencia,onSaveProyecto,readonly}){
  const [vista,setVista]=useState("bandeja"); // bandeja | actividad | fotos | solicitudes
  const personal=[...(tecnicos||[]),...(contratistas||[]).map(c=>({...c,_cont:true}))];
  const tipos=params?.tiposHora||TIPOS_HORA_DEF;

  // Datos para bandeja
  const incCriticas=incidencias.filter(i=>i.estado==="Abierta"&&(i.prioridad==="Crítica"||i.prioridad==="Alta"));
  const incAbiertas=incidencias.filter(i=>i.estado==="Abierta");
  const horasPend=registrosHoras.filter(r=>r.estado==="pendiente"||!r.estado);
  const solicitudesPend=(proyecto.solicitudesMaterial||[]).filter(s=>s.estado==="pendiente");
  const fotos=proyecto.fotos||[];
  const fichajeActivo=fichajes.find(f=>f.estado==="activo");

  // Helpers de aprobación/rechazo
  const aprobarHora=r=>onSaveRegistroHora({...r,estado:"aprobado",aprobadoEl:new Date().toISOString()});
  const rechazarHora=r=>{const m=window.prompt("Motivo del rechazo:");if(!m)return;onSaveRegistroHora({...r,estado:"rechazado",motivoRechazo:m,rechazadoEl:new Date().toISOString()});};
  const resolverInc=i=>{const m=window.prompt("Resolución:");if(!m)return;onSaveIncidencia({...i,estado:"Resuelta",resolucion:m,fechaResolucion:new Date().toISOString().slice(0,10)});};
  const escalarInc=i=>onSaveIncidencia({...i,estado:"En proceso",escaladoEl:new Date().toISOString()});
  const aprobarSol=s=>{
    const sols=(proyecto.solicitudesMaterial||[]).map(x=>x.id===s.id?{...x,estado:"entregada",fechaEntrega:new Date().toISOString()}:x);
    const tl=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"material",desc:`Solicitud entregada · ${(s.items||[]).length} ítem(s)`}];
    onSaveProyecto({...proyecto,solicitudesMaterial:sols,timeline:tl});
  };
  const rechazarSol=s=>{
    const m=window.prompt("Motivo del rechazo:");if(!m)return;
    const sols=(proyecto.solicitudesMaterial||[]).map(x=>x.id===s.id?{...x,estado:"rechazada",notaAlmacen:m}:x);
    onSaveProyecto({...proyecto,solicitudesMaterial:sols});
  };

  const totalPend=incCriticas.length+horasPend.length+solicitudesPend.length;

  // Estilos
  const tabBtn=(on)=>({padding:"8px 14px",cursor:"pointer",fontSize:12,fontWeight:on?500:400,background:"transparent",color:on?C.text:C.textM,border:"none",borderBottom:on?"2px solid "+C.blue:"2px solid transparent",fontFamily:ff,marginBottom:-1});
  const pill=(bg,col)=>({fontSize:10,padding:"2px 8px",borderRadius:12,fontWeight:500,background:bg,color:col,display:"inline-block"});
  const cardSt={background:C.bg1,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px"};

  return <div>
    {/* Estado actual del campo */}
    {fichajeActivo&&(()=>{
      const tec=personal.find(p=>p.id===fichajeActivo.tecnicoId);
      const tarea=(proyecto.tareas||[]).find(t=>t.id===fichajeActivo.tareaId);
      const inicio=new Date(fichajeActivo.inicio);
      const horas=Math.floor((Date.now()-inicio.getTime())/3600000);
      const mins=Math.floor(((Date.now()-inicio.getTime())%3600000)/60000);
      return <div style={{...cardSt,marginBottom:14,borderColor:C.green+"55"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:10,height:10,borderRadius:5,background:C.green,flexShrink:0}}/>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>{tec?.nombre||"Técnico"} activo desde {inicio.toLocaleTimeString("es-CL",{hour:"2-digit",minute:"2-digit"})}</div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:2}}>
              {tarea?`Tarea: ${tarea.nombre}`:"Sin tarea específica"} · {horas}h {mins}m en curso · {fichajeActivo.geoValidado?"GPS validado dentro de geocerca":"GPS sin validar"}
            </div>
          </div>
        </div>
      </div>;
    })()}

    {/* Sub-tabs internos */}
    <div style={{display:"flex",gap:0,marginBottom:14,borderBottom:"1px solid "+C.border}}>
      <button onClick={()=>setVista("bandeja")} style={tabBtn(vista==="bandeja")}>Bandeja {totalPend>0&&<span style={{...pill(C.amber+"22",C.amber),marginLeft:5}}>{totalPend}</span>}</button>
      <button onClick={()=>setVista("actividad")} style={tabBtn(vista==="actividad")}>Actividad y horas</button>
      <button onClick={()=>setVista("fotos")} style={tabBtn(vista==="fotos")}>Fotos {fotos.length>0&&`(${fotos.length})`}</button>
      <button onClick={()=>setVista("solicitudes")} style={tabBtn(vista==="solicitudes")}>Solicitudes {(proyecto.solicitudesMaterial||[]).length>0&&`(${(proyecto.solicitudesMaterial||[]).length})`}</button>
    </div>

    {/* ── BANDEJA — pendientes que requieren acción ── */}
    {vista==="bandeja"&&<div>
      {totalPend===0&&incidencias.length===0
        ?<EmptyState C={C} icon="✓" title="Todo al día" sub="Sin pendientes que aprobar ni incidencias activas en este proyecto."/>
        :<div style={{display:"flex",flexDirection:"column",gap:10}}>

          {/* Incidencias críticas */}
          {incCriticas.map(inc=>{
            const tec=personal.find(p=>p.id===inc.creadoPor||p.id===inc.asignadoA);
            return <div key={inc.id} style={{...cardSt,borderColor:C.red+"55"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={pill(C.red+"22",C.red)}>{inc.prioridad}</span>
                    <span style={pill(C.bg2,C.textM)}>Incidencia · {inc.estado}</span>
                    <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{inc.fechaReporte||"—"}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:ff,marginBottom:3}}>{inc.titulo}</div>
                  {inc.descripcion&&<div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:6}}>{inc.descripcion}</div>}
                  {tec&&<div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Reportado por {tec.nombre}</div>}
                </div>
                {!readonly&&<div style={{display:"flex",gap:6,flexShrink:0}}>
                  <Btn C={C} small onClick={()=>resolverInc(inc)}>Resolver</Btn>
                  <Btn C={C} ghost small onClick={()=>escalarInc(inc)}>Escalar</Btn>
                </div>}
              </div>
            </div>;
          })}

          {/* Solicitudes de material pendientes */}
          {solicitudesPend.map(s=>{
            const items=s.items||[];
            return <div key={s.id} style={{...cardSt,borderColor:C.amber+"55"}}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={pill(C.amber+"22",C.amber)}>Material</span>
                    <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{s.tecnicoNombre||"—"} · {s.fechaSolicitud?.slice(0,10)||"—"}</span>
                  </div>
                  <div style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:ff,marginBottom:6}}>Solicitud de {items.length} ítem{items.length!==1?"es":""}</div>
                  {items.map((it,i)=><div key={i} style={{fontSize:12,color:C.textS,fontFamily:ff}}>• {it.descripcion||it.materialId} × {it.cantidad}</div>)}
                  {s.notaTecnico&&<div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:6,fontStyle:"italic"}}>"{s.notaTecnico}"</div>}
                </div>
                {!readonly&&<div style={{display:"flex",gap:6,flexShrink:0}}>
                  <Btn C={C} small onClick={()=>aprobarSol(s)}>Entregar</Btn>
                  <Btn C={C} ghost small color={C.red} onClick={()=>rechazarSol(s)}>Rechazar</Btn>
                </div>}
              </div>
            </div>;
          })}

          {/* Horas por aprobar */}
          {horasPend.length>0&&<div style={cardSt}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
              <span style={pill(C.amber+"22",C.amber)}>Horas</span>
              <span style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:ff}}>{horasPend.length} registro{horasPend.length!==1?"s":""} por aprobar</span>
              <span style={{flex:1}}/>
              <span style={{fontSize:12,color:C.textM,fontFamily:ff}}>Total: {horasPend.reduce((s,r)=>s+(r.horas||0),0).toFixed(1)}h</span>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:280,overflowY:"auto"}}>
              {horasPend.map(r=>{
                const p=personal.find(x=>x.id===r.personalId);
                const t=tipos.find(x=>x.id===r.tipoHoraId);
                const costo=Math.round((r.horas||0)*((p?.costoHora||0)*(1+(t?.recargo||0)/100)));
                return <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,padding:"7px 10px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
                  <span style={{fontSize:11,fontFamily:"monospace",color:C.textM,minWidth:80}}>{r.fecha}</span>
                  <span style={{fontSize:12,fontWeight:500,color:C.text,fontFamily:ff,flex:1}}>{p?.nombre||"—"}</span>
                  <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{t?.nombre||"—"}</span>
                  <span style={{fontSize:13,fontWeight:600,color:C.blue,fontFamily:ff,minWidth:50,textAlign:"right"}}>{r.horas}h</span>
                  <span style={{fontSize:12,color:C.green,fontFamily:ff,minWidth:80,textAlign:"right"}}>{fmtCLP(costo)}</span>
                  {!readonly&&<>
                    <Btn C={C} ghost small color={C.green} onClick={()=>aprobarHora(r)}>✓</Btn>
                    <Btn C={C} ghost small color={C.red} onClick={()=>rechazarHora(r)}>✕</Btn>
                  </>}
                </div>;
              })}
            </div>
          </div>}

          {/* Otras incidencias abiertas (no críticas) */}
          {incAbiertas.filter(i=>!incCriticas.includes(i)).map(inc=>(
            <div key={inc.id} style={cardSt}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <span style={pill(C.bg2,C.textM)}>{inc.prioridad||"Media"}</span>
                <span style={{fontSize:13,color:C.text,fontFamily:ff,flex:1}}>{inc.titulo}</span>
                <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{inc.fechaReporte}</span>
                {!readonly&&<Btn C={C} ghost small onClick={()=>resolverInc(inc)}>Resolver</Btn>}
              </div>
            </div>
          ))}
        </div>
      }
    </div>}

    {/* ── ACTIVIDAD Y HORAS — historial completo ── */}
    {vista==="actividad"&&<div>
      <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:10}}>
        Historial de actividad del proyecto. Las horas las registra el técnico desde el móvil — aquí solo apruebas o rechazas.
      </div>
      {/* Stats */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14}}>
        {[
          {l:"Total horas",v:`${registrosHoras.reduce((s,r)=>s+(r.horas||0),0).toFixed(1)}h`,c:C.blue},
          {l:"Aprobadas",v:`${registrosHoras.filter(r=>r.estado==="aprobado").reduce((s,r)=>s+(r.horas||0),0).toFixed(1)}h`,c:C.green},
          {l:"Pendientes",v:`${horasPend.reduce((s,r)=>s+(r.horas||0),0).toFixed(1)}h`,c:C.amber},
          {l:"Fichajes",v:fichajes.length,c:C.text},
        ].map(k=><div key={k.l} style={{background:C.bg2,borderRadius:6,padding:"10px 12px",border:"1px solid "+C.border}}>
          <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.06em",fontFamily:ff}}>{k.l}</div>
          <div style={{fontSize:18,fontWeight:600,color:k.c,fontFamily:ff,marginTop:3}}>{k.v}</div>
        </div>)}
      </div>
      {/* Tabla */}
      {registrosHoras.length===0
        ?<EmptyState C={C} icon="·" title="Sin horas registradas" sub="Las horas aparecen aquí cuando el técnico las registra desde el móvil."/>
        :<div style={{...cardSt,padding:0,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff}}>
            <thead><tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
              {["Fecha","Persona","Tipo","Horas","Costo","Estado",""].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:C.textM,fontWeight:500,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}
            </tr></thead>
            <tbody>{[...registrosHoras].sort((a,b)=>(b.fecha||"").localeCompare(a.fecha||"")).map((r,i)=>{
              const p=personal.find(x=>x.id===r.personalId);
              const t=tipos.find(x=>x.id===r.tipoHoraId);
              const costo=Math.round((r.horas||0)*((p?.costoHora||0)*(1+(t?.recargo||0)/100)));
              const est=r.estado||"pendiente";
              const colE=est==="aprobado"?C.green:est==="rechazado"?C.red:C.amber;
              return <tr key={r.id} style={{borderBottom:"1px solid "+C.border,background:i%2===0?"transparent":C.bg2}}>
                <td style={{padding:"8px 12px",fontFamily:"monospace",color:C.textM,fontSize:11}}>{r.fecha}</td>
                <td style={{padding:"8px 12px",fontWeight:500,color:C.text}}>{p?.nombre||"—"}</td>
                <td style={{padding:"8px 12px",color:C.textM,fontSize:11}}>{t?.nombre||"—"}</td>
                <td style={{padding:"8px 12px",fontWeight:600,color:C.blue}}>{r.horas}h</td>
                <td style={{padding:"8px 12px",color:C.green,fontWeight:500}}>{fmtCLP(costo)}</td>
                <td style={{padding:"8px 12px"}}><span style={pill(colE+"22",colE)}>{est}</span></td>
                <td style={{padding:"8px 12px"}}>{!readonly&&est==="pendiente"&&<div style={{display:"flex",gap:5}}>
                  <Btn C={C} ghost small color={C.green} onClick={()=>aprobarHora(r)}>✓</Btn>
                  <Btn C={C} ghost small color={C.red} onClick={()=>rechazarHora(r)}>✕</Btn>
                </div>}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      }
    </div>}

    {/* ── FOTOS ── */}
    {vista==="fotos"&&<div>
      <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:14}}>
        Evidencias fotográficas subidas por los técnicos desde el móvil.
      </div>
      {fotos.length===0
        ?<EmptyState C={C} icon="·" title="Sin fotos" sub="Las fotos aparecerán aquí cuando el técnico las suba desde la app móvil."/>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:10}}>
          {fotos.map((f,i)=><div key={f.id||i} style={{...cardSt,padding:0,overflow:"hidden"}}>
            <img src={f.archivoBase64||f.miniatura} alt="" style={{width:"100%",height:140,objectFit:"cover",display:"block"}}/>
            <div style={{padding:"8px 10px"}}>
              <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{f.fecha?.slice(0,16).replace("T"," ")||"—"}</div>
              {f.comentario&&<div style={{fontSize:11,color:C.text,fontFamily:ff,marginTop:2}}>{f.comentario}</div>}
              <div style={{fontSize:10,color:C.blue,fontFamily:ff,marginTop:3}}>{f.tecnicoNombre||"—"}</div>
            </div>
          </div>)}
        </div>
      }
    </div>}

    {/* ── SOLICITUDES — historial completo ── */}
    {vista==="solicitudes"&&<div>
      <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:14}}>
        Historial de solicitudes de material del proyecto.
      </div>
      {(!proyecto.solicitudesMaterial||proyecto.solicitudesMaterial.length===0)
        ?<EmptyState C={C} icon="·" title="Sin solicitudes" sub="Las solicitudes aparecerán cuando el técnico las haga desde el móvil."/>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {proyecto.solicitudesMaterial.map(s=>{
            const items=s.items||[];
            const colE=s.estado==="entregada"?C.green:s.estado==="rechazada"?C.red:s.estado==="aprobada"?C.blue:C.amber;
            return <div key={s.id} style={cardSt}>
              <div style={{display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={pill(colE+"22",colE)}>{s.estado}</span>
                    <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{s.tecnicoNombre||"—"} · {s.fechaSolicitud?.slice(0,16).replace("T"," ")||"—"}</span>
                  </div>
                  {items.map((it,i)=><div key={i} style={{fontSize:12,color:C.text,fontFamily:ff}}>• {it.descripcion||it.materialId} × {it.cantidad}</div>)}
                  {s.notaTecnico&&<div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:6,fontStyle:"italic"}}>"{s.notaTecnico}"</div>}
                  {s.notaAlmacen&&<div style={{fontSize:11,color:C.red,fontFamily:ff,marginTop:4}}>Almacén: {s.notaAlmacen}</div>}
                </div>
                {!readonly&&s.estado==="pendiente"&&<div style={{display:"flex",gap:6,flexShrink:0}}>
                  <Btn C={C} small onClick={()=>aprobarSol(s)}>Entregar</Btn>
                  <Btn C={C} ghost small color={C.red} onClick={()=>rechazarSol(s)}>Rechazar</Btn>
                </div>}
              </div>
            </div>;
          })}
        </div>
      }
    </div>}
  </div>;
}



function ProyectoMaterialesTab({C,proyecto,materiales,onSaveProyecto,readonly}){
  const [matId,setMatId]=useState("");
  const [cant,setCant]=useState(1);
  const [precio,setPrecio]=useState(0);
  const [descMan,setDescMan]=useState("");
  const matsImputados=(proyecto.costos||[]).filter(c=>c.autoMat||c.tipo==="Materiales");

  const matSel=materiales.find(m=>m.id===matId);

  const imputar=()=>{
    if(!matSel||cant<=0)return;
    const total=cant*(matSel.precioUnitario||0);
    const nuevo={id:newId(),tipo:"Materiales",desc:`${matSel.nombre} × ${cant} ${matSel.unidad||"u"}`,cant,precio:matSel.precioUnitario||0,total,fecha:new Date().toISOString().slice(0,10),materialId:matSel.id,autoMat:true};
    onSaveProyecto({...proyecto,costos:[...(proyecto.costos||[]),nuevo]});
    setMatId("");setCant(1);
  };
  const imputarManual=()=>{
    if(!descMan.trim()||cant<=0||precio<=0)return;
    const total=cant*precio;
    const nuevo={id:newId(),tipo:"Materiales",desc:`${descMan} × ${cant}`,cant,precio,total,fecha:new Date().toISOString().slice(0,10),autoMat:false};
    onSaveProyecto({...proyecto,costos:[...(proyecto.costos||[]),nuevo]});
    setDescMan("");setCant(1);setPrecio(0);
  };
  const eliminar=id=>onSaveProyecto({...proyecto,costos:(proyecto.costos||[]).filter(c=>c.id!==id)});

  const totalMat=matsImputados.reduce((s,c)=>s+(c.total||0),0);

  return <div>
    {!readonly&&<div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:7,padding:14,marginBottom:14}}>
      <div style={{fontSize:12,fontWeight:700,color:C.text,fontFamily:ff,marginBottom:10}}>Imputar material al proyecto</div>
      <G cols={3}>
        <Fld C={C} label="Desde catálogo">
          <SelBusca C={C} value={matId} onChange={v=>{setMatId(v);const m=materiales.find(x=>x.id===v);if(m)setPrecio(m.precioUnitario||0);}} opts={[{value:"",label:"— Seleccionar material —"},...materiales.map(m=>({value:m.id,label:`${m.nombre} · ${fmtCLP(m.precioUnitario||0)}/${m.unidad||"u"}`}))]}/>
        </Fld>
        <Fld C={C} label={`Cantidad${matSel?` (${matSel.unidad||"u"})`:""}`}>
          <Inp C={C} value={cant} onChange={v=>setCant(Math.max(0,+v||0))} type="number"/>
        </Fld>
        <Fld C={C} label="Total">
          <div style={{padding:"8px 11px",background:C.bg0,borderRadius:5,border:"1px solid "+C.border,fontSize:14,fontWeight:700,color:matSel?C.green:C.textM,fontFamily:ff}}>{fmtCLP(cant*(matSel?.precioUnitario||0))}</div>
        </Fld>
      </G>
      <Btn C={C} small onClick={imputar} disabled={!matId||cant<=0}>Imputar al proyecto</Btn>

      <div style={{borderTop:"1px solid "+C.border,marginTop:14,paddingTop:12}}>
        <div style={{fontSize:11,fontWeight:600,color:C.textM,fontFamily:ff,marginBottom:8}}>O ítem manual (no está en catálogo):</div>
        <G cols={3}>
          <Fld C={C} label="Descripción"><Inp C={C} value={descMan} onChange={setDescMan} placeholder="Ej: Cable especial 4mm"/></Fld>
          <Fld C={C} label="Cantidad"><Inp C={C} value={cant} onChange={v=>setCant(Math.max(0,+v||0))} type="number"/></Fld>
          <Fld C={C} label="Precio unitario" prefix="$"><Inp C={C} value={precio} onChange={v=>setPrecio(Math.max(0,+v||0))} type="number"/></Fld>
        </G>
        <Btn C={C} small variant="soft" onClick={imputarManual} disabled={!descMan.trim()||cant<=0||precio<=0}>Imputar ítem manual</Btn>
      </div>
    </div>}

    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
      <div style={{fontSize:12,fontFamily:ff,color:C.textM}}>Materiales imputados al proyecto: <b style={{color:C.text}}>{matsImputados.length}</b></div>
      <div style={{fontSize:13,fontFamily:ff,color:C.green,fontWeight:700}}>Total: {fmtCLP(totalMat)}</div>
    </div>

    {matsImputados.length===0
      ?<EmptyState C={C} icon="📦" title="Sin materiales imputados" sub="Imputa materiales del catálogo o como ítem manual."/>
      :<div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,overflow:"hidden"}}>
        {matsImputados.map((m,i)=><div key={m.id||i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderBottom:i<matsImputados.length-1?"1px solid "+C.border:"none",background:i%2===0?C.bg1:C.bg2}}>
          <div style={{flex:1}}>
            <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>{m.desc}</div>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{m.fecha} · {m.autoMat?"Catálogo":"Manual"}</div>
          </div>
          <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>×{m.cant}</div>
          <div style={{fontSize:13,fontWeight:700,color:C.green,fontFamily:ff,minWidth:90,textAlign:"right",fontVariantNumeric:"tabular-nums"}}>{fmtCLP(m.total)}</div>
          {!readonly&&<button onClick={()=>eliminar(m.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:14}}>✕</button>}
        </div>)}
      </div>
    }
  </div>;
}

function ProyectoIncidenciasTab({C,proyecto,incidencias,tecnicos,onSave,onDelete,onSaveProyecto,readonly}){
  const [modal,setModal]=useState(null);
  const incs=incidencias.filter(i=>i.tipo!=="adicional");
  const adds=incidencias.filter(i=>i.tipo==="adicional");
  const [subTab,setSubTab]=useState("inc");
  return <div>
    <div style={{display:"flex",gap:3,marginBottom:12,background:C.bg2,padding:3,borderRadius:6,border:"1px solid "+C.border,width:"fit-content"}}>
      {[["inc",`Incidencias (${incs.length})`],["add",`Adicionales (${adds.length})`]].map(([id,lbl])=>
        <button key={id} onClick={()=>setSubTab(id)} style={{padding:"5px 14px",borderRadius:4,cursor:"pointer",fontSize:10,fontWeight:600,background:subTab===id?C.blue:"transparent",color:subTab===id?"#fff":C.textM,border:"none",fontFamily:ff,textTransform:"uppercase"}}>{lbl}</button>
      )}
    </div>

    {!readonly&&<div style={{marginBottom:10}}>
      <Btn C={C} small variant="soft" onClick={()=>setModal({tipo:subTab,data:{proyectoId:proyecto.id,...(subTab==="add"?{tipo:"adicional"}:{})}})}>+ {subTab==="inc"?"Nueva incidencia":"Nuevo adicional"}</Btn>
    </div>}

    {subTab==="inc"&&(incs.length===0
      ?<EmptyState C={C} icon="🔧" title="Sin incidencias" sub="Las incidencias permiten registrar problemas que surgen durante la ejecución."/>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {incs.map(inc=>{
          const tec=tecnicos.find(t=>t.id===inc.asignadoA);
          return <div key={inc.id} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,padding:"10px 14px"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,background:COL_PRIO[inc.prioridad]+"22",color:COL_PRIO[inc.prioridad]||C.textM}}>{inc.prioridad}</span>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,background:(COL_EST_INC[inc.estado]||C.textM)+"22",color:COL_EST_INC[inc.estado]||C.textM}}>{inc.estado}</span>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:C.bg2,color:C.textM,border:"1px solid "+C.border}}>{inc.tipoInc}</span>
              <span style={{flex:1}}/>
              {tec&&<span style={{fontSize:10,color:C.textM,fontFamily:ff}}>👷 {tec.nombre}</span>}
              {!readonly&&<button onClick={()=>setModal({tipo:"inc",data:inc})} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontSize:11,fontFamily:ff}}>✏</button>}
              {!readonly&&<button onClick={()=>onDelete(inc.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:13}}>✕</button>}
            </div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff,marginBottom:3}}>{inc.titulo}</div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{inc.descripcion}</div>
          </div>;
        })}
      </div>
    )}

    {subTab==="add"&&(adds.length===0
      ?<EmptyState C={C} icon="📋" title="Sin adicionales" sub="Los adicionales aprobados aumentan automáticamente el valor vendido del proyecto."/>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {adds.map(a=>{
          const colEst=a.estadoAdd==="Aprobado"?C.green:a.estadoAdd==="Rechazado"?C.red:C.amber;
          return <div key={a.id} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,padding:"10px 14px",display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff}}>{a.titulo}</div>
              <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{a.descripcion}</div>
            </div>
            <span style={{fontSize:13,fontWeight:700,color:C.green,fontFamily:ff}}>{fmtCLP(a.monto||0)}</span>
            <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:colEst+"22",color:colEst,fontWeight:600}}>{a.estadoAdd||"Pendiente"}</span>
            {!readonly&&a.estadoAdd==="Pendiente"&&<>
              <button onClick={()=>{onSave({...a,estadoAdd:"Aprobado"});onSaveProyecto({...proyecto,valorVendido:(proyecto.valorVendido||0)+(a.monto||0)});}} style={{background:C.green+"22",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:11,color:C.green,fontFamily:ff,fontWeight:600}}>✓ Aprobar</button>
              <button onClick={()=>onSave({...a,estadoAdd:"Rechazado"})} style={{background:C.red+"22",border:"none",borderRadius:4,padding:"3px 8px",cursor:"pointer",fontSize:11,color:C.red,fontFamily:ff,fontWeight:600}}>✕</button>
            </>}
            {!readonly&&<button onClick={()=>onDelete(a.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:13}}>🗑</button>}
          </div>;
        })}
      </div>
    )}

    {modal?.tipo==="inc"&&<ModalIncidencia C={C} inc={modal.data} proyectos={[proyecto]} tecnicos={tecnicos} onClose={()=>setModal(null)} onSave={i=>{onSave(i);setModal(null);}}/>}
    {modal?.tipo==="add"&&<ModalAdicional C={C} add={modal.data} proyectos={[proyecto]} onClose={()=>setModal(null)} onSave={a=>{onSave(a);setModal(null);}}/>}
  </div>;
}

function ProyectoHitosTab({C,proyecto,params,onSaveProyecto,readonly}){
  const hitos=proyecto.hitosFacturacion||[];
  const [modal,setModal]=useState(null);
  const totalVendido=proyecto.valorVendido||proyecto.valorFinal||proyecto.valorProyecto||0;
  const totalHitos=hitos.reduce((s,h)=>s+(h.monto||0),0);
  const totalFacturado=hitos.filter(h=>h.estado==="Facturado"||h.estado==="Cobrado").reduce((s,h)=>s+(h.monto||0),0);
  const totalCobrado=hitos.filter(h=>h.estado==="Cobrado").reduce((s,h)=>s+(h.monto||0),0);

  const saveHito=h=>{const arr=[...hitos];const i=arr.findIndex(x=>x.id===h.id);if(i>=0)arr[i]=h;else arr.push(h);onSaveProyecto({...proyecto,hitosFacturacion:arr});setModal(null);};
  const deleteHito=id=>onSaveProyecto({...proyecto,hitosFacturacion:hitos.filter(h=>h.id!==id)});

  return <div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:14,padding:12,background:C.bg2,borderRadius:7,border:"1px solid "+C.border}}>
      {[
        {l:"Valor vendido",v:fmtCLP(totalVendido),c:C.text},
        {l:"Planificado en hitos",v:fmtCLP(totalHitos)+(totalVendido>0?` (${Math.round(totalHitos/totalVendido*100)}%)`:""),c:totalHitos===totalVendido?C.green:C.amber},
        {l:"Facturado",v:fmtCLP(totalFacturado),c:C.blue},
        {l:"Cobrado",v:fmtCLP(totalCobrado),c:C.green},
      ].map(k=><div key={k.l} style={{textAlign:"center"}}>
        <div style={{fontSize:9,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{k.l}</div>
        <div style={{fontSize:13,fontWeight:700,color:k.c,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
      </div>)}
    </div>

    {hitos.length===0
      ?<EmptyState C={C} icon="🧾" title="Sin hitos configurados" sub="Define cómo se factura este proyecto. Puedes usar plantillas como 50/50 o 30/40/30."
        action={!readonly&&<div style={{display:"flex",gap:7,flexWrap:"wrap",justifyContent:"center"}}>
          {[["50/50",[{nombre:"Primer pago",condicion:"Inicio de proyecto",pct:50},{nombre:"Pago final",condicion:"Cierre técnico",pct:50}]],["100% al cierre",[{nombre:"Pago único",condicion:"Cierre técnico",pct:100}]],["30/40/30",[{nombre:"Anticipo",condicion:"Inicio de proyecto",pct:30},{nombre:"Avance 50%",condicion:"50% de avance",pct:40},{nombre:"Liquidación",condicion:"Cierre técnico",pct:30}]]].map(([lbl,plantilla])=>(
            <Btn key={lbl} C={C} variant="soft" small onClick={()=>{const nuevos=plantilla.map(h=>({...h,id:newId(),monto:Math.round(totalVendido*h.pct/100),estado:"Pendiente",pct:h.pct}));onSaveProyecto({...proyecto,hitosFacturacion:nuevos});}}>{lbl}</Btn>
          ))}
          <Btn C={C} small onClick={()=>setModal({data:null})}>+ Hito personalizado</Btn>
        </div>}/>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {hitos.map((h,i)=>{
          const colEst=(COL_HITO[h.estado]||((C)=>C.textM))(C);
          return <div key={h.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 14px",background:C.bg1,borderRadius:7,border:"1px solid "+C.border}}>
            <div style={{width:8,height:8,borderRadius:4,background:colEst,flexShrink:0}}/>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff}}>{h.nombre||`Hito ${i+1}`}</span>
                <span style={{fontSize:10,padding:"1px 7px",borderRadius:12,background:colEst+"22",color:colEst,fontWeight:600}}>{h.estado||"Pendiente"}</span>
              </div>
              <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:2}}>{h.condicion} {h.fechaLimite&&`· ${h.fechaLimite}`}</div>
            </div>
            <div style={{textAlign:"right",minWidth:100}}>
              <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{fmtCLP(h.monto||0)}</div>
              <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{Math.round((h.monto||0)/Math.max(1,totalVendido)*100)}%</div>
            </div>
            {!readonly&&<div style={{display:"flex",gap:5,flexShrink:0}}>
              {(h.estado==="Pendiente"||!h.estado)&&<Btn C={C} ghost small color={C.amber} onClick={()=>saveHito({...h,estado:"Condición cumplida"})}>Cumplido</Btn>}
              {h.estado==="Condición cumplida"&&<Btn C={C} ghost small color={C.blue} onClick={()=>saveHito({...h,estado:"Facturado"})}>Facturar</Btn>}
              {h.estado==="Facturado"&&<Btn C={C} ghost small color={C.green} onClick={()=>saveHito({...h,estado:"Cobrado",fechaCobro:new Date().toISOString().slice(0,10)})}>✓ Cobrado</Btn>}
              <Btn C={C} ghost small onClick={()=>setModal({data:h})}>✏</Btn>
              <Btn C={C} ghost small color={C.red} onClick={()=>deleteHito(h.id)}>✕</Btn>
            </div>}
          </div>;
        })}
        {!readonly&&<Btn C={C} variant="soft" small onClick={()=>setModal({data:null})}>+ Agregar hito</Btn>}
      </div>
    }

    {modal&&<ModalHito C={C} hito={modal.data} valorVendido={totalVendido} onClose={()=>setModal(null)} onSave={saveHito}/>}
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TAREAS PANEL — CRUD de tareas dentro de un proyecto (vista desktop)
// Creadas por jefe de operaciones, asignadas a técnicos
// ─────────────────────────────────────────────────────────────────────────────
const EST_TAREA=["Pendiente","En curso","Pausada","Completada","Cancelada"];
const COL_TAREA={Pendiente:"#64748B","En curso":"#3B82F6",Pausada:"#C77700",Completada:"#10B981",Cancelada:"#EF4444"};
const ETAPAS_TAREA=[
  "Visita técnica",
  "Cableado estructurado",
  "Montaje de equipos",
  "Configuración",
  "Pruebas y calibración",
  "Entrega y cierre",
  "Otro"
];

function TareasPanel({C,proyecto,tecnicos,contratistas,usuarios,onSave,readonly}){
  const [modal,setModal]=useState(null);
  const [confId,setConfId]=useState(null);
  const tareas=proyecto.tareas||[];
  const personal=[...tecnicos,...contratistas.map(c=>({...c,_cont:true}))];
  const tecUsuarios=usuarios.filter(u=>u.rol==="tecnico"||u.rol==="supervisor");

  const saveTarea=t=>{
    const arr=[...tareas];const i=arr.findIndex(x=>x.id===t.id);
    if(i>=0)arr[i]=t;else arr.push(t);
    const timeline=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"tarea",desc:`Tarea "${t.nombre}" ${i>=0?"actualizada":"creada"}`}];
    onSave({...proyecto,tareas:arr,timeline});
  };
  const deleteTarea=id=>{
    const timeline=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"tarea_eliminada",desc:`Tarea eliminada`}];
    onSave({...proyecto,tareas:tareas.filter(t=>t.id!==id),timeline});
    setConfId(null);
  };
  const moverTarea=(id,dir)=>{
    const arr=[...tareas];const i=arr.findIndex(x=>x.id===id);
    if((dir===-1&&i===0)||(dir===1&&i===arr.length-1))return;
    [arr[i],arr[i+dir]]=[arr[i+dir],arr[i]];
    onSave({...proyecto,tareas:arr});
  };

  const completadas=tareas.filter(t=>t.estado==="Completada").length;
  const totalH=tareas.reduce((s,t)=>s+(t.duracionEstimada||0),0);
  const etapasConTareas=ETAPAS_TAREA.map(etapa=>({
    etapa,
    tareas:tareas.filter(t=>(t.etapa||"Sin etapa")===etapa)
  })).filter(x=>x.tareas.length>0);

  return <div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:10}}>
      <div style={{display:"flex",gap:16,fontSize:12,fontFamily:ff}}>
        <span style={{color:C.textM}}>Total: <b style={{color:C.text}}>{tareas.length}</b></span>
        <span style={{color:C.textM}}>Completadas: <b style={{color:C.green}}>{completadas}</b></span>
        <span style={{color:C.textM}}>Estimado: <b style={{color:C.blue}}>{totalH}h</b></span>
        {tareas.length>0&&<span style={{color:C.textM}}>Avance: <b style={{color:completadas===tareas.length?C.green:C.amber}}>{Math.round(completadas/tareas.length*100)}%</b></span>}
      </div>
      {!readonly&&<Btn C={C} small onClick={()=>setModal({data:{estado:"Pendiente",etapa:ETAPAS_TAREA[0],duracionEstimada:4,orden:tareas.length}})}>+ Nueva tarea</Btn>}
    </div>

    {/* Barra de progreso */}
    {tareas.length>0&&<div style={{marginBottom:14}}>
      <div style={{height:6,background:C.bg2,borderRadius:3,overflow:"hidden",border:"1px solid "+C.border}}>
        <div style={{height:"100%",width:`${Math.round(completadas/tareas.length*100)}%`,background:`linear-gradient(90deg,${C.blue},${C.green})`,borderRadius:3,transition:"width 0.3s"}}/>
      </div>
    </div>}

    {etapasConTareas.length>0&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:14}}>
      {etapasConTareas.map(({etapa,tareas:ts})=>{
        const done=ts.filter(t=>t.estado==="Completada").length;
        const pct=ts.length?Math.round(done/ts.length*100):0;
        return <div key={etapa} style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:6,padding:"8px 10px",minWidth:140}}>
          <div style={{fontSize:10,fontWeight:700,color:C.blue,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:4}}>{etapa}</div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.textM,fontFamily:ff,marginBottom:5}}>
            <span>{done}/{ts.length} tareas</span><span style={{color:pct===100?C.green:C.amber,fontWeight:700}}>{pct}%</span>
          </div>
          <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
            <div style={{height:"100%",width:pct+"%",background:pct===100?C.green:C.blue}}/>
          </div>
        </div>;
      })}
    </div>}

    {tareas.length===0
      ?<EmptyState C={C} icon="📋" title="Sin tareas creadas" sub="Crea las tareas que debe ejecutar el técnico. Cada tarea tiene asignación, duración estimada y estado de avance."
          action={!readonly&&<Btn C={C} onClick={()=>setModal({data:{estado:"Pendiente",etapa:ETAPAS_TAREA[0],duracionEstimada:4,orden:0}})}>+ Primera tarea</Btn>}/>
      :<div style={{display:"flex",flexDirection:"column",gap:8}}>
        {tareas.map((t,i)=>{
          const asignado=personal.find(p=>p.id===t.asignadoAId)||tecUsuarios.find(u=>u.id===t.asignadoAId);
          const col=COL_TAREA[t.estado]||"#64748B";
          return <div key={t.id} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,overflow:"hidden"}}>
            <div style={{height:3,background:col}}/>
            <div style={{padding:"12px 14px",display:"flex",alignItems:"flex-start",gap:12}}>
              <div style={{fontSize:18,color:C.textM,fontFamily:"monospace",minWidth:28,paddingTop:2}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
                  <span style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:ff}}>{t.nombre}</span>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:col+"22",color:col,fontWeight:600}}>{t.estado}</span>
                  <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:C.blue+"11",color:C.blue,fontWeight:600}}>{t.etapa||"Sin etapa"}</span>
                  {t.duracionEstimada&&<span style={{fontSize:10,color:C.textM,fontFamily:ff}}>⏱ {t.duracionEstimada}h est.</span>}
                </div>
                {t.descripcion&&<div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:6}}>{t.descripcion}</div>}
                <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                  {asignado
                    ?<span style={{fontSize:11,color:C.blue,fontFamily:ff}}>👷 {asignado.nombre}</span>
                    :<span style={{fontSize:11,color:C.red,fontFamily:ff}}>⚠ Sin asignar</span>
                  }
                  {t.fechaTerminada&&<span style={{fontSize:11,color:C.green,fontFamily:ff}}>✓ {t.fechaTerminada}</span>}
                </div>
              </div>
              {!readonly&&<div style={{display:"flex",gap:4,flexShrink:0,flexWrap:"wrap",justifyContent:"flex-end"}}>
                <button onClick={()=>moverTarea(t.id,-1)} disabled={i===0} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:4,padding:"3px 7px",cursor:i===0?"not-allowed":"pointer",fontSize:11,color:C.textM,opacity:i===0?0.4:1}}>↑</button>
                <button onClick={()=>moverTarea(t.id,1)} disabled={i===tareas.length-1} style={{background:"transparent",border:"1px solid "+C.border,borderRadius:4,padding:"3px 7px",cursor:i===tareas.length-1?"not-allowed":"pointer",fontSize:11,color:C.textM,opacity:i===tareas.length-1?0.4:1}}>↓</button>
                <Btn C={C} ghost small onClick={()=>setModal({data:t})}>✏</Btn>
                {t.estado!=="Completada"&&<Btn C={C} ghost small color={C.green} onClick={()=>saveTarea({...t,estado:"Completada",fechaTerminada:new Date().toISOString().slice(0,10)})}>✓</Btn>}
                {confId===t.id
                  ?<><Btn C={C} small color={C.red} onClick={()=>deleteTarea(t.id)}>✓</Btn><Btn C={C} ghost small onClick={()=>setConfId(null)}>✕</Btn></>
                  :<Btn C={C} ghost small color={C.red} onClick={()=>setConfId(t.id)}>🗑</Btn>
                }
              </div>}
            </div>
          </div>;
        })}
      </div>
    }

    {modal&&<ModalTarea C={C} tarea={modal.data} personal={personal} tecUsuarios={tecUsuarios} onClose={()=>setModal(null)} onSave={t=>{saveTarea(t);setModal(null);}}/>}
  </div>;
}

function ModalTarea({C,tarea,personal,tecUsuarios,onClose,onSave}){
  const isEdit=!!tarea?.id;
  const [form,setForm]=useState(tarea||{estado:"Pendiente",etapa:ETAPAS_TAREA[0],duracionEstimada:4});
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const asignables=[...personal,...tecUsuarios.filter(u=>!personal.find(p=>p.email===u.email))];
  const guardar=()=>{if(!form.nombre?.trim())return;onSave({...form,id:form.id||newId(),creadoEl:form.creadoEl||new Date().toISOString()});};
  return <Modal C={C} title={isEdit?"Editar tarea":"Nueva tarea"} onClose={onClose} width={500}>
    <Fld C={C} label="Nombre de la tarea *"><Inp C={C} value={form.nombre||""} onChange={v=>sf("nombre",v)} placeholder="Ej: Instalación cámaras zona oriente"/></Fld>
    <Fld C={C} label="Descripción"><textarea value={form.descripcion||""} onChange={e=>sf("descripcion",e.target.value)} placeholder="Detalle de lo que debe hacer el técnico..." style={{width:"100%",minHeight:60,padding:"8px 11px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:13,color:C.text,fontFamily:ff,resize:"vertical",boxSizing:"border-box"}}/></Fld>
    <G cols={2}>
      <Fld C={C} label="Etapa operativa">
        <Sel C={C} value={form.etapa||ETAPAS_TAREA[0]} onChange={v=>sf("etapa",v)} opts={ETAPAS_TAREA.map(e=>({value:e,label:e}))}/>
      </Fld>
      <Fld C={C} label="Estado">
        <Sel C={C} value={form.estado||"Pendiente"} onChange={v=>sf("estado",v)} opts={EST_TAREA.map(e=>({value:e,label:e}))}/>
      </Fld>
    </G>
    <G cols={2}>
      <Fld C={C} label="Técnico asignado">
        <SelBusca C={C} value={form.asignadoAId||""} onChange={v=>sf("asignadoAId",v)} opts={[{value:"",label:"— Sin asignar —"},...asignables.map(p=>({value:p.id,label:p.nombre+(p._cont?" (Contratista)":"")}))]}/>
      </Fld>
      <Fld C={C} label="Duración estimada" suffix="horas"><Inp C={C} value={form.duracionEstimada||0} onChange={v=>sf("duracionEstimada",+v||0)} type="number"/></Fld>
    </G>
    <Fld C={C} label="Fecha límite (opcional)"><Inp C={C} value={form.fechaLimite||""} onChange={v=>sf("fechaLimite",v)} type="date"/></Fld>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={guardar} disabled={!form.nombre?.trim()}>{isEdit?"Guardar cambios":"Crear tarea"}</Btn>
    </div>
  </Modal>;
}

function rolIcon(rol){
  const map={tecnico:"T",supervisor:"S",almacen:"A",operaciones:"O",admin:"ADM"};
  return map[rol]||"U";
}

// ─────────────────────────────────────────────────────────────────────────────
// REPORTE PROYECTO — Historial completo del proyecto (desktop)
// ─────────────────────────────────────────────────────────────────────────────
function ReporteProyecto({C,proyecto,clientes,instalaciones,tecnicos,contratistas,incidencias,fichajes,params,onReabrir,onSaveProyecto,readonly}){
  const [seccion,setSeccion]=useState("resumen");
  const personal=[...(tecnicos||[]),...(contratistas||[]).map(c=>({...c,_cont:true}))];
  const cliente=clientes?.find(c=>c.id===proyecto.clienteId);
  const inst=instalaciones?.find(i=>i.id===proyecto.instalacionId);
  const tareas=proyecto.tareas||[];
  const completadas=tareas.filter(t=>t.estado==="Completada").length;

  const totalHorasReal=fichajes.reduce((s,f)=>s+(f.horasReales||0),0);
  const totalHorasEst=tareas.reduce((s,t)=>s+(t.duracionEstimada||0),0);
  const desvHoras=totalHorasEst>0?((totalHorasReal-totalHorasEst)/totalHorasEst*100):0;

  const totalCostosReal=(proyecto.costos||[]).reduce((s,c)=>s+(c.total||0),0);
  const costoEst=proyecto.costoEstimado||0;

  const timeline=[...(proyecto.timeline||[])].sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const ICONS_TL={tarea:"📋",tarea_eliminada:"🗑",fichaje:"⏱",foto:"📷",incidencia:"⚠️",cierre:"🔐",reapertura:"🔓",material:"📦",adicional:"📋",default:"📌"};

  const secciones=[["resumen","📊 Resumen"],["tareas","📋 Tareas"],["fichajes","⏱ Fichajes"],["incidencias","⚠️ Incidencias"],["fotos","📷 Fotos"],["solicitudes","📦 Solicitudes"],["timeline","🕐 Línea de tiempo"],["cierre","🔐 Cierre"]];

  return <div>
    {/* Header */}
    <div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:8,padding:"14px 16px",marginBottom:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:11,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>Reporte del proyecto</div>
          <div style={{fontSize:18,fontWeight:700,color:C.text,fontFamily:ff}}>{proyecto.nombre}</div>
          <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:2}}>
            {cliente?getNombreCliente(cliente):"Sin cliente"} {inst&&`· ${inst.nombre||inst.direccion}`}
          </div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <Bdg color={COL_TAREA[proyecto.estadoOp]||"#64748B"}>{proyecto.estadoOp||"—"}</Bdg>
          {proyecto.estadoOp==="Cerrado técnicamente"&&!readonly&&<Btn C={C} ghost small color={C.amber} onClick={()=>{if(window.confirm("¿Reabrir este proyecto? El cierre técnico se mantendrá como historial."))onReabrir();}}>↻ Reabrir</Btn>}
        </div>
      </div>
    </div>

    {/* Nav secciones */}
    <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
      {secciones.map(([id,lbl])=><button key={id} onClick={()=>setSeccion(id)} style={{padding:"5px 12px",borderRadius:20,cursor:"pointer",fontSize:11,fontWeight:seccion===id?700:400,background:seccion===id?C.blue+"22":"transparent",color:seccion===id?C.blue:C.textM,border:"1px solid "+(seccion===id?C.blue:C.border),fontFamily:ff}}>{lbl}</button>)}
    </div>

    {/* ── RESUMEN EJECUTIVO ── */}
    {seccion==="resumen"&&<div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:14}}>
        {[
          {l:"Tareas",val:`${completadas}/${tareas.length}`,sub:tareas.length>0?`${Math.round(completadas/tareas.length*100)}% completado`:"Sin tareas",c:completadas===tareas.length&&tareas.length>0?C.green:C.amber},
          {l:"Horas",val:totalHorasReal>0?`${totalHorasReal.toFixed(1)}h`:"—",sub:totalHorasEst>0?`Est: ${totalHorasEst}h · Desv: ${desvHoras>0?"+":""}${desvHoras.toFixed(0)}%`:"Sin estimación",c:Math.abs(desvHoras)<=10?C.green:Math.abs(desvHoras)<=25?C.amber:C.red},
          {l:"Costo real",val:fmtMil(totalCostosReal),sub:costoEst>0?`Est: ${fmtMil(costoEst)} · Desv: ${totalCostosReal>0?((totalCostosReal-costoEst)/costoEst*100).toFixed(0):"—"}%`:"Sin estimación",c:C.blue},
        ].map(k=><div key={k.l} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,padding:"12px 14px"}}>
          <div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em"}}>{k.l}</div>
          <div style={{fontSize:20,fontWeight:700,color:k.c,fontFamily:ff,marginTop:4}}>{k.val}</div>
          <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginTop:2}}>{k.sub}</div>
        </div>)}
      </div>
      {/* Fechas */}
      <Card C={C}>
        <STitle C={C}>Fechas clave</STitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:10}}>
          {[["Inicio",proyecto.fechaInicio],["Término estimado",proyecto.fechaTermino],["Cierre técnico",proyecto.fechaCierreTec],["Facturación",proyecto.fechaFacturacion]].map(([l,v])=>(
            <div key={l}><div style={{fontSize:10,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.05em"}}>{l}</div><div style={{fontSize:13,fontWeight:v?600:400,color:v?C.text:C.textM,fontFamily:ff,marginTop:3}}>{v||"—"}</div></div>
          ))}
        </div>
      </Card>
    </div>}

    {/* ── TAREAS ── */}
    {seccion==="tareas"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {tareas.length===0?<EmptyState C={C} icon="📋" title="Sin tareas" sub="Este proyecto no tiene tareas registradas."/>
        :tareas.map((t,i)=>{
          const asig=personal.find(p=>p.id===t.asignadoAId);
          const fichajesTarea=fichajes.filter(f=>f.tareaId===t.id);
          const hRealTarea=fichajesTarea.reduce((s,f)=>s+(f.horasReales||0),0);
          const col=COL_TAREA[t.estado]||"#64748B";
          return <div key={t.id} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,overflow:"hidden"}}>
            <div style={{height:3,background:col}}/>
            <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:12}}>
              <div style={{fontSize:13,fontFamily:"monospace",color:C.textM,minWidth:24}}>{i+1}</div>
              <div style={{flex:1}}>
                <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                  <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff}}>{t.nombre}</span>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:12,background:col+"22",color:col,fontWeight:600}}>{t.estado}</span>
                  <span style={{fontSize:10,padding:"2px 7px",borderRadius:12,background:C.blue+"11",color:C.blue,fontWeight:600}}>{t.etapa||"Sin etapa"}</span>
                </div>
                <div style={{display:"flex",gap:12,marginTop:4,fontSize:11,color:C.textM,fontFamily:ff,flexWrap:"wrap"}}>
                  {asig&&<span>👷 {asig.nombre}</span>}
                  <span>⏱ Est: {t.duracionEstimada||0}h · Real: {hRealTarea.toFixed(1)}h</span>
                  {t.fechaTerminada&&<span>✓ Completada: {t.fechaTerminada}</span>}
                </div>
              </div>
            </div>
          </div>;
        })
      }
    </div>}

    {/* ── FICHAJES ── */}
    {seccion==="fichajes"&&<div>
      {fichajes.length===0?<EmptyState C={C} icon="⏱" title="Sin fichajes" sub="No hay registros de fichaje para este proyecto."/>
        :<div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff}}>
            <thead><tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
              {["Fecha","Técnico","Tarea","Inicio","Fin","Horas","GPS","Estado"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:10,color:C.textM,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}
            </tr></thead>
            <tbody>{fichajes.map((f,i)=>{
              const tec=personal.find(p=>p.id===f.tecnicoId);
              const tarea=(proyecto.tareas||[]).find(t=>t.id===f.tareaId);
              return <tr key={f.id} style={{borderBottom:"1px solid "+C.border,background:i%2===0?C.bg1:C.bg2}}>
                <td style={{padding:"7px 10px",fontFamily:"monospace",color:C.textM,fontSize:11}}>{f.inicio?.slice(0,10)||"—"}</td>
                <td style={{padding:"7px 10px",fontWeight:600,color:C.text}}>{tec?.nombre||"—"}</td>
                <td style={{padding:"7px 10px",color:C.textM,fontSize:11}}>{tarea?.nombre?.slice(0,25)||"—"}</td>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:11}}>{f.inicio?.slice(11,16)||"—"}</td>
                <td style={{padding:"7px 10px",fontFamily:"monospace",fontSize:11}}>{f.fin?.slice(11,16)||"—"}</td>
                <td style={{padding:"7px 10px",fontWeight:700,color:C.blue}}>{f.horasReales?`${f.horasReales.toFixed(1)}h`:"—"}</td>
                <td style={{padding:"7px 10px"}}>{f.geoValidado?<span style={{color:C.green,fontSize:12}}>✓</span>:<span style={{color:C.textM,fontSize:11}}>—</span>}</td>
                <td style={{padding:"7px 10px"}}><span style={{fontSize:10,padding:"2px 7px",borderRadius:12,background:f.estado==="completado"?C.green+"22":C.amber+"22",color:f.estado==="completado"?C.green:C.amber}}>{f.estado||"—"}</span></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      }
    </div>}

    {/* ── INCIDENCIAS ── */}
    {seccion==="incidencias"&&<div style={{display:"flex",flexDirection:"column",gap:8}}>
      {incidencias.length===0?<EmptyState C={C} icon="⚠️" title="Sin incidencias" sub="Este proyecto no registra incidencias."/>
        :incidencias.map(inc=>{
          const col=COL_PRIO[inc.prioridad]||"#64748B";
          return <div key={inc.id} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:7,padding:"10px 14px"}}>
            <div style={{display:"flex",gap:8,marginBottom:5,flexWrap:"wrap"}}>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:12,background:col+"22",color:col,fontWeight:600}}>{inc.prioridad}</span>
              <span style={{fontSize:10,padding:"2px 8px",borderRadius:12,background:(COL_EST_INC[inc.estado]||"#64748B")+"22",color:COL_EST_INC[inc.estado]||"#64748B",fontWeight:600}}>{inc.estado}</span>
              <span style={{fontSize:10,color:C.textM,fontFamily:ff}}>{inc.fechaReporte}</span>
            </div>
            <div style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff}}>{inc.titulo}</div>
            {inc.descripcion&&<div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:3}}>{inc.descripcion}</div>}
            {inc.resolucion&&<div style={{marginTop:6,fontSize:11,color:C.green,fontFamily:ff}}>✓ {inc.resolucion}</div>}
          </div>;
        })
      }
    </div>}

    {/* ── FOTOS DE AVANCE ── */}
    {seccion==="fotos"&&<div>
      {(!proyecto.fotos||proyecto.fotos.length===0)
        ?<EmptyState C={C} icon="📷" title="Sin fotos" sub="Las fotos de avance subidas desde la app móvil aparecerán aquí."/>
        :<div>
          <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:12}}>{proyecto.fotos.length} foto{proyecto.fotos.length!==1?"s":""} de avance</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))",gap:10}}>
            {proyecto.fotos.map((f,i)=><div key={f.id||i} style={{borderRadius:8,overflow:"hidden",border:"1px solid "+C.border,background:C.bg1}}>
              <img src={f.archivoBase64||f.miniatura} alt="" style={{width:"100%",height:130,objectFit:"cover",display:"block"}}/>
              <div style={{padding:"6px 8px"}}>
                <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{f.fecha?.slice(0,16).replace("T"," ")||"—"}</div>
                {f.comentario&&<div style={{fontSize:11,color:C.text,fontFamily:ff,marginTop:2}}>{f.comentario}</div>}
                <div style={{fontSize:10,color:C.blue,fontFamily:ff}}>👷 {f.tecnicoNombre||"—"}</div>
              </div>
            </div>)}
          </div>
        </div>
      }
    </div>}

    {/* ── SOLICITUDES DE MATERIAL ── */}
    {seccion==="solicitudes"&&<div>
      {(!proyecto.solicitudesMaterial||proyecto.solicitudesMaterial.length===0)
        ?<EmptyState C={C} icon="📦" title="Sin solicitudes" sub="Las solicitudes de material desde la app móvil aparecerán aquí para que Almacén las gestione."/>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {proyecto.solicitudesMaterial.map((s,i)=>{
            const colEst=s.estado==="entregada"?C.green:s.estado==="rechazada"?C.red:s.estado==="aprobada"?C.blue:C.amber;
            return <div key={s.id||i} style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,overflow:"hidden"}}>
              <div style={{padding:"10px 14px",display:"flex",alignItems:"flex-start",gap:12}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",gap:8,marginBottom:6,flexWrap:"wrap"}}>
                    <span style={{fontSize:10,padding:"2px 8px",borderRadius:12,background:colEst+"22",color:colEst,fontWeight:600,textTransform:"uppercase"}}>{s.estado}</span>
                    <span style={{fontSize:10,color:C.textM,fontFamily:ff}}>👷 {s.tecnicoNombre||"—"}</span>
                    <span style={{fontSize:10,color:C.textM,fontFamily:ff}}>📅 {s.fechaSolicitud?.slice(0,10)||"—"}</span>
                  </div>
                  {(s.items||[]).map((it,j)=><div key={j} style={{fontSize:12,color:C.text,fontFamily:ff,marginBottom:3}}>• {it.descripcion||it.materialId} × {it.cantidad}</div>)}
                  {s.notaTecnico&&<div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:6}}>Nota: {s.notaTecnico}</div>}
                </div>
                {!readonly&&s.estado==="pendiente"&&<div style={{display:"flex",gap:5,flexShrink:0}}>
                  <Btn C={C} ghost small color={C.green} onClick={()=>{
                    const fecha=new Date().toISOString();
                    const sols=(proyecto.solicitudesMaterial||[]).map(x=>x.id===s.id?{...x,estado:"entregada",fechaEntrega:fecha}:x);
                    onSaveProyecto&&onSaveProyecto({...proyecto,solicitudesMaterial:sols,timeline:[...(proyecto.timeline||[]),{fecha,tipo:"material",desc:`Solicitud de material entregada desde reporte técnico`}],updatedAt:fecha});
                  }}>✓ Entregar</Btn>
                  <Btn C={C} ghost small color={C.red} onClick={()=>{
                    const motivo=window.prompt("Motivo del rechazo","");
                    const fecha=new Date().toISOString();
                    const sols=(proyecto.solicitudesMaterial||[]).map(x=>x.id===s.id?{...x,estado:"rechazada",notaAlmacen:motivo||"",fechaRechazo:fecha}:x);
                    onSaveProyecto&&onSaveProyecto({...proyecto,solicitudesMaterial:sols,timeline:[...(proyecto.timeline||[]),{fecha,tipo:"material",desc:`Solicitud de material rechazada desde reporte técnico`}],updatedAt:fecha});
                  }}>✕ Rechazar</Btn>
                </div>}
              </div>
            </div>;
          })}
        </div>
      }
    </div>}

    {/* ── LÍNEA DE TIEMPO ── */}
    {seccion==="timeline"&&<div>
      {timeline.length===0?<EmptyState C={C} icon="🕐" title="Sin historial" sub="Las acciones del proyecto aparecerán aquí cronológicamente."/>
        :<div style={{position:"relative",paddingLeft:32}}>
          <div style={{position:"absolute",left:12,top:0,bottom:0,width:2,background:C.border}}/>
          {timeline.map((ev,i)=>(
            <div key={i} style={{position:"relative",marginBottom:14}}>
              <div style={{position:"absolute",left:-26,top:3,width:12,height:12,borderRadius:6,background:C.bg1,border:"2px solid "+C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:8}}>{ICONS_TL[ev.tipo]||ICONS_TL.default}</div>
              <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:6,padding:"8px 12px"}}>
                <div style={{fontSize:10,color:C.textM,fontFamily:"monospace",marginBottom:3}}>{ev.fecha?.slice(0,16).replace("T"," ")||"—"}</div>
                <div style={{fontSize:12,color:C.text,fontFamily:ff}}>{ev.desc}</div>
                {ev.usuario&&<div style={{fontSize:10,color:C.textM,fontFamily:ff,marginTop:2}}>Por: {ev.usuario}</div>}
              </div>
            </div>
          ))}
        </div>
      }
    </div>}

    {/* ── CIERRE TÉCNICO ── */}
    {seccion==="cierre"&&<div>
      {!proyecto.cierreTecnico
        ?<EmptyState C={C} icon="🔐" title="Proyecto no cerrado técnicamente" sub="El cierre técnico con firma digital del cliente aparecerá aquí cuando el técnico lo ejecute desde la app móvil."/>
        :<div>
          <Card C={C}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <STitle C={C}>Acta de recepción</STitle>
              <Btn C={C} ghost small onClick={()=>{
                // Generar PDF con jsPDF
                try{
                  const {jsPDF}=window.jspdf||{};
                  if(!jsPDF){alert("jsPDF no disponible. Asegúrate de tener conexión a internet.");return;}
                  const doc=new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
                  const ci=proyecto.cierreTecnico;
                  const cl=clientes?.find(c=>c.id===proyecto.clienteId);
                  const inst=instalaciones?.find(i=>i.id===proyecto.instalacionId);
                  const pageW=210;const margin=20;const contentW=pageW-margin*2;
                  let y=20;
                  // Header
                  doc.setFillColor(30,58,138);doc.rect(0,0,pageW,35,"F");
                  doc.setTextColor(255,255,255);doc.setFontSize(18);doc.setFont("helvetica","bold");
                  doc.text("ASSUR",margin,18);
                  doc.setFontSize(10);doc.setFont("helvetica","normal");
                  doc.text("ACTA DE RECEPCIÓN DE TRABAJO",margin,26);
                  y=45;
                  // Datos proyecto
                  doc.setTextColor(15,23,42);doc.setFontSize(14);doc.setFont("helvetica","bold");
                  doc.text(proyecto.nombre||"—",margin,y);y+=8;
                  doc.setFontSize(10);doc.setFont("helvetica","normal");doc.setTextColor(100,116,139);
                  doc.text(`Proyecto: ${proyecto.numero||"—"}`,margin,y);y+=5;
                  if(cl)doc.text(`Cliente: ${getNombreCliente(cl)}`,margin,y);y+=5;
                  if(inst)doc.text(`Instalación: ${inst.nombre||inst.direccion||"—"}`,margin,y);y+=10;
                  // Línea
                  doc.setDrawColor(226,232,240);doc.line(margin,y,pageW-margin,y);y+=8;
                  // Receptor
                  doc.setFontSize(12);doc.setFont("helvetica","bold");doc.setTextColor(15,23,42);
                  doc.text("RECIBIDO CONFORME POR",margin,y);y+=7;
                  const campos=[[`Nombre:`,ci.receptorNombre||"—"],[`RUT:`,ci.receptorRut||"—"],[`Cargo:`,ci.receptorCargo||"—"],[`Email:`,ci.receptorEmail||"—"]];
                  doc.setFont("helvetica","normal");doc.setFontSize(10);
                  campos.forEach(([l,v])=>{doc.setTextColor(100,116,139);doc.text(l,margin,y);doc.setTextColor(15,23,42);doc.text(v,margin+30,y);y+=6;});
                  y+=4;doc.setDrawColor(226,232,240);doc.line(margin,y,pageW-margin,y);y+=8;
                  // Resumen trabajo
                  doc.setFontSize(12);doc.setFont("helvetica","bold");doc.setTextColor(15,23,42);
                  doc.text("RESUMEN DEL TRABAJO",margin,y);y+=7;
                  doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(100,116,139);
                  doc.text("Tareas completadas:",margin,y);doc.setTextColor(15,23,42);doc.text(`${ci.tareasCompletadas||0}`,margin+45,y);y+=6;
                  doc.setTextColor(100,116,139);doc.text("Horas trabajadas:",margin,y);doc.setTextColor(15,23,42);doc.text(`${ci.horasReales||0}h`,margin+45,y);y+=6;
                  doc.setTextColor(100,116,139);doc.text("Técnico responsable:",margin,y);doc.setTextColor(15,23,42);doc.text(ci.tecnicoNombre||"—",margin+45,y);y+=6;
                  doc.setTextColor(100,116,139);doc.text("Fecha y hora:",margin,y);doc.setTextColor(15,23,42);doc.text(ci.fecha?.slice(0,16).replace("T"," ")||"—",margin+45,y);y+=6;
                  doc.setTextColor(100,116,139);doc.text("GPS:",margin,y);doc.setTextColor(15,23,42);doc.text(ci.geoValidado?"Validado dentro de geocerca":"Registrado sin geocerca",margin+45,y);y+=10;
                  // Notas
                  if(ci.notasFinales){doc.setDrawColor(226,232,240);doc.line(margin,y,pageW-margin,y);y+=8;doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text("NOTAS FINALES:",margin,y);y+=6;doc.setFont("helvetica","normal");doc.setTextColor(15,23,42);const lines=doc.splitTextToSize(ci.notasFinales,contentW);doc.text(lines,margin,y);y+=lines.length*5+5;}
                  // Firma
                  if(ci.firmaBase64){
                    y+=4;doc.setDrawColor(226,232,240);doc.line(margin,y,pageW-margin,y);y+=8;
                    doc.setFont("helvetica","bold");doc.setFontSize(10);doc.setTextColor(15,23,42);doc.text("FIRMA DEL RECEPTOR:",margin,y);y+=4;
                    try{doc.addImage(ci.firmaBase64,"PNG",margin,y,80,30);}catch(e){}
                    y+=36;doc.setDrawColor(15,23,42);doc.line(margin,y,margin+80,y);y+=5;
                    doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(100,116,139);doc.text(`${ci.receptorNombre||"—"} · ${ci.receptorRut||"—"}`,margin,y);y+=8;
                  }
                  // Footer
                  doc.setFillColor(248,250,252);doc.rect(0,280,pageW,17,"F");
                  doc.setFontSize(8);doc.setTextColor(148,163,184);doc.setFont("helvetica","normal");
                  doc.text(`Documento generado por Assur Control · ${new Date().toLocaleDateString("es-CL")}`,margin,288);
                  doc.save(`Acta_${proyecto.numero||proyecto.id}_${(ci.receptorNombre||"").replace(/\s/g,"_")}.pdf`);
                }catch(e){console.error(e);alert("Error al generar PDF: "+e.message);}
              }}>📄 Descargar PDF acta</Btn>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Datos del receptor</div>
                {[["Nombre",proyecto.cierreTecnico.receptorNombre],["RUT",proyecto.cierreTecnico.receptorRut],["Cargo",proyecto.cierreTecnico.receptorCargo||"—"],["Email",proyecto.cierreTecnico.receptorEmail||"—"]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",gap:10,marginBottom:6,fontSize:13,fontFamily:ff}}>
                    <span style={{color:C.textM,minWidth:60}}>{l}:</span>
                    <span style={{color:C.text,fontWeight:600}}>{v||"—"}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Detalles del cierre</div>
                {[["Cerrado por",proyecto.cierreTecnico.tecnicoNombre||"—"],["Fecha",proyecto.cierreTecnico.fecha?.slice(0,16).replace("T"," ")||"—"],["GPS",proyecto.cierreTecnico.geoValidado?"Dentro de geocerca":"Sin GPS"]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",gap:10,marginBottom:6,fontSize:13,fontFamily:ff}}>
                    <span style={{color:C.textM,minWidth:80}}>{l}:</span>
                    <span style={{color:C.text,fontWeight:600}}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
            {proyecto.cierreTecnico.firmaBase64&&<div style={{marginTop:14}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Firma del receptor</div>
              <div style={{background:"#fff",border:"1px solid "+C.border,borderRadius:6,padding:8,display:"inline-block"}}>
                <img src={proyecto.cierreTecnico.firmaBase64} alt="Firma digital" style={{maxWidth:300,maxHeight:120,display:"block"}}/>
              </div>
            </div>}
            {proyecto.cierreTecnico.notasFinales&&<div style={{marginTop:10,padding:"10px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,fontSize:12,color:C.textS,fontFamily:ff}}>
              <b style={{color:C.text}}>Notas finales:</b> {proyecto.cierreTecnico.notasFinales}
            </div>}
            {(proyecto.cierreTecnico.checklist||proyecto.checklistCierre)?.length>0&&<div style={{marginTop:14}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textM,fontFamily:ff,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8}}>Checklist de cierre</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:7}}>
                {(proyecto.cierreTecnico.checklist||proyecto.checklistCierre||[]).map((item,i)=><div key={item.id||i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:item.ok?C.green+"11":C.bg2,border:"1px solid "+(item.ok?C.green+"33":C.border),borderRadius:5}}>
                  <span style={{color:item.ok?C.green:C.textM,fontWeight:700,fontSize:12}}>{item.ok?"✓":"·"}</span>
                  <span style={{fontSize:11,color:item.ok?C.text:C.textM,fontFamily:ff}}>{item.texto||item}</span>
                </div>)}
              </div>
            </div>}
            {proyecto.reaperturas?.length>0&&<div style={{marginTop:12,padding:"10px 12px",background:C.amber+"11",borderRadius:5,border:"1px solid "+C.amber+"44",fontSize:11,color:C.amber,fontFamily:ff}}>
              ⚠ Este proyecto fue reabierto {proyecto.reaperturas.length} vez{proyecto.reaperturas.length!==1?"es":""} después del cierre.
            </div>}
          </Card>
        </div>
      }
    </div>}
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// GEO HELPERS — Haversine + validación de geocerca
// ─────────────────────────────────────────────────────────────────────────────
function haversineMetros(lat1,lng1,lat2,lng2){
  const R=6371000; // Radio de la Tierra en metros
  const dLat=(lat2-lat1)*Math.PI/180;
  const dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

function validarGeocerca(userLat,userLng,instalacion){
  if(!instalacion?.geoLat||!instalacion?.geoLng) return {valido:true,distancia:null,sinGeo:true};
  const distancia=Math.round(haversineMetros(userLat,userLng,instalacion.geoLat,instalacion.geoLng));
  const radio=instalacion.geoRadioMetros||100;
  return {valido:distancia<=radio,distancia,radio,sinGeo:false};
}

function obtenerGeolocalizacion(){
  return new Promise((resolve,reject)=>{
    if(!navigator.geolocation){reject(new Error("Geolocalización no disponible en este dispositivo"));return;}
    navigator.geolocation.getCurrentPosition(
      p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:Math.round(p.coords.accuracy)}),
      e=>reject(new Error(e.code===1?"Permiso de ubicación denegado":e.code===2?"Ubicación no disponible":"Tiempo de espera agotado")),
      {enableHighAccuracy:true,timeout:10000,maximumAge:0}
    );
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// MOBILE APP — Punto de entrada para roles móviles (técnico, supervisor, almacén)
// ─────────────────────────────────────────────────────────────────────────────
export function MobileApp({C,session,rol,proyectos,tecnicos,contratistas,materiales,incidencias,fichajes,instalaciones,params,usuarios,onSaveProyecto,onSaveFichaje,onSaveIncidencia,onSaveProyectoFoto,onSaveSolicitud,onLogout}){
  const [screen,setScreen]=useState("home"); // home|proyecto|tarea|cierre|perfil
  const [selProy,setSelProy]=useState(null);
  const [selTarea,setSelTarea]=useState(null);
  const [initialAction,setInitialAction]=useState(null);
  const ff2="'Inter','Helvetica Neue',Arial,sans-serif";

  const personal=[...(tecnicos||[]),...(contratistas||[]).map(c=>({...c,_cont:true}))];
  const sessionIds=[session.userId,session.tecnicoId,...(session.linkedIds||[])].filter(Boolean);
  const primaryTechId=session.tecnicoId||session.userId;

  // Proyectos asignados a este técnico
  const proyAsignados=proyectos.filter(p=>{
    if(!p.tareas?.length)return false;
    return p.tareas.some(t=>sessionIds.includes(t.asignadoAId)||(!t.asignadoAId&&!t.asignadoA))&&p.estadoOp!=="Cerrado técnicamente"&&p.estadoOp!=="Cerrado";
  });
  // Fichaje activo del técnico
  const fichajeActivo=fichajes.find(f=>sessionIds.includes(f.tecnicoId)&&f.estado==="activo");

  const goHome=()=>{setScreen("home");setSelProy(null);setSelTarea(null);setInitialAction(null);};
  const goProyecto=(p,action=null)=>{setSelProy(p);setSelTarea(null);setInitialAction(action);setScreen("proyecto");};
  const goTarea=t=>{setSelTarea(t);setInitialAction(null);setScreen("tarea");};
  const goActiveFichaje=()=>{
    if(!fichajeActivo)return false;
    const p=proyectos.find(x=>x.id===fichajeActivo.proyectoId);
    const t=(p?.tareas||[]).find(x=>x.id===fichajeActivo.tareaId);
    if(p&&t){setSelProy(p);setSelTarea(t);setInitialAction(null);setScreen("tarea");return true;}
    if(p){goProyecto(p);return true;}
    return false;
  };
  const goFirstProject=()=>{
    if(goActiveFichaje())return;
    if(proyAsignados[0])goProyecto(proyAsignados[0]);
  };

  // Colores móvil de alto contraste, pensados para uso en terreno.
  const MC=C.isLight
    ?{...C,bg:"#F4F7FA",card:"#FFFFFF",border:"#D8E1EA",text:"#162334",muted:"#627286",blue:"#1767A6",green:"#198754",amber:"#B7791F",red:"#C2413A",purple:"#6D4BC3",ink:"#0B1724"}
    :{...C,bg:"#0B1220",card:"#182232",border:"#2A3A4F",text:"#F2F6FA",muted:"#A8B5C6",blue:"#64B5F6",green:"#59D38C",amber:"#F3C95F",red:"#F47B73",purple:"#B395F2",ink:"#F8FAFC"};
  const isDark=!C.isLight;

  return <div style={{fontFamily:ff2,background:isDark?MC.bg:"#F4F7FA",minHeight:"100vh",maxWidth:520,margin:"0 auto",position:"relative",display:"flex",flexDirection:"column"}}>

    <div style={{background:isDark?"#08111F":"#101C2B",padding:"18px 18px 20px",borderBottom:"1px solid "+(isDark?MC.border:"#27384A"),position:"sticky",top:0,zIndex:40,boxShadow:isDark?"none":"0 10px 24px rgba(15,23,42,0.14)"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <img src={isDark?assurHexWhite:assurHexDark} alt="ASSUR" style={{width:28,height:28,objectFit:"contain",display:"block"}}/>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          <span style={{fontSize:14,fontWeight:900,color:"#FFFFFF",letterSpacing:"0.22em",lineHeight:1}}>ASSUR</span>
          <span style={{fontSize:8,fontWeight:800,color:"#83C9EE",letterSpacing:"0.32em",lineHeight:1}}>CONTROL</span>
        </div>
      </div>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {fichajeActivo&&<span style={{fontSize:11,background:"rgba(31,138,85,0.16)",color:"#7CE2AD",padding:"5px 10px",borderRadius:20,fontWeight:850}}>EN CURSO</span>}
        <span style={{fontSize:15,color:"#83C9EE"}}>{rolIcon(rol)}</span>
      </div>
      </div>
      <div style={{marginTop:18}}>
        <div style={{fontSize:12,color:"#8FA4BB",fontWeight:800,textTransform:"capitalize"}}>{new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"})}</div>
        <div style={{fontSize:24,fontWeight:900,color:"#FFFFFF",lineHeight:1.1,marginTop:2}}>Hola, {session.nombre.split(" ")[0]}</div>
      </div>
    </div>

    {/* CONTENIDO */}
    <div style={{flex:1,overflowY:"auto",paddingBottom:80}}>
      {screen==="home"&&<MobileHome C={MC} session={session} sessionIds={sessionIds} rol={rol} proyAsignados={proyAsignados} fichajeActivo={fichajeActivo} fichajes={fichajes} onGoProyecto={goProyecto} onGoActiveFichaje={goActiveFichaje} isDark={isDark}/>}
      {screen==="proyecto"&&selProy&&<MobileProyecto C={MC} proyecto={selProy} session={session} personal={personal} fichajes={fichajes.filter(f=>f.proyectoId===selProy.id)} incidencias={incidencias.filter(i=>i.proyectoId===selProy.id)} materiales={materiales} instalacion={(instalaciones||[]).find(i=>i.id===selProy.instalacionId)||null} fichajeActivo={fichajeActivo} initialAction={initialAction} onActionConsumed={()=>setInitialAction(null)} onGoTarea={goTarea} onSaveProyecto={p=>{onSaveProyecto(p);setSelProy(p);}} onSaveFichaje={onSaveFichaje} onSaveIncidencia={onSaveIncidencia} onSaveProyectoFoto={onSaveProyectoFoto} onSaveSolicitud={onSaveSolicitud} onGoBack={goHome} onGoCierre={()=>setScreen("cierre")} isDark={isDark}/>}
      {screen==="tarea"&&selTarea&&selProy&&<MobileTarea C={MC} tarea={selTarea} proyecto={selProy} session={session} primaryTechId={primaryTechId} personal={personal} fichajes={fichajes.filter(f=>f.tareaId===selTarea.id&&sessionIds.includes(f.tecnicoId))} fichajeActivo={fichajeActivo} materiales={materiales} instalacion={(instalaciones||[]).find(i=>i.id===selProy.instalacionId)||null} onSaveProyecto={p=>{onSaveProyecto(p);setSelProy(p);}} onSaveFichaje={onSaveFichaje} onSaveProyectoFoto={onSaveProyectoFoto} onGoBack={()=>setScreen("proyecto")} isDark={isDark}/>}
      {screen==="cierre"&&selProy&&<MobileCierre C={MC} proyecto={selProy} session={session} fichajes={fichajes.filter(f=>f.proyectoId===selProy.id)} onSaveProyecto={p=>{onSaveProyecto(p);setSelProy(p);setScreen("proyecto");}} onGoBack={()=>setScreen("proyecto")} isDark={isDark}/>}
      {screen==="perfil"&&<MobilePerfil C={MC} session={session} rol={rol} personal={personal} proyAsignados={proyAsignados} fichajes={fichajes} sessionIds={sessionIds} isDark={isDark}/>}
    </div>

    {/* BOTTOM NAV */}
    <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:520,background:isDark?"#08111F":"#fff",borderTop:"1px solid "+MC.border,display:"flex",zIndex:50,boxShadow:"0 -8px 24px rgba(15,23,42,0.12)"}}>
      {[["home","⌂","Inicio"],["proyecto","▤","Proyectos"],["perfil","○","Perfil"]].map(([s,ic,lbl])=>{
        const active=(screen==="home"&&s==="home")||(["proyecto","tarea","cierre"].includes(screen)&&s==="proyecto")||(screen==="perfil"&&s==="perfil");
        return <button key={s} onClick={()=>s==="proyecto"?goFirstProject():s==="perfil"?setScreen("perfil"):goHome()} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
          <span style={{fontSize:22,color:active?MC.blue:MC.muted}}>{ic}</span>
          <span style={{fontSize:9,fontWeight:600,color:active?MC.blue:MC.muted,fontFamily:ff2,letterSpacing:"0.05em",textTransform:"uppercase"}}>{lbl}</span>
        </button>
      })}
      <button onClick={onLogout} style={{flex:1,padding:"10px 4px 8px",background:"transparent",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:2}}>
        <span style={{fontSize:22,color:MC.muted}}>↪</span>
        <span style={{fontSize:9,fontWeight:600,color:MC.muted,fontFamily:ff2,textTransform:"uppercase"}}>Salir</span>
      </button>
    </div>
  </div>;
}

// ─── MOBILE HOME ───────────────────────────────────────────────────────────
function MobileHome({C,session,sessionIds=[],rol,proyAsignados,fichajeActivo,fichajes,onGoProyecto,onGoActiveFichaje,isDark}){
  const hoy=new Date().toLocaleDateString("es-CL",{weekday:"long",day:"numeric",month:"long"});
  const horasHoy=fichajes.filter(f=>{
    const d=f.inicio?.slice(0,10);
    return d===new Date().toISOString().slice(0,10)&&sessionIds.includes(f.tecnicoId);
  }).reduce((s,f)=>s+(f.horasReales||0),0);
  const esTareaVisible=t=>sessionIds.includes(t.asignadoAId)||(!t.asignadoAId&&!t.asignadoA);
  const proyectoActual=proyAsignados.find(p=>(p.tareas||[]).some(t=>esTareaVisible(t)&&t.estado==="En curso"))||proyAsignados[0];
  const tareasPendientes=proyAsignados.flatMap(p=>(p.tareas||[]).filter(t=>esTareaVisible(t)&&t.estado!=="Completada"));

  const primeraTarea=proyectoActual?(proyectoActual.tareas||[]).find(t=>esTareaVisible(t)&&t.estado==="En curso")||(proyectoActual.tareas||[]).find(t=>esTareaVisible(t)&&t.estado!=="Completada"):null;
  const quickProjectAction=action=>{
    if(fichajeActivo&&action==="fichaje"){onGoActiveFichaje&&onGoActiveFichaje();return;}
    if(proyectoActual)onGoProyecto(proyectoActual,action);
  };

  return <div style={{padding:"16px 16px 22px"}}>
    <div style={{marginBottom:14}}>
      <div style={{fontSize:11,color:C.blue,fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.12em",fontWeight:900,marginBottom:5}}>Mi jornada</div>
      <div style={{fontSize:21,fontWeight:900,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.15}}>Trabajo asignado</div>
      <div style={{fontSize:14,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:4,textTransform:"capitalize"}}>{hoy}</div>
    </div>

    {proyectoActual
      ?<button onClick={()=>onGoProyecto(proyectoActual)} style={{width:"100%",textAlign:"left",background:isDark?"#142033":"#fff",border:"1px solid "+C.border,borderRadius:14,padding:"18px",boxShadow:isDark?"0 10px 24px rgba(0,0,0,0.22)":"0 12px 30px rgba(20,35,55,0.08)",cursor:"pointer",marginBottom:14}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",marginBottom:14}}>
          <div>
            <div style={{fontSize:10,color:C.blue,fontWeight:800,letterSpacing:"0.14em",fontFamily:"'Inter',sans-serif",textTransform:"uppercase",marginBottom:6}}>Proyecto actual</div>
            <div style={{fontSize:22,fontWeight:900,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.15}}>{proyectoActual.nombre}</div>
            <div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:5}}>{proyectoActual.codigo||proyectoActual.numero||"Sin código"}</div>
          </div>
          <span style={{fontSize:11,padding:"5px 10px",borderRadius:20,background:C.green+"18",color:C.green,fontWeight:800,whiteSpace:"nowrap"}}>{proyectoActual.estadoOp||"Activo"}</span>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:14}}>
          <div style={{background:isDark?"#0B1220":"#F4F7FA",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:3}}>Tareas pendientes</div>
            <div style={{fontSize:24,color:C.text,fontWeight:800}}>{(proyectoActual.tareas||[]).filter(t=>esTareaVisible(t)&&t.estado!=="Completada").length}</div>
          </div>
          <div style={{background:isDark?"#0B1220":"#F4F7FA",borderRadius:10,padding:"10px 12px"}}>
            <div style={{fontSize:11,color:C.muted,fontWeight:700,marginBottom:3}}>Horas hoy</div>
            <div style={{fontSize:24,color:C.green,fontWeight:800}}>{horasHoy.toFixed(1)}h</div>
          </div>
        </div>
        <div style={{width:"100%",background:C.blue,borderRadius:11,padding:"15px 16px",boxSizing:"border-box",textAlign:"center",color:"#fff",fontSize:15,fontWeight:900,fontFamily:"'Inter',sans-serif",letterSpacing:"0.02em"}}>Continuar trabajo</div>
      </button>
      :<div style={{textAlign:"center",padding:"34px 20px",background:isDark?"#142033":"#fff",borderRadius:14,border:"1px dashed "+C.border,marginBottom:14}}>
        <div style={{fontSize:14,fontWeight:800,color:C.text,fontFamily:"'Inter',sans-serif"}}>Sin proyectos asignados</div>
        <div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:6}}>Cuando operaciones asigne tareas, aparecerán aquí.</div>
      </div>}

    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:18}}>
      {[
        {l:"Fichaje",v:fichajeActivo?"Activo":"Libre",c:fichajeActivo?C.green:C.blue},
        {l:"Proyectos",v:proyAsignados.length,c:C.blue},
        {l:"Pendientes",v:tareasPendientes.length,c:tareasPendientes.length?C.amber:C.green},
      ].map(k=><div key={k.l} style={{background:isDark?"#142033":"#fff",border:"1px solid "+C.border,borderRadius:12,padding:"12px 10px"}}>
        <div style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif",fontWeight:800,textTransform:"uppercase",letterSpacing:"0.08em"}}>{k.l}</div>
        <div style={{fontSize:String(k.v).length>6?15:20,fontWeight:800,color:k.c,fontFamily:"'Inter',sans-serif",marginTop:5}}>{k.v}</div>
      </div>)}
    </div>

    <div style={{fontSize:12,fontWeight:900,color:C.muted,fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Accesos rápidos</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
      {[["▣","Fichar jornada",C.green,"fichaje"],["◉","Subir foto",C.blue,"foto"],["□","Pedir material",C.purple,"material"],["!","Reportar incidencia",C.amber,"incidencia"],["✓","Cierre técnico",C.green,"cierre"]].map(([ic,l,c,action])=><button key={l} onClick={()=>quickProjectAction(action)} disabled={!proyectoActual} style={{background:action==="fichaje"?C.blue:(isDark?"#142033":"#fff"),border:"1px solid "+(action==="fichaje"?C.blue:C.border),borderRadius:14,padding:"14px 12px",textAlign:"left",cursor:proyectoActual?"pointer":"not-allowed",opacity:proyectoActual?1:0.55,display:"flex",alignItems:"center",gap:10,minHeight:88,gridColumn:action==="cierre"?"1 / -1":undefined,boxShadow:action==="fichaje"&&!isDark?"0 12px 22px rgba(27,95,134,0.18)":"none"}}>
        <div style={{width:34,height:34,borderRadius:12,background:c+"18",fontSize:20,color:c,fontWeight:900,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{ic}</div>
        <div style={{fontSize:15,color:action==="fichaje"?"#fff":C.text,fontWeight:900,fontFamily:"'Inter',sans-serif",lineHeight:1.15}}>{l}</div>
      </button>)}
    </div>
    {proyectoActual&&primeraTarea&&<button onClick={()=>onGoProyecto(proyectoActual)} style={{width:"100%",background:isDark?"#0F1B2B":"#EAF3FB",border:"1px solid "+C.blue+"33",borderRadius:12,padding:"12px 14px",textAlign:"left",marginBottom:18,cursor:"pointer"}}>
      <div style={{fontSize:11,color:C.blue,fontWeight:900,letterSpacing:"0.1em",textTransform:"uppercase",fontFamily:"'Inter',sans-serif",marginBottom:4}}>Siguiente acción sugerida</div>
      <div style={{fontSize:13,color:C.text,fontWeight:800,fontFamily:"'Inter',sans-serif"}}>{primeraTarea.estado==="En curso"?"Continuar":"Iniciar"}: {primeraTarea.nombre}</div>
    </button>}

    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
      <div style={{fontSize:12,fontWeight:800,color:C.muted,fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.1em"}}>Mis proyectos</div>
      <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{proyAsignados.length} activo{proyAsignados.length!==1?"s":""}</div>
    </div>

    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {proyAsignados.map(p=>{
        const tareas=p.tareas||[];
        const comp=tareas.filter(t=>esTareaVisible(t)&&t.estado==="Completada").length;
        const total=tareas.filter(esTareaVisible).length;
        const pct=total>0?Math.round(comp/total*100):0;
        return <button key={p.id} onClick={()=>onGoProyecto(p)} style={{background:isDark?"#142033":"#fff",border:"1px solid "+C.border,borderRadius:12,padding:"14px",cursor:"pointer",textAlign:"left",width:"100%"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10,marginBottom:9}}>
            <div>
              <div style={{fontSize:14,fontWeight:800,color:C.text,fontFamily:"'Inter',sans-serif"}}>{p.nombre}</div>
              <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginTop:3}}>{p.codigo||p.numero||"Sin código"}</div>
            </div>
            <div style={{fontSize:14,fontWeight:800,color:pct===100?C.green:C.blue}}>{pct}%</div>
          </div>
          <div style={{height:6,background:isDark?"#0B1220":"#E8EEF5",borderRadius:10,overflow:"hidden",marginBottom:7}}>
            <div style={{height:"100%",width:`${pct}%`,background:pct===100?C.green:C.blue,borderRadius:10}}/>
          </div>
          <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{comp}/{total} tareas completadas</div>
        </button>;
      })}
    </div>
  </div>;
}

// ─── MOBILE PROYECTO ────────────────────────────────────────────────────────
function MobilePerfil({C,session,rol,personal,proyAsignados,fichajes,sessionIds=[],isDark}){
  const ficha=personal.find(p=>p.id===session.tecnicoId)||personal.find(p=>p.usuarioId===session.userId)||null;
  const horasHoy=fichajes.filter(f=>f.inicio?.slice(0,10)===new Date().toISOString().slice(0,10)&&sessionIds.includes(f.tecnicoId)).reduce((s,f)=>s+(f.horasReales||0),0);
  return <div style={{padding:"20px 16px 22px"}}>
    <div style={{background:isDark?"#142033":"#fff",border:"1px solid "+C.border,borderRadius:16,padding:"18px",marginBottom:14}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <div style={{width:48,height:48,borderRadius:16,background:C.blue+"18",color:C.blue,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,fontWeight:900}}>{(session.nombre||"T").slice(0,1)}</div>
        <div>
          <div style={{fontSize:18,fontWeight:900,color:C.text,fontFamily:"'Inter',sans-serif"}}>{session.nombre}</div>
          <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",textTransform:"capitalize"}}>{rol} · {session.email||"sin correo"}</div>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{background:isDark?"#0B1220":"#F4F7FA",borderRadius:10,padding:"11px"}}>
          <div style={{fontSize:10,color:C.muted,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em"}}>Proyectos</div>
          <div style={{fontSize:22,color:C.blue,fontWeight:900}}>{proyAsignados.length}</div>
        </div>
        <div style={{background:isDark?"#0B1220":"#F4F7FA",borderRadius:10,padding:"11px"}}>
          <div style={{fontSize:10,color:C.muted,fontWeight:900,textTransform:"uppercase",letterSpacing:"0.08em"}}>Horas hoy</div>
          <div style={{fontSize:22,color:C.green,fontWeight:900}}>{horasHoy.toFixed(1)}h</div>
        </div>
      </div>
    </div>
    <div style={{background:isDark?"#142033":"#fff",border:"1px solid "+C.border,borderRadius:14,padding:"16px"}}>
      <div style={{fontSize:12,fontWeight:900,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:"'Inter',sans-serif",marginBottom:10}}>Vinculación operativa</div>
      <div style={{fontSize:13,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.55}}>
        Usuario: <b>{session.userId||"—"}</b><br/>
        Técnico asociado: <b>{session.tecnicoId||ficha?.id||"Sin vínculo"}</b><br/>
        Ficha: <b>{ficha?.nombre||"No encontrada"}</b>
      </div>
      {!ficha&&<div style={{marginTop:12,padding:"10px 12px",borderRadius:10,background:C.amber+"16",color:C.amber,fontSize:12,fontWeight:800,fontFamily:"'Inter',sans-serif"}}>Este usuario necesita vínculo con una ficha técnica para recibir asignaciones confiables.</div>}
    </div>
  </div>;
}

function MobileProyecto({C,proyecto,session,personal,fichajes,incidencias,materiales,instalacion,fichajeActivo,initialAction,onActionConsumed,onGoTarea,onSaveProyecto,onSaveFichaje,onSaveIncidencia,onSaveProyectoFoto,onSaveSolicitud,onGoBack,onGoCierre,isDark}){
  const sessionIds=[session.userId,session.tecnicoId,...(session.linkedIds||[])].filter(Boolean);
  const primaryTechId=session.tecnicoId||session.userId;
  const tareasMias=(proyecto.tareas||[]).filter(t=>sessionIds.includes(t.asignadoAId)||(!t.asignadoAId&&!t.asignadoA));
  const todasCompletas=tareasMias.length>0&&tareasMias.every(t=>t.estado==="Completada");
  const [reportIncModal,setReportIncModal]=useState(false);
  const [fotoModal,setFotoModal]=useState(false);
  const [solModal,setSolModal]=useState(false);
  const [incForm,setIncForm]=useState({titulo:"",descripcion:"",prioridad:"Media"});
  const [solItems,setSolItems]=useState([{materialId:"",cantidad:1,descripcion:""}]);
  const [solNota,setSolNota]=useState("");
  const [fotoComentario,setFotoComentario]=useState("");

  useEffect(()=>{
    if(!initialAction)return;
    if(initialAction==="foto")setFotoModal(true);
    if(initialAction==="material")setSolModal(true);
    if(initialAction==="incidencia")setReportIncModal(true);
    if(initialAction==="cierre")onGoCierre&&onGoCierre();
    if(initialAction==="fichaje"){
      const tarea=tareasMias.find(t=>t.estado==="En curso")||tareasMias.find(t=>t.estado!=="Completada");
      if(tarea)onGoTarea(tarea);
    }
    onActionConsumed&&onActionConsumed();
  },[initialAction]);

  const guardarIncidencia=()=>{
    if(!incForm.titulo.trim())return;
    const inc={id:newId(),proyectoId:proyecto.id,tipo:"incidencia",titulo:incForm.titulo,descripcion:incForm.descripcion,prioridad:incForm.prioridad,estado:"Abierta",tipoInc:"Técnica",origen:"mobile",tecnicoId:primaryTechId,usuarioId:session.userId,creadoPor:session.userId,creadoPorNombre:session.nombre,responsableId:primaryTechId,responsableNombre:session.nombre,fechaReporte:new Date().toISOString().slice(0,10),creadoEl:new Date().toISOString()};
    onSaveIncidencia(inc);
    const tl=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"incidencia",desc:`Incidencia reportada por ${session.nombre}: ${incForm.titulo}`,usuario:session.nombre}];
    onSaveProyecto({...proyecto,timeline:tl});
    setIncForm({titulo:"",descripcion:"",prioridad:"Media"});
    setReportIncModal(false);
  };

  const subirFoto=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const foto={id:newId(),proyectoId:proyecto.id,tecnicoId:primaryTechId,usuarioId:session.userId,tecnicoNombre:session.nombre,archivoBase64:ev.target.result,comentario:fotoComentario,fecha:new Date().toISOString(),miniatura:ev.target.result};
      onSaveProyectoFoto(proyecto.id,foto);
      const tl=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"foto",desc:`Foto subida por ${session.nombre}${fotoComentario?": "+fotoComentario:""}`,usuario:session.nombre}];
      onSaveProyecto({...proyecto,timeline:tl});
      setFotoComentario("");setFotoModal(false);
    };
    reader.readAsDataURL(file);
  };

  const enviarSolicitud=()=>{
    const itemsValidos=solItems.filter(i=>i.cantidad>0&&(i.materialId||i.descripcion.trim()));
    if(!itemsValidos.length)return;
    const sol={id:newId(),proyectoId:proyecto.id,tecnicoId:primaryTechId,usuarioId:session.userId,solicitadoPor:session.userId,tecnicoNombre:session.nombre,origen:"mobile",items:itemsValidos,estado:"pendiente",prioridad:"Normal",notaTecnico:solNota,fechaSolicitud:new Date().toISOString(),timeline:[{fecha:new Date().toISOString(),tipo:"solicitud",desc:`Solicitud creada por ${session.nombre}`,usuario:session.nombre}]};
    onSaveSolicitud(sol);
    const tl=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"material",desc:`Solicitud de ${itemsValidos.length} material(es) por ${session.nombre}`,usuario:session.nombre}];
    onSaveProyecto({...proyecto,timeline:tl});
    setSolItems([{materialId:"",cantidad:1,descripcion:""}]);setSolNota("");setSolModal(false);
  };

  const addSolItem=()=>setSolItems(it=>[...it,{materialId:"",cantidad:1,descripcion:""}]);
  const updSolItem=(i,k,v)=>setSolItems(it=>it.map((x,j)=>j===i?{...x,[k]:v}:x));
  const delSolItem=i=>setSolItems(it=>it.filter((_,j)=>j!==i));

  const fotos=proyecto.fotos||[];
  const solicitudesPend=(proyecto.solicitudesMaterial||[]).filter(s=>s.estado==="pendiente");

  return <div style={{paddingBottom:20}}>
    {/* Header proyecto */}
    <div style={{background:isDark?"#142033":"#fff",padding:"16px",borderBottom:"1px solid "+C.border}}>
      <button onClick={onGoBack} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif",padding:0,marginBottom:12,display:"flex",alignItems:"center",gap:4,fontWeight:700}}>
        ‹ Volver
      </button>
      <div style={{fontSize:11,fontFamily:"monospace",color:C.blue,marginBottom:5,fontWeight:800}}>{proyecto.numero||proyecto.codigo}</div>
      <div style={{fontSize:24,fontWeight:800,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:6,lineHeight:1.12}}>{proyecto.nombre}</div>
      <div style={{display:"flex",gap:8,flexWrap:"wrap",alignItems:"center"}}>
        <span style={{fontSize:11,padding:"4px 10px",borderRadius:20,background:C.blue+"18",color:C.blue,fontWeight:800}}>{proyecto.estadoOp||"—"}</span>
        <span style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",fontWeight:700}}>{tareasMias.length} tareas mías</span>
        {instalacion?.geoLat&&<span style={{fontSize:11,color:C.green,fontFamily:"'Inter',sans-serif",fontWeight:700}}>Geocerca activa</span>}
      </div>
    </div>

    <div style={{padding:"14px 16px 0"}}>
      {tareasMias.find(t=>t.estado!=="Completada")&&<button onClick={()=>onGoTarea(tareasMias.find(t=>t.estado==="En curso")||tareasMias.find(t=>t.estado!=="Completada"))} style={{width:"100%",background:C.blue,border:"none",borderRadius:13,padding:"16px",color:"#fff",fontSize:16,fontWeight:800,cursor:"pointer",fontFamily:"'Inter',sans-serif",marginBottom:14,boxShadow:"0 12px 22px "+C.blue+"30"}}>
        Continuar tarea
      </button>}

      {/* Acciones rápidas */}
      <div style={{fontSize:12,fontWeight:800,color:C.muted,fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Acciones rápidas</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,marginBottom:16}}>
        {[
          {ic:"◉",lbl:"Foto",fn:()=>setFotoModal(true),c:C.blue},
          {ic:"□",lbl:"Material",fn:()=>setSolModal(true),c:C.purple},
          {ic:"!",lbl:"Incid.",fn:()=>setReportIncModal(true),c:C.amber},
          {ic:"▤",lbl:`Sol.${solicitudesPend.length>0?" "+solicitudesPend.length:""}`,fn:()=>setSolModal(true),c:solicitudesPend.length>0?C.red:C.muted},
        ].map(a=><button key={a.lbl} onClick={a.fn} style={{background:isDark?"#142033":"#fff",border:"1px solid "+C.border,borderRadius:12,padding:"12px 6px",cursor:"pointer",textAlign:"center",display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
          <span style={{fontSize:22,color:a.c,fontWeight:900,lineHeight:1}}>{a.ic}</span>
          <span style={{fontSize:10,fontWeight:800,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.2}}>{a.lbl}</span>
        </button>)}
      </div>

      {/* Fotos recientes */}
      {fotos.length>0&&<div style={{marginBottom:16}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Fotos ({fotos.length})</div>
        <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
          {fotos.slice(-5).map((f,i)=><div key={f.id||i} style={{flexShrink:0,width:72,height:72,borderRadius:8,overflow:"hidden",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`}}>
            <img src={f.archivoBase64||f.miniatura} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
          </div>)}
        </div>
      </div>}

      {/* Mis tareas */}
      <div style={{fontSize:11,fontWeight:700,color:C.muted,fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:10}}>Mis tareas</div>
      {tareasMias.length===0
        ?<div style={{textAlign:"center",padding:"30px 20px",background:isDark?"#1E293B":"#F8FAFC",borderRadius:12,border:`1px dashed ${isDark?"#334155":"#CBD5E1"}`}}>
          <div style={{fontSize:14,color:C.muted,fontFamily:"'Inter',sans-serif"}}>Sin tareas asignadas en este proyecto</div>
        </div>
        :<div style={{display:"flex",flexDirection:"column",gap:8}}>
          {tareasMias.map(t=>{
            const col=COL_TAREA[t.estado]||"#64748B";
            const fichajeT=fichajes.find(f=>f.tareaId===t.id&&f.estado==="activo");
            return <button key={t.id} onClick={()=>onGoTarea(t)} style={{background:isDark?"#1E293B":"#fff",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:12,padding:"14px 16px",cursor:"pointer",textAlign:"left",boxShadow:"0 1px 3px rgba(0,0,0,0.1)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif",flex:1,paddingRight:8}}>{t.nombre}</div>
                <span style={{fontSize:10,padding:"3px 10px",borderRadius:20,background:col+"22",color:col,fontWeight:700,flexShrink:0}}>{t.estado}</span>
              </div>
              {t.descripcion&&<div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:6}}>{t.descripcion.slice(0,80)}{t.descripcion.length>80?"...":""}</div>}
              <div style={{display:"flex",gap:12,fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif"}}>
                <span>{t.etapa||"Sin etapa"}</span>
                <span>⏱ Est: {t.duracionEstimada||0}h</span>
                {fichajeT&&<span style={{color:"#22C55E",fontWeight:700}}>● En curso</span>}
              </div>
              <div style={{marginTop:8,fontSize:11,fontWeight:600,color:"#3B82F6",fontFamily:"'Inter',sans-serif"}}>→ Toca para fichar</div>
            </button>;
          })}
        </div>
      }

      {/* Botón cierre */}
      {todasCompletas&&<div style={{marginTop:20,padding:"14px 16px",background:"#052e1622",border:"1px solid #22C55E44",borderRadius:12}}>
        <div style={{fontSize:12,fontWeight:700,color:"#22C55E",fontFamily:"'Inter',sans-serif",marginBottom:4}}>✓ Todas las tareas completadas</div>
        <div style={{fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:10}}>Puedes proceder al cierre técnico del proyecto con firma del cliente.</div>
        <button onClick={onGoCierre} style={{width:"100%",background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:10,padding:"14px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
          🔐 Iniciar cierre técnico
        </button>
      </div>}

      {/* Incidencias activas */}
      {solicitudesPend.length>0&&<div style={{marginTop:16}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Solicitudes pendientes</div>
        {solicitudesPend.map(sol=><div key={sol.id} style={{background:isDark?"#1E293B":"#fff",border:"1px solid "+C.purple+"44",borderRadius:10,padding:"10px 14px",marginBottom:8}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:8}}>
            <div style={{fontSize:12,fontWeight:800,color:C.purple,fontFamily:"'Inter',sans-serif"}}>{(sol.items||[]).length} material(es)</div>
            <div style={{fontSize:10,color:C.muted,fontFamily:"'Inter',sans-serif"}}>{sol.fechaSolicitud?.slice(0,10)||"—"}</div>
          </div>
          {sol.notaTecnico&&<div style={{fontSize:12,color:C.text,fontFamily:"'Inter',sans-serif",marginTop:4}}>{sol.notaTecnico}</div>}
        </div>)}
      </div>}

      {/* Incidencias activas */}
      {incidencias.filter(i=>i.estado==="Abierta"||i.estado==="En proceso").length>0&&<div style={{marginTop:16}}>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Incidencias activas</div>
        {incidencias.filter(i=>i.estado==="Abierta"||i.estado==="En proceso").map(inc=><div key={inc.id} style={{background:isDark?"#1E293B":"#fff",border:`1px solid ${COL_PRIO[inc.prioridad]||"#F59E0B"}44`,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
          <div style={{fontSize:11,fontWeight:700,color:COL_PRIO[inc.prioridad]||"#F59E0B"}}>{inc.prioridad} · {inc.estado}</div>
          <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:"'Inter',sans-serif"}}>{inc.titulo}</div>
        </div>)}
      </div>}
    </div>

    {/* ── MODAL FOTO ── */}
    {fotoModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:isDark?"#1E293B":"#fff",width:"100%",maxWidth:480,borderRadius:"16px 16px 0 0",padding:"20px 16px",boxSizing:"border-box"}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:14}}>📷 Subir foto de avance</div>
        <input value={fotoComentario} onChange={e=>setFotoComentario(e.target.value)} placeholder="Comentario (opcional)" style={{width:"100%",background:isDark?"#0F172A":"#F8FAFC",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:8,padding:"12px",fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
        {/* Botón cámara nativo */}
        <label style={{display:"block",width:"100%",background:"linear-gradient(135deg,#1d4ed8,#1e40af)",borderRadius:10,padding:"14px",textAlign:"center",cursor:"pointer",marginBottom:8}}>
          <span style={{fontSize:14,fontWeight:700,color:"#fff",fontFamily:"'Inter',sans-serif"}}>📸 Tomar foto con cámara</span>
          <input type="file" accept="image/*" capture="environment" onChange={subirFoto} style={{display:"none"}}/>
        </label>
        <label style={{display:"block",width:"100%",background:isDark?"#334155":"#F1F5F9",borderRadius:10,padding:"14px",textAlign:"center",cursor:"pointer",marginBottom:12}}>
          <span style={{fontSize:14,fontWeight:600,color:C.text,fontFamily:"'Inter',sans-serif"}}>🖼 Elegir de galería</span>
          <input type="file" accept="image/*" onChange={subirFoto} style={{display:"none"}}/>
        </label>
        <button onClick={()=>setFotoModal(false)} style={{width:"100%",background:"transparent",border:"none",padding:"12px",fontSize:14,fontWeight:600,color:C.muted,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Cancelar</button>
      </div>
    </div>}

    {/* ── MODAL SOLICITUD MATERIAL ── */}
    {solModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:200,overflowY:"auto",display:"flex",alignItems:"flex-end"}}>
      <div style={{background:isDark?"#1E293B":"#fff",width:"100%",maxWidth:480,borderRadius:"16px 16px 0 0",padding:"20px 16px",boxSizing:"border-box",maxHeight:"85vh",overflowY:"auto"}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:14}}>📦 Solicitar materiales al almacén</div>
        {solItems.map((item,i)=><div key={i} style={{background:isDark?"#0F172A":"#F8FAFC",borderRadius:8,padding:"10px 12px",marginBottom:8,border:`1px solid ${isDark?"#334155":"#E2E8F0"}`}}>
          <div style={{display:"flex",gap:8,marginBottom:8,alignItems:"center"}}>
            <select value={item.materialId} onChange={e=>updSolItem(i,"materialId",e.target.value)} style={{flex:2,background:"transparent",border:"none",color:C.text,fontSize:13,fontFamily:"'Inter',sans-serif",outline:"none"}}>
              <option value="">— Material del catálogo —</option>
              {(materiales||[]).map(m=><option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <button onClick={()=>delSolItem(i)} style={{background:"transparent",border:"none",color:"#EF4444",cursor:"pointer",fontSize:16,padding:"0 4px",flexShrink:0}}>✕</button>
          </div>
          <div style={{display:"flex",gap:8}}>
            <input placeholder="Descripción manual (si no está en catálogo)" value={item.descripcion} onChange={e=>updSolItem(i,"descripcion",e.target.value)} style={{flex:2,background:"transparent",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:6,padding:"7px 10px",fontSize:12,color:C.text,fontFamily:"'Inter',sans-serif",outline:"none"}}/>
            <input type="number" placeholder="Cant." value={item.cantidad===0?"":item.cantidad} onChange={e=>updSolItem(i,"cantidad",+e.target.value||1)} style={{width:60,background:"transparent",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:6,padding:"7px 10px",fontSize:12,color:C.text,fontFamily:"'Inter',sans-serif",textAlign:"center",outline:"none"}}/>
          </div>
        </div>)}
        <button onClick={addSolItem} style={{background:"transparent",border:`1px dashed ${isDark?"#334155":"#CBD5E1"}`,borderRadius:8,padding:"10px",width:"100%",fontSize:13,color:C.muted,cursor:"pointer",fontFamily:"'Inter',sans-serif",marginBottom:12}}>+ Agregar otro material</button>
        <textarea value={solNota} onChange={e=>setSolNota(e.target.value)} placeholder="Nota para almacén (urgencia, contexto...)" rows={2} style={{width:"100%",background:isDark?"#0F172A":"#F8FAFC",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:8,padding:"10px",fontSize:13,color:C.text,fontFamily:"'Inter',sans-serif",outline:"none",resize:"none",boxSizing:"border-box",marginBottom:12}}/>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setSolModal(false)} style={{flex:1,background:isDark?"#334155":"#F1F5F9",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:600,color:C.muted,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Cancelar</button>
          <button onClick={enviarSolicitud} style={{flex:2,background:"linear-gradient(135deg,#7c3aed,#6d28d9)",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>📦 Enviar solicitud</button>
        </div>
      </div>
    </div>}

    {/* ── MODAL INCIDENCIA ── */}
    {reportIncModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:isDark?"#1E293B":"#fff",width:"100%",maxWidth:480,borderRadius:"16px 16px 0 0",padding:"20px 16px",boxSizing:"border-box"}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:14}}>⚠️ Reportar incidencia</div>
        <input value={incForm.titulo} onChange={e=>setIncForm(f=>({...f,titulo:e.target.value}))} placeholder="¿Qué pasó?" style={{width:"100%",background:isDark?"#0F172A":"#F8FAFC",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:8,padding:"12px",fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",outline:"none",boxSizing:"border-box",marginBottom:10}}/>
        <textarea value={incForm.descripcion} onChange={e=>setIncForm(f=>({...f,descripcion:e.target.value}))} placeholder="Descripción detallada..." rows={3} style={{width:"100%",background:isDark?"#0F172A":"#F8FAFC",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:8,padding:"12px",fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",outline:"none",boxSizing:"border-box",resize:"none",marginBottom:10}}/>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          {["Baja","Media","Alta","Crítica"].map(p=><button key={p} onClick={()=>setIncForm(f=>({...f,prioridad:p}))} style={{flex:1,padding:"8px 4px",borderRadius:8,border:`1px solid ${COL_PRIO[p]||"#64748B"}44`,background:incForm.prioridad===p?(COL_PRIO[p]||"#64748B")+"22":"transparent",color:COL_PRIO[p]||"#64748B",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>{p}</button>)}
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setReportIncModal(false)} style={{flex:1,background:isDark?"#334155":"#F1F5F9",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:600,color:C.muted,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Cancelar</button>
          <button onClick={guardarIncidencia} disabled={!incForm.titulo.trim()} style={{flex:2,background:incForm.titulo.trim()?"#F59E0B":"#374151",border:"none",borderRadius:10,padding:"13px",fontSize:14,fontWeight:700,color:"#fff",cursor:incForm.titulo.trim()?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif"}}>Reportar</button>
        </div>
      </div>
    </div>}
  </div>;
}
// ─── MOBILE TAREA ───────────────────────────────────────────────────────────
function MobileTarea({C,tarea,proyecto,session,primaryTechId,personal,fichajes,fichajeActivo,materiales,instalacion,onSaveProyecto,onSaveFichaje,onSaveProyectoFoto,onGoBack,isDark}){
  const [cronActivo,setCronActivo]=useState(false);
  const [timerSecs,setTimerSecs]=useState(0);
  const timerRef=useRef(null);
  const [fichActivo,setFichActivo]=useState(fichajes.find(f=>["activo","pausado"].includes(f.estado)&&f.tareaId===tarea.id)||null);
  const [geoState,setGeoState]=useState(null); // null|{ok,distancia,radio,lat,lng,msg}
  const [geoLoading,setGeoLoading]=useState(false);
  const [forzar,setForzar]=useState(false);
  const [fotoComentario,setFotoComentario]=useState("");
  const [fotoModal,setFotoModal]=useState(false);

  const activeOther=fichajeActivo&&fichajeActivo.tareaId!==tarea.id;
  const clearTimer=()=>{if(timerRef.current){clearInterval(timerRef.current);timerRef.current=null;}};
  const startTimer=()=>{clearTimer();timerRef.current=setInterval(()=>setTimerSecs(s=>s+1),1000);};

  useEffect(()=>{
    if(fichActivo){
      const elapsed=fichActivo.segundosAcumulados!=null?fichActivo.segundosAcumulados:Math.max(0,Math.floor((Date.now()-new Date(fichActivo.inicio).getTime())/1000));
      setTimerSecs(elapsed);
      if(fichActivo.estado==="activo"){setCronActivo(true);startTimer();}
    }
    return()=>clearTimer();
  },[]);

  const fmtTimer=s=>{const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;};

  const verificarGPS=async()=>{
    setGeoLoading(true);
    try{
      const pos=await obtenerGeolocalizacion();
      if(!instalacion?.geoLat){
        setGeoState({ok:true,sinGeo:true,lat:pos.lat,lng:pos.lng,msg:"Sin geocerca configurada. Iniciando sin validación."});
      } else {
        const r=validarGeocerca(pos.lat,pos.lng,instalacion);
        setGeoState({ok:r.valido,distancia:r.distancia,radio:r.radio,lat:pos.lat,lng:pos.lng,sinGeo:false,msg:r.valido?`✓ Dentro del área (${r.distancia}m del centro)`:`A ${r.distancia}m del sitio. Radio permitido: ${r.radio}m`});
      }
    }catch(e){setGeoState({ok:false,error:true,msg:e.message});}
    setGeoLoading(false);
  };

  const ejecutarInicio=(geoLat,geoLng,geoValidado)=>{
    if(activeOther){
      alert("Ya tienes un fichaje activo en otra tarea. Pausa o completa esa tarea antes de iniciar esta.");
      return;
    }
    if(fichActivo?.estado==="pausado"){
      const reanudado={...fichActivo,estado:"activo",inicio:new Date(Date.now()-timerSecs*1000).toISOString(),fin:null,reanudadoEl:new Date().toISOString(),segundosAcumulados:timerSecs};
      onSaveFichaje(reanudado);setFichActivo(reanudado);setCronActivo(true);startTimer();
      const tl=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"fichaje",desc:`${session.nombre} reanudó tarea "${tarea.nombre}"`,usuario:session.nombre}];
      onSaveProyecto({...proyecto,tareas:(proyecto.tareas||[]).map(t=>t.id===tarea.id?{...t,estado:"En curso"}:t),timeline:tl});
      return;
    }
    const nuevo={id:newId(),tareaId:tarea.id,proyectoId:proyecto.id,tecnicoId:primaryTechId||session.userId,usuarioId:session.userId,inicio:new Date().toISOString(),estado:"activo",geoValidado,geoLatInicio:geoLat||null,geoLngInicio:geoLng||null};
    onSaveFichaje(nuevo);setFichActivo(nuevo);setCronActivo(true);
    startTimer();
    const tl=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"fichaje",desc:`${session.nombre} inició tarea "${tarea.nombre}"${geoValidado?" (GPS ✓)":" (sin GPS)"}`,usuario:session.nombre}];
    onSaveProyecto({...proyecto,tareas:(proyecto.tareas||[]).map(t=>t.id===tarea.id?{...t,estado:"En curso"}:t),timeline:tl});
  };

  const iniciarFichaje=async()=>{
    if(activeOther){
      alert("Ya tienes un fichaje activo en otra tarea. Pausa o completa esa tarea antes de iniciar esta.");
      return;
    }
    if(fichActivo?.estado==="pausado"){ejecutarInicio(null,null,!!fichActivo.geoValidado);return;}
    if(!geoState){await verificarGPS();return;}
    if(!geoState.ok&&!forzar){setForzar(true);return;}
    ejecutarInicio(geoState.lat,geoState.lng,geoState.ok&&!geoState.sinGeo&&!geoState.error);
    setGeoState(null);setForzar(false);
  };

  const pausarFichaje=()=>{
    clearTimer();setCronActivo(false);
    if(fichActivo){
      const pausado={...fichActivo,estado:"pausado",fin:new Date().toISOString(),segundosAcumulados:timerSecs,horasReales:+(timerSecs/3600).toFixed(2)};
      onSaveFichaje(pausado);setFichActivo(pausado);
      const tl=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"fichaje",desc:`${session.nombre} pausó tarea "${tarea.nombre}"`,usuario:session.nombre}];
      onSaveProyecto({...proyecto,timeline:tl});
    }
  };

  const completarTarea=()=>{
    clearTimer();setCronActivo(false);
    if(fichActivo){onSaveFichaje({...fichActivo,estado:"completado",fin:new Date().toISOString(),segundosAcumulados:timerSecs,horasReales:+(timerSecs/3600).toFixed(2)});}
    const tareas=(proyecto.tareas||[]).map(t=>t.id===tarea.id?{...t,estado:"Completada",fechaTerminada:new Date().toISOString().slice(0,10)}:t);
    const tl=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"tarea",desc:`Tarea "${tarea.nombre}" completada por ${session.nombre}`,usuario:session.nombre}];
    onSaveProyecto({...proyecto,tareas,timeline:tl});
    onGoBack();
  };

  const subirFotoTarea=async(e)=>{
    const file=e.target.files?.[0];if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      const foto={id:newId(),proyectoId:proyecto.id,tareaId:tarea.id,tecnicoId:primaryTechId||session.userId,usuarioId:session.userId,tecnicoNombre:session.nombre,archivoBase64:ev.target.result,comentario:fotoComentario,fecha:new Date().toISOString()};
      onSaveProyectoFoto(proyecto.id,foto);
      const tl=[...(proyecto.timeline||[]),{fecha:new Date().toISOString(),tipo:"foto",desc:`Foto en tarea "${tarea.nombre}"${fotoComentario?": "+fotoComentario:""}`,usuario:session.nombre}];
      onSaveProyecto({...proyecto,timeline:tl});
      setFotoComentario("");setFotoModal(false);
    };
    reader.readAsDataURL(file);
  };

  const col=COL_TAREA[tarea.estado]||"#64748B";
  const horasAcum=fichajes.filter(f=>f.estado==="completado").reduce((s,f)=>s+(f.horasReales||0),0);
  const fotasTarea=(proyecto.fotos||[]).filter(f=>f.tareaId===tarea.id);

  return <div style={{paddingBottom:20}}>
    <div style={{background:isDark?"linear-gradient(135deg,#1E293B,#0F172A)":"linear-gradient(135deg,#1E3A8A,#1D4ED8)",padding:"14px 16px"}}>
      <button onClick={onGoBack} style={{background:"transparent",border:"none",color:"#93C5FD",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif",padding:0,marginBottom:8}}>‹ Volver</button>
      <div style={{fontSize:17,fontWeight:700,color:"#F1F5F9",fontFamily:"'Inter',sans-serif",marginBottom:6}}>{tarea.nombre}</div>
      <div style={{display:"flex",gap:8}}>
        <span style={{fontSize:10,padding:"3px 10px",borderRadius:20,background:col+"33",color:col,fontWeight:700}}>{tarea.estado}</span>
        <span style={{fontSize:10,padding:"3px 10px",borderRadius:20,background:"rgba(59,130,246,0.2)",color:"#93C5FD",fontWeight:700}}>{tarea.etapa||"Sin etapa"}</span>
        <span style={{fontSize:10,color:"#93C5FD",fontFamily:"'Inter',sans-serif"}}>⏱ Est: {tarea.duracionEstimada||0}h</span>
        {instalacion?.geoLat&&<span style={{fontSize:10,color:"#86efac",fontFamily:"'Inter',sans-serif"}}>📍 {instalacion.geoRadioMetros||100}m radio</span>}
      </div>
    </div>

    <div style={{padding:"20px 16px 0"}}>
      {tarea.descripcion&&<div style={{background:isDark?"#1E293B":"#F8FAFC",borderRadius:10,padding:"12px 14px",marginBottom:16,border:`1px solid ${isDark?"#334155":"#E2E8F0"}`}}>
        <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:4}}>DESCRIPCIÓN</div>
        <div style={{fontSize:13,color:C.text,fontFamily:"'Inter',sans-serif",lineHeight:1.5}}>{tarea.descripcion}</div>
      </div>}

      {/* CRONÓMETRO */}
      {tarea.estado!=="Completada"&&tarea.estado!=="Cancelada"&&<div style={{background:isDark?"#1E293B":"#fff",borderRadius:16,padding:"24px",marginBottom:16,textAlign:"center",border:`2px solid ${cronActivo?"#22C55E":"#334155"}`,boxShadow:cronActivo?"0 0 20px rgba(34,197,94,0.15)":"none",transition:"all 0.3s"}}>
        {activeOther&&<div style={{marginBottom:14,padding:"11px 13px",borderRadius:10,background:"#451a0322",border:"1px solid #F59E0B55",textAlign:"left"}}>
          <div style={{fontSize:12,color:"#F59E0B",fontWeight:800,fontFamily:"'Inter',sans-serif"}}>Fichaje activo en otra tarea</div>
          <div style={{fontSize:11,color:"#fbbf24",fontFamily:"'Inter',sans-serif",marginTop:3}}>Para evitar horas duplicadas, primero pausa o completa la tarea en curso.</div>
        </div>}
        <div style={{fontSize:11,fontWeight:700,color:cronActivo?"#22C55E":C.muted,fontFamily:"'Inter',sans-serif",textTransform:"uppercase",letterSpacing:"0.12em",marginBottom:8}}>
          {cronActivo?"⏱ EN CURSO":fichActivo?.estado==="pausado"?"PAUSADO":"CRONÓMETRO"}
        </div>
        <div style={{fontSize:52,fontWeight:300,color:cronActivo?"#22C55E":C.text,fontFamily:"'Courier New',monospace",letterSpacing:"0.05em",marginBottom:20}}>{fmtTimer(timerSecs)}</div>
        <div style={{display:"flex",justifyContent:"center",gap:24,marginBottom:20}}>
          <div><div style={{fontSize:11,color:C.muted}}>Acumulado</div><div style={{fontSize:16,fontWeight:700,color:"#3B82F6"}}>{(horasAcum+timerSecs/3600).toFixed(1)}h</div></div>
          <div><div style={{fontSize:11,color:C.muted}}>Estimado</div><div style={{fontSize:16,fontWeight:700,color:C.muted}}>{tarea.duracionEstimada||0}h</div></div>
        </div>

        {/* Resultado GPS si se verificó */}
        {geoState&&<div style={{marginBottom:16,padding:"10px 14px",borderRadius:8,background:geoState.ok?"#052e1622":forzar?"#451a0322":"#7f1d1d22",border:`1px solid ${geoState.ok?"#22C55E":forzar?"#F59E0B":"#EF4444"}44`,textAlign:"left"}}>
          <div style={{fontSize:12,fontWeight:700,color:geoState.ok?"#22C55E":forzar?"#F59E0B":"#EF4444",fontFamily:"'Inter',sans-serif"}}>{geoState.msg}</div>
          {!geoState.ok&&!geoState.error&&!forzar&&<div style={{fontSize:11,color:"#fca5a5",fontFamily:"'Inter',sans-serif",marginTop:4}}>Debes estar dentro del área del proyecto para iniciar.</div>}
          {forzar&&<div style={{fontSize:11,color:"#fbbf24",fontFamily:"'Inter',sans-serif",marginTop:4}}>Vas a iniciar fuera del área. Quedará registrado. El supervisor será notificado.</div>}
        </div>}

        {/* Botones cronómetro */}
        {!cronActivo&&!fichActivo&&!geoState&&<button onClick={iniciarFichaje} disabled={geoLoading||activeOther} style={{width:"100%",background:geoLoading||activeOther?"#374151":"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:12,padding:"16px",color:"#fff",fontSize:16,fontWeight:700,cursor:geoLoading?"wait":activeOther?"not-allowed":"pointer",fontFamily:"'Inter',sans-serif"}}>
          {geoLoading?"⏳ Verificando GPS...":"▶ INICIAR TAREA"}
        </button>}
        {!cronActivo&&!fichActivo&&geoState&&!geoState.ok&&!forzar&&<div style={{display:"flex",gap:8}}>
          <button onClick={()=>setGeoState(null)} style={{flex:1,background:isDark?"#334155":"#F1F5F9",border:"none",borderRadius:12,padding:"14px",fontSize:13,fontWeight:600,color:C.muted,cursor:"pointer"}}>Reintentar GPS</button>
          <button onClick={iniciarFichaje} style={{flex:2,background:"linear-gradient(135deg,#92400e,#78350f)",border:"none",borderRadius:12,padding:"14px",fontSize:13,fontWeight:700,color:"#fff",cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>⚠ Forzar inicio</button>
        </div>}
        {!cronActivo&&!fichActivo&&geoState&&(geoState.ok||forzar)&&<button onClick={iniciarFichaje} style={{width:"100%",background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:12,padding:"16px",color:"#fff",fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>
          ▶ {forzar?"INICIAR (sin geocerca)":"CONFIRMAR INICIO"}
        </button>}
        {cronActivo&&<div style={{display:"flex",gap:8}}>
          <button onClick={pausarFichaje} style={{flex:1,background:isDark?"#334155":"#F1F5F9",border:"none",borderRadius:12,padding:"14px",color:C.text,fontSize:14,fontWeight:700,cursor:"pointer"}}>⏸ Pausar</button>
          <button onClick={completarTarea} style={{flex:2,background:"linear-gradient(135deg,#16a34a,#15803d)",border:"none",borderRadius:12,padding:"14px",color:"#fff",fontSize:14,fontWeight:700,cursor:"pointer"}}>✓ Completar</button>
        </div>}
        {!cronActivo&&fichActivo&&<button onClick={iniciarFichaje} disabled={activeOther} style={{width:"100%",background:activeOther?"#374151":"linear-gradient(135deg,#1d4ed8,#1e40af)",border:"none",borderRadius:12,padding:"16px",color:"#fff",fontSize:16,fontWeight:700,cursor:activeOther?"not-allowed":"pointer"}}>▶ REANUDAR</button>}
      </div>}

      {tarea.estado==="Completada"&&<div style={{background:isDark?"#052e16":"#f0fdf4",border:"1px solid #22C55E44",borderRadius:12,padding:"20px",textAlign:"center",marginBottom:16}}>
        <div style={{fontSize:32,marginBottom:8}}>✅</div>
        <div style={{fontSize:15,fontWeight:700,color:"#22C55E",fontFamily:"'Inter',sans-serif"}}>Tarea completada</div>
        <div style={{fontSize:12,color:C.muted,marginTop:4}}>Total: {horasAcum.toFixed(1)}h de {tarea.duracionEstimada||0}h estimadas</div>
      </div>}

      {/* Foto desde tarea */}
      <button onClick={()=>setFotoModal(true)} style={{width:"100%",background:isDark?"#1E293B":"#EFF6FF",border:`1px solid #3B82F644`,borderRadius:10,padding:"12px",fontSize:13,fontWeight:600,color:"#3B82F6",cursor:"pointer",fontFamily:"'Inter',sans-serif",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
        📷 Subir foto de esta tarea {fotasTarea.length>0&&`(${fotasTarea.length} fotos)`}
      </button>

      {/* Fotos de esta tarea */}
      {fotasTarea.length>0&&<div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
        {fotasTarea.map((f,i)=><div key={i} style={{width:72,height:72,borderRadius:8,overflow:"hidden",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`}}>
          <img src={f.archivoBase64} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>)}
      </div>}

      {/* Historial fichajes */}
      {fichajes.filter(f=>f.estado!=="activo").length>0&&<div>
        <div style={{fontSize:11,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.1em",marginBottom:8}}>Historial</div>
        {fichajes.filter(f=>f.estado!=="activo").map((f,i)=><div key={f.id} style={{background:isDark?"#1E293B":"#fff",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:8,padding:"10px 14px",marginBottom:6,display:"flex",justifyContent:"space-between"}}>
          <div><div style={{fontSize:12,fontFamily:"monospace",color:C.muted}}>{f.inicio?.slice(11,16)||"—"} → {f.fin?.slice(11,16)||"—"}</div>
            {f.geoValidado&&<div style={{fontSize:10,color:"#22C55E"}}>📍 GPS validado</div>}
          </div>
          <div style={{fontSize:14,fontWeight:700,color:"#3B82F6"}}>{f.horasReales?`${f.horasReales.toFixed(1)}h`:"—"}</div>
        </div>)}
      </div>}
    </div>

    {/* Modal foto tarea */}
    {fotoModal&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
      <div style={{background:isDark?"#1E293B":"#fff",width:"100%",maxWidth:480,borderRadius:"16px 16px 0 0",padding:"20px 16px",boxSizing:"border-box"}}>
        <div style={{fontSize:15,fontWeight:700,color:C.text,marginBottom:14}}>📷 Foto de avance — {tarea.nombre}</div>
        <input value={fotoComentario} onChange={e=>setFotoComentario(e.target.value)} placeholder="Comentario (opcional)" style={{width:"100%",background:isDark?"#0F172A":"#F8FAFC",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:8,padding:"12px",fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
        <label style={{display:"block",width:"100%",background:"linear-gradient(135deg,#1d4ed8,#1e40af)",borderRadius:10,padding:"14px",textAlign:"center",cursor:"pointer",marginBottom:8}}>
          <span style={{fontSize:14,fontWeight:700,color:"#fff"}}>📸 Tomar foto</span>
          <input type="file" accept="image/*" capture="environment" onChange={subirFotoTarea} style={{display:"none"}}/>
        </label>
        <label style={{display:"block",width:"100%",background:isDark?"#334155":"#F1F5F9",borderRadius:10,padding:"14px",textAlign:"center",cursor:"pointer",marginBottom:12}}>
          <span style={{fontSize:14,fontWeight:600,color:C.text}}>🖼 Elegir de galería</span>
          <input type="file" accept="image/*" onChange={subirFotoTarea} style={{display:"none"}}/>
        </label>
        <button onClick={()=>setFotoModal(false)} style={{width:"100%",background:"transparent",border:"none",padding:"12px",fontSize:14,fontWeight:600,color:C.muted,cursor:"pointer"}}>Cancelar</button>
      </div>
    </div>}
  </div>;
}

// ─── MOBILE CIERRE ──────────────────────────────────────────────────────────
function MobileCierre({C,proyecto,session,fichajes,onSaveProyecto,onGoBack,isDark}){
  const [paso,setPaso]=useState(1); // 1=resumen, 2=checklist, 3=receptor, 4=firma
  const [form,setForm]=useState({nombre:"",rut:"",cargo:"",email:"",notas:""});
  const [checklist,setChecklist]=useState((proyecto.checklistCierre||CHECKLIST_CIERRE_DEF).map((txt,i)=>({id:"chk-"+i,texto:typeof txt==="string"?txt:txt.texto,ok:typeof txt==="object"?!!txt.ok:false})));
  const firmaRef=useRef(null);
  const [firmaVacia,setFirmaVacia]=useState(true);
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));

  const tareas=proyecto.tareas||[];
  const completadas=tareas.filter(t=>t.estado==="Completada").length;
  const totalH=fichajes.reduce((s,f)=>s+(f.horasReales||0),0);
  const incompletas=tareas.filter(t=>t.estado!=="Completada"&&t.estado!=="Cancelada");

  // Formatear RUT automático
  const handleRut=v=>{
    const clean=v.replace(/[^0-9kK]/g,"");
    let fmt=clean;
    if(clean.length>1){const dv=clean.slice(-1);const num=clean.slice(0,-1).replace(/\B(?=(\d{3})+(?!\d))/g,".");fmt=`${num}-${dv}`;}
    sf("rut",fmt);
  };

  // Validación RUT módulo 11
  const validarRut=rut=>{
    const limpio=rut.replace(/[^0-9kK]/g,"").toUpperCase();
    if(limpio.length<2)return false;
    const dv=limpio.slice(-1);const num=limpio.slice(0,-1);
    let suma=0,mult=2;
    for(let i=num.length-1;i>=0;i--){suma+=parseInt(num[i])*mult;mult=mult===7?2:mult+1;}
    const resto=11-(suma%11);
    const dvCalc=resto===11?"0":resto===10?"K":String(resto);
    return dv===dvCalc;
  };

  const rutValido=validarRut(form.rut);

  const finalizarCierre=()=>{
    const canvas=firmaRef.current?.querySelector("canvas");
    const firmaBase64=canvas?canvas.toDataURL("image/png"):null;
    const cierre={tecnicoId:session.tecnicoId||session.userId,usuarioId:session.userId,tecnicoNombre:session.nombre,fecha:new Date().toISOString(),receptorNombre:form.nombre,receptorRut:form.rut,receptorCargo:form.cargo,receptorEmail:form.email,firmaBase64,notasFinales:form.notas,tareasCompletadas:completadas,horasReales:+totalH.toFixed(2),geoValidado:false,checklist};
    const requiereRevision=proyecto.tieneRecurrente||proyecto.baseRecMes>0||proyecto.mrr>0||proyecto.requiereActivacionServicio;
    const timeline=[
      ...(proyecto.timeline||[]),
      {fecha:new Date().toISOString(),tipo:"cierre",desc:`Cierre técnico con firma digital. Receptor: ${form.nombre} (${form.rut})`,usuario:session.nombre},
      ...(requiereRevision?[{fecha:new Date().toISOString(),tipo:"activacion",desc:"Proyecto listo para revisión de activación de servicio recurrente.",usuario:"Sistema"}]:[])
    ];
    onSaveProyecto({...proyecto,estadoOp:"Cerrado técnicamente",cierreTecnico:cierre,checklistCierre:checklist,fechaCierreTec:new Date().toISOString().slice(0,10),activacionServicioEstado:requiereRevision?(proyecto.activacionServicioEstado||"Pendiente revisión"):proyecto.activacionServicioEstado,requiereActivacionServicio:requiereRevision||proyecto.requiereActivacionServicio,timeline});
    setPaso(5); // confirmación
  };

  // Canvas de firma (simple con mouse/touch)
  useEffect(()=>{
    if(paso!==4||!firmaRef.current)return;
    const canvas=firmaRef.current.querySelector("canvas");
    if(!canvas)return;
    const ctx=canvas.getContext("2d");
    let drawing=false;
    ctx.strokeStyle="#1d4ed8";ctx.lineWidth=2.5;ctx.lineCap="round";ctx.lineJoin="round";
    const getXY=e=>{const r=canvas.getBoundingClientRect();if(e.touches){return{x:e.touches[0].clientX-r.left,y:e.touches[0].clientY-r.top};}return{x:e.clientX-r.left,y:e.clientY-r.top};};
    const start=e=>{e.preventDefault();drawing=true;const{x,y}=getXY(e);ctx.beginPath();ctx.moveTo(x,y);};
    const draw=e=>{e.preventDefault();if(!drawing)return;const{x,y}=getXY(e);ctx.lineTo(x,y);ctx.stroke();setFirmaVacia(false);};
    const stop=()=>{drawing=false;};
    canvas.addEventListener("mousedown",start);canvas.addEventListener("mousemove",draw);canvas.addEventListener("mouseup",stop);
    canvas.addEventListener("touchstart",start,{passive:false});canvas.addEventListener("touchmove",draw,{passive:false});canvas.addEventListener("touchend",stop);
    return()=>{canvas.removeEventListener("mousedown",start);canvas.removeEventListener("mousemove",draw);canvas.removeEventListener("mouseup",stop);canvas.removeEventListener("touchstart",start);canvas.removeEventListener("touchmove",draw);canvas.removeEventListener("touchend",stop);};
  },[paso]);

  const limpiarFirma=()=>{
    const canvas=firmaRef.current?.querySelector("canvas");
    if(canvas){const ctx=canvas.getContext("2d");ctx.clearRect(0,0,canvas.width,canvas.height);}
    setFirmaVacia(true);
  };

  const checklistCompleto=checklist.length>0&&checklist.every(x=>x.ok);

  if(paso===5)return <div style={{padding:"40px 20px",textAlign:"center"}}>
    <div style={{fontSize:64,marginBottom:16}}>✅</div>
    <div style={{fontSize:20,fontWeight:700,color:"#22C55E",fontFamily:"'Inter',sans-serif",marginBottom:8}}>¡Proyecto cerrado!</div>
    <div style={{fontSize:14,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:8}}>Acta de recepción registrada correctamente.</div>
    <div style={{fontSize:13,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:28}}>Receptor: {form.nombre} · {form.rut}</div>
    <button onClick={onGoBack} style={{background:"linear-gradient(135deg,#1d4ed8,#1e40af)",border:"none",borderRadius:12,padding:"14px 32px",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Volver a proyectos</button>
  </div>;

  return <div style={{paddingBottom:20}}>
    {/* Header */}
    <div style={{background:"linear-gradient(135deg,#166534,#14532d)",padding:"14px 16px"}}>
      <button onClick={onGoBack} style={{background:"transparent",border:"none",color:"#86efac",cursor:"pointer",fontSize:13,fontFamily:"'Inter',sans-serif",padding:0,marginBottom:8}}>‹ Volver</button>
      <div style={{fontSize:17,fontWeight:700,color:"#F1F5F9",fontFamily:"'Inter',sans-serif",marginBottom:6}}>🔐 Cierre técnico</div>
      {/* Steps */}
      <div style={{display:"flex",gap:4}}>
        {[1,2,3,4].map(n=><div key={n} style={{height:4,flex:1,borderRadius:2,background:n<=paso?"#22C55E":"rgba(255,255,255,0.2)"}}/>)}
      </div>
    </div>

    <div style={{padding:"20px 16px 0"}}>
      {/* Advertencia tareas incompletas */}
      {incompletas.length>0&&<div style={{background:"#451a0322",border:"1px solid #F59E0B44",borderRadius:10,padding:"12px 14px",marginBottom:16}}>
        <div style={{fontSize:12,fontWeight:700,color:"#F59E0B",fontFamily:"'Inter',sans-serif",marginBottom:4}}>⚠ Tareas incompletas ({incompletas.length})</div>
        {incompletas.map(t=><div key={t.id} style={{fontSize:12,color:"#fbbf24",fontFamily:"'Inter',sans-serif"}}>• {t.nombre}</div>)}
        <div style={{fontSize:11,color:"#fbbf24",fontFamily:"'Inter',sans-serif",marginTop:6}}>Puedes cerrar igualmente. El supervisor tomará nota.</div>
      </div>}

      {/* PASO 1 — Resumen */}
      {paso===1&&<div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:14}}>Resumen del trabajo realizado</div>
        {[["Proyecto",proyecto.nombre],["Tareas completas",`${completadas} de ${tareas.length}`],["Horas trabajadas",`${totalH.toFixed(1)}h`],["Fecha cierre",new Date().toLocaleDateString("es-CL")]].map(([l,v])=>(
          <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${isDark?"#1E293B":"#E2E8F0"}`,fontFamily:"'Inter',sans-serif"}}>
            <span style={{fontSize:13,color:C.muted}}>{l}</span>
            <span style={{fontSize:13,fontWeight:600,color:C.text}}>{v}</span>
          </div>
        ))}
        <div style={{marginTop:16}}>
          <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:6}}>Notas finales (opcional)</div>
          <textarea value={form.notas} onChange={e=>sf("notas",e.target.value)} placeholder="Observaciones, comentarios al cierre..." rows={3} style={{width:"100%",background:isDark?"#1E293B":"#F8FAFC",border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,borderRadius:8,padding:"12px",fontSize:13,color:C.text,fontFamily:"'Inter',sans-serif",outline:"none",resize:"none",boxSizing:"border-box"}}/>
        </div>
        <button onClick={()=>setPaso(2)} style={{width:"100%",marginTop:16,background:"linear-gradient(135deg,#166534,#15803d)",border:"none",borderRadius:12,padding:"15px",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>Continuar →</button>
      </div>}

      {/* PASO 2 — Checklist */}
      {paso===2&&<div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:6}}>Checklist técnico de cierre</div>
        <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:14}}>Marca cada validación antes de pedir la firma del cliente.</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:16}}>
          {checklist.map(item=><button key={item.id} onClick={()=>setChecklist(list=>list.map(x=>x.id===item.id?{...x,ok:!x.ok}:x))} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"12px 14px",borderRadius:10,border:`1px solid ${item.ok?"#22C55E":"#334155"}44`,background:item.ok?"#052e1622":(isDark?"#1E293B":"#F8FAFC"),cursor:"pointer",textAlign:"left"}}>
            <span style={{width:22,height:22,borderRadius:6,background:item.ok?"#22C55E":"transparent",border:`1px solid ${item.ok?"#22C55E":C.muted}`,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700}}>{item.ok?"✓":""}</span>
            <span style={{fontSize:13,fontWeight:600,color:item.ok?"#22C55E":C.text,fontFamily:"'Inter',sans-serif"}}>{item.texto}</span>
          </button>)}
        </div>
        {!checklistCompleto&&<div style={{fontSize:11,color:"#F59E0B",fontFamily:"'Inter',sans-serif",marginBottom:12}}>Faltan {checklist.filter(x=>!x.ok).length} validaciones para continuar.</div>}
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setPaso(1)} style={{flex:1,background:isDark?"#334155":"#F1F5F9",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:C.muted,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>← Atrás</button>
          <button onClick={()=>setPaso(3)} disabled={!checklistCompleto} style={{flex:2,background:checklistCompleto?"linear-gradient(135deg,#166534,#15803d)":"#374151",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,color:"#fff",cursor:checklistCompleto?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif"}}>Continuar →</button>
        </div>
      </div>}

      {/* PASO 3 — Datos receptor */}
      {paso===3&&<div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:14}}>Datos de quien recibe</div>
        {[{l:"Nombre completo *",k:"nombre",ph:"Pedro Soto González",type:"text"},{l:"RUT *",k:"rut",ph:"12.345.678-9",fn:handleRut,type:"text"},{l:"Cargo (opcional)",k:"cargo",ph:"Jefe de mantención",type:"text"},{l:"Email para enviar copia",k:"email",ph:"cliente@empresa.cl",type:"email"}].map(({l,k,ph,fn,type})=>(
          <div key={k} style={{marginBottom:14}}>
            <div style={{fontSize:12,fontWeight:600,color:k==="rut"&&form.rut&&!rutValido?"#EF4444":C.muted,fontFamily:"'Inter',sans-serif",marginBottom:6}}>
              {l} {k==="rut"&&form.rut&&(rutValido?"✓":"")}
            </div>
            <input type={type} value={form[k]} onChange={e=>(fn||((v)=>sf(k,v)))(e.target.value)} placeholder={ph} style={{width:"100%",background:isDark?"#1E293B":"#F8FAFC",border:`1px solid ${k==="rut"&&form.rut&&!rutValido?"#EF4444":isDark?"#334155":"#E2E8F0"}`,borderRadius:8,padding:"13px",fontSize:14,color:C.text,fontFamily:"'Inter',sans-serif",outline:"none",boxSizing:"border-box"}}/>
          </div>
        ))}
        <div style={{display:"flex",gap:8,marginTop:8}}>
          <button onClick={()=>setPaso(2)} style={{flex:1,background:isDark?"#334155":"#F1F5F9",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:C.muted,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>← Atrás</button>
          <button onClick={()=>setPaso(4)} disabled={!form.nombre.trim()||!form.rut.trim()||!rutValido} style={{flex:2,background:form.nombre.trim()&&rutValido?"linear-gradient(135deg,#166534,#15803d)":"#374151",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,color:"#fff",cursor:form.nombre.trim()&&rutValido?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif"}}>Continuar →</button>
        </div>
      </div>}

      {/* PASO 4 — Firma */}
      {paso===4&&<div>
        <div style={{fontSize:14,fontWeight:700,color:C.text,fontFamily:"'Inter',sans-serif",marginBottom:6}}>Firma de recepción</div>
        <div style={{fontSize:12,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:14}}>{form.nombre} declara recibir conforme el trabajo realizado.</div>
        <div ref={firmaRef} style={{background:"#fff",border:`2px solid ${firmaVacia?"#E2E8F0":"#3B82F6"}`,borderRadius:12,overflow:"hidden",marginBottom:10,position:"relative"}}>
          <canvas width={Math.min(window.innerWidth-64,416)} height={180} style={{display:"block",touchAction:"none"}}/>
          {firmaVacia&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none"}}>
            <span style={{fontSize:13,color:"#CBD5E1",fontFamily:"'Inter',sans-serif"}}>Firma aquí con el dedo</span>
          </div>}
        </div>
        <button onClick={limpiarFirma} style={{background:"transparent",border:"none",color:"#94A3B8",cursor:"pointer",fontSize:12,fontFamily:"'Inter',sans-serif",marginBottom:14,padding:0}}>Limpiar y volver a firmar</button>
        <div style={{padding:"10px 12px",background:isDark?"#1E293B":"#F8FAFC",borderRadius:8,border:`1px solid ${isDark?"#334155":"#E2E8F0"}`,fontSize:11,color:C.muted,fontFamily:"'Inter',sans-serif",marginBottom:16,lineHeight:1.5}}>
          Al confirmar, {form.nombre} declara que: el trabajo fue recibido conforme, las instalaciones están operativas y se entregan en buen estado.
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setPaso(3)} style={{flex:1,background:isDark?"#334155":"#F1F5F9",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:600,color:C.muted,cursor:"pointer",fontFamily:"'Inter',sans-serif"}}>← Atrás</button>
          <button onClick={finalizarCierre} disabled={firmaVacia} style={{flex:2,background:!firmaVacia?"linear-gradient(135deg,#166534,#15803d)":"#374151",border:"none",borderRadius:12,padding:"14px",fontSize:14,fontWeight:700,color:"#fff",cursor:!firmaVacia?"pointer":"not-allowed",fontFamily:"'Inter',sans-serif"}}>✓ Finalizar cierre</button>
        </div>
      </div>}
    </div>
  </div>;
}

function CostosPanel({C,proyecto,params,onSave,readonly}){
  const costos   = proyecto.costos  || [];
  const pctGG    = proyecto.pctGG   ?? (params.pctGG   || 10);
  const pctImp   = proyecto.pctImp  ?? (params.pctImp  ||  5);
  const [addingCat, setAddingCat] = useState(null);
  const [newDesc, setNewDesc]     = useState("");
  const [newCant, setNewCant]     = useState(1);
  const [newPU,   setNewPU]       = useState(0);
  const [editGG,  setEditGG]      = useState(pctGG);
  const [editImp, setEditImp]     = useState(pctImp);
  const [editingPct, setEditingPct] = useState(false);

  const costoDirecto = costos.reduce((a,c)=>a+(c.total||0),0);
  const montoGG      = costoDirecto*(pctGG/100);
  const montoImp     = costoDirecto*(pctImp/100);
  const costoTotal   = costoDirecto+montoGG+montoImp;

  const addItem = cat => {
    if(!newDesc.trim())return;
    const cant = Math.max(0,newCant||1);
    const pu   = Math.max(0,newPU||0);
    const item = {id:newId(),cat,desc:newDesc.trim(),cant,precioUnit:pu,total:cant*pu};
    const updated = {...proyecto,costos:[...costos,item],updatedAt:new Date().toISOString()};
    onSave(updated);
    setNewDesc("");setNewCant(1);setNewPU(0);setAddingCat(null);
  };

  const removeItem = id => {
    const updated = {...proyecto,costos:costos.filter(c=>c.id!==id),updatedAt:new Date().toISOString()};
    onSave(updated);
  };

  const savePct = () => {
    const updated = {...proyecto,pctGG:+editGG,pctImp:+editImp,updatedAt:new Date().toISOString()};
    onSave(updated);
    setEditingPct(false);
  };

  const thS={padding:"5px 9px",color:C.textM,fontWeight:600,textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,whiteSpace:"nowrap"};
  const tdS={padding:"7px 9px",fontFamily:ff,fontSize:12};

  return <div>
    {/* Parámetros GG e Imprevistos */}
    <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,padding:"10px 14px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,flexWrap:"wrap"}}>
      <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>Gastos generales:</span>
      {editingPct
        ?<input type="number" value={editGG} onChange={e=>setEditGG(e.target.value)} style={{width:50,background:C.bg0,border:"1px solid "+C.blue,borderRadius:4,color:C.text,padding:"3px 7px",fontSize:12,fontFamily:ff,outline:"none"}}/>
        :<span style={{fontSize:13,fontWeight:600,color:C.blue,fontFamily:ff}}>{pctGG}%</span>
      }
      <span style={{fontSize:11,color:C.textM,fontFamily:ff,marginLeft:10}}>Imprevistos:</span>
      {editingPct
        ?<input type="number" value={editImp} onChange={e=>setEditImp(e.target.value)} style={{width:50,background:C.bg0,border:"1px solid "+C.blue,borderRadius:4,color:C.text,padding:"3px 7px",fontSize:12,fontFamily:ff,outline:"none"}}/>
        :<span style={{fontSize:13,fontWeight:600,color:C.blue,fontFamily:ff}}>{pctImp}%</span>
      }
      {!readonly&&(editingPct
        ?<><Btn C={C} small onClick={savePct}>Guardar</Btn><Btn C={C} ghost small onClick={()=>setEditingPct(false)}>Cancelar</Btn></>
        :<Btn C={C} ghost small onClick={()=>setEditingPct(true)}>Editar %</Btn>
      )}
      <span style={{fontSize:10,color:C.textM,fontFamily:ff,marginLeft:"auto"}}>Valores por defecto en Configuración</span>
    </div>

    {/* Ítems por categoría */}
    {CATS_COSTO.map(cat=>{
      const items=costos.filter(c=>c.cat===cat);
      const subtotal=items.reduce((a,c)=>a+(c.total||0),0);
      const col=CAT_COLORS[cat]||C.blue;
      return <div key={cat} style={{marginBottom:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <div style={{width:8,height:8,borderRadius:2,background:col}}/>
            <span style={{fontSize:10,fontWeight:700,color:col,textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:ff}}>{cat}</span>
            {items.length>0&&<span style={{fontSize:10,color:C.textM,fontFamily:ff}}>({items.length} ítem{items.length!==1?"s":""})</span>}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            {subtotal>0&&<span style={{fontSize:12,fontWeight:600,color:col,fontFamily:ff}}>{fmtCLP(subtotal)}</span>}
            {!readonly&&addingCat!==cat&&<Btn C={C} variant="soft" small onClick={()=>{setAddingCat(cat);setNewDesc("");setNewCant(1);setNewPU(0);}}>+ Ítem</Btn>}
          </div>
        </div>

        {/* Formulario nuevo ítem */}
        {addingCat===cat&&<div style={{background:C.bg2,borderRadius:5,padding:"10px 12px",marginBottom:8,border:"1px solid "+col+"44"}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 80px 110px 90px auto",gap:7,alignItems:"end"}}>
            <div>
              <div style={{fontSize:9,color:C.textM,fontFamily:ff,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.1em"}}>Descripción</div>
              <input value={newDesc} onChange={e=>setNewDesc(e.target.value)} placeholder="Ej: Cámara Hikvision DS-2..."
                style={{width:"100%",background:C.bg0,border:"1px solid "+C.border,borderRadius:4,color:C.text,padding:"6px 9px",fontSize:12,fontFamily:ff,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:9,color:C.textM,fontFamily:ff,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.1em"}}>Cant.</div>
              <input type="number" value={newCant===0?"":newCant} onChange={e=>setNewCant(e.target.value===""?0:+e.target.value)}
                style={{width:"100%",background:C.bg0,border:"1px solid "+C.border,borderRadius:4,color:C.text,padding:"6px 9px",fontSize:12,fontFamily:ff,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:9,color:C.textM,fontFamily:ff,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.1em"}}>Precio unit. $</div>
              <input type="number" value={newPU===0?"":newPU} onChange={e=>setNewPU(e.target.value===""?0:+e.target.value)}
                style={{width:"100%",background:C.bg0,border:"1px solid "+C.border,borderRadius:4,color:C.text,padding:"6px 9px",fontSize:12,fontFamily:ff,outline:"none",boxSizing:"border-box"}}/>
            </div>
            <div>
              <div style={{fontSize:9,color:C.textM,fontFamily:ff,marginBottom:4,textTransform:"uppercase",letterSpacing:"0.1em"}}>Total</div>
              <div style={{padding:"6px 9px",background:C.bg0,borderRadius:4,border:"1px solid "+C.border,fontSize:12,color:C.blue,fontFamily:ff,height:32,display:"flex",alignItems:"center"}}>{fmtCLP((newCant||0)*(newPU||0))}</div>
            </div>
            <div style={{display:"flex",gap:5,paddingBottom:1}}>
              <Btn C={C} small onClick={()=>addItem(cat)} disabled={!newDesc.trim()} style={{background:C.green,color:"#fff",border:"none"}}>✓ Agregar</Btn>
              <Btn C={C} small onClick={()=>setAddingCat(null)} style={{background:C.red+"22",color:C.red,border:"1px solid "+C.red+"44"}}>✕ Cancelar</Btn>
            </div>
          </div>
        </div>}

        {/* Tabla de ítems */}
        {items.length>0&&<div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:5,overflow:"hidden"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
              <th style={thS}>Descripción</th>
              <th style={{...thS,textAlign:"right"}}>Cant.</th>
              <th style={{...thS,textAlign:"right"}}>P. unit.</th>
              <th style={{...thS,textAlign:"right"}}>Total</th>
              {!readonly&&<th style={thS}/>}
            </tr></thead>
            <tbody>
              {items.map((item,i)=>(
                <tr key={item.id} style={{borderBottom:i<items.length-1?"1px solid "+C.border:"none",background:i%2?C.bg2+"44":"transparent"}}>
                  <td style={tdS}>{item.desc}</td>
                  <td style={{...tdS,textAlign:"right",color:C.textM}}>{item.cant}</td>
                  <td style={{...tdS,textAlign:"right",color:C.textM}}>{fmtCLP(item.precioUnit)}</td>
                  <td style={{...tdS,textAlign:"right",fontWeight:600,color:col}}>{fmtCLP(item.total)}</td>
                  {!readonly&&<td style={{...tdS,textAlign:"center",width:30}}>
                    <button onClick={()=>removeItem(item.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:12,padding:0}}>✕</button>
                  </td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>}

        {items.length===0&&addingCat!==cat&&<div style={{fontSize:11,color:C.textM,fontFamily:ff,padding:"6px 10px",background:C.bg2,borderRadius:4,border:"1px dashed "+C.border}}>
          Sin ítems.{!readonly&&<span style={{color:C.blue,cursor:"pointer",marginLeft:5}} onClick={()=>setAddingCat(cat)}>Agregar</span>}
        </div>}
      </div>;
    })}

    {/* Resumen de costos */}
    <div style={{marginTop:16,padding:"14px 16px",background:C.bg2,borderRadius:6,border:"1px solid "+C.border}}>
      <div style={{fontSize:9,fontWeight:700,color:C.textM,textTransform:"uppercase",letterSpacing:"0.15em",fontFamily:ff,marginBottom:12}}>Resumen de costos</div>
      {[
        ["Materiales",    costos.filter(c=>c.cat==="Materiales").reduce((a,c)=>a+(c.total||0),0),         CAT_COLORS["Materiales"]],
        ["Mano de obra",  costos.filter(c=>c.cat==="Mano de obra").reduce((a,c)=>a+(c.total||0),0),       CAT_COLORS["Mano de obra"]],
        ["Transporte",    costos.filter(c=>c.cat==="Transporte y logística").reduce((a,c)=>a+(c.total||0),0), CAT_COLORS["Transporte y logística"]],
        ["Gastos var.",   costos.filter(c=>c.cat==="Gastos variables").reduce((a,c)=>a+(c.total||0),0),    CAT_COLORS["Gastos variables"]],
      ].filter(([,v])=>v>0).map(([l,v,col])=>(
        <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
          <span style={{fontSize:12,color:C.textS,fontFamily:ff}}>{l}</span>
          <span style={{fontSize:12,color:col,fontFamily:ff,fontWeight:500}}>{fmtCLP(v)}</span>
        </div>
      ))}
      <div style={{borderTop:"1px solid "+C.border,paddingTop:8,marginTop:8}}>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:12,color:C.textS,fontFamily:ff}}>Costo directo</span>
          <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>{fmtCLP(costoDirecto)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
          <span style={{fontSize:12,color:C.textM,fontFamily:ff}}>Gastos generales ({pctGG}%)</span>
          <span style={{fontSize:12,color:C.textM,fontFamily:ff}}>{fmtCLP(montoGG)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
          <span style={{fontSize:12,color:C.textM,fontFamily:ff}}>Imprevistos ({pctImp}%)</span>
          <span style={{fontSize:12,color:C.textM,fontFamily:ff}}>{fmtCLP(montoImp)}</span>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",paddingTop:8,borderTop:"2px solid "+C.border}}>
          <span style={{fontSize:13,fontWeight:700,color:C.text,fontFamily:ff}}>Costo total real</span>
          <span style={{fontSize:16,fontWeight:300,color:C.blue,fontFamily:ff}}>{fmtCLP(costoTotal)}</span>
        </div>
      </div>
    </div>
  </div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// MÓDULO 2 — VISTA COMPARATIVA COTIZACIÓN VS REAL
// ─────────────────────────────────────────────────────────────────────────────
function ComparativoPanel({C,proyecto,params}){
  const costos   = proyecto.costos  || [];
  const pctGG    = proyecto.pctGG   ?? (params.pctGG   || 10);
  const pctImp   = proyecto.pctImp  ?? (params.pctImp  ||  5);
  const pctMin   = params.pctMargenMinimo || 15;

  const costoDirecto = costos.reduce((a,c)=>a+(c.total||0),0);
  const montoGG      = costoDirecto*(pctGG/100);
  const montoImp     = costoDirecto*(pctImp/100);
  const costoTotalReal = costoDirecto+montoGG+montoImp;
  const valorVendido   = proyecto.valorVendido  || 0;
  const costoEstimado  = proyecto.costoEstimado || 0;
  const utilidadEst    = valorVendido - costoEstimado;
  const utilidadReal   = valorVendido - costoTotalReal;
  const margenEst      = valorVendido>0 ? utilidadEst/valorVendido  : 0;
  const margenReal     = valorVendido>0 ? utilidadReal/valorVendido : 0;
  const desvAbs        = costoTotalReal - costoEstimado;
  const desvPct        = costoEstimado>0 ? desvAbs/costoEstimado : 0;

  const semReal = margenReal >= pctMin/100 ? {label:"Rentable",color:C.green}
    : margenReal >= (pctMin/100)*0.5       ? {label:"Margen bajo",color:C.amber}
    : margenReal >= 0                      ? {label:"Margen mínimo",color:C.red}
    :                                        {label:"Pérdida",color:"#111"};

  if(costos.length===0){
    return <div style={{textAlign:"center",padding:"30px 20px",color:C.textM,fontFamily:ff}}>
      <div style={{fontSize:20,marginBottom:10,opacity:0.3}}>◎</div>
      <div style={{fontSize:13,color:C.textS,marginBottom:5}}>Sin costos reales ingresados</div>
      <div style={{fontSize:11}}>Ve al tab "Costos reales" para ingresar los ítems del proyecto.</div>
    </div>;
  }

  const Row=({label,est,real,highlight})=>{
    const diff=real-est;
    const diffPct=est!==0?diff/Math.abs(est):0;
    const isNeg=diff<0;
    const isCost=label.toLowerCase().includes("costo")||label.toLowerCase().includes("gasto");
    const good = isCost ? isNeg : !isNeg;
    return <tr style={{borderBottom:"1px solid "+C.border,background:highlight?C.bg2:"transparent"}}>
      <td style={{padding:"9px 12px",fontFamily:ff,fontSize:12,fontWeight:highlight?700:400,color:highlight?C.text:C.textS}}>{label}</td>
      <td style={{padding:"9px 12px",fontFamily:ff,fontSize:12,textAlign:"right",color:C.blue}}>{fmtCLP(est)}</td>
      <td style={{padding:"9px 12px",fontFamily:ff,fontSize:12,textAlign:"right",color:C.green}}>{fmtCLP(real)}</td>
      <td style={{padding:"9px 12px",fontFamily:ff,fontSize:12,textAlign:"right"}}>
        {est!==0&&real!==0&&<span style={{color:good?C.green:C.red,fontWeight:500}}>{diff>=0?"+":""}{fmtCLP(diff)} ({diff>=0?"+":""}{(diffPct*100).toFixed(1)}%)</span>}
      </td>
    </tr>;
  };

  const thS={padding:"8px 12px",color:C.textM,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff};

  return <div>
    {/* Semáforo de rentabilidad real */}
    <div style={{padding:"12px 16px",background:semReal.color+"22",border:"1px solid "+semReal.color+"44",borderRadius:6,display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
      <div style={{width:14,height:14,borderRadius:"50%",background:semReal.color,flexShrink:0}}/>
      <div>
        <span style={{fontSize:14,fontWeight:700,color:semReal.color,fontFamily:ff}}>{semReal.label}</span>
        <span style={{fontSize:12,color:C.textM,fontFamily:ff,marginLeft:10}}>
          Margen real: <strong style={{color:semReal.color}}>{fmtPct(margenReal)}</strong>
          {" · "}Mínimo esperado: {pctMin}%
        </span>
      </div>
    </div>

    {/* KPIs comparativos */}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:16}}>
      <Stat C={C} label="Valor vendido"    value={fmtCLP(valorVendido)}    color={C.blue}/>
      <Stat C={C} label="Costo total real" value={fmtCLP(costoTotalReal)}  color={C.textS}/>
      <Stat C={C} label="Utilidad real"    value={fmtCLP(utilidadReal)}    color={utilidadReal>=0?C.green:C.red}/>
      <Stat C={C} label="Margen real"      value={fmtPct(margenReal)}      color={semReal.color}
        sub={costoEstimado>0?("vs estimado: "+fmtPct(margenEst)):"sin costo estimado"}/>
    </div>

    {/* Tabla comparativa */}
    <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:6,overflow:"hidden",marginBottom:14}}>
      <table style={{width:"100%",borderCollapse:"collapse"}}>
        <thead><tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
          <th style={{...thS,textAlign:"left"}}>Concepto</th>
          <th style={{...thS,textAlign:"right",color:C.blue}}>Cotizado</th>
          <th style={{...thS,textAlign:"right",color:C.green}}>Real</th>
          <th style={{...thS,textAlign:"right"}}>Diferencia</th>
        </tr></thead>
        <tbody>
          <Row label="Valor de venta"   est={valorVendido}   real={valorVendido}   />
          <Row label="Costo directo"    est={costoEstimado}  real={costoDirecto}   />
          <Row label="Gastos generales" est={costoEstimado*(pctGG/100)} real={montoGG}  />
          <Row label="Imprevistos"      est={costoEstimado*(pctImp/100)} real={montoImp} />
          <Row label="Costo total"      est={costoEstimado+costoEstimado*(pctGG/100)+costoEstimado*(pctImp/100)}  real={costoTotalReal} highlight/>
          <Row label="Utilidad"         est={utilidadEst}    real={utilidadReal}   highlight/>
        </tbody>
      </table>
    </div>

    {/* Desviacón */}
    {costoEstimado>0&&<div style={{padding:"10px 14px",background:C.bg2,borderRadius:5,border:"1px solid "+(desvAbs>0?C.red+"44":C.green+"44"),display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <span style={{fontSize:12,color:C.textS,fontFamily:ff}}>Desviación presupuestaria</span>
      <span style={{fontSize:14,fontWeight:600,color:desvAbs>0?C.red:C.green,fontFamily:ff}}>
        {desvAbs>=0?"+":""}{fmtCLP(desvAbs)} ({desvAbs>=0?"+":""}{(desvPct*100).toFixed(1)}%)
      </span>
    </div>}

    {/* Desglose por categoría */}
    {costos.length>0&&<div style={{marginTop:14}}>
      <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:ff,fontWeight:600,marginBottom:8}}>Desglose costo real por categoría</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
        {CATS_COSTO.map(cat=>{
          const v=costos.filter(c=>c.cat===cat).reduce((a,c)=>a+(c.total||0),0);
          if(!v)return null;
          const pct=costoDirecto>0?v/costoDirecto:0;
          const col=CAT_COLORS[cat]||C.blue;
          return <div key={cat} style={{background:C.bg2,borderRadius:5,padding:"10px 12px",border:"1px solid "+col+"33"}}>
            <div style={{fontSize:9,color:col,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,fontWeight:600,marginBottom:4}}>{cat}</div>
            <div style={{fontSize:15,fontWeight:300,color:col,fontFamily:ff,marginBottom:2}}>{fmtCLP(v)}</div>
            <div style={{height:3,background:C.border,borderRadius:2,overflow:"hidden",marginBottom:2}}>
              <div style={{height:"100%",background:col,width:(pct*100).toFixed(1)+"%"}}/>
            </div>
            <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{fmtPct(pct)} del costo directo</div>
          </div>;
        })}
      </div>
    </div>}
  </div>;
}

function RentabilidadCobradaPanel({C,proyecto,fin}){
  const ratioFacturado=(proyecto.valorVendido||0)>0?fin.facturado/(proyecto.valorVendido||0):0;
  const ratioCobrado=(proyecto.valorVendido||0)>0?fin.cobrado/(proyecto.valorVendido||0):0;
  const ratioCosto=(proyecto.valorVendido||0)>0?fin.costoReal/(proyecto.valorVendido||0):0;
  const margenColor=fin.margenCobrado===null?C.textM:fin.margenCobrado>=0.15?C.green:fin.margenCobrado>=0?C.amber:C.red;
  return <Card C={C} style={{marginBottom:18,border:"1px solid "+margenColor+"44"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:14,flexWrap:"wrap"}}>
      <div>
        <STitle C={C}>Rentabilidad cobrada</STitle>
        <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:-4}}>Cruza venta, facturación, pagos y costo real imputado al proyecto.</div>
      </div>
      <Bdg color={margenColor}>{fin.margenCobrado===null?"Sin cobro":fin.margenCobrado>=0.15?"Saludable":fin.margenCobrado>=0?"Ajustado":"Pérdida"}</Bdg>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
      {[
        {l:"Venta neta",v:fmtCLP(proyecto.valorVendido||0),sub:"base contrato",c:C.blue},
        {l:"Facturado",v:fmtCLP(fin.facturado),sub:fmtPct(ratioFacturado)+" de venta",c:C.blue},
        {l:"Cobrado",v:fmtCLP(fin.cobrado),sub:fmtPct(ratioCobrado)+" de venta",c:C.green},
        {l:"Costo real",v:fmtCLP(fin.costoReal),sub:fmtPct(ratioCosto)+" de venta",c:C.textS},
        {l:"Margen cobrado",v:fin.margenCobrado===null?"—":fmtPct(fin.margenCobrado),sub:"sobre caja cobrada",c:margenColor},
      ].map(k=><div key={k.l} style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:6,padding:"10px 12px"}}>
        <div style={{fontSize:8,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,fontWeight:600}}>{k.l}</div>
        <div style={{fontSize:k.v.length>12?14:18,fontWeight:600,color:k.c,fontFamily:ff,marginTop:4,fontVariantNumeric:"tabular-nums"}}>{k.v}</div>
        <div style={{fontSize:10,color:C.textM,fontFamily:ff,marginTop:2}}>{k.sub}</div>
      </div>)}
    </div>
    <div style={{height:12,background:C.bg0,border:"1px solid "+C.border,borderRadius:6,overflow:"hidden",display:"flex",marginBottom:10}}>
      <div title="Cobrado" style={{width:Math.min(100,ratioCobrado*100)+"%",background:C.green}}/>
      <div title="Facturado pendiente de cobro" style={{width:Math.min(100,Math.max(0,ratioFacturado-ratioCobrado)*100)+"%",background:C.amber}}/>
      <div title="Por facturar" style={{flex:1,background:C.border}}/>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
      <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>CxC proyecto: <b style={{color:fin.pendienteCxC>0?C.amber:C.green}}>{fmtCLP(fin.pendienteCxC)}</b></div>
      <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Por facturar/cobrar: <b style={{color:fin.pendienteVenta>0?C.amber:C.green}}>{fmtCLP(fin.pendienteVenta)}</b></div>
      <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Utilidad cobrada: <b style={{color:fin.utilidadCobrada>=0?C.green:C.red}}>{fmtCLP(fin.utilidadCobrada)}</b></div>
    </div>
  </Card>;
}

function ActivacionServicioPanel({C,proyecto,propuesta,clientes,instalaciones,servicios,params,onSaveServicio,onSaveProyecto,onGoServicios,readonly}){
  const servicio=servicios.find(s=>s.proyectoId===proyecto.id);
  const requiere=(propuesta?tieneRecurrente(propuesta):false)||proyecto.requiereActivacionServicio||proyecto.activacionServicioEstado;
  const cliente=clientes.find(c=>c.id===proyecto.clienteId);
  const inst=instalaciones.find(i=>i.id===proyecto.instalacionId);
  const calc=propuesta?calcProp(propuesta,params):null;
  const cerrado=proyecto.estadoOp==="Cerrado técnicamente"||proyecto.cierreTecnico;
  const estadoActivacion=servicio
    ?servicio.estado==="Activo"?"Activo":servicioTieneProtocoloCompleto(servicio)?"Listo para activar":"Protocolo pendiente"
    :cerrado?"Pendiente crear servicio":"Esperando cierre técnico";
  const crear=()=>{
    if(!propuesta)return;
    const calc=calcProp(propuesta,params)||{};
    const nuevo=buildServicioDesdeProyecto({proyecto,propuesta,clientes,instalaciones,mrr:calc.iRec||0,id:newId});
    onSaveServicio(nuevo);
    onSaveProyecto&&onSaveProyecto({...proyecto,requiereActivacionServicio:true,activacionServicioEstado:"En activación",servicioRecurrenteId:nuevo.id,updatedAt:new Date().toISOString()});
  };
  const activar=()=>{
    if(!servicioTieneProtocoloCompleto(servicio)){alert("Completa el protocolo en Servicios recurrentes antes de activar.");return;}
    onSaveServicio({...servicio,estado:"Activo",updatedAt:new Date().toISOString()});
    onSaveProyecto&&onSaveProyecto({...proyecto,requiereActivacionServicio:true,activacionServicioEstado:"Activo",servicioRecurrenteId:servicio.id,updatedAt:new Date().toISOString()});
  };
  if(!requiere&&!servicio){
    return <EmptyState C={C} icon="·" title="Sin servicio recurrente asociado" sub="Este proyecto no proviene de una propuesta con monitoreo o recurrente."/>;
  }
  return <div>
    <Card C={C} style={{border:"1px solid "+(servicio?COL_SERVICIO[servicio.estado]||C.border:C.amber)+"55"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:14,flexWrap:"wrap"}}>
        <div>
          <STitle C={C}>Activación de servicio recurrente</STitle>
          <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:-4}}>
            {cliente?.razonSocial||"Sin cliente"} · {inst?.nombre||"Sin instalación"} · MRR estimado {fmtCLP(calc?.iRec||servicio?.valorMensual||0)}
          </div>
        </div>
        {servicio?<Bdg color={COL_SERVICIO[servicio.estado]||C.textM}>{estadoActivacion}</Bdg>:<Bdg color={cerrado?C.amber:C.textM}>{estadoActivacion}</Bdg>}
      </div>
      {!servicio?<div>
        <div style={{fontSize:13,color:C.textS,fontFamily:ff,marginBottom:12}}>
          La propuesta incluye recurrente. {cerrado?"El proyecto ya está cerrado técnicamente; crea el servicio para controlar protocolo, estado, MRR y facturación mensual esperada.":"Quedará en cola hasta el cierre técnico para activar el monitoreo."}
        </div>
        {!readonly&&<Btn C={C} onClick={crear}>Crear servicio en activación</Btn>}
      </div>:<div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:14}}>
          <Stat C={C} label="MRR" value={fmtCLP(servicio.valorMensual||0)} color={C.green} small/>
          <Stat C={C} label="Cámaras" value={String(servicio.camaras||0)} color={C.blue} small/>
          <Stat C={C} label="Alarmas" value={String(servicio.alarmas||0)} color={C.amber} small/>
          <Stat C={C} label="Inicio" value={servicio.fechaInicio||"—"} color={servicio.fechaInicio?C.text:C.amber} small/>
          <Stat C={C} label="Protocolo" value={servicioTieneProtocoloCompleto(servicio)?"OK":"Pendiente"} color={servicioTieneProtocoloCompleto(servicio)?C.green:C.amber} small/>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {onGoServicios&&<Btn C={C} ghost small onClick={onGoServicios}>Abrir servicio</Btn>}
          {!readonly&&servicio.estado!=="Activo"&&<Btn C={C} small color={C.green} onClick={activar}>Activar si está completo</Btn>}
        </div>
      </div>}
    </Card>
  </div>;
}


export default function ProyectosView({C,clientes,instalaciones,propuestas,proyectos,servicios,ejecutivos,params,tecnicos,contratistas,materiales,registrosHoras,incidencias,fichajes=[],facturasFin=[],pagosFin=[],usuarios=[],newId,onSave,onDelete,onSaveServicio,onGoTab,onSaveRegistroHora,onSaveBulkHoras,onDeleteRegistroHora,onSaveIncidencia,onDeleteIncidencia,onSaveMaterial,readonly}){
  const [selected,setSelected]=useState(null);
  const [detailTab,setDetailTab]=useState("plan");
  const [editModal,setEditModal]=useState(false);
  const [editForm,setEditForm]=useState({});
  const [confId,setConfId]=useState(null);
  const [filtroOp,setFiltroOp]=useState("Todos");
  const [filtroFin,setFiltroFin]=useState("Todos");
  const [search,setSearch]=useState("");

  const sf=(k,v)=>setEditForm(f=>({...f,[k]:v}));
  
  const finProyecto=p=>calcProjectFinance({proyecto:p,facturas:facturasFin,pagos:pagosFin,params});

  const saveEdit=()=>{
    if(!editForm.nombre?.trim())return;
    onSave({...editForm,updatedAt:new Date().toISOString()});
    setEditModal(false);
    if(selected?.id===editForm.id)setSelected({...editForm,updatedAt:new Date().toISOString()});
  };

  const changeEstadoOp=(proy,val)=>{
    const updated={...proy,estadoOp:val,updatedAt:new Date().toISOString()};
    onSave(updated);
    if(selected?.id===proy.id)setSelected(updated);
  };
  const changeEstadoFin=(proy,val)=>{
    const updated={...proy,estadoFin:val,updatedAt:new Date().toISOString()};
    onSave(updated);
    if(selected?.id===proy.id)setSelected(updated);
  };

  const filtered=proyectos.filter(p=>{
    if(filtroOp!=="Todos"&&p.estadoOp!==filtroOp)return false;
    if(filtroFin!=="Todos"&&p.estadoFin!==filtroFin)return false;
    if(!search)return true;
    const q=search.toLowerCase();
    const cl=clientes.find(c=>c.id===p.clienteId);
    return(p.nombre||"").toLowerCase().includes(q)||(cl?.razonSocial||"").toLowerCase().includes(q)||(p.ejecutivo||"").toLowerCase().includes(q);
  });

  // KPIs
  const total=proyectos.length;
  const enEjecucion=proyectos.filter(p=>p.estadoOp==="En ejecución").length;
  const ejecutados=proyectos.filter(p=>p.estadoOp==="Ejecutado"||p.estadoOp==="Cerrado técnico").length;
  const pendFact=proyectos.filter(p=>p.estadoFin==="Pendiente facturación").length;
  const finAll=proyectos.map(p=>finProyecto(p));
  const cobrado=finAll.reduce((a,f)=>a+f.cobrado,0);
  const facturado=finAll.reduce((a,f)=>a+f.facturado,0);
  const pendienteCobro=finAll.reduce((a,f)=>a+f.pendienteCxC,0);

  const thS={padding:"6px 10px",color:C.textM,fontWeight:600,textAlign:"left",fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,whiteSpace:"nowrap"};
  const tdS={padding:"8px 10px",fontFamily:ff,fontSize:12};

  return <div>
    <ModuleHero
      C={C}
      eyebrow="Operación técnica"
      title="Control de proyectos"
      subtitle="Seguimiento operativo y financiero desde ejecución hasta cierre técnico, activación recurrente y cobranza."
      actions={<div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:8,padding:"10px 12px",minWidth:160}}>
        <div style={{fontSize:10,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:900,fontFamily:ff}}>CxC pendiente</div>
        <div style={{fontSize:22,color:pendienteCobro>0?C.amber:C.green,fontWeight:900,fontFamily:ff,marginTop:4}}>{fmtCLP(pendienteCobro)}</div>
      </div>}
    >
      <WorkflowSteps C={C} active={Math.min(4, [proyectos.length>0, enEjecucion>0, ejecutados>0, facturado>0, cobrado>0].filter(Boolean).length)} steps={["Planificar", "Ejecutar", "Cerrar", "Facturar", "Cobrar"]}/>
      <div style={{marginTop:12}}>
        <QuickActions C={C} items={[
          {label:`${enEjecucion} en ejecución`,description:"Revisar avance y tareas",tone:C.blue,onClick:()=>setFiltroOp("En ejecución")},
          {label:`${pendFact} pendientes de facturar`,description:"Cierre financiero",tone:pendFact?C.amber:C.green,onClick:()=>setFiltroFin("Pendiente facturación")},
          {label:`${incidencias.filter(i=>!["Cerrada","Resuelta"].includes(i.estado)).length} incidencias`,description:"Bandeja operativa",tone:incidencias.length?C.amber:C.green,onClick:()=>onGoTab&&onGoTab("incidencias")},
          {label:"Servicios recurrentes",description:"Activaciones post-cierre",tone:C.green,onClick:()=>onGoTab&&onGoTab("servicios")},
        ]}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,minmax(0,1fr))",gap:10,marginBottom:16}}>
        <Stat C={C} label="Total proyectos" value={""+total} sub={enEjecucion+" en ejecución"}/>
        <Stat C={C} label="En ejecución" value={""+enEjecucion} color={C.blue}/>
        <Stat C={C} label="Ejecutados" value={""+ejecutados} color={C.green}/>
        <Stat C={C} label="Pend. facturación" value={""+pendFact} color={C.amber}/>
        <Stat C={C} label="Total cobrado" value={fmtCLP(cobrado)} color={C.green} sub={"Facturado: "+fmtCLP(facturado)}/>
      </div>

      <div style={{display:"flex",gap:9,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
        <input placeholder="Buscar proyecto, cliente..." value={search} onChange={e=>setSearch(e.target.value)}
          style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,color:C.text,padding:"10px 13px",fontSize:13,fontFamily:ff,outline:"none",flex:"1 1 280px",boxShadow:C.isLight?"0 1px 0 rgba(15,23,41,0.03)":"none"}}/>
        <select value={filtroOp} onChange={e=>setFiltroOp(e.target.value)}
          style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,color:C.text,padding:"10px 12px",fontSize:12,fontFamily:ff,outline:"none"}}>
          <option value="Todos">Todos los estados operacionales</option>
          {EST_OP.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filtroFin} onChange={e=>setFiltroFin(e.target.value)}
          style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:8,color:C.text,padding:"10px 12px",fontSize:12,fontFamily:ff,outline:"none"}}>
          <option value="Todos">Todos los estados financieros</option>
          {EST_FIN.map(s=><option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
      {["Todos",...EST_OP].map(s=>{
        const n=s==="Todos"?proyectos.length:proyectos.filter(p=>p.estadoOp===s).length;
        const col=COL_OP[s]||C.blue;
        return <button key={s} onClick={()=>setFiltroOp(s)}
          style={{padding:"7px 11px",borderRadius:8,fontSize:11,fontWeight:filtroOp===s?900:700,cursor:"pointer",
            background:filtroOp===s?col+"18":C.bg1,color:filtroOp===s?col:C.textM,
            border:"1px solid "+(filtroOp===s?col:C.border),fontFamily:ff}}>
          {s} ({n})
        </button>;
      })}
      </div>
    </ModuleHero>

    {filtered.length===0
      ?<Empty C={C} icon="◉" title="Sin proyectos" sub='Convierte una propuesta aprobada en proyecto desde el módulo "Propuestas"'/>
      :<Card C={C} style={{padding:0,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{borderBottom:"1px solid "+C.border,background:C.bg2}}>
              {["Estado op.","Estado fin.","Proyecto","Cliente","Ejecutivo","Valor vendido","Cobrado","Pendiente","Inicio","Término","Acciones"].map(h=><th key={h} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {filtered.map((p,i)=>{
                const cl=clientes.find(c=>c.id===p.clienteId);
                const inst=instalaciones.find(i=>i.id===p.instalacionId);
                const fp=finProyecto(p);
                return <tr key={p.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent",cursor:"pointer"}}
                  onClick={()=>{setSelected(selected?.id===p.id?null:p);setDetailTab("plan");}}>
                  <td style={tdS}>
                    {readonly
                      ?<Bdg color={COL_OP[p.estadoOp]||"#64748B"} small>{p.estadoOp||"Pendiente"}</Bdg>
                      :<select value={p.estadoOp||"Pendiente"} onClick={e=>e.stopPropagation()}
                          onChange={e=>{e.stopPropagation();changeEstadoOp(p,e.target.value);}}
                          style={{background:"transparent",border:"1px solid "+(COL_OP[p.estadoOp]||"#64748B")+"66",
                            color:COL_OP[p.estadoOp]||"#64748B",borderRadius:4,fontSize:10,fontFamily:ff,cursor:"pointer",padding:"2px 5px",outline:"none"}}>
                          {EST_OP.map(s=><option key={s} value={s} style={{background:C.bg1,color:C.text}}>{s}</option>)}
                        </select>
                    }
                  </td>
                  <td style={tdS}>
                    {readonly
                      ?<Bdg color={COL_FIN[p.estadoFin]||"#64748B"} small>{p.estadoFin||"—"}</Bdg>
                      :<select value={p.estadoFin||"Pendiente facturación"} onClick={e=>e.stopPropagation()}
                          onChange={e=>{e.stopPropagation();changeEstadoFin(p,e.target.value);}}
                          style={{background:"transparent",border:"1px solid "+(COL_FIN[p.estadoFin]||"#64748B")+"66",
                            color:COL_FIN[p.estadoFin]||"#64748B",borderRadius:4,fontSize:10,fontFamily:ff,cursor:"pointer",padding:"2px 5px",outline:"none"}}>
                          {EST_FIN.map(s=><option key={s} value={s} style={{background:C.bg1,color:C.text}}>{s}</option>)}
                        </select>
                    }
                  </td>
                  <td style={{...tdS,fontWeight:600,color:C.text}}>{p.nombre||"—"}</td>
                  <td style={{...tdS,color:C.textS}}>{cl?.razonSocial||cl?.nombreComercial||"—"}{inst?" · "+inst.nombre:""}</td>
                  <td style={{...tdS,color:C.textM}}>{p.ejecutivo||"—"}</td>
                  <td style={{...tdS,color:C.blue,fontWeight:600}}>{fmtCLP(p.valorVendido)}</td>
                  <td style={{...tdS,color:fp.cobrado>0?C.green:C.textM,fontWeight:fp.cobrado>0?600:400}}>{fp.cobrado>0?fmtCLP(fp.cobrado):"—"}</td>
                  <td style={{...tdS,color:fp.pendienteVenta>0?C.amber:C.green}}>{fmtCLP(fp.pendienteVenta)}</td>
                  <td style={{...tdS,color:C.textM,fontSize:11}}>{p.fechaInicio||"—"}</td>
                  <td style={{...tdS,color:C.textM,fontSize:11}}>{p.fechaTermino||"—"}</td>
                  <td style={tdS} onClick={e=>e.stopPropagation()}>
                    <div style={{display:"flex",gap:4}}>
                      {!readonly&&<Btn C={C} ghost small onClick={()=>{setEditForm({...p});setEditModal(true);}}>Editar</Btn>}
                      {confId===p.id
                        ?<><Btn C={C} color={C.red} small onClick={()=>{onDelete(p.id);setConfId(null);if(selected?.id===p.id)setSelected(null);}}>OK</Btn>
                            <Btn C={C} ghost small onClick={()=>setConfId(null)}>No</Btn></>
                        :!readonly&&<Btn C={C} ghost color={C.red} small onClick={()=>setConfId(p.id)}>🗑</Btn>
                      }
                    </div>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Card>
    }

    {/* Panel detalle del proyecto seleccionado */}
    {selected&&(()=>{
      const prop=propuestas.find(p=>p.id===selected.propuestaId);
      const cl=clientes.find(c=>c.id===selected.clienteId);
      const inst=instalaciones.find(i=>i.id===selected.instalacionId);
      const colOp=COL_OP[selected.estadoOp]||"#64748B";
      const colFin=COL_FIN[selected.estadoFin]||"#64748B";
      const finSel=finProyecto(selected);
      const colMargenCobrado=finSel.margenCobrado===null?C.textM:finSel.margenCobrado>=0.15?C.green:finSel.margenCobrado>=0?C.amber:C.red;
      return <Card C={C} style={{border:"1px solid "+colOp+"55",marginTop:-10}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4,flexWrap:"wrap"}}>
              <Bdg color={colOp}>{selected.estadoOp||"Pendiente"}</Bdg>
              <Bdg color={colFin}>{selected.estadoFin||"—"}</Bdg>
              <span style={{fontSize:16,fontWeight:600,color:C.text,fontFamily:ff}}>{selected.nombre}</span>
            </div>
            <div style={{fontSize:12,color:C.textM,fontFamily:ff}}>
              {cl?.razonSocial||cl?.nombreComercial||"—"}
              {inst?" · "+inst.nombre:""}
              {selected.ejecutivo?" · "+selected.ejecutivo:""}
              {selected.categoria?" · "+selected.categoria:""}
            </div>
          </div>
          <div style={{display:"flex",gap:6}}>
            {!readonly&&<Btn C={C} ghost small onClick={()=>{setEditForm({...selected});setEditModal(true);}}>Editar proyecto</Btn>}
            <button onClick={()=>setSelected(null)} style={{background:"transparent",border:"none",color:C.textM,cursor:"pointer",fontSize:16}}>✕</button>
          </div>
        </div>

        {/* KPIs del proyecto */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:10,marginBottom:16}}>
          <Stat C={C} label="Valor vendido"   value={fmtCLP(selected.valorVendido)}  color={C.blue}/>
          <Stat C={C} label="Facturado" value={finSel.facturado>0?fmtCLP(finSel.facturado):"Pendiente"} color={finSel.facturado>0?C.blue:C.amber}/>
          <Stat C={C} label="Cobrado" value={finSel.cobrado>0?fmtCLP(finSel.cobrado):"Pendiente"} color={finSel.cobrado>0?C.green:C.amber} sub={fmtPct(finSel.avanceCobro)+" de venta"}/>
          <Stat C={C} label="Pendiente venta" value={fmtCLP(finSel.pendienteVenta)} color={finSel.pendienteVenta>0?C.amber:C.green}/>
          <Stat C={C} label="Utilidad cobrada" value={fmtCLP(finSel.utilidadCobrada)} color={finSel.utilidadCobrada>=0?C.green:C.red}/>
          <Stat C={C} label="Margen cobrado" value={finSel.margenCobrado===null?"—":fmtPct(finSel.margenCobrado)} color={colMargenCobrado}/>
        </div>

        {/* Fechas y datos de ejecución */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div style={{background:C.bg2,borderRadius:5,padding:"12px 14px",border:"1px solid "+C.border}}>
            <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:ff,fontWeight:600,marginBottom:10}}>Fechas de ejecución</div>
            {[["Aprobación",selected.fechaAprobacion],["Inicio",selected.fechaInicio],["Término",selected.fechaTermino],["Facturación",selected.fechaFacturacion]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{l}</span>
                <span style={{fontSize:11,color:v?C.textS:C.textM,fontFamily:ff,fontWeight:v?500:400}}>{v||"—"}</span>
              </div>
            ))}
          </div>
          <div style={{background:C.bg2,borderRadius:5,padding:"12px 14px",border:"1px solid "+C.border}}>
            <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:ff,fontWeight:600,marginBottom:10}}>Propuesta vinculada</div>
            {prop?(<div>
              <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff,marginBottom:4}}>{prop.nombre}</div>
              <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:3}}>N°: {prop.numero||"—"} · {prop.tipoVenta||"—"}</div>
              {prop.camaras>0&&<div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Cámaras: {prop.camaras}</div>}
              {prop.duracionContrato>0&&<div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Contrato: {prop.duracionContrato} meses</div>}
              <div style={{marginTop:8}}><Bdg color={COL_E[prop.estado]||"#64748B"} small>{prop.estado}</Bdg></div>
            </div>)
            :<div style={{fontSize:12,color:C.textM,fontFamily:ff}}>Propuesta no encontrada</div>}
          </div>
        </div>

        {selected.observaciones&&<div style={{padding:"9px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,fontSize:12,color:C.textM,fontFamily:ff,marginBottom:12}}>
          <strong style={{color:C.textS}}>Observaciones:</strong> {selected.observaciones}
        </div>}

        {/* Tabs detalle proyecto — 4 zonas */}
        <div style={{display:"flex",gap:0,marginBottom:18,borderBottom:"1px solid "+C.border}}>
          {[["plan","Plan","Lo que tú defines"],["terreno","En terreno","Lo que llega del técnico"],["activacion","Activación","Servicio recurrente"],["analisis","Análisis","Cotizado vs real"],["cierre","Cierre","Acta y reporte final"]].map(([id,lbl,sub])=>(
            <button key={id} onClick={()=>setDetailTab(id)} style={{padding:"10px 18px",cursor:"pointer",fontSize:13,fontWeight:detailTab===id?500:400,background:"transparent",color:detailTab===id?C.text:C.textM,border:"none",borderBottom:detailTab===id?"2px solid "+C.blue:"2px solid transparent",fontFamily:ff,marginBottom:-1,textAlign:"left"}}>
              <div>{lbl}</div>
              <div style={{fontSize:10,color:C.textM,fontWeight:400,marginTop:1}}>{sub}</div>
            </button>
          ))}
        </div>

        {/* ── PLAN — Resumen + Tareas + Hitos facturación (lo que define el operador) ── */}
        {detailTab==="plan"&&<div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <div style={{background:C.bg2,borderRadius:5,padding:"12px 14px",border:"1px solid "+C.border}}>
              <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:ff,fontWeight:600,marginBottom:10}}>Fechas de ejecución</div>
              {[["Aprobación",selected.fechaAprobacion],["Inicio",selected.fechaInicio],["Término",selected.fechaTermino],["Facturación",selected.fechaFacturacion]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{l}</span>
                  <span style={{fontSize:11,color:v?C.textS:C.textM,fontFamily:ff,fontWeight:v?500:400}}>{v||"—"}</span>
                </div>
              ))}
            </div>
            <div style={{background:C.bg2,borderRadius:5,padding:"12px 14px",border:"1px solid "+C.border}}>
              <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.12em",fontFamily:ff,fontWeight:600,marginBottom:10}}>Propuesta vinculada</div>
              {prop?<div>
                <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff,marginBottom:4}}>{prop.nombre}</div>
                <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginBottom:3}}>N°: {prop.numero||"—"}</div>
                {prop.duracionContrato>0&&<div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Contrato: {prop.duracionContrato} meses</div>}
                <div style={{marginTop:8}}><Bdg color={COL_E[prop.estado]||"#64748B"} small>{prop.estado}</Bdg></div>
              </div>:<div style={{fontSize:12,color:C.textM,fontFamily:ff}}>Propuesta no encontrada</div>}
            </div>
          </div>
          <TareasPanel C={C} proyecto={selected} tecnicos={tecnicos} contratistas={contratistas} usuarios={usuarios} onSave={p=>{onSave(p);setSelected(p);}} readonly={readonly}/>
          <div style={{marginTop:18}}>
            <ProyectoHitosTab C={C} proyecto={selected} params={params} onSaveProyecto={p=>{onSave(p);setSelected(p);}} readonly={readonly}/>
          </div>
        </div>}

        {/* ── EN TERRENO — Bandeja + monitoreo (read-only) ── */}
        {detailTab==="terreno"&&<ProyectoEnTerreno C={C} proyecto={selected} tecnicos={tecnicos||[]} contratistas={contratistas||[]} registrosHoras={(registrosHoras||[]).filter(r=>r.proyectoId===selected.id)} incidencias={(incidencias||[]).filter(i=>i.proyectoId===selected.id)} fichajes={(fichajes||[]).filter(f=>f.proyectoId===selected.id)} params={params} onSaveRegistroHora={onSaveRegistroHora} onSaveIncidencia={onSaveIncidencia} onSaveProyecto={p=>{onSave(p);setSelected(p);}} readonly={readonly}/>}

        {detailTab==="activacion"&&<ActivacionServicioPanel C={C} proyecto={selected} propuesta={prop} clientes={clientes} instalaciones={instalaciones} servicios={servicios||[]} params={params} onSaveServicio={onSaveServicio} onSaveProyecto={p=>{onSave(p);setSelected(p);}} onGoServicios={()=>onGoTab&&onGoTab("servicios")} readonly={readonly}/>}

        {/* ── ANÁLISIS — Cotizado vs Real + Costos reales ── */}
        {detailTab==="analisis"&&<div>
          <RentabilidadCobradaPanel C={C} proyecto={selected} fin={finSel}/>
          <ComparativoPanel C={C} proyecto={selected} params={params}/>
          <div style={{marginTop:18}}>
            <CostosPanel C={C} proyecto={selected} params={params} onSave={p=>{onSave(p);setSelected(p);}} readonly={readonly}/>
          </div>
        </div>}

        {/* ── CIERRE — Reporte + acta ── */}
        {detailTab==="cierre"&&<ReporteProyecto C={C} proyecto={selected} clientes={clientes} instalaciones={instalaciones} tecnicos={tecnicos} contratistas={contratistas} incidencias={(incidencias||[]).filter(i=>i.proyectoId===selected.id)} fichajes={(fichajes||[]).filter(f=>f.proyectoId===selected.id)} params={params} onReabrir={()=>{const p={...selected,estadoOp:"En ejecución",reaperturas:[...(selected.reaperturas||[]),{fecha:new Date().toISOString(),motivo:"Reabierto desde desktop"}],timeline:[...(selected.timeline||[]),{fecha:new Date().toISOString(),tipo:"reapertura",desc:"Proyecto reabierto por jefe de operaciones"}]};onSave(p);setSelected(p);}} onSaveProyecto={p=>{onSave(p);setSelected(p);}} readonly={readonly}/>}
      </Card>;
    })()}

    {/* Modal edición proyecto */}
    {editModal&&<Modal C={C} title="Editar proyecto" onClose={()=>setEditModal(false)} width={700}>
      <div style={{marginBottom:12,padding:"8px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,fontSize:11,color:C.textM,fontFamily:ff}}>
        <strong style={{color:C.textS}}>Propuesta vinculada:</strong> {propuestas.find(p=>p.id===editForm.propuestaId)?.nombre||"—"}
        {" · "}<strong style={{color:C.blue}}>{fmtCLP(editForm.valorVendido)}</strong>
      </div>
      <G cols={2}>
        <Fld C={C} label="Nombre del proyecto" req><Inp C={C} value={editForm.nombre||""} onChange={v=>sf("nombre",v)}/></Fld>
        <Fld C={C} label="Ejecutivo responsable"><Sel C={C} value={editForm.ejecutivo||""} onChange={v=>sf("ejecutivo",v)} opts={ejecutivos} placeholder="— seleccionar —"/></Fld>
        <Fld C={C} label="Estado operacional"><Sel C={C} value={editForm.estadoOp||"Pendiente"} onChange={v=>sf("estadoOp",v)} opts={EST_OP}/></Fld>
        <Fld C={C} label="Estado financiero"><Sel C={C} value={editForm.estadoFin||"Pendiente facturación"} onChange={v=>sf("estadoFin",v)} opts={EST_FIN}/></Fld>
        <Fld C={C} label="Fecha inicio"><Inp C={C} value={editForm.fechaInicio||""} onChange={v=>sf("fechaInicio",v)} type="date"/></Fld>
        <Fld C={C} label="Fecha término"><Inp C={C} value={editForm.fechaTermino||""} onChange={v=>sf("fechaTermino",v)} type="date"/></Fld>
        <Fld C={C} label="Fecha facturación"><Inp C={C} value={editForm.fechaFacturacion||""} onChange={v=>sf("fechaFacturacion",v)} type="date"/></Fld>
        <Fld C={C} label="N° de factura"><Inp C={C} value={editForm.nroFactura||""} onChange={v=>sf("nroFactura",v)} placeholder="F-0001234"/></Fld>
        <Fld C={C} label="Monto facturado" prefix="$"><Inp C={C} value={editForm.montoFacturado||0} onChange={v=>sf("montoFacturado",v)} type="number"/></Fld>
        <Fld C={C} label="Costo estimado (ref.)" prefix="$"><Inp C={C} value={editForm.costoEstimado||0} onChange={v=>sf("costoEstimado",v)} type="number"/></Fld>
      </G>
      <Fld C={C} label="Observaciones">
        <textarea value={editForm.observaciones||""} onChange={e=>sf("observaciones",e.target.value)} rows={3}
          style={{width:"100%",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,color:C.text,padding:"9px 11px",fontSize:13,fontFamily:ff,outline:"none",resize:"vertical",boxSizing:"border-box"}}/>
      </Fld>
      {(()=>{
        const margen=editForm.valorVendido>0&&editForm.costoEstimado>0?1-editForm.costoEstimado/editForm.valorVendido:null;
        return margen!==null&&<div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
          <Stat C={C} label="Valor vendido"  value={fmtCLP(editForm.valorVendido)}  color={C.blue}  small/>
          <Stat C={C} label="Costo estimado" value={fmtCLP(editForm.costoEstimado)} color={C.textS} small/>
          <Stat C={C} label="Margen est."    value={fmtPct(margen)} color={margen>0.2?C.green:margen>0.1?C.amber:C.red} small/>
        </div>;
      })()}
      <div style={{display:"flex",gap:8,justifyContent:"flex-end",paddingTop:12,borderTop:"1px solid "+C.border}}>
        <Btn C={C} ghost onClick={()=>setEditModal(false)}>Cancelar</Btn>
        <Btn C={C} onClick={saveEdit} disabled={!editForm.nombre?.trim()}>Guardar proyecto</Btn>
      </div>
    </Modal>}
  </div>;
}
