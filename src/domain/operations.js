export function calcCostoKm(p){
  const combKm=(p.precioBencina||0)/Math.max(1,p.rendimientoVehiculo||10);
  const desgKm=(p.pagoLeasingMensual||0)/Math.max(1,p.kmMensualesPromedio||1);
  return{
    combustible:Math.round(combKm),
    desgaste:Math.round(desgKm),
    total:Math.round(combKm+desgKm),
  };
}

export function calcCostoMO(horas,tipoHoraId,costoBaseHora,params){
  const tipo=(params.tiposHora||[]).find(t=>t.id===tipoHoraId)||{recargo:0};
  const recargo=tipo.recargo||0;
  const costoHoraEfectivo=costoBaseHora*(1+recargo/100);
  return{
    horas,
    costoBase:costoBaseHora,
    recargo,
    costoHoraEfectivo:Math.round(costoHoraEfectivo),
    total:Math.round(horas*costoHoraEfectivo),
  };
}

const text=value=>String(value||"").trim();
const money=value=>Number(value)||0;

export function periodoFromDate(fecha=new Date().toISOString()){
  const raw=text(fecha).slice(0,7);
  return /^\d{4}-\d{2}$/.test(raw)?raw:"";
}

export function findCostoHoraReal({
  costosHora=[],
  fecha=new Date().toISOString(),
  empresaOrigen="",
  lineaNegocio="",
  rolCargo="",
  area="",
}={}){
  const periodo=periodoFromDate(fecha);
  const candidates=costosHora.filter(row=>
    (!periodo||row.periodo===periodo)&&
    (!empresaOrigen||row.empresaOrigen===empresaOrigen)&&
    (!lineaNegocio||row.lineaNegocio===lineaNegocio)&&
    (!rolCargo||text(row.rolCargo).toLowerCase()===text(rolCargo).toLowerCase())&&
    (!area||text(row.area).toLowerCase()===text(area).toLowerCase())
  );
  return candidates[0]||null;
}

export function valorizarHorasTecnicas({
  horas=0,
  tipoHoraId="normal",
  costoManualHora=0,
  params={},
  costosHora=[],
  fecha=new Date().toISOString(),
  empresaOrigen="",
  lineaNegocio="",
  rolCargo="",
  area="",
}={}){
  const costoReal=findCostoHoraReal({costosHora,fecha,empresaOrigen,lineaNegocio,rolCargo,area});
  const costoBase=money(costoReal?.costoHoraReal)||money(costoManualHora);
  const result=calcCostoMO(money(horas),tipoHoraId,costoBase,params||{});
  return{
    ...result,
    costoHoraOrigen:costoReal?.costoHoraReal?"softland_real":"manual",
    costoHoraRealId:costoReal?.id||"",
    alerta:costoReal?.costoHoraReal?"":"Costo hora usando parametro manual",
    periodo:periodoFromDate(fecha),
  };
}

export function valorizarMaterialEntregado({item={},materiales=[]}={}){
  const codigo=text(item.codigo||item.materialCodigo||item.materialId);
  const material=materiales.find(m=>text(m.codigo)===codigo||text(m.id)===codigo)||null;
  const cantidad=money(item.cantidad)||1;
  const costoUnitario=money(item.costoUnitario)||money(material?.precioUnitario);
  return{
    ...item,
    materialId:item.materialId||material?.id||"",
    codigo:item.codigo||material?.codigo||codigo,
    nombre:item.nombre||material?.nombre||"",
    cantidad,
    costoUnitario,
    costoTotal:Math.round(cantidad*costoUnitario),
    costoOrigen:costoUnitario>0?"catalogo_softland":"pendiente",
    alerta:costoUnitario>0?"":"Material sin costo unitario sincronizado",
    stockActual:material?.stockActual,
    stockSincronizado:Boolean(material?.stockSincronizado),
  };
}
