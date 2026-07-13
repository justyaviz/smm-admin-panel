import { useEffect, useState } from 'react';
import { CalendarDays, Save, Target, X } from 'lucide-react';
import { adStatusLabels, objectiveLabels } from '../data/marketing.js';

const emptyForm = {
  name: '', campaignId: '', platformId: '', branchId: '', objective: 'messages', audience: '', placement: 'Automatic placements',
  externalId: '', status: 'draft', dailyBudget: '', totalBudget: '', spend: '', impressions: '', reach: '', clicks: '',
  messages: '', salesCount: '', startDate: '', endDate: '',
};

function toInput(item) {
  if (!item) return emptyForm;
  return {
    name: item.name || '', campaignId: item.campaign?.id || '', platformId: item.platform?.id || '', branchId: item.branch?.id || '',
    objective: item.objective || 'messages', audience: item.audience || '', placement: item.placement || 'Automatic placements',
    externalId: item.externalId || '', status: item.status || 'draft', dailyBudget: item.dailyBudget ?? '', totalBudget: item.totalBudget ?? '',
    spend: item.spend ?? '', impressions: item.impressions ?? '', reach: item.reach ?? '', clicks: item.clicks ?? '',
    messages: item.messages ?? '', salesCount: item.salesCount ?? '', startDate: item.startDate?.slice(0, 10) || '', endDate: item.endDate?.slice(0, 10) || '',
  };
}

export default function AdFormModal({ open, item, metadata, campaigns, saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm(toInput(item)); setError(''); } }, [open, item]);
  if (!open) return null;
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Reklama nomini kiriting.');
    if (!form.platformId) return setError('Platformani tanlang.');
    setError('');
    await onSave(form);
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form className="content-modal marketing-modal" onSubmit={submit}>
      <header className="modal-header"><div><span className="modal-icon"><Target size={21} /></span><div><h2>{item ? 'Reklamani tahrirlash' : 'Yangi target reklama'}</h2><p>Byudjet, auditoriya va natijalarni kiriting</p></div></div><button type="button" className="icon-button" onClick={onClose}><X size={21} /></button></header>
      <div className="form-grid">
        <label className="form-field form-field--wide"><span>Reklama nomi</span><input value={form.name} onChange={(e) => change('name', e.target.value)} placeholder="Masalan: Chirchiq smartfon target" /></label>
        <label className="form-field"><span>Kampaniya</span><select value={form.campaignId} onChange={(e) => change('campaignId', e.target.value)}><option value="">Alohida reklama</option>{campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="form-field"><span>Platforma</span><select value={form.platformId} onChange={(e) => change('platformId', e.target.value)}><option value="">Tanlang</option>{metadata.platforms.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
        <label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(e) => change('branchId', e.target.value)}><option value="">Umumiy</option>{metadata.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label className="form-field"><span>Maqsad</span><select value={form.objective} onChange={(e) => change('objective', e.target.value)}>{Object.entries(objectiveLabels).filter(([key]) => key !== 'promo').map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field"><span>Status</span><select value={form.status} onChange={(e) => change('status', e.target.value)}>{Object.entries(adStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field"><span>Placement</span><input value={form.placement} onChange={(e) => change('placement', e.target.value)} /></label>
        <label className="form-field"><span>Tashqi ID</span><input value={form.externalId} onChange={(e) => change('externalId', e.target.value)} placeholder="Meta Ad ID (ixtiyoriy)" /></label>
        <label className="form-field form-field--wide"><span>Auditoriya</span><textarea rows={2} value={form.audience} onChange={(e) => change('audience', e.target.value)} placeholder="18–45 yosh, Toshkent viloyati, texnika xaridorlari..." /></label>
        <label className="form-field"><span>Boshlanish sanasi</span><div className="field-with-icon"><CalendarDays size={17} /><input type="date" value={form.startDate} onChange={(e) => change('startDate', e.target.value)} /></div></label>
        <label className="form-field"><span>Tugash sanasi</span><div className="field-with-icon"><CalendarDays size={17} /><input type="date" value={form.endDate} onChange={(e) => change('endDate', e.target.value)} /></div></label>
        <div className="metrics-form form-field--wide">
          {[['dailyBudget','Kunlik byudjet'],['totalBudget','Umumiy byudjet'],['spend','Sarf'],['impressions','Ko‘rishlar'],['reach','Reach'],['clicks','Kliklar'],['messages','Xabarlar'],['salesCount','Sotuvlar']].map(([key,label]) => <label className="form-field" key={key}><span>{label}</span><input type="number" min="0" value={form[key]} onChange={(e) => change(key, e.target.value)} /></label>)}
        </div>
      </div>
      {error && <div className="form-error modal-error">{error}</div>}
      <footer className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving}><Save size={18} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}</button></footer>
    </form>
  </div>;
}
