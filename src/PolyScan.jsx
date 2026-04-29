import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard, Camera, Target, MapPin, Bell, FileText,
  Settings, Wifi, Activity, Play, Pause, Square,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Download, Eye, RotateCcw, CheckCircle, Info, AlertTriangle,
  Battery, Navigation, Upload, Search, Zap, ShieldAlert, Clock, Trash2, Sun, Moon, X, Smartphone
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from "recharts";

import logo from "./assets/logo.png";

const LOGO_SRC = logo;


const DEFECTS = [
  { id:1, type:"Fissure",     sev:"élevée",  zone:"A-3", time:"14:32", conf:94, surface:"Mur Nord",  size:"12 cm"  },
  { id:2, type:"Humidité",    sev:"moyenne",  zone:"B-1", time:"14:28", conf:87, surface:"Sol",        size:"0.4 m²" },
  { id:3, type:"Écaillage",   sev:"faible",   zone:"A-1", time:"14:15", conf:91, surface:"Mur Est",    size:"8 cm²"  },
  { id:4, type:"Corrosion",   sev:"élevée",   zone:"C-2", time:"13:58", conf:96, surface:"Structure",  size:"25 cm²" },
  { id:5, type:"Fissure",     sev:"faible",   zone:"B-3", time:"13:45", conf:82, surface:"Plafond",    size:"6 cm"   },
  { id:6, type:"Dégradation", sev:"moyenne",  zone:"C-1", time:"13:30", conf:89, surface:"Mur Ouest",  size:"15 cm²" },
];
const ALERTS = [
  { id:1, type:"danger",  text:"Fissure critique détectée — Zone A-3",         time:"14:32" },
  { id:2, type:"warning", text:"Batterie faible — retour à la base conseillé", time:"14:20" },
  { id:3, type:"info",    text:"Inspection Zone B complétée avec succès",       time:"14:10" },
  { id:4, type:"danger",  text:"Corrosion sévère détectée — Zone C-2",         time:"13:58" },
  { id:5, type:"success", text:"Rapport d'inspection automatique généré",       time:"13:30" },
  { id:6, type:"info",    text:"Connexion WiFi stable — Signal: -45 dBm",      time:"13:00" },
];
const TIMELINE = [
  { t:"13:00",d:0 },{ t:"13:15",d:1 },{ t:"13:30",d:3 },
  { t:"13:45",d:4 },{ t:"14:00",d:6 },{ t:"14:15",d:7 },{ t:"14:30",d:9 },
];
const TYPE_DATA = [
  { name:"Fissure",n:2 },{ name:"Humidité",n:1 },{ name:"Écaillage",n:1 },
  { name:"Corrosion",n:2 },{ name:"Dégradation",n:1 },
];
const REPORTS = [
  { id:1, name:"Rapport Zone A",         date:"28/03/2026  14:32", defects:3,  pages:8  },
  { id:2, name:"Rapport Zone B",         date:"28/03/2026  14:10", defects:2,  pages:6  },
  { id:3, name:"Session complète — J-1", date:"27/03/2026  17:45", defects:11, pages:22 },
];
const ZONES_DEF = [
  { id:"A-1",defects:1,sev:"faible"  },{ id:"A-2",defects:0,sev:null       },{ id:"A-3",defects:2,sev:"élevée"  },
  { id:"B-1",defects:1,sev:"moyenne" },{ id:"B-2",defects:0,sev:null       },{ id:"B-3",defects:1,sev:"faible"  },
  { id:"C-1",defects:1,sev:"moyenne" },{ id:"C-2",defects:2,sev:"élevée"  },{ id:"C-3",defects:0,sev:null       },
];
const NAV = [
  { id:"dashboard", label:"Dashboard",   icon:LayoutDashboard },
  { id:"live",      label:"Flux Live",   icon:Camera          },
  { id:"defects",   label:"Défauts",     icon:Target          },
  { id:"map",       label:"Carte Zones", icon:MapPin          },
  { id:"alerts",    label:"Alertes",     icon:Bell            },
  { id:"reports",   label:"Rapports",    icon:FileText        },
  { id:"control",   label:"Contrôle",    icon:Settings        },
  { id:"analyse",   label:"Analyse IA",  icon:Search          },
  { id:"mobile",    label:"Scanner Mobile", icon:Smartphone    },
];

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:"#060d1c", surface:"#0b1528", card:"#0f1e35", border:"#192d4a",
  accent:"#22d3ee", text:"#ccdaeb", muted:"#46607a",
  danger:"#ef4444", warning:"#f59e0b", success:"#10b981", info:"#60a5fa",
};

// ── Toast notification system ───────────────────────────────────────────────
let _toastId = 0;
function useToast() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((msg, type = "success") => {
    const id = ++_toastId;
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  const remove = useCallback((id) => setToasts(t => t.filter(x => x.id !== id)), []);
  return { toasts, add, remove };
}

function ToastContainer({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", top: 16, right: 16, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
      {toasts.map((t) => {
        const colors = t.type === "success" ? { bg: "#052e16", border: "#065f46", color: "#34d399", icon: <CheckCircle size={14}/> }
          : t.type === "error" ? { bg: "#2d0808", border: "#7f1d1d", color: "#f87171", icon: <AlertTriangle size={14}/> }
          : { bg: "#0c1a2e", border: "#192d4a", color: "#22d3ee", icon: <Info size={14}/> };
        return (
          <div key={t.id} style={{
            display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
            borderRadius: 10, background: colors.bg, border: `1px solid ${colors.border}`,
            color: colors.color, fontSize: 13, fontWeight: 500, pointerEvents: "auto",
            animation: "toastIn 0.3s ease-out", boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
            minWidth: 280, backdropFilter: "blur(8px)",
          }}>
            {colors.icon}
            <span style={{ flex: 1 }}>{t.msg}</span>
            <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", color: colors.color, cursor: "pointer", padding: 2, display: "flex", opacity: 0.6 }}>
              <X size={12}/>
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
const sevStyle = s => ({
  display:"inline-flex", alignItems:"center", fontSize:11,
  padding:"2px 8px", borderRadius:9999, fontWeight:600,
  ...(s==="élevée"  ? {background:"#2d0808",color:"#f87171",border:"1px solid #7f1d1d"} :
      s==="moyenne" ? {background:"#2d1500",color:"#fbbf24",border:"1px solid #78350f"} :
                      {background:"#052e16",color:"#34d399",border:"1px solid #065f46"}),
});
const alertMeta = t =>
  t==="danger"  ? {bg:"#1a0808",border:"#7f1d1d",icon:<AlertTriangle size={14} color="#f87171" style={{flexShrink:0}}/>} :
  t==="warning" ? {bg:"#1a1000",border:"#78350f",icon:<AlertTriangle size={14} color="#fbbf24" style={{flexShrink:0}}/>} :
  t==="success" ? {bg:"#041912",border:"#065f46",icon:<CheckCircle   size={14} color="#34d399" style={{flexShrink:0}}/>} :
                  {bg:"#060f1a",border:"#1e3a5f",icon:<Info          size={14} color="#60a5fa" style={{flexShrink:0}}/>};

function SevBadge({s}) { return <span style={sevStyle(s)}>{s}</span>; }

function Card({children, style={}}) {
  return <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16,...style}}>{children}</div>;
}

function CardTitle({children}) {
  return <div style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:14}}>{children}</div>;
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function Stat({label,value,unit,Icon,color=C.accent}) {
  return (
    <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
        <span style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.07em"}}>{label}</span>
        <Icon size={14} color={color} style={{opacity:0.6}}/>
      </div>
      <div style={{display:"flex",alignItems:"baseline",gap:4}}>
        <span style={{fontSize:22,fontWeight:700,color}}>{value}</span>
        {unit && <span style={{fontSize:11,color:C.muted}}>{unit}</span>}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  PAGES
// ══════════════════════════════════════════════════════════════════════════════

function Dashboard({battery,uptime}) {
  const pad = n => String(n).padStart(2,"0");
  const fmt = s => `${pad(Math.floor(s/3600))}:${pad(Math.floor(s%3600/60))}:${pad(s%60)}`;

  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetch("/api/stats").then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const totalAnalyses = stats?.total_analyses ?? 0;
  const totalDefects  = stats?.total_defects ?? 0;
  const timeline      = stats?.timeline?.length ? stats.timeline : TIMELINE;
  const typeData      = stats?.type_data?.length ? stats.type_data : TYPE_DATA;
  const recentDefects = stats?.recent_defects ?? [];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <Stat label="Images analysées" value={totalAnalyses} unit=""   Icon={Navigation} color={C.accent}/>
        <Stat label="Défauts détectés"  value={totalDefects}  unit=""   Icon={Target}     color={totalDefects>0?C.danger:C.success}/>
        <Stat label="Batterie"          value={Math.round(battery)} unit="%" Icon={Battery} color={battery<20?C.danger:C.success}/>
        <Stat label="Uptime"            value={fmt(uptime)}    unit="" Icon={Activity} color="#a78bfa"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <Card>
          <CardTitle>Défauts cumulés dans le temps</CardTitle>
          {timeline.length > 0 ? (
            <ResponsiveContainer width="100%" height={175}>
              <AreaChart data={timeline} margin={{top:0,right:0,left:-22,bottom:0}}>
                <defs>
                  <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={C.accent} stopOpacity={0.35}/>
                    <stop offset="95%" stopColor={C.accent} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:C.muted,fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/>
                <Area type="monotone" dataKey="d" stroke={C.accent} strokeWidth={2} fill="url(#ag)" dot={false} name="Défauts"/>
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{height:175,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13}}>
              Lancez des analyses pour voir le graphique
            </div>
          )}
        </Card>
        <Card>
          <CardTitle>Répartition par type</CardTitle>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={typeData} layout="vertical" margin={{top:0,right:0,left:-12,bottom:0}}>
                <XAxis type="number" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{fill:"#7a9bb5",fontSize:10}} axisLine={false} tickLine={false} width={76}/>
                <Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/>
                <Bar dataKey="n" radius={4} fill={C.accent} name="Nb."/>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{height:175,display:"flex",alignItems:"center",justifyContent:"center",color:C.muted,fontSize:13}}>
              Aucune donnée
            </div>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle>Derniers défauts détectés</CardTitle>
        {recentDefects.length > 0 ? recentDefects.map((d,i)=> {
          const sevKey = d.severity === "Faible" ? "faible" : d.severity === "Moyenne" ? "moyenne" : "élevée";
          return (
            <div key={i} style={{display:"flex",alignItems:"center",gap:16,padding:"9px 0",borderBottom:i<recentDefects.length-1?`1px solid ${C.border}22`:"none"}}>
              <span style={{fontSize:11,color:C.muted,width:36,flexShrink:0}}>{d.time}</span>
              <SevBadge s={sevKey}/>
              <span style={{fontSize:13,color:C.text,flex:1}}>{d.type}</span>
              <span style={{fontSize:12,color:C.muted}}>{d.filename}</span>
              <span style={{fontSize:12,color:C.muted}}>Conf. {d.confidence}%</span>
            </div>
          );
        }) : (
          <div style={{textAlign:"center",padding:"28px 0",color:C.muted,fontSize:13}}>
            Aucun défaut détecté. Lancez une analyse IA !
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Live Feed ─────────────────────────────────────────────────────────────────
function LiveFeed() {
  const [active,setActive] = useState(true);
  const [scanY,setScanY]   = useState(0);
  useEffect(()=>{
    if(!active) return;
    const t = setInterval(()=>setScanY(y=>(y+1.5)%100),25);
    return ()=>clearInterval(t);
  },[active]);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:active?"#ef4444":"#46607a"}}/>
          <span style={{fontSize:12,color:active?"#ef4444":"#46607a",fontWeight:700,letterSpacing:"0.05em"}}>{active?"● LIVE":"⏸ PAUSÉ"}</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={()=>setActive(a=>!a)} style={{display:"flex",alignItems:"center",gap:6,background:C.card,border:`1px solid ${C.border}`,color:C.text,fontSize:12,padding:"6px 12px",borderRadius:8,cursor:"pointer"}}>
            {active?<><Pause size={12}/> Pause</>:<><Play size={12}/> Reprendre</>}
          </button>
          <button style={{display:"flex",alignItems:"center",gap:6,background:C.card,border:`1px solid ${C.border}`,color:C.text,fontSize:12,padding:"6px 12px",borderRadius:8,cursor:"pointer"}}>
            <Download size={12}/> Capturer
          </button>
        </div>
      </div>

      <div style={{position:"relative",background:"#020810",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden",aspectRatio:"16/9"}}>
        <svg style={{position:"absolute",inset:0,width:"100%",height:"100%"}}>
          <defs>
            <pattern id="g" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0L0 0 0 32" fill="none" stroke="#0c1a2e" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)"/>
          {/* Simulated defect bounding boxes */}
          <rect x="14%" y="11%" width="29%" height="36%" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="5 3"/>
          <rect x="14%" y="9.5%" width="80" height="16" rx="3" fill="#ef4444"/>
          <text x="15.5%" y="18%" fill="white" fontSize="9" fontFamily="monospace" dominantBaseline="middle">FISSURE 94%</text>
          <rect x="58%" y="43%" width="22%" height="25%" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="5 3"/>
          <rect x="58%" y="41.5%" width="78" height="16" rx="3" fill="#2563eb"/>
          <text x="59.5%" y="50%" fill="white" fontSize="9" fontFamily="monospace" dominantBaseline="middle">HUMIDITÉ 87%</text>
          {/* Scan line */}
          {active && <line x1="0" y1={`${scanY}%`} x2="100%" y2={`${scanY}%`} stroke={C.accent} strokeWidth={1} opacity={0.3}/>}
          {/* Corner brackets */}
          {[[5,5],[91,5],[5,88],[91,88]].map(([cx,cy],i)=>(
            <g key={i}>
              <line x1={`${cx}%`} y1={`${cy+2.5}%`} x2={`${cx}%`} y2={`${cy}%`} stroke={C.accent} strokeWidth={1.5}/>
              <line x1={`${cx}%`} y1={`${cy}%`} x2={`${cx+2}%`} y2={`${cy}%`} stroke={C.accent} strokeWidth={1.5}/>
            </g>
          ))}
        </svg>
        <div style={{position:"absolute",top:10,left:10,background:"rgba(0,0,0,0.75)",borderRadius:6,padding:"4px 10px",fontSize:11,fontFamily:"monospace",color:C.accent}}>
          CAM-01 · 1920×1080 · 30 fps
        </div>
        <div style={{position:"absolute",bottom:10,right:10,background:"rgba(0,0,0,0.75)",borderRadius:6,padding:"4px 10px",fontSize:11,fontFamily:"monospace",color:C.muted}}>
          Zone A-3 · IA {active?"ACTIVE":"INACTIVE"}
        </div>
      </div>

      <Card>
        <CardTitle>Détections actives</CardTitle>
        {[{label:"Fissure structurelle",conf:94,color:"#ef4444",zone:"A-3"},{label:"Humidité de surface",conf:87,color:"#60a5fa",zone:"A-3"}].map((d,i)=>(
          <div key={i} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i===0?`1px solid ${C.border}`:""} }>
            <div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/>
            <span style={{fontSize:13,color:C.text,flex:1}}>{d.label}</span>
            <span style={{fontSize:11,color:C.muted}}>Zone {d.zone}</span>
            <span style={{fontSize:11,color:d.color,fontWeight:600}}>Conf. {d.conf}%</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Defects ───────────────────────────────────────────────────────────────────
function DefectsPage() {
  const [filter,setFilter] = useState("tous");
  const shown = filter==="tous" ? DEFECTS : DEFECTS.filter(d=>d.sev===filter);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        {["tous","élevée","moyenne","faible"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{
            fontSize:12,padding:"6px 14px",borderRadius:8,cursor:"pointer",
            border:`1px solid ${filter===f?C.accent:C.border}`,
            background:filter===f?C.accent:"transparent",
            color:filter===f?"#060d1c":C.muted,
            fontWeight:filter===f?700:400,textTransform:"capitalize",transition:"all 0.15s",
          }}>{f}</button>
        ))}
        <span style={{marginLeft:"auto",fontSize:12,color:C.muted}}>{shown.length} résultat{shown.length>1?"s":""}</span>
      </div>
      <Card style={{padding:0,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",tableLayout:"fixed"}}>
          <thead>
            <tr style={{borderBottom:`1px solid ${C.border}`}}>
              {["ID","Type","Sévérité","Zone","Surface","Taille","Conf.","Heure"].map((h,i)=>(
                <th key={h} style={{textAlign:"left",padding:"10px 14px",fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:500,width:["6%","14%","11%","10%","17%","10%","14%","10%"][i]}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((d,i)=>(
              <tr key={d.id} style={{borderBottom:i<shown.length-1?`1px solid ${C.border}22`:"none",background:i%2===1?"#090f1e":"transparent"}}>
                <td style={{padding:"10px 14px",fontSize:11,color:C.muted,fontFamily:"monospace"}}>#{String(d.id).padStart(3,"0")}</td>
                <td style={{padding:"10px 14px",fontSize:13,color:C.text}}>{d.type}</td>
                <td style={{padding:"10px 14px"}}><SevBadge s={d.sev}/></td>
                <td style={{padding:"10px 14px",fontSize:12,color:C.accent,fontFamily:"monospace"}}>Zone {d.zone}</td>
                <td style={{padding:"10px 14px",fontSize:12,color:"#7a9bb5"}}>{d.surface}</td>
                <td style={{padding:"10px 14px",fontSize:12,color:"#7a9bb5"}}>{d.size}</td>
                <td style={{padding:"10px 14px"}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div style={{flex:1,background:C.surface,borderRadius:9999,height:4,minWidth:36}}>
                      <div style={{background:C.accent,borderRadius:9999,height:4,width:`${d.conf}%`}}/>
                    </div>
                    <span style={{fontSize:11,color:"#7a9bb5",flexShrink:0}}>{d.conf}%</span>
                  </div>
                </td>
                <td style={{padding:"10px 14px",fontSize:11,color:C.muted}}>{d.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ─── Map ───────────────────────────────────────────────────────────────────────
function MapPage() {
  const [sel,setSel] = useState(null);
  const bg  = z => !z.defects?"#0d1829":z.sev==="élevée"?"#2d0808":z.sev==="moyenne"?"#2d1500":"#052e16";
  const brd = z => !z.defects?C.border:z.sev==="élevée"?"#7f1d1d":z.sev==="moyenne"?"#78350f":"#065f46";
  const clr = z => !z.defects?C.muted:z.sev==="élevée"?"#f87171":z.sev==="moyenne"?"#fbbf24":"#34d399";
  const selZone = ZONES_DEF.find(z=>z.id===sel);
  const selDefs = DEFECTS.filter(d=>d.zone===sel);
  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 280px",gap:14}}>
      <Card>
        <CardTitle>Carte des zones inspectées</CardTitle>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
          {ZONES_DEF.map(z=>(
            <div key={z.id} onClick={()=>setSel(sel===z.id?null:z.id)} style={{
              background:bg(z),border:`1.5px solid ${sel===z.id?C.accent:brd(z)}`,
              borderRadius:10,padding:"18px 10px",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",gap:6,
              transition:"all 0.15s",outline:sel===z.id?`2px solid ${C.accent}44`:"none",outlineOffset:2,
            }}>
              <span style={{fontSize:13,color:C.text,fontWeight:600}}>Zone {z.id}</span>
              <span style={{fontSize:11,color:clr(z)}}>{z.defects===0?"RAS":`${z.defects} défaut${z.defects>1?"s":""}`}</span>
            </div>
          ))}
        </div>
        <div style={{display:"flex",gap:20,marginTop:18,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
          {[["#f87171","Sévère"],["#fbbf24","Modéré"],["#34d399","Faible"],[C.muted,"RAS"]].map(([color,label])=>(
            <div key={label} style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:C.muted}}>
              <div style={{width:10,height:10,borderRadius:3,background:color}}/>
              {label}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardTitle>Détail de zone</CardTitle>
        {selZone ? (
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:18,fontWeight:700,color:C.accent}}>Zone {selZone.id}</span>
              {selZone.defects>0 && <SevBadge s={selZone.sev}/>}
            </div>
            {[["Défauts",selZone.defects],["Statut","✓ Inspecté"]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                <span style={{color:C.muted}}>{k}</span>
                <span style={{color:C.text}}>{v}</span>
              </div>
            ))}
            {selDefs.length>0 ? selDefs.map(d=>(
              <div key={d.id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:12}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontSize:13,color:C.text,fontWeight:600}}>{d.type}</span>
                  <SevBadge s={d.sev}/>
                </div>
                <span style={{fontSize:11,color:C.muted}}>{d.surface} · {d.size} · Conf. {d.conf}%</span>
              </div>
            )) : (
              <div style={{background:"#05291640",border:"1px solid #065f46",borderRadius:8,padding:12,textAlign:"center",fontSize:13,color:"#34d399"}}>
                Aucun défaut détecté ✓
              </div>
            )}
          </div>
        ) : (
          <div style={{color:C.muted,fontSize:13,textAlign:"center",padding:"40px 0"}}>
            Cliquez sur une zone pour afficher ses détails
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Alerts ────────────────────────────────────────────────────────────────────
function AlertsPage() {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      {ALERTS.map(a=>{
        const {bg,border,icon} = alertMeta(a.type);
        return (
          <div key={a.id} style={{display:"flex",alignItems:"flex-start",gap:12,padding:"14px 16px",borderRadius:10,background:bg,border:`1px solid ${border}`}}>
            {icon}
            <div style={{flex:1}}>
              <p style={{fontSize:13,color:C.text,marginBottom:3}}>{a.text}</p>
              <p style={{fontSize:11,color:C.muted}}>{a.time}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Reports ───────────────────────────────────────────────────────────────────
function ReportsPage() {
  const [gen,setGen]   = useState(false);
  const [done,setDone] = useState(false);
  const generate = () => { setGen(true); setDone(false); setTimeout(()=>{setGen(false);setDone(true);},2300); };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <Card>
        <CardTitle>Générer un rapport</CardTitle>
        <p style={{fontSize:12,color:C.muted,marginBottom:16,lineHeight:1.7}}>
          Génère un rapport complet de la session d'inspection en cours : photos annotées, types de défauts, localisation, recommandations de réparation.
        </p>
        <button onClick={generate} disabled={gen} style={{
          display:"flex",alignItems:"center",gap:8,padding:"9px 18px",borderRadius:9,cursor:gen?"not-allowed":"pointer",
          background:gen?"#192d4a":C.accent,color:gen?C.muted:"#060d1c",
          border:"none",fontSize:13,fontWeight:700,transition:"all 0.2s",
        }}>
          {gen ? <RotateCcw size={13} style={{animation:"spin 1s linear infinite"}}/> : <FileText size={13}/>}
          {gen ? "Génération en cours…" : "Générer le rapport PDF"}
        </button>
        {done && (
          <div style={{display:"flex",alignItems:"center",gap:6,marginTop:12,fontSize:13,color:"#34d399"}}>
            <CheckCircle size={14}/> Rapport généré avec succès !
          </div>
        )}
      </Card>

      <Card>
        <CardTitle>Historique des rapports</CardTitle>
        {REPORTS.map((r,i)=>(
          <div key={r.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 0",borderBottom:i<REPORTS.length-1?`1px solid ${C.border}`:""} }>
            <div style={{width:36,height:36,borderRadius:8,background:C.surface,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <FileText size={14} color={C.accent}/>
            </div>
            <div style={{flex:1}}>
              <p style={{fontSize:13,color:C.text,marginBottom:2,fontWeight:500}}>{r.name}</p>
              <p style={{fontSize:11,color:C.muted}}>{r.date} · {r.pages} pages · {r.defects} défauts</p>
            </div>
            {[["Voir",Eye],["Télécharger",Download]].map(([label,Icon])=>(
              <button key={label} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:C.muted,background:C.surface,border:`1px solid ${C.border}`,padding:"5px 10px",borderRadius:7,cursor:"pointer"}}>
                <Icon size={11}/> {label}
              </button>
            ))}
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Control ───────────────────────────────────────────────────────────────────
function ControlPage() {
  const [mode,setMode]     = useState("auto");
  const [speed,setSpeed]   = useState(40);
  const [active,setActive] = useState(null);
  const [log,setLog]       = useState(["14:32:05 → Mode automatique actif","14:31:58 → Obstacle contourné","14:31:45 → Zone C-2 atteinte"]);

  const press = label => {
    if(mode!=="manual") return;
    setActive(label);
    const now = new Date().toLocaleTimeString();
    setLog(l => [`${now} → Commande: ${label}`,...l.slice(0,6)]);
    setTimeout(()=>setActive(null),160);
  };

  const Btn = ({Icon,label,size=20}) => {
    const on = active===label;
    const enabled = mode==="manual";
    return (
      <button onClick={()=>press(label)} style={{
        width:48,height:48,borderRadius:10,cursor:enabled?"pointer":"not-allowed",
        background:on?C.accent:enabled?C.card:"#080f1c",
        border:`1px solid ${on?C.accent:enabled?C.border:C.border+"44"}`,
        display:"flex",alignItems:"center",justifyContent:"center",
        color:on?"#060d1c":enabled?C.text:`${C.muted}66`,transition:"all 0.1s",
      }}>
        <Icon size={size}/>
      </button>
    );
  };

  return (
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Card>
          <CardTitle>Mode de fonctionnement</CardTitle>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
            {[{id:"auto",label:"Automatique",Icon:Navigation},{id:"manual",label:"Manuel",Icon:Settings},{id:"pause",label:"Pause",Icon:Pause}].map(m=>(
              <button key={m.id} onClick={()=>setMode(m.id)} style={{
                display:"flex",flexDirection:"column",alignItems:"center",gap:6,padding:"12px 6px",
                borderRadius:10,cursor:"pointer",border:`1px solid ${mode===m.id?C.accent:C.border}`,
                background:mode===m.id?`${C.accent}18`:"transparent",
                color:mode===m.id?C.accent:C.muted,fontSize:12,fontWeight:mode===m.id?600:400,
              }}>
                <m.Icon size={16}/> {m.label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Commandes directionnelles</CardTitle>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}>
            <Btn Icon={ChevronUp}    label="Avancer"/>
            <div style={{display:"flex",gap:8}}>
              <Btn Icon={ChevronLeft}  label="Gauche"/>
              <Btn Icon={Square}       label="Stop" size={16}/>
              <Btn Icon={ChevronRight} label="Droite"/>
            </div>
            <Btn Icon={ChevronDown}  label="Reculer"/>
          </div>
          {mode!=="manual" && (
            <p style={{fontSize:11,color:C.muted,textAlign:"center",marginTop:12}}>
              Passez en mode Manuel pour utiliser les commandes
            </p>
          )}
        </Card>

        <Card>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
            <p style={{fontSize:13,color:C.text,fontWeight:600}}>Vitesse</p>
            <span style={{fontSize:13,color:C.accent,fontWeight:700}}>{speed}%</span>
          </div>
          <input type="range" min={0} max={100} value={speed} onChange={e=>setSpeed(Number(e.target.value))} style={{width:"100%"}}/>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:C.muted,marginTop:4}}>
            <span>Lent</span><span>Rapide</span>
          </div>
        </Card>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        <Card>
          <CardTitle>État du système</CardTitle>
          {[
            ["Mode",    mode==="auto"?"Automatique":mode==="manual"?"Manuel":"Pause", mode==="pause"?C.warning:C.success],
            ["Position","Zone C-2",     C.accent],
            ["Vitesse", `${speed}%`,    "#a78bfa"],
            ["Connexion","WiFi 5GHz",   C.success],
            ["IA",      "Active · 85 ms/image", C.success],
            ["Capteurs","US + RGB-D actifs",     C.success],
          ].map(([k,v,color])=>(
            <div key={k} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${C.border}22`}}>
              <span style={{fontSize:12,color:C.muted}}>{k}</span>
              <span style={{fontSize:12,fontWeight:600,color}}>{v}</span>
            </div>
          ))}
        </Card>

        <Card style={{flex:1}}>
          <CardTitle>Journal des commandes</CardTitle>
          {log.map((entry,i)=>(
            <div key={i} style={{fontSize:11,color:i===0?C.accent:C.muted,fontFamily:"monospace",padding:"3px 0"}}>
              &gt; {entry}
            </div>
          ))}
        </Card>

        <button style={{
          width:"100%",padding:"14px 0",borderRadius:10,cursor:"pointer",
          background:"#1a0808",border:"1px solid #7f1d1d",
          color:"#f87171",fontSize:13,fontWeight:700,
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,
        }}>
          <Square size={14}/> ARRÊT D'URGENCE
        </button>
      </div>
    </div>
  );
}

// ─── Analyse IA (Roboflow Integration) ────────────────────────────────────────
function AnalyseIA({ addToast }) {
  const [file, setFile]             = useState(null);
  const [preview, setPreview]       = useState(null);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);
  const [error, setError]           = useState(null);
  const [dragOver, setDragOver]     = useState(false);
  const [history, setHistory]       = useState([]);
  const [viewingHistory, setViewingHistory] = useState(null);

  // Fetch history on mount
  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch("/api/history");
      if (res.ok) setHistory(await res.json());
    } catch {}
  }, []);
  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setResult(null);
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) handleFile(f);
  }, []);

  const onDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);

  const analyze = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur serveur");
      setResult(data);
      addToast("Analyse terminée avec succès !", "success");
      // Auto-save to history
      try {
        const sev = severityFor(data.defect_count);
        await fetch("/api/history", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            predictions: data.predictions,
            defect_count: data.defect_count,
            timestamp: data.timestamp,
            severity: sev.label,
            thumbnail: preview,
            filename: file?.name || "image.jpg",
          }),
        });
        fetchHistory();
      } catch {}
    } catch (err) {
      setError(err.message || "Impossible de contacter le serveur.");
      addToast("Échec de l'analyse.", "error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setFile(null); setPreview(null); setResult(null); setError(null); setViewingHistory(null);
  };

  const loadHistory = async (id) => {
    try {
      const res = await fetch(`/api/history/${id}`);
      if (!res.ok) return;
      const data = await res.json();
      setResult({ predictions: data.predictions, defect_count: data.defect_count, timestamp: data.timestamp });
      setPreview(data.thumbnail);
      setFile(null);
      setViewingHistory(id);
      setError(null);
    } catch {}
  };

  const deleteHistory = async (id, e) => {
    e.stopPropagation();
    try {
      await fetch(`/api/history/${id}`, { method: "DELETE" });
      fetchHistory();
      addToast("Analyse supprimée de l'historique.", "info");
      if (viewingHistory === id) reset();
    } catch {}
  };

  const severityFor = (count) =>
    count === 0 ? { label: "Aucun défaut", color: C.success, bg: "#052e16", border: "#065f46" }
    : count <= 2 ? { label: "Faible", color: "#34d399", bg: "#052e16", border: "#065f46" }
    : count <= 5 ? { label: "Moyenne", color: "#fbbf24", bg: "#2d1500", border: "#78350f" }
    :              { label: "Élevée", color: "#f87171", bg: "#2d0808", border: "#7f1d1d" };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Upload zone ────────────────────────────────── */}
      <Card>
        <CardTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Search size={14} color={C.accent} />
            Analyse d'image par Intelligence Artificielle
          </div>
        </CardTitle>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 16, lineHeight: 1.7 }}>
          Téléchargez une photo de mur ou de surface. L'IA Roboflow détectera automatiquement
          les fissures, l'humidité, l'écaillage, la corrosion et autres défauts structurels.
        </p>

        {!preview ? (
          <div
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            style={{
              border: `2px dashed ${dragOver ? C.accent : C.border}`,
              borderRadius: 14,
              padding: "48px 20px",
              textAlign: "center",
              background: dragOver ? `${C.accent}08` : C.surface,
              transition: "all 0.2s",
              cursor: "pointer",
            }}
            onClick={() => document.getElementById("ia-upload").click()}
          >
            <Upload size={32} color={C.accent} style={{ marginBottom: 12, opacity: 0.6 }} />
            <p style={{ fontSize: 14, color: C.text, fontWeight: 500, marginBottom: 6 }}>
              Glissez une image ici ou cliquez pour parcourir
            </p>
            <p style={{ fontSize: 11, color: C.muted }}>PNG, JPG, WEBP — max 10 Mo</p>
            <input
              id="ia-upload" type="file" accept="image/*" hidden
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.border}` }}>
              <img
                src={result?.visualized_image ? `data:image/jpeg;base64,${result.visualized_image}` : preview}
                alt="Preview"
                style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block", background: "#020810" }}
              />
              {loading && (
                <div style={{
                  position: "absolute", inset: 0,
                  background: "rgba(6,13,28,0.75)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14,
                }}>
                  <RotateCcw size={28} color={C.accent} style={{ animation: "spin 1s linear infinite" }} />
                  <span style={{ fontSize: 14, color: C.accent, fontWeight: 600 }}>Analyse en cours…</span>
                  <span style={{ fontSize: 11, color: C.muted }}>Envoi à Roboflow et traitement IA</span>
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={analyze} disabled={loading} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 22px",
                borderRadius: 9, cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "#192d4a" : C.accent, color: loading ? C.muted : "#060d1c",
                border: "none", fontSize: 13, fontWeight: 700, transition: "all 0.2s",
              }}>
                <Zap size={14} />
                {loading ? "Analyse en cours…" : "Analyser avec l'IA"}
              </button>
              <button onClick={reset} style={{
                display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
                borderRadius: 9, cursor: "pointer",
                background: C.card, color: C.muted, border: `1px solid ${C.border}`,
                fontSize: 13, fontWeight: 500,
              }}>
                <RotateCcw size={13} /> Nouvelle image
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Error ───────────────────────────────────────── */}
      {error && (
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
          borderRadius: 10, background: "#1a0808", border: "1px solid #7f1d1d",
        }}>
          <AlertTriangle size={16} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <p style={{ fontSize: 13, color: "#f87171", fontWeight: 600, marginBottom: 4 }}>Erreur d'analyse</p>
            <p style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{error}</p>
            <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              Vérifiez que le backend Flask est lancé sur le port 5000 (<code style={{ color: C.accent }}>python server.py</code>)
            </p>
          </div>
        </div>
      )}

      {/* ── Results ─────────────────────────────────────── */}
      {result && (
        <>
          {/* Summary stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            <Stat label="Défauts détectés" value={result.defect_count} unit="" Icon={Target} color={result.defect_count > 0 ? C.danger : C.success} />
            <Stat label="Prédictions" value={result.predictions?.length || 0} unit="" Icon={Eye} color={C.accent} />
            {(() => {
              const sev = severityFor(result.defect_count);
              return (
                <div style={{ background: sev.bg, border: `1px solid ${sev.border}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em" }}>Sévérité</span>
                    <ShieldAlert size={14} color={sev.color} style={{ opacity: 0.6 }} />
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 700, color: sev.color }}>{sev.label}</span>
                </div>
              );
            })()}
          </div>

          {/* Predictions table */}
          {result.predictions?.length > 0 && (
            <Card style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ padding: "14px 16px 0" }}>
                <CardTitle>Détails des prédictions</CardTitle>
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {["#", "Type", "Confiance", "Position X", "Position Y", "Largeur", "Hauteur"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.predictions.map((p, i) => (
                    <tr key={i} style={{ borderBottom: i < result.predictions.length - 1 ? `1px solid ${C.border}22` : "none", background: i % 2 === 1 ? "#090f1e" : "transparent" }}>
                      <td style={{ padding: "10px 14px", fontSize: 11, color: C.muted, fontFamily: "monospace" }}>#{String(i + 1).padStart(3, "0")}</td>
                      <td style={{ padding: "10px 14px", fontSize: 13, color: C.text, fontWeight: 500 }}>{p.class}</td>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div style={{ flex: 1, background: C.surface, borderRadius: 9999, height: 4, minWidth: 36 }}>
                            <div style={{ background: p.confidence >= 80 ? C.accent : C.warning, borderRadius: 9999, height: 4, width: `${p.confidence}%` }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#7a9bb5", flexShrink: 0 }}>{p.confidence}%</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#7a9bb5", fontFamily: "monospace" }}>{Math.round(p.x)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#7a9bb5", fontFamily: "monospace" }}>{Math.round(p.y)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#7a9bb5", fontFamily: "monospace" }}>{Math.round(p.width)}</td>
                      <td style={{ padding: "10px 14px", fontSize: 12, color: "#7a9bb5", fontFamily: "monospace" }}>{Math.round(p.height)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          {/* Download PDF + Timestamp */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button
              onClick={async () => {
                try {
                  const sev = severityFor(result.defect_count);
                  const res = await fetch("/api/report", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      predictions: result.predictions,
                      defect_count: result.defect_count,
                      timestamp: result.timestamp,
                      severity: sev.label,
                      image: preview,
                    }),
                  });
                  if (!res.ok) throw new Error("Erreur génération PDF");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `PolyScan_Rapport_${new Date().toISOString().slice(0,10)}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                } catch (err) {
                  alert("Erreur: " + err.message);
                }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 8, padding: "10px 20px",
                borderRadius: 9, cursor: "pointer",
                background: "linear-gradient(135deg, #22d3ee, #0ea5e9)",
                color: "#060d1c", border: "none", fontSize: 13, fontWeight: 700,
                transition: "all 0.2s", boxShadow: "0 2px 12px rgba(34,211,238,0.25)",
              }}
            >
              <Download size={14} /> Télécharger le rapport PDF
            </button>
            <span style={{ fontSize: 11, color: C.muted }}>
              Analysé le {new Date(result.timestamp).toLocaleString("fr-FR")}
            </span>
          </div>
        </>
      )}

      {/* ── History ─────────────────────────────────────── */}
      <Card>
        <CardTitle>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Clock size={14} color={C.accent} />
              Historique des analyses
            </div>
            {history.length > 0 && (
              <span style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>
                {history.length} analyse{history.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </CardTitle>

        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: C.muted, fontSize: 13 }}>
            Aucune analyse sauvegardée. Lancez une première analyse !
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {history.map((h, i) => {
              const isActive = viewingHistory === h.id;
              const sevColor = h.severity === "Faible" ? "#34d399" : h.severity === "Moyenne" ? "#fbbf24" : h.severity === "Élevée" ? "#f87171" : C.success;
              return (
                <div
                  key={h.id}
                  onClick={() => loadHistory(h.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "12px 14px", borderRadius: 10, cursor: "pointer",
                    background: isActive ? `${C.accent}12` : C.surface,
                    border: `1px solid ${isActive ? C.accent : C.border}`,
                    transition: "all 0.15s",
                  }}
                >
                  {/* Index */}
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: C.card, border: `1px solid ${C.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, fontWeight: 700, color: C.accent, flexShrink: 0,
                  }}>
                    #{i + 1}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {h.filename || "Image"}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {new Date(h.timestamp).toLocaleString("fr-FR")}
                    </div>
                  </div>

                  {/* Defect count */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "4px 10px", borderRadius: 8,
                    background: h.defect_count > 0 ? "#2d0808" : "#052e16",
                    border: `1px solid ${h.defect_count > 0 ? "#7f1d1d" : "#065f46"}`,
                  }}>
                    <Target size={11} color={h.defect_count > 0 ? "#f87171" : "#34d399"} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: h.defect_count > 0 ? "#f87171" : "#34d399" }}>
                      {h.defect_count}
                    </span>
                  </div>

                  {/* Severity badge */}
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 9999, fontWeight: 600,
                    color: sevColor,
                    background: h.severity === "Faible" ? "#052e16" : h.severity === "Moyenne" ? "#2d1500" : h.severity === "Élevée" ? "#2d0808" : "#052e16",
                    border: `1px solid ${h.severity === "Faible" ? "#065f46" : h.severity === "Moyenne" ? "#78350f" : h.severity === "Élevée" ? "#7f1d1d" : "#065f46"}`,
                  }}>
                    {h.severity}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={(e) => deleteHistory(h.id, e)}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: C.muted, padding: 4, borderRadius: 6, display: "flex",
                      transition: "color 0.15s",
                    }}
                    onMouseEnter={(e) => e.target.closest("button").style.color = "#f87171"}
                    onMouseLeave={(e) => e.target.closest("button").style.color = C.muted}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Mobile Scanner Page (QR Code + Instructions) ─────────────────────────────
function MobilePage() {
  const [ip, setIp] = useState(null);
  useEffect(() => {
    // Fetch real LAN IP from backend, fallback to window.location
    fetch("/api/network").then(r => r.json())
      .then(d => { if (d.ip) setIp(`${d.protocol || "https"}://${d.ip}:${d.port || 3000}`); })
      .catch(() => {
        const proto = window.location.protocol;
        const host = window.location.hostname;
        const port = window.location.port || "3000";
        setIp(`${proto}//${host}:${port}`);
      });
  }, []);

  const mobileUrl = ip ? `${ip}/#/mobile` : "";
  // QR code: black on white for maximum scannability
  const qrSrc = mobileUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(mobileUrl)}&bgcolor=ffffff&color=000000&margin=8` : "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <Card>
        <CardTitle>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Smartphone size={14} color={C.accent} />
            Scanner Mobile — Téléphone comme Robot
          </div>
        </CardTitle>
        <p style={{ fontSize: 12, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
          Utilisez votre téléphone comme capteur d'inspection. Scannez le QR code ci-dessous
          ou ouvrez le lien sur votre téléphone pour accéder à la caméra. Les résultats
          d'analyse apparaîtront en temps réel sur ce tableau de bord.
        </p>

        <div style={{ display: "flex", gap: 24, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* QR Code */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            {qrSrc ? (
              <img src={qrSrc} alt="QR Code" style={{ width: 180, height: 180, borderRadius: 12 }} className="no-invert" />
            ) : (
              <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 12 }}>Chargement...</div>
            )}
            <span style={{ fontSize: 11, color: C.muted, textAlign: "center" }}>Scannez avec votre téléphone</span>
          </div>

          {/* Instructions */}
          <div style={{ flex: 1, minWidth: 250, display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { step: "1", title: "Même réseau WiFi", desc: "Assurez-vous que votre téléphone et cet ordinateur sont sur le même réseau WiFi." },
              { step: "2", title: "Scannez le QR code", desc: "Ouvrez l'appareil photo de votre téléphone et scannez le QR code, ou entrez l'URL manuellement." },
              { step: "3", title: "Autorisez la caméra", desc: "Acceptez la demande d'accès à la caméra et à la localisation GPS." },
              { step: "4", title: "Inspectez !", desc: "Pointez la caméra vers les murs et surfaces à inspecter. Appuyez sur le bouton pour capturer et analyser." },
            ].map(({ step, title, desc }) => (
              <div key={step} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.accent}18`, border: `1px solid ${C.accent}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{step}</div>
                <div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginBottom: 3 }}>{title}</div>
                  <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* URL display */}
      <Card>
        <CardTitle>Lien direct</CardTitle>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px", fontFamily: "monospace", fontSize: 13, color: C.accent, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {mobileUrl || "Chargement..."}
          </div>
          <button
            onClick={() => { navigator.clipboard.writeText(mobileUrl); }}
            style={{ padding: "10px 16px", borderRadius: 8, background: C.accent, color: "#060d1c", border: "none", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
          >
            Copier
          </button>
        </div>
        <p style={{ fontSize: 11, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
          ⚠️ Le téléphone doit être connecté au même réseau WiFi que cet ordinateur.
          Si l'adresse est <code style={{ color: C.accent }}>localhost</code>, utilisez l'adresse IP de votre machine
          (ex: <code style={{ color: C.accent }}>192.168.x.x</code>).
        </p>
      </Card>

      {/* Architecture diagram */}
      <Card>
        <CardTitle>Architecture du système</CardTitle>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, flexWrap: "wrap", padding: "16px 0" }}>
          {[
            { icon: "📱", label: "Téléphone", sub: "Caméra + GPS" },
            { icon: "→", label: "", sub: "" },
            { icon: "🖥️", label: "Backend Flask", sub: "Port 5000" },
            { icon: "→", label: "", sub: "" },
            { icon: "☁️", label: "Roboflow IA", sub: "Détection défauts" },
            { icon: "→", label: "", sub: "" },
            { icon: "📊", label: "Dashboard", sub: "Résultats live" },
          ].map((item, i) =>
            item.label === "" ? (
              <div key={i} style={{ fontSize: 20, color: C.accent, padding: "0 12px" }}>{item.icon}</div>
            ) : (
              <div key={i} style={{ textAlign: "center", padding: "10px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, minWidth: 100 }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
                <div style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>{item.label}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{item.sub}</div>
              </div>
            )
          )}
        </div>
      </Card>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function PolyScan() {
  const [page,setPage]         = useState("dashboard");
  const [battery,setBattery]   = useState(25);
  const [uptime,setUptime]     = useState(3421);
  const [collapsed,setCollapsed]= useState(window.innerWidth < 768);
  const [isMobile,setIsMobile] = useState(window.innerWidth < 768);
  const [unread,setUnread]     = useState(2);
  const [theme, setTheme]      = useState("dark");
  const { toasts, add: addToast, remove: removeToast } = useToast();

  useEffect(()=>{
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if(mobile) setCollapsed(true);
    };
    window.addEventListener("resize", handleResize);
    const t = setInterval(()=>{ setBattery(b=>Math.max(0,b-0.004)); setUptime(u=>u+1); },1000);
    return ()=>{ clearInterval(t); window.removeEventListener("resize", handleResize); };
  },[]);

  const goTo = id => { 
    setPage(id); 
    if(id==="alerts") setUnread(0); 
    if(isMobile) setCollapsed(true);
  };
  const W = collapsed ? (isMobile ? 0 : 52) : 222;

  return (
    <div className={theme} style={{fontFamily:"system-ui,-apple-system,sans-serif",height:"100vh",display:"flex",background:C.bg,color:C.text,overflow:"hidden"}}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes toastIn { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        .ps-nav:hover { background: #0f1e35 !important; color: #ccdaeb !important; }
        .ps-icon-btn:hover { background: #0f1e35 !important; color: #ccdaeb !important; }
        
        /* Light mode invert hack */
        .light { filter: invert(1) hue-rotate(180deg); }
        .light img, .light svg, .light .recharts-surface, .light .no-invert { filter: invert(1) hue-rotate(180deg); }
        
        /* Mobile responsive adjustments */
        @media (max-width: 768px) {
          .grid-container { grid-template-columns: 1fr !important; }
          header { padding: 0 16px !important; }
        }
      `}</style>
      <ToastContainer toasts={toasts} remove={removeToast} />

      {/* ─ Sidebar ─ */}
      <aside style={{width:W,flexShrink:0,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",transition:"width 0.22s",overflow:"hidden"}}>
        <div style={{height:56,display:"flex",alignItems:"center",gap:10,padding:"0 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
          {!collapsed
            ? <img src={LOGO_SRC} alt="PolyScan" style={{height:28,objectFit:"contain",flexShrink:0}}/>
            : <img src={LOGO_SRC} alt="P" style={{width:28,height:28,objectFit:"contain",flexShrink:0}}/>
          }
        </div>

        <nav style={{flex:1,padding:"10px 7px",display:"flex",flexDirection:"column",gap:2}}>
          {NAV.map(({id,label,icon:Icon})=>{
            const active = page===id;
            return (
              <button key={id} onClick={()=>goTo(id)} className={active?"":"ps-nav"} style={{
                display:"flex",alignItems:"center",gap:10,padding:"9px 10px",
                borderRadius:8,border:"none",cursor:"pointer",width:"100%",
                background:active?C.accent:"transparent",
                color:active?"#050c1a":C.muted,fontWeight:active?700:400,fontSize:13,
                transition:"all 0.15s",overflow:"hidden",
              }}>
                <Icon size={15} style={{flexShrink:0}}/>
                {!collapsed && <span style={{flex:1,textAlign:"left",whiteSpace:"nowrap",overflow:"hidden"}}>{label}</span>}
                {!collapsed && id==="alerts" && unread>0 && (
                  <span style={{background:"#ef4444",color:"#fff",fontSize:10,borderRadius:9999,padding:"1px 5px",fontWeight:700}}>{unread}</span>
                )}
              </button>
            );
          })}
        </nav>

        {!collapsed && (
          <div style={{padding:10,borderTop:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{background:C.card,borderRadius:10,padding:"10px 12px"}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:7}}>
                <span style={{color:C.muted}}>Batterie</span>
                <span style={{color:battery<20?C.danger:C.success,fontWeight:700}}>{Math.round(battery)}%</span>
              </div>
              <div style={{background:"#0d1829",borderRadius:9999,height:4}}>
                <div style={{background:battery<20?C.danger:C.success,borderRadius:9999,height:4,width:`${battery}%`,transition:"width 1s"}}/>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.success}}/>
                <span style={{fontSize:11,color:C.muted}}>Robot connecté</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* ─ Main ─ */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
        {/* Mobile overlay */}
        {isMobile && !collapsed && (
          <div onClick={()=>setCollapsed(true)} style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.5)",zIndex:10}}/>
        )}
        
        <header style={{height:56,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <button onClick={()=>setCollapsed(c=>!c)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,display:"flex",flexDirection:"column",gap:3.5,padding:2}}>
              {[0,1,2].map(i=><span key={i} style={{display:"block",width:16,height:1.5,background:"currentColor",borderRadius:1}}/>)}
            </button>
            <span style={{fontSize:14,fontWeight:600,color:C.text}}>{NAV.find(n=>n.id===page)?.label}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:20,fontSize:12,color:C.muted}}>
            <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",display:"flex",alignItems:"center",padding:4}}>
              {theme === "dark" ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            {!isMobile && (
              <>
                <span><span style={{color:C.accent}}>●</span> WiFi 5GHz</span>
                <span>Ping 12 ms</span>
                <span style={{color:C.border}}>│</span>
                <span style={{color:C.text,fontWeight:500}}>Session active</span>
              </>
            )}
          </div>
        </header>

        <main style={{flex:1,overflow:"auto",padding:22}}>
          {page==="dashboard" && <Dashboard battery={battery} uptime={uptime}/>}
          {page==="live"      && <LiveFeed/>}
          {page==="defects"   && <DefectsPage/>}
          {page==="map"       && <MapPage/>}
          {page==="alerts"    && <AlertsPage/>}
          {page==="reports"   && <ReportsPage/>}
          {page==="control"   && <ControlPage/>}
          {page==="analyse"   && <AnalyseIA addToast={addToast}/>}
          {page==="mobile"    && <MobilePage/>}
        </main>
      </div>
    </div>
  );
}