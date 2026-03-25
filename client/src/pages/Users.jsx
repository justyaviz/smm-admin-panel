import React, { useState } from "react";
import { Plus, User } from "lucide-react";
import { api } from "../api";

export default function UsersPage({ users, onToast, reload }) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    login: "",
    password: "",
    role: "viewer"
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("users", form);
      await reload();
      setForm({
        full_name: "",
        phone: "",
        login: "",
        password: "",
        role: "viewer"
      });
      onToast("Yangi hodim yaratildi ✅", "success");
    } catch (err) {
      onToast(err.message || "Hodim yaratib bo‘lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <div className="section-head">
          <div>
            <div className="section-label">Jamoa</div>
            <h2>Hodim yaratish</h2>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Ism</span>
            <input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} required />
          </label>

          <label>
            <span>Telefon</span>
            <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} required />
          </label>

          <label>
            <span>Login</span>
            <input value={form.login} onChange={(e) => setField("login", e.target.value)} />
          </label>

          <label>
            <span>Parol</span>
            <input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} required />
          </label>

          <label>
            <span>Rol</span>
            <select value={form.role} onChange={(e) => setField("role", e.target.value)}>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="editor">editor</option>
              <option value="mobilograf">mobilograf</option>
              <option value="viewer">viewer</option>
            </select>
          </label>

          <button className="btn primary" type="submit" disabled={saving}>
            <Plus size={16} />
            {saving ? "Saqlanmoqda..." : "Hodim qo‘shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Hodimlar ro‘yxati</h2>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ism</th>
                <th>Telefon</th>
                <th>Login</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? (
                users.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name}</td>
                    <td>{row.phone}</td>
                    <td>{row.login || "-"}</td>
                    <td>{row.role}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-cell">Hozircha hodim yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
