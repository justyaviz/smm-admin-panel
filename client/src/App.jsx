import React, { useEffect, useMemo, useState } from "react";
import {
  Bell,
  FileBarChart2,
  FolderKanban,
  Gift,
  Home,
  Image,
  LayoutGrid,
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
  { id: "content", title: "Kontent reja", icon: LayoutGrid },
  { id: "bonus", title: "Bonus tizimi", icon: Gift },
  { id: "dailyReports", title: "Kunlik filial hisobotlari", icon: FileBarChart2 },
  { id: "campaigns", title: "Reklama kampaniyalari", icon: Megaphone },
  { id: "uploads", title: "Media kutubxona", icon: Image },
  { id: "users", title: "Hodimlar", icon: UsersIcon },
  { id: "tasks", title: "Vazifalar", icon: FolderKanban },
  { id: "audit", title: "Audit log", icon: ShieldCheck },
  { id: "profile", title: "Profil", icon: User },
  { id: "settings", title: "Sozlamalar", icon: Settings }
];

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

function getMonthLabel(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
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

function shiftMonth(monthLabel, step) {
  const [y, m] = String(monthLabel || getMonthLabel()).split("-").map(Number);
  const d = new Date(y, (m || 1) - 1 + step, 1);
  return getMonthLabel(d);
}

function safePermissions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

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

function NotificationsDrawer({ open, onClose, notifications = [], onRead, onReadAll }) {
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

function DashboardPage({ summary = {}, dailyReports = [], bonusItems = [], contentRows = [] }) {
  const currentMonth = getMonthLabel();

  const thisMonthContent = (contentRows || []).filter((row) => {
    if (!row.publish_date) return false;
    return String(row.publish_date).slice(0, 7) === currentMonth;
  });

  const totalPlan = thisMonthContent.length;
  const postedCount = thisMonthContent.filter((row) => row.status === "joylangan").length;
  const progress = totalPlan ? Math.round((postedCount / totalPlan) * 100) : 0;

  const thisMonthBonus = (bonusItems || [])
    .filter((row) => row.month_label === currentMonth)
    .reduce((sum, row) => sum + Number(row.total_amount || row.amount || 0), 0);

  return (
    <div className="page-grid">
      <div className="hero-banner">
        <div>
          <div className="small-label">Boshqaruv markazi</div>
          <h1>aloo SMM jamoasi platformasi</h1>
          <p>Kontent reja, bonus, filial hisobotlari va media boshqaruvi bitta joyda.</p>
        </div>
      </div>

      <div className="stats-grid">
        <StatCard
          title="Kontent reja bajarilishi"
          value={`${progress}%`}
          hint={`${postedCount} / ${totalPlan} joylangan`}
        />
        <StatCard
          title="Joriy oy bonus puli"
          value={`${thisMonthBonus.toLocaleString()} so‘m`}
          hint={getMonthTitle(currentMonth)}
        />
        <StatCard
          title="Bugungi filial hisobotlari"
          value={summary?.today_report_count || 0}
          hint="bugungi ma’lumot"
        />
        <StatCard
          title="Faol vazifalar"
          value={summary?.task_count || 0}
          hint="umumiy vazifalar"
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
                {(dailyReports || []).slice(0, 5).map((row) => (
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
          <SectionTitle title="Kontent holati" />
          <div className="quick-list">
            <div className="quick-item">Reja: <strong>{thisMonthContent.filter((r) => r.status === "reja").length}</strong></div>
            <div className="quick-item">Tayyorlanmoqda: <strong>{thisMonthContent.filter((r) => r.status === "tayyorlanmoqda").length}</strong></div>
            <div className="quick-item">Tayyor: <strong>{thisMonthContent.filter((r) => r.status === "tayyor").length}</strong></div>
            <div className="quick-item">Joylangan: <strong>{thisMonthContent.filter((r) => r.status === "joylangan").length}</strong></div>
            <div className="quick-item">Bekor qilingan: <strong>{thisMonthContent.filter((r) => r.status === "bekor_qilingan").length}</strong></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BonusPage({ bonusItems = [], users = [], branches = [], onToast, reload }) {
  const [monthFilter, setMonthFilter] = useState(getMonthLabel());
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    work_date: "",
    content_type: "post",
    user_id: "",
    editor_user_id: "",
    face_voice_user_id: "",
    branch_id: "",
    proposal_count: "",
    approved_count: ""
  });

  const isVideo = form.content_type === "video";

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const filteredItems = (bonusItems || []).filter((item) =>
    monthFilter ? item.month_label === monthFilter : true
  );

  const totalProposalAmount = filteredItems.reduce((sum, item) => sum + Number(item.proposal_amount || 0), 0);
  const totalApprovedAmount = filteredItems.reduce((sum, item) => sum + Number(item.approved_amount || 0), 0);
  const totalAmount = filteredItems.reduce((sum, item) => sum + Number(item.total_amount || item.amount || 0), 0);

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.proposal_count) {
      onToast("Taklif soni majburiy", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        month_label: monthFilter,
        work_date: form.work_date,
        content_type: form.content_type,
        content_title: form.title,
        proposal_count: Number(form.proposal_count || 0),
        approved_count: Number(form.approved_count || 0),
        user_id: isVideo ? null : form.user_id || null,
        second_user_id: isVideo ? form.face_voice_user_id || null : null,
        video_editor_user_id: isVideo ? form.editor_user_id || null : null,
        video_face_user_id: isVideo ? form.face_voice_user_id || null : null,
        branch_id: isVideo ? form.branch_id || null : null
      };

      await api.create("bonus-items", payload);
      if (api.recalcBonus) {
        await api.recalcBonus();
      }
      await reload();

      setForm({
        title: "",
        work_date: "",
        content_type: "post",
        user_id: "",
        editor_user_id: "",
        face_voice_user_id: "",
        branch_id: "",
        proposal_count: "",
        approved_count: ""
      });

      onToast("Bonus hisobot saqlandi ✅", "success");
    } catch (err) {
      onToast(err.message || "Saqlashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Bonus tizimi"
          desc="Bonus hisobotlari va avtomatik hisob"
          right={
            <div className="toolbar-actions">
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                <option value={getMonthLabel()}>{getMonthTitle(getMonthLabel())}</option>
                {[...new Set((bonusItems || []).map((i) => i.month_label).filter(Boolean))].map((m) => (
                  <option key={m} value={m}>{getMonthTitle(m)}</option>
                ))}
              </select>

              <button
                type="button"
                className="btn secondary"
                onClick={() => api.exportFile("/api/export/bonuses.xlsx", `bonuses-${monthFilter}.xlsx`)}
              >
                Excel export
              </button>
            </div>
          }
        />

        <div className="stats-grid">
          <StatCard title="Taklif summasi" value={`${totalProposalAmount.toLocaleString()} so‘m`} hint="joriy oy" />
          <StatCard title="Tasdiq summasi" value={`${totalApprovedAmount.toLocaleString()} so‘m`} hint="joriy oy" />
          <StatCard title="Jami bonus" value={`${totalAmount.toLocaleString()} so‘m`} hint={getMonthTitle(monthFilter)} />
          <StatCard title="Yozuvlar soni" value={filteredItems.length} hint="bonus hisobotlar" />
        </div>
      </div>

      <div className="card">
        <SectionTitle title="Hisobot qo‘shish" />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Kontent nomi</span>
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} required />
          </label>

          <label>
            <span>Joylangan sanasi</span>
            <input type="date" value={form.work_date} onChange={(e) => setField("work_date", e.target.value)} required />
          </label>

          <label>
            <span>Kontent turi</span>
            <select value={form.content_type} onChange={(e) => setField("content_type", e.target.value)}>
              <option value="post">Post</option>
              <option value="story">Story</option>
              <option value="reels">Reels</option>
              <option value="video">Video</option>
              <option value="banner">Banner</option>
            </select>
          </label>

          {isVideo ? (
            <>
              <label>
                <span>Montajni kim qildi</span>
                <select value={form.editor_user_id} onChange={(e) => setField("editor_user_id", e.target.value)}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>

              <label>
                <span>Face + ovoz kimniki</span>
                <select value={form.face_voice_user_id} onChange={(e) => setField("face_voice_user_id", e.target.value)}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>

              <label>
                <span>Qaysi filial kontenti</span>
                <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)}>
                  <option value="">Tanlang</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label>
              <span>Hodim</span>
              <select value={form.user_id} onChange={(e) => setField("user_id", e.target.value)}>
                <option value="">Tanlang</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </label>
          )}

          <label>
            <span>Taklif soni</span>
            <input
              type="number"
              min="0"
              value={form.proposal_count}
              onChange={(e) => setField("proposal_count", e.target.value)}
              required
            />
          </label>

          <label>
            <span>Tasdiq soni</span>
            <input
              type="number"
              min="0"
              value={form.approved_count}
              onChange={(e) => setField("approved_count", e.target.value)}
            />
          </label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Hisobotni saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title={`${getMonthTitle(monthFilter)} bonus yozuvlari`} />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kontent nomi</th>
                <th>Sana</th>
                <th>Turi</th>
                <th>Montaj</th>
                <th>Face+ovoz</th>
                <th>Hodim</th>
                <th>Filial</th>
                <th>Taklif</th>
                <th>Tasdiq</th>
                <th>Jami</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length ? (
                filteredItems.map((row) => (
                  <tr key={row.id}>
                    <td>{row.content_title || "-"}</td>
                    <td>{row.work_date || "-"}</td>
                    <td>{row.content_type || "-"}</td>
                    <td>{row.video_editor_name || "-"}</td>
                    <td>{row.second_full_name || row.video_face_name || "-"}</td>
                    <td>{row.full_name || "-"}</td>
                    <td>{row.branch_name || "-"}</td>
                    <td>{row.proposal_count || 0}</td>
                    <td>{row.approved_count || 0}</td>
                    <td>{Number(row.total_amount || row.amount || 0).toLocaleString()} so‘m</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="10" className="empty-cell">Bu oy uchun bonus yozuvi yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DailyReportsPage({ reports = [], branches = [], users = [], onToast, reload }) {
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
            <input type="number" min="0" value={form.stories_count} onChange={(e) => setField("stories_count", Number(e.target.value))} />
          </label>

          <label>
            <span>Post</span>
            <input type="number" min="0" value={form.posts_count} onChange={(e) => setField("posts_count", Number(e.target.value))} />
          </label>

          <label>
            <span>Reels</span>
            <input type="number" min="0" value={form.reels_count} onChange={(e) => setField("reels_count", Number(e.target.value))} />
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

function MediaPage({ uploads = [], onToast, reload }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);
      await api.upload(formData);
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
                    <td><a href={row.file_url} target="_blank" rel="noreferrer">Ochish</a></td>
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
        permissions_json: exists ? current.filter((p) => p !== permissionId) : [...current, permissionId]
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
      permissions_json: safePermissions(row.permissions_json)
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
              <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/users.xlsx", "users.xlsx")}>
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
              <input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} required />
            </label>
          ) : (
            <label>
              <span>Profil rasmi linki</span>
              <input value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} placeholder="https://..." />
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
            <input value={form.department_role} onChange={(e) => setField("department_role", e.target.value)} placeholder="Masalan: Mobilograf" />
          </label>

          {!editingId ? (
            <label>
              <span>Profil rasmi linki</span>
              <input value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} placeholder="https://..." />
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
                    <td>{safePermissions(row.permissions_json).join(", ") || "-"}</td>
                    <td>{row.is_active ? "Faol" : "Bloklangan"}</td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn tiny" onClick={() => startEdit(row)}>Tahrirlash</button>
                        <button type="button" className="btn tiny" onClick={() => resetPassword(row.id)}>Parol reset</button>
                        <button type="button" className="btn tiny secondary" onClick={() => toggleActive(row.id)}>
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

function CampaignsPage({ campaigns = [], onToast, reload }) {
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
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/campaigns.xlsx", "campaigns.xlsx")}>
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

function TasksPage({ tasks = [], users = [], onToast, reload }) {
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
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
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

function ContentPage({ users = [], onToast, reload }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthLabel());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bonusMode, setBonusMode] = useState(false);

  const [form, setForm] = useState({
    title: "",
    publish_date: "",
    status: "reja",
    platform_primary: "Instagram",
    platform_secondary: "",
    content_type: "post",
    editor_user_id: "",
    face_voice_user_id: "",
    proposal_count: "",
    approved_count: ""
  });

  async function loadMonth(monthValue = selectedMonth) {
    try {
      setLoading(true);
      const data = await api.list(`content?month=${monthValue}`);
      const sorted = (data || []).sort((a, b) => {
        const aDate = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const bDate = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return bDate - aDate;
      });
      setRows(sorted);
    } catch (err) {
      onToast(err.message || "Kontent rejani olib bo‘lmadi", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMonth(selectedMonth);
  }, [selectedMonth]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (bonusMode && !form.proposal_count) {
      onToast("Taklif soni majburiy", "error");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title,
        publish_date: form.publish_date || null,
        status: form.status,
        platform: [form.platform_primary, form.platform_secondary].filter(Boolean).join(", "),
        content_type: form.content_type,
        assigned_user_id: null,
        video_editor_user_id: form.editor_user_id || null,
        video_face_user_id: form.face_voice_user_id || null,
        bonus_enabled: bonusMode,
        proposal_count: bonusMode ? Number(form.proposal_count || 0) : 0,
        approved_count: bonusMode ? Number(form.approved_count || 0) : 0,
        notes: ""
      };

      await api.create("content", payload);
      await loadMonth(selectedMonth);
      await reload();

      setForm({
        title: "",
        publish_date: "",
        status: "reja",
        platform_primary: "Instagram",
        platform_secondary: "",
        content_type: "post",
        editor_user_id: "",
        face_voice_user_id: "",
        proposal_count: "",
        approved_count: ""
      });
      setBonusMode(false);

      onToast("Kontent reja saqlandi ✅", "success");
    } catch (err) {
      onToast(err.message || "Saqlashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o‘chirilsinmi?");
    if (!ok) return;

    try {
      await api.remove("content", id);
      await loadMonth(selectedMonth);
      await reload();
      onToast("Kontent o‘chirildi", "success");
    } catch (err) {
      onToast(err.message || "O‘chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Kontent reja yaratish"
          desc={`${getMonthTitle(selectedMonth)} uchun`}
          right={
            <div className="toolbar-actions">
              <button type="button" className="btn secondary" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
                ← Oldingi oy
              </button>
              <div className="summary-pill">
                <strong>{getMonthTitle(selectedMonth)}</strong>
              </div>
              <button type="button" className="btn secondary" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>
                Keyingi oy →
              </button>
            </div>
          }
        />

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Kontent nomi</span>
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} required />
          </label>

          <label>
            <span>Joylash sanasi</span>
            <input type="date" value={form.publish_date} onChange={(e) => setField("publish_date", e.target.value)} required />
          </label>

          <label>
            <span>Holati</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="reja">Reja</option>
              <option value="tayyorlanmoqda">Tayyorlanmoqda</option>
              <option value="tayyor">Tayyor</option>
              <option value="joylangan">Joylangan</option>
              <option value="bekor_qilingan">Bekor qilingan</option>
            </select>
          </label>

          <label>
            <span>1-platforma</span>
            <select value={form.platform_primary} onChange={(e) => setField("platform_primary", e.target.value)}>
              <option value="Instagram">Instagram</option>
              <option value="Telegram">Telegram</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
            </select>
          </label>

          <label>
            <span>2-platforma</span>
            <select value={form.platform_secondary} onChange={(e) => setField("platform_secondary", e.target.value)}>
              <option value="">Tanlanmagan</option>
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
            </select>
          </label>

          <label>
            <span>Montaj kim qildi</span>
            <select value={form.editor_user_id} onChange={(e) => setField("editor_user_id", e.target.value)}>
              <option value="">Tanlang</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Face + ovoz kimniki</span>
            <select value={form.face_voice_user_id} onChange={(e) => setField("face_voice_user_id", e.target.value)}>
              <option value="">Tanlang</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </label>

          <label className="checkbox-row">
            <input type="checkbox" checked={bonusMode} onChange={(e) => setBonusMode(e.target.checked)} />
            <span>Bonusga o‘tkazish</span>
          </label>

          {bonusMode ? (
            <>
              <label>
                <span>Taklif soni</span>
                <input type="number" min="0" value={form.proposal_count} onChange={(e) => setField("proposal_count", e.target.value)} required />
              </label>

              <label>
                <span>Tasdiq soni</span>
                <input type="number" min="0" value={form.approved_count} onChange={(e) => setField("approved_count", e.target.value)} />
              </label>
            </>
          ) : null}

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle
          title={`${getMonthTitle(selectedMonth)} kontent rejasi`}
          right={
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/content.xlsx", `content-${selectedMonth}.xlsx`)}>
              Excel export
            </button>
          }
        />

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kontent nomi</th>
                <th>Joylash sanasi</th>
                <th>Holati</th>
                <th>Platforma</th>
                <th>Kontent turi</th>
                <th>Montaj</th>
                <th>Face+ovoz</th>
                <th>Bonus</th>
                <th>Amal</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="empty-cell">Yuklanmoqda...</td></tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.publish_date || "-"}</td>
                    <td>{row.status}</td>
                    <td>{row.platform || "-"}</td>
                    <td>{row.content_type || "-"}</td>
                    <td>{row.video_editor_name || "-"}</td>
                    <td>{row.video_face_name || "-"}</td>
                    <td>{row.bonus_enabled ? "Ha" : "Yo‘q"}</td>
                    <td>
                      <button type="button" className="btn tiny secondary" onClick={() => removeRow(row.id)}>
                        O‘chirish
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="9" className="empty-cell">Bu oy uchun reja yo‘q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function AuditPage({ logs = [] }) {
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

function ProfilePage({ user = {}, onToast }) {
  const [form, setForm] = useState({
    full_name: user.full_name || "",
    phone: user.phone || "",
    login: user.login || "",
    avatar_url: user.avatar_url || "",
    department_role: user.department_role || "",
    old_password: "",
    new_password: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      full_name: user.full_name || "",
      phone: user.phone || "",
      login: user.login || "",
      avatar_url: user.avatar_url || "",
      department_role: user.department_role || "",
      old_password: "",
      new_password: ""
    });
  }, [user]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveProfile(e) {
    e.preventDefault();
    try {
      setSaving(true);

      await api.updateProfile({
        full_name: form.full_name,
        phone: form.phone,
        login: form.login,
        avatar_url: form.avatar_url,
        department_role: form.department_role
      });

      if (form.old_password && form.new_password) {
        await api.changePassword({
          old_password: form.old_password,
          new_password: form.new_password
        });
      }

      onToast("Profil saqlandi ✅", "success");
    } catch (err) {
      onToast(err.message || "Profilni saqlab bo‘lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Mening profilim" />
        <form className="form-grid" onSubmit={saveProfile}>
          <label>
            <span>Ism</span>
            <input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} />
          </label>

          <label>
            <span>Telefon</span>
            <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} />
          </label>

          <label>
            <span>Login</span>
            <input value={form.login} onChange={(e) => setField("login", e.target.value)} />
          </label>

          <label>
            <span>Lavozimi</span>
            <input value={form.department_role} onChange={(e) => setField("department_role", e.target.value)} />
          </label>

          <label className="full-col">
            <span>Profil rasmi linki</span>
            <input value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} />
          </label>

          <label>
            <span>Eski parol</span>
            <input type="password" value={form.old_password} onChange={(e) => setField("old_password", e.target.value)} />
          </label>

          <label>
            <span>Yangi parol</span>
            <input type="password" value={form.new_password} onChange={(e) => setField("new_password", e.target.value)} />
          </label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Profilni saqlash"}
          </button>
        </form>
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

function App() {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState(getCurrentUser());
  const [active, setActive] = useState("dashboard");
  const [theme, setTheme] = useState(localStorage.getItem("aloo_theme") || "light");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [summary, setSummary] = useState({});
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
        api.dashboard().catch(() => ({})),
        api.settings.get().catch(() => null),
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

      setSummary(dashboardRes || {});
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

  const allowedMenu = useMemo(() => {
    if (user?.role === "admin") return MENU;
    const permissions = safePermissions(user?.permissions_json);
    return MENU.filter((item) => permissions.includes(item.id));
  }, [user]);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return allowedMenu;
    return allowedMenu.filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, allowedMenu]);

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
    try {
      await api.notifications.read(id);
      await reloadData();
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    }
  }

  async function handleReadAll() {
    try {
      await api.notifications.readAll();
      await reloadData();
    } catch (err) {
      showToast(err.message || "Xatolik yuz berdi", "error");
    }
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
        dailyReports={dailyReports}
        bonusItems={bonusItems}
        contentRows={contentRows}
      />
    );
  } else if (active === "content") {
    page = (
      <ContentPage
        users={users}
        onToast={showToast}
        reload={reloadData}
      />
    );
  } else if (active === "bonus") {
    page = (
      <BonusPage
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
  } else if (active === "campaigns") {
    page = (
      <CampaignsPage
        campaigns={campaigns}
        onToast={showToast}
        reload={reloadData}
      />
    );
  } else if (active === "uploads") {
    page = (
      <MediaPage
        uploads={uploads}
        onToast={showToast}
        reload={reloadData}
      />
    );
  } else if (active === "users") {
    page = (
      <UsersPage
        users={users}
        onToast={showToast}
        reload={reloadData}
      />
    );
  } else if (active === "tasks") {
    page = (
      <TasksPage
        tasks={tasks}
        users={users}
        onToast={showToast}
        reload={reloadData}
      />
    );
  } else if (active === "audit") {
    page = <AuditPage logs={auditLogs} />;
  } else if (active === "profile") {
    page = (
      <ProfilePage
        user={user}
        onToast={showToast}
      />
    );
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
                {(notifications || []).filter((n) => !n.is_read).length}
              </button>
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <button type="button" className="user-chip" onClick={() => setActive("profile")}>
                <User size={16} />
                <span>{user?.full_name || "Foydalanuvchi"}</span>
              </button>
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
.notif-pill,.user-chip{cursor:pointer}

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

.permission-box{
  border:1px solid var(--line);
  border-radius:16px;
  padding:16px;
  background:var(--soft);
}
.permission-title{
  font-weight:800;
  margin-bottom:12px;
}
.permission-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:10px;
}
.permission-item{
  display:flex !important;
  align-items:center;
  gap:8px;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:12px;
  padding:10px 12px;
}
.permission-item input{
  width:16px;
  height:16px;
}

@media (max-width: 1100px){
  .login-page,.app-shell,.stats-grid,.two-grid,.form-grid{grid-template-columns:1fr}
  .main-area{padding:14px}
  .topbar h1{font-size:28px}
  .hero-banner h1{font-size:34px}
  .login-copy h1{font-size:46px}
  .login-copy h2{font-size:24px}
  .permission-grid{grid-template-columns:1fr}
}
`;

export default App;
