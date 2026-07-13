import { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Filter, Plus, RefreshCw } from 'lucide-react';
import ContentFormModal from '../components/ContentFormModal.jsx';
import { statusLabels, typeLabels } from '../data/navigation.js';
import { apiRequest, authHeaders } from '../lib/api.js';

const monthNames = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const weekNames = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];

function monthRange(cursor) {
  const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
  return { from, to };
}

function makeCalendarDays(cursor) {
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - startOffset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function dateKey(value) {
  const date = new Date(value);
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function presetDateForDay(day) {
  const date = new Date(day);
  date.setHours(10, 0, 0, 0);
  return date.toISOString();
}

export default function CalendarPage({ session, notify }) {
  const [cursor, setCursor] = useState(() => new Date());
  const [items, setItems] = useState([]);
  const [metadata, setMetadata] = useState({ platforms: [], branches: [], users: [] });
  const [filters, setFilters] = useState({ platformId: '', branchId: '' });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [presetDate, setPresetDate] = useState(null);
  const [saving, setSaving] = useState(false);

  const range = useMemo(() => monthRange(cursor), [cursor]);
  const days = useMemo(() => makeCalendarDays(cursor), [cursor]);

  const loadMetadata = useCallback(async () => {
    const result = await apiRequest('/api/meta', { headers: authHeaders(session.token) });
    setMetadata(result);
  }, [session.token]);

  const loadCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ from: range.from.toISOString(), to: range.to.toISOString() });
      if (filters.platformId) query.set('platformId', filters.platformId);
      if (filters.branchId) query.set('branchId', filters.branchId);
      const result = await apiRequest(`/api/calendar?${query}`, { headers: authHeaders(session.token) });
      setItems(result.items || []);
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  }, [filters.branchId, filters.platformId, notify, range.from, range.to, session.token]);

  useEffect(() => { void loadMetadata().catch((error) => notify(error.message)); }, [loadMetadata, notify]);
  useEffect(() => { void loadCalendar(); }, [loadCalendar]);

  const eventsByDay = useMemo(() => {
    const map = new Map();
    items.forEach((item) => {
      const key = dateKey(item.publishAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(item);
    });
    return map;
  }, [items]);

  const summary = useMemo(() => ({
    total: items.length,
    stories: items.filter((item) => item.contentType === 'story').length,
    reels: items.filter((item) => ['reels', 'shorts', 'video'].includes(item.contentType)).length,
    published: items.filter((item) => item.status === 'published').length,
  }), [items]);

  const openCreate = (day = null) => {
    setModalItem(null);
    setPresetDate(day ? presetDateForDay(day) : presetDateForDay(new Date()));
    setModalOpen(true);
  };

  const openEvent = async (eventItem) => {
    try {
      const result = await apiRequest(`/api/content/${eventItem.id}`, { headers: authHeaders(session.token) });
      setModalItem(result.item);
      setPresetDate(null);
      setModalOpen(true);
    } catch (error) {
      notify(error.message);
    }
  };

  const save = async (payload) => {
    setSaving(true);
    try {
      const isEditing = Boolean(modalItem?.id);
      await apiRequest(isEditing ? `/api/content/${modalItem.id}` : '/api/content', {
        method: isEditing ? 'PUT' : 'POST',
        headers: authHeaders(session.token),
        body: JSON.stringify(payload),
      });
      notify(isEditing ? 'Kontent yangilandi.' : 'Kontent kalendarga qo‘shildi.');
      setModalOpen(false);
      setModalItem(null);
      setPresetDate(null);
      await loadCalendar();
    } catch (error) {
      notify(error.message);
    } finally {
      setSaving(false);
    }
  };

  const moveMonth = (offset) => setCursor((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));

  return (
    <div className="calendar-page">
      <div className="page-heading">
        <div><h1>Kalendar</h1><p>Oylik kontent rejalashtirish va nashr jadvali</p></div>
        <button className="button-primary" onClick={() => openCreate()}><Plus size={18} /> Post qo‘shish</button>
      </div>

      <section className="calendar-stat-grid">
        <div><span>Jami kontent</span><b>{summary.total}</b></div>
        <div><span>Stories</span><b>{summary.stories}</b></div>
        <div><span>Reels / video</span><b>{summary.reels}</b></div>
        <div><span>Chop etilgan</span><b>{summary.published}</b></div>
      </section>

      <section className="calendar-layout">
        <div className="calendar-main-card">
          <div className="calendar-toolbar">
            <div className="month-nav"><button onClick={() => moveMonth(-1)}><ChevronLeft size={19} /></button><h2>{monthNames[cursor.getMonth()]}, {cursor.getFullYear()}</h2><button onClick={() => moveMonth(1)}><ChevronRight size={19} /></button><button className="today-button" onClick={() => setCursor(new Date())}>Bugun</button></div>
            <div className="calendar-filters"><label><Filter size={15} /><select value={filters.platformId} onChange={(event) => setFilters((current) => ({ ...current, platformId: event.target.value }))}><option value="">Barcha platformalar</option>{metadata.platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select></label><label><select value={filters.branchId} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}><option value="">Barcha filiallar</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><button className="icon-action" onClick={loadCalendar}><RefreshCw size={17} className={loading ? 'spin' : ''} /></button></div>
          </div>

          <div className="calendar-week-head">{weekNames.map((name) => <div key={name}>{name}</div>)}</div>
          <div className="calendar-grid">
            {days.map((day) => {
              const key = dateKey(day);
              const events = eventsByDay.get(key) || [];
              const outside = day.getMonth() !== cursor.getMonth();
              const today = dateKey(day) === dateKey(new Date());
              return (
                <div key={key} className={`calendar-day ${outside ? 'calendar-day--outside' : ''} ${today ? 'calendar-day--today' : ''}`}>
                  <div className="calendar-day-head"><span>{day.getDate()}</span><button onClick={() => openCreate(day)} title="Shu kunga kontent qo‘shish"><Plus size={14} /></button></div>
                  <div className="day-events">
                    {events.slice(0, 4).map((item) => (
                      <button key={item.id} className="calendar-event" style={{ '--platform-color': item.platform.color }} onClick={() => openEvent(item)}>
                        <i /><span>{item.title}</span><small>{new Date(item.publishAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}</small>
                      </button>
                    ))}
                    {events.length > 4 && <button className="more-events" onClick={() => openEvent(events[4])}>+{events.length - 4} ta yana</button>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <aside className="calendar-side">
          <article className="side-card">
            <h3>Platformalar</h3>
            <div className="legend-list">{metadata.platforms.map((platform) => <div key={platform.id}><span><i style={{ background: platform.color }} />{platform.name}</span><b>{items.filter((item) => item.platform.id === platform.id).length}</b></div>)}</div>
          </article>
          <article className="side-card">
            <h3>Statuslar</h3>
            <div className="status-summary">{Object.entries(statusLabels).map(([status, label]) => <div key={status}><span className={`status-dot status-dot--${status}`} />{label}<b>{items.filter((item) => item.status === status).length}</b></div>)}</div>
          </article>
          <article className="side-card quick-calendar-card"><span><CalendarDays size={23} /></span><h3>Tezkor rejalashtirish</h3><p>Kerakli kun ustidagi “+” tugmasi orqali kontentni shu sanaga biriktiring.</p><button className="button-primary button-primary--full" onClick={() => openCreate()}>Kontent yaratish</button></article>
        </aside>
      </section>

      {modalOpen && <ContentFormModal item={modalItem} metadata={metadata} presetDate={presetDate} onClose={() => { setModalOpen(false); setModalItem(null); setPresetDate(null); }} onSave={save} saving={saving} />}
    </div>
  );
}
