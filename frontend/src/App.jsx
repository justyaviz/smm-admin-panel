import { useEffect, useState } from 'react';
import AppShell from './components/AppShell.jsx';
import LoginPage from './pages/LoginPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import ContentPage from './pages/ContentPage.jsx';
import CalendarPage from './pages/CalendarPage.jsx';
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
  };

  const logout = () => {
    localStorage.removeItem(LOGIN_KEY);
    sessionStorage.removeItem(LOGIN_KEY);
    setSession(null);
  };

  if (!session) return <><LoginPage onLogin={onLogin} notify={setToast} />{toast && <div className="toast">{toast}</div>}</>;

  let pageContent;
  if (page === 'dashboard') pageContent = <DashboardPage session={session} notify={setToast} onPageChange={setPage} />;
  else if (page === 'content') pageContent = <ContentPage session={session} notify={setToast} />;
  else if (page === 'calendar') pageContent = <CalendarPage session={session} notify={setToast} />;
  else {
    const item = menuItems.find((entry) => entry.id === page);
    pageContent = <PlaceholderPage title={item?.label || 'Sahifa'} description="Ushbu modul keyingi ishlab chiqish bosqichida PostgreSQL va backend API bilan ulanadi." />;
  }

  return (
    <>
      <AppShell page={page} onPageChange={setPage} session={session} onLogout={logout} notify={setToast}>{pageContent}</AppShell>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
