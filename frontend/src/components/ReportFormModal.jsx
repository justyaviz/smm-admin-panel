import { useEffect, useState } from 'react';
import { FileBarChart, Save, X } from 'lucide-react';
import { formatLabels, monthRange, reportTypeLabels } from '../data/analytics.js';

export default function ReportFormModal({ open, preset, metadata, saving, onClose, onSave }) {
  const [form, setForm] = useState({ name: '', reportType: 'full', format: 'xlsx', ...monthRange(), platformId: '', branchId: '' });
  useEffect(() => {
    if (!open) return;
    const range = monthRange();
    setForm({
      name: preset?.name || `aloo SMM hisoboti — ${range.dateFrom.slice(0, 7)}`,
      reportType: preset?.reportType || 'full', format: preset?.format || 'xlsx',
      dateFrom: preset?.dateFrom || range.dateFrom, dateTo: preset?.dateTo || range.dateTo,
      platformId: preset?.platformId || '', branchId: preset?.branchId || '',
    });
  }, [open, preset]);
  if (!open) return null;
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const submit = (event) => {
    event.preventDefault();
    onSave({ ...form, platformId: form.platformId ? Number(form.platformId) : null, branchId: form.branchId ? Number(form.branchId) : null });
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="content-modal report-modal" onSubmit={submit}>
        <div className="modal-header"><div><span className="modal-icon"><FileBarChart size={21} /></span><div><h2>Yangi hisobot</h2><p>Davr, bo‘lim va fayl formatini tanlang</p></div></div><button className="icon-button" type="button" onClick={onClose}><X size={21} /></button></div>
        <div className="form-grid">
          <label className="form-field form-field--wide"><span>Hisobot nomi *</span><input required minLength={2} value={form.name} onChange={(e) => change('name', e.target.value)} /></label>
          <label className="form-field"><span>Hisobot turi</span><select value={form.reportType} onChange={(e) => change('reportType', e.target.value)}>{Object.entries(reportTypeLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="form-field"><span>Fayl formati</span><select value={form.format} onChange={(e) => change('format', e.target.value)}>{Object.entries(formatLabels).map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="form-field"><span>Boshlanish sanasi</span><input required type="date" value={form.dateFrom} onChange={(e) => change('dateFrom', e.target.value)} /></label>
          <label className="form-field"><span>Tugash sanasi</span><input required type="date" value={form.dateTo} min={form.dateFrom} onChange={(e) => change('dateTo', e.target.value)} /></label>
          <label className="form-field"><span>Platforma</span><select value={form.platformId} onChange={(e) => change('platformId', e.target.value)}><option value="">Barcha platformalar</option>{metadata.platforms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(e) => change('branchId', e.target.value)}><option value="">Barcha filiallar</option>{metadata.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
        </div>
        <div className="report-format-note"><strong>{formatLabels[form.format]}</strong><span>Hisobot serverda real ma’lumotlardan hosil qilinadi va darhol yuklab olinadi.</span></div>
        <div className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving} type="submit"><Save size={18} /> {saving ? 'Tayyorlanmoqda...' : 'Hisobot yaratish'}</button></div>
      </form>
    </div>
  );
}
