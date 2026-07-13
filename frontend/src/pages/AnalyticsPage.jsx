import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, ChevronDown, CircleDollarSign, Edit3, Eye, Gauge, Megaphone,
  MessageCircle, MousePointerClick, Plus, RefreshCw, ShoppingBag, Target, Trash2, TrendingUp, Users,
} from 'lucide-react';
import MetricFormModal from '../components/MetricFormModal.jsx';
import { apiRequest, authHeaders } from '../lib/api.js';
import { formatCompact, formatMoney, formatNumber, monthRange } from '../data/analytics.js';

const empty = {
  source: 'daily_metrics', filters: monthRange(),
  summary: { reach: 0, impressions: 0, clicks: 0, engagement: 0, messages: 0, leads: 0, salesCount: 0, salesValue: 0, spend: 0, ctr: 0, cpm: 0, cpc: 0, cpl: 0, engagementRate: 0, roas: 0 },
  trend: [], platforms: [], branches: [], topCampaigns: [], contentPerformance: [],
};

function Kpi({ icon: Icon, label, value, note, tone = 'blue' }) {
  return <article className="analytics-kpi"><span className={`analytics-kpi__icon analytics-kpi__icon--${tone}`}><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

function TrendChart({ items }) {
  const width = 820; const height = 245; const padding = 34;
  const values = items.map((x) => Number(x.reach || 0));
  const max = Math.max(...values, 1);
  const points = items.map((item, index) => {
    const x = padding + (index / Math.max(1, items.length - 1)) * (width - padding * 2);
    const y = height - padding - (Number(item.reach || 0) / max) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');
  return (
    <div className="analytics-chart-wrap">
      {items.length === 0 ? <div className="empty-chart"><BarChart3 size={30} /><p>Tanlangan davrda trend ma’lumoti yo‘q.</p></div> : (
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Reach trend grafigi">
          {[0, .25, .5, .75, 1].map((part) => <line key={part} x1={padding} x2={width-padding} y1={padding + part*(height-padding*2)} y2={padding + part*(height-padding*2)} className="chart-grid-line" />)}
          <defs><linearGradient id="reachArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1690F5" stopOpacity=".28"/><stop offset="100%" stopColor="#1690F5" stopOpacity="0"/></linearGradient></defs>
          <polygon points={`${padding},${height-padding} ${points} ${width-padding},${height-padding}`} fill="url(#reachArea)" />
          <polyline points={points} fill="none" stroke="#1690F5" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
          {items.map((item, index) => {
            const [x,y] = points.split(' ')[index].split(',');
            return <circle key={`${item.date}-${index}`} cx={x} cy={y} r="4" fill="#fff" stroke="#1690F5" strokeWidth="3"><title>{String(item.date).slice(0,10)}: {formatNumber(item.reach)} reach</title></circle>;
          })}
        </svg>
      )}
      {items.length > 0 && <div className="chart-axis-labels"><span>{String(items[0].date).slice(0,10)}</span><span>{String(items.at(-1).date).slice(0,10)}</span></div>}
    </div>
  );
}

export default function AnalyticsPage({ session, notify }) {
  const [filters, setFilters] = useState({ ...monthRange(), platformId: '', branchId: '' });
  const [data, setData] = useState(empty);
  const [metadata, setMetadata] = useState({ platforms: [], branches: [] });
  const [campaigns, setCampaigns] = useState([]);
  const [ads, setAds] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modal, setModal] = useState({ open: false, item: null });
  const headers = authHeaders(session.token);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const [overview, recent, meta, campaignList, adList] = await Promise.all([
        apiRequest(`/api/analytics/overview?${params}`, { headers }),
        apiRequest(`/api/analytics/entries?${params}&limit=20`, { headers }),
        metadata.platforms.length ? Promise.resolve(metadata) : apiRequest('/api/meta', { headers }),
        campaigns.length ? Promise.resolve({ items: campaigns }) : apiRequest('/api/campaigns?limit=250', { headers }),
        ads.length ? Promise.resolve({ items: ads }) : apiRequest('/api/ads?limit=250', { headers }),
      ]);
      setData({ ...empty, ...overview, summary: { ...empty.summary, ...(overview.summary || {}) } });
      setEntries(recent.items || []);
      if (meta.platforms) setMetadata(meta);
      if (campaignList.items) setCampaigns(campaignList.items);
      if (adList.items) setAds(adList.items);
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { const timer = setTimeout(() => { void load(); }, 180); return () => clearTimeout(timer); }, [filters.dateFrom, filters.dateTo, filters.platformId, filters.branchId]);

  const save = async (form) => {
    setSaving(true);
    try {
      const path = modal.item ? `/api/analytics/entries/${modal.item.id}` : '/api/analytics/entries';
      await apiRequest(path, { method: modal.item ? 'PUT' : 'POST', headers, body: JSON.stringify(form) });
      notify(modal.item ? 'Analitika yozuvi yangilandi.' : 'Kundalik natija qo‘shildi.');
      setModal({ open: false, item: null });
      await load();
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`${String(item.metricDate).slice(0,10)} kungi natijani o‘chirasizmi?`)) return;
    try { await apiRequest(`/api/analytics/entries/${item.id}`, { method: 'DELETE', headers }); notify('Analitika yozuvi o‘chirildi.'); await load(); }
    catch (error) { notify(error.message); }
  };

  const maxPlatformReach = Math.max(...data.platforms.map((x) => x.reach), 1);
  const sourceText = data.source === 'daily_metrics' ? 'Kundalik real natijalar' : 'Kampaniya va target ma’lumotlari';
  const sortedBranches = useMemo(() => [...data.branches].sort((a,b) => b.reach-a.reach).slice(0,10), [data.branches]);

  return <div className="analytics-page">
    <div className="page-heading"><div><h1>Analitika</h1><p>Kontent, platforma, filial va reklama natijalarini real vaqtda tahlil qiling</p></div><button className="button-primary" onClick={() => setModal({ open: true, item: null })}><Plus size={18}/> Natija qo‘shish</button></div>

    <section className="analytics-filterbar">
      <div className="analytics-period"><label><span>Dan</span><input type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}/></label><label><span>Gacha</span><input type="date" value={filters.dateTo} min={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}/></label></div>
      <div className="filter-group">
        <label><select value={filters.platformId} onChange={(e) => setFilters((f) => ({ ...f, platformId: e.target.value }))}><option value="">Barcha platformalar</option>{metadata.platforms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><ChevronDown size={14}/></label>
        <label><select value={filters.branchId} onChange={(e) => setFilters((f) => ({ ...f, branchId: e.target.value }))}><option value="">Barcha filiallar</option>{metadata.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><ChevronDown size={14}/></label>
        <button className="icon-action" onClick={load} aria-label="Yangilash"><RefreshCw size={17} className={loading ? 'spin' : ''}/></button>
      </div>
      <span className="analytics-source"><i/> {sourceText}</span>
    </section>

    <section className="analytics-kpi-grid">
      <Kpi icon={Eye} label="Reach" value={formatCompact(data.summary.reach)} note={`${formatCompact(data.summary.impressions)} impressions`} />
      <Kpi icon={MousePointerClick} label="Kliklar" value={formatCompact(data.summary.clicks)} note={`CTR ${data.summary.ctr}%`} tone="purple" />
      <Kpi icon={Users} label="Engagement" value={formatCompact(data.summary.engagement)} note={`${data.summary.engagementRate}% rate`} tone="rose" />
      <Kpi icon={MessageCircle} label="Xabar / lead" value={`${formatCompact(data.summary.messages)} / ${formatCompact(data.summary.leads)}`} note={`CPL ${formatMoney(data.summary.cpl)}`} tone="cyan" />
      <Kpi icon={CircleDollarSign} label="Reklama sarfi" value={formatMoney(data.summary.spend)} note={`CPM ${formatMoney(data.summary.cpm)}`} tone="amber" />
      <Kpi icon={ShoppingBag} label="Sotuvlar" value={formatCompact(data.summary.salesCount)} note={formatMoney(data.summary.salesValue)} tone="green" />
      <Kpi icon={Gauge} label="ROAS" value={`${data.summary.roas}x`} note="sotuv qiymati / sarf" tone="blue" />
      <Kpi icon={TrendingUp} label="Yangi obunachi" value={formatCompact(data.summary.followersGained)} note={`${formatCompact(data.summary.videoViews)} video ko‘rish`} tone="purple" />
    </section>

    <section className="analytics-main-grid">
      <article className="dashboard-card analytics-trend-card"><div className="card-header"><div><h3>Reach dinamikasi</h3><p>Kunlik natijalar trendi</p></div><span className="chart-total">{formatNumber(data.summary.reach)}</span></div><TrendChart items={data.trend}/></article>
      <article className="dashboard-card analytics-platform-card"><div className="card-header"><div><h3>Platformalar</h3><p>Reach va samaradorlik</p></div></div><div className="analytics-platform-list">{data.platforms.map((item) => <div key={item.id}><div><span><i style={{background:item.color}}/>{item.name}</span><strong>{formatCompact(item.reach)}</strong></div><em><i style={{ width: `${(item.reach/maxPlatformReach)*100}%`, background:item.color }}/></em><small>{formatCompact(item.clicks)} klik · {item.ctr}% CTR · {formatMoney(item.spend)}</small></div>)}{data.platforms.length===0 && <p className="empty-mini">Platforma natijasi yo‘q</p>}</div></article>
    </section>

    <section className="analytics-bottom-grid">
      <article className="content-panel analytics-table-card"><div className="card-header analytics-card-pad"><div><h3>Filiallar reytingi</h3><p>Reach bo‘yicha eng faol filiallar</p></div></div><div className="content-table-wrap"><table className="content-table analytics-table"><thead><tr><th>#</th><th>Filial</th><th>Reach</th><th>Klik</th><th>Lead</th><th>Sotuv</th><th>Sarf</th><th>ROAS</th></tr></thead><tbody>{sortedBranches.map((item,index)=><tr key={item.id}><td><span className="rank-badge">{index+1}</span></td><td><strong>{item.name}</strong><small className="table-subline">{item.region}</small></td><td>{formatNumber(item.reach)}</td><td>{formatNumber(item.clicks)}</td><td>{formatNumber(item.leads)}</td><td>{formatNumber(item.salesCount)}</td><td>{formatMoney(item.spend)}</td><td><span className="roas-pill">{item.roas}x</span></td></tr>)}</tbody></table>{sortedBranches.length===0 && <div className="empty-state compact-empty"><Target size={26}/><p>Filial natijalari yo‘q.</p></div>}</div></article>

      <article className="dashboard-card analytics-campaign-card"><div className="card-header"><div><h3>Top kampaniyalar</h3><p>Sotuv qiymati va ROAS bo‘yicha</p></div></div><div className="analytics-campaign-list">{data.topCampaigns.slice(0,6).map((item,index)=><div key={item.id}><b>{index+1}</b><span><strong>{item.name}</strong><small>{formatCompact(item.reach)} reach · {formatMoney(item.spend)} sarf</small></span><em>{item.roas}x</em></div>)}{data.topCampaigns.length===0 && <p className="empty-mini">Kampaniya topilmadi</p>}</div></article>
    </section>

    <section className="content-panel analytics-entries-card"><div className="card-header analytics-card-pad"><div><h3>Kundalik kiritilgan natijalar</h3><p>Qo‘lda kiritilgan real platforma va filial ko‘rsatkichlari</p></div><button className="secondary-action" onClick={() => setModal({open:true,item:null})}><Plus size={16}/> Qo‘shish</button></div><div className="content-table-wrap"><table className="content-table analytics-entry-table"><thead><tr><th>Sana</th><th>Platforma</th><th>Filial</th><th>Reach</th><th>Klik</th><th>Lead</th><th>Sotuv</th><th>Sarf</th><th/></tr></thead><tbody>{entries.map((item)=><tr key={item.id}><td>{String(item.metricDate).slice(0,10)}</td><td>{item.platform?<span className="platform-label"><i style={{background:item.platform.color}}/>{item.platform.name}</span>:'Umumiy'}</td><td>{item.branch?.name||'Umumiy'}</td><td>{formatNumber(item.reach)}</td><td>{formatNumber(item.clicks)}</td><td>{formatNumber(item.leads)}</td><td>{formatNumber(item.salesCount)}</td><td>{formatMoney(item.spend)}</td><td><div className="inline-actions"><button onClick={()=>setModal({open:true,item})}><Edit3 size={15}/></button><button className="danger" onClick={()=>remove(item)}><Trash2 size={15}/></button></div></td></tr>)}</tbody></table>{!loading&&entries.length===0&&<div className="empty-state compact-empty"><BarChart3 size={27}/><h3>Kundalik natija hali kiritilmagan</h3><p>Natija qo‘shilgach analitika yanada aniq ishlaydi.</p></div>}</div></section>

    <MetricFormModal open={modal.open} item={modal.item} metadata={metadata} campaigns={campaigns} ads={ads} saving={saving} onClose={()=>setModal({open:false,item:null})} onSave={save}/>
  </div>;
}
