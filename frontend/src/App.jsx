import { useEffect, useMemo, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ContentPage from './pages/ContentPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
import CampaignsPage from './pages/CampaignsPage.jsx';
import AdsPage from './pages/AdsPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import MediaPage from './pages/MediaPage.jsx';
import BranchesPage from './pages/BranchesPage.jsx';
import TeamPage from './pages/TeamPage.jsx';
import TasksPage from './pages/TasksPage.jsx';
import ExpensesPage from './pages/ExpensesPage.jsx';
import ChatPage from './pages/ChatPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';
import RealtimeListener from './components/RealtimeListener.jsx';
import InstallPrompt from './components/InstallPrompt.jsx';
import { apiRequest, authHeaders } from './lib/api.js';
import { menuItems } from './data/navigation.js';

const LOGIN_KEY = 'aloo_smm_session';

const PAGE_ROUTES = Object.freeze({
  dashboard: '/dashboard',
  content: '/content',
  calendar: '/kalendar',
  campaigns: '/kampaniyalar',
  ads: '/target-reklama',
  analytics: '/analitika',
  reports: '/hisobotlar',
  media: '/media',
  branches: '/filiallar',
  tasks: '/vazifalar',
  team: '/jamoa',
  expenses: '/xarajatlar',
  chat: '/chat',
  settings: '/sozlamalar',
});

const ROUTE_PAGES = Object.fromEntries(Object.entries(PAGE_ROUTES).map(([page, route]) => [route, page]));

function pageFromLocation() {
  const pathname = window.location.pathname.replace(/\/+$/, '') || '/';
  if (pathname === '/' || pathname === '/login') return 'dashboard';
  return ROUTE_PAGES[pathname] || 'dashboard';
}

function routeForPage(page) {
  return PAGE_ROUTES[page] || PAGE_ROUTES.dashboard;
}

function payloadFromLocation() {
  const query = new URLSearchParams(window.location.search);
  const action = query.get('action');
  const rawEntityId = query.get('entityId');
  const entityId = rawEntityId && Number.isInteger(Number(rawEntityId)) ? Number(rawEntityId) : null;
  return action || entityId ? { entityId, action } : null;
}

export default function App() {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(LOGIN_KEY) || sessionStorage.getItem(LOGIN_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  const [page, setPage] = useState(pageFromLocation);
  const [pagePayload, setPagePayload] = useState(payloadFromLocation);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const onPopState = () => {
      setPage(pageFromLocation());
      setPagePayload(payloadFromLocation());
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!session?.token) {
      if (window.location.pathname !== '/login') window.history.replaceState({}, '', '/login');
      return undefined;
    }

    if (window.location.pathname === '/' || window.location.pathname === '/login') {
      window.history.replaceState({}, '', routeForPage(page));
    }

    let cancelled = false;
    apiRequest('/api/auth/me', { headers: authHeaders(session.token) })
      .then(({ user }) => {
        if (!cancelled) setSession((current) => current ? { ...current, user } : current);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(LOGIN_KEY);
          sessionStorage.removeItem(LOGIN_KEY);
          window.history.replaceState({}, '', '/login');
          setSession(null);
        }
      });
    return () => { cancelled = true; };
  }, [session?.token]);

  useEffect(() => {
    const label = menuItems.find((item) => item.id === page)?.label || 'SMM Panel';
    document.title = `${label} — aloo SMM`;
  }, [page]);

  const onLogin = ({ remember, token, user }) => {
    const value = { token, user };
    const serialized = JSON.stringify(value);
    localStorage.removeItem(LOGIN_KEY);
    sessionStorage.removeItem(LOGIN_KEY);
    if (remember) localStorage.setItem(LOGIN_KEY, serialized);
    else sessionStorage.setItem(LOGIN_KEY, serialized);
    window.history.replaceState({}, '', PAGE_ROUTES.dashboard);
    setSession(value);
    setPage('dashboard');
    setPagePayload(null);
  };

  const navigate = (nextPage, entityId = null, action = null) => {
    const baseRoute = routeForPage(nextPage);
    const query = new URLSearchParams();
    if (action) query.set('action', action);
    if (entityId) query.set('entityId', String(entityId));
    const nextRoute = query.size ? `${baseRoute}?${query}` : baseRoute;
    if (`${window.location.pathname}${window.location.search}` !== nextRoute) window.history.pushState({}, '', nextRoute);
    setPage(nextPage);
    setPagePayload(entityId || action ? { entityId: entityId ? Number(entityId) : null, action } : null);
  };

  const updateSessionUser = (user) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, user: { ...current.user, ...user } };
      const serialized = JSON.stringify(next);
      if (localStorage.getItem(LOGIN_KEY)) localStorage.setItem(LOGIN_KEY, serialized);
      else sessionStorage.setItem(LOGIN_KEY, serialized);
      return next;
    });
  };

  const logout = () => {
    localStorage.removeItem(LOGIN_KEY);
    sessionStorage.removeItem(LOGIN_KEY);
    window.history.replaceState({}, '', '/login');
    setSession(null);
  };

  const currentPageLabel = useMemo(() => menuItems.find((item) => item.id === page)?.label || 'Sahifa', [page]);

  if (!session) return <><LoginPage onLogin={onLogin} notify={setToast} />{toast && <div className="toast">{toast}</div>}</>;

  let pageContent;
  if (page === 'dashboard') pageContent = <DashboardPage session={session} notify={setToast} onPageChange={navigate} />;
  else if (page === 'content') pageContent = <ContentPage session={session} notify={setToast} initialAction={pagePayload?.action || null} initialEntityId={pagePayload?.entityId || null} />;
  else if (page === 'calendar') pageContent = <CalendarPage session={session} notify={setToast} initialAction={pagePayload?.action || null} />;
  else if (page === 'campaigns') pageContent = <CampaignsPage session={session} notify={setToast} />;
  else if (page === 'ads') pageContent = <AdsPage session={session} notify={setToast} />;
  else if (page === 'analytics') pageContent = <AnalyticsPage session={session} notify={setToast} />;
  else if (page === 'reports') pageContent = <ReportsPage session={session} notify={setToast} />;
  else if (page === 'media') pageContent = <MediaPage session={session} notify={setToast} />;
  else if (page === 'branches') pageContent = <BranchesPage session={session} notify={setToast} />;
  else if (page === 'team') pageContent = <TeamPage session={session} notify={setToast} />;
  else if (page === 'tasks') pageContent = <TasksPage session={session} notify={setToast} initialAction={pagePayload?.action || null} initialEntityId={pagePayload?.entityId || null} />;
  else if (page === 'expenses') pageContent = <ExpensesPage session={session} notify={setToast} initialAction={pagePayload?.action || null} />;
  else if (page === 'chat') pageContent = <ChatPage session={session} notify={setToast} initialChannelId={pagePayload?.entityId || null} />;
  else if (page === 'settings') pageContent = <SettingsPage session={session} notify={setToast} onUserUpdated={updateSessionUser} />;
  else pageContent = <PlaceholderPage title={currentPageLabel} description="Ushbu modul keyingi ishlab chiqish bosqichida PostgreSQL va backend API bilan ulanadi." />;

  return (
    <>
      <AppShell page={page} onPageChange={navigate} session={session} onLogout={logout} notify={setToast}>
        <div key={page} className="route-page-enter">{pageContent}</div>
      </AppShell>
      <RealtimeListener token={session.token} onEvent={(eventName, eventData) => {
        window.dispatchEvent(new CustomEvent(`aloo:realtime:${eventName}`, { detail: eventData }));
        const important = ['content.status','content.comment','notifications.smart','task.assigned','task.status','chat.message','expense.status'];
        if (important.includes(eventName)) {
          setToast('Yangi yangilanish keldi.');
          if ('Notification' in window && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
            const labels = {
              'content.status': 'Kontent statusi yangilandi',
              'content.comment': 'Kontentga yangi izoh',
              'notifications.smart': 'Muhim eslatma',
              'task.assigned': 'Yangi vazifa',
              'task.status': 'Vazifa statusi yangilandi',
              'chat.message': 'Yangi chat xabari',
              'expense.status': 'Xarajat statusi yangilandi',
            };
            const payload = eventData?.payload || {};
            new Notification(labels[eventName] || 'aloo SMM Panel', {
              body: payload.message || payload.title || 'Panelda yangi yangilanish bor.',
              icon: '/favicon-192.png',
              tag: `${eventName}-${eventData?.id || Date.now()}`,
            });
          }
        }
      }} />
      <InstallPrompt />
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
