import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Ban, Check, ChevronDown, CircleDollarSign, Clock3, Edit3, MoreHorizontal, Plus, RefreshCw, Search, Trash2, WalletCards } from 'lucide-react';
import { apiRequest, authHeaders } from '../lib/api.js';
import ExpenseFormModal from '../components/ExpenseFormModal.jsx';
import BudgetFormModal from '../components/BudgetFormModal.jsx';

const statusLabels = { draft: 'Draft', pending: 'Tasdiq kutmoqda', approved: 'Tasdiqlandi', paid: 'To‘landi', rejected: 'Rad etildi', cancelled: 'Bekor qilindi' };
const paymentLabels = { cash: 'Naqd', card: 'Karta', transfer: 'O‘tkazma', corporate_card: 'Korporativ karta', other: 'Boshqa' };
const emptySummary = { total: 0, pending: 0, approved: 0, paid: 0, count: 0, pendingCount: 0, budget: 0, spent: 0, remaining: 0, usedPercent: 0 };
const formatMoney = (value) => `${new Intl.NumberFormat('uz-UZ').format(Math.round(Number(value || 0)))} so‘m`;
const formatDate = (value) => value ? new Intl.DateTimeFormat('uz-UZ', { dateStyle: 'medium' }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`)) : '—';

function Stat({ icon: Icon, label, value, note, tone = 'blue' }) {
  return <article className="operations-stat"><span className={`operations-stat__icon operations-stat__icon--${tone}`}><Icon size={20} /></span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

export default function ExpensesPage({ session, notify, initialAction = null }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState(emptySummary);
  const [categoryStats, setCategoryStats] = useState([]);
  const [categories, setCategories] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [metadata, setMetadata] = useState({ branches: [], users: [], campaigns: [] });
  const [filters, setFilters] = useState({ search: '', status: '', categoryId: '', branchId: '', month: new Date().toISOString().slice(0, 7) });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, item: null });
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [menuId, setMenuId] = useState(null);
  const headers = authHeaders(session.token);
  const permissions = new Set(session.user?.permissions || []);
  const canManage = session.user?.role === 'admin' || permissions.has('expenses.manage');

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => value));
      const [list, totals, categoryResult, budgetResult, meta] = await Promise.all([
        apiRequest(`/api/expenses?${params}`, { headers }),
        apiRequest(`/api/expenses/summary?month=${filters.month}${filters.branchId ? `&branchId=${filters.branchId}` : ''}`, { headers }),
        categories.length ? Promise.resolve({ items: categories }) : apiRequest('/api/expenses/categories', { headers }),
        apiRequest(`/api/expenses/budgets?month=${filters.month}`, { headers }),
        metadata.branches.length ? Promise.resolve(metadata) : apiRequest('/api/meta', { headers }),
      ]);
      setItems(list.items || []);
      setSummary({ ...emptySummary, ...(totals.metrics || {}) });
      setCategoryStats(totals.categories || []);
      if (categoryResult.items) setCategories(categoryResult.items);
      setBudgets(budgetResult.items || []);
      if (meta.branches) setMetadata(meta);
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, [filters.status, filters.categoryId, filters.branchId, filters.month]);
  useEffect(() => { if (initialAction === 'create' && canManage) setModal({ open: true, item: null }); }, [initialAction, canManage]);
  useEffect(() => { const timer = setTimeout(() => void load(), 350); return () => clearTimeout(timer); }, [filters.search]);
  useEffect(() => {
    const refresh = () => void load();
    const events = ['expense.created','expense.updated','expense.status','expense.deleted'];
    events.forEach((name) => window.addEventListener(`aloo:realtime:${name}`, refresh));
    return () => events.forEach((name) => window.removeEventListener(`aloo:realtime:${name}`, refresh));
  }, [filters.status, filters.categoryId, filters.branchId, filters.month, filters.search]);

  const save = async (form) => {
    setSaving(true);
    try {
      await apiRequest(modal.item ? `/api/expenses/${modal.item.id}` : '/api/expenses', { method: modal.item ? 'PUT' : 'POST', headers, body: JSON.stringify(form) });
      notify(modal.item ? 'Xarajat yangilandi.' : 'Yangi xarajat qo‘shildi.');
      setModal({ open: false, item: null });
      await load();
    } catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };
  const saveBudget = async (form) => {
    setSaving(true);
    try { await apiRequest('/api/expenses/budgets', { method: 'POST', headers, body: JSON.stringify(form) }); notify('Oylik byudjet saqlandi.'); setBudgetOpen(false); await load(); }
    catch (error) { notify(error.message); }
    finally { setSaving(false); }
  };
  const setStatus = async (item, status) => {
    try { await apiRequest(`/api/expenses/${item.id}/status`, { method: 'PATCH', headers, body: JSON.stringify({ status }) }); notify(`Xarajat: ${statusLabels[status]}.`); setMenuId(null); await load(); }
    catch (error) { notify(error.message); }
  };
  const remove = async (item) => {
    if (!window.confirm(`“${item.title}” xarajatini o‘chirasizmi?`)) return;
    try { await apiRequest(`/api/expenses/${item.id}`, { method: 'DELETE', headers }); notify('Xarajat o‘chirildi.'); setMenuId(null); await load(); }
    catch (error) { notify(error.message); }
  };
  const maxCategory = useMemo(() => Math.max(1, ...categoryStats.map((item) => item.total)), [categoryStats]);

  return <div className="expenses-page">
    <div className="page-heading"><div><h1>Xarajatlar</h1><p>SMM byudjeti, tasdiqlar va to‘lovlarni nazorat qiling</p></div><div className="heading-actions">{canManage && <button className="button-soft" onClick={() => setBudgetOpen(true)}><WalletCards size={18} /> Byudjet belgilash</button>}{canManage && <button className="button-primary" onClick={() => setModal({ open: true, item: null })}><Plus size={18} /> Yangi xarajat</button>}</div></div>
    <section className="operations-stat-grid"><Stat icon={CircleDollarSign} label="Oylik xarajat" value={formatMoney(summary.spent)} note={`${summary.count} ta yozuv`} /><Stat icon={Clock3} label="Tasdiq kutmoqda" value={formatMoney(summary.pending)} note={`${summary.pendingCount} ta so‘rov`} tone="amber" /><Stat icon={BadgeCheck} label="Tasdiqlangan" value={formatMoney(summary.approved)} note="to‘lovga tayyor" tone="purple" /><Stat icon={WalletCards} label="Qolgan byudjet" value={formatMoney(summary.remaining)} note={`${summary.usedPercent}% ishlatilgan`} tone="green" /></section>

    <section className="expense-overview-grid"><article className="content-panel expense-budget-card"><header><div><h3>{filters.month} byudjeti</h3><p>Umumiy tasdiqlangan va to‘langan xarajatlar</p></div><strong>{formatMoney(summary.budget)}</strong></header><div className="expense-budget-track"><span style={{ width: `${Math.min(100, summary.usedPercent)}%` }} /></div><div className="expense-budget-labels"><span>Sarflandi: <b>{formatMoney(summary.spent)}</b></span><span>Qoldi: <b>{formatMoney(summary.remaining)}</b></span></div><div className="budget-scope-list">{budgets.slice(0, 5).map((budget) => <div key={budget.id}><span><i style={{ background: budget.categoryColor || '#1690F5' }} />{budget.branchName || budget.categoryName || 'Umumiy byudjet'}</span><b>{formatMoney(budget.amount)}</b></div>)}{!budgets.length && <div className="empty-mini">Bu oy uchun byudjet belgilanmagan.</div>}</div></article>
      <article className="content-panel expense-category-card"><header><div><h3>Kategoriyalar</h3><p>Oy bo‘yicha taqsimot</p></div></header><div className="expense-category-bars">{categoryStats.filter((item) => item.total > 0).map((item) => <div key={item.id}><div><span><i style={{ background: item.color }} />{item.name}</span><b>{formatMoney(item.total)}</b></div><div><span style={{ width: `${(item.total / maxCategory) * 100}%`, background: item.color }} /></div></div>)}{!categoryStats.some((item) => item.total > 0) && <div className="empty-mini">Bu oy xarajat kiritilmagan.</div>}</div></article></section>

    <section className="content-panel expense-table-card"><div className="content-toolbar operations-toolbar"><label className="search-field"><Search size={17} /><input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Xarajat yoki yetkazib beruvchi..." /></label><div className="filter-group"><label><input className="month-filter" type="month" value={filters.month} onChange={(event) => setFilters((current) => ({ ...current, month: event.target.value }))} /></label><label><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">Barcha statuslar</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><ChevronDown size={14} /></label><label><select value={filters.categoryId} onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}><option value="">Barcha kategoriyalar</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select><ChevronDown size={14} /></label><label><select value={filters.branchId} onChange={(event) => setFilters((current) => ({ ...current, branchId: event.target.value }))}><option value="">Barcha filiallar</option>{metadata.branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select><ChevronDown size={14} /></label><button className="icon-action" onClick={load}><RefreshCw size={17} className={loading ? 'spin' : ''} /></button></div></div>
      <div className="content-table-wrap"><table className="content-table expense-table"><thead><tr><th>Xarajat</th><th>Kategoriya</th><th>Filial / kampaniya</th><th>Sana</th><th>Summa</th><th>To‘lov</th><th>Status</th><th /></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><div className="expense-name-cell"><span style={{ '--category-color': item.categoryColor }}><CircleDollarSign size={17} /></span><div><strong>{item.title}</strong><small>{item.vendor || item.requesterName || 'Yetkazib beruvchi yo‘q'}</small></div></div></td><td><span className="expense-category-pill" style={{ '--category-color': item.categoryColor }}>{item.categoryName}</span></td><td><div className="expense-scope"><span>{item.branchName || 'Bosh ofis'}</span><small>{item.campaignName || 'Kampaniyasiz'}</small></div></td><td>{formatDate(item.expenseDate)}</td><td><strong className="expense-amount">{formatMoney(item.amount)}</strong></td><td><span className="table-muted">{paymentLabels[item.paymentMethod]}</span></td><td><span className={`expense-status expense-status--${item.status}`}>{statusLabels[item.status]}</span></td><td className="action-cell">{canManage && <><button className="table-menu-button" onClick={() => setMenuId(menuId === item.id ? null : item.id)}><MoreHorizontal size={18} /></button>{menuId === item.id && <div className="row-menu"><button onClick={() => { setModal({ open: true, item }); setMenuId(null); }}><Edit3 size={15} /> Tahrirlash</button>{item.status === 'pending' && <button onClick={() => setStatus(item, 'approved')}><Check size={15} /> Tasdiqlash</button>}{['approved', 'pending'].includes(item.status) && <button onClick={() => setStatus(item, 'paid')}><BadgeCheck size={15} /> To‘landi</button>}{!['rejected', 'cancelled', 'paid'].includes(item.status) && <button onClick={() => setStatus(item, 'rejected')}><Ban size={15} /> Rad etish</button>}<button onClick={() => remove(item)}><Trash2 size={15} /> O‘chirish</button></div>}</>}</td></tr>)}</tbody></table>{loading && <div className="table-state"><span className="spinner spinner--blue" /> Yuklanmoqda...</div>}{!loading && !items.length && <div className="empty-state"><span><CircleDollarSign size={28} /></span><h3>Xarajat topilmadi</h3><p>Filterlarni o‘zgartiring yoki yangi xarajat qo‘shing.</p></div>}</div>
    </section>
    <ExpenseFormModal open={modal.open} item={modal.item} categories={categories} metadata={metadata} saving={saving} onClose={() => setModal({ open: false, item: null })} onSave={save} />
    <BudgetFormModal open={budgetOpen} month={filters.month} branches={metadata.branches} categories={categories} saving={saving} onClose={() => setBudgetOpen(false)} onSave={saveBudget} />
  </div>;
}
