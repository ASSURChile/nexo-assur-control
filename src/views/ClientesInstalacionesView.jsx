import { useState } from "react";
import { ESTADOS_C, ESTADOS_I, ff, REGIONES, RUBROS } from "../config/appConstants";
import { Bdg, Btn, Card, EmptyState, Fld, G, Inp, Modal, ModuleHero, QuickActions, Sel, SelBusca, WorkflowSteps } from "../components/ui";
import { calcProp } from "../domain/commercial";

const fmtCLP = (n) => (!n && n !== 0 ? "—" : "$ " + Math.round(n).toLocaleString("es-CL"));

export function ClientesView({ C, clientes, instalaciones, propuestas, params, ejecutivos, readonly, onSelect, createCliente, onSaveCliente, onDeleteCliente }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [fE, setFE] = useState("Todos");
  const [confId, setConf] = useState(null);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => {
    if (!form.razonSocial?.trim()) return;
    onSaveCliente({ ...form, updatedAt: new Date().toISOString() });
    setModal(null);
  };
  const remove = (id) => {
    if (propuestas.some((p) => p.clienteId === id) || instalaciones.some((i) => i.clienteId === id)) {
      alert("Este cliente tiene registros asociados.");
      return;
    }
    onDeleteCliente(id);
    setConf(null);
  };
  const filtered = clientes.filter((c) => (fE === "Todos" || c.estado === fE) && (!search || (c.razonSocial || "").toLowerCase().includes(search.toLowerCase()) || (c.nombreComercial || "").toLowerCase().includes(search.toLowerCase()) || (c.rut || "").toLowerCase().includes(search.toLowerCase())));
  const clientesActivos = clientes.filter((c) => c.estado === "Activo").length;
  const prospectos = clientes.filter((c) => c.estado === "Prospecto").length;
  const totalMrr = propuestas.filter((p) => p.estado === "Aprobada").reduce((a, p) => a + (calcProp(p, params)?.iRec || 0), 0);
  const inputStyle = { background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, color: C.text, padding: "10px 13px", fontSize: 13, fontFamily: ff, outline: "none", flex: "1 1 260px", boxShadow: C.isLight ? "0 1px 0 rgba(15,23,41,0.03)" : "none" };
  const openNew = () => {
    setForm(createCliente());
    setModal("new");
  };
  return (
    <div>
      <ModuleHero
        C={C}
        eyebrow="Cartera comercial"
        title="Clientes e instalaciones"
        subtitle="Gestiona primero la cartera activa, luego prospectos y sitios operativos. Cada cliente debe conectar con instalación, propuesta, proyecto y servicio recurrente."
        actions={!readonly && <Btn C={C} onClick={openNew}>Nuevo cliente</Btn>}
      >
        <WorkflowSteps C={C} active={Math.min(3, [clientes.length>0, instalaciones.length>0, propuestas.length>0, totalMrr>0].filter(Boolean).length)} steps={["Cliente", "Instalación", "Propuesta", "MRR"]}/>
        <div style={{marginTop:12}}>
          <QuickActions C={C} items={[
            {label:`${clientesActivos} clientes activos`,description:"Cartera vigente",tone:C.green,onClick:()=>setFE("Activo")},
            {label:`${prospectos} prospectos`,description:"Seguimiento comercial",tone:prospectos?C.amber:C.green,onClick:()=>setFE("Prospecto")},
            {label:`${instalaciones.length} instalaciones`,description:"Sitios operativos",tone:C.blue},
            {label:`${fmtCLP(totalMrr)} MRR`,description:"Recurrente aprobado",tone:C.green},
          ]}/>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
          {[
            ["Clientes", clientes.length, C.text, `${clientesActivos} activos`],
            ["Prospectos", prospectos, C.amber, "por desarrollar"],
            ["Instalaciones", instalaciones.length, C.blue, "sitios registrados"],
            ["MRR aprobado", fmtCLP(totalMrr), C.green, "recurrente estimado"],
          ].map(([label, value, color, sub]) => (
            <div key={label} style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 8, padding: "14px 15px" }}>
              <div style={{ fontSize: 10, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 900, fontFamily: ff }}>{label}</div>
              <div style={{ fontSize: String(value).length > 9 ? 20 : 27, color, fontWeight: 900, fontFamily: ff, marginTop: 5 }}>{value}</div>
              <div style={{ fontSize: 12, color: C.textM, fontFamily: ff, marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <input placeholder="Buscar cliente, RUT..." value={search} onChange={(e) => setSearch(e.target.value)} style={inputStyle} />
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{["Todos", ...ESTADOS_C].map((s) => <button key={s} onClick={() => setFE(s)} style={{ padding: "7px 11px", borderRadius: 8, fontSize: 11, fontWeight: fE === s ? 900 : 700, cursor: "pointer", background: fE === s ? C.blue + "18" : C.bg1, color: fE === s ? C.blue : C.textM, border: "1px solid " + (fE === s ? C.blue + "66" : C.border), fontFamily: ff }}>{s} ({s === "Todos" ? clientes.length : clientes.filter((c) => c.estado === s).length})</button>)}</div>
        </div>
      </ModuleHero>
      {filtered.length === 0 && <EmptyState C={C} icon="·" title="Sin clientes" sub="Agrega el primer cliente" action={!readonly && <Btn C={C} onClick={openNew}>+ Nuevo cliente</Btn>} />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 12 }}>
        {filtered.map((c) => {
          const cp = propuestas.filter((p) => p.clienteId === c.id);
          const ap = cp.filter((p) => p.estado === "Aprobada");
          const mrr = ap.reduce((a, p) => a + (calcProp(p, params)?.iRec || 0), 0);
          const inst = instalaciones.filter((i) => i.clienteId === c.id).length;
          const eCol = c.estado === "Activo" ? C.green : c.estado === "Inactivo" ? C.red : C.amber;
          return (
            <Card key={c.id} C={C} style={{ marginBottom: 0, cursor: "pointer", minHeight: 196, display: "flex", flexDirection: "column" }} onClick={() => onSelect && onSelect(c)}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 9 }}>
                <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: ff, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.razonSocial || c.nombreComercial || "—"}</div><div style={{ fontSize: 11, color: C.textM, fontFamily: ff }}>{c.rut}{c.rut && c.rubro ? " · " : ""}{c.rubro}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 8 }}><Bdg color={eCol} small>{c.estado || "Prospecto"}</Bdg>{!readonly && <div style={{ display: "flex", gap: 3 }} onClick={(e) => e.stopPropagation()}><Btn C={C} ghost small onClick={(e) => { e.stopPropagation(); setForm({ ...c }); setModal("edit"); }}>✎</Btn>{confId === c.id ? <><Btn C={C} color={C.red} small onClick={(e) => { e.stopPropagation(); remove(c.id); }}>✓</Btn><Btn C={C} ghost small onClick={(e) => { e.stopPropagation(); setConf(null); }}>✕</Btn></> : <Btn C={C} ghost color={C.red} small onClick={(e) => { e.stopPropagation(); setConf(c.id); }}>🗑</Btn>}</div>}</div>
              </div>
              {c.ejecutivo && <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 3 }}>Ejecutivo: <span style={{ color: C.textS }}>{c.ejecutivo}</span></div>}
              {c.contacto && <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 3 }}>Contacto: <span style={{ color: C.textS }}>{c.contacto}</span></div>}
              {c.email && <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 8 }}>{c.email}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7, paddingTop: 10, borderTop: "1px solid " + C.border, marginTop: "auto" }}>
                <div><div style={{ fontSize: 9, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: ff, fontWeight: 800 }}>Instalaciones</div><div style={{ fontSize: 18, fontWeight: 850, color: C.textS, fontFamily: ff }}>{inst}</div></div>
                <div><div style={{ fontSize: 9, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: ff, fontWeight: 800 }}>Propuestas</div><div style={{ fontSize: 18, fontWeight: 850, color: C.textS, fontFamily: ff }}>{cp.length}</div></div>
                <div><div style={{ fontSize: 9, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: ff, fontWeight: 800 }}>MRR</div><div style={{ fontSize: 16, fontWeight: 850, color: mrr > 0 ? C.green : C.textM, fontFamily: ff }}>{mrr > 0 ? fmtCLP(mrr) : "—"}</div></div>
              </div>
              <div style={{ marginTop: 9, paddingTop: 8, borderTop: "1px solid " + C.border, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 10, color: C.blue, fontFamily: ff }}>Ver detalle →</span></div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal C={C} title={modal === "new" ? "Nuevo cliente" : "Editar cliente"} onClose={() => setModal(null)} width={640}>
          <G cols={2}><Fld C={C} label="Razón social" req><Inp C={C} value={form.razonSocial || ""} onChange={(v) => sf("razonSocial", v)} /></Fld><Fld C={C} label="Nombre comercial"><Inp C={C} value={form.nombreComercial || ""} onChange={(v) => sf("nombreComercial", v)} /></Fld><Fld C={C} label="RUT"><Inp C={C} value={form.rut || ""} onChange={(v) => sf("rut", v)} placeholder="12.345.678-9" /></Fld><Fld C={C} label="Rubro"><Sel C={C} value={form.rubro || ""} onChange={(v) => sf("rubro", v)} opts={RUBROS} /></Fld><Fld C={C} label="Estado"><Sel C={C} value={form.estado || "Prospecto"} onChange={(v) => sf("estado", v)} opts={ESTADOS_C} /></Fld><Fld C={C} label="Ejecutivo responsable"><Sel C={C} value={form.ejecutivo || ""} onChange={(v) => sf("ejecutivo", v)} opts={ejecutivos} placeholder="— seleccionar —" /></Fld><Fld C={C} label="Contacto"><Inp C={C} value={form.contacto || ""} onChange={(v) => sf("contacto", v)} /></Fld><Fld C={C} label="Teléfono"><Inp C={C} value={form.telefono || ""} onChange={(v) => sf("telefono", v)} /></Fld><Fld C={C} label="Email"><Inp C={C} value={form.email || ""} onChange={(v) => sf("email", v)} type="email" /></Fld><Fld C={C} label="Dirección"><Inp C={C} value={form.direccion || ""} onChange={(v) => sf("direccion", v)} /></Fld></G>
          <Fld C={C} label="Notas"><Inp C={C} value={form.notas || ""} onChange={(v) => sf("notas", v)} /></Fld>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}><Btn C={C} ghost onClick={() => setModal(null)}>Cancelar</Btn><Btn C={C} onClick={save} disabled={!form.razonSocial?.trim()}>Guardar</Btn></div>
        </Modal>
      )}
    </div>
  );
}

export function InstalacionesView({ C, clientes, instalaciones, propuestas, readonly, createInstalacion, onSaveInstalacion, onDeleteInstalacion }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [fC, setFC] = useState("");
  const [confId, setConf] = useState(null);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const save = () => {
    if (!form.nombre?.trim()) return;
    onSaveInstalacion({ ...form, updatedAt: new Date().toISOString() });
    setModal(null);
  };
  const remove = (id) => {
    if (propuestas.some((p) => p.instalacionId === id)) {
      alert("Esta instalación tiene propuestas.");
      return;
    }
    onDeleteInstalacion(id);
    setConf(null);
  };
  const filtered = instalaciones.filter((i) => (fC === "" || i.clienteId === fC) && (!search || (i.nombre || "").toLowerCase().includes(search.toLowerCase()) || (i.comuna || "").toLowerCase().includes(search.toLowerCase())));
  const activas = instalaciones.filter((i) => i.estado === "Activa").length;
  const conPropuestas = instalaciones.filter((i) => propuestas.some((p) => p.instalacionId === i.id)).length;
  const aprobadasInst = propuestas.filter((p) => p.estado === "Aprobada" && p.instalacionId).length;
  return (
    <div>
      <Card C={C} style={{ marginBottom: 16, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900, fontFamily: ff, marginBottom: 7 }}>Sitios operativos</div>
            <div style={{ fontSize: 22, color: C.text, fontWeight: 850, fontFamily: ff, lineHeight: 1.1 }}>Instalaciones</div>
            <div style={{ fontSize: 13, color: C.textM, fontFamily: ff, marginTop: 6 }}>Control de ubicaciones, responsables y relación con propuestas/proyectos.</div>
          </div>
          {!readonly && <Btn C={C} onClick={() => { setForm(createInstalacion("")); setModal("new"); }}>Nueva instalación</Btn>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 10, marginBottom: 16 }}>
          {[
            ["Instalaciones", instalaciones.length, C.text, "total registradas"],
            ["Activas", activas, C.green, "operativas"],
            ["Con propuestas", conPropuestas, C.blue, "actividad comercial"],
            ["Aprobadas", aprobadasInst, C.amber, "proyectos/servicios"],
          ].map(([label, value, color, sub]) => (
            <div key={label} style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 8, padding: "14px 15px" }}>
              <div style={{ fontSize: 10, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 900, fontFamily: ff }}>{label}</div>
              <div style={{ fontSize: 27, color, fontWeight: 900, fontFamily: ff, marginTop: 5 }}>{value}</div>
              <div style={{ fontSize: 12, color: C.textM, fontFamily: ff, marginTop: 3 }}>{sub}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap" }}>
          <input placeholder="Buscar instalación, comuna..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, color: C.text, padding: "10px 13px", fontSize: 13, fontFamily: ff, outline: "none", flex: "1 1 260px", boxShadow: C.isLight ? "0 1px 0 rgba(15,23,41,0.03)" : "none" }} />
          <div style={{ flex: "0 1 320px" }}><SelBusca C={C} value={fC} onChange={setFC} opts={clientes.map((c) => ({ value: c.id, label: c.razonSocial || c.nombreComercial || "—" }))} placeholder="Todos los clientes" /></div>
        </div>
      </Card>
      {filtered.length === 0 && <EmptyState C={C} icon="·" title="Sin instalaciones" sub="Agrega instalaciones a tus clientes" />}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px,1fr))", gap: 12 }}>
        {filtered.map((inst) => {
          const cl = clientes.find((c) => c.id === inst.clienteId);
          const props = propuestas.filter((p) => p.instalacionId === inst.id);
          const eCol = inst.estado === "Activa" ? C.green : C.red;
          return (
            <Card key={inst.id} C={C} style={{ marginBottom: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: C.text, fontFamily: ff, marginBottom: 2 }}>{inst.nombre || "—"}</div><div style={{ fontSize: 11, color: C.blue, fontFamily: ff }}>{cl?.razonSocial || cl?.nombreComercial || "—"}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: 8 }}><Bdg color={eCol} small>{inst.estado || "Activa"}</Bdg>{!readonly && <div style={{ display: "flex", gap: 3 }}><Btn C={C} ghost small onClick={() => { setForm({ ...inst }); setModal("edit"); }}>✎</Btn>{confId === inst.id ? <><Btn C={C} color={C.red} small onClick={() => remove(inst.id)}>✓</Btn><Btn C={C} ghost small onClick={() => setConf(null)}>✕</Btn></> : <Btn C={C} ghost color={C.red} small onClick={() => setConf(inst.id)}>🗑</Btn>}</div>}</div>
              </div>
              {(inst.direccion || inst.comuna || inst.region) && <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 7 }}>{[inst.direccion, inst.comuna, inst.region].filter(Boolean).join(", ")}</div>}
              {inst.responsable && <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 8 }}>Resp.: <span style={{ color: C.textS }}>{inst.responsable}</span></div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, paddingTop: 8, borderTop: "1px solid " + C.border }}>
                <div><div style={{ fontSize: 8, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: ff }}>Propuestas</div><div style={{ fontSize: 15, fontWeight: 300, color: C.textS, fontFamily: ff }}>{props.length}</div></div>
                <div><div style={{ fontSize: 8, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: ff }}>Aprobadas</div><div style={{ fontSize: 15, fontWeight: 300, color: props.filter((p) => p.estado === "Aprobada").length > 0 ? C.green : C.textM, fontFamily: ff }}>{props.filter((p) => p.estado === "Aprobada").length}</div></div>
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal C={C} title={modal === "new" ? "Nueva instalación" : "Editar instalación"} onClose={() => setModal(null)} width={640}>
          <G cols={2}><Fld C={C} label="Cliente" req><SelBusca C={C} value={form.clienteId || ""} onChange={(v) => sf("clienteId", v)} opts={clientes.map((c) => ({ value: c.id, label: c.razonSocial || c.nombreComercial || "—" }))} /></Fld><Fld C={C} label="Nombre instalación" req><Inp C={C} value={form.nombre || ""} onChange={(v) => sf("nombre", v)} /></Fld><Fld C={C} label="Dirección"><Inp C={C} value={form.direccion || ""} onChange={(v) => sf("direccion", v)} /></Fld><Fld C={C} label="Comuna"><Inp C={C} value={form.comuna || ""} onChange={(v) => sf("comuna", v)} /></Fld><Fld C={C} label="Región"><SelBusca C={C} value={form.region || ""} onChange={(v) => sf("region", v)} opts={REGIONES} /></Fld><Fld C={C} label="Estado"><SelBusca C={C} value={form.estado || "Activa"} onChange={(v) => sf("estado", v)} opts={ESTADOS_I} /></Fld><Fld C={C} label="Responsable local"><Inp C={C} value={form.responsable || ""} onChange={(v) => sf("responsable", v)} /></Fld><Fld C={C} label="Teléfono"><Inp C={C} value={form.telefono || ""} onChange={(v) => sf("telefono", v)} /></Fld></G>
          <Fld C={C} label="Observaciones"><Inp C={C} value={form.observaciones || ""} onChange={(v) => sf("observaciones", v)} /></Fld>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10 }}><Btn C={C} ghost onClick={() => setModal(null)}>Cancelar</Btn><Btn C={C} onClick={save} disabled={!form.nombre?.trim() || !form.clienteId}>Guardar</Btn></div>
        </Modal>
      )}
    </div>
  );
}
