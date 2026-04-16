import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const SECTOR_COLORS = {
  "Energy": "#0F6E56", "Defence": "#534AB7", "Technology": "#185FA5",
  "Healthcare": "#993556", "Food & Beverage": "#BA7517", "Beauty": "#993556",
  "Automotive": "#5F5E5A", "Maritime": "#0F6E56", "Manufacturing": "#444441",
  "Logistics": "#5F5E5A", "Finance": "#3B6D11", "Retail": "#BA7517",
  "Real Estate": "#888780", "Construction": "#633806", "Agriculture": "#3B6D11",
  "Jewellery": "#993556", "Aviation": "#185FA5", "Media": "#993C1D",
  "Transport": "#5F5E5A",
};

const CLIENT_ACCENT_COLORS = ["#1D9E75","#534AB7","#378ADD","#D4537E","#BA7517","#185FA5","#993556","#0F6E56","#634AB7","#1D6E9E"];

const REGION_CONFIG = {
  singapore: { label: "Singapore", flag: "🇸🇬" },
  malaysia:  { label: "Malaysia",  flag: "🇲🇾" },
  japan:     { label: "Japan",     flag: "🇯🇵" },
};

function getInitials(contact) {
  return contact.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ─── API ──────────────────────────────────────────────────────────────────────

const COLD_AGENT_ID = "agent_011CZwxfXbUhcTxgcg35dFL4";
const WARM_AGENT_ID = "agent_011Ca1x9MAbi3XMWR6pUsv9C";

async function callAgent(agentId, userMessage) {
  const r = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentId, userMessage }),
  });
  const d = await r.json();
  return (d.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
}

// ─── SMALL UI PRIMITIVES ──────────────────────────────────────────────────────

function PulseLoader({ text }) {
  const [dots, setDots] = useState(0);
  useEffect(() => { const t = setInterval(() => setDots(d => (d+1)%4), 400); return ()=>clearInterval(t); }, []);
  return (
    <div style={{ display:"flex", alignItems:"center", gap:12, padding:"1.5rem 0", color:"var(--color-text-secondary)", fontFamily:"var(--font-sans)", fontSize:14 }}>
      <div style={{ display:"flex", gap:5 }}>
        {[0,1,2].map(i=>(
          <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:"var(--color-text-tertiary)", transform:dots===i?"translateY(-4px)":"translateY(0)", transition:"transform 0.25s ease" }}/>
        ))}
      </div>
      <span>{text}{".".repeat(dots)}</span>
    </div>
  );
}

function Btn({ onClick, disabled, loading, children, variant="primary", size="md" }) {
  const [pressed, setPressed] = useState(false);
  const [hov, setHov] = useState(false);
  const base = {
    display:"inline-flex", alignItems:"center", justifyContent:"center", gap:8,
    border:"none", cursor: disabled ? "not-allowed" : "pointer",
    fontFamily:"var(--font-sans)", fontWeight:500, letterSpacing:"0.01em",
    transition:"all 0.18s cubic-bezier(0.34,1.56,0.64,1)",
    outline:"none", userSelect:"none",
    borderRadius: size==="sm" ? 8 : 10,
    padding: size==="sm" ? "5px 12px" : size==="xs" ? "3px 9px" : "10px 22px",
    fontSize: size==="sm" ? 13 : size==="xs" ? 11 : 14,
  };
  const s = variant==="primary" ? {
    ...base,
    background: disabled ? "var(--color-background-secondary)" : hov ? "#222" : "#111",
    color: disabled ? "var(--color-text-tertiary)" : "#fff",
    transform: pressed ? "scale(0.96) translateY(1px)" : hov&&!disabled ? "scale(1.02) translateY(-1px)" : "scale(1)",
    boxShadow: pressed||disabled ? "none" : hov ? "0 6px 20px rgba(0,0,0,0.25)" : "0 2px 8px rgba(0,0,0,0.12)",
  } : variant==="ghost" ? {
    ...base,
    background: hov ? "var(--color-background-secondary)" : "transparent",
    color: "var(--color-text-secondary)",
    border: "0.5px solid var(--color-border-tertiary)",
    transform: pressed ? "scale(0.96)" : "scale(1)",
  } : variant==="danger-ghost" ? {
    ...base,
    background: hov ? "#fcebeb" : "transparent",
    color: hov ? "#a32d2d" : "var(--color-text-tertiary)",
    border: "0.5px solid var(--color-border-tertiary)",
    transform: pressed ? "scale(0.96)" : "scale(1)",
  } : variant==="region-active" ? {
    ...base, padding:"7px 14px", fontSize:13,
    background:"var(--color-text-primary)", color:"var(--color-background-primary)",
    transform: pressed ? "scale(0.96)" : "scale(1)",
  } : {
    ...base, padding:"7px 14px", fontSize:13,
    background: hov ? "var(--color-background-secondary)" : "transparent",
    color:"var(--color-text-secondary)",
    border:"0.5px solid var(--color-border-tertiary)",
    transform: pressed ? "scale(0.96)" : hov ? "scale(1.01)" : "scale(1)",
  };
  return (
    <button onClick={disabled?undefined:onClick}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>{setHov(false);setPressed(false);}}
      onMouseDown={()=>setPressed(true)} onMouseUp={()=>setPressed(false)} style={s}>
      {loading && <div style={{ width:13, height:13, border:"2px solid rgba(255,255,255,0.3)", borderTopColor:"#fff", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>}
      {children}
    </button>
  );
}

function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  const [hov, setHov] = useState(false);
  return (
    <button onClick={()=>{navigator.clipboard.writeText(text);setDone(true);setTimeout(()=>setDone(false),2200);}}
      onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ display:"inline-flex", alignItems:"center", gap:5, background: done?"#0F6E56": hov?"var(--color-background-secondary)":"transparent",
        color: done?"#fff":"var(--color-text-secondary)", border: done?"0.5px solid #0F6E56":"0.5px solid var(--color-border-tertiary)",
        borderRadius:7, padding:"4px 11px", cursor:"pointer", fontSize:12, fontFamily:"var(--font-sans)", fontWeight:500,
        transition:"all 0.2s ease", transform: done?"scale(1.04)":"scale(1)" }}>
      {done ? <><svg width={11} height={11} viewBox="0 0 14 14" fill="none"><polyline points="2,7 5.5,10.5 12,3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Copied</> : "Copy"}
    </button>
  );
}

function EmailCard({ email }) {
  const [open, setOpen] = useState(true);
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)} style={{
      background:"var(--color-background-primary)",
      border:`0.5px solid ${hov?"var(--color-border-secondary)":"var(--color-border-tertiary)"}`,
      borderRadius:12, overflow:"hidden",
      transition:"border-color 0.2s ease, box-shadow 0.2s ease",
      boxShadow: hov?"0 2px 16px rgba(0,0,0,0.06)":"none",
    }}>
      <div onClick={()=>setOpen(o=>!o)} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", cursor:"pointer" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:11, background:"var(--color-background-secondary)", color:"var(--color-text-secondary)", padding:"2px 10px", borderRadius:20, fontFamily:"var(--font-sans)", fontWeight:500 }}>{email.label}</span>
          {!open && <span style={{ fontSize:13, color:"var(--color-text-secondary)", fontFamily:"var(--font-sans)" }}>{email.subject}</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <CopyBtn text={`Subject: ${email.subject}\n\n${email.body}`}/>
          <div style={{ width:20, height:20, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--color-text-tertiary)", transition:"transform 0.2s ease", transform: open?"rotate(180deg)":"rotate(0deg)" }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><polyline points="2,4 6,8 10,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
        </div>
      </div>
      {open && <div style={{ padding:"0 16px 14px", borderTop:"0.5px solid var(--color-border-tertiary)" }}>
        <p style={{ fontSize:11, color:"var(--color-text-tertiary)", fontFamily:"var(--font-sans)", margin:"12px 0 4px" }}>Subject</p>
        <p style={{ fontSize:14, color:"var(--color-text-primary)", fontFamily:"var(--font-sans)", fontWeight:500, margin:"0 0 12px" }}>{email.subject}</p>
        <p style={{ fontSize:14, color:"var(--color-text-primary)", lineHeight:1.75, margin:0, whiteSpace:"pre-wrap" }}>{email.body}</p>
      </div>}
    </div>
  );
}

function ResearchCard({ research }) {
  const rows = [
    ["Company overview", research.company_overview],
    ["Exhibition activity", research.exhibition_activity],
    ["Recent news", research.recent_news],
    ["Lead insight", research.key_insight],
    ["Pain points", research.pain_points],
    ["Recommended approach", research.recommended_approach],
  ].filter(([,v])=>v);
  return (
    <div style={{ background:"var(--color-background-secondary)", borderRadius:12, border:"0.5px solid var(--color-border-tertiary)", marginBottom:"1.25rem", overflow:"hidden" }}>
      <div style={{ padding:"12px 16px", borderBottom:"0.5px solid var(--color-border-tertiary)", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ width:6, height:6, borderRadius:"50%", background:"#1D9E75" }}/>
        <p style={{ fontSize:11, color:"var(--color-text-tertiary)", fontFamily:"var(--font-sans)", textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>Research Analysis</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr" }}>
        {rows.map(([title,val],i)=>(
          <div key={title} style={{ padding:"12px 16px", borderRight: i%2===0?"0.5px solid var(--color-border-tertiary)":"none", borderBottom: i<rows.length-2?"0.5px solid var(--color-border-tertiary)":"none" }}>
            <p style={{ fontSize:10, color:"var(--color-text-tertiary)", fontFamily:"var(--font-sans)", textTransform:"uppercase", letterSpacing:"0.07em", margin:"0 0 5px" }}>{title}</p>
            <p style={{ fontSize:13, color:"var(--color-text-primary)", fontFamily:"var(--font-sans)", lineHeight:1.6, margin:0 }}>{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MODAL ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = e => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:"1rem" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"var(--color-background-primary)", borderRadius:16, width:"100%", maxWidth:480, border:"0.5px solid var(--color-border-tertiary)", overflow:"hidden", animation:"modalIn 0.2s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
          <p style={{ fontSize:15, fontWeight:500, margin:0, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)" }}>{title}</p>
          <button onClick={onClose} style={{ width:28, height:28, borderRadius:7, border:"0.5px solid var(--color-border-tertiary)", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--color-text-tertiary)", fontSize:16, lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"20px", background:"var(--color-background-secondary)" }}>{children}</div>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, placeholder, required, type="text" }) {
  return (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6, fontFamily:"var(--font-sans)" }}>
        {label}{required && <span style={{ color:"#D85A30", marginLeft:3 }}>*</span>}
      </label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        style={{ width:"100%", boxSizing:"border-box", background:"var(--color-background-primary)", border:"1.5px solid var(--color-border-secondary)", borderRadius:8, padding:"9px 12px", fontSize:14, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)", outline:"none", transition:"border-color 0.15s ease, box-shadow 0.15s ease" }}
        onFocus={e=>e.target.style.borderColor="var(--color-border-primary)"}
        onBlur={e=>e.target.style.borderColor="var(--color-border-secondary)"}
      />
    </div>
  );
}

// ─── CLIENT CRUD ──────────────────────────────────────────────────────────────

function ClientModal({ client, onSave, onClose }) {
  const isEdit = !!client;
  const [form, setForm] = useState(client ? { ...client } : { company:"", contact:"", role:"", email:"", phone:"" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.company.trim() && form.contact.trim();
  function save() {
    if (!valid) return;
    onSave({ ...form, id: client?.id || uid() });
    onClose();
  }
  return (
    <Modal title={isEdit ? "Edit client" : "Add client"} onClose={onClose}>
      <FormField label="Company" value={form.company} onChange={set("company")} placeholder="e.g. Shell, Siemens..." required />
      <FormField label="Contact name" value={form.contact} onChange={set("contact")} placeholder="Full name" required />
      <FormField label="Role / Title" value={form.role} onChange={set("role")} placeholder="e.g. Marketing Director" />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <FormField label="Email" value={form.email} onChange={set("email")} placeholder="name@company.com" type="email" />
        <FormField label="Phone" value={form.phone} onChange={set("phone")} placeholder="+65 xxxx xxxx" />
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:6 }}>
        <Btn variant="ghost" onClick={onClose} size="sm">Cancel</Btn>
        <Btn onClick={save} disabled={!valid} size="sm">{isEdit ? "Save changes" : "Add client"}</Btn>
      </div>
    </Modal>
  );
}

// ─── EVENT CRUD ───────────────────────────────────────────────────────────────

const ALL_SECTORS = ["Agriculture","Aviation","Automotive","Beauty","Construction","Defence","Energy","Finance","Food & Beverage","Healthcare","Jewellery","Logistics","Manufacturing","Maritime","Media","Real Estate","Retail","Technology","Transport"];

function EventModal({ event, region, onSave, onClose }) {
  const isEdit = !!event;
  const [form, setForm] = useState(event ? { ...event } : { name:"", dates:"", venue:"", sector:"Technology", region: region || "singapore" });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));
  const valid = form.name.trim() && form.dates.trim() && form.venue.trim();
  function save() {
    if (!valid) return;
    onSave({ ...form, id: event?.id || uid() });
    onClose();
  }
  return (
    <Modal title={isEdit ? "Edit event" : "Add event"} onClose={onClose}>
      <FormField label="Exhibition name" value={form.name} onChange={set("name")} placeholder="e.g. OSEA 2026 – Offshore Energy Week" required />
      <FormField label="Dates" value={form.dates} onChange={set("dates")} placeholder="e.g. Nov 24–26, 2026" required />
      <FormField label="Venue" value={form.venue} onChange={set("venue")} placeholder="e.g. Marina Bay Sands, Singapore" required />
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6, fontFamily:"var(--font-sans)" }}>Sector</label>
          <select value={form.sector} onChange={set("sector")} style={{ width:"100%", background:"var(--color-background-primary)", border:"1.5px solid var(--color-border-secondary)", borderRadius:8, padding:"9px 12px", fontSize:14, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)", outline:"none" }}>
            {ALL_SECTORS.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6, fontFamily:"var(--font-sans)" }}>Region</label>
          <select value={form.region} onChange={set("region")} style={{ width:"100%", background:"var(--color-background-primary)", border:"1.5px solid var(--color-border-secondary)", borderRadius:8, padding:"9px 12px", fontSize:14, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)", outline:"none" }}>
            <option value="singapore">🇸🇬 Singapore</option>
            <option value="malaysia">🇲🇾 Malaysia</option>
            <option value="japan">🇯🇵 Japan</option>
          </select>
        </div>
      </div>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, marginTop:6 }}>
        <Btn variant="ghost" onClick={onClose} size="sm">Cancel</Btn>
        <Btn onClick={save} disabled={!valid} size="sm">{isEdit ? "Save changes" : "Add event"}</Btn>
      </div>
    </Modal>
  );
}

// ─── DELETE CONFIRM ───────────────────────────────────────────────────────────

function DeleteModal({ label, onConfirm, onClose }) {
  return (
    <Modal title="Confirm delete" onClose={onClose}>
      <p style={{ fontSize:14, color:"var(--color-text-primary)", fontFamily:"var(--font-sans)", lineHeight:1.6, margin:"0 0 20px" }}>
        Delete <strong>{label}</strong>? This cannot be undone.
      </p>
      <div style={{ display:"flex", justifyContent:"flex-end", gap:10, paddingTop:4 }}>
        <Btn variant="ghost" onClick={onClose} size="sm">Cancel</Btn>
        <button onClick={()=>{onConfirm();onClose();}} style={{ padding:"6px 16px", borderRadius:8, background:"#a32d2d", color:"#fff", border:"none", fontSize:13, fontFamily:"var(--font-sans)", fontWeight:500, cursor:"pointer" }}>Delete</button>
      </div>
    </Modal>
  );
}

// ─── CLIENT CARD ─────────────────────────────────────────────────────────────

function ClientCard({ client, colorIdx, selected, onSelect, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const [actHov, setActHov] = useState(null);
  const accent = CLIENT_ACCENT_COLORS[colorIdx % CLIENT_ACCENT_COLORS.length];
  const initials = getInitials(client.contact);

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ padding:"10px 12px", borderRadius:10, cursor:"pointer",
        background: selected ? accent+"0d" : hov ? "var(--color-background-secondary)" : "var(--color-background-primary)",
        border: selected ? `0.5px solid ${accent}50` : "0.5px solid var(--color-border-tertiary)",
        borderLeft: selected ? `3px solid ${accent}` : "0.5px solid var(--color-border-tertiary)",
        transition:"background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
        boxShadow: selected ? `0 2px 12px ${accent}20` : hov ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
      }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }} onClick={onSelect}>
        <div style={{ width:34, height:34, borderRadius:"50%", background:accent+"22", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:600, fontFamily:"var(--font-sans)", color:accent, flexShrink:0 }}>{initials}</div>
        <div style={{ minWidth:0, flex:1 }}>
          <p style={{ fontSize:13, fontWeight:500, margin:0, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{client.company}</p>
          <p style={{ fontSize:11, color:"var(--color-text-tertiary)", margin:0, fontFamily:"var(--font-sans)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{client.contact}</p>
        </div>
        <div style={{ display:"flex", gap:4, flexShrink:0, opacity: hov ? 1 : 0, transition:"opacity 0.15s ease", pointerEvents: hov ? "auto" : "none" }} onClick={e=>e.stopPropagation()}>
          <button onMouseEnter={()=>setActHov("edit")} onMouseLeave={()=>setActHov(null)} onClick={onEdit}
            style={{ width:26, height:26, borderRadius:6, border:"0.5px solid var(--color-border-tertiary)", background: actHov==="edit"?"var(--color-background-secondary)":"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--color-text-secondary)", transition:"all 0.15s ease" }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button onMouseEnter={()=>setActHov("del")} onMouseLeave={()=>setActHov(null)} onClick={onDelete}
            style={{ width:26, height:26, borderRadius:6, border:"0.5px solid var(--color-border-tertiary)", background: actHov==="del"?"#fcebeb":"transparent", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", color: actHov==="del"?"#a32d2d":"var(--color-text-tertiary)", transition:"all 0.15s ease" }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none"><polyline points="2,4 12,4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M5.5 4V3h3v1M4 4l.8 8h4.4l.8-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EVENT CARD ───────────────────────────────────────────────────────────────

function EventCard({ event, selected, onSelect, onEdit, onDelete }) {
  const [hov, setHov] = useState(false);
  const [actHov, setActHov] = useState(null);
  const color = SECTOR_COLORS[event.sector] || "#888";

  return (
    <div onMouseEnter={()=>setHov(true)} onMouseLeave={()=>setHov(false)}
      style={{ padding:"10px 12px", borderRadius:10, cursor:"pointer",
        background: selected ? color+"0d" : hov ? "var(--color-background-secondary)" : "var(--color-background-primary)",
        border: selected ? `0.5px solid ${color}50` : "0.5px solid var(--color-border-tertiary)",
        borderLeft: selected ? `3px solid ${color}` : "0.5px solid var(--color-border-tertiary)",
        transition:"background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
        boxShadow: selected ? `0 2px 12px ${color}18` : hov ? "0 2px 8px rgba(0,0,0,0.06)" : "none",
      }}>
      <div onClick={onSelect}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8, marginBottom:6 }}>
          <div style={{ minWidth:0 }}>
            <p style={{ fontSize:13, fontWeight:500, margin:"0 0 3px", fontFamily:"var(--font-sans)", color:"var(--color-text-primary)", lineHeight:1.35 }}>{event.name}</p>
            <p style={{ fontSize:11, color:"var(--color-text-tertiary)", margin:0, fontFamily:"var(--font-sans)" }}>{event.dates} · {event.venue}</p>
          </div>
          <span style={{ fontSize:10, padding:"2px 7px", borderRadius:20, flexShrink:0, marginTop:1, background:color+"18", color, fontFamily:"var(--font-sans)", fontWeight:500 }}>{event.sector}</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:6, opacity: hov ? 1 : 0, transition:"opacity 0.15s ease", pointerEvents: hov ? "auto" : "none" }} onClick={e=>e.stopPropagation()}>
        <button onMouseEnter={()=>setActHov("edit")} onMouseLeave={()=>setActHov(null)} onClick={onEdit}
          style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:6, border:"0.5px solid var(--color-border-tertiary)", background: actHov==="edit"?"var(--color-background-secondary)":"transparent", cursor:"pointer", fontSize:11, fontFamily:"var(--font-sans)", color:"var(--color-text-secondary)", transition:"all 0.15s ease" }}>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2-7 7H2.5v-2l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Edit
        </button>
        <button onMouseEnter={()=>setActHov("del")} onMouseLeave={()=>setActHov(null)} onClick={onDelete}
          style={{ display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:6, border:"0.5px solid var(--color-border-tertiary)", background: actHov==="del"?"#fcebeb":"transparent", cursor:"pointer", fontSize:11, fontFamily:"var(--font-sans)", color: actHov==="del"?"#a32d2d":"var(--color-text-tertiary)", transition:"all 0.15s ease" }}>
          <svg width="10" height="10" viewBox="0 0 14 14" fill="none"><polyline points="2,4 12,4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M5.5 4V3h3v1M4 4l.8 8h4.4l.8-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState("cold");

  // Database state
  const [clients, setClients] = useState([]);
  const [events,  setEvents]  = useState([]);

  useEffect(() => {
    async function loadData() {
      const [{ data: c }, { data: e }] = await Promise.all([
        supabase.from("clients").select("*").order("created_at"),
        supabase.from("events").select("*").order("created_at"),
      ]);
      setClients(c || []);
      setEvents(e || []);
    }
    loadData();
  }, []);

  // Cold state
  const [coldProspect, setColdProspect] = useState("");
  const [coldRole,     setColdRole]     = useState("");
  const [coldContext,  setColdContext]  = useState("");
  const [coldLoading,  setColdLoading]  = useState(false);
  const [coldResult,   setColdResult]   = useState(null);
  const [coldError,    setColdError]    = useState("");

  // Warm state
  const [selectedClientId,  setSelectedClientId]  = useState(null);
  const [selectedEventId,   setSelectedEventId]   = useState(null);
  const [eventRegion,       setEventRegion]        = useState("singapore");
  const [warmContext,       setWarmContext]        = useState("");
  const [warmExampleEmail,  setWarmExampleEmail]  = useState("");
  const [warmLoading,       setWarmLoading]        = useState(false);
  const [warmResult,        setWarmResult]         = useState(null);
  const [warmError,         setWarmError]          = useState("");

  // CRUD modal state
  const [modal, setModal] = useState(null);
  // modal = { type: "addClient"|"editClient"|"deleteClient"|"addEvent"|"editEvent"|"deleteEvent", payload }

  const currentEvents = events.filter(e => e.region === eventRegion);
  const selectedClient = clients.find(c => c.id === selectedClientId);
  const selectedEvent  = events.find(e => e.id === selectedEventId);

  // ── Client CRUD handlers ──
  function saveClient(c) {
    setClients(prev => prev.find(x=>x.id===c.id) ? prev.map(x=>x.id===c.id?c:x) : [...prev, c]);
    supabase.from("clients").upsert(c);
  }
  function deleteClient(id) {
    setClients(prev => prev.filter(c=>c.id!==id));
    if (selectedClientId === id) setSelectedClientId(null);
    supabase.from("clients").delete().eq("id", id);
  }

  // ── Event CRUD handlers ──
  function saveEvent(ev) {
    setEvents(prev => prev.find(x=>x.id===ev.id) ? prev.map(x=>x.id===ev.id?ev:x) : [...prev, ev]);
    if (ev.region !== eventRegion) setEventRegion(ev.region);
    supabase.from("events").upsert(ev);
  }
  function deleteEvent(id) {
    setEvents(prev => prev.filter(e=>e.id!==id));
    if (selectedEventId === id) setSelectedEventId(null);
    supabase.from("events").delete().eq("id", id);
  }

  // ── Selection toggles ──
  function toggleClient(id) {
    setSelectedClientId(prev => prev===id ? null : id);
    setWarmResult(null);
  }
  function toggleEvent(id) {
    setSelectedEventId(prev => prev===id ? null : id);
    setWarmResult(null);
  }

  async function runColdAgent() {
    if (!coldProspect.trim() || coldLoading) return;
    setColdLoading(true); setColdResult(null); setColdError("");
    try {
      const raw = await callAgent(COLD_AGENT_ID, `Research this prospect and write cold emails for Procyon Creations:\n\nCompany: ${coldProspect}${coldRole?`\nContact role: ${coldRole}`:""}${coldContext?`\n\nAdditional context: ${coldContext}`:""}\n\nSearch for recent news, exhibition activity, and brand positioning. Produce a thorough research analysis then craft three precisely targeted cold emails.`);
      const clean = raw.replace(/```json|```/g,"").trim();
      const s=clean.indexOf("{"), e=clean.lastIndexOf("}");
      setColdResult(JSON.parse(clean.slice(s,e+1)));
    } catch { setColdError("Something went wrong — please try again."); }
    setColdLoading(false);
  }

  async function runWarmAgent() {
    if (!selectedClient || !selectedEvent || warmLoading) return;
    setWarmLoading(true); setWarmResult(null); setWarmError("");
    try {
      const raw = await callAgent(WARM_AGENT_ID, `Write warm outreach emails for this existing Procyon Creations client:\n\nCLIENT: ${selectedClient.company} — ${selectedClient.contact} (${selectedClient.role})\n\nEVENT: ${selectedEvent.name}\nDates: ${selectedEvent.dates}\nVenue: ${selectedEvent.venue}\nSector: ${selectedEvent.sector}\nRegion: ${REGION_CONFIG[selectedEvent.region]?.label||selectedEvent.region}${warmContext?`\n\nAdditional context: ${warmContext}`:""}${warmExampleEmail?`\n\nExample email to match in tone and style — use this as a stylistic reference, not a template to copy:\n\n${warmExampleEmail}`:""}\n\nExisting relationship. Write three warm email variants.`);
      const clean = raw.replace(/```json|```/g,"").trim();
      const s=clean.indexOf("{"), e=clean.lastIndexOf("}");
      setWarmResult(JSON.parse(clean.slice(s,e+1)));
    } catch { setWarmError("Something went wrong — please try again."); }
    setWarmLoading(false);
  }

  // ── Context textarea style ──
  const ctxStyle = { resize:"vertical", lineHeight:1.6, background:"var(--color-background-primary)", border:"1.5px solid var(--color-border-secondary)", borderRadius:8, padding:"9px 12px", fontSize:14, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)", outline:"none", width:"100%", boxSizing:"border-box", transition:"border-color 0.15s ease, box-shadow 0.15s ease" };

  return (
    <div style={{ fontFamily:"var(--font-sans)", maxWidth:940, margin:"0 auto", padding:"1.5rem 1rem" }}>
      <style>{`
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes modalIn { from { opacity:0; transform:scale(0.96) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .result-enter { animation: fadeSlideIn 0.3s ease forwards; }
        input::placeholder, textarea::placeholder { color: #a0a0a0; }
        input:focus, select:focus, textarea:focus { border-color: var(--color-border-primary) !important; box-shadow: 0 0 0 3px rgba(0,0,0,0.06); }
        ::-webkit-scrollbar { width:4px; } ::-webkit-scrollbar-track { background:transparent; } ::-webkit-scrollbar-thumb { background:var(--color-border-secondary); border-radius:4px; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom:"1.75rem", paddingBottom:"1.25rem", borderBottom:"0.5px solid var(--color-border-tertiary)" }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#111" }}/>
              <span style={{ fontSize:11, color:"var(--color-text-tertiary)", letterSpacing:"0.1em", textTransform:"uppercase" }}>Procyon Creations</span>
            </div>
            <h1 style={{ fontSize:24, fontWeight:500, margin:0, letterSpacing:"-0.025em", color:"var(--color-text-primary)" }}>Outreach Intelligence</h1>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            {["SG","MY","JP"].map(tag=>(
              <div key={tag} style={{ width:32, height:32, borderRadius:8, background:"var(--color-background-secondary)", border:"0.5px solid var(--color-border-tertiary)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:600, color:"var(--color-text-secondary)", letterSpacing:"0.05em" }}>{tag}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ display:"flex", gap:4, marginBottom:"1.5rem", background:"var(--color-background-secondary)", padding:4, borderRadius:10, border:"0.5px solid var(--color-border-tertiary)", width:"fit-content" }}>
        {[["cold","Cold Outreach","New prospects"],["warm","Warm Outreach","Existing clients"]].map(([id,label,sub])=>(
          <button key={id} onClick={()=>setActiveTab(id)} style={{ display:"flex", flexDirection:"column", alignItems:"flex-start", padding:"8px 16px", borderRadius:7, border:"none", cursor:"pointer", background: activeTab===id?"var(--color-background-primary)":"transparent", boxShadow: activeTab===id?"0 1px 4px rgba(0,0,0,0.08)":"none", transition:"all 0.18s ease" }}>
            <span style={{ fontSize:14, fontWeight:500, color: activeTab===id?"var(--color-text-primary)":"var(--color-text-secondary)", fontFamily:"var(--font-sans)", lineHeight:1.2 }}>{label}</span>
            <span style={{ fontSize:11, color:"var(--color-text-tertiary)", fontFamily:"var(--font-sans)", marginTop:1 }}>{sub}</span>
          </button>
        ))}
      </div>

      {/* ══════════ COLD TAB ══════════ */}
      {activeTab === "cold" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div>
              <label style={{ display:"block", fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Prospect company *</label>
              <input value={coldProspect} onChange={e=>setColdProspect(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runColdAgent()} placeholder="e.g. Shell, Siemens, ExxonMobil..."
                style={{ width:"100%", boxSizing:"border-box", background:"var(--color-background-primary)", border:"1.5px solid var(--color-border-secondary)", borderRadius:8, padding:"9px 12px", fontSize:14, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)", outline:"none" }}/>
            </div>
            <div>
              <label style={{ display:"block", fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Contact role (optional)</label>
              <input value={coldRole} onChange={e=>setColdRole(e.target.value)} placeholder="e.g. Marketing Director, Brand Manager..."
                style={{ width:"100%", boxSizing:"border-box", background:"var(--color-background-primary)", border:"1.5px solid var(--color-border-secondary)", borderRadius:8, padding:"9px 12px", fontSize:14, fontFamily:"var(--font-sans)", color:"var(--color-text-primary)", outline:"none" }}/>
            </div>
          </div>

          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Additional context (optional)</label>
            <textarea value={coldContext} onChange={e=>setColdContext(e.target.value)} rows={5}
              placeholder="Additional context on anything — prior interactions, specific events they attended, products launching, pain points you've heard...&#10;&#10;What are you looking for? e.g. a reply, a meeting, an intro, a demo&#10;Any research signals? e.g. recent funding, hiring surge, LinkedIn posts, company news, tech stack changes"
              style={{ ...ctxStyle, minHeight: 110 }}
              onFocus={e=>e.target.style.borderColor="var(--color-border-primary)"}
              onBlur={e=>e.target.style.borderColor="var(--color-border-secondary)"}
            />
          </div>

          <div style={{ marginBottom:"1.5rem" }}>
            <Btn onClick={runColdAgent} disabled={!coldProspect.trim()||coldLoading} loading={coldLoading}>
              {coldLoading ? "Researching & drafting" : "Generate cold emails →"}
            </Btn>
          </div>

          {coldLoading && <PulseLoader text={`Searching for ${coldProspect}`}/>}
          {coldError && <p style={{ color:"var(--color-text-danger)", fontSize:14 }}>{coldError}</p>}

          {coldResult && (
            <div className="result-enter">
              <ResearchCard research={coldResult.research}/>
              <div style={{ display:"flex", alignItems:"center", gap:8, margin:"1.25rem 0 10px" }}>
                <div style={{ width:6, height:6, borderRadius:"50%", background:"#378ADD" }}/>
                <p style={{ fontSize:11, color:"var(--color-text-tertiary)", fontFamily:"var(--font-sans)", textTransform:"uppercase", letterSpacing:"0.08em", margin:0 }}>Draft emails</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {coldResult.emails.map((email,i)=><EmailCard key={i} email={email}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ WARM TAB ══════════ */}
      {activeTab === "warm" && (
        <div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>

            {/* ── Left: Clients ── */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <p style={{ fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.07em", margin:0 }}>
                  Clients <span style={{ opacity:0.6 }}>({clients.length})</span>
                </p>
                <Btn variant="ghost" size="xs" onClick={()=>setModal({type:"addClient"})}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Add client
                </Btn>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:7, maxHeight:460, overflowY:"auto", paddingRight:2 }}>
                {clients.map((c,i)=>(
                  <ClientCard key={c.id} client={c} colorIdx={i} selected={selectedClientId===c.id}
                    onSelect={()=>toggleClient(c.id)}
                    onEdit={()=>setModal({type:"editClient", payload:c})}
                    onDelete={()=>setModal({type:"deleteClient", payload:c})}
                  />
                ))}
                {clients.length===0 && <p style={{ fontSize:13, color:"var(--color-text-tertiary)", fontFamily:"var(--font-sans)", textAlign:"center", padding:"2rem 0" }}>No clients yet. Add one above.</p>}
              </div>
            </div>

            {/* ── Right: Events ── */}
            <div>
              <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                <div style={{ display:"flex", gap:5 }}>
                  {Object.entries(REGION_CONFIG).map(([key,cfg])=>(
                    <Btn key={key} variant={eventRegion===key?"region-active":"region"} size="sm"
                      onClick={()=>{setEventRegion(key); setSelectedEventId(null); setWarmResult(null);}}>
                      <span style={{ fontSize:13 }}>{cfg.flag}</span>{cfg.label}
                    </Btn>
                  ))}
                </div>
                <Btn variant="ghost" size="xs" onClick={()=>setModal({type:"addEvent", payload:{region:eventRegion}})}>
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><line x1="6" y1="1" x2="6" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                  Add event
                </Btn>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:7, maxHeight:460, overflowY:"auto", paddingRight:2 }}>
                {currentEvents.map(ev=>(
                  <EventCard key={ev.id} event={ev} selected={selectedEventId===ev.id}
                    onSelect={()=>toggleEvent(ev.id)}
                    onEdit={()=>setModal({type:"editEvent", payload:ev})}
                    onDelete={()=>setModal({type:"deleteEvent", payload:ev})}
                  />
                ))}
                {currentEvents.length===0 && <p style={{ fontSize:13, color:"var(--color-text-tertiary)", fontFamily:"var(--font-sans)", textAlign:"center", padding:"2rem 0" }}>No events for this region. Add one above.</p>}
              </div>
            </div>
          </div>

          {/* ── Context + Generate ── */}
          <div style={{ marginTop:"1.25rem", paddingTop:"1.25rem", borderTop:"0.5px solid var(--color-border-tertiary)" }}>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Additional context (optional)</label>
              <textarea value={warmContext} onChange={e=>setWarmContext(e.target.value)} rows={3}
                placeholder="Additional context on anything — last conversation, stand budget, upcoming launches, relationship notes..."
                style={{ ...ctxStyle, minHeight: 80 }}
                onFocus={e=>e.target.style.borderColor="var(--color-border-primary)"}
                onBlur={e=>e.target.style.borderColor="var(--color-border-secondary)"}
              />
            </div>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>Example email (optional)</label>
              <textarea value={warmExampleEmail} onChange={e=>setWarmExampleEmail(e.target.value)} rows={5}
                placeholder="Paste an example email you like — the agent will match its tone, voice, and structure when drafting the three variants..."
                style={{ ...ctxStyle, minHeight: 110 }}
                onFocus={e=>e.target.style.borderColor="var(--color-border-primary)"}
                onBlur={e=>e.target.style.borderColor="var(--color-border-secondary)"}
              />
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:16 }}>
              <Btn onClick={runWarmAgent} disabled={!selectedClient||!selectedEvent||warmLoading} loading={warmLoading}>
                {warmLoading ? "Drafting emails" : selectedClient&&selectedEvent ? `Draft for ${selectedClient.contact} × ${selectedEvent.name.split("–")[0].trim()} →` : "Select a client and event →"}
              </Btn>
              {selectedClient && selectedEvent && (
                <span style={{ fontSize:12, color:"var(--color-text-tertiary)", fontFamily:"var(--font-sans)" }}>
                  {selectedClient.company} · {selectedEvent.dates}
                </span>
              )}
            </div>
          </div>

          {warmLoading && <PulseLoader text={`Tailoring emails for ${selectedClient?.contact}`}/>}
          {warmError && <p style={{ color:"var(--color-text-danger)", fontSize:14 }}>{warmError}</p>}

          {warmResult && (
            <div className="result-enter" style={{ marginTop:"1.25rem" }}>
              <div style={{ background:"var(--color-background-secondary)", borderRadius:10, padding:"10px 14px", marginBottom:"1.25rem", border:"0.5px solid var(--color-border-tertiary)" }}>
                <p style={{ fontSize:11, color:"var(--color-text-tertiary)", textTransform:"uppercase", letterSpacing:"0.06em", margin:"0 0 5px" }}>Match rationale</p>
                <p style={{ fontSize:13, color:"var(--color-text-primary)", lineHeight:1.6, margin:0 }}>{warmResult.match_rationale}</p>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {warmResult.emails.map((email,i)=><EmailCard key={i} email={email}/>)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ MODALS ══════════ */}
      {modal?.type === "addClient"    && <ClientModal onSave={saveClient} onClose={()=>setModal(null)}/>}
      {modal?.type === "editClient"   && <ClientModal client={modal.payload} onSave={saveClient} onClose={()=>setModal(null)}/>}
      {modal?.type === "deleteClient" && <DeleteModal label={`${modal.payload.contact} (${modal.payload.company})`} onConfirm={()=>deleteClient(modal.payload.id)} onClose={()=>setModal(null)}/>}
      {modal?.type === "addEvent"     && <EventModal region={modal.payload?.region} onSave={saveEvent} onClose={()=>setModal(null)}/>}
      {modal?.type === "editEvent"    && <EventModal event={modal.payload} onSave={saveEvent} onClose={()=>setModal(null)}/>}
      {modal?.type === "deleteEvent"  && <DeleteModal label={modal.payload.name} onConfirm={()=>deleteEvent(modal.payload.id)} onClose={()=>setModal(null)}/>}
    </div>
  );
}