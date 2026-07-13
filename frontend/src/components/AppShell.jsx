import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, ChevronDown, Command, LogOut, Menu, Moon, PanelLeftClose, PanelLeftOpen,
  Search, Sun, User, X,
} from 'lucide-react';
import Brand from './Brand.jsx';
import NotificationCenter from './NotificationCenter.jsx';
import CommandPalette from './CommandPalette.jsx';
import AIAssistant from './AIAssistant.jsx';
import PushNotificationManager from './PushNotificationManager.jsx';
import { menuItems } from '../data/navigation.js';
import { apiRequest, authHeaders } from '../lib/api.js';

const menuGroups = [
  { label: 'ASOSIY', items: ['dashboard', 'content', 'calendar', 'tasks'] },
  { label: 'MARKETING', items: ['campaigns', 'ads', 'analytics', 'reports', 'media'] },
  { label: 'BOSHQARUV', items: ['branches', 'team', 'expenses', 'chat', 'settings'] },
];

const mobilePrimary = ['dashboard','content','calendar','tasks','chat'];

export default function AppShell({ page, onPageChange, session, onLogout, notify, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('aloo_theme') || 'light');

  const userName = session?.user?.fullName || 'Aloo Admin';
  const roleLabels = {
    admin: 'Administrator', smm_manager: 'SMM Manager', targetolog: 'Targetolog', designer: 'Dizayner',
    mobilograf: 'Mobilograf', copywriter: 'Copywriter', analyst: 'Analitik', viewer: 'Kuzatuvchi',
  };
  const userRole = roleLabels[session?.user?.role] || session?.user?.role || 'SMM Manager';
  const initials = useMemo(() => userName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), [userName]);
  const visibleMenuItems = useMemo(() => {
    if (session?.user?.role === 'admin') return menuItems;
    const granted = new Set(session?.user?.permissions || []);
    return menuItems.filter((item) => !item.permission || granted.has(item.permission));
  }, [session?.user?.permissions, session?.user?.role]);
  const activeItem = menuItems.find((item) => item.id === page);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('aloo_theme', theme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0b1220' : '#1690F5');
  }, [theme]);

  useEffect(() => {
    const handler = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    const check = () => apiRequest('/api/notifications/smart-check', { method:'POST',headers:authHeaders(session.token),body:'{}' }).catch(() => {});
    void check();
    const timer = setInterval(check, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [session.token]);

  const choosePage = (id) => { onPageChange(id); setMobileNav(false); };
  const mobileItems = mobilePrimary.map((id) => visibleMenuItems.find((item) => item.id === id)).filter(Boolean);

  return (
    <main className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      {mobileNav && <button className="nav-overlay" aria-label="Menyuni yopish" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar--mobile-open' : ''}`}>
        <div className="sidebar-head">
          <Brand compact inverted />
          <button className="icon-button sidebar-collapse" onClick={() => setCollapsed((value) => !value)} aria-label="Menyuni kichraytirish">{collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}</button>
          <button className="icon-button sidebar-mobile-close" onClick={() => setMobileNav(false)} aria-label="Menyuni yopish"><X size={21} /></button>
        </div>
        <nav className="sidebar-nav" aria-label="Asosiy menyu">
          {menuGroups.map((group) => {
            const items = group.items.map((id) => visibleMenuItems.find((item) => item.id === id)).filter(Boolean);
            if (!items.length) return null;
            return <section className="nav-group" key={group.label}><span className="nav-group-label">{group.label}</span>{items.map(({ id, label, icon: Icon, dot }) => <button key={id} className={`nav-item ${page === id ? 'nav-item--active' : ''}`} onClick={() => choosePage(id)} title={collapsed ? label : undefined}><span className="nav-icon-wrap"><Icon size={19} /></span><span>{label}</span>{dot && <i className="nav-dot" />}</button>)}</section>;
          })}
        </nav>
        <div className="sidebar-footer"><span className="sidebar-version">v10.0 · Productivity Suite</span><button className="nav-item nav-item--logout" onClick={onLogout}><span className="nav-icon-wrap"><LogOut size={19} /></span><span>Chiqish</span></button></div>
      </aside>

      <section className="app-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={23} /></button>
            <div className="topbar-breadcrumb"><small>aloo SMM</small><strong>{activeItem?.label || 'Dashboard'}</strong></div>
            <button className="global-search global-search--button" onClick={() => setCommandOpen(true)}><Search size={19} /><span>Panel bo‘yicha qidirish...</span><kbd>⌘ K</kbd></button>
          </div>
          <div className="topbar-actions">
            <button className="icon-button theme-toggle" onClick={() => setTheme((value) => value === 'dark' ? 'light' : 'dark')} title="Ko‘rinishni almashtirish">{theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}</button>
            <button className="icon-button command-mini" onClick={() => setCommandOpen(true)} title="Tezkor menyu"><Command size={19} /></button>
            <div className="range-wrap"><button className="date-button" onClick={() => setRangeOpen((value) => !value)}><CalendarDays size={18} /> Joriy oy <ChevronDown size={16} /></button>{rangeOpen && <div className="range-popover"><strong>Hisobot davri</strong><button onClick={() => { setRangeOpen(false); notify('Joriy oy tanlandi.'); }}>Joriy oy</button><button onClick={() => { setRangeOpen(false); notify('Joriy hafta tanlandi.'); }}>Joriy hafta</button></div>}</div>
            <NotificationCenter session={session} onNavigate={onPageChange} notify={notify} />
            <div className="domain-chip"><span>●</span> aloosmm.uz</div>
            <div className="profile-wrap"><button className="profile-button" onClick={() => setProfileOpen((value) => !value)}><span className="avatar">{initials}</span><span className="profile-copy"><strong>{userName}</strong><small>{userRole}</small></span><ChevronDown size={16} /></button>{profileOpen && <div className="profile-menu"><button onClick={() => { setProfileOpen(false); onPageChange('settings'); }}><User size={17} /> Profil va sozlamalar</button><button onClick={onLogout}><LogOut size={17} /> Chiqish</button></div>}</div>
          </div>
        </header>
        <div className="page-container">{children}</div>
      </section>

      <nav className="mobile-bottom-nav">{mobileItems.map(({ id,label,icon:Icon,dot }) => <button key={id} className={page === id ? 'active' : ''} onClick={() => choosePage(id)}><span><Icon size={20} />{dot && <i />}</span><small>{label}</small></button>)}</nav>
      <CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={onPageChange} session={session} />
      <AIAssistant session={session} notify={notify} />
      <PushNotificationManager session={session} notify={notify} />
    </main>
  );
}
