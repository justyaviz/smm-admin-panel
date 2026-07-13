import { useEffect, useState } from 'react';
import {
  BarChart3, Building2, ChevronDown, Download, FileBarChart, FileSpreadsheet,
  FileText, FolderDown, Megaphone, Plus, RefreshCw, Trash2,
} from 'lucide-react';
import ReportFormModal from '../components/ReportFormModal.jsx';
import { apiDownload, apiRequest, authHeaders } from '../lib/api.js';
import { formatLabels, monthRange, reportTypeLabels } from '../data/analytics.js';

const templates = [
  { reportType: 'full', format: 'xlsx', name: 'Oylik to‘liq SMM hisoboti', icon: FileSpreadsheet, text: 'Analitika, platformalar, filiallar, kampaniyalar va kontent.' },
  { reportType: 'summary', format: 'pdf', name: 'Rahbariyat uchun qisqa hisobot', icon: FileText, text: 'Asosiy KPI, sarf, sotuv va ROAS ko‘rsatkichlari.' },
  { reportType: 'branches', format: 'xlsx', name: 'Filiallar bo‘yicha tahlil', icon: Building2, text: 'Har bir filialning reach, lead, sotuv va sarf natijalari.' },
  { reportType: 'campaigns', format: 'pdf', name: 'Reklama kampaniyalari hisoboti', icon: Megaphone, text: 'Kampaniya natijalari, ROAS va top ko‘rsatkichlar.' },
];

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function FileIcon({ format }) {
  if (format === 'xlsx') return <FileSpreadsheet size={20}/>;
  if (format === 'pdf') return <FileText size={20}/>;
  return <FileBarChart size={20}/>;
}

export default function ReportsPage({ session, notify }) {
  const [items, setItems] = useState([]);
  const [metadata, setMetadata] = useState({ platforms: [], branches: [] });
  const [summary, setSummary] = useState({ total: 0, this_month: 0, pdf: 0, xlsx: 0 });
  const [filters, setFilters] = useState({ format: '', reportType: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [modal, setModal] = useState({ open: false, preset: null });
  const headers = authHeaders(session.token);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([,v])=>v));
      const [list, totals, meta] = await Promise.all([
        apiRequest(`/api/reports?${params}`, { headers }),
        apiRequest('/api/reports/summary', { headers }),
        metadata.platforms.length ? Promise.resolve(metadata) : apiRequest('/api/meta', { headers }),
      ]);
      setItems(list.items || []);
      setSummary(totals.metrics || summary);
      if (meta.platforms) setMetadata(meta);
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [filters.format, filters.reportType]);

  const download = async (item) => {
    setDownloading(item.id);
    try { const filename = await apiDownload(`/api/reports/${item.id}/download`, { headers }); notify(`${filename} yuklandi.`); }
    catch (error) { notify(error.message); }
    finally { setDownloading(null); }
  };

  const create = async (form) => {
    setSaving(true);
    try {
      const result = await apiRequest('/api/reports', { method: 'POST', headers, body: JSON.stringify(form) });
      setModal({ open: false, preset: null });
      notify('Hisobot yaratildi. Fayl tayyorlanmoqda...');
      await load();
      await download(result.item);
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };

  const remove = async (item) => {
    if (!window.confirm(`“${item.name}” hisobotini tarixdan o‘chirasizmi?`)) return;
    try { await apiRequest(`/api/reports/${item.id}`, { method: 'DELETE', headers }); notify('Hisobot tarixdan o‘chirildi.'); await load(); }
    catch (error) { notify(error.message); }
  };

  const useTemplate = (template) => {
    const range = monthRange();
    setModal({ open: true, preset: { ...template, ...range } });
  };

  return <div className="reports-page">
    <div className="page-heading"><div><h1>Hisobotlar</h1><p>Analitika ma’lumotlaridan Excel, PDF va CSV hisobotlarini yarating</p></div><button className="button-primary" onClick={()=>setModal({open:true,preset:null})}><Plus size={18}/> Yangi hisobot</button></div>

    <section className="report-stat-grid">
      <article><span><FolderDown size={20}/></span><div><small>Jami hisobotlar</small><strong>{summary.total || 0}</strong><em>yaratilgan fayllar</em></div></article>
      <article><span><RefreshCw size={20}/></span><div><small>Joriy oy</small><strong>{summary.this_month || 0}</strong><em>shu oyda yaratilgan</em></div></article>
      <article><span><FileText size={20}/></span><div><small>PDF</small><strong>{summary.pdf || 0}</strong><em>taqdimot uchun</em></div></article>
      <article><span><FileSpreadsheet size={20}/></span><div><small>Excel</small><strong>{summary.xlsx || 0}</strong><em>batafsil tahlil uchun</em></div></article>
    </section>

    <section className="report-template-section">
      <div className="section-title"><div><h2>Tayyor shablonlar</h2><p>Eng ko‘p ishlatiladigan hisobotni bir necha bosishda yarating</p></div></div>
      <div className="report-template-grid">{templates.map(({icon:Icon,...template})=><button key={`${template.reportType}-${template.format}`} onClick={()=>useTemplate(template)}><span><Icon size={23}/></span><strong>{template.name}</strong><p>{template.text}</p><em>{formatLabels[template.format]} · {reportTypeLabels[template.reportType]}</em></button>)}</div>
    </section>

    <section className="content-panel reports-history-card">
      <div className="content-toolbar">
        <div className="history-title"><h3>Hisobotlar tarixi</h3><p>Oldin yaratilgan fayllarni qayta yuklab oling</p></div>
        <div className="filter-group">
          <label><select value={filters.reportType} onChange={(e)=>setFilters((f)=>({...f,reportType:e.target.value}))}><option value="">Barcha turlar</option>{Object.entries(reportTypeLabels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><ChevronDown size={14}/></label>
          <label><select value={filters.format} onChange={(e)=>setFilters((f)=>({...f,format:e.target.value}))}><option value="">Barcha formatlar</option>{Object.entries(formatLabels).map(([v,l])=><option value={v} key={v}>{l}</option>)}</select><ChevronDown size={14}/></label>
          <button className="icon-action" onClick={load} aria-label="Yangilash"><RefreshCw size={17} className={loading?'spin':''}/></button>
        </div>
      </div>
      <div className="report-list">
        {items.map((item)=><article key={item.id} className="report-row">
          <span className={`report-file-icon report-file-icon--${item.format}`}><FileIcon format={item.format}/></span>
          <div className="report-row__main"><strong>{item.name}</strong><small>{reportTypeLabels[item.reportType]} · {item.dateFrom} — {item.dateTo}</small></div>
          <span className={`format-badge format-badge--${item.format}`}>{item.format.toUpperCase()}</span>
          <div className="report-row__meta"><strong>{item.createdBy}</strong><small>{formatDate(item.createdAt)}</small></div>
          <div className="report-row__actions"><button className="button-download" disabled={downloading===item.id} onClick={()=>download(item)}><Download size={16}/>{downloading===item.id?'Tayyorlanmoqda':'Yuklash'}</button><button className="icon-action danger" onClick={()=>remove(item)}><Trash2 size={16}/></button></div>
        </article>)}
        {loading && <div className="table-state"><span className="spinner spinner--blue"/> Yuklanmoqda...</div>}
        {!loading && items.length===0 && <div className="empty-state"><span><FileBarChart size={27}/></span><h3>Hisobotlar hali yo‘q</h3><p>Yangi hisobot yarating yoki tayyor shablondan foydalaning.</p><button className="button-primary" onClick={()=>setModal({open:true,preset:null})}><Plus size={17}/> Hisobot yaratish</button></div>}
      </div>
    </section>

    <section className="report-help-card"><span><BarChart3 size={24}/></span><div><strong>Hisobotlar real analitika ma’lumotlaridan yaratiladi</strong><p>Analitika bo‘limiga kundalik natijalarni kiritsangiz, Excel va PDF fayllardagi ko‘rsatkichlar avtomatik yangilanadi.</p></div></section>

    <ReportFormModal open={modal.open} preset={modal.preset} metadata={metadata} saving={saving} onClose={()=>setModal({open:false,preset:null})} onSave={create}/>
  </div>;
}
