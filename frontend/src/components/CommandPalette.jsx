import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, CalendarDays, CircleDollarSign, ClipboardCheck, FilePlus2,
  FolderKanban, Image, Loader2, Megaphone, Search, Sparkles, Store, Target,
  UserRound, UsersRound, X,
} from 'lucide-react';
import { menuItems } from '../data/navigation.js';
import { apiRequest, authHeaders } from '../lib/api.js';

const quickActions = [
  { id: 'new-content', label: 'Yangi kontent yaratish', hint: '3 ta maydon bilan', icon: FilePlus2, page: 'content', action: 'create' },
  { id: 'calendar', label: 'Kontent kalendarini ochish', hint: 'drag & drop', icon: CalendarDays, page: 'calendar' },
  { id: 'new-task', label: 'Yangi vazifa qo‘shish', hint: 'jamoaga biriktirish', icon: ClipboardCheck, page: 'tasks', action: 'create' },
  { id: 'new-expense', label: 'Yangi xarajat qo‘shish', hint: 'byudjet nazorati', icon: CircleDollarSign, page: 'expenses', action: 'create' },
  { id: 'ai', label: 'AI yordamchini ochish', hint: 'caption, hook, ssenariy', icon: Sparkles, event: 'aloo:open-ai' },
];

const pageIcons = { content: FolderKanban, campaigns: Megaphone, ads: Target, analytics: BarChart3, media: Image, team: UsersRound };
const searchIcons = { content: FolderKanban, task: ClipboardCheck, campaign: Megaphone, branch: Store, user: UserRound, media: Image, expense: CircleDollarSign };
const typeLabels = { content: 'Kontent', task: 'Vazifa', campaign: 'Kampaniya', branch: 'Filial', user: 'Xodim', media: 'Media', expense: 'Xarajat' };

export default function CommandPalette({ open, onClose, onNavigate, session }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [remoteResults, setRemoteResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(0);
    setRemoteResults([]);
    const timer = setTimeout(() => inputRef.current?.focus(), 30);
    const close = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', close);
    return () => { clearTimeout(timer); window.removeEventListener('keydown', close); };
  }, [open, onClose]);

  useEffect(() => {
    const term = query.trim();
    if (!open || term.length < 2 || !session?.token) {
      setRemoteResults([]);
      setSearching(false);
      return undefined;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      apiRequest(`/api/search?q=${encodeURIComponent(term)}`, { headers: authHeaders(session.token) })
        .then((result) => {
          if (cancelled) return;
          setRemoteResults((result.items || []).map((item) => ({
            id: `search-${item.resultType}-${item.id}`,
            label: item.title,
            hint: `${typeLabels[item.resultType] || 'Natija'} · ${item.subtitle || 'Ochish'}`,
            icon: searchIcons[item.resultType] || Search,
            page: item.page,
            entityId: item.id,
            isSearchResult: true,
          })));
        })
        .catch(() => { if (!cancelled) setRemoteResults([]); })
        .finally(() => { if (!cancelled) setSearching(false); });
    }, 220);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, open, session?.token]);

  const results = useMemo(() => {
    const pages = menuItems.map((item) => ({ ...item, hint: 'Sahifaga o‘tish', page: item.id, icon: pageIcons[item.id] || item.icon }));
    const all = [...quickActions, ...pages];
    const term = query.trim().toLowerCase();
    const local = term ? all.filter((item) => `${item.label} ${item.hint || ''}`.toLowerCase().includes(term)) : all;
    return term.length >= 2 ? [...remoteResults, ...local] : local;
  }, [query, remoteResults]);

  useEffect(() => {
    if (selected > results.length - 1) setSelected(Math.max(0, results.length - 1));
  }, [results.length, selected]);

  const run = (item) => {
    if (!item) return;
    onClose();
    if (item.event) window.dispatchEvent(new CustomEvent(item.event));
    else onNavigate(item.page, item.entityId || null, item.action || null);
  };

  const keyDown = (event) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setSelected((value) => Math.min(value + 1, results.length - 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); setSelected((value) => Math.max(value - 1, 0)); }
    if (event.key === 'Enter') { event.preventDefault(); run(results[selected]); }
  };

  if (!open) return null;
  return (
    <div className="command-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="command-palette" role="dialog" aria-modal="true">
        <header><Search size={21} /><input ref={inputRef} value={query} onChange={(event) => { setQuery(event.target.value); setSelected(0); }} onKeyDown={keyDown} placeholder="Sahifa, kontent, vazifa, filial yoki xodim qidiring…" />{searching ? <Loader2 className="spin" size={18} /> : <kbd>ESC</kbd>}<button onClick={onClose}><X size={18} /></button></header>
        <div className="command-results">
          {!results.length && !searching && <div className="command-empty">Hech narsa topilmadi</div>}
          {results.map((item, index) => {
            const Icon = item.icon;
            return <button key={`${item.id}-${index}`} className={`${selected === index ? 'selected' : ''} ${item.isSearchResult ? 'command-search-result' : ''}`} onMouseEnter={() => setSelected(index)} onClick={() => run(item)}><span><Icon size={19} /></span><div><strong>{item.label}</strong><small>{item.hint}</small></div><ArrowRight size={17} /></button>;
          })}
        </div>
        <footer><span>↑↓ tanlash</span><span>Enter ochish</span><span>⌘/Ctrl + K</span></footer>
      </section>
    </div>
  );
}
