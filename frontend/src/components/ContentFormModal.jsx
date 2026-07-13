import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronDown,
  Clock3,
  Image as ImageIcon,
  Save,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';
import { statusLabels, typeLabels } from '../data/navigation.js';

function toLocalInput(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function quickDate(dayOffset, hour) {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, 0, 0, 0);
  return toLocalInput(date);
}

const initialState = {
  title: '', description: '', contentType: 'post', platformId: '', branchId: '', assignedTo: '',
  status: 'draft', publishAt: '', coverUrl: '', notes: '', tags: '',
};

const popularTypes = ['post', 'reels', 'story', 'carousel', 'video', 'banner'];

export default function ContentFormModal({ item, metadata, presetDate, onClose, onSave, saving }) {
  const [form, setForm] = useState(initialState);
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(item?.id));
  const modalTitle = item?.id ? 'Kontentni tahrirlash' : 'Tezkor kontent yaratish';

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
      setAdvancedOpen(true);
    } else {
      setForm({
        ...initialState,
        platformId: firstPlatform,
        assignedTo: metadata.users?.[0]?.id || '',
        publishAt: presetDate ? toLocalInput(presetDate) : '',
      });
      setAdvancedOpen(false);
    }
  }, [item, metadata, presetDate]);

  const selectedPlatform = useMemo(
    () => metadata.platforms?.find((platform) => Number(platform.id) === Number(form.platformId)),
    [metadata.platforms, form.platformId],
  );
  const previewColor = selectedPlatform?.color || '#1690F5';
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
    <div className="modal-backdrop premium-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="content-modal content-modal--quick" onSubmit={submit}>
        <div className="modal-header premium-modal-header">
          <div>
            <span className="modal-icon"><Sparkles size={22} /></span>
            <div>
              <h2>{modalTitle}</h2>
              <p>Asosiy 4 ta maydonni kiriting — qolganlari ixtiyoriy</p>
            </div>
          </div>
          <button className="icon-button modal-close-button" type="button" onClick={onClose} aria-label="Yopish"><X size={22} /></button>
        </div>

        <div className="content-wizard-steps" aria-hidden="true">
          <span className="active"><b>1</b> G‘oya</span>
          <i />
          <span className="active"><b>2</b> Format</span>
          <i />
          <span className={form.publishAt ? 'active' : ''}><b>3</b> Vaqt</span>
          <i />
          <span><b>4</b> Tayyor</span>
        </div>

        <div className="quick-content-layout">
          <div className="quick-content-form">
            <section className="quick-form-section">
              <div className="quick-section-heading">
                <span>01</span>
                <div><h3>Kontent g‘oyasi</h3><p>Nima e’lon qilmoqchisiz?</p></div>
              </div>
              <label className="form-field form-field--hero">
                <span>Sarlavha *</span>
                <input required minLength={2} maxLength={220} autoFocus value={form.title} onChange={(event) => change('title', event.target.value)} placeholder="Masalan: Chilla yarmarkasi — konditsionerlar" />
                <small>{form.title.length}/220</small>
              </label>
              <label className="form-field">
                <span>Caption yoki qisqa izoh</span>
                <textarea rows={4} value={form.description} onChange={(event) => change('description', event.target.value)} placeholder="Post matni, CTA yoki jamoaga qisqa tushuntirish..." />
              </label>
            </section>

            <section className="quick-form-section">
              <div className="quick-section-heading">
                <span>02</span>
                <div><h3>Format va platforma</h3><p>Bir bosishda tanlang</p></div>
              </div>
              <div className="quick-label">Kontent turi</div>
              <div className="choice-chip-grid choice-chip-grid--types">
                {popularTypes.map((value) => (
                  <button key={value} type="button" className={form.contentType === value ? 'selected' : ''} onClick={() => change('contentType', value)}>
                    <ImageIcon size={18} />
                    <span>{typeLabels[value]}</span>
                  </button>
                ))}
              </div>

              <div className="quick-label quick-label--spaced">Platforma *</div>
              <div className="choice-chip-grid choice-chip-grid--platforms">
                {metadata.platforms.map((platform) => (
                  <button key={platform.id} type="button" className={Number(form.platformId) === Number(platform.id) ? 'selected' : ''} onClick={() => change('platformId', platform.id)}>
                    <i style={{ background: platform.color }} />
                    <span>{platform.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="quick-form-section">
              <div className="quick-section-heading">
                <span>03</span>
                <div><h3>Nashr vaqti</h3><p>Sana shart emas — draft sifatida ham saqlanadi</p></div>
              </div>
              <label className="form-field">
                <span>Sana va vaqt</span>
                <div className="field-with-icon premium-date-field"><CalendarDays size={19} /><input type="datetime-local" value={form.publishAt} onChange={(event) => change('publishAt', event.target.value)} /></div>
              </label>
              <div className="quick-time-presets">
                <button type="button" onClick={() => change('publishAt', quickDate(0, 18))}><Clock3 size={15} /> Bugun 18:00</button>
                <button type="button" onClick={() => change('publishAt', quickDate(1, 12))}><Clock3 size={15} /> Ertaga 12:00</button>
                <button type="button" onClick={() => change('publishAt', '')}>Sanasiz draft</button>
              </div>
            </section>

            <section className={`advanced-content-section ${advancedOpen ? 'open' : ''}`}>
              <button className="advanced-toggle" type="button" onClick={() => setAdvancedOpen((value) => !value)}>
                <span><SlidersHorizontal size={18} /> Qo‘shimcha sozlamalar</span>
                <small>Filial, mas’ul, status, cover va teglar</small>
                <ChevronDown size={19} />
              </button>
              {advancedOpen && (
                <div className="advanced-form-grid">
                  <label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(event) => change('branchId', event.target.value)}><option value="">Umumiy / barcha filiallar</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                  <label className="form-field"><span>Mas’ul xodim</span><select value={form.assignedTo} onChange={(event) => change('assignedTo', event.target.value)}><option value="">Belgilanmagan</option>{metadata.users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select></label>
                  <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => change('status', event.target.value)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="form-field"><span>Cover / fayl URL</span><input type="url" value={form.coverUrl} onChange={(event) => change('coverUrl', event.target.value)} placeholder="https://..." /></label>
                  <label className="form-field form-field--wide"><span>Teglar</span><input value={form.tags} onChange={(event) => change('tags', event.target.value)} placeholder="aksiya, smartfon, chirchiq" /><small>Vergul bilan ajrating</small></label>
                  <label className="form-field form-field--wide"><span>Ichki izoh</span><textarea rows={2} value={form.notes} onChange={(event) => change('notes', event.target.value)} placeholder="Jamoa uchun izoh..." /></label>
                </div>
              )}
            </section>
          </div>

          <aside className="quick-content-preview">
            <div className="preview-topline"><span style={{ background: previewColor }} /> Jonli preview</div>
            <div className="social-preview-card">
              <header>
                <span className="preview-logo" style={{ background: previewColor }}>a</span>
                <div><strong>aloo</strong><small>{selectedPlatform?.name || 'Platforma'}</small></div>
                <b>•••</b>
              </header>
              <div className="preview-media" style={form.coverUrl ? { backgroundImage: `url(${form.coverUrl})` } : {}}>
                {!form.coverUrl && <><ImageIcon size={38} /><span>{typeLabels[form.contentType]}</span></>}
              </div>
              <div className="preview-copy">
                <strong>{form.title || 'Kontent sarlavhasi shu yerda ko‘rinadi'}</strong>
                <p>{form.description || 'Caption yoki qisqa izoh kiritilganda preview shu yerda yangilanadi.'}</p>
                <small>{form.publishAt ? new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(form.publishAt)) : 'Draft · sana belgilanmagan'}</small>
              </div>
            </div>
            <div className="preview-summary">
              <span><i style={{ background: previewColor }} />{selectedPlatform?.name || 'Platforma'}</span>
              <span>{typeLabels[form.contentType]}</span>
              <span>{statusLabels[form.status]}</span>
            </div>
          </aside>
        </div>

        <div className="modal-actions premium-modal-actions">
          <div><strong>Faqat sarlavha, format va platforma majburiy.</strong><small>Qolgan ma’lumotlarni keyin ham to‘ldirish mumkin.</small></div>
          <button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button>
          <button className="button-primary button-primary--large" disabled={saving || !form.platformId} type="submit"><Save size={19} /> {saving ? 'Saqlanmoqda...' : item?.id ? 'O‘zgarishlarni saqlash' : 'Kontentni yaratish'}</button>
        </div>
      </form>
    </div>
  );
}
