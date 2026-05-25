import { dataService } from "./dataService.js";

const K = dataService.keys;

function collectionRepository(key){
  return {
    key,
    list(fallback=[]){
      return dataService.list(key,fallback);
    },
    replaceAll(items=[]){
      dataService.set(key,items);
      return items;
    },
    save(item,options){
      return dataService.upsert(key,item,options);
    },
    remove(id,options){
      return dataService.deleteById(key,id,options);
    },
    append(rows=[]){
      return dataService.append(key,rows);
    },
  };
}

function valueRepository(key,fallback=null){
  return {
    key,
    get(){
      return dataService.get(key,fallback);
    },
    set(value){
      dataService.set(key,value);
      return value;
    },
    clear(){
      dataService.remove(key);
    },
  };
}

export const repositories = {
  keys: K,
  clientes: collectionRepository(K.clientes),
  instalaciones: collectionRepository(K.instalaciones),
  oportunidades: collectionRepository(K.oportunidades),
  propuestas: collectionRepository(K.propuestas),
  proyectos: collectionRepository(K.proyectos),
  cotizaciones: collectionRepository(K.cotizaciones),
  plantillasCot: collectionRepository(K.plantillasCot),
  paquetesComerciales: collectionRepository(K.paquetesComerciales),
  quickQuotes: collectionRepository(K.quickQuotes),
  facturas: collectionRepository(K.facturas),
  pagos: collectionRepository(K.pagos),
  cuentasPagar: collectionRepository(K.cuentasPagar),
  gastos: collectionRepository(K.gastos),
  serviciosRecurrentes: collectionRepository(K.serviciosRecurrentes),
  eventosServicio: collectionRepository(K.eventosServicio),
  serviceBillingExpectations: collectionRepository(K.serviceBillingExpectations),
  horas: collectionRepository(K.horas),
  fichajes: collectionRepository(K.fichajes),
  incidencias: collectionRepository(K.incidencias),
  materiales: collectionRepository(K.materiales),
  tecnicos: collectionRepository(K.tecnicos),
  contratistas: collectionRepository(K.contratistas),
  usuarios: collectionRepository(K.usuarios),
  categorias: collectionRepository(K.categorias),
  ejecutivos: collectionRepository(K.ejecutivos),
  params: valueRepository(K.params,null),
  permisos: valueRepository(K.permisos,null),
  session: valueRepository(K.session,null),
  theme: valueRepository(K.theme,"light"),
  cotCounter: valueRepository(K.cotCounter,{counter:0}),
  opCounter: valueRepository(K.opCounter,"0"),
  apiConfig: valueRepository(K.apiConfig,null),
  syncLog: collectionRepository(K.syncLog),
};

export function repositoryForKey(key){
  return collectionRepository(key);
}

export { collectionRepository, valueRepository };
