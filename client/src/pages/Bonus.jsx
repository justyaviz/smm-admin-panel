import React, { useMemo, useState } from "react";
import Modal from "../components/ui/Modal";
import { api } from "../api";

export default function BonusPage({ bonuses, users, branches, onSaved, reload }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    user_id: "",
    month_label: "",
    work_date: "",
    branch_id: "",
    content_type: "",
    content_title: "",
    notes: "",
    units: 1
  });

  const totalAmount = useMemo(
    () => bonuses.reduce((sum, item) => sum + Number(item.total_amount || 0), 0),
    [bonuses]
  );

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("bonus-items", form);
      await api.recalcBonus();
      onSaved("Saqlandi ✅");
      setOpen(false);
      setForm({
        user_id: "",
        month_label: "",
        work_date: "",
        branch_id: "",
        content_type: "",
        content_title: "",
        notes: "",
        units: 1
      });
      await reload();
    } catch (e2) {
      onSaved(e2.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <div className="page-toolbar">
          <div>
            <div className="section-label">Bonus tizimi</div>
            <h2>Oylik bonuslar</h2>
            <p>Har 1 soni = 25,000 so‘m. Jami summa avtomatik hisoblanadi.</p>
          </div>
          <div className="toolbar-actions">
            <div className="summary-pill">
              Umumiy bonus: <strong>{totalAmount.toLocaleString()} so‘m</strong>
            </div>
            <button className="btn primary" onClick={() => setOpen(true)} type="button">
              Bonus qatori qo‘shish
            </button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hodim</th>
                <th>Oy</th>
                <th>Soni</th>
                <th>Birlik narx</th>
                <th>Jami summa</th>
              </tr>
            </thead>
            <tbody>
              {bonuses?.length ? (
                bonuses.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name}</td>
                    <td>{row.month_label}</td>
                    <td>{row.total_units}</td>
                    <td>{Number(row.unit_price || 0).toLocaleString()} so‘m</td>
                    <td>{Number(row.total_amount || 0).toLocaleString()} so‘m</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="empty-cell">
                    Hozircha bonus ma’lumoti yo‘q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Bonus qatori qo‘shish" onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Hodim</span>
            <select
              value={form.user_id}
              onChange={(e) => setField("user_id", e.target.value)}
              required
            >
              <option value="">Tanlang</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Oy</span>
            <input
              value={form.month_label}
              onChange={(e) => setField("month_label", e.target.value)}
              placeholder="2026-04"
              required
            />
          </label>

          <label>
            <span>Sana</span>
            <input
              type="date"
              value={form.work_date}
              onChange={(e) => setField("work_date", e.target.value)}
              required
            />
          </label>

          <label>
            <span>Filial</span>
            <select
              value={form.branch_id}
              onChange={(e) => setField("branch_id", e.target.value)}
            >
              <option value="">Tanlang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Kontent turi</span>
            <input
              value={form.content_type}
              onChange={(e) => setField("content_type", e.target.value)}
              placeholder="Story / Post / Reels"
              required
            />
          </label>

          <label>
            <span>Kontent nomi</span>
            <input
              value={form.content_title}
              onChange={(e) => setField("content_title", e.target.value)}
              placeholder="Kontent nomi"
            />
          </label>

          <label>
            <span>Soni</span>
            <input
              type="number"
              min="1"
              value={form.units}
              onChange={(e) => setField("units", Number(e.target.value))}
              required
            />
          </label>

          <label>
            <span>Birlik narx</span>
            <input disabled value="25,000 so‘m" />
          </label>

          <label>
            <span>Jami summa</span>
            <input
              disabled
              value={`${(Number(form.units || 0) * 25000).toLocaleString()} so‘m`}
            />
          </label>

          <label className="full-col">
            <span>Izoh</span>
            <input
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Izoh"
            />
          </label>

          <div className="modal-actions full-col">
            <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Saqlanmoqda..." : "Saqlash"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
