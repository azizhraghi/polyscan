import { useState, useEffect } from "react";
import {
  LayoutDashboard, Camera, Target, MapPin, Bell, FileText,
  Settings, Wifi, Activity, Play, Pause, Square,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  Download, Eye, RotateCcw, CheckCircle, Info, AlertTriangle,
  Battery, Navigation
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
  { id:"control",   label:"Contrôle",   icon:Settings        },
];

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:"#060d1c", surface:"#0b1528", card:"#0f1e35", border:"#192d4a",
  accent:"#22d3ee", text:"#ccdaeb", muted:"#46607a",
  danger:"#ef4444", warning:"#f59e0b", success:"#10b981", info:"#60a5fa",
};

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
  return <p style={{fontSize:13,color:C.text,fontWeight:600,marginBottom:14}}>{children}</p>;
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
  return (
    <div style={{display:"flex",flexDirection:"column",gap:18}}>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
        <Stat label="Surface inspectée" value="247" unit="m²"  Icon={Navigation} color={C.accent}/>
        <Stat label="Défauts détectés"  value="9"   unit=""    Icon={Target}      color={C.danger}/>
        <Stat label="Batterie"          value={Math.round(battery)} unit="%" Icon={Battery} color={battery<20?C.danger:C.success}/>
        <Stat label="Uptime"            value={fmt(uptime)}    unit="" Icon={Activity} color="#a78bfa"/>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:14}}>
        <Card>
          <CardTitle>Défauts cumulés dans le temps</CardTitle>
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={TIMELINE} margin={{top:0,right:0,left:-22,bottom:0}}>
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
        </Card>
        <Card>
          <CardTitle>Répartition par type</CardTitle>
          <ResponsiveContainer width="100%" height={175}>
            <BarChart data={TYPE_DATA} layout="vertical" margin={{top:0,right:0,left:-12,bottom:0}}>
              <XAxis type="number" tick={{fill:C.muted,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="name" tick={{fill:"#7a9bb5",fontSize:10}} axisLine={false} tickLine={false} width={76}/>
              <Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,color:C.text,fontSize:12}}/>
              <Bar dataKey="n" radius={4} fill={C.accent} name="Nb."/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card>
        <CardTitle>Derniers défauts détectés</CardTitle>
        {DEFECTS.slice(0,4).map((d,i)=>(
          <div key={d.id} style={{display:"flex",alignItems:"center",gap:16,padding:"9px 0",borderBottom:i<3?`1px solid ${C.border}22`:"none"}}>
            <span style={{fontSize:11,color:C.muted,width:36,flexShrink:0}}>{d.time}</span>
            <SevBadge s={d.sev}/>
            <span style={{fontSize:13,color:C.text,flex:1}}>{d.type}</span>
            <span style={{fontSize:12,color:C.muted}}>{d.surface}</span>
            <span style={{fontSize:12,color:C.accent,fontFamily:"monospace"}}>Zone {d.zone}</span>
            <span style={{fontSize:12,color:C.muted}}>Conf. {d.conf}%</span>
          </div>
        ))}
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

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN APP
// ══════════════════════════════════════════════════════════════════════════════
export default function PolyScan() {
  const [page,setPage]         = useState("dashboard");
  const [battery,setBattery]   = useState(25);
  const [uptime,setUptime]     = useState(3421);
  const [collapsed,setCollapsed]= useState(false);
  const [unread,setUnread]     = useState(2);

  useEffect(()=>{
    const t = setInterval(()=>{ setBattery(b=>Math.max(0,b-0.004)); setUptime(u=>u+1); },1000);
    return ()=>clearInterval(t);
  },[]);

  const goTo = id => { setPage(id); if(id==="alerts") setUnread(0); };
  const W = collapsed ? 52 : 222;

  return (
    <div style={{fontFamily:"system-ui,-apple-system,sans-serif",minHeight:660,display:"flex",background:C.bg,color:C.text}}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .ps-nav:hover { background: #0f1e35 !important; color: #ccdaeb !important; }
        .ps-icon-btn:hover { background: #0f1e35 !important; color: #ccdaeb !important; }
      `}</style>

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
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <header style={{height:56,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <button onClick={()=>setCollapsed(c=>!c)} style={{background:"none",border:"none",cursor:"pointer",color:C.muted,display:"flex",flexDirection:"column",gap:3.5,padding:2}}>
              {[0,1,2].map(i=><span key={i} style={{display:"block",width:16,height:1.5,background:"currentColor",borderRadius:1}}/>)}
            </button>
            <span style={{fontSize:14,fontWeight:600,color:C.text}}>{NAV.find(n=>n.id===page)?.label}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:20,fontSize:12,color:C.muted}}>
            <span><span style={{color:C.accent}}>●</span> WiFi 5GHz</span>
            <span>Ping 12 ms</span>
            <span style={{color:C.border}}>│</span>
            <span style={{color:C.text,fontWeight:500}}>Session active</span>
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
        </main>
      </div>
    </div>
  );
}