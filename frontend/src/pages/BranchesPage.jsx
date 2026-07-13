import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building2, CheckCircle2, Edit3, Eye, Globe2, MapPin, MoreHorizontal,
  Plus, RefreshCw, Search, Target, UsersRound, XCircle,
} from 'lucide-react';
import BranchFormModal from '../components/BranchFormModal.jsx';
import BranchDetailsModal from '../components/BranchDetailsModal.jsx';
import { apiRequest, authHeaders } from '../lib/api.js';

function compact(value = 0) {
  return new Intl.NumberFormat('uz-UZ', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
}
function progress(value, target) { return target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0; }
function Stat({ icon: Icon, label, value, note, tone = 'blue' }) {
  return <article className="organization-stat"><span className={`organization-stat__icon organization-stat__icon--${tone}`}><Icon size={20}/></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

export default function BranchesPage({ session, notify }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total:0, active:0, members:0, monthlyReach:0, monthlyContent:0 });
  const [regions, setRegions] = useState([]);
  const [platforms, setPlatforms] = useState([]);
  const [filters, setFilters] = useState({ search:'', status:'', region:'' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open:false, item:null });
  const [details, setDetails] = useState(null);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const canManage = session.user?.role === 'admin' || session.user?.permissions?.includes('branches.manage');
  const headers = useMemo(() => authHeaders(session.token), [session.token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(Object.entries(filters).filter(([,value]) => value));
      const [result, meta] = await Promise.all([
        apiRequest(`/api/branches?${query}`, { headers }),
        platforms.length ? Promise.resolve({ platforms }) : apiRequest('/api/meta', { headers }),
      ]);
      setItems(result.items || []); setSummary(result.summary || {}); setRegions(result.regions || []);
      if (meta.platforms) setPlatforms(meta.platforms);
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  }, [filters, headers, notify, platforms]);

  useEffect(() => { const timer = setTimeout(() => void load(), filters.search ? 300 : 0); return () => clearTimeout(timer); }, [load, filters.search]);

  const save = async (payload) => {
    setSaving(true);
    try {
      await apiRequest(modal.item ? `/api/branches/${modal.item.id}` : '/api/branches', { method: modal.item ? 'PUT' : 'POST', headers, body: JSON.stringify(payload) });
      notify(modal.item ? 'Filial yangilandi.' : 'Yangi filial yaratildi.'); setModal({ open:false, item:null }); await load();
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };
  const toggle = async (item) => {
    setMenuId(null);
    try { await apiRequest(`/api/branches/${item.id}/status`, { method:'PATCH', headers, body:JSON.stringify({ isActive:!item.isActive }) }); notify(item.isActive ? 'Filial arxivlandi.' : 'Filial faollashtirildi.'); await load(); }
    catch (error) { notify(error.message); }
  };
  const top = useMemo(() => [...items].sort((a,b) => b.monthlyReach-a.monthlyReach).slice(0,5), [items]);

  return <div>
    <div className="page-heading"><div><h1>Filiallar</h1><p>Aloo do‘konlar tarmog‘i, SMM natijalari va filial akkauntlari</p></div>{canManage&&<button className="button-primary" onClick={() => setModal({open:true,item:null})}><Plus size={18}/> Yangi filial</button>}</div>
    <section className="organization-stat-grid">
      <Stat icon={Building2} label="Jami filiallar" value={summary.total||0} note={`${summary.active||0} ta faol`} />
      <Stat icon={CheckCircle2} label="Faol filiallar" value={summary.active||0} note={`${Math.max(0,(summary.total||0)-(summary.active||0))} ta arxivda`} tone="green"/>
      <Stat icon={UsersRound} label="Biriktirilgan xodimlar" value={summary.members||0} note="filial jamoalari" tone="purple"/>
      <Stat icon={Eye} label="Joriy oy reach" value={compact(summary.monthlyReach)} note={`${summary.monthlyContent||0} ta kontent`} tone="amber"/>
    </section>
    <section className="organization-layout">
      <article className="content-panel organization-main-card">
        <div className="content-toolbar organization-toolbar"><label className="search-field"><Search size={17}/><input value={filters.search} onChange={(e)=>setFilters((f)=>({...f,search:e.target.value}))} placeholder="Filial nomi, hudud yoki kod..."/></label><div className="filter-group"><label><select value={filters.status} onChange={(e)=>setFilters((f)=>({...f,status:e.target.value}))}><option value="">Barcha holatlar</option><option value="active">Faol</option><option value="inactive">Arxivda</option></select></label><label><select value={filters.region} onChange={(e)=>setFilters((f)=>({...f,region:e.target.value}))}><option value="">Barcha hududlar</option>{regions.map((region)=><option key={region}>{region}</option>)}</select></label><button className="icon-action" onClick={load}><RefreshCw size={17} className={loading?'spin':''}/></button></div></div>
        <div className="branch-grid">
          {items.map((item) => {
            const contentProgress = progress(item.monthlyContent,item.monthlyContentTarget);
            const reachProgress = progress(item.monthlyReach,item.monthlyReachTarget);
            return <article key={item.id} className={`branch-card ${!item.isActive?'branch-card--inactive':''}`}>
              <header><span className="branch-card__icon"><Building2 size={21}/></span><div><strong>{item.name}</strong><small><MapPin size={12}/>{item.region||'Hudud ko‘rsatilmagan'}</small></div><span className={`organization-status ${item.isActive?'active':'inactive'}`}>{item.isActive?'Faol':'Arxiv'}</span>{canManage&&<div className="organization-menu-wrap"><button onClick={()=>setMenuId(menuId===item.id?null:item.id)}><MoreHorizontal size={18}/></button>{menuId===item.id&&<div className="row-menu organization-row-menu"><button onClick={()=>{setModal({open:true,item});setMenuId(null);}}><Edit3 size={15}/> Tahrirlash</button><button onClick={()=>toggle(item)}>{item.isActive?<XCircle size={15}/>:<CheckCircle2 size={15}/>} {item.isActive?'Arxivlash':'Faollashtirish'}</button></div>}</div>}</header>
              <div className="branch-card__manager"><span>{(item.managerName||item.name).split(/\s+/).map((x)=>x[0]).join('').slice(0,2)}</span><div><small>Filial rahbari</small><strong>{item.managerName||'Belgilanmagan'}</strong></div></div>
              <div className="branch-card__metrics"><div><span><UsersRound size={15}/> Jamoa</span><b>{item.memberCount}</b></div><div><span><Globe2 size={15}/> Akkaunt</span><b>{item.socialAccountCount}</b></div><div><span><Target size={15}/> Kampaniya</span><b>{item.activeCampaigns}</b></div></div>
              <div className="branch-progress-list"><div><header><span>Kontent rejasi</span><b>{item.monthlyContent}/{item.monthlyContentTarget}</b></header><i><em style={{width:`${contentProgress}%`}}/></i></div><div><header><span>Reach maqsadi</span><b>{compact(item.monthlyReach)}/{compact(item.monthlyReachTarget)}</b></header><i><em className="reach" style={{width:`${reachProgress}%`}}/></i></div></div>
              <footer><button className="button-soft" onClick={()=>setDetails(item)}><Globe2 size={16}/> Akkauntlar va jamoa</button>{canManage&&<button className="icon-action" onClick={()=>setModal({open:true,item})}><Edit3 size={16}/></button>}</footer>
            </article>;
          })}
          {loading&&<div className="organization-loading"><span className="spinner spinner--blue"/> Filiallar yuklanmoqda...</div>}
          {!loading&&!items.length&&<div className="empty-state organization-empty"><span><Building2 size={28}/></span><h3>Filial topilmadi</h3><p>Filterlarni o‘zgartiring yoki yangi filial qo‘shing.</p></div>}
        </div>
      </article>
      <aside className="organization-side"><article className="side-card"><div className="card-header"><div><h3>Top filiallar</h3><p>Joriy oy reach bo‘yicha</p></div></div><div className="organization-ranking">{top.map((item,index)=><div key={item.id}><b>{index+1}</b><span><strong>{item.name}</strong><small>{compact(item.monthlyReach)} reach · {item.monthlyContent} kontent</small></span><em>{progress(item.monthlyReach,item.monthlyReachTarget)}%</em></div>)}{!top.length&&<p className="organization-empty-mini">Hali natijalar yo‘q.</p>}</div></article><article className="side-card organization-network-card"><span><Building2 size={25}/></span><h3>Aloo tarmog‘i</h3><p>Filial ma’lumotlari kontent, kampaniya va analitika modullari bilan avtomatik bog‘langan.</p></article></aside>
    </section>
    <BranchFormModal open={modal.open} item={modal.item} saving={saving} onClose={()=>setModal({open:false,item:null})} onSave={save}/>
    <BranchDetailsModal branch={details} session={session} platforms={platforms} canManage={canManage} notify={notify} onClose={()=>setDetails(null)} onUpdated={load}/>
  </div>;
}
