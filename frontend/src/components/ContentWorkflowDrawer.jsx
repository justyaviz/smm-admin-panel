import { useEffect, useState } from 'react';
import { CheckCircle2, Clock3, MessageSquare, RotateCcw, Send, X } from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';
import { statusLabels } from '../data/navigation.js';

const workflow = ['draft','review','changes_requested','approved','scheduled','published'];

export default function ContentWorkflowDrawer({ item, session, onClose, notify, onUpdated }) {
  const [details, setDetails] = useState({ item, comments: [], history: [] });
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => {
    try { setDetails(await apiRequest(`/api/content/${item.id}`, { headers: authHeaders(session.token) })); }
    catch (error) { notify(error.message); }
  };
  useEffect(() => { void load(); }, [item.id]);

  const addComment = async () => {
    if (!comment.trim()) return;
    setSaving(true);
    try { await apiRequest(`/api/content/${item.id}/comments`, { method:'POST',headers:authHeaders(session.token),body:JSON.stringify({ body:comment,commentType:'comment' }) }); setComment(''); await load(); }
    catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };
  const setStatus = async (status) => {
    const needsComment = status === 'changes_requested';
    const text = needsComment ? window.prompt('Qanday tuzatish kerak?') : '';
    if (needsComment && !text) return;
    setSaving(true);
    try { const result = await apiRequest(`/api/content/${item.id}/status`, { method:'PATCH',headers:authHeaders(session.token),body:JSON.stringify({ status,comment:text || '' }) }); notify(`Status: ${statusLabels[status]}`); onUpdated?.(result.item); await load(); }
    catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };
  const current = details.item?.status || item.status;
  return <div className="workflow-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><aside className="workflow-drawer"><header><div><span>Kontent jarayoni</span><h2>{details.item?.title || item.title}</h2></div><button onClick={onClose}><X size={21} /></button></header><div className="workflow-status-track">{workflow.map((status,index) => <button key={status} className={`${current === status ? 'active' : ''} ${workflow.indexOf(current) > index ? 'done' : ''}`} onClick={() => setStatus(status)} disabled={saving}><i>{workflow.indexOf(current) > index ? <CheckCircle2 size={15} /> : index+1}</i><span>{statusLabels[status]}</span></button>)}</div><section className="workflow-actions"><button onClick={() => setStatus('review')}><Send size={17} /> Tekshiruvga yuborish</button><button onClick={() => setStatus('changes_requested')}><RotateCcw size={17} /> Tuzatish so‘rash</button><button onClick={() => setStatus('approved')}><CheckCircle2 size={17} /> Tasdiqlash</button></section><section className="workflow-comments"><div className="workflow-section-title"><MessageSquare size={18} /><h3>Izohlar</h3><span>{details.comments?.length || 0}</span></div><div className="workflow-comment-list">{!details.comments?.length && <p className="workflow-empty">Hali izoh yo‘q.</p>}{details.comments?.map((entry) => <article key={entry.id} className={`workflow-comment workflow-comment--${entry.commentType}`}><span>{entry.user.fullName.split(/\s+/).map((part) => part[0]).join('').slice(0,2)}</span><div><header><strong>{entry.user.fullName}</strong><small><Clock3 size={12} /> {new Date(entry.createdAt).toLocaleString('uz-UZ')}</small></header><p>{entry.body}</p></div></article>)}</div><div className="workflow-comment-box"><textarea value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Izoh yozing yoki @xodimni belgilang…" /><button disabled={saving || !comment.trim()} onClick={addComment}><Send size={17} /></button></div></section><section className="workflow-history"><h3>Faoliyat tarixi</h3>{details.history?.slice(0,8).map((entry) => <div key={entry.id}><i /><p><strong>{statusLabels[entry.newStatus] || entry.newStatus}</strong><span>{entry.changedBy || 'Tizim'} · {new Date(entry.createdAt).toLocaleString('uz-UZ')}</span></p></div>)}</section></aside></div>;
}
