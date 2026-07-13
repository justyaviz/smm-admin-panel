import { useEffect, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FolderKanban,
  PlaySquare,
  RefreshCw,
  Store,
  TrendingUp,
  Megaphone,
  Target,
  WalletCards,
} from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';

const fallback = {
  totalPosts: 0,
  scheduledPosts: 0,
  drafts: 0,
  inReview: 0,
  published: 0,
  thisWeek: 0,
  activeBranches: 0,
};

function KpiCard({ icon: Icon, label, value, note, tone = 'blue' }) {
  return (
    <article className="kpi-card">
      <div className="kpi-top"><span className={`kpi-icon kpi-icon--${tone}`}><Icon size={21} /></span><span>{label}</span></div>
      <strong className="kpi-value">{value}</strong>
      <div className="kpi-note"><TrendingUp size={14} /><span>{note}</span></div>
    </article>
  );
}

export default function DashboardPage({ session, notify, onPageChange }) {
  const [metrics, setMetrics] = useState(fallback);
  const [platformCounts, setPlatformCounts] = useState([]);
  const [marketing, setMarketing] = useState({ activeCampaigns: 0, campaignSpend: 0, campaignReach: 0, activeAds: 0, adClicks: 0, adImpressions: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiRequest('/api/dashboard/summary', { headers: authHeaders(session.token) });
      setMetrics({ ...fallback, ...result.metrics });
      setPlatformCounts(result.platformCounts || []);
      setMarketing((current) => ({ ...current, ...(result.marketing || {}) }));
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const totalPlatforms = platformCounts.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1;

  return (
    <div className="dashboard-page">
      <div className="page-heading">
        <div><h1>Dashboard</h1><p>Aloo do‘konlar tarmog‘i bo‘yicha umumiy SMM holati</p></div>
        <button className="secondary-action" onClick={load} disabled={loading}><RefreshCw size={18} className={loading ? 'spin' : ''} /> Ma’lumotlarni yangilash</button>
      </div>

      <section className="kpi-grid">
        <KpiCard icon={FileText} label="Jami kontentlar" value={metrics.totalPosts} note="barcha yaratilgan materiallar" />
        <KpiCard icon={CalendarDays} label="Rejalashtirilgan" value={metrics.scheduledPosts} note="tasdiqlangan va rejalashtirilgan" tone="purple" />
        <KpiCard icon={FolderKanban} label="Draftlar" value={metrics.drafts} note="hali ish jarayonida" tone="amber" />
        <KpiCard icon={ClipboardList} label="Tekshiruvda" value={metrics.inReview} note="tasdiq kutayotgan kontent" tone="rose" />
        <KpiCard icon={PlaySquare} label="Chop etilgan" value={metrics.published} note="platformalarda e’lon qilingan" tone="green" />
        <KpiCard icon={Store} label="Faol filiallar" value={metrics.activeBranches} note="aloo do‘konlar tarmog‘i" tone="cyan" />
      </section>

      <section className="dashboard-grid dashboard-grid--main">
        <article className="dashboard-card overview-card">
          <div className="card-header"><div><h3>Joriy hafta kontent holati</h3><p>Hafta davomida rejalashtirilgan ishlar</p></div><button className="card-link-inline" onClick={() => onPageChange('calendar')}>Kalendarni ochish</button></div>
          <div className="week-overview">
            <div className="week-score"><strong>{metrics.thisWeek}</strong><span>shu haftadagi kontent</span></div>
            <div className="week-bars">
              <div><span>Chop etilgan</span><b>{metrics.published}</b><i><em style={{ width: `${Math.min(100, (metrics.published / Math.max(1, metrics.totalPosts)) * 100)}%` }} /></i></div>
              <div><span>Rejalashtirilgan</span><b>{metrics.scheduledPosts}</b><i><em style={{ width: `${Math.min(100, (metrics.scheduledPosts / Math.max(1, metrics.totalPosts)) * 100)}%` }} /></i></div>
              <div><span>Tekshiruvda</span><b>{metrics.inReview}</b><i><em style={{ width: `${Math.min(100, (metrics.inReview / Math.max(1, metrics.totalPosts)) * 100)}%` }} /></i></div>
            </div>
          </div>
          <button className="primary-inline" onClick={() => onPageChange('content')}><FolderKanban size={18} /> Kontent boshqaruviga o‘tish</button>
        </article>

        <article className="dashboard-card platform-card-v2">
          <div className="card-header"><div><h3>Platformalar taqsimoti</h3><p>Kontentlar soni bo‘yicha</p></div></div>
          <div className="platform-bars">
            {platformCounts.length === 0 && <div className="empty-mini">Hali kontent kiritilmagan</div>}
            {platformCounts.map((item) => {
              const percent = Math.round((Number(item.count) / totalPlatforms) * 100);
              return (
                <div key={item.name} className="platform-bar-row">
                  <div><span><i style={{ background: item.color }} />{item.name}</span><b>{item.count}</b></div>
                  <div className="platform-track"><span style={{ width: `${percent}%`, background: item.color }} /></div>
                </div>
              );
            })}
          </div>
        </article>

        <article className="dashboard-card marketing-snapshot-card">
          <div className="card-header"><div><h3>Marketing holati</h3><p>Kampaniya va target ko‘rsatkichlari</p></div><button className="card-link-inline" onClick={() => onPageChange('campaigns')}>Batafsil</button></div>
          <div className="snapshot-grid">
            <div><span><Megaphone size={18} /></span><strong>{marketing.activeCampaigns}</strong><small>faol kampaniya</small></div>
            <div><span><Target size={18} /></span><strong>{marketing.activeAds}</strong><small>faol reklama</small></div>
            <div><span><WalletCards size={18} /></span><strong>{new Intl.NumberFormat('uz-UZ', { notation: 'compact' }).format(marketing.campaignSpend)}</strong><small>jami sarf</small></div>
            <div><span><TrendingUp size={18} /></span><strong>{new Intl.NumberFormat('uz-UZ', { notation: 'compact' }).format(marketing.adClicks)}</strong><small>reklama kliklari</small></div>
          </div>
        </article>

        <article className="dashboard-card quick-actions-card">
          <div className="card-header"><div><h3>Tezkor amallar</h3><p>Ko‘p ishlatiladigan funksiyalar</p></div></div>
          <div className="quick-actions-grid">
            <button onClick={() => onPageChange('content')}><span><FileText size={21} /></span><b>Yangi kontent</b><small>Post yoki reels qo‘shish</small></button>
            <button onClick={() => onPageChange('calendar')}><span><CalendarDays size={21} /></span><b>Kalendar</b><small>Oylik rejani ko‘rish</small></button>
            <button onClick={() => onPageChange('campaigns')}><span><Megaphone size={21} /></span><b>Kampaniya</b><small>Promo kampaniya yaratish</small></button>
            <button onClick={() => onPageChange('ads')}><span><Target size={21} /></span><b>Target reklama</b><small>Reklama natijalarini kiritish</small></button>
          </div>
        </article>
      </section>
    </div>
  );
}
