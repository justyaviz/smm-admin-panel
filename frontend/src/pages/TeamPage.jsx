import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check, Edit3, KeyRound, MoreHorizontal, Plus, RefreshCw, Search, ShieldCheck,
  UserCheck, UserRound, UsersRound, UserX,
} from 'lucide-react';
import TeamFormModal from '../components/TeamFormModal.jsx';
import { apiRequest, authHeaders } from '../lib/api.js';

function formatDate(value) {
  if (!value) return 'Hali kirmagan';
  return new Intl.DateTimeFormat('uz-UZ', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(value));
}
function initials(name='') { return name.split(/\s+/).filter(Boolean).map((x)=>x[0]).join('').slice(0,2).toUpperCase(); }
function Stat({icon:Icon,label,value,note,tone='blue'}) { return <article className="organization-stat"><span className={`organization-stat__icon organization-stat__icon--${tone}`}><Icon size={20}/></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>; }

function RolesPanel({ roles, permissions, session, notify, reload }) {
  const [selectedCode,setSelectedCode]=useState(roles[0]?.code||'');
  const [draft,setDraft]=useState([]);
  const [saving,setSaving]=useState(false);
  useEffect(()=>{ if(!selectedCode&&roles[0])setSelectedCode(roles[0].code); },[roles,selectedCode]);
  const selected=roles.find((role)=>role.code===selectedCode)||roles[0];
  useEffect(()=>{ setDraft(selected?.permissions||[]); },[selected?.code, selected?.permissions]);
  const grouped=useMemo(()=>permissions.reduce((acc,p)=>{(acc[p.group]||=[]).push(p);return acc;},{}),[permissions]);
  const canManage=session.user?.role==='admin'||session.user?.permissions?.includes('roles.manage');
  const toggle=(code)=>setDraft((current)=>current.includes(code)?current.filter((x)=>x!==code):[...current,code]);
  const save=async()=>{ if(!selected||selected.code==='admin')return;setSaving(true);try{await apiRequest(`/api/roles/${selected.code}/permissions`,{method:'PUT',headers:authHeaders(session.token),body:JSON.stringify({permissions:draft})});notify('Rol ruxsatlari yangilandi.');await reload();}catch(error){notify(error.message);}finally{setSaving(false);}};
  if(!selected)return <div className="organization-empty-mini">Rollar topilmadi.</div>;
  return <div className="roles-layout">
    <aside className="roles-list">{roles.map((role)=><button key={role.code} className={selected.code===role.code?'active':''} onClick={()=>setSelectedCode(role.code)}><i style={{background:role.color}}/><span><strong>{role.name}</strong><small>{role.userCount} xodim</small></span><b>{role.permissions.length}</b></button>)}</aside>
    <section className="permissions-panel"><header><div><span style={{background:selected.color}}><ShieldCheck size={20}/></span><div><h3>{selected.name}</h3><p>{selected.description}</p></div></div>{canManage&&selected.code!=='admin'&&<button className="button-primary" disabled={saving} onClick={save}><Check size={17}/>{saving?'Saqlanmoqda...':'Ruxsatlarni saqlash'}</button>}</header>
      {selected.code==='admin'&&<div className="permission-admin-note"><ShieldCheck size={18}/> Administrator barcha ruxsatlarga doim ega.</div>}
      <div className="permission-groups">{Object.entries(grouped).map(([group,items])=><article key={group}><header><strong>{group}</strong><span>{items.filter((item)=>draft.includes(item.code)||selected.code==='admin').length}/{items.length}</span></header><div>{items.map((permission)=>{const checked=selected.code==='admin'||draft.includes(permission.code);return <label key={permission.code} className={checked?'checked':''}><input type="checkbox" checked={checked} disabled={!canManage||selected.code==='admin'} onChange={()=>toggle(permission.code)}/><span><Check size={13}/></span><div><strong>{permission.name}</strong><small>{permission.description}</small></div></label>;})}</div></article>)}</div>
    </section>
  </div>;
}

export default function TeamPage({session,notify}) {
  const [tab,setTab]=useState('members');
  const [items,setItems]=useState([]);
  const [summary,setSummary]=useState({total:0,active:0,inactive:0,activeThisWeek:0});
  const [roles,setRoles]=useState([]);
  const [permissions,setPermissions]=useState([]);
  const [branches,setBranches]=useState([]);
  const [filters,setFilters]=useState({search:'',role:'',status:'',branchId:''});
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState({open:false,item:null});
  const [saving,setSaving]=useState(false);
  const [menuId,setMenuId]=useState(null);
  const canManage=session.user?.role==='admin'||session.user?.permissions?.includes('team.manage');
  const headers=useMemo(()=>authHeaders(session.token),[session.token]);

  const loadRoles=useCallback(async()=>{const result=await apiRequest('/api/roles',{headers});setRoles(result.roles||[]);setPermissions(result.permissions||[]);},[headers]);
  const load=useCallback(async()=>{setLoading(true);try{const query=new URLSearchParams(Object.entries(filters).filter(([,value])=>value));const [teamResult,metaResult,rolesResult]=await Promise.all([apiRequest(`/api/team?${query}`,{headers}),branches.length?Promise.resolve({branches}):apiRequest('/api/meta',{headers}),roles.length?Promise.resolve({roles,permissions}):apiRequest('/api/roles',{headers})]);setItems(teamResult.items||[]);setSummary(teamResult.summary||{});if(metaResult.branches)setBranches(metaResult.branches);if(rolesResult.roles){setRoles(rolesResult.roles);setPermissions(rolesResult.permissions||[]);}}catch(error){notify(error.message);}finally{setLoading(false);}},[filters,headers,notify,branches,roles,permissions]);
  useEffect(()=>{const timer=setTimeout(()=>void load(),filters.search?300:0);return()=>clearTimeout(timer);},[load,filters.search]);

  const save=async(payload)=>{setSaving(true);try{await apiRequest(modal.item?`/api/team/${modal.item.id}`:'/api/team',{method:modal.item?'PUT':'POST',headers,body:JSON.stringify(payload)});notify(modal.item?'Xodim yangilandi.':'Yangi xodim qo‘shildi.');setModal({open:false,item:null});await Promise.all([load(),loadRoles()]);}catch(error){notify(error.message);}finally{setSaving(false);}};
  const toggle=async(item)=>{setMenuId(null);try{await apiRequest(`/api/team/${item.id}/status`,{method:'PATCH',headers,body:JSON.stringify({isActive:!item.isActive})});notify(item.isActive?'Xodim bloklandi.':'Xodim faollashtirildi.');await load();}catch(error){notify(error.message);}};
  const resetPassword=async(item)=>{setMenuId(null);const password=window.prompt(`${item.fullName} uchun yangi parol (kamida 6 belgi):`);if(!password)return;try{await apiRequest(`/api/team/${item.id}/reset-password`,{method:'POST',headers,body:JSON.stringify({password})});notify('Parol muvaffaqiyatli yangilandi.');}catch(error){notify(error.message);}};
  const roleCounts=useMemo(()=>roles.map((role)=>({...role,count:items.filter((item)=>item.role===role.code).length})),[roles,items]);

  return <div>
    <div className="page-heading"><div><h1>Jamoa va ruxsatlar</h1><p>Xodimlar, filial biriktirishlari va tizim rollarini boshqaring</p></div>{canManage&&tab==='members'&&<button className="button-primary" onClick={()=>setModal({open:true,item:null})}><Plus size={18}/> Xodim qo‘shish</button>}</div>
    <div className="organization-tabs"><button className={tab==='members'?'active':''} onClick={()=>setTab('members')}><UsersRound size={17}/> Jamoa</button><button className={tab==='roles'?'active':''} onClick={()=>setTab('roles')}><ShieldCheck size={17}/> Rollar va ruxsatlar</button></div>
    {tab==='members'?<>
      <section className="organization-stat-grid"><Stat icon={UsersRound} label="Jami xodimlar" value={summary.total||0} note={`${summary.active||0} ta faol`}/><Stat icon={UserCheck} label="Faol xodimlar" value={summary.active||0} note="tizimga kira oladi" tone="green"/><Stat icon={UserRound} label="Haftada faol" value={summary.activeThisWeek||0} note="oxirgi 7 kun" tone="purple"/><Stat icon={UserX} label="Bloklangan" value={summary.inactive||0} note="kirish yopilgan" tone="amber"/></section>
      <section className="organization-layout team-layout"><article className="content-panel organization-main-card"><div className="content-toolbar organization-toolbar"><label className="search-field"><Search size={17}/><input value={filters.search} onChange={(e)=>setFilters((f)=>({...f,search:e.target.value}))} placeholder="Ism, login, telefon yoki email..."/></label><div className="filter-group"><label><select value={filters.role} onChange={(e)=>setFilters((f)=>({...f,role:e.target.value}))}><option value="">Barcha rollar</option>{roles.map((role)=><option key={role.code} value={role.code}>{role.name}</option>)}</select></label><label><select value={filters.branchId} onChange={(e)=>setFilters((f)=>({...f,branchId:e.target.value}))}><option value="">Barcha filiallar</option>{branches.map((branch)=><option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label><label><select value={filters.status} onChange={(e)=>setFilters((f)=>({...f,status:e.target.value}))}><option value="">Barcha holatlar</option><option value="active">Faol</option><option value="inactive">Bloklangan</option></select></label><button className="icon-action" onClick={load}><RefreshCw size={17} className={loading?'spin':''}/></button></div></div>
        <div className="team-table-wrap"><table className="content-table team-table"><thead><tr><th>Xodim</th><th>Rol</th><th>Filiallar</th><th>Aloqa</th><th>Oxirgi kirish</th><th>Status</th><th/></tr></thead><tbody>{items.map((item)=><tr key={item.id} className={!item.isActive?'team-row--inactive':''}><td><div className="team-user-cell"><span style={{background:item.roleColor}}>{initials(item.fullName)}</span><div><strong>{item.fullName}</strong><small>@{item.login}{item.jobTitle?` · ${item.jobTitle}`:''}</small></div></div></td><td><span className="role-pill" style={{'--role-color':item.roleColor}}>{item.roleName}</span></td><td><div className="team-branches">{item.branches.slice(0,2).map((branch)=><i key={branch.id} className={branch.isPrimary?'primary':''}>{branch.name}</i>)}{item.branches.length>2&&<b>+{item.branches.length-2}</b>}{!item.branches.length&&<small>Biriktirilmagan</small>}</div></td><td><div className="team-contact"><span>{item.phone||'Telefon yo‘q'}</span><small>{item.email||item.telegramUsername||'Email yo‘q'}</small></div></td><td><span className="team-last-login">{formatDate(item.lastLoginAt)}</span></td><td><span className={`organization-status ${item.isActive?'active':'inactive'}`}>{item.isActive?'Faol':'Bloklangan'}</span></td><td className="action-cell">{canManage&&<><button className="table-menu-button" onClick={()=>setMenuId(menuId===item.id?null:item.id)}><MoreHorizontal size={18}/></button>{menuId===item.id&&<div className="row-menu"><button onClick={()=>{setModal({open:true,item});setMenuId(null);}}><Edit3 size={15}/> Tahrirlash</button><button onClick={()=>resetPassword(item)}><KeyRound size={15}/> Parolni yangilash</button><button onClick={()=>toggle(item)}>{item.isActive?<UserX size={15}/>:<UserCheck size={15}/>} {item.isActive?'Bloklash':'Faollashtirish'}</button></div>}</>}</td></tr>)}</tbody></table>{loading&&<div className="table-state"><span className="spinner spinner--blue"/> Yuklanmoqda...</div>}{!loading&&!items.length&&<div className="empty-state"><span><UsersRound size={28}/></span><h3>Xodim topilmadi</h3><p>Filterlarni o‘zgartiring yoki yangi xodim qo‘shing.</p></div>}</div>
      </article><aside className="organization-side"><article className="side-card"><div className="card-header"><div><h3>Jamoa tarkibi</h3><p>Rollar bo‘yicha</p></div></div><div className="team-role-summary">{roleCounts.filter((role)=>role.count>0).map((role)=><div key={role.code}><span><i style={{background:role.color}}/>{role.name}</span><b>{role.count}</b></div>)}</div></article><article className="side-card organization-network-card"><span><ShieldCheck size={25}/></span><h3>Ruxsatlar nazorati</h3><p>Har bir rol faqat o‘z vazifasiga kerakli bo‘limlardan foydalanadi.</p><button className="button-soft" onClick={()=>setTab('roles')}>Rollarni ko‘rish</button></article></aside></section>
    </>:<RolesPanel roles={roles} permissions={permissions} session={session} notify={notify} reload={loadRoles}/>} 
    <TeamFormModal open={modal.open} item={modal.item} roles={roles} branches={branches} saving={saving} currentUser={session.user} onClose={()=>setModal({open:false,item:null})} onSave={save}/>
  </div>;
}
