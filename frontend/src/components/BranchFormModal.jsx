import { useEffect, useState } from 'react';
import { Building2, Save, X } from 'lucide-react';

const emptyForm = {
  name: '', code: '', region: '', address: '', phone: '', managerName: '', managerPhone: '',
  monthlyContentTarget: 30, monthlyReachTarget: 100000, notes: '', isActive: true,
};

function toForm(item) {
  if (!item) return emptyForm;
  return {
    name: item.name || '', code: item.code || '', region: item.region || '', address: item.address || '',
    phone: item.phone || '', managerName: item.managerName || '', managerPhone: item.managerPhone || '',
    monthlyContentTarget: item.monthlyContentTarget ?? 30, monthlyReachTarget: item.monthlyReachTarget ?? 100000,
    notes: item.notes || '', isActive: item.isActive !== false,
  };
}

export default function BranchFormModal({ open, item, saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm(toForm(item)); setError(''); } }, [open, item]);
  if (!open) return null;
  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2) return setError('Filial nomini kiriting.');
    setError('');
    await onSave({ ...form, monthlyContentTarget: Number(form.monthlyContentTarget || 0), monthlyReachTarget: Number(form.monthlyReachTarget || 0) });
  };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <form className="content-modal organization-modal" onSubmit={submit}>
      <header className="modal-header"><div><span className="modal-icon"><Building2 size={21}/></span><div><h2>{item ? 'Filialni tahrirlash' : 'Yangi filial'}</h2><p>Filial ma’lumotlari va oylik maqsadlarini boshqaring</p></div></div><button type="button" className="icon-button" onClick={onClose}><X size={21}/></button></header>
      <div className="form-grid organization-form-grid">
        <label className="form-field"><span>Filial nomi</span><input value={form.name} onChange={(e) => change('name', e.target.value)} placeholder="Masalan: Chirchiq"/></label>
        <label className="form-field"><span>Kod</span><input value={form.code} onChange={(e) => change('code', e.target.value)} placeholder="chirchiq"/></label>
        <label className="form-field"><span>Viloyat / hudud</span><input value={form.region} onChange={(e) => change('region', e.target.value)} placeholder="Toshkent viloyati"/></label>
        <label className="form-field"><span>Telefon</span><input value={form.phone} onChange={(e) => change('phone', e.target.value)} placeholder="+998 90 000 00 00"/></label>
        <label className="form-field form-field--wide"><span>Manzil</span><input value={form.address} onChange={(e) => change('address', e.target.value)} placeholder="Filialning to‘liq manzili"/></label>
        <label className="form-field"><span>Filial rahbari</span><input value={form.managerName} onChange={(e) => change('managerName', e.target.value)} placeholder="Ism familiya"/></label>
        <label className="form-field"><span>Rahbar telefoni</span><input value={form.managerPhone} onChange={(e) => change('managerPhone', e.target.value)} placeholder="+998 90 000 00 00"/></label>
        <label className="form-field"><span>Oylik kontent maqsadi</span><input type="number" min="0" value={form.monthlyContentTarget} onChange={(e) => change('monthlyContentTarget', e.target.value)}/></label>
        <label className="form-field"><span>Oylik reach maqsadi</span><input type="number" min="0" value={form.monthlyReachTarget} onChange={(e) => change('monthlyReachTarget', e.target.value)}/></label>
        <label className="form-field form-field--wide"><span>Izoh</span><textarea rows={3} value={form.notes} onChange={(e) => change('notes', e.target.value)} placeholder="Filial haqida qo‘shimcha ma’lumot..."/></label>
        <label className="organization-switch form-field--wide"><input type="checkbox" checked={form.isActive} onChange={(e) => change('isActive', e.target.checked)}/><span/><div><strong>Filial faol</strong><small>Faol filial kontent va hisobotlarda ko‘rinadi</small></div></label>
      </div>
      {error && <div className="form-error modal-error">{error}</div>}
      <footer className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving}><Save size={18}/>{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button></footer>
    </form>
  </div>;
}
