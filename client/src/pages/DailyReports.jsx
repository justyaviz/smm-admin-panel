import React, { useState } from "react";
import { FileBarChart2, Plus } from "lucide-react";
import { api } from "../api";

export default function DailyReportsPage({ reports, branches, users, onToast, reload }) {
  const [form, setForm] = useState({
    report_date: "",
    branch_id: "",
    user_id: "",
    stories_count: 0,
    posts_count: 0,
    reels_count: 0,
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("daily-reports", form);
      await reload();
      setForm({
        report_date: "",
        branch_id: "",
        user_id: "",
        stories_count: 0,
        posts_count: 0,
        reels_count: 0,
        notes: ""
      });
      onToast("Saqlandi ✅", "success");
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <div className="section-head">
          <div>
            <div className="section-label">Filiallar</div>
            <h2>Kunlik filial hisobotini kiritish</h2>
            <p>Mobilograf har kuni filial bo‘yicha story, post va reels sonini kiritadi.</p>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
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
            <span>Stories</span>
            <input
              type="number"
              min="0"
              value={form.stories_count}
              onChange={(e) => setField("stories_count", Number(e.target.value))}
            />
          </label>

          <label>
            <span>Post</span>
            <input
              type="number"
              min="0"
              value={form.posts_count}
              onChange={(e) => setField("posts_count", Number(e.target.value))}
            />
          </label>

          <label>
            <span>Reels</span>
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

          <button className="btn primary" type="submit" disabled={saving}>
            <Plus size={16} />
            {saving ? "Saqlanmoqda..." : "Hisobotni saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Kiritilgan hisobotlar</h2>
          </div>
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
              {reports.length ? (
                reports.map((row) => (
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
                  <td colSpan="7" className="empty-cell">Hozircha ma’lumot yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
