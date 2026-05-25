import { useMemo, useRef, useState } from "react";
import { Btn, Modal } from "./ui";
import { ff } from "../config/appConstants";
import { fmtCLP } from "../utils/formatters";

const BRAND_LOGO = "/brand/assur-hex-solid-royal.svg";

const esc = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const todayLong = (date) => {
  const d = date ? new Date(`${date}T12:00:00`) : new Date();
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const lineLabel = (cot) => {
  const text = `${cot?.descripcion || ""} ${cot?.tipoProyectoId || ""}`.toLowerCase();
  if (text.includes("cerco")) return "Proyecto de cerco electrico";
  if (text.includes("alarma")) return "Sistema de alarma y monitoreo";
  if (text.includes("camara") || text.includes("cctv")) return "Proyecto CCTV y seguridad electronica";
  if (cot?.tieneRecurrente && !cot?.tieneProyecto) return "Servicio de monitoreo recurrente";
  return "Proyecto de seguridad electronica";
};

const QUOTE_TEMPLATES = [
  { id: "auto", label: "Automatica" },
  { id: "cctv", label: "CCTV / Camaras" },
  { id: "alarmas", label: "Alarmas + monitoreo" },
  { id: "cerco", label: "Cerco electrico" },
  { id: "monitoreo", label: "Monitoreo recurrente" },
  { id: "mantencion", label: "Mantencion / soporte" },
];

const templateCopy = (templateId, cot) => {
  const fallbackScope = cot?.descripcion || "La solucion considera suministro, instalacion, configuracion, puesta en marcha y entrega operativa segun el detalle tecnico indicado.";
  const copies = {
    auto: {
      title: lineLabel(cot),
      lead: "De acuerdo con lo solicitado, presentamos nuestra propuesta tecnico-comercial para la implementacion y/o servicio asociado. El alcance puede ser ajustado en esta misma version antes de emitir el documento final al cliente.",
      scope: fallbackScope,
      notes: "Esta propuesta puede complementarse con anexos tecnicos, planos, fotografias, protocolos de monitoreo o condiciones especiales segun la linea de negocio contratada.",
      terms: "Valores netos no incluyen IVA. Validez de la oferta: 15 dias. Forma de pago segun acuerdo comercial. Los plazos de instalacion quedan sujetos a disponibilidad de materiales y coordinacion con el cliente.",
    },
    cctv: {
      title: "Proyecto CCTV y seguridad electronica",
      lead: "Presentamos propuesta para la implementacion de un sistema de camaras orientado a mejorar cobertura visual, respaldo de eventos y continuidad operativa de la instalacion.",
      scope: fallbackScope || "El proyecto considera suministro e instalacion de camaras, canalizacion o conectividad asociada, configuracion de grabador, pruebas de imagen, puesta en marcha y entrega operativa.",
      notes: "La ubicacion final de camaras, puntos de red, energia y condiciones de visualizacion se validara durante la ejecucion. Cambios de alcance pueden requerir ajuste comercial.",
      terms: "Valores netos no incluyen IVA. No considera obras civiles mayores, postes, enlaces especiales ni energia adicional salvo indicacion expresa en el detalle valorizado.",
    },
    alarmas: {
      title: "Sistema de alarma y monitoreo",
      lead: "Presentamos propuesta para implementar un sistema de alarma con capacidad de deteccion, disuasion y monitoreo mensual segun protocolo operacional definido.",
      scope: fallbackScope || "El alcance incluye central de alarma, sensores, sirena, comunicador, instalacion, programacion, pruebas de activacion y configuracion inicial para monitoreo.",
      notes: "El servicio de monitoreo queda sujeto a protocolo vigente, contactos definidos por el cliente y pruebas de comunicacion exitosas antes de la activacion final.",
      terms: "Valores netos no incluyen IVA. El servicio mensual se factura de acuerdo con la periodicidad acordada y puede requerir permanencia minima segun condiciones comerciales.",
    },
    cerco: {
      title: "Proyecto de cerco electrico",
      lead: "Presentamos propuesta para reforzar la seguridad perimetral mediante sistema de cerco electrico, considerando instalacion, energizacion, pruebas y entrega operativa.",
      scope: fallbackScope || "El proyecto considera energizador, aisladores, alambre, postes o accesorios definidos, senaletica, instalacion, pruebas de tension y capacitacion basica.",
      notes: "La ejecucion depende del estado del perimetro, disponibilidad de puntos de energia y condiciones fisicas del cierre existente. Obras civiles o reparaciones no indicadas quedan fuera del alcance.",
      terms: "Valores netos no incluyen IVA. El cliente debe asegurar condiciones de acceso, permisos internos y disponibilidad del perimetro para una instalacion continua.",
    },
    monitoreo: {
      title: "Servicio de monitoreo recurrente",
      lead: "Presentamos propuesta para servicio mensual de monitoreo, videoverificacion y/o supervision remota de sistemas de seguridad instalados en la dependencia indicada.",
      scope: fallbackScope || "El servicio considera activacion de cuenta, configuracion de protocolo, contactos de emergencia, horarios relevantes, pruebas de recepcion y seguimiento operacional.",
      notes: "La activacion queda condicionada a conectividad estable, credenciales de acceso disponibles, protocolo completo y validacion de eventos de prueba.",
      terms: "Valores netos no incluyen IVA. El servicio recurrente se factura mensualmente y puede suspenderse ante mora, fallas de conectividad no corregidas o falta de protocolo operativo.",
    },
    mantencion: {
      title: "Servicio de mantencion y soporte tecnico",
      lead: "Presentamos propuesta para mantencion preventiva, correctiva o soporte tecnico de sistemas de seguridad, orientada a mejorar continuidad operativa y reducir fallas recurrentes.",
      scope: fallbackScope || "El alcance considera revision tecnica, diagnostico, limpieza o ajuste de equipos, pruebas funcionales, informe de hallazgos y recomendaciones de mejora.",
      notes: "Repuestos, equipos nuevos, trabajos fuera de horario o visitas adicionales no consideradas pueden valorizarse por separado segun diagnostico en terreno.",
      terms: "Valores netos no incluyen IVA. La agenda de visita queda sujeta a disponibilidad tecnica y coordinacion previa con el responsable de la instalacion.",
    },
  };
  return copies[templateId] || copies.auto;
};

const quoteStyles = `
  :root { color-scheme: light; }
  body { margin: 0; background: #eef3f8; color: #172033; font-family: Inter, Arial, sans-serif; }
  .quote-page { width: min(100%, 860px); margin: 0 auto; background: #fff; border: 1px solid #d9e2ee; box-shadow: 0 20px 55px rgba(23,32,51,.13); }
  .quote-head { display: grid; grid-template-columns: 1fr auto; gap: 24px; padding: 34px 40px 24px; border-bottom: 4px solid #1e5f93; }
  .quote-brand { display: flex; align-items: center; gap: 16px; }
  .quote-brand img { width: 58px; height: 58px; object-fit: contain; }
  .quote-brand-title { font-size: 26px; font-weight: 850; letter-spacing: .16em; color: #153b66; text-transform: uppercase; line-height: 1; }
  .quote-brand-sub { font-size: 12px; letter-spacing: .32em; color: #1e5f93; text-transform: uppercase; margin-top: 6px; }
  .quote-meta { text-align: right; color: #53647b; font-size: 12px; line-height: 1.55; }
  .quote-meta strong { display: block; color: #153b66; font-size: 15px; letter-spacing: .08em; text-transform: uppercase; }
  .quote-body { padding: 30px 40px 40px; }
  .quote-date { color: #53647b; font-size: 13px; margin-bottom: 24px; }
  .quote-to { color: #172033; font-size: 14px; line-height: 1.55; margin-bottom: 18px; }
  .quote-title { font-size: 25px; line-height: 1.15; color: #10243d; margin: 0 0 10px; font-weight: 850; }
  .quote-lead { color: #53647b; font-size: 14px; line-height: 1.65; margin: 0 0 26px; max-width: 680px; }
  .quote-section { margin-top: 24px; }
  .quote-section-title { display: flex; align-items: center; gap: 10px; color: #153b66; font-size: 13px; font-weight: 850; letter-spacing: .12em; text-transform: uppercase; margin-bottom: 10px; }
  .quote-section-title:before { content: ""; width: 22px; height: 3px; border-radius: 999px; background: #1e5f93; }
  .quote-table { width: 100%; border-collapse: collapse; border: 1px solid #dbe5f0; overflow: hidden; border-radius: 10px; font-size: 13px; }
  .quote-table th { background: #f2f6fa; color: #53647b; font-size: 11px; letter-spacing: .1em; text-transform: uppercase; text-align: left; padding: 11px 12px; border-bottom: 1px solid #dbe5f0; }
  .quote-table td { padding: 12px; border-bottom: 1px solid #e6edf5; color: #172033; vertical-align: top; }
  .quote-table tr:last-child td { border-bottom: 0; }
  .quote-table .num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
  .quote-table .total td { background: #f7fafc; font-weight: 850; color: #153b66; }
  .quote-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 18px; margin-top: 24px; }
  .quote-box { border: 1px solid #dbe5f0; background: #f8fbfd; border-radius: 12px; padding: 18px; color: #53647b; font-size: 13px; line-height: 1.6; }
  .quote-price { background: #153b66; color: #fff; border-radius: 14px; padding: 20px; }
  .quote-price-label { font-size: 11px; letter-spacing: .12em; text-transform: uppercase; opacity: .78; font-weight: 800; }
  .quote-price-value { font-size: 32px; font-weight: 900; margin-top: 8px; font-variant-numeric: tabular-nums; }
  .quote-price-sub { margin-top: 6px; font-size: 13px; color: #d9e7f4; }
  .quote-sign { margin-top: 34px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; align-items: end; }
  .quote-sign-line { border-top: 1px solid #9fb0c3; padding-top: 8px; color: #53647b; font-size: 12px; text-align: center; }
  [contenteditable="true"] { outline: 1px dashed transparent; outline-offset: 3px; }
  [contenteditable="true"]:focus { outline-color: #1e5f93; background: rgba(30,95,147,.06); }
  @media print {
    body { background: #fff; }
    .quote-page { width: 100%; border: 0; box-shadow: none; }
    [contenteditable="true"] { outline: none !important; }
  }
`;

const quoteEditorStyles = quoteStyles
  .replace("  :root { color-scheme: light; }\n", "")
  .replace("  body { margin: 0; background: #eef3f8; color: #172033; font-family: Inter, Arial, sans-serif; }\n", "");

function buildQuoteHtml({ cot, calc, cliente, instalacion, params, templateId = "auto" }) {
  const copy = templateCopy(templateId, cot);
  const materiales = Array.isArray(cot?.materiales) && cot.materiales.length
    ? cot.materiales
    : [{ desc: "Solucion de seguridad segun levantamiento tecnico", cant: 1, precio: calc?.precioNeto || 0 }];
  const servicios = Array.isArray(cot?.serviciosRec) ? cot.serviciosRec : [];
  const precioNeto = calc?.precioNeto || 0;
  const precioIVA = calc?.precioIVA || Math.round(precioNeto * 1.19);
  const ufValue = params?.ufValue || 0;

  const materialRows = materiales.map((m) => {
    const total = (Number(m.cant) || 0) * (Number(m.precio) || 0);
    return `<tr>
      <td contenteditable="true">${esc(m.desc || "Item")}</td>
      <td class="num" contenteditable="true">${esc(m.cant || 1)}</td>
      <td class="num" contenteditable="true">${esc(fmtCLP(m.precio || 0))}</td>
      <td class="num" contenteditable="true">${esc(fmtCLP(total))}</td>
    </tr>`;
  }).join("");

  const serviceRows = servicios.map((s) => {
    const ufTotal = (Number(s.cantidad) || 0) * (Number(s.ufUnitario) || 0);
    return `<tr>
      <td contenteditable="true">${esc(s.nombre || "Servicio recurrente")}</td>
      <td class="num" contenteditable="true">${esc(s.cantidad || 1)}</td>
      <td class="num" contenteditable="true">${ufTotal.toFixed(2)} UF</td>
      <td class="num" contenteditable="true">${esc(fmtCLP(Math.round(ufTotal * ufValue)))}</td>
    </tr>`;
  }).join("");

  return `
    <article class="quote-page">
      <header class="quote-head">
        <div class="quote-brand">
          <img src="${BRAND_LOGO}" alt="ASSUR Chile" />
          <div>
            <div class="quote-brand-title" contenteditable="true">ASSUR</div>
            <div class="quote-brand-sub" contenteditable="true">Chile</div>
          </div>
        </div>
        <div class="quote-meta">
          <strong contenteditable="true">Cotizacion</strong>
          <div contenteditable="true">N° ${esc(cot?.numero || "COT-000")}</div>
          <div contenteditable="true">${esc(todayLong(cot?.fecha))}</div>
        </div>
      </header>

      <main class="quote-body">
        <div class="quote-date" contenteditable="true">Curico, ${esc(todayLong(cot?.fecha))}</div>
        <div class="quote-to" contenteditable="true">
          Estimados<br>
          <strong>${esc(cliente?.razonSocial || cliente?.nombreComercial || "Cliente")}</strong><br>
          ${esc(instalacion?.nombre || instalacion?.direccion || "Instalacion")}<br>
          Presente
        </div>

        <h1 class="quote-title" contenteditable="true">${esc(copy.title)}</h1>
        <p class="quote-lead" contenteditable="true">
          ${esc(copy.lead)}
        </p>

        <section class="quote-section">
          <div class="quote-section-title" contenteditable="true">Alcance comercial</div>
          <div class="quote-box" contenteditable="true">
            ${esc(copy.scope)}
          </div>
        </section>

        <section class="quote-section">
          <div class="quote-section-title" contenteditable="true">Detalle valorizado</div>
          <table class="quote-table">
            <thead>
              <tr><th contenteditable="true">Item</th><th class="num" contenteditable="true">Cant.</th><th class="num" contenteditable="true">Valor unit.</th><th class="num" contenteditable="true">Total</th></tr>
            </thead>
            <tbody>
              ${materialRows}
              <tr class="total"><td contenteditable="true" colspan="3">Valor neto proyecto</td><td class="num" contenteditable="true">${esc(fmtCLP(precioNeto))}</td></tr>
            </tbody>
          </table>
        </section>

        ${servicios.length ? `<section class="quote-section">
          <div class="quote-section-title" contenteditable="true">Servicio recurrente</div>
          <table class="quote-table">
            <thead>
              <tr><th contenteditable="true">Servicio</th><th class="num" contenteditable="true">Cant.</th><th class="num" contenteditable="true">UF mes</th><th class="num" contenteditable="true">CLP mes</th></tr>
            </thead>
            <tbody>
              ${serviceRows}
              <tr class="total"><td contenteditable="true" colspan="2">Total mensual estimado</td><td class="num" contenteditable="true">${(calc?.totalUFMes || 0).toFixed(2)} UF</td><td class="num" contenteditable="true">${esc(fmtCLP(calc?.totalMesCLP || 0))}</td></tr>
            </tbody>
          </table>
        </section>` : ""}

        <div class="quote-grid">
          <div class="quote-box" contenteditable="true">
            <strong>Condiciones comerciales</strong><br>
            ${esc(copy.terms)}
          </div>
          <div class="quote-price">
            <div class="quote-price-label" contenteditable="true">Valor final neto</div>
            <div class="quote-price-value" contenteditable="true">${esc(fmtCLP(precioNeto))}</div>
            <div class="quote-price-sub" contenteditable="true">Valor con IVA: ${esc(fmtCLP(precioIVA))}</div>
          </div>
        </div>

        <section class="quote-section">
          <div class="quote-section-title" contenteditable="true">Observaciones</div>
          <div class="quote-box" contenteditable="true">
            ${esc(copy.notes)}
          </div>
        </section>

        <div class="quote-sign">
          <div class="quote-sign-line" contenteditable="true">ASSUR Chile</div>
          <div class="quote-sign-line" contenteditable="true">Aceptacion cliente</div>
        </div>
      </main>
    </article>`;
}

export default function QuoteDocumentEditor({
  C,
  cot,
  calc,
  cliente,
  instalacion,
  params,
  readonly,
  onClose,
  onSaveDocumento,
}) {
  const initialHtml = useMemo(
    () => cot?.documentoClienteHtml || buildQuoteHtml({ cot, calc, cliente, instalacion, params }),
    [cot, calc, cliente, instalacion, params],
  );
  const [status, setStatus] = useState("");
  const [templateId, setTemplateId] = useState(cot?.documentoClienteTemplate || "auto");
  const docRef = useRef(null);

  const currentHtml = () => docRef.current?.innerHTML || initialHtml;
  const selectedCell = () => {
    const sel = window.getSelection?.();
    const node = sel?.anchorNode;
    const el = node?.nodeType === 3 ? node.parentElement : node;
    return el?.closest?.("td,th") || null;
  };
  const selectedTable = () => selectedCell()?.closest("table") || docRef.current?.querySelector("table");
  const mark = (msg) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(""), 1800);
  };

  const save = () => {
    onSaveDocumento(currentHtml(), templateId);
    mark("Documento guardado en la cotizacion");
  };

  const applyTemplate = (nextTemplateId) => {
    setTemplateId(nextTemplateId);
    const html = buildQuoteHtml({ cot, calc, cliente, instalacion, params, templateId: nextTemplateId });
    if (docRef.current) docRef.current.innerHTML = html;
    mark("Plantilla aplicada. Puedes editarla antes de guardar.");
  };

  const addRow = () => {
    const table = selectedTable();
    if (!table) return mark("Selecciona una tabla");
    const body = table.tBodies[0] || table.createTBody();
    const source = body.rows[Math.max(0, body.rows.length - 1)] || table.rows[0];
    const cells = Math.max(source?.cells?.length || 0, 2);
    const tr = body.insertRow(body.rows.length);
    for (let i = 0; i < cells; i += 1) {
      const td = tr.insertCell(i);
      td.contentEditable = "true";
      td.className = source?.cells?.[i]?.className || "";
      td.textContent = i === 0 ? "Nuevo item" : "—";
    }
    mark("Fila agregada");
  };

  const removeRow = () => {
    const cell = selectedCell();
    const row = cell?.parentElement;
    const body = row?.parentElement;
    if (!row || body?.rows?.length <= 1) return mark("Selecciona una fila editable");
    row.remove();
    mark("Fila eliminada");
  };

  const addColumn = () => {
    const table = selectedTable();
    if (!table) return mark("Selecciona una tabla");
    Array.from(table.rows).forEach((row, index) => {
      const cell = index === 0 && row.parentElement?.tagName === "THEAD" ? document.createElement("th") : document.createElement("td");
      cell.contentEditable = "true";
      cell.textContent = index === 0 ? "Nueva columna" : "—";
      row.appendChild(cell);
    });
    mark("Columna agregada");
  };

  const addTextSection = () => {
    const box = document.createElement("section");
    box.className = "quote-section";
    box.innerHTML = `<div class="quote-section-title" contenteditable="true">Nueva seccion</div><div class="quote-box" contenteditable="true">Escribe aqui el contenido adicional para esta cotizacion.</div>`;
    docRef.current?.querySelector(".quote-body")?.appendChild(box);
    mark("Seccion agregada");
  };

  const exportPdf = () => {
    const html = currentHtml();
    const printWindow = window.open("", "_blank", "width=980,height=1200");
    if (!printWindow) return mark("El navegador bloqueo la ventana de exportacion");
    printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(cot?.numero || "cotizacion-assur")}</title><style>${quoteStyles}</style></head><body>${html}<script>setTimeout(()=>{window.focus();window.print();},250);</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <Modal C={C} title="Documento cliente exportable" onClose={onClose} width={1180}>
      <style>{quoteEditorStyles}</style>
      <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",marginBottom:12}}>
        {!readonly && <label style={{display:"flex",alignItems:"center",gap:7,fontFamily:ff,fontSize:12,color:C.textM}}>
          Plantilla
          <select
            value={templateId}
            onChange={e=>applyTemplate(e.target.value)}
            style={{height:34,border:"1px solid "+C.border,borderRadius:8,background:C.bg1,color:C.text,fontFamily:ff,fontSize:12,padding:"0 10px",outline:"none"}}
          >
            {QUOTE_TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>}
        {!readonly && <Btn C={C} onClick={save}>Guardar version editable</Btn>}
        <Btn C={C} variant="soft" onClick={exportPdf}>Exportar PDF</Btn>
        {!readonly && <>
          <Btn C={C} variant="ghost" onClick={addRow}>+ Fila</Btn>
          <Btn C={C} variant="ghost" onClick={removeRow}>- Fila</Btn>
          <Btn C={C} variant="ghost" onClick={addColumn}>+ Columna</Btn>
          <Btn C={C} variant="ghost" onClick={addTextSection}>+ Texto</Btn>
        </>}
        <span style={{fontFamily:ff,fontSize:12,color:status ? C.green : C.textM,marginLeft:"auto"}}>
          {status || "Haz clic sobre textos o celdas para editar antes de exportar."}
        </span>
      </div>
      <div style={{maxHeight:"72vh",overflow:"auto",background:"#e8eef5",border:"1px solid "+C.border,borderRadius:14,padding:18}}>
        <div
          ref={docRef}
          contentEditable={!readonly}
          suppressContentEditableWarning
          dangerouslySetInnerHTML={{__html: initialHtml}}
        />
      </div>
    </Modal>
  );
}
