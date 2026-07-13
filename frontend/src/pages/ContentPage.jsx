import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ChevronDown, Copy, Edit3, FilePlus2, Filter, Image as ImageIcon,
  MessageSquare, MoreHorizontal, RefreshCw, Search, Sparkles, Trash2, Undo2,
} from 'lucide-react';
import ContentFormModal from '../components/ContentFormModal.jsx';
import ContentWorkflowDrawer from '../components/ContentWorkflowDrawer.jsx';
import { statusLabels, typeLabels } from '../data/navigation.js';
import { apiRequest, authHeaders } from '../lib/api.js';

function formatDate(value) {
  if (!value) return 'Sana belgilanmagan';
  return new Intl.DateTimeFormat('uz-UZ', { day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit' }).format(new Date(value));
}
function StatusBadge({ status }) { return <span className={`status-badge status-badge--${status}`}>{statusLabels[status] || status}</span>; }

export default function ContentPage({ session, notify, initialAction = null, initialEntityId = null }) {
  const [items, setItems] = useState([]);
  const [metadata, setMetadata] = useState({ platforms: [], branches: [], users: [] });
  const [templates, setTemplates] = useState([]);
  const [filters, setFilters] = useState({ search:'',status:'',platformId:'',branchId:'' });
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(initialAction === 'create');
  const [workflowItem, setWorkflowItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [undoItem, setUndoItem] = useState(null);

  const loadMetadata = useCallback(async () => {
    const [meta, templateResult] = await Promise.all([
      apiRequest('/api/meta', { headers: authHeaders(session.token) }),
      apiRequest('/api/templates', { headers: authHeaders(session.token) }).catch(() => ({ items:[] })),
    ]);
    setMetadata(meta); setTemplates(templateResult.items || []);
  }, [session.token]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key,value]) => value && query.set(key,value));
      const result = await apiRequest(`/api/content?${query}`, { headers: authHeaders(session.token) });
      setItems(result.items || []);
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  }, [filters,notify,session.token]);

  useEffect(() => { void loadMetadata().catch((error) => notify(error.message)); }, [loadMetadata,notify]);
  useEffect(() => { const timer=setTimeout(() => void loadItems(), filters.search ? 300 : 0); return () => clearTimeout(timer); }, [loadItems,filters.search]);
  useEffect(() => {
    const refresh = () => void loadItems();
    ['content.created','content.updated','content.status','content.deleted','content.restored'].forEach((name) => window.addEventListener(`aloo:realtime:${name}`,refresh));
    return () => ['content.created','content.updated','content.status','content.deleted','content.restored'].forEach((name) => window.removeEventListener(`aloo:realtime:${name}`,refresh));
  }, [loadItems]);
  useEffect(() => { if (initialAction === 'create') { setModalItem(null); setModalOpen(true); } }, [initialAction]);
  useEffect(() => {
    if (!initialEntityId) return;
    const existing = items.find((item) => Number(item.id) === Number(initialEntityId));
    if (existing) setWorkflowItem(existing);
    else apiRequest(`/api/content/${initialEntityId}`, { headers: authHeaders(session.token) }).then((result) => setWorkflowItem(result.item)).catch(() => {});
  }, [initialEntityId, items, session.token]);

  const counts = useMemo(() => ({
    total:items.length,draft:items.filter((item)=>item.status==='draft').length,
    review:items.filter((item)=>['review','changes_requested'].includes(item.status)).length,
    scheduled:items.filter((item)=>['approved','scheduled'].includes(item.status)).length,
    published:items.filter((item)=>item.status==='published').length,
  }), [items]);
  const nextItem = useMemo(() => items.filter((item)=>item.publishAt && new Date(item.publishAt)>=new Date()).sort((a,b)=>new Date(a.publishAt)-new Date(b.publishAt))[0], [items]);
  const openCreate = (template = null) => { setModalItem(template ? { id:undefined,templateId:template.id,title:template.titleTemplate,description:template.descriptionTemplate,contentType:template.contentType,platform:metadata.platforms.find((p)=>p.code===template.platformCode),tags:template.tags,status:'draft' } : null); setModalOpen(true); };
  const openEdit = (item) => { setModalItem(item); setModalOpen(true); setMenuId(null); };

  const save = async (payload) => {
    setSaving(true);
    try {
      const editing=Boolean(modalItem?.id);
      await apiRequest(editing?`/api/content/${modalItem.id}`:'/api/content',{ method:editing?'PUT':'POST',headers:authHeaders(session.token),body:JSON.stringify(payload) });
      notify(editing?'Kontent yangilandi.':'Yangi kontent yaratildi.'); setModalOpen(false); setModalItem(null); await loadItems();
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };
  const duplicate = (item) => { setModalItem({ ...item,id:undefined,title:`${item.title} — nusxa`,status:'draft',publishAt:null }); setModalOpen(true); setMenuId(null); };
  const remove = async (item) => {
    setMenuId(null); if (!window.confirm(`“${item.title}” kontentini o‘chirasizmi?`)) return;
    try { await apiRequest(`/api/content/${item.id}`,{method:'DELETE',headers:authHeaders(session.token)}); setUndoItem(item); await loadItems(); setTimeout(()=>setUndoItem((current)=>current?.id===item.id?null:current),7000); }
    catch (error) { notify(error.message); }
  };
  const undo = async () => {
    if (!undoItem) return;
    try { await apiRequest(`/api/content/${undoItem.id}/restore`,{method:'POST',headers:authHeaders(session.token),body:'{}'}); notify('Kontent qaytarildi.'); setUndoItem(null); await loadItems(); }
    catch (error) { notify(error.message); }
  };

  return <div className="content-page premium-content-page">
    <section className="content-hero"><div className="content-hero-copy"><span className="page-eyebrow">KONTENT MARKAZI</span><h1>Kontent reja</h1><p>G‘oyadan nashrgacha bo‘lgan barcha jarayonni tez, tartibli va jamoa bilan birga boshqaring.</p><div className="content-hero-actions"><button className="button-primary button-primary--large" onClick={() => openCreate()}><FilePlus2 size={20}/> Tezkor kontent qo‘shish</button><button className="ai-hero-action" onClick={() => window.dispatchEvent(new CustomEvent('aloo:open-ai'))}><Sparkles size={18}/> AI g‘oya</button><span><CalendarDays size={17}/>{nextItem?`Keyingi nashr: ${formatDate(nextItem.publishAt)}`:'Rejalashtirilgan nashr yo‘q'}</span></div></div><div className="content-hero-visual" aria-hidden="true"><div className="content-orbit content-orbit--one"/><div className="content-orbit content-orbit--two"/><div className="content-hero-card content-hero-card--main"><ImageIcon size={30}/><strong>{counts.total}</strong><small>Jami kontent</small></div><div className="content-hero-card content-hero-card--floating"><FilePlus2 size={19}/><span>Yangi g‘oya</span></div></div></section>

    {templates.length>0 && <section className="content-template-gallery"><header><div><span><Sparkles size={18}/></span><div><h2>Tayyor shablonlar</h2><p>Mayda ishlarni bir bosishda boshlang</p></div></div><small>{templates.length} ta shablon</small></header><div>{templates.slice(0,8).map((template)=><button key={template.id} onClick={()=>openCreate(template)}><i>{template.name.slice(0,1)}</i><span><strong>{template.name}</strong><small>{template.category} · {typeLabels[template.contentType]}</small></span><FilePlus2 size={17}/></button>)}</div></section>}

    <section className="content-stat-grid content-stat-grid--premium"><article data-tone="blue"><span className="content-stat-icon"><ImageIcon size={20}/></span><div><small>Jami kontent</small><strong>{counts.total}</strong><em>Barcha formatlar</em></div></article><article data-tone="gray"><span className="content-stat-icon"><Edit3 size={20}/></span><div><small>Draft</small><strong>{counts.draft}</strong><em>Ishlanmoqda</em></div></article><article data-tone="amber"><span className="content-stat-icon"><RefreshCw size={20}/></span><div><small>Tekshiruv / tuzatish</small><strong>{counts.review}</strong><em>Jamoa jarayoni</em></div></article><article data-tone="purple"><span className="content-stat-icon"><CalendarDays size={20}/></span><div><small>Rejada</small><strong>{counts.scheduled}</strong><em>Nashrga tayyor</em></div></article><article data-tone="green"><span className="content-stat-icon"><FilePlus2 size={20}/></span><div><small>Chop etildi</small><strong>{counts.published}</strong><em>Natijaga chiqarildi</em></div></article></section>

    <section className="content-panel content-panel--premium"><div className="content-panel-heading"><div><span>Kontentlar</span><h2>Barcha rejalashtirilgan materiallar</h2></div><button className="button-primary content-panel-add" onClick={()=>openCreate()}><FilePlus2 size={18}/> Qo‘shish</button></div><div className="content-toolbar"><div className="search-field"><Search size={19}/><input value={filters.search} onChange={(event)=>setFilters((current)=>({...current,search:event.target.value}))} placeholder="Sarlavha, caption yoki teg bo‘yicha qidirish..."/></div><div className="filter-group"><label><Filter size={17}/><select value={filters.status} onChange={(event)=>setFilters((current)=>({...current,status:event.target.value}))}><option value="">Barcha statuslar</option>{Object.entries(statusLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><ChevronDown size={16}/></label><label><select value={filters.platformId} onChange={(event)=>setFilters((current)=>({...current,platformId:event.target.value}))}><option value="">Barcha platformalar</option>{metadata.platforms.map((platform)=><option key={platform.id} value={platform.id}>{platform.name}</option>)}</select><ChevronDown size={16}/></label><label><select value={filters.branchId} onChange={(event)=>setFilters((current)=>({...current,branchId:event.target.value}))}><option value="">Barcha filiallar</option>{metadata.branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><ChevronDown size={16}/></label><button className="icon-action" onClick={loadItems}><RefreshCw size={19} className={loading?'spin':''}/></button></div></div>
      <div className="content-table-wrap"><table className="content-table"><thead><tr><th>Kontent</th><th>Turi</th><th>Platforma</th><th>Filial</th><th>Status</th><th>Mas’ul</th><th>Nashr vaqti</th><th/></tr></thead><tbody>{loading&&Array.from({length:5}).map((_,index)=><tr className="skeleton-row" key={index}><td colSpan="8"><div/></td></tr>)}{!loading&&items.length===0&&<tr><td colSpan="8"><div className="empty-state empty-state--premium"><span><ImageIcon size={30}/></span><h3>Kontent reja hali bo‘sh</h3><p>Birinchi g‘oyani 30 soniyada qo‘shing.</p><button className="button-primary button-primary--large" onClick={()=>openCreate()}><FilePlus2 size={18}/> Birinchi kontentni yaratish</button></div></td></tr>}{!loading&&items.map((item)=><tr key={item.id} className="content-row" onDoubleClick={()=>setWorkflowItem(item)}><td><div className="content-title-cell"><span className="content-thumb" style={item.coverUrl?{backgroundImage:`url(${item.coverUrl})`}:{}}>{!item.coverUrl&&<ImageIcon size={21}/>}</span><div><strong>{item.title}</strong><small>{item.description||'Tavsif kiritilmagan'}</small></div></div></td><td><span className="type-pill">{typeLabels[item.contentType]||item.contentType}</span></td><td><span className="platform-pill"><i style={{background:item.platform.color}}/>{item.platform.name}</span></td><td>{item.branch?.name||<span className="muted">Umumiy</span>}</td><td><button className="status-button" onClick={()=>setWorkflowItem(item)}><StatusBadge status={item.status}/></button></td><td>{item.assignee?.fullName||<span className="muted">Belgilanmagan</span>}</td><td><span className="date-cell"><CalendarDays size={16}/>{formatDate(item.publishAt)}</span></td><td className="action-cell"><button className="workflow-mini" onClick={()=>setWorkflowItem(item)} title="Jarayon va izohlar"><MessageSquare size={18}/></button><button className="table-menu-button" onClick={()=>setMenuId((current)=>current===item.id?null:item.id)}><MoreHorizontal size={20}/></button>{menuId===item.id&&<div className="row-menu"><button onClick={()=>openEdit(item)}><Edit3 size={17}/> Tahrirlash</button><button onClick={()=>setWorkflowItem(item)}><MessageSquare size={17}/> Jarayon va izohlar</button><button onClick={()=>duplicate(item)}><Copy size={17}/> Nusxalash</button><button className="danger" onClick={()=>remove(item)}><Trash2 size={17}/> O‘chirish</button></div>}</td></tr>)}</tbody></table></div>
    </section>
    {modalOpen&&<ContentFormModal item={modalItem} metadata={metadata} templates={templates} currentUser={session.user} sessionToken={session.token} onClose={()=>{setModalOpen(false);setModalItem(null);}} onSave={save} saving={saving}/>} 
    {workflowItem&&<ContentWorkflowDrawer item={workflowItem} session={session} onClose={()=>setWorkflowItem(null)} notify={notify} onUpdated={(updated)=>{setWorkflowItem(updated);void loadItems();}}/>}
    {undoItem&&<div className="undo-bar"><span>“{undoItem.title}” o‘chirildi</span><button onClick={undo}><Undo2 size={17}/> Qaytarish</button></div>}
  </div>;
}
