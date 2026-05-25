import { repositories as repo } from "./repositories.js";

export function buildBackupPayload(){
  return{
    clientes:repo.clientes.list(),
    instalaciones:repo.instalaciones.list(),
    oportunidades:repo.oportunidades.list(),
    propuestas:repo.propuestas.list(),
    proyectos:repo.proyectos.list(),
    cotizaciones:repo.cotizaciones.list(),
    plantillasCot:repo.plantillasCot.list(),
    paquetesComerciales:repo.paquetesComerciales.list(),
    quickQuotes:repo.quickQuotes.list(),
    facturas:repo.facturas.list(),
    pagos:repo.pagos.list(),
    cuentasPagar:repo.cuentasPagar.list(),
    gastos:repo.gastos.list(),
    serviciosRecurrentes:repo.serviciosRecurrentes.list(),
    serviceBillingExpectations:repo.serviceBillingExpectations.list(),
    eventosServicio:repo.eventosServicio.list(),
    params:repo.params.get(),
    cats:repo.categorias.list(),
    ejecs:repo.ejecutivos.list(),
    permisos:repo.permisos.get(),
    tecnicos:repo.tecnicos.list(),
    contratistas:repo.contratistas.list(),
    materiales:repo.materiales.list(),
    horas:repo.horas.list(),
    fichajes:repo.fichajes.list(),
    incidencias:repo.incidencias.list(),
    counter:repo.cotCounter.get(),
    exportedAt:new Date().toISOString(),
    version:"2.1",
  };
}

export function restoreBackupPayload(d){
  if(d.clientes)repo.clientes.replaceAll(d.clientes);
  if(d.instalaciones)repo.instalaciones.replaceAll(d.instalaciones);
  if(d.oportunidades)repo.oportunidades.replaceAll(d.oportunidades);
  if(d.propuestas)repo.propuestas.replaceAll(d.propuestas);
  if(d.proyectos)repo.proyectos.replaceAll(d.proyectos);
  if(d.cotizaciones)repo.cotizaciones.replaceAll(d.cotizaciones);
  if(d.plantillasCot)repo.plantillasCot.replaceAll(d.plantillasCot);
  if(d.paquetesComerciales)repo.paquetesComerciales.replaceAll(d.paquetesComerciales);
  if(d.quickQuotes)repo.quickQuotes.replaceAll(d.quickQuotes);
  if(d.facturas)repo.facturas.replaceAll(d.facturas);
  if(d.pagos)repo.pagos.replaceAll(d.pagos);
  if(d.cuentasPagar)repo.cuentasPagar.replaceAll(d.cuentasPagar);
  if(d.gastos)repo.gastos.replaceAll(d.gastos);
  if(d.serviciosRecurrentes)repo.serviciosRecurrentes.replaceAll(d.serviciosRecurrentes);
  if(d.serviceBillingExpectations)repo.serviceBillingExpectations.replaceAll(d.serviceBillingExpectations);
  if(d.eventosServicio)repo.eventosServicio.replaceAll(d.eventosServicio);
  if(d.params)repo.params.set(d.params);
  if(d.cats)repo.categorias.replaceAll(d.cats);
  if(d.ejecs)repo.ejecutivos.replaceAll(d.ejecs);
  if(d.permisos)repo.permisos.set(d.permisos);
  if(d.tecnicos)repo.tecnicos.replaceAll(d.tecnicos);
  if(d.contratistas)repo.contratistas.replaceAll(d.contratistas);
  if(d.materiales)repo.materiales.replaceAll(d.materiales);
  if(d.horas)repo.horas.replaceAll(d.horas);
  if(d.fichajes)repo.fichajes.replaceAll(d.fichajes);
  if(d.incidencias)repo.incidencias.replaceAll(d.incidencias);
  if(d.counter)repo.cotCounter.set(d.counter);
}
