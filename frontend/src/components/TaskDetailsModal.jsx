import { useEffect, useState } from 'react';
import { CalendarClock, CheckCircle2, Clock3, MessageCircle, Send, UserRound, X } from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';

const statusLabels = { backlog: 'Backlog', todo: 'Bajarish kerak', in_progress: 'Jarayonda', review: 'Tekshiruvda', done: 'Bajarildi', cancelled: 'Bekor qilindi' };
const priorityLabels = { low: 'Past', medium: 'O‘rta', high: 'Yuqori', urgent: 'Shoshilinch' };
const formatDate = (value) => value ? new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Belgilanmagan';
const initials = (name = '') => name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase();

export default function TaskDetailsModal({ open, taskId, session, canManage, notify, onClose, onChanged }) {
  const [data, setData] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const headers = authHeaders(session.token);

  const load = async () => {
    if (!taskId) return;
    setLoading(true);
    try { setData(await apiRequest(`/api/tasks/${taskId}`, { headers })); }
    catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) void load(); }, [open, taskId]);
  if (!open) return null;

  const setStatus = async (status) => {
    try {
      await apiRequest(`/api/tasks/${taskId}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) });
      notify('Vazifa statusi yangilandi.');
      await load();
      onChanged();
    } catch (error) { notify(error.message); }
  };
  const addComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    try {
      await apiRequest(`/api/tasks/${taskId}/comments`, { method: 'POST', headers, body: JSON.stringify({ body: comment.trim() }) });
      setComment('');
      await load();
      onChanged();
    } catch (error) { notify(error.message); }
  };

  const item = data?.item;
  return <div className="modal-backdrop task-details-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="task-details-modal">
      <header className="modal-header"><div><span className="modal-icon"><CheckCircle2 size={21} /></span><div><h2>Vazifa tafsilotlari</h2><p>Izohlar va status tarixi</p></div></div><button className="icon-button" onClick={onClose}><X size={21} /></button></header>
      {loading && !item ? <div className="table-state"><span className="spinner spinner--blue" /> Yuklanmoqda...</div> : item && <div className="task-details-body">
        <div className="task-details-main">
          <div className="task-details-title"><div><span className={`task-priority task-priority--${item.priority}`}>{priorityLabels[item.priority]}</span><h3>{item.title}</h3></div>{canManage && <select value={item.status} onChange={(event) => setStatus(event.target.value)}><option value="backlog">Backlog</option><option value="todo">Bajarish kerak</option><option value="in_progress">Jarayonda</option><option value="review">Tekshiruvda</option><option value="done">Bajarildi</option><option value="cancelled">Bekor qilindi</option></select>}</div>
          <p className="task-details-description">{item.description || 'Tavsif kiritilmagan.'}</p>
          <div className="task-info-grid">
            <div><UserRound size={17} /><span><small>Mas’ul</small><strong>{item.assigneeName || 'Biriktirilmagan'}</strong></span></div>
            <div><CalendarClock size={17} /><span><small>Deadline</small><strong>{formatDate(item.dueAt)}</strong></span></div>
            <div><Clock3 size={17} /><span><small>Vaqt</small><strong>{item.spentMinutes} / {item.estimatedMinutes} daqiqa</strong></span></div>
            <div><CheckCircle2 size={17} /><span><small>Status</small><strong>{statusLabels[item.status]}</strong></span></div>
          </div>
          {!!item.tags.length && <div className="task-tag-list">{item.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}

          <section className="task-comments-section"><header><MessageCircle size={18} /><div><strong>Izohlar</strong><small>{data.comments.length} ta izoh</small></div></header>
            <div className="task-comments-list">{data.comments.map((entry) => <article key={entry.id}><span>{initials(entry.user.fullName)}</span><div><header><strong>{entry.user.fullName}</strong><time>{formatDate(entry.createdAt)}</time></header><p>{entry.body}</p></div></article>)}{!data.comments.length && <div className="empty-mini">Hali izoh yozilmagan.</div>}</div>
            <form className="task-comment-form" onSubmit={addComment}><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Izoh yozing..." /><button className="button-primary" disabled={!comment.trim()}><Send size={16} /></button></form>
          </section>
        </div>
        <aside className="task-history"><h4>Faollik tarixi</h4>{data.history.map((entry) => <article key={entry.id}><i /><div><strong>{statusLabels[entry.newStatus] || entry.newStatus}</strong><p>{entry.userName}{entry.comment ? ` · ${entry.comment}` : ''}</p><time>{formatDate(entry.createdAt)}</time></div></article>)}{!data.history.length && <div className="empty-mini">Tarix mavjud emas.</div>}</aside>
      </div>}
    </section>
  </div>;
}
