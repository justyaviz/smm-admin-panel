const PERMISSION_OPTIONS = [
  { id: "dashboard", label: "Bosh sahifa" },
  { id: "content", label: "Kontent reja" },
  { id: "bonus", label: "Bonus tizimi" },
  { id: "dailyReports", label: "Kunlik filial hisobotlari" },
  { id: "campaigns", label: "Reklama kampaniyalari" },
  { id: "uploads", label: "Media kutubxona" },
  { id: "users", label: "Hodimlar" },
  { id: "tasks", label: "Vazifalar" },
  { id: "audit", label: "Audit log" },
  { id: "profile", label: "Profil" },
  { id: "settings", label: "Sozlamalar" }
];

function UsersPage({ users = [], onToast, reload }) {
  const emptyForm = {
    full_name: "",
    phone: "",
    login: "",
    password: "",
    role: "viewer",
    avatar_url: "",
    department_role: "",
    permissions_json: []
  };

  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function togglePermission(permissionId) {
    setForm((prev) => {
      const current = Array.isArray(prev.permissions_json) ? prev.permissions_json : [];
      const exists = current.includes(permissionId);
      return {
        ...prev,
        permissions_json: exists
          ? current.filter((p) => p !== permissionId)
          : [...current, permissionId]
      };
    });
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      full_name: row.full_name || "",
      phone: row.phone || "",
      login: row.login || "",
      password: "",
      role: row.role || "viewer",
      avatar_url: row.avatar_url || "",
      department_role: row.department_role || "",
      permissions_json: Array.isArray(row.permissions_json) ? row.permissions_json : []
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);

      if (editingId) {
        await api.users.update(editingId, {
          full_name: form.full_name,
          phone: form.phone,
          login: form.login,
          role: form.role,
          avatar_url: form.avatar_url,
          department_role: form.department_role,
          permissions_json: form.permissions_json
        });
        onToast("Hodim yangilandi ✅", "success");
      } else {
        await api.create("users", form);
        onToast("Yangi hodim yaratildi ✅", "success");
      }

      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function resetPassword(id) {
    try {
      await api.users.resetPassword(id);
      onToast("Parol 12345678 ga tiklandi", "success");
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    }
  }

  async function toggleActive(id) {
    try {
      await api.users.toggleActive(id);
      await reload();
      onToast("Holat yangilandi", "success");
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title={editingId ? "Hodimni tahrirlash" : "Hodim yaratish"}
          right={
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => api.exportFile("/api/export/users.xlsx", "users.xlsx")}
              >
                Excel export
              </button>
              {editingId ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}
            </div>
          }
        />

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

          {!editingId ? (
            <label>
              <span>Parol</span>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setField("password", e.target.value)}
                required
              />
            </label>
          ) : (
            <label>
              <span>Profil rasmi linki</span>
              <input
                value={form.avatar_url}
                onChange={(e) => setField("avatar_url", e.target.value)}
                placeholder="https://..."
              />
            </label>
          )}

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

          <label>
            <span>Lavozimi</span>
            <input
              value={form.department_role}
              onChange={(e) => setField("department_role", e.target.value)}
              placeholder="Masalan: Mobilograf, SMM manager, Dizayner"
            />
          </label>

          {!editingId ? (
            <label>
              <span>Profil rasmi linki</span>
              <input
                value={form.avatar_url}
                onChange={(e) => setField("avatar_url", e.target.value)}
                placeholder="https://..."
              />
            </label>
          ) : (
            <div />
          )}

          <div className="full-col permission-box">
            <div className="permission-title">Qaysi menyularga kirishi mumkin</div>
            <div className="permission-grid">
              {PERMISSION_OPTIONS.map((item) => (
                <label key={item.id} className="permission-item">
                  <input
                    type="checkbox"
                    checked={(form.permissions_json || []).includes(item.id)}
                    onChange={() => togglePermission(item.id)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editingId ? "Yangilash" : "Hodim qo‘shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Hodimlar ro‘yxati" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ism</th>
                <th>Telefon</th>
                <th>Login</th>
                <th>Rol</th>
                <th>Lavozim</th>
                <th>Ruxsatlar</th>
                <th>Holat</th>
                <th>Amallar</th>
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
                    <td>{row.department_role || "-"}</td>
                    <td>{Array.isArray(row.permissions_json) ? row.permissions_json.join(", ") : "-"}</td>
                    <td>{row.is_active ? "Faol" : "Bloklangan"}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn tiny" onClick={() => startEdit(row)}>
                          Tahrirlash
                        </button>
                        <button type="button" className="btn tiny" onClick={() => resetPassword(row.id)}>
                          Parol reset
                        </button>
                        <button
                          type="button"
                          className="btn tiny secondary"
                          onClick={() => toggleActive(row.id)}
                        >
                          {row.is_active ? "Bloklash" : "Faollashtirish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-cell">Hozircha ma’lumot yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
