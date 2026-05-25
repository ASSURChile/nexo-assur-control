import { useEffect, useRef, useState } from "react";
import { ff } from "../config/appConstants";

export function Lbl({ C, ch, req }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 850, color: C.textM, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 7, fontFamily: ff, lineHeight: 1.25 }}>
      {ch}
      {req && <span style={{ color: C.red, marginLeft: 2 }}>*</span>}
    </div>
  );
}

export function Inp({ C, value, onChange, type = "text", placeholder = "", disabled, style = {} }) {
  const [f, setF] = useState(false);
  const isNum = type === "number";
  const dv = isNum && (value === 0 || value === "0" || value === null || value === undefined) ? "" : value;
  const ph = isNum && !placeholder ? "0" : placeholder;
  const base = { width: "100%", background: C.bg1, border: "1px solid " + (f ? C.blue : C.border), borderRadius: 8, color: C.text, padding: "11px 13px", fontSize: 14, fontFamily: ff, outline: "none", boxSizing: "border-box", boxShadow: f && C.isLight ? "0 0 0 3px rgba(27,95,134,0.1)" : "none", transition: "border-color 140ms ease, box-shadow 140ms ease", ...style };
  if (type === "password") return <input type="password" value={value || ""} onChange={(e) => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)} disabled={disabled} style={base} placeholder={placeholder} />;
  if (type === "email") return <input type="email" value={value || ""} onChange={(e) => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)} disabled={disabled} style={base} placeholder={placeholder} />;
  if (type === "date") return <input type="date" value={value || ""} onChange={(e) => onChange(e.target.value)} onFocus={() => setF(true)} onBlur={() => setF(false)} disabled={disabled} style={base} />;
  return <input type={isNum ? "number" : "text"} value={dv} placeholder={ph} onChange={(e) => onChange(isNum ? (e.target.value === "" ? 0 : +e.target.value) : e.target.value)} onFocus={(e) => { setF(true); if (isNum && (value === 0 || value === "0")) e.target.select(); }} onBlur={() => setF(false)} disabled={disabled} style={base} />;
}

export function Sel({ C, value, onChange, opts, placeholder = "— seleccionar —", disabled }) {
  const [f, setF] = useState(false);
  return (
    <select value={value || ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} onFocus={() => setF(true)} onBlur={() => setF(false)} style={{ width: "100%", background: C.bg1, border: "1px solid " + (f ? C.blue : C.border), borderRadius: 8, color: value ? C.text : C.textM, padding: "11px 13px", fontSize: 14, fontFamily: ff, outline: "none", appearance: "none", boxSizing: "border-box", boxShadow: f && C.isLight ? "0 0 0 3px rgba(27,95,134,0.1)" : "none", transition: "border-color 140ms ease, box-shadow 140ms ease" }}>
      <option value="">{placeholder}</option>
      {opts.map((o) => {
        const v = typeof o === "object" ? o.value : o;
        const l = typeof o === "object" ? o.label : o;
        return <option key={v} value={v}>{l}</option>;
      })}
    </select>
  );
}

export function SelBusca({ C, value, onChange, opts, placeholder = "— seleccionar —", disabled, emptyText = "Sin resultados" }) {
  const [open, setOpen] = useState(false);
  const [busca, setBusca] = useState("");
  const [hover, setHover] = useState(0);
  const ref = useRef(null);
  const items = (opts || []).map((o) => (typeof o === "object" ? o : { value: o, label: o }));
  const sel = items.find((o) => o.value === value);
  const lblSel = sel ? sel.label : "";
  const filtradas = items.filter((o) => !busca || (o.label || "").toLowerCase().includes(busca.toLowerCase()));

  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setBusca("");
      }
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  useEffect(() => {
    setHover(0);
  }, [busca]);

  const seleccionar = (v) => {
    onChange(v);
    setOpen(false);
    setBusca("");
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHover((h) => Math.min(h + 1, filtradas.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHover((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && filtradas[hover]) {
      e.preventDefault();
      seleccionar(filtradas[hover].value);
    } else if (e.key === "Escape") {
      setOpen(false);
      setBusca("");
    }
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button type="button" onClick={() => { if (!disabled) { setOpen((o) => !o); setBusca(""); } }} disabled={disabled} style={{ width: "100%", background: C.bg0, border: "1px solid " + (open ? C.blue : C.border), borderRadius: 8, color: lblSel ? C.text : C.textM, padding: "11px 13px", fontSize: 14, fontFamily: ff, outline: "none", textAlign: "left", cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", boxSizing: "border-box", opacity: disabled ? 0.6 : 1, boxShadow: open && C.isLight ? "0 0 0 3px rgba(27,95,134,0.1)" : "none" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{lblSel || placeholder}</span>
        <span style={{ fontSize: 10, color: C.textM, marginLeft: 6, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, boxShadow: C.isLight ? "0 18px 42px rgba(15,23,41,0.16)" : "0 12px 34px rgba(0,0,0,0.35)", zIndex: 100, maxHeight: 280, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 6, borderBottom: "1px solid " + C.border, background: C.bg2 }}>
            <input autoFocus value={busca} onChange={(e) => setBusca(e.target.value)} onKeyDown={onKey} placeholder="Buscar..." style={{ width: "100%", background: C.bg0, border: "1px solid " + C.border, borderRadius: 7, color: C.text, padding: "8px 10px", fontSize: 12, fontFamily: ff, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ overflowY: "auto", flex: 1, maxHeight: 230 }}>
            {filtradas.length === 0 ? (
              <div style={{ padding: "12px", fontSize: 12, color: C.textM, fontFamily: ff, textAlign: "center" }}>{emptyText}</div>
            ) : (
              filtradas.map((o, i) => {
                const isSel = o.value === value;
                const isHov = i === hover;
                return (
                  <div key={o.value + i} onClick={() => seleccionar(o.value)} onMouseEnter={() => setHover(i)} style={{ padding: "7px 12px", fontSize: 13, fontFamily: ff, cursor: "pointer", background: isSel ? C.blue + "22" : isHov ? C.bg2 : "transparent", color: isSel ? C.blue : C.text, borderLeft: isSel ? "3px solid " + C.blue : "3px solid transparent", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {o.label}
                  </div>
                );
              })
            )}
          </div>
          {items.length > 5 && (
            <div style={{ padding: "4px 10px", fontSize: 10, color: C.textM, fontFamily: ff, background: C.bg2, borderTop: "1px solid " + C.border, textAlign: "right" }}>
              {filtradas.length} de {items.length}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function Fld({ C, label, req, children, suffix, prefix }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && <Lbl C={C} ch={label} req={req} />}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {prefix && <span style={{ color: C.textM, fontSize: 13, flexShrink: 0 }}>{prefix}</span>}
        <div style={{ flex: 1 }}>{children}</div>
        {suffix && <span style={{ color: C.textM, fontSize: 12, flexShrink: 0 }}>{suffix}</span>}
      </div>
    </div>
  );
}

export function Stat({ C, label, value, sub, color, small }) {
  return (
    <div className="assur-stat" style={{ background: C.bg1, borderRadius: 8, padding: small ? "15px 16px" : "20px 22px", border: "1px solid " + C.border, boxShadow: C.isLight ? "0 14px 34px rgba(23,36,54,0.055)" : "none", minHeight: small ? undefined : 118 }}>
      <div style={{ fontSize: 11, color: C.textM, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10, fontWeight: 900, fontFamily: ff, lineHeight: 1.25 }}>{label}</div>
      <div style={{ fontSize: small ? 20 : 32, fontWeight: 900, color: color || C.text, fontFamily: ff, lineHeight: 1.05, letterSpacing: 0 }}>{value}</div>
      {sub && <div style={{ fontSize: 14, color: C.textM, marginTop: 8, fontFamily: ff, lineHeight: 1.35, fontWeight: 650 }}>{sub}</div>}
    </div>
  );
}

export function Bdg({ color = "#64748B", children, small }) {
  return <span style={{ background: color + "16", color, border: "1px solid " + color + "3D", borderRadius: 7, padding: small ? "3px 8px" : "5px 10px", fontSize: small ? 10 : 12, fontWeight: 800, display: "inline-flex", alignItems: "center", fontFamily: ff, whiteSpace: "nowrap", lineHeight: 1.2 }}>{children}</span>;
}

export function Btn({ C, onClick, children, variant = "solid", color, small, disabled, full }) {
  const bg = variant === "ghost" ? "transparent" : variant === "soft" ? (color || C.blue) + "22" : color || C.blue;
  const brd = variant === "ghost" ? "1px solid " + (color || C.borderL) : "1px solid " + (variant === "soft" ? (color || C.blue) + "44" : "transparent");
  const col = variant === "ghost" ? color || C.textM : variant === "soft" ? color || C.blue : "#fff";
  return <button onClick={onClick} disabled={disabled} style={{ background: bg, color: col, border: brd, borderRadius: 8, padding: small ? "8px 12px" : "11px 16px", cursor: disabled ? "not-allowed" : "pointer", fontSize: small ? 11 : 12, fontWeight: 900, letterSpacing: "0.06em", fontFamily: ff, textTransform: "uppercase", opacity: disabled ? 0.45 : 1, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 7, width: full ? "100%" : undefined, justifyContent: full ? "center" : undefined, boxShadow: variant === "solid" && C.isLight ? "0 8px 18px rgba(27,95,134,0.14)" : "none", lineHeight: 1.15 }}>{children}</button>;
}

export function Card({ C, children, style, pad, onClick }) {
  return <div className="assur-card" onClick={onClick} style={{ background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, padding: pad ?? 22, marginBottom: 16, boxShadow: C.isLight ? "0 16px 40px rgba(23,36,54,0.055)" : "none", ...style }}>{children}</div>;
}

export function STitle({ C, children, action }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 15, paddingBottom: 10, borderBottom: "1px solid " + C.border }}>
      <div style={{ fontSize: 12, fontWeight: 900, color: C.blue, textTransform: "uppercase", letterSpacing: "0.09em", fontFamily: ff }}>{children}</div>
      {action}
    </div>
  );
}

export function Modal({ C, title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 200, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 52, overflowY: "auto" }}>
      <div style={{ background: C.bg1, border: "1px solid " + C.border, borderRadius: 8, width, maxWidth: "93vw", padding: 26, marginBottom: 40, boxShadow: C.isLight ? "0 26px 70px rgba(15,23,41,0.18)" : "0 26px 70px rgba(0,0,0,0.42)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div style={{ fontSize: 17, fontWeight: 850, color: C.text, fontFamily: ff }}>{title}</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.textM, cursor: "pointer", fontSize: 19, padding: 2 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function G({ cols = 2, children, gap = "0 14px" }) {
  return <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap }}>{children}</div>;
}

export function EmptyState({ C, icon, title, sub, action }) {
  return (
    <div style={{ textAlign: "center", padding: "60px 20px", background: C.bg1, border: "1px dashed " + C.border, borderRadius: 10 }}>
      <div style={{ fontSize: 36, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: ff, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: C.textM, fontFamily: ff, marginBottom: action ? 18 : 0, maxWidth: 420, margin: "0 auto 18px" }}>{sub}</div>
      {action}
    </div>
  );
}

export function ModuleHero({ C, eyebrow, title, subtitle, actions, children }) {
  return (
    <Card C={C} style={{ marginBottom: 16, padding: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 16, alignItems: "start" }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div style={{ fontSize: 11, color: C.blue, textTransform: "uppercase", letterSpacing: "0.14em", fontWeight: 900, fontFamily: ff, marginBottom: 7 }}>{eyebrow}</div>}
          <div style={{ fontSize: 22, color: C.text, fontWeight: 900, fontFamily: ff, lineHeight: 1.12 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: C.textM, fontFamily: ff, marginTop: 6, lineHeight: 1.45, maxWidth: 780 }}>{subtitle}</div>}
        </div>
        {actions && <div className="assur-module-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>{actions}</div>}
      </div>
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </Card>
  );
}

export function QuickActions({ C, items = [] }) {
  const visible = items.filter(Boolean);
  if (!visible.length) return null;
  return (
    <div className="assur-quick-actions" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(visible.length, 4)}, minmax(0,1fr))`, gap: 10 }}>
      {visible.map((item) => (
        <button key={item.label} type="button" onClick={item.onClick} disabled={item.disabled} style={{ background: item.tone ? item.tone + "12" : C.bg2, border: "1px solid " + (item.tone ? item.tone + "3D" : C.border), borderRadius: 9, padding: "12px 13px", textAlign: "left", cursor: item.disabled ? "not-allowed" : "pointer", opacity: item.disabled ? 0.55 : 1, minHeight: 76 }}>
          <div style={{ fontSize: 12, fontWeight: 900, color: item.tone || C.text, fontFamily: ff, lineHeight: 1.25 }}>{item.label}</div>
          {item.description && <div style={{ fontSize: 11, color: C.textM, fontFamily: ff, lineHeight: 1.35, marginTop: 5 }}>{item.description}</div>}
        </button>
      ))}
    </div>
  );
}

export function WorkflowSteps({ C, steps = [], active = 0 }) {
  return (
    <div className="assur-workflow" style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, steps.length)}, minmax(0,1fr))`, gap: 8 }}>
      {steps.map((step, index) => {
        const done = index < active;
        const current = index === active;
        const color = done ? C.green : current ? C.blue : C.textM;
        return (
          <div key={step} style={{ background: done || current ? color + "10" : C.bg2, border: "1px solid " + (done || current ? color + "40" : C.border), borderRadius: 8, padding: "10px 11px", minWidth: 0 }}>
            <div style={{ width: 22, height: 22, borderRadius: 22, background: color + "18", color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, fontFamily: ff, marginBottom: 7 }}>{done ? "✓" : index + 1}</div>
            <div style={{ fontSize: 11, color: done || current ? C.text : C.textM, fontWeight: current ? 900 : 750, fontFamily: ff, lineHeight: 1.25 }}>{step}</div>
          </div>
        );
      })}
    </div>
  );
}

export function SectionTabs({ C, value, onChange, items = [] }) {
  return (
    <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 2 }}>
      {items.map((item) => {
        const selected = value === item.value;
        return (
          <button key={item.value} type="button" onClick={() => onChange(item.value)} style={{ border: "1px solid " + (selected ? C.blue + "66" : C.border), background: selected ? C.blue + "14" : C.bg1, color: selected ? C.blue : C.textM, borderRadius: 8, padding: "9px 12px", fontSize: 12, fontWeight: selected ? 900 : 750, fontFamily: ff, cursor: "pointer", whiteSpace: "nowrap", lineHeight: 1 }}>
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
