import { useState } from "react";
import { ff } from "../config/appConstants";
import { Fld, Inp } from "../components/ui";
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

  const orange = C.orange || "#E17327";
  const orangeD = C.orangeD || "#C55A1B";
  const isLight = C.bg1 === "#FFFFFF";
  const panelBg = isLight ? "rgba(255,255,255,0.94)" : "rgba(16,25,39,0.9)";
  const sideBg = "linear-gradient(150deg," + orangeD + " 0%," + orange + " 58%,#F59A42 100%)";

  return <div style={{ minHeight: "100vh", background: isLight ? "#F5F7FA" : "#121D2B", display: "grid", placeItems: "center", fontFamily: ff, padding: 22, position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", inset: 0, background: isLight ? "radial-gradient(circle at 16% 18%, rgba(225,115,39,0.18), transparent 34%), radial-gradient(circle at 86% 74%, rgba(27,95,134,0.13), transparent 30%)" : "radial-gradient(circle at 15% 20%, rgba(225,115,39,0.24), transparent 34%), radial-gradient(circle at 82% 70%, rgba(131,201,238,0.1), transparent 34%)", pointerEvents: "none" }} />
    <div style={{ width: "min(960px, 100%)", minHeight: 560, display: "grid", gridTemplateColumns: "minmax(280px, 0.92fr) minmax(340px, 1.08fr)", background: panelBg, border: "1px solid " + (isLight ? "rgba(219,229,238,0.95)" : "rgba(210,226,245,0.13)"), borderRadius: 24, overflow: "hidden", boxShadow: isLight ? "0 24px 70px rgba(23,34,53,0.14)" : "0 30px 90px rgba(0,0,0,0.34)", position: "relative", zIndex: 1 }}>
      <div style={{ background: sideBg, padding: "34px 34px 30px", color: "#FFFFFF", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 28 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 70, height: 70, borderRadius: 22, background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.32)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}>
            <Logo light={false} size={42} />
          </div>
          <div style={{ marginTop: 28 }}>
            <div style={{ fontSize: 42, fontWeight: 950, letterSpacing: "0.18em", lineHeight: 0.95, textTransform: "uppercase", transform: "scaleX(1.08)", transformOrigin: "left center" }}>NEXO</div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", opacity: 0.76, marginTop: 8 }}>por ASSUR</div>
          </div>
          <p style={{ margin: "34px 0 0", fontSize: 17, lineHeight: 1.45, maxWidth: 320, color: "rgba(255,255,255,0.88)", fontWeight: 650 }}>
            Centro de control para operación, cotizaciones, proyectos y finanzas.
          </p>
        </div>
        <div style={{ display: "grid", gap: 12 }}>
          {["Comercial", "Operaciones", "Finanzas"].map((item, index) => (
            <div key={item} style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 13, fontWeight: 850, color: "rgba(255,255,255,0.9)" }}>
              <span style={{ width: 24, height: 24, borderRadius: 999, background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.22)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10 }}>{String(index + 1).padStart(2, "0")}</span>
              {item}
            </div>
          ))}
        </div>
      </div>
      <div style={{ padding: "46px min(5vw, 54px)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ marginBottom: 30 }}>
          <div style={{ fontSize: 11, fontWeight: 950, color: orangeD, textTransform: "uppercase", letterSpacing: "0.2em", marginBottom: 12 }}>Acceso seguro</div>
          <h1 style={{ margin: 0, color: C.text, fontSize: 34, lineHeight: 1.05, letterSpacing: 0, fontWeight: 950 }}>Bienvenido a NEXO</h1>
          <p style={{ margin: "12px 0 0", color: C.textM, fontSize: 15, lineHeight: 1.55, maxWidth: 430 }}>Ingresa para continuar con la gestión diaria de ASSUR.</p>
        </div>
      <Fld C={C} label="Correo electrónico"><Inp C={C} value={email} onChange={setEmail} type="text" placeholder="nombre@empresa.cl" /></Fld>
      <Fld C={C} label="Contraseña"><Inp C={C} value={pass} onChange={setPass} type="password" placeholder="••••••••" /></Fld>
      {err && <div style={{ background: C.red + "18", border: "1px solid " + C.red + "44", borderRadius: 12, padding: "10px 13px", fontSize: 12, color: C.red, marginBottom: 14, fontWeight: 750 }}>{err}</div>}
      <button onClick={handle} disabled={loading} style={{ width: "100%", minHeight: 50, border: "1px solid transparent", borderRadius: 14, background: "linear-gradient(135deg," + orangeD + "," + orange + ")", color: "#FFFFFF", fontSize: 13, fontWeight: 950, letterSpacing: "0.09em", textTransform: "uppercase", fontFamily: ff, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, boxShadow: "0 18px 34px rgba(197,90,27,0.24)" }}>{loading ? "Verificando..." : "Ingresar"}</button>
      {DEMO_AUTH_ENABLED ? <div style={{ marginTop: 20, padding: "13px 15px", background: isLight ? "#FFF4EB" : "rgba(225,115,39,0.11)", border: "1px solid " + (isLight ? "#F6D5BD" : "rgba(225,115,39,0.24)"), borderRadius: 14, fontSize: 12, color: C.textM, lineHeight: 1.85 }}>
        <strong style={{ color: C.textS }}>Acceso inicial temporal:</strong><br />
        Gerente general: gerente@assur.cl / ger123<br />
        Gerente ops/admin: gerops@assur.cl / gerops123<br />
        Jefe comercial: jefecomercial@assur.cl / jefe123<br />
        Vendedor: vendedor@assur.cl / vend123<br />
        Operaciones: oper@assur.cl / oper123<br />
        Técnico: tec@assur.cl / tec123
      </div> : <div style={{ marginTop: 20, padding: "13px 15px", background: C.bg2, border: "1px solid " + C.border, borderRadius: 14, fontSize: 12, color: C.textM, lineHeight: 1.7 }}>
        Autenticación preparada para Supabase. Configura usuarios reales antes de publicar.
      </div>}
      </div>
    </div>
  </div>;
}
