import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ClipboardCheck, Clock3, Columns3, Edit3, Eye, List, MessageCircle, MoreHorizontal, Plus, RefreshCw, Search, Trash2, UserRound } from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';
import TaskFormModal from '../components/TaskFormModal.jsx';
import TaskDetailsModal from '../components/TaskDetailsModal.jsx';

const statusLabels = { backlog: 'Backlog', todo: 'Bajarish kerak', in_progress: 'Jarayonda', review: 'Tekshiruvda', done: 'Bajarildi', cancelled: 'Bekor qilindi' };
const priorityLabels = { low: 'Past', medium: 'O‘rta', high: 'Yuqori', urgent: 'Shoshilinch' };
const boardStatuses = ['backlog', 'todo', 'in_progress', 'review', 'done'];
const emptySummary = { total: 0, open: 0, in_progress: 0, review: 0, done: 0, overdue: 0, due_this_week: 0 };
const formatDate = (value) => value ? new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : 'Muddat yo‘q';
const initials = (name = '') => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

function Stat({ icon: Icon, label, value, note, tone = 'blue' }) {
  return <article className="operations-stat"><span className={`operations-stat__icon operations-stat__icon--${tone}`}><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

function TaskCard({ item, canManage, onOpen, onEdit, onDelete, onDragStart }) {
  return <article className={`task-card ${item.isOverdue ? 'task-card--overdue' : ''}`} draggable={canManage} onDragStart={() => onDragStart(item.id)} onClick={() => onOpen(item.id)}>
    <header><span className={`task-priority task-priority--${item.priority}`}>{priorityLabels[item.priority]}</span>{canManage && <button onClick={(event) => { event.stopPropagation(); onEdit(item); }}><Edit3 size={14} /></button>}</header>
    <h3>{item.title}</h3><p>{item.description || 'Tavsif kiritilmagan'}</p>
    {!!item.tags.length && <div className="task-card-tags">{item.tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}</div>}
    <div className="task-card-meta"><span className={item.isOverdue ? 'overdue' : ''}><Clock3 size={14} />{formatDate(item.dueAt)}</span>{item.commentCount > 0 && <span><MessageCircle size={14} />{item.commentCount}</span>}</div>
    <footer><div className="task-assignee"><i>{initials(item.assigneeName || '?')}</i><span>{item.assigneeName || 'Biriktirilmagan'}</span></div>{item.branchName && <b>{item.branchName}</b>}</footer>
  </article>;
}

export default function TasksPage({ session, notify, initialAction = null, initialEntityId = null }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [metadata, setMetadata] = useState({ branches: [], users: [], platforms: [] });
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', branchId: '', assignedTo: '', mine: false });
  const [view, setView] = useState('board');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, item: null });
  const [detailsId, setDetailsId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const headers = authHeaders(session.token);
  const permissions = new Set(session.user?.permissions || []);
  const canManage = session.user?.role === 'admin' || permissions.has('tasks.manage');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, String(value)); });
      const [list, totals, meta] = await Promise.all([
        apiRequest(`/api/tasks?${params}`, { headers }),
        apiRequest(`/api/tasks/summary${filters.branchId ? `?branchId=${filters.branchId}` : ''}`, { headers }),
        metadata.branches.length ? Promise.resolve(metadata) : apiRequest('/api/meta', { headers }),
      ]);
      setItems(list.items || []);
      setSummary({ ...emptySummary, ...(totals.metrics || {}) });
      if (meta.branches) setMetadata(meta);
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [filters.status, filters.priority, filters.branchId, filters.assignedTo, filters.mine]);
  useEffect(() => { if (initialAction === 'create' && canManage) setModal({ open: true, item: null }); }, [initialAction, canManage]);
  useEffect(() => { if (initialEntityId) setDetailsId(Number(initialEntityId)); }, [initialEntityId]);
  useEffect(() => { const timer = setTimeout(() => void load(), 350); return () => clearTimeout(timer); }, [filters.search]);
  useEffect(() => {
    const refresh = () => void load();
    const events = ['task.created','task.updated','task.assigned','task.status','task.comment','task.deleted'];
    events.forEach((name) => window.addEventListener(`aloo:realtime:${name}`, refresh));
    return () => events.forEach((name) => window.removeEventListener(`aloo:realtime:${name}`, refresh));
  }, [filters.status, filters.priority, filters.branchId, filters.assignedTo, filters.mine, filters.search]);

  const grouped = useMemo(() => Object.fromEntries(boardStatuses.map((status) => [status, items.filter((item) => item.status === status)])), [items]);

  const save = async (form) => {
    setSaving(true);
    try {
      await apiRequest(modal.item ? `/api/tasks/${modal.item.id}` : '/api/tasks', { method: modal.item ? 'PUT' : 'POST', headers, body: JSON.stringify(form) });
      notify(modal.item ? 'Vazifa yangilandi.' : 'Yangi vazifa yaratildi.');
      setModal({ open: false, item: null });
      await load();
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`“${item.title}” vazifasini o‘chirasizmi?`)) return;
    try { await apiRequest(`/api/tasks/${item.id}`, { method: 'DELETE', headers }); notify('Vazifa o‘chirildi.'); setMenuId(null); await load(); }
    catch (error) { notify(error.message); }
  };

  const dropStatus = async (status) => {
    if (!canManage || !draggedId) return;
    const item = items.find((entry) => entry.id === draggedId);
    setDraggedId(null);
    if (!item || item.status === status) return;
    try { await apiRequest(`/api/tasks/${item.id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) }); await load(); }
    catch (error) { notify(error.message); }
  };

  return <div className="tasks-page">
    <div className="page-heading"><div><h1>Vazifalar</h1><p>Jamoa ishlari, deadline va bajarilish jarayonini nazorat qiling</p></div>{canManage && <button className="button-primary" onClick={() => setModal({ open: true, item: null })}><Plus size={18} /> Yangi vazifa</button>}</div>
    <section className="operations-stat-grid"><Stat icon={ClipboardCheck} label="Ochiq vazifalar" value={summary.open} note={`${summary.in_progress} ta jarayonda`} /><Stat icon={Clock3} label="Shu hafta" value={summary.due_this_week} note="deadline yaqin" tone="purple" /><Stat icon={AlertTriangle} label="Kechikkan" value={summary.overdue} note="tezkor e’tibor kerak" tone="rose" /><Stat icon={CheckCircle2} label="Bajarilgan" value={summary.done} note="jami yakunlangan" tone="green" /></section>

    <section className="content-panel operations-panel"><div className="content-toolbar operations-toolbar"><label className="search-field"><Search size={17} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Vazifa qidirish..." /></label><div className="filter-group">
      <label><select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value }))}><option value="">Barcha ustuvorliklar</option>{Object.entries(priorityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={14} /></label>
      <label><select value={filters.branchId} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}><option value="">Barcha filiallar</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><ChevronDown size={14} /></label>
      <label><select value={filters.assignedTo} onChange={(event) => setFilters((current) => ({ ...current, assignedTo: event.target.value }))}><option value="">Barcha xodimlar</option>{metadata.users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select><ChevronDown size={14} /></label>
      <button className={`mine-filter ${filters.mine ? 'active' : ''}`} onClick={() => setFilters((current) => ({ ...current, mine: !current.mine }))}><UserRound size={15} /> Mening vazifalarim</button>
      <div className="view-switch"><button className={view === 'board' ? 'active' : ''} onClick={() => setView('board')}><Columns3 size={16} /></button><button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}><List size={16} /></button></div>
      <button className="icon-action" onClick={load}><RefreshCw size={17} className={loading ? 'spin' : ''} /></button>
    </div></div>

    {view === 'board' ? <div className="task-board">{boardStatuses.map((status) => <section key={status} className={`task-column task-column--${status}`} onDragOver={(event) => event.preventDefault()} onDrop={() => dropStatus(status)}><header><div><i /><strong>{statusLabels[status]}</strong></div><span>{grouped[status]?.length || 0}</span></header><div>{grouped[status]?.map((item) => <TaskCard key={item.id} item={item} canManage={canManage} onOpen={setDetailsId} onEdit={(entry) => setModal({ open: true, item: entry })} onDelete={remove} onDragStart={setDraggedId} />)}{!grouped[status]?.length && <div className="task-column-empty">Vazifa yo‘q</div>}</div></section>)}</div> : <div className="content-table-wrap"><table className="content-table task-table"><thead><tr><th>Vazifa</th><th>Mas’ul</th><th>Filial</th><th>Ustuvorlik</th><th>Deadline</th><th>Status</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id} className={item.isOverdue ? 'task-row--overdue' : ''}><td><div className="task-table-title"><button onClick={() => setDetailsId(item.id)}>{item.title}</button><small>{item.description || 'Tavsif yo‘q'}</small></div></td><td>{item.assigneeName || '—'}</td><td>{item.branchName || 'Umumiy'}</td><td><span className={`task-priority task-priority--${item.priority}`}>{priorityLabels[item.priority]}</span></td><td><span className={item.isOverdue ? 'deadline-overdue' : ''}>{formatDate(item.dueAt)}</span></td><td><span className={`task-status task-status--${item.status}`}>{statusLabels[item.status]}</span></td><td className="action-cell"><button className="table-menu-button" onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreHorizontal size={18} /></button>{menuId === item.id && <div className="row-menu"><button onClick={() => { setDetailsId(item.id); setMenuId(null); }}><Eye size={15} /> Ko‘rish</button>{canManage && <><button onClick={() => { setModal({ open: true, item }); setMenuId(null); }}><Edit3 size={15} /> Tahrirlash</button><button onClick={() => remove(item)}><Trash2 size={15} /> O‘chirish</button></>}</div>}</td></tr>)}</tbody></table>{loading && <div className="table-state"><span className="spinner spinner--blue" /> Yuklanmoqda...</div>}{!loading && !items.length && <div className="empty-state"><span><ClipboardCheck size={28} /></span><h3>Vazifa topilmadi</h3><p>Filterlarni o‘zgartiring yoki yangi vazifa yarating.</p></div>}</div>}
    </section>
    <TaskFormModal open={modal.open} item={modal.item} metadata={metadata} saving={saving} onClose={() => setModal({ open: false, item: null })} onSave={save} />
    <TaskDetailsModal open={Boolean(detailsId)} taskId={detailsId} session={session} canManage={canManage} notify={notify} onClose={() => setDetailsId(null)} onChanged={load} />
  </div>;
}
