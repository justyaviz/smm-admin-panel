import { useEffect, useState } from 'react';
import { ClipboardCheck, Save, X } from 'lucide-react';

const emptyForm = {
  title: '', description: '', status: 'todo', priority: 'medium', branchId: '', assignedTo: '',
  campaignId: '', contentId: '', startAt: '', dueAt: '', estimatedMinutes: 0, spentMinutes: 0, tagsText: '',
};

function toInputDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function toForm(item) {
  if (!item) return emptyForm;
  return {
    title: item.title || '', description: item.description || '', status: item.status || 'todo', priority: item.priority || 'medium',
    branchId: item.branchId || '', assignedTo: item.assignedTo || '', campaignId: item.campaignId || '', contentId: item.contentId || '',
    startAt: toInputDate(item.startAt), dueAt: toInputDate(item.dueAt), estimatedMinutes: item.estimatedMinutes || 0,
    spentMinutes: item.spentMinutes || 0, tagsText: (item.tags || []).join(', '),
  };
}

export default function TaskFormModal({ open, item, metadata, saving, onClose, onSave }) {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  useEffect(() => { if (open) { setForm(toForm(item)); setError(''); } }, [open, item]);
  if (!open) return null;

  const change = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    if (form.title.trim().length < 2) return setError('Vazifa nomini kiriting.');
    if (form.startAt && form.dueAt && new Date(form.dueAt) < new Date(form.startAt)) return setError('Tugash vaqti boshlanish vaqtidan oldin bo‘lishi mumkin emas.');
    setError('');
    await onSave({
      ...form,
      branchId: form.branchId ? Number(form.branchId) : null,
      assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
      campaignId: form.campaignId ? Number(form.campaignId) : null,
      contentId: form.contentId ? Number(form.contentId) : null,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      dueAt: form.dueAt ? new Date(form.dueAt).toISOString() : null,
      estimatedMinutes: Number(form.estimatedMinutes || 0),
      spentMinutes: Number(form.spentMinutes || 0),
      tags: form.tagsText.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
  };

  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <form className="content-modal task-modal" onSubmit={submit}>
      <header className="modal-header"><div><span className="modal-icon"><ClipboardCheck size={21} /></span><div><h2>{item ? 'Vazifani tahrirlash' : 'Yangi vazifa'}</h2><p>Mas’ul, muddat va ustuvorlikni belgilang</p></div></div><button type="button" className="icon-button" onClick={onClose}><X size={21} /></button></header>
      <div className="form-grid organization-form-grid">
        <label className="form-field form-field--wide"><span>Vazifa nomi</span><input value={form.title} onChange={(event) => change('title', event.target.value)} placeholder="Masalan: Chirchiq uchun Reels cover tayyorlash" /></label>
        <label className="form-field form-field--wide"><span>Tavsif</span><textarea rows={4} value={form.description} onChange={(event) => change('description', event.target.value)} placeholder="Vazifa tafsilotlari va kutilgan natija..." /></label>
        <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => change('status', event.target.value)}><option value="backlog">Backlog</option><option value="todo">Bajarish kerak</option><option value="in_progress">Jarayonda</option><option value="review">Tekshiruvda</option><option value="done">Bajarildi</option><option value="cancelled">Bekor qilindi</option></select></label>
        <label className="form-field"><span>Ustuvorlik</span><select value={form.priority} onChange={(event) => change('priority', event.target.value)}><option value="low">Past</option><option value="medium">O‘rta</option><option value="high">Yuqori</option><option value="urgent">Shoshilinch</option></select></label>
        <label className="form-field"><span>Mas’ul xodim</span><select value={form.assignedTo} onChange={(event) => change('assignedTo', event.target.value)}><option value="">Biriktirilmagan</option>{metadata.users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select></label>
        <label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(event) => change('branchId', event.target.value)}><option value="">Umumiy</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <label className="form-field"><span>Boshlanish vaqti</span><input type="datetime-local" value={form.startAt} onChange={(event) => change('startAt', event.target.value)} /></label>
        <label className="form-field"><span>Deadline</span><input type="datetime-local" value={form.dueAt} onChange={(event) => change('dueAt', event.target.value)} /></label>
        <label className="form-field"><span>Taxminiy vaqt (daqiqa)</span><input type="number" min="0" value={form.estimatedMinutes} onChange={(event) => change('estimatedMinutes', event.target.value)} /></label>
        <label className="form-field"><span>Sarflangan vaqt (daqiqa)</span><input type="number" min="0" value={form.spentMinutes} onChange={(event) => change('spentMinutes', event.target.value)} /></label>
        <label className="form-field form-field--wide"><span>Teglar</span><input value={form.tagsText} onChange={(event) => change('tagsText', event.target.value)} placeholder="reels, chirchiq, chilla-yarmarkasi" /></label>
      </div>
      {error && <div className="form-error modal-error">{error}</div>}
      <footer className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving}><Save size={18} />{saving ? 'Saqlanmoqda...' : 'Saqlash'}</button></footer>
    </form>
  </div>;
}
