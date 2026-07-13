import { useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  ChevronDown,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  User,
  X,
} from 'lucide-react';
import Brand from './Brand.jsx';
import { menuItems } from '../data/navigation.js';

export default function AppShell({ page, onPageChange, session, onLogout, notify, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [rangeOpen, setRangeOpen] = useState(false);

  const userName = session?.user?.fullName || 'Aloo Admin';
  const roleLabels = {
    admin: 'Administrator', smm_manager: 'SMM Manager', targetolog: 'Targetolog',
    designer: 'Dizayner', mobilograf: 'Mobilograf', copywriter: 'Copywriter', analyst: 'Analitik', viewer: 'Kuzatuvchi',
  };
  const userRole = roleLabels[session?.user?.role] || session?.user?.role || 'SMM Manager';
  const initials = useMemo(() => userName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(), [userName]);

  const choosePage = (id) => {
    onPageChange(id);
    setMobileNav(false);
  };

  return (
    <main className={`app-shell ${collapsed ? 'app-shell--collapsed' : ''}`}>
      {mobileNav && <button className="nav-overlay" aria-label="Menyuni yopish" onClick={() => setMobileNav(false)} />}
      <aside className={`sidebar ${mobileNav ? 'sidebar--mobile-open' : ''}`}>
        <div className="sidebar-head">
          <Brand compact inverted />
          <button className="icon-button sidebar-collapse" onClick={() => setCollapsed((value) => !value)} aria-label="Menyuni kichraytirish">
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
          <button className="icon-button sidebar-mobile-close" onClick={() => setMobileNav(false)} aria-label="Menyuni yopish"><X size={20} /></button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map(({ id, label, icon: Icon, dot }) => (
            <button key={id} className={`nav-item ${page === id ? 'nav-item--active' : ''}`} onClick={() => choosePage(id)} title={collapsed ? label : undefined}>
              <Icon size={19} />
              <span>{label}</span>
              {dot && <i className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-version">v5.0 · Media kutubxona</span>
          <button className="nav-item nav-item--logout" onClick={onLogout}><LogOut size={19} /><span>Chiqish</span></button>
        </div>
      </aside>

      <section className="app-content">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu" onClick={() => setMobileNav(true)}><Menu size={22} /></button>
            <div className="global-search"><Search size={18} /><input placeholder="Panel bo‘yicha qidirish..." /><kbd>⌘ K</kbd></div>
          </div>
          <div className="topbar-actions">
            <div className="range-wrap">
              <button className="date-button" onClick={() => setRangeOpen((value) => !value)}><CalendarDays size={18} /> Joriy oy <ChevronDown size={16} /></button>
              {rangeOpen && (
                <div className="range-popover">
                  <strong>Hisobot davri</strong>
                  <button onClick={() => { setRangeOpen(false); notify('Joriy oy tanlandi.'); }}>Joriy oy</button>
                  <button onClick={() => { setRangeOpen(false); notify('Joriy hafta tanlandi.'); }}>Joriy hafta</button>
                </div>
              )}
            </div>
            <button className="notification-button" onClick={() => notify('Hozircha yangi bildirishnoma yo‘q.')}><Bell size={20} /><span>2</span></button>
            <div className="domain-chip"><span>●</span> aloosmm.uz</div>
            <div className="profile-wrap">
              <button className="profile-button" onClick={() => setProfileOpen((value) => !value)}>
                <span className="avatar">{initials}</span>
                <span className="profile-copy"><strong>{userName}</strong><small>{userRole}</small></span>
                <ChevronDown size={16} />
              </button>
              {profileOpen && (
                <div className="profile-menu">
                  <button onClick={() => notify('Profil sahifasi keyingi bosqichda qo‘shiladi.')}><User size={17} /> Profil</button>
                  <button onClick={onLogout}><LogOut size={17} /> Chiqish</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <div className="page-container">{children}</div>
      </section>
    </main>
  );
}
