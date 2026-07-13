import { useEffect, useState } from 'react';
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
import { apiRequest, authHeaders } from './lib/api.js';
import { menuItems } from './data/navigation.js';

const LOGIN_KEY = 'aloo_smm_session';

export default function App() {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(LOGIN_KEY) || sessionStorage.getItem(LOGIN_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch { return null; }
  });
  const [page, setPage] = useState('dashboard');
  const [pagePayload, setPagePayload] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (!toast) return undefined;
    const timer = setTimeout(() => setToast(''), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!session?.token) return undefined;
    let cancelled = false;
    apiRequest('/api/auth/me', { headers: authHeaders(session.token) })
      .then(({ user }) => {
        if (!cancelled) setSession((current) => current ? { ...current, user } : current);
      })
      .catch(() => {
        if (!cancelled) {
          localStorage.removeItem(LOGIN_KEY);
          sessionStorage.removeItem(LOGIN_KEY);
          setSession(null);
        }
      });
    return () => { cancelled = true; };
  }, [session?.token]);

  const onLogin = ({ remember, token, user }) => {
    const value = { token, user };
    const serialized = JSON.stringify(value);
    localStorage.removeItem(LOGIN_KEY);
    sessionStorage.removeItem(LOGIN_KEY);
    if (remember) localStorage.setItem(LOGIN_KEY, serialized);
    else sessionStorage.setItem(LOGIN_KEY, serialized);
    setSession(value);
    setPage('dashboard');
    setPagePayload(null);
  };


  const navigate = (nextPage, entityId = null) => {
    setPage(nextPage);
    setPagePayload(entityId ? { entityId: Number(entityId) } : null);
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
    setSession(null);
  };

  if (!session) return <><LoginPage onLogin={onLogin} notify={setToast} />{toast && <div className="toast">{toast}</div>}</>;

  let pageContent;
  if (page === 'dashboard') pageContent = <DashboardPage session={session} notify={setToast} onPageChange={navigate} />;
  else if (page === 'content') pageContent = <ContentPage session={session} notify={setToast} />;
  else if (page === 'calendar') pageContent = <CalendarPage session={session} notify={setToast} />;
  else if (page === 'campaigns') pageContent = <CampaignsPage session={session} notify={setToast} />;
  else if (page === 'ads') pageContent = <AdsPage session={session} notify={setToast} />;
  else if (page === 'analytics') pageContent = <AnalyticsPage session={session} notify={setToast} />;
  else if (page === 'reports') pageContent = <ReportsPage session={session} notify={setToast} />;
  else if (page === 'media') pageContent = <MediaPage session={session} notify={setToast} />;
  else if (page === 'branches') pageContent = <BranchesPage session={session} notify={setToast} />;
  else if (page === 'team') pageContent = <TeamPage session={session} notify={setToast} />;
  else if (page === 'tasks') pageContent = <TasksPage session={session} notify={setToast} />;
  else if (page === 'expenses') pageContent = <ExpensesPage session={session} notify={setToast} />;
  else if (page === 'chat') pageContent = <ChatPage session={session} notify={setToast} initialChannelId={pagePayload?.entityId || null} />;
  else if (page === 'settings') pageContent = <SettingsPage session={session} notify={setToast} onUserUpdated={updateSessionUser} />;
  else {
    const item = menuItems.find((entry) => entry.id === page);
    pageContent = <PlaceholderPage title={item?.label || 'Sahifa'} description="Ushbu modul keyingi ishlab chiqish bosqichida PostgreSQL va backend API bilan ulanadi." />;
  }

  return (
    <>
      <AppShell page={page} onPageChange={navigate} session={session} onLogout={logout} notify={setToast}>{pageContent}</AppShell>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
