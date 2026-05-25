const ENTITY_KEYS = {
  clientes: "af_clientes",
  instalaciones: "af_instalaciones",
  oportunidades: "af_oportunidades",
  propuestas: "af_propuestas",
  proyectos: "af_proyectos",
  cotizaciones: "af_cotizaciones",
  plantillasCot: "af_plantillas_cot",
  paquetesComerciales: "af_paquetes_comerciales",
  quickQuotes: "af_quick_quotes",
  facturas: "af_facturas",
  pagos: "af_pagos",
  cuentasPagar: "af_cuentas_pagar",
  gastos: "af_gastos",
  serviciosRecurrentes: "af_servicios_recurrentes",
  eventosServicio: "af_eventos_servicio",
  serviceBillingExpectations: "af_service_billing_expectations",
  horas: "af_horas",
  fichajes: "af_fichajes",
  incidencias: "af_incidencias",
  materiales: "af_materiales",
  tecnicos: "af_tecnicos",
  contratistas: "af_contratistas",
  usuarios: "af_usuarios",
  permisos: "af_permisos",
  params: "af_params",
  categorias: "af_cats",
  ejecutivos: "af_ejecs",
  cotCounter: "af_cot_counter",
  opCounter: "af_op_counter",
  session: "af_session",
  theme: "af_theme",
  apiConfig: "af_api_config",
  syncLog: "af_sync_log",
};

function safeParse(raw,fallback){
  if(!raw)return fallback;
  try{return JSON.parse(raw);}
  catch{return fallback;}
}

const localStorageAdapter = {
  get(key,fallback=[]){
    if(typeof localStorage==="undefined")return fallback;
    return safeParse(localStorage.getItem(key),fallback);
  },
  set(key,value){
    if(typeof localStorage==="undefined")return;
    localStorage.setItem(key,JSON.stringify(value));
  },
  remove(key){
    if(typeof localStorage==="undefined")return;
    localStorage.removeItem(key);
  },
};

let activeAdapter = localStorageAdapter;

export const dataService = {
  keys: ENTITY_KEYS,
  get(key,fallback=[]){
    return activeAdapter.get(key,fallback);
  },
  list(key,fallback=[]){
    return activeAdapter.get(key,fallback);
  },
  set(key,value){
    return activeAdapter.set(key,value);
  },
  remove(key){
    return activeAdapter.remove(key);
  },
  upsert(key,item,{idField="id"}={}){
    const list=activeAdapter.get(key,[]);
    const id=item?.[idField];
    const next=Array.isArray(list)?[...list]:[];
    const index=next.findIndex(x=>x?.[idField]===id);
    if(index>=0)next[index]=item;
    else next.push(item);
    activeAdapter.set(key,next);
    return next;
  },
  deleteById(key,id,{idField="id"}={}){
    const list=activeAdapter.get(key,[]);
    const next=(Array.isArray(list)?list:[]).filter(x=>x?.[idField]!==id);
    activeAdapter.set(key,next);
    return next;
  },
  append(key,rows=[]){
    const list=activeAdapter.get(key,[]);
    const next=[...(Array.isArray(list)?list:[]),...(Array.isArray(rows)?rows:[rows])];
    activeAdapter.set(key,next);
    return next;
  },
  id(){
    return Date.now().toString(36)+Math.random().toString(36).slice(2,6);
  },
  useAdapter(adapter){
    activeAdapter = {...localStorageAdapter,...adapter};
  },
};

export function createHttpAdapter({baseUrl="/api"}={}){
  return {
    async get(key,fallback=[]){
      const res=await fetch(`${baseUrl}/data/${encodeURIComponent(key)}`);
      if(!res.ok)return fallback;
      return res.json();
    },
    async set(key,value){
      const res=await fetch(`${baseUrl}/data/${encodeURIComponent(key)}`,{
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(value),
      });
      if(!res.ok)throw new Error(`No se pudo guardar ${key}`);
      return res.json();
    },
    async remove(key){
      const res=await fetch(`${baseUrl}/data/${encodeURIComponent(key)}`,{method:"DELETE"});
      if(!res.ok)throw new Error(`No se pudo eliminar ${key}`);
    },
  };
}
