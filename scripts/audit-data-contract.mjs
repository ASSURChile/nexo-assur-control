import { dataService } from "../src/services/dataService.js";
import { COLLECTIONS } from "../server/collections.mjs";

const localKeysByName = dataService.keys;
const localKeys = new Set(Object.values(localKeysByName));
const serverKeys = new Set(COLLECTIONS.map((collection) => collection.key));
const serverNames = new Set(COLLECTIONS.map((collection) => collection.name));

const localOnlyAllowed = new Set([
  "af_session",
]);

const warnings = [];
const errors = [];

for (const [name, key] of Object.entries(localKeysByName)) {
  if (localOnlyAllowed.has(key)) continue;
  if (!serverKeys.has(key)) {
    errors.push(`La clave frontend ${name} (${key}) no existe en server/collections.mjs.`);
  }
}

for (const collection of COLLECTIONS) {
  if (!localKeys.has(collection.key)) {
    errors.push(`La colección backend ${collection.name} (${collection.key}) no existe en dataService.keys.`);
  }
}

const criticalDomainNames = COLLECTIONS
  .filter((collection) => ["critica", "alta"].includes(collection.priority))
  .map((collection) => collection.name);

const frontBackupNames = [
  "clientes",
  "instalaciones",
  "oportunidades",
  "propuestas",
  "proyectos",
  "cotizaciones",
  "paquetesComerciales",
  "quickQuotes",
  "facturas",
  "pagos",
  "cuentasPagar",
  "gastos",
  "serviciosRecurrentes",
  "serviceBillingExpectations",
  "params",
  "permisos",
  "tecnicos",
  "materiales",
  "horas",
  "fichajes",
  "incidencias",
];

for (const name of criticalDomainNames) {
  if (name === "usuarios") continue;
  if (!frontBackupNames.includes(name)) {
    warnings.push(`La exportación frontend no incluye entidad crítica/alta: ${name}.`);
  }
}

for (const name of frontBackupNames) {
  if (!serverNames.has(name)) {
    errors.push(`La exportación frontend declara una entidad no soportada por backend: ${name}.`);
  }
}

const result = {
  ok: errors.length === 0,
  frontendKeys: Object.keys(localKeysByName).length,
  backendCollections: COLLECTIONS.length,
  warnings,
  errors,
};

console.log(JSON.stringify(result, null, 2));
if (!result.ok) process.exitCode = 1;
