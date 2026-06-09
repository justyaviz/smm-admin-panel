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
  Image,
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
  Pencil,
  PhoneCall,
  ReceiptText,
  Filter,
  GraduationCap,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  SmilePlus,
  Trash2,
  Upload,
  ShieldCheck,
  Target,
  ClipboardList,
  Globe2,
  X
} from "lucide-react";
import { io } from "socket.io-client";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, API_BASE, clearAuth, getAuthToken, getCurrentUser, SOCKET_BASE } from "./api";
import { applySeo } from "./seo";
import ContestExpensesPanel from "./ContestExpensesPanel";
import DailyReportImageImportPanel from "./DailyReportImageImportPanel";
import TravelExpensesPanel from "./TravelExpensesPanel";
import { DESIGN_SYSTEM_VERSION } from "./design-system";
import { UiHealthStrip, UiOpsTimeline, UiStatusStepper } from "./ui-system";

const MENU = [
  { id: "dashboard", title: "Manager OS", icon: LayoutDashboard, tone: "indigo", desc: "Lavozim boshqaruv markazi" },
  { id: "managerLab", title: "Manager OS Lab", icon: Sparkles, tone: "violet", desc: "Strategiya, CRM, KPI" },
  { id: "content", title: "Strategiya va kontent", icon: Clapperboard, tone: "cyan", desc: "Reja, kalendar, ssenariy" },
  { id: "tasks", title: "Mobilograf workflow", icon: ListTodo, tone: "green", desc: "Topshiriq va nazorat" },
  { id: "travelPlans", title: "Production safarlar", icon: PlaneTakeoff, tone: "violet", desc: "Filial, suratga olish, montaj" },
  { id: "bonus", title: "Mobilograf bonus", icon: BadgeDollarSign, tone: "emerald", desc: "Bajarilish motivatsiyasi" },
  { id: "campaigns", title: "Kampaniya va Ads Lab", icon: Target, tone: "fuchsia", desc: "Target, aksiya, blogerlar" },
  { id: "uploads", title: "Brand media arxiv", icon: Image, tone: "purple", desc: "Dizayn, video, kreativlar" },
  { id: "analytics", title: "Growth analytics", icon: BarChart3, tone: "sky", desc: "Auditoriya va natija" },
  { id: "dailyReports", title: "Platforma pulse", icon: ClipboardList, tone: "slate", desc: "Instagram, Telegram, YouTube" },
  { id: "users", title: "Jamoa rollari", icon: ContactRound, tone: "blue", desc: "SMM, mobilograf, rahbar" },
  { id: "profile", title: "Menejer profili", icon: CircleUserRound, tone: "cyan", desc: "Shaxsiy kabinet" },
  { id: "settings", title: "Brand sozlamalar", icon: SlidersHorizontal, tone: "slate", desc: "Logo, brandbook, tizim" }
];

const MENU_GROUPS = [
  { id: "core", title: "Manager OS", items: ["dashboard", "managerLab", "content", "tasks"] },
  { id: "growth", title: "Growth va reklama", items: ["campaigns", "analytics", "dailyReports"] },
  { id: "assets", title: "Brand aktivlar", items: ["uploads"] },
  { id: "system", title: "Jamoa va tizim", items: ["users", "profile", "settings"] }
];


const SIDEBAR_WORKSPACES = [
  {
    id: "smm",
    title: "alooSMM Manager OS",
    desc: "Strategiya, kontent, reklama, natija",
    items: ["dashboard", "managerLab", "content", "tasks", "travelPlans", "campaigns", "analytics", "dailyReports", "uploads", "users", "settings"],
    groups: [
      { id: "smm-main", title: "Strategiya va production", items: ["dashboard", "managerLab", "content", "tasks", "travelPlans"] },
      { id: "smm-growth", title: "Growth tizimi", items: ["campaigns", "analytics", "dailyReports"] },
      { id: "smm-admin", title: "Brand va jamoa", items: ["uploads", "users", "settings", "profile"] }
    ]
  },
  {
    id: "mobilograf",
    title: "Mobilograf",
    desc: "Foto, video, montaj",
    items: ["content", "profile"],
    groups: [
      { id: "mob-content", title: "Kontent ishlab chiqarish", items: ["content"] },
      { id: "mob-account", title: "Shaxsiy", items: ["profile"] }
    ]
  }
];

const getWorkspaceById = (id) => SIDEBAR_WORKSPACES.find((workspace) => workspace.id === id) || SIDEBAR_WORKSPACES[0];

const getDefaultWorkspaceForUser = (currentUser) => {
  const role = String(currentUser?.role || "").toLowerCase();
  if (role.includes("mobilograf") || role.includes("video") || role.includes("media")) return "mobilograf";
  return "smm";
};

const isMobilografUser = (currentUser) => {
  const role = String(currentUser?.role || "").toLowerCase();
  const departmentRole = String(currentUser?.department_role || "").toLowerCase();
  return role.includes("mobilograf") || departmentRole.includes("mobilograf") || role.includes("video") || departmentRole.includes("video");
};

const scopedDataQuery = (currentUser) => (
  currentUser?.role === "admin" ? null : { scope: "mine" }
);

const rolePresetPermissions = (currentUser) => {
  if (isMobilografUser(currentUser)) {
    return [
      "content",
      "profile"
    ];
  }
  if (["manager", "director"].includes(String(currentUser?.role || "").toLowerCase())) {
    return ["managerLab", "travelPlans", "travelPlans_create", "travelPlans_edit", "travelPlans_delete"];
  }
  return [];
};

const ROUTES_BY_PAGE = {
  landing: "/",
  login: "/login",
  campaignLeadForm: "/reklama-forma",
  dashboard: "/menu",
  managerLab: "/manager-os-lab",
  content: "/kontent",
  bonus: "/bonus",
  travelPlans: "/safar",
  analytics: "/analytics",
  dailyReports: "/kunlik-hisobotlar",
  campaigns: "/reklama",
  uploads: "/media",
  users: "/hodimlar",
  tasks: "/vazifalar",
  audit: "/audit",
  profile: "/profil",
  settings: "/sozlamalar"
};

const PAGE_BY_ROUTE = {
  "/": "landing",
  "/login": "login",
  "/reklama-forma": "campaignLeadForm",
  "/menu": "dashboard",
  "/dashboard": "dashboard",
  "/manager-os-lab": "managerLab",
  "/kontent": "content",
  "/bonus": "bonus",
  "/harajatlar": "dashboard",
  "/finance": "dashboard",
  "/safar": "travelPlans",
  "/analytics": "analytics",
  "/kunlik-hisobotlar": "dailyReports",
  "/reklama": "campaigns",
  "/media": "uploads",
  "/hodimlar": "users",
  "/vazifalar": "tasks",
  "/audit": "audit",
  "/profil": "profile",
  "/sozlamalar": "settings"
};

const PERMISSION_OPTIONS = [
  { id: "dashboard", label: "Bosh sahifa" },
  { id: "managerLab", label: "Manager OS Lab" },
  { id: "content", label: "Kontent reja" },
  { id: "content_create", label: "Kontent qo'shish" },
  { id: "content_edit", label: "Kontent tahrirlash" },
  { id: "content_delete", label: "Kontent o'chirish" },
  { id: "bonus", label: "Bonus tizimi" },
  { id: "bonus_create", label: "Bonus qo'shish" },
  { id: "bonus_edit", label: "Bonus tahrirlash" },
  { id: "bonus_delete", label: "Bonus o'chirish" },
  { id: "travelPlans", label: "Safar rejasi" },
  { id: "travelPlans_create", label: "Safar reja qo'shish" },
  { id: "travelPlans_edit", label: "Safar reja tahrirlash" },
  { id: "travelPlans_delete", label: "Safar reja o'chirish" },
  { id: "analytics", label: "Analitika va hisobot" },
  { id: "dailyReports", label: "Platforma monitoringi" },
  { id: "dailyReports_edit", label: "Hisobot tahrirlash" },
  { id: "dailyReports_delete", label: "Hisobot o'chirish" },
  { id: "campaigns", label: "Reklama va aksiyalar" },
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
  { id: "profile", label: "Profil" },
  { id: "settings", label: "Sozlamalar" }
];

const DIRECTOR_PERMISSION_PRESET = PERMISSION_OPTIONS.map((item) => item.id);

const ROLE_WORKSPACE_PRESETS = {
  director: ["dashboard", "managerLab", "analytics", "dailyReports", "campaigns", "profile"],
  manager: ["dashboard", "managerLab", "content", "tasks", "travelPlans", "campaigns", "analytics", "dailyReports", "profile"],
  editor: ["dashboard", "tasks", "uploads", "content", "profile"],
  mobilograf: ["content", "profile"],
  viewer: ["dashboard", "content", "campaigns", "analytics", "dailyReports", "profile"]
};

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
      department_role: "Director",
      permissions_json: DIRECTOR_PERMISSION_PRESET
    };
  }

  return null;
}

function formatRoleLabel(role) {
  if (role === "director") return "director";
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


function readNumber(row = {}, keys = []) {
  for (const key of keys) {
    const raw = row?.[key];
    if (raw !== undefined && raw !== null && raw !== "") {
      const normalized = typeof raw === "string" ? raw.replace(/[^0-9.-]/g, "") : raw;
      const value = Number(normalized);
      if (!Number.isNaN(value)) return value;
    }
  }
  return 0;
}

function getCampaignSpendValue(row = {}) {
  const direct = readNumber(row, ["spend", "budget_spent", "spent_amount", "total_spent", "amount_spent"]);
  if (direct) return direct;
  const daily = readNumber(row, ["daily_budget", "daily_budget_amount", "budget"]);
  if (!daily) return 0;
  const start = getDateSortValue(row.start_at || row.start_date, null);
  const end = getDateSortValue(row.end_at || row.end_date, null);
  if (!start || !end || end < start) return daily;
  const days = Math.max(1, Math.ceil((end - start) / 86400000));
  return daily * Math.min(days, 31);
}

function getCampaignLeadValue(row = {}) {
  return readNumber(row, ["lead_count", "leads", "leads_count", "messages", "requests", "murojaatlar"]);
}

function getCampaignViewValue(row = {}) {
  return readNumber(row, ["views", "view_count", "impressions", "reach", "prosmotr", "views_count"]);
}

function getCampaignCplValue(row = {}) {
  const manual = readNumber(row, ["cpl_amount", "cpa", "cpl"]);
  if (manual) return manual;
  const leads = getCampaignLeadValue(row);
  const spend = getCampaignSpendValue(row);
  return leads ? spend / leads : 0;
}

function getCampaignPerformance(row = {}) {
  const leads = getCampaignLeadValue(row);
  const views = getCampaignViewValue(row);
  const spend = getCampaignSpendValue(row);
  const cpl = getCampaignCplValue(row);
  const status = normalizeCampaignStatus(row.status);
  let score = 44;
  if (leads >= 60) score += 26;
  else if (leads >= 25) score += 18;
  else if (leads >= 10) score += 10;
  else if (leads > 0) score += 4;

  if (cpl > 0 && cpl <= 30000) score += 22;
  else if (cpl > 0 && cpl <= 60000) score += 16;
  else if (cpl > 0 && cpl <= 100000) score += 8;
  else if (cpl > 100000) score -= 12;

  if (views >= 15000) score += 10;
  else if (views >= 5000) score += 6;
  if (status === "paused") score -= 8;
  if (status === "done") score -= 3;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tone = score >= 78 ? "success" : score >= 58 ? "warning" : "danger";
  const label = score >= 78 ? "Yashil" : score >= 58 ? "Sariq" : "Qizil";
  const recommendation = tone === "success"
    ? "Davom ettirish yoki byudjetni ehtiyotkor oshirish mumkin."
    : tone === "warning"
      ? "Kreativ, auditoriya yoki offerni A/B test qilish kerak."
      : "Kampaniyani tekshirish: offer, segment, kreativi yoki filial mosligi zaif.";
  return { score, tone, label, leads, views, spend, cpl, recommendation };
}

function getMonthDaysCount(monthLabel) {
  const [year, month] = String(monthLabel || getMonthLabel()).split("-").map(Number);
  if (!year || !month) return 30;
  return new Date(year, month, 0).getDate();
}

function getDateDayNumber(dateValue) {
  const date = formatDate(dateValue);
  if (date === "-") return null;
  const day = Number(date.slice(-2));
  return Number.isNaN(day) ? null : day;
}

function CommandCenterV8({ contentRows = [], campaigns = [], tasks = [], dailyReports = [], onNavigate = null }) {
  const todayKey = formatDate(new Date());
  const currentMonth = getMonthLabel();
  const monthRows = (contentRows || []).filter((row) => formatDate(row.publish_date || row.created_at).startsWith(currentMonth));
  const openTasks = (tasks || []).filter((row) => !["done", "yakunlandi", "closed"].includes(String(row.status || "").toLowerCase()));
  const activeCampaigns = (campaigns || []).filter((row) => normalizeCampaignStatus(row.status) === "active");
  const todayContent = monthRows.filter((row) => formatDate(row.publish_date || row.created_at) === todayKey);
  const overdueContent = monthRows.filter((row) => {
    const publishDate = formatDate(row.publish_date || row.created_at);
    const status = String(row.status || "").toLowerCase();
    return publishDate !== "-" && publishDate < todayKey && !["joylangan", "yakunlandi", "published"].includes(status);
  });
  const dueTasks = openTasks.filter((row) => formatDate(row.due_date) === todayKey);
  const overdueTasks = openTasks.filter((row) => {
    const due = formatDate(row.due_date);
    return due !== "-" && due < todayKey;
  });
  const ads = activeCampaigns.map((row) => ({ row, ...getCampaignPerformance(row) }));
  const spend = ads.reduce((sum, item) => sum + item.spend, 0);
  const leads = ads.reduce((sum, item) => sum + item.leads, 0);
  const avgCpl = leads ? spend / leads : 0;
  const dangerAds = ads.filter((item) => item.tone === "danger");
  const todayReports = (dailyReports || []).filter((row) => formatDate(row.report_date || row.created_at) === todayKey);
  const platformUnits = todayReports.reduce((sum, row) => sum + Number(row.posts_count || 0) + Number(row.stories_count || 0) + Number(row.reels_count || 0), 0);
  const missionRows = [
    {
      title: "Bugungi publish nazorati",
      value: todayContent.length,
      hint: todayContent.length ? "kontent kartalarini tekshirish" : "bugun publish yo'q",
      tone: todayContent.length ? "success" : "idle",
      page: "content"
    },
    {
      title: "Deadline risk",
      value: overdueContent.length + overdueTasks.length,
      hint: overdueContent.length || overdueTasks.length ? "tezkor signal kerak" : "deadline toza",
      tone: overdueContent.length || overdueTasks.length ? "danger" : "success",
      page: overdueContent.length ? "content" : "tasks"
    },
    {
      title: "Faol target pulse",
      value: activeCampaigns.length,
      hint: avgCpl ? `CPL ${formatMoney(Math.round(avgCpl))}` : "lead kiritilsa tahlil ochiladi",
      tone: dangerAds.length ? "warning" : "success",
      page: "campaigns"
    },
    {
      title: "Platforma monitoring",
      value: platformUnits,
      hint: `${todayReports.length} ta kunlik hisobot`,
      tone: platformUnits ? "success" : "idle",
      page: "dailyReports"
    }
  ];
  const timeline = [
    ...todayContent.slice(0, 3).map((row) => ({ title: row.title || "Kontent", meta: `${row.platform || row.platform_primary || "platforma"} • ${formatApprovalStatus(row.status || "reja")}`, page: "content" })),
    ...dueTasks.slice(0, 2).map((row) => ({ title: row.title || "Task", meta: `${row.priority || "normal"} • ${taskStatusLabel(row.status)}`, page: "tasks" })),
    ...ads.slice(0, 3).map((item) => ({ title: item.row.title || "Target", meta: `${item.label} • ${item.leads} lid • ${item.cpl ? formatMoney(Math.round(item.cpl)) : "CPL yo'q"}`, page: "campaigns" }))
  ].slice(0, 6);
  const aiAdvice = dangerAds.length
    ? `${dangerAds.length} ta target qizil zonada. Avval CPL yuqori kreativlarni pauza qilib, yangi hook/offerni test qiling.`
    : overdueContent.length || overdueTasks.length
      ? "Bugungi eng katta xavf — deadline. Kontent va tasklarni yakunlash targetdan ham muhimroq."
      : activeCampaigns.length
        ? "Operatsion holat yaxshi. Yaxshi ishlayotgan targetlarga 10–20% byudjet test qilish mumkin."
        : "Tizim sokin. Bugun kontent ritmi va keyingi aksiya briefini tayyorlashga fokus bering.";

  return (
    <section className="v8-command-center">
      <div className="v8-command-head">
        <div>
          <span>V8 Command Center</span>
          <h2>Bugungi ishni boshqaradigan real panel</h2>
          <p>Kontent, task, target va platforma monitoringi bir joyda. Bu yer rahbar yoki SMM menejer ochishi kerak bo'lgan birinchi ekran.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => onNavigate?.("content")}>Tezkor kontent qo'shish</button>
      </div>
      <div className="v8-mission-grid">
        {missionRows.map((item) => (
          <button key={item.title} type="button" className={`v8-mission-card ${item.tone}`} onClick={() => onNavigate?.(item.page)}>
            <span>{item.title}</span>
            <strong>{item.value}</strong>
            <small>{item.hint}</small>
          </button>
        ))}
      </div>
      <div className="v8-command-layout">
        <article className="v8-ai-card">
          <span>AI xulosa</span>
          <h3>{dangerAds.length ? "Targetni qayta ko'rish kerak" : overdueContent.length || overdueTasks.length ? "Deadline birinchi o'rinda" : "Operatsiya stabil"}</h3>
          <p>{aiAdvice}</p>
          <div className="v8-ai-actions">
            <button type="button" onClick={() => onNavigate?.("campaigns")}>Target analytics</button>
            <button type="button" onClick={() => onNavigate?.("tasks")}>Tasklar</button>
          </div>
        </article>
        <article className="v8-live-feed">
          <div className="v8-feed-head"><strong>Bugungi live feed</strong><span>{timeline.length} signal</span></div>
          {timeline.length ? timeline.map((item, index) => (
            <button key={`${item.title}-${index}`} type="button" onClick={() => onNavigate?.(item.page)}>
              <i>{index + 1}</i>
              <div><strong>{item.title}</strong><span>{item.meta}</span></div>
            </button>
          )) : <p>Bugun uchun signal yo'q. Reja kiritilsa shu yerda chiqadi.</p>}
        </article>
      </div>
    </section>
  );
}

function ContentRhythmV8({ rows = [], selectedMonth, onCalendar = null }) {
  const daysCount = getMonthDaysCount(selectedMonth);
  const todayKey = formatDate(new Date());
  const cells = Array.from({ length: daysCount }, (_, index) => {
    const day = index + 1;
    const date = `${selectedMonth}-${String(day).padStart(2, "0")}`;
    const items = (rows || []).filter((row) => formatDate(row.publish_date) === date);
    const done = items.filter((row) => ["yakunlandi", "joylangan", "published"].includes(String(row.status || "").toLowerCase())).length;
    const video = items.filter((row) => /video|reels|shorts|youtube/i.test(`${row.content_type || ""} ${row.platform || ""}`)).length;
    const risk = items.filter((row) => {
      const status = String(row.status || "").toLowerCase();
      return date < todayKey && !["yakunlandi", "joylangan", "published"].includes(status);
    }).length;
    return { day, date, items, done, video, risk };
  });
  const busyDays = cells.filter((cell) => cell.items.length).length;
  const emptyDays = cells.filter((cell) => !cell.items.length).length;
  const maxLoad = Math.max(...cells.map((cell) => cell.items.length), 1);
  const videoDays = cells.filter((cell) => cell.video).length;
  const riskDays = cells.filter((cell) => cell.risk).length;
  const bestEmpty = cells.filter((cell) => !cell.items.length && cell.date >= todayKey).slice(0, 4);
  const rhythmScore = Math.round(((busyDays / Math.max(daysCount, 1)) * 55) + ((videoDays / Math.max(busyDays || 1, 1)) * 25) + (riskDays ? 0 : 20));

  return (
    <section className="v8-rhythm-panel">
      <div className="v8-rhythm-head">
        <div>
          <span>V8 kontent ritm analiz</span>
          <h2>{getMonthTitle(selectedMonth)} kalendari qanchalik sog'lom?</h2>
          <p>Bo'sh kunlar, yuklama, video kunlari va deadline risklar avtomatik ko'rinadi.</p>
        </div>
        <div className="v8-rhythm-score"><strong>{Math.min(100, rhythmScore)}%</strong><span>ritm score</span></div>
      </div>
      <div className="v8-rhythm-stats">
        <div><span>Faol kun</span><strong>{busyDays}</strong><small>{daysCount} kundan</small></div>
        <div><span>Bo'sh kun</span><strong>{emptyDays}</strong><small>reja qo'shish mumkin</small></div>
        <div><span>Video kun</span><strong>{videoDays}</strong><small>reels / shorts</small></div>
        <div className={riskDays ? "danger" : "success"}><span>Risk kun</span><strong>{riskDays}</strong><small>{riskDays ? "deadline bor" : "toza"}</small></div>
      </div>
      <div className="v8-rhythm-grid">
        {cells.map((cell) => (
          <button key={cell.date} type="button" className={`v8-rhythm-cell load-${Math.min(4, cell.items.length)} ${cell.risk ? "risk" : ""} ${cell.date === todayKey ? "today" : ""}`} style={{ "--load": `${Math.max(8, (cell.items.length / maxLoad) * 100)}%` }} onClick={() => onCalendar?.()}>
            <span>{cell.day}</span>
            <strong>{cell.items.length}</strong>
            {cell.video ? <i>V</i> : null}
          </button>
        ))}
      </div>
      <div className="v8-rhythm-suggestion">
        <strong>Tez tavsiya</strong>
        <span>{bestEmpty.length ? `Keyingi bo'sh sanalar: ${bestEmpty.map((cell) => cell.date.slice(-2)).join(", ")}. Shu kunlarga story/reels yoki xizmatlar posti qo'shing.` : "Bu oy kunlar yaxshi to'ldirilgan. Endi sifat va CTA nazoratini kuchaytiring."}</span>
      </div>
    </section>
  );
}

function CampaignPerformanceV8({ campaigns = [], branches = [], onView = null, onEdit = null, onCopy = null }) {
  const rows = [...(campaigns || [])]
    .map((row) => ({ row, ...getCampaignPerformance(row) }))
    .sort((a, b) => b.score - a.score);
  const active = rows.filter((item) => normalizeCampaignStatus(item.row.status) === "active");
  const spend = rows.reduce((sum, item) => sum + item.spend, 0);
  const leads = rows.reduce((sum, item) => sum + item.leads, 0);
  const avgCpl = leads ? spend / leads : 0;
  const best = rows[0];
  const red = rows.filter((item) => item.tone === "danger").length;
  const byBranch = Object.values(rows.reduce((acc, item) => {
    const branch = branches.find((b) => Number(b.id) === Number(item.row.branch_id));
    const key = branch?.name || "Filialsiz";
    if (!acc[key]) acc[key] = { name: key, leads: 0, spend: 0, count: 0 };
    acc[key].leads += item.leads;
    acc[key].spend += item.spend;
    acc[key].count += 1;
    return acc;
  }, {})).sort((a, b) => b.leads - a.leads).slice(0, 5);

  return (
    <section className="v8-campaign-panel">
      <div className="v8-campaign-head">
        <div>
          <span>V8 Target Analytics</span>
          <h2>Yashil / sariq / qizil reklama nazorati</h2>
          <p>CPL, lid, ko'rish va sarf bo'yicha kampaniyalarni avtomatik baholaydi. Qaysi targetni kuchaytirish, qaysisini qayta ishlash kerakligi ko'rinadi.</p>
        </div>
        <div className="v8-campaign-best">
          <span>Eng yaxshi</span>
          <strong>{best?.row?.title || "Hali yo'q"}</strong>
          <small>{best ? `${best.score}% • ${best.leads} lid` : "Kampaniya qo'shing"}</small>
        </div>
      </div>
      <div className="v8-campaign-stats">
        <div><span>Faol target</span><strong>{active.length}</strong><small>hozir ishlayotgan</small></div>
        <div><span>Jami lid</span><strong>{leads}</strong><small>kampaniya natijasi</small></div>
        <div><span>O'rtacha CPL</span><strong>{avgCpl ? formatMoney(Math.round(avgCpl)) : "-"}</strong><small>lead narxi</small></div>
        <div className={red ? "danger" : "success"}><span>Qizil zona</span><strong>{red}</strong><small>{red ? "optimizatsiya kerak" : "toza"}</small></div>
      </div>
      <div className="v8-campaign-layout">
        <div className="v8-campaign-list">
          {rows.length ? rows.slice(0, 8).map((item) => (
            <article key={item.row.id} className={`v8-campaign-row ${item.tone}`}>
              <div className="v8-campaign-row-main">
                <span>{item.label} • {item.score}%</span>
                <strong>{item.row.title}</strong>
                <small>{item.row.platform || "platforma"} • {item.leads} lid • {item.cpl ? formatMoney(Math.round(item.cpl)) : "CPL yo'q"}</small>
              </div>
              <div className="v8-campaign-meter"><i style={{ width: `${item.score}%` }} /></div>
              <p>{item.recommendation}</p>
              <div className="v8-campaign-actions">
                <button type="button" onClick={() => onView?.(item.row)}>Ko'rish</button>
                <button type="button" onClick={() => onEdit?.(item.row)}>Tahrirlash</button>
                <button type="button" onClick={() => onCopy?.(item.row)}>Forma link</button>
              </div>
            </article>
          )) : <div className="empty-block">Kampaniya hali yo'q</div>}
        </div>
        <div className="v8-branch-scoreboard">
          <strong>Filiallar bo'yicha target natijasi</strong>
          {byBranch.length ? byBranch.map((item) => {
            const cpl = item.leads ? item.spend / item.leads : 0;
            return (
              <div key={item.name}>
                <span>{item.name}</span>
                <b>{item.leads} lid</b>
                <small>{cpl ? formatMoney(Math.round(cpl)) : "CPL yo'q"}</small>
              </div>
            );
          }) : <p>Filialga bog'langan kampaniya yo'q.</p>}
        </div>
      </div>
    </section>
  );
}

function addDaysToDateKey(dateKey, days = 0) {
  const raw = formatDate(dateKey);
  if (raw === "-") return formatDate(new Date(Date.now() + days * 86400000));
  const d = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(d.getTime())) return raw;
  d.setDate(d.getDate() + Number(days || 0));
  return formatDate(d);
}

function getContentStage(row = {}) {
  const status = String(row.status || "reja").toLowerCase();
  if (["joylangan", "yakunlandi", "published", "done"].includes(status)) return { id: "published", label: "Joylandi", tone: "success" };
  if (["tasdiqlandi", "tasdiqda", "review", "approval"].includes(status)) return { id: "review", label: "Tasdiqda", tone: "warning" };
  if (["jarayonda", "tayyorlanmoqda", "tayyor", "doing"].includes(status)) return { id: "production", label: "Ishda", tone: "info" };
  if (["qayta_ishlash", "rad_etildi", "rejected"].includes(status)) return { id: "fix", label: "Qayta ishlash", tone: "danger" };
  return { id: "idea", label: "G'oya", tone: "default" };
}

function buildContentClonePayload(row = {}, publishDate) {
  return {
    title: row.title || "Yangi kontent",
    publish_date: publishDate,
    status: "reja",
    platform: row.platform || row.platform_primary || "Instagram",
    content_type: row.content_type || "post",
    rubric: row.rubric || "rubrika-yoq",
    assigned_user_id: row.assigned_user_id || "",
    video_editor_user_id: row.video_editor_user_id || "",
    video_face_user_id: row.video_face_user_id || "",
    bonus_enabled: false,
    proposal_count: 0,
    approved_count: 0,
    difficulty_level: row.difficulty_level || "sodda",
    notes: row.notes || row.note || "V9 duplicate orqali yaratildi",
    branch_ids_json: Array.isArray(row.branch_ids_json) ? row.branch_ids_json : [],
    scenario_text: row.scenario_text || "",
    shot_list_text: row.shot_list_text || "",
    hook_text: row.hook_text || "",
    main_body_text: row.main_body_text || "",
    cta_text: row.cta_text || "",
    product_name: row.product_name || "",
    video_type: row.video_type || "",
    preview_url: "",
    final_url: "",
    edit_file_url: "",
    approval_comment: "",
    content_template: row.content_template || "custom",
    idea_score: 0,
    visual_score: 0,
    editing_score: 0,
    result_score: 0,
    reach_value: 0
  };
}

function ContentCalendarProV9({ rows = [], selectedMonth, users = [], branches = [], onToast, reload, disabled = false }) {
  const [busy, setBusy] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const daysCount = getMonthDaysCount(selectedMonth);
  const todayKey = formatDate(new Date());
  const monthRows = (rows || []).filter((row) => formatDate(row.publish_date || row.created_at).startsWith(selectedMonth));
  const cells = Array.from({ length: daysCount }, (_, index) => {
    const date = `${selectedMonth}-${String(index + 1).padStart(2, "0")}`;
    const items = monthRows.filter((row) => formatDate(row.publish_date) === date);
    return { date, day: index + 1, items };
  });
  const selectedCell = cells.find((cell) => cell.date === selectedDay) || cells.find((cell) => cell.date >= todayKey) || cells[0];
  const stages = monthRows.reduce((acc, row) => {
    const meta = getContentStage(row);
    acc[meta.id] = (acc[meta.id] || 0) + 1;
    return acc;
  }, {});
  const nextEmptyDays = cells.filter((cell) => !cell.items.length && cell.date >= todayKey).slice(0, 6);
  const weeklyTemplates = [
    { dayOffset: 0, title: "aloo academy: mijoz ko'p so'raydigan savol", platform: "Instagram", content_type: "carousel", rubric: "foydali-malumot" },
    { dayOffset: 2, title: "Mahsulot reklama: narx + oyiga to'lov", platform: "Instagram", content_type: "post", rubric: "aksiyalar" },
    { dayOffset: 4, title: "Reels: do'kondagi real vaziyat", platform: "Instagram", content_type: "reels", rubric: "trend-video" },
    { dayOffset: 6, title: "Xizmatlarimiz: Paynet / alif / aloo care", platform: "Telegram", content_type: "post", rubric: "xizmatlar" }
  ];

  function getNextMonday() {
    const base = new Date(`${selectedMonth}-01T00:00:00`);
    const now = new Date(`${todayKey}T00:00:00`);
    if (formatDate(now).startsWith(selectedMonth) && now > base) base.setDate(now.getDate());
    const diff = (8 - base.getDay()) % 7;
    base.setDate(base.getDate() + diff);
    return formatDate(base);
  }

  async function generateWeekPlan() {
    if (disabled || busy) return;
    const start = selectedCell?.date && selectedCell.date >= todayKey ? selectedCell.date : getNextMonday();
    try {
      setBusy(true);
      for (const template of weeklyTemplates) {
        const date = addDaysToDateKey(start, template.dayOffset);
        if (!date.startsWith(selectedMonth)) continue;
        await api.create("content", buildContentClonePayload({ ...template, notes: "V9 haftalik generator orqali yaratildi" }, date));
      }
      await reload?.();
      onToast?.("V9 haftalik kontent reja yaratildi", "success");
    } catch (err) {
      onToast?.(err.message || "Haftalik reja yaratilmay qoldi", "error");
    } finally {
      setBusy(false);
    }
  }

  async function duplicateToNextWeek(row) {
    if (disabled || busy) return;
    try {
      setBusy(true);
      const nextDate = addDaysToDateKey(row.publish_date, 7);
      await api.create("content", buildContentClonePayload({ ...row, title: `${row.title || "Kontent"} / duplicate` }, nextDate));
      await reload?.();
      onToast?.("Kontent keyingi haftaga duplicate qilindi", "success");
    } catch (err) {
      onToast?.(err.message || "Duplicate bajarilmadi", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="v15-panel v9-calendar-pro">
      <div className="v15-panel-head">
        <div>
          <span>V9 Content Calendar Pro</span>
          <h2>Oylik reja endi real workflow kalendar</h2>
          <p>Status, mas'ul, platforma, bo'sh kun va duplicate nazorati bitta blokda. Generator bir haftalik ritmni avtomatik kiritadi.</p>
        </div>
        <div className="v15-actions">
          <button type="button" className="btn secondary" onClick={() => setSelectedDay(nextEmptyDays[0]?.date || todayKey)}>Bo'sh kunga o'tish</button>
          <button type="button" className="btn primary" onClick={generateWeekPlan} disabled={disabled || busy}>{busy ? "Yaratilmoqda..." : "AI haftalik reja"}</button>
        </div>
      </div>
      <div className="v15-stat-grid four">
        <div><span>Jami</span><strong>{monthRows.length}</strong><small>{getMonthTitle(selectedMonth)}</small></div>
        <div><span>G'oya</span><strong>{stages.idea || 0}</strong><small>brief kerak</small></div>
        <div><span>Ishda</span><strong>{stages.production || 0}</strong><small>dizayn/montaj</small></div>
        <div><span>Joylandi</span><strong>{stages.published || 0}</strong><small>yakunlangan</small></div>
      </div>
      <div className="v9-calendar-layout">
        <div className="v9-month-board">
          {cells.map((cell) => {
            const hasVideo = cell.items.some((item) => /video|reels|shorts/i.test(`${item.content_type || ""} ${item.platform || ""}`));
            const risk = cell.date < todayKey && cell.items.some((item) => getContentStage(item).id !== "published");
            return (
              <button key={cell.date} type="button" className={`v9-day ${selectedCell?.date === cell.date ? "active" : ""} ${cell.items.length ? "busy" : "empty"} ${risk ? "risk" : ""}`} onClick={() => setSelectedDay(cell.date)}>
                <span>{cell.day}</span>
                <strong>{cell.items.length}</strong>
                {hasVideo ? <i>Reels</i> : null}
              </button>
            );
          })}
        </div>
        <aside className="v9-day-detail">
          <span>Tanlangan sana</span>
          <h3>{selectedCell?.date || selectedMonth}</h3>
          <p>{selectedCell?.items?.length ? `${selectedCell.items.length} ta kontent rejalangan.` : "Bu kun bo'sh. Generator yoki formadan reja kiriting."}</p>
          <div className="v9-day-list">
            {(selectedCell?.items || []).slice(0, 5).map((item) => {
              const meta = getContentStage(item);
              return (
                <article key={item.id} className={`v9-content-mini ${meta.tone}`}>
                  <div><strong>{item.title}</strong><span>{item.platform || item.platform_primary || "platforma"} • {meta.label}</span></div>
                  <button type="button" onClick={() => duplicateToNextWeek(item)} disabled={busy}>+7 kun</button>
                </article>
              );
            })}
          </div>
          <div className="v9-suggestion-box">
            <strong>Keyingi bo'sh kunlar</strong>
            <span>{nextEmptyDays.length ? nextEmptyDays.map((cell) => cell.date.slice(-2)).join(" • ") : "Oy to'liq band"}</span>
          </div>
          <div className="v9-quick-meta">
            <span>{users.length} hodim</span><span>{branches.length} filial</span><span>{weeklyTemplates.length} shablon</span>
          </div>
        </aside>
      </div>
    </section>
  );
}

function TaskKanbanProV10({ tasks = [], users = [], user = null, onToast, reload }) {
  const [busy, setBusy] = useState(false);
  const todayKey = formatDate(new Date());
  const columns = [
    { id: "todo", label: "Yangi" },
    { id: "doing", label: "Jarayonda" },
    { id: "review", label: "Tasdiqda" },
    { id: "done", label: "Tugadi" },
    { id: "cancelled", label: "Bekor" }
  ];
  const open = tasks.filter((task) => !["done", "cancelled"].includes(String(task.status || "").toLowerCase()));
  const overdue = open.filter((task) => { const due = formatDate(task.due_date); return due !== "-" && due < todayKey; });
  const urgent = open.filter((task) => String(task.priority || "").toLowerCase() === "high");
  const quickTasks = [
    "Bugungi kontent publish nazorati",
    "Target CPL va lidlarni yangilash",
    "Mobilografdan final video linkini olish",
    "Telegram kanal uchun caption tayyorlash"
  ];

  async function moveTask(row, status) {
    try {
      setBusy(true);
      await api.update("tasks", row.id, {
        title: row.title,
        description: row.description || "",
        status,
        priority: row.priority || "medium",
        due_date: formatDate(row.due_date) === "-" ? null : formatDate(row.due_date),
        assignee_user_id: row.assignee_user_id || user?.id || null
      });
      await reload?.();
      onToast?.("Task statusi yangilandi", "success");
    } catch (err) {
      onToast?.(err.message || "Task statusini yangilab bo'lmadi", "error");
    } finally {
      setBusy(false);
    }
  }

  async function createQuickTask(title) {
    try {
      setBusy(true);
      await api.create("tasks", { title, description: "V10 quick task orqali yaratildi", status: "todo", priority: "medium", due_date: todayKey, assignee_user_id: user?.id || null });
      await reload?.();
      onToast?.("Quick task yaratildi", "success");
    } catch (err) {
      onToast?.(err.message || "Quick task yaratilmadi", "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="v15-panel v10-task-pro">
      <div className="v15-panel-head">
        <div>
          <span>V10 Task Management Pro</span>
          <h2>Trello/Notion uslubidagi workflow</h2>
          <p>Tasklar status, deadline, mas'ul va prioritet bo'yicha real nazorat qilinadi. Tezkor tasklar bir bosishda yaratiladi.</p>
        </div>
        <div className="v15-actions"><button type="button" className="btn secondary" disabled={busy} onClick={() => createQuickTask(quickTasks[0])}>Bugungi check-list</button></div>
      </div>
      <div className="v15-stat-grid four">
        <div><span>Ochiq task</span><strong>{open.length}</strong><small>hozir bajariladi</small></div>
        <div className={overdue.length ? "danger" : "success"}><span>Kechikkan</span><strong>{overdue.length}</strong><small>{overdue.length ? "signal kerak" : "toza"}</small></div>
        <div><span>Urgent</span><strong>{urgent.length}</strong><small>high priority</small></div>
        <div><span>Jamoa</span><strong>{users.length}</strong><small>mas'ul xodimlar</small></div>
      </div>
      <div className="v10-board">
        {columns.map((column) => {
          const columnRows = tasks.filter((task) => String(task.status || "todo").toLowerCase() === column.id);
          return (
            <div key={column.id} className={`v10-column ${column.id}`}>
              <div className="v10-column-head"><strong>{column.label}</strong><span>{columnRows.length}</span></div>
              {columnRows.slice(0, 6).map((task) => (
                <article key={task.id} className={`v10-task-card priority-${task.priority || "medium"}`}>
                  <strong>{task.title}</strong>
                  <span>{task.assignee_name || "Mas'ul yo'q"} • {formatDate(task.due_date)}</span>
                  <div>
                    {columns.filter((item) => item.id !== column.id).slice(0, 3).map((target) => (
                      <button key={target.id} type="button" onClick={() => moveTask(task, target.id)} disabled={busy}>{target.label}</button>
                    ))}
                  </div>
                </article>
              ))}
              {!columnRows.length ? <p>Bo'sh</p> : null}
            </div>
          );
        })}
      </div>
      <div className="v10-quick-row">
        {quickTasks.map((title) => <button key={title} type="button" onClick={() => createQuickTask(title)} disabled={busy}>{title}</button>)}
      </div>
    </section>
  );
}

function TelegramBotProV11({ settings = {}, onToast }) {
  const [sending, setSending] = useState(false);
  const configured = Boolean(settings?.telegram_bot_token && (settings?.telegram_chat_id || settings?.telegram_chat_id === "configured"));
  const workflows = [
    ["🚀", "Target yoqildi", "kampaniya start / finish signali"],
    ["📌", "Yangi kontent", "reja, approval, joylandi holati"],
    ["⚠️", "Deadline risk", "kechikkan vazifa va kontent"],
    ["📊", "Kunlik digest", "rahbar uchun qisqa hisobot"]
  ];
  async function sendDigest() {
    try {
      setSending(true);
      const data = await api.post("/api/telegram/workflow-digest", { month_label: getMonthLabel() });
      onToast?.(data?.message || "Telegram digest yuborildi", "success");
    } catch (err) {
      onToast?.(err.message || "Telegram digest yuborilmadi", "error");
    } finally {
      setSending(false);
    }
  }
  async function sendTest() {
    try {
      setSending(true);
      const data = await api.create("settings/test-telegram", {});
      onToast?.(data?.message || "Telegram test yuborildi", "success");
    } catch (err) {
      onToast?.(err.message || "Telegram test yuborilmadi", "error");
    } finally {
      setSending(false);
    }
  }
  return (
    <section className="v15-panel v11-telegram-pro">
      <div className="v15-panel-head">
        <div>
          <span>V11 Telegram Bot Pro</span>
          <h2>Bot endi kuzatuvchi emas, workflow assistant</h2>
          <p>Test, kunlik digest va avtomatik workflow signallari uchun tayyor panel. Env/database sozlangan bo'lsa, tugmalar real xabar yuboradi.</p>
        </div>
        <div className="v15-actions">
          <button type="button" className="btn secondary" onClick={sendTest} disabled={sending || !configured}>Test</button>
          <button type="button" className="btn primary" onClick={sendDigest} disabled={sending || !configured}>{sending ? "Yuborilmoqda..." : "Kunlik digest"}</button>
        </div>
      </div>
      <div className="v11-workflows">
        {workflows.map(([icon, title, body]) => <div key={title}><b>{icon}</b><strong>{title}</strong><span>{body}</span></div>)}
      </div>
      <div className={`v11-config ${configured ? "ready" : "warning"}`}>
        <strong>{configured ? "Telegram ulangan" : "Telegram sozlash kerak"}</strong>
        <span>{configured ? "Bot token va chat ID tayyor." : "TELEGRAM_BOT_TOKEN va TELEGRAM_CHAT_ID/setting kiriting."}</span>
      </div>
    </section>
  );
}

function TargetAnalyticsProV12({ campaigns = [], branches = [], onEdit = null, onView = null }) {
  const rows = [...campaigns].map((row) => ({ row, ...getCampaignPerformance(row) }));
  const ranked = [...rows].sort((a, b) => b.score - a.score);
  const weak = ranked.filter((item) => item.tone === "danger");
  const winners = ranked.filter((item) => item.tone === "success");
  const byBranch = Object.values(rows.reduce((acc, item) => {
    const branch = branches.find((b) => Number(b.id) === Number(item.row.branch_id));
    const key = branch?.name || "Filialsiz";
    if (!acc[key]) acc[key] = { name: key, score: 0, leads: 0, spend: 0, count: 0 };
    acc[key].score += item.score;
    acc[key].leads += item.leads;
    acc[key].spend += item.spend;
    acc[key].count += 1;
    return acc;
  }, {})).map((item) => ({ ...item, avgScore: Math.round(item.score / Math.max(item.count, 1)), cpl: item.leads ? item.spend / item.leads : 0 })).sort((a, b) => b.avgScore - a.avgScore);
  const advice = weak.length
    ? `${weak[0].row.title} qizil zonada. Birinchi navbatda kreativ, auditoriya va offerni almashtiring.`
    : winners.length
      ? `${winners[0].row.title} yaxshi ishlayapti. Byudjetni ehtiyotkor 10–20% oshirib test qiling.`
      : "Kampaniyalarga spend, lid va view kiritilsa AI xulosa aniqroq bo'ladi.";
  return (
    <section className="v15-panel v12-target-pro">
      <div className="v15-panel-head">
        <div><span>V12 Target Analytics 2.0</span><h2>Filial reytingi + AI media-buyer xulosa</h2><p>Endi faqat CPL emas: branch ranking, qizil zona, g'olib kreativ va next action ko'rinadi.</p></div>
        <div className="v12-ai-box"><strong>AI xulosa</strong><span>{advice}</span></div>
      </div>
      <div className="v15-stat-grid four">
        <div><span>Yashil target</span><strong>{winners.length}</strong><small>kuchaytirish mumkin</small></div>
        <div><span>Sariq target</span><strong>{ranked.filter((i) => i.tone === "warning").length}</strong><small>A/B test</small></div>
        <div className={weak.length ? "danger" : "success"}><span>Qizil target</span><strong>{weak.length}</strong><small>{weak.length ? "to'xtat/yangila" : "toza"}</small></div>
        <div><span>Filial coverage</span><strong>{byBranch.length}</strong><small>reklama filiallari</small></div>
      </div>
      <div className="v12-layout">
        <div className="v12-ranking">
          <strong>Filial reytingi</strong>
          {byBranch.slice(0, 7).map((item, index) => <div key={item.name}><b>#{index + 1}</b><span>{item.name}</span><strong>{item.avgScore}%</strong><small>{item.leads} lid • {item.cpl ? formatMoney(Math.round(item.cpl)) : "CPL yo'q"}</small></div>)}
          {!byBranch.length ? <p>Filialga bog'langan target yo'q.</p> : null}
        </div>
        <div className="v12-action-list">
          <strong>Next actions</strong>
          {ranked.slice(0, 6).map((item) => <article key={item.row.id} className={item.tone}><span>{item.label} • {item.score}%</span><strong>{item.row.title}</strong><small>{item.recommendation}</small><div><button type="button" onClick={() => onView?.(item.row)}>Ko'rish</button><button type="button" onClick={() => onEdit?.(item.row)}>Tahrirlash</button></div></article>)}
        </div>
      </div>
    </section>
  );
}

function MediaLibraryProV13({ uploads = [], onFolder = null, onType = null }) {
  const totalSize = uploads.reduce((sum, item) => sum + Number(item.file_size || 0), 0);
  const images = uploads.filter((item) => String(item.mime_type || "").startsWith("image/")).length;
  const videos = uploads.filter((item) => String(item.mime_type || "").startsWith("video/")).length;
  const folders = Object.values(uploads.reduce((acc, item) => {
    const key = item.folder_name || "general";
    if (!acc[key]) acc[key] = { name: key, count: 0 };
    acc[key].count += 1;
    return acc;
  }, {})).sort((a, b) => b.count - a.count);
  return (
    <section className="v15-panel v13-media-pro">
      <div className="v15-panel-head">
        <div><span>V13 File & Media Library</span><h2>Brand media vault</h2><p>Logo, dizayn, video, montaj link va kampaniya fayllari papka/tag bo'yicha tez topiladi.</p></div>
        <div className="v15-actions"><button type="button" className="btn secondary" onClick={() => onType?.("image")}>Rasmlar</button><button type="button" className="btn secondary" onClick={() => onType?.("video")}>Videolar</button></div>
      </div>
      <div className="v15-stat-grid four"><div><span>Jami fayl</span><strong>{uploads.length}</strong><small>media arxiv</small></div><div><span>Rasm</span><strong>{images}</strong><small>post/design</small></div><div><span>Video</span><strong>{videos}</strong><small>reels/montaj</small></div><div><span>Hajm</span><strong>{totalSize ? `${Math.round(totalSize / 1024)}kb` : "-"}</strong><small>umumiy</small></div></div>
      <div className="v13-folder-row">{folders.length ? folders.map((folder) => <button key={folder.name} type="button" onClick={() => onFolder?.(folder.name)}><strong>{folder.name}</strong><span>{folder.count} fayl</span></button>) : <p>Hali fayl yuklanmagan.</p>}</div>
    </section>
  );
}

function RolePermissionMatrixV14({ users = [], onPreset = null }) {
  const roles = ["admin", "director", "manager", "editor", "mobilograf", "viewer"];
  return (
    <section className="v15-panel v14-role-pro">
      <div className="v15-panel-head"><div><span>V14 Role & Permission</span><h2>Kim nimani ko'radi — aniq role matrix</h2><p>Rollar bo'yicha workspace, permission preset va user count nazorat qilinadi.</p></div></div>
      <div className="v14-role-grid">
        {roles.map((role) => {
          const count = users.filter((user) => String(user.role || "viewer") === role).length;
          const perms = getRolePreset(role)?.permissions_json || ROLE_WORKSPACE_PRESETS[role] || [];
          return <article key={role}><span>{formatRoleLabel(role)}</span><strong>{count} user</strong><small>{perms.slice(0, 5).join(" • ") || "minimal"}</small><button type="button" onClick={() => onPreset?.(role)}>Presetni formaga qo'yish</button></article>;
        })}
      </div>
    </section>
  );
}

function MobilePwaProV15({ settings = {} }) {
  const siteName = settings?.platform_name || "alooSMM OS";
  const checks = [
    ["Mobile bottom nav", "Telefon ekranda asosiy menu tayyor"],
    ["PWA manifest", "Home Screen install uchun manifest mavjud"],
    ["iPhone guide", "Safari orqali Add to Home Screen yo'riqnomasi bor"],
    ["Offline shell", "Service worker ilova qobig'ini keshlaydi"]
  ];
  return (
    <section className="v15-panel v15-pwa-pro">
      <div className="v15-panel-head"><div><span>V15 Mobile / PWA App</span><h2>{siteName} telefon uchun appga yaqinlashtirildi</h2><p>Mobilograf va SMM menejer dalada telefon orqali task, media, content va dashboardni ishlatishi uchun PWA nazorat paneli.</p></div></div>
      <div className="v15-phone-preview">
        <div className="v15-phone-frame"><div className="v15-phone-top" /><h3>Bugungi vazifalar</h3><div className="v15-phone-card"><strong>Kontent publish</strong><span>2 ta signal</span></div><div className="v15-phone-card"><strong>Media upload</strong><span>kamera orqali yuklash</span></div><div className="v15-phone-nav"><i /><i /><i /><i /></div></div>
        <div className="v15-pwa-checks">{checks.map(([title, body]) => <div key={title}><strong>{title}</strong><span>{body}</span></div>)}</div>
      </div>
    </section>
  );
}


function formatDateTime(value) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return formatDate(value);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function getContentWorkTime(row = {}) {
  const direct = [row.publish_time, row.deadline_time, row.time]
    .map((value) => String(value || "").trim())
    .find((value) => /^\d{1,2}:\d{2}$/.test(value));
  if (direct) return direct.padStart(5, "0");
  const text = [row.approval_comment, row.notes, row.description].map((value) => String(value || "")).join(" / ");
  const labeled = text.match(/(?:vaqt|soat)\s*[:=-]?\s*(\d{1,2}:\d{2})/i);
  if (labeled) return labeled[1].padStart(5, "0");
  const loose = text.match(/\b(\d{1,2}:\d{2})\b/);
  return loose ? loose[1].padStart(5, "0") : "-";
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

function normalizeCampaignStatus(value) {
  const clean = String(value || "active").trim().toLowerCase();
  if (["pause", "pauza", "paused", "toxtatilgan", "to‘xtatilgan"].includes(clean)) return "paused";
  if (["done", "finished", "ended", "completed", "tugagan", "yakunlangan"].includes(clean)) return "done";
  return "active";
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
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => onCloseRef.current?.(), toast.variant === "toast" ? 2800 : 1600);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  if (toast.variant === "center-success") {
    return (
      <div className="success-overlay" aria-live="polite" aria-atomic="true" onClick={onClose}>
        <div className="success-wrapper">
          <div className="icon-wrap">
            <svg className="success-svg" viewBox="0 0 100 100" width="120" height="120" aria-hidden="true">
              <circle className="success-circle" cx="50" cy="50" r="40" fill="none" stroke="#1478F2" strokeWidth="6" strokeLinecap="round" />
              <polyline className="success-check" points="35 50 45 60 65 40" fill="none" stroke="#1478F2" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
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
      <div className="success-overlay delete-overlay" aria-live="polite" aria-atomic="true" onClick={onClose}>
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

function BillzCatalogPanel({ title, desc, kpis = [], tabs = [], rows = [], actionLabel = "Yangi yozuv" }) {
  return (
    <section className="billz-catalog-panel">
      <div className="billz-catalog-head">
        <div>
          <div className="billz-kicker">Aloo operating system</div>
          <h2>{title}</h2>
          {desc ? <p>{desc}</p> : null}
        </div>
        <button type="button" className="billz-action-btn">{actionLabel}</button>
      </div>
      <div className="billz-kpi-row">
        {kpis.map((item) => {
          const Icon = item.icon || LayoutGrid;
          return (
            <div key={item.label} className="billz-kpi-card">
              <span className="billz-kpi-icon"><Icon size={18} /></span>
              <div>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            </div>
          );
        })}
      </div>
      <div className="billz-toolbar">
        <div className="billz-tabs">
          {tabs.map((tab, index) => (
            <button key={tab} type="button" className={index === 0 ? "active" : ""}>{tab}</button>
          ))}
        </div>
        <div className="billz-searchbar">
          <Search size={16} />
          <span>Qidiruv, filtr va tezkor amal</span>
        </div>
        <button type="button" className="billz-filter-btn"><Filter size={16} /> Filtrlar</button>
      </div>
      <div className="billz-catalog-table">
        <div className="billz-catalog-tr head">
          <span>Nomi</span>
          <span>Tur</span>
          <span>Holat</span>
          <span>Qiymat</span>
        </div>
        {rows.length ? rows.slice(0, 6).map((row) => (
          <div key={row.id || row.name} className="billz-catalog-tr">
            <span className="billz-row-title">{row.name}</span>
            <span>{row.type}</span>
            <span><i className={`billz-dot ${row.tone || "info"}`} /> {row.status}</span>
            <strong>{row.value}</strong>
          </div>
        )) : (
          <div className="billz-empty-state">
            <Sparkles size={20} />
            <strong>Ma'lumot tayyorlanmoqda</strong>
            <span>Jadvalga yozuvlar kelganda shu yerda ko'rinadi.</span>
          </div>
        )}
      </div>
    </section>
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
    tasdiqlandi: { label: "Workflow", tone: "warning" },
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
    tasdiqlandi: { label: "Workflow", tone: "warning" },
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
  if (user?.role === "viewer") return false;
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
  { value: "lifehack-academy", label: "Lifehack / ACADEMY" },
  { value: "lifehack", label: "Lifehack" },
  { value: "abzor", label: "Abzor" },
  { value: "trend-video", label: "Trend video" },
  { value: "xodimlar-bilan", label: "Xodimlar bilan" },
  { value: "customer-heroes", label: "Mijozlar qahramonlarimiz" },
  { value: "xizmatlarimiz", label: "Xizmatlarimiz" },
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

function getDeadlineRisk(row = {}) {
  const deadline = formatDate(row.publish_date || row.deadline_date || row.plan_date);
  const done = ["yakunlandi", "joylangan", "paid", "published", "archived"].includes(String(row.status || row.paid_status || ""));
  if (deadline === "-" || done) return { tone: "success", label: done ? "Yakunlangan" : "Muddat yo'q" };
  const today = new Date(`${formatDate(new Date())}T00:00:00`);
  const date = new Date(`${deadline}T00:00:00`);
  if (Number.isNaN(date.getTime())) return { tone: "default", label: "Muddat yo'q" };
  const days = Math.ceil((date - today) / 86400000);
  if (days < 0) return { tone: "danger", label: `${Math.abs(days)} kun kechikdi` };
  if (days === 0) return { tone: "warning", label: "Bugun deadline" };
  if (days <= 3) return { tone: "warning", label: `${days} kun qoldi` };
  return { tone: "success", label: `${days} kun qoldi` };
}

function DeadlineRiskPill({ row }) {
  const risk = getDeadlineRisk(row);
  return <span className={`deadline-risk-pill ${risk.tone}`}>{risk.label}</span>;
}

function ContentStatusStepper({ status }) {
  const steps = [
    { id: "reja", label: "Reja" },
    { id: "tasdiqlandi", label: "Workflow" },
    { id: "jarayonda", label: "Ishda" },
    { id: "qayta_ishlash", label: "Revizion" },
    { id: "yakunlandi", label: "Yakun" }
  ];
  const normalized = ["tayyorlanmoqda", "tayyor"].includes(status) ? "jarayonda" : status === "joylangan" ? "yakunlandi" : status;
  const activeIndex = Math.max(0, steps.findIndex((step) => step.id === normalized));

  return (
    <div className="content-status-stepper">
      {steps.map((step, index) => (
        <span key={step.id} className={index <= activeIndex ? "active" : ""}>
          <i />
          {step.label}
        </span>
      ))}
    </div>
  );
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
  if (normalized === "lifehack-academy") return "academy";
  if (normalized === "customer-heroes") return "customer";
  if (normalized === "xizmatlarimiz") return "services";
  if (["sotuv", "sale-promo", "aksiyalar", "chegirma"].includes(normalized)) return "success";
  if (["trend-video", "lifehack", "unboxing", "intervyu"].includes(normalized)) return "info";
  if (["abzor", "locatsiya", "xodimlar-bilan"].includes(normalized)) return "warning";
  return "default";
}

function isAcademyContent(row = {}) {
  return String(row.rubric || "").toLowerCase() === "lifehack-academy" ||
    String(row.content_template || "").toLowerCase() === "aloo_academy";
}

function isCustomerHeroContent(row = {}) {
  return String(row.rubric || "").toLowerCase() === "customer-heroes" ||
    String(row.content_template || "").toLowerCase() === "customer_heroes";
}

function isServicesContent(row = {}) {
  return String(row.rubric || "").toLowerCase() === "xizmatlarimiz" ||
    String(row.content_template || "").toLowerCase() === "aloo_services";
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
  const [loginMode, setLoginMode] = useState("password");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [selectedRole, setSelectedRole] = useState("manager");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [loginOptions, setLoginOptions] = useState([]);
  const [loginStep, setLoginStep] = useState("phone");
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const logoSrc = LOGIN_LOGO;
  const companyLabel = normalizeAlooText(settings?.company_name || "aloo SMM");
  const platformLabel = normalizeAlooText(settings?.platform_name || "Yagona boshqaruv platformasi");
  const loginModes = [
    { id: "telegram", label: "Telefon", hint: "Telegram bot kodi", icon: Bot },
    { id: "password", label: "Parol", hint: "Login yoki telefon", icon: ShieldCheck },
    { id: "pin", label: "Lavozim", hint: "4 xonali kod", icon: ContactRound }
  ];
  const telegramSteps = [
    { id: "phone", label: "Raqam" },
    { id: "sent", label: "Kod yuborildi" },
    { id: "verify", label: "Tekshirish" },
    { id: "done", label: "Kirish" }
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
    setLoginStep("phone");
  }, [loginMode]);

  async function submit(e) {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      setNotice("");
      if (loginMode === "telegram") {
        setLoginStep("verify");
        const data = await api.verifyTelegramCode({ phone, code: otpCode });
        setLoginStep("done");
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
      setLoginStep("sent");
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
          <div className="brand-kicker">Aloo SMM Operating System {DESIGN_SYSTEM_VERSION}</div>
          <h1>Command center kirish oynasi</h1>
          <p>Telefon raqam va parol orqali alooSMM Manager OS ish muhitiga kiring.</p>
          <div className="login-public-nav">
            <a href="/platforma/">Platforma</a>
            <a href="/filiallar/">Filiallar</a>
            <a href="/boglanish/">Bog'lanish</a>
          </div>
          <div className="login-status-row compact">
            <span className="login-status-pill">Light UI</span>
            <span className="login-status-pill">Phone secure</span>
            <span className="login-status-pill">Admin workspace</span>
          </div>
          <div className="login-command-preview">
            <div className="login-command-top">
              <span>Live platform preview</span>
              <strong>OS 9.0</strong>
            </div>
            <div className="login-preview-metrics">
              <div><span>Kontent ritmi</span><strong>82%</strong></div>
              <div><span>Payroll ready</span><strong>12</strong></div>
              <div><span>Finance signal</span><strong>3</strong></div>
            </div>
            <div className="login-preview-flow">
              {["Studio", "MySeOne", "Finance", "AI signal"].map((item, index) => (
                <span key={item} className={index === 1 ? "active" : ""}>{item}</span>
              ))}
            </div>
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
          <div className="login-subtitle">Telefon raqam va parolni kiriting.</div>

          {false ? <div className="login-mode-switch">
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
          </div> : null}

          {loginMode === "telegram" ? (
            <div className="login-progress-steps">
              {telegramSteps.map((step, index) => {
                const activeIndex = telegramSteps.findIndex((item) => item.id === loginStep);
                return (
                  <span key={step.id} className={index <= activeIndex ? "active" : ""}>
                    <i>{index + 1}</i>
                    {step.label}
                  </span>
                );
              })}
            </div>
          ) : null}

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
                    onChange={(e) => {
                      const nextCode = e.target.value.replace(/\D+/g, "").slice(0, 6);
                      setOtpCode(nextCode);
                      setLoginStep(nextCode ? "verify" : "sent");
                    }}
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
                <span>Telefon raqam</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998931949200"
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
                  <option value="director">director</option>
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
            <span>aloo SMM platforma</span>
            <span className="login-card-pulse">live</span>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleWorkspacePanel({ role = "", summary = {}, contentRows = [], bonusItems = [], expenses = [], tasks = [], uploads = [], travelPlans = [], campaigns = [] }) {
  const normalizedRole = String(role || "viewer").toLowerCase();
  const currentMonth = getMonthLabel();
  const monthExpenses = (expenses || []).filter((item) => formatDate(item.expense_date).startsWith(currentMonth));
  const monthBonus = (bonusItems || []).filter((item) => (item.month_label || formatDate(item.work_date).slice(0, 7)) === currentMonth);
  const pendingTasks = (tasks || []).filter((item) => item.status !== "done");
  const overdueContent = (contentRows || []).filter((item) => getDeadlineRisk(item).tone === "danger");
  const roleConfigs = {
    director: {
      eyebrow: "Director workspace",
      title: "Finance, KPI va signal markazi",
      desc: "Pul oqimi, filial ritmi va risk signallari bitta ekranda.",
      cards: [
        { label: "Oylik harajat", value: formatMoney(monthExpenses.reduce((sum, item) => sum + Number(item.amount || 0), 0)), tone: "danger" },
        { label: "Budget signal", value: summary?.budget_alerts?.filter((item) => item.exceeded).length || 0, tone: "warning" },
        { label: "Faol target", value: (campaigns || []).filter((item) => !["done", "yakunlandi"].includes(String(item.status || ""))).length, tone: "info" },
        { label: "Smart signal", value: summary?.smart_alerts?.length || 0, tone: "success" }
      ]
    },
    manager: {
      eyebrow: "Manager workspace",
      title: "Studio, vazifa va workflow",
      desc: "Kontent reja, vazifalar va deadline risklari manager uchun jamlandi.",
      cards: [
        { label: "Kontent reja", value: contentRows.length, tone: "info" },
        { label: "Deadline risk", value: overdueContent.length, tone: overdueContent.length ? "danger" : "success" },
        { label: "Ochiq vazifa", value: pendingTasks.length, tone: "warning" },
        { label: "Workflow", value: contentRows.filter((item) => item.status === "tasdiqlandi").length, tone: "success" }
      ]
    },
    editor: {
      eyebrow: "Editor workspace",
      title: "Vazifa, fayl va montaj navbati",
      desc: "Editor uchun topshiriqlar, fayl kutubxonasi va kontent pipeline alohida ko'rinadi.",
      cards: [
        { label: "Ochiq vazifa", value: pendingTasks.length, tone: "warning" },
        { label: "Media fayl", value: uploads.length, tone: "info" },
        { label: "Qayta ishlash", value: contentRows.filter((item) => item.status === "qayta_ishlash").length, tone: "danger" },
        { label: "Yakunlangan", value: contentRows.filter((item) => ["yakunlandi", "joylangan"].includes(item.status)).length, tone: "success" }
      ]
    },
    mobilograf: {
      eyebrow: "Mobilograf workspace",
      title: "Safar, suratga olish va kontent topshiriq",
      desc: "Safar rejasi, deadline va media topshiriqlar mobilograf uchun qisqartirildi.",
      cards: [
        { label: "Safar reja", value: travelPlans.length, tone: "info" },
        { label: "Jarayonda", value: travelPlans.filter((item) => ["jarayonda", "tasvirga_olindi"].includes(item.status)).length, tone: "warning" },
        { label: "Deadline risk", value: overdueContent.length, tone: overdueContent.length ? "danger" : "success" },
        { label: "Media fayl", value: uploads.length, tone: "success" }
      ]
    },
    viewer: {
      eyebrow: "Viewer workspace",
      title: "Faqat kuzatish rejimi",
      desc: "Ma'lumotlarni ko'rish mumkin, yaratish va tahrirlash actionlari yopiq.",
      cards: [
        { label: "Kontent", value: contentRows.length, tone: "info" },
        { label: "Bonus", value: monthBonus.length, tone: "success" },
        { label: "Harajat", value: monthExpenses.length, tone: "warning" },
        { label: "Hisobot", value: summary?.today_report_count || 0, tone: "default" }
      ]
    }
  };
  const config = roleConfigs[normalizedRole] || roleConfigs.viewer;

  return (
    <div className={`role-workspace-panel role-${normalizedRole}`}>
      <div className="role-workspace-copy">
        <span className="small-label">{config.eyebrow}</span>
        <h2>{config.title}</h2>
        <p>{config.desc}</p>
      </div>
      <div className="role-workspace-grid">
        {config.cards.map((item) => (
          <div key={item.label} className={`role-workspace-card ${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashboardPage({ summary = {}, dailyReports = [], contentRows = [], campaigns = [], travelPlans = [], tasks = [], uploads = [], user = null }) {
  const currentMonth = getMonthLabel();
  const todayKey = formatDate(new Date());
  const currentMonthTitle = getMonthTitle(currentMonth);

  const thisMonthContent = (contentRows || []).filter((row) => {
    if (!row.publish_date) return false;
    return formatDate(row.publish_date).slice(0, 7) === currentMonth;
  });

  const totalPlan = thisMonthContent.length;
  const postedCount = thisMonthContent.filter((row) => ["joylangan", "yakunlandi", "published"].includes(String(row.status || ""))).length;
  const reviewCount = thisMonthContent.filter((row) => ["tasdiqlandi", "tasdiqlanishda", "tekshiruvda"].includes(String(row.status || ""))).length;
  const progress = totalPlan ? Math.round((postedCount / totalPlan) * 100) : 0;
  const publishedToday = (contentRows || []).filter((row) => formatDate(row.publish_date) === todayKey).length;

  const activeCampaignRows = (campaigns || []).filter((item) => {
    const status = String(item.status || "").toLowerCase();
    if (["done", "tugagan", "yakunlandi", "cancelled", "canceled"].includes(status)) return false;
    const endTime = getDateSortValue(item.end_at || item.end_date, Number.POSITIVE_INFINITY);
    return endTime >= Date.now();
  });
  const activeCampaigns = activeCampaignRows.length;
  const campaignSpend = Number(summary?.monthly_campaign_spend || activeCampaignRows.reduce((sum, item) => sum + Number(item.spend || item.budget_spent || 0), 0));
  const campaignLeads = activeCampaignRows.reduce((sum, item) => sum + Number(item.leads_count || item.leads || 0), 0);
  const campaignCpl = campaignLeads ? Math.round(campaignSpend / campaignLeads) : 0;

  const reminders = summary?.reminders || [];
  const dueSoon = Number(summary?.due_soon_task_count || 0);
  const overdue = Number(summary?.overdue_task_count || 0);
  const doneTasks = Number(summary?.daily_task_done || 0);
  const totalTasks = Number(summary?.daily_task_total || summary?.task_count || tasks.length || 0);
  const taskProgress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : Number(summary?.daily_task_progress || 0);

  const workflowSlaBreaches = [...(contentRows || []), ...(travelPlans || []), ...(tasks || [])].filter((row) => {
    const status = String(row.status || "");
    if (["tasdiqlandi", "yakunlandi", "joylangan", "published", "approved", "archived"].includes(status)) return false;
    const createdAt = new Date(row.created_at || row.plan_date || row.publish_date || Date.now());
    if (Number.isNaN(createdAt.getTime())) return false;
    return (Date.now() - createdAt.getTime()) / 3600000 >= 48;
  }).length;

  const branchKpis = Object.values((dailyReports || []).reduce((acc, row) => {
    const key = row.branch_name || "Filialsiz";
    if (!acc[key]) acc[key] = { name: key, score: 0, posts: 0, stories: 0, subscribers: 0 };
    acc[key].posts += Number(row.posts_count || 0);
    acc[key].stories += Number(row.stories_count || 0);
    acc[key].subscribers += Number(row.subscriber_count || 0);
    acc[key].score += Number(row.posts_count || 0) * 2 + Number(row.stories_count || 0);
    return acc;
  }, {})).sort((a, b) => b.score - a.score).slice(0, 5);
  const topBranch = branchKpis[0];
  const maxBranchScore = Math.max(...branchKpis.map((item) => item.score), 1);

  const contentSeries = [
    { label: "Reja", value: thisMonthContent.filter((r) => r.status === "reja").length },
    { label: "Jarayonda", value: thisMonthContent.filter((r) => ["tayyorlanmoqda", "jarayonda"].includes(r.status)).length },
    { label: "Tasdiqda", value: reviewCount },
    { label: "Joylangan", value: postedCount }
  ];
  const maxContentPoint = Math.max(...contentSeries.map((item) => item.value), 1);

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
  const maxSpendPoint = Math.max(...spendSeries.map((item) => item.amount), 1);

  const productionWorkflow = [
    { label: "Ssenariy", value: thisMonthContent.filter((item) => String(item.content_type || item.type || "").toLowerCase().includes("video") || item.script || item.scenario).length },
    { label: "Suratga olish", value: (tasks || []).filter((item) => /surat|video|reels|shorts|olish/i.test(`${item.title || ""} ${item.description || ""}`)).length },
    { label: "Montaj", value: (tasks || []).filter((item) => /montaj|edit|titr|musiqa/i.test(`${item.title || ""} ${item.description || ""}`)).length },
    { label: "Safar", value: travelPlans?.length || 0 }
  ];

  const smartAlerts = summary?.smart_alerts || [];
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

  const overallPulse = Math.max(12, Math.min(100, Math.round((progress + taskProgress + Math.max(0, 100 - (workflowSlaBreaches * 6))) / 3)));
  const userName = user?.full_name || user?.name || "Jamoa";

  const mainMetrics = [
    { label: "Kontent bajarilishi", value: `${progress}%`, desc: `${postedCount}/${totalPlan || 0} joylangan`, tone: progress >= 70 ? "success" : progress >= 40 ? "warning" : "danger", icon: Clapperboard },
    { label: "Faol reklama va aksiyalar", value: activeCampaigns, desc: campaignCpl ? `CPL ${formatMoney(campaignCpl)}` : "target holati", tone: "violet", icon: Target },
    { label: "Ish taqsimoti", value: `${Math.round(taskProgress)}%`, desc: `${doneTasks}/${totalTasks || 0} bajarilgan`, tone: dueSoon || overdue ? "warning" : "success", icon: ListTodo },
    { label: "Safar rejalari", value: travelPlans?.length || 0, desc: "o'z scope bo'yicha", tone: "blue", icon: PlaneTakeoff }
  ];

  const secondaryMetrics = [
    { label: "Bugungi monitoring", value: summary?.today_report_count || 0, desc: "platforma hisobotlari", tone: "blue" },
    { label: "Reklama sarfi", value: formatMoney(campaignSpend), desc: currentMonthTitle, tone: "violet" },
    { label: "Media arxiv", value: uploads?.length || 0, desc: "foto, video va dizaynlar", tone: "amber" },
    { label: "SLA signal", value: workflowSlaBreaches, desc: "48 soatdan oshgan", tone: workflowSlaBreaches ? "danger" : "success" }
  ];

  const latestContent = [...(contentRows || [])]
    .sort((a, b) => getDateSortValue(b.publish_date || b.created_at, 0) - getDateSortValue(a.publish_date || a.created_at, 0))
    .slice(0, 5);
  const latestReports = [...(dailyReports || [])]
    .sort((a, b) => getDateSortValue(b.report_date || b.created_at, 0) - getDateSortValue(a.report_date || a.created_at, 0))
    .slice(0, 5);
  const latestTasks = [...(tasks || [])]
    .sort((a, b) => getDateSortValue(a.due_date || a.created_at, Number.POSITIVE_INFINITY) - getDateSortValue(b.due_date || b.created_at, Number.POSITIVE_INFINITY))
    .slice(0, 5);

  return (
    <div className="command-dashboard-page">
      <section className="command-hero">
        <div className="command-hero-copy">
          <span className="command-kicker"><Sparkles size={16} /> aloo SMM Command Center</span>
          <h1>Boshqaruv markazi</h1>
          <p>Salom, <strong>{userName}</strong>. Kontent strategiyasi, ssenariylar, reklama kampaniyalari, media ishlab chiqarish va hisobotlar bir joyda nazorat qilinadi.</p>
          <div className="command-hero-actions">
            <button type="button" className="btn primary" onClick={() => api.exportFile("/api/export/content.xlsx", "content.xlsx")}>Kontent Excel</button>
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/campaigns.xlsx", "campaigns.xlsx")}>Kampaniya Excel</button>
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/daily-reports.xlsx", "daily-reports.xlsx")}>Hisobot Excel</button>
          </div>
        </div>
        <div className="command-hero-panel">
          <div className="command-pulse-ring">
            <span>{overallPulse}%</span>
            <small>operatsion pulse</small>
          </div>
          <div className="command-hero-list">
            <span><i /> {summary?.monthly_content_count || totalPlan} ta kontent</span>
            <span><i /> {activeCampaigns} ta faol target</span>
            <span><i /> {topBranch ? `${topBranch.name} top monitoring` : "Platforma monitoringi tayyorlanmoqda"}</span>
          </div>
        </div>
      </section>

      <section className="command-metric-grid">
        {mainMetrics.map((item) => {
          const Icon = item.icon;
          return (
            <article key={item.label} className={`command-metric-card ${item.tone}`}>
              <div className="command-metric-top">
                <span className="command-metric-icon"><Icon size={18} /></span>
                <span className="command-trend">real data</span>
              </div>
              <span className="command-metric-label">{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.desc}</small>
            </article>
          );
        })}
      </section>

      <section className="command-grid-main">
        <div className="command-card command-chart-card">
          <SectionTitle title="Kontent va reklama ritmi" desc={`${currentMonthTitle} bo‘yicha real jarayonlar`} />
          <div className="command-chart-tabs">
            <span>Kontent</span>
            <span>Reklama sarfi</span>
          </div>
          <div className="command-visual-grid">
            <div className="command-bars">
              {contentSeries.map((item) => (
                <div key={item.label} className="command-bar-row">
                  <span>{item.label}</span>
                  <div><i style={{ width: `${Math.max((item.value / maxContentPoint) * 100, item.value ? 12 : 2)}%` }} /></div>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
            <div className="command-mini-line spend">
              {spendSeries.map((item) => (
                <span key={item.label} style={{ height: `${Math.max((item.amount / maxSpendPoint) * 100, 6)}%` }} title={`${item.label}: ${formatUsd(item.amount)}`} />
              ))}
            </div>
          </div>
        </div>

        <div className="command-card command-side-card">
          <SectionTitle title="Tezkor ko‘rsatkichlar" desc="Dashboard snapshot" />
          <div className="command-mini-metrics">
            {secondaryMetrics.map((item) => (
              <div key={item.label} className={`command-mini-metric ${item.tone}`}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.desc}</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="command-grid-3">
        <div className="command-card">
          <SectionTitle title="Platforma monitoringi" desc="Post, story va auditoriya faolligi asosida" />
          <div className="command-branch-list">
            {branchKpis.length ? branchKpis.map((item, index) => (
              <div key={item.name} className="command-branch-row">
                <span className="command-rank">{index + 1}</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.posts} post • {item.stories} story</small>
                </div>
                <div className="command-branch-bar"><i style={{ width: `${Math.max((item.score / maxBranchScore) * 100, 8)}%` }} /></div>
                <b>{item.score}</b>
              </div>
            )) : <div className="empty-block">Monitoring yozuvlari hali yo'q</div>}
          </div>
        </div>

        <div className="command-card">
          <SectionTitle title="Yaqin vazifalar" desc="Deadline va eslatmalar" />
          <div className="command-task-list">
            {latestTasks.length ? latestTasks.map((item) => (
              <div key={item.id} className="command-task-row">
                <span className={taskStatusClass(item.status)}>{taskStatusLabel(item.status)}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{formatDate(item.due_date || item.created_at)}</small>
                </div>
              </div>
            )) : reminders.length ? reminders.slice(0, 5).map((item) => (
              <div key={item.id} className="command-task-row">
                <span className={formatDate(item.due_date) < todayKey ? "status-badge cancelled" : "status-badge doing"}>{taskStatusLabel(item.status)}</span>
                <div>
                  <strong>{item.title}</strong>
                  <small>{formatDate(item.due_date)}</small>
                </div>
              </div>
            )) : <div className="empty-block">Hozircha vazifa yo‘q</div>}
          </div>
        </div>

        <div className="command-card">
          <SectionTitle title="Signal va alertlar" desc="Jamoaga kerakli eslatmalar" />
          <div className="command-alert-list">
            {operationSignals.length ? operationSignals.map((item) => (
              <div key={item.id} className={`command-alert ${item.tone}`}>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </div>
            )) : <div className="empty-block">Hozircha yangi signal yo‘q</div>}
          </div>
        </div>
      </section>

      <section className="command-grid-main compact">
        <div className="command-card">
          <SectionTitle title="So‘nggi kontentlar" desc="Kontent reja ichidan real yozuvlar" />
          <div className="command-table-wrap">
            <table>
              <thead>
                <tr><th>Sana</th><th>Nomi</th><th>Platforma</th><th>Holat</th></tr>
              </thead>
              <tbody>
                {latestContent.length ? latestContent.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.publish_date || row.created_at)}</td>
                    <td>{row.title}</td>
                    <td>{row.platform_primary || row.platform || "-"}</td>
                    <td><span className="command-status-pill">{row.status || "reja"}</span></td>
                  </tr>
                )) : <tr><td colSpan="4" className="empty-cell">Kontent yozuvlari hali yo‘q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="command-card">
          <SectionTitle title="So'nggi platforma monitoringlari" desc="Kunlik hisobotlardan snapshot" />
          <div className="command-table-wrap">
            <table>
              <thead>
                <tr><th>Sana</th><th>Filial</th><th>Story</th><th>Post</th></tr>
              </thead>
              <tbody>
                {latestReports.length ? latestReports.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.report_date || row.created_at)}</td>
                    <td>{row.branch_name}</td>
                    <td>{row.stories_count}</td>
                    <td>{row.posts_count}</td>
                  </tr>
                )) : <tr><td colSpan="4" className="empty-cell">Hisobotlar hali yo‘q</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="command-card command-workflow-card">
        <SectionTitle title="Workflow holati" desc="SMM menejer va mobilograf ish oqimi" />
        <div className="command-workflow-grid">
          <div>
            <strong>Kontent workflow</strong>
            {contentSeries.map((item) => <span key={item.label}>{item.label}<b>{item.value}</b></span>)}
          </div>
          <div>
            <strong>Ishlab chiqarish workflow</strong>
            {productionWorkflow.map((item) => <span key={item.label}>{item.label}<b>{item.value}</b></span>)}
          </div>
          <div>
            <strong>Haftalik fokus</strong>
            <span>Reja va ssenariy<b>25%</b></span>
            <span>Kampaniya va reklama<b>40%</b></span>
            <span>Dizayn, analitika, hamkorlar<b>35%</b></span>
          </div>
        </div>
      </section>
    </div>
  );
}

function ManagerOSDashboard({ summary = {}, dailyReports = [], contentRows = [], campaigns = [], travelPlans = [], tasks = [], uploads = [], managerOSData = {}, user = null, onNavigate = null }) {
  const currentMonth = getMonthLabel();
  const currentMonthTitle = getMonthTitle(currentMonth);
  const todayKey = formatDate(new Date());
  const monthContent = (contentRows || []).filter((row) => formatDate(row.publish_date || row.created_at).slice(0, 7) === currentMonth);
  const publishedContent = monthContent.filter((row) => ["joylangan", "yakunlandi", "published"].includes(String(row.status || "").toLowerCase()));
  const videoContent = monthContent.filter((row) => /video|reels|shorts|youtube/i.test(`${row.content_type || ""} ${row.platform || ""} ${row.title || ""}`));
  const scriptReady = monthContent.filter((row) => row.scenario_text || row.script || row.approval_comment || /hook|cta|ssenariy/i.test(`${row.notes || ""} ${row.title || ""}`));
  const activeCampaigns = (campaigns || []).filter((row) => {
    const status = String(row.status || "").toLowerCase();
    return !["done", "yakunlandi", "cancelled", "canceled"].includes(status);
  });
  const campaignSpend = activeCampaigns.reduce((sum, row) => sum + Number(row.spend || row.budget_spent || 0), 0);
  const campaignLeads = activeCampaigns.reduce((sum, row) => sum + Number(row.leads || row.leads_count || 0), 0);
  const openTasks = (tasks || []).filter((row) => !["done", "yakunlandi", "closed"].includes(String(row.status || "").toLowerCase()));
  const productionTasks = openTasks.filter((row) => /video|foto|surat|montaj|reels|shorts|filial/i.test(`${row.title || ""} ${row.description || ""}`));
  const overdueTasks = openTasks.filter((row) => {
    const due = formatDate(row.due_date);
    return due !== "-" && due < todayKey;
  });
  const todayContent = monthContent.filter((row) => formatDate(row.publish_date || row.created_at) === todayKey);
  const overdueContent = monthContent.filter((row) => {
    const publishDate = formatDate(row.publish_date || row.created_at);
    const status = String(row.status || "").toLowerCase();
    return publishDate !== "-" && publishDate < todayKey && !["joylangan", "yakunlandi", "published", "archived"].includes(status);
  });
  const reviewContent = monthContent.filter((row) => {
    const status = String(row.status || "").toLowerCase();
    return ["tasdiqlandi", "tasdiqlanishda", "tekshiruvda", "review", "pending", "approved"].includes(status);
  });
  const dueTodayTasks = openTasks.filter((row) => formatDate(row.due_date) === todayKey);
  const todayReports = (dailyReports || []).filter((row) => formatDate(row.report_date || row.created_at) === todayKey);
  const todayPulseTotals = todayReports.reduce((acc, row) => ({
    posts: acc.posts + Number(row.posts_count || 0),
    stories: acc.stories + Number(row.stories_count || 0),
    reels: acc.reels + Number(row.reels_count || 0)
  }), { posts: 0, stories: 0, reels: 0 });
  const approvalRows = managerOSData?.approval_flows?.rows || [];
  const pendingApprovals = approvalRows.filter((row) => !["approved", "done", "rejected"].includes(String(row.status || "").toLowerCase()));
  const todayCommandItems = [
    {
      label: "Bugungi kontent",
      value: todayContent.length,
      detail: `${reviewContent.length} ta review/navbat`,
      tone: todayContent.length ? "good" : "idle",
      page: "content"
    },
    {
      label: "Kechikkan kontent",
      value: overdueContent.length,
      detail: overdueContent.length ? "deadline nazorat kerak" : "deadline toza",
      tone: overdueContent.length ? "danger" : "good",
      page: "content"
    },
    {
      label: "Bugungi task",
      value: dueTodayTasks.length,
      detail: `${overdueTasks.length} ta task riskda`,
      tone: overdueTasks.length ? "warning" : "good",
      page: "tasks"
    },
    {
      label: "Approval navbati",
      value: pendingApprovals.length,
      detail: "manager -> rahbar -> posting",
      tone: pendingApprovals.length ? "warning" : "idle",
      page: "managerLab"
    }
  ];
  const commandFeed = [
    ...todayContent.slice(0, 3).map((row) => ({
      title: row.title || "Kontent",
      meta: `${row.platform_primary || row.platform || "platforma"} / ${formatApprovalStatus(row.status || "reja")}`,
      page: "content"
    })),
    ...dueTodayTasks.slice(0, 2).map((row) => ({
      title: row.title || "Task",
      meta: `${row.priority || "normal"} / ${taskStatusLabel(row.status)}`,
      page: "tasks"
    })),
    ...[...activeCampaigns]
      .sort((a, b) => getDateSortValue(a.end_at || a.end_date, Number.POSITIVE_INFINITY) - getDateSortValue(b.end_at || b.end_date, Number.POSITIVE_INFINITY))
      .slice(0, 2)
      .map((row) => ({
      title: row.title || "Kampaniya",
      meta: `${row.platform || "ads"} / ${formatCampaignStatus(row.status || "active")}`,
      page: "campaigns"
    }))
  ].slice(0, 5);
  const platformPulse = Object.values((dailyReports || []).reduce((acc, row) => {
    const key = row.branch_name || "Platforma";
    if (!acc[key]) acc[key] = { name: key, posts: 0, stories: 0, reels: 0, subscribers: 0 };
    acc[key].posts += Number(row.posts_count || 0);
    acc[key].stories += Number(row.stories_count || 0);
    acc[key].reels += Number(row.reels_count || 0);
    acc[key].subscribers += Number(row.subscriber_count || 0);
    return acc;
  }, {})).sort((a, b) => (b.posts + b.stories + b.reels) - (a.posts + a.stories + a.reels)).slice(0, 6);
  const brandScore = Math.max(8, Math.min(100, Math.round(
    ((publishedContent.length / Math.max(monthContent.length, 1)) * 38) +
    ((scriptReady.length / Math.max(monthContent.length, 1)) * 22) +
    (activeCampaigns.length ? 18 : 4) +
    (productionTasks.length ? 12 : 4) +
    (platformPulse.length ? 10 : 2)
  )));
  const modules = [
    ["Strategiya", Sparkles],
    ["Oylik reja", ClipboardList],
    ["Haftalik reja", Clock3],
    ["Ssenariy", Pencil],
    ["Hook / CTA", MessageCircle],
    ["Kontent kalendar", LayoutGrid],
    ["Instagram / TG / YouTube", Globe2],
    ["Kampaniyalar", Megaphone],
    ["Aksiyalar", BadgeDollarSign],
    ["Reklama byudjeti", ReceiptText],
    ["Target nazorati", Target],
    ["Bloger va media", ContactRound],
    ["Raqobatchi tahlili", Eye],
    ["Auditoriya tahlili", BarChart3],
    ["Mobilograf tasklari", Mic],
    ["Dizayn va kreativ", Image],
    ["Hisobotlar", ClipboardList],
    ["Brand KPI", ShieldCheck]
  ];
  const focusRows = [
    ["Kontent reja + ssenariy", 25],
    ["Kampaniya + aksiya", 20],
    ["Reklama va target", 20],
    ["Dizayn va kreativ", 15],
    ["Platforma rivoji", 10],
    ["Analitika", 5],
    ["Blogerlar", 5]
  ];
  const latestContent = [...monthContent]
    .sort((a, b) => getDateSortValue(a.publish_date || a.created_at, Number.POSITIVE_INFINITY) - getDateSortValue(b.publish_date || b.created_at, Number.POSITIVE_INFINITY))
    .slice(0, 5);
  const latestCampaigns = [...activeCampaigns]
    .sort((a, b) => getDateSortValue(a.end_at || a.end_date, Number.POSITIVE_INFINITY) - getDateSortValue(b.end_at || b.end_date, Number.POSITIVE_INFINITY))
    .slice(0, 4);
  const productionQueue = [...productionTasks, ...openTasks].slice(0, 5);
  const resourceCount = (key) => Number(managerOSData?.[key]?.count || managerOSData?.[key]?.rows?.length || 0);
  const managerOsSnapshot = [
    ["Strategiya", resourceCount("strategies")],
    ["Ssenariy", resourceCount("content_scripts")],
    ["Campaign brief", resourceCount("campaign_briefs")],
    ["Ads budget", resourceCount("ad_budgets")],
    ["Bloger CRM", resourceCount("blogger_partners")],
    ["Raqobatchi", resourceCount("competitor_reports")],
    ["Auditoriya", resourceCount("audience_metrics")],
    ["Kreativ brief", resourceCount("creative_briefs")],
    ["Approval", resourceCount("approval_flows")],
    ["Brand KPI", resourceCount("brand_kpi_scores")]
  ];
  const setupItems = [
    {
      title: "Strategiyani boshlash",
      body: "Oylik maqsad, platforma yo'nalishi va trend signalini kiriting.",
      done: resourceCount("strategies") > 0,
      page: "managerLab"
    },
    {
      title: "Brand KPI oyini ochish",
      body: "Brand sifati, kontent sifati va deadline intizomi uchun birinchi score.",
      done: resourceCount("brand_kpi_scores") > 0,
      page: "managerLab"
    },
    {
      title: "Birinchi kontent kartasi",
      body: "Hook, ssenariy, CTA va platforma bilan kontent reja yarating.",
      done: monthContent.length > 0,
      page: "content"
    },
    {
      title: "Birinchi kampaniya briefi",
      body: "Maqsad, auditoriya, kanal, byudjet va natija mezonini belgilang.",
      done: activeCampaigns.length > 0 || resourceCount("campaign_briefs") > 0,
      page: "campaigns"
    }
  ];
  const setupDone = setupItems.filter((item) => item.done).length;

  return (
    <div className="manager-os-page">
      <section className="manager-os-hero">
        <div className="manager-os-hero-copy">
          <span className="manager-os-eyebrow"><Sparkles size={16} /> alooSMM manager operating system</span>
          <h1>SMM menejer uchun yangi boshqaruv tizimi</h1>
          <p>
            Strategiya, kontent reja, ssenariy, reklama, blogerlar, mobilograf workflow va brand KPI bir ekranda.
            Bu panel ko'proq kontent chiqarish emas, brendni kuchaytiradigan marketing tizimini boshqarish uchun.
          </p>
        </div>
        <div className="manager-os-pulse">
          <span>{brandScore}</span>
          <strong>Brand KPI</strong>
          <small>{currentMonthTitle} bo'yicha real pulse</small>
        </div>
      </section>

      <section className="manager-os-strip">
        <div><span>Kontent reja</span><strong>{monthContent.length}</strong><small>{publishedContent.length} joylangan</small></div>
        <div><span>Ssenariy tayyor</span><strong>{scriptReady.length}</strong><small>Hook / CTA nazorat</small></div>
        <div><span>Video format</span><strong>{videoContent.length}</strong><small>Reels, Shorts, YouTube</small></div>
        <div><span>Faol target</span><strong>{activeCampaigns.length}</strong><small>{formatMoney(campaignSpend)} sarf</small></div>
        <div><span>Leadlar</span><strong>{campaignLeads}</strong><small>kampaniya natijasi</small></div>
        <div><span>Mobilograf queue</span><strong>{productionTasks.length}</strong><small>{overdueTasks.length} deadline risk</small></div>
      </section>

      <section className="manager-os-today">
        <div className="manager-os-today-head">
          <div>
            <span>Bugungi nazorat</span>
            <h2>{formatDate(new Date())} uchun manager command</h2>
          </div>
          <button type="button" onClick={() => onNavigate?.("content")}>Kontentga o'tish</button>
        </div>
        <div className="manager-os-today-grid">
          {todayCommandItems.map((item) => (
            <button key={item.label} type="button" className={`manager-os-today-stat ${item.tone}`} onClick={() => onNavigate?.(item.page)}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </button>
          ))}
          <div className="manager-os-today-pulse">
            <span>Platforma pulse</span>
            <strong>{todayPulseTotals.posts + todayPulseTotals.stories + todayPulseTotals.reels}</strong>
            <small>{todayPulseTotals.posts} post / {todayPulseTotals.stories} story / {todayPulseTotals.reels} reels</small>
          </div>
          <div className="manager-os-today-feed">
            <span>Tezkor ishlar</span>
            {commandFeed.length ? commandFeed.map((item, index) => (
              <button key={`${item.title}-${index}`} type="button" onClick={() => onNavigate?.(item.page)}>
                <strong>{item.title}</strong>
                <small>{item.meta}</small>
              </button>
            )) : <p>Bugun uchun ochiq signal yo'q.</p>}
          </div>
        </div>
      </section>

      <CommandCenterV8
        contentRows={contentRows}
        campaigns={campaigns}
        tasks={tasks}
        dailyReports={dailyReports}
        onNavigate={onNavigate}
      />

      <section className="manager-os-snapshot">
        {managerOsSnapshot.map(([label, count]) => (
          <div key={label}>
            <span>{label}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </section>

      <section className="manager-os-onboarding">
        <div className="manager-os-onboarding-head">
          <div>
            <span>Start setup</span>
            <h2>Toza tizimni ishga tayyorlash</h2>
          </div>
          <strong>{setupDone}/{setupItems.length}</strong>
        </div>
        <div className="manager-os-onboarding-grid">
          {setupItems.map((item) => (
            <button key={item.title} type="button" className={item.done ? "done" : ""} onClick={() => onNavigate?.(item.page)}>
              <i>{item.done ? "OK" : "Start"}</i>
              <strong>{item.title}</strong>
              <span>{item.body}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="manager-os-layout">
        <article className="manager-os-card manager-os-modules">
          <div className="manager-os-card-head">
            <div><span>Lavozim modullari</span><h2>18 qismli manager tizimi</h2></div>
            <b>role scope</b>
          </div>
          <div className="manager-os-module-grid">
            {modules.map(([label, Icon], index) => (
              <button key={label} type="button" className="manager-os-module">
                <span>{String(index + 1).padStart(2, "0")}</span>
                <Icon size={17} />
                <strong>{label}</strong>
              </button>
            ))}
          </div>
        </article>

        <article className="manager-os-card manager-os-focus">
          <div className="manager-os-card-head">
            <div><span>Haftalik fokus</span><h2>Ish ulushi</h2></div>
            <b>job map</b>
          </div>
          <div className="manager-os-focus-list">
            {focusRows.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <i><em style={{ width: `${value * 3.2}%` }} /></i>
                <strong>{value}%</strong>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="manager-os-grid">
        <article className="manager-os-card">
          <div className="manager-os-card-head">
            <div><span>Kontent strategiyasi</span><h2>Reja, ssenariy, nashr</h2></div>
            <b>{currentMonthTitle}</b>
          </div>
          <div className="manager-os-table">
            {latestContent.length ? latestContent.map((row) => (
              <div key={row.id}>
                <strong>{row.title}</strong>
                <span>{formatDate(row.publish_date || row.created_at)} / {row.platform_primary || row.platform || "platforma"}</span>
                <b>{row.status || "reja"}</b>
              </div>
            )) : <p className="manager-os-empty">Kontent reja hali to'ldirilmagan.</p>}
          </div>
        </article>

        <article className="manager-os-card">
          <div className="manager-os-card-head">
            <div><span>Ads Lab</span><h2>Kampaniya va aksiya</h2></div>
            <b>growth</b>
          </div>
          <div className="manager-os-table">
            {latestCampaigns.length ? latestCampaigns.map((row) => (
              <div key={row.id}>
                <strong>{row.title}</strong>
                <span>{row.platform || "ads"} / {formatMoney(row.daily_budget || row.budget || 0)}</span>
                <b>{row.status || "active"}</b>
              </div>
            )) : <p className="manager-os-empty">Faol kampaniya yo'q. Aksiya yoki target reja kiriting.</p>}
          </div>
        </article>

        <article className="manager-os-card">
          <div className="manager-os-card-head">
            <div><span>Mobilograf nazorati</span><h2>Production queue</h2></div>
            <b>{productionQueue.length} task</b>
          </div>
          <div className="manager-os-table">
            {productionQueue.length ? productionQueue.map((row) => (
              <div key={row.id}>
                <strong>{row.title}</strong>
                <span>{formatDate(row.due_date || row.created_at)} / {row.priority || "normal"}</span>
                <b>{taskStatusLabel(row.status)}</b>
              </div>
            )) : <p className="manager-os-empty">Mobilografga ochiq production topshiriq yo'q.</p>}
          </div>
        </article>
      </section>

      <section className="manager-os-bottom">
        <article className="manager-os-card">
          <div className="manager-os-card-head">
            <div><span>Platforma pulse</span><h2>Instagram, Telegram, YouTube monitoring</h2></div>
            <b>{platformPulse.length || 0} signal</b>
          </div>
          <div className="manager-os-platforms">
            {platformPulse.length ? platformPulse.map((row) => (
              <div key={row.name}>
                <strong>{row.name}</strong>
                <span>{row.posts} post / {row.stories} story / {row.reels} reels</span>
                <i><em style={{ width: `${Math.min(100, Math.max(12, row.posts * 8 + row.stories * 2 + row.reels * 10))}%` }} /></i>
              </div>
            )) : <p className="manager-os-empty">Kunlik monitoring yozuvlari hali yo'q.</p>}
          </div>
        </article>

        <article className="manager-os-card manager-os-principle">
          <span>Yakuniy tamoyil</span>
          <h2>SMM menejer natija uchun javob beradi.</h2>
          <p>Mobilograf bajarilish uchun javob beradi. Har bir kontent, reklama va marketing faoliyati aloo brendbooki, qadriyatlari va uzoq muddatli strategiyasiga mos bo'lishi shart.</p>
        </article>
      </section>
    </div>
  );
}

const MANAGER_OS_LAB_MODULES = [
  {
    resource: "strategies",
    title: "Strategiya",
    subtitle: "Oylik maqsad, platforma strategiyasi, trend va bozor signal.",
    icon: Sparkles,
    tone: "violet",
    fields: [
      { key: "month_label", label: "Oy", type: "month", defaultValue: () => getMonthLabel(), required: true },
      { key: "platform", label: "Platforma", type: "select", options: ["all", "Instagram", "Telegram", "YouTube", "TikTok"], defaultValue: "all" },
      { key: "objective", label: "Oylik maqsad", type: "text", required: true },
      { key: "strategy_text", label: "Strategiya", type: "textarea" },
      { key: "trend_notes", label: "Trendlar", type: "textarea" },
      { key: "market_notes", label: "Bozor yangiliklari", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: ["draft", "active", "done"], defaultValue: "draft" }
    ]
  },
  {
    resource: "blogger_partners",
    title: "Bloger CRM",
    subtitle: "Bloger, Telegram kanal va media hamkorlar narx/natija nazorati.",
    icon: ContactRound,
    tone: "cyan",
    fields: [
      { key: "partner_name", label: "Hamkor nomi", type: "text", required: true },
      { key: "platform", label: "Platforma", type: "select", options: ["Instagram", "Telegram", "YouTube", "TikTok", "Media"], defaultValue: "Instagram" },
      { key: "contact_url", label: "Kontakt / link", type: "text" },
      { key: "price_amount", label: "Narx", type: "number", defaultValue: 0 },
      { key: "status", label: "Status", type: "select", options: ["negotiation", "approved", "in_progress", "done", "rejected"], defaultValue: "negotiation" },
      { key: "expected_result", label: "Kutilgan natija", type: "textarea" },
      { key: "actual_result", label: "Real natija", type: "textarea" },
      { key: "notes", label: "Izoh", type: "textarea" }
    ]
  },
  {
    resource: "competitor_reports",
    title: "Raqobatchi tahlili",
    subtitle: "Postlar, aksiya, format, kuchli va kuchsiz tomonlar.",
    icon: Eye,
    tone: "amber",
    fields: [
      { key: "competitor_name", label: "Raqobatchi", type: "text", required: true },
      { key: "platform", label: "Platforma", type: "select", options: ["Instagram", "Telegram", "YouTube", "TikTok"], defaultValue: "Instagram" },
      { key: "report_date", label: "Sana", type: "date", defaultValue: () => formatDate(new Date()) },
      { key: "content_format", label: "Kontent formati", type: "text" },
      { key: "campaign_notes", label: "Aksiya / kampaniya", type: "textarea" },
      { key: "strengths_text", label: "Kuchli tomon", type: "textarea" },
      { key: "weaknesses_text", label: "Kuchsiz tomon", type: "textarea" },
      { key: "action_idea", label: "Biz uchun idea", type: "textarea" }
    ]
  },
  {
    resource: "audience_metrics",
    title: "Auditoriya tahlili",
    subtitle: "Reach, engagement, follower growth va platforma signali.",
    icon: BarChart3,
    tone: "sky",
    fields: [
      { key: "metric_date", label: "Sana", type: "date", defaultValue: () => formatDate(new Date()) },
      { key: "platform", label: "Platforma", type: "select", options: ["Instagram", "Telegram", "YouTube", "TikTok"], defaultValue: "Instagram" },
      { key: "reach_count", label: "Reach", type: "number", defaultValue: 0 },
      { key: "engagement_count", label: "Engagement", type: "number", defaultValue: 0 },
      { key: "follower_growth", label: "Follower growth", type: "number", defaultValue: 0 },
      { key: "signal_text", label: "Signal / xulosa", type: "textarea" }
    ]
  },
  {
    resource: "creative_briefs",
    title: "Kreativ brief",
    subtitle: "Banner, post, story va reklama kreativi uchun topshiriq.",
    icon: Image,
    tone: "purple",
    fields: [
      { key: "title", label: "Brief nomi", type: "text", required: true },
      { key: "creative_type", label: "Kreativ turi", type: "select", options: ["banner", "post", "story", "reklama", "cover"], defaultValue: "banner" },
      { key: "platform", label: "Platforma", type: "select", options: ["Instagram", "Telegram", "YouTube", "TikTok", "All"], defaultValue: "Instagram" },
      { key: "brief_text", label: "Topshiriq", type: "textarea" },
      { key: "deadline_date", label: "Deadline", type: "date" },
      { key: "status", label: "Status", type: "select", options: ["brief", "in_progress", "review", "done"], defaultValue: "brief" }
    ]
  },
  {
    resource: "brand_kpi_scores",
    title: "Brand KPI",
    subtitle: "Brand sifati, kontent sifati, reklama natijasi va deadline intizomi.",
    icon: ShieldCheck,
    tone: "green",
    fields: [
      { key: "month_label", label: "Oy", type: "month", defaultValue: () => getMonthLabel(), required: true },
      { key: "brand_quality_score", label: "Brand sifati", type: "number", defaultValue: 0 },
      { key: "content_quality_score", label: "Kontent sifati", type: "number", defaultValue: 0 },
      { key: "ads_result_score", label: "Reklama natijasi", type: "number", defaultValue: 0 },
      { key: "deadline_score", label: "Deadline intizomi", type: "number", defaultValue: 0 },
      { key: "notes", label: "Xulosa", type: "textarea" }
    ]
  },
  {
    resource: "approval_flows",
    title: "Tasdiqlash oqimi",
    subtitle: "Menejer, marketing rahbari va ijrochi bosqichlari.",
    icon: ClipboardList,
    tone: "slate",
    fields: [
      { key: "entity_type", label: "Entity turi", type: "select", options: ["content", "campaign", "creative", "task"], defaultValue: "content" },
      { key: "entity_id", label: "Entity ID", type: "number" },
      { key: "current_step", label: "Bosqich", type: "select", options: ["manager", "marketing_head", "mobilograf", "posting"], defaultValue: "manager" },
      { key: "status", label: "Status", type: "select", options: ["pending", "approved", "rejected", "done"], defaultValue: "pending" },
      { key: "notes", label: "Izoh", type: "textarea" }
    ]
  }
];

function buildManagerLabForm(config) {
  return Object.fromEntries(config.fields.map((field) => [
    field.key,
    typeof field.defaultValue === "function" ? field.defaultValue() : field.defaultValue ?? ""
  ]));
}

function renderManagerLabValue(value) {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "number") return Number(value).toLocaleString();
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value);
  return String(value);
}

function ManagerOsLabPage({ onToast }) {
  const [activeResource, setActiveResource] = useState(MANAGER_OS_LAB_MODULES[0].resource);
  const activeConfig = MANAGER_OS_LAB_MODULES.find((item) => item.resource === activeResource) || MANAGER_OS_LAB_MODULES[0];
  const [rows, setRows] = useState([]);
  const [snapshot, setSnapshot] = useState({});
  const [form, setForm] = useState(() => buildManagerLabForm(activeConfig));
  const [editingRow, setEditingRow] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const onToastRef = useRef(onToast);

  const visibleFields = activeConfig.fields.slice(0, 5);
  const activeCount = Number(snapshot?.[activeResource]?.count || rows.length || 0);
  const labStatusCounts = useMemo(() => {
    return rows.reduce((acc, row) => {
      const status = String(row.status || "draft").toLowerCase();
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
  }, [rows]);
  const strategyPulse = useMemo(() => {
    const currentRows = rows.filter((row) => row.month_label === getMonthLabel());
    const platforms = [...new Set(rows.map((row) => row.platform).filter(Boolean))];
    const activeRows = rows.filter((row) => String(row.status || "").toLowerCase() === "active");
    return {
      currentRows,
      platforms,
      activeRows,
      latest: rows.slice(0, 3)
    };
  }, [rows]);
  const bloggerPulse = useMemo(() => {
    const totalBudget = rows.reduce((sum, row) => sum + Number(row.price_amount || 0), 0);
    const resultReady = rows.filter((row) => String(row.actual_result || "").trim()).length;
    const followUps = rows.filter((row) => /follow|follow-up|qayta|bog'lan|bog‘lan|aloqa/i.test(String(row.notes || ""))).length;
    return {
      totalBudget,
      resultReady,
      followUps,
      activePipeline: rows.filter((row) => ["negotiation", "approved", "in_progress"].includes(String(row.status || "").toLowerCase())),
      latest: rows.slice(0, 4)
    };
  }, [rows]);

  const competitorPulse = useMemo(() => {
    const platforms = [...new Set(rows.map((row) => row.platform).filter(Boolean))];
    const competitors = [...new Set(rows.map((row) => row.competitor_name).filter(Boolean))];
    const formats = rows.reduce((acc, row) => {
      const format = String(row.content_format || "format yo'q").trim();
      acc[format] = (acc[format] || 0) + 1;
      return acc;
    }, {});
    const topFormat = Object.entries(formats).sort((a, b) => b[1] - a[1])[0];
    const campaignSignals = rows.filter((row) => String(row.campaign_notes || "").trim()).length;
    const actionIdeas = rows.filter((row) => String(row.action_idea || "").trim());
    return {
      platforms,
      competitors,
      topFormat,
      campaignSignals,
      actionIdeas,
      latest: rows.slice(0, 4)
    };
  }, [rows]);
  const audiencePulse = useMemo(() => {
    const totalReach = rows.reduce((sum, row) => sum + Number(row.reach_count || 0), 0);
    const totalEngagement = rows.reduce((sum, row) => sum + Number(row.engagement_count || 0), 0);
    const followerGrowth = rows.reduce((sum, row) => sum + Number(row.follower_growth || 0), 0);
    const platformMap = rows.reduce((acc, row) => {
      const platform = row.platform || "Platforma";
      if (!acc[platform]) acc[platform] = { platform, reach: 0, engagement: 0, growth: 0, count: 0 };
      acc[platform].reach += Number(row.reach_count || 0);
      acc[platform].engagement += Number(row.engagement_count || 0);
      acc[platform].growth += Number(row.follower_growth || 0);
      acc[platform].count += 1;
      return acc;
    }, {});
    const platformRows = Object.values(platformMap).sort((a, b) => (b.reach + b.engagement + b.growth) - (a.reach + a.engagement + a.growth));
    return {
      totalReach,
      totalEngagement,
      followerGrowth,
      engagementRate: totalReach ? Math.round((totalEngagement / Math.max(totalReach, 1)) * 100) : 0,
      platformRows,
      latestSignals: rows.filter((row) => String(row.signal_text || "").trim()).slice(0, 4)
    };
  }, [rows]);
  const labCommandTitle = {
    strategies: "Oy strategiyasi va platforma fokuslari",
    blogger_partners: "Hamkorlar pipeline va natija nazorati",
    competitor_reports: "Raqobatchi signallari va idea bank",
    audience_metrics: "Auditoriya signal va platforma pulse"
  }[activeResource] || "Modul holati";

  useEffect(() => {
    onToastRef.current = onToast;
  }, [onToast]);

  const loadRows = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, snapshotRes] = await Promise.all([
        api.list(`/api/manager-os/${activeResource}`, { limit: 120 }).catch(() => []),
        api.list("/api/manager-os").catch(() => ({}))
      ]);
      setRows(listRes || []);
      setSnapshot(snapshotRes || {});
    } catch (err) {
      onToastRef.current?.(err.message || "Manager OS Lab ma'lumotlari olinmadi", "error");
    } finally {
      setLoading(false);
    }
  }, [activeResource]);

  useEffect(() => {
    setForm(buildManagerLabForm(activeConfig));
    setEditingRow(null);
    loadRows();
  }, [activeConfig, loadRows]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(buildManagerLabForm(activeConfig));
    setEditingRow(null);
  }

  function applyLabPreset(kind) {
    if (kind === "strategy-month") {
      setForm((prev) => ({
        ...prev,
        month_label: getMonthLabel(),
        platform: "all",
        objective: prev.objective || "Oy bo'yicha asosiy SMM maqsad",
        strategy_text: prev.strategy_text || "Platformalar kesimida kontent, reklama va brand signalni bir ritmga keltirish.",
        trend_notes: prev.trend_notes || "Trendlar: qisqa video, foydali post, mijoz hikoyalari, xizmatlar kontenti.",
        market_notes: prev.market_notes || "Bozor signali: servis, nasiya, to'lov xizmatlari va ishonchli xarid tajribasi.",
        status: "active"
      }));
      return;
    }
    if (kind === "blogger-followup") {
      setForm((prev) => ({
        ...prev,
        status: prev.status || "negotiation",
        expected_result: prev.expected_result || "Reach, obuna, murojaat va sotuv signali.",
        notes: prev.notes || `Follow-up: ${formatDate(new Date())} / kelishuv, narx va kontent formatini aniqlash.`
      }));
      return;
    }
    if (kind === "competitor-idea") {
      setForm((prev) => ({
        ...prev,
        platform: prev.platform || "Instagram",
        report_date: prev.report_date || formatDate(new Date()),
        content_format: prev.content_format || "Reels / post / aksiya",
        campaign_notes: prev.campaign_notes || "Raqobatchi aksiya yoki kontent signalini yozing.",
        action_idea: prev.action_idea || "Biz uchun olinadigan idea va keyingi kontent yo'nalishi."
      }));
      return;
    }
    if (kind === "audience-signal") {
      setForm((prev) => ({
        ...prev,
        metric_date: prev.metric_date || formatDate(new Date()),
        platform: prev.platform || "Instagram",
        signal_text: prev.signal_text || "Auditoriya signali, o'sish sababi va keyingi tavsiya."
      }));
    }
  }

  function startEdit(row) {
    setEditingRow(row);
    setForm(Object.fromEntries(activeConfig.fields.map((field) => [
      field.key,
      row[field.key] ?? (typeof field.defaultValue === "function" ? field.defaultValue() : field.defaultValue ?? "")
    ])));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function buildPayload() {
    return Object.fromEntries(activeConfig.fields.map((field) => {
      const raw = form[field.key];
      if (field.type === "number") return [field.key, Number(raw || 0)];
      return [field.key, raw ?? ""];
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const missing = activeConfig.fields.find((field) => field.required && !String(form[field.key] || "").trim());
    if (missing) {
      onToast(`${missing.label} majburiy`, "error");
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      if (editingRow?.id) {
        await api.update(`manager-os/${activeResource}`, editingRow.id, payload);
        onToast("Manager OS yozuvi yangilandi", "success");
      } else {
        await api.post(`/api/manager-os/${activeResource}`, payload);
        onToast("Manager OS yozuvi saqlandi", "success");
      }
      await loadRows();
      resetForm();
    } catch (err) {
      onToast(err.message || "Saqlashda xatolik", "error");
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row) {
    const ok = window.confirm("Rostdan ham o'chirilsinmi?");
    if (!ok) return;
    try {
      await api.remove(`manager-os/${activeResource}`, row.id);
      await loadRows();
      onToast("Manager OS yozuvi o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "O'chirishda xatolik", "error");
    }
  }

  return (
    <div className="manager-lab-page">
      <section className="manager-lab-hero">
        <div>
          <span><Sparkles size={16} /> Manager OS Lab</span>
          <h1>Strategiya, CRM, tahlil va KPI modullari</h1>
          <p>Bu sahifa yangi Manager OS jadvallarini real ish oynasiga aylantiradi: reja tuzish, tahlil kiritish, hamkorlarni nazorat qilish va brand KPI baholash.</p>
        </div>
        <strong>{activeCount}</strong>
      </section>

      <div className="manager-lab-tabs">
        {MANAGER_OS_LAB_MODULES.map((module) => {
          const Icon = module.icon;
          const count = Number(snapshot?.[module.resource]?.count || 0);
          return (
            <button key={module.resource} type="button" className={activeResource === module.resource ? "active" : ""} onClick={() => setActiveResource(module.resource)}>
              <Icon size={16} />
              <span>{module.title}</span>
              <b>{count}</b>
            </button>
          );
        })}
      </div>

      <section className={`manager-lab-command manager-lab-command-${activeResource}`}>
        <div className="manager-lab-command-head">
          <div>
            <span>{activeConfig.title} command</span>
            <h2>{labCommandTitle}</h2>
          </div>
          {activeResource === "strategies" ? (
            <button type="button" className="btn secondary" onClick={() => applyLabPreset("strategy-month")}>Oylik strategiya preset</button>
          ) : activeResource === "blogger_partners" ? (
            <button type="button" className="btn secondary" onClick={() => applyLabPreset("blogger-followup")}>Follow-up preset</button>
          ) : activeResource === "competitor_reports" ? (
            <button type="button" className="btn secondary" onClick={() => applyLabPreset("competitor-idea")}>Idea signal preset</button>
          ) : activeResource === "audience_metrics" ? (
            <button type="button" className="btn secondary" onClick={() => applyLabPreset("audience-signal")}>Auditoriya signal preset</button>
          ) : (
            <strong>{rows.length} yozuv</strong>
          )}
        </div>

        {activeResource === "strategies" ? (
          <div className="manager-lab-command-grid strategy">
            <div className="manager-lab-metric"><span>Joriy oy strategiya</span><strong>{strategyPulse.currentRows.length}</strong><small>{getMonthTitle(getMonthLabel())}</small></div>
            <div className="manager-lab-metric"><span>Faol strategiya</span><strong>{strategyPulse.activeRows.length}</strong><small>active status</small></div>
            <div className="manager-lab-metric"><span>Platforma qamrovi</span><strong>{strategyPulse.platforms.length}</strong><small>{strategyPulse.platforms.slice(0, 3).join(", ") || "hali yo'q"}</small></div>
            <div className="manager-lab-action-list">
              <span>So'nggi strategiyalar</span>
              {strategyPulse.latest.length ? strategyPulse.latest.map((row) => (
                <button key={`strategy-pulse-${row.id}`} type="button" onClick={() => startEdit(row)}>
                  <strong>{row.objective}</strong>
                  <small>{row.month_label} / {row.platform} / {row.status}</small>
                </button>
              )) : <p>Strategiya hali kiritilmagan.</p>}
            </div>
          </div>
        ) : activeResource === "blogger_partners" ? (
          <div className="manager-lab-command-grid blogger">
            <div className="manager-lab-metric"><span>Pipeline</span><strong>{bloggerPulse.activePipeline.length}</strong><small>negotiation / approved / progress</small></div>
            <div className="manager-lab-metric"><span>Kelishuv budjeti</span><strong>{formatMoney(bloggerPulse.totalBudget)}</strong><small>hamkorlar narxi</small></div>
            <div className="manager-lab-metric"><span>Natija yozilgan</span><strong>{bloggerPulse.resultReady}</strong><small>{bloggerPulse.followUps} follow-up signal</small></div>
            <div className="manager-lab-pipeline">
              {["negotiation", "approved", "in_progress", "done", "rejected"].map((status) => (
                <span key={status}><b>{status}</b><strong>{labStatusCounts[status] || 0}</strong></span>
              ))}
            </div>
            <div className="manager-lab-action-list">
              <span>Hamkorlar CRM</span>
              {bloggerPulse.latest.length ? bloggerPulse.latest.map((row) => (
                <button key={`blogger-pulse-${row.id}`} type="button" onClick={() => startEdit(row)}>
                  <strong>{row.partner_name}</strong>
                  <small>{row.platform} / {formatMoney(row.price_amount)} / {row.status}</small>
                </button>
              )) : <p>Hamkor hali kiritilmagan.</p>}
            </div>
          </div>
        ) : activeResource === "competitor_reports" ? (
          <div className="manager-lab-command-grid competitor">
            <div className="manager-lab-metric"><span>Raqobatchilar</span><strong>{competitorPulse.competitors.length}</strong><small>{competitorPulse.competitors.slice(0, 2).join(", ") || "hali yo'q"}</small></div>
            <div className="manager-lab-metric"><span>Top format</span><strong>{competitorPulse.topFormat ? competitorPulse.topFormat[1] : 0}</strong><small>{competitorPulse.topFormat ? competitorPulse.topFormat[0] : "format yo'q"}</small></div>
            <div className="manager-lab-metric"><span>Aksiya signali</span><strong>{competitorPulse.campaignSignals}</strong><small>{competitorPulse.platforms.length} platforma kuzatuvda</small></div>
            <div className="manager-lab-action-list">
              <span>Idea bank</span>
              {competitorPulse.actionIdeas.length ? competitorPulse.actionIdeas.slice(0, 4).map((row) => (
                <button key={`competitor-idea-${row.id}`} type="button" onClick={() => startEdit(row)}>
                  <strong>{row.action_idea}</strong>
                  <small>{row.competitor_name} / {row.platform} / {formatDate(row.report_date)}</small>
                </button>
              )) : <p>Raqobatchidan olinadigan idea hali yozilmagan.</p>}
            </div>
            <div className="manager-lab-signal-list">
              {competitorPulse.latest.length ? competitorPulse.latest.map((row) => (
                <button key={`competitor-latest-${row.id}`} type="button" onClick={() => startEdit(row)}>
                  <strong>{row.competitor_name}</strong>
                  <span>{row.content_format || "format yo'q"}</span>
                  <small>{row.strengths_text || row.weaknesses_text || row.campaign_notes || "signal yo'q"}</small>
                </button>
              )) : <p>Kuzatuv yozuvi hali yo'q.</p>}
            </div>
          </div>
        ) : activeResource === "audience_metrics" ? (
          <div className="manager-lab-command-grid audience">
            <div className="manager-lab-metric"><span>Reach</span><strong>{audiencePulse.totalReach.toLocaleString()}</strong><small>oylik jamlanma</small></div>
            <div className="manager-lab-metric"><span>Engagement</span><strong>{audiencePulse.totalEngagement.toLocaleString()}</strong><small>{audiencePulse.engagementRate}% nisbat</small></div>
            <div className="manager-lab-metric"><span>Follower growth</span><strong>{audiencePulse.followerGrowth.toLocaleString()}</strong><small>platformalar bo'yicha</small></div>
            <div className="manager-lab-platform-pulse">
              {audiencePulse.platformRows.length ? audiencePulse.platformRows.slice(0, 4).map((row) => (
                <button key={`audience-platform-${row.platform}`} type="button">
                  <strong>{row.platform}</strong>
                  <span>Reach {row.reach.toLocaleString()} / Eng {row.engagement.toLocaleString()}</span>
                  <i><em style={{ width: `${Math.min(100, Math.max(10, (row.reach + row.engagement + row.growth) / Math.max(1, audiencePulse.totalReach + audiencePulse.totalEngagement + audiencePulse.followerGrowth) * 100))}%` }} /></i>
                </button>
              )) : <p>Platforma metrikalari hali yo'q.</p>}
            </div>
            <div className="manager-lab-action-list">
              <span>Auditoriya signallari</span>
              {audiencePulse.latestSignals.length ? audiencePulse.latestSignals.map((row) => (
                <button key={`audience-signal-${row.id}`} type="button" onClick={() => startEdit(row)}>
                  <strong>{row.signal_text}</strong>
                  <small>{row.platform} / {formatDate(row.metric_date)}</small>
                </button>
              )) : <p>Signal xulosasi hali yozilmagan.</p>}
            </div>
          </div>
        ) : (
          <div className="manager-lab-command-grid generic">
            <div className="manager-lab-metric"><span>Yozuvlar</span><strong>{rows.length}</strong><small>{activeConfig.title}</small></div>
            <div className="manager-lab-metric"><span>Oxirgi holat</span><strong>{Object.keys(labStatusCounts).length}</strong><small>status turi</small></div>
            <div className="manager-lab-action-list">
              <span>So'nggi yozuvlar</span>
              {rows.slice(0, 3).map((row) => (
                <button key={`generic-pulse-${row.id}`} type="button" onClick={() => startEdit(row)}>
                  <strong>{renderManagerLabValue(row[visibleFields[0]?.key])}</strong>
                  <small>{activeConfig.title}</small>
                </button>
              ))}
              {!rows.length ? <p>Bu modul hali bo'sh.</p> : null}
            </div>
          </div>
        )}
      </section>

      <section className="manager-lab-layout">
        <article className="manager-lab-card">
          <SectionTitle
            title={editingRow ? `${activeConfig.title} tahrirlash` : `${activeConfig.title} qo'shish`}
            desc={activeConfig.subtitle}
            right={editingRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null}
          />
          <form className="form-grid manager-lab-form" onSubmit={handleSubmit}>
            {activeConfig.fields.map((field) => (
              <label key={field.key} className={field.type === "textarea" ? "full-col" : ""}>
                <span>{field.label}</span>
                {field.type === "textarea" ? (
                  <textarea value={form[field.key] || ""} onChange={(e) => setField(field.key, e.target.value)} rows={3} />
                ) : field.type === "select" ? (
                  <select value={form[field.key] || ""} onChange={(e) => setField(field.key, e.target.value)}>
                    {(field.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : (
                  <input type={field.type || "text"} value={form[field.key] || ""} onChange={(e) => setField(field.key, e.target.value)} required={!!field.required} />
                )}
              </label>
            ))}
            <div className="manager-lab-submit">
              <button type="submit" className="btn primary" disabled={saving}>{saving ? "Saqlanmoqda..." : editingRow ? "Yangilash" : "Saqlash"}</button>
              <button type="button" className="btn secondary" onClick={resetForm}>Tozalash</button>
            </div>
          </form>
        </article>

        <article className="manager-lab-card manager-lab-list">
          <SectionTitle title={`${activeConfig.title} ro'yxati`} desc={loading ? "Yuklanmoqda..." : `${rows.length} ta yozuv`} />
          {!loading && !rows.length ? (
            <div className="manager-lab-empty">
              <Sparkles size={20} />
              <strong>Birinchi {activeConfig.title.toLowerCase()} yozuvini kiriting</strong>
              <span>{activeConfig.subtitle}</span>
              <button type="button" className="btn secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Formaga o'tish</button>
            </div>
          ) : null}
          <div className="table-wrap desktop-table">
            <table>
              <thead>
                <tr>
                  {visibleFields.map((field) => <th key={field.key}>{field.label}</th>)}
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {rows.length ? rows.map((row) => (
                  <tr key={row.id}>
                    {visibleFields.map((field) => <td key={field.key}>{renderManagerLabValue(row[field.key])}</td>)}
                    <td>
                      <div className="table-actions">
                        <button type="button" className="btn tiny secondary" onClick={() => startEdit(row)}><Pencil size={14} /> Edit</button>
                        <button type="button" className="btn tiny danger" onClick={() => removeRow(row)}><Trash2 size={14} /> Delete</button>
                      </div>
                    </td>
                  </tr>
                )) : loading ? <tr><td colSpan={visibleFields.length + 1} className="empty-cell">Yuklanmoqda...</td></tr> : null}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {rows.length ? rows.map((row) => (
              <div key={`manager-lab-${row.id}`} className="mobile-record-card">
                <div className="mobile-record-head">
                  <div className="mobile-record-title">
                    <strong>{renderManagerLabValue(row[visibleFields[0]?.key])}</strong>
                    <span>{activeConfig.title}</span>
                  </div>
                </div>
                <div className="mobile-record-grid">
                  {visibleFields.slice(1).map((field) => (
                    <div key={field.key} className="mobile-record-field"><label>{field.label}</label><div>{renderManagerLabValue(row[field.key])}</div></div>
                  ))}
                </div>
                <div className="mobile-record-actions">
                  <button type="button" className="btn tiny secondary" onClick={() => startEdit(row)}><Pencil size={14} /> Edit</button>
                  <button type="button" className="btn tiny danger" onClick={() => removeRow(row)}><Trash2 size={14} /> Delete</button>
                </div>
              </div>
            )) : loading ? <div className="mobile-record-card empty">Yuklanmoqda...</div> : null}
          </div>
        </article>
      </section>
    </div>
  );
}

function ContentPage({ users = [], branches = [], campaigns = [], managerOSData = {}, settings, user, onToast, reload }) {
  const [selectedMonth, setSelectedMonth] = useState(getMonthLabel());
  const [rows, setRows] = useState([]);
  const [tableSearch, setTableSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewRow, setViewRow] = useState(null);
  const [editRow, setEditRow] = useState(null);
  const [viewMode, setViewMode] = useState("table");
  const [calendarPlatformFilter, setCalendarPlatformFilter] = useState("all");
  const [calendarBranchFilter, setCalendarBranchFilter] = useState("all");
  const [bulkStatus, setBulkStatus] = useState("jarayonda");
  const [plannerForm, setPlannerForm] = useState({
    title: "",
    publish_date: `${getMonthLabel()}-01`,
    publish_time: "10:00",
    platform: "Instagram",
    content_type: "post",
    rubric: "rubrika-yoq",
    note: ""
  });

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
    product_name: "",
    video_type: "",
    hook_text: "",
    main_body_text: "",
    cta_text: "",
    content_template: "custom",
    idea_score: 0,
    visual_score: 0,
    editing_score: 0,
    result_score: 0,
    reach_value: 0
  };

  const [form, setForm] = useState(emptyForm);
  const [mobilografProgress, setMobilografProgress] = useState({ final_url: "", approval_comment: "" });
  const isVideo = form.content_type === "video";
  const canCreateContent = canDoAction(user, "content", "create");
  const canEditContent = canDoAction(user, "content", "edit");
  const canDeleteContent = canDoAction(user, "content", "delete");
  const formLocked = editRow ? !canEditContent : !canCreateContent;
  const isMobilografContentOnly = isMobilografUser(user) && user?.role !== "admin";

  useEffect(() => {
    setPlannerForm((prev) => (
      String(prev.publish_date || "").startsWith(selectedMonth)
        ? prev
        : { ...prev, publish_date: `${selectedMonth}-01` }
    ));
  }, [selectedMonth]);
  useEffect(() => {
    if (isMobilografContentOnly && viewMode !== "calendar") setViewMode("calendar");
  }, [isMobilografContentOnly, viewMode]);
  useEffect(() => {
    if (!viewRow || !isMobilografContentOnly) return;
    setMobilografProgress({
      final_url: viewRow.final_url || "",
      approval_comment: ""
    });
  }, [isMobilografContentOnly, viewRow]);
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
  const workflowHistoryRows = [...rows]
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
    { label: "Video/ssenariy", value: rows.filter((item) => item.content_type === "video" || item.scenario || item.script).length, hint: "Hook, asosiy qism, CTA" }
  ];
  const platformMix = rows.reduce((acc, item) => {
    splitCellValues(item.platform).forEach((platform) => {
      acc[platform] = (acc[platform] || 0) + 1;
    });
    return acc;
  }, {});
  const topPlatform = Object.entries(platformMix).sort((a, b) => b[1] - a[1])[0];
  const completionPercent = rows.length ? Math.round((workflowCounts.yakunlandi / rows.length) * 100) : 0;
  const reviewQueueCount = workflowCounts.tasdiqlandi + workflowCounts.qayta_ishlash + workflowCounts.rad_etildi;
  const todayPlanCount = deadlineRows.filter((item) => Number(item.daysLeft) === 0).length;
  const contentV5Stats = [
    { label: "Kontent reja", value: rows.length, hint: `${getMonthTitle(selectedMonth)} oyi`, tone: "blue" },
    { label: "Bugungi publish", value: todayPlanCount, hint: todayPlanCount ? "bugun nazoratda" : "deadline yo'q", tone: todayPlanCount ? "amber" : "green" },
    { label: "Yakunlanish", value: `${completionPercent}%`, hint: `${workflowCounts.yakunlandi}/${rows.length || 0} tayyor`, tone: completionPercent >= 70 ? "green" : completionPercent >= 40 ? "amber" : "blue" },
    { label: "Workflow navbati", value: reviewQueueCount, hint: "tasdiq / qayta ishlash", tone: reviewQueueCount ? "amber" : "green" }
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
  const calendarPlatformTabs = useMemo(() => {
    return ["all", ...new Set(["Instagram", "Telegram", "YouTube", ...calendarPlatforms].filter(Boolean))];
  }, [calendarPlatforms]);
  const plannerRows = useMemo(() => sortRowsByDate(rows, "publish_date"), [rows]);
  const plannerShootDays = useMemo(() => {
    const dates = new Set();
    plannerRows.forEach((row) => {
      if (/video|reels|mobi-video/i.test(String(row.content_type || ""))) {
        const date = formatDate(row.publish_date);
        if (date !== "-") dates.add(date);
      }
    });
    return dates.size;
  }, [plannerRows]);
  const plannerTemplates = [
    { title: "Haftalik post", platform: "Instagram", content_type: "post", rubric: "foydali-malumot", note: "Haftalik foydali post uchun qisqa reja." },
    { title: "Aksiya e'loni", platform: "Telegram", content_type: "post", rubric: "aksiyalar", note: "Aksiya, chegirma yoki konkurs e'loni." },
    { title: "Story signal", platform: "Instagram", content_type: "story", rubric: "trend-video", note: "Story uchun tezkor signal yoki reminder." },
    { title: "Syomka kuni", platform: "Instagram", content_type: "reels", rubric: "xodimlar-bilan", note: "Mobilograf uchun suratga olish / reels reja." }
  ];
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
  const weeklyReportRows = useMemo(() => {
    const currentCampaigns = (campaigns || []).filter((row) => {
      const start = formatDate(row.start_at || row.start_date);
      const end = formatDate(row.end_at || row.end_date);
      return start.startsWith(selectedMonth) || end.startsWith(selectedMonth);
    });
    const scriptRows = rows.filter((row) => row.hook_text || row.main_body_text || row.cta_text || row.scenario_text || row.video_type);
    const creativeRows = managerOSData?.creative_briefs?.rows || [];
    const audienceRows = managerOSData?.audience_metrics?.rows || [];
    const bloggerRows = managerOSData?.blogger_partners?.rows || [];
    const campaignBriefRows = managerOSData?.campaign_briefs?.rows || [];
    const adsRows = managerOSData?.ad_budgets?.rows || [];
    const weeklyMap = [
      { label: "Kontent + ssenariy", share: 25, value: scriptRows.length || rows.length, hint: `${scriptRows.length} ssenariy / ${rows.length} reja`, tone: "blue" },
      { label: "Kampaniya + aksiya", share: 20, value: campaignBriefRows.length || currentCampaigns.length, hint: `${currentCampaigns.length} kampaniya`, tone: "fuchsia" },
      { label: "Ads + target", share: 20, value: adsRows.length || currentCampaigns.length, hint: `${currentCampaigns.reduce((sum, row) => sum + Number(row.lead_count || row.leads || 0), 0)} lid`, tone: "green" },
      { label: "Dizayn + kreativ", share: 15, value: creativeRows.length, hint: `${creativeRows.length} brief`, tone: "purple" },
      { label: "Platforma rivoji", share: 10, value: Object.keys(platformMix).length, hint: `${Object.keys(platformMix).length} platforma`, tone: "cyan" },
      { label: "Analitika", share: 5, value: audienceRows.length, hint: `${audienceRows.length} signal`, tone: "sky" },
      { label: "Blogerlar", share: 5, value: bloggerRows.length, hint: `${bloggerRows.length} hamkor`, tone: "amber" }
    ];
    return weeklyMap.map((item) => ({
      ...item,
      readiness: Math.min(100, Math.round((Number(item.value || 0) / Math.max(1, Math.ceil(item.share / 10))) * 100))
    }));
  }, [campaigns, managerOSData, platformMix, rows, selectedMonth]);
  const emptyCalendarDays = useMemo(() => {
    const days = buildMonthCalendar(selectedMonth, plannerRows, "publish_date").filter((cell) => !cell.empty);
    return days.filter((cell) => !cell.items.length).length;
  }, [selectedMonth, plannerRows]);

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

  function setPlannerField(key, value) {
    setPlannerForm((prev) => ({ ...prev, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function buildPlannerPayload(source = {}, overrides = {}) {
    const title = overrides.title ?? source.title ?? plannerForm.title;
    const publishDate = overrides.publish_date ?? source.publish_date ?? plannerForm.publish_date;
    const platform = overrides.platform ?? source.platform ?? plannerForm.platform;
    const contentType = overrides.content_type ?? source.content_type ?? plannerForm.content_type;
    const rubric = overrides.rubric ?? source.rubric ?? plannerForm.rubric;
    const note = overrides.note ?? source.approval_comment ?? plannerForm.note;
    const time = overrides.publish_time ?? (source.id ? "" : plannerForm.publish_time);
    const noteWithTime = [time ? `Vaqt: ${time}` : "", note].filter(Boolean).join(" / ");

    return {
      title: String(title || "").trim(),
      publish_date: publishDate || null,
      status: overrides.status ?? source.status ?? "reja",
      platform: platform || "Instagram",
      content_type: contentType || "post",
      rubric: rubric || "rubrika-yoq",
      assigned_user_id: source.assigned_user_id || null,
      video_editor_user_id: source.video_editor_user_id || null,
      video_face_user_id: source.video_face_user_id || null,
      bonus_enabled: false,
      proposal_count: 0,
      approved_count: 0,
      difficulty_level: "bonussiz",
      final_url: source.final_url || "",
      notes: source.notes || "",
      branch_ids_json: Array.isArray(source.branch_ids_json) ? source.branch_ids_json : [],
      approval_comment: noteWithTime || source.approval_comment || "",
      product_name: source.product_name || "",
      video_type: source.video_type || contentType || "",
      hook_text: source.hook_text || "",
      main_body_text: source.main_body_text || source.scenario_text || "",
      cta_text: source.cta_text || "",
      scenario_text: source.scenario_text || source.main_body_text || "",
      content_template: source.content_template || "monthly_planner",
      idea_score: Number(source.idea_score || 0),
      visual_score: Number(source.visual_score || 0),
      editing_score: Number(source.editing_score || 0),
      result_score: Number(source.result_score || 0),
      reach_value: Number(source.reach_value || 0)
    };
  }

  async function quickAddPlannerItem(e) {
    e.preventDefault();
    if (!canCreateContent) {
      onToast("Sizda kontent qo'shish ruxsati yo'q", "error");
      return;
    }
    const payload = buildPlannerPayload();
    if (!payload.title || !payload.publish_date) {
      onToast("Kontent nomi va sana majburiy", "error");
      return;
    }
    try {
      setSaving(true);
      await api.create("content", payload);
      await loadMonth(selectedMonth);
      await reload();
      setPlannerForm((prev) => ({ ...prev, title: "", note: "" }));
      onToast("Oylik rejaga kontent qo'shildi", "success", { center: true });
    } catch (err) {
      onToast(err.message || "Oylik rejaga qo'shib bo'lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  async function movePlannerItem(id, nextDate) {
    if (!canEditContent) {
      onToast("Sizda kontent sanasini o'zgartirish ruxsati yo'q", "error");
      return;
    }
    const row = rows.find((item) => Number(item.id) === Number(id));
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
      onToast("Kontent boshqa sanaga o'tkazildi", "success", { center: true });
    } catch (err) {
      onToast(err.message || "Sanani o'zgartirib bo'lmadi", "error");
    }
  }

  async function duplicatePlannerItem(row) {
    if (!canCreateContent) {
      onToast("Sizda kontent nusxalash ruxsati yo'q", "error");
      return;
    }
    const sourceDate = new Date(`${formatDate(row.publish_date)}T00:00:00`);
    if (!Number.isNaN(sourceDate.getTime())) sourceDate.setDate(sourceDate.getDate() + 1);
    const defaultDate = Number.isNaN(sourceDate.getTime()) ? `${selectedMonth}-01` : formatDate(sourceDate);
    const nextDate = window.prompt("Qaysi sanaga nusxalansin? YYYY-MM-DD", defaultDate);
    if (!nextDate) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      onToast("Sana formati noto'g'ri. Masalan: 2026-06-15", "error");
      return;
    }
    try {
      const payload = buildPlannerPayload(row, {
        publish_date: nextDate,
        title: `${row.title || "Kontent"} copy`
      });
      await api.create("content", payload);
      if (!nextDate.startsWith(selectedMonth)) setSelectedMonth(nextDate.slice(0, 7));
      await loadMonth(nextDate.slice(0, 7));
      await reload();
      onToast("Kontent boshqa sanaga nusxalandi", "success", { center: true });
    } catch (err) {
      onToast(err.message || "Nusxalab bo'lmadi", "error");
    }
  }

  function applyPlannerTemplate(template) {
    setPlannerForm((prev) => ({
      ...prev,
      title: template.title,
      platform: template.platform,
      content_type: template.content_type,
      rubric: template.rubric,
      note: template.note
    }));
  }


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
      product_name: row.product_name || "",
      video_type: row.video_type || "",
      hook_text: row.hook_text || "",
      main_body_text: row.main_body_text || row.scenario_text || "",
      cta_text: row.cta_text || "",
      content_template: row.content_template || "custom",
      idea_score: row.idea_score || 0,
      visual_score: row.visual_score || 0,
      editing_score: row.editing_score || 0,
      result_score: row.result_score || 0,
      reach_value: row.reach_value || 0
    });

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
        bonus_enabled: false,
        proposal_count: 0,
        approved_count: 0,
        difficulty_level: "bonussiz",
        final_url: normalizeExternalUrl(form.work_url),
        notes: "",
        approval_comment: form.approval_comment || "",
        product_name: form.product_name || "",
        video_type: form.video_type || "",
        hook_text: form.hook_text || "",
        main_body_text: form.main_body_text || "",
        cta_text: form.cta_text || "",
        scenario_text: form.main_body_text || "",
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

  async function submitMobilografProgress(status) {
    if (!viewRow?.id) return;
    const isSubmitStep = status === "submitted";
    const finalUrl = normalizeExternalUrl(mobilografProgress.final_url);
    if (isSubmitStep && !finalUrl) {
      onToast("Link yuborish uchun ish linkini kiriting", "error");
      return;
    }

    try {
      setSaving(true);
      const updated = await api.post(`/api/content/${viewRow.id}/mobilograf-progress`, {
        status,
        final_url: finalUrl,
        approval_comment: mobilografProgress.approval_comment
      });
      setRows((prev) => sortRowsByDate(prev.map((row) => Number(row.id) === Number(updated.id) ? updated : row), "publish_date"));
      setViewRow(updated);
      await loadMonth(selectedMonth);
      await reload();
      onToast(isSubmitStep ? "Ish linki managerga yuborildi" : "Mobilograf statusi yangilandi", "success", { center: true });
    } catch (err) {
      onToast(err.message || "Mobilograf progress saqlanmadi", "error");
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

  async function bulkUpdateVisibleStatus() {
    if (!canEditContent) {
      onToast("Sizda kontentni bulk tahrirlash ruxsati yo'q", "error");
      return;
    }
    const ids = visibleRows.map((row) => Number(row.id)).filter(Boolean);
    if (!ids.length) {
      onToast("Bulk update uchun yozuv topilmadi", "error");
      return;
    }
    const ok = window.confirm(`${ids.length} ta ko'rinayotgan kontent statusini "${formatApprovalStatus(bulkStatus)}" qilamizmi?`);
    if (!ok) return;
    try {
      await api.create("content/batch-update", { ids, updates: { status: bulkStatus } });
      await loadMonth(selectedMonth);
      await reload();
      onToast("Kontent bulk status yangilandi", "success", { center: true });
    } catch (err) {
      onToast(err.message || "Bulk status yangilanmadi", "error");
    }
  }

  return (
    <div className={`page-grid content-page-modern content-page-v5 ${isMobilografContentOnly ? "mobilograf-content-only" : ""}`}>
      {isMobilografContentOnly ? (
        <section className="mobilograf-content-head">
          <div>
            <span>Mobilograf kalendar</span>
            <h1>Kontent reja</h1>
            <p>Faqat ko'rish uchun oylik kontent kalendari.</p>
          </div>
          <div className="mobilograf-month-control">
            <button type="button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>{"<"}</button>
            <strong>{getMonthTitle(selectedMonth)}</strong>
            <button type="button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>{">"}</button>
          </div>
          <button
            type="button"
            className="btn secondary mobilograf-pdf-btn"
            onClick={() => api.exportFile(`/api/export/content-calendar.pdf?month=${selectedMonth}`, `content-calendar-${selectedMonth}.pdf`)}
          >
            PDF saqlash
          </button>
        </section>
      ) : (
      <>
      <div className="content-v5-hero">
        <div className="content-v5-hero-copy">
          <span className="content-v5-eyebrow">SMM Content Command Center</span>
          <h1>Kontent reja markazi</h1>
          <p>Eski kontent funksiyalari saqlangan holda, reja, deadline, platforma va workflow nazorati bitta professional oynada jamlandi.</p>
          <div className="content-v5-hero-actions">
            <button type="button" className="btn primary" onClick={() => { resetForm(); window.scrollTo({ top: 280, behavior: "smooth" }); }} disabled={!canCreateContent}>+ Kontent qo'shish</button>
            <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/content.xlsx", `content-${selectedMonth}.xlsx`)}>Excel export</button>
            <button type="button" className="btn secondary" onClick={() => api.exportFile(`/api/export/content-calendar.pdf?month=${selectedMonth}`, `content-calendar-${selectedMonth}.pdf`)}>PDF kalendar</button>
            <div className="content-v5-month-switch">
              <button type="button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>‹</button>
              <strong>{getMonthTitle(selectedMonth)}</strong>
              <button type="button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>›</button>
            </div>
          </div>
        </div>
        <div className="content-v5-hero-panel">
          <div className="content-v5-score-ring" style={{ "--score": `${completionPercent}%` }}>
            <strong>{completionPercent}%</strong>
            <span>oylik ritm</span>
          </div>
          <div className="content-v5-platform-card">
            <span>Eng faol kanal</span>
            <strong>{topPlatform ? topPlatform[0] : "Hali yo'q"}</strong>
            <small>{topPlatform ? `${topPlatform[1]} ta kontent` : "Kontent qo'shilmagan"}</small>
          </div>
          <div className="content-v5-platform-pills">
            {Object.entries(platformMix).slice(0, 5).map(([platform, count]) => (
              <span key={platform}><b>{platform}</b>{count}</span>
            ))}
            {!Object.keys(platformMix).length ? <span><b>Platforma</b>0</span> : null}
          </div>
        </div>
      </div>

      <div className="content-v5-stats-row">
        {contentV5Stats.map((item) => (
          <div key={item.label} className={`content-v5-stat ${item.tone}`}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <small>{item.hint}</small>
          </div>
        ))}
      </div>

      <ContentRhythmV8
        rows={rows}
        selectedMonth={selectedMonth}
        onCalendar={() => setViewMode("calendar")}
      />

      <ContentCalendarProV9
        rows={rows}
        selectedMonth={selectedMonth}
        users={users}
        branches={branches}
        onToast={onToast}
        reload={reload}
        disabled={formLocked}
      />

      <section className="monthly-planner">
        <div className="monthly-planner-head">
          <div>
            <span>Oylik kontent reja</span>
            <h2>Bir oy rejasini tez to'ldirish</h2>
            <p>Kontent kartalarini qo'shing, nusxalang yoki kalendarda boshqa sanaga sudrab o'tkazing. Saqlanganlar pastdagi kontent reja ro'yxatiga tushadi.</p>
          </div>
          <div className="monthly-planner-actions">
            <button type="button" className="btn secondary" onClick={() => setViewMode("calendar")}>Kalendar view</button>
            <button type="button" className="btn primary" onClick={() => setViewMode("table")}><Send size={15} /> Kontent reja ro'yxati</button>
          </div>
        </div>
        <div className="monthly-planner-stats">
          <div><span>Rejalashtirilgan</span><strong>{plannerRows.length}</strong><small>{getMonthTitle(selectedMonth)}</small></div>
          <div><span>Syomka kunlari</span><strong>{plannerShootDays}</strong><small>video / reels</small></div>
          <div><span>Bo'sh kunlar</span><strong>{emptyCalendarDays}</strong><small>ritm uchun signal</small></div>
        </div>
        <div className="monthly-planner-layout">
          <aside className="planner-templates">
            <strong>Shablonlar</strong>
            <span>Bir bosishda formani to'ldiradi.</span>
            {plannerTemplates.map((template) => (
              <button key={template.title} type="button" onClick={() => applyPlannerTemplate(template)}>
                <i>{template.platform.slice(0, 2)}</i>
                <div>
                  <strong>{template.title}</strong>
                  <small>{formatContentType(template.content_type)} / {formatRubric(template.rubric)}</small>
                </div>
              </button>
            ))}
          </aside>
          <div className="planner-calendar">
            <div className="planner-calendar-head">
              <button type="button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}>‹</button>
              <strong>{getMonthTitle(selectedMonth)}</strong>
              <button type="button" onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}>›</button>
              <span>Drag & drop yoqilgan</span>
            </div>
            <MiniCalendar
              monthLabel={selectedMonth}
              rows={plannerRows}
              dateKey="publish_date"
              onMoveDate={movePlannerItem}
              renderItem={(item) => (
                <div className={`planner-calendar-pill ${contentTypeChipTone(item.content_type)} ${isAcademyContent(item) ? "academy" : ""} ${isCustomerHeroContent(item) ? "customer" : ""} ${isServicesContent(item) ? "services" : ""}`}>
                  <div>
                    <strong>{item.title}</strong>
                    <span>{item.platform || "Platforma"} / {formatContentType(item.content_type)}</span>
                  </div>
                  <button type="button" title="Nusxalash" onClick={(e) => { e.stopPropagation(); duplicatePlannerItem(item); }}>
                    <Copy size={13} />
                  </button>
                </div>
              )}
            />
          </div>
          <aside className="planner-quick">
            <div className="planner-quick-head">
              <strong>Tez qo'shish</strong>
              <span>Reja kartasi</span>
            </div>
            <form onSubmit={quickAddPlannerItem}>
              <label><span>Kontent nomi</span><input value={plannerForm.title} onChange={(e) => setPlannerField("title", e.target.value)} placeholder="Masalan: SMM trendlar 2026" required /></label>
              <label><span>Sana</span><input type="date" value={plannerForm.publish_date} onChange={(e) => setPlannerField("publish_date", e.target.value)} required /></label>
              <label><span>Vaqt</span><input type="time" value={plannerForm.publish_time} onChange={(e) => setPlannerField("publish_time", e.target.value)} /></label>
              <label><span>Platforma</span><select value={plannerForm.platform} onChange={(e) => setPlannerField("platform", e.target.value)}><option>Instagram</option><option>Telegram</option><option>YouTube</option><option>TikTok</option><option>Facebook</option></select></label>
              <label><span>Format</span><select value={plannerForm.content_type} onChange={(e) => setPlannerField("content_type", e.target.value)}>{CONTENT_TYPE_OPTIONS.slice(0, 7).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label><span>Rubrika</span><select value={plannerForm.rubric} onChange={(e) => setPlannerField("rubric", e.target.value)}>{RUBRIC_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
              <label className="full"><span>Izoh</span><textarea value={plannerForm.note} onChange={(e) => setPlannerField("note", e.target.value)} rows={3} placeholder="Hook, izoh yoki qisqa topshiriq..." /></label>
              <button type="submit" className="btn primary" disabled={saving || !canCreateContent}>{saving ? "Saqlanmoqda..." : "Oylik rejaga qo'shish"}</button>
            </form>
            <div className="planner-live-list">
              <strong>Live preview</strong>
              {plannerRows.slice(0, 6).map((row) => (
                <button key={`planner-live-${row.id}`} type="button" onClick={() => setViewRow(row)}>
                  <span>{formatDate(row.publish_date)}</span>
                  <b>{row.title}</b>
                  <small>{row.platform || "-"} / {formatContentType(row.content_type)}</small>
                </button>
              ))}
              {!plannerRows.length ? <p>Bu oy uchun reja hali yo'q.</p> : null}
            </div>
          </aside>
        </div>
      </section>

      <section className="content-weekly-report">
        <div className="content-weekly-head">
          <div>
            <span>Haftalik hisobot</span>
            <h2>25/20/20/15/10/5/5 ish taqsimoti</h2>
          </div>
          <strong>{getMonthTitle(selectedMonth)}</strong>
        </div>
        <div className="content-weekly-grid">
          {weeklyReportRows.map((item) => (
            <div key={item.label} className={`content-weekly-item ${item.tone}`}>
              <div>
                <span>{item.label}</span>
                <strong>{item.share}%</strong>
              </div>
              <i><em style={{ width: `${item.readiness}%` }} /></i>
              <small>{item.hint}</small>
            </div>
          ))}
        </div>
      </section>

      <div className="content-v5-viewbar">
        <div className="content-v5-segment">
          {[
            ["table", "Jadval"],
            ["calendar", "Kalendar"],
            ["kanban", "Workflow"]
          ].map(([key, label]) => (
            <button key={key} type="button" className={viewMode === key ? "active" : ""} onClick={() => setViewMode(key)}>{label}</button>
          ))}
        </div>
        <label className="table-search content-modern-search content-v5-search" aria-label="Kontent qidiruvi">
          <Search size={16} />
          <input
            value={tableSearch}
            onChange={(e) => setTableSearch(e.target.value)}
            placeholder="Kontent, hodim, platforma yoki statusdan qidiring..."
          />
        </label>
        <div className="content-v5-mini-alerts">
          <span className={overdueRows.length ? "danger" : "success"}>{overdueRows.length} kechikkan</span>
          <span className={contentSignals.length ? "warning" : "success"}>{contentSignals.length} signal</span>
        </div>
      </div>

      <div className="card content-modern-card content-form-card content-v5-form-card">
        <SectionTitle
          title={editRow ? "Kontent kartasini tahrirlash" : "Yangi kontent kartasi"}
          desc="Mavjud eski saqlash/tahrirlash logikasi saqlangan"
          right={
            <div className="toolbar-actions content-modern-toolbar">
              <button type="button" className="btn secondary content-modern-btn" onClick={() => setViewMode(viewMode === "table" ? "calendar" : viewMode === "calendar" ? "kanban" : "table")}>
                {viewMode === "table" ? "Kalendar" : viewMode === "calendar" ? "Workflow" : "Jadval"}
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
          Video kontent uchun ssenariy to'liq bo'lishi kerak: <strong>Hook</strong>, <strong>asosiy qism</strong> va <strong>CTA</strong>. Mobilograf tasdiqlangan reja asosida suratga olish, montaj va joylashni bajaradi.
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
              <strong>Workflow tarixi</strong>
              <span>so'nggi 6</span>
            </div>
            <div className="approval-history-mini">
              {workflowHistoryRows.length ? workflowHistoryRows.map((item) => (
                <button key={`approval-history-${item.id}`} type="button" onClick={() => setViewRow(item)}>
                  <span className={approvalStatusClass(item.status)}>{formatApprovalStatus(item.status)}</span>
                  <strong>{item.title}</strong>
                  <small>{item.approval_comment || formatDateTime(item.updated_at || item.created_at)}</small>
                </button>
              )) : <div className="empty-block">Workflow tarixi hali yo'q</div>}
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
              <option value="tasdiqlandi">Workflow</option>
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

          <label>
            <span>Mahsulot / xizmat</span>
            <input value={form.product_name} onChange={(e) => setField("product_name", e.target.value)} placeholder="Masalan: iPhone 15 Pro" disabled={formLocked} />
          </label>

          <label>
            <span>Video formati</span>
            <select value={form.video_type} onChange={(e) => setField("video_type", e.target.value)} disabled={formLocked}>
              <option value="">Tanlanmagan</option>
              <option value="review">Review</option>
              <option value="comparison">Taqqoslash</option>
              <option value="test">Test</option>
              <option value="expert">Expert</option>
              <option value="brand">Brand</option>
              <option value="trend">Trend</option>
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

          <label className="full-col">
            <span>Qilingan ish linki</span>
            <input
              value={form.work_url}
              onChange={(e) => setField("work_url", e.target.value)}
              placeholder="https://instagram.com/... yoki post havolasi"
              disabled={formLocked}
            />
          </label>

          <label className="full-col"><span>Hook</span><textarea value={form.hook_text} onChange={(e) => setField("hook_text", e.target.value)} rows={2} placeholder="Videoning birinchi 3 soniyasida e'tibor tortadigan gap" disabled={formLocked} /></label>
          <label className="full-col"><span>Asosiy qism / ssenariy</span><textarea value={form.main_body_text} onChange={(e) => setField("main_body_text", e.target.value)} rows={3} placeholder="Kadrlar ketma-ketligi, mahsulot argumentlari, gapiriladigan matn" disabled={formLocked} /></label>
          <label className="full-col"><span>CTA</span><textarea value={form.cta_text} onChange={(e) => setField("cta_text", e.target.value)} rows={2} placeholder="Oxirida mijoz nima qilsin: yozsin, buyurtma bersin, kanalga o'tsin" disabled={formLocked} /></label>

          <label className="full-col"><span>Workflow izohi</span><textarea value={form.approval_comment} onChange={(e) => setField("approval_comment", e.target.value)} rows={2} placeholder="Qayta ishlash, fayl yoki publish bo'yicha izoh" disabled={formLocked} /></label>

          <button className="btn primary content-submit-btn" type="submit" disabled={saving || formLocked}>
            {saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Saqlash"}
          </button>
        </form>
      </div>
      </>
      )}

      


      <div className="card content-modern-card content-list-card">
        <SectionTitle
          title={isMobilografContentOnly ? `${getMonthTitle(selectedMonth)} kontent kalendari` : `${getMonthTitle(selectedMonth)} operatsion ro'yxati`}
          desc={isMobilografContentOnly ? `${calendarRows.length} ta kontent reja` : undefined}
          right={!isMobilografContentOnly ? (
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
              <button
                type="button"
                className="btn secondary content-modern-btn"
                onClick={() => api.exportFile(`/api/export/content-calendar.pdf?month=${selectedMonth}`, `content-calendar-${selectedMonth}.pdf`)}
              >
                PDF kalendar
              </button>
              <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}>
                <option value="reja">Reja</option>
                <option value="tasdiqlandi">Workflow</option>
                <option value="jarayonda">Jarayonda</option>
                <option value="qayta_ishlash">Qayta ishlash</option>
                <option value="yakunlandi">Yakunlandi</option>
              </select>
              <button type="button" className="btn secondary content-modern-btn" onClick={bulkUpdateVisibleStatus} disabled={!canEditContent || !visibleRows.length}>
                Bulk status
              </button>
            </div>
          ) : null}
        />

        {!isMobilografContentOnly && viewMode === "table" ? <>
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
                  <th>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="empty-cell">Yuklanmoqda...</td></tr>
                ) : visibleRows.length ? (
                  visibleRows.map((row) => (
                    <tr key={row.id} className={`${isAcademyContent(row) ? "academy-content-row" : ""} ${isCustomerHeroContent(row) ? "customer-content-row" : ""} ${isServicesContent(row) ? "services-content-row" : ""}`}>
                      <td>
                        <div className="table-title-cell">
                          <strong className="table-title-main">
                            {isAcademyContent(row) ? <span className="academy-cap"><GraduationCap size={15} /></span> : null}
                            {isCustomerHeroContent(row) ? <span className="customer-cap"><ContactRound size={15} /></span> : null}
                            {isServicesContent(row) ? <span className="services-cap"><ReceiptText size={15} /></span> : null}
                            {row.title}
                          </strong>
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
                          <DeadlineRiskPill row={row} />
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
                          <Clapperboard size={13} />
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
                  <tr><td colSpan="8" className="empty-cell">
                    {tableSearch.trim() ? "Qidiruv bo'yicha kontent topilmadi" : (
                      <div className="content-empty-start">
                        <strong>Birinchi kontent kartasini yarating</strong>
                        <span>Hook, asosiy qism, CTA, mahsulot va platformani bir joyda kiriting.</span>
                        <button type="button" className="btn tiny secondary" onClick={() => window.scrollTo({ top: 280, behavior: "smooth" })}>Formaga o'tish</button>
                      </div>
                    )}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mobile-card-list">
            {loading ? (
              <div className="mobile-record-card empty">Yuklanmoqda...</div>
            ) : visibleRows.length ? (
              visibleRows.map((row) => (
                <div key={`content-card-${row.id}`} className={`mobile-record-card ${isAcademyContent(row) ? "academy-content-card" : ""} ${isCustomerHeroContent(row) ? "customer-content-card" : ""} ${isServicesContent(row) ? "services-content-card" : ""}`}>
                  <div className="mobile-record-head">
                    <div className="mobile-record-title">
                      <strong>{isAcademyContent(row) ? <GraduationCap size={15} /> : null}{isCustomerHeroContent(row) ? <ContactRound size={15} /> : null}{isServicesContent(row) ? <ReceiptText size={15} /> : null}{row.title}</strong>
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
        </> : (isMobilografContentOnly || viewMode === "calendar") ? (
          <div className="calendar-pro-shell">
            {!isMobilografContentOnly ? <div className="content-calendar-tabs">
              {calendarPlatformTabs.map((platform) => {
                const count = platform === "all"
                  ? visibleRows.length
                  : visibleRows.filter((row) => splitCellValues(row.platform).includes(platform)).length;
                return (
                  <button
                    key={platform}
                    type="button"
                    className={calendarPlatformFilter === platform ? "active" : ""}
                    onClick={() => setCalendarPlatformFilter(platform)}
                  >
                    <span>{platform === "all" ? "Hammasi" : platform}</span>
                    <strong>{count}</strong>
                  </button>
                );
              })}
            </div> : null}
            {!isMobilografContentOnly ? <div className="calendar-pro-toolbar">
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
            </div> : null}
            <MiniCalendar
              monthLabel={selectedMonth}
              rows={calendarRows}
              dateKey="publish_date"
              onMoveDate={isMobilografContentOnly ? null : async (id, nextDate) => {
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
                const workTime = getContentWorkTime(item);
                return (
                  <button key={item.id} type="button" className={`calendar-pill content-calendar-pill branch-tone-${branchIndex} ${isMobilografContentOnly ? "mobilograf-pill" : ""} ${isAcademyContent(item) ? "academy" : ""} ${isCustomerHeroContent(item) ? "customer" : ""} ${isServicesContent(item) ? "services" : ""}`} onClick={() => setViewRow(item)}>
                    <span>{isMobilografContentOnly ? `${workTime} / ${item.platform || "-"} / ${formatContentType(item.content_type)}` : `${item.platform || "-"} / ${item.video_type || item.content_type || "post"}`}</span>
                    <strong>{item.title}</strong>
                    <small>{isMobilografContentOnly ? (item.video_type || formatRubric(item.rubric)) : `${item.hook_text ? "Hook" : "Hook yo'q"} / ${item.cta_text ? "CTA" : "CTA yo'q"}`}</small>
                  </button>
                );
              }}
            />
          </div>
        ) : (
          <KanbanBoard
            columns={[
              { id: "reja", label: "Reja", tone: "default" },
              { id: "tasdiqlandi", label: "Workflow", tone: "warning" },
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

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title={isMobilografContentOnly ? "Mobilograf ish briefi" : "Kontent reja tafsiloti"} wide>
        {viewRow ? (
          isMobilografContentOnly ? (
            <div className="mobilograf-brief-panel">
              <div className="mobilograf-brief-hero">
                <div>
                  <span>Kontent vazifasi</span>
                  <h2>{viewRow.title}</h2>
                  <p>{formatDate(viewRow.publish_date)} / {getContentWorkTime(viewRow)} / {formatApprovalStatus(viewRow.status)}</p>
                </div>
                <DeadlineRiskPill row={viewRow} />
              </div>
              <div className="mobilograf-brief-meta">
                <div><strong>Platforma</strong><span className="table-chip-row">{splitCellValues(viewRow.platform).length ? splitCellValues(viewRow.platform).map((platform, idx) => <PlatformBadge key={`${viewRow.id}-mob-platform-${idx}`} platform={platform} />) : "-"}</span></div>
                <div><strong>Format</strong><span>{viewRow.video_type || formatContentType(viewRow.content_type)}</span></div>
                <div><strong>Rubrika</strong><span>{formatRubric(viewRow.rubric)}</span></div>
                <div><strong>Mahsulot</strong><span>{viewRow.product_name || "-"}</span></div>
              </div>
              <div className="mobilograf-brief-script">
                <div><strong>Hook</strong><p>{viewRow.hook_text || "Hook kiritilmagan"}</p></div>
                <div><strong>Ssenariy / asosiy qism</strong><p>{viewRow.main_body_text || viewRow.scenario_text || "Ssenariy kiritilmagan"}</p></div>
                <div><strong>CTA</strong><p>{viewRow.cta_text || "CTA kiritilmagan"}</p></div>
                <div><strong>Izoh</strong><p>{viewRow.approval_comment || "Qo'shimcha izoh yo'q"}</p></div>
              </div>
              <div className="mobilograf-progress-box">
                <label>
                  <span>Ish linki</span>
                  <input
                    value={mobilografProgress.final_url}
                    onChange={(e) => setMobilografProgress((prev) => ({ ...prev, final_url: e.target.value }))}
                    placeholder="Instagram, Telegram yoki Drive link"
                  />
                </label>
                <label>
                  <span>Mobilograf izohi</span>
                  <textarea
                    value={mobilografProgress.approval_comment}
                    onChange={(e) => setMobilografProgress((prev) => ({ ...prev, approval_comment: e.target.value }))}
                    rows={2}
                    placeholder="Masalan: syomka tugadi, montajga o'tdi, link yuborildi"
                  />
                </label>
                <div className="mobilograf-progress-actions">
                  <button type="button" className="btn secondary" onClick={() => submitMobilografProgress("started")} disabled={saving}>Ishni boshladim</button>
                  <button type="button" className="btn secondary" onClick={() => submitMobilografProgress("editing")} disabled={saving}>Montajda</button>
                  <button type="button" className="btn secondary" onClick={() => submitMobilografProgress("ready")} disabled={saving}>Tayyor</button>
                  <button type="button" className="btn primary" onClick={() => submitMobilografProgress("submitted")} disabled={saving}>
                    <Send size={15} /> Link yuborildi
                  </button>
                </div>
              </div>
              <div className="mobilograf-brief-footer">
                <span className={approvalStatusClass(viewRow.status)}>{formatApprovalStatus(viewRow.status)}</span>
                {viewRow.final_url ? (
                  <button type="button" className="btn secondary" onClick={() => openExternalUrl(viewRow.final_url)}>
                    <Link2 size={15} /> Ish linkini ochish
                  </button>
                ) : <span className="mini-badge warning">Ish linki yo'q</span>}
              </div>
            </div>
          ) : (
            <div className="content-detail-layout">
              <div className="content-detail-main">
                <ContentStatusStepper status={viewRow.status} />
                <div className="detail-grid content-detail-grid">
                  <div><strong>Kontent nomi</strong><span>{viewRow.title}</span></div>
                  <div><strong>Sana</strong><span>{formatDate(viewRow.publish_date)}</span></div>
                  <div><strong>Deadline risk</strong><span><DeadlineRiskPill row={viewRow} /></span></div>
                  <div><strong>Holati</strong><span className={approvalStatusClass(viewRow.status)}>{formatApprovalStatus(viewRow.status)}</span></div>
                  <div><strong>Platforma</strong><span className="table-chip-row">{splitCellValues(viewRow.platform).length ? splitCellValues(viewRow.platform).map((platform, idx) => <PlatformBadge key={`${viewRow.id}-detail-platform-${idx}`} platform={platform} />) : "-"}</span></div>
                  <div><strong>Turi</strong><span>{formatContentType(viewRow.content_type)}</span></div>
                  <div><strong>Rubrika</strong><span>{formatRubric(viewRow.rubric)}</span></div>
                  <div><strong>Mahsulot</strong><span>{viewRow.product_name || "-"}</span></div>
                  <div><strong>Video formati</strong><span>{viewRow.video_type || "-"}</span></div>
                  <div className="full-col"><strong>Hook</strong><span>{viewRow.hook_text || "-"}</span></div>
                  <div className="full-col"><strong>Asosiy qism / ssenariy</strong><span>{viewRow.main_body_text || viewRow.scenario_text || "-"}</span></div>
                  <div className="full-col"><strong>CTA</strong><span>{viewRow.cta_text || "-"}</span></div>
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
                  <div className="full-col"><strong>Workflow izohi</strong><span>{viewRow.approval_comment || "-"}</span></div>
                </div>
              </div>
              <div className="content-detail-side">
                <DiscussionPanel entityType="content" entityId={viewRow.id} onToast={onToast} />
              </div>
            </div>
          )
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
                <span>Payroll</span>
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
  ctx.fillText("aloo bonus payroll", outerPadding + 28, 72);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 42px 'Segoe UI'";
  ctx.fillText(`${getMonthTitle(monthLabel)} bonus hisoboti`, outerPadding + 28, 122);

  ctx.fillStyle = "#64748b";
  ctx.font = "500 18px 'Segoe UI'";
  const subtitle = approvedByName
    ? `Payroll manba: ${approvedByName}${approvedAt ? ` • ${formatDateTime(approvedAt)}` : ""}`
    : "MySeOne payroll bo'yicha tayyorlangan bonus hisoboti";
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
    accent.addColorStop(0, "#1478F2");
    accent.addColorStop(1, "#EAF3FF");
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
    ctx.fillText(`Payroll birlik: ${row.approved_count}`, x + 114, y + 108);

    ctx.fillStyle = "#1277da";
    ctx.font = "600 14px 'Segoe UI'";
    ctx.fillText("Jami bonus", x + 114, y + 136);
    ctx.fillStyle = "#0f172a";
    ctx.font = "700 28px 'Segoe UI'";
    ctx.fillText(formatMoney(row.amount), x + 114, y + 162);
  });

  ctx.fillStyle = "#64748b";
  ctx.font = "500 16px 'Segoe UI'";
  ctx.fillText("aloo SMM panel • bonus payroll export", outerPadding, height - 34);

  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = `bonus-payroll-${monthLabel}.png`;
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
  const currentUserId = user?.id ? String(user.id) : "";
  const isMobilografBonusMode = isMobilografUser(user);
  const isSmmManagerBonusMode = false;
  const selectableBonusUsers = useMemo(() => {
    const list = users || [];
    if (!isMobilografBonusMode || !currentUserId) return list;
    return list.filter((item) => String(item.id) === currentUserId);
  }, [users, isMobilografBonusMode, currentUserId]);
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
      { value: "approval:approved", label: "Holat: Payroll ready" },
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
  const pendingRowsCount = filteredItems.filter((item) => (item.paid_status || "pending") === "pending").length;
  const readyRowsCount = filteredItems.filter((item) => (item.paid_status || "pending") === "approved" || item.approval_status === "approved").length;
  const paidRowsCount = filteredItems.filter((item) => (item.paid_status || "pending") === "paid").length;
  const payrollSteps = [
    {
      label: "MySeOne sync",
      value: `${filteredItems.length} yozuv`,
      detail: "avtomatik yangilanadi",
      status: filteredItems.length ? "done" : "idle"
    },
    {
      label: "Pending",
      value: formatMoney(pendingAmount),
      detail: `${pendingRowsCount} yozuv tekshiruvda`,
      status: pendingRowsCount ? "warning" : "done"
    },
    {
      label: "Payroll ready",
      value: formatMoney(approvedReadyAmount || totalApprovedAmount),
      detail: `${readyRowsCount} yozuv tayyor`,
      status: readyRowsCount ? "active" : "idle"
    },
    {
      label: "Paid",
      value: formatMoney(paidAmount),
      detail: `${paidRowsCount} yozuv to'langan`,
      status: paidRowsCount ? "done" : "idle"
    },
    {
      label: "Month lock",
      value: monthClosed ? "Locked" : "Open",
      detail: monthClosed ? "audit bilan himoyalangan" : "yopishga tayyor",
      status: monthClosed ? "done" : "idle"
    }
  ];
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
      onToast("Payroll uchun bonus yozuvlari topilmadi", "error");
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
      onToast("Payroll uchun yozuv topilmadi", "error");
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
      onToast(`${getMonthTitle(monthFilter)} bonuslari payroll ready bo'ldi`, "success");
    } catch (err) {
      onToast(err.message || "Bonuslarni payrollga tayyorlab bo'lmadi", "error");
    } finally {
      setApprovalSaving(false);
    }
  }

  async function handleRevokeMonth() {
    const ok = window.confirm(`${getMonthTitle(monthFilter)} oyidagi payroll ready holatini bekor qilaymi?`);
    if (!ok) return;

    try {
      setApprovalSaving(true);
      await api.create("bonus-items/revoke-month", { month_label: monthFilter });
      await reload();
      setApprovalRows([]);
      setApprovalOpen(false);
      onToast(`${getMonthTitle(monthFilter)} payroll holati bekor qilindi`, "success");
    } catch (err) {
      onToast(err.message || "Payroll holatini bekor qilib bo'lmadi", "error");
    } finally {
      setApprovalSaving(false);
    }
  }

  async function handleMonthlyClose() {
    const ok = window.confirm(`${getMonthTitle(monthFilter)} bonus oyini yopib, barcha yozuvlarni payrollga tayyorlaymizmi?`);
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
    const ok = window.confirm(`${getMonthTitle(monthFilter)} bonuslarini Paid holatiga o'tkazaymi?`);
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
      onToast("Avval oylik bonusni payroll ready qiling", "error");
      return;
    }

    const exported = downloadBonusApprovalImage({
      monthLabel: monthFilter,
      employeeRows: employeeStats,
      approvedByName: lastApprovalMeta?.approved_by_name || user?.full_name || "Platforma",
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
      if (isSmmManagerBonusMode && currentUserId && (String(form.editor_user_id) === currentUserId || String(form.face_voice_user_id) === currentUserId)) {
        onToast("SMM menejer o'zini bonus ijrochisi sifatida qo'sha olmaydi", "error");
        return;
      }
    } else {
      if (!form.user_id) {
        onToast("Hodimni tanlang", "error");
        return;
      }
      if (isSmmManagerBonusMode && currentUserId && String(form.user_id) === currentUserId) {
        onToast("SMM menejer o'zini bonus tizimiga qo'sha olmaydi", "error");
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
    <div className="page-grid bonus-v58-shell">
      <div className="bonus-v58-hero">
        <div className="bonus-v58-hero-copy">
          <span className="bonus-v58-eyebrow"><BadgeDollarSign size={16} /> v5.8 Bonus Control Center</span>
          <h2>Bonus tizimi</h2>
          <p>SMM menejer va mobilograf ishlarini alohida oqimda hisoblash, payrollga tayyorlash va to'lov holatini nazorat qilish.</p>
          {isSmmManagerBonusMode ? (
            <div className="bonus-v58-rule">
              <ShieldCheck size={16} /> SMM menejer o'zini bonus ijrochisi sifatida qo'sha olmaydi. O'zgarishlar boshqa xodimlar uchun yuritiladi.
            </div>
          ) : null}
        </div>
        <div className="bonus-v58-hero-panel">
          <span>{getMonthTitle(monthFilter)}</span>
          <strong>{formatMoney(totalAmount)}</strong>
          <small>{filteredItems.length} yozuv • {employeeBalanceStats.length} xodim • {paidRowsCount} paid</small>
        </div>
      </div>

      <div className="bonus-v58-role-grid">
        <div className="bonus-v58-role-card smm">
          <span>SMM menejer oqimi</span>
          <strong>Boshqa ijrochilar uchun bonus kiritadi</strong>
          <small>O'zini tanlash bloklangan. Admin/rahbariyat payroll va paid holatini tasdiqlaydi.</small>
        </div>
        <div className="bonus-v58-role-card mobile">
          <span>Mobilograf oqimi</span>
          <strong>Video, reels, filial materiallari</strong>
          <small>Mobilograf ishlari bonusga tushadi, yakuniy hisob admin tasdig'idan o'tadi.</small>
        </div>
      </div>

      <div className="card bonus-v58-card">
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
                  <button type="button" className="btn secondary" onClick={handleMarkPaid} disabled={markingPaid || !filteredItems.length || paidRowsCount === filteredItems.length}>
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

        <UiStatusStepper steps={payrollSteps} />

        <div className="stats-grid">
          <StatCard title="Taklif soni" value={totalProposalCount} hint="joriy oy" />
              <StatCard title="Payroll summa" value={formatMoney(totalApprovedAmount || totalAmount)} hint="joriy oy" />
          <StatCard title="Jami bonus" value={formatMoney(totalAmount)} hint={getMonthTitle(monthFilter)} />
          <StatCard title="Yozuvlar soni" value={filteredItems.length} hint="bonus hisobotlar" />
        </div>

        <div className="stats-grid bonus-close-grid">
          <StatCard title="Pending balans" value={formatMoney(pendingAmount)} hint="taxminiy hisob" tone="warning" />
          <StatCard title="Payroll ready" value={formatMoney(approvedReadyAmount || pendingAmount)} hint="oy yopilganda tayyor" tone="info" />
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
          <SectionTitle title="Leaderboard" desc="Bonus, kontent va payroll bo'yicha top hodimlar" />
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
          <SectionTitle title="Bonus audit log" desc="Payroll, close, export va o'zgarishlar" />
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
        {isSmmManagerBonusMode ? (
          <div className="bonus-v58-lock-note">
            <ShieldCheck size={16} /> SMM menejer rejimida o'zingizni hodim, montajchi yoki face/ovoz ijrochisi sifatida tanlash mumkin emas.
          </div>
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
                  {selectableBonusUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>

              <label>
                <span>Face + ovoz kimniki</span>
                <select value={form.face_voice_user_id} onChange={(e) => setField("face_voice_user_id", e.target.value)} disabled={bonusFormLocked}>
                  <option value="">Tanlang</option>
                  {selectableBonusUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </label>
            </>
          ) : (
            <label>
              <span>Hodim</span>
              <select value={form.user_id} onChange={(e) => setField("user_id", e.target.value)} disabled={bonusFormLocked}>
                <option value="">Tanlang</option>
                {selectableBonusUsers.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
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
          <label><span>Payroll birlik</span><input type="number" min="0" value={form.approved_count} onChange={(e) => setField("approved_count", e.target.value)} disabled={bonusFormLocked} /></label>
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
          right={(
            <div className="toolbar-actions">
              <span className="mini-badge info">MySeOne sync</span>
              <span className={`mini-badge ${monthClosed ? "success" : "warning"}`}>
                {monthClosed ? "Payroll yopilgan" : "Payroll ochiq"}
              </span>
            </div>
          )}
        />
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
                <th>Payroll</th>
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
                          {row.paid_status === "paid" ? "Paid" : row.approval_status === "approved" ? "Payroll ready" : "Pending"}
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
                      {row.paid_status === "paid" ? "Paid" : row.approval_status === "approved" ? "Payroll ready" : "Pending"}
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
                      <label>Payroll</label>
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
        title={`${getMonthTitle(monthFilter)} bonus payroll`}
        wide
      >
        <div className="bonus-approval-stack">
          <div className="info-banner">
            Payroll oynasi: faqat <strong>qabul qilingan birlik</strong> maydoni ochiq. Qolgan barcha ustunlar faqat ko'rish uchun.
          </div>
          <div className="bonus-approval-meta">
            {monthApproved
              ? "Bu oy payroll ready. Zarurat bo'lsa birliklarni yangilab qayta saqlashingiz mumkin."
              : "Payroll ready holatidan keyin eksport va to'lov tugmalari faollashadi."}
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
                  <th>Payroll birlik</th>
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
                  <tr><td colSpan="9" className="empty-cell">Payroll uchun yozuv topilmadi</td></tr>
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
                    <th>Payroll birlik</th>
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
                  Payrollni bekor qilish
                </button>
              ) : null}
              <button type="button" className="btn primary" onClick={handleApproveMonth} disabled={approvalSaving || !approvalRows.length}>
                {approvalSaving ? "Tayyorlanmoqda..." : "Payroll ready"}
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
              <StatCard title="Payroll" value={employeeDetail.approved_count} hint="qabul birlik" tone="info" />
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
                    <th>Payroll</th>
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
                          {row.paid_status === "paid" ? "Paid" : row.approval_status === "approved" ? "Payroll ready" : "Pending"}
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
              <div><strong>Payroll birlik:</strong> {viewRow.approved_count || 0}</div>
              <div><strong>Holat:</strong> {viewRow.paid_status === "paid" ? "Paid" : viewRow.approval_status === "approved" ? "Payroll ready" : "Pending"}</div>
              <div><strong>Jami:</strong> {formatMoney(viewRow.total_amount || viewRow.amount || 0)}</div>
              <div className="full-col">
                <strong>Qilingan ish linki:</strong>{" "}
                {viewRow.work_url ? (
                  <a href={normalizeExternalUrl(viewRow.work_url)} target="_blank" rel="noreferrer">
                    Havolani ochish
                  </a>
                ) : "-"}
              </div>
              <div className="full-col"><strong>Manba:</strong> MySeOne / ichki payroll</div>
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

  function resetBudgetForm() {
    setBudgetForm({ month_label: monthFilter || getMonthLabel(), category: "servis", limit_amount: "", notes: "" });
    setEditBudget(null);
  }

  function startEdit(row) {
    if (financeLocks.some((item) => item.month_label === formatDate(row.expense_date).slice(0, 7))) {
      onToast("Bu finance oyi yopilgan. Tahrirlash bloklangan.", "error");
      return;
    }
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
    if (financeLocks.some((item) => item.month_label === String(form.expense_date || "").slice(0, 7))) {
      onToast("Bu finance oyi yopilgan. Harajat qo'shib yoki tahrirlab bo'lmaydi.", "error");
      return;
    }
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
    campaign_type: "target",
    campaign_goal: "",
    target_audience: "",
    channel_name: "",
    expected_result: "",
    cpl_amount: "",
    roi_amount: "",
    status: "active"
  };

  const [form, setForm] = useState(emptyForm);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    const diff = getDateSortValue(a.start_at || a.start_date, Number.POSITIVE_INFINITY) - getDateSortValue(b.start_at || b.start_date, Number.POSITIVE_INFINITY);
    return diff !== 0 ? diff : Number(a.id || 0) - Number(b.id || 0);
  });

  const activeRows = sortedCampaigns.filter((row) => normalizeCampaignStatus(row.status) === "active");
  const pausedRows = sortedCampaigns.filter((row) => normalizeCampaignStatus(row.status) === "paused");
  const doneRows = sortedCampaigns.filter((row) => normalizeCampaignStatus(row.status) === "done");
  const totalDailyBudget = sortedCampaigns.reduce((sum, row) => sum + Number(getCampaignDailyBudget(row) || 0), 0);
  const totalLeads = sortedCampaigns.reduce((sum, row) => sum + Number(row.lead_count || row.leads || 0), 0);
  const withLeadForm = sortedCampaigns.filter((row) => row.lead_chat_id).length;
  const topPlatforms = Object.values(sortedCampaigns.reduce((acc, row) => {
    const key = row.platform || "Boshqa";
    if (!acc[key]) acc[key] = { platform: key, count: 0, budget: 0, leads: 0 };
    acc[key].count += 1;
    acc[key].budget += Number(getCampaignDailyBudget(row) || 0);
    acc[key].leads += Number(row.lead_count || row.leads || 0);
    return acc;
  }, {})).sort((a, b) => b.count - a.count).slice(0, 4);

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
      campaign_type: row.campaign_type || "target",
      campaign_goal: row.campaign_goal || "",
      target_audience: row.target_audience || "",
      channel_name: row.channel_name || row.platform || "",
      expected_result: row.expected_result || "",
      cpl_amount: String(row.cpl_amount || row.cpa || ""),
      roi_amount: String(row.roi_amount || row.roi || ""),
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
        campaign_type: form.campaign_type || "target",
        campaign_goal: form.campaign_goal || "",
        target_audience: form.target_audience || "",
        channel_name: form.channel_name || form.platform,
        expected_result: form.expected_result || "",
        cpl_amount: Number(form.cpl_amount || 0),
        roi_amount: Number(form.roi_amount || 0),
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
    <div className="page-grid campaigns-safe-page">
      <section className="campaign-safe-hero">
        <div>
          <span className="campaign-safe-eyebrow"><Target size={16} /> Target va natija markazi</span>
          <h2>Reklama kampaniyalari</h2>
          <p>Eski funksiyalar saqlangan: kampaniya qo‘shish, tahrirlash, lead forma, Telegram guruh ID va Excel export ishlaydi.</p>
        </div>
        <div className="campaign-safe-hero-actions">
          <button type="button" className="btn secondary" onClick={() => api.exportFile("/api/export/campaigns.xlsx", "campaigns.xlsx")}>Excel export</button>
          <button type="button" className="btn primary" onClick={() => window.scrollTo({ top: 280, behavior: "smooth" })}>+ Yangi kampaniya</button>
        </div>
      </section>

      <div className="campaign-safe-stats">
        <div className="campaign-safe-stat"><span>Jami kampaniya</span><strong>{sortedCampaigns.length}</strong><small>{activeRows.length} ta faol</small></div>
        <div className="campaign-safe-stat"><span>Faol target</span><strong>{activeRows.length}</strong><small>{pausedRows.length} ta pauzada</small></div>
        <div className="campaign-safe-stat"><span>Kunlik byudjet</span><strong>{formatMoney(totalDailyBudget)}</strong><small>barcha targetlar</small></div>
        <div className="campaign-safe-stat"><span>Lidlar</span><strong>{totalLeads}</strong><small>{withLeadForm} ta forma ulangan</small></div>
      </div>

      <CampaignPerformanceV8
        campaigns={sortedCampaigns}
        branches={branches}
        onView={setViewRow}
        onEdit={startEdit}
        onCopy={copyLeadFormLink}
      />

      <TargetAnalyticsProV12 campaigns={sortedCampaigns} branches={branches} onView={setViewRow} onEdit={startEdit} />

      <div className="campaign-safe-layout">
        <div className="card campaign-safe-card">
          <SectionTitle
            title={editRow ? "Kampaniyani tahrirlash" : "Yangi reklama kampaniyasi"}
            subtitle="Platforma, filial, muddat, kunlik byudjet va Telegram guruh ID kiriting."
            right={editRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null}
          />
          <form className="form-grid campaign-safe-form" onSubmit={handleSubmit}>
            <label><span>Kampaniya nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} placeholder="Masalan: Chinoz filiali 99 000" required /></label>
            <label>
              <span>Platforma</span>
              <select value={form.platform} onChange={(e) => setField("platform", e.target.value)} required>
                {CAMPAIGN_PLATFORM_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label>
              <span>Filial</span>
              <select value={form.branch_id} onChange={(e) => setField("branch_id", e.target.value)} required>
                <option value="">Tanlang</option>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
              </select>
            </label>
            <label>
              <span>Target holati</span>
              <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
                <option value="active">Faol</option>
                <option value="paused">Pauza</option>
                <option value="done">Tugagan</option>
              </select>
            </label>
            <label>
              <span>Kampaniya turi</span>
              <select value={form.campaign_type} onChange={(e) => setField("campaign_type", e.target.value)}>
                <option value="target">Target reklama</option>
                <option value="cashback">Cashback</option>
                <option value="contest">Konkurs</option>
                <option value="challenge">Challenge</option>
                <option value="seasonal">Mavsumiy aksiya</option>
                <option value="blogger">Bloger hamkorlik</option>
              </select>
            </label>
            <label><span>Kanal nomi</span><input value={form.channel_name} onChange={(e) => setField("channel_name", e.target.value)} placeholder="Instagram Ads, Telegram Ads, YouTube Ads..." /></label>
            <label><span>Boshlanish sana va soat</span><input type="datetime-local" value={form.start_at} onChange={(e) => setField("start_at", e.target.value)} required /></label>
            <label><span>Tugash sana va soat</span><input type="datetime-local" value={form.end_at} onChange={(e) => setField("end_at", e.target.value)} required /></label>
            <label><span>Kunlik byudjet</span><input type="number" min="0" value={form.daily_budget} onChange={(e) => setField("daily_budget", e.target.value)} placeholder="250000" required /></label>
            <label><span>CPL</span><input type="number" min="0" value={form.cpl_amount} onChange={(e) => setField("cpl_amount", e.target.value)} placeholder="45000" /></label>
            <label><span>ROI</span><input type="number" value={form.roi_amount} onChange={(e) => setField("roi_amount", e.target.value)} placeholder="120" /></label>
            <label className="campaign-safe-full"><span>Maqsad</span><textarea value={form.campaign_goal} onChange={(e) => setField("campaign_goal", e.target.value)} rows={2} placeholder="Masalan: Telegram kanalga 1000 ta sifatli lead olib kelish" /></label>
            <label className="campaign-safe-full"><span>Auditoriya</span><textarea value={form.target_audience} onChange={(e) => setField("target_audience", e.target.value)} rows={2} placeholder="Yosh, hudud, qiziqish, xarid ehtiyoji" /></label>
            <label className="campaign-safe-full"><span>Kutilgan natija</span><textarea value={form.expected_result} onChange={(e) => setField("expected_result", e.target.value)} rows={2} placeholder="Lead, savdo, reach, obuna yoki brand awareness natijasi" /></label>
            <label className="campaign-safe-full"><span>Lidlar boradigan Telegram guruh ID</span><input value={form.lead_chat_id} onChange={(e) => setField("lead_chat_id", e.target.value)} placeholder="-1003878116355" /></label>
            <div className="campaign-safe-submit-row">
              <button className="btn primary" type="submit" disabled={saving}>{saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Kampaniya qo‘shish"}</button>
              <button type="button" className="btn secondary" onClick={resetForm}>Formani tozalash</button>
            </div>
          </form>
        </div>

        <aside className="campaign-safe-side">
          <div className="campaign-safe-side-card">
            <h3>Platforma kesimi</h3>
            <p>Qaysi kanal ko‘proq ishlayotganini tez ko‘rish.</p>
            {topPlatforms.length ? topPlatforms.map((item) => (
              <div className="campaign-safe-platform" key={item.platform}>
                <div><strong>{item.platform}</strong><small>{item.count} kampaniya • {item.leads} lid</small></div>
                <span>{formatMoney(item.budget)}</span>
              </div>
            )) : <div className="empty-block">Hali kampaniya yo‘q</div>}
          </div>
          <div className="campaign-safe-side-card note">
            <h3>Telegram xabar</h3>
            <p>Lead forma to‘ldirilsa, guruhga emoji bilan tartibli xabar boradi: mijoz, telefon, filial, platforma va kampaniya nomi.</p>
          </div>
        </aside>
      </div>

      <div className="card campaign-safe-card">
        <SectionTitle title="Kampaniyalar ro‘yxati" subtitle={`${activeRows.length} faol • ${pausedRows.length} pauza • ${doneRows.length} tugagan`} />
        <div className="table-wrap desktop-table campaign-safe-table">
          <table>
            <thead><tr><th>Kampaniya</th><th>Platforma</th><th>Filial</th><th>Boshlanish</th><th>Tugash</th><th>Kunlik byudjet</th><th>Lid</th><th>Holat</th><th>Amallar</th></tr></thead>
            <tbody>
              {sortedCampaigns.length ? sortedCampaigns.map((row) => (
                <tr key={row.id}>
                  <td><strong>{row.title}</strong><small className="campaign-safe-table-sub">ID: {row.id}</small></td>
                  <td>{row.platform}</td>
                  <td>{row.branch_name || "-"}</td>
                  <td>{formatDateTime(row.start_at || row.start_date)}</td>
                  <td>{formatDateTime(row.end_at || row.end_date)}</td>
                  <td>{formatMoney(getCampaignDailyBudget(row))}</td>
                  <td>{row.lead_count || row.leads || 0}</td>
                  <td><span className={campaignStatusClass(row.status)}>{formatCampaignStatus(row.status)}</span></td>
                  <td><div className="table-actions">
                    <button type="button" className="btn tiny secondary" onClick={() => openLeadForm(row)}><Link2 size={14} /> Forma</button>
                    <button type="button" className="btn tiny secondary" onClick={() => copyLeadFormLink(row)}><Copy size={14} /> Link</button>
                    <IconActions onView={() => setViewRow(row)} onEdit={() => startEdit(row)} onDelete={() => removeRow(row.id)} />
                  </div></td>
                </tr>
              )) : <tr><td colSpan="9" className="empty-cell">Hozircha ma'lumot yo‘q</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {sortedCampaigns.length ? sortedCampaigns.map((row) => (
            <div key={`campaign-card-${row.id}`} className="mobile-record-card">
              <div className="mobile-record-head"><div className="mobile-record-title"><strong>{row.title}</strong><span>{row.platform} • {row.branch_name || "Filialsiz"}</span></div><span className={campaignStatusClass(row.status)}>{formatCampaignStatus(row.status)}</span></div>
              <div className="mobile-record-grid">
                <div className="mobile-record-field"><label>Boshlanish</label><div>{formatDateTime(row.start_at || row.start_date)}</div></div>
                <div className="mobile-record-field"><label>Tugash</label><div>{formatDateTime(row.end_at || row.end_date)}</div></div>
                <div className="mobile-record-field"><label>Kunlik byudjet</label><div>{formatMoney(getCampaignDailyBudget(row))}</div></div>
                <div className="mobile-record-field"><label>Leadlar</label><div>{row.lead_count || row.leads || 0} ta</div></div>
              </div>
              <div className="mobile-record-actions"><button type="button" className="btn tiny secondary" onClick={() => openLeadForm(row)}><Link2 size={14} /> Forma</button><button type="button" className="btn tiny secondary" onClick={() => copyLeadFormLink(row)}><Copy size={14} /> Nusxalash</button><IconActions onView={() => setViewRow(row)} onEdit={() => startEdit(row)} onDelete={() => removeRow(row.id)} /></div>
            </div>
          )) : <div className="mobile-record-card empty">Hozircha ma'lumot yo‘q</div>}
        </div>
      </div>

      <Modal open={!!viewRow} onClose={() => setViewRow(null)} title="Kampaniya tafsiloti">
        {viewRow ? (
          <div className="detail-grid">
            <div><strong>Nomi:</strong> {viewRow.title}</div><div><strong>Platforma:</strong> {viewRow.platform}</div><div><strong>Filial:</strong> {viewRow.branch_name || "-"}</div><div><strong>Boshlanish:</strong> {formatDateTime(viewRow.start_at || viewRow.start_date)}</div><div><strong>Tugash:</strong> {formatDateTime(viewRow.end_at || viewRow.end_date)}</div><div><strong>Kunlik byudjet:</strong> {formatMoney(getCampaignDailyBudget(viewRow))}</div><div><strong>Holat:</strong> <span className={campaignStatusClass(viewRow.status)}>{formatCampaignStatus(viewRow.status)}</span></div><div><strong>Leadlar soni:</strong> {viewRow.lead_count || 0} ta</div><div><strong>Lead chat ID:</strong> {viewRow.lead_chat_id || "-"}</div><div><strong>Turi:</strong> {viewRow.campaign_type || "-"}</div><div><strong>Kanal:</strong> {viewRow.channel_name || "-"}</div><div><strong>CPL:</strong> {formatMoney(viewRow.cpl_amount || viewRow.cpa)}</div><div><strong>ROI:</strong> {viewRow.roi_amount || viewRow.roi || 0}</div><div className="full-col"><strong>Maqsad:</strong> {viewRow.campaign_goal || "-"}</div><div className="full-col"><strong>Auditoriya:</strong> {viewRow.target_audience || "-"}</div><div className="full-col"><strong>Kutilgan natija:</strong> {viewRow.expected_result || "-"}</div>
            <div className="full-col campaign-lead-link-row"><strong>Website form URL:</strong><div className="campaign-lead-link-actions"><a href={getCampaignLeadFormUrl(viewRow.id)} target="_blank" rel="noreferrer" className="btn tiny secondary"><Eye size={14} /> Ochish</a><button type="button" className="btn tiny secondary" onClick={() => copyLeadFormLink(viewRow)}><Copy size={14} /> Nusxalash</button></div><div className="campaign-lead-link-preview">{getCampaignLeadFormUrl(viewRow.id)}</div></div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function PublicLandingPage({ settings }) {
  const logoSrc = LOGIN_LOGO;
  const companyLabel = normalizeAlooText(settings?.company_name || "aloo SMM");
  const heroImages = [
    "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=760&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=760&q=80",
    "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=760&q=80",
    "https://images.unsplash.com/photo-1556155092-490a1ba16284?auto=format&fit=crop&w=760&q=80"
  ];
  const solutionCards = [
    {
      title: "Kontent reja va studio",
      text: "Post, Reels, Story, deadline, fayl va izohlar bitta tartibli pipeline ichida boshqariladi.",
      metric: "40%"
    },
    {
      title: "Telegram orqali ish oqimi",
      text: "Login kodi, vazifa eslatmasi, kontent deadline va daily report xabarlari guruhga avtomatik boradi.",
      metric: "24/7"
    },
    {
      title: "Reklama va aksiyalar",
      text: "Instagram, Facebook, Telegram, YouTube, Google Ads, bloger va media hamkorliklar natijasi nazorat qilinadi.",
      metric: "1 joy"
    },
    {
      title: "Media arxiv",
      text: "Foto, video, dizayn, banner, Reels va Shorts materiallari tartibli saqlanadi va tez topiladi.",
      metric: "100%"
    },
    {
      title: "AI yordamchi",
      text: "Bugun nima muhim, kontent idea, caption, deadline signal va harajat oshishi haqida xulosa beradi.",
      metric: "AI"
    },
    {
      title: "Rol bo'yicha workspace",
      text: "Admin, manager, director, editor va mobilograf o'z ishiga mos sahifalarni ko'radi.",
      metric: "5 rol"
    }
  ];
  const testimonials = [
    ["Dilshod Karimov", "SMM agentlik rahbari", "Kontent, reklama, media va hisobotlar bir joyga tushgach jamoa ishini nazorat qilish ancha tezlashdi."],
    ["Malika Sodiqova", "Marketing manager", "Deadline va Telegram eslatmalari sabab kontent kechikishi kamaydi, jarayon ko'z oldimizda turadi."],
    ["Azizbek Tursunov", "Mobilograf", "Suratga olish, montaj, joylash va fayllar bitta joyda. Telefon orqali ham ishlash qulay."]
  ];

  return (
    <>
      <div className="public-site">
        <div className="public-contact-bar">
          <span>Bog'lanish menejer bilan:</span>
          <strong>+998 78 113 60 14</strong>
          <div className="public-top-actions">
            <button type="button" className="public-lang"><Globe2 size={16} /> UZ</button>
            <a className="public-login-link" href="/login">Kirish <ChevronRight size={16} /></a>
          </div>
        </div>

        <header className="public-nav">
          <a className="public-logo" href="/">
            <img src={logoSrc} alt={companyLabel} />
            <span>{companyLabel}</span>
          </a>
          <nav>
            <a href="#solutions">Yechimlar</a>
            <a href="#why">Nima uchun Aloo?</a>
            <a href="#pricing">Narxlar</a>
            <a href="#resources">Resurslar</a>
            <a href="#company">Kompaniya</a>
          </nav>
          <a className="public-demo-btn" href="/login">Demo olish</a>
        </header>

        <section className="public-hero">
          <div className="public-hero-media left-top">
            <img src={heroImages[0]} alt="SMM jamoasi kontent tayyorlamoqda" />
          </div>
          <div className="public-hero-center">
            <h1><span>Aloo SMM</span> jamoalari uchun superkuch</h1>
            <p>Kontent reja, ssenariy, reklama, blogerlar, media arxiv, Telegram xabarlari va AI signallar - barchasi bitta oddiy operatsion tizimda.</p>
            <div className="public-hero-actions">
              <a className="public-primary" href="/login">Sinab ko'rish</a>
              <a className="public-secondary" href="#solutions"><span /> Videoni tomosha qilish</a>
            </div>
          </div>
          <div className="public-hero-media right-top">
            <img src={heroImages[1]} alt="Marketing dashboard bilan ishlash" />
          </div>
          <div className="public-hero-media left-bottom">
            <img src={heroImages[2]} alt="Jamoa uchrashuvi" />
          </div>
          <div className="public-hero-preview">
            <div className="public-preview-window">
              <div className="public-preview-sidebar">
                <img src={logoSrc} alt="" />
                {["Dashboard", "Content Studio", "Reklama", "Media arxiv", "Telegram"].map((item, index) => (
                  <span key={item} className={index === 1 ? "active" : ""}>{item}</span>
                ))}
              </div>
              <div className="public-preview-main">
                <div className="public-preview-head">
                  <strong>Content Studio</strong>
                  <button type="button">Yangi post</button>
                </div>
                <div className="public-preview-stats">
                  <div><span>Postlar</span><strong>128</strong></div>
                  <div><span>Deadline risk</span><strong>6</strong></div>
                  <div><span>Faol aksiya</span><strong>7</strong></div>
                </div>
                <div className="public-preview-table">
                  {["Instagram reels", "Telegram post", "Story pack"].map((item, index) => (
                    <div key={item}>
                      <span>{item}</span>
                      <i>{index === 0 ? "Bugun" : index === 1 ? "Ertaga" : "Tayyor"}</i>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="public-hero-media right-bottom">
            <img src={heroImages[3]} alt="Analitika ekrani" />
          </div>
        </section>

        <section id="solutions" className="public-section">
          <div className="public-section-title">
            <h2>Barcha vazifalar uchun bitta yechim!</h2>
            <p>Agentlik va SMM jamoasining kundalik ishlarini bitta tizimga jamlaymiz.</p>
          </div>
          <div className="public-card-grid">
            {solutionCards.map((card, index) => (
              <article key={card.title} className="public-solution-card">
                <div className="public-card-count">{String(index + 1).padStart(2, "0")}</div>
                <h3>{card.title}</h3>
                <p>{card.text}</p>
                <div className="public-card-foot">
                  <a href="/login">Ko'proq ma'lumot olish</a>
                  <strong>{card.metric}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="why" className="public-showcase-section">
          <div>
            <span className="public-kicker">Nima uchun Aloo SMM?</span>
            <h2>Jarayonlar ko'rinadi, jamoa bir ritmda ishlaydi</h2>
            <p>Panel ochilganda rahbar ham, manager ham, editor ham o'ziga kerakli ishni ortiqcha shovqinsiz ko'radi.</p>
          </div>
          <div className="public-showcase-card">
            <div className="public-showcase-row"><span>Kontent ritmi</span><strong>82%</strong></div>
            <div className="public-showcase-row"><span>Harajat signali</span><strong>3 ta</strong></div>
            <div className="public-showcase-row"><span>Telegram xabarlar</span><strong>real-time</strong></div>
            <div className="public-showcase-progress"><i /></div>
          </div>
        </section>

        <section id="resources" className="public-testimonials">
          <div className="public-section-title">
            <h2>Mijozlar natijani tez ko'radi</h2>
          </div>
          <div className="public-testimonial-grid">
            {testimonials.map(([name, role, text]) => (
              <article key={name} className="public-testimonial">
                <p>{text}</p>
                <strong>{name}</strong>
                <span>{role}</span>
              </article>
            ))}
          </div>
        </section>

        <section id="pricing" className="public-cta">
          <h2>Hisob-kitoblaringiz va kontent jarayonlaringiz tarqoqmi?</h2>
          <p>Aloo SMM sozlash, o'rgatish va ish jarayonini tizimga ko'chirishda yordam beradi.</p>
          <a href="/login">Kirish</a>
        </section>

        <footer id="company" className="public-footer">
          <div>
            <a className="public-logo" href="/">
              <img src={logoSrc} alt={companyLabel} />
              <span>{companyLabel}</span>
            </a>
            <p>SMM va marketing jamoalari uchun operating system.</p>
          </div>
          <div>
            <strong>Yechimlar</strong>
            <a href="#solutions">Content Studio</a>
            <a href="#solutions">Reklama va aksiyalar</a>
            <a href="#solutions">Media arxiv</a>
          </div>
          <div>
            <strong>Kompaniya</strong>
            <a href="/login">Kirish</a>
            <a href="mailto:hello@aloosmm.uz">hello@aloosmm.uz</a>
            <a href="tel:+998781136014">+998 78 113 60 14</a>
          </div>
        </footer>
      </div>
      <style>{styles}</style>
    </>
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
                    <circle className="success-circle" cx="50" cy="50" r="40" fill="none" stroke="#1478F2" strokeWidth="6" strokeLinecap="round" />
                    <polyline className="success-check" points="35 50 45 60 65 40" fill="none" stroke="#1478F2" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
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
      <style>{styles}</style>
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
      <MediaLibraryProV13 uploads={uploads} onFolder={(folder) => setFolderFilter(folder)} onType={(type) => setTypeFilter(type)} />

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
      <RolePermissionMatrixV14 users={users} onPreset={(role) => handleRoleChange(role)} />

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
                  <option value="director">director</option>
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
                {viewMode === "table" ? "Kalendar" : viewMode === "calendar" ? "Workflow" : "Jadval"}
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

      <TaskKanbanProV10 tasks={tasks} users={users} user={user} onToast={onToast} reload={reload} />

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
  const [testingTelegram, setTestingTelegram] = useState(false);
  const shareUrl = settings?.public_share_token ? `${API_BASE}/api/share/report/${settings.public_share_token}` : "";

  useEffect(() => {
    setForm(settings || {});
  }, [settings]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const telegramConfigured = Boolean(form.telegram_bot_token && form.telegram_chat_id);
  const telegramMonitorItems = [
    {
      label: "Bot token",
      value: form.telegram_bot_token ? "Ulangan" : "Kerak",
      hint: form.telegram_bot_token ? "xabar yuborishga tayyor" : "token kiriting",
      tone: form.telegram_bot_token ? "success" : "danger"
    },
    {
      label: "SMM group",
      value: form.telegram_chat_id ? "Chat ID bor" : "Chat ID yo'q",
      hint: form.telegram_chat_id || "guruh ID kiritilmagan",
      tone: form.telegram_chat_id ? "success" : "warning"
    },
    {
      label: "Workflow",
      value: telegramConfigured ? "Real-time" : "Offline",
      hint: "login, deadline, kampaniya, media",
      tone: telegramConfigured ? "info" : "default"
    }
  ];
  const telegramOps = [
    { title: "Login kod", text: "Telefon raqam orqali bir martalik kod yuboriladi", meta: telegramConfigured ? "ready" : "setup", tone: telegramConfigured ? "success" : "warning" },
    { title: "Deadline signal", text: "Kontent deadline yaqinlashganda guruhga xabar ketadi", meta: "auto", tone: "info" },
    { title: "Kampaniya signal", text: "Reklama yoki aksiya natijasi bo'yicha muhim signal chiqadi", meta: "campaign", tone: "success" },
    { title: "Media monitoring", text: "Yangi fayl, montaj yoki publish holati jamoaga ko'rinadi", meta: "monitor", tone: "warning" }
  ];

  async function testTelegramConnection() {
    try {
      setTestingTelegram(true);
      const data = await api.create("settings/test-telegram", {});
      onToast(data?.message || "Telegram test yuborildi", "success");
    } catch (err) {
      onToast(err.message || "Telegram test yuborilmadi", "error");
    } finally {
      setTestingTelegram(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <SectionTitle title="Sozlamalar" right={<ThemeToggle theme={theme} setTheme={setTheme} />} />
        <div className="form-grid">
          <label><span>Kompaniya nomi</span><input value={form.company_name || ""} onChange={(e) => setField("company_name", e.target.value)} /></label>
          <label><span>Platforma nomi</span><input value={form.platform_name || ""} onChange={(e) => setField("platform_name", e.target.value)} /></label>
          <label><span>Bo'lim</span><input value={form.department_name || ""} onChange={(e) => setField("department_name", e.target.value)} /></label>
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
              <span>{form.platform_name || "SMM jamoasi platformasi"} - kontent, reklama va media nazorati</span>
            </div>
          </div>
        </div>

        <div className="settings-ops-card">
          <SectionTitle
            title="Telegram production monitoring"
            desc="Bot xabarlari, login kod va workflow signal holati"
            right={(
              <button className="btn secondary" type="button" onClick={testTelegramConnection} disabled={testingTelegram || !telegramConfigured}>
                {testingTelegram ? "Tekshirilmoqda..." : "Telegram test"}
              </button>
            )}
          />
          <UiHealthStrip items={telegramMonitorItems} />
          <UiOpsTimeline items={telegramOps} />
        </div>

        <TelegramBotProV11 settings={form} onToast={onToast} />
        <MobilePwaProV15 settings={form} />

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
          <button className="btn secondary" onClick={testTelegramConnection} disabled={testingTelegram || !telegramConfigured}>
            {testingTelegram ? "Tekshirilmoqda..." : "Telegram test"}
          </button>
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

function FiscalReceipt({ row, settings }) {
  if (!row) return null;
  const receiptNo = String(row.id || Date.now()).padStart(10, "0");
  const createdAt = formatDateTime(row.created_at || new Date());
  const amount = Number(row.amount || 0);

  return (
    <div className="fiscal-receipt">
      <div className="receipt-brand">
        <img src={LOGIN_LOGO} alt="aloo SMM" />
        <div>
          <strong>{settings?.company_name || "aloo SMM"}</strong>
          <span>{settings?.platform_name || "SMM boshqaruv platformasi"}</span>
        </div>
      </div>
      <div className="receipt-center">
        <strong>Fiskal chek</strong>
        <span>Harajat / xizmat to'lovi</span>
      </div>
      <div className="receipt-meta">
        <span>Chek raqami: {receiptNo}</span>
        <span>Sana: {createdAt}</span>
        <span>To'lov turi: {paymentTypeLabel(row.payment_type)}</span>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-table">
        <div className="receipt-table-head">
          <span>Nomi</span>
          <span>Soni</span>
          <span>Narxi</span>
        </div>
        <div className="receipt-table-row">
          <span>{row.title || "Harajat"}</span>
          <span>1</span>
          <span>{amount.toLocaleString("uz-UZ")} {row.currency || "UZS"}</span>
        </div>
        <div className="receipt-small-line">
          <span>Xizmat</span>
          <strong>{row.vendor_name || "Aloo SMM xizmat xarajati"}</strong>
        </div>
        <div className="receipt-small-line">
          <span>Kategoriya</span>
          <strong>{expenseCategoryLabel(row.category)}</strong>
        </div>
        <div className="receipt-small-line">
          <span>Karta egasi</span>
          <strong>{row.card_holder || "-"}</strong>
        </div>
      </div>
      <div className="receipt-divider" />
      <div className="receipt-total-line">
        <span>Jami to'lov:</span>
        <strong>{amount.toLocaleString("uz-UZ")} {row.currency || "UZS"}</strong>
      </div>
      <div className="receipt-tax-line">
        <span>Umumiy QQS qiymati</span>
        <strong>0.00</strong>
      </div>
      <div className="receipt-qr" aria-label="QR kod">
        {Array.from({ length: 49 }).map((_, index) => (
          <i key={index} className={(index * 7 + receiptNo.length) % 3 === 0 ? "on" : ""} />
        ))}
      </div>
      <div className="receipt-footer">aloo SMM harajat cheki</div>
    </div>
  );
}

function ExpensesPage({ expenses = [], contestExpenses = [], campaigns = [], bonusItems = [], travelPlans = [], budgets = [], financeLocks = [], settings = {}, user = null, onToast, reload }) {
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
  const [receiptRow, setReceiptRow] = useState(null);
  const [monthFilter, setMonthFilter] = useState(getMonthLabel());
  const [mode, setMode] = useState("general");
  const [budgetForm, setBudgetForm] = useState({ month_label: getMonthLabel(), category: "servis", limit_amount: "", notes: "" });
  const [editBudget, setEditBudget] = useState(null);
  const [closingFinance, setClosingFinance] = useState(false);
  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setBudgetField = (key, value) => setBudgetForm((prev) => ({ ...prev, [key]: value }));
  const readOnly = user?.role === "viewer";

  useEffect(() => {
    if (!editBudget) {
      setBudgetForm((prev) => ({ ...prev, month_label: monthFilter || getMonthLabel() }));
    }
  }, [editBudget, monthFilter]);

  function resetForm() {
    setForm(emptyForm);
    setEditRow(null);
  }

  function startEdit(row) {
    if (readOnly) {
      onToast("Viewer rejimida tahrirlash yopiq", "error");
      return;
    }
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
    if (readOnly) {
      onToast("Viewer rejimida harajat saqlash yopiq", "error");
      return;
    }
    try {
      setSaving(true);
      const payload = { ...form, amount: Number(form.amount || 0) };
      if (editRow?.id) {
        await api.update("expenses", editRow.id, payload);
        onToast("Harajat yangilandi", "success");
      } else {
        const created = await api.create("expenses", payload);
        setReceiptRow(created || payload);
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
    if (readOnly) {
      onToast("Viewer rejimida o'chirish yopiq", "error");
      return;
    }
    if (!window.confirm("Rostdan ham o'chirilsinmi?")) return;
    try {
      const target = expenses.find((item) => Number(item.id) === Number(id));
      if (target && financeLocks.some((item) => item.month_label === formatDate(target.expense_date).slice(0, 7))) {
        onToast("Bu finance oyi yopilgan. O'chirish bloklangan.", "error");
        return;
      }
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
  const monthlyAds = campaigns
    .filter((item) => formatDate(item.start_at || item.start_date).startsWith(monthFilter) || formatDate(item.end_at || item.end_date).startsWith(monthFilter))
    .reduce((sum, item) => sum + Number(item.spend || 0), 0);
  const monthlyBonus = bonusItems
    .filter((item) => (item.month_label || formatDate(item.work_date).slice(0, 7)) === monthFilter)
    .reduce((sum, item) => sum + Number(item.total_amount || item.amount || 0), 0);
  const monthlyTravel = travelPlans
    .filter((item) => formatDate(item.plan_date).startsWith(monthFilter))
    .reduce((sum, item) => sum + Number(item.budget_amount || 0), 0);
  const activeBudgets = budgets.filter((item) => item.month_label === monthFilter);
  const monthClosed = financeLocks.some((item) => item.month_label === monthFilter);
  const budgetTotal = activeBudgets.reduce((sum, item) => sum + Number(item.limit_amount || 0), 0);
  const financeTotal = totalAmount + monthlyBonus + monthlyTravel;
  const cashflowDelta = budgetTotal ? budgetTotal - financeTotal : -financeTotal;
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
  const overBudgetCount = activeBudgets.filter((budget) => {
    const actual = categoryTotals.find((item) => item.key === budget.category)?.amount || 0;
    return Number(budget.limit_amount || 0) > 0 && actual > Number(budget.limit_amount || 0);
  }).length;
  const financeHealthItems = [
    {
      label: "Budget control",
      value: overBudgetCount ? `${overBudgetCount} limit oshdi` : "Barqaror",
      hint: budgetTotal ? formatMoney(budgetTotal) : "limit kiritilmagan",
      tone: overBudgetCount ? "danger" : "success"
    },
    {
      label: "Month lock",
      value: monthClosed ? "Yopilgan" : "Ochiq",
      hint: getMonthTitle(monthFilter),
      tone: monthClosed ? "warning" : "info"
    },
    {
      label: "Fiscal receipt",
      value: `${filteredExpenses.length} chek`,
      hint: "har bir harajat uchun",
      tone: filteredExpenses.length ? "success" : "default"
    },
    {
      label: "Cashflow",
      value: cashflowDelta >= 0 ? "Limit ichida" : "Risk",
      hint: formatMoney(cashflowDelta),
      tone: cashflowDelta >= 0 ? "success" : "danger"
    }
  ];

  function resetBudgetForm() {
    setBudgetForm({ month_label: monthFilter || getMonthLabel(), category: "servis", limit_amount: "", notes: "" });
    setEditBudget(null);
  }

  async function handleBudgetSubmit(e) {
    e.preventDefault();
    if (readOnly) {
      onToast("Viewer rejimida budget o'zgartirish yopiq", "error");
      return;
    }
    try {
      const payload = {
        ...budgetForm,
        month_label: budgetForm.month_label || monthFilter,
        limit_amount: Number(budgetForm.limit_amount || 0)
      };
      if (editBudget?.id) {
        await api.update("budgets", editBudget.id, payload);
        onToast("Budget limit yangilandi", "success");
      } else {
        await api.create("budgets", payload);
        onToast("Budget limit saqlandi", "success");
      }
      await reload();
      resetBudgetForm();
    } catch (err) {
      onToast(err.message || "Budget limit saqlanmadi", "error");
    }
  }

  function startBudgetEdit(row) {
    if (readOnly) {
      onToast("Viewer rejimida budget tahrirlash yopiq", "error");
      return;
    }
    setEditBudget(row);
    setBudgetForm({
      month_label: row.month_label || monthFilter,
      category: row.category || "servis",
      limit_amount: row.limit_amount || "",
      notes: row.notes || ""
    });
  }

  async function removeBudget(id) {
    if (readOnly) {
      onToast("Viewer rejimida budget o'chirish yopiq", "error");
      return;
    }
    if (!window.confirm("Budget limit o'chirilsinmi?")) return;
    try {
      await api.remove("budgets", id);
      await reload();
      onToast("Budget limit o'chirildi", "success", { deleteCenter: true });
    } catch (err) {
      onToast(err.message || "Budget limit o'chmadi", "error");
    }
  }

  async function closeFinanceMonth() {
    if (readOnly) {
      onToast("Viewer rejimida oy yopish yopiq", "error");
      return;
    }
    const ok = window.confirm(`${getMonthTitle(monthFilter)} finance oyini yopamizmi? Bu oydagi harajatlar tahriri bloklanadi.`);
    if (!ok) return;
    try {
      setClosingFinance(true);
      await api.create("finance/monthly-close", { month_label: monthFilter });
      await reload();
      onToast(`${getMonthTitle(monthFilter)} finance oyi yopildi`, "success");
    } catch (err) {
      onToast(err.message || "Finance oyini yopib bo'lmadi", "error");
    } finally {
      setClosingFinance(false);
    }
  }

  return (
    <div className="page-grid finance-center-page">
      <div className="card">
        <SectionTitle
          title="Harajatlar va finance markazi"
          desc="Oddiy harajat, konkurs, budjet va finance snapshot bitta sahifada"
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
      <div className="finance-command-card">
        <div>
          <span className="small-label">Finance 9.0</span>
          <h2>{getMonthTitle(monthFilter)} xarajat nazorati</h2>
          <p>Harajat qo'shilganda avtomatik Aloo SMM fiskal chek chiqadi. Reklama, bonus, safar, budget lock va limit signallari shu yerda jamlanadi.</p>
        </div>
        <div className="finance-command-grid">
          <div><span>Oddiy harajat</span><strong>{formatMoney(totalAmount)}</strong></div>
          <div><span>Reklama sarfi</span><strong>{formatUsd(monthlyAds)}</strong></div>
          <div><span>Bonus payroll</span><strong>{formatMoney(monthlyBonus)}</strong></div>
          <div><span>Safar budjeti</span><strong>{formatMoney(monthlyTravel)}</strong></div>
          <div><span>Cashflow delta</span><strong>{formatMoney(cashflowDelta)}</strong></div>
        </div>
      </div>

      <UiHealthStrip items={financeHealthItems} />

      {monthClosed ? (
        <div className="info-banner finance-lock-banner">
          {getMonthTitle(monthFilter)} finance oyi yopilgan. Bu oy uchun harajat qo'shish, tahrirlash va o'chirish bloklangan.
        </div>
      ) : null}

      <div className="card">
        <SectionTitle title={editRow ? "Harajatni tahrirlash" : "Harajat qo'shish"} right={editRow ? <button type="button" className="btn secondary" onClick={resetForm}>Bekor qilish</button> : null} />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label><span>Sana</span><input type="date" value={form.expense_date} onChange={(e) => setField("expense_date", e.target.value)} required disabled={monthClosed} /></label>
          <label><span>Nomi</span><input value={form.title} onChange={(e) => setField("title", e.target.value)} required disabled={monthClosed} /></label>
          <label><span>Xizmat yoki ilova</span><input value={form.vendor_name} onChange={(e) => setField("vendor_name", e.target.value)} placeholder="Canva, Meta, CapCut..." disabled={monthClosed} /></label>
          <label><span>Karta egasi</span><input value={form.card_holder} onChange={(e) => setField("card_holder", e.target.value)} placeholder="Visa karta egasi" disabled={monthClosed} /></label>
          <label><span>Summa</span><input type="number" min="0" value={form.amount} onChange={(e) => setField("amount", e.target.value)} required disabled={monthClosed} /></label>
          <label><span>Valyuta</span><select value={form.currency} onChange={(e) => setField("currency", e.target.value)} disabled={monthClosed}><option value="UZS">UZS</option><option value="USD">USD</option></select></label>
          <label><span>Kategoriya</span><select value={form.category} onChange={(e) => setField("category", e.target.value)} disabled={monthClosed}><option value="servis">Servis</option><option value="reklama">Reklama</option><option value="safar">Safar</option><option value="boshqa">Boshqa</option></select></label>
          <label><span>To'lov turi</span><select value={form.payment_type} onChange={(e) => setField("payment_type", e.target.value)} disabled={monthClosed}><option value="visa">Visa karta</option><option value="cash">Naqd</option><option value="bank">Bank</option></select></label>
          <label className="full-col"><span>Izoh</span><input value={form.notes} onChange={(e) => setField("notes", e.target.value)} disabled={monthClosed} /></label>
          <button className="btn primary" type="submit" disabled={saving || monthClosed || readOnly}>{saving ? "Saqlanmoqda..." : editRow ? "Yangilash" : "Saqlash"}</button>
        </form>
      </div>

      <div className="stats-grid">
        <StatCard title="Jami harajat" value={formatMoney(totalAmount)} hint={getMonthTitle(monthFilter)} tone="danger" />
        <StatCard title="Budjet limiti" value={formatMoney(budgetTotal)} hint={`${activeBudgets.length} kategoriya`} tone="info" />
        <StatCard title="Yozuvlar soni" value={filteredExpenses.length} hint="filtrlangan yozuvlar" tone="success" />
        <StatCard title="Cashflow delta" value={formatMoney(cashflowDelta)} hint={budgetTotal ? "limitdan qoldiq" : "limit kiritilmagan"} tone={cashflowDelta >= 0 ? "success" : "danger"} />
      </div>

      <div className="card">
        <SectionTitle
          title="Oy bo'yicha harajatlar"
          desc="Kategoriya kesimida tezkor ko'rinish"
          right={
            <div className="toolbar-actions">
              <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                {monthOptions.map((item) => <option key={item} value={item}>{getMonthTitle(item)}</option>)}
              </select>
              <button type="button" className="btn secondary" onClick={() => api.exportFile(`/api/export/expenses.xlsx?month=${monthFilter}`, `expenses-${monthFilter}.xlsx`)}>
                Excel export
              </button>
              <button type="button" className="btn secondary" onClick={() => api.exportFile(`/api/export/expenses.pdf?month=${monthFilter}`, `expenses-${monthFilter}.pdf`)}>
                PDF export
              </button>
              <button type="button" className="btn secondary" onClick={closeFinanceMonth} disabled={closingFinance || monthClosed || readOnly}>
                {closingFinance ? "Yopilmoqda..." : monthClosed ? "Oy yopilgan" : "Oy yopish"}
              </button>
            </div>
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
        <SectionTitle
          title="Budget limit markazi"
          desc="Kategoriya limitlari, real sarf va overrun signallari"
          right={editBudget ? <button type="button" className="btn secondary" onClick={resetBudgetForm}>Bekor qilish</button> : null}
        />
        <form className="form-grid finance-budget-form" onSubmit={handleBudgetSubmit}>
          <label><span>Oy</span><input type="month" value={budgetForm.month_label} onChange={(e) => setBudgetField("month_label", e.target.value)} required /></label>
          <label><span>Kategoriya</span><select value={budgetForm.category} onChange={(e) => setBudgetField("category", e.target.value)}><option value="servis">Servis</option><option value="reklama">Reklama</option><option value="safar">Safar</option><option value="boshqa">Boshqa</option></select></label>
          <label><span>Limit</span><input type="number" min="0" value={budgetForm.limit_amount} onChange={(e) => setBudgetField("limit_amount", e.target.value)} required /></label>
          <label><span>Izoh</span><input value={budgetForm.notes} onChange={(e) => setBudgetField("notes", e.target.value)} /></label>
          <button type="submit" className="btn primary" disabled={readOnly}>{editBudget ? "Limitni yangilash" : "Limit qo'shish"}</button>
        </form>
        <div className="finance-budget-grid">
          {activeBudgets.length ? activeBudgets.map((budget) => {
            const actual = categoryTotals.find((item) => item.key === budget.category)?.amount || 0;
            const limit = Number(budget.limit_amount || 0);
            const percent = limit ? Math.min(140, (actual / limit) * 100) : 0;
            const over = limit && actual > limit;
            return (
              <div key={budget.id} className={`finance-budget-card ${over ? "danger" : "success"}`}>
                <div>
                  <span>{expenseCategoryLabel(budget.category)}</span>
                  <strong>{formatMoney(limit)}</strong>
                  <small>Sarf: {formatMoney(actual)}</small>
                </div>
                <div className="finance-budget-track"><i style={{ width: `${Math.max(percent, actual ? 8 : 0)}%` }} /></div>
                <div className="toolbar-actions">
                  <button type="button" className="btn secondary" onClick={() => startBudgetEdit(budget)}>Edit</button>
                  <button type="button" className="btn ghost danger" onClick={() => removeBudget(budget.id)}>Delete</button>
                </div>
              </div>
            );
          }) : <div className="empty-block">Bu oy uchun budget limit yo'q</div>}
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
      <Modal open={!!receiptRow} onClose={() => setReceiptRow(null)} title="Aloo SMM fiskal chek">
        <FiscalReceipt row={receiptRow} settings={settings} />
        <div className="toolbar-actions mt16">
          <button type="button" className="btn primary" onClick={() => window.print()}>Chop etish</button>
          <button type="button" className="btn secondary" onClick={() => setReceiptRow(null)}>Yopish</button>
        </div>
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
          <label className="full-col"><span>Workflow izohi</span><textarea value={form.approval_comment} onChange={(e) => setField("approval_comment", e.target.value)} rows={2} /></label>
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
            <div className="full-col"><strong>Workflow izohi:</strong> {viewRow.approval_comment || "-"}</div>
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
                <Line type="monotone" dataKey="total" stroke="#1478F2" strokeWidth={3} dot={{ r: 4 }} />
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
                  {spendSeries.map((_, index) => <Cell key={`cell-${index}`} fill={index % 2 ? "#EAF3FF" : "#1478F2"} />)}
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

function App() {
  const [booting, setBooting] = useState(true);
  const [bootScreenVisible, setBootScreenVisible] = useState(true);
  const [user, setUser] = useState(getCurrentUser());
  const [active, setActive] = useState(() => getPageFromPath(typeof window !== "undefined" ? window.location.pathname : "/"));
  const [theme, setTheme] = useState("light");
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState("");
  const [menuGroupState, setMenuGroupState] = useState(() => {
    const groupIds = [
      ...MENU_GROUPS.map((group) => group.id),
      ...SIDEBAR_WORKSPACES.flatMap((workspace) => workspace.groups.map((group) => group.id))
    ];
    return Object.fromEntries(groupIds.map((id) => [id, true]));
  });
  const [sidebarWorkspace, setSidebarWorkspace] = useState(() => getDefaultWorkspaceForUser(getCurrentUser()));
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
  const [managerOSData, setManagerOSData] = useState({});
  const [tasks, setTasks] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [financeLocks, setFinanceLocks] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [topPerformers, setTopPerformers] = useState(null);
  const [executiveSummary, setExecutiveSummary] = useState(null);
  const [employeeKpi, setEmployeeKpi] = useState([]);
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
      "managerLab",
      "bonus",
      "travelPlans",
      "dailyReports",
      "campaigns",
      "uploads",
      "users",
      "tasks"
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
    const queryScope = scopedDataQuery(user);
    switch (pageId) {
      case "dashboard": {
        const [contentRes, dailyReportsRes, campaignsRes, travelPlansRes, tasksRes, uploadsRes, managerOsRes] = await Promise.all([
          api.list("content").catch(() => []),
          api.list("daily-reports").catch(() => []),
          api.list("campaigns").catch(() => []),
          api.list("travel-plans", queryScope).catch(() => []),
          api.list("tasks").catch(() => []),
          api.list("uploads").catch(() => []),
          api.list("/api/manager-os").catch(() => ({}))
        ]);
        setContentRows(contentRes || []);
        setDailyReports(dailyReportsRes || []);
        setCampaigns(campaignsRes || []);
        setTravelPlans(travelPlansRes || []);
        setTasks(tasksRes || []);
        setUploads(uploadsRes || []);
        setManagerOSData(managerOsRes || {});
        break;
      }
      case "content": {
        const [contentRes, campaignsRes, managerOsRes] = await Promise.all([
          api.list("content").catch(() => []),
          api.list("campaigns").catch(() => []),
          api.list("/api/manager-os").catch(() => ({}))
        ]);
        setContentRows(contentRes || []);
        setCampaigns(campaignsRes || []);
        setManagerOSData(managerOsRes || {});
        break;
      }
      case "bonus":
        setBonusItems(await api.list("bonus-items", queryScope).catch(() => []));
        break;
      case "expenses": {
        const [expensesRes, contestExpensesRes, campaignsRes, bonusItemsRes, travelPlansRes, budgetsRes, financeLocksRes] = await Promise.all([
          api.list("expenses").catch(() => []),
          api.list("contest-expenses").catch(() => []),
          api.list("campaigns").catch(() => []),
          api.list("bonus-items").catch(() => []),
          api.list("travel-plans").catch(() => []),
          api.list("budgets").catch(() => []),
          api.list("/api/finance/month-locks").catch(() => [])
        ]);
        setExpenses(expensesRes || []);
        setContestExpenses(contestExpensesRes || []);
        setCampaigns(campaignsRes || []);
        setBonusItems(bonusItemsRes || []);
        setTravelPlans(travelPlansRes || []);
        setBudgets(budgetsRes || []);
        setFinanceLocks(financeLocksRes || []);
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
          api.list("travel-plans", queryScope).catch(() => []),
          api.list("travel-expenses", queryScope).catch(() => [])
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
  }, [user]);

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
    const scopeItems = getDefaultWorkspaceForUser(user) === "mobilograf"
      ? SIDEBAR_WORKSPACES.find((workspace) => workspace.id === "mobilograf")?.items || []
      : SIDEBAR_WORKSPACES.find((workspace) => workspace.id === "smm")?.items || [];
    const scopedMenu = MENU.filter((item) => scopeItems.includes(item.id));
    if (user?.role === "admin") return scopedMenu;
    const permissions = [...new Set([...safePermissions(user?.permissions_json), ...rolePresetPermissions(user)])];
    const rolePreset = ROLE_WORKSPACE_PRESETS[user?.role] || null;
    if (!permissions.length) {
      return scopedMenu.filter((item) => (rolePreset || ["dashboard", "profile"]).includes(item.id));
    }
    if (rolePreset) {
      return scopedMenu.filter((item) => permissions.includes(item.id) && rolePreset.includes(item.id));
    }
    return scopedMenu.filter((item) => permissions.includes(item.id));
  }, [user]);

  useEffect(() => {
    if (active === "campaignLeadForm") return;
    if (!user?.id) return;
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

  useEffect(() => {
    setSidebarWorkspace((current) => current || getDefaultWorkspaceForUser(user));
  }, [user]);

  const activeSidebarWorkspace = useMemo(() => getWorkspaceById(sidebarWorkspace), [sidebarWorkspace]);

  const workspaceMenu = useMemo(() => {
    const allowedIds = new Set(activeSidebarWorkspace.items);
    return allowedMenu.filter((item) => allowedIds.has(item.id));
  }, [activeSidebarWorkspace, allowedMenu]);

  const filteredMenu = useMemo(() => {
    const sourceMenu = workspaceMenu.length ? workspaceMenu : allowedMenu;
    if (!search.trim()) return sourceMenu;
    return sourceMenu.filter((item) =>
      `${item.title} ${item.desc || ""}`.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, workspaceMenu, allowedMenu]);

  const groupedMenu = useMemo(() => {
    const sourceGroups = activeSidebarWorkspace.groups || MENU_GROUPS;
    return sourceGroups.map((group) => {
      const items = group.items
        .map((id) => filteredMenu.find((item) => item.id === id))
        .filter(Boolean);
      return { ...group, items };
    }).filter((group) => group.items.length);
  }, [filteredMenu, activeSidebarWorkspace]);

  const mobilePrimaryMenu = useMemo(() => {
    const rolePreferred = {
      director: ["dashboard", "managerLab", "analytics", "campaigns", "profile"],
      manager: ["dashboard", "managerLab", "content", "travelPlans", "campaigns", "profile"],
      editor: ["dashboard", "tasks", "uploads", "content", "profile"],
      mobilograf: ["content", "profile"],
      viewer: ["dashboard", "content", "analytics", "profile"]
    };
    const preferred = rolePreferred[user?.role] || ["dashboard", "managerLab", "content", "travelPlans", "campaigns", "profile"];
    const pinned = preferred
      .map((id) => allowedMenu.find((item) => item.id === id))
      .filter(Boolean);
    const extras = allowedMenu.filter((item) => !pinned.some((entry) => entry.id === item.id));
    return [...pinned, ...extras].slice(0, 4);
  }, [allowedMenu, user?.role]);
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

  function switchSidebarWorkspace(workspaceId) {
    const workspace = getWorkspaceById(workspaceId);
    setSidebarWorkspace(workspace.id);
    const allowedIds = new Set(allowedMenu.map((item) => item.id));
    if (!workspace.items.includes(active) || !allowedIds.has(active)) {
      const nextPage = workspace.items.find((id) => allowedIds.has(id)) || allowedMenu[0]?.id || "dashboard";
      goToPage(nextPage);
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
              <h2>Platforma yuklanmoqda</h2>
              <p>Asosiy ma'lumotlar tayyorlanyapti, ilova darrov ochiladi.</p>
            </div>
          </div>
        </div>
        <style>{styles}</style>
      </>
    );
  }

  if (!user) {
    if (active === "campaignLeadForm") {
      return <CampaignLeadPublicPage settings={settings} />;
    }
    if (active === "landing") {
      return <PublicLandingPage settings={settings} />;
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
        <style>{styles}</style>
      </>
    );
  }

  if (active === "campaignLeadForm") {
    return <CampaignLeadPublicPage settings={settings} />;
  }

  let page = null;

  if (active === "dashboard") {
    page = (
      <ManagerOSDashboard
        summary={summary}
        dailyReports={dailyReports}
        contentRows={contentRows}
        campaigns={campaigns}
        travelPlans={travelPlans}
        tasks={tasks}
        uploads={uploads}
        managerOSData={managerOSData}
        user={user}
        onNavigate={goToPage}
      />
    );
  } else if (active === "managerLab") {
    page = <ManagerOsLabPage onToast={showToast} />;
  } else if (active === "content") {
    page = <ContentPage users={users} branches={branches} campaigns={campaigns} managerOSData={managerOSData} settings={settings} user={user} onToast={showToast} reload={reloadData} />;
  } else if (active === "bonus") {
    page = <BonusPage bonusItems={bonusItems} users={users} branches={branches} settings={settings} user={user} onToast={showToast} reload={reloadData} />;
  } else if (active === "expenses") {
    page = <ExpensesPage expenses={expenses} contestExpenses={contestExpenses} campaigns={campaigns} bonusItems={bonusItems} travelPlans={travelPlans} budgets={budgets} financeLocks={financeLocks} settings={settings} user={user} onToast={showToast} reload={reloadData} />;
  } else if (active === "finance") {
    page = <FinanceDashboardPage expenses={expenses} campaigns={campaigns} bonusItems={bonusItems} travelPlans={travelPlans} budgets={budgets} onToast={showToast} reload={reloadData} />;
  } else if (active === "travelPlans") {
    page = <TravelPlansPage travelPlans={travelPlans} travelExpenses={travelExpenses} branches={branches} onToast={showToast} reload={reloadData} />;
  } else if (active === "analytics") {
    page = <AnalyticsPage analyticsData={{ ...(analyticsData || {}), employee_kpi: employeeKpi, executive_summary: executiveSummary?.text }} />;
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
  }

  return (
    <>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-block">
            <div className="brand-mark">
              <img src={LOGIN_LOGO} alt="logo" className="brand-mark-image" />
            </div>
            <div className="brand-copy">
              <div className="brand-name">alooSMM OS</div>
              <div className="brand-desc">SMM menejer boshqaruvi</div>
            </div>
          </div>

          <div className="sidebar-workspace-card">
            <div>
              <span>Workspace</span>
              <strong>Manager Command</strong>
            </div>
            <small><i /> Live</small>
          </div>

          <div className="sidebar-role-switcher" aria-label="Menu yo'nalishi">
            {SIDEBAR_WORKSPACES.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className={`sidebar-role-pill ${sidebarWorkspace === workspace.id ? "active" : ""}`}
                onClick={() => switchSidebarWorkspace(workspace.id)}
              >
                <strong>{workspace.title}</strong>
                <span>{workspace.desc}</span>
              </button>
            ))}
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
                            <span className="menu-text">
                              <span>{item.title}</span>
                              <small>{item.desc}</small>
                            </span>
                            {active === item.id ? <span className="menu-active-dot" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="sidebar-help-card">
            <span>alooSMM Manager OS</span>
            <strong>Lavozimga mos tizim</strong>
            <small>Strategiya, reklama, ssenariy va mobilograf nazorati bitta panelda.</small>
            <a href="/menu">Boshqaruvga o'tish</a>
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
                <div className="small-label">alooSMM manager platforma</div>
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
                      { key: "tasks", label: "Ish taqsimoti", items: globalResults?.tasks || [] },
                      { key: "campaigns", label: "Reklama va aksiyalar", items: globalResults?.campaigns || [] }
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
                              else if (group.key === "campaigns") goToPage("campaigns");
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

          <div className="sidebar-role-switcher mobile-role-switcher" aria-label="Menu yo'nalishi">
            {SIDEBAR_WORKSPACES.map((workspace) => (
              <button
                key={`mobile-role-${workspace.id}`}
                type="button"
                className={`sidebar-role-pill ${sidebarWorkspace === workspace.id ? "active" : ""}`}
                onClick={() => switchSidebarWorkspace(workspace.id)}
              >
                <strong>{workspace.title}</strong>
                <span>{workspace.desc}</span>
              </button>
            ))}
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
      <style>{styles}</style>
    </>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Manrope:wght@600;700;800&display=swap');
:root{
  --blue:#1478F2;
  --blue-strong:#0B63D1;
  --accent:#EAF3FF;
  --accent-soft:rgba(20,120,242,.14);
  --bg:#F6F8FB;
  --bg-elevated:#ffffff;
  --panel:#ffffff;
  --panel-strong:#ffffff;
  --panel-soft:#F3F6FA;
  --soft:#f6f9fc;
  --soft-strong:#E6EAF0;
  --text:#151515;
  --text-soft:#2B2F36;
  --muted:#6B6F7A;
  --line:#E6EAF0;
  --line-strong:#D8DEE8;
  --black:#141414;
  --danger:#EF4444;
  --success:#21B573;
  --warning:#FF7A1A;
  --nav-bg:#07111d;
  --nav-bg-soft:rgba(13,24,40,.88);
  --nav-text:#f8fbff;
  --nav-muted:#8fa3bc;
  --radius-lg:30px;
  --radius-md:20px;
  --shadow-soft:0 18px 34px rgba(15,23,42,.07);
  --shadow-card:0 28px 60px rgba(15,23,42,.10);
  --shadow-float:0 24px 54px rgba(7,17,29,.18);
  --ring:0 0 0 4px rgba(20,120,242,.14);
}
:root[data-theme='dark']{
  --blue:#EAF3FF;
  --blue-strong:#0B63D1;
  --accent:#EAF3FF;
  --accent-soft:rgba(48,213,200,.18);
  --bg:#050c16;
  --bg-elevated:#091220;
  --panel:rgba(11,20,34,.90);
  --panel-strong:#0d1727;
  --panel-soft:rgba(15,24,39,.82);
  --soft:#101b2c;
  --soft-strong:#142236;
  --text:#f4f8ff;
  --text-soft:#dde7f7;
  --muted:#8a9ab1;
  --line:rgba(148,163,184,.14);
  --line-strong:rgba(148,163,184,.22);
  --black:#141414;
  --danger:#fb7185;
  --success:#39d39f;
  --warning:#f7b844;
  --nav-bg:#030812;
  --nav-bg-soft:rgba(7,15,27,.92);
  --nav-text:#f8fbff;
  --nav-muted:#8ea2bc;
  --shadow-soft:0 18px 42px rgba(1,8,18,.40);
  --shadow-card:0 30px 66px rgba(1,8,18,.50);
  --shadow-float:0 24px 58px rgba(0,0,0,.46);
  --ring:0 0 0 4px rgba(20,120,242,.16);
}
*{box-sizing:border-box}
html,body,#root{margin:0;min-height:100%;font-family:"Inter","Manrope","Segoe UI",sans-serif;background:var(--bg);color:var(--text)}
html{
  background:
    radial-gradient(circle at top left, rgba(20,120,242,.10), transparent 28%),
    radial-gradient(circle at bottom right, rgba(20,120,242,.08), transparent 28%),
    var(--bg);
  color-scheme:light;
}
:root[data-theme='dark'] html{color-scheme:dark}
body{
  padding:0;
  background:
    radial-gradient(circle at 14% 18%, rgba(20,120,242,.10), transparent 24%),
    radial-gradient(circle at 86% 16%, rgba(20,120,242,.08), transparent 20%),
    linear-gradient(180deg, rgba(255,255,255,.24), rgba(255,255,255,0)),
    var(--bg);
  color:var(--text);
}
button,input,select,textarea{font:inherit;transition:border-color .2s ease,box-shadow .2s ease,background .2s ease,color .2s ease,transform .2s ease,opacity .2s ease}
input,select,textarea{outline:none}
a{color:var(--blue);text-decoration:none;transition:color .2s ease,opacity .2s ease}
a:hover{opacity:.9}
h1,h2,h3,h4,.brand-name,.section-title-row h2,.topbar h1{font-family:"Manrope","Inter","Segoe UI",sans-serif}
img{display:block;max-width:100%}
::selection{background:rgba(15,137,255,.18);color:var(--text)}
body.standalone-app{overscroll-behavior:none}
body.standalone-app .app-shell{min-height:100dvh}
body.standalone-app .sidebar{
  padding-top:max(18px, calc(env(safe-area-inset-top) + 18px));
  padding-bottom:max(18px, calc(env(safe-area-inset-bottom) + 18px));
}
body.standalone-app .main-area{
  padding-top:max(16px, calc(env(safe-area-inset-top) + 12px));
  padding-bottom:max(18px, calc(env(safe-area-inset-bottom) + 18px));
}
body.standalone-app .login-page{
  min-height:100dvh;
  padding-top:max(22px, calc(env(safe-area-inset-top) + 22px));
  padding-bottom:max(22px, calc(env(safe-area-inset-bottom) + 22px));
}

.loading-screen{
  min-height:100vh;
  display:grid;
  place-items:center;
  background:
    radial-gradient(circle at 14% 18%, rgba(20,120,242,.24), transparent 24%),
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
  background:radial-gradient(circle, rgba(20,120,242,.28), transparent 68%);
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
  width:min(92vw, 460px);
  padding:34px 30px 30px;
  border-radius:34px;
  background:
    linear-gradient(145deg, rgba(255,255,255,.94), rgba(245,250,255,.82)),
    rgba(255,255,255,.82);
  border:1px solid rgba(255,255,255,.88);
  backdrop-filter:blur(22px);
  box-shadow:0 34px 90px rgba(20,86,140,.18), inset 0 1px 0 rgba(255,255,255,.7);
  display:grid;
  gap:24px;
  justify-items:center;
  animation:login-card-in .7s cubic-bezier(.2,.9,.2,1);
  overflow:hidden;
}
.loading-card::before{
  content:"";
  position:absolute;
  inset:-35% auto auto -18%;
  width:220px;
  height:220px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(20,120,242,.22), transparent 72%);
  filter:blur(12px);
  pointer-events:none;
}
.loading-card::after{
  content:"";
  position:absolute;
  inset:auto -20% -28% auto;
  width:210px;
  height:210px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(16,185,129,.16), transparent 72%);
  filter:blur(12px);
  pointer-events:none;
}
.loading-brand{
  display:grid;
  justify-items:center;
  gap:14px;
  text-align:center;
  position:relative;
  z-index:1;
}
.loading-brand-image{
  width:72px;
  height:72px;
  object-fit:cover;
  border-radius:24px;
  box-shadow:0 20px 40px rgba(29,78,216,.18);
}
.loading-brand strong{
  display:block;
  font-family:"Manrope","Inter","Segoe UI",sans-serif;
  font-size:24px;
  line-height:1;
  margin-bottom:6px;
  letter-spacing:-.04em;
}
.loading-brand span{
  color:var(--muted);
  font-size:13px;
}
.loader {
  width: 120px;
  height: 150px;
  background-color: #fff;
  background-repeat: no-repeat;
  background-image:
    linear-gradient(#ddd 50%, #bbb 51%),
    linear-gradient(#ddd, #ddd),
    linear-gradient(#ddd, #ddd),
    radial-gradient(ellipse at center, #aaa 25%, #eee 26%, #eee 50%, #0000 55%),
    radial-gradient(ellipse at center, #aaa 25%, #eee 26%, #eee 50%, #0000 55%),
    radial-gradient(ellipse at center, #aaa 25%, #eee 26%, #eee 50%, #0000 55%);
  background-position: 0 20px, 45px 0, 8px 6px, 55px 3px, 75px 3px, 95px 3px;
  background-size: 100% 4px, 1px 23px, 30px 8px, 15px 15px, 15px 15px, 15px 15px;
  position: relative;
  border-radius: 6%;
  animation: shake 3s ease-in-out infinite;
  transform-origin: 60px 180px;
  box-shadow: 0 22px 40px rgba(15, 23, 42, 0.12);
  position:relative;
  z-index:1;
}
.loader:before {
  content: "";
  position: absolute;
  left: 5px;
  top: 100%;
  width: 7px;
  height: 5px;
  background: #aaa;
  border-radius: 0 0 4px 4px;
  box-shadow: 102px 0 #aaa;
}
.loader:after {
  content: "";
  position: absolute;
  width: 95px;
  height: 95px;
  left: 0;
  right: 0;
  margin: auto;
  bottom: 20px;
  background-color: #bbdefb;
  background-image:
    linear-gradient(to right, #0004 0%, #0004 49%, #0000 50%, #0000 100%),
    linear-gradient(135deg, #64b5f6 50%, #607d8b 51%);
  background-size: 30px 100%, 90px 80px;
  border-radius: 50%;
  background-repeat: repeat, no-repeat;
  background-position: 0 0;
  box-sizing: border-box;
  border: 10px solid #DDD;
  box-shadow: 0 0 0 4px #999 inset, 0 0 6px 6px #0004 inset;
  animation: spin 3s ease-in-out infinite;
}
.loading-copy{
  text-align:center;
  max-width:340px;
  position:relative;
  z-index:1;
}
.loading-copy h2{
  margin:0 0 8px;
  font-family:"Manrope","Inter","Segoe UI",sans-serif;
  font-size:30px;
  letter-spacing:-.03em;
}
.loading-copy p{
  margin:0;
  color:var(--muted);
  font-size:15px;
  line-height:1.7;
}

.login-page{
  min-height:100vh;
  width:100%;
  position:relative;
  overflow:hidden;
  padding:clamp(18px, 3vw, 38px);
  background:
    radial-gradient(circle at 10% 14%, rgba(20,120,242,.30), transparent 26%),
    radial-gradient(circle at 84% 14%, rgba(20,120,242,.18), transparent 20%),
    radial-gradient(circle at 86% 84%, rgba(14,165,233,.18), transparent 20%),
    radial-gradient(circle at 14% 88%, rgba(110,231,183,.20), transparent 24%),
    linear-gradient(135deg, #ecf8ff 0%, #f7fbff 28%, #eef9ff 58%, #effef7 100%);
  isolation:isolate;
}
.login-page::before{
  content:"";
  position:absolute;
  inset:-12%;
  background:
    radial-gradient(circle at 24% 28%, rgba(255,255,255,.42), transparent 18%),
    radial-gradient(circle at 72% 26%, rgba(125,211,252,.18), transparent 22%),
    radial-gradient(circle at 76% 72%, rgba(20,120,242,.12), transparent 18%);
  filter:blur(30px);
  opacity:.95;
  animation:aurora-drift 16s ease-in-out infinite alternate;
  pointer-events:none;
  z-index:0;
}
.login-page::after{
  content:"";
  position:absolute;
  inset:0;
  background:linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,.26) 50%, rgba(255,255,255,0) 100%);
  mix-blend-mode:screen;
  opacity:.42;
  animation:login-pan 18s linear infinite;
  pointer-events:none;
  z-index:0;
}
.login-shell{
  position:relative;
  z-index:2;
  width:min(100%, 1500px);
  min-height:calc(100vh - clamp(36px, 6vw, 76px));
  margin:0 auto;
  display:grid;
  grid-template-columns:minmax(0, 780px) minmax(420px, 560px);
  align-items:center;
  justify-content:space-between;
  gap:clamp(48px, 7vw, 130px);
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
  background:linear-gradient(135deg, rgba(20,120,242,.65), rgba(110,231,183,.35));
  box-shadow:0 0 18px rgba(20,120,242,.35);
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
  max-width:860px;
  padding-inline:clamp(4px, .8vw, 18px);
}
.brand-kicker{
  display:inline-flex;
  width:max-content;
  padding:12px 18px;
  border-radius:999px;
  background:rgba(255,255,255,.56);
  backdrop-filter:blur(10px);
  border:1px solid rgba(20,120,242,.14);
  color:#1277da;
  font-size:12px;
  text-transform:none;
  letter-spacing:.18em;
  box-shadow:0 16px 34px rgba(20,120,242,.10);
  animation:brand-drift 8s ease-in-out infinite;
}
.login-copy h1{
  font-size:clamp(58px, 6.3vw, 92px);
  margin:18px 0 0;
  line-height:.94;
  letter-spacing:-.04em;
  max-width:780px;
  background:linear-gradient(135deg, #0f172a 0%, #15233c 62%, #116dce 100%);
  -webkit-background-clip:text;
  color:transparent;
  animation:login-fade-up .9s ease both, headline-wave 12s ease-in-out infinite 1s;
}
.login-copy h2{
  font-size:clamp(30px, 3.3vw, 38px);
  line-height:1.12;
  margin:18px 0 0;
  max-width:760px;
  animation:login-fade-up 1s ease both, login-float 12s ease-in-out infinite -2.3s;
}
.login-copy > p:not(.login-seo-note){
  color:var(--muted);
  font-size:18px;
  max-width:680px;
  line-height:1.6;
  animation:login-fade-up 1.08s ease both;
}
.login-logo-lockup{
  display:flex;
  align-items:center;
  gap:16px;
  margin-top:26px;
  margin-bottom:4px;
  animation:login-float 9s ease-in-out infinite -1.4s;
}
.login-logo-image{
  width:78px;
  height:78px;
  border-radius:26px;
  box-shadow:0 18px 34px rgba(29,78,216,.18);
  animation:pulse-glow 7s ease-in-out infinite;
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
.login-status-row{
  display:flex;
  flex-wrap:wrap;
  gap:12px;
  margin-top:24px;
  animation:login-fade-up 1.15s ease both;
}
.login-status-pill{
  padding:10px 14px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.74);
  background:rgba(255,255,255,.48);
  backdrop-filter:blur(12px);
  box-shadow:0 16px 30px rgba(15,23,42,.05);
  color:#1277da;
  font-size:12px;
  letter-spacing:.14em;
  text-transform:lowercase;
  animation:login-float 7.5s ease-in-out infinite;
}
.login-status-pill:nth-child(2){animation-delay:-2.2s}
.login-status-pill:nth-child(3){animation-delay:-4.4s}
.login-feature-row{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,230px));
  gap:14px;
  margin-top:28px;
  animation:login-fade-up 1.2s ease both;
}
.login-feature-card{
  padding:18px 20px;
  border-radius:24px;
  background:rgba(255,255,255,.54);
  border:1px solid rgba(255,255,255,.76);
  backdrop-filter:blur(16px);
  box-shadow:0 20px 40px rgba(30,41,59,.08);
  animation:login-float 6.2s ease-in-out infinite;
}
.login-feature-card:nth-child(2){animation-delay:-2.2s}
.login-feature-card strong{display:block;font-size:16px;margin-bottom:6px}
.login-feature-card span{color:var(--muted);font-size:14px;line-height:1.5}
.login-seo-block{
  margin-top:26px;
  display:grid;
  gap:16px;
  max-width:860px;
  animation:login-fade-up 1.3s ease both;
}
.login-public-nav{
  margin-top:14px;
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}
.login-public-nav a{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:42px;
  padding:10px 16px;
  border-radius:999px;
  text-decoration:none;
  font-weight:700;
  font-size:14px;
  color:var(--text);
  background:rgba(255,255,255,.62);
  border:1px solid rgba(255,255,255,.78);
  box-shadow:0 18px 34px rgba(15,23,42,.08);
  transition:transform .18s ease, box-shadow .18s ease, background .18s ease;
}
.login-public-nav a:hover{
  transform:translateY(-1px);
  box-shadow:0 22px 38px rgba(15,23,42,.12);
  background:rgba(255,255,255,.8);
}
.login-seo-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:16px;
}
.login-seo-card{
  padding:20px;
  border-radius:24px;
  background:rgba(255,255,255,.50);
  border:1px solid rgba(255,255,255,.74);
  backdrop-filter:blur(16px);
  box-shadow:0 20px 42px rgba(30,41,59,.08);
  animation:login-float 8.6s ease-in-out infinite;
}
.login-seo-card:nth-child(2){animation-delay:-2.2s}
.login-seo-card:nth-child(3){animation-delay:-4.7s}
.login-seo-card strong{
  display:block;
  font-size:16px;
  margin-bottom:8px;
}
.login-seo-card p{
  margin:0;
  color:var(--muted);
  font-size:14px;
  line-height:1.6;
  max-width:none;
}
.login-seo-note{
  margin:0;
  color:var(--muted);
  font-size:14px;
  line-height:1.7;
  max-width:780px;
}
.login-card{
  align-self:center;
  justify-self:stretch;
  width:min(100%, 560px);
  position:relative;
  z-index:2;
  overflow:hidden;
  background:rgba(255,255,255,.72);
  backdrop-filter:blur(22px);
  border:1px solid rgba(255,255,255,.78);
  border-radius:38px;
  padding:34px;
  display:grid;
  gap:16px;
  box-shadow:0 30px 84px rgba(20,86,140,.15);
  animation:login-card-in .75s cubic-bezier(.2,.9,.2,1) both, login-card-drift 11s ease-in-out infinite 1.1s;
}
.login-card::before{
  content:"";
  position:absolute;
  inset:0;
  background:
    linear-gradient(135deg, rgba(255,255,255,.28) 0%, transparent 34%),
    linear-gradient(135deg, transparent 55%, rgba(20,120,242,.14) 100%);
  pointer-events:none;
  opacity:.9;
  animation:login-pan 12s linear infinite;
}
.login-card-top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.login-card-badges{
  display:flex;
  flex-wrap:wrap;
  justify-content:flex-end;
  gap:8px;
}
.login-card-badge{
  padding:7px 11px;
  border-radius:999px;
  border:1px solid rgba(20,120,242,.12);
  background:rgba(20,120,242,.08);
  color:#1277da;
  font-size:11px;
  letter-spacing:.12em;
  text-transform:lowercase;
  animation:brand-drift 6s ease-in-out infinite;
}
.login-card-badge:nth-child(2){animation-delay:-1.8s}
.login-card-glow{
  position:absolute;
  right:-18%;
  bottom:-24%;
  width:240px;
  height:240px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(20,120,242,.22), transparent 68%);
  filter:blur(12px);
  animation:aurora-drift 12s ease-in-out infinite alternate-reverse;
  pointer-events:none;
}
.login-card-shine{
  position:absolute;
  inset:-26% auto auto -22%;
  width:220px;
  height:220px;
  background:radial-gradient(circle, rgba(255,255,255,.78), transparent 70%);
  opacity:.85;
  animation:login-shine 7s linear infinite;
  pointer-events:none;
}
.small-label{
  font-size:11px;
  color:var(--muted);
  letter-spacing:.18em;
  text-transform:uppercase;
  font-weight:800;
}
.login-title{font-size:30px;font-weight:800}
.login-card label{
  display:grid;
  gap:8px;
  position:relative;
  z-index:1;
  animation:login-fade-up .8s ease both;
}
.login-card label:nth-of-type(1){animation-delay:.1s}
.login-card label:nth-of-type(2){animation-delay:.18s}
.login-card label span{font-size:13px;color:var(--muted)}
.login-card input{
  background:rgba(248,251,255,.88);
  border:1px solid rgba(20,120,242,.14);
  color:var(--text);
  border-radius:18px;
  padding:15px 16px;
  transition:border-color .2s ease, box-shadow .2s ease, transform .2s ease, background .2s ease;
}
.login-card input:focus{
  border-color:rgba(20,120,242,.45);
  box-shadow:0 0 0 4px rgba(20,120,242,.12), 0 14px 30px rgba(20,120,242,.12);
  transform:translateY(-1px);
  background:rgba(255,255,255,.96);
}
.login-card .btn.primary{
  position:relative;
  overflow:hidden;
  min-height:54px;
  z-index:1;
  box-shadow:0 18px 38px rgba(20,120,242,.24);
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
  background:radial-gradient(circle, rgba(20,120,242,.30), rgba(29,78,216,.10) 60%, transparent 72%);
  animation:login-float 7s ease-in-out infinite;
}
.orb-two{
  width:360px;
  height:360px;
  left:-80px;
  bottom:-120px;
  background:radial-gradient(circle, rgba(110,231,183,.28), rgba(20,120,242,.08) 58%, transparent 74%);
  animation:login-float 9s ease-in-out infinite reverse;
}
.orb-three{
  width:320px;
  height:320px;
  right:6%;
  bottom:-100px;
  background:radial-gradient(circle, rgba(255,255,255,.42), rgba(20,120,242,.12) 48%, transparent 74%);
  animation:login-float 10s ease-in-out infinite -3s;
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
  opacity:.9;
  animation:grid-drift 20s linear infinite;
}
.login-noise{
  position:absolute;
  inset:0;
  background-image:radial-gradient(rgba(255,255,255,.65) .8px, transparent .8px);
  background-size:24px 24px;
  opacity:.12;
  mix-blend-mode:screen;
  pointer-events:none;
  z-index:1;
  animation:noise-shift 24s linear infinite;
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
.login-card-footer{
  position:relative;
  z-index:1;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding-top:8px;
  color:var(--muted);
  font-size:13px;
}
.login-card-pulse{
  display:inline-flex;
  align-items:center;
  gap:8px;
  color:#1478F2;
  font-weight:700;
  text-transform:lowercase;
}
.login-card-pulse::before{
  content:"";
  width:8px;
  height:8px;
  border-radius:999px;
  background:#EAF3FF;
  box-shadow:0 0 0 0 rgba(45,212,191,.55);
  animation:signal-ping 1.8s ease-out infinite;
}
.login-loader-ring{
  width:58px;
  height:58px;
  border-radius:50%;
  border:4px solid rgba(29,78,216,.12);
  border-top-color:#1478F2;
  border-right-color:#EAF3FF;
  animation:login-spin 1s linear infinite;
  box-shadow:0 0 0 8px rgba(20,120,242,.08);
}

.app-shell{
  min-height:100vh;
  display:grid;
  grid-template-columns:280px 1fr;
  background:
    radial-gradient(circle at 12% 16%, rgba(20,120,242,.08), transparent 24%),
    radial-gradient(circle at 88% 14%, rgba(23,195,178,.06), transparent 22%),
    linear-gradient(180deg, rgba(255,255,255,.28), rgba(255,255,255,0)),
    var(--bg);
}
.sidebar{
  background:
    radial-gradient(circle at 14% 12%, rgba(20,120,242,.22), transparent 22%),
    radial-gradient(circle at 86% 18%, rgba(23,195,178,.16), transparent 18%),
    linear-gradient(180deg, rgba(255,255,255,.02), rgba(255,255,255,0)),
    var(--nav-bg);
  border-right:1px solid rgba(148,163,184,.12);
  padding:24px 18px 20px;
  display:flex;
  flex-direction:column;
  gap:16px;
  position:sticky;
  top:0;
  height:100vh;
  backdrop-filter:blur(22px);
  box-shadow:inset -1px 0 0 rgba(255,255,255,.08), 18px 0 40px rgba(2,8,23,.18);
  overflow:hidden;
}
.sidebar::before{
  content:"";
  position:absolute;
  inset:18px 14px auto;
  height:1px;
  background:linear-gradient(90deg, rgba(255,255,255,.18), rgba(255,255,255,0));
}
.sidebar::after{
  content:"";
  position:absolute;
  right:10px;
  top:22px;
  bottom:22px;
  width:1px;
  background:linear-gradient(180deg, rgba(96,165,250,.22), rgba(255,255,255,0));
  opacity:.65;
}
.brand-block{display:flex;align-items:center;gap:12px}
.brand-mark{
  width:56px;height:56px;border-radius:20px;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.35), transparent 38%),
    linear-gradient(135deg,#1478F2,#0B63D1 58%,#EAF3FF);
  color:#fff;display:grid;place-items:center;font-size:26px;font-weight:900;
  box-shadow:0 16px 30px rgba(29,78,216,.22);
  overflow:hidden;
}
.brand-mark-image{width:100%;height:100%;object-fit:cover}
.brand-name{
  font-size:24px;
  font-weight:700;
  letter-spacing:-.05em;
  color:var(--nav-text);
}
.brand-desc{
  font-size:12px;
  color:var(--nav-muted);
  max-width:160px;
  line-height:1.55;
}
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
  background:linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
  border:1px solid rgba(148,163,184,.12);
  border-radius:18px;
  padding:13px 15px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
  color:var(--nav-muted);
}
.sidebar-search input{
  width:100%;
  background:transparent;
  border:0;
  color:var(--nav-text);
}
.sidebar-search input::placeholder{
  color:var(--nav-muted);
}

.menu-section-list{
  display:grid;
  gap:14px;
}
.menu-group{
  display:grid;
  gap:10px;
}
.menu-group-toggle{
  border:0;
  background:transparent;
  color:var(--nav-muted);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:2px 8px 2px 4px;
  text-transform:uppercase;
  letter-spacing:.16em;
  font-size:11px;
  font-weight:800;
  cursor:pointer;
}
.menu-group-toggle.open{
  color:#dce9ff;
}
.menu-list{
  display:grid;
  gap:8px;
}
.menu-btn{
  border:1px solid transparent;
  background:linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  color:var(--nav-text);
  padding:14px 16px;
  border-radius:20px;
  display:flex;align-items:center;gap:10px;
  cursor:pointer;
  text-align:left;
  font-weight:700;
  box-shadow:0 8px 18px rgba(2,8,23,.12);
  transition:transform .18s ease,border-color .18s ease,box-shadow .18s ease,background .18s ease,color .18s ease;
}
.menu-btn:hover{
  background:linear-gradient(135deg, rgba(255,255,255,.10), rgba(20,120,242,.12), rgba(23,195,178,.08));
  border-color:rgba(96,165,250,.24);
  transform:translateX(4px);
  box-shadow:0 16px 30px rgba(2,8,23,.2);
}
.menu-btn.active{
  background:linear-gradient(135deg, rgba(20,120,242,.28), rgba(20,120,242,.24), rgba(23,195,178,.16));
  border-color:rgba(110,196,255,.34);
  box-shadow:0 16px 34px rgba(20,120,242,.22);
}
.menu-icon-wrap{
  width:34px;
  height:34px;
  border-radius:14px;
  display:grid;
  place-items:center;
  border:1px solid rgba(255,255,255,.08);
  color:#fff;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.14), 0 10px 20px rgba(2,8,23,.18);
  transition:transform .18s ease, filter .18s ease, box-shadow .18s ease;
}
.menu-btn.active .menu-icon-wrap{
  border-color:rgba(255,255,255,.14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.2), 0 16px 30px rgba(20,120,242,.24);
  transform:translateY(-1px) scale(1.04);
  filter:saturate(1.08) brightness(1.04);
}
.icon-tone-indigo{background:linear-gradient(135deg,#0B63D1,#1478F2)}
.icon-tone-cyan{background:linear-gradient(135deg,#0891b2,#22d3ee)}
.icon-tone-emerald{background:linear-gradient(135deg,#059669,#34d399)}
.icon-tone-amber{background:linear-gradient(135deg,#d97706,#fbbf24)}
.icon-tone-blue{background:linear-gradient(135deg,#1478F2,#0B63D1)}
.icon-tone-violet{background:linear-gradient(135deg,#7c3aed,#a78bfa)}
.icon-tone-sky{background:linear-gradient(135deg,#1478F2,#0B63D1)}
.icon-tone-pink{background:linear-gradient(135deg,#db2777,#fb7185)}
.icon-tone-teal{background:linear-gradient(135deg,#1478F2,#0B63D1)}
.icon-tone-orange{background:linear-gradient(135deg,#ea580c,#fb923c)}
.icon-tone-slate{background:linear-gradient(135deg,#334155,#64748b)}
.icon-tone-fuchsia{background:linear-gradient(135deg,#c026d3,#f472b6)}
.icon-tone-purple{background:linear-gradient(135deg,#7e22ce,#a855f7)}
.icon-tone-green{background:linear-gradient(135deg,#15803d,#4ade80)}
.icon-tone-red{background:linear-gradient(135deg,#dc2626,#f87171)}

.logout-btn{
  margin-top:auto;
  border:0;
  border-radius:18px;
  padding:14px 16px;
  background:
    radial-gradient(circle at 12% 20%, rgba(23,195,178,.22), transparent 18%),
    linear-gradient(135deg,#08111f,#0b1727 62%,#06101d);
  color:#fff;
  display:flex;align-items:center;justify-content:center;gap:8px;
  cursor:pointer;
  box-shadow:0 22px 46px rgba(2,8,23,.34);
}

.main-area{
  padding:26px 24px 32px;
  position:relative;
}
.main-area::before{
  content:"";
  position:absolute;
  inset:0 0 auto;
  height:220px;
  background:linear-gradient(180deg, rgba(255,255,255,.34), rgba(255,255,255,0));
  pointer-events:none;
}
.topbar{
  background:
    linear-gradient(180deg, rgba(255,255,255,.86), rgba(255,255,255,.42)),
    var(--panel);
  border:1px solid rgba(148,163,184,.16);
  border-radius:30px;
  padding:20px 24px;
  display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
  backdrop-filter:blur(24px);
  box-shadow:0 22px 46px rgba(15,23,42,.08);
  position:relative;
  overflow:hidden;
}
.topbar::after{
  content:"";
  position:absolute;
  inset:auto -12% -70% auto;
  width:280px;
  height:220px;
  background:radial-gradient(circle, rgba(20,120,242,.10), transparent 70%);
  pointer-events:none;
}
.topbar-main{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
}
.topbar-title-block{
  display:grid;
  gap:8px;
}
.page-title-badge{
  width:48px;
  height:48px;
  border-radius:18px;
  display:grid;
  place-items:center;
  color:#fff;
  box-shadow:0 16px 30px rgba(15,23,42,.12);
}
.topbar h1{
  margin:8px 0 0;
  font-size:34px;
  letter-spacing:-.06em;
  color:#0b1220;
}
.topbar-right{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.mobile-menu-btn{
  display:none;
  border:1px solid var(--line);
  background:linear-gradient(180deg, rgba(255,255,255,.95), var(--soft));
  color:var(--text);
  border-radius:18px;
  padding:12px 14px;
  align-items:center;
  gap:8px;
  font-weight:800;
}
.global-search{
  position:relative;
  min-width:280px;
  display:flex;
  align-items:center;
  gap:10px;
  background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(240,245,252,.92));
  border:1px solid rgba(148,163,184,.14);
  border-radius:20px;
  padding:13px 15px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 10px 20px rgba(148,163,184,.08);
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
  background:rgba(255,255,255,.94);
  backdrop-filter:blur(16px);
  box-shadow:var(--shadow-card);
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
  background:linear-gradient(180deg, rgba(255,255,255,.94), var(--soft));
  color:var(--text);
  border-radius:14px;
  padding:10px 12px;
  text-align:left;
  cursor:pointer;
}
.global-search-empty{
  color:var(--muted);
  font-size:13px;
}

.theme-toggle,.notif-pill,.user-chip{
  border:1px solid rgba(148,163,184,.14);
  background:linear-gradient(180deg, rgba(255,255,255,.94), rgba(241,246,253,.92));
  color:var(--text);
  border-radius:18px;
  padding:12px 14px;
  display:flex;align-items:center;gap:8px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 10px 20px rgba(148,163,184,.08);
}
.notif-pill,.user-chip{cursor:pointer}
.theme-toggle:hover,.notif-pill:hover,.user-chip:hover{
  transform:translateY(-1px);
  box-shadow:var(--shadow-soft);
}
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
.dashboard-page{gap:22px}
.dashboard-hero-card{
  display:grid;
  grid-template-columns:minmax(0, 1.2fr) minmax(320px, .8fr);
  gap:22px;
  background:
    radial-gradient(circle at top left, rgba(20,120,242,.16), transparent 30%),
    radial-gradient(circle at bottom right, rgba(16,185,129,.12), transparent 26%),
    linear-gradient(180deg, rgba(255,255,255,.88), rgba(255,255,255,.36)),
    var(--panel);
  border:1px solid rgba(148,163,184,.16);
  border-radius:32px;
  padding:28px;
  box-shadow:0 22px 48px rgba(15,23,42,.10);
  position:relative;
  overflow:hidden;
}
.dashboard-hero-card::before{
  content:"";
  position:absolute;
  inset:auto auto -80px -50px;
  width:240px;
  height:240px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(20,120,242,.18), transparent 68%);
  pointer-events:none;
}
.dashboard-hero-copy{
  position:relative;
  z-index:1;
  display:grid;
  align-content:start;
  gap:16px;
}
.dashboard-hero-copy h1{
  margin:0;
  font-size:56px;
  line-height:.96;
  letter-spacing:-.08em;
}
.dashboard-hero-copy p{
  margin:0;
  color:var(--muted);
  font-size:17px;
  line-height:1.72;
  max-width:760px;
}
.dashboard-hero-summary{
  padding:18px 20px;
  border-radius:22px;
  border:1px solid rgba(148,163,184,.16);
  background:linear-gradient(135deg, rgba(15,23,42,.04), rgba(20,120,242,.06));
  color:var(--text);
  line-height:1.72;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7);
}
.dashboard-chip-row{
  display:flex;
  flex-wrap:wrap;
  gap:10px;
}
.dashboard-chip{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:10px 14px;
  border-radius:999px;
  border:1px solid rgba(148,163,184,.16);
  background:rgba(255,255,255,.74);
  color:var(--text);
  font-size:13px;
  font-weight:700;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7);
}
.dashboard-chip.small{padding:7px 12px;font-size:12px}
.dashboard-chip.live{
  color:#1478F2;
  border-color:rgba(13,148,136,.22);
  background:linear-gradient(135deg, rgba(45,212,191,.16), rgba(255,255,255,.78));
}
.dashboard-hero-side{
  position:relative;
  z-index:1;
  display:grid;
  gap:14px;
}
.dashboard-hero-glow{
  position:absolute;
  inset:auto -30px -40px auto;
  width:180px;
  height:180px;
  border-radius:50%;
  background:radial-gradient(circle, rgba(20,120,242,.22), transparent 68%);
  filter:blur(8px);
  pointer-events:none;
}
.dashboard-side-focus{
  position:relative;
  padding:18px 20px;
  min-height:132px;
  border-radius:24px;
  border:1px solid rgba(148,163,184,.16);
  background:linear-gradient(145deg, rgba(10,22,38,.96), rgba(24,42,68,.92));
  color:#e9f2ff;
  box-shadow:0 22px 46px rgba(15,23,42,.22);
  display:grid;
  gap:8px;
}
.dashboard-side-focus span{
  font-size:12px;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:rgba(226,232,240,.72);
  font-weight:800;
}
.dashboard-side-focus strong{
  font-size:42px;
  line-height:1;
  letter-spacing:-.08em;
}
.dashboard-side-focus small{
  color:rgba(226,232,240,.72);
  line-height:1.6;
}
.dashboard-side-grid{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:14px;
}
.dashboard-side-card{
  padding:16px;
  border-radius:22px;
  border:1px solid rgba(148,163,184,.16);
  background:linear-gradient(180deg, rgba(255,255,255,.88), rgba(245,248,253,.70));
  box-shadow:0 14px 30px rgba(15,23,42,.08);
  display:grid;
  gap:8px;
  min-height:112px;
}
.dashboard-side-card span{
  color:var(--muted);
  font-size:12px;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-weight:800;
}
.dashboard-side-card strong{
  font-size:22px;
  line-height:1.12;
  letter-spacing:-.05em;
}
.dashboard-side-card small{
  color:var(--muted);
  line-height:1.5;
}
.dashboard-metrics-grid{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:18px;
}
.dashboard-metrics-grid-secondary{grid-template-columns:repeat(5, minmax(0, 1fr))}
.dashboard-metric-card{
  position:relative;
  overflow:hidden;
  padding:20px;
  border-radius:26px;
  border:1px solid rgba(148,163,184,.16);
  background:linear-gradient(180deg, rgba(255,255,255,.92), rgba(244,248,255,.82));
  box-shadow:0 18px 36px rgba(15,23,42,.08);
  display:grid;
  gap:14px;
  min-height:188px;
  animation:dashboard-fade-up .45s ease;
}
.dashboard-metric-card::before{
  content:"";
  position:absolute;
  inset:auto -18% -44% auto;
  width:140px;
  height:140px;
  border-radius:50%;
  filter:blur(4px);
  opacity:.75;
  pointer-events:none;
}
.dashboard-metric-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
}
.dashboard-metric-label{
  font-size:12px;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:var(--muted);
  font-weight:800;
}
.dashboard-metric-dot{
  width:12px;
  height:12px;
  border-radius:999px;
  box-shadow:0 0 0 6px rgba(255,255,255,.45);
}
.dashboard-metric-dot-default{background:#94a3b8;box-shadow:0 0 0 6px rgba(148,163,184,.12)}
.dashboard-metric-dot-success{background:#1478F2;box-shadow:0 0 0 6px rgba(16,185,129,.14)}
.dashboard-metric-dot-warning{background:#FF7A1A;box-shadow:0 0 0 6px rgba(245,158,11,.14)}
.dashboard-metric-dot-danger{background:#ef4444;box-shadow:0 0 0 6px rgba(239,68,68,.14)}
.dashboard-metric-dot-info{background:#1478F2;box-shadow:0 0 0 6px rgba(20,120,242,.14)}
.dashboard-metric-main{
  font-size:40px;
  font-weight:900;
  letter-spacing:-.08em;
  line-height:1;
}
.dashboard-metric-spark{
  height:48px;
  display:flex;
  align-items:flex-end;
  gap:8px;
}
.dashboard-metric-spark span{
  flex:1;
  min-width:0;
  border-radius:999px;
  background:linear-gradient(180deg, rgba(20,120,242,.92), rgba(20,120,242,.22));
  transform-origin:bottom;
  animation:dashboard-spark-rise .55s ease both;
}
.dashboard-metric-hint{
  color:var(--muted);
  font-size:13px;
  line-height:1.55;
}
.dashboard-metric-default::before{background:radial-gradient(circle, rgba(20,120,242,.10), transparent 72%)}
.dashboard-metric-success{
  background:linear-gradient(135deg, rgba(16,185,129,.12), rgba(255,255,255,.96) 40%, rgba(16,185,129,.06));
  border-color:rgba(16,185,129,.24);
}
.dashboard-metric-success::before{background:radial-gradient(circle, rgba(16,185,129,.16), transparent 72%)}
.dashboard-metric-success .dashboard-metric-main{color:#047857}
.dashboard-metric-success .dashboard-metric-spark span{background:linear-gradient(180deg, rgba(16,185,129,.95), rgba(16,185,129,.20))}
.dashboard-metric-warning{
  background:linear-gradient(135deg, rgba(245,158,11,.14), rgba(255,255,255,.96) 40%, rgba(245,158,11,.08));
  border-color:rgba(245,158,11,.24);
}
.dashboard-metric-warning::before{background:radial-gradient(circle, rgba(245,158,11,.18), transparent 72%)}
.dashboard-metric-warning .dashboard-metric-main{color:#b45309}
.dashboard-metric-warning .dashboard-metric-spark span{background:linear-gradient(180deg, rgba(245,158,11,.95), rgba(245,158,11,.18))}
.dashboard-metric-danger{
  background:linear-gradient(135deg, rgba(239,68,68,.14), rgba(255,255,255,.96) 40%, rgba(239,68,68,.08));
  border-color:rgba(239,68,68,.22);
}
.dashboard-metric-danger::before{background:radial-gradient(circle, rgba(239,68,68,.18), transparent 72%)}
.dashboard-metric-danger .dashboard-metric-main{color:#b91c1c}
.dashboard-metric-danger .dashboard-metric-spark span{background:linear-gradient(180deg, rgba(239,68,68,.95), rgba(239,68,68,.18))}
.dashboard-metric-info{
  background:linear-gradient(135deg, rgba(20,120,242,.14), rgba(255,255,255,.96) 40%, rgba(125,211,252,.08));
  border-color:rgba(20,120,242,.22);
}
.dashboard-metric-info::before{background:radial-gradient(circle, rgba(20,120,242,.18), transparent 72%)}
.dashboard-metric-info .dashboard-metric-main{color:#1478F2}
.dashboard-metric-info .dashboard-metric-spark span{background:linear-gradient(180deg, rgba(20,120,242,.95), rgba(20,120,242,.18))}
.dashboard-spotlight-grid{
  display:grid;
  grid-template-columns:1.15fr .85fr;
  gap:18px;
}
.dashboard-focus-card{min-height:100%}
.dashboard-focus-layout{
  display:grid;
  grid-template-columns:220px 1fr;
  gap:22px;
  align-items:center;
}
.dashboard-ring-card{display:grid;place-items:center}
.dashboard-ring{
  width:186px;
  height:186px;
  padding:14px;
  border-radius:50%;
  display:grid;
  place-items:center;
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.4), 0 18px 30px rgba(15,23,42,.08);
}
.dashboard-ring-inner{
  width:100%;
  height:100%;
  border-radius:50%;
  background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(242,246,252,.92));
  display:grid;
  place-items:center;
  text-align:center;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7);
}
.dashboard-ring-inner span{
  font-size:12px;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:var(--muted);
  font-weight:800;
}
.dashboard-ring-inner strong{
  font-size:42px;
  line-height:1;
  letter-spacing:-.08em;
}
.dashboard-focus-list{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:12px;
}
.dashboard-focus-item{
  padding:16px;
  border-radius:18px;
  border:1px solid rgba(148,163,184,.16);
  background:linear-gradient(180deg, rgba(255,255,255,.92), rgba(243,247,252,.82));
  display:grid;
  gap:8px;
}
.dashboard-focus-item span{
  color:var(--muted);
  font-size:12px;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-weight:800;
}
.dashboard-focus-item strong{
  font-size:24px;
  letter-spacing:-.05em;
}
.dashboard-alert-wall{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:12px;
}
.dashboard-alert-card{
  padding:16px;
  border-radius:18px;
  border:1px solid rgba(148,163,184,.14);
  background:linear-gradient(180deg, rgba(255,255,255,.94), rgba(247,250,253,.88));
  display:grid;
  gap:8px;
}
.dashboard-alert-card strong{font-size:14px}
.dashboard-alert-card span{
  color:var(--muted);
  font-size:13px;
  line-height:1.55;
}
.dashboard-alert-card.warning{
  background:linear-gradient(135deg, rgba(245,158,11,.14), rgba(255,255,255,.96));
  border-color:rgba(245,158,11,.24);
}
.dashboard-alert-card.warning strong{color:#b45309}
.dashboard-alert-card.danger{
  background:linear-gradient(135deg, rgba(239,68,68,.14), rgba(255,255,255,.96));
  border-color:rgba(239,68,68,.22);
}
.dashboard-alert-card.danger strong{color:#b91c1c}
.dashboard-alert-card.info{
  background:linear-gradient(135deg, rgba(20,120,242,.12), rgba(255,255,255,.96));
  border-color:rgba(20,120,242,.22);
}
.dashboard-alert-card.info strong{color:#1478F2}
.dashboard-fold{
  border:1px solid rgba(148,163,184,.16);
  border-radius:28px;
  background:linear-gradient(180deg, rgba(255,255,255,.88), rgba(247,250,253,.82));
  box-shadow:0 18px 38px rgba(15,23,42,.08);
  overflow:hidden;
}
.dashboard-fold summary{
  list-style:none;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:22px 24px;
  cursor:pointer;
}
.dashboard-fold summary::-webkit-details-marker{display:none}
.dashboard-fold-summary-copy{
  display:grid;
  gap:6px;
}
.dashboard-fold-summary-copy strong{
  font-size:24px;
  letter-spacing:-.05em;
}
.dashboard-fold-summary-copy span{
  color:var(--muted);
  line-height:1.6;
}
.dashboard-fold-summary-meta{
  display:flex;
  align-items:center;
  gap:10px;
}
.dashboard-fold-arrow{transition:transform .2s ease}
.dashboard-fold[open] .dashboard-fold-arrow{transform:rotate(180deg)}
.dashboard-fold-body{
  padding:0 24px 24px;
  display:grid;
  gap:18px;
}
.dashboard-fold-columns{
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:18px;
}
.dashboard-nested-card{
  min-height:100%;
  border-radius:24px;
}
.dashboard-chart-grid{grid-template-columns:repeat(2, minmax(0, 1fr))}
.hero-banner,.card,.stat-card{
  background:
    linear-gradient(180deg, rgba(255,255,255,.82), rgba(255,255,255,.26)),
    var(--panel);
  border:1px solid rgba(148,163,184,.16);
  border-radius:var(--radius-lg);
  padding:24px;
  animation:panel-in .4s ease;
  transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease;
  box-shadow:0 18px 36px rgba(15,23,42,.07);
  backdrop-filter:blur(22px);
  position:relative;
  overflow:hidden;
}
.card:hover,.stat-card:hover{
  transform:translateY(-3px);
  box-shadow:0 24px 54px rgba(15,23,42,.12);
}
.hero-banner::before{
  content:"";
  position:absolute;
  inset:-10% auto auto -6%;
  width:260px;
  height:260px;
  background:radial-gradient(circle, rgba(20,120,242,.12), transparent 70%);
  pointer-events:none;
}
.hero-banner h1{font-size:48px;line-height:1; margin:12px 0; letter-spacing:-.08em}
.hero-banner p{color:var(--muted);font-size:17px;max-width:720px;line-height:1.72}
.stats-grid{
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:18px;
}
.travel-balance-card{
  position:relative;
  overflow:hidden;
  margin-bottom:18px;
  padding:24px 26px;
  border-radius:28px;
  border:1px solid rgba(148,163,184,.18);
  background:
    radial-gradient(circle at top right, rgba(96,165,250,.26), transparent 35%),
    linear-gradient(135deg, rgba(18,84,186,.96), rgba(20,120,242,.92) 38%, rgba(37,99,235,.95) 70%, rgba(14,165,233,.88));
  box-shadow:0 26px 50px rgba(29,78,216,.22);
  color:#eff6ff;
}
.travel-balance-card::before{
  content:"";
  position:absolute;
  inset:0;
  background:
    linear-gradient(120deg, rgba(255,255,255,.18), transparent 18%, transparent 52%, rgba(255,255,255,.12) 72%, transparent 100%);
  pointer-events:none;
}
.travel-balance-card-chip{
  position:relative;
  z-index:1;
  display:inline-flex;
  align-items:center;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(255,255,255,.16);
  border:1px solid rgba(255,255,255,.18);
  font-size:12px;
  font-weight:800;
  letter-spacing:.12em;
  text-transform:uppercase;
}
.travel-balance-card-brand{
  position:relative;
  z-index:1;
  margin-top:18px;
  display:grid;
  gap:6px;
}
.travel-balance-card-brand span{
  font-size:12px;
  letter-spacing:.18em;
  text-transform:uppercase;
  color:rgba(239,246,255,.72);
  font-weight:800;
}
.travel-balance-card-brand strong{
  font-size:28px;
  line-height:1;
  letter-spacing:-.05em;
  color:#ffffff;
}
.travel-balance-card-amount{
  position:relative;
  z-index:1;
  margin-top:18px;
  font-size:38px;
  line-height:1.05;
  letter-spacing:-.08em;
  font-weight:900;
  color:#ffffff;
}
.travel-balance-card-meta{
  position:relative;
  z-index:1;
  margin-top:22px;
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:14px;
}
.travel-balance-card-meta div{
  padding:14px 16px;
  border-radius:18px;
  background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.15);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12);
  display:grid;
  gap:6px;
}
.travel-balance-card-meta span{
  color:rgba(239,246,255,.74);
  font-size:11px;
  letter-spacing:.14em;
  text-transform:uppercase;
  font-weight:800;
}
.travel-balance-card-meta strong{
  color:#ffffff;
  font-size:16px;
  line-height:1.35;
}
.travel-range-toolbar{
  margin:4px 0 18px;
  padding:16px 18px;
  border-radius:22px;
  border:1px solid rgba(148,163,184,.16);
  background:linear-gradient(180deg, rgba(246,249,255,.92), rgba(255,255,255,.82));
  display:flex;
  flex-wrap:wrap;
  align-items:flex-end;
  justify-content:space-between;
  gap:16px;
}
.travel-range-toolbar-copy{
  display:grid;
  gap:4px;
}
.travel-range-toolbar-copy strong{
  color:var(--text);
  font-size:16px;
  letter-spacing:-.03em;
}
.travel-range-toolbar-copy span{
  color:var(--muted);
  font-size:13px;
}
.travel-range-toolbar-fields{
  display:flex;
  flex-wrap:wrap;
  align-items:flex-end;
  gap:12px;
}
.travel-range-toolbar-fields label{
  min-width:170px;
  display:grid;
  gap:6px;
}
.travel-range-toolbar-fields label span{
  color:var(--muted);
  font-size:11px;
  font-weight:800;
  letter-spacing:.12em;
  text-transform:uppercase;
}
.stat-card-title{font-size:12px;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;font-weight:800}
.stat-card-value{font-size:38px;font-weight:800;margin-top:12px;letter-spacing:-.06em}
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
.stat-card-indicator-success{background:#1478F2;box-shadow:0 0 0 6px rgba(16,185,129,.14), 0 0 20px rgba(16,185,129,.28)}
.stat-card-indicator-warning{background:#FF7A1A;box-shadow:0 0 0 6px rgba(245,158,11,.14), 0 0 20px rgba(245,158,11,.28)}
.stat-card-indicator-danger{background:#ef4444;box-shadow:0 0 0 6px rgba(239,68,68,.14), 0 0 20px rgba(239,68,68,.30)}
.stat-card-indicator-info{background:#1478F2;box-shadow:0 0 0 6px rgba(20,120,242,.14), 0 0 20px rgba(20,120,242,.30)}
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
  background:radial-gradient(circle, rgba(20,120,242,.10), transparent 70%);
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
  background:linear-gradient(135deg, rgba(20,120,242,.14), rgba(255,255,255,.98) 42%, rgba(125,211,252,.08));
  border-color:rgba(20,120,242,.24);
  box-shadow:0 18px 40px rgba(20,120,242,.08);
}
.stat-card-info::after{
  background:radial-gradient(circle, rgba(20,120,242,.18), transparent 70%);
}
.stat-card-info .stat-card-value{color:#1478F2}
.analytics-grid{grid-template-columns:repeat(4,1fr)}

.two-grid{
  display:grid;
  grid-template-columns:1.1fr .9fr;
  gap:18px;
}
.quick-list{display:grid;gap:12px}
.quick-item{
  padding:15px 16px;
  background:linear-gradient(135deg, rgba(255,255,255,.94), rgba(243,248,255,.90));
  border:1px solid rgba(148,163,184,.14);
  border-radius:18px;
  display:flex;justify-content:space-between;gap:10px
}

.section-title-row{
  display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;
  margin-bottom:16px;
}
.section-title-row h2{
  margin:0;
  font-size:28px;
  letter-spacing:-.06em;
}
.section-title-row p{
  margin:8px 0 0;
  color:var(--muted);
  line-height:1.7;
}
.toolbar-actions{display:flex;gap:8px;flex-wrap:wrap}
.table-search{
  min-width:min(100%, 320px);
  display:flex;
  align-items:center;
  gap:10px;
  padding:13px 15px;
  border-radius:20px;
  border:1px solid rgba(148,163,184,.14);
  background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(240,245,252,.92));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 10px 20px rgba(148,163,184,.08);
  color:var(--muted);
}
.table-search input{
  width:100%;
  border:none;
  background:transparent;
  color:var(--text);
}
.table-search input::placeholder{
  color:var(--muted);
}
.table-filter{
  min-width:min(100%, 220px);
  display:flex;
  align-items:center;
  gap:10px;
  padding:13px 15px;
  border-radius:20px;
  border:1px solid rgba(148,163,184,.14);
  background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(240,245,252,.92));
  box-shadow:inset 0 1px 0 rgba(255,255,255,.7), 0 10px 20px rgba(148,163,184,.08);
  color:var(--muted);
}
.table-filter select{
  width:100%;
  border:none;
  background:transparent;
  color:var(--text);
}
.mb12{margin-bottom:12px}
.info-banner{
  margin-bottom:14px;
  padding:14px 16px;
  border-radius:16px;
  background:linear-gradient(135deg, rgba(29,78,216,.08), rgba(20,120,242,.08), rgba(110,231,183,.08));
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
  background:linear-gradient(135deg, rgba(29,78,216,.1), rgba(20,120,242,.16));
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
  gap:16px;
}
.form-grid label{
  display:grid;
  gap:8px;
}
.form-grid label span{
  font-size:12px;
  color:var(--muted);
  text-transform:uppercase;
  letter-spacing:.08em;
  font-weight:800;
}
.field-note{font-size:12px;color:var(--muted)}
.form-grid input,.form-grid select,.form-grid textarea{
  width:100%;
  background:linear-gradient(180deg, rgba(255,255,255,.86), rgba(242,248,255,.92));
  border:1px solid rgba(140,166,198,.20);
  color:var(--text);
  border-radius:18px;
  padding:14px 16px;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.72), 0 10px 22px rgba(148,163,184,.08);
  transition:border-color .2s ease, box-shadow .2s ease, transform .2s ease, background .2s ease;
}
.form-grid input::placeholder,.form-grid textarea::placeholder{
  color:color-mix(in srgb, var(--muted) 80%, transparent);
}
.form-grid input:focus,.form-grid select:focus,.form-grid textarea:focus{
  outline:none;
  border-color:rgba(31,99,237,.34);
  box-shadow:0 0 0 5px rgba(31,99,237,.10), 0 16px 28px rgba(20,120,242,.12);
  transform:translateY(-1px);
}
:root[data-theme='dark'] .form-grid input,
:root[data-theme='dark'] .form-grid select,
:root[data-theme='dark'] .form-grid textarea{
  background:linear-gradient(180deg, rgba(17,25,40,.88), rgba(10,18,32,.96));
  border-color:rgba(96,165,250,.18);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.02), 0 12px 24px rgba(2,8,23,.28);
}
.full-col{grid-column:1 / -1}
.mt16{margin-top:16px}

.btn{
  border:1px solid transparent;
  border-radius:18px;
  padding:13px 16px;
  cursor:pointer;
  font-weight:700;
  display:inline-flex;
  align-items:center;
  gap:8px;
  justify-content:center;
  position:relative;
  overflow:hidden;
  transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease, background .2s ease, color .2s ease;
  box-shadow:0 16px 32px rgba(148,163,184,.12);
}
.btn::after{
  content:"";
  position:absolute;
  inset:0 auto 0 -40%;
  width:38%;
  transform:skewX(-18deg);
  background:linear-gradient(90deg, transparent, rgba(255,255,255,.36), transparent);
  opacity:0;
  transition:opacity .2s ease;
}
.btn:hover{
  transform:translateY(-2px);
}
.btn:hover::after{
  opacity:1;
  animation:button-shimmer 1.15s ease;
}
.btn:active{
  transform:translateY(0);
}
.btn.primary{
  background:linear-gradient(135deg, var(--blue-strong), var(--blue), #62d2ff);
  color:#fff;
  box-shadow:0 20px 36px rgba(31,99,237,.26);
}
.btn.secondary{
  background:linear-gradient(135deg, rgba(255,255,255,.94), rgba(236,245,255,.92));
  border-color:rgba(140,166,198,.20);
  color:var(--text);
}
.btn.large{padding:15px 18px}
.btn.tiny{
  padding:9px 11px;
  font-size:12px;
  border-radius:14px;
}
.link-btn{
  border:0;
  background:transparent;
  color:var(--blue);
  cursor:pointer;
  padding:0;
  font-weight:700;
  transition:opacity .2s ease, transform .2s ease;
}
.link-btn:hover{
  opacity:.84;
  transform:translateX(1px);
}

.summary-pill{
  margin-bottom:16px;
  padding:16px 18px;
  border-radius:20px;
  background:linear-gradient(135deg, rgba(255,255,255,.88), rgba(232,242,255,.84));
  border:1px solid rgba(140,166,198,.18);
  box-shadow:var(--shadow-soft);
}

.upload-row{
  display:flex;
  gap:12px;
  align-items:center;
  flex-wrap:wrap;
}
.upload-row input[type="file"]{
  background:linear-gradient(135deg, rgba(255,255,255,.92), rgba(236,245,255,.88));
  border:1px dashed rgba(140,166,198,.28);
  border-radius:18px;
  padding:13px 14px;
  color:var(--text);
}

.table-wrap{
  overflow:auto;
  border:1px solid rgba(140,166,198,.18);
  border-radius:22px;
  background:linear-gradient(180deg, rgba(255,255,255,.88), rgba(245,250,255,.86));
  box-shadow:var(--shadow-soft);
  backdrop-filter:blur(12px);
}
.desktop-table{display:block}
.mobile-card-list{display:none}
.mobile-record-card{
  display:grid;
  gap:12px;
  padding:16px;
  border:1px solid rgba(140,166,198,.18);
  border-radius:22px;
  background:linear-gradient(150deg, rgba(255,255,255,.94), rgba(240,247,255,.90));
  box-shadow:0 16px 30px rgba(148,163,184,.10);
}
.mobile-record-card.empty{
  text-align:center;
  color:var(--muted);
  place-items:center;
}
.mobile-record-card.danger{
  border-color:rgba(239,68,68,.22);
  background:linear-gradient(135deg, rgba(239,68,68,.08), rgba(255,255,255,.98));
}
.mobile-record-card.bonus{
  background:linear-gradient(135deg, rgba(20,120,242,.08), rgba(255,255,255,.98));
}
.mobile-record-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:10px;
}
.mobile-record-title{
  display:grid;
  gap:4px;
}
.mobile-record-title strong{
  font-size:15px;
  line-height:1.35;
}
.mobile-record-title span{
  font-size:12px;
  color:var(--muted);
}
.mobile-record-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:10px 12px;
}
.mobile-record-field{
  display:grid;
  gap:4px;
}
.mobile-record-field.full{
  grid-column:1 / -1;
}
.mobile-record-field label{
  font-size:11px;
  letter-spacing:.06em;
  text-transform:uppercase;
  color:var(--muted);
}
.mobile-record-field div{
  font-size:13px;
  line-height:1.45;
  color:var(--text);
}
.mobile-record-actions{
  display:flex;
  justify-content:flex-end;
  padding-top:8px;
  border-top:1px solid rgba(140,166,198,.16);
}
table{width:100%;border-collapse:collapse}
.table-wrap table{min-width:100%}
th,td{
  padding:14px 16px;
  border-bottom:1px solid rgba(140,166,198,.14);
  text-align:left;
  vertical-align:middle;
}
th{
  position:sticky;
  top:0;
  z-index:1;
  background:linear-gradient(180deg, rgba(232,242,255,.94), rgba(245,250,255,.98));
  color:var(--muted);
  font-size:12px;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-weight:800;
}
tbody tr{
  transition:background .2s ease, transform .2s ease;
}
tbody tr:hover{
  background:linear-gradient(90deg, rgba(20,120,242,.06), rgba(20,120,242,.04), transparent 85%);
}
.empty-cell{text-align:center;color:var(--muted);padding:24px}
.table-title-cell{
  display:grid;
  gap:6px;
  min-width:230px;
}
.table-title-main{
  font-size:15px;
  line-height:1.4;
  letter-spacing:-.01em;
  display:inline-flex;
  align-items:center;
  gap:7px;
}
.academy-cap{
  width:24px;
  height:24px;
  border-radius:10px;
  display:inline-grid;
  place-items:center;
  color:#047857;
  background:#dcfce7;
  border:1px solid #bbf7d0;
  flex:0 0 auto;
}
.customer-cap{
  width:24px;
  height:24px;
  border-radius:10px;
  display:inline-grid;
  place-items:center;
  color:#b45309;
  background:#fef3c7;
  border:1px solid #fde68a;
  flex:0 0 auto;
}
.services-cap{
  width:24px;
  height:24px;
  border-radius:10px;
  display:inline-grid;
  place-items:center;
  color:#0369a1;
  background:#e0f2fe;
  border:1px solid #bae6fd;
  flex:0 0 auto;
}
.academy-content-row{
  background:linear-gradient(90deg,rgba(34,197,94,.12),rgba(240,253,244,.65) 52%,transparent) !important;
}
.academy-content-row td:first-child{
  box-shadow:inset 5px 0 0 #22c55e;
}
.customer-content-row{
  background:linear-gradient(90deg,rgba(245,158,11,.14),rgba(255,251,235,.72) 52%,transparent) !important;
}
.customer-content-row td:first-child{
  box-shadow:inset 5px 0 0 #f59e0b;
}
.services-content-row{
  background:linear-gradient(90deg,rgba(14,165,233,.13),rgba(240,249,255,.72) 52%,transparent) !important;
}
.services-content-row td:first-child{
  box-shadow:inset 5px 0 0 #0ea5e9;
}
.academy-content-card{
  border-color:#bbf7d0 !important;
  background:linear-gradient(135deg,#f0fdf4,#ffffff) !important;
}
.customer-content-card{
  border-color:#fde68a !important;
  background:linear-gradient(135deg,#fffbeb,#ffffff) !important;
}
.services-content-card{
  border-color:#bae6fd !important;
  background:linear-gradient(135deg,#f0f9ff,#ffffff) !important;
}
.mobile-record-title strong svg{
  margin-right:6px;
  vertical-align:-2px;
}
.table-title-sub{
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
  font-size:12px;
  color:var(--muted);
}
.table-inline-link{
  border:0;
  background:rgba(20,120,242,.10);
  color:#1478F2;
  border-radius:999px;
  padding:6px 10px;
  font-size:12px;
  font-weight:800;
  cursor:pointer;
}
.table-inline-link:hover{background:rgba(20,120,242,.16)}
.table-date-stack{
  display:grid;
  gap:4px;
  white-space:nowrap;
}
.table-date-stack strong{font-size:14px}
.table-date-stack span{
  font-size:12px;
  color:var(--muted);
}
.table-chip-row{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
}
.table-chip{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  padding:7px 11px;
  border-radius:999px;
  border:1px solid transparent;
  font-size:12px;
  font-weight:800;
  line-height:1;
  white-space:nowrap;
}
.table-chip.platform{
  background:linear-gradient(135deg, rgba(15,23,42,.05), rgba(148,163,184,.10));
  color:#475569;
  border-color:rgba(148,163,184,.18);
}
.table-chip.default{
  background:linear-gradient(135deg, rgba(148,163,184,.14), rgba(255,255,255,.96));
  color:#64748b;
  border-color:rgba(148,163,184,.18);
}
.table-chip.success{
  background:linear-gradient(135deg, rgba(16,185,129,.14), rgba(255,255,255,.98));
  color:#047857;
  border-color:rgba(16,185,129,.20);
}
.table-chip.warning{
  background:linear-gradient(135deg, rgba(245,158,11,.14), rgba(255,255,255,.98));
  color:#b45309;
  border-color:rgba(245,158,11,.20);
}
.table-chip.danger{
  background:linear-gradient(135deg, rgba(239,68,68,.14), rgba(255,255,255,.98));
  color:#b91c1c;
  border-color:rgba(239,68,68,.18);
}
.table-chip.info{
  background:linear-gradient(135deg, rgba(20,120,242,.14), rgba(255,255,255,.98));
  color:#1478F2;
  border-color:rgba(20,120,242,.18);
}
.table-chip.academy{
  background:linear-gradient(135deg,rgba(34,197,94,.16),rgba(240,253,244,.98));
  color:#047857;
  border-color:#bbf7d0;
}
.table-chip.customer{
  background:linear-gradient(135deg,rgba(245,158,11,.18),rgba(255,251,235,.98));
  color:#b45309;
  border-color:#fde68a;
}
.table-chip.services{
  background:linear-gradient(135deg,rgba(14,165,233,.16),rgba(240,249,255,.98));
  color:#0369a1;
  border-color:#bae6fd;
}
.table-person-stack{
  display:flex;
  flex-wrap:wrap;
  gap:8px;
  max-width:260px;
}
.table-person{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:7px 11px;
  border-radius:14px;
  background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(239,245,252,.90));
  border:1px solid rgba(148,163,184,.16);
  font-size:12px;
  font-weight:800;
  color:var(--text);
}
.table-person::before{
  content:"";
  width:7px;
  height:7px;
  border-radius:999px;
  background:linear-gradient(135deg,#0ea5e9,#1478F2);
  box-shadow:0 0 10px rgba(14,165,233,.35);
}
.table-compact-metric{
  display:inline-flex;
  min-width:38px;
  justify-content:center;
  padding:7px 10px;
  border-radius:12px;
  background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(237,244,252,.92));
  border:1px solid rgba(148,163,184,.16);
  font-weight:900;
}
.table-compact-metric.approved{
  color:#1478F2;
  border-color:rgba(20,120,242,.18);
  background:linear-gradient(135deg, rgba(20,120,242,.10), rgba(255,255,255,.96));
}
.table-compact-amount{
  display:inline-flex;
  align-items:center;
  padding:8px 12px;
  border-radius:14px;
  background:linear-gradient(135deg, rgba(16,185,129,.12), rgba(255,255,255,.98));
  border:1px solid rgba(16,185,129,.18);
  color:#047857;
  font-weight:900;
  white-space:nowrap;
}
.table-actions-shell{
  display:flex;
  justify-content:flex-end;
  padding:4px;
  border-radius:18px;
  background:linear-gradient(180deg, rgba(255,255,255,.88), rgba(241,247,255,.8));
  border:1px solid rgba(148,163,184,.14);
}
.table-cell-muted{
  color:var(--muted);
  font-size:12px;
}
.summary-row{
  background:linear-gradient(90deg, rgba(20,120,242,.08), rgba(110,231,183,.08));
}
.bonus-approval-meta{
  margin:0 0 14px;
  color:var(--muted);
  font-size:14px;
}
.bonus-approval-stack{
  display:grid;
  gap:16px;
}
.bonus-approval-summary{
  display:grid;
  gap:12px;
}
.bonus-approval-footer{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  flex-wrap:wrap;
}
.bonus-approval-total{
  display:flex;
  align-items:center;
  gap:16px;
  flex-wrap:wrap;
  color:var(--muted);
}
.bonus-approval-total strong{
  color:var(--text);
}
.bonus-approval-input{
  width:92px;
  background:rgba(248,251,255,.92);
  border:1px solid rgba(20,120,242,.16);
  border-radius:12px;
  padding:10px 12px;
  color:var(--text);
}
.bonus-approval-input:focus{
  outline:none;
  border-color:rgba(20,120,242,.4);
  box-shadow:0 0 0 4px rgba(20,120,242,.10);
}
.table-actions{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.table-row-success{background:linear-gradient(90deg, rgba(16,185,129,.08), transparent 55%)}
.table-row-info{background:linear-gradient(90deg, rgba(20,120,242,.08), transparent 55%)}
.table-row-warning{background:linear-gradient(90deg, rgba(245,158,11,.08), transparent 55%)}
.table-row-danger{background:linear-gradient(90deg, rgba(239,68,68,.08), transparent 55%)}

.error-box{
  background:rgba(239,90,90,.10);
  color:#db4f4f;
  border:1px solid rgba(239,90,90,.18);
  padding:12px 14px;
  border-radius:14px;
}

.success-overlay{
  position:fixed;
  inset:0;
  display:grid;
  place-items:center;
  padding:24px;
  z-index:10060;
  pointer-events:none;
}
.success-wrapper{
  width:min(100%, 420px);
  background:linear-gradient(145deg, rgba(255,255,255,.96), rgba(244,249,255,.92));
  padding:50px 34px;
  border-radius:28px;
  box-shadow:0 28px 60px -10px rgba(15,23,42,.18);
  text-align:center;
  border:1px solid rgba(140,166,198,.18);
  backdrop-filter:blur(16px);
}
.delete-wrapper{
  width:min(100%, 400px);
  background:linear-gradient(145deg, rgba(255,255,255,.98), rgba(255,243,243,.96));
  padding:42px 34px;
  border-radius:28px;
  box-shadow:0 28px 60px -10px rgba(127,29,29,.18);
  text-align:center;
  border:1px solid rgba(248,113,113,.2);
  backdrop-filter:blur(16px);
}
.icon-wrap{
  margin-bottom:20px;
  transform:scale(0);
  animation:success-pop-in .6s cubic-bezier(0.34, 1.56, 0.64, 1.3) forwards;
}
.delete-icon-wrap{
  margin-bottom:18px;
  transform:scale(.92);
  opacity:0;
  animation:delete-pop-in .45s ease forwards;
}
.success-circle{
  stroke-dasharray:252;
  stroke-dashoffset:252;
  animation:success-draw-circle .6s cubic-bezier(0.34, 1.56, 0.64, 1) .2s forwards;
}
.success-check{
  stroke-dasharray:50;
  stroke-dashoffset:50;
  animation:success-draw-check .4s cubic-bezier(0.34, 1.56, 0.64, 1) .7s forwards;
}
.success-wrapper h2{
  margin:0 0 10px;
  color:var(--text);
  font-family:"Manrope","Inter","Segoe UI",sans-serif;
  font-size:1.75rem;
  letter-spacing:-.05em;
  opacity:0;
  transform:translateY(10px);
  animation:success-fade-up .5s ease 1s forwards;
}
.success-wrapper p{
  color:var(--muted);
  margin:0;
  font-size:1.05rem;
  line-height:1.65;
  opacity:0;
  transform:translateY(10px);
  animation:success-fade-up .5s ease 1.2s forwards;
}
.delete-wrapper h2{
  margin:10px 0 10px;
  color:#b91c1c;
  font-family:"Manrope","Inter","Segoe UI",sans-serif;
  font-size:1.7rem;
  letter-spacing:-.04em;
  opacity:0;
  animation:success-fade-up .45s ease .95s forwards;
}
.delete-wrapper p{
  color:#7f1d1d;
  margin:0;
  font-size:1.03rem;
  line-height:1.6;
  opacity:0;
  animation:success-fade-up .45s ease 1.12s forwards;
}
:root[data-theme='dark'] .success-wrapper{
  background:linear-gradient(145deg, rgba(10,18,32,.98), rgba(17,25,40,.94));
  box-shadow:0 28px 60px -10px rgba(2,8,23,.5);
}
:root[data-theme='dark'] .delete-wrapper{
  background:linear-gradient(145deg, rgba(36,10,10,.98), rgba(47,14,14,.95));
  box-shadow:0 28px 60px -10px rgba(2,8,23,.56);
  border-color:rgba(248,113,113,.22);
}
:root[data-theme='dark'] .delete-wrapper h2{color:#fca5a5}
:root[data-theme='dark'] .delete-wrapper p{color:#fecaca}
.delete-line{
  stroke-dasharray:20;
  stroke-dashoffset:0;
  animation:delete-lines .8s ease forwards;
}
.delete-line-one{animation-delay:.2s}
.delete-line-two{animation-delay:.4s}
.delete-line-three{animation-delay:.6s}
.toast{
  position:fixed;
  right:20px;bottom:20px;
  min-width:320px;
  display:flex;justify-content:space-between;align-items:center;gap:14px;
  padding:18px 20px;
  border-radius:24px;
  color:#fff;
  z-index:9999;
  box-shadow:0 26px 60px rgba(0,0,0,.28);
  overflow:hidden;
  animation:toast-in .35s ease;
  backdrop-filter:blur(12px);
}
.toast-success{background:linear-gradient(135deg,#0a7c4a,#1478F2,#4fd1c5)}
.toast-error{background:linear-gradient(135deg,#c62828,#ef4444,#fb7185)}
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
  border:1px solid rgba(255,255,255,.22);
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
@keyframes delete-pop-in{
  from{transform:scale(.82);opacity:0}
  to{transform:scale(1);opacity:1}
}
@keyframes delete-lines{
  to{
    stroke-dashoffset:20;
    opacity:0;
  }
}
@keyframes success-pop-in{
  0%{transform:scale(0)}
  80%{transform:scale(1.1)}
  100%{transform:scale(1)}
}
@keyframes success-draw-circle{
  to{stroke-dashoffset:0}
}
@keyframes success-draw-check{
  to{stroke-dashoffset:0}
}
@keyframes success-fade-up{
  to{opacity:1;transform:translateY(0)}
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
  background:
    linear-gradient(180deg, rgba(255,255,255,.94), rgba(244,249,255,.92));
  border-left:1px solid rgba(140,166,198,.18);
  transform:translateX(100%);
  transition:.24s;
  padding:22px;
  display:flex;
  flex-direction:column;
  gap:16px;
  backdrop-filter:blur(18px);
  box-shadow:-24px 0 60px rgba(15,23,42,.12);
}
.drawer.open .drawer-panel{transform:translateX(0)}
.drawer-head{
  display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap
}
.drawer-head h3{margin:6px 0 0;font-size:24px}
.drawer-list{display:grid;gap:12px;overflow:auto}
.notif-card{
  padding:16px 18px;
  border-radius:18px;
  border:1px solid rgba(140,166,198,.16);
  background:linear-gradient(135deg, rgba(255,255,255,.92), rgba(240,247,255,.88));
  box-shadow:0 14px 24px rgba(148,163,184,.08);
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
  border:1px solid rgba(140,166,198,.18);
  border-radius:20px;
  padding:18px;
  background:linear-gradient(150deg, rgba(255,255,255,.90), rgba(240,247,255,.88));
  box-shadow:var(--shadow-soft);
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
  background:linear-gradient(135deg, rgba(255,255,255,.92), rgba(243,248,255,.88));
  border:1px solid rgba(140,166,198,.18);
  border-radius:16px;
  padding:12px 13px;
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
  background:linear-gradient(135deg, rgba(20,120,242,.16), rgba(255,255,255,.96));
  color:#1478F2;
  border-color:rgba(20,120,242,.24);
}
.status-badge.doing::before{background:#1478F2;box-shadow:0 0 12px rgba(20,120,242,.35)}
.status-badge.warning{
  background:linear-gradient(135deg, rgba(245,158,11,.16), rgba(255,255,255,.96));
  color:#b45309;
  border-color:rgba(245,158,11,.24);
}
.status-badge.warning::before{background:#FF7A1A;box-shadow:0 0 12px rgba(245,158,11,.35)}
.status-badge.done{
  background:linear-gradient(135deg, rgba(34,197,94,.16), rgba(255,255,255,.96));
  color:#15803d;
  border-color:rgba(34,197,94,.22);
}
.status-badge.done::before{background:#1478F2;box-shadow:0 0 12px rgba(34,197,94,.35)}
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
.priority-badge.low::before{background:#1478F2}
.priority-badge.medium{
  background:linear-gradient(135deg, rgba(245,158,11,.14), rgba(255,255,255,.96));
  color:#d97706;
  border-color:rgba(245,158,11,.24);
}
.priority-badge.medium::before{background:#FF7A1A}
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
.mini-badge.success::before{background:#1478F2}
.mini-badge.warning{
  background:linear-gradient(135deg, rgba(245,158,11,.16), rgba(255,255,255,.96));
  color:#b45309;
  border-color:rgba(245,158,11,.24);
}
.mini-badge.warning::before{background:#FF7A1A}
.mini-badge.danger{
  background:linear-gradient(135deg, rgba(239,68,68,.16), rgba(255,255,255,.96));
  color:#b91c1c;
  border-color:rgba(239,68,68,.22);
}
.mini-badge.danger::before{background:#ef4444}
.mini-badge.info{
  background:linear-gradient(135deg, rgba(20,120,242,.16), rgba(255,255,255,.96));
  color:#1478F2;
  border-color:rgba(20,120,242,.24);
}
.mini-badge.info::before{background:#1478F2}
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
.expense-bar-fill.servis{background:linear-gradient(90deg, #1478F2, #0B63D1)}
.expense-bar-fill.reklama{background:linear-gradient(90deg, #1478F2, #0B63D1)}
.expense-bar-fill.safar{background:linear-gradient(90deg, #FF7A1A, #fde68a)}
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
  border-color:rgba(20,120,242,.22);
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
.timeline-dot.warning{background:#FF7A1A}
.timeline-dot.doing{background:#1478F2}
.timeline-dot.done{background:#1478F2}
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
  border:1px solid rgba(140,166,198,.18);
  background:linear-gradient(135deg, rgba(255,255,255,.94), rgba(236,245,255,.90));
  color:var(--text);
  width:38px;
  height:38px;
  border-radius:14px;
  display:grid;
  place-items:center;
  cursor:pointer;
  box-shadow:0 12px 24px rgba(148,163,184,.10);
  transition:transform .2s ease, box-shadow .2s ease, border-color .2s ease;
}
.icon-btn:hover{
  transform:translateY(-1px);
  box-shadow:0 16px 28px rgba(20,120,242,.12);
  border-color:rgba(31,99,237,.20);
}
.icon-btn.danger{
  color:var(--danger);
}
.inline-link-field{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:8px;
  align-items:center;
}
.inline-link-field .icon-btn{
  flex:0 0 auto;
}

.modal-wrap{
  position:fixed;
  inset:0;
  z-index:10000;
}
.modal-backdrop{
  position:absolute;
  inset:0;
  background:rgba(7,10,24,.42);
  backdrop-filter:blur(8px);
}
.modal-card{
  position:relative;
  z-index:2;
  width:min(720px, calc(100vw - 32px));
  margin:48px auto;
  background:
    linear-gradient(150deg, rgba(255,255,255,.96), rgba(242,248,255,.92));
  border:1px solid rgba(140,166,198,.18);
  border-radius:28px;
  padding:22px;
  box-shadow:0 34px 80px rgba(15,23,42,.18);
  backdrop-filter:blur(18px);
}
.modal-card.wide{
  width:min(980px, calc(100vw - 32px));
}
.modal-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  margin-bottom:18px;
}
.modal-head h3{
  margin:0;
  font-family:"Manrope","Inter","Segoe UI",sans-serif;
  font-size:24px;
  letter-spacing:-.03em;
}
.modal-body{
  max-height:75vh;
  overflow:auto;
  padding-right:2px;
}
:root[data-theme='dark'] .loading-card,
:root[data-theme='dark'] .table-wrap,
:root[data-theme='dark'] .mobile-record-card,
:root[data-theme='dark'] .summary-pill,
:root[data-theme='dark'] .notif-card,
:root[data-theme='dark'] .permission-box,
:root[data-theme='dark'] .permission-item,
:root[data-theme='dark'] .drawer-panel,
:root[data-theme='dark'] .modal-card,
:root[data-theme='dark'] .icon-btn,
:root[data-theme='dark'] .btn.secondary{
  background:
    linear-gradient(150deg, rgba(10,18,32,.96), rgba(15,23,42,.92));
}
:root[data-theme='dark'] th{
  background:linear-gradient(180deg, rgba(18,28,46,.96), rgba(10,18,32,.98));
}
:root[data-theme='dark'] tbody tr:hover{
  background:rgba(96,165,250,.08);
}
.detail-grid{
  display:grid;
  grid-template-columns:repeat(2,1fr);
  gap:12px;
}
.modal-card{
  isolation:isolate;
}
.modal-card::before{
  content:"";
  position:absolute;
  inset:0;
  z-index:-1;
  border-radius:inherit;
  background:
    radial-gradient(circle at 18% 0%, rgba(20,120,242,.14), transparent 32%),
    radial-gradient(circle at 92% 20%, rgba(34,197,94,.13), transparent 30%);
  pointer-events:none;
}
.modal-head{
  padding-bottom:14px;
  border-bottom:1px solid rgba(148,163,184,.14);
}
.modal-head .icon-btn{
  width:42px;
  height:42px;
  border-radius:16px;
  background:linear-gradient(180deg,#fff,#eef6ff);
  box-shadow:0 12px 28px rgba(15,23,42,.10);
}
.detail-grid{
  gap:14px;
}
.detail-grid > div{
  min-height:70px;
  padding:15px 16px;
  border:1px solid rgba(148,163,184,.16);
  border-radius:18px;
  background:linear-gradient(145deg,rgba(255,255,255,.98),rgba(241,247,255,.90));
  box-shadow:0 12px 28px rgba(15,23,42,.06);
  color:var(--text);
  line-height:1.45;
}
.detail-grid > div.full-col{
  min-height:auto;
}
.detail-grid strong{
  display:block;
  margin-bottom:5px;
  color:var(--muted);
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.06em;
}
.detail-grid a{
  display:inline-flex;
  align-items:center;
  min-height:34px;
  padding:7px 11px;
  border-radius:12px;
  background:linear-gradient(135deg,rgba(20,120,242,.12),rgba(34,197,94,.10));
  border:1px solid rgba(20,120,242,.16);
  color:#0f6fd4;
  font-weight:900;
  text-decoration:none;
}
.discussion-panel{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:18px;
  margin-top:18px;
}
.discussion-col{
  display:grid;
  gap:12px;
  padding:16px;
  border:1px solid rgba(148,163,184,.16);
  border-radius:22px;
  background:linear-gradient(145deg,rgba(255,255,255,.94),rgba(248,250,252,.88));
  box-shadow:0 14px 34px rgba(15,23,42,.06);
}
.discussion-col h4{
  margin:0;
  color:var(--text);
  font-size:15px;
  font-weight:950;
}
.discussion-list{
  display:grid;
  gap:10px;
}
.discussion-list .empty-block{
  min-height:72px;
  display:grid;
  place-items:center;
  border-radius:18px;
  background:linear-gradient(180deg,rgba(248,250,252,.82),rgba(255,255,255,.74));
}
.discussion-item,
.attachment-item{
  display:grid;
  gap:7px;
  padding:13px;
  border:1px solid rgba(148,163,184,.16);
  border-radius:16px;
  background:#fff;
  box-shadow:0 10px 22px rgba(15,23,42,.05);
}
.discussion-item strong,
.attachment-item strong{
  color:var(--text);
}
.discussion-item span,
.attachment-item span{
  color:var(--muted);
  font-size:12px;
}
.discussion-item p{
  margin:0;
  color:var(--text);
  line-height:1.45;
}
.discussion-form,
.discussion-upload{
  display:grid;
  grid-template-columns:minmax(0,1fr) auto;
  gap:10px;
  align-items:center;
}
.discussion-form input{
  min-height:48px;
  border-radius:16px;
  border:1px solid rgba(148,163,184,.22);
  padding:0 14px;
  background:#fff;
  color:var(--text);
  font:inherit;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.8);
}
.discussion-form input:focus{
  outline:none;
  border-color:rgba(20,120,242,.45);
  box-shadow:0 0 0 4px rgba(20,120,242,.10);
}
.file-picker{
  min-height:48px;
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 14px;
  border-radius:16px;
  border:1px dashed rgba(20,120,242,.35);
  background:linear-gradient(135deg,rgba(20,120,242,.08),rgba(255,255,255,.96));
  color:var(--text);
  font-weight:850;
  cursor:pointer;
  min-width:0;
}
.file-picker span{
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.file-picker input{
  position:absolute;
  width:1px;
  height:1px;
  opacity:0;
  pointer-events:none;
}
.content-list-card table,
.card:has(.bonus-command-card) table{
  border-collapse:separate;
  border-spacing:0 8px;
}
.content-list-card tbody tr,
.page-grid > .card tbody tr{
  box-shadow:0 10px 24px rgba(15,23,42,.045);
}
.content-list-card td,
.page-grid > .card td{
  background:rgba(255,255,255,.92);
  border-top:1px solid rgba(148,163,184,.12);
  border-bottom:1px solid rgba(148,163,184,.12);
}
.content-list-card td:first-child,
.page-grid > .card td:first-child{
  border-left:1px solid rgba(148,163,184,.12);
  border-radius:16px 0 0 16px;
}
.content-list-card td:last-child,
.page-grid > .card td:last-child{
  border-right:1px solid rgba(148,163,184,.12);
  border-radius:0 16px 16px 0;
}
.content-control-panel,
.bonus-command-card,
.bonus-plastic-section{
  animation:panelRise .35s ease both;
}
@keyframes panelRise{
  from{opacity:0;transform:translateY(8px)}
  to{opacity:1;transform:translateY(0)}
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
  border-color:rgba(20,120,242,.26);
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
  border-color:rgba(20,120,242,.45);
  box-shadow:0 0 0 2px rgba(20,120,242,.10);
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
  background:rgba(20,120,242,.10);
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
.workflow-step.doing{background:rgba(20,120,242,.10)}
.workflow-step.done{background:rgba(16,185,129,.10)}
.line-dot.spend{
  background:linear-gradient(180deg,#fb7185,#f97316);
  box-shadow:0 0 0 6px rgba(249,115,22,.14);
}
.bar-track.branch i{
  background:linear-gradient(90deg,#1478F2,#0B63D1);
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
.audit-dot-create{background:#1478F2;box-shadow:0 0 0 6px rgba(16,185,129,.12)}
.audit-dot-update{background:#1478F2;box-shadow:0 0 0 6px rgba(20,120,242,.12)}
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
.presence-dot.online,.presence-pill.online{background:#1478F2;color:#065f46}
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
.bonus-plastic-section{
  display:grid;
  gap:14px;
}
.content-control-grid,
.bonus-command-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:16px;
  margin-top:18px;
}
.bonus-command-grid{
  grid-template-columns:1.05fr .95fr;
}
.content-control-panel,
.bonus-command-card{
  position:relative;
  overflow:hidden;
  border:1px solid rgba(15,23,42,.08);
  border-radius:22px;
  padding:18px;
  background:linear-gradient(180deg,rgba(255,255,255,.96),rgba(248,250,252,.9));
  box-shadow:0 16px 34px rgba(15,23,42,.08);
}
.content-control-panel::before,
.bonus-command-card::before{
  content:"";
  position:absolute;
  inset:0 0 auto 0;
  height:4px;
  background:linear-gradient(90deg,#16a34a,#06b6d4,#6366f1);
}
.content-control-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-bottom:12px;
}
.content-control-head strong{
  color:var(--text);
  font-size:15px;
}
.content-control-head span{
  color:var(--muted);
  font-size:12px;
  font-weight:800;
}
.deadline-list,
.signal-list,
.approval-history-mini,
.leaderboard-list,
.audit-mini-list{
  display:grid;
  gap:10px;
}
.deadline-item,
.approval-history-mini button{
  width:100%;
  display:grid;
  gap:5px;
  text-align:left;
  border:1px solid rgba(15,23,42,.08);
  border-radius:16px;
  padding:12px;
  background:#fff;
  color:var(--text);
  cursor:pointer;
}
.deadline-item span,
.approval-history-mini strong{
  font-weight:900;
}
.deadline-item strong,
.deadline-item small,
.approval-history-mini small{
  color:var(--muted);
  font-size:12px;
}
.deadline-item.warning{
  border-color:rgba(245,158,11,.35);
  background:#fffbeb;
}
.deadline-item.danger{
  border-color:rgba(239,68,68,.35);
  background:#fef2f2;
}
.signal-item{
  display:grid;
  gap:5px;
  border-radius:16px;
  padding:12px;
  background:#eef6ff;
  border:1px solid rgba(20,120,242,.18);
}
.signal-item strong{
  color:var(--text);
}
.signal-item span{
  color:var(--muted);
  font-size:13px;
  line-height:1.45;
}
.signal-item.warning{
  background:#fffbeb;
  border-color:rgba(245,158,11,.25);
}
.signal-item.danger{
  background:#fef2f2;
  border-color:rgba(239,68,68,.25);
}
.signal-item.success{
  background:#F7F7F7;
  border-color:rgba(16,185,129,.22);
}
.bonus-close-grid{
  margin-top:14px;
}
.leaderboard-row{
  display:grid;
  grid-template-columns:auto minmax(0,1fr) auto;
  align-items:center;
  gap:12px;
  border:1px solid rgba(15,23,42,.08);
  border-radius:16px;
  padding:12px;
  background:#fff;
}
.leaderboard-rank{
  display:grid;
  place-items:center;
  width:34px;
  height:34px;
  border-radius:12px;
  background:#052e16;
  color:#bbf7d0;
  font-weight:950;
}
.leaderboard-row strong,
.leaderboard-row b{
  color:var(--text);
}
.leaderboard-row small{
  display:block;
  color:var(--muted);
  margin-top:3px;
}
.audit-mini-row{
  display:grid;
  grid-template-columns:1fr auto;
  gap:4px 12px;
  border:1px solid rgba(15,23,42,.08);
  border-radius:16px;
  padding:12px;
  background:#fff;
}
.audit-mini-row span{
  color:var(--text);
  font-weight:900;
  text-transform:capitalize;
}
.audit-mini-row strong,
.audit-mini-row small{
  color:var(--muted);
  font-size:12px;
}
.bonus-drilldown{
  display:grid;
  gap:18px;
}
.calendar-pro-shell{
  display:grid;
  gap:16px;
}
.calendar-pro-toolbar{
  display:grid;
  grid-template-columns:1.2fr 1fr minmax(160px,.7fr) minmax(180px,.8fr);
  gap:12px;
  align-items:stretch;
}
.calendar-pro-toolbar label,
.calendar-signal-card{
  display:grid;
  gap:8px;
  padding:14px;
  border:1px solid rgba(148,163,184,.16);
  border-radius:18px;
  background:linear-gradient(145deg,rgba(255,255,255,.96),rgba(241,247,255,.90));
  box-shadow:0 12px 28px rgba(15,23,42,.06);
}
.calendar-pro-toolbar label span,
.calendar-signal-card strong{
  color:var(--muted);
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
  letter-spacing:.06em;
}
.calendar-pro-toolbar select{
  min-height:42px;
  border-radius:14px;
  border:1px solid rgba(148,163,184,.22);
  padding:0 12px;
  background:#fff;
  color:var(--text);
  font:inherit;
  font-weight:800;
}
.calendar-signal-card > span,
.calendar-load-bars span{
  color:var(--text);
  font-size:13px;
  line-height:1.45;
}
.calendar-load-bars{
  display:grid;
  gap:7px;
}
.calendar-load-bars span{
  position:relative;
  overflow:hidden;
  border-radius:12px;
  padding:8px 10px;
  background:#f1f5f9;
}
.calendar-load-bars span::before{
  content:"";
  position:absolute;
  inset:0 auto 0 0;
  width:var(--load);
  background:linear-gradient(90deg,rgba(20,120,242,.18),rgba(20,120,242,.16));
}
.calendar-load-bars span b,
.calendar-load-bars span{
  position:relative;
}
.content-calendar-pill{
  display:grid;
  gap:3px;
  text-align:left;
  line-height:1.25;
  border-left:4px solid #1478F2;
}
.content-calendar-pill span{
  font-size:10px;
  color:var(--muted);
  font-weight:900;
  text-transform:uppercase;
}
.content-calendar-pill.branch-tone-1{border-left-color:#1478F2}
.content-calendar-pill.branch-tone-2{border-left-color:#FF7A1A}
.content-calendar-pill.branch-tone-3{border-left-color:#8b5cf6}
.content-calendar-pill.branch-tone-4{border-left-color:#ef4444}
.content-calendar-pill.branch-tone-5{border-left-color:#06b6d4}
.content-calendar-pill.academy{
  background:linear-gradient(135deg,#f0fdf4,#ffffff);
  border-left-color:#22c55e;
  border-color:#bbf7d0;
}
.content-calendar-pill.customer{
  background:linear-gradient(135deg,#fffbeb,#ffffff);
  border-left-color:#f59e0b;
  border-color:#fde68a;
}
.content-calendar-pill.services{
  background:linear-gradient(135deg,#f0f9ff,#ffffff);
  border-left-color:#0ea5e9;
  border-color:#bae6fd;
}
.bonus-plastic-title{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  color:var(--muted);
  font-size:13px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.08em;
}
.bonus-plastic-title strong{
  color:var(--text);
  text-transform:none;
  letter-spacing:0;
  font-size:15px;
}
.bonus-plastic-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:18px;
}
.bonus-plastic-card{
  position:relative;
  overflow:hidden;
  text-align:left;
  cursor:pointer;
  min-height:232px;
  border-radius:26px;
  padding:24px;
  color:#06160d;
  background:
    radial-gradient(circle at 84% 16%, rgba(255,255,255,.48), transparent 22%),
    linear-gradient(135deg,#2ee65e 0%,#20c957 46%,#0fbf83 100%);
  border:1px solid rgba(0,0,0,.08);
  box-shadow:0 24px 54px rgba(20,168,76,.22), inset 0 1px 0 rgba(255,255,255,.45);
  transition:transform .18s ease, box-shadow .18s ease;
}
.bonus-plastic-card:hover{
  transform:translateY(-3px);
  box-shadow:0 28px 64px rgba(20,168,76,.28), inset 0 1px 0 rgba(255,255,255,.45);
}
.bonus-plastic-card.card-2{
  background:
    radial-gradient(circle at 84% 16%, rgba(255,255,255,.42), transparent 23%),
    linear-gradient(135deg,#38e7a6 0%,#16c784 48%,#07966b 100%);
}
.bonus-plastic-pattern{
  position:absolute;
  inset:-22% 35% -20% -18%;
  opacity:.22;
  background:
    repeating-radial-gradient(circle at 28% 50%, transparent 0 18px, rgba(0,0,0,.42) 19px 21px),
    repeating-linear-gradient(45deg, transparent 0 22px, rgba(0,0,0,.24) 23px 25px);
  transform:rotate(-10deg);
}
.bonus-plastic-top,
.bonus-plastic-footer{
  position:relative;
  z-index:1;
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
}
.bonus-plastic-logo{
  font-size:26px;
  font-weight:950;
  letter-spacing:-.06em;
}
.bonus-plastic-chip{
  width:54px;
  height:40px;
  border-radius:10px;
  background:
    linear-gradient(90deg, transparent 44%, rgba(0,0,0,.18) 45% 47%, transparent 48%),
    linear-gradient(180deg,#f4f5f7,#bfc5ca);
  border:1px solid rgba(0,0,0,.18);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.78);
}
.bonus-plastic-chip::after{
  content:"";
  position:absolute;
}
.bonus-plastic-body{
  position:relative;
  z-index:1;
  margin-top:34px;
  display:grid;
  gap:8px;
}
.bonus-plastic-body span,
.bonus-plastic-footer span{
  font-size:11px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.12em;
  opacity:.68;
}
.bonus-plastic-body strong{
  font-size:34px;
  line-height:1;
  letter-spacing:-.05em;
}
.bonus-plastic-footer{
  margin-top:34px;
  align-items:end;
}
.bonus-plastic-footer div{
  display:grid;
  gap:5px;
  min-width:0;
}
.bonus-plastic-footer strong{
  font-size:15px;
  line-height:1.15;
  word-break:break-word;
}
.content-page-modern{
  gap:22px;
}
.content-modern-card{
  position:relative;
  overflow:hidden;
  border-radius:28px;
  border:1px solid rgba(20,120,242,.13);
  background:
    radial-gradient(circle at 100% 0%, rgba(34,197,94,.12), transparent 26%),
    radial-gradient(circle at 0% 0%, rgba(20,120,242,.14), transparent 28%),
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(246,250,255,.94)),
    var(--panel);
  box-shadow:0 30px 70px rgba(15,23,42,.10);
}
.content-modern-card::before{
  content:"";
  position:absolute;
  inset:0;
  height:5px;
  background:linear-gradient(90deg,#1478F2,#EAF3FF,#FF7A1A);
}
.content-modern-card::after{
  content:"";
  position:absolute;
  inset:8px;
  border-radius:24px;
  border:1px solid rgba(255,255,255,.58);
  pointer-events:none;
}
.content-modern-card > *{
  position:relative;
  z-index:1;
}
.content-page-modern .section-title-row{
  padding-bottom:14px;
  border-bottom:1px solid rgba(148,163,184,.14);
}
.content-page-modern .section-title-row h2{
  font-size:30px;
  letter-spacing:-.04em;
}
.content-modern-toolbar{
  align-items:center;
  gap:10px;
}
.content-modern-btn{
  min-height:42px;
  border-radius:14px;
  padding:11px 15px;
  box-shadow:0 10px 22px rgba(15,23,42,.06);
  border-color:rgba(148,163,184,.18);
  background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(239,246,255,.92));
}
.content-modern-btn:hover{
  transform:translateY(-2px);
  box-shadow:0 16px 30px rgba(15,23,42,.10);
}
.content-month-pill{
  min-height:42px;
  display:flex;
  align-items:center;
  border-radius:14px;
  padding:10px 15px;
  background:linear-gradient(135deg,rgba(20,120,242,.12),rgba(34,197,94,.10));
  border:1px solid rgba(20,120,242,.16);
  color:var(--text);
}
.content-modern-stats{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:12px;
  margin:14px 0 16px;
}
.content-modern-stat{
  position:relative;
  overflow:hidden;
  padding:15px;
  border-radius:18px;
  background:
    linear-gradient(135deg,rgba(255,255,255,.98),rgba(239,246,255,.88)),
    var(--panel);
  border:1px solid rgba(148,163,184,.14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.8),0 14px 28px rgba(15,23,42,.05);
  display:grid;
  gap:6px;
}
.content-modern-stat::before{
  content:"";
  position:absolute;
  right:-18px;
  top:-18px;
  width:74px;
  height:74px;
  border-radius:50%;
  background:rgba(20,120,242,.10);
}
.content-modern-stat span{
  color:var(--muted);
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.08em;
}
.content-modern-stat strong{
  font-size:28px;
  line-height:1;
  letter-spacing:-.04em;
}
.content-modern-stat small{
  color:var(--muted);
  font-size:12px;
}
.content-modern-form{
  padding:18px;
  border-radius:22px;
  background:
    linear-gradient(180deg,rgba(255,255,255,.68),rgba(248,251,255,.84)),
    rgba(248,251,255,.76);
  border:1px solid rgba(148,163,184,.12);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.78);
}
.content-modern-form label{
  padding:12px;
  border-radius:16px;
  background:rgba(255,255,255,.70);
  border:1px solid rgba(148,163,184,.10);
  transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.content-modern-form label:focus-within{
  border-color:rgba(20,120,242,.35);
  box-shadow:0 16px 32px rgba(20,120,242,.08);
  transform:translateY(-1px);
}
.content-modern-form input,
.content-modern-form select,
.content-modern-form textarea{
  border-radius:13px;
  border-color:rgba(148,163,184,.18);
  background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(245,249,255,.92));
}
.content-modern-form input:focus,
.content-modern-form select:focus,
.content-modern-form textarea:focus,
.content-modern-search:focus-within{
  border-color:rgba(20,120,242,.42);
  box-shadow:0 0 0 4px rgba(20,120,242,.10);
}
.content-page-modern .checkbox-row{
  display:flex;
  align-items:center;
  min-height:100%;
}
.content-submit-btn{
  min-height:52px;
  align-self:end;
  border-radius:16px;
}
.content-list-card .table-wrap{
  border-radius:22px;
  border-color:rgba(148,163,184,.14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.72);
}
.content-list-card table{
  border-collapse:separate;
  border-spacing:0;
}
.content-list-card th{
  background:linear-gradient(180deg,rgba(230,241,255,.98),rgba(248,251,255,.96));
  border-bottom:1px solid rgba(20,120,242,.14);
}
.content-list-card td{
  background:rgba(255,255,255,.72);
  border-bottom-color:rgba(148,163,184,.10);
}
.content-list-card tbody tr:hover td{
  background:linear-gradient(90deg,rgba(20,120,242,.08),rgba(34,197,94,.04));
}
.content-list-card .table-title-main{
  font-size:15px;
  font-weight:900;
}
.content-list-card .table-chip{
  min-height:28px;
  box-shadow:0 7px 16px rgba(15,23,42,.04);
}
.content-list-card .table-inline-link{
  background:linear-gradient(135deg,rgba(20,120,242,.12),rgba(34,197,94,.10));
  border:1px solid rgba(20,120,242,.14);
}
.content-list-card .table-actions-shell .icon-btn,
.content-list-card .icon-btn{
  border-radius:12px;
  background:linear-gradient(180deg,rgba(255,255,255,.98),rgba(239,246,255,.9));
  border:1px solid rgba(148,163,184,.16);
}
.content-page-modern .mobile-record-card{
  border-radius:22px;
  border-color:rgba(20,120,242,.14);
  box-shadow:0 16px 34px rgba(15,23,42,.07);
}
@media (max-width: 1100px){
  .login-shell,.app-shell,.stats-grid,.two-grid,.form-grid,.dashboard-metrics-grid,.dashboard-metrics-grid-secondary,.dashboard-spotlight-grid,.dashboard-fold-columns,.bonus-plastic-grid,.content-control-grid,.bonus-command-grid,.discussion-panel,.calendar-pro-toolbar{grid-template-columns:1fr}
  .content-modern-stats{grid-template-columns:1fr 1fr}
  .content-modern-form{padding:12px}
  .main-area{padding:14px}
  .login-page{padding:18px}
  .topbar h1{font-size:28px}
  .hero-banner h1{font-size:34px}
  .dashboard-hero-card{grid-template-columns:1fr}
  .dashboard-hero-copy h1{font-size:38px}
  .dashboard-focus-layout{grid-template-columns:1fr}
  .dashboard-alert-wall{grid-template-columns:1fr}
  .dashboard-side-grid{grid-template-columns:1fr 1fr}
  .dashboard-chart-grid{grid-template-columns:1fr}
  .login-copy h1{font-size:46px}
  .login-copy h2{font-size:24px}
  .login-copy{padding-inline:0;max-width:none}
  .login-logo-lockup{margin-top:18px}
  .login-logo-image{width:64px;height:64px}
  .login-status-row{margin-top:20px}
  .login-public-nav{gap:8px}
  .login-public-nav a{
    width:100%;
    justify-content:flex-start;
  }

  .login-feature-row{grid-template-columns:1fr}
  .login-seo-grid{grid-template-columns:1fr}
  .login-card{width:min(100%, 620px)}
  .permission-grid{grid-template-columns:1fr}
  .media-grid{grid-template-columns:1fr}
  .detail-grid{grid-template-columns:1fr}
  .chat-layout{grid-template-columns:1fr}
  .workflow-strip{grid-template-columns:1fr 1fr}
}
@media (max-width: 720px){
  .login-shell{min-height:auto}
  .brand-kicker{letter-spacing:.12em}
  .login-copy h1{font-size:40px}
  .login-copy h2{font-size:21px}
  .login-card{padding:24px;border-radius:30px}
  .login-card-top,.login-card-footer{flex-direction:column;align-items:flex-start}
  .login-card-badges{justify-content:flex-start}
  body.standalone-app .main-area{
    padding-left:12px;
    padding-right:12px;
  }
  .ios-install-step{
    grid-template-columns:30px 1fr;
    padding:12px;
  }
  .ios-install-step strong{
    width:30px;
    height:30px;
    border-radius:10px;
  }
  .dashboard-hero-card{
    padding:18px;
    border-radius:24px;
  }
  .dashboard-hero-copy h1{font-size:30px}
  .dashboard-hero-summary{
    padding:14px 16px;
    border-radius:18px;
  }
  .dashboard-chip-row{gap:8px}
  .dashboard-chip{
    padding:8px 11px;
    font-size:12px;
  }
  .dashboard-side-grid,
  .dashboard-focus-list,
  .dashboard-alert-wall,
  .dashboard-fold-columns{grid-template-columns:1fr}
  .dashboard-side-focus{min-height:auto}
  .dashboard-metric-card{
    min-height:auto;
    padding:16px;
    border-radius:20px;
  }
  .dashboard-metric-main{font-size:30px}
  .dashboard-ring{
    width:150px;
    height:150px;
  }
  .dashboard-ring-inner strong{font-size:34px}
  .dashboard-fold summary{
    padding:18px;
    align-items:flex-start;
  }
  .dashboard-fold-body{padding:0 18px 18px}
  .dashboard-fold-summary-copy strong{font-size:19px}
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
@keyframes dashboard-fade-up{
  from{opacity:0;transform:translateY(16px) scale(.98)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
@keyframes dashboard-spark-rise{
  from{opacity:0;transform:scaleY(.35)}
  to{opacity:1;transform:scaleY(1)}
}
@keyframes loading-progress{
  0%{transform:translateX(-115%)}
  100%{transform:translateX(340%)}
}
@keyframes spin {
  0% { transform: rotate(0deg) }
  50% { transform: rotate(360deg) }
  75% { transform: rotate(750deg) }
  100% { transform: rotate(1800deg) }
}
@keyframes shake {
  65%, 80%, 88%, 96% { transform: rotate(0.5deg) }
  50%, 75%, 84%, 92% { transform: rotate(-0.5deg) }
  0%, 50%, 100% { transform: rotate(0) }
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
@keyframes aurora-drift{
  0%{transform:translate3d(-2%, -1%, 0) scale(1)}
  50%{transform:translate3d(2%, 2%, 0) scale(1.04)}
  100%{transform:translate3d(-1%, 3%, 0) scale(1.02)}
}
@keyframes login-pan{
  0%{transform:translateX(-28%)}
  100%{transform:translateX(28%)}
}
@keyframes headline-wave{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-4px)}
}
@keyframes brand-drift{
  0%,100%{transform:translateY(0)}
  50%{transform:translateY(-6px)}
}
@keyframes login-card-drift{
  0%,100%{transform:translateY(0) rotate(0deg)}
  50%{transform:translateY(-10px) rotate(-.35deg)}
}
@keyframes grid-drift{
  0%{background-position:0 0, 0 0}
  100%{background-position:34px 34px, 34px 34px}
}
@keyframes noise-shift{
  0%{transform:translate3d(0,0,0)}
  25%{transform:translate3d(8px,-6px,0)}
  50%{transform:translate3d(-6px,8px,0)}
  75%{transform:translate3d(10px,4px,0)}
  100%{transform:translate3d(0,0,0)}
}
@keyframes signal-ping{
  0%{box-shadow:0 0 0 0 rgba(45,212,191,.55)}
  70%{box-shadow:0 0 0 10px rgba(45,212,191,0)}
  100%{box-shadow:0 0 0 0 rgba(45,212,191,0)}
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
  background:linear-gradient(135deg,#1478F2,#0B63D1);
  color:#fff;
  border-color:transparent;
  box-shadow:0 12px 28px rgba(20,120,242,.22);
}
.mobile-bottom-nav{
  display:none;
}
.mobile-nav-item{
  border:0;
  background:transparent;
  color:var(--muted);
  display:grid;
  place-items:center;
  gap:5px;
  font-size:11px;
  font-weight:800;
  padding:8px 6px;
  border-radius:16px;
}
.mobile-nav-icon{
  width:34px;
  height:34px;
  border-radius:14px;
  display:grid;
  place-items:center;
  color:#fff;
  box-shadow:0 10px 18px rgba(15,23,42,.14);
}
.mobile-nav-item.active{
  color:var(--blue);
  background:linear-gradient(135deg, rgba(20,120,242,.14), rgba(23,195,178,.12));
}
.mobile-menu-sheet{
  display:grid;
  gap:14px;
}
.mobile-menu-search{
  margin-bottom:2px;
}
.mobile-menu-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:10px;
}
.mobile-menu-group{
  display:grid;
  gap:10px;
}
.mobile-menu-title{
  padding:2px 2px 0;
  color:var(--muted);
  font-size:11px;
  letter-spacing:.14em;
  text-transform:uppercase;
  font-weight:800;
}
.mobile-menu-card{
  border:1px solid rgba(148,163,184,.14);
  background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(241,246,253,.92));
  color:var(--text);
  border-radius:20px;
  padding:14px 12px;
  display:grid;
  justify-items:start;
  align-content:start;
  gap:10px;
  font-weight:800;
  text-align:left;
  box-shadow:0 12px 24px rgba(15,23,42,.08);
}
.mobile-menu-card.active{
  border-color:rgba(20,120,242,.24);
  background:linear-gradient(135deg,rgba(20,120,242,.18),rgba(20,120,242,.16),rgba(57,217,138,.12));
}
.mobile-logout-btn{
  margin-top:4px;
}
.ios-install-pill{
  display:flex;
  align-items:center;
  gap:8px;
}
.install-guide-btn{
  margin-top:10px;
  width:100%;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
}
.ios-install-inline-note{
  margin-top:10px;
  padding:12px 14px;
  border-radius:16px;
  border:1px solid rgba(20,120,242,.14);
  background:rgba(20,120,242,.08);
  color:var(--muted);
  font-size:13px;
  line-height:1.55;
}
.ios-install-guide{
  display:grid;
  gap:16px;
}
.ios-install-guide p{
  margin:0;
  color:var(--muted);
  line-height:1.65;
}
.ios-install-steps{
  display:grid;
  gap:10px;
}
.ios-install-step{
  display:grid;
  grid-template-columns:34px 1fr;
  gap:10px;
  align-items:flex-start;
  padding:12px 14px;
  border-radius:16px;
  background:var(--soft);
  border:1px solid var(--line);
}
.ios-install-step strong{
  width:34px;
  height:34px;
  border-radius:12px;
  display:grid;
  place-items:center;
  background:linear-gradient(135deg,#1478F2,#0B63D1);
  color:#fff;
}
.ios-install-note{
  padding:14px 16px;
  border-radius:18px;
  background:linear-gradient(135deg, rgba(20,120,242,.1), rgba(20,120,242,.08));
  border:1px solid rgba(20,120,242,.14);
  color:var(--text);
  line-height:1.6;
}
.calendar-cell.droppable{
  transition:border-color .18s ease, box-shadow .18s ease, transform .18s ease;
}
.calendar-cell.droppable:hover{
  border-color:rgba(20,120,242,.4);
  box-shadow:0 10px 24px rgba(20,120,242,.12);
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
  background:linear-gradient(90deg,#1478F2,#0B63D1);
  box-shadow:0 8px 18px rgba(20,120,242,.25);
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
  background:linear-gradient(135deg,#1478F2,#0B63D1);
  color:#fff;
  border-color:transparent;
  box-shadow:0 12px 24px rgba(20,120,242,.22);
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
  .app-shell{display:block}
  .sidebar{display:none}
  .main-area{
    padding:12px 12px 104px;
  }
  .topbar{
    position:sticky;
    top:max(10px, env(safe-area-inset-top));
    z-index:28;
    padding:16px;
    flex-direction:column;
    align-items:flex-start;
    gap:14px;
  }
  .topbar-main{
    align-items:center;
    width:100%;
  }
  .topbar h1{
    font-size:20px;
    line-height:1.12;
    margin-top:4px;
  }
  .topbar-right{
    width:100%;
    flex-wrap:wrap;
    gap:8px;
  }
  .global-search{
    width:100%;
    min-width:0;
  }
  .global-search-panel{
    width:min(94vw, 420px);
  }
  .user-chip{
    max-width:100%;
  }
  .user-chip span{
    max-width:120px;
    overflow:hidden;
    text-overflow:ellipsis;
    white-space:nowrap;
  }
  .mobile-menu-btn{
    display:inline-flex;
    min-height:42px;
    padding:10px 12px;
    font-size:13px;
  }
  .theme-toggle,.notif-pill{
    min-height:42px;
    padding:10px 12px;
    font-size:13px;
  }
  .mobile-bottom-nav{
    position:fixed;
    left:10px;
    right:10px;
    bottom:max(10px, calc(env(safe-area-inset-bottom) + 8px));
    display:grid;
    grid-template-columns:repeat(5,minmax(0,1fr));
    gap:6px;
    padding:8px;
    border:1px solid rgba(148,163,184,.14);
    border-radius:24px;
    background:linear-gradient(180deg, rgba(255,255,255,.96), rgba(239,245,252,.94));
    backdrop-filter:blur(16px);
    box-shadow:0 20px 44px rgba(15,23,42,.16);
    z-index:35;
  }
  :root[data-theme='dark'] .mobile-bottom-nav{
    background:linear-gradient(180deg, rgba(10,18,32,.96), rgba(14,24,40,.94));
  }
  .mobile-menu-grid{
    grid-template-columns:1fr 1fr;
  }
  .page-grid{
    gap:12px;
    margin-top:12px;
  }
  .hero-banner,.card,.stat-card{
    border-radius:18px;
    padding:14px;
  }
  .hero-banner h1{
    font-size:25px;
    line-height:1.08;
    margin:6px 0;
  }
  .hero-banner p{
    font-size:14px;
    line-height:1.55;
  }
  .stat-card-title{
    font-size:12px;
  }
  .stat-card-value{
    font-size:25px;
    margin-top:6px;
  }
  .stat-card-hint{
    font-size:12px;
    margin-top:4px;
  }
  .section-title-row{
    gap:10px;
    margin-bottom:12px;
  }
  .section-title-row h2{
    font-size:18px;
    line-height:1.2;
  }
  .section-title-row p{
    margin-top:4px;
    font-size:13px;
    line-height:1.5;
  }
  .small-label{
    font-size:10px;
    letter-spacing:.14em;
  }
  .quick-item,
  .info-banner,
  .reminder-card{
    padding:12px 13px;
  }
  .quick-item,
  .info-banner,
  .reminder-card,
  .login-feature-card span,
  .login-seo-card p,
  .login-seo-note{
    font-size:13px;
    line-height:1.55;
  }
  .toolbar-actions{
    width:100%;
    gap:6px;
  }
  .toolbar-actions .btn{
    flex:1 1 calc(50% - 6px);
  }
  .table-search{
    min-width:0;
    width:100%;
    padding:10px 12px;
    border-radius:14px;
    font-size:13px;
  }
  .table-filter{
    min-width:0;
    width:100%;
    padding:10px 12px;
    border-radius:14px;
    font-size:13px;
  }
  .form-grid{
    gap:10px;
  }
  .form-grid label{
    gap:6px;
  }
  .form-grid label span,
  .field-note{
    font-size:12px;
  }
  .form-grid input,.form-grid select,.form-grid textarea{
    border-radius:12px;
    padding:11px 12px;
    font-size:14px;
  }
  .travel-balance-card{
    padding:18px 16px;
    border-radius:22px;
  }
  .travel-balance-card-amount{
    font-size:28px;
  }
  .travel-balance-card-meta{
    grid-template-columns:1fr;
    gap:10px;
  }
  .travel-range-toolbar{
    flex-direction:column;
    align-items:stretch;
    gap:12px;
  }
  .travel-range-toolbar-copy{
    width:100%;
  }
  .travel-range-toolbar-fields{
    width:100%;
    grid-template-columns:1fr;
    gap:10px;
  }
  .travel-range-toolbar-fields label{
    width:100%;
  }
  .btn{
    min-height:42px;
    padding:10px 12px;
    font-size:13px;
    border-radius:12px;
  }
  th,td{
    padding:9px 10px;
    font-size:12px;
  }
  .empty-cell{
    padding:18px 12px;
    font-size:13px;
  }
  .table-avatar{
    width:34px;
    height:34px;
  }
  .table-wrap{
    border-radius:14px;
  }
  .desktop-table{
    display:none;
  }
  .mobile-card-list{
    display:grid;
    gap:10px;
  }
  .mobile-record-card{
    border-radius:16px;
    padding:12px;
    gap:10px;
  }
  .mobile-record-head{
    gap:8px;
  }
  .mobile-record-title strong{
    font-size:14px;
  }
  .mobile-record-title span{
    font-size:11px;
  }
  .mobile-record-grid{
    grid-template-columns:1fr;
    gap:8px;
  }
  .mobile-record-field label{
    font-size:10px;
  }
  .mobile-record-field div{
    font-size:12px;
  }
  .inline-link-field{
    grid-template-columns:1fr auto;
  }
  .timeline-item{
    grid-template-columns:20px 1fr;
    padding:12px;
    gap:10px;
  }
  .timeline-top,.timeline-meta{
    align-items:flex-start;
  }
  .timeline-top strong{
    font-size:14px;
    line-height:1.35;
  }
  .timeline-content p{
    font-size:12px;
  }
  .modal-card{
    width:min(96vw, calc(100vw - 16px));
    margin:14px auto;
    border-radius:20px;
    padding:14px;
  }
  .modal-card.wide{
    width:min(96vw, calc(100vw - 16px));
  }
  .modal-head{
    margin-bottom:12px;
  }
  .modal-head h3{
    font-size:18px;
    line-height:1.25;
  }
  .modal-body{
    max-height:72vh;
  }
  .detail-grid{
    grid-template-columns:1fr;
    gap:10px;
  }
  .discussion-form,
  .discussion-upload{
    grid-template-columns:1fr;
  }
  .discussion-col{
    padding:12px;
    border-radius:18px;
  }
  .table-actions{
    gap:6px;
  }
  .icon-btn{
    width:34px;
    height:34px;
  }
}
.campaign-lead-link-row{
  display:grid;
  gap:10px;
}
.campaign-lead-link-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.campaign-lead-link-preview{
  padding:12px 14px;
  border-radius:16px;
  border:1px dashed var(--line);
  background:rgba(255,255,255,.72);
  color:var(--muted);
  word-break:break-all;
}
.campaign-lead-page{
  min-height:100vh;
  padding:max(16px, calc(env(safe-area-inset-top) + 12px)) 16px max(18px, calc(env(safe-area-inset-bottom) + 16px));
  display:grid;
  place-items:center;
  background:
    radial-gradient(circle at top left, rgba(20,120,242,.16), transparent 30%),
    radial-gradient(circle at bottom right, rgba(14,165,233,.18), transparent 28%),
    linear-gradient(180deg, #f7fbff 0%, #eef4fb 100%);
}
.campaign-lead-shell{
  width:min(100%, 760px);
}
.campaign-lead-card{
  border:1px solid rgba(148,163,184,.22);
  background:linear-gradient(160deg, rgba(255,255,255,.96), rgba(246,250,255,.9));
  border-radius:32px;
  padding:30px;
  box-shadow:0 28px 70px rgba(15,23,42,.12);
  display:grid;
  gap:22px;
}
.campaign-lead-brand{
  display:flex;
  align-items:center;
  gap:14px;
}
.campaign-lead-brand-image{
  width:58px;
  height:58px;
  border-radius:18px;
  object-fit:cover;
}
.campaign-lead-brand strong{
  display:block;
  font-size:22px;
  font-weight:800;
}
.campaign-lead-brand span{
  color:var(--muted);
}
.campaign-lead-copy h1{
  margin:8px 0 10px;
  font-size:40px;
  line-height:1.08;
}
.campaign-lead-copy p{
  margin:0;
  color:var(--muted);
  font-size:16px;
  line-height:1.7;
}
.campaign-lead-meta{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:14px;
}
.campaign-lead-meta-card{
  padding:16px 18px;
  border-radius:20px;
  border:1px solid rgba(148,163,184,.2);
  background:rgba(255,255,255,.82);
  display:grid;
  gap:6px;
}
.campaign-lead-meta-card span{
  color:var(--muted);
  font-size:13px;
}
.campaign-lead-meta-card strong{
  font-size:17px;
}
.campaign-lead-inline-note{
  padding:12px 14px;
  border-radius:16px;
  border:1px solid rgba(20,120,242,.16);
  background:rgba(20,120,242,.08);
  color:var(--muted);
  font-size:14px;
  line-height:1.6;
}
.campaign-lead-form{
  display:grid;
  gap:14px;
}
.campaign-lead-form label{
  display:grid;
  gap:8px;
}
.campaign-lead-form label span{
  color:var(--muted);
  font-size:13px;
}
.campaign-lead-form input{
  width:100%;
  min-height:56px;
  border-radius:18px;
  border:1px solid rgba(148,163,184,.2);
  background:rgba(255,255,255,.92);
  padding:0 16px;
  font-size:16px;
  color:var(--text);
  outline:none;
}
.campaign-lead-form input:focus{
  border-color:rgba(20,120,242,.48);
  box-shadow:0 0 0 5px rgba(20,120,242,.12);
}
.campaign-lead-form .btn.primary{
  justify-content:center;
  width:100%;
  min-height:56px;
}
.campaign-lead-error{
  color:#dc2626;
  font-size:14px;
}
.campaign-lead-state{
  display:grid;
  place-items:center;
  gap:14px;
  text-align:center;
  padding:24px 12px;
}
.campaign-lead-state.error{
  color:#dc2626;
}
.campaign-lead-state h2{
  margin:0;
  font-size:30px;
}
.campaign-lead-state p{
  margin:0;
  color:var(--muted);
  max-width:460px;
}
.campaign-lead-success{
  justify-self:center;
}
@media (max-width: 720px){
  .campaign-lead-page{
    place-items:start center;
    padding:max(12px, calc(env(safe-area-inset-top) + 8px)) 12px max(18px, calc(env(safe-area-inset-bottom) + 14px));
  }
  .campaign-lead-shell{
    width:100%;
  }
  .campaign-lead-card{
    padding:18px 16px;
    border-radius:24px;
    gap:16px;
  }
  .campaign-lead-brand{
    gap:12px;
    align-items:center;
  }
  .campaign-lead-brand-image{
    width:50px;
    height:50px;
    border-radius:16px;
  }
  .campaign-lead-brand strong{
    font-size:19px;
  }
  .campaign-lead-brand span{
    font-size:13px;
    line-height:1.45;
  }
  .campaign-lead-meta{
    grid-template-columns:1fr;
    gap:10px;
  }
  .campaign-lead-copy h1{
    font-size:28px;
    line-height:1.08;
  }
  .campaign-lead-copy p{
    font-size:14px;
    line-height:1.6;
  }
  .campaign-lead-meta-card{
    padding:14px 14px;
    border-radius:18px;
  }
  .campaign-lead-meta-card span{
    font-size:12px;
  }
  .campaign-lead-meta-card strong{
    font-size:15px;
    line-height:1.35;
  }
  .campaign-lead-form{
    gap:12px;
  }
  .campaign-lead-form label{
    gap:7px;
  }
  .campaign-lead-form label span{
    font-size:12px;
  }
  .campaign-lead-form input{
    min-height:52px;
    border-radius:16px;
    padding:0 14px;
    font-size:15px;
  }
  .campaign-lead-inline-note{
    border-radius:14px;
    padding:11px 12px;
    font-size:13px;
  }
  .campaign-lead-state{
    padding:10px 2px;
  }
  .campaign-lead-state h2{
    font-size:24px;
  }
  .campaign-lead-state p{
    font-size:14px;
    line-height:1.6;
  }
}
@media (max-width: 520px){
  .campaign-lead-page{
    padding:max(10px, calc(env(safe-area-inset-top) + 6px)) 10px max(16px, calc(env(safe-area-inset-bottom) + 12px));
  }
  .campaign-lead-card{
    padding:16px 14px;
    border-radius:22px;
  }
  .campaign-lead-copy h1{
    font-size:24px;
  }
  .campaign-lead-brand{
    grid-template-columns:50px 1fr;
    display:grid;
    align-items:center;
  }
  .campaign-lead-form input{
    min-height:50px;
    font-size:16px;
  }
  .campaign-lead-form .btn.primary{
    min-height:52px;
  }
}

/* final light professional system overrides */
html,body,#root{font-family:"Inter","Segoe UI",sans-serif}
h1,h2,h3,h4,.brand-name,.section-title-row h2,.topbar h1,.login-title,.hero-left h1{font-family:"Manrope","Inter","Segoe UI",sans-serif}
:root{
  --bg:#f4f7fb;
  --panel:#ffffff;
  --panel-strong:#ffffff;
  --panel-soft:#f7f9fc;
  --soft:#f6f8fb;
  --soft-strong:#edf2f8;
  --text:#0f172a;
  --muted:#64748b;
  --line:rgba(148,163,184,.18);
  --line-strong:rgba(100,116,139,.24);
  --nav-bg:#ffffff;
  --nav-bg-soft:#ffffff;
  --nav-text:#0f172a;
  --nav-muted:#64748b;
  --shadow-soft:0 16px 38px rgba(15,23,42,.06);
  --shadow-card:0 24px 60px rgba(15,23,42,.08);
}
body{
  background:
    radial-gradient(circle at 0% 0%, rgba(20,120,242,.08), transparent 22%),
    radial-gradient(circle at 100% 0%, rgba(14,165,233,.08), transparent 18%),
    linear-gradient(180deg, #f8fbff 0%, #f4f7fb 100%);
}
.login-page{
  background:
    radial-gradient(circle at 12% 12%, rgba(20,120,242,.10), transparent 18%),
    radial-gradient(circle at 82% 14%, rgba(6,182,212,.10), transparent 18%),
    linear-gradient(180deg, #f8fbff 0%, #f2f7fd 100%);
}
.login-page::before,.login-page::after,.login-particles,.login-orb,.login-grid-line,.login-noise,.login-card-shine,.login-card-glow{display:none}
.login-shell{
  width:min(100%, 1380px);
  grid-template-columns:minmax(0, 1.15fr) minmax(380px, 480px);
  gap:40px;
}
.login-copy{
  gap:0;
  padding-inline:0;
}
.brand-kicker{
  background:#ffffff;
  color:#1478F2;
  border:1px solid rgba(37,99,235,.12);
  box-shadow:0 12px 28px rgba(37,99,235,.08);
}
.login-logo-lockup{
  margin-top:22px;
  margin-bottom:18px;
  animation:none;
}
.login-logo-image{
  width:72px;
  height:72px;
  border-radius:22px;
  box-shadow:0 16px 34px rgba(37,99,235,.12);
  animation:none;
}
.login-copy h1{
  margin-top:0;
  font-size:clamp(44px, 5.2vw, 72px);
  line-height:.98;
  background:none;
  color:#0f172a;
  animation:none;
}
.login-copy > p:not(.login-seo-note){
  margin-top:14px;
  max-width:640px;
  font-size:17px;
  animation:none;
}
.login-public-nav,.login-status-row,.login-feature-row,.login-metrics-row{
  margin-top:20px;
}
.login-feature-row,.login-metrics-row{
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:14px;
  max-width:780px;
}
.login-feature-card,.login-metric-card{
  padding:20px;
  border-radius:24px;
  background:rgba(255,255,255,.88);
  border:1px solid rgba(226,232,240,.9);
  box-shadow:0 18px 40px rgba(15,23,42,.06);
  animation:none;
}
.login-metric-card span{
  display:block;
  font-size:12px;
  font-weight:700;
  letter-spacing:.12em;
  text-transform:uppercase;
  color:#1478F2;
}
.login-metric-card strong{
  display:block;
  margin-top:10px;
  font-size:20px;
}
.login-metric-card small{
  display:block;
  margin-top:8px;
  color:var(--muted);
  font-size:13px;
}
.login-status-pill,.login-public-nav a{
  background:#ffffff;
  border:1px solid rgba(226,232,240,.9);
  box-shadow:0 12px 28px rgba(15,23,42,.05);
  color:#0f172a;
  animation:none;
}
.login-card{
  width:min(100%, 460px);
  background:rgba(255,255,255,.96);
  border:1px solid rgba(226,232,240,.9);
  border-radius:30px;
  padding:28px;
  box-shadow:0 30px 80px rgba(15,23,42,.10);
  animation:none;
}
.login-subtitle{
  margin-top:-6px;
  color:var(--muted);
  font-size:14px;
}
.login-mode-switch{
  display:grid;
  grid-template-columns:repeat(3, minmax(0,1fr));
  gap:8px;
  padding:6px;
  border-radius:18px;
  background:#f7f9fc;
  border:1px solid rgba(226,232,240,.9);
}
.login-mode-btn{
  min-height:46px;
  border:0;
  border-radius:14px;
  background:transparent;
  color:var(--muted);
  display:flex;
  align-items:center;
  justify-content:center;
  gap:8px;
  font-weight:700;
  cursor:pointer;
}
.login-mode-btn.active{
  background:#ffffff;
  color:#0f172a;
  box-shadow:0 10px 24px rgba(15,23,42,.08);
}
.login-mode-panel{
  display:grid;
  gap:14px;
}
.login-card select,
.login-card input{
  min-height:52px;
  background:#f8fafc;
  border:1px solid rgba(203,213,225,.9);
  border-radius:16px;
  box-shadow:none;
}
.login-card input:focus,
.login-card select:focus{
  border-color:rgba(37,99,235,.45);
  box-shadow:0 0 0 4px rgba(37,99,235,.10);
  transform:none;
  background:#ffffff;
}
.inline-action-row{
  display:flex;
  align-items:end;
  gap:12px;
}
.inline-grow{flex:1}
.login-inline-note{
  color:var(--muted);
  font-size:13px;
  line-height:1.5;
}
.sidebar{
  background:rgba(255,255,255,.88);
  border-right:1px solid rgba(226,232,240,.9);
  box-shadow:18px 0 48px rgba(15,23,42,.05);
}
.sidebar::before,.sidebar::after{display:none}
.brand-name,.brand-desc,.menu-group-toggle.open,.sidebar-search input,.menu-btn{color:var(--nav-text)}
.sidebar-search{
  background:#f8fafc;
  border:1px solid rgba(226,232,240,.9);
  color:var(--muted);
  box-shadow:none;
}
.sidebar-search input::placeholder,.menu-group-toggle{color:var(--nav-muted)}
.menu-btn{
  background:#ffffff;
  border:1px solid transparent;
  box-shadow:0 10px 20px rgba(15,23,42,.04);
}
.menu-btn:hover{
  transform:translateX(3px);
  background:#f8fbff;
  border-color:rgba(37,99,235,.14);
  box-shadow:0 16px 28px rgba(37,99,235,.08);
}
.menu-btn.active{
  background:linear-gradient(135deg, rgba(37,99,235,.10), rgba(14,165,233,.08));
  border-color:rgba(37,99,235,.18);
  box-shadow:0 18px 34px rgba(37,99,235,.10);
}
.logout-btn{
  background:#0f172a;
  color:#ffffff;
  box-shadow:0 18px 34px rgba(15,23,42,.18);
}
.topbar,.card,.stat-card,.hero-shell,.table-wrap,.modal-card,.drawer-panel,.mobile-record-card,.notif-card,.permission-box,.permission-item{
  background:rgba(255,255,255,.92);
  border:1px solid rgba(226,232,240,.9);
  box-shadow:0 18px 46px rgba(15,23,42,.06);
}
.topbar{
  border-radius:26px;
}
.btn{
  min-height:44px;
  border-radius:14px;
  font-weight:700;
}
.btn.primary{
  background:#1478F2;
  box-shadow:0 14px 28px rgba(20,120,242,.20);
}
.btn.primary:hover{background:#0B63D1}
.btn.secondary,.btn.ghost{
  background:#ffffff;
  color:#0f172a;
  border:1px solid rgba(203,213,225,.95);
  box-shadow:0 10px 20px rgba(15,23,42,.04);
}
.btn.secondary:hover,.btn.ghost:hover{
  background:#f8fafc;
}
.table-wrap{
  border-radius:20px;
}
th{
  background:#f8fafc;
  color:#475569;
}
tbody tr:hover{
  background:rgba(37,99,235,.03);
}
.modal-card{
  border-radius:28px;
}
.info-box{
  background:rgba(37,99,235,.08);
  border:1px solid rgba(37,99,235,.14);
  color:#1478F2;
  border-radius:14px;
  padding:12px 14px;
}

/* unified light UI system polish */
:root,
:root[data-theme='dark']{
  --blue:#2463eb;
  --blue-strong:#1478F2;
  --accent:#0f9f8f;
  --accent-soft:rgba(15,159,143,.10);
  --bg:#f5f7fb;
  --bg-elevated:#ffffff;
  --panel:#ffffff;
  --panel-strong:#ffffff;
  --panel-soft:#f8fafc;
  --soft:#f6f8fb;
  --soft-strong:#eef3f8;
  --text:#101828;
  --text-soft:#243042;
  --muted:#667085;
  --line:rgba(16,24,40,.10);
  --line-strong:rgba(16,24,40,.16);
  --danger:#dc2626;
  --success:#079455;
  --warning:#dc8a00;
  --nav-bg:#ffffff;
  --nav-bg-soft:#f8fafc;
  --nav-text:#101828;
  --nav-muted:#667085;
  --radius-lg:24px;
  --radius-md:16px;
  --shadow-soft:0 12px 28px rgba(16,24,40,.06);
  --shadow-card:0 22px 54px rgba(16,24,40,.08);
  --shadow-float:0 28px 72px rgba(16,24,40,.14);
  --ring:0 0 0 4px rgba(36,99,235,.12);
}
html,
:root[data-theme='dark'] html{
  color-scheme:light;
}
body{
  background:
    linear-gradient(180deg, rgba(255,255,255,.82), rgba(255,255,255,0) 420px),
    linear-gradient(135deg, #f7f9fc 0%, #eef4fb 100%);
}
.app-shell{
  background:
    linear-gradient(180deg, rgba(255,255,255,.65), rgba(245,247,251,.92)),
    #f5f7fb;
}
.login-page{
  display:grid;
  place-items:center;
  background:
    linear-gradient(135deg, rgba(36,99,235,.08), rgba(15,159,143,.06) 46%, rgba(255,255,255,.65)),
    #f6f8fb;
}
.login-shell{
  width:min(100%, 1180px);
  min-height:auto;
  align-items:center;
  grid-template-columns:minmax(0, .92fr) minmax(360px, 440px);
  gap:clamp(24px, 4vw, 56px);
}
.login-copy{
  align-self:center;
}
.login-logo-lockup{
  display:flex;
  align-items:center;
  gap:14px;
  margin:0 0 24px;
}
.login-logo-copy strong{
  display:block;
  font-size:22px;
  letter-spacing:0;
}
.login-logo-copy span{
  color:var(--muted);
  font-size:14px;
}
.brand-kicker{
  margin-bottom:14px;
  background:#fff;
  color:var(--blue-strong);
  border-color:rgba(36,99,235,.14);
  letter-spacing:.08em;
}
.login-copy h1{
  max-width:680px;
  font-size:clamp(42px, 5vw, 64px);
  letter-spacing:0;
}
.login-copy > p:not(.login-seo-note){
  max-width:560px;
  color:#475467;
  font-size:17px;
}
.login-public-nav{
  gap:10px;
}
.login-status-row.compact{
  max-width:560px;
  gap:10px;
}
.login-card{
  border-radius:24px;
  padding:24px;
  box-shadow:0 28px 70px rgba(16,24,40,.12);
}
.login-card-top{
  align-items:center;
}
.login-title{
  font-size:30px;
  letter-spacing:0;
}
.login-mode-switch{
  grid-template-columns:repeat(3, minmax(0,1fr));
  border-radius:16px;
  padding:5px;
  background:#eef3f8;
}
.login-mode-btn{
  min-height:58px;
  padding:8px 8px;
  border-radius:13px;
  gap:7px;
}
.login-mode-btn span{
  display:grid;
  gap:2px;
  text-align:left;
}
.login-mode-btn strong{
  font-size:13px;
  line-height:1.1;
}
.login-mode-btn small{
  color:inherit;
  opacity:.72;
  font-size:10px;
  line-height:1.2;
}
.login-mode-btn.active{
  box-shadow:0 10px 22px rgba(16,24,40,.10);
}
.login-card input,
.login-card select,
.form-grid input,
.form-grid select,
.form-grid textarea,
.table-search,
.table-filter{
  background:#fff;
  border:1px solid rgba(16,24,40,.12);
  border-radius:14px;
  color:var(--text);
}
.login-card input:focus,
.login-card select:focus,
.form-grid input:focus,
.form-grid select:focus,
.form-grid textarea:focus{
  border-color:rgba(36,99,235,.42);
  box-shadow:var(--ring);
}
.sidebar{
  background:#ffffff;
  border-right:1px solid rgba(16,24,40,.10);
}
.menu-btn,
.mobile-menu-card{
  border-radius:14px;
  box-shadow:none;
}
.menu-btn.active,
.mobile-menu-card.active{
  background:#eef4ff;
  color:#1478F2;
  border-color:rgba(36,99,235,.16);
}
.topbar,
.card,
.stat-card,
.dashboard-hero-card,
.content-modern-card,
.bonus-plastic-section,
.calendar-card,
.kanban-column,
.table-wrap,
.modal-card,
.drawer-panel,
.mobile-record-card,
.permission-box,
.permission-item{
  background:#ffffff;
  border:1px solid rgba(16,24,40,.10);
  box-shadow:0 14px 34px rgba(16,24,40,.055);
}
.card:hover,
.stat-card:hover{
  transform:none;
}
.dashboard-hero-card{
  border-radius:26px;
  background:
    linear-gradient(135deg, rgba(36,99,235,.08), rgba(15,159,143,.06)),
    #ffffff;
}
.dashboard-hero-card::before,
.dashboard-hero-glow,
.content-modern-card::before,
.bonus-plastic-pattern{
  opacity:.28;
}
.stat-card{
  border-radius:20px;
}
.stat-card-value{
  letter-spacing:0;
}
.btn{
  border-radius:12px;
  letter-spacing:0;
}
.btn.primary{
  background:linear-gradient(135deg, #2463eb, #1488cc);
  box-shadow:0 12px 26px rgba(36,99,235,.20);
}
.btn.secondary,
.btn.ghost,
.icon-btn{
  background:#ffffff;
  color:#101828;
  border:1px solid rgba(16,24,40,.12);
}
.table-wrap{
  border-radius:18px;
}
table{
  background:#fff;
}
th{
  background:#f8fafc;
  color:#475467;
  font-size:12px;
  letter-spacing:.02em;
  text-transform:uppercase;
}
td{
  color:#243042;
}
tbody tr:hover{
  background:#f8fbff;
}
.modal-backdrop,
.drawer-backdrop{
  background:rgba(16,24,40,.42);
  backdrop-filter:blur(6px);
}
.modal-card{
  border-radius:22px;
}
.modal-head h3{
  letter-spacing:0;
}
.bonus-plastic-card{
  border-radius:18px;
  box-shadow:0 16px 36px rgba(16,24,40,.10);
}

/* professional system upgrade: typography, tables, cards and modals */
html,body,#root{
  font-family:"Inter","Segoe UI",Arial,sans-serif;
  font-variant-numeric:tabular-nums;
}
h1,h2,h3,h4,
.topbar h1,
.dashboard-hero-copy h1,
.dashboard-metric-main,
.stat-card-value,
.bonus-plastic-body strong,
.login-title{
  font-family:"Manrope","Inter","Segoe UI",Arial,sans-serif;
  font-variant-numeric:tabular-nums;
}
.dashboard-page{
  gap:22px;
}
.dashboard-metrics-grid{
  gap:16px;
}
.dashboard-metric-card{
  position:relative;
  overflow:hidden;
  min-height:174px;
  border-radius:18px;
  padding:20px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.98), rgba(249,251,253,.94)),
    #ffffff;
  border:1px solid rgba(16,24,40,.10);
  box-shadow:0 16px 38px rgba(16,24,40,.07);
}
.dashboard-metric-card::after{
  content:"";
  position:absolute;
  right:-34px;
  top:-34px;
  width:108px;
  height:108px;
  border-radius:50%;
  background:rgba(36,99,235,.08);
}
.dashboard-metric-success::after{background:rgba(7,148,85,.10)}
.dashboard-metric-warning::after{background:rgba(220,138,0,.12)}
.dashboard-metric-danger::after{background:rgba(220,38,38,.10)}
.dashboard-metric-info::after{background:rgba(20,136,204,.10)}
.dashboard-metric-label,
.stat-card-title{
  color:#667085;
  font-size:12px;
  font-weight:800;
  letter-spacing:.04em;
  text-transform:uppercase;
}
.dashboard-metric-main,
.stat-card-value{
  color:#101828;
  letter-spacing:0;
}
.dashboard-metric-hint,
.stat-card-hint{
  color:#667085;
}
.dashboard-metric-spark span{
  border-radius:999px 999px 0 0;
}
.dashboard-chip,
.login-status-pill,
.mini-badge,
.status-badge,
.table-chip{
  display:inline-flex;
  align-items:center;
  gap:6px;
  border-radius:999px;
  border:1px solid rgba(16,24,40,.10);
  font-weight:800;
  line-height:1;
  white-space:nowrap;
}
.status-badge{
  min-height:28px;
  padding:7px 10px;
}
.status-badge.done,
.status-badge.success,
.mini-badge.success{
  background:#ecfdf3;
  color:#067647;
  border-color:#abefc6;
}
.status-badge.doing,
.status-badge.info,
.mini-badge.info{
  background:#eff8ff;
  color:#1478F2;
  border-color:#b2ddff;
}
.status-badge.warning,
.mini-badge.warning{
  background:#fffaeb;
  color:#b54708;
  border-color:#fedf89;
}
.status-badge.cancelled,
.status-badge.danger,
.mini-badge.danger{
  background:#fef3f2;
  color:#b42318;
  border-color:#fecdca;
}
.table-chip{
  min-height:28px;
  padding:7px 10px;
  background:#f8fafc;
  color:#344054;
}
.table-chip.platform{
  background:#eef4ff;
  color:#1478F2;
  border-color:#c7d7fe;
}
.table-chip.platform-telegram{
  background:#eff8ff;
  color:#1478F2;
  border-color:#b2ddff;
}
.table-chip.platform-instagram{
  background:#fdf2fa;
  color:#c11574;
  border-color:#fcceee;
}
.table-chip.type.info,
.table-chip.rubric.info{
  background:#eff8ff;
  color:#1478F2;
  border-color:#b2ddff;
}
.table-chip.type.warning,
.table-chip.rubric.warning{
  background:#fffaeb;
  color:#b54708;
  border-color:#fedf89;
}
.table-chip.type.danger,
.table-chip.rubric.danger{
  background:#fef3f2;
  color:#b42318;
  border-color:#fecdca;
}
.table-chip-row{
  display:flex;
  align-items:center;
  gap:7px;
  flex-wrap:wrap;
}
.table-wrap{
  max-width:100%;
}
.table-wrap thead th{
  position:sticky;
  top:0;
  z-index:2;
  border-bottom:1px solid rgba(16,24,40,.10);
  box-shadow:0 1px 0 rgba(16,24,40,.04);
}
th,td{
  padding:14px 16px;
  vertical-align:middle;
}
tbody tr{
  transition:background .18s ease, box-shadow .18s ease;
}
.table-title-main{
  color:#101828;
  font-weight:800;
}
.table-title-sub,
.table-date-stack span,
.table-cell-muted{
  color:#667085;
}
.table-compact-amount,
.bonus-plastic-body strong,
.travel-balance-card-amount{
  font-variant-numeric:tabular-nums;
  letter-spacing:0;
}
.table-actions-shell,
.icon-actions{
  justify-content:flex-end;
}
.form-grid label span,
.campaign-lead-form label span,
.login-card label span{
  color:#475467;
  font-weight:750;
}
.form-grid input,
.form-grid select,
.form-grid textarea{
  min-height:48px;
  padding:12px 14px;
  box-shadow:inset 0 1px 1px rgba(16,24,40,.03);
}
.file-picker,
.discussion-upload{
  border-radius:16px;
  border:1px dashed rgba(36,99,235,.24);
  background:#f8fbff;
}
.modal-wrap{
  animation:modal-fade-in .16s ease both;
}
.modal-card{
  animation:modal-rise-in .2s cubic-bezier(.2,.8,.2,1) both;
}
@keyframes modal-fade-in{
  from{opacity:0}
  to{opacity:1}
}
@keyframes modal-rise-in{
  from{opacity:0;transform:translateY(14px) scale(.985)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
.content-detail-layout{
  display:grid;
  grid-template-columns:minmax(0, 1.04fr) minmax(340px, .96fr);
  gap:18px;
  align-items:start;
}
.content-detail-main,
.content-detail-side{
  min-width:0;
}
.content-detail-grid{
  grid-template-columns:repeat(2, minmax(0, 1fr));
}
.content-detail-grid > div{
  display:grid;
  gap:8px;
  padding:14px;
  border:1px solid rgba(16,24,40,.10);
  border-radius:16px;
  background:#f8fafc;
}
.content-detail-grid strong{
  color:#667085;
  font-size:12px;
  letter-spacing:.04em;
  text-transform:uppercase;
}
.content-detail-grid span{
  color:#101828;
  font-weight:750;
  line-height:1.45;
}
.discussion-panel{
  grid-template-columns:1fr;
  gap:12px;
}
.discussion-col{
  border:1px solid rgba(16,24,40,.10);
  border-radius:16px;
  background:#ffffff;
}
.bonus-plastic-section{
  border-radius:22px;
  padding:20px;
  background:
    linear-gradient(135deg, rgba(255,255,255,.96), rgba(248,250,252,.92)),
    #ffffff;
}
.bonus-plastic-card{
  position:relative;
  overflow:hidden;
  min-height:220px;
  border:1px solid rgba(255,255,255,.34);
  background:
    linear-gradient(140deg, rgba(16,24,40,.94), rgba(36,99,235,.76)),
    #101828;
}
.bonus-plastic-card::before{
  content:"";
  position:absolute;
  inset:0;
  background-image:
    linear-gradient(120deg, rgba(255,255,255,.18), rgba(255,255,255,0) 32%),
    repeating-linear-gradient(135deg, rgba(255,255,255,.055) 0 1px, transparent 1px 8px);
  pointer-events:none;
}
.bonus-plastic-card.card-2{
  background:
    linear-gradient(140deg, rgba(6,78,59,.96), rgba(15,159,143,.72)),
    #064e3b;
}
.bonus-plastic-body strong{
  font-size:clamp(25px, 3vw, 36px);
}
.bonus-plastic-footer,
.bonus-plastic-top,
.bonus-plastic-body{
  position:relative;
  z-index:1;
}
.deadline-item{
  border:1px solid rgba(16,24,40,.10);
  background:#ffffff;
  border-radius:16px;
}
.deadline-item.warning{
  background:#fffbf0;
  border-color:#fedf89;
}
.deadline-item.danger{
  background:#fff6f5;
  border-color:#fecdca;
}
.signal-item,
.dashboard-alert-card,
.reminder-card{
  border-radius:16px;
  border:1px solid rgba(16,24,40,.10);
}
.toast{
  animation:toast-in .18s ease both;
}
@keyframes toast-in{
  from{opacity:0;transform:translateY(10px) scale(.98)}
  to{opacity:1;transform:translateY(0) scale(1)}
}
.login-mode-panel{
  animation:tab-fade-in .18s ease both;
}
.finance-command-card{
  position:relative;
  overflow:hidden;
  display:grid;
  grid-template-columns:minmax(0, 1fr) minmax(360px, .82fr);
  gap:24px;
  padding:26px;
  border-radius:26px;
  border:1px solid rgba(16,24,40,.10);
  background:
    linear-gradient(135deg, rgba(16,24,40,.96), rgba(15,76,117,.86)),
    #101828;
  color:#fff;
  box-shadow:0 26px 70px rgba(16,24,40,.18);
}
.finance-command-card::after{
  content:"";
  position:absolute;
  inset:auto -80px -110px auto;
  width:280px;
  height:280px;
  border-radius:50%;
  background:rgba(20,120,242,.20);
  filter:blur(6px);
}
.finance-command-card h2{
  margin:10px 0 8px;
  font-size:clamp(28px, 3vw, 44px);
  line-height:1.04;
  letter-spacing:0;
}
.finance-command-card p{
  margin:0;
  max-width:680px;
  color:rgba(255,255,255,.76);
  line-height:1.65;
}
.finance-command-card .small-label{
  color:#EAF3FF;
}
.finance-command-grid{
  position:relative;
  z-index:1;
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:12px;
}
.finance-command-grid div{
  display:grid;
  gap:8px;
  padding:16px;
  border-radius:18px;
  background:rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.14);
  backdrop-filter:blur(12px);
}
.finance-command-grid span{
  color:rgba(255,255,255,.68);
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
  letter-spacing:.04em;
}
.finance-command-grid strong{
  font-family:"Manrope","Inter",sans-serif;
  font-size:20px;
  font-variant-numeric:tabular-nums;
}
.role-workspace-panel{
  display:grid;
  grid-template-columns:minmax(0, .95fr) minmax(420px, 1.05fr);
  gap:18px;
  align-items:stretch;
  padding:22px;
  border-radius:24px;
  border:1px solid rgba(16,24,40,.10);
  background:#fff;
  box-shadow:0 18px 48px rgba(16,24,40,.08);
}
.role-workspace-copy{
  display:grid;
  align-content:center;
  gap:8px;
}
.role-workspace-copy h2{
  margin:0;
  color:#101828;
  font-size:clamp(24px, 3vw, 38px);
  letter-spacing:0;
}
.role-workspace-copy p{
  margin:0;
  color:#667085;
  line-height:1.6;
}
.role-workspace-grid{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:10px;
}
.role-workspace-card{
  display:grid;
  gap:10px;
  min-height:120px;
  padding:16px;
  border-radius:18px;
  border:1px solid rgba(16,24,40,.10);
  background:#f8fafc;
}
.role-workspace-card span{
  color:#667085;
  font-size:12px;
  font-weight:850;
  text-transform:uppercase;
}
.role-workspace-card strong{
  color:#101828;
  font-size:clamp(22px, 3vw, 34px);
  font-variant-numeric:tabular-nums;
  align-self:end;
}
.role-workspace-card.success{background:#ecfdf3;border-color:#abefc6}
.role-workspace-card.warning{background:#fffaeb;border-color:#fedf89}
.role-workspace-card.danger{background:#fef3f2;border-color:#fecdca}
.role-workspace-card.info{background:#eff8ff;border-color:#b2ddff}
.finance-lock-banner{
  border-color:#fedf89;
  background:#fffaeb;
}
.finance-budget-form{
  margin-bottom:18px;
}
.finance-budget-grid{
  display:grid;
  grid-template-columns:repeat(2, minmax(0, 1fr));
  gap:12px;
}
.finance-budget-card{
  display:grid;
  gap:12px;
  padding:16px;
  border-radius:18px;
  border:1px solid rgba(16,24,40,.10);
  background:#fff;
}
.finance-budget-card > div:first-child{
  display:grid;
  gap:6px;
}
.finance-budget-card span{
  color:#667085;
  font-size:12px;
  font-weight:850;
  text-transform:uppercase;
}
.finance-budget-card strong{
  color:#101828;
  font-size:24px;
  font-variant-numeric:tabular-nums;
}
.finance-budget-card small{
  color:#667085;
}
.finance-budget-card.danger{
  border-color:#fecdca;
  background:#fff8f7;
}
.finance-budget-card.success{
  border-color:#abefc6;
  background:#fbfffd;
}
.finance-budget-track{
  height:10px;
  overflow:hidden;
  border-radius:999px;
  background:#eef2f6;
}
.finance-budget-track i{
  display:block;
  height:100%;
  border-radius:999px;
  background:#1478F2;
}
.finance-budget-card.danger .finance-budget-track i{
  background:#ef4444;
}
.brand-mark,
.loading-brand-image,
.menu-btn.active,
.mobile-nav-item.active .mobile-nav-icon,
.btn.primary,
.hero-badge,
.summary-pill,
.login-card-badge,
.install-pill,
.page-title-badge{
  --brand-green:#1478F2;
}
.btn.primary,
.brand-mark,
.stat-icon,
.panel-blue,
.icon-tone-blue,
.mobile-nav-item.active .mobile-nav-icon{
  background:linear-gradient(135deg,#1478F2,#0B63D1) !important;
  color:#fff;
}
.btn.primary{
  box-shadow:0 14px 30px rgba(20,120,242,.22);
}
.menu-btn.active,
.hero-badge,
.brand-kicker,
.stat-chip,
.bonus-head-total{
  background:rgba(20,120,242,.08) !important;
  border-color:rgba(20,120,242,.18) !important;
  color:#1478F2 !important;
}
.dashboard-metric-info .dashboard-metric-main,
.stat-card-info .stat-card-value,
.dashboard-alert-card.info strong,
.table-inline-link,
.link-btn{
  color:#1478F2 !important;
}
.login-page::before,
.loading-orb,
.dashboard-hero-glow{
  background:radial-gradient(circle, rgba(20,120,242,.20), transparent 68%) !important;
}
.table-chip.platform,
.status-badge.info,
.mini-badge.info{
  background:#F7F7F7;
  color:#1478F2;
  border-color:#D9D9D9;
}
.content-status-stepper span.active{
  color:#1478F2;
  background:#F7F7F7;
  border-color:#D9D9D9;
}
.content-status-stepper span.active i{
  background:#1478F2;
}
.fiscal-receipt{
  width:min(100%, 420px);
  margin:0 auto;
  padding:24px 20px 28px;
  background:#fff;
  color:#222;
  border:1px solid rgba(16,24,40,.12);
  border-radius:18px;
  box-shadow:0 18px 44px rgba(16,24,40,.10);
  font-family:"Inter","Segoe UI",Arial,sans-serif;
}
.receipt-brand{
  display:flex;
  align-items:center;
  gap:14px;
  padding:12px;
  border:1px solid rgba(16,24,40,.10);
  border-radius:16px;
}
.receipt-brand img{
  width:52px;
  height:52px;
  border-radius:14px;
  object-fit:cover;
}
.receipt-brand strong{
  display:block;
  font-size:22px;
  letter-spacing:0;
}
.receipt-brand span,
.receipt-meta span,
.receipt-small-line span,
.receipt-tax-line span,
.receipt-footer{
  color:#667085;
}
.receipt-center{
  display:grid;
  gap:4px;
  text-align:center;
  margin:22px 0 14px;
}
.receipt-center strong{
  font-size:24px;
  color:#007f73;
}
.receipt-meta{
  display:grid;
  gap:4px;
  font-size:14px;
}
.receipt-divider{
  height:1px;
  margin:12px 0;
  background:repeating-linear-gradient(90deg, #111 0 8px, transparent 8px 12px);
  opacity:.7;
}
.receipt-table{
  display:grid;
  gap:8px;
}
.receipt-table-head,
.receipt-table-row,
.receipt-small-line,
.receipt-tax-line{
  display:grid;
  grid-template-columns:1fr 56px 116px;
  gap:8px;
  align-items:start;
}
.receipt-table-head{
  font-weight:800;
  color:#475467;
}
.receipt-table-row span:last-child,
.receipt-total-line strong,
.receipt-tax-line strong{
  text-align:right;
  font-variant-numeric:tabular-nums;
}
.receipt-small-line{
  grid-template-columns:110px 1fr;
  font-size:12px;
}
.receipt-small-line strong{
  text-align:right;
  font-weight:600;
}
.receipt-total-line{
  display:flex;
  justify-content:space-between;
  gap:16px;
  align-items:flex-end;
}
.receipt-total-line span{
  font-size:22px;
}
.receipt-total-line strong{
  font-size:30px;
  font-weight:500;
}
.receipt-tax-line{
  grid-template-columns:1fr auto;
  margin-top:4px;
}
.receipt-qr{
  width:180px;
  height:180px;
  margin:22px auto 10px;
  display:grid;
  grid-template-columns:repeat(7, 1fr);
  gap:3px;
  padding:8px;
  background:#fff;
  border:6px solid #111;
}
.receipt-qr i{
  background:#fff;
}
.receipt-qr i.on{
  background:#111;
}
.receipt-footer{
  text-align:center;
  font-size:12px;
}
.login-command-preview{
  display:grid;
  gap:14px;
  margin-top:24px;
  padding:18px;
  border-radius:24px;
  background:rgba(255,255,255,.86);
  border:1px solid rgba(16,24,40,.10);
  box-shadow:0 18px 44px rgba(16,24,40,.10);
  backdrop-filter:blur(16px);
}
.login-command-top,
.login-preview-metrics{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
}
.login-command-top span,
.login-preview-metrics span{
  color:#667085;
  font-size:12px;
  font-weight:800;
  text-transform:uppercase;
}
.login-command-top strong{
  color:#1478F2;
}
.login-preview-metrics{
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
}
.login-preview-metrics div{
  display:grid;
  gap:7px;
  padding:14px;
  border-radius:18px;
  background:#f8fafc;
  border:1px solid rgba(16,24,40,.08);
}
.login-preview-metrics strong{
  color:#101828;
  font-size:22px;
  font-variant-numeric:tabular-nums;
}
.login-preview-flow{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:8px;
}
.login-preview-flow span,
.login-progress-steps span{
  display:inline-flex;
  align-items:center;
  justify-content:center;
  gap:7px;
  min-height:34px;
  padding:8px 10px;
  border-radius:999px;
  border:1px solid rgba(16,24,40,.10);
  background:#fff;
  color:#667085;
  font-size:12px;
  font-weight:850;
}
.login-preview-flow span.active,
.login-progress-steps span.active{
  color:#1478F2;
  background:#ecfdf3;
  border-color:#abefc6;
}
.login-progress-steps{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:8px;
  margin:14px 0 4px;
}
.login-progress-steps i{
  width:20px;
  height:20px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  border-radius:50%;
  background:rgba(16,24,40,.08);
  color:inherit;
  font-style:normal;
  font-size:11px;
}
.deadline-risk-pill{
  display:inline-flex;
  align-items:center;
  width:max-content;
  min-height:26px;
  padding:6px 10px;
  border-radius:999px;
  font-size:12px;
  font-weight:850;
  border:1px solid rgba(16,24,40,.10);
}
.deadline-risk-pill.success{background:#ecfdf3;color:#067647;border-color:#abefc6}
.deadline-risk-pill.warning{background:#fffaeb;color:#b54708;border-color:#fedf89}
.deadline-risk-pill.danger{background:#fef3f2;color:#b42318;border-color:#fecdca}
.deadline-risk-pill.default{background:#f8fafc;color:#475467}
.content-status-stepper{
  display:grid;
  grid-template-columns:repeat(5, minmax(0, 1fr));
  gap:8px;
  margin-bottom:14px;
}
.content-status-stepper span{
  display:flex;
  align-items:center;
  gap:8px;
  min-width:0;
  padding:10px 12px;
  border-radius:14px;
  background:#f8fafc;
  border:1px solid rgba(16,24,40,.08);
  color:#667085;
  font-size:12px;
  font-weight:850;
}
.content-status-stepper i{
  width:10px;
  height:10px;
  border-radius:50%;
  background:#cbd5e1;
}
.content-status-stepper span.active{
  color:#1478F2;
  background:#eff8ff;
  border-color:#b2ddff;
}
.content-status-stepper span.active i{
  background:#1478F2;
}
@media print{
  body *{
    visibility:hidden;
  }
  .fiscal-receipt,
  .fiscal-receipt *{
    visibility:visible;
  }
  .fiscal-receipt{
    position:absolute;
    left:0;
    top:0;
    width:100%;
    box-shadow:none;
    border:0;
  }
}
.public-site{
  min-height:100vh;
  background:#fff;
  color:#151515;
  font-family:"Inter","Manrope","Segoe UI",sans-serif;
  overflow:hidden;
}
.public-site a{
  color:inherit;
  text-decoration:none;
}
.public-contact-bar{
  width:min(1024px, calc(100% - 40px));
  min-height:64px;
  margin:0 auto;
  display:flex;
  align-items:center;
  justify-content:center;
  gap:10px;
  position:relative;
  color:#6b6f7a;
  font-weight:600;
}
.public-contact-bar strong{
  color:#111;
  font-weight:900;
}
.public-top-actions{
  position:absolute;
  right:0;
  display:flex;
  gap:12px;
  align-items:center;
}
.public-lang,
.public-login-link{
  height:44px;
  border:0;
  border-radius:16px;
  background:#fff;
  box-shadow:0 10px 28px rgba(15,23,42,.08);
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:0 16px;
  font-weight:900;
  color:#151515;
}
.public-lang svg,
.public-login-link svg{
  color:#1478F2;
}
.public-nav{
  width:min(1024px, calc(100% - 40px));
  min-height:108px;
  margin:0 auto;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:28px;
}
.public-logo{
  display:inline-flex;
  align-items:center;
  gap:12px;
  font-family:"Manrope","Inter",sans-serif;
  font-weight:900;
  font-size:28px;
  color:#1d1d1f;
}
.public-logo img{
  width:42px;
  height:42px;
  border-radius:13px;
  object-fit:contain;
}
.public-nav nav{
  display:flex;
  align-items:center;
  gap:30px;
  color:#5f6470;
  font-weight:800;
}
.public-nav nav a:hover{
  color:#1478F2;
}
.public-demo-btn{
  min-width:156px;
  height:56px;
  border-radius:16px;
  background:#eef2f7;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  color:#096AF0;
  font-weight:900;
  font-size:17px;
}
.public-hero{
  width:100%;
  min-height:760px;
  display:grid;
  grid-template-columns:minmax(220px, 1fr) minmax(520px, 720px) minmax(220px, 1fr);
  grid-template-rows:auto 1fr 1fr;
  gap:42px 70px;
  align-items:center;
  padding:34px 0 70px;
}
.public-hero-center{
  grid-column:2;
  grid-row:1 / span 2;
  text-align:center;
  align-self:start;
  padding-top:22px;
}
.public-hero-center h1{
  margin:0;
  font-family:"Manrope","Inter",sans-serif;
  font-size:68px;
  line-height:1.18;
  font-weight:900;
  letter-spacing:0;
}
.public-hero-center h1 span{
  color:#1478F2;
}
.public-hero-center p{
  width:min(640px, 100%);
  margin:26px auto 0;
  color:#6b6f7a;
  font-size:24px;
  line-height:1.4;
  font-weight:700;
}
.public-hero-actions{
  margin-top:42px;
  display:flex;
  justify-content:center;
  gap:38px;
  flex-wrap:wrap;
}
.public-primary,
.public-secondary{
  height:88px;
  border-radius:28px;
  padding:0 34px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-size:24px;
  font-weight:900;
}
.public-primary{
  background:#1478F2;
  color:#fff !important;
}
.public-secondary{
  background:#eef2f7;
  color:#096AF0 !important;
  gap:14px;
}
.public-secondary span{
  width:0;
  height:0;
  border-top:10px solid transparent;
  border-bottom:10px solid transparent;
  border-left:16px solid #1478F2;
}
.public-hero-media{
  height:360px;
  overflow:hidden;
  background:#f3f6fa;
  box-shadow:0 28px 70px rgba(20,24,31,.08);
}
.public-hero-media img{
  width:100%;
  height:100%;
  object-fit:cover;
  display:block;
}
.public-hero-media.left-top{
  grid-column:1;
  grid-row:1 / span 2;
  border-radius:0 38px 38px 0;
  align-self:center;
}
.public-hero-media.right-top{
  grid-column:3;
  grid-row:1 / span 2;
  border-radius:38px 0 0 38px;
  align-self:start;
}
.public-hero-media.left-bottom{
  grid-column:1;
  grid-row:3;
  border-radius:0 38px 38px 0;
}
.public-hero-media.right-bottom{
  grid-column:3;
  grid-row:3;
  border-radius:38px 0 0 38px;
}
.public-hero-preview{
  grid-column:2;
  grid-row:3;
  align-self:end;
}
.public-preview-window{
  height:300px;
  border-radius:38px 38px 0 0;
  background:#fff;
  display:grid;
  grid-template-columns:180px 1fr;
  overflow:hidden;
  box-shadow:0 -10px 52px rgba(15,23,42,.12);
  transform:translateY(10px);
}
.public-preview-sidebar{
  background:#f0f3f7;
  padding:24px;
  display:grid;
  align-content:start;
  gap:16px;
}
.public-preview-sidebar img{
  width:34px;
  height:34px;
  border-radius:10px;
}
.public-preview-sidebar span{
  padding:10px 12px;
  border-radius:12px;
  color:#68707d;
  font-weight:800;
}
.public-preview-sidebar span.active{
  background:#e4eefb;
  color:#1478F2;
}
.public-preview-main{
  padding:26px 30px;
}
.public-preview-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
}
.public-preview-head strong{
  font-size:25px;
  font-family:"Manrope","Inter",sans-serif;
}
.public-preview-head button{
  border:0;
  background:#1478F2;
  color:#fff;
  border-radius:14px;
  padding:12px 18px;
  font-weight:900;
}
.public-preview-stats{
  display:grid;
  grid-template-columns:repeat(3, 1fr);
  gap:14px;
  margin-top:22px;
}
.public-preview-stats div{
  border:1px solid #edf0f4;
  border-radius:18px;
  padding:14px;
  box-shadow:0 12px 28px rgba(15,23,42,.05);
}
.public-preview-stats span,
.public-preview-table i{
  display:block;
  color:#8b929e;
  font-size:12px;
  font-style:normal;
  font-weight:800;
}
.public-preview-stats strong{
  color:#1478F2;
  font-size:22px;
  margin-top:5px;
  display:block;
}
.public-preview-table{
  margin-top:18px;
  border-top:1px solid #edf0f4;
}
.public-preview-table div{
  min-height:44px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  border-bottom:1px solid #edf0f4;
  color:#505866;
  font-weight:800;
}
.public-section,
.public-testimonials{
  width:min(1180px, calc(100% - 40px));
  margin:0 auto;
  padding:96px 0;
}
.public-section-title{
  max-width:760px;
}
.public-section-title h2,
.public-showcase-section h2,
.public-cta h2{
  margin:0;
  color:#111;
  font-family:"Manrope","Inter",sans-serif;
  font-size:56px;
  line-height:1.12;
  font-weight:900;
}
.public-section-title p,
.public-showcase-section p,
.public-cta p{
  color:#6b6f7a;
  font-size:21px;
  line-height:1.5;
  font-weight:700;
}
.public-card-grid{
  margin-top:44px;
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:22px;
}
.public-solution-card,
.public-testimonial,
.public-showcase-card{
  background:#fff;
  border:1px solid #edf0f4;
  border-radius:30px;
  box-shadow:0 18px 48px rgba(15,23,42,.07);
}
.public-solution-card{
  padding:28px;
}
.public-card-count{
  color:#d8dee7;
  font-size:36px;
  font-weight:900;
}
.public-solution-card h3{
  margin:18px 0 0;
  font-size:26px;
  font-family:"Manrope","Inter",sans-serif;
}
.public-solution-card p{
  color:#6b6f7a;
  line-height:1.55;
  font-weight:650;
}
.public-card-foot{
  display:flex;
  justify-content:space-between;
  align-items:center;
  margin-top:24px;
}
.public-card-foot a,
.public-card-foot strong{
  color:#1478F2;
  font-weight:900;
}
.public-showcase-section{
  width:min(1180px, calc(100% - 40px));
  margin:0 auto;
  padding:82px;
  border-radius:44px;
  background:#f6f8fb;
  display:grid;
  grid-template-columns:1fr 420px;
  gap:44px;
  align-items:center;
}
.public-kicker{
  color:#1478F2;
  font-weight:900;
}
.public-showcase-card{
  padding:26px;
}
.public-showcase-row{
  display:flex;
  align-items:center;
  justify-content:space-between;
  padding:18px 0;
  border-bottom:1px solid #edf0f4;
  color:#6b6f7a;
  font-weight:800;
}
.public-showcase-row strong{
  color:#1478F2;
}
.public-showcase-progress{
  height:14px;
  border-radius:999px;
  background:#edf2f8;
  overflow:hidden;
  margin-top:22px;
}
.public-showcase-progress i{
  display:block;
  width:82%;
  height:100%;
  background:#1478F2;
}
.public-testimonial-grid{
  margin-top:34px;
  display:grid;
  grid-template-columns:repeat(3, minmax(0, 1fr));
  gap:22px;
}
.public-testimonial{
  padding:28px;
}
.public-testimonial p{
  color:#4f5662;
  line-height:1.55;
  font-weight:700;
}
.public-testimonial strong{
  display:block;
  margin-top:24px;
  font-size:18px;
}
.public-testimonial span{
  display:block;
  color:#8b929e;
  margin-top:4px;
  font-weight:700;
}
.public-cta{
  width:min(1180px, calc(100% - 40px));
  margin:0 auto 90px;
  padding:76px;
  border-radius:44px;
  background:#1478F2;
  color:#fff;
}
.public-cta h2,
.public-cta p{
  color:#fff;
}
.public-cta a{
  margin-top:22px;
  display:inline-flex;
  height:62px;
  align-items:center;
  justify-content:center;
  padding:0 28px;
  border-radius:18px;
  background:#fff;
  color:#1478F2;
  font-weight:900;
}
.public-footer{
  width:min(1180px, calc(100% - 40px));
  margin:0 auto;
  padding:46px 0 70px;
  border-top:1px solid #edf0f4;
  display:grid;
  grid-template-columns:1.3fr 1fr 1fr;
  gap:32px;
  color:#6b6f7a;
}
.public-footer strong,
.public-footer a{
  display:block;
}
.public-footer strong{
  color:#151515;
  margin-bottom:14px;
}
.public-footer a{
  margin:10px 0;
  font-weight:700;
}
@media (max-width: 1180px){
  .public-nav nav{
    display:none;
  }
  .public-hero{
    grid-template-columns:1fr;
    min-height:auto;
    gap:24px;
    padding:20px 20px 70px;
  }
  .public-hero-center,
  .public-hero-preview,
  .public-hero-media.left-top,
  .public-hero-media.right-top,
  .public-hero-media.left-bottom,
  .public-hero-media.right-bottom{
    grid-column:1;
    grid-row:auto;
    border-radius:30px;
  }
  .public-hero-media{
    height:260px;
  }
  .public-hero-center h1{
    font-size:48px;
  }
  .public-card-grid,
  .public-testimonial-grid,
  .public-showcase-section,
  .public-footer{
    grid-template-columns:1fr;
  }
}
@media (max-width: 720px){
  .public-contact-bar{
    justify-content:flex-start;
    padding-right:0;
  }
  .public-top-actions{
    position:static;
    margin-left:auto;
  }
  .public-nav{
    min-height:86px;
  }
  .public-demo-btn{
    display:none;
  }
  .public-logo{
    font-size:22px;
  }
  .public-hero-center h1,
  .public-section-title h2,
  .public-showcase-section h2,
  .public-cta h2{
    font-size:36px;
  }
  .public-hero-center p{
    font-size:18px;
  }
  .public-primary,
  .public-secondary{
    width:100%;
    height:64px;
    font-size:18px;
  }
  .public-preview-window{
    grid-template-columns:1fr;
    height:auto;
  }
  .public-preview-sidebar{
    display:none;
  }
  .public-preview-stats{
    grid-template-columns:1fr;
  }
  .public-showcase-section,
  .public-cta{
    padding:34px 22px;
  }
}
@keyframes tab-fade-in{
  from{opacity:0;transform:translateY(5px)}
  to{opacity:1;transform:translateY(0)}
}
@media (max-width: 1100px){
  .login-shell{
    grid-template-columns:1fr;
  }
  .content-detail-layout{
    grid-template-columns:1fr;
  }
  .finance-command-card{
    grid-template-columns:1fr;
  }
  .role-workspace-panel,
  .finance-budget-grid{
    grid-template-columns:1fr;
  }
  .role-workspace-grid{
    grid-template-columns:repeat(2, minmax(0, 1fr));
  }
  .login-card{
    width:min(100%, 560px);
  }
}
@media (max-width: 720px){
  .login-feature-row,.login-metrics-row,.login-mode-switch,.login-preview-metrics,.login-preview-flow,.login-progress-steps,.content-status-stepper{
    grid-template-columns:1fr;
  }
  .content-detail-grid{
    grid-template-columns:1fr;
  }
  .finance-command-grid{
    grid-template-columns:1fr;
  }
  .role-workspace-grid{
    grid-template-columns:1fr;
  }
  .inline-action-row{
    flex-direction:column;
    align-items:stretch;
  }
}

/* Billz-style final panel layer: this intentionally sits last so older OS 9 styles cannot override it. */
:root{
  --blue:#1478F2;
  --blue-strong:#0B63D1;
  --accent:#EAF3FF;
  --accent-soft:rgba(20,120,242,.10);
  --bg:#F6F8FB;
  --bg-elevated:#FFFFFF;
  --panel:#FFFFFF;
  --panel-strong:#FFFFFF;
  --panel-soft:#F3F6FA;
  --soft:#F6F8FB;
  --soft-strong:#E6EAF0;
  --text:#151515;
  --text-soft:#2B2F36;
  --muted:#6B6F7A;
  --line:#E6EAF0;
  --line-strong:#D8DEE8;
  --shadow-soft:0 12px 32px rgba(15,23,42,.05);
  --shadow-card:0 18px 48px rgba(15,23,42,.07);
  --shadow-float:0 24px 60px rgba(15,23,42,.12);
  --ring:0 0 0 4px rgba(20,120,242,.14);
}
html,
body,
#root{
  background:#F6F8FB !important;
  color:#151515;
  font-family:"Inter","Manrope","Segoe UI",sans-serif !important;
}
h1,h2,h3,h4,
.brand-name,
.topbar h1,
.section-head h2,
.stat-card-value,
.dashboard-metric-main{
  font-family:"Manrope","Inter","Segoe UI",sans-serif !important;
  letter-spacing:0 !important;
}
.app-shell{
  background:#F6F8FB !important;
  grid-template-columns:278px 1fr !important;
}
.sidebar{
  background:#F1F4F8 !important;
  border-right:1px solid #E3E8F0 !important;
  padding:24px 18px !important;
  box-shadow:none !important;
}
.brand-block{
  min-height:62px;
  padding:4px 2px 18px;
  border-bottom:1px solid #E1E7EF;
}
.brand-mark{
  width:44px !important;
  height:44px !important;
  border-radius:14px !important;
  background:#1478F2 !important;
  box-shadow:none !important;
}
.brand-mark-image{
  border-radius:14px !important;
}
.brand-name{
  color:#1D1D1F !important;
  font-size:24px !important;
  font-weight:900 !important;
}
.brand-desc{
  color:#7A828F !important;
  font-size:12px !important;
  font-weight:700 !important;
}
.sidebar-search,
.global-search,
.table-search,
.form-grid input,
.form-grid select,
.login-card input,
.modal-card input,
.modal-card select,
.modal-card textarea,
.card input,
.card select,
.card textarea,
.table-filter,
.theme-toggle,
.notif-pill,
.user-chip{
  background:#F7F9FC !important;
  border:1px solid #E3E8F0 !important;
  border-radius:14px !important;
  box-shadow:none !important;
}
.sidebar-search input,
.global-search input,
.table-search input,
.form-grid input,
.form-grid select,
.modal-card input,
.modal-card select,
.modal-card textarea,
.card input,
.card select,
.card textarea{
  color:#151515 !important;
}
.menu-group-toggle,
.mobile-menu-title{
  color:#98A1AF !important;
  font-size:12px !important;
  font-weight:900 !important;
  text-transform:uppercase;
  letter-spacing:0 !important;
}
.menu-list{
  gap:6px !important;
}
.menu-btn{
  min-height:46px !important;
  padding:11px 12px !important;
  border-radius:12px !important;
  color:#4F5662 !important;
  font-weight:850 !important;
  background:transparent !important;
  border:1px solid transparent !important;
}
.menu-btn:hover{
  background:#FFFFFF !important;
  border-color:#E8EDF4 !important;
}
.menu-btn.active{
  background:#E7F0FE !important;
  border-color:#D5E6FF !important;
  color:#1478F2 !important;
  box-shadow:none !important;
}
.menu-icon-wrap,
.page-title-badge,
.mobile-nav-icon,
.stat-icon{
  background:#E7F0FE !important;
  color:#1478F2 !important;
  box-shadow:none !important;
}
.menu-btn.active .menu-icon-wrap,
.mobile-nav-item.active .mobile-nav-icon{
  background:#1478F2 !important;
  color:#FFFFFF !important;
}
.main-area{
  background:#F6F8FB !important;
  padding:22px 26px 34px !important;
}
.topbar{
  background:#FFFFFF !important;
  border:1px solid #E6EAF0 !important;
  border-radius:22px !important;
  box-shadow:0 12px 32px rgba(15,23,42,.05) !important;
  padding:18px 22px !important;
}
.topbar h1{
  color:#151515 !important;
  font-size:32px !important;
  font-weight:900 !important;
}
.small-label,
.section-label{
  color:#1478F2 !important;
  letter-spacing:0 !important;
  font-weight:900 !important;
}
.page-layer{
  padding-top:20px !important;
}
.hero-banner,
.hero-shell,
.card,
.stat-card,
.content-list-card,
.calendar-pro-card,
.role-workspace-card,
.finance-command-card,
.finance-budget-card,
.dashboard-alert-card,
.mobile-record-card,
.notif-card,
.permission-box,
.permission-item{
  background:#FFFFFF !important;
  border:1px solid #E6EAF0 !important;
  border-radius:24px !important;
  box-shadow:0 18px 48px rgba(15,23,42,.06) !important;
}
.card:hover,
.stat-card:hover{
  transform:none !important;
  box-shadow:0 22px 54px rgba(15,23,42,.08) !important;
}
.stat-card{
  padding:22px !important;
}
.stat-card-title,
.stat-title,
.dashboard-metric-label{
  color:#7A828F !important;
  letter-spacing:0 !important;
}
.stat-card-value,
.dashboard-metric-main,
.dashboard-metric-info .dashboard-metric-main,
.stat-card-info .stat-card-value{
  color:#1478F2 !important;
  font-weight:900 !important;
}
.btn{
  border-radius:14px !important;
  font-weight:900 !important;
  min-height:44px !important;
  box-shadow:none !important;
}
.btn.primary,
.campaign-lead-form .btn.primary{
  background:#1478F2 !important;
  color:#FFFFFF !important;
  box-shadow:0 12px 24px rgba(20,120,242,.22) !important;
}
.btn.primary:hover{
  background:#0B63D1 !important;
}
.btn.secondary,
.btn.ghost,
.filter-btn,
.tab-btn,
.view-toggle-btn{
  background:#F3F6FA !important;
  border:1px solid #E3E8F0 !important;
  color:#303642 !important;
}
.btn.secondary:hover,
.btn.ghost:hover,
.tab-btn.active,
.view-toggle-btn.active{
  background:#E7F0FE !important;
  color:#1478F2 !important;
  border-color:#D5E6FF !important;
}
.table-wrap{
  background:#FFFFFF !important;
  border:1px solid #E6EAF0 !important;
  border-radius:22px !important;
  box-shadow:0 18px 44px rgba(15,23,42,.05) !important;
}
.table-wrap table,
table{
  background:#FFFFFF !important;
  border-collapse:separate !important;
  border-spacing:0 !important;
}
th,
.table-wrap thead th{
  background:#F7F9FC !important;
  color:#9099A6 !important;
  font-size:12px !important;
  font-weight:900 !important;
  letter-spacing:0 !important;
  text-transform:none !important;
  border-bottom:1px solid #E6EAF0 !important;
}
td,
.table-wrap tbody td{
  color:#4A515D !important;
  border-bottom:1px solid #EEF2F6 !important;
  font-weight:650 !important;
}
tr:hover td,
.table-wrap tbody tr:hover td{
  background:#F9FBFE !important;
}
.table-inline-link,
.link-btn,
.content-title-link{
  color:#1478F2 !important;
  font-weight:900 !important;
}
.table-chip,
.status-badge,
.mini-badge,
.deadline-pill,
.platform-badge{
  border-radius:999px !important;
  border:1px solid #E3E8F0 !important;
  background:#F7F9FC !important;
  color:#5F6672 !important;
  font-weight:900 !important;
}
.table-chip.platform,
.status-badge.info,
.mini-badge.info,
.content-status-stepper span.active{
  background:#E7F0FE !important;
  color:#1478F2 !important;
  border-color:#D5E6FF !important;
}
.status-badge.success,
.mini-badge.success{
  background:#EAF8F1 !important;
  color:#12805C !important;
  border-color:#CFEFDF !important;
}
.status-badge.warning,
.mini-badge.warning{
  background:#FFF3E8 !important;
  color:#B45A0B !important;
  border-color:#FFDAB8 !important;
}
.status-badge.danger,
.mini-badge.danger{
  background:#FFF0F0 !important;
  color:#C33131 !important;
  border-color:#FFD2D2 !important;
}
.modal-card,
.drawer-panel{
  background:#FFFFFF !important;
  border:1px solid #E6EAF0 !important;
  border-radius:28px !important;
  box-shadow:0 28px 80px rgba(15,23,42,.16) !important;
}
.modal-card::before,
.stat-card::after,
.hero-banner::before{
  display:none !important;
}
.logout-btn{
  background:#151515 !important;
  color:#FFFFFF !important;
  border-radius:14px !important;
  box-shadow:none !important;
}
.sidebar-help-card{
  display:grid;
  gap:8px;
  margin-top:auto;
  padding:16px;
  border-radius:20px;
  background:#FFFFFF;
  border:1px solid #E3E8F0;
  box-shadow:0 12px 28px rgba(15,23,42,.04);
}
.sidebar-help-card span{
  color:#98A1AF;
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
}
.sidebar-help-card strong{
  color:#151515;
  font-size:16px;
}
.sidebar-help-card small{
  color:#6B6F7A;
  line-height:1.45;
}
.sidebar-help-card a{
  width:max-content;
  min-height:36px;
  display:inline-flex;
  align-items:center;
  padding:0 14px;
  border-radius:12px;
  background:#1478F2;
  color:#FFFFFF;
  text-decoration:none;
  font-weight:900;
}
.billz-catalog-panel{
  background:#FFFFFF;
  border:1px solid #E6EAF0;
  border-radius:28px;
  padding:24px;
  box-shadow:0 18px 48px rgba(15,23,42,.06);
  display:grid;
  gap:18px;
}
.billz-catalog-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:18px;
}
.billz-kicker{
  color:#1478F2;
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
}
.billz-catalog-head h2{
  margin:8px 0 0;
  font-size:38px;
  line-height:1.08;
  font-weight:900;
  color:#151515;
  font-family:"Manrope","Inter",sans-serif;
}
.billz-catalog-head p{
  max-width:720px;
  margin:10px 0 0;
  color:#6B6F7A;
  font-size:16px;
  line-height:1.55;
  font-weight:700;
}
.billz-action-btn{
  min-width:132px;
  height:52px;
  border:0;
  border-radius:16px;
  background:#1478F2;
  color:#FFFFFF;
  font-weight:900;
  box-shadow:0 12px 24px rgba(20,120,242,.20);
}
.billz-kpi-row{
  display:grid;
  grid-template-columns:repeat(4, minmax(0, 1fr));
  gap:14px;
}
.billz-kpi-card{
  min-height:100px;
  padding:18px;
  border:1px solid #EDF1F6;
  border-radius:22px;
  display:flex;
  gap:14px;
  align-items:flex-start;
  box-shadow:0 10px 28px rgba(15,23,42,.04);
}
.billz-kpi-icon{
  width:38px;
  height:38px;
  display:grid;
  place-items:center;
  border-radius:14px;
  background:#E7F0FE;
  color:#1478F2;
}
.billz-kpi-card span:not(.billz-kpi-icon){
  color:#8A93A0;
  font-size:12px;
  font-weight:850;
}
.billz-kpi-card strong{
  display:block;
  margin-top:7px;
  color:#1478F2;
  font-size:24px;
  font-weight:900;
  font-variant-numeric:tabular-nums;
}
.billz-toolbar{
  display:grid;
  grid-template-columns:auto minmax(240px, 1fr) auto;
  gap:12px;
  align-items:center;
}
.billz-tabs{
  display:flex;
  gap:6px;
  flex-wrap:wrap;
}
.billz-tabs button,
.billz-filter-btn{
  min-height:42px;
  border:0;
  border-radius:14px;
  background:#F3F6FA;
  color:#7A828F;
  padding:0 14px;
  font-weight:900;
}
.billz-tabs button.active{
  background:#E7F0FE;
  color:#1478F2;
}
.billz-searchbar{
  min-height:46px;
  border-radius:14px;
  background:#F7F9FC;
  border:1px solid #E6EAF0;
  display:flex;
  align-items:center;
  gap:10px;
  padding:0 14px;
  color:#9AA3AF;
  font-weight:800;
}
.billz-filter-btn{
  display:flex;
  align-items:center;
  gap:8px;
}
.billz-catalog-table{
  border:1px solid #E6EAF0;
  border-radius:20px;
  overflow:hidden;
}
.billz-catalog-tr{
  min-height:54px;
  display:grid;
  grid-template-columns:minmax(180px, 1.2fr) .7fr .7fr 1fr;
  gap:14px;
  align-items:center;
  padding:0 16px;
  border-bottom:1px solid #EEF2F6;
  color:#5A6270;
  font-weight:750;
}
.billz-catalog-tr:last-child{
  border-bottom:0;
}
.billz-catalog-tr.head{
  background:#F7F9FC;
  color:#98A1AF;
  font-size:12px;
  font-weight:900;
}
.billz-row-title{
  color:#1478F2;
  font-weight:900;
}
.billz-catalog-tr strong{
  color:#151515;
  font-weight:900;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.billz-dot{
  width:9px;
  height:9px;
  display:inline-block;
  border-radius:50%;
  background:#1478F2;
  margin-right:6px;
}
.billz-dot.success{background:#21B573}
.billz-dot.warning{background:#FF7A1A}
.billz-dot.danger{background:#EF4444}
.billz-empty-state{
  min-height:160px;
  display:grid;
  place-items:center;
  align-content:center;
  gap:8px;
  color:#8A93A0;
}
.billz-empty-state strong{
  color:#151515;
}
.billz-empty-state svg{
  color:#1478F2;
}
.login-page{
  background:#FFFFFF !important;
  min-height:100vh !important;
  padding:42px !important;
  display:grid !important;
  place-items:center !important;
}
.login-page::before,
.login-page::after{
  display:none !important;
}
.login-shell{
  width:min(1180px, 100%) !important;
  min-height:720px !important;
  display:grid !important;
  grid-template-columns:1.05fr .95fr !important;
  gap:34px !important;
  align-items:center !important;
}
.login-copy{
  min-height:620px !important;
  padding:42px !important;
  border-radius:38px !important;
  background:#F6F8FB !important;
  border:1px solid #E6EAF0 !important;
  box-shadow:0 22px 60px rgba(15,23,42,.08) !important;
  overflow:hidden !important;
}
.login-logo-lockup{
  margin-bottom:34px !important;
}
.login-logo-image{
  width:54px !important;
  height:54px !important;
  border-radius:16px !important;
}
.login-logo-copy strong{
  color:#151515 !important;
  font-family:"Manrope","Inter",sans-serif !important;
  font-weight:900 !important;
  font-size:24px !important;
}
.login-logo-copy span{
  color:#7A828F !important;
  font-weight:750 !important;
}
.login-copy h1{
  color:#151515 !important;
  font-size:56px !important;
  line-height:1.08 !important;
  font-weight:900 !important;
  font-family:"Manrope","Inter",sans-serif !important;
  max-width:560px !important;
}
.login-copy p{
  max-width:540px !important;
  color:#6B6F7A !important;
  font-size:19px !important;
  line-height:1.55 !important;
  font-weight:700 !important;
}
.login-public-nav{
  display:none !important;
}
.login-status-row.compact{
  display:flex !important;
  flex-wrap:wrap !important;
  gap:8px !important;
  margin-top:24px !important;
}
.login-status-pill,
.login-card-badge{
  background:#E7F0FE !important;
  color:#1478F2 !important;
  border:1px solid #D5E6FF !important;
  border-radius:999px !important;
  font-weight:900 !important;
}
.login-command-preview{
  background:#FFFFFF !important;
  border-color:#E6EAF0 !important;
  box-shadow:0 18px 44px rgba(15,23,42,.07) !important;
}
.login-preview-metrics div{
  background:#F7F9FC !important;
  border-color:#E6EAF0 !important;
}
.login-preview-metrics strong{
  color:#1478F2 !important;
}
.login-preview-flow span.active,
.login-progress-steps span.active{
  background:#E7F0FE !important;
  color:#1478F2 !important;
  border-color:#D5E6FF !important;
}
.login-card{
  width:100% !important;
  max-width:500px !important;
  justify-self:end !important;
  border-radius:32px !important;
  background:#FFFFFF !important;
  border:1px solid #E6EAF0 !important;
  box-shadow:0 24px 70px rgba(15,23,42,.12) !important;
  padding:32px !important;
}
.login-title{
  color:#151515 !important;
  font-size:34px !important;
  font-family:"Manrope","Inter",sans-serif !important;
  font-weight:900 !important;
}
.login-subtitle{
  color:#7A828F !important;
  font-weight:700 !important;
}
.login-mode-switch{
  background:#F3F6FA !important;
  border:1px solid #E6EAF0 !important;
  border-radius:18px !important;
  padding:6px !important;
  display:grid !important;
  grid-template-columns:repeat(3, minmax(0, 1fr)) !important;
  gap:6px !important;
}
.login-mode-btn{
  border:0 !important;
  border-radius:14px !important;
  background:transparent !important;
  box-shadow:none !important;
}
.login-mode-btn.active{
  background:#FFFFFF !important;
  color:#1478F2 !important;
  box-shadow:0 10px 24px rgba(15,23,42,.08) !important;
}
.login-mode-panel label span,
.login-card label span{
  color:#667085 !important;
  font-weight:850 !important;
}
.login-card input,
.login-card select{
  min-height:52px !important;
  background:#F7F9FC !important;
  border:1px solid #E1E7EF !important;
  border-radius:16px !important;
  color:#151515 !important;
  font-weight:750 !important;
}
.login-card .btn.primary{
  min-height:54px !important;
  border-radius:17px !important;
  background:#1478F2 !important;
  color:#fff !important;
  font-weight:900 !important;
}
.login-loader-ring{
  border-top-color:#1478F2 !important;
}

/* Billz-grade component detailing */
.section-title-row{
  align-items:center !important;
  gap:18px !important;
  margin-bottom:18px !important;
}
.section-title-row h2{
  color:#151515 !important;
  font-size:26px !important;
  line-height:1.16 !important;
  font-weight:900 !important;
}
.section-title-row p{
  margin-top:6px !important;
  color:#7A828F !important;
  font-size:14px !important;
  line-height:1.45 !important;
  font-weight:700 !important;
}
.toolbar-actions{
  gap:10px !important;
  align-items:center !important;
}
.toolbar-actions select,
.toolbar-actions input,
.toolbar-actions .btn,
.content-modern-toolbar .btn,
.content-modern-toolbar select{
  min-height:44px !important;
  border-radius:14px !important;
}
.toolbar-actions select,
.calendar-pro-toolbar select,
.content-modern-toolbar select{
  background:#F7F9FC !important;
  border:1px solid #E3E8F0 !important;
  color:#4F5662 !important;
  font-weight:850 !important;
  padding:0 36px 0 14px !important;
}
.icon-actions,
.table-actions-shell{
  display:flex !important;
  justify-content:flex-end !important;
  gap:7px !important;
}
.icon-btn,
.icon-actions button,
.table-actions-shell button:not(.btn){
  width:34px !important;
  height:34px !important;
  min-width:34px !important;
  border-radius:11px !important;
  border:1px solid #E3E8F0 !important;
  background:#F7F9FC !important;
  color:#1478F2 !important;
  display:inline-grid !important;
  place-items:center !important;
  box-shadow:none !important;
}
.icon-btn:hover,
.icon-actions button:hover,
.table-actions-shell button:not(.btn):hover{
  background:#E7F0FE !important;
  border-color:#D5E6FF !important;
  transform:none !important;
}
.icon-actions button:last-child,
.table-actions-shell button:last-child{
  color:#EF4444 !important;
}
.form-grid{
  gap:14px !important;
}
.form-grid label{
  gap:8px !important;
}
.form-grid label span,
.modal-card label span,
.card label span{
  color:#6B6F7A !important;
  font-size:12px !important;
  font-weight:900 !important;
  letter-spacing:0 !important;
}
.form-grid input,
.form-grid select,
.form-grid textarea,
.modal-card input,
.modal-card select,
.modal-card textarea,
.card input,
.card select,
.card textarea{
  min-height:52px !important;
  border-radius:16px !important;
  padding:0 15px !important;
  background:#F7F9FC !important;
  border:1px solid #E1E7EF !important;
  color:#151515 !important;
  font-weight:750 !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.75) !important;
}
.form-grid textarea,
.modal-card textarea,
.card textarea{
  min-height:104px !important;
  padding:14px 15px !important;
}
.form-grid input:focus,
.form-grid select:focus,
.form-grid textarea:focus,
.modal-card input:focus,
.modal-card select:focus,
.modal-card textarea:focus,
.card input:focus,
.card select:focus,
.card textarea:focus{
  background:#FFFFFF !important;
  border-color:#1478F2 !important;
  box-shadow:0 0 0 4px rgba(20,120,242,.12) !important;
}
.full-col{
  grid-column:1 / -1 !important;
}
.stats-grid{
  gap:14px !important;
}
.stat-card{
  min-height:126px !important;
  display:grid !important;
  align-content:start !important;
  gap:8px !important;
}
.stat-card-indicator{
  width:34px !important;
  height:34px !important;
  border-radius:13px !important;
  position:static !important;
  box-shadow:none !important;
  background:#E7F0FE !important;
}
.stat-card-title{
  color:#8A93A0 !important;
  font-size:12px !important;
  font-weight:900 !important;
  text-transform:none !important;
}
.stat-card-value{
  margin:0 !important;
  font-size:30px !important;
  line-height:1.08 !important;
  color:#1478F2 !important;
  font-weight:900 !important;
}
.stat-card-hint{
  color:#7A828F !important;
  font-size:13px !important;
  font-weight:700 !important;
}
.dashboard-metric-card{
  background:#FFFFFF !important;
  border:1px solid #E6EAF0 !important;
  border-radius:24px !important;
  box-shadow:0 16px 40px rgba(15,23,42,.055) !important;
  overflow:hidden !important;
}
.dashboard-metric-dot{
  width:34px !important;
  height:34px !important;
  border-radius:13px !important;
  background:#E7F0FE !important;
  box-shadow:none !important;
}
.dashboard-metric-spark span{
  background:#D5E6FF !important;
  border-radius:999px 999px 0 0 !important;
}
.dashboard-metric-main{
  font-size:34px !important;
}
.content-modern-stats,
.bonus-command-grid,
.finance-command-grid,
.role-workspace-grid,
.finance-budget-grid{
  gap:14px !important;
}
.content-modern-stat,
.bonus-command-grid > div,
.finance-command-grid > div,
.role-workspace-card,
.finance-budget-card{
  background:#FFFFFF !important;
  border:1px solid #E6EAF0 !important;
  border-radius:22px !important;
  box-shadow:0 12px 32px rgba(15,23,42,.045) !important;
}
.content-modern-stat span,
.bonus-command-grid span,
.finance-command-grid span,
.role-workspace-card span,
.finance-budget-card span{
  color:#8A93A0 !important;
  font-size:12px !important;
  font-weight:900 !important;
  letter-spacing:0 !important;
}
.content-modern-stat strong,
.bonus-command-grid strong,
.finance-command-grid strong,
.role-workspace-card strong,
.finance-budget-card strong{
  color:#1478F2 !important;
  font-family:"Manrope","Inter",sans-serif !important;
  font-weight:900 !important;
}
.content-control-panel,
.discussion-col,
.calendar-pro-shell,
.kanban-column,
.bonus-plastic-section,
.finance-command-card,
.role-workspace-panel{
  background:#FFFFFF !important;
  border:1px solid #E6EAF0 !important;
  border-radius:26px !important;
  box-shadow:0 16px 44px rgba(15,23,42,.055) !important;
}
.content-control-head strong,
.calendar-pro-day strong,
.kanban-head strong{
  color:#151515 !important;
  font-weight:900 !important;
}
.content-control-head span,
.calendar-pro-day small,
.kanban-head span{
  color:#8A93A0 !important;
  font-weight:850 !important;
}
.deadline-item,
.signal-item,
.approval-history-mini button,
.kanban-card,
.mobile-record-card,
.reminder-card{
  background:#FFFFFF !important;
  border:1px solid #E6EAF0 !important;
  border-radius:18px !important;
  box-shadow:0 10px 24px rgba(15,23,42,.04) !important;
}
.deadline-item:hover,
.approval-history-mini button:hover,
.kanban-card:hover{
  background:#F9FBFE !important;
  border-color:#D5E6FF !important;
}
.kanban-board{
  gap:14px !important;
}
.kanban-head{
  background:#F7F9FC !important;
  border:1px solid #E6EAF0 !important;
  border-radius:16px !important;
  padding:12px 14px !important;
}
.kanban-empty,
.empty-block,
.empty-cell,
.billz-empty-state{
  background:#F7F9FC !important;
  border:1px dashed #D8DEE8 !important;
  border-radius:18px !important;
  color:#8A93A0 !important;
  font-weight:800 !important;
}
.table-wrap{
  overflow:hidden !important;
}
.table-wrap table th:first-child,
.table-wrap table td:first-child{
  padding-left:20px !important;
}
.table-wrap table th:last-child,
.table-wrap table td:last-child{
  padding-right:20px !important;
}
.table-wrap tbody tr{
  height:58px !important;
}
.table-wrap tbody td{
  vertical-align:middle !important;
}
.table-badge-stack{
  display:flex !important;
  gap:6px !important;
  align-items:center !important;
  flex-wrap:wrap !important;
}
.toast,
.toast-success,
.toast-error{
  border-radius:18px !important;
  box-shadow:0 20px 54px rgba(15,23,42,.18) !important;
}
.toast-success{
  background:#1478F2 !important;
}
.toast-error{
  background:#EF4444 !important;
}
.skeleton-line{
  height:12px;
  border-radius:999px;
  background:linear-gradient(90deg,#EEF2F6,#F8FAFC,#EEF2F6);
  background-size:220% 100%;
  animation:skeleton-shimmer 1.25s linear infinite;
}
@keyframes skeleton-shimmer{
  from{background-position:0 0}
  to{background-position:-220% 0}
}
.finance-center-page{
  background:#F6F8FB !important;
  min-height:calc(100vh - 132px);
  border-radius:0 !important;
}
.finance-center-page .finance-command-card{
  background:linear-gradient(135deg,#101828 0%,#1478F2 100%) !important;
  color:#FFFFFF !important;
  border:0 !important;
  box-shadow:0 24px 68px rgba(20,120,242,.22) !important;
}
.finance-center-page .finance-command-card h2,
.finance-center-page .finance-command-card p,
.finance-center-page .finance-command-card .small-label{
  color:#FFFFFF !important;
}
.finance-center-page .finance-command-card p{
  opacity:.78;
}
.finance-center-page .finance-command-grid > div{
  background:rgba(255,255,255,.12) !important;
  border:1px solid rgba(255,255,255,.18) !important;
  box-shadow:none !important;
  backdrop-filter:blur(14px);
}
.finance-center-page .finance-command-grid span{
  color:rgba(255,255,255,.72) !important;
}
.finance-center-page .finance-command-grid strong{
  color:#FFFFFF !important;
}
.finance-center-page > .card,
.finance-center-page .stats-grid,
.finance-center-page .table-wrap,
.finance-center-page .finance-budget-card,
.finance-center-page .expense-bar-card{
  position:relative;
}
@media (max-width: 900px){
  .app-shell{
    display:block !important;
  }
  .main-area{
    padding:14px 14px 92px !important;
  }
  .topbar{
    border-radius:18px !important;
  }
  .sidebar-help-card{
    display:none;
  }
  .billz-catalog-head,
  .billz-toolbar{
    grid-template-columns:1fr;
    display:grid;
  }
  .billz-kpi-row{
    grid-template-columns:1fr;
  }
  .billz-catalog-tr{
    grid-template-columns:1fr;
    padding:14px 16px;
    gap:6px;
  }
  .billz-catalog-tr.head{
    display:none;
  }
  .login-page{
    padding:18px !important;
  }
  .login-shell{
    grid-template-columns:1fr !important;
    min-height:auto !important;
  }
  .login-copy{
    min-height:auto !important;
    padding:28px !important;
  }
  .login-copy h1{
    font-size:38px !important;
  }
  .login-card{
    justify-self:stretch !important;
    max-width:none !important;
  }
  .login-mode-switch{
    grid-template-columns:1fr !important;
  }
}



/* === Dashboard Refresh v5.2 HOTFIX: command center CSS restored inside App inline styles === */
/* Design Refresh v3 — Boshqaruv markazi only. Old system functions preserved. */
.command-dashboard-page{
  display:grid;
  gap:18px;
  margin-top:18px;
}
.command-hero{
  position:relative;
  overflow:hidden;
  min-height:270px;
  display:grid;
  grid-template-columns:1.35fr .65fr;
  gap:22px;
  padding:30px;
  border-radius:32px;
  background:
    radial-gradient(circle at 78% 18%, rgba(20,120,242,.22), transparent 26%),
    linear-gradient(135deg, #07182f 0%, #0c2344 46%, #0f6df2 125%);
  color:#fff;
  border:1px solid rgba(255,255,255,.08);
  box-shadow:0 24px 70px rgba(2, 18, 45, .22);
}
.command-hero::after{
  content:"";
  position:absolute;
  inset:auto -80px -120px auto;
  width:360px;
  height:360px;
  border-radius:999px;
  background:rgba(255,255,255,.08);
  filter:blur(1px);
}
.command-hero-copy{position:relative;z-index:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center}
.command-kicker{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:10px 14px;
  border-radius:999px;
  background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.18);
  color:#dcebff;
  font-size:12px;
  font-weight:900;
  letter-spacing:.12em;
  text-transform:uppercase;
}
.command-hero h1{margin:18px 0 8px;font-size:54px;line-height:1;font-weight:950;letter-spacing:-.04em;color:#fff}
.command-hero p{margin:0;max-width:760px;color:rgba(255,255,255,.76);font-size:17px;line-height:1.75}
.command-hero p strong{color:#fff}
.command-hero-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px}.command-hero-actions .btn.secondary{background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.14);color:#fff}.command-hero-actions .btn.primary{background:#fff;color:#0b63d1;box-shadow:0 18px 34px rgba(0,0,0,.14)}
.command-hero-panel{position:relative;z-index:1;display:grid;place-items:center;gap:18px;align-content:center;border-radius:28px;padding:24px;background:rgba(255,255,255,.10);border:1px solid rgba(255,255,255,.16);backdrop-filter:blur(14px)}
.command-pulse-ring{width:180px;height:180px;border-radius:999px;display:grid;place-items:center;text-align:center;background:conic-gradient(#38e89f 0 70%, rgba(255,255,255,.16) 70% 100%);position:relative;box-shadow:inset 0 0 30px rgba(255,255,255,.16)}
.command-pulse-ring::before{content:"";position:absolute;inset:18px;border-radius:inherit;background:#0d2444}.command-pulse-ring span,.command-pulse-ring small{position:relative;z-index:1;display:block}.command-pulse-ring span{font-size:42px;font-weight:950;letter-spacing:-.04em}.command-pulse-ring small{font-size:12px;color:#bcd6ff;font-weight:800;text-transform:uppercase;letter-spacing:.08em;margin-top:-34px}
.command-hero-list{display:grid;gap:10px;width:100%}.command-hero-list span{display:flex;align-items:center;gap:10px;color:#eaf3ff;font-weight:800;font-size:13px}.command-hero-list i{width:8px;height:8px;border-radius:999px;background:#38e89f;box-shadow:0 0 0 5px rgba(56,232,159,.12)}
.command-metric-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.command-metric-card{position:relative;overflow:hidden;display:grid;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:26px;padding:20px;box-shadow:0 14px 34px rgba(17,34,64,.06)}.command-metric-card::after{content:"";position:absolute;right:-42px;top:-42px;width:115px;height:115px;border-radius:999px;background:rgba(20,120,242,.08)}.command-metric-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.command-metric-icon{width:44px;height:44px;border-radius:16px;display:grid;place-items:center;background:#eaf3ff;color:#1478f2}.command-trend{font-size:11px;font-weight:900;text-transform:uppercase;color:#2ac579;background:rgba(42,197,121,.1);border-radius:999px;padding:7px 9px}.command-metric-label{color:var(--muted);font-size:13px;font-weight:800}.command-metric-card strong{font-size:32px;letter-spacing:-.04em;line-height:1}.command-metric-card small{color:var(--muted);font-weight:700}.command-metric-card.success .command-metric-icon{background:rgba(42,197,121,.12);color:#1fbe73}.command-metric-card.warning .command-metric-icon{background:rgba(255,173,0,.14);color:#e59a00}.command-metric-card.danger .command-metric-icon{background:rgba(239,90,90,.12);color:#ef5a5a}.command-metric-card.violet .command-metric-icon{background:rgba(139,92,246,.12);color:#8b5cf6}.command-metric-card.blue .command-metric-icon{background:rgba(20,120,242,.12);color:#1478f2}
.command-grid-main{display:grid;grid-template-columns:1.35fr .65fr;gap:16px}.command-grid-main.compact{grid-template-columns:1fr 1fr}.command-card{background:var(--panel);border:1px solid var(--line);border-radius:28px;padding:22px;box-shadow:0 14px 34px rgba(17,34,64,.055)}.command-chart-card{min-height:340px}.command-chart-tabs{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}.command-chart-tabs span{font-size:12px;font-weight:900;color:#1478f2;background:rgba(20,120,242,.08);border:1px solid rgba(20,120,242,.10);padding:8px 11px;border-radius:999px}.command-visual-grid{display:grid;grid-template-columns:1.1fr .45fr .45fr;gap:18px;align-items:stretch}.command-bars{display:grid;gap:15px;align-content:center}.command-bar-row{display:grid;grid-template-columns:92px 1fr 38px;gap:12px;align-items:center}.command-bar-row span{font-size:13px;color:var(--muted);font-weight:800}.command-bar-row div{height:12px;background:var(--panel-soft);border-radius:999px;overflow:hidden}.command-bar-row i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#1478f2,#38bdf8)}.command-bar-row strong{font-size:13px;text-align:right}.command-mini-line{height:220px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(180deg,rgba(20,120,242,.05),transparent);padding:18px;display:flex;gap:10px;align-items:flex-end}.command-mini-line span{flex:1;min-height:8px;border-radius:999px 999px 5px 5px;background:linear-gradient(180deg,#1478f2,#8ec5ff)}.command-mini-line.spend span{background:linear-gradient(180deg,#ffad00,#fe6600)}
.command-mini-metrics{display:grid;grid-template-columns:1fr 1fr;gap:12px}.command-mini-metric{border:1px solid var(--line);background:var(--panel-soft);border-radius:20px;padding:16px;display:grid;gap:6px}.command-mini-metric span{font-size:12px;font-weight:900;color:var(--muted)}.command-mini-metric strong{font-size:22px;letter-spacing:-.03em}.command-mini-metric small{font-size:12px;color:var(--muted);font-weight:700}.command-mini-metric.success{background:rgba(42,197,121,.08)}.command-mini-metric.danger{background:rgba(239,90,90,.08)}.command-mini-metric.amber{background:rgba(255,173,0,.1)}.command-mini-metric.violet{background:rgba(139,92,246,.08)}.command-mini-metric.blue{background:rgba(20,120,242,.08)}
.command-grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}.command-branch-list,.command-task-list,.command-alert-list{display:grid;gap:12px}.command-branch-row{display:grid;grid-template-columns:34px 1.1fr 1fr 38px;align-items:center;gap:12px;padding:12px;border:1px solid var(--line);border-radius:18px;background:var(--panel-soft)}.command-rank{width:28px;height:28px;border-radius:11px;display:grid;place-items:center;background:#1478f2;color:#fff;font-size:12px;font-weight:950}.command-branch-row strong,.command-task-row strong{display:block;font-size:14px}.command-branch-row small,.command-task-row small{display:block;color:var(--muted);font-size:12px;margin-top:3px}.command-branch-bar{height:9px;background:rgba(20,120,242,.09);border-radius:999px;overflow:hidden}.command-branch-bar i{display:block;height:100%;background:linear-gradient(90deg,#1478f2,#38bdf8);border-radius:999px}.command-branch-row b{font-size:13px;text-align:right}.command-task-row{display:flex;align-items:center;gap:12px;padding:12px;border-radius:18px;background:var(--panel-soft);border:1px solid var(--line)}.command-alert{padding:14px;border-radius:18px;border:1px solid var(--line);display:grid;gap:4px}.command-alert strong{font-size:14px}.command-alert span{font-size:13px;color:var(--muted)}.command-alert.info{background:rgba(20,120,242,.08);border-color:rgba(20,120,242,.12)}.command-alert.warning{background:rgba(255,173,0,.10);border-color:rgba(255,173,0,.20)}.command-alert.danger{background:rgba(239,90,90,.09);border-color:rgba(239,90,90,.18)}
.command-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:20px}.command-table-wrap table th{font-size:12px;text-transform:uppercase;letter-spacing:.06em}.command-status-pill{display:inline-flex;padding:7px 10px;border-radius:999px;background:rgba(20,120,242,.08);color:#1478f2;font-size:12px;font-weight:900}.command-workflow-card{padding:24px}.command-workflow-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}.command-workflow-grid>div{border:1px solid var(--line);border-radius:22px;padding:16px;background:var(--panel-soft);display:grid;gap:10px}.command-workflow-grid strong{font-size:15px}.command-workflow-grid span{display:flex;justify-content:space-between;gap:12px;color:var(--muted);font-weight:800}.command-workflow-grid b{color:var(--text)}
@media (max-width:1200px){.command-hero,.command-grid-main,.command-grid-main.compact,.command-grid-3,.command-workflow-grid{grid-template-columns:1fr}.command-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.command-visual-grid{grid-template-columns:1fr}.command-mini-line{height:160px}}
@media (max-width:700px){.command-metric-grid{grid-template-columns:1fr}.command-hero{padding:22px}.command-hero h1{font-size:38px}.command-pulse-ring{width:150px;height:150px}.command-branch-row{grid-template-columns:34px 1fr}.command-branch-bar,.command-branch-row b{grid-column:2}.command-mini-metrics{grid-template-columns:1fr}}

/* === Sidebar Refresh v4: old system preserved, menu visual upgraded === */
.app-shell{
  grid-template-columns:306px 1fr;
}
.sidebar{
  padding:22px 16px 18px;
  gap:14px;
  background:
    radial-gradient(circle at 18% 8%, rgba(22,144,245,.30), transparent 24%),
    radial-gradient(circle at 86% 18%, rgba(45,212,191,.16), transparent 20%),
    linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.015) 38%, rgba(255,255,255,0)),
    linear-gradient(180deg,#071426 0%, #08111f 46%, #050b14 100%);
  border-right:1px solid rgba(255,255,255,.09);
  box-shadow:inset -1px 0 0 rgba(255,255,255,.07), 22px 0 54px rgba(2,8,23,.22);
}
.brand-block{
  padding:8px 8px 10px;
  border-radius:24px;
  background:linear-gradient(135deg, rgba(255,255,255,.07), rgba(255,255,255,.025));
  border:1px solid rgba(255,255,255,.08);
}
.brand-copy{min-width:0}
.brand-mark{
  width:52px;
  height:52px;
  border-radius:18px;
  background:linear-gradient(135deg,#1690F5 0%, #0B63D1 58%, #071426 100%);
  box-shadow:0 18px 34px rgba(22,144,245,.28), inset 0 1px 0 rgba(255,255,255,.24);
}
.brand-name{
  font-size:25px;
  line-height:1;
  letter-spacing:-.075em;
}
.brand-desc{
  margin-top:5px;
  font-size:11px;
  max-width:190px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.sidebar-workspace-card{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:12px 14px;
  border-radius:20px;
  color:#fff;
  background:
    linear-gradient(135deg, rgba(22,144,245,.18), rgba(45,212,191,.08)),
    rgba(255,255,255,.055);
  border:1px solid rgba(96,165,250,.22);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.08), 0 18px 34px rgba(2,8,23,.18);
}
.sidebar-workspace-card span{
  display:block;
  font-size:10px;
  text-transform:uppercase;
  letter-spacing:.15em;
  color:#8fb7df;
  font-weight:900;
}
.sidebar-workspace-card strong{
  display:block;
  margin-top:3px;
  font-size:13px;
  letter-spacing:-.02em;
}
.sidebar-workspace-card small{
  display:inline-flex;
  align-items:center;
  gap:6px;
  padding:6px 9px;
  border-radius:999px;
  background:rgba(34,197,94,.13);
  border:1px solid rgba(74,222,128,.20);
  color:#bbf7d0;
  font-weight:900;
}
.sidebar-workspace-card small i{
  width:7px;
  height:7px;
  border-radius:999px;
  background:#22c55e;
  box-shadow:0 0 0 4px rgba(34,197,94,.14);
}
.sidebar-search{
  border-radius:18px;
  padding:12px 14px;
  background:rgba(255,255,255,.07);
  border-color:rgba(255,255,255,.09);
}
.menu-section-list{
  gap:12px;
  overflow:auto;
  min-height:0;
  padding:2px 2px 10px;
  margin-right:-4px;
  scrollbar-width:thin;
  scrollbar-color:rgba(96,165,250,.32) transparent;
}
.menu-section-list::-webkit-scrollbar{width:6px}
.menu-section-list::-webkit-scrollbar-thumb{
  background:rgba(96,165,250,.28);
  border-radius:999px;
}
.menu-group-toggle{
  padding:0 8px 0 10px;
  color:#8ea8c8;
  font-size:10px;
  letter-spacing:.18em;
}
.menu-list{gap:7px}
.menu-btn{
  position:relative;
  min-height:58px;
  padding:10px 12px;
  border-radius:18px;
  gap:11px;
  background:transparent;
  box-shadow:none;
  border:1px solid transparent;
}
.menu-btn::before{
  content:"";
  position:absolute;
  inset:0;
  border-radius:inherit;
  background:linear-gradient(135deg, rgba(255,255,255,.055), rgba(255,255,255,.018));
  opacity:.9;
  transition:opacity .18s ease, background .18s ease;
}
.menu-btn > *{position:relative;z-index:1}
.menu-btn:hover{
  transform:translateX(3px);
  background:transparent;
  border-color:rgba(96,165,250,.18);
  box-shadow:0 14px 30px rgba(2,8,23,.20);
}
.menu-btn:hover::before{
  opacity:1;
  background:linear-gradient(135deg, rgba(22,144,245,.14), rgba(255,255,255,.055));
}
.menu-btn.active{
  background:linear-gradient(135deg, rgba(22,144,245,.32), rgba(22,144,245,.18), rgba(45,212,191,.11));
  border-color:rgba(125,211,252,.36);
  box-shadow:0 18px 36px rgba(22,144,245,.22), inset 0 1px 0 rgba(255,255,255,.10);
}
.menu-btn.active::before{opacity:0}
.menu-icon-wrap{
  width:36px;
  height:36px;
  border-radius:14px;
  flex:0 0 36px;
}
.menu-text{
  display:grid;
  gap:2px;
  min-width:0;
  flex:1;
}
.menu-text > span{
  display:block;
  font-size:13.5px;
  line-height:1.15;
  color:#f8fbff;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.menu-text small{
  display:block;
  font-size:10.5px;
  line-height:1.2;
  color:#8fa3bc;
  font-weight:800;
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.menu-btn.active .menu-text small,
.menu-btn:hover .menu-text small{color:#cfe6ff}
.menu-active-dot{
  width:8px;
  height:8px;
  border-radius:999px;
  background:#2dd4bf;
  box-shadow:0 0 0 5px rgba(45,212,191,.12), 0 0 20px rgba(45,212,191,.45);
  margin-left:auto;
}
.sidebar-help-card{
  position:relative;
  overflow:hidden;
  padding:16px;
  border-radius:24px;
  background:
    radial-gradient(circle at 15% 12%, rgba(255,255,255,.18), transparent 20%),
    linear-gradient(135deg, rgba(22,144,245,.95), rgba(11,99,209,.82) 60%, rgba(7,20,38,.92));
  border:1px solid rgba(255,255,255,.13);
  box-shadow:0 20px 40px rgba(22,144,245,.22);
}
.sidebar-help-card::after{
  content:"";
  position:absolute;
  right:-38px;
  bottom:-48px;
  width:120px;
  height:120px;
  border-radius:999px;
  background:rgba(255,255,255,.12);
}
.sidebar-help-card span,
.sidebar-help-card strong,
.sidebar-help-card small,
.sidebar-help-card a{position:relative;z-index:1}
.sidebar-help-card span{
  display:inline-flex;
  width:max-content;
  padding:6px 10px;
  border-radius:999px;
  background:rgba(255,255,255,.14);
  color:#eff6ff;
  font-size:10px;
  text-transform:uppercase;
  letter-spacing:.12em;
  font-weight:900;
}
.sidebar-help-card strong{
  margin-top:10px;
  color:#fff;
  font-size:18px;
  letter-spacing:-.04em;
}
.sidebar-help-card small{
  color:rgba(255,255,255,.78);
  line-height:1.45;
}
.sidebar-help-card a{
  margin-top:12px;
  border-radius:14px;
  background:#fff;
  color:#0B63D1;
  font-weight:900;
  text-align:center;
  padding:10px 12px;
}
.logout-btn{
  border-radius:18px;
  background:rgba(255,255,255,.07);
  border:1px solid rgba(255,255,255,.10);
  box-shadow:none;
}
.logout-btn:hover{
  background:rgba(239,68,68,.14);
  border-color:rgba(248,113,113,.28);
}
@media (max-width: 1100px){
  .app-shell{grid-template-columns:1fr}
  .sidebar{display:none}
}


/* V5 Content plan refresh - old system preserved, only UI upgraded */
.content-page-v5{
  gap:18px;
}
.content-v5-hero{
  position:relative;
  overflow:hidden;
  display:grid;
  grid-template-columns:minmax(0,1.35fr) minmax(320px,.65fr);
  gap:22px;
  padding:28px;
  border-radius:32px;
  background:
    radial-gradient(circle at 18% 0%, rgba(22,144,245,.22), transparent 34%),
    radial-gradient(circle at 96% 8%, rgba(34,197,94,.18), transparent 28%),
    linear-gradient(135deg,#061329 0%,#09224A 46%,#0D3C7A 100%);
  color:#fff;
  box-shadow:0 34px 90px rgba(2,8,23,.24);
}
.content-v5-hero::before{
  content:"";
  position:absolute;
  inset:12px;
  border:1px solid rgba(255,255,255,.11);
  border-radius:26px;
  pointer-events:none;
}
.content-v5-hero::after{
  content:"";
  position:absolute;
  right:-120px;
  bottom:-180px;
  width:390px;
  height:390px;
  border-radius:50%;
  background:rgba(22,144,245,.22);
  filter:blur(8px);
}
.content-v5-hero-copy,
.content-v5-hero-panel{
  position:relative;
  z-index:1;
}
.content-v5-eyebrow{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 12px;
  border-radius:999px;
  background:rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.14);
  color:rgba(255,255,255,.78);
  font-size:11px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.14em;
}
.content-v5-hero h1{
  margin:14px 0 10px;
  font-size:46px;
  line-height:1;
  letter-spacing:-.06em;
}
.content-v5-hero p{
  max-width:760px;
  margin:0;
  color:rgba(255,255,255,.76);
  font-weight:650;
  line-height:1.55;
}
.content-v5-hero-actions{
  margin-top:22px;
  display:flex;
  flex-wrap:wrap;
  align-items:center;
  gap:12px;
}
.content-v5-hero .btn.primary{
  background:linear-gradient(135deg,#1690F5,#2EC7FF);
  box-shadow:0 18px 40px rgba(22,144,245,.34);
}
.content-v5-hero .btn.secondary{
  background:rgba(255,255,255,.10);
  color:#fff;
  border-color:rgba(255,255,255,.15);
}
.content-v5-month-switch{
  display:inline-flex;
  align-items:center;
  gap:9px;
  min-height:44px;
  padding:5px;
  border-radius:16px;
  background:rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.14);
}
.content-v5-month-switch button{
  width:34px;
  height:34px;
  border:0;
  border-radius:12px;
  color:#fff;
  background:rgba(255,255,255,.12);
  cursor:pointer;
  font-size:24px;
  line-height:1;
}
.content-v5-month-switch strong{
  font-size:13px;
  min-width:120px;
  text-align:center;
}
.content-v5-hero-panel{
  align-self:stretch;
  display:grid;
  grid-template-columns:150px 1fr;
  gap:14px;
  align-items:stretch;
}
.content-v5-score-ring{
  display:grid;
  place-items:center;
  align-content:center;
  gap:2px;
  min-height:180px;
  border-radius:28px;
  background:
    radial-gradient(circle closest-side,#0A1F3F 68%,transparent 70%),
    conic-gradient(#22c55e var(--score),rgba(255,255,255,.14) 0);
  border:1px solid rgba(255,255,255,.14);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12);
}
.content-v5-score-ring strong{
  font-size:34px;
  letter-spacing:-.06em;
}
.content-v5-score-ring span{
  color:rgba(255,255,255,.68);
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.08em;
}
.content-v5-platform-card,
.content-v5-platform-pills{
  border-radius:24px;
  background:rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.13);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10);
}
.content-v5-platform-card{
  padding:18px;
  display:grid;
  align-content:center;
  gap:8px;
}
.content-v5-platform-card span,
.content-v5-platform-card small{
  color:rgba(255,255,255,.68);
  font-weight:800;
}
.content-v5-platform-card strong{
  font-size:26px;
  letter-spacing:-.05em;
}
.content-v5-platform-pills{
  grid-column:1 / -1;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  padding:12px;
}
.content-v5-platform-pills span{
  display:inline-flex;
  align-items:center;
  gap:9px;
  padding:9px 11px;
  border-radius:999px;
  background:rgba(255,255,255,.10);
  color:rgba(255,255,255,.76);
  font-size:12px;
  font-weight:900;
}
.content-v5-platform-pills b{
  color:#fff;
}
.content-v5-stats-row{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:14px;
}
.content-v5-stat{
  position:relative;
  overflow:hidden;
  padding:18px;
  border-radius:24px;
  background:#fff;
  border:1px solid rgba(148,163,184,.14);
  box-shadow:0 20px 45px rgba(15,23,42,.07);
}
.content-v5-stat::after{
  content:"";
  position:absolute;
  right:-28px;
  top:-28px;
  width:96px;
  height:96px;
  border-radius:50%;
  background:rgba(22,144,245,.12);
}
.content-v5-stat.green::after{background:rgba(34,197,94,.14)}
.content-v5-stat.amber::after{background:rgba(245,158,11,.16)}
.content-v5-stat span{
  color:var(--muted);
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.09em;
}
.content-v5-stat strong{
  position:relative;
  z-index:1;
  display:block;
  margin:8px 0 3px;
  font-size:32px;
  line-height:1;
  letter-spacing:-.06em;
}
.content-v5-stat small{
  color:var(--muted);
  font-weight:750;
}
.content-weekly-report{
  border-radius:24px;
  background:#fff;
  border:1px solid rgba(148,163,184,.14);
  box-shadow:0 20px 45px rgba(15,23,42,.07);
  padding:18px;
}
.content-weekly-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:12px;
  margin-bottom:14px;
}
.content-weekly-head span{
  color:#0d9488;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.content-weekly-head h2{
  margin:4px 0 0;
  color:#0f172a;
  font-size:22px;
  line-height:1.15;
}
.content-weekly-head > strong{
  flex:0 0 auto;
  border-radius:999px;
  padding:8px 12px;
  background:#ecfeff;
  color:#0f766e;
  font-size:12px;
  text-transform:uppercase;
}
.content-weekly-grid{
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  gap:10px;
}
.content-weekly-item{
  min-height:118px;
  border-radius:18px;
  border:1px solid rgba(148,163,184,.14);
  background:#f8fbff;
  padding:12px;
  display:grid;
  align-content:space-between;
  gap:10px;
}
.content-weekly-item div{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:8px;
}
.content-weekly-item span{
  color:#344054;
  font-size:12px;
  font-weight:900;
}
.content-weekly-item strong{
  color:#0f172a;
  font-size:18px;
  line-height:1;
}
.content-weekly-item i{
  display:block;
  height:7px;
  border-radius:999px;
  background:#e2e8f0;
  overflow:hidden;
}
.content-weekly-item em{
  display:block;
  height:100%;
  border-radius:999px;
  background:#1690f5;
}
.content-weekly-item.fuchsia em{background:#d946ef}
.content-weekly-item.green em{background:#10b981}
.content-weekly-item.purple em{background:#8b5cf6}
.content-weekly-item.cyan em{background:#06b6d4}
.content-weekly-item.sky em{background:#0ea5e9}
.content-weekly-item.amber em{background:#f59e0b}
.content-weekly-item small{
  color:#667085;
  font-weight:800;
}
.content-v5-viewbar{
  position:sticky;
  top:10px;
  z-index:15;
  display:grid;
  grid-template-columns:auto minmax(240px,1fr) auto;
  gap:12px;
  align-items:center;
  padding:12px;
  border-radius:24px;
  background:rgba(255,255,255,.82);
  border:1px solid rgba(148,163,184,.14);
  box-shadow:0 20px 50px rgba(15,23,42,.08);
  backdrop-filter:blur(18px);
}
.content-v5-segment{
  display:flex;
  gap:6px;
  padding:5px;
  border-radius:17px;
  background:rgba(226,232,240,.65);
}
.content-v5-segment button{
  border:0;
  border-radius:13px;
  background:transparent;
  color:var(--muted);
  min-height:36px;
  padding:0 14px;
  font-weight:900;
  cursor:pointer;
}
.content-v5-segment button.active{
  background:linear-gradient(135deg,#1690F5,#0B63D1);
  color:#fff;
  box-shadow:0 12px 24px rgba(22,144,245,.25);
}
.content-v5-search{
  margin:0;
  min-height:46px;
  border-radius:16px;
  background:#fff;
}
.content-v5-mini-alerts{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  justify-content:flex-end;
}
.content-v5-mini-alerts span{
  padding:9px 12px;
  border-radius:999px;
  font-size:12px;
  font-weight:900;
  border:1px solid transparent;
}
.content-v5-mini-alerts .danger{background:rgba(239,68,68,.10);color:#b91c1c;border-color:rgba(239,68,68,.18)}
.content-v5-mini-alerts .warning{background:rgba(245,158,11,.12);color:#92400e;border-color:rgba(245,158,11,.18)}
.content-v5-mini-alerts .success{background:rgba(34,197,94,.11);color:#15803d;border-color:rgba(34,197,94,.18)}
.content-v5-form-card .info-banner:first-of-type{
  background:linear-gradient(135deg,rgba(22,144,245,.10),rgba(34,197,94,.08));
  border-color:rgba(22,144,245,.14);
}
.content-page-v5 .content-list-card{
  border-radius:30px;
}
.content-page-v5 .content-list-card th:first-child{border-top-left-radius:18px}
.content-page-v5 .content-list-card th:last-child{border-top-right-radius:18px}
.content-page-v5 .calendar-pro-shell,
.content-page-v5 .kanban-board{
  border-radius:24px;
  background:linear-gradient(180deg,rgba(248,251,255,.96),rgba(255,255,255,.92));
  border:1px solid rgba(148,163,184,.13);
  padding:14px;
}
.content-calendar-tabs{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
  margin-bottom:12px;
}
.content-calendar-tabs button{
  min-height:64px;
  border-radius:16px;
  border:1px solid rgba(148,163,184,.18);
  background:#fff;
  padding:12px;
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
  color:#475467;
  font-weight:950;
  cursor:pointer;
}
.content-calendar-tabs button.active{
  color:#0f766e;
  border-color:rgba(45,212,191,.45);
  background:#ecfeff;
  box-shadow:0 14px 34px rgba(45,212,191,.16);
}
.content-calendar-tabs strong{
  min-width:30px;
  height:30px;
  border-radius:999px;
  display:grid;
  place-items:center;
  background:#0f172a;
  color:#5eead4;
  font-size:12px;
}
.content-calendar-pill{
  display:grid;
  gap:3px;
  text-align:left;
}
.content-calendar-pill strong{
  color:#0f172a;
  font-size:12px;
  line-height:1.18;
}
.content-calendar-pill small{
  color:#64748b;
  font-size:10px;
  font-weight:850;
}
@media (max-width: 1100px){
  .content-v5-hero,
  .content-v5-hero-panel,
  .content-v5-stats-row,
  .content-weekly-grid,
  .content-calendar-tabs,
  .content-v5-viewbar{grid-template-columns:1fr}
  .content-v5-hero{padding:20px;border-radius:26px}
  .content-v5-hero h1{font-size:34px}
  .content-v5-score-ring{min-height:150px}
  .content-v5-viewbar{position:relative;top:auto}
  .content-v5-mini-alerts{justify-content:flex-start}
}


/* === V5.1 Sidebar lock patch: v4 menu preserved, content page cannot break sidebar === */
.app-shell{
  grid-template-columns:306px minmax(0,1fr) !important;
  align-items:stretch;
}
.sidebar{
  width:306px !important;
  min-width:306px !important;
  max-width:306px !important;
  position:sticky;
  top:0;
  height:100vh;
  min-height:100vh;
  overflow:hidden;
  z-index:40;
}
.menu-section-list{
  flex:1 1 auto;
  min-height:0;
  overflow-y:auto;
  overflow-x:hidden;
}
.main-area{
  min-width:0 !important;
  max-width:100%;
  overflow-x:hidden;
}
.content-page-v5,
.content-v5-hero,
.content-v5-viewbar,
.content-v5-stats-row{
  min-width:0;
  max-width:100%;
}
.content-v5-hero{
  grid-template-columns:minmax(0,1fr) minmax(280px,360px);
}
.content-v5-viewbar{
  flex-wrap:wrap;
}
@media (max-width: 1280px){
  .app-shell{grid-template-columns:286px minmax(0,1fr) !important;}
  .sidebar{width:286px !important;min-width:286px !important;max-width:286px !important;}
  .content-v5-hero{grid-template-columns:1fr;}
}
@media (max-width: 1100px){
  .app-shell{grid-template-columns:1fr !important;}
  .sidebar{display:none;width:auto !important;min-width:0 !important;max-width:none !important;}
}


/* === V5.3 CRITICAL SIDEBAR COLOR HOTFIX ===
   Sidebar foni va yozuv ranglari majburan to'g'rilandi.
   Old system preserved: only menu visual CSS is patched. */
.app-shell{
  grid-template-columns:306px minmax(0,1fr) !important;
  background:#f4f7fb !important;
}
.sidebar{
  width:306px !important;
  min-width:306px !important;
  max-width:306px !important;
  display:flex !important;
  flex-direction:column !important;
  background:
    radial-gradient(circle at 20% 0%, rgba(22,144,245,.34), transparent 30%),
    radial-gradient(circle at 92% 18%, rgba(45,212,191,.18), transparent 22%),
    linear-gradient(180deg,#071426 0%, #08111f 50%, #050b14 100%) !important;
  color:#f8fbff !important;
  border-right:1px solid rgba(255,255,255,.10) !important;
  box-shadow:inset -1px 0 0 rgba(255,255,255,.08), 18px 0 48px rgba(2,8,23,.20) !important;
}
.sidebar *{box-sizing:border-box}
.sidebar .brand-block{
  background:rgba(255,255,255,.055) !important;
  border:1px solid rgba(255,255,255,.09) !important;
  color:#ffffff !important;
}
.sidebar .brand-name,
.sidebar .brand-copy .brand-name{
  color:#ffffff !important;
  opacity:1 !important;
  text-shadow:none !important;
}
.sidebar .brand-desc,
.sidebar .brand-copy .brand-desc{
  color:#b7c7dc !important;
  opacity:1 !important;
}
.sidebar .sidebar-workspace-card{
  background:linear-gradient(135deg,rgba(22,144,245,.20),rgba(45,212,191,.09)) !important;
  border:1px solid rgba(125,211,252,.23) !important;
  color:#ffffff !important;
}
.sidebar .sidebar-workspace-card span{color:#9fc5ea !important;opacity:1 !important}
.sidebar .sidebar-workspace-card strong{color:#ffffff !important;opacity:1 !important}
.sidebar .sidebar-workspace-card small{color:#bbf7d0 !important;background:rgba(34,197,94,.16) !important}
.sidebar .sidebar-search{
  background:rgba(255,255,255,.075) !important;
  border:1px solid rgba(255,255,255,.12) !important;
  color:#dbeafe !important;
}
.sidebar .sidebar-search svg{color:#a9bdd5 !important}
.sidebar .sidebar-search input{
  color:#ffffff !important;
  background:transparent !important;
}
.sidebar .sidebar-search input::placeholder{color:#9fb2c9 !important;opacity:1 !important}
.sidebar .menu-group-toggle{
  color:#91a8c2 !important;
  opacity:1 !important;
  background:transparent !important;
}
.sidebar .menu-group-toggle span{color:#91a8c2 !important;opacity:1 !important}
.sidebar .menu-btn{
  color:#edf6ff !important;
  background:rgba(255,255,255,.035) !important;
  border:1px solid transparent !important;
  opacity:1 !important;
}
.sidebar .menu-btn::before{background:transparent !important;opacity:0 !important}
.sidebar .menu-btn:hover{
  color:#ffffff !important;
  background:rgba(22,144,245,.15) !important;
  border-color:rgba(125,211,252,.24) !important;
}
.sidebar .menu-btn.active{
  background:linear-gradient(135deg,#1690F5 0%,#0B63D1 100%) !important;
  border-color:rgba(125,211,252,.38) !important;
  color:#ffffff !important;
}
.sidebar .menu-text > span,
.sidebar .menu-btn .menu-text > span{
  color:#f8fbff !important;
  opacity:1 !important;
  font-weight:900 !important;
}
.sidebar .menu-text small,
.sidebar .menu-btn .menu-text small{
  color:#9fb2c9 !important;
  opacity:1 !important;
}
.sidebar .menu-btn.active .menu-text > span,
.sidebar .menu-btn:hover .menu-text > span{color:#ffffff !important}
.sidebar .menu-btn.active .menu-text small,
.sidebar .menu-btn:hover .menu-text small{color:#d8ebff !important}
.sidebar .menu-icon-wrap{
  background:rgba(255,255,255,.10) !important;
  color:#dbeafe !important;
  border:1px solid rgba(255,255,255,.08) !important;
}
.sidebar .menu-btn.active .menu-icon-wrap{
  background:rgba(255,255,255,.18) !important;
  color:#ffffff !important;
}
.sidebar .sidebar-help-card{
  background:linear-gradient(135deg,#1690F5 0%,#0B63D1 62%,#0b2342 100%) !important;
  color:#ffffff !important;
  border:1px solid rgba(255,255,255,.14) !important;
}
.sidebar .sidebar-help-card span,
.sidebar .sidebar-help-card strong,
.sidebar .sidebar-help-card small{color:#ffffff !important;opacity:1 !important}
.sidebar .sidebar-help-card small{color:rgba(255,255,255,.78) !important}
.sidebar .sidebar-help-card a{background:#ffffff !important;color:#0B63D1 !important}
.sidebar .logout-btn{
  background:#080d14 !important;
  color:#ffffff !important;
  border:1px solid rgba(255,255,255,.12) !important;
}
.sidebar .logout-btn:hover{background:rgba(239,68,68,.18) !important;color:#ffffff !important}
@media (max-width:1280px){
  .app-shell{grid-template-columns:286px minmax(0,1fr) !important}
  .sidebar{width:286px !important;min-width:286px !important;max-width:286px !important}
}
@media (max-width:1100px){
  .app-shell{grid-template-columns:1fr !important}
  .sidebar{display:none !important}
}



/* === Dashboard Redesign v5.4: menu preserved, main content rebuilt visually === */
.main-area{
  background:
    radial-gradient(circle at 18% 8%, rgba(22,144,245,.10), transparent 28%),
    linear-gradient(180deg,#F4F7FB 0%,#EEF3F8 100%) !important;
}
.page-head{
  background:#FFFFFF !important;
  border:1px solid #DDE6F0 !important;
  box-shadow:0 18px 50px rgba(15,23,42,.075) !important;
}
.command-dashboard-page{
  gap:22px !important;
  margin-top:22px !important;
}
.command-hero{
  min-height:340px !important;
  padding:36px !important;
  border-radius:34px !important;
  display:grid !important;
  grid-template-columns:minmax(0,1.25fr) 380px !important;
  align-items:stretch !important;
  gap:28px !important;
  color:#FFFFFF !important;
  overflow:hidden !important;
  border:1px solid rgba(125,211,252,.20) !important;
  box-shadow:0 30px 85px rgba(9,31,66,.24) !important;
  background:
    linear-gradient(135deg, rgba(5,16,33,.95), rgba(9,35,73,.95) 50%, rgba(22,144,245,.92) 130%),
    radial-gradient(circle at 88% 10%, rgba(56,232,159,.50), transparent 26%) !important;
}
.command-hero::before{
  content:"" !important;
  position:absolute !important;
  inset:0 !important;
  background:
    radial-gradient(circle at 8% 14%, rgba(22,144,245,.32), transparent 25%),
    radial-gradient(circle at 74% 28%, rgba(56,232,159,.22), transparent 20%),
    linear-gradient(90deg, rgba(255,255,255,.08) 0 1px, transparent 1px),
    linear-gradient(0deg, rgba(255,255,255,.06) 0 1px, transparent 1px) !important;
  background-size:auto, auto, 42px 42px, 42px 42px !important;
  opacity:.55 !important;
  pointer-events:none !important;
}
.command-hero::after{
  content:"" !important;
  position:absolute !important;
  width:440px !important;
  height:440px !important;
  right:-120px !important;
  bottom:-180px !important;
  border-radius:999px !important;
  background:rgba(255,255,255,.10) !important;
  filter:blur(0) !important;
  opacity:1 !important;
}
.command-hero-copy{
  position:relative !important;
  z-index:2 !important;
  min-height:260px !important;
  justify-content:center !important;
}
.command-kicker{
  background:rgba(255,255,255,.11) !important;
  border:1px solid rgba(255,255,255,.18) !important;
  color:#BFE2FF !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10) !important;
}
.command-hero h1{
  color:#FFFFFF !important;
  font-size:clamp(42px,4.2vw,68px) !important;
  line-height:.98 !important;
  letter-spacing:-.065em !important;
  max-width:720px !important;
  text-shadow:0 10px 28px rgba(0,0,0,.18) !important;
}
.command-hero p{
  color:rgba(232,242,255,.86) !important;
  font-size:17px !important;
  max-width:760px !important;
}
.command-hero p strong{color:#FFFFFF !important}
.command-hero-actions .btn{
  min-height:52px !important;
  border-radius:16px !important;
  padding:0 18px !important;
  box-shadow:0 16px 36px rgba(0,0,0,.18) !important;
}
.command-hero-actions .btn.primary{
  background:#FFFFFF !important;
  color:#0B63D1 !important;
  border-color:rgba(255,255,255,.55) !important;
}
.command-hero-actions .btn.secondary{
  background:rgba(255,255,255,.12) !important;
  border-color:rgba(255,255,255,.22) !important;
  color:#FFFFFF !important;
  backdrop-filter:blur(12px) !important;
}
.command-hero-panel{
  position:relative !important;
  z-index:2 !important;
  background:rgba(255,255,255,.12) !important;
  border:1px solid rgba(255,255,255,.20) !important;
  border-radius:30px !important;
  padding:28px !important;
  backdrop-filter:blur(18px) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.12), 0 24px 44px rgba(0,0,0,.16) !important;
}
.command-pulse-ring{
  width:190px !important;
  height:190px !important;
  background:conic-gradient(#38E89F 0 var(--pulse,70%), rgba(255,255,255,.18) var(--pulse,70%) 100%) !important;
  box-shadow:0 20px 50px rgba(56,232,159,.18), inset 0 0 0 1px rgba(255,255,255,.18) !important;
}
.command-pulse-ring::before{
  inset:19px !important;
  background:#081E3B !important;
  box-shadow:inset 0 0 30px rgba(22,144,245,.18) !important;
}
.command-pulse-ring span{color:#FFFFFF !important;font-size:46px !important;font-weight:950 !important}
.command-pulse-ring small{color:#BFE2FF !important;margin-top:-36px !important}
.command-hero-list span{
  color:#F3FAFF !important;
  background:rgba(255,255,255,.08) !important;
  border:1px solid rgba(255,255,255,.12) !important;
  padding:10px 12px !important;
  border-radius:16px !important;
}
.command-metric-grid{
  grid-template-columns:repeat(4,minmax(0,1fr)) !important;
  gap:18px !important;
}
.command-metric-card{
  background:#FFFFFF !important;
  border:1px solid #DDE6F0 !important;
  border-radius:28px !important;
  padding:22px !important;
  min-height:160px !important;
  box-shadow:0 20px 52px rgba(15,23,42,.07) !important;
}
.command-metric-card::after{
  right:-38px !important;
  top:-38px !important;
  width:122px !important;
  height:122px !important;
  opacity:.8 !important;
  background:radial-gradient(circle, rgba(22,144,245,.14), transparent 70%) !important;
}
.command-metric-label{color:#64748B !important;font-weight:900 !important}
.command-metric-card strong{color:#0F172A !important;font-size:36px !important}
.command-metric-card small{color:#64748B !important}
.command-metric-icon{background:#EAF3FF !important;color:#1690F5 !important}
.command-metric-card.success .command-metric-icon{background:#E8FFF4 !important;color:#10B981 !important}
.command-metric-card.warning .command-metric-icon{background:#FFF7E5 !important;color:#F59E0B !important}
.command-metric-card.danger .command-metric-icon{background:#FFF0F0 !important;color:#EF4444 !important}
.command-metric-card.violet .command-metric-icon{background:#F1ECFF !important;color:#8B5CF6 !important}
.command-trend{background:#E8FFF4 !important;color:#059669 !important}
.command-card{
  background:#FFFFFF !important;
  border:1px solid #DDE6F0 !important;
  border-radius:30px !important;
  padding:24px !important;
  box-shadow:0 20px 56px rgba(15,23,42,.065) !important;
}
.command-card .section-title h2,
.command-card h2,
.section-title h2{
  color:#0F172A !important;
}
.command-card .section-title p,
.section-title p{
  color:#64748B !important;
}
.command-grid-main{gap:20px !important;grid-template-columns:minmax(0,1.35fr) minmax(360px,.65fr) !important}
.command-grid-3{gap:20px !important}
.command-chart-tabs span{
  color:#0B63D1 !important;
  background:#EAF3FF !important;
  border-color:#D5E6FF !important;
}
.command-bar-row span,
.command-bar-row strong,
.command-workflow-grid span,
.command-alert span,
.command-task-row small,
.command-branch-row small{color:#64748B !important}
.command-bar-row div{background:#EEF4FB !important}
.command-mini-line{
  background:linear-gradient(180deg,#F4F9FF,#FFFFFF) !important;
  border-color:#DDE6F0 !important;
}
.command-mini-metric,
.command-branch-row,
.command-task-row,
.command-workflow-grid > div{
  background:#F8FBFF !important;
  border:1px solid #DDE6F0 !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.8) !important;
}
.command-mini-metric strong,
.command-workflow-grid b,
.command-branch-row strong,
.command-task-row strong,
.command-alert strong{color:#0F172A !important}
.command-alert.info{background:#EAF3FF !important;border-color:#D5E6FF !important}
.command-alert.warning{background:#FFF7E5 !important;border-color:#FDE7B3 !important}
.command-alert.danger{background:#FFF0F0 !important;border-color:#FFD6D6 !important}
.command-table-wrap{
  border-color:#DDE6F0 !important;
  border-radius:22px !important;
  background:#FFFFFF !important;
  overflow:auto !important;
}
.command-table-wrap th{
  background:#F4F7FB !important;
  color:#64748B !important;
}
.command-table-wrap td{color:#0F172A !important}
.command-status-pill{background:#EAF3FF !important;color:#0B63D1 !important}
@media (max-width:1400px){
  .command-hero{grid-template-columns:1fr !important}
  .command-grid-main{grid-template-columns:1fr !important}
  .command-metric-grid{grid-template-columns:repeat(2,minmax(0,1fr)) !important}
}
@media (max-width:760px){
  .command-metric-grid{grid-template-columns:1fr !important}
  .command-hero{padding:24px !important}
}



/* === V5.5 CONTENT REJA INNER REDESIGN ===
   Sidebar/menu current state preserved. Old API/functions preserved.
   Only Kontent reja inner UI, cards, toolbar, form, table/calendar/kanban visuals refreshed. */
.content-page-v5{
  --content-blue:#1690F5;
  --content-navy:#071426;
  --content-soft:#F4F8FD;
  --content-line:rgba(148,163,184,.18);
  display:grid;
  gap:18px;
  max-width:100%;
  color:#101827;
}
.content-page-v5 *{min-width:0;}
.content-page-v5 .content-v5-hero{
  min-height:260px;
  display:grid;
  grid-template-columns:minmax(0,1.25fr) minmax(320px,.75fr);
  gap:22px;
  padding:30px;
  border-radius:32px;
  background:
    radial-gradient(circle at 10% 0%, rgba(22,144,245,.32), transparent 32%),
    radial-gradient(circle at 94% 12%, rgba(46,199,255,.20), transparent 24%),
    linear-gradient(135deg,#061528 0%, #08284f 52%, #0b63d1 118%) !important;
  color:#fff !important;
  border:1px solid rgba(255,255,255,.13);
  box-shadow:0 30px 80px rgba(2,8,23,.24);
}
.content-page-v5 .content-v5-hero::before{
  inset:12px;
  border-radius:26px;
  border:1px solid rgba(255,255,255,.12);
}
.content-page-v5 .content-v5-hero::after{
  width:430px;
  height:430px;
  right:-150px;
  bottom:-210px;
  background:radial-gradient(circle, rgba(255,255,255,.16), rgba(22,144,245,.08), transparent 70%);
}
.content-page-v5 .content-v5-eyebrow{
  color:#dbeeff !important;
  background:rgba(255,255,255,.12);
  border-color:rgba(255,255,255,.18);
}
.content-page-v5 .content-v5-hero h1{
  color:#fff !important;
  font-size:clamp(34px,3.1vw,50px);
  letter-spacing:-.055em;
  line-height:1.02;
}
.content-page-v5 .content-v5-hero p{
  color:rgba(255,255,255,.78) !important;
  font-size:15.5px;
  max-width:760px;
}
.content-page-v5 .content-v5-hero-actions .btn.primary{
  background:#fff !important;
  color:#0b63d1 !important;
  box-shadow:0 18px 36px rgba(0,0,0,.14) !important;
}
.content-page-v5 .content-v5-hero-actions .btn.secondary,
.content-page-v5 .content-v5-month-switch{
  background:rgba(255,255,255,.12) !important;
  color:#fff !important;
  border-color:rgba(255,255,255,.18) !important;
}
.content-page-v5 .content-v5-month-switch button{
  background:rgba(255,255,255,.14) !important;
  color:#fff !important;
}
.content-page-v5 .content-v5-hero-panel{
  display:grid;
  grid-template-columns:150px minmax(0,1fr);
  gap:14px;
  align-content:stretch;
}
.content-page-v5 .content-v5-score-ring{
  min-height:176px;
  background:
    radial-gradient(circle closest-side,#081c37 67%, transparent 69%),
    conic-gradient(#42e49a var(--score), rgba(255,255,255,.18) 0) !important;
  border:1px solid rgba(255,255,255,.16) !important;
}
.content-page-v5 .content-v5-score-ring strong{color:#fff !important;}
.content-page-v5 .content-v5-score-ring span{color:#cfe4ff !important;}
.content-page-v5 .content-v5-platform-card,
.content-page-v5 .content-v5-platform-pills{
  background:rgba(255,255,255,.12) !important;
  border-color:rgba(255,255,255,.17) !important;
  color:#fff !important;
}
.content-page-v5 .content-v5-platform-card span,
.content-page-v5 .content-v5-platform-card small,
.content-page-v5 .content-v5-platform-pills span{color:rgba(255,255,255,.76) !important;}
.content-page-v5 .content-v5-platform-card strong,
.content-page-v5 .content-v5-platform-pills b{color:#fff !important;}
.content-page-v5 .content-v5-stats-row{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:14px;
}
.content-page-v5 .content-v5-stat{
  min-height:132px;
  border-radius:26px;
  padding:18px;
  background:linear-gradient(180deg,#fff 0%, #f8fbff 100%) !important;
  border:1px solid rgba(148,163,184,.16) !important;
  box-shadow:0 18px 46px rgba(15,23,42,.07) !important;
  color:#101827 !important;
}
.content-page-v5 .content-v5-stat span{color:#65758b !important;}
.content-page-v5 .content-v5-stat strong{color:#101827 !important;}
.content-page-v5 .content-v5-stat small{color:#6b7280 !important;}
.content-page-v5 .content-v5-stat::after{opacity:1;}
.mobilograf-content-only{
  gap:16px !important;
}
.mobilograf-content-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  border-radius:24px;
  padding:18px;
  background:linear-gradient(135deg,#ffffff,#f8fbff);
  border:1px solid rgba(148,163,184,.16);
  box-shadow:0 14px 36px rgba(15,23,42,.06);
}
.mobilograf-content-head span{
  color:#0b63d1;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.mobilograf-content-head h1{
  margin:4px 0 3px;
  color:#101827;
  font-size:28px;
  line-height:1.1;
}
.mobilograf-content-head p{
  margin:0;
  color:#64748b;
  font-weight:750;
}
.mobilograf-month-control{
  display:grid;
  grid-template-columns:42px minmax(150px,1fr) 42px;
  align-items:center;
  gap:8px;
}
.mobilograf-month-control button{
  height:42px;
  border-radius:14px;
  border:1px solid rgba(148,163,184,.18);
  background:#fff;
  color:#101827;
  font-size:22px;
  font-weight:950;
}
.mobilograf-month-control strong{
  min-height:42px;
  border-radius:14px;
  display:grid;
  place-items:center;
  padding:0 14px;
  background:#eff6ff;
  border:1px solid #dbeafe;
  color:#0b63d1;
}
.mobilograf-pdf-btn{
  min-height:42px;
  justify-content:center;
  white-space:nowrap;
}
.mobilograf-content-only .content-list-card{
  padding:16px !important;
}
.mobilograf-content-only .calendar-pro-shell{
  border-radius:22px !important;
  padding:0 !important;
  box-shadow:none !important;
}
.mobilograf-content-only .calendar-card{
  border-radius:20px;
  overflow:hidden;
}
.mobilograf-content-only .calendar-cell{
  min-height:126px;
}
.mobilograf-content-only .calendar-pill{
  cursor:pointer;
}
.mobilograf-content-only .calendar-pill.mobilograf-pill{
  gap:5px;
  border-left:4px solid #1478f2;
}
.mobilograf-content-only .calendar-pill.mobilograf-pill span{
  color:#0b63d1;
  font-size:10px;
  font-weight:950;
}
.mobilograf-content-only .calendar-pill.mobilograf-pill strong{
  font-size:12px;
  line-height:1.25;
}
.mobilograf-content-only .calendar-pill.mobilograf-pill small{
  color:#64748b;
  font-weight:850;
}
.mobilograf-brief-panel{
  display:grid;
  gap:16px;
}
.mobilograf-brief-hero{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:16px;
  border-radius:24px;
  padding:20px;
  background:linear-gradient(135deg,#eff6ff,#f8fafc);
  border:1px solid #dbeafe;
}
.mobilograf-brief-hero span{
  display:inline-flex;
  color:#0b63d1;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.mobilograf-brief-hero h2{
  margin:6px 0;
  color:#101827;
  font-size:28px;
  line-height:1.12;
}
.mobilograf-brief-hero p{
  margin:0;
  color:#475467;
  font-weight:850;
}
.mobilograf-brief-meta{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
}
.mobilograf-brief-meta > div,
.mobilograf-brief-script > div{
  display:grid;
  gap:8px;
  border:1px solid rgba(148,163,184,.18);
  border-radius:18px;
  padding:14px;
  background:#fff;
}
.mobilograf-brief-meta strong,
.mobilograf-brief-script strong{
  color:#64748b;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.mobilograf-brief-meta span,
.mobilograf-brief-script p{
  margin:0;
  color:#101827;
  font-weight:800;
  line-height:1.5;
}
.mobilograf-brief-script{
  display:grid;
  gap:10px;
}
.mobilograf-progress-box{
  display:grid;
  gap:12px;
  border:1px solid #dbeafe;
  border-radius:20px;
  padding:14px;
  background:#f8fbff;
}
.mobilograf-progress-box label{
  display:grid;
  gap:7px;
}
.mobilograf-progress-box label span{
  color:#475467;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.mobilograf-progress-box input,
.mobilograf-progress-box textarea{
  width:100%;
  border:1px solid rgba(148,163,184,.24);
  border-radius:14px;
  background:#fff;
  color:#101827;
  font-weight:800;
  padding:12px 14px;
  outline:none;
}
.mobilograf-progress-box textarea{
  resize:vertical;
}
.mobilograf-progress-actions{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
}
.mobilograf-progress-actions .btn{
  justify-content:center;
  min-height:44px;
  white-space:normal;
}
.mobilograf-brief-footer{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:12px;
  flex-wrap:wrap;
  border-top:1px solid rgba(148,163,184,.18);
  padding-top:14px;
}
.monthly-planner{
  display:grid;
  gap:16px;
  border-radius:30px;
  padding:18px;
  background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%);
  border:1px solid rgba(148,163,184,.16);
  box-shadow:0 18px 50px rgba(15,23,42,.07);
  color:#101827;
}
.monthly-planner-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:16px;
}
.monthly-planner-head span{
  color:#0b63d1;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.monthly-planner-head h2{
  margin:5px 0 6px;
  color:#101827;
  font-size:28px;
  line-height:1.08;
}
.monthly-planner-head p{
  margin:0;
  max-width:780px;
  color:#64748b;
  font-weight:750;
  line-height:1.55;
}
.monthly-planner-actions{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  justify-content:flex-end;
}
.monthly-planner-actions .btn{
  border-radius:16px;
  min-height:42px;
}
.monthly-planner-stats{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:12px;
}
.monthly-planner-stats div{
  min-height:96px;
  border-radius:22px;
  padding:16px;
  background:#fff;
  border:1px solid rgba(148,163,184,.16);
  box-shadow:0 12px 30px rgba(15,23,42,.045);
}
.monthly-planner-stats span{
  display:block;
  color:#64748b;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.monthly-planner-stats strong{
  display:block;
  margin-top:8px;
  color:#101827;
  font-size:32px;
  line-height:1;
}
.monthly-planner-stats small{
  color:#0f766e;
  font-weight:850;
}
.monthly-planner-layout{
  display:grid;
  grid-template-columns:250px minmax(0,1fr) 320px;
  gap:14px;
  align-items:start;
}
.planner-templates,
.planner-calendar,
.planner-quick{
  border-radius:24px;
  background:#fff;
  border:1px solid rgba(148,163,184,.16);
  box-shadow:0 12px 30px rgba(15,23,42,.045);
}
.planner-templates{
  padding:14px;
  display:grid;
  gap:10px;
}
.planner-templates > strong,
.planner-quick-head strong,
.planner-live-list > strong{
  color:#101827;
  font-size:16px;
}
.planner-templates > span,
.planner-quick-head span{
  color:#64748b;
  font-weight:750;
  font-size:12px;
}
.planner-templates button{
  min-height:74px;
  border-radius:18px;
  border:1px solid rgba(148,163,184,.16);
  background:#f8fbff;
  display:grid;
  grid-template-columns:38px 1fr;
  gap:10px;
  align-items:center;
  text-align:left;
  padding:10px;
}
.planner-templates button:hover{
  border-color:#93c5fd;
  transform:translateY(-1px);
}
.planner-templates i{
  width:38px;
  height:38px;
  border-radius:14px;
  display:grid;
  place-items:center;
  background:#eaf4ff;
  color:#0b63d1;
  font-style:normal;
  font-weight:950;
}
.planner-templates button strong{
  display:block;
  color:#101827;
  font-size:13px;
}
.planner-templates button small{
  display:block;
  margin-top:3px;
  color:#64748b;
  font-size:11px;
  font-weight:750;
}
.planner-calendar{
  padding:14px;
}
.planner-calendar-head{
  display:grid;
  grid-template-columns:42px minmax(0,1fr) 42px auto;
  gap:8px;
  align-items:center;
  margin-bottom:12px;
}
.planner-calendar-head button{
  height:38px;
  border-radius:14px;
  border:1px solid rgba(148,163,184,.18);
  background:#fff;
  color:#101827;
  font-size:20px;
  font-weight:900;
}
.planner-calendar-head strong{
  color:#101827;
  font-size:20px;
  text-align:center;
}
.planner-calendar-head span{
  border-radius:999px;
  background:#eff6ff;
  color:#0b63d1;
  border:1px solid #dbeafe;
  padding:8px 10px;
  font-size:12px;
  font-weight:900;
}
.planner-calendar .calendar-card{
  border-radius:20px;
  border:1px solid rgba(148,163,184,.16);
  overflow:hidden;
}
.planner-calendar .calendar-cell{
  min-height:118px;
}
.planner-calendar-pill{
  width:100%;
  border-radius:14px;
  border:1px solid #bfdbfe;
  background:#eff6ff;
  color:#101827;
  padding:8px;
  display:grid;
  grid-template-columns:minmax(0,1fr) 28px;
  gap:6px;
  align-items:center;
  box-shadow:0 8px 18px rgba(37,99,235,.08);
}
.planner-calendar-pill.warning{background:#fffbeb;border-color:#fde68a}
.planner-calendar-pill.info{background:#ecfeff;border-color:#a5f3fc}
.planner-calendar-pill.danger{background:#fff1f2;border-color:#fecdd3}
.planner-calendar-pill.academy{
  background:#f0fdf4;
  border-color:#86efac;
  box-shadow:0 8px 18px rgba(34,197,94,.10);
}
.planner-calendar-pill.customer{
  background:#fffbeb;
  border-color:#fcd34d;
  box-shadow:0 8px 18px rgba(245,158,11,.10);
}
.planner-calendar-pill.services{
  background:#f0f9ff;
  border-color:#7dd3fc;
  box-shadow:0 8px 18px rgba(14,165,233,.10);
}
.planner-calendar-pill strong{
  display:block;
  color:#101827;
  font-size:12px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.planner-calendar-pill span{
  display:block;
  color:#64748b;
  font-size:11px;
  font-weight:750;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.planner-calendar-pill button{
  width:28px;
  height:28px;
  border-radius:10px;
  border:1px solid rgba(148,163,184,.18);
  background:#fff;
  color:#0b63d1;
  display:grid;
  place-items:center;
}
.planner-quick{
  padding:14px;
  display:grid;
  gap:12px;
}
.planner-quick-head{
  display:flex;
  justify-content:space-between;
  align-items:center;
  gap:10px;
}
.planner-quick form{
  display:grid;
  gap:10px;
}
.planner-quick label{
  display:grid;
  gap:6px;
  color:#64748b;
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
}
.planner-quick input,
.planner-quick select,
.planner-quick textarea{
  width:100%;
  border-radius:14px;
  border:1px solid rgba(148,163,184,.20);
  background:#f8fbff;
  color:#101827;
  padding:11px 12px;
  font-size:14px;
  font-weight:750;
  text-transform:none;
}
.planner-quick textarea{
  resize:vertical;
}
.planner-quick .btn{
  width:100%;
  border-radius:16px;
  min-height:44px;
}
.planner-live-list{
  display:grid;
  gap:8px;
  border-top:1px solid rgba(148,163,184,.16);
  padding-top:12px;
}
.planner-live-list button{
  min-height:62px;
  border-radius:16px;
  border:1px solid rgba(148,163,184,.16);
  background:#fff;
  display:grid;
  grid-template-columns:72px 1fr;
  gap:3px 8px;
  align-items:center;
  text-align:left;
  padding:10px;
}
.planner-live-list span{
  grid-row:1 / span 2;
  color:#0b63d1;
  font-size:12px;
  font-weight:900;
}
.planner-live-list b{
  color:#101827;
  font-size:13px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.planner-live-list small,
.planner-live-list p{
  margin:0;
  color:#64748b;
  font-size:12px;
  font-weight:750;
}
.content-page-v5 .content-v5-viewbar{
  position:sticky;
  top:12px;
  z-index:25;
  grid-template-columns:auto minmax(260px,1fr) auto;
  border-radius:24px;
  padding:12px;
  background:rgba(255,255,255,.90) !important;
  border:1px solid rgba(148,163,184,.18) !important;
  box-shadow:0 20px 50px rgba(15,23,42,.09) !important;
  backdrop-filter:blur(18px);
}
.content-page-v5 .content-v5-segment{
  background:#eef4fb !important;
  border:1px solid rgba(148,163,184,.12);
}
.content-page-v5 .content-v5-segment button{color:#64748b !important;}
.content-page-v5 .content-v5-segment button.active{
  color:#fff !important;
  background:linear-gradient(135deg,#1690F5,#0b63d1) !important;
}
.content-page-v5 .content-v5-search,
.content-page-v5 .content-modern-search{
  background:#fff !important;
  border:1px solid rgba(148,163,184,.20) !important;
  color:#101827 !important;
}
.content-page-v5 .content-v5-search input,
.content-page-v5 .content-modern-search input{
  color:#101827 !important;
}
.content-page-v5 .content-modern-card,
.content-page-v5 .content-form-card,
.content-page-v5 .content-list-card{
  border-radius:30px !important;
  background:linear-gradient(180deg,#fff 0%, #f8fbff 100%) !important;
  border:1px solid rgba(148,163,184,.16) !important;
  box-shadow:0 18px 50px rgba(15,23,42,.07) !important;
  color:#101827 !important;
}
.content-page-v5 .content-modern-card::before{
  height:0 !important;
  background:transparent !important;
}
.content-page-v5 .content-modern-card::after{
  border-color:rgba(255,255,255,.72) !important;
}
.content-page-v5 .section-title-row h2,
.content-page-v5 .section-title-row strong,
.content-page-v5 h2,
.content-page-v5 h3{color:#101827 !important;}
.content-page-v5 .section-title-row p,
.content-page-v5 .section-title-row span,
.content-page-v5 small{color:#64748b;}
.content-page-v5 .info-banner{
  border-radius:18px;
  background:linear-gradient(135deg,rgba(22,144,245,.10),rgba(46,199,255,.08)) !important;
  border:1px solid rgba(22,144,245,.15) !important;
  color:#1e293b !important;
}
.content-page-v5 .content-control-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:14px;
}
.content-page-v5 .content-control-panel{
  border-radius:24px;
  padding:16px;
  background:#fff !important;
  border:1px solid rgba(148,163,184,.16) !important;
  box-shadow:0 12px 30px rgba(15,23,42,.045);
}
.content-page-v5 .content-control-head strong{color:#101827 !important;}
.content-page-v5 .deadline-item,
.content-page-v5 .signal-item,
.content-page-v5 .approval-history-mini button{
  border-radius:16px;
  background:#f8fbff !important;
  border:1px solid rgba(148,163,184,.14) !important;
  color:#101827 !important;
}
.content-page-v5 .deadline-item span,
.content-page-v5 .signal-item span,
.content-page-v5 .approval-history-mini small{color:#64748b !important;}
.content-page-v5 .content-modern-form{
  background:#f8fbff !important;
  border:1px solid rgba(148,163,184,.14) !important;
  border-radius:24px !important;
  padding:18px !important;
}
.content-page-v5 .content-modern-form label{
  border-radius:18px !important;
  background:#fff !important;
  border:1px solid rgba(148,163,184,.14) !important;
  color:#101827 !important;
}
.content-page-v5 .content-modern-form label span{color:#64748b !important;}
.content-page-v5 .content-modern-form input,
.content-page-v5 .content-modern-form select,
.content-page-v5 .content-modern-form textarea{
  background:#f8fbff !important;
  border:1px solid rgba(148,163,184,.20) !important;
  color:#101827 !important;
}
.content-page-v5 .content-submit-btn{
  border-radius:18px !important;
  background:linear-gradient(135deg,#1690F5,#0b63d1) !important;
  color:#fff !important;
}
.content-page-v5 .content-list-card .table-wrap,
.content-page-v5 .calendar-pro-shell,
.content-page-v5 .kanban-board{
  background:#fff !important;
  border:1px solid rgba(148,163,184,.16) !important;
  border-radius:24px !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.9) !important;
}
.content-page-v5 table{
  background:#fff !important;
  color:#101827 !important;
}
.content-page-v5 .content-list-card th{
  background:#f1f7ff !important;
  color:#475569 !important;
  font-size:12px;
  text-transform:uppercase;
  letter-spacing:.06em;
}
.content-page-v5 .content-list-card td{
  background:#fff !important;
  color:#101827 !important;
  border-bottom:1px solid rgba(148,163,184,.12) !important;
}
.content-page-v5 .content-list-card tbody tr:hover td{
  background:#f8fbff !important;
}
.content-page-v5 .content-list-card tbody tr.academy-content-row td{
  background:linear-gradient(90deg,#f0fdf4,#ffffff) !important;
}
.content-page-v5 .content-list-card tbody tr.customer-content-row td{
  background:linear-gradient(90deg,#fffbeb,#ffffff) !important;
}
.content-page-v5 .content-list-card tbody tr.services-content-row td{
  background:linear-gradient(90deg,#f0f9ff,#ffffff) !important;
}
.content-page-v5 .table-chip.academy{
  background:#dcfce7 !important;
  color:#047857 !important;
  border-color:#86efac !important;
}
.content-page-v5 .table-chip.customer{
  background:#fef3c7 !important;
  color:#b45309 !important;
  border-color:#fcd34d !important;
}
.content-page-v5 .table-chip.services{
  background:#e0f2fe !important;
  color:#0369a1 !important;
  border-color:#7dd3fc !important;
}
.content-page-v5 .academy-content-card{
  background:linear-gradient(135deg,#f0fdf4,#ffffff) !important;
  border-color:#86efac !important;
}
.content-page-v5 .customer-content-card{
  background:linear-gradient(135deg,#fffbeb,#ffffff) !important;
  border-color:#fcd34d !important;
}
.content-page-v5 .services-content-card{
  background:linear-gradient(135deg,#f0f9ff,#ffffff) !important;
  border-color:#7dd3fc !important;
}
.content-page-v5 .table-title-main,
.content-page-v5 .table-person,
.content-page-v5 .table-date-stack strong{color:#101827 !important;}
.content-page-v5 .table-title-sub,
.content-page-v5 .table-cell-muted{color:#64748b !important;}
.content-page-v5 .table-chip,
.content-page-v5 .status-pill,
.content-page-v5 .mini-badge{
  border-radius:999px !important;
  font-weight:850 !important;
}
.content-page-v5 .icon-btn,
.content-page-v5 .content-modern-btn,
.content-page-v5 .btn.secondary{
  background:#fff !important;
  border:1px solid rgba(148,163,184,.18) !important;
  color:#101827 !important;
}
.content-page-v5 .btn.primary{
  background:linear-gradient(135deg,#1690F5,#0b63d1) !important;
  color:#fff !important;
}
.content-page-v5 .calendar-pro-card,
.content-page-v5 .calendar-pro-day,
.content-page-v5 .kanban-column,
.content-page-v5 .kanban-card,
.content-page-v5 .mobile-record-card{
  background:#fff !important;
  border:1px solid rgba(148,163,184,.16) !important;
  color:#101827 !important;
  box-shadow:0 12px 30px rgba(15,23,42,.045) !important;
}
.content-page-v5 .mobile-record-card.academy-content-card{
  background:linear-gradient(135deg,#f0fdf4,#ffffff) !important;
  border-color:#86efac !important;
}
.content-page-v5 .mobile-record-card.customer-content-card{
  background:linear-gradient(135deg,#fffbeb,#ffffff) !important;
  border-color:#fcd34d !important;
}
.content-page-v5 .mobile-record-card.services-content-card{
  background:linear-gradient(135deg,#f0f9ff,#ffffff) !important;
  border-color:#7dd3fc !important;
}
.content-page-v5 .kanban-column h3,
.content-page-v5 .kanban-card strong{color:#101827 !important;}
.content-page-v5 .empty-block,
.content-page-v5 .empty-cell{color:#64748b !important;}
.content-empty-start{
  min-height:190px;
  display:grid;
  place-items:center;
  align-content:center;
  gap:10px;
  padding:24px;
  text-align:center;
  border-radius:18px;
  background:linear-gradient(135deg,#f8fbff,#eef6ff);
  border:1px dashed rgba(22,144,245,.24);
}
.content-empty-start strong{
  color:#101827;
  font-size:18px;
}
.content-empty-start span{
  max-width:520px;
  color:#64748b;
  font-weight:750;
  line-height:1.55;
}
@media (max-width:1280px){
  .content-page-v5 .content-v5-hero{grid-template-columns:1fr !important;}
  .content-page-v5 .content-v5-hero-panel{grid-template-columns:150px 1fr !important;}
  .content-page-v5 .content-control-grid{grid-template-columns:1fr !important;}
  .monthly-planner-layout{grid-template-columns:1fr}
  .planner-templates{grid-template-columns:repeat(2,minmax(0,1fr))}
  .planner-templates > strong,
  .planner-templates > span{grid-column:1 / -1}
}
@media (max-width:900px){
  .content-page-v5 .content-v5-stats-row,
  .content-page-v5 .content-v5-viewbar,
  .content-page-v5 .content-v5-hero-panel{grid-template-columns:1fr !important;}
  .content-page-v5 .content-v5-viewbar{position:relative;top:auto;}
  .content-page-v5 .content-v5-hero{padding:22px !important;border-radius:26px !important;}
  .mobilograf-content-head{display:grid}
  .mobilograf-month-control{grid-template-columns:42px 1fr 42px}
  .mobilograf-content-only .calendar-cell{min-height:112px}
  .mobilograf-brief-hero{display:grid}
  .mobilograf-brief-meta{grid-template-columns:1fr}
  .mobilograf-progress-actions{grid-template-columns:1fr 1fr}
  .monthly-planner{padding:14px;border-radius:24px}
  .monthly-planner-head,
  .monthly-planner-actions{display:grid;justify-content:stretch}
  .monthly-planner-stats,
  .planner-templates{grid-template-columns:1fr}
  .planner-calendar-head{grid-template-columns:42px 1fr 42px}
  .planner-calendar-head span{grid-column:1 / -1;text-align:center}
  .planner-calendar .calendar-cell{min-height:104px}
}

/* === v5.6 Sidebar split: SMM menejer / Mobilograf. Old routes and functions preserved. === */
.sidebar-role-switcher{
  display:grid;
  grid-template-columns:1fr 1fr;
  gap:8px;
  padding:6px;
  margin:10px 0 12px;
  border-radius:22px;
  background:rgba(15,23,42,.62);
  border:1px solid rgba(148,163,184,.18);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
}
.sidebar-role-pill{
  min-width:0;
  border:0;
  border-radius:17px;
  padding:10px 8px;
  cursor:pointer;
  background:transparent;
  color:rgba(226,232,240,.78);
  text-align:left;
  transition:.2s ease;
}
.sidebar-role-pill strong{
  display:block;
  font-size:11px;
  line-height:1.1;
  letter-spacing:.02em;
  color:rgba(248,250,252,.88);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.sidebar-role-pill span{
  display:block;
  margin-top:4px;
  font-size:9px;
  line-height:1.1;
  color:rgba(203,213,225,.64);
  white-space:nowrap;
  overflow:hidden;
  text-overflow:ellipsis;
}
.sidebar-role-pill:hover{
  background:rgba(255,255,255,.08);
}
.sidebar-role-pill.active{
  background:linear-gradient(135deg,#1690F5 0%,#0B63F6 100%);
  box-shadow:0 12px 26px rgba(22,144,245,.28), inset 0 1px 0 rgba(255,255,255,.26);
}
.sidebar-role-pill.active strong,
.sidebar-role-pill.active span{
  color:#fff;
}
.mobile-role-switcher{
  margin:10px 0 16px;
  background:#eef5ff;
  border-color:#d6e7ff;
}
.mobile-role-switcher .sidebar-role-pill{
  color:#334155;
}
.mobile-role-switcher .sidebar-role-pill strong{color:#0f172a}
.mobile-role-switcher .sidebar-role-pill span{color:#64748b}
.mobile-role-switcher .sidebar-role-pill.active strong,
.mobile-role-switcher .sidebar-role-pill.active span{color:#fff}
@media (max-width:720px){
  .sidebar-role-switcher{grid-template-columns:1fr}
  .mobile-role-switcher{grid-template-columns:1fr 1fr}
}


/* === v5.8 Bonus tizimi redesign: SMM manager self-bonus restricted, old functions preserved. === */
.bonus-v58-shell{
  gap:22px !important;
}
.bonus-v58-hero{
  position:relative;
  overflow:hidden;
  display:grid;
  grid-template-columns:minmax(0,1fr) 330px;
  gap:22px;
  padding:28px;
  border-radius:32px;
  color:#fff;
  background:
    radial-gradient(circle at 82% 12%, rgba(56,189,248,.35), transparent 32%),
    linear-gradient(135deg,#07111f 0%,#0b1e36 48%,#0f3f69 100%);
  box-shadow:0 24px 70px rgba(15,23,42,.24);
}
.bonus-v58-hero:before{
  content:"";
  position:absolute;
  inset:auto -80px -130px auto;
  width:360px;
  height:360px;
  border-radius:999px;
  background:rgba(22,144,245,.24);
  filter:blur(10px);
}
.bonus-v58-hero-copy,
.bonus-v58-hero-panel{position:relative;z-index:1}
.bonus-v58-eyebrow{
  display:inline-flex;
  align-items:center;
  gap:8px;
  padding:8px 12px;
  border-radius:999px;
  color:#dff2ff;
  background:rgba(255,255,255,.10);
  border:1px solid rgba(255,255,255,.16);
  font-size:12px;
  font-weight:800;
  letter-spacing:.03em;
}
.bonus-v58-hero h2{
  margin:14px 0 8px;
  font-size:34px;
  line-height:1.05;
  letter-spacing:-.04em;
  color:#fff;
}
.bonus-v58-hero p{
  max-width:760px;
  margin:0;
  color:rgba(226,232,240,.86);
  line-height:1.7;
  font-weight:600;
}
.bonus-v58-rule,
.bonus-v58-lock-note{
  display:flex;
  align-items:flex-start;
  gap:10px;
  margin-top:14px;
  padding:12px 14px;
  border-radius:18px;
  font-size:13px;
  font-weight:800;
  line-height:1.5;
}
.bonus-v58-rule{
  max-width:760px;
  color:#e0f2fe;
  background:rgba(22,144,245,.16);
  border:1px solid rgba(125,211,252,.24);
}
.bonus-v58-lock-note{
  color:#0f3f69;
  background:#eaf6ff;
  border:1px solid #c8e9ff;
}
.bonus-v58-lock-note svg{flex:0 0 auto;margin-top:1px;color:#1690f5}
.bonus-v58-hero-panel{
  align-self:stretch;
  display:flex;
  flex-direction:column;
  justify-content:center;
  gap:8px;
  padding:22px;
  border-radius:26px;
  background:rgba(255,255,255,.12);
  border:1px solid rgba(255,255,255,.18);
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18);
  backdrop-filter:blur(18px);
}
.bonus-v58-hero-panel span{
  color:#bae6fd;
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
  letter-spacing:.08em;
}
.bonus-v58-hero-panel strong{
  color:#fff;
  font-size:30px;
  letter-spacing:-.04em;
}
.bonus-v58-hero-panel small{
  color:rgba(226,232,240,.78);
  font-weight:700;
}
.bonus-v58-role-grid{
  display:grid;
  grid-template-columns:repeat(2,minmax(0,1fr));
  gap:16px;
}
.bonus-v58-role-card{
  position:relative;
  overflow:hidden;
  padding:20px;
  border-radius:26px;
  background:#fff;
  border:1px solid rgba(226,232,240,.92);
  box-shadow:0 18px 45px rgba(15,23,42,.07);
}
.bonus-v58-role-card:after{
  content:"";
  position:absolute;
  top:-36px;
  right:-36px;
  width:120px;
  height:120px;
  border-radius:999px;
  opacity:.16;
}
.bonus-v58-role-card.smm:after{background:#1690f5}
.bonus-v58-role-card.mobile:after{background:#10b981}
.bonus-v58-role-card span{
  display:inline-flex;
  padding:7px 10px;
  border-radius:999px;
  font-size:11px;
  font-weight:900;
  color:#0f3f69;
  background:#eaf6ff;
}
.bonus-v58-role-card.mobile span{color:#065f46;background:#ecfdf5}
.bonus-v58-role-card strong{
  display:block;
  margin:12px 0 6px;
  font-size:18px;
  color:#0f172a;
  letter-spacing:-.03em;
}
.bonus-v58-role-card small{
  display:block;
  color:#64748b;
  font-weight:700;
  line-height:1.55;
}
.bonus-v58-card,
.bonus-v58-shell .bonus-command-card{
  border-radius:28px !important;
  border:1px solid rgba(226,232,240,.96) !important;
  box-shadow:0 18px 50px rgba(15,23,42,.07) !important;
}
.bonus-v58-shell .stats-grid .stat-card,
.bonus-v58-shell .stat-card{
  border-radius:24px !important;
  border:1px solid #e6edf5 !important;
  background:linear-gradient(180deg,#fff 0%,#f8fbff 100%) !important;
  box-shadow:0 14px 32px rgba(15,23,42,.06) !important;
}
.bonus-v58-shell .form-grid label{
  border:1px solid #e6edf5;
  background:#f8fbff;
  border-radius:18px;
  padding:10px 12px;
}
.bonus-v58-shell .form-grid label span{
  color:#475569;
  font-size:12px;
  font-weight:900;
}
.bonus-v58-shell .form-grid input,
.bonus-v58-shell .form-grid select,
.bonus-v58-shell .form-grid textarea{
  background:#fff !important;
  color:#0f172a !important;
  border:1px solid #d9e4f2 !important;
  box-shadow:none !important;
}
.bonus-v58-shell .table-wrap table{
  border-collapse:separate;
  border-spacing:0 8px;
}
.bonus-v58-shell .table-wrap thead th{
  color:#64748b;
  background:#f8fafc;
  border-top:1px solid #e2e8f0;
  border-bottom:1px solid #e2e8f0;
}
.bonus-v58-shell .table-wrap tbody tr{
  background:#fff;
  box-shadow:0 8px 22px rgba(15,23,42,.05);
}
.bonus-v58-shell .table-wrap tbody td{
  border-top:1px solid #eef2f7;
  border-bottom:1px solid #eef2f7;
}
.bonus-v58-shell .table-wrap tbody td:first-child{border-left:1px solid #eef2f7;border-radius:16px 0 0 16px}
.bonus-v58-shell .table-wrap tbody td:last-child{border-right:1px solid #eef2f7;border-radius:0 16px 16px 0}
@media (max-width:980px){
  .bonus-v58-hero{grid-template-columns:1fr;padding:22px;border-radius:26px}
  .bonus-v58-role-grid{grid-template-columns:1fr}
}


/* === V5.9 BONUS COLOR HOTFIX: bonus sahifasi oq/yozuv ko'rinmay qolish muammosi tuzatildi === */
.main-area:has(.bonus-v58-shell){
  background:
    radial-gradient(circle at 16% 0%, rgba(22,144,245,.10), transparent 28%),
    radial-gradient(circle at 90% 18%, rgba(16,185,129,.08), transparent 22%),
    #f4f7fb !important;
}
.bonus-v58-shell{
  position:relative;
  min-height:calc(100vh - 40px);
  padding:22px !important;
  border-radius:34px;
  background:
    linear-gradient(180deg, rgba(255,255,255,.74), rgba(244,247,251,.92)) !important;
  color:#0f172a !important;
}
.bonus-v58-shell::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  border-radius:inherit;
  background:
    radial-gradient(circle at 10% 8%, rgba(22,144,245,.10), transparent 24%),
    radial-gradient(circle at 86% 4%, rgba(45,212,191,.10), transparent 22%);
  z-index:0;
}
.bonus-v58-shell > *{position:relative;z-index:1}
.bonus-v58-shell .section-title-row h2,
.bonus-v58-shell .section-title-row p,
.bonus-v58-shell h1,
.bonus-v58-shell h2,
.bonus-v58-shell h3,
.bonus-v58-shell h4,
.bonus-v58-shell p,
.bonus-v58-shell label,
.bonus-v58-shell label span,
.bonus-v58-shell strong,
.bonus-v58-shell small,
.bonus-v58-shell td,
.bonus-v58-shell th{
  color:#0f172a !important;
}
.bonus-v58-shell .section-title-row p,
.bonus-v58-shell small,
.bonus-v58-shell .muted,
.bonus-v58-shell .stat-card-hint,
.bonus-v58-shell .stat-card-title{
  color:#64748b !important;
}
.bonus-v58-card,
.bonus-v58-shell > .card,
.bonus-v58-shell .card,
.bonus-v58-shell .bonus-command-card,
.bonus-v58-shell .bonus-plastic-section,
.bonus-v58-shell .bonus-approval-stack,
.bonus-v58-shell .table-wrap,
.bonus-v58-shell .mobile-record-card,
.bonus-v58-shell .stats-grid .stat-card,
.bonus-v58-shell .stat-card{
  background:
    linear-gradient(180deg,#ffffff 0%,#f8fbff 100%) !important;
  color:#0f172a !important;
  border:1px solid #e2e8f0 !important;
  box-shadow:0 18px 46px rgba(15,23,42,.08) !important;
}
.bonus-v58-hero{
  background:
    radial-gradient(circle at 78% 12%, rgba(56,189,248,.34), transparent 30%),
    radial-gradient(circle at 8% 10%, rgba(22,144,245,.28), transparent 26%),
    linear-gradient(135deg,#071426 0%,#0a1b31 48%,#0e4778 100%) !important;
  color:#fff !important;
}
.bonus-v58-hero h1,
.bonus-v58-hero h2,
.bonus-v58-hero h3,
.bonus-v58-hero p,
.bonus-v58-hero strong,
.bonus-v58-hero small,
.bonus-v58-hero span,
.bonus-v58-hero .bonus-v58-eyebrow,
.bonus-v58-hero .bonus-v58-rule,
.bonus-v58-hero .bonus-v58-hero-panel span,
.bonus-v58-hero .bonus-v58-hero-panel strong,
.bonus-v58-hero .bonus-v58-hero-panel small{
  color:#fff !important;
}
.bonus-v58-hero p,
.bonus-v58-hero .bonus-v58-hero-panel small{
  color:rgba(226,232,240,.86) !important;
}
.bonus-v58-eyebrow,
.bonus-v58-rule,
.bonus-v58-hero-panel{
  background:rgba(255,255,255,.12) !important;
  border-color:rgba(255,255,255,.18) !important;
}
.bonus-v58-rule svg{color:#7dd3fc !important;flex:0 0 auto}
.bonus-v58-role-card{
  background:linear-gradient(180deg,#fff,#f8fbff) !important;
  color:#0f172a !important;
  border:1px solid #e2e8f0 !important;
}
.bonus-v58-role-card span{color:#0f3f69 !important;background:#eaf6ff !important}
.bonus-v58-role-card.mobile span{color:#065f46 !important;background:#ecfdf5 !important}
.bonus-v58-role-card strong{color:#0f172a !important}
.bonus-v58-role-card small{color:#64748b !important}
.bonus-v58-shell input,
.bonus-v58-shell select,
.bonus-v58-shell textarea,
.bonus-v58-shell .form-grid input,
.bonus-v58-shell .form-grid select,
.bonus-v58-shell .form-grid textarea,
.bonus-v58-shell .toolbar-search input{
  background:#ffffff !important;
  color:#0f172a !important;
  border:1px solid #d8e3f1 !important;
  -webkit-text-fill-color:#0f172a !important;
}
.bonus-v58-shell input::placeholder,
.bonus-v58-shell textarea::placeholder{color:#94a3b8 !important;-webkit-text-fill-color:#94a3b8 !important}
.bonus-v58-shell .form-grid label{
  background:#f8fbff !important;
  color:#0f172a !important;
  border:1px solid #e2e8f0 !important;
}
.bonus-v58-shell .table-wrap thead th{
  background:#eef5ff !important;
  color:#334155 !important;
}
.bonus-v58-shell .table-wrap tbody tr,
.bonus-v58-shell .table-wrap tbody td{
  background:#ffffff !important;
  color:#0f172a !important;
}
.bonus-v58-shell .empty-cell,
.bonus-v58-shell .empty-block{
  background:#f8fbff !important;
  color:#64748b !important;
  border:1px dashed #cbd5e1 !important;
}
.bonus-v58-shell .btn.secondary{
  background:#ffffff !important;
  color:#0f172a !important;
  border-color:#d8e3f1 !important;
}
.bonus-v58-shell .btn.primary{
  background:linear-gradient(135deg,#1690F5,#0B63F6) !important;
  color:#fff !important;
}
.bonus-v58-lock-note{
  background:#eaf6ff !important;
  color:#0f3f69 !important;
  border:1px solid #c8e9ff !important;
}
.bonus-v58-lock-note *{color:#0f3f69 !important}
.bonus-v58-lock-note svg{color:#1690f5 !important}


/* === Manager OS Lab: strategy, CRM, analytics, KPI modules === */
.manager-lab-page{
  display:grid;
  gap:18px;
}
.manager-lab-hero{
  display:flex;
  justify-content:space-between;
  align-items:flex-end;
  gap:18px;
  border-radius:8px;
  padding:24px;
  color:#fff;
  background:
    linear-gradient(135deg,rgba(15,23,42,.96),rgba(8,47,73,.94)),
    radial-gradient(circle at 88% 12%,rgba(45,212,191,.28),transparent 32%);
  border:1px solid rgba(148,163,184,.2);
  box-shadow:0 22px 58px rgba(15,23,42,.18);
}
.manager-lab-hero span{
  display:inline-flex;
  align-items:center;
  gap:8px;
  color:#5eead4;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.manager-lab-hero h1{
  margin:10px 0 8px;
  font-size:34px;
  line-height:1.08;
  color:#fff;
}
.manager-lab-hero p{
  max-width:820px;
  margin:0;
  color:#cbd5e1;
  font-weight:750;
  line-height:1.6;
}
.manager-lab-hero > strong{
  flex:0 0 auto;
  width:96px;
  height:96px;
  border-radius:8px;
  display:grid;
  place-items:center;
  color:#0f172a;
  background:#5eead4;
  font-size:34px;
  box-shadow:0 18px 44px rgba(45,212,191,.24);
}
.manager-lab-tabs{
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  gap:10px;
}
.manager-lab-tabs button{
  min-height:78px;
  border-radius:8px;
  border:1px solid #dce7f2;
  background:#fff;
  color:#475467;
  display:grid;
  grid-template-columns:auto 1fr auto;
  align-items:center;
  gap:8px;
  padding:12px;
  text-align:left;
  font-weight:900;
  box-shadow:0 12px 32px rgba(15,23,42,.06);
}
.manager-lab-tabs button.active{
  border-color:#2dd4bf;
  background:#ecfeff;
  color:#0f766e;
}
.manager-lab-tabs b{
  min-width:28px;
  height:28px;
  border-radius:999px;
  display:grid;
  place-items:center;
  background:#0f172a;
  color:#5eead4;
  font-size:12px;
}
.manager-lab-command{
  border-radius:8px;
  padding:18px;
  background:linear-gradient(135deg,#ffffff,#f8fbff 62%,#ecfeff);
  border:1px solid #dce7f2;
  box-shadow:0 18px 45px rgba(15,23,42,.07);
  display:grid;
  gap:14px;
}
.manager-lab-command-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:14px;
}
.manager-lab-command-head span,
.manager-lab-action-list > span{
  color:#0d9488;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.manager-lab-command-head h2{
  margin:5px 0 0;
  color:#0f172a;
  font-size:22px;
  line-height:1.12;
}
.manager-lab-command-head > strong{
  flex:0 0 auto;
  min-width:64px;
  height:40px;
  border-radius:999px;
  display:grid;
  place-items:center;
  background:#ecfeff;
  color:#0f766e;
  border:1px solid #99f6e4;
}
.manager-lab-command-grid{
  display:grid;
  gap:10px;
  align-items:stretch;
}
.manager-lab-command-grid.strategy,
.manager-lab-command-grid.generic{
  grid-template-columns:repeat(3,minmax(0,1fr)) minmax(260px,1fr);
}
.manager-lab-command-grid.blogger{
  grid-template-columns:repeat(3,minmax(0,1fr));
}
.manager-lab-command-grid.competitor,
.manager-lab-command-grid.audience{
  grid-template-columns:repeat(3,minmax(0,1fr));
}
.manager-lab-metric,
.manager-lab-action-list,
.manager-lab-pipeline,
.manager-lab-signal-list,
.manager-lab-platform-pulse{
  border-radius:8px;
  background:#fff;
  border:1px solid #dfe8f2;
  box-shadow:0 12px 30px rgba(15,23,42,.045);
  padding:14px;
}
.manager-lab-metric{
  min-height:112px;
  display:grid;
  align-content:start;
  gap:7px;
}
.manager-lab-metric span{
  color:#667085;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.manager-lab-metric strong{
  color:#0f172a;
  font-size:30px;
  line-height:1;
}
.manager-lab-metric small{
  color:#667085;
  font-weight:800;
  line-height:1.45;
}
.manager-lab-action-list{
  display:grid;
  gap:8px;
}
.manager-lab-command-grid.blogger .manager-lab-action-list,
.manager-lab-command-grid.competitor .manager-lab-action-list,
.manager-lab-command-grid.audience .manager-lab-action-list,
.manager-lab-pipeline,
.manager-lab-signal-list,
.manager-lab-platform-pulse{
  grid-column:span 3;
}
.manager-lab-action-list button,
.manager-lab-signal-list button,
.manager-lab-platform-pulse button{
  min-height:56px;
  border-radius:8px;
  border:1px solid #e0e8f2;
  background:#f8fbff;
  display:grid;
  align-content:center;
  gap:3px;
  padding:10px;
  text-align:left;
}
.manager-lab-action-list button:hover,
.manager-lab-signal-list button:hover,
.manager-lab-platform-pulse button:hover{
  border-color:#2dd4bf;
  transform:translateY(-1px);
}
.manager-lab-action-list button strong,
.manager-lab-signal-list button strong,
.manager-lab-platform-pulse button strong{
  color:#101828;
  font-size:13px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.manager-lab-action-list button small,
.manager-lab-action-list p,
.manager-lab-signal-list button small,
.manager-lab-signal-list p,
.manager-lab-platform-pulse p{
  margin:0;
  color:#667085;
  font-size:12px;
  font-weight:800;
}
.manager-lab-signal-list,
.manager-lab-platform-pulse{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:8px;
}
.manager-lab-signal-list button{
  min-height:94px;
  align-content:start;
}
.manager-lab-signal-list button span,
.manager-lab-platform-pulse button span{
  color:#0d9488;
  font-size:12px;
  font-weight:900;
}
.manager-lab-platform-pulse button{
  min-height:86px;
}
.manager-lab-platform-pulse i{
  height:8px;
  border-radius:999px;
  background:#edf2f7;
  overflow:hidden;
}
.manager-lab-platform-pulse em{
  display:block;
  height:100%;
  border-radius:inherit;
  background:linear-gradient(90deg,#1478f2,#00bfa6);
}
.manager-lab-pipeline{
  display:grid;
  grid-template-columns:repeat(5,minmax(0,1fr));
  gap:8px;
}
.manager-lab-pipeline span{
  min-height:54px;
  border-radius:8px;
  background:#f8fbff;
  border:1px solid #e0e8f2;
  padding:10px;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:8px;
}
.manager-lab-pipeline b{
  color:#667085;
  font-size:11px;
  text-transform:uppercase;
}
.manager-lab-pipeline strong{
  color:#0f172a;
  font-size:18px;
}
.manager-lab-layout{
  display:grid;
  grid-template-columns:minmax(320px,.72fr) minmax(0,1.28fr);
  gap:18px;
  align-items:start;
}
.manager-lab-card{
  border-radius:8px;
  background:#fff;
  border:1px solid #dce7f2;
  box-shadow:0 18px 45px rgba(15,23,42,.07);
  padding:18px;
}
.manager-lab-form textarea{
  min-height:96px;
}
.manager-lab-submit{
  grid-column:1/-1;
  display:flex;
  gap:10px;
  flex-wrap:wrap;
}
.manager-lab-list .table-wrap{
  max-height:620px;
  overflow:auto;
}
.manager-lab-empty{
  min-height:260px;
  margin-top:14px;
  border-radius:8px;
  border:1px dashed #b9d7d2;
  background:linear-gradient(135deg,#f8fbff,#ecfeff);
  display:grid;
  place-items:center;
  align-content:center;
  gap:10px;
  padding:28px;
  text-align:center;
}
.manager-lab-empty svg{color:#0d9488}
.manager-lab-empty strong{
  color:#0f172a;
  font-size:18px;
}
.manager-lab-empty span{
  max-width:520px;
  color:#667085;
  font-weight:750;
  line-height:1.55;
}
@media (max-width:1180px){
  .manager-lab-tabs{grid-template-columns:repeat(3,minmax(0,1fr))}
  .manager-lab-command-grid.strategy,
  .manager-lab-command-grid.generic,
  .manager-lab-command-grid.blogger,
  .manager-lab-command-grid.competitor,
  .manager-lab-command-grid.audience{grid-template-columns:repeat(2,minmax(0,1fr))}
  .manager-lab-command-grid.blogger .manager-lab-action-list,
  .manager-lab-pipeline,
  .manager-lab-signal-list,
  .manager-lab-platform-pulse{grid-column:1 / -1}
  .manager-lab-signal-list,
  .manager-lab-platform-pulse{grid-template-columns:repeat(2,minmax(0,1fr))}
  .manager-lab-layout{grid-template-columns:1fr}
}
@media (max-width:680px){
  .manager-lab-hero{display:grid;padding:20px}
  .manager-lab-hero h1{font-size:28px}
  .manager-lab-hero > strong{width:72px;height:72px;font-size:28px}
  .manager-lab-tabs{grid-template-columns:1fr}
  .manager-lab-command-head{display:grid}
  .manager-lab-command-grid.strategy,
  .manager-lab-command-grid.generic,
  .manager-lab-command-grid.blogger,
  .manager-lab-command-grid.competitor,
  .manager-lab-command-grid.audience,
  .manager-lab-signal-list,
  .manager-lab-platform-pulse,
  .manager-lab-pipeline{grid-template-columns:1fr}
}

/* === alooSMM Manager OS redesign: dashboard and shell identity === */
.brand-mark{
  background:linear-gradient(135deg,#051321,#0f2f4d 52%,#00bfa6)!important;
  border:1px solid rgba(255,255,255,.16)!important;
  box-shadow:0 18px 38px rgba(0,191,166,.18)!important;
}
.brand-mark-image{border-radius:12px!important}
.sidebar-workspace-card{
  background:linear-gradient(135deg,rgba(0,191,166,.14),rgba(20,120,242,.10))!important;
  border-color:rgba(125,211,252,.18)!important;
}
.sidebar-role-switcher{
  background:rgba(255,255,255,.045)!important;
  border:1px solid rgba(255,255,255,.08)!important;
  border-radius:18px!important;
  padding:6px!important;
}
.sidebar-role-pill{
  border-radius:14px!important;
  background:transparent!important;
}
.sidebar-role-pill.active{
  background:linear-gradient(135deg,#ffffff,#ddfff8)!important;
  color:#07111d!important;
  box-shadow:0 14px 28px rgba(0,191,166,.16)!important;
}
.sidebar-role-pill.active span,
.sidebar-role-pill.active strong{color:#07111d!important}
.manager-os-page{
  display:grid;
  gap:18px;
  color:#0f172a;
}
.manager-os-page *{letter-spacing:0}
.manager-os-hero{
  min-height:238px;
  border-radius:8px;
  padding:26px;
  display:grid;
  grid-template-columns:minmax(0,1fr) 280px;
  gap:22px;
  align-items:stretch;
  background:
    linear-gradient(90deg,rgba(2,10,20,.96),rgba(6,25,43,.94) 58%,rgba(0,117,105,.88)),
    #07111d;
  border:1px solid rgba(255,255,255,.10);
  box-shadow:0 26px 70px rgba(2,8,23,.22);
  overflow:hidden;
  position:relative;
}
.manager-os-hero::before{
  content:"";
  position:absolute;
  inset:0;
  background-image:
    linear-gradient(rgba(255,255,255,.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.045) 1px, transparent 1px);
  background-size:34px 34px;
  mask-image:linear-gradient(90deg,black,transparent 72%);
  pointer-events:none;
}
.manager-os-hero-copy,
.manager-os-pulse{position:relative;z-index:1}
.manager-os-eyebrow{
  display:inline-flex;
  align-items:center;
  gap:8px;
  min-height:34px;
  padding:0 12px;
  border-radius:999px;
  background:rgba(0,191,166,.14);
  border:1px solid rgba(94,234,212,.25);
  color:#a7fff1;
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
}
.manager-os-hero h1{
  margin:18px 0 10px;
  max-width:790px;
  color:#fff;
  font-size:42px;
  line-height:1.03;
}
.manager-os-hero p{
  margin:0;
  max-width:820px;
  color:#c9d7e8;
  font-size:15px;
  line-height:1.7;
  font-weight:650;
}
.manager-os-pulse{
  border-radius:8px;
  border:1px solid rgba(255,255,255,.16);
  background:linear-gradient(180deg,rgba(255,255,255,.13),rgba(255,255,255,.06));
  display:grid;
  place-items:center;
  text-align:center;
  padding:22px;
}
.manager-os-pulse span{
  width:118px;
  height:118px;
  border-radius:50%;
  display:grid;
  place-items:center;
  color:#fff;
  font-size:40px;
  font-weight:950;
  background:
    radial-gradient(circle at center,#092033 52%,transparent 54%),
    conic-gradient(#2dd4bf 0 74%,#f59e0b 74% 88%,rgba(255,255,255,.15) 88%);
  box-shadow:0 20px 48px rgba(45,212,191,.20);
}
.manager-os-pulse strong{color:#fff;font-size:18px;margin-top:10px}
.manager-os-pulse small{color:#b8c8da;font-weight:800}
.manager-os-strip{
  display:grid;
  grid-template-columns:repeat(6,minmax(0,1fr));
  gap:12px;
}
.manager-os-strip div,
.manager-os-card{
  border-radius:8px;
  background:linear-gradient(180deg,#ffffff,#f8fbff);
  border:1px solid #dce7f2;
  box-shadow:0 18px 45px rgba(15,23,42,.07);
}
.manager-os-strip div{
  min-height:102px;
  padding:16px;
  display:grid;
  align-content:center;
}
.manager-os-strip span,
.manager-os-card-head span{
  color:#667085;
  font-size:12px;
  font-weight:900;
  text-transform:uppercase;
}
.manager-os-strip strong{
  margin-top:5px;
  color:#0f172a;
  font-size:30px;
  line-height:1;
}
.manager-os-strip small{color:#008f7d;font-weight:900}
.manager-os-today{
  border-radius:8px;
  padding:18px;
  background:
    linear-gradient(135deg,#ffffff 0%,#f8fbff 58%,#eefdf9 100%);
  border:1px solid #d7e7ef;
  box-shadow:0 18px 45px rgba(15,23,42,.07);
}
.manager-os-today-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:14px;
  margin-bottom:14px;
}
.manager-os-today-head span,
.manager-os-today-feed > span,
.manager-os-today-pulse > span{
  color:#0d9488;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.manager-os-today-head h2{
  margin:5px 0 0;
  color:#0f172a;
  font-size:22px;
  line-height:1.12;
}
.manager-os-today-head button{
  flex:0 0 auto;
  min-height:38px;
  border:1px solid #b9eee7;
  border-radius:999px;
  background:#ecfeff;
  color:#0f766e;
  padding:0 14px;
  font-weight:950;
}
.manager-os-today-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr)) minmax(240px,.9fr);
  gap:10px;
  align-items:stretch;
}
.manager-os-today-stat,
.manager-os-today-pulse,
.manager-os-today-feed{
  min-height:126px;
  border-radius:8px;
  border:1px solid #dde8f2;
  background:#fff;
  padding:14px;
  box-shadow:0 12px 30px rgba(15,23,42,.045);
}
.manager-os-today-stat{
  display:grid;
  align-content:start;
  gap:7px;
  text-align:left;
  color:#0f172a;
}
.manager-os-today-stat span{
  color:#667085;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.manager-os-today-stat strong,
.manager-os-today-pulse strong{
  color:#0f172a;
  font-size:32px;
  line-height:1;
}
.manager-os-today-stat small,
.manager-os-today-pulse small{
  color:#667085;
  font-weight:800;
  line-height:1.45;
}
.manager-os-today-stat.good{border-color:#bbf7d0;background:#f0fdf4}
.manager-os-today-stat.warning{border-color:#fde68a;background:#fffbeb}
.manager-os-today-stat.danger{border-color:#fecaca;background:#fff1f2}
.manager-os-today-stat.idle{border-color:#dbeafe;background:#f8fbff}
.manager-os-today-stat:hover{
  transform:translateY(-1px);
  box-shadow:0 16px 34px rgba(13,148,136,.10);
}
.manager-os-today-pulse{
  display:grid;
  align-content:start;
  gap:8px;
  background:#0f172a;
  border-color:rgba(45,212,191,.24);
}
.manager-os-today-pulse strong{color:#5eead4}
.manager-os-today-pulse small{color:#cbd5e1}
.manager-os-today-feed{
  grid-column:1 / -1;
  min-height:auto;
  display:grid;
  grid-template-columns:auto repeat(5,minmax(0,1fr));
  align-items:stretch;
  gap:10px;
}
.manager-os-today-feed > span{
  align-self:center;
  min-width:112px;
}
.manager-os-today-feed button{
  min-height:58px;
  border-radius:8px;
  border:1px solid #e0e8f2;
  background:#f8fbff;
  display:grid;
  align-content:center;
  gap:3px;
  text-align:left;
  padding:10px;
}
.manager-os-today-feed button strong{
  color:#101828;
  font-size:13px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.manager-os-today-feed button small,
.manager-os-today-feed p{
  margin:0;
  color:#667085;
  font-size:12px;
  font-weight:800;
}
.manager-os-snapshot{
  display:grid;
  grid-template-columns:repeat(10,minmax(0,1fr));
  gap:8px;
}
.manager-os-snapshot div{
  min-height:72px;
  border-radius:8px;
  background:#0f172a;
  border:1px solid rgba(45,212,191,.24);
  padding:12px;
  display:grid;
  align-content:center;
}
.manager-os-snapshot span{
  color:#a7b6c8;
  font-size:11px;
  font-weight:900;
  text-transform:uppercase;
}
.manager-os-snapshot strong{
  margin-top:4px;
  color:#5eead4;
  font-size:22px;
  line-height:1;
}
.manager-os-onboarding{
  border-radius:8px;
  padding:18px;
  background:linear-gradient(135deg,#ffffff 0%,#f6fffd 64%,#eef7ff 100%);
  border:1px solid #cfe9e6;
  box-shadow:0 18px 45px rgba(15,23,42,.07);
}
.manager-os-onboarding-head{
  display:flex;
  align-items:flex-start;
  justify-content:space-between;
  gap:14px;
  margin-bottom:14px;
}
.manager-os-onboarding-head span{
  color:#0d9488;
  font-size:12px;
  font-weight:950;
  text-transform:uppercase;
}
.manager-os-onboarding-head h2{
  margin:4px 0 0;
  color:#0f172a;
  font-size:20px;
  line-height:1.14;
}
.manager-os-onboarding-head strong{
  flex:0 0 auto;
  min-width:58px;
  height:40px;
  border-radius:999px;
  display:grid;
  place-items:center;
  color:#064e3b;
  background:#ccfbf1;
  border:1px solid #99f6e4;
  font-size:14px;
}
.manager-os-onboarding-grid{
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:10px;
}
.manager-os-onboarding-grid button{
  min-height:142px;
  border-radius:8px;
  border:1px solid #dbe8ef;
  background:#fff;
  color:#0f172a;
  display:grid;
  align-content:start;
  gap:9px;
  padding:14px;
  text-align:left;
  box-shadow:0 12px 30px rgba(15,23,42,.055);
}
.manager-os-onboarding-grid button:hover{
  transform:translateY(-1px);
  border-color:#2dd4bf;
  box-shadow:0 16px 34px rgba(13,148,136,.12);
}
.manager-os-onboarding-grid button.done{
  border-color:#a7f3d0;
  background:#f0fdf4;
}
.manager-os-onboarding-grid i{
  width:max-content;
  min-width:48px;
  height:26px;
  border-radius:999px;
  display:grid;
  place-items:center;
  padding:0 9px;
  background:#eff6ff;
  color:#1478f2;
  font-size:11px;
  font-style:normal;
  font-weight:950;
  text-transform:uppercase;
}
.manager-os-onboarding-grid .done i{
  background:#dcfce7;
  color:#15803d;
}
.manager-os-onboarding-grid strong{
  color:#0f172a;
  font-size:15px;
  line-height:1.2;
}
.manager-os-onboarding-grid span{
  color:#667085;
  font-size:12px;
  font-weight:750;
  line-height:1.45;
}
.manager-os-layout{
  display:grid;
  grid-template-columns:minmax(0,1.55fr) minmax(340px,.75fr);
  gap:18px;
}
.manager-os-card{padding:18px}
.manager-os-card-head{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
  margin-bottom:16px;
}
.manager-os-card-head h2{
  margin:4px 0 0;
  color:#0f172a;
  font-size:20px;
  line-height:1.15;
}
.manager-os-card-head b{
  flex:0 0 auto;
  border-radius:999px;
  background:#ecfeff;
  color:#00796d;
  border:1px solid #c9f6ee;
  padding:7px 10px;
  font-size:11px;
  text-transform:uppercase;
}
.manager-os-module-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:10px;
}
.manager-os-module{
  min-height:56px;
  border:1px solid #dfe8f2;
  background:#f8fbff;
  border-radius:8px;
  padding:10px;
  display:grid;
  grid-template-columns:32px 22px 1fr;
  align-items:center;
  gap:8px;
  color:#162033;
  text-align:left;
}
.manager-os-module:hover{
  transform:translateY(-1px);
  border-color:#8be9dd;
  box-shadow:0 10px 26px rgba(20,120,242,.10);
}
.manager-os-module span{
  color:#94a3b8;
  font-size:11px;
  font-weight:950;
}
.manager-os-module svg{color:#0d9488}
.manager-os-module strong{
  min-width:0;
  color:#162033;
  font-size:13px;
}
.manager-os-focus-list{display:grid;gap:13px}
.manager-os-focus-list div{
  display:grid;
  grid-template-columns:1fr 112px 42px;
  gap:10px;
  align-items:center;
}
.manager-os-focus-list span{color:#344054;font-size:13px;font-weight:850}
.manager-os-focus-list i{
  height:9px;
  border-radius:999px;
  background:#edf2f7;
  overflow:hidden;
}
.manager-os-focus-list em{
  display:block;
  height:100%;
  border-radius:inherit;
  background:linear-gradient(90deg,#1478f2,#00bfa6);
}
.manager-os-focus-list strong{font-size:13px;color:#0f172a}
.manager-os-grid{
  display:grid;
  grid-template-columns:repeat(3,minmax(0,1fr));
  gap:18px;
}
.manager-os-bottom{
  display:grid;
  grid-template-columns:minmax(0,1.35fr) minmax(320px,.75fr);
  gap:18px;
}
.manager-os-table{display:grid;gap:9px}
.manager-os-table > div{
  display:grid;
  grid-template-columns:1fr auto;
  gap:3px 12px;
  align-items:center;
  min-height:58px;
  padding:11px 12px;
  border-radius:8px;
  background:#f8fbff;
  border:1px solid #e0e8f2;
}
.manager-os-table strong{color:#101828;font-size:13px}
.manager-os-table span{color:#667085;font-size:12px;font-weight:750}
.manager-os-table b{
  grid-row:1 / span 2;
  grid-column:2;
  border-radius:999px;
  background:#fff7ed;
  color:#c2410c;
  padding:6px 9px;
  font-size:11px;
  max-width:120px;
  overflow:hidden;
  text-overflow:ellipsis;
  white-space:nowrap;
}
.manager-os-platforms{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.manager-os-platforms > div{
  padding:13px;
  border-radius:8px;
  border:1px solid #e0e8f2;
  background:#f8fbff;
}
.manager-os-platforms strong{display:block;color:#0f172a;font-size:13px}
.manager-os-platforms span{display:block;color:#667085;font-size:12px;font-weight:750;margin:6px 0 10px}
.manager-os-platforms i{
  display:block;
  height:8px;
  border-radius:999px;
  background:#edf2f7;
  overflow:hidden;
}
.manager-os-platforms em{
  display:block;
  height:100%;
  border-radius:inherit;
  background:linear-gradient(90deg,#f97316,#00bfa6);
}
.manager-os-principle{
  background:linear-gradient(135deg,#fef3c7,#ffffff 58%,#e0f7f4);
  display:grid;
  align-content:center;
}
.manager-os-principle span{font-size:12px;font-weight:950;color:#b45309;text-transform:uppercase}
.manager-os-principle h2{margin:8px 0;color:#0f172a;font-size:24px;line-height:1.12}
.manager-os-principle p{margin:0;color:#475467;font-weight:750;line-height:1.65}
.manager-os-empty{
  margin:0;
  padding:18px;
  border-radius:8px;
  border:1px dashed #cbd5e1;
  background:#f8fbff;
  color:#667085;
  font-weight:750;
}
@media (max-width:1180px){
  .manager-os-hero,.manager-os-layout,.manager-os-grid,.manager-os-bottom{grid-template-columns:1fr}
  .manager-os-strip{grid-template-columns:repeat(2,minmax(0,1fr))}
  .manager-os-today-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .manager-os-today-feed{grid-column:1 / -1;grid-template-columns:1fr}
  .manager-os-snapshot{grid-template-columns:repeat(5,minmax(0,1fr))}
  .manager-os-onboarding-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
  .manager-os-module-grid,.manager-os-platforms{grid-template-columns:repeat(2,minmax(0,1fr))}
}
@media (max-width:680px){
  .manager-os-hero{padding:20px}
  .manager-os-hero h1{font-size:30px}
  .manager-os-strip,.manager-os-module-grid,.manager-os-platforms{grid-template-columns:1fr}
  .manager-os-today-head{display:grid}
  .manager-os-today-grid{grid-template-columns:1fr}
  .manager-os-snapshot{grid-template-columns:repeat(2,minmax(0,1fr))}
  .manager-os-onboarding-grid{grid-template-columns:1fr}
  .manager-os-onboarding-head{display:grid}
  .manager-os-focus-list div{grid-template-columns:1fr 72px 38px}
}

/* === Campaigns Safe Redesign v6.1: does not break old functions === */
.campaigns-safe-page{
  gap:22px !important;
}
.campaign-safe-hero{
  display:flex;align-items:flex-end;justify-content:space-between;gap:22px;
  padding:28px;border-radius:30px;
  background:
    radial-gradient(circle at 88% 12%, rgba(22,144,245,.18), transparent 30%),
    radial-gradient(circle at 12% 18%, rgba(48,213,200,.15), transparent 28%),
    linear-gradient(135deg,#ffffff 0%,#f5f9ff 100%);
  border:1px solid #dce7f5;box-shadow:0 26px 60px rgba(15,23,42,.10);
  color:#0f172a !important;
}
.campaign-safe-hero *{color:inherit}
.campaign-safe-eyebrow{display:inline-flex;align-items:center;gap:8px;font-weight:900;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#0b63f6!important;background:#eaf4ff;border:1px solid #cfe7ff;border-radius:999px;padding:8px 12px;margin-bottom:12px}
.campaign-safe-hero h2{font-size:36px;line-height:1;margin:0 0 10px;color:#0f172a!important;letter-spacing:-.03em}
.campaign-safe-hero p{margin:0;color:#64748b!important;max-width:760px;font-weight:600}
.campaign-safe-hero-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end}
.campaign-safe-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.campaign-safe-stat{padding:22px;border-radius:26px;background:linear-gradient(180deg,#fff,#f8fbff);border:1px solid #e1eaf6;box-shadow:0 18px 46px rgba(15,23,42,.08);position:relative;overflow:hidden;color:#0f172a!important}
.campaign-safe-stat:after{content:"";position:absolute;right:-24px;top:-24px;width:94px;height:94px;border-radius:50%;background:rgba(22,144,245,.10)}
.campaign-safe-stat span{display:block;color:#64748b!important;font-size:13px;font-weight:900;margin-bottom:8px}
.campaign-safe-stat strong{display:block;color:#0f172a!important;font-size:30px;letter-spacing:-.03em}
.campaign-safe-stat small{display:block;color:#64748b!important;font-weight:700;margin-top:4px}
.campaign-safe-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(320px,.75fr);gap:18px;align-items:start}
.campaign-safe-card,.campaign-safe-side-card{background:linear-gradient(180deg,#ffffff 0%,#f8fbff 100%)!important;border:1px solid #e1eaf6!important;border-radius:28px!important;box-shadow:0 18px 46px rgba(15,23,42,.08)!important;color:#0f172a!important}
.campaign-safe-card .section-title-row h2,.campaign-safe-card h2,.campaign-safe-card h3,.campaign-safe-side-card h3{color:#0f172a!important}
.campaign-safe-card .section-title-row p,.campaign-safe-side-card p{color:#64748b!important}
.campaign-safe-form{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:14px!important}
.campaign-safe-form label{background:#f8fbff!important;border:1px solid #e2e8f0!important;border-radius:18px!important;padding:12px!important;color:#0f172a!important;display:grid!important;gap:8px!important}
.campaign-safe-form label span{color:#475569!important;font-weight:800!important;font-size:12px!important;letter-spacing:.02em}
.campaign-safe-form input,.campaign-safe-form select,.campaign-safe-form textarea{width:100%!important;background:#fff!important;border:1px solid #d8e3f1!important;border-radius:14px!important;padding:12px 13px!important;color:#0f172a!important;-webkit-text-fill-color:#0f172a!important;min-height:44px!important}
.campaign-safe-form input::placeholder{color:#94a3b8!important;-webkit-text-fill-color:#94a3b8!important}
.campaign-safe-full{grid-column:span 2}
.campaign-safe-submit-row{grid-column:1 / -1;display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:flex-end;padding-top:4px}
.campaign-safe-side{display:grid;gap:16px}
.campaign-safe-side-card{padding:22px}
.campaign-safe-side-card.note{background:linear-gradient(135deg,#06182c,#0e4778)!important;color:#fff!important;border-color:rgba(255,255,255,.12)!important}
.campaign-safe-side-card.note h3{color:#fff!important}.campaign-safe-side-card.note p{color:rgba(226,232,240,.88)!important}
.campaign-safe-platform{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid #e2e8f0;color:#0f172a!important}
.campaign-safe-platform:last-child{border-bottom:0}.campaign-safe-platform strong{display:block;color:#0f172a!important}.campaign-safe-platform small{display:block;color:#64748b!important;margin-top:2px}.campaign-safe-platform span{font-weight:900;color:#0b63f6!important}
.campaign-safe-table table{width:100%;border-collapse:separate!important;border-spacing:0 8px!important}
.campaign-safe-table thead th{background:#eef5ff!important;color:#334155!important;font-weight:900!important;padding:13px 14px!important;border:0!important}
.campaign-safe-table tbody tr{background:#fff!important;box-shadow:0 10px 24px rgba(15,23,42,.05)}
.campaign-safe-table tbody td{background:#fff!important;color:#0f172a!important;padding:14px!important;border-top:1px solid #e9eef6!important;border-bottom:1px solid #e9eef6!important;vertical-align:middle!important}
.campaign-safe-table tbody td:first-child{border-left:1px solid #e9eef6!important;border-radius:16px 0 0 16px}.campaign-safe-table tbody td:last-child{border-right:1px solid #e9eef6!important;border-radius:0 16px 16px 0}
.campaign-safe-table-sub{display:block;color:#94a3b8!important;font-weight:700;margin-top:3px}
.campaigns-safe-page .btn.primary{background:linear-gradient(135deg,#1690F5,#0B63F6)!important;color:#fff!important;border:0!important;box-shadow:0 14px 30px rgba(22,144,245,.24)!important}
.campaigns-safe-page .btn.secondary{background:#fff!important;color:#0f172a!important;border:1px solid #d8e3f1!important}
.campaigns-safe-page .btn.tiny{min-height:32px!important;padding:8px 10px!important;border-radius:12px!important;font-size:12px!important;font-weight:800!important}
.campaigns-safe-page .empty-cell,.campaigns-safe-page .empty-block{background:#f8fbff!important;color:#64748b!important;border:1px dashed #cbd5e1!important;border-radius:16px!important;padding:18px!important;text-align:center!important}
@media (max-width:1180px){.campaign-safe-layout,.campaign-safe-stats{grid-template-columns:1fr}.campaign-safe-form{grid-template-columns:1fr!important}.campaign-safe-full{grid-column:auto}.campaign-safe-hero{align-items:flex-start;flex-direction:column}.campaign-safe-hero-actions{justify-content:flex-start}}


/* === Yaviz Premium Redesign v7.0 — 2026 Command UI polish === */
:root{
  --blue:#1690F5;
  --blue-strong:#0676D8;
  --blue-soft:#E9F5FF;
  --bg:#F3F7FC;
  --panel:rgba(255,255,255,.88);
  --panel-strong:#FFFFFF;
  --panel-soft:#F7FAFE;
  --soft:#F6FAFF;
  --text:#0B1220;
  --text-soft:#1F2A3D;
  --muted:#66758A;
  --line:rgba(113,132,157,.18);
  --line-strong:rgba(22,144,245,.18);
  --shadow-soft:0 18px 45px rgba(15,23,42,.07);
  --shadow-card:0 28px 80px rgba(15,23,42,.10);
  --shadow-float:0 32px 90px rgba(11,18,32,.18);
  --ring:0 0 0 4px rgba(22,144,245,.16);
}
:root[data-theme='dark']{
  --blue:#54B4FF;
  --blue-strong:#1690F5;
  --blue-soft:rgba(84,180,255,.12);
  --bg:#050914;
  --panel:rgba(12,20,35,.82);
  --panel-strong:#0B1424;
  --panel-soft:rgba(17,28,48,.86);
  --soft:#101A2E;
  --text:#F6FAFF;
  --text-soft:#D9E6F8;
  --muted:#8FA3BE;
  --line:rgba(165,191,224,.13);
  --line-strong:rgba(84,180,255,.22);
}
html,body,#root{
  min-height:100%;
  background:
    radial-gradient(circle at 8% 8%, rgba(22,144,245,.18), transparent 30%),
    radial-gradient(circle at 90% 6%, rgba(80,200,255,.13), transparent 28%),
    radial-gradient(circle at 50% 98%, rgba(22,144,245,.09), transparent 34%),
    var(--bg) !important;
}
body::before{
  content:"";
  position:fixed;
  inset:0;
  pointer-events:none;
  z-index:0;
  background-image:
    linear-gradient(rgba(22,144,245,.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(22,144,245,.035) 1px, transparent 1px);
  background-size:42px 42px;
  mask-image:linear-gradient(180deg, rgba(0,0,0,.65), transparent 78%);
}
#root{position:relative;z-index:1}
.app-shell{
  grid-template-columns:304px minmax(0,1fr) !important;
  gap:0 !important;
  background:transparent !important;
}
.sidebar{
  position:sticky !important;
  top:0 !important;
  height:100vh !important;
  background:
    radial-gradient(circle at 22% 0%, rgba(22,144,245,.22), transparent 34%),
    linear-gradient(180deg,#07111F 0%,#081423 44%,#06101D 100%) !important;
  border-right:1px solid rgba(255,255,255,.09) !important;
  box-shadow:18px 0 60px rgba(5,12,24,.18) !important;
  padding:20px 16px !important;
  overflow:auto !important;
  scrollbar-width:thin;
}
.sidebar::before{
  display:block !important;
  content:"";
  position:absolute;
  inset:0;
  background:
    linear-gradient(180deg, rgba(255,255,255,.07), transparent 20%),
    radial-gradient(circle at 85% 20%, rgba(22,144,245,.24), transparent 26%);
  pointer-events:none;
  opacity:.9;
}
.brand-block,
.sidebar-workspace-card,
.sidebar-role-switcher,
.sidebar-search,
.menu-section-list,
.sidebar-help-card,
.logout-btn{
  position:relative;
  z-index:2;
}
.brand-block{
  padding:12px 10px 18px !important;
  border-bottom:1px solid rgba(255,255,255,.08) !important;
}
.brand-mark{
  width:54px !important;
  height:54px !important;
  border-radius:20px !important;
  background:linear-gradient(135deg,#FFFFFF,#EAF5FF) !important;
  box-shadow:0 18px 42px rgba(22,144,245,.24), inset 0 1px 0 rgba(255,255,255,.8) !important;
}
.brand-name{color:#FFFFFF !important;letter-spacing:-.04em !important}
.brand-desc{color:rgba(235,245,255,.66) !important}
.sidebar-workspace-card,
.sidebar-help-card{
  background:linear-gradient(145deg, rgba(255,255,255,.10), rgba(255,255,255,.045)) !important;
  border:1px solid rgba(255,255,255,.12) !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.10), 0 18px 40px rgba(0,0,0,.18) !important;
  backdrop-filter:blur(16px) !important;
}
.sidebar-workspace-card span,
.sidebar-help-card span{color:rgba(235,245,255,.58) !important}
.sidebar-workspace-card strong,
.sidebar-help-card strong{color:#FFFFFF !important}
.sidebar-workspace-card small,
.sidebar-help-card small{color:rgba(235,245,255,.68) !important}
.sidebar-workspace-card small i{background:#22C55E !important;box-shadow:0 0 0 6px rgba(34,197,94,.12),0 0 22px rgba(34,197,94,.48) !important}
.sidebar-role-pill{
  background:rgba(255,255,255,.055) !important;
  border:1px solid rgba(255,255,255,.08) !important;
  color:rgba(240,248,255,.78) !important;
  box-shadow:none !important;
}
.sidebar-role-pill strong{color:#F8FBFF !important}
.sidebar-role-pill span{color:rgba(235,245,255,.58) !important}
.sidebar-role-pill.active{
  background:linear-gradient(135deg,rgba(22,144,245,.25),rgba(22,144,245,.10)) !important;
  border-color:rgba(84,180,255,.42) !important;
  box-shadow:0 14px 32px rgba(22,144,245,.18) !important;
}
.sidebar-search{
  background:rgba(255,255,255,.08) !important;
  border:1px solid rgba(255,255,255,.12) !important;
  color:#DCEEFF !important;
}
.sidebar-search input{color:#F8FBFF !important;-webkit-text-fill-color:#F8FBFF !important}
.sidebar-search input::placeholder{color:rgba(235,245,255,.48) !important;-webkit-text-fill-color:rgba(235,245,255,.48) !important}
.menu-group-toggle{
  color:rgba(235,245,255,.64) !important;
  font-size:11px !important;
  letter-spacing:.12em !important;
}
.menu-btn{
  min-height:58px !important;
  background:transparent !important;
  border:1px solid transparent !important;
  color:rgba(244,250,255,.82) !important;
  border-radius:20px !important;
  padding:11px 12px !important;
}
.menu-btn .menu-text>span{color:rgba(249,252,255,.92) !important;font-weight:850 !important}
.menu-btn .menu-text small{color:rgba(235,245,255,.50) !important}
.menu-btn:hover{
  background:rgba(255,255,255,.075) !important;
  border-color:rgba(255,255,255,.10) !important;
  transform:translateX(3px) !important;
}
.menu-btn.active{
  background:linear-gradient(135deg,#1690F5,#066ED0) !important;
  border-color:rgba(255,255,255,.20) !important;
  box-shadow:0 16px 38px rgba(22,144,245,.32) !important;
  color:#FFFFFF !important;
}
.menu-btn.active .menu-text small{color:rgba(255,255,255,.74) !important}
.menu-btn.active .menu-icon-wrap{
  background:rgba(255,255,255,.18) !important;
  color:#FFFFFF !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.18) !important;
}
.menu-active-dot{background:#FFFFFF !important;box-shadow:0 0 0 5px rgba(255,255,255,.14) !important}
.sidebar-help-card a{
  background:#FFFFFF !important;
  color:#0676D8 !important;
  box-shadow:0 12px 28px rgba(255,255,255,.14) !important;
}
.logout-btn{
  background:rgba(255,255,255,.08) !important;
  border:1px solid rgba(255,255,255,.12) !important;
  color:#F8FBFF !important;
}
.main-area{
  padding:24px 26px 34px !important;
  min-width:0 !important;
}
.topbar{
  position:sticky !important;
  top:18px !important;
  z-index:20 !important;
  background:linear-gradient(145deg,rgba(255,255,255,.88),rgba(246,251,255,.74)) !important;
  border:1px solid rgba(255,255,255,.72) !important;
  box-shadow:0 22px 70px rgba(15,23,42,.10), inset 0 1px 0 rgba(255,255,255,.70) !important;
  backdrop-filter:blur(22px) saturate(160%) !important;
  border-radius:32px !important;
}
:root[data-theme='dark'] .topbar{
  background:linear-gradient(145deg,rgba(12,20,35,.88),rgba(10,17,30,.72)) !important;
  border-color:rgba(255,255,255,.10) !important;
  box-shadow:0 24px 70px rgba(0,0,0,.40), inset 0 1px 0 rgba(255,255,255,.08) !important;
}
.topbar::after{
  background:linear-gradient(90deg,transparent,#1690F5,transparent) !important;
  opacity:.75 !important;
}
.small-label,.section-label{
  color:#1690F5 !important;
  font-weight:950 !important;
  letter-spacing:.14em !important;
}
.topbar h1{
  font-size:clamp(24px,3vw,42px) !important;
  line-height:1.02 !important;
  letter-spacing:-.055em !important;
  color:var(--text) !important;
}
.page-title-badge,
.menu-icon-wrap,
.mobile-nav-icon{
  border-radius:16px !important;
  box-shadow:0 12px 28px rgba(22,144,245,.14) !important;
}
.global-search,
.theme-toggle,
.notif-pill,
.user-chip{
  min-height:48px !important;
  background:rgba(255,255,255,.70) !important;
  border:1px solid rgba(113,132,157,.18) !important;
  box-shadow:0 10px 28px rgba(15,23,42,.055) !important;
  backdrop-filter:blur(12px) !important;
}
:root[data-theme='dark'] .global-search,
:root[data-theme='dark'] .theme-toggle,
:root[data-theme='dark'] .notif-pill,
:root[data-theme='dark'] .user-chip{
  background:rgba(17,28,48,.78) !important;
  border-color:rgba(255,255,255,.10) !important;
}
.page-layer{
  margin-top:24px !important;
  gap:24px !important;
}
.card,
.stat-card,
.hero-shell,
.table-wrap,
.permission-box,
.permission-item,
.modal-card,
.drawer-panel,
.notif-card,
.mobile-record-card,
.settings-ops-card{
  background:linear-gradient(180deg,rgba(255,255,255,.94),rgba(250,253,255,.84)) !important;
  border:1px solid rgba(255,255,255,.74) !important;
  box-shadow:0 22px 64px rgba(15,23,42,.08), inset 0 1px 0 rgba(255,255,255,.72) !important;
  backdrop-filter:blur(18px) saturate(140%) !important;
}
:root[data-theme='dark'] .card,
:root[data-theme='dark'] .stat-card,
:root[data-theme='dark'] .hero-shell,
:root[data-theme='dark'] .table-wrap,
:root[data-theme='dark'] .permission-box,
:root[data-theme='dark'] .permission-item,
:root[data-theme='dark'] .modal-card,
:root[data-theme='dark'] .drawer-panel,
:root[data-theme='dark'] .notif-card,
:root[data-theme='dark'] .mobile-record-card,
:root[data-theme='dark'] .settings-ops-card{
  background:linear-gradient(180deg,rgba(12,20,35,.88),rgba(10,17,30,.78)) !important;
  border-color:rgba(255,255,255,.10) !important;
  box-shadow:0 24px 70px rgba(0,0,0,.34), inset 0 1px 0 rgba(255,255,255,.07) !important;
}
.card:hover,
.stat-card:hover{
  transform:translateY(-4px) !important;
  border-color:rgba(22,144,245,.28) !important;
  box-shadow:0 34px 90px rgba(15,23,42,.12) !important;
}
.stat-card{
  min-height:154px !important;
  border-radius:28px !important;
  overflow:hidden !important;
}
.stat-card::before{
  content:"";
  position:absolute;
  inset:auto -34px -52px auto;
  width:132px;
  height:132px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(22,144,245,.18),transparent 68%);
  pointer-events:none;
}
.stat-card-title{color:#66758A !important;font-weight:950 !important}
.stat-card-value{
  color:#0B1220 !important;
  letter-spacing:-.07em !important;
  font-size:clamp(30px,3vw,44px) !important;
}
:root[data-theme='dark'] .stat-card-value{color:#F6FAFF !important}
.stat-card-info .stat-card-value,
.stat-card-success .stat-card-value{color:#1690F5 !important}
.btn{
  min-height:44px !important;
  border-radius:16px !important;
  font-weight:900 !important;
  letter-spacing:-.01em !important;
}
.btn.primary{
  background:linear-gradient(135deg,#1690F5,#066ED0) !important;
  color:#FFFFFF !important;
  box-shadow:0 16px 36px rgba(22,144,245,.26) !important;
}
.btn.primary:hover{box-shadow:0 22px 48px rgba(22,144,245,.34) !important}
.btn.secondary,.btn.ghost{
  background:rgba(255,255,255,.72) !important;
  border:1px solid rgba(113,132,157,.20) !important;
  color:var(--text) !important;
}
.card input,
.card select,
.card textarea,
.modal-card input,
.modal-card select,
.modal-card textarea{
  background:rgba(247,250,254,.92) !important;
  border:1px solid rgba(113,132,157,.20) !important;
  border-radius:16px !important;
  min-height:46px !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.56) !important;
}
.card input:focus,
.card select:focus,
.card textarea:focus,
.modal-card input:focus,
.modal-card select:focus,
.modal-card textarea:focus{
  border-color:rgba(22,144,245,.46) !important;
  box-shadow:var(--ring), inset 0 1px 0 rgba(255,255,255,.56) !important;
}
.table-wrap{
  border-radius:24px !important;
  overflow:auto !important;
}
thead th{
  background:linear-gradient(180deg,#F1F7FF,#EAF4FF) !important;
  color:#314158 !important;
  font-size:12px !important;
  letter-spacing:.07em !important;
  text-transform:uppercase !important;
}
tbody tr{transition:transform .18s ease,box-shadow .18s ease,background .18s ease}
tbody tr:hover{
  transform:translateY(-1px) !important;
  box-shadow:0 12px 28px rgba(15,23,42,.06) !important;
}
tbody td{border-color:rgba(113,132,157,.13) !important}
.hero-shell,
.manager-os-hero,
.command-hero,
.campaign-safe-hero{
  position:relative !important;
  overflow:hidden !important;
  border-radius:34px !important;
}
.hero-shell::before,
.manager-os-hero::before,
.command-hero::before,
.campaign-safe-hero::before{
  content:"";
  position:absolute;
  inset:-30% -20% auto auto;
  width:360px;
  height:360px;
  border-radius:50%;
  background:radial-gradient(circle,rgba(22,144,245,.22),transparent 66%);
  pointer-events:none;
}
.mobile-bottom-nav{
  background:rgba(255,255,255,.86) !important;
  border:1px solid rgba(255,255,255,.78) !important;
  box-shadow:0 -18px 50px rgba(15,23,42,.10) !important;
  backdrop-filter:blur(22px) saturate(150%) !important;
}
.mobile-nav-item.active{
  background:linear-gradient(135deg,rgba(22,144,245,.16),rgba(22,144,245,.06)) !important;
  color:#0676D8 !important;
}
@media (max-width:1180px){
  .app-shell{grid-template-columns:1fr !important}
  .sidebar{display:none !important}
  .main-area{padding:16px 14px 96px !important}
  .topbar{top:10px !important;border-radius:24px !important;padding:16px !important}
  .topbar-right{width:100% !important;justify-content:flex-start !important}
  .global-search{flex:1 1 230px !important}
}
@media (max-width:720px){
  body::before{background-size:30px 30px}
  .topbar h1{font-size:24px !important}
  .topbar-main{width:100% !important}
  .global-search{order:4;flex-basis:100% !important}
  .user-chip span{display:none !important}
  .card,.stat-card,.hero-shell{border-radius:22px !important}
  .mobile-bottom-nav{left:10px !important;right:10px !important;bottom:10px !important;border-radius:24px !important;padding:8px !important}
  .mobile-nav-item span:last-child{font-size:10px !important}
}


/* V8 NEXT LEVEL OPERATING SYSTEM */
.v8-command-center,
.v8-rhythm-panel,
.v8-campaign-panel{
  border-radius:34px;
  padding:24px;
  background:
    radial-gradient(circle at 0% 0%,rgba(22,144,245,.18),transparent 35%),
    linear-gradient(135deg,rgba(255,255,255,.92),rgba(239,247,255,.78));
  border:1px solid rgba(255,255,255,.80);
  box-shadow:0 24px 70px rgba(12,32,66,.12);
  position:relative;
  overflow:hidden;
}
.v8-command-center::after,
.v8-rhythm-panel::after,
.v8-campaign-panel::after{
  content:"";
  position:absolute;
  width:300px;
  height:300px;
  right:-130px;
  top:-160px;
  border-radius:999px;
  background:radial-gradient(circle,rgba(22,144,245,.20),transparent 70%);
  pointer-events:none;
}
.v8-command-head,.v8-rhythm-head,.v8-campaign-head{
  position:relative;
  z-index:1;
  display:flex;
  justify-content:space-between;
  gap:18px;
  align-items:flex-start;
  margin-bottom:18px;
}
.v8-command-head span,.v8-rhythm-head span,.v8-campaign-head span,
.v8-ai-card>span,.v8-campaign-best span{
  display:inline-flex;
  align-items:center;
  color:#1690F5;
  font-weight:950;
  letter-spacing:.08em;
  text-transform:uppercase;
  font-size:11px;
}
.v8-command-head h2,.v8-rhythm-head h2,.v8-campaign-head h2{
  margin:6px 0;
  font-size:clamp(24px,3vw,38px);
  letter-spacing:-.055em;
  color:#08111F;
}
.v8-command-head p,.v8-rhythm-head p,.v8-campaign-head p{
  margin:0;
  max-width:760px;
  color:#66758A;
  font-weight:700;
  line-height:1.55;
}
.v8-mission-grid,.v8-rhythm-stats,.v8-campaign-stats{
  position:relative;
  z-index:1;
  display:grid;
  grid-template-columns:repeat(4,minmax(0,1fr));
  gap:14px;
}
.v8-mission-card,.v8-rhythm-stats>div,.v8-campaign-stats>div{
  border:0;
  text-align:left;
  border-radius:24px;
  padding:18px;
  background:rgba(255,255,255,.78);
  border:1px solid rgba(255,255,255,.86);
  box-shadow:0 16px 42px rgba(15,23,42,.08);
  transition:transform .18s ease,box-shadow .18s ease;
}
.v8-mission-card:hover{transform:translateY(-3px);box-shadow:0 22px 54px rgba(22,144,245,.15)}
.v8-mission-card span,.v8-rhythm-stats span,.v8-campaign-stats span{display:block;color:#66758A;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.06em}
.v8-mission-card strong,.v8-rhythm-stats strong,.v8-campaign-stats strong{display:block;color:#0B1220;font-size:32px;font-weight:1000;letter-spacing:-.06em;margin-top:8px}
.v8-mission-card small,.v8-rhythm-stats small,.v8-campaign-stats small{display:block;color:#7A8798;font-weight:800;margin-top:4px}
.v8-mission-card.success,.v8-rhythm-stats .success,.v8-campaign-stats .success{box-shadow:inset 0 0 0 1px rgba(31,184,118,.18),0 16px 42px rgba(31,184,118,.10)}
.v8-mission-card.warning{box-shadow:inset 0 0 0 1px rgba(245,158,11,.22),0 16px 42px rgba(245,158,11,.10)}
.v8-mission-card.danger,.v8-rhythm-stats .danger,.v8-campaign-stats .danger{box-shadow:inset 0 0 0 1px rgba(239,68,68,.22),0 16px 42px rgba(239,68,68,.10)}
.v8-mission-card.idle{opacity:.88}
.v8-command-layout,.v8-campaign-layout{
  position:relative;
  z-index:1;
  display:grid;
  grid-template-columns:1fr 1.1fr;
  gap:16px;
  margin-top:16px;
}
.v8-ai-card,.v8-live-feed,.v8-branch-scoreboard{
  border-radius:26px;
  padding:20px;
  background:linear-gradient(180deg,rgba(255,255,255,.86),rgba(255,255,255,.66));
  border:1px solid rgba(255,255,255,.82);
  box-shadow:0 18px 48px rgba(15,23,42,.08);
}
.v8-ai-card h3{margin:10px 0 8px;color:#08111F;font-size:26px;letter-spacing:-.04em}
.v8-ai-card p{margin:0;color:#516173;font-weight:800;line-height:1.55}
.v8-ai-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.v8-ai-actions button,.v8-campaign-actions button{
  border:0;
  border-radius:14px;
  background:rgba(22,144,245,.10);
  color:#0575D8;
  font-weight:950;
  padding:10px 12px;
  cursor:pointer;
}
.v8-feed-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.v8-feed-head strong,.v8-branch-scoreboard>strong{font-size:16px;color:#08111F}
.v8-feed-head span{font-size:12px;font-weight:900;color:#1690F5}
.v8-live-feed>button{
  width:100%;
  border:0;
  display:flex;
  gap:12px;
  align-items:center;
  padding:12px;
  margin-top:8px;
  border-radius:18px;
  background:#F7FBFF;
  text-align:left;
  cursor:pointer;
}
.v8-live-feed i{
  width:30px;height:30px;border-radius:12px;background:#1690F5;color:white;display:grid;place-items:center;font-style:normal;font-weight:1000;
}
.v8-live-feed strong,.v8-live-feed span{display:block}
.v8-live-feed span{color:#66758A;font-size:12px;font-weight:800}
.v8-rhythm-score,.v8-campaign-best{
  min-width:180px;
  border-radius:26px;
  padding:18px;
  background:#0B1220;
  color:white;
  box-shadow:0 18px 48px rgba(15,23,42,.22);
}
.v8-rhythm-score strong,.v8-campaign-best strong{display:block;color:white;font-size:34px;line-height:1;font-weight:1000;letter-spacing:-.06em;margin:8px 0}
.v8-rhythm-score span,.v8-campaign-best small{color:rgba(255,255,255,.70);font-weight:850}
.v8-rhythm-grid{
  position:relative;
  z-index:1;
  display:grid;
  grid-template-columns:repeat(7,minmax(0,1fr));
  gap:8px;
  margin-top:16px;
}
.v8-rhythm-cell{
  min-height:70px;
  border:0;
  border-radius:18px;
  position:relative;
  overflow:hidden;
  text-align:left;
  padding:10px;
  background:rgba(255,255,255,.70);
  border:1px solid rgba(255,255,255,.86);
  cursor:pointer;
}
.v8-rhythm-cell::before{
  content:"";
  position:absolute;
  left:0;right:0;bottom:0;
  height:var(--load);
  background:linear-gradient(180deg,rgba(22,144,245,.04),rgba(22,144,245,.22));
  pointer-events:none;
}
.v8-rhythm-cell span,.v8-rhythm-cell strong,.v8-rhythm-cell i{position:relative;z-index:1}
.v8-rhythm-cell span{display:block;font-weight:1000;color:#66758A}
.v8-rhythm-cell strong{display:block;font-size:22px;color:#08111F;margin-top:8px}
.v8-rhythm-cell i{position:absolute;right:8px;top:8px;width:22px;height:22px;border-radius:9px;background:#1690F5;color:white;display:grid;place-items:center;font-style:normal;font-size:11px;font-weight:1000}
.v8-rhythm-cell.risk{box-shadow:inset 0 0 0 2px rgba(239,68,68,.28)}
.v8-rhythm-cell.today{box-shadow:inset 0 0 0 2px rgba(22,144,245,.42),0 14px 32px rgba(22,144,245,.12)}
.v8-rhythm-suggestion{
  position:relative;
  z-index:1;
  margin-top:14px;
  padding:16px;
  border-radius:20px;
  background:#0B1220;
  color:white;
  display:flex;
  gap:12px;
  align-items:center;
  justify-content:space-between;
}
.v8-rhythm-suggestion strong{font-size:15px;color:white}
.v8-rhythm-suggestion span{color:rgba(255,255,255,.76);font-weight:800}
.v8-campaign-layout{grid-template-columns:1.5fr .8fr}
.v8-campaign-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.v8-campaign-row{
  border-radius:24px;
  padding:16px;
  background:rgba(255,255,255,.82);
  border:1px solid rgba(255,255,255,.86);
  box-shadow:0 16px 42px rgba(15,23,42,.08);
}
.v8-campaign-row.success{box-shadow:inset 0 0 0 1px rgba(31,184,118,.18),0 16px 42px rgba(31,184,118,.10)}
.v8-campaign-row.warning{box-shadow:inset 0 0 0 1px rgba(245,158,11,.22),0 16px 42px rgba(245,158,11,.10)}
.v8-campaign-row.danger{box-shadow:inset 0 0 0 1px rgba(239,68,68,.24),0 16px 42px rgba(239,68,68,.10)}
.v8-campaign-row-main span{display:block;font-size:11px;letter-spacing:.08em;text-transform:uppercase;font-weight:1000;color:#1690F5}
.v8-campaign-row-main strong{display:block;margin-top:5px;font-size:17px;color:#08111F;line-height:1.18}
.v8-campaign-row-main small{display:block;margin-top:5px;color:#66758A;font-weight:800}
.v8-campaign-meter{height:8px;background:#E7EEF7;border-radius:999px;overflow:hidden;margin:12px 0}
.v8-campaign-meter i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#1690F5,#41D2FF)}
.v8-campaign-row p{margin:0;color:#526173;font-size:13px;font-weight:800;line-height:1.45}
.v8-campaign-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.v8-campaign-actions button{font-size:12px;padding:8px 10px}
.v8-branch-scoreboard{align-self:start}
.v8-branch-scoreboard>div{
  display:grid;
  grid-template-columns:1fr auto;
  gap:4px 10px;
  padding:12px 0;
  border-bottom:1px solid rgba(113,132,157,.14);
}
.v8-branch-scoreboard span{font-weight:950;color:#0B1220}
.v8-branch-scoreboard b{color:#1690F5}
.v8-branch-scoreboard small{grid-column:1 / -1;color:#66758A;font-weight:800}
:root[data-theme='dark'] .v8-command-center,
:root[data-theme='dark'] .v8-rhythm-panel,
:root[data-theme='dark'] .v8-campaign-panel{
  background:radial-gradient(circle at 0% 0%,rgba(22,144,245,.20),transparent 35%),linear-gradient(135deg,rgba(15,23,42,.94),rgba(7,13,23,.88));
  border-color:rgba(255,255,255,.10);
}
:root[data-theme='dark'] .v8-command-head h2,
:root[data-theme='dark'] .v8-rhythm-head h2,
:root[data-theme='dark'] .v8-campaign-head h2,
:root[data-theme='dark'] .v8-mission-card strong,
:root[data-theme='dark'] .v8-rhythm-stats strong,
:root[data-theme='dark'] .v8-campaign-stats strong,
:root[data-theme='dark'] .v8-ai-card h3,
:root[data-theme='dark'] .v8-campaign-row-main strong,
:root[data-theme='dark'] .v8-rhythm-cell strong,
:root[data-theme='dark'] .v8-branch-scoreboard span{color:#F7FAFF}
:root[data-theme='dark'] .v8-mission-card,
:root[data-theme='dark'] .v8-rhythm-stats>div,
:root[data-theme='dark'] .v8-campaign-stats>div,
:root[data-theme='dark'] .v8-ai-card,
:root[data-theme='dark'] .v8-live-feed,
:root[data-theme='dark'] .v8-campaign-row,
:root[data-theme='dark'] .v8-branch-scoreboard,
:root[data-theme='dark'] .v8-rhythm-cell{
  background:rgba(15,23,42,.72);
  border-color:rgba(255,255,255,.10);
}
:root[data-theme='dark'] .v8-live-feed>button{background:rgba(255,255,255,.06)}
@media(max-width:1100px){
  .v8-mission-grid,.v8-rhythm-stats,.v8-campaign-stats{grid-template-columns:repeat(2,minmax(0,1fr))}
  .v8-command-layout,.v8-campaign-layout{grid-template-columns:1fr}
  .v8-campaign-list{grid-template-columns:1fr}
}
@media(max-width:720px){
  .v8-command-center,.v8-rhythm-panel,.v8-campaign-panel{padding:16px;border-radius:24px}
  .v8-command-head,.v8-rhythm-head,.v8-campaign-head{display:block}
  .v8-command-head .btn{margin-top:14px;width:100%}
  .v8-mission-grid,.v8-rhythm-stats,.v8-campaign-stats{grid-template-columns:1fr}
  .v8-rhythm-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
  .v8-rhythm-suggestion{display:block}
}


/* V9-V15 FULL OPERATING SYSTEM UPGRADE */
.v15-panel{
  position:relative;
  overflow:hidden;
  border-radius:30px;
  padding:22px;
  border:1px solid rgba(22,144,245,.16);
  background:radial-gradient(circle at 0 0,rgba(22,144,245,.14),transparent 34%),linear-gradient(135deg,rgba(255,255,255,.94),rgba(241,247,255,.82));
  box-shadow:0 24px 70px rgba(15,23,42,.09);
}
.v15-panel::after{content:"";position:absolute;inset:auto -90px -120px auto;width:230px;height:230px;background:rgba(22,144,245,.12);border-radius:50%;filter:blur(8px);pointer-events:none}
.v15-panel-head{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:18px}
.v15-panel-head span{display:inline-flex;align-items:center;gap:8px;color:#1690F5;font-size:12px;font-weight:1000;letter-spacing:.1em;text-transform:uppercase}
.v15-panel-head h2{margin:8px 0 6px;font-size:clamp(22px,3vw,34px);line-height:1.04;color:#07111f;letter-spacing:-.04em}
.v15-panel-head p{max-width:780px;margin:0;color:#5d6b7d;font-weight:750;line-height:1.55}
.v15-actions{display:flex;gap:10px;flex-wrap:wrap;justify-content:flex-end;min-width:max-content}
.v15-stat-grid{position:relative;z-index:1;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}
.v15-stat-grid>div{border:1px solid rgba(22,144,245,.12);background:rgba(255,255,255,.78);border-radius:22px;padding:15px;box-shadow:0 16px 36px rgba(15,23,42,.06)}
.v15-stat-grid span{display:block;color:#64748b;font-size:12px;font-weight:950;text-transform:uppercase;letter-spacing:.06em}
.v15-stat-grid strong{display:block;color:#0b1220;font-size:28px;letter-spacing:-.04em;margin-top:6px}
.v15-stat-grid small{color:#6b7a8e;font-weight:800}
.v15-stat-grid .danger{box-shadow:inset 0 0 0 1px rgba(239,68,68,.2),0 16px 36px rgba(239,68,68,.08)}
.v15-stat-grid .success{box-shadow:inset 0 0 0 1px rgba(34,197,94,.2),0 16px 36px rgba(34,197,94,.08)}
.v9-calendar-layout{position:relative;z-index:1;display:grid;grid-template-columns:1.45fr .78fr;gap:16px;align-items:start}
.v9-month-board{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:9px}
.v9-day{min-height:76px;border:1px solid rgba(22,144,245,.12);background:rgba(255,255,255,.78);border-radius:18px;padding:10px;text-align:left;box-shadow:0 10px 26px rgba(15,23,42,.05);cursor:pointer;transition:.18s ease}
.v9-day:hover,.v9-day.active{transform:translateY(-2px);border-color:rgba(22,144,245,.34);box-shadow:0 18px 34px rgba(22,144,245,.12)}
.v9-day span{font-weight:1000;color:#0f172a}.v9-day strong{display:block;color:#1690F5;font-size:24px;margin-top:4px}.v9-day i{display:inline-flex;margin-top:4px;border-radius:999px;padding:3px 7px;background:#e8f4ff;color:#1690F5;font-size:10px;font-style:normal;font-weight:1000}.v9-day.empty{opacity:.72}.v9-day.risk{box-shadow:inset 0 0 0 1px rgba(239,68,68,.25),0 12px 28px rgba(239,68,68,.10)}
.v9-day-detail{border:1px solid rgba(22,144,245,.14);background:rgba(255,255,255,.82);border-radius:26px;padding:18px;box-shadow:0 20px 46px rgba(15,23,42,.08)}
.v9-day-detail>span{color:#1690F5;font-size:12px;font-weight:1000;text-transform:uppercase;letter-spacing:.08em}.v9-day-detail h3{margin:6px 0;color:#07111f;font-size:24px}.v9-day-detail p{margin:0 0 14px;color:#64748b;font-weight:800}
.v9-day-list{display:grid;gap:10px}.v9-content-mini{display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center;border-radius:18px;padding:12px;background:#f8fbff;border:1px solid rgba(22,144,245,.10)}.v9-content-mini strong{display:block;color:#0f172a}.v9-content-mini span{display:block;color:#64748b;font-size:12px;font-weight:800}.v9-content-mini button,.v10-task-card button,.v12-action-list button,.v14-role-grid button{border:0;border-radius:999px;padding:7px 10px;background:#1690F5;color:white;font-weight:900;cursor:pointer}.v9-content-mini.danger{border-color:rgba(239,68,68,.25)}.v9-suggestion-box{margin-top:14px;border-radius:18px;padding:13px;background:linear-gradient(135deg,#1690F5,#42c7ff);color:white}.v9-suggestion-box strong,.v9-suggestion-box span{display:block}.v9-suggestion-box span{font-weight:800;opacity:.9}.v9-quick-meta{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}.v9-quick-meta span{border-radius:999px;padding:6px 9px;background:#edf6ff;color:#1690F5;font-weight:900;font-size:12px}
.v10-board{display:grid;grid-template-columns:repeat(5,minmax(190px,1fr));gap:12px;overflow:auto;padding-bottom:4px}.v10-column{min-height:230px;border:1px solid rgba(22,144,245,.12);background:rgba(255,255,255,.68);border-radius:22px;padding:12px}.v10-column-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.v10-column-head strong{color:#0f172a}.v10-column-head span{background:#e8f4ff;color:#1690F5;border-radius:999px;padding:4px 8px;font-weight:1000}.v10-task-card{background:white;border:1px solid rgba(22,144,245,.10);border-radius:18px;padding:12px;margin-bottom:10px;box-shadow:0 12px 26px rgba(15,23,42,.06)}.v10-task-card strong{display:block;color:#0f172a}.v10-task-card span{display:block;color:#64748b;font-size:12px;font-weight:800;margin:4px 0 8px}.v10-task-card div{display:flex;gap:6px;flex-wrap:wrap}.v10-task-card button{font-size:11px;padding:6px 8px;background:#edf6ff;color:#1690F5}.v10-task-card.priority-high{box-shadow:inset 0 0 0 1px rgba(239,68,68,.22),0 12px 26px rgba(239,68,68,.08)}.v10-quick-row{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}.v10-quick-row button{border:1px solid rgba(22,144,245,.14);background:white;border-radius:999px;padding:10px 13px;color:#0f172a;font-weight:900;cursor:pointer}
.v11-workflows{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.v11-workflows>div{border-radius:22px;padding:16px;background:white;border:1px solid rgba(22,144,245,.12);box-shadow:0 14px 32px rgba(15,23,42,.06)}.v11-workflows b{font-size:25px}.v11-workflows strong,.v11-workflows span{display:block}.v11-workflows strong{color:#0f172a;margin-top:8px}.v11-workflows span{color:#64748b;font-weight:800;font-size:13px}.v11-config{margin-top:12px;border-radius:20px;padding:14px;background:#fff7ed;border:1px solid rgba(245,158,11,.22);display:grid;gap:4px}.v11-config.ready{background:#ecfdf5;border-color:rgba(34,197,94,.20)}.v11-config strong{color:#0f172a}.v11-config span{color:#64748b;font-weight:800}
.v12-ai-box{max-width:420px;border-radius:22px;padding:16px;background:#061226;color:white;box-shadow:0 20px 48px rgba(6,18,38,.18)}.v12-ai-box strong,.v12-ai-box span{display:block}.v12-ai-box span{opacity:.8;font-weight:800;margin-top:6px}.v12-layout{display:grid;grid-template-columns:.8fr 1.2fr;gap:14px}.v12-ranking,.v12-action-list{border-radius:24px;padding:16px;background:rgba(255,255,255,.78);border:1px solid rgba(22,144,245,.12);box-shadow:0 16px 40px rgba(15,23,42,.06)}.v12-ranking>strong,.v12-action-list>strong{display:block;margin-bottom:10px;color:#0f172a}.v12-ranking>div{display:grid;grid-template-columns:auto 1fr auto;gap:4px 10px;align-items:center;border-bottom:1px solid rgba(100,116,139,.12);padding:10px 0}.v12-ranking b{color:#1690F5}.v12-ranking small{grid-column:2/-1;color:#64748b;font-weight:800}.v12-action-list{display:grid;gap:10px}.v12-action-list article{border-radius:18px;padding:13px;background:white;border:1px solid rgba(22,144,245,.10)}.v12-action-list article.success{border-color:rgba(34,197,94,.25)}.v12-action-list article.warning{border-color:rgba(245,158,11,.25)}.v12-action-list article.danger{border-color:rgba(239,68,68,.25)}.v12-action-list span{display:block;color:#1690F5;font-weight:1000;font-size:12px}.v12-action-list strong{display:block;color:#0f172a;margin-top:4px}.v12-action-list small{display:block;color:#64748b;font-weight:800;margin:4px 0 10px}.v12-action-list div{display:flex;gap:8px}
.v13-folder-row{display:flex;gap:10px;flex-wrap:wrap}.v13-folder-row button{min-width:170px;text-align:left;border:1px solid rgba(22,144,245,.12);background:white;border-radius:20px;padding:14px;box-shadow:0 12px 26px rgba(15,23,42,.06);cursor:pointer}.v13-folder-row strong,.v13-folder-row span{display:block}.v13-folder-row strong{color:#0f172a}.v13-folder-row span{color:#64748b;font-weight:800;margin-top:4px}
.v14-role-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.v14-role-grid article{border-radius:22px;padding:16px;background:white;border:1px solid rgba(22,144,245,.12);box-shadow:0 14px 32px rgba(15,23,42,.06)}.v14-role-grid span{display:block;color:#1690F5;font-size:12px;font-weight:1000;text-transform:uppercase}.v14-role-grid strong{display:block;color:#0f172a;font-size:22px;margin-top:5px}.v14-role-grid small{display:block;color:#64748b;font-weight:800;min-height:36px;margin:6px 0 12px}
.v15-phone-preview{display:grid;grid-template-columns:280px 1fr;gap:20px;align-items:center}.v15-phone-frame{width:240px;margin:auto;border:10px solid #061226;background:#f6fbff;border-radius:38px;padding:18px;box-shadow:0 30px 70px rgba(6,18,38,.22)}.v15-phone-top{width:70px;height:8px;background:#061226;border-radius:999px;margin:0 auto 16px}.v15-phone-frame h3{margin:0 0 12px;color:#061226}.v15-phone-card{border-radius:18px;padding:12px;margin:9px 0;background:white;border:1px solid rgba(22,144,245,.13)}.v15-phone-card strong,.v15-phone-card span{display:block}.v15-phone-card span{color:#64748b;font-weight:800}.v15-phone-nav{display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-top:18px}.v15-phone-nav i{height:26px;border-radius:999px;background:#dff2ff}.v15-pwa-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.v15-pwa-checks>div{border-radius:22px;padding:16px;background:white;border:1px solid rgba(22,144,245,.12);box-shadow:0 14px 32px rgba(15,23,42,.06)}.v15-pwa-checks strong,.v15-pwa-checks span{display:block}.v15-pwa-checks strong{color:#0f172a}.v15-pwa-checks span{color:#64748b;font-weight:800;margin-top:5px}
:root[data-theme='dark'] .v15-panel{background:radial-gradient(circle at 0 0,rgba(22,144,245,.2),transparent 35%),linear-gradient(135deg,rgba(15,23,42,.95),rgba(7,13,23,.88));border-color:rgba(255,255,255,.10)}
:root[data-theme='dark'] .v15-panel-head h2,:root[data-theme='dark'] .v15-stat-grid strong,:root[data-theme='dark'] .v9-day-detail h3,:root[data-theme='dark'] .v9-content-mini strong,:root[data-theme='dark'] .v10-column-head strong,:root[data-theme='dark'] .v10-task-card strong,:root[data-theme='dark'] .v11-workflows strong,:root[data-theme='dark'] .v11-config strong,:root[data-theme='dark'] .v12-ranking>strong,:root[data-theme='dark'] .v12-action-list>strong,:root[data-theme='dark'] .v12-ranking span,:root[data-theme='dark'] .v12-action-list strong,:root[data-theme='dark'] .v13-folder-row strong,:root[data-theme='dark'] .v14-role-grid strong{color:#f8fbff}
:root[data-theme='dark'] .v15-stat-grid>div,:root[data-theme='dark'] .v9-day,:root[data-theme='dark'] .v9-day-detail,:root[data-theme='dark'] .v9-content-mini,:root[data-theme='dark'] .v10-column,:root[data-theme='dark'] .v10-task-card,:root[data-theme='dark'] .v11-workflows>div,:root[data-theme='dark'] .v12-ranking,:root[data-theme='dark'] .v12-action-list,:root[data-theme='dark'] .v12-action-list article,:root[data-theme='dark'] .v13-folder-row button,:root[data-theme='dark'] .v14-role-grid article,:root[data-theme='dark'] .v15-pwa-checks>div{background:rgba(15,23,42,.72);border-color:rgba(255,255,255,.10)}
@media(max-width:1180px){.v9-calendar-layout,.v12-layout,.v15-phone-preview{grid-template-columns:1fr}.v10-board{grid-template-columns:repeat(5,220px)}.v11-workflows,.v14-role-grid,.v15-pwa-checks{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:720px){.v15-panel{padding:16px;border-radius:24px}.v15-panel-head{display:block}.v15-actions{justify-content:flex-start;margin-top:14px;min-width:0}.v15-stat-grid,.v11-workflows,.v14-role-grid,.v15-pwa-checks{grid-template-columns:1fr}.v9-month-board{grid-template-columns:repeat(4,minmax(0,1fr))}.v9-day{min-height:68px}.v15-phone-frame{width:210px}}


`;

export default App;
