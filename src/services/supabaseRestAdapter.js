function assertBrowserConfig({url,anonKey}){
  if(!url||!anonKey){
    throw new Error("Falta configurar VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.");
  }
}

const COLLECTIONS_TABLE = "app_collections";

// Adaptador transitorio para publicar el MVP sin transformar aun todos los campos.
// Guarda cada entidad como JSONB por clave. La activacion requiere que los
// repositorios pasen a flujo async; mientras tanto queda como pieza preparada.
// La migracion final a tablas normalizadas queda descrita en docs/data-model-cloud.md.
export function createSupabaseRestAdapter({url,anonKey,getAccessToken}={}){
  assertBrowserConfig({url,anonKey});

  const headers=()=>({
    apikey:anonKey,
    Authorization:`Bearer ${getAccessToken?.()||anonKey}`,
    "Content-Type":"application/json",
    Prefer:"return=representation",
  });

  const request=async(path,options={})=>{
    const res=await fetch(`${url.replace(/\/$/,"")}/rest/v1/${path}`,{
      ...options,
      headers:{...headers(),...(options.headers||{})},
    });
    if(!res.ok){
      const detail=await res.text().catch(()=>"");
      throw new Error(`Supabase ${res.status}: ${detail||res.statusText}`);
    }
    if(res.status===204)return null;
    return res.json();
  };

  return {
    async get(key,fallback=[]){
      const rows=await request(`${COLLECTIONS_TABLE}?key=eq.${encodeURIComponent(key)}&select=value`);
      return rows?.[0]?.value ?? fallback;
    },
    async set(key,value){
      const rows=await request(`${COLLECTIONS_TABLE}?on_conflict=key`,{
        method:"POST",
        headers:{Prefer:"resolution=merge-duplicates,return=representation"},
        body:JSON.stringify({key,value,updated_at:new Date().toISOString()}),
      });
      return rows?.[0]?.value ?? value;
    },
    async remove(key){
      await request(`${COLLECTIONS_TABLE}?key=eq.${encodeURIComponent(key)}`,{method:"DELETE"});
    },
  };
}

export { COLLECTIONS_TABLE };
