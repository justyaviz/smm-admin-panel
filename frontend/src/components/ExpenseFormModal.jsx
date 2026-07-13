import { useEffect, useState } from 'react';
import { CircleDollarSign, Save, X } from 'lucide-react';

const today = new Date().toISOString().slice(0, 10);
const emptyForm = { title: '', description: '', categoryId: '', branchId: '', campaignId: '', amount: '', expenseDate: today, status: 'pending', paymentMethod: 'transfer', vendor: '', notes: '' };
function toForm(item) {
  if (!item) return { ...emptyForm, expenseDate: new Date().toISOString().slice(0, 10) };
  return { title: item.title || '', description: item.description || '', categoryId: item.categoryId || '', branchId: item.branchId || '', campaignId: item.campaignId || '', amount: item.amount || '', expenseDate: String(item.expenseDate || today).slice(0, 10), status: item.status || 'pending', paymentMethod: item.paymentMethod || 'transfer', vendor: item.vendor || '', notes: item.notes || '' };
}

export default function ExpenseFormModal({ open, item, categories, metadata, saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm(toForm(item)); setError(''); } }, [open, item]);
  if (!open) return null;
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (form.title.trim().length < 2) return setError('Xarajat nomini kiriting.');
    if (!form.categoryId) return setError('Xarajat kategoriyasini tanlang.');
    if (!Number(form.amount) || Number(form.amount) <= 0) return setError('Xarajat summasini to‘g‘ri kiriting.');
    setError('');
    await onSave({ ...form, categoryId: Number(form.categoryId), branchId: form.branchId ? Number(form.branchId) : null, campaignId: form.campaignId ? Number(form.campaignId) : null, amount: Number(form.amount), receiptMediaId: null });
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="content-modal expense-modal" onSubmit={submit}>
    <header className="modal-header"><div><span className="modal-icon"><CircleDollarSign size={21} /></span><div><h2>{item ? 'Xarajatni tahrirlash' : 'Yangi xarajat'}</h2><p>Summa, kategoriya va tasdiqlash holati</p></div></div><button type="button" className="icon-button" onClick={onClose}><X size={21} /></button></header>
    <div className="form-grid organization-form-grid">
      <label className="form-field form-field--wide"><span>Xarajat nomi</span><input value={form.title} onChange={(event) => change('title', event.target.value)} placeholder="Masalan: Meta Ads — Chilla yarmarkasi" /></label>
      <label className="form-field form-field--wide"><span>Tavsif</span><textarea rows={3} value={form.description} onChange={(event) => change('description', event.target.value)} placeholder="Xarajat nimaga va qaysi maqsadda qilindi..." /></label>
      <label className="form-field"><span>Kategoriya</span><select value={form.categoryId} onChange={(event) => change('categoryId', event.target.value)}><option value="">Tanlang</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="form-field"><span>Summa (so‘m)</span><input type="number" min="1" step="1000" value={form.amount} onChange={(event) => change('amount', event.target.value)} placeholder="1000000" /></label>
      <label className="form-field"><span>Sana</span><input type="date" value={form.expenseDate} onChange={(event) => change('expenseDate', event.target.value)} /></label>
      <label className="form-field"><span>To‘lov usuli</span><select value={form.paymentMethod} onChange={(event) => change('paymentMethod', event.target.value)}><option value="transfer">Bank o‘tkazmasi</option><option value="card">Karta</option><option value="corporate_card">Korporativ karta</option><option value="cash">Naqd</option><option value="other">Boshqa</option></select></label>
      <label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(event) => change('branchId', event.target.value)}><option value="">Umumiy / bosh ofis</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <label className="form-field"><span>Kampaniya</span><select value={form.campaignId} onChange={(event) => change('campaignId', event.target.value)}><option value="">Kampaniyasiz</option>{(metadata.campaigns || []).map((campaign) => <option key={campaign.id} value={campaign.id}>{campaign.name}</option>)}</select></label>
      <label className="form-field"><span>Yetkazib beruvchi / xizmat</span><input value={form.vendor} onChange={(event) => change('vendor', event.target.value)} placeholder="Meta, Canva, tipografiya..." /></label>
      <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => change('status', event.target.value)}><option value="draft">Draft</option><option value="pending">Tasdiq kutmoqda</option><option value="approved">Tasdiqlandi</option><option value="paid">To‘landi</option><option value="rejected">Rad etildi</option><option value="cancelled">Bekor qilindi</option></select></label>
      <label className="form-field form-field--wide"><span>Izoh</span><textarea rows={3} value={form.notes} onChange={(event) => change('notes', event.target.value)} placeholder="Chek, shartnoma yoki qo‘shimcha ma’lumot..." /></label>
    </div>
    {error && <div className="form-error modal-error">{error}</div>}
    <footer className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving}><Save size={18} />{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button></footer>
  </form></div>;
}
