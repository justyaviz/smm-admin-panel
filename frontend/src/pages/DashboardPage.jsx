import { useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  FileBarChart,
  FolderKanban,
  PlaySquare,
  RefreshCw,
  Store,
  TrendingUp,
  Megaphone,
  Target,
  WalletCards,
  AlertTriangle,
  CircleDollarSign,
  Clock3,
  Sparkles,
  Palette,
  Video,
  PenTool,
  Eye,
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

const roleExperience = {
  admin: { title: 'Boshqaruv markazi', subtitle: 'Butun tarmoq, byudjet va jamoa holati bir ekranda', icon: Store, actions: [['content','Yangi kontent'],['team','Jamoa'],['expenses','Byudjet']] },
  smm_manager: { title: 'Bugungi kontent oqimi', subtitle: 'Tekshiruv, kalendar va jamoa topshiriqlarini boshqaring', icon: FolderKanban, actions: [['content','Kontent'],['calendar','Kalendar'],['tasks','Vazifalar']] },
  targetolog: { title: 'Reklama boshqaruvi', subtitle: 'Faol reklamalar, sarf va natijalarni kuzating', icon: Target, actions: [['ads','Target'],['campaigns','Kampaniya'],['analytics','Analitika']] },
  designer: { title: 'Dizayn ish maydoni', subtitle: 'Sizga biriktirilgan kreativlar va deadline’lar', icon: Palette, actions: [['tasks','Vazifalar'],['media','Media'],['content','Kontent']] },
  mobilograf: { title: 'Video ishlab chiqarish', subtitle: 'Reels, syomka va montaj vazifalari', icon: Video, actions: [['tasks','Vazifalar'],['content','Reels'],['media','Media']] },
  copywriter: { title: 'Matn va g‘oyalar', subtitle: 'Caption, hook va tasdiq kutayotgan kontentlar', icon: PenTool, actions: [['content','Kontent'],['tasks','Vazifalar'],['chat','Chat']] },
  analyst: { title: 'Natijalar markazi', subtitle: 'KPI, ROAS va filiallar dinamikasi', icon: BarChart3, actions: [['analytics','Analitika'],['reports','Hisobot'],['expenses','Xarajat']] },
  viewer: { title: 'Kuzatuv paneli', subtitle: 'Muhim natijalarni xavfsiz ko‘rish', icon: Eye, actions: [['dashboard','Dashboard'],['reports','Hisobot'],['calendar','Kalendar']] },
};

export default function DashboardPage({ session, notify, onPageChange }) {
  const [metrics, setMetrics] = useState(fallback);
  const [platformCounts, setPlatformCounts] = useState([]);
  const [marketing, setMarketing] = useState({ activeCampaigns: 0, campaignSpend: 0, campaignReach: 0, activeAds: 0, adClicks: 0, adImpressions: 0 });
  const [operations, setOperations] = useState({ openTasks: 0, inProgressTasks: 0, overdueTasks: 0, completedTasksMonth: 0, monthSpend: 0, pendingExpense: 0, pendingExpenseCount: 0 });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const result = await apiRequest('/api/dashboard/summary', { headers: authHeaders(session.token) });
      setMetrics({ ...fallback, ...result.metrics });
      setPlatformCounts(result.platformCounts || []);
      setMarketing((current) => ({ ...current, ...(result.marketing || {}) }));
      setOperations((current) => ({ ...current, ...(result.operations || {}) }));
    } catch (error) {
      notify(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const roleView = roleExperience[session?.user?.role] || roleExperience.smm_manager;
  const RoleIcon = roleView.icon;
  const totalPlatforms = platformCounts.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1;

  return (
    <div className="dashboard-page">
      <section className="role-dashboard-hero">
        <div className="role-dashboard-icon"><RoleIcon size={28} /></div>
        <div><span>{session?.user?.fullName || 'Aloo jamoasi'}, xush kelibsiz</span><h1>{roleView.title}</h1><p>{roleView.subtitle}</p></div>
        <div className="role-dashboard-actions">{roleView.actions.map(([target,label]) => <button key={target} onClick={() => onPageChange(target, null, target === 'content' ? 'create' : null)}>{label}</button>)}<button className="role-ai" onClick={() => window.dispatchEvent(new CustomEvent('aloo:open-ai'))}><Sparkles size={17} /> AI yordamchi</button></div>
        <button className="role-refresh" onClick={load} disabled={loading}><RefreshCw size={18} className={loading ? 'spin' : ''} /></button>
      </section>

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

        <article className="dashboard-card operations-snapshot-card">
          <div className="card-header"><div><h3>Operatsion holat</h3><p>Vazifalar va joriy oy xarajatlari</p></div><button className="card-link-inline" onClick={() => onPageChange('tasks')}>Vazifalarni ochish</button></div>
          <div className="snapshot-grid operations-snapshot-grid">
            <div><span><ClipboardList size={18} /></span><strong>{operations.openTasks}</strong><small>ochiq vazifa</small></div>
            <div><span><AlertTriangle size={18} /></span><strong>{operations.overdueTasks}</strong><small>kechikkan vazifa</small></div>
            <div><span><CircleDollarSign size={18} /></span><strong>{new Intl.NumberFormat('uz-UZ', { notation: 'compact' }).format(operations.monthSpend)}</strong><small>oylik xarajat</small></div>
            <div><span><Clock3 size={18} /></span><strong>{operations.pendingExpenseCount}</strong><small>tasdiq kutmoqda</small></div>
          </div>
        </article>

        <article className="dashboard-card quick-actions-card">
          <div className="card-header"><div><h3>Tezkor amallar</h3><p>Ko‘p ishlatiladigan funksiyalar</p></div></div>
          <div className="quick-actions-grid">
            <button onClick={() => onPageChange('content', null, 'create')}><span><FileText size={21} /></span><b>Yangi kontent</b><small>Post yoki reels qo‘shish</small></button>
            <button onClick={() => onPageChange('calendar')}><span><CalendarDays size={21} /></span><b>Kalendar</b><small>Oylik rejani ko‘rish</small></button>
            <button onClick={() => onPageChange('campaigns')}><span><Megaphone size={21} /></span><b>Kampaniya</b><small>Promo kampaniya yaratish</small></button>
            <button onClick={() => onPageChange('ads')}><span><Target size={21} /></span><b>Target reklama</b><small>Reklama natijalarini kiritish</small></button>
            <button onClick={() => onPageChange('analytics')}><span><BarChart3 size={21} /></span><b>Analitika</b><small>Real KPI va natijalar</small></button>
            <button onClick={() => onPageChange('reports')}><span><FileBarChart size={21} /></span><b>Hisobotlar</b><small>Excel, PDF va CSV</small></button>
            <button onClick={() => onPageChange('tasks')}><span><ClipboardList size={21} /></span><b>Vazifalar</b><small>Jamoa ishlarini boshqarish</small></button>
            <button onClick={() => onPageChange('expenses')}><span><CircleDollarSign size={21} /></span><b>Xarajatlar</b><small>Byudjet va tasdiqlar</small></button>
          </div>
        </article>
      </section>
    </div>
  );
}
