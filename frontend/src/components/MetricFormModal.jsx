import { useEffect, useState } from 'react';
import { BarChart3, Save, X } from 'lucide-react';
import { todayString } from '../data/analytics.js';

const blank = {
  metricDate: todayString(), platformId: '', branchId: '', campaignId: '', adId: '',
  reach: 0, impressions: 0, clicks: 0, engagement: 0, messages: 0, videoViews: 0,
  followersGained: 0, leads: 0, salesCount: 0, salesValue: 0, spend: 0, notes: '',
};

export default function MetricFormModal({ open, item, metadata, campaigns, ads, saving, onClose, onSave }) {
  const [form, setForm] = useState(blank);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setForm({
        metricDate: String(item.metricDate || todayString()).slice(0, 10),
        platformId: item.platform?.id || '', branchId: item.branch?.id || '', campaignId: item.campaign?.id || '', adId: item.ad?.id || '',
        reach: item.reach || 0, impressions: item.impressions || 0, clicks: item.clicks || 0,
        engagement: item.engagement || 0, messages: item.messages || 0, videoViews: item.videoViews || 0,
        followersGained: item.followersGained || 0, leads: item.leads || 0, salesCount: item.salesCount || 0,
        salesValue: item.salesValue || 0, spend: item.spend || 0, notes: item.notes || '',
      });
    } else setForm({ ...blank, platformId: metadata.platforms?.[0]?.id || '' });
  }, [open, item, metadata.platforms]);

  if (!open) return null;
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const number = (name) => ({ value: form[name], onChange: (event) => change(name, event.target.value), min: 0, type: 'number' });
  const submit = (event) => {
    event.preventDefault();
    onSave({
      ...form,
      platformId: form.platformId ? Number(form.platformId) : null,
      branchId: form.branchId ? Number(form.branchId) : null,
      campaignId: form.campaignId ? Number(form.campaignId) : null,
      adId: form.adId ? Number(form.adId) : null,
      reach: Number(form.reach || 0), impressions: Number(form.impressions || 0), clicks: Number(form.clicks || 0),
      engagement: Number(form.engagement || 0), messages: Number(form.messages || 0), videoViews: Number(form.videoViews || 0),
      followersGained: Number(form.followersGained || 0), leads: Number(form.leads || 0), salesCount: Number(form.salesCount || 0),
      salesValue: Number(form.salesValue || 0), spend: Number(form.spend || 0), notes: form.notes.trim(),
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="content-modal analytics-modal" onSubmit={submit}>
        <div className="modal-header">
          <div><span className="modal-icon"><BarChart3 size={21} /></span><div><h2>{item ? 'Natijani tahrirlash' : 'Kundalik natija qo‘shish'}</h2><p>Platforma, filial va reklama ko‘rsatkichlarini kiriting</p></div></div>
          <button className="icon-button" type="button" onClick={onClose}><X size={21} /></button>
        </div>
        <div className="form-grid">
          <label className="form-field"><span>Sana *</span><input required type="date" value={form.metricDate} onChange={(e) => change('metricDate', e.target.value)} /></label>
          <label className="form-field"><span>Platforma</span><select value={form.platformId} onChange={(e) => change('platformId', e.target.value)}><option value="">Umumiy</option>{metadata.platforms.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(e) => change('branchId', e.target.value)}><option value="">Umumiy</option>{metadata.branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="form-field"><span>Kampaniya</span><select value={form.campaignId} onChange={(e) => change('campaignId', e.target.value)}><option value="">Biriktirilmagan</option>{campaigns.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="form-field form-field--wide"><span>Target reklama</span><select value={form.adId} onChange={(e) => change('adId', e.target.value)}><option value="">Biriktirilmagan</option>{ads.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <div className="metrics-form analytics-metrics-form">
            <label className="form-field"><span>Reach</span><input {...number('reach')} /></label>
            <label className="form-field"><span>Impressions</span><input {...number('impressions')} /></label>
            <label className="form-field"><span>Kliklar</span><input {...number('clicks')} /></label>
            <label className="form-field"><span>Engagement</span><input {...number('engagement')} /></label>
            <label className="form-field"><span>Xabarlar</span><input {...number('messages')} /></label>
            <label className="form-field"><span>Video ko‘rishlar</span><input {...number('videoViews')} /></label>
            <label className="form-field"><span>Yangi obunachi</span><input {...number('followersGained')} /></label>
            <label className="form-field"><span>Leadlar</span><input {...number('leads')} /></label>
            <label className="form-field"><span>Sotuvlar</span><input {...number('salesCount')} /></label>
            <label className="form-field"><span>Sotuv qiymati</span><input {...number('salesValue')} /></label>
            <label className="form-field"><span>Sarf</span><input {...number('spend')} /></label>
          </div>
          <label className="form-field form-field--wide"><span>Izoh</span><textarea rows={2} value={form.notes} onChange={(e) => change('notes', e.target.value)} placeholder="Kreativ, auditoriya yoki natija haqida izoh..." /></label>
        </div>
        <div className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving} type="submit"><Save size={18} /> {saving ? 'Saqlanmoqda...' : 'Natijani saqlash'}</button></div>
      </form>
    </div>
  );
}
