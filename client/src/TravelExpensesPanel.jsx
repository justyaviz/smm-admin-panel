import React, { useMemo, useState } from "react";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import { api } from "./api";

const TRAVEL_EXPENSE_CATEGORIES = [
  { value: "transport", label: "Transport" },
  { value: "hamyon_toldirish", label: "Hamyon to'ldirish" },
  { value: "taksi", label: "Taksi" },
  { value: "restoran_va_kafelar", label: "Restoran va kafelar" },
  { value: "karta_toldirish", label: "Karta to'ldirish" },
  { value: "xarid", label: "Xarid" },
  { value: "kategoriya_yoq", label: "Kategoriya yo'q" }
];

const TRAVEL_EXPENSE_TYPES = [
  { value: "chiqim", label: "Chiqim" },
  { value: "kirim", label: "Kirim" }
];

const CURRENCY_OPTIONS = ["UZS", "USD", "EUR", "RUB"];

function formatDate(value) {
  if (!value) return "-";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (value.includes("T")) return value.slice(0, 10);
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}

function getMonthLabel(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getMonthTitle(monthLabel) {
  const [year, month] = String(monthLabel || getMonthLabel()).split("-");
  const names = {
    "01": "Yanvar",
    "02": "Fevral",
    "03": "Mart",
    "04": "Aprel",
    "05": "May",
    "06": "Iyun",
    "07": "Iyul",
    "08": "Avgust",
    "09": "Sentabr",
    "10": "Oktabr",
    "11": "Noyabr",
    "12": "Dekabr"
  };
  return `${names[month] || month} ${year || ""}`.trim();
}

function getDateSortValue(value, fallback = Number.POSITIVE_INFINITY) {
  if (!value) return fallback;
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? fallback : time;
}

function sortRowsByDate(rows = [], dateKey = "expense_date", direction = "asc") {
  const fallback = direction === "desc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  return [...(rows || [])].sort((a, b) => {
    const aTime = getDateSortValue(a?.[dateKey], fallback);
    const bTime = getDateSortValue(b?.[dateKey], fallback);
    if (aTime === bTime) return Number(a?.id || 0) - Number(b?.id || 0);
    return direction === "desc" ? bTime - aTime : aTime - bTime;
  });
}

function formatAmount(amount = 0, currency = "UZS") {
  const value = Number(amount || 0);
  try {
    return new Intl.NumberFormat("uz-UZ", {
      style: "currency",
      currency: currency || "UZS",
      maximumFractionDigits: 0
    }).format(value);
  } catch {
    return `${value.toLocaleString("uz-UZ")} ${currency || ""}`.trim();
  }
}

function categoryLabel(value) {
  return TRAVEL_EXPENSE_CATEGORIES.find((item) => item.value === value)?.label || "Kategoriya yo'q";
}

function typeLabel(value) {
  return TRAVEL_EXPENSE_TYPES.find((item) => item.value === value)?.label || value || "-";
}

function SectionTitle({ title, desc, right }) {
  return (
    <div className="section-title-row">
      <div>
        <h2>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      {right}
    </div>
  );
}

function StatCard({ title, value, hint, tone = "default" }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <span className={`stat-card-indicator stat-card-indicator-${tone}`} />
      <div className="stat-card-title">{title}</div>
      <div className="stat-card-value">{value}</div>
      {hint ? <div className="stat-card-hint">{hint}</div> : null}
    </div>
  );
}

function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`modal-card ${wide ? "wide" : ""}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function IconActions({ onView, onEdit, onDelete }) {
  return (
    <div className="icon-actions">
      {onView ? (
        <button type="button" className="icon-btn" onClick={onView} title="Ko'rish">
          <Eye size={16} />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className="icon-btn" onClick={onEdit} title="Tahrirlash">
          <Pencil size={16} />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="icon-btn danger" onClick={onDelete} title="O'chirish">
          <Trash2 size={16} />
        </button>
      ) : null}
    </div>
  );
}

export default function TravelExpensesPanel({ travelExpenses = [], onToast, reload }) {
  const emptyForm = {
    expense_date: "",
    category: "transport",
    title: "",
    amount: "",
    currency: "UZS",
    entry_type: "chiqim"
  };

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [monthFilter, setMonthFilter] = useState(getMonthLabel());

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      expense_date: formatDate(row.expense_date) === "-" ? "" : formatDate(row.expense_date),
      category: row.category || "transport",
      title: row.title || "",
      amount: row.amount || "",
      currency: row.currency || "UZS",
      entry_type: row.entry_type || "chiqim"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        amount: Number(form.amount || 0)
      };

      if (editRow?.id) {
        await api.update("travel-expenses", editRow.id, payload);
        onToast("Safar harajati yangilandi", "success");
      } else {
        await api.create("travel-expenses", payload);
        onToast("Safar harajati saqlandi", "success");
      }

      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Safar harajatini saqlab bo'lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    if (!window.confirm("Safar harajati rostdan ham o'chirilsinmi?")) return;
    try {
      await api.remove("travel-expenses", id);
      await reload();
      onToast("Safar harajati o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "Safar harajatini o'chirib bo'lmadi", "error");
    }
  }

  async function exportPdf() {
    try {
      const query = monthFilter ? `?month=${encodeURIComponent(monthFilter)}` : "";
      await api.exportFile(`/api/export/travel-expenses.pdf${query}`, `travel-expenses-${monthFilter || "all"}.pdf`);
      onToast("PDF tayyorlandi", "success");
    } catch (err) {
      onToast(err.message || "PDF tayyorlab bo'lmadi", "error");
    }
  }

  const nextId = useMemo(
    () => travelExpenses.reduce((max, row) => Math.max(max, Number(row.id || 0)), 0) + 1,
    [travelExpenses]
  );

  const monthOptions = [...new Set([
    getMonthLabel(),
    ...travelExpenses.map((item) => formatDate(item.expense_date).slice(0, 7)).filter((item) => item && item !== "-")
  ])];

  const filteredRows = useMemo(() => sortRowsByDate(
    travelExpenses.filter((item) => !monthFilter || formatDate(item.expense_date).startsWith(monthFilter)),
    "expense_date",
    "asc"
  ), [travelExpenses, monthFilter]);

  const expenseCount = filteredRows.filter((item) => item.entry_type === "chiqim").length;
  const incomeCount = filteredRows.filter((item) => item.entry_type === "kirim").length;

  return (
    <>
      <div className="card">
        <SectionTitle
          title={editRow ? `Safar harajatini tahrirlash (ID #${editRow.id})` : "Safar harajati qo'shish"}
          desc={editRow ? "Mavjud yozuvni yangilash" : `Keyingi ID: #${nextId}`}
          right={editRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null}
        />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Harajat qo'shish (ID)</span>
            <input value={editRow?.id || nextId} readOnly />
          </label>
          <div />
          <div />
          <label><span>Sana</span><input type="date" value={form.expense_date} onChange={(e) => setField("expense_date", e.target.value)} required /></label>
          <label>
            <span>Kategoriya</span>
            <select value={form.category} onChange={(e) => setField("category", e.target.value)}>
              {TRAVEL_EXPENSE_CATEGORIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label><span>Nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required placeholder="Harajat nomi" /></label>
          <label><span>Summa</span><input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setField("amount", e.target.value)} required /></label>
          <label>
            <span>Valyuta</span>
            <select value={form.currency} onChange={(e) => setField("currency", e.target.value)}>
              {CURRENCY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label>
            <span>Turi</span>
            <select value={form.entry_type} onChange={(e) => setField("entry_type", e.target.value)}>
              {TRAVEL_EXPENSE_TYPES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Saqlash"}</button>
        </form>
      </div>

      <div className="stats-grid">
        <StatCard title="Safar harajatlari" value={filteredRows.length} hint={getMonthTitle(monthFilter)} tone="info" />
        <StatCard title="Chiqim yozuvlari" value={expenseCount} hint="harajat sifatida belgilangan" tone="danger" />
        <StatCard title="Kirim yozuvlari" value={incomeCount} hint="qaytim yoki kirim" tone="success" />
      </div>

      <div className="card">
        <SectionTitle
          title="Safar harajatlari ro'yxati"
          desc={getMonthTitle(monthFilter)}
          right={(
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                {monthOptions.map((item) => <option key={item} value={item}>{getMonthTitle(item)}</option>)}
              </select>
              <button type="button" className="btn secondary" onClick={exportPdf}>PDF saqlash</button>
            </div>
          )}
        />
        <div className="table-wrap desktop-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Sana</th>
                <th>Kategoriya</th>
                <th>Nomi</th>
                <th>Summa</th>
                <th>Valyuta</th>
                <th>Turi</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? filteredRows.map((row) => (
                <tr key={row.id}>
                  <td>#{row.id}</td>
                  <td>{formatDate(row.expense_date)}</td>
                  <td>{categoryLabel(row.category)}</td>
                  <td>{row.title}</td>
                  <td>{formatAmount(row.amount, row.currency)}</td>
                  <td>{row.currency}</td>
                  <td>
                    <span className={row.entry_type === "kirim" ? "mini-badge success" : "mini-badge danger"}>
                      {typeLabel(row.entry_type)}
                    </span>
                  </td>
                  <td>
                    <IconActions onView={() => setViewRow(row)} onEdit={() => startEdit(row)} onDelete={() => removeRow(row.id)} />
                  </td>
                </tr>
              )) : <tr><td colSpan="8" className="empty-cell">Hozircha safar harajati yo'q</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {filteredRows.length ? filteredRows.map((row) => (
            <div key={row.id} className="mobile-record-card">
              <div className="mobile-record-head">
                <div className="mobile-record-title">
                  <strong>{row.title}</strong>
                  <span>#{row.id} • {formatDate(row.expense_date)}</span>
                </div>
                <span className={row.entry_type === "kirim" ? "mini-badge success" : "mini-badge danger"}>
                  {typeLabel(row.entry_type)}
                </span>
              </div>
              <div className="mobile-record-grid">
                <div className="mobile-record-field">
                  <label>Kategoriya</label>
                  <div>{categoryLabel(row.category)}</div>
                </div>
                <div className="mobile-record-field">
                  <label>Summa</label>
                  <div>{formatAmount(row.amount, row.currency)}</div>
                </div>
                <div className="mobile-record-field">
                  <label>Valyuta</label>
                  <div>{row.currency}</div>
                </div>
              </div>
              <div className="mobile-record-actions">
                <IconActions onView={() => setViewRow(row)} onEdit={() => startEdit(row)} onDelete={() => removeRow(row.id)} />
              </div>
            </div>
          )) : <div className="mobile-record-card empty">Hozircha safar harajati yo'q</div>}
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Safar harajati tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>ID:</strong> #{viewRow.id}</div>
            <div><strong>Sana:</strong> {formatDate(viewRow.expense_date)}</div>
            <div><strong>Kategoriya:</strong> {categoryLabel(viewRow.category)}</div>
            <div><strong>Nomi:</strong> {viewRow.title}</div>
            <div><strong>Summa:</strong> {formatAmount(viewRow.amount, viewRow.currency)}</div>
            <div><strong>Valyuta:</strong> {viewRow.currency}</div>
            <div className="full-col"><strong>Turi:</strong> {typeLabel(viewRow.entry_type)}</div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}
