import { useState, useEffect, useCallback, useRef } from "react";

/* ═══════════════════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════════════════ */
const genId   = () => Math.random().toString(36).slice(2, 9);
const genCode = () => { const c = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; return "CMD-" + Array.from({ length: 6 }, () => c[Math.floor(Math.random() * c.length)]).join(""); };
const genOTP  = () => String(Math.floor(100000 + Math.random() * 900000));
const fmtPhone = (p) => p.replace(/\D/g, "").slice(0, 10);
const dispPhone = (p) => { const n = fmtPhone(p); return n.replace(/(\d{2})(?=\d)/g, "$1 ").trim(); };

/* ── Persistent storage ───────────────────────────────────── */
const db = {
  async get(k) {
    try { const r = await window.storage.get(k); return r ? JSON.parse(r.value) : null; } catch { return null; }
  },
  async set(k, v) {
    try { await window.storage.set(k, JSON.stringify(v)); } catch (e) { console.warn("storage.set failed", k, e); }
  },
};

/* ═══════════════════════════════════════════════════════════
   DEFAULTS / CONSTANTS
═══════════════════════════════════════════════════════════ */
const SUPER_ADMIN = { id: "sa1", phone: "0652317761", password: "HighlandCow", name: "Alair Admin", isSuperAdmin: true };
const TEAL = "#91E3D4";
const TEAL_DIM = "rgba(145,227,212,0.12)";
const TEAL_BORDER = "rgba(145,227,212,0.3)";

const DEF_CATS  = ["Nouveautés", "Vêtements", "Chaussures", "Accessoires", "Soldes"];
const DEF_PRODS = [
  { id:"p1", name:"Altitude Runner",     price:179, category:"Chaussures",  brand:"ALAIR",    condition:"Neuf",        description:"Silhouette épurée pour une foulée parfaite. Semelle ultra-légère, amorti réactif.",              emoji:"👟", published:true },
  { id:"p2", name:"Veste Tactique XR",   price:229, category:"Vêtements",   brand:"ALAIR",    condition:"Neuf",        description:"Protection maximale, allure minimaliste. Coupe ajustée, matière technique imperméable.",          emoji:"🧥", published:true },
  { id:"p3", name:"Casquette Signature", price:55,  category:"Accessoires", brand:"ALAIR",    condition:"Neuf",        description:"Le détail qui fait toute la différence. Logo brodé, visière structurée.",                       emoji:"🧢", published:true },
  { id:"p4", name:"Trail Elite S2",      price:199, category:"Chaussures",  brand:"ALAIR",    condition:"Neuf",        description:"Adhérence totale sur chaque terrain. Semelle Vibram, drop faible, légèreté extrême.",            emoji:"👟", published:true },
  { id:"p5", name:"Hoodie Obsidian",     price:139, category:"Vêtements",   brand:"ALAIR",    condition:"Neuf",        description:"Confort absolu, coupe intemporelle. Coton lourd 400gsm, poche kangourou, capuche doublée.",       emoji:"👕", published:true },
  { id:"p6", name:"Sac Urban Pro",       price:95,  category:"Accessoires", brand:"ALAIR",    condition:"Neuf",        description:"Votre compagnon du quotidien. 20L, compartiment laptop 15\", bretelles rembourrées.",           emoji:"👜", published:true },
  { id:"p7", name:"Pack Essentiels x3",  price:29,  category:"Soldes",      brand:"ALAIR",    condition:"Neuf",        description:"3 paires de chaussettes techniques. Coton égyptien, couture plate, renfort talon.",               emoji:"🧦", published:true },
  { id:"p8", name:"Tee Graphique Ltd.",  price:49,  category:"Nouveautés",  brand:"ALAIR",    condition:"Neuf",        description:"Design exclusif, édition limitée. Impression sérigraphie, coton bio 180gsm.",                    emoji:"👕", published:true },
];
const PAL = [
  { bg:"#0A1018", ac:TEAL }, { bg:"#100A18", ac:"#C084FC" }, { bg:"#0A1810", ac:"#86EFAC" },
  { bg:"#18100A", ac:"#FCA5A5" }, { bg:"#181810", ac:"#FDE68A" }, { bg:"#100A18", ac:TEAL },
  { bg:"#0A1014", ac:"#67E8F9" }, { bg:"#14100A", ac:"#FDBA74" },
];
const CONDITIONS = ["Neuf", "Très bon état", "Bon état", "Occasion"];

/* ═══════════════════════════════════════════════════════════
   GLOBAL STYLES
═══════════════════════════════════════════════════════════ */
function GS() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');
      *,*::before,*::after { box-sizing:border-box; margin:0; padding:0 }
      html,body,#root { background:#080C10; color:#F0F4F8; font-family:'DM Sans',sans-serif; min-height:100vh; overflow-x:hidden }
      ::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-track { background:#080C10 } ::-webkit-scrollbar-thumb { background:#1e2830 }
      button { cursor:pointer; border:none; background:none; font-family:inherit; color:inherit }
      input,textarea,select { font-family:inherit }
      @keyframes fadeUp  { from { opacity:0; transform:translateY(14px) } to { opacity:1; transform:translateY(0) } }
      @keyframes slideR  { from { transform:translateX(100%) } to { transform:translateX(0) } }
      @keyframes scaleIn { from { opacity:0; transform:scale(0.96) } to { opacity:1; transform:scale(1) } }
      @keyframes spin    { to { transform:rotate(360deg) } }
      @keyframes pulseG  { 0%,100% { opacity:1 } 50% { opacity:.3 } }
      .fu  { animation:fadeUp .4s ease forwards }
      .si  { animation:scaleIn .2s ease forwards }
      .sr  { animation:slideR .28s ease forwards }
      .hl  { transition:transform .24s ease, box-shadow .24s ease }
      .hl:hover { transform:translateY(-5px); box-shadow:0 18px 48px rgba(0,0,0,.65) }
      .sp  { border:2px solid #1e2830; border-top-color:${TEAL}; border-radius:50%; animation:spin .65s linear infinite; display:inline-block; flex-shrink:0 }
      /* Buttons */
      .bt  { background:${TEAL}; color:#080C10; font-family:'Syne',sans-serif; font-weight:700; font-size:11px; letter-spacing:.12em; text-transform:uppercase; padding:13px 26px; border:none; cursor:pointer; transition:background .16s, transform .12s; border-radius:3px }
      .bt:hover { background:#aaeee3 } .bt:active { transform:scale(.98) } .bt:disabled { opacity:.35; cursor:not-allowed }
      .bw  { background:#F0F4F8; color:#080C10; font-family:'Syne',sans-serif; font-weight:700; font-size:11px; letter-spacing:.12em; text-transform:uppercase; padding:13px 26px; border:none; cursor:pointer; transition:background .16s; border-radius:3px }
      .bw:hover { background:#fff }
      .bo  { background:transparent; color:#F0F4F8; font-family:'Syne',sans-serif; font-weight:700; font-size:11px; letter-spacing:.12em; text-transform:uppercase; padding:12px 26px; border:1px solid rgba(240,244,248,.2); cursor:pointer; transition:all .16s; border-radius:3px }
      .bo:hover { border-color:#F0F4F8; background:rgba(240,244,248,.05) }
      .bt2 { background:${TEAL_DIM}; color:${TEAL}; font-family:'Syne',sans-serif; font-weight:700; font-size:11px; letter-spacing:.1em; text-transform:uppercase; padding:11px 22px; border:1px solid ${TEAL_BORDER}; cursor:pointer; transition:all .16s; border-radius:3px }
      .bt2:hover { background:rgba(145,227,212,.2) }
      /* Inputs */
      .inp { background:#0E151C; border:1px solid #1e2830; color:#F0F4F8; padding:12px 14px; font-size:14px; width:100%; outline:none; transition:border-color .18s; resize:vertical; border-radius:3px }
      .inp:focus { border-color:${TEAL} } .inp::placeholder { color:#3a4a58 }
      /* Badges */
      .bg  { font-family:'Syne',sans-serif; font-size:8px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; padding:3px 8px; border-radius:20px; display:inline-flex; align-items:center }
      .tg  { background:rgba(134,239,172,.1); color:#86EFAC }
      .tr  { background:rgba(252,165,165,.1); color:#FCA5A5 }
      .tb  { background:${TEAL_DIM}; color:${TEAL} }
      .ty  { background:rgba(253,230,138,.1); color:#FDE68A }
      .tp  { background:rgba(192,132,252,.1); color:#C084FC }
      hr.d { border:none; border-top:1px solid #111820; margin:0 }
    `}</style>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT VISUAL
═══════════════════════════════════════════════════════════ */
function Viz({ product, idx, size = 260 }) {
  const p = PAL[idx % PAL.length];
  return (
    <svg width={size} height={size} viewBox="0 0 260 260">
      <rect width="260" height="260" fill={p.bg} />
      <g stroke={p.ac} strokeOpacity=".06" strokeWidth="1">
        {Array.from({ length: 14 }, (_, i) => <line key={"h"+i} x1={i*20} y1="0" x2={i*20} y2="260" />)}
        {Array.from({ length: 14 }, (_, i) => <line key={"v"+i} x1="0" y1={i*20} x2="260" y2={i*20} />)}
      </g>
      <circle cx="130" cy="130" r="78" fill="none" stroke={p.ac} strokeOpacity=".1" strokeWidth="36" />
      <circle cx="130" cy="130" r="42" fill={p.ac} fillOpacity=".06" />
      <text x="130" y="152" textAnchor="middle" fontSize="60" fontFamily="serif">{product.emoji}</text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTH MODAL  (phone + password + OTP verification)
═══════════════════════════════════════════════════════════ */
function AuthModal({ onClose, onLogin, onRegister }) {
  const [mode, setMode]     = useState("login");   // login | register
  const [step, setStep]     = useState(1);         // 1=form, 2=otp
  const [f, setF]           = useState({ name:"", phone:"", password:"", confirm:"" });
  const [otp, setOtp]       = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [err, setErr]       = useState("");
  const [busy, setBusy]     = useState(false);
  const [shown, setShown]   = useState(false);     // show OTP hint

  const submit = async () => {
    setErr(""); setBusy(true);
    await new Promise(r => setTimeout(r, 280));
    if (mode === "login") {
      const res = await onLogin(fmtPhone(f.phone), f.password);
      if (res?.error) setErr(res.error);
    } else {
      if (!f.name.trim())               { setErr("Le prénom/nom est requis.");           setBusy(false); return; }
      if (fmtPhone(f.phone).length < 10){ setErr("Numéro de téléphone invalide.");       setBusy(false); return; }
      if (f.password.length < 6)        { setErr("Mot de passe : 6 caractères minimum."); setBusy(false); return; }
      if (f.password !== f.confirm)     { setErr("Les mots de passe ne correspondent pas."); setBusy(false); return; }
      // check availability
      const check = await onRegister("check", fmtPhone(f.phone));
      if (check?.error) { setErr(check.error); setBusy(false); return; }
      // send OTP
      const code = genOTP();
      setSentOtp(code);
      setStep(2);
    }
    setBusy(false);
  };

  const verifyOtp = async () => {
    setErr(""); setBusy(true);
    await new Promise(r => setTimeout(r, 280));
    if (otp.trim() !== sentOtp) { setErr("Code incorrect. Réessayez."); setBusy(false); return; }
    const res = await onRegister("create", fmtPhone(f.phone), f.name.trim(), f.password);
    if (res?.error) setErr(res.error);
    setBusy(false);
  };

  const back = () => { setStep(1); setOtp(""); setErr(""); setSentOtp(""); setShown(false); };

  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.82)", zIndex:200, backdropFilter:"blur(8px)" }} onClick={onClose} />
      <div className="si" style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:300, background:"#0A1018", border:`1px solid ${TEAL_BORDER}`, width:"min(92vw,400px)", padding:"34px", borderRadius:"6px" }}>

        {/* ── STEP 1: form ── */}
        {step === 1 && (<>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"26px" }}>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"19px", fontWeight:"800" }}>
              {mode === "login" ? "Connexion" : "Créer un compte"}
            </h2>
            <button onClick={onClose} style={{ color:"#3a4a58", fontSize:"22px", lineHeight:1 }}>×</button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"9px" }}>
            {mode === "register" && (
              <input className="inp" placeholder="Prénom Nom" value={f.name} onChange={e => setF({ ...f, name:e.target.value })} />
            )}
            <div style={{ position:"relative" }}>
              <span style={{ position:"absolute", left:"13px", top:"50%", transform:"translateY(-50%)", color:"#3a4a58", fontSize:"13px", pointerEvents:"none" }}>📱</span>
              <input className="inp" placeholder="Numéro de téléphone" style={{ paddingLeft:"38px" }}
                value={dispPhone(f.phone)}
                onChange={e => setF({ ...f, phone:fmtPhone(e.target.value) })}
                maxLength={14} />
            </div>
            <input className="inp" type="password" placeholder="Mot de passe" value={f.password}
              onChange={e => setF({ ...f, password:e.target.value })}
              onKeyDown={e => e.key === "Enter" && mode === "login" && submit()} />
            {mode === "register" && (
              <input className="inp" type="password" placeholder="Confirmer le mot de passe" value={f.confirm}
                onChange={e => setF({ ...f, confirm:e.target.value })}
                onKeyDown={e => e.key === "Enter" && submit()} />
            )}
            {err && <p style={{ color:"#FCA5A5", fontSize:"12px", lineHeight:"1.4" }}>{err}</p>}
            <button className="bt" onClick={submit} disabled={busy} style={{ marginTop:"4px", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
              {busy && <span className="sp" style={{ width:"14px", height:"14px" }} />}
              {mode === "login" ? "Se connecter" : "Continuer →"}
            </button>
          </div>
          <p style={{ marginTop:"18px", fontSize:"12px", color:"#3a4a58", textAlign:"center" }}>
            {mode === "login" ? "Pas encore de compte ? " : "Déjà un compte ? "}
            <button style={{ color:TEAL, fontWeight:"600", textDecoration:"underline" }}
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setErr(""); }}>
              {mode === "login" ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </>)}

        {/* ── STEP 2: OTP ── */}
        {step === 2 && (<>
          <button onClick={back} style={{ color:"#3a4a58", fontSize:"12px", marginBottom:"20px", display:"flex", alignItems:"center", gap:"6px" }}>← Retour</button>
          <div style={{ textAlign:"center", marginBottom:"24px" }}>
            <div style={{ fontSize:"36px", marginBottom:"10px" }}>📲</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"18px", fontWeight:"800", marginBottom:"6px" }}>Vérification</h2>
            <p style={{ fontSize:"13px", color:"#5a7080", lineHeight:"1.6" }}>
              Un code a été envoyé au<br />
              <strong style={{ color:TEAL }}>{dispPhone(f.phone)}</strong>
            </p>
          </div>
          {/* Simulation box */}
          <div style={{ background:`rgba(145,227,212,.06)`, border:`1px dashed ${TEAL_BORDER}`, borderRadius:"4px", padding:"12px 14px", marginBottom:"16px", textAlign:"center" }}>
            <p style={{ fontSize:"10px", color:TEAL, fontFamily:"'Syne',sans-serif", fontWeight:"700", letterSpacing:".12em", textTransform:"uppercase", marginBottom:"4px" }}>Simulation — code SMS</p>
            {shown ? (
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"24px", fontWeight:"800", letterSpacing:".15em", color:"#F0F4F8" }}>{sentOtp}</p>
            ) : (
              <button onClick={() => setShown(true)} style={{ fontSize:"12px", color:"#5a7080", textDecoration:"underline" }}>Afficher le code reçu</button>
            )}
          </div>
          <input className="inp" placeholder="Entrez le code à 6 chiffres" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,"").slice(0,6))}
            onKeyDown={e => e.key === "Enter" && verifyOtp()}
            style={{ textAlign:"center", fontSize:"22px", fontFamily:"'Syne',sans-serif", fontWeight:"700", letterSpacing:".18em", marginBottom:"10px" }} />
          {err && <p style={{ color:"#FCA5A5", fontSize:"12px", marginBottom:"8px" }}>{err}</p>}
          <button className="bt" onClick={verifyOtp} disabled={busy || otp.length < 6} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
            {busy && <span className="sp" style={{ width:"14px", height:"14px" }} />}
            Vérifier et créer le compte
          </button>
        </>)}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ACCOUNT PAGE (customer)
═══════════════════════════════════════════════════════════ */
function AccountPage({ user, orders, onLogout, setPage }) {
  const mine = [...orders].filter(o => o.userId === user.id).sort((a,b) => new Date(b.date) - new Date(a.date));
  return (
    <div style={{ maxWidth:"800px", margin:"0 auto", padding:"56px 28px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"36px", flexWrap:"wrap", gap:"14px" }}>
        <div>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"9px", fontWeight:"700", letterSpacing:".2em", textTransform:"uppercase", color:"#5a7080" }}>Mon compte</span>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"28px", fontWeight:"800", marginTop:"5px" }}>{user.name}</h1>
          <p style={{ color:TEAL, fontSize:"13px", marginTop:"3px" }}>📱 {dispPhone(user.phone)}</p>
          {user.isOptionL && <span className="bg ty" style={{ marginTop:"8px" }}>Livreur · Option L</span>}
        </div>
        <div style={{ display:"flex", gap:"10px", flexWrap:"wrap" }}>
          {user.isOptionL && <button className="bt2" style={{ padding:"8px 16px", fontSize:"10px" }} onClick={() => setPage("delivery")}>Ouvrir Site X →</button>}
          <button className="bo" style={{ padding:"8px 16px", fontSize:"10px" }} onClick={onLogout}>Déconnexion</button>
        </div>
      </div>
      <hr className="d" style={{ marginBottom:"30px" }} />
      <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"11px", fontWeight:"700", letterSpacing:".12em", textTransform:"uppercase", color:"#3a4a58", marginBottom:"14px" }}>
        Mes commandes ({mine.length})
      </h2>
      {mine.length === 0 ? (
        <div style={{ textAlign:"center", padding:"56px 0", color:"#1e2830" }}>
          <div style={{ fontSize:"36px", marginBottom:"12px" }}>🛍️</div>
          <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"15px", color:"#3a4a58" }}>Aucune commande pour l'instant</p>
          <p style={{ fontSize:"12px", color:"#2a3840", marginTop:"6px" }}>Explorez la boutique !</p>
        </div>
      ) : mine.map(o => (
        <div key={o.id} style={{ background:"#0E151C", border:"1px solid #111820", padding:"18px", marginBottom:"8px", borderRadius:"4px" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"10px", flexWrap:"wrap", gap:"8px" }}>
            <div>
              <div style={{ display:"flex", alignItems:"center", gap:"10px", flexWrap:"wrap" }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"15px", fontWeight:"800", letterSpacing:".05em", color:TEAL }}>{o.code}</span>
                <span className={`bg ${o.status === "Livré" ? "tg" : o.status === "Annulé" ? "tr" : "tb"}`}>{o.status || "En attente"}</span>
              </div>
              <p style={{ fontSize:"11px", color:"#3a4a58", marginTop:"4px" }}>{new Date(o.date).toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}</p>
            </div>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"20px", fontWeight:"800", color:"#F0F4F8" }}>{o.total}€</span>
          </div>
          <div style={{ display:"flex", gap:"5px", flexWrap:"wrap" }}>
            {o.items.map((it, i) => <span key={i} style={{ fontSize:"11px", background:"#080C10", padding:"3px 8px", color:"#3a4a58", borderRadius:"20px" }}>{it.emoji} {it.name} ×{it.qty}</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════════ */
function Navbar({ cats, selCat, setSelCat, setView, cart, setCartOpen, sq, setSq, setPage, user, onAuthOpen }) {
  const [sOpen, setSOpen] = useState(false);
  const count = cart.reduce((s, i) => s + i.qty, 0);
  return (
    <nav style={{ position:"sticky", top:0, zIndex:50, background:"rgba(8,12,16,.97)", backdropFilter:"blur(18px)", borderBottom:`1px solid rgba(145,227,212,.1)` }}>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", height:"56px", maxWidth:"1400px", margin:"0 auto", gap:"10px" }}>
        <button onClick={() => { setView("home"); setSelCat(null); setSq(""); }}
          style={{ fontFamily:"'Syne',sans-serif", fontSize:"18px", fontWeight:"800", letterSpacing:"-.02em", color:TEAL, flexShrink:0 }}>
          ALAIR
        </button>
        <div style={{ display:"flex", gap:"1px", alignItems:"center", overflowX:"auto", flex:1, justifyContent:"center" }}>
          {["all", ...cats].map(c => {
            const on = c === "all" ? !selCat : selCat === c;
            return (
              <button key={c} onClick={() => { c === "all" ? setSelCat(null) : setSelCat(c); setView("shop"); setSq(""); }}
                style={{ fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"10px", letterSpacing:".1em", textTransform:"uppercase",
                  color: on ? TEAL : "#3a4a58", padding:"8px 10px", whiteSpace:"nowrap",
                  borderBottom: on ? `2px solid ${TEAL}` : "2px solid transparent", transition:"color .16s, border-color .16s" }}>
                {c === "all" ? "Tout" : c}
              </button>
            );
          })}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"16px", flexShrink:0 }}>
          <button onClick={() => setSOpen(!sOpen)} style={{ color: sOpen ? TEAL : "#3a4a58", transition:"color .16s" }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          </button>
          <button onClick={() => setCartOpen(true)} style={{ color:"#3a4a58", position:"relative", transition:"color .16s" }}
            onMouseEnter={e => e.currentTarget.style.color = TEAL} onMouseLeave={e => e.currentTarget.style.color = "#3a4a58"}>
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            {count > 0 && <span style={{ position:"absolute", top:"-7px", right:"-7px", background:TEAL, color:"#080C10", width:"15px", height:"15px", borderRadius:"50%", fontSize:"8px", fontWeight:"800", fontFamily:"'Syne',sans-serif", display:"flex", alignItems:"center", justifyContent:"center" }}>{count}</span>}
          </button>
          {user ? (
            <button onClick={() => setPage(user.type === "admin" ? "admin" : "account")}
              style={{ width:"30px", height:"30px", background:TEAL_DIM, border:`1px solid ${TEAL_BORDER}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"12px", color:TEAL }}>
              {user.name?.charAt(0).toUpperCase() || "A"}
            </button>
          ) : (
            <button onClick={onAuthOpen} className="bt2" style={{ padding:"7px 14px", fontSize:"10px" }}>Connexion</button>
          )}
        </div>
      </div>
      {sOpen && (
        <div style={{ padding:"0 28px 12px", maxWidth:"1400px", margin:"0 auto" }}>
          <input className="inp" autoFocus placeholder="Rechercher un article..." value={sq}
            onChange={e => { setSq(e.target.value); setView("shop"); setSelCat(null); }} style={{ maxWidth:"420px" }} />
        </div>
      )}
    </nav>
  );
}

/* ═══════════════════════════════════════════════════════════
   HERO
═══════════════════════════════════════════════════════════ */
function Hero({ setView, setSelCat }) {
  return (
    <div style={{ minHeight:"88vh", display:"flex", flexDirection:"column", justifyContent:"flex-end", padding:"80px 32px", position:"relative", overflow:"hidden", background:"#080C10" }}>
      <div style={{ position:"absolute", inset:0, background:`radial-gradient(ellipse 60% 50% at 64% 46%, rgba(145,227,212,.07) 0%, transparent 70%)`, pointerEvents:"none" }} />
      <div style={{ position:"absolute", right:"-15px", top:"50%", transform:"translateY(-50%)", fontFamily:"'Syne',sans-serif", fontSize:"clamp(150px,19vw,320px)", fontWeight:"800", color:"transparent", WebkitTextStroke:`1px rgba(145,227,212,.06)`, lineHeight:1, userSelect:"none", letterSpacing:"-.04em", pointerEvents:"none" }}>AL</div>
      <div style={{ position:"relative" }}>
        <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"9px", fontWeight:"700", letterSpacing:".22em", textTransform:"uppercase", color:TEAL, background:TEAL_DIM, padding:"5px 12px", border:`1px solid ${TEAL_BORDER}`, borderRadius:"20px" }}>Collection 2025</span>
        <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"clamp(48px,8vw,112px)", fontWeight:"800", lineHeight:.9, letterSpacing:"-.04em", color:"#F0F4F8", marginTop:"20px", marginBottom:"24px" }}>
          L'ESSENTIEL,<br /><span style={{ color:TEAL }}>SUBLIMÉ.</span>
        </h1>
        <p style={{ fontSize:"14px", color:"#3a4a58", maxWidth:"340px", lineHeight:"1.7", fontWeight:"300", marginBottom:"32px" }}>
          Des pièces pensées pour durer. Des matières choisies avec soin. Un style qui vous appartient.
        </p>
        <div style={{ display:"flex", gap:"12px", flexWrap:"wrap" }}>
          <button className="bt" onClick={() => { setSelCat("Nouveautés"); setView("shop"); }}>Explorer la collection</button>
          <button className="bo" onClick={() => { setSelCat("Soldes"); setView("shop"); }}>Offres spéciales</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT CARD
═══════════════════════════════════════════════════════════ */
function PCard({ product, idx, onAdd, onSel, user, onAuthOpen }) {
  const p = PAL[idx % PAL.length];
  const [adding, setAdding] = useState(false);
  const add = e => {
    e.stopPropagation();
    if (!user) { onAuthOpen(); return; }
    setAdding(true); onAdd(product); setTimeout(() => setAdding(false), 900);
  };
  return (
    <div className="hl fu" onClick={() => onSel(product, idx)}
      style={{ cursor:"pointer", background:"#0E151C", border:"1px solid #111820", overflow:"hidden", borderRadius:"6px", animationDelay:`${(idx % 6) * .06}s` }}>
      <div style={{ position:"relative", background:p.bg }}>
        <Viz product={product} idx={idx} size={260} />
        <span className="bg tb" style={{ position:"absolute", top:"10px", left:"10px" }}>{product.category}</span>
        {product.condition && product.condition !== "Neuf" &&
          <span className="bg ty" style={{ position:"absolute", top:"10px", right:"10px" }}>{product.condition}</span>}
      </div>
      <div style={{ padding:"16px" }}>
        <p style={{ fontSize:"10px", color:"#3a4a58", marginBottom:"3px", fontFamily:"'Syne',sans-serif", fontWeight:"600", letterSpacing:".06em" }}>{product.brand || "ALAIR"}</p>
        <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:"14px", fontWeight:"700", marginBottom:"5px" }}>{product.name}</h3>
        <p style={{ fontSize:"12px", color:"#3a4a58", lineHeight:"1.5", marginBottom:"14px", overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{product.description}</p>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"18px", fontWeight:"800", color:TEAL }}>{product.price}€</span>
          <button onClick={add}
            style={{ background:adding ? TEAL : "transparent", color:adding ? "#080C10" : TEAL, border:`1px solid ${TEAL_BORDER}`, padding:"7px 13px", fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"10px", letterSpacing:".08em", textTransform:"uppercase", cursor:"pointer", transition:"all .18s", borderRadius:"3px" }}>
            {adding ? "✓" : "+ Panier"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT GRID
═══════════════════════════════════════════════════════════ */
function PGrid({ products, selCat, sq, onAdd, onSel, user, onAuthOpen }) {
  const list = products.filter(p => p.published !== false).filter(p => {
    if (sq) return [p.name, p.category, p.description, p.brand].join(" ").toLowerCase().includes(sq.toLowerCase());
    if (selCat) return p.category === selCat;
    return true;
  });
  const title = sq ? `"${sq}"` : (selCat || "Toute la collection");
  return (
    <div style={{ padding:"52px 32px", maxWidth:"1400px", margin:"0 auto" }}>
      <div style={{ marginBottom:"26px", display:"flex", alignItems:"baseline", gap:"12px", flexWrap:"wrap" }}>
        <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"20px", fontWeight:"800", letterSpacing:"-.02em" }}>{title}</h2>
        <span style={{ fontSize:"12px", color:"#3a4a58" }}>{list.length} article{list.length !== 1 ? "s" : ""}</span>
      </div>
      {list.length === 0 ? (
        <div style={{ textAlign:"center", padding:"80px 0" }}>
          <div style={{ fontSize:"36px", marginBottom:"12px" }}>🔍</div>
          <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"17px", color:"#3a4a58" }}>Aucun article trouvé</p>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(238px,1fr))", gap:"14px" }}>
          {list.map((p, i) => <PCard key={p.id} product={p} idx={products.indexOf(p)} onAdd={onAdd} onSel={onSel} user={user} onAuthOpen={onAuthOpen} />)}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   PRODUCT DETAIL MODAL (rich)
═══════════════════════════════════════════════════════════ */
function PModal({ product, idx, onClose, onAdd, user, onAuthOpen }) {
  const p = PAL[idx % PAL.length];
  const [qty, setQty] = useState(1);
  const [done, setDone] = useState(false);
  const [tab, setTab] = useState("desc"); // desc | details | ship
  const add = () => {
    if (!user) { onClose(); onAuthOpen(); return; }
    for (let i = 0; i < qty; i++) onAdd(product);
    setDone(true); setTimeout(() => setDone(false), 1100);
  };
  const details = [
    { label:"Catégorie",  value:product.category },
    { label:"Marque",     value:product.brand || "ALAIR" },
    { label:"État",       value:product.condition || "Neuf" },
    { label:"Référence",  value:product.id?.toUpperCase() },
    { label:"Disponibilité", value:"En stock" },
    ...(product.material ? [{ label:"Matière", value:product.material }] : []),
    ...(product.weight   ? [{ label:"Poids",   value:product.weight }]   : []),
  ];
  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.82)", zIndex:100, backdropFilter:"blur(6px)" }} onClick={onClose} />
      <div className="si" style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:200, background:"#0A1018", border:`1px solid ${TEAL_BORDER}`, width:"min(96vw,900px)", maxHeight:"92vh", overflow:"auto", display:"grid", gridTemplateColumns:"340px 1fr", borderRadius:"8px" }}>
        {/* Left: visual */}
        <div style={{ background:p.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px", borderRight:`1px solid rgba(145,227,212,.08)` }}>
          <Viz product={product} idx={idx} size={300} />
          <div style={{ marginTop:"16px", display:"flex", gap:"8px", flexWrap:"wrap", justifyContent:"center" }}>
            <span className="bg tb">{product.category}</span>
            <span className={`bg ${product.condition === "Neuf" ? "tg" : "ty"}`}>{product.condition || "Neuf"}</span>
            {product.brand && <span className="bg tp">{product.brand}</span>}
          </div>
        </div>
        {/* Right: info */}
        <div style={{ padding:"32px", display:"flex", flexDirection:"column", minWidth:0 }}>
          <button onClick={onClose} style={{ color:"#3a4a58", fontSize:"22px", display:"block", marginLeft:"auto", marginBottom:"4px", lineHeight:1 }}>×</button>
          <p style={{ fontSize:"10px", color:TEAL, fontFamily:"'Syne',sans-serif", fontWeight:"700", letterSpacing:".1em", textTransform:"uppercase", marginBottom:"6px" }}>{product.brand || "ALAIR"}</p>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"24px", fontWeight:"800", lineHeight:"1.1", marginBottom:"6px" }}>{product.name}</h2>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"18px" }}>
            <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"30px", fontWeight:"800", color:TEAL }}>{product.price}€</span>
            <span className={`bg ${product.condition === "Neuf" ? "tg" : "ty"}`}>{product.condition || "Neuf"}</span>
          </div>

          {/* Tabs */}
          <div style={{ display:"flex", gap:"0", marginBottom:"18px", borderBottom:`1px solid #111820` }}>
            {[["desc","Description"], ["details","Détails"], ["ship","Livraison"]].map(([k,l]) => (
              <button key={k} onClick={() => setTab(k)}
                style={{ fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"10px", letterSpacing:".1em", textTransform:"uppercase",
                  color:tab === k ? TEAL : "#3a4a58", padding:"8px 14px",
                  borderBottom:tab === k ? `2px solid ${TEAL}` : "2px solid transparent",
                  marginBottom:"-1px", transition:"color .16s" }}>
                {l}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ flex:1, minHeight:"80px", marginBottom:"20px" }}>
            {tab === "desc" && (
              <p style={{ fontSize:"14px", color:"#5a7080", lineHeight:"1.75" }}>{product.description || "Aucune description disponible."}</p>
            )}
            {tab === "details" && (
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"6px" }}>
                {details.map((d, i) => (
                  <div key={i} style={{ background:"#0E151C", border:"1px solid #111820", padding:"10px 12px", borderRadius:"3px" }}>
                    <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"8px", fontWeight:"700", letterSpacing:".14em", textTransform:"uppercase", color:"#3a4a58", marginBottom:"3px" }}>{d.label}</p>
                    <p style={{ fontSize:"13px", color:"#F0F4F8", fontWeight:"500" }}>{d.value || "—"}</p>
                  </div>
                ))}
              </div>
            )}
            {tab === "ship" && (
              <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
                {[
                  { icon:"🚚", title:"Livraison standard", desc:"Livraison à domicile contre remise du code de commande." },
                  { icon:"📦", title:"Emballage soigné",   desc:"Chaque article est emballé avec soin pour vous parvenir en parfait état." },
                  { icon:"🔄", title:"Échanges",            desc:"Contactez-nous via votre compte en cas de problème avec votre commande." },
                ].map((row, i) => (
                  <div key={i} style={{ display:"flex", gap:"12px", background:"#0E151C", border:"1px solid #111820", padding:"12px 14px", borderRadius:"4px" }}>
                    <span style={{ fontSize:"22px", flexShrink:0 }}>{row.icon}</span>
                    <div>
                      <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"12px", fontWeight:"700", marginBottom:"3px" }}>{row.title}</p>
                      <p style={{ fontSize:"12px", color:"#5a7080", lineHeight:"1.5" }}>{row.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Qty + Add */}
          <div style={{ display:"flex", alignItems:"center", gap:"12px", marginBottom:"12px" }}>
            <span style={{ fontSize:"12px", color:"#3a4a58" }}>Qté :</span>
            <div style={{ display:"flex", alignItems:"center", border:`1px solid #1e2830`, borderRadius:"3px" }}>
              <button onClick={() => setQty(Math.max(1, qty-1))} style={{ width:"32px", height:"32px", fontSize:"16px", color:"#F0F4F8" }}>−</button>
              <span style={{ width:"32px", textAlign:"center", fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"13px", color:"#F0F4F8" }}>{qty}</span>
              <button onClick={() => setQty(qty+1)} style={{ width:"32px", height:"32px", fontSize:"16px", color:"#F0F4F8" }}>+</button>
            </div>
          </div>
          <button onClick={add} className="bt" style={{ width:"100%" }}>
            {!user ? "Connexion requise" : done ? "✓ Ajouté au panier !" : `Ajouter au panier — ${product.price * qty}€`}
          </button>
          {!user && <p style={{ fontSize:"11px", color:"#3a4a58", textAlign:"center", marginTop:"8px" }}>Créez un compte gratuit pour commander.</p>}
        </div>
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CART
═══════════════════════════════════════════════════════════ */
function Cart({ cart, setCart, setCartOpen, setCheckout, user, onAuthOpen }) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const upd = (id, qty) => { if (qty < 1) return setCart(cart.filter(i => i.id !== id)); setCart(cart.map(i => i.id === id ? { ...i, qty } : i)); };
  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.65)", zIndex:100, backdropFilter:"blur(4px)" }} onClick={() => setCartOpen(false)} />
      <div className="sr" style={{ position:"fixed", right:0, top:0, bottom:0, width:"min(92vw,380px)", background:"#0A1018", borderLeft:`1px solid rgba(145,227,212,.1)`, zIndex:200, display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"18px 20px", borderBottom:"1px solid #111820", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ fontFamily:"'Syne',sans-serif", fontSize:"14px", fontWeight:"800" }}>Panier {cart.length > 0 && <span style={{ color:TEAL }}>({cart.reduce((s,i) => s+i.qty, 0)})</span>}</h3>
          <button onClick={() => setCartOpen(false)} style={{ color:"#3a4a58", fontSize:"20px" }}>×</button>
        </div>
        <div style={{ flex:1, overflow:"auto", padding:"12px" }}>
          {cart.length === 0 ? (
            <div style={{ textAlign:"center", paddingTop:"56px", color:"#1e2830" }}>
              <div style={{ fontSize:"32px", marginBottom:"10px" }}>🛒</div>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"13px", color:"#3a4a58" }}>Votre panier est vide</p>
            </div>
          ) : cart.map((item, i) => (
            <div key={item.id+i} style={{ display:"flex", gap:"10px", marginBottom:"9px", padding:"11px", background:"#0E151C", border:"1px solid #111820", borderRadius:"4px" }}>
              <div style={{ width:"50px", height:"50px", flexShrink:0, background:PAL[i%PAL.length].bg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:"22px", borderRadius:"3px" }}>{item.emoji}</div>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"12px", fontWeight:"700", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{item.name}</p>
                <p style={{ fontSize:"10px", color:"#3a4a58", marginBottom:"7px" }}>{item.brand || "ALAIR"} · {item.category}</p>
                <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
                  <div style={{ display:"flex", alignItems:"center", border:"1px solid #1e2830", borderRadius:"3px" }}>
                    <button onClick={() => upd(item.id, item.qty-1)} style={{ color:"#F0F4F8", width:"22px", height:"22px", fontSize:"13px" }}>−</button>
                    <span style={{ width:"22px", textAlign:"center", fontSize:"11px", fontFamily:"'Syne',sans-serif", color:"#F0F4F8" }}>{item.qty}</span>
                    <button onClick={() => upd(item.id, item.qty+1)} style={{ color:"#F0F4F8", width:"22px", height:"22px", fontSize:"13px" }}>+</button>
                  </div>
                  <button onClick={() => upd(item.id, 0)} style={{ fontSize:"10px", color:"#3a4a58" }}>Retirer</button>
                </div>
              </div>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"13px", fontWeight:"800", flexShrink:0, color:TEAL }}>{item.price * item.qty}€</div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div style={{ padding:"16px", borderTop:"1px solid #111820" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"12px" }}>
              <span style={{ color:"#3a4a58", fontSize:"13px" }}>Total</span>
              <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"18px", fontWeight:"800", color:TEAL }}>{total}€</span>
            </div>
            {user ? (
              <button className="bt" style={{ width:"100%" }} onClick={() => { setCartOpen(false); setCheckout(true); }}>Commander — {total}€</button>
            ) : (
              <><button className="bt" style={{ width:"100%" }} onClick={() => { setCartOpen(false); onAuthOpen(); }}>Connexion pour commander</button>
              <p style={{ fontSize:"11px", color:"#3a4a58", textAlign:"center", marginTop:"8px" }}>Un compte est requis pour passer commande.</p></>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   CHECKOUT
═══════════════════════════════════════════════════════════ */
function Checkout({ cart, setCart, setCheckout, orders, setOrders, user }) {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(null);
  const [f, setF] = useState({ address:"", city:"", phone2:"" });
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const submit = async () => {
    if (!f.address || !f.city) return;
    const code = genCode();
    const order = { id:genId(), code, items:[...cart], total, customer:{ name:user.name, phone:user.phone, ...f }, userId:user.id, date:new Date().toISOString(), status:"En attente" };
    const nO = [...orders, order];
    await setOrders(nO);
    setCart([]); await db.set("shop-cart", []);
    setDone(order); setStep(2);
  };
  return (
    <>
      <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.82)", zIndex:150, backdropFilter:"blur(6px)" }} onClick={() => setCheckout(false)} />
      <div className="si" style={{ position:"fixed", top:"50%", left:"50%", transform:"translate(-50%,-50%)", zIndex:250, background:"#0A1018", border:`1px solid ${TEAL_BORDER}`, width:"min(92vw,460px)", maxHeight:"90vh", overflow:"auto", padding:"34px", borderRadius:"6px" }}>
        {step === 1 ? (<>
          <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"19px", fontWeight:"800", marginBottom:"4px" }}>Finaliser la commande</h2>
          <p style={{ fontSize:"12px", color:"#3a4a58", marginBottom:"18px" }}>{cart.reduce((s,i) => s+i.qty, 0)} article(s) · {total}€</p>
          <div style={{ background:"#0E151C", padding:"11px 13px", marginBottom:"16px", borderRadius:"3px", border:"1px solid #111820" }}>
            <p style={{ fontSize:"12px", color:"#3a4a58" }}>Commande pour : <strong style={{ color:"#F0F4F8" }}>{user.name}</strong></p>
            <p style={{ fontSize:"11px", color:TEAL, marginTop:"2px" }}>📱 {dispPhone(user.phone)}</p>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"9px" }}>
            <input className="inp" placeholder="Adresse de livraison *" value={f.address} onChange={e => setF({ ...f, address:e.target.value })} />
            <input className="inp" placeholder="Ville *" value={f.city} onChange={e => setF({ ...f, city:e.target.value })} />
            <input className="inp" placeholder="Téléphone de contact (si différent)" value={f.phone2} onChange={e => setF({ ...f, phone2:e.target.value })} />
          </div>
          <div style={{ display:"flex", gap:"9px", marginTop:"18px" }}>
            <button className="bo" onClick={() => setCheckout(false)} style={{ flex:1 }}>Annuler</button>
            <button className="bt" onClick={submit} disabled={!f.address || !f.city} style={{ flex:2 }}>Confirmer</button>
          </div>
        </>) : (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"40px", marginBottom:"14px" }}>✅</div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"21px", fontWeight:"800", marginBottom:"5px" }}>Commande confirmée !</h2>
            <p style={{ color:"#3a4a58", marginBottom:"24px", fontSize:"13px", lineHeight:"1.65" }}>Merci {done?.customer.name}. Donnez ce code à votre livreur.</p>
            <div style={{ background:"#0E151C", border:`2px solid ${TEAL}`, padding:"24px", marginBottom:"18px", borderRadius:"6px" }}>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"9px", color:"#3a4a58", letterSpacing:".18em", textTransform:"uppercase", marginBottom:"8px" }}>Code de commande</p>
              <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"28px", fontWeight:"800", letterSpacing:".08em", color:TEAL }}>{done?.code}</div>
            </div>
            <div style={{ background:"#0E151C", padding:"13px", marginBottom:"18px", textAlign:"left", borderRadius:"3px", border:"1px solid #111820" }}>
              <p style={{ fontSize:"12px", color:"#3a4a58" }}>Total : <strong style={{ color:"#F0F4F8" }}>{done?.total}€</strong></p>
              <p style={{ fontSize:"12px", color:"#3a4a58", marginTop:"3px" }}>Livraison : <strong style={{ color:"#F0F4F8" }}>{done?.customer.address}, {done?.customer.city}</strong></p>
            </div>
            <button className="bt" onClick={() => setCheckout(false)} style={{ width:"100%" }}>Retour à la boutique</button>
          </div>
        )}
      </div>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD
═══════════════════════════════════════════════════════════ */
function AdminDash({ products, setProducts, categories, setCategories, admins, setAdmins, users, setUsers, orders, setOrders, adminUser, onLogout, onBack }) {
  const [tab, setTab] = useState("products");
  const [pf, setPf]   = useState({ name:"", price:"", category:"", brand:"ALAIR", condition:"Neuf", material:"", weight:"", description:"", emoji:"📦", published:true });
  const [editing, setEditing] = useState(null);
  const [nc, setNc]   = useState("");
  const [af, setAf]   = useState({ phone:"", password:"" });
  const [amsg, setAmsg] = useState("");
  const [umsg, setUmsg] = useState("");

  const saveProd = async () => {
    if (!pf.name || !pf.price || !pf.category) return;
    let u;
    if (editing) { u = products.map(p => p.id === editing ? { ...pf, id:editing, price:Number(pf.price) } : p); setEditing(null); }
    else u = [...products, { ...pf, id:genId(), price:Number(pf.price) }];
    await setProducts(u);
    setPf({ name:"", price:"", category:"", brand:"ALAIR", condition:"Neuf", material:"", weight:"", description:"", emoji:"📦", published:true });
  };
  const editP = p => { setEditing(p.id); setPf({ ...p, price:String(p.price) }); setTab("products"); };
  const delP  = async id => { await setProducts(products.filter(p => p.id !== id)); };
  const togP  = async id => { await setProducts(products.map(p => p.id === id ? { ...p, published:!p.published } : p)); };
  const addCat = async () => { if (!nc.trim() || categories.includes(nc.trim())) return; await setCategories([...categories, nc.trim()]); setNc(""); };
  const delCat = async c  => { await setCategories(categories.filter(x => x !== c)); };
  const addAdmin = async () => {
    if (!af.phone || !af.password) return;
    const p = fmtPhone(af.phone);
    if (p === SUPER_ADMIN.phone || (admins||[]).find(a => a.phone === p)) { setAmsg("Numéro déjà utilisé."); return; }
    const u = [...(admins||[]), { id:genId(), phone:p, password:af.password, name:"Admin", isSuperAdmin:false }];
    await setAdmins(u); setAf({ phone:"", password:"" }); setAmsg("✓ Admin créé."); setTimeout(() => setAmsg(""), 3000);
  };
  const remAdmin = async id => { await setAdmins((admins||[]).filter(a => a.id !== id)); };
  const togOptL  = async uid => {
    const nu = (users||[]).map(u => u.id === uid ? { ...u, isOptionL:!u.isOptionL } : u);
    await setUsers(nu); setUmsg("✓ Mis à jour."); setTimeout(() => setUmsg(""), 2500);
  };
  const updStatus = async (oid, status) => { await setOrders(orders.map(o => o.id === oid ? { ...o, status } : o)); };

  const TABS = ["products", "categories", "users", ...(adminUser.isSuperAdmin ? ["admins"] : []), "orders"];
  const TL   = { products:"Articles", categories:"Catégories", users:"Comptes", admins:"Admins", orders:"Commandes" };

  const Row = ({ label, children }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:"4px" }}>
      <label style={{ fontFamily:"'Syne',sans-serif", fontSize:"9px", fontWeight:"700", letterSpacing:".12em", textTransform:"uppercase", color:"#3a4a58" }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ minHeight:"100vh", background:"#080C10" }}>
      <div style={{ background:"#0A1018", borderBottom:`1px solid rgba(145,227,212,.1)`, padding:"0 28px", display:"flex", alignItems:"center", gap:"16px", height:"48px" }}>
        <button onClick={onBack} style={{ color:"#3a4a58", fontSize:"11px" }}>← Boutique</button>
        <span style={{ color:"#1e2830" }}>|</span>
        <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", color:TEAL, fontSize:"12px", letterSpacing:".08em" }}>PANEL ADMIN</span>
        <span style={{ fontSize:"11px", color:"#3a4a58" }}>📱 {dispPhone(adminUser.phone)}</span>
        {adminUser.isSuperAdmin && <span className="bg tb">Super Admin</span>}
        <div style={{ flex:1 }} />
        <button onClick={onLogout} className="bo" style={{ padding:"5px 14px", fontSize:"10px" }}>Déconnexion</button>
      </div>
      <div style={{ display:"flex", maxWidth:"1280px", margin:"0 auto", padding:"0 28px" }}>
        <div style={{ width:"155px", paddingTop:"28px", flexShrink:0, borderRight:"1px solid #0E151C" }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ display:"block", width:"100%", textAlign:"left", fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"10px", letterSpacing:".1em", textTransform:"uppercase", color:tab===t ? TEAL : "#3a4a58", padding:"10px 16px", cursor:"pointer", background:"none", border:"none", borderLeft:tab===t ? `2px solid ${TEAL}` : "2px solid transparent", transition:"all .16s" }}>
              {TL[t]}
            </button>
          ))}
        </div>
        <div style={{ flex:1, padding:"28px 0 28px 28px" }}>

          {/* ─ PRODUCTS ─ */}
          {tab === "products" && (<div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"20px", fontWeight:"800", marginBottom:"20px" }}>{editing ? "Modifier l'article" : "Nouvel article"}</h2>
            <div style={{ background:"#0E151C", border:"1px solid #111820", padding:"20px", marginBottom:"22px", borderRadius:"4px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginBottom:"10px" }}>
                <Row label="Nom *"><input className="inp" placeholder="Nom de l'article" value={pf.name} onChange={e => setPf({ ...pf, name:e.target.value })} /></Row>
                <Row label="Prix (€) *"><input className="inp" placeholder="Prix" type="number" value={pf.price} onChange={e => setPf({ ...pf, price:e.target.value })} /></Row>
                <Row label="Catégorie *">
                  <select className="inp" value={pf.category} onChange={e => setPf({ ...pf, category:e.target.value })} style={{ background:"#0E151C", color:pf.category ? "#F0F4F8" : "#3a4a58" }}>
                    <option value="">— Choisir —</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Row>
                <Row label="Marque"><input className="inp" placeholder="Marque" value={pf.brand} onChange={e => setPf({ ...pf, brand:e.target.value })} /></Row>
                <Row label="État">
                  <select className="inp" value={pf.condition} onChange={e => setPf({ ...pf, condition:e.target.value })} style={{ background:"#0E151C", color:"#F0F4F8" }}>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Row>
                <Row label="Emoji"><input className="inp" placeholder="Ex: 👟" value={pf.emoji} onChange={e => setPf({ ...pf, emoji:e.target.value })} /></Row>
                <Row label="Matière"><input className="inp" placeholder="Ex: Coton 100%" value={pf.material} onChange={e => setPf({ ...pf, material:e.target.value })} /></Row>
                <Row label="Poids / Dimensions"><input className="inp" placeholder="Ex: 350g" value={pf.weight} onChange={e => setPf({ ...pf, weight:e.target.value })} /></Row>
              </div>
              <Row label="Description">
                <textarea className="inp" placeholder="Description détaillée de l'article..." value={pf.description} onChange={e => setPf({ ...pf, description:e.target.value })} style={{ minHeight:"70px", marginBottom:"0" }} />
              </Row>
              <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap", marginTop:"12px" }}>
                <label style={{ display:"flex", alignItems:"center", gap:"7px", cursor:"pointer", fontSize:"12px", color:"#5a7080" }}>
                  <input type="checkbox" checked={pf.published} onChange={e => setPf({ ...pf, published:e.target.checked })} style={{ accentColor:TEAL }} />Visible en boutique
                </label>
                <div style={{ flex:1 }} />
                {editing && <button onClick={() => { setEditing(null); setPf({ name:"", price:"", category:"", brand:"ALAIR", condition:"Neuf", material:"", weight:"", description:"", emoji:"📦", published:true }); }} className="bo" style={{ padding:"8px 14px", fontSize:"10px" }}>Annuler</button>}
                <button className="bt" onClick={saveProd}>{editing ? "Mettre à jour" : "Publier"}</button>
              </div>
            </div>
            <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"10px", fontWeight:"700", color:"#3a4a58", letterSpacing:".12em", textTransform:"uppercase", marginBottom:"10px" }}>Catalogue ({products.length})</p>
            <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
              {products.map(p => (
                <div key={p.id} style={{ display:"flex", alignItems:"center", gap:"10px", background:"#0E151C", border:"1px solid #111820", padding:"10px 14px", borderRadius:"3px", flexWrap:"wrap" }}>
                  <span style={{ fontSize:"18px" }}>{p.emoji}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                      <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"12px", fontWeight:"700" }}>{p.name}</span>
                      <span className={`bg ${p.published ? "tg" : "tr"}`}>{p.published ? "Publié" : "Masqué"}</span>
                      {p.condition && <span className="bg ty">{p.condition}</span>}
                    </div>
                    <span style={{ fontSize:"11px", color:"#3a4a58" }}>{p.brand} · {p.category} · {p.price}€</span>
                  </div>
                  <button onClick={() => togP(p.id)} className="bo" style={{ padding:"4px 9px", fontSize:"10px" }}>{p.published ? "Masquer" : "Publier"}</button>
                  <button onClick={() => editP(p)} style={{ color:TEAL, border:`1px solid ${TEAL_BORDER}`, padding:"4px 9px", fontFamily:"'Syne',sans-serif", fontSize:"10px", borderRadius:"2px", textTransform:"uppercase", letterSpacing:".06em" }}>Modifier</button>
                  <button onClick={() => delP(p.id)} style={{ color:"#FCA5A5", border:"1px solid rgba(252,165,165,.2)", padding:"4px 9px", fontFamily:"'Syne',sans-serif", fontSize:"10px", borderRadius:"2px", textTransform:"uppercase", letterSpacing:".06em" }}>Suppr.</button>
                </div>
              ))}
            </div>
          </div>)}

          {/* ─ CATEGORIES ─ */}
          {tab === "categories" && (<div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"20px", fontWeight:"800", marginBottom:"20px" }}>Catégories</h2>
            <div style={{ display:"flex", gap:"9px", marginBottom:"20px" }}>
              <input className="inp" placeholder="Nouvelle catégorie" value={nc} onChange={e => setNc(e.target.value)} onKeyDown={e => e.key === "Enter" && addCat()} style={{ maxWidth:"260px" }} />
              <button className="bt" onClick={addCat}>Ajouter</button>
            </div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"7px" }}>
              {categories.map(c => (
                <div key={c} style={{ display:"flex", alignItems:"center", gap:"9px", background:"#0E151C", border:"1px solid #111820", padding:"9px 13px", borderRadius:"20px" }}>
                  <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"12px", fontWeight:"700" }}>{c}</span>
                  <span style={{ fontSize:"10px", color:"#3a4a58" }}>({products.filter(p => p.category === c).length})</span>
                  <button onClick={() => delCat(c)} style={{ color:"#FCA5A5", fontSize:"14px", lineHeight:1 }}>×</button>
                </div>
              ))}
            </div>
          </div>)}

          {/* ─ USERS ─ */}
          {tab === "users" && (<div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"20px", fontWeight:"800", marginBottom:"6px" }}>Comptes clients</h2>
            <p style={{ fontSize:"12px", color:"#3a4a58", marginBottom:"20px", lineHeight:"1.65" }}>
              Activez l'<strong style={{ color:"#FDE68A" }}>Option L</strong> pour autoriser un compte à accéder au portail livreur (Site X).
            </p>
            {umsg && <p style={{ fontSize:"12px", color:"#86EFAC", marginBottom:"12px" }}>{umsg}</p>}
            {(users||[]).length === 0 ? (
              <p style={{ color:"#3a4a58", fontSize:"13px" }}>Aucun compte client pour l'instant.</p>
            ) : (users||[]).map(u => (
              <div key={u.id} style={{ display:"flex", alignItems:"center", gap:"12px", background:"#0E151C", border:"1px solid #111820", padding:"12px 14px", marginBottom:"6px", borderRadius:"4px", flexWrap:"wrap" }}>
                <div style={{ width:"32px", height:"32px", background:TEAL_DIM, border:`1px solid ${TEAL_BORDER}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"12px", color:TEAL, flexShrink:0 }}>
                  {u.name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:"150px" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:"8px", flexWrap:"wrap" }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"12px", fontWeight:"700" }}>{u.name}</span>
                    {u.isOptionL && <span className="bg ty">Option L</span>}
                  </div>
                  <span style={{ fontSize:"11px", color:TEAL }}>📱 {dispPhone(u.phone)}</span>
                  <span style={{ fontSize:"11px", color:"#3a4a58", marginLeft:"8px" }}>· {orders.filter(o => o.userId === u.id).length} commande(s)</span>
                </div>
                <button onClick={() => togOptL(u.id)}
                  style={{ color:u.isOptionL ? "#FCA5A5" : "#FDE68A", border:`1px solid ${u.isOptionL ? "rgba(252,165,165,.2)" : "rgba(253,230,138,.2)"}`, padding:"5px 11px", fontFamily:"'Syne',sans-serif", fontSize:"10px", letterSpacing:".08em", textTransform:"uppercase", borderRadius:"20px", transition:"all .18s" }}>
                  {u.isOptionL ? "Révoquer Option L" : "Activer Option L"}
                </button>
              </div>
            ))}
          </div>)}

          {/* ─ ADMINS ─ */}
          {tab === "admins" && adminUser.isSuperAdmin && (<div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"20px", fontWeight:"800", marginBottom:"20px" }}>Administrateurs</h2>
            <div style={{ background:"#0E151C", border:"1px solid #111820", padding:"20px", marginBottom:"22px", borderRadius:"4px" }}>
              <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"10px", fontWeight:"700", color:"#3a4a58", letterSpacing:".12em", textTransform:"uppercase", marginBottom:"13px" }}>Créer un admin</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"9px", marginBottom:"10px" }}>
                <input className="inp" placeholder="Numéro de téléphone" value={af.phone} onChange={e => setAf({ ...af, phone:fmtPhone(e.target.value) })} />
                <input className="inp" type="password" placeholder="Mot de passe" value={af.password} onChange={e => setAf({ ...af, password:e.target.value })} />
              </div>
              {amsg && <p style={{ fontSize:"12px", color:"#86EFAC", marginBottom:"9px" }}>{amsg}</p>}
              <button className="bt" onClick={addAdmin}>Créer</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
              {[{ ...SUPER_ADMIN }, ...(admins||[])].map(a => (
                <div key={a.id} style={{ display:"flex", alignItems:"center", gap:"12px", background:"#0E151C", border:"1px solid #111820", padding:"12px 14px", borderRadius:"3px" }}>
                  <div style={{ width:"30px", height:"30px", background:TEAL_DIM, border:`1px solid ${TEAL_BORDER}`, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:"13px" }}>👤</div>
                  <div style={{ flex:1 }}>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"12px", fontWeight:"700" }}>{a.name || "Admin"}</span>
                    <span style={{ fontSize:"11px", color:TEAL, marginLeft:"8px" }}>📱 {dispPhone(a.phone)}</span>
                    {a.isSuperAdmin && <span className="bg tb" style={{ marginLeft:"8px" }}>Super Admin</span>}
                  </div>
                  {!a.isSuperAdmin && <button onClick={() => remAdmin(a.id)} style={{ color:"#FCA5A5", border:"1px solid rgba(252,165,165,.2)", padding:"4px 9px", fontFamily:"'Syne',sans-serif", fontSize:"10px", borderRadius:"2px" }}>Révoquer</button>}
                </div>
              ))}
            </div>
          </div>)}

          {/* ─ ORDERS ─ */}
          {tab === "orders" && (<div>
            <h2 style={{ fontFamily:"'Syne',sans-serif", fontSize:"20px", fontWeight:"800", marginBottom:"20px" }}>Commandes ({orders.length})</h2>
            {orders.length === 0 ? (
              <div style={{ textAlign:"center", padding:"56px", color:"#1e2830" }}>
                <div style={{ fontSize:"32px", marginBottom:"10px" }}>📦</div>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"15px", color:"#3a4a58" }}>Aucune commande</p>
              </div>
            ) : [...orders].reverse().map(o => (
              <div key={o.id} style={{ background:"#0E151C", border:"1px solid #111820", padding:"16px", marginBottom:"7px", borderRadius:"3px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:"8px", flexWrap:"wrap", gap:"8px" }}>
                  <div>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"14px", fontWeight:"800", letterSpacing:".05em", color:TEAL }}>{o.code}</span>
                    <p style={{ fontSize:"11px", color:"#3a4a58", marginTop:"3px" }}>{new Date(o.date).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })}</p>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
                    <select value={o.status || "En attente"} onChange={e => updStatus(o.id, e.target.value)}
                      style={{ background:"#080C10", border:`1px solid ${TEAL_BORDER}`, color:TEAL, padding:"4px 8px", fontSize:"10px", fontFamily:"'Syne',sans-serif", borderRadius:"20px" }}>
                      {["En attente","Expédié","Livré","Annulé"].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"16px", fontWeight:"800", color:"#F0F4F8" }}>{o.total}€</span>
                  </div>
                </div>
                <p style={{ fontSize:"12px", color:"#F0F4F8" }}>{o.customer.name} <span style={{ color:"#3a4a58" }}>· 📱 {dispPhone(o.customer.phone)}</span></p>
                <p style={{ fontSize:"11px", color:"#3a4a58", marginTop:"2px" }}>📍 {o.customer.address}, {o.customer.city}</p>
                <div style={{ marginTop:"7px", display:"flex", gap:"5px", flexWrap:"wrap" }}>
                  {o.items.map((it, i) => <span key={i} style={{ fontSize:"10px", background:"#080C10", padding:"2px 8px", color:"#3a4a58", borderRadius:"20px" }}>{it.emoji} {it.name} ×{it.qty}</span>)}
                </div>
              </div>
            ))}
          </div>)}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SITE X (delivery portal)
═══════════════════════════════════════════════════════════ */
function SiteX({ orders, onBack }) {
  const [code, setCode] = useState("");
  const [res,  setRes]  = useState(null);
  const [nf,   setNf]   = useState(false);
  const lookup = () => { const o = orders.find(x => x.code === code.toUpperCase().trim()); if (o) { setRes(o); setNf(false); } else { setRes(null); setNf(true); } };
  return (
    <div style={{ minHeight:"100vh", background:"#04080C", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"40px" }}>
      <div style={{ position:"fixed", top:0, left:0, right:0, height:"44px", background:"rgba(4,8,12,.97)", borderBottom:`1px solid rgba(145,227,212,.1)`, display:"flex", alignItems:"center", padding:"0 28px", justifyContent:"space-between", zIndex:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"14px", fontWeight:"800", color:TEAL, letterSpacing:".06em" }}>SITE X</span>
          <span style={{ fontSize:"8px", color:"#2a3a48", fontFamily:"'Syne',sans-serif", letterSpacing:".14em", textTransform:"uppercase", background:"#0A1018", padding:"2px 8px", borderRadius:"20px" }}>Portail Livreur</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"7px" }}>
          <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:TEAL, animation:"pulseG 2s infinite" }} />
          <span style={{ fontSize:"9px", color:"#3a4a58", fontFamily:"'Syne',sans-serif", letterSpacing:".1em", textTransform:"uppercase" }}>En ligne</span>
        </div>
      </div>
      <button onClick={onBack} style={{ position:"fixed", top:"54px", left:"28px", color:"#3a4a58", fontSize:"11px" }}>← Retour</button>
      <div style={{ width:"100%", maxWidth:"440px", marginTop:"28px" }}>
        <div style={{ textAlign:"center", marginBottom:"34px" }}>
          <div style={{ fontSize:"40px", marginBottom:"12px" }}>📦</div>
          <h1 style={{ fontFamily:"'Syne',sans-serif", fontSize:"24px", fontWeight:"800", letterSpacing:"-.02em", marginBottom:"8px" }}>Vérifier une commande</h1>
          <p style={{ fontSize:"13px", color:"#3a4a58", lineHeight:"1.65" }}>Entrez le code du client pour connaître le montant à encaisser et l'adresse.</p>
        </div>
        <div style={{ display:"flex", gap:"9px", marginBottom:"16px" }}>
          <input className="inp" placeholder="CMD-XXXXXX" value={code} onChange={e => setCode(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && lookup()}
            style={{ fontSize:"14px", letterSpacing:".1em", fontFamily:"'Syne',sans-serif", fontWeight:"700" }} />
          <button className="bt" onClick={lookup} style={{ whiteSpace:"nowrap", flexShrink:0 }}>Vérifier</button>
        </div>
        {nf && (
          <div style={{ background:"rgba(252,165,165,.06)", border:"1px solid rgba(252,165,165,.14)", padding:"14px", textAlign:"center", borderRadius:"4px" }}>
            <p style={{ fontFamily:"'Syne',sans-serif", fontWeight:"700", fontSize:"13px", color:"#FCA5A5" }}>Code introuvable</p>
            <p style={{ fontSize:"11px", color:"#3a4a58", marginTop:"4px" }}>Vérifiez l'orthographe et réessayez.</p>
          </div>
        )}
        {res && (
          <div className="si" style={{ background:"#0A1018", border:`1px solid ${TEAL_BORDER}`, borderRadius:"8px", overflow:"hidden" }}>
            <div style={{ background:TEAL, padding:"20px 24px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"8px", fontWeight:"700", letterSpacing:".18em", color:"rgba(8,12,16,.5)", textTransform:"uppercase", marginBottom:"4px" }}>Code</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"18px", fontWeight:"800", color:"#080C10", letterSpacing:".04em" }}>{res.code}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"8px", fontWeight:"700", letterSpacing:".18em", color:"rgba(8,12,16,.5)", textTransform:"uppercase", marginBottom:"4px" }}>À encaisser</div>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:"34px", fontWeight:"800", color:"#080C10", lineHeight:1 }}>{res.total}€</div>
              </div>
            </div>
            <div style={{ padding:"20px" }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"14px", marginBottom:"16px" }}>
                <div>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"8px", color:"#3a4a58", letterSpacing:".15em", textTransform:"uppercase", marginBottom:"5px" }}>Client</p>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"14px", fontWeight:"700" }}>{res.customer.name}</p>
                  <p style={{ fontSize:"11px", color:TEAL, marginTop:"2px" }}>📱 {dispPhone(res.customer.phone)}</p>
                </div>
                <div>
                  <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"8px", color:"#3a4a58", letterSpacing:".15em", textTransform:"uppercase", marginBottom:"5px" }}>Adresse</p>
                  <p style={{ fontSize:"13px", color:"#F0F4F8", lineHeight:"1.5" }}>{res.customer.address}</p>
                  <p style={{ fontSize:"13px", color:"#F0F4F8" }}>{res.customer.city}</p>
                </div>
              </div>
              <div style={{ borderTop:"1px solid #111820", paddingTop:"13px", marginBottom:"13px" }}>
                <p style={{ fontFamily:"'Syne',sans-serif", fontSize:"8px", color:"#3a4a58", letterSpacing:".15em", textTransform:"uppercase", marginBottom:"8px" }}>Articles</p>
                {res.items.map((it, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", borderBottom:"1px solid #0E151C" }}>
                    <span style={{ fontSize:"12px", color:"#F0F4F8" }}>{it.emoji} {it.name} <span style={{ color:"#3a4a58" }}>×{it.qty}</span></span>
                    <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"12px", fontWeight:"700", color:TEAL }}>{it.price * it.qty}€</span>
                  </div>
                ))}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:TEAL, padding:"14px 16px", borderRadius:"4px" }}>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"10px", fontWeight:"700", color:"#080C10", letterSpacing:".1em", textTransform:"uppercase" }}>Total à encaisser</span>
                <span style={{ fontFamily:"'Syne',sans-serif", fontSize:"26px", fontWeight:"800", color:"#080C10" }}>{res.total}€</span>
              </div>
              <p style={{ marginTop:"10px", fontSize:"10px", color:"#1e2830", textAlign:"center" }}>Passée le {new Date(res.date).toLocaleDateString("fr-FR", { day:"numeric", month:"long", year:"numeric" })}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   FOOTER
═══════════════════════════════════════════════════════════ */
function Footer() {
  return (
    <footer style={{ borderTop:"1px solid #0E151C", padding:"26px 32px", maxWidth:"1400px", margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:"10px" }}>
      <span style={{ fontFamily:"'Syne',sans-serif", fontWeight:"800", fontSize:"14px", color:TEAL }}>ALAIR</span>
      <span style={{ fontSize:"11px", color:"#1e2830" }}>© 2025 — Tous droits réservés</span>
      <span style={{ fontSize:"11px", color:"#111820" }}>Mode & Style · Paris</span>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════
   ROOT APP  ──  ALL STATE IS PERSISTED VIA db.set / db.get
═══════════════════════════════════════════════════════════ */
export default function App() {
  const [page,       setPage]       = useState("shop");
  const [view,       setView]       = useState("home");
  const [selCat,     setSelCat]     = useState(null);
  const [sq,         setSq]         = useState("");
  const [selProd,    setSelProd]    = useState(null);
  const [selIdx,     setSelIdx]     = useState(0);
  const [cartOpen,   setCartOpen]   = useState(false);
  const [cart,       setCartRaw]    = useState([]);
  const [checkout,   setCheckout]   = useState(false);
  const [authOpen,   setAuthOpen]   = useState(false);
  const [user,       setUserRaw]    = useState(null);
  const [products,   setProductsRaw]  = useState([]);
  const [categories, setCategoriesRaw]= useState([]);
  const [admins,     setAdminsRaw]  = useState([]);
  const [users,      setUsersRaw]   = useState([]);
  const [orders,     setOrdersRaw]  = useState([]);
  const [loaded,     setLoaded]     = useState(false);

  /* ── Wrapped setters that auto-persist ── */
  const persist = useCallback((key, setter) => async (val) => {
    const v = typeof val === "function" ? val : val;  // support both direct + functional
    setter(v);
    await db.set(key, v);
  }, []);

  const setCart       = useCallback(async v => { setCartRaw(v);       await db.set("shop-cart",       v); }, []);
  const setProducts   = useCallback(async v => { setProductsRaw(v);   await db.set("shop-products",   v); }, []);
  const setCategories = useCallback(async v => { setCategoriesRaw(v); await db.set("shop-categories", v); }, []);
  const setAdmins     = useCallback(async v => { setAdminsRaw(v);     await db.set("shop-admins",     v); }, []);
  const setOrders     = useCallback(async v => { setOrdersRaw(v);     await db.set("shop-orders",     v); }, []);
  const setUsers      = useCallback(async nu => {
    setUsersRaw(nu);
    await db.set("shop-users", nu);
    // keep session in sync if the current user was updated
    if (user && user.type === "user") {
      const updated = nu.find(u => u.id === user.id);
      if (updated) { const sess = { ...updated, type:"user" }; setUserRaw(sess); await db.set("shop-session", sess); }
    }
  }, [user]);

  const setUser = useCallback(async v => { setUserRaw(v); await db.set("shop-session", v); }, []);

  /* ── Boot: load everything from persistent storage ── */
  useEffect(() => {
    (async () => {
      const [p, c, a, u, o, ca, sess] = await Promise.all([
        db.get("shop-products"), db.get("shop-categories"), db.get("shop-admins"),
        db.get("shop-users"),    db.get("shop-orders"),     db.get("shop-cart"),
        db.get("shop-session"),
      ]);
      setProductsRaw(p   || DEF_PRODS);
      setCategoriesRaw(c || DEF_CATS);
      setAdminsRaw(a     || []);
      setUsersRaw(u      || []);
      setOrdersRaw(o     || []);
      setCartRaw(ca      || []);
      if (sess) setUserRaw(sess);
      setLoaded(true);
    })();
  }, []);

  /* ── Login ── */
  const handleLogin = useCallback(async (phone, password) => {
    if (phone === SUPER_ADMIN.phone && password === SUPER_ADMIN.password) {
      const sess = { ...SUPER_ADMIN, type:"admin" };
      await setUser(sess); setAuthOpen(false); setPage("admin"); return { ok:true };
    }
    const adms = await db.get("shop-admins") || [];
    const adm  = adms.find(a => a.phone === phone && a.password === password);
    if (adm) {
      const sess = { ...adm, type:"admin" };
      await setUser(sess); setAuthOpen(false); setPage("admin"); return { ok:true };
    }
    const all = await db.get("shop-users") || [];
    const usr = all.find(u => u.phone === phone && u.password === password);
    if (usr) {
      const sess = { ...usr, type:"user" };
      await setUser(sess); setAuthOpen(false); return { ok:true };
    }
    return { error:"Numéro ou mot de passe incorrect." };
  }, [setUser]);

  /* ── Register (two-phase: check → create) ── */
  const handleRegister = useCallback(async (action, phone, name, password) => {
    if (action === "check") {
      if (phone === SUPER_ADMIN.phone) return { error:"Ce numéro est réservé." };
      const adms = await db.get("shop-admins") || [];
      if (adms.find(a => a.phone === phone)) return { error:"Ce numéro est réservé." };
      const all = await db.get("shop-users") || [];
      if (all.find(u => u.phone === phone)) return { error:"Un compte existe déjà avec ce numéro." };
      return { ok:true };
    }
    if (action === "create") {
      const all = await db.get("shop-users") || [];
      const newUser = { id:genId(), name, phone, password, isOptionL:false, createdAt:new Date().toISOString() };
      const updated = [...all, newUser];
      setUsersRaw(updated); await db.set("shop-users", updated);
      const sess = { ...newUser, type:"user" };
      await setUser(sess); setAuthOpen(false); return { ok:true };
    }
  }, [setUser]);

  const handleLogout = useCallback(async () => {
    await setUser(null); setPage("shop"); setView("home");
  }, [setUser]);

  const addToCart = useCallback(product => {
    setCartRaw(prev => {
      const ex = prev.find(i => i.id === product.id);
      const nc = ex ? prev.map(i => i.id === product.id ? { ...i, qty:i.qty+1 } : i) : [...prev, { ...product, qty:1 }];
      db.set("shop-cart", nc);
      return nc;
    });
  }, []);

  /* ── Loading screen ── */
  if (!loaded) return (
    <div style={{ minHeight:"100vh", background:"#080C10", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:"16px" }}>
      <GS />
      <span className="sp" style={{ width:"24px", height:"24px" }} />
      <span style={{ fontFamily:"'Syne',sans-serif", color:TEAL, fontSize:"11px", letterSpacing:".18em", textTransform:"uppercase" }}>Chargement...</span>
    </div>
  );

  /* ── Route: Site X ── */
  if (page === "delivery") {
    if (!user || !user.isOptionL) { setTimeout(() => setPage("shop"), 0); return null; }
    return (<><GS /><SiteX orders={orders} onBack={() => setPage("shop")} /></>);
  }

  /* ── Route: Admin ── */
  if (page === "admin") {
    if (!user || user.type !== "admin") { setTimeout(() => setPage("shop"), 0); return null; }
    return (<><GS />
      <AdminDash
        products={products}   setProducts={setProducts}
        categories={categories} setCategories={setCategories}
        admins={admins}       setAdmins={setAdmins}
        users={users}         setUsers={setUsers}
        orders={orders}       setOrders={setOrders}
        adminUser={user}      onLogout={handleLogout}
        onBack={() => setPage("shop")} />
    </>);
  }

  /* ── Route: Account ── */
  if (page === "account") {
    if (!user || user.type !== "user") { setTimeout(() => setPage("shop"), 0); return null; }
    return (<>
      <GS />
      <Navbar cats={categories} selCat={selCat} setSelCat={setSelCat} setView={v => { setView(v); setPage("shop"); }} cart={cart} setCartOpen={setCartOpen} sq={sq} setSq={setSq} setPage={setPage} user={user} onAuthOpen={() => setAuthOpen(true)} />
      <AccountPage user={user} orders={orders} onLogout={handleLogout} setPage={setPage} />
      {cartOpen    && <Cart cart={cart} setCart={setCart} setCartOpen={setCartOpen} setCheckout={setCheckout} user={user} onAuthOpen={() => setAuthOpen(true)} />}
      {checkout    && <Checkout cart={cart} setCart={setCart} setCheckout={setCheckout} orders={orders} setOrders={setOrders} user={user} />}
    </>);
  }

  /* ── Route: Shop (default) ── */
  return (<>
    <GS />
    <Navbar cats={categories} selCat={selCat} setSelCat={setSelCat} setView={setView} cart={cart} setCartOpen={setCartOpen} sq={sq} setSq={setSq} setPage={setPage} user={user} onAuthOpen={() => setAuthOpen(true)} />
    {view === "home" && <Hero setView={setView} setSelCat={setSelCat} />}
    <PGrid products={products} selCat={view === "home" ? null : selCat} sq={view === "home" ? "" : sq}
      onAdd={addToCart} onSel={(p, i) => { setSelProd(p); setSelIdx(i); }}
      user={user} onAuthOpen={() => setAuthOpen(true)} />
    {view === "home" && <Footer />}
    {selProd   && <PModal product={selProd} idx={selIdx} onClose={() => setSelProd(null)} onAdd={addToCart} user={user} onAuthOpen={() => { setSelProd(null); setAuthOpen(true); }} />}
    {cartOpen  && <Cart cart={cart} setCart={setCart} setCartOpen={setCartOpen} setCheckout={setCheckout} user={user} onAuthOpen={() => { setCartOpen(false); setAuthOpen(true); }} />}
    {checkout  && <Checkout cart={cart} setCart={setCart} setCheckout={setCheckout} orders={orders} setOrders={setOrders} user={user} />}
    {authOpen  && <AuthModal onClose={() => setAuthOpen(false)} onLogin={handleLogin} onRegister={handleRegister} />}
  </>);
}
