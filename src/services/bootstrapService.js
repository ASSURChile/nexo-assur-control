import { dataService } from "./dataService.js";
import { repositories as repo, repositoryForKey } from "./repositories.js";
import { PERMISOS_DEF } from "../config/navigation.js";
import { CATS_DEF, DEF, EJEC_DEF, SERVICIOS_REC_DEF, TIPOS_PROYECTO_DEF } from "../config/appConstants.js";
import { buildBillingExpectationsForService } from "../domain/recurringServices.js";
import { normalizeRole } from "../domain/roles.js";
import { DEMO_AUTH_ENABLED } from "./authService.js";

const todayISO=()=>new Date().toISOString().slice(0,10);

const DEFAULT_USERS = [
  {nombre:"Gerente General",email:"gerente@assur.cl",password:"ger123",rol:"gerente_general",area:"Gerencia",cargo:"Gerente General"},
  {nombre:"Gerente Operaciones y Administración",email:"gerops@assur.cl",password:"gerops123",rol:"gerente_operaciones_admin",area:"Gerencia",cargo:"Gerente Operaciones y Administración"},
  {nombre:"Administrador Sistema",email:"admin@assur.cl",password:"admin123",rol:"admin",area:"Sistema",cargo:"Administrador"},
  {nombre:"Jefe Comercial",email:"jefecomercial@assur.cl",password:"jefe123",rol:"jefe_comercial",area:"Comercial",cargo:"Jefe Comercial"},
  {nombre:"Vendedor Demo",email:"vendedor@assur.cl",password:"vend123",rol:"comercial",area:"Comercial",cargo:"Ejecutivo comercial"},
  {nombre:"Jefe Operaciones",email:"oper@assur.cl",password:"oper123",rol:"operaciones"},
  {nombre:"Administrativo Operaciones",email:"adminops@assur.cl",password:"ops123",rol:"administrativo_operaciones",area:"Operaciones",cargo:"Administrativo de operaciones"},
  {nombre:"Finanzas",email:"finanzas@assur.cl",password:"fin123",rol:"finanzas",area:"Finanzas",cargo:"Administración y finanzas"},
  {nombre:"Monitoreo",email:"monitoreo@assur.cl",password:"mon123",rol:"monitoreo",area:"Monitoreo",cargo:"Encargado monitoreo"},
  {nombre:"Supervisor Campo",email:"super@assur.cl",password:"super123",rol:"supervisor"},
  {nombre:"Juan Pérez (Técnico)",email:"tec@assur.cl",password:"tec123",rol:"tecnico"},
  {nombre:"Almacén Central",email:"almacen@assur.cl",password:"alm123",rol:"almacen"},
  {nombre:"Visualizador",email:"view@assur.cl",password:"view123",rol:"viewer"},
];

export function initDefaults(){
  const now=new Date().toISOString();
  const existingUsers=repo.usuarios.list();
  if(DEMO_AUTH_ENABLED){
    const usersByEmail=new Map(existingUsers.map(u=>[(u.email||"").toLowerCase(),u]));
    const defaultByEmail=new Map(DEFAULT_USERS.map(u=>[u.email.toLowerCase(),u]));
    const ensuredUsers=[
      ...existingUsers.map(u=>{
        const def=defaultByEmail.get((u.email||"").toLowerCase());
        return {...u,password:u.password||def?.password||"",rol:normalizeRole(u.rol||def?.rol),updatedAt:u.updatedAt||now};
      }),
      ...DEFAULT_USERS
        .filter(u=>!usersByEmail.has(u.email.toLowerCase()))
        .map(u=>({...u,id:dataService.id(),rol:normalizeRole(u.rol),createdAt:now,updatedAt:now})),
    ];
    repo.usuarios.replaceAll(ensuredUsers);
  }else if(existingUsers.some(u=>u.password)){
    repo.usuarios.replaceAll(existingUsers.map(({password,...u})=>({...u,rol:normalizeRole(u.rol),updatedAt:now})));
  }
  const currentPermisos=repo.permisos.get();
  const hasLegacyPermisos=Object.values(currentPermisos||{}).some(rolePerms=>Object.values(rolePerms||{}).some(value=>typeof value==="boolean"));
  if(!currentPermisos||hasLegacyPermisos)repo.permisos.set(PERMISOS_DEF);
  // Migración: si existe params pero faltan campos operativos, agregarlos
  const existingParams=repo.params.get();
  if(!existingParams)repo.params.set(DEF);
  else{
    const merged={...DEF,...existingParams};
    // Asegurar que los arrays de roles y tipos de hora existan (no se sobreescriben si ya estaban)
    if(!existingParams.rolesTecnicos)merged.rolesTecnicos=DEF.rolesTecnicos;
    if(!existingParams.tiposHora)merged.tiposHora=DEF.tiposHora;
    repo.params.set(merged);
  }
  if(!repo.categorias.list().length)repo.categorias.replaceAll(CATS_DEF);
  if(!repo.ejecutivos.list().length)repo.ejecutivos.replaceAll(EJEC_DEF);
  // Inicializar arrays operativos vacíos
  if(!repo.tecnicos.list(null))repo.tecnicos.replaceAll([]);
  if(!repo.contratistas.list(null))repo.contratistas.replaceAll([]);
  if(!repo.materiales.list(null))repo.materiales.replaceAll([]);
  if(!repo.horas.list(null))repo.horas.replaceAll([]);
  if(!repo.eventosServicio.list(null))repo.eventosServicio.replaceAll([]);
  if(!repo.cotizaciones.list(null))repo.cotizaciones.replaceAll([]);
  if(!repo.plantillasCot.list(null))repo.plantillasCot.replaceAll([]);
  if(!repo.paquetesComerciales.list(null))repo.paquetesComerciales.replaceAll([]);
  if(!repo.quickQuotes.list(null))repo.quickQuotes.replaceAll([]);
  if(!repo.serviciosRecurrentes.list(null))repo.serviciosRecurrentes.replaceAll([]);
  ensureSystemUserLinks();
  // Migrar params existentes con nuevos campos
  const pm=repo.params.get();
  if(pm){
    if(!pm.tiposProyecto)pm.tiposProyecto=TIPOS_PROYECTO_DEF;
    if(!pm.serviciosRecurrentes)pm.serviciosRecurrentes=SERVICIOS_REC_DEF;
    if(!pm.propPrefijo)pm.propPrefijo="PRO";
    if(pm.pctGG===10)pm.pctGG=4; // corregir default
    repo.params.set(pm);
  }
  const apiCfg=repo.apiConfig.get();
  if(apiCfg?.credenciales?.token){
    repo.apiConfig.set({...apiCfg,credenciales:{...apiCfg.credenciales,token:""}});
  }
  // ═══════ MIGRACIÓN SILENCIOSA DE PROPUESTAS LEGACY ═══════
  // Si una propuesta vieja no tiene campos nuevos, los completa desde los viejos
  // sin borrar los datos antiguos (compatibilidad total)
  const existingProps=repo.propuestas.list();
  let migradas=0;
  const props2=existingProps.map(p=>{
    if(p.baseProyectoNeto!==undefined&&p.tieneProyecto!==undefined)return p; // ya migrada
    const nueva={...p};
    if(p.baseProyectoNeto===undefined){
      nueva.baseProyectoNeto=p.valorFinal||p.valorProyecto||0;
    }
    if(p.tieneProyecto===undefined){
      nueva.tieneProyecto=(p.tipoVenta||"")!=="Solo monitoreo";
    }
    if(p.tieneRecurrente===undefined){
      nueva.tieneRecurrente=(p.tipoVenta||"")!=="Solo proyecto"&&((p.camaras||0)>0||(p.alarmas||0)>0||(p.videoVerif||0)>0);
    }
    if(p.baseRecMes===undefined&&pm){
      const uv=pm.ufValue||DEF.ufValue;
      const iC=(p.camaras||0)*(p.ufCamara>0?p.ufCamara:pm.ufCamara||DEF.ufCamara)*uv;
      const iA=(p.alarmas||0)*(p.ufAlarma>0?p.ufAlarma:pm.ufAlarma||DEF.ufAlarma)*uv;
      const iV=(p.videoVerif||0)*(p.ufVideoVerif>0?p.ufVideoVerif:pm.ufVideoVerif||DEF.ufVideoVerif)*uv;
      nueva.baseRecMes=Math.max(0,iC+iA+iV-(p.descuentoServicioMonto||0));
    }
    if(p.notas===undefined&&p.observaciones)nueva.notas=p.observaciones;
    if(p.condicionesPago===undefined)nueva.condicionesPago=[];
    migradas++;
    return nueva;
  });
  if(migradas>0)repo.propuestas.replaceAll(props2);
}

function ensureSystemUserLinks(){
  const now=new Date().toISOString();
  const users=repo.usuarios.list().map(u=>({...u,rol:normalizeRole(u.rol)}));
  let tecnicos=repo.tecnicos.list();
  const techUsers=users.filter(u=>u.rol==="tecnico");
  let changedUsers=false;
  let changedTecnicos=false;
  techUsers.forEach(user=>{
    let tec=tecnicos.find(t=>t.id===user.tecnicoId)||
      tecnicos.find(t=>(t.usuarioId||"")===user.id)||
      tecnicos.find(t=>user.email&&t.email&&(t.email||"").toLowerCase()===(user.email||"").toLowerCase())||
      tecnicos.find(t=>user.nombre&&t.nombre&&(t.nombre||"").toLowerCase()===(user.nombre||"").toLowerCase());
    if(!tec){
      tec={id:dataService.id(),usuarioId:user.id,nombre:user.nombre,email:user.email,rolId:"tec_normal",activo:true,createdAt:now,updatedAt:now};
      tecnicos=[...tecnicos,tec];
      changedTecnicos=true;
    }else if(tec.usuarioId!==user.id||!tec.email){
      tecnicos=tecnicos.map(t=>t.id===tec.id?{...t,usuarioId:user.id,email:t.email||user.email,updatedAt:now}:t);
      tec={...tec,usuarioId:user.id,email:tec.email||user.email};
      changedTecnicos=true;
    }
    if(user.tecnicoId!==tec.id){
      const idx=users.findIndex(u=>u.id===user.id);
      users[idx]={...users[idx],tecnicoId:tec.id,updatedAt:now};
      changedUsers=true;
    }
  });
  if(changedUsers||users.some((u,i)=>u.rol!==repo.usuarios.list()[i]?.rol))repo.usuarios.replaceAll(users);
  if(changedTecnicos)repo.tecnicos.replaceAll(tecnicos);
}

export function seedPatagoniaFreshDemo(){
  const now=new Date().toISOString();
  const today=todayISO();
  const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
  const clean=key=>{const entityRepo=repositoryForKey(key);entityRepo.replaceAll(entityRepo.list().filter(x=>!(x.id||"").startsWith("demo-patagonia-")&&x.rut!=="76.543.210-9"&&x.rutCliente!=="76.543.210-9"));};
  ["af_clientes","af_instalaciones","af_oportunidades","af_propuestas","af_proyectos","af_facturas","af_pagos","af_cuentas_pagar","af_horas","af_fichajes","af_incidencias","af_servicios_recurrentes","af_service_billing_expectations"].forEach(clean);

  const cliente={id:"demo-patagonia-cliente",razonSocial:"Patagonia Fresh SpA",nombreComercial:"Patagonia Fresh",rut:"76.543.210-9",rubro:"Agroindustria",ejecutivo:"Demo Comercial",contacto:"Carolina Molina",telefono:"+56 9 4321 9876",email:"operaciones@patagoniafresh.test",direccion:"Ruta 5 Sur km 209, Molina, Región del Maule",notas:"Cliente ficticio creado para validar KPIs comerciales, operativos y financieros.",estado:"Activo",centroCosto:"PF-MOLINA",origen:"manual",origenId:"demo",createdAt:now,updatedAt:now};
  const instalacion={id:"demo-patagonia-instalacion",clienteId:cliente.id,nombre:"Molina",direccion:"Planta Molina, Ruta 5 Sur km 209",comuna:"Molina",region:"Maule",responsable:"Luis Araya",telefono:"+56 9 8765 1234",observaciones:"Instalación ficticia para mejora tecnológica de seguridad.",estado:"Activa",geoLat:-35.116,geoLng:-71.282,geoRadioMetros:180,origen:"manual",origenId:"demo",createdAt:now,updatedAt:now};
  const oportunidad={id:"demo-patagonia-oportunidad",numero:"OP-2026-900",titulo:"Mejora tecnológica",clienteId:cliente.id,instalacionId:instalacion.id,ejecutivo:"Demo Comercial",etapa:"Negociación",probabilidad:75,valorEstimado:16500000,mrrEstimado:1370000,fechaContacto:addDays(-14),fechaCierreEsperado:addDays(21),origenLead:"Referido gerencia",notas:"Incluye monitoreo de 20 cámaras y 3 alarmas.",historial:[{fecha:now,accion:"Demo creada para validación"}],propuestaId:"demo-patagonia-propuesta",createdAt:now,updatedAt:now};
  const propuesta={id:"demo-patagonia-propuesta",numero:"COT-2026-900",nombre:"Mejora tecnológica",clienteId:cliente.id,instalacionId:instalacion.id,ejecutivo:"Demo Comercial",fecha:today,vigencia:addDays(30),estado:"Aprobada",cotizacionId:"",tipoVenta:"Proyecto + Monitoreo",categoria:"Seguridad electrónica",baseProyectoNeto:16500000,valorProyecto:16500000,valorFinal:16500000,descuento:0,baseRecMes:1370000,camaras:20,alarmas:3,videoVerificacion:0,duracionContrato:36,fechaInicio:addDays(10),condicionesPago:[{id:"demo-cond-1",nombre:"Anticipo",pct:40},{id:"demo-cond-2",nombre:"Contra entrega",pct:60}],notas:"Propuesta ficticia: 20 cámaras monitoreadas y 3 alarmas.",historial:[{fecha:now,estado:"Aprobada",nota:"Demo aprobada para generar proyecto"}],createdAt:now,updatedAt:now};
  const hitos=[
    {id:"demo-patagonia-hito-1",nombre:"Anticipo 40%",pct:40,monto:6600000,estado:"Cobrado",nroFactura:"F-DEMO-9001",facturaId:"demo-patagonia-factura-1",fechaFacturacion:addDays(-7),fechaCobro:addDays(-2)},
    {id:"demo-patagonia-hito-2",nombre:"Entrega equipos 30%",pct:30,monto:4950000,estado:"Facturado",nroFactura:"F-DEMO-9002",facturaId:"demo-patagonia-factura-2",fechaFacturacion:today},
    {id:"demo-patagonia-hito-3",nombre:"Cierre y puesta en marcha 30%",pct:30,monto:4950000,estado:"Pendiente"}
  ];
  const tareas=[
    {id:"demo-patagonia-tarea-1",nombre:"Levantamiento y replanteo técnico",descripcion:"Validar ubicación de cámaras, alarmas y red.",estado:"Completada",etapa:"Visita técnica",duracionEstimada:6,fechaTerminada:addDays(-5),orden:0},
    {id:"demo-patagonia-tarea-2",nombre:"Cableado estructurado planta Molina",descripcion:"Tendido de canalizaciones y puntos de red.",estado:"En ejecución",etapa:"Cableado estructurado",duracionEstimada:24,orden:1},
    {id:"demo-patagonia-tarea-3",nombre:"Montaje de 20 cámaras IP",descripcion:"Montaje, orientación y etiquetado.",estado:"Pendiente",etapa:"Montaje de equipos",duracionEstimada:18,orden:2},
    {id:"demo-patagonia-tarea-4",nombre:"Configuración de 3 alarmas",descripcion:"Configuración sensores, particiones y comunicación.",estado:"Pendiente",etapa:"Configuración",duracionEstimada:8,orden:3},
    {id:"demo-patagonia-tarea-5",nombre:"Pruebas, acta y entrega",descripcion:"Pruebas de monitoreo, capacitación y cierre.",estado:"Pendiente",etapa:"Entrega y cierre",duracionEstimada:6,orden:4}
  ];
  const costos=[
    {id:"demo-patagonia-costo-1",tipo:"Materiales",desc:"Cámaras, alarmas, NVR, cableado y accesorios",monto:7200000,total:7200000,origen:"manual",fecha:today},
    {id:"demo-patagonia-costo-2",tipo:"Mano de obra",desc:"Instalación técnica estimada",monto:2100000,total:2100000,origen:"manual",fecha:today},
    {id:"demo-patagonia-costo-3",tipo:"Traslados y viáticos",desc:"Equipo técnico Molina",monto:450000,total:450000,origen:"manual",fecha:today}
  ];
  const proyecto={id:"demo-patagonia-proyecto",codigo:"PRY-2026-900",numero:"PRY-2026-900",propuestaId:propuesta.id,nombre:"Mejora tecnológica",clienteId:cliente.id,instalacionId:instalacion.id,ejecutivo:"Demo Comercial",categoria:"Seguridad electrónica",centroCosto:"PF-MOLINA",subCentroCosto:"MOL-SEG",valorVendido:16500000,valorProyecto:16500000,valorFinal:16500000,costoEstimado:9850000,fechaAprobacion:today,fechaInicio:addDays(7),fechaTermino:addDays(45),fechaFacturacion:"",estadoOp:"En ejecución",estadoFin:"Cobrado parcial",nroFactura:"F-DEMO-9001",montoFacturado:11550000,hitosFacturacion:hitos,tareas,costos,solicitudesMaterial:[{id:"demo-patagonia-sol-1",tecnicoNombre:"Técnico Demo",estado:"pendiente",fecha:today,items:[{nombre:"Cable UTP Cat6 exterior",cantidad:600,unidad:"m"}]}],timeline:[{fecha:now,tipo:"demo",desc:"Proyecto demo Patagonia Fresh cargado"}],observaciones:"Proyecto ficticio para validar dashboard, pipeline, caja, CxC/CxP y rentabilidad.",createdAt:now,updatedAt:now};
  const facturas=[
    {id:"demo-patagonia-factura-1",folio:"F-DEMO-9001",origen:"manual",rutCliente:cliente.rut,fechaEmision:addDays(-7),fechaVencimiento:addDays(8),monto:6600000,montoPagado:6600000,saldo:0,estado:"Emitida",proyectoId:proyecto.id,hitoId:hitos[0].id,observaciones:"Anticipo 40%"},
    {id:"demo-patagonia-factura-2",folio:"F-DEMO-9002",origen:"manual",rutCliente:cliente.rut,fechaEmision:today,fechaVencimiento:addDays(30),monto:4950000,montoPagado:0,saldo:4950000,estado:"Emitida",proyectoId:proyecto.id,hitoId:hitos[1].id,observaciones:"Entrega equipos 30%"}
  ];
  const pagos=[{id:"demo-patagonia-pago-1",origen:"manual",fechaPago:addDays(-2),folioFactura:"F-DEMO-9001",monto:6600000,medio:"Transferencia",observaciones:"Pago ficticio anticipo Patagonia Fresh",createdAt:now}];
  const cxp=[
    {id:"demo-patagonia-cxp-1",origen:"softland",numeroDocumento:"OC-DEMO-701",proveedor:"Proveedor Cámaras Demo",rutProveedor:"77.111.222-3",fechaEmision:addDays(-3),vencimiento:addDays(20),monto:4200000,saldo:4200000,estado:"Pendiente",centroCosto:"PF-MOLINA"},
    {id:"demo-patagonia-cxp-2",origen:"manual",numeroDocumento:"OC-DEMO-702",proveedor:"Servicios Técnicos Demo",rutProveedor:"76.222.333-4",fechaEmision:today,vencimiento:addDays(45),monto:1350000,saldo:1350000,estado:"Pendiente",centroCosto:"PF-MOLINA"}
  ];
  const servicio={id:"demo-patagonia-servicio",codigo:"SRV-2026-900",clienteId:cliente.id,instalacionId:instalacion.id,proyectoId:proyecto.id,propuestaId:propuesta.id,tipoServicio:"Videoverificación",estado:"En activación",valorMensual:1370000,camaras:20,alarmas:3,videoVerificacion:0,periodicidad:"Mensual",fechaInicio:addDays(50),responsable:"Central de monitoreo",horario:"Lunes a domingo 20:00 a 08:00",instrucciones:"Validar eventos de intrusión, revisar cámaras críticas y escalar a contacto operativo ante evidencia real.",contactos:[{id:"demo-patagonia-contacto-1",nombre:"Luis Araya",telefono:"+56 9 8765 1234",email:"",rol:"Operativo"},{id:"demo-patagonia-contacto-2",nombre:"Carolina Molina",telefono:"+56 9 4321 9876",email:"operaciones@patagoniafresh.test",rol:"Administración"}],activos:[],origen:"assur",createdAt:now,updatedAt:now};
  const expectativas=buildBillingExpectationsForService({servicio:{...servicio,estado:"Activo"},months:3});
  const append=(key,rows)=>repositoryForKey(key).append(rows);
  append("af_clientes",[cliente]);append("af_instalaciones",[instalacion]);append("af_oportunidades",[oportunidad]);append("af_propuestas",[propuesta]);append("af_proyectos",[proyecto]);append("af_facturas",facturas);append("af_pagos",pagos);append("af_cuentas_pagar",cxp);append("af_servicios_recurrentes",[servicio]);append("af_service_billing_expectations",expectativas);
}
