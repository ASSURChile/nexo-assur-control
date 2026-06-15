import { useMemo, useState } from "react";
import { ff } from "../config/appConstants";
import { Bdg, Btn, Card, EmptyState, Fld, G, Inp, Modal, ModuleHero, QuickActions, Sel, SelBusca, STitle, WorkflowSteps } from "../components/ui";
import { fmtCLP } from "../utils/formatters";

const LINEAS=["ASSUR Home","ASSUR Empresas"];
const CATEGORIAS=["Alarma","CCTV","Videoverificación","Mantención","Control de acceso","Otro"];
const ESTADOS=["Borrador","Activo","Pausado","Descontinuado"];
const MONEDAS=["CLP","UF"];

const newPackage=()=>({
  nombre:"",
  linea:"ASSUR Home",
  categoria:"Alarma",
  estado:"Borrador",
  descripcionComercial:"",
  precioInstalacionNeto:0,
  monedaPrecio:"CLP",
  valorMensual:0,
  monedaMensual:"UF",
  duracionContratoMeses:24,
  materialesIncluidos:[],
  manoObraIncluida:[],
  serviciosIncluidos:[],
  costoEstimado:0,
  margenEsperado:0,
  requiereAprobacion:true,
  vigenciaDesde:"",
  vigenciaHasta:"",
  condiciones:"",
});

const toCLP=(value,moneda,params)=>moneda==="UF"?Math.round((Number(value)||0)*(params?.ufValue||39900)):Number(value)||0;
const margin=(pkg,params)=>{
  const price=toCLP(pkg.precioInstalacionNeto,pkg.monedaPrecio,params);
  const cost=Number(pkg.costoEstimado)||0;
  return price>0?Math.round(((price-cost)/price)*1000)/10:0;
};

function PackageForm({C,initial,materiales,onClose,onSave}){
  const [form,setForm]=useState(initial||newPackage());
  const [matId,setMatId]=useState("");
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const addMaterial=()=>{
    const mat=materiales.find(m=>m.id===matId);
    if(!mat)return;
    sf("materialesIncluidos",[...(form.materialesIncluidos||[]),{id:mat.id,nombre:mat.nombre,cantidad:1,unidad:mat.unidad||"u",costoUnitario:mat.precioUnitario||0}]);
    setMatId("");
  };
  const removeMaterial=i=>sf("materialesIncluidos",(form.materialesIncluidos||[]).filter((_,idx)=>idx!==i));
  return <Modal C={C} title={form.id?"Editar paquete":"Nuevo paquete comercial"} onClose={onClose} width={760}>
    <G cols={2}>
      <Fld C={C} label="Nombre" req><Inp C={C} value={form.nombre||""} onChange={v=>sf("nombre",v)} placeholder="Alarma Home Base"/></Fld>
      <Fld C={C} label="Estado"><Sel C={C} value={form.estado||"Borrador"} onChange={v=>sf("estado",v)} opts={ESTADOS}/></Fld>
      <Fld C={C} label="Línea"><Sel C={C} value={form.linea||"ASSUR Home"} onChange={v=>sf("linea",v)} opts={LINEAS}/></Fld>
      <Fld C={C} label="Categoría"><Sel C={C} value={form.categoria||"Alarma"} onChange={v=>sf("categoria",v)} opts={CATEGORIAS}/></Fld>
      <Fld C={C} label="Precio instalación"><Inp C={C} type="number" value={form.precioInstalacionNeto||""} onChange={v=>sf("precioInstalacionNeto",+v||0)}/></Fld>
      <Fld C={C} label="Moneda precio"><Sel C={C} value={form.monedaPrecio||"CLP"} onChange={v=>sf("monedaPrecio",v)} opts={MONEDAS}/></Fld>
      <Fld C={C} label="Valor mensual"><Inp C={C} type="number" value={form.valorMensual||""} onChange={v=>sf("valorMensual",+v||0)}/></Fld>
      <Fld C={C} label="Moneda mensual"><Sel C={C} value={form.monedaMensual||"UF"} onChange={v=>sf("monedaMensual",v)} opts={MONEDAS}/></Fld>
      <Fld C={C} label="Duración contrato (meses)"><Inp C={C} type="number" value={form.duracionContratoMeses||""} onChange={v=>sf("duracionContratoMeses",+v||0)}/></Fld>
      <Fld C={C} label="Costo estimado interno"><Inp C={C} type="number" value={form.costoEstimado||""} onChange={v=>sf("costoEstimado",+v||0)}/></Fld>
      <Fld C={C} label="Requiere aprobación"><Sel C={C} value={form.requiereAprobacion?"si":"no"} onChange={v=>sf("requiereAprobacion",v==="si")} opts={[{value:"si",label:"Sí"},{value:"no",label:"No"}]}/></Fld>
      <Fld C={C} label="Vigencia desde"><Inp C={C} type="date" value={form.vigenciaDesde||""} onChange={v=>sf("vigenciaDesde",v)}/></Fld>
      <Fld C={C} label="Vigencia hasta"><Inp C={C} type="date" value={form.vigenciaHasta||""} onChange={v=>sf("vigenciaHasta",v)}/></Fld>
    </G>
    <Fld C={C} label="Descripción comercial"><textarea value={form.descripcionComercial||""} onChange={e=>sf("descripcionComercial",e.target.value)} rows={3} style={{width:"100%",background:C.bg0,border:"1px solid "+C.border,borderRadius:6,padding:10,color:C.text,fontFamily:ff}}/></Fld>
    <Card C={C} style={{padding:14,marginBottom:12}}>
      <STitle C={C}>Materiales incluidos</STitle>
      <div style={{display:"flex",gap:8,alignItems:"end",marginBottom:10}}>
        <div style={{flex:1}}><SelBusca C={C} value={matId} onChange={setMatId} opts={[{value:"",label:"— Seleccionar material —"},...materiales.map(m=>({value:m.id,label:`${m.nombre} · ${fmtCLP(m.precioUnitario||0)}/${m.unidad||"u"}`}))]}/></div>
        <Btn C={C} ghost onClick={addMaterial} disabled={!matId}>Agregar</Btn>
      </div>
      {(form.materialesIncluidos||[]).length===0?<div style={{fontSize:12,color:C.textM,fontFamily:ff}}>Sin materiales asociados.</div>:(form.materialesIncluidos||[]).map((m,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 80px 70px 34px",gap:8,alignItems:"center",padding:"7px 0",borderTop:"1px solid "+C.border}}>
        <div style={{fontSize:12,fontWeight:800,color:C.text,fontFamily:ff}}>{m.nombre}</div>
        <Inp C={C} type="number" value={m.cantidad||""} onChange={v=>{const arr=[...(form.materialesIncluidos||[])];arr[i]={...arr[i],cantidad:+v||0};sf("materialesIncluidos",arr);}}/>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff}}>{m.unidad||"u"}</div>
        <Btn C={C} ghost small color={C.red} onClick={()=>removeMaterial(i)}>×</Btn>
      </div>)}
    </Card>
    <Fld C={C} label="Condiciones"><textarea value={form.condiciones||""} onChange={e=>sf("condiciones",e.target.value)} rows={2} style={{width:"100%",background:C.bg0,border:"1px solid "+C.border,borderRadius:6,padding:10,color:C.text,fontFamily:ff}}/></Fld>
    <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
      <Btn C={C} ghost onClick={onClose}>Cancelar</Btn>
      <Btn C={C} onClick={()=>onSave({...form,updatedAt:new Date().toISOString()})} disabled={!form.nombre?.trim()}>Guardar paquete</Btn>
    </div>
  </Modal>;
}

export default function PaquetesComercialesView({C,paquetes,materiales,clientes,instalaciones,params,onSave,onDelete,onCreateQuickQuote,readonly=false,mode="catalog"}){
  const [modal,setModal]=useState(null);
  const [quote,setQuote]=useState({paqueteId:"",clienteId:"",instalacionId:""});
  const activos=useMemo(()=>paquetes.filter(p=>p.estado==="Activo"),[paquetes]);
  const lista=mode==="quick"?activos:paquetes;
  const selected=paquetes.find(p=>p.id===quote.paqueteId);
  const instCli=instalaciones.filter(i=>i.clienteId===quote.clienteId);
  const savePackage=p=>onSave({...p,id:p.id||Date.now().toString(36)+Math.random().toString(36).slice(2,6),createdAt:p.createdAt||new Date().toISOString()});
  const createQuote=()=>{
    if(!selected||!quote.clienteId)return;
    onCreateQuickQuote?.({paquete:selected,clienteId:quote.clienteId,instalacionId:quote.instalacionId});
  };
  return <div>
    <ModuleHero
      C={C}
      eyebrow={mode==="quick"?"Venta paquetizada":"Catálogo operacional"}
      title={mode==="quick"?"Cotización rápida por paquete":"Paquetes comerciales"}
      subtitle={mode==="quick"?"Elige cliente, instalación y paquete activo. El vendedor usa una oferta aprobada sin entrar al costeo interno.":"Paquetes aprobados para ventas de volumen, con precio, materiales y servicio recurrente precargados."}
      actions={!readonly&&mode!=="quick"&&<Btn C={C} onClick={()=>setModal(newPackage())}>Nuevo paquete</Btn>}
    >
      {mode==="quick"
        ?<WorkflowSteps C={C} active={selected?2:quote.clienteId?1:0} steps={["Cliente","Paquete activo","Cotización lista"]}/>
        :<QuickActions C={C} items={[
          {label:`${activos.length} activos`,description:"Disponibles para comercial",tone:activos.length?C.green:C.amber},
          {label:`${paquetes.filter(p=>p.requiereAprobacion).length} con aprobación`,description:"Revisar margen o excepciones",tone:C.amber},
          {label:"Costos internos",description:"Solo operaciones/gerencia",tone:C.orange||C.blue},
        ]}/>}
    </ModuleHero>

    {mode==="quick"&&<Card C={C} style={{marginBottom:16}}>
      <STitle C={C}>Generar cotización rápida</STitle>
      <div style={{fontSize:12,color:C.textM,fontFamily:ff,lineHeight:1.45,marginBottom:12}}>Este flujo es para ventas por volumen: no edita materiales ni costos, solo usa paquetes aprobados.</div>
      <G cols={3}>
        <Fld C={C} label="Cliente"><SelBusca C={C} value={quote.clienteId} onChange={v=>setQuote(q=>({...q,clienteId:v,instalacionId:""}))} opts={[{value:"",label:"— Seleccionar —"},...clientes.map(c=>({value:c.id,label:c.razonSocial||c.nombreComercial||"Cliente"}))]}/></Fld>
        <Fld C={C} label="Instalación"><Sel C={C} value={quote.instalacionId} onChange={v=>setQuote(q=>({...q,instalacionId:v}))} opts={[{value:"",label:"— Sin instalación —"},...instCli.map(i=>({value:i.id,label:i.nombre||i.direccion||"Instalación"}))]}/></Fld>
        <Fld C={C} label="Paquete"><SelBusca C={C} value={quote.paqueteId} onChange={v=>setQuote(q=>({...q,paqueteId:v}))} opts={[{value:"",label:"— Seleccionar paquete activo —"},...activos.map(p=>({value:p.id,label:p.nombre}))]}/></Fld>
      </G>
      {selected&&<div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:10,marginTop:10}}>
        <Mini C={C} label="Instalación" value={selected.monedaPrecio==="UF"?`${selected.precioInstalacionNeto} UF`:fmtCLP(selected.precioInstalacionNeto)} color={C.blue}/>
        <Mini C={C} label="Mensual" value={selected.monedaMensual==="UF"?`${selected.valorMensual} UF`:fmtCLP(selected.valorMensual)} color={C.green}/>
        <Mini C={C} label="Margen estimado" value={`${margin(selected,params)}%`} color={margin(selected,params)>20?C.green:C.amber}/>
        <Mini C={C} label="Aprobación" value={selected.requiereAprobacion?"Requiere":"No requiere"} color={selected.requiereAprobacion?C.amber:C.green}/>
      </div>}
      <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
        <Btn C={C} onClick={createQuote} disabled={!selected||!quote.clienteId}>Crear cotización rápida</Btn>
      </div>
    </Card>}

    {lista.length===0?<EmptyState C={C} icon="▦" title={mode==="quick"?"Sin paquetes activos":"Sin paquetes comerciales"} sub="Crea paquetes desde Cotizaciones y Propuestas para acelerar ventas repetibles." action={!readonly&&mode!=="quick"&&<Btn C={C} onClick={()=>setModal(newPackage())}>+ Crear paquete</Btn>}/>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:12}}>
      {lista.map(pkg=><Card C={C} key={pkg.id} style={{padding:16}}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}>
          <div>
            <div style={{fontSize:15,fontWeight:900,color:C.text,fontFamily:ff}}>{pkg.nombre}</div>
            <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:4}}>{pkg.linea} · {pkg.categoria}</div>
          </div>
          <Bdg color={pkg.estado==="Activo"?C.green:pkg.estado==="Pausado"?C.amber:pkg.estado==="Descontinuado"?C.red:C.textM} small>{pkg.estado}</Bdg>
        </div>
        <div style={{fontSize:12,color:C.textS,fontFamily:ff,lineHeight:1.45,margin:"12px 0",minHeight:34}}>{pkg.descripcionComercial||"Sin descripción comercial."}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <Mini C={C} label="Instalación" value={pkg.monedaPrecio==="UF"?`${pkg.precioInstalacionNeto||0} UF`:fmtCLP(pkg.precioInstalacionNeto||0)} color={C.blue}/>
          <Mini C={C} label="MRR" value={pkg.monedaMensual==="UF"?`${pkg.valorMensual||0} UF`:fmtCLP(pkg.valorMensual||0)} color={C.green}/>
        </div>
        <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:10}}>{(pkg.materialesIncluidos||[]).length} materiales · margen est. {margin(pkg,params)}%</div>
        {mode!=="quick"&&!readonly&&<div style={{display:"flex",justifyContent:"flex-end",gap:6,marginTop:12}}>
          <Btn C={C} ghost small onClick={()=>setModal(pkg)}>Editar</Btn>
          <Btn C={C} ghost small color={C.red} onClick={()=>onDelete(pkg.id)}>Eliminar</Btn>
        </div>}
      </Card>)}
    </div>}
    {modal&&<PackageForm C={C} initial={modal} materiales={materiales} onClose={()=>setModal(null)} onSave={p=>{savePackage(p);setModal(null);}}/>}
  </div>;
}

function Mini({C,label,value,color}){
  return <div style={{background:C.bg2,border:"1px solid "+C.border,borderRadius:8,padding:"9px 10px"}}>
    <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.1em",fontWeight:900,color:C.textM,fontFamily:ff}}>{label}</div>
    <div style={{fontSize:15,fontWeight:900,color,fontFamily:ff,marginTop:4}}>{value}</div>
  </div>;
}

export function SolicitudesCotizacionView({C,oportunidades,clientes,instalaciones,propuestas,onSaveOportunidad,onCrearPropuesta,readonly=false}){
  const solicitudes=oportunidades.filter(o=>o.requiereCotizacion||["Solicitud de cotización","En cotización","Propuesta lista"].includes(o.etapa));
  const update=(opo,patch)=>onSaveOportunidad({...opo,...patch,updatedAt:new Date().toISOString(),historial:[...(opo.historial||[]),{fecha:new Date().toISOString(),accion:patch.etapa?`Etapa: ${patch.etapa}`:"Solicitud actualizada"}]});
  return <div>
    <ModuleHero
      C={C}
      eyebrow="Operación comercial"
      title="Pedir cotización"
      subtitle="Bandeja puente entre Comercial y Operaciones. Comercial envía la necesidad; operaciones toma, costea y prepara la propuesta."
    >
      <WorkflowSteps C={C} active={1} steps={["Contacto","Solicitud","Costeo operaciones","Propuesta cliente"]}/>
      <div style={{marginTop:12}}>
        <QuickActions C={C} items={[
          {label:`${solicitudes.filter(o=>!o.etapa||o.etapa==="Solicitud de cotización").length} nuevas`,description:"Requieren toma de operaciones",tone:C.amber},
          {label:`${solicitudes.filter(o=>o.etapa==="En cotización").length} en preparación`,description:"Costeo en curso",tone:C.orange||C.blue},
          {label:`${solicitudes.filter(o=>o.etapa==="Propuesta lista").length} listas`,description:"Comercial puede hacer seguimiento",tone:C.green},
        ]}/>
      </div>
    </ModuleHero>
    {solicitudes.length===0?<EmptyState C={C} icon="□" title="Sin solicitudes" sub="Cuando Comercial marque una oportunidad como solicitud de cotización aparecerá aquí."/>:<div style={{display:"grid",gap:10}}>
      {solicitudes.map(o=>{
        const cl=clientes.find(c=>c.id===o.clienteId);
        const inst=instalaciones.find(i=>i.id===o.instalacionId);
        const prop=propuestas.find(p=>p.id===o.propuestaId);
        return <Card C={C} key={o.id} style={{padding:14}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
            <div>
              <div style={{fontSize:15,fontWeight:900,color:C.text,fontFamily:ff}}>{o.titulo||cl?.razonSocial||"Solicitud sin título"}</div>
              <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:4}}>{cl?.razonSocial||"Sin cliente"}{inst?` · ${inst.nombre||inst.direccion}`:""} · {o.ejecutivo||"Sin ejecutivo"}</div>
            </div>
            <Bdg color={o.etapa==="Propuesta lista"?C.green:o.etapa==="En cotización"?C.amber:C.blue} small style={{maxWidth:132,overflow:"hidden",textOverflow:"ellipsis"}}>{o.etapa||"Solicitud"}</Bdg>
          </div>
          <div style={{fontSize:12,color:C.textS,fontFamily:ff,lineHeight:1.45,marginTop:10}}>{o.notas||"Sin notas de levantamiento."}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8,marginTop:12}}>
            <Mini C={C} label="Prioridad" value={o.prioridad||"Normal"} color={o.prioridad==="Alta"||o.prioridad==="Crítica"?C.red:C.amber}/>
            <Mini C={C} label="Presupuesto" value={o.valorEstimado?fmtCLP(o.valorEstimado):"No informado"} color={C.green}/>
            <Mini C={C} label="Próxima acción" value={o.proximaAccion||"Tomar solicitud"} color={C.orange||C.blue}/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:12,flexWrap:"wrap"}}>
            {!readonly&&<Btn C={C} ghost small onClick={()=>update(o,{requiereCotizacion:true,etapa:"En cotización"})}>Tomar cotización</Btn>}
            {!readonly&&<Btn C={C} ghost small color={C.green} onClick={()=>onCrearPropuesta(o)}>Crear propuesta</Btn>}
            {prop&&<Btn C={C} ghost small onClick={()=>update(o,{etapa:"Propuesta lista"})}>Marcar lista</Btn>}
          </div>
        </Card>;
      })}
    </div>}
  </div>;
}
