import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  FileBarChart2,
  FolderKanban,
  Gift,
  Home,
  Image,
  LayoutGrid,
  LineChart,
  LogOut,
  Megaphone,
  Moon,
  Search,
  Settings,
  SunMedium,
  User,
  Users as UsersIcon,
  ShieldCheck,
  X
} from "lucide-react";
import { api, clearAuth, getCurrentUser } from "./api";

const MENU = [
  { id: "dashboard", title: "Bosh sahifa", icon: Home },
  { id: "kpi", title: "KPI va natijalar", icon: LineChart },
  { id: "content", title: "Kontent reja", icon: LayoutGrid },
  { id: "dailyReports", title: "Kunlik filial hisobotlari", icon: FileBarChart2 },
  { id: "campaigns", title: "Reklama kampaniyalari", icon: Megaphone },
  { id: "bonus", title: "Bonus tizimi", icon: Gift },
  { id: "uploads", title: "Media kutubxona", icon: Image },
  { id: "users", title: "Hodimlar", icon: UsersIcon },
  { id: "tasks", title: "Vazifalar", icon: FolderKanban },
  { id: "audit", title: "Audit log", icon: ShieldCheck },
  { id: "settings", title: "Sozlamalar", icon: Settings }
];

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 2200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type || "success"}`}>
      <span>{toast.message}</span>
      <button type="button" onClick={onClose}>
        <X size={16} />
      </button>
    </div>
  );
}

function ThemeToggle({ theme, setTheme }) {
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}
    </button>
  );
}

function NotificationsDrawer({ open, onClose, notifications, onRead, onReadAll }) {
  return (
    <div className={`drawer ${open ? "open" : ""}`}>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-head">
          <div>
            <div className="small-label">Bildirishnomalar</div>
            <h3>So‘nggi yangiliklar</h3>
          </div>
          <button type="button" className="btn secondary" onClick={onReadAll}>
            Hammasini o‘qildi
          </button>
        </div>

        <div className="drawer-list">
          {notifications.length ? (
            notifications.map((item) => (
              <div key={item.id} className={`notif-card ${item.is_read ? "read" : ""}`}>
                <div className="notif-title">{item.title}</div>
                <div className="notif-body">{item.body}</div>
                <div className="notif-footer">
                  <span>{item.type}</span>
                  {!item.is_read ? (
                    <button type="button" className="link-btn" onClick={() => onRead(item.id)}>
                      O‘qildi
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-block">Hozircha bildirishnoma yo‘q</div>
          )}
        </div>
      </div>
    </div>
  );
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

function StatCard({ title, value, hint }) {
  return (
    <div className="stat-card">
      <div className="stat-card-title">{title}</div>
      <div className="stat-card-value">{value}</div>
      {hint ? <div className="stat-card-hint">{hint}</div> : null}
    </div>
  );
}

function LoginPage({ onLoggedIn }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const data = await api.login({ phone, password });
      onLoggedIn(data.user);
    } catch (err) {
      setError(err.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-copy">
        <div className="brand-kicker">aloo • yagona platforma</div>
        <h1>Asalomu alaykum</h1>
        <h2>aloo do‘konlar tarmog‘i SMM jamoasi yagona ma’lumotlar platformasiga xush kelibsiz</h2>
        <p>Kirish uchun login va parolingizni kiriting.</p>
      </div>

      <form className="login-card" onSubmit={submit}>
        <div className="small-label">Kirish</div>
        <div className="login-title">Xush kelibsiz</div>

        <label>
          <span>Telefon raqam yoki login</span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="998939000 yoki admin"
          />
        </label>

        <label>
          <span>Parol</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Parol"
          />
        </label>

        {error ? <div className="error-box">{error}</div> : null}

        <button type="submit" className="btn primary large" disabled={loading}>
          {loading ? "Kirilmoqda..." : "Kirish"}
        </button>
      </form>
    </div>
  );
}

function DashboardPage({ summary, kpiSummary, dailyReports, bonuses, campaigns, tasks }) {
  return (
    <div className="page-grid">
      <div className="hero-banner">
        <div>
          <div className="small-label">Boshqaruv markazi</div>
          <h1>aloo SMM jamoasi platformasi</h1>
          <p>Kontent, bonus, filial hisobotlari va kampaniyalarni bitta joydan boshqaring.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Joriy oy KPI"
          value={`${Number(kpiSummary?.total_kpi || 0).toFixed(1)}%`}
          hint="umumiy KPI"
        />
        <StatCard
          title="Joriy oy bonus"
          value={`${Number(summary?.total_bonus_amount || 0).toLocaleString()} so‘m`}
          hint="umumiy bonus"
        />
        <StatCard
          title="Bugungi filial hisobotlari"
          value={summary?.today_report_count || 0}
          hint="bugungi ma’lumot"
        />
        <StatCard
          title="Kechikkan vazifalar"
          value={kpiSummary?.late_tasks || 0}
          hint="deadline o‘tgan"
        />
      </div>

      <div className="two-grid">
        <div className="card">
          <SectionTitle title="So‘nggi filial hisobotlari" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Filial</th>
                  <th>Stories</th>
                  <th>Post</th>
                  <th>Reels</th>
                </tr>
              </thead>
              <tbody>
                {dailyReports.slice(0, 5).map((row) => (
                  <tr key={row.id}>
                    <td>{row.report_date}</td>
                    <td>{row.branch_name}</td>
                    <td>{row.stories_count}</td>
                    <td>{row.posts_count}</td>
                    <td>{row.reels_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <SectionTitle title="Tezkor holat" />
          <div className="quick-list">
            <div className="quick-item">Bonus yozuvlari: <strong>{bonuses.length}</strong></div>
            <div className="quick-item">Kampaniyalar: <strong>{campaigns.length}</strong></div>
            <div className="quick-item">Vazifalar: <strong>{tasks.length}</strong></div>
            <div className="quick-item">Kontentlar: <strong>{summary?.content_count || 0}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiPage({ kpiSummary, kpiEmployees, kpiBranches, kpiContentTypes }) {
  return (
    <div className="page-grid">
      <div className="stats-grid">
        <StatCard title="Umumiy KPI" value={`${Number(kpiSummary?.total_kpi || 0).toFixed(1)}%`} />
        <StatCard title="Kontent KPI" value={`${Number(kpiSummary?.content_score || 0).toFixed(1)}%`} />
        <StatCard title="Hisobot KPI" value={`${Number(kpiSummary?.report_score || 0).toFixed(1)}%`} />
        <StatCard title="Intizom KPI" value={`${Number(kpiSummary?.discipline_score || 0).toFixed(1)}%`} />
      </div>

      <div className="two-grid">
        <div className="card">
          <SectionTitle title="Hodimlar bo‘yicha KPI" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Hodim</th>
                  <th>Posted</th>
                  <th>Hisobot</th>
                  <th>Done task</th>
                </tr>
              </thead>
              <tbody>
                {kpiEmployees.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name}</td>
                    <td>{row.posted_content}</td>
                    <td>{row.reports_count}</td>
                    <td>{row.done_tasks}/{row.total_tasks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <SectionTitle title="Filiallar bo‘yicha KPI" />
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Filial</th>
                  <th>Stories</th>
                  <th>Post</th>
                  <th>Reels</th>
                </tr>
              </thead>
              <tbody>
                {kpiBranches.map((row) => (
                  <tr key={row.id}>
                    <td>{row.name}</td>
                    <td>{row.stories_count}</td>
                    <td>{row.posts_count}</td>
                    <td>{row.reels_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionTitle title="Kontent turlari bo‘yicha KPI" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kontent turi</th>
                <th>Jami</th>
                <th>Posted</th>
              </tr>
            </thead>
            <tbody>
              {kpiContentTypes.map((row, idx) => (
                <tr key={idx}>
                  <td>{row.content_type}</td>
                  <td>{row.total_count}</td>
                  <td>{row.posted_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function BonusPage({ bonuses, bonusItems, users, branches, onToast, reload }) {
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

  const [saving, setSaving] = useState(false);
  const [monthFilter, setMonthFilter] = useState("");

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredItems = monthFilter
    ? bonusItems.filter((item) => item.month_label === monthFilter)
    : bonusItems;

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("bonus-items", form);
      await api.recalcBonus();
      await reload();
      onToast("Saqlandi ✅", "success");
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
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  const totalBonus = bonuses.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Bonus tizimi"
          desc="1 soni = 25,000 so‘m"
          right={
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => api.exportFile("/api/export/bonuses.xlsx", "bonuses.xlsx")}
              >
                Excel export
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => api.exportFile("/api/export/bonuses.pdf", "bonuses.pdf")}
              >
                PDF export
              </button>
            </div>
          }
        />

        <div className="summary-pill">
          Umumiy bonus: <strong>{totalBonus.toLocaleString()} so‘m</strong>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Hodim</span>
            <select value={form.user_id} onChange={(e) => setField("user_id", e.target.value)} required>
              <option value="">Tanlang</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
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
            <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)}>
              <option value="">Tanlang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
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
            <input value="25,000 so‘m" disabled />
          </label>

          <label>
            <span>Jami summa</span>
            <input value={`${(Number(form.units || 0) * 25000).toLocaleString()} so‘m`} disabled />
          </label>

          <label className="full-col">
            <span>Izoh</span>
            <input value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle
          title="Bonus yozuvlari"
          right={
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              <option value="">Barcha oylar</option>
              {[...new Set(bonusItems.map((i) => i.month_label).filter(Boolean))].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          }
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Filial</th>
                <th>Hodim</th>
                <th>Kontent turi</th>
                <th>Kontent nomi</th>
                <th>Izoh</th>
                <th>Soni</th>
                <th>Birlik narx</th>
                <th>Jami</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length ? (
                filteredItems.map((row) => (
                  <tr key={row.id}>
                    <td>{row.work_date}</td>
                    <td>{row.branch_name || "-"}</td>
                    <td>{row.full_name}</td>
                    <td>{row.content_type}</td>
                    <td>{row.content_title || "-"}</td>
                    <td>{row.notes || "-"}</td>
                    <td>{row.units}</td>
                    <td>{Number(row.unit_price || 0).toLocaleString()}</td>
                    <td>{Number(row.amount || 0).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9" className="empty-cell">Hozircha ma’lumot yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DailyReportsPage({ reports, branches, users, onToast, reload }) {
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

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("daily-reports", form);
      await reload();
      onToast("Saqlandi ✅", "success");
      setForm({
        report_date: "",
        branch_id: "",
        user_id: "",
        stories_count: 0,
        posts_count: 0,
        reels_count: 0,
        notes: ""
      });
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Kunlik filial hisobotlari"
          right={
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => api.exportFile("/api/export/daily-reports.xlsx", "daily-reports.xlsx")}
              >
                Excel export
              </button>
              <button
                type="button"
                className="btn secondary"
                onClick={() => api.exportFile("/api/export/daily-reports.pdf", "daily-reports.pdf")}
              >
                PDF export
              </button>
            </div>
          }
        />

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
            <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)} required>
              <option value="">Tanlang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Hodim</span>
            <select value={form.user_id} onChange={(e) => setField("user_id", e.target.value)}>
              <option value="">Tanlang</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
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
            <input value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Hisobotni saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Kiritilgan hisobotlar" />
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

function MediaPage({ uploads, onToast, reload }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    try {
      setSaving(true);
      await api.uploadFile(file);
      await reload();
      setFile(null);
      onToast("Fayl yuklandi ✅", "success");
    } catch (err) {
      onToast(err.message || "Yuklashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Media kutubxona" />
        <form className="upload-row" onSubmit={handleUpload}>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn primary" type="submit" disabled={!file || saving}>
            {saving ? "Yuklanmoqda..." : "Yuklash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Yuklangan fayllar" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fayl</th>
                <th>Turi</th>
                <th>Hajmi</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length ? (
                uploads.map((row) => (
                  <tr key={row.id}>
                    <td>{row.original_name}</td>
                    <td>{row.mime_type}</td>
                    <td>{row.file_size}</td>
                    <td>
                      <a href={row.file_url} target="_blank" rel="noreferrer">Ochish</a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-cell">Hozircha ma’lumot yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function UsersPage({ users, onToast, reload }) {
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    login: "",
    password: "",
    role: "viewer"
  });

  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("users", form);
      await reload();
      onToast("Yangi hodim yaratildi ✅", "success");
      setForm({
        full_name: "",
        phone: "",
        login: "",
        password: "",
        role: "viewer"
      });
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
          title="Hodim yaratish"
          right={
            <button
              type="button"
              className="btn secondary"
              onClick={() => api.exportFile("/api/export/users.xlsx", "users.xlsx")}
            >
              Excel export
            </button>
          }
        />
        <form className="form-grid" onSubmit={handleCreate}>
          <label><span>Ism</span><input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} required /></label>
          <label><span>Telefon</span><input value={form.phone} onChange={(e) => setField("phone", e.target.value)} required /></label>
          <label><span>Login</span><input value={form.login} onChange={(e) => setField("login", e.target.value)} /></label>
          <label><span>Parol</span><input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} required /></label>
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
            {saving ? "Saqlanmoqda..." : "Hodim qo‘shish"}
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
                    <td>{row.is_active ? "Faol" : "Bloklangan"}</td>
                    <td>
                      <div className="table-actions">
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
                  <td colSpan="6" className="empty-cell">Hozircha ma’lumot yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CampaignsPage({ campaigns, onToast, reload }) {
  const [form, setForm] = useState({
    title: "",
    platform: "",
    start_date: "",
    end_date: "",
    budget: 0,
    spend: 0,
    leads: 0,
    sales: 0,
    ctr: 0,
    revenue_amount: 0,
    status: "active",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("campaigns", form);
      await reload();
      onToast("Kampaniya saqlandi ✅", "success");
      setForm({
        title: "",
        platform: "",
        start_date: "",
        end_date: "",
        budget: 0,
        spend: 0,
        leads: 0,
        sales: 0,
        ctr: 0,
        revenue_amount: 0,
        status: "active",
        notes: ""
      });
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Reklama kampaniyasi"
          right={
            <button
              type="button"
              className="btn secondary"
              onClick={() => api.exportFile("/api/export/campaigns.xlsx", "campaigns.xlsx")}
            >
              Excel export
            </button>
          }
        />
        <form className="form-grid" onSubmit={handleCreate}>
          <label><span>Kampaniya nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label><span>Platforma</span><input value={form.platform} onChange={(e) => setField("platform", e.target.value)} required /></label>
          <label><span>Start sana</span><input type="date" value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} /></label>
          <label><span>End sana</span><input type="date" value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} /></label>
          <label><span>Byudjet</span><input type="number" value={form.budget} onChange={(e) => setField("budget", Number(e.target.value))} /></label>
          <label><span>Sarf</span><input type="number" value={form.spend} onChange={(e) => setField("spend", Number(e.target.value))} /></label>
          <label><span>Lead</span><input type="number" value={form.leads} onChange={(e) => setField("leads", Number(e.target.value))} /></label>
          <label><span>Sotuv</span><input type="number" value={form.sales} onChange={(e) => setField("sales", Number(e.target.value))} /></label>
          <label><span>CTR</span><input type="number" value={form.ctr} onChange={(e) => setField("ctr", Number(e.target.value))} /></label>
          <label><span>Daromad</span><input type="number" value={form.revenue_amount} onChange={(e) => setField("revenue_amount", Number(e.target.value))} /></label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="done">done</option>
            </select>
          </label>
          <label className="full-col"><span>Izoh</span><input value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></label>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Kampaniya qo‘shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Kampaniyalar ro‘yxati" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kampaniya</th>
                <th>Platforma</th>
                <th>Byudjet</th>
                <th>Sarf</th>
                <th>ROI</th>
                <th>CTR</th>
                <th>CPA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length ? (
                campaigns.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.platform}</td>
                    <td>{row.budget}</td>
                    <td>{row.spend}</td>
                    <td>{row.roi}</td>
                    <td>{row.ctr}</td>
                    <td>{row.cpa}</td>
                    <td>{row.status}</td>
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

function TasksPage({ tasks, users, onToast, reload }) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    due_date: "",
    assignee_user_id: ""
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("tasks", form);
      await reload();
      onToast("Vazifa saqlandi ✅", "success");
      setForm({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        due_date: "",
        assignee_user_id: ""
      });
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Vazifa yaratish" />
        <form className="form-grid" onSubmit={handleCreate}>
          <label><span>Vazifa</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="todo">todo</option>
              <option value="doing">doing</option>
              <option value="done">done</option>
            </select>
          </label>
          <label>
            <span>Muhimlik</span>
            <select value={form.priority} onChange={(e) => setField("priority", e.target.value)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label><span>Muddat</span><input type="date" value={form.due_date} onChange={(e) => setField("due_date", e.target.value)} /></label>
          <label>
            <span>Mas’ul</span>
            <select value={form.assignee_user_id} onChange={(e) => setField("assignee_user_id", e.target.value)}>
              <option value="">Tanlang</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </label>
          <label className="full-col"><span>Izoh</span><input value={form.description} onChange={(e) => setField("description", e.target.value)} /></label>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Vazifa qo‘shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Vazifalar ro‘yxati" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vazifa</th>
                <th>Status</th>
                <th>Muhimlik</th>
                <th>Muddat</th>
                <th>Mas’ul</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length ? (
                tasks.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>{row.priority}</td>
                    <td>{row.due_date || "-"}</td>
                    <td>{row.assignee_name || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-cell">Hozircha ma’lumot yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function getMonthLabel(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getMonthTitle(monthLabel) {
  const [year, month] = monthLabel.split("-");
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
  return `${names[month]} ${year}`;
}

function shiftMonth(monthLabel, step) {
  const [y, m] = monthLabel.split("-").map(Number);
  const d = new Date(y, m - 1 + step, 1);
  return getMonthLabel(d);
}

function ContentPage({ users, branches, onToast }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthLabel());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    platform: "Instagram",
    content_type: "post",
    status: "rejalashtirilgan",
    publish_date: "",
    branch_id: "",
    notes: "",
    bonus_enabled: false,
    assigned_user_id: "",
    video_editor_user_id: "",
    video_face_user_id: "",
    proposal_count: 0,
    approved_count: 0
  });

  const isVideo = form.content_type === "video";

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function loadMonth(monthValue = selectedMonth) {
    try {
      setLoading(true);
      const data = await api.contentByMonth(monthValue);
      setRows(data || []);
    } catch (err) {
      onToast(err.message || "Kontent rejani olib bo‘lmadi", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonth(selectedMonth);
  }, [selectedMonth]);

  async function handleSubmit(e) {
    e.preventDefault();

    try {
      setSaving(true);

      const payload = {
        ...form,
        publish_date: form.publish_date || null,
        branch_id: form.branch_id || null,
        assigned_user_id: isVideo ? null : form.assigned_user_id || null,
        video_editor_user_id: isVideo ? form.video_editor_user_id || null : null,
        video_face_user_id: isVideo ? form.video_face_user_id || null : null,
        proposal_count: Number(form.proposal_count || 0),
        approved_count: Number(form.approved_count || 0)
      };

      await api.createContentPlan(payload);
      await loadMonth(selectedMonth);

      setForm({
        title: "",
        platform: "Instagram",
        content_type: "post",
        status: "rejalashtirilgan",
        publish_date: "",
        branch_id: "",
        notes: "",
        bonus_enabled: false,
        assigned_user_id: "",
        video_editor_user_id: "",
        video_face_user_id: "",
        proposal_count: 0,
        approved_count: 0
      });

      onToast("Kontent reja saqlandi ✅", "success");
    } catch (err) {
      onToast(err.message || "Kontent rejani saqlab bo‘lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o‘chirilsinmi?");
    if (!ok) return;

    try {
      await api.deleteContentPlan(id);
      await loadMonth(selectedMonth);
      onToast("Kontent o‘chirildi", "success");
    } catch (err) {
      onToast(err.message || "O‘chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Kontent reja"
          desc={`${getMonthTitle(selectedMonth)} uchun reja`}
          right={
            <div className="toolbar-actions">
              <button
                type="button"
                className="btn secondary"
                onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
              >
                ← Oldingi oy
              </button>

              <div className="summary-pill">
                <strong>{getMonthTitle(selectedMonth)}</strong>
              </div>

              <button
                type="button"
                className="btn secondary"
                onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
              >
                Keyingi oy →
              </button>
            </div>
          }
        />

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Kontent nomi</span>
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Masalan: Aksiya uchun reels"
              required
            />
          </label>

          <label>
            <span>Platforma</span>
            <select value={form.platform} onChange={(e) => setField("platform", e.target.value)}>
              <option value="Instagram">Instagram</option>
              <option value="Telegram">Telegram</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
            </select>
          </label>

          <label>
            <span>Kontent turi</span>
            <select value={form.content_type} onChange={(e) => setField("content_type", e.target.value)}>
              <option value="post">Post</option>
              <option value="story">Story</option>
              <option value="reels">Reels</option>
              <option value="video">Video</option>
              <option value="banner">Banner</option>
              <option value="design">Dizayn</option>
              <option value="copywriting">Copywriting</option>
            </select>
          </label>

          <label>
            <span>Status</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="rejalashtirilgan">Rejalashtirilgan</option>
              <option value="jarayonda">Jarayonda</option>
              <option value="tayyor">Tayyor</option>
              <option value="joylandi">Joylandi</option>
              <option value="bekor_qilindi">Bekor qilindi</option>
            </select>
          </label>

          <label>
            <span>Sana</span>
            <input
              type="date"
              value={form.publish_date}
              onChange={(e) => setField("publish_date", e.target.value)}
              required
            />
          </label>

          <label>
            <span>Filial</span>
            <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)}>
              <option value="">Tanlang</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>

          {isVideo ? (
            <>
              <label>
                <span>Montaj kim qildi?</span>
                <select
                  value={form.video_editor_user_id}
                  onChange={(e) => setField("video_editor_user_id", e.target.value)}
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
                <span>Ovoz + face kim?</span>
                <select
                  value={form.video_face_user_id}
                  onChange={(e) => setField("video_face_user_id", e.target.value)}
                >
                  <option value="">Tanlang</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <label>
              <span>Mas’ul hodim</span>
              <select
                value={form.assigned_user_id}
                onChange={(e) => setField("assigned_user_id", e.target.value)}
              >
                <option value="">Tanlang</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label>
            <span>Taklif soni</span>
            <input
              type="number"
              min="0"
              value={form.proposal_count}
              onChange={(e) => setField("proposal_count", Number(e.target.value))}
            />
          </label>

          <label>
            <span>Tasdiq soni</span>
            <input
              type="number"
              min="0"
              value={form.approved_count}
              onChange={(e) => setField("approved_count", Number(e.target.value))}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.bonus_enabled}
              onChange={(e) => setField("bonus_enabled", e.target.checked)}
            />
            <span>Bonusga o‘tsinmi</span>
          </label>

          <label className="full-col">
            <span>Izoh</span>
            <input
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Qo‘shimcha izoh"
            />
          </label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Kontentni saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle
          title={`${getMonthTitle(selectedMonth)} rejalari`}
          right={
            <button
              type="button"
              className="btn secondary"
              onClick={() => api.exportFile("/api/export/content.xlsx", `content-${selectedMonth}.xlsx`)}
            >
              Excel export
            </button>
          }
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Filial</th>
                <th>Platforma</th>
                <th>Turi</th>
                <th>Kontent nomi</th>
                <th>Status</th>
                <th>Mas’ul</th>
                <th>Bonus</th>
                <th>Taklif</th>
                <th>Tasdiq</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="11" className="empty-cell">Yuklanmoqda...</td>
                </tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.publish_date || "-"}</td>
                    <td>{row.branch_name || "-"}</td>
                    <td>{row.platform || "-"}</td>
                    <td>{row.content_type}</td>
                    <td>{row.title}</td>
                    <td>{row.status}</td>
                    <td>
                      {row.content_type === "video"
                        ? `${row.video_editor_name || "-"} / ${row.video_face_name || "-"}`
                        : row.assignee_name || "-"}
                    </td>
                    <td>{row.bonus_enabled ? "Ha" : "Yo‘q"}</td>
                    <td>{row.proposal_count || 0}</td>
                    <td>{row.approved_count || 0}</td>
                    <td>
                      <button
                        type="button"
                        className="btn tiny secondary"
                        onClick={() => removeRow(row.id)}
                      >
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11" className="empty-cell">Bu oy uchun reja yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuditPage({ logs }) {
  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Audit log" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kim</th>
                <th>Amal</th>
                <th>Entity</th>
                <th>ID</th>
                <th>Sana</th>
              </tr>
            </thead>
            <tbody>
              {logs.length ? (
                logs.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name || "-"}</td>
                    <td>{row.action_type}</td>
                    <td>{row.entity_type}</td>
                    <td>{row.entity_id || "-"}</td>
                    <td>{row.created_at}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="empty-cell">Hozircha ma’lumot yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SettingsPage({ settings, onSave, saving, theme, setTheme }) {
  const [form, setForm] = useState(settings || {});

  useEffect(() => {
    setForm(settings || {});
  }, [settings]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Sozlamalar" right={<ThemeToggle theme={theme} setTheme={setTheme} />} />
        <div className="form-grid">
          <label><span>Kompaniya nomi</span><input value={form.company_name || ""} onChange={(e) => setField("company_name", e.target.value)} /></label>
          <label><span>Platforma nomi</span><input value={form.platform_name || ""} onChange={(e) => setField("platform_name", e.target.value)} /></label>
          <label><span>Bo‘lim</span><input value={form.department_name || ""} onChange={(e) => setField("department_name", e.target.value)} /></label>
          <label><span>Websayt</span><input value={form.website_url || ""} onChange={(e) => setField("website_url", e.target.value)} /></label>
          <label><span>Telegram</span><input value={form.telegram_url || ""} onChange={(e) => setField("telegram_url", e.target.value)} /></label>
          <label><span>Instagram</span><input value={form.instagram_url || ""} onChange={(e) => setField("instagram_url", e.target.value)} /></label>
          <label><span>YouTube</span><input value={form.youtube_url || ""} onChange={(e) => setField("youtube_url", e.target.value)} /></label>
          <label><span>Facebook</span><input value={form.facebook_url || ""} onChange={(e) => setField("facebook_url", e.target.value)} /></label>
          <label><span>TikTok</span><input value={form.tiktok_url || ""} onChange={(e) => setField("tiktok_url", e.target.value)} /></label>
        </div>
        <button className="btn primary mt16" onClick={() => onSave(form)} disabled={saving}>
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(getCurrentUser());
  const [active, setActive] = useState("dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("aloo_theme") || "light");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [summary, setSummary] = useState(null);
  const [kpiSummary, setKpiSummary] = useState(null);
  const [kpiEmployees, setKpiEmployees] = useState([]);
  const [kpiBranches, setKpiBranches] = useState([]);
  const [kpiContentTypes, setKpiContentTypes] = useState([]);
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [bonuses, setBonuses] = useState([]);
  const [bonusItems, setBonusItems] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [contentRows, setContentRows] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem("aloo_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  async function reloadData() {
    try {
      const [
        dashboardRes,
        kpiSummaryRes,
        kpiEmployeesRes,
        kpiBranchesRes,
        kpiContentTypesRes,
        settingsRes,
        notificationsRes,
        usersRes,
        branchesRes,
        bonusRes,
        bonusItemsRes,
        uploadsRes,
        contentRes,
        dailyReportsRes,
        campaignsRes,
        tasksRes,
        auditLogsRes
      ] = await Promise.all([
        api.dashboard(),
        api.kpi.summary(),
        api.kpi.employees(),
        api.kpi.branches(),
        api.kpi.contentTypes(),
        api.settings.get(),
        api.list("notifications").catch(() => []),
        api.list("users").catch(() => []),
        api.list("branches").catch(() => []),
        api.list("bonuses").catch(() => []),
        api.list("bonus-items").catch(() => []),
        api.list("uploads").catch(() => []),
        api.list("content").catch(() => []),
        api.list("daily-reports").catch(() => []),
        api.list("campaigns").catch(() => []),
        api.list("tasks").catch(() => []),
        api.list("audit-logs").catch(() => [])
      ]);

      setSummary(dashboardRes);
      setKpiSummary(kpiSummaryRes);
      setKpiEmployees(kpiEmployeesRes || []);
      setKpiBranches(kpiBranchesRes || []);
      setKpiContentTypes(kpiContentTypesRes || []);
      setSettings(settingsRes);
      setNotifications(notificationsRes || []);
      setUsers(usersRes || []);
      setBranches(branchesRes || []);
      setBonuses(bonusRes || []);
      setBonusItems(bonusItemsRes || []);
      setUploads(uploadsRes || []);
      setContentRows(contentRes || []);
      setDailyReports(dailyReportsRes || []);
      setCampaigns(campaignsRes || []);
      setTasks(tasksRes || []);
      setAuditLogs(auditLogsRes || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    async function init() {
      if (!user) {
        setBooting(false);
        return;
      }

      try {
        const me = await api.me();
        setUser(me.user);
        await reloadData();
      } catch {
        clearAuth();
        setUser(null);
      } finally {
        setBooting(false);
      }
    }

    init();
  }, []);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return MENU;
    return MENU.filter((item) => item.title.toLowerCase().includes(search.toLowerCase()));
  }, [search]);

  function showToast(message = "Saqlandi ✅", type = "success") {
    setToast({ message, type });
  }

  async function saveSettings(payload) {
    try {
      setSavingSettings(true);
      const res = await api.settings.update(payload);
      const updated = await api.settings.get();
      setSettings(updated);
      showToast(res.message || "Saqlandi ✅");
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSavingSettings(false);
    }
  }

  async function handleReadNotification(id) {
    await api.notifications.read(id);
    await reloadData();
  }

  async function handleReadAll() {
    await api.notifications.readAll();
    await reloadData();
  }

  function logout() {
    clearAuth();
    setUser(null);
    setActive("dashboard");
  }

  if (booting) {
    return <div className="loading-screen">Yuklanmoqda...</div>;
  }

  if (!user) {
    return (
      <>
        <LoginPage onLoggedIn={setUser} />
        <Toast toast={toast} onClose={() => setToast(null)} />
        <style>{styles}</style>
      </>
    );
  }

  let page = null;

  if (active === "dashboard") {
    page = (
      <DashboardPage
        summary={summary}
        kpiSummary={kpiSummary}
        dailyReports={dailyReports}
        bonuses={bonuses}
        campaigns={campaigns}
        tasks={tasks}
      />
    );
  } else if (active === "kpi") {
    page = (
      <KpiPage
        kpiSummary={kpiSummary}
        kpiEmployees={kpiEmployees}
        kpiBranches={kpiBranches}
        kpiContentTypes={kpiContentTypes}
      />
    );
  } else if (active === "bonus") {
    page = (
      <BonusPage
        bonuses={bonuses}
        bonusItems={bonusItems}
        users={users}
        branches={branches}
        onToast={showToast}
        reload={reloadData}
      />
    );
  } else if (active === "dailyReports") {
    page = (
      <DailyReportsPage
        reports={dailyReports}
        branches={branches}
        users={users}
        onToast={showToast}
        reload={reloadData}
      />
    );
  } else if (active === "uploads") {
    page = <MediaPage uploads={uploads} onToast={showToast} reload={reloadData} />;
  } else if (active === "users") {
    page = <UsersPage users={users} onToast={showToast} reload={reloadData} />;
  } else if (active === "campaigns") {
    page = <CampaignsPage campaigns={campaigns} onToast={showToast} reload={reloadData} />;
  } else if (active === "tasks") {
    page = <TasksPage tasks={tasks} users={users} onToast={showToast} reload={reloadData} />;
  } else if (active === "content") {
  page = (
    <ContentPage
      users={users}
      branches={branches}
      onToast={showToast}
    />
  );
}
  } else if (active === "audit") {
    page = <AuditPage logs={auditLogs} />;
  } else if (active === "settings") {
    page = (
      <SettingsPage
        settings={settings}
        onSave={saveSettings}
        saving={savingSettings}
        theme={theme}
        setTheme={setTheme}
      />
    );
  }

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">a</div>
            <div>
              <div className="brand-name">aloo</div>
              <div className="brand-desc">SMM jamoasi platformasi</div>
            </div>
          </div>

          <div className="sidebar-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Qidiruv..."
            />
          </div>

          <div className="menu-list">
            {filteredMenu.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  className={`menu-btn ${active === item.id ? "active" : ""}`}
                  type="button"
                  onClick={() => setActive(item.id)}
                >
                  <Icon size={16} />
                  <span>{item.title}</span>
                </button>
              );
            })}
          </div>

          <button className="logout-btn" type="button" onClick={logout}>
            <LogOut size={16} />
            Chiqish
          </button>
        </aside>

        <main className="main-area">
          <div className="topbar">
            <div>
              <div className="small-label">aloo platforma</div>
              <h1>{MENU.find((m) => m.id === active)?.title || "Bosh sahifa"}</h1>
            </div>

            <div className="topbar-right">
              <button className="notif-pill" type="button" onClick={() => setDrawerOpen(true)}>
                <Bell size={16} />
                {notifications.filter((n) => !n.is_read).length}
              </button>
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <div className="user-chip">
                <User size={16} />
                <span>{user.full_name}</span>
              </div>
            </div>
          </div>

          {page}
        </main>
      </div>

      <NotificationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notifications}
        onRead={handleReadNotification}
        onReadAll={handleReadAll}
      />

      <Toast toast={toast} onClose={() => setToast(null)} />
      <style>{styles}</style>
    </>
  );
}

const styles = `
:root{
  --blue:#1690F5;
  --bg:#f5f8fc;
  --panel:#ffffff;
  --soft:#f6f9fd;
  --text:#101828;
  --muted:#667085;
  --line:#e5edf5;
  --black:#141414;
}
:root[data-theme='dark']{
  --blue:#1690F5;
  --bg:#0b1220;
  --panel:#111827;
  --soft:#1b2435;
  --text:#f8fbff;
  --muted:#97a6ba;
  --line:rgba(255,255,255,.08);
  --black:#141414;
}
*{box-sizing:border-box}
html,body,#root{margin:0;min-height:100%;font-family:Inter,Arial,sans-serif;background:var(--bg);color:var(--text)}
button,input,select{font:inherit}
input,select{outline:none}
a{color:var(--blue);text-decoration:none}

.loading-screen{min-height:100vh;display:grid;place-items:center;background:var(--bg);color:var(--text)}

.login-page{
  min-height:100vh;
  display:grid;
  grid-template-columns:1.1fr .9fr;
  gap:32px;
  padding:40px;
  background:var(--bg);
}
.login-copy{display:flex;flex-direction:column;justify-content:center}
.brand-kicker{
  display:inline-flex;
  width:max-content;
  padding:10px 16px;
  border-radius:999px;
  background:rgba(22,144,245,.08);
  border:1px solid rgba(22,144,245,.12);
  color:var(--blue);
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.16em;
}
.checkbox-row{
  display:flex !important;
  align-items:center;
  gap:10px;
  min-height:48px;
}
.checkbox-row input{
  width:18px;
  height:18px;
}
.login-copy h1{font-size:64px;margin:18px 0 0}
.login-copy h2{font-size:30px;line-height:1.15;margin:12px 0 0;max-width:700px}
.login-copy p{color:var(--muted);font-size:18px;max-width:620px;line-height:1.6}
.login-card{
  align-self:center;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:28px;
  padding:28px;
  display:grid;
  gap:16px;
  box-shadow:0 16px 32px rgba(20,86,140,.08);
}
.small-label{font-size:12px;color:var(--muted);letter-spacing:.16em;text-transform:uppercase}
.login-title{font-size:30px;font-weight:800}
.login-card label{display:grid;gap:8px}
.login-card label span{font-size:13px;color:var(--muted)}
.login-card input{
  background:var(--soft);
  border:1px solid var(--line);
  color:var(--text);
  border-radius:16px;
  padding:14px 16px;
}

.app-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:280px 1fr;
  background:var(--bg);
}
.sidebar{
  background:var(--panel);
  border-right:1px solid var(--line);
  padding:18px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.brand-block{display:flex;align-items:center;gap:12px}
.brand-mark{
  width:52px;height:52px;border-radius:18px;
  background:linear-gradient(135deg,var(--blue),#62d2ff);
  color:#fff;display:grid;place-items:center;font-size:26px;font-weight:900;
}
.brand-name{font-size:24px;font-weight:800}
.brand-desc{font-size:12px;color:var(--muted)}

.sidebar-search{
  display:flex;align-items:center;gap:10px;
  background:var(--soft);
  border:1px solid var(--line);
  border-radius:16px;
  padding:12px 14px;
}
.sidebar-search input{
  width:100%;
  background:transparent;
  border:0;
  color:var(--text);
}

.menu-list{display:grid;gap:10px}
.menu-btn{
  border:1px solid transparent;
  background:transparent;
  color:var(--text);
  padding:14px 16px;
  border-radius:16px;
  display:flex;align-items:center;gap:10px;
  cursor:pointer;
  text-align:left;
  font-weight:700;
}
.menu-btn:hover{background:var(--soft)}
.menu-btn.active{
  background:linear-gradient(135deg,rgba(22,144,245,.10),rgba(98,210,255,.08));
  border-color:rgba(22,144,245,.16);
}

.logout-btn{
  margin-top:auto;
  border:0;
  border-radius:16px;
  padding:14px 16px;
  background:var(--black);
  color:#fff;
  display:flex;align-items:center;justify-content:center;gap:8px;
  cursor:pointer;
}

.main-area{padding:24px}
.topbar{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:20px 22px;
  display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
}
.topbar h1{margin:8px 0 0;font-size:34px}
.topbar-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}

.theme-toggle,.notif-pill,.user-chip{
  border:1px solid var(--line);
  background:var(--soft);
  color:var(--text);
  border-radius:14px;
  padding:12px 14px;
  display:flex;align-items:center;gap:8px;
}
.notif-pill{cursor:pointer}

.page-grid{display:grid;gap:18px;margin-top:18px}
.hero-banner,.card,.stat-card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:22px;
}
.hero-banner h1{font-size:44px;line-height:1.05;margin:10px 0}
.hero-banner p{color:var(--muted);font-size:17px;max-width:720px}
.stats-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:18px;
}
.stat-card-title{font-size:14px;color:var(--muted)}
.stat-card-value{font-size:36px;font-weight:900;margin-top:10px}
.stat-card-hint{font-size:13px;color:var(--muted);margin-top:8px}

.two-grid{
  display:grid;
  grid-template-columns:1.1fr .9fr;
  gap:18px;
}
.quick-list{display:grid;gap:12px}
.quick-item{
  padding:14px 16px;
  background:var(--soft);
  border:1px solid var(--line);
  border-radius:16px;
  display:flex;justify-content:space-between;gap:10px
}

.section-title-row{
  display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
  margin-bottom:16px;
}
.section-title-row h2{margin:0;font-size:26px}
.section-title-row p{margin:8px 0 0;color:var(--muted)}
.toolbar-actions{display:flex;gap:8px;flex-wrap:wrap}

.form-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:14px;
}
.form-grid label{display:grid;gap:8px}
.form-grid label span{font-size:13px;color:var(--muted)}
.form-grid input,.form-grid select{
  background:var(--soft);
  border:1px solid var(--line);
  color:var(--text);
  border-radius:14px;
  padding:13px 14px;
}
.full-col{grid-column:1 / -1}
.mt16{margin-top:16px}

.btn{
  border:0;
  border-radius:14px;
  padding:12px 14px;
  cursor:pointer;
  font-weight:700;
}
.btn.primary{
  background:linear-gradient(135deg,var(--blue),#62d2ff);
  color:#fff;
}
.btn.secondary{
  background:var(--soft);
  border:1px solid var(--line);
  color:var(--text);
}
.btn.large{padding:14px 16px}
.btn.tiny{padding:8px 10px;font-size:12px}
.link-btn{
  border:0;background:transparent;color:var(--blue);cursor:pointer;padding:0
}

.summary-pill{
  margin-bottom:16px;
  padding:14px 16px;
  border-radius:16px;
  background:var(--soft);
  border:1px solid var(--line);
}

.upload-row{
  display:flex;gap:12px;align-items:center;flex-wrap:wrap
}
.upload-row input[type="file"]{
  background:var(--soft);
  border:1px solid var(--line);
  border-radius:14px;
  padding:12px;
  color:var(--text);
}

.table-wrap{
  overflow:auto;
  border:1px solid var(--line);
  border-radius:16px;
}
table{width:100%;border-collapse:collapse}
th,td{padding:12px 14px;border-bottom:1px solid var(--line);text-align:left}
th{background:rgba(22,144,245,.05);color:var(--muted)}
.empty-cell{text-align:center;color:var(--muted);padding:24px}
.table-actions{display:flex;gap:8px;flex-wrap:wrap}

.error-box{
  background:rgba(239,90,90,.10);
  color:#db4f4f;
  border:1px solid rgba(239,90,90,.18);
  padding:12px 14px;
  border-radius:14px;
}

.toast{
  position:fixed;
  right:20px;bottom:20px;
  min-width:240px;
  display:flex;justify-content:space-between;align-items:center;gap:12px;
  padding:14px 16px;
  border-radius:16px;
  color:#fff;
  z-index:9999;
  box-shadow:0 18px 36px rgba(0,0,0,.22);
}
.toast-success{background:linear-gradient(135deg,#22b35d,#52da90)}
.toast-error{background:linear-gradient(135deg,#ef5a5a,#ff9c9c)}
.toast button{background:transparent;border:0;color:#fff;cursor:pointer}

.drawer{
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:9998;
}
.drawer.open{pointer-events:auto}
.drawer-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.28);
  opacity:0;
  transition:.2s;
}
.drawer.open .drawer-backdrop{opacity:1}
.drawer-panel{
  position:absolute;
  top:0;right:0;
  width:min(420px,92vw);
  height:100%;
  background:var(--panel);
  border-left:1px solid var(--line);
  transform:translateX(100%);
  transition:.24s;
  padding:20px;
  display:flex;
  flex-direction:column;
  gap:16px;
}
.drawer.open .drawer-panel{transform:translateX(0)}
.drawer-head{
  display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap
}
.drawer-head h3{margin:6px 0 0;font-size:24px}
.drawer-list{display:grid;gap:12px;overflow:auto}
.notif-card{
  padding:14px 16px;
  border-radius:16px;
  border:1px solid var(--line);
  background:var(--soft);
}
.notif-card.read{opacity:.7}
.notif-title{font-weight:800}
.notif-body{margin-top:6px;color:var(--muted)}
.notif-footer{margin-top:10px;display:flex;justify-content:space-between;gap:10px;align-items:center}
.empty-block{
  padding:18px;
  border:1px dashed var(--line);
  border-radius:16px;
  color:var(--muted);
  text-align:center;
}

@media (max-width: 1100px){
  .login-page,.app-shell,.stats-grid,.two-grid,.form-grid{grid-template-columns:1fr}
  .main-area{padding:14px}
  .topbar h1{font-size:28px}
  .hero-banner h1{font-size:34px}
  .login-copy h1{font-size:46px}
  .login-copy h2{font-size:24px}
}
`;
