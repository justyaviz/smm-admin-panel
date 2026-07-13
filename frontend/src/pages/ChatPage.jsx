import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, Edit3, Hash, MessageCircle, MoreHorizontal, Plus, Reply, Search, Send, Trash2, UserPlus, UsersRound, X } from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';

const initials = (name = '') => name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
const formatTime = (value) => value ? new Intl.DateTimeFormat('uz-UZ', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '';
const formatChannelTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return formatTime(value);
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short' }).format(date);
};

function channelTitle(channel, currentUserId) {
  if (!channel) return '';
  if (channel.channelType !== 'direct') return channel.name;
  return channel.members.find((member) => Number(member.id) !== Number(currentUserId))?.fullName || 'Shaxsiy suhbat';
}

function GroupModal({ open, members, saving, onClose, onSave }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  useEffect(() => { if (open) { setName(''); setDescription(''); setSelected([]); setSearch(''); } }, [open]);
  if (!open) return null;
  const filtered = members.filter((member) => member.fullName.toLowerCase().includes(search.toLowerCase()));
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <div className="modal-backdrop"><div className="modal-card chat-group-modal"><header className="modal-header"><div><h2>Yangi guruh</h2><p>Jamoa suhbatini yarating</p></div><button className="icon-button" onClick={onClose}><X size={21} /></button></header><form onSubmit={(event) => { event.preventDefault(); onSave({ name, description, memberIds: selected, color: '#1690F5' }); }}>
    <div className="modal-body"><label className="form-field"><span>Guruh nomi</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Masalan: Kontent jamoasi" required minLength={2} /></label><label className="form-field"><span>Tavsif</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Guruh maqsadi..." /></label><label className="form-field"><span>A’zolar</span><div className="chat-member-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Xodim qidirish..." /></div></label><div className="chat-member-picker">{filtered.map((member) => <button type="button" key={member.id} className={selected.includes(member.id) ? 'selected' : ''} onClick={() => toggle(member.id)}><i>{initials(member.fullName)}</i><span><strong>{member.fullName}</strong><small>{member.jobTitle || member.role}</small></span><b><Check size={14} /></b></button>)}</div></div>
    <footer className="modal-footer"><button type="button" className="button-secondary" onClick={onClose}>Bekor qilish</button><button className="button-primary" disabled={saving || !selected.length}>{saving ? 'Yaratilmoqda...' : `Guruh yaratish (${selected.length})`}</button></footer>
  </form></div></div>;
}

export default function ChatPage({ session, notify, initialChannelId }) {
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedId, setSelectedId] = useState(initialChannelId || null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loadingChannels, setLoadingChannels] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupSaving, setGroupSaving] = useState(false);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [mobileConversation, setMobileConversation] = useState(Boolean(initialChannelId));
  const bottomRef = useRef(null);
  const headers = useMemo(() => authHeaders(session.token), [session.token]);
  const selected = channels.find((channel) => Number(channel.id) === Number(selectedId));

  const loadChannels = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoadingChannels(true);
      const params = search ? `?search=${encodeURIComponent(search)}` : '';
      const result = await apiRequest(`/api/chat/channels${params}`, { headers });
      setChannels(result.items || []);
      setSelectedId((current) => current || result.items?.[0]?.id || null);
    } catch (error) { if (!silent) notify(error.message); }
    finally { if (!silent) setLoadingChannels(false); }
  }, [headers, search]);

  const loadMessages = useCallback(async (silent = false) => {
    if (!selectedId) return;
    try {
      if (!silent) setLoadingMessages(true);
      const result = await apiRequest(`/api/chat/channels/${selectedId}/messages?limit=100`, { headers });
      setMessages(result.items || []);
      await apiRequest(`/api/chat/channels/${selectedId}/read`, { method: 'PATCH', headers });
      setChannels((current) => current.map((channel) => Number(channel.id) === Number(selectedId) ? { ...channel, unreadCount: 0 } : channel));
    } catch (error) { if (!silent) notify(error.message); }
    finally { if (!silent) setLoadingMessages(false); }
  }, [headers, selectedId]);

  useEffect(() => { const timer = setTimeout(() => void loadChannels(), search ? 250 : 0); return () => clearTimeout(timer); }, [loadChannels]);
  useEffect(() => { void apiRequest('/api/chat/members', { headers }).then((result) => setMembers(result.items || [])).catch((error) => notify(error.message)); }, [headers]);
  useEffect(() => { void loadMessages(); }, [selectedId]);
  useEffect(() => { const timer = setInterval(() => { void loadChannels(true); if (selectedId) void loadMessages(true); }, 6_000); return () => clearInterval(timer); }, [loadChannels, loadMessages, selectedId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length, selectedId]);
  useEffect(() => { if (initialChannelId) { setSelectedId(initialChannelId); setMobileConversation(true); } }, [initialChannelId]);

  const send = async () => {
    const body = message.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    try {
      const result = await apiRequest(`/api/chat/channels/${selectedId}/messages`, { method: 'POST', headers, body: JSON.stringify({ body, replyToId: replyTo?.id || null }) });
      setMessages((current) => [...current, result.item]);
      setMessage(''); setReplyTo(null);
      await loadChannels(true);
    } catch (error) { notify(error.message); }
    finally { setSending(false); }
  };

  const openDirect = async (member) => {
    if (Number(member.id) === Number(session.user.id)) return;
    try {
      const result = await apiRequest(`/api/chat/direct/${member.id}`, { method: 'POST', headers });
      setNewChatOpen(false); setSelectedId(result.id); setMobileConversation(true); await loadChannels(true);
    } catch (error) { notify(error.message); }
  };

  const createGroup = async (payload) => {
    setGroupSaving(true);
    try {
      const result = await apiRequest('/api/chat/channels', { method: 'POST', headers, body: JSON.stringify(payload) });
      setGroupOpen(false); setSelectedId(result.id); setMobileConversation(true); await loadChannels(true); notify('Yangi guruh yaratildi.');
    } catch (error) { notify(error.message); }
    finally { setGroupSaving(false); }
  };

  const editMessage = async (item) => {
    const body = window.prompt('Xabarni tahrirlang:', item.body);
    if (!body || body.trim() === item.body) return;
    try { await apiRequest(`/api/chat/messages/${item.id}`, { method: 'PUT', headers, body: JSON.stringify({ body }) }); await loadMessages(true); }
    catch (error) { notify(error.message); }
  };
  const deleteMessage = async (item) => {
    if (!window.confirm('Xabar o‘chirilsinmi?')) return;
    try { await apiRequest(`/api/chat/messages/${item.id}`, { method: 'DELETE', headers }); await loadMessages(true); }
    catch (error) { notify(error.message); }
  };

  return <div className={`chat-page ${mobileConversation ? 'chat-page--conversation' : ''}`}>
    <aside className="chat-sidebar"><header><div><h1>Ichki chat</h1><p>Jamoa bilan tezkor aloqa</p></div><button className="chat-add-button" onClick={() => setNewChatOpen((value) => !value)}><UserPlus size={18} /></button></header>
      <label className="chat-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Suhbat qidirish..." /></label>
      {newChatOpen && <div className="chat-new-panel"><header><strong>Yangi suhbat</strong><button onClick={() => setGroupOpen(true)}><Plus size={15} /> Guruh</button></header><div>{members.filter((member) => Number(member.id) !== Number(session.user.id)).map((member) => <button key={member.id} onClick={() => openDirect(member)}><i>{initials(member.fullName)}</i><span><strong>{member.fullName}</strong><small>{member.jobTitle || member.role}</small></span></button>)}</div></div>}
      <div className="chat-channel-list">{loadingChannels && <div className="chat-state"><span className="spinner spinner--blue" /> Yuklanmoqda...</div>}{!loadingChannels && channels.map((channel) => { const title = channelTitle(channel, session.user.id); const other = channel.channelType === 'direct' ? channel.members.find((member) => Number(member.id) !== Number(session.user.id)) : null; return <button key={channel.id} className={Number(selectedId) === Number(channel.id) ? 'active' : ''} onClick={() => { setSelectedId(channel.id); setMobileConversation(true); }}><span className="chat-channel-avatar" style={{ background: channel.color }}>{channel.channelType === 'direct' ? initials(title) : channel.channelType === 'general' ? <Hash size={18} /> : <UsersRound size={18} />}</span><div><header><strong>{title}</strong><time>{formatChannelTime(channel.lastMessage?.createdAt || channel.lastMessageAt)}</time></header><p>{channel.lastMessage ? `${channel.lastMessage.senderId === session.user.id ? 'Siz: ' : ''}${channel.lastMessage.body}` : other?.jobTitle || channel.description || 'Yangi suhbat'}</p></div>{channel.unreadCount > 0 && <b>{channel.unreadCount}</b>}</button>; })}{!loadingChannels && !channels.length && <div className="chat-empty-small"><MessageCircle size={25} /><p>Suhbat topilmadi</p></div>}</div>
    </aside>
    <section className="chat-conversation">{selected ? <>
      <header className="chat-conversation-head"><button className="chat-back" onClick={() => setMobileConversation(false)}><ArrowLeft size={20} /></button><span className="chat-channel-avatar" style={{ background: selected.color }}>{selected.channelType === 'direct' ? initials(channelTitle(selected, session.user.id)) : selected.channelType === 'general' ? <Hash size={18} /> : <UsersRound size={18} />}</span><div><h2>{channelTitle(selected, session.user.id)}</h2><p>{selected.channelType === 'direct' ? selected.members.find((member) => Number(member.id) !== Number(session.user.id))?.jobTitle || 'Jamoa a’zosi' : `${selected.members.length || 'Barcha'} a’zo · ${selected.description || 'Aloo jamoasi'}`}</p></div><button className="icon-button"><MoreHorizontal size={20} /></button></header>
      <div className="chat-messages">{loadingMessages && <div className="chat-state"><span className="spinner spinner--blue" /> Xabarlar yuklanmoqda...</div>}{!loadingMessages && !messages.length && <div className="chat-welcome"><span><MessageCircle size={30} /></span><h3>Suhbatni boshlang</h3><p>Jamoaga birinchi xabarni yuboring.</p></div>}{messages.map((item, index) => { const own = Number(item.senderId) === Number(session.user.id); const previous = messages[index - 1]; const showName = !own && (!previous || Number(previous.senderId) !== Number(item.senderId)); return <div key={item.id} className={`chat-message-row ${own ? 'own' : ''}`}>
        {!own && <span className={`chat-message-avatar ${showName ? '' : 'hidden'}`}>{initials(item.senderName)}</span>}<article className={item.isDeleted ? 'deleted' : ''}>{showName && <strong>{item.senderName}</strong>}{item.replyTo && <button className="chat-reply-preview" onClick={() => {}}><b>{item.replyTo.senderName}</b><span>{item.replyTo.body}</span></button>}<p>{item.isDeleted ? 'Xabar o‘chirildi' : item.body}</p><footer><time>{formatTime(item.createdAt)}</time>{item.isEdited && <em>tahrirlangan</em>}{!item.isDeleted && <div><button title="Javob" onClick={() => setReplyTo(item)}><Reply size={13} /></button>{own && <><button title="Tahrirlash" onClick={() => editMessage(item)}><Edit3 size={13} /></button><button title="O‘chirish" onClick={() => deleteMessage(item)}><Trash2 size={13} /></button></>}</div>}</footer></article>
      </div>; })}<div ref={bottomRef} /></div>
      <div className="chat-composer">{replyTo && <div className="chat-reply-bar"><Reply size={16} /><span><strong>{replyTo.senderName}</strong><small>{replyTo.body}</small></span><button onClick={() => setReplyTo(null)}><X size={16} /></button></div>}<div><textarea value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} rows={1} placeholder="Xabar yozing..." /><button className="chat-send" disabled={!message.trim() || sending} onClick={send}><Send size={19} /></button></div><small>Enter — yuborish, Shift + Enter — yangi qator</small></div>
    </> : <div className="chat-no-selection"><span><MessageCircle size={34} /></span><h2>Suhbatni tanlang</h2><p>Chap tomondan chatni oching yoki yangi suhbat boshlang.</p></div>}</section>
    <GroupModal open={groupOpen} members={members.filter((member) => Number(member.id) !== Number(session.user.id))} saving={groupSaving} onClose={() => setGroupOpen(false)} onSave={createGroup} />
  </div>;
}
