import { useState } from "react";
import { ff, SERVICIOS_REC_DEF, TIPOS_PROYECTO_DEF } from "../config/appConstants";
import { Bdg, Btn, Card, Fld, G, Inp, Lbl, STitle } from "../components/ui";
import { repositories as repo } from "../services/repositories";
import { dataService } from "../services/dataService";
import { buildBackupPayload, restoreBackupPayload } from "../services/backupService";
import { BACKEND_SYNC_DEFAULT_URL, checkBackendHealth, pullBackendSnapshot, pushLocalSnapshotToBackend } from "../services/backendSyncService";
import { calcCostoKm } from "../domain/operations";
import ConfigIntegracionesView from "./ConfigIntegracionesView";

const newId = () => dataService.id();

export default function ConfigView({ C, params, categorias, ejecutivos, onSaveParams, onSaveCats, onSaveEjecs, readonly }) {
  const [tab, setTab] = useState("comercial");
  const [form, setForm] = useState({ ...params });
  const [cats, setCats] = useState([ ...categorias ]);
  const [ejecs, setEjecs] = useState([ ...ejecutivos ]);
  const [newCat, setNewCat] = useState("");
  const [newEjec, setNewEjec] = useState("");
  const [saved, setSaved] = useState(false);
  const [ufSt, setUfSt] = useState("");
  const [backendUrl, setBackendUrl] = useState(BACKEND_SYNC_DEFAULT_URL);
  const [backendStatus, setBackendStatus] = useState(null);
  const sf = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const saveAll = () => {
    onSaveParams(form);
    onSaveCats(cats);
    onSaveEjecs(ejecs);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };
  const fetchUF = async () => {
    setUfSt("loading");
    try {
      const r = await fetch("https://mindicador.cl/api/uf");
      if (!r.ok) throw new Error();
      const d = await r.json();
      const v = d?.serie?.[0]?.valor;
      if (!v) throw new Error();
      const roundedUF = Math.round(v);
      sf("ufValue", roundedUF);
      onSaveParams({ ...form, ufValue: roundedUF });
      setUfSt("ok");
      setTimeout(() => setUfSt(""), 4000);
    } catch {
      setUfSt("error");
      setTimeout(() => setUfSt(""), 4000);
    }
  };
  const runBackendAction = async (action) => {
    setBackendStatus({ type: "loading", msg: "Conectando con backend local..." });
    try {
      const result = await action();
      setBackendStatus({ type: "ok", msg: result });
    } catch (error) {
      setBackendStatus({ type: "error", msg: error.message || "No se pudo conectar con backend local." });
    }
  };
  const nf = (k, l, suf, pre) => (
    <Fld C={C} label={l} suffix={suf} prefix={pre}>
      <Inp C={C} value={form[k] ?? 0} onChange={(v) => sf(k, v)} type="number" disabled={readonly} />
    </Fld>
  );

  const TABS_CFG = [
    ["comercial", "Comercial"],
    ["operativo", "Operaciones"],
    ["maestros", "Maestros"],
    ["integra", "Integraciones"],
    ["sistema", "Sistema"],
  ];

  return (
    <div>
      <div style={{ display: "flex", gap: 3, marginBottom: 14, background: C.bg1, padding: 3, borderRadius: 6, border: "1px solid " + C.border, width: "fit-content" }}>
        {TABS_CFG.map(([id, lbl]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: "6px 18px", borderRadius: 5, cursor: "pointer", fontSize: 10, fontWeight: 600,
              background: tab === id ? C.blue : "transparent", color: tab === id ? "#fff" : C.textM,
              border: "none", fontFamily: ff, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            {lbl}
          </button>
        ))}
      </div>

      {tab === "comercial" && <>
        <Card C={C}>
          <STitle C={C}>Valor UF</STitle>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Fld C={C} label="Valor UF actual" prefix="$">
                <Inp C={C} value={form.ufValue ?? 0} onChange={(v) => sf("ufValue", v)} type="number" disabled={readonly} />
              </Fld>
            </div>
            {!readonly && <div style={{ marginBottom: 14 }}>
              <button onClick={fetchUF} disabled={ufSt === "loading"} style={{ background: ufSt === "ok" ? C.green : ufSt === "error" ? C.red : C.blue, color: "#fff", border: "none", borderRadius: 5, padding: "8px 14px", cursor: "pointer", fontSize: 10, fontWeight: 700, fontFamily: ff, textTransform: "uppercase", whiteSpace: "nowrap", opacity: ufSt === "loading" ? 0.6 : 1 }}>{ufSt === "loading" ? "Cargando..." : ufSt === "ok" ? "OK" : ufSt === "error" ? "Error" : "Actualizar UF"}</button>
            </div>}
          </div>
        </Card>
        <Card C={C}>
          <STitle C={C}>Tarifas por defecto</STitle>
          <G cols={4}>
            {nf("ufCamara", "UF cámara monitoreo", "UF/cam")}
            {nf("ufVideoVerif", "UF video verificación", "UF/cta")}
            {nf("ufAlarma", "UF panel alarma", "UF/panel")}
            {nf("duracionContrato", "Duración contrato", "meses")}
          </G>
        </Card>
        <Card C={C}>
          <STitle C={C}>Parámetros de rentabilidad de proyectos</STitle>
          <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Porcentajes por defecto para el cálculo de costos reales. Editables por proyecto.</div>
          <G cols={3}>
            {nf("pctGG", "Gastos generales", "%")}
            {nf("pctImp", "Imprevistos", "%")}
            {nf("pctMargenMinimo", "Margen mínimo esperado", "%")}
          </G>
        </Card>
        <Card C={C}>
          <STitle C={C} action={<span style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>{ejecs.length} ejecutivos</span>}>Ejecutivos comerciales</STitle>
          <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Lista de ejecutivos disponibles para asignar en clientes y propuestas.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 14 }}>
            {ejecs.map((ej) => (
              <div key={ej} style={{ display: "flex", alignItems: "center", gap: 6, background: C.bg2, borderRadius: 5, padding: "6px 10px", border: "1px solid " + C.border }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.blue + "22", border: "1px solid " + C.blue + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: C.blue, flexShrink: 0 }}>{ej.slice(0, 1).toUpperCase()}</div>
                <span style={{ fontSize: 12, color: C.textS, fontFamily: ff }}>{ej}</span>
                {!readonly && <button onClick={() => setEjecs((es) => es.filter((x) => x !== ej))} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 12, padding: "0 2px", lineHeight: 1 }}>x</button>}
              </div>
            ))}
          </div>
          {!readonly && (
            <div style={{ display: "flex", gap: 7 }}>
              <Inp C={C} value={newEjec} onChange={setNewEjec} placeholder="Nombre del ejecutivo..." style={{ maxWidth: 260 }} />
              <Btn C={C} variant="soft" onClick={() => { const n = newEjec.trim(); if (!n || ejecs.includes(n)) return; setEjecs((es) => [ ...es, n ]); setNewEjec(""); }} disabled={!newEjec.trim()}>+ Agregar</Btn>
            </div>
          )}
        </Card>
        <Card C={C}>
          <STitle C={C} action={<span style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>{cats.length} categorías</span>}>Categorías de servicio</STitle>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px,1fr))", gap: 7, marginBottom: 14 }}>
            {cats.map((cat, i) => <div key={cat} style={{ display: "flex", alignItems: "center", gap: 6, background: C.bg2, borderRadius: 5, padding: "7px 10px", border: "1px solid " + C.border }}>
              <span style={{ flex: 1, fontSize: 12, color: C.textS, fontFamily: ff }}>{cat}</span>
              {!readonly && <div style={{ display: "flex", gap: 2 }}>
                <button onClick={() => { const a = [ ...cats ]; if (i > 0) { [a[i], a[i - 1]] = [a[i - 1], a[i]]; setCats(a); } }} disabled={i === 0} style={{ background: "transparent", border: "none", color: C.textM, cursor: "pointer", fontSize: 11, opacity: i === 0 ? 0.3 : 1 }}>↑</button>
                <button onClick={() => { const a = [ ...cats ]; if (i < a.length - 1) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; setCats(a); } }} disabled={i === cats.length - 1} style={{ background: "transparent", border: "none", color: C.textM, cursor: "pointer", fontSize: 11, opacity: i === cats.length - 1 ? 0.3 : 1 }}>↓</button>
                <button onClick={() => setCats((cs) => cs.filter((x) => x !== cat))} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 12 }}>x</button>
              </div>}
            </div>)}
          </div>
          {!readonly && <div style={{ display: "flex", gap: 7 }}>
            <Inp C={C} value={newCat} onChange={setNewCat} placeholder="Nueva categoría..." />
            <Btn C={C} variant="soft" onClick={() => { if (!newCat.trim() || cats.includes(newCat.trim())) return; setCats((cs) => [ ...cs, newCat.trim() ]); setNewCat(""); }} disabled={!newCat.trim()}>+ Agregar</Btn>
          </div>}
        </Card>
      </>}

      {tab === "operativo" && <ConfigOperativa C={C} form={form} sf={sf} setForm={setForm} readonly={readonly} />}
      {tab === "maestros" && <ConfigMaestros C={C} form={form} setForm={setForm} readonly={readonly} />}
      {tab === "integra" && <ConfigIntegracionesView C={C} readonly={readonly} />}

      {tab === "sistema" && <>
        <Card C={C}>
          <STitle C={C}>Numeración de cotizaciones</STitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0 14px", alignItems: "end" }}>
            <Fld C={C} label="Prefijo" suffix=""><Inp C={C} value={form.cotPrefijo || "COT"} onChange={(v) => sf("cotPrefijo", v.toUpperCase())} disabled={readonly} /></Fld>
            <div style={{ marginBottom: 14 }}>
              <Lbl C={C} ch="Formato resultante" />
              <div style={{ padding: "8px 11px", background: C.bg0, border: "1px solid " + C.border, borderRadius: 5, fontSize: 13, color: C.blue, fontFamily: ff }}>{(form.cotPrefijo || "COT").toUpperCase()}-{new Date().getFullYear()}-001</div>
            </div>
            {!readonly && <div style={{ marginBottom: 14 }}>
              <Lbl C={C} ch="Correlativo actual" />
              <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                <div style={{ padding: "8px 11px", background: C.bg0, border: "1px solid " + C.border, borderRadius: 5, fontSize: 13, color: C.text, fontFamily: ff, flex: 1 }}>{repo.cotCounter.get().counter || 0}</div>
                <Btn C={C} variant="ghost" small color={C.red} onClick={() => { if (window.confirm("¿Resetear el correlativo a 0?")) repo.cotCounter.set({ counter: 0 }); }}>Resetear</Btn>
              </div>
            </div>}
          </div>
        </Card>
        <Card C={C} style={{ border: "1px solid " + C.amber + "44" }}>
          <STitle C={C} action={<Bdg color={C.amber} small>Importante</Bdg>}>Respaldo de datos</STitle>
          <div style={{ fontSize: 12, color: C.textM, fontFamily: ff, marginBottom: 14 }}>Exporta todos los datos del sistema como archivo JSON. Guárdalo en lugar seguro antes de actualizaciones o cambios importantes.</div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <Btn C={C} variant="soft" onClick={() => {
              const data = buildBackupPayload();
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "assur-backup-" + new Date().toISOString().slice(0, 10) + ".json";
              a.click();
              URL.revokeObjectURL(url);
            }}>Exportar backup</Btn>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 14px", background: C.bg2, border: "1px solid " + C.border, borderRadius: 5, cursor: "pointer", fontSize: 13, color: C.textS, fontFamily: ff }}>
              Restaurar backup
              <input type="file" accept=".json" style={{ display: "none" }} onChange={(e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                  try {
                    const d = JSON.parse(ev.target.result);
                    if (!window.confirm("¿Restaurar backup del " + d.exportedAt?.slice(0, 10) + "? Se sobreescribirán todos los datos actuales.")) return;
                    restoreBackupPayload(d);
                    alert("Backup restaurado correctamente. Recargando...");
                    window.location.reload();
                  } catch {
                    alert("Error al leer el archivo. Asegúrate de que sea un backup válido de Assur Control.");
                  }
                };
                reader.readAsText(file);
                e.target.value = "";
              }} />
            </label>
          </div>
          <div style={{ marginTop: 12, padding: "8px 12px", background: C.amber + "11", borderRadius: 5, border: "1px solid " + C.amber + "33", fontSize: 11, color: C.amber, fontFamily: ff }}>
            Clientes: {repo.clientes.list().length} · Propuestas: {repo.propuestas.list().length} · Proyectos: {repo.proyectos.list().length} · Instalaciones: {repo.instalaciones.list().length} · Técnicos: {repo.tecnicos.list().length}
          </div>
        </Card>
        <Card C={C}>
          <STitle C={C} action={<Bdg color={C.blue} small>Backend local</Bdg>}>Sincronización técnica</STitle>
          <div style={{ fontSize: 12, color: C.textM, fontFamily: ff, marginBottom: 14 }}>
            Puente temporal para guardar datos fuera del navegador antes de migrar a Supabase. No sincroniza usuarios, sesiones ni credenciales.
          </div>
          <Fld C={C} label="URL backend">
            <Inp C={C} value={backendUrl} onChange={setBackendUrl} disabled={readonly} />
          </Fld>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 4 }}>
            <Btn C={C} variant="ghost" onClick={() => runBackendAction(async () => {
              const health = await checkBackendHealth(backendUrl);
              return `Backend activo · ${health.keys} colecciones persistidas`;
            })}>Probar conexión</Btn>
            {!readonly && <Btn C={C} variant="soft" onClick={() => runBackendAction(async () => {
              const result = await pushLocalSnapshotToBackend({ baseUrl: backendUrl });
              return `Datos enviados · ${result.keys} claves en backend`;
            })}>Subir datos locales</Btn>}
            {!readonly && <Btn C={C} variant="soft" color={C.amber} onClick={() => {
              if (!window.confirm("¿Bajar datos desde backend local? Se reemplazarán las colecciones locales sincronizadas.")) return;
              runBackendAction(async () => {
                const result = await pullBackendSnapshot({ baseUrl: backendUrl });
                setTimeout(() => window.location.reload(), 900);
                return `Datos restaurados · ${result.restored} colecciones`;
              });
            }}>Bajar datos desde backend</Btn>}
          </div>
          {backendStatus && (
            <div style={{ marginTop: 12, padding: "8px 12px", background: (backendStatus.type === "error" ? C.red : backendStatus.type === "ok" ? C.green : C.blue) + "11", borderRadius: 5, border: "1px solid " + (backendStatus.type === "error" ? C.red : backendStatus.type === "ok" ? C.green : C.blue) + "33", fontSize: 11, color: backendStatus.type === "error" ? C.red : backendStatus.type === "ok" ? C.green : C.blue, fontFamily: ff }}>
              {backendStatus.msg}
            </div>
          )}
        </Card>
      </>}

      {!readonly && <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn C={C} onClick={saveAll}>{saved ? "Guardado" : "Guardar configuración"}</Btn></div>}
    </div>
  );
}

function ConfigMaestros({ C, form, setForm, readonly }) {
  const tipos = form.tiposProyecto || TIPOS_PROYECTO_DEF;
  const svcRec = form.serviciosRecurrentes || SERVICIOS_REC_DEF;
  const updTipo = (i, k, v) => { const a = [ ...tipos ]; a[i] = { ...a[i], [k]: v }; setForm((f) => ({ ...f, tiposProyecto: a })); };
  const addTipo = () => { setForm((f) => ({ ...f, tiposProyecto: [ ...tipos, { id: "tp_" + newId(), nombre: "Nuevo tipo", activo: true } ] })); };
  const delTipo = (i) => { if (!window.confirm("¿Eliminar este tipo de proyecto?")) return; const a = tipos.filter((_, j) => j !== i); setForm((f) => ({ ...f, tiposProyecto: a })); };
  const updSvc = (i, k, v) => { const a = [ ...svcRec ]; a[i] = { ...a[i], [k]: v }; setForm((f) => ({ ...f, serviciosRecurrentes: a })); };
  const addSvc = () => { setForm((f) => ({ ...f, serviciosRecurrentes: [ ...svcRec, { id: "svc_" + newId(), nombre: "Nuevo servicio", ufUnitario: 0, unidad: "unidad", activo: true } ] })); };
  const delSvc = (i) => { if (!window.confirm("¿Eliminar este servicio?")) return; const a = svcRec.filter((_, j) => j !== i); setForm((f) => ({ ...f, serviciosRecurrentes: a })); };

  return <div>
    <Card C={C}>
      <STitle C={C} action={<span style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>{tipos.length} tipos</span>}>Tipos de proyecto</STitle>
      <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Se usan al crear cotizaciones para categorizar el tipo de trabajo. Puedes agregar nuevos tipos según los servicios que ofrezcas.</div>
      <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 60px", gap: 0, background: C.bg1, borderBottom: "1px solid " + C.border, padding: "7px 12px", fontSize: 9, color: C.textM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: ff }}>
          <div>Nombre</div><div style={{ textAlign: "center" }}>Activo</div><div></div>
        </div>
        {tipos.map((t, i) => (
          <div key={t.id || i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 60px", gap: 0, padding: "7px 12px", borderBottom: i < tipos.length - 1 ? "1px solid " + C.border : "none", alignItems: "center" }}>
            {readonly ? <span style={{ fontSize: 13, color: C.text, fontFamily: ff }}>{t.nombre}</span> : <input value={t.nombre} onChange={(e) => updTipo(i, "nombre", e.target.value)} style={{ background: "transparent", border: "none", color: C.text, fontSize: 13, fontFamily: ff, outline: "none", padding: "2px 0", width: "100%" }} />}
            <div style={{ textAlign: "center" }}><input type="checkbox" checked={t.activo !== false} onChange={(e) => updTipo(i, "activo", e.target.checked)} disabled={readonly} style={{ accentColor: C.blue, cursor: readonly ? "default" : "pointer" }} /></div>
            <div style={{ textAlign: "right" }}>{!readonly && <button onClick={() => delTipo(i)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 13, padding: "2px 8px" }}>x</button>}</div>
          </div>
        ))}
      </div>
      {!readonly && <Btn C={C} variant="soft" small onClick={addTipo}>+ Agregar tipo</Btn>}
    </Card>

    <Card C={C}>
      <STitle C={C} action={<span style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>{svcRec.length} servicios</span>}>Servicios recurrentes</STitle>
      <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Servicios de monitoreo y suscripción que se incluyen en cotizaciones. El precio en UF por unidad se usa en el cálculo automático del MRR.</div>
      <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 80px 80px 60px", gap: 0, background: C.bg1, borderBottom: "1px solid " + C.border, padding: "7px 12px", fontSize: 9, color: C.textM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: ff }}>
          <div>Nombre del servicio</div><div style={{ textAlign: "center" }}>UF / unidad</div><div style={{ textAlign: "center" }}>Unidad</div><div style={{ textAlign: "center" }}>Activo</div><div></div>
        </div>
        {svcRec.map((s, i) => (
          <div key={s.id || i} style={{ display: "grid", gridTemplateColumns: "1fr 90px 80px 80px 60px", gap: 0, padding: "7px 12px", borderBottom: i < svcRec.length - 1 ? "1px solid " + C.border : "none", alignItems: "center" }}>
            {readonly ? <span style={{ fontSize: 13, color: C.text, fontFamily: ff }}>{s.nombre}</span> : <input value={s.nombre} onChange={(e) => updSvc(i, "nombre", e.target.value)} style={{ background: "transparent", border: "none", color: C.text, fontSize: 13, fontFamily: ff, outline: "none", padding: "2px 0", width: "100%" }} />}
            <div style={{ textAlign: "center", display: "flex", alignItems: "center", gap: 4, justifyContent: "center" }}>
              {readonly ? <span style={{ fontSize: 12, fontWeight: 700, color: C.blue, fontFamily: ff }}>{s.ufUnitario} UF</span> : <input type="number" step="0.01" value={s.ufUnitario || 0} onChange={(e) => updSvc(i, "ufUnitario", parseFloat(e.target.value) || 0)} disabled={readonly} style={{ background: C.bg0, border: "1px solid " + C.border, borderRadius: 4, color: C.text, fontSize: 12, fontFamily: ff, textAlign: "right", padding: "3px 6px", width: 60, outline: "none" }} />}
              {!readonly && <span style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>UF</span>}
            </div>
            <div style={{ textAlign: "center" }}>{readonly ? <span style={{ fontSize: 11, color: C.textM, fontFamily: ff }}>{s.unidad}</span> : <input value={s.unidad || ""} onChange={(e) => updSvc(i, "unidad", e.target.value)} placeholder="unidad" style={{ background: C.bg0, border: "1px solid " + C.border, borderRadius: 4, color: C.text, fontSize: 11, fontFamily: ff, padding: "3px 6px", width: 72, outline: "none", textAlign: "center" }} />}</div>
            <div style={{ textAlign: "center" }}><input type="checkbox" checked={s.activo !== false} onChange={(e) => updSvc(i, "activo", e.target.checked)} disabled={readonly} style={{ accentColor: C.blue, cursor: readonly ? "default" : "pointer" }} /></div>
            <div style={{ textAlign: "right" }}>{!readonly && <button onClick={() => delSvc(i)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 13, padding: "2px 8px" }}>x</button>}</div>
          </div>
        ))}
      </div>
      {!readonly && <Btn C={C} variant="soft" small onClick={addSvc}>+ Agregar servicio</Btn>}
      <div style={{ marginTop: 12, padding: "8px 12px", background: C.blue + "11", borderRadius: 5, border: "1px solid " + C.blue + "33", fontSize: 11, color: C.blue, fontFamily: ff }}>
        Los servicios marcados como "Activo" aparecen disponibles al armar cotizaciones. Los inactivos quedan como referencia histórica.
      </div>
    </Card>
  </div>;
}

function ConfigOperativa({ C, form, sf, setForm, readonly }) {
  const nf = (k, l, suf, pre) => (
    <Fld C={C} label={l} suffix={suf} prefix={pre}>
      <Inp C={C} value={form[k] ?? 0} onChange={(v) => sf(k, v)} type="number" disabled={readonly} />
    </Fld>
  );
  const costoKm = calcCostoKm(form);
  const roles = form.rolesTecnicos || [];
  const updRol = (idx, k, v) => { const arr = [ ...roles ]; arr[idx] = { ...arr[idx], [k]: v }; setForm((f) => ({ ...f, rolesTecnicos: arr })); };
  const addRol = () => { const arr = [ ...roles, { id: "rol_" + newId(), nombre: "Nuevo rol", costoHora: 5000, activo: true } ]; setForm((f) => ({ ...f, rolesTecnicos: arr })); };
  const delRol = (idx) => { if (!window.confirm("¿Eliminar este rol?")) return; const arr = roles.filter((_, i) => i !== idx); setForm((f) => ({ ...f, rolesTecnicos: arr })); };
  const tiposH = form.tiposHora || [];
  const updTipo = (idx, k, v) => { const arr = [ ...tiposH ]; arr[idx] = { ...arr[idx], [k]: v }; setForm((f) => ({ ...f, tiposHora: arr })); };

  return <div>
    <Card C={C} style={{ border: "1px solid " + C.blue + "33" }}>
      <STitle C={C} action={<Bdg color={C.blue} small>Ley Chile 2026</Bdg>}>Jornada laboral</STitle>
      <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Conforme a la nueva ley laboral chilena (40-42h semanales). Estos parámetros se usan para cálculo de horas extras.</div>
      <G cols={3}>
        {nf("jornadaSemanalHoras", "Horas semanales", "horas")}
        {nf("diasLaborales", "Días laborales", "días")}
        {nf("horasDiariasNormales", "Horas diarias normales", "horas")}
      </G>
    </Card>

    <Card C={C}>
      <STitle C={C} action={<span style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>{roles.length} roles</span>}>Costos de mano de obra por rol</STitle>
      <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Costo base por hora de cada rol. El sistema calculará automáticamente los recargos según el tipo de hora trabajada.</div>
      <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px 110px 70px", gap: 0, background: C.bg1, borderBottom: "1px solid " + C.border, padding: "7px 12px", fontSize: 9, color: C.textM, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: ff }}>
          <div>Nombre del rol</div><div style={{ textAlign: "right" }}>Costo por hora</div><div style={{ textAlign: "center" }}>Activo</div><div></div>
        </div>
        {roles.map((r, i) => (
          <div key={r.id} style={{ display: "grid", gridTemplateColumns: "1fr 140px 110px 70px", gap: 0, padding: "7px 12px", borderBottom: i < roles.length - 1 ? "1px solid " + C.border : "none", alignItems: "center" }}>
            <input value={r.nombre} onChange={(e) => updRol(i, "nombre", e.target.value)} disabled={readonly} style={{ background: "transparent", border: "none", color: C.text, fontSize: 13, fontFamily: ff, outline: "none", padding: "4px 0" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
              <span style={{ fontSize: 11, color: C.textM, fontFamily: ff }}>$</span>
              <input type="number" value={r.costoHora || 0} onChange={(e) => updRol(i, "costoHora", +e.target.value || 0)} disabled={readonly} style={{ background: C.bg0, border: "1px solid " + C.border, borderRadius: 4, color: C.text, fontSize: 13, fontFamily: ff, outline: "none", padding: "4px 8px", width: 90, textAlign: "right" }} />
              <span style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>/h</span>
            </div>
            <div style={{ textAlign: "center" }}><input type="checkbox" checked={r.activo !== false} onChange={(e) => updRol(i, "activo", e.target.checked)} disabled={readonly} style={{ accentColor: C.blue, cursor: readonly ? "default" : "pointer" }} /></div>
            <div style={{ textAlign: "right" }}>{!readonly && <button onClick={() => delRol(i)} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 13, padding: "2px 8px" }}>x</button>}</div>
          </div>
        ))}
      </div>
      {!readonly && <Btn C={C} variant="soft" small onClick={addRol}>+ Agregar rol</Btn>}
    </Card>

    <Card C={C}>
      <STitle C={C}>Tipos de hora y recargos</STitle>
      <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Configuración de recargos según legislación chilena. Las horas de viaje se incluyen en el costo de mano de obra (sin recargo). Las horas de garantía no se cobran al cliente pero sí imputan costo al proyecto original.</div>
      <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 90px", gap: 0, background: C.bg1, borderBottom: "1px solid " + C.border, padding: "7px 12px", fontSize: 9, color: C.textM, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: ff }}>
          <div>Tipo de hora</div><div style={{ textAlign: "right" }}>Recargo (%)</div><div style={{ textAlign: "center" }}>Activo</div>
        </div>
        {tiposH.map((t, i) => (
          <div key={t.id} style={{ display: "grid", gridTemplateColumns: "1fr 130px 90px", gap: 0, padding: "7px 12px", borderBottom: i < tiposH.length - 1 ? "1px solid " + C.border : "none", alignItems: "center" }}>
            <div style={{ fontSize: 13, color: C.text, fontFamily: ff }}>{t.nombre}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
              <input type="number" value={t.recargo || 0} onChange={(e) => updTipo(i, "recargo", +e.target.value || 0)} disabled={readonly || t.id === "normal" || t.id === "viaje" || t.id === "garantia"} style={{ background: C.bg0, border: "1px solid " + C.border, borderRadius: 4, color: C.text, fontSize: 13, fontFamily: ff, outline: "none", padding: "4px 8px", width: 60, textAlign: "right", opacity: (t.id === "normal" || t.id === "viaje" || t.id === "garantia") ? 0.6 : 1 }} />
              <span style={{ fontSize: 10, color: C.textM, fontFamily: ff }}>%</span>
            </div>
            <div style={{ textAlign: "center" }}><input type="checkbox" checked={t.activo !== false} onChange={(e) => updTipo(i, "activo", e.target.checked)} disabled={readonly} style={{ accentColor: C.blue, cursor: readonly ? "default" : "pointer" }} /></div>
          </div>
        ))}
      </div>
    </Card>

    <Card C={C} style={{ border: "1px solid " + C.green + "33" }}>
      <STitle C={C} action={<Bdg color={C.green} small>Cálculo automático</Bdg>}>Movilización — Costo por kilómetro</STitle>
      <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>El costo por km se calcula automáticamente sumando el costo de combustible y el desgaste del vehículo (basado en el pago de leasing y kilómetros mensuales recorridos).</div>
      <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: C.textM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: ff, marginBottom: 9 }}>Combustible</div>
        <G cols={3}>
          {nf("precioBencina", "Precio de bencina", "$/litro")}
          {nf("rendimientoVehiculo", "Rendimiento vehículo", "km/litro")}
          <Fld C={C} label="Costo combustible"><div style={{ padding: "8px 11px", background: C.bg0, borderRadius: 5, border: "1px solid " + C.green + "44", fontSize: 13, color: C.green, fontFamily: ff, fontWeight: 700 }}>${costoKm.combustible.toLocaleString("es-CL")} / km</div></Fld>
        </G>
      </div>
      <div style={{ background: C.bg2, border: "1px solid " + C.border, borderRadius: 6, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: C.textM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: ff, marginBottom: 9 }}>Desgaste del vehículo</div>
        <G cols={3}>
          {nf("pagoLeasingMensual", "Pago leasing mensual", "$/mes", "$")}
          {nf("kmMensualesPromedio", "Km mensuales promedio", "km/mes")}
          <Fld C={C} label="Costo desgaste"><div style={{ padding: "8px 11px", background: C.bg0, borderRadius: 5, border: "1px solid " + C.amber + "44", fontSize: 13, color: C.amber, fontFamily: ff, fontWeight: 700 }}>${costoKm.desgaste.toLocaleString("es-CL")} / km</div></Fld>
        </G>
      </div>
      <div style={{ background: C.blue + "11", border: "1px solid " + C.blue + "44", borderRadius: 6, padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div><div style={{ fontSize: 10, color: C.textM, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: ff }}>Costo total por kilómetro</div><div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginTop: 3 }}>Combustible + desgaste</div></div>
        <div style={{ fontSize: 24, fontWeight: 300, color: C.blue, fontFamily: ff, fontVariantNumeric: "tabular-nums" }}>${costoKm.total.toLocaleString("es-CL")}/km</div>
      </div>
      <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid " + C.border }}>
        <G cols={2}>
          {nf("peajeReferencial", "Peaje promedio (por viaje)", "$", "$")}
          {nf("encomiendaReferencial", "Encomienda referencial", "$", "$")}
        </G>
      </div>
    </Card>

    <Card C={C}>
      <STitle C={C}>Viáticos y alojamiento</STitle>
      <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Tarifas estándar para colaciones y hospedaje. Política empresa: máximo $10.000 por comida.</div>
      <G cols={4}>
        {nf("desayuno", "Desayuno", "$/comida", "$")}
        {nf("almuerzo", "Almuerzo", "$/comida", "$")}
        {nf("cena", "Cena", "$/comida", "$")}
        {nf("hospedajeNoche", "Hospedaje", "$/noche", "$")}
      </G>
    </Card>

    <Card C={C}>
      <STitle C={C}>Bonos especiales para técnicos</STitle>
      <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Bonos adicionales que se aplican según las características del proyecto. Configurables por proyecto.</div>
      <G cols={2}>
        {nf("bonoNocheFuera", "Bono noche fuera", "$/noche", "$")}
        {nf("bonoKilometraje", "Bono por kilometraje", "$/km", "$")}
        {nf("bonoHorasTraslado", "Bono por horas de traslado", "$/hora", "$")}
        {nf("bonoTratoEspecial", "Bono por trato especial", "$", "$")}
      </G>
      <div style={{ marginTop: 10, padding: "8px 12px", background: C.amber + "11", borderRadius: 5, border: "1px solid " + C.amber + "33", fontSize: 11, color: C.amber, fontFamily: ff }}>Estos bonos son referenciales y se pueden activar/desactivar al armar la cotización del proyecto.</div>
    </Card>

    <Card C={C}>
      <STitle C={C}>Márgenes objetivo por tipo de proyecto</STitle>
      <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, marginBottom: 12 }}>Margen mínimo esperado según el tipo de proyecto. Editable al cotizar.</div>
      <G cols={3}>
        {nf("margenInstalacion", "Instalación nueva", "%")}
        {nf("margenMantencion", "Recableado / Mantención", "%")}
        {nf("margenVisita", "Visita técnica", "%")}
        {nf("margenEmergencia", "Servicio emergencia", "%")}
        {nf("margenSoporte", "Soporte", "%")}
        {nf("margenGarantia", "Garantía", "%")}
      </G>
    </Card>
  </div>;
}
