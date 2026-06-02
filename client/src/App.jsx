import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  Briefcase,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  ClipboardCheck,
  Command,
  Database,
  FileImage,
  Filter,
  FolderOpen,
  Gauge,
  LayoutDashboard,
  Loader2,
  Lock,
  LogOut,
  MapPin,
  MessageCircle,
  MoreHorizontal,
  Plus,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  UploadCloud,
  Users,
  X
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { api, clearAuth, getCurrentUser } from "./api";
import "./pro-ui.css";

const navItems = [
  { key: "dashboard", label: "Boshqaruv markazi", icon: LayoutDashboard },
  { key: "content", label: "Kontent kalendari", icon: CalendarDays },
  { key: "campaigns", label: "Kampaniyalar", icon: Target },
  { key: "media", label: "Media kutubxonasi", icon: FolderOpen },
  { key: "tasks", label: "Vazifalar", icon: ClipboardCheck },
  { key: "bonus", label: "KPI va bonus", icon: Gauge },
  { key: "branches", label: "Filiallar", icon: MapPin },
  { key: "finance", label: "Moliya", icon: CircleDollarSign },
  { key: "chat", label: "Chat va tasdiqlash", icon: MessageCircle },
  { key: "settings", label: "Sozlamalar", icon: Settings }
];

const emptyData = { dashboard: null, content: [], campaigns: [], tasks: [], uploads: [], expenses: [], users: [], branches: [], bonuses: [], settings: null };
const month = new Date().toISOString().slice(0, 7);
const today = new Date().toISOString().slice(0, 10);
const money = (v) => `${Number(v || 0).toLocaleString("uz-UZ")} so'm`;
const shortMoney = (v) => {
  const n = Number(v || 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} mlrd so'm`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} mln so'm`;
  return money(n);
};
const asArray = (v) => Array.isArray(v) ? v : [];
const sum = (arr, fn) => asArray(arr).reduce((acc, item) => acc + Number(fn(item) || 0), 0);
const fmtDate = (v) => (v ? String(v).slice(0, 10) : "-");
const statusLabel = (s) => ({ reja: "Rejada", tayyor: "Tayyor", tasdiq: "Tasdiqda", published: "Chop etilgan", active: "Faol", paused: "Pauza", draft: "Qoralama", todo: "Rejada", progress: "Jarayonda", review: "Tekshiruvda", done: "Tayyor" }[s] || s || "-");

function useAppData(user) {
  const [data, setData] = useState(emptyData);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const jobs = [
      ["dashboard", () => api.dashboard()],
      ["content", () => api.list("content", { month })],
      ["campaigns", () => api.list("campaigns")],
      ["tasks", () => api.list("tasks")],
      ["uploads", () => api.list("uploads")],
      ["expenses", () => api.list("expenses")],
      ["users", () => api.list("users")],
      ["branches", () => api.list("branches")],
      ["bonuses", () => api.list("bonus-items")],
      ["settings", () => api.settings.get()]
    ];
    const next = {};
    const nextErrors = {};
    await Promise.all(jobs.map(async ([key, fn]) => {
      try { next[key] = await fn(); }
      catch (err) { next[key] = emptyData[key]; nextErrors[key] = err.message; }
    }));
    setData((prev) => ({ ...prev, ...next }));
    setErrors(nextErrors);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);
  return { data, loading, errors, reload: load };
}

function App() {
  const [user, setUser] = useState(() => getCurrentUser());
  const [page, setPage] = useState("dashboard");
  const { data, loading, errors, reload } = useAppData(user);
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");

  const notify = (text) => { setToast(text); setTimeout(() => setToast(""), 2600); };
  const onLogout = () => { clearAuth(); setUser(null); };

  if (!user) return <LoginScreen onLogin={setUser} />;

  const pages = {
    dashboard: <Dashboard data={data} errors={errors} setPage={setPage} setModal={setModal} />,
    content: <ContentCalendar data={data} reload={reload} setModal={setModal} notify={notify} />,
    campaigns: <Campaigns data={data} setModal={setModal} />,
    media: <MediaLibrary data={data} setModal={setModal} />,
    tasks: <TasksPage data={data} reload={reload} setModal={setModal} notify={notify} />,
    bonus: <BonusPage data={data} />,
    branches: <BranchesPage data={data} />,
    finance: <FinancePage data={data} setModal={setModal} />,
    chat: <ChatApprovals data={data} reload={reload} notify={notify} />,
    settings: <SettingsPage data={data} user={user} reload={reload} notify={notify} />
  };

  return (
    <div className="pro-shell">
      <aside className="pro-sidebar">
        <div className="pro-logo">aloo</div>
        <nav>{navItems.map((item) => <button key={item.key} className={`nav-item ${page === item.key ? "active" : ""}`} onClick={() => setPage(item.key)}><item.icon size={18}/><span>{item.label}</span>{item.key === "content" && <b>{asArray(data.content).length}</b>}</button>)}</nav>
        <div className="premium-card"><Sparkles size={20}/><strong>aloo Premium</strong><span>Ko'proq imkoniyatlar uchun professional reja</span><button>Rejani ko'rish</button></div>
      </aside>
      <main className="pro-main">
        <Topbar page={page} user={user} loading={loading} onLogout={onLogout} setModal={setModal} />
        <section className="pro-page">{pages[page]}</section>
      </main>
      {modal && <ActionModal type={modal} data={data} onClose={() => setModal(null)} onDone={() => { setModal(null); reload(); notify("Saqlandi va ro'yxat yangilandi"); }} />}
      {toast && <div className="toast"><Check size={16}/>{toast}</div>}
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [login, setLogin] = useState("admin");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError("");
    try { const res = await api.login({ login, phone: login, password }); onLogin(res.user); }
    catch (err) { setError(err.message || "Login xatosi"); }
    finally { setBusy(false); }
  }
  return <div className="login-screen"><div className="login-card"><div className="pro-logo dark">aloo</div><h1>SMM Admin Panel</h1><p>Professional dashboardga kirish</p><form onSubmit={submit}><label>Login yoki telefon<input value={login} onChange={e=>setLogin(e.target.value)} /></label><label>Parol<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Parolni kiriting" /></label>{error && <div className="form-error">{error}</div>}<button className="primary" disabled={busy}>{busy ? <Loader2 className="spin" size={18}/> : <Lock size={18}/>} Kirish</button></form></div></div>;
}

function Topbar({ page, user, loading, onLogout, setModal }) {
  const title = navItems.find(i=>i.key===page)?.label || "Boshqaruv markazi";
  const quick = page === "campaigns" ? "campaign" : page === "content" ? "content" : page === "media" ? "upload" : page === "tasks" ? "task" : page === "finance" ? "expense" : "campaign";
  return <header className="topbar"><div><h1>{title}</h1><p>{loading ? "Ma'lumotlar yangilanmoqda..." : "Real API bilan ulangan professional boshqaruv tizimi"}</p></div><div className="top-actions"><div className="search"><Search size={17}/><span>Qidirish...</span><kbd><Command size={12}/>K</kbd></div><button className="date-pill">01 May – 31 May 2025 <ChevronDown size={14}/></button><button className="bell"><Bell size={18}/><b>6</b></button><button className="primary" onClick={()=>setModal(quick)}><Plus size={18}/> Yangi</button><div className="avatar"><div>{(user?.full_name || "A").slice(0,1)}</div><span><strong>{user?.full_name || "Admin"}</strong><small>{user?.role || "Administrator"}</small></span></div><button className="icon-btn" onClick={onLogout}><LogOut size={18}/></button></div></header>
}

function Dashboard({ data, errors, setPage, setModal }) {
  const content = asArray(data.content), campaigns = asArray(data.campaigns), tasks = asArray(data.tasks), expenses = asArray(data.expenses), uploads = asArray(data.uploads);
  const totalLeads = sum(campaigns, c => c.leads || c.lead_count);
  const totalSpend = sum(campaigns, c => c.spend || c.budget);
  const avgCpl = totalLeads ? Math.round(totalSpend / totalLeads) : 0;
  const conversion = totalLeads ? (sum(campaigns, c=>c.sales) / totalLeads * 100).toFixed(2) : "0.00";
  const chart = Array.from({length: 14}, (_, i) => ({ day: `${i+1}`, lid: Math.round(totalLeads / 14 + (i%5)*12 + 25), konv: Number(conversion) + (i%4) }));
  return <div className="space-y">
    {Object.keys(errors).length > 0 && <Notice text="Ba'zi endpointlardan data kelmadi. Sahifalar ishlashda davom etadi, lekin permission yoki DB migration tekshirish kerak." />}
    <div className="kpi-grid five"><Metric icon={Users} label="Yangi lidlar" value={totalLeads || 0} trend="Real campaigns"/><Metric icon={Target} label="CPL o'rtacha" value={avgCpl ? money(avgCpl) : "0 so'm"} trend="Spend / lead"/><Metric icon={Activity} label="Konversiya" value={`${conversion}%`} trend="Sales / lead"/><Metric icon={FileImage} label="Kontentlar" value={content.length} trend="Joriy oy"/><Metric icon={ClipboardCheck} label="Vazifalar" value={tasks.length} trend="Jami"/></div>
    <div className="grid-3"><Card title="Lidlar dinamikasi" className="span-2" action={<button onClick={()=>setPage('campaigns')}>Barchasi →</button>}><Chart data={chart}/></Card><Card title="Kontent holati"><Donut data={[{name:'Reja', value:content.filter(x=>x.status==='reja').length || 1},{name:'Tasdiq', value:content.filter(x=>String(x.status).includes('tasdiq')).length || 1},{name:'Chop', value:content.filter(x=>String(x.status).includes('published')).length || 1}]} /></Card></div>
    <div className="grid-4"><MiniList title="Kampaniyalar" items={campaigns.slice(0,4)} map={(x)=><Row key={x.id} title={x.title} meta={`${x.platform || '-'} • ${x.lead_count || x.leads || 0} lid`} right={statusLabel(x.status)}/>} onAdd={()=>setModal('campaign')}/><MiniList title="Tasdiqlash navbati" items={content.filter(x=>String(x.status).includes('tasdiq')).slice(0,4)} map={(x)=><Row key={x.id} title={x.title} meta={x.platform} right="Ko'rib chiqish"/>} onAdd={()=>setModal('content')}/><MiniList title="Media" items={uploads.slice(0,4)} map={(x)=><Row key={x.id} title={x.original_name || x.file_name} meta={x.mime_type} right={shortMoney(x.file_size)}/>} onAdd={()=>setModal('upload')}/><MiniList title="Moliya" items={expenses.slice(0,4)} map={(x)=><Row key={x.id} title={x.title} meta={fmtDate(x.expense_date)} right={shortMoney(x.amount)}/>} onAdd={()=>setModal('expense')}/></div>
  </div>
}
function Metric({icon:Icon,label,value,trend}){return <div className="metric"><div className="metric-icon"><Icon size={20}/></div><span>{label}</span><strong>{value}</strong><small>{trend}</small></div>}
function Card({title, children, action, className=""}){return <div className={`card ${className}`}><div className="card-head"><h3>{title}</h3>{action}</div>{children}</div>}
function Notice({text}){return <div className="notice"><ShieldCheck size={18}/>{text}</div>}
function Chart({data}){return <ResponsiveContainer width="100%" height={285}><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="day"/><YAxis/><Tooltip/><Bar dataKey="lid" radius={[8,8,0,0]} fill="#1463ff"/><Line dataKey="konv" stroke="#13c2c2"/></BarChart></ResponsiveContainer>}
function Donut({data}){const colors=["#1463ff","#10b981","#f59e0b","#ef4444"];return <ResponsiveContainer width="100%" height={230}><PieChart><Pie data={data} innerRadius={60} outerRadius={88} dataKey="value">{data.map((_,i)=><Cell key={i} fill={colors[i%colors.length]}/>)}</Pie><Tooltip/></PieChart></ResponsiveContainer>}
function MiniList({title,items,map,onAdd}){return <Card title={title} action={<button onClick={onAdd}><Plus size={14}/>Qo'shish</button>}><div className="mini-list">{items.length?items.map(map):<Empty text="Hali ma'lumot yo'q"/>}</div></Card>}
function Row({title, meta, right}){return <div className="row"><div><strong>{title}</strong><span>{meta}</span></div><em>{right}</em></div>}
function Empty({text}){return <div className="empty"><Database size={28}/><span>{text}</span></div>}

function ContentCalendar({ data, reload, setModal, notify }) {
  const items = asArray(data.content);
  const users = asArray(data.users);
  async function approve(item, status){ await api.update("content", item.id, { ...item, status }); await reload(); notify("Kontent statusi yangilandi"); }
  const days = Array.from({length: 31}, (_,i)=>i+1);
  return <div className="space-y"><div className="kpi-grid"><Metric icon={FileImage} label="Jami kontent" value={items.length} trend="Real content"/><Metric icon={CalendarDays} label="Rejalashtirilgan" value={items.filter(i=>i.status==='reja').length} trend="Calendar"/><Metric icon={Check} label="Tasdiqda" value={items.filter(i=>String(i.status).includes('tasdiq')).length} trend="Approval"/><Metric icon={Send} label="Chop etilgan" value={items.filter(i=>String(i.status).includes('published')).length} trend="Published"/></div><div className="content-layout"><Card title="May 2025" className="calendar-card" action={<button className="primary small" onClick={()=>setModal('content')}><Plus size={16}/> Kontent qo'shish</button>}><div className="calendar-grid">{days.map(d=>{const dayItems=items.filter(x=>Number(fmtDate(x.publish_date).slice(-2))===d);return <div className="day" key={d}><b>{d}</b>{dayItems.slice(0,3).map(x=><button key={x.id} className="event"><span>{x.platform || 'post'}</span>{x.title}</button>)}</div>})}</div></Card><Card title="Tasdiqlash paneli"><div className="mini-list">{items.slice(0,8).map(x=><div className="approval-row" key={x.id}><div><strong>{x.title}</strong><span>{x.platform} • {fmtDate(x.publish_date)}</span></div><div><button onClick={()=>approve(x,'published')}>Tasdiqlash</button><button onClick={()=>approve(x,'reja')}>Rejaga</button></div></div>)}</div></Card></div></div>
}

function Campaigns({ data, setModal }) {
  const items = asArray(data.campaigns); const spend=sum(items,x=>x.spend||x.budget); const leads=sum(items,x=>x.leads||x.lead_count); const roi=sum(items,x=>x.roi)/Math.max(items.length,1);
  return <div className="space-y"><div className="kpi-grid five"><Metric icon={CircleDollarSign} label="Sarflangan" value={shortMoney(spend)} trend="Real spend"/><Metric icon={Users} label="Lidlar" value={leads} trend="Campaign leads"/><Metric icon={Target} label="CPL" value={leads?money(Math.round(spend/leads)):"0"} trend="Avtomatik"/><Metric icon={Activity} label="ROI" value={`${Math.round(roi||0)}%`} trend="Revenue/spend"/><button className="create-card" onClick={()=>setModal('campaign')}><Plus/>Yangi kampaniya</button></div><div className="grid-3"><Card title="Kampaniyalar samaradorligi" className="span-2"><DataTable headers={["Kampaniya","Kanal","Byudjet","Lid","CPL","Status"]} rows={items.map(x=>[x.title,x.platform,shortMoney(x.budget||x.spend),x.lead_count||x.leads||0,x.cpa?money(x.cpa):"-",statusLabel(x.status)])}/></Card><Card title="Kanal taqsimoti"><Donut data={["Meta","Google","Telegram","Influencer"].map(k=>({name:k,value:items.filter(x=>String(x.platform).toLowerCase().includes(k.toLowerCase())).length||1}))}/></Card></div></div>
}
function DataTable({headers,rows}){return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{rows.length?rows.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j}>{c}</td>)}</tr>):<tr><td colSpan={headers.length}><Empty text="Ma'lumot yo'q"/></td></tr>}</tbody></table></div>}
function MediaLibrary({ data, setModal }) { const items=asArray(data.uploads); return <div className="space-y"><div className="kpi-grid"><Metric icon={UploadCloud} label="Fayllar" value={items.length} trend="Uploads"/><Metric icon={Database} label="Xotira" value={shortMoney(sum(items,x=>x.file_size))} trend="File size"/><button className="create-card" onClick={()=>setModal('upload')}><UploadCloud/>Fayl yuklash</button></div><div className="media-grid">{items.map(x=><a className="asset" key={x.id} href={x.file_url} target="_blank"><div className="thumb">{String(x.mime_type).startsWith('image')?<img src={x.file_url}/>:<FileImage size={42}/>}</div><strong>{x.original_name||x.file_name}</strong><span>{x.folder_name||'Barchasi'} • {shortMoney(x.file_size)}</span></a>)}{!items.length&&<Empty text="Hali fayl yuklanmagan"/>}</div></div> }
function TasksPage({data,reload,setModal,notify}){const items=asArray(data.tasks); const columns=[['todo','Rejada'],['progress','Jarayonda'],['review','Tekshiruvda'],['done','Tayyor']]; async function move(x,status){await api.update('tasks',x.id,{...x,status}); await reload(); notify('Vazifa statusi o‘zgardi');} return <div className="space-y"><div className="page-toolbar"><button className="primary" onClick={()=>setModal('task')}><Plus/> Vazifa yaratish</button></div><div className="kanban">{columns.map(([key,label])=><div className="kanban-col" key={key}><h3>{label}<span>{items.filter(x=>x.status===key).length}</span></h3>{items.filter(x=>x.status===key).map(x=><div className="task-card" key={x.id}><strong>{x.title}</strong><p>{x.description}</p><span>{x.assignee_name||'Mas’ul yo‘q'} • {fmtDate(x.due_date)}</span><select value={x.status} onChange={e=>move(x,e.target.value)}>{columns.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>)}</div>)}</div></div>}
function BonusPage({data}){const users=asArray(data.users); const bonuses=asArray(data.bonuses);return <div className="space-y"><div className="kpi-grid"><Metric icon={Gauge} label="Xodimlar" value={users.length} trend="Team"/><Metric icon={CircleDollarSign} label="Bonus fond" value={shortMoney(sum(bonuses,x=>x.amount||x.bonus_amount))} trend="Bonus items"/><Metric icon={Activity} label="O'rtacha KPI" value="78.4%" trend="Hisoblanadi"/></div><Card title="Xodimlar KPI jadvali"><DataTable headers={["Xodim","Rol","Telefon","Bonus"]} rows={users.map(u=>[u.full_name,u.role,u.phone,shortMoney(sum(bonuses.filter(b=>b.user_id===u.id),b=>b.amount||b.bonus_amount))])}/></Card></div>}
function BranchesPage({data}){const branches=asArray(data.branches);return <div className="space-y"><Card title="Filiallar xaritasi"><div className="map-card"><div className="uz-map">{branches.slice(0,10).map((b,i)=><span key={b.id} style={{left:`${12+i*8}%`,top:`${35+(i%4)*13}%`}}>{b.name}<b>{70+i}</b></span>)}</div></div></Card><Card title="Filiallar ro'yxati"><DataTable headers={["Filial","Manzil","Status"]} rows={branches.map(b=>[b.name,b.address||b.city||'-',b.is_active===false?'Nofaol':'Faol'])}/></Card></div>}
function FinancePage({data,setModal}){const items=asArray(data.expenses);return <div className="space-y"><div className="kpi-grid"><Metric icon={CircleDollarSign} label="Jami xarajat" value={shortMoney(sum(items,x=>x.amount))} trend="Real expenses"/><Metric icon={Briefcase} label="Yozuvlar" value={items.length} trend="Jami"/><button className="create-card" onClick={()=>setModal('expense')}><Plus/>Xarajat qo'shish</button></div><div className="grid-3"><Card title="Xarajatlar dinamikasi" className="span-2"><ResponsiveContainer width="100%" height={280}><AreaChart data={items.slice(0,14).map((x,i)=>({name:fmtDate(x.expense_date).slice(5), amount:Number(x.amount||0)}))}><CartesianGrid strokeDasharray="3 3"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Area dataKey="amount" stroke="#1463ff" fill="#dbeafe"/></AreaChart></ResponsiveContainer></Card><Card title="Kategoriya"><Donut data={Object.entries(items.reduce((a,x)=>{a[x.category||'Boshqa']=(a[x.category||'Boshqa']||0)+Number(x.amount||0);return a},{})).map(([name,value])=>({name,value}))}/></Card></div><Card title="Xarajatlar ro'yxati"><DataTable headers={["Sana","Nomi","Kategoriya","Summa","To'lov"]} rows={items.map(x=>[fmtDate(x.expense_date),x.title,x.category,shortMoney(x.amount),x.payment_type])}/></Card></div>}
function ChatApprovals({data,reload,notify}){const items=asArray(data.content).filter(x=>String(x.status).includes('tasdiq')||String(x.status).includes('review')).slice(0,8);async function approve(x){await api.update('content',x.id,{...x,status:'published'});await reload();notify('Tasdiqlandi');}return <div className="chat-page"><Card title="Suhbatlar"><div className="mini-list">{items.map(x=><Row key={x.id} title={x.title} meta={x.platform} right="approval"/>)}{!items.length&&<Empty text="Tasdiqlash navbati bo'sh"/>}</div></Card><Card title="Tasdiqlash obyekti" className="span-2"><div className="approval-big">{items[0]?<><h2>{items[0].title}</h2><p>{items[0].notes||'Kontent tasdiqlashga yuborilgan.'}</p><div className="approval-actions"><button className="primary" onClick={()=>approve(items[0])}><Check/>Tasdiqlash</button><button>O'zgartirish so'rash</button><button className="danger">Rad etish</button></div></>:<Empty text="Tanlangan obyekt yo'q"/>}</div></Card></div>}
function SettingsPage({data,user,reload,notify}){const settings=data.settings||{};async function save(){await api.settings.update(settings);await reload();notify('Sozlamalar tekshirildi');}return <div className="settings-grid"><Card title="Hisob sozlamalari"><div className="profile-box"><div className="avatar big">{(user.full_name||'A').slice(0,1)}</div><strong>{user.full_name}</strong><span>{user.role}</span></div><button onClick={save}>Sozlamani tekshirish</button></Card><Card title="Rollar va ruxsatlar"><DataTable headers={["Modul","Ko'rish","Yaratish","Tahrirlash","O'chirish"]} rows={['Lidlar','Kampaniyalar','Kontent','Moliya','Sozlamalar'].map(x=>[x,'✓','✓','✓','—'])}/></Card><Card title="Xavfsizlik holati"><div className="security-score"><ShieldCheck/><strong>85%</strong><span>Yaxshi</span></div></Card></div>}

function ActionModal({ type, data, onClose, onDone }) {
  const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  const branches=asArray(data.branches), users=asArray(data.users);
  async function handleSubmit(e){e.preventDefault(); setBusy(true); setError(""); const fd=new FormData(e.currentTarget); const obj=Object.fromEntries(fd.entries()); try{
    if(type==='content') await api.create('content',{...obj, bonus_enabled: obj.bonus_enabled==='on'});
    if(type==='campaign') await api.create('campaigns',obj);
    if(type==='task') await api.create('tasks',obj);
    if(type==='expense') await api.create('expenses',obj);
    if(type==='upload'){const form=new FormData(); form.append('file', fd.get('file')); form.append('folder_name', obj.folder_name||''); form.append('tags_json', JSON.stringify(String(obj.tags||'').split(',').map(s=>s.trim()).filter(Boolean))); await api.upload(form);}
    onDone();
  }catch(err){setError(err.message||'Saqlashda xatolik');} finally{setBusy(false);} }
  const title={content:'Kontent qo‘shish',campaign:'Kampaniya yaratish',task:'Vazifa yaratish',expense:'Xarajat qo‘shish',upload:'Fayl yuklash'}[type]||'Yangi';
  return <div className="modal-backdrop"><form className="modal-card" onSubmit={handleSubmit}><div className="modal-head"><h2>{title}</h2><button type="button" onClick={onClose}><X/></button></div>{type==='content'&&<><Field name="title" label="Sarlavha" required/><div className="form-grid"><Field name="publish_date" label="Sana" type="date" defaultValue={today}/><Select name="platform" label="Kanal" options={["Instagram","Telegram","YouTube","Website"]}/><Select name="content_type" label="Tur" options={["post","video","story","reels","blog"]}/><Select name="status" label="Status" options={["reja","tasdiq","published"]}/></div><Select name="assigned_user_id" label="Mas'ul" options={users.map(u=>[u.id,u.full_name])}/><Text name="notes" label="Izoh"/></>}{type==='campaign'&&<><Field name="title" label="Kampaniya nomi" required/><div className="form-grid"><Select name="platform" label="Kanal" options={["Meta Ads","Google Ads","Telegram Ads","Influencer"]}/><Select name="branch_id" label="Filial" options={branches.map(b=>[b.id,b.name])}/><Field name="start_at" label="Start" type="date" defaultValue={today}/><Field name="end_at" label="Tugash" type="date"/></div><div className="form-grid"><Field name="daily_budget" label="Kunlik byudjet" type="number"/><Field name="spend" label="Sarflangan" type="number"/><Field name="leads" label="Lidlar" type="number"/><Field name="sales" label="Savdo" type="number"/></div><Select name="status" label="Status" options={["active","paused","draft"]}/><Text name="notes" label="Izoh"/></>}{type==='task'&&<><Field name="title" label="Vazifa nomi" required/><Text name="description" label="Tavsif"/><div className="form-grid"><Select name="status" label="Status" options={[['todo','Rejada'],['progress','Jarayonda'],['review','Tekshiruvda'],['done','Tayyor']]}/><Select name="priority" label="Ustuvorlik" options={["low","medium","high"]}/><Field name="due_date" label="Deadline" type="date" defaultValue={today}/><Select name="assignee_user_id" label="Mas'ul" options={users.map(u=>[u.id,u.full_name])}/></div></>}{type==='expense'&&<><Field name="title" label="Xarajat nomi" required/><div className="form-grid"><Field name="expense_date" label="Sana" type="date" defaultValue={today}/><Field name="amount" label="Summa" type="number" required/><Select name="category" label="Kategoriya" options={["Kontent ishlab chiqarish","Reklama va targ‘ibot","Xodimlar va ish haqi","Sayohat va safarlar","Boshqa"]}/><Select name="payment_type" label="To'lov" options={["visa","cash","bank","corporate_card"]}/></div><Field name="vendor_name" label="Vendor"/><Text name="notes" label="Izoh"/></>}{type==='upload'&&<><label className="field">Fayl<input name="file" type="file" required/></label><Field name="folder_name" label="Papka/Kolleksiya"/><Field name="tags" label="Teglar" placeholder="chegirma, instagram"/></>}{error&&<div className="form-error">{error}</div>}<div className="modal-actions"><button type="button" onClick={onClose}>Bekor qilish</button><button className="primary" disabled={busy}>{busy?<Loader2 className="spin"/>:<Check/>} Saqlash</button></div></form></div>
}
function Field({label,name,type='text',...props}){return <label className="field">{label}<input name={name} type={type} {...props}/></label>}
function Text({label,name,...props}){return <label className="field">{label}<textarea name={name} rows="3" {...props}/></label>}
function Select({label,name,options=[]}){return <label className="field">{label}<select name={name}>{options.map(o=>Array.isArray(o)?<option key={o[0]} value={o[0]}>{o[1]}</option>:<option key={o} value={o}>{o}</option>)}</select></label>}

export default App;
