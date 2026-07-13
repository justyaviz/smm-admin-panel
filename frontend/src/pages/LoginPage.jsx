import { useState } from 'react';
import { BarChart3, CalendarDays, Check, Eye, EyeOff, LockKeyhole, Send, Target, UserRound } from 'lucide-react';
import Brand from '../components/Brand.jsx';
import { apiRequest } from '../lib/api.js';

function Feature({ icon: Icon, title, text }) {
  return (
    <div className="feature-item"><span><Icon size={21} /></span><div><strong>{title}</strong><p>{text}</p></div></div>
  );
}

export default function LoginPage({ onLogin, notify }) {
  const [login, setLogin] = useState('admin');
  const [password, setPassword] = useState('123456');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!login.trim() || !password.trim()) {
      setError('Login va parolni to‘liq kiriting.');
      return;
    }
    setLoading(true);
    try {
      const result = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier: login.trim(), password }),
      });
      onLogin({ remember, token: result.token, user: result.user });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-hero">
        <div className="hero-grid" />
        <div className="hero-content">
          <Brand />
          <div className="hero-copy">
            <p className="eyebrow">ALOOSMM.UZ</p>
            <h1>Aloo do‘konlar tarmog‘i uchun SMM boshqaruv tizimi</h1>
            <p className="hero-description">Kontent rejalari, reklama kampaniyalari, filiallar va hisobotlarni bitta qulay paneldan boshqaring.</p>
          </div>
          <div className="feature-list">
            <Feature icon={CalendarDays} title="Kontent rejasi va kalendar" text="Postlar rejasini tuzing va jarayonni nazorat qiling." />
            <Feature icon={BarChart3} title="Analitika va hisobotlar" text="Natijalarni tahlil qiling va o‘sishni kuzatib boring." />
            <Feature icon={Target} title="Target reklama nazorati" text="Reklama kampaniyalari samaradorligini boshqaring." />
          </div>
        </div>
        <img className="login-illustration" src="/assets/login-illustration.png" alt="SMM boshqaruv vizuali" />
      </section>

      <section className="login-panel">
        <div className="connected-badge"><Check size={16} /> aloosmm.uz bilan bog‘langan</div>
        <form className="login-card" onSubmit={submit}>
          <div className="mobile-brand"><Brand compact /></div>
          <div className="login-heading">
            <span className="login-icon"><LockKeyhole size={22} /></span>
            <div><h2>Tizimga kirish</h2><p>Aloo SMM jamoasi kabinetiga xush kelibsiz</p></div>
          </div>
          <label className="field-label" htmlFor="login">Login yoki telefon raqami</label>
          <div className="input-wrap"><UserRound size={19} /><input id="login" value={login} onChange={(event) => setLogin(event.target.value)} autoComplete="username" /></div>
          <label className="field-label" htmlFor="password">Parol</label>
          <div className="input-wrap"><LockKeyhole size={19} /><input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /><button type="button" className="icon-button password-toggle" onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>
          <div className="login-options"><label className="checkbox-row"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span className="custom-check"><Check size={13} /></span>Meni eslab qol</label><button type="button" className="link-button" onClick={() => notify('Parol tiklash keyingi bosqichda qo‘shiladi.')}>Parolni unutdingizmi?</button></div>
          {error && <div className="form-error">{error}</div>}
          <button className="primary-button" disabled={loading} type="submit">{loading ? <span className="spinner" /> : 'Kirish'}</button>
          <div className="divider"><span>yoki</span></div>
          <button type="button" className="telegram-button" onClick={() => notify('Telegram orqali kirish keyingi bosqichda ulanadi.')}><Send size={19} /> Telegram orqali kirish</button>
          <p className="login-footnote">Kirish ma’lumotlari backend va PostgreSQL orqali tekshiriladi</p>
        </form>
      </section>
    </main>
  );
}
