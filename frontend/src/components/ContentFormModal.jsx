import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays, Check, ChevronDown, Clock3, Cloud, Image as ImageIcon, Save,
  SlidersHorizontal, Sparkles, WandSparkles, X,
} from 'lucide-react';
import { statusLabels, typeLabels } from '../data/navigation.js';
import { apiRequest, authHeaders, resolveApiUrl } from '../lib/api.js';

const DRAFT_KEY = 'aloo_content_autosave_v10';

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
  title: '', description: '', contentType: 'post', platformId: '', branchId: '', assignedTo: '', templateId: '',
  status: 'draft', publishAt: '', coverUrl: '', coverMediaId: '', notes: '', tags: '',
};

const popularTypes = ['post', 'reels', 'story', 'carousel', 'video', 'banner'];

export default function ContentFormModal({ item, metadata, templates = [], presetDate, currentUser, sessionToken, onClose, onSave, saving }) {
  const [form, setForm] = useState(initialState);
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(item?.id));
  const [restored, setRestored] = useState(false);
  const [savedAt, setSavedAt] = useState(null);
  const [editingUsers, setEditingUsers] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
  const modalTitle = item?.id ? 'Kontentni tahrirlash' : 'Tezkor kontent yaratish';

  useEffect(() => {
    const firstPlatform = metadata.platforms?.[0]?.id || '';
    const defaultUser = metadata.users?.find((user) => Number(user.id) === Number(currentUser?.id))?.id || metadata.users?.[0]?.id || '';
    const defaultBranch = currentUser?.primaryBranchId || '';
    if (item) {
      setForm({
        title: item.title || '', description: item.description || '', contentType: item.contentType || 'post',
        platformId: item.platform?.id || firstPlatform, branchId: item.branch?.id || '', assignedTo: item.assignee?.id || '',
        templateId: item.templateId || '', status: item.status || 'draft', publishAt: toLocalInput(item.publishAt),
        coverUrl: item.coverUrl || '', coverMediaId: item.coverMediaId || '', notes: item.notes || '', tags: (item.tags || []).join(', '),
      });
      setAdvancedOpen(true);
      setRestored(false);
      return;
    }
    let local = null;
    try { local = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { local = null; }
    if (local?.title || local?.description) {
      setForm({ ...initialState, ...local, platformId: local.platformId || firstPlatform, assignedTo: local.assignedTo || defaultUser, branchId: local.branchId || defaultBranch, publishAt: presetDate ? toLocalInput(presetDate) : (local.publishAt || '') });
      setRestored(true);
    } else {
      setForm({ ...initialState, platformId: firstPlatform, assignedTo: defaultUser, branchId: defaultBranch, publishAt: presetDate ? toLocalInput(presetDate) : '' });
      setRestored(false);
    }
    setAdvancedOpen(false);
  }, [item, metadata, presetDate, currentUser]);

  useEffect(() => {
    if (item?.id) return undefined;
    const timer = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      setSavedAt(new Date());
    }, 550);
    return () => clearTimeout(timer);
  }, [form, item?.id]);

  useEffect(() => {
    if (!item?.id || !sessionToken) { setEditingUsers([]); return undefined; }
    let active = true;
    const headers = authHeaders(sessionToken);
    const sync = async (isActive = true) => {
      try {
        const result = await apiRequest('/api/realtime/editing', {
          method: 'POST',
          headers,
          body: JSON.stringify({ entityType: 'content', entityId: Number(item.id), active: isActive }),
        });
        if (active && isActive) setEditingUsers((result.editors || []).filter((user) => Number(user.id) !== Number(currentUser?.id)));
      } catch { /* presence asosiy tahrirlashni to‘xtatmasin */ }
    };
    const onPresence = (event) => {
      const payload = event.detail?.payload;
      if (payload?.entityType !== 'content' || Number(payload.entityId) !== Number(item.id) || Number(payload.user?.id) === Number(currentUser?.id)) return;
      setEditingUsers((current) => payload.active
        ? [...current.filter((user) => Number(user.id) !== Number(payload.user.id)), payload.user]
        : current.filter((user) => Number(user.id) !== Number(payload.user.id)));
    };
    window.addEventListener('aloo:realtime:presence.editing', onPresence);
    void sync(true);
    const heartbeat = setInterval(() => void sync(true), 25_000);
    return () => {
      active = false;
      clearInterval(heartbeat);
      window.removeEventListener('aloo:realtime:presence.editing', onPresence);
      void apiRequest('/api/realtime/editing', {
        method: 'POST', headers,
        body: JSON.stringify({ entityType: 'content', entityId: Number(item.id), active: false }),
      }).catch(() => {});
    };
  }, [item?.id, sessionToken, currentUser?.id]);

  useEffect(() => {
    if (!advancedOpen || !sessionToken || mediaItems.length) return undefined;
    let active = true;
    setMediaLoading(true);
    apiRequest('/api/media?mediaType=image&status=active&limit=8', { headers: authHeaders(sessionToken) })
      .then((result) => { if (active) setMediaItems(result.items || []); })
      .catch(() => {})
      .finally(() => { if (active) setMediaLoading(false); });
    return () => { active = false; };
  }, [advancedOpen, sessionToken, mediaItems.length]);

  const selectedPlatform = useMemo(() => metadata.platforms?.find((platform) => Number(platform.id) === Number(form.platformId)), [metadata.platforms, form.platformId]);
  const selectedMedia = useMemo(() => mediaItems.find((media) => Number(media.id) === Number(form.coverMediaId)) || (Number(item?.coverMedia?.id) === Number(form.coverMediaId) ? item.coverMedia : null), [mediaItems, form.coverMediaId, item?.coverMedia]);
  const previewColor = selectedPlatform?.color || '#1690F5';
  const previewImage = mediaPreviewUrl || form.coverUrl;
  const change = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  useEffect(() => {
    if (!selectedMedia?.fileUrl || !sessionToken) { setMediaPreviewUrl(''); return undefined; }
    const controller = new AbortController();
    let objectUrl = '';
    fetch(resolveApiUrl(selectedMedia.fileUrl), { headers: authHeaders(sessionToken), signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error('Media preview olinmadi.');
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setMediaPreviewUrl(objectUrl);
      })
      .catch(() => { if (!controller.signal.aborted) setMediaPreviewUrl(''); });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedMedia?.fileUrl, sessionToken]);

  const chooseMedia = (media) => {
    setForm((current) => ({ ...current, coverMediaId: media.id, coverUrl: '' }));
    void apiRequest(`/api/media/${media.id}/use`, { method: 'POST', headers: authHeaders(sessionToken) }).catch(() => {});
  };

  const applyTemplate = (template) => {
    const platform = metadata.platforms?.find((entry) => entry.code === template.platformCode);
    setForm((current) => ({
      ...current,
      templateId: template.id,
      title: template.titleTemplate || current.title,
      description: template.descriptionTemplate || current.description,
      contentType: template.contentType || current.contentType,
      platformId: platform?.id || current.platformId,
      tags: (template.tags || []).join(', '),
    }));
  };

  const openAi = () => window.dispatchEvent(new CustomEvent('aloo:open-ai', { detail: { task: 'caption', prompt: `${form.title}\n${form.description}`.trim() } }));

  const submit = (event) => {
    event.preventDefault();
    if (!item?.id) localStorage.removeItem(DRAFT_KEY);
    onSave({
      title: form.title.trim(), description: form.description.trim(), contentType: form.contentType,
      platformId: Number(form.platformId), branchId: form.branchId ? Number(form.branchId) : null,
      assignedTo: form.assignedTo ? Number(form.assignedTo) : null, templateId: form.templateId ? Number(form.templateId) : null,
      status: form.status, publishAt: form.publishAt ? new Date(form.publishAt).toISOString() : null,
      coverUrl: form.coverUrl.trim() || null, coverMediaId: form.coverMediaId ? Number(form.coverMediaId) : null,
      notes: form.notes.trim(), tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    });
  };

  return (
    <div className="modal-backdrop premium-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="content-modal content-modal--quick" onSubmit={submit}>
        <div className="modal-header premium-modal-header">
          <div><span className="modal-icon"><Sparkles size={22} /></span><div><h2>{modalTitle}</h2><p>Faqat sarlavha, format va platforma majburiy</p></div></div>
          <div className="modal-header-tools">{!item?.id && <span className="autosave-state"><Cloud size={15} /> {savedAt ? `Avto saqlandi ${savedAt.toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})}` : 'Offline draft yoqilgan'}</span>}<button className="icon-button modal-close-button" type="button" onClick={onClose} aria-label="Yopish"><X size={22} /></button></div>
        </div>

        {restored && <div className="draft-restored"><Check size={16} /><span>Oldingi saqlanmagan draftingiz tiklandi.</span><button type="button" onClick={() => { localStorage.removeItem(DRAFT_KEY); setForm((current) => ({ ...initialState, platformId: current.platformId, assignedTo: current.assignedTo })); setRestored(false); }}>Tozalash</button></div>}
        {editingUsers.length > 0 && <div className="editing-presence-banner"><span className="editing-pulse" /><div><strong>{editingUsers.map((user) => user.fullName).join(', ')}</strong><small>shu kontentni hozir tahrirlayapti. O‘zgarishlarni saqlashdan oldin kelishib oling.</small></div></div>}

        {!item?.id && templates.length > 0 && <section className="template-strip"><div><span><WandSparkles size={18} /></span><div><strong>Tayyor shablondan boshlang</strong><small>Maydonlar bir bosishda to‘ldiriladi</small></div></div><div className="template-scroll">{templates.map((template) => <button type="button" key={template.id} className={Number(form.templateId) === Number(template.id) ? 'active' : ''} onClick={() => applyTemplate(template)}><i>{template.name.slice(0,1)}</i><span>{template.name}</span><small>{template.category}</small></button>)}</div></section>}

        <div className="content-wizard-steps" aria-hidden="true"><span className="active"><b>1</b> G‘oya</span><i /><span className="active"><b>2</b> Format</span><i /><span className={form.publishAt ? 'active' : ''}><b>3</b> Vaqt</span><i /><span><b>4</b> Tayyor</span></div>

        <div className="quick-content-layout">
          <div className="quick-content-form">
            <section className="quick-form-section">
              <div className="quick-section-heading"><span>01</span><div><h3>Kontent g‘oyasi</h3><p>Nima e’lon qilmoqchisiz?</p></div><button type="button" className="ai-inline-button" onClick={openAi}><Sparkles size={16} /> AI bilan yozish</button></div>
              <label className="form-field form-field--hero"><span>Sarlavha *</span><input required minLength={2} maxLength={220} autoFocus value={form.title} onChange={(event) => change('title', event.target.value)} placeholder="Masalan: Chilla yarmarkasi — konditsionerlar" /><small>{form.title.length}/220</small></label>
              <label className="form-field"><span>Caption yoki qisqa izoh</span><textarea rows={4} value={form.description} onChange={(event) => change('description', event.target.value)} placeholder="Post matni, CTA yoki jamoaga qisqa tushuntirish..." /></label>
            </section>

            <section className="quick-form-section">
              <div className="quick-section-heading"><span>02</span><div><h3>Format va platforma</h3><p>Bir bosishda tanlang</p></div></div>
              <div className="quick-label">Kontent turi</div><div className="choice-chip-grid choice-chip-grid--types">{popularTypes.map((value) => <button key={value} type="button" className={form.contentType === value ? 'selected' : ''} onClick={() => change('contentType', value)}><ImageIcon size={18} /><span>{typeLabels[value]}</span></button>)}</div>
              <div className="quick-label quick-label--spaced">Platforma *</div><div className="choice-chip-grid choice-chip-grid--platforms">{metadata.platforms.map((platform) => <button key={platform.id} type="button" className={Number(form.platformId) === Number(platform.id) ? 'selected' : ''} onClick={() => change('platformId', platform.id)}><i style={{ background: platform.color }} /><span>{platform.name}</span></button>)}</div>
            </section>

            <section className="quick-form-section">
              <div className="quick-section-heading"><span>03</span><div><h3>Nashr vaqti</h3><p>Sana shart emas — draft sifatida saqlanadi</p></div></div>
              <label className="form-field"><span>Sana va vaqt</span><div className="field-with-icon premium-date-field"><CalendarDays size={19} /><input type="datetime-local" value={form.publishAt} onChange={(event) => change('publishAt', event.target.value)} /></div></label>
              <div className="quick-time-presets"><button type="button" onClick={() => change('publishAt', quickDate(0,18))}><Clock3 size={15} /> Bugun 18:00</button><button type="button" onClick={() => change('publishAt', quickDate(1,12))}><Clock3 size={15} /> Ertaga 12:00</button><button type="button" onClick={() => change('publishAt','')}>Sanasiz draft</button></div>
            </section>

            <section className={`advanced-content-section ${advancedOpen ? 'open' : ''}`}>
              <button className="advanced-toggle" type="button" onClick={() => setAdvancedOpen((value) => !value)}>
                <span><SlidersHorizontal size={18} /> Qo‘shimcha sozlamalar</span>
                <small>Filial, mas’ul, status, media va teglar</small>
                <ChevronDown size={19} />
              </button>
              {advancedOpen && <div className="advanced-form-grid">
                <label className="form-field"><span>Filial</span><select value={form.branchId} onChange={(event) => change('branchId',event.target.value)}><option value="">Umumiy / barcha filiallar</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
                <label className="form-field"><span>Mas’ul xodim</span><select value={form.assignedTo} onChange={(event) => change('assignedTo',event.target.value)}><option value="">Belgilanmagan</option>{metadata.users.map((user) => <option key={user.id} value={user.id}>{user.fullName}</option>)}</select></label>
                <label className="form-field"><span>Status</span><select value={form.status} onChange={(event) => change('status',event.target.value)}>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                <label className="form-field"><span>Tashqi cover URL</span><input type="url" value={form.coverUrl} onChange={(event) => setForm((current) => ({ ...current, coverUrl: event.target.value, coverMediaId: event.target.value ? '' : current.coverMediaId }))} placeholder="https://..." /></label>
                <div className="form-field form-field--wide content-media-picker">
                  <span>Media kutubxonasidan biriktirish</span>
                  <div className="content-media-picker__head"><small>{selectedMedia ? `${selectedMedia.displayName} tanlandi` : 'Oxirgi rasmlardan birini tanlang'}</small>{(form.coverMediaId || form.coverUrl) && <button type="button" onClick={() => setForm((current) => ({ ...current, coverMediaId: '', coverUrl: '' }))}>Coverni olib tashlash</button>}</div>
                  <div className="content-media-picker__grid">
                    {mediaLoading && <div className="content-media-picker__loading">Media yuklanmoqda...</div>}
                    {!mediaLoading && mediaItems.length === 0 && <div className="content-media-picker__empty">Media kutubxonasida rasm topilmadi.</div>}
                    {mediaItems.map((media) => <button type="button" key={media.id} className={Number(form.coverMediaId) === Number(media.id) ? 'selected' : ''} onClick={() => chooseMedia(media)} title={media.displayName}><span><ImageIcon size={19} /></span><strong>{media.displayName}</strong><small>{media.extension?.toUpperCase() || 'RASM'}</small></button>)}
                  </div>
                </div>
                <label className="form-field form-field--wide"><span>Teglar</span><input value={form.tags} onChange={(event) => change('tags',event.target.value)} placeholder="aksiya, smartfon, chirchiq" /><small>Vergul bilan ajrating</small></label>
                <label className="form-field form-field--wide"><span>Ichki izoh</span><textarea rows={2} value={form.notes} onChange={(event) => change('notes',event.target.value)} placeholder="Jamoa uchun izoh..." /></label>
              </div>}
            </section>
          </div>

          <aside className="quick-content-preview"><div className="preview-topline"><span style={{ background: previewColor }} /> Jonli preview</div><div className="social-preview-card"><header><span className="preview-logo" style={{ background: previewColor }}>a</span><div><strong>aloo</strong><small>{selectedPlatform?.name || 'Platforma'}</small></div><b>•••</b></header><div className="preview-media" style={previewImage ? { backgroundImage:`url(${previewImage})` } : {}}>{!previewImage && <><ImageIcon size={38} /><span>{typeLabels[form.contentType]}</span></>}</div><div className="preview-copy"><strong>{form.title || 'Kontent sarlavhasi shu yerda ko‘rinadi'}</strong><p>{form.description || 'Caption yoki qisqa izoh kiritilganda preview shu yerda yangilanadi.'}</p><small>{form.publishAt ? new Intl.DateTimeFormat('uz-UZ',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(form.publishAt)) : 'Draft · sana belgilanmagan'}</small></div></div><div className="preview-summary"><span><i style={{ background:previewColor }} />{selectedPlatform?.name || 'Platforma'}</span><span>{typeLabels[form.contentType]}</span><span>{statusLabels[form.status]}</span></div></aside>
        </div>

        <div className="modal-actions premium-modal-actions"><div><strong>3 ta maydon bilan tayyor.</strong><small>Qolgan ma’lumotlarni istalgan vaqtda to‘ldirasiz.</small></div><button type="button" className="button-ghost" onClick={onClose}>Bekor qilish</button><button className="button-primary button-primary--large" disabled={saving || !form.platformId} type="submit"><Save size={19} /> {saving ? 'Saqlanmoqda...' : item?.id ? 'O‘zgarishlarni saqlash' : 'Kontentni yaratish'}</button></div>
      </form>
    </div>
  );
}
