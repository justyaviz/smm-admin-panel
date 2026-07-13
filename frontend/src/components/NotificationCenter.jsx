import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCheck, CircleDollarSign, FileBarChart, MessageCircle, Trash2, X } from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';

const typeIcons = {
  chat_message: MessageCircle,
  expense_status: CircleDollarSign,
  report_ready: FileBarChart,
  system: Bell,
};

const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'Hozir';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} daqiqa oldin`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} soat oldin`;
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
};

export default function NotificationCenter({ session, onNavigate, notify }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const headers = authHeaders(session.token);

  const load = useCallback(async (full = false) => {
    try {
      if (full) setLoading(true);
      const result = await apiRequest(full ? '/api/notifications?limit=40' : '/api/notifications/count', { headers });
      if (full) setItems(result.items || []);
      setUnreadCount(Number(result.unreadCount || 0));
    } catch (error) {
      if (full) notify(error.message);
    } finally {
      if (full) setLoading(false);
    }
  }, [session.token]);

  useEffect(() => {
    void load(false);
    const timer = setInterval(() => void load(false), 30_000);
    const refresh = () => void load(open);
    const events = ['notifications.smart','chat.message','content.status','content.comment','task.assigned','task.status','expense.status'];
    events.forEach((name) => window.addEventListener(`aloo:realtime:${name}`, refresh));
    return () => {
      clearInterval(timer);
      events.forEach((name) => window.removeEventListener(`aloo:realtime:${name}`, refresh));
    };
  }, [load, open]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) void load(true);
  };

  const openItem = async (item) => {
    if (!item.isRead) {
      try {
        await apiRequest(`/api/notifications/${item.id}/read`, { method: 'PATCH', headers });
        setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, isRead: true } : entry));
        setUnreadCount((count) => Math.max(0, count - 1));
      } catch (error) { notify(error.message); }
    }
    if (item.linkPage) onNavigate(item.linkPage, item.linkEntityId);
    setOpen(false);
  };

  const readAll = async () => {
    try {
      await apiRequest('/api/notifications/read-all', { method: 'POST', headers });
      setItems((current) => current.map((item) => ({ ...item, isRead: true })));
      setUnreadCount(0);
    } catch (error) { notify(error.message); }
  };

  const remove = async (event, item) => {
    event.stopPropagation();
    try {
      await apiRequest(`/api/notifications/${item.id}`, { method: 'DELETE', headers });
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      if (!item.isRead) setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) { notify(error.message); }
  };

  return <div className="notification-wrap">
    <button className="notification-button" onClick={toggle} aria-label="Bildirishnomalar">
      <Bell size={20} />{unreadCount > 0 && <span>{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </button>
    {open && <>
      <button className="notification-overlay" aria-label="Bildirishnomalarni yopish" onClick={() => setOpen(false)} />
      <aside className="notification-drawer">
        <header><div><h3>Bildirishnomalar</h3><p>{unreadCount ? `${unreadCount} ta o‘qilmagan` : 'Hammasi o‘qilgan'}</p></div><button className="icon-button" onClick={() => setOpen(false)}><X size={20} /></button></header>
        <div className="notification-tools"><button disabled={!unreadCount} onClick={readAll}><CheckCheck size={16} /> Hammasini o‘qish</button><button onClick={() => load(true)}>Yangilash</button></div>
        <div className="notification-list">
          {loading && <div className="notification-state"><span className="spinner spinner--blue" /> Yuklanmoqda...</div>}
          {!loading && items.map((item) => { const Icon = typeIcons[item.type] || Bell; return <button key={item.id} className={`notification-item ${item.isRead ? '' : 'unread'}`} onClick={() => openItem(item)}>
            <span className={`notification-type notification-type--${item.type}`}><Icon size={17} /></span>
            <div><strong>{item.title}</strong><p>{item.message}</p><time>{formatTime(item.createdAt)}</time></div>
            <span className="notification-remove" role="button" tabIndex={0} onClick={(event) => remove(event, item)}><Trash2 size={14} /></span>
          </button>; })}
          {!loading && !items.length && <div className="notification-empty"><Bell size={28} /><h4>Bildirishnoma yo‘q</h4><p>Yangi xabar va tizim voqealari shu yerda ko‘rinadi.</p></div>}
        </div>
      </aside>
    </>}
  </div>;
}
