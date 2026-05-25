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
