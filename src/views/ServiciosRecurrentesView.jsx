import { useState } from "react";
import {
  TIPOS_SERVICIO_OPERATIVO,
  ESTADOS_SERVICIO,
  PERIODOS_FACTURACION,
  COL_SERVICIO,
  servicioTieneProtocoloCompleto,
  buildServicioDesdeProyecto,
  calcServiciosKpis,
} from "../domain/recurringServices";
import { tieneRecurrente, calcProp } from "../domain/commercial";

export default function ServiciosRecurrentesView({
  C,
  servicios,
  eventosServicio = [],
  clientes,
  instalaciones,
  proyectos,
  propuestas,
  params,
  facturas = [],
  onSave,
  onDelete,
  readonly,
  onGoTab,
  onSaveProyecto,
  onSaveEvento,
  onDeleteEvento,
  ui,
}) {
  const {
    Card,
    STitle,
    Btn,
    Bdg,
    ModuleHero,
    QuickActions,
    WorkflowSteps,
    Sel,
    Inp,
    Fld,
    G,
    Modal,
    Stat,
    EmptyState,
    fmtCLP,
    ff,
    id,
  } = ui;
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [eventModal, setEventModal] = useState(null);
  const [form, setForm] = useState({});
  const [eventForm, setEventForm] = useState({});
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("Todos");
  const kpis = calcServiciosKpis(servicios || []);
  const eventosAbiertos = (eventosServicio || []).filter((e) => e.estado !== "Cerrado");
  const clienteDe = (s) => clientes.find((c) => c.id === s.clienteId);
  const instalacionDe = (s) => instalaciones.find((i) => i.id === s.instalacionId);
  const eventosDe = (servicioId) => (eventosServicio || []).filter((e) => e.servicioId === servicioId).sort((a,b)=>String(b.fecha||b.createdAt||"").localeCompare(String(a.fecha||a.createdAt||"")));
  const saldoCliente = (s) => {
    const rut = clienteDe(s)?.rut;
    if (!rut) return 0;
    return facturas
      .filter((f) => f.rutCliente === rut)
      .reduce((a, f) => a + (f.saldo ?? Math.max(0, (f.monto || f.montoTotal || 0) - (f.montoPagado || 0))), 0);
  };
  const proyectosElegibles = proyectos.filter((p) => {
    const prop = propuestas.find((x) => x.id === p.propuestaId);
    const cerrado = p.estadoOp === "Cerrado técnicamente" || p.cierreTecnico || p.activacionServicioEstado;
    return prop && tieneRecurrente(prop) && cerrado && !servicios.some((s) => s.proyectoId === p.id);
  });
  const proyectosEnCola = proyectos.filter((p) => {
    const prop = propuestas.find((x) => x.id === p.propuestaId);
    return prop && tieneRecurrente(prop) && !servicios.some((s) => s.proyectoId === p.id);
  });
  const filtrados = (servicios || []).filter((s) => {
    if (estado !== "Todos" && s.estado !== estado) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.codigo || "").toLowerCase().includes(q) ||
      (s.tipoServicio || "").toLowerCase().includes(q) ||
      (clienteDe(s)?.razonSocial || "").toLowerCase().includes(q) ||
      (instalacionDe(s)?.nombre || "").toLowerCase().includes(q)
    );
  });
  const card = { background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, padding: "16px 18px", boxShadow: C.isLight ? "0 10px 28px rgba(20,35,55,0.045)" : "none" };
  const inputStyle = { background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, color: C.text, padding: "10px 13px", fontSize: 13, fontFamily: ff, outline: "none", flex: "1 1 300px", boxShadow: C.isLight ? "0 1px 0 rgba(15,23,41,0.03)" : "none" };
  const thS = {
    padding: "8px 12px",
    textAlign: "left",
    fontSize: 9,
    color: C.textM,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontFamily: ff,
  };
  const tdS = { padding: "9px 12px", fontFamily: ff, fontSize: 12, borderBottom: "1px solid " + C.border };
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addContacto = () => sf("contactos", [...(form.contactos || []), { id: id(), nombre: "", telefono: "", email: "", rol: "" }]);
  const updContacto = (idx, k, v) => sf("contactos", (form.contactos || []).map((c, i) => (i === idx ? { ...c, [k]: v } : c)));
  const removeContacto = (idx) => sf("contactos", (form.contactos || []).filter((_, i) => i !== idx));
  const openEvent = (servicio) => {
    setEventForm({
      id: id(),
      servicioId: servicio.id,
      clienteId: servicio.clienteId || "",
      instalacionId: servicio.instalacionId || "",
      proyectoId: servicio.proyectoId || "",
      tipo: "Falla",
      severidad: "Media",
      estado: "Abierto",
      titulo: "",
      descripcion: "",
      fecha: new Date().toISOString(),
      origen: "assur",
      createdAt: new Date().toISOString(),
    });
    setEventModal("edit");
  };
  const openNew = () => {
    setForm({
      id: id(),
      codigo: "SRV-" + new Date().getFullYear() + "-" + String(servicios.length + 1).padStart(3, "0"),
      estado: "En activación",
      tipoServicio: "Monitoreo cámaras",
      valorMensual: 0,
      camaras: 0,
      alarmas: 0,
      videoVerificacion: 0,
      periodicidad: "Mensual",
      fechaInicio: "",
      responsable: "",
      horario: "",
      instrucciones: "",
      contactos: [],
      activos: [],
      origen: "manual",
      createdAt: new Date().toISOString(),
    });
    setModal("edit");
  };
  const openFromProject = (p) => {
    const prop = propuestas.find((x) => x.id === p.propuestaId);
    const calc = calcProp(prop, params) || {};
    setForm(buildServicioDesdeProyecto({ proyecto: p, propuesta: prop, clientes, instalaciones, mrr: calc.iRec || 0, id }));
    setModal("edit");
  };
  const save = () => {
    if (!form.clienteId || !form.instalacionId || !form.tipoServicio) return;
    if (form.estado === "Activo" && !servicioTieneProtocoloCompleto(form)) {
      alert("Para activar el servicio completa cliente, instalación, fecha de inicio, valor mensual, un contacto y protocolo básico.");
      return;
    }
    const item = {
      ...form,
      valorMensual: +form.valorMensual || 0,
      camaras: +form.camaras || 0,
      alarmas: +form.alarmas || 0,
      videoVerificacion: +form.videoVerificacion || 0,
      updatedAt: new Date().toISOString(),
    };
    onSave(item);
    if(item.proyectoId&&onSaveProyecto){
      onSaveProyecto({
        ...(proyectos.find((p)=>p.id===item.proyectoId)||{}),
        id:item.proyectoId,
        requiereActivacionServicio:true,
        servicioRecurrenteId:item.id,
        activacionServicioEstado:item.estado==="Activo"?"Activo":servicioTieneProtocoloCompleto(item)?"Listo para activar":"En activación",
        updatedAt:new Date().toISOString(),
      });
    }
    setSelected(item);
    setModal(null);
  };
  const saveEvent = () => {
    if (!eventForm.servicioId || !eventForm.titulo?.trim()) return;
    const item = { ...eventForm, updatedAt: new Date().toISOString() };
    onSaveEvento && onSaveEvento(item);
    if (item.estado !== "Cerrado" && item.tipo === "Falla") {
      const svc = servicios.find((s) => s.id === item.servicioId);
      if (svc && svc.estado !== "Baja") onSave({ ...svc, estado: "Con falla", updatedAt: new Date().toISOString() });
    }
    setEventModal(null);
  };
  return (
    <div>
      <ModuleHero
        C={C}
        eyebrow="Monitoreo operativo"
        title="Servicios recurrentes"
        subtitle="Control lean de contratos, MRR, protocolos y servicios en activación. La central debe saber quién está activo, qué se monitorea y qué falta antes de facturar."
        actions={<>
          {onGoTab && <Btn C={C} ghost small onClick={() => onGoTab("hitos")}>Ver finanzas</Btn>}
          {!readonly && <Btn C={C} small onClick={openNew}>Nuevo servicio</Btn>}
        </>}
      >
        <WorkflowSteps C={C} active={Math.min(4, [proyectosEnCola.length>0 || servicios.length>0, kpis.activacion.length>0 || kpis.activos.length>0, kpis.incompletos.length===0 && servicios.length>0, kpis.activos.length>0].filter(Boolean).length)} steps={["Proyecto cerrado", "Activación", "Protocolo", "Servicio activo"]}/>
        <div style={{marginTop:12}}>
          <QuickActions C={C} items={[
            {label:`${proyectosEnCola.length} proyectos en cola`,description:"Pueden activar recurrente",tone:proyectosEnCola.length?C.amber:C.green,onClick:()=>setEstado("Todos")},
            {label:`${kpis.incompletos.length} protocolos incompletos`,description:"Bloquean activación",tone:kpis.incompletos.length?C.red:C.green,onClick:()=>setEstado("En activación")},
            {label:`${eventosAbiertos.length} eventos abiertos`,description:"Fallas o reportes",tone:eventosAbiertos.length?C.red:C.green,onClick:()=>setEstado("Con falla")},
            {label:"Facturación esperada",description:"Cruce con finanzas",tone:C.blue,onClick:()=>onGoTab&&onGoTab("hitos")},
          ]}/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 10 }}>
          {[
            ["MRR activo", fmtCLP(kpis.mrrActivo), C.green, `${kpis.activos.length} servicios`],
            ["En activación", fmtCLP(kpis.mrrActivacion), C.amber, `${kpis.activacion.length} servicios · ${proyectosEnCola.length} proyectos`],
            ["Suspendido / falla", fmtCLP(kpis.mrrSuspendido), C.red, `${kpis.suspendidos.length} servicios`],
            ["Protocolos incompletos", String(kpis.incompletos.length), kpis.incompletos.length ? C.amber : C.green, "mínimos operativos"],
            ["Eventos abiertos", String(eventosAbiertos.length), eventosAbiertos.length ? C.red : C.green, "fallas/reportes"],
            ["Total servicios", String((servicios || []).length), C.blue, "cartera recurrente"],
          ].map(([l, v, c, sub]) => (
            <div key={l} style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 8, padding: "14px 15px" }}>
              <div style={{ fontSize: 10, color: C.textM, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 900, fontFamily: ff, lineHeight: 1.25 }}>{l}</div>
              <div style={{ fontSize: String(v).length > 12 ? 18 : 27, fontWeight: 900, color: c, fontFamily: ff, marginTop: 5 }}>{v}</div>
              <div style={{ fontSize: 12, color: C.textM, fontFamily: ff, marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>
      </ModuleHero>
      {proyectosEnCola.length > 0 && !readonly && (
        <div style={{ ...card, marginBottom: 14, borderColor: C.amber + "55" }}>
          <STitle C={C}>Proyectos con monitoreo por activar</STitle>
          <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:-6,marginBottom:10}}>Prioriza proyectos cerrados técnicamente. Los demás quedan visibles como cola temprana.</div>
          <div style={{ display: "grid", gap: 8 }}>
            {proyectosEnCola.slice(0, 6).map((p) => {
              const cl = clientes.find((c) => c.id === p.clienteId);
              const prop = propuestas.find((x) => x.id === p.propuestaId);
              const r = calcProp(prop, params);
              const listo = p.estadoOp === "Cerrado técnicamente" || p.cierreTecnico || p.activacionServicioEstado;
              return (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, padding: "9px 11px" }}>
                  <Bdg color={listo?C.amber:C.textM} small>
                    {listo?"Activar":"En obra"}
                  </Bdg>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, fontFamily: ff }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: C.textM, fontFamily: ff }}>
                      {cl?.razonSocial || "Sin cliente"} · MRR estimado {fmtCLP(r?.iRec || 0)} · {p.estadoOp||"sin estado"}
                    </div>
                  </div>
                  <Btn C={C} ghost small onClick={() => openFromProject(p)}>
                    Crear servicio
                  </Btn>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ display: "flex", gap: 9, marginBottom: 14, flexWrap: "wrap" }}>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar cliente, instalación, código..." style={inputStyle} />
        <Sel C={C} value={estado} onChange={setEstado} opts={["Todos", ...ESTADOS_SERVICIO]} />
      </div>
      <div style={card}>
        {filtrados.length === 0 ? (
          <EmptyState C={C} icon="·" title="Sin servicios" sub="Crea un servicio manual o desde un proyecto con recurrente." />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: C.bg2, borderBottom: "1px solid " + C.border }}>{["Estado", "Servicio", "Cliente / instalación", "Equipos", "MRR", "Protocolo", "Deuda", ""].map((h) => <th key={h} style={thS}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {filtrados.map((s) => {
                  const cl = clienteDe(s);
                  const inst = instalacionDe(s);
                  const protocoloOk = servicioTieneProtocoloCompleto(s);
                  const deuda = saldoCliente(s);
                  const evAbiertos = eventosDe(s.id).filter((e) => e.estado !== "Cerrado").length;
                  return (
                    <tr key={s.id} style={{ cursor: "pointer" }} onClick={() => setSelected(selected?.id === s.id ? null : s)}>
                      <td style={tdS}><Bdg color={COL_SERVICIO[s.estado] || C.textM} small>{s.estado}</Bdg></td>
                      <td style={{ ...tdS, fontWeight: 700, color: C.text }}>{s.codigo || "—"}<div style={{ fontSize: 10, color: C.textM, fontWeight: 500 }}>{s.tipoServicio}</div></td>
                      <td style={tdS}>{cl?.razonSocial || "—"}<div style={{ fontSize: 10, color: C.textM }}>{inst?.nombre || "Sin instalación"}</div></td>
                      <td style={tdS}>{s.camaras || 0} cámaras · {s.alarmas || 0} alarmas</td>
                      <td style={{ ...tdS, color: C.green, fontWeight: 800 }}>{fmtCLP(s.valorMensual || 0)}</td>
                      <td style={tdS}><Bdg color={protocoloOk ? C.green : C.amber} small>{protocoloOk ? "Completo" : "Incompleto"}</Bdg></td>
                      <td style={{ ...tdS, color: deuda > 0 || evAbiertos ? C.red : C.green, fontWeight: 700 }}>{deuda > 0 ? fmtCLP(deuda) : evAbiertos ? `${evAbiertos} evento(s)` : "Sin deuda"}</td>
                      <td style={tdS} onClick={(e) => e.stopPropagation()}>{!readonly && <div style={{ display: "flex", gap: 5 }}><Btn C={C} ghost small onClick={() => openEvent(s)}>Evento</Btn><Btn C={C} ghost small onClick={() => { setForm({ ...s }); setModal("edit"); }}>Editar</Btn><Btn C={C} ghost small color={C.red} onClick={() => onDelete(s.id)}>Eliminar</Btn></div>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {selected && (
        <Card C={C} style={{ marginTop: 14, border: "1px solid " + (COL_SERVICIO[selected.estado] || C.border) + "55" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
            <div><STitle C={C}>{selected.codigo || "Servicio recurrente"}</STitle><div style={{ fontSize: 12, color: C.textM, fontFamily: ff }}>{clienteDe(selected)?.razonSocial || "—"} · {instalacionDe(selected)?.nombre || "—"} · {selected.tipoServicio}</div></div>
            <Bdg color={COL_SERVICIO[selected.estado] || C.textM}>{selected.estado}</Bdg>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 12 }}>
            <Stat C={C} label="MRR" value={fmtCLP(selected.valorMensual || 0)} color={C.green} small />
            <Stat C={C} label="Cámaras" value={String(selected.camaras || 0)} color={C.blue} small />
            <Stat C={C} label="Alarmas" value={String(selected.alarmas || 0)} color={C.amber} small />
            <Stat C={C} label="Inicio" value={selected.fechaInicio || "—"} color={selected.fechaInicio ? C.text : C.amber} small />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, padding: "12px" }}><div style={{ fontSize: 10, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, marginBottom: 7 }}>Protocolo</div><div style={{ fontSize: 12, color: C.textS, fontFamily: ff, whiteSpace: "pre-wrap" }}>{selected.horario ? `Horario: ${selected.horario}\n` : ""}{selected.instrucciones || "Sin instrucciones registradas."}</div></div>
            <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, padding: "12px" }}><div style={{ fontSize: 10, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800, marginBottom: 7 }}>Contactos</div>{(selected.contactos || []).length === 0 ? <div style={{ fontSize: 12, color: C.textM }}>Sin contactos.</div> : (selected.contactos || []).map((c) => <div key={c.id} style={{ fontSize: 12, color: C.textS, fontFamily: ff, marginBottom: 5 }}>{c.nombre || "Contacto"} · {c.telefono || c.email || "sin dato"} {c.rol ? `· ${c.rol}` : ""}</div>)}</div>
          </div>
          <div style={{ marginTop: 12, background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, padding: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 800 }}>Eventos del servicio</div>
              {!readonly && <Btn C={C} ghost small onClick={() => openEvent(selected)}>Registrar evento</Btn>}
            </div>
            {eventosDe(selected.id).length === 0 ? <div style={{ fontSize: 12, color: C.textM, fontFamily: ff }}>Sin eventos registrados.</div> : eventosDe(selected.id).slice(0, 6).map((e) => (
              <div key={e.id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "7px 0", borderTop: "1px solid " + C.border }}>
                <Bdg color={e.estado === "Cerrado" ? C.green : e.severidad === "Crítica" ? C.red : C.amber} small>{e.estado}</Bdg>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, color: C.text, fontWeight: 700, fontFamily: ff }}>{e.titulo}</div>
                  <div style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>{e.tipo} · {e.severidad} · {(e.fecha || e.createdAt || "").slice(0, 16).replace("T", " ")}</div>
                </div>
                {!readonly && <button onClick={() => onDeleteEvento && onDeleteEvento(e.id)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 14 }}>×</button>}
              </div>
            ))}
          </div>
        </Card>
      )}
      {modal === "edit" && (
        <Modal C={C} title={form.id && servicios.some((s) => s.id === form.id) ? "Editar servicio" : "Nuevo servicio"} onClose={() => setModal(null)} width={820}>
          <G cols={2}>
            <Fld C={C} label="Cliente" req><Sel C={C} value={form.clienteId || ""} onChange={(v) => { sf("clienteId", v); if (!form.instalacionId) { const inst = instalaciones.find((i) => i.clienteId === v); if (inst) sf("instalacionId", inst.id); } }} opts={clientes.map((c) => ({ value: c.id, label: c.razonSocial || c.nombreComercial || "Cliente" }))} placeholder="Seleccionar cliente" /></Fld>
            <Fld C={C} label="Instalación" req><Sel C={C} value={form.instalacionId || ""} onChange={(v) => sf("instalacionId", v)} opts={instalaciones.filter((i) => !form.clienteId || i.clienteId === form.clienteId).map((i) => ({ value: i.id, label: i.nombre || "Instalación" }))} placeholder="Seleccionar instalación" /></Fld>
            <Fld C={C} label="Tipo de servicio"><Sel C={C} value={form.tipoServicio || "Monitoreo cámaras"} onChange={(v) => sf("tipoServicio", v)} opts={TIPOS_SERVICIO_OPERATIVO} /></Fld>
            <Fld C={C} label="Estado"><Sel C={C} value={form.estado || "En activación"} onChange={(v) => sf("estado", v)} opts={ESTADOS_SERVICIO} /></Fld>
            <Fld C={C} label="Valor mensual" prefix="$"><Inp C={C} value={form.valorMensual || 0} onChange={(v) => sf("valorMensual", +v || 0)} type="number" /></Fld>
            <Fld C={C} label="Periodicidad"><Sel C={C} value={form.periodicidad || "Mensual"} onChange={(v) => sf("periodicidad", v)} opts={PERIODOS_FACTURACION} /></Fld>
            <Fld C={C} label="Fecha inicio"><Inp C={C} value={form.fechaInicio || ""} onChange={(v) => sf("fechaInicio", v)} type="date" /></Fld>
            <Fld C={C} label="Responsable"><Inp C={C} value={form.responsable || ""} onChange={(v) => sf("responsable", v)} placeholder="Ej: Operaciones / Monitorista" /></Fld>
            <Fld C={C} label="Cámaras"><Inp C={C} value={form.camaras || 0} onChange={(v) => sf("camaras", +v || 0)} type="number" /></Fld>
            <Fld C={C} label="Alarmas"><Inp C={C} value={form.alarmas || 0} onChange={(v) => sf("alarmas", +v || 0)} type="number" /></Fld>
          </G>
          <Fld C={C} label="Horario / ventana operativa"><Inp C={C} value={form.horario || ""} onChange={(v) => sf("horario", v)} placeholder="Ej: Lunes a domingo 20:00 a 08:00" /></Fld>
          <Fld C={C} label="Instrucciones de protocolo">
            <textarea value={form.instrucciones || ""} onChange={(e) => sf("instrucciones", e.target.value)} rows={3} style={{ width: "100%", boxSizing: "border-box", background: C.bg0, border: "1px solid " + C.border, borderRadius: 5, color: C.text, padding: "9px 11px", fontSize: 13, fontFamily: ff, outline: "none", resize: "vertical" }} placeholder="Qué hacer ante alarma, falla, acceso no autorizado, contacto escalamiento..." />
          </Fld>
          <Card C={C} style={{ background: C.bg2 }}>
            <STitle C={C} action={!readonly && <Btn C={C} ghost small onClick={addContacto}>Agregar contacto</Btn>}>Contactos operativos</STitle>
            {(form.contactos || []).length === 0 && <div style={{ fontSize: 12, color: C.textM, fontFamily: ff }}>Agrega al menos un contacto para poder activar el servicio.</div>}
            {(form.contactos || []).map((c, i) => (
              <div key={c.id || i} style={{ display: "grid", gridTemplateColumns: "1fr 130px 1fr 110px 30px", gap: 8, marginBottom: 8 }}>
                <Inp C={C} value={c.nombre || ""} onChange={(v) => updContacto(i, "nombre", v)} placeholder="Nombre" />
                <Inp C={C} value={c.telefono || ""} onChange={(v) => updContacto(i, "telefono", v)} placeholder="Teléfono" />
                <Inp C={C} value={c.email || ""} onChange={(v) => updContacto(i, "email", v)} placeholder="Email" />
                <Inp C={C} value={c.rol || ""} onChange={(v) => updContacto(i, "rol", v)} placeholder="Rol" />
                <button onClick={() => removeContacto(i)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer" }}>×</button>
              </div>
            ))}
          </Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 14, paddingTop: 12, borderTop: "1px solid " + C.border }}>
            <Bdg color={servicioTieneProtocoloCompleto(form) ? C.green : C.amber}>{servicioTieneProtocoloCompleto(form) ? "Listo para activar" : "Protocolo incompleto"}</Bdg>
            <div style={{ display: "flex", gap: 8 }}><Btn C={C} ghost onClick={() => setModal(null)}>Cancelar</Btn><Btn C={C} onClick={save}>Guardar servicio</Btn></div>
          </div>
        </Modal>
      )}
      {eventModal === "edit" && (
        <Modal C={C} title="Registrar evento de servicio" onClose={() => setEventModal(null)} width={640}>
          <G cols={2}>
            <Fld C={C} label="Tipo"><Sel C={C} value={eventForm.tipo || "Falla"} onChange={(v) => setEventForm((f) => ({ ...f, tipo: v }))} opts={["Falla", "Incidencia", "Reporte", "Mantención", "Observación"]} /></Fld>
            <Fld C={C} label="Severidad"><Sel C={C} value={eventForm.severidad || "Media"} onChange={(v) => setEventForm((f) => ({ ...f, severidad: v }))} opts={["Baja", "Media", "Alta", "Crítica"]} /></Fld>
            <Fld C={C} label="Estado"><Sel C={C} value={eventForm.estado || "Abierto"} onChange={(v) => setEventForm((f) => ({ ...f, estado: v }))} opts={["Abierto", "En proceso", "Cerrado"]} /></Fld>
            <Fld C={C} label="Fecha"><Inp C={C} value={(eventForm.fecha || "").slice(0, 10)} onChange={(v) => setEventForm((f) => ({ ...f, fecha: v ? new Date(v).toISOString() : new Date().toISOString() }))} type="date" /></Fld>
          </G>
          <Fld C={C} label="Título" req><Inp C={C} value={eventForm.titulo || ""} onChange={(v) => setEventForm((f) => ({ ...f, titulo: v }))} placeholder="Ej: Cámara 4 sin señal" /></Fld>
          <Fld C={C} label="Descripción">
            <textarea value={eventForm.descripcion || ""} onChange={(e) => setEventForm((f) => ({ ...f, descripcion: e.target.value }))} rows={3} style={{ width: "100%", boxSizing: "border-box", background: C.bg0, border: "1px solid " + C.border, borderRadius: 5, color: C.text, padding: "9px 11px", fontSize: 13, fontFamily: ff, outline: "none", resize: "vertical" }} placeholder="Detalle operativo, acciones tomadas, contacto informado..." />
          </Fld>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
            <Btn C={C} ghost onClick={() => setEventModal(null)}>Cancelar</Btn>
            <Btn C={C} onClick={saveEvent} disabled={!eventForm.titulo?.trim()}>Guardar evento</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}
