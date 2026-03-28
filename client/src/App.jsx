import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  BarChart3,
  Bell,
  Clock3,
  CreditCard,
  Eye,
  FileBarChart2,
  FolderKanban,
  Gift,
  Home,
  Image,
  LayoutGrid,
  LogOut,
  MessageCircle,
  Megaphone,
  Mic,
  Moon,
  MapPinned,
  Repeat2,
  Wallet,
  Pencil,
  Search,
  Send,
  Settings,
  SunMedium,
  SmilePlus,
  Trash2,
  Upload,
  User,
  Users as UsersIcon,
  ShieldCheck,
  X
} from "lucide-react";
import { io } from "socket.io-client";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, API_BASE, clearAuth, getAuthToken, getCurrentUser, SOCKET_BASE } from "./api";

const MENU = [
  { id: "dashboard", title: "Bosh sahifa", icon: Home },
  { id: "content", title: "Kontent reja", icon: LayoutGrid },
  { id: "bonus", title: "Bonus tizimi", icon: Gift },
  { id: "expenses", title: "Harajatlar", icon: CreditCard },
  { id: "finance", title: "Finance dashboard", icon: Wallet },
  { id: "travelPlans", title: "Safar rejasi", icon: MapPinned },
  { id: "reports", title: "Advanced report", icon: FileBarChart2 },
  { id: "analytics", title: "Analytics", icon: BarChart3 },
  { id: "postingInsights", title: "Posting insights", icon: Clock3 },
  { id: "moodPulse", title: "Mood pulse", icon: SmilePlus },
  { id: "employeeKpi", title: "Employee KPI", icon: UsersIcon },
  { id: "health", title: "Health", icon: ShieldCheck },
  { id: "recurring", title: "Recurring", icon: Repeat2 },
  { id: "dailyReports", title: "Kunlik filial hisobotlari", icon: FileBarChart2 },
  { id: "campaigns", title: "Reklama kampaniyalari", icon: Megaphone },
  { id: "uploads", title: "Media kutubxona", icon: Image },
  { id: "users", title: "Hodimlar", icon: UsersIcon },
  { id: "tasks", title: "Vazifalar", icon: FolderKanban },
  { id: "chat", title: "Chat", icon: MessageCircle },
  { id: "audit", title: "Audit log", icon: ShieldCheck },
  { id: "profile", title: "Profil", icon: User },
  { id: "settings", title: "Sozlamalar", icon: Settings }
  ,
  { id: "aiAssistant", title: "AI yordamchi", icon: Bot }
];

const PERMISSION_OPTIONS = [
  { id: "dashboard", label: "Bosh sahifa" },
  { id: "content", label: "Kontent reja" },
  { id: "content_create", label: "Kontent qo'shish" },
  { id: "content_edit", label: "Kontent tahrirlash" },
  { id: "content_delete", label: "Kontent o'chirish" },
  { id: "bonus", label: "Bonus tizimi" },
  { id: "bonus_create", label: "Bonus qo'shish" },
  { id: "bonus_edit", label: "Bonus tahrirlash" },
  { id: "bonus_delete", label: "Bonus o'chirish" },
  { id: "expenses", label: "Harajatlar" },
  { id: "finance", label: "Finance dashboard" },
  { id: "expenses_create", label: "Harajat qo'shish" },
  { id: "expenses_edit", label: "Harajat tahrirlash" },
  { id: "expenses_delete", label: "Harajat o'chirish" },
  { id: "travelPlans", label: "Safar rejasi" },
  { id: "reports", label: "Advanced report" },
  { id: "analytics", label: "Analytics" },
  { id: "postingInsights", label: "Posting insights" },
  { id: "moodPulse", label: "Mood pulse" },
  { id: "employeeKpi", label: "Employee KPI" },
  { id: "health", label: "Health" },
  { id: "recurring", label: "Recurring" },
  { id: "travelPlans_create", label: "Safar reja qo'shish" },
  { id: "travelPlans_edit", label: "Safar reja tahrirlash" },
  { id: "travelPlans_delete", label: "Safar reja o'chirish" },
  { id: "dailyReports", label: "Kunlik filial hisobotlari" },
  { id: "dailyReports_create", label: "Hisobot qo'shish" },
  { id: "dailyReports_edit", label: "Hisobot tahrirlash" },
  { id: "dailyReports_delete", label: "Hisobot o'chirish" },
  { id: "campaigns", label: "Reklama kampaniyalari" },
  { id: "campaigns_create", label: "Kampaniya qo'shish" },
  { id: "campaigns_edit", label: "Kampaniya tahrirlash" },
  { id: "campaigns_delete", label: "Kampaniya o'chirish" },
  { id: "uploads", label: "Media kutubxona" },
  { id: "uploads_create", label: "Fayl yuklash" },
  { id: "uploads_delete", label: "Fayl o'chirish" },
  { id: "users", label: "Hodimlar" },
  { id: "users_create", label: "Hodim qo'shish" },
  { id: "users_edit", label: "Hodim tahrirlash" },
  { id: "users_delete", label: "Hodim o'chirish" },
  { id: "tasks", label: "Vazifalar" },
  { id: "tasks_create", label: "Vazifa qo'shish" },
  { id: "tasks_edit", label: "Vazifa tahrirlash" },
  { id: "tasks_delete", label: "Vazifa o'chirish" },
  { id: "chat", label: "Chat" },
  { id: "chat_send", label: "Xabar yuborish" },
  { id: "audit", label: "Audit log" },
  { id: "profile", label: "Profil" },
  { id: "settings", label: "Sozlamalar" }
  ,
  { id: "aiAssistant", label: "AI yordamchi" }
];

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

function formatMoney(value) {
  return `${Number(value || 0).toLocaleString()} so'm`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDate(value);
  return `${d.toISOString().slice(0, 10)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function buildMonthCalendar(monthLabel, rows = [], dateKey = "publish_date") {
  const [year, month] = String(monthLabel || getMonthLabel()).split("-").map(Number);
  const firstDay = new Date(year, (month || 1) - 1, 1);
  const lastDate = new Date(year, month || 1, 0).getDate();
  const startWeekday = (firstDay.getDay() + 6) % 7;
  const cells = [];
  const itemsByDate = new Map();

  rows.forEach((row) => {
    const rawDate = formatDate(row[dateKey]);
    if (rawDate === "-" || !rawDate.startsWith(`${year}-${String(month).padStart(2, "0")}`)) return;
    if (!itemsByDate.has(rawDate)) itemsByDate.set(rawDate, []);
    itemsByDate.get(rawDate).push(row);
  });

  for (let i = 0; i < startWeekday; i += 1) cells.push({ key: `empty-${i}`, empty: true });

  for (let day = 1; day <= lastDate; day += 1) {
    const date = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ key: date, date, day, items: itemsByDate.get(date) || [] });
  }

  return cells;
}

function MiniCalendar({ monthLabel, rows, dateKey, renderItem, onMoveDate = null }) {
  const weekDays = ["Du", "Se", "Cho", "Pay", "Ju", "Sha", "Yak"];
  const cells = buildMonthCalendar(monthLabel, rows, dateKey);

  return (
    <div className="calendar-card">
      <div className="calendar-weekdays">
        {weekDays.map((day) => <div key={day}>{day}</div>)}
      </div>
      <div className="calendar-grid">
        {cells.map((cell) => (
          <div
            key={cell.key}
            className={`calendar-cell ${cell.empty ? "empty" : ""} ${onMoveDate && !cell.empty ? "droppable" : ""}`}
            onDragOver={(e) => {
              if (onMoveDate && !cell.empty) e.preventDefault();
            }}
            onDrop={(e) => {
              if (!onMoveDate || cell.empty) return;
              e.preventDefault();
              const itemId = Number(e.dataTransfer.getData("text/plain"));
              if (itemId) onMoveDate(itemId, cell.date);
            }}
          >
            {!cell.empty ? (
              <>
                <div className="calendar-day">{cell.day}</div>
                <div className="calendar-items">
                  {cell.items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      draggable={!!onMoveDate}
                      onDragStart={(e) => {
                        if (!onMoveDate) return;
                        e.dataTransfer.setData("text/plain", String(item.id));
                      }}
                    >
                      {renderItem(item)}
                    </div>
                  ))}
                  {cell.items.length > 3 ? <span className="calendar-more">+{cell.items.length - 3} ta</span> : null}
                </div>
              </>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscussionPanel({ entityType, entityId, onToast }) {
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [body, setBody] = useState("");
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadDiscussion() {
      if (!entityType || !entityId) {
        setComments([]);
        setAttachments([]);
        return;
      }
      try {
        const [commentsRes, attachmentsRes] = await Promise.all([
          api.list(`/api/comments/${entityType}/${entityId}`).catch(() => []),
          api.list(`/api/attachments/${entityType}/${entityId}`).catch(() => [])
        ]);
        setComments(commentsRes || []);
        setAttachments(attachmentsRes || []);
      } catch {
        setComments([]);
        setAttachments([]);
      }
    }
    loadDiscussion();
  }, [entityType, entityId]);

  async function submitComment(e) {
    e.preventDefault();
    if (!body.trim() || !entityId) return;
    try {
      setSaving(true);
      await api.create("comments", {
        entity_type: entityType,
        entity_id: entityId,
        body
      });
      const commentsRes = await api.list(`/api/comments/${entityType}/${entityId}`);
      setComments(commentsRes || []);
      setBody("");
      onToast?.("Izoh qoР Р†Р вЂљР’Вshildi", "success");
    } catch (err) {
      onToast?.(err.message || "Izohni saqlab boР Р†Р вЂљР’Вlmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadAttachment() {
    if (!file || !entityId) return;
    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity_type", entityType);
      formData.append("entity_id", String(entityId));
      await api.upload(formData);
      const attachmentsRes = await api.list(`/api/attachments/${entityType}/${entityId}`);
      setAttachments(attachmentsRes || []);
      setFile(null);
      setTagText("");
      onToast?.("Fayl biriktirildi", "success");
    } catch (err) {
      onToast?.(err.message || "Fayl yuklab boР Р†Р вЂљР’Вlmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  function renderAttachmentPreview(item) {
    const mime = String(item.mime_type || "");
    if (mime.startsWith("image/")) {
      return <img src={item.file_url} alt={item.original_name} className="attachment-preview-image" />;
    }
    if (mime.startsWith("video/")) {
      return <video src={item.file_url} className="attachment-preview-video" controls preload="metadata" />;
    }
    if (mime.includes("pdf")) {
      return <iframe title={item.original_name} src={item.file_url} className="attachment-preview-pdf" />;
    }
    return <div className="attachment-preview-generic">{mime || "FILE"}</div>;
  }

  return (
    <div className="discussion-panel">
      <div className="discussion-col">
        <h4>Izohlar</h4>
        <div className="discussion-list">
          {comments.length ? comments.map((item) => (
            <div key={item.id} className="discussion-item">
              <strong>{item.author_name || "Foydalanuvchi"}</strong>
              <span>{formatDateTime(item.created_at)}</span>
              <p>{item.body}</p>
            </div>
          )) : <div className="empty-block">Hozircha izoh yoР Р†Р вЂљР’Вq</div>}
        </div>
        <form className="discussion-form" onSubmit={submitComment}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ichki izoh yozing..." />
          <button type="submit" className="btn secondary" disabled={saving}>Izoh qoР Р†Р вЂљР’Вshish</button>
        </form>
      </div>
      <div className="discussion-col">
        <h4>Biriktirmalar</h4>
        <div className="discussion-list">
          {attachments.length ? attachments.map((item) => (
            <a key={item.id} href={item.file_url} target="_blank" rel="noreferrer" className="attachment-item">
              {renderAttachmentPreview(item)}
              <strong>{item.original_name}</strong>
              <span>{item.mime_type || "file"}</span>
            </a>
          )) : <div className="empty-block">Hozircha fayl yoР Р†Р вЂљР’Вq</div>}
        </div>
        <div className="discussion-upload">
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button type="button" className="btn secondary" onClick={uploadAttachment} disabled={!file || saving}>Fayl biriktirish</button>
        </div>
      </div>
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
        <button type="button" className="icon-btn" onClick={onView} title="KoР Р†Р вЂљР’Вrish">
          <Eye size={16} />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className="icon-btn" onClick={onEdit} title="Tahrirlash">
          <Pencil size={16} />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="icon-btn danger" onClick={onDelete} title="OР Р†Р вЂљР’Вchirish">
          <Trash2 size={16} />
        </button>
      ) : null}
    </div>
  );
}

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, 2800);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  return (
    <div className={`toast toast-${toast.type || "success"}`}>
      <div className="toast-glow" />
      <div className="toast-copy">
        <strong>{toast.type === "error" ? "Xatolik" : "Bajarildi"}</strong>
        <span>{toast.message}</span>
      </div>
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
            <h3>SoР Р†Р вЂљР’Вnggi yangiliklar</h3>
          </div>
          <button type="button" className="btn secondary" onClick={onReadAll}>
            Hammasini oР Р†Р вЂљР’Вqildi
          </button>
        </div>

        <div className="drawer-list">
          {notifications.length ? (
            notifications.map((item) => (
              <div key={item.id} className={`notif-card ${item.is_read ? "read" : ""}`}>
                <div className="notif-title">{item.title}</div>
                <div className="notif-body">{item.body}</div>
                <div className="notif-footer">
                  <span className={notificationCategoryClass(item.category || item.type)}>{item.category || item.type}</span>
                  {!item.is_read ? (
                    <button type="button" className="link-btn" onClick={() => onRead(item.id)}>
                      OР Р†Р вЂљР’Вqildi
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-block">Hozircha bildirishnoma yoР Р†Р вЂљР’Вq</div>
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

function taskStatusClass(status) {
  if (status === "done") return "status-badge done";
  if (status === "doing") return "status-badge doing";
  if (status === "cancelled") return "status-badge cancelled";
  return "status-badge todo";
}

function KanbanBoard({ columns = [], rows = [], getColumnId, renderCard, onMove }) {
  const [dragId, setDragId] = useState(null);

  return (
    <div className="kanban-board">
      {columns.map((column) => {
        const items = rows.filter((row) => getColumnId(row) === column.id);
        return (
          <div
            key={column.id}
            className={`kanban-column ${column.tone || ""}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragId != null) onMove(dragId, column.id);
              setDragId(null);
            }}
          >
            <div className="kanban-head">
              <strong>{column.label}</strong>
              <span>{items.length}</span>
            </div>
            <div className="kanban-cards">
              {items.length ? items.map((row) => (
                <div
                  key={row.id}
                  className="kanban-card"
                  draggable
                  onDragStart={() => setDragId(row.id)}
                >
                  {renderCard(row)}
                </div>
              )) : <div className="kanban-empty">Bo'sh</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function approvalStatusMeta(status, kind = "content") {
  const normalized = String(status || "").toLowerCase();
  const contentMap = {
    reja: { label: "Reja", tone: "todo" },
    tasdiqlandi: { label: "Tasdiqlandi", tone: "warning" },
    jarayonda: { label: "Jarayonda", tone: "doing" },
    tayyorlanmoqda: { label: "Jarayonda", tone: "doing" },
    tayyor: { label: "Jarayonda", tone: "doing" },
    tasvirga_olindi: { label: "Jarayonda", tone: "doing" },
    joylangan: { label: "Yakunlandi", tone: "done" },
    yakunlandi: { label: "Yakunlandi", tone: "done" },
    qayta_ishlash: { label: "Qayta ishlash", tone: "warning" },
    rad_etildi: { label: "Rad etildi", tone: "cancelled" },
    bekor_qilingan: { label: "Bekor qilingan", tone: "cancelled" }
  };
  const travelMap = {
    reja: { label: "Reja", tone: "todo" },
    tasdiqlandi: { label: "Tasdiqlandi", tone: "warning" },
    jarayonda: { label: "Jarayonda", tone: "doing" },
    tasvirga_olindi: { label: "Jarayonda", tone: "doing" },
    yakunlandi: { label: "Yakunlandi", tone: "done" },
    qayta_ishlash: { label: "Qayta ishlash", tone: "warning" },
    rad_etildi: { label: "Rad etildi", tone: "cancelled" }
  };
  const map = kind === "travel" ? travelMap : contentMap;
  return map[normalized] || { label: status || "-", tone: "default" };
}

function approvalStatusClass(status, kind = "content") {
  return `status-badge ${approvalStatusMeta(status, kind).tone}`;
}

function formatApprovalStatus(status, kind = "content") {
  return approvalStatusMeta(status, kind).label;
}

function priorityClass(priority) {
  if (priority === "high") return "priority-badge high";
  if (priority === "low") return "priority-badge low";
  return "priority-badge medium";
}

function expenseCategoryClass(category) {
  if (category === "reklama") return "mini-badge info";
  if (category === "safar") return "mini-badge warning";
  if (category === "servis") return "mini-badge success";
  return "mini-badge default";
}

function paymentTypeClass(paymentType) {
  if (paymentType === "visa") return "mini-badge danger";
  if (paymentType === "bank") return "mini-badge info";
  if (paymentType === "cash") return "mini-badge warning";
  return "mini-badge default";
}

function notificationCategoryClass(category) {
  if (category === "chat") return "mini-badge info";
  if (category === "task" || category === "reminder") return "mini-badge warning";
  if (category === "bonus") return "mini-badge success";
  if (category === "approval") return "mini-badge danger";
  if (category === "attachment") return "mini-badge default";
  return "mini-badge default";
}

function taskRowClass(status) {
  if (status === "done") return "table-row-success";
  if (status === "doing") return "table-row-info";
  if (status === "cancelled") return "table-row-danger";
  return "table-row-warning";
}

function taskStatusLabel(status) {
  const labels = {
    todo: "Rejada",
    doing: "Bajarilmoqda",
    done: "Bajarilgan",
    cancelled: "Bekor qilingan"
  };
  return labels[status] || status;
}

function isUserOnline(lastSeenAt) {
  if (!lastSeenAt) return false;
  const seenAt = new Date(lastSeenAt).getTime();
  if (Number.isNaN(seenAt)) return false;
  return Date.now() - seenAt < 90 * 1000;
}

function SavedViews({ storageKey, currentValue, onApply }) {
  const [views, setViews] = useState([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setViews(raw ? JSON.parse(raw) : []);
    } catch {
      setViews([]);
    }
  }, [storageKey]);

  function persist(nextViews) {
    setViews(nextViews);
    localStorage.setItem(storageKey, JSON.stringify(nextViews));
  }

  function saveCurrent() {
    const name = window.prompt("Saved view nomini kiriting");
    if (!name?.trim()) return;
    const nextViews = [
      { id: `${Date.now()}`, name: name.trim(), value: currentValue },
      ...views.filter((item) => item.name !== name.trim())
    ].slice(0, 8);
    persist(nextViews);
  }

  return (
    <div className="saved-views">
      <button type="button" className="btn secondary tiny" onClick={saveCurrent}>View saqlash</button>
      {views.map((item) => (
        <div key={item.id} className="saved-view-pill">
          <button type="button" className="link-btn" onClick={() => onApply(item.value)}>{item.name}</button>
          <button
            type="button"
            className="saved-view-remove"
            onClick={() => persist(views.filter((view) => view.id !== item.id))}
          >
            <X size={12} />
          </button>
        </div>
      ))}
    </div>
  );
}

function getAvatarFallback(name = "") {
  return String(name || "?").trim().slice(0, 1).toUpperCase() || "?";
}

function hasPermission(user, permission) {
  if (user?.role === "admin") return true;
  return safePermissions(user?.permissions_json).includes(permission);
}

function canManagePage(user, pageKey, action) {
  if (user?.role === "admin") return true;
  return hasPermission(user, pageKey) || hasPermission(user, `${pageKey}_${action}`);
}

const LOGIN_LOGO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1d4ed8"/>
          <stop offset="55%" stop-color="#38bdf8"/>
          <stop offset="100%" stop-color="#6ee7b7"/>
        </linearGradient>
      </defs>
      <rect x="10" y="10" width="140" height="140" rx="42" fill="url(#g)"/>
      <circle cx="58" cy="56" r="16" fill="rgba(255,255,255,0.32)"/>
      <path d="M79 43c18 0 33 15 33 33S97 109 79 109 46 94 46 76s15-33 33-33Z" fill="rgba(255,255,255,0.16)"/>
      <path d="M84.8 110H68.7l4.9-14.5H60.7L83.5 50h16.4l-5.2 15.6h13.4z" fill="white"/>
    </svg>
  `);

function LoginPage({ onLoggedIn, settings }) {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const logoSrc = settings?.logo_url || LOGIN_LOGO;

  async function submit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      await api.login({ phone, password });
      const me = await api.me();
      onLoggedIn(me.user);
    } catch (err) {
      setError(err.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-particles">
        {Array.from({ length: 18 }).map((_, index) => (
          <span
            key={index}
            className="login-particle"
            style={{
              left: `${6 + index * 5.1}%`,
              animationDelay: `${index * 0.6}s`,
              animationDuration: `${12 + (index % 5) * 2.3}s`
            }}
          />
        ))}
      </div>
      <div className="login-orb orb-one" />
      <div className="login-orb orb-two" />
      <div className="login-grid-line" />

      <div className="login-copy">
        <div className="brand-kicker">aloo Р Р†Р вЂљРЎС› yagona platforma</div>
        <div className="login-logo-lockup">
          <img src={logoSrc} alt="aloo logo" className="login-logo-image" />
          <div className="login-logo-copy">
            <strong>{settings?.company_name || "aloo SMM"}</strong>
            <span>{settings?.platform_name || "Yagona boshqaruv platformasi"}</span>
          </div>
        </div>
        <h1>Assalomu alaykum</h1>
        <h2>aloo doР Р†Р вЂљР’Вkonlar tarmogР Р†Р вЂљР’Вi SMM jamoasi yagona maР Р†Р вЂљРІвЂћСћlumotlar platformasiga xush kelibsiz</h2>
        <p>Kirish uchun login va parolingizni kiriting.</p>
        <div className="login-feature-row">
          <div className="login-feature-card">
            <strong>Kontent</strong>
            <span>Reja, bonus va ijro jarayonlari bir joyda.</span>
          </div>
          <div className="login-feature-card">
            <strong>Jamoa</strong>
            <span>Chat, vazifa va hisobotlar bir panelda boshqariladi.</span>
          </div>
        </div>
      </div>

      <form className="login-card" onSubmit={submit}>
        <div className="login-card-shine" />
        {loading ? (
          <div className="login-loading">
            <div className="login-loader-ring" />
            <span>Kirish tekshirilmoqda...</span>
          </div>
        ) : null}
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

function DashboardPage({ summary = {}, dailyReports = [], bonusItems = [], contentRows = [], campaigns = [], travelPlans = [], user = null }) {
  const currentMonth = getMonthLabel();
  const roleLabelMap = {
    admin: "Admin boshqaruv paneli",
    manager: "Manager nazorat paneli",
    mobilograf: "Mobilograf ish maydoni",
    editor: "Editor ish maydoni",
    viewer: "Kuzatuv paneli"
  };
  const heroTitle = roleLabelMap[user?.role] || "aloo SMM jamoasi platformasi";
  const heroText =
    user?.role === "mobilograf"
      ? "Bugungi vazifalar, safar rejalari va kontent topshiriqlari bir joyda."
      : user?.role === "editor"
        ? "Tasdiqlash, montaj va kontent jarayonlarini bir ekranda kuzating."
        : "Kontent reja, bonus, filial hisobotlari va media boshqaruvi bitta joyda.";

  const thisMonthContent = (contentRows || []).filter((row) => {
    if (!row.publish_date) return false;
    return formatDate(row.publish_date).slice(0, 7) === currentMonth;
  });

  const totalPlan = thisMonthContent.length;
  const postedCount = thisMonthContent.filter((row) => row.status === "joylangan").length;
  const progress = totalPlan ? Math.round((postedCount / totalPlan) * 100) : 0;

  const thisMonthBonus = (bonusItems || [])
    .filter((row) => (row.month_label || formatDate(row.work_date).slice(0, 7)) === currentMonth)
    .reduce((sum, row) => sum + Number(row.total_amount || row.amount || 0), 0);
  const reminders = summary?.reminders || [];
  const bonusSeries = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const label = getMonthTitle(getMonthLabel(date)).split(" ")[0];
    const amount = index === 5 ? Number(summary?.monthly_bonus_amount || thisMonthBonus) : Math.round((Number(summary?.monthly_bonus_amount || thisMonthBonus) || 0) * ((index + 2) / 8));
    return { label, amount };
  });
  const contentSeries = [
    { label: "Reja", value: thisMonthContent.filter((r) => r.status === "reja").length },
    { label: "Tasdiqlandi", value: thisMonthContent.filter((r) => r.status === "tasdiqlandi").length },
    { label: "Jarayonda", value: thisMonthContent.filter((r) => ["tayyorlanmoqda", "jarayonda"].includes(r.status)).length },
    { label: "Yakunlandi", value: thisMonthContent.filter((r) => ["joylangan", "yakunlandi"].includes(r.status)).length }
  ];
  const spendSeries = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    const label = getMonthTitle(getMonthLabel(date)).split(" ")[0];
    const monthKey = getMonthLabel(date);
    const amount = (campaigns || [])
      .filter((item) => {
        const startKey = formatDate(item.start_date).slice(0, 7);
        const endKey = formatDate(item.end_date).slice(0, 7);
        return startKey === monthKey || endKey === monthKey;
      })
      .reduce((sum, item) => sum + Number(item.spend || 0), 0);
    return { label, amount };
  });
  const branchKpis = Object.values((dailyReports || []).reduce((acc, row) => {
    const key = row.branch_name || "Filialsiz";
    if (!acc[key]) {
      acc[key] = { name: key, score: 0, subscribers: 0 };
    }
    acc[key].score += Number(row.posts_count || 0) * 2 + Number(row.reels_count || 0) * 3 + Number(row.stories_count || 0);
    acc[key].subscribers += Number(row.subscriber_count || 0);
    return acc;
  }, {})).sort((a, b) => b.score - a.score).slice(0, 5);
  const travelWorkflow = [
    { label: "Reja", value: (travelPlans || []).filter((item) => item.status === "reja").length },
    { label: "Tasdiqlandi", value: (travelPlans || []).filter((item) => item.status === "tasdiqlandi").length },
    { label: "Jarayonda", value: (travelPlans || []).filter((item) => ["jarayonda", "tasvirga_olindi"].includes(item.status)).length },
    { label: "Yakunlandi", value: (travelPlans || []).filter((item) => item.status === "yakunlandi").length }
  ];
  const maxBonusPoint = Math.max(...bonusSeries.map((item) => item.amount), 1);
  const maxContentPoint = Math.max(...contentSeries.map((item) => item.value), 1);
  const maxSpendPoint = Math.max(...spendSeries.map((item) => item.amount), 1);
  const maxBranchScore = Math.max(...branchKpis.map((item) => item.score), 1);
  const smartAlerts = summary?.smart_alerts || [];
  const approvalSlaBreaches = [...(contentRows || []), ...(travelPlans || [])].filter((row) => {
    const status = String(row.status || "");
    if (["tasdiqlandi", "yakunlandi", "joylangan", "published", "approved", "archived"].includes(status)) return false;
    const createdAt = new Date(row.created_at || row.plan_date || row.publish_date || Date.now());
    if (Number.isNaN(createdAt.getTime())) return false;
    return (Date.now() - createdAt.getTime()) / 3600000 >= 48;
  }).length;

  return (
    <div className="page-grid">
      <div className="hero-banner">
        <div>
          <div className="small-label">Boshqaruv markazi</div>
          <h1>{heroTitle}</h1>
          <p>{heroText}</p>
          <div className="hero-summary">{summary?.executive_summary || "Executive summary tayyorlanmoqda..."}</div>
        </div>
      </div>

      {smartAlerts.length ? (
        <div className="card">
          <SectionTitle title="Smart alerts" desc="Muhim signal va ogohlantirishlar" />
          <div className="workflow-strip">
            {smartAlerts.map((item, index) => (
              <div key={`alert-${index}`} className={`reminder-card ${item.type === "danger" ? "danger" : "warning"}`}>
                <strong>{item.type === "danger" ? "Diqqat" : "Eslatma"}</strong>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="stats-grid">
        <StatCard
          title="Kontent reja bajarilishi"
          value={`${progress}%`}
          hint={`${postedCount} / ${totalPlan} joylangan`}
          tone={progress >= 70 ? "success" : progress >= 40 ? "warning" : "danger"}
        />
        <StatCard
          title="Joriy oy bonus puli"
          value={formatMoney(thisMonthBonus)}
          hint={getMonthTitle(currentMonth)}
          tone="info"
        />
        <StatCard
          title="Bugungi filial hisobotlari"
          value={summary?.today_report_count || 0}
          hint="bugungi maР Р†Р вЂљРІвЂћСћlumot"
          tone={(summary?.today_report_count || 0) > 0 ? "success" : "default"}
        />
        <StatCard
          title="Faol vazifalar"
          value={summary?.task_count || 0}
          hint="umumiy vazifalar"
          tone="default"
        />
      </div>

      <div className="stats-grid analytics-grid">
        <StatCard title="Kunlik vazifa progress" value={`${summary?.daily_task_progress || 0}%`} hint={`${summary?.daily_task_done || 0} / ${summary?.daily_task_total || 0}`} tone={(summary?.daily_task_progress || 0) >= 70 ? "success" : (summary?.daily_task_progress || 0) >= 40 ? "warning" : "danger"} />
        <StatCard title="Kechikkan vazifalar" value={summary?.overdue_task_count || 0} hint="darhol ko'rib chiqing" tone={(summary?.overdue_task_count || 0) > 0 ? "danger" : "success"} />
        <StatCard title="3 kun ichidagi vazifalar" value={summary?.due_soon_task_count || 0} hint="eslatma kerak" tone={(summary?.due_soon_task_count || 0) > 0 ? "warning" : "success"} />
        <StatCard title="Oy reklama sarfi" value={formatMoney(summary?.monthly_campaign_spend || 0)} hint={getMonthTitle(currentMonth)} tone="info" />
        <StatCard title="Approval SLA" value={approvalSlaBreaches} hint="48 soatdan oshgan jarayonlar" tone={approvalSlaBreaches > 0 ? "danger" : "success"} />
      </div>

      <div className="two-grid">
        <div className="card">
          <SectionTitle title="SoР Р†Р вЂљР’Вnggi filial hisobotlari" />
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
                    <td>{formatDate(row.report_date)}</td>
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
          <SectionTitle title="Kontent approval workflow" />
          <div className="quick-list">
            {contentSeries.map((item) => (
              <div key={item.label} className="quick-item">
                {item.label}: <strong>{item.value}</strong>
              </div>
            ))}
            <div className="quick-item">Bekor qilingan: <strong>{thisMonthContent.filter((r) => r.status === "bekor_qilingan").length}</strong></div>
          </div>
        </div>
      </div>

      <div className="two-grid">
        <div className="card">
          <SectionTitle title="Task Reminders" desc="Yaqinlashayotgan va kechikkan vazifalar" />
          <div className="reminder-list">
            {reminders.length ? reminders.map((item) => (
              <div key={item.id} className={`reminder-card ${formatDate(item.due_date) < formatDate(new Date()) ? "danger" : "warning"}`}>
                <strong>{item.title}</strong>
                <span>{formatDate(item.due_date)} Р Р†Р вЂљРЎС› {taskStatusLabel(item.status)}</span>
              </div>
            )) : <div className="empty-block">Hozircha eslatma yo'q</div>}
          </div>
        </div>

        <div className="card">
          <SectionTitle title="Analytics" desc="Joriy oy bo'yicha tezkor ko'rsatkichlar" />
          <div className="quick-list">
            <div className="quick-item">Kontentlar soni: <strong>{summary?.monthly_content_count || 0}</strong></div>
            <div className="quick-item">Bonus stavkasi: <strong>{formatMoney(summary?.bonus_rate || 25000)}</strong></div>
            <div className="quick-item">Hisoblangan bonus: <strong>{formatMoney(summary?.monthly_bonus_amount || thisMonthBonus)}</strong></div>
            <div className="quick-item">Filial hisobotlari: <strong>{summary?.today_report_count || 0}</strong></div>
          </div>
          <div className="chart-grid">
            <div className="chart-card">
              <div className="chart-title">Oyma-oy bonus</div>
              <div className="line-chart">
                {bonusSeries.map((item) => (
                  <div key={item.label} className="line-point">
                    <span className="line-dot" style={{ bottom: `${(item.amount / maxBonusPoint) * 100}%` }} />
                    <label>{item.label}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-title">Kontent bajarilish foizi</div>
              <div className="bar-chart">
                {contentSeries.map((item) => (
                  <div key={item.label} className="bar-item">
                    <span>{item.label}</span>
                    <div className="bar-track"><i style={{ width: `${Math.max((item.value / maxContentPoint) * 100, item.value ? 10 : 0)}%` }} /></div>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-title">Oyma-oy reklama sarfi</div>
              <div className="line-chart">
                {spendSeries.map((item) => (
                  <div key={item.label} className="line-point">
                    <span className="line-dot spend" style={{ bottom: `${(item.amount / maxSpendPoint) * 100}%` }} />
                    <label>{item.label}</label>
                  </div>
                ))}
              </div>
            </div>
            <div className="chart-card">
              <div className="chart-title">Filial KPI</div>
              <div className="bar-chart">
                {branchKpis.length ? branchKpis.map((item) => (
                  <div key={item.name} className="bar-item">
                    <span>{item.name}</span>
                    <div className="bar-track branch"><i style={{ width: `${Math.max((item.score / maxBranchScore) * 100, item.score ? 10 : 0)}%` }} /></div>
                    <strong>{item.score}</strong>
                  </div>
                )) : <div className="empty-block">Filial KPI hali yo'q</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="two-grid">
        <div className="card">
          <SectionTitle title="Safar approval workflow" desc="Safar rejalari jarayoni" />
          <div className="quick-list">
            {travelWorkflow.map((item) => (
              <div key={item.label} className="quick-item">
                {item.label}: <strong>{item.value}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <SectionTitle title="Export center" desc="Barcha tezkor eksportlar bir joyda" />
          <div className="export-center">
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/users.xlsx", "users.xlsx")}>Users Excel</button>
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/content.xlsx", "content.xlsx")}>Content Excel</button>
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/bonuses.xlsx", "bonuses.xlsx")}>Bonus Excel</button>
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/daily-reports.xlsx", "daily-reports.xlsx")}>Daily report Excel</button>
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/daily-reports.pdf", "daily-reports.pdf")}>Daily report PDF</button>
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/campaigns.xlsx", "campaigns.xlsx")}>Campaign Excel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentPage({ users = [], branches = [], settings, onToast, reload }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthLabel());
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bonusMode, setBonusMode] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [viewMode, setViewMode] = useState("table");

  const emptyForm = {
    title: "",
    publish_date: "",
    status: "reja",
    platform_primary: "Instagram",
    platform_secondary: "",
    content_type: "post",
    assigned_user_id: "",
    editor_user_id: "",
    face_voice_user_id: "",
    proposal_count: "",
    approved_count: "",
    approval_comment: "",
    content_template: "custom",
    idea_score: 0,
    visual_score: 0,
    editing_score: 0,
    result_score: 0,
    reach_value: 0
  };

  const [form, setForm] = useState(emptyForm);
  const isVideo = form.content_type === "video";
  const dueSoonTasks = [];
  const overdueTasks = [];
  const tasks = [];
  const workflowCounts = {
    reja: rows.filter((item) => item.status === "reja").length,
    tasdiqlandi: rows.filter((item) => item.status === "tasdiqlandi").length,
    jarayonda: rows.filter((item) => ["jarayonda", "tayyorlanmoqda", "tayyor"].includes(item.status)).length,
    qayta_ishlash: rows.filter((item) => item.status === "qayta_ishlash").length,
    rad_etildi: rows.filter((item) => item.status === "rad_etildi").length,
    yakunlandi: rows.filter((item) => ["yakunlandi", "joylangan"].includes(item.status)).length
  };

  async function loadMonth(monthValue = selectedMonth) {
    try {
      setLoading(true);
      const data = await api.list("content", { month: monthValue });
      const sorted = (data || []).sort((a, b) => {
        const aDate = a.publish_date ? new Date(a.publish_date).getTime() : 0;
        const bDate = b.publish_date ? new Date(b.publish_date).getTime() : 0;
        return bDate - aDate;
      });
      setRows(sorted);
    } catch (err) {
      onToast(err.message || "Kontent rejani olib boР Р†Р вЂљР’Вlmadi", "error");
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

  function resetForm() {
    setForm(emptyForm);
    setBonusMode(false);
    setEditRow(null);
  }

  const bonusRate = Number(settings?.bonus_rate || 25000);

  function startEdit(row) {
    setEditRow(row);
    const platforms = String(row.platform || "").split(",").map((x) => x.trim()).filter(Boolean);

    setForm({
      title: row.title || "",
      publish_date: formatDate(row.publish_date) === "-" ? "" : formatDate(row.publish_date),
      status: row.status || "reja",
      platform_primary: platforms[0] || "Instagram",
      platform_secondary: platforms[1] || "",
      content_type: row.content_type || "post",
      assigned_user_id: row.assigned_user_id || "",
      editor_user_id: row.video_editor_user_id || "",
      face_voice_user_id: row.video_face_user_id || "",
      proposal_count: row.proposal_count ?? "",
      approved_count: row.approved_count ?? "",
      approval_comment: row.approval_comment || "",
      content_template: row.content_template || "custom",
      idea_score: row.idea_score || 0,
      visual_score: row.visual_score || 0,
      editing_score: row.editing_score || 0,
      result_score: row.result_score || 0,
      reach_value: row.reach_value || 0
    });

    setBonusMode(!!row.bonus_enabled);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (isVideo) {
      if (!form.editor_user_id || !form.face_voice_user_id) {
        onToast("Video uchun 2 ta hodim tanlanishi kerak", "error");
        return;
      }
    } else {
      if (!form.assigned_user_id) {
        onToast("MasР Р†Р вЂљРІвЂћСћul shaxsni tanlang", "error");
        return;
      }
    }

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
        assigned_user_id: isVideo ? null : form.assigned_user_id || null,
        video_editor_user_id: isVideo ? form.editor_user_id || null : null,
        video_face_user_id: isVideo ? form.face_voice_user_id || null : null,
        bonus_enabled: bonusMode,
        proposal_count: bonusMode ? Number(form.proposal_count || 0) : 0,
        approved_count: bonusMode ? Number(form.approved_count || 0) : 0,
        notes: "",
        approval_comment: form.approval_comment || "",
        content_template: form.content_template || "custom",
        idea_score: Number(form.idea_score || 0),
        visual_score: Number(form.visual_score || 0),
        editing_score: Number(form.editing_score || 0),
        result_score: Number(form.result_score || 0),
        reach_value: Number(form.reach_value || 0)
      };

      if (editRow?.id) {
        await api.update("content", editRow.id, payload);
        onToast("Kontent reja yangilandi Р Р†РЎС™РІР‚В¦", "success");
      } else {
        await api.create("content", payload);
        onToast("Kontent reja saqlandi Р Р†РЎС™РІР‚В¦", "success");
      }

      await loadMonth(selectedMonth);
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Saqlashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham oР Р†Р вЂљР’Вchirilsinmi?");
    if (!ok) return;

    try {
      const numericId = Number(id);
      if (!numericId) {
        onToast("Kontent ID topilmadi", "error");
        return;
      }
      await api.remove("content", numericId);
      setRows((prev) => prev.filter((row) => Number(row.id) !== numericId));
      await loadMonth(selectedMonth);
      await reload();
      onToast("Kontent oР Р†Р вЂљР’Вchirildi", "success");
    } catch (err) {
      onToast(err.message || "OР Р†Р вЂљР’Вchirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      {false ? <div className="card">
        <SectionTitle
          title={editRow ? "Kontent rejani tahrirlash" : "Kontent reja yaratish"}
          desc={`${getMonthTitle(selectedMonth)} uchun`}
          right={
            <div className="toolbar-actions">
              <button type="button" className="btn secondary" onClick={() => setViewMode(viewMode === "table" ? "calendar" : viewMode === "calendar" ? "kanban" : "table")}>
                {viewMode === "table" ? "Calendar view" : viewMode === "calendar" ? "Kanban view" : "Table view"}
              </button>
              <button type="button" className="btn secondary" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
                <- Oldingi oy
              </button>
              <div className="summary-pill">
                <strong>{getMonthTitle(selectedMonth)}</strong>
              </div>
              <button type="button" className="btn secondary" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>
                Keyingi oy ->
              </button>
              {editRow ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}
            </div>
          }
        />

        <div className="info-banner">
          Bonus formulasi: 1 ta taklif yoki tasdiq = <strong>{formatMoney(bonusRate)}</strong>
        </div>
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Kontent nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label><span>Joylash sanasi</span><input type="date" value={form.publish_date} onChange={(e) => setField("publish_date", e.target.value)} required /></label>
          <label>
            <span>Holati</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="reja">Reja</option>
              <option value="tasdiqlandi">Tasdiqlandi</option>
              <option value="jarayonda">Jarayonda</option>
              <option value="qayta_ishlash">Qayta ishlash</option>
              <option value="rad_etildi">Rad etildi</option>
              <option value="yakunlandi">Yakunlandi</option>
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

          {isVideo ? (
            <>
              <label>
                <span>Montaj kim qildi</span>
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
            </>
          ) : (
            <label>
              <span>Mas'ul shaxs</span>
              <select value={form.assigned_user_id} onChange={(e) => setField("assigned_user_id", e.target.value)}>
                <option value="">Tanlang</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </label>
          )}

          <label className="checkbox-row">
            <input type="checkbox" checked={bonusMode} onChange={(e) => setBonusMode(e.target.checked)} />
            <span>Bonusga o'tkazish</span>
          </label>

          {bonusMode ? (
            <>
              <label><span>Taklif soni</span><input type="number" min="0" value={form.proposal_count} onChange={(e) => setField("proposal_count", e.target.value)} required /></label>
              <label><span>Tasdiq soni</span><input type="number" min="0" value={form.approved_count} onChange={(e) => setField("approved_count", e.target.value)} /></label>
            </>
          ) : null}

          <label className="full-col"><span>Approval izohi</span><textarea value={form.approval_comment} onChange={(e) => setField("approval_comment", e.target.value)} rows={2} placeholder="Tasdiqlash yoki qayta ishlash bo'yicha izoh" /></label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Saqlash"}
          </button>
        </form>
      </div>

      

      {false ? <div className="card">
        <SectionTitle title="Workflow reminders" desc="Ayni paytda workflow eslatmalari shu blokda chiqadi" />
        <div className="workflow-strip">
          {[...overdueTasks, ...dueSoonTasks].slice(0, 6).map((row) => (
            <div key={`reminder-${row.id}`} className={`reminder-card ${overdueTasks.some((item) => item.id === row.id) ? "danger" : ""}`}>
              <strong>{row.title}</strong>
              <span>{formatDate(row.due_date)} Р Р†Р вЂљРЎС› {taskStatusLabel(row.status)}</span>
            </div>
          ))}
          {!overdueTasks.length && !dueSoonTasks.length ? <div className="empty-block">Hozircha eslatma yo'q</div> : null}
        </div>
      </div> : null}

      <div className="card">
        <SectionTitle
          title={`${getMonthTitle(selectedMonth)} kontent rejasi`}
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

        {viewMode === "table" ? <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kontent nomi</th>
                <th>Joylash sanasi</th>
                <th>Holati</th>
                <th>Platforma</th>
                <th>Kontent turi</th>
                <th>MasР Р†Р вЂљРІвЂћСћul / Video</th>
                <th>Bonus</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="empty-cell">Yuklanmoqda...</td></tr>
              ) : rows.length ? (
                rows.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{formatDate(row.publish_date)}</td>
                    <td><span className={approvalStatusClass(row.status)}>{formatApprovalStatus(row.status)}</span></td>
                    <td>{row.platform || "-"}</td>
                    <td>{row.content_type || "-"}</td>
                    <td>
                      {row.content_type === "video"
                        ? `${row.video_editor_name || "-"} / ${row.video_face_name || "-"}`
                        : row.assignee_name || "-"}
                    </td>
                    <td>{row.bonus_enabled ? "Ha" : "YoР Р†Р вЂљР’Вq"}</td>
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="empty-cell">Bu oy uchun reja yoР Р†Р вЂљР’Вq</td></tr>
              )}
            </tbody>
          </table>
        </div> : viewMode === "calendar" ? (
          <MiniCalendar
            monthLabel={selectedMonth}
            rows={rows}
            dateKey="publish_date"
            onMoveDate={async (id, nextDate) => {
              const row = rows.find((item) => item.id === id);
              if (!row) return;
              try {
                await api.update("content", id, {
                  ...row,
                  publish_date: nextDate,
                  assigned_user_id: row.assigned_user_id || null,
                  video_editor_user_id: row.video_editor_user_id || null,
                  video_face_user_id: row.video_face_user_id || null,
                  branch_ids_json: Array.isArray(row.branch_ids_json) ? row.branch_ids_json : [],
                  approval_comment: row.approval_comment || ""
                });
                await loadMonth(selectedMonth);
                await reload();
                onToast("Kontent sanasi ko'chirildi", "success");
              } catch (err) {
                onToast(err.message || "Sanani ko'chirib bo'lmadi", "error");
              }
            }}
            renderItem={(item) => (
              <button key={item.id} type="button" className={`calendar-pill ${item.bonus_enabled ? "bonus" : ""}`} onClick={() => setViewRow(item)}>
                {item.title}
              </button>
            )}
          />
        ) : (
          <KanbanBoard
            columns={[
              { id: "reja", label: "Reja", tone: "default" },
              { id: "tasdiqlandi", label: "Tasdiqlandi", tone: "warning" },
              { id: "jarayonda", label: "Jarayonda", tone: "info" },
              { id: "qayta_ishlash", label: "Qayta ishlash", tone: "warning" },
              { id: "rad_etildi", label: "Rad etildi", tone: "danger" },
              { id: "yakunlandi", label: "Yakunlandi", tone: "success" }
            ]}
            rows={rows.map((item) => ({
              ...item,
              status: ["tayyorlanmoqda", "tayyor"].includes(item.status) ? "jarayonda" : ["joylangan"].includes(item.status) ? "yakunlandi" : item.status
            }))}
            getColumnId={(row) => row.status}
            renderCard={(row) => (
              <>
                <strong>{row.title}</strong>
                <span>{formatDate(row.publish_date)}</span>
                <span>{row.platform || "-"}</span>
              </>
            )}
            onMove={async (id, status) => {
              const row = rows.find((item) => item.id === id);
              if (!row) return;
              try {
                await api.update("content", id, {
                  ...row,
                  assigned_user_id: row.assigned_user_id || null,
                  video_editor_user_id: row.video_editor_user_id || null,
                  video_face_user_id: row.video_face_user_id || null,
                  branch_ids_json: Array.isArray(row.branch_ids_json) ? row.branch_ids_json : [],
                  status
                });
                await loadMonth(selectedMonth);
                await reload();
              } catch (err) {
                onToast(err.message || "Kontent statusini o'zgartirib bo'lmadi", "error");
              }
            }}
          />
        )}
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Kontent reja tafsiloti">
        {viewRow ? (
          <>
            <div className="detail-grid">
              <div><strong>Kontent nomi:</strong> {viewRow.title}</div>
              <div><strong>Sana:</strong> {formatDate(viewRow.publish_date)}</div>
              <div><strong>Holati:</strong> <span className={approvalStatusClass(viewRow.status)}>{formatApprovalStatus(viewRow.status)}</span></div>
              <div><strong>Platforma:</strong> {viewRow.platform || "-"}</div>
              <div><strong>Turi:</strong> {viewRow.content_type || "-"}</div>
              <div><strong>Bonus:</strong> {viewRow.bonus_enabled ? "Ha" : "YoР Р†Р вЂљР’Вq"}</div>
              <div><strong>Taklif soni:</strong> {viewRow.proposal_count || 0}</div>
              <div><strong>Tasdiq soni:</strong> {viewRow.approved_count || 0}</div>
              <div className="full-col"><strong>Approval izohi:</strong> {viewRow.approval_comment || "-"}</div>
            </div>
            <DiscussionPanel entityType="content" entityId={viewRow.id} onToast={onToast} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function BonusPage({ bonusItems = [], users = [], branches = [], settings, onToast, reload }) {
  const [monthFilter, setMonthFilter] = useState(getMonthLabel());
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const emptyForm = {
    title: "",
    work_date: "",
    content_type: "post",
    user_id: "",
    editor_user_id: "",
    face_voice_user_id: "",
    branch_id: "",
    proposal_count: "",
    approved_count: ""
  };

  const [form, setForm] = useState(emptyForm);
  const isVideo = form.content_type === "video";
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const bonusRate = Number(settings?.bonus_rate || 25000);

  const monthOptions = [...new Set(
    [getMonthLabel(), ...(bonusItems || []).map((i) => i.month_label || formatDate(i.work_date).slice(0, 7)).filter(Boolean)]
  )];

  const filteredItems = bonusItems.filter((item) =>
    monthFilter ? (item.month_label || formatDate(item.work_date).slice(0, 7)) === monthFilter : true
  );

  const totalProposalAmount = filteredItems.reduce((sum, item) => sum + Number(item.proposal_amount || 0), 0);
  const totalApprovedAmount = filteredItems.reduce((sum, item) => sum + Number(item.approved_amount || 0), 0);
  const totalAmount = filteredItems.reduce((sum, item) => sum + Number(item.total_amount || item.amount || 0), 0);

  const employeeStatsMap = new Map();

  filteredItems.forEach((item) => {
    const add = (name, amount) => {
      if (!name || name === "-") return;
      if (!employeeStatsMap.has(name)) employeeStatsMap.set(name, 0);
      employeeStatsMap.set(name, employeeStatsMap.get(name) + Number(amount || 0));
    };

    if (item.content_type === "video") {
      add(item.video_editor_name || "-", Number(item.total_amount || item.amount || 0));
      add(item.video_face_name || "-", Number(item.total_amount || item.amount || 0));
    } else {
      add(item.full_name || "-", Number(item.total_amount || item.amount || 0));
    }
  });

  const employeeStats = [...employeeStatsMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      title: row.content_title || "",
      work_date: formatDate(row.work_date) === "-" ? "" : formatDate(row.work_date),
      content_type: row.content_type || "post",
      user_id: row.user_id || "",
      editor_user_id: row.video_editor_user_id || "",
      face_voice_user_id: row.video_face_user_id || "",
      branch_id: row.branch_id || "",
      proposal_count: row.proposal_count ?? "",
      approved_count: row.approved_count ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (isVideo) {
      if (!form.editor_user_id || !form.face_voice_user_id) {
        onToast("Video uchun 2 ta hodim tanlanishi kerak", "error");
        return;
      }
    } else {
      if (!form.user_id) {
        onToast("Hodimni tanlang", "error");
        return;
      }
    }

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
        video_editor_user_id: isVideo ? form.editor_user_id || null : null,
        video_face_user_id: isVideo ? form.face_voice_user_id || null : null,
        branch_id: form.branch_id || null
      };

      if (editRow?.id) {
        await api.update("bonus-items", editRow.id, payload);
        onToast("Bonus hisobot yangilandi Р Р†РЎС™РІР‚В¦", "success");
      } else {
        await api.create("bonus-items", payload);
        onToast("Bonus hisobot saqlandi Р Р†РЎС™РІР‚В¦", "success");
      }

      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Saqlashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham oР Р†Р вЂљР’Вchirilsinmi?");
    if (!ok) return;
    try {
      const numericId = Number(id);
      if (!numericId) {
        onToast("Bonus ID topilmadi", "error");
        return;
      }
      await api.remove("bonus-items", numericId);
      await reload();
      onToast("Bonus yozuvi oР Р†Р вЂљР’Вchirildi", "success");
    } catch (err) {
      onToast(err.message || "OР Р†Р вЂљР’Вchirishda xatolik", "error");
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
                {monthOptions.map((m) => (
                  <option key={m} value={m}>{getMonthTitle(m)}</option>
                ))}
              </select>

              {editRow ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}

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

        <div className="info-banner">
          Bonus formulasi: 1 ta taklif yoki tasdiq = <strong>{formatMoney(bonusRate)}</strong>
        </div>

        <div className="stats-grid">
          <StatCard title="Taklif summasi" value={formatMoney(totalProposalAmount)} hint="joriy oy" />
          <StatCard title="Tasdiq summasi" value={formatMoney(totalApprovedAmount)} hint="joriy oy" />
          <StatCard title="Jami bonus" value={formatMoney(totalAmount)} hint={getMonthTitle(monthFilter)} />
          <StatCard title="Yozuvlar soni" value={filteredItems.length} hint="bonus hisobotlar" />
        </div>
      </div>

      <div className="card">
        <SectionTitle title={editRow ? "Bonus hisobotni tahrirlash" : "Hisobot qoР Р†Р вЂљР’Вshish"} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Kontent nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label><span>Joylangan sanasi</span><input type="date" value={form.work_date} onChange={(e) => setField("work_date", e.target.value)} required /></label>
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
            <span>Filial</span>
            <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)}>
              <option value="">Tanlang</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>

          <label><span>Taklif soni</span><input type="number" min="0" value={form.proposal_count} onChange={(e) => setField("proposal_count", e.target.value)} required /></label>
          <label><span>Tasdiq soni</span><input type="number" min="0" value={form.approved_count} onChange={(e) => setField("approved_count", e.target.value)} /></label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Hisobotni saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Hodim boР Р†Р вЂљР’Вyicha bonus summalari" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hodim</th>
                <th>Jami bonus</th>
              </tr>
            </thead>
            <tbody>
              {employeeStats.length ? (
                employeeStats.map((row, idx) => (
                  <tr key={`${row.name}-${idx}`}>
                    <td>{row.name}</td>
                    <td>{formatMoney(row.amount)}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="2" className="empty-cell">Bu oy uchun bonus yoР Р†Р вЂљР’Вq</td></tr>
              )}
            </tbody>
          </table>
        </div>
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
                <th>Hodim / Video</th>
                <th>Taklif</th>
                <th>Tasdiq</th>
                <th>Jami</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.length ? (
                filteredItems.map((row) => (
                  <tr key={row.id}>
                    <td>{row.content_title || "-"}</td>
                    <td>{formatDate(row.work_date)}</td>
                    <td>{row.content_type || "-"}</td>
                    <td>
                      {row.content_type === "video"
                        ? `${row.video_editor_name || "-"} / ${row.video_face_name || "-"}`
                        : row.full_name || "-"}
                    </td>
                    <td>{row.proposal_count || 0}</td>
                    <td>{row.approved_count || 0}</td>
                    <td>{formatMoney(row.total_amount || row.amount || 0)}</td>
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="empty-cell">Bu oy uchun bonus yozuvi yoР Р†Р вЂљР’Вq</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Bonus yozuvi tafsiloti">
        {viewRow ? (
          <>
            <div className="detail-grid">
            <div><strong>Kontent nomi:</strong> {viewRow.content_title || "-"}</div>
            <div><strong>Sana:</strong> {formatDate(viewRow.work_date)}</div>
            <div><strong>Turi:</strong> {viewRow.content_type || "-"}</div>
            <div><strong>Taklif:</strong> {viewRow.proposal_count || 0}</div>
            <div><strong>Tasdiq:</strong> {viewRow.approved_count || 0}</div>
            <div><strong>Jami:</strong> {formatMoney(viewRow.total_amount || viewRow.amount || 0)}</div>
            </div>
            <DiscussionPanel entityType="bonus_item" entityId={viewRow.id} onToast={onToast} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function DailyReportsPage({ reports = [], branches = [], onToast, reload }) {
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const emptyForm = {
    report_date: "",
    branch_id: "",
    stories_count: 0,
    posts_count: 0,
    reels_count: 0,
    subscriber_count: 0,
    condition_text: "",
    notes: ""
  };

  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredReports = filterDate
    ? reports.filter((row) => formatDate(row.report_date) === filterDate)
    : reports;

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      report_date: formatDate(row.report_date) === "-" ? "" : formatDate(row.report_date),
      branch_id: row.branch_id || "",
      stories_count: row.stories_count || 0,
      posts_count: row.posts_count || 0,
      reels_count: row.reels_count || 0,
      subscriber_count: row.subscriber_count || 0,
      condition_text: row.condition_text || "",
      notes: row.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editRow?.id) {
        await api.update("daily-reports", editRow.id, form);
        onToast("Hisobot yangilandi Р Р†РЎС™РІР‚В¦", "success");
      } else {
        await api.create("daily-reports", form);
        onToast("Saqlandi Р Р†РЎС™РІР‚В¦", "success");
      }
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham oР Р†Р вЂљР’Вchirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("daily-reports", id);
      await reload();
      onToast("Hisobot oР Р†Р вЂљР’Вchirildi", "success");
    } catch (err) {
      onToast(err.message || "OР Р†Р вЂљР’Вchirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title={editRow ? "Kunlik hisobotni tahrirlash" : "Kunlik filial hisobotlari"}
          right={
            <div className="toolbar-actions">
              {editRow ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}
              <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/daily-reports.xlsx", "daily-reports.xlsx")}>
                Excel export
              </button>
              <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/daily-reports.pdf", "daily-reports.pdf")}>
                PDF export
              </button>
            </div>
          }
        />

        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Sana</span><input type="date" value={form.report_date} onChange={(e) => setField("report_date", e.target.value)} required /></label>

          <label>
            <span>Filial</span>
            <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)} required>
              <option value="">Tanlang</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>

          <label><span>Stories</span><input type="number" min="0" value={form.stories_count} onChange={(e) => setField("stories_count", Number(e.target.value))} /></label>
          <label><span>Post</span><input type="number" min="0" value={form.posts_count} onChange={(e) => setField("posts_count", Number(e.target.value))} /></label>
          <label><span>Reels</span><input type="number" min="0" value={form.reels_count} onChange={(e) => setField("reels_count", Number(e.target.value))} /></label>
          <label><span>Obunachi soni</span><input type="number" min="0" value={form.subscriber_count} onChange={(e) => setField("subscriber_count", Number(e.target.value))} /></label>
          <label><span>AXVAT</span><input value={form.condition_text} onChange={(e) => setField("condition_text", e.target.value)} /></label>
          <label className="full-col"><span>Izoh</span><input value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></label>

          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Hisobotni saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle
          title="Kiritilgan hisobotlar"
          right={<input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />}
        />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sana</th>
                <th>Filial</th>
                <th>Stories</th>
                <th>Post</th>
                <th>Reels</th>
                <th>Obunachi soni</th>
                <th>AXVAT</th>
                <th>Izoh</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredReports.length ? (
                filteredReports.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.report_date)}</td>
                    <td>{row.branch_name}</td>
                    <td>{row.stories_count}</td>
                    <td>{row.posts_count}</td>
                    <td>{row.reels_count}</td>
                    <td>{row.subscriber_count || 0}</td>
                    <td>{row.condition_text || "-"}</td>
                    <td>{row.notes || "-"}</td>
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="9" className="empty-cell">Hozircha maР Р†Р вЂљРІвЂћСћlumot yoР Р†Р вЂљР’Вq</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Hisobot tafsiloti">
        {viewRow ? (
          <>
          <div className="detail-grid">
            <div><strong>Sana:</strong> {formatDate(viewRow.report_date)}</div>
            <div><strong>Filial:</strong> {viewRow.branch_name}</div>
            <div><strong>Stories:</strong> {viewRow.stories_count}</div>
            <div><strong>Post:</strong> {viewRow.posts_count}</div>
            <div><strong>Reels:</strong> {viewRow.reels_count}</div>
            <div><strong>Obunachi soni:</strong> {viewRow.subscriber_count || 0}</div>
            <div><strong>AXVAT:</strong> {viewRow.condition_text || "-"}</div>
            <div><strong>Izoh:</strong> {viewRow.notes || "-"}</div>
          </div>
          <DiscussionPanel entityType="daily_report" entityId={viewRow.id} onToast={onToast} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function CampaignsPage({ campaigns = [], onToast, reload }) {
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const emptyForm = {
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
  };

  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      title: row.title || "",
      platform: row.platform || "",
      start_date: formatDate(row.start_date) === "-" ? "" : formatDate(row.start_date),
      end_date: formatDate(row.end_date) === "-" ? "" : formatDate(row.end_date),
      budget: row.budget || 0,
      spend: row.spend || 0,
      leads: row.leads || 0,
      sales: row.sales || 0,
      ctr: row.ctr || 0,
      revenue_amount: row.revenue_amount || 0,
      status: row.status || "active",
      notes: row.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editRow?.id) {
        await api.update("campaigns", editRow.id, form);
        onToast("Kampaniya yangilandi Р Р†РЎС™РІР‚В¦", "success");
      } else {
        await api.create("campaigns", form);
        onToast("Kampaniya saqlandi Р Р†РЎС™РІР‚В¦", "success");
      }
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham oР Р†Р вЂљР’Вchirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("campaigns", id);
      await reload();
      onToast("Kampaniya oР Р†Р вЂљР’Вchirildi", "success");
    } catch (err) {
      onToast(err.message || "OР Р†Р вЂљР’Вchirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title={editRow ? "Reklama kampaniyasini tahrirlash" : "Reklama kampaniyasi"}
          right={
            <div className="toolbar-actions">
              {editRow ? (
                <button type="button" className="btn secondary" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}
              <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/campaigns.xlsx", "campaigns.xlsx")}>
                Excel export
              </button>
            </div>
          }
        />
        <form className="form-grid" onSubmit={handleSubmit}>
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
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Kampaniya qoР Р†Р вЂљР’Вshish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Kampaniyalar roР Р†Р вЂљР’Вyxati" />
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
                <th>Amallar</th>
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
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="9" className="empty-cell">Hozircha maР Р†Р вЂљРІвЂћСћlumot yoР Р†Р вЂљР’Вq</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Kampaniya tafsiloti">
        {viewRow ? (
          <>
          <div className="detail-grid">
            <div><strong>Nomi:</strong> {viewRow.title}</div>
            <div><strong>Platforma:</strong> {viewRow.platform}</div>
            <div><strong>Start:</strong> {formatDate(viewRow.start_date)}</div>
            <div><strong>End:</strong> {formatDate(viewRow.end_date)}</div>
            <div><strong>Byudjet:</strong> {viewRow.budget}</div>
            <div><strong>Sarf:</strong> {viewRow.spend}</div>
            <div><strong>Lead:</strong> {viewRow.leads}</div>
            <div><strong>Sotuv:</strong> {viewRow.sales}</div>
            <div><strong>CTR:</strong> {viewRow.ctr}</div>
            <div><strong>Status:</strong> {viewRow.status}</div>
          </div>
          <DiscussionPanel entityType="task" entityId={viewRow.id} onToast={onToast} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function MediaPage({ uploads = [], onToast, reload }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [typeFilter, setTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState("all");
  const [folderName, setFolderName] = useState("content-assets");
  const [versionLabel, setVersionLabel] = useState("v1");
  const [tagText, setTagText] = useState("");

  const filteredUploads = uploads.filter((u) => {
    const typeOk = typeFilter ? String(u.mime_type || "").toLowerCase().includes(typeFilter) : true;
    const searchOk = search
      ? String(u.original_name || "").toLowerCase().includes(search.toLowerCase())
      : true;
    const folderOk = folderFilter === "all" ? true : String(u.folder_name || "general") === folderFilter;
    const tagOk = !tagText.trim() ? true : JSON.stringify(u.tags_json || []).toLowerCase().includes(tagText.trim().toLowerCase());
    return typeOk && searchOk && folderOk && tagOk;
  });

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder_name", folderName);
      formData.append("version_label", versionLabel);
      formData.append("tags_json", tagText);
      await api.upload(formData);
      await reload();
      setFile(null);
      onToast("Fayl yuklandi Р Р†РЎС™РІР‚В¦", "success");
    } catch (err) {
      onToast(err.message || "Yuklashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham oР Р†Р вЂљР’Вchirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("uploads", id);
      await reload();
      onToast("Fayl oР Р†Р вЂљР’Вchirildi", "success");
    } catch (err) {
      onToast(err.message || "OР Р†Р вЂљР’Вchirishda xatolik", "error");
    }
  }

  function isImage(mime) {
    return String(mime || "").startsWith("image/");
  }

  async function copyLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      onToast("Link nusxalandi Р Р†РЎС™РІР‚В¦", "success");
    } catch {
      onToast("Linkni nusxalab boР Р†Р вЂљР’Вlmadi", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Media kutubxona"
          right={
            <div className="toolbar-actions">
              <input placeholder="Qidiruv..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="">Barcha turlar</option>
                <option value="image">Rasm</option>
                <option value="video">Video</option>
                <option value="pdf">PDF</option>
                <option value="sheet">Excel</option>
              </select>
              <select value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)}>
                <option value="all">Barcha papkalar</option>
                <option value="content-assets">content-assets</option>
                <option value="travel-execution">travel-execution</option>
                <option value="brand-kit">brand-kit</option>
                <option value="quick-updates">quick-updates</option>
              </select>
            </div>
          }
        />
        <form className="upload-row" onSubmit={handleUpload}>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <select value={folderName} onChange={(e) => setFolderName(e.target.value)}>
            <option value="content-assets">content-assets</option>
            <option value="travel-execution">travel-execution</option>
            <option value="brand-kit">brand-kit</option>
            <option value="quick-updates">quick-updates</option>
          </select>
          <input value={versionLabel} onChange={(e) => setVersionLabel(e.target.value)} placeholder="Versiya" />
          <input value={tagText} onChange={(e) => setTagText(e.target.value)} placeholder="Taglar: logo, brand, mart" />
          <button className="btn primary" type="submit" disabled={!file || saving}>
            <Upload size={16} />
            {saving ? "Yuklanmoqda..." : "Yuklash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Yuklangan fayllar" />
        <div className="media-grid">
          {filteredUploads.length ? filteredUploads.map((row) => (
            <div className="media-card" key={row.id}>
              <div className="media-preview">
                {isImage(row.mime_type) ? (
                  <img src={row.file_url} alt={row.original_name} />
                ) : (
                  <div className="media-fallback">{row.mime_type || "file"}</div>
                )}
              </div>
              <div className="media-info">
                <div className="media-name">{row.original_name}</div>
                <div className="media-meta">{row.mime_type}</div>
                <div className="media-meta">{row.folder_name || "general"} Р Р†Р вЂљРЎС› {row.version_label || "v1"}</div>
                <div className="media-meta">{Array.isArray(row.tags_json) ? row.tags_json.join(", ") : "-"}</div>
                <div className="media-meta">{row.file_size}</div>
              </div>
              <div className="media-actions">
                <IconActions
                  onView={() => setViewRow(row)}
                  onEdit={null}
                  onDelete={() => removeRow(row.id)}
                />
                <div className="table-actions">
                  <a className="btn tiny secondary" href={row.file_url} target="_blank" rel="noreferrer">
                    Ochish
                  </a>
                  <button type="button" className="btn tiny secondary" onClick={() => copyLink(row.file_url)}>
                    Copy link
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="empty-block">Hozircha media yoР Р†Р вЂљР’Вq</div>
          )}
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Media tafsiloti" wide>
        {viewRow ? (
          <div className="media-modal">
            {isImage(viewRow.mime_type) ? (
              <img src={viewRow.file_url} alt={viewRow.original_name} className="media-modal-image" />
            ) : (
              <a href={viewRow.file_url} target="_blank" rel="noreferrer" className="btn secondary">
                Faylni ochish
              </a>
            )}
            <div className="detail-grid">
              <div><strong>Nomi:</strong> {viewRow.original_name}</div>
              <div><strong>Turi:</strong> {viewRow.mime_type}</div>
              <div><strong>Papka:</strong> {viewRow.folder_name || "general"}</div>
              <div><strong>Versiya:</strong> {viewRow.version_label || "v1"}</div>
              <div className="full-col"><strong>Taglar:</strong> {Array.isArray(viewRow.tags_json) ? viewRow.tags_json.join(", ") : "-"}</div>
              <div><strong>Hajmi:</strong> {viewRow.file_size}</div>
              <div className="full-col"><strong>Link:</strong> {viewRow.file_url}</div>
            </div>
          </div>
        ) : null}
      </Modal>
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
  const [viewRow, setViewRow] = useState(null);

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
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        onToast("Hodim yangilandi Р Р†РЎС™РІР‚В¦", "success");
      } else {
        await api.create("users", form);
        onToast("Yangi hodim yaratildi Р Р†РЎС™РІР‚В¦", "success");
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

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham oР Р†Р вЂљР’Вchirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("users", id);
      await reload();
      onToast("Hodim oР Р†Р вЂљР’Вchirildi", "success");
    } catch (err) {
      onToast(err.message || "OР Р†Р вЂљР’Вchirishda xatolik", "error");
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
          <label><span>Ism</span><input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} required /></label>
          <label><span>Telefon</span><input value={form.phone} onChange={(e) => setField("phone", e.target.value)} required /></label>
          <label>
            <span>Login</span>
            <input value={form.login} onChange={(e) => setField("login", e.target.value)} />
            <small className="field-note">Chatda yozish uchun `@{form.login || "username"}` ishlatiladi.</small>
          </label>

          {!editingId ? (
            <label><span>Parol</span><input type="password" value={form.password} onChange={(e) => setField("password", e.target.value)} required /></label>
          ) : (
            <label><span>Profil rasmi linki</span><input value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} placeholder="https://..." /></label>
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

          <label><span>Lavozimi</span><input value={form.department_role} onChange={(e) => setField("department_role", e.target.value)} placeholder="Masalan: Mobilograf" /></label>

          {!editingId ? (
            <label><span>Profil rasmi linki</span><input value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} placeholder="https://..." /></label>
          ) : (
            <div className="avatar-preview-box">
              {form.avatar_url ? (
                <img
                  src={form.avatar_url}
                  alt="avatar"
                  className="avatar-preview"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="avatar-empty">Avatar</div>
              )}
            </div>
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
            {saving ? "Saqlanmoqda..." : editingId ? "Yangilash" : "Hodim qoР Р†Р вЂљР’Вshish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Hodimlar roР Р†Р вЂљР’Вyxati" />
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Ism</th>
                <th>Telefon</th>
                <th>Login</th>
                <th>Rol</th>
                <th>Lavozim</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {users.length ? (
                users.map((row) => (
                  <tr key={row.id}>
                    <td>
                      {row.avatar_url ? (
                        <img src={row.avatar_url} alt={row.full_name} className="table-avatar" />
                      ) : (
                        <div className="table-avatar empty">?</div>
                      )}
                    </td>
                    <td>{row.full_name}</td>
                    <td>{row.phone}</td>
                    <td>{row.login || "-"}</td>
                    <td>{row.role}</td>
                    <td>{row.department_role || "-"}</td>
                    <td>{row.is_active ? "Faol" : "Bloklangan"}</td>
                    <td>
                      <div className="table-actions">
                        <IconActions
                          onView={() => setViewRow(row)}
                          onEdit={() => startEdit(row)}
                          onDelete={() => removeRow(row.id)}
                        />
                        <button type="button" className="btn tiny" onClick={() => resetPassword(row.id)}>Parol reset</button>
                        <button type="button" className="btn tiny secondary" onClick={() => toggleActive(row.id)}>
                          {row.is_active ? "Bloklash" : "Faollashtirish"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="empty-cell">Hozircha maР Р†Р вЂљРІвЂћСћlumot yoР Р†Р вЂљР’Вq</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Hodim tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>Ism:</strong> {viewRow.full_name}</div>
            <div><strong>Telefon:</strong> {viewRow.phone}</div>
            <div><strong>Login:</strong> {viewRow.login || "-"}</div>
            <div><strong>Rol:</strong> {viewRow.role}</div>
            <div><strong>Lavozim:</strong> {viewRow.department_role || "-"}</div>
            <div><strong>Holat:</strong> {viewRow.is_active ? "Faol" : "Bloklangan"}</div>
            <div className="full-col"><strong>Ruxsatlar:</strong> {safePermissions(viewRow.permissions_json).join(", ") || "-"}</div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function TasksPage({ tasks = [], users = [], user, onToast, reload }) {
  const [saving, setSaving] = useState(false);
  const [filterDate, setFilterDate] = useState("");
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [selectedMonth, setSelectedMonth] = useState(getMonthLabel());
  const [voiceDraft, setVoiceDraft] = useState("");
  const [recording, setRecording] = useState(false);
  const recognitionRef = useRef(null);
  const isPrivileged = user?.role === "admin" || user?.role === "manager";

  const emptyForm = {
    title: "",
    description: "",
    status: "todo",
    priority: "medium",
    due_date: "",
    assignee_user_id: isPrivileged ? "" : user?.id || ""
  };

  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredTasks = filterDate
    ? tasks.filter((row) => formatDate(row.due_date) === filterDate)
    : tasks;
  const dueSoonTasks = (tasks || []).filter((row) => {
    const due = formatDate(row.due_date);
    if (due === "-" || row.status === "done") return false;
    const today = formatDate(new Date());
    const max = formatDate(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000));
    return due >= today && due <= max;
  });
  const overdueTasks = (tasks || []).filter((row) => {
    const due = formatDate(row.due_date);
    return due !== "-" && row.status !== "done" && due < formatDate(new Date());
  });

  function resetForm() {
    setForm({
      ...emptyForm,
      assignee_user_id: isPrivileged ? "" : user?.id || ""
    });
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      title: row.title || "",
      description: row.description || "",
      status: row.status || "todo",
      priority: row.priority || "medium",
      due_date: formatDate(row.due_date) === "-" ? "" : formatDate(row.due_date),
      assignee_user_id: isPrivileged ? row.assignee_user_id || "" : user?.id || row.assignee_user_id || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    if (!isPrivileged) {
      setForm((prev) => ({ ...prev, assignee_user_id: user?.id || "" }));
    }
  }, [isPrivileged, user]);

  function handleVoiceTask() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      onToast("Brauzer voice recognition qo'llab-quvvatlamaydi", "error");
      return;
    }
    if (recognitionRef.current && recording) {
      recognitionRef.current.stop();
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "uz-UZ";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognitionRef.current = recognition;
    recognition.onstart = () => setRecording(true);
    recognition.onend = () => setRecording(false);
    recognition.onerror = () => {
      setRecording(false);
      onToast("Ovozdan task olishda xatolik", "error");
    };
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results).map((item) => item[0]?.transcript || "").join(" ").trim();
      setVoiceDraft(transcript);
      setForm((prev) => ({
        ...prev,
        title: prev.title || transcript.slice(0, 70),
        description: transcript
      }));
    };
    recognition.start();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        ...form,
        assignee_user_id: isPrivileged ? form.assignee_user_id || null : user?.id || null
      };
      if (editRow?.id) {
        await api.update("tasks", editRow.id, payload);
        onToast("Vazifa yangilandi Р Р†РЎС™РІР‚В¦", "success");
      } else {
        await api.create("tasks", payload);
        onToast("Vazifa saqlandi Р Р†РЎС™РІР‚В¦", "success");
      }
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham oР Р†Р вЂљР’Вchirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("tasks", id);
      await reload();
      onToast("Vazifa oР Р†Р вЂљР’Вchirildi", "success");
    } catch (err) {
      onToast(err.message || "OР Р†Р вЂљР’Вchirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title={editRow ? "Vazifani tahrirlash" : "Vazifa yaratish"}
          right={
            <div className="toolbar-actions">
              <button type="button" className="btn secondary" onClick={() => setViewMode(viewMode === "table" ? "calendar" : viewMode === "calendar" ? "kanban" : "table")}>
                {viewMode === "table" ? "Calendar view" : viewMode === "calendar" ? "Kanban view" : "Table view"}
              </button>
              {editRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null}
            </div>
          }
        />
        <SavedViews
          storageKey="aloo_task_views"
          currentValue={{ filterDate, viewMode, selectedMonth }}
          onApply={(value) => {
            setFilterDate(value?.filterDate || "");
            setViewMode(value?.viewMode || "table");
            setSelectedMonth(value?.selectedMonth || getMonthLabel());
          }}
        />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Vazifa</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label>
            <span>Status</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="todo">Rejada</option>
              <option value="doing">Bajarilmoqda</option>
              <option value="done">Bajarilgan</option>
              <option value="cancelled">Bekor qilingan</option>
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
            <span>MasР Р†Р вЂљРІвЂћСћul</span>
            <select value={form.assignee_user_id} onChange={(e) => setField("assignee_user_id", e.target.value)}>
              <option value="">Tanlang</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </label>
          <label className="full-col"><span>Izoh</span><input value={form.description} onChange={(e) => setField("description", e.target.value)} /></label>
          <div className="full-col voice-task-card">
            <div className="voice-task-head">
              <strong>Voice to task</strong>
              <button type="button" className={`btn ${recording ? "danger" : "secondary"}`} onClick={handleVoiceTask}>
                <Mic size={16} />
                {recording ? "To'xtatish" : "Mikrofon"}
              </button>
            </div>
            <textarea rows={3} value={voiceDraft} onChange={(e) => setVoiceDraft(e.target.value)} placeholder="Ovozdan olingan task matni shu yerga tushadi" />
            <div className="voice-task-hint">Mikrofon orqali gapiring, matn task nomi va izohiga tushadi.</div>
          </div>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Vazifa qoР Р†Р вЂљР’Вshish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Vazifalar roР Р†Р вЂљР’Вyxati" right={<input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />} />
        {viewMode === "table" ? <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vazifa</th>
                <th>Status</th>
                <th>Muhimlik</th>
                <th>Muddat</th>
                <th>MasР Р†Р вЂљРІвЂћСћul</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.length ? (
                filteredTasks.map((row) => (
                  <tr key={row.id} className={taskRowClass(row.status)}>
                    <td>{row.title}</td>
                    <td><span className={taskStatusClass(row.status)}>{taskStatusLabel(row.status)}</span></td>
                    <td><span className={priorityClass(row.priority)}>{row.priority}</span></td>
                    <td>{formatDate(row.due_date)}</td>
                    <td>{row.assignee_name || "-"}</td>
                    <td>
                      <IconActions
                        onView={() => setViewRow(row)}
                        onEdit={() => startEdit(row)}
                        onDelete={() => removeRow(row.id)}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="6" className="empty-cell">Hozircha maР Р†Р вЂљРІвЂћСћlumot yoР Р†Р вЂљР’Вq</td></tr>
              )}
            </tbody>
          </table>
        </div> : viewMode === "calendar" ? (
          <MiniCalendar
            monthLabel={selectedMonth}
            rows={filteredTasks}
            dateKey="due_date"
            onMoveDate={async (id, nextDate) => {
              const row = tasks.find((item) => item.id === id);
              if (!row) return;
              try {
                await api.update("tasks", id, {
                  title: row.title,
                  description: row.description || "",
                  status: row.status,
                  priority: row.priority || "medium",
                  due_date: nextDate,
                  assignee_user_id: row.assignee_user_id || null
                });
                await reload();
                onToast("Vazifa sanasi ko'chirildi", "success");
              } catch (err) {
                onToast(err.message || "Vazifa sanasini ko'chirib bo'lmadi", "error");
              }
            }}
            renderItem={(item) => (
              <button key={item.id} type="button" className={`calendar-pill task ${item.status === "done" ? "done" : ""}`} onClick={() => setViewRow(item)}>
                {item.title}
              </button>
            )}
          />
        ) : (
          <KanbanBoard
            columns={[
              { id: "todo", label: "Reja", tone: "default" },
              { id: "doing", label: "Jarayonda", tone: "info" },
              { id: "done", label: "Yakunlandi", tone: "success" },
              { id: "cancelled", label: "Bekor", tone: "danger" }
            ]}
            rows={filteredTasks}
            getColumnId={(row) => row.status}
            renderCard={(row) => (
              <>
                <strong>{row.title}</strong>
                <span>{formatDate(row.due_date)}</span>
                <span>{row.assignee_name || "-"}</span>
              </>
            )}
            onMove={async (id, status) => {
              const row = tasks.find((item) => item.id === id);
              if (!row) return;
              try {
                await api.update("tasks", id, {
                  title: row.title,
                  description: row.description || "",
                  status,
                  priority: row.priority || "medium",
                  due_date: formatDate(row.due_date) === "-" ? null : formatDate(row.due_date),
                  assignee_user_id: row.assignee_user_id || null
                });
                await reload();
              } catch (err) {
                onToast(err.message || "Vazifa statusini o'zgartirib bo'lmadi", "error");
              }
            }}
          />
        )}
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Vazifa tafsiloti">
        {viewRow ? (
          <>
          <div className="detail-grid">
            <div><strong>Vazifa:</strong> {viewRow.title}</div>
            <div><strong>Status:</strong> <span className={taskStatusClass(viewRow.status)}>{taskStatusLabel(viewRow.status)}</span></div>
            <div><strong>Muhimlik:</strong> <span className={priorityClass(viewRow.priority)}>{viewRow.priority}</span></div>
            <div><strong>Muddat:</strong> {formatDate(viewRow.due_date)}</div>
            <div><strong>MasР Р†Р вЂљРІвЂћСћul:</strong> {viewRow.assignee_name || "-"}</div>
            <div className="full-col"><strong>Izoh:</strong> {viewRow.description || "-"}</div>
          </div>
          <DiscussionPanel entityType="task" entityId={viewRow.id} onToast={onToast} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function AuditPage({ logs = [] }) {
  const [entityFilter, setEntityFilter] = useState("");
  const [historyRows, setHistoryRows] = useState([]);
  const [historyMeta, setHistoryMeta] = useState(null);
  const filteredLogs = logs.filter((row) => !entityFilter || row.entity_type === entityFilter);
  const entityOptions = [...new Set(logs.map((row) => row.entity_type).filter(Boolean))];

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle
          title="Audit timeline"
          desc="Kim qachon qanday amal bajarganini ketma-ket ko'ring"
          right={
            <select value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">Barcha entitylar</option>
              {entityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          }
        />
        <div className="audit-timeline">
          {filteredLogs.length ? filteredLogs.map((row) => (
            <div key={`timeline-${row.id}`} className="audit-item">
              <div className={`audit-dot audit-dot-${String(row.action_type || "update").toLowerCase()}`} />
              <div className="audit-card">
                <div className="audit-top">
                  <strong>{row.full_name || "Tizim"}</strong>
                  <span>{formatDateTime(row.created_at)}</span>
                </div>
                <div className="audit-meta">
                  <span className="mini-badge default">{row.entity_type}</span>
                  <span className={`mini-badge ${row.action_type === "delete" ? "danger" : row.action_type === "create" ? "success" : "info"}`}>{row.action_type}</span>
                  <span>ID: {row.entity_id || "-"}</span>
                </div>
              </div>
            </div>
          )) : <div className="empty-block">Hozircha audit yozuvi yo'q</div>}
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kim</th>
                <th>Amal</th>
                <th>Entity</th>
                <th>ID</th>
                <th>Sana</th>
                <th>History</th>
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
                    <td>{formatDate(row.created_at)}</td>
                    <td>
                      {row.entity_id ? <button type="button" className="btn tiny secondary" onClick={async () => {
                        try {
                          const data = await api.list(`/api/version-history/${row.entity_type}/${row.entity_id}`);
                          setHistoryMeta({ entityType: row.entity_type, entityId: row.entity_id });
                          setHistoryRows(data || []);
                        } catch {}
                      }}>History</button> : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="5" className="empty-cell">Hozircha maР Р†Р вЂљРІвЂћСћlumot yoР Р†Р вЂљР’Вq</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <Modal open={!!historyMeta} onClose={() => { setHistoryMeta(null); setHistoryRows([]); }} title="Version history" wide>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Kim</th><th>Amal</th><th>Sana</th><th>Meta</th></tr></thead>
            <tbody>
              {historyRows.length ? historyRows.map((row) => (
                <tr key={`history-${row.id}`}>
                  <td>{row.full_name || "-"}</td>
                  <td>{row.action_type}</td>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td>{row.meta ? JSON.stringify(row.meta).slice(0, 180) : "-"}</td>
                </tr>
              )) : <tr><td colSpan="4" className="empty-cell">History yo'q</td></tr>}
            </tbody>
          </table>
        </div>
      </Modal>
    </div>
  );
}

function ChatPage({ user, users = [], threads = [], onToast, reload }) {
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [body, setBody] = useState("");
  const socketRef = useRef(null);
  const quickContacts = users
    .filter((item) => item.id !== user?.id && item.is_active !== false)
    .slice(0, 8);
  const resolvedActiveThread =
    threads.find((item) => item.other_user_id === activeThread?.other_user_id) || activeThread;

  useEffect(() => {
    if (!activeThread && threads.length) {
      setActiveThread(threads[0]);
    }
  }, [threads, activeThread]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token || !user?.id) return undefined;

    const socket = io(SOCKET_BASE, {
      transports: ["websocket", "polling"],
      auth: { token }
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      reload();
    });

    socket.on("presence:update", () => {
      reload();
    });

    socket.on("chat:typing", (payload) => {
      if (Number(payload?.user_id) === Number(resolvedActiveThread?.other_user_id)) {
        reload();
      }
    });

    socket.on("chat:new_message", (payload) => {
      const otherUserId =
        Number(payload?.sender_user_id) === Number(user?.id)
          ? Number(payload?.receiver_user_id)
          : Number(payload?.sender_user_id);

      if (Number(otherUserId) === Number(resolvedActiveThread?.other_user_id)) {
        setMessages((prev) => (
          prev.some((item) => item.id === payload.id) ? prev : [...prev, payload]
        ));
        socket.emit("chat:thread:open", { other_user_id: otherUserId });
      }

      reload();
    });

    socket.on("chat:message_status", (payload) => {
      setMessages((prev) =>
        prev.map((item) => (
          item.id === payload.id
            ? {
                ...item,
                delivered_at: payload.delivered_at || item.delivered_at,
                read_at: payload.read_at || item.read_at
              }
            : item
        ))
      );
      reload();
    });

    socket.on("chat:read", (payload) => {
      const ids = new Set(payload?.message_ids || []);
      setMessages((prev) =>
        prev.map((item) => (
          ids.has(item.id)
            ? { ...item, read_at: payload.read_at || item.read_at }
            : item
        ))
      );
      reload();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?.id, resolvedActiveThread?.other_user_id]);

  useEffect(() => {
    async function loadMessages() {
      if (!resolvedActiveThread?.other_user_id) {
        setMessages([]);
        return;
      }
      try {
        setLoading(true);
        const data = await api.list(`/api/messages/thread/${resolvedActiveThread.other_user_id}`);
        setMessages(data || []);
        socketRef.current?.emit("chat:thread:open", { other_user_id: resolvedActiveThread.other_user_id });
        await reload();
      } catch (err) {
        onToast(err.message || "Xabarlarni olib bo'lmadi", "error");
      } finally {
        setLoading(false);
      }
    }
    loadMessages();
    if (!resolvedActiveThread?.other_user_id) return undefined;
    const timer = setInterval(loadMessages, 10000);
    return () => clearInterval(timer);
  }, [resolvedActiveThread?.other_user_id]);

  useEffect(() => {
    if (!resolvedActiveThread?.other_user_id) return undefined;
    const timer = setTimeout(() => {
      const payload = {
        target_user_id: resolvedActiveThread.other_user_id,
        is_typing: !!body.trim()
      };
      socketRef.current?.emit("chat:typing", payload);
      api.create("messages/typing", payload).catch(() => {});
    }, 180);
    return () => clearTimeout(timer);
  }, [body, resolvedActiveThread?.other_user_id]);

  function resolveMentionTarget(text) {
    const match = String(text || "").trim().match(/^@([a-zA-Z0-9._-]+)/);
    if (!match) return null;
    const queryText = match[1].toLowerCase();
    return (
      users.find((item) => item.login && item.login.toLowerCase() === queryText) ||
      users.find((item) => item.phone && String(item.phone).toLowerCase() === queryText) ||
      users.find((item) =>
        item.full_name &&
        item.full_name.toLowerCase().replace(/\s+/g, "").includes(queryText.replace(/\s+/g, ""))
      ) ||
      null
    );
  }

  async function sendMessage(e) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;

    const mentionTarget = resolveMentionTarget(trimmed);
    const receiverId = resolvedActiveThread?.other_user_id || mentionTarget?.id;
    if (!receiverId) {
      onToast("Xabar uchun @login yozing yoki chat tanlang", "error");
      return;
    }

    try {
      setSending(true);
      const message = await api.create("messages", {
        receiver_user_id: receiverId,
        body: trimmed
      });
      setBody("");
      socketRef.current?.emit("chat:typing", {
        target_user_id: receiverId,
        is_typing: false
      });
      const targetThread =
        resolvedActiveThread?.other_user_id === receiverId
          ? resolvedActiveThread
          : threads.find((item) => item.other_user_id === receiverId) || {
              other_user_id: receiverId,
              other_user_name: mentionTarget?.full_name || "Yangi chat",
              other_user_login: mentionTarget?.login || ""
            };
      setActiveThread(targetThread);
      setMessages((prev) => (
        prev.some((item) => item.id === message.id) ? prev : [...prev, message]
      ));
      await reload();
    } catch (err) {
      onToast(err.message || "Xabar yuborib bo'lmadi", "error");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card chat-page">
        <SectionTitle
          title="Chat"
          desc="@login bilan yangi xabar boshlasangiz ham bo'ladi"
          right={<div className="chat-hint">Socket.IO live chat, typing, online, delivered/read</div>}
        />
        <div className="chat-layout">
          <div className="chat-threads">
            {threads.length ? threads.map((thread) => (
              <button
                key={thread.other_user_id}
                type="button"
                className={`thread-card ${resolvedActiveThread?.other_user_id === thread.other_user_id ? "active" : ""}`}
                onClick={() => setActiveThread(thread)}
              >
                <div className="thread-avatar">
                  {thread.other_user_avatar ? (
                    <img src={thread.other_user_avatar} alt={thread.other_user_name} className="table-avatar" />
                  ) : (
                    <div className="table-avatar empty">{getAvatarFallback(thread.other_user_name)}</div>
                  )}
                  <span className={`presence-dot ${isUserOnline(thread.other_user_last_seen) ? "online" : "offline"}`} />
                </div>
                <div className="thread-copy">
                  <div className="thread-name">{thread.other_user_name}</div>
                  <div className="thread-preview">{thread.last_message || "Xabar yo'q"}</div>
                </div>
                {thread.unread_count ? <span className="count-badge">{thread.unread_count}</span> : null}
              </button>
            )) : (
              <div className="chat-empty-state">
                <div className="empty-block">Hozircha chat yo'q</div>
                <div className="chat-empty-copy">Quyidagilardan biriga yozishni boshlang</div>
                <div className="chat-contact-list">
                  {quickContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      className="chat-contact-chip"
                      onClick={() => {
                        setActiveThread({
                          other_user_id: contact.id,
                          other_user_name: contact.full_name,
                          other_user_login: contact.login || "",
                          other_user_last_seen: contact.last_seen_at
                        });
                        setBody((prev) => prev || `@${contact.login || contact.phone || ""} `);
                      }}
                    >
                      <span className="chat-contact-avatar">
                        {contact.avatar_url ? (
                          <img src={contact.avatar_url} alt={contact.full_name} className="table-avatar" />
                        ) : (
                          <span className="table-avatar empty">{getAvatarFallback(contact.full_name)}</span>
                        )}
                      </span>
                      <span>{contact.full_name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="chat-window">
            <div className="chat-header">
              <strong>{resolvedActiveThread?.other_user_name || "Chat tanlang"}</strong>
              <div className="chat-header-meta">
                {resolvedActiveThread?.other_user_login ? <span>@{resolvedActiveThread.other_user_login}</span> : null}
                {resolvedActiveThread?.other_user_last_seen ? <span className={`presence-pill ${isUserOnline(resolvedActiveThread.other_user_last_seen) ? "online" : "offline"}`}>{isUserOnline(resolvedActiveThread.other_user_last_seen) ? "online" : "offline"}</span> : null}
                {resolvedActiveThread?.other_user_typing ? <span className="typing-indicator">yozmoqda...</span> : null}
                {!resolvedActiveThread?.other_user_typing && resolvedActiveThread?.other_user_last_seen ? <span>oxirgi faollik: {formatDateTime(resolvedActiveThread.other_user_last_seen)}</span> : null}
              </div>
            </div>
            <div className="chat-messages">
              {loading ? <div className="empty-block">Yuklanmoqda...</div> : messages.length ? messages.map((message) => (
                <div
                  key={message.id}
                  className={`chat-bubble ${message.sender_user_id === user?.id ? "mine" : ""}`}
                >
                  <div>{message.body}</div>
                  <span>{formatDateTime(message.created_at)} {message.sender_user_id === user?.id ? `Р Р†Р вЂљРЎС› ${message.read_at ? "oР Р†Р вЂљР’Вqildi" : message.delivered_at ? "yetkazildi" : "yuborildi"}` : ""}</span>
                </div>
              )) : <div className="empty-block">Xabarlar yo'q</div>}
            </div>
            <form className="chat-form" onSubmit={sendMessage}>
              <input
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Xabar yozing yoki @login bilan boshlang"
              />
              <button type="submit" className="btn primary" disabled={sending}>
                <Send size={16} />
                {sending ? "Yuborilmoqda..." : "Yuborish"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfilePage({ user = {}, onToast, refreshUser }) {
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

      const me = await api.me();
      refreshUser(me.user);
      onToast("Profil saqlandi Р Р†РЎС™РІР‚В¦", "success");
      setForm((prev) => ({
        ...prev,
        old_password: "",
        new_password: ""
      }));
    } catch (err) {
      onToast(err.message || "Profilni saqlab boР Р†Р вЂљР’Вlmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Mening profilim" />
        <form className="form-grid" onSubmit={saveProfile}>
          <label><span>Ism</span><input value={form.full_name} onChange={(e) => setField("full_name", e.target.value)} /></label>
          <label><span>Telefon</span><input value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></label>
          <label><span>Login</span><input value={form.login} onChange={(e) => setField("login", e.target.value)} /></label>
          <label><span>Lavozimi</span><input value={form.department_role} onChange={(e) => setField("department_role", e.target.value)} /></label>
          <label className="full-col"><span>Profil rasmi linki</span><input value={form.avatar_url} onChange={(e) => setField("avatar_url", e.target.value)} /></label>
          <div className="full-col profile-avatar-line">
            {form.avatar_url ? <img src={form.avatar_url} alt="avatar" className="profile-avatar" /> : <div className="avatar-empty">Avatar</div>}
          </div>
          <label><span>Eski parol</span><input type="password" value={form.old_password} onChange={(e) => setField("old_password", e.target.value)} /></label>
          <label><span>Yangi parol</span><input type="password" value={form.new_password} onChange={(e) => setField("new_password", e.target.value)} /></label>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : "Profilni saqlash"}
          </button>
        </form>
      </div>
    </div>
  );
}

function SettingsPage({ settings, onSave, saving, theme, setTheme, onToast, reload }) {
  const [form, setForm] = useState(settings || {});
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [backupPreview, setBackupPreview] = useState(null);
  const [pendingPayload, setPendingPayload] = useState(null);
  const shareUrl = settings?.public_share_token ? `${API_BASE}/api/share/report/${settings.public_share_token}` : "";

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
          <label><span>BoР Р†Р вЂљР’Вlim</span><input value={form.department_name || ""} onChange={(e) => setField("department_name", e.target.value)} /></label>
          <label><span>Bonus stavkasi</span><input type="number" min="0" value={form.bonus_rate || 25000} onChange={(e) => setField("bonus_rate", e.target.value)} /></label>
          <label><span>Telegram bot token</span><input value={form.telegram_bot_token || ""} onChange={(e) => setField("telegram_bot_token", e.target.value)} /></label>
          <label><span>Telegram chat ID</span><input value={form.telegram_chat_id || ""} onChange={(e) => setField("telegram_chat_id", e.target.value)} /></label>
          <label><span>Websayt</span><input value={form.website_url || ""} onChange={(e) => setField("website_url", e.target.value)} /></label>
          <label><span>Telegram</span><input value={form.telegram_url || ""} onChange={(e) => setField("telegram_url", e.target.value)} /></label>
          <label><span>Instagram</span><input value={form.instagram_url || ""} onChange={(e) => setField("instagram_url", e.target.value)} /></label>
          <label><span>YouTube</span><input value={form.youtube_url || ""} onChange={(e) => setField("youtube_url", e.target.value)} /></label>
          <label><span>Facebook</span><input value={form.facebook_url || ""} onChange={(e) => setField("facebook_url", e.target.value)} /></label>
          <label><span>TikTok</span><input value={form.tiktok_url || ""} onChange={(e) => setField("tiktok_url", e.target.value)} /></label>
        </div>
        <div className="settings-logo-preview">
          <label className="full-col">
            <span>Logo rasmi linki</span>
            <input value={form.logo_url || ""} onChange={(e) => setField("logo_url", e.target.value)} placeholder="https://... yoki upload link" />
          </label>
          <div className="settings-logo-card">
            <img src={form.logo_url || LOGIN_LOGO} alt="Logo preview" className="settings-logo-image" />
            <div>
              <strong>{form.company_name || "aloo"}</strong>
              <span>{form.platform_name || "SMM jamoasi platformasi"} Р Р†Р вЂљРЎС› {formatMoney(form.bonus_rate || 25000)}</span>
            </div>
          </div>
        </div>
        <button className="btn primary mt16" onClick={() => onSave(form)} disabled={saving}>
          {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>
        <div className="toolbar-actions mt16">
          <button className="btn secondary" onClick={async () => {
            try {
              const backup = await api.list("/api/backup/export");
              const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "aloo-backup.json";
              document.body.appendChild(a);
              a.click();
              a.remove();
              window.URL.revokeObjectURL(url);
            } catch {}
          }}>Backup export</button>
          <button className="btn secondary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? "Restore..." : "Backup restore"}
          </button>
          <button className="btn secondary" onClick={async () => {
            try {
              const data = await api.create("settings/test-telegram", {});
              alert(data?.message || "Telegram test yuborildi");
            } catch (err) {
              alert(err.message || "Telegram test yuborilmadi");
            }
          }}>Telegram test</button>
          <button className="btn secondary" onClick={async () => {
            try {
              await api.create("settings/share-token", {});
              await reload();
              onToast("Share token yaratildi", "success");
            } catch (err) {
              onToast(err.message || "Share token yaratilmadi", "error");
            }
          }}>Public share</button>
          <button className="btn secondary" onClick={async () => {
            try {
              await api.create("monthly-close", { month_label: getMonthLabel() });
              await reload();
              onToast("Monthly close bajarildi", "success");
            } catch (err) {
              onToast(err.message || "Monthly close bajarilmadi", "error");
            }
          }}>Monthly close</button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                setImporting(true);
                const text = await file.text();
                const payload = JSON.parse(text);
                const preview = await api.create("backup/preview", { payload });
                setPendingPayload(payload);
                setBackupPreview(preview);
              } catch (err) {
                alert(err.message || "Backup restore bo'lmadi");
              } finally {
                setImporting(false);
                e.target.value = "";
              }
            }}
          />
        </div>
        {backupPreview ? (
          <div className="backup-preview-card">
            <h4>Restore preview</h4>
            <div className="quick-list">
              <div className="quick-item">Jadvallar: <strong>{backupPreview.total_tables}</strong></div>
              <div className="quick-item">Yangilanadigan yozuvlar: <strong>{backupPreview.total_replace}</strong></div>
              <div className="quick-item">Kiritiladigan yozuvlar: <strong>{backupPreview.total_insert}</strong></div>
            </div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Jadval</th><th>Hozirgi</th><th>Keladigan</th><th>O'chadi</th></tr></thead>
                <tbody>
                  {(backupPreview.tables || []).map((row) => (
                    <tr key={row.table}>
                      <td>{row.table}</td>
                      <td>{row.current_count}</td>
                      <td>{row.incoming_count}</td>
                      <td>{row.rows_to_replace}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="toolbar-actions">
              <button className="btn secondary" type="button" onClick={() => { setBackupPreview(null); setPendingPayload(null); }}>Bekor qilish</button>
              <button className="btn primary" type="button" onClick={async () => {
                try {
                  setImporting(true);
                  await api.create("backup/import", { payload: pendingPayload });
                  alert("Backup restore muvaffaqiyatli tugadi");
                  window.location.reload();
                } catch (err) {
                  alert(err.message || "Backup restore bo'lmadi");
                } finally {
                  setImporting(false);
                }
              }}>
                Confirm restore
              </button>
            </div>
          </div>
        ) : null}
        {shareUrl ? (
          <div className="backup-preview-card">
            <h4>Public share report</h4>
            <div className="quick-item">Link: <strong>{shareUrl}</strong></div>
            <div className="toolbar-actions">
              <button className="btn secondary" type="button" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  onToast("Share link nusxalandi", "success");
                } catch {}
              }}>Copy link</button>
              <a className="btn primary" href={shareUrl} target="_blank" rel="noreferrer">Ochish</a>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ExpensesPage({ expenses = [], onToast, reload }) {
  const emptyForm = {
    expense_date: "",
    title: "",
    vendor_name: "",
    card_holder: "",
    amount: "",
    currency: "UZS",
    category: "servis",
    payment_type: "visa",
    notes: ""
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
      title: row.title || "",
      vendor_name: row.vendor_name || "",
      card_holder: row.card_holder || "",
      amount: row.amount || "",
      currency: row.currency || "UZS",
      category: row.category || "servis",
      payment_type: row.payment_type || "visa",
      notes: row.notes || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, amount: Number(form.amount || 0) };
      if (editRow?.id) {
        await api.update("expenses", editRow.id, payload);
        onToast("Harajat yangilandi", "success");
      } else {
        await api.create("expenses", payload);
        onToast("Harajat saqlandi", "success");
      }
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Harajatni saqlab boР Р†Р вЂљР’Вlmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    if (!window.confirm("Rostdan ham oР Р†Р вЂљР’Вchirilsinmi?")) return;
    try {
      await api.remove("expenses", id);
      await reload();
      onToast("Harajat oР Р†Р вЂљР’Вchirildi", "success");
    } catch (err) {
      onToast(err.message || "Harajatni oР Р†Р вЂљР’Вchirib boР Р†Р вЂљР’Вlmadi", "error");
    }
  }

  const monthOptions = [...new Set([getMonthLabel(), ...expenses.map((item) => formatDate(item.expense_date).slice(0, 7)).filter((item) => item && item !== "-")])];
  const filteredExpenses = expenses.filter((item) => !monthFilter || formatDate(item.expense_date).startsWith(monthFilter));
  const totalAmount = filteredExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const categoryTotals = [
    { key: "servis", label: "Servis" },
    { key: "reklama", label: "Reklama" },
    { key: "safar", label: "Safar" },
    { key: "boshqa", label: "Boshqa" }
  ].map((item) => ({
    ...item,
    amount: filteredExpenses
      .filter((row) => (row.category || "boshqa") === item.key)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
  }));
  const maxCategoryAmount = Math.max(...categoryTotals.map((item) => item.amount), 1);

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title={editRow ? "Harajatni tahrirlash" : "Harajat qoР Р†Р вЂљР’Вshish"} right={editRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Sana</span><input type="date" value={form.expense_date} onChange={(e) => setField("expense_date", e.target.value)} required /></label>
          <label><span>Nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label><span>Xizmat yoki ilova</span><input value={form.vendor_name} onChange={(e) => setField("vendor_name", e.target.value)} placeholder="Canva, Meta, CapCut..." /></label>
          <label><span>Karta egasi</span><input value={form.card_holder} onChange={(e) => setField("card_holder", e.target.value)} placeholder="Visa karta egasi" /></label>
          <label><span>Summa</span><input type="number" min="0" value={form.amount} onChange={(e) => setField("amount", e.target.value)} required /></label>
          <label><span>Valyuta</span><select value={form.currency} onChange={(e) => setField("currency", e.target.value)}><option value="UZS">UZS</option><option value="USD">USD</option></select></label>
          <label><span>Kategoriya</span><select value={form.category} onChange={(e) => setField("category", e.target.value)}><option value="servis">Servis</option><option value="reklama">Reklama</option><option value="safar">Safar</option><option value="boshqa">Boshqa</option></select></label>
          <label><span>ToР Р†Р вЂљР’Вlov turi</span><select value={form.payment_type} onChange={(e) => setField("payment_type", e.target.value)}><option value="visa">Visa karta</option><option value="cash">Naqd</option><option value="bank">Bank</option></select></label>
          <label className="full-col"><span>Izoh</span><input value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></label>
          <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Saqlash"}</button>
        </form>
      </div>

      <div className="stats-grid">
        <StatCard title="Jami harajat" value={formatMoney(totalAmount)} hint={getMonthTitle(monthFilter)} tone="danger" />
        <StatCard title="Yozuvlar soni" value={filteredExpenses.length} hint="filtrlangan yozuvlar" tone="info" />
      </div>

      <div className="card">
        <SectionTitle
          title="Oy boР Р†Р вЂљР’Вyicha harajatlar"
          desc="Kategoriya kesimida tezkor koР Р†Р вЂљР’Вrinish"
          right={
            <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
              {monthOptions.map((item) => <option key={item} value={item}>{getMonthTitle(item)}</option>)}
            </select>
          }
        />
        <div className="expense-chart">
          {categoryTotals.map((item) => (
            <div key={item.key} className="expense-bar-card">
              <div className="expense-bar-head">
                <strong>{item.label}</strong>
                <span>{formatMoney(item.amount)}</span>
              </div>
              <div className="expense-bar-track">
                <span className={`expense-bar-fill ${item.key}`} style={{ width: `${Math.max((item.amount / maxCategoryAmount) * 100, item.amount ? 12 : 0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <SectionTitle title="Harajatlar roР Р†Р вЂљР’Вyxati" desc={getMonthTitle(monthFilter)} />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sana</th><th>Nomi</th><th>Xizmat</th><th>Holat</th><th>Summa</th><th>Amallar</th></tr></thead>
            <tbody>
              {filteredExpenses.length ? filteredExpenses.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.expense_date)}</td>
                  <td>{row.title}</td>
                  <td>{row.vendor_name || "-"}</td>
                  <td>
                    <div className="table-badge-stack">
                      <span className={expenseCategoryClass(row.category)}>{row.category || "boshqa"}</span>
                      <span className={paymentTypeClass(row.payment_type)}>{row.payment_type || "-"}</span>
                    </div>
                  </td>
                  <td>{Number(row.amount || 0).toLocaleString()} {row.currency || "UZS"}</td>
                  <td><IconActions onView={() => setViewRow(row)} onEdit={() => startEdit(row)} onDelete={() => removeRow(row.id)} /></td>
                </tr>
              )) : <tr><td colSpan="6" className="empty-cell">Bu oy uchun harajat yoР Р†Р вЂљР’Вq</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Harajat tafsiloti">
        {viewRow ? <div className="detail-grid">
          <div><strong>Sana:</strong> {formatDate(viewRow.expense_date)}</div>
          <div><strong>Nomi:</strong> {viewRow.title}</div>
          <div><strong>Xizmat:</strong> {viewRow.vendor_name || "-"}</div>
          <div><strong>Karta egasi:</strong> {viewRow.card_holder || "-"}</div>
          <div><strong>Summa:</strong> {Number(viewRow.amount || 0).toLocaleString()} {viewRow.currency || "UZS"}</div>
          <div><strong>Kategoriya:</strong> {viewRow.category || "-"}</div>
          <div><strong>ToР Р†Р вЂљР’Вlov turi:</strong> {viewRow.payment_type || "-"}</div>
          <div className="full-col"><strong>Izoh:</strong> {viewRow.notes || "-"}</div>
        </div> : null}
      </Modal>
    </div>
  );
}

function TravelPlansPage({ travelPlans = [], branches = [], onToast, reload }) {
  const emptyForm = {
    plan_date: "",
    branch_id: "",
    video_title: "",
    participants_text: "",
    videodek_url: "",
    scenario_text: "",
    checklist_json: ["kamera", "mikrofon", "chiroq", "transport", "mehmonxona"],
    budget_amount: 0,
    transport_text: "",
    hotel_text: "",
    deadline_date: "",
    status: "reja",
    notes: "",
    approval_comment: ""
  };
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [branchFilter, setBranchFilter] = useState("");
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      plan_date: formatDate(row.plan_date) === "-" ? "" : formatDate(row.plan_date),
      branch_id: row.branch_id || "",
      video_title: row.video_title || "",
      participants_text: row.participants_text || "",
      videodek_url: row.videodek_url || "",
      scenario_text: row.scenario_text || "",
      checklist_json: Array.isArray(row.checklist_json) ? row.checklist_json : ["kamera", "mikrofon", "chiroq", "transport", "mehmonxona"],
      budget_amount: row.budget_amount || 0,
      transport_text: row.transport_text || "",
      hotel_text: row.hotel_text || "",
      deadline_date: formatDate(row.deadline_date) === "-" ? "" : formatDate(row.deadline_date),
      status: row.status || "reja",
      notes: row.notes || "",
      approval_comment: row.approval_comment || ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      if (editRow?.id) {
        await api.update("travel-plans", editRow.id, form);
        onToast("Safar rejasi yangilandi", "success");
      } else {
        await api.create("travel-plans", form);
        onToast("Safar rejasi saqlandi", "success");
      }
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Safar rejasini saqlab boР Р†Р вЂљР’Вlmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    if (!window.confirm("Rostdan ham oР Р†Р вЂљР’Вchirilsinmi?")) return;
    try {
      await api.remove("travel-plans", id);
      await reload();
      onToast("Safar rejasi oР Р†Р вЂљР’Вchirildi", "success");
    } catch (err) {
      onToast(err.message || "Safar rejasini oР Р†Р вЂљР’Вchirib boР Р†Р вЂљР’Вlmadi", "error");
    }
  }

  const timelineRows = [...travelPlans]
    .filter((row) => !branchFilter || String(row.branch_id) === String(branchFilter))
    .filter((row) => formatDate(row.plan_date) !== "-")
    .sort((a, b) => new Date(a.plan_date).getTime() - new Date(b.plan_date).getTime())
    .slice(0, 8);
  const filteredTravelPlans = travelPlans.filter((row) => !branchFilter || String(row.branch_id) === String(branchFilter));
  const travelWorkflowCounts = {
    reja: filteredTravelPlans.filter((item) => item.status === "reja").length,
    tasdiqlandi: filteredTravelPlans.filter((item) => item.status === "tasdiqlandi").length,
    jarayonda: filteredTravelPlans.filter((item) => ["jarayonda", "tasvirga_olindi"].includes(item.status)).length,
    qayta_ishlash: filteredTravelPlans.filter((item) => item.status === "qayta_ishlash").length,
    rad_etildi: filteredTravelPlans.filter((item) => item.status === "rad_etildi").length,
    yakunlandi: filteredTravelPlans.filter((item) => item.status === "yakunlandi").length
  };

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title={editRow ? "Safar rejasini tahrirlash" : "Safar rejasi qoР Р†Р вЂљР’Вshish"} right={editRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Sana</span><input type="date" value={form.plan_date} onChange={(e) => setField("plan_date", e.target.value)} required /></label>
          <label><span>Filial</span><select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)} required><option value="">Tanlang</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>Qaysi video olinadi</span><input value={form.video_title} onChange={(e) => setField("video_title", e.target.value)} required /></label>
          <label><span>Kimlar ishtirok etadi</span><input value={form.participants_text} onChange={(e) => setField("participants_text", e.target.value)} placeholder="Ismlar vergul bilan" /></label>
          <label><span>Videodek URL</span><input value={form.videodek_url} onChange={(e) => setField("videodek_url", e.target.value)} placeholder="https://..." /></label>
          <label><span>Status</span><select value={form.status} onChange={(e) => setField("status", e.target.value)}><option value="reja">Reja</option><option value="tasdiqlandi">Tasdiqlandi</option><option value="jarayonda">Jarayonda</option><option value="qayta_ishlash">Qayta ishlash</option><option value="rad_etildi">Rad etildi</option><option value="yakunlandi">Yakunlandi</option></select></label>
          <label className="full-col"><span>Ssenariy</span><input value={form.scenario_text} onChange={(e) => setField("scenario_text", e.target.value)} placeholder="Qisqa ssenariy yoki outline" /></label>
          <label><span>Budget</span><input type="number" min="0" value={form.budget_amount} onChange={(e) => setField("budget_amount", Number(e.target.value))} /></label>
          <label><span>Transport</span><input value={form.transport_text} onChange={(e) => setField("transport_text", e.target.value)} /></label>
          <label><span>Mehmonxona</span><input value={form.hotel_text} onChange={(e) => setField("hotel_text", e.target.value)} /></label>
          <label><span>Deadline</span><input type="date" value={form.deadline_date} onChange={(e) => setField("deadline_date", e.target.value)} /></label>
          <label className="full-col"><span>Checklist</span><input value={(form.checklist_json || []).join(", ")} onChange={(e) => setField("checklist_json", e.target.value.split(",").map((item) => item.trim()).filter(Boolean))} /></label>
          <label className="full-col"><span>Approval izohi</span><textarea value={form.approval_comment} onChange={(e) => setField("approval_comment", e.target.value)} rows={2} /></label>
          <label className="full-col"><span>Izoh</span><input value={form.notes} onChange={(e) => setField("notes", e.target.value)} /></label>
          <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Saqlash"}</button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Safar rejalari" right={<select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}><option value="">Barcha filiallar</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select>} />
        <div className="workflow-strip">
          {["reja", "tasdiqlandi", "jarayonda", "qayta_ishlash", "rad_etildi", "yakunlandi"].map((statusKey) => (
            <div key={statusKey} className={`workflow-step ${approvalStatusMeta(statusKey, "travel").tone}`}>
              <span className={approvalStatusClass(statusKey, "travel")}>{formatApprovalStatus(statusKey, "travel")}</span>
              <strong>{travelWorkflowCounts[statusKey] || 0}</strong>
            </div>
          ))}
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sana</th><th>Filial</th><th>Video</th><th>Ishtirokchilar</th><th>Status</th><th>Amallar</th></tr></thead>
            <tbody>
              {filteredTravelPlans.length ? filteredTravelPlans.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.plan_date)}</td>
                  <td>{row.branch_name || "-"}</td>
                  <td>{row.video_title}</td>
                  <td>{row.participants_text || "-"}</td>
                  <td><span className={approvalStatusClass(row.status, "travel")}>{formatApprovalStatus(row.status, "travel")}</span></td>
                  <td><IconActions onView={() => setViewRow(row)} onEdit={() => startEdit(row)} onDelete={() => removeRow(row.id)} /></td>
                </tr>
              )) : <tr><td colSpan="6" className="empty-cell">Hozircha safar rejasi yoР Р†Р вЂљР’Вq</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <SectionTitle title="Safar timeline" desc="Yaqin safar va suratga olish rejasi" />
        <div className="travel-timeline">
          {timelineRows.length ? timelineRows.map((row) => (
            <button key={`timeline-${row.id}`} type="button" className="timeline-item" onClick={() => setViewRow(row)}>
              <div className="timeline-dot-wrap">
                <span className={`timeline-dot ${approvalStatusMeta(row.status, "travel").tone}`} />
              </div>
              <div className="timeline-content">
                <div className="timeline-top">
                  <strong>{row.video_title}</strong>
                  <span>{formatDate(row.plan_date)}</span>
                </div>
                <div className="timeline-meta">
                  <span>{row.branch_name || "-"}</span>
                  <span className={approvalStatusClass(row.status, "travel")}>{formatApprovalStatus(row.status, "travel")}</span>
                </div>
                <p>{row.participants_text || "Ishtirokchilar koР Р†Р вЂљР’Вrsatilmagan"}</p>
              </div>
            </button>
          )) : <div className="empty-block">Hozircha timeline uchun safar rejasi yoР Р†Р вЂљР’Вq</div>}
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Safar rejasi tafsiloti" wide>
        {viewRow ? <>
          <div className="detail-grid">
            <div><strong>Sana:</strong> {formatDate(viewRow.plan_date)}</div>
            <div><strong>Filial:</strong> {viewRow.branch_name || "-"}</div>
            <div><strong>Video:</strong> {viewRow.video_title}</div>
            <div><strong>Status:</strong> {viewRow.status || "-"}</div>
            <div className="full-col"><strong>Ishtirokchilar:</strong> {viewRow.participants_text || "-"}</div>
            <div className="full-col"><strong>Videodek URL:</strong> {viewRow.videodek_url || "-"}</div>
            <div className="full-col"><strong>Ssenariy:</strong> {viewRow.scenario_text || "-"}</div>
            <div><strong>Budget:</strong> {formatMoney(viewRow.budget_amount || 0)}</div>
            <div><strong>Transport:</strong> {viewRow.transport_text || "-"}</div>
            <div><strong>Mehmonxona:</strong> {viewRow.hotel_text || "-"}</div>
            <div><strong>Deadline:</strong> {formatDate(viewRow.deadline_date)}</div>
            <div className="full-col"><strong>Approval izohi:</strong> {viewRow.approval_comment || "-"}</div>
            <div className="full-col"><strong>Izoh:</strong> {viewRow.notes || "-"}</div>
            <div className="full-col"><strong>Checklist:</strong> {(Array.isArray(viewRow.checklist_json) ? viewRow.checklist_json : []).join(", ") || "-"}</div>
          </div>
          <DiscussionPanel entityType="travel_plan" entityId={viewRow.id} onToast={onToast} />
        </> : null}
      </Modal>
    </div>
  );
}

function RecurringPage({ recurringTasks = [], recurringExpenses = [], users = [], onToast, reload }) {
  const [taskForm, setTaskForm] = useState({ title: "", description: "", frequency: "monthly", day_of_week: 1, day_of_month: 1, priority: "medium", assignee_user_id: "", is_active: true });
  const [expenseForm, setExpenseForm] = useState({ title: "", vendor_name: "", amount: "", category: "servis", payment_type: "visa", frequency: "monthly", day_of_week: 1, day_of_month: 1, is_active: true });

  return (
    <div className="page-grid">
      <div className="two-grid">
        <div className="card">
          <SectionTitle title="Recurring tasks" desc="Har hafta yoki oy avtomatik vazifa" />
          <form className="form-grid" onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.create("recurring-tasks", taskForm);
              setTaskForm({ title: "", description: "", frequency: "monthly", day_of_week: 1, day_of_month: 1, priority: "medium", assignee_user_id: "", is_active: true });
              await reload();
              onToast("Recurring task saqlandi", "success");
            } catch (err) {
              onToast(err.message || "Recurring task saqlanmadi", "error");
            }
          }}>
            <label><span>Nomi</span><input value={taskForm.title} onChange={(e) => setTaskForm((p) => ({ ...p, title: e.target.value }))} required /></label>
            <label><span>Frequency</span><select value={taskForm.frequency} onChange={(e) => setTaskForm((p) => ({ ...p, frequency: e.target.value }))}><option value="weekly">weekly</option><option value="monthly">monthly</option></select></label>
            <label><span>Hafta kuni</span><input type="number" min="1" max="7" value={taskForm.day_of_week} onChange={(e) => setTaskForm((p) => ({ ...p, day_of_week: Number(e.target.value) }))} /></label>
            <label><span>Oy kuni</span><input type="number" min="1" max="28" value={taskForm.day_of_month} onChange={(e) => setTaskForm((p) => ({ ...p, day_of_month: Number(e.target.value) }))} /></label>
            <label><span>Priority</span><select value={taskForm.priority} onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}><option value="low">low</option><option value="medium">medium</option><option value="high">high</option></select></label>
            <label><span>Mas'ul</span><select value={taskForm.assignee_user_id} onChange={(e) => setTaskForm((p) => ({ ...p, assignee_user_id: e.target.value }))}><option value="">Tanlang</option>{users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></label>
            <label className="full-col"><span>Izoh</span><input value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} /></label>
            <button className="btn primary" type="submit">Saqlash</button>
          </form>
          <div className="table-wrap"><table><thead><tr><th>Nomi</th><th>Frequency</th><th>Mas'ul</th></tr></thead><tbody>{recurringTasks.length ? recurringTasks.map((row) => <tr key={row.id}><td>{row.title}</td><td>{row.frequency}</td><td>{row.assignee_name || "-"}</td></tr>) : <tr><td colSpan="3" className="empty-cell">Hozircha yo'q</td></tr>}</tbody></table></div>
        </div>

        <div className="card">
          <SectionTitle title="Recurring expenses" desc="Canva, Meta, CapCut kabi avtomatik harajat" />
          <form className="form-grid" onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api.create("recurring-expenses", { ...expenseForm, amount: Number(expenseForm.amount || 0) });
              setExpenseForm({ title: "", vendor_name: "", amount: "", category: "servis", payment_type: "visa", frequency: "monthly", day_of_week: 1, day_of_month: 1, is_active: true });
              await reload();
              onToast("Recurring expense saqlandi", "success");
            } catch (err) {
              onToast(err.message || "Recurring expense saqlanmadi", "error");
            }
          }}>
            <label><span>Nomi</span><input value={expenseForm.title} onChange={(e) => setExpenseForm((p) => ({ ...p, title: e.target.value }))} required /></label>
            <label><span>Xizmat</span><input value={expenseForm.vendor_name} onChange={(e) => setExpenseForm((p) => ({ ...p, vendor_name: e.target.value }))} /></label>
            <label><span>Amount</span><input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((p) => ({ ...p, amount: e.target.value }))} required /></label>
            <label><span>Frequency</span><select value={expenseForm.frequency} onChange={(e) => setExpenseForm((p) => ({ ...p, frequency: e.target.value }))}><option value="weekly">weekly</option><option value="monthly">monthly</option></select></label>
            <label><span>Kategoriya</span><select value={expenseForm.category} onChange={(e) => setExpenseForm((p) => ({ ...p, category: e.target.value }))}><option value="servis">servis</option><option value="reklama">reklama</option><option value="safar">safar</option><option value="boshqa">boshqa</option></select></label>
            <label><span>To'lov</span><select value={expenseForm.payment_type} onChange={(e) => setExpenseForm((p) => ({ ...p, payment_type: e.target.value }))}><option value="visa">visa</option><option value="bank">bank</option><option value="cash">cash</option></select></label>
            <button className="btn primary" type="submit">Saqlash</button>
          </form>
          <div className="table-wrap"><table><thead><tr><th>Nomi</th><th>Frequency</th><th>Summa</th></tr></thead><tbody>{recurringExpenses.length ? recurringExpenses.map((row) => <tr key={row.id}><td>{row.title}</td><td>{row.frequency}</td><td>{formatMoney(row.amount)}</td></tr>) : <tr><td colSpan="3" className="empty-cell">Hozircha yo'q</td></tr>}</tbody></table></div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPage({ analyticsData }) {
  const [leftBranch, setLeftBranch] = useState("");
  const [rightBranch, setRightBranch] = useState("");
  const bonusSeries = analyticsData?.bonus_by_month || [];
  const spendSeries = analyticsData?.spend_by_month || [];
  const statuses = analyticsData?.content_by_status || [];
  const branches = analyticsData?.branch_kpi || [];
  const topPerformers = analyticsData?.top_performers || [];
  const employeeRows = analyticsData?.employee_kpi || [];
  const branchNames = branches.map((item) => item.name);
  const leftData = branches.find((item) => item.name === leftBranch) || branches[0];
  const rightData = branches.find((item) => item.name === rightBranch) || branches[1];
  const workloadMax = Math.max(...employeeRows.map((item) => Number(item.total_tasks || 0) + Number(item.content_count || 0) + Number(item.travel_count || 0)), 1);
  return (
    <div className="page-grid">
      <div className="two-grid">
        <div className="card">
          <SectionTitle title="Bonus trend" />
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={bonusSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
                <XAxis dataKey="month_label" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Line type="monotone" dataKey="total" stroke="#1690F5" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card">
          <SectionTitle title="Reklama sarfi" />
          <div className="chart-shell">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={spendSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.25)" />
                <XAxis dataKey="month_label" />
                <YAxis />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Bar dataKey="total" radius={[10, 10, 0, 0]}>
                  {spendSeries.map((_, index) => <Cell key={`cell-${index}`} fill={index % 2 ? "#6dd5fa" : "#1690F5"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="two-grid">
        <div className="card"><SectionTitle title="Kontent statuslari" /><div className="quick-list">{statuses.map((i) => <div key={i.status} className="quick-item">{formatApprovalStatus(i.status)}: <strong>{i.count}</strong></div>)}</div></div>
        <div className="card"><SectionTitle title="Filial KPI" /><div className="bar-chart">{branches.map((i) => <div key={i.name} className="bar-item"><span>{i.name}</span><div className="bar-track branch"><i style={{ width: `${Math.max((Number(i.content_score || 0) + Number(i.subscriber_growth || 0)) / Math.max(...branches.map((x) => Number(x.content_score || 0) + Number(x.subscriber_growth || 0)), 1) * 100, 8)}%` }} /></div><strong>{Number(i.content_score || 0) + Number(i.subscriber_growth || 0)}</strong></div>)}</div></div>
      </div>
      <div className="card"><SectionTitle title="Top performer board" /><div className="table-wrap"><table><thead><tr><th>Hodim</th><th>Bajarilgan vazifa</th><th>Bonus</th></tr></thead><tbody>{topPerformers.length ? topPerformers.map((row, index) => <tr key={`${row.full_name}-${index}`}><td>{row.full_name}</td><td>{row.done_tasks}</td><td>{formatMoney(row.bonus_total)}</td></tr>) : <tr><td colSpan="3" className="empty-cell">Hozircha ma'lumot yo'q</td></tr>}</tbody></table></div></div>
      <div className="two-grid">
        <div className="card">
          <SectionTitle title="Branch comparison mode" />
          <div className="toolbar-actions">
            <select value={leftBranch} onChange={(e) => setLeftBranch(e.target.value)}>
              <option value="">Filial 1</option>
              {branchNames.map((item) => <option key={`left-${item}`} value={item}>{item}</option>)}
            </select>
            <select value={rightBranch} onChange={(e) => setRightBranch(e.target.value)}>
              <option value="">Filial 2</option>
              {branchNames.map((item) => <option key={`right-${item}`} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="two-grid">
            {[leftData, rightData].filter(Boolean).map((item, index) => (
              <div key={`${item?.name}-${index}`} className="chart-card">
                <div className="chart-title">{item?.name}</div>
                <div className="quick-list">
                  <div className="quick-item">Kontent score: <strong>{Number(item?.content_score || 0)}</strong></div>
                  <div className="quick-item">Subscriber growth: <strong>{Number(item?.subscriber_growth || 0)}</strong></div>
                  <div className="quick-item">Campaign score: <strong>{Number(item?.campaign_score || 0)}</strong></div>
                  <div className="quick-item">Travel score: <strong>{Number(item?.travel_score || 0)}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <SectionTitle title="Production workload heatmap" />
          <div className="heatmap-grid">
            {employeeRows.length ? employeeRows.map((row) => {
              const load = Number(row.total_tasks || 0) + Number(row.content_count || 0) + Number(row.travel_count || 0);
              return (
                <div key={`heat-${row.id}`} className="heatmap-item">
                  <strong>{row.full_name}</strong>
                  <div className="heatmap-track"><span style={{ width: `${Math.max((load / workloadMax) * 100, load ? 10 : 0)}%` }} /></div>
                  <span>{load} birlik</span>
                </div>
              );
            }) : <div className="empty-block">Workload ma'lumotlari yo'q</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeKpiPage({ rows = [] }) {
  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Employee KPI page" desc="Hodim samaradorligi va yuklamasi" />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Hodim</th><th>Task</th><th>Done</th><th>Kontent</th><th>Safar</th><th>Bonus</th></tr></thead>
            <tbody>
              {rows.length ? rows.map((row) => (
                <tr key={`employee-kpi-${row.id}`}>
                  <td>{row.full_name}</td>
                  <td>{row.total_tasks}</td>
                  <td>{row.done_tasks}</td>
                  <td>{row.content_count}</td>
                  <td>{row.travel_count}</td>
                  <td>{formatMoney(row.bonus_total)}</td>
                </tr>
              )) : <tr><td colSpan="6" className="empty-cell">KPI ma'lumoti yo'q</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function HealthPage({ data = {} }) {
  return (
    <div className="page-grid">
      <div className="stats-grid">
        <StatCard title="Socket" value={data?.socket_connections || 0} hint="live foydalanuvchilar" tone="info" />
        <StatCard title="Unread" value={data?.unread_notifications || 0} hint="ochilmagan notification" tone={(data?.unread_notifications || 0) > 0 ? "warning" : "success"} />
        <StatCard title="Snapshots" value={data?.monthly_snapshots || 0} hint="monthly close backup" tone="default" />
        <StatCard title="Telegram" value={data?.telegram_configured ? "On" : "Off"} hint={data?.timestamp ? formatDateTime(data.timestamp) : "holat"} tone={data?.telegram_configured ? "success" : "danger"} />
      </div>
    </div>
  );
}

function MoodPulsePage({ rows = [], user, onToast, reload }) {
  const [moodScore, setMoodScore] = useState(3);
  const [note, setNote] = useState("");
  const recentRows = rows.slice(0, 20);
  const avgMood = rows.length ? (rows.reduce((sum, row) => sum + Number(row.mood_score || 0), 0) / rows.length).toFixed(2) : "0.00";

  return (
    <div className="page-grid">
      <div className="stats-grid">
        <StatCard title="Jamoa kayfiyati" value={avgMood} hint="oxirgi yozuvlar bo'yicha" tone={Number(avgMood) >= 4 ? "success" : Number(avgMood) >= 3 ? "warning" : "danger"} />
        <StatCard title="Mening bugungi holatim" value={moodScore} hint={user?.full_name || "hodim"} tone={moodScore >= 4 ? "success" : moodScore >= 3 ? "warning" : "danger"} />
      </div>
      <div className="card">
        <SectionTitle title="Team mood pulse" desc="Bugungi holatingizni qoldiring" />
        <div className="mood-picker">
          {[1, 2, 3, 4, 5].map((score) => (
            <button key={`mood-${score}`} type="button" className={`mood-pill ${moodScore === score ? "active" : ""}`} onClick={() => setMoodScore(score)}>
              {score}
            </button>
          ))}
        </div>
        <div className="form-grid">
          <label className="full-col"><span>Izoh</span><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bugungi holat, blok yoki kayfiyat..." /></label>
          <button className="btn primary" type="button" onClick={async () => {
            try {
              await api.create("team-mood", { mood_score: moodScore, note });
              setNote("");
              await reload();
              onToast("Mood pulse saqlandi", "success");
            } catch (err) {
              onToast(err.message || "Mood pulse saqlanmadi", "error");
            }
          }}>Saqlash</button>
        </div>
      </div>
      <div className="card">
        <SectionTitle title="So'nggi mood yozuvlari" />
        <div className="table-wrap">
          <table>
            <thead><tr><th>Hodim</th><th>Sana</th><th>Mood</th><th>Izoh</th></tr></thead>
            <tbody>
              {recentRows.length ? recentRows.map((row) => (
                <tr key={`mood-row-${row.id}`}>
                  <td>{row.full_name || "-"}</td>
                  <td>{formatDate(row.entry_date)}</td>
                  <td><span className={`mood-badge mood-${row.mood_score}`}>{row.mood_score}/5</span></td>
                  <td>{row.note || "-"}</td>
                </tr>
              )) : <tr><td colSpan="4" className="empty-cell">Mood yozuvlari yo'q</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PostingInsightsPage({ data = {} }) {
  const byHour = data?.by_hour || [];
  const byDay = data?.by_day || [];
  const bestHour = data?.best_hour;
  const bestDay = data?.best_day;

  return (
    <div className="page-grid">
      <div className="stats-grid">
        <StatCard title="Eng yaxshi soat" value={bestHour ? `${bestHour.hour_label}:00` : "-"} hint={bestHour ? `Avg reach ${bestHour.avg_reach}` : "ma'lumot yo'q"} tone="info" />
        <StatCard title="Eng yaxshi kun" value={bestDay?.day_label || "-"} hint={bestDay ? `Avg reach ${bestDay.avg_reach}` : "ma'lumot yo'q"} tone="success" />
      </div>
      <div className="two-grid">
        <div className="card">
          <SectionTitle title="Best posting time analyzer" desc="Soat kesimida natijalar" />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Soat</th><th>Kontent</th><th>Avg reach</th></tr></thead>
              <tbody>
                {byHour.length ? byHour.map((row) => (
                  <tr key={`hour-${row.hour_label}`}>
                    <td>{row.hour_label}:00</td>
                    <td>{row.content_count}</td>
                    <td>{row.avg_reach}</td>
                  </tr>
                )) : <tr><td colSpan="3" className="empty-cell">Ma'lumot yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card">
          <SectionTitle title="Kun kesimidagi natija" />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Kun</th><th>Kontent</th><th>Avg reach</th></tr></thead>
              <tbody>
                {byDay.length ? byDay.map((row) => (
                  <tr key={`day-${row.day_label}`}>
                    <td>{row.day_label}</td>
                    <td>{row.content_count}</td>
                    <td>{row.avg_reach}</td>
                  </tr>
                )) : <tr><td colSpan="3" className="empty-cell">Ma'lumot yo'q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function FinanceDashboardPage({ expenses = [], campaigns = [], bonusItems = [], travelPlans = [], budgets = [], onToast, reload }) {
  const currentMonth = getMonthLabel();
  const [form, setForm] = useState({ month_label: currentMonth, category: "servis", limit_amount: "" });
  const monthlyExpenses = expenses.filter((i) => formatDate(i.expense_date).startsWith(currentMonth)).reduce((s, i) => s + Number(i.amount || 0), 0);
  const monthlyAds = campaigns.filter((i) => formatDate(i.start_date).startsWith(currentMonth) || formatDate(i.end_date).startsWith(currentMonth)).reduce((s, i) => s + Number(i.spend || 0), 0);
  const monthlyBonus = bonusItems.filter((i) => (i.month_label || "").startsWith(currentMonth)).reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const monthlyTravel = travelPlans.filter((i) => formatDate(i.plan_date).startsWith(currentMonth)).reduce((s, i) => s + Number(i.budget_amount || 0), 0);
  const activeBudgets = budgets.filter((i) => i.month_label === currentMonth);
  return (
    <div className="page-grid">
      <div className="stats-grid">
        <StatCard title="Harajatlar" value={formatMoney(monthlyExpenses)} hint={getMonthTitle(currentMonth)} tone="danger" />
        <StatCard title="Reklama sarfi" value={formatMoney(monthlyAds)} hint={getMonthTitle(currentMonth)} tone="info" />
        <StatCard title="Bonus" value={formatMoney(monthlyBonus)} hint={getMonthTitle(currentMonth)} tone="warning" />
        <StatCard title="Safar budjeti" value={formatMoney(monthlyTravel)} hint={getMonthTitle(currentMonth)} tone="success" />
      </div>
      <div className="card">
        <SectionTitle title="Budjet planning" desc={getMonthTitle(currentMonth)} />
        <form className="form-grid" onSubmit={async (e) => {
          e.preventDefault();
          try {
            await api.create("budgets", { ...form, limit_amount: Number(form.limit_amount || 0) });
            setForm({ month_label: currentMonth, category: "servis", limit_amount: "" });
            await reload();
            onToast("Budjet saqlandi", "success");
          } catch (err) {
            onToast(err.message || "Budjet saqlanmadi", "error");
          }
        }}>
          <label><span>Oy</span><input type="month" value={form.month_label} onChange={(e) => setForm((p) => ({ ...p, month_label: e.target.value }))} /></label>
          <label><span>Kategoriya</span><select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}><option value="servis">servis</option><option value="reklama">reklama</option><option value="safar">safar</option><option value="bonus">bonus</option></select></label>
          <label><span>Limit</span><input type="number" value={form.limit_amount} onChange={(e) => setForm((p) => ({ ...p, limit_amount: e.target.value }))} /></label>
          <button className="btn primary" type="submit">Budjet qo'shish</button>
        </form>
        <div className="table-wrap"><table><thead><tr><th>Kategoriya</th><th>Limit</th></tr></thead><tbody>{activeBudgets.length ? activeBudgets.map((row) => <tr key={row.id}><td>{row.category}</td><td>{formatMoney(row.limit_amount)}</td></tr>) : <tr><td colSpan="2" className="empty-cell">Bu oy uchun budjet yo'q</td></tr>}</tbody></table></div>
      </div>
    </div>
  );
}

function AdvancedReportsPage({ advancedReports }) {
  const [range, setRange] = useState("monthly");
  const [data, setData] = useState(advancedReports);
  useEffect(() => { setData(advancedReports); }, [advancedReports]);
  async function reloadRange(value) {
    setRange(value);
    const result = await api.list("/api/reports/advanced", { range: value }).catch(() => null);
    setData(result);
  }
  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Advanced report page" right={<select value={range} onChange={(e) => reloadRange(e.target.value)}><option value="daily">daily</option><option value="weekly">weekly</option><option value="monthly">monthly</option></select>} />
        <div className="three-grid">
          <div className="chart-card"><div className="chart-title">Filial hisobotlari</div><div className="quick-list">{(data?.reports || []).map((row) => <div key={row.bucket} className="quick-item">{row.bucket}: <strong>{row.reports_count}</strong></div>)}</div></div>
          <div className="chart-card"><div className="chart-title">Vazifalar</div><div className="quick-list">{(data?.tasks || []).map((row) => <div key={row.bucket} className="quick-item">{row.bucket}: <strong>{row.done_count}/{row.task_total}</strong></div>)}</div></div>
          <div className="chart-card"><div className="chart-title">Harajatlar</div><div className="quick-list">{(data?.expenses || []).map((row) => <div key={row.bucket} className="quick-item">{row.bucket}: <strong>{formatMoney(row.expense_total)}</strong></div>)}</div></div>
        </div>
      </div>
    </div>
  );
}

function AiAssistantPage({ branches = [], onToast }) {
  const [mode, setMode] = useState("ideas");
  const [prompt, setPrompt] = useState("");
  const [contentType, setContentType] = useState("reels");
  const [branchName, setBranchName] = useState("");
  const [output, setOutput] = useState("");
  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="AI yordamchi" desc="Sarlavha, caption, ssenariy va g'oya generator" />
        <div className="form-grid">
          <label><span>Mode</span><select value={mode} onChange={(e) => setMode(e.target.value)}><option value="ideas">ideas</option><option value="title">title</option><option value="caption">caption</option><option value="script">script</option><option value="hook">hook</option><option value="cta">cta</option><option value="plan">plan</option></select></label>
          <label><span>Kontent turi</span><select value={contentType} onChange={(e) => setContentType(e.target.value)}><option value="reels">reels</option><option value="video">video</option><option value="story">story</option><option value="post">post</option></select></label>
          <label><span>Filial</span><select value={branchName} onChange={(e) => setBranchName(e.target.value)}><option value="">Tanlang</option>{branches.map((b) => <option key={b.id} value={b.name}>{b.name}</option>)}</select></label>
          <label className="full-col"><span>Mavzu</span><textarea rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)} /></label>
          <button className="btn primary" type="button" onClick={async () => {
            try {
              const result = await api.create("ai/assist", { mode, prompt, branch_name: branchName, content_type: contentType });
              setOutput(result?.output || "");
            } catch (err) {
              onToast(err.message || "AI yordamchi xatolik berdi", "error");
            }
          }}>Generatsiya qilish</button>
        </div>
        <div className="ai-output">{output || "Natija shu yerda chiqadi"}</div>
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
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalResults, setGlobalResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  const [summary, setSummary] = useState({});
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [bonusItems, setBonusItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [travelPlans, setTravelPlans] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [contentRows, setContentRows] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [threads, setThreads] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [advancedReports, setAdvancedReports] = useState(null);
  const [topPerformers, setTopPerformers] = useState(null);
  const [executiveSummary, setExecutiveSummary] = useState(null);
  const [employeeKpi, setEmployeeKpi] = useState([]);
  const [healthData, setHealthData] = useState(null);
  const [moodEntries, setMoodEntries] = useState([]);
  const [postingInsights, setPostingInsights] = useState(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const unreadChatCount = (threads || []).reduce((sum, thread) => sum + Number(thread.unread_count || 0), 0);

  useEffect(() => {
    localStorage.setItem("aloo_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }
    function handleInstalled() {
      setDeferredPrompt(null);
      showToast("Ilova qurilmaga o'rnatildi", "success");
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  async function reloadData() {
    try {
      const [
        dashboardRes,
        settingsRes,
        notificationsRes,
        usersRes,
        branchesRes,
        bonusItemsRes,
        expensesRes,
        travelPlansRes,
        uploadsRes,
        contentRes,
        dailyReportsRes,
        campaignsRes,
        tasksRes,
        threadsRes,
        auditLogsRes,
        recurringTasksRes,
        recurringExpensesRes,
        budgetsRes,
        analyticsRes,
        reportsRes,
        topPerformersRes,
        executiveSummaryRes,
        employeeKpiRes,
        healthRes,
        moodRes,
        postingInsightsRes
      ] = await Promise.all([
        api.dashboard().catch(() => ({})),
        api.settings.get().catch(() => null),
        api.list("notifications").catch(() => []),
        api.list("users").catch(() => []),
        api.list("branches").catch(() => []),
        api.list("bonus-items").catch(() => []),
        api.list("expenses").catch(() => []),
        api.list("travel-plans").catch(() => []),
        api.list("uploads").catch(() => []),
        api.list("content").catch(() => []),
        api.list("daily-reports").catch(() => []),
        api.list("campaigns").catch(() => []),
        api.list("tasks").catch(() => []),
        api.list("/api/messages/threads").catch(() => []),
        api.list("audit-logs").catch(() => []),
        api.list("recurring-tasks").catch(() => []),
        api.list("recurring-expenses").catch(() => []),
        api.list("budgets").catch(() => []),
        api.list("/api/analytics/overview").catch(() => null),
        api.list("/api/reports/advanced", { range: "monthly" }).catch(() => null),
        api.list("/api/top-performers").catch(() => null),
        api.list("/api/executive-summary").catch(() => null),
        api.list("/api/employee-kpi").catch(() => []),
        api.list("/api/health").catch(() => null),
        api.list("/api/team-mood").catch(() => []),
        api.list("/api/analytics/posting-insights").catch(() => null)
      ]);

      setSummary(dashboardRes || {});
      setSettings(settingsRes);
      setNotifications(notificationsRes || []);
      setUsers(usersRes || []);
      setBranches(branchesRes || []);
      setBonusItems(bonusItemsRes || []);
      setExpenses(expensesRes || []);
      setTravelPlans(travelPlansRes || []);
      setUploads(uploadsRes || []);
      setContentRows(contentRes || []);
      setDailyReports(dailyReportsRes || []);
      setCampaigns(campaignsRes || []);
      setTasks(tasksRes || []);
      setThreads(threadsRes || []);
      setAuditLogs(auditLogsRes || []);
      setRecurringTasks(recurringTasksRes || []);
      setRecurringExpenses(recurringExpensesRes || []);
      setBudgets(budgetsRes || []);
      setAnalyticsData(analyticsRes || null);
      setAdvancedReports(reportsRes || null);
      setTopPerformers(topPerformersRes || null);
      setExecutiveSummary(executiveSummaryRes || null);
      setEmployeeKpi(employeeKpiRes || []);
      setHealthData(healthRes || null);
      setMoodEntries(moodRes || []);
      setPostingInsights(postingInsightsRes || null);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    async function init() {
      if (!user) {
        const publicSettings = await api.settings.get().catch(() => null);
        setSettings(publicSettings);
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
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const intervalMs = active === "chat" ? 2500 : 7000;
    const timer = setInterval(() => {
      reloadData();
    }, intervalMs);
    return () => clearInterval(timer);
  }, [user?.id, active]);

  useEffect(() => {
    if (!user?.id || !globalSearch.trim()) {
      setGlobalResults(null);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        const result = await api.list("/api/search", { q: globalSearch.trim() });
        setGlobalResults(result);
      } catch {
        setGlobalResults(null);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [globalSearch, user?.id]);

  const allowedMenu = useMemo(() => {
    if (user?.role === "admin") return MENU;
    const permissions = safePermissions(user?.permissions_json);
    if (!permissions.length) {
      return MENU.filter((item) => item.id === "dashboard" || item.id === "profile");
    }
    return MENU.filter((item) => permissions.includes(item.id));
  }, [user]);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return allowedMenu;
    return allowedMenu.filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, allowedMenu]);

  function showToast(message = "Saqlandi Р Р†РЎС™РІР‚В¦", type = "success") {
    setToast({ message, type });
  }

  async function saveSettings(payload) {
    try {
      setSavingSettings(true);
      const res = await api.settings.update(payload);
      const updated = await api.settings.get();
      setSettings(updated);
      showToast(res.message || "Saqlandi Р Р†РЎС™РІР‚В¦");
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
    return (
      <div className="loading-screen">
        <div className="loading-orb loading-orb-one" />
        <div className="loading-orb loading-orb-two" />
        <div className="loading-grid" />
        <div className="loading-card">
          <div className="loading-brand">
            <img src={settings?.logo_url || LOGIN_LOGO} alt="logo" className="loading-brand-image" />
            <div>
              <strong>{settings?.company_name || "aloo"}</strong>
              <span>{settings?.platform_name || "SMM jamoasi platformasi"}</span>
            </div>
          </div>
          <div className="loading-spinner-wrap">
            <div className="loading-spinner-ring" />
            <div className="loading-spinner-dot" />
          </div>
          <div className="loading-copy">
            <h2>Platforma yuklanmoqda</h2>
            <p>Ma'lumotlar sinxronlanmoqda, biroz kuting...</p>
          </div>
          <div className="loading-progress">
            <span className="loading-progress-bar" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage onLoggedIn={setUser} settings={settings} />
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
        campaigns={campaigns}
        travelPlans={travelPlans}
        user={user}
      />
    );
  } else if (active === "content") {
    page = <ContentPage users={users} branches={branches} settings={settings} onToast={showToast} reload={reloadData} />;
  } else if (active === "bonus") {
    page = <BonusPage bonusItems={bonusItems} users={users} branches={branches} settings={settings} onToast={showToast} reload={reloadData} />;
  } else if (active === "expenses") {
    page = <ExpensesPage expenses={expenses} onToast={showToast} reload={reloadData} />;
  } else if (active === "finance") {
    page = <FinanceDashboardPage expenses={expenses} campaigns={campaigns} bonusItems={bonusItems} travelPlans={travelPlans} budgets={budgets} onToast={showToast} reload={reloadData} />;
  } else if (active === "travelPlans") {
    page = <TravelPlansPage travelPlans={travelPlans} branches={branches} onToast={showToast} reload={reloadData} />;
  } else if (active === "reports") {
    page = <AdvancedReportsPage advancedReports={advancedReports} />;
  } else if (active === "analytics") {
    page = <AnalyticsPage analyticsData={{ ...(analyticsData || {}), employee_kpi: employeeKpi, executive_summary: executiveSummary?.text }} />;
  } else if (active === "postingInsights") {
    page = <PostingInsightsPage data={postingInsights} />;
  } else if (active === "moodPulse") {
    page = <MoodPulsePage rows={moodEntries} user={user} onToast={showToast} reload={reloadData} />;
  } else if (active === "employeeKpi") {
    page = <EmployeeKpiPage rows={employeeKpi} />;
  } else if (active === "health") {
    page = <HealthPage data={healthData} />;
  } else if (active === "recurring") {
    page = <RecurringPage recurringTasks={recurringTasks} recurringExpenses={recurringExpenses} users={users} onToast={showToast} reload={reloadData} />;
  } else if (active === "dailyReports") {
    page = <DailyReportsPage reports={dailyReports} branches={branches} onToast={showToast} reload={reloadData} />;
  } else if (active === "campaigns") {
    page = <CampaignsPage campaigns={campaigns} onToast={showToast} reload={reloadData} />;
  } else if (active === "uploads") {
    page = <MediaPage uploads={uploads} onToast={showToast} reload={reloadData} />;
  } else if (active === "users") {
    page = <UsersPage users={users} onToast={showToast} reload={reloadData} />;
  } else if (active === "tasks") {
    page = <TasksPage tasks={tasks} users={users} user={user} onToast={showToast} reload={reloadData} />;
  } else if (active === "chat") {
    page = <ChatPage user={user} users={users} threads={threads} onToast={showToast} reload={reloadData} />;
  } else if (active === "audit") {
    page = <AuditPage logs={auditLogs} />;
  } else if (active === "profile") {
    page = <ProfilePage user={user} onToast={showToast} refreshUser={setUser} />;
  } else if (active === "settings") {
    page = <SettingsPage settings={settings} onSave={saveSettings} saving={savingSettings} theme={theme} setTheme={setTheme} onToast={showToast} reload={reloadData} />;
  } else if (active === "aiAssistant") {
    page = <AiAssistantPage branches={branches} onToast={showToast} />;
  }

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">
              <img src={settings?.logo_url || LOGIN_LOGO} alt="logo" className="brand-mark-image" />
            </div>
            <div>
              <div className="brand-name">{settings?.company_name || "aloo"}</div>
              <div className="brand-desc">{settings?.platform_name || "SMM jamoasi platformasi"}</div>
            </div>
          </div>

          <div className="sidebar-search">
            <Search size={16} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidiruv..." />
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
                  <span className="menu-icon-wrap">
                    <Icon size={16} />
                  </span>
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
              <div className="small-label">{(settings?.company_name || "aloo")} platforma</div>
              <h1>{MENU.find((m) => m.id === active)?.title || "Bosh sahifa"}</h1>
            </div>

            <div className="topbar-right">
              <div className={`global-search ${searchOpen ? "open" : ""}`}>
                <Search size={16} />
                <input
                  value={globalSearch}
                  onFocus={() => setSearchOpen(true)}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Global qidiruv..."
                />
                {searchOpen && globalSearch.trim() ? (
                  <div className="global-search-panel">
                    {[
                      { key: "users", label: "Hodimlar", items: globalResults?.users || [] },
                      { key: "content", label: "Kontent", items: globalResults?.content || [] },
                      { key: "tasks", label: "Vazifalar", items: globalResults?.tasks || [] },
                      { key: "bonuses", label: "Bonus", items: globalResults?.bonuses || [] },
                      { key: "travel_plans", label: "Safar rejasi", items: globalResults?.travel_plans || [] },
                      { key: "chats", label: "Chat", items: globalResults?.chats || [] }
                    ].map((group) => (
                      <div key={group.key} className="global-search-group">
                        <strong>{group.label}</strong>
                        {group.items.length ? group.items.slice(0, 3).map((item) => (
                          <button
                            key={`${group.key}-${item.id}`}
                            type="button"
                            className="global-search-item"
                            onClick={() => {
                              setSearchOpen(false);
                              setGlobalSearch("");
                              if (group.key === "users") setActive("users");
                              else if (group.key === "content") setActive("content");
                              else if (group.key === "tasks") setActive("tasks");
                              else if (group.key === "bonuses") setActive("bonus");
                              else if (group.key === "travel_plans") setActive("travelPlans");
                              else if (group.key === "chats") setActive("chat");
                            }}
                          >
                            <span>{item.full_name || item.title || item.content_title || item.video_title || item.body}</span>
                          </button>
                        )) : <span className="global-search-empty">Topilmadi</span>}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
              <button className="notif-pill" type="button" onClick={() => setActive("chat")}>
                <MessageCircle size={16} />
                {unreadChatCount}
              </button>
              <button className="notif-pill" type="button" onClick={() => setDrawerOpen(true)}>
                <Bell size={16} />
                {(notifications || []).filter((n) => !n.is_read).length}
              </button>
              {deferredPrompt ? (
                <button
                  className="notif-pill install-pill"
                  type="button"
                  onClick={async () => {
                    deferredPrompt.prompt();
                    await deferredPrompt.userChoice.catch(() => null);
                    setDeferredPrompt(null);
                  }}
                >
                  Install
                </button>
              ) : null}
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <button type="button" className="user-chip" onClick={() => setActive("profile")}>
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt={user.full_name} className="topbar-avatar" />
                ) : (
                  <div className="topbar-avatar fallback">{getAvatarFallback(user?.full_name)}</div>
                )}
                <span>{user?.full_name || "Foydalanuvchi"}</span>
              </button>
            </div>
          </div>

          <div className="page-layer" onClick={() => setSearchOpen(false)}>
            {page}
          </div>
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
  --danger:#e11d48;
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
  --danger:#fb7185;
}
*{box-sizing:border-box}
html,body,#root{margin:0;min-height:100%;font-family:Inter,Arial,sans-serif;background:var(--bg);color:var(--text)}
button,input,select,textarea{font:inherit}
input,select,textarea{outline:none}
a{color:var(--blue);text-decoration:none}
img{display:block;max-width:100%}

.loading-screen{
  min-height:100vh;
  display:grid;
  place-items:center;
  background:
    radial-gradient(circle at 14% 18%, rgba(56,189,248,.24), transparent 24%),
    radial-gradient(circle at 82% 20%, rgba(99,102,241,.16), transparent 22%),
    radial-gradient(circle at 70% 78%, rgba(110,231,183,.16), transparent 26%),
    linear-gradient(135deg,#eef6ff 0%, #f9fbff 42%, #f1fffb 100%);
  color:var(--text);
  position:relative;
  overflow:hidden;
}
.loading-orb{
  position:absolute;
  border-radius:999px;
  filter:blur(8px);
  opacity:.85;
  pointer-events:none;
}
.loading-orb-one{
  width:260px;
  height:260px;
  top:-40px;
  left:-30px;
  background:radial-gradient(circle, rgba(56,189,248,.28), transparent 68%);
  animation:login-float 9s ease-in-out infinite;
}
.loading-orb-two{
  width:320px;
  height:320px;
  right:-80px;
  bottom:-120px;
  background:radial-gradient(circle, rgba(29,78,216,.22), transparent 68%);
  animation:login-float 11s ease-in-out infinite reverse;
}
.loading-grid{
  position:absolute;
  inset:0;
  background-image:
    linear-gradient(rgba(37,99,235,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37,99,235,.04) 1px, transparent 1px);
  background-size:34px 34px;
  mask-image:radial-gradient(circle at center, black 28%, transparent 90%);
}
.loading-card{
  position:relative;
  z-index:2;
  width:min(92vw, 520px);
  padding:28px;
  border-radius:32px;
  background:rgba(255,255,255,.76);
  border:1px solid rgba(255,255,255,.82);
  backdrop-filter:blur(18px);
  box-shadow:0 28px 70px rgba(20,86,140,.14);
  display:grid;
  gap:20px;
  animation:login-card-in .7s cubic-bezier(.2,.9,.2,1);
}
.loading-brand{
  display:flex;
  align-items:center;
  gap:14px;
}
.loading-brand-image{
  width:68px;
  height:68px;
  object-fit:cover;
  border-radius:22px;
  box-shadow:0 16px 32px rgba(29,78,216,.18);
}
.loading-brand strong{
  display:block;
  font-size:24px;
  line-height:1;
  margin-bottom:6px;
}
.loading-brand span{
  color:var(--muted);
  font-size:13px;
}
.loading-spinner-wrap{
  position:relative;
  width:84px;
  height:84px;
  margin:4px auto;
}
.loading-spinner-ring{
  position:absolute;
  inset:0;
  border-radius:999px;
  border:5px solid rgba(29,78,216,.12);
  border-top-color:#1d4ed8;
  border-right-color:#38bdf8;
  animation:login-spin 1.1s linear infinite;
}
.loading-spinner-dot{
  position:absolute;
  inset:18px;
  border-radius:999px;
  background:radial-gradient(circle at 30% 30%, #6ee7b7, #38bdf8 65%, #1d4ed8);
  box-shadow:0 0 24px rgba(56,189,248,.4);
  animation:pulse-glow 1.8s ease-in-out infinite;
}
.loading-copy{
  text-align:center;
}
.loading-copy h2{
  margin:0 0 8px;
  font-size:30px;
  letter-spacing:-.03em;
}
.loading-copy p{
  margin:0;
  color:var(--muted);
  font-size:15px;
}
.loading-progress{
  height:12px;
  border-radius:999px;
  background:rgba(22,144,245,.08);
  overflow:hidden;
}
.loading-progress-bar{
  display:block;
  height:100%;
  width:38%;
  border-radius:999px;
  background:linear-gradient(90deg, #1d4ed8, #38bdf8, #6ee7b7);
  animation:loading-progress 1.8s ease-in-out infinite;
}

.login-page{
  min-height:100vh;
  display:grid;
  grid-template-columns:1.15fr .85fr;
  gap:32px;
  padding:40px;
  position:relative;
  overflow:hidden;
  background:
    radial-gradient(circle at 12% 18%, rgba(56,189,248,.24), transparent 26%),
    radial-gradient(circle at 86% 20%, rgba(99,102,241,.18), transparent 22%),
    radial-gradient(circle at 78% 78%, rgba(29,78,216,.16), transparent 24%),
    linear-gradient(135deg,#eaf4ff 0%, #f8fbff 34%, #eef9f7 66%, #ecfeff 100%);
}
.login-particles{
  position:absolute;
  inset:0;
  pointer-events:none;
  overflow:hidden;
}
.login-particle{
  position:absolute;
  bottom:-40px;
  width:6px;
  height:6px;
  border-radius:999px;
  background:linear-gradient(135deg, rgba(56,189,248,.65), rgba(110,231,183,.35));
  box-shadow:0 0 18px rgba(56,189,248,.35);
  opacity:.45;
  animation:particle-rise linear infinite;
}
.login-copy{
  display:flex;
  flex-direction:column;
  justify-content:center;
  position:relative;
  z-index:2;
  animation:login-fade-up .7s ease;
}
.brand-kicker{
  display:inline-flex;
  width:max-content;
  padding:10px 16px;
  border-radius:999px;
  background:rgba(255,255,255,.64);
  backdrop-filter:blur(10px);
  border:1px solid rgba(22,144,245,.18);
  color:var(--blue);
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.16em;
  box-shadow:0 14px 30px rgba(22,144,245,.08);
}
.login-copy h1{
  font-size:68px;
  margin:18px 0 0;
  line-height:.98;
  letter-spacing:-.04em;
}
.login-copy h2{
  font-size:32px;
  line-height:1.12;
  margin:18px 0 0;
  max-width:760px;
}
.login-copy p{color:var(--muted);font-size:18px;max-width:620px;line-height:1.6}
.login-logo-lockup{
  display:flex;
  align-items:center;
  gap:16px;
  margin-top:26px;
  margin-bottom:4px;
}
.login-logo-image{
  width:78px;
  height:78px;
  border-radius:26px;
  box-shadow:0 18px 34px rgba(29,78,216,.18);
}
.login-logo-copy{
  display:grid;
  gap:4px;
}
.login-logo-copy strong{
  font-size:22px;
  line-height:1;
}
.login-logo-copy span{
  color:var(--muted);
  font-size:14px;
}
.login-feature-row{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,220px));
  gap:14px;
  margin-top:28px;
}
.login-feature-card{
  padding:16px 18px;
  border-radius:22px;
  background:rgba(255,255,255,.58);
  border:1px solid rgba(255,255,255,.75);
  backdrop-filter:blur(14px);
  box-shadow:0 18px 36px rgba(30,41,59,.06);
  animation:login-float 5s ease-in-out infinite;
}
.login-feature-card:nth-child(2){animation-delay:-2.2s}
.login-feature-card strong{display:block;font-size:16px;margin-bottom:6px}
.login-feature-card span{color:var(--muted);font-size:14px;line-height:1.5}
.login-card{
  align-self:center;
  justify-self:end;
  width:min(100%, 560px);
  position:relative;
  z-index:2;
  overflow:hidden;
  background:rgba(255,255,255,.68);
  backdrop-filter:blur(18px);
  border:1px solid rgba(255,255,255,.72);
  border-radius:34px;
  padding:30px;
  display:grid;
  gap:16px;
  box-shadow:0 24px 60px rgba(20,86,140,.12);
  animation:login-card-in .75s cubic-bezier(.2,.9,.2,1);
}
.login-card-shine{
  position:absolute;
  inset:-20% auto auto -30%;
  width:180px;
  height:180px;
  background:radial-gradient(circle, rgba(255,255,255,.72), transparent 70%);
  opacity:.85;
  animation:login-shine 7s linear infinite;
  pointer-events:none;
}
.small-label{font-size:12px;color:var(--muted);letter-spacing:.16em;text-transform:uppercase}
.login-title{font-size:30px;font-weight:800}
.login-card label{display:grid;gap:8px}
.login-card label span{font-size:13px;color:var(--muted)}
.login-card input{
  background:rgba(248,251,255,.9);
  border:1px solid rgba(22,144,245,.12);
  color:var(--text);
  border-radius:18px;
  padding:15px 16px;
  transition:border-color .2s ease, box-shadow .2s ease, transform .2s ease;
}
.login-card input:focus{
  border-color:rgba(22,144,245,.45);
  box-shadow:0 0 0 4px rgba(22,144,245,.12), 0 14px 30px rgba(56,189,248,.12);
  transform:translateY(-1px);
}
.login-card .btn.primary{
  position:relative;
  overflow:hidden;
  min-height:54px;
}
.login-card .btn.primary::after{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(120deg, transparent 20%, rgba(255,255,255,.28) 50%, transparent 80%);
  transform:translateX(-130%);
  animation:button-shimmer 2.8s infinite;
}
.login-orb{
  position:absolute;
  border-radius:50%;
  filter:blur(10px);
  opacity:.9;
  pointer-events:none;
}
.orb-one{
  width:280px;
  height:280px;
  top:-60px;
  right:22%;
  background:radial-gradient(circle, rgba(56,189,248,.30), rgba(29,78,216,.10) 60%, transparent 72%);
  animation:login-float 7s ease-in-out infinite;
}
.orb-two{
  width:360px;
  height:360px;
  left:-80px;
  bottom:-120px;
  background:radial-gradient(circle, rgba(110,231,183,.28), rgba(56,189,248,.08) 58%, transparent 74%);
  animation:login-float 9s ease-in-out infinite reverse;
}
.login-grid-line{
  position:absolute;
  inset:0;
  background-image:
    linear-gradient(rgba(37,99,235,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(37,99,235,.04) 1px, transparent 1px);
  background-size:34px 34px;
  mask-image:radial-gradient(circle at center, black 36%, transparent 88%);
  pointer-events:none;
}
.login-loading{
  position:absolute;
  inset:0;
  background:rgba(255,255,255,.58);
  backdrop-filter:blur(8px);
  z-index:4;
  display:grid;
  place-items:center;
  gap:12px;
  text-align:center;
  color:var(--text);
}
.login-loading span{
  font-size:14px;
  color:var(--muted);
}
.login-loader-ring{
  width:58px;
  height:58px;
  border-radius:50%;
  border:4px solid rgba(29,78,216,.12);
  border-top-color:#1d4ed8;
  border-right-color:#38bdf8;
  animation:login-spin 1s linear infinite;
  box-shadow:0 0 0 8px rgba(56,189,248,.08);
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
  width:56px;height:56px;border-radius:20px;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), transparent 38%),
    linear-gradient(135deg,#1d4ed8,#38bdf8 55%,#6ee7b7);
  color:#fff;display:grid;place-items:center;font-size:26px;font-weight:900;
  box-shadow:0 16px 30px rgba(29,78,216,.22);
  overflow:hidden;
}
.brand-mark-image{width:100%;height:100%;object-fit:cover}
.brand-name{font-size:24px;font-weight:800}
.brand-desc{font-size:12px;color:var(--muted)}
.settings-logo-preview{margin-top:18px;display:grid;gap:14px}
.settings-logo-card{
  display:flex;align-items:center;gap:14px;
  padding:16px 18px;border-radius:20px;
  background:linear-gradient(135deg, rgba(255,255,255,.88), rgba(235,246,255,.84));
  border:1px solid var(--line);
  box-shadow:0 16px 34px rgba(29,78,216,.08);
}
.settings-logo-card strong{display:block;font-size:18px;margin-bottom:4px}
.settings-logo-card span{color:var(--muted);font-size:13px}
.settings-logo-image{
  width:62px;height:62px;object-fit:cover;border-radius:18px;
  box-shadow:0 14px 28px rgba(29,78,216,.18);
}

.sidebar-search{
  display:flex;align-items:center;gap:10px;
  background:linear-gradient(180deg, rgba(255,255,255,.92), var(--soft));
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
  background:linear-gradient(180deg, rgba(255,255,255,.9), rgba(246,249,253,.75));
  color:var(--text);
  padding:14px 16px;
  border-radius:16px;
  display:flex;align-items:center;gap:10px;
  cursor:pointer;
  text-align:left;
  font-weight:700;
  transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease;
}
.menu-btn:hover{
  background:linear-gradient(180deg, rgba(235,245,255,.95), rgba(241,248,255,.9));
  border-color:rgba(22,144,245,.18);
  transform:translateX(2px);
}
.menu-btn.active{
  background:linear-gradient(135deg,rgba(22,144,245,.14),rgba(98,210,255,.14),rgba(110,231,183,.12));
  border-color:rgba(22,144,245,.28);
  box-shadow:0 14px 28px rgba(22,144,245,.10);
}
.menu-icon-wrap{
  width:34px;
  height:34px;
  border-radius:12px;
  display:grid;
  place-items:center;
  background:linear-gradient(180deg, rgba(255,255,255,.98), rgba(228,240,255,.9));
  border:1px solid rgba(22,144,245,.12);
  color:#2563eb;
}
.menu-btn.active .menu-icon-wrap{
  background:linear-gradient(135deg,#1d4ed8,#38bdf8);
  color:#fff;
  border-color:transparent;
}

.logout-btn{
  margin-top:auto;
  border:0;
  border-radius:16px;
  padding:14px 16px;
  background:
    radial-gradient(circle at 12% 20%, rgba(255,0,153,.35), transparent 18%),
    linear-gradient(135deg,#0f172a,#111827 60%,#020617);
  color:#fff;
  display:flex;align-items:center;justify-content:center;gap:8px;
  cursor:pointer;
  box-shadow:0 18px 34px rgba(2,6,23,.22);
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
.global-search{
  position:relative;
  min-width:280px;
  display:flex;
  align-items:center;
  gap:10px;
  background:var(--soft);
  border:1px solid var(--line);
  border-radius:16px;
  padding:12px 14px;
}
.global-search input{
  border:none;
  outline:none;
  background:transparent;
  width:100%;
  color:var(--text);
}
.global-search-panel{
  position:absolute;
  top:calc(100% + 10px);
  left:0;
  width:min(560px, 92vw);
  padding:14px;
  border-radius:20px;
  border:1px solid var(--line);
  background:rgba(255,255,255,.96);
  backdrop-filter:blur(16px);
  box-shadow:0 22px 46px rgba(15,23,42,.12);
  display:grid;
  gap:12px;
  z-index:25;
}
.global-search-group{
  display:grid;
  gap:8px;
}
.global-search-group strong{
  font-size:12px;
  letter-spacing:.08em;
  text-transform:uppercase;
  color:var(--muted);
}
.global-search-item{
  border:1px solid var(--line);
  background:var(--soft);
  color:var(--text);
  border-radius:12px;
  padding:10px 12px;
  text-align:left;
  cursor:pointer;
}
.global-search-empty{
  color:var(--muted);
  font-size:13px;
}

.theme-toggle,.notif-pill,.user-chip{
  border:1px solid var(--line);
  background:var(--soft);
  color:var(--text);
  border-radius:14px;
  padding:12px 14px;
  display:flex;align-items:center;gap:8px;
}
.notif-pill,.user-chip{cursor:pointer}
.topbar-avatar{
  width:28px;
  height:28px;
  border-radius:50%;
  object-fit:cover;
  border:1px solid var(--line);
}
.topbar-avatar.fallback{
  display:grid;
  place-items:center;
  background:var(--panel);
  font-size:12px;
  font-weight:800;
}

.page-grid{display:grid;gap:18px;margin-top:18px}
.hero-banner,.card,.stat-card{
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:22px;
  animation:panel-in .4s ease;
  transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.card:hover,.stat-card:hover{
  transform:translateY(-2px);
  box-shadow:0 18px 36px rgba(15,23,42,.06);
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
.stat-card{
  position:relative;
  overflow:hidden;
}
.stat-card-indicator{
  position:absolute;
  top:16px;
  right:16px;
  width:11px;
  height:11px;
  border-radius:999px;
  box-shadow:0 0 0 6px rgba(255,255,255,.45);
}
.stat-card-indicator-default{background:#94a3b8;box-shadow:0 0 0 6px rgba(148,163,184,.12), 0 0 18px rgba(148,163,184,.22)}
.stat-card-indicator-success{background:#10b981;box-shadow:0 0 0 6px rgba(16,185,129,.14), 0 0 20px rgba(16,185,129,.28)}
.stat-card-indicator-warning{background:#f59e0b;box-shadow:0 0 0 6px rgba(245,158,11,.14), 0 0 20px rgba(245,158,11,.28)}
.stat-card-indicator-danger{background:#ef4444;box-shadow:0 0 0 6px rgba(239,68,68,.14), 0 0 20px rgba(239,68,68,.30)}
.stat-card-indicator-info{background:#3b82f6;box-shadow:0 0 0 6px rgba(59,130,246,.14), 0 0 20px rgba(59,130,246,.30)}
.stat-card::after{
  content:"";
  position:absolute;
  inset:auto -20% -45% auto;
  width:150px;
  height:150px;
  border-radius:999px;
  filter:blur(6px);
  opacity:.7;
  pointer-events:none;
}
.stat-card-default{
  background:
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(248,250,252,.96)),
    var(--panel);
}
.stat-card-default::after{
  background:radial-gradient(circle, rgba(59,130,246,.10), transparent 70%);
}
.stat-card-success{
  background:linear-gradient(135deg, rgba(16,185,129,.12), rgba(255,255,255,.98) 44%, rgba(16,185,129,.06));
  border-color:rgba(16,185,129,.25);
  box-shadow:0 18px 40px rgba(16,185,129,.08);
}
.stat-card-success::after{
  background:radial-gradient(circle, rgba(16,185,129,.18), transparent 70%);
}
.stat-card-success .stat-card-value{color:#047857}
.stat-card-warning{
  background:linear-gradient(135deg, rgba(245,158,11,.15), rgba(255,255,255,.98) 42%, rgba(251,191,36,.08));
  border-color:rgba(245,158,11,.26);
  box-shadow:0 18px 40px rgba(245,158,11,.08);
}
.stat-card-warning::after{
  background:radial-gradient(circle, rgba(245,158,11,.18), transparent 70%);
}
.stat-card-warning .stat-card-value{color:#b45309}
.stat-card-danger{
  background:linear-gradient(135deg, rgba(239,68,68,.16), rgba(255,255,255,.98) 42%, rgba(248,113,113,.08));
  border-color:rgba(239,68,68,.24);
  box-shadow:0 18px 40px rgba(239,68,68,.10);
}
.stat-card-danger::after{
  background:radial-gradient(circle, rgba(239,68,68,.18), transparent 70%);
}
.stat-card-danger .stat-card-value{color:#b91c1c}
.stat-card-info{
  background:linear-gradient(135deg, rgba(59,130,246,.14), rgba(255,255,255,.98) 42%, rgba(125,211,252,.08));
  border-color:rgba(59,130,246,.24);
  box-shadow:0 18px 40px rgba(59,130,246,.08);
}
.stat-card-info::after{
  background:radial-gradient(circle, rgba(59,130,246,.18), transparent 70%);
}
.stat-card-info .stat-card-value{color:#1d4ed8}
.analytics-grid{grid-template-columns:repeat(4,1fr)}

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
.mb12{margin-bottom:12px}
.info-banner{
  margin-bottom:14px;
  padding:14px 16px;
  border-radius:16px;
  background:linear-gradient(135deg, rgba(29,78,216,.08), rgba(56,189,248,.08), rgba(110,231,183,.08));
  border:1px solid rgba(29,78,216,.14);
  color:var(--text);
}
.reminder-list{display:grid;gap:12px}
.reminder-card{
  padding:14px 16px;
  border-radius:16px;
  background:var(--soft);
  border:1px solid var(--line);
  display:grid;
  gap:6px;
}
.reminder-card.danger{
  background:linear-gradient(135deg, rgba(225,29,72,.08), rgba(255,255,255,.95));
  border-color:rgba(225,29,72,.22);
}
.reminder-card.warning{
  background:linear-gradient(135deg, rgba(245,158,11,.10), rgba(255,255,255,.96));
  border-color:rgba(245,158,11,.24);
}
.reminder-card.danger strong{color:#b91c1c}
.reminder-card.warning strong{color:#b45309}
.reminder-card span{color:var(--muted);font-size:13px}
.calendar-card{
  display:grid;
  gap:10px;
}
.calendar-weekdays,.calendar-grid{
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  gap:8px;
}
.calendar-weekdays div{
  padding:8px 0;
  text-align:center;
  color:var(--muted);
  font-size:12px;
  font-weight:700;
}
.calendar-cell{
  min-height:120px;
  padding:10px;
  border-radius:18px;
  background:var(--soft);
  border:1px solid var(--line);
  display:grid;
  align-content:start;
  gap:8px;
}
.calendar-cell.empty{
  opacity:.35;
}
.calendar-day{
  font-weight:800;
  font-size:13px;
}
.calendar-items{
  display:grid;
  gap:6px;
}
.calendar-pill{
  width:100%;
  text-align:left;
  border:0;
  border-radius:12px;
  padding:8px 10px;
  background:linear-gradient(135deg, rgba(255,255,255,.98), rgba(225,238,255,.95));
  color:var(--text);
  cursor:pointer;
  font-size:12px;
}
.calendar-pill.bonus{
  background:linear-gradient(135deg, rgba(34,197,94,.12), rgba(110,231,183,.2));
}
.calendar-pill.task{
  background:linear-gradient(135deg, rgba(29,78,216,.1), rgba(56,189,248,.16));
}
.calendar-pill.task.done{
  background:linear-gradient(135deg, rgba(34,197,94,.14), rgba(187,247,208,.18));
}
.calendar-more{
  color:var(--muted);
  font-size:12px;
  padding:0 2px;
}

.form-grid{
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:14px;
}
.form-grid label{display:grid;gap:8px}
.form-grid label span{font-size:13px;color:var(--muted)}
.field-note{font-size:12px;color:var(--muted)}
.form-grid input,.form-grid select,.form-grid textarea{
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
  display:inline-flex;
  align-items:center;
  gap:8px;
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
th,td{padding:12px 14px;border-bottom:1px solid var(--line);text-align:left;vertical-align:middle}
th{background:rgba(22,144,245,.05);color:var(--muted)}
.empty-cell{text-align:center;color:var(--muted);padding:24px}
.table-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.table-row-success{background:linear-gradient(90deg, rgba(16,185,129,.08), transparent 55%)}
.table-row-info{background:linear-gradient(90deg, rgba(59,130,246,.08), transparent 55%)}
.table-row-warning{background:linear-gradient(90deg, rgba(245,158,11,.08), transparent 55%)}
.table-row-danger{background:linear-gradient(90deg, rgba(239,68,68,.08), transparent 55%)}

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
  min-width:320px;
  display:flex;justify-content:space-between;align-items:center;gap:14px;
  padding:16px 18px;
  border-radius:22px;
  color:#fff;
  z-index:9999;
  box-shadow:0 24px 50px rgba(0,0,0,.25);
  overflow:hidden;
  animation:toast-in .35s ease;
}
.toast-success{background:linear-gradient(135deg,#0f9b5f,#4fd1c5)}
.toast-error{background:linear-gradient(135deg,#ef4444,#fb7185)}
.toast-glow{
  position:absolute;
  inset:auto -40px -40px auto;
  width:140px;
  height:140px;
  border-radius:50%;
  background:rgba(255,255,255,.18);
  filter:blur(8px);
}
.toast-copy{
  position:relative;
  z-index:1;
  display:grid;
  gap:4px;
}
.toast-copy strong{font-size:13px;letter-spacing:.08em;text-transform:uppercase}
.toast-copy span{font-size:15px}
.toast button{
  position:relative;
  z-index:1;
  background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.18);
  color:#fff;
  cursor:pointer;
  width:34px;
  height:34px;
  border-radius:12px;
}
@keyframes toast-in{
  from{transform:translateY(24px) scale(.94);opacity:0}
  to{transform:translateY(0) scale(1);opacity:1}
}

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
.page-layer{display:grid}
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
.status-badge,.priority-badge,.mini-badge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:92px;
  padding:7px 12px;
  border-radius:999px;
  font-size:12px;
  font-weight:800;
  text-transform:capitalize;
  letter-spacing:.02em;
  border:1px solid transparent;
  position:relative;
  overflow:hidden;
}
.status-badge::before,.priority-badge::before,.mini-badge::before{
  content:"";
  width:7px;
  height:7px;
  border-radius:999px;
  margin-right:8px;
  flex:0 0 auto;
}
.status-badge.todo{
  background:linear-gradient(135deg, rgba(148,163,184,.18), rgba(255,255,255,.95));
  color:#64748b;
  border-color:rgba(148,163,184,.22);
}
.status-badge.todo::before{background:#94a3b8;box-shadow:0 0 12px rgba(148,163,184,.35)}
.status-badge.doing{
  background:linear-gradient(135deg, rgba(59,130,246,.16), rgba(255,255,255,.96));
  color:#2563eb;
  border-color:rgba(59,130,246,.24);
}
.status-badge.doing::before{background:#3b82f6;box-shadow:0 0 12px rgba(59,130,246,.35)}
.status-badge.warning{
  background:linear-gradient(135deg, rgba(245,158,11,.16), rgba(255,255,255,.96));
  color:#b45309;
  border-color:rgba(245,158,11,.24);
}
.status-badge.warning::before{background:#f59e0b;box-shadow:0 0 12px rgba(245,158,11,.35)}
.status-badge.done{
  background:linear-gradient(135deg, rgba(34,197,94,.16), rgba(255,255,255,.96));
  color:#15803d;
  border-color:rgba(34,197,94,.22);
}
.status-badge.done::before{background:#22c55e;box-shadow:0 0 12px rgba(34,197,94,.35)}
.status-badge.cancelled{
  background:linear-gradient(135deg, rgba(239,68,68,.16), rgba(255,255,255,.96));
  color:#dc2626;
  border-color:rgba(239,68,68,.22);
}
.status-badge.cancelled::before{background:#ef4444;box-shadow:0 0 12px rgba(239,68,68,.35)}
.priority-badge.low{
  background:linear-gradient(135deg, rgba(34,197,94,.14), rgba(255,255,255,.96));
  color:#16a34a;
  border-color:rgba(34,197,94,.22);
}
.priority-badge.low::before{background:#22c55e}
.priority-badge.medium{
  background:linear-gradient(135deg, rgba(245,158,11,.14), rgba(255,255,255,.96));
  color:#d97706;
  border-color:rgba(245,158,11,.24);
}
.priority-badge.medium::before{background:#f59e0b}
.priority-badge.high{
  background:linear-gradient(135deg, rgba(239,68,68,.14), rgba(255,255,255,.96));
  color:#dc2626;
  border-color:rgba(239,68,68,.22);
}
.priority-badge.high::before{background:#ef4444}
.mini-badge{
  min-width:auto;
  padding:7px 11px;
}
.mini-badge.default{
  background:linear-gradient(135deg, rgba(148,163,184,.18), rgba(255,255,255,.96));
  color:#64748b;
  border-color:rgba(148,163,184,.22);
}
.mini-badge.default::before{background:#94a3b8}
.mini-badge.success{
  background:linear-gradient(135deg, rgba(16,185,129,.16), rgba(255,255,255,.96));
  color:#047857;
  border-color:rgba(16,185,129,.22);
}
.mini-badge.success::before{background:#10b981}
.mini-badge.warning{
  background:linear-gradient(135deg, rgba(245,158,11,.16), rgba(255,255,255,.96));
  color:#b45309;
  border-color:rgba(245,158,11,.24);
}
.mini-badge.warning::before{background:#f59e0b}
.mini-badge.danger{
  background:linear-gradient(135deg, rgba(239,68,68,.16), rgba(255,255,255,.96));
  color:#b91c1c;
  border-color:rgba(239,68,68,.22);
}
.mini-badge.danger::before{background:#ef4444}
.mini-badge.info{
  background:linear-gradient(135deg, rgba(59,130,246,.16), rgba(255,255,255,.96));
  color:#1d4ed8;
  border-color:rgba(59,130,246,.24);
}
.mini-badge.info::before{background:#3b82f6}
.table-badge-stack{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.expense-chart{
  display:grid;
  gap:14px;
}
.expense-bar-card{
  padding:16px 18px;
  border-radius:18px;
  background:var(--soft);
  border:1px solid var(--line);
}
.expense-bar-head{
  display:flex;
  justify-content:space-between;
  gap:12px;
  margin-bottom:10px;
}
.expense-bar-head span{
  color:var(--muted);
  font-size:13px;
}
.expense-bar-track{
  height:12px;
  border-radius:999px;
  overflow:hidden;
  background:rgba(148,163,184,.12);
}
.expense-bar-fill{
  display:block;
  height:100%;
  border-radius:999px;
  min-width:0;
  transition:width .35s ease;
}
.expense-bar-fill.servis{background:linear-gradient(90deg, #10b981, #6ee7b7)}
.expense-bar-fill.reklama{background:linear-gradient(90deg, #3b82f6, #7dd3fc)}
.expense-bar-fill.safar{background:linear-gradient(90deg, #f59e0b, #fde68a)}
.expense-bar-fill.boshqa{background:linear-gradient(90deg, #94a3b8, #cbd5e1)}
.travel-timeline{
  display:grid;
  gap:14px;
}
.timeline-item{
  display:grid;
  grid-template-columns:28px 1fr;
  gap:14px;
  padding:16px 18px;
  border-radius:20px;
  border:1px solid var(--line);
  background:linear-gradient(135deg, rgba(255,255,255,.96), rgba(248,250,252,.92));
  text-align:left;
  cursor:pointer;
  transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.timeline-item:hover{
  transform:translateY(-2px);
  box-shadow:0 18px 32px rgba(15,23,42,.06);
  border-color:rgba(59,130,246,.22);
}
.timeline-dot-wrap{
  position:relative;
  display:flex;
  justify-content:center;
}
.timeline-dot-wrap::after{
  content:"";
  position:absolute;
  top:18px;
  bottom:-18px;
  width:2px;
  background:linear-gradient(180deg, rgba(148,163,184,.34), transparent);
}
.timeline-item:last-child .timeline-dot-wrap::after{display:none}
.timeline-dot{
  width:14px;
  height:14px;
  border-radius:999px;
  margin-top:6px;
  box-shadow:0 0 0 6px rgba(255,255,255,.9);
}
.timeline-dot.todo{background:#94a3b8}
.timeline-dot.warning{background:#f59e0b}
.timeline-dot.doing{background:#3b82f6}
.timeline-dot.done{background:#10b981}
.timeline-content{
  display:grid;
  gap:8px;
}
.timeline-top,.timeline-meta{
  display:flex;
  justify-content:space-between;
  gap:12px;
  align-items:center;
  flex-wrap:wrap;
}
.timeline-top span{
  color:var(--muted);
  font-size:13px;
}
.timeline-content p{
  margin:0;
  color:var(--muted);
  font-size:14px;
  line-height:1.5;
}

.icon-actions{
  display:flex;
  gap:8px;
  align-items:center;
}
.icon-btn{
  border:1px solid var(--line);
  background:var(--soft);
  color:var(--text);
  width:34px;
  height:34px;
  border-radius:10px;
  display:grid;
  place-items:center;
  cursor:pointer;
}
.icon-btn.danger{
  color:var(--danger);
}

.modal-wrap{
  position:fixed;
  inset:0;
  z-index:10000;
}
.modal-backdrop{
  position:absolute;
  inset:0;
  background:rgba(0,0,0,.35);
}
.modal-card{
  position:relative;
  z-index:2;
  width:min(720px, calc(100vw - 32px));
  margin:48px auto;
  background:var(--panel);
  border:1px solid var(--line);
  border-radius:24px;
  padding:20px;
}
.modal-card.wide{
  width:min(980px, calc(100vw - 32px));
}
.modal-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-bottom:16px;
}
.modal-head h3{
  margin:0;
  font-size:24px;
}
.modal-body{
  max-height:75vh;
  overflow:auto;
}
.detail-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;
}
.media-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:14px;
}
.media-card{
  border:1px solid var(--line);
  border-radius:18px;
  overflow:hidden;
  background:var(--soft);
}
.media-preview{
  height:180px;
  background:var(--panel);
  display:grid;
  place-items:center;
  overflow:hidden;
}
.media-preview img{
  width:100%;
  height:100%;
  object-fit:cover;
}
.media-fallback{
  font-size:13px;
  color:var(--muted);
  padding:10px;
  text-align:center;
}
.media-info{
  padding:12px;
}
.media-name{
  font-weight:800;
  word-break:break-word;
}
.media-meta{
  font-size:12px;
  color:var(--muted);
  margin-top:6px;
}
.media-actions{
  padding:12px;
  display:flex;
  justify-content:space-between;
  gap:8px;
  align-items:center;
}
.media-modal{
  display:grid;
  gap:16px;
}
.media-modal-image{
  max-height:420px;
  width:100%;
  object-fit:contain;
  background:var(--soft);
  border-radius:16px;
}
.avatar-preview-box{
  display:flex;
  align-items:center;
}
.avatar-preview,
.profile-avatar,
.table-avatar{
  width:52px;
  height:52px;
  border-radius:50%;
  object-fit:cover;
  border:1px solid var(--line);
}
.table-avatar.empty{
  display:grid;
  place-items:center;
  background:var(--soft);
}
.avatar-empty{
  width:52px;
  height:52px;
  border-radius:50%;
  display:grid;
  place-items:center;
  background:var(--soft);
  border:1px solid var(--line);
  color:var(--muted);
}
.profile-avatar-line{
  display:flex;
  align-items:center;
}
.profile-avatar{
  width:72px;
  height:72px;
}
.count-badge{
  min-width:22px;
  height:22px;
  border-radius:999px;
  padding:0 6px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  background:var(--blue);
  color:#fff;
  font-size:12px;
  font-weight:800;
}
.chat-page{padding-bottom:24px}
.chat-layout{
  display:grid;
  grid-template-columns:320px 1fr;
  gap:16px;
}
.chat-threads{
  display:grid;
  gap:10px;
  align-content:start;
}
.chat-empty-state{
  display:grid;
  gap:12px;
}
.chat-empty-copy{
  color:var(--muted);
  font-size:13px;
  padding:0 4px;
}
.chat-contact-list{
  display:grid;
  gap:10px;
}
.chat-contact-chip{
  width:100%;
  border:1px solid var(--line);
  background:linear-gradient(180deg, rgba(255,255,255,.94), rgba(241,247,255,.8));
  color:var(--text);
  border-radius:16px;
  padding:10px 12px;
  display:flex;
  align-items:center;
  gap:10px;
  cursor:pointer;
  transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.chat-contact-chip:hover{
  transform:translateY(-1px);
  border-color:rgba(22,144,245,.26);
  box-shadow:0 12px 24px rgba(29,78,216,.08);
}
.chat-contact-avatar{
  width:34px;
  height:34px;
  display:grid;
  place-items:center;
}
.thread-card{
  width:100%;
  border:1px solid var(--line);
  background:var(--soft);
  color:var(--text);
  border-radius:16px;
  padding:12px;
  display:grid;
  grid-template-columns:auto 1fr auto;
  gap:12px;
  align-items:center;
  cursor:pointer;
}
.thread-card.active{
  border-color:rgba(22,144,245,.45);
  box-shadow:0 0 0 2px rgba(22,144,245,.10);
}
.thread-copy{min-width:0}
.thread-name{font-weight:800}
.thread-preview{
  margin-top:4px;
  font-size:13px;
  color:var(--muted);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.chat-window{
  border:1px solid var(--line);
  border-radius:18px;
  background:var(--soft);
  display:grid;
  grid-template-rows:auto 1fr auto;
  min-height:520px;
}
.chat-header{
  padding:14px 16px;
  border-bottom:1px solid var(--line);
  display:flex;
  justify-content:space-between;
  gap:10px;
  color:var(--muted);
}
.chat-messages{
  padding:16px;
  overflow:auto;
  display:grid;
  gap:10px;
  align-content:start;
}
.chat-bubble{
  max-width:min(520px, 100%);
  padding:12px 14px;
  border-radius:16px 16px 16px 4px;
  background:var(--panel);
  border:1px solid var(--line);
}
.chat-bubble.mine{
  margin-left:auto;
  border-radius:16px 16px 4px 16px;
  background:rgba(22,144,245,.10);
}
.chat-bubble span{
  display:block;
  margin-top:6px;
  color:var(--muted);
  font-size:12px;
}
.chat-form{
  border-top:1px solid var(--line);
  padding:14px;
  display:flex;
  gap:10px;
}
.chat-form input{
  flex:1;
  background:var(--panel);
  border:1px solid var(--line);
  color:var(--text);
  border-radius:14px;
  padding:12px 14px;
}
.chat-hint{
  color:var(--muted);
  font-size:12px;
}
.saved-views{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  margin:0 0 14px;
}
.saved-view-pill{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:6px 10px;
  border:1px solid var(--line);
  border-radius:999px;
  background:var(--panel);
}
.saved-view-remove{
  border:none;
  background:transparent;
  color:var(--muted);
  cursor:pointer;
  display:grid;
  place-items:center;
}
.workflow-strip{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:12px;
}
.workflow-step{
  border:1px solid var(--line);
  border-radius:18px;
  padding:14px;
  background:var(--panel);
  display:grid;
  gap:10px;
}
.workflow-step strong{
  font-size:26px;
  font-weight:900;
}
.workflow-step.todo{background:rgba(148,163,184,.08)}
.workflow-step.warning{background:rgba(245,158,11,.10)}
.workflow-step.doing{background:rgba(59,130,246,.10)}
.workflow-step.done{background:rgba(16,185,129,.10)}
.line-dot.spend{
  background:linear-gradient(180deg,#fb7185,#f97316);
  box-shadow:0 0 0 6px rgba(249,115,22,.14);
}
.bar-track.branch i{
  background:linear-gradient(90deg,#22c55e,#14b8a6);
}
.audit-timeline{
  display:grid;
  gap:14px;
  margin-bottom:18px;
}
.audit-item{
  display:grid;
  grid-template-columns:16px 1fr;
  gap:12px;
  align-items:start;
}
.audit-dot{
  width:12px;
  height:12px;
  border-radius:999px;
  margin-top:18px;
  box-shadow:0 0 0 6px rgba(148,163,184,.12);
}
.audit-dot-create{background:#10b981;box-shadow:0 0 0 6px rgba(16,185,129,.12)}
.audit-dot-update{background:#3b82f6;box-shadow:0 0 0 6px rgba(59,130,246,.12)}
.audit-dot-delete{background:#ef4444;box-shadow:0 0 0 6px rgba(239,68,68,.12)}
.audit-dot-login{background:#8b5cf6;box-shadow:0 0 0 6px rgba(139,92,246,.12)}
.audit-card{
  border:1px solid var(--line);
  border-radius:18px;
  padding:14px;
  background:var(--panel);
}
.audit-top,.audit-meta{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
  justify-content:space-between;
}
.audit-meta{
  margin-top:8px;
  color:var(--muted);
  font-size:13px;
  justify-content:flex-start;
}
.presence-dot{
  position:absolute;
  right:-2px;
  bottom:-2px;
  width:12px;
  height:12px;
  border-radius:999px;
  border:2px solid var(--panel);
}
.presence-dot.online,.presence-pill.online{background:#10b981;color:#065f46}
.presence-dot.offline,.presence-pill.offline{background:#cbd5e1;color:#475569}
.presence-pill{
  padding:4px 8px;
  border-radius:999px;
  font-size:11px;
  font-weight:800;
  text-transform:uppercase;
}
.thread-avatar{
  position:relative;
  width:42px;
  height:42px;
}
.thread-avatar .table-avatar{
  width:42px;
  height:42px;
}
@media (max-width: 1100px){
  .login-page,.app-shell,.stats-grid,.two-grid,.form-grid{grid-template-columns:1fr}
  .main-area{padding:14px}
  .topbar h1{font-size:28px}
  .hero-banner h1{font-size:34px}
  .login-copy h1{font-size:46px}
  .login-copy h2{font-size:24px}
  .login-logo-lockup{margin-top:18px}
  .login-logo-image{width:64px;height:64px}
  .login-feature-row{grid-template-columns:1fr}
  .permission-grid{grid-template-columns:1fr}
  .media-grid{grid-template-columns:1fr}
  .detail-grid{grid-template-columns:1fr}
  .chat-layout{grid-template-columns:1fr}
  .workflow-strip{grid-template-columns:1fr 1fr}
}
@keyframes login-fade-up{
  from{opacity:0;transform:translateY(18px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes login-card-in{
  from{opacity:0;transform:translateY(24px) scale(.97)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
@keyframes login-float{
  0%,100%{transform:translateY(0) translateX(0)}
  50%{transform:translateY(-14px) translateX(8px)}
}
@keyframes particle-rise{
  0%{transform:translate3d(0,0,0) scale(.7);opacity:0}
  10%{opacity:.45}
  50%{opacity:.8}
  100%{transform:translate3d(20px,-110vh,0) scale(1.15);opacity:0}
}
@keyframes pulse-glow{
  0%,100%{transform:scale(.92);opacity:.82}
  50%{transform:scale(1.06);opacity:1}
}
@keyframes loading-progress{
  0%{transform:translateX(-115%)}
  100%{transform:translateX(340%)}
}
@keyframes login-shine{
  0%{transform:translateX(0) translateY(0)}
  50%{transform:translateX(180%) translateY(26%)}
  100%{transform:translateX(360%) translateY(0)}
}
@keyframes login-spin{
  from{transform:rotate(0deg)}
  to{transform:rotate(360deg)}
}
@keyframes button-shimmer{
  0%{transform:translateX(-130%)}
  55%,100%{transform:translateX(130%)}
}
@keyframes panel-in{
  from{opacity:0;transform:translateY(10px)}
  to{opacity:1;transform:translateY(0)}
}
.kanban-board{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:16px;
}
.kanban-column{
  border:1px solid var(--line);
  border-radius:20px;
  background:linear-gradient(180deg, rgba(255,255,255,.92), rgba(248,250,252,.98));
  padding:14px;
  min-height:280px;
}
.kanban-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  margin-bottom:12px;
}
.kanban-cards{
  display:grid;
  gap:12px;
}
.kanban-card{
  border:1px solid var(--line);
  border-radius:16px;
  background:var(--panel);
  padding:12px;
  box-shadow:0 10px 22px rgba(15,23,42,.05);
  display:grid;
  gap:6px;
  cursor:grab;
}
.kanban-empty{
  border:1px dashed var(--line);
  border-radius:14px;
  padding:18px;
  text-align:center;
  color:var(--muted);
}
.ai-output{
  margin-top:16px;
  border:1px solid var(--line);
  background:var(--soft);
  border-radius:18px;
  padding:18px;
  white-space:pre-wrap;
  line-height:1.6;
}
.chart-shell{
  width:100%;
  height:280px;
}
.backup-preview-card{
  margin-top:18px;
  border:1px solid var(--line);
  background:var(--soft);
  border-radius:18px;
  padding:18px;
  display:grid;
  gap:14px;
}
.attachment-preview-image,
.attachment-preview-video,
.attachment-preview-pdf{
  width:100%;
  border-radius:12px;
  border:1px solid var(--line);
  background:#fff;
  min-height:120px;
  object-fit:cover;
}
.attachment-preview-video{max-height:180px}
.attachment-preview-pdf{height:180px}
.attachment-preview-generic{
  border:1px dashed var(--line);
  border-radius:12px;
  min-height:90px;
  display:grid;
  place-items:center;
  color:var(--muted);
  font-weight:700;
}
.install-pill{
  background:linear-gradient(135deg,#1690F5,#6dd5fa);
  color:#fff;
  border-color:transparent;
  box-shadow:0 12px 28px rgba(22,144,245,.22);
}
.calendar-cell.droppable{
  transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.calendar-cell.droppable:hover{
  border-color:rgba(22,144,245,.4);
  box-shadow:0 10px 24px rgba(22,144,245,.12);
  transform:translateY(-1px);
}
.calendar-items > div[draggable="true"]{
  cursor:grab;
}
.heatmap-grid{
  display:grid;
  gap:12px;
}
.heatmap-item{
  border:1px solid var(--line);
  border-radius:16px;
  background:var(--panel);
  padding:12px 14px;
  display:grid;
  gap:8px;
}
.heatmap-track{
  height:12px;
  border-radius:999px;
  background:rgba(148,163,184,.18);
  overflow:hidden;
}
.heatmap-track span{
  display:block;
  height:100%;
  border-radius:999px;
  background:linear-gradient(90deg,#1690F5,#6dd5fa);
  box-shadow:0 8px 18px rgba(22,144,245,.25);
}
.voice-task-card{
  border:1px dashed var(--line);
  border-radius:16px;
  padding:14px;
  background:var(--soft);
  display:grid;
  gap:10px;
}
.voice-task-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.voice-task-hint{
  color:var(--muted);
  font-size:13px;
}
.mood-picker{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.mood-pill{
  min-width:52px;
  height:52px;
  border-radius:16px;
  border:1px solid var(--line);
  background:#fff;
  font-weight:800;
}
.mood-pill.active{
  background:linear-gradient(135deg,#1690F5,#6dd5fa);
  color:#fff;
  border-color:transparent;
  box-shadow:0 12px 24px rgba(22,144,245,.22);
}
.mood-badge{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-width:56px;
  padding:6px 12px;
  border-radius:999px;
  font-weight:800;
}
.mood-1,.mood-2{background:rgba(239,68,68,.12);color:#b91c1c}
.mood-3{background:rgba(245,158,11,.16);color:#b45309}
.mood-4,.mood-5{background:rgba(16,185,129,.14);color:#047857}
@media (max-width: 1100px){
  .kanban-board{grid-template-columns:1fr 1fr}
}
@media (max-width: 760px){
  .kanban-board{grid-template-columns:1fr}
  .sidebar{
    width:100%;
    position:sticky;
    top:0;
    z-index:30;
    padding-bottom:12px;
  }
  .menu-list{
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    gap:10px;
  }
  .topbar{
    flex-direction:column;
    align-items:flex-start;
    gap:14px;
  }
  .topbar-right{
    width:100%;
    flex-wrap:wrap;
  }
  .global-search{
    width:100%;
  }
}
`;

export default App;
