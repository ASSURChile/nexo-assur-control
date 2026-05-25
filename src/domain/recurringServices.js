export const TIPOS_SERVICIO_OPERATIVO = ["Monitoreo cámaras","Monitoreo alarmas","Videoverificación","Soporte","Mantención","Otro"];
export const ESTADOS_SERVICIO = ["En activación","Activo","Suspendido","Baja","Con falla"];
export const PERIODOS_FACTURACION = ["Mensual","Trimestral","Semestral","Anual"];
export const COL_SERVICIO = {"En activación":"#F59E0B",Activo:"#10B981",Suspendido:"#EF4444",Baja:"#64748B","Con falla":"#D97706"};

export function servicioTieneProtocoloCompleto(servicio){
  const contactos=servicio?.contactos||[];
  const tieneContacto=contactos.some(c=>(c.nombre||"").trim()&&((c.telefono||"").trim()||(c.email||"").trim()));
  return Boolean(
    servicio?.clienteId&&
    servicio?.instalacionId&&
    servicio?.fechaInicio&&
    (servicio?.valorMensual||0)>0&&
    tieneContacto&&
    ((servicio?.horario||"").trim()||(servicio?.instrucciones||"").trim())
  );
}

export function inferirTipoServicio(propuesta){
  if((propuesta?.camaras||0)>0&&(propuesta?.alarmas||0)>0)return "Videoverificación";
  if((propuesta?.camaras||0)>0)return "Monitoreo cámaras";
  if((propuesta?.alarmas||0)>0)return "Monitoreo alarmas";
  return "Soporte";
}

export function buildServicioDesdeProyecto({proyecto,propuesta,clientes=[],instalaciones=[],mrr=0,id=()=>String(Date.now()),now=()=>new Date()}){
  const cliente=clientes.find(c=>c.id===proyecto.clienteId);
  const instalacion=instalaciones.find(i=>i.id===proyecto.instalacionId);
  const contactos=[];
  if(instalacion?.responsable||instalacion?.telefono){
    contactos.push({id:id(),nombre:instalacion.responsable||"Responsable instalación",telefono:instalacion.telefono||"",email:"",rol:"Operativo"});
  }
  if(cliente?.contacto||cliente?.telefono||cliente?.email){
    contactos.push({id:id(),nombre:cliente.contacto||"Contacto cliente",telefono:cliente.telefono||"",email:cliente.email||"",rol:"Cliente"});
  }
  const date=now();
  return{
    id:id(),
    codigo:"SRV-"+date.getFullYear()+"-"+String(Math.floor(Math.random()*900)+100),
    clienteId:proyecto.clienteId||"",
    instalacionId:proyecto.instalacionId||"",
    proyectoId:proyecto.id||"",
    propuestaId:propuesta?.id||proyecto.propuestaId||"",
    tipoServicio:inferirTipoServicio(propuesta),
    estado:"En activación",
    valorMensual:mrr||propuesta?.baseRecMes||0,
    camaras:propuesta?.camaras||0,
    alarmas:propuesta?.alarmas||0,
    videoVerificacion:propuesta?.videoVerif||0,
    periodicidad:"Mensual",
    fechaInicio:"",
    responsable:proyecto.ejecutivo||cliente?.ejecutivo||"",
    horario:"",
    instrucciones:"",
    contactos,
    activos:[],
    origen:"assur",
    createdAt:date.toISOString(),
    updatedAt:date.toISOString(),
  };
}

export function calcServiciosKpis(servicios=[]){
  const activos=servicios.filter(s=>s.estado==="Activo");
  const activacion=servicios.filter(s=>s.estado==="En activación");
  const suspendidos=servicios.filter(s=>s.estado==="Suspendido"||s.estado==="Con falla");
  const mrrActivo=activos.reduce((s,x)=>s+(x.valorMensual||0),0);
  const mrrActivacion=activacion.reduce((s,x)=>s+(x.valorMensual||0),0);
  const mrrSuspendido=suspendidos.reduce((s,x)=>s+(x.valorMensual||0),0);
  const incompletos=servicios.filter(s=>!servicioTieneProtocoloCompleto(s));
  return{activos,activacion,suspendidos,mrrActivo,mrrActivacion,mrrSuspendido,incompletos};
}

export function monthKey(date=new Date()){
  const d=date instanceof Date?date:new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
}

export function addMonths(date,months){
  const d=date instanceof Date?new Date(date):new Date(date);
  d.setMonth(d.getMonth()+months);
  return d;
}

export function buildBillingExpectationsForService({servicio,months=3,startDate=new Date()}){
  if(!servicio||servicio.estado!=="Activo"||!(servicio.valorMensual>0))return[];
  const start=servicio.fechaInicio?new Date(servicio.fechaInicio):new Date(startDate);
  const base=start>new Date(startDate)?start:new Date(startDate);
  return Array.from({length:months},(_,i)=>{
    const expectedMonth=monthKey(addMonths(base,i));
    return{
      id:`exp-${servicio.id}-${expectedMonth}`,
      servicioId:servicio.id,
      clienteId:servicio.clienteId||"",
      instalacionId:servicio.instalacionId||"",
      proyectoId:servicio.proyectoId||"",
      expectedMonth,
      expectedAmount:servicio.valorMensual||0,
      status:"Esperada",
      source:"assur",
      updatedAt:new Date().toISOString(),
    };
  });
}

function moneyOf(factura){
  return factura?.monto ?? factura?.montoTotal ?? 0;
}

function balanceOf(factura){
  return factura?.saldo ?? Math.max(0,(moneyOf(factura)||0)-(factura?.montoPagado||0));
}

function normalizeRut(rut=""){
  return String(rut).replace(/[.\-\s]/g,"").toLowerCase();
}

function monthOf(value){
  if(!value)return "";
  return String(value).slice(0,7);
}

function monthEndISO(value){
  const m=monthOf(value);
  if(!m)return "";
  const [year,month]=m.split("-").map(Number);
  return new Date(year,month,0).toISOString().slice(0,10);
}

export function reconcileBillingExpectations({expectations=[],facturas=[],servicios=[],clientes=[],hoy=new Date().toISOString().slice(0,10),tolerancePct=0.25}={}){
  const clienteRut=new Map(clientes.map(c=>[c.id,normalizeRut(c.rut||"")]));
  const servicioMap=new Map(servicios.map(s=>[s.id,s]));
  const validInvoices=facturas.filter(f=>f.estado!=="Anulada");
  const usedInvoices=new Set();
  const sorted=[...expectations].sort((a,b)=>String(a.expectedMonth||"").localeCompare(String(b.expectedMonth||"")));
  const rows=sorted.map(exp=>{
    const service=servicioMap.get(exp.servicioId);
    const expectedMonth=monthOf(exp.expectedMonth);
    const expectedAmount=exp.expectedAmount||0;
    const rut=normalizeRut(exp.rutCliente||clienteRut.get(exp.clienteId)||"");
    const minAmount=expectedAmount*Math.max(0,1-tolerancePct);
    const match=validInvoices.find(f=>{
      if(usedInvoices.has(f.id))return false;
      if(f.servicioId&&f.servicioId===exp.servicioId)return true;
      if(f.serviceId&&f.serviceId===exp.servicioId)return true;
      const sameClient=rut&&normalizeRut(f.rutCliente||"")===rut;
      const invoiceMonth=monthOf(f.fechaEmision||f.fechaVencimiento||f.vencimiento);
      const sameMonth=expectedMonth&&invoiceMonth===expectedMonth;
      const enoughAmount=expectedAmount<=0||moneyOf(f)>=minAmount;
      return sameClient&&sameMonth&&enoughAmount;
    });
    if(match?.id)usedInvoices.add(match.id);
    const paid=match?balanceOf(match)<=0:false;
    const overdue=!match&&monthEndISO(exp.expectedMonth)&&monthEndISO(exp.expectedMonth)<String(hoy).slice(0,10);
    return{
      ...exp,
      servicio:service,
      factura:match||null,
      reconciledStatus:match?(paid?"Pagada":"Facturada"):(overdue?"Vencida":"Esperada"),
      deltaAmount:match?moneyOf(match)-expectedAmount:null,
    };
  });
  const summary=rows.reduce((acc,row)=>{
    acc.total+=row.expectedAmount||0;
    if(row.reconciledStatus==="Pagada"){acc.pagadas+=1;acc.montoPagado+=row.expectedAmount||0;}
    else if(row.reconciledStatus==="Facturada"){acc.facturadas+=1;acc.montoFacturado+=row.expectedAmount||0;}
    else if(row.reconciledStatus==="Vencida"){acc.vencidas+=1;acc.montoVencido+=row.expectedAmount||0;}
    else{acc.esperadas+=1;acc.montoEsperado+=row.expectedAmount||0;}
    return acc;
  },{total:0,pagadas:0,facturadas:0,esperadas:0,vencidas:0,montoPagado:0,montoFacturado:0,montoEsperado:0,montoVencido:0});
  return{rows,summary,matchedInvoiceIds:[...usedInvoices]};
}
