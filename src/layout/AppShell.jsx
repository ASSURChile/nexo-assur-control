import { ff } from "../config/appConstants";
import assurHexWhite from "../assets/brand/assur-hex-solid-whiteOnDark.svg";
import assurHexOrange from "../assets/brand/assur-hex-solid-orange.svg";

export function ShellTopBar({
  C,
  isLight,
  params,
  usdValue,
  sessionName,
  roleLabel,
  roleColor,
  searchSlot,
  showUsers,
  onToggleTheme,
  onAssistant,
  onUsers,
  onNewAction,
  onLogout,
}) {
  const orange = C.orange || "#E17327";
  const orangeD = C.orangeD || "#C55A1B";
  const headerBg = isLight ? "rgba(255,255,255,0.9)" : "rgba(16,25,39,0.94)";
  const headerBorder = isLight ? C.border : "rgba(210,226,245,0.12)";
  const brandText = isLight ? orangeD : "#FFFFFF";
  const brandSub = isLight ? C.textM : "rgba(234,241,248,0.62)";
  const headerButton = {
    background: "transparent",
    border: "1px solid " + (isLight ? C.border : "rgba(210,226,245,0.18)"),
    borderRadius: 12,
    color: isLight ? C.textS : "#E5EDF5",
    padding: "9px 12px",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: "0.08em",
    fontFamily: ff,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
  return (
    <div className="assur-topbar" style={{ background: headerBg, borderBottom: "1px solid " + headerBorder, padding: "0 22px", display: "flex", alignItems: "center", minHeight: 76, position: "sticky", top: 0, zIndex: 50, boxShadow: isLight ? "0 10px 28px rgba(23,34,53,0.045)" : "0 16px 38px rgba(0,0,0,0.18)", backdropFilter: "blur(16px)" }}>
      <div className="assur-topbar-brand" style={{ display: "flex", alignItems: "center", gap: 13, flexShrink: 0, width: 248 }}>
        <Logo light={isLight} size={36} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 22, fontWeight: 950, letterSpacing: "0.2em", color: brandText, textTransform: "uppercase", lineHeight: 0.95, transform: "scaleX(1.06)", transformOrigin: "left center" }}>NEXO</span>
          <span style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.12em", color: brandSub, textTransform: "uppercase", lineHeight: 1 }}>por ASSUR</span>
        </div>
      </div>
      <div className="assur-topbar-current" style={{ minWidth: 170, marginRight: "auto" }}>
        <div style={{ fontSize: 11, color: "#8AA3BD", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900, fontFamily: ff, lineHeight: 1.1 }}>Vista actual</div>
        <div style={{ fontSize: 18, color: "#F8FBFF", fontWeight: 900, fontFamily: ff, marginTop: 4, lineHeight: 1.05 }}>{roleLabel}</div>
      </div>
      <div className="assur-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 10, justifyContent: "flex-end", minWidth: 0, marginLeft: "auto", width: "100%" }}>
        <div className="assur-topbar-search" style={{ width: 500, maxWidth: "42vw", minWidth: 250, marginRight: "auto" }}>{searchSlot}</div>
        {[
          ["UF", params.ufValue || 0],
          ["USD", usdValue],
        ].map(([l, v]) => (
          <div className="assur-market-pill" key={l} style={{ background: isLight ? "#FFFFFF" : "rgba(255,255,255,0.055)", border: "1px solid " + (isLight ? C.border : "rgba(210,226,245,0.14)"), borderRadius: 13, padding: "8px 11px", textAlign: "center", minWidth: 86, boxShadow: isLight ? "0 10px 24px rgba(23,34,53,0.04)" : "none" }}>
            <div style={{ fontSize: 9, color: isLight ? C.textM : "rgba(219,230,243,0.62)", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 950 }}>{l}</div>
            <div style={{ fontSize: 14, fontWeight: 900, color: isLight ? C.text : "#EAF4FF", lineHeight: 1.15 }}>$ {Number(v || 0).toLocaleString("es-CL")}</div>
          </div>
        ))}
        <button className="assur-theme-button" onClick={onToggleTheme} title={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"} style={{ background: isLight ? "#FFFFFF" : "rgba(255,255,255,0.055)", border: "1px solid " + (isLight ? C.border : "rgba(210,226,245,0.14)"), borderRadius: 14, width: 42, height: 42, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: isLight ? C.text : "#F8FAFC", flexShrink: 0 }}>
          {isLight ? "☾" : "☀"}
        </button>
        <div className="assur-user-chip" style={{ textAlign: "right", paddingLeft: 4, minWidth: 132 }}>
          <div style={{ fontSize: 15, fontWeight: 900, color: isLight ? C.text : "#FFFFFF", fontFamily: ff, lineHeight: 1.1 }}>{sessionName}</div>
          <div style={{ fontSize: 11, fontFamily: ff, color: isLight ? orangeD : orange, fontWeight: 850, marginTop: 3 }}>{roleLabel}</div>
        </div>
        <button className="assur-assistant-button" onClick={onAssistant} style={{ ...headerButton, color: isLight ? orangeD : "#FDBA74", border: "1px solid " + (isLight ? "#F4C8A8" : "rgba(251,146,60,0.28)") }}>Asistente</button>
        <button className="assur-new-action-button" onClick={onNewAction} style={{ ...headerButton, background: "linear-gradient(135deg," + orangeD + "," + (C.orange || "#E17327") + ")", border: "1px solid transparent", color: "#FFFFFF", boxShadow: "0 14px 26px rgba(197,90,27,0.22)" }}>Nueva acción</button>
        {showUsers && <button onClick={onUsers} style={headerButton}>Usuarios</button>}
        <button onClick={onLogout} style={{ ...headerButton, color: isLight ? C.red : "#FCA5A5", border: "1px solid " + (isLight ? C.red + "66" : "#B45353") }}>Salir</button>
      </div>
    </div>
  );
}

export function ShellSidebar({ C, isLight, groups, activeGroup, tab, canSeeModule, goTab, currentTabLabel }) {
  const groupIcon = { inicio: "⌂", comercial: "◎", operaciones: "▦", finanzas: "$", recursos: "◷", sistema: "◌" };
  const orange = C.orange || "#E17327";
  const orangeD = C.orangeD || "#C55A1B";
  const sideBg = isLight ? "#FFFFFF" : "#0E1724";
  const sidePanel = isLight ? "#FFF0E4" : "rgba(225,115,39,0.14)";
  const sideBorder = isLight ? C.border : "rgba(210,226,245,0.12)";
  const sideMuted = isLight ? C.textM : "rgba(237,245,255,0.72)";
  const sideText = isLight ? C.textS : "#EDF5FF";
  return (
    <aside className="assur-sidebar" style={{ background: sideBg, borderRight: "1px solid " + sideBorder, position: "sticky", top: 76, height: "calc(100vh - 76px)", overflowY: "auto", padding: "20px 16px", boxSizing: "border-box" }}>
      <div className="assur-sidebar-brand" style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 10px 24px", marginBottom: 22, borderBottom: "1px solid " + sideBorder }}>
        <Logo light={isLight} size={35} />
        <div style={{ display: "grid", gap: 2 }}>
          <strong style={{ color: isLight ? orangeD : "#FFFFFF", fontSize: 23, lineHeight: 0.95, letterSpacing: "0.2em", fontFamily: ff, transform: "scaleX(1.06)", transformOrigin: "left center" }}>NEXO</strong>
          <span style={{ color: isLight ? C.textM : "rgba(234,241,248,0.62)", fontSize: 7.5, lineHeight: 1, letterSpacing: "0.12em", fontWeight: 700, fontFamily: ff, textTransform: "uppercase" }}>por ASSUR</span>
        </div>
      </div>
      <div style={{ padding: "0 12px 16px", borderBottom: "1px solid " + sideBorder, marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: sideMuted, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 900, fontFamily: ff, marginBottom: 7 }}>Módulo actual</div>
        <div style={{ fontSize: 20, color: sideText, fontWeight: 900, fontFamily: ff, lineHeight: 1.1 }}>{activeGroup.label}</div>
        <div style={{ fontSize: 14, color: sideMuted, fontFamily: ff, marginTop: 7 }}>{currentTabLabel}</div>
      </div>
      {groups.filter((g) => g.tabs.some((t) => canSeeModule(t.id))).map((group) => {
        const isActive = group.id === activeGroup.id;
        return (
          <div key={group.id} className={"assur-sidebar-group " + (isActive ? "is-active" : "")} style={{ marginBottom: 15 }}>
            <div className="assur-sidebar-group-title" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 12, background: isActive ? sidePanel : "transparent", color: isActive ? (isLight ? orangeD : "#FFFFFF") : sideMuted, boxShadow: isActive && !isLight ? "inset 3px 0 0 " + orange : "none" }}>
              <span style={{ width: 27, height: 27, borderRadius: 9, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, background: isActive ? orange : (isLight ? "#F2F5F8" : "rgba(255,255,255,0.06)"), color: isActive ? "#FFFFFF" : sideMuted }}>{groupIcon[group.id] || "•"}</span>
              <span style={{ fontSize: 12, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: ff }}>{group.label}</span>
            </div>
            <div className="assur-sidebar-tabs" style={{ display: "grid", gap: 4, marginTop: 7, paddingLeft: 12 }}>
              {group.tabs.filter((t) => canSeeModule(t.id)).map((t) => {
                const selected = t.id === tab;
                return (
                  <button key={t.id} onClick={() => goTab(t.id)} style={{ width: "100%", textAlign: "left", border: "none", background: selected ? (isLight ? "#FFF0E4" : "rgba(255,255,255,0.08)") : "transparent", color: selected ? (isLight ? orangeD : "#FFFFFF") : sideMuted, borderRadius: 10, padding: "10px 10px 10px 30px", fontSize: 13, fontWeight: selected ? 900 : 720, fontFamily: ff, cursor: "pointer", position: "relative", lineHeight: 1.2 }}>
                    {selected && <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", width: 7, height: 7, borderRadius: 7, background: orange }} />}
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </aside>
  );
}

export function Logo({ size = 30, light = true }) {
  return <img src={light ? assurHexOrange : assurHexWhite} alt="ASSUR" width={size} height={size} style={{ display: "block", width: size, height: size, objectFit: "contain" }} />;
}
