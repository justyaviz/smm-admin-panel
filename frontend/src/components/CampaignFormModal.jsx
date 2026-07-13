import { useEffect, useState } from 'react';
import { CalendarDays, Megaphone, Save, X } from 'lucide-react';
import { objectiveLabels, campaignStatusLabels } from '../data/marketing.js';

const emptyForm = {
  name: '', description: '', objective: 'promo', productDirection: '', managerId: '', status: 'draft',
  budget: '', spend: '', reach: '', impressions: '', clicks: '', videoViews: '', engagement: '', messages: '',
  salesCount: '', salesValue: '', startDate: '', endDate: '', platformIds: [], branchIds: [],
};

function toInput(item) {
  if (!item) return emptyForm;
  return {
    name: item.name || '', description: item.description || '', objective: item.objective || 'promo',
    productDirection: item.productDirection || '', managerId: item.manager?.id || '', status: item.status || 'draft',
    budget: item.budget ?? '', spend: item.spend ?? '', reach: item.reach ?? '', impressions: item.impressions ?? '',
    clicks: item.clicks ?? '', videoViews: item.videoViews ?? '', engagement: item.engagement ?? '', messages: item.messages ?? '',
    salesCount: item.salesCount ?? '', salesValue: item.salesValue ?? '', startDate: item.startDate?.slice(0, 10) || '',
    endDate: item.endDate?.slice(0, 10) || '', platformIds: (item.platforms || []).map((x) => Number(x.id)),
    branchIds: (item.branches || []).map((x) => Number(x.id)),
  };
}

function ChoiceGrid({ items, selected, onChange, color = false }) {
  const toggle = (id) => onChange(selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]);
  return <div className="choice-grid">{items.map((item) => {
    const id = Number(item.id);
    return <button key={id} type="button" className={`choice-chip ${selected.includes(id) ? 'choice-chip--active' : ''}`} onClick={() => toggle(id)}>
      {color && <i style={{ background: item.color }} />}{item.name}
    </button>;
  })}</div>;
}

export default function CampaignFormModal({ open, item, metadata, saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm(toInput(item)); setError(''); } }, [open, item]);
  if (!open) return null;

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Kampaniya nomini kiriting.');
    if (form.platformIds.length === 0) return setError('Kamida bitta platformani tanlang.');
    setError('');
    await onSave(form);
  };

  return <div className="modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form className="content-modal marketing-modal" onSubmit={submit}>
      <header className="modal-header"><div><span className="modal-icon"><Megaphone size={21} /></span><div><h2>{item ? 'Kampaniyani tahrirlash' : 'Yangi kampaniya'}</h2><p>Promo kampaniya va uning natijalarini boshqaring</p></div></div><button type="button" className="icon-button" onClick={onClose}><X size={21} /></button></header>
      <div className="form-grid">
        <label className="form-field form-field--wide"><span>Kampaniya nomi</span><input value={form.name} onChange={(e) => change('name', e.target.value)} placeholder="Masalan: Chilla yarmarkasi" /></label>
        <label className="form-field"><span>Maqsad</span><select value={form.objective} onChange={(e) => change('objective', e.target.value)}>{Object.entries(objectiveLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field"><span>Status</span><select value={form.status} onChange={(e) => change('status', e.target.value)}>{Object.entries(campaignStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="form-field"><span>Mahsulot / yo‘nalish</span><input value={form.productDirection} onChange={(e) => change('productDirection', e.target.value)} placeholder="Smartfon, konditsioner..." /></label>
        <label className="form-field"><span>Mas’ul</span><select value={form.managerId} onChange={(e) => change('managerId', e.target.value)}><option value="">Tanlanmagan</option>{metadata.users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.fullName}</option>)}</select></label>
        <label className="form-field"><span>Boshlanish sanasi</span><div className="field-with-icon"><CalendarDays size={17} /><input type="date" value={form.startDate} onChange={(e) => change('startDate', e.target.value)} /></div></label>
        <label className="form-field"><span>Tugash sanasi</span><div className="field-with-icon"><CalendarDays size={17} /><input type="date" value={form.endDate} onChange={(e) => change('endDate', e.target.value)} /></div></label>
        <div className="form-field form-field--wide"><span>Platformalar</span><ChoiceGrid items={metadata.platforms} selected={form.platformIds} onChange={(value) => change('platformIds', value)} color /></div>
        <div className="form-field form-field--wide"><span>Filiallar</span><ChoiceGrid items={metadata.branches} selected={form.branchIds} onChange={(value) => change('branchIds', value)} /></div>
        <label className="form-field form-field--wide"><span>Tavsif</span><textarea rows={3} value={form.description} onChange={(e) => change('description', e.target.value)} placeholder="Kampaniya mazmuni va asosiy taklif..." /></label>
        <div className="metrics-form form-field--wide">
          {[['budget','Byudjet (so‘m)'],['spend','Sarf (so‘m)'],['reach','Reach'],['impressions','Ko‘rishlar'],['clicks','Kliklar'],['videoViews','Video ko‘rishlar'],['engagement','Engagement'],['messages','Xabarlar'],['salesCount','Sotuvlar'],['salesValue','Sotuv qiymati']].map(([key,label]) => <label className="form-field" key={key}><span>{label}</span><input type="number" min="0" value={form[key]} onChange={(e) => change(key, e.target.value)} /></label>)}
        </div>
      </div>
      {error && <div className="form-error modal-error">{error}</div>}
      <footer className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving}><Save size={18} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}</button></footer>
    </form>
  </div>;
}
