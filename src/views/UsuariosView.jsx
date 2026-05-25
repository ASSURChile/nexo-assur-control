import { useEffect, useState } from "react";
import { ff } from "../config/appConstants";
import { MODULOS } from "../config/navigation";
import { Bdg, Btn, Fld, G, Inp, Modal, Sel } from "../components/ui";
import { repositories as repo } from "../services/repositories";
import { dataService } from "../services/dataService";
import { DEMO_AUTH_ENABLED, getSessionAccessToken } from "../services/authService";
import { listSupabaseProfiles, updateSupabaseProfile } from "../services/userProfilesService";
import { normalizePermissionValue, normalizeRole, ROLE_OPTIONS, rolColor, rolLabel } from "../domain/roles";

const newId=()=>dataService.id();

function PermisosPanel({C,permisos,onSave}){
  const [local,setLocal]=useState({...permisos});
  const [saved,setSaved]=useState(false);
  const actions=[
    ["ver","Ver"],
    ["crear","Crear"],
    ["editar","Editar"],
    ["aprobar","Aprobar"],
    ["convertir","Convertir"],
    ["gestionar_costos","Costos"],
    ["gestionar_materiales","Materiales"],
  ];
  const save=()=>{onSave(local);setSaved(true);setTimeout(()=>setSaved(false),2000);};
  const toggle=(rol,modId,action)=>setLocal(p=>{
    const current=normalizePermissionValue(p?.[rol]?.[modId]);
    const next=current?{...current}:{ver:false};
    next[action]=!next[action];
    if(action!=="ver"&&next[action])next.ver=true;
    if(action==="ver"&&!next.ver)return {...p,[rol]:{...p[rol],[modId]:false}};
    return {...p,[rol]:{...p[rol],[modId]:next}};
  });
  const mods=MODULOS.filter(m=>m.id!=="config");
  const rolesMatrix=ROLE_OPTIONS.filter(r=>!["admin","tecnico"].includes(r.value));
  return <div style={{marginTop:18,padding:"18px",background:C.bg2,borderRadius:8,border:"1px solid "+C.border}}>
    <div style={{fontSize:11,fontWeight:900,color:C.blue,textTransform:"uppercase",letterSpacing:"0.14em",fontFamily:ff,marginBottom:5}}>Matriz de acceso por rol</div>
    <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginBottom:14,lineHeight:1.45}}>Activa módulos y acciones por rol. Administrador siempre tiene acceso total y Técnico usa la vista móvil de terreno.</div>
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
        <thead><tr style={{borderBottom:"1px solid "+C.border}}>
          <th style={{position:"sticky",left:0,zIndex:2,background:C.bg2,padding:"8px 10px",color:C.textM,fontWeight:900,textAlign:"left",fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",fontFamily:ff,minWidth:190}}>Módulo</th>
          {rolesMatrix.map(r=><th key={r.value} style={{padding:"8px 10px",color:rolColor(r.value,C),fontWeight:900,textAlign:"center",fontSize:10,fontFamily:ff,whiteSpace:"nowrap",minWidth:250}}>{r.label}</th>)}
        </tr></thead>
        <tbody>
          {mods.map((m,i)=>{
            return <tr key={m.id} style={{borderBottom:"1px solid "+C.border,background:i%2?C.bg2+"88":"transparent"}}>
              <td style={{position:"sticky",left:0,zIndex:1,background:i%2?C.bg2:"#fff",padding:"9px 10px",fontWeight:800,color:C.text,fontFamily:ff,fontSize:12}}>{m.label}</td>
              {rolesMatrix.map(r=>{
                const value=normalizePermissionValue(local?.[r.value]?.[m.id]);
                return <td key={r.value} style={{textAlign:"center",padding:"8px"}}>
                  <div style={{display:"flex",gap:4,justifyContent:"center",flexWrap:"wrap"}}>
                    {actions.map(([action,label])=>{
                      const val=!!value?.[action];
                      return <button key={action} type="button" title={label} onClick={()=>toggle(r.value,m.id,action)} style={{minWidth:28,height:22,borderRadius:6,background:val?rolColor(r.value,C)+"22":"transparent",border:"1px solid "+(val?rolColor(r.value,C)+"77":C.border),cursor:"pointer",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:9,color:val?rolColor(r.value,C):C.textM,fontWeight:900}}>
                        {label.slice(0,3)}
                      </button>;
                    })}
                  </div>
                </td>;
              })}
            </tr>;
          })}
        </tbody>
      </table>
    </div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginTop:12}}>
      <div style={{fontSize:11,color:C.textM,fontFamily:ff}}>Tip: crea usuarios con rol “Comercial” o “Finanzas” y luego ajusta aquí solo los módulos que realmente necesitan.</div>
      <Btn C={C} onClick={save}>{saved?"✓ Guardado":"Guardar permisos"}</Btn>
    </div>
  </div>;
}

export default function UsuariosView({C,currentUser,onClose,permisos,onSavePermisos}){
  const [lista,setLista]=useState(repo.usuarios.list());
  const [tecnicos,setTecnicos]=useState(repo.tecnicos.list());
  const [modal,setModal]=useState(null);const [form,setForm]=useState({});const [confId,setConf]=useState(null);
  const [loadingProfiles,setLoadingProfiles]=useState(false);
  const [profilesError,setProfilesError]=useState("");
  const supabaseAuth=!DEMO_AUTH_ENABLED;
  const sf=(k,v)=>setForm(f=>({...f,[k]:v}));
  useEffect(()=>{
    if(!supabaseAuth)return;
    let mounted=true;
    setLoadingProfiles(true);
    setProfilesError("");
    listSupabaseProfiles(getSessionAccessToken())
      .then(users=>{if(!mounted)return;repo.usuarios.replaceAll(users);setLista(users);})
      .catch(error=>{if(!mounted)return;setProfilesError(error?.message||"No se pudieron cargar perfiles desde Supabase.");})
      .finally(()=>{if(mounted)setLoadingProfiles(false);});
    return()=>{mounted=false;};
  },[supabaseAuth]);
  const save=async()=>{
    if(!form.nombre?.trim()||!form.email?.trim()||(DEMO_AUTH_ENABLED&&modal==="new"&&!form.password?.trim()))return;
    const email=(form.email||"").trim().toLowerCase();
    if(lista.some(u=>(u.email||"").trim().toLowerCase()===email&&u.id!==form.id)){alert("Ya existe un usuario con ese correo.");return;}
    const l=[...lista];const i=l.findIndex(u=>u.id===form.id);
    const prev=i>=0?l[i]:null;
    const rol=normalizeRole(form.rol);
    const item={...prev,...form,email,rol,activo:form.activo!==false,tecnicoId:rol==="tecnico"?form.tecnicoId||prev?.tecnicoId||"":undefined,updatedAt:new Date().toISOString()};
    if(modal==="edit"&&!form.password)delete item.password;
    if(prev&&!item.password)item.password=prev.password;
    if(supabaseAuth){
      try{
        const saved=await updateSupabaseProfile(getSessionAccessToken(),form.id,item);
        const next=l.map(u=>u.id===saved.id?saved:u);
        repo.usuarios.replaceAll(next);setLista(next);setModal(null);
      }catch(error){alert(error?.message||"No se pudo guardar el perfil en Supabase.");}
      return;
    }
    const savedUser=i>=0?item:{...item,id:newId(),createdAt:new Date().toISOString()};
    if(i>=0)l[i]=savedUser;else l.push(savedUser);
    let techList=tecnicos.map(t=>t.usuarioId===savedUser.id&&t.id!==savedUser.tecnicoId?{...t,usuarioId:"",updatedAt:new Date().toISOString()}:t);
    if(rol==="tecnico"){
      let tec=techList.find(t=>t.id===savedUser.tecnicoId);
      if(!tec){
        tec={id:newId(),usuarioId:savedUser.id,nombre:savedUser.nombre,email:savedUser.email,rolId:"tec_normal",activo:true,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
        techList=[...techList,tec];
        savedUser.tecnicoId=tec.id;
        const idx=l.findIndex(u=>u.id===savedUser.id);if(idx>=0)l[idx]=savedUser;
      }else{
        techList=techList.map(t=>t.id===tec.id?{...t,usuarioId:savedUser.id,email:t.email||savedUser.email,nombre:t.nombre||savedUser.nombre,updatedAt:new Date().toISOString()}:t);
      }
    }
    repo.usuarios.replaceAll(l);repo.tecnicos.replaceAll(techList);setLista(l);setTecnicos(techList);setModal(null);
  };
  const remove=async(id)=>{
    if(id===currentUser.userId){alert("No puedes desactivar tu propia cuenta.");return;}
    if(supabaseAuth){
      const user=lista.find(u=>u.id===id);
      try{
        const saved=await updateSupabaseProfile(getSessionAccessToken(),id,{...user,activo:false});
        const next=lista.map(u=>u.id===id?saved:u);
        repo.usuarios.replaceAll(next);setLista(next);setConf(null);
      }catch(error){alert(error?.message||"No se pudo desactivar el perfil en Supabase.");}
      return;
    }
    const l=lista.filter(u=>u.id!==id);repo.usuarios.replaceAll(l);setLista(l);setConf(null);
  };
  return <Modal C={C} title="Gestión de usuarios y roles" onClose={onClose} width={980}>
    <div style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",marginBottom:14}}>
      <div>
        <div style={{fontSize:13,fontWeight:900,color:C.text,fontFamily:ff}}>Usuarios del sistema</div>
        <div style={{fontSize:12,color:C.textM,fontFamily:ff,marginTop:3}}>Asigna rol, área y permisos visibles por módulo. {supabaseAuth?"Las altas de usuario se crean en Supabase Auth; aquí se administra el perfil operativo.":"Modo demo permite crear usuarios locales."}</div>
      </div>
      <Btn C={C} disabled={supabaseAuth} onClick={()=>{setForm({nombre:"",email:"",password:"",rol:"comercial",area:"Comercial",cargo:"",activo:true});setModal("new");}}>+ Nuevo usuario</Btn>
    </div>
    {loadingProfiles&&<div style={{padding:"10px 12px",background:C.bg2,border:"1px solid "+C.border,borderRadius:6,color:C.textM,fontSize:12,fontFamily:ff,marginBottom:10}}>Cargando perfiles desde Supabase...</div>}
    {profilesError&&<div style={{padding:"10px 12px",background:C.red+"12",border:"1px solid "+C.red+"55",borderRadius:6,color:C.red,fontSize:12,fontFamily:ff,marginBottom:10}}>{profilesError}</div>}
    {supabaseAuth&&<div style={{padding:"10px 12px",background:C.blue+"10",border:"1px solid "+C.blue+"44",borderRadius:6,color:C.textM,fontSize:12,fontFamily:ff,marginBottom:10,lineHeight:1.45}}>Para agregar un usuario nuevo: créalo primero en Supabase Authentication y luego crea o ajusta su fila en <strong style={{color:C.text}}>profiles</strong>. Esta pantalla permite cambiar rol, estado y ficha técnica sin exponer contraseñas.</div>}
    {lista.map(u=><div key={u.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border,marginBottom:7}}>
      <div style={{flex:1}}><div style={{fontSize:13,fontWeight:800,color:C.text,fontFamily:ff}}>{u.nombre}</div><div style={{fontSize:11,color:C.textM,fontFamily:ff}}>{u.email}{u.area?` · ${u.area}`:""}{u.cargo?` · ${u.cargo}`:""}{normalizeRole(u.rol)==="tecnico"&&<span> · Técnico: {tecnicos.find(t=>t.id===u.tecnicoId)?.nombre||"sin vínculo"}</span>}</div></div>
      <Bdg color={rolColor(u.rol,C)} small>{rolLabel(u.rol)}</Bdg>
      {u.activo===false&&<Bdg color={C.red} small>Inactivo</Bdg>}
      {u.id===currentUser.userId&&<Bdg color={C.amber} small>Tú</Bdg>}
      {u.id!==currentUser.userId&&<div style={{display:"flex",gap:4}}>
        <Btn C={C} ghost small onClick={()=>{setForm({...u,password:""});setModal("edit");}}>Editar</Btn>
        {confId===u.id?<><Btn C={C} color={C.red} small onClick={()=>remove(u.id)}>✓</Btn><Btn C={C} ghost small onClick={()=>setConf(null)}>✕</Btn></>:<Btn C={C} ghost color={C.red} small onClick={()=>setConf(u.id)}>{supabaseAuth?"Desactivar":"Eliminar"}</Btn>}
      </div>}
    </div>)}
    {modal&&<div style={{marginTop:14,padding:"14px 16px",background:C.bg2,borderRadius:5,border:"1px solid "+C.border}}>
      <div style={{fontSize:12,fontWeight:600,color:C.textS,fontFamily:ff,marginBottom:12}}>{modal==="new"?"Nuevo usuario":"Editar usuario"}</div>
      <G cols={2}>
        <Fld C={C} label="Nombre" req><Inp C={C} value={form.nombre||""} onChange={v=>sf("nombre",v)}/></Fld>
        <Fld C={C} label="Correo" req><Inp C={C} value={form.email||""} onChange={v=>sf("email",v)} type="email"/></Fld>
        {DEMO_AUTH_ENABLED&&<Fld C={C} label={modal==="new"?"Contraseña":"Nueva contraseña (vacío = no cambiar)"}><Inp C={C} value={form.password||""} onChange={v=>sf("password",v)} type="password"/></Fld>}
        <Fld C={C} label="Rol del sistema"><Sel C={C} value={normalizeRole(form.rol||"viewer")} onChange={v=>sf("rol",v)} opts={ROLE_OPTIONS}/></Fld>
        <Fld C={C} label="Área"><Sel C={C} value={form.area||""} onChange={v=>sf("area",v)} opts={["Gerencia","Comercial","Operaciones","Monitoreo","Finanzas","Almacén","Administración","Otro"]}/></Fld>
        <Fld C={C} label="Cargo / función"><Inp C={C} value={form.cargo||""} onChange={v=>sf("cargo",v)} placeholder="Ej: Ejecutivo comercial, Encargado finanzas"/></Fld>
        {normalizeRole(form.rol)==="tecnico"&&<Fld C={C} label="Ficha técnico"><Sel C={C} value={form.tecnicoId||""} onChange={v=>sf("tecnicoId",v)} opts={[{value:"",label:"Crear o vincular automáticamente"},...tecnicos.map(t=>({value:t.id,label:t.nombre||t.email||t.id}))]}/></Fld>}
        <Fld C={C} label="Estado"><Sel C={C} value={form.activo===false?"inactivo":"activo"} onChange={v=>sf("activo",v==="activo")} opts={[{value:"activo",label:"Activo"},{value:"inactivo",label:"Inactivo"}]}/></Fld>
      </G>
      <div style={{display:"flex",gap:7,justifyContent:"flex-end"}}><Btn C={C} ghost onClick={()=>setModal(null)}>Cancelar</Btn><Btn C={C} onClick={save} disabled={!form.nombre?.trim()||!form.email?.trim()||(DEMO_AUTH_ENABLED&&modal==="new"&&!form.password?.trim())}>Guardar</Btn></div>
    </div>}
    {permisos&&onSavePermisos&&<PermisosPanel C={C} permisos={permisos} onSave={onSavePermisos}/>}
  </Modal>;
}
