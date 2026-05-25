import { DEF, TIPOS_V } from "../config/appConstants";

export function semaforo(meses,duracionContrato){
  if(!Number.isFinite(meses)||meses<=0)return{label:"Sin subsidio",color:"#64748B",pct:0};
  const p=duracionContrato>0?meses/duracionContrato:Infinity;
  if(p<=0.40)return{label:"Recomendado",color:"#10B981",pct:p};
  if(p<=0.70)return{label:"Riesgo medio",color:"#F59E0B",pct:p};
  if(p<=1.00)return{label:"Riesgo alto",color:"#EF4444",pct:p};
  return{label:"No recomendable",color:"#7C3AED",pct:p};
}

export function getNombreCliente(cliente){
  if(!cliente)return "Sin cliente";
  return cliente.razonSocial?.trim()||cliente.nombreComercial?.trim()||"Sin nombre";
}

export function isPropNueva(propuesta){
  return propuesta&&(propuesta.baseProyectoNeto!==undefined||propuesta.escenarios!==undefined||propuesta.cotizacionId!==undefined);
}

export function getValorProyecto(propuesta){
  if(!propuesta)return 0;
  return propuesta.valorVendido||propuesta.baseProyectoNeto||propuesta.valorFinal||propuesta.valorProyecto||0;
}

export function tieneProyecto(propuesta){
  if(!propuesta)return false;
  if(propuesta.tieneProyecto!==undefined)return propuesta.tieneProyecto;
  return (propuesta.tipoVenta||TIPOS_V[0])!=="Solo monitoreo";
}

export function tieneRecurrente(propuesta){
  if(!propuesta)return false;
  if(propuesta.tieneRecurrente!==undefined)return propuesta.tieneRecurrente;
  if((propuesta.tipoVenta||TIPOS_V[0])==="Solo proyecto")return false;
  return (propuesta.camaras||0)>0||(propuesta.alarmas||0)>0||(propuesta.videoVerif||0)>0;
}

export function getMRR(propuesta,params){
  if(!propuesta||!params)return 0;
  if(propuesta.baseRecMes!==undefined)return propuesta.baseRecMes||0;
  if(propuesta.serviciosRec?.length){
    const uf=params.ufValue||DEF.ufValue;
    return Math.round(propuesta.serviciosRec.reduce((s,sr)=>s+(sr.cantidad||0)*(sr.ufUnitario||0),0)*uf);
  }
  const uf=params.ufValue||DEF.ufValue;
  const iC=(propuesta.camaras||0)*(propuesta.ufCamara>0?propuesta.ufCamara:params.ufCamara||DEF.ufCamara)*uf;
  const iV=(propuesta.videoVerif||0)*(propuesta.ufVideoVerif>0?propuesta.ufVideoVerif:params.ufVideoVerif||DEF.ufVideoVerif)*uf;
  const iA=(propuesta.alarmas||0)*(propuesta.ufAlarma>0?propuesta.ufAlarma:params.ufAlarma||DEF.ufAlarma)*uf;
  const bruto=iC+iV+iA+(propuesta.internet||0)+(propuesta.soporte||0)+(propuesta.otrosRec||0);
  return Math.max(0,bruto-(propuesta.descuentoServicioMonto||0));
}

export function calcProp(propuesta,params){
  if(!propuesta||!params)return null;
  const dur=propuesta.duracionContrato||params.duracionContrato||DEF.duracionContrato;
  const tProj=tieneProyecto(propuesta);
  const tSvc=tieneRecurrente(propuesta);
  const iRec=tSvc?getMRR(propuesta,params):0;
  const vf=getValorProyecto(propuesta);
  const vp=propuesta.valorProyecto||propuesta.baseProyectoNeto||vf;
  const sub=Math.max(0,vp-vf);
  const costoEst=propuesta.costoEstimado||0;
  const utilProj=tProj?vf-costoEst:0;
  const costoOp=propuesta.costoOpExtra||0;
  const margen=iRec-costoOp;
  const meses=tSvc&&margen>0&&sub>0?sub/margen:sub<=0?0:Infinity;
  const sem=tProj&&tSvc?semaforo(meses,dur):{label:"—",color:"#64748B",pct:0};
  const uf=params.ufValue||DEF.ufValue;
  const cam=propuesta.camaras||0;
  const vv=propuesta.videoVerif||0;
  const al=propuesta.alarmas||0;
  const pUfC=propuesta.ufCamara>0?propuesta.ufCamara:params.ufCamara||DEF.ufCamara;
  const pUfV=propuesta.ufVideoVerif>0?propuesta.ufVideoVerif:params.ufVideoVerif||DEF.ufVideoVerif;
  const pUfA=propuesta.ufAlarma>0?propuesta.ufAlarma:params.ufAlarma||DEF.ufAlarma;
  const iC=tSvc?cam*pUfC*uf:0;
  const iV=tSvc?vv*pUfV*uf:0;
  const iA=tSvc?al*pUfA*uf:0;
  const iRecBruto=iC+iV+iA+(propuesta.internet||0)+(propuesta.soporte||0)+(propuesta.otrosRec||0);
  const descSvcMonto=tSvc?Math.max(0,propuesta.descuentoServicioMonto||0):0;
  const descSvcPct=iRecBruto>0?descSvcMonto/iRecBruto*100:0;
  return{
    iC,iV,iA,iRecBruto,iRec,iRecAnual:iRec*12,descSvcMonto,descSvcPct,
    costoOp,margen,sub,vp,vf,dur,
    tieneProj:tProj,tieneSvc:tSvc,meses,sem,utilProj,
    mProjPct:vf>0?utilProj/vf:0,
    totalContrato:vf+iRec*dur,
    pUfC,pUfV,pUfA,
  };
}

export function calcEsc(propuesta,params,pct){
  return calcProp({...propuesta,valorFinal:(propuesta.valorProyecto||0)*(1-pct/100)},params);
}
