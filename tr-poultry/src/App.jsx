import { useState, useEffect, useMemo, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, doc, collection, setDoc, getDoc, onSnapshot, writeBatch } from "firebase/firestore";

// ── Firebase config ──
const firebaseConfig = {
  apiKey: "AIzaSyCAinFd4FsgTS9WY-eSkLRRzVTEK0kCkWE",
  authDomain: "tr000515.firebaseapp.com",
  projectId: "tr000515",
  storageBucket: "tr000515.firebasestorage.app",
  messagingSenderId: "446334733181",
  appId: "1:446334733181:web:5abf97dac6df2f34e19a14",
  measurementId: "G-4B1H6MN24V"
};
const fbApp = initializeApp(firebaseConfig);
const fbAuth = getAuth(fbApp);
const fbDb = getFirestore(fbApp);

// ── Firestore helpers ──
// Each data collection stored as single doc (array) under /businesses/{uid}/data/{key}
async function fsSet(uid, key, val){
  try{ await setDoc(doc(fbDb,"businesses",uid,"data",key),{value:JSON.stringify(val)}); }catch(e){console.error("fsSet",key,e);}
}
async function fsGet(uid, key){
  try{ const d=await getDoc(doc(fbDb,"businesses",uid,"data",key)); return d.exists()?JSON.parse(d.data().value):null; }catch(e){return null;}
}
function fsListen(uid, key, cb){
  return onSnapshot(doc(fbDb,"businesses",uid,"data",key), snap=>{
    if(snap.exists()) try{ cb(JSON.parse(snap.data().value)); }catch(e){}
  });
}
async function fsSetConfig(uid, key, val){
  try{ await setDoc(doc(fbDb,"businesses",uid,"config",key),{value:JSON.stringify(val)}); }catch(e){}
}
async function fsGetConfig(uid, key){
  try{ const d=await getDoc(doc(fbDb,"businesses",uid,"config",key)); return d.exists()?JSON.parse(d.data().value):null; }catch(e){return null;}
}
function fsListenConfig(uid, key, cb){
  return onSnapshot(doc(fbDb,"businesses",uid,"config",key), snap=>{
    if(snap.exists()) try{ cb(JSON.parse(snap.data().value)); }catch(e){}
  });
}

const BREEDS=["ব্রয়লার","সোনালী","কক","লেয়ার","দেশি","অন্যান্য"];
const EXPENSE_CATS=["খাবার","ওষুধ","ভ্যাকসিন","কর্মী খরচ","বিদ্যুৎ","অন্যান্য"];
const PARTY_TYPES=["সরবরাহকারী","ক্রেতা","উভয়"];
const MED_FORMS=["Bottle","Tablet","Packet","Vial","Sachet"];
const MED_UNITS=["ml","gm","mg","litre","pcs"];

function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function today(){return new Date().toISOString().split("T")[0];}
function fmt(n){return "৳"+(Number(n)||0).toLocaleString("en-IN");}
function byUser(user){return{name:user?.name||"অজানা",role:user?.role||"",time:new Date().toISOString()};}
// persist/recall replaced by Firebase — see fsSet/fsGet above

const C={primary:"#C8651A",primaryDark:"#9E4D10",primaryLight:"#FFF3E8",green:"#2D6A4F",greenLight:"#E8F5F0",cream:"#FDF8F0",brown:"#5C3D1E",darkBrown:"#2C1810",border:"#E8D5C0",muted:"#999",red:"#C0392B",redLight:"#FDECEA",blue:"#1A5CA8",blueLight:"#EBF2FF"};
const font="'Hind Siliguri', sans-serif";
const iSt={width:"100%",padding:"0.65rem 0.85rem",border:`1.5px solid #E8D5C0`,borderRadius:"0.6rem",fontSize:"0.95rem",color:"#2C1810",background:"#FDF8F0",boxSizing:"border-box",fontFamily:font,outline:"none"};

// ── Shared UI ──────────────────────────────────────────────────
function Modal({title,onClose,children}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(30,10,0,0.55)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000}}>
      <div style={{background:"#fff",borderRadius:"1.25rem 1.25rem 0 0",padding:"1.5rem 1.25rem",width:"100%",maxWidth:560,maxHeight:"92vh",overflowY:"auto",boxShadow:"0 -8px 32px rgba(200,101,26,0.15)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.25rem"}}>
          <h3 style={{margin:0,color:C.darkBrown,fontSize:"1.1rem",fontWeight:800}}>{title}</h3>
          <button onClick={onClose} style={{background:"#F5E6D8",border:"none",borderRadius:"50%",width:32,height:32,cursor:"pointer",fontSize:"1rem",color:C.brown,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({label,children,hint}){
  return(
    <div style={{marginBottom:"0.85rem"}}>
      <label style={{display:"block",fontSize:"0.82rem",color:C.brown,marginBottom:"0.3rem",fontWeight:700}}>{label}</label>
      {children}
      {hint&&<div style={{fontSize:"0.75rem",color:C.muted,marginTop:"0.2rem"}}>{hint}</div>}
    </div>
  );
}
function Inp({value,onChange,type="text",placeholder,min}){
  return <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} min={min} style={iSt}/>;
}
function Sel({value,onChange,options}){
  return <select value={value} onChange={e=>onChange(e.target.value)} style={iSt}>{options.map(o=><option key={o.value??o} value={o.value??o}>{o.label??o}</option>)}</select>;
}
function SaveBtn({onClick,disabled,label="সংরক্ষণ করুন"}){
  return <button onClick={onClick} disabled={disabled} style={{width:"100%",padding:"0.8rem",background:disabled?"#D0C0B0":C.primary,color:"#fff",border:"none",borderRadius:"0.7rem",fontSize:"1rem",fontWeight:800,cursor:disabled?"not-allowed":"pointer",marginTop:"0.5rem",fontFamily:font}}>{label}</button>;
}
function Card({children,bg="#fff",style={}}){
  return <div style={{background:bg,borderRadius:"0.9rem",padding:"1.1rem 1.25rem",boxShadow:"0 2px 12px rgba(200,101,26,0.08)",marginBottom:"0.75rem",...style}}>{children}</div>;
}
function StatCard({label,value,icon,color,bg}){
  return(
    <div style={{background:bg||C.primaryLight,borderRadius:"0.9rem",padding:"0.9rem",textAlign:"center"}}>
      <div style={{fontSize:"1.5rem",marginBottom:"0.2rem"}}>{icon}</div>
      <div style={{fontSize:"0.72rem",color:"#777",marginBottom:"0.1rem"}}>{label}</div>
      <div style={{fontSize:"1rem",fontWeight:800,color:color||C.primary}}>{value}</div>
    </div>
  );
}
function SubTabs({tabs,active,onChange}){
  return(
    <div style={{display:"flex",gap:"0.4rem",marginBottom:"1rem",overflowX:"auto",paddingBottom:"0.1rem"}}>
      {tabs.map(([id,label])=>(
        <button key={id} onClick={()=>onChange(id)} style={{padding:"0.4rem 0.9rem",borderRadius:"2rem",border:"none",background:active===id?C.primary:"#F5E6D8",color:active===id?"#fff":C.brown,fontWeight:700,cursor:"pointer",fontSize:"0.82rem",fontFamily:font,whiteSpace:"nowrap",flexShrink:0}}>{label}</button>
      ))}
    </div>
  );
}
function AddBtn({onClick,label="যোগ করুন"}){
  return <button onClick={onClick} style={{background:C.primary,color:"#fff",border:"none",borderRadius:"2rem",padding:"0.45rem 1rem",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>+ {label}</button>;
}
function SectionHeader({title,action}){
  return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.85rem"}}><h2 style={{margin:0,color:C.darkBrown,fontSize:"1rem",fontWeight:800}}>{title}</h2>{action}</div>;
}
function fmtTime(iso){
  if(!iso)return"";
  try{
    const d=new Date(iso);
    const date=d.toLocaleDateString("bn-BD",{day:"2-digit",month:"2-digit",year:"numeric"});
    const time=d.toLocaleTimeString("bn-BD",{hour:"2-digit",minute:"2-digit",hour12:true});
    return `${date}, ${time}`;
  }catch(e){return iso.slice(0,16).replace("T"," ");}
}
function ProfitLossBar({income,expense,profit,label,showBreakdown}){
  const isLoss=profit<0;
  return(
    <div style={{background:isLoss?"#FFF0F0":C.greenLight,borderRadius:"0.75rem",padding:"0.75rem",border:`1.5px solid ${isLoss?"#FFCCCC":"#A8D8C0"}`,marginBottom:"0.75rem"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.5rem"}}>
        <span style={{fontWeight:800,fontSize:"0.85rem",color:C.darkBrown}}>{label}</span>
        <span style={{fontWeight:800,fontSize:"1.05rem",color:isLoss?C.red:C.green}}>{isLoss?"📉 লোকসান ":"📈 লাভ "}{fmt(Math.abs(profit))}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem"}}>
        <div style={{background:"#fff",borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
          <div style={{fontSize:"0.65rem",color:"#777"}}>মোট আয়</div>
          <div style={{fontWeight:800,color:C.green,fontSize:"0.9rem"}}>{fmt(income)}</div>
        </div>
        <div style={{background:"#fff",borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
          <div style={{fontSize:"0.65rem",color:"#777"}}>মোট খরচ</div>
          <div style={{fontWeight:800,color:C.primary,fontSize:"0.9rem"}}>{fmt(expense)}</div>
        </div>
      </div>
      {income>0&&expense>0&&<div style={{fontSize:"0.7rem",color:"#888",textAlign:"center",marginTop:"0.3rem"}}>মার্জিন: {((profit/income)*100).toFixed(1)}%</div>}
    </div>
  );
}
function AuditBadge({record}){
  if(!record?._by&&!record?._editedBy) return null;
  const lines=[];
  if(record._by){
    const i=record._by;
    lines.push({icon:"➕",label:"যোগ",name:i.name,role:i.role,time:i.time});
  }
  if(record._editedBy){
    const i=record._editedBy;
    lines.push({icon:"✏️",label:"সম্পাদনা",name:i.name,role:i.role,time:i.time});
  }
  return(
    <div style={{marginTop:"0.2rem"}}>
      {lines.map((l,i)=>(
        <div key={i} style={{fontSize:"0.6rem",color:"#aaa",lineHeight:1.4}}>
          {l.icon} {l.label}: <span style={{color:"#888",fontWeight:600}}>{l.name}</span>{l.role?` (${l.role})`:""} • {fmtTime(l.time)}
        </div>
      ))}
    </div>
  );
}

function DataTable({headers,rows,emptyMsg,onEdit,onDelete,records}){
  if(!rows.length) return <div style={{textAlign:"center",padding:"2rem 0",color:"#bbb",fontSize:"0.9rem"}}>{emptyMsg||"কোনো রেকর্ড নেই"}</div>;
  const hasActions=onEdit||onDelete;
  return(
    <div style={{overflowX:"auto"}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.8rem"}}>
        <thead><tr>
          {headers.map(h=><th key={h} style={{textAlign:"left",padding:"0.5rem 0.55rem",background:C.primaryLight,color:C.brown,fontWeight:700,borderBottom:`2px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>)}
          {hasActions&&<th style={{textAlign:"center",padding:"0.5rem 0.35rem",background:C.primaryLight,color:C.brown,fontWeight:700,borderBottom:`2px solid ${C.border}`,whiteSpace:"nowrap"}}>কাজ</th>}
        </tr></thead>
        <tbody>{rows.map((row,i)=>{
          const rec=records?.[i];
          return(
            <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":"#FEFAF5"}}>
              {row.map((cell,j)=><td key={j} style={{padding:"0.5rem 0.55rem",color:C.darkBrown,verticalAlign:"top"}}>
                {cell}
                {j===0&&rec&&<AuditBadge record={rec}/>}
              </td>)}
              {hasActions&&<td style={{padding:"0.35rem",textAlign:"center",whiteSpace:"nowrap",verticalAlign:"middle"}}>
                {onEdit&&<button onClick={()=>onEdit(rec||i)} style={{background:C.blueLight,color:C.blue,border:"none",borderRadius:"0.35rem",padding:"0.2rem 0.45rem",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",marginRight:"0.2rem",fontFamily:font}}>✏️</button>}
                {onDelete&&<button onClick={()=>onDelete(rec||i)} style={{background:C.redLight,color:C.red,border:"none",borderRadius:"0.35rem",padding:"0.2rem 0.45rem",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>🗑️</button>}
              </td>}
            </tr>
          );
        })}</tbody>
      </table>
    </div>
  );
}
function ConfirmModal({msg,onYes,onNo}){
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(30,10,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000,padding:"1.5rem"}}>
      <div style={{background:"#fff",borderRadius:"1.2rem",padding:"1.5rem",width:"100%",maxWidth:340,boxShadow:"0 8px 32px rgba(0,0,0,0.2)"}}>
        <div style={{fontSize:"2rem",textAlign:"center",marginBottom:"0.75rem"}}>🗑️</div>
        <div style={{textAlign:"center",fontWeight:700,color:C.darkBrown,marginBottom:"1.25rem",fontSize:"0.95rem"}}>{msg}</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
          <button onClick={onNo} style={{padding:"0.75rem",background:"#F5F5F5",border:"none",borderRadius:"0.65rem",fontWeight:700,fontSize:"0.9rem",cursor:"pointer",fontFamily:font,color:C.brown}}>বাতিল</button>
          <button onClick={onYes} style={{padding:"0.75rem",background:C.red,border:"none",borderRadius:"0.65rem",fontWeight:700,fontSize:"0.9rem",cursor:"pointer",fontFamily:font,color:"#fff"}}>হ্যাঁ, ডিলিট</button>
        </div>
      </div>
    </div>
  );
}
function PartySelector({parties,value,onChange,typeFilter,label,hint,onAddParty}){
  const [showNew,setShowNew]=useState(false);
  const [nf,setNf]=useState({name:"",phone:""});
  const filtered=parties.filter(p=>typeFilter==="supplier"?(p.type==="সরবরাহকারী"||p.type==="উভয়"):typeFilter==="customer"?(p.type==="ক্রেতা"||p.type==="উভয়"):true);
  function saveNew(){
    if(!nf.name.trim())return;
    const type=typeFilter==="supplier"?"সরবরাহকারী":typeFilter==="customer"?"ক্রেতা":"উভয়";
    const newParty={id:uid(),name:nf.name.trim(),phone:nf.phone.trim(),type,openingBalance:0,createdAt:today()};
    onAddParty&&onAddParty(newParty);
    onChange(newParty.id);
    setNf({name:"",phone:""});
    setShowNew(false);
  }
  return(
    <div style={{marginBottom:"0.85rem"}}>
      <label style={{display:"block",fontSize:"0.82rem",color:C.brown,marginBottom:"0.3rem",fontWeight:700}}>{label||"পার্টি"}</label>
      {hint&&<div style={{fontSize:"0.75rem",color:C.muted,marginBottom:"0.3rem"}}>{hint}</div>}
      <div style={{display:"flex",gap:"0.4rem",alignItems:"center"}}>
        <div style={{flex:1}}>
          <Sel value={value} onChange={onChange} options={[{value:"",label:"— পার্টি নির্বাচন করুন —"},...filtered.map(p=>({value:p.id,label:`${p.name}${p.phone?` (${p.phone})`:""}`}))]}/>
        </div>
        <button type="button" onClick={()=>setShowNew(v=>!v)}
          style={{padding:"0.55rem 0.7rem",background:showNew?C.primary:C.primaryLight,color:showNew?"#fff":C.primary,border:`1.5px solid ${C.primary}`,borderRadius:"0.6rem",fontWeight:800,fontSize:"0.82rem",cursor:"pointer",fontFamily:font,whiteSpace:"nowrap",flexShrink:0}}>
          {showNew?"✕":"+ নতুন"}
        </button>
      </div>
      {showNew&&(
        <div style={{background:C.primaryLight,border:`1.5px solid ${C.border}`,borderRadius:"0.75rem",padding:"0.85rem",marginTop:"0.5rem"}}>
          <div style={{fontWeight:800,color:C.darkBrown,fontSize:"0.85rem",marginBottom:"0.65rem"}}>নতুন পার্টি যোগ করুন</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.5rem"}}>
            <div>
              <label style={{display:"block",fontSize:"0.78rem",color:C.brown,marginBottom:"0.25rem",fontWeight:700}}>নাম *</label>
              <input value={nf.name} onChange={e=>setNf({...nf,name:e.target.value})} placeholder="নাম লিখুন"
                style={{...iSt,fontSize:"0.88rem",padding:"0.5rem 0.7rem"}}/>
            </div>
            <div>
              <label style={{display:"block",fontSize:"0.78rem",color:C.brown,marginBottom:"0.25rem",fontWeight:700}}>মোবাইল</label>
              <input type="tel" value={nf.phone} onChange={e=>setNf({...nf,phone:e.target.value})} placeholder="01XXXXXXXXX"
                style={{...iSt,fontSize:"0.88rem",padding:"0.5rem 0.7rem"}}/>
            </div>
          </div>
          <button type="button" onClick={saveNew} disabled={!nf.name.trim()}
            style={{width:"100%",padding:"0.55rem",background:nf.name.trim()?C.primary:"#D0C0B0",color:"#fff",border:"none",borderRadius:"0.6rem",fontWeight:800,fontSize:"0.88rem",cursor:nf.name.trim()?"pointer":"not-allowed",fontFamily:font}}>
            যোগ করুন ও নির্বাচন করুন
          </button>
        </div>
      )}
    </div>
  );
}

// ── Medicine Fields ─────────────────────────────────────────────
function MedicineFields({value:v,onChange}){
  const u=v.medUnit||"ml";
  const f=v.medForm||"Unit";
  return(
    <div style={{background:"#EBF2FF",borderRadius:"0.75rem",padding:"0.9rem",marginBottom:"0.85rem",border:"1px solid #C5D8F5"}}>
      <div style={{fontWeight:800,color:C.blue,fontSize:"0.85rem",marginBottom:"0.65rem"}}>💊 ওষুধের বিস্তারিত</div>
      <Field label="ওষুধের নাম *"><Inp value={v.medName} onChange={x=>onChange({...v,medName:x})} placeholder="যেমন: Ciprocin, Tiamulin..."/></Field>
      <div style={{marginBottom:"0.85rem"}}>
        <label style={{display:"block",fontSize:"0.82rem",color:C.brown,marginBottom:"0.4rem",fontWeight:700}}>ধরন (Form) *</label>
        <div style={{display:"flex",flexWrap:"wrap",gap:"0.4rem"}}>
          {MED_FORMS.map(fm=>(
            <button key={fm} type="button" onClick={()=>onChange({...v,medForm:fm})}
              style={{padding:"0.35rem 0.8rem",borderRadius:"2rem",border:`2px solid ${v.medForm===fm?C.blue:"#C5D8F5"}`,background:v.medForm===fm?C.blue:"#fff",color:v.medForm===fm?"#fff":C.blue,fontWeight:700,cursor:"pointer",fontFamily:font,fontSize:"0.8rem"}}>
              {fm==="Bottle"?"🍶 Bottle":fm==="Tablet"?"💊 Tablet":fm==="Packet"?"📦 Packet":fm==="Vial"?"🧪 Vial":"🧴 Sachet"}
            </button>
          ))}
        </div>
      </div>
      <div style={{marginBottom:"0.85rem"}}>
        <label style={{display:"block",fontSize:"0.82rem",color:C.brown,marginBottom:"0.4rem",fontWeight:700}}>একক (Unit) *</label>
        <div style={{display:"flex",gap:"0.4rem",flexWrap:"wrap"}}>
          {MED_UNITS.map(un=>(
            <button key={un} type="button" onClick={()=>onChange({...v,medUnit:un})}
              style={{padding:"0.35rem 0.8rem",borderRadius:"2rem",border:`2px solid ${v.medUnit===un?C.blue:"#C5D8F5"}`,background:v.medUnit===un?C.blue:"#fff",color:v.medUnit===un?"#fff":C.blue,fontWeight:800,cursor:"pointer",fontFamily:font,fontSize:"0.88rem"}}>
              {un}
            </button>
          ))}
        </div>
      </div>
      <Field label={`প্রতি ${f}-এ কত ${u}?`}>
        <div style={{position:"relative"}}>
          <input type="number" value={v.medQtyPerUnit} onChange={e=>onChange({...v,medQtyPerUnit:e.target.value})} placeholder="যেমন: 500" style={{...iSt,paddingRight:"3.5rem"}}/>
          <span style={{position:"absolute",right:"0.85rem",top:"50%",transform:"translateY(-50%)",color:C.blue,fontWeight:800,fontSize:"0.9rem",pointerEvents:"none"}}>{u}</span>
        </div>
      </Field>
      <Field label={`মোট কতটি ${f} কিনলেন? *`}>
        <div style={{position:"relative"}}>
          <input type="number" value={v.medTotalUnits} onChange={e=>onChange({...v,medTotalUnits:e.target.value})} placeholder="সংখ্যা" style={{...iSt,paddingRight:"4rem"}}/>
          <span style={{position:"absolute",right:"0.85rem",top:"50%",transform:"translateY(-50%)",color:C.blue,fontWeight:800,fontSize:"0.82rem",pointerEvents:"none"}}>{f}</span>
        </div>
      </Field>
      {v.medName&&v.medTotalUnits&&(
        <div style={{background:"#fff",borderRadius:"0.5rem",padding:"0.55rem 0.75rem",fontSize:"0.82rem",color:C.blue,fontWeight:600,marginTop:"0.3rem"}}>
          📋 স্টকে যাবে: <strong>{v.medName}</strong> — {v.medTotalUnits} {f}
          {v.medQtyPerUnit?` (প্রতিটিতে ${v.medQtyPerUnit} ${u})`:""}
          {v.medQtyPerUnit&&v.medTotalUnits?<span style={{color:"#888",fontWeight:400}}> → মোট {Number(v.medTotalUnits)*Number(v.medQtyPerUnit)} {u}</span>:""}
        </div>
      )}
    </div>
  );
}

// ── Party Tab ───────────────────────────────────────────────────
function PartyTab({parties,shopPurchases,shopSales,flockPurchases,flockSales,eggInputs=[],hatcheryExpenses=[],farmExpenses=[],currentUser,onAddParty,onUpdateParty,onDeleteParty}){
  const [view,setView]=useState("list");
  const [selectedParty,setSelectedParty]=useState(null);
  const [showAdd,setShowAdd]=useState(false);
  const [form,setForm]=useState({name:"",phone:"",type:PARTY_TYPES[0],openingBalance:"",openingBalanceType:"পাবো"});
  const [editingParty,setEditingParty]=useState(null);

  // Department-based data scoping
  const dept=currentUser?.department;
  const isOwner=!dept||dept==="সব বিভাগ"||currentUser?.role==="মালিক";
  const showShop=isOwner||dept==="দোকান";
  const showFarm=isOwner||dept==="ফার্ম";
  const showHatchery=isOwner||dept==="হ্যাচারি";

  function saveParty(){
    const op=Number(form.openingBalance)||0;
    if(editingParty){
      onUpdateParty({...editingParty,...form,openingBalance:form.openingBalanceType==="পাবো"?op:-op,_editedBy:byUser(currentUser)});
      setEditingParty(null);
    } else {
      onAddParty({...form,id:uid(),openingBalance:form.openingBalanceType==="পাবো"?op:-op,createdAt:today(),_by:byUser(currentUser)});
    }
    setForm({name:"",phone:"",type:PARTY_TYPES[0],openingBalance:"",openingBalanceType:"পাবো"});
    setShowAdd(false);
  }
  function getLedger(party){
    const e=[];
    if(party.openingBalance!==0)e.push({date:party.createdAt||today(),type:"আগের বাকি",desc:"শুরুর ব্যালেন্স",delta:party.openingBalance});
    if(showShop){
      shopPurchases.filter(p=>p.partyId===party.id).forEach(p=>{const u=(p.total||0)-(p.paid||0);if(u!==0)e.push({date:p.date,type:"কেনা (দোকান)",desc:`${p.breed} ${p.quantity}টি`,delta:-u});});
      shopSales.filter(s=>s.partyId===party.id).forEach(s=>{const u=(s.total||0)-(s.paid||0);if(u!==0)e.push({date:s.date,type:"বিক্রি",desc:`${s.breed} ${s.quantity}টি`,delta:u});});
    }
    if(showFarm){
      (flockPurchases||[]).filter(p=>p.partyId===party.id).forEach(p=>{const u=(p.total||0)-(p.paid||0);if(u!==0)e.push({date:p.date,type:"ফার্ম বাচ্চা কেনা",desc:`${p.breed} ${p.quantity}টি`,delta:-u});});
      (flockSales||[]).filter(s=>s.partyId===party.id).forEach(s=>{const u=(s.total||0)-(s.paid||0);if(u!==0)e.push({date:s.date,type:"ফার্ম বিক্রি",desc:`${s.type} ${s.quantity}`,delta:u});});
    }
    if(showHatchery){
      eggInputs.filter(e2=>e2.partyId===party.id).forEach(e2=>{const u=(e2.total||0)-Number(e2.paid||0);if(u!==0)e.push({date:e2.date,type:"হ্যাচারি ডিম কেনা",desc:`${e2.breed} ${e2.quantity}টি`,delta:-u});});
      hatcheryExpenses.filter(e2=>e2.partyId===party.id).forEach(e2=>{const u=Number(e2.amount||0)-Number(e2.paid||0);if(u!==0)e.push({date:e2.date,type:"হ্যাচারি খরচ",desc:e2.category,delta:-u});});
    }
    if(showFarm){
      farmExpenses.filter(e2=>e2.expPartyId===party.id).forEach(e2=>{const u=Number(e2.amount||0)-Number(e2.expPaid||0);if(u!==0)e.push({date:e2.date,type:"ফার্ম খরচ",desc:e2.category,delta:-u});});
    }
    if(showShop){
      farmExpenses.filter(e2=>e2.expPartyId===party.id&&e2.dept==="দোকান").forEach(e2=>{const u=Number(e2.amount||0)-Number(e2.expPaid||0);if(u!==0)e.push({date:e2.date,type:"দোকান খরচ",desc:e2.category,delta:-u});});
    }
    e.sort((a,b)=>a.date>b.date?1:-1);
    let bal=0;
    return e.map(x=>{bal+=x.delta;return{...x,balance:bal};});
  }
  function getNetBal(party){const l=getLedger(party);return l.length?l[l.length-1].balance:0;}

  // Only show parties that have transactions in this dept (or opening balance)
  const visibleParties=useMemo(()=>{
    if(isOwner)return parties;
    return parties.filter(p=>{
      const hasOp=p.openingBalance!==0;
      const hasShop=showShop&&([...shopPurchases,...shopSales,...farmExpenses.filter(e=>e.dept==="দোকান")].some(x=>(x.partyId||x.expPartyId)===p.id));
      const hasFarm=showFarm&&([...(flockPurchases||[]),...(flockSales||[]),...farmExpenses.filter(e=>e.dept!=="দোকান")].some(x=>(x.partyId||x.expPartyId)===p.id));
      const hasHatchery=showHatchery&&([...eggInputs,...hatcheryExpenses].some(x=>x.partyId===p.id));
      return hasOp||hasShop||hasFarm||hasHatchery;
    });
  },[parties,shopPurchases,shopSales,flockPurchases,flockSales,eggInputs,hatcheryExpenses,farmExpenses,isOwner,showShop,showFarm,showHatchery]);
  return(
    <div>
      <SubTabs tabs={[["list","পার্টি লিস্ট"],["ledger","লেজার"]]} active={view} onChange={v=>{setView(v);if(v==="list")setSelectedParty(null);}}/>
      {view==="list"&&(
        <>
          <SectionHeader title={`পার্টি (${visibleParties.length})`} action={<AddBtn onClick={()=>setShowAdd(true)} label="পার্টি যোগ"/>}/>
          {!visibleParties.length?<Card><p style={{textAlign:"center",color:"#bbb"}}>এখনো কোনো পার্টি নেই।</p></Card>
          :visibleParties.map(party=>{
            const bal=getNetBal(party);
            const tc=party.type==="সরবরাহকারী"?C.blue:party.type==="ক্রেতা"?C.green:C.primary;
            const tb=party.type==="সরবরাহকারী"?C.blueLight:party.type==="ক্রেতা"?C.greenLight:C.primaryLight;
            return(
              <Card key={party.id} style={{cursor:"pointer"}} onClick={()=>{setSelectedParty(party);setView("ledger");}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:800,color:C.darkBrown}}>{party.name}</div>
                    {party.phone&&<div style={{fontSize:"0.8rem",color:C.muted}}>📞 {party.phone}</div>}
                    <span style={{display:"inline-block",marginTop:"0.2rem",fontSize:"0.72rem",background:tb,color:tc,padding:"0.1rem 0.55rem",borderRadius:"1rem",fontWeight:700}}>{party.type}</span>
                  </div>
                  <div style={{textAlign:"right",minWidth:80}}>
                    {bal>0&&<><div style={{fontWeight:800,color:C.green}}>{fmt(bal)}</div><div style={{fontSize:"0.7rem",color:C.muted}}>পাবো</div></>}
                    {bal<0&&<><div style={{fontWeight:800,color:C.red}}>{fmt(Math.abs(bal))}</div><div style={{fontSize:"0.7rem",color:C.muted}}>দেবো</div></>}
                    {bal===0&&<div style={{fontWeight:700,color:"#bbb"}}>নিষ্পত্তি ✅</div>}
                  </div>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:"0.35rem"}}>
                  <div style={{fontSize:"0.72rem",color:C.primary}}>👉 লেজার দেখতে ট্যাপ করুন</div>
                  <div style={{display:"flex",gap:"0.3rem"}} onClick={e=>e.stopPropagation()}>
                    <button onClick={()=>{setForm({name:party.name,phone:party.phone||"",type:party.type,openingBalance:String(Math.abs(party.openingBalance||0)),openingBalanceType:(party.openingBalance||0)>=0?"পাবো":"দেবো"});setShowAdd(true);setEditingParty(party);}} style={{background:C.blueLight,color:C.blue,border:"none",borderRadius:"0.35rem",padding:"0.2rem 0.5rem",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>✏️</button>
                    <button onClick={()=>{onDeleteParty({...party,_deletedBy:byUser(currentUser)});}} style={{background:C.redLight,color:C.red,border:"none",borderRadius:"0.35rem",padding:"0.2rem 0.5rem",fontSize:"0.72rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>🗑️</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </>
      )}
      {view==="ledger"&&(
        <>
          {!selectedParty?(
            <>
              <p style={{color:C.muted,fontSize:"0.88rem",marginBottom:"0.75rem"}}>কোন পার্টির লেজার দেখবেন?</p>
              {parties.map(party=>{
                const bal=getNetBal(party);
                return(
                  <Card key={party.id} style={{cursor:"pointer"}} onClick={()=>setSelectedParty(party)}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{fontWeight:700,color:C.darkBrown}}>{party.name}</div>
                      <div style={{fontWeight:800,color:bal>0?C.green:bal<0?C.red:"#bbb"}}>{bal>0?`পাবো ${fmt(bal)}`:bal<0?`দেবো ${fmt(Math.abs(bal))}`:"নিষ্পত্তি ✅"}</div>
                    </div>
                  </Card>
                );
              })}
            </>
          ):(
            <>
              <div style={{background:`linear-gradient(135deg,${C.darkBrown},${C.brown})`,borderRadius:"0.9rem",padding:"1rem 1.25rem",marginBottom:"0.75rem",color:"#fff"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{fontWeight:800,fontSize:"1.2rem"}}>{selectedParty.name}</div>
                    {selectedParty.phone&&<div style={{fontSize:"0.82rem",opacity:0.75}}>📞 {selectedParty.phone}</div>}
                  </div>
                  <div style={{textAlign:"right"}}>
                    {(()=>{const bal=getNetBal(selectedParty);return bal>0?<><div style={{fontWeight:800,fontSize:"1.5rem",color:"#90EE90"}}>{fmt(bal)}</div><div style={{fontSize:"0.72rem",opacity:0.8}}>আমরা পাবো</div></>:bal<0?<><div style={{fontWeight:800,fontSize:"1.5rem",color:"#FFB3B3"}}>{fmt(Math.abs(bal))}</div><div style={{fontSize:"0.72rem",opacity:0.8}}>আমরা দেবো</div></>:<div style={{fontWeight:800,color:"#90EE90"}}>নিষ্পত্তি ✅</div>;})()}
                  </div>
                </div>
                <button type="button" onClick={()=>setSelectedParty(null)} style={{marginTop:"0.75rem",background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",borderRadius:"1rem",padding:"0.3rem 0.85rem",fontSize:"0.78rem",cursor:"pointer",fontFamily:font}}>← পার্টি লিস্টে ফিরুন</button>
              </div>
              <Card>
                <div style={{fontWeight:800,color:C.darkBrown,marginBottom:"0.75rem"}}>লেনদেনের বিবরণ</div>
                {(()=>{
                  const ledger=getLedger(selectedParty);
                  if(!ledger.length)return<p style={{textAlign:"center",color:"#bbb"}}>কোনো লেনদেন নেই।</p>;
                  return(
                    <div style={{overflowX:"auto"}}>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:"0.8rem"}}>
                        <thead><tr style={{background:C.primaryLight}}>{["তারিখ","ধরন","বিবরণ","পাবো","দেবো","ব্যালেন্স"].map(h=><th key={h} style={{padding:"0.5rem",textAlign:"left",color:C.brown,fontWeight:700,borderBottom:`2px solid ${C.border}`,whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                        <tbody>
                          {ledger.map((entry,i)=>(
                            <tr key={i} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"#fff":"#FEFAF5"}}>
                              <td style={{padding:"0.5rem",color:C.muted,whiteSpace:"nowrap"}}>{entry.date}</td>
                              <td style={{padding:"0.5rem"}}><span style={{background:entry.type==="বিক্রি"?C.greenLight:entry.type==="কেনা"?C.blueLight:C.primaryLight,color:entry.type==="বিক্রি"?C.green:entry.type==="কেনা"?C.blue:C.primary,padding:"0.1rem 0.45rem",borderRadius:"1rem",fontSize:"0.72rem",fontWeight:700}}>{entry.type}</span></td>
                              <td style={{padding:"0.5rem",color:C.darkBrown}}>{entry.desc}</td>
                              <td style={{padding:"0.5rem",color:C.green,fontWeight:700}}>{entry.delta>0?fmt(entry.delta):"—"}</td>
                              <td style={{padding:"0.5rem",color:C.red,fontWeight:700}}>{entry.delta<0?fmt(Math.abs(entry.delta)):"—"}</td>
                              <td style={{padding:"0.5rem",fontWeight:800,color:entry.balance>0?C.green:entry.balance<0?C.red:"#bbb",whiteSpace:"nowrap"}}>{entry.balance>0?`+${fmt(entry.balance)}`:entry.balance<0?`-${fmt(Math.abs(entry.balance))}`:"০"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })()}
              </Card>
            </>
          )}
        </>
      )}
      {showAdd&&(
        <Modal title={editingParty?"পার্টি সম্পাদনা ✏️":"নতুন পার্টি"} onClose={()=>{setShowAdd(false);setEditingParty(null);setForm({name:"",phone:"",type:PARTY_TYPES[0],openingBalance:"",openingBalanceType:"পাবো"});}}>
          <Field label="নাম *"><Inp value={form.name} onChange={v=>setForm({...form,name:v})} placeholder="নাম লিখুন"/></Field>
          <Field label="ফোন (ঐচ্ছিক)"><Inp type="tel" value={form.phone} onChange={v=>setForm({...form,phone:v})} placeholder="০১XXXXXXXXX"/></Field>
          <Field label="ধরন"><Sel value={form.type} onChange={v=>setForm({...form,type:v})} options={PARTY_TYPES}/></Field>
          <div style={{background:C.primaryLight,borderRadius:"0.75rem",padding:"1rem",marginBottom:"0.85rem",border:`1px solid ${C.border}`}}>
            <div style={{fontWeight:800,color:C.brown,fontSize:"0.88rem",marginBottom:"0.65rem"}}>📋 আগের বাকি</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.65rem"}}>
              {["পাবো","দেবো"].map(opt=>(
                <button key={opt} type="button" onClick={()=>setForm({...form,openingBalanceType:opt})}
                  style={{padding:"0.55rem",borderRadius:"0.5rem",border:`2px solid ${form.openingBalanceType===opt?C.primary:C.border}`,background:form.openingBalanceType===opt?C.primary:"#fff",color:form.openingBalanceType===opt?"#fff":C.brown,fontWeight:700,cursor:"pointer",fontFamily:font}}>
                  {opt==="পাবো"?"✅ আমরা পাবো":"💸 আমরা দেবো"}
                </button>
              ))}
            </div>
            <Inp type="number" value={form.openingBalance} onChange={v=>setForm({...form,openingBalance:v})} placeholder="পরিমাণ (না থাকলে ফাঁকা)" min="0"/>
          </div>
          <SaveBtn onClick={saveParty} disabled={!form.name.trim()}/>
        </Modal>
      )}
    </div>
  );
}

// ── Shop Tab ────────────────────────────────────────────────────
// ── Shared Employee Section ─────────────────────────────────────
function EmployeeSection({employees,advances,onAddEmployee,onAddAdvance,triggerAdd}){
  const [showEmp,setShowEmp]=useState(false);
  useEffect(()=>{if(triggerAdd)setShowEmp(true);},[triggerAdd]);
  const [showAdvance,setShowAdvance]=useState(false);
  const [advanceEmp,setAdvanceEmp]=useState(null);
  const [advf,setAdvf]=useState({date:today(),amount:"",note:""});
  const [ef,setEf]=useState({name:"",phone:"",joining:today(),role:"",salary:"",department:"দোকান"});

  const totalSalary=(employees||[]).reduce((s,e)=>s+Number(e.salary||0),0);

  function getThisMonthAdv(empId){
    const m=new Date().toISOString().slice(0,7);
    return(advances||[]).filter(a=>a.empId===empId&&(a.date||"").startsWith(m)).reduce((s,a)=>s+Number(a.amount||0),0);
  }
  function getAdvanceTotal(empId){return(advances||[]).filter(a=>a.empId===empId).reduce((s,a)=>s+Number(a.amount||0),0);}

  function saveAdvance(){
    onAddAdvance({...advf,empId:advanceEmp.id,empName:advanceEmp.name,id:uid()});
    setAdvf({date:today(),amount:"",note:""});
    setShowAdvance(false);setAdvanceEmp(null);
  }
  function saveEmp(){
    onAddEmployee({...ef,id:uid()});
    setEf({name:"",phone:"",joining:today(),role:"",salary:"",department:"দোকান"});
    setShowEmp(false);
  }

  return(
    <>
      <SectionHeader title={`কর্মী তালিকা (${(employees||[]).length} জন)`} action={<AddBtn onClick={()=>setShowEmp(true)} label="কর্মী যোগ"/>}/>

      {(employees||[]).length>0&&(
        <div style={{background:`linear-gradient(135deg,${C.blue},#1A4A90)`,borderRadius:"0.9rem",padding:"0.9rem 1.1rem",marginBottom:"0.75rem",color:"#fff",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div style={{fontSize:"0.75rem",opacity:0.8}}>মোট কর্মী</div><div style={{fontWeight:800,fontSize:"1.3rem"}}>{(employees||[]).length} জন</div></div>
          <div style={{textAlign:"right"}}><div style={{fontSize:"0.75rem",opacity:0.8}}>মোট মাসিক বেতন</div><div style={{fontWeight:800,fontSize:"1.3rem"}}>{fmt(totalSalary)}</div></div>
        </div>
      )}

      {!(employees||[]).length
        ?<Card><p style={{textAlign:"center",color:"#bbb",lineHeight:1.8}}>কোনো কর্মী নেই।<br/>"কর্মী যোগ" ট্যাপ করুন।</p></Card>
        :(employees||[]).map(emp=>{
          const thisMonthAdv=getThisMonthAdv(emp.id);
          const totalAdv=getAdvanceTotal(emp.id);
          const remaining=Math.max(Number(emp.salary||0)-thisMonthAdv,0);
          return(
            <Card key={emp.id}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.6rem"}}>
                <div style={{flex:1}}>
                  <div style={{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.3rem"}}>
                    <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"1rem",flexShrink:0}}>
                      {emp.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{fontWeight:800,color:C.darkBrown,fontSize:"0.95rem"}}>{emp.name}</div>
                      {emp.role&&<span style={{background:C.blueLight,color:C.blue,fontSize:"0.7rem",fontWeight:700,padding:"0.1rem 0.5rem",borderRadius:"1rem"}}>{emp.role}</span>}
                    </div>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.3rem",marginTop:"0.3rem"}}>
                    {emp.phone&&<div style={{display:"flex",alignItems:"center",gap:"0.3rem",fontSize:"0.78rem",color:C.muted}}><span>📞</span><span>{emp.phone}</span></div>}
                    <div style={{display:"flex",alignItems:"center",gap:"0.3rem",fontSize:"0.78rem",color:C.muted}}><span>📅</span><span>{emp.joining}</span></div>
                  </div>
                </div>
                <div style={{textAlign:"right",marginLeft:"0.75rem"}}>
                  <div style={{fontSize:"0.68rem",color:C.muted}}>মাসিক বেতন</div>
                  <div style={{fontWeight:800,color:C.green,fontSize:"1.1rem"}}>{fmt(emp.salary||0)}</div>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.35rem",marginBottom:"0.6rem"}}>
                {[["বেতন",fmt(emp.salary||0),C.green,C.greenLight],["এ মাসে অগ্রিম",fmt(thisMonthAdv),thisMonthAdv>0?C.primary:C.muted,thisMonthAdv>0?C.primaryLight:"#F5F5F5"],["বাকি বেতন",fmt(remaining),remaining>0?C.blue:"#bbb",remaining>0?C.blueLight:"#F5F5F5"]].map(([l,v,c,bg])=>(
                  <div key={l} style={{background:bg,borderRadius:"0.45rem",padding:"0.4rem",textAlign:"center"}}>
                    <div style={{fontSize:"0.62rem",color:"#555",marginBottom:"0.1rem"}}>{l}</div>
                    <div style={{fontWeight:800,color:c,fontSize:"0.82rem"}}>{v}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>{setAdvanceEmp(emp);setAdvf({date:today(),amount:"",note:""});setShowAdvance(true);}}
                style={{width:"100%",padding:"0.5rem",background:"#FFF3E0",color:"#E65100",border:"1.5px solid #FFCC80",borderRadius:"0.6rem",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:font}}>
                💵 অগ্রিম বেতন দিন
              </button>
              {(advances||[]).filter(a=>a.empId===emp.id).length>0&&(
                <div style={{marginTop:"0.5rem"}}>
                  <div style={{fontSize:"0.75rem",color:C.muted,fontWeight:700,marginBottom:"0.25rem"}}>অগ্রিমের ইতিহাস</div>
                  {(advances||[]).filter(a=>a.empId===emp.id).slice().reverse().slice(0,3).map(a=>(
                    <div key={a.id} style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",padding:"0.25rem 0",borderBottom:`1px solid ${C.border}`}}>
                      <span style={{color:C.muted}}>{a.date}</span>
                      <span style={{color:"#555"}}>{a.note||"অগ্রিম"}</span>
                      <span style={{fontWeight:700,color:C.primary}}>{fmt(a.amount)}</span>
                    </div>
                  ))}
                  {(advances||[]).filter(a=>a.empId===emp.id).length>3&&(
                    <div style={{fontSize:"0.72rem",color:C.muted,textAlign:"center",marginTop:"0.2rem"}}>সর্বমোট অগ্রিম: {fmt(totalAdv)}</div>
                  )}
                </div>
              )}
            </Card>
          );
        })
      }

      {/* Advance Modal */}
      {showAdvance&&advanceEmp&&(
        <Modal title={`💵 অগ্রিম বেতন — ${advanceEmp.name}`} onClose={()=>{setShowAdvance(false);setAdvanceEmp(null);}}>
          <div style={{background:"#FFF3E0",borderRadius:"0.75rem",padding:"0.85rem",marginBottom:"0.85rem",border:"1.5px solid #FFCC80"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.4rem",textAlign:"center"}}>
              {[["মাসিক বেতন",fmt(advanceEmp.salary||0),C.green],["এ মাসে দেওয়া",fmt(getThisMonthAdv(advanceEmp.id)),C.primary],["বাকি",fmt(Math.max(Number(advanceEmp.salary||0)-getThisMonthAdv(advanceEmp.id),0)),C.blue]].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",borderRadius:"0.45rem",padding:"0.45rem"}}>
                  <div style={{fontSize:"0.65rem",color:"#777"}}>{l}</div>
                  <div style={{fontWeight:800,color:c,fontSize:"0.88rem"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <Field label="তারিখ"><Inp type="date" value={advf.date} onChange={v=>setAdvf({...advf,date:v})}/></Field>
          <Field label="অগ্রিমের পরিমাণ (৳) *">
            <div style={{position:"relative"}}>
              <input type="number" value={advf.amount} onChange={e=>setAdvf({...advf,amount:e.target.value})} placeholder="কত টাকা?" style={{...iSt,paddingRight:"2rem"}}/>
              <span style={{position:"absolute",right:"0.75rem",top:"50%",transform:"translateY(-50%)",color:"#888",fontSize:"0.85rem",pointerEvents:"none"}}>৳</span>
            </div>
          </Field>
          <Field label="নোট (ঐচ্ছিক)"><Inp value={advf.note} onChange={v=>setAdvf({...advf,note:v})} placeholder="যেমন: জরুরি প্রয়োজন"/></Field>
          {Number(advf.amount)>0&&(()=>{
            const salary=Number(advanceEmp.salary||0);
            const alreadyGiven=getThisMonthAdv(advanceEmp.id);
            const afterThis=alreadyGiven+Number(advf.amount);
            const overBy=Math.max(afterThis-salary,0);
            const isOver=overBy>0;
            return(
              <div style={{background:isOver?"#FFF0F0":"#FFF3E0",borderRadius:"0.6rem",padding:"0.75rem",marginBottom:"0.65rem",border:`2px solid ${isOver?C.red:"#FFCC80"}`}}>
                <div style={{textAlign:"center",marginBottom:isOver?"0.55rem":"0"}}>
                  <div style={{fontSize:"0.75rem",color:isOver?C.red:"#E65100",marginBottom:"0.1rem"}}>💵 অগ্রিম দেওয়া হবে</div>
                  <div style={{fontWeight:800,color:isOver?C.red:"#E65100",fontSize:"1.4rem"}}>{fmt(advf.amount)}</div>
                </div>
                {isOver&&(
                  <div style={{background:"#FFF",borderRadius:"0.5rem",padding:"0.55rem 0.65rem",border:`1px solid ${C.red}`}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",marginBottom:"0.25rem"}}>
                      <span style={{color:"#555"}}>মাসিক বেতন</span>
                      <span style={{fontWeight:700}}>{fmt(salary)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",marginBottom:"0.25rem"}}>
                      <span style={{color:"#555"}}>আগে দেওয়া হয়েছে</span>
                      <span style={{fontWeight:700,color:C.primary}}>{fmt(alreadyGiven)}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",paddingTop:"0.3rem",borderTop:`1px solid #FFCCCC`}}>
                      <span style={{color:C.red,fontWeight:800}}>⚠️ বেতনের বেশি</span>
                      <span style={{fontWeight:800,color:C.red}}>{fmt(overBy)}</span>
                    </div>
                  </div>
                )}
                {!isOver&&<div style={{fontSize:"0.72rem",color:"#aaa",textAlign:"center",marginTop:"0.1rem"}}>এটি কর্মী খরচে যোগ হবে</div>}
              </div>
            );
          })()}
          <SaveBtn onClick={saveAdvance} disabled={!advf.amount} label="অগ্রিম দিন ও খরচে যোগ করুন"/>
        </Modal>
      )}

      {/* Add Employee Modal */}
      {showEmp&&(
        <Modal title="নতুন কর্মী যোগ 👷" onClose={()=>setShowEmp(false)}>
          <Field label="নাম *"><Inp value={ef.name} onChange={v=>setEf({...ef,name:v})} placeholder="কর্মীর নাম"/></Field>
          <Field label="মোবাইল নম্বর"><Inp type="tel" value={ef.phone} onChange={v=>setEf({...ef,phone:v})} placeholder="01XXXXXXXXX"/></Field>
          <Field label="যোগদানের তারিখ *"><Inp type="date" value={ef.joining} onChange={v=>setEf({...ef,joining:v})}/></Field>
          <Field label="পদবি / ধরন">
            <Sel value={ef.role} onChange={v=>setEf({...ef,role:v})}
              options={[{value:"",label:"— পদবি নির্বাচন করুন —"},"ম্যানেজার","সুপারভাইজার","শ্রমিক","চৌকিদার","ড্রাইভার","হিসাবরক্ষক","অন্যান্য"].map(o=>typeof o==="string"?{value:o,label:o}:o)}/>
          </Field>
          <Field label="বিভাগ / কোথায় কাজ করে">
            <Sel value={ef.department||"দোকান"} onChange={v=>setEf({...ef,department:v})}
              options={["দোকান","হ্যাচারি","ফার্ম","সব বিভাগ","অন্যান্য"]}/>
          </Field>
          <Field label="মাসিক বেতন (৳) *">
            <div style={{position:"relative"}}>
              <input type="number" value={ef.salary} onChange={e=>setEf({...ef,salary:e.target.value})} placeholder="যেমন: 8000" style={{...iSt,paddingRight:"2rem"}}/>
              <span style={{position:"absolute",right:"0.75rem",top:"50%",transform:"translateY(-50%)",color:"#888",fontSize:"0.85rem",pointerEvents:"none"}}>৳</span>
            </div>
          </Field>
          {ef.name&&ef.salary&&(
            <div style={{background:C.greenLight,borderRadius:"0.6rem",padding:"0.65rem",textAlign:"center",marginBottom:"0.5rem",border:"1.5px solid #A8D8C0"}}>
              <div style={{fontSize:"0.75rem",color:"#555"}}>মাসিক বেতন</div>
              <div style={{fontWeight:800,color:C.green,fontSize:"1.4rem"}}>{fmt(ef.salary)}</div>
            </div>
          )}
          <SaveBtn onClick={saveEmp} disabled={!ef.name.trim()||!ef.salary} label="কর্মী যোগ করুন"/>
        </Modal>
      )}
    </>
  );
}

function ShopTab({purchases,sales,parties,employees,advances,userSettings,currentUser,sectionStats,onAddPurchase,onAddSale,onAddParty,onAddEmployee,onAddAdvance,onUpdateSale,onDeleteSale,onUpdatePurchase,onDeletePurchase}){
  const [triggerEmpAdd,setTriggerEmpAdd]=useState(0);
  const [view,setView]=useState("sell");
  const [showBuy,setShowBuy]=useState(false);
  const [showSell,setShowSell]=useState(false);


  const stock=useMemo(()=>{
    const s={};BREEDS.forEach(b=>(s[b]=0));
    purchases.forEach(p=>(s[p.breed]=(s[p.breed]||0)+Number(p.quantity)));
    sales.forEach(s2=>(s[s2.breed]=(s[s2.breed]||0)-Number(s2.quantity)));
    return s;
  },[purchases,sales]);

  const [bf,setBf]=useState({date:today(),breed:BREEDS[0],quantity:"",rate:"",partyId:"",paid:""});
  const bTotal=Number(bf.quantity)*Number(bf.rate)||0;
  const bRem=Math.max(bTotal-(Number(bf.paid)||0),0);
  function saveBuy(){
    if(editPurchase){
      onUpdatePurchase({...editPurchase,...bf,total:bTotal,paid:Number(bf.paid)||0,remaining:bRem,_editedBy:byUser(currentUser)});
      setEditPurchase(null);
    } else {
      onAddPurchase({...bf,total:bTotal,paid:Number(bf.paid)||0,remaining:bRem,id:uid(),_by:byUser(currentUser)});
    }
    setBf({date:today(),breed:BREEDS[0],quantity:"",rate:"",partyId:"",paid:""});setShowBuy(false);
  }

  const [memoSale,setMemoSale]=useState(null);
  const [editSale,setEditSale]=useState(null);
  const [editPurchase,setEditPurchase]=useState(null);
  const [sf,setSf]=useState({date:today(),breed:BREEDS[0],quantity:"",rate:"",partyId:"",paid:"",discount:""});
  const sGross=Number(sf.quantity)*Number(sf.rate)||0;
  const sDiscount=Number(sf.discount)||0;
  const sTotal=Math.max(sGross-sDiscount,0);
  const sRem=Math.max(sTotal-(Number(sf.paid)||0),0);
  const curStock=stock[sf.breed]||0;
  function saveSell(){
    const sale={...sf,gross:sGross,discount:sDiscount,total:sTotal,paid:Number(sf.paid)||0,remaining:sRem};
    if(editSale){
      onUpdateSale({...editSale,...sale,_editedBy:byUser(currentUser)});
      setEditSale(null);setMemoSale(null);
    } else {
      const newSale={...sale,id:uid(),_by:byUser(currentUser)};
      onAddSale(newSale);
      setMemoSale(newSale);
    }
    setSf({date:today(),breed:BREEDS[0],quantity:"",rate:"",partyId:"",paid:"",discount:""});
    setShowSell(false);
  }

  function pName(id){const p=parties.find(x=>x.id===id);return p?p.name:"—";}
  const RemBadge=({val})=><span style={{color:val>0?C.red:C.green,fontWeight:700}}>{val>0?fmt(val):"✅"}</span>;

  const totalSalary=(employees||[]).reduce((s,e)=>s+Number(e.salary||0),0);

  return(
    <div>
      {sectionStats&&<ProfitLossBar label="🏪 দোকান — লাভ/লোকসান" income={sectionStats.income} expense={sectionStats.expense} profit={sectionStats.profit}/>}
      <SubTabs tabs={[["stock","স্টক"],["buy","কেনা"],["sell","বিক্রি"],["employee","👷 কর্মী"]]} active={view} onChange={v=>{setView(v);if(v==="employee")setTimeout(()=>setTriggerEmpAdd(t=>t+1),50);}}/>

      {view==="stock"&&(
        <>
          <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem"}}><AddBtn onClick={()=>setShowBuy(true)} label="বাচ্চা কেনা"/><AddBtn onClick={()=>setShowSell(true)} label="বাচ্চা বিক্রি"/></div>
          <Card>
            <div style={{fontWeight:800,color:C.darkBrown,marginBottom:"0.75rem"}}>বর্তমান স্টক</div>
            {BREEDS.map(b=>(
              <div key={b} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.5rem 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.brown,fontWeight:600}}>{b}</span>
                <span style={{background:(stock[b]||0)>0?C.primaryLight:"#F5F5F5",color:(stock[b]||0)>0?C.primary:"#bbb",fontWeight:800,padding:"0.15rem 0.65rem",borderRadius:"2rem",fontSize:"0.88rem"}}>{stock[b]||0} টি</span>
              </div>
            ))}
          </Card>
        </>
      )}

      {view==="buy"&&<><SectionHeader title="কেনার তালিকা" action={<AddBtn onClick={()=>setShowBuy(true)}/>}/><Card><DataTable headers={["তারিখ","পার্টি","জাত","পরিমাণ","মোট","দিয়েছি","বাকি"]} rows={purchases.slice().reverse().map(p=>[p.date,pName(p.partyId),p.breed,p.quantity+"টি",fmt(p.total),fmt(p.paid||0),<RemBadge key={p.id} val={p.remaining||0}/>])} records={purchases.slice().reverse()} onEdit={p=>{setBf({date:p.date,breed:p.breed,quantity:String(p.quantity),rate:String(p.rate),partyId:p.partyId||"",paid:String(p.paid||0)});setEditPurchase(p);setShowBuy(true);}} onDelete={p=>{onDeletePurchase({...p,_deletedBy:byUser(currentUser)});}} emptyMsg="কোনো কেনার রেকর্ড নেই"/></Card></>}
      {view==="sell"&&<><SectionHeader title="বিক্রির তালিকা" action={<AddBtn onClick={()=>setShowSell(true)}/>}/><Card><DataTable headers={["তারিখ","পার্টি","জাত","পরিমাণ","মোট","পেয়েছি","বাকি"]} rows={sales.slice().reverse().map(s=>[s.date,pName(s.partyId),s.breed,s.quantity+"টি",fmt(s.total),fmt(s.paid||0),<RemBadge key={s.id} val={s.remaining||0}/>])} records={sales.slice().reverse()} onEdit={s=>{setSf({date:s.date,breed:s.breed,quantity:String(s.quantity),rate:String(s.rate),partyId:s.partyId||"",paid:String(s.paid||0),discount:String(s.discount||0)});setEditSale(s);setShowSell(true);}} onDelete={s=>{onDeleteSale({...s,_deletedBy:byUser(currentUser)});}} emptyMsg="কোনো বিক্রির রেকর্ড নেই"/></Card></>}

      {/* ── Employee Tab ── */}
      {view==="employee"&&(
        <EmployeeSection employees={employees} advances={advances} onAddEmployee={onAddEmployee} onAddAdvance={onAddAdvance} triggerAdd={triggerEmpAdd}/>
      )}

      {/* ── Modals ── */}
      {showBuy&&(
        <Modal title={editPurchase?"কেনা সম্পাদনা ✏️":"বাচ্চা কেনা"} onClose={()=>{setShowBuy(false);setEditPurchase(null);setBf({date:today(),breed:BREEDS[0],quantity:"",rate:"",partyId:"",paid:""});}}>
          <Field label="তারিখ"><Inp type="date" value={bf.date} onChange={v=>setBf({...bf,date:v})}/></Field>
          <PartySelector parties={parties} value={bf.partyId} onChange={v=>setBf({...bf,partyId:v})} typeFilter="supplier" label="সরবরাহকারী" onAddParty={onAddParty}/>
          <Field label="জাত"><Sel value={bf.breed} onChange={v=>setBf({...bf,breed:v})} options={BREEDS}/></Field>
          <Field label="পরিমাণ (টি)"><Inp type="number" min="1" value={bf.quantity} onChange={v=>setBf({...bf,quantity:v})} placeholder="কতটি?"/></Field>
          <Field label="প্রতিটির দাম (৳)"><Inp type="number" value={bf.rate} onChange={v=>setBf({...bf,rate:v})} placeholder="হার"/></Field>
          {bTotal>0&&(<div style={{background:C.primaryLight,borderRadius:"0.7rem",padding:"0.85rem",marginBottom:"0.85rem"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.6rem"}}><span style={{color:C.brown,fontWeight:600}}>মোট</span><span style={{fontWeight:800,color:C.primary}}>{fmt(bTotal)}</span></div>
            <Field label="এখন কত দিলেন?"><Inp type="number" value={bf.paid} onChange={v=>setBf({...bf,paid:v})} placeholder={`সর্বোচ্চ ${fmt(bTotal)}`}/></Field>
            {bRem>0&&<><div style={{color:C.red,fontWeight:700,fontSize:"0.85rem",marginBottom:"0.5rem"}}>⚠️ বাকি: {fmt(bRem)}</div>
            <div style={{background:"#FFF8F0",borderRadius:"0.6rem",padding:"0.65rem",border:"1.5px solid #F5A623"}}>
              <div style={{fontSize:"0.8rem",fontWeight:800,color:C.brown,marginBottom:"0.4rem"}}>🏪 বাকি থাকায় পার্টি তথ্য আবশ্যক</div>
              <PartySelector parties={parties} value={bf.partyId} onChange={v=>setBf({...bf,partyId:v})} typeFilter="supplier" label="সরবরাহকারী *" onAddParty={onAddParty}/>
            </div></>}
          </div>)}
          <SaveBtn onClick={saveBuy} disabled={!bf.quantity||!bf.rate||(bRem>0&&!bf.partyId)}/>
        </Modal>
      )}
      {showSell&&(
        <Modal title={editSale?"বিক্রি সম্পাদনা ✏️":"বাচ্চা বিক্রি"} onClose={()=>{setShowSell(false);setEditSale(null);setSf({date:today(),breed:BREEDS[0],quantity:"",rate:"",partyId:"",paid:"",discount:""});}}>
          <Field label="তারিখ"><Inp type="date" value={sf.date} onChange={v=>setSf({...sf,date:v})}/></Field>
          <PartySelector parties={parties} value={sf.partyId} onChange={v=>setSf({...sf,partyId:v})} typeFilter="customer" label="ক্রেতা (ঐচ্ছিক)" hint="না দিলেও বিক্রি করা যাবে" onAddParty={onAddParty}/>
          <Field label="জাত" hint={`স্টকে: ${curStock} টি`}><Sel value={sf.breed} onChange={v=>setSf({...sf,breed:v})} options={BREEDS}/></Field>
          <Field label="পরিমাণ (টি)"><Inp type="number" min="1" value={sf.quantity} onChange={v=>setSf({...sf,quantity:v})} placeholder="কতটি?"/></Field>
          <Field label="প্রতিটির দাম (৳)"><Inp type="number" value={sf.rate} onChange={v=>setSf({...sf,rate:v})} placeholder="হার"/></Field>
          {sGross>0&&(<div style={{background:C.greenLight,borderRadius:"0.7rem",padding:"0.85rem",marginBottom:"0.85rem"}}>
            {/* Gross total */}
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.6rem",paddingBottom:"0.5rem",borderBottom:`1px solid #A8D8C0`}}>
              <span style={{color:C.brown,fontWeight:600}}>মোট (গ্রস)</span>
              <span style={{fontWeight:800,color:C.green}}>{fmt(sGross)}</span>
            </div>
            {/* Paid */}
            <Field label="এখন কত পেলেন?"><Inp type="number" value={sf.paid} onChange={v=>setSf({...sf,paid:v})} placeholder={`সর্বোচ্চ ${fmt(sTotal)}`}/></Field>
            {/* Discount */}
            <Field label="ছাড় (Discount) ৳">
              <div style={{position:"relative"}}>
                <input type="number" value={sf.discount} onChange={e=>setSf({...sf,discount:e.target.value})}
                  placeholder="0" style={{...iSt,paddingRight:"2rem"}}/>
                <span style={{position:"absolute",right:"0.75rem",top:"50%",transform:"translateY(-50%)",color:C.muted,fontSize:"0.85rem",pointerEvents:"none"}}>৳</span>
              </div>
            </Field>
            {/* Net summary */}
            {(sDiscount>0||sGross>0)&&(
              <div style={{background:"#fff",borderRadius:"0.55rem",padding:"0.55rem 0.75rem",marginTop:"0.35rem"}}>
                {sDiscount>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",marginBottom:"0.25rem"}}>
                  <span style={{color:"#E65100"}}>ছাড়</span>
                  <span style={{color:"#E65100",fontWeight:700}}>− {fmt(sDiscount)}</span>
                </div>}
                <div style={{display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontWeight:700,color:C.darkBrown}}>নেট মোট</span>
                  <span style={{fontWeight:800,color:C.green,fontSize:"1.1rem"}}>{fmt(sTotal)}</span>
                </div>
                {sRem>0&&<div style={{color:C.red,fontWeight:700,fontSize:"0.85rem",marginTop:"0.35rem"}}>⚠️ বাকি: {fmt(sRem)}</div>}
              </div>
            )}
            {sRem>0&&(<div style={{background:"#FFF8F0",borderRadius:"0.6rem",padding:"0.65rem",border:"1.5px solid #F5A623",marginTop:"0.5rem"}}>
              <div style={{fontSize:"0.8rem",fontWeight:800,color:C.brown,marginBottom:"0.4rem"}}>🏪 বাকি থাকায় পার্টি তথ্য আবশ্যক</div>
              <PartySelector parties={parties} value={sf.partyId} onChange={v=>setSf({...sf,partyId:v})} typeFilter="customer" label="ক্রেতা *" onAddParty={onAddParty}/>
            </div>)}
          </div>)}
          {Number(sf.quantity)>curStock&&<div style={{color:C.red,fontSize:"0.82rem",textAlign:"center",marginBottom:"0.5rem"}}>⚠️ স্টকে পর্যাপ্ত নেই!</div>}
          <SaveBtn onClick={saveSell} disabled={!sf.quantity||!sf.rate||Number(sf.quantity)>curStock||(sRem>0&&!sf.partyId)}/>
        </Modal>
      )}

      {/* ── Sale Memo Modal ── */}
      {memoSale&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:"1rem"}}>
          <div style={{background:"#fff",width:"100%",maxWidth:400,borderRadius:"1rem",overflow:"hidden",boxShadow:"0 8px 32px rgba(0,0,0,0.25)"}}>
            {/* Memo content */}
            <div id="sale-memo" style={{padding:"1.25rem 1.5rem",fontFamily:font}}>
              {/* Business header */}
              <div style={{textAlign:"center",borderBottom:"2px dashed #ddd",paddingBottom:"0.85rem",marginBottom:"0.85rem"}}>
                <div style={{fontWeight:800,fontSize:"1.15rem",color:"#1a1a1a"}}>{(userSettings||{}).businessName||"বিক্রির রসিদ"}</div>
                {(userSettings||{}).phone&&<div style={{fontSize:"0.78rem",color:"#555",marginTop:"0.15rem"}}>📞 {userSettings.phone}</div>}
                {(userSettings||{}).name&&<div style={{fontSize:"0.72rem",color:"#777"}}>মালিক: {userSettings.name}</div>}
                <div style={{fontSize:"0.62rem",color:"#bbb",marginTop:"0.2rem"}}>🐔 টিআর পোল্ট্রি এন্ড হ্যাচারি</div>
              </div>
              {/* Sale details */}
              <div style={{marginBottom:"0.75rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",color:"#555",marginBottom:"0.3rem"}}><span>তারিখ</span><span style={{fontWeight:600,color:"#222"}}>{memoSale.date}</span></div>
                {memoSale.partyId&&pName(memoSale.partyId)!=="—"&&<div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",color:"#555",marginBottom:"0.3rem"}}><span>ক্রেতা</span><span style={{fontWeight:600,color:"#222"}}>{pName(memoSale.partyId)}</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",color:"#555",marginBottom:"0.3rem"}}><span>জাত</span><span style={{fontWeight:600,color:"#222"}}>{memoSale.breed}</span></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",color:"#555",marginBottom:"0.3rem"}}><span>পরিমাণ</span><span style={{fontWeight:600,color:"#222"}}>{memoSale.quantity} টি</span></div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.8rem",color:"#555",marginBottom:"0.3rem"}}><span>প্রতিটি দাম</span><span style={{fontWeight:600,color:"#222"}}>{fmt(memoSale.rate)}</span></div>
              </div>
              {/* Totals */}
              <div style={{borderTop:"1px solid #eee",paddingTop:"0.65rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",marginBottom:"0.2rem"}}><span style={{color:"#555"}}>মোট (গ্রস)</span><span style={{fontWeight:600}}>{fmt(memoSale.gross||memoSale.total)}</span></div>
                {(memoSale.discount||0)>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",marginBottom:"0.2rem"}}><span style={{color:"#E65100"}}>ছাড়</span><span style={{color:"#E65100",fontWeight:600}}>− {fmt(memoSale.discount)}</span></div>}
                <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,fontSize:"0.98rem",borderTop:"1px solid #eee",marginTop:"0.3rem",paddingTop:"0.4rem"}}>
                  <span>নেট মোট</span><span style={{color:"#2E7D32"}}>{fmt(memoSale.total)}</span>
                </div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",marginTop:"0.2rem"}}><span style={{color:"#555"}}>পেয়েছি</span><span style={{fontWeight:600,color:"#2E7D32"}}>{fmt(memoSale.paid||0)}</span></div>
                {(memoSale.remaining||0)>0&&<div style={{display:"flex",justifyContent:"space-between",fontSize:"0.82rem",marginTop:"0.2rem"}}><span style={{color:"#c62828"}}>বাকি</span><span style={{fontWeight:700,color:"#c62828"}}>{fmt(memoSale.remaining)}</span></div>}
              </div>
              <div style={{textAlign:"center",fontSize:"0.65rem",color:"#ccc",marginTop:"0.85rem",borderTop:"1px dashed #eee",paddingTop:"0.5rem"}}>ধন্যবাদ আবার আসবেন 🙏</div>
            </div>
            {/* Action buttons */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0",borderTop:"1px solid #eee"}}>
              <button onClick={()=>{
                const w=window.open("","_blank","width=400,height=600");
                const biz=(userSettings||{}).businessName||"বিক্রির রসিদ";
                const ph=(userSettings||{}).phone||"";
                const own=(userSettings||{}).name||"";
                w.document.write(`<html><head><meta charset="UTF-8"><title>${biz}</title><style>body{font-family:'Hind Siliguri',sans-serif;max-width:360px;margin:0 auto;padding:1.25rem}@media print{button{display:none}}</style><link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet"></head><body><div style="text-align:center;border-bottom:2px dashed #ddd;padding-bottom:0.75rem;margin-bottom:0.75rem"><div style="font-weight:800;font-size:1.2rem">${biz}</div>${ph?`<div style="font-size:0.8rem;color:#555">📞 ${ph}</div>`:""} ${own?`<div style="font-size:0.75rem;color:#777">মালিক: ${own}</div>`:""}<div style="font-size:0.65rem;color:#bbb">🐔 টিআর পোল্ট্রি এন্ড হ্যাচারি</div></div><table style="width:100%;font-size:0.85rem"><tr><td style="color:#555">তারিখ</td><td style="text-align:right;font-weight:600">${memoSale.date}</td></tr>${memoSale.partyId&&pName(memoSale.partyId)!=="—"?`<tr><td style="color:#555">ক্রেতা</td><td style="text-align:right;font-weight:600">${pName(memoSale.partyId)}</td></tr>`:""}<tr><td style="color:#555">জাত</td><td style="text-align:right;font-weight:600">${memoSale.breed}</td></tr><tr><td style="color:#555">পরিমাণ</td><td style="text-align:right;font-weight:600">${memoSale.quantity} টি</td></tr><tr><td style="color:#555">প্রতিটি</td><td style="text-align:right;font-weight:600">${memoSale.rate} ৳</td></tr></table><div style="border-top:1px solid #eee;margin-top:0.6rem;padding-top:0.5rem"><div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:#555">মোট (গ্রস)</span><span>${(memoSale.gross||memoSale.total).toLocaleString()} ৳</span></div>${(memoSale.discount||0)>0?`<div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#E65100"><span>ছাড়</span><span>− ${memoSale.discount.toLocaleString()} ৳</span></div>`:""}<div style="display:flex;justify-content:space-between;font-weight:800;font-size:1rem;border-top:1px solid #eee;margin-top:0.35rem;padding-top:0.35rem"><span>নেট মোট</span><span style="color:#2E7D32">${memoSale.total.toLocaleString()} ৳</span></div><div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:#555">পেয়েছি</span><span style="color:#2E7D32">${(memoSale.paid||0).toLocaleString()} ৳</span></div>${(memoSale.remaining||0)>0?`<div style="display:flex;justify-content:space-between;font-size:0.85rem"><span style="color:#c62828">বাকি</span><span style="color:#c62828;font-weight:700">${memoSale.remaining.toLocaleString()} ৳</span></div>`:""}</div><div style="text-align:center;font-size:0.7rem;color:#ccc;margin-top:0.85rem;border-top:1px dashed #eee;padding-top:0.5rem">ধন্যবাদ আবার আসবেন 🙏</div><br><button onclick="window.print()" style="width:100%;padding:0.6rem;background:#E65100;color:#fff;border:none;border-radius:0.5rem;font-size:1rem;cursor:pointer">🖨️ প্রিন্ট করুন</button></body></html>`);
                w.document.close();
              }} style={{padding:"0.85rem",background:"#FFF3E0",color:"#E65100",border:"none",fontWeight:700,fontSize:"0.9rem",cursor:"pointer",fontFamily:font}}>
                🖨️ প্রিন্ট করুন
              </button>
              <button onClick={()=>setMemoSale(null)} style={{padding:"0.85rem",background:C.green,color:"#fff",border:"none",fontWeight:700,fontSize:"0.9rem",cursor:"pointer",fontFamily:font}}>
                ✅ বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Hatchery Tab ────────────────────────────────────────────────
function HatcheryTab({eggInputs,hatches,parties,employees,advances,hatcheryExpenses,currentUser,sectionStats,onAddEggInput,onAddHatch,onAddHatchExpense,onChicksToShop,onAddParty,onAddEmployee,onAddAdvance,onDeleteEggInput,onDeleteHatch,onDeleteHatchExpense}){
  const [triggerEmpAdd,setTriggerEmpAdd]=useState(0);
  const [view,setView]=useState("batches");
  const [showHatchExp,setShowHatchExp]=useState(false);
  const [hef,setHef]=useState({date:today(),category:"জ্বালানি",amount:"",notes:"",paid:"",partyId:""});
  const HATCH_EXP_CATS=["জ্বালানি","বিদ্যুৎ","সরঞ্জাম","মেরামত","কর্মী খরচ","অন্যান্য"];
  const [showEgg,setShowEgg]=useState(false);
  const [showHatch,setShowHatch]=useState(false);
  const [ef,setEf]=useState({date:today(),source:"কেনা ডিম",breed:BREEDS[0],quantity:"",rate:"",partyId:""});
  const eTotal=ef.source==="কেনা ডিম"?(Number(ef.quantity)*Number(ef.rate)||0):0;
  function saveEgg(){onAddEggInput({...ef,total:eTotal,id:uid(),_by:byUser(currentUser)});setEf({date:today(),source:"কেনা ডিম",breed:BREEDS[0],quantity:"",rate:"",partyId:""});setShowEgg(false);}
  const [hf,setHf]=useState({date:today(),breed:BREEDS[0],eggsSet:"",chicksHatched:"",notes:""});
  const hatchRate=hf.eggsSet&&hf.chicksHatched?((Number(hf.chicksHatched)/Number(hf.eggsSet))*100).toFixed(1):null;
  function saveHatch(){onAddHatch({...hf,id:uid(),transferredToShop:false,_by:byUser(currentUser)});setHf({date:today(),breed:BREEDS[0],eggsSet:"",chicksHatched:"",notes:""});setShowHatch(false);}
  return(
    <div>
      <SubTabs tabs={[["batches","🐣 হ্যাচ ব্যাচ"],["eggs","🥚 ডিম ইনপুট"],["expense","💸 খরচ"],["employee","👷 কর্মী"]]} active={view} onChange={v=>{setView(v);if(v==="employee")setTimeout(()=>setTriggerEmpAdd(t=>t+1),50);}}/>
      {view==="batches"&&(
        <>
          <div style={{display:"flex",gap:"0.5rem",marginBottom:"1rem"}}><AddBtn onClick={()=>setShowEgg(true)} label="ডিম দিন"/><AddBtn onClick={()=>setShowHatch(true)} label="হ্যাচ রেকর্ড"/></div>
          {!hatches.length?<Card><p style={{textAlign:"center",color:"#bbb"}}>কোনো হ্যাচ রেকর্ড নেই</p></Card>
          :hatches.slice().reverse().map(h=>{
            const rate=h.eggsSet>0?((h.chicksHatched/h.eggsSet)*100).toFixed(1):0;
            return(
              <Card key={h.id}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.6rem"}}>
                  <div><div style={{fontWeight:800,color:C.darkBrown}}>{h.breed}</div><div style={{fontSize:"0.78rem",color:C.muted}}>{h.date}</div>{h.notes&&<div style={{fontSize:"0.78rem",color:"#aaa"}}>{h.notes}</div>}</div>
                  <div style={{background:C.greenLight,color:C.green,fontWeight:800,padding:"0.2rem 0.7rem",borderRadius:"2rem",fontSize:"0.82rem"}}>{rate}% হ্যাচ</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.4rem"}}>
                  {[["ডিম",h.eggsSet,C.primary,C.primaryLight],["বাচ্চা",h.chicksHatched,C.green,C.greenLight],["নষ্ট",Number(h.eggsSet)-Number(h.chicksHatched),"#aaa","#F5F5F5"]].map(([l,v,c,bg])=>(
                    <div key={l} style={{textAlign:"center",background:bg,borderRadius:"0.4rem",padding:"0.4rem"}}><div style={{fontSize:"0.68rem",color:"#777"}}>{l}</div><div style={{fontWeight:800,color:c}}>{v}</div></div>
                  ))}
                </div>
                {!h.transferredToShop&&Number(h.chicksHatched)>0&&<button type="button" onClick={()=>onChicksToShop(h)} style={{marginTop:"0.6rem",width:"100%",padding:"0.4rem",background:C.primaryLight,color:C.primary,border:"none",borderRadius:"0.5rem",fontSize:"0.82rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>🏪 দোকানে স্থানান্তর</button>}
                {h.transferredToShop&&<div style={{marginTop:"0.5rem",textAlign:"center",fontSize:"0.8rem",color:C.green}}>✅ দোকানে স্থানান্তরিত</div>}
              </Card>
            );
          })}
        </>
      )}
      {view==="eggs"&&<><SectionHeader title="ডিম ইনপুট" action={<AddBtn onClick={()=>setShowEgg(true)} label="ডিম যোগ"/>}/><Card><DataTable headers={["তারিখ","উৎস","জাত","পরিমাণ","খরচ"]} rows={eggInputs.slice().reverse().map(e=>[e.date,e.source,e.breed,e.quantity+"টি",e.source==="কেনা ডিম"?fmt(e.total):"—"])} records={eggInputs.slice().reverse()} onDelete={e=>{onDeleteEggInput({...e,_deletedBy:byUser(currentUser)});}} emptyMsg="কোনো ডিম নেই"/></Card></>}
      {view==="expense"&&(
        <>
          <SectionHeader title="💸 হ্যাচারির খরচ" action={<AddBtn onClick={()=>setShowHatchExp(true)} label="খরচ যোগ"/>}/>
          {hatcheryExpenses.length?(
            <Card>
              <DataTable
                headers={["তারিখ","ধরন","টাকা","নোট"]}
                rows={hatcheryExpenses.slice().reverse().map(e=>[e.date,e.category,fmt(e.amount),e.notes||"—"])}
                records={hatcheryExpenses.slice().reverse()}
                onDelete={e=>onDeleteHatchExpense({...e,_deletedBy:byUser(currentUser)})}
                emptyMsg="কোনো খরচ নেই"
              />
              <div style={{display:"flex",justifyContent:"space-between",padding:"0.6rem 0.55rem 0",borderTop:`2px solid ${C.border}`,fontWeight:800}}>
                <span style={{fontSize:"0.88rem"}}>সর্বমোট</span>
                <span style={{color:C.primary}}>{fmt(hatcheryExpenses.reduce((s,e)=>s+Number(e.amount||0),0))}</span>
              </div>
            </Card>
          ):<Card><p style={{textAlign:"center",color:"#bbb",fontSize:"0.85rem"}}>কোনো খরচ নেই</p></Card>}
        </>
      )}
      {view==="employee"&&<EmployeeSection employees={employees} advances={advances} onAddEmployee={onAddEmployee} onAddAdvance={onAddAdvance} triggerAdd={triggerEmpAdd}/>}
      {sectionStats&&<ProfitLossBar label="🥚 হ্যাচারি — লাভ/লোকসান" income={sectionStats.income} expense={sectionStats.expense} profit={sectionStats.profit}/>}
      {showHatchExp&&(
        <Modal title="হ্যাচারির খরচ 💸" onClose={()=>{setShowHatchExp(false);setHef({date:today(),category:"জ্বালানি",amount:"",notes:""});}}>
          <Field label="তারিখ"><Inp type="date" value={hef.date} onChange={v=>setHef({...hef,date:v})}/></Field>
          <Field label="খরচের ধরন">
            <Sel value={hef.category} onChange={v=>setHef({...hef,category:v})} options={HATCH_EXP_CATS}/>
          </Field>
          <Field label="টাকার পরিমাণ (৳) *">
            <div style={{position:"relative"}}>
              <input type="number" value={hef.amount} onChange={e=>setHef({...hef,amount:e.target.value})}
                placeholder="মোট খরচ" style={{...iSt,paddingRight:"2rem",fontWeight:700}}/>
              <span style={{position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",color:C.primary,fontWeight:800,fontSize:"0.85rem",pointerEvents:"none"}}>৳</span>
            </div>
          </Field>
          <Field label="নোট (ঐচ্ছিক)"><Inp value={hef.notes} onChange={v=>setHef({...hef,notes:v})} placeholder="বিস্তারিত লিখুন"/></Field>
          {Number(hef.amount)>0&&(()=>{
            const hRem=Math.max(Number(hef.amount)-Number(hef.paid||0),0);
            return(<>
              <Field label="কত দিলাম (৳) — ঐচ্ছিক">
                <Inp type="number" value={hef.paid||""} onChange={v=>setHef({...hef,paid:v})} placeholder={`সর্বোচ্চ ${fmt(Number(hef.amount))}`}/>
              </Field>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"0.5rem"}}>
                <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
                  <div style={{fontSize:"0.65rem",color:"#555"}}>দিয়েছি</div>
                  <div style={{fontWeight:800,color:C.green}}>{fmt(hef.paid||0)}</div>
                </div>
                <div style={{background:hRem>0?"#FFF0F0":C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
                  <div style={{fontSize:"0.65rem",color:"#555"}}>{hRem>0?"বাকি":"পুরো মেটানো"}</div>
                  <div style={{fontWeight:800,color:hRem>0?C.red:C.green}}>{hRem>0?fmt(hRem):"✅"}</div>
                </div>
              </div>
              {hRem>0&&(
                <div style={{background:"#FFF8F0",borderRadius:"0.6rem",padding:"0.65rem",border:"1.5px solid #F5A623",marginBottom:"0.5rem"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:C.brown,marginBottom:"0.4rem"}}>🏪 বাকি থাকায় পার্টি তথ্য আবশ্যক</div>
                  <PartySelector parties={parties||[]} value={hef.partyId||""} onChange={v=>setHef({...hef,partyId:v})} label="পার্টি *" onAddParty={onAddParty}/>
                </div>
              )}
            </>);
          })()}
          <SaveBtn onClick={()=>{
            onAddHatchExpense({...hef,amount:Number(hef.amount),id:uid(),_by:byUser(currentUser)});
            setHef({date:today(),category:"জ্বালানি",amount:"",notes:"",paid:"",partyId:""});
            setShowHatchExp(false);
          }} disabled={!hef.amount||(Math.max(Number(hef.amount)-Number(hef.paid||0),0)>0&&!hef.partyId)}/>
        </Modal>
      )}
      {showEgg&&(
        <Modal title="ডিম রেকর্ড" onClose={()=>setShowEgg(false)}>
          <Field label="তারিখ"><Inp type="date" value={ef.date} onChange={v=>setEf({...ef,date:v})}/></Field>
          <Field label="উৎস"><Sel value={ef.source} onChange={v=>setEf({...ef,source:v,rate:"",paid:"",partyId:""})} options={["কেনা ডিম","নিজের ফার্ম"]}/></Field>
          <Field label="জাত"><Sel value={ef.breed} onChange={v=>setEf({...ef,breed:v})} options={BREEDS}/></Field>
          <Field label="পরিমাণ (টি)"><Inp type="number" value={ef.quantity} onChange={v=>setEf({...ef,quantity:v})} placeholder="কতটি?"/></Field>
          {ef.source==="কেনা ডিম"&&(()=>{
            const eRem=Math.max(eTotal-Number(ef.paid||0),0);
            return(<>
              <Field label="হার (৳/টি)"><Inp type="number" value={ef.rate} onChange={v=>setEf({...ef,rate:v})} placeholder="প্রতি ডিমের দাম"/></Field>
              {eTotal>0&&(<div style={{background:C.primaryLight,borderRadius:"0.75rem",padding:"0.85rem",marginBottom:"0.75rem"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.6rem"}}><span style={{color:C.brown,fontWeight:600}}>মোট</span><span style={{fontWeight:800,color:C.primary,fontSize:"1.1rem"}}>{fmt(eTotal)}</span></div>
                <Field label="কত দিলাম (৳)"><Inp type="number" value={ef.paid} onChange={v=>setEf({...ef,paid:v})} placeholder={`সর্বোচ্চ ${fmt(eTotal)}`}/></Field>
                {ef.paid&&(<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"0.5rem"}}>
                  <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}><div style={{fontSize:"0.68rem",color:"#555"}}>দিয়েছি</div><div style={{fontWeight:800,color:C.green}}>{fmt(ef.paid)}</div></div>
                  <div style={{background:eRem>0?"#FFF0F0":C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}><div style={{fontSize:"0.68rem",color:"#555"}}>{eRem>0?"বাকি":"পুরো মেটানো"}</div><div style={{fontWeight:800,color:eRem>0?C.red:C.green}}>{eRem>0?fmt(eRem):"✅"}</div></div>
                </div>)}
                {eRem>0&&(<div style={{background:"#FFF8F0",borderRadius:"0.6rem",padding:"0.65rem",border:"1.5px solid #F5A623"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:C.brown,marginBottom:"0.4rem"}}>🏪 বাকি থাকায় পার্টি তথ্য আবশ্যক</div>
                  <PartySelector parties={parties} value={ef.partyId} onChange={v=>setEf({...ef,partyId:v})} typeFilter="supplier" label="সরবরাহকারী *" onAddParty={onAddParty}/>
                </div>)}
              </div>)}
            </>);
          })()}
          <SaveBtn onClick={saveEgg} disabled={!ef.quantity||(ef.source==="কেনা ডিম"&&eTotal>0&&Math.max(eTotal-Number(ef.paid||0),0)>0&&!ef.partyId)}/>
        </Modal>
      )}
      {showHatch&&(
        <Modal title="হ্যাচ ফলাফল" onClose={()=>setShowHatch(false)}>
          <Field label="তারিখ"><Inp type="date" value={hf.date} onChange={v=>setHf({...hf,date:v})}/></Field>
          <Field label="জাত"><Sel value={hf.breed} onChange={v=>setHf({...hf,breed:v})} options={BREEDS}/></Field>
          <Field label="ডিম (টি)"><Inp type="number" value={hf.eggsSet} onChange={v=>setHf({...hf,eggsSet:v})} placeholder="মোট ডিম"/></Field>
          <Field label="বাচ্চা (টি)"><Inp type="number" value={hf.chicksHatched} onChange={v=>setHf({...hf,chicksHatched:v})} placeholder="মোট বাচ্চা"/></Field>
          {hatchRate&&<div style={{background:C.greenLight,padding:"0.65rem",borderRadius:"0.6rem",textAlign:"center",marginBottom:"0.7rem"}}><span style={{fontWeight:800,color:C.green}}>হ্যাচ রেট: {hatchRate}%</span></div>}
          <Field label="নোট"><Inp value={hf.notes} onChange={v=>setHf({...hf,notes:v})} placeholder="ঐচ্ছিক"/></Field>
          <SaveBtn onClick={saveHatch} disabled={!hf.eggsSet||!hf.chicksHatched}/>
        </Modal>
      )}
    </div>
  );
}

// ── Flock Reports Component (FCR + Mortality) ───────────────────
function FlockReports({flocks,feedLog,mortality,deadCount}){
  // per-flock weight state for FCR calc (local only, not persisted)
  const [weights,setWeights]=useState({});

  function getFCRColor(fcr){
    if(fcr<=1.6)return{c:"#1A7F4A",bg:"#D6F5E5"};
    if(fcr<=2.0)return{c:C.green,bg:C.greenLight};
    if(fcr<=2.5)return{c:"#B8860B",bg:"#FFF8DC"};
    return{c:C.red,bg:"#FFF0F0"};
  }
  function getFCRLabel(fcr){
    if(fcr<=1.6)return"অসাধারণ 🏆";
    if(fcr<=2.0)return"ভালো ✅";
    if(fcr<=2.5)return"গড় ⚠️";
    return"খারাপ ❌";
  }

  return flocks.map(f=>{
    const totalFeed=feedLog.filter(l=>l.flockId===f.id).reduce((s,l)=>s+Number(l.feedKg||0),0);
    const dead=deadCount(f.id);
    const alive=Number(f.quantity)-dead;
    const mortalityRate=Number(f.quantity)>0?(dead/Number(f.quantity)*100):0;
    const feedPerBird=alive>0?totalFeed/alive:0;
    const sampleTotalKg=Number(weights[f.id]||""); // ১০টি মুরগির মোট ওজন
    const avgWeightPerBird=sampleTotalKg>0?sampleTotalKg/10:0; // গড় ওজন প্রতি মুরগি
    const estTotalLiveWeight=avgWeightPerBird>0?avgWeightPerBird*alive:0; // পুরো ফ্লকের আনুমানিক ওজন
    const fcr=estTotalLiveWeight>0?totalFeed/estTotalLiveWeight:null;
    const fcrStyle=fcr?getFCRColor(fcr):{c:"#aaa",bg:"#F5F5F5"};

    // mortality breakdown by reason
    const byReason={};
    mortality.filter(m=>m.flockId===f.id).forEach(m=>{
      const r=m.reason||"অজানা";
      byReason[r]=(byReason[r]||0)+Number(m.quantity);
    });

    // feed log by date for this flock
    const flockFeed=feedLog.filter(l=>l.flockId===f.id).slice().reverse();

    return(
      <Card key={f.id} style={{marginBottom:"1rem"}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",paddingBottom:"0.65rem",marginBottom:"0.65rem",borderBottom:`2px solid ${C.border}`}}>
          <div>
            <div style={{fontWeight:800,color:C.darkBrown,fontSize:"1.05rem"}}>{f.flockName?<><span style={{color:C.primary}}>{f.flockName}</span><span style={{fontWeight:600,color:"#aaa",fontSize:"0.85rem"}}> — {f.breed}</span></>:f.breed}</div>
            <div style={{fontSize:"0.78rem",color:C.muted}}>{f.type} • শুরু: {f.date}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontWeight:800,color:C.primary}}>{f.quantity} টি</div>
            <div style={{fontSize:"0.7rem",background:C.greenLight,color:C.green,padding:"0.1rem 0.45rem",borderRadius:"1rem"}}>{f.status}</div>
          </div>
        </div>

        {/* Live / Dead / Feed summary */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"0.4rem",marginBottom:"0.75rem"}}>
          {[
            ["🐔 জীবিত",alive+" টি",C.green,C.greenLight],
            ["💀 মারা",dead+" টি",dead>0?C.red:"#bbb",dead>0?"#FFF0F0":"#F5F5F5"],
            ["📉 মর্টালিটি",mortalityRate.toFixed(1)+"%",mortalityRate>5?C.red:mortalityRate>2?"#B8860B":C.green,mortalityRate>5?"#FFF0F0":mortalityRate>2?"#FFF8DC":C.greenLight],
          ].map(([l,v,c,bg])=>(
            <div key={l} style={{background:bg,borderRadius:"0.55rem",padding:"0.5rem",textAlign:"center"}}>
              <div style={{fontSize:"0.65rem",color:"#555",marginBottom:"0.1rem"}}>{l}</div>
              <div style={{fontWeight:800,color:c,fontSize:"0.95rem"}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Feed stats */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"0.75rem"}}>
          <div style={{background:"#FFFBEB",borderRadius:"0.55rem",padding:"0.55rem",textAlign:"center",border:"1px solid #F5D76E"}}>
            <div style={{fontSize:"0.65rem",color:"#7D5A00"}}>🌾 মোট খাবার</div>
            <div style={{fontWeight:800,color:"#7D5A00",fontSize:"1rem"}}>{totalFeed.toFixed(1)} kg</div>
          </div>
          <div style={{background:"#FFFBEB",borderRadius:"0.55rem",padding:"0.55rem",textAlign:"center",border:"1px solid #F5D76E"}}>
            <div style={{fontSize:"0.65rem",color:"#7D5A00"}}>🐔 প্রতি পাখিতে</div>
            <div style={{fontWeight:800,color:"#7D5A00",fontSize:"1rem"}}>{alive>0?feedPerBird.toFixed(2):"—"} kg</div>
          </div>
        </div>

        {/* FCR Calculator */}
        <div style={{background:fcrStyle.bg,borderRadius:"0.75rem",padding:"0.85rem",marginBottom:"0.75rem",border:`2px solid ${fcr?fcrStyle.c:"#DDD"}`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
            <div style={{fontWeight:800,color:C.darkBrown,fontSize:"0.85rem"}}>⚖️ FCR ক্যালকুলেটর</div>
            {fcr&&<div style={{textAlign:"center"}}>
              <div style={{fontWeight:800,color:fcrStyle.c,fontSize:"2rem",lineHeight:1}}>{fcr.toFixed(2)}</div>
              <div style={{fontSize:"0.72rem",color:fcrStyle.c,fontWeight:700}}>{getFCRLabel(fcr)}</div>
            </div>}
          </div>

          {/* Input */}
          <div style={{fontSize:"0.75rem",color:"#666",marginBottom:"0.35rem"}}>
            ১০টি মুরগির মোট ওজন লিখুন (kg) — গড় ওজন auto বের হবে
          </div>
          <div style={{position:"relative",marginBottom:"0.5rem"}}>
            <input type="number" step="0.1"
              value={weights[f.id]||""}
              onChange={e=>setWeights(w=>({...w,[f.id]:e.target.value}))}
              placeholder="যেমন: 19 (মানে ১০টি মিলে ১৯ kg)"
              style={{...iSt,paddingRight:"2.8rem",fontWeight:700}}/>
            <span style={{position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",color:C.brown,fontWeight:800,fontSize:"0.82rem",pointerEvents:"none"}}>kg</span>
          </div>

          {/* Breakdown — visible when input given */}
          {sampleTotalKg>0&&(
            <div style={{background:"#fff",borderRadius:"0.6rem",padding:"0.6rem 0.75rem",marginBottom:"0.5rem",border:`1px solid ${C.border}`}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.35rem",textAlign:"center",marginBottom:"0.4rem"}}>
                <div style={{background:"#F5F0E8",borderRadius:"0.4rem",padding:"0.35rem"}}>
                  <div style={{fontSize:"0.6rem",color:"#777"}}>১০টির মোট</div>
                  <div style={{fontWeight:800,color:C.darkBrown,fontSize:"0.88rem"}}>{sampleTotalKg} kg</div>
                </div>
                <div style={{background:"#F0F5FF",borderRadius:"0.4rem",padding:"0.35rem"}}>
                  <div style={{fontSize:"0.6rem",color:"#777"}}>গড় / মুরগি</div>
                  <div style={{fontWeight:800,color:C.blue,fontSize:"0.88rem"}}>{avgWeightPerBird.toFixed(2)} kg</div>
                </div>
                <div style={{background:C.primaryLight,borderRadius:"0.4rem",padding:"0.35rem"}}>
                  <div style={{fontSize:"0.6rem",color:"#777"}}>আনু. মোট ({alive}টি)</div>
                  <div style={{fontWeight:800,color:C.primary,fontSize:"0.88rem"}}>{estTotalLiveWeight.toFixed(1)} kg</div>
                </div>
              </div>
              <div style={{fontSize:"0.73rem",color:"#666",borderTop:`1px solid ${C.border}`,paddingTop:"0.35rem"}}>
                FCR = মোট খাবার <strong>{totalFeed.toFixed(1)} kg</strong> ÷ আনু. ওজন <strong>{estTotalLiveWeight.toFixed(1)} kg</strong>
                {fcr&&<> = <strong style={{color:fcrStyle.c}}>{fcr.toFixed(2)}</strong></>}
              </div>
            </div>
          )}

          {!sampleTotalKg&&<div style={{fontSize:"0.75rem",color:"#aaa",textAlign:"center",padding:"0.25rem 0"}}>১০টি মুরগির মোট ওজন লিখুন → FCR দেখাবে</div>}
          {fcr&&<div style={{fontSize:"0.78rem",color:fcrStyle.c,textAlign:"center",fontWeight:700,marginBottom:"0.5rem"}}>
            প্রতি kg ওজন বাড়াতে {fcr.toFixed(2)} kg খাবার লেগেছে
          </div>}

          {/* FCR scale */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:"0.25rem",marginTop:"0.4rem"}}>
            {[["≤1.6","অসাধারণ","#1A7F4A","#D6F5E5"],["1.6–2.0","ভালো",C.green,C.greenLight],["2.0–2.5","গড়","#B8860B","#FFF8DC"],["2.5+","খারাপ",C.red,"#FFF0F0"]].map(([r,l,c,bg])=>(
              <div key={r} style={{background:fcr&&(
                (r==="≤1.6"&&fcr<=1.6)||(r==="1.6–2.0"&&fcr>1.6&&fcr<=2.0)||(r==="2.0–2.5"&&fcr>2.0&&fcr<=2.5)||(r==="2.5+"&&fcr>2.5)
              )?bg+"":bg,borderRadius:"0.4rem",padding:"0.3rem",textAlign:"center",outline:fcr&&(
                (r==="≤1.6"&&fcr<=1.6)||(r==="1.6–2.0"&&fcr>1.6&&fcr<=2.0)||(r==="2.0–2.5"&&fcr>2.0&&fcr<=2.5)||(r==="2.5+"&&fcr>2.5)
              )?`2px solid ${c}`:"none"}}>
                <div style={{fontSize:"0.6rem",color:c,fontWeight:800}}>{r}</div>
                <div style={{fontSize:"0.6rem",color:"#555"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Mortality breakdown by reason */}
        {dead>0&&(
          <div style={{marginBottom:"0.75rem"}}>
            <div style={{fontWeight:700,color:C.darkBrown,fontSize:"0.85rem",marginBottom:"0.4rem"}}>💀 মৃত্যুর কারণ</div>
            {Object.entries(byReason).map(([reason,count])=>(
              <div key={reason} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.35rem 0.5rem",marginBottom:"0.25rem",background:"#FFF0F0",borderRadius:"0.4rem",fontSize:"0.8rem"}}>
                <span style={{color:C.brown}}>{reason}</span>
                <div style={{display:"flex",alignItems:"center",gap:"0.4rem"}}>
                  <div style={{height:6,width:Math.round(count/dead*80),background:C.red,borderRadius:3,minWidth:4}}/>
                  <span style={{fontWeight:800,color:C.red}}>{count} টি</span>
                  <span style={{color:"#aaa",fontSize:"0.72rem"}}>({(count/dead*100).toFixed(0)}%)</span>
                </div>
              </div>
            ))}
            {/* Daily mortality table */}
            {mortality.filter(m=>m.flockId===f.id).length>0&&(
              <div style={{marginTop:"0.5rem"}}>
                <div style={{fontWeight:700,color:C.darkBrown,fontSize:"0.8rem",marginBottom:"0.3rem"}}>দৈনিক মৃত্যু রেকর্ড</div>
                <DataTable
                  headers={["তারিখ","সংখ্যা","কারণ"]}
                  rows={mortality.filter(m=>m.flockId===f.id).slice().reverse().map(m=>[m.date,m.quantity+" টি",m.reason||"—"])}/>
              </div>
            )}
          </div>
        )}

        {/* Feed log summary */}
        {flockFeed.length>0&&(
          <div>
            <div style={{fontWeight:700,color:C.darkBrown,fontSize:"0.85rem",marginBottom:"0.4rem"}}>🌾 খাবার দেওয়ার ইতিহাস</div>
            <DataTable
              headers={["তারিখ","খাবার (kg)","পানি (L)","ওষুধ"]}
              rows={flockFeed.map(l=>[
                l.date,
                l.feedKg?l.feedKg+"":"—",
                l.waterLitre?l.waterLitre+"":"—",
                l.medName?`${l.medName} ${l.totalMedUsed}${l.medUnit}`:"—"
              ])}/>
            <div style={{background:"#FFFBEB",borderRadius:"0.5rem",padding:"0.5rem 0.75rem",marginTop:"0.4rem",display:"flex",justifyContent:"space-between",fontSize:"0.82rem",fontWeight:700}}>
              <span style={{color:"#7D5A00"}}>মোট খাবার দেওয়া হয়েছে</span>
              <span style={{color:"#7D5A00"}}>{totalFeed.toFixed(1)} kg</span>
            </div>
          </div>
        )}
        {!flockFeed.length&&<div style={{color:"#bbb",fontSize:"0.82rem",textAlign:"center",padding:"0.5rem"}}>এখনো কোনো খাবার এন্ট্রি নেই</div>}
      </Card>
    );
  });
}

// ── Farm Tab ────────────────────────────────────────────────────
function FarmTab({flocks,farmExpenses,eggRecords,flockSales,medicineStock,mortality,feedStock,feedLog,employees,advances,parties,flockPurchases,currentUser,sectionStats,onAddFlock,onAddExpense,onUpdateExpense,onDeleteExpense,onDeleteFlock,onDeleteEggRecord,onDeleteFlockSale,onDeleteMortality,onAddEggRecord,onAddFlockSale,onAddMortality,onAddFeedLog,onAddEmployee,onAddAdvance,onAddParty}){
  const [showFlock,setShowFlock]=useState(false);
  const [triggerEmpAdd,setTriggerEmpAdd]=useState(0);
  const [showExp,setShowExp]=useState(false);
  const [showEgg,setShowEgg]=useState(false);
  const [showSale,setShowSale]=useState(false);
  const [showMortality,setShowMortality]=useState(false);
  const [mortalityFlock,setMortalityFlock]=useState(null);
  const [showFeed,setShowFeed]=useState(false);
  const [feedFlock,setFeedFlock]=useState(null);

  const [ff,setFf]=useState({date:today(),type:"লেয়ার (ডিম)",breed:BREEDS[3],quantity:"",rate:"",paid:"",partyId:"",notes:"",flockName:""});
  const ffTotal=Number(ff.quantity||0)*Number(ff.rate||0);
  const ffRemaining=Math.max(ffTotal-Number(ff.paid||0),0);
  const ffExtra=Math.max(Number(ff.paid||0)-ffTotal,0);
  const medInit={medName:"",medForm:"Bottle",medUnit:"ml",medQtyPerUnit:"",medTotalUnits:"",medPaid:"",medSupplierName:"",medSupplierPhone:""};
  const feedInit={feedName:"",feedQty:"",feedUnit:"kg",feedRate:""};
  const expInit={date:today(),category:"খাবার",amount:"",notes:"",expQty:"",expRate:"",expPaid:"",expPartyId:"",...medInit,...feedInit};
  const [exf,setExf]=useState(expInit);
  const isMed=exf.category==="ওষুধ";
  const isFeed=exf.category==="খাবার";

  // Auto-calc total based on category
  const calcTotal=useMemo(()=>{
    if(isFeed&&exf.feedQty&&exf.feedRate) return Number(exf.feedQty)*Number(exf.feedRate);
    if(isMed&&exf.medTotalUnits&&exf.expRate) return Number(exf.medTotalUnits)*Number(exf.expRate);
    if((exf.category==="কর্মী খরচ"||exf.category==="বিদ্যুৎ")&&exf.amount) return Number(exf.amount);
    if(exf.expQty&&exf.expRate) return Number(exf.expQty)*Number(exf.expRate);
    return Number(exf.amount)||0;
  },[isFeed,isMed,exf.category,exf.feedQty,exf.feedRate,exf.medTotalUnits,exf.expRate,exf.expQty,exf.amount]);

  const medValid=!isMed||(exf.medName.trim()&&exf.medForm&&exf.medTotalUnits);
  const [editingExpense,setEditingExpense]=useState(null);
  function saveExpense(){
    if(editingExpense){
      onUpdateExpense({...editingExpense,...exf,amount:calcTotal,_editedBy:byUser(currentUser)});
      setEditingExpense(null);
    } else {
      onAddExpense({...exf,amount:calcTotal,id:uid(),_by:byUser(currentUser)});
    }
    setExf(expInit);
    setShowExp(false);
  }

  const [egf,setEgf]=useState({date:today(),flockId:"",quantity:""});
  const [fsf,setFsf]=useState({date:today(),type:"মুরগি",unit:"pcs",quantity:"",weightKg:"",rate:"",discount:"",paid:"",partyId:"",flockId:""});
  const fsSellQty=fsf.unit==="kg"?Number(fsf.weightKg||0):Number(fsf.quantity||0);
  const fsAutoTotal=fsSellQty>0&&fsf.rate?fsSellQty*Number(fsf.rate):0;
  const fsGross=fsAutoTotal>0?fsAutoTotal:(fsf.amount?Number(fsf.amount):0);
  const fsDiscount=Number(fsf.discount||0);
  const fsTotal=Math.max(fsGross-fsDiscount,0);
  const totalEggs=eggRecords.reduce((s,e)=>s+Number(e.quantity),0);

  // per-flock alive count
  function flockAlive(flockId){
    const fl=flocks.find(f=>f.id===flockId);
    if(!fl)return 0;
    const dead=mortality.filter(m=>m.flockId===flockId).reduce((s,m)=>s+Number(m.quantity||0),0);
    const soldPcs=flockSales.filter(s=>s.flockId===flockId&&s.type!=="ডিম"&&s.unit==="pcs").reduce((s,x)=>s+Number(x.quantity||0),0);
    return Math.max(Number(fl.quantity||0)-dead-soldPcs,0);
  }
  // egg stock per flock
  function flockEggStock(flockId){
    const collected=eggRecords.filter(e=>e.flockId===flockId).reduce((s,e)=>s+Number(e.quantity||0),0);
    const sold=flockSales.filter(s=>s.flockId===flockId&&s.type==="ডিম").reduce((s,x)=>s+Number(x.quantity||0),0);
    return Math.max(collected-sold,0);
  }
  // total egg stock (all flocks)
  const totalEggStock=eggRecords.reduce((s,e)=>s+Number(e.quantity||0),0)-flockSales.filter(s=>s.type==="ডিম").reduce((s,x)=>s+Number(x.quantity||0),0);

  // Mortality
  const [mf,setMf]=useState({date:today(),quantity:"",reason:""});
  function saveMortality(){onAddMortality({...mf,flockId:mortalityFlock.id,flockBreed:mortalityFlock.breed,id:uid(),_by:byUser(currentUser)});setMf({date:today(),quantity:"",reason:""});setShowMortality(false);setMortalityFlock(null);}
  function deadCount(flockId){return mortality.filter(m=>m.flockId===flockId).reduce((s,m)=>s+Number(m.quantity),0);}

  // Feed stock calculations — treat all purchases as kg
  const totalFeedBought=feedStock.reduce((s,x)=>s+Number(x.feedQty||0),0);
  const totalFeedGiven=feedLog.reduce((s,x)=>s+Number(x.feedKg||0),0);
  const remainingFeed=Math.max(totalFeedBought-totalFeedGiven,0);

  // Feed form — includes optional medicine dose
  const fdfInit={date:today(),feedKg:"",waterLitre:"",useMedicine:false,medicines:[]};
  const medEntryInit={medName:"",dosePerLitre:""};
  const [fdf,setFdf]=useState(fdfInit);

  // Unique medicine names from stock
  const medNames=useMemo(()=>[...new Set(medicineStock.map(m=>m.medName).filter(Boolean))],[medicineStock]);

  // Per-medicine: total bought (in base unit) and total used (from feedLog)
  const medSummary=useMemo(()=>{
    const map={};
    medicineStock.forEach(m=>{
      const key=`${m.medName}__${m.medUnit}`;
      if(!map[key])map[key]={medName:m.medName,medForm:m.medForm,medUnit:m.medUnit,medQtyPerUnit:m.medQtyPerUnit,bought:0,used:0,totalCost:0,totalPaid:0,suppliers:[]};
      const baseQty=Number(m.medTotalUnits||0)*Number(m.medQtyPerUnit||1);
      map[key].bought+=baseQty;
      // cost tracking
      const cost=Number(m.medTotalUnits||0)*Number(m.expRate||0);
      const paid=Number(m.medPaid||0);
      map[key].totalCost+=cost;
      map[key].totalPaid+=paid;
      // supplier tracking
      if(m.medSupplierName){
        const existing=map[key].suppliers.find(s=>s.name===m.medSupplierName);
        if(!existing)map[key].suppliers.push({name:m.medSupplierName,phone:m.medSupplierPhone||""});
      }
    });
    feedLog.forEach(l=>{
      if(l.medName&&l.totalMedUsed){
        const k=Object.keys(map).find(k=>k.startsWith(l.medName+"__"));
        if(k)map[k].used+=Number(l.totalMedUsed)||0;
      }
    });
    return Object.values(map).map(m=>({...m,remaining:Math.max(m.bought-m.used,0),remainingCost:Math.max(m.totalCost-m.totalPaid,0)}));
  },[medicineStock,feedLog]);

  function getMedUnit(medName){return medicineStock.find(m=>m.medName===medName)?.medUnit||"ml";}
  function getMedRemaining(medName){return medSummary.find(m=>m.medName===medName)?.remaining??null;}

  // Per-medicine calc for multi-medicine entries
  function calcMedTotal(med){return fdf.waterLitre&&med.dosePerLitre?(Number(fdf.waterLitre)*Number(med.dosePerLitre)).toFixed(2):null;}

  function saveFeedLog(){
    const entry={...fdf,flockId:feedFlock.id,flockBreed:feedFlock.breed,id:uid(),_by:byUser(currentUser)};
    // medicines array stays as-is on entry; backward compat: also set medName/totalMedUsed from first med
    if(fdf.useMedicine&&fdf.medicines?.length>0){
      const first=fdf.medicines[0];
      const t=calcMedTotal(first);
      if(t){entry.medName=first.medName;entry.totalMedUsed=Number(t);entry.medUnit=getMedUnit(first.medName);}
    }
    onAddFeedLog(entry);
    setFdf(fdfInit);
    setShowFeed(false);setFeedFlock(null);
  }

  return(
    <div>
      {/* ── Quick Action Buttons ── */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"1rem"}}>
        {[
          ["🐔 ফ্লক যোগ",()=>setShowFlock(true),C.primary,C.primaryLight],
          ["🥚 ডিম যোগ",()=>setShowEgg(true),C.green,C.greenLight],
          ["💸 খরচ যোগ",()=>setShowExp(true),"#C0392B","#FDECEA"],
          ["🛒 বিক্রি যোগ",()=>setShowSale(true),C.blue,C.blueLight],
          ["🌾 খাবার কেনা",()=>{setExf({...expInit,category:"খাবার"});setShowExp(true);},"#7D5A00","#FFFBEB"],
          ["💊 ওষুধ যোগ",()=>{setExf({...expInit,category:"ওষুধ"});setShowExp(true);},"#6B21A8","#F5F0FF"],
          ["👷 কর্মী যোগ",()=>setTriggerEmpAdd(t=>t+1),"#0F766E","#CCFBF1"],
        ].map(([label,onClick,color,bg])=>(
          <button key={label} type="button" onClick={onClick} style={{padding:"0.6rem 0.4rem",background:bg,color,border:`1.5px solid ${color}22`,borderRadius:"0.65rem",fontSize:"0.82rem",fontWeight:800,cursor:"pointer",fontFamily:font,textAlign:"center"}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── ফ্লক রিপোর্ট ── */}
      <SectionHeader title="📊 ফ্লক রিপোর্ট"/>
      {!flocks.length
        ?<Card><p style={{textAlign:"center",color:"#bbb",fontSize:"0.85rem"}}>কোনো ফ্লক নেই।</p></Card>
        :<FlockReports flocks={flocks} feedLog={feedLog} mortality={mortality} deadCount={deadCount}/>
      }

      {/* ── মুরগি (Flocks) ── */}
      <SectionHeader title="🐔 মুরগির ফ্লক" action={<AddBtn onClick={()=>setShowFlock(true)} label="ফ্লক যোগ"/>}/>
      {totalFeedBought>0&&(
        <div style={{background:"#FFFBEB",border:"1.5px solid #F5D76E",borderRadius:"0.75rem",padding:"0.6rem 1rem",marginBottom:"0.75rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:"0.82rem",color:"#7D5A00",fontWeight:700}}>🌾 মোট খাবার স্টক</span>
          <span style={{fontWeight:800,color:remainingFeed>0?"#7D5A00":C.red}}>{remainingFeed.toFixed(1)} kg বাকি</span>
        </div>
      )}
      {!flocks.length?<Card><p style={{textAlign:"center",color:"#bbb"}}>কোনো ফ্লক নেই।</p></Card>
      :flocks.map(f=>{
        const dead=deadCount(f.id);
        const alive=Number(f.quantity)-dead;
        const mortalityList=mortality.filter(m=>m.flockId===f.id).slice().reverse();
        const flockFeedLog=feedLog.filter(l=>l.flockId===f.id).slice().reverse();
        return(
          <Card key={f.id}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
              <div>
                <div style={{fontWeight:800,color:C.darkBrown,fontSize:"1rem"}}>{f.flockName?<><span style={{color:C.primary}}>{f.flockName}</span><span style={{fontWeight:600,color:"#aaa",fontSize:"0.85rem"}}> — {f.breed}</span></>:f.breed}</div>
                <div style={{fontSize:"0.8rem",color:C.muted}}>{f.type} • {f.date}</div>
                {f.notes&&<div style={{fontSize:"0.75rem",color:"#aaa"}}>{f.notes}</div>}
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:"0.68rem",color:C.muted}}>মোট</div>
                <div style={{fontWeight:800,color:C.primary,fontSize:"1.05rem"}}>{f.quantity} টি</div>
                <div style={{fontSize:"0.7rem",padding:"0.1rem 0.5rem",borderRadius:"1rem",background:C.greenLight,color:C.green,marginTop:"0.15rem"}}>{f.status}</div>
              </div>
            </div>
            {(()=>{
              const isLayer=f.type==="লেয়ার (ডিম)"||f.type==="মিক্সড";
              const flockEggs=eggRecords.filter(e=>e.flockId===f.id).reduce((s,e)=>s+Number(e.quantity||0),0);
              return isLayer?(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.4rem",marginBottom:"0.5rem"}}>
                  <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
                    <div style={{fontSize:"0.65rem",color:"#555"}}>জীবিত</div>
                    <div style={{fontWeight:800,color:C.green,fontSize:"1rem"}}>{alive} টি</div>
                  </div>
                  <div style={{background:dead>0?"#FFF0F0":"#F5F5F5",borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
                    <div style={{fontSize:"0.65rem",color:"#555"}}>মারা গেছে</div>
                    <div style={{fontWeight:800,color:dead>0?C.red:"#bbb",fontSize:"1rem"}}>{dead} টি</div>
                  </div>
                  <div style={{background:flockEggs>0?"#FFF9C4":"#F5F5F5",borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
                    <div style={{fontSize:"0.65rem",color:"#555"}}>মোট ডিম</div>
                    <div style={{fontWeight:800,color:flockEggs>0?"#7D5A00":"#bbb",fontSize:"1rem"}}>{flockEggs} টি</div>
                  </div>
                </div>
              ):(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"0.5rem"}}>
                  <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
                    <div style={{fontSize:"0.65rem",color:"#555"}}>জীবিত</div>
                    <div style={{fontWeight:800,color:C.green,fontSize:"1rem"}}>{alive} টি</div>
                  </div>
                  <div style={{background:dead>0?"#FFF0F0":"#F5F5F5",borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
                    <div style={{fontSize:"0.65rem",color:"#555"}}>মারা গেছে</div>
                    <div style={{fontWeight:800,color:dead>0?C.red:"#bbb",fontSize:"1rem"}}>{dead} টি</div>
                  </div>
                </div>
              );
            })()}
            {flockFeedLog.length>0&&(
              <div style={{background:"#FFFBEB",borderRadius:"0.5rem",padding:"0.4rem 0.6rem",marginBottom:"0.4rem"}}>
                <div style={{fontWeight:700,color:"#7D5A00",fontSize:"0.75rem",marginBottom:"0.15rem"}}>🌾 সর্বশেষ খাবার/পানি</div>
                {flockFeedLog.slice(0,2).map(l=>(
                  <div key={l.id} style={{fontSize:"0.76rem",color:"#5A4000",padding:"0.1rem 0",borderBottom:"1px solid #F0E08A"}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span>{l.date}</span>
                      <span style={{fontWeight:700}}>{l.feedKg?`🌾 ${l.feedKg} kg`:""}{l.feedKg&&l.waterLitre?" • ":""}{l.waterLitre?`💧 ${l.waterLitre} L`:""}</span>
                    </div>
                    {l.medName&&l.totalMedUsed&&<div style={{color:C.blue,fontWeight:700,fontSize:"0.72rem"}}>💊 {l.medName}: {l.totalMedUsed} {l.medUnit}</div>}
                  </div>
                ))}
              </div>
            )}
            {mortalityList.length>0&&(
              <div style={{marginBottom:"0.4rem"}}>
                {mortalityList.slice(0,2).map(m=>(
                  <div key={m.id} style={{display:"flex",justifyContent:"space-between",gap:"0.5rem",fontSize:"0.77rem",padding:"0.15rem 0",borderBottom:`1px solid ${C.border}`,color:C.muted}}>
                    <span>💀 {m.date}</span>
                    <span style={{color:C.red,fontWeight:700}}>-{m.quantity} টি</span>
                    {m.reason&&<span style={{color:"#bbb"}}>{m.reason}</span>}
                  </div>
                ))}
              </div>
            )}
            {(()=>{
              const isLayer=f.type==="লেয়ার (ডিম)"||f.type==="মিক্সড";
              return(
                <div style={{display:"grid",gridTemplateColumns:isLayer?"1fr 1fr 1fr":"1fr 1fr",gap:"0.4rem",marginTop:"0.4rem"}}>
                  <button type="button" onClick={()=>{setFeedFlock(f);setFdf({date:today(),feedKg:"",waterLitre:"",useMedicine:false,medicines:[]});setShowFeed(true);}}
                    style={{padding:"0.45rem",background:"#FFFBEB",color:"#7D5A00",border:"1.5px solid #F5D76E",borderRadius:"0.5rem",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>
                    🌾 খাবার / পানি
                  </button>
                  <button type="button" onClick={()=>{setMortalityFlock(f);setMf({date:today(),quantity:"",reason:""});setShowMortality(true);}}
                    style={{padding:"0.45rem",background:"#FFF0F0",color:C.red,border:"1.5px solid #FFCCCC",borderRadius:"0.5rem",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>
                    💀 মরা এন্ট্রি
                  </button>
                  {isLayer&&(
                    <button type="button" onClick={()=>{setEgf({date:today(),flockId:f.id,quantity:""});setShowEgg(true);}}
                      style={{padding:"0.45rem",background:"#FFF9C4",color:"#7D5A00",border:"1.5px solid #F5D76E",borderRadius:"0.5rem",fontSize:"0.8rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>
                      🥚 ডিম যোগ
                    </button>
                  )}
                </div>
              );
            })()}
          </Card>
        );
      })}

      {/* ── ডিম (Eggs) ── */}
      <SectionHeader title="🥚 ডিম উৎপাদন"/>
      {(()=>{
        const totalCollected=eggRecords.reduce((s,e)=>s+Number(e.quantity||0),0);
        const totalSoldEgg=flockSales.filter(s=>s.type==="ডিম").reduce((s,x)=>s+Number(x.quantity||0),0);
        const eggStock=Math.max(totalCollected-totalSoldEgg,0);
        if(!totalCollected)return null;
        return(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem",marginBottom:"0.75rem"}}>
            {[["সংগৃহীত",totalCollected+" টি",C.green,C.greenLight],["বিক্রি",totalSoldEgg+" টি",C.primary,C.primaryLight],["স্টকে",eggStock+" টি",eggStock>0?C.blue:C.red,eggStock>0?C.blueLight:"#FFF0F0"]].map(([l,v,c,bg])=>(
              <div key={l} style={{background:bg,borderRadius:"0.65rem",padding:"0.55rem",textAlign:"center"}}>
                <div style={{fontSize:"0.65rem",color:"#555"}}>{l}</div>
                <div style={{fontWeight:800,color:c,fontSize:"0.9rem"}}>{v}</div>
              </div>
            ))}
          </div>
        );
      })()}
      <Card><DataTable headers={["তারিখ","ফ্লক","পরিমাণ"]} rows={eggRecords.slice().reverse().map(e=>{const fl=flocks.find(f=>f.id===e.flockId);return[e.date,fl?(fl.flockName||fl.breed):"অজানা",e.quantity+" টি"];})} records={eggRecords.slice().reverse()} emptyMsg="কোনো ডিম রেকর্ড নেই"/></Card>

      {/* ── স্টক (Feed + Medicine sub-tabs) ── */}
      <SectionHeader title="📦 স্টক"/>
      {(()=>{
        const [stockTab,setStockTab]=React.useState("feed");
        return(<>
          <SubTabs tabs={[["feed","🌾 খাবার"],["medicine","💊 ওষুধ"]]} active={stockTab} onChange={setStockTab}/>
          {stockTab==="feed"&&(<>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"0.5rem"}}><AddBtn onClick={()=>{setExf({...expInit,category:"খাবার"});setShowExp(true);}} label="খাবার কেনা"/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.5rem",marginBottom:"0.75rem"}}>
              {[["কেনা",totalFeedBought.toFixed(1)+" kg","#7D5A00","#FFFBEB"],["দেওয়া",totalFeedGiven.toFixed(1)+" kg",C.primary,C.primaryLight],["বাকি",remainingFeed.toFixed(1)+" kg",remainingFeed>0?C.green:C.red,remainingFeed>0?C.greenLight:"#FFF0F0"]].map(([l,v,c,bg])=>(
                <div key={l} style={{background:bg,borderRadius:"0.75rem",padding:"0.65rem",textAlign:"center"}}>
                  <div style={{fontSize:"0.65rem",color:"#555",marginBottom:"0.1rem"}}>{l}</div>
                  <div style={{fontWeight:800,color:c,fontSize:"0.88rem"}}>{v}</div>
                </div>
              ))}
            </div>
            {feedStock.length>0&&<Card><div style={{fontWeight:700,color:C.darkBrown,marginBottom:"0.5rem",fontSize:"0.85rem"}}>ক্রয়ের তালিকা</div><DataTable headers={["তারিখ","খাবার","পরিমাণ","টাকা"]} rows={feedStock.slice().reverse().map(s=>[s.date,s.feedName||"—",`${s.feedQty} ${s.feedUnit}`,fmt(s.amount)])}/></Card>}
            {feedLog.length>0&&<Card><div style={{fontWeight:700,color:C.darkBrown,marginBottom:"0.5rem",fontSize:"0.85rem"}}>খাওয়ানোর ইতিহাস</div><DataTable headers={["তারিখ","ফ্লক","খাবার","পানি"]} rows={feedLog.slice().reverse().map(l=>[l.date,l.flockBreed||"—",l.feedKg?`${l.feedKg} kg`:"—",l.waterLitre?`${l.waterLitre} L`:"—"])} records={feedLog.slice().reverse()}/></Card>}
            {feedStock.length===0&&<Card><p style={{textAlign:"center",color:"#bbb",fontSize:"0.85rem"}}>এখনো খাবার কেনা হয়নি।</p></Card>}
          </>)}
          {stockTab==="medicine"&&(<>
            <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"0.5rem"}}><AddBtn onClick={()=>{setExf({...expInit,category:"ওষুধ"});setShowExp(true);}} label="ওষুধ যোগ"/></div>
            {!medSummary.length?<Card><p style={{textAlign:"center",color:"#bbb",fontSize:"0.85rem"}}>এখনো কোনো ওষুধ নেই।</p></Card>
            :medSummary.map((m,i)=>(
              <Card key={i}>
                {/* Name + unit badges */}
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.5rem"}}>
                  <div>
                    <div style={{fontWeight:800,color:C.darkBrown,fontSize:"1rem"}}>{m.medName}</div>
                    <div style={{display:"flex",gap:"0.4rem",marginTop:"0.3rem",flexWrap:"wrap"}}>
                      <span style={{background:C.blueLight,color:C.blue,fontSize:"0.72rem",fontWeight:700,padding:"0.1rem 0.5rem",borderRadius:"1rem"}}>{m.medForm}</span>
                      <span style={{background:"#F0F0F0",color:"#555",fontSize:"0.72rem",padding:"0.1rem 0.5rem",borderRadius:"1rem"}}>{m.medUnit}</span>
                      {m.medQtyPerUnit&&<span style={{background:"#F0F0F0",color:"#555",fontSize:"0.72rem",padding:"0.1rem 0.5rem",borderRadius:"1rem"}}>প্রতিটিতে {m.medQtyPerUnit} {m.medUnit}</span>}
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:800,color:m.remaining>0?C.blue:C.red,fontSize:"1.3rem"}}>{m.remaining.toFixed(1)}</div>
                    <div style={{fontSize:"0.72rem",color:C.muted}}>{m.medUnit} বাকি</div>
                  </div>
                </div>
                {/* Stock grid: কেনা/ব্যবহার/বাকি */}
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.35rem",fontSize:"0.72rem",textAlign:"center",marginBottom:"0.5rem"}}>
                  {[["কেনা",m.bought.toFixed(1),C.blue,C.blueLight],["ব্যবহার",m.used.toFixed(1),C.primary,C.primaryLight],["বাকি",m.remaining.toFixed(1),m.remaining>0?C.green:C.red,m.remaining>0?C.greenLight:"#FFF0F0"]].map(([l,v,c,bg])=>(
                    <div key={l} style={{background:bg,borderRadius:"0.4rem",padding:"0.35rem"}}>
                      <div style={{color:"#555"}}>{l}</div>
                      <div style={{fontWeight:800,color:c}}>{v} {m.medUnit}</div>
                    </div>
                  ))}
                </div>
                {/* Payment info */}
                {m.totalCost>0&&(
                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:"0.45rem",marginBottom:"0.4rem"}}>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.35rem",fontSize:"0.72rem",textAlign:"center"}}>
                      {[["মোট দাম",fmt(m.totalCost),C.darkBrown,"#F5F0E8"],["দিয়েছি",fmt(m.totalPaid),C.green,C.greenLight],["বাকি",fmt(m.remainingCost),m.remainingCost>0?C.red:C.green,m.remainingCost>0?"#FFF0F0":C.greenLight]].map(([l,v,c,bg])=>(
                        <div key={l} style={{background:bg,borderRadius:"0.4rem",padding:"0.35rem"}}>
                          <div style={{color:"#555"}}>{l}</div>
                          <div style={{fontWeight:800,color:c,fontSize:"0.78rem"}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* Suppliers */}
                {m.suppliers.length>0&&(
                  <div style={{background:"#FFF8F0",borderRadius:"0.5rem",padding:"0.45rem 0.6rem",border:"1px solid #F5D76E"}}>
                    <div style={{fontWeight:700,color:C.brown,fontSize:"0.73rem",marginBottom:"0.25rem"}}>🏪 সাপ্লায়ার</div>
                    {m.suppliers.map((s,j)=>(
                      <div key={j} style={{display:"flex",justifyContent:"space-between",fontSize:"0.76rem",color:C.darkBrown,padding:"0.1rem 0"}}>
                        <span style={{fontWeight:600}}>{s.name}</span>
                        {s.phone&&<a href={`tel:${s.phone}`} style={{color:C.blue,textDecoration:"none",fontWeight:700}}>{s.phone}</a>}
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </>)}
        </>);
      })()}

      {/* ── খরচ (Expenses) ── */}
      <SectionHeader title="💸 ফার্মের খরচ" action={<AddBtn onClick={()=>setShowExp(true)} label="খরচ যোগ"/>}/>
      <Card><DataTable headers={["তারিখ","ধরন","বিবরণ","টাকা"]}
        rows={farmExpenses.slice().reverse().map(e=>[e.date,e.category,
          e.category==="ওষুধ"?`${e.medName||""} ${e.medTotalUnits||""}${e.medForm?" "+e.medForm:""}`:
          e.category==="খাবার"&&e.feedName?`${e.feedName} ${e.feedQty||""}${e.feedUnit?" "+e.feedUnit:""}`:
          (e.notes||"—"),fmt(e.amount)])}
        records={farmExpenses.slice().reverse()}
        onEdit={e=>{setExf({...expInit,...e});setEditingExpense(e);setShowExp(true);}}
        onDelete={e=>{onDeleteExpense({...e,_deletedBy:byUser(currentUser)});}}
        emptyMsg="কোনো খরচ নেই"/></Card>



      {/* ── বিক্রি (Sales) ── */}
      <SectionHeader title="🛒 মুরগি / ডিম বিক্রি" action={<AddBtn onClick={()=>setShowSale(true)} label="বিক্রি যোগ"/>}/>
      <Card><DataTable headers={["তারিখ","ফ্লক","ধরন","পরিমাণ","হার","মোট","পেয়েছি","বাকি"]} rows={flockSales.slice().reverse().map(s=>{const fl=flocks.find(f=>f.id===s.flockId);return[s.date,fl?(fl.flockName||fl.breed):"—",s.type,s.unit==="kg"?`${s.weightKg}kg${s.quantity?" ("+s.quantity+"টি)":""}`:s.quantity+"টি",s.unit==="kg"?`${fmt(s.rate)}/kg`:`${fmt(s.rate)}/টি`,fmt(s.total),fmt(s.paid||0),s.remaining>0?<span style={{color:"#C0392B",fontWeight:700}}>৳{(s.remaining||0).toLocaleString()}</span>:"✅"];})} records={flockSales.slice().reverse()} onDelete={s=>{onDeleteFlockSale({...s,_deletedBy:byUser(currentUser)});}} emptyMsg="কোনো বিক্রি নেই"/></Card>


      {/* ── ফার্ম লাভ/লোকসান ── */}
      {sectionStats&&<ProfitLossBar label="🐔 ফার্ম — লাভ/লোকসান" income={sectionStats.income} expense={sectionStats.expense} profit={sectionStats.profit}/>}

      {/* ── কর্মী (Employee) ── */}
      <EmployeeSection employees={employees} advances={advances} onAddEmployee={onAddEmployee} onAddAdvance={onAddAdvance} triggerAdd={triggerEmpAdd}/>

      {/* ══ Modals ══ */}
      {showFlock&&<Modal title="নতুন ফ্লক 🐔" onClose={()=>setShowFlock(false)}>
        <Field label="তারিখ"><Inp type="date" value={ff.date} onChange={v=>setFf({...ff,date:v})}/></Field>
        <Field label="ফ্লকের নাম / নম্বর (ঐচ্ছিক)"><Inp value={ff.flockName} onChange={v=>setFf({...ff,flockName:v})} placeholder="যেমন: ফ্লক-১, বাড়ির মুরগি..."/></Field>
        <Field label="ধরন"><Sel value={ff.type} onChange={v=>setFf({...ff,type:v})} options={["লেয়ার (ডিম)","ব্রয়লার (মাংস)","মিক্সড"]}/></Field>
        <Field label="জাত"><Sel value={ff.breed} onChange={v=>setFf({...ff,breed:v})} options={BREEDS}/></Field>
        <Field label="পরিমাণ (টি)"><Inp type="number" value={ff.quantity} onChange={v=>setFf({...ff,quantity:v})} placeholder="কতটি?"/></Field>
        <div style={{background:C.primaryLight,borderRadius:"0.75rem",padding:"0.9rem",marginBottom:"0.85rem",border:`1px solid ${C.border}`}}>
          <div style={{fontWeight:800,color:C.brown,fontSize:"0.85rem",marginBottom:"0.65rem"}}>💰 দাম ও পেমেন্ট</div>
          <Field label="প্রতিটির দাম (৳)">
            <Inp type="number" value={ff.rate} onChange={v=>setFf({...ff,rate:v})} placeholder="প্রতি বাচ্চার দাম"/>
          </Field>
          {ff.quantity&&ff.rate&&(
            <div style={{background:"#fff",borderRadius:"0.5rem",padding:"0.55rem 0.75rem",border:`2px solid ${C.primary}`,textAlign:"center",marginBottom:"0.65rem"}}>
              <div style={{fontSize:"0.75rem",color:C.brown}}>{ff.quantity} টি × ৳{ff.rate}</div>
              <div style={{fontWeight:800,color:C.primary,fontSize:"1.35rem"}}>মোট = {fmt(ffTotal)}</div>
            </div>
          )}
          {ffTotal>0&&(<>
            <Field label="কত দিলাম (৳)">
              <Inp type="number" value={ff.paid} onChange={v=>setFf({...ff,paid:v})} placeholder="পরিশোধিত টাকা"/>
            </Field>
            {ffTotal>0&&(
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"0.5rem"}}>
                <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.45rem",textAlign:"center"}}>
                  <div style={{fontSize:"0.68rem",color:"#555"}}>দিয়েছি</div>
                  <div style={{fontWeight:800,color:C.green}}>{fmt(ff.paid)}</div>
                </div>
                <div style={{background:ffRemaining>0?"#FFF0F0":ffExtra>0?"#F0FFF4":C.greenLight,borderRadius:"0.5rem",padding:"0.45rem",textAlign:"center"}}>
                  <div style={{fontSize:"0.68rem",color:"#555"}}>{ffRemaining>0?"বাকি আছে":ffExtra>0?"বেশি দিয়েছি":"পুরো মেটানো"}</div>
                  <div style={{fontWeight:800,color:ffRemaining>0?C.red:ffExtra>0?"#0F766E":C.green}}>{ffRemaining>0?fmt(ffRemaining):ffExtra>0?fmt(ffExtra):"✅"}</div>
                </div>
              </div>
            )}
            {ffRemaining>0&&(
              <div style={{background:"#FFF8F0",borderRadius:"0.6rem",padding:"0.65rem",border:"1.5px solid #F5A623",marginTop:"0.25rem"}}>
                <div style={{fontSize:"0.8rem",fontWeight:800,color:C.brown,marginBottom:"0.4rem"}}>🏪 বাকি থাকায় পার্টি তথ্য আবশ্যক</div>
                <PartySelector
                  parties={parties||[]}
                  value={ff.partyId}
                  onChange={v=>setFf({...ff,partyId:v})}
                  typeFilter="supplier"
                  label="সরবরাহকারী *"
                  hint={`বাকি ${fmt(ffRemaining)} যোগ হবে পার্টির খাতায়`}
                  onAddParty={onAddParty}
                />
              </div>
            )}
            {ffExtra>0&&(
              <div style={{background:"#F0FFF4",borderRadius:"0.6rem",padding:"0.65rem",border:"1.5px solid #A8D8C0",marginTop:"0.25rem"}}>
                <div style={{fontSize:"0.8rem",fontWeight:800,color:C.green,marginBottom:"0.4rem"}}>💚 বেশি দিয়েছেন — পার্টি সিলেক্ট করুন</div>
                <PartySelector
                  parties={parties||[]}
                  value={ff.partyId}
                  onChange={v=>setFf({...ff,partyId:v})}
                  typeFilter="supplier"
                  label="সরবরাহকারী *"
                  hint={`বেশি দেওয়া ${fmt(ffExtra)} পাবো হিসেবে যোগ হবে`}
                  onAddParty={onAddParty}
                />
              </div>
            )}
          </>)}
        </div>
        <Field label="নোট"><Inp value={ff.notes} onChange={v=>setFf({...ff,notes:v})} placeholder="ঐচ্ছিক"/></Field>
        <SaveBtn onClick={()=>{
          const flock={...ff,id:uid(),status:"সক্রিয়",total:ffTotal,remaining:ffRemaining,_by:byUser(currentUser)};
          onAddFlock(flock);
          setFf({date:today(),type:"লেয়ার (ডিম)",breed:BREEDS[3],quantity:"",rate:"",paid:"",partyId:"",notes:"",flockName:""});
          setShowFlock(false);
        }} disabled={!ff.quantity||(ffRemaining>0&&!ff.partyId)}/>
      </Modal>}

      {showExp&&(
        <Modal title={editingExpense?"খরচ সম্পাদনা ✏️":isMed?"ওষুধ কেনা 💊":isFeed?"খাবার কেনা 🌾":exf.category==="কর্মী খরচ"?"কর্মী খরচ 👷":exf.category==="বিদ্যুৎ"?"বিদ্যুৎ বিল ⚡":"খরচ রেকর্ড"} onClose={()=>{setShowExp(false);setEditingExpense(null);setExf(expInit);}}>
          <Field label="তারিখ"><Inp type="date" value={exf.date} onChange={v=>setExf({...exf,date:v})}/></Field>
          <Field label="ধরন">
            <Sel value={exf.category}
              onChange={v=>setExf({...expInit,date:exf.date,category:v})}
              options={EXPENSE_CATS}/>
          </Field>

          {/* ── Feed fields ── */}
          {isFeed&&(
            <div style={{background:"#FFFBEB",borderRadius:"0.75rem",padding:"0.9rem",marginBottom:"0.85rem",border:"1.5px solid #F5D76E"}}>
              <div style={{fontWeight:800,color:"#7D5A00",fontSize:"0.85rem",marginBottom:"0.65rem"}}>🌾 খাবারের বিস্তারিত</div>
              <Field label="খাবারের নাম">
                <Inp value={exf.feedName} onChange={v=>setExf({...exf,feedName:v})} placeholder="যেমন: ব্রয়লার ফিড, ভুট্টা..."/>
              </Field>
              <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:"0.5rem",marginBottom:"0.6rem"}}>
                <Field label="পরিমাণ">
                  <Inp type="number" value={exf.feedQty} onChange={v=>setExf({...exf,feedQty:v})} placeholder="সংখ্যা"/>
                </Field>
                <Field label="একক">
                  <Sel value={exf.feedUnit} onChange={v=>setExf({...exf,feedUnit:v})} options={["kg","ব্যাগ","কেজি","মণ"]}/>
                </Field>
              </div>
              <Field label={`প্রতি ${exf.feedUnit||"kg"} দাম (৳)`}>
                <Inp type="number" value={exf.feedRate} onChange={v=>setExf({...exf,feedRate:v})} placeholder="একক দাম"/>
              </Field>
              {exf.feedQty&&exf.feedRate&&(
                <div style={{background:"#fff",borderRadius:"0.5rem",padding:"0.55rem 0.75rem",border:"2px solid #F5D76E",textAlign:"center"}}>
                  <div style={{fontSize:"0.75rem",color:"#7D5A00"}}>{exf.feedQty} {exf.feedUnit} × ৳{exf.feedRate}</div>
                  <div style={{fontWeight:800,color:"#7D5A00",fontSize:"1.25rem"}}>= {fmt(Number(exf.feedQty)*Number(exf.feedRate))}</div>
                  <div style={{fontSize:"0.72rem",color:"#aaa"}}>📦 স্টকে যাবে: {exf.feedQty} {exf.feedUnit}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Medicine fields ── */}
          {isMed&&(
            <>
              <MedicineFields
                value={{medName:exf.medName,medForm:exf.medForm,medUnit:exf.medUnit,medQtyPerUnit:exf.medQtyPerUnit,medTotalUnits:exf.medTotalUnits}}
                onChange={mv=>setExf({...exf,...mv})}/>
              {exf.medTotalUnits&&(
                <div style={{background:C.blueLight,borderRadius:"0.75rem",padding:"0.9rem",marginBottom:"0.85rem",border:"1px solid #C5D8F5"}}>
                  <div style={{fontWeight:800,color:C.blue,fontSize:"0.85rem",marginBottom:"0.65rem"}}>💰 দাম ও পেমেন্ট</div>
                  <Field label={`প্রতিটি ${exf.medForm||"unit"} দাম (৳)`}>
                    <Inp type="number" value={exf.expRate} onChange={v=>setExf({...exf,expRate:v})} placeholder="একক দাম"/>
                  </Field>
                  {exf.expRate&&(()=>{
                    const total=Number(exf.medTotalUnits)*Number(exf.expRate);
                    const paid=Number(exf.medPaid||0);
                    const remaining=total-paid;
                    return(
                      <>
                        <div style={{background:"#fff",borderRadius:"0.5rem",padding:"0.55rem 0.75rem",border:`2px solid ${C.blue}`,textAlign:"center",marginBottom:"0.6rem"}}>
                          <div style={{fontSize:"0.75rem",color:C.blue}}>{exf.medTotalUnits} {exf.medForm} × ৳{exf.expRate}</div>
                          <div style={{fontWeight:800,color:C.blue,fontSize:"1.25rem"}}>মোট = {fmt(total)}</div>
                        </div>
                        <Field label="কত দিলাম (৳)">
                          <Inp type="number" value={exf.medPaid} onChange={v=>setExf({...exf,medPaid:v})} placeholder="পরিশোধিত টাকা"/>
                        </Field>
                        {paid>0&&(
                          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"0.5rem"}}>
                            <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.45rem",textAlign:"center"}}>
                              <div style={{fontSize:"0.68rem",color:"#555"}}>দিয়েছি</div>
                              <div style={{fontWeight:800,color:C.green}}>{fmt(paid)}</div>
                            </div>
                            <div style={{background:remaining>0?"#FFF0F0":C.greenLight,borderRadius:"0.5rem",padding:"0.45rem",textAlign:"center"}}>
                              <div style={{fontSize:"0.68rem",color:"#555"}}>{remaining>0?"বাকি আছে":"পুরো দেওয়া"}</div>
                              <div style={{fontWeight:800,color:remaining>0?C.red:C.green}}>{remaining>0?fmt(remaining):"✅"}</div>
                            </div>
                          </div>
                        )}
                        {remaining>0&&(
                          <div style={{background:"#FFF8F0",borderRadius:"0.65rem",padding:"0.75rem",border:"1.5px solid #F5D76E",marginTop:"0.25rem"}}>
                            <div style={{fontWeight:800,color:C.brown,fontSize:"0.82rem",marginBottom:"0.5rem"}}>🏪 সাপ্লায়ারের তথ্য</div>
                            <Field label="সাপ্লায়ারের নাম">
                              <Inp value={exf.medSupplierName} onChange={v=>setExf({...exf,medSupplierName:v})} placeholder="যেমন: রহিম মেডিসিন"/>
                            </Field>
                            <Field label="ফোন নম্বর">
                              <Inp type="tel" value={exf.medSupplierPhone} onChange={v=>setExf({...exf,medSupplierPhone:v})} placeholder="01XXXXXXXXX"/>
                            </Field>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {/* ── Labour & Electricity: simple date + total ── */}
          {!isFeed&&!isMed&&(exf.category==="কর্মী খরচ"||exf.category==="বিদ্যুৎ")&&(
            <div style={{background:exf.category==="কর্মী খরচ"?"#F0F7FF":"#FFFBEB",borderRadius:"0.75rem",padding:"0.9rem",marginBottom:"0.85rem",border:`1.5px solid ${exf.category==="কর্মী খরচ"?"#C5D8F5":"#F5D76E"}`}}>
              <div style={{fontWeight:800,color:exf.category==="কর্মী খরচ"?C.blue:"#7D5A00",fontSize:"0.85rem",marginBottom:"0.7rem"}}>
                {exf.category==="কর্মী খরচ"?"👷 কর্মী খরচ":"⚡ বিদ্যুৎ বিল"}
              </div>
              <Field label="মোট টাকা (৳)">
                <div style={{position:"relative"}}>
                  <input type="number" value={exf.amount} onChange={e=>setExf({...exf,amount:e.target.value})}
                    placeholder={exf.category==="কর্মী খরচ"?"যেমন: 500":"যেমন: 1200"}
                    style={{...iSt,paddingRight:"2rem"}}/>
                  <span style={{position:"absolute",right:"0.75rem",top:"50%",transform:"translateY(-50%)",color:"#888",fontSize:"0.85rem",pointerEvents:"none"}}>৳</span>
                </div>
              </Field>
              {exf.category==="কর্মী খরচ"&&(
                <Field label="কাজের বিবরণ (ঐচ্ছিক)">
                  <Inp value={exf.notes} onChange={v=>setExf({...exf,notes:v})} placeholder="যেমন: ফার্ম পরিষ্কার, খাবার দেওয়া..."/>
                </Field>
              )}
              {exf.category==="বিদ্যুৎ"&&(
                <Field label="মাস / বিবরণ (ঐচ্ছিক)">
                  <Inp value={exf.notes} onChange={v=>setExf({...exf,notes:v})} placeholder="যেমন: জানুয়ারি ২০২৫"/>
                </Field>
              )}
              {Number(exf.amount)>0&&(
                <div style={{background:"#fff",borderRadius:"0.5rem",padding:"0.55rem 0.75rem",textAlign:"center",border:`2px solid ${exf.category==="কর্মী খরচ"?C.blue:"#F5D76E"}`}}>
                  <div style={{fontSize:"0.72rem",color:"#777",marginBottom:"0.1rem"}}>মোট খরচ</div>
                  <div style={{fontWeight:800,fontSize:"1.4rem",color:exf.category==="কর্মী খরচ"?C.blue:"#7D5A00"}}>{fmt(exf.amount)}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Other categories (vaccine, misc): qty × rate ── */}
          {!isFeed&&!isMed&&exf.category!=="কর্মী খরচ"&&exf.category!=="বিদ্যুৎ"&&(
            <div style={{background:C.primaryLight,borderRadius:"0.75rem",padding:"0.9rem",marginBottom:"0.85rem",border:`1px solid ${C.border}`}}>
              <div style={{fontWeight:800,color:C.brown,fontSize:"0.85rem",marginBottom:"0.7rem"}}>💰 পরিমাণ ও দাম</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.5rem"}}>
                <Field label="পরিমাণ">
                  <Inp type="number" value={exf.expQty} onChange={v=>setExf({...exf,expQty:v})} placeholder="যেমন: 5"/>
                </Field>
                <Field label="একক">
                  <Sel value={exf.expUnit||"পিস"} onChange={v=>setExf({...exf,expUnit:v})}
                    options={exf.category==="ভ্যাকসিন"?["ডোজ","বোতল","পিস","vial"]:["পিস","লিটার","kg","টি","দিন","মাস"]}/>
                </Field>
              </div>
              <Field label={`প্রতি ${exf.expUnit||"পিস"} দাম (৳)`}>
                <Inp type="number" value={exf.expRate} onChange={v=>setExf({...exf,expRate:v})} placeholder="একক দাম"/>
              </Field>
              {exf.expQty&&exf.expRate?(
                <div style={{background:"#fff",borderRadius:"0.6rem",padding:"0.65rem 0.85rem",border:`2px solid ${C.primary}`,textAlign:"center",marginBottom:"0.5rem"}}>
                  <div style={{fontSize:"0.78rem",color:C.brown,marginBottom:"0.15rem"}}>{exf.expQty} {exf.expUnit||"পিস"} × ৳{exf.expRate}</div>
                  <div style={{fontWeight:800,color:C.primary,fontSize:"1.4rem"}}>= {fmt(Number(exf.expQty)*Number(exf.expRate))}</div>
                </div>
              ):(
                <Field label="অথবা সরাসরি মোট টাকা (৳)">
                  <Inp type="number" value={exf.amount} onChange={v=>setExf({...exf,amount:v})} placeholder="মোট পরিমাণ"/>
                </Field>
              )}
              <Field label="নোট (ঐচ্ছিক)"><Inp value={exf.notes} onChange={v=>setExf({...exf,notes:v})} placeholder="বিস্তারিত লিখুন"/></Field>
            </div>
          )}

          {/* Total preview + paid + party */}
          {calcTotal>0&&(()=>{
            const expRem=Math.max(calcTotal-Number(exf.expPaid||0),0);
            return(<>
              <div style={{background:C.greenLight,borderRadius:"0.6rem",padding:"0.65rem",textAlign:"center",marginBottom:"0.65rem",border:`1.5px solid #A8D8C0`}}>
                <div style={{fontSize:"0.75rem",color:"#555",marginBottom:"0.1rem"}}>💰 মোট খরচ</div>
                <div style={{fontWeight:800,color:C.green,fontSize:"1.5rem"}}>{fmt(calcTotal)}</div>
              </div>
              <Field label="কত দিলাম (৳) — ঐচ্ছিক">
                <Inp type="number" value={exf.expPaid||""} onChange={v=>setExf({...exf,expPaid:v})} placeholder={`সর্বোচ্চ ${fmt(calcTotal)}`}/>
              </Field>
              {calcTotal>0&&(
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"0.5rem"}}>
                  <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
                    <div style={{fontSize:"0.65rem",color:"#555"}}>দিয়েছি</div>
                    <div style={{fontWeight:800,color:C.green}}>{fmt(exf.expPaid||0)}</div>
                  </div>
                  <div style={{background:expRem>0?"#FFF0F0":C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}>
                    <div style={{fontSize:"0.65rem",color:"#555"}}>{expRem>0?"বাকি":"পুরো মেটানো"}</div>
                    <div style={{fontWeight:800,color:expRem>0?C.red:C.green}}>{expRem>0?fmt(expRem):"✅"}</div>
                  </div>
                </div>
              )}
              {expRem>0&&(
                <div style={{background:"#FFF8F0",borderRadius:"0.6rem",padding:"0.65rem",border:"1.5px solid #F5A623",marginBottom:"0.65rem"}}>
                  <div style={{fontSize:"0.8rem",fontWeight:800,color:C.brown,marginBottom:"0.4rem"}}>🏪 বাকি থাকায় পার্টি তথ্য আবশ্যক</div>
                  <PartySelector parties={parties||[]} value={exf.expPartyId||""} onChange={v=>setExf({...exf,expPartyId:v})} typeFilter="supplier" label="সরবরাহকারী *" onAddParty={onAddParty}/>
                </div>
              )}
            </>);
          })()}

          <SaveBtn
            onClick={saveExpense}
            disabled={calcTotal<=0||!medValid||(Math.max(calcTotal-Number(exf.expPaid||0),0)>0&&!exf.expPartyId)}
            label={isMed?"সংরক্ষণ ও ওষুধ স্টকে যোগ":isFeed?"সংরক্ষণ ও খাবার স্টকে যোগ":"খরচ সংরক্ষণ করুন"}/>
        </Modal>
      )}

      {showEgg&&<Modal title="ডিম উৎপাদন" onClose={()=>setShowEgg(false)}>
        <Field label="তারিখ"><Inp type="date" value={egf.date} onChange={v=>setEgf({...egf,date:v})}/></Field>
        {flocks.length>0?<Field label="ফ্লক"><Sel value={egf.flockId} onChange={v=>setEgf({...egf,flockId:v})} options={flocks.map(f=>({value:f.id,label:`${f.breed} (${f.quantity}টি)`}))}/></Field>:<div style={{color:"#aaa",fontSize:"0.85rem",marginBottom:"0.75rem"}}>প্রথমে ফ্লক যোগ করুন।</div>}
        <Field label="আজকের ডিম (টি)"><Inp type="number" value={egf.quantity} onChange={v=>setEgf({...egf,quantity:v})} placeholder="কতটি?"/></Field>
        <SaveBtn onClick={()=>{onAddEggRecord({...egf,id:uid(),_by:byUser(currentUser)});setEgf({date:today(),flockId:flocks[0]?.id||"",quantity:""});setShowEgg(false);}} disabled={!egf.quantity||!egf.flockId}/>
      </Modal>}

      {showSale&&<Modal title="বিক্রির রেকর্ড" onClose={()=>setShowSale(false)}>
        <Field label="তারিখ"><Inp type="date" value={fsf.date} onChange={v=>setFsf({...fsf,date:v})}/></Field>
        <Field label="কী বিক্রি?"><Sel value={fsf.type==="অন্যান্য"||!["মুরগি","ডিম","পুরনো মুরগি"].includes(fsf.type)&&fsf.type?"অন্যান্য":fsf.type} onChange={v=>setFsf({...fsf,type:v,customType:"",flockId:"",unit:v==="ডিম"?"pcs":fsf.unit})} options={["মুরগি","ডিম","পুরনো মুরগি","অন্যান্য"]}/></Field>
        {(fsf.type==="অন্যান্য"||(fsf.type&&!["মুরগি","ডিম","পুরনো মুরগি","অন্যান্য",""].includes(fsf.type)))&&(
          <Field label="ধরনের নাম লিখুন *">
            <Inp value={fsf.customType||""} onChange={v=>setFsf({...fsf,customType:v,type:"অন্যান্য"})} placeholder="যেমন: মোরগ, হাঁস, কোয়েল..."/>
          </Field>
        )}
        {/* Flock selector — for মুরগি/পুরনো মুরগি show all flocks, for ডিম show only লেয়ার/মিক্সড */}
        {fsf.type!=="অন্যান্য"&&fsf.type&&(()=>{
          const eligibleFlocks=flocks.filter(f=>
            fsf.type==="ডিম"
              ?(f.type==="লেয়ার (ডিম)"||f.type==="মিক্সড")
              :true
          );
          if(!eligibleFlocks.length)return null;
          const selFlock=eligibleFlocks.find(f=>f.id===fsf.flockId);
          const stockInfo=fsf.flockId
            ?(fsf.type==="ডিম"
              ?`🥚 ডিম স্টক: ${flockEggStock(fsf.flockId)} টি`
              :`🐔 জীবিত: ${flockAlive(fsf.flockId)} টি`)
            :null;
          return(
            <Field label={fsf.type==="ডিম"?"কোন ফ্লকের ডিম? *":"কোন ফ্লকের মুরগি? *"}>
              <Sel value={fsf.flockId||""}
                onChange={v=>setFsf({...fsf,flockId:v,quantity:"",weightKg:""})}
                options={[{value:"",label:"— ফ্লক নির্বাচন করুন —"},...eligibleFlocks.map(f=>({
                  value:f.id,
                  label:f.flockName?`${f.flockName} — ${f.breed}`:f.breed
                }))]}/>
              {stockInfo&&(
                <div style={{marginTop:"0.35rem",background:C.greenLight,borderRadius:"0.4rem",padding:"0.3rem 0.6rem",fontSize:"0.8rem",fontWeight:700,color:C.green}}>
                  {stockInfo}
                  {fsf.type==="ডিম"&&flockEggStock(fsf.flockId)===0&&<span style={{color:C.red}}> ⚠️ স্টক নেই!</span>}
                </div>
              )}
            </Field>
          );
        })()}

        {/* Unit toggle — kg or pcs */}
        {fsf.type!=="ডিম"&&(
          <div style={{display:"flex",gap:"0.5rem",marginBottom:"0.85rem"}}>
            {[["pcs","টি (পিস)"],["kg","কেজি (kg)"]].map(([v,l])=>(
              <button key={v} type="button"
                onClick={()=>setFsf({...fsf,unit:v,quantity:"",weightKg:"",rate:"",discount:""})}
                style={{flex:1,padding:"0.5rem",borderRadius:"0.6rem",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:font,
                  background:fsf.unit===v?C.primary:"#F5F5F5",
                  color:fsf.unit===v?"#fff":"#777",
                  border:`2px solid ${fsf.unit===v?C.primary:"#DDD"}`}}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* Quantity fields */}
        {fsf.unit==="kg"?(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
            <Field label="মোট কেজি (kg)">
              <div style={{position:"relative"}}>
                <input type="number" value={fsf.weightKg} onChange={e=>setFsf({...fsf,weightKg:e.target.value})}
                  placeholder="যেমন: 45.5" style={{...iSt,paddingRight:"2.5rem"}}/>
                <span style={{position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",color:"#7D5A00",fontWeight:800,fontSize:"0.82rem",pointerEvents:"none"}}>kg</span>
              </div>
            </Field>
            <Field label="মুরগির সংখ্যা (টি)">
              <div style={{position:"relative"}}>
                <input type="number" value={fsf.quantity} onChange={e=>setFsf({...fsf,quantity:e.target.value})}
                  placeholder="ঐচ্ছিক" style={{...iSt,paddingRight:"2rem"}}/>
                <span style={{position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",color:C.muted,fontWeight:700,fontSize:"0.78rem",pointerEvents:"none"}}>টি</span>
              </div>
            </Field>
          </div>
        ):(
          <Field label={`পরিমাণ (${fsf.type==="ডিম"?"টি":"টি"})`}>
            <div style={{position:"relative"}}>
              <input type="number" value={fsf.quantity} onChange={e=>setFsf({...fsf,quantity:e.target.value})}
                placeholder="কতটি?" style={{...iSt,paddingRight:"2rem"}}/>
              <span style={{position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",color:C.muted,fontWeight:700,fontSize:"0.78rem",pointerEvents:"none"}}>টি</span>
            </div>
          </Field>
        )}

        {/* Rate — optional if amount given directly */}
        <Field label={`হার (৳/${fsf.unit==="kg"?"kg":"টি"}) — ঐচ্ছিক`}>
          <div style={{position:"relative"}}>
            <input type="number" value={fsf.rate} onChange={e=>setFsf({...fsf,rate:e.target.value,amount:""})}
              placeholder={fsf.unit==="kg"?"প্রতি কেজি দাম":"প্রতিটির দাম"} style={{...iSt,paddingRight:"2.5rem"}}/>
            <span style={{position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",color:C.muted,fontWeight:700,fontSize:"0.78rem",pointerEvents:"none"}}>৳</span>
          </div>
        </Field>

        {/* Calculation preview — read-only if auto */}
        {fsAutoTotal>0?(
          <div style={{background:C.primaryLight,borderRadius:"0.6rem",padding:"0.6rem 0.75rem",marginBottom:"0.75rem",border:`1.5px solid ${C.primary}`}}>
            <div style={{fontSize:"0.75rem",color:C.brown,marginBottom:"0.15rem"}}>
              {fsf.unit==="kg"
                ?<span>{fsf.weightKg} kg × ৳{fsf.rate}/kg{fsf.quantity?` (${fsf.quantity} টি)`:""}</span>
                :<span>{fsf.quantity} টি × ৳{fsf.rate}/টি</span>
              }
            </div>
            <div style={{fontWeight:800,color:C.primary,fontSize:"1.25rem"}}>= {fmt(fsAutoTotal)}</div>
          </div>
        ):(
          <Field label="মোট টাকা (৳) *">
            <div style={{position:"relative"}}>
              <input type="number" value={fsf.amount||""}
                onChange={e=>setFsf({...fsf,amount:e.target.value})}
                placeholder="মোট বিক্রির টাকা" style={{...iSt,paddingRight:"2rem",fontWeight:700,fontSize:"1rem"}}/>
              <span style={{position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",color:C.green,fontWeight:800,fontSize:"0.85rem",pointerEvents:"none"}}>৳</span>
            </div>
          </Field>
        )}

        {/* Discount */}
        {fsGross>0&&(
          <Field label="ছাড় (Discount) ৳ — ঐচ্ছিক">
            <div style={{position:"relative"}}>
              <input type="number" value={fsf.discount||""} onChange={e=>setFsf({...fsf,discount:e.target.value})}
                placeholder="0" style={{...iSt,paddingRight:"2rem"}}/>
              <span style={{position:"absolute",right:"0.7rem",top:"50%",transform:"translateY(-50%)",color:"#E65100",fontWeight:800,fontSize:"0.82rem",pointerEvents:"none"}}>৳</span>
            </div>
          </Field>
        )}

        {fsTotal>0&&(<div style={{background:C.greenLight,borderRadius:"0.75rem",padding:"0.85rem",marginBottom:"0.75rem"}}>
          {fsDiscount>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.35rem",fontSize:"0.82rem"}}>
            <span style={{color:"#555"}}>মোট (গ্রস)</span><span style={{fontWeight:700}}>{fmt(fsGross)}</span>
          </div>}
          {fsDiscount>0&&<div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.5rem",fontSize:"0.82rem",color:"#E65100"}}>
            <span>ছাড়</span><span style={{fontWeight:700}}>− {fmt(fsDiscount)}</span>
          </div>}
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"0.6rem",borderTop:fsDiscount>0?`1px solid #A8D8C0`:"none",paddingTop:fsDiscount>0?"0.45rem":"0"}}><span style={{color:C.darkBrown,fontWeight:700}}>নেট মোট</span><span style={{fontWeight:800,color:C.green,fontSize:"1.1rem"}}>{fmt(fsTotal)}</span></div>
          <Field label="কত পেলাম (৳)"><Inp type="number" value={fsf.paid||""} onChange={v=>setFsf({...fsf,paid:v})} placeholder={`সর্বোচ্চ ${fmt(fsTotal)}`}/></Field>
          {fsTotal>0&&(()=>{const fsRem=Math.max(fsTotal-Number(fsf.paid||0),0);return(<>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.4rem",marginBottom:"0.5rem"}}>
              <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}><div style={{fontSize:"0.68rem",color:"#555"}}>পেয়েছি</div><div style={{fontWeight:800,color:C.green}}>{fmt(fsf.paid||0)}</div></div>
              <div style={{background:fsRem>0?"#FFF0F0":C.greenLight,borderRadius:"0.5rem",padding:"0.4rem",textAlign:"center"}}><div style={{fontSize:"0.68rem",color:"#555"}}>{fsRem>0?"বাকি":"পুরো মেটানো"}</div><div style={{fontWeight:800,color:fsRem>0?C.red:C.green}}>{fsRem>0?fmt(fsRem):"✅"}</div></div>
            </div>
            {fsRem>0&&(<div style={{background:"#FFF8F0",borderRadius:"0.6rem",padding:"0.65rem",border:"1.5px solid #F5A623"}}>
              <div style={{fontSize:"0.8rem",fontWeight:800,color:C.brown,marginBottom:"0.4rem"}}>🏪 বাকি থাকায় পার্টি তথ্য আবশ্যক</div>
              <PartySelector parties={parties} value={fsf.partyId||""} onChange={v=>setFsf({...fsf,partyId:v})} typeFilter="customer" label="ক্রেতা *" onAddParty={onAddParty}/>
            </div>)}
          </>);})()}
        </div>)}
        <SaveBtn onClick={()=>{
          const fsRem=Math.max(fsTotal-Number(fsf.paid||0),0);
          const saleType=fsf.type==="অন্যান্য"?(fsf.customType||"অন্যান্য"):fsf.type;
          onAddFlockSale({...fsf,type:saleType,gross:fsGross,discount:fsDiscount,total:fsTotal,paid:Number(fsf.paid||0),remaining:fsRem,id:uid(),_by:byUser(currentUser)});
          setFsf({date:today(),type:"মুরগি",unit:"pcs",quantity:"",weightKg:"",rate:"",discount:"",paid:"",partyId:"",customType:"",flockId:""});
          setShowSale(false);
        }} disabled={!fsTotal||(Math.max(fsTotal-Number(fsf.paid||0),0)>0&&!fsf.partyId)}/>
      </Modal>}

      {/* Mortality Modal */}
      {showMortality&&mortalityFlock&&(
        <Modal title={`💀 মরা মুরগি — ${mortalityFlock.breed}`} onClose={()=>{setShowMortality(false);setMortalityFlock(null);}}>
          <div style={{background:"#FFF0F0",borderRadius:"0.7rem",padding:"0.75rem",marginBottom:"0.85rem",border:"1.5px solid #FFCCCC"}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.4rem",textAlign:"center"}}>
              {[["মোট",mortalityFlock.quantity,C.primary],["মারা",deadCount(mortalityFlock.id),C.red],["জীবিত",Number(mortalityFlock.quantity)-deadCount(mortalityFlock.id),C.green]].map(([l,v,c])=>(
                <div key={l} style={{background:"#fff",borderRadius:"0.4rem",padding:"0.4rem"}}>
                  <div style={{fontSize:"0.68rem",color:"#777"}}>{l}</div>
                  <div style={{fontWeight:800,color:c,fontSize:"1rem"}}>{v}</div>
                </div>
              ))}
            </div>
          </div>
          <Field label="তারিখ"><Inp type="date" value={mf.date} onChange={v=>setMf({...mf,date:v})}/></Field>
          <Field label="আজ কতটি মারা গেছে? *"><Inp type="number" min="1" value={mf.quantity} onChange={v=>setMf({...mf,quantity:v})} placeholder="সংখ্যা"/></Field>
          <Field label="কারণ">
            <Sel value={mf.reason} onChange={v=>setMf({...mf,reason:v})} options={[{value:"",label:"— কারণ নির্বাচন করুন —"},{value:"রোগ",label:"🤒 রোগ"},{value:"দুর্ঘটনা",label:"⚡ দুর্ঘটনা"},{value:"ঠান্ডা/গরম",label:"🌡️ ঠান্ডা/গরম"},{value:"খাবার সমস্যা",label:"🍽️ খাবার সমস্যা"},{value:"অজানা",label:"❓ অজানা"},{value:"অন্যান্য",label:"📝 অন্যান্য"}]}/>
          </Field>
          {Number(mf.quantity)>0&&<div style={{background:"#FFF0F0",borderRadius:"0.6rem",padding:"0.6rem",textAlign:"center",marginBottom:"0.5rem",fontSize:"0.85rem",color:C.red,fontWeight:700}}>এন্ট্রির পর জীবিত: {Number(mortalityFlock.quantity)-deadCount(mortalityFlock.id)-Number(mf.quantity)} টি</div>}
          <SaveBtn onClick={saveMortality} disabled={!mf.quantity} label="সংরক্ষণ করুন"/>
        </Modal>
      )}

      {/* Feed/Water Modal */}
      {showFeed&&feedFlock&&(
        <Modal title={`🌾 খাবার / পানি — ${feedFlock.breed}`} onClose={()=>{setShowFeed(false);setFeedFlock(null);}}>
          {totalFeedBought>0&&(
            <div style={{background:"#FFFBEB",borderRadius:"0.6rem",padding:"0.55rem 0.85rem",marginBottom:"0.85rem",display:"flex",justifyContent:"space-between",border:"1px solid #F5D76E"}}>
              <span style={{fontSize:"0.82rem",color:"#7D5A00",fontWeight:700}}>🌾 স্টকে আছে</span>
              <span style={{fontWeight:800,color:remainingFeed>0?"#7D5A00":C.red}}>{remainingFeed.toFixed(1)} kg</span>
            </div>
          )}
          <Field label="তারিখ"><Inp type="date" value={fdf.date} onChange={v=>setFdf({...fdf,date:v})}/></Field>

          {/* Feed */}
          <Field label="খাবার দিলেন কত kg?" hint="স্টক থেকে minus হবে">
            <div style={{position:"relative"}}>
              <input type="number" value={fdf.feedKg} onChange={e=>setFdf({...fdf,feedKg:e.target.value})}
                placeholder="যেমন: 5" style={{...iSt,paddingRight:"3rem"}}/>
              <span style={{position:"absolute",right:"0.85rem",top:"50%",transform:"translateY(-50%)",color:"#7D5A00",fontWeight:800,fontSize:"0.9rem",pointerEvents:"none"}}>kg</span>
            </div>
          </Field>
          {fdf.feedKg&&Number(fdf.feedKg)>0&&(
            <div style={{background:"#FFFBEB",borderRadius:"0.5rem",padding:"0.45rem 0.7rem",fontSize:"0.8rem",fontWeight:700,marginBottom:"0.6rem",color:"#7D5A00"}}>
              এন্ট্রির পর স্টকে থাকবে: {Math.max(remainingFeed-Number(fdf.feedKg),0).toFixed(1)} kg
              {remainingFeed-Number(fdf.feedKg)<0&&<span style={{color:C.red}}> ⚠️ স্টকের চেয়ে বেশি!</span>}
            </div>
          )}

          {/* Water */}
          <Field label="পানি দিলেন কত লিটার?">
            <div style={{position:"relative"}}>
              <input type="number" value={fdf.waterLitre} onChange={e=>setFdf({...fdf,waterLitre:e.target.value})}
                placeholder="যেমন: 10" style={{...iSt,paddingRight:"2.5rem"}}/>
              <span style={{position:"absolute",right:"0.85rem",top:"50%",transform:"translateY(-50%)",color:C.blue,fontWeight:800,fontSize:"0.9rem",pointerEvents:"none"}}>L</span>
            </div>
          </Field>

          {/* Medicine toggle */}
          <div style={{marginBottom:"0.85rem"}}>
            <button type="button"
              onClick={()=>setFdf({...fdf,useMedicine:!fdf.useMedicine,medicines:fdf.useMedicine?[]:[{medName:"",dosePerLitre:""}]})}
              style={{width:"100%",padding:"0.55rem",background:fdf.useMedicine?"#EBF2FF":"#F5F5F5",color:fdf.useMedicine?C.blue:"#777",border:`2px solid ${fdf.useMedicine?C.blue:"#DDD"}`,borderRadius:"0.6rem",fontWeight:700,fontSize:"0.88rem",cursor:"pointer",fontFamily:font,textAlign:"left"}}>
              💊 {fdf.useMedicine?"ওষুধ দিচ্ছি ✓":"ওষুধও দেবেন? (ট্যাপ করুন)"}
            </button>
          </div>

          {/* Multi-medicine section */}
          {fdf.useMedicine&&(
            <div style={{background:"#EBF2FF",borderRadius:"0.85rem",padding:"0.9rem",marginBottom:"0.85rem",border:"1.5px solid #C5D8F5"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
                <div style={{fontWeight:800,color:C.blue,fontSize:"0.85rem"}}>💊 ওষুধের ডোজ</div>
                {medNames.length>0&&<button type="button"
                  onClick={()=>setFdf({...fdf,medicines:[...(fdf.medicines||[]),{medName:"",dosePerLitre:""}]})}
                  style={{background:C.blue,color:"#fff",border:"none",borderRadius:"0.4rem",padding:"0.2rem 0.65rem",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>
                  + আরেকটি ওষুধ
                </button>}
              </div>

              {!medNames.length&&(
                <div style={{color:C.red,fontSize:"0.82rem",padding:"0.5rem",background:"#FFF0F0",borderRadius:"0.5rem"}}>
                  ⚠️ স্টকে কোনো ওষুধ নেই। আগে ওষুধ কিনুন।
                </div>
              )}

              {(fdf.medicines||[]).map((med,mi)=>{
                const mUnit=getMedUnit(med.medName);
                const mRem=getMedRemaining(med.medName);
                const mTotal=calcMedTotal(med);
                return(
                  <div key={mi} style={{background:"#fff",borderRadius:"0.65rem",padding:"0.75rem",marginBottom:"0.6rem",border:"1px solid #C5D8F5",position:"relative"}}>
                    {(fdf.medicines||[]).length>1&&(
                      <button type="button"
                        onClick={()=>setFdf({...fdf,medicines:(fdf.medicines||[]).filter((_,i)=>i!==mi)})}
                        style={{position:"absolute",top:"0.4rem",right:"0.4rem",background:"#FFF0F0",color:C.red,border:"none",borderRadius:"50%",width:"1.4rem",height:"1.4rem",fontSize:"0.75rem",cursor:"pointer",fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center"}}>
                        ✕
                      </button>
                    )}
                    <div style={{fontWeight:700,color:C.blue,fontSize:"0.78rem",marginBottom:"0.5rem"}}>ওষুধ {mi+1}</div>
                    <Field label="ওষুধের নাম (স্টক থেকে)">
                      <Sel value={med.medName}
                        onChange={v=>setFdf({...fdf,medicines:(fdf.medicines||[]).map((m,i)=>i===mi?{...m,medName:v,dosePerLitre:""}:m)})}
                        options={[{value:"",label:"— ওষুধ নির্বাচন করুন —"},...medNames.map(n=>({value:n,label:n}))]}/>
                    </Field>
                    {med.medName&&(<>
                      {mRem!==null&&(
                        <div style={{display:"flex",justifyContent:"space-between",background:"#EBF2FF",borderRadius:"0.4rem",padding:"0.35rem 0.6rem",marginBottom:"0.5rem",fontSize:"0.78rem"}}>
                          <span style={{color:C.blue,fontWeight:600}}>স্টকে আছে</span>
                          <span style={{fontWeight:800,color:mRem>0?C.blue:C.red}}>{mRem.toFixed(1)} {mUnit}</span>
                        </div>
                      )}
                      <Field label={`প্রতি লিটারে কত ${mUnit}?`}>
                        <div style={{position:"relative"}}>
                          <input type="number" value={med.dosePerLitre}
                            onChange={e=>setFdf({...fdf,medicines:(fdf.medicines||[]).map((m,i)=>i===mi?{...m,dosePerLitre:e.target.value}:m)})}
                            placeholder="যেমন: 1.5" style={{...iSt,paddingRight:"3.5rem"}}/>
                          <span style={{position:"absolute",right:"0.85rem",top:"50%",transform:"translateY(-50%)",color:C.blue,fontWeight:800,fontSize:"0.85rem",pointerEvents:"none"}}>{mUnit}/L</span>
                        </div>
                      </Field>
                      {mTotal&&fdf.waterLitre&&(
                        <div style={{background:"#EBF2FF",borderRadius:"0.5rem",padding:"0.5rem 0.7rem",fontSize:"0.82rem"}}>
                          <span style={{color:"#555"}}>{fdf.waterLitre}L × {med.dosePerLitre} = </span>
                          <span style={{fontWeight:800,color:C.blue}}>{mTotal} {mUnit}</span>
                          {mRem!==null&&Number(mTotal)>mRem
                            ?<span style={{color:C.red,fontWeight:700}}> ⚠️ বেশি!</span>
                            :mRem!==null&&<span style={{color:C.green}}> ✅ পরে থাকবে: {(mRem-Number(mTotal)).toFixed(1)} {mUnit}</span>
                          }
                        </div>
                      )}
                    </>)}
                  </div>
                );
              })}
            </div>
          )}

          <SaveBtn onClick={saveFeedLog} disabled={!fdf.feedKg&&!fdf.waterLitre} label="সংরক্ষণ করুন"/>

        </Modal>
      )}
    </div>
  );
}



// ── Dashboard ───────────────────────────────────────────────────
function Dashboard({stats,parties,shopSales,shopPurchases,flockSales,flockPurchases,employees,advances}){
  const {totalIncome,totalExpense,profit,stock,totalChicksSold,shop,hatchery,farm,sharedLabour}=stats;
  const stockEntries=BREEDS.filter(b=>(stock[b]||0)>0);

  const paboShopSale=shopSales.reduce((s,x)=>s+(x.remaining||0),0);
  const paboFarmSale=(flockSales||[]).reduce((s,x)=>s+(x.remaining||0),0);
  const totalPabo=paboShopSale+paboFarmSale;
  const deboShopBuy=shopPurchases.reduce((s,x)=>s+(x.remaining||0),0);
  const deboFarmBuy=(flockPurchases||[]).reduce((s,x)=>s+(x.remaining||0),0);
  const totalDebo=deboShopBuy+deboFarmBuy;

  function partyBal(p){
    const fromShopSale=shopSales.filter(s=>s.partyId===p.id).reduce((s,x)=>s+(x.remaining||0),0);
    const fromFarmSale=(flockSales||[]).filter(s=>s.partyId===p.id).reduce((s,x)=>s+(x.remaining||0),0);
    const fromShopBuy=shopPurchases.filter(x=>x.partyId===p.id).reduce((s,x)=>s+(x.remaining||0),0);
    const fromFarmBuy=(flockPurchases||[]).filter(x=>x.partyId===p.id).reduce((s,x)=>s+(x.remaining||0),0);
    return fromShopSale+fromFarmSale-fromShopBuy-fromFarmBuy+(p.openingBalance||0);
  }
  const sortedParties=[...parties].map(p=>({...p,bal:partyBal(p)})).filter(p=>p.bal!==0).sort((a,b)=>Math.abs(b.bal)-Math.abs(a.bal));

  // বিভাগ card helper
  function SectionPL({label,icon,s}){
    if(!s)return null;
    const isLoss=s.profit<0;
    const expEntries=Object.entries(s.expBreakdown).filter(([,v])=>v>0);
    return(
      <div style={{background:"#fff",borderRadius:"0.85rem",border:`1.5px solid ${isLoss?"#FFCCCC":"#D0EAD8"}`,marginBottom:"0.65rem",overflow:"hidden"}}>
        {/* header */}
        <div style={{background:isLoss?"#FFF0F0":C.greenLight,padding:"0.65rem 0.85rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:800,fontSize:"0.9rem",color:C.darkBrown}}>{icon} {label}</span>
          <span style={{fontWeight:800,fontSize:"1rem",color:isLoss?C.red:C.green}}>{isLoss?"📉":"📈"} {fmt(Math.abs(s.profit))}</span>
        </div>
        {/* income / expense row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",padding:"0.6rem 0.85rem"}}>
          <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.45rem",textAlign:"center"}}>
            <div style={{fontSize:"0.62rem",color:"#555"}}>💰 আয়</div>
            <div style={{fontWeight:800,color:C.green,fontSize:"0.92rem"}}>{fmt(s.income)}</div>
          </div>
          <div style={{background:C.primaryLight,borderRadius:"0.5rem",padding:"0.45rem",textAlign:"center"}}>
            <div style={{fontSize:"0.62rem",color:"#555"}}>💸 খরচ</div>
            <div style={{fontWeight:800,color:C.primary,fontSize:"0.92rem"}}>{fmt(s.expense)}</div>
          </div>
        </div>
        {/* expense breakdown */}
        {expEntries.length>0&&(
          <div style={{padding:"0 0.85rem 0.65rem"}}>
            <div style={{fontSize:"0.68rem",color:"#999",fontWeight:700,marginBottom:"0.25rem"}}>খরচের বিবরণ</div>
            {expEntries.map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:"0.78rem",padding:"0.18rem 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:"#666"}}>↳ {k}</span>
                <span style={{fontWeight:700,color:C.primary}}>{fmt(v)}</span>
              </div>
            ))}
          </div>
        )}
        {s.income>0&&<div style={{fontSize:"0.68rem",color:"#aaa",textAlign:"center",paddingBottom:"0.45rem"}}>মার্জিন: {((s.profit/s.income)*100).toFixed(1)}%</div>}
      </div>
    );
  }

  return(
    <div>
      {/* ── মোট সারাংশ ── */}
      <div style={{background:"#fff",borderRadius:"0.85rem",border:`2px solid ${profit>=0?"#A8D8C0":"#F5C6C0"}`,padding:"0.85rem",marginBottom:"0.75rem"}}>
        <div style={{fontWeight:800,color:C.darkBrown,fontSize:"0.85rem",marginBottom:"0.55rem"}}>📊 সামগ্রিক হিসাব</div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.4rem",marginBottom:"0.5rem"}}>
          <div style={{background:C.greenLight,borderRadius:"0.5rem",padding:"0.45rem",textAlign:"center"}}>
            <div style={{fontSize:"0.6rem",color:"#555"}}>💰 মোট আয়</div>
            <div style={{fontWeight:800,color:C.green,fontSize:"0.9rem"}}>{fmt(totalIncome)}</div>
          </div>
          <div style={{background:C.primaryLight,borderRadius:"0.5rem",padding:"0.45rem",textAlign:"center"}}>
            <div style={{fontSize:"0.6rem",color:"#555"}}>💸 মোট খরচ</div>
            <div style={{fontWeight:800,color:C.primary,fontSize:"0.9rem"}}>{fmt(totalExpense)}</div>
          </div>
          <div style={{background:profit>=0?C.greenLight:C.redLight,borderRadius:"0.5rem",padding:"0.45rem",textAlign:"center"}}>
            <div style={{fontSize:"0.6rem",color:"#555"}}>{profit>=0?"📈 লাভ":"📉 লোকসান"}</div>
            <div style={{fontWeight:800,color:profit>=0?C.green:C.red,fontSize:"0.9rem"}}>{fmt(Math.abs(profit))}</div>
          </div>
        </div>
        {/* income breakdown */}
        <div style={{fontSize:"0.75rem",borderTop:`1px solid ${C.border}`,paddingTop:"0.4rem"}}>
          {shopSales.length>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"0.15rem 0"}}><span style={{color:"#666"}}>↳ দোকান আয়</span><span style={{fontWeight:700,color:C.green}}>{fmt(shop?.income||0)}</span></div>}
          {flockSales.length>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"0.15rem 0"}}><span style={{color:"#666"}}>↳ ফার্ম আয়</span><span style={{fontWeight:700,color:C.green}}>{fmt(farm?.income||0)}</span></div>}
          {sharedLabour>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"0.15rem 0",marginTop:"0.1rem",borderTop:`1px dashed ${C.border}`}}><span style={{color:"#888"}}>+ সব বিভাগ কর্মী খরচ</span><span style={{fontWeight:700,color:C.primary}}>{fmt(sharedLabour)}</span></div>}
        </div>
      </div>

      {/* ── বিভাগওয়ারি হিসাব ── */}
      <div style={{fontWeight:800,color:C.darkBrown,fontSize:"0.85rem",marginBottom:"0.5rem"}}>🏢 বিভাগওয়ারি লাভ/লোকসান</div>
      <SectionPL label="দোকান" icon="🏪" s={shop}/>
      <SectionPL label="হ্যাচারি" icon="🥚" s={hatchery}/>
      <SectionPL label="ফার্ম" icon="🐔" s={farm}/>
      {sharedLabour>0&&(
        <div style={{background:"#F5F0FF",borderRadius:"0.75rem",padding:"0.65rem 0.85rem",border:"1.5px solid #D8C5F5",marginBottom:"0.75rem",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontWeight:700,color:"#7C3AED",fontSize:"0.85rem"}}>👥 সব বিভাগ কর্মী খরচ</span>
          <span style={{fontWeight:800,color:"#7C3AED"}}>{fmt(sharedLabour)}</span>
        </div>
      )}

      {/* ── পাবো / দেবো সারাংশ ── */}
      {(totalPabo>0||totalDebo>0)&&(
        <Card bg="#FFF8F0">
          <div style={{fontWeight:800,color:C.darkBrown,marginBottom:"0.6rem",fontSize:"0.9rem"}}>⚖️ পাওনা ও দেনা</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem",marginBottom:"0.65rem"}}>
            <div style={{background:C.greenLight,padding:"0.7rem",borderRadius:"0.6rem",textAlign:"center"}}>
              <div style={{fontSize:"0.7rem",color:"#555",marginBottom:"0.2rem"}}>✅ মোট পাবো</div>
              <div style={{fontWeight:800,color:C.green,fontSize:"1.15rem"}}>{fmt(totalPabo)}</div>
            </div>
            <div style={{background:C.redLight,padding:"0.7rem",borderRadius:"0.6rem",textAlign:"center"}}>
              <div style={{fontSize:"0.7rem",color:"#555",marginBottom:"0.2rem"}}>❗ মোট দেবো</div>
              <div style={{fontWeight:800,color:C.red,fontSize:"1.15rem"}}>{fmt(totalDebo)}</div>
            </div>
          </div>
          {/* বিস্তারিত ভাঙন */}
          <div style={{fontSize:"0.78rem"}}>
            {paboShopSale>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"0.3rem 0",borderBottom:`1px solid ${C.border}`}}><span style={{color:"#555"}}>↳ বাচ্চা বিক্রির বাকি (দোকান)</span><span style={{color:C.green,fontWeight:700}}>{fmt(paboShopSale)}</span></div>}
            {paboFarmSale>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"0.3rem 0",borderBottom:`1px solid ${C.border}`}}><span style={{color:"#555"}}>↳ মুরগি/ডিম বিক্রির বাকি (ফার্ম)</span><span style={{color:C.green,fontWeight:700}}>{fmt(paboFarmSale)}</span></div>}
            {deboShopBuy>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"0.3rem 0",borderBottom:`1px solid ${C.border}`}}><span style={{color:"#555"}}>↳ বাচ্চা কেনার বাকি (দোকান)</span><span style={{color:C.red,fontWeight:700}}>{fmt(deboShopBuy)}</span></div>}
            {deboFarmBuy>0&&<div style={{display:"flex",justifyContent:"space-between",padding:"0.3rem 0"}}><span style={{color:"#555"}}>↳ ফার্ম বাচ্চা কেনার বাকি</span><span style={{color:C.red,fontWeight:700}}>{fmt(deboFarmBuy)}</span></div>}
          </div>
          {totalPabo>0&&totalDebo>0&&(
            <div style={{marginTop:"0.5rem",paddingTop:"0.5rem",borderTop:`2px solid ${C.border}`,display:"flex",justifyContent:"space-between",fontWeight:800}}>
              <span style={{fontSize:"0.82rem"}}>নিট</span>
              <span style={{color:totalPabo-totalDebo>=0?C.green:C.red,fontSize:"1rem"}}>
                {totalPabo-totalDebo>=0?`পাবো ${fmt(totalPabo-totalDebo)}`:`দেবো ${fmt(totalDebo-totalPabo)}`}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* ── দোকানের স্টক ── */}
      <Card><div style={{fontWeight:800,color:C.darkBrown,marginBottom:"0.5rem"}}>📦 দোকানের স্টক</div>{stockEntries.length?stockEntries.map(b=><div key={b} style={{display:"flex",justifyContent:"space-between",padding:"0.45rem 0",borderBottom:`1px solid ${C.border}`}}><span style={{color:C.brown,fontWeight:600}}>{b}</span><span style={{background:C.primaryLight,color:C.primary,fontWeight:800,padding:"0.15rem 0.65rem",borderRadius:"2rem",fontSize:"0.88rem"}}>{stock[b]} টি</span></div>):<p style={{color:"#bbb",textAlign:"center",margin:"0.3rem 0"}}>স্টক নেই</p>}</Card>

      {/* ── পার্টি ব্যালেন্স ── */}
      <Card>
        <div style={{fontWeight:800,color:C.darkBrown,marginBottom:"0.5rem"}}>👥 পার্টি ব্যালেন্স ({parties.length})</div>
        {sortedParties.length>0?(
          <>
            {sortedParties.slice(0,8).map(p=>(
              <div key={p.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"0.4rem 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{color:C.brown,fontSize:"0.88rem",fontWeight:600}}>{p.name}</span>
                <span style={{fontWeight:700,color:p.bal>0?C.green:C.red,fontSize:"0.85rem",background:p.bal>0?C.greenLight:C.redLight,padding:"0.15rem 0.55rem",borderRadius:"1rem"}}>
                  {p.bal>0?`পাবো ${fmt(p.bal)}`:`দেবো ${fmt(Math.abs(p.bal))}`}
                </span>
              </div>
            ))}
            {sortedParties.length>8&&<div style={{textAlign:"center",fontSize:"0.75rem",color:C.muted,marginTop:"0.4rem"}}>আরও {sortedParties.length-8} জন পার্টি ট্যাবে দেখুন</div>}
          </>
        ):(
          parties.length>0
            ?<p style={{color:"#bbb",fontSize:"0.85rem",textAlign:"center",margin:"0.3rem 0"}}>সব পার্টির হিসাব মেটানো ✅</p>
            :<p style={{color:"#bbb",fontSize:"0.85rem",textAlign:"center",margin:"0.3rem 0"}}>কোনো পার্টি নেই</p>
        )}
      </Card>
      {/* ── কর্মী বিবরণ ── */}
      {(employees||[]).length>0&&(
        <Card>
          <div style={{fontWeight:800,color:C.darkBrown,marginBottom:"0.65rem"}}>👷 কর্মী বিবরণ ({employees.length} জন)</div>
          {(()=>{
            const m=new Date().toISOString().slice(0,7);
            const depts=["দোকান","হ্যাচারি","ফার্ম","সব বিভাগ","অন্যান্য"];
            const grouped={};
            employees.forEach(e=>{
              const d=e.department||"অন্যান্য";
              if(!grouped[d])grouped[d]=[];
              grouped[d].push(e);
            });
            return depts.filter(d=>grouped[d]).map(dept=>(
              <div key={dept} style={{marginBottom:"0.75rem"}}>
                <div style={{fontSize:"0.75rem",fontWeight:800,color:C.primary,background:C.primaryLight,padding:"0.2rem 0.6rem",borderRadius:"1rem",display:"inline-block",marginBottom:"0.4rem"}}>{dept}</div>
                {grouped[dept].map(emp=>{
                  const thisMonthAdv=(advances||[]).filter(a=>a.empId===emp.id&&(a.date||"").startsWith(m)).reduce((s,a)=>s+Number(a.amount||0),0);
                  const totalAdv=(advances||[]).filter(a=>a.empId===emp.id).reduce((s,a)=>s+Number(a.amount||0),0);
                  const salary=Number(emp.salary||0);
                  const remaining=Math.max(salary-thisMonthAdv,0);
                  const isOver=thisMonthAdv>salary;
                  return(
                    <div key={emp.id} style={{background:"#FAFAFA",borderRadius:"0.6rem",padding:"0.6rem 0.75rem",marginBottom:"0.4rem",border:`1px solid ${isOver?C.red:C.border}`}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"0.4rem"}}>
                        <div>
                          <span style={{fontWeight:700,color:C.darkBrown,fontSize:"0.9rem"}}>{emp.name}</span>
                          {emp.role&&<span style={{fontSize:"0.7rem",color:"#888",marginLeft:"0.4rem"}}>({emp.role})</span>}
                        </div>
                        {emp.phone&&<a href={`tel:${emp.phone}`} style={{color:C.blue,fontSize:"0.78rem",fontWeight:600,textDecoration:"none"}}>📞 {emp.phone}</a>}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.3rem",textAlign:"center"}}>
                        {[
                          ["বেতন",fmt(salary),C.green,C.greenLight],
                          ["এ মাসে দেওয়া",fmt(thisMonthAdv),isOver?C.red:C.primary,isOver?"#FFF0F0":C.primaryLight],
                          [isOver?"বেশি দেওয়া":"বাকি বেতন",fmt(isOver?thisMonthAdv-salary:remaining),isOver?C.red:C.blue,isOver?"#FFF0F0":C.blueLight],
                        ].map(([l,v,c,bg])=>(
                          <div key={l} style={{background:bg,borderRadius:"0.4rem",padding:"0.3rem"}}>
                            <div style={{fontSize:"0.6rem",color:"#777"}}>{l}</div>
                            <div style={{fontWeight:800,color:c,fontSize:"0.82rem"}}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {isOver&&<div style={{fontSize:"0.72rem",color:C.red,fontWeight:700,textAlign:"center",marginTop:"0.3rem"}}>⚠️ বেতনের চেয়ে {fmt(thisMonthAdv-salary)} বেশি দেওয়া হয়েছে</div>}
                    </div>
                  );
                })}
              </div>
            ));
          })()}
          <div style={{display:"flex",justifyContent:"space-between",padding:"0.5rem 0.2rem 0",borderTop:`2px solid ${C.border}`,marginTop:"0.25rem",fontWeight:800}}>
            <span style={{fontSize:"0.85rem"}}>মোট মাসিক বেতন</span>
            <span style={{color:C.green}}>{fmt((employees||[]).reduce((s,e)=>s+Number(e.salary||0),0))}</span>
          </div>
        </Card>
      )}
    </div>
  );
}

// ── Main App ────────────────────────────────────────────────────
const ROLE_COLORS={মালিক:[C.primary,C.primaryLight],"ম্যানেজার":[C.blue,C.blueLight],"হিসাবরক্ষক":[C.green,C.greenLight],"সুপারভাইজার":["#7C3AED","#F5F0FF"],"অন্যান্য":["#888","#F5F5F5"]};

function PinPad({targetPin,onSuccess,onBack,title,subtitle}){
  const [inp,setInp]=useState("");
  const [err,setErr]=useState("");
  const len=(targetPin||"").length||4;
  return(
    <div style={{background:"#fff",borderRadius:"1.5rem",padding:"2rem 1.5rem",width:"100%",maxWidth:360,boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
      <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
        {onBack&&<button onClick={onBack} style={{display:"block",margin:"0 auto 0.75rem",background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:"0.85rem",fontFamily:font}}>← ফিরে যান</button>}
        <div style={{fontSize:"3rem",marginBottom:"0.4rem"}}>🐔</div>
        <div style={{fontWeight:800,fontSize:"1.2rem",color:C.darkBrown}}>{title}</div>
        {subtitle&&<div style={{fontSize:"0.78rem",color:C.muted,marginTop:"0.2rem"}}>{subtitle}</div>}
      </div>
      <div style={{display:"flex",justifyContent:"center",gap:"0.65rem",marginBottom:"1.25rem"}}>
        {Array.from({length:len}).map((_,i)=>(
          <div key={i} style={{width:14,height:14,borderRadius:"50%",background:inp.length>i?C.primary:C.border,transition:"background 0.15s"}}/>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"0.6rem",marginBottom:"1rem"}}>
        {[1,2,3,4,5,6,7,8,9,"✕",0,"⌫"].map(k=>(
          <button key={k} onClick={()=>{
            if(k==="✕"){setInp("");setErr("");}
            else if(k==="⌫"){setInp(p=>p.slice(0,-1));setErr("");}
            else{
              const np=inp+k;setInp(np);
              if(np.length===len){
                if(np===targetPin){onSuccess(np);}
                else{setErr("ভুল PIN!");setTimeout(()=>{setInp("");setErr("");},800);}
              }
            }
          }} style={{padding:"0.9rem",background:k==="✕"?"#FDECEA":k==="⌫"?C.primaryLight:"#F8F8F8",border:"none",borderRadius:"0.75rem",fontSize:typeof k==="number"?"1.3rem":"1.1rem",fontWeight:700,cursor:"pointer",color:k==="✕"?C.red:C.darkBrown,fontFamily:font}}>
            {k}
          </button>
        ))}
      </div>
      {err&&<div style={{color:C.red,textAlign:"center",fontWeight:700,fontSize:"0.9rem"}}>{err}</div>}
    </div>
  );
}
const TABS=[{id:"dashboard",icon:"🏠",label:"ড্যাশবোর্ড"},{id:"shop",icon:"🏪",label:"দোকান"},{id:"party",icon:"👥",label:"পার্টি"},{id:"hatchery",icon:"🥚",label:"হ্যাচারি"},{id:"farm",icon:"🐔",label:"ফার্ম"}];

// Department-based access control
// মালিক / সব বিভাগ → সব কিছু
// দোকান → dashboard + shop + party
// হ্যাচারি → dashboard + hatchery + party
// ফার্ম → dashboard + farm + party
function getAllowedTabs(user){
  const dept=user?.department;
  if(!dept||dept==="সব বিভাগ"||user?.role==="মালিক")return["dashboard","shop","party","hatchery","farm"];
  if(dept==="দোকান")return["shop","party"];
  if(dept==="হ্যাচারি")return["hatchery","party"];
  if(dept==="ফার্ম")return["farm","party"];
  return["dashboard","shop","party","hatchery","farm"];
}
function getHomTab(user){
  const dept=user?.department;
  if(!dept||dept==="সব বিভাগ"||user?.role==="মালিক")return"dashboard";
  if(dept==="দোকান")return"shop";
  if(dept==="হ্যাচারি")return"hatchery";
  if(dept==="ফার্ম")return"farm";
  return"dashboard";
}

export default function PoultryApp(){
  const [tab,setTab]=useState("dashboard");
  const [loaded,setLoaded]=useState(false);

  // ── Firebase Auth state ──
  const [fbUser,setFbUser]=useState(null);       // Firebase Auth user (মালিক)
  const [fbUid,setFbUid]=useState(null);          // business UID (owner's uid)
  const [authScreen,setAuthScreen]=useState("checking"); // checking | firebaseLogin | selecting | pinEntry | app
  const [fbEmail,setFbEmail]=useState("");
  const [fbPassword,setFbPassword]=useState("");
  const [fbAuthErr,setFbAuthErr]=useState("");
  const [fbLoading,setFbLoading]=useState(false);
  const [isNewAccount,setIsNewAccount]=useState(false); // register mode

  // ── PIN/User state (stored in Firestore config) ──
  const [storedPin,setStoredPin]=useState(null);
  const [appUsers,setAppUsers]=useState([]);
  const [currentUser,setCurrentUser]=useState(null);
  const [selectedLoginUser,setSelectedLoginUser]=useState(null);
  const [pinInput,setPinInput]=useState("");
  const [pinError,setPinError]=useState("");
  const [setupPin,setSetupPin]=useState(false);
  const [newPin,setNewPin]=useState("");
  const [confirmPin,setConfirmPin]=useState("");
  const [showAddUser,setShowAddUser]=useState(false);
  const [newUserForm,setNewUserForm]=useState({name:"",role:"ম্যানেজার",department:"সব বিভাগ",pin:"",pin2:""});
  const [userFormErr,setUserFormErr]=useState("");
  const [confirmDlg,setConfirmDlg]=useState(null);
  function confirmDelete(msg,onYes){setConfirmDlg({msg,onYes});}
  const [parties,setParties]=useState([]);
  const [shopPurchases,setShopPurchases]=useState([]);
  const [shopSales,setShopSales]=useState([]);
  const [eggInputs,setEggInputs]=useState([]);
  const [hatches,setHatches]=useState([]);
  const [flocks,setFlocks]=useState([]);
  const [eggRecords,setEggRecords]=useState([]);
  const [farmExpenses,setFarmExpenses]=useState([]);
  const [flockSales,setFlockSales]=useState([]);
  const [medicineStock,setMedicineStock]=useState([]);
  const [mortality,setMortality]=useState([]);
  const [feedStock,setFeedStock]=useState([]);
  const [feedLog,setFeedLog]=useState([]);
  const [employees,setEmployees]=useState([]);
  const [advances,setAdvances]=useState([]);
  const [flockPurchases,setFlockPurchases]=useState([]);
  const [hatcheryExpenses,setHatcheryExpenses]=useState([]);
  const [sharedExpenses,setSharedExpenses]=useState([]);

  // ── Firebase Auth listener ──
  useEffect(()=>{
    const unsub=onAuthStateChanged(fbAuth, async user=>{
      if(user){
        setFbUser(user);
        setFbUid(user.uid);
        await loadFirestoreData(user.uid);
        setAuthScreen("selecting");
      } else {
        setFbUser(null);
        setFbUid(null);
        setLoaded(true);
        setAuthScreen("firebaseLogin");
      }
    });
    return ()=>unsub();
  },[]);

  // ── Load all data from Firestore + set up real-time listeners ──
  async function loadFirestoreData(uid){
    // Load config
    const pin=await fsGetConfig(uid,"appPin");
    const users=await fsGetConfig(uid,"appUsers")||[];
    const settings=await fsGetConfig(uid,"userSettings");
    setStoredPin(pin);
    setAppUsers(users);
    if(settings) setUserSettings(settings);

    // Load all data collections
    const keys=["parties","shopPurchases","shopSales","eggInputs","hatches","flocks","eggRecords","farmExpenses","flockSales","medicineStock","mortality","feedStock","feedLog","employees","advances","flockPurchases","hatcheryExpenses","sharedExpenses"];
    const setters=[setParties,setShopPurchases,setShopSales,setEggInputs,setHatches,setFlocks,setEggRecords,setFarmExpenses,setFlockSales,setMedicineStock,setMortality,setFeedStock,setFeedLog,setEmployees,setAdvances,setFlockPurchases,setHatcheryExpenses,setSharedExpenses];
    for(let i=0;i<keys.length;i++){const d=await fsGet(uid,keys[i]);if(d)setters[i](d);}
    setLoaded(true);
    // If no PIN set — owner goes straight to app after Firebase auth
    if(!pin&&users.length===0){
      setCurrentUser({id:"owner",name:(settings?.name)||"মালিক",role:"মালিক"});
      setAuthScreen("app");
      setTab(getHomTab({role:"মালিক"}));
    }

    // Set up real-time listeners for all collections
    keys.forEach((key,i)=>{
      fsListen(uid,key,val=>setters[i](val));
    });
    // Config listeners
    fsListenConfig(uid,"appUsers",val=>setAppUsers(val));
    fsListenConfig(uid,"appPin",val=>setStoredPin(val));
    fsListenConfig(uid,"userSettings",val=>setUserSettings(val));
  }

  // ── Firebase login handler ──
  async function handleFbLogin(){
    setFbLoading(true);setFbAuthErr("");
    try{
      if(isNewAccount){
        await createUserWithEmailAndPassword(fbAuth,fbEmail,fbPassword);
      } else {
        await signInWithEmailAndPassword(fbAuth,fbEmail,fbPassword);
      }
    } catch(e){
      const msgs={"auth/user-not-found":"ইমেইল পাওয়া যায়নি","auth/wrong-password":"পাসওয়ার্ড ভুল","auth/invalid-email":"ইমেইল সঠিক নয়","auth/email-already-in-use":"এই ইমেইল আগেই নিবন্ধিত","auth/weak-password":"পাসওয়ার্ড কমপক্ষে ৬ অক্ষর দিন","auth/invalid-credential":"ইমেইল বা পাসওয়ার্ড ভুল"};
      setFbAuthErr(msgs[e.code]||"লগইন ব্যর্থ হয়েছে: "+e.message);
    }
    setFbLoading(false);
  }

  // ── Google login ──
  async function handleGoogleLogin(){
    setFbLoading(true);setFbAuthErr("");
    try{
      const provider=new GoogleAuthProvider();
      await signInWithPopup(fbAuth,provider);
    } catch(e){
      setFbAuthErr("Google লগইন ব্যর্থ হলো");
    }
    setFbLoading(false);
  }

  // ── Logout ──
  async function handleLogout(){
    setCurrentUser(null);setLoaded(false);
    setAuthScreen("firebaseLogin");
    await signOut(fbAuth);
  }

  // ── Firestore real-time sync: save on state change ──
  const keys_data=["parties","shopPurchases","shopSales","eggInputs","hatches","flocks","eggRecords","farmExpenses","flockSales","medicineStock","mortality","feedStock","feedLog","employees","advances","flockPurchases","hatcheryExpenses","sharedExpenses"];
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"parties",parties);},[parties,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"shopPurchases",shopPurchases);},[shopPurchases,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"shopSales",shopSales);},[shopSales,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"eggInputs",eggInputs);},[eggInputs,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"hatches",hatches);},[hatches,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"flocks",flocks);},[flocks,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"eggRecords",eggRecords);},[eggRecords,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"farmExpenses",farmExpenses);},[farmExpenses,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"flockSales",flockSales);},[flockSales,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"medicineStock",medicineStock);},[medicineStock,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"mortality",mortality);},[mortality,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"feedStock",feedStock);},[feedStock,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"feedLog",feedLog);},[feedLog,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"employees",employees);},[employees,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSetConfig(fbUid,"appUsers",appUsers);},[appUsers,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"advances",advances);},[advances,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"flockPurchases",flockPurchases);},[flockPurchases,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"hatcheryExpenses",hatcheryExpenses);},[hatcheryExpenses,loaded,fbUid]);
  useEffect(()=>{if(loaded&&fbUid)fsSet(fbUid,"sharedExpenses",sharedExpenses);},[sharedExpenses,loaded,fbUid]);

  function handleAddFlock(flock){
    setFlocks(prev=>[...prev,flock]);
    if(flock.partyId&&(flock.remaining||0)!==0){
      setFlockPurchases(prev=>[...prev,{id:uid(),date:flock.date,partyId:flock.partyId,breed:flock.breed,quantity:flock.quantity,total:flock.total||0,paid:Number(flock.paid||0),remaining:flock.remaining||0}]);
    }
  }
  // When expense saved: auto-add to medicine or feed stock
  function handleAddExpense(expense){
    setFarmExpenses(prev=>[...prev,expense]);
    if(expense.category==="ওষুধ"&&expense.medName&&expense.medTotalUnits){
      setMedicineStock(prev=>[...prev,{id:uid(),date:expense.date,medName:expense.medName,medForm:expense.medForm,medUnit:expense.medUnit,medQtyPerUnit:expense.medQtyPerUnit,medTotalUnits:Number(expense.medTotalUnits),expRate:expense.expRate,medPaid:Number(expense.medPaid||0),medSupplierName:expense.medSupplierName||"",medSupplierPhone:expense.medSupplierPhone||"",cost:expense.amount}]);
    }
    if(expense.category==="খাবার"&&expense.feedQty){
      setFeedStock(prev=>[...prev,{id:uid(),date:expense.date,feedName:expense.feedName||"খাবার",feedQty:Number(expense.feedQty),feedUnit:expense.feedUnit||"kg",amount:expense.amount}]);
    }
  }

  const [showSettings,setShowSettings]=useState(false);
  const [userSettings,setUserSettings]=useState({name:"",phone:"",businessName:""});
  const [settingsLoaded,setSettingsLoaded]=useState(false);

  // userSettings loaded via loadFirestoreData on auth, so just mark loaded
  useEffect(()=>{setSettingsLoaded(true);},[fbUid]);
  useEffect(()=>{if(settingsLoaded&&fbUid)fsSetConfig(fbUid,"userSettings",userSettings);},[userSettings,settingsLoaded,fbUid]);

  const stats=useMemo(()=>{
    const sum=(arr,fn)=>arr.reduce((s,x)=>s+(fn?fn(x):x),0);
    const sumAmt=arr=>sum(arr,x=>Number(x.amount||0));
    const sumTotal=arr=>sum(arr,x=>Number(x.total||0));

    // ══ দোকান ══
    const shopBuyExp=sumTotal(shopPurchases);
    const shopLabour=sumAmt(farmExpenses.filter(e=>e.category==="কর্মী খরচ"&&e.dept==="দোকান"));
    const shopIncome=sumTotal(shopSales);
    const shopExpense=shopBuyExp+shopLabour;
    const shopProfit=shopIncome-shopExpense;

    // ══ হ্যাচারি ══
    const hatchEggExp=sumTotal(eggInputs.filter(e=>e.source==="কেনা ডিম"));
    const hatchLabour=sumAmt((hatcheryExpenses||[]).filter(e=>e.category==="কর্মী খরচ"));
    const hatchOtherExp=sumAmt((hatcheryExpenses||[]).filter(e=>e.category!=="কর্মী খরচ"));
    const hatchExpense=hatchEggExp+hatchLabour+hatchOtherExp;
    const hatchIncome=0;
    const hatchProfit=hatchIncome-hatchExpense;

    // ══ ফার্ম ══
    const farmIncome=sumTotal(flockSales);
    const farmFlockBuy=sumTotal(flockPurchases||[]);
    const farmFeed=sumAmt(farmExpenses.filter(e=>e.category==="খাবার"));
    const farmMed=sumAmt(farmExpenses.filter(e=>e.category==="ওষুধ"));
    const farmVax=sumAmt(farmExpenses.filter(e=>e.category==="ভ্যাকসিন"));
    const farmLabour=sumAmt(farmExpenses.filter(e=>e.category==="কর্মী খরচ"&&e.dept==="ফার্ম"));
    const farmElec=sumAmt(farmExpenses.filter(e=>e.category==="বিদ্যুৎ"&&e.dept!=="দোকান"));
    const farmOther=sumAmt(farmExpenses.filter(e=>e.category==="অন্যান্য"&&e.dept!=="দোকান"));
    const farmExpense=farmFlockBuy+farmFeed+farmMed+farmVax+farmLabour+farmElec+farmOther;
    const farmProfit=farmIncome-farmExpense;

    // ══ সব বিভাগ কর্মী ══
    const sharedLabour=sumAmt(sharedExpenses||[]);

    // ══ মোট ══
    const totalIncome=shopIncome+farmIncome;
    const totalExpense=shopExpense+hatchExpense+farmExpense+sharedLabour;

    const stock={};BREEDS.forEach(b=>(stock[b]=0));
    shopPurchases.forEach(p=>(stock[p.breed]=(stock[p.breed]||0)+Number(p.quantity)));
    hatches.forEach(h=>{if(h.transferredToShop)stock[h.breed]=(stock[h.breed]||0)+Number(h.chicksHatched);});
    shopSales.forEach(s=>(stock[s.breed]=(stock[s.breed]||0)-Number(s.quantity)));

    return{
      totalIncome,totalExpense,profit:totalIncome-totalExpense,
      stock,totalChicksSold:sum(shopSales,x=>Number(x.quantity)),
      shop:{
        income:shopIncome,expense:shopExpense,profit:shopProfit,
        expBreakdown:{"বাচ্চা কেনা":shopBuyExp,"কর্মী বেতন":shopLabour}
      },
      hatchery:{
        income:hatchIncome,expense:hatchExpense,profit:hatchProfit,
        expBreakdown:{"ডিম কেনা":hatchEggExp,"কর্মী বেতন":hatchLabour,"অন্যান্য খরচ":hatchOtherExp}
      },
      farm:{
        income:farmIncome,expense:farmExpense,profit:farmProfit,
        expBreakdown:{"ফ্লক কেনা":farmFlockBuy,"খাবার":farmFeed,"ওষুধ":farmMed,"ভ্যাকসিন":farmVax,"কর্মী বেতন":farmLabour,"বিদ্যুৎ":farmElec,"অন্যান্য":farmOther}
      },
      sharedLabour,
    };
  },[shopPurchases,shopSales,eggInputs,hatches,flockSales,farmExpenses,hatcheryExpenses,flockPurchases,sharedExpenses]);

  function handleAddAdvance(a){
    setAdvances(prev=>[...prev,a]);
    const emp=employees.find(e=>e.id===a.empId);
    const dept=emp?.department||"ফার্ম";
    const expEntry={id:uid(),date:a.date,category:"কর্মী খরচ",dept,amount:Number(a.amount),notes:`অগ্রিম বেতন — ${a.empName}${a.note?" ("+a.note+")":""}`};
    if(dept==="হ্যাচারি"){
      setHatcheryExpenses(prev=>[...prev,expEntry]);
    } else if(dept==="দোকান"){
      setFarmExpenses(prev=>[...prev,expEntry]); // dept:"দোকান" tag ধরে shop stats-এ যাবে
    } else if(dept==="সব বিভাগ"||dept==="অন্যান্য"){
      setSharedExpenses(prev=>[...prev,expEntry]); // dashboard total-এ আলাদা ধরা হবে
    } else {
      setFarmExpenses(prev=>[...prev,expEntry]); // ফার্ম
    }
  }
  function handleChicksToShop(hatch){
    setHatches(prev=>prev.map(h=>h.id===hatch.id?{...h,transferredToShop:true}:h));
    setShopPurchases(prev=>[...prev,{id:uid(),date:hatch.date,breed:hatch.breed,quantity:Number(hatch.chicksHatched),rate:0,total:0,partyId:"",paid:0,remaining:0}]);
  }

  // ── Firebase Login Screen ──
  if(authScreen==="firebaseLogin"||authScreen==="checking"){
    return(
      <>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.primary},${C.primaryDark})`,fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
          <div style={{background:"#fff",borderRadius:"1.5rem",padding:"2rem 1.5rem",width:"100%",maxWidth:380,boxShadow:"0 8px 40px rgba(0,0,0,0.25)"}}>
            <div style={{textAlign:"center",marginBottom:"1.75rem"}}>
              <div style={{fontSize:"3rem",marginBottom:"0.4rem"}}>🐔</div>
              <div style={{fontWeight:800,fontSize:"1.3rem",color:C.darkBrown}}>টিআর পোল্ট্রি এন্ড হ্যাচারি</div>
              <div style={{fontSize:"0.8rem",color:C.muted,marginTop:"0.25rem"}}>{isNewAccount?"নতুন একাউন্ট তৈরি করুন":"মালিক লগইন"}</div>
            </div>
            {authScreen==="checking"?(
              <div style={{textAlign:"center",color:C.muted,padding:"1rem"}}>🔄 যাচাই হচ্ছে...</div>
            ):(
              <>
                <div style={{marginBottom:"0.85rem"}}>
                  <label style={{fontSize:"0.82rem",fontWeight:700,color:C.brown,display:"block",marginBottom:"0.3rem"}}>📧 ইমেইল</label>
                  <input type="email" value={fbEmail} onChange={e=>setFbEmail(e.target.value)} placeholder="example@gmail.com"
                    style={{...iSt}} onKeyDown={e=>e.key==="Enter"&&handleFbLogin()}/>
                </div>
                <div style={{marginBottom:"1rem"}}>
                  <label style={{fontSize:"0.82rem",fontWeight:700,color:C.brown,display:"block",marginBottom:"0.3rem"}}>🔒 পাসওয়ার্ড</label>
                  <input type="password" value={fbPassword} onChange={e=>setFbPassword(e.target.value)} placeholder="কমপক্ষে ৬ অক্ষর"
                    style={{...iSt}} onKeyDown={e=>e.key==="Enter"&&handleFbLogin()}/>
                </div>
                {fbAuthErr&&<div style={{color:C.red,fontSize:"0.82rem",marginBottom:"0.75rem",padding:"0.5rem 0.75rem",background:C.redLight,borderRadius:"0.5rem"}}>{fbAuthErr}</div>}
                <button onClick={handleFbLogin} disabled={fbLoading||!fbEmail||!fbPassword}
                  style={{width:"100%",padding:"0.85rem",background:fbLoading||!fbEmail||!fbPassword?"#D0C0B0":`linear-gradient(135deg,${C.primary},${C.primaryDark})`,color:"#fff",border:"none",borderRadius:"0.75rem",fontWeight:800,fontSize:"1rem",cursor:fbLoading?"wait":"pointer",fontFamily:font,marginBottom:"0.75rem"}}>
                  {fbLoading?"⏳ অপেক্ষা করুন...":(isNewAccount?"✅ একাউন্ট তৈরি করুন":"🔓 লগইন করুন")}
                </button>
                <button onClick={handleGoogleLogin} disabled={fbLoading}
                  style={{width:"100%",padding:"0.75rem",background:"#fff",color:"#444",border:"1.5px solid #ddd",borderRadius:"0.75rem",fontWeight:700,fontSize:"0.92rem",cursor:"pointer",fontFamily:font,marginBottom:"0.85rem",display:"flex",alignItems:"center",justifyContent:"center",gap:"0.5rem"}}>
                  <span style={{fontSize:"1.1rem"}}>G</span> Google দিয়ে লগইন
                </button>
                <div style={{textAlign:"center"}}>
                  <button onClick={()=>{setIsNewAccount(!isNewAccount);setFbAuthErr("");}}
                    style={{background:"none",border:"none",color:C.primary,fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:font}}>
                    {isNewAccount?"আগেই একাউন্ট আছে? লগইন করুন":"নতুন ব্যবহারকারী? নিবন্ধন করুন"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </>
    );
  }

  if(!loaded) return(
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.cream,fontFamily:font,color:C.primary,flexDirection:"column",gap:"0.5rem"}}>
      <span style={{fontSize:"2.5rem"}}>🐣</span><span style={{fontSize:"1.1rem",fontWeight:700}}>ডেটা লোড হচ্ছে...</span>
    </div>
  );

  // ── PIN Setup screen ──
  if(authScreen==="app"&&setupPin){
    return(
      <>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{minHeight:"100vh",background:C.cream,fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
          <div style={{background:"#fff",borderRadius:"1.25rem",padding:"2rem 1.5rem",width:"100%",maxWidth:360,boxShadow:"0 4px 24px rgba(0,0,0,0.1)"}}>
            <div style={{textAlign:"center",marginBottom:"1.5rem"}}>
              <div style={{fontSize:"2.5rem",marginBottom:"0.5rem"}}>🔐</div>
              <div style={{fontWeight:800,fontSize:"1.2rem",color:C.darkBrown}}>মালিকের PIN সেট করুন</div>
              <div style={{fontSize:"0.8rem",color:C.muted,marginTop:"0.3rem"}}>৪-৬ সংখ্যার পিন দিন</div>
            </div>
            <div style={{marginBottom:"1rem"}}>
              <label style={{fontSize:"0.82rem",fontWeight:700,color:C.brown,display:"block",marginBottom:"0.35rem"}}>নতুন PIN</label>
              <input type="password" inputMode="numeric" maxLength={6} value={newPin} onChange={e=>setNewPin(e.target.value.replace(/\D/g,""))}
                placeholder="যেমন: 1234" style={{...iSt,fontSize:"1.2rem",letterSpacing:"0.3rem",textAlign:"center"}}/>
            </div>
            <div style={{marginBottom:"1.25rem"}}>
              <label style={{fontSize:"0.82rem",fontWeight:700,color:C.brown,display:"block",marginBottom:"0.35rem"}}>আবার দিন</label>
              <input type="password" inputMode="numeric" maxLength={6} value={confirmPin} onChange={e=>setConfirmPin(e.target.value.replace(/\D/g,""))}
                placeholder="নিশ্চিত করুন" style={{...iSt,fontSize:"1.2rem",letterSpacing:"0.3rem",textAlign:"center"}}/>
            </div>
            {pinError&&<div style={{color:C.red,textAlign:"center",fontSize:"0.85rem",marginBottom:"0.75rem"}}>{pinError}</div>}
            <button onClick={async()=>{
              if(newPin.length<4){setPinError("কমপক্ষে ৪ সংখ্যা দিন");return;}
              if(newPin!==confirmPin){setPinError("PIN মিলছে না!");return;}
              if(fbUid) await fsSetConfig(fbUid,"appPin",newPin);
              setStoredPin(newPin);setSetupPin(false);setPinError("");setNewPin("");setConfirmPin("");
            }} style={{width:"100%",padding:"0.9rem",background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,color:"#fff",border:"none",borderRadius:"0.75rem",fontWeight:800,fontSize:"1rem",cursor:"pointer",fontFamily:font,marginBottom:"0.75rem"}}>
              ✅ PIN সেট করুন
            </button>
            <button onClick={()=>{setSetupPin(false);setPinError("");}} style={{width:"100%",padding:"0.75rem",background:"none",color:C.muted,border:`1.5px solid ${C.border}`,borderRadius:"0.75rem",fontWeight:600,fontSize:"0.9rem",cursor:"pointer",fontFamily:font}}>বাতিল</button>
          </div>
        </div>
      </>
    );
  }

  // ── User Selection + PIN Login Screen ──
  if(authScreen==="selecting"){
    const allUsers=[
      {id:"owner",name:userSettings.name||"মালিক",role:"মালিক",pin:storedPin},
      ...appUsers
    ].filter(u=>u.pin);

    if(!selectedLoginUser){
      // Show user cards to pick from
      return(
        <>
          <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet"/>
          <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.primary},${C.primaryDark})`,fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
            <div style={{width:"100%",maxWidth:380}}>
              <div style={{textAlign:"center",marginBottom:"1.75rem",color:"#fff"}}>
                <div style={{fontSize:"3rem",marginBottom:"0.4rem"}}>🐔</div>
                <div style={{fontWeight:800,fontSize:"1.4rem"}}>{userSettings.businessName||"টিআর পোল্ট্রি"}</div>
                <div style={{fontSize:"0.8rem",opacity:0.8,marginTop:"0.2rem"}}>আলহামদুলিল্লাহ</div>
                <div style={{marginTop:"0.75rem",fontSize:"0.88rem",opacity:0.9}}>কে প্রবেশ করছেন?</div>
              </div>
              <div style={{display:"grid",gap:"0.6rem"}}>
                {allUsers.map(u=>{
                  const [rc,rbg]=ROLE_COLORS[u.role]||["#888","#F5F5F5"];
                  return(
                    <button key={u.id} onClick={()=>setSelectedLoginUser(u)}
                      style={{display:"flex",alignItems:"center",gap:"1rem",background:"#fff",border:"none",borderRadius:"1rem",padding:"0.9rem 1.1rem",cursor:"pointer",fontFamily:font,textAlign:"left",width:"100%",boxShadow:"0 2px 12px rgba(0,0,0,0.15)"}}>
                      <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${rc},${rc}99)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"1.2rem",flexShrink:0}}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:800,color:C.darkBrown,fontSize:"0.98rem"}}>{u.name}</div>
                        <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap",marginTop:"0.15rem"}}>
                          <span style={{background:rbg,color:rc,fontSize:"0.7rem",fontWeight:700,padding:"0.1rem 0.5rem",borderRadius:"1rem"}}>{u.role}</span>
                          {u.department&&<span style={{background:"#F0F4FF",color:C.blue,fontSize:"0.68rem",fontWeight:700,padding:"0.1rem 0.45rem",borderRadius:"1rem"}}>{u.department==="দোকান"?"🏪":u.department==="হ্যাচারি"?"🥚":u.department==="ফার্ম"?"🐔":"🏢"} {u.department}</span>}
                        </div>
                      </div>
                      <span style={{color:C.muted,fontSize:"1.2rem"}}>→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      );
    }

    // Show PIN pad for selected user
    return(
      <>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet"/>
        <div style={{minHeight:"100vh",background:`linear-gradient(160deg,${C.primary},${C.primaryDark})`,fontFamily:font,display:"flex",alignItems:"center",justifyContent:"center",padding:"1.5rem"}}>
          <PinPad
            targetPin={selectedLoginUser.pin}
            title={selectedLoginUser.name}
            subtitle={selectedLoginUser.role}
            onBack={()=>setSelectedLoginUser(null)}
            onSuccess={()=>{const u=selectedLoginUser;setCurrentUser(u);setAuthScreen("app");setPinInput("");setPinError("");setSelectedLoginUser(null);setTab(getHomTab(u));}}
          />
        </div>
      </>
    );
  }

  // ── Backup helpers ──
  function handleExportBackup(){
    const data={
      version:1,date:today(),
      parties,shopPurchases,shopSales,eggInputs,hatches,flocks,eggRecords,
      farmExpenses,flockSales,medicineStock,mortality,feedStock,feedLog,
      employees,advances,flockPurchases,hatcheryExpenses,sharedExpenses,userSettings
    };
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});
    const a=document.createElement("a");
    a.href=URL.createObjectURL(blob);
    a.download=`poultry-backup-${today()}.json`;
    a.click();
  }

  async function handleImportBackup(file){
    try{
      const text=await file.text();
      const d=JSON.parse(text);
      if(!d.version)throw new Error("Invalid");
      if(d.parties)setParties(d.parties);
      if(d.shopPurchases)setShopPurchases(d.shopPurchases);
      if(d.shopSales)setShopSales(d.shopSales);
      if(d.eggInputs)setEggInputs(d.eggInputs);
      if(d.hatches)setHatches(d.hatches);
      if(d.flocks)setFlocks(d.flocks);
      if(d.eggRecords)setEggRecords(d.eggRecords);
      if(d.farmExpenses)setFarmExpenses(d.farmExpenses);
      if(d.flockSales)setFlockSales(d.flockSales);
      if(d.medicineStock)setMedicineStock(d.medicineStock);
      if(d.mortality)setMortality(d.mortality);
      if(d.feedStock)setFeedStock(d.feedStock);
      if(d.feedLog)setFeedLog(d.feedLog);
      if(d.employees)setEmployees(d.employees);
      if(d.advances)setAdvances(d.advances);
      if(d.flockPurchases)setFlockPurchases(d.flockPurchases);
      if(d.hatcheryExpenses)setHatcheryExpenses(d.hatcheryExpenses);
      if(d.sharedExpenses)setSharedExpenses(d.sharedExpenses);
      if(d.userSettings)setUserSettings(d.userSettings);
      return true;
    }catch(e){return false;}
  }

  // Only render main app when authScreen is "app"
  if(authScreen!=="app") return null;

  return(
    <>
      <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet"/>
      <div style={{minHeight:"100vh",background:C.cream,fontFamily:font,maxWidth:560,margin:"0 auto",display:"flex",flexDirection:"column"}}>
        <div style={{background:`linear-gradient(135deg,${C.primary} 0%,${C.primaryDark} 100%)`,padding:"0.9rem 1.25rem 0.75rem",color:"#fff",position:"sticky",top:0,zIndex:100}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:"0.4rem",marginBottom:"0.05rem"}}>
                <span style={{fontSize:"1.25rem",fontWeight:800,letterSpacing:"0.01em"}}>
                  {userSettings.businessName||"🐔 টিআর পোল্ট্রি এন্ড হ্যাচারি"}
                </span>
              </div>
              <div style={{fontSize:"0.72rem",opacity:0.8,letterSpacing:"0.03em"}}>আলহামদুলিল্লাহ{userSettings.businessName?<span style={{opacity:0.7}}> • 🐔 টিআর পোল্ট্রি এন্ড হ্যাচারি</span>:""}</div>
              {(()=>{
                const u=currentUser;
                const displayName=u?.name||userSettings.name||"";
                if(!displayName) return null;
                const role=u?.role||"মালিক";
                const roleGreetings={
                  "মালিক":   {icon:"👑", line:`আস্সালামু আলাইকুম, ${displayName} ভাই! আল্লাহ আপনার ব্যবসায় বরকত দিন`},
                  "ম্যানেজার":  {icon:"💼", line:`সুপ্রভাত, ${displayName}! আজকের কাজ সুষ্ঠুভাবে পরিচালনা করুন`},
                  "হিসাবরক্ষক":{icon:"📒", line:`স্বাগতম, ${displayName}! হিসাব নিকাশ যত্নসহকারে করুন`},
                  "সুপারভাইজার":{icon:"👀", line:`স্বাগতম, ${displayName}! সব কিছু নজরে রাখুন`},
                  "অন্যান্য":  {icon:"🙏", line:`স্বাগতম, ${displayName}!`},
                };
                const g=roleGreetings[role]||roleGreetings["অন্যান্য"];
                return(
                  <div style={{marginTop:"0.25rem",display:"flex",flexDirection:"column",gap:"0.1rem"}}>
                    <span style={{display:"inline-flex",alignItems:"center",gap:"0.25rem",background:"rgba(255,255,255,0.18)",borderRadius:"1rem",padding:"0.1rem 0.55rem",fontSize:"0.65rem",fontWeight:700,width:"fit-content"}}>
                      {g.icon} {role}
                    </span>
                    <div style={{fontSize:"0.68rem",opacity:0.88,fontStyle:"italic",marginTop:"0.05rem"}}>{g.line}</div>
                  </div>
                );
              })()}
              {userSettings.phone&&<div style={{fontSize:"0.68rem",opacity:0.75,marginTop:"0.05rem"}}>📞 {userSettings.phone}</div>}
            </div>
            <div style={{display:"flex",gap:"0.4rem",alignItems:"flex-start",marginTop:"0.1rem",flexShrink:0}}>
              {<button onClick={()=>{setAuthScreen("selecting");setCurrentUser(null);}} style={{background:"rgba(255,255,255,0.18)",border:"1.5px solid rgba(255,255,255,0.35)",borderRadius:"0.6rem",padding:"0.4rem 0.55rem",cursor:"pointer",color:"#fff",fontSize:"0.75rem",fontWeight:700,lineHeight:1,fontFamily:font}}>🚪</button>}
              <button onClick={()=>setShowSettings(true)} style={{background:"rgba(255,255,255,0.18)",border:"1.5px solid rgba(255,255,255,0.35)",borderRadius:"0.6rem",padding:"0.4rem 0.6rem",cursor:"pointer",color:"#fff",fontSize:"1.1rem",lineHeight:1}}>⚙️</button>
            </div>
          </div>
        </div>
        <div style={{flex:1,padding:"1rem",paddingBottom:"5.5rem",overflowY:"auto"}}>
          {(()=>{const allowed=getAllowedTabs(currentUser);if(!allowed.includes(tab)&&tab!=="dashboard"){setTimeout(()=>setTab("dashboard"),0);}return null;})()}
          {tab==="dashboard"&&<Dashboard stats={stats} parties={parties} shopSales={shopSales} shopPurchases={shopPurchases} flockSales={flockSales} flockPurchases={flockPurchases} employees={employees} advances={advances}/>}
          {tab==="shop"&&getAllowedTabs(currentUser).includes("shop")&&<ShopTab purchases={shopPurchases} sales={shopSales} parties={parties} employees={employees} advances={advances} userSettings={userSettings} currentUser={currentUser} sectionStats={stats?.shop} onUpdateSale={s=>setShopSales(prev=>prev.map(x=>x.id===s.id?s:x))} onDeleteSale={s=>confirmDelete(`"${s.breed}" বিক্রির রেকর্ড ডিলিট করবেন?`,()=>setShopSales(prev=>prev.filter(x=>x.id!==s.id)))} onUpdatePurchase={p=>setShopPurchases(prev=>prev.map(x=>x.id===p.id?p:x))} onDeletePurchase={p=>confirmDelete(`"${p.breed}" কেনার রেকর্ড ডিলিট করবেন?`,()=>setShopPurchases(prev=>prev.filter(x=>x.id!==p.id)))} onAddPurchase={p=>setShopPurchases(prev=>[...prev,p])} onAddSale={s=>setShopSales(prev=>[...prev,s])} onAddParty={p=>setParties(prev=>[...prev,p])} onAddEmployee={e=>setEmployees(prev=>[...prev,e])} onAddAdvance={handleAddAdvance}/>}
          {tab==="party"&&getAllowedTabs(currentUser).includes("party")&&<PartyTab parties={parties} shopPurchases={shopPurchases} shopSales={shopSales} flockPurchases={flockPurchases} flockSales={flockSales} eggInputs={eggInputs} hatcheryExpenses={hatcheryExpenses} farmExpenses={farmExpenses} currentUser={currentUser} onAddParty={p=>setParties(prev=>[...prev,p])} onUpdateParty={p=>setParties(prev=>prev.map(x=>x.id===p.id?p:x))} onDeleteParty={p=>confirmDelete(`"${p.name}" পার্টি ডিলিট করবেন?`,()=>setParties(prev=>prev.filter(x=>x.id!==p.id)))}/>}
          {tab==="hatchery"&&getAllowedTabs(currentUser).includes("hatchery")&&<HatcheryTab eggInputs={eggInputs} hatches={hatches} parties={parties} employees={employees} advances={advances} hatcheryExpenses={hatcheryExpenses} currentUser={currentUser} sectionStats={stats?.hatchery} onDeleteEggInput={e=>confirmDelete("এই ডিম রেকর্ড ডিলিট করবেন?",()=>setEggInputs(prev=>prev.filter(x=>x.id!==e.id)))} onDeleteHatch={h=>confirmDelete("এই হ্যাচ ব্যাচ ডিলিট করবেন?",()=>setHatches(prev=>prev.filter(x=>x.id!==h.id)))} onDeleteHatchExpense={e=>confirmDelete("এই খরচ ডিলিট করবেন?",()=>setHatcheryExpenses(prev=>prev.filter(x=>x.id!==e.id)))} onAddEggInput={e=>setEggInputs(prev=>[...prev,e])} onAddHatch={h=>setHatches(prev=>[...prev,h])} onAddHatchExpense={e=>setHatcheryExpenses(prev=>[...prev,e])} onChicksToShop={handleChicksToShop} onAddParty={p=>setParties(prev=>[...prev,p])} onAddEmployee={e=>setEmployees(prev=>[...prev,e])} onAddAdvance={handleAddAdvance}/>}
          {tab==="farm"&&getAllowedTabs(currentUser).includes("farm")&&<FarmTab flocks={flocks} farmExpenses={farmExpenses} eggRecords={eggRecords} flockSales={flockSales} medicineStock={medicineStock} mortality={mortality} feedStock={feedStock} feedLog={feedLog} employees={employees} advances={advances} parties={parties} flockPurchases={flockPurchases} currentUser={currentUser} sectionStats={stats?.farm} onAddFlock={handleAddFlock} onAddParty={p=>setParties(prev=>[...prev,p])} onAddExpense={handleAddExpense} onUpdateExpense={e=>setFarmExpenses(prev=>prev.map(x=>x.id===e.id?e:x))} onDeleteExpense={e=>confirmDelete(`"${e.category}" খরচ ডিলিট করবেন?`,()=>setFarmExpenses(prev=>prev.filter(x=>x.id!==e.id)))} onDeleteFlock={f=>confirmDelete("এই ঝাঁক ডিলিট করবেন?",()=>setFlocks(prev=>prev.filter(x=>x.id!==f.id)))} onDeleteEggRecord={e=>confirmDelete("এই ডিম রেকর্ড ডিলিট করবেন?",()=>setEggRecords(prev=>prev.filter(x=>x.id!==e.id)))} onDeleteFlockSale={s=>confirmDelete("এই বিক্রি রেকর্ড ডিলিট করবেন?",()=>setFlockSales(prev=>prev.filter(x=>x.id!==s.id)))} onDeleteMortality={m=>confirmDelete("এই মৃত্যু রেকর্ড ডিলিট করবেন?",()=>setMortality(prev=>prev.filter(x=>x.id!==m.id)))} onAddEggRecord={e=>setEggRecords(prev=>[...prev,e])} onAddFlockSale={s=>setFlockSales(prev=>[...prev,s])} onAddMortality={m=>setMortality(prev=>[...prev,m])} onAddFeedLog={l=>setFeedLog(prev=>[...prev,l])} onAddEmployee={e=>setEmployees(prev=>[...prev,e])} onAddAdvance={handleAddAdvance}/>}
          
        </div>
        <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:560,background:"#fff",borderTop:`2px solid ${C.border}`,display:"flex",zIndex:100}}>
          {(()=>{
            const allowed=getAllowedTabs(currentUser);
            return TABS.filter(t=>allowed.includes(t.id)).map(t=>(
              <button key={t.id} type="button" onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:"0.1rem",background:"none",border:"none",cursor:"pointer",padding:"0.5rem 0"}}>
                <span style={{fontSize:"1.15rem",opacity:tab===t.id?1:0.5}}>{t.icon}</span>
                <span style={{fontSize:"0.58rem",fontWeight:tab===t.id?800:500,color:tab===t.id?C.primary:C.muted,fontFamily:font}}>{t.label}</span>
                {tab===t.id&&<div style={{width:18,height:3,background:C.primary,borderRadius:2,marginTop:1}}/>}
              </button>
            ));
          })()}
        </div>
        {showSettings&&(
          <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:200,display:"flex",alignItems:"flex-end"}}>
            <div style={{background:"#fff",width:"100%",maxWidth:560,margin:"0 auto",borderRadius:"1.2rem 1.2rem 0 0",padding:"1.5rem 1.25rem 2rem",fontFamily:font,maxHeight:"90vh",overflowY:"auto"}}>
              <div style={{width:40,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 1.2rem"}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"1.2rem"}}>
                <div style={{fontWeight:800,fontSize:"1.1rem",color:C.darkBrown}}>⚙️ সেটিংস</div>
                <button onClick={()=>setShowSettings(false)} style={{background:"none",border:"none",fontSize:"1.3rem",cursor:"pointer",color:C.muted}}>✕</button>
              </div>

              {/* User info */}
              <div style={{background:C.primaryLight,borderRadius:"0.9rem",padding:"1rem",marginBottom:"1rem"}}>
                <div style={{fontWeight:700,color:C.brown,marginBottom:"0.75rem",fontSize:"0.9rem"}}>👤 ব্যবহারকারীর তথ্য</div>
                <Field label="আপনার নাম"><Inp value={userSettings.name} onChange={v=>setUserSettings(s=>({...s,name:v}))} placeholder="যেমন: রহিম"/></Field>
                <Field label="মোবাইল নম্বর"><Inp type="tel" value={userSettings.phone} onChange={v=>setUserSettings(s=>({...s,phone:v}))} placeholder="01XXXXXXXXX"/></Field>
                <Field label="ব্যবসার নাম (বিক্রি মেমোতে দেখাবে)"><Inp value={userSettings.businessName} onChange={v=>setUserSettings(s=>({...s,businessName:v}))} placeholder="যেমন: রহিম পোল্ট্রি ফার্ম"/></Field>
              </div>

              {/* Preview */}
              {(userSettings.name||userSettings.phone||userSettings.businessName)&&(
                <div style={{background:C.greenLight,borderRadius:"0.75rem",padding:"0.85rem",marginBottom:"1rem",border:`1.5px solid #A8D8C0`}}>
                  <div style={{fontSize:"0.72rem",color:C.muted,marginBottom:"0.4rem"}}>Header ও মেমোতে দেখাবে</div>
                  {userSettings.businessName&&<div style={{fontWeight:800,color:C.darkBrown,fontSize:"1rem",marginBottom:"0.15rem"}}>{userSettings.businessName}</div>}
                  <div style={{fontSize:"0.82rem",color:C.brown}}>
                    {userSettings.name&&<span>👤 {userSettings.name}</span>}
                    {userSettings.name&&userSettings.phone&&<span style={{color:C.muted}}> • </span>}
                    {userSettings.phone&&<span>📞 {userSettings.phone}</span>}
                  </div>
                </div>
              )}

              {/* User Management */}
              <div style={{background:"#F5F0FF",borderRadius:"0.9rem",padding:"1rem",marginBottom:"1rem",border:"1.5px solid #D5C5F5"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
                  <div style={{fontWeight:700,color:"#5B21B6",fontSize:"0.9rem"}}>👥 ব্যবহারকারী ব্যবস্থাপনা</div>
                  <button onClick={()=>{setNewUserForm({name:"",role:"ম্যানেজার",pin:"",pin2:""});setUserFormErr("");setShowAddUser(v=>!v);}}
                    style={{background:"#5B21B6",color:"#fff",border:"none",borderRadius:"0.5rem",padding:"0.25rem 0.65rem",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>
                    {showAddUser?"বাতিল":"+ যোগ করুন"}
                  </button>
                </div>

                {/* Existing users list */}
                {/* Owner (always shown) */}
                <div style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.5rem 0",borderBottom:`1px solid #E9D5FF`}}>
                  <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"0.9rem",flexShrink:0}}>
                    {(userSettings.name||"ম").charAt(0).toUpperCase()}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:"0.88rem",color:C.darkBrown}}>{userSettings.name||"মালিক"}</div>
                    <span style={{background:C.primaryLight,color:C.primary,fontSize:"0.68rem",fontWeight:700,padding:"0.1rem 0.45rem",borderRadius:"1rem"}}>মালিক</span>
                  </div>
                  <span style={{fontSize:"0.72rem",color:storedPin?"#2E7D32":"#bbb"}}>{storedPin?"🔐 PIN আছে":"🔓 PIN নেই"}</span>
                </div>

                {/* Additional users */}
                {appUsers.map(u=>{
                  const [rc,rbg]=ROLE_COLORS[u.role]||["#888","#F5F5F5"];
                  return(
                    <div key={u.id} style={{display:"flex",alignItems:"center",gap:"0.75rem",padding:"0.5rem 0",borderBottom:`1px solid #E9D5FF`}}>
                      <div style={{width:34,height:34,borderRadius:"50%",background:`linear-gradient(135deg,${rc},${rc}99)`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:800,fontSize:"0.9rem",flexShrink:0}}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:"0.88rem",color:C.darkBrown}}>{u.name}</div>
                        <div style={{display:"flex",gap:"0.3rem",flexWrap:"wrap",marginTop:"0.1rem"}}>
                          <span style={{background:rbg,color:rc,fontSize:"0.68rem",fontWeight:700,padding:"0.1rem 0.45rem",borderRadius:"1rem"}}>{u.role}</span>
                          {u.department&&<span style={{background:"#F0F4FF",color:C.blue,fontSize:"0.65rem",fontWeight:700,padding:"0.1rem 0.4rem",borderRadius:"1rem"}}>{u.department==="দোকান"?"🏪":u.department==="হ্যাচারি"?"🥚":u.department==="ফার্ম"?"🐔":"🏢"} {u.department}</span>}
                        </div>
                      </div>
                      <button onClick={()=>setAppUsers(prev=>prev.filter(x=>x.id!==u.id))}
                        style={{background:C.redLight,color:C.red,border:"none",borderRadius:"0.4rem",padding:"0.2rem 0.5rem",fontSize:"0.75rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>সরান</button>
                    </div>
                  );
                })}

                {/* Add user form */}
                {showAddUser&&(
                  <div style={{marginTop:"0.75rem",background:"#fff",borderRadius:"0.75rem",padding:"0.85rem",border:"1.5px solid #D5C5F5"}}>
                    <div style={{fontWeight:700,color:"#5B21B6",fontSize:"0.85rem",marginBottom:"0.6rem"}}>নতুন ব্যবহারকারী</div>
                    <Field label="নাম *"><Inp value={newUserForm.name} onChange={v=>setNewUserForm(f=>({...f,name:v}))} placeholder="যেমন: করিম"/></Field>
                    <Field label="ভূমিকা">
                      <Sel value={newUserForm.role} onChange={v=>setNewUserForm(f=>({...f,role:v}))} options={["ম্যানেজার","হিসাবরক্ষক","সুপারভাইজার","অন্যান্য"]}/>
                    </Field>
                    <Field label="বিভাগ">
                      <Sel value={newUserForm.department||"সব বিভাগ"} onChange={v=>setNewUserForm(f=>({...f,department:v}))} options={["দোকান","হ্যাচারি","ফার্ম","সব বিভাগ"]}/>
                    </Field>
                    <Field label="PIN (৪-৬ সংখ্যা) *">
                      <input type="password" inputMode="numeric" maxLength={6} value={newUserForm.pin}
                        onChange={e=>setNewUserForm(f=>({...f,pin:e.target.value.replace(/\D/g,"")}))}
                        placeholder="PIN" style={{...iSt,letterSpacing:"0.25rem",textAlign:"center"}}/>
                    </Field>
                    <Field label="PIN নিশ্চিত করুন *">
                      <input type="password" inputMode="numeric" maxLength={6} value={newUserForm.pin2}
                        onChange={e=>setNewUserForm(f=>({...f,pin2:e.target.value.replace(/\D/g,"")}))}
                        placeholder="আবার দিন" style={{...iSt,letterSpacing:"0.25rem",textAlign:"center"}}/>
                    </Field>
                    {userFormErr&&<div style={{color:C.red,fontSize:"0.8rem",marginBottom:"0.5rem"}}>{userFormErr}</div>}
                    <button onClick={()=>{
                      if(!newUserForm.name.trim()){setUserFormErr("নাম দিন");return;}
                      if(newUserForm.pin.length<4){setUserFormErr("কমপক্ষে ৪ সংখ্যার PIN দিন");return;}
                      if(newUserForm.pin!==newUserForm.pin2){setUserFormErr("PIN মিলছে না!");return;}
                      setAppUsers(prev=>[...prev,{id:uid(),name:newUserForm.name.trim(),role:newUserForm.role,department:newUserForm.department||"সব বিভাগ",pin:newUserForm.pin}]);
                      setNewUserForm({name:"",role:"ম্যানেজার",department:"সব বিভাগ",pin:"",pin2:""});
                      setUserFormErr("");setShowAddUser(false);
                    }} style={{width:"100%",padding:"0.65rem",background:"#5B21B6",color:"#fff",border:"none",borderRadius:"0.6rem",fontWeight:700,fontSize:"0.88rem",cursor:"pointer",fontFamily:font}}>
                      ✅ যোগ করুন
                    </button>
                  </div>
                )}
              </div>
              <div style={{background:"#F0F4FF",borderRadius:"0.9rem",padding:"1rem",marginBottom:"1rem",border:"1.5px solid #C5D8F5"}}>
                <div style={{fontWeight:700,color:C.blue,marginBottom:"0.75rem",fontSize:"0.9rem"}}>🔐 লগইন পিন</div>
                {storedPin
                  ?<div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.6rem"}}>
                      <span style={{fontSize:"0.85rem",color:"#555"}}>✅ PIN সক্রিয় আছে</span>
                      <div style={{display:"flex",gap:"0.4rem"}}>
                        <button onClick={()=>{setSetupPin(true);setShowSettings(false);}} style={{padding:"0.3rem 0.75rem",background:C.blueLight,color:C.blue,border:"none",borderRadius:"0.5rem",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>পরিবর্তন</button>
                        <button onClick={async()=>{if(fbUid)await fsSetConfig(fbUid,"appPin",null);setStoredPin(null);}} style={{padding:"0.3rem 0.75rem",background:C.redLight,color:C.red,border:"none",borderRadius:"0.5rem",fontSize:"0.78rem",fontWeight:700,cursor:"pointer",fontFamily:font}}>সরান</button>
                      </div>
                    </div>
                    <div style={{fontSize:"0.75rem",color:C.muted}}>App বন্ধ করলে PIN দিয়ে ঢুকতে হবে</div>
                  </div>
                  :<div>
                    <div style={{fontSize:"0.82rem",color:"#666",marginBottom:"0.6rem"}}>এখন কোনো PIN নেই। PIN দিলে app সুরক্ষিত থাকবে।</div>
                    <button onClick={()=>{setSetupPin(true);setShowSettings(false);}} style={{width:"100%",padding:"0.6rem",background:C.blue,color:"#fff",border:"none",borderRadius:"0.6rem",fontWeight:700,fontSize:"0.88rem",cursor:"pointer",fontFamily:font}}>🔐 PIN সেট করুন</button>
                  </div>
                }
              </div>

              {/* Backup */}
              <div style={{background:"#F5F5F5",borderRadius:"0.9rem",padding:"1rem",marginBottom:"1rem",border:"1.5px solid #ddd"}}>
                <div style={{fontWeight:700,color:C.darkBrown,marginBottom:"0.75rem",fontSize:"0.9rem"}}>💾 ব্যাকআপ</div>
                <div style={{fontSize:"0.78rem",color:C.muted,marginBottom:"0.75rem"}}>সব ডেটা JSON ফাইলে সেভ করুন বা পুরনো ব্যাকআপ থেকে রিস্টোর করুন।</div>
                {/* Storage type note */}
                <div style={{background:"#fff",borderRadius:"0.55rem",padding:"0.55rem 0.75rem",marginBottom:"0.75rem",border:"1.5px solid #eee"}}>
                  <div style={{fontSize:"0.75rem",color:C.blue,fontWeight:700,marginBottom:"0.2rem"}}>📍 বর্তমান স্টোরেজ</div>
                  <div style={{fontSize:"0.78rem",color:"#555"}}>🗄️ Local Storage (এই ডিভাইসে সংরক্ষিত)</div>
                  <div style={{fontSize:"0.7rem",color:C.muted,marginTop:"0.15rem"}}>Google Drive sync শীঘ্রই আসছে</div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"0.5rem"}}>
                  <button onClick={()=>{handleExportBackup();}} style={{padding:"0.7rem",background:"#2E7D32",color:"#fff",border:"none",borderRadius:"0.65rem",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",fontFamily:font}}>
                    📥 ব্যাকআপ নিন
                  </button>
                  <label style={{padding:"0.7rem",background:C.blue,color:"#fff",border:"none",borderRadius:"0.65rem",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",textAlign:"center",display:"block"}}>
                    📤 রিস্টোর করুন
                    <input type="file" accept=".json" style={{display:"none"}} onChange={async e=>{
                      const f=e.target.files[0];if(!f)return;
                      const ok=await handleImportBackup(f);
                      alert(ok?"✅ রিস্টোর সফল হয়েছে!":"❌ ফাইলটি সঠিক নয়।");
                      e.target.value="";
                    }}/>
                  </label>
                </div>
              </div>

              <div style={{background:"#FFF0F0",borderRadius:"0.9rem",padding:"1rem",marginBottom:"0.75rem",border:"1.5px solid #FFB3B3"}}>
                <div style={{fontWeight:700,color:C.red,marginBottom:"0.4rem",fontSize:"0.9rem"}}>🚪 একাউন্ট লগআউট</div>
                {fbUser&&<div style={{fontSize:"0.78rem",color:C.muted,marginBottom:"0.6rem"}}>📧 {fbUser.email||"Google একাউন্ট"}</div>}
                <button onClick={async()=>{setShowSettings(false);await handleLogout();}}
                  style={{width:"100%",padding:"0.65rem",background:C.red,color:"#fff",border:"none",borderRadius:"0.6rem",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:font}}>
                  🔴 সব ডিভাইস থেকে লগআউট
                </button>
              </div>
              <button onClick={()=>setShowSettings(false)}
                style={{width:"100%",padding:"0.85rem",background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`,color:"#fff",border:"none",borderRadius:"0.75rem",fontWeight:800,fontSize:"1rem",cursor:"pointer",fontFamily:font}}>
                ✅ সংরক্ষণ করুন
              </button>
            </div>
          </div>
        )}
        {confirmDlg&&<ConfirmModal msg={confirmDlg.msg} onYes={()=>{confirmDlg.onYes();setConfirmDlg(null);}} onNo={()=>setConfirmDlg(null)}/>}
      </div>
    </>
  );
}
