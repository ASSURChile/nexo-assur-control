export const TAB_GROUPS=[
  {id:"inicio",label:"Inicio",tabs:[
    {id:"dashboard",label:"Panel diario"},
  ]},
  {id:"comercial",label:"Comercial",tabs:[
    {id:"comercial_dashboard",label:"Mesa comercial"},
    {id:"clientes",label:"Contactos"},
    {id:"pipeline",label:"Pipeline"},
    {id:"solicitudes_cotizacion",label:"Pedir cotización"},
    {id:"cotizacion_rapida",label:"Cotización rápida"},
  ]},
  {id:"cotizaciones_propuestas",label:"Cotizaciones y Propuestas",tabs:[
    {id:"bandeja_cotizaciones",label:"Cotizaciones por preparar"},
    {id:"cotizaciones",label:"Costeo y cotización"},
    {id:"paquetes",label:"Paquetes comerciales"},
    {id:"propuestas",label:"Propuestas al cliente"},
    {id:"instalaciones",label:"Instalaciones"},
  ]},
  {id:"operaciones",label:"Operaciones",tabs:[
    {id:"proyectos",label:"Proyectos"},
    {id:"aprobaciones",label:"Aprobaciones"},
    {id:"personal",label:"Recursos"},
    {id:"materiales",label:"Materiales"},
    {id:"almacen",label:"Stock / almacén"},
    {id:"supervisor",label:"Supervisor"},
    {id:"incidencias",label:"Incidencias"},
  ]},
  {id:"monitoreo",label:"Monitoreo",tabs:[
    {id:"servicios",label:"Servicios recurrentes"},
  ]},
  {id:"finanzas",label:"Finanzas",tabs:[
    {id:"finanzas",label:"Costos operativos"},
    {id:"hitos",label:"Facturación y cobranza"},
    {id:"analisis",label:"Rentabilidad"},
  ]},
  {id:"sistema",label:"Sistema",tabs:[
    {id:"config",label:"Salud del sistema"},
  ]},
];

export const MODULOS = [
  {id:"dashboard",label:"Panel diario"},
  {id:"comercial_dashboard",label:"Mesa comercial"},
  {id:"clientes",label:"Contactos"},
  {id:"pipeline",label:"Pipeline"},
  {id:"solicitudes_cotizacion",label:"Pedir cotización"},
  {id:"cotizacion_rapida",label:"Cotización rápida"},
  {id:"bandeja_cotizaciones",label:"Cotizaciones por preparar"},
  {id:"cotizaciones",label:"Costeo y cotización"},
  {id:"paquetes",label:"Paquetes comerciales"},
  {id:"propuestas",label:"Propuestas al cliente"},
  {id:"instalaciones",label:"Instalaciones"},
  {id:"proyectos",label:"Proyectos"},
  {id:"aprobaciones",label:"Aprobaciones"},
  {id:"personal",label:"Recursos"},
  {id:"materiales",label:"Materiales"},
  {id:"almacen",label:"Stock / almacén"},
  {id:"supervisor",label:"Supervisor"},
  {id:"incidencias",label:"Incidencias"},
  {id:"servicios",label:"Servicios recurrentes"},
  {id:"finanzas",label:"Costos operativos"},
  {id:"hitos",label:"Facturación y cobranza"},
  {id:"analisis",label:"Rentabilidad"},
  {id:"assistant",label:"Asistente NEXO"},
  {id:"config",label:"Salud del sistema"},
];

const view=()=>({ver:true});
const edit=()=>({ver:true,crear:true,editar:true});
const ops=()=>({ver:true,crear:true,editar:true,convertir:true,gestionar_costos:true,gestionar_materiales:true});
const approve=()=>({ver:true,crear:true,editar:true,aprobar:true,convertir:true,gestionar_costos:true,gestionar_materiales:true});
const no=false;

export const PERMISOS_DEF = {
  gerente_general: Object.fromEntries(MODULOS.map((m)=>[m.id,{ver:true,crear:true,editar:true,eliminar:true,aprobar:true,convertir:true,exportar:true,gestionar_costos:true,gestionar_materiales:true}])),
  gerente_operaciones_admin: {
    dashboard:view(), comercial_dashboard:view(), clientes:{...edit(),exportar:true}, pipeline:view(), solicitudes_cotizacion:view(), cotizacion_rapida:{ver:true,crear:true},
    bandeja_cotizaciones:view(), cotizaciones:view(), paquetes:view(), propuestas:view(), instalaciones:view(), proyectos:view(), aprobaciones:{ver:true,aprobar:true},
    personal:view(), materiales:view(), almacen:view(), supervisor:view(), incidencias:view(), servicios:view(),
    finanzas:{ver:true,exportar:true}, hitos:{ver:true,exportar:true}, analisis:view(), assistant:view(), config:no,
  },
  gerencia: {
    dashboard:view(), comercial_dashboard:view(), clientes:view(), pipeline:view(), solicitudes_cotizacion:view(), cotizacion_rapida:{ver:true,crear:true},
    bandeja_cotizaciones:view(), cotizaciones:approve(), paquetes:approve(), propuestas:approve(), instalaciones:view(), proyectos:view(), aprobaciones:{ver:true,aprobar:true},
    personal:view(), materiales:view(), almacen:view(), supervisor:view(), incidencias:view(), servicios:{ver:true,aprobar:true}, finanzas:view(), hitos:view(), analisis:view(), assistant:view(), config:no,
  },
  comercial: {
    dashboard:view(), comercial_dashboard:view(), clientes:edit(), pipeline:edit(), solicitudes_cotizacion:edit(), cotizacion_rapida:{ver:true,crear:true},
    bandeja_cotizaciones:no, cotizaciones:no, paquetes:view(), propuestas:view(), instalaciones:edit(), proyectos:no, aprobaciones:no, personal:no, materiales:no, almacen:no,
    supervisor:no, incidencias:no, servicios:no, finanzas:no, hitos:no, analisis:no, assistant:view(), config:no,
  },
  jefe_comercial: {
    dashboard:view(), comercial_dashboard:view(), clientes:edit(), pipeline:edit(), solicitudes_cotizacion:edit(), cotizacion_rapida:{ver:true,crear:true},
    bandeja_cotizaciones:view(), cotizaciones:view(), paquetes:view(), propuestas:{ver:true,editar:true}, instalaciones:edit(), proyectos:no, aprobaciones:view(),
    personal:no, materiales:view(), almacen:no, supervisor:no, incidencias:no, servicios:view(), finanzas:no, hitos:no, analisis:view(), assistant:view(), config:no,
  },
  operaciones: {
    dashboard:view(), comercial_dashboard:no, clientes:edit(), pipeline:no, solicitudes_cotizacion:{ver:true,crear:true,editar:true}, cotizacion_rapida:no,
    bandeja_cotizaciones:edit(), cotizaciones:ops(), paquetes:ops(), propuestas:ops(), instalaciones:edit(), proyectos:ops(), aprobaciones:{ver:true,aprobar:true},
    personal:edit(), materiales:{...edit(),gestionar_materiales:true}, almacen:{...edit(),gestionar_materiales:true}, supervisor:edit(), incidencias:edit(), servicios:edit(),
    finanzas:no, hitos:no, analisis:no, assistant:view(), config:no,
  },
  administrativo_operaciones: {
    dashboard:view(), comercial_dashboard:no, clientes:view(), pipeline:no, solicitudes_cotizacion:no, cotizacion_rapida:no,
    bandeja_cotizaciones:{ver:true,editar:true}, cotizaciones:{ver:true,editar:true,gestionar_materiales:true}, paquetes:{ver:true,editar:true,gestionar_materiales:true},
    propuestas:view(), instalaciones:view(), proyectos:{ver:true,editar:true,gestionar_materiales:true}, aprobaciones:view(), personal:view(),
    materiales:{...edit(),gestionar_materiales:true}, almacen:{...edit(),gestionar_materiales:true}, supervisor:no, incidencias:edit(), servicios:view(), finanzas:no, hitos:no, analisis:no, assistant:view(), config:no,
  },
  supervisor: {
    dashboard:view(), comercial_dashboard:no, clientes:no, pipeline:no, solicitudes_cotizacion:no, cotizacion_rapida:no, bandeja_cotizaciones:no,
    cotizaciones:no, paquetes:no, propuestas:no, instalaciones:view(), proyectos:{ver:true,editar:true}, aprobaciones:{ver:true,aprobar:true}, personal:view(), materiales:view(),
    almacen:no, supervisor:edit(), incidencias:edit(), servicios:view(), finanzas:no, hitos:no, analisis:no, assistant:view(), config:no,
  },
  tecnico: {
    dashboard:no, comercial_dashboard:no, clientes:no, pipeline:no, solicitudes_cotizacion:no, cotizacion_rapida:no, bandeja_cotizaciones:no,
    cotizaciones:no, paquetes:no, propuestas:no, instalaciones:no, proyectos:no, aprobaciones:no, personal:no, materiales:no, almacen:no, supervisor:no, incidencias:no,
    servicios:no, finanzas:no, hitos:no, analisis:no, assistant:view(), config:no,
  },
  monitoreo: {
    dashboard:view(), comercial_dashboard:no, clientes:view(), pipeline:no, solicitudes_cotizacion:no, cotizacion_rapida:no, bandeja_cotizaciones:no,
    cotizaciones:no, paquetes:no, propuestas:no, instalaciones:view(), proyectos:view(), aprobaciones:no, personal:no, materiales:no, almacen:no, supervisor:no,
    incidencias:{ver:true,crear:true}, servicios:{ver:true,crear:true,editar:true,aprobar:true}, finanzas:no, hitos:no, analisis:no, assistant:view(), config:no,
  },
  finanzas: {
    dashboard:view(), comercial_dashboard:no, clientes:view(), pipeline:no, solicitudes_cotizacion:no, cotizacion_rapida:no, bandeja_cotizaciones:no,
    cotizaciones:no, paquetes:no, propuestas:view(), instalaciones:view(), proyectos:view(), aprobaciones:no, personal:no, materiales:no, almacen:no, supervisor:no,
    incidencias:no, servicios:view(), finanzas:{ver:true,crear:true,editar:true,eliminar:true,exportar:true}, hitos:{ver:true,crear:true,editar:true,exportar:true}, analisis:view(), assistant:view(), config:no,
  },
  almacen: {
    dashboard:view(), comercial_dashboard:no, clientes:no, pipeline:no, solicitudes_cotizacion:no, cotizacion_rapida:no, bandeja_cotizaciones:no,
    cotizaciones:no, paquetes:no, propuestas:no, instalaciones:no, proyectos:view(), aprobaciones:view(), personal:no, materiales:{...edit(),gestionar_materiales:true},
    almacen:{...edit(),gestionar_materiales:true}, supervisor:no, incidencias:no, servicios:no, finanzas:no, hitos:no, analisis:no, assistant:view(), config:no,
  },
  viewer: {
    dashboard:view(), comercial_dashboard:view(), clientes:view(), pipeline:view(), solicitudes_cotizacion:view(), cotizacion_rapida:no, bandeja_cotizaciones:view(),
    cotizaciones:view(), paquetes:view(), propuestas:view(), instalaciones:view(), proyectos:view(), aprobaciones:view(), personal:view(), materiales:view(), almacen:view(),
    supervisor:view(), incidencias:view(), servicios:view(), finanzas:view(), hitos:view(), analisis:view(), assistant:view(), config:no,
  },
};

export const EST_OP  = ["Pendiente","En ejecución","Ejecutado","Cerrado técnico"];
export const EST_FIN = ["Pendiente facturación","Facturado","Cobrado parcial","Cobrado","Vencido"];
export const COL_OP  = {"Pendiente":"#64748B","En ejecución":"#3B82F6","Ejecutado":"#10B981","Cerrado técnico":"#8B5CF6"};
export const COL_FIN = {"Pendiente facturación":"#F59E0B","Facturado":"#3B82F6","Cobrado parcial":"#06B6D4","Cobrado":"#10B981","Vencido":"#EF4444"};

export const CHECKLIST_CIERRE_DEF=[
  "Equipos instalados y energizados",
  "Cámaras/alarmas visibles en plataforma",
  "Pruebas funcionales realizadas",
  "Evidencia fotográfica cargada",
  "Cliente informado y capacitado",
  "Área de trabajo limpia y entregada"
];
