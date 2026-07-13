import { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, Edit3, Eye, MousePointerClick, MoreHorizontal, Plus, RefreshCw, Search, Target, Trash2, WalletCards,
} from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';
import AdFormModal from '../components/AdFormModal.jsx';
import { adStatusLabels, formatCompact, formatDate, formatMoney, objectiveLabels } from '../data/marketing.js';

const emptySummary = { total: 0, active: 0, dailyBudget: 0, spend: 0, impressions: 0, reach: 0, clicks: 0, cpm: 0, ctr: 0 };

function Stat({ label, value, note, icon: Icon, tone = 'blue' }) {
  return <article className="marketing-stat"><span className={`marketing-stat__icon marketing-stat__icon--${tone}`}><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

export default function AdsPage({ session, notify }) {
  const [items, setItems] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [platformStats, setPlatformStats] = useState([]);
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
      const [list, totals, meta, campaignList] = await Promise.all([
        apiRequest(`/api/ads?${params}`, { headers }),
        apiRequest('/api/ads/summary', { headers }),
        metadata.platforms.length ? Promise.resolve(metadata) : apiRequest('/api/meta', { headers }),
        campaigns.length ? Promise.resolve({ items: campaigns }) : apiRequest('/api/campaigns?limit=250', { headers }),
      ]);
      setItems(list.items || []);
      setSummary({ ...emptySummary, ...(totals.metrics || {}) });
      setPlatformStats(totals.platformStats || []);
      if (meta.platforms) setMetadata(meta);
      if (campaignList.items) setCampaigns(campaignList.items);
    } catch (error) { notify(error.message); } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [filters.status, filters.platformId, filters.branchId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 350); return () => clearTimeout(timer); }, [filters.search]);
  const topAds = useMemo(() => [...items].sort((a, b) => b.clicks - a.clicks).slice(0, 5), [items]);

  const save = async (form) => {
    setSaving(true);
    try {
      const path = modal.item ? `/api/ads/${modal.item.id}` : '/api/ads';
      await apiRequest(path, { method: modal.item ? 'PUT' : 'POST', headers, body: JSON.stringify(form) });
      setModal({ open: false, item: null });
      notify(modal.item ? 'Reklama yangilandi.' : 'Target reklama yaratildi.');
      await load();
    } catch (error) { notify(error.message); } finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`“${item.name}” reklamasini o‘chirasizmi?`)) return;
    try { await apiRequest(`/api/ads/${item.id}`, { method: 'DELETE', headers }); notify('Reklama o‘chirildi.'); setMenuId(null); await load(); } catch (error) { notify(error.message); }
  };

  const totalPlacementClicks = platformStats.reduce((sum, p) => sum + p.clicks, 0) || 1;

  return <div>
    <div className="page-heading"><div><h1>Target reklama</h1><p>Meta, Telegram va boshqa reklama kampaniyalari nazorati</p></div><button className="button-primary" onClick={() => setModal({ open: true, item: null })}><Plus size={18} /> Yangi reklama</button></div>

    <section className="marketing-stat-grid">
      <Stat label="Faol reklamalar" value={summary.active} note={`${summary.total} ta jami reklama`} icon={Target} />
      <Stat label="Kunlik byudjet" value={formatMoney(summary.dailyBudget)} note="faol va rejalashtirilgan" icon={WalletCards} tone="purple" />
      <Stat label="Jami sarf" value={formatMoney(summary.spend)} note="reklama xarajati" icon={WalletCards} tone="amber" />
      <Stat label="CPM" value={formatMoney(summary.cpm)} note="1000 ko‘rishga sarf" icon={Eye} tone="cyan" />
      <Stat label="CTR" value={`${summary.ctr}%`} note="klik koeffitsiyenti" icon={MousePointerClick} tone="rose" />
      <Stat label="Kliklar" value={formatCompact(summary.clicks)} note={`${formatCompact(summary.reach)} reach`} icon={MousePointerClick} tone="green" />
    </section>

    <section className="marketing-layout">
      <article className="content-panel marketing-table-card">
        <div className="content-toolbar">
          <label className="search-field"><Search size={17} /><input value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Reklama nomi yoki auditoriya..." /></label>
          <div className="filter-group">
            <label><select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}><option value="">Barcha statuslar</option>{Object.entries(adStatusLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select><ChevronDown size={14} /></label>
            <label><select value={filters.platformId} onChange={(e) => setFilters((f) => ({ ...f, platformId: e.target.value }))}><option value="">Barcha platformalar</option>{metadata.platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><ChevronDown size={14} /></label>
            <label><select value={filters.branchId} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}><option value="">Barcha filiallar</option>{metadata.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select><ChevronDown size={14} /></label>
            <button className="icon-action" onClick={load}><RefreshCw size={17} className={loading ? 'spin' : ''} /></button>
          </div>
        </div>
        <div className="content-table-wrap">
          <table className="content-table marketing-table ads-table">
            <thead><tr><th>Reklama</th><th>Platforma</th><th>Filial</th><th>Maqsad / auditoriya</th><th>Kunlik byudjet</th><th>Sarf</th><th>CPM</th><th>CTR</th><th>Kliklar</th><th>Status</th><th /></tr></thead>
            <tbody>{items.map((item) => <tr key={item.id}>
              <td><div className="campaign-name-cell"><span style={{ color: item.platform.color, background: `${item.platform.color}15` }}><Target size={18} /></span><div><strong>{item.name}</strong><small>{item.campaign?.name || 'Alohida reklama'} · {formatDate(item.startDate)}</small></div></div></td>
              <td><span className="platform-pill"><i style={{ background: item.platform.color }} />{item.platform.name}</span></td>
              <td>{item.branch?.name || 'Umumiy'}</td>
              <td><div className="result-stack"><strong>{objectiveLabels[item.objective]}</strong><small>{item.audience || 'Auditoriya kiritilmagan'}</small></div></td>
              <td><strong>{formatMoney(item.dailyBudget)}</strong></td>
              <td><div className="money-stack"><strong>{formatMoney(item.spend)}</strong><small>{formatMoney(item.totalBudget)} limit</small></div></td>
              <td>{formatMoney(item.cpm)}</td><td><strong>{item.ctr}%</strong></td><td><strong>{formatCompact(item.clicks)}</strong></td>
              <td><span className={`marketing-status marketing-status--${item.status}`}>{adStatusLabels[item.status]}</span></td>
              <td className="action-cell"><button className="table-menu-button" onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreHorizontal size={18} /></button>{menuId === item.id && <div className="row-menu"><button onClick={() => { setModal({ open: true, item }); setMenuId(null); }}><Edit3 size={15} /> Tahrirlash</button><button className="danger" onClick={() => remove(item)}><Trash2 size={15} /> O‘chirish</button></div>}</td>
            </tr>)}</tbody>
          </table>
          {loading && <div className="table-state"><span className="spinner spinner--blue" /> Yuklanmoqda...</div>}
          {!loading && items.length === 0 && <div className="empty-state"><span><Target size={27} /></span><h3>Reklama topilmadi</h3><p>Yangi target reklama yarating yoki filterlarni o‘zgartiring.</p><button className="button-primary" onClick={() => setModal({ open: true, item: null })}><Plus size={17} /> Reklama yaratish</button></div>}
        </div>
      </article>

      <aside className="marketing-side">
        <article className="side-card"><div className="card-header"><div><h3>Platformalar natijasi</h3><p>Kliklar bo‘yicha taqsimot</p></div></div><div className="platform-performance">{platformStats.map((p) => {
          const pct = Math.round((p.clicks / totalPlacementClicks) * 100);
          return <div key={p.id}><div><span><i style={{ background: p.color }} />{p.name}</span><b>{pct}%</b></div><em><i style={{ width: `${pct}%`, background: p.color }} /></em><small>{formatCompact(p.clicks)} klik · {formatMoney(p.spend)}</small></div>;
        })}</div></article>
        <article className="side-card"><div className="card-header"><div><h3>Eng yaxshi reklamalar</h3><p>Kliklar bo‘yicha</p></div></div><div className="top-list">{topAds.map((item, index) => <div key={item.id}><b>{index + 1}</b><span><strong>{item.name}</strong><small>{formatCompact(item.clicks)} klik · CTR {item.ctr}%</small></span></div>)}{topAds.length === 0 && <p className="empty-mini">Hali reklama yo‘q</p>}</div></article>
      </aside>
    </section>

    <AdFormModal open={modal.open} item={modal.item} metadata={metadata} campaigns={campaigns} saving={saving} onClose={() => setModal({ open: false, item: null })} onSave={save} />
  </div>;
}
