import { useState } from "react";
import { ff } from "../config/appConstants";
import { Btn, Fld, Inp } from "../components/ui";
import { Logo } from "../layout/AppShell";
import { DEMO_AUTH_ENABLED, loginDemoUser, loginSupabaseUser } from "../services/authService";

export default function LoginScreen({ C, onLogin }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    if (!email || !pass) {
      setErr("Ingresa usuario y contraseña.");
      return;
    }
    setLoading(true);
    setErr("");
    try {
      await new Promise(resolve => setTimeout(resolve, 250));
      const session = DEMO_AUTH_ENABLED
        ? loginDemoUser({ email, password: pass })
        : await loginSupabaseUser({ email, password: pass });
      if (session) onLogin(session);
      else setErr("Usuario sin perfil activo en ASSUR Control.");
    } catch (error) {
      console.error("ASSUR login error", error);
      if (error?.status === 400 || /invalid login|invalid grant|credenciales/i.test(error?.message || "")) {
        setErr("Usuario o contraseña incorrectos en Supabase.");
      } else {
        setErr(error?.message || "No se pudo iniciar sesión. Revisa la conexión y recarga la página.");
      }
    } finally {
      setLoading(false);
    }
  };

  return <div style={{ minHeight: "100vh", background: C.bg0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: ff }}>
    <div style={{ width: 380, background: C.bg1, border: "1px solid " + C.border, borderRadius: 10, padding: 36 }}>
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 12 }}>
          <Logo light={C.bg1 !== "#222831"} size={42} />
          <div style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "left" }}>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: "0.22em", color: C.text, textTransform: "uppercase", lineHeight: 1 }}>ASSUR</span>
            <span style={{ fontSize: 10, fontWeight: 400, letterSpacing: "0.35em", color: C.blue, textTransform: "uppercase", lineHeight: 1 }}>CONTROL</span>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.textM, letterSpacing: "0.06em" }}>Control financiero · Operacional · Contable</div>
      </div>
      <Fld C={C} label="Correo electrónico"><Inp C={C} value={email} onChange={setEmail} type="text" placeholder="nombre@empresa.cl" /></Fld>
      <Fld C={C} label="Contraseña"><Inp C={C} value={pass} onChange={setPass} type="password" placeholder="••••••••" /></Fld>
      {err && <div style={{ background: C.red + "22", border: "1px solid " + C.red + "55", borderRadius: 5, padding: "8px 12px", fontSize: 12, color: C.red, marginBottom: 14 }}>{err}</div>}
      <Btn C={C} onClick={handle} disabled={loading} full>{loading ? "Verificando..." : "Ingresar"}</Btn>
      {DEMO_AUTH_ENABLED ? <div style={{ marginTop: 18, padding: "10px 13px", background: C.bg2, borderRadius: 5, fontSize: 11, color: C.textM, lineHeight: 1.8 }}>
        <strong style={{ color: C.textS }}>Acceso inicial:</strong><br />
        Admin: admin@assur.cl / admin123<br />
        Operaciones: oper@assur.cl / oper123<br />
        Técnico: tec@assur.cl / tec123
      </div> : <div style={{ marginTop: 18, padding: "10px 13px", background: C.bg2, borderRadius: 5, fontSize: 11, color: C.textM, lineHeight: 1.7 }}>
        Autenticación preparada para Supabase. Configura usuarios reales antes de publicar.
      </div>}
    </div>
  </div>;
}
