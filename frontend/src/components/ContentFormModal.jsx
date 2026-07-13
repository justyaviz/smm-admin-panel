import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Image as ImageIcon, Save, X } from 'lucide-react';
import { statusLabels, typeLabels } from '../data/navigation.js';

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const initialState = {
  title: '', description: '', contentType: 'post', platformId: '', branchId: '', assignedTo: '',
  status: 'draft', publishAt: '', coverUrl: '', notes: '', tags: '',
};

export default function ContentFormModal({ item, metadata, presetDate, onClose, onSave, saving }) {
  const [form, setForm] = useState(initialState);
  const title = item?.id ? 'Kontentni tahrirlash' : 'Yangi kontent';

  useEffect(() => {
    const firstPlatform = metadata.platforms?.[0]?.id || '';
    if (item) {
      setForm({
        title: item.title || '',
        description: item.description || '',
        contentType: item.contentType || 'post',
        platformId: item.platform?.id || firstPlatform,
        branchId: item.branch?.id || '',
        assignedTo: item.assignee?.id || '',
        status: item.status || 'draft',
        publishAt: toLocalInput(item.publishAt),
        coverUrl: item.coverUrl || '',
        notes: item.notes || '',
        tags: (item.tags || []).join(', '),
      });
    } else {
      setForm({ ...initialState, platformId: firstPlatform, assignedTo: metadata.users?.[0]?.id || '', publishAt: presetDate ? toLocalInput(presetDate) : '' });
    }
  }, [item, metadata, presetDate]);

  const previewColor = useMemo(() => metadata.platforms?.find((platform) => Number(platform.id) === Number(form.platformId))?.color || '#1690F5', [metadata.platforms, form.platformId]);
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  const submit = (event) => {
    event.preventDefault();
    onSave({
      title: form.title.trim(),
      description: form.description.trim(),
      contentType: form.contentType,
      platformId: Number(form.platformId),
      branchId: form.branchId ? Number(form.branchId) : null,
      assignedTo: form.assignedTo ? Number(form.assignedTo) : null,
      status: form.status,
      publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      coverUrl: form.coverUrl.trim() || null,
      notes: form.notes.trim(),
      tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="content-modal" onSubmit={submit}>
        <div className="modal-header">
          <div><span className="modal-icon"><ImageIcon size={21} /></span><div><h2>{title}</h2><p>Kontent ma’lumotlarini to‘liq kiriting</p></div></div>
          <button className="icon-button" type="button" onClick={onClose}><X size={21} /></button>
        </div>

        <div className="form-grid">
          <label className="form-field form-field--wide"><span>Sarlavha *</span><input required minLength={2} maxLength={220} value={form.title} onChange={(event) => change('title', event.target.value)} placeholder="Masalan: Chilla yarmarkasi reels" /></label>
          <label className="form-field form-field--wide"><span>Tavsif / caption</span><textarea rows={4} value={form.description} onChange={(event) => change('description', event.target.value)} placeholder="Post matni, CTA va muhim izohlar..." /></label>
          <label className="form-field"><span>Kontent turi *</span><select value={form.contentType} onChange={(event) => change('contentType', event.target.value)}>{Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="form-field"><span>Platforma *</span><select required value={form.platformId} onChange={(event) => change('platformId', event.target.value)}>{metadata.platforms.map((platform) => <option key={platform.id} value={platform.id}>{platform.name}</option>)}</select></label>
          <label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(event) => change('branchId', event.target.value)}><option value="">Umumiy / barcha filiallar</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
          <label className="form-field"><span>Mas’ul xodim</span><select value={form.assignedTo} onChange={(event) => change('assignedTo', event.target.value)}><option value="">Belgilanmagan</option>{metadata.users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select></label>
          <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => change('status', event.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="form-field"><span>Nashr sanasi va vaqti</span><div className="field-with-icon"><CalendarDays size={17} /><input type="datetime-local" value={form.publishAt} onChange={(event) => change('publishAt', event.target.value)} /></div></label>
          <label className="form-field form-field--wide"><span>Cover / fayl URL</span><input type="url" value={form.coverUrl} onChange={(event) => change('coverUrl', event.target.value)} placeholder="https://..." /></label>
          <label className="form-field form-field--wide"><span>Teglar</span><input value={form.tags} onChange={(event) => change('tags', event.target.value)} placeholder="aksiya, smartfon, chirchiq" /><small>Vergul bilan ajrating</small></label>
          <label className="form-field form-field--wide"><span>Ichki izoh</span><textarea rows={2} value={form.notes} onChange={(event) => change('notes', event.target.value)} placeholder="Jamoa uchun izoh..." /></label>
        </div>

        <div className="modal-preview"><i style={{ background: previewColor }} /><span>{metadata.platforms.find((platform) => Number(platform.id) === Number(form.platformId))?.name || 'Platforma'} · {typeLabels[form.contentType]} · {statusLabels[form.status]}</span></div>
        <div className="modal-actions"><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving} type="submit"><Save size={18} /> {saving ? 'Saqlanmoqda...' : 'Saqlash'}</button></div>
      </form>
    </div>
  );
}
