import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeDollarSign,
  Bot,
  BarChart3,
  Bell,
  ChevronDown,
  ChevronRight,
  CircleUserRound,
  Clapperboard,
  Clock3,
  Copy,
  ContactRound,
  Eye,
  FileBarChart2,
  Gift,
  HeartPulse,
  Image,
  Landmark,
  LayoutDashboard,
  LayoutGrid,
  Link2,
  ListTodo,
  LogOut,
  MessageCircle,
  Megaphone,
  Mic,
  Menu,
  PlaneTakeoff,
  Repeat2,
  Pencil,
  PhoneCall,
  ReceiptText,
  Filter,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  SmilePlus,
  Trash2,
  Upload,
  Users as UsersIcon,
  ShieldCheck,
  Target,
  ClipboardList,
  X
} from "lucide-react";
import { io } from "socket.io-client";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, API_BASE, clearAuth, getAuthToken, getCurrentUser, SOCKET_BASE } from "./api";
import { applySeo } from "./seo";
import ContestExpensesPanel from "./ContestExpensesPanel";
import DailyReportImageImportPanel from "./DailyReportImageImportPanel";
import TravelExpensesPanel from "./TravelExpensesPanel";

const MENU = [
  { id: "dashboard", title: "Bosh sahifa", icon: LayoutDashboard, tone: "indigo" },
  { id: "content", title: "Kontent reja", icon: Clapperboard, tone: "cyan" },
  { id: "bonus", title: "Bonus tizimi", icon: BadgeDollarSign, tone: "emerald" },
  { id: "expenses", title: "Harajatlar", icon: ReceiptText, tone: "amber" },
  { id: "finance", title: "Finance dashboard", icon: Landmark, tone: "blue" },
  { id: "travelPlans", title: "Safar rejasi", icon: PlaneTakeoff, tone: "violet" },
  { id: "analytics", title: "Analytics", icon: BarChart3, tone: "sky" },
  { id: "moodPulse", title: "Mood pulse", icon: HeartPulse, tone: "pink" },
  { id: "employeeKpi", title: "Employee KPI", icon: UsersIcon, tone: "teal" },
  { id: "recurring", title: "Recurring", icon: Repeat2, tone: "orange" },
  { id: "dailyReports", title: "Kunlik filial hisobotlari", icon: ClipboardList, tone: "slate" },
  { id: "campaigns", title: "Reklama kampaniyalari", icon: Target, tone: "fuchsia" },
  { id: "uploads", title: "Media kutubxona", icon: Image, tone: "purple" },
  { id: "users", title: "Hodimlar", icon: ContactRound, tone: "blue" },
  { id: "tasks", title: "Vazifalar", icon: ListTodo, tone: "green" },
  { id: "audit", title: "Audit log", icon: ShieldCheck, tone: "red" },
  { id: "profile", title: "Profil", icon: CircleUserRound, tone: "cyan" },
  { id: "settings", title: "Sozlamalar", icon: SlidersHorizontal, tone: "slate" },
  { id: "aiAssistant", title: "AI yordamchi", icon: Sparkles, tone: "violet" }
];

const MENU_GROUPS = [
  { id: "core", title: "Asosiy", items: ["dashboard", "content", "bonus", "tasks"] },
  { id: "operations", title: "Jarayonlar", items: ["travelPlans", "campaigns", "expenses", "finance", "dailyReports", "recurring"] },
  { id: "insights", title: "Tahlil va KPI", items: ["analytics", "moodPulse", "employeeKpi", "uploads"] },
  { id: "system", title: "Boshqaruv", items: ["users", "audit", "profile", "settings", "aiAssistant"] }
];

const ROUTES_BY_PAGE = {
  login: "/login",
  campaignLeadForm: "/reklama-forma",
  dashboard: "/menu",
  content: "/kontent",
  bonus: "/bonus",
  expenses: "/harajatlar",
  finance: "/finance",
  travelPlans: "/safar",
  analytics: "/analytics",
  moodPulse: "/mood-pulse",
  employeeKpi: "/xodim-kpi",
  recurring: "/recurring",
  dailyReports: "/kunlik-hisobotlar",
  campaigns: "/reklama",
  uploads: "/media",
  users: "/hodimlar",
  tasks: "/vazifalar",
  audit: "/audit",
  profile: "/profil",
  settings: "/sozlamalar",
  aiAssistant: "/ai-yordamchi"
};

const PAGE_BY_ROUTE = {
  "/": "dashboard",
  "/login": "login",
  "/reklama-forma": "campaignLeadForm",
  "/menu": "dashboard",
  "/dashboard": "dashboard",
  "/kontent": "content",
  "/bonus": "bonus",
  "/harajatlar": "expenses",
  "/finance": "finance",
  "/safar": "travelPlans",
  "/analytics": "analytics",
  "/mood-pulse": "moodPulse",
  "/xodim-kpi": "employeeKpi",
  "/recurring": "recurring",
  "/kunlik-hisobotlar": "dailyReports",
  "/reklama": "campaigns",
  "/media": "uploads",
  "/hodimlar": "users",
  "/vazifalar": "tasks",
  "/audit": "audit",
  "/profil": "profile",
  "/sozlamalar": "settings",
  "/ai-yordamchi": "aiAssistant"
};

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
  { id: "expenses_edit", label: "Harajat tahrirlash" },
  { id: "expenses_delete", label: "Harajat o'chirish" },
  { id: "travelPlans", label: "Safar rejasi" },
  { id: "analytics", label: "Analytics" },
  { id: "moodPulse", label: "Mood pulse" },
  { id: "employeeKpi", label: "Employee KPI" },
  { id: "recurring", label: "Recurring" },
  { id: "travelPlans_create", label: "Safar reja qo'shish" },
  { id: "travelPlans_edit", label: "Safar reja tahrirlash" },
  { id: "travelPlans_delete", label: "Safar reja o'chirish" },
  { id: "dailyReports", label: "Kunlik filial hisobotlari" },
  { id: "dailyReports_edit", label: "Hisobot tahrirlash" },
  { id: "dailyReports_delete", label: "Hisobot o'chirish" },
  { id: "campaigns", label: "Reklama kampaniyalari" },
  { id: "campaigns_edit", label: "Kampaniya tahrirlash" },
  { id: "campaigns_delete", label: "Kampaniya o'chirish" },
  { id: "uploads", label: "Media kutubxona" },
  { id: "uploads_create", label: "Fayl yuklash" },
  { id: "uploads_delete", label: "Fayl o'chirish" },
  { id: "users", label: "Hodimlar" },
  { id: "users_edit", label: "Hodim tahrirlash" },
  { id: "users_delete", label: "Hodim o'chirish" },
  { id: "tasks", label: "Vazifalar" },
  { id: "tasks_edit", label: "Vazifa tahrirlash" },
  { id: "tasks_delete", label: "Vazifa o'chirish" },
  { id: "audit", label: "Audit log" },
  { id: "profile", label: "Profil" },
  { id: "settings", label: "Sozlamalar" }
  ,
  { id: "aiAssistant", label: "AI yordamchi" }
];

const DIRECTOR_PERMISSION_PRESET = PERMISSION_OPTIONS.map((item) => item.id);

const UZBEKISTAN_REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Samarqand",
  "Buxoro",
  "Andijon",
  "Farg'ona",
  "Namangan",
  "Qashqadaryo",
  "Surxondaryo",
  "Jizzax",
  "Sirdaryo",
  "Navoiy",
  "Xorazm",
  "Qoraqalpog'iston"
];

function isLeadershipRole(role) {
  return ["admin", "manager", "director"].includes(role);
}

function getRolePreset(role) {
  if (role === "director") {
    return {
      department_role: "Rahbar",
      permissions_json: DIRECTOR_PERMISSION_PRESET
    };
  }

  return null;
}

function formatRoleLabel(role) {
  if (role === "director") return "rahbar";
  return role || "-";
}

function normalizePathname(pathname = "/") {
  const normalized = String(pathname || "/").trim();
  if (!normalized || normalized === "/") return "/";
  return normalized.replace(/\/+$/, "") || "/";
}

function getPageFromPath(pathname = "/") {
  return PAGE_BY_ROUTE[normalizePathname(pathname)] || "dashboard";
}

function getPathForPage(pageId = "dashboard") {
  return ROUTES_BY_PAGE[pageId] || ROUTES_BY_PAGE.dashboard;
}

function getPublicOrigin() {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return import.meta.env.VITE_SITE_URL || "";
}

function getCampaignLeadFormUrl(campaignId) {
  const params = new URLSearchParams({ campaign: String(campaignId || "") });
  const origin = getPublicOrigin();
  const path = `${ROUTES_BY_PAGE.campaignLeadForm}?${params.toString()}`;
  return origin ? `${origin}${path}` : path;
}

function isAppleMobileDevice() {
  if (typeof window === "undefined") return false;
  const ua = String(window.navigator.userAgent || "").toLowerCase();
  return /iphone|ipad|ipod/.test(ua);
}

function isStandaloneMode() {
  if (typeof window === "undefined") return false;
  return window.navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
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
  return `${Number(value || 0).toLocaleString()} UZS`;
}

function formatUsd(value) {
  return `$${Number(value || 0).toLocaleString()}`;
}

function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDateTimeInput(value) {
  if (!value) return "";
  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(raw)) return raw.replace(" ", "T").slice(0, 16);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw}T00:00`;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const BOOT_SCREEN_MAX_WAIT_MS = 5000;

function normalizeExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return raw;
}

function openExternalUrl(value) {
  const url = normalizeExternalUrl(value);
  if (!url || typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function getDateSortValue(value, fallback = Number.POSITIVE_INFINITY) {
  if (!value) return fallback;
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? fallback : time;
}

function sortRowsByDate(rows = [], dateKey = "publish_date", direction = "asc") {
  const fallback = direction === "desc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  return [...(rows || [])].sort((a, b) => {
    const aTime = getDateSortValue(a?.[dateKey], fallback);
    const bTime = getDateSortValue(b?.[dateKey], fallback);
    if (aTime === bTime) return Number(a?.id || 0) - Number(b?.id || 0);
    return direction === "desc" ? bTime - aTime : aTime - bTime;
  });
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
      onToast?.("Izoh qo'shildi", "success");
    } catch (err) {
      onToast?.(err.message || "Izohni saqlab bo'lmadi", "error");
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
      onToast?.("Fayl biriktirildi", "success");
    } catch (err) {
      onToast?.(err.message || "Fayl yuklab bo'lmadi", "error");
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
          )) : <div className="empty-block">Hozircha izoh yo'q</div>}
        </div>
        <form className="discussion-form" onSubmit={submitComment}>
          <input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ichki izoh yozing..." />
          <button type="submit" className="btn secondary" disabled={saving}>Izoh qo'shish</button>
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
          )) : <div className="empty-block">Hozircha fayl yo'q</div>}
        </div>
        <div className="discussion-upload">
          <label className="file-picker">
            <Upload size={16} />
            <span>{file ? file.name : "Fayl tanlash"}</span>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </label>
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

function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(onClose, toast.variant === "toast" ? 2800 : 2200);
    return () => clearTimeout(timer);
  }, [toast, onClose]);

  if (!toast) return null;

  if (toast.variant === "center-success") {
    return (
      <div className="success-overlay" aria-live="polite" aria-atomic="true">
        <div className="success-wrapper">
          <div className="icon-wrap">
            <svg className="success-svg" viewBox="0 0 100 100" width="120" height="120" aria-hidden="true">
              <circle className="success-circle" cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
              <polyline className="success-check" points="35 50 45 60 65 40" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h2>MUVAFFAQIYATLI</h2>
          <p>{toast.message || "Ma'lumotlar muvaffaqiyatli saqlandi."}</p>
        </div>
      </div>
    );
  }

  if (toast.variant === "center-delete") {
    return (
      <div className="success-overlay delete-overlay" aria-live="polite" aria-atomic="true">
        <div className="delete-wrapper">
          <div className="delete-icon-wrap" aria-hidden="true">
            <svg viewBox="0 0 100 100" fill="none" width="100" height="100">
              <rect x="30" y="30" width="40" height="45" rx="8" stroke="#ef4444" strokeWidth="4" />
              <rect x="25" y="20" width="50" height="6" rx="3" fill="#ef4444" />
              <line className="delete-line delete-line-one" x1="40" y1="40" x2="40" y2="65" stroke="#ef4444" strokeWidth="4" />
              <line className="delete-line delete-line-two" x1="50" y1="40" x2="50" y2="65" stroke="#ef4444" strokeWidth="4" />
              <line className="delete-line delete-line-three" x1="60" y1="40" x2="60" y2="65" stroke="#ef4444" strokeWidth="4" />
            </svg>
          </div>
          <h2>O‘CHIRILDI</h2>
          <p>{toast.message || "Ma'lumot o‘chirildi."}</p>
        </div>
      </div>
    );
  }

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

function ThemeToggle() {
  return null;
}

function NotificationsDrawer({ open, onClose, notifications = [], onRead, onReadAll }) {
  return (
    <div className={`drawer ${open ? "open" : ""}`}>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className="drawer-panel">
        <div className="drawer-head">
          <div>
            <div className="small-label">Bildirishnomalar</div>
            <h3>So'nggi yangiliklar</h3>
          </div>
          <button type="button" className="btn secondary" onClick={onReadAll}>
            Hammasini o'qildi
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
                      O'qildi
                    </button>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-block">Hozircha bildirishnoma yo'q</div>
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

function AnimatedNumber({ value = 0, format = (next) => String(Math.round(next)), duration = 900 }) {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValueRef = useRef(0);

  useEffect(() => {
    const target = Number(value || 0);
    if (Number.isNaN(target)) {
      setDisplayValue(0);
      previousValueRef.current = 0;
      return undefined;
    }

    const startValue = previousValueRef.current;
    let frameId = null;
    const startAt = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - startAt) / duration, 1);
      const eased = 1 - ((1 - progress) ** 3);
      const nextValue = startValue + ((target - startValue) * eased);
      setDisplayValue(nextValue);
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousValueRef.current = target;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      previousValueRef.current = target;
    };
  }, [duration, value]);

  return format(displayValue);
}

function DashboardMetricCard({ title, numericValue = 0, format, hint, tone = "default", spark = [], badge = null }) {
  const sparkValues = spark.length ? spark : [12, 18, 14, 20, 16, 22];
  const maxSpark = Math.max(...sparkValues, 1);

  return (
    <div className={`dashboard-metric-card dashboard-metric-${tone}`}>
      <div className="dashboard-metric-head">
        <span className="dashboard-metric-label">{title}</span>
        {badge ? <span className="dashboard-chip small">{badge}</span> : <span className={`dashboard-metric-dot dashboard-metric-dot-${tone}`} />}
      </div>
      <div className="dashboard-metric-main">
        <AnimatedNumber value={numericValue} format={format} />
      </div>
      <div className="dashboard-metric-spark" aria-hidden="true">
        {sparkValues.map((point, index) => (
          <span
            key={`${title}-${index}`}
            style={{ height: `${Math.max(18, Math.round((point / maxSpark) * 100))}%` }}
          />
        ))}
      </div>
      <div className="dashboard-metric-hint">{hint}</div>
    </div>
  );
}

function DashboardDisclosure({ title, desc, badge, defaultOpen = true, children, right = null }) {
  return (
    <details className="dashboard-fold" open={defaultOpen}>
      <summary>
        <div className="dashboard-fold-summary-copy">
          <strong>{title}</strong>
          {desc ? <span>{desc}</span> : null}
        </div>
        <div className="dashboard-fold-summary-meta">
          {badge ? <span className="dashboard-chip small">{badge}</span> : null}
          {right}
          <ChevronDown size={18} className="dashboard-fold-arrow" />
        </div>
      </summary>
      <div className="dashboard-fold-body">
        {children}
      </div>
    </details>
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

function expenseCategoryLabel(category) {
  if (category === "reklama") return "Reklama";
  if (category === "safar") return "Safar";
  if (category === "servis") return "Servis";
  if (category === "boshqa") return "Boshqa";
  return category || "-";
}

function paymentTypeClass(paymentType) {
  if (paymentType === "visa") return "mini-badge danger";
  if (paymentType === "bank") return "mini-badge info";
  if (paymentType === "cash") return "mini-badge warning";
  return "mini-badge default";
}

function paymentTypeLabel(paymentType) {
  if (paymentType === "visa") return "Visa karta";
  if (paymentType === "bank") return "Bank";
  if (paymentType === "cash") return "Naqd";
  return paymentType || "-";
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

function canAccessPage(user, pageKey) {
  if (user?.role === "admin") return true;
  return hasPermission(user, pageKey);
}

function canDoAction(user, pageKey, action) {
  if (user?.role === "admin") return true;
  return hasPermission(user, `${pageKey}_${action}`);
}

function canManagePage(user, pageKey, action) {
  return action ? canDoAction(user, pageKey, action) : canAccessPage(user, pageKey);
}

function rowMatchesSearch(fields = [], search = "") {
  const query = String(search || "").trim().toLowerCase();
  if (!query) return true;
  return fields.some((field) => String(field || "").toLowerCase().includes(query));
}

const CONTENT_TYPE_OPTIONS = [
  { value: "post", label: "Post" },
  { value: "story", label: "Story" },
  { value: "reels", label: "Reels" },
  { value: "video", label: "Video" },
  { value: "mobi-video", label: "Mobi-video" },
  { value: "banner", label: "Banner" },
  { value: "flayer", label: "Flayer" },
  { value: "dokon-dizayni", label: "Do'kon dizayni" },
  { value: "boshqa-ishlar", label: "Boshqa ishlar" },
  { value: "aloo-uz-sayti", label: "aloo.uz sayti" },
  { value: "boshqalar", label: "Boshqalar" }
];

const CAMPAIGN_PLATFORM_OPTIONS = [
  { value: "Meta Ads", label: "Meta Ads" },
  { value: "Instagram", label: "Instagram" },
  { value: "Telegram", label: "Telegram" },
  { value: "TikTok", label: "TikTok" },
  { value: "Facebook", label: "Facebook" },
  { value: "YouTube", label: "YouTube" },
  { value: "Google Ads", label: "Google Ads" }
];

const RUBRIC_OPTIONS = [
  { value: "rubrika-yoq", label: "Rubrika yo'q" },
  { value: "sotuv", label: "Sotuv" },
  { value: "locatsiya", label: "Locatsiya" },
  { value: "chegirma", label: "Chegirma" },
  { value: "foydali-malumot", label: "Foydali ma'lumot" },
  { value: "aksiyalar", label: "Aksiyalar" },
  { value: "lifehack", label: "Lifehack" },
  { value: "abzor", label: "Abzor" },
  { value: "trend-video", label: "Trend video" },
  { value: "xodimlar-bilan", label: "Xodimlar bilan" },
  { value: "sovgali-oyin", label: "Sovg'ali o'yin" },
  { value: "intervyu", label: "Intervyu" },
  { value: "unboxing", label: "Unboxing" },
  { value: "sale-promo", label: "Sale & promo" }
];

const BONUS_DIFFICULTY_OPTIONS = [
  { value: "sodda", label: "Sodda - 25,000 UZS" },
  { value: "orta", label: "O'rta - 50,000 UZS" },
  { value: "murakkab", label: "Murakkab - 75,000 UZS" },
  { value: "juda_murakkab", label: "Juda murakkab - 100,000 UZS" },
  { value: "bonussiz", label: "Bonussiz - 0 UZS" }
];

function formatContentType(value) {
  const match = CONTENT_TYPE_OPTIONS.find((item) => item.value === value);
  return match?.label || value || "-";
}

function formatRubric(value) {
  const match = RUBRIC_OPTIONS.find((item) => item.value === value);
  return match?.label || value || "-";
}

function splitCellValues(value, separator = ",") {
  return String(value || "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function contentTypeChipTone(value) {
  const normalized = String(value || "").toLowerCase();
  if (["video", "mobi-video", "reels"].includes(normalized)) return "info";
  if (["banner", "flayer", "do'kon-dizayni"].includes(normalized)) return "warning";
  if (["aloo-uz-sayti", "boshqa-ishlar", "boshqalar"].includes(normalized)) return "danger";
  return "default";
}

function PlatformBadge({ platform }) {
  const normalized = String(platform || "").toLowerCase();
  const Icon = normalized.includes("telegram")
    ? Send
    : normalized.includes("reels") || normalized.includes("story")
      ? Clapperboard
      : normalized.includes("instagram")
        ? Image
        : MessageCircle;

  return (
    <span className={`table-chip platform platform-${normalized.replace(/[^a-z0-9]+/g, "-") || "default"}`}>
      <Icon size={13} />
      {platform}
    </span>
  );
}

function rubricChipTone(value) {
  const normalized = String(value || "").toLowerCase();
  if (["sotuv", "sale-promo", "aksiyalar", "chegirma"].includes(normalized)) return "success";
  if (["trend-video", "lifehack", "unboxing", "intervyu"].includes(normalized)) return "info";
  if (["abzor", "locatsiya", "xodimlar-bilan"].includes(normalized)) return "warning";
  return "default";
}

function campaignStatusClass(status) {
  if (status === "done") return "status-badge done";
  if (status === "paused") return "status-badge warning";
  return "status-badge doing";
}

function formatCampaignStatus(status) {
  if (status === "done") return "Tugagan";
  if (status === "paused") return "Pauza";
  return "Faol";
}

function getCampaignDailyBudget(row) {
  return Number(row?.daily_budget ?? row?.budget ?? 0);
}

function getCampaignTotalBudget(row) {
  return Number(row?.budget || 0);
}

const LOGIN_LOGO = "/brand-logo.svg?v=20260410-aloo-wordmark";

function normalizeAlooText(value = "") {
  return String(value || "").replace(/aloo/gi, "aloo");
}

function LoginPage({ onLoggedIn, settings, showInstallGuideAction = false, onOpenInstallGuide }) {
  const [loginMode, setLoginMode] = useState("telegram");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [selectedRole, setSelectedRole] = useState("manager");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loginOptions, setLoginOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const logoSrc = LOGIN_LOGO;
  const companyLabel = normalizeAlooText(settings?.company_name || "alooSMM 3.0");
  const platformLabel = normalizeAlooText(settings?.platform_name || "Yagona boshqaruv platformasi");
  const loginModes = [
    { id: "telegram", label: "Telefon", hint: "Telegram bot kodi", icon: Bot },
    { id: "password", label: "Parol", hint: "Login yoki telefon", icon: ShieldCheck },
    { id: "pin", label: "Lavozim", hint: "4 xonali kod", icon: ContactRound }
  ];
  const pinUsers = useMemo(
    () => loginOptions.filter((item) => String(item.role || "").toLowerCase() === String(selectedRole || "").toLowerCase()),
    [loginOptions, selectedRole]
  );

  useEffect(() => {
    let ignore = false;
    api.loginOptions()
      .then((data) => {
        if (ignore) return;
        setLoginOptions(Array.isArray(data?.users) ? data.users : []);
      })
      .catch(() => {
        if (!ignore) setLoginOptions([]);
      });
    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (selectedUserId && pinUsers.some((item) => Number(item.id) === Number(selectedUserId))) return;
    setSelectedUserId(pinUsers[0]?.id ? String(pinUsers[0].id) : "");
  }, [pinUsers, selectedUserId]);

  useEffect(() => {
    setError("");
    setNotice("");
  }, [loginMode]);

  async function submit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setNotice("");
      if (loginMode === "telegram") {
        const data = await api.verifyTelegramCode({ phone, code: otpCode });
        const me = await api.me().catch(() => ({ user: data?.user }));
        onLoggedIn(me.user || data?.user);
        return;
      }

      if (loginMode === "pin") {
        const selectedUser = loginOptions.find((item) => Number(item.id) === Number(selectedUserId));
        const data = await api.pinLogin({
          user_id: selectedUserId ? Number(selectedUserId) : undefined,
          phone: selectedUser?.phone || "",
          role: selectedRole,
          pin_code: pinCode
        });
        const me = await api.me().catch(() => ({ user: data?.user }));
        onLoggedIn(me.user || data?.user);
        return;
      }

      await api.login({ phone, login: phone, password });
      const me = await api.me();
      onLoggedIn(me.user);
    } catch (err) {
      setError(err.message || "Kirishda xatolik");
    } finally {
      setLoading(false);
    }
  }

  async function sendTelegramCode() {
    try {
      setSendingCode(true);
      setError("");
      setNotice("");
      const data = await api.requestTelegramCode({ phone });
      setNotice(data?.message || "Kod yuborildi");
    } catch (err) {
      setError(err.message || "Kod yuborilmadi");
    } finally {
      setSendingCode(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-copy">
          <div className="login-logo-lockup">
            <img src={logoSrc} alt="aloo logo" className="login-logo-image" />
            <div className="login-logo-copy">
              <strong>{companyLabel}</strong>
              <span>{platformLabel}</span>
            </div>
          </div>
          <div className="brand-kicker">alooSMM 3.0</div>
          <h1>Professional<br/>SMM Boshqaruv</h1>
          <p>Kontent, bonus va jamoa jarayonlari uchun toza, tez va yengil ish muhiti.</p>
          <div className="login-public-nav">
            <a href="/platforma/">Platforma</a>
            <a href="/filiallar/">Filiallar</a>
            <a href="/boglanish/">Bog'lanish</a>
          </div>
          <div className="login-status-row compact">
            <span className="login-status-pill">Dark UI</span>
            <span className="login-status-pill">Tez kirish</span>
            <span className="login-status-pill">Jamoa nazorati</span>
          </div>
        </div>

        <form className="login-card" onSubmit={submit}>
          {loading ? (
            <div className="login-loading">
              <div className="login-loader-ring" />
              <span>Kirish tekshirilmoqda...</span>
            </div>
          ) : null}
          <div className="login-card-top">
            <div className="small-label">Kirish</div>
            <div className="login-card-badges">
              <span className="login-card-badge">secure</span>
            </div>
          </div>
          <div className="login-title">Tizimga kirish</div>
          <div className="login-subtitle">Yuqoridan kirish turini tanlang.</div>

          <div className="login-mode-switch">
            {loginModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  className={`login-mode-btn ${loginMode === mode.id ? "active" : ""}`}
                  onClick={() => setLoginMode(mode.id)}
                >
                  <Icon size={16} />
                  <span>
                    <strong>{mode.label}</strong>
                    <small>{mode.hint}</small>
                  </span>
                </button>
              );
            })}
          </div>

          {loginMode === "telegram" ? (
            <div className="login-mode-panel">
              <label>
                <span>Telefon raqam</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="99890..."
                />
              </label>
              <div className="inline-action-row">
                <label className="inline-grow">
                  <span>Bir martalik kod</span>
                  <input
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D+/g, "").slice(0, 6))}
                    placeholder="6 xonali kod"
                  />
                </label>
                <button type="button" className="btn secondary" onClick={sendTelegramCode} disabled={sendingCode || loading}>
                  {sendingCode ? "Yuborilmoqda..." : "Kod olish"}
                </button>
              </div>
              <div className="login-inline-note">Kod Telegram bot orqali bir martalik yuboriladi.</div>
            </div>
          ) : null}

          {loginMode === "password" ? (
            <div className="login-mode-panel">
              <label>
                <span>Telefon yoki login</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="99890... yoki admin"
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
            </div>
          ) : null}

          {loginMode === "pin" ? (
            <div className="login-mode-panel">
              <label>
                <span>Lavozim</span>
                <select value={selectedRole} onChange={(e) => setSelectedRole(e.target.value)}>
                  <option value="manager">manager</option>
                  <option value="director">rahbar</option>
                  <option value="editor">editor</option>
                  <option value="mobilograf">mobilograf</option>
                  <option value="viewer">viewer</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label>
                <span>Hodim</span>
                <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  {pinUsers.length ? pinUsers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.full_name} - {item.department_role || item.phone_masked}
                    </option>
                  )) : <option value="">Hodim topilmadi</option>}
                </select>
              </label>
              <label>
                <span>Shaxsiy 4 xonali kod</span>
                <input
                  value={pinCode}
                  onChange={(e) => setPinCode(e.target.value.replace(/\D+/g, "").slice(0, 4))}
                  placeholder="0000"
                />
              </label>
              <div className="login-inline-note">Lavozimni tanlang va shaxsiy 4 xonali kodingizni kiriting.</div>
            </div>
          ) : null}

          {error ? <div className="error-box">{error}</div> : null}
          {!error && notice ? <div className="info-box">{notice}</div> : null}

          <button type="submit" className="btn primary large" disabled={loading}>
            {loading ? "Kirilmoqda..." : loginMode === "telegram" ? "Kod bilan kirish" : loginMode === "pin" ? "PIN bilan kirish" : "Kirish"}
          </button>
          {showInstallGuideAction ? (
            <button type="button" className="btn ghost large install-guide-btn" onClick={onOpenInstallGuide}>
              <Upload size={16} />
              iPhonega o'rnatish
            </button>
          ) : null}
          {showInstallGuideAction ? (
            <div className="ios-install-inline-note">
              Safari ichida <strong>Ulashish</strong> tugmasini bosing va <strong>Add to Home Screen</strong> ni tanlang.
            </div>
          ) : null}
          <div className="login-card-footer">
            <span>alooSMM 3.0</span>
            <span className="login-card-pulse">live</span>
          </div>
        </form>
      </div>
    </div>
  );
}

function DashboardPage({ summary = {}, dailyReports = [], bonusItems = [], contentRows = [], campaigns = [], travelPlans = [], user = null }) {
  const currentMonth = getMonthLabel();
  const roleLabelMap = {
    admin: "Admin boshqaruv paneli",
    manager: "Manager nazorat paneli",
    director: "Rahbar nazorat paneli",
    mobilograf: "Mobilograf ish maydoni",
    editor: "Editor ish maydoni",
    viewer: "Kuzatuv paneli"
  };
  const heroTitle = roleLabelMap[user?.role] || "alooSMM 3.0 platformasi";
  const heroText =
    user?.role === "mobilograf"
      ? "Bugungi vazifalar, safar rejalari va kontent topshiriqlari bir joyda."
      : user?.role === "editor"
        ? "Tasdiqlash, montaj va kontent jarayonlarini bir ekranda kuzating."
        : "Kontent reja, bonus, filial hisobotlari va media boshqaruvi bitta joyda.";
  const todayKey = formatDate(new Date());

  const thisMonthContent = (contentRows || []).filter((row) => {
    if (!row.publish_date) return false;
    return formatDate(row.publish_date).slice(0, 7) === currentMonth;
  });

  const totalPlan = thisMonthContent.length;
  const postedCount = thisMonthContent.filter((row) => row.status === "joylangan").length;
  const progress = totalPlan ? Math.round((postedCount / totalPlan) * 100) : 0;
  const publishedToday = (contentRows || []).filter((row) => formatDate(row.publish_date) === todayKey).length;

  const thisMonthBonus = (bonusItems || [])
    .filter((row) => (row.month_label || formatDate(row.work_date).slice(0, 7)) === currentMonth)
    .reduce((sum, row) => sum + Number(row.total_amount || row.amount || 0), 0);
  const thisMonthBonusItems = (bonusItems || [])
    .filter((row) => (row.month_label || formatDate(row.work_date).slice(0, 7)) === currentMonth);
  const dashboardBonusBalances = summarizeBonusBalanceEmployees(thisMonthBonusItems, Number(summary?.bonus_rate || 25000));
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
        const startKey = formatDate(item.start_at || item.start_date).slice(0, 7);
        const endKey = formatDate(item.end_at || item.end_date).slice(0, 7);
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
    acc[key].score += Number(row.posts_count || 0) * 2 + Number(row.stories_count || 0);
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
  const activeCampaigns = (campaigns || []).filter((item) => {
    const status = String(item.status || "").toLowerCase();
    if (["done", "tugagan", "yakunlandi", "cancelled", "canceled"].includes(status)) return false;
    const endTime = getDateSortValue(item.end_at || item.end_date, Number.POSITIVE_INFINITY);
    return endTime >= Date.now();
  }).length;
  const approvalSlaBreaches = [...(contentRows || []), ...(travelPlans || [])].filter((row) => {
    const status = String(row.status || "");
    if (["tasdiqlandi", "yakunlandi", "joylangan", "published", "approved", "archived"].includes(status)) return false;
    const createdAt = new Date(row.created_at || row.plan_date || row.publish_date || Date.now());
    if (Number.isNaN(createdAt.getTime())) return false;
    return (Date.now() - createdAt.getTime()) / 3600000 >= 48;
  }).length;
  const operationSignals = [
    ...smartAlerts.map((item, index) => ({
      id: `alert-${index}`,
      tone: item.type === "danger" ? "danger" : "warning",
      title: item.type === "danger" ? "Diqqat" : "Signal",
      text: item.text
    })),
    ...reminders.slice(0, 4).map((item) => ({
      id: `reminder-${item.id}`,
      tone: formatDate(item.due_date) < todayKey ? "danger" : "info",
      title: item.title,
      text: `${formatDate(item.due_date)} • ${taskStatusLabel(item.status)}`
    }))
  ].slice(0, 6);
  const overallPulse = Math.max(
    12,
    Math.min(
      100,
      Math.round(
        (
          progress +
          Number(summary?.daily_task_progress || 0) +
          Math.max(0, 100 - (approvalSlaBreaches * 5))
        ) / 3
      )
    )
  );
  const topBranch = branchKpis[0] || null;
  const heroChips = [
    `${summary?.monthly_content_count || totalPlan} ta kontent`,
    `${activeCampaigns} ta faol target`,
    `${summary?.task_count || 0} ta vazifa`,
    topBranch ? `${topBranch.name} top filial` : "Filial KPI tayyorlanmoqda"
  ];
  const primaryMetrics = [
    {
      title: "Kontent bajarilishi",
      numericValue: progress,
      format: (next) => `${Math.round(next)}%`,
      hint: `${postedCount} / ${totalPlan} joylangan`,
      tone: progress >= 70 ? "success" : progress >= 40 ? "warning" : "danger",
      spark: contentSeries.map((item) => item.value)
    },
    {
      title: "Joriy oy bonusi",
      numericValue: thisMonthBonus,
      format: (next) => formatMoney(Math.round(next)),
      hint: getMonthTitle(currentMonth),
      tone: "info",
      spark: bonusSeries.map((item) => item.amount)
    },
    {
      title: "Operatsion pulse",
      numericValue: overallPulse,
      format: (next) => `${Math.round(next)}%`,
      hint: "kontent, vazifa va approval tezligi",
      tone: overallPulse >= 75 ? "success" : overallPulse >= 45 ? "warning" : "danger",
      spark: [
        progress,
        Number(summary?.daily_task_progress || 0),
        Math.max(10, 100 - (approvalSlaBreaches * 6)),
        Math.min(100, ((summary?.today_report_count || 0) * 20) || 10),
        Math.min(100, activeCampaigns * 18 || 10),
        Math.min(100, travelWorkflow[1].value * 18 || 10)
      ]
    },
    {
      title: "Faol vazifalar",
      numericValue: summary?.task_count || 0,
      format: (next) => Math.round(next),
      hint: "umumiy vazifalar",
      tone: "default",
      spark: [
        summary?.task_count || 0,
        summary?.daily_task_total || 0,
        summary?.daily_task_done || 0,
        summary?.overdue_task_count || 0,
        summary?.due_soon_task_count || 0,
        reminders.length
      ]
    }
  ];
  const secondaryMetrics = [
    {
      title: "Bugungi hisobotlar",
      numericValue: summary?.today_report_count || 0,
      format: (next) => Math.round(next),
      hint: "filiallardan kelgan ma'lumot",
      tone: (summary?.today_report_count || 0) > 0 ? "success" : "default",
      spark: [
        summary?.today_report_count || 0,
        dailyReports.length,
        branchKpis.length,
        publishedToday,
        smartAlerts.length,
        reminders.length
      ]
    },
    {
      title: "Faol targetlar",
      numericValue: activeCampaigns,
      format: (next) => Math.round(next),
      hint: "reklama kampaniyalari",
      tone: activeCampaigns > 0 ? "info" : "default",
      spark: spendSeries.map((item) => item.amount)
    },
    {
      title: "3 kun ichidagi vazifalar",
      numericValue: summary?.due_soon_task_count || 0,
      format: (next) => Math.round(next),
      hint: "eslatma kerak",
      tone: (summary?.due_soon_task_count || 0) > 0 ? "warning" : "success",
      spark: [
        summary?.due_soon_task_count || 0,
        reminders.length,
        travelWorkflow[0].value,
        travelWorkflow[1].value,
        contentSeries[1].value,
        contentSeries[2].value
      ]
    },
    {
      title: "Oy reklama sarfi",
      numericValue: summary?.monthly_campaign_spend || 0,
      format: (next) => formatUsd(Math.round(next)),
      hint: getMonthTitle(currentMonth),
      tone: "info",
      spark: spendSeries.map((item) => item.amount)
    },
    {
      title: "Approval SLA",
      numericValue: approvalSlaBreaches,
      format: (next) => Math.round(next),
      hint: "48 soatdan oshgan jarayonlar",
      tone: approvalSlaBreaches > 0 ? "danger" : "success",
      spark: [
        approvalSlaBreaches,
        contentSeries[0].value,
        contentSeries[2].value,
        travelWorkflow[0].value,
        travelWorkflow[2].value,
        reminders.length
      ]
    }
  ];

  return (
    <div className="page-grid dashboard-page">
      <div className="dashboard-hero-card">
        <div className="dashboard-hero-copy">
          <div className="small-label">Boshqaruv markazi</div>
          <h1>{heroTitle}</h1>
          <p>{heroText}</p>
          <div className="dashboard-hero-summary">
            {summary?.executive_summary || "Asosiy boshqaruv xulosasi tayyorlanmoqda, operatsion signallar yig‘ilmoqda."}
          </div>
          <div className="dashboard-chip-row">
            {heroChips.map((chip) => (
              <span key={chip} className="dashboard-chip">{chip}</span>
            ))}
          </div>
        </div>

        <div className="dashboard-hero-side">
          <div className="dashboard-hero-glow" />
          <div className="dashboard-side-focus">
            <span>Bugungi oqim</span>
            <strong><AnimatedNumber value={publishedToday} format={(next) => Math.round(next)} /></strong>
            <small>bugun reja yoki ijroga tushgan kontentlar</small>
          </div>
          <div className="dashboard-side-grid">
            <div className="dashboard-side-card">
              <span>Top filial</span>
              <strong>{topBranch?.name || "—"}</strong>
              <small>{topBranch ? `${topBranch.score} KPI ball` : "hisobot kutilmoqda"}</small>
            </div>
            <div className="dashboard-side-card">
              <span>Signal</span>
              <strong><AnimatedNumber value={operationSignals.length} format={(next) => Math.round(next)} /></strong>
              <small>smart alert va reminders</small>
            </div>
            <div className="dashboard-side-card">
              <span>Safar</span>
              <strong><AnimatedNumber value={travelWorkflow[1].value} format={(next) => Math.round(next)} /></strong>
              <small>tasdiqlangan safar rejasi</small>
            </div>
            <div className="dashboard-side-card">
              <span>Reklama</span>
              <strong><AnimatedNumber value={activeCampaigns} format={(next) => Math.round(next)} /></strong>
              <small>faol target kampaniyalari</small>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-metrics-grid">
        {primaryMetrics.map((item) => (
          <DashboardMetricCard key={item.title} {...item} />
        ))}
      </div>

      <div className="dashboard-metrics-grid dashboard-metrics-grid-secondary">
        {secondaryMetrics.map((item) => (
          <DashboardMetricCard key={item.title} {...item} />
        ))}
      </div>

      <BonusPlasticCards
        rows={dashboardBonusBalances}
        monthLabel={currentMonth}
        title="Joriy oy bonus kartalari"
      />

      <div className="dashboard-spotlight-grid">
        <div className="card dashboard-focus-card">
          <SectionTitle
            title="Performance pulse"
            desc="Bugungi jarayonlar qanchalik barqaror yurayotganini ko‘rsatadi"
            right={<span className="dashboard-chip small live">Live</span>}
          />
          <div className="dashboard-focus-layout">
            <div className="dashboard-ring-card">
              <div
                className="dashboard-ring"
                style={{
                  background: `conic-gradient(${overallPulse >= 75 ? "#10b981" : overallPulse >= 45 ? "#f59e0b" : "#ef4444"} ${overallPulse}%, rgba(148,163,184,.14) 0)`
                }}
              >
                <div className="dashboard-ring-inner">
                  <span>Pulse</span>
                  <strong><AnimatedNumber value={overallPulse} format={(next) => `${Math.round(next)}%`} /></strong>
                </div>
              </div>
            </div>
            <div className="dashboard-focus-list">
              <div className="dashboard-focus-item">
                <span>Kontent reja</span>
                <strong>{postedCount}/{totalPlan}</strong>
              </div>
              <div className="dashboard-focus-item">
                <span>Kunlik vazifa progress</span>
                <strong>{summary?.daily_task_progress || 0}%</strong>
              </div>
              <div className="dashboard-focus-item">
                <span>Approval SLA</span>
                <strong>{approvalSlaBreaches}</strong>
              </div>
              <div className="dashboard-focus-item">
                <span>Bugungi hisobot</span>
                <strong>{summary?.today_report_count || 0}</strong>
              </div>
            </div>
          </div>
        </div>

        <div className="card dashboard-focus-card">
          <SectionTitle
            title="Live signallar"
            desc="Muhim alert va vazifa signalari bir joyda"
            right={<span className="dashboard-chip small">{operationSignals.length} ta</span>}
          />
          <div className="dashboard-alert-wall">
            {operationSignals.length ? operationSignals.map((item) => (
              <div key={item.id} className={`dashboard-alert-card ${item.tone}`}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            )) : (
              <div className="empty-block">Hozircha yangi signal yo‘q</div>
            )}
          </div>
        </div>
      </div>

      <DashboardDisclosure
        title="Operatsion markaz"
        desc="Filial hisobotlari va eslatmalarni tez ko‘rish uchun"
        badge={`${dailyReports.length} hisobot`}
      >
        <div className="two-grid dashboard-fold-grid">
          <div className="card dashboard-nested-card">
            <SectionTitle title="So‘nggi filial hisobotlari" desc="Oxirgi yuborilgan kunlik natijalar" />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Sana</th>
                    <th>Filial</th>
                    <th>Stories</th>
                    <th>Post</th>
                  </tr>
                </thead>
                <tbody>
                  {(dailyReports || []).slice(0, 5).map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.report_date)}</td>
                      <td>{row.branch_name}</td>
                      <td>{row.stories_count}</td>
                      <td>{row.posts_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card dashboard-nested-card">
            <SectionTitle title="Task reminders" desc="Yaqinlashayotgan va kechikkan vazifalar" />
            <div className="reminder-list">
              {reminders.length ? reminders.map((item) => (
                <div key={item.id} className={`reminder-card ${formatDate(item.due_date) < todayKey ? "danger" : "warning"}`}>
                  <strong>{item.title}</strong>
                  <span>{formatDate(item.due_date)} - {taskStatusLabel(item.status)}</span>
                </div>
              )) : <div className="empty-block">Hozircha eslatma yo‘q</div>}
            </div>
          </div>
        </div>
      </DashboardDisclosure>

      <DashboardDisclosure
        title="Analytics studio"
        desc="Bonus, kontent, sarf va filial KPI bo‘yicha ichki ko‘rsatkichlar"
        badge={`${summary?.monthly_content_count || totalPlan} kontent`}
      >
        <div className="card dashboard-nested-card">
          <SectionTitle title="Tezkor xulosa" desc="Joriy oy bo‘yicha qisqa snapshot" />
          <div className="quick-list">
            <div className="quick-item">Kontentlar soni: <strong>{summary?.monthly_content_count || 0}</strong></div>
            <div className="quick-item">Bonus stavkasi: <strong>{formatMoney(summary?.bonus_rate || 25000)}</strong></div>
            <div className="quick-item">Hisoblangan bonus: <strong>{formatMoney(summary?.monthly_bonus_amount || thisMonthBonus)}</strong></div>
            <div className="quick-item">Bugungi hisobotlar: <strong>{summary?.today_report_count || 0}</strong></div>
          </div>
        </div>

        <div className="chart-grid dashboard-chart-grid">
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
              )) : <div className="empty-block">Filial KPI hali yo‘q</div>}
            </div>
          </div>
        </div>
      </DashboardDisclosure>

      <DashboardDisclosure
        title="Workflow va eksportlar"
        desc="Tasdiqlash oqimlari va tezkor eksport markazi"
        badge={`${summary?.task_count || 0} vazifa`}
        defaultOpen={false}
      >
        <div className="dashboard-fold-columns">
          <div className="card dashboard-nested-card">
            <SectionTitle title="Kontent approval workflow" desc="Kontent statuslarining joriy holati" />
            <div className="quick-list">
              {contentSeries.map((item) => (
                <div key={item.label} className="quick-item">
                  {item.label}: <strong>{item.value}</strong>
                </div>
              ))}
              <div className="quick-item">Bekor qilingan: <strong>{thisMonthContent.filter((r) => r.status === "bekor_qilingan").length}</strong></div>
            </div>
          </div>

          <div className="card dashboard-nested-card">
            <SectionTitle title="Safar approval workflow" desc="Safar rejalari oqimi" />
            <div className="quick-list">
              {travelWorkflow.map((item) => (
                <div key={item.label} className="quick-item">
                  {item.label}: <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card dashboard-nested-card">
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
      </DashboardDisclosure>
    </div>
  );
}

function ContentPage({ users = [], branches = [], settings, user, onToast, reload }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthLabel());
  const [rows, setRows] = useState([]);
  const [tableSearch, setTableSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bonusMode, setBonusMode] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [calendarPlatformFilter, setCalendarPlatformFilter] = useState("all");
  const [calendarBranchFilter, setCalendarBranchFilter] = useState("all");

  const emptyForm = {
    title: "",
    publish_date: "",
    status: "reja",
    platform_primary: "Instagram",
    platform_secondary: "",
    content_type: "post",
    rubric: "rubrika-yoq",
    assigned_user_id: "",
    editor_user_id: "",
    face_voice_user_id: "",
    proposal_count: "",
    approved_count: "",
    difficulty_level: "sodda",
    work_url: "",
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
  const canCreateContent = canDoAction(user, "content", "create");
  const canEditContent = canDoAction(user, "content", "edit");
  const canDeleteContent = canDoAction(user, "content", "delete");
  const formLocked = editRow ? !canEditContent : !canCreateContent;
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
  const todayDate = formatDate(new Date());
  const deadlineRows = rows
    .map((item) => {
      const deadline = formatDate(item.publish_date);
      const isDone = ["yakunlandi", "joylangan"].includes(item.status);
      const daysLeft = deadline === "-" ? null : Math.ceil((new Date(`${deadline}T00:00:00`) - new Date(`${todayDate}T00:00:00`)) / 86400000);
      const assignee = item.content_type === "video"
        ? [item.video_editor_name, item.video_face_name].filter(Boolean).join(" / ")
        : item.assignee_name;
      return { ...item, deadline, daysLeft, isDone, assignee };
    })
    .filter((item) => item.deadline !== "-")
    .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999));
  const overdueRows = deadlineRows.filter((item) => !item.isDone && Number(item.daysLeft) < 0);
  const todayRows = deadlineRows.filter((item) => !item.isDone && Number(item.daysLeft) === 0);
  const upcomingRows = deadlineRows.filter((item) => !item.isDone && Number(item.daysLeft) > 0 && Number(item.daysLeft) <= 3);
  const approvalHistoryRows = [...rows]
    .filter((item) => item.status || item.approval_comment)
    .sort((a, b) => new Date(b.updated_at || b.created_at || b.publish_date || 0) - new Date(a.updated_at || a.created_at || a.publish_date || 0))
    .slice(0, 6);
  const contentSignals = [
    overdueRows.length ? { tone: "danger", title: "Deadline o'tgan", body: `${overdueRows.length} ta kontent muddatdan o'tgan. Mas'ulga signal yuborish kerak.` } : null,
    todayRows.length ? { tone: "warning", title: "Bugun chiqishi kerak", body: `${todayRows.length} ta kontent bugun publish deadline holatida.` } : null,
    workflowCounts.qayta_ishlash ? { tone: "warning", title: "Qayta ishlash navbati", body: `${workflowCounts.qayta_ishlash} ta kontent qayta ishlashda turibdi.` } : null,
    rows.length && !rows.some((item) => item.content_type === "reels") ? { tone: "info", title: "Reels kam", body: "Bu oy reja ichida Reels ko'rinmayapti, reach uchun qo'shish foydali." } : null,
    !rows.length ? { tone: "info", title: "Oy rejasi bo'sh", body: "Kontent kalendar hali to'ldirilmagan." } : null
  ].filter(Boolean);
  const contentModernStats = [
    { label: "Jami reja", value: rows.length, hint: getMonthTitle(selectedMonth) },
    { label: "Jarayonda", value: workflowCounts.jarayonda, hint: "tayyorlanmoqda" },
    { label: "Yakunlangan", value: workflowCounts.yakunlandi, hint: "joylangan" },
    { label: "Bonusli", value: rows.filter((item) => item.bonus_enabled).length, hint: "bonus oqimi" }
  ];
  const visibleRows = useMemo(() => {
    return rows.filter((row) => rowMatchesSearch(
      [
        row.title,
        row.platform,
        row.content_type,
        formatRubric(row.rubric),
        row.status,
        row.assignee_name,
        row.video_editor_name,
        row.video_face_name,
        formatDate(row.publish_date)
      ],
      tableSearch
    ));
  }, [rows, tableSearch]);
  const calendarRows = useMemo(() => {
    return visibleRows.filter((row) => {
      const platformOk = calendarPlatformFilter === "all" || splitCellValues(row.platform).includes(calendarPlatformFilter);
      const branchIds = Array.isArray(row.branch_ids_json) ? row.branch_ids_json.map(String) : [];
      const branchOk = calendarBranchFilter === "all" || branchIds.includes(String(calendarBranchFilter));
      return platformOk && branchOk;
    });
  }, [visibleRows, calendarPlatformFilter, calendarBranchFilter]);
  const calendarPlatforms = useMemo(() => {
    return [...new Set(visibleRows.flatMap((row) => splitCellValues(row.platform)))].filter(Boolean).sort();
  }, [visibleRows]);
  const weeklyLoad = useMemo(() => {
    const stats = new Map();
    calendarRows.forEach((row) => {
      const date = formatDate(row.publish_date);
      if (date === "-") return;
      const parsed = new Date(`${date}T00:00:00`);
      if (Number.isNaN(parsed.getTime())) return;
      const week = Math.ceil(parsed.getDate() / 7);
      const key = `${getMonthTitle(selectedMonth)} / ${week}-hafta`;
      stats.set(key, (stats.get(key) || 0) + 1);
    });
    return [...stats.entries()].map(([label, count]) => ({ label, count }));
  }, [calendarRows, selectedMonth]);
  const emptyCalendarDays = useMemo(() => {
    const days = buildMonthCalendar(selectedMonth, calendarRows, "publish_date").filter((cell) => !cell.empty);
    return days.filter((cell) => !cell.items.length).length;
  }, [selectedMonth, calendarRows]);

  async function loadMonth(monthValue = selectedMonth) {
    try {
      setLoading(true);
      const data = await api.list("content", { month: monthValue });
      setRows(sortRowsByDate(data, "publish_date"));
    } catch (err) {
      onToast(err.message || "Kontent rejani olib bo'lmadi", "error");
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
    if (!canEditContent) {
      onToast("Sizda kontentni tahrirlash ruxsati yo'q", "error");
      return;
    }
    setEditRow(row);
    const platforms = String(row.platform || "").split(",").map((x) => x.trim()).filter(Boolean);

    setForm({
      title: row.title || "",
      publish_date: formatDate(row.publish_date) === "-" ? "" : formatDate(row.publish_date),
      status: row.status || "reja",
      platform_primary: platforms[0] || "Instagram",
      platform_secondary: platforms[1] || "",
      content_type: row.content_type || "post",
      rubric: row.rubric || "rubrika-yoq",
      assigned_user_id: row.assigned_user_id || "",
      editor_user_id: row.video_editor_user_id || "",
      face_voice_user_id: row.video_face_user_id || "",
      proposal_count: row.proposal_count ?? "",
      approved_count: row.approved_count ?? "",
      difficulty_level: normalizeDifficultyLevel(row.difficulty_level || "sodda"),
      work_url: row.final_url || "",
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

    if (editRow && !canEditContent) {
      onToast("Sizda kontentni tahrirlash ruxsati yo'q", "error");
      return;
    }

    if (!editRow && !canCreateContent) {
      onToast("Sizda kontent qo'shish ruxsati yo'q", "error");
      return;
    }

    if (isVideo) {
      if (!form.editor_user_id || !form.face_voice_user_id) {
        onToast("Video uchun 2 ta hodim tanlanishi kerak", "error");
        return;
      }
    } else {
      if (!form.assigned_user_id) {
        onToast("Mas'ul shaxsni tanlang", "error");
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
        rubric: form.rubric || "rubrika-yoq",
        assigned_user_id: isVideo ? null : form.assigned_user_id || null,
        video_editor_user_id: isVideo ? form.editor_user_id || null : null,
        video_face_user_id: isVideo ? form.face_voice_user_id || null : null,
        bonus_enabled: bonusMode,
        proposal_count: bonusMode ? Number(form.proposal_count || 0) : 0,
        approved_count: bonusMode ? Number(form.approved_count || 0) : 0,
        difficulty_level: bonusMode ? normalizeDifficultyLevel(form.difficulty_level || "sodda") : "bonussiz",
        final_url: normalizeExternalUrl(form.work_url),
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
        onToast("Kontent reja yangilandi", "success", { center: true });
      } else {
        await api.create("content", payload);
        onToast("Kontent reja saqlandi", "success", { center: true });
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
    if (!canDeleteContent) {
      onToast("Sizda kontentni o'chirish ruxsati yo'q", "error");
      return;
    }
    const ok = window.confirm("Rostdan ham o'chirilsinmi?");
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
      onToast("Kontent o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "O'chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid content-page-modern">
      <div className="card content-modern-card content-form-card">
        <SectionTitle
          title={editRow ? "Kontent rejani tahrirlash" : "Kontent reja yaratish"}
          desc={`${getMonthTitle(selectedMonth)} uchun`}
          right={
            <div className="toolbar-actions content-modern-toolbar">
              <button type="button" className="btn secondary content-modern-btn" onClick={() => setViewMode(viewMode === "table" ? "calendar" : viewMode === "calendar" ? "kanban" : "table")}>
                {viewMode === "table" ? "Calendar view" : viewMode === "calendar" ? "Kanban view" : "Table view"}
              </button>
              <button type="button" className="btn secondary content-modern-btn" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>
                {"Oldingi oy"}
              </button>
              <div className="summary-pill content-month-pill">
                <strong>{getMonthTitle(selectedMonth)}</strong>
              </div>
              <button type="button" className="btn secondary content-modern-btn" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>
                {"Keyingi oy"}
              </button>
              {editRow ? (
                <button type="button" className="btn secondary content-modern-btn" onClick={resetForm}>
                  Bekor qilish
                </button>
              ) : null}
            </div>
          }
        />

        <div className="info-banner">
          Bonus formulasi: <strong>Sodda 25,000 UZS</strong>, <strong>O'rta 50,000 UZS</strong>, <strong>Murakkab 75,000 UZS</strong>, <strong>Juda murakkab 100,000 UZS</strong>, <strong>Bonussiz 0 UZS</strong>.
        </div>
        <div className="content-modern-stats">
          {contentModernStats.map((item) => (
            <div key={item.label} className="content-modern-stat">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.hint}</small>
            </div>
          ))}
        </div>
        <div className="content-control-grid">
          <div className="content-control-panel">
            <div className="content-control-head">
              <strong>Mas'ul + deadline nazorati</strong>
              <span>{overdueRows.length} kechikkan</span>
            </div>
            <div className="deadline-list">
              {[...overdueRows, ...todayRows, ...upcomingRows].slice(0, 5).map((item) => (
                <button key={`deadline-${item.id}`} type="button" className={`deadline-item ${Number(item.daysLeft) < 0 ? "danger" : Number(item.daysLeft) === 0 ? "warning" : ""}`} onClick={() => setViewRow(item)}>
                  <span>{item.title}</span>
                  <strong>{item.assignee || "Mas'ul yo'q"}</strong>
                  <small>{Number(item.daysLeft) < 0 ? `${Math.abs(item.daysLeft)} kun kechikdi` : Number(item.daysLeft) === 0 ? "Bugun deadline" : `${item.daysLeft} kun qoldi`}</small>
                </button>
              ))}
              {![...overdueRows, ...todayRows, ...upcomingRows].length ? <div className="empty-block">Yaqin deadline xavfi yo'q</div> : null}
            </div>
          </div>
          <div className="content-control-panel">
            <div className="content-control-head">
              <strong>AI / avto signal</strong>
              <span>{contentSignals.length} signal</span>
            </div>
            <div className="signal-list">
              {contentSignals.map((item) => (
                <div key={item.title} className={`signal-item ${item.tone}`}>
                  <strong>{item.title}</strong>
                  <span>{item.body}</span>
                </div>
              ))}
              {!contentSignals.length ? <div className="signal-item success"><strong>Ritm yaxshi</strong><span>Kritik signal topilmadi.</span></div> : null}
            </div>
          </div>
          <div className="content-control-panel">
            <div className="content-control-head">
              <strong>Approval tarixi</strong>
              <span>so'nggi 6</span>
            </div>
            <div className="approval-history-mini">
              {approvalHistoryRows.length ? approvalHistoryRows.map((item) => (
                <button key={`approval-history-${item.id}`} type="button" onClick={() => setViewRow(item)}>
                  <span className={approvalStatusClass(item.status)}>{formatApprovalStatus(item.status)}</span>
                  <strong>{item.title}</strong>
                  <small>{item.approval_comment || formatDateTime(item.updated_at || item.created_at)}</small>
                </button>
              )) : <div className="empty-block">Approval tarixi hali yo'q</div>}
            </div>
          </div>
        </div>
        {!canCreateContent && !canEditContent ? (
          <div className="info-banner">Siz bu bo'limda faqat ko'rish ruxsatiga egasiz.</div>
        ) : null}
        <form className="form-grid content-modern-form" onSubmit={handleSubmit}>
          <label><span>Kontent nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required disabled={formLocked} /></label>
          <label><span>Joylash sanasi</span><input type="date" value={form.publish_date} onChange={(e) => setField("publish_date", e.target.value)} required disabled={formLocked} /></label>
          <label>
            <span>Holati</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)} disabled={formLocked}>
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
            <select value={form.platform_primary} onChange={(e) => setField("platform_primary", e.target.value)} disabled={formLocked}>
              <option value="Instagram">Instagram</option>
              <option value="Telegram">Telegram</option>
              <option value="YouTube">YouTube</option>
              <option value="Facebook">Facebook</option>
              <option value="TikTok">TikTok</option>
            </select>
          </label>

          <label>
            <span>2-platforma</span>
            <select value={form.platform_secondary} onChange={(e) => setField("platform_secondary", e.target.value)} disabled={formLocked}>
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
            <select value={form.content_type} onChange={(e) => setField("content_type", e.target.value)} disabled={formLocked}>
              {CONTENT_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Rubrika</span>
            <select value={form.rubric} onChange={(e) => setField("rubric", e.target.value)} disabled={formLocked}>
              {RUBRIC_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          {isVideo ? (
            <>
              <label>
                <span>Montaj kim qildi</span>
                <select value={form.editor_user_id} onChange={(e) => setField("editor_user_id", e.target.value)} disabled={formLocked}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>

              <label>
                <span>Face + ovoz kimniki</span>
                <select value={form.face_voice_user_id} onChange={(e) => setField("face_voice_user_id", e.target.value)} disabled={formLocked}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label>
              <span>Mas'ul shaxs</span>
              <select value={form.assigned_user_id} onChange={(e) => setField("assigned_user_id", e.target.value)} disabled={formLocked}>
                <option value="">Tanlang</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </label>
          )}

          <label className="checkbox-row">
            <input type="checkbox" checked={bonusMode} onChange={(e) => setBonusMode(e.target.checked)} disabled={formLocked} />
            <span>Bonusga o'tkazish</span>
          </label>

          {bonusMode ? (
            <>
              <label><span>Taklif soni</span><input type="number" min="0" value={form.proposal_count} onChange={(e) => setField("proposal_count", e.target.value)} required disabled={formLocked} /></label>
              <label>
                <span>Murakkablik darajasi</span>
                <select value={form.difficulty_level} onChange={(e) => setField("difficulty_level", e.target.value)} disabled={formLocked}>
                  {BONUS_DIFFICULTY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </label>
              <label><span>Tasdiq soni</span><input type="number" min="0" value={form.approved_count} onChange={(e) => setField("approved_count", e.target.value)} disabled={formLocked} /></label>
            </>
          ) : null}

          <label className="full-col">
            <span>Qilingan ish linki</span>
            <input
              value={form.work_url}
              onChange={(e) => setField("work_url", e.target.value)}
              placeholder="https://instagram.com/... yoki post havolasi"
              disabled={formLocked}
            />
          </label>

          <label className="full-col"><span>Approval izohi</span><textarea value={form.approval_comment} onChange={(e) => setField("approval_comment", e.target.value)} rows={2} placeholder="Tasdiqlash yoki qayta ishlash bo'yicha izoh" disabled={formLocked} /></label>

          <button className="btn primary content-submit-btn" type="submit" disabled={saving || formLocked}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Saqlash"}
          </button>
        </form>
      </div>

      


      <div className="card content-modern-card content-list-card">
        <SectionTitle
          title={`${getMonthTitle(selectedMonth)} kontent rejasi`}
          right={
            <div className="toolbar-actions content-modern-toolbar">
              <label className="table-search content-modern-search" aria-label="Kontent qidiruvi">
                <Search size={16} />
                <input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Kontent, hodim yoki turdan qidiring..."
                />
              </label>
              <button
                type="button"
                className="btn secondary content-modern-btn"
                onClick={() => api.exportFile("/api/export/content.xlsx", `content-${selectedMonth}.xlsx`)}
              >
                Excel export
              </button>
            </div>
          }
        />

        {viewMode === "table" ? <>
          <div className="table-wrap desktop-table">
            <table>
              <thead>
                <tr>
                  <th>Kontent nomi</th>
                  <th>Joylash sanasi</th>
                  <th>Holati</th>
                  <th>Platforma</th>
                  <th>Kontent turi</th>
                  <th>Rubrika</th>
                  <th>Mas'ul / Video</th>
                  <th>Bonus</th>
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="9" className="empty-cell">Yuklanmoqda...</td></tr>
                ) : visibleRows.length ? (
                  visibleRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="table-title-cell">
                          <strong className="table-title-main">{row.title}</strong>
                          <div className="table-title-sub">
                            {row.final_url ? (
                              <button type="button" className="table-inline-link" onClick={() => openExternalUrl(row.final_url)}>
                                Havolani ochish
                              </button>
                            ) : row.approval_comment ? row.approval_comment : "Kontent kartasi"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-date-stack">
                          <strong>{formatDate(row.publish_date)}</strong>
                          <span>{row.bonus_enabled ? "Bonus oqimida" : "Kontent oqimida"}</span>
                        </div>
                      </td>
                      <td><span className={approvalStatusClass(row.status)}>{formatApprovalStatus(row.status)}</span></td>
                      <td>
                        <div className="table-chip-row">
                          {(splitCellValues(row.platform) || []).length ? splitCellValues(row.platform).map((platform, idx) => (
                            <PlatformBadge key={`${row.id}-platform-${idx}`} platform={platform} />
                          )) : <span className="table-cell-muted">-</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`table-chip type ${contentTypeChipTone(row.content_type)}`}>
                          {formatContentType(row.content_type)}
                        </span>
                      </td>
                      <td>
                        <span className={`table-chip rubric ${rubricChipTone(row.rubric)}`}>
                          {formatRubric(row.rubric)}
                        </span>
                      </td>
                      <td>
                        <div className="table-person-stack">
                          {(row.content_type === "video"
                            ? [row.video_editor_name, row.video_face_name]
                            : [row.assignee_name]
                          ).filter(Boolean).map((name, idx) => (
                            <span key={`${row.id}-person-${idx}`} className="table-person">{name}</span>
                          ))}
                          {(row.content_type === "video"
                            ? [row.video_editor_name, row.video_face_name]
                            : [row.assignee_name]
                          ).filter(Boolean).length ? null : <span className="table-cell-muted">-</span>}
                        </div>
                      </td>
                      <td>
                        <span className={`table-chip bonus ${row.bonus_enabled ? "success" : "default"}`}>
                          {row.bonus_enabled ? "Bonus yoqilgan" : "Bonus yo'q"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-shell">
                          <IconActions
                            onView={() => setViewRow(row)}
                            onEdit={canEditContent ? () => startEdit(row) : null}
                            onDelete={canDeleteContent ? () => removeRow(row.id) : null}
                          />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="9" className="empty-cell">{tableSearch.trim() ? "Qidiruv bo'yicha kontent topilmadi" : "Bu oy uchun reja yo'q"}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {loading ? (
              <div className="mobile-record-card empty">Yuklanmoqda...</div>
            ) : visibleRows.length ? (
              visibleRows.map((row) => (
                <div key={`content-card-${row.id}`} className={`mobile-record-card ${row.bonus_enabled ? "bonus" : ""}`}>
                  <div className="mobile-record-head">
                    <div className="mobile-record-title">
                      <strong>{row.title}</strong>
                      <span>{formatDate(row.publish_date)} • {formatContentType(row.content_type)}</span>
                    </div>
                    <span className={approvalStatusClass(row.status)}>{formatApprovalStatus(row.status)}</span>
                  </div>
                  <div className="mobile-record-grid">
                    <div className="mobile-record-field">
                      <label>Platforma</label>
                      <div>{row.platform || "-"}</div>
                    </div>
                    <div className="mobile-record-field">
                      <label>Rubrika</label>
                      <div>{formatRubric(row.rubric)}</div>
                    </div>
                    <div className="mobile-record-field full">
                      <label>Mas'ul / Video</label>
                      <div>
                        {row.content_type === "video"
                          ? `${row.video_editor_name || "-"} / ${row.video_face_name || "-"}`
                          : row.assignee_name || "-"}
                      </div>
                    </div>
                    <div className="mobile-record-field">
                      <label>Bonus</label>
                      <div>{row.bonus_enabled ? "Ha" : "Yo'q"}</div>
                    </div>
                  </div>
                  <div className="mobile-record-actions">
                    <IconActions
                      onView={() => setViewRow(row)}
                      onEdit={canEditContent ? () => startEdit(row) : null}
                      onDelete={canDeleteContent ? () => removeRow(row.id) : null}
                    />
                  </div>
                </div>
              ))
            ) : (
              <div className="mobile-record-card empty">
                {tableSearch.trim() ? "Qidiruv bo'yicha kontent topilmadi" : "Bu oy uchun reja yo'q"}
              </div>
            )}
          </div>
        </> : viewMode === "calendar" ? (
          <div className="calendar-pro-shell">
            <div className="calendar-pro-toolbar">
              <div className="calendar-signal-card">
                <strong>Haftalik yuklama</strong>
                <div className="calendar-load-bars">
                  {weeklyLoad.length ? weeklyLoad.map((item) => (
                    <span key={item.label} style={{ "--load": `${Math.min(100, item.count * 20)}%` }}>
                      {item.label}: <b>{item.count}</b>
                    </span>
                  )) : <span>Bu oy uchun yuklama yo'q</span>}
                </div>
              </div>
              <div className="calendar-signal-card">
                <strong>Bo'sh kunlar signali</strong>
                <span>{emptyCalendarDays} kun bo'sh. Kontent ritmini teng taqsimlash mumkin.</span>
              </div>
              <label>
                <span>Platforma</span>
                <select value={calendarPlatformFilter} onChange={(e) => setCalendarPlatformFilter(e.target.value)}>
                  <option value="all">Hammasi</option>
                  {calendarPlatforms.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>Filial rangi</span>
                <select value={calendarBranchFilter} onChange={(e) => setCalendarBranchFilter(e.target.value)}>
                  <option value="all">Barcha filiallar</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
                </select>
              </label>
            </div>
            <MiniCalendar
              monthLabel={selectedMonth}
              rows={calendarRows}
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
                  onToast("Kontent sanasi ko'chirildi", "success", { center: true });
                } catch (err) {
                  onToast(err.message || "Sanani ko'chirib bo'lmadi", "error");
                }
              }}
              renderItem={(item) => {
                const branchIds = Array.isArray(item.branch_ids_json) ? item.branch_ids_json.map(Number) : [];
                const branchIndex = branchIds.length ? Math.abs(branchIds[0]) % 6 : 0;
                return (
                  <button key={item.id} type="button" className={`calendar-pill content-calendar-pill branch-tone-${branchIndex} ${item.bonus_enabled ? "bonus" : ""}`} onClick={() => setViewRow(item)}>
                    <span>{item.platform || "-"}</span>
                    {item.title}
                  </button>
                );
              }}
            />
          </div>
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
            rows={visibleRows.map((item) => ({
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

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Kontent reja tafsiloti" wide>
        {viewRow ? (
          <div className="content-detail-layout">
            <div className="content-detail-main">
              <div className="detail-grid content-detail-grid">
                <div><strong>Kontent nomi</strong><span>{viewRow.title}</span></div>
                <div><strong>Sana</strong><span>{formatDate(viewRow.publish_date)}</span></div>
                <div><strong>Holati</strong><span className={approvalStatusClass(viewRow.status)}>{formatApprovalStatus(viewRow.status)}</span></div>
                <div><strong>Platforma</strong><span className="table-chip-row">{splitCellValues(viewRow.platform).length ? splitCellValues(viewRow.platform).map((platform, idx) => <PlatformBadge key={`${viewRow.id}-detail-platform-${idx}`} platform={platform} />) : "-"}</span></div>
                <div><strong>Turi</strong><span>{formatContentType(viewRow.content_type)}</span></div>
                <div><strong>Rubrika</strong><span>{formatRubric(viewRow.rubric)}</span></div>
                <div><strong>Bonus</strong><span>{viewRow.bonus_enabled ? "Ha" : "Yo'q"}</span></div>
                <div><strong>Taklif soni</strong><span>{viewRow.proposal_count || 0}</span></div>
                {viewRow.bonus_enabled ? <div><strong>Murakkablik</strong><span>{formatDifficultyHelp(viewRow.difficulty_level)}</span></div> : null}
                <div><strong>Tasdiq soni</strong><span>{viewRow.approved_count || 0}</span></div>
                <div className="full-col">
                  <strong>Qilingan ish linki</strong>
                  <span>
                    {viewRow.final_url ? (
                      <a href={normalizeExternalUrl(viewRow.final_url)} target="_blank" rel="noreferrer">
                        Havolani ochish
                      </a>
                    ) : "-"}
                  </span>
                </div>
                <div className="full-col"><strong>Approval izohi</strong><span>{viewRow.approval_comment || "-"}</span></div>
              </div>
            </div>
            <div className="content-detail-side">
              <DiscussionPanel entityType="content" entityId={viewRow.id} onToast={onToast} />
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function getBonusParticipantNames(item) {
  const participants = item?.content_type === "video"
    ? [item.video_editor_name, item.video_face_name]
    : [item.full_name];

  return [...new Set(
    participants
      .map((name) => String(name || "").trim())
      .filter((name) => name && name !== "-")
  )];
}

function getBonusAssigneeLabel(item) {
  const names = getBonusParticipantNames(item);
  return names.length ? names.join(" / ") : "-";
}

function getBonusRowAmount(item, bonusRate = 25000) {
  const approvedCount = Number(item?.approved_count || 0);
  const approvedAmount = Number(item?.approved_amount || 0);
  if (approvedAmount) return approvedAmount;
  const unitAmount = item?.difficulty_level ? getDifficultyUnitAmount(item.difficulty_level) : Number(bonusRate || 0);
  return approvedCount * unitAmount;
}

function getBonusEstimatedAmount(item, bonusRate = 25000) {
  const approvedAmount = Number(item?.approved_amount || 0);
  if (approvedAmount) return approvedAmount;
  const count = Number(item?.approved_count || item?.proposal_count || 0);
  const unitAmount = item?.difficulty_level ? getDifficultyUnitAmount(item.difficulty_level) : Number(bonusRate || 0);
  return count * unitAmount;
}

function normalizeDifficultyLevel(value) {
  const normalized = String(value || "").trim().toLowerCase();
  if (["sodda", "oddiy", "normal", "easy"].includes(normalized)) return "sodda";
  if (["juda_murakkab", "juda-murakkab", "juda murakkab", "very_hard"].includes(normalized)) return "juda_murakkab";
  if (["murakkab", "qiyin", "hard"].includes(normalized)) return "murakkab";
  if (["orta", "o'rta", "o‘rta", "ortacha", "o'rtacha", "o‘rtacha", "medium"].includes(normalized)) return "orta";
  if (["bonussiz", "0", "none", "no_bonus"].includes(normalized)) return "bonussiz";
  return "sodda";
}

function getDifficultyUnitAmount(value) {
  switch (normalizeDifficultyLevel(value)) {
    case "bonussiz":
      return 0;
    case "orta":
      return 50000;
    case "murakkab":
      return 75000;
    case "juda_murakkab":
      return 100000;
    case "sodda":
    default:
      return 25000;
  }
}

function formatDifficultyLabel(value) {
  const normalized = normalizeDifficultyLevel(value);
  const match = BONUS_DIFFICULTY_OPTIONS.find((item) => item.value === normalized);
  return match?.label.split(" - ")[0] || "Sodda";
}

function formatDifficultyHelp(value) {
  const normalized = normalizeDifficultyLevel(value);
  const match = BONUS_DIFFICULTY_OPTIONS.find((item) => item.value === normalized);
  return match?.label || "Sodda - 25,000 UZS";
}

function getBonusDifficultyMeta(item) {
  const level = normalizeDifficultyLevel(item?.difficulty_level);
  if (level === "juda_murakkab") {
    return { label: "Juda murakkab", badgeClass: "mini-badge danger", rowClass: "table-row-danger" };
  }
  if (level === "murakkab") {
    return { label: "Murakkab", badgeClass: "mini-badge danger", rowClass: "table-row-danger" };
  }
  if (level === "orta") {
    return { label: "O'rtacha", badgeClass: "mini-badge warning", rowClass: "table-row-warning" };
  }
  if (level === "bonussiz") {
    return { label: "Bonussiz", badgeClass: "mini-badge default", rowClass: "" };
  }
  return { label: "Sodda", badgeClass: "mini-badge default", rowClass: "" };
}

function summarizeBonusEmployees(items = [], bonusRate = 25000) {
  const stats = new Map();

  (items || []).forEach((item) => {
    const names = getBonusParticipantNames(item);
    const amount = getBonusRowAmount(item, bonusRate);
    const proposalCount = Number(item?.proposal_count || 0);
    const approvedCount = Number(item?.approved_count || 0);

    names.forEach((name) => {
      if (!stats.has(name)) {
        stats.set(name, {
          name,
          content_count: 0,
          proposal_count: 0,
          approved_count: 0,
          amount: 0
        });
      }

      const current = stats.get(name);
      current.content_count += 1;
      current.proposal_count += proposalCount;
      current.approved_count += approvedCount;
      current.amount += amount;
    });
  });

  return [...stats.values()].sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name));
}

function summarizeBonusBalanceEmployees(items = [], bonusRate = 25000) {
  const stats = new Map();

  (items || []).forEach((item) => {
    const names = getBonusParticipantNames(item);
    const amount = getBonusEstimatedAmount(item, bonusRate);
    const proposalCount = Number(item?.proposal_count || 0);
    const approvedCount = Number(item?.approved_count || 0);

    names.forEach((name) => {
      if (!stats.has(name)) {
        stats.set(name, {
          name,
          content_count: 0,
          proposal_count: 0,
          approved_count: 0,
          amount: 0
        });
      }

      const current = stats.get(name);
      current.content_count += 1;
      current.proposal_count += proposalCount;
      current.approved_count += approvedCount;
      current.amount += amount;
    });
  });

  return [...stats.values()].sort((a, b) => b.amount - a.amount || b.content_count - a.content_count || a.name.localeCompare(b.name));
}

function BonusPlasticCards({ rows = [], monthLabel = getMonthLabel(), title = "Bonus balans", onSelect = null }) {
  const displayRows = rows.slice(0, 2);

  if (!displayRows.length) {
    return null;
  }

  return (
    <div className="bonus-plastic-section">
      <div className="bonus-plastic-title">
        <span>{title}</span>
        <strong>{getMonthTitle(monthLabel)}</strong>
      </div>
      <div className="bonus-plastic-grid">
        {displayRows.map((row, index) => (
          <button key={`${row.name}-${index}`} type="button" className={`bonus-plastic-card card-${index + 1}`} onClick={() => onSelect?.(row)}>
            <div className="bonus-plastic-pattern" />
            <div className="bonus-plastic-top">
              <div className="bonus-plastic-logo">aloo</div>
              <div className="bonus-plastic-chip" />
            </div>
            <div className="bonus-plastic-body">
              <span>Balans</span>
              <strong>{formatMoney(row.amount)}</strong>
            </div>
            <div className="bonus-plastic-footer">
              <div>
                <span>Hodim</span>
                <strong>{row.name}</strong>
              </div>
              <div>
                <span>Kontent</span>
                <strong>{row.content_count}</strong>
              </div>
              <div>
                <span>Tasdiq</span>
                <strong>{row.approved_count || row.proposal_count || 0}</strong>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
}

function trimCanvasText(ctx, text, maxWidth) {
  const source = String(text || "-");
  if (ctx.measureText(source).width <= maxWidth) return source;
  let next = source;
  while (next.length > 1 && ctx.measureText(`${next}...`).width > maxWidth) {
    next = next.slice(0, -1);
  }
  return `${next}...`;
}

function downloadBonusApprovalImage({
  monthLabel,
  employeeRows = [],
  approvedByName,
  approvedAt,
  totalAmount,
  uniqueTotalAmount,
  contentCount
}) {
  if (!employeeRows.length) return false;

  const width = 1480;
  const outerPadding = 52;
  const gap = 22;
  const columns = employeeRows.length > 1 ? 2 : 1;
  const cardWidth = columns === 1
    ? width - outerPadding * 2
    : (width - outerPadding * 2 - gap) / 2;
  const cardHeight = 168;
  const rowCount = Math.ceil(employeeRows.length / columns);
  const headerHeight = 286;
  const footerHeight = 118;
  const height = headerHeight + rowCount * (cardHeight + gap) + footerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return false;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  ctx.scale(dpr, dpr);

  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#eff8ff");
  background.addColorStop(0.55, "#f8fbff");
  background.addColorStop(1, "#eefcf7");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glowA = ctx.createRadialGradient(180, 140, 20, 180, 140, 260);
  glowA.addColorStop(0, "rgba(56, 189, 248, 0.26)");
  glowA.addColorStop(1, "rgba(56, 189, 248, 0)");
  ctx.fillStyle = glowA;
  ctx.fillRect(0, 0, width, height);

  const glowB = ctx.createRadialGradient(width - 180, height - 120, 20, width - 180, height - 120, 260);
  glowB.addColorStop(0, "rgba(110, 231, 183, 0.22)");
  glowB.addColorStop(1, "rgba(110, 231, 183, 0)");
  ctx.fillStyle = glowB;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(37, 99, 235, 0.05)";
  for (let x = 0; x < width; x += 36) ctx.fillRect(x, 0, 1, height);
  for (let y = 0; y < height; y += 36) ctx.fillRect(0, y, width, 1);

  drawRoundedRect(ctx, outerPadding, 34, width - outerPadding * 2, 220, 34);
  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = "#1277da";
  ctx.font = "600 15px 'Segoe UI'";
  ctx.fillText("aloo bonus approval", outerPadding + 28, 72);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 42px 'Segoe UI'";
  ctx.fillText(`${getMonthTitle(monthLabel)} bonus hisoboti`, outerPadding + 28, 122);

  ctx.fillStyle = "#64748b";
  ctx.font = "500 18px 'Segoe UI'";
  const subtitle = approvedByName
    ? `Tasdiqlagan: ${approvedByName}${approvedAt ? ` • ${formatDateTime(approvedAt)}` : ""}`
    : "Rahbar tomonidan tasdiqlangan bonus hisoboti";
  ctx.fillText(subtitle, outerPadding + 28, 156);

  const statCards = [
    { label: "Hodimlar", value: employeeRows.length },
    { label: "Kontentlar", value: contentCount },
    { label: "Hodimlar jami", value: formatMoney(totalAmount) },
    { label: "Yozuvlar jami", value: formatMoney(uniqueTotalAmount) }
  ];

  statCards.forEach((card, index) => {
    const boxWidth = 300;
    const x = outerPadding + 28 + index * (boxWidth + 16);
    const y = 174;
    drawRoundedRect(ctx, x, y, boxWidth, 72, 22);
    ctx.fillStyle = "rgba(247,250,255,0.92)";
    ctx.fill();
    ctx.fillStyle = "#64748b";
    ctx.font = "500 14px 'Segoe UI'";
    ctx.fillText(card.label, x + 18, y + 28);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 24px 'Segoe UI'";
    ctx.fillText(String(card.value), x + 18, y + 56);
  });

  employeeRows.forEach((row, index) => {
    const col = index % columns;
    const rowIndex = Math.floor(index / columns);
    const x = outerPadding + col * (cardWidth + gap);
    const y = headerHeight + rowIndex * (cardHeight + gap);

    drawRoundedRect(ctx, x, y, cardWidth, cardHeight, 28);
    ctx.fillStyle = "rgba(255,255,255,0.84)";
    ctx.fill();
    ctx.strokeStyle = "rgba(191,219,254,0.8)";
    ctx.lineWidth = 1;
    ctx.stroke();

    drawRoundedRect(ctx, x + 18, y + 18, 74, 74, 22);
    const accent = ctx.createLinearGradient(x + 18, y + 18, x + 92, y + 92);
    accent.addColorStop(0, "#1d4ed8");
    accent.addColorStop(1, "#38bdf8");
    ctx.fillStyle = accent;
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "700 30px 'Segoe UI'";
    ctx.fillText(String(index + 1).padStart(2, "0"), x + 34, y + 66);

    ctx.fillStyle = "#0f172a";
    ctx.font = "700 26px 'Segoe UI'";
    ctx.fillText(trimCanvasText(ctx, row.name, cardWidth - 138), x + 114, y + 52);

    ctx.fillStyle = "#64748b";
    ctx.font = "500 16px 'Segoe UI'";
    ctx.fillText(`Kontent soni: ${row.content_count}`, x + 114, y + 82);
    ctx.fillText(`Tasdiq soni: ${row.approved_count}`, x + 114, y + 108);

    ctx.fillStyle = "#1277da";
    ctx.font = "600 14px 'Segoe UI'";
    ctx.fillText("Jami bonus", x + 114, y + 136);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 28px 'Segoe UI'";
    ctx.fillText(formatMoney(row.amount), x + 114, y + 162);
  });

  ctx.fillStyle = "#64748b";
  ctx.font = "500 16px 'Segoe UI'";
  ctx.fillText("aloo SMM panel • bonus approval export", outerPadding, height - 34);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `bonus-approval-${monthLabel}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  return true;
}

function BonusPage({ bonusItems = [], users = [], branches = [], settings, user, onToast, reload }) {
  const [monthFilter, setMonthFilter] = useState(getMonthLabel());
  const [tableSearch, setTableSearch] = useState("");
  const [tableFilter, setTableFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalRows, setApprovalRows] = useState([]);
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [bonusAuditRows, setBonusAuditRows] = useState([]);
  const [closingMonth, setClosingMonth] = useState(false);
  const [employeeDetail, setEmployeeDetail] = useState(null);
  const [markingPaid, setMarkingPaid] = useState(false);

  const emptyForm = {
    title: "",
    work_date: "",
    content_type: "post",
    difficulty_level: "sodda",
    work_url: "",
    user_id: "",
    editor_user_id: "",
    face_voice_user_id: "",
    branch_id: "",
    proposal_count: "",
    approved_count: ""
  };

  const [form, setForm] = useState(emptyForm);
  const isVideo = form.content_type === "video";
  const showBranchField = form.content_type === "video";
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const bonusRate = Number(settings?.bonus_rate || 25000);
  const canApproveBonus = isLeadershipRole(user?.role);
  const canCreateBonus = canDoAction(user, "bonus", "create");
  const canEditBonus = canDoAction(user, "bonus", "edit");
  const canDeleteBonus = canDoAction(user, "bonus", "delete");
  const bonusFormLocked = editRow ? !canEditBonus : !canCreateBonus;

  useEffect(() => {
    let cancelled = false;
    let running = false;
    let focusTimer = null;

    async function syncFromMySeOne() {
      if (running) return;
      running = true;
      try {
        await api.create("bonus-items/sync-from-myseone", {});
        if (!cancelled) {
          await reload();
        }
      } catch {
        // ignore sync hiccups and keep local page usable
      } finally {
        running = false;
      }
    }

    syncFromMySeOne();

    function handleFocus() {
      if (focusTimer) {
        clearTimeout(focusTimer);
      }
      focusTimer = setTimeout(() => {
        syncFromMySeOne();
      }, 250);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        handleFocus();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      if (focusTimer) {
        clearTimeout(focusTimer);
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [reload]);

  useEffect(() => {
    let cancelled = false;
    async function loadAuditRows() {
      try {
        const data = await api.list("/api/bonus-items/audit", { month: monthFilter });
        if (!cancelled) setBonusAuditRows(data || []);
      } catch {
        if (!cancelled) setBonusAuditRows([]);
      }
    }
    loadAuditRows();
    return () => {
      cancelled = true;
    };
  }, [monthFilter]);

  const monthOptions = useMemo(() => {
    return [...new Set(
      [getMonthLabel(), ...(bonusItems || []).map((item) => item.month_label || formatDate(item.work_date).slice(0, 7)).filter(Boolean)]
    )].sort((a, b) => b.localeCompare(a));
  }, [bonusItems]);

  const filteredItems = useMemo(() => {
    return sortRowsByDate(
      bonusItems.filter((item) =>
        monthFilter ? (item.month_label || formatDate(item.work_date).slice(0, 7)) === monthFilter : true
      ),
      "work_date"
    );
  }, [bonusItems, monthFilter]);
  const bonusFilterOptions = useMemo(() => {
    const dynamicTypes = [...new Set(filteredItems.map((item) => item.content_type).filter(Boolean))]
      .sort((a, b) => formatContentType(a).localeCompare(formatContentType(b)))
      .map((type) => ({ value: `type:${type}`, label: `Tur: ${formatContentType(type)}` }));
    return [
      { value: "all", label: "Filtr: Hammasi" },
      { value: "approval:draft", label: "Holat: Draft" },
      { value: "approval:approved", label: "Holat: Tasdiqlangan" },
      { value: "paid:pending", label: "To'lov: Pending" },
      { value: "paid:approved", label: "To'lov: Approved" },
      { value: "paid:paid", label: "To'lov: Paid" },
      ...BONUS_DIFFICULTY_OPTIONS.map((option) => ({
        value: `difficulty:${option.value}`,
        label: `Murakkablik: ${option.label}`
      })),
      ...dynamicTypes
    ];
  }, [filteredItems]);
  const visibleItems = useMemo(() => {
    return filteredItems.filter((row) => {
      const matchesFilter =
        tableFilter === "all"
          ? true
          : tableFilter.startsWith("approval:")
            ? (row.approval_status || "draft") === tableFilter.split(":")[1]
            : tableFilter.startsWith("paid:")
              ? (row.paid_status || "pending") === tableFilter.split(":")[1]
            : tableFilter.startsWith("difficulty:")
              ? normalizeDifficultyLevel(row.difficulty_level || "sodda") === tableFilter.split(":")[1]
              : tableFilter.startsWith("type:")
                ? (row.content_type || "") === tableFilter.slice(5)
                : true;

      const matchesSearch = rowMatchesSearch(
        [
          row.content_title,
          row.content_type,
          row.full_name,
          row.video_editor_name,
          row.video_face_name,
          row.branch_name,
          row.difficulty_level,
          formatDate(row.work_date)
        ],
        tableSearch
      );

      return matchesFilter && matchesSearch;
    });
  }, [filteredItems, tableFilter, tableSearch]);

  const totalProposalCount = filteredItems.reduce((sum, item) => sum + Number(item.proposal_count || 0), 0);
  const totalApprovedAmount = filteredItems.reduce((sum, item) => sum + Number(item.approved_amount || 0), 0);
  const totalAmount = filteredItems.reduce((sum, item) => sum + Number(item.total_amount || item.amount || 0), 0);
  const employeeStats = useMemo(() => summarizeBonusEmployees(filteredItems, bonusRate), [filteredItems, bonusRate]);
  const employeeTotalAmount = employeeStats.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const employeeBalanceStats = useMemo(() => summarizeBonusBalanceEmployees(filteredItems, bonusRate), [filteredItems, bonusRate]);
  const bonusLeaderboard = employeeBalanceStats.slice(0, 5);
  const pendingAmount = filteredItems
    .filter((item) => (item.paid_status || "pending") === "pending")
    .reduce((sum, item) => sum + getBonusEstimatedAmount(item, bonusRate), 0);
  const approvedReadyAmount = filteredItems
    .filter((item) => (item.paid_status || "pending") === "approved")
    .reduce((sum, item) => sum + Number(item.total_amount || item.approved_amount || 0), 0);
  const paidAmount = filteredItems
    .filter((item) => (item.paid_status || "pending") === "paid")
    .reduce((sum, item) => sum + Number(item.total_amount || item.approved_amount || 0), 0);
  const monthClosed = filteredItems.some((item) => item.monthly_closed_at);
  const paidRowsCount = filteredItems.filter((item) => (item.paid_status || "pending") === "paid").length;
  const approvalEmployeeStats = useMemo(() => summarizeBonusEmployees(approvalRows, bonusRate), [approvalRows, bonusRate]);
  const approvalEmployeeTotal = approvalEmployeeStats.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const approvedRowCount = filteredItems.filter((item) => item.approval_status === "approved").length;
  const monthApproved = !!filteredItems.length && approvedRowCount === filteredItems.length;
  const lastApprovalMeta = useMemo(() => {
    return [...filteredItems]
      .filter((item) => item.approval_status === "approved" && item.approved_at)
      .sort((a, b) => new Date(b.approved_at).getTime() - new Date(a.approved_at).getTime())[0] || null;
  }, [filteredItems]);

  function buildApprovalRows(items) {
    return (items || []).map((item) => ({
      ...item,
      difficulty_level: normalizeDifficultyLevel(item.difficulty_level || "sodda"),
      proposal_count: Number(item.proposal_count || 0),
      approved_count: Number(item.approved_count || 0),
      total_amount: getBonusRowAmount(item, bonusRate),
      proposal_amount: 0,
      approved_amount: Number(item.approved_count || 0) * getDifficultyUnitAmount(item.difficulty_level || "sodda")
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    if (!canEditBonus) {
      onToast("Sizda bonusni tahrirlash ruxsati yo'q", "error");
      return;
    }
    setEditRow(row);
    setForm({
      title: row.content_title || "",
      work_date: formatDate(row.work_date) === "-" ? "" : formatDate(row.work_date),
      content_type: row.content_type || "post",
      difficulty_level: normalizeDifficultyLevel(row.difficulty_level || "sodda"),
      work_url: row.work_url || "",
      user_id: row.user_id || "",
      editor_user_id: row.video_editor_user_id || "",
      face_voice_user_id: row.video_face_user_id || "",
      branch_id: row.branch_id || "",
      proposal_count: row.proposal_count ?? "",
      approved_count: row.approved_count ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openApprovalModal() {
    if (!filteredItems.length) {
      onToast("Tasdiqlash uchun bonus yozuvlari topilmadi", "error");
      return;
    }
    setApprovalRows(buildApprovalRows(filteredItems));
    setApprovalOpen(true);
  }

  function updateApprovalCount(id, value) {
    const sanitized = value === "" ? "" : Math.max(0, Number(value) || 0);
    setApprovalRows((prev) => prev.map((row) => {
      if (row.id !== id) return row;
      const nextApprovedCount = Number(sanitized || 0);
      const unitAmount = getDifficultyUnitAmount(row.difficulty_level || "sodda");
      return {
        ...row,
        approved_count: sanitized,
        approved_amount: nextApprovedCount * unitAmount,
        total_amount: nextApprovedCount * unitAmount
      };
    }));
  }

  async function handleApproveMonth() {
    if (!approvalRows.length) {
      onToast("Tasdiqlash uchun yozuv topilmadi", "error");
      return;
    }

    try {
      setApprovalSaving(true);
      await api.create("bonus-items/approve-month", {
        month_label: monthFilter,
        items: approvalRows.map((row) => ({
          id: row.id,
          approved_count: Number(row.approved_count || 0)
        }))
      });
      await reload();
      setApprovalOpen(false);
      onToast(`${getMonthTitle(monthFilter)} bonuslari tasdiqlandi`, "success");
    } catch (err) {
      onToast(err.message || "Bonuslarni tasdiqlab bo'lmadi", "error");
    } finally {
      setApprovalSaving(false);
    }
  }

  async function handleRevokeMonth() {
    const ok = window.confirm(`${getMonthTitle(monthFilter)} oyidagi tasdiqlarni bekor qilaymi?`);
    if (!ok) return;

    try {
      setApprovalSaving(true);
      await api.create("bonus-items/revoke-month", { month_label: monthFilter });
      await reload();
      setApprovalRows([]);
      setApprovalOpen(false);
      onToast(`${getMonthTitle(monthFilter)} bonus tasdig'i bekor qilindi`, "success");
    } catch (err) {
      onToast(err.message || "Tasdiqni bekor qilib bo'lmadi", "error");
    } finally {
      setApprovalSaving(false);
    }
  }

  async function handleMonthlyClose() {
    const ok = window.confirm(`${getMonthTitle(monthFilter)} bonus oyini yopib, tasdiqlanmagan yozuvlarni ham payrollga tayyorlaymizmi?`);
    if (!ok) return;

    try {
      setClosingMonth(true);
      await api.create("bonus-items/monthly-close", { month_label: monthFilter });
      await reload();
      const auditRows = await api.list("/api/bonus-items/audit", { month: monthFilter }).catch(() => []);
      setBonusAuditRows(auditRows || []);
      onToast(`${getMonthTitle(monthFilter)} bonus oyi yopildi`, "success");
    } catch (err) {
      onToast(err.message || "Monthly close bajarilmadi", "error");
    } finally {
      setClosingMonth(false);
    }
  }

  async function handleMarkPaid() {
    const ok = window.confirm(`${getMonthTitle(monthFilter)} tasdiqlangan bonuslarini Paid holatiga o'tkazaymi?`);
    if (!ok) return;

    try {
      setMarkingPaid(true);
      await api.create("bonus-items/mark-paid", { month_label: monthFilter });
      await reload();
      const auditRows = await api.list("/api/bonus-items/audit", { month: monthFilter }).catch(() => []);
      setBonusAuditRows(auditRows || []);
      onToast(`${getMonthTitle(monthFilter)} bonuslari Paid holatiga o'tdi`, "success", { center: true });
    } catch (err) {
      onToast(err.message || "Paid statusini berib bo'lmadi", "error");
    } finally {
      setMarkingPaid(false);
    }
  }

  function handleDownloadApprovalImage() {
    if (!monthApproved) {
      onToast("Avval oylik bonusni tasdiqlang", "error");
      return;
    }

    const exported = downloadBonusApprovalImage({
      monthLabel: monthFilter,
      employeeRows: employeeStats,
      approvedByName: lastApprovalMeta?.approved_by_name || user?.full_name || "Rahbar",
      approvedAt: lastApprovalMeta?.approved_at,
      totalAmount: employeeTotalAmount,
      uniqueTotalAmount: totalAmount,
      contentCount: filteredItems.length
    });

    if (exported) {
      onToast("Bonus hisoboti rasm sifatida yuklab olindi", "success");
    } else {
      onToast("Rasm eksportini tayyorlab bo'lmadi", "error");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (editRow && !canEditBonus) {
      onToast("Sizda bonusni tahrirlash ruxsati yo'q", "error");
      return;
    }

    if (!editRow && !canCreateBonus) {
      onToast("Sizda bonus qo'shish ruxsati yo'q", "error");
      return;
    }

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
        work_url: normalizeExternalUrl(form.work_url),
        proposal_count: Number(form.proposal_count || 0),
        approved_count: Number(form.approved_count || 0),
        difficulty_level: normalizeDifficultyLevel(form.difficulty_level || "sodda"),
        user_id: isVideo ? null : form.user_id || null,
        video_editor_user_id: isVideo ? form.editor_user_id || null : null,
        video_face_user_id: isVideo ? form.face_voice_user_id || null : null,
        branch_id: showBranchField ? form.branch_id || null : null
      };

      if (editRow?.id) {
        if (editRow.monthly_closed_at || editRow.paid_status === "paid") {
          const reason = window.prompt("Bu bonus oyi yopilgan yoki to'langan. O'zgartirish sababini yozing:");
          if (!reason?.trim()) {
            onToast("Audit sababi kiritilmadi", "error");
            return;
          }
          payload.audit_reason = reason.trim();
        }
        await api.update("bonus-items", editRow.id, payload);
        onToast("Bonus hisobot yangilandi", "success", { center: true });
      } else {
        await api.create("bonus-items", payload);
        onToast("Bonus hisobot saqlandi", "success", { center: true });
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
    if (!canDeleteBonus) {
      onToast("Sizda bonusni o'chirish ruxsati yo'q", "error");
      return;
    }
    const ok = window.confirm("Rostdan ham o'chirilsinmi?");
    if (!ok) return;
    try {
      const numericId = Number(id);
      if (!numericId) {
        onToast("Bonus ID topilmadi", "error");
        return;
      }
      const row = filteredItems.find((item) => Number(item.id) === numericId);
      if (row?.monthly_closed_at || row?.paid_status === "paid") {
        const reason = window.prompt("Bu bonus oyi yopilgan yoki to'langan. O'chirish sababini yozing:");
        if (!reason?.trim()) {
          onToast("Audit sababi kiritilmadi", "error");
          return;
        }
        await api.post(`/api/bonus-items/${numericId}/delete-with-audit`, { audit_reason: reason.trim() });
      } else {
        await api.remove("bonus-items", numericId);
      }
      await reload();
      onToast("Bonus yozuvi o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "O'chirishda xatolik", "error");
    }
  }

  const employeeDetailItems = employeeDetail
    ? filteredItems.filter((item) => getBonusParticipantNames(item).includes(employeeDetail.name))
    : [];

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
              <button
                type="button"
                className="btn secondary"
                onClick={() => api.exportFile(`/api/export/bonus-payroll.xlsx?month=${monthFilter}`, `bonus-payroll-${monthFilter}.xlsx`)}
              >
                Payroll export
              </button>
              {canApproveBonus ? (
                <>
                  <button type="button" className="btn secondary" onClick={handleMarkPaid} disabled={markingPaid || !approvedRowCount || paidRowsCount === approvedRowCount}>
                    {markingPaid ? "Belgilanmoqda..." : "Paid qilish"}
                  </button>
                  <button type="button" className="btn primary" onClick={handleMonthlyClose} disabled={closingMonth || !filteredItems.length || monthClosed}>
                    {closingMonth ? "Yopilmoqda..." : monthClosed ? "Oy yopilgan" : "Monthly close"}
                  </button>
                </>
              ) : null}
            </div>
          }
        />

        <div className="info-banner">
          Bonus formulasi: <strong>Sodda 25,000 UZS</strong>, <strong>O'rta 50,000 UZS</strong>, <strong>Murakkab 75,000 UZS</strong>, <strong>Juda murakkab 100,000 UZS</strong>, <strong>Bonussiz 0 UZS</strong>.
        </div>

        <div className="stats-grid">
          <StatCard title="Taklif soni" value={totalProposalCount} hint="joriy oy" />
          <StatCard title="Tasdiq summasi" value={formatMoney(totalApprovedAmount)} hint="joriy oy" />
          <StatCard title="Jami bonus" value={formatMoney(totalAmount)} hint={getMonthTitle(monthFilter)} />
          <StatCard title="Yozuvlar soni" value={filteredItems.length} hint="bonus hisobotlar" />
        </div>

        <div className="stats-grid bonus-close-grid">
          <StatCard title="Pending balans" value={formatMoney(pendingAmount)} hint="taxminiy hisob" tone="warning" />
          <StatCard title="Approved" value={formatMoney(approvedReadyAmount)} hint="payrollga tayyor" tone="info" />
          <StatCard title="Paid" value={formatMoney(paidAmount)} hint={`${paidRowsCount} yozuv to'langan`} tone="success" />
          <StatCard title="Monthly close" value={monthClosed ? "Locked" : "Open"} hint={monthClosed ? "audit sabab bilan o'zgaradi" : "yopilmagan"} tone={monthClosed ? "warning" : "default"} />
        </div>

        <BonusPlasticCards
          rows={employeeBalanceStats}
          monthLabel={monthFilter}
          title="Hodim bonus balanslari"
          onSelect={setEmployeeDetail}
        />
      </div>

      <div className="bonus-command-grid">
        <div className="card bonus-command-card">
          <SectionTitle title="Leaderboard" desc="Bonus, kontent va tasdiq bo'yicha top hodimlar" />
          <div className="leaderboard-list">
            {bonusLeaderboard.length ? bonusLeaderboard.map((row, index) => (
              <div key={`leaderboard-${row.name}`} className="leaderboard-row">
                <span className="leaderboard-rank">{index + 1}</span>
                <div>
                  <strong>{row.name}</strong>
                  <small>{row.content_count} kontent • {row.approved_count || row.proposal_count || 0} birlik</small>
                </div>
                <b>{formatMoney(row.amount)}</b>
              </div>
            )) : <div className="empty-block">Leaderboard uchun ma'lumot yo'q</div>}
          </div>
        </div>

        <div className="card bonus-command-card">
          <SectionTitle title="Bonus audit log" desc="Tasdiq, close, export va o'zgarishlar" />
          <div className="audit-mini-list">
            {bonusAuditRows.length ? bonusAuditRows.slice(0, 7).map((row) => (
              <div key={`bonus-audit-${row.id}`} className="audit-mini-row">
                <span>{String(row.action_type || "update").replaceAll("_", " ")}</span>
                <strong>{row.full_name || "Platforma"}</strong>
                <small>{formatDateTime(row.created_at)}</small>
              </div>
            )) : <div className="empty-block">Bu oy uchun audit yozuvi yo'q</div>}
          </div>
        </div>
      </div>

      <div className="card">
        <SectionTitle title={editRow ? "Bonus hisobotni tahrirlash" : "Hisobot qo'shish"} />
        {!canCreateBonus && !canEditBonus ? (
          <div className="info-banner">Siz bu bo'limda faqat ko'rish ruxsatiga egasiz.</div>
        ) : null}
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Kontent nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required disabled={bonusFormLocked} /></label>
          <label><span>Joylangan sanasi</span><input type="date" value={form.work_date} onChange={(e) => setField("work_date", e.target.value)} required disabled={bonusFormLocked} /></label>
          <label>
            <span>Kontent turi</span>
            <select value={form.content_type} onChange={(e) => setField("content_type", e.target.value)} disabled={bonusFormLocked}>
              {CONTENT_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>

          {isVideo ? (
            <>
              <label>
                <span>Montajni kim qildi</span>
                <select value={form.editor_user_id} onChange={(e) => setField("editor_user_id", e.target.value)} disabled={bonusFormLocked}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>

              <label>
                <span>Face + ovoz kimniki</span>
                <select value={form.face_voice_user_id} onChange={(e) => setField("face_voice_user_id", e.target.value)} disabled={bonusFormLocked}>
                  <option value="">Tanlang</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label>
              <span>Hodim</span>
              <select value={form.user_id} onChange={(e) => setField("user_id", e.target.value)} disabled={bonusFormLocked}>
                <option value="">Tanlang</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </label>
          )}

          {showBranchField ? (
            <label>
              <span>Filial</span>
              <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)} disabled={bonusFormLocked}>
                <option value="">Tanlang</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </label>
          ) : null}

          <label>
            <span>Murakkablik darajasi</span>
            <select value={form.difficulty_level} onChange={(e) => setField("difficulty_level", e.target.value)} disabled={bonusFormLocked}>
              {BONUS_DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label><span>Taklif soni</span><input type="number" min="0" value={form.proposal_count} onChange={(e) => setField("proposal_count", e.target.value)} required disabled={bonusFormLocked} /></label>
          <label><span>Tasdiq soni</span><input type="number" min="0" value={form.approved_count} onChange={(e) => setField("approved_count", e.target.value)} disabled={bonusFormLocked} /></label>
          <label className="full-col">
            <span>Qilingan ish linki</span>
            <input
              value={form.work_url}
              onChange={(e) => setField("work_url", e.target.value)}
              placeholder="https://instagram.com/... yoki tayyor ish havolasi"
              disabled={bonusFormLocked}
            />
          </label>

          <button className="btn primary" type="submit" disabled={saving || bonusFormLocked}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Hisobotni saqlash"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle
          title="Hodim bo'yicha bonus summalari"
          right={canApproveBonus ? (
            <div className="toolbar-actions">
              <span className={`mini-badge ${monthApproved ? "success" : "warning"}`}>
                {monthApproved ? "Tasdiqlangan" : "Tasdiqlanmagan"}
              </span>
              <button type="button" className="btn secondary" onClick={openApprovalModal} disabled={!filteredItems.length}>
                Oylik bonusni tasdiqlash
              </button>
              {approvedRowCount ? (
                <button type="button" className="btn secondary" onClick={handleRevokeMonth}>
                  Tasdiqni bekor qilish
                </button>
              ) : null}
              {monthApproved ? (
                <button type="button" className="btn secondary" onClick={handleDownloadApprovalImage}>
                  Chop etish
                </button>
              ) : null}
            </div>
          ) : null}
        />
        {lastApprovalMeta ? (
          <div className="bonus-approval-meta">
            Oxirgi tasdiq: <strong>{lastApprovalMeta.approved_by_name || "Rahbar"}</strong> • {formatDateTime(lastApprovalMeta.approved_at)}
          </div>
        ) : null}
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Hodim</th>
                <th>Kontent soni</th>
                <th>Jami bonus</th>
              </tr>
            </thead>
            <tbody>
              {employeeStats.length ? (
                <>
                  {employeeStats.map((row, idx) => (
                    <tr key={`${row.name}-${idx}`}>
                      <td>{row.name}</td>
                      <td>{row.content_count}</td>
                      <td>{formatMoney(row.amount)}</td>
                    </tr>
                  ))}
                  <tr className="summary-row">
                    <td><strong>Jami</strong></td>
                    <td><strong>{employeeStats.reduce((sum, row) => sum + Number(row.content_count || 0), 0)}</strong></td>
                    <td><strong>{formatMoney(employeeTotalAmount)}</strong></td>
                  </tr>
                </>
              ) : (
                <tr><td colSpan="3" className="empty-cell">Bu oy uchun bonus yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <SectionTitle
          title={`${getMonthTitle(monthFilter)} bonus yozuvlari`}
          right={
            <div className="toolbar-actions">
              <label className="table-filter" aria-label="Bonus filtri">
                <Filter size={16} />
                <select value={tableFilter} onChange={(e) => setTableFilter(e.target.value)}>
                  {bonusFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="table-search" aria-label="Bonus qidiruvi">
                <Search size={16} />
                <input
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  placeholder="Bonus, hodim yoki turdan qidiring..."
                />
              </label>
            </div>
          }
        />
        <div className="table-wrap desktop-table">
          <table>
            <thead>
              <tr>
                <th>Kontent nomi</th>
                <th>Sana</th>
                <th>Turi</th>
                <th>Hodim / Video</th>
                <th>Kontent holati</th>
                <th>Taklif</th>
                <th>Tasdiq</th>
                <th>Jami</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.length ? (
                visibleItems.map((row) => {
                  const difficultyMeta = getBonusDifficultyMeta(row);
                  return (
                    <tr key={row.id} className={difficultyMeta.rowClass}>
                      <td>
                        <div className="table-title-cell">
                          <strong className="table-title-main">{row.content_title || "-"}</strong>
                          <div className="table-title-sub">
                            {row.work_url ? (
                              <button type="button" className="table-inline-link" onClick={() => openExternalUrl(row.work_url)}>
                                Havolani ochish
                              </button>
                            ) : "Bonus kartasi"}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="table-date-stack">
                          <strong>{formatDate(row.work_date)}</strong>
                          <span>{row.work_url ? "Link ulangan" : "Link yo'q"}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`table-chip type ${contentTypeChipTone(row.content_type)}`}>
                          {formatContentType(row.content_type)}
                        </span>
                      </td>
                      <td>
                        <div className="table-person-stack">
                          {getBonusParticipantNames(row).length ? getBonusParticipantNames(row).map((name, idx) => (
                            <span key={`${row.id}-bonus-person-${idx}`} className="table-person">{name}</span>
                          )) : <span className="table-cell-muted">-</span>}
                        </div>
                      </td>
                      <td><span className={difficultyMeta.badgeClass}>{difficultyMeta.label}</span></td>
                      <td><span className="table-compact-metric">{row.proposal_count || 0}</span></td>
                      <td><span className="table-compact-metric approved">{row.approved_count || 0}</span></td>
                      <td><span className="table-compact-amount">{formatMoney(row.total_amount || row.amount || 0)}</span></td>
                      <td>
                        <span className={`mini-badge ${row.paid_status === "paid" ? "success" : row.approval_status === "approved" ? "info" : "warning"}`}>
                          {row.paid_status === "paid" ? "Paid" : row.approval_status === "approved" ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions-shell">
                          <IconActions
                            onView={() => setViewRow(row)}
                            onEdit={canEditBonus ? () => startEdit(row) : null}
                            onDelete={canDeleteBonus ? () => removeRow(row.id) : null}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr><td colSpan="10" className="empty-cell">{tableSearch.trim() || tableFilter !== "all" ? "Qidiruv yoki filtr bo'yicha bonus yozuvi topilmadi" : "Bu oy uchun bonus yozuvi yo'q"}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {visibleItems.length ? (
            visibleItems.map((row) => {
              const difficultyMeta = getBonusDifficultyMeta(row);
              return (
                <div key={`bonus-card-${row.id}`} className={`mobile-record-card ${["murakkab", "juda_murakkab"].includes(normalizeDifficultyLevel(row.difficulty_level)) ? "danger" : ""}`}>
                  <div className="mobile-record-head">
                    <div className="mobile-record-title">
                      <strong>{row.content_title || "-"}</strong>
                      <span>{formatDate(row.work_date)} • {formatContentType(row.content_type)}</span>
                    </div>
                    <span className={`mini-badge ${row.paid_status === "paid" ? "success" : row.approval_status === "approved" ? "info" : "warning"}`}>
                      {row.paid_status === "paid" ? "Paid" : row.approval_status === "approved" ? "Approved" : "Pending"}
                    </span>
                  </div>
                  <div className="mobile-record-grid">
                    <div className="mobile-record-field full">
                      <label>Hodim / Video</label>
                      <div>{getBonusAssigneeLabel(row)}</div>
                    </div>
                    <div className="mobile-record-field">
                      <label>Kontent holati</label>
                      <div><span className={difficultyMeta.badgeClass}>{difficultyMeta.label}</span></div>
                    </div>
                    <div className="mobile-record-field">
                      <label>Taklif</label>
                      <div>{row.proposal_count || 0}</div>
                    </div>
                    <div className="mobile-record-field">
                      <label>Tasdiq</label>
                      <div>{row.approved_count || 0}</div>
                    </div>
                    <div className="mobile-record-field">
                      <label>Jami</label>
                      <div>{formatMoney(row.total_amount || row.amount || 0)}</div>
                    </div>
                  </div>
                  <div className="mobile-record-actions">
                    <IconActions
                      onView={() => setViewRow(row)}
                      onEdit={canEditBonus ? () => startEdit(row) : null}
                      onDelete={canDeleteBonus ? () => removeRow(row.id) : null}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="mobile-record-card empty">
              {tableSearch.trim() || tableFilter !== "all" ? "Qidiruv yoki filtr bo'yicha bonus yozuvi topilmadi" : "Bu oy uchun bonus yozuvi yo'q"}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        title={`${getMonthTitle(monthFilter)} bonuslarini tasdiqlash`}
        wide
      >
        <div className="bonus-approval-stack">
          <div className="info-banner">
            Rahbar oynasi: faqat <strong>Tasdiq soni</strong> maydoni ochiq. Qolgan barcha ustunlar faqat ko'rish uchun.
          </div>
          <div className="bonus-approval-meta">
            {monthApproved
              ? "Bu oy tasdiqlangan. Zarurat bo'lsa tasdiq sonlarini yangilab qayta saqlashingiz mumkin."
              : "Tasdiqlashdan keyin rahbar uchun chop etish tugmasi faollashadi."}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Kontent nomi</th>
                  <th>Havola</th>
                  <th>Sana</th>
                  <th>Turi</th>
                  <th>Hodim / Video</th>
                  <th>Kontent holati</th>
                  <th>Taklif</th>
                  <th>Tasdiq soni</th>
                  <th>Jami bonus</th>
                </tr>
              </thead>
              <tbody>
                {approvalRows.length ? (
                  approvalRows.map((row) => {
                    const difficultyMeta = getBonusDifficultyMeta(row);
                    return (
                      <tr key={`approval-${row.id}`} className={difficultyMeta.rowClass}>
                        <td>{row.content_title || "-"}</td>
                        <td>
                          {row.work_url ? (
                            <button
                              type="button"
                              className="icon-btn"
                              title="Havolani ochish"
                              onClick={() => openExternalUrl(row.work_url)}
                            >
                              <Eye size={16} />
                            </button>
                          ) : "-"}
                        </td>
                        <td>{formatDate(row.work_date)}</td>
                        <td>{formatContentType(row.content_type)}</td>
                        <td>{getBonusAssigneeLabel(row)}</td>
                        <td><span className={difficultyMeta.badgeClass}>{difficultyMeta.label}</span></td>
                        <td>{row.proposal_count || 0}</td>
                        <td>
                          <input
                            className="bonus-approval-input"
                            type="number"
                            min="0"
                            value={row.approved_count ?? 0}
                            onChange={(e) => updateApprovalCount(row.id, e.target.value)}
                          />
                        </td>
                        <td>{formatMoney(row.total_amount || 0)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="9" className="empty-cell">Tasdiqlash uchun yozuv topilmadi</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="bonus-approval-summary">
            <SectionTitle title="Hodim bo'yicha jami" />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Hodim</th>
                    <th>Kontent soni</th>
                    <th>Tasdiq birlik</th>
                    <th>Jami bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {approvalEmployeeStats.length ? (
                    <>
                      {approvalEmployeeStats.map((row, idx) => (
                        <tr key={`approval-summary-${row.name}-${idx}`}>
                          <td>{row.name}</td>
                          <td>{row.content_count}</td>
                          <td>{row.approved_count}</td>
                          <td>{formatMoney(row.amount)}</td>
                        </tr>
                      ))}
                      <tr className="summary-row">
                        <td><strong>Jami</strong></td>
                        <td><strong>{approvalEmployeeStats.reduce((sum, row) => sum + Number(row.content_count || 0), 0)}</strong></td>
                        <td><strong>{approvalEmployeeStats.reduce((sum, row) => sum + Number(row.approved_count || 0), 0)}</strong></td>
                        <td><strong>{formatMoney(approvalEmployeeTotal)}</strong></td>
                      </tr>
                    </>
                  ) : (
                    <tr><td colSpan="4" className="empty-cell">Hodim bo'yicha jamlanma yo'q</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bonus-approval-footer">
            <div className="bonus-approval-total">
              <span>Yozuvlar: {approvalRows.length}</span>
              <strong>Hodimlar bo'yicha jami: {formatMoney(approvalEmployeeTotal)}</strong>
            </div>
            <div className="toolbar-actions">
              <button type="button" className="btn secondary" onClick={() => setApprovalOpen(false)}>
                Yopish
              </button>
              {approvedRowCount ? (
                <button type="button" className="btn secondary" onClick={handleRevokeMonth} disabled={approvalSaving}>
                  Tasdiqni bekor qilish
                </button>
              ) : null}
              <button type="button" className="btn primary" onClick={handleApproveMonth} disabled={approvalSaving || !approvalRows.length}>
                {approvalSaving ? "Tasdiqlanmoqda..." : "Tasdiqlash"}
              </button>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={!!employeeDetail} onClose={() => setEmployeeDetail(null)} title={`${employeeDetail?.name || "Hodim"} bonus drill-down`} wide>
        {employeeDetail ? (
          <div className="bonus-drilldown">
            <div className="stats-grid">
              <StatCard title="Kontent" value={employeeDetail.content_count} hint={getMonthTitle(monthFilter)} />
              <StatCard title="Taklif" value={employeeDetail.proposal_count} hint="jami birlik" tone="warning" />
              <StatCard title="Tasdiq" value={employeeDetail.approved_count} hint="approved birlik" tone="info" />
              <StatCard title="Balans" value={formatMoney(employeeDetail.amount)} hint="taxminiy / tasdiqlangan" tone="success" />
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Kontent</th>
                    <th>Sana</th>
                    <th>Turi</th>
                    <th>Taklif</th>
                    <th>Tasdiq</th>
                    <th>To'lov</th>
                    <th>Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeDetailItems.length ? employeeDetailItems.map((row) => (
                    <tr key={`employee-detail-${row.id}`}>
                      <td>{row.content_title || "-"}</td>
                      <td>{formatDate(row.work_date)}</td>
                      <td>{formatContentType(row.content_type)}</td>
                      <td>{row.proposal_count || 0}</td>
                      <td>{row.approved_count || 0}</td>
                      <td>
                        <span className={`mini-badge ${row.paid_status === "paid" ? "success" : row.approval_status === "approved" ? "info" : "warning"}`}>
                          {row.paid_status === "paid" ? "Paid" : row.approval_status === "approved" ? "Approved" : "Pending"}
                        </span>
                      </td>
                      <td>{formatMoney(getBonusEstimatedAmount(row, bonusRate))}</td>
                    </tr>
                  )) : <tr><td colSpan="7" className="empty-cell">Bu hodim bo'yicha yozuv topilmadi</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Bonus yozuvi tafsiloti">
        {viewRow ? (
          <>
            <div className="detail-grid">
              <div><strong>Kontent nomi:</strong> {viewRow.content_title || "-"}</div>
              <div><strong>Sana:</strong> {formatDate(viewRow.work_date)}</div>
              <div><strong>Turi:</strong> {formatContentType(viewRow.content_type)}</div>
              <div><strong>Hodim / Video:</strong> {getBonusAssigneeLabel(viewRow)}</div>
              <div><strong>Kontent holati:</strong> {getBonusDifficultyMeta(viewRow).label}</div>
              <div><strong>Taklif:</strong> {viewRow.proposal_count || 0}</div>
              <div><strong>Tasdiq:</strong> {viewRow.approved_count || 0}</div>
              <div><strong>Holat:</strong> {viewRow.paid_status === "paid" ? "Paid" : viewRow.approval_status === "approved" ? "Approved" : "Pending"}</div>
              <div><strong>Jami:</strong> {formatMoney(viewRow.total_amount || viewRow.amount || 0)}</div>
              <div className="full-col">
                <strong>Qilingan ish linki:</strong>{" "}
                {viewRow.work_url ? (
                  <a href={normalizeExternalUrl(viewRow.work_url)} target="_blank" rel="noreferrer">
                    Havolani ochish
                  </a>
                ) : "-"}
              </div>
              <div className="full-col"><strong>Tasdiqlagan:</strong> {viewRow.approved_by_name || "-"}</div>
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
    subscriber_count: 0,
    condition_text: "",
    notes: ""
  };

  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const filteredReports = sortRowsByDate(
    filterDate
      ? reports.filter((row) => formatDate(row.report_date) === filterDate)
      : reports,
    "report_date"
  );

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
        onToast("Hisobot yangilandi", "success");
      } else {
        await api.create("daily-reports", form);
        onToast("Saqlandi", "success");
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
    const ok = window.confirm("Rostdan ham o'chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("daily-reports", id);
      await reload();
      onToast("Hisobot o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "O'chirishda xatolik", "error");
    }
  }

  return (
    <div className="page-grid">
      <DailyReportImageImportPanel onToast={onToast} reload={reload} />

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
          <label><span>Obunachi soni</span><input type="number" min="0" value={form.subscriber_count} onChange={(e) => setField("subscriber_count", Number(e.target.value))} /></label>
          <label><span>AHVAT</span><input value={form.condition_text} onChange={(e) => setField("condition_text", e.target.value)} /></label>
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
                <th>Obunachi soni</th>
                <th>AHVAT</th>
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
                <tr><td colSpan="8" className="empty-cell">Hozircha ma'lumot yo'q</td></tr>
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
            <div><strong>Obunachi soni:</strong> {viewRow.subscriber_count || 0}</div>
            <div><strong>AHVAT:</strong> {viewRow.condition_text || "-"}</div>
            <div><strong>Izoh:</strong> {viewRow.notes || "-"}</div>
          </div>
          <DiscussionPanel entityType="daily_report" entityId={viewRow.id} onToast={onToast} />
          </>
        ) : null}
      </Modal>
    </div>
  );
}

function CampaignsPage({ campaigns = [], branches = [], onToast, reload }) {
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);

  const emptyForm = {
    title: "",
    platform: "Meta Ads",
    branch_id: "",
    lead_chat_id: "",
    start_at: "",
    end_at: "",
    daily_budget: "",
    status: "active"
  };

  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const diff = getDateSortValue(a.start_at || a.start_date, Number.POSITIVE_INFINITY) - getDateSortValue(b.start_at || b.start_date, Number.POSITIVE_INFINITY);
    return diff !== 0 ? diff : Number(a.id || 0) - Number(b.id || 0);
  });

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    setEditRow(row);
    setForm({
      title: row.title || "",
      platform: row.platform || "",
      branch_id: row.branch_id ? String(row.branch_id) : "",
      lead_chat_id: row.lead_chat_id ? String(row.lead_chat_id) : "",
      start_at: formatDateTimeInput(row.start_at || row.start_date),
      end_at: formatDateTimeInput(row.end_at || row.end_date),
      daily_budget: String(getCampaignDailyBudget(row) || ""),
      status: row.status || "active"
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = {
        title: form.title.trim(),
        platform: form.platform,
        branch_id: form.branch_id ? Number(form.branch_id) : null,
        lead_chat_id: String(form.lead_chat_id || "").trim(),
        start_at: form.start_at,
        end_at: form.end_at,
        daily_budget: Number(form.daily_budget || 0),
        status: form.status || "active"
      };
      if (editRow?.id) {
        await api.update("campaigns", editRow.id, payload);
        onToast("Kampaniya yangilandi", "success");
      } else {
        await api.create("campaigns", payload);
        onToast("Kampaniya saqlandi", "success");
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
    const ok = window.confirm("Rostdan ham o'chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("campaigns", id);
      await reload();
      onToast("Kampaniya o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "O'chirishda xatolik", "error");
    }
  }

  async function copyLeadFormLink(row) {
    try {
      await navigator.clipboard.writeText(getCampaignLeadFormUrl(row.id));
      onToast("Forma linki nusxalandi", "success");
    } catch {
      onToast("Forma linkini nusxalab bo'lmadi", "error");
    }
  }

  function openLeadForm(row) {
    window.open(getCampaignLeadFormUrl(row.id), "_blank", "noopener,noreferrer");
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
          <label>
            <span>Platforma</span>
            <select value={form.platform} onChange={(e) => setField("platform", e.target.value)} required>
              {CAMPAIGN_PLATFORM_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Filial</span>
            <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)} required>
              <option value="">Tanlang</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Lidlar boradigan Telegram guruh ID</span>
            <input
              value={form.lead_chat_id}
              onChange={(e) => setField("lead_chat_id", e.target.value)}
              placeholder="-1003878116355"
            />
          </label>
          <label><span>Boshlanish sana va soat</span><input type="datetime-local" value={form.start_at} onChange={(e) => setField("start_at", e.target.value)} required /></label>
          <label><span>Tugash sana va soat</span><input type="datetime-local" value={form.end_at} onChange={(e) => setField("end_at", e.target.value)} required /></label>
          <label><span>Kunlik budget</span><input type="number" min="0" value={form.daily_budget} onChange={(e) => setField("daily_budget", e.target.value)} required /></label>
          <label>
            <span>Target holati</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">Faol</option>
              <option value="paused">Pauza</option>
              <option value="done">Tugagan</option>
            </select>
          </label>
          <button className="btn primary" type="submit" disabled={saving}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Kampaniya qo'shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Kampaniyalar ro'yxati" />
        <div className="table-wrap desktop-table">
          <table>
            <thead>
              <tr>
                <th>Kampaniya</th>
                <th>Platforma</th>
                <th>Filial</th>
                <th>Boshlanish</th>
                <th>Tugash</th>
                <th>Kunlik budget</th>
                <th>Holat</th>
                <th>Amallar</th>
              </tr>
            </thead>
            <tbody>
              {sortedCampaigns.length ? (
                sortedCampaigns.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.platform}</td>
                    <td>{row.branch_name || "-"}</td>
                    <td>{formatDateTime(row.start_at || row.start_date)}</td>
                    <td>{formatDateTime(row.end_at || row.end_date)}</td>
                    <td>{formatUsd(getCampaignDailyBudget(row))}</td>
                    <td><span className={campaignStatusClass(row.status)}>{formatCampaignStatus(row.status)}</span></td>
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn tiny secondary" onClick={() => openLeadForm(row)}>
                          <Link2 size={14} />
                          Forma
                        </button>
                        <button type="button" className="btn tiny secondary" onClick={() => copyLeadFormLink(row)}>
                          <Copy size={14} />
                          Nusxalash
                        </button>
                        <IconActions
                          onView={() => setViewRow(row)}
                          onEdit={() => startEdit(row)}
                          onDelete={() => removeRow(row.id)}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan="8" className="empty-cell">Hozircha ma'lumot yo'q</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {sortedCampaigns.length ? (
            sortedCampaigns.map((row) => (
              <div key={`campaign-card-${row.id}`} className="mobile-record-card">
                <div className="mobile-record-head">
                  <div className="mobile-record-title">
                    <strong>{row.title}</strong>
                    <span>{row.platform} • {row.branch_name || "Filialsiz"}</span>
                  </div>
                  <span className={campaignStatusClass(row.status)}>{formatCampaignStatus(row.status)}</span>
                </div>
                <div className="mobile-record-grid">
                  <div className="mobile-record-field">
                    <label>Boshlanish</label>
                    <div>{formatDateTime(row.start_at || row.start_date)}</div>
                  </div>
                  <div className="mobile-record-field">
                    <label>Tugash</label>
                    <div>{formatDateTime(row.end_at || row.end_date)}</div>
                  </div>
                  <div className="mobile-record-field">
                    <label>Kunlik budget</label>
                    <div>{formatUsd(getCampaignDailyBudget(row))}</div>
                  </div>
                  <div className="mobile-record-field">
                    <label>Leadlar</label>
                    <div>{row.lead_count || 0} ta</div>
                  </div>
                  <div className="mobile-record-field">
                    <label>Lead chat ID</label>
                    <div>{row.lead_chat_id || "-"}</div>
                  </div>
                </div>
                <div className="mobile-record-actions">
                  <button type="button" className="btn tiny secondary" onClick={() => openLeadForm(row)}>
                    <Link2 size={14} />
                    Forma
                  </button>
                  <button type="button" className="btn tiny secondary" onClick={() => copyLeadFormLink(row)}>
                    <Copy size={14} />
                    Nusxalash
                  </button>
                  <IconActions
                    onView={() => setViewRow(row)}
                    onEdit={() => startEdit(row)}
                    onDelete={() => removeRow(row.id)}
                  />
                </div>
              </div>
            ))
          ) : (
            <div className="mobile-record-card empty">Hozircha ma'lumot yo'q</div>
          )}
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Kampaniya tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>Nomi:</strong> {viewRow.title}</div>
            <div><strong>Platforma:</strong> {viewRow.platform}</div>
            <div><strong>Filial:</strong> {viewRow.branch_name || "-"}</div>
            <div><strong>Boshlanish:</strong> {formatDateTime(viewRow.start_at || viewRow.start_date)}</div>
            <div><strong>Tugash:</strong> {formatDateTime(viewRow.end_at || viewRow.end_date)}</div>
            <div><strong>Kunlik budget:</strong> {formatUsd(getCampaignDailyBudget(viewRow))}</div>
            <div><strong>Holat:</strong> <span className={campaignStatusClass(viewRow.status)}>{formatCampaignStatus(viewRow.status)}</span></div>
            <div><strong>Leadlar soni:</strong> {viewRow.lead_count || 0} ta</div>
            <div><strong>Lead chat ID:</strong> {viewRow.lead_chat_id || "-"}</div>
            <div className="full-col campaign-lead-link-row">
              <strong>Website form URL:</strong>
              <div className="campaign-lead-link-actions">
                <a href={getCampaignLeadFormUrl(viewRow.id)} target="_blank" rel="noreferrer" className="btn tiny secondary">
                  <Eye size={14} />
                  Ochish
                </a>
                <button type="button" className="btn tiny secondary" onClick={() => copyLeadFormLink(viewRow)}>
                  <Copy size={14} />
                  Nusxalash
                </button>
              </div>
              <div className="campaign-lead-link-preview">{getCampaignLeadFormUrl(viewRow.id)}</div>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function CampaignLeadPublicPage({ settings }) {
  const campaignId =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("campaign") || ""
      : "";
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const logoSrc = LOGIN_LOGO;
  const isFormReady = Boolean(campaign?.id);

  useEffect(() => {
    let cancelled = false;

    async function loadCampaign() {
      if (!campaignId) {
        setError("Kampaniya topilmadi");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");
        const result = await api.list(`/api/public/campaign-forms/${campaignId}`);
        if (!cancelled) {
          setCampaign(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Formani yuklab bo'lmadi");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCampaign();
    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError("");
      await api.post(`/api/public/campaign-forms/${campaignId}/submit`, {
        full_name: fullName.trim(),
        phone: phone.trim()
      });
      setSubmitted(true);
      setFullName("");
      setPhone("");
    } catch (err) {
      setError(err.message || "Ma'lumotni yuborib bo'lmadi");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="campaign-lead-page">
        <div className="campaign-lead-shell">
          <div className="campaign-lead-card">
            <div className="campaign-lead-brand">
              <img src={logoSrc} alt="aloo logo" className="campaign-lead-brand-image" />
              <div>
                <strong>{settings?.company_name || "aloo"}</strong>
                <span>{settings?.platform_name || "SMM jamoasi platformasi"}</span>
              </div>
            </div>

            {error ? (
              <div className="campaign-lead-state error">
                <h2>Forma topilmadi</h2>
                <p>{error}</p>
              </div>
            ) : submitted ? (
              <div className="success-wrapper campaign-lead-success">
                <div className="icon-wrap">
                  <svg className="success-svg" viewBox="0 0 100 100" width="120" height="120" aria-hidden="true">
                    <circle className="success-circle" cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" />
                    <polyline className="success-check" points="35 50 45 60 65 40" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2>Rahmat, qabul qilindi</h2>
                <p>Tez orada operatorlarimiz yoki do'kon hodimlari siz bilan bog'lanadi.</p>
              </div>
            ) : (
              <>
                <div className="campaign-lead-copy">
                  <div className="small-label">Reklama formasi</div>
                  <h1>{campaign?.title || "Murojaat qoldiring"}</h1>
                  <p>
                    {loading
                      ? "Forma ochildi. Kampaniya ma'lumotlari fonda tayyorlanyapti, siz sahifani kutmasdan ko'rishingiz mumkin."
                      : "Kampaniya bo'yicha ma'lumotingizni qoldiring. Operatorlarimiz siz bilan tez orada bog'lanadi."}
                  </p>
                </div>

                <div className="campaign-lead-meta">
                  <div className="campaign-lead-meta-card">
                    <span>Platforma</span>
                    <strong>{campaign?.platform || (loading ? "Yuklanmoqda..." : "-")}</strong>
                  </div>
                  <div className="campaign-lead-meta-card">
                    <span>Filial</span>
                    <strong>{campaign?.branch_name || (loading ? "Yuklanmoqda..." : "-")}</strong>
                  </div>
                </div>

                {loading ? (
                  <div className="campaign-lead-inline-note">
                    Kampaniya ma'lumotlari tayyorlanyapti. Iltimos, bir necha soniya kuting.
                  </div>
                ) : null}

                <form className="campaign-lead-form" onSubmit={handleSubmit}>
                  <label>
                    <span>Ism</span>
                    <input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ismingizni kiriting"
                      required
                    />
                  </label>
                  <label>
                    <span>Telefon raqami</span>
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+998 90 123 45 67"
                      required
                    />
                  </label>
                  {error ? <div className="campaign-lead-error">{error}</div> : null}
                  <button className="btn primary" type="submit" disabled={submitting || !isFormReady}>
                    <PhoneCall size={16} />
                    {submitting ? "Yuborilmoqda..." : loading ? "Ma'lumot tayyorlanyapti..." : "Yuborish"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      
    </>
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
      onToast("Fayl yuklandi", "success");
    } catch (err) {
      onToast(err.message || "Yuklashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    const ok = window.confirm("Rostdan ham o'chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("uploads", id);
      await reload();
      onToast("Fayl o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "O'chirishda xatolik", "error");
    }
  }

  function isImage(mime) {
    return String(mime || "").startsWith("image/");
  }

  async function copyLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      onToast("Link nusxalandi", "success");
    } catch {
      onToast("Linkni nusxalab bo'lmadi", "error");
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
                <div className="media-meta">{row.folder_name || "general"} - {row.version_label || "v1"}</div>
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
            <div className="empty-block">Hozircha media yo'q</div>
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
    pin_code: "",
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

  function handleRoleChange(role) {
    const preset = getRolePreset(role);
    setForm((prev) => ({
      ...prev,
      role,
      department_role: preset?.department_role ?? prev.department_role,
      permissions_json: preset?.permissions_json ? [...preset.permissions_json] : prev.permissions_json
    }));
  }

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
      pin_code: "",
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
          pin_code: form.pin_code,
          avatar_url: form.avatar_url,
          department_role: form.department_role,
          permissions_json: form.permissions_json
        });
        onToast("Hodim yangilandi", "success");
      } else {
        await api.create("users", form);
        onToast("Yangi hodim yaratildi", "success");
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
    const ok = window.confirm("Rostdan ham o'chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("users", id);
      await reload();
      onToast("Hodim o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "O'chirishda xatolik", "error");
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
            <span>4 xonali PIN</span>
            <input
              value={form.pin_code}
              onChange={(e) => setField("pin_code", e.target.value.replace(/\D+/g, "").slice(0, 4))}
              placeholder={editingId ? "Yangilash uchun 4 xonali PIN" : "Masalan: 2026"}
            />
          </label>

          <label>
            <span>Rol</span>
            <select value={form.role} onChange={(e) => handleRoleChange(e.target.value)}>
              <option value="admin">admin</option>
              <option value="manager">manager</option>
              <option value="director">rahbar</option>
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
            {saving ? "Saqlanmoqda..." : editingId ? "Yangilash" : "Hodim qo'shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Hodimlar ro'yxati" />
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
                    <td>{formatRoleLabel(row.role)}</td>
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
                <tr>Hozircha ma'lumot yo'q</tr>
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
            <div><strong>Rol:</strong> {formatRoleLabel(viewRow.role)}</div>
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
  const isPrivileged = isLeadershipRole(user?.role);

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

  const filteredTasks = useMemo(() => sortRowsByDate(
    filterDate
      ? tasks.filter((row) => formatDate(row.due_date) === filterDate)
      : tasks,
    "due_date"
  ), [tasks, filterDate]);
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
        onToast("Vazifa yangilandi", "success");
      } else {
        await api.create("tasks", payload);
        onToast("Vazifa saqlandi", "success");
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
    const ok = window.confirm("Rostdan ham o'chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove("tasks", id);
      await reload();
      onToast("Vazifa o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "O'chirishda xatolik", "error");
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
            <span>Mas'ul</span>
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
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Vazifa qo'shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <SectionTitle title="Vazifalar ro'yxati" right={<input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />} />
        {viewMode === "table" ? <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Vazifa</th>
                <th>Status</th>
                <th>Muhimlik</th>
                <th>Muddat</th>
                <th>Mas'ul</th>
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
                <tr>Hozircha ma'lumot yo'q</tr>
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
            <div><strong>Mas'ul:</strong> {viewRow.assignee_name || "-"}</div>
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
                <tr>Hozircha ma'lumot yo'q</tr>
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
                  <span>{formatDateTime(message.created_at)} {message.sender_user_id === user?.id ? ` - ${message.read_at ? "o'qildi" : message.delivered_at ? "yetkazildi" : "yuborildi"}` : ""}</span>
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
      onToast("Profil saqlandi", "success");
      setForm((prev) => ({
        ...prev,
        old_password: "",
        new_password: ""
      }));
    } catch (err) {
      onToast(err.message || "Profilni saqlab bo'lmadi", "error");
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
          <label><span>Bo'lim</span><input value={form.department_name || ""} onChange={(e) => setField("department_name", e.target.value)} /></label>
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
            <img src={LOGIN_LOGO} alt="Logo preview" className="settings-logo-image" />
            <div>
              <strong>{form.company_name || "aloo"}</strong>
              <span>{form.platform_name || "SMM jamoasi platformasi"} - {formatMoney(form.bonus_rate || 25000)}</span>
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
      onToast("Link nusxalandi", "success");
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

function ExpensesPage({ expenses = [], contestExpenses = [], onToast, reload }) {
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
  const [mode, setMode] = useState("general");
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
      onToast(err.message || "Harajatni saqlab bo'lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    if (!window.confirm("Rostdan ham o'chirilsinmi?")) return;
    try {
      await api.remove("expenses", id);
      await reload();
      onToast("Harajat o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "Harajatni o'chirib bo'lmadi", "error");
    }
  }

  const monthOptions = [...new Set([getMonthLabel(), ...expenses.map((item) => formatDate(item.expense_date).slice(0, 7)).filter((item) => item && item !== "-")])];
  const filteredExpenses = useMemo(() => sortRowsByDate(
    expenses.filter((item) => !monthFilter || formatDate(item.expense_date).startsWith(monthFilter)),
    "expense_date"
  ), [expenses, monthFilter]);
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
        <SectionTitle
          title="Harajatlar bo'limi"
          desc="Oddiy harajatlar va konkurs harajatlarini alohida boshqarish"
          right={
            <div className="toolbar-actions">
              <button
                type="button"
                className={`btn ${mode === "general" ? "primary" : "secondary"}`}
                onClick={() => setMode("general")}
              >
                Oddiy harajatlar
              </button>
              <button
                type="button"
                className={`btn ${mode === "contest" ? "primary" : "secondary"}`}
                onClick={() => setMode("contest")}
              >
                Konkurs harajatlari
              </button>
            </div>
          }
        />
      </div>

      {mode === "contest" ? (
        <ContestExpensesPanel contestExpenses={contestExpenses} onToast={onToast} reload={reload} />
      ) : (
        <>
      <div className="card">
        <SectionTitle title={editRow ? "Harajatni tahrirlash" : "Harajat qo'shish"} right={editRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Sana</span><input type="date" value={form.expense_date} onChange={(e) => setField("expense_date", e.target.value)} required /></label>
          <label><span>Nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required /></label>
          <label><span>Xizmat yoki ilova</span><input value={form.vendor_name} onChange={(e) => setField("vendor_name", e.target.value)} placeholder="Canva, Meta, CapCut..." /></label>
          <label><span>Karta egasi</span><input value={form.card_holder} onChange={(e) => setField("card_holder", e.target.value)} placeholder="Visa karta egasi" /></label>
          <label><span>Summa</span><input type="number" min="0" value={form.amount} onChange={(e) => setField("amount", e.target.value)} required /></label>
          <label><span>Valyuta</span><select value={form.currency} onChange={(e) => setField("currency", e.target.value)}><option value="UZS">UZS</option><option value="USD">USD</option></select></label>
          <label><span>Kategoriya</span><select value={form.category} onChange={(e) => setField("category", e.target.value)}><option value="servis">Servis</option><option value="reklama">Reklama</option><option value="safar">Safar</option><option value="boshqa">Boshqa</option></select></label>
          <label><span>To'lov turi</span><select value={form.payment_type} onChange={(e) => setField("payment_type", e.target.value)}><option value="visa">Visa karta</option><option value="cash">Naqd</option><option value="bank">Bank</option></select></label>
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
          title="Oy bo'yicha harajatlar"
          desc="Kategoriya kesimida tezkor ko'rinish"
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
        <SectionTitle title="Harajatlar ro'yxati" desc={getMonthTitle(monthFilter)} />
        <div className="table-wrap desktop-table">
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
              )) : <tr><td colSpan="6" className="empty-cell">Bu oy uchun harajat yo'q</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {filteredExpenses.length ? filteredExpenses.map((row) => (
            <div key={row.id} className="mobile-record-card">
              <div className="mobile-record-head">
                <div className="mobile-record-title">
                  <strong>{row.title}</strong>
                  <span>{formatDate(row.expense_date)}</span>
                </div>
                <div className="table-badge-stack">
                  <span className={expenseCategoryClass(row.category)}>{expenseCategoryLabel(row.category)}</span>
                  <span className={paymentTypeClass(row.payment_type)}>{paymentTypeLabel(row.payment_type)}</span>
                </div>
              </div>
              <div className="mobile-record-grid">
                <div className="mobile-record-field">
                  <label>Xizmat</label>
                  <div>{row.vendor_name || "-"}</div>
                </div>
                <div className="mobile-record-field">
                  <label>Summa</label>
                  <div>{Number(row.amount || 0).toLocaleString()} {row.currency || "UZS"}</div>
                </div>
                <div className="mobile-record-field">
                  <label>Karta egasi</label>
                  <div>{row.card_holder || "-"}</div>
                </div>
                <div className="mobile-record-field">
                  <label>Izoh</label>
                  <div>{row.notes || "-"}</div>
                </div>
              </div>
              <div className="mobile-record-actions">
                <IconActions onView={() => setViewRow(row)} onEdit={() => startEdit(row)} onDelete={() => removeRow(row.id)} />
              </div>
            </div>
          )) : (
            <div className="mobile-record-card empty">Bu oy uchun harajat yo'q</div>
          )}
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
          <label><span>To'lov turi</span><select value={form.payment_type} onChange={(e) => setField("payment_type", e.target.value)}><option value="visa">Visa karta</option><option value="cash">Naqd</option><option value="bank">Bank</option></select></label>
          <div className="full-col"><strong>Izoh:</strong> {viewRow.notes || "-"}</div>
        </div> : null}
      </Modal>
        </>
      )}
    </div>
  );
}

function TravelPlansPage({ travelPlans = [], travelExpenses = [], branches = [], onToast, reload }) {
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
  const [travelTab, setTravelTab] = useState("plans");
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
      const payload = {
        ...form,
        videodek_url: normalizeExternalUrl(form.videodek_url)
      };
      if (editRow?.id) {
        await api.update("travel-plans", editRow.id, payload);
        onToast("Safar rejasi yangilandi", "success");
      } else {
        await api.create("travel-plans", payload);
        onToast("Safar rejasi saqlandi", "success");
      }
      await reload();
      resetForm();
    } catch (err) {
      onToast(err.message || "Safar rejasini saqlab bo'lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(id) {
    if (!window.confirm("Rostdan ham o'chirilsinmi?")) return;
    try {
      await api.remove("travel-plans", id);
      await reload();
      onToast("Safar rejasi o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "Safar rejasini o'chirib bo'lmadi", "error");
    }
  }

  const filteredTravelPlans = useMemo(() => sortRowsByDate(
    travelPlans.filter((row) => !branchFilter || String(row.branch_id) === String(branchFilter)),
    "plan_date"
  ), [travelPlans, branchFilter]);
  const timelineRows = filteredTravelPlans
    .filter((row) => formatDate(row.plan_date) !== "-")
    .slice(0, 8);
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
        <SectionTitle
          title="Safar boshqaruvi"
          desc="Safar rejalari va safar harajatlarini bir joydan boshqarish"
          right={
            <div className="toolbar-actions">
              <button
                type="button"
                className={`btn ${travelTab === "plans" ? "primary" : "secondary"}`}
                onClick={() => setTravelTab("plans")}
              >
                Safar rejalari
              </button>
              <button
                type="button"
                className={`btn ${travelTab === "expenses" ? "primary" : "secondary"}`}
                onClick={() => setTravelTab("expenses")}
              >
                Safar harajatlari
              </button>
            </div>
          }
        />
      </div>

      {travelTab === "expenses" ? (
        <TravelExpensesPanel travelExpenses={travelExpenses} onToast={onToast} reload={reload} />
      ) : (
        <>
      <div className="card">
        <SectionTitle title={editRow ? "Safar rejasini tahrirlash" : "Safar rejasi qo'shish"} right={editRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Sana</span><input type="date" value={form.plan_date} onChange={(e) => setField("plan_date", e.target.value)} required /></label>
          <label><span>Filial</span><select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)} required><option value="">Tanlang</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label><span>Qaysi video olinadi</span><input value={form.video_title} onChange={(e) => setField("video_title", e.target.value)} required /></label>
          <label><span>Kimlar ishtirok etadi</span><input value={form.participants_text} onChange={(e) => setField("participants_text", e.target.value)} placeholder="Ismlar vergul bilan" /></label>
          <label className="full-col">
            <span>Videodek URL</span>
            <div className="inline-link-field">
              <input value={form.videodek_url} onChange={(e) => setField("videodek_url", e.target.value)} placeholder="https://..." />
              {normalizeExternalUrl(form.videodek_url) ? (
                <button type="button" className="icon-btn" title="Havolani ochish" onClick={() => openExternalUrl(form.videodek_url)}>
                  <Eye size={16} />
                </button>
              ) : null}
            </div>
          </label>
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
        <div className="table-wrap desktop-table">
          <table>
            <thead><tr><th>Sana</th><th>Filial</th><th>Video</th><th>Ishtirokchilar</th><th>Link</th><th>Status</th><th>Amallar</th></tr></thead>
            <tbody>
              {filteredTravelPlans.length ? filteredTravelPlans.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.plan_date)}</td>
                  <td>{row.branch_name || "-"}</td>
                  <td>{row.video_title}</td>
                  <td>{row.participants_text || "-"}</td>
                  <td>
                    {row.videodek_url ? (
                      <button type="button" className="icon-btn" title="Havolani ochish" onClick={() => openExternalUrl(row.videodek_url)}>
                        <Eye size={16} />
                      </button>
                    ) : "-"}
                  </td>
                  <td><span className={approvalStatusClass(row.status, "travel")}>{formatApprovalStatus(row.status, "travel")}</span></td>
                  <td><IconActions onView={() => setViewRow(row)} onEdit={() => startEdit(row)} onDelete={() => removeRow(row.id)} /></td>
                </tr>
              )) : <tr><td colSpan="7" className="empty-cell">Hozircha safar rejasi yo'q</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {filteredTravelPlans.length ? filteredTravelPlans.map((row) => (
            <div key={`travel-card-${row.id}`} className="mobile-record-card">
              <div className="mobile-record-head">
                <div className="mobile-record-title">
                  <strong>{row.video_title}</strong>
                  <span>{formatDate(row.plan_date)} • {row.branch_name || "-"}</span>
                </div>
                <span className={approvalStatusClass(row.status, "travel")}>{formatApprovalStatus(row.status, "travel")}</span>
              </div>
              <div className="mobile-record-grid">
                <div className="mobile-record-field full">
                  <label>Ishtirokchilar</label>
                  <div>{row.participants_text || "-"}</div>
                </div>
                <div className="mobile-record-field">
                  <label>Deadline</label>
                  <div>{formatDate(row.deadline_date)}</div>
                </div>
                <div className="mobile-record-field">
                  <label>Link</label>
                  <div>
                    {row.videodek_url ? (
                      <button type="button" className="icon-btn" title="Havolani ochish" onClick={() => openExternalUrl(row.videodek_url)}>
                        <Eye size={16} />
                      </button>
                    ) : "-"}
                  </div>
                </div>
              </div>
              <div className="mobile-record-actions">
                <IconActions onView={() => setViewRow(row)} onEdit={() => startEdit(row)} onDelete={() => removeRow(row.id)} />
              </div>
            </div>
          )) : <div className="mobile-record-card empty">Hozircha safar rejasi yo'q</div>}
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
                <p>{row.participants_text || "Ishtirokchilar ko'rsatilmagan"}</p>
              </div>
            </button>
          )) : <div className="empty-block">Hozircha timeline uchun safar rejasi yo'q</div>}
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
            <div className="full-col">
              <strong>Videodek URL:</strong>{" "}
              {viewRow.videodek_url ? (
                <button type="button" className="btn secondary" onClick={() => openExternalUrl(viewRow.videodek_url)}>
                  <Eye size={16} /> Havolani ochish
                </button>
              ) : "-"}
            </div>
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
        </>
      )}
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
            <span>Mas'ul</span>
            <label className="full-col"><span>Izoh</span><input value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} /></label>
            <button className="btn primary" type="submit">Saqlash</button>
          </form>
                <th>Mas'ul</th>
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
      <div className="card">Hozircha ma'lumot yo'q</div>
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
  const monthlyAds = campaigns.filter((i) => formatDate(i.start_at || i.start_date).startsWith(currentMonth) || formatDate(i.end_at || i.end_date).startsWith(currentMonth)).reduce((s, i) => s + Number(i.spend || 0), 0);
  const monthlyBonus = bonusItems.filter((i) => (i.month_label || "").startsWith(currentMonth)).reduce((s, i) => s + Number(i.total_amount || 0), 0);
  const monthlyTravel = travelPlans.filter((i) => formatDate(i.plan_date).startsWith(currentMonth)).reduce((s, i) => s + Number(i.budget_amount || 0), 0);
  const activeBudgets = budgets.filter((i) => i.month_label === currentMonth);
  return (
    <div className="page-grid">
      <div className="stats-grid">
        <StatCard title="Harajatlar" value={formatMoney(monthlyExpenses)} hint={getMonthTitle(currentMonth)} tone="danger" />
        <StatCard title="Reklama sarfi" value={formatUsd(monthlyAds)} hint={getMonthTitle(currentMonth)} tone="info" />
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
          <label>
            <span>Kontent turi</span>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)}>
              {CONTENT_TYPE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </label>
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
  const [bootScreenVisible, setBootScreenVisible] = useState(true);
  const [user, setUser] = useState(getCurrentUser());
  const [active, setActive] = useState(() => getPageFromPath(typeof window !== "undefined" ? window.location.pathname : "/"));
  const [theme, setTheme] = useState("light");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [menuGroupState, setMenuGroupState] = useState(() =>
    Object.fromEntries(MENU_GROUPS.map((group) => [group.id, true]))
  );
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [globalResults, setGlobalResults] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isAppleMobile, setIsAppleMobile] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const activeRef = useRef("dashboard");
  const lastLoadedPageRef = useRef(null);
  const settingsRef = useRef(null);

  const [summary, setSummary] = useState({});
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [bonusItems, setBonusItems] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [contestExpenses, setContestExpenses] = useState([]);
  const [travelPlans, setTravelPlans] = useState([]);
  const [travelExpenses, setTravelExpenses] = useState([]);
  const [uploads, setUploads] = useState([]);
  const [contentRows, setContentRows] = useState([]);
  const [dailyReports, setDailyReports] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [recurringExpenses, setRecurringExpenses] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [topPerformers, setTopPerformers] = useState(null);
  const [executiveSummary, setExecutiveSummary] = useState(null);
  const [employeeKpi, setEmployeeKpi] = useState([]);
  const [moodEntries, setMoodEntries] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    localStorage.setItem("aloo_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    applySeo(settings);
  }, [settings]);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    const appleMobile = isAppleMobileDevice();
    const media = window.matchMedia("(display-mode: standalone)");

    const syncMode = () => {
      const standalone = isStandaloneMode();
      setIsAppleMobile(appleMobile);
      setIsStandalone(standalone);
      document.body.classList.toggle("standalone-app", standalone);
    };

    syncMode();

    if (media.addEventListener) {
      media.addEventListener("change", syncMode);
    } else {
      media.addListener(syncMode);
    }

    return () => {
      document.body.classList.remove("standalone-app");
      if (media.removeEventListener) {
        media.removeEventListener("change", syncMode);
      } else {
        media.removeListener(syncMode);
      }
    };
  }, []);

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }
    function handleInstalled() {
      setDeferredPrompt(null);
      setIsStandalone(true);
      document.body.classList.add("standalone-app");
      showToast("Ilova qurilmaga o'rnatildi", "success");
    }
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const goToPage = useCallback((pageId, { replace = false } = {}) => {
    const nextPage = pageId || "dashboard";
    const nextPath = getPathForPage(nextPage);
    setActive(nextPage);
    if (typeof window === "undefined") return;
    const currentPath = normalizePathname(window.location.pathname);
    if (currentPath === nextPath) return;
    const method = replace ? "replaceState" : "pushState";
    window.history[method]({}, "", nextPath);
  }, []);

  useEffect(() => {
    function handlePopState() {
      setActive(getPageFromPath(window.location.pathname));
    }

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const pageNeedsReferences = useCallback((pageId) => {
    return [
      "content",
      "bonus",
      "travelPlans",
      "dailyReports",
      "campaigns",
      "users",
      "tasks",
      "recurring",
      "aiAssistant"
    ].includes(pageId);
  }, []);

  const refreshShellData = useCallback(async ({
    includeMe = false,
    includeSettings = false,
    includeReferences = false,
    includeNotifications = true,
    includeSummary = true
  } = {}) => {
    const [
      meRes,
      dashboardRes,
      settingsRes,
      notificationsRes,
      usersRes,
      branchesRes
    ] = await Promise.all([
      includeMe ? api.me().catch(() => null) : Promise.resolve(undefined),
      includeSummary ? api.dashboard().catch(() => ({})) : Promise.resolve(undefined),
      includeSettings ? api.settings.get().catch(() => null) : Promise.resolve(undefined),
      includeNotifications ? api.list("notifications").catch(() => []) : Promise.resolve(undefined),
      includeReferences ? api.list("users").catch(() => []) : Promise.resolve(undefined),
      includeReferences ? api.list("branches").catch(() => []) : Promise.resolve(undefined)
    ]);

    if (meRes?.user) setUser(meRes.user);
    if (dashboardRes !== undefined) setSummary(dashboardRes || {});
    if (settingsRes !== undefined) setSettings(settingsRes || null);
    if (notificationsRes !== undefined) setNotifications(notificationsRes || []);
    if (usersRes !== undefined) setUsers(usersRes || []);
    if (branchesRes !== undefined) setBranches(branchesRes || []);
  }, []);

  const loadPageData = useCallback(async (pageId) => {
    switch (pageId) {
      case "dashboard": {
        const [bonusItemsRes, contentRes, dailyReportsRes, campaignsRes, travelPlansRes] = await Promise.all([
          api.list("bonus-items").catch(() => []),
          api.list("content").catch(() => []),
          api.list("daily-reports").catch(() => []),
          api.list("campaigns").catch(() => []),
          api.list("travel-plans").catch(() => [])
        ]);
        setBonusItems(bonusItemsRes || []);
        setContentRows(contentRes || []);
        setDailyReports(dailyReportsRes || []);
        setCampaigns(campaignsRes || []);
        setTravelPlans(travelPlansRes || []);
        break;
      }
      case "content":
        setContentRows(await api.list("content").catch(() => []));
        break;
      case "bonus":
        setBonusItems(await api.list("bonus-items").catch(() => []));
        break;
      case "expenses": {
        const [expensesRes, contestExpensesRes] = await Promise.all([
          api.list("expenses").catch(() => []),
          api.list("contest-expenses").catch(() => [])
        ]);
        setExpenses(expensesRes || []);
        setContestExpenses(contestExpensesRes || []);
        break;
      }
      case "finance": {
        const [expensesRes, campaignsRes, bonusItemsRes, travelPlansRes, budgetsRes] = await Promise.all([
          api.list("expenses").catch(() => []),
          api.list("campaigns").catch(() => []),
          api.list("bonus-items").catch(() => []),
          api.list("travel-plans").catch(() => []),
          api.list("budgets").catch(() => [])
        ]);
        setExpenses(expensesRes || []);
        setCampaigns(campaignsRes || []);
        setBonusItems(bonusItemsRes || []);
        setTravelPlans(travelPlansRes || []);
        setBudgets(budgetsRes || []);
        break;
      }
      case "travelPlans": {
        const [travelPlansRes, travelExpensesRes] = await Promise.all([
          api.list("travel-plans").catch(() => []),
          api.list("travel-expenses").catch(() => [])
        ]);
        setTravelPlans(travelPlansRes || []);
        setTravelExpenses(travelExpensesRes || []);
        break;
      }
      case "analytics": {
        const [analyticsRes, employeeKpiRes, executiveSummaryRes] = await Promise.all([
          api.list("/api/analytics/overview").catch(() => null),
          api.list("/api/employee-kpi").catch(() => []),
          api.list("/api/executive-summary").catch(() => null)
        ]);
        setAnalyticsData(analyticsRes || null);
        setEmployeeKpi(employeeKpiRes || []);
        setExecutiveSummary(executiveSummaryRes || null);
        setTopPerformers(analyticsRes?.top_performers || null);
        break;
      }
      case "moodPulse":
        setMoodEntries(await api.list("/api/team-mood").catch(() => []));
        break;
      case "employeeKpi":
        setEmployeeKpi(await api.list("/api/employee-kpi").catch(() => []));
        break;
      case "recurring": {
        const [recurringTasksRes, recurringExpensesRes] = await Promise.all([
          api.list("recurring-tasks").catch(() => []),
          api.list("recurring-expenses").catch(() => [])
        ]);
        setRecurringTasks(recurringTasksRes || []);
        setRecurringExpenses(recurringExpensesRes || []);
        break;
      }
      case "dailyReports":
        setDailyReports(await api.list("daily-reports").catch(() => []));
        break;
      case "campaigns":
        setCampaigns(await api.list("campaigns").catch(() => []));
        break;
      case "uploads":
        setUploads(await api.list("uploads").catch(() => []));
        break;
      case "tasks":
        setTasks(await api.list("tasks").catch(() => []));
        break;
      case "audit":
        setAuditLogs(await api.list("audit-logs").catch(() => []));
        break;
      default:
        break;
    }
  }, []);

  const reloadData = useCallback(async (pageId = activeRef.current || "dashboard", options = {}) => {
    try {
      const shouldLoadReferences = options.includeReferences || pageNeedsReferences(pageId);
      const shouldLoadSettings = options.includeSettings || pageId === "settings" || !settingsRef.current;

      await Promise.all([
        refreshShellData({
          includeMe: !!options.includeMe,
          includeSettings: shouldLoadSettings,
          includeReferences: shouldLoadReferences
        }),
        loadPageData(pageId)
      ]);

      lastLoadedPageRef.current = pageId;
    } catch (err) {
      console.error(err);
    }
  }, [loadPageData, pageNeedsReferences, refreshShellData]);

  useEffect(() => {
    if (!booting) {
      setBootScreenVisible(false);
      return undefined;
    }

    const timer = setTimeout(() => {
      setBootScreenVisible(false);
      setBooting(false);
    }, BOOT_SCREEN_MAX_WAIT_MS);

    return () => clearTimeout(timer);
  }, [booting]);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!user) {
        if (active === "campaignLeadForm") {
          if (!cancelled) {
            setBooting(false);
          }
          const publicSettings = await api.settings.get().catch(() => null);
          if (!cancelled && publicSettings) {
            setSettings(publicSettings);
          }
          return;
        }
        const publicSettings = await api.settings.get().catch(() => null);
        if (!cancelled) {
          setSettings(publicSettings);
          setBooting(false);
        }
        return;
      }

      try {
        const initialPage =
          active && active !== "login" && active !== "campaignLeadForm"
            ? active
            : "dashboard";

        const loadPromise = reloadData(initialPage, {
          includeMe: true,
          includeSettings: true,
          includeReferences: true
        });
        await Promise.race([
          loadPromise,
          new Promise((resolve) => setTimeout(resolve, BOOT_SCREEN_MAX_WAIT_MS - 300))
        ]);
      } catch {
        clearAuth();
        if (!cancelled) {
          setUser(null);
          lastLoadedPageRef.current = null;
        }
      } finally {
        if (!cancelled) {
          setBooting(false);
        }
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [active, reloadData, user?.id]);

  useEffect(() => {
    if (!user?.id || booting) return;
    if (lastLoadedPageRef.current === active) return;
    reloadData(active);
  }, [active, booting, reloadData, user?.id]);

  useEffect(() => {
    if (!user?.id || booting) return;
    const intervalMs = 15000;
    const timer = setInterval(() => {
      reloadData(active);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [active, booting, reloadData, user?.id]);

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

  useEffect(() => {
    if (active === "campaignLeadForm") return;
    if (user?.id && active === "login") {
      goToPage("dashboard", { replace: true });
      return;
    }

    if (active !== "login" && !allowedMenu.some((item) => item.id === active)) {
      const fallbackPage = allowedMenu[0]?.id || "dashboard";
      goToPage(fallbackPage, { replace: true });
    }
  }, [active, allowedMenu, goToPage, user?.id]);

  useEffect(() => {
    if (booting || !user?.id || typeof window === "undefined" || active === "campaignLeadForm") return;
    const normalizedActive = active === "login" ? "dashboard" : active;
    const currentPath = normalizePathname(window.location.pathname);
    const expectedPath = getPathForPage(normalizedActive);
    if (currentPath !== expectedPath) {
      window.history.replaceState({}, "", expectedPath);
    }
  }, [active, booting, user?.id]);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [active]);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return allowedMenu;
    return allowedMenu.filter((item) =>
      item.title.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, allowedMenu]);

  const groupedMenu = useMemo(() => {
    return MENU_GROUPS.map((group) => {
      const items = group.items
        .map((id) => filteredMenu.find((item) => item.id === id))
        .filter(Boolean);
      return { ...group, items };
    }).filter((group) => group.items.length);
  }, [filteredMenu]);

  const mobilePrimaryMenu = useMemo(() => {
    const preferred = ["dashboard", "content", "bonus", "tasks", "profile"];
    const pinned = preferred
      .map((id) => allowedMenu.find((item) => item.id === id))
      .filter(Boolean);
    const extras = allowedMenu.filter((item) => !pinned.some((entry) => entry.id === item.id));
    return [...pinned, ...extras].slice(0, 4);
  }, [allowedMenu]);
  const activeMenuItem = MENU.find((item) => item.id === active) || MENU[0];
  const ActivePageIcon = activeMenuItem?.icon || LayoutDashboard;

  function showToast(message = "Saqlandi", type = "success", options = {}) {
    const normalizedMessage = String(message || "").trim() || (type === "error" ? "Xatolik yuz berdi" : "Saqlandi");
    const shouldCenter =
      type === "success" &&
      (options.center ?? /(saql|saqlandi|yangila|yangilandi|o['‘’`]?chir|ochir|yarat|tasdiq|bekor qil|qo['‘’`]?sh|qosh|bajar|paid|yopildi)/i.test(normalizedMessage));

    const isDelete = type === "success" && options.deleteCenter === true;
    setToast({
      message: normalizedMessage,
      type,
      variant: isDelete ? "center-delete" : shouldCenter ? "center-success" : "toast"
    });
  }

  async function saveSettings(payload) {
    try {
      setSavingSettings(true);
      const res = await api.settings.update(payload);
      const updated = await api.settings.get();
      setSettings(updated);
      showToast(res.message || "Saqlandi");
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
    lastLoadedPageRef.current = null;
    setUser(null);
    goToPage("login", { replace: true });
  }

  if (booting && bootScreenVisible && active !== "campaignLeadForm") {
    return (
      <>
        <div className="loading-screen">
          <div className="loading-orb loading-orb-one" />
          <div className="loading-orb loading-orb-two" />
          <div className="loading-grid" />
          <div className="loading-card">
            <div className="loading-brand">
              <img src={LOGIN_LOGO} alt="logo" className="loading-brand-image" />
              <div>
                <strong>{settings?.company_name || "aloo"}</strong>
                <span>{settings?.platform_name || "SMM jamoasi platformasi"}</span>
              </div>
            </div>
            <span className="loader" aria-hidden="true" />
            <div className="loading-copy">
              <h2>alooSMM 3.0 yuklanmoqda</h2>
              <p>Asosiy ma'lumotlar tayyorlanyapti, ilova darrov ochiladi.</p>
            </div>
          </div>
        </div>
        
      </>
    );
  }

  if (!user) {
    if (active === "campaignLeadForm") {
      return <CampaignLeadPublicPage settings={settings} />;
    }
    return (
      <>
        <LoginPage
          onLoggedIn={setUser}
          settings={settings}
          showInstallGuideAction={isAppleMobile && !isStandalone}
          onOpenInstallGuide={() => setShowInstallGuide(true)}
        />
        <Modal open={showInstallGuide} onClose={() => setShowInstallGuide(false)} title="iPhonega ilova qilib o'rnatish">
          <div className="ios-install-guide">
            <p>aloo panelini iPhone bosh ekraniga qo'shsangiz, u oddiy sayt emas, alohida ilova kabi ochiladi.</p>
            <div className="ios-install-steps">
              <div className="ios-install-step"><strong>1.</strong><span>Saytni aynan <strong>Safari</strong> ichida oching.</span></div>
              <div className="ios-install-step"><strong>2.</strong><span>Pastdagi <strong>Ulashish</strong> ikonkasini bosing.</span></div>
              <div className="ios-install-step"><strong>3.</strong><span><strong>Add to Home Screen</strong> ni tanlang.</span></div>
              <div className="ios-install-step"><strong>4.</strong><span><strong>Add</strong> bosing va bosh ekrandan app kabi oching.</span></div>
            </div>
            <div className="ios-install-note">
              Shundan keyin panel full-screen ochiladi, Safari paneli kamayadi va foydalanish ilovaga yaqinlashadi.
            </div>
          </div>
        </Modal>
        <Toast toast={toast} onClose={() => setToast(null)} />
        
      </>
    );
  }

  if (active === "campaignLeadForm") {
    return <CampaignLeadPublicPage settings={settings} />;
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
    page = <ContentPage users={users} branches={branches} settings={settings} user={user} onToast={showToast} reload={reloadData} />;
  } else if (active === "bonus") {
    page = <BonusPage bonusItems={bonusItems} users={users} branches={branches} settings={settings} user={user} onToast={showToast} reload={reloadData} />;
  } else if (active === "expenses") {
    page = <ExpensesPage expenses={expenses} contestExpenses={contestExpenses} onToast={showToast} reload={reloadData} />;
  } else if (active === "finance") {
    page = <FinanceDashboardPage expenses={expenses} campaigns={campaigns} bonusItems={bonusItems} travelPlans={travelPlans} budgets={budgets} onToast={showToast} reload={reloadData} />;
  } else if (active === "travelPlans") {
    page = <TravelPlansPage travelPlans={travelPlans} travelExpenses={travelExpenses} branches={branches} onToast={showToast} reload={reloadData} />;
  } else if (active === "analytics") {
    page = <AnalyticsPage analyticsData={{ ...(analyticsData || {}), employee_kpi: employeeKpi, executive_summary: executiveSummary?.text }} />;
  } else if (active === "moodPulse") {
    page = <MoodPulsePage rows={moodEntries} user={user} onToast={showToast} reload={reloadData} />;
  } else if (active === "employeeKpi") {
    page = <EmployeeKpiPage rows={employeeKpi} />;
  } else if (active === "recurring") {
    page = <RecurringPage recurringTasks={recurringTasks} recurringExpenses={recurringExpenses} users={users} onToast={showToast} reload={reloadData} />;
  } else if (active === "dailyReports") {
    page = <DailyReportsPage reports={dailyReports} branches={branches} onToast={showToast} reload={reloadData} />;
  } else if (active === "campaigns") {
    page = <CampaignsPage campaigns={campaigns} branches={branches} onToast={showToast} reload={reloadData} />;
  } else if (active === "uploads") {
    page = <MediaPage uploads={uploads} onToast={showToast} reload={reloadData} />;
  } else if (active === "users") {
    page = <UsersPage users={users} onToast={showToast} reload={reloadData} />;
  } else if (active === "tasks") {
    page = <TasksPage tasks={tasks} users={users} user={user} onToast={showToast} reload={reloadData} />;
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
              <img src={LOGIN_LOGO} alt="logo" className="brand-mark-image" />
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

          <div className="menu-section-list">
            {groupedMenu.map((group) => {
              const isOpen = search.trim() ? true : menuGroupState[group.id] !== false;
              return (
                <div key={group.id} className="menu-group">
                  <button
                    type="button"
                    className={`menu-group-toggle ${isOpen ? "open" : ""}`}
                    onClick={() =>
                      setMenuGroupState((prev) => ({ ...prev, [group.id]: !isOpen }))
                    }
                  >
                    <span>{group.title}</span>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>

                  {isOpen ? (
                    <div className="menu-list">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            className={`menu-btn ${active === item.id ? "active" : ""}`}
                            type="button"
                            onClick={() => goToPage(item.id)}
                          >
                            <span className={`menu-icon-wrap icon-tone-${item.tone || "indigo"}`}>
                              <Icon size={16} />
                            </span>
                            <span>{item.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
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
            <div className="topbar-main">
              <div className="topbar-title-block">
                <span className={`page-title-badge icon-tone-${activeMenuItem?.tone || "indigo"}`}>
                  <ActivePageIcon size={18} />
                </span>
                <div className="small-label">{(settings?.company_name || "aloo")} platforma</div>
                <h1>{activeMenuItem?.title || "Bosh sahifa"}</h1>
              </div>
              <button
                type="button"
                className="mobile-menu-btn"
                onClick={() => setMobileMenuOpen(true)}
              >
                <Menu size={18} />
                <span>Menu</span>
              </button>
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
                      { key: "travel_plans", label: "Safar rejasi", items: globalResults?.travel_plans || [] }
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
                              if (group.key === "users") goToPage("users");
                              else if (group.key === "content") goToPage("content");
                              else if (group.key === "tasks") goToPage("tasks");
                              else if (group.key === "bonuses") goToPage("bonus");
                              else if (group.key === "travel_plans") goToPage("travelPlans");
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
              {isAppleMobile && !isStandalone ? (
                <button
                  className="notif-pill install-pill ios-install-pill"
                  type="button"
                  onClick={() => setShowInstallGuide(true)}
                >
                  <Upload size={16} />
                  iPhonega o'rnatish
                </button>
              ) : null}
              <ThemeToggle theme={theme} setTheme={setTheme} />
              <button type="button" className="user-chip" onClick={() => goToPage("profile")}>
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

      <div className="mobile-bottom-nav">
        {mobilePrimaryMenu.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`mobile-nav-item ${active === item.id ? "active" : ""}`}
              onClick={() => goToPage(item.id)}
            >
              <span className={`mobile-nav-icon icon-tone-${item.tone || "indigo"}`}>
                <Icon size={17} />
              </span>
              <span>{item.title}</span>
            </button>
          );
        })}
        <button
          type="button"
          className={`mobile-nav-item ${mobileMenuOpen ? "active" : ""}`}
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="mobile-nav-icon icon-tone-slate">
            <Menu size={17} />
          </span>
          <span>Menu</span>
        </button>
      </div>

      <NotificationsDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        notifications={notifications}
        onRead={handleReadNotification}
        onReadAll={handleReadAll}
      />
      <Modal open={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} title="Bo'limlar">
        <div className="mobile-menu-sheet">
          <div className="sidebar-search mobile-menu-search">
            <Search size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Bo'lim qidiring..."
            />
          </div>

          {groupedMenu.map((group) => (
            <div key={`mobile-${group.id}`} className="mobile-menu-group">
              <div className="mobile-menu-title">{group.title}</div>
              <div className="mobile-menu-grid">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`mobile-menu-card ${active === item.id ? "active" : ""}`}
                      onClick={() => {
                        goToPage(item.id);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <span className={`menu-icon-wrap icon-tone-${item.tone || "indigo"}`}>
                        <Icon size={16} />
                      </span>
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          <button className="logout-btn mobile-logout-btn" type="button" onClick={logout}>
            <LogOut size={16} />
            Chiqish
          </button>
        </div>
      </Modal>
      <Modal open={showInstallGuide} onClose={() => setShowInstallGuide(false)} title="iPhonega ilova qilib o'rnatish">
        <div className="ios-install-guide">
          <p>Bu panelni bosh ekranga qo'shsangiz, iPhone'da alohida ilova kabi full-screen ochiladi.</p>
          <div className="ios-install-steps">
            <div className="ios-install-step"><strong>1.</strong><span>Panelni <strong>Safari</strong> orqali oching.</span></div>
            <div className="ios-install-step"><strong>2.</strong><span>Pastdagi <strong>Ulashish</strong> ikonkasini bosing.</span></div>
            <div className="ios-install-step"><strong>3.</strong><span><strong>Add to Home Screen</strong> ni tanlang.</span></div>
            <div className="ios-install-step"><strong>4.</strong><span><strong>Add</strong> bosing va ikonka orqali kirishni boshlang.</span></div>
          </div>
          <div className="ios-install-note">
            iPhone Safari `Install` popup bermaydi, shu sabab o'rnatish qo'lda `Add to Home Screen` orqali qilinadi.
          </div>
        </div>
      </Modal>

      <Toast toast={toast} onClose={() => setToast(null)} />
      
    </>
  );
}

const styles = ``;

export default App;
