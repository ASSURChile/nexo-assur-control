import { useState } from "react";
import { ff } from "../config/appConstants";
import { Bdg, Btn, Card, Fld, STitle } from "../components/ui";
import { commitSoftlandImport, getSoftlandImportStats, previewSoftlandImport, SOFTLAND_IMPORT_TYPES } from "../services/softlandImportService";

export default function ConfigIntegracionesView({C,readonly}){
  const [tipoImport,setTipoImport]=useState("clientes");
  const [csvText,setCsvText]=useState("");
  const [preview,setPreview]=useState(null);
  const [error,setError]=useState("");
  const [resultado,setResultado]=useState(null);

  const TIPOS=SOFTLAND_IMPORT_TYPES;

  const tipo=TIPOS[tipoImport];

  const handlePreview=()=>{
    setError("");setResultado(null);
    try{setPreview(previewSoftlandImport({csvText,tipoImport}));}
    catch(err){setError(err.message);}
  };

  const handleImport=()=>{
    if(!preview)return;
    setResultado(commitSoftlandImport({tipoImport,items:preview.items}));
    setPreview(null);setCsvText("");
  };

  const stats=getSoftlandImportStats();

  return <div>
    {/* Cabecera con principio */}
    <Card C={C}>
      <STitle C={C}>Modo de operación</STitle>
      <div style={{padding:"10px 12px",background:C.blue+"11",border:"1px solid "+C.blue+"33",borderRadius:6,fontSize:12,color:C.textS,fontFamily:ff,lineHeight:1.5}}>
        <b style={{color:C.blue}}>📌 Principio rector:</b> Assur Control complementa Softland — no lo reemplaza.<br/>
        Mientras la integración automática no esté disponible, puedes <b>operar 100% en modo manual</b> ingresando datos directamente, o usar este importador para subir archivos CSV/Excel exportados desde Softland. La integración automática queda preparada en dos rutas: <b>API Softland</b> o <b>base de datos/vistas SQL solo lectura</b>.
      </div>
    </Card>

    {/* Stats actuales por origen */}
    <Card C={C}>
      <STitle C={C}>Estado actual de los datos</STitle>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12,fontFamily:ff}}>
        <thead><tr style={{background:C.bg2,borderBottom:"1px solid "+C.border}}>
          {["Entidad","Total","Manual","Importado de Softland","% Manual"].map(h=><th key={h} style={{padding:"8px 12px",textAlign:"left",fontSize:10,color:C.textM,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>)}
        </tr></thead>
        <tbody>
          {[["clientes","Clientes"],["materiales","Materiales"],["facturas","Facturas"],["pagos","Pagos"]].map(([k,lbl])=>{
            const arr=stats[k];
            const sft=arr.filter(x=>x.origen==="softland").length;
            const man=arr.length-sft;
            const pct=arr.length>0?Math.round(man/arr.length*100):0;
            return <tr key={k} style={{borderBottom:"1px solid "+C.border}}>
              <td style={{padding:"8px 12px",fontWeight:500,color:C.text}}>{lbl}</td>
              <td style={{padding:"8px 12px",fontVariantNumeric:"tabular-nums"}}>{arr.length}</td>
              <td style={{padding:"8px 12px",color:C.amber,fontVariantNumeric:"tabular-nums"}}>{man}</td>
              <td style={{padding:"8px 12px",color:C.blue,fontVariantNumeric:"tabular-nums"}}>{sft}</td>
              <td style={{padding:"8px 12px"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:80,height:6,background:C.bg2,borderRadius:3,overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:`linear-gradient(90deg,${C.amber},${C.blue})`}}/>
                  </div>
                  <span style={{fontSize:11,color:C.textM,fontFamily:ff}}>{pct}%</span>
                </div>
              </td>
            </tr>;
          })}
        </tbody>
      </table>
    </Card>

    {/* Importador */}
    <Card C={C}>
      <STitle C={C}>Importar desde archivo CSV / Excel</STitle>

      {/* Selector de tipo */}
      <div style={{display:"flex",gap:5,marginBottom:14,flexWrap:"wrap"}}>
        {Object.keys(TIPOS).map(k=>{
          const on=tipoImport===k;
          return <button key={k} onClick={()=>{setTipoImport(k);setCsvText("");setPreview(null);setResultado(null);setError("");}} style={{padding:"7px 14px",borderRadius:5,border:"1px solid "+(on?C.blue:C.border),background:on?C.blue+"22":"transparent",color:on?C.blue:C.textM,fontSize:12,fontWeight:on?600:400,cursor:"pointer",fontFamily:ff}}>{TIPOS[k].label}</button>;
        })}
      </div>

      {/* Descripción del tipo */}
      <div style={{padding:"10px 12px",background:C.bg2,border:"1px solid "+C.border,borderRadius:6,marginBottom:12,fontSize:12,color:C.textS,fontFamily:ff,lineHeight:1.5}}>
        {tipo.desc}<br/>
        <span style={{color:C.textM,fontSize:11}}>Formato esperado (primera línea = encabezados):</span><br/>
        <code style={{fontFamily:"monospace",fontSize:11,color:C.green,background:C.bg0,padding:"3px 6px",borderRadius:3,display:"inline-block",marginTop:4}}>{tipo.ejemplo}</code><br/>
        <span style={{color:C.textM,fontSize:11,marginTop:4,display:"inline-block"}}>Separador: punto y coma (;), coma (,) o tabulación. Sistema detecta automáticamente.</span>
      </div>

      {/* Textarea para pegar CSV */}
      <Fld C={C} label="Pega aquí el contenido CSV (incluye la línea de encabezados)">
        <textarea value={csvText} onChange={e=>setCsvText(e.target.value)} rows={10} placeholder={`${tipo.ejemplo}\nIansa Cosmito;76123456-7;Av. Cosmito 1234;...`} style={{width:"100%",padding:"10px",background:C.bg0,border:"1px solid "+C.border,borderRadius:5,fontSize:12,color:C.text,fontFamily:"monospace",resize:"vertical",boxSizing:"border-box",outline:"none"}}/>
      </Fld>

      <div style={{display:"flex",gap:8,marginTop:10}}>
        <Btn C={C} onClick={handlePreview} disabled={readonly||!csvText.trim()}>Vista previa</Btn>
        <Btn C={C} ghost onClick={()=>{setCsvText("");setPreview(null);setError("");setResultado(null);}}>Limpiar</Btn>
      </div>

      {error&&<div style={{marginTop:12,padding:"10px 12px",background:C.red+"11",border:"1px solid "+C.red+"44",borderRadius:6,fontSize:12,color:C.red,fontFamily:ff}}>⚠ {error}</div>}

      {resultado&&<div style={{marginTop:12,padding:"10px 12px",background:C.green+"11",border:"1px solid "+C.green+"44",borderRadius:6,fontSize:12,color:C.green,fontFamily:ff}}>
        ✓ Importación completada: <b>{resultado.nuevos}</b> nuevos · <b>{resultado.actualizados}</b> actualizados · {resultado.total} totales procesados.
      </div>}

      {/* Vista previa */}
      {preview&&<div style={{marginTop:14}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
          <div>
            <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>Vista previa — {preview.total} registros detectados</div>
            <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:2}}>Columnas detectadas: {preview.cols.join(", ")}</div>
          </div>
          {!readonly&&<Btn C={C} color={C.green} onClick={handleImport}>✓ Importar {preview.total} registros</Btn>}
        </div>
        <div style={{maxHeight:300,overflowY:"auto",background:C.bg1,border:"1px solid "+C.border,borderRadius:6}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:11,fontFamily:ff}}>
            <thead style={{position:"sticky",top:0,background:C.bg2,zIndex:1}}>
              <tr style={{borderBottom:"1px solid "+C.border}}>
                {Object.keys(preview.items[0]||{}).filter(k=>!["id","createdAt"].includes(k)).slice(0,8).map(k=><th key={k} style={{padding:"7px 10px",textAlign:"left",fontSize:9,color:C.textM,fontWeight:600,textTransform:"uppercase"}}>{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {preview.items.slice(0,15).map((item,i)=><tr key={i} style={{borderBottom:"1px solid "+C.border,background:i%2===0?"transparent":C.bg2}}>
                {Object.keys(item).filter(k=>!["id","createdAt"].includes(k)).slice(0,8).map(k=><td key={k} style={{padding:"6px 10px",color:C.textS,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",maxWidth:160}}>{String(item[k]||"—").slice(0,40)}</td>)}
              </tr>)}
              {preview.items.length>15&&<tr><td colSpan={8} style={{padding:"8px 10px",textAlign:"center",fontSize:10,color:C.textM,fontStyle:"italic"}}>... y {preview.items.length-15} más</td></tr>}
            </tbody>
          </table>
        </div>
      </div>}
    </Card>

    {/* Estado integración */}
    <Card C={C}>
      <STitle C={C}>Roadmap de integración con Softland</STitle>
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {[
          {fase:"Fase 1 (actual)",titulo:"Carga manual CSV/Excel",estado:"activa",desc:"Exportar desde Softland, pegar en este importador. Funciona desde día 1."},
          {fase:"Fase 2",titulo:"Importación programada",estado:"futuro",desc:"Script automático lee archivos depositados en carpeta compartida 1-2 veces al día."},
          {fase:"Fase 3A",titulo:"API Softland",estado:"futuro",desc:"Conexión server-side contra endpoints Softland, con credenciales fuera del navegador."},
          {fase:"Fase 3B",titulo:"Base de datos / vistas SQL",estado:"futuro",desc:"Lectura read-only desde vistas autorizadas si Softland no dispone API o si Power BI usa SQL."},
          {fase:"Fase 4",titulo:"Sincronización bidireccional",estado:"evaluacion",desc:"Cliente nuevo en ASSUR se crea en Softland (requiere middleware)."},
        ].map((x,i)=>(
          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"10px 12px",background:x.estado==="activa"?C.green+"11":C.bg2,borderRadius:6,border:"1px solid "+(x.estado==="activa"?C.green+"44":C.border)}}>
            <div style={{minWidth:90,fontSize:11,fontWeight:600,color:x.estado==="activa"?C.green:C.textM,fontFamily:ff,fontVariantNumeric:"tabular-nums"}}>{x.fase}</div>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600,color:C.text,fontFamily:ff}}>{x.titulo}</div>
              <div style={{fontSize:11,color:C.textM,fontFamily:ff,marginTop:2}}>{x.desc}</div>
            </div>
            {x.estado==="activa"&&<span style={{fontSize:10,padding:"3px 9px",borderRadius:12,background:C.green+"22",color:C.green,fontWeight:600}}>EN USO</span>}
            {x.estado==="evaluacion"&&<span style={{fontSize:10,padding:"3px 9px",borderRadius:12,background:C.amber+"22",color:C.amber,fontWeight:600}}>FUTURO</span>}
          </div>
        ))}
      </div>
    </Card>
  </div>;
}
