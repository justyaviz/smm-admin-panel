import { useEffect, useState } from 'react';
import { Edit3, Save, X } from 'lucide-react';

export default function MediaEditModal({ item, folders, branches, saving, onClose, onSave }) {
  const [form, setForm] = useState({ displayName: '', description: '', altText: '', folderId: '', branchId: '', tags: '', status: 'active' });
  useEffect(() => {
    if (!item) return;
    setForm({
      displayName: item.displayName || '', description: item.description || '', altText: item.altText || '',
      folderId: item.folder?.id || '', branchId: item.branch?.id || '', tags: (item.tags || []).join(', '), status: item.status || 'active',
    });
  }, [item]);
  if (!item) return null;
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const submit = (event) => {
    event.preventDefault();
    onSave({
      displayName: form.displayName.trim(), description: form.description.trim(), altText: form.altText.trim(),
      folderId: form.folderId ? Number(form.folderId) : null, branchId: form.branchId ? Number(form.branchId) : null,
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean), status: form.status,
    });
  };
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}>
      <form className="content-modal media-edit-modal" onSubmit={submit}>
        <div className="modal-header"><div><span className="modal-icon"><Edit3 size={21}/></span><div><h2>Media ma’lumotlari</h2><p>Fayl nomi, papka va teglarni tahrirlang</p></div></div><button className="icon-button" type="button" onClick={onClose}><X size={21}/></button></div>
        <div className="form-grid">
          <label className="form-field form-field--wide"><span>Ko‘rinadigan nom *</span><input required value={form.displayName} onChange={(e) => change('displayName',e.target.value)} /></label>
          <label className="form-field"><span>Papka</span><select value={form.folderId} onChange={(e) => change('folderId',e.target.value)}><option value="">Asosiy kutubxona</option>{folders.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(e) => change('branchId',e.target.value)}><option value="">Umumiy</option>{branches.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
          <label className="form-field"><span>Status</span><select value={form.status} onChange={(e) => change('status',e.target.value)}><option value="active">Faol</option><option value="archived">Arxivlangan</option></select></label>
          <label className="form-field form-field--wide"><span>Tavsif</span><textarea rows={3} value={form.description} onChange={(e) => change('description',e.target.value)} /></label>
          <label className="form-field form-field--wide"><span>Alt matn</span><input value={form.altText} onChange={(e) => change('altText',e.target.value)} /></label>
          <label className="form-field form-field--wide"><span>Teglar</span><input value={form.tags} onChange={(e) => change('tags',e.target.value)} placeholder="aksiya, smartfon, filial" /></label>
        </div>
        <div className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving} type="submit"><Save size={18}/> {saving ? 'Saqlanmoqda...' : 'Saqlash'}</button></div>
      </form>
    </div>
  );
}
