import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Copy,
  Edit3,
  FilePlus2,
  Filter,
  Image as ImageIcon,
  MoreHorizontal,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import ContentFormModal from '../components/ContentFormModal.jsx';
import { statusLabels, typeLabels } from '../data/navigation.js';
import { apiRequest, authHeaders } from '../lib/api.js';

function formatDate(value) {
  if (!value) return 'Sana belgilanmagan';
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

function StatusBadge({ status }) {
  return <span className={`status-badge status-badge--${status}`}>{statusLabels[status] || status}</span>;
}

export default function ContentPage({ session, notify, initialOpen = false }) {
  const [items, setItems] = useState([]);
  const [metadata, setMetadata] = useState({ platforms: [], branches: [], users: [] });
  const [filters, setFilters] = useState({ search: '', status: '', platformId: '', branchId: '' });
  const [loading, setLoading] = useState(true);
  const [modalItem, setModalItem] = useState(null);
  const [modalOpen, setModalOpen] = useState(initialOpen);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState(null);

  const loadMetadata = useCallback(async () => {
    const result = await apiRequest('/api/meta', { headers: authHeaders(session.token) });
    setMetadata(result);
  }, [session.token]);

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => value && query.set(key, value));
      const result = await apiRequest(`/api/content?${query.toString()}`, { headers: authHeaders(session.token) });
      setItems(result.items || []);
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters, notify, session.token]);

  useEffect(() => { void loadMetadata().catch((error) => notify(error.message)); }, [loadMetadata, notify]);
  useEffect(() => {
    const timer = setTimeout(() => void loadItems(), filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadItems, filters.search]);

  const counts = useMemo(() => ({
    total: items.length,
    draft: items.filter((item) => item.status === 'draft').length,
    review: items.filter((item) => item.status === 'review').length,
    scheduled: items.filter((item) => ['approved', 'scheduled'].includes(item.status)).length,
    published: items.filter((item) => item.status === 'published').length,
  }), [items]);

  const nextItem = useMemo(() => items
    .filter((item) => item.publishAt && new Date(item.publishAt).getTime() >= Date.now())
    .sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt))[0], [items]);

  const openCreate = () => { setModalItem(null); setModalOpen(true); };
  const openEdit = (item) => { setModalItem(item); setModalOpen(true); setMenuId(null); };

  const save = async (payload) => {
    setSaving(true);
    try {
      const isEditing = Boolean(modalItem?.id);
      const path = isEditing ? `/api/content/${modalItem.id}` : '/api/content';
      const method = isEditing ? 'PUT' : 'POST';
      await apiRequest(path, { method, headers: authHeaders(session.token), body: JSON.stringify(payload) });
      notify(modalItem?.id ? 'Kontent yangilandi.' : 'Yangi kontent yaratildi.');
      setModalOpen(false);
      setModalItem(null);
      await loadItems();
    } catch (error) {
      notify(error.message);
    } finally {
      setSaving(false);
    }
  };

  const duplicate = (item) => {
    setModalItem({ ...item, id: undefined, title: `${item.title} — nusxa`, status: 'draft', publishAt: null });
    setModalOpen(true);
    setMenuId(null);
  };

  const remove = async (item) => {
    setMenuId(null);
    if (!window.confirm(`“${item.title}” kontentini o‘chirasizmi?`)) return;
    try {
      await apiRequest(`/api/content/${item.id}`, { method: 'DELETE', headers: authHeaders(session.token) });
      notify('Kontent o‘chirildi.');
      await loadItems();
    } catch (error) {
      notify(error.message);
    }
  };

  return (
    <div className="content-page premium-content-page">
      <section className="content-hero">
        <div className="content-hero-copy">
          <span className="page-eyebrow">KONTENT MARKAZI</span>
          <h1>Kontent reja</h1>
          <p>G‘oyadan nashrgacha bo‘lgan barcha jarayonni tez, tartibli va jamoa bilan birga boshqaring.</p>
          <div className="content-hero-actions">
            <button className="button-primary button-primary--large" onClick={openCreate}><FilePlus2 size={20} /> Tezkor kontent qo‘shish</button>
            <span><CalendarDays size={17} /> {nextItem ? `Keyingi nashr: ${formatDate(nextItem.publishAt)}` : 'Hozircha rejalashtirilgan nashr yo‘q'}</span>
          </div>
        </div>
        <div className="content-hero-visual" aria-hidden="true">
          <div className="content-orbit content-orbit--one" />
          <div className="content-orbit content-orbit--two" />
          <div className="content-hero-card content-hero-card--main"><ImageIcon size={30} /><strong>{counts.total}</strong><small>Jami kontent</small></div>
          <div className="content-hero-card content-hero-card--floating"><FilePlus2 size={19} /><span>Yangi g‘oya</span></div>
        </div>
      </section>

      <section className="content-stat-grid content-stat-grid--premium">
        <article data-tone="blue"><span className="content-stat-icon"><ImageIcon size={20} /></span><div><small>Jami kontent</small><strong>{counts.total}</strong><em>Barcha formatlar</em></div></article>
        <article data-tone="gray"><span className="content-stat-icon"><Edit3 size={20} /></span><div><small>Draft</small><strong>{counts.draft}</strong><em>Ishlanmoqda</em></div></article>
        <article data-tone="amber"><span className="content-stat-icon"><RefreshCw size={20} /></span><div><small>Tekshiruvda</small><strong>{counts.review}</strong><em>Tasdiq kutilmoqda</em></div></article>
        <article data-tone="purple"><span className="content-stat-icon"><CalendarDays size={20} /></span><div><small>Rejada</small><strong>{counts.scheduled}</strong><em>Nashrga tayyor</em></div></article>
        <article data-tone="green"><span className="content-stat-icon"><FilePlus2 size={20} /></span><div><small>Chop etildi</small><strong>{counts.published}</strong><em>Natijaga chiqarildi</em></div></article>
      </section>

      <section className="content-panel content-panel--premium">
        <div className="content-panel-heading">
          <div><span>Kontentlar</span><h2>Barcha rejalashtirilgan materiallar</h2></div>
          <button className="button-primary content-panel-add" onClick={openCreate}><FilePlus2 size={18} /> Qo‘shish</button>
        </div>
        <div className="content-toolbar">
          <div className="search-field"><Search size={19} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Sarlavha, caption yoki teg bo‘yicha qidirish..." /></div>
          <div className="filter-group">
            <label><Filter size={17} /><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Barcha statuslar</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={16} /></label>
            <label><select value={filters.platformId} onChange={(event) => setFilters((current) => ({ ...current, platformId: event.target.value }))}><option value="">Barcha platformalar</option>{metadata.platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select><ChevronDown size={16} /></label>
            <label><select value={filters.branchId} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}><option value="">Barcha filiallar</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><ChevronDown size={16} /></label>
            <button className="icon-action" onClick={loadItems} title="Yangilash"><RefreshCw size={19} className={loading ? 'spin' : ''} /></button>
          </div>
        </div>

        <div className="content-table-wrap">
          <table className="content-table">
            <thead><tr><th>Kontent</th><th>Turi</th><th>Platforma</th><th>Filial</th><th>Status</th><th>Mas’ul</th><th>Nashr vaqti</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8"><div className="table-state"><span className="spinner spinner--blue" /> Ma’lumotlar yuklanmoqda...</div></td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan="8"><div className="empty-state empty-state--premium"><span><ImageIcon size={30} /></span><h3>Kontent reja hali bo‘sh</h3><p>Birinchi g‘oyani 30 soniyada qo‘shing. Faqat sarlavha, format va platforma yetarli.</p><button className="button-primary button-primary--large" onClick={openCreate}><FilePlus2 size={18} /> Birinchi kontentni yaratish</button></div></td></tr>}
              {!loading && items.map((item) => (
                <tr key={item.id}>
                  <td><div className="content-title-cell"><span className="content-thumb" style={item.coverUrl ? { backgroundImage: `url(${item.coverUrl})` } : {}}>{!item.coverUrl && <ImageIcon size={21} />}</span><div><strong>{item.title}</strong><small>{item.description || 'Tavsif kiritilmagan'}</small></div></div></td>
                  <td><span className="type-pill">{typeLabels[item.contentType] || item.contentType}</span></td>
                  <td><span className="platform-pill"><i style={{ background: item.platform.color }} />{item.platform.name}</span></td>
                  <td>{item.branch?.name || <span className="muted">Umumiy</span>}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{item.assignee?.fullName || <span className="muted">Belgilanmagan</span>}</td>
                  <td><span className="date-cell"><CalendarDays size={16} />{formatDate(item.publishAt)}</span></td>
                  <td className="action-cell"><button className="table-menu-button" onClick={() => setMenuId((current) => current === item.id ? null : item.id)}><MoreHorizontal size={20} /></button>{menuId === item.id && <div className="row-menu"><button onClick={() => openEdit(item)}><Edit3 size={17} /> Tahrirlash</button><button onClick={() => duplicate(item)}><Copy size={17} /> Nusxalash</button><button className="danger" onClick={() => remove(item)}><Trash2 size={17} /> O‘chirish</button></div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modalOpen && <ContentFormModal item={modalItem} metadata={metadata} onClose={() => { setModalOpen(false); setModalItem(null); }} onSave={save} saving={saving} />}
    </div>
  );
}
