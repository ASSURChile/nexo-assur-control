export const OPERATING_GROUP = {
  id: "assur_chile",
  name: "ASSUR Chile",
  status: "planned_brand",
};

export const LEGAL_ENTITIES = [
  {
    id: "alerta_md",
    name: "Alerta MD Ltda.",
    shortName: "Alerta MD",
    businessFocus: "monitoreo",
    futureBrand: OPERATING_GROUP.id,
  },
  {
    id: "servicios_electronicos",
    name: "Servicios Electronicos Ltda.",
    shortName: "Servicios Electronicos",
    businessFocus: "tecnica",
    futureBrand: OPERATING_GROUP.id,
  },
];

export const BUSINESS_LINES = [
  { id: "monitoreo", name: "Monitoreo", ownerEntityId: "alerta_md" },
  { id: "tecnica", name: "Servicios tecnicos / proyectos", ownerEntityId: "servicios_electronicos" },
  { id: "administracion", name: "Administracion", ownerEntityId: null },
  { id: "finanzas", name: "Finanzas", ownerEntityId: null },
  { id: "comercial", name: "Comercial", ownerEntityId: null },
];

const normalize = (value) => String(value || "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLowerCase()
  .trim();

export function normalizeLegalEntity(value) {
  const raw = normalize(value);
  if (!raw) return "";
  if (raw.includes("alerta")) return "alerta_md";
  if (raw.includes("servicio") || raw.includes("electronico") || raw.includes("m&d") || raw.includes("md comercial")) {
    return "servicios_electronicos";
  }
  return LEGAL_ENTITIES.find((entity) => normalize(entity.id) === raw || normalize(entity.name) === raw)?.id || raw;
}

export function normalizeBusinessLine(value, legalEntityId = "") {
  const raw = normalize(value);
  if (raw.includes("monitoreo") || raw.includes("video") || raw.includes("alarma")) return "monitoreo";
  if (raw.includes("tecnic") || raw.includes("proyecto") || raw.includes("obra") || raw.includes("instalacion")) return "tecnica";
  if (raw.includes("admin")) return "administracion";
  if (raw.includes("finanza") || raw.includes("contab")) return "finanzas";
  if (raw.includes("comercial") || raw.includes("venta")) return "comercial";
  if (legalEntityId === "alerta_md") return "monitoreo";
  if (legalEntityId === "servicios_electronicos") return "tecnica";
  return "";
}

export function legalEntityById(id) {
  return LEGAL_ENTITIES.find((entity) => entity.id === id) || null;
}

export function businessLineById(id) {
  return BUSINESS_LINES.find((line) => line.id === id) || null;
}

export function buildOperatingContext({
  empresaOrigen = "",
  empresaRut = "",
  lineaNegocio = "",
  sourceSystem = "manual",
  externalId = "",
} = {}) {
  const legalEntityId = normalizeLegalEntity(empresaOrigen);
  const businessLineId = normalizeBusinessLine(lineaNegocio, legalEntityId);
  const legalEntity = legalEntityById(legalEntityId);
  const businessLine = businessLineById(businessLineId);
  return {
    grupoGestion: OPERATING_GROUP.id,
    marcaFutura: OPERATING_GROUP.name,
    empresaOrigen: legalEntityId,
    empresaOrigenNombre: legalEntity?.name || empresaOrigen || "",
    empresaOrigenRut: String(empresaRut || "").trim(),
    lineaNegocio: businessLineId,
    lineaNegocioNombre: businessLine?.name || lineaNegocio || "",
    sourceSystem,
    externalId: String(externalId || "").trim(),
  };
}

export function attachOperatingContext(row = {}, context = {}) {
  const nextContext = buildOperatingContext({
    empresaOrigen: context.empresaOrigen ?? row.empresaOrigen ?? row.empresa_origen,
    empresaRut: context.empresaRut ?? context.empresaOrigenRut ?? row.empresaOrigenRut ?? row.empresa_rut,
    lineaNegocio: context.lineaNegocio ?? row.lineaNegocio ?? row.linea_negocio,
    sourceSystem: context.sourceSystem ?? row.sourceSystem ?? row.origen ?? "manual",
    externalId: context.externalId ?? row.externalId ?? row.origenId,
  });
  return {
    ...row,
    ...nextContext,
    metadata: {
      ...(row.metadata || {}),
      operatingContext: nextContext,
    },
  };
}
