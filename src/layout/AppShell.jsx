import { ff } from "../config/appConstants";
import { Btn } from "../components/ui";
import assurHexDark from "../assets/brand/assur-hex-solid-darkOnLight.svg";
import assurHexWhite from "../assets/brand/assur-hex-solid-whiteOnDark.svg";

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
  onUsers,
  onLogout,
}) {
  const headerBg = "#101C2B";
  const headerBorder = "#213348";
  const brandText = "#FFFFFF";
  const brandSub = "#9DBBD3";
  const headerButton = {
    background: "transparent",
    border: "1px solid #56677A",
    borderRadius: 7,
    color: "#E5EDF5",
    padding: "6px 12px",
    cursor: "pointer",
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: "0.08em",
    fontFamily: ff,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
  return (
    <div className="assur-topbar" style={{ background: headerBg, borderBottom: "1px solid " + headerBorder, padding: "0 28px", display: "flex", alignItems: "center", minHeight: 78, position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 14px rgba(0,0,0,0.16)" }}>
      <div className="assur-topbar-brand" style={{ display: "flex", alignItems: "center", gap: 13, flexShrink: 0, width: 248 }}>
        <Logo light={false} size={36} />
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <span style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.25em", color: brandText, textTransform: "uppercase", lineHeight: 1 }}>ASSUR</span>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.38em", color: brandSub, textTransform: "uppercase", lineHeight: 1 }}>CONTROL</span>
        </div>
      </div>
      <div className="assur-topbar-current" style={{ minWidth: 170, marginRight: "auto" }}>
        <div style={{ fontSize: 11, color: "#8AA3BD", textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900, fontFamily: ff, lineHeight: 1.1 }}>Vista actual</div>
        <div style={{ fontSize: 18, color: "#F8FBFF", fontWeight: 900, fontFamily: ff, marginTop: 4, lineHeight: 1.05 }}>{roleLabel}</div>
      </div>
      <div className="assur-topbar-actions" style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "flex-end", minWidth: 0, marginLeft: "auto", width: "100%" }}>
        <div className="assur-topbar-search" style={{ width: 460, maxWidth: "38vw", minWidth: 280, marginRight: "auto" }}>{searchSlot}</div>
        {[
          ["UF", params.ufValue || 0],
          ["USD", usdValue],
        ].map(([l, v]) => (
          <div className="assur-market-pill" key={l} style={{ background: "#111F31", border: "1px solid #334961", borderRadius: 8, padding: "8px 12px", textAlign: "center", minWidth: 102 }}>
            <div style={{ fontSize: 10, color: "#8FA4BB", textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 900 }}>{l}</div>
            <div style={{ fontSize: 16, fontWeight: 850, color: "#EAF4FF", lineHeight: 1.15 }}>$ {Number(v || 0).toLocaleString("es-CL")}</div>
          </div>
        ))}
        <button className="assur-theme-button" onClick={onToggleTheme} title={isLight ? "Cambiar a modo oscuro" : "Cambiar a modo claro"} style={{ background: "#111F31", border: "1px solid #334961", borderRadius: 22, width: 44, height: 44, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: "#F8FAFC", flexShrink: 0 }}>
          {isLight ? "☾" : "☀"}
        </button>
        <div className="assur-user-chip" style={{ textAlign: "right", paddingLeft: 4, minWidth: 150 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: "#FFFFFF", fontFamily: ff, lineHeight: 1.1 }}>{sessionName}</div>
          <div style={{ fontSize: 11, fontFamily: ff, color: roleColor, fontWeight: 700, marginTop: 2 }}>{roleLabel}</div>
        </div>
        {showUsers && <button onClick={onUsers} style={headerButton}>Usuarios</button>}
        <button onClick={onLogout} style={{ ...headerButton, color: "#FCA5A5", borderColor: "#B45353" }}>Salir</button>
      </div>
    </div>
  );
}

export function ShellSidebar({ C, isLight, groups, activeGroup, tab, canSeeModule, goTab, currentTabLabel }) {
  const groupIcon = { inicio: "⌂", comercial: "◧", operaciones: "▤", finanzas: "$", recursos: "□", sistema: "⚙" };
  const sideBg = isLight ? "#0B1421" : "#0A0A0F";
  const sidePanel = isLight ? "#1A2C43" : "#121A28";
  const sideBorder = isLight ? "#213348" : "#1C2533";
  const sideMuted = "#B8C8DB";
  return (
    <aside className="assur-sidebar" style={{ background: sideBg, borderRight: "1px solid " + sideBorder, position: "sticky", top: 78, height: "calc(100vh - 78px)", overflowY: "auto", padding: "24px 18px", boxSizing: "border-box" }}>
      <div className="assur-sidebar-brand" style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 10px 24px", marginBottom: 22, borderBottom: "1px solid " + sideBorder }}>
        <Logo light={false} size={35} />
        <div style={{ display: "grid", gap: 2 }}>
          <strong style={{ color: "#FFFFFF", fontSize: 19, lineHeight: 1, letterSpacing: "0.24em", fontFamily: ff }}>ASSUR</strong>
          <span style={{ color: "#83C9EE", fontSize: 8, lineHeight: 1, letterSpacing: "0.48em", fontWeight: 850, fontFamily: ff }}>CONTROL</span>
        </div>
      </div>
      <div style={{ padding: "0 12px 18px", borderBottom: "1px solid " + sideBorder, marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: sideMuted, textTransform: "uppercase", letterSpacing: "0.16em", fontWeight: 900, fontFamily: ff, marginBottom: 7 }}>Módulo actual</div>
        <div style={{ fontSize: 22, color: "#F4F8FC", fontWeight: 900, fontFamily: ff, lineHeight: 1.1 }}>{activeGroup.label}</div>
        <div style={{ fontSize: 14, color: sideMuted, fontFamily: ff, marginTop: 7 }}>{currentTabLabel}</div>
      </div>
      {groups.filter((g) => g.tabs.some((t) => canSeeModule(t.id))).map((group) => {
        const isActive = group.id === activeGroup.id;
        return (
          <div key={group.id} style={{ marginBottom: 15 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 11px", borderRadius: 8, background: isActive ? sidePanel : "transparent", color: isActive ? "#F8FAFC" : sideMuted }}>
              <span style={{ width: 26, height: 26, borderRadius: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 900, background: isActive ? "#FFFFFF18" : "#FFFFFF10", color: isActive ? "#F8FAFC" : sideMuted }}>{groupIcon[group.id] || "•"}</span>
              <span style={{ fontSize: 13, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: ff }}>{group.label}</span>
            </div>
            <div style={{ display: "grid", gap: 4, marginTop: 7, paddingLeft: 12 }}>
              {group.tabs.filter((t) => canSeeModule(t.id)).map((t) => {
                const selected = t.id === tab;
                return (
                  <button key={t.id} onClick={() => goTab(t.id)} style={{ width: "100%", textAlign: "left", border: "none", background: selected ? "#FFFFFF16" : "transparent", color: selected ? "#FFFFFF" : sideMuted, borderRadius: 8, padding: "11px 10px 11px 32px", fontSize: 14, fontWeight: selected ? 900 : 750, fontFamily: ff, cursor: "pointer", position: "relative", lineHeight: 1.2 }}>
                    {selected && <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", width: 7, height: 7, borderRadius: 7, background: "#6BAEE0" }} />}
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
  return <img src={light ? assurHexDark : assurHexWhite} alt="ASSUR" width={size} height={size} style={{ display: "block", width: size, height: size, objectFit: "contain" }} />;
}
