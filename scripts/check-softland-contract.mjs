import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { buildSoftlandContractReport } from "../server/softlandAdapter.mjs";

const fixturePath = process.argv[2] || "server/fixtures/softland-api-sample.json";
const payload = JSON.parse(await readFile(resolve(fixturePath), "utf8"));
const report = buildSoftlandContractReport(payload);

const printable = {
  ok: report.ok,
  counts: report.counts,
  errors: report.validation.errors,
  sample: {
    cliente: report.normalized.clientes[0],
    factura: report.normalized.facturas[0],
    servicio: report.normalized.serviciosRecurrentes[0],
    gasto: report.normalized.gastos[0],
    material: report.normalized.materiales[0],
    costoHora: report.normalized.costoHoraTecnica[0],
  },
};

console.log(JSON.stringify(printable, null, 2));

if (!report.ok) process.exit(1);
