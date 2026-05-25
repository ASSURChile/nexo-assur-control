export const COLLECTIONS = [
  { name: "clientes", key: "af_clientes", kind: "array", label: "Clientes", priority: "critica" },
  { name: "instalaciones", key: "af_instalaciones", kind: "array", label: "Instalaciones", priority: "critica" },
  { name: "oportunidades", key: "af_oportunidades", kind: "array", label: "Oportunidades", priority: "alta" },
  { name: "propuestas", key: "af_propuestas", kind: "array", label: "Propuestas", priority: "critica" },
  { name: "proyectos", key: "af_proyectos", kind: "array", label: "Proyectos", priority: "critica" },
  { name: "cotizaciones", key: "af_cotizaciones", kind: "array", label: "Cotizaciones", priority: "alta" },
  { name: "plantillasCot", key: "af_plantillas_cot", kind: "array", label: "Plantillas de cotizacion", priority: "media" },
  { name: "paquetesComerciales", key: "af_paquetes_comerciales", kind: "array", label: "Paquetes comerciales", priority: "alta" },
  { name: "quickQuotes", key: "af_quick_quotes", kind: "array", label: "Cotizaciones rapidas", priority: "alta" },
  { name: "facturas", key: "af_facturas", kind: "array", label: "Facturas", priority: "critica" },
  { name: "pagos", key: "af_pagos", kind: "array", label: "Pagos", priority: "critica" },
  { name: "cuentasPagar", key: "af_cuentas_pagar", kind: "array", label: "Cuentas por pagar", priority: "critica" },
  { name: "gastos", key: "af_gastos", kind: "array", label: "Gastos", priority: "alta" },
  { name: "serviciosRecurrentes", key: "af_servicios_recurrentes", kind: "array", label: "Servicios recurrentes", priority: "critica" },
  { name: "eventosServicio", key: "af_eventos_servicio", kind: "array", label: "Eventos de servicio", priority: "media" },
  { name: "serviceBillingExpectations", key: "af_service_billing_expectations", kind: "array", label: "Facturacion esperada", priority: "alta" },
  { name: "horas", key: "af_horas", kind: "array", label: "Horas", priority: "alta" },
  { name: "fichajes", key: "af_fichajes", kind: "array", label: "Fichajes", priority: "alta" },
  { name: "incidencias", key: "af_incidencias", kind: "array", label: "Incidencias", priority: "alta" },
  { name: "materiales", key: "af_materiales", kind: "array", label: "Materiales", priority: "alta" },
  { name: "tecnicos", key: "af_tecnicos", kind: "array", label: "Tecnicos", priority: "alta" },
  { name: "contratistas", key: "af_contratistas", kind: "array", label: "Contratistas", priority: "media" },
  { name: "usuarios", key: "af_usuarios", kind: "array", label: "Usuarios", priority: "critica", sensitive: true },
  { name: "permisos", key: "af_permisos", kind: "value", label: "Permisos", priority: "critica" },
  { name: "params", key: "af_params", kind: "value", label: "Parametros", priority: "alta" },
  { name: "cats", key: "af_cats", kind: "array", label: "Categorias", priority: "media" },
  { name: "ejecs", key: "af_ejecs", kind: "array", label: "Ejecutivos", priority: "media" },
  { name: "cotCounter", key: "af_cot_counter", kind: "value", label: "Correlativo cotizaciones", priority: "media" },
  { name: "opCounter", key: "af_op_counter", kind: "value", label: "Correlativo oportunidades", priority: "media" },
  { name: "apiConfig", key: "af_api_config", kind: "value", label: "Configuracion API", priority: "media", sensitive: true },
  { name: "syncLog", key: "af_sync_log", kind: "array", label: "Log de sincronizacion", priority: "media" },
  { name: "theme", key: "af_theme", kind: "value", label: "Tema visual", priority: "baja" },
];

export const COLLECTION_BY_NAME = new Map(COLLECTIONS.map((collection) => [collection.name, collection]));
export const COLLECTION_BY_KEY = new Map(COLLECTIONS.map((collection) => [collection.key, collection]));
export const ALLOWED_KEYS = new Set(COLLECTIONS.map((collection) => collection.key));

export function keyToName(key) {
  return COLLECTION_BY_KEY.get(key)?.name || key;
}

export function nameToKey(name) {
  return COLLECTION_BY_NAME.get(name)?.key || name;
}
