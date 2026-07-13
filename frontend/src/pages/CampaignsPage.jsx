import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, ChevronDown, Edit3, Eye, Megaphone, MoreHorizontal, Plus, RefreshCw, Search, Trash2, WalletCards,
} from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';
import CampaignFormModal from '../components/CampaignFormModal.jsx';
import { campaignStatusLabels, formatCompact, formatDate, formatMoney, objectiveLabels } from '../data/marketing.js';

const emptySummary = { total: 0, active: 0, planned: 0, budget: 0, spend: 0, reach: 0, videoViews: 0, engagement: 0, roi: 0 };

function Stat({ label, value, note, icon: Icon, tone = 'blue' }) {
  return <article className="marketing-stat"><span className={`marketing-stat__icon marketing-stat__icon--${tone}`}><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

export default function CampaignsPage({ session, notify }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [metadata, setMetadata] = useState({ platforms: [], branches: [], users: [] });
  const [filters, setFilters] = useState({ search: '', status: '', platformId: '', branchId: '' });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, item: null });
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState(null);

  const headers = authHeaders(session.token);
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const [list, totals, meta] = await Promise.all([
        apiRequest(`/api/campaigns?${params}`, { headers }),
        apiRequest('/api/campaigns/summary', { headers }),
        metadata.platforms.length ? Promise.resolve(metadata) : apiRequest('/api/meta', { headers }),
      ]);
      setItems(list.items || []);
      setSummary({ ...emptySummary, ...(totals.metrics || {}) });
      if (meta.platforms) setMetadata(meta);
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [filters.status, filters.platformId, filters.branchId]);
  useEffect(() => {
    const timer = setTimeout(() => { void load(); }, 350);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const topCampaigns = useMemo(() => [...items].sort((a, b) => b.reach - a.reach).slice(0, 5), [items]);

  const save = async (form) => {
    setSaving(true);
    try {
      const path = modal.item ? `/api/campaigns/${modal.item.id}` : '/api/campaigns';
      const method = modal.item ? 'PUT' : 'POST';
      await apiRequest(path, { method, headers, body: JSON.stringify(form) });
      setModal({ open: false, item: null });
      notify(modal.item ? 'Kampaniya yangilandi.' : 'Yangi kampaniya yaratildi.');
      await load();
    } catch (error) {
      notify(error.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item) => {
    if (!window.confirm(`“${item.name}” kampaniyasini o‘chirasizmi?`)) return;
    try {
      await apiRequest(`/api/campaigns/${item.id}`, { method: 'DELETE', headers });
      notify('Kampaniya o‘chirildi.');
      setMenuId(null);
      await load();
    } catch (error) { notify(error.message); }
  };

  return <div>
    <div className="page-heading"><div><h1>Kampaniyalar</h1><p>Promo va SMM kampaniyalar boshqaruvi</p></div><button className="button-primary" onClick={() => setModal({ open: true, item: null })}><Plus size={18} /> Yangi kampaniya</button></div>

    <section className="marketing-stat-grid">
      <Stat label="Faol kampaniyalar" value={summary.active} note={`${summary.planned} ta rejalashtirilgan`} icon={Megaphone} />
      <Stat label="Jami byudjet" value={formatMoney(summary.budget)} note="barcha kampaniyalar" icon={WalletCards} tone="purple" />
      <Stat label="Jami sarf" value={formatMoney(summary.spend)} note={`${summary.budget ? Math.round((summary.spend / summary.budget) * 100) : 0}% ishlatilgan`} icon={WalletCards} tone="amber" />
      <Stat label="Jami reach" value={formatCompact(summary.reach)} note="kampaniyalar qamrovi" icon={Eye} tone="cyan" />
      <Stat label="Video ko‘rishlar" value={formatCompact(summary.videoViews)} note="video kreativlar" icon={BarChart3} tone="rose" />
      <Stat label="ROI" value={`${summary.roi}%`} note="sotuv qiymatiga nisbatan" icon={BarChart3} tone="green" />
    </section>

    <section className="marketing-layout">
      <article className="content-panel marketing-table-card">
        <div className="content-toolbar">
          <label className="search-field"><Search size={17} /><input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Kampaniya qidirish..." /></label>
          <div className="filter-group">
            <label><select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}><option value="">Barcha statuslar</option>{Object.entries(campaignStatusLabels).map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select><ChevronDown size={14} /></label>
            <label><select value={filters.platformId} onChange={(e) => setFilters((f) => ({ ...f, platformId: e.target.value }))}><option value="">Barcha platformalar</option>{metadata.platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><ChevronDown size={14} /></label>
            <label><select value={filters.branchId} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}><option value="">Barcha filiallar</option>{metadata.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><ChevronDown size={14} /></label>
            <button className="icon-action" onClick={load} aria-label="Yangilash"><RefreshCw size={17} className={loading ? 'spin' : ''} /></button>
          </div>
        </div>
        <div className="content-table-wrap">
          <table className="content-table marketing-table">
            <thead><tr><th>Kampaniya</th><th>Maqsad</th><th>Platforma</th><th>Filiallar</th><th>Byudjet / sarf</th><th>Davr</th><th>Status</th><th>Natija</th><th /></tr></thead>
            <tbody>
              {items.map((item) => <tr key={item.id}>
                <td><div className="campaign-name-cell"><span><Megaphone size={18} /></span><div><strong>{item.name}</strong><small>{item.productDirection || item.description || 'Yo‘nalish kiritilmagan'}</small></div></div></td>
                <td><span className="type-pill">{objectiveLabels[item.objective]}</span></td>
                <td><div className="mini-platforms">{item.platforms.slice(0, 4).map((p) => <i key={p.id} title={p.name} style={{ background: p.color }}>{p.name[0]}</i>)}{item.platforms.length > 4 && <b>+{item.platforms.length - 4}</b>}</div></td>
                <td><span className="table-muted">{item.branches.length ? `${item.branches.slice(0, 2).map((b) => b.name).join(', ')}${item.branches.length > 2 ? ` +${item.branches.length - 2}` : ''}` : 'Barcha filiallar'}</span></td>
                <td><div className="money-stack"><strong>{formatMoney(item.budget)}</strong><small>{formatMoney(item.spend)} sarf</small><i><em style={{ width: `${Math.min(100, item.budget ? (item.spend / item.budget) * 100 : 0)}%` }} /></i></div></td>
                <td><div className="date-stack"><span>{formatDate(item.startDate)}</span><small>{formatDate(item.endDate)}</small></div></td>
                <td><span className={`marketing-status marketing-status--${item.status}`}>{campaignStatusLabels[item.status]}</span></td>
                <td><div className="result-stack"><strong>{formatCompact(item.reach)} reach</strong><small>{formatCompact(item.clicks)} klik · ROI {item.roi}%</small></div></td>
                <td className="action-cell"><button className="table-menu-button" onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreHorizontal size={18} /></button>{menuId === item.id && <div className="row-menu"><button onClick={() => { setModal({ open: true, item }); setMenuId(null); }}><Edit3 size={15} /> Tahrirlash</button><button className="danger" onClick={() => remove(item)}><Trash2 size={15} /> O‘chirish</button></div>}</td>
              </tr>)}
            </tbody>
          </table>
          {loading && <div className="table-state"><span className="spinner spinner--blue" /> Yuklanmoqda...</div>}
          {!loading && items.length === 0 && <div className="empty-state"><span><Megaphone size={27} /></span><h3>Kampaniya topilmadi</h3><p>Yangi promo kampaniya yarating yoki filterlarni o‘zgartiring.</p><button className="button-primary" onClick={() => setModal({ open: true, item: null })}><Plus size={17} /> Kampaniya yaratish</button></div>}
        </div>
      </article>

      <aside className="marketing-side">
        <article className="side-card"><div className="card-header"><div><h3>Kampaniya holati</h3><p>Joriy taqsimot</p></div></div><div className="status-ring"><div><strong>{summary.total}</strong><span>Jami</span></div></div><div className="marketing-status-list">{Object.entries(campaignStatusLabels).map(([status,label]) => <div key={status}><span><i className={`status-dot status-dot--${status}`} />{label}</span><b>{items.filter((x) => x.status === status).length}</b></div>)}</div></article>
        <article className="side-card"><div className="card-header"><div><h3>Top kampaniyalar</h3><p>Reach bo‘yicha</p></div></div><div className="top-list">{topCampaigns.map((item, index) => <div key={item.id}><b>{index + 1}</b><span><strong>{item.name}</strong><small>{formatCompact(item.reach)} reach · {item.roi}% ROI</small></span></div>)}{topCampaigns.length === 0 && <p className="empty-mini">Hali kampaniya yo‘q</p>}</div></article>
      </aside>
    </section>

    <CampaignFormModal open={modal.open} item={modal.item} metadata={metadata} saving={saving} onClose={() => setModal({ open: false, item: null })} onSave={save} />
  </div>;
}
