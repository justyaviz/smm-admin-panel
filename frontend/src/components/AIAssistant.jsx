import { useEffect, useState } from 'react';
import { Bot, Copy, Loader2, Send, Sparkles, X } from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';

const tasks = [
  ['caption','Caption'],['hooks','Hooklar'],['reels_script','Reels ssenariy'],['cta','CTA'],
  ['shorten','Qisqartirish'],['translate_ru','Ruscha'],['translate_tr','Turkcha'],['hashtags','Hashtag'],['ideas','G‘oyalar'],['explain_report','Hisobot izohi'],
];

export default function AIAssistant({ session, notify }) {
  const [open, setOpen] = useState(false);
  const [task, setTask] = useState('caption');
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState('');

  useEffect(() => {
    const handler = (event) => { setOpen(true); if (event.detail?.prompt) setPrompt(event.detail.prompt); if (event.detail?.task) setTask(event.detail.task); };
    window.addEventListener('aloo:open-ai', handler);
    return () => window.removeEventListener('aloo:open-ai', handler);
  }, []);

  const generate = async () => {
    if (prompt.trim().length < 2) return notify('AI uchun mavzu yoki matn kiriting.');
    setLoading(true);
    try {
      const response = await apiRequest('/api/ai/generate', { method: 'POST', headers: authHeaders(session.token), body: JSON.stringify({ task, prompt, platform: 'Instagram', tone: 'do‘stona, sodda va sotuvga yo‘naltirilgan' }) });
      setResult(response.result || '');
      setProvider(response.provider || 'local');
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };

  const copy = async () => { await navigator.clipboard.writeText(result); notify('AI natijasi nusxalandi.'); };

  return <>
    <button className="ai-fab" onClick={() => setOpen(true)} title="AI yordamchi"><Sparkles size={20} /><span>AI</span></button>
    {open && <div className="ai-drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <aside className="ai-drawer">
        <header><span><Bot size={22} /></span><div><h2>aloo AI yordamchi</h2><p>Caption, hook, ssenariy va g‘oyalar</p></div><button onClick={() => setOpen(false)}><X size={21} /></button></header>
        <div className="ai-task-grid">{tasks.map(([value,label]) => <button key={value} className={task === value ? 'active' : ''} onClick={() => setTask(value)}>{label}</button>)}</div>
        <label className="ai-prompt"><span>Mavzu yoki tayyor matn</span><textarea rows={8} value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Masalan: Chirchiq filialida konditsionerlarga chilla yarmarkasi aksiyasi…" /></label>
        <button className="button-primary button-primary--large ai-generate" disabled={loading} onClick={generate}>{loading ? <Loader2 className="spin" size={19} /> : <Send size={19} />}{loading ? 'Tayyorlanmoqda…' : 'Natija yaratish'}</button>
        <section className={`ai-result ${result ? 'has-result' : ''}`}><div><strong>Natija</strong>{provider && <small>{provider === 'openai' ? 'Cloud AI' : 'Ichki smart generator'}</small>}<button disabled={!result} onClick={copy}><Copy size={16} /> Nusxalash</button></div><pre>{result || 'Natija shu yerda ko‘rinadi.'}</pre></section>
        <p className="ai-note">AI matnini chop etishdan oldin tekshiring va brend ohangiga moslang.</p>
      </aside>
    </div>}
  </>;
}
