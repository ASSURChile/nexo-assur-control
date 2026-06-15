export const DARK  = { bg0:"#121D2B",bg1:"#1A2636",bg2:"#233247",bg3:"#2D3D52",header:"#101927",blue:"#83C9EE",blueD:"#23739D",orange:"#E17327",orangeD:"#C55A1B",text:"#EAF1F8",textS:"#C5D3E0",textM:"#93A4B8",border:"#2D3B4F",borderL:"#45576C",green:"#5BD38E",amber:"#E6B84E",red:"#F07972",purple:"#AE8CE8" };
export const LIGHT = { bg0:"#F4F7FB",bg1:"#FFFFFF",bg2:"#F8FAFC",bg3:"#EEF3F7",header:"#101C2B",blue:"#1B5F86",blueD:"#144967",orange:"#E17327",orangeD:"#C55A1B",text:"#172436",textS:"#334155",textM:"#64748B",border:"#DBE5EE",borderL:"#C8D7E6",green:"#1F8A55",amber:"#B58112",red:"#C9473C",purple:"#6F56B4" };
export const ff = "'Inter', system-ui, sans-serif";

export const ESTADOS = ["Borrador","En revisión","Enviada","Aprobada","Rechazada","Vencida"];
export const ESTADOS_C = ["Activo","Inactivo","Prospecto"];
export const ESTADOS_I = ["Activa","Inactiva"];
export const TIPOS_V = ["Proyecto + Monitoreo","Solo proyecto","Solo monitoreo"];
export const RUBROS = ["Agroindustria","Retail","Minería","Salud","Educación","Logística","Manufactura","Construcción","Industria","Gobierno","Tecnología","Otro"];
export const REGIONES = ["Arica y Parinacota","Tarapacá","Antofagasta","Atacama","Coquimbo","Valparaíso","Metropolitana","O'Higgins","Maule","Ñuble","Biobío","La Araucanía","Los Ríos","Los Lagos","Aysén","Magallanes"];
export const EJEC_DEF = ["Sin asignar"];
export const CATS_DEF = ["CCTV","Monitoreo CCTV","Video verificación","Alarmas","Monitoreo alarmas","Control de acceso","Portería remota","Voceo disuasivo","Integración de sistemas","Infraestructura / redes","Servicio técnico","Proyecto mixto"];
export const COL_E = {"Borrador":"#64748B","En revisión":"#F59E0B","Enviada":"#3B82F6","Aprobada":"#10B981","Rechazada":"#EF4444","Vencida":"#94A3B8"};

export const TIPOS_PROYECTO_DEF = [
  { id:"cctv",      nombre:"CCTV / Videovigilancia",    activo:true },
  { id:"recab",     nombre:"Recableado / Mantención",    activo:true },
  { id:"alarmas",   nombre:"Alarmas / Intrusos",         activo:true },
  { id:"acceso",    nombre:"Control de acceso",          activo:true },
  { id:"incendio",  nombre:"Detección de incendios",     activo:true },
  { id:"autom",     nombre:"Automatización",             activo:true },
  { id:"redes",     nombre:"Redes / Infraestructura",    activo:true },
  { id:"servtec",   nombre:"Servicio técnico a terreno", activo:true },
  { id:"mixto",     nombre:"Proyecto mixto",             activo:true },
];

export const SERVICIOS_REC_DEF = [
  { id:"mon_cam",  nombre:"Monitoreo de cámaras",    ufUnitario:0.95, unidad:"cámara",  activo:true },
  { id:"mon_alm",  nombre:"Monitoreo de alarmas",    ufUnitario:0.80, unidad:"panel",   activo:true },
  { id:"vid_ver",  nombre:"Video verificación",      ufUnitario:1.10, unidad:"cuenta",  activo:true },
  { id:"gps",      nombre:"Software monitoreo GPS",  ufUnitario:0,    unidad:"equipo",  activo:false },
  { id:"rondas",   nombre:"Control de rondas",       ufUnitario:0,    unidad:"punto",   activo:false },
];

export const ESTADOS_COT = ["Borrador","En curso","Validada","Cerrada","Anulada"];
export const ESTADOS_PROP = ["Borrador","En revisión","Enviada","Aprobada","Rechazada","Vencida"];

export const ROLES_TEC_DEF = [
  { id:"tec_senior",  nombre:"Técnico Senior",  costoHora:7500, activo:true },
  { id:"tec_normal",  nombre:"Técnico",          costoHora:5700, activo:true },
  { id:"tec_junior",  nombre:"Técnico Junior",   costoHora:4500, activo:true },
  { id:"ayudante",    nombre:"Ayudante",         costoHora:3800, activo:true },
  { id:"supervisor",  nombre:"Supervisor",       costoHora:9500, activo:true },
];

export const TIPOS_HORA_DEF = [
  { id:"normal",    nombre:"Hora normal",       recargo:0,   activo:true },
  { id:"extra50",   nombre:"Hora extra (50%)",  recargo:50,  activo:true },
  { id:"nocturna",  nombre:"Hora nocturna",     recargo:30,  activo:true },
  { id:"festiva",   nombre:"Domingo / festivo", recargo:100, activo:true },
  { id:"viaje",     nombre:"Hora de viaje",     recargo:0,   activo:true },
  { id:"garantia",  nombre:"Hora de garantía",  recargo:0,   activo:true },
];

export const DEF = {
  ufValue:39900,
  ufCamara:0.95,
  ufVideoVerif:1.10,
  ufAlarma:3.50,
  duracionContrato:24,
  cotPrefijo:"COT",
  propPrefijo:"PRO",
  pctGG:4,
  pctImp:0,
  pctMargenMinimo:15,
  tiposProyecto: TIPOS_PROYECTO_DEF,
  serviciosRecurrentes: SERVICIOS_REC_DEF,
  jornadaSemanalHoras: 42,
  diasLaborales: 5,
  horasDiariasNormales: 8.4,
  rolesTecnicos: ROLES_TEC_DEF,
  tiposHora: TIPOS_HORA_DEF,
  horasViajeIncluidas: true,
  precioBencina: 1350,
  rendimientoVehiculo: 10,
  pagoLeasingMensual: 450000,
  kmMensualesPromedio: 3000,
  peajeReferencial: 16000,
  encomiendaReferencial: 3500,
  desayuno: 5000,
  almuerzo: 10000,
  cena: 10000,
  hospedajeNoche: 40000,
  bonoNocheFuera: 20000,
  bonoKilometraje: 0,
  bonoHorasTraslado: 0,
  bonoTratoEspecial: 0,
  margenInstalacion: 25,
  margenMantencion: 20,
  margenVisita: 30,
  margenEmergencia: 40,
  margenGarantia: 0,
  margenSoporte: 25,
};
