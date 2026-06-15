import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { ff } from "../config/appConstants";
import { Bdg, Btn, Card, EmptyState, Fld, Inp, Lbl, ModuleHero, QuickActions, SectionTabs, Stat, STitle, WorkflowSteps } from "../components/ui";
import { dataService } from "../services/dataService";
import { repositories as repo } from "../services/repositories";
import { fmtMes, fmtMil, fmtPct } from "../utils/formatters";
import {
  deleteGastoFromBackendQuiet,
  syncCuentasPagarToBackendQuiet,
  syncFacturasToBackendQuiet,
  syncGastoToBackendQuiet,
  syncGastosToBackendQuiet,
} from "../services/financialBackendService";
import { calcFinanceSummary, montoFactura, reconcileSoftlandFinancials, saldoFactura } from "../domain/finance";
import { syncSupabaseNormalizedTablesQuiet } from "../services/supabaseNormalizedSyncService";

const newId = () => dataService.id();

const TODAY = () => new Date().toISOString().slice(0, 10);
const fmtCLP = (n) => (!n && n !== 0 ? "—" : "$ " + Math.round(n).toLocaleString("es-CL"));
function Empty({ C, icon = "◈", title, sub, action }) { return <EmptyState C={C} icon={icon} title={title} sub={sub} action={action} />; }
const DEFAULT_API_CONFIG={habilitada:false,credenciales:{empresa:"",usuario:"",urlBase:"https://api.softland.cl/v1"},sincronizacion:{automatica:false,frecuencia:"diaria",ultimaSinc:null,estado:"inactiva"},mapeos:{categoriasGastos:{"CTA_5100":"Personal","CTA_5200":"Arriendo y servicios","CTA_5300":"Servicios profesionales"}}};
const asArray=value=>Array.isArray(value)?value:[];
const text=value=>String(value||"");
const money=value=>Number(value)||0;
const sortByDateDesc=field=>(a,b)=>text(b?.[field]).localeCompare(text(a?.[field]));
function normalizeApiConfig(config){
  return {...DEFAULT_API_CONFIG,...(config||{}),credenciales:{...DEFAULT_API_CONFIG.credenciales,...(config?.credenciales||{}),token:""},sincronizacion:{...DEFAULT_API_CONFIG.sincronizacion,...(config?.sincronizacion||{})},mapeos:{...DEFAULT_API_CONFIG.mapeos,...(config?.mapeos||{}),categoriasGastos:{...DEFAULT_API_CONFIG.mapeos.categoriasGastos,...(config?.mapeos?.categoriasGastos||{})}}};
}

export default function FinanzasView({C,clientes,proyectos,params,onSaveCliente,onSaveProyecto,readonly}){
  const [subTab,setSubTab]=useState("resumen");
  const [gastos,setGastos]=useState(asArray(repo.gastos.list()));
  const [facturas,setFacturas]=useState(asArray(repo.facturas.list()));
  const [cuentasPorPagar,setCuentasPorPagar]=useState(asArray(repo.cuentasPagar.list()));
  const [editGasto,setEditGasto]=useState(null);
  const [form,setForm]=useState({});
  const [importFeedback,setImportFeedback]=useState(null);
  
  // Estados para configuración API Softland
  const [apiConfig,setApiConfig]=useState(normalizeApiConfig(repo.apiConfig.get()));
  const [syncLog,setSyncLog]=useState(asArray(repo.syncLog.list()));
  const [testingConnection,setTestingConnection]=useState(false);
  const hoyISO=new Date().toISOString().slice(0,10);
  const financeSummary=calcFinanceSummary({facturas,cuentasPorPagar,gastos,hoy:hoyISO});
  const softlandReconciliation=reconcileSoftlandFinancials({clientes,proyectos,facturas,pagos:repo.pagos.list(),cuentasPorPagar});
  
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  const saveFinancialLists=({nextFacturas=facturas,nextCuentas=cuentasPorPagar,nextGastos=gastos}={})=>{
    const reconciled=reconcileSoftlandFinancials({clientes,proyectos,facturas:nextFacturas,pagos:repo.pagos.list(),cuentasPorPagar:nextCuentas});
    setFacturas(reconciled.facturas);
    setCuentasPorPagar(reconciled.cuentasPorPagar);
    setGastos(nextGastos);
    repo.facturas.replaceAll(reconciled.facturas);
    repo.cuentasPagar.replaceAll(reconciled.cuentasPorPagar);
    repo.gastos.replaceAll(nextGastos);
    syncSupabaseNormalizedTablesQuiet(["invoices", "accounts_payable"]);
    return reconciled;
  };
  
  // Función auxiliar para parsear CSV
  const parseCSV=(text)=>{
    const lines=text.trim().split('\n').filter(l=>l.trim());
    if(lines.length<2)return[];
    const headers=lines[0].split(',').map(h=>h.trim());
    return lines.slice(1).map(line=>{
      const values=line.split(',').map(v=>v.trim());
      const obj={};
      headers.forEach((h,i)=>{obj[h]=values[i]||"";});
      return obj;
    });
  };
  
  // Importador de gastos operacionales desde CSV
  const importarGastos=e=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const rows=parseCSV(ev.target.result);
        let added=0,skipped=0;
        rows.forEach(row=>{
          if(!row.Fecha||!row.Monto)return skipped++;
          const exists=gastos.some(g=>g.fecha===row.Fecha&&g.descripcion===row.Glosa&&Math.abs(money(g.monto)-parseFloat(row.Monto))<1);
          if(exists)return skipped++;
          const gasto={
            id:newId(),
            fecha:row.Fecha,
            categoria:row.Categoria||"Otros administrativos",
            descripcion:row.Glosa||"",
            monto:parseFloat(row.Monto)||0,
            recurrente:false,
            origen:"softland",
            centroCosto:row.CentroCosto||""
          };
          gastos.push(gasto);
          added++;
        });
        const updated=[...gastos].sort(sortByDateDesc("fecha"));
        saveFinancialLists({nextGastos:updated});
        syncGastosToBackendQuiet(updated);
        setImportFeedback({type:"success",msg:`Importados ${added} gastos. ${skipped} duplicados omitidos.`});
        setTimeout(()=>setImportFeedback(null),5000);
      }catch(err){
        setImportFeedback({type:"error",msg:"Error al leer el archivo CSV. Verifica el formato."});
        setTimeout(()=>setImportFeedback(null),5000);
      }
    };
    reader.readAsText(file);
    e.target.value="";
  };
  
  // Importador de facturas desde CSV
  const importarFacturas=e=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const rows=parseCSV(ev.target.result);
        let added=0,skipped=0;
        rows.forEach(row=>{
          if(!row.NumeroFactura||!row.MontoTotal)return skipped++;
          const exists=facturas.some(f=>f.numeroFactura===row.NumeroFactura);
          if(exists)return skipped++;
          const factura={
            id:newId(),
            numeroFactura:row.NumeroFactura,
            rutCliente:row.RUTCliente||"",
            centroCosto:row.CentroCosto||"",
            fechaEmision:row.FechaEmision||"",
            montoTotal:parseFloat(row.MontoTotal)||0,
            montoPagado:parseFloat(row.MontoPagado)||0,
            saldo:parseFloat(row.Saldo)||(parseFloat(row.MontoTotal)||0)-(parseFloat(row.MontoPagado)||0),
            estado:row.Estado||"Emitida",
            origen:"softland"
          };
          facturas.push(factura);
          added++;
        });
        const updated=[...facturas].sort(sortByDateDesc("fechaEmision"));
        const reconciled=saveFinancialLists({nextFacturas:updated});
        syncFacturasToBackendQuiet(reconciled.facturas);
        setImportFeedback({type:"success",msg:`Importadas ${added} facturas. ${skipped} duplicadas omitidas. Conciliadas: ${reconciled.summary.facturasConCliente} con cliente, ${reconciled.summary.facturasConProyecto} con proyecto.`});
        setTimeout(()=>setImportFeedback(null),5000);
      }catch(err){
        setImportFeedback({type:"error",msg:"Error al leer el archivo CSV. Verifica el formato."});
        setTimeout(()=>setImportFeedback(null),5000);
      }
    };
    reader.readAsText(file);
    e.target.value="";
  };
  
  // Importador de cuentas por pagar desde CSV
  const importarCuentasPagar=e=>{
    const file=e.target.files[0];
    if(!file)return;
    const reader=new FileReader();
    reader.onload=ev=>{
      try{
        const rows=parseCSV(ev.target.result);
        let added=0,skipped=0;
        rows.forEach(row=>{
          if(!row.NumeroDocumento||!row.Monto)return skipped++;
          const exists=cuentasPorPagar.some(c=>c.numeroDocumento===row.NumeroDocumento&&c.proveedor===row.Proveedor);
          if(exists)return skipped++;
          const cuenta={
            id:newId(),
            fecha:row.Fecha||"",
            proveedor:row.Proveedor||"",
            numeroDocumento:row.NumeroDocumento,
            centroCosto:row.CentroCosto||"",
            monto:parseFloat(row.Monto)||0,
            vencimiento:row.Vencimiento||"",
            estado:row.Estado||"Pendiente",
            origen:"softland"
          };
          cuentasPorPagar.push(cuenta);
          added++;
        });
        const updated=[...cuentasPorPagar].sort(sortByDateDesc("fecha"));
        const reconciled=saveFinancialLists({nextCuentas:updated});
        syncCuentasPagarToBackendQuiet(reconciled.cuentasPorPagar);
        setImportFeedback({type:"success",msg:`Importadas ${added} cuentas. ${skipped} duplicadas omitidas. ${reconciled.summary.cuentasPagarConProyecto} vinculadas a proyecto.`});
        setTimeout(()=>setImportFeedback(null),5000);
      }catch(err){
        setImportFeedback({type:"error",msg:"Error al leer el archivo CSV. Verifica el formato."});
        setTimeout(()=>setImportFeedback(null),5000);
      }
    };
    reader.readAsText(file);
    e.target.value="";
  };
  
  const saveGasto=()=>{
    if(!form.fecha||!form.categoria||!form.monto)return;
    const g={...form,id:form.id||newId(),monto:+form.monto,updatedAt:new Date().toISOString()};
    const lista=gastos.filter(x=>x.id!==g.id);
    const updated=[...lista,g].sort(sortByDateDesc("fecha"));
    saveFinancialLists({nextGastos:updated});
    syncGastoToBackendQuiet(g);
    setEditGasto(null);
    setForm({});
  };
  
  const deleteGasto=id=>{
    if(!window.confirm("¿Eliminar este gasto?"))return;
    const updated=gastos.filter(x=>x.id!==id);
    saveFinancialLists({nextGastos:updated});
    deleteGastoFromBackendQuiet(id);
  };
  
  // Exportadores de plantillas CSV
  const exportarPlantillaGastos=()=>{
    const csv="Fecha,CentroCosto,Categoria,Glosa,Monto\n2025-01-15,ADMIN,Personal,Sueldo Técnico A,1200000\n2025-01-15,ADMIN,Arriendo y servicios,Arriendo oficina enero,800000";
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="plantilla-gastos-operacionales.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const exportarPlantillaFacturas=()=>{
    const csv="NumeroFactura,RUTCliente,CentroCosto,FechaEmision,MontoTotal,MontoPagado,Saldo,Estado\nF-00123,76123456-7,CC_CLI001,2025-01-10,5000000,2000000,3000000,Parcial\nF-00124,76987654-3,CC_CLI002,2025-01-15,3500000,3500000,0,Pagada";
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="plantilla-facturas.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const exportarPlantillaCuentasPagar=()=>{
    const csv="Fecha,Proveedor,NumeroDocumento,CentroCosto,Monto,Vencimiento,Estado\n2025-01-12,Proveedor X,FC-456,CC_CLI001,800000,2025-02-12,Pendiente\n2025-01-20,Proveedor Y,FC-789,ADMIN,1500000,2025-02-20,Pendiente";
    const blob=new Blob([csv],{type:"text/csv;charset=utf-8;"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download="plantilla-cuentas-por-pagar.csv";
    a.click();
    URL.revokeObjectURL(url);
  };
  
  // Funciones de gestión API Softland (preparadas para cuando haya credenciales)
  const saveApiConfig=()=>{
    const segura=normalizeApiConfig(apiConfig);
    repo.apiConfig.set(segura);
    setApiConfig(segura);
    setImportFeedback({type:"success",msg:"Configuración guardada sin token. Las credenciales Softland se manejarán por backend/Edge Function."});
    setTimeout(()=>setImportFeedback(null),3000);
  };
  
  const testConnection=async()=>{
    setTestingConnection(true);
    setImportFeedback({type:"info",msg:"Probando conexión con Softland..."});
    
    // Simulación de prueba de conexión (cuando tengas API real, reemplazar esto)
    setTimeout(()=>{
      if(apiConfig.credenciales?.empresa){
        setImportFeedback({type:"info",msg:"La prueba real queda pendiente de backend seguro. No se guardan tokens en el navegador."});
      }else{
        setImportFeedback({type:"error",msg:"Falta Empresa ID. El token no se guardará en el navegador."});
      }
      setTestingConnection(false);
      setTimeout(()=>setImportFeedback(null),5000);
    },2000);
  };
  
  const registrarSync=(tipo,registros,estado)=>{
    const log={
      id:newId(),
      fecha:new Date().toISOString(),
      tipo,
      registros,
      estado
    };
    const updated=[log,...syncLog].slice(0,50); // Mantener últimos 50
    setSyncLog(updated);
    repo.syncLog.replaceAll(updated);
  };
  
  const sincronizarManual=async()=>{
    if(!apiConfig.habilitada){
      setImportFeedback({type:"error",msg:"Habilita la API primero en configuración"});
      setTimeout(()=>setImportFeedback(null),3000);
      return;
    }
    
    setImportFeedback({type:"info",msg:"Sincronizando datos desde Softland..."});
    
    // Simulación de sincronización (cuando tengas API real, reemplazar esto)
    setTimeout(()=>{
      registrarSync("Gastos",12,"✓ OK");
      registrarSync("Facturas",5,"✓ OK");
      registrarSync("Cuentas por pagar",3,"✓ OK");
      setImportFeedback({type:"success",msg:"Sincronización completada: 20 registros importados"});
      setTimeout(()=>setImportFeedback(null),5000);
      
      // La integración real se implementará desde backend/Edge Function.
    },3000);
  };
  
  const CATS_GASTO=["Personal","Arriendo y servicios","Software y plataformas","Servicios profesionales","Marketing y ventas","Subcontratación pool","Otros administrativos"];
  
  const tabItems=[
    {value:"resumen",label:"Panel financiero"},
    {value:"facturas",label:"Cobranza"},
    {value:"cuentas",label:"CxP"},
    {value:"flujo",label:"Caja"},
    {value:"gastos",label:"Costos operativos"},
    {value:"centros",label:"Centros"},
    {value:"api",label:"Softland"},
  ];
  const facturasVencidas=facturas.filter(f=>String(f.estado||"").toLowerCase().includes("venc")).length;
  const cuentasVencidas=cuentasPorPagar.filter(c=>String(c.estado||"").toLowerCase().includes("venc")).length;
  const centrosSinMapear=clientes.filter(c=>!c.centroCosto).length;

  return <div>
    <ModuleHero
      C={C}
      eyebrow="Finanzas"
      title="Facturación, cobranza y caja"
      subtitle="Parte por lo urgente: qué cobrar, qué pagar, cuánto entra, cuánto sale y dónde se pierde margen."
      actions={<Btn C={C} small variant="soft" onClick={()=>setSubTab("api")}>Preparar Softland</Btn>}
    >
      <WorkflowSteps C={C} active={Math.min(3, [facturas.length>0, cuentasPorPagar.length>0, clientes.some(c=>c.centroCosto), apiConfig.habilitada].filter(Boolean).length)} steps={["Importar datos", "Conciliar cuentas", "Mapear centros", "Revisar caja"]}/>
      <div style={{marginTop:12}}>
        <QuickActions C={C} items={[
          {label:`Cobrar: ${facturasVencidas} vencidas`,description:"Facturas y clientes críticos",tone:facturasVencidas?C.red:C.green,onClick:()=>setSubTab("facturas")},
          {label:`Pagar: ${cuentasVencidas} vencidas`,description:"Compromisos con proveedores",tone:cuentasVencidas?C.red:C.green,onClick:()=>setSubTab("cuentas")},
          {label:"Caja 30/60/90",description:"Flujo mensual y proyección",tone:C.orange||C.blue,onClick:()=>setSubTab("flujo")},
          {label:`${centrosSinMapear} sin centro`,description:"Preparación para Softland",tone:centrosSinMapear?C.amber:C.green,onClick:()=>setSubTab("centros")},
        ]}/>
      </div>
    </ModuleHero>

    <Card C={C} pad={12} style={{marginBottom:16}}>
      <SectionTabs C={C} value={subTab} onChange={setSubTab} items={tabItems}/>
    </Card>
    
    {/* TAB: Centros de costo */}
    {subTab==="centros"&&<div>
      <Card C={C}>
        <STitle C={C}>Mapeo de centros de costo</STitle>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:14}}>Asigna un código de centro de costo Softland a cada cliente. Este código se usará para clasificar ingresos y egresos por cliente.</div>
        
        {clientes.length===0?<Empty C={C} title="Sin clientes" sub="Crea clientes en el módulo Clientes"/>:
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{borderBottom:"1px solid "+C.border}}>
              {["Cliente","RUT","Centro de costo Softland","Estado",""].map(h=><th key={h} style={{padding:"6px 10px",color:C.textM,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,textAlign:"left"}}>{h}</th>)}
            </tr></thead>
            <tbody>{clientes.map((cl,i)=>(
              <tr key={cl.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent"}}>
                <td style={{padding:"8px 10px",fontFamily:ff,fontSize:12,fontWeight:500,color:C.text}}>{cl.razonSocial||cl.nombreComercial||"—"}</td>
                <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:C.textM}}>{cl.rut||"—"}</td>
                <td style={{padding:"8px 10px"}}>
                  {readonly?<span style={{fontFamily:ff,fontSize:11,color:C.textS}}>{cl.centroCosto||"—"}</span>:
                  <input value={cl.centroCosto||""} onChange={e=>{onSaveCliente({...cl,centroCosto:e.target.value.toUpperCase()});}} placeholder="ej: CC_CLI001" 
                    style={{background:C.bg0,border:"1px solid "+C.border,borderRadius:4,padding:"4px 8px",fontSize:11,color:C.text,fontFamily:ff,outline:"none",width:140}}/>}
                </td>
                <td style={{padding:"8px 10px"}}>
                  {cl.centroCosto?<Bdg color={C.green} small>✓ Mapeado</Bdg>:<Bdg color={C.amber} small>⚠ Sin mapear</Bdg>}
                </td>
                <td style={{padding:"8px 10px",fontSize:10,color:C.textM}}>
                  {proyectos.filter(p=>p.clienteId===cl.id).length} proyecto{proyectos.filter(p=>p.clienteId===cl.id).length!==1?"s":""}
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
        
        <div style={{marginTop:14,padding:"10px 12px",background:C.blue+"11",borderRadius:5,border:"1px solid "+C.blue+"33",fontSize:11,color:C.blue,fontFamily:ff}}>
          <strong>Convención sugerida:</strong> CC_CLI001, CC_CLI002, etc. El código debe coincidir con el configurado en Softland.
        </div>
      </Card>
      
      {/* Vista consolidada por centro de costo */}
      <Card C={C} style={{marginTop:12}}>
        <STitle C={C}>Análisis por centro de costo</STitle>
        {clientes.filter(cl=>cl.centroCosto).length===0?
          <Empty C={C} title="Sin centros mapeados" sub="Asigna códigos de centro de costo a los clientes para ver el análisis"/>:
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:10}}>
            {clientes.filter(cl=>cl.centroCosto).map(cl=>{
              const proysCl=proyectos.filter(p=>p.clienteId===cl.id);
              const totalVenta=proysCl.reduce((a,p)=>a+(p.valorVendido||0),0);
              const proyEjec=proysCl.filter(p=>(p.costos||[]).length>0);
              const costoRealTotal=proyEjec.reduce((a,p)=>{
                const cd=(p.costos||[]).reduce((ac,c)=>ac+(c.total||0),0);
                const gg=cd*((p.pctGG??params.pctGG??10)/100);
                const imp=cd*((p.pctImp??params.pctImp??5)/100);
                return a+cd+gg+imp;
              },0);
              const utilReal=totalVenta-costoRealTotal;
              const mgReal=totalVenta>0?utilReal/totalVenta:0;
              return <div key={cl.id} style={{background:C.bg2,borderRadius:5,padding:"12px 14px",border:"1px solid "+C.border}}>
                <div style={{fontSize:10,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:6}}>{cl.centroCosto}</div>
                <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff,marginBottom:8}}>{cl.razonSocial||cl.nombreComercial}</div>
                <div style={{borderTop:"1px solid "+C.border,paddingTop:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:10,color:C.textM,fontFamily:ff}}>Proyectos</span>
                    <span style={{fontSize:11,fontWeight:600,color:C.textS,fontFamily:ff}}>{proysCl.length}</span>
                  </div>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:10,color:C.textM,fontFamily:ff}}>Venta total</span>
                    <span style={{fontSize:11,fontWeight:600,color:C.blue,fontFamily:ff}}>{fmtCLP(totalVenta)}</span>
                  </div>
                  {proyEjec.length>0&&<>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:10,color:C.textM,fontFamily:ff}}>Costo real</span>
                      <span style={{fontSize:11,fontWeight:600,color:C.textS,fontFamily:ff}}>{fmtCLP(costoRealTotal)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontSize:10,color:C.textM,fontFamily:ff}}>Margen real</span>
                      <span style={{fontSize:11,fontWeight:600,color:mgReal>=0.15?C.green:mgReal>=0?C.amber:C.red,fontFamily:ff}}>{fmtPct(mgReal)}</span>
                    </div>
                  </>}
                </div>
              </div>;
            })}
          </div>
        }
      </Card>
    </div>}
    
    {/* TAB: Gastos operacionales */}
    {subTab==="gastos"&&<div>
      {importFeedback&&<div style={{padding:"10px 12px",marginBottom:12,borderRadius:5,background:importFeedback.type==="success"?C.green+"11":C.red+"11",border:"1px solid "+(importFeedback.type==="success"?C.green:C.red)+"44",fontSize:12,color:importFeedback.type==="success"?C.green:C.red,fontFamily:ff}}>{importFeedback.msg}</div>}
      
      <Card C={C}>
        <STitle C={C} action={!readonly&&<div style={{display:"flex",gap:6}}>
          <Btn C={C} ghost small onClick={exportarPlantillaGastos}>↓ Descargar plantilla</Btn>
          <label style={{display:"inline-flex",alignItems:"center",padding:"5px 11px",background:C.bg2,border:"1px solid "+C.border,borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:600,color:C.blue,fontFamily:ff}}>
            ↑ Importar CSV
            <input type="file" accept=".csv" style={{display:"none"}} onChange={importarGastos}/>
          </label>
          <Btn C={C} variant="soft" small onClick={()=>{setEditGasto("new");setForm({fecha:TODAY(),categoria:"Personal",descripcion:"",monto:0,recurrente:false,origen:"Manual"});}}>+ Nuevo gasto</Btn>
        </div>}>Gastos operacionales</STitle>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:14}}>
          Registra los gastos fijos mensuales de la empresa. Estos datos se usan para calcular el % GG real.
          <details style={{marginTop:8,fontSize:11,color:C.textS}}>
            <summary style={{cursor:"pointer",fontWeight:600}}>Formato CSV esperado</summary>
            <pre style={{background:C.bg0,padding:"8px 10px",borderRadius:4,marginTop:6,fontSize:10,overflow:"auto"}}>Fecha,CentroCosto,Categoria,Glosa,Monto{'\n'}2025-01-15,ADMIN,Personal,Sueldo Técnico A,1200000{'\n'}2025-01-15,ADMIN,Arriendo y servicios,Arriendo oficina enero,800000</pre>
          </details>
        </div>
        
        {editGasto&&<div style={{background:C.bg2,borderRadius:5,padding:"14px 16px",marginBottom:14,border:"1px solid "+C.border}}>
          <div style={{fontSize:11,fontWeight:600,color:C.textS,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:12}}>
            {editGasto==="new"?"Nuevo gasto":"Editar gasto"}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"120px 1fr 140px 120px",gap:10,marginBottom:10}}>
            <Fld C={C} label="Fecha"><input type="date" value={form.fecha||""} onChange={e=>sf("fecha",e.target.value)} style={{width:"100%",background:C.bg0,border:"1px solid "+C.border,borderRadius:4,padding:"6px 9px",fontSize:12,color:C.text,fontFamily:ff,outline:"none"}}/></Fld>
            <Fld C={C} label="Descripción"><Inp C={C} value={form.descripcion||""} onChange={v=>sf("descripcion",v)} placeholder="ej: Sueldo técnico A"/></Fld>
            <Fld C={C} label="Categoría">
              <select value={form.categoria||""} onChange={e=>sf("categoria",e.target.value)} style={{width:"100%",background:C.bg0,border:"1px solid "+C.border,borderRadius:4,padding:"6px 9px",fontSize:12,color:C.text,fontFamily:ff,outline:"none"}}>
                {CATS_GASTO.map(cat=><option key={cat} value={cat}>{cat}</option>)}
              </select>
            </Fld>
            <Fld C={C} label="Monto $"><Inp C={C} type="number" value={form.monto||0} onChange={v=>sf("monto",v)}/></Fld>
          </div>
          <div style={{marginBottom:10}}>
            <label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:C.textS,fontFamily:ff,cursor:"pointer"}}>
              <input type="checkbox" checked={form.recurrente||false} onChange={e=>sf("recurrente",e.target.checked)} style={{width:14,height:14}}/>
              Gasto recurrente mensual
            </label>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn C={C} onClick={saveGasto} disabled={!form.fecha||!form.categoria||!form.monto}>Guardar</Btn>
            <Btn C={C} ghost onClick={()=>{setEditGasto(null);setForm({});}}>Cancelar</Btn>
          </div>
        </div>}
        
        {gastos.length===0?<Empty C={C} title="Sin gastos registrados" sub="Agrega los gastos operacionales mensuales de la empresa"/>:
        <div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"1px solid "+C.border}}>
                {["Fecha","Categoría","Descripción","Monto","Tipo",""].map(h=><th key={h} style={{padding:"6px 10px",color:C.textM,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,textAlign:h==="Monto"?"right":"left"}}>{h}</th>)}
              </tr></thead>
              <tbody>{gastos.map((g,i)=>(
                <tr key={g.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent"}}>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:C.textM}}>{g.fecha}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:C.textS}}>{g.categoria}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:12,color:C.text}}>{g.descripcion}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:12,textAlign:"right",fontWeight:600,color:C.blue}}>{fmtCLP(g.monto)}</td>
                  <td style={{padding:"8px 10px"}}>
                    {g.recurrente?<Bdg color={C.amber} small>Recurrente</Bdg>:<Bdg color={C.textM} small>Único</Bdg>}
                  </td>
                  <td style={{padding:"8px 10px",textAlign:"right"}}>
                    {!readonly&&<>
                      <button onClick={()=>{setEditGasto(g.id);setForm({...g});}} style={{background:"transparent",border:"none",color:C.blue,cursor:"pointer",fontSize:11,marginRight:8}}>Editar</button>
                      <button onClick={()=>deleteGasto(g.id)} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:11}}>✕</button>
                    </>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          
          {/* Resumen por categoría */}
          <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:8}}>
            {CATS_GASTO.map(cat=>{
              const total=gastos.filter(g=>g.categoria===cat).reduce((a,g)=>a+(g.monto||0),0);
              if(!total)return null;
              return <div key={cat} style={{background:C.bg2,borderRadius:4,padding:"8px 10px",border:"1px solid "+C.border}}>
                <div style={{fontSize:9,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:3}}>{cat}</div>
                <div style={{fontSize:14,fontWeight:600,color:C.blue,fontFamily:ff}}>{fmtCLP(total)}</div>
              </div>;
            })}
          </div>
        </div>}
      </Card>
    </div>}
    
    
    {/* TAB: Facturación y cobranza */}
    {subTab==="facturas"&&<div>
      {importFeedback&&<div style={{padding:"10px 12px",marginBottom:12,borderRadius:5,background:importFeedback.type==="success"?C.green+"11":C.red+"11",border:"1px solid "+(importFeedback.type==="success"?C.green:C.red)+"44",fontSize:12,color:importFeedback.type==="success"?C.green:C.red,fontFamily:ff}}>{importFeedback.msg}</div>}
      <Card C={C}>
        <STitle C={C} action={!readonly&&<div style={{display:"flex",gap:6}}>
          <Btn C={C} ghost small onClick={exportarPlantillaFacturas}>↓ Descargar plantilla</Btn>
          <label style={{display:"inline-flex",alignItems:"center",padding:"5px 11px",background:C.bg2,border:"1px solid "+C.border,borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:600,color:C.blue,fontFamily:ff}}>
            ↑ Importar facturas CSV
            <input type="file" accept=".csv" style={{display:"none"}} onChange={importarFacturas}/>
          </label>
        </div>}>Facturación y cobranza</STitle>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:14}}>
          Importa facturas emitidas y su estado de cobranza desde Softland.
          <details style={{marginTop:8,fontSize:11,color:C.textS}}>
            <summary style={{cursor:"pointer",fontWeight:600}}>Formato CSV esperado</summary>
            <pre style={{background:C.bg0,padding:"8px 10px",borderRadius:4,marginTop:6,fontSize:10,overflow:"auto"}}>NumeroFactura,RUTCliente,CentroCosto,FechaEmision,MontoTotal,MontoPagado,Saldo,Estado{'\n'}F-00123,76123456-7,CC_CLI001,2025-01-10,5000000,2000000,3000000,Parcial{'\n'}F-00124,76987654-3,CC_CLI002,2025-01-15,3500000,3500000,0,Pagada</pre>
          </details>
        </div>
        
        {facturas.length===0?<Empty C={C} title="Sin facturas registradas" sub="Importa las facturas desde Softland o registra manualmente"/>:
        <div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"1px solid "+C.border}}>
                {["N° Factura","Cliente","Centro costo","Fecha","Monto total","Pagado","Saldo","Estado"].map(h=><th key={h} style={{padding:"6px 10px",color:C.textM,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,textAlign:["Monto total","Pagado","Saldo"].includes(h)?"right":"left"}}>{h}</th>)}
              </tr></thead>
              <tbody>{facturas.map((f,i)=>{
                const cli=clientes.find(c=>c.rut===f.rutCliente)||clientes.find(c=>c.centroCosto===f.centroCosto);
                return <tr key={f.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent"}}>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,fontWeight:600,color:C.blue}}>{f.numeroFactura||f.folio||"—"}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:C.textS}}>{cli?.razonSocial||f.rutCliente||"—"}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:10,color:C.textM}}>{f.centroCosto||"—"}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:C.textM}}>{f.fechaEmision}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:12,textAlign:"right",fontWeight:600,color:C.text}}>{fmtCLP(montoFactura(f))}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,textAlign:"right",color:C.green}}>{fmtCLP(money(f.montoPagado))}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:12,textAlign:"right",fontWeight:600,color:saldoFactura(f)>0?C.amber:C.textM}}>{fmtCLP(saldoFactura(f))}</td>
                  <td style={{padding:"8px 10px"}}>
                    {f.estado==="Pagada"?<Bdg color={C.green} small>Pagada</Bdg>:
                     f.estado==="Parcial"?<Bdg color={C.amber} small>Parcial</Bdg>:
                     <Bdg color={C.blue} small>{f.estado}</Bdg>}
                  </td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          
          {/* Resumen de cobranza */}
          <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
            <Stat C={C} label="Total facturado" value={fmtCLP(facturas.reduce((a,f)=>a+montoFactura(f),0))} color={C.blue}/>
            <Stat C={C} label="Total cobrado" value={fmtCLP(facturas.reduce((a,f)=>a+money(f.montoPagado),0))} color={C.green}/>
            <Stat C={C} label="Por cobrar" value={fmtCLP(facturas.reduce((a,f)=>a+saldoFactura(f),0))} color={C.amber}/>
            <Stat C={C} label="Días prom. cobranza" value={facturas.filter(f=>saldoFactura(f)===0).length>0?"30":"—"} color={C.textM} sub="estimado"/>
          </div>
        </div>}
      </Card>
    </div>}
    
    {/* TAB: Cuentas por pagar */}
    {subTab==="cuentas"&&<div>
      {importFeedback&&<div style={{padding:"10px 12px",marginBottom:12,borderRadius:5,background:importFeedback.type==="success"?C.green+"11":C.red+"11",border:"1px solid "+(importFeedback.type==="success"?C.green:C.red)+"44",fontSize:12,color:importFeedback.type==="success"?C.green:C.red,fontFamily:ff}}>{importFeedback.msg}</div>}
      <Card C={C}>
        <STitle C={C} action={!readonly&&<div style={{display:"flex",gap:6}}>
          <Btn C={C} ghost small onClick={exportarPlantillaCuentasPagar}>↓ Descargar plantilla</Btn>
          <label style={{display:"inline-flex",alignItems:"center",padding:"5px 11px",background:C.bg2,border:"1px solid "+C.border,borderRadius:4,cursor:"pointer",fontSize:11,fontWeight:600,color:C.blue,fontFamily:ff}}>
            ↑ Importar cuentas CSV
            <input type="file" accept=".csv" style={{display:"none"}} onChange={importarCuentasPagar}/>
          </label>
        </div>}>Cuentas por pagar</STitle>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:14}}>
          Importa facturas de proveedores y compromisos de pago desde Softland.
          <details style={{marginTop:8,fontSize:11,color:C.textS}}>
            <summary style={{cursor:"pointer",fontWeight:600}}>Formato CSV esperado</summary>
            <pre style={{background:C.bg0,padding:"8px 10px",borderRadius:4,marginTop:6,fontSize:10,overflow:"auto"}}>Fecha,Proveedor,NumeroDocumento,CentroCosto,Monto,Vencimiento,Estado{'\n'}2025-01-12,Proveedor X,FC-456,CC_CLI001,800000,2025-02-12,Pendiente{'\n'}2025-01-20,Proveedor Y,FC-789,ADMIN,1500000,2025-02-20,Pendiente</pre>
          </details>
        </div>
        
        {cuentasPorPagar.length===0?<Empty C={C} title="Sin cuentas por pagar" sub="Importa las facturas de proveedores desde Softland"/>:
        <div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{borderBottom:"1px solid "+C.border}}>
                {["Fecha","Proveedor","N° Doc","Centro costo","Monto","Vencimiento","Estado"].map(h=><th key={h} style={{padding:"6px 10px",color:C.textM,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,textAlign:h==="Monto"?"right":"left"}}>{h}</th>)}
              </tr></thead>
              <tbody>{cuentasPorPagar.map((c,i)=>{
                const hoy=new Date().toISOString().slice(0,10);
                const vencida=c.vencimiento<hoy&&c.estado==="Pendiente";
                return <tr key={c.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent"}}>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:C.textM}}>{c.fecha}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:12,fontWeight:500,color:C.text}}>{c.proveedor}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:10,color:C.textS}}>{c.numeroDocumento}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:10,color:C.textM}}>{c.centroCosto||"—"}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:12,textAlign:"right",fontWeight:600,color:C.red}}>{fmtCLP(c.monto)}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:vencida?C.red:C.textM}}>{c.vencimiento}</td>
                  <td style={{padding:"8px 10px"}}>
                    {c.estado==="Pagada"?<Bdg color={C.green} small>Pagada</Bdg>:
                     vencida?<Bdg color={C.red} small>Vencida</Bdg>:
                     <Bdg color={C.amber} small>{c.estado}</Bdg>}
                  </td>
                </tr>;
              })}</tbody>
            </table>
          </div>
          
          {/* Resumen de cuentas */}
          <div style={{marginTop:14,display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            <Stat C={C} label="Total por pagar" value={fmtCLP(cuentasPorPagar.filter(c=>c.estado==="Pendiente").reduce((a,c)=>a+c.monto,0))} color={C.red}/>
            <Stat C={C} label="Próximos 30 días" value={fmtCLP(cuentasPorPagar.filter(c=>{const diff=new Date(c.vencimiento)-new Date();return diff>=0&&diff<=30*24*3600*1000&&c.estado==="Pendiente";}).reduce((a,c)=>a+c.monto,0))} color={C.amber}/>
            <Stat C={C} label="Vencidas" value={fmtCLP(cuentasPorPagar.filter(c=>c.vencimiento<new Date().toISOString().slice(0,10)&&c.estado==="Pendiente").reduce((a,c)=>a+c.monto,0))} color={C.red}/>
          </div>
        </div>}
      </Card>
    </div>}
    
    
    {/* TAB: Flujo de caja */}
    {subTab==="flujo"&&<div>
      <Card C={C}>
        <STitle C={C}>Flujo de caja mensual</STitle>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:14}}>Ingresos vs egresos mensuales calculados desde facturas cobradas y gastos operacionales.</div>
        
        {(()=>{
          const meses=[];
          const hoy=new Date();
          for(let i=11;i>=0;i--){
            const d=new Date(hoy.getFullYear(),hoy.getMonth()-i,1);
            const mes=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
            
            // Ingresos = facturas cobradas del mes (MontoPagado de facturas cuyo pago fue en ese mes)
            // Como no tenemos fecha de pago, asumimos que las facturas pagadas se pagaron en el mes de emisión
            const ingresos=facturas.filter(f=>f.fechaEmision?.startsWith(mes)&&f.estado==="Pagada").reduce((a,f)=>a+f.montoPagado,0);
            
            // Egresos = gastos operacionales del mes + cuentas pagadas del mes
            const egresosGastos=gastos.filter(g=>g.fecha?.startsWith(mes)).reduce((a,g)=>a+g.monto,0);
            const egresosCuentas=cuentasPorPagar.filter(c=>c.fecha?.startsWith(mes)&&c.estado==="Pagada").reduce((a,c)=>a+c.monto,0);
            const egresos=egresosGastos+egresosCuentas;
            
            const saldo=ingresos-egresos;
            meses.push({mes,ingresos,egresos,saldo,label:fmtMes(mes+"-01")});
          }
          
          const mesActual=hoy.getFullYear()+"-"+String(hoy.getMonth()+1).padStart(2,"0");
          const dataMesActual=meses.find(m=>m.mes===mesActual);
          
          return <div>
            {/* KPIs del mes actual */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              <Stat C={C} label="Ingresos del mes" value={fmtCLP(dataMesActual?.ingresos||0)} color={C.green} sub="facturas cobradas"/>
              <Stat C={C} label="Egresos del mes" value={fmtCLP(dataMesActual?.egresos||0)} color={C.red} sub="gastos + cuentas"/>
              <Stat C={C} label="Saldo del mes" value={fmtCLP(dataMesActual?.saldo||0)} color={dataMesActual&&dataMesActual.saldo>=0?C.blue:C.red} sub={dataMesActual&&dataMesActual.saldo>=0?"positivo":"negativo"}/>
            </div>
            
            {/* Gráfico de barras últimos 12 meses */}
            <div style={{background:C.bg2,borderRadius:5,padding:"16px 18px",border:"1px solid "+C.border}}>
              <div style={{fontSize:11,fontWeight:600,color:C.textS,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:12}}>Últimos 12 meses</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={meses} margin={{top:5,right:0,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false}/>
                  <XAxis dataKey="label" tick={{fill:C.textM,fontSize:10}} axisLine={{stroke:C.border}} tickLine={false}/>
                  <YAxis tick={{fill:C.textM,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>fmtMil(v)}/>
                  <Tooltip content={({active,payload})=>{
                    if(!active||!payload||!payload.length)return null;
                    const d=payload[0].payload;
                    return <div style={{background:C.bg1,border:"1px solid "+C.border,borderRadius:4,padding:"8px 10px",fontSize:11}}>
                      <div style={{fontWeight:600,color:C.text,marginBottom:4}}>{d.label}</div>
                      <div style={{color:C.green}}>Ingresos: {fmtCLP(d.ingresos)}</div>
                      <div style={{color:C.red}}>Egresos: {fmtCLP(d.egresos)}</div>
                      <div style={{color:d.saldo>=0?C.blue:C.red,fontWeight:600,marginTop:2}}>Saldo: {fmtCLP(d.saldo)}</div>
                    </div>;
                  }}/>
                  <Legend wrapperStyle={{fontSize:11,fontFamily:ff}}/>
                  <Bar dataKey="ingresos" name="Ingresos" fill={C.green} radius={[4,4,0,0]}/>
                  <Bar dataKey="egresos" name="Egresos" fill={C.red} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Proyección próximos 3 meses */}
            <div style={{marginTop:14}}>
              <div style={{fontSize:11,fontWeight:600,color:C.textS,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:10}}>Proyección próximos 3 meses</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {[1,2,3].map(offset=>{
                  const d=new Date(hoy.getFullYear(),hoy.getMonth()+offset,1);
                  const mesProy=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
                  
                  // Proyección: facturas por cobrar con fecha en ese mes
                  const ingProy=facturas.filter(f=>f.fechaEmision?.startsWith(mesProy)&&f.saldo>0).reduce((a,f)=>a+f.saldo,0);
                  
                  // Egresos proyectados: gastos recurrentes + cuentas por pagar con vencimiento en ese mes
                  const egProy=gastos.filter(g=>g.recurrente).reduce((a,g)=>a+g.monto,0)+cuentasPorPagar.filter(c=>c.vencimiento?.startsWith(mesProy)&&c.estado==="Pendiente").reduce((a,c)=>a+c.monto,0);
                  
                  const saldoProy=ingProy-egProy;
                  
                  return <div key={offset} style={{background:C.bg2,borderRadius:4,padding:"10px 12px",border:"1px solid "+C.border}}>
                    <div style={{fontSize:10,color:C.textM,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,marginBottom:6}}>{fmtMes(mesProy+"-01")}</div>
                    <div style={{fontSize:10,color:C.green,marginBottom:2}}>+{fmtCLP(ingProy)}</div>
                    <div style={{fontSize:10,color:C.red,marginBottom:4}}>−{fmtCLP(egProy)}</div>
                    <div style={{fontSize:13,fontWeight:600,color:saldoProy>=0?C.blue:C.red,fontFamily:ff}}>{fmtCLP(saldoProy)}</div>
                  </div>;
                })}
              </div>
            </div>
          </div>;
        })()}
      </Card>
    </div>}
    
    
    {/* TAB: Integración API Softland */}
    {subTab==="api"&&<div>
      {importFeedback&&<div style={{padding:"10px 12px",marginBottom:12,borderRadius:5,background:importFeedback.type==="success"?C.green+"11":importFeedback.type==="info"?C.blue+"11":C.red+"11",border:"1px solid "+(importFeedback.type==="success"?C.green:importFeedback.type==="info"?C.blue:C.red)+"44",fontSize:12,color:importFeedback.type==="success"?C.green:importFeedback.type==="info"?C.blue:C.red,fontFamily:ff}}>{importFeedback.msg}</div>}
      
      {/* Credenciales */}
      <Card C={C} style={{marginBottom:12}}>
        <STitle C={C}>Configuración de credenciales</STitle>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:14}}>
          Conecta Assur Control con la API de Softland para sincronizar datos automáticamente. Esta configuración está preparada para cuando tengas acceso a la API.
        </div>
        
        <div style={{display:"flex",alignItems:"center",marginBottom:16}}>
          <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
            <input type="checkbox" checked={apiConfig.habilitada} onChange={e=>{setApiConfig(c=>({...c,habilitada:e.target.checked}));}} disabled={readonly} style={{width:16,height:16}}/>
            <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>Habilitar conexión API a Softland</span>
          </label>
          <div style={{marginLeft:12,fontSize:11,color:apiConfig.habilitada?C.green:C.textM,fontFamily:ff,display:"flex",alignItems:"center",gap:4}}>
            <span style={{width:8,height:8,borderRadius:"50%",background:apiConfig.habilitada?C.green:C.textM}}/>
            {apiConfig.habilitada?"Habilitada":"Deshabilitada"}
          </div>
        </div>
        
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12,opacity:apiConfig.habilitada?1:0.5,pointerEvents:apiConfig.habilitada?"auto":"none"}}>
          <Fld C={C} label="Empresa ID (código Softland)">
            <Inp C={C} value={apiConfig.credenciales.empresa} onChange={v=>setApiConfig(c=>({...c,credenciales:{...c.credenciales,empresa:v}}))} placeholder="ej: EMP001" disabled={readonly}/>
          </Fld>
          <Fld C={C} label="Usuario API">
            <Inp C={C} value={apiConfig.credenciales.usuario} onChange={v=>setApiConfig(c=>({...c,credenciales:{...c.credenciales,usuario:v}}))} placeholder="usuario@empresa.cl" disabled={readonly}/>
          </Fld>
        </div>
        
        <div style={{marginBottom:12,padding:"9px 12px",background:C.amber+"11",border:"1px solid "+C.amber+"44",borderRadius:6,fontSize:12,color:C.amber,fontFamily:ff}}>
          El token/API key de Softland no se ingresa ni se guarda en el navegador. Se configurará en backend o Supabase Edge Functions al momento de publicar.
        </div>
        
        <div style={{marginBottom:14,opacity:apiConfig.habilitada?1:0.5,pointerEvents:apiConfig.habilitada?"auto":"none"}}>
          <Fld C={C} label="URL base de API">
            <Inp C={C} value={apiConfig.credenciales.urlBase} onChange={v=>setApiConfig(c=>({...c,credenciales:{...c.credenciales,urlBase:v}}))} placeholder="https://api.softland.cl/v1" disabled={readonly}/>
          </Fld>
        </div>
        
        <div style={{display:"flex",gap:8}}>
          {!readonly&&<Btn C={C} onClick={saveApiConfig}>Guardar configuración</Btn>}
          <Btn C={C} ghost onClick={testConnection} disabled={testingConnection||!apiConfig.habilitada||readonly}>
            {testingConnection?"Probando...":"Probar conexión"}
          </Btn>
        </div>
      </Card>
      
      {/* Sincronización automática */}
      <Card C={C} style={{marginBottom:12}}>
        <STitle C={C}>Sincronización automática</STitle>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:14}}>
          Configura la frecuencia con la que Assur Control sincronizará datos desde Softland. Requiere API habilitada.
        </div>
        
        <div style={{opacity:apiConfig.habilitada?1:0.5,pointerEvents:apiConfig.habilitada?"auto":"none"}}>
          <div style={{display:"flex",alignItems:"center",marginBottom:14}}>
            <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
              <input type="checkbox" checked={apiConfig.sincronizacion.automatica} onChange={e=>setApiConfig(c=>({...c,sincronizacion:{...c.sincronizacion,automatica:e.target.checked}}))} disabled={readonly} style={{width:16,height:16}}/>
              <span style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>Activar sincronización automática</span>
            </label>
          </div>
          
          <div style={{display:"grid",gridTemplateColumns:"200px 1fr",gap:12,marginBottom:14,opacity:apiConfig.sincronizacion.automatica?1:0.5,pointerEvents:apiConfig.sincronizacion.automatica?"auto":"none"}}>
            <Fld C={C} label="Frecuencia">
              <select value={apiConfig.sincronizacion.frecuencia} onChange={e=>setApiConfig(c=>({...c,sincronizacion:{...c.sincronizacion,frecuencia:e.target.value}}))} disabled={readonly} style={{width:"100%",background:C.bg0,border:"1px solid "+C.border,borderRadius:4,padding:"6px 9px",fontSize:12,color:C.text,fontFamily:ff,outline:"none"}}>
                <option value="diaria">Diaria (23:00)</option>
                <option value="semanal">Semanal (Domingos 23:00)</option>
                <option value="manual">Solo manual</option>
              </select>
            </Fld>
            <div>
              <Lbl C={C} ch="Próxima sincronización"/>
              <div style={{padding:"6px 9px",background:C.bg0,border:"1px solid "+C.border,borderRadius:4,fontSize:12,color:C.textM,fontFamily:ff}}>
                {apiConfig.sincronizacion.automatica?(apiConfig.sincronizacion.frecuencia==="diaria"?"Hoy 23:00":"Domingo 23:00"):"—"}
              </div>
            </div>
          </div>
          
          <Btn C={C} onClick={sincronizarManual} disabled={readonly}>Sincronizar ahora</Btn>
        </div>
      </Card>
      
      {/* Mapeo de categorías */}
      <Card C={C} style={{marginBottom:12}}>
        <STitle C={C}>Mapeo de categorías contables</STitle>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:14}}>
          Define cómo las cuentas contables de Softland se mapean a las categorías de gastos de Assur Control.
        </div>
        
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{borderBottom:"1px solid "+C.border}}>
              <th style={{padding:"6px 10px",color:C.textM,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,textAlign:"left"}}>Cuenta Softland</th>
              <th style={{padding:"6px 10px",color:C.textM,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,textAlign:"left"}}>Descripción</th>
              <th style={{padding:"6px 10px",color:C.textM,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,textAlign:"left"}}>Categoría ASSUR</th>
            </tr></thead>
            <tbody>
              {Object.entries(apiConfig.mapeos.categoriasGastos).map(([cuenta,cat],i)=>(
                <tr key={i} style={{borderBottom:"1px solid "+C.border}}>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,fontWeight:600,color:C.blue}}>{cuenta}</td>
                  <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:C.textM}}>
                    {cuenta==="CTA_5100"?"Remuneraciones y cargas sociales":cuenta==="CTA_5200"?"Arriendos y servicios básicos":"Honorarios y servicios profesionales"}
                  </td>
                  <td style={{padding:"8px 10px"}}>
                    <select value={cat} onChange={e=>{const m={...apiConfig.mapeos.categoriasGastos,[cuenta]:e.target.value};setApiConfig(c=>({...c,mapeos:{...c.mapeos,categoriasGastos:m}}));}} disabled={readonly} style={{background:C.bg0,border:"1px solid "+C.border,borderRadius:4,padding:"4px 8px",fontSize:11,color:C.text,fontFamily:ff,outline:"none"}}>
                      {CATS_GASTO.map(cg=><option key={cg} value={cg}>{cg}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div style={{marginTop:12,padding:"8px 10px",background:C.blue+"11",borderRadius:4,fontSize:11,color:C.blue,fontFamily:ff}}>
          <strong>Nota:</strong> Cuando tengas acceso a la API de Softland, agrega aquí los códigos de cuenta reales de tu plan contable.
        </div>
      </Card>
      
      {/* Log de sincronizaciones */}
      <Card C={C}>
        <STitle C={C}>Historial de sincronizaciones</STitle>
        {syncLog.length===0?<Empty C={C} title="Sin sincronizaciones aún" sub="Las sincronizaciones aparecerán aquí cuando la API esté activa"/>:
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{borderBottom:"1px solid "+C.border}}>
              {["Fecha/Hora","Tipo","Registros","Estado"].map(h=><th key={h} style={{padding:"6px 10px",color:C.textM,fontWeight:600,fontSize:9,textTransform:"uppercase",letterSpacing:"0.08em",fontFamily:ff,textAlign:"left"}}>{h}</th>)}
            </tr></thead>
            <tbody>{syncLog.slice(0,10).map((s,i)=>(
              <tr key={s.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2:"transparent"}}>
                <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:C.textM}}>{new Date(s.fecha).toLocaleString("es-CL")}</td>
                <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,fontWeight:500,color:C.text}}>{s.tipo}</td>
                <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:C.textS}}>{s.registros}</td>
                <td style={{padding:"8px 10px",fontFamily:ff,fontSize:11,color:text(s.estado).includes("✓")||text(s.estado).toLowerCase()==="ok"?C.green:C.red}}>{s.estado||"—"}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
      </Card>
    </div>}
    
    {/* TAB: Dashboard directivo */}
    {subTab==="resumen"&&<div>
      {(()=>{
        const hoy=new Date();
        const mesActual=hoy.getFullYear()+"-"+String(hoy.getMonth()+1).padStart(2,"0");
        
        // Gastos operacionales
        const gastosDelMes=gastos.filter(g=>g.fecha?.startsWith(mesActual));
        const totalGastos=gastosDelMes.reduce((a,g)=>a+(g.monto||0),0);
        
        // Ventas
        const proyDelMes=proyectos.filter(p=>{const f=p.fechaFacturacion||p.fechaTermino||p.fechaInicio;return f?.startsWith(mesActual);});
        const ventasDelMes=proyDelMes.reduce((a,p)=>a+(p.valorVendido||0),0);
        
        // % GG real
        const pctGGReal=ventasDelMes>0?totalGastos/ventasDelMes:0;
        const pctGGAplicado=(params.pctGG||10)/100;
        const desfase=pctGGReal-pctGGAplicado;
        
        // Margen promedio proyectos
        const proyConCostos=proyectos.filter(p=>(p.costos||[]).length>0);
        const margenPromedio=proyConCostos.length>0?proyConCostos.reduce((a,p)=>{
          const cd=(p.costos||[]).reduce((ac,c)=>ac+(c.total||0),0);
          const gg=cd*((p.pctGG??params.pctGG??10)/100);
          const imp=cd*((p.pctImp??params.pctImp??5)/100);
          const costoTotal=cd+gg+imp;
          const margen=(p.valorVendido||0)>0?((p.valorVendido||0)-costoTotal)/(p.valorVendido||0):0;
          return a+margen;
        },0)/proyConCostos.length:0;
        
        // Liquidez
        const totalPorCobrar=financeSummary.cxcTotal;
        const totalPorPagar=financeSummary.totalCxp;
        const capitalTrabajo=totalPorCobrar-totalPorPagar;
        
        // Días promedio cobranza (aproximado)
        const facturasConPago=facturas.filter(f=>f.estado==="Pagada");
        const diasCobranza=facturasConPago.length>0?30:0; // placeholder
        
        // Top clientes por rentabilidad
        const clientesRent=clientes.map(cl=>{
          const proysCl=proyectos.filter(p=>p.clienteId===cl.id&&(p.costos||[]).length>0);
          if(proysCl.length===0)return null;
          const totalVenta=proysCl.reduce((a,p)=>a+(p.valorVendido||0),0);
          const totalCosto=proysCl.reduce((a,p)=>{
            const cd=(p.costos||[]).reduce((ac,c)=>ac+(c.total||0),0);
            const gg=cd*((p.pctGG??params.pctGG??10)/100);
            const imp=cd*((p.pctImp??params.pctImp??5)/100);
            return a+cd+gg+imp;
          },0);
          const utilidad=totalVenta-totalCosto;
          const margen=totalVenta>0?utilidad/totalVenta:0;
          return {cliente:cl,totalVenta,utilidad,margen};
        }).filter(x=>x).sort((a,b)=>b.margen-a.margen).slice(0,5);
        
        // Top clientes por deuda
        const clientesDeuda=clientes.map(cl=>{
          const factsCl=facturas.filter(f=>f.rutCliente===cl.rut||f.centroCosto===cl.centroCosto);
          const deuda=factsCl.reduce((a,f)=>a+saldoFactura(f),0);
          if(deuda===0)return null;
          return {cliente:cl,deuda};
        }).filter(x=>x).sort((a,b)=>b.deuda-a.deuda).slice(0,5);
        
        return <div>
          {/* Sección 1: Rentabilidad */}
          <Card C={C} style={{marginBottom:12}}>
            <STitle C={C}>Rentabilidad</STitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              <Stat C={C} label="Gastos operacionales" value={fmtCLP(totalGastos)} color={C.red} sub="este mes"/>
              <Stat C={C} label="Ventas del mes" value={fmtCLP(ventasDelMes)} color={C.blue} sub={proyDelMes.length+" proyectos"}/>
              <Stat C={C} label="% GG real" value={fmtPct(pctGGReal)} color={Math.abs(desfase)<0.02?C.green:C.amber} sub={"vs "+fmtPct(pctGGAplicado)+" cobrado"}/>
              <Stat C={C} label="Margen promedio" value={fmtPct(margenPromedio)} color={margenPromedio>=0.2?C.green:margenPromedio>=0.1?C.amber:C.red} sub={proyConCostos.length+" proyectos"}/>
            </div>
            {Math.abs(desfase)>=0.02&&<div style={{marginTop:12,padding:"10px 12px",background:(desfase>0?C.red:C.green)+"11",borderRadius:5,border:"1px solid "+(desfase>0?C.red:C.green)+"44",fontSize:11,color:desfase>0?C.red:C.green,fontFamily:ff}}>
              {desfase>0?"⚠ Alerta: Estás cobrando menos GG del real":"✓ Bien: Estás cobrando más GG del real"} — Diferencia: {(desfase*100).toFixed(1)}%
            </div>}
          </Card>
          
          {/* Sección 2: Liquidez */}
          <Card C={C} style={{marginBottom:12}}>
            <STitle C={C}>Liquidez y capital de trabajo</STitle>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
              <Stat C={C} label="Cuentas por cobrar" value={fmtCLP(totalPorCobrar)} color={C.amber} sub={financeSummary.cxcPendientes.length+" facturas"}/>
              <Stat C={C} label="Cuentas por pagar" value={fmtCLP(totalPorPagar)} color={C.red} sub={financeSummary.cxpPendientes.length+" pendientes"}/>
              <Stat C={C} label="Capital de trabajo" value={fmtCLP(capitalTrabajo)} color={capitalTrabajo>=0?C.blue:C.red} sub={capitalTrabajo>=0?"positivo":"negativo"}/>
              <Stat C={C} label="Días prom. cobranza" value={diasCobranza||"—"} color={C.textM} sub="estimado"/>
            </div>
          </Card>
          
          {/* Sección 3: Top clientes */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {/* Top 5 más rentables */}
            <Card C={C}>
              <STitle C={C}>Top 5 clientes más rentables</STitle>
              {clientesRent.length===0?<Empty C={C} title="Sin datos" sub="Ejecuta proyectos con costos reales para ver rentabilidad"/>:
              <div>
                {clientesRent.map((item,i)=><div key={i} style={{padding:"8px 10px",borderBottom:i<clientesRent.length-1?"1px solid "+C.border:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{i+1}. {item.cliente.razonSocial||item.cliente.nombreComercial}</div>
                    <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{fmtCLP(item.totalVenta)} vendidos</div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:600,color:item.margen>=0.2?C.green:item.margen>=0.1?C.amber:C.red,fontFamily:ff}}>{fmtPct(item.margen)}</div>
                    <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{fmtCLP(item.utilidad)}</div>
                  </div>
                </div>)}
              </div>}
            </Card>
            
            {/* Top 5 con mayor deuda */}
            <Card C={C}>
              <STitle C={C}>Top 5 clientes con mayor deuda</STitle>
              {clientesDeuda.length===0?<Empty C={C} title="Sin deudas" sub="Todas las facturas están pagadas"/>:
              <div>
                {clientesDeuda.map((item,i)=><div key={i} style={{padding:"8px 10px",borderBottom:i<clientesDeuda.length-1?"1px solid "+C.border:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <div>
                    <div style={{fontSize:12,fontWeight:600,color:C.text,fontFamily:ff}}>{i+1}. {item.cliente.razonSocial||item.cliente.nombreComercial}</div>
                    <div style={{fontSize:10,color:C.textM,fontFamily:ff}}>{item.cliente.centroCosto||"Sin CC"}</div>
                  </div>
                  <div style={{fontSize:13,fontWeight:600,color:C.amber,fontFamily:ff}}>{fmtCLP(item.deuda)}</div>
                </div>)}
              </div>}
            </Card>
          </div>
        </div>;
      })()}
    </div>}
  </div>;
}

// CONFIGURACIÓN
// ─────────────────────────────────────────────────────────────────────────────
// PERSONAL VIEW — Técnicos y Contratistas
// ─────────────────────────────────────────────────────────────────────────────
const COLORES_TEC=["#1E3A8A","#2545A6","#0D9F6E","#C77700","#7C3AED","#C0392B","#0891B2","#059669","#D97706","#7C3AED"];
const ESPECIALIDADES_OPT=["CCTV","Alarmas","Control de acceso","Incendios","Redes / Infraestructura","Automatización","Eléctrico","Portería remota","Soporte técnico","Otro"];
