import { dataService } from "./dataService.js";
import { repositories as repo, repositoryForKey } from "./repositories.js";

const newId=()=>dataService.id();
const text=(value)=>String(value ?? "").trim();
const money=(value)=>Number(String(value ?? "0").replace(/\./g,"").replace(",", "."))||0;
const pick=(row,cols,names)=>{
  for(const name of names){
    const idx=cols.indexOf(normalizeCsvColumn(name));
    if(idx>=0&&text(row[idx]))return text(row[idx]);
  }
  return "";
};

export const SOFTLAND_IMPORT_TYPES = {
  clientes:{
    label:"Clientes",
    desc:"Importar maestro de clientes desde Softland.",
    key:"af_clientes",
    ejemplo:"razonSocial;rut;direccion;telefono;email;contacto",
    camposRequeridos:["razonSocial"],
    mapper:(row,cols)=>({
      id:newId(),
      razonSocial:pick(row,cols,["razonSocial","razon_social","nombre","cliente"]),
      rut:pick(row,cols,["rut","rutCliente"]),
      direccion:pick(row,cols,["direccion"]),
      telefono:pick(row,cols,["telefono","fono"]),
      email:pick(row,cols,["email","correo"]),
      contacto:pick(row,cols,["contacto"]),
      nombreComercial:"",rubro:"",ejecutivo:"",notas:"",
      estado:"Activo",centroCosto:"",
      origen:"softland",
      origenId:pick(row,cols,["codigo","codCliente","id"]),
      createdAt:new Date().toISOString()
    }),
    claveDup:"rut"
  },
  materiales:{
    label:"Materiales",
    desc:"Importar catálogo de materiales con precios y stock.",
    key:"af_materiales",
    ejemplo:"codigo;nombre;categoria;unidad;precioUnitario;stockActual",
    camposRequeridos:["nombre"],
    mapper:(row,cols)=>({
      id:newId(),
      codigo:pick(row,cols,["codigo"]),
      nombre:pick(row,cols,["nombre","descripcion"]),
      categoria:pick(row,cols,["categoria","familia"]),
      unidad:pick(row,cols,["unidad","um"])||"un",
      precioUnitario:money(pick(row,cols,["precioUnitario","precio"])),
      stockActual:money(pick(row,cols,["stockActual","stock"])),
      stockMinimo:money(pick(row,cols,["stockMinimo"])),
      descripcion:"",
      origen:"softland",
      origenId:pick(row,cols,["codigo"])
    }),
    claveDup:"codigo"
  },
  facturas:{
    label:"Facturas emitidas",
    desc:"Importar referencias de facturas para vincular a hitos de proyecto.",
    key:"af_facturas",
    ejemplo:"folio;rutCliente;fechaEmision;monto;estado",
    camposRequeridos:["folio","monto"],
    mapper:(row,cols)=>({
      id:newId(),
      folio:pick(row,cols,["folio","numero","numeroFactura","nroFactura"]),
      numeroFactura:pick(row,cols,["numeroFactura","folio","numero","nroFactura"]),
      rutCliente:pick(row,cols,["rutCliente","rut"]),
      centroCosto:pick(row,cols,["centroCosto","ccosto","cc"]),
      fechaEmision:pick(row,cols,["fechaEmision","fecha"]),
      fechaVencimiento:pick(row,cols,["fechaVencimiento","vencimiento"]),
      monto:money(pick(row,cols,["monto","total","montoTotal","neto"])),
      montoTotal:money(pick(row,cols,["montoTotal","monto","total","neto"])),
      estado:pick(row,cols,["estado"])||"Emitida",
      montoPagado:money(pick(row,cols,["pagado","montoPagado"])),
      saldo:money(pick(row,cols,["saldo"])),
      proyectoId:"",hitoId:"",
      origen:"softland",
      origenId:pick(row,cols,["folio","numero","numeroFactura"]),
      createdAt:new Date().toISOString()
    }),
    claveDup:"folio"
  },
  pagos:{
    label:"Pagos recibidos",
    desc:"Importar pagos para conciliar con facturas.",
    key:"af_pagos",
    ejemplo:"folioFactura;fechaPago;monto;medio",
    camposRequeridos:["folioFactura","monto"],
    mapper:(row,cols)=>({
      id:newId(),
      folioFactura:pick(row,cols,["folioFactura","folio","numeroFactura"]),
      fechaPago:pick(row,cols,["fechaPago","fecha"]),
      monto:money(pick(row,cols,["monto","montoPagado"])),
      medio:pick(row,cols,["medio","formaPago"])||"Transferencia",
      observaciones:pick(row,cols,["observaciones","glosa"]),
      origen:"softland",
      createdAt:new Date().toISOString()
    }),
    claveDup:null
  },
  cuentasPagar:{
    label:"Cuentas por pagar",
    desc:"Importar documentos de proveedores desde Softland.",
    key:"af_cuentas_pagar",
    ejemplo:"numeroDocumento;proveedor;fechaEmision;vencimiento;monto;estado",
    camposRequeridos:["numeroDocumento","monto"],
    mapper:(row,cols)=>({
      id:newId(),
      numeroDocumento:pick(row,cols,["numeroDocumento","folio","numero","documento"]),
      folio:pick(row,cols,["folio","numeroDocumento","numero","documento"]),
      proveedor:pick(row,cols,["proveedor","razonSocial","nombre"]),
      rutProveedor:pick(row,cols,["rutProveedor","rut"]),
      centroCosto:pick(row,cols,["centroCosto","ccosto","cc"]),
      fecha:pick(row,cols,["fecha","fechaEmision"]),
      fechaEmision:pick(row,cols,["fechaEmision","fecha"]),
      vencimiento:pick(row,cols,["vencimiento","fechaVencimiento"]),
      fechaVencimiento:pick(row,cols,["fechaVencimiento","vencimiento"]),
      monto:money(pick(row,cols,["monto","montoTotal","total"])),
      montoPagado:money(pick(row,cols,["pagado","montoPagado"])),
      saldo:money(pick(row,cols,["saldo"])),
      estado:pick(row,cols,["estado"])||"Pendiente",
      origen:"softland",
      origenId:pick(row,cols,["folio","numeroDocumento","numero","documento"]),
      createdAt:new Date().toISOString()
    }),
    claveDup:"numeroDocumento"
  },
};

export function normalizeCsvColumn(col){
  return col.trim().toLowerCase()
    .replace(/[áàä]/g,"a")
    .replace(/[éèë]/g,"e")
    .replace(/[íìï]/g,"i")
    .replace(/[óòö]/g,"o")
    .replace(/[úùü]/g,"u")
    .replace(/[ñ]/g,"n")
    .replace(/[^a-z0-9_]/g,"");
}

export function parseSoftlandCsv(text){
  const lines=text.trim().split(/\r?\n/);
  if(lines.length<2)return null;
  const sep=lines[0].includes(";")?";":lines[0].includes("\t")?"\t":",";
  const cols=lines[0].split(sep).map(normalizeCsvColumn);
  const rows=lines.slice(1).map(l=>l.split(sep).map(c=>c.trim().replace(/^"|"$/g,"")));
  return {cols,rows};
}

export function previewSoftlandImport({csvText,tipoImport}){
  const tipo=SOFTLAND_IMPORT_TYPES[tipoImport];
  if(!tipo)throw new Error("Tipo de importación inválido.");
  if(!csvText.trim())throw new Error("Pega el contenido CSV primero.");
  const parsed=parseSoftlandCsv(csvText);
  if(!parsed)throw new Error("No se pudo parsear el CSV. Verifica que tenga al menos una fila de encabezado y una de datos.");
  const {cols,rows}=parsed;
  const faltantes=tipo.camposRequeridos.filter(req=>{
    const variantes=[req.toLowerCase(),req.toLowerCase().replace(/[A-Z]/g,m=>"_"+m.toLowerCase())];
    return !variantes.some(v=>cols.some(c=>c.includes(v.replace(/_/g,""))));
  });
  if(faltantes.length>0)throw new Error(`Faltan columnas requeridas: ${faltantes.join(", ")}. Encabezados detectados: ${cols.join(", ")}`);
  const items=rows.filter(r=>r.some(c=>c)).map(r=>tipo.mapper(r,cols));
  return {cols,items,total:items.length};
}

export function commitSoftlandImport({tipoImport,items}){
  const tipo=SOFTLAND_IMPORT_TYPES[tipoImport];
  const entityRepo=repositoryForKey(tipo.key);
  const existentes=entityRepo.list();
  let nuevos=0,actualizados=0;

  for(const item of items){
    if(tipo.claveDup&&item[tipo.claveDup]){
      const idx=existentes.findIndex(e=>e[tipo.claveDup]===item[tipo.claveDup]);
      if(idx>=0){
        existentes[idx]={...existentes[idx],...item,id:existentes[idx].id};
        actualizados++;
      }else{
        existentes.push(item);nuevos++;
      }
    }else{
      existentes.push(item);nuevos++;
    }
  }
  entityRepo.replaceAll(existentes);
  return {nuevos,actualizados,total:items.length};
}

export function getSoftlandImportStats(){
  return{
    clientes:repo.clientes.list(),
    materiales:repo.materiales.list(),
    facturas:repo.facturas.list(),
    pagos:repo.pagos.list(),
  };
}
