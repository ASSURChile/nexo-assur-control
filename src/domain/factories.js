import { dataService } from "../services/dataService";

const newId = () => dataService.id();
const TODAY = () => new Date().toISOString().slice(0, 10);

export const bCliente = () => ({
  id: newId(),
  razonSocial: "",
  nombreComercial: "",
  rut: "",
  rubro: "",
  ejecutivo: "",
  contacto: "",
  telefono: "",
  email: "",
  direccion: "",
  notas: "",
  estado: "Prospecto",
  centroCosto: "",
  origen: "manual",
  origenId: "",
  createdAt: new Date().toISOString(),
});

export const bInstalacion = (clienteId) => ({
  id: newId(),
  clienteId,
  nombre: "",
  direccion: "",
  comuna: "",
  region: "",
  responsable: "",
  telefono: "",
  observaciones: "",
  estado: "Activa",
  geoLat: null,
  geoLng: null,
  geoRadioMetros: 100,
  origen: "manual",
  origenId: "",
  createdAt: new Date().toISOString(),
});

export const bPropuesta = (clienteId, instalacionId) => ({
  id: newId(),
  numero: "",
  nombre: "",
  clienteId,
  instalacionId: instalacionId || "",
  ejecutivo: "",
  fecha: TODAY(),
  vigencia: "",
  estado: "Borrador",
  cotizacionId: "",
  baseProyectoNeto: 0,
  baseRecMes: 0,
  duracionContrato: 0,
  fechaInicio: "",
  condicionesPago: [],
  notas: "",
  historial: [{ fecha: new Date().toISOString(), estado: "Borrador", nota: "Creada" }],
  createdAt: new Date().toISOString(),
});

export const bProyecto = (prop, clientes, instalaciones) => {
  const cl = clientes?.find((c) => c.id === prop.clienteId);
  return {
    id: newId(),
    propuestaId: prop.id,
    nombre: prop.nombre || "",
    clienteId: prop.clienteId || "",
    instalacionId: prop.instalacionId || "",
    ejecutivo: prop.ejecutivo || cl?.ejecutivo || "",
    categoria: prop.categoria || "",
    centroCosto: cl?.centroCosto || "",
    subCentroCosto: "",
    valorVendido: prop.valorFinal || prop.valorProyecto || 0,
    costoEstimado: prop.costoEstimado || 0,
    fechaAprobacion: prop.fecha || TODAY(),
    fechaInicio: "",
    fechaTermino: "",
    fechaFacturacion: "",
    estadoOp: "Pendiente",
    estadoFin: "Pendiente facturación",
    nroFactura: "",
    montoFacturado: 0,
    costos: [],
    observaciones: "",
    createdAt: new Date().toISOString(),
  };
};
