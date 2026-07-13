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
    <div className="content-page">
      <div className="page-heading">
        <div><h1>Kontent</h1><p>Postlar, reels, story va video kontent boshqaruvi</p></div>
        <button className="button-primary" onClick={openCreate}><FilePlus2 size={18} /> Yangi kontent</button>
      </div>

      <section className="content-stat-grid">
        <div><span>Jami</span><b>{counts.total}</b></div>
        <div><span>Draft</span><b>{counts.draft}</b></div>
        <div><span>Tekshiruvda</span><b>{counts.review}</b></div>
        <div><span>Rejada</span><b>{counts.scheduled}</b></div>
        <div><span>Chop etildi</span><b>{counts.published}</b></div>
      </section>

      <section className="content-panel">
        <div className="content-toolbar">
          <div className="search-field"><Search size={18} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Kontent qidirish..." /></div>
          <div className="filter-group">
            <label><Filter size={16} /><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Barcha statuslar</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={15} /></label>
            <label><select value={filters.platformId} onChange={(event) => setFilters((current) => ({ ...current, platformId: event.target.value }))}><option value="">Barcha platformalar</option>{metadata.platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select><ChevronDown size={15} /></label>
            <label><select value={filters.branchId} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}><option value="">Barcha filiallar</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><ChevronDown size={15} /></label>
            <button className="icon-action" onClick={loadItems} title="Yangilash"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button>
          </div>
        </div>

        <div className="content-table-wrap">
          <table className="content-table">
            <thead><tr><th>Kontent</th><th>Turi</th><th>Platforma</th><th>Filial</th><th>Status</th><th>Mas’ul</th><th>Nashr vaqti</th><th /></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="8"><div className="table-state"><span className="spinner spinner--blue" /> Ma’lumotlar yuklanmoqda...</div></td></tr>}
              {!loading && items.length === 0 && <tr><td colSpan="8"><div className="empty-state"><span><ImageIcon size={27} /></span><h3>Kontent topilmadi</h3><p>Filterlarni o‘zgartiring yoki birinchi kontentni yarating.</p><button className="button-primary" onClick={openCreate}><FilePlus2 size={17} /> Kontent qo‘shish</button></div></td></tr>}
              {!loading && items.map((item) => (
                <tr key={item.id}>
                  <td><div className="content-title-cell"><span className="content-thumb" style={item.coverUrl ? { backgroundImage: `url(${item.coverUrl})` } : {}}>{!item.coverUrl && <ImageIcon size={19} />}</span><div><strong>{item.title}</strong><small>{item.description || 'Tavsif kiritilmagan'}</small></div></div></td>
                  <td><span className="type-pill">{typeLabels[item.contentType] || item.contentType}</span></td>
                  <td><span className="platform-pill"><i style={{ background: item.platform.color }} />{item.platform.name}</span></td>
                  <td>{item.branch?.name || <span className="muted">Umumiy</span>}</td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>{item.assignee?.fullName || <span className="muted">Belgilanmagan</span>}</td>
                  <td><span className="date-cell"><CalendarDays size={15} />{formatDate(item.publishAt)}</span></td>
                  <td className="action-cell"><button className="table-menu-button" onClick={() => setMenuId((current) => current === item.id ? null : item.id)}><MoreHorizontal size={19} /></button>{menuId === item.id && <div className="row-menu"><button onClick={() => openEdit(item)}><Edit3 size={16} /> Tahrirlash</button><button onClick={() => duplicate(item)}><Copy size={16} /> Nusxalash</button><button className="danger" onClick={() => remove(item)}><Trash2 size={16} /> O‘chirish</button></div>}</td>
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
