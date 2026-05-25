import { ROLES_TEC_DEF, SERVICIOS_REC_DEF } from "../config/appConstants.js";
import { calcCostoKm } from "./operations.js";
import { dataService } from "../services/dataService.js";

const newId = () => dataService.id();

export const COL_COT = {
  Borrador: "#64748B",
  "En curso": "#3B82F6",
  Validada: "#10B981",
  Cerrada: "#10B981",
  Anulada: "#EF4444",
};

export function bCotizacion(params) {
  return {
    id: newId(),
    numero: "",
    estado: "Borrador",
    clienteId: "",
    instalacionId: "",
    tipoProyectoId: "",
    descripcion: "",
    fecha: new Date().toISOString().slice(0, 10),
    tieneProyecto: true,
    tieneRecurrente: false,
    nTecnicos: 2,
    horasDia: 9,
    diasTrabajo: 1,
    rolId: (params?.rolesTecnicos || ROLES_TEC_DEF)[1]?.id || "tec_normal",
    km: 0,
    nViajes: 1,
    nPeajes: 0,
    conEncomienda: false,
    nDesayunos: 0,
    nAlmuerzos: 1,
    nCenas: 0,
    nNoches: 0,
    usarBonoKm: false,
    usarBonoTraslado: false,
    usarBonoTrato: false,
    materiales: [],
    arriendo: 0,
    pctGG: params?.pctGG ?? 4,
    pctImp: params?.pctImp ?? 0,
    pctMargen: params?.margenInstalacion ?? 25,
    serviciosRec: [],
    duracionContrato: params?.duracionContrato || 24,
    tieneCondicionesPago: false,
    condicionesPago: [],
    createdAt: new Date().toISOString(),
  };
}

export function calcCotizacion(cot, params) {
  if (!cot || !params) return null;
  const costoKm = calcCostoKm(params);
  const roles = params.rolesTecnicos || ROLES_TEC_DEF;
  const rol = roles.find((r) => r.id === cot.rolId) || roles[1] || { costoHora: 0 };

  const totalHoras = (cot.nTecnicos || 0) * (cot.horasDia || 0) * (cot.diasTrabajo || 0);
  const costoMO = totalHoras * (rol.costoHora || 0);

  const costoKmTotal = (cot.km || 0) * costoKm.total * (cot.nTecnicos || 0) * (cot.nViajes || 1);
  const costoPeajes = (cot.nPeajes || 0) * (params.peajeReferencial || 0) * (cot.nViajes || 1) * 2;
  const costoEncomienda = cot.conEncomienda ? (params.encomiendaReferencial || 0) : 0;
  const totalTraslados = costoKmTotal + costoPeajes + costoEncomienda;

  const nd = cot.diasTrabajo || 0;
  const nt = cot.nTecnicos || 0;
  const nn = cot.nNoches || 0;
  const costoDesayunos = (cot.nDesayunos || 0) * nt * (params.desayuno || 0) * nd;
  const costoAlmuerzos = (cot.nAlmuerzos || 0) * nt * (params.almuerzo || 0) * nd;
  const costoCenas = (cot.nCenas || 0) * nt * (params.cena || 0) * nd;
  const costoHospedaje = nn * nt * (params.hospedajeNoche || 0);
  const totalViaticos = costoDesayunos + costoAlmuerzos + costoCenas + costoHospedaje;

  const costoBonoNoche = nn * nt * (params.bonoNocheFuera || 0);
  const costoBonoKm = cot.usarBonoKm ? (cot.km || 0) * nt * (params.bonoKilometraje || 0) : 0;
  const costoBonoTraslado = cot.usarBonoTraslado ? totalHoras * (params.bonoHorasTraslado || 0) : 0;
  const costoBonoTrato = cot.usarBonoTrato ? (params.bonoTratoEspecial || 0) : 0;
  const totalBonos = costoBonoNoche + costoBonoKm + costoBonoTraslado + costoBonoTrato;

  const totalMateriales = (cot.materiales || []).reduce((s, m) => s + (m.cant || 0) * (m.precio || 0), 0);
  const totalArriendo = cot.arriendo || 0;

  const totalGastos = costoMO + totalTraslados + totalViaticos + totalBonos + totalMateriales + totalArriendo;
  const pctGG = cot.pctGG ?? params.pctGG ?? 4;
  const pctImp = cot.pctImp ?? params.pctImp ?? 0;
  const pctMargen = cot.pctMargen ?? params.margenInstalacion ?? 25;
  const montoGG = Math.round(totalGastos * pctGG / 100);
  const montoImp = Math.round(totalGastos * pctImp / 100);
  const baseMargen = totalGastos + montoGG + montoImp;
  const montoMargen = Math.round(baseMargen * pctMargen / 100);
  const precioNeto = baseMargen + montoMargen;
  const precioIVA = Math.round(precioNeto * 1.19);
  const margenReal = precioNeto > 0 ? montoMargen / precioNeto : 0;

  const ufVal = params.ufValue || 39900;
  const totalUFMes = (cot.serviciosRec || []).reduce((s, sr) => {
    const svcDef = (params.serviciosRecurrentes || SERVICIOS_REC_DEF).find((x) => x.id === sr.svcId);
    const uf = sr.ufUnitario != null ? sr.ufUnitario : (svcDef?.ufUnitario || 0);
    return s + (sr.cantidad || 0) * uf;
  }, 0);
  const totalMesCLP = Math.round(totalUFMes * ufVal);
  const duracion = cot.duracionContrato || params.duracionContrato || 24;
  const totalContratoRec = totalMesCLP * duracion;

  return {
    costoMO,
    totalTraslados,
    totalViaticos,
    totalBonos,
    totalMateriales,
    totalArriendo,
    totalGastos,
    montoGG,
    montoImp,
    montoMargen,
    precioNeto,
    precioIVA,
    margenReal,
    pctGG,
    pctImp,
    pctMargen,
    totalHoras,
    rol,
    totalUFMes,
    totalMesCLP,
    duracion,
    totalContratoRec,
    costoKmTotal,
    costoPeajes,
    costoEncomienda,
    costoBonoNoche,
    costoBonoKm,
    costoBonoTraslado,
    costoBonoTrato,
  };
}

export function nextNroCot(cotizaciones, prefijo) {
  const yr = new Date().getFullYear();
  const maxN = cotizaciones.filter((c) => c.numero?.includes(String(yr))).reduce((mx, c) => {
    const n = parseInt((c.numero || "").split("-").pop() || "0", 10);
    return n > mx ? n : mx;
  }, 0);
  return `${prefijo || "COT"}-${yr}-${String(maxN + 1).padStart(3, "0")}`;
}

export function nextNroProp(propuestas, prefijo) {
  const yr = new Date().getFullYear();
  const maxN = propuestas.filter((p) => p.numero?.includes(String(yr))).reduce((mx, p) => {
    const n = parseInt((p.numero || "").split("-").pop() || "0", 10);
    return n > mx ? n : mx;
  }, 0);
  return `${prefijo || "PRO"}-${yr}-${String(maxN + 1).padStart(3, "0")}`;
}
