import React, { useState } from "react";
import Modal from "../components/ui/Modal";
import { api } from "../api";

export default function DailyReportsPage({ rows, branches, users, onSaved, reload }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    report_date: "",
    branch_id: "",
    user_id: "",
    stories_count: 0,
    posts_count: 0,
    reels_count: 0,
    notes: ""
  });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("daily-reports", form);
      onSaved("Saqlandi ✅");
      setOpen(false);
      setForm({
        report_date: "",
        branch_id: "",
        user_id: "",
        stories_count: 0,
        posts_count: 0,
        reels_count: 0,
        notes: ""
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
            <div className="section-label">Filial tahlili</div>
            <h2>Kunlik filial hisobotlari</h2>
            <p>Mobilograf har kuni stories, post va reels hisobotini kiritadi.</p>
          </div>
          <button className="btn primary" type="button" onClick={() => setOpen(true)}>
            Hisobot qo‘shish
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Filial</th>
                <th>Hodim</th>
                <th>Stories</th>
                <th>Post</th>
                <th>Reels</th>
                <th>Izoh</th>
              </tr>
            </thead>
            <tbody>
              {rows?.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.report_date}</td>
                    <td>{row.branch_name}</td>
                    <td>{row.user_name}</td>
                    <td>{row.stories_count}</td>
                    <td>{row.posts_count}</td>
                    <td>{row.reels_count}</td>
                    <td>{row.notes || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    Hozircha hisobot yo‘q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Kunlik hisobot qo‘shish" onClose={() => setOpen(false)}>
        <form className="form-grid" onSubmit={submit}>
          <label>
            <span>Sana</span>
            <input
              type="date"
              value={form.report_date}
              onChange={(e) => setField("report_date", e.target.value)}
              required
            />
          </label>

          <label>
            <span>Filial</span>
            <select
              value={form.branch_id}
              onChange={(e) => setField("branch_id", e.target.value)}
              required
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
            <span>Hodim</span>
            <select
              value={form.user_id}
              onChange={(e) => setField("user_id", e.target.value)}
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
            <span>Stories soni</span>
            <input
              type="number"
              min="0"
              value={form.stories_count}
              onChange={(e) => setField("stories_count", Number(e.target.value))}
            />
          </label>

          <label>
            <span>Post soni</span>
            <input
              type="number"
              min="0"
              value={form.posts_count}
              onChange={(e) => setField("posts_count", Number(e.target.value))}
            />
          </label>

          <label>
            <span>Reels soni</span>
            <input
              type="number"
              min="0"
              value={form.reels_count}
              onChange={(e) => setField("reels_count", Number(e.target.value))}
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
