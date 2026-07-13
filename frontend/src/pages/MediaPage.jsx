import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Archive, Download, Edit3, File, FileText, Files, Film, Folder, FolderPlus,
  Grid2X2, HardDrive, Image as ImageIcon, List, MoreHorizontal, Plus, RefreshCw,
  Search, Star, Trash2, Upload, Video,
} from 'lucide-react';
import MediaUploadModal from '../components/MediaUploadModal.jsx';
import MediaEditModal from '../components/MediaEditModal.jsx';
import { apiDownload, apiRequest, authHeaders, resolveApiUrl } from '../lib/api.js';

function formatBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function MediaTypeIcon({ type, size = 24 }) {
  if (type === 'image') return <ImageIcon size={size} />;
  if (type === 'video') return <Video size={size} />;
  if (type === 'document') return <FileText size={size} />;
  return <File size={size} />;
}

function ImagePreview({ item, token }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    if (item.mediaType !== 'image') return undefined;
    let active = true;
    let objectUrl = '';
    fetch(resolveApiUrl(item.fileUrl), { headers: authHeaders(token) })
      .then((response) => response.ok ? response.blob() : Promise.reject(new Error('preview')))
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (active) setUrl(objectUrl);
      })
      .catch(() => {});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.fileUrl, item.mediaType, token]);
  if (!url) return <span className="media-preview-placeholder"><MediaTypeIcon type={item.mediaType} size={30} /></span>;
  return <img src={url} alt={item.altText || item.displayName} loading="lazy" />;
}

export default function MediaPage({ session, notify }) {
  const [items, setItems] = useState([]);
  const [folders, setFolders] = useState([]);
  const [branches, setBranches] = useState([]);
  const [summary, setSummary] = useState({ total: 0, images: 0, videos: 0, documents: 0, favorites: 0, storageBytes: 0 });
  const [filters, setFilters] = useState({ search: '', mediaType: '', folderId: '', branchId: '', favorite: '', status: 'active' });
  const [view, setView] = useState('grid');
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState(null);

  const loadMeta = useCallback(async () => {
    const [folderResult, metaResult] = await Promise.all([
      apiRequest('/api/media/folders', { headers: authHeaders(session.token) }),
      apiRequest('/api/meta', { headers: authHeaders(session.token) }),
    ]);
    setFolders(folderResult.items || []);
    setBranches(metaResult.branches || []);
  }, [session.token]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => value && query.set(key, value));
      const [listResult, summaryResult] = await Promise.all([
        apiRequest(`/api/media?${query.toString()}`, { headers: authHeaders(session.token) }),
        apiRequest('/api/media/summary', { headers: authHeaders(session.token) }),
      ]);
      setItems(listResult.items || []);
      setSummary(summaryResult.metrics || {});
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  }, [filters, notify, session.token]);

  useEffect(() => { void loadMeta().catch((error) => notify(error.message)); }, [loadMeta, notify]);
  useEffect(() => {
    const timer = setTimeout(() => void loadData(), filters.search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData, filters.search]);

  const currentFolder = useMemo(() => folders.find((folder) => String(folder.id) === String(filters.folderId)), [folders, filters.folderId]);

  const upload = async (payload) => {
    setSaving(true);
    try {
      await apiRequest('/api/media/upload', { method: 'POST', headers: authHeaders(session.token), body: JSON.stringify(payload) });
      notify('Media fayllar muvaffaqiyatli yuklandi.');
      setUploadOpen(false);
      await Promise.all([loadData(), loadMeta()]);
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };

  const saveEdit = async (payload) => {
    setSaving(true);
    try {
      await apiRequest(`/api/media/${editItem.id}`, { method: 'PUT', headers: authHeaders(session.token), body: JSON.stringify(payload) });
      notify('Media ma’lumotlari yangilandi.');
      setEditItem(null);
      await Promise.all([loadData(), loadMeta()]);
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };

  const toggleFavorite = async (item) => {
    setMenuId(null);
    try {
      const result = await apiRequest(`/api/media/${item.id}/favorite`, { method: 'PATCH', headers: authHeaders(session.token), body: '{}' });
      setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isFavorite: result.isFavorite } : entry));
      notify(result.isFavorite ? 'Saralanganlarga qo‘shildi.' : 'Saralanganlardan olib tashlandi.');
      const summaryResult = await apiRequest('/api/media/summary', { headers: authHeaders(session.token) });
      setSummary(summaryResult.metrics || {});
    } catch (error) { notify(error.message); }
  };

  const download = async (item) => {
    setMenuId(null);
    try { await apiDownload(`${item.fileUrl}?download=1`, { headers: authHeaders(session.token) }); }
    catch (error) { notify(error.message); }
  };

  const archive = async (item) => {
    setMenuId(null);
    try {
      await apiRequest(`/api/media/${item.id}`, {
        method: 'PUT', headers: authHeaders(session.token), body: JSON.stringify({
          displayName: item.displayName, description: item.description, altText: item.altText,
          folderId: item.folder?.id || null, branchId: item.branch?.id || null, tags: item.tags || [],
          status: item.status === 'archived' ? 'active' : 'archived',
        }),
      });
      notify(item.status === 'archived' ? 'Media qayta tiklandi.' : 'Media arxivlandi.');
      await Promise.all([loadData(), loadMeta()]);
    } catch (error) { notify(error.message); }
  };

  const remove = async (item) => {
    setMenuId(null);
    if (!window.confirm(`“${item.displayName}” faylini butunlay o‘chirasizmi?`)) return;
    try {
      await apiRequest(`/api/media/${item.id}`, { method: 'DELETE', headers: authHeaders(session.token) });
      notify('Media o‘chirildi.');
      await Promise.all([loadData(), loadMeta()]);
    } catch (error) { notify(error.message); }
  };

  const createFolder = async () => {
    const name = window.prompt('Yangi papka nomi:');
    if (!name?.trim()) return;
    try {
      await apiRequest('/api/media/folders', { method: 'POST', headers: authHeaders(session.token), body: JSON.stringify({ name: name.trim(), description: '', color: '#1690F5', parentId: null }) });
      notify('Yangi papka yaratildi.');
      await loadMeta();
    } catch (error) { notify(error.message); }
  };

  return (
    <div className="media-page">
      <div className="page-heading">
        <div><h1>Media kutubxona</h1><p>Rasm, video, cover va hujjatlarni yagona joyda boshqaring</p></div>
        <div className="media-heading-actions"><button className="button-ghost media-folder-button" onClick={createFolder}><FolderPlus size={18}/> Papka</button><button className="button-primary" onClick={() => setUploadOpen(true)}><Upload size={18}/> Media yuklash</button></div>
      </div>

      <section className="media-stat-grid">
        <article><span><Files size={20}/></span><div><small>Jami fayllar</small><strong>{summary.total || 0}</strong><em>{summary.favorites || 0} ta saralangan</em></div></article>
        <article><span className="media-stat-icon--image"><ImageIcon size={20}/></span><div><small>Rasmlar</small><strong>{summary.images || 0}</strong><em>JPG, PNG, WebP, SVG</em></div></article>
        <article><span className="media-stat-icon--video"><Film size={20}/></span><div><small>Videolar</small><strong>{summary.videos || 0}</strong><em>MP4, WebM, MOV</em></div></article>
        <article><span className="media-stat-icon--storage"><HardDrive size={20}/></span><div><small>Saqlash hajmi</small><strong>{formatBytes(summary.storageBytes || 0)}</strong><em>PostgreSQL xotirasi</em></div></article>
      </section>

      <section className="media-workspace">
        <aside className="media-folders-panel">
          <div className="media-panel-title"><div><Folder size={18}/><strong>Papkalar</strong></div><button onClick={createFolder}><Plus size={17}/></button></div>
          <button className={`media-folder-row ${filters.folderId === '' ? 'active' : ''}`} onClick={() => setFilters((current) => ({ ...current, folderId: '' }))}><span><Files size={17}/> Barcha media</span><b>{summary.total || 0}</b></button>
          <button className={`media-folder-row ${filters.folderId === 'root' ? 'active' : ''}`} onClick={() => setFilters((current) => ({ ...current, folderId: 'root' }))}><span><Folder size={17}/> Asosiy kutubxona</span></button>
          {folders.map((folder) => <button key={folder.id} className={`media-folder-row ${String(filters.folderId) === String(folder.id) ? 'active' : ''}`} onClick={() => setFilters((current) => ({ ...current, folderId: String(folder.id) }))}><span><i style={{ background: folder.color }}/>{folder.name}</span><b>{folder.assetCount}</b></button>)}
          <div className="media-folder-divider" />
          <button className={`media-folder-row ${filters.favorite === 'true' ? 'active' : ''}`} onClick={() => setFilters((current) => ({ ...current, favorite: current.favorite === 'true' ? '' : 'true' }))}><span><Star size={17}/> Saralanganlar</span><b>{summary.favorites || 0}</b></button>
          <button className={`media-folder-row ${filters.status === 'archived' ? 'active' : ''}`} onClick={() => setFilters((current) => ({ ...current, status: current.status === 'archived' ? 'active' : 'archived' }))}><span><Archive size={17}/> Arxiv</span></button>
        </aside>

        <div className="media-library-panel">
          <div className="media-toolbar">
            <div className="search-field"><Search size={18}/><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Media qidirish..." /></div>
            <select value={filters.mediaType} onChange={(event) => setFilters((current) => ({ ...current, mediaType: event.target.value }))}><option value="">Barcha turlar</option><option value="image">Rasmlar</option><option value="video">Videolar</option><option value="document">Hujjatlar</option><option value="audio">Audio</option></select>
            <select value={filters.branchId} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}><option value="">Barcha filiallar</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select>
            <button className="icon-action" onClick={loadData} title="Yangilash"><RefreshCw size={18} className={loading ? 'spin' : ''}/></button>
            <div className="media-view-switch"><button className={view === 'grid' ? 'active' : ''} onClick={() => setView('grid')}><Grid2X2 size={17}/></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={17}/></button></div>
          </div>

          <div className="media-library-heading"><div><h3>{currentFolder?.name || (filters.status === 'archived' ? 'Arxiv' : 'Barcha media')}</h3><p>{items.length} ta fayl ko‘rsatildi</p></div></div>

          {loading && <div className="media-loading"><span className="spinner spinner--blue"/> Media yuklanmoqda...</div>}
          {!loading && items.length === 0 && <div className="empty-state media-empty"><span><ImageIcon size={28}/></span><h3>Media topilmadi</h3><p>Yangi fayl yuklang yoki filterlarni o‘zgartiring.</p><button className="button-primary" onClick={() => setUploadOpen(true)}><Upload size={17}/> Media yuklash</button></div>}

          {!loading && items.length > 0 && <div className={`media-items media-items--${view}`}>
            {items.map((item) => (
              <article className="media-card" key={item.id}>
                <div className="media-card-preview">
                  <ImagePreview item={item} token={session.token}/>
                  <span className={`media-kind media-kind--${item.mediaType}`}><MediaTypeIcon type={item.mediaType} size={13}/>{item.mediaType}</span>
                  <button className={`media-favorite ${item.isFavorite ? 'active' : ''}`} onClick={() => toggleFavorite(item)}><Star size={16} fill={item.isFavorite ? 'currentColor' : 'none'}/></button>
                </div>
                <div className="media-card-body">
                  <div className="media-card-title"><div><strong title={item.displayName}>{item.displayName}</strong><small>{formatBytes(item.sizeBytes)} · {item.extension?.toUpperCase() || item.mimeType}</small></div><button onClick={() => setMenuId((current) => current === item.id ? null : item.id)}><MoreHorizontal size={18}/></button></div>
                  <div className="media-card-meta"><span>{item.folder?.name || 'Asosiy'}</span><span>{formatDate(item.createdAt)}</span></div>
                  {item.tags?.length > 0 && <div className="media-tags">{item.tags.slice(0, 3).map((tag) => <i key={tag}>#{tag}</i>)}</div>}
                </div>
                {menuId === item.id && <div className="media-card-menu">
                  <button onClick={() => { setEditItem(item); setMenuId(null); }}><Edit3 size={16}/> Tahrirlash</button>
                  <button onClick={() => download(item)}><Download size={16}/> Yuklab olish</button>
                  <button onClick={() => archive(item)}><Archive size={16}/> {item.status === 'archived' ? 'Tiklash' : 'Arxivlash'}</button>
                  <button className="danger" onClick={() => remove(item)}><Trash2 size={16}/> O‘chirish</button>
                </div>}
              </article>
            ))}
          </div>}
        </div>
      </section>

      <MediaUploadModal open={uploadOpen} folders={folders} branches={branches} saving={saving} onClose={() => setUploadOpen(false)} onSave={upload} notify={notify}/>
      <MediaEditModal item={editItem} folders={folders} branches={branches} saving={saving} onClose={() => setEditItem(null)} onSave={saveEdit}/>
    </div>
  );
}
