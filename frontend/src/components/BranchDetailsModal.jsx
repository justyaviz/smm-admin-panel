import { useEffect, useState } from 'react';
import { ExternalLink, Globe2, Save, UsersRound, X } from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';

export default function BranchDetailsModal({ branch, session, platforms, canManage, notify, onClose, onUpdated }) {
  const [data, setData] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [savingId, setSavingId] = useState(null);
  useEffect(() => {
    if (!branch) return;
    apiRequest(`/api/branches/${branch.id}`, { headers: authHeaders(session.token) })
      .then((result) => {
        setData(result);
        const values = {};
        for (const platform of platforms) {
          const current = (result.accounts || []).find((account) => Number(account.platformId) === Number(platform.id));
          values[platform.id] = current || { platformId: platform.id, accountName: '', accountUrl: '', followers: 0, isActive: true, notes: '' };
        }
        setAccounts(values);
      }).catch((error) => notify(error.message));
  }, [branch, platforms, session.token, notify]);
  if (!branch) return null;
  const change = (id, key, value) => setAccounts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  const save = async (platformId) => {
    setSavingId(platformId);
    try {
      await apiRequest(`/api/branches/${branch.id}/accounts/${platformId}`, { method: 'PUT', headers: authHeaders(session.token), body: JSON.stringify(accounts[platformId]) });
      notify('Ijtimoiy tarmoq akkaunti saqlandi.');
      onUpdated?.();
    } catch (error) { notify(error.message); }
    finally { setSavingId(null); }
  };
  return <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
    <section className="content-modal branch-details-modal">
      <header className="modal-header"><div><span className="modal-icon"><Globe2 size={21}/></span><div><h2>{branch.name} — akkauntlar</h2><p>Filial jamoasi va ijtimoiy tarmoq sahifalari</p></div></div><button className="icon-button" onClick={onClose}><X size={21}/></button></header>
      {!data ? <div className="organization-loading"><span className="spinner spinner--blue"/> Yuklanmoqda...</div> : <div className="branch-details-body">
        <div className="branch-detail-members"><div className="organization-section-title"><div><UsersRound size={18}/><strong>Biriktirilgan xodimlar</strong></div><span>{data.members.length} ta</span></div><div className="branch-member-list">{data.members.map((member) => <div key={member.id}><span>{member.fullName.split(/\s+/).map((x) => x[0]).join('').slice(0,2)}</span><div><strong>{member.fullName}</strong><small>{member.jobTitle || member.role}{member.isPrimary ? ' · Asosiy filial' : ''}</small></div></div>)}{!data.members.length && <p className="organization-empty-mini">Bu filialga xodim biriktirilmagan.</p>}</div></div>
        <div><div className="organization-section-title"><div><Globe2 size={18}/><strong>Ijtimoiy tarmoqlar</strong></div><span>{data.accounts.length} ta ulangan</span></div><div className="branch-accounts-grid">{platforms.map((platform) => { const account = accounts[platform.id] || {}; return <article key={platform.id} style={{ '--platform-color': platform.color }}><header><i>{platform.name[0]}</i><div><strong>{platform.name}</strong><small>{account.accountName || 'Akkaunt ulanmagan'}</small></div>{account.accountUrl && <a href={account.accountUrl} target="_blank" rel="noreferrer"><ExternalLink size={15}/></a>}</header><label><span>Akkaunt nomi</span><input disabled={!canManage} value={account.accountName || ''} onChange={(e) => change(platform.id,'accountName',e.target.value)} placeholder="@aloo_chirchiq"/></label><label><span>Havola</span><input disabled={!canManage} value={account.accountUrl || ''} onChange={(e) => change(platform.id,'accountUrl',e.target.value)} placeholder="https://..."/></label><label><span>Obunachilar</span><input disabled={!canManage} type="number" min="0" value={account.followers || 0} onChange={(e) => change(platform.id,'followers',Number(e.target.value))}/></label>{canManage && <button className="button-soft" onClick={() => save(platform.id)} disabled={savingId === platform.id}><Save size={15}/>{savingId === platform.id ? 'Saqlanmoqda' : 'Saqlash'}</button>}</article>; })}</div></div>
      </div>}
    </section>
  </div>;
}
