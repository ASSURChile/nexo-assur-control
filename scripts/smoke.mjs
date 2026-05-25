import { calcFinanceSummary, calcProjectFinance, reconcileSoftlandFinancials } from "../src/domain/finance.js";
import { buildBillingExpectationsForService, calcServiciosKpis, reconcileBillingExpectations } from "../src/domain/recurringServices.js";
import { calcCostoKm } from "../src/domain/operations.js";
import { bCotizacion, calcCotizacion, nextNroCot, nextNroProp } from "../src/domain/quoting.js";
import { buildBackupPayload } from "../src/services/backupService.js";

function assert(condition,message){
  if(!condition){
    throw new Error(message);
  }
}

const facturas=[
  {id:"f1",monto:1000,montoPagado:400,fechaVencimiento:"2026-05-10",estado:"Emitida"},
  {id:"f2",montoTotal:500,saldo:500,fechaVencimiento:"2026-04-01",estado:"Emitida"},
];
const cxp=[{id:"p1",monto:300,vencimiento:"2026-05-20",estado:"Pendiente"}];
const gastos=[{id:"g1",monto:100,recurrente:true}];
const summary=calcFinanceSummary({facturas,cuentasPorPagar:cxp,gastos,hoy:"2026-05-05"});
assert(summary.cxcTotal===1100,"CxC pendiente inesperada");
assert(summary.totalCxp===300,"CxP pendiente inesperada");

const proyecto={id:"p1",valorVendido:2000,costos:[{total:800}]};
const projectFinance=calcProjectFinance({proyecto,facturas:[{proyectoId:"p1",monto:1000,montoPagado:400}],pagos:[],params:{pctGG:10,pctImp:5}});
assert(projectFinance.costoReal===920,"Costo real de proyecto inesperado");

const softland = reconcileSoftlandFinancials({
  clientes:[{id:"c-soft",rut:"76.543.210-9",centroCosto:"CC-1"}],
  proyectos:[{id:"p-soft",clienteId:"c-soft",centroCosto:"CC-1"}],
  facturas:[{id:"f-soft",folio:"F-900",rutCliente:"76543210-9",centroCosto:"CC-1",monto:1000,montoPagado:0,estado:"Emitida"}],
  pagos:[{id:"pg-soft",folioFactura:"F-900",monto:600,fechaPago:"2026-05-12"}],
  cuentasPorPagar:[{id:"ap-soft",centroCosto:"CC-1",monto:300,estado:"Pendiente"}],
});
assert(softland.summary.facturasConCliente===1,"Softland no vinculo factura con cliente por RUT.");
assert(softland.summary.facturasConProyecto===1,"Softland no vinculo factura con proyecto por centro de costo.");
assert(softland.summary.facturasConPagos===1,"Softland no concilio pagos por folio.");
assert(softland.facturas[0].montoPagado===600&&softland.facturas[0].estado==="Parcial","Softland no actualizo pago parcial.");
assert(softland.summary.cuentasPagarConProyecto===1,"Softland no vinculo CxP con proyecto.");

const servicio={id:"srv1",estado:"Activo",valorMensual:1200,clienteId:"c1",instalacionId:"i1",fechaInicio:"2026-05-01"};
const expectations=buildBillingExpectationsForService({servicio,months:3,startDate:"2026-05-05"});
assert(expectations.length===3,"No se generaron expectativas recurrentes");
assert(expectations[0].expectedAmount===1200,"Monto esperado recurrente incorrecto");
const rec=reconcileBillingExpectations({
  expectations,
  servicios:[servicio],
  clientes:[{id:"c1",rut:"76.543.210-9"}],
  facturas:[{id:"rf1",folio:"F-1",rutCliente:"765432109",fechaEmision:"2026-05-10",monto:1200,montoPagado:1200,estado:"Emitida"}],
  hoy:"2026-05-15",
});
assert(rec.summary.pagadas===1,"Conciliacion recurrente no detecto factura pagada");
const recOpen=reconcileBillingExpectations({expectations,servicios:[servicio],clientes:[{id:"c1",rut:"76.543.210-9"}],facturas:[],hoy:"2026-05-15"});
assert(recOpen.rows[0].reconciledStatus==="Esperada","La expectativa del mes actual no debe vencer antes de fin de mes");

const kpis=calcServiciosKpis([servicio,{id:"srv2",estado:"En activación",valorMensual:500}]);
assert(kpis.mrrActivo===1200,"MRR activo incorrecto");
assert(kpis.mrrActivacion===500,"MRR en activacion incorrecto");

const km=calcCostoKm({precioBencina:1000,rendimientoVehiculo:10,pagoLeasingMensual:200000,kmMensualesPromedio:1000});
assert(km.total===300,"Costo km incorrecto");

const paramsCot={
  rolesTecnicos:[{id:"rol1",nombre:"Tecnico",costoHora:10000}],
  precioBencina:1000,
  rendimientoVehiculo:10,
  pagoLeasingMensual:0,
  kmMensualesPromedio:1000,
  peajeReferencial:2000,
  desayuno:1000,
  almuerzo:2000,
  cena:3000,
  hospedajeNoche:10000,
  bonoNocheFuera:5000,
  pctGG:10,
  pctImp:5,
  margenInstalacion:20,
  ufValue:40000,
  duracionContrato:12,
  serviciosRecurrentes:[{id:"svc1",nombre:"Monitoreo",ufUnitario:2,activo:true}],
};
const cot=bCotizacion(paramsCot);
cot.rolId="rol1";
cot.nTecnicos=2;
cot.horasDia=8;
cot.diasTrabajo=1;
cot.km=10;
cot.nViajes=1;
cot.nPeajes=1;
cot.serviciosRec=[{id:"rs1",svcId:"svc1",cantidad:3}];
const cotCalc=calcCotizacion(cot,paramsCot);
assert(cotCalc.costoMO===160000,"Costo MO de cotizacion inesperado");
assert(cotCalc.totalMesCLP===240000,"MRR de cotizacion inesperado");
assert(nextNroCot([{numero:"COT-2026-009"}],"COT")==="COT-2026-010","Correlativo de cotizacion incorrecto");
assert(nextNroProp([{numero:"PRO-2026-003"}],"PRO")==="PRO-2026-004","Correlativo de propuesta incorrecto");

const backup=buildBackupPayload();
assert(backup.version==="2.1","Version de backup inesperada");
assert(!("usuarios" in backup),"Backup no debe exportar usuarios/passwords");

console.log("Smoke checks OK");
