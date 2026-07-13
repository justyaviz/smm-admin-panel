import { useEffect, useState } from 'react';
import { Save, WalletCards, X } from 'lucide-react';

export default function BudgetFormModal({ open, month, branches, categories, saving, onClose, onSave }) {
  const [form, setForm] = useState({ month, amount: '', branchId: '', categoryId: '', notes: '' });
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm({ month, amount: '', branchId: '', categoryId: '', notes: '' }); setError(''); } }, [open, month]);
  if (!open) return null;
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (Number(form.amount) < 0 || form.amount === '') return setError('Byudjet summasini kiriting.');
    setError('');
    await onSave({ ...form, amount: Number(form.amount), branchId: form.branchId ? Number(form.branchId) : null, categoryId: form.categoryId ? Number(form.categoryId) : null });
  };
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="content-modal budget-modal" onSubmit={submit}>
    <header className="modal-header"><div><span className="modal-icon"><WalletCards size={21} /></span><div><h2>Oylik byudjet</h2><p>Umumiy, filial yoki kategoriya limiti</p></div></div><button type="button" className="icon-button" onClick={onClose}><X size={21} /></button></header>
    <div className="form-grid organization-form-grid">
      <label className="form-field"><span>Oy</span><input type="month" value={form.month} onChange={(event) => change('month', event.target.value)} /></label>
      <label className="form-field"><span>Byudjet summasi</span><input type="number" min="0" step="1000" value={form.amount} onChange={(event) => change('amount', event.target.value)} placeholder="50000000" /></label>
      <label className="form-field"><span>Filial (ixtiyoriy)</span><select value={form.branchId} onChange={(event) => change('branchId', event.target.value)}><option value="">Barcha filiallar</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
      <label className="form-field"><span>Kategoriya (ixtiyoriy)</span><select value={form.categoryId} onChange={(event) => change('categoryId', event.target.value)}><option value="">Barcha kategoriyalar</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
      <label className="form-field form-field--wide"><span>Izoh</span><textarea rows={3} value={form.notes} onChange={(event) => change('notes', event.target.value)} placeholder="Byudjet bo‘yicha eslatma..." /></label>
    </div>{error && <div className="form-error modal-error">{error}</div>}<footer className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving}><Save size={18} />{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button></footer>
  </form></div>;
}
