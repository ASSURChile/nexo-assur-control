import { useMemo, useRef, useState } from "react";
import { ff } from "../config/appConstants";
import { askAssistant, isAssistantConfigured } from "../services/assistantService";
import { rolLabel } from "../domain/roles";

const SUGGESTIONS = {
  admin: [
    "¿Qué requiere atención hoy?",
    "¿Qué proyectos están atrasados?",
    "¿Qué CxC está vencida?",
    "Resume pipeline, proyectos y MRR.",
  ],
  gerencia: [
    "¿Qué requiere atención hoy?",
    "¿Qué cotizaciones necesitan decisión?",
    "¿Qué riesgos operativos tenemos?",
    "¿Cómo está la caja y cobranza?",
  ],
  comercial: [
    "¿Qué propuestas están pendientes?",
    "¿Qué seguimientos debo priorizar?",
    "Resume mi pipeline comercial.",
    "¿Qué solicitudes de cotización están abiertas?",
  ],
  jefe_comercial: [
    "¿Cómo está el equipo comercial?",
    "¿Qué propuestas están listas para revisar?",
    "¿Qué pipeline requiere seguimiento?",
  ],
  operaciones: [
    "¿Qué cotizaciones faltan por preparar?",
    "¿Qué proyectos requieren cierre?",
    "¿Qué incidencias están abiertas?",
    "¿Qué materiales requieren gestión?",
  ],
  administrativo_operaciones: [
    "¿Qué materiales requieren gestión?",
    "¿Qué proyectos tienen pendientes operativos?",
    "¿Qué solicitudes están abiertas?",
  ],
  supervisor: [
    "¿Qué proyectos están atrasados?",
    "¿Qué incidencias debo revisar?",
    "¿Qué tareas siguen abiertas?",
  ],
  tecnico: [
    "¿Qué tengo para hoy?",
    "¿Qué tareas tengo asignadas?",
    "¿Qué proyecto debo priorizar?",
  ],
  monitoreo: [
    "¿Qué servicios están en activación?",
    "¿Qué protocolos están incompletos?",
    "¿Qué servicios tienen falla?",
  ],
  finanzas: [
    "¿Qué CxC está vencida?",
    "¿Cómo está el flujo de caja?",
    "¿Qué facturas requieren gestión?",
  ],
  almacen: [
    "¿Qué solicitudes de material están abiertas?",
    "¿Qué proyectos requieren materiales?",
  ],
  viewer: [
    "Dame un resumen general.",
    "¿Qué requiere atención hoy?",
  ],
};

function initialAssistantMessage(role) {
  const label = rolLabel(role);
  const map = {
    tecnico: "Hola. Puedo ayudarte con tu jornada, tareas asignadas, proyectos e incidencias visibles para tu rol.",
    comercial: "Hola. Puedo ayudarte con pipeline, contactos, seguimientos y solicitudes comerciales.",
    operaciones: "Hola. Puedo ayudarte con cotizaciones, proyectos, materiales, incidencias y cierres operativos.",
    finanzas: "Hola. Puedo ayudarte con CxC, CxP, caja, facturación y vencimientos.",
    gerencia: "Hola. Puedo darte una vista transversal de foco diario, operación, comercial y finanzas.",
    admin: "Hola. Puedo ayudarte a consultar el estado global del sistema y sus flujos críticos.",
  };
  return map[role] || `Hola. Responderé según tu perfil ${label} y tus permisos activos.`;
}

export function AssistantFloatingButton({ C, onClick }) {
  return (
    <>
      <style>{`
        @media (max-width: 560px) {
          .assur-assistant-floating {
            bottom: 92px !important;
            right: 14px !important;
            padding: 11px 14px !important;
            font-size: 12px !important;
          }
        }
      `}</style>
      <button
        className="assur-assistant-floating"
        onClick={onClick}
        style={{
          position: "fixed",
          right: 18,
          bottom: 18,
          zIndex: 80,
          border: "none",
          borderRadius: 999,
          padding: "13px 17px",
          background: "linear-gradient(135deg," + (C?.orangeD || "#C55A1B") + "," + (C?.orange || "#E17327") + ")",
          color: "#FFFFFF",
          boxShadow: "0 18px 34px rgba(197,90,27,0.28)",
          fontFamily: ff,
          fontWeight: 950,
          letterSpacing: "0.02em",
          cursor: "pointer",
        }}
      >
        Asistente NEXO
      </button>
    </>
  );
}

export function AssistantPanel({ C, isLight = true, open, onClose, session }) {
  const role = session?.rol || "viewer";
  const configured = isAssistantConfigured();
  const suggestions = useMemo(() => SUGGESTIONS[role] || SUGGESTIONS.viewer, [role]);
  const [threadId, setThreadId] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { id: "welcome", sender: "assistant", content: initialAssistantMessage(role), meta: { notice: true } },
  ]);
  const endRef = useRef(null);

  async function sendMessage(text = input) {
    const content = String(text || "").trim();
    if (!content || loading) return;
    const userMessage = { id: crypto.randomUUID(), sender: "user", content };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setLoading(true);
    try {
      const result = await askAssistant({ message: content, threadId });
      if (result.threadId && !threadId) setThreadId(result.threadId);
      setMessages((current) => [
        ...current,
        {
          id: result.messageId || crypto.randomUUID(),
          sender: "assistant",
          content: result.answer || "No pude preparar una respuesta.",
          meta: { role: result.role, toolName: result.toolName, used: result.used, limit: result.limit, auditStored: result.auditStored },
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          sender: "assistant",
          content: error.message || "No pude procesar la consulta ahora.",
          meta: { error: true },
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => endRef.current?.scrollIntoView?.({ block: "end" }), 40);
    }
  }

  if (!open) return null;

  const bg = isLight ? "#FFFFFF" : "#111827";
  const panelBorder = isLight ? C.border : "rgba(210,226,245,0.14)";
  const text = isLight ? C.text : "#F8FAFC";
  const muted = isLight ? C.textM : "rgba(226,232,240,0.72)";
  const bubbleUser = isLight ? "#FFF2E8" : "rgba(225,115,39,0.18)";
  const bubbleAssistant = isLight ? "#F6F8FB" : "rgba(255,255,255,0.06)";
  const orange = C.orange || "#E17327";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 90, pointerEvents: "none" }}>
      <button
        aria-label="Cerrar asistente"
        onClick={onClose}
        style={{ position: "absolute", inset: 0, border: "none", background: "rgba(15,23,42,0.28)", pointerEvents: "auto", cursor: "default" }}
      />
      <aside
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          height: "100%",
          width: "min(440px, 100vw)",
          background: bg,
          borderLeft: "1px solid " + panelBorder,
          boxShadow: "-24px 0 60px rgba(15,23,42,0.22)",
          pointerEvents: "auto",
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          fontFamily: ff,
        }}
      >
        <header style={{ padding: 22, borderBottom: "1px solid " + panelBorder }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 950, letterSpacing: "0.14em", textTransform: "uppercase", color: orange }}>Asistente NEXO</div>
              <h2 style={{ margin: "7px 0 4px", color: text, fontSize: 24, lineHeight: 1.05 }}>Consulta rápida</h2>
              <p style={{ margin: 0, color: muted, fontSize: 13, lineHeight: 1.45 }}>
                Responde como {rolLabel(role)} y respeta tus permisos activos.
              </p>
            </div>
            <button onClick={onClose} style={{ border: "1px solid " + panelBorder, background: "transparent", color: text, borderRadius: 12, width: 38, height: 38, cursor: "pointer", fontSize: 18 }}>×</button>
          </div>
          <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 12, background: isLight ? "#FFF8F2" : "rgba(225,115,39,0.12)", color: isLight ? "#9A4B18" : "#FDBA74", fontSize: 12.5, lineHeight: 1.4, border: "1px solid " + (isLight ? "#F4D0B7" : "rgba(251,146,60,0.22)") }}>
            El asistente no modifica datos; entrega apoyo de consulta.
          </div>
        </header>

        <main style={{ overflowY: "auto", padding: 18, display: "grid", alignContent: "start", gap: 12 }}>
          {!configured && (
            <div style={{ padding: 13, borderRadius: 12, background: isLight ? "#FEF2F2" : "rgba(127,29,29,0.2)", color: isLight ? "#991B1B" : "#FCA5A5", fontSize: 13, border: "1px solid " + (isLight ? "#FECACA" : "rgba(248,113,113,0.2)") }}>
              Falta configurar `VITE_ASSISTANT_API_URL` para consultar el Worker.
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => sendMessage(suggestion)}
                disabled={!configured || loading}
                style={{
                  border: "1px solid " + panelBorder,
                  background: isLight ? "#FFFFFF" : "rgba(255,255,255,0.04)",
                  color: text,
                  borderRadius: 999,
                  padding: "8px 10px",
                  cursor: configured && !loading ? "pointer" : "not-allowed",
                  fontSize: 12.5,
                  fontWeight: 750,
                }}
              >
                {suggestion}
              </button>
            ))}
          </div>
          {messages.map((message) => {
            const user = message.sender === "user";
            return (
              <div key={message.id} style={{ display: "flex", justifyContent: user ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "88%", borderRadius: user ? "16px 16px 4px 16px" : "16px 16px 16px 4px", padding: "12px 13px", background: user ? bubbleUser : bubbleAssistant, color: text, border: "1px solid " + (user ? (isLight ? "#F4D0B7" : "rgba(251,146,60,0.18)") : panelBorder), lineHeight: 1.45, fontSize: 13.5, whiteSpace: "pre-wrap" }}>
                  {message.content}
                  {message.meta?.toolName && (
                    <div style={{ marginTop: 9, color: muted, fontSize: 11.5 }}>
                      {message.meta.auditStored ? "Consulta auditada" : "Consulta procesada"} · {message.meta.toolName} · {message.meta.used}/{message.meta.limit}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {loading && <div style={{ color: muted, fontSize: 13 }}>Preparando respuesta...</div>}
          <div ref={endRef} />
        </main>

        <footer style={{ padding: 16, borderTop: "1px solid " + panelBorder }}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              sendMessage();
            }}
            style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}
          >
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Pregunta por proyectos, cotizaciones, CxC, tareas..."
              rows={2}
              disabled={!configured || loading}
              style={{
                resize: "none",
                border: "1px solid " + panelBorder,
                borderRadius: 14,
                background: isLight ? "#FFFFFF" : "rgba(255,255,255,0.04)",
                color: text,
                padding: "11px 12px",
                fontFamily: ff,
                fontSize: 13.5,
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={!configured || loading || !input.trim()}
              style={{
                border: "none",
                borderRadius: 14,
                background: configured && input.trim() ? "linear-gradient(135deg," + (C.orangeD || "#C55A1B") + "," + orange + ")" : (isLight ? "#E2E8F0" : "rgba(255,255,255,0.12)"),
                color: configured && input.trim() ? "#FFFFFF" : muted,
                padding: "0 16px",
                fontWeight: 950,
                cursor: configured && input.trim() && !loading ? "pointer" : "not-allowed",
              }}
            >
              Enviar
            </button>
          </form>
        </footer>
      </aside>
    </div>
  );
}
