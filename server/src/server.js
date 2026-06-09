import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import path from "path";
import http from "http";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";
import { Server as SocketIOServer } from "socket.io";
import { getClient, getDatabaseStatus, query } from "./db.js";
import { actionPermissionAllowed, authRequired, pagePermissionAllowed, rolesAllowed, signToken } from "./auth.js";
import { buildBranchOrderSql, DEFAULT_BRANCHES } from "./defaultBranches.js";
import { sendContentCalendarPdf, sendContestExpensePdf, sendExcel, sendSimplePdf, sendTravelExpensePdf } from "./exports.js";
import { isMySeOneSyncEnabled, pullBonusMirrorFromMySeOne, syncBonusDeleteToMySeOne, syncBonusUpsertToMySeOne } from "./mySeOneSync.js";
import { importDailyReportsFromImages } from "./dailyReportImport.js";

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || "dev-only-change-me";
if (!process.env.JWT_SECRET) {
  const message = "JWT_SECRET environment variable is not set.";
  if (process.env.NODE_ENV === "production") {
    throw new Error(message + " Set JWT_SECRET in production variables.");
  }
  console.warn(message + " Using a development-only fallback.");
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

function normalizeOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return raw.replace(/\/+$/, "");
  }
}

// CORS allowlist: keep production safe, but allow all known frontend domains.
// Add extra domains in Railway with ALLOWED_ORIGINS=https://domain1.uz,https://domain2.uz
const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
  process.env.VITE_CLIENT_URL,
  "https://www.aloosmm.uz",
  "https://aloosmm.uz",
  "http://localhost:5173",
  "http://localhost:3000"
]
  .concat(String(process.env.ALLOWED_ORIGINS || "").split(","))
  .map(normalizeOrigin)
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    const requestOrigin = normalizeOrigin(origin);
    // allow server-to-server / curl / same-origin requests without an Origin header
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(requestOrigin)) return callback(null, true);
    if (process.env.NODE_ENV !== "production" && requestOrigin.startsWith("http://localhost:")) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked origin: ${requestOrigin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(express.json({ limit: "25mb" }));
app.use("/uploads", express.static(uploadsDir));

app.get("/api/ping", (_, res) => {
  res.json({ ok: true, service: "aloo-smm-server" });
});

app.get("/api/db-health", async (_, res) => {
  const database = getDatabaseStatus();
  try {
    const result = await query(`SELECT NOW() AS now, current_database() AS database_name`);
    res.json({
      ok: true,
      database: {
        ...database,
        database: result.rows[0]?.database_name || database.database
      },
      timestamp: result.rows[0]?.now
    });
  } catch (err) {
    res.status(503).json({
      ok: false,
      message: err.message,
      code: err.code || null,
      database
    });
  }
});

const httpServer = http.createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: corsOptions
});

const userSockets = new Map();
const BONUS_PULL_SYNC_COOLDOWN_MS = Math.max(5000, Number(process.env.MYSEONE_PULL_SYNC_COOLDOWN_MS || 20000));
const MYSEONE_FROZEN_MONTHS = new Set(["2026-03"]);
const TARGET_CAMPAIGN_CHAT_ID = String(process.env.TARGET_CAMPAIGN_CHAT_ID || "-1003416537521");
const TRAVEL_PLAN_CHAT_ID = String(process.env.TRAVEL_PLAN_CHAT_ID || "-5105633674");
const DEFAULT_CAMPAIGN_LEAD_CHAT_MAP = {
  parkent: "-1003878116355",
  oqqorgon: "-1003711448402"
};
let bonusPullSyncPromise = null;
let lastBonusPullSyncAt = 0;

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, safeName);
  }
});

const upload = multer({ storage });

const DIRECTOR_PERMISSION_PRESET = [
  "dashboard",
  "managerLab",
  "content",
  "content_create",
  "content_edit",
  "content_delete",
  "bonus",
  "bonus_create",
  "bonus_edit",
  "bonus_delete",
  "expenses",
  "finance",
  "expenses_edit",
  "expenses_delete",
  "travelPlans",
  "reports",
  "analytics",
  "postingInsights",
  "moodPulse",
  "employeeKpi",
  "health",
  "travelPlans_create",
  "travelPlans_edit",
  "travelPlans_delete",
  "dailyReports",
  "dailyReports_edit",
  "dailyReports_delete",
  "campaigns",
  "campaigns_edit",
  "campaigns_delete",
  "uploads",
  "uploads_create",
  "uploads_delete",
  "users",
  "users_edit",
  "users_delete",
  "tasks",
  "tasks_edit",
  "tasks_delete",
  "chat",
  "chat_send",
  "audit",
  "profile",
  "settings",
  "aiAssistant"
];

const ADMIN_ONLY_RESET_VERSION = "2026-06-08-admin-only-998931949200-v2";
const ADMIN_ONLY_RESET_FLAG_KEY = "admin_only_reset_version";
const DEFAULT_ADMIN_PHONE = "998931949200";
const DEFAULT_ADMIN_PASSWORD = "2000";
const DEFAULT_ADMIN_LOGIN = "admin";
const DEFAULT_ADMIN_NAME = "Asosiy administrator";

function isLeadershipRole(role) {
  return ["admin", "manager", "director"].includes(role);
}

function isMobilografAccount(user = {}) {
  const role = String(user?.role || "").toLowerCase();
  const departmentRole = String(user?.department_role || "").toLowerCase();
  return role.includes("mobilograf") || departmentRole.includes("mobilograf") || role.includes("video") || departmentRole.includes("video");
}

function normalizeUserPermissions(role, permissions) {
  const safePermissions = Array.isArray(permissions) ? permissions : [];
  if (role === "director" && !safePermissions.length) {
    return DIRECTOR_PERMISSION_PRESET;
  }
  return safePermissions;
}

function normalizePhoneForAuth(value) {
  return String(value || "").replace(/\D+/g, "");
}

function maskPhoneForDisplay(value) {
  const digits = normalizePhoneForAuth(value);
  if (!digits) return "raqam topilmadi";
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, Math.max(0, digits.length - 4)).replace(/\d/g, "*")}${digits.slice(-4)}`;
}

function createAuthPayload(user = {}) {
  return {
    id: user.id,
    full_name: user.full_name,
    phone: user.phone,
    login: user.login,
    role: user.role,
    avatar_url: user.avatar_url,
    department_role: user.department_role,
    permissions_json: user.permissions_json,
    is_active: user.is_active
  };
}

async function issueAuthResponse(res, user, metadata = {}) {
  const payload = createAuthPayload(user);
  const token = signToken(payload);
  await logAction(user.id, "login", "auth", user.id, metadata);
  res.json({ token, user: payload });
}

async function verifyUserPinCode(user, pinCode) {
  const cleanPin = String(pinCode || "").trim();
  if (!/^\d{4}$/.test(cleanPin)) return false;

  if (user?.pin_code_hash) {
    try {
      return await bcrypt.compare(cleanPin, user.pin_code_hash);
    } catch {
      return false;
    }
  }

  const fallbackPin = normalizePhoneForAuth(user?.phone).slice(-4);
  return !!fallbackPin && cleanPin === fallbackPin;
}

function formatDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizeDateOnly(value) {
  return formatDateOnly(value);
}

function formatDateTimeValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(raw)) {
    return `${raw}:00`;
  }
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(raw)) {
    return raw.replace("T", " ");
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw} 00:00:00`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  const seconds = String(parsed.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function formatDateTimeText(value) {
  const normalized = formatDateTimeValue(value);
  if (!normalized) return "-";
  return normalized.replace("T", " ").slice(0, 16);
}

function getCurrentTashkentDateTimeValue() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(now);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day} ${byType.hour}:${byType.minute}:${byType.second}`;
}

function getDateTimeMillis(value) {
  const normalized = formatDateTimeValue(value);
  if (!normalized) return null;
  const parsed = new Date(normalized.replace(" ", "T"));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

function getMonthLabel(date = new Date()) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabelFromDate(dateValue) {
  if (!dateValue) return getMonthLabel();
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return getMonthLabel();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

async function getBonusRate() {
  try {
    const result = await query(`SELECT bonus_rate FROM app_settings ORDER BY id ASC LIMIT 1`);
    return Number(result.rows[0]?.bonus_rate || 25000);
  } catch {
    return 25000;
  }
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

function getDifficultyUnitAmount(level) {
  switch (normalizeDifficultyLevel(level)) {
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

async function calcMoney(count, difficultyLevel = "sodda") {
  return Number(count || 0) * getDifficultyUnitAmount(difficultyLevel);
}

function calcCpa(spend, leads) {
  const s = Number(spend || 0);
  const l = Number(leads || 0);
  if (!l) return 0;
  return Number((s / l).toFixed(2));
}

function calcRoi(spend, revenue) {
  const s = Number(spend || 0);
  const r = Number(revenue || 0);
  if (!s) return 0;
  return Number((((r - s) / s) * 100).toFixed(2));
}

function runDetached(label, task) {
  setImmediate(() => {
    Promise.resolve()
      .then(task)
      .catch((err) => {
        console.error(`${label} error:`, err.message);
      });
  });
}

function logAction(userId, actionType, entityType, entityId = null, meta = {}) {
  runDetached("audit log", async () => {
    await query(
      `
      INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, meta)
      VALUES ($1, $2, $3, $4, $5)
      `,
      [userId || null, actionType, entityType, entityId, JSON.stringify(meta)]
    );
  });
}

function createNotification(userId, title, body, type = "info", category = "system", actionUrl = null) {
  runDetached("notification", async () => {
    await query(
      `
      INSERT INTO notifications (user_id, title, body, type, category, action_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [userId || null, title, body, type, category, actionUrl]
    );
    if (actionUrl !== "/travel-plans") {
      await sendTelegramMessageNow(`[${category}] ${title}\n${body}`);
    }
  });
}

function firstEnvValue(...keys) {
  for (const key of keys) {
    const value = String(process.env[key] || "").trim();
    if (value) return value;
  }
  return "";
}

function withRuntimeTelegramFallback(settings = null) {
  const row = settings || {};
  return {
    ...row,
    telegram_bot_token:
      String(row.telegram_bot_token || "").trim() ||
      firstEnvValue("TELEGRAM_BOT_TOKEN", "BOT_TOKEN"),
    telegram_chat_id:
      String(row.telegram_chat_id || "").trim() ||
      firstEnvValue(
        "TELEGRAM_CHAT_ID",
        "TELEGRAM_GROUP_ID",
        "TELEGRAM_ADMIN_CHAT_ID",
        "TARGET_CAMPAIGN_CHAT_ID",
        "TRAVEL_PLAN_CHAT_ID"
      )
  };
}

function sanitizePublicSettings(settings = null) {
  if (!settings) return null;
  const { telegram_bot_token, ...safeSettings } = settings;
  return {
    ...safeSettings,
    telegram_chat_id: settings.telegram_chat_id ? "configured" : ""
  };
}

function hasValidAuthHeader(req) {
  try {
    const header = String(req.headers.authorization || "");
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return false;
    jwt.verify(token, JWT_SECRET);
    return true;
  } catch {
    return false;
  }
}

async function getSettingsRow(options = {}) {
  const { includeRuntimeFallback = true } = options;
  try {
    const result = await query(`SELECT * FROM app_settings ORDER BY id ASC LIMIT 1`);
    const row = result.rows[0] || null;
    return includeRuntimeFallback ? withRuntimeTelegramFallback(row) : row;
  } catch {
    return includeRuntimeFallback ? withRuntimeTelegramFallback(null) : null;
  }
}

async function ensurePublicShareToken() {
  try {
    const settings = await getSettingsRow();
    if (settings?.public_share_token) return settings.public_share_token;
    const token = crypto.randomBytes(18).toString("hex");
    const current = await query(`SELECT id FROM app_settings ORDER BY id ASC LIMIT 1`);
    if (!current.rows.length) {
      await query(`INSERT INTO app_settings (company_name, public_share_token) VALUES ($1, $2)`, ["aloo", token]);
    } else {
      await query(`UPDATE app_settings SET public_share_token = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`, [token, current.rows[0].id]);
    }
    return token;
  } catch (err) {
    console.error("share token error:", err.message);
    return null;
  }
}

async function ensureDefaultBranches() {
  try {
    const resetFlag = await query(
      `SELECT flag_value FROM system_flags WHERE flag_key = $1 LIMIT 1`,
      [ADMIN_ONLY_RESET_FLAG_KEY]
    );
    if (resetFlag.rows[0]?.flag_value === ADMIN_ONLY_RESET_VERSION) {
      return;
    }

    const existingRes = await query(`SELECT id, name, city FROM branches`);
    const existingByName = new Map(
      existingRes.rows.map((row) => [String(row.name || "").trim().toLowerCase(), row])
    );

    for (const branch of DEFAULT_BRANCHES) {
      const key = branch.name.trim().toLowerCase();
      const existing = existingByName.get(key);

      if (!existing) {
        await query(
          `
          INSERT INTO branches (name, city)
          VALUES ($1, $2)
          `,
          [branch.name, branch.city]
        );
        continue;
      }

      if ((existing.city || "") !== branch.city) {
        await query(
          `
          UPDATE branches
          SET city = $1
          WHERE id = $2
          `,
          [branch.city, existing.id]
        );
      }
    }
  } catch (err) {
    console.error("default branches seed error:", err.message);
  }
}

async function sendTelegramMessageNow(text, chatIdOverride = null) {
  let timeout = null;
  try {
    const settings = await getSettingsRow();
    const chatId = chatIdOverride || settings?.telegram_chat_id;
    if (!settings?.telegram_bot_token) {
      throw new Error("Telegram bot token sozlanmagan. TELEGRAM_BOT_TOKEN env yoki Brand sozlamalariga token kiriting.");
    }
    if (!chatId) {
      throw new Error("Telegram chat ID sozlanmagan. TELEGRAM_CHAT_ID/TELEGRAM_GROUP_ID/TARGET_CAMPAIGN_CHAT_ID env yoki Brand sozlamalariga chat ID kiriting.");
    }

    const sendOnce = async (targetChatId) => {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 4000);
      const response = await fetch(`https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          chat_id: targetChatId,
          text
        })
      });
      const rawBody = await response.text();
      let payload = null;
      try {
        payload = rawBody ? JSON.parse(rawBody) : null;
      } catch {
        payload = null;
      }
      return { response, rawBody, payload };
    };

    let result = await sendOnce(chatId);
    if (!result.response.ok) {
      const migratedChatId = result.payload?.parameters?.migrate_to_chat_id;
      if (migratedChatId) {
        const migratedValue = String(migratedChatId);
        if (!chatIdOverride && settings?.id) {
          try {
            await query(
              `UPDATE app_settings SET telegram_chat_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
              [migratedValue, settings.id]
            );
          } catch (updateErr) {
            console.error("telegram chat migrate update error:", updateErr.message);
          }
        }
        result = await sendOnce(migratedValue);
      }
    }

    if (!result.response.ok) {
      throw new Error(`Telegram API ${result.response.status}: ${result.rawBody}`);
    }
  } catch (err) {
    console.error("telegram send error:", err.message);
    throw err;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function sendTelegramMessage(text, chatIdOverride = null) {
  runDetached("telegram send", async () => {
    await sendTelegramMessageNow(text, chatIdOverride);
  });
}

function stringifyDbValue(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object" && !(value instanceof Date)) return JSON.stringify(value);
  return value;
}

function addApprovalComment(entityType, entityId, authorUserId, body) {
  if (!entityType || !entityId || !body?.trim()) return;
  runDetached("approval comment", async () => {
    await query(
      `
      INSERT INTO comments (entity_type, entity_id, body, author_user_id)
      VALUES ($1, $2, $3, $4)
      `,
      [entityType, Number(entityId), `[Approval] ${body.trim()}`, authorUserId || null]
    );
  });
}

async function createTelegramEventNow(title, lines = [], chatIdOverride = null) {
  const cleanLines = lines.filter(Boolean).map((line) => String(line).trim()).filter(Boolean);
  const resolvedChatId = chatIdOverride || null;
  await sendTelegramMessageNow([title, ...cleanLines].join("\n"), resolvedChatId);
}

function createTelegramEvent(title, lines = [], chatIdOverride = null) {
  runDetached("telegram event", async () => {
    await createTelegramEventNow(title, lines, chatIdOverride);
  });
}

function formatTelegramMoney(value) {
  return `${Math.round(Number(value || 0)).toLocaleString("en-US")} UZS`;
}

function getActorName(user = {}) {
  return user?.full_name || user?.login || "Platforma";
}

function buildPlatformTelegramTitle(emoji, title, tag) {
  return `${emoji} SMM PLATFORMA | ${title} #${tag}`;
}

async function notifyBudgetOverrunForExpense(row = {}, actorName = "Platforma") {
  const category = row.category || "boshqa";
  const month = getMonthLabel(row.expense_date);
  if (!month || !category) return;
  const [budgetRes, actualRes] = await Promise.all([
    query(`SELECT * FROM budgets WHERE month_label = $1 AND category = $2 ORDER BY id DESC LIMIT 1`, [month, category]),
    query(`SELECT COALESCE(SUM(amount),0)::numeric AS total FROM expenses WHERE to_char(expense_date, 'YYYY-MM') = $1 AND category = $2`, [month, category])
  ]);
  const budget = budgetRes.rows[0];
  if (!budget) return;
  const limit = Number(budget.limit_amount || 0);
  const actual = Number(actualRes.rows[0]?.total || 0);
  if (!limit || actual <= limit) return;
  createTelegramEvent(buildPlatformTelegramTitle("🚨", "Harajat limiti oshdi", "finance"), [
    "#finance #budget_limit #signal",
    `Oy: ${month}`,
    `Kategoriya: ${category}`,
    `Limit: ${formatTelegramMoney(limit)}`,
    `Hozirgi sarf: ${formatTelegramMoney(actual)}`,
    `Oxirgi harajat: ${row.title || "-"}`,
    `Kiritdi: ${actorName}`
  ]);
}

function buildContentTelegramLines(row = {}, actorName = "Platforma", action = "Yangilandi") {
  const assignees = [row.assignee_name, row.video_editor_name, row.video_face_name]
    .filter(Boolean)
    .join(" / ");
  return [
    `#kontent #content_reja #${String(row.status || "reja").replace(/\W+/g, "_")}`,
    `🧾 Amal: ${action}`,
    `🎬 Kontent: ${row.title || "-"}`,
    `📅 Deadline: ${formatDateOnly(row.publish_date) || "-"}`,
    `👤 Mas'ul: ${assignees || "-"}`,
    `📌 Status: ${row.status || "-"}`,
    `📣 Platforma: ${row.platform || "-"}`,
    `🎯 Turi: ${row.content_type || "-"}`,
    `💰 Bonus: ${row.bonus_enabled ? "yoqilgan" : "yo'q"}`,
    row.final_url ? `🔗 Link: ${row.final_url}` : null,
    row.approval_comment ? `💬 Izoh: ${row.approval_comment}` : null,
    `👨‍💼 Muallif: ${actorName}`
  ].filter(Boolean);
}

function buildBonusTelegramLines(row = {}, actorName = "Platforma", action = "Yangilandi") {
  const assignees = [row.full_name, row.video_editor_name, row.video_face_name]
    .filter(Boolean)
    .join(" / ");
  return [
    `#bonus #kpi #${String(row.approval_status || "draft").replace(/\W+/g, "_")}`,
    `🧾 Amal: ${action}`,
    `🎬 Kontent: ${row.content_title || "-"}`,
    `📅 Oy: ${row.month_label || getMonthLabel(row.work_date)}`,
    `👤 Hodim: ${assignees || "-"}`,
    `📌 Turi: ${row.content_type || "-"}`,
    `🧮 Taklif: ${Number(row.proposal_count || 0)}`,
    `✅ Tasdiq: ${Number(row.approved_count || 0)}`,
    `💳 Summa: ${formatTelegramMoney(row.total_amount || row.approved_amount || 0)}`,
    row.work_url ? `🔗 Link: ${row.work_url}` : null,
    `👨‍💼 Muallif: ${actorName}`
  ].filter(Boolean);
}

function normalizeCampaignStatus(value) {
  const clean = String(value || "active").trim().toLowerCase();
  if (["paused", "done"].includes(clean)) return clean;
  return "active";
}

function formatCampaignStatusLabel(status) {
  const safeStatus = normalizeCampaignStatus(status);
  if (safeStatus === "paused") return "Pauza";
  if (safeStatus === "done") return "Tugagan";
  return "Faol";
}

function calculateCampaignBudget(dailyBudget, startDate, endDate) {
  const safeDailyBudget = Number(dailyBudget || 0);
  if (!safeDailyBudget) return 0;

  const start = formatDateTimeValue(startDate);
  const end = formatDateTimeValue(endDate);
  if (!start || !end) return safeDailyBudget;

  const startTime = getDateTimeMillis(start);
  const endTime = getDateTimeMillis(end);
  if (Number.isNaN(startTime) || Number.isNaN(endTime) || endTime < startTime) {
    return safeDailyBudget;
  }

  const days = Math.floor((endTime - startTime) / 86400000) + 1;
  return Number((safeDailyBudget * Math.max(days, 1)).toFixed(2));
}

function isCampaignEnded(row) {
  if (!row) return false;
  const safeStatus = normalizeCampaignStatus(row.status);
  if (safeStatus === "done") return true;

  const endAt = formatDateTimeValue(row.end_at || row.end_date);
  if (!endAt) return false;
  return endAt <= getCurrentTashkentDateTimeValue();
}

function getCampaignEndReason(row) {
  if (normalizeCampaignStatus(row?.status) === "done") {
    return "Holati yakunlandi";
  }
  if (formatDateTimeValue(row?.end_at || row?.end_date)) {
    return "Tugash vaqti yetdi";
  }
  return "Kampaniya yakunlandi";
}

function shouldCampaignStartNow(row) {
  if (!row || normalizeCampaignStatus(row.status) !== "active") return false;
  const startAt = formatDateTimeValue(row.start_at || row.start_date);
  if (!startAt) return true;
  return startAt <= getCurrentTashkentDateTimeValue();
}

async function buildCampaignTelegramLines(row) {
  const branchName = row.branch_name || await getBranchName(row.branch_id);
  const dailyBudget = Number(row.daily_budget || 0);
  const totalBudget = calculateCampaignBudget(dailyBudget, row.start_at || row.start_date, row.end_at || row.end_date);
  return [
    "━━━━━━━━━━━━━━━━━━━━",
    `🎯 Kampaniya: ${row.title || "-"}`,
    `📣 Platforma: ${row.platform || "-"}`,
    `🏢 Filial: ${branchName || "-"}`,
    `🟢 Holat: ${formatCampaignStatusLabel(row.status)}`,
    `🕒 Boshlanish: ${formatDateTimeText(row.start_at || row.start_date)}`,
    `⏳ Tugash: ${formatDateTimeText(row.end_at || row.end_date)}`,
    `💰 Kunlik byudjet: ${formatTelegramMoney(dailyBudget)}`,
    `🧾 Umumiy byudjet: ${formatTelegramMoney(totalBudget)}`,
    "━━━━━━━━━━━━━━━━━━━━"
  ].filter(Boolean);
}

async function reserveCampaignTelegramNotice(id, type) {
  const column = type === "end" ? "telegram_ended_at" : "telegram_started_at";
  const result = await query(
    `
    UPDATE campaigns
    SET ${column} = CURRENT_TIMESTAMP
    WHERE id = $1 AND ${column} IS NULL
    RETURNING *
    `,
    [id]
  );
  return result.rows[0] || null;
}

async function revertCampaignTelegramNotice(id, type) {
  const column = type === "end" ? "telegram_ended_at" : "telegram_started_at";
  await query(`UPDATE campaigns SET ${column} = NULL WHERE id = $1`, [id]);
}

async function notifyCampaignStarted(row) {
  if (!row?.id || !shouldCampaignStartNow(row)) return row;
  const reserved = await reserveCampaignTelegramNotice(row.id, "start");
  if (!reserved) return row;

  try {
    await createTelegramEventNow(
      "🚀 TARGET ISHGA TUSHDI",
      await buildCampaignTelegramLines(row),
      TARGET_CAMPAIGN_CHAT_ID
    );
    return { ...row, telegram_started_at: reserved.telegram_started_at };
  } catch (err) {
    await revertCampaignTelegramNotice(row.id, "start");
    console.error("campaign start telegram error:", err.message);
    return row;
  }
}

async function notifyCampaignEnded(row) {
  if (!row?.id || !isCampaignEnded(row)) return row;
  const reserved = await reserveCampaignTelegramNotice(row.id, "end");
  if (!reserved) return row;

  try {
    await createTelegramEventNow(
      "🛑 TARGET YAKUNLANDI",
      [
        ...(await buildCampaignTelegramLines(row)),
        `✅ Yakun: ${getCampaignEndReason(row)}`
      ],
      TARGET_CAMPAIGN_CHAT_ID
    );
    return { ...row, telegram_ended_at: reserved.telegram_ended_at };
  } catch (err) {
    await revertCampaignTelegramNotice(row.id, "end");
    console.error("campaign end telegram error:", err.message);
    return row;
  }
}

async function syncCampaignEndNotifications() {
  await query(
    `
    UPDATE campaigns
    SET
      status = 'done',
      updated_at = CURRENT_TIMESTAMP
    WHERE
      status <> 'done'
      AND end_at IS NOT NULL
      AND end_at <= timezone('Asia/Tashkent', CURRENT_TIMESTAMP)
    `
  );

  const result = await query(
    `
    SELECT
      c.*,
      b.name AS branch_name
    FROM campaigns c
    LEFT JOIN branches b ON b.id = c.branch_id
    WHERE
      c.telegram_ended_at IS NULL
      AND (
        c.status = 'done'
        OR (c.end_at IS NOT NULL AND c.end_at <= timezone('Asia/Tashkent', CURRENT_TIMESTAMP))
      )
    ORDER BY c.end_at ASC NULLS LAST, c.id ASC
    `
  );

  for (const row of result.rows) {
    await notifyCampaignEnded(row);
  }
}

async function syncCampaignStartNotifications() {
  const result = await query(
    `
    SELECT
      c.*,
      b.name AS branch_name
    FROM campaigns c
    LEFT JOIN branches b ON b.id = c.branch_id
    WHERE
      c.status = 'active'
      AND c.telegram_started_at IS NULL
      AND (
        c.start_at IS NULL
        OR c.start_at <= timezone('Asia/Tashkent', CURRENT_TIMESTAMP)
      )
    ORDER BY c.start_at ASC NULLS LAST, c.id ASC
    `
  );

  for (const row of result.rows) {
    await notifyCampaignStarted(row);
  }
}

async function syncCampaignLifecycleNotifications() {
  try {
    await syncCampaignStartNotifications();
    await syncCampaignEndNotifications();
  } catch (err) {
    console.error("campaign lifecycle sync error:", err.message);
  }
}

function normalizeNoticeUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return raw;
}

function normalizeBranchKey(value = "") {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[ʻ’']/g, "")
    .replace(/\s+/g, " ");
}

function getCampaignLeadChatMap() {
  const raw = String(process.env.CAMPAIGN_LEAD_CHAT_MAP || "").trim();
  if (!raw) return DEFAULT_CAMPAIGN_LEAD_CHAT_MAP;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return DEFAULT_CAMPAIGN_LEAD_CHAT_MAP;
    }

    const normalized = { ...DEFAULT_CAMPAIGN_LEAD_CHAT_MAP };
    Object.entries(parsed).forEach(([key, value]) => {
      const normalizedKey = normalizeBranchKey(key);
      const safeValue = String(value || "").trim();
      if (normalizedKey && safeValue) {
        normalized[normalizedKey] = safeValue;
      }
    });
    return normalized;
  } catch (err) {
    console.error("campaign lead chat map parse error:", err.message);
    return DEFAULT_CAMPAIGN_LEAD_CHAT_MAP;
  }
}

function resolveCampaignLeadChatId(branchName) {
  const map = getCampaignLeadChatMap();
  return map[normalizeBranchKey(branchName)] || null;
}

function getCampaignMonthLabel(startAt, fallback = null) {
  const safeDate = formatDateOnly(startAt || fallback || new Date());
  return safeDate && safeDate !== "-" ? safeDate.slice(0, 7) : new Date().toISOString().slice(0, 7);
}

async function syncCampaignManagerOsRows(row, userId) {
  if (!row?.id) return;
  const briefUpdate = await query(
    `
    UPDATE campaign_briefs
    SET
      title = $2,
      campaign_goal = $3,
      target_audience = $4,
      channel_name = $5,
      expected_result = $6,
      status = $7,
      updated_at = CURRENT_TIMESTAMP
    WHERE campaign_id = $1
    RETURNING id
    `,
    [
      row.id,
      row.title || "Kampaniya",
      row.campaign_goal || "",
      row.target_audience || "",
      row.channel_name || row.platform || "",
      row.expected_result || "",
      row.status || "brief"
    ]
  );
  if (!briefUpdate.rows.length) {
    await query(
    `
    INSERT INTO campaign_briefs
      (campaign_id, title, campaign_goal, target_audience, channel_name, expected_result, status, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `,
      [
        row.id,
        row.title || "Kampaniya",
        row.campaign_goal || "",
        row.target_audience || "",
        row.channel_name || row.platform || "",
        row.expected_result || "",
        row.status || "brief",
        userId || null
      ]
    );
  }

  const budgetUpdate = await query(
    `
    UPDATE ad_budgets
    SET
      platform = $2,
      month_label = $3,
      budget_amount = $4,
      spent_amount = $5,
      leads_count = $6,
      cpl_amount = $7,
      roi_amount = $8,
      status = $9,
      updated_at = CURRENT_TIMESTAMP
    WHERE campaign_id = $1
    RETURNING id
    `,
    [
      row.id,
      row.platform || row.channel_name || "Ads",
      getCampaignMonthLabel(row.start_at, row.start_date),
      Number(row.budget || row.daily_budget || 0),
      Number(row.spend || 0),
      Number(row.leads || 0),
      Number(row.cpl_amount || row.cpa || 0),
      Number(row.roi_amount || row.roi || 0),
      row.status || "planned"
    ]
  );
  if (!budgetUpdate.rows.length) {
    await query(
    `
    INSERT INTO ad_budgets
      (campaign_id, platform, month_label, budget_amount, spent_amount, leads_count, cpl_amount, roi_amount, status, created_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    `,
      [
        row.id,
        row.platform || row.channel_name || "Ads",
        getCampaignMonthLabel(row.start_at, row.start_date),
        Number(row.budget || row.daily_budget || 0),
        Number(row.spend || 0),
        Number(row.leads || 0),
        Number(row.cpl_amount || row.cpa || 0),
        Number(row.roi_amount || row.roi || 0),
        row.status || "planned",
        userId || null
      ]
    );
  }
}

const MANAGER_OS_RESOURCES = {
  strategies: {
    table: "strategies",
    columns: ["month_label", "platform", "objective", "strategy_text", "trend_notes", "market_notes", "status", "owner_user_id"],
    orderBy: "updated_at DESC, id DESC"
  },
  content_scripts: {
    table: "content_scripts",
    columns: ["content_id", "title", "hook_text", "main_body_text", "cta_text", "product_name", "platform", "video_type", "status"],
    orderBy: "updated_at DESC, id DESC"
  },
  campaign_briefs: {
    table: "campaign_briefs",
    columns: ["campaign_id", "title", "campaign_goal", "target_audience", "channel_name", "expected_result", "status"],
    orderBy: "updated_at DESC, id DESC"
  },
  ad_budgets: {
    table: "ad_budgets",
    columns: ["campaign_id", "platform", "month_label", "budget_amount", "spent_amount", "leads_count", "cpl_amount", "roi_amount", "status"],
    orderBy: "updated_at DESC, id DESC"
  },
  blogger_partners: {
    table: "blogger_partners",
    columns: ["partner_name", "platform", "contact_url", "price_amount", "status", "expected_result", "actual_result", "notes"],
    orderBy: "updated_at DESC, id DESC"
  },
  competitor_reports: {
    table: "competitor_reports",
    columns: ["competitor_name", "platform", "report_date", "content_format", "campaign_notes", "strengths_text", "weaknesses_text", "action_idea"],
    orderBy: "report_date DESC, id DESC"
  },
  audience_metrics: {
    table: "audience_metrics",
    columns: ["metric_date", "platform", "reach_count", "engagement_count", "follower_growth", "signal_text"],
    orderBy: "metric_date DESC, id DESC"
  },
  creative_briefs: {
    table: "creative_briefs",
    columns: ["title", "creative_type", "platform", "brief_text", "deadline_date", "status", "assigned_user_id"],
    orderBy: "deadline_date ASC NULLS LAST, updated_at DESC, id DESC"
  },
  approval_flows: {
    table: "approval_flows",
    columns: ["entity_type", "entity_id", "current_step", "status", "manager_user_id", "approver_user_id", "executor_user_id", "notes"],
    orderBy: "updated_at DESC, id DESC"
  },
  brand_kpi_scores: {
    table: "brand_kpi_scores",
    columns: ["month_label", "brand_quality_score", "content_quality_score", "ads_result_score", "deadline_score", "notes"],
    orderBy: "month_label DESC, id DESC"
  }
};

function getManagerOsResource(resource) {
  return MANAGER_OS_RESOURCES[String(resource || "").trim()];
}

async function getBranchName(branchId) {
  const numericId = Number(branchId || 0);
  if (!numericId) return "";
  const result = await query(`SELECT name FROM branches WHERE id = $1 LIMIT 1`, [numericId]);
  return result.rows[0]?.name || "";
}

function buildCampaignLeadTelegramLines({ campaignTitle, branchName, platform, fullName, phone }) {
  const now = new Date().toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
  return [
    "━━━━━━━━━━━━━━━━━━━━",
    "🆕 YANGI LID KELDI",
    "━━━━━━━━━━━━━━━━━━━━",
    `👤 Mijoz: ${fullName || "-"}`,
    `📞 Telefon: ${phone || "-"}`,
    `🎯 Kampaniya: ${campaignTitle || "-"}`,
    `🏢 Filial: ${branchName || "-"}`,
    `📣 Platforma: ${platform || "-"}`,
    `🕒 Vaqt: ${now}`,
    "",
    "⚡ Tezkor aloqa qiling!",
    "✅ Lid platformaga saqlandi"
  ];
}

async function buildTravelPlanTelegramLines(row) {
  const branchName = row.branch_name || await getBranchName(row.branch_id);
  const workLink = normalizeNoticeUrl(row.videodek_url);
  return [
    `🎬 Nomi: ${row.video_title || "-"}`,
    `📅 Sana: ${formatDateOnly(row.plan_date)}`,
    `⏳ Muddat: ${formatDateOnly(row.deadline_date) || "-"}`,
    `🏢 Filial: ${branchName || "-"}`,
    `👥 Ishtirokchilar: ${row.participants_text || "-"}`,
    `📌 Status: ${row.status || "-"}`,
    `🔗 Link: ${workLink || "-"}`,
    row.scenario_text ? `📝 Ssenariy: ${String(row.scenario_text).trim()}` : "",
    row.transport_text ? `🚗 Transport: ${row.transport_text}` : "",
    row.hotel_text ? `🏨 Mehmonxona: ${row.hotel_text}` : ""
  ].filter(Boolean);
}

async function insertBackupRows(client, tableName, rows = []) {
  if (!rows.length) return;

  for (const row of rows) {
    const columns = Object.keys(row);
    if (!columns.length) continue;
    const placeholders = columns.map((_, index) => `$${index + 1}`).join(", ");
    const values = columns.map((key) => stringifyDbValue(row[key]));
    await client.query(
      `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`,
      values
    );
  }
}

async function resetToAdminOnlyOnce() {
  const client = await getClient();
  try {
    const flag = await client.query(
      `SELECT flag_value FROM system_flags WHERE flag_key = $1 LIMIT 1`,
      [ADMIN_ONLY_RESET_FLAG_KEY]
    );
    if (flag.rows[0]?.flag_value === ADMIN_ONLY_RESET_VERSION) {
      return false;
    }

    const tablesRes = await client.query(
      `
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
        AND tablename <> ALL($1)
      ORDER BY tablename ASC
      `,
      [["app_settings", "system_flags"]]
    );
    const tableNames = tablesRes.rows.map((row) => row.tablename).filter(Boolean);
    const adminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

    await client.query("BEGIN");
    if (tableNames.length) {
      await client.query(
        `TRUNCATE TABLE ${tableNames.map((tableName) => `"${tableName}"`).join(", ")} RESTART IDENTITY CASCADE`
      );
    }
    await client.query(
      `
      INSERT INTO users (
        full_name,
        phone,
        login,
        password_hash,
        role,
        department_role,
        permissions_json,
        is_active
      )
      VALUES ($1,$2,$3,$4,'admin','Administrator',$5::jsonb,TRUE)
      `,
      [
        DEFAULT_ADMIN_NAME,
        DEFAULT_ADMIN_PHONE,
        DEFAULT_ADMIN_LOGIN,
        adminPasswordHash,
        JSON.stringify(DIRECTOR_PERMISSION_PRESET)
      ]
    );
    await client.query(
      `
      INSERT INTO system_flags (flag_key, flag_value)
      VALUES ($1, $2)
      ON CONFLICT (flag_key)
      DO UPDATE SET flag_value = EXCLUDED.flag_value, updated_at = CURRENT_TIMESTAMP
      `,
      [ADMIN_ONLY_RESET_FLAG_KEY, ADMIN_ONLY_RESET_VERSION]
    );
    await client.query("COMMIT");
    console.log(`Admin-only reset applied: ${DEFAULT_ADMIN_PHONE}`);
    return true;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

async function resetSequence(client, tableName) {
  try {
    await client.query(
      `
      SELECT setval(
        pg_get_serial_sequence($1, 'id'),
        COALESCE((SELECT MAX(id) FROM ${tableName}), 1),
        COALESCE((SELECT MAX(id) FROM ${tableName}), 0) > 0
      )
      `,
      [tableName]
    );
  } catch {
    // ignore tables without serial sequence
  }
}

function emitToUser(userId, eventName, payload) {
  if (!userId) return;
  io.to(`user:${userId}`).emit(eventName, payload);
}

async function markUserPresence(userId, online) {
  if (!userId) return;
  try {
    await query(
      `UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [userId]
    );
  } catch (err) {
    console.error("presence update error:", err.message);
  }

  const payload = {
    user_id: Number(userId),
    online: !!online,
    last_seen_at: new Date().toISOString()
  };

  io.emit("presence:update", payload);
}

function getApprovalNotificationMeta(status, label) {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "draft") {
    return {
      title: `${label} draftga o'tdi`,
      body: `${label} hali tasdiq navbatida`,
      type: "default"
    };
  }
  if (normalized === "review") {
    return {
      title: `${label} review bosqichida`,
      body: `${label} tekshiruvga yuborildi`,
      type: "warning"
    };
  }
  if (normalized === "approved") {
    return {
      title: `${label} tasdiqlandi`,
      body: `${label} nashrga tayyor`,
      type: "info"
    };
  }
  if (normalized === "published") {
    return {
      title: `${label} joylandi`,
      body: `${label} muvaffaqiyatli chop etildi`,
      type: "success"
    };
  }
  if (normalized === "archived") {
    return {
      title: `${label} arxivlandi`,
      body: `${label} tarixga o'tkazildi`,
      type: "default"
    };
  }
  if (normalized === "tasdiqlandi") {
    return {
      title: `${label} tasdiqlandi`,
      body: `${label} keyingi bosqichga o'tdi`,
      type: "info"
    };
  }
  if (normalized === "jarayonda" || normalized === "tayyorlanmoqda" || normalized === "tasvirga_olindi") {
    return {
      title: `${label} jarayonda`,
      body: `${label} ustida ish boshlandi`,
      type: "warning"
    };
  }
  if (normalized === "yakunlandi" || normalized === "joylangan") {
    return {
      title: `${label} yakunlandi`,
      body: `${label} bo'yicha ish tugallandi`,
      type: "success"
    };
  }
  if (normalized === "qayta_ishlash") {
    return {
      title: `${label} qayta ishlashga qaytdi`,
      body: `${label} bo'yicha tuzatish talab qilindi`,
      type: "warning"
    };
  }
  if (normalized === "rad_etildi") {
    return {
      title: `${label} rad etildi`,
      body: `${label} ma'qullanmadi`,
      type: "error"
    };
  }
  return null;
}

function formatApprovalStatusForLog(status) {
  const normalized = String(status || "").toLowerCase();
  const labels = {
    reja: "Reja",
    tasdiqlandi: "Workflow",
    jarayonda: "Ish boshlandi",
    tayyorlanmoqda: "Montajda",
    tayyor: "Tayyor",
    qayta_ishlash: "Qayta ishlash",
    rad_etildi: "Rad etildi",
    yakunlandi: "Yakunlandi",
    joylangan: "Joylangan"
  };
  return labels[normalized] || status || "-";
}

const BONUS_SYNC_SELECT = `
  SELECT
    bi.*,
    u.full_name,
    ve.full_name AS video_editor_name,
    vf.full_name AS video_face_name
  FROM bonus_items bi
  LEFT JOIN users u ON u.id = bi.user_id
  LEFT JOIN users ve ON ve.id = bi.video_editor_user_id
  LEFT JOIN users vf ON vf.id = bi.video_face_user_id
`;

async function runDbQuery(db, text, params = []) {
  if (typeof db === "function") {
    return db(text, params);
  }
  return db.query(text, params);
}

async function getBonusSyncRowById(db, id) {
  const result = await runDbQuery(
    db,
    `
    ${BONUS_SYNC_SELECT}
    WHERE bi.id = $1
    LIMIT 1
    `,
    [id]
  );
  return result.rows[0] || null;
}

async function getBonusSyncRowsByTitleDate(db, title, workDate) {
  const result = await runDbQuery(
    db,
    `
    ${BONUS_SYNC_SELECT}
    WHERE bi.content_title = $1 AND bi.work_date = $2
    ORDER BY bi.id DESC
    `,
    [title, workDate]
  );
  return result.rows;
}

function trimSyncError(err) {
  const message = String(err?.message || err || "").trim();
  return message.slice(0, 800) || "my.se-one sync xatoligi";
}

function getFrozenBonusSyncMonth(row = {}) {
  const monthLabel = String(row?.month_label || "").trim();
  if (/^\d{4}-\d{2}$/.test(monthLabel)) {
    return monthLabel;
  }
  const workDate = String(row?.work_date || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(workDate)) {
    return workDate.slice(0, 7);
  }
  return "";
}

function isFrozenBonusSyncMonth(row = {}) {
  return MYSEONE_FROZEN_MONTHS.has(getFrozenBonusSyncMonth(row));
}

async function updateBonusSyncState(id, { remoteId = null, status = "synced", error = null, syncedTitle = null } = {}) {
  await query(
    `
    UPDATE bonus_items
    SET
      myseone_item_id = $1,
      myseone_sync_status = $2,
      myseone_sync_error = $3,
      myseone_synced_at = CASE WHEN $2 = 'synced' THEN CURRENT_TIMESTAMP ELSE myseone_synced_at END,
      myseone_synced_title = COALESCE($4, myseone_synced_title),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    `,
    [remoteId, status, error ? trimSyncError(error) : null, syncedTitle, id]
  );
}

function scheduleBonusUpsertSync(itemId, options = {}) {
  const { allowFrozenMonth = false } = options;
  if (!itemId || !isMySeOneSyncEnabled()) {
    return;
  }

  setImmediate(async () => {
    try {
      const row = await getBonusSyncRowById(query, itemId);
      if (!row) return;

      if (!allowFrozenMonth && isFrozenBonusSyncMonth(row)) {
        await updateBonusSyncState(itemId, {
          remoteId: row.myseone_item_id || null,
          status: "synced",
          error: null,
          syncedTitle: row.myseone_synced_title || row.content_title || null
        });
        return;
      }

      await updateBonusSyncState(itemId, {
        remoteId: row.myseone_item_id || null,
        status: "syncing",
        error: null
      });

      const result = await syncBonusUpsertToMySeOne(row);
      await updateBonusSyncState(itemId, {
        remoteId: result.remoteId,
        status: "synced",
        error: null,
        syncedTitle: result.syncedTitle
      });
    } catch (err) {
      console.error("my.se-one bonus upsert sync error:", err.message);
      try {
        await updateBonusSyncState(itemId, { status: "error", error: err });
      } catch (stateErr) {
        console.error("my.se-one bonus sync state update error:", stateErr.message);
      }
    }
  });
}

function scheduleBonusDeleteSync(rows, options = {}) {
  const { allowFrozenMonth = false } = options;
  if (!Array.isArray(rows) || !rows.length || !isMySeOneSyncEnabled()) {
    return;
  }

  for (const row of rows) {
    setImmediate(async () => {
      try {
        if (!allowFrozenMonth && isFrozenBonusSyncMonth(row)) {
          return;
        }
        await syncBonusDeleteToMySeOne(row);
      } catch (err) {
        console.error("my.se-one bonus delete sync error:", err.message);
      }
    });
  }
}

function normalizeSyncText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeSyncUrl(value) {
  const raw = normalizeSyncText(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^www\./i.test(raw)) return `https://${raw}`;
  return raw;
}

async function pullBonusUpdatesFromMySeOne(force = false) {
  if (!isMySeOneSyncEnabled()) {
    return { checked: 0, updated: 0, skipped: true };
  }

  const now = Date.now();
  if (!force && bonusPullSyncPromise) {
    return bonusPullSyncPromise;
  }

  if (!force && lastBonusPullSyncAt && now - lastBonusPullSyncAt < BONUS_PULL_SYNC_COOLDOWN_MS) {
    return { checked: 0, updated: 0, skipped: true };
  }

  bonusPullSyncPromise = (async () => {
    const result = await query(
      `
      ${BONUS_SYNC_SELECT}
      WHERE bi.myseone_item_id IS NOT NULL
         OR COALESCE(bi.work_date, CURRENT_DATE) >= CURRENT_DATE - INTERVAL '180 days'
      ORDER BY bi.work_date DESC NULLS LAST, bi.id DESC
      `
    );

    const rows = result.rows || [];
    if (!rows.length) {
      lastBonusPullSyncAt = Date.now();
      return { checked: 0, updated: 0 };
    }

    const mirrorRows = await pullBonusMirrorFromMySeOne(rows);
    let updated = 0;

    for (const remote of mirrorRows) {
      if (!remote?.found || !remote.id) continue;

      const local = rows.find((row) => Number(row.id) === Number(remote.id));
      if (!local) continue;

      const nextMonth = normalizeSyncText(remote.monthLabel || local.month_label || "");
      const nextDate = normalizeSyncText(remote.workDate || local.work_date || "");
      const nextType = normalizeSyncText(remote.contentType || local.content_type || "").toLowerCase();
      const nextTitle = normalizeSyncText(remote.title || local.content_title || "");
      const nextUrl = normalizeSyncUrl(remote.workUrl || "");
      const nextSyncedTitle = normalizeSyncText(remote.syncedTitle || remote.title || local.myseone_synced_title || local.content_title || "");
      const nextRemoteId = Number(remote.remoteId || local.myseone_item_id || 0) || null;

      const currentMonth = normalizeSyncText(local.month_label || "");
      const currentDate = normalizeSyncText(local.work_date || "");
      const currentType = normalizeSyncText(local.content_type || "").toLowerCase();
      const currentTitle = normalizeSyncText(local.content_title || "");
      const currentUrl = normalizeSyncUrl(local.work_url || "");
      const currentSyncedTitle = normalizeSyncText(local.myseone_synced_title || "");
      const currentRemoteId = Number(local.myseone_item_id || 0) || null;

      if (isFrozenBonusSyncMonth({ month_label: nextMonth || currentMonth, work_date: nextDate || currentDate })) {
        continue;
      }

      const hasChanged =
        currentRemoteId !== nextRemoteId ||
        currentMonth !== nextMonth ||
        currentDate !== nextDate ||
        currentType !== nextType ||
        currentTitle !== nextTitle ||
        currentUrl !== nextUrl ||
        currentSyncedTitle !== nextSyncedTitle ||
        local.myseone_sync_status !== "synced";

      if (!hasChanged) continue;

      await query(
        `
        UPDATE bonus_items
        SET
          myseone_item_id = $1,
          month_label = $2,
          work_date = $3,
          content_type = $4,
          content_title = $5,
          work_url = $6,
          myseone_sync_status = 'synced',
          myseone_sync_error = NULL,
          myseone_synced_at = CURRENT_TIMESTAMP,
          myseone_synced_title = $7,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        `,
        [nextRemoteId, nextMonth, nextDate, nextType || "post", nextTitle, nextUrl, nextSyncedTitle, remote.id]
      );

      updated += 1;
    }

    lastBonusPullSyncAt = Date.now();
    return {
      checked: rows.length,
      updated
    };
  })();

  try {
    return await bonusPullSyncPromise;
  } finally {
    bonusPullSyncPromise = null;
  }
}

async function ensureRuntimeSchema() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS app_settings (
      id SERIAL PRIMARY KEY,
      company_name TEXT NOT NULL DEFAULT 'aloo',
      platform_name TEXT NOT NULL DEFAULT 'SMM jamoasi platformasi',
      department_name TEXT NOT NULL DEFAULT 'SMM department',
      theme_default TEXT NOT NULL DEFAULT 'dark',
      website_url TEXT,
      telegram_url TEXT,
      instagram_url TEXT,
      youtube_url TEXT,
      facebook_url TEXT,
      tiktok_url TEXT,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS system_flags (
      flag_key TEXT PRIMARY KEY,
      flag_value TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      full_name TEXT NOT NULL,
      phone TEXT UNIQUE NOT NULL,
      login TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      avatar_url TEXT,
      department_role TEXT,
      permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS branches (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      city TEXT,
      manager_name TEXT,
      phone TEXT,
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS social_accounts (
      id SERIAL PRIMARY KEY,
      platform TEXT NOT NULL,
      account_name TEXT,
      account_url TEXT,
      login_name TEXT,
      status TEXT NOT NULL DEFAULT 'inactive',
      notes TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS content_items (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      platform TEXT NOT NULL DEFAULT '',
      content_type TEXT NOT NULL DEFAULT 'post',
      rubric TEXT NOT NULL DEFAULT 'rubrika-yoq',
      status TEXT NOT NULL DEFAULT 'reja',
      publish_date DATE,
      assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      video_editor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      video_face_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
      bonus_enabled BOOLEAN NOT NULL DEFAULT FALSE,
      proposal_count INTEGER NOT NULL DEFAULT 0,
      approved_count INTEGER NOT NULL DEFAULT 0,
      difficulty_level TEXT NOT NULL DEFAULT 'sodda',
      notes TEXT,
      final_url TEXT,
      plan_month TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date DATE,
      assignee_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS campaigns (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      platform TEXT NOT NULL,
      branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
      lead_chat_id TEXT,
      start_date DATE,
      end_date DATE,
      start_at TIMESTAMP,
      end_at TIMESTAMP,
      daily_budget NUMERIC(14,2) NOT NULL DEFAULT 0,
      budget NUMERIC(14,2) NOT NULL DEFAULT 0,
      spend NUMERIC(14,2) NOT NULL DEFAULT 0,
      leads INTEGER NOT NULL DEFAULT 0,
      sales INTEGER NOT NULL DEFAULT 0,
      ctr NUMERIC(8,2) NOT NULL DEFAULT 0,
      revenue_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      cpa NUMERIC(14,2) NOT NULL DEFAULT 0,
      roi NUMERIC(14,2) NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      notes TEXT,
      telegram_started_at TIMESTAMP,
      telegram_ended_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS daily_branch_reports (
      id SERIAL PRIMARY KEY,
      report_date DATE NOT NULL,
      branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
      stories_count INTEGER NOT NULL DEFAULT 0,
      posts_count INTEGER NOT NULL DEFAULT 0,
      reels_count INTEGER NOT NULL DEFAULT 0,
      subscriber_count INTEGER NOT NULL DEFAULT 0,
      condition_text TEXT,
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (report_date, branch_id)
    )`,
    `CREATE TABLE IF NOT EXISTS bonuses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      month_label TEXT NOT NULL,
      total_units INTEGER NOT NULL DEFAULT 0,
      unit_price NUMERIC(14,2) NOT NULL DEFAULT 25000,
      total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      kpi_score NUMERIC(6,2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, month_label)
    )`,
    `CREATE TABLE IF NOT EXISTS bonus_items (
      id SERIAL PRIMARY KEY,
      month_label TEXT NOT NULL,
      work_date DATE NOT NULL,
      branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
      content_type TEXT NOT NULL DEFAULT 'post',
      content_title TEXT,
      work_url TEXT,
      notes TEXT,
      proposal_count INTEGER NOT NULL DEFAULT 0,
      approved_count INTEGER NOT NULL DEFAULT 0,
      proposal_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      approved_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      difficulty_level TEXT NOT NULL DEFAULT 'sodda',
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      video_editor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      video_face_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approval_status TEXT NOT NULL DEFAULT 'draft',
      approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      approved_at TIMESTAMP,
      myseone_item_id INTEGER,
      myseone_synced_title TEXT,
      myseone_sync_status TEXT NOT NULL DEFAULT 'pending',
      myseone_sync_error TEXT,
      myseone_synced_at TIMESTAMP,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS uploads (
      id SERIAL PRIMARY KEY,
      file_name TEXT NOT NULL,
      original_name TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      file_url TEXT NOT NULL,
      entity_type TEXT,
      entity_id INTEGER,
      uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'info',
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      action_type TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      meta JSONB,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    // Keep existing data and make later ALTER TABLE statements safe on fresh databases.
    `CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      expense_date DATE,
      title TEXT NOT NULL,
      vendor_name TEXT,
      card_holder TEXT,
      amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'UZS',
      category TEXT,
      payment_type TEXT NOT NULL DEFAULT 'visa',
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      recurrence_key TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS travel_expenses (
      id SERIAL PRIMARY KEY,
      expense_date DATE NOT NULL,
      category TEXT NOT NULL DEFAULT 'kategoriya_yoq',
      title TEXT NOT NULL,
      amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'UZS',
      entry_type TEXT NOT NULL DEFAULT 'chiqim',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS travel_plans (
      id SERIAL PRIMARY KEY,
      plan_date DATE,
      branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
      video_title TEXT NOT NULL,
      participants_text TEXT,
      videodek_url TEXT,
      scenario_text TEXT,
      checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      budget_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      transport_text TEXT,
      hotel_text TEXT,
      deadline_date DATE,
      status TEXT NOT NULL DEFAULT 'reja',
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS company_name TEXT NOT NULL DEFAULT 'aloo'`,
    `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS platform_name TEXT NOT NULL DEFAULT 'SMM jamoasi platformasi'`,
    `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS department_name TEXT NOT NULL DEFAULT 'SMM department'`,
    `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS logo_url TEXT`,
    `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS bonus_rate NUMERIC(14,2) NOT NULL DEFAULT 25000`,
    `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT`,
    `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT`,
    `ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS public_share_token TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_editor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_face_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS bonus_enabled BOOLEAN NOT NULL DEFAULT FALSE`,
`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS proposal_count INTEGER NOT NULL DEFAULT 0`,
`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS approved_count INTEGER NOT NULL DEFAULT 0`,
`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS difficulty_level TEXT NOT NULL DEFAULT 'sodda'`,
`ALTER TABLE content_items ALTER COLUMN difficulty_level SET DEFAULT 'sodda'`,
`ALTER TABLE content_items ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS plan_month TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS branch_ids_json JSONB NOT NULL DEFAULT '[]'::jsonb`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS approval_comment TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS scenario_text TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS shot_list_text TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS hook_text TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS main_body_text TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS cta_text TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS product_name TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS video_type TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS preview_url TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS final_url TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS edit_file_url TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS content_template TEXT`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS rubric TEXT NOT NULL DEFAULT 'rubrika-yoq'`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS idea_score INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS visual_score INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS editing_score INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS result_score INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE content_items ADD COLUMN IF NOT EXISTS reach_value INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS month_label TEXT`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS work_date DATE`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS content_type TEXT NOT NULL DEFAULT 'post'`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS content_title TEXT`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS proposal_count INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS approved_count INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS proposal_amount NUMERIC(14,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS approved_amount NUMERIC(14,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS total_amount NUMERIC(14,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS video_editor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS video_face_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
`ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS difficulty_level TEXT NOT NULL DEFAULT 'sodda'`,
`ALTER TABLE bonus_items ALTER COLUMN difficulty_level SET DEFAULT 'sodda'`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'draft'`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS monthly_closed_at TIMESTAMP`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS monthly_closed_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS paid_status TEXT NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS paid_by INTEGER REFERENCES users(id) ON DELETE SET NULL`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS audit_reason TEXT`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS myseone_item_id INTEGER`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS myseone_synced_title TEXT`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS myseone_sync_status TEXT NOT NULL DEFAULT 'pending'`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS myseone_sync_error TEXT`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS myseone_synced_at TIMESTAMP`,
    `ALTER TABLE bonus_items ADD COLUMN IF NOT EXISTS work_url TEXT`,
    `DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'bonus_items' AND column_name = 'bonus_id'
        ) THEN
          ALTER TABLE bonus_items ALTER COLUMN bonus_id DROP NOT NULL;
        END IF;
      END $$;`,
    `ALTER TABLE daily_branch_reports ADD COLUMN IF NOT EXISTS subscriber_count INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE daily_branch_reports ADD COLUMN IF NOT EXISTS condition_text TEXT`,
    `ALTER TABLE daily_branch_reports ADD COLUMN IF NOT EXISTS notes TEXT`,
    `ALTER TABLE daily_branch_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS department_role TEXT`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions_json JSONB NOT NULL DEFAULT '[]'::jsonb`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE users ADD COLUMN IF NOT EXISTS pin_code_hash TEXT`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'system'`,
    `ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT`,
    `ALTER TABLE uploads ADD COLUMN IF NOT EXISTS entity_type TEXT`,
    `ALTER TABLE uploads ADD COLUMN IF NOT EXISTS entity_id INTEGER`,
    `ALTER TABLE uploads ADD COLUMN IF NOT EXISTS folder_name TEXT`,
    `ALTER TABLE uploads ADD COLUMN IF NOT EXISTS tags_json JSONB NOT NULL DEFAULT '[]'::jsonb`,
    `ALTER TABLE uploads ADD COLUMN IF NOT EXISTS version_label TEXT`,
    `ALTER TABLE expenses ADD COLUMN IF NOT EXISTS recurrence_key TEXT`,
    `ALTER TABLE travel_expenses ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS lead_chat_id TEXT`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS daily_budget NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS start_at TIMESTAMP`,
    `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS end_at TIMESTAMP`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS telegram_started_at TIMESTAMP`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS telegram_ended_at TIMESTAMP`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_goal TEXT`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS target_audience TEXT`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS channel_name TEXT`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS expected_result TEXT`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS cpl_amount NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS roi_amount NUMERIC(14,2) NOT NULL DEFAULT 0`,
      `ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS campaign_type TEXT NOT NULL DEFAULT 'target'`,
      `CREATE TABLE IF NOT EXISTS strategies (
        id SERIAL PRIMARY KEY,
        month_label TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'all',
        objective TEXT NOT NULL,
        strategy_text TEXT,
        trend_notes TEXT,
        market_notes TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        owner_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS content_scripts (
        id SERIAL PRIMARY KEY,
        content_id INTEGER REFERENCES content_items(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        hook_text TEXT,
        main_body_text TEXT,
        cta_text TEXT,
        product_name TEXT,
        platform TEXT,
        video_type TEXT,
        status TEXT NOT NULL DEFAULT 'draft',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS campaign_briefs (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        campaign_goal TEXT,
        target_audience TEXT,
        channel_name TEXT,
        expected_result TEXT,
        status TEXT NOT NULL DEFAULT 'brief',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS ad_budgets (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id) ON DELETE SET NULL,
        platform TEXT NOT NULL,
        month_label TEXT NOT NULL,
        budget_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        spent_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        leads_count INTEGER NOT NULL DEFAULT 0,
        cpl_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        roi_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'planned',
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS blogger_partners (
        id SERIAL PRIMARY KEY,
        partner_name TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'Instagram',
        contact_url TEXT,
        price_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'negotiation',
        expected_result TEXT,
        actual_result TEXT,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS competitor_reports (
        id SERIAL PRIMARY KEY,
        competitor_name TEXT NOT NULL,
        platform TEXT NOT NULL DEFAULT 'Instagram',
        report_date DATE NOT NULL DEFAULT CURRENT_DATE,
        content_format TEXT,
        campaign_notes TEXT,
        strengths_text TEXT,
        weaknesses_text TEXT,
        action_idea TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS audience_metrics (
        id SERIAL PRIMARY KEY,
        metric_date DATE NOT NULL DEFAULT CURRENT_DATE,
        platform TEXT NOT NULL,
        reach_count INTEGER NOT NULL DEFAULT 0,
        engagement_count INTEGER NOT NULL DEFAULT 0,
        follower_growth INTEGER NOT NULL DEFAULT 0,
        signal_text TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS creative_briefs (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        creative_type TEXT NOT NULL DEFAULT 'banner',
        platform TEXT,
        brief_text TEXT,
        deadline_date DATE,
        status TEXT NOT NULL DEFAULT 'brief',
        assigned_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS approval_flows (
        id SERIAL PRIMARY KEY,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        current_step TEXT NOT NULL DEFAULT 'manager',
        status TEXT NOT NULL DEFAULT 'pending',
        manager_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        approver_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        executor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS brand_kpi_scores (
        id SERIAL PRIMARY KEY,
        month_label TEXT NOT NULL,
        brand_quality_score INTEGER NOT NULL DEFAULT 0,
        content_quality_score INTEGER NOT NULL DEFAULT 0,
        ads_result_score INTEGER NOT NULL DEFAULT 0,
        deadline_score INTEGER NOT NULL DEFAULT 0,
        notes TEXT,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
    `CREATE TABLE IF NOT EXISTS campaign_leads (
      id SERIAL PRIMARY KEY,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS contest_expenses (
      id SERIAL PRIMARY KEY,
      expense_date DATE NOT NULL,
      contest_name TEXT NOT NULL,
      prize_name TEXT NOT NULL,
      prize_image_url TEXT,
      winner_location TEXT,
      winner_region TEXT NOT NULL,
      winner_name TEXT NOT NULL,
      winner_phone TEXT NOT NULL,
      proof_image_url TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS travel_expenses (
      id SERIAL PRIMARY KEY,
      expense_date DATE NOT NULL,
      category TEXT NOT NULL DEFAULT 'kategoriya_yoq',
      title TEXT NOT NULL,
      amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'UZS',
      entry_type TEXT NOT NULL DEFAULT 'chiqim',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `ALTER TABLE travel_plans ADD COLUMN IF NOT EXISTS checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb`,
    `ALTER TABLE travel_plans ADD COLUMN IF NOT EXISTS approval_comment TEXT`,
    `ALTER TABLE travel_plans ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(14,2) NOT NULL DEFAULT 0`,
    `ALTER TABLE travel_plans ADD COLUMN IF NOT EXISTS transport_text TEXT`,
    `ALTER TABLE travel_plans ADD COLUMN IF NOT EXISTS hotel_text TEXT`,
    `ALTER TABLE travel_plans ADD COLUMN IF NOT EXISTS deadline_date DATE`,
    `CREATE TABLE IF NOT EXISTS expenses (
      id SERIAL PRIMARY KEY,
      expense_date DATE,
      title TEXT NOT NULL,
      vendor_name TEXT,
      card_holder TEXT,
      amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'UZS',
      category TEXT,
      payment_type TEXT NOT NULL DEFAULT 'visa',
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      recurrence_key TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS travel_plans (
      id SERIAL PRIMARY KEY,
      plan_date DATE,
      branch_id INTEGER REFERENCES branches(id) ON DELETE SET NULL,
      video_title TEXT NOT NULL,
      participants_text TEXT,
      videodek_url TEXT,
      scenario_text TEXT,
      checklist_json JSONB NOT NULL DEFAULT '[]'::jsonb,
      budget_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      transport_text TEXT,
      hotel_text TEXT,
      deadline_date DATE,
      status TEXT NOT NULL DEFAULT 'reja',
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      author_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS auth_login_codes (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      phone TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      delivery_channel TEXT NOT NULL DEFAULT 'telegram',
      expires_at TIMESTAMP NOT NULL,
      consumed_at TIMESTAMP,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS budgets (
      id SERIAL PRIMARY KEY,
      month_label TEXT NOT NULL,
      category TEXT NOT NULL,
      limit_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
      notes TEXT,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS monthly_snapshots (
      id SERIAL PRIMARY KEY,
      month_label TEXT NOT NULL,
      snapshot_type TEXT NOT NULL,
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS team_mood_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
      mood_score INTEGER NOT NULL DEFAULT 3,
      note TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (user_id, entry_date)
    )`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMP`,
    `ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP`,
    `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence_key TEXT`,
    `CREATE TABLE IF NOT EXISTS typing_states (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      is_typing BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, target_user_id)
    )`
  ];

  try {
    for (const statement of statements) {
      await query(statement);
    }

    await query(`
      WITH ordered AS (
        SELECT
          id,
          ROW_NUMBER() OVER (
            ORDER BY
              CASE WHEN COALESCE(sort_order, 0) > 0 THEN 0 ELSE 1 END,
              sort_order ASC NULLS LAST,
              expense_date ASC NULLS LAST,
              id ASC
          ) AS next_order
        FROM travel_expenses
      )
      UPDATE travel_expenses te
      SET sort_order = ordered.next_order
      FROM ordered
      WHERE te.id = ordered.id
        AND (COALESCE(te.sort_order, 0) <= 0 OR te.sort_order <> ordered.next_order)
    `);

    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'daily_branch_reports' AND column_name = 'calls_count'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'daily_branch_reports' AND column_name = 'subscriber_count'
        ) THEN
          ALTER TABLE daily_branch_reports RENAME COLUMN calls_count TO subscriber_count;
        END IF;
      END $$;
    `);

    await query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'daily_branch_reports' AND column_name = 'walkin_count'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'daily_branch_reports' AND column_name = 'condition_text'
        ) THEN
          ALTER TABLE daily_branch_reports RENAME COLUMN walkin_count TO condition_text;
        END IF;
      END $$;
    `);

    await query(`
      INSERT INTO app_settings (company_name, platform_name, department_name, theme_default)
      SELECT 'aloo', 'SMM jamoasi platformasi', 'SMM department', 'dark'
      WHERE NOT EXISTS (SELECT 1 FROM app_settings)
    `);

    const defaultAdminPasswordHash = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

    await query(
      `
      INSERT INTO users (
        full_name,
        phone,
        login,
        password_hash,
        role,
        department_role,
        permissions_json,
        is_active
      )
      SELECT
        $1,
        $2,
        $3,
        $4,
        'admin',
        'Administrator',
        $5::jsonb,
        TRUE
      WHERE NOT EXISTS (SELECT 1 FROM users)
      `,
      [
        DEFAULT_ADMIN_NAME,
        DEFAULT_ADMIN_PHONE,
        DEFAULT_ADMIN_LOGIN,
        defaultAdminPasswordHash,
        JSON.stringify(DIRECTOR_PERMISSION_PRESET)
      ]
    );

    await resetToAdminOnlyOnce();

    await query(`
      INSERT INTO branches (name, city)
      SELECT seed.name, seed.city
      FROM (VALUES
        ('Bosh ofis', 'Bosh ofis'),
        ('Ohangaron', 'Ohangaron'),
        ('Angren', 'Angren'),
        ('Chirchiq', 'Chirchiq'),
        ('Guliston', 'Guliston'),
        ('Jarqorgon', 'Jarqorgon'),
        ('Sherobod', 'Sherobod'),
        ('Qibray', 'Qibray'),
        ('Gazalkent', 'Gazalkent'),
        ('Olmaliq', 'Olmaliq'),
        ('Piskent', 'Piskent'),
        ('Oqqorgon', 'Oqqorgon'),
        ('Chinoz', 'Chinoz'),
        ('Shorchi', 'Shorchi'),
        ('Parkent', 'Parkent')
      ) AS seed(name, city)
      WHERE NOT EXISTS (
        SELECT 1 FROM branches WHERE branches.name = seed.name
      )
      AND NOT EXISTS (
        SELECT 1 FROM system_flags
        WHERE flag_key = '${ADMIN_ONLY_RESET_FLAG_KEY}'
          AND flag_value = '${ADMIN_ONLY_RESET_VERSION}'
      )
    `);

    await query(`
      INSERT INTO social_accounts (platform, status)
      SELECT seed.platform, seed.status
      FROM (VALUES
        ('Telegram', 'active'),
        ('Instagram', 'active'),
        ('YouTube', 'inactive'),
        ('Facebook', 'inactive'),
        ('TikTok', 'inactive')
      ) AS seed(platform, status)
      WHERE NOT EXISTS (
        SELECT 1 FROM social_accounts WHERE social_accounts.platform = seed.platform
      )
      AND NOT EXISTS (
        SELECT 1 FROM system_flags
        WHERE flag_key = '${ADMIN_ONLY_RESET_FLAG_KEY}'
          AND flag_value = '${ADMIN_ONLY_RESET_VERSION}'
      )
    `);
  } catch (err) {
    console.error("ensureRuntimeSchema error:", err.message);
    throw err;
  }
}

async function recomputeBonusFromItems() {
  try {
    await query(`
      UPDATE bonus_items
      SET
        proposal_amount = 0,
        approved_amount =
          COALESCE(approved_count, 0) *
          CASE
            WHEN difficulty_level IN ('bonussiz') THEN 0
            WHEN difficulty_level IN ('orta', 'ortacha', 'o''rtacha', 'o‘rtacha') THEN 50000
            WHEN difficulty_level IN ('murakkab', 'qiyin') THEN 75000
            WHEN difficulty_level IN ('juda_murakkab', 'juda murakkab', 'juda-murakkab') THEN 100000
            ELSE 25000
          END,
        total_amount =
          COALESCE(approved_count, 0) *
          CASE
            WHEN difficulty_level IN ('bonussiz') THEN 0
            WHEN difficulty_level IN ('orta', 'ortacha', 'o''rtacha', 'o‘rtacha') THEN 50000
            WHEN difficulty_level IN ('murakkab', 'qiyin') THEN 75000
            WHEN difficulty_level IN ('juda_murakkab', 'juda murakkab', 'juda-murakkab') THEN 100000
            ELSE 25000
          END,
        updated_at = CURRENT_TIMESTAMP
    `);
  } catch (err) {
    console.error("recomputeBonusFromItems error:", err.message);
  }
}

async function upsertBonusFromContentRow(db, row, actorUserId = null) {
  const workDate = normalizeDateOnly(row.publish_date);
  const monthLabel = row.plan_month || monthLabelFromDate(workDate);

  if (!workDate) {
    return { action: "skip" };
  }

  if (!row.bonus_enabled) {
    const deletedRows = await getBonusSyncRowsByTitleDate(db, row.title, workDate);
    await db.query(
      `DELETE FROM bonus_items WHERE content_title = $1 AND work_date = $2`,
      [row.title, workDate]
    );
    return { action: "delete", deletedRows };
  }

  const proposalCount = Number(row.proposal_count || 0);
  const approvedCount = Number(row.approved_count || 0);
  const difficultyLevel = normalizeDifficultyLevel(row.difficulty_level || "sodda");
  const proposalAmount = 0;
  const approvedAmount = await calcMoney(approvedCount, difficultyLevel);
  const totalAmount = approvedAmount;

  const existing = await db.query(
    `SELECT id FROM bonus_items WHERE content_title = $1 AND work_date = $2 LIMIT 1`,
    [row.title, workDate]
  );

  const values = [
    monthLabel,
    workDate,
    row.content_type || "post",
    row.title || "",
    row.final_url || "",
    proposalCount,
    approvedCount,
    proposalAmount,
    approvedAmount,
    totalAmount,
    difficultyLevel,
    row.content_type === "video"
      ? row.video_editor_user_id || row.video_face_user_id || row.assigned_user_id || null
      : row.assigned_user_id || null,
    row.content_type === "video" ? row.video_editor_user_id || null : null,
    row.content_type === "video" ? row.video_face_user_id || null : null
  ];

  if (existing.rows.length) {
    const updated = await db.query(
      `
      UPDATE bonus_items
      SET
        month_label = $1,
        work_date = $2,
        content_type = $3,
        content_title = $4,
        work_url = $5,
        proposal_count = $6,
        approved_count = $7,
        proposal_amount = $8,
        approved_amount = $9,
        total_amount = $10,
        difficulty_level = $11,
        user_id = $12,
        video_editor_user_id = $13,
        video_face_user_id = $14,
        approval_status = 'draft',
        approved_by = NULL,
        approved_at = NULL,
        myseone_sync_status = 'pending',
        myseone_sync_error = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING id
      `,
      [...values, existing.rows[0].id]
    );
    return { action: "upsert", bonusItemId: updated.rows[0]?.id || existing.rows[0].id };
  } else {
    const inserted = await db.query(
      `
      INSERT INTO bonus_items
      (
        month_label,
        work_date,
        content_type,
        content_title,
        work_url,
        proposal_count,
        approved_count,
        proposal_amount,
        approved_amount,
        total_amount,
        difficulty_level,
        user_id,
        video_editor_user_id,
        video_face_user_id,
        approval_status,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'draft',$15)
      RETURNING id
      `,
      [...values, actorUserId]
    );
    return { action: "upsert", bonusItemId: inserted.rows[0]?.id || null };
  }
}

app.get("/", (_, res) => {
  res.json({ ok: true, service: "aloo-smm-server" });
});

io.use((socket, next) => {
  try {
    const rawToken = socket.handshake.auth?.token || socket.handshake.headers.authorization || "";
    const token = String(rawToken).startsWith("Bearer ")
      ? String(rawToken).slice(7)
      : String(rawToken || "");

    if (!token) {
      return next(new Error("Token required"));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch {
    return next(new Error("Token invalid"));
  }
});

io.on("connection", async (socket) => {
  const userId = Number(socket.user?.id);
  if (!userId) {
    socket.disconnect(true);
    return;
  }

  socket.join(`user:${userId}`);

  if (!userSockets.has(userId)) userSockets.set(userId, new Set());
  userSockets.get(userId).add(socket.id);
  await markUserPresence(userId, true);

  socket.on("chat:typing", async (payload = {}) => {
    const targetUserId = Number(payload.target_user_id || 0);
    if (!targetUserId) return;

    try {
      await query(
        `
        INSERT INTO typing_states (user_id, target_user_id, is_typing, updated_at)
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, target_user_id)
        DO UPDATE SET is_typing = EXCLUDED.is_typing, updated_at = CURRENT_TIMESTAMP
        `,
        [userId, targetUserId, !!payload.is_typing]
      );
      emitToUser(targetUserId, "chat:typing", {
        user_id: userId,
        target_user_id: targetUserId,
        is_typing: !!payload.is_typing
      });
    } catch (err) {
      console.error("socket typing error:", err.message);
    }
  });

  socket.on("chat:thread:open", async (payload = {}) => {
    const otherUserId = Number(payload.other_user_id || 0);
    if (!otherUserId) return;

    try {
      const updated = await query(
        `
        UPDATE messages
        SET is_read = TRUE,
            read_at = CURRENT_TIMESTAMP,
            delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
        WHERE sender_user_id = $1
          AND receiver_user_id = $2
          AND is_read = FALSE
        RETURNING id, sender_user_id, receiver_user_id, read_at
        `,
        [otherUserId, userId]
      );

      if (updated.rows.length) {
        emitToUser(otherUserId, "chat:read", {
          by_user_id: userId,
          message_ids: updated.rows.map((row) => row.id),
          read_at: updated.rows[0].read_at
        });
      }
    } catch (err) {
      console.error("socket read error:", err.message);
    }
  });

  socket.on("disconnect", async () => {
    const sockets = userSockets.get(userId);
    if (sockets) {
      sockets.delete(socket.id);
      if (!sockets.size) {
        userSockets.delete(userId);
        await markUserPresence(userId, false);
      }
    } else {
      await markUserPresence(userId, false);
    }
  });
});

/* AUTH */

async function findUserForAuth({ phone = "", login = "", role = "", userId = null } = {}) {
  const normalizedPhone = normalizePhoneForAuth(phone);
  const normalizedLogin = String(login || "").trim().toLowerCase();
  const normalizedRole = String(role || "").trim().toLowerCase();
  const conditions = [];
  const params = [];

  if (userId) {
    params.push(Number(userId));
    conditions.push(`id = $${params.length}`);
  }
  if (normalizedPhone) {
    params.push(normalizedPhone);
    conditions.push(`REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g') = $${params.length}`);
  }
  if (normalizedLogin) {
    params.push(normalizedLogin);
    conditions.push(`LOWER(COALESCE(login, '')) = $${params.length}`);
  }
  if (normalizedRole) {
    params.push(normalizedRole);
    conditions.push(`LOWER(COALESCE(role, '')) = $${params.length}`);
  }

  if (!conditions.length) return null;

  const result = await query(
    `
    SELECT
      id,
      full_name,
      phone,
      login,
      role,
      avatar_url,
      department_role,
      permissions_json,
      is_active,
      password_hash,
      pin_code_hash
    FROM users
    WHERE ${conditions.join(" AND ")}
    ORDER BY id DESC
    LIMIT 1
    `,
    params
  );

  return result.rows[0] || null;
}

app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    const normalizedPhone = normalizePhoneForAuth(phone);

    if (!normalizedPhone || !password) {
      return res.status(400).json({ message: "Telefon raqam va parol kiriting" });
    }

    const result = await query(
      `
      SELECT
        id,
        full_name,
        phone,
        login,
        role,
        avatar_url,
        department_role,
        permissions_json,
        is_active,
        password_hash
      FROM users
      WHERE REGEXP_REPLACE(COALESCE(phone, ''), '\\D', '', 'g') = $1
      LIMIT 1
      `,
      [normalizedPhone]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Telefon yoki parol noto'g'ri" });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: "Akkaunt bloklangan" });
    }

    let ok = false;
    try {
      ok = await bcrypt.compare(password, user.password_hash);
    } catch {
      ok = false;
    }


    if (!ok) {
      return res.status(401).json({ message: "Telefon yoki parol noto'g'ri" });
    }

    const token = signToken({
      id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      login: user.login,
      role: user.role,
      avatar_url: user.avatar_url,
      department_role: user.department_role,
      permissions_json: user.permissions_json,
      is_active: user.is_active
    });

    await logAction(user.id, "login", "auth", user.id, {
      login: user.login,
      phone: user.phone,
      method: "phone_password"
    });

    res.json({
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        login: user.login,
        role: user.role,
        avatar_url: user.avatar_url,
        department_role: user.department_role,
        permissions_json: user.permissions_json,
        is_active: user.is_active
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server xatoligi" });
  }
});

app.post("/api/auth/request-telegram-code", async (req, res) => {
  try {
    const normalizedPhone = normalizePhoneForAuth(req.body?.phone);
    if (!normalizedPhone) {
      return res.status(400).json({ message: "Telefon raqam kiriting" });
    }

    const user = await findUserForAuth({ phone: normalizedPhone });
    if (!user) {
      return res.status(404).json({ message: "Bu telefon bo'yicha foydalanuvchi topilmadi" });
    }
    if (!user.is_active) {
      return res.status(403).json({ message: "Akkaunt bloklangan" });
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    await query(
      `UPDATE auth_login_codes
       SET consumed_at = CURRENT_TIMESTAMP
       WHERE user_id = $1 AND delivery_channel = 'telegram' AND consumed_at IS NULL`,
      [user.id]
    );

    await query(
      `
      INSERT INTO auth_login_codes (user_id, phone, code_hash, delivery_channel, expires_at)
      VALUES ($1, $2, $3, 'telegram', $4)
      `,
      [user.id, normalizedPhone, codeHash, expiresAt]
    );

    try {
      await createTelegramEventNow(
        buildPlatformTelegramTitle("🔐", "Kirish kodi", "login_code"),
        [
          "#login #telegram_kod #one_time_code",
          `👤 Hodim: ${user.full_name || user.login || "Noma'lum"}`,
          `📱 Telefon: ${maskPhoneForDisplay(user.phone)}`,
          `🔢 Kod: ${code}`,
          "⏳ Amal qilish vaqti: 5 daqiqa"
        ]
      );
    } catch (telegramErr) {
      console.error("telegram login code error:", telegramErr.message);
      return res.status(500).json({ message: "Telegramga kod yuborilmadi" });
    }

    return res.json({
      message: "Bir martalik kod Telegramga yuborildi",
      expires_in_seconds: 300
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Kod yuborishda xatolik" });
  }
});

app.post("/api/auth/verify-telegram-code", async (req, res) => {
  try {
    const normalizedPhone = normalizePhoneForAuth(req.body?.phone);
    const code = String(req.body?.code || "").trim();

    if (!normalizedPhone || !/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Telefon va 6 xonali kodni kiriting" });
    }

    const user = await findUserForAuth({ phone: normalizedPhone });
    if (!user) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }
    if (!user.is_active) {
      return res.status(403).json({ message: "Akkaunt bloklangan" });
    }

    const codeRes = await query(
      `
      SELECT id, code_hash, expires_at
      FROM auth_login_codes
      WHERE user_id = $1
        AND phone = $2
        AND delivery_channel = 'telegram'
        AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [user.id, normalizedPhone]
    );

    const row = codeRes.rows[0];
    if (!row) {
      return res.status(400).json({ message: "Faol kod topilmadi, qayta yuboring" });
    }

    if (new Date(row.expires_at).getTime() < Date.now()) {
      await query(`UPDATE auth_login_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1`, [row.id]);
      return res.status(400).json({ message: "Kod muddati tugagan, qayta yuboring" });
    }

    const ok = await bcrypt.compare(code, row.code_hash);
    if (!ok) {
      return res.status(401).json({ message: "Kod noto'g'ri" });
    }

    await query(`UPDATE auth_login_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = $1`, [row.id]);
    const token = signToken(createAuthPayload(user));
    await logAction(user.id, "login", "auth", user.id, {
      method: "telegram_code",
      phone: user.phone
    });
    return res.json({ token, user: createAuthPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kodni tekshirishda xatolik" });
  }
});

app.post("/api/auth/pin-login", async (req, res) => {
  try {
    const { user_id, phone, role, pin_code } = req.body || {};
    if ((!user_id && !phone) || !role || !pin_code) {
      return res.status(400).json({ message: "Lavozim, hodim va 4 xonali kodni kiriting" });
    }

    const user = await findUserForAuth({ userId: user_id, phone, role });
    if (!user) {
      return res.status(404).json({ message: "Bu ma'lumotlar bo'yicha hodim topilmadi" });
    }
    if (!user.is_active) {
      return res.status(403).json({ message: "Akkaunt bloklangan" });
    }

    const pinOk = await verifyUserPinCode(user, pin_code);
    if (!pinOk) {
      return res.status(401).json({ message: "4 xonali kod noto'g'ri" });
    }

    const token = signToken(createAuthPayload(user));
    await logAction(user.id, "login", "auth", user.id, {
      method: "pin_code",
      role: user.role,
      phone: user.phone
    });
    return res.json({ token, user: createAuthPayload(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "PIN orqali kirishda xatolik" });
  }
});

app.get("/api/auth/login-options", async (_req, res) => {
  try {
    const result = await query(
      `
      SELECT
        id,
        full_name,
        role,
        department_role,
        phone,
        (pin_code_hash IS NOT NULL) AS has_pin_code
      FROM users
      WHERE is_active = TRUE
      ORDER BY full_name ASC, id ASC
      `
    );

    res.json({
      users: result.rows.map((row) => ({
        id: row.id,
        full_name: row.full_name,
        role: row.role,
        department_role: row.department_role,
        phone: row.phone,
        phone_masked: maskPhoneForDisplay(row.phone),
        has_pin_code: !!row.has_pin_code
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Login variantlarini olishda xatolik" });
  }
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  try {
    await query(
      `UPDATE users SET last_seen_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [req.user.id]
    );

    const result = await query(
      `
      SELECT
        id,
        full_name,
        phone,
        login,
        role,
        avatar_url,
        department_role,
        permissions_json,
        is_active
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Foydalanuvchini olishda xatolik" });
  }
});

app.put("/api/auth/profile", authRequired, async (req, res) => {
  try {
    const { full_name, phone, login, avatar_url, department_role } = req.body;

    const updated = await query(
      `
      UPDATE users
      SET
        full_name = $1,
        phone = $2,
        login = $3,
        avatar_url = $4,
        department_role = $5,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING
        id,
        full_name,
        phone,
        login,
        role,
        avatar_url,
        department_role,
        permissions_json,
        is_active
      `,
      [
        full_name,
        phone,
        login || null,
        avatar_url || null,
        department_role || null,
        req.user.id
      ]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Profil topilmadi" });
    }

    await logAction(req.user.id, "update", "profile", req.user.id, {
      full_name,
      phone,
      login,
      department_role
    });

    res.json({
      message: "Profil saqlandi",
      user: updated.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profilni saqlashda xatolik" });
  }
});

app.post("/api/auth/change-password", authRequired, async (req, res) => {
  try {
    const { old_password, new_password } = req.body;

    if (!old_password || !new_password) {
      return res.status(400).json({ message: "Eski va yangi parol majburiy" });
    }

    const found = await query(
      `SELECT id, password_hash FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );

    if (!found.rows.length) {
      return res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    }

    const ok = await bcrypt.compare(old_password, found.rows[0].password_hash);
    if (!ok) {
      return res.status(400).json({ message: "Eski parol notoвЂgвЂri" });
    }

    const hashed = await bcrypt.hash(new_password, 10);

    await query(
      `UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [hashed, req.user.id]
    );

    await logAction(req.user.id, "change_password", "users", req.user.id, {});

    res.json({ message: "Parol yangilandi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Parolni oвЂzgartirishda xatolik" });
  }
});

/* DASHBOARD */

app.get("/api/dashboard/summary", authRequired, async (req, res) => {
  try {
    const currentMonth = getMonthLabel();
    const reminderSql =
      isLeadershipRole(req.user.role)
        ? `
        SELECT id, title, due_date, status, priority
        FROM tasks
        WHERE status <> 'done' AND due_date IS NOT NULL AND due_date <= CURRENT_DATE + INTERVAL '3 day'
        ORDER BY due_date ASC, id DESC
        LIMIT 5
        `
        : `
        SELECT id, title, due_date, status, priority
        FROM tasks
        WHERE assignee_user_id = $1
          AND status <> 'done'
          AND due_date IS NOT NULL
          AND due_date <= CURRENT_DATE + INTERVAL '3 day'
        ORDER BY due_date ASC, id DESC
        LIMIT 5
        `;

    const overdueSql =
      isLeadershipRole(req.user.role)
        ? `SELECT COUNT(*)::int AS count FROM tasks WHERE status <> 'done' AND due_date < CURRENT_DATE`
        : `SELECT COUNT(*)::int AS count FROM tasks WHERE assignee_user_id = $1 AND status <> 'done' AND due_date < CURRENT_DATE`;

    const dueSoonSql =
      isLeadershipRole(req.user.role)
        ? `SELECT COUNT(*)::int AS count FROM tasks WHERE status <> 'done' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 day'`
        : `SELECT COUNT(*)::int AS count FROM tasks WHERE assignee_user_id = $1 AND status <> 'done' AND due_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '3 day'`;

    const [contentCount, taskCount, campaignCount, userCount, todayReports, taskProgress, overdueTasks, dueSoonTasks, monthlyContent, monthlyBonus, campaignSpend, reminders, bonusRate, budgetsRes, monthlyExpenses] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM content_items`),
      query(`SELECT COUNT(*)::int AS count FROM tasks`),
      query(`SELECT COUNT(*)::int AS count FROM campaigns`),
      query(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = TRUE`),
      query(`SELECT COUNT(*)::int AS count FROM daily_branch_reports WHERE report_date = CURRENT_DATE`),
      query(
        `
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE status = 'done')::int AS done_count
        FROM tasks
        `
      ),
      isLeadershipRole(req.user.role) ? query(overdueSql) : query(overdueSql, [req.user.id]),
      isLeadershipRole(req.user.role) ? query(dueSoonSql) : query(dueSoonSql, [req.user.id]),
      query(`SELECT COUNT(*)::int AS count FROM content_items WHERE plan_month = $1`, [currentMonth]),
      query(`SELECT COALESCE(SUM(total_amount), 0)::numeric AS amount FROM bonus_items WHERE month_label = $1`, [currentMonth]),
      query(`SELECT COALESCE(SUM(spend), 0)::numeric AS amount FROM campaigns WHERE to_char(start_date, 'YYYY-MM') = $1 OR to_char(end_date, 'YYYY-MM') = $1`, [currentMonth]),
      isLeadershipRole(req.user.role) ? query(reminderSql) : query(reminderSql, [req.user.id]),
      query(`SELECT COALESCE(bonus_rate, 25000)::numeric AS rate FROM app_settings ORDER BY id ASC LIMIT 1`),
      query(`SELECT category, limit_amount FROM budgets WHERE month_label = $1`, [currentMonth]),
      query(`SELECT category, COALESCE(SUM(amount), 0)::numeric AS amount FROM expenses WHERE to_char(expense_date, 'YYYY-MM') = $1 GROUP BY category`, [currentMonth])
    ]);

    const totalTasks = Number(taskProgress.rows[0]?.total || 0);
    const doneTasks = Number(taskProgress.rows[0]?.done_count || 0);
    const budgetAlerts = budgetsRes.rows.map((budget) => {
      const actual = Number(monthlyExpenses.rows.find((row) => row.category === budget.category)?.amount || 0);
      return {
        category: budget.category,
        limit_amount: Number(budget.limit_amount || 0),
        actual_amount: actual,
        exceeded: actual > Number(budget.limit_amount || 0)
      };
    });
    const smartAlerts = [
      ...(Number(overdueTasks.rows[0]?.count || 0) > 0 ? [{ type: "danger", text: `${overdueTasks.rows[0].count} ta kechikkan vazifa bor` }] : []),
      ...(Number(dueSoonTasks.rows[0]?.count || 0) > 0 ? [{ type: "warning", text: `${dueSoonTasks.rows[0].count} ta yaqin muddatli vazifa bor` }] : []),
      ...budgetAlerts.filter((item) => item.exceeded).map((item) => ({
        type: "danger",
        text: `${item.category} budjeti oshgan: ${item.actual_amount} / ${item.limit_amount}`
      }))
    ];
    const executiveSummary = `Bu oy ${monthlyContent.rows[0]?.count || 0} ta kontent, ${todayReports.rows[0]?.count || 0} ta bugungi hisobot va ${doneTasks}/${totalTasks} vazifa bajarilishi qayd etildi.`;

    res.json({
      content_count: contentCount.rows[0].count,
      task_count: taskCount.rows[0].count,
      campaign_count: campaignCount.rows[0].count,
      user_count: userCount.rows[0].count,
      today_report_count: todayReports.rows[0].count,
      daily_task_total: totalTasks,
      daily_task_done: doneTasks,
      daily_task_progress: totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0,
      overdue_task_count: Number(overdueTasks.rows[0]?.count || 0),
      due_soon_task_count: Number(dueSoonTasks.rows[0]?.count || 0),
      monthly_content_count: Number(monthlyContent.rows[0]?.count || 0),
      monthly_bonus_amount: Number(monthlyBonus.rows[0]?.amount || 0),
      monthly_campaign_spend: Number(campaignSpend.rows[0]?.amount || 0),
      bonus_rate: Number(bonusRate.rows[0]?.rate || 25000),
      reminders: reminders.rows || [],
      smart_alerts: smartAlerts,
      executive_summary: executiveSummary,
      budget_alerts: budgetAlerts
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dashboard maвЂ™lumotini olib boвЂlmadi" });
  }
});

/* SEARCH */

app.get("/api/search", authRequired, async (req, res) => {
  try {
    const q = String(req.query.q || "").trim().toLowerCase();

    if (!q) {
      return res.json({
        users: [],
        content: [],
        tasks: [],
        bonuses: [],
        chats: [],
        travel_plans: [],
        campaigns: [],
        leads: [],
        branches: [],
        expenses: [],
        travel_expenses: []
      });
    }

    const like = `%${q}%`;

    const [
      usersRes,
      contentRes,
      tasksRes,
      bonusesRes,
      chatsRes,
      travelRes,
      campaignsRes,
      leadsRes,
      branchesRes,
      expensesRes,
      travelExpensesRes
    ] = await Promise.all([
      query(
        `
        SELECT id, full_name, login, phone, role
        FROM users
        WHERE
          LOWER(COALESCE(full_name, '')) LIKE $1
          OR LOWER(COALESCE(login, '')) LIKE $1
          OR LOWER(COALESCE(phone, '')) LIKE $1
        ORDER BY id DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT id, title, status, publish_date
        FROM content_items
        WHERE LOWER(COALESCE(title, '')) LIKE $1
        ORDER BY publish_date DESC NULLS LAST, id DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT id, title, status, due_date
        FROM tasks
        WHERE LOWER(COALESCE(title, '')) LIKE $1
        ORDER BY due_date DESC NULLS LAST, id DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT id, content_title, content_type, work_date, total_amount
        FROM bonus_items
        WHERE LOWER(COALESCE(content_title, '')) LIKE $1
        ORDER BY work_date DESC NULLS LAST, id DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT id, body, created_at, sender_user_id, receiver_user_id
        FROM messages
        WHERE LOWER(COALESCE(body, '')) LIKE $1
        ORDER BY created_at DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT tp.id, tp.video_title, tp.status, tp.plan_date, b.name AS branch_name
        FROM travel_plans tp
        LEFT JOIN branches b ON b.id = tp.branch_id
        WHERE
          LOWER(COALESCE(tp.video_title, '')) LIKE $1
          OR LOWER(COALESCE(tp.participants_text, '')) LIKE $1
          OR LOWER(COALESCE(tp.scenario_text, '')) LIKE $1
        ORDER BY tp.plan_date DESC NULLS LAST, tp.id DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT c.id, c.title, c.platform, c.status, b.name AS branch_name
        FROM campaigns c
        LEFT JOIN branches b ON b.id = c.branch_id
        WHERE
          LOWER(COALESCE(c.title, '')) LIKE $1
          OR LOWER(COALESCE(c.platform, '')) LIKE $1
          OR LOWER(COALESCE(b.name, '')) LIKE $1
        ORDER BY c.start_at DESC NULLS LAST, c.start_date DESC NULLS LAST, c.id DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT cl.id, cl.full_name, cl.phone, c.title AS campaign_title, b.name AS branch_name
        FROM campaign_leads cl
        LEFT JOIN campaigns c ON c.id = cl.campaign_id
        LEFT JOIN branches b ON b.id = c.branch_id
        WHERE
          LOWER(COALESCE(cl.full_name, '')) LIKE $1
          OR LOWER(COALESCE(cl.phone, '')) LIKE $1
          OR LOWER(COALESCE(c.title, '')) LIKE $1
          OR LOWER(COALESCE(b.name, '')) LIKE $1
        ORDER BY cl.id DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT id, name, city
        FROM branches
        WHERE
          LOWER(COALESCE(name, '')) LIKE $1
          OR LOWER(COALESCE(city, '')) LIKE $1
        ORDER BY id DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT id, title, category, expense_date, amount
        FROM expenses
        WHERE
          LOWER(COALESCE(title, '')) LIKE $1
          OR LOWER(COALESCE(category, '')) LIKE $1
        ORDER BY expense_date DESC NULLS LAST, id DESC
        LIMIT 8
        `,
        [like]
      ),
      query(
        `
        SELECT id, title, category, expense_date, amount, entry_type
        FROM travel_expenses
        WHERE
          LOWER(COALESCE(title, '')) LIKE $1
          OR LOWER(COALESCE(category, '')) LIKE $1
        ORDER BY expense_date DESC NULLS LAST, id DESC
        LIMIT 8
        `,
        [like]
      )
    ]);

    res.json({
      users: usersRes.rows,
      content: contentRes.rows,
      tasks: tasksRes.rows,
      bonuses: bonusesRes.rows,
      chats: chatsRes.rows,
      travel_plans: travelRes.rows,
      campaigns: campaignsRes.rows,
      leads: leadsRes.rows,
      branches: branchesRes.rows,
      expenses: expensesRes.rows,
      travel_expenses: travelExpensesRes.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Global qidiruvda xatolik: ${err.message}` });
  }
});

/* SETTINGS */

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await getSettingsRow({ includeRuntimeFallback: false });
    res.json(hasValidAuthHeader(req) ? settings : sanitizePublicSettings(settings));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sozlamalarni olib boвЂlmadi" });
  }
});

app.put("/api/settings", authRequired, async (req, res) => {
  try {
    const {
      company_name,
      platform_name,
      department_name,
      logo_url,
      bonus_rate,
      telegram_bot_token,
      telegram_chat_id,
      website_url,
      telegram_url,
      instagram_url,
      youtube_url,
      facebook_url,
      tiktok_url
    } = req.body;

    const current = await query(`SELECT id FROM app_settings ORDER BY id ASC LIMIT 1`);

    if (!current.rows.length) {
      await query(
        `
        INSERT INTO app_settings
        (
          company_name,
          platform_name,
          department_name,
          logo_url,
          bonus_rate,
          telegram_bot_token,
          telegram_chat_id,
          website_url,
          telegram_url,
          instagram_url,
          youtube_url,
          facebook_url,
          tiktok_url
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        `,
        [
          company_name || "aloo",
          platform_name || "",
          department_name || "",
          logo_url || "",
          Number(bonus_rate || 25000),
          telegram_bot_token || "",
          telegram_chat_id || "",
          website_url || "",
          telegram_url || "",
          instagram_url || "",
          youtube_url || "",
          facebook_url || "",
          tiktok_url || ""
        ]
      );
    } else {
      await query(
        `
        UPDATE app_settings
        SET
          company_name = $1,
          platform_name = $2,
          department_name = $3,
          logo_url = $4,
          bonus_rate = $5,
          telegram_bot_token = $6,
          telegram_chat_id = $7,
          website_url = $8,
          telegram_url = $9,
          instagram_url = $10,
          youtube_url = $11,
          facebook_url = $12,
          tiktok_url = $13,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $14
        `,
        [
          company_name || "aloo",
          platform_name || "",
          department_name || "",
          logo_url || "",
          Number(bonus_rate || 25000),
          telegram_bot_token || "",
          telegram_chat_id || "",
          website_url || "",
          telegram_url || "",
          instagram_url || "",
          youtube_url || "",
          facebook_url || "",
          tiktok_url || "",
          current.rows[0].id
        ]
      );
    }

    await logAction(req.user.id, "update", "app_settings", null, {});
    res.json({ message: "Sozlamalar saqlandi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sozlamalarni saqlab boвЂlmadi" });
  }
});

app.post("/api/settings/test-telegram", authRequired, async (req, res) => {
  try {
    await createTelegramEventNow("Aloo platforma test xabari", [
      `Foydalanuvchi: ${req.user.full_name || req.user.login || req.user.id}`,
      `Sana: ${new Date().toISOString()}`
    ]);
    res.json({ message: "Telegram test xabari yuborildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Telegram test yuborilmadi: ${err.message}` });
  }
});

app.post("/api/telegram/workflow-digest", authRequired, rolesAllowed("admin", "manager", "director"), async (req, res) => {
  try {
    const today = formatDateOnly(new Date());
    const month = getMonthLabel();
    const [taskRes, contentRes, dailyRes, bonusRes, expenseSignalRes] = await Promise.all([
      query(`SELECT title, due_date, priority FROM tasks WHERE status <> 'done' AND due_date <= CURRENT_DATE + INTERVAL '3 day' ORDER BY due_date ASC, priority DESC LIMIT 6`),
      query(`SELECT title, publish_date, platform, status FROM content_items WHERE publish_date <= CURRENT_DATE + INTERVAL '2 day' AND status NOT IN ('yakunlandi','joylangan','published','archived') ORDER BY publish_date ASC LIMIT 6`),
      query(`SELECT COUNT(*)::int AS count FROM daily_branch_reports WHERE report_date = CURRENT_DATE`),
      query(`SELECT COUNT(*)::int AS pending_count, COALESCE(SUM(total_amount),0)::numeric AS pending_total FROM bonus_items WHERE month_label = $1 AND paid_status <> 'paid'`, [month]),
      query(`
        SELECT b.category, b.limit_amount, COALESCE(SUM(e.amount),0)::numeric AS actual
        FROM budgets b
        LEFT JOIN expenses e ON e.category = b.category AND to_char(e.expense_date,'YYYY-MM') = b.month_label
        WHERE b.month_label = $1
        GROUP BY b.id, b.category, b.limit_amount
        HAVING COALESCE(SUM(e.amount),0) > b.limit_amount
        ORDER BY actual DESC
        LIMIT 5
      `, [month])
    ]);
    const lines = [
      "#daily_digest #workflow #telegram",
      `Sana: ${today}`,
      `Daily report: ${dailyRes.rows[0]?.count || 0} ta`,
      `Bonus pending: ${bonusRes.rows[0]?.pending_count || 0} / ${formatTelegramMoney(bonusRes.rows[0]?.pending_total || 0)}`,
      taskRes.rows.length ? `Vazifalar: ${taskRes.rows.map((item) => `${item.title} (${formatDateOnly(item.due_date) || "-"})`).join("; ")}` : "Vazifa eslatma yo'q",
      contentRes.rows.length ? `Kontent deadline: ${contentRes.rows.map((item) => `${item.title} (${formatDateOnly(item.publish_date) || "-"})`).join("; ")}` : "Kontent deadline signali yo'q",
      expenseSignalRes.rows.length ? `Budget signal: ${expenseSignalRes.rows.map((item) => `${item.category}: ${formatTelegramMoney(item.actual)} / ${formatTelegramMoney(item.limit_amount)}`).join("; ")}` : "Budget signal yo'q",
      `Yubordi: ${getActorName(req.user)}`
    ];
    await createTelegramEventNow(buildPlatformTelegramTitle("📡", "Kunlik workflow digest", "digest"), lines);
    await logAction(req.user.id, "send_digest", "telegram", null, { month_label: month });
    res.json({ message: "Workflow digest Telegram guruhga yuborildi", lines });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Workflow digest yuborilmadi: ${err.message}` });
  }
});

/* USERS */

app.get("/api/users", authRequired, async (_, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        full_name,
        phone,
        login,
        role,
        avatar_url,
        department_role,
        permissions_json,
        is_active,
        (pin_code_hash IS NOT NULL) AS has_pin_code,
        created_at
      FROM users
      ORDER BY created_at DESC, id DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hodimlarni olishda xatolik" });
  }
});

app.post("/api/users", authRequired, async (req, res) => {
  try {
    const {
      full_name,
      phone,
      login,
      password,
      pin_code,
      role,
      avatar_url,
      department_role,
      permissions_json
    } = req.body;

    if (!full_name || !phone || !password) {
      return res.status(400).json({ message: "Ism, telefon va parol majburiy" });
    }

    const exists = await query(
      `
      SELECT id
      FROM users
      WHERE phone = $1 OR (login IS NOT NULL AND login = $2)
      LIMIT 1
      `,
      [phone, login || null]
    );

    if (exists.rows.length) {
      return res.status(400).json({ message: "Bu telefon yoki login allaqachon mavjud" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const pinHash = /^\d{4}$/.test(String(pin_code || "").trim())
      ? await bcrypt.hash(String(pin_code).trim(), 10)
      : null;
    const permissions = normalizeUserPermissions(role, permissions_json);

    const inserted = await query(
      `
      INSERT INTO users
      (
        full_name,
        phone,
        login,
        password_hash,
        role,
        avatar_url,
        department_role,
        permissions_json,
        pin_code_hash,
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING
        id,
        full_name,
        phone,
        login,
        role,
        avatar_url,
        department_role,
        permissions_json,
        (pin_code_hash IS NOT NULL) AS has_pin_code,
        is_active,
        created_at
      `,
      [
        full_name,
        phone,
        login || null,
        hashed,
        role || "viewer",
        avatar_url || null,
        department_role || (role === "director" ? "Rahbar" : null),
        JSON.stringify(permissions),
        pinHash,
        true
      ]
    );

    await logAction(req.user.id, "create", "users", inserted.rows[0].id, {
      full_name,
      phone,
      role,
      department_role,
      has_pin_code: !!pinHash,
      permissions_json: permissions
    });

    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Hodim yaratishda xatolik: ${err.message}` });
  }
});

app.put("/api/users/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      phone,
      login,
      role,
      pin_code,
      avatar_url,
      department_role,
      permissions_json
    } = req.body;

    const permissions = normalizeUserPermissions(role, permissions_json);
    const normalizedPin = String(pin_code || "").trim();
    const pinHash = /^\d{4}$/.test(normalizedPin) ? await bcrypt.hash(normalizedPin, 10) : null;
    const shouldUpdatePin = Object.prototype.hasOwnProperty.call(req.body || {}, "pin_code");

    const updated = await query(
      `
      UPDATE users
      SET
        full_name = $1,
        phone = $2,
        login = $3,
        role = $4,
        avatar_url = $5,
        department_role = $6,
        permissions_json = $7,
        pin_code_hash = CASE
          WHEN $8 THEN $9
          ELSE pin_code_hash
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING
        id,
        full_name,
        phone,
        login,
        role,
        avatar_url,
        department_role,
        permissions_json,
        (pin_code_hash IS NOT NULL) AS has_pin_code,
        is_active
      `,
      [
        full_name,
        phone,
        login || null,
        role,
        avatar_url || null,
        department_role || (role === "director" ? "Rahbar" : null),
        JSON.stringify(permissions),
        shouldUpdatePin,
        pinHash,
        id
      ]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Hodim topilmadi" });
    }

    await logAction(req.user.id, "update", "users", Number(id), {
      full_name,
      phone,
      role,
      department_role,
      has_pin_code: shouldUpdatePin ? !!pinHash : undefined,
      permissions_json: permissions
    });

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Hodimni yangilashda xatolik: ${err.message}` });
  }
});

app.delete("/api/users/:id", authRequired, rolesAllowed("admin"), async (req, res) => {
  try {
    await query(`DELETE FROM users WHERE id = $1`, [req.params.id]);
    await logAction(req.user.id, "delete", "users", Number(req.params.id), {});
    res.json({ message: "Hodim oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hodimni oвЂchirib boвЂlmadi" });
  }
});

app.post("/api/users/:id/toggle-active", authRequired, async (req, res) => {
  try {
    const updated = await query(
      `
      UPDATE users
      SET
        is_active = NOT COALESCE(is_active, TRUE),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, full_name, is_active
      `,
      [req.params.id]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Hodim topilmadi" });
    }

    await logAction(req.user.id, "toggle_active", "users", Number(req.params.id), {});

    res.json({
      message: "Holat yangilandi",
      user: updated.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Holatni yangilashda xatolik" });
  }
});

app.post("/api/users/:id/reset-password", authRequired, async (req, res) => {
  try {
    const hashed = await bcrypt.hash("12345678", 10);

    const updated = await query(
      `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, full_name
      `,
      [hashed, req.params.id]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Hodim topilmadi" });
    }

    await logAction(req.user.id, "reset_password", "users", Number(req.params.id), {});

    res.json({ message: "Parol 12345678 ga tiklandi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Parolni tiklashda xatolik" });
  }
});

/* BRANCHES */

app.get("/api/branches", authRequired, async (_, res) => {
  try {
    const result = await query(
      `SELECT * FROM branches WHERE name = ANY($1) ORDER BY ${buildBranchOrderSql("name")}`,
      [DEFAULT_BRANCHES.map((branch) => branch.name)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Filiallarni olib boвЂlmadi" });
  }
});

/* CONTENT */

async function getContentDetailRow(db, id) {
  const result = await runDbQuery(
    db,
    `
    SELECT
      c.*,
      u.full_name AS assignee_name,
      ve.full_name AS video_editor_name,
      vf.full_name AS video_face_name
    FROM content_items c
    LEFT JOIN users u ON u.id = c.assigned_user_id
    LEFT JOIN users ve ON ve.id = c.video_editor_user_id
    LEFT JOIN users vf ON vf.id = c.video_face_user_id
    WHERE c.id = $1
    LIMIT 1
    `,
    [id]
  );
  return result.rows[0] || null;
}

app.get("/api/content", authRequired, pagePermissionAllowed("content"), async (req, res) => {
  try {
    const month = req.query.month;

    let sql = `
      SELECT
        c.*,
        u.full_name AS assignee_name,
        ve.full_name AS video_editor_name,
        vf.full_name AS video_face_name
      FROM content_items c
      LEFT JOIN users u ON u.id = c.assigned_user_id
      LEFT JOIN users ve ON ve.id = c.video_editor_user_id
      LEFT JOIN users vf ON vf.id = c.video_face_user_id
    `;
    const params = [];

    if (month) {
      sql += ` WHERE to_char(c.publish_date, 'YYYY-MM') = $1 `;
      params.push(month);
    }

    sql += ` ORDER BY c.publish_date DESC NULLS LAST, c.id DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kontentni olib boвЂlmadi" });
  }
});

app.post("/api/content", authRequired, actionPermissionAllowed("content", "create"), async (req, res) => {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const {
      title,
      publish_date,
      status,
      platform,
      content_type,
      rubric,
      assigned_user_id,
      video_editor_user_id,
      video_face_user_id,
      bonus_enabled,
      proposal_count,
      approved_count,
      difficulty_level,
      notes,
      branch_ids_json,
      scenario_text,
      shot_list_text,
      hook_text,
      main_body_text,
      cta_text,
      product_name,
      video_type,
      preview_url,
      final_url,
      edit_file_url,
      approval_comment,
      content_template,
      idea_score,
      visual_score,
      editing_score,
      result_score,
      reach_value
    } = req.body;

    const publishDate = formatDateOnly(publish_date);
    const planMonth = publishDate ? publishDate.slice(0, 7) : getMonthLabel();

    const finalAssignedUserId = content_type === "video" ? null : assigned_user_id || null;
    const finalEditorUserId = content_type === "video" ? video_editor_user_id || null : null;
    const finalFaceUserId = content_type === "video" ? video_face_user_id || null : null;

    const inserted = await client.query(
      `
      INSERT INTO content_items
      (
        title,
        publish_date,
        status,
        platform,
        content_type,
        rubric,
        assigned_user_id,
        video_editor_user_id,
        video_face_user_id,
        bonus_enabled,
        proposal_count,
        approved_count,
        difficulty_level,
        notes,
        branch_ids_json,
        scenario_text,
        shot_list_text,
        hook_text,
        main_body_text,
        cta_text,
        product_name,
        video_type,
        preview_url,
        final_url,
        edit_file_url,
        approval_comment,
        content_template,
        idea_score,
        visual_score,
        editing_score,
        result_score,
        reach_value,
        plan_month,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34)
      RETURNING *
      `,
      [
        title,
        publishDate,
        status || "reja",
        platform || "",
        content_type || "post",
        rubric || "rubrika-yoq",
        finalAssignedUserId,
        finalEditorUserId,
        finalFaceUserId,
        !!bonus_enabled,
        Number(proposal_count || 0),
        Number(approved_count || 0),
        normalizeDifficultyLevel(difficulty_level || "sodda"),
        notes || "",
        JSON.stringify(Array.isArray(branch_ids_json) ? branch_ids_json : []),
        scenario_text || "",
        shot_list_text || "",
        hook_text || "",
        main_body_text || "",
        cta_text || "",
        product_name || "",
        video_type || "",
        preview_url || "",
        final_url || "",
        edit_file_url || "",
        approval_comment || "",
        content_template || "",
        Number(idea_score || 0),
        Number(visual_score || 0),
        Number(editing_score || 0),
        Number(result_score || 0),
        Number(reach_value || 0),
        planMonth,
        req.user.id
      ]
    );

    const row = inserted.rows[0];

    if (hook_text || main_body_text || cta_text || product_name || video_type || scenario_text) {
      await client.query(
        `
        INSERT INTO content_scripts
        (content_id, title, hook_text, main_body_text, cta_text, product_name, platform, video_type, status, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
        [
          row.id,
          row.title,
          hook_text || "",
          main_body_text || scenario_text || "",
          cta_text || "",
          product_name || "",
          platform || "",
          video_type || content_type || "",
          status || "draft",
          req.user.id
        ]
      );
    }

    const bonusSyncMeta = await upsertBonusFromContentRow(client, row, req.user.id);
    await client.query("COMMIT");

    if (bonusSyncMeta?.action === "upsert" && bonusSyncMeta.bonusItemId) {
      scheduleBonusUpsertSync(bonusSyncMeta.bonusItemId);
    }
    if (bonusSyncMeta?.action === "delete" && bonusSyncMeta.deletedRows?.length) {
      scheduleBonusDeleteSync(bonusSyncMeta.deletedRows);
    }

    if (row.bonus_enabled) {
      await createNotification(
        null,
        "Bonusga oвЂtkazildi",
        `${row.title} bonus tizimiga qoвЂshildi`,
        "success",
        "bonus",
        "/content"
      );
    }

    const approvalMeta = getApprovalNotificationMeta(row.status, row.title);
    if (approvalMeta) {
      await createNotification(null, approvalMeta.title, approvalMeta.body, approvalMeta.type, "approval", "/content");
    }
    if (approval_comment?.trim()) {
      await addApprovalComment("content", row.id, req.user.id, approval_comment);
      await createTelegramEvent("Kontent approval izohi", [
        `Kontent: ${row.title}`,
        `Status: ${row.status}`,
        `Izoh: ${approval_comment}`
      ]);
    }

    const telegramRow = await getContentDetailRow(query, row.id);
    createTelegramEvent(
      buildPlatformTelegramTitle("🆕", "Kontent reja yaratildi", "kontent"),
      buildContentTelegramLines(telegramRow || row, getActorName(req.user), "Yaratildi")
    );

    await logAction(req.user.id, "create", "content_items", row.id, { title: row.title });
    res.json(row);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: `Kontent qoвЂshib boвЂlmadi: ${err.message}` });
  } finally {
    client.release();
  }
});

app.put("/api/content/:id", authRequired, actionPermissionAllowed("content", "edit"), async (req, res) => {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const {
      title,
      publish_date,
      status,
      platform,
      content_type,
      rubric,
      assigned_user_id,
      video_editor_user_id,
      video_face_user_id,
      bonus_enabled,
      proposal_count,
      approved_count,
      difficulty_level,
      notes,
      branch_ids_json,
      scenario_text,
      shot_list_text,
      hook_text,
      main_body_text,
      cta_text,
      product_name,
      video_type,
      preview_url,
      final_url,
      edit_file_url,
      approval_comment,
      content_template,
      idea_score,
      visual_score,
      editing_score,
      result_score,
      reach_value
    } = req.body;

    const publishDate = formatDateOnly(publish_date);
    const planMonth = publishDate ? publishDate.slice(0, 7) : getMonthLabel();
    const previous = await client.query(`SELECT status FROM content_items WHERE id = $1 LIMIT 1`, [req.params.id]);

    const finalAssignedUserId = content_type === "video" ? null : assigned_user_id || null;
    const finalEditorUserId = content_type === "video" ? video_editor_user_id || null : null;
    const finalFaceUserId = content_type === "video" ? video_face_user_id || null : null;

    const updated = await client.query(
      `
      UPDATE content_items
      SET
        title = $1,
        publish_date = $2,
        status = $3,
        platform = $4,
        content_type = $5,
        rubric = $6,
        assigned_user_id = $7,
        video_editor_user_id = $8,
        video_face_user_id = $9,
        bonus_enabled = $10,
        proposal_count = $11,
        approved_count = $12,
        difficulty_level = $13,
        notes = $14,
        branch_ids_json = $15,
        scenario_text = $16,
        shot_list_text = $17,
        hook_text = $18,
        main_body_text = $19,
        cta_text = $20,
        product_name = $21,
        video_type = $22,
        preview_url = $23,
        final_url = $24,
        edit_file_url = $25,
        approval_comment = $26,
        content_template = $27,
        idea_score = $28,
        visual_score = $29,
        editing_score = $30,
        result_score = $31,
        reach_value = $32,
        plan_month = $33,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $34
      RETURNING *
      `,
      [
        title,
        publishDate,
        status || "reja",
        platform || "",
        content_type || "post",
        rubric || "rubrika-yoq",
        finalAssignedUserId,
        finalEditorUserId,
        finalFaceUserId,
        !!bonus_enabled,
        Number(proposal_count || 0),
        Number(approved_count || 0),
        normalizeDifficultyLevel(difficulty_level || "sodda"),
        notes || "",
        JSON.stringify(Array.isArray(branch_ids_json) ? branch_ids_json : []),
        scenario_text || "",
        shot_list_text || "",
        hook_text || "",
        main_body_text || "",
        cta_text || "",
        product_name || "",
        video_type || "",
        preview_url || "",
        final_url || "",
        edit_file_url || "",
        approval_comment || "",
        content_template || "",
        Number(idea_score || 0),
        Number(visual_score || 0),
        Number(editing_score || 0),
        Number(result_score || 0),
        Number(reach_value || 0),
        planMonth,
        req.params.id
      ]
    );

    if (!updated.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Kontent topilmadi" });
    }

    const row = updated.rows[0];

    if (hook_text || main_body_text || cta_text || product_name || video_type || scenario_text) {
      const scriptUpdate = await client.query(
        `
        UPDATE content_scripts
        SET
          title = $2,
          hook_text = $3,
          main_body_text = $4,
          cta_text = $5,
          product_name = $6,
          platform = $7,
          video_type = $8,
          status = $9,
          updated_at = CURRENT_TIMESTAMP
        WHERE content_id = $1
        RETURNING id
        `,
        [
          row.id,
          row.title,
          hook_text || "",
          main_body_text || scenario_text || "",
          cta_text || "",
          product_name || "",
          platform || "",
          video_type || content_type || "",
          status || "draft"
        ]
      );
      if (!scriptUpdate.rows.length) {
        await client.query(
        `
        INSERT INTO content_scripts
        (content_id, title, hook_text, main_body_text, cta_text, product_name, platform, video_type, status, created_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        `,
          [
            row.id,
            row.title,
            hook_text || "",
            main_body_text || scenario_text || "",
            cta_text || "",
            product_name || "",
            platform || "",
            video_type || content_type || "",
            status || "draft",
            req.user.id
          ]
        );
      }
    }

    const bonusSyncMeta = await upsertBonusFromContentRow(client, row, req.user.id);
    await client.query("COMMIT");

    if (bonusSyncMeta?.action === "upsert" && bonusSyncMeta.bonusItemId) {
      scheduleBonusUpsertSync(bonusSyncMeta.bonusItemId);
    }
    if (bonusSyncMeta?.action === "delete" && bonusSyncMeta.deletedRows?.length) {
      scheduleBonusDeleteSync(bonusSyncMeta.deletedRows);
    }

    if (previous.rows[0]?.status !== row.status) {
      const approvalMeta = getApprovalNotificationMeta(row.status, row.title);
      if (approvalMeta) {
        await createNotification(null, approvalMeta.title, approvalMeta.body, approvalMeta.type, "approval", "/content");
      }
    }
    if (approval_comment?.trim()) {
      await addApprovalComment("content", row.id, req.user.id, approval_comment);
      await createTelegramEvent("Kontent approval yangilandi", [
        `Kontent: ${row.title}`,
        `Status: ${row.status}`,
        `Izoh: ${approval_comment}`
      ]);
    }

    const telegramRow = await getContentDetailRow(query, row.id);
    const statusChanged = previous.rows[0]?.status !== row.status;
    createTelegramEvent(
      buildPlatformTelegramTitle(statusChanged ? "🔄" : "✏️", statusChanged ? "Kontent status yangilandi" : "Kontent reja yangilandi", "kontent"),
      buildContentTelegramLines(telegramRow || row, getActorName(req.user), statusChanged ? "Status o'zgardi" : "Tahrirlandi")
    );

    await logAction(req.user.id, "update", "content_items", Number(req.params.id), {
      title: row.title
    });

    res.json(row);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: `Kontentni yangilab boвЂlmadi: ${err.message}` });
  } finally {
    client.release();
  }
});

app.post("/api/content/:id/mobilograf-progress", authRequired, pagePermissionAllowed("content"), async (req, res) => {
  if (!isMobilografAccount(req.user) && !isLeadershipRole(req.user?.role)) {
    return res.status(403).json({ message: "Bu amal faqat mobilograf workflow uchun" });
  }

  const statusMap = {
    started: "jarayonda",
    editing: "tayyorlanmoqda",
    ready: "tayyor",
    submitted: "tasdiqlandi",
    jarayonda: "jarayonda",
    tayyorlanmoqda: "tayyorlanmoqda",
    tayyor: "tayyor",
    tasdiqlandi: "tasdiqlandi"
  };
  const requestedStatus = String(req.body?.status || "").trim().toLowerCase();
  const nextStatus = statusMap[requestedStatus];
  if (!nextStatus) {
    return res.status(400).json({ message: "Mobilograf statusi noto'g'ri" });
  }

  const submittedUrl = normalizeNoticeUrl(req.body?.final_url || "");
  const note = String(req.body?.approval_comment || "").trim();
  if (requestedStatus === "submitted" && !submittedUrl) {
    return res.status(400).json({ message: "Link yuborish uchun ish linki majburiy" });
  }

  const client = await getClient();
  try {
    await client.query("BEGIN");
    const found = await client.query(`SELECT * FROM content_items WHERE id = $1 LIMIT 1`, [req.params.id]);
    if (!found.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Kontent topilmadi" });
    }

    const current = found.rows[0];
    const finalUrl = submittedUrl || current.final_url || "";
    const stamp = `${formatDateTimeText(new Date())} - ${getActorName(req.user)}: ${note || formatApprovalStatusForLog(nextStatus)}`;
    const approvalComment = [current.approval_comment, stamp].filter(Boolean).join("\n");

    const updated = await client.query(
      `
      UPDATE content_items
      SET
        status = $1,
        final_url = $2,
        approval_comment = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [nextStatus, finalUrl, approvalComment, req.params.id]
    );

    const row = updated.rows[0];
    await addApprovalComment("content", row.id, req.user.id, stamp);
    await logAction(req.user.id, "mobilograf_progress", "content_items", row.id, {
      status: nextStatus,
      has_final_url: !!finalUrl
    });
    await client.query("COMMIT");

    const telegramRow = await getContentDetailRow(query, row.id);
    createTelegramEvent(
      buildPlatformTelegramTitle("рџЋ¬", "Mobilograf progress", "kontent"),
      buildContentTelegramLines(telegramRow || row, getActorName(req.user), "Mobilograf yangiladi")
    );
    await createNotification(
      null,
      "Mobilograf progress",
      `${row.title || "Kontent"}: ${formatApprovalStatusForLog(nextStatus)}`,
      submittedUrl ? "success" : "info",
      "approval",
      "/content"
    );

    res.json(telegramRow || row);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: `Mobilograf progress saqlanmadi: ${err.message}` });
  } finally {
    client.release();
  }
});

app.delete("/api/content/:id", authRequired, actionPermissionAllowed("content", "delete"), async (req, res) => {
  try {
    const found = await query(
      `SELECT id, title, publish_date FROM content_items WHERE id = $1 LIMIT 1`,
      [req.params.id]
    );

    if (!found.rows.length) {
      return res.status(404).json({ message: "Kontent topilmadi" });
    }

    const row = found.rows[0];
    const dateOnly = normalizeDateOnly(row.publish_date);

    const deleted = await query(`DELETE FROM content_items WHERE id = $1 RETURNING id`, [req.params.id]);

    if (!deleted.rows.length) {
      return res.status(404).json({ message: "Kontent topilmadi" });
    }

    if (dateOnly) {
      const deletedBonusRows = await getBonusSyncRowsByTitleDate(query, row.title, dateOnly);
      await query(
        `DELETE FROM bonus_items WHERE content_title = $1 AND work_date = $2`,
        [row.title, dateOnly]
      );
      scheduleBonusDeleteSync(deletedBonusRows);
    }

    await logAction(req.user.id, "delete", "content_items", Number(req.params.id), {});
    createTelegramEvent(
      buildPlatformTelegramTitle("🗑️", "Kontent reja o'chirildi", "kontent"),
      [
        "#kontent #ochirildi",
        `🎬 Kontent: ${row.title || "-"}`,
        `📅 Sana: ${dateOnly || "-"}`,
        `👨‍💼 Muallif: ${getActorName(req.user)}`
      ]
    );
    res.json({ message: "Kontent oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kontentni oвЂchirib boвЂlmadi" });
  }
});

app.post("/api/content/batch-update", authRequired, actionPermissionAllowed("content", "edit"), async (req, res) => {
  const client = await getClient();
  try {
    const ids = [...new Set(
      (Array.isArray(req.body?.ids) ? req.body.ids : [])
        .map((id) => Number(id))
        .filter(Boolean)
    )];
    const updates = req.body?.updates || {};

    if (!ids.length) {
      return res.status(400).json({ message: "Tanlangan yozuvlar topilmadi" });
    }

    const hasStatus = typeof updates.status === "string" && updates.status.trim();
    const hasBonusEnabled = Object.prototype.hasOwnProperty.call(updates, "bonus_enabled");
    const hasDifficulty = typeof updates.difficulty_level === "string" && updates.difficulty_level.trim();
    const hasProposalCount = Object.prototype.hasOwnProperty.call(updates, "proposal_count");
    const hasApprovedCount = Object.prototype.hasOwnProperty.call(updates, "approved_count");

    if (!hasStatus && !hasBonusEnabled && !hasDifficulty && !hasProposalCount && !hasApprovedCount) {
      return res.status(400).json({ message: "Yangilash uchun maydon tanlanmagan" });
    }

    await client.query("BEGIN");

    const existingRes = await client.query(
      `SELECT * FROM content_items WHERE id = ANY($1::int[]) ORDER BY id ASC`,
      [ids]
    );

    if (!existingRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Kontent yozuvlari topilmadi" });
    }

    const updatedRows = [];
    const upsertSyncIds = new Set();
    const deletedSyncRows = [];

    for (const currentRow of existingRes.rows) {
      const nextBonusEnabled = hasBonusEnabled ? !!updates.bonus_enabled : !!currentRow.bonus_enabled;
      const nextStatus = hasStatus ? String(updates.status).trim() : currentRow.status;
      const nextDifficulty = nextBonusEnabled
        ? (hasDifficulty ? normalizeDifficultyLevel(updates.difficulty_level) : normalizeDifficultyLevel(currentRow.difficulty_level || "sodda"))
        : "bonussiz";
      const nextProposalCount = nextBonusEnabled
        ? (hasProposalCount ? Math.max(0, Number(updates.proposal_count || 0)) : Number(currentRow.proposal_count || 0))
        : 0;
      const nextApprovedCount = nextBonusEnabled
        ? (hasApprovedCount ? Math.max(0, Number(updates.approved_count || 0)) : Number(currentRow.approved_count || 0))
        : 0;

      const updated = await client.query(
        `
        UPDATE content_items
        SET
          status = $1,
          bonus_enabled = $2,
          proposal_count = $3,
          approved_count = $4,
          difficulty_level = $5,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
        `,
        [nextStatus, nextBonusEnabled, nextProposalCount, nextApprovedCount, nextDifficulty, currentRow.id]
      );

      const row = updated.rows[0];
      updatedRows.push(row);

      const syncMeta = await upsertBonusFromContentRow(client, row, req.user.id);
      if (syncMeta?.action === "upsert" && syncMeta.bonusItemId) {
        upsertSyncIds.add(syncMeta.bonusItemId);
      }
      if (syncMeta?.action === "delete" && Array.isArray(syncMeta.deletedRows)) {
        deletedSyncRows.push(...syncMeta.deletedRows);
      }

      if (currentRow.status !== row.status) {
        const approvalMeta = getApprovalNotificationMeta(row.status, row.title);
        if (approvalMeta) {
          await createNotification(null, approvalMeta.title, approvalMeta.body, approvalMeta.type, "approval", "/content");
        }
      }

      await logAction(req.user.id, "batch_update", "content_items", row.id, {
        status: row.status,
        bonus_enabled: row.bonus_enabled,
        difficulty_level: row.difficulty_level
      });
    }

    await client.query("COMMIT");

    upsertSyncIds.forEach((bonusId) => scheduleBonusUpsertSync(bonusId));
    if (deletedSyncRows.length) {
      scheduleBonusDeleteSync(deletedSyncRows);
    }

    res.json({
      message: `${updatedRows.length} ta yozuv yangilandi`,
      updated_count: updatedRows.length
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: `Batch yangilashda xatolik: ${err.message}` });
  } finally {
    client.release();
  }
});

app.post("/api/content/batch-delete", authRequired, actionPermissionAllowed("content", "delete"), async (req, res) => {
  const client = await getClient();
  try {
    const ids = [...new Set(
      (Array.isArray(req.body?.ids) ? req.body.ids : [])
        .map((id) => Number(id))
        .filter(Boolean)
    )];

    if (!ids.length) {
      return res.status(400).json({ message: "Tanlangan yozuvlar topilmadi" });
    }

    await client.query("BEGIN");

    const rowsRes = await client.query(
      `SELECT id, title, publish_date FROM content_items WHERE id = ANY($1::int[])`,
      [ids]
    );

    if (!rowsRes.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Kontent yozuvlari topilmadi" });
    }

    const deletedRes = await client.query(
      `DELETE FROM content_items WHERE id = ANY($1::int[]) RETURNING id`,
      [ids]
    );

    const deletedSyncRows = [];
    for (const row of rowsRes.rows) {
      const dateOnly = normalizeDateOnly(row.publish_date);
      if (!dateOnly) continue;
      const bonusRows = await getBonusSyncRowsByTitleDate(client, row.title, dateOnly);
      if (bonusRows.length) {
        deletedSyncRows.push(...bonusRows);
      }
      await client.query(
        `DELETE FROM bonus_items WHERE content_title = $1 AND work_date = $2`,
        [row.title, dateOnly]
      );
    }

    for (const row of rowsRes.rows) {
      await logAction(req.user.id, "batch_delete", "content_items", Number(row.id), {});
    }

    await client.query("COMMIT");

    if (deletedSyncRows.length) {
      scheduleBonusDeleteSync(deletedSyncRows);
    }

    res.json({
      message: `${deletedRes.rows.length} ta yozuv o'chirildi`,
      deleted_count: deletedRes.rows.length
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: `Batch o'chirishda xatolik: ${err.message}` });
  } finally {
    client.release();
  }
});

/* BONUS */

async function getBonusDetailRow(db, id) {
  const result = await runDbQuery(
    db,
    `
    SELECT
      bi.*,
      u.full_name,
      ve.full_name AS video_editor_name,
      vf.full_name AS video_face_name,
      br.name AS branch_name,
      approver.full_name AS approved_by_name
    FROM bonus_items bi
    LEFT JOIN users u ON u.id = bi.user_id
    LEFT JOIN users ve ON ve.id = bi.video_editor_user_id
    LEFT JOIN users vf ON vf.id = bi.video_face_user_id
    LEFT JOIN branches br ON br.id = bi.branch_id
    LEFT JOIN users approver ON approver.id = bi.approved_by
    WHERE bi.id = $1
    LIMIT 1
    `,
    [id]
  );
  return result.rows[0] || null;
}

function isBonusRowLocked(row = {}) {
  return !!row?.monthly_closed_at || String(row?.paid_status || "").toLowerCase() === "paid";
}

function isMobilografActor(user = {}) {
  const role = String(user?.role || "").toLowerCase();
  const departmentRole = String(user?.department_role || "").toLowerCase();
  return role.includes("mobilograf") || departmentRole.includes("mobilograf") || role.includes("video") || departmentRole.includes("video");
}

function bonusRowBelongsToUser(row = {}, userId) {
  const normalizedUserId = String(userId || "");
  return [
    row.user_id,
    row.video_editor_user_id,
    row.video_face_user_id,
    row.created_by
  ].some((value) => String(value || "") === normalizedUserId);
}

function requestedBonusBelongsToUser(payload = {}, userId) {
  const normalizedUserId = String(userId || "");
  const contentType = String(payload.content_type || "").toLowerCase();
  const candidateIds = contentType === "video"
    ? [payload.video_editor_user_id, payload.video_face_user_id, payload.user_id]
    : [payload.user_id];
  return candidateIds.some((value) => String(value || "") === normalizedUserId);
}

function normalizePaidStatus(value) {
  const normalized = String(value || "pending").trim().toLowerCase();
  if (["approved", "paid"].includes(normalized)) return normalized;
  return "pending";
}

app.get("/api/bonus-items", authRequired, pagePermissionAllowed("bonus"), async (req, res) => {
  try {
    try {
      await pullBonusUpdatesFromMySeOne();
    } catch (syncErr) {
      console.error("my.se-one bonus pull sync error:", syncErr.message);
    }

    await recomputeBonusFromItems();

    const params = [];
    const role = String(req.user?.role || "").toLowerCase();
    const departmentRole = String(req.user?.department_role || "").toLowerCase();
    const shouldScopeToUser =
      String(req.query?.scope || "").toLowerCase() === "mine" ||
      role.includes("mobilograf") ||
      departmentRole.includes("mobilograf");
    const scopeWhere = shouldScopeToUser
      ? `WHERE (
          bi.user_id = $1 OR
          bi.video_editor_user_id = $1 OR
          bi.video_face_user_id = $1 OR
          bi.created_by = $1
        )`
      : "";
    if (shouldScopeToUser) params.push(req.user.id);

    const result = await query(
      `
      SELECT
        bi.*,
        u.full_name,
        ve.full_name AS video_editor_name,
        vf.full_name AS video_face_name,
        br.name AS branch_name,
        approver.full_name AS approved_by_name
      FROM bonus_items bi
      LEFT JOIN users u ON u.id = bi.user_id
      LEFT JOIN users ve ON ve.id = bi.video_editor_user_id
      LEFT JOIN users vf ON vf.id = bi.video_face_user_id
      LEFT JOIN branches br ON br.id = bi.branch_id
      LEFT JOIN users approver ON approver.id = bi.approved_by
      ${scopeWhere}
      ORDER BY bi.work_date DESC NULLS LAST, bi.id DESC
      `,
      params
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Bonus maвЂ™lumotlarini olib boвЂlmadi" });
  }
});

app.post("/api/bonus-items/sync-from-myseone", authRequired, pagePermissionAllowed("bonus"), async (_req, res) => {
  try {
    const result = await pullBonusUpdatesFromMySeOne(true);
    await recomputeBonusFromItems();
    res.json({ success: true, ...result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `my.se-one bonus sync bajarilmadi: ${err.message}` });
  }
});

app.post("/api/bonus-items", authRequired, actionPermissionAllowed("bonus", "create"), async (req, res) => {
  try {
    const {
      month_label,
      work_date,
      content_type,
      content_title,
      proposal_count,
      approved_count,
      difficulty_level,
      work_url,
      user_id,
      video_editor_user_id,
      video_face_user_id,
      branch_id,
      audit_reason
    } = req.body;

    const dateOnly = formatDateOnly(work_date);
    const month = month_label || getMonthLabel(dateOnly || new Date());
    const difficultyLevel = normalizeDifficultyLevel(difficulty_level || "sodda");

    if (isMobilografActor(req.user) && !requestedBonusBelongsToUser(req.body, req.user.id)) {
      return res.status(403).json({ message: "Mobilograf faqat o'z bonus yozuvini yaratishi mumkin" });
    }

    const proposalAmount = 0;
    const approvedAmount = await calcMoney(approved_count, difficultyLevel);
    const totalAmount = approvedAmount;

    const inserted = await query(
      `
      INSERT INTO bonus_items
      (
        month_label,
        work_date,
        content_type,
        content_title,
        work_url,
        proposal_count,
        approved_count,
        proposal_amount,
        approved_amount,
        total_amount,
        difficulty_level,
        user_id,
        video_editor_user_id,
        video_face_user_id,
        branch_id,
        approval_status,
        approved_by,
        approved_at,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'draft',NULL,NULL,$16)
      RETURNING *
      `,
      [
        month,
        dateOnly,
        content_type || "post",
        content_title || "",
        work_url || "",
        Number(proposal_count || 0),
        Number(approved_count || 0),
        proposalAmount,
        approvedAmount,
        totalAmount,
        difficultyLevel,
        content_type === "video"
          ? video_editor_user_id || video_face_user_id || user_id || null
          : user_id || null,
        content_type === "video" ? video_editor_user_id || null : null,
        content_type === "video" ? video_face_user_id || null : null,
        branch_id || null,
        req.user.id
      ]
    );

    await logAction(req.user.id, "create", "bonus_items", inserted.rows[0].id, {
      content_title
    });

    const telegramRow = await getBonusDetailRow(query, inserted.rows[0].id);
    createTelegramEvent(
      buildPlatformTelegramTitle("💳", "Bonus yozuvi yaratildi", "bonus"),
      buildBonusTelegramLines(telegramRow || inserted.rows[0], getActorName(req.user), "Yaratildi")
    );

    scheduleBonusUpsertSync(inserted.rows[0].id, { allowFrozenMonth: true });
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Bonus hisobotini qoвЂshib boвЂlmadi: ${err.message}` });
  }
});

app.put("/api/bonus-items/:id", authRequired, actionPermissionAllowed("bonus", "edit"), async (req, res) => {
  try {
    const {
      month_label,
      work_date,
      content_type,
      content_title,
      proposal_count,
      approved_count,
      difficulty_level,
      work_url,
      user_id,
      video_editor_user_id,
      video_face_user_id,
      branch_id,
      audit_reason
    } = req.body;

    const dateOnly = formatDateOnly(work_date);
    const month = month_label || getMonthLabel(dateOnly || new Date());
    const difficultyLevel = normalizeDifficultyLevel(difficulty_level || "sodda");

    const proposalAmount = 0;
    const approvedAmount = await calcMoney(approved_count, difficultyLevel);
    const totalAmount = approvedAmount;
    const current = await getBonusDetailRow(query, req.params.id);

    if (!current) {
      return res.status(404).json({ message: "Bonus yozuvi topilmadi" });
    }

    if (
      isMobilografActor(req.user) &&
      (!bonusRowBelongsToUser(current, req.user.id) || !requestedBonusBelongsToUser(req.body, req.user.id))
    ) {
      return res.status(403).json({ message: "Mobilograf faqat o'z bonus yozuvini tahrirlashi mumkin" });
    }

    if (isBonusRowLocked(current) && !String(audit_reason || "").trim()) {
      return res.status(423).json({ message: "Bu oy yopilgan. O'zgartirish uchun audit sababi majburiy." });
    }

    const updated = await query(
      `
      UPDATE bonus_items
      SET
        month_label = $1,
        work_date = $2,
        content_type = $3,
        content_title = $4,
        work_url = $5,
        proposal_count = $6,
        approved_count = $7,
        proposal_amount = $8,
        approved_amount = $9,
        total_amount = $10,
        difficulty_level = $11,
        user_id = $12,
        video_editor_user_id = $13,
        video_face_user_id = $14,
        branch_id = $15,
        approval_status = 'draft',
        approved_by = NULL,
        approved_at = NULL,
        paid_status = CASE WHEN monthly_closed_at IS NOT NULL THEN paid_status ELSE 'pending' END,
        audit_reason = COALESCE(NULLIF($17, ''), audit_reason),
        myseone_sync_status = 'pending',
        myseone_sync_error = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $16
      RETURNING *
      `,
      [
        month,
        dateOnly,
        content_type || "post",
        content_title || "",
        work_url || "",
        Number(proposal_count || 0),
        Number(approved_count || 0),
        proposalAmount,
        approvedAmount,
        totalAmount,
        difficultyLevel,
        content_type === "video"
          ? video_editor_user_id || video_face_user_id || user_id || null
          : user_id || null,
        content_type === "video" ? video_editor_user_id || null : null,
        content_type === "video" ? video_face_user_id || null : null,
        branch_id || null,
        req.params.id,
        String(audit_reason || "").trim()
      ]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Bonus yozuvi topilmadi" });
    }

    await logAction(req.user.id, "update", "bonus_items", Number(req.params.id), {
      content_title,
      audit_reason: audit_reason || null,
      locked_override: isBonusRowLocked(current)
    });

    const telegramRow = await getBonusDetailRow(query, updated.rows[0].id);
    createTelegramEvent(
      buildPlatformTelegramTitle("✏️", "Bonus yozuvi yangilandi", "bonus"),
      buildBonusTelegramLines(telegramRow || updated.rows[0], getActorName(req.user), "Tahrirlandi")
    );

    scheduleBonusUpsertSync(updated.rows[0].id, { allowFrozenMonth: true });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Bonus hisobotini yangilab boвЂlmadi: ${err.message}` });
  }
});

app.post("/api/bonus-items/approve-month", authRequired, pagePermissionAllowed("bonus"), rolesAllowed("admin", "manager"), async (req, res) => {
  const { month_label, items = [] } = req.body || {};
  const month = String(month_label || "").trim();

  if (!month) {
    return res.status(400).json({ message: "Oy tanlanmagan" });
  }

  if (!Array.isArray(items) || !items.length) {
    return res.status(400).json({ message: "Tasdiqlash uchun bonus yozuvlari topilmadi" });
  }

  const client = await getClient();

  try {
    await client.query("BEGIN");

    for (const row of items) {
      const itemId = Number(row?.id || 0);
      const approvedCount = Math.max(0, Number(row?.approved_count || 0));

      if (!itemId) {
        throw new Error("Bonus yozuvi ID topilmadi");
      }

      const currentRow = await client.query(
        `SELECT difficulty_level FROM bonus_items WHERE id = $1 AND month_label = $2 LIMIT 1`,
        [itemId, month]
      );

      if (!currentRow.rows.length) {
        throw new Error("Bonus yozuvi topilmadi yoki oy mos emas");
      }

      const approvedAmount = approvedCount * getDifficultyUnitAmount(currentRow.rows[0].difficulty_level);

      const updated = await client.query(
        `
        UPDATE bonus_items
        SET
          approved_count = $1,
          proposal_amount = 0,
          approved_amount = $2,
          total_amount = $2,
          approval_status = 'approved',
          paid_status = CASE WHEN paid_status = 'paid' THEN 'paid' ELSE 'approved' END,
          approved_by = $3,
          approved_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND month_label = $5
        `,
        [approvedCount, approvedAmount, req.user.id, itemId, month]
      );

      if (!updated.rowCount) {
        throw new Error("Bonus yozuvi topilmadi yoki oy mos emas");
      }
    }

    const refreshed = await client.query(
      `
      SELECT
        bi.*,
        u.full_name,
        ve.full_name AS video_editor_name,
        vf.full_name AS video_face_name,
        br.name AS branch_name,
        approver.full_name AS approved_by_name
      FROM bonus_items bi
      LEFT JOIN users u ON u.id = bi.user_id
      LEFT JOIN users ve ON ve.id = bi.video_editor_user_id
      LEFT JOIN users vf ON vf.id = bi.video_face_user_id
      LEFT JOIN branches br ON br.id = bi.branch_id
      LEFT JOIN users approver ON approver.id = bi.approved_by
      WHERE bi.month_label = $1
      ORDER BY bi.work_date DESC NULLS LAST, bi.id DESC
      `,
      [month]
    );

    await client.query("COMMIT");
    await logAction(req.user.id, "approve", "bonus_items", null, {
      month_label: month,
      item_count: items.length
    });
    const totalAmount = refreshed.rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    createTelegramEvent(
      buildPlatformTelegramTitle("✅", "Oylik bonus tasdiqlandi", "bonus"),
      [
        "#bonus #tasdiq #monthly_close",
        `📅 Oy: ${month}`,
        `🧾 Yozuvlar: ${refreshed.rows.length}`,
        `💳 Jami summa: ${formatTelegramMoney(totalAmount)}`,
        `👨‍💼 Tasdiqladi: ${getActorName(req.user)}`
      ]
    );
    res.json({
      message: `${month} bonuslari tasdiqlandi`,
      items: refreshed.rows
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: err.message || "Bonuslarni tasdiqlab bo'lmadi" });
  } finally {
    client.release();
  }
});

app.post("/api/bonus-items/revoke-month", authRequired, pagePermissionAllowed("bonus"), rolesAllowed("admin", "manager"), async (req, res) => {
  const month = String(req.body?.month_label || "").trim();

  if (!month) {
    return res.status(400).json({ message: "Oy tanlanmagan" });
  }

  try {
    const revoked = await query(
      `
      UPDATE bonus_items
      SET
        approved_count = 0,
        proposal_amount = 0,
        approved_amount = 0,
        total_amount = 0,
        approval_status = 'draft',
        paid_status = 'pending',
        paid_at = NULL,
        paid_by = NULL,
        approved_by = NULL,
        approved_at = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE month_label = $1
      RETURNING id
      `,
      [month]
    );

    if (!revoked.rows.length) {
      return res.status(404).json({ message: "Bekor qilish uchun bonus yozuvi topilmadi" });
    }

    await logAction(req.user.id, "revoke", "bonus_items", null, { month_label: month });
    createTelegramEvent(
      buildPlatformTelegramTitle("↩️", "Bonus tasdig'i bekor qilindi", "bonus"),
      [
        "#bonus #audit #revoke",
        `📅 Oy: ${month}`,
        `🧾 Yozuvlar: ${revoked.rows.length}`,
        `👨‍💼 Muallif: ${getActorName(req.user)}`
      ]
    );
    res.json({ success: true, count: revoked.rows.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Bonus tasdig'ini bekor qilib bo'lmadi: ${err.message}` });
  }
});

app.post("/api/bonus-items/monthly-close", authRequired, pagePermissionAllowed("bonus"), rolesAllowed("admin", "manager"), async (req, res) => {
  const month = String(req.body?.month_label || getMonthLabel()).trim();
  const client = await getClient();

  try {
    await client.query("BEGIN");

    const closed = await client.query(
      `
      UPDATE bonus_items
      SET
        approved_count = CASE WHEN COALESCE(approved_count, 0) > 0 THEN approved_count ELSE COALESCE(proposal_count, 0) END,
        proposal_amount = 0,
        approved_amount = (CASE WHEN COALESCE(approved_count, 0) > 0 THEN approved_count ELSE COALESCE(proposal_count, 0) END) *
          CASE
            WHEN difficulty_level = 'orta' THEN 50000
            WHEN difficulty_level = 'murakkab' THEN 75000
            WHEN difficulty_level = 'juda_murakkab' THEN 100000
            WHEN difficulty_level = 'bonussiz' THEN 0
            ELSE 25000
          END,
        total_amount = (CASE WHEN COALESCE(approved_count, 0) > 0 THEN approved_count ELSE COALESCE(proposal_count, 0) END) *
          CASE
            WHEN difficulty_level = 'orta' THEN 50000
            WHEN difficulty_level = 'murakkab' THEN 75000
            WHEN difficulty_level = 'juda_murakkab' THEN 100000
            WHEN difficulty_level = 'bonussiz' THEN 0
            ELSE 25000
          END,
        approval_status = 'approved',
        monthly_closed_at = CURRENT_TIMESTAMP,
        monthly_closed_by = $2,
        paid_status = CASE WHEN paid_status = 'paid' THEN 'paid' ELSE 'approved' END,
        approved_by = $2,
        approved_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE month_label = $1
      RETURNING *
      `,
      [month, req.user.id]
    );

    if (!closed.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Yopish uchun bonus yozuvlari topilmadi" });
    }

    const totalAmount = closed.rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    const snapshot = {
      month_label: month,
      item_count: closed.rows.length,
      bonus_total: totalAmount,
      closed_by: req.user.id,
      closed_at: new Date().toISOString()
    };

    await client.query(
      `INSERT INTO monthly_snapshots (month_label, snapshot_type, payload_json, created_by) VALUES ($1,$2,$3,$4)`,
      [month, "bonus_monthly_close", JSON.stringify(snapshot), req.user.id]
    );

    await client.query("COMMIT");
    await logAction(req.user.id, "monthly_close", "bonus_items", null, snapshot);
    createTelegramEvent(
      buildPlatformTelegramTitle("🔒", "Bonus oyi yopildi", "bonus"),
      [
        "#bonus #monthly_close #payroll",
        `📅 Oy: ${month}`,
        `🧾 Yozuvlar: ${closed.rows.length}`,
        `💳 Jami bonus: ${formatTelegramMoney(totalAmount)}`,
        `👨‍💼 Yopdi: ${getActorName(req.user)}`
      ]
    );

    res.json({ success: true, ...snapshot });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: `Bonus oyini yopib bo'lmadi: ${err.message}` });
  } finally {
    client.release();
  }
});

app.get("/api/bonus-items/audit", authRequired, pagePermissionAllowed("bonus"), async (req, res) => {
  try {
    const month = String(req.query.month || "").trim();
    const params = [];
    let where = `WHERE a.entity_type = 'bonus_items'`;
    if (month) {
      params.push(month);
      where += ` AND (a.meta->>'month_label' = $1 OR a.created_at >= ($1 || '-01')::date AND a.created_at < (($1 || '-01')::date + INTERVAL '1 month'))`;
    }
    const result = await query(
      `
      SELECT a.*, u.full_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ${where}
      ORDER BY a.id DESC
      LIMIT 80
      `,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Bonus audit log olib bo'lmadi: ${err.message}` });
  }
});

app.post("/api/bonus-items/mark-paid", authRequired, pagePermissionAllowed("bonus"), rolesAllowed("admin", "manager"), async (req, res) => {
  const month = String(req.body?.month_label || "").trim();
  const ids = [...new Set((Array.isArray(req.body?.ids) ? req.body.ids : []).map((id) => Number(id)).filter(Boolean))];

  if (!month && !ids.length) {
    return res.status(400).json({ message: "Oy yoki bonus yozuvlari tanlanmagan" });
  }

  try {
    const params = [req.user.id];
    let where = `approval_status = 'approved'`;
    if (ids.length) {
      params.push(ids);
      where += ` AND id = ANY($${params.length}::int[])`;
    }
    if (month) {
      params.push(month);
      where += ` AND month_label = $${params.length}`;
    }

    const updated = await query(
      `
      UPDATE bonus_items
      SET
        paid_status = 'paid',
        paid_at = CURRENT_TIMESTAMP,
        paid_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE ${where}
      RETURNING *
      `,
      params
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "To'lovga tayyor bonus yozuvi topilmadi" });
    }

    const totalAmount = updated.rows.reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
    await logAction(req.user.id, "mark_paid", "bonus_items", null, {
      month_label: month || null,
      ids,
      item_count: updated.rows.length,
      total_amount: totalAmount
    });
    createTelegramEvent(
      buildPlatformTelegramTitle("💸", "Bonus to'landi", "bonus"),
      [
        "#bonus #paid #payroll",
        month ? `📅 Oy: ${month}` : null,
        `🧾 Yozuvlar: ${updated.rows.length}`,
        `💳 Summa: ${formatTelegramMoney(totalAmount)}`,
        `👨‍💼 Belgiladi: ${getActorName(req.user)}`
      ].filter(Boolean)
    );

    res.json({ success: true, count: updated.rows.length, total_amount: totalAmount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Bonus to'lov statusini yangilab bo'lmadi: ${err.message}` });
  }
});

app.post("/api/bonus-items/:id/delete-with-audit", authRequired, actionPermissionAllowed("bonus", "delete"), async (req, res) => {
  try {
    const syncRow = await getBonusSyncRowById(query, req.params.id);
    const telegramRow = await getBonusDetailRow(query, req.params.id);
    const auditReason = String(req.body?.audit_reason || "").trim();
    if (!telegramRow) {
      return res.status(404).json({ message: "Bonus yozuvi topilmadi" });
    }
    if (isMobilografActor(req.user) && !bonusRowBelongsToUser(telegramRow, req.user.id)) {
      return res.status(403).json({ message: "Mobilograf faqat o'z bonus yozuvini o'chirishi mumkin" });
    }
    if (isBonusRowLocked(telegramRow) && !auditReason) {
      return res.status(423).json({ message: "Bu oy yopilgan. O'chirish uchun audit sababi majburiy." });
    }
    const deleted = await query(`DELETE FROM bonus_items WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!deleted.rows.length) {
      return res.status(404).json({ message: "Bonus yozuvi topilmadi" });
    }
    if (syncRow) {
      scheduleBonusDeleteSync([syncRow]);
    }
    await logAction(req.user.id, "delete", "bonus_items", Number(req.params.id), {
      audit_reason: auditReason || null,
      locked_override: isBonusRowLocked(telegramRow)
    });
    createTelegramEvent(
      buildPlatformTelegramTitle("🗑️", "Bonus yozuvi o'chirildi", "bonus"),
      buildBonusTelegramLines(telegramRow || syncRow || {}, getActorName(req.user), "O'chirildi")
    );
    res.json({ message: "Bonus yozuvi o'chirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Bonus yozuvini o'chirib bo'lmadi" });
  }
});

app.delete("/api/bonus-items/:id", authRequired, actionPermissionAllowed("bonus", "delete"), async (req, res) => {
  try {
    const syncRow = await getBonusSyncRowById(query, req.params.id);
    const telegramRow = await getBonusDetailRow(query, req.params.id);
    if (!telegramRow) {
      return res.status(404).json({ message: "Bonus yozuvi topilmadi" });
    }
    if (isMobilografActor(req.user) && !bonusRowBelongsToUser(telegramRow, req.user.id)) {
      return res.status(403).json({ message: "Mobilograf faqat o'z bonus yozuvini o'chirishi mumkin" });
    }
    if (isBonusRowLocked(telegramRow) && !String(req.query?.audit_reason || req.body?.audit_reason || "").trim()) {
      return res.status(423).json({ message: "Bu oy yopilgan. O'chirish uchun audit sababi majburiy." });
    }
    const deleted = await query(`DELETE FROM bonus_items WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!deleted.rows.length) {
      return res.status(404).json({ message: "Bonus yozuvi topilmadi" });
    }
    if (syncRow) {
      scheduleBonusDeleteSync([syncRow]);
    }
    await logAction(req.user.id, "delete", "bonus_items", Number(req.params.id), {
      audit_reason: req.query?.audit_reason || req.body?.audit_reason || null,
      locked_override: isBonusRowLocked(telegramRow)
    });
    createTelegramEvent(
      buildPlatformTelegramTitle("🗑️", "Bonus yozuvi o'chirildi", "bonus"),
      buildBonusTelegramLines(telegramRow || syncRow || {}, getActorName(req.user), "O'chirildi")
    );
    res.json({ message: "Bonus yozuvi oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Bonus yozuvini oвЂchirib boвЂlmadi" });
  }
});

/* DAILY REPORTS */

app.get("/api/daily-reports", authRequired, async (req, res) => {
  try {
    const { date } = req.query;
    const params = [];

    let sql = `
      SELECT
        d.*,
        b.name AS branch_name
      FROM daily_branch_reports d
      LEFT JOIN branches b ON b.id = d.branch_id
    `;

    if (date) {
      sql += ` WHERE d.report_date = $1 `;
      params.push(normalizeDateOnly(date));
    }

    sql += ` ORDER BY d.report_date DESC, d.id DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hisobotlarni olib boвЂlmadi" });
  }
});

app.post(
  "/api/daily-reports/import-images",
  authRequired,
  upload.fields([
    { name: "content_image", maxCount: 1 },
    { name: "metrics_image", maxCount: 1 }
  ]),
  async (req, res) => {
    const contentImagePath = req.files?.content_image?.[0]?.path;
    const metricsImagePath = req.files?.metrics_image?.[0]?.path;

    if (!contentImagePath || !metricsImagePath) {
      return res.status(400).json({ message: "2 ta rasm yuklash majburiy" });
    }

    try {
      const branches = (await query(`SELECT id, name FROM branches ORDER BY id ASC`)).rows;
      const imported = await importDailyReportsFromImages({
        contentImagePath,
        metricsImagePath,
        branches,
        reportDate: req.body?.report_date
      });

      const savedRows = [];
      for (const row of imported.rows) {
        const existingRows = await query(
          `
          SELECT id
          FROM daily_branch_reports
          WHERE report_date = $1 AND branch_id = $2
          ORDER BY id ASC
          `,
          [row.report_date, row.branch_id]
        );

        if (existingRows.rows.length) {
          const primaryId = existingRows.rows[0].id;
          const updated = await query(
            `
            UPDATE daily_branch_reports
            SET
              stories_count = $1,
              posts_count = $2,
              reels_count = 0,
              subscriber_count = $3,
              condition_text = $4,
              notes = CASE
                WHEN COALESCE(NULLIF($5, ''), '') <> '' THEN $5
                ELSE notes
              END,
              updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
            `,
            [
              Number(row.stories_count || 0),
              Number(row.posts_count || 0),
              Number(row.subscriber_count || 0),
              row.condition_text || "",
              row.notes || "",
              primaryId
            ]
          );

          if (existingRows.rows.length > 1) {
            await query(
              `DELETE FROM daily_branch_reports WHERE id = ANY($1::int[])`,
              [existingRows.rows.slice(1).map((item) => Number(item.id))]
            );
          }

          if (updated.rows[0]) {
            savedRows.push(updated.rows[0]);
          }
          continue;
        }

        const inserted = await query(
          `
          INSERT INTO daily_branch_reports
          (
            report_date,
            branch_id,
            stories_count,
            posts_count,
            reels_count,
            subscriber_count,
            condition_text,
            notes,
            created_by
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING *
          `,
          [
            row.report_date,
            row.branch_id,
            Number(row.stories_count || 0),
            Number(row.posts_count || 0),
            0,
            Number(row.subscriber_count || 0),
            row.condition_text || "",
            row.notes || "",
            req.user.id
          ]
        );
        if (inserted.rows[0]) {
          savedRows.push(inserted.rows[0]);
        }
      }

      await createNotification(
        null,
        "Kunlik hisobot rasmdan to'ldirildi",
        `${imported.reportDate} sanaga ${savedRows.length} ta filial yozuvi tayyorlandi`,
        "success"
      );
      await logAction(req.user.id, "import", "daily_branch_reports", null, {
        report_date: imported.reportDate,
        imported_count: savedRows.length,
        warnings: imported.warnings
      });

      res.json({
        message: "Rasmlar tahlil qilinib, hisobotlar to'ldirildi",
        report_date: imported.reportDate,
        imported_count: savedRows.length,
        parsed_content_branches: imported.parsedContentBranches,
        parsed_audience_branches: imported.parsedAudienceBranches,
        warnings: imported.warnings
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: `Rasmlarni o'qib bo'lmadi: ${err.message}` });
    } finally {
      await Promise.all(
        [contentImagePath, metricsImagePath]
          .filter(Boolean)
          .map((filePath) => fs.promises.unlink(filePath).catch(() => null))
      );
    }
  }
);

app.post("/api/daily-reports", authRequired, async (req, res) => {
  try {
    const {
      report_date,
      branch_id,
      stories_count,
      posts_count,
      subscriber_count,
      condition_text,
      notes
    } = req.body;

    const inserted = await query(
      `
      INSERT INTO daily_branch_reports
      (
        report_date,
        branch_id,
        stories_count,
        posts_count,
        reels_count,
        subscriber_count,
        condition_text,
        notes,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *
      `,
      [
        formatDateOnly(report_date),
        branch_id || null,
        Number(stories_count || 0),
        Number(posts_count || 0),
        0,
        Number(subscriber_count || 0),
        condition_text || "",
        notes || "",
        req.user.id
      ]
    );

    await createNotification(null, "Yangi hisobot kiritildi", formatDateOnly(report_date), "success");
    await logAction(req.user.id, "create", "daily_branch_reports", inserted.rows[0].id, {});
    createTelegramEvent(buildPlatformTelegramTitle("рџ“Љ", "Daily report kiritildi", "daily_report"), [
      "#daily_report #filial",
      `Sana: ${formatDateOnly(inserted.rows[0].report_date) || "-"}`,
      `Filial ID: ${inserted.rows[0].branch_id || "-"}`,
      `Stories: ${inserted.rows[0].stories_count || 0}`,
      `Post: ${inserted.rows[0].posts_count || 0}`,
      `Subscriber: ${inserted.rows[0].subscriber_count || 0}`,
      `Kiritdi: ${getActorName(req.user)}`
    ]);

    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kunlik hisobotni saqlab boвЂlmadi" });
  }
});

app.put("/api/daily-reports/:id", authRequired, async (req, res) => {
  try {
    const {
      report_date,
      branch_id,
      stories_count,
      posts_count,
      subscriber_count,
      condition_text,
      notes
    } = req.body;

    const updated = await query(
      `
      UPDATE daily_branch_reports
      SET
        report_date = $1,
        branch_id = $2,
        stories_count = $3,
        posts_count = $4,
        reels_count = $5,
        subscriber_count = $6,
        condition_text = $7,
        notes = $8,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $9
      RETURNING *
      `,
      [
        formatDateOnly(report_date),
        branch_id || null,
        Number(stories_count || 0),
        Number(posts_count || 0),
        0,
        Number(subscriber_count || 0),
        condition_text || "",
        notes || "",
        req.params.id
      ]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Hisobot topilmadi" });
    }

    await logAction(req.user.id, "update", "daily_branch_reports", Number(req.params.id), {});
    createTelegramEvent(buildPlatformTelegramTitle("вњЏпёЏ", "Daily report yangilandi", "daily_report"), [
      "#daily_report #filial",
      `Sana: ${formatDateOnly(updated.rows[0].report_date) || "-"}`,
      `Filial ID: ${updated.rows[0].branch_id || "-"}`,
      `Stories: ${updated.rows[0].stories_count || 0}`,
      `Post: ${updated.rows[0].posts_count || 0}`,
      `Yangiladi: ${getActorName(req.user)}`
    ]);
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hisobotni yangilab boвЂlmadi" });
  }
});

app.delete("/api/daily-reports/:id", authRequired, async (req, res) => {
  try {
    const deleted = await query(`DELETE FROM daily_branch_reports WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!deleted.rows.length) {
      return res.status(404).json({ message: "Hisobot topilmadi" });
    }
    await logAction(req.user.id, "delete", "daily_branch_reports", Number(req.params.id), {});
    createTelegramEvent(buildPlatformTelegramTitle("рџ—‘пёЏ", "Daily report o'chirildi", "daily_report"), [
      "#daily_report #filial",
      `Sana: ${formatDateOnly(deleted.rows[0].report_date) || "-"}`,
      `Filial ID: ${deleted.rows[0].branch_id || "-"}`,
      `O'chirdi: ${getActorName(req.user)}`
    ]);
    res.json({ message: "Hisobot oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hisobotni oвЂchirib boвЂlmadi" });
  }
});

/* CAMPAIGNS */

app.get("/api/campaigns", authRequired, async (_, res) => {
  try {
    runDetached("campaign lifecycle refresh", async () => {
      await syncCampaignLifecycleNotifications();
    });
    const result = await query(
      `
      SELECT
        c.*,
        b.name AS branch_name,
        COALESCE(cl.lead_count, 0) AS lead_count
      FROM campaigns c
      LEFT JOIN branches b ON b.id = c.branch_id
      LEFT JOIN (
        SELECT campaign_id, COUNT(*)::int AS lead_count
        FROM campaign_leads
        GROUP BY campaign_id
      ) cl ON cl.campaign_id = c.id
      ORDER BY c.start_at DESC NULLS LAST, c.start_date DESC NULLS LAST, c.id DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kampaniyalarni olib boвЂlmadi" });
  }
});

app.get("/api/public/campaign-forms/:id", async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
        c.id,
        c.title,
        c.platform,
        c.status,
        c.start_at,
        c.end_at,
        c.lead_chat_id,
        b.name AS branch_name
      FROM campaigns c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.id = $1
      LIMIT 1
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Kampaniya topilmadi" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Forma ma'lumotini olib bo'lmadi" });
  }
});

app.post("/api/public/campaign-forms/:id/submit", async (req, res) => {
  try {
    const campaignRes = await query(
      `
      SELECT
        c.id,
        c.title,
        c.platform,
        c.branch_id,
        c.lead_chat_id,
        b.name AS branch_name
      FROM campaigns c
      LEFT JOIN branches b ON b.id = c.branch_id
      WHERE c.id = $1
      LIMIT 1
      `,
      [req.params.id]
    );
    if (!campaignRes.rows.length) {
      return res.status(404).json({ message: "Kampaniya topilmadi" });
    }

    const campaign = campaignRes.rows[0];
    const fullName = String(req.body?.full_name || "").trim();
    const phone = String(req.body?.phone || "").trim();
    const phoneDigits = phone.replace(/[^\d]/g, "");

    if (!fullName) {
      return res.status(400).json({ message: "Ismni kiriting" });
    }

    if (phoneDigits.length < 7) {
      return res.status(400).json({ message: "Telefon raqamini to'g'ri kiriting" });
    }

    const inserted = await query(
      `
      INSERT INTO campaign_leads (campaign_id, full_name, phone)
      VALUES ($1, $2, $3)
      RETURNING id
      `,
      [campaign.id, fullName, phone]
    );

    logAction(null, "create", "campaign_leads", inserted.rows[0].id, {
      campaign_id: campaign.id,
      full_name: fullName
    });

    const leadChatId = String(campaign.lead_chat_id || "").trim() || resolveCampaignLeadChatId(campaign.branch_name);
    if (leadChatId) {
      createTelegramEvent(
        "📥 Target uchun yangi lid",
        buildCampaignLeadTelegramLines({
          campaignTitle: campaign.title,
          branchName: campaign.branch_name,
          platform: campaign.platform,
          fullName,
          phone
        }),
        leadChatId
      );
    }

    res.json({
      message: "Rahmat, qabul qilindi. Tez orada operatorlarimiz yoki do'kon hodimlari siz bilan bog'lanadi."
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Ma'lumotni yuborib bo'lmadi" });
  }
});

app.post("/api/campaigns", authRequired, async (req, res) => {
  try {
    const {
      title,
      platform,
      branch_id,
      lead_chat_id,
      start_at,
      end_at,
      start_date,
      end_date,
      daily_budget,
      budget,
      spend,
      leads,
      sales,
      ctr,
      revenue_amount,
      campaign_goal,
      target_audience,
      channel_name,
      expected_result,
      cpl_amount,
      roi_amount,
      campaign_type,
      status,
      notes
    } = req.body;

    const safeStartAt = formatDateTimeValue(start_at || start_date);
    const safeEndAt = formatDateTimeValue(end_at || end_date);
    if (safeStartAt && safeEndAt && getDateTimeMillis(safeEndAt) < getDateTimeMillis(safeStartAt)) {
      return res.status(400).json({ message: "Tugash sana-vaqti boshlanishdan oldin bo'lishi mumkin emas" });
    }
    const safeDailyBudget = Number(daily_budget ?? budget ?? 0);
    const totalBudget = calculateCampaignBudget(safeDailyBudget, safeStartAt, safeEndAt);
    const safeSpend = Number(spend || 0);
    const safeLeads = Number(leads || 0);
    const safeSales = Number(sales || 0);
    const safeCtr = Number(ctr || 0);
    const safeRevenueAmount = Number(revenue_amount || 0);
    const safeStatus = normalizeCampaignStatus(status);

    const cpa = calcCpa(safeSpend, safeLeads);
    const roi = calcRoi(safeSpend, safeRevenueAmount);

    const inserted = await query(
      `
      INSERT INTO campaigns
      (
        title,
        platform,
        branch_id,
        lead_chat_id,
        start_at,
        end_at,
        start_date,
        end_date,
        daily_budget,
        budget,
        spend,
        leads,
        sales,
        ctr,
        revenue_amount,
        cpa,
        roi,
        campaign_goal,
        target_audience,
        channel_name,
        expected_result,
        cpl_amount,
        roi_amount,
        campaign_type,
        status,
        notes
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26)
      RETURNING *
      `,
      [
        title,
        platform,
        Number(branch_id || 0) || null,
        String(lead_chat_id || "").trim() || null,
        safeStartAt,
        safeEndAt,
        formatDateOnly(safeStartAt || start_date),
        formatDateOnly(safeEndAt || end_date),
        safeDailyBudget,
        totalBudget,
        safeSpend,
        safeLeads,
        safeSales,
        safeCtr,
        safeRevenueAmount,
        cpa,
        roi,
        campaign_goal || "",
        target_audience || "",
        channel_name || platform || "",
        expected_result || "",
        Number(cpl_amount || cpa || 0),
        Number(roi_amount || roi || 0),
        campaign_type || "target",
        safeStatus,
        notes || ""
      ]
    );

    await syncCampaignManagerOsRows(inserted.rows[0], req.user.id);
    await logAction(req.user.id, "create", "campaigns", inserted.rows[0].id, {});
    const rowWithBranchName = {
      ...inserted.rows[0],
      branch_name: await getBranchName(inserted.rows[0].branch_id)
    };
    runDetached("campaign lifecycle refresh", async () => {
      await notifyCampaignStarted(rowWithBranchName);
      await notifyCampaignEnded(rowWithBranchName);
    });
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kampaniya qoвЂshib boвЂlmadi" });
  }
});

app.put("/api/campaigns/:id", authRequired, async (req, res) => {
  try {
    const {
      title,
      platform,
      branch_id,
      lead_chat_id,
      start_at,
      end_at,
      start_date,
      end_date,
      daily_budget,
      budget,
      spend,
      leads,
      sales,
      ctr,
      revenue_amount,
      campaign_goal,
      target_audience,
      channel_name,
      expected_result,
      cpl_amount,
      roi_amount,
      campaign_type,
      status,
      notes
    } = req.body;

    const previous = await query(`SELECT * FROM campaigns WHERE id = $1 LIMIT 1`, [req.params.id]);
    if (!previous.rows.length) {
      return res.status(404).json({ message: "Kampaniya topilmadi" });
    }

    const previousRow = previous.rows[0];
    const safeDailyBudget = Number(daily_budget ?? previousRow.daily_budget ?? budget ?? previousRow.budget ?? 0);
    const safeStartAt = formatDateTimeValue(start_at || start_date || previousRow.start_at || previousRow.start_date);
    const safeEndAt = formatDateTimeValue(end_at || end_date || previousRow.end_at || previousRow.end_date);
    if (safeStartAt && safeEndAt && getDateTimeMillis(safeEndAt) < getDateTimeMillis(safeStartAt)) {
      return res.status(400).json({ message: "Tugash sana-vaqti boshlanishdan oldin bo'lishi mumkin emas" });
    }
    const safeStartDate = formatDateOnly(safeStartAt || start_date || previousRow.start_date);
    const safeEndDate = formatDateOnly(safeEndAt || end_date || previousRow.end_date);
    const totalBudget = calculateCampaignBudget(safeDailyBudget, safeStartAt, safeEndAt);
    const safeSpend = Number(spend ?? previousRow.spend ?? 0);
    const safeLeads = Number(leads ?? previousRow.leads ?? 0);
    const safeSales = Number(sales ?? previousRow.sales ?? 0);
    const safeCtr = Number(ctr ?? previousRow.ctr ?? 0);
    const safeRevenueAmount = Number(revenue_amount ?? previousRow.revenue_amount ?? 0);
    const safeStatus = normalizeCampaignStatus(status ?? previousRow.status);
    const safeNotes = notes ?? previousRow.notes ?? "";
    const safeBranchId = Number(branch_id ?? previousRow.branch_id ?? 0) || null;
    const safeLeadChatId = String(lead_chat_id ?? previousRow.lead_chat_id ?? "").trim() || null;

    const cpa = calcCpa(safeSpend, safeLeads);
    const roi = calcRoi(safeSpend, safeRevenueAmount);

    const updated = await query(
      `
      UPDATE campaigns
      SET
        title = $1,
        platform = $2,
        branch_id = $3,
        lead_chat_id = $4,
        start_at = $5,
        end_at = $6,
        start_date = $7,
        end_date = $8,
        daily_budget = $9,
        budget = $10,
        spend = $11,
        leads = $12,
        sales = $13,
        ctr = $14,
        revenue_amount = $15,
        cpa = $16,
        roi = $17,
        campaign_goal = $18,
        target_audience = $19,
        channel_name = $20,
        expected_result = $21,
        cpl_amount = $22,
        roi_amount = $23,
        campaign_type = $24,
        status = $25,
        notes = $26,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $27
      RETURNING *
      `,
      [
        title ?? previousRow.title,
        platform ?? previousRow.platform,
        safeBranchId,
        safeLeadChatId,
        safeStartAt,
        safeEndAt,
        safeStartDate,
        safeEndDate,
        safeDailyBudget,
        totalBudget,
        safeSpend,
        safeLeads,
        safeSales,
        safeCtr,
        safeRevenueAmount,
        cpa,
        roi,
        campaign_goal ?? previousRow.campaign_goal ?? "",
        target_audience ?? previousRow.target_audience ?? "",
        channel_name ?? previousRow.channel_name ?? platform ?? previousRow.platform ?? "",
        expected_result ?? previousRow.expected_result ?? "",
        Number(cpl_amount ?? previousRow.cpl_amount ?? cpa ?? 0),
        Number(roi_amount ?? previousRow.roi_amount ?? roi ?? 0),
        campaign_type ?? previousRow.campaign_type ?? "target",
        safeStatus,
        safeNotes,
        req.params.id
      ]
    );

    await syncCampaignManagerOsRows(updated.rows[0], req.user.id);
    await logAction(req.user.id, "update", "campaigns", Number(req.params.id), {});
    const rowWithBranchName = {
      ...updated.rows[0],
      branch_name: await getBranchName(updated.rows[0].branch_id)
    };
    runDetached("campaign lifecycle refresh", async () => {
      await notifyCampaignStarted(rowWithBranchName);
      await notifyCampaignEnded(rowWithBranchName);
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kampaniyani yangilab boвЂlmadi" });
  }
});

app.delete("/api/campaigns/:id", authRequired, async (req, res) => {
  try {
    await query(`DELETE FROM campaigns WHERE id = $1`, [req.params.id]);
    await logAction(req.user.id, "delete", "campaigns", Number(req.params.id), {});
    res.json({ message: "Kampaniya oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kampaniyani oвЂchirib boвЂlmadi" });
  }
});

/* MANAGER OS */

app.get("/api/manager-os", authRequired, async (_req, res) => {
  try {
    const entries = await Promise.all(Object.entries(MANAGER_OS_RESOURCES).map(async ([resource, config]) => {
      const [rowsResult, countResult] = await Promise.all([
        query(`SELECT * FROM ${config.table} ORDER BY ${config.orderBy} LIMIT 8`),
        query(`SELECT COUNT(*)::int AS count FROM ${config.table}`)
      ]);
      return [resource, {
        count: countResult.rows[0]?.count || 0,
        rows: rowsResult.rows || []
      }];
    }));

    res.json(Object.fromEntries(entries));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Manager OS ma'lumotlarini olib bo'lmadi" });
  }
});

app.get("/api/manager-os/:resource", authRequired, async (req, res) => {
  try {
    const config = getManagerOsResource(req.params.resource);
    if (!config) return res.status(404).json({ message: "Manager OS resurs topilmadi" });

    const limit = Math.min(Math.max(Number(req.query.limit || 100), 1), 300);
    const result = await query(`SELECT * FROM ${config.table} ORDER BY ${config.orderBy} LIMIT $1`, [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Manager OS ro'yxatini olib bo'lmadi" });
  }
});

app.post("/api/manager-os/:resource", authRequired, async (req, res) => {
  try {
    const config = getManagerOsResource(req.params.resource);
    if (!config) return res.status(404).json({ message: "Manager OS resurs topilmadi" });

    const columns = config.columns.filter((column) => Object.prototype.hasOwnProperty.call(req.body || {}, column));
    if (!columns.length) return res.status(400).json({ message: "Saqlash uchun maydon kiriting" });

    const finalColumns = [...columns, "created_by"];
    const values = [...columns.map((column) => req.body[column]), req.user.id];
    const placeholders = finalColumns.map((_, index) => `$${index + 1}`).join(",");
    const result = await query(
      `INSERT INTO ${config.table} (${finalColumns.join(",")}) VALUES (${placeholders}) RETURNING *`,
      values
    );
    await logAction(req.user.id, "create", config.table, result.rows[0].id, {});
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Manager OS yozuvini saqlab bo'lmadi" });
  }
});

app.put("/api/manager-os/:resource/:id", authRequired, async (req, res) => {
  try {
    const config = getManagerOsResource(req.params.resource);
    if (!config) return res.status(404).json({ message: "Manager OS resurs topilmadi" });

    const columns = config.columns.filter((column) => Object.prototype.hasOwnProperty.call(req.body || {}, column));
    if (!columns.length) return res.status(400).json({ message: "Yangilash uchun maydon kiriting" });

    const assignments = columns.map((column, index) => `${column} = $${index + 1}`).join(", ");
    const values = columns.map((column) => req.body[column]);
    values.push(req.params.id);
    const result = await query(
      `UPDATE ${config.table} SET ${assignments}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ message: "Manager OS yozuvi topilmadi" });

    await logAction(req.user.id, "update", config.table, Number(req.params.id), {});
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Manager OS yozuvini yangilab bo'lmadi" });
  }
});

app.delete("/api/manager-os/:resource/:id", authRequired, async (req, res) => {
  try {
    const config = getManagerOsResource(req.params.resource);
    if (!config) return res.status(404).json({ message: "Manager OS resurs topilmadi" });

    const result = await query(`DELETE FROM ${config.table} WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ message: "Manager OS yozuvi topilmadi" });

    await logAction(req.user.id, "delete", config.table, Number(req.params.id), {});
    res.json({ message: "Manager OS yozuvi o'chirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Manager OS yozuvini o'chirib bo'lmadi" });
  }
});

/* TASKS */

app.get("/api/tasks", authRequired, async (req, res) => {
  try {
    const { date } = req.query;
    const params = [];
    let index = 1;

    let sql = `
      SELECT
        t.*,
        u.full_name AS assignee_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_user_id
      WHERE 1=1
    `;

    if (!isLeadershipRole(req.user.role)) {
      sql += ` AND t.assignee_user_id = $${index} `;
      params.push(req.user.id);
      index++;
    }

    if (date) {
      sql += ` AND t.due_date = $${index} `;
      params.push(formatDateOnly(date));
    }

    sql += ` ORDER BY t.due_date DESC NULLS LAST, t.id DESC`;

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Vazifalarni olib boвЂlmadi" });
  }
});

app.post("/api/tasks", authRequired, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, assignee_user_id } = req.body;
    const finalAssigneeUserId =
      isLeadershipRole(req.user.role)
        ? assignee_user_id || null
        : req.user.id;

    const inserted = await query(
      `
      INSERT INTO tasks
      (
        title,
        description,
        status,
        priority,
        due_date,
        assignee_user_id,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        title,
        description || "",
        status || "todo",
        priority || "medium",
        formatDateOnly(due_date),
        finalAssigneeUserId,
        req.user.id
      ]
    );

    await createNotification(
      assignee_user_id || null,
      "Yangi vazifa",
      `${title} (${formatDateOnly(due_date) || "muddatsiz"})`,
      "info",
      "task",
      "/tasks"
    );
    await createTelegramEvent("Yangi vazifa yaratildi", [
      `Vazifa: ${title}`,
      `Muddat: ${formatDateOnly(due_date) || "ko'rsatilmagan"}`,
      `Mas'ul ID: ${assignee_user_id || "-"}`
    ]);
    await logAction(req.user.id, "create", "tasks", inserted.rows[0].id, {});
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Vazifa qoвЂshib boвЂlmadi" });
  }
});

app.put("/api/tasks/:id", authRequired, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, assignee_user_id } = req.body;
    const finalAssigneeUserId =
      isLeadershipRole(req.user.role)
        ? assignee_user_id || null
        : req.user.id;
    const isPrivileged = isLeadershipRole(req.user.role);
    const updateSql = isPrivileged
      ? `
      UPDATE tasks
      SET
        title = $1,
        description = $2,
        status = $3,
        priority = $4,
        due_date = $5,
        assignee_user_id = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
      `
      : `
      UPDATE tasks
      SET
        title = $1,
        description = $2,
        status = $3,
        priority = $4,
        due_date = $5,
        assignee_user_id = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7 AND assignee_user_id = $8
      RETURNING *
      `;
    const updateParams = [
      title,
      description || "",
      status || "todo",
      priority || "medium",
      formatDateOnly(due_date),
      finalAssigneeUserId,
      req.params.id
    ];
    if (!isPrivileged) {
      updateParams.push(req.user.id);
    }

    const updated = await query(updateSql, updateParams);

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Vazifa topilmadi" });
    }

    await createNotification(
      updated.rows[0].assignee_user_id || null,
      "Vazifa yangilandi",
      `${updated.rows[0].title} -> ${updated.rows[0].status}`,
      "info",
      "task",
      "/tasks"
    );
    await createTelegramEvent(buildPlatformTelegramTitle("✏️", "Vazifa yangilandi", "task"), [
      "#task #reminder",
      `Vazifa: ${updated.rows[0].title || "-"}`,
      `Status: ${updated.rows[0].status || "-"}`,
      `Muddat: ${formatDateOnly(updated.rows[0].due_date) || "ko'rsatilmagan"}`,
      `Yangiladi: ${getActorName(req.user)}`
    ]);
    await logAction(req.user.id, "update", "tasks", Number(req.params.id), {});
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Vazifani yangilab boвЂlmadi" });
  }
});

app.delete("/api/tasks/:id", authRequired, async (req, res) => {
  try {
    const isPrivileged = isLeadershipRole(req.user.role);
    const deleted = isPrivileged
      ? await query(`DELETE FROM tasks WHERE id = $1 RETURNING id`, [req.params.id])
      : await query(
          `DELETE FROM tasks WHERE id = $1 AND assignee_user_id = $2 RETURNING id`,
          [req.params.id, req.user.id]
        );
    if (!deleted.rows.length) {
      return res.status(404).json({ message: "Vazifa topilmadi" });
    }
    await logAction(req.user.id, "delete", "tasks", Number(req.params.id), {});
    res.json({ message: "Vazifa oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Vazifani oвЂchirib boвЂlmadi" });
  }
});

/* UPLOADS */

app.get("/api/uploads", authRequired, async (_, res) => {
  try {
    const result = await query(`SELECT * FROM uploads ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Media fayllarni olib boвЂlmadi" });
  }
});

app.post("/api/uploads", authRequired, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Fayl topilmadi" });
    }

    const entityType = req.body?.entity_type || null;
    const entityId = req.body?.entity_id ? Number(req.body.entity_id) : null;
    const folderName = req.body?.folder_name || "";
    const versionLabel = req.body?.version_label || "";
    let tags = [];
    try {
      tags = req.body?.tags_json ? JSON.parse(req.body.tags_json) : [];
    } catch {
      tags = String(req.body?.tags_json || "").split(",").map((item) => item.trim()).filter(Boolean);
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const inserted = await query(
      `
      INSERT INTO uploads
      (
        file_name,
        original_name,
        mime_type,
        file_size,
        file_url,
        uploaded_by,
        folder_name,
        tags_json,
        version_label,
        entity_type,
        entity_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        fileUrl,
        req.user.id,
        folderName,
        JSON.stringify(Array.isArray(tags) ? tags : []),
        versionLabel,
        entityType,
        entityId
      ]
    );

    await createNotification(req.user.id, "Fayl yuklandi", req.file.originalname, "success", "attachment");
    await logAction(req.user.id, "upload", "uploads", inserted.rows[0].id, {});

    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload xatoligi" });
  }
});

app.get("/api/attachments/:entityType/:entityId", authRequired, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT *
      FROM uploads
      WHERE entity_type = $1 AND entity_id = $2
      ORDER BY id DESC
      `,
      [req.params.entityType, Number(req.params.entityId)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Biriktirmalarni olib boвЂlmadi: ${err.message}` });
  }
});

app.delete("/api/uploads/:id", authRequired, async (req, res) => {
  try {
    const found = await query(`SELECT * FROM uploads WHERE id = $1 LIMIT 1`, [req.params.id]);

    if (!found.rows.length) {
      return res.status(404).json({ message: "Fayl topilmadi" });
    }

    const row = found.rows[0];
    const filePath = path.join(uploadsDir, row.file_name);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await query(`DELETE FROM uploads WHERE id = $1`, [req.params.id]);
    await logAction(req.user.id, "delete", "uploads", Number(req.params.id), {});

    res.json({ message: "Fayl oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Faylni oвЂchirib boвЂlmadi" });
  }
});

/* NOTIFICATIONS */

app.get("/api/notifications", authRequired, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT *
      FROM notifications
      WHERE user_id = $1 OR user_id IS NULL
      ORDER BY id DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Bildirishnomalarni olib boвЂlmadi" });
  }
});

app.post("/api/notifications/read/:id", authRequired, async (req, res) => {
  try {
    await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1`, [req.params.id]);
    res.json({ message: "OвЂqildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Xatolik" });
  }
});

app.post("/api/notifications/read-all", authRequired, async (req, res) => {
  try {
    await query(
      `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR user_id IS NULL`,
      [req.user.id]
    );
    res.json({ message: "Hammasi oвЂqildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Xatolik" });
  }
});

/* MESSAGES / CHAT */

app.get("/api/messages/threads", authRequired, async (req, res) => {
  try {
    await query(
      `
      UPDATE messages
      SET delivered_at = CURRENT_TIMESTAMP
      WHERE receiver_user_id = $1 AND delivered_at IS NULL
      `,
      [req.user.id]
    );

    const result = await query(
      `
      SELECT
        m.id,
        m.body,
        m.created_at,
        m.is_read,
        m.sender_user_id,
        m.receiver_user_id,
        CASE
          WHEN m.sender_user_id = $1 THEN m.receiver_user_id
          ELSE m.sender_user_id
        END AS other_user_id,
        u.full_name AS other_user_name,
        u.login AS other_user_login,
        u.avatar_url AS other_user_avatar,
        u.last_seen_at AS other_user_last_seen,
        ts.is_typing AS other_user_typing
      FROM messages m
      JOIN users u
        ON u.id = CASE
          WHEN m.sender_user_id = $1 THEN m.receiver_user_id
          ELSE m.sender_user_id
        END
      LEFT JOIN typing_states ts
        ON ts.user_id = u.id
        AND ts.target_user_id = $1
        AND ts.updated_at > CURRENT_TIMESTAMP - INTERVAL '15 second'
      WHERE m.sender_user_id = $1 OR m.receiver_user_id = $1
      ORDER BY m.created_at DESC
      `,
      [req.user.id]
    );

    const threadsMap = new Map();

    for (const row of result.rows) {
      if (!threadsMap.has(row.other_user_id)) {
        threadsMap.set(row.other_user_id, {
          other_user_id: row.other_user_id,
          other_user_name: row.other_user_name,
          other_user_login: row.other_user_login,
          other_user_avatar: row.other_user_avatar,
          other_user_last_seen: row.other_user_last_seen,
          other_user_typing: !!row.other_user_typing,
          last_message: row.body,
          last_message_time: row.created_at,
          unread_count: 0
        });
      }

      if (row.receiver_user_id === req.user.id && !row.is_read) {
        const current = threadsMap.get(row.other_user_id);
        current.unread_count += 1;
      }
    }

    res.json([...threadsMap.values()]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Chatlarni olib boвЂlmadi: ${err.message}` });
  }
});

app.get("/api/messages/thread/:otherUserId", authRequired, async (req, res) => {
  try {
    const otherUserId = Number(req.params.otherUserId);

    const result = await query(
      `
      SELECT *
      FROM messages
      WHERE
        (sender_user_id = $1 AND receiver_user_id = $2)
        OR
        (sender_user_id = $2 AND receiver_user_id = $1)
      ORDER BY created_at ASC
      `,
      [req.user.id, otherUserId]
    );

    const readResult = await query(
      `
      UPDATE messages
      SET is_read = TRUE
        , read_at = CURRENT_TIMESTAMP
        , delivered_at = COALESCE(delivered_at, CURRENT_TIMESTAMP)
      WHERE sender_user_id = $1 AND receiver_user_id = $2 AND is_read = FALSE
      RETURNING id, read_at
      `,
      [otherUserId, req.user.id]
    );

    if (readResult.rows.length) {
      emitToUser(otherUserId, "chat:read", {
        by_user_id: req.user.id,
        message_ids: readResult.rows.map((row) => row.id),
        read_at: readResult.rows[0].read_at
      });
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Xabarlarni olib boвЂlmadi: ${err.message}` });
  }
});

app.post("/api/messages", authRequired, async (req, res) => {
  try {
    const { receiver_user_id, body } = req.body;

    if (!receiver_user_id || !body?.trim()) {
      return res.status(400).json({ message: "Qabul qiluvchi va xabar majburiy" });
    }

    const receiver = await query(
      `SELECT id, full_name FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1`,
      [receiver_user_id]
    );

    if (!receiver.rows.length) {
      return res.status(404).json({ message: "Qabul qiluvchi hodim topilmadi" });
    }

    const receiverOnline = userSockets.has(Number(receiver_user_id));
    const inserted = await query(
      `
      INSERT INTO messages (sender_user_id, receiver_user_id, body, delivered_at)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [req.user.id, receiver_user_id, body.trim(), receiverOnline ? new Date().toISOString() : null]
    );

    await createNotification(
      receiver_user_id,
      "Yangi xabar",
      `${req.user.full_name} sizga xabar yubordi`,
      "info",
      "chat"
    );

    emitToUser(receiver_user_id, "chat:new_message", inserted.rows[0]);
    emitToUser(req.user.id, "chat:message_status", {
      id: inserted.rows[0].id,
      delivered_at: inserted.rows[0].delivered_at,
      read_at: inserted.rows[0].read_at || null
    });

    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Xabar yuborib boвЂlmadi: ${err.message}` });
  }
});

app.post("/api/messages/typing", authRequired, async (req, res) => {
  try {
    const { target_user_id, is_typing } = req.body;
    if (!target_user_id) {
      return res.status(400).json({ message: "Qabul qiluvchi majburiy" });
    }

    await query(
      `
      INSERT INTO typing_states (user_id, target_user_id, is_typing, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, target_user_id)
      DO UPDATE SET is_typing = EXCLUDED.is_typing, updated_at = CURRENT_TIMESTAMP
      `,
      [req.user.id, Number(target_user_id), !!is_typing]
    );

    emitToUser(Number(target_user_id), "chat:typing", {
      user_id: req.user.id,
      target_user_id: Number(target_user_id),
      is_typing: !!is_typing
    });

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Typing holatini saqlab boвЂlmadi: ${err.message}` });
  }
});

/* EXPENSES */

app.get("/api/expenses", authRequired, async (_, res) => {
  try {
    const result = await query(
      `
      SELECT *
      FROM expenses
      ORDER BY expense_date DESC NULLS LAST, id DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Harajatlarni olib boвЂlmadi: ${err.message}` });
  }
});

app.post("/api/expenses", authRequired, async (req, res) => {
  try {
    const {
      expense_date,
      title,
      vendor_name,
      card_holder,
      amount,
      currency,
      category,
      payment_type,
      notes
    } = req.body;

    const inserted = await query(
      `
      INSERT INTO expenses
      (
        expense_date,
        title,
        vendor_name,
        card_holder,
        amount,
        currency,
        category,
        payment_type,
        notes,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        normalizeDateOnly(expense_date),
        title,
        vendor_name || "",
        card_holder || "",
        Number(amount || 0),
        currency || "UZS",
        category || "",
        payment_type || "visa",
        notes || "",
        req.user.id
      ]
    );

    await logAction(req.user.id, "create", "expenses", inserted.rows[0].id, { title, amount });
    createTelegramEvent(buildPlatformTelegramTitle("рџ§ѕ", "Harajat qo'shildi", "finance"), [
      "#finance #expense #fiskal_chek",
      `Sana: ${formatDateOnly(inserted.rows[0].expense_date) || "-"}`,
      `Nomi: ${inserted.rows[0].title || "-"}`,
      `Kategoriya: ${inserted.rows[0].category || "-"}`,
      `To'lov: ${inserted.rows[0].payment_type || "-"}`,
      `Summa: ${formatTelegramMoney(inserted.rows[0].amount)}`,
      `Kiritdi: ${getActorName(req.user)}`
    ]);
    await notifyBudgetOverrunForExpense(inserted.rows[0], getActorName(req.user));
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Harajatni saqlab boвЂlmadi: ${err.message}` });
  }
});

app.put("/api/expenses/:id", authRequired, async (req, res) => {
  try {
    const {
      expense_date,
      title,
      vendor_name,
      card_holder,
      amount,
      currency,
      category,
      payment_type,
      notes
    } = req.body;

    const updated = await query(
      `
      UPDATE expenses
      SET
        expense_date = $1,
        title = $2,
        vendor_name = $3,
        card_holder = $4,
        amount = $5,
        currency = $6,
        category = $7,
        payment_type = $8,
        notes = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
      `,
      [
        normalizeDateOnly(expense_date),
        title,
        vendor_name || "",
        card_holder || "",
        Number(amount || 0),
        currency || "UZS",
        category || "",
        payment_type || "visa",
        notes || "",
        req.params.id
      ]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Harajat topilmadi" });
    }

    await logAction(req.user.id, "update", "expenses", Number(req.params.id), { title, amount });
    createTelegramEvent(buildPlatformTelegramTitle("вњЏпёЏ", "Harajat yangilandi", "finance"), [
      "#finance #expense",
      `Nomi: ${updated.rows[0].title || "-"}`,
      `Kategoriya: ${updated.rows[0].category || "-"}`,
      `Summa: ${formatTelegramMoney(updated.rows[0].amount)}`,
      `Yangiladi: ${getActorName(req.user)}`
    ]);
    await notifyBudgetOverrunForExpense(updated.rows[0], getActorName(req.user));
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Harajatni yangilab boвЂlmadi: ${err.message}` });
  }
});

app.delete("/api/expenses/:id", authRequired, async (req, res) => {
  try {
    const deleted = await query(`DELETE FROM expenses WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!deleted.rows.length) {
      return res.status(404).json({ message: "Harajat topilmadi" });
    }
    await logAction(req.user.id, "delete", "expenses", Number(req.params.id), {});
    createTelegramEvent(buildPlatformTelegramTitle("рџ—‘пёЏ", "Harajat o'chirildi", "finance"), [
      "#finance #expense",
      `Nomi: ${deleted.rows[0].title || "-"}`,
      `Summa: ${formatTelegramMoney(deleted.rows[0].amount)}`,
      `O'chirdi: ${getActorName(req.user)}`
    ]);
    res.json({ message: "Harajat oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Harajatni oвЂchirib boвЂlmadi: ${err.message}` });
  }
});

app.get("/api/contest-expenses", authRequired, async (_, res) => {
  try {
    const result = await query(
      `
      SELECT *
      FROM contest_expenses
      ORDER BY expense_date DESC, id DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Konkurs harajatlarini olib bo'lmadi: ${err.message}` });
  }
});

app.post("/api/contest-expenses", authRequired, async (req, res) => {
  try {
    const {
      expense_date,
      contest_name,
      prize_name,
      prize_image_url,
      winner_location,
      winner_region,
      winner_name,
      winner_phone,
      proof_image_url
    } = req.body;

    const inserted = await query(
      `
      INSERT INTO contest_expenses
      (
        expense_date,
        contest_name,
        prize_name,
        prize_image_url,
        winner_location,
        winner_region,
        winner_name,
        winner_phone,
        proof_image_url,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
      RETURNING *
      `,
      [
        normalizeDateOnly(expense_date),
        contest_name,
        prize_name,
        prize_image_url || null,
        winner_location || "",
        winner_region,
        winner_name,
        winner_phone,
        proof_image_url || null,
        req.user.id
      ]
    );

    await logAction(req.user.id, "create", "contest_expenses", inserted.rows[0].id, {
      contest_name,
      prize_name,
      winner_name
    });
    createTelegramEvent(buildPlatformTelegramTitle("рџЋЃ", "Konkurs harajati qo'shildi", "finance"), [
      "#finance #contest_expense",
      `Konkurs: ${inserted.rows[0].contest_name || "-"}`,
      `Sovrin: ${inserted.rows[0].prize_name || "-"}`,
      `G'olib: ${inserted.rows[0].winner_name || "-"}`,
      `Kiritdi: ${getActorName(req.user)}`
    ]);
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Konkurs harajatini saqlab bo'lmadi: ${err.message}` });
  }
});

app.put("/api/contest-expenses/:id", authRequired, async (req, res) => {
  try {
    const {
      expense_date,
      contest_name,
      prize_name,
      prize_image_url,
      winner_location,
      winner_region,
      winner_name,
      winner_phone,
      proof_image_url
    } = req.body;

    const updated = await query(
      `
      UPDATE contest_expenses
      SET
        expense_date = $1,
        contest_name = $2,
        prize_name = $3,
        prize_image_url = $4,
        winner_location = $5,
        winner_region = $6,
        winner_name = $7,
        winner_phone = $8,
        proof_image_url = $9,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $10
      RETURNING *
      `,
      [
        normalizeDateOnly(expense_date),
        contest_name,
        prize_name,
        prize_image_url || null,
        winner_location || "",
        winner_region,
        winner_name,
        winner_phone,
        proof_image_url || null,
        req.params.id
      ]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Konkurs harajati topilmadi" });
    }

    await logAction(req.user.id, "update", "contest_expenses", Number(req.params.id), {
      contest_name,
      prize_name,
      winner_name
    });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Konkurs harajatini yangilab bo'lmadi: ${err.message}` });
  }
});

app.delete("/api/contest-expenses/:id", authRequired, async (req, res) => {
  try {
    const deleted = await query(`DELETE FROM contest_expenses WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!deleted.rows.length) {
      return res.status(404).json({ message: "Konkurs harajati topilmadi" });
    }
    await logAction(req.user.id, "delete", "contest_expenses", Number(req.params.id), {});
    res.json({ message: "Konkurs harajati o'chirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Konkurs harajatini o'chirib bo'lmadi: ${err.message}` });
  }
});

app.get("/api/travel-expenses", authRequired, async (req, res) => {
  try {
    const params = [];
    const scopeWhere = String(req.query?.scope || "").toLowerCase() === "mine"
      ? "WHERE created_by = $1"
      : "";
    if (scopeWhere) params.push(req.user.id);
    const result = await query(
      `
      SELECT *
      FROM travel_expenses
      ${scopeWhere}
      ORDER BY sort_order ASC NULLS LAST, expense_date ASC NULLS LAST, id ASC
      `,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Safar harajatlarini olib bo'lmadi" });
  }
});

app.post("/api/travel-expenses", authRequired, async (req, res) => {
  try {
    const { expense_date, category, title, amount, currency, entry_type } = req.body;
    const nextSortOrderResult = await query(`SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM travel_expenses`);
    const nextSortOrder = Number(nextSortOrderResult.rows[0]?.next_order || 1);

    const inserted = await query(
      `
      INSERT INTO travel_expenses
      (expense_date, category, title, amount, currency, entry_type, sort_order, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [
        normalizeDateOnly(expense_date),
        category || "kategoriya_yoq",
        title,
        Number(amount || 0),
        currency || "UZS",
        entry_type || "chiqim",
        nextSortOrder,
        req.user.id
      ]
    );

    await logAction(req.user.id, "create", "travel_expenses", inserted.rows[0].id, { title, amount });
    createTelegramEvent(buildPlatformTelegramTitle("рџљђ", "Safar harajati qo'shildi", "finance"), [
      "#finance #travel_expense #safar",
      `Sana: ${formatDateOnly(inserted.rows[0].expense_date) || "-"}`,
      `Nomi: ${inserted.rows[0].title || "-"}`,
      `Kategoriya: ${inserted.rows[0].category || "-"}`,
      `Summa: ${formatTelegramMoney(inserted.rows[0].amount)}`,
      `Kiritdi: ${getActorName(req.user)}`
    ]);
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Safar harajatini saqlab bo'lmadi" });
  }
});

app.put("/api/travel-expenses/:id", authRequired, async (req, res) => {
  try {
    const { expense_date, category, title, amount, currency, entry_type, sort_order } = req.body;
    const current = await query(`SELECT created_by FROM travel_expenses WHERE id = $1 LIMIT 1`, [req.params.id]);
    if (!current.rows.length) {
      return res.status(404).json({ message: "Safar harajati topilmadi" });
    }
    if (req.user?.role !== "admin" && String(current.rows[0].created_by || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Faqat o'zingiz yaratgan safar harajatini tahrirlashingiz mumkin" });
    }

    const updated = await query(
      `
      UPDATE travel_expenses
      SET
        expense_date = $1,
        category = $2,
        title = $3,
        amount = $4,
        currency = $5,
        entry_type = $6,
        sort_order = COALESCE($7, sort_order),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
      `,
      [
        normalizeDateOnly(expense_date),
        category || "kategoriya_yoq",
        title,
        Number(amount || 0),
        currency || "UZS",
        entry_type || "chiqim",
        Number.isFinite(Number(sort_order)) ? Number(sort_order) : null,
        req.params.id
      ]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Safar harajati topilmadi" });
    }

    await logAction(req.user.id, "update", "travel_expenses", Number(req.params.id), { title, amount });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Safar harajatini yangilab bo'lmadi" });
  }
});

app.post("/api/travel-expenses/:id/move", authRequired, async (req, res) => {
  const currentId = Number(req.params.id);
  const targetId = Number(req.body?.target_id || 0);

  if (!currentId || !targetId || currentId === targetId) {
    return res.status(400).json({ message: "Tartibni o'zgartirish uchun qo'shni yozuv topilmadi" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const currentResult = await client.query(
      `SELECT id, sort_order, created_by FROM travel_expenses WHERE id = $1 FOR UPDATE`,
      [currentId]
    );
    const targetResult = await client.query(
      `SELECT id, sort_order, created_by FROM travel_expenses WHERE id = $1 FOR UPDATE`,
      [targetId]
    );

    const currentRow = currentResult.rows[0];
    const targetRow = targetResult.rows[0];

    if (!currentRow || !targetRow) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Safar harajati topilmadi" });
    }

    if (
      req.user?.role !== "admin" &&
      (String(currentRow.created_by || "") !== String(req.user.id) || String(targetRow.created_by || "") !== String(req.user.id))
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Faqat o'zingiz yaratgan safar harajatlari tartibini o'zgartirishingiz mumkin" });
    }

    await client.query(
      `
      UPDATE travel_expenses
      SET
        sort_order = CASE
          WHEN id = $1 THEN $3
          WHEN id = $2 THEN $4
          ELSE sort_order
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id IN ($1, $2)
      `,
      [currentRow.id, targetRow.id, targetRow.sort_order, currentRow.sort_order]
    );

    await client.query("COMMIT");
    await logAction(req.user.id, "reorder", "travel_expenses", currentId, { target_id: targetId });
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: "Safar harajatlari tartibini o'zgartirib bo'lmadi" });
  } finally {
    client.release();
  }
});

app.delete("/api/travel-expenses/:id", authRequired, async (req, res) => {
  try {
    const current = await query(`SELECT created_by FROM travel_expenses WHERE id = $1 LIMIT 1`, [req.params.id]);
    if (!current.rows.length) {
      return res.status(404).json({ message: "Safar harajati topilmadi" });
    }
    if (req.user?.role !== "admin" && String(current.rows[0].created_by || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Faqat o'zingiz yaratgan safar harajatini o'chirishingiz mumkin" });
    }
    const deleted = await query(`DELETE FROM travel_expenses WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!deleted.rows.length) {
      return res.status(404).json({ message: "Safar harajati topilmadi" });
    }
    await logAction(req.user.id, "delete", "travel_expenses", Number(req.params.id), {});
    res.json({ message: "Safar harajati o'chirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Safar harajatini o'chirib bo'lmadi" });
  }
});

/* TRAVEL PLANS */

app.get("/api/travel-plans", authRequired, async (req, res) => {
  try {
    const params = [];
    const shouldScopeToUser = String(req.query?.scope || "").toLowerCase() === "mine";
    let scopeWhere = "";
    if (shouldScopeToUser) {
      params.push(req.user.id);
      scopeWhere = "WHERE tp.created_by = $1";
    }

    const result = await query(
      `
      SELECT
        tp.*,
        b.name AS branch_name
      FROM travel_plans tp
      LEFT JOIN branches b ON b.id = tp.branch_id
      ${scopeWhere}
      ORDER BY tp.plan_date DESC NULLS LAST, tp.id DESC
      `,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Safar rejasini olib boвЂlmadi: ${err.message}` });
  }
});

app.post("/api/travel-plans", authRequired, async (req, res) => {
  try {
    const {
      plan_date,
      branch_id,
      video_title,
      participants_text,
      videodek_url,
      scenario_text,
      checklist_json,
      budget_amount,
      transport_text,
      hotel_text,
      deadline_date,
      status,
      notes,
      approval_comment
    } = req.body;

    const inserted = await query(
      `
      INSERT INTO travel_plans
      (
        plan_date,
        branch_id,
        video_title,
        participants_text,
        videodek_url,
        scenario_text,
        checklist_json,
        budget_amount,
        transport_text,
        hotel_text,
        deadline_date,
        status,
        notes,
        approval_comment,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING *
      `,
      [
        normalizeDateOnly(plan_date),
        branch_id || null,
        video_title,
        participants_text || "",
        normalizeNoticeUrl(videodek_url),
        scenario_text || "",
        JSON.stringify(Array.isArray(checklist_json) ? checklist_json : []),
        Number(budget_amount || 0),
        transport_text || "",
        hotel_text || "",
        normalizeDateOnly(deadline_date),
        status || "reja",
        notes || "",
        approval_comment || "",
        req.user.id
      ]
    );

    const approvalMeta = getApprovalNotificationMeta(inserted.rows[0].status, inserted.rows[0].video_title);
    if (approvalMeta) {
      await createNotification(null, approvalMeta.title, approvalMeta.body, approvalMeta.type, "approval", "/travel-plans");
    }
    await createTelegramEvent("🆕 Yangi safar rejasi kiritildi", await buildTravelPlanTelegramLines(inserted.rows[0]));
    if (approval_comment?.trim()) {
      await addApprovalComment("travel_plan", inserted.rows[0].id, req.user.id, approval_comment);
      await createTelegramEvent("Safar approval izohi", [
        `Video: ${inserted.rows[0].video_title}`,
        `Status: ${inserted.rows[0].status}`,
        `Izoh: ${approval_comment}`
      ]);
    }

    await logAction(req.user.id, "create", "travel_plans", inserted.rows[0].id, { video_title });
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Safar rejasini saqlab boвЂlmadi: ${err.message}` });
  }
});

app.put("/api/travel-plans/:id", authRequired, async (req, res) => {
  try {
    const {
      plan_date,
      branch_id,
      video_title,
      participants_text,
      videodek_url,
      scenario_text,
      checklist_json,
      budget_amount,
      transport_text,
      hotel_text,
      deadline_date,
      status,
      notes,
      approval_comment
    } = req.body;

    const previous = await query(`SELECT status, created_by FROM travel_plans WHERE id = $1 LIMIT 1`, [req.params.id]);
    if (!previous.rows.length) {
      return res.status(404).json({ message: "Safar rejasi topilmadi" });
    }
    if (req.user?.role !== "admin" && String(previous.rows[0].created_by || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Faqat o'zingiz yaratgan safar rejasini tahrirlashingiz mumkin" });
    }

    const updated = await query(
      `
      UPDATE travel_plans
      SET
        plan_date = $1,
        branch_id = $2,
        video_title = $3,
        participants_text = $4,
        videodek_url = $5,
        scenario_text = $6,
        checklist_json = $7,
        budget_amount = $8,
        transport_text = $9,
        hotel_text = $10,
        deadline_date = $11,
        status = $12,
        notes = $13,
        approval_comment = $14,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $15
      RETURNING *
      `,
      [
        normalizeDateOnly(plan_date),
        branch_id || null,
        video_title,
        participants_text || "",
        normalizeNoticeUrl(videodek_url),
        scenario_text || "",
        JSON.stringify(Array.isArray(checklist_json) ? checklist_json : []),
        Number(budget_amount || 0),
        transport_text || "",
        hotel_text || "",
        normalizeDateOnly(deadline_date),
        status || "reja",
        notes || "",
        approval_comment || "",
        req.params.id
      ]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Safar rejasi topilmadi" });
    }

    if (previous.rows[0]?.status !== updated.rows[0].status) {
      const approvalMeta = getApprovalNotificationMeta(updated.rows[0].status, updated.rows[0].video_title);
      if (approvalMeta) {
        await createNotification(null, approvalMeta.title, approvalMeta.body, approvalMeta.type, "approval", "/travel-plans");
      }
    }
    await createTelegramEvent("✏️ Safar rejasi yangilandi", await buildTravelPlanTelegramLines(updated.rows[0]));
    if (approval_comment?.trim()) {
      await addApprovalComment("travel_plan", updated.rows[0].id, req.user.id, approval_comment);
      await createTelegramEvent("Safar approval yangilandi", [
        `Video: ${updated.rows[0].video_title}`,
        `Status: ${updated.rows[0].status}`,
        `Izoh: ${approval_comment}`
      ]);
    }

    await logAction(req.user.id, "update", "travel_plans", Number(req.params.id), { video_title });
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Safar rejasini yangilab boвЂlmadi: ${err.message}` });
  }
});

app.delete("/api/travel-plans/:id", authRequired, async (req, res) => {
  try {
    const current = await query(`SELECT created_by FROM travel_plans WHERE id = $1 LIMIT 1`, [req.params.id]);
    if (!current.rows.length) {
      return res.status(404).json({ message: "Safar rejasi topilmadi" });
    }
    if (req.user?.role !== "admin" && String(current.rows[0].created_by || "") !== String(req.user.id)) {
      return res.status(403).json({ message: "Faqat o'zingiz yaratgan safar rejasini o'chirishingiz mumkin" });
    }
    await query(`DELETE FROM travel_plans WHERE id = $1`, [req.params.id]);
    await logAction(req.user.id, "delete", "travel_plans", Number(req.params.id), {});
    res.json({ message: "Safar rejasi oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Safar rejasini oвЂchirib boвЂlmadi: ${err.message}` });
  }
});

/* BUDGET / ANALYTICS */

app.get("/api/budgets", authRequired, async (_, res) => {
  try {
    const result = await query(`SELECT * FROM budgets ORDER BY month_label DESC, id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Budjetlarni olib bo'lmadi: ${err.message}` });
  }
});

app.get("/api/finance/month-locks", authRequired, pagePermissionAllowed("expenses"), async (_, res) => {
  try {
    const result = await query(
      `
      SELECT id, month_label, snapshot_type, created_at, created_by
      FROM monthly_snapshots
      WHERE snapshot_type = 'finance_close'
      ORDER BY month_label DESC, id DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Finance oy locklarini olib bo'lmadi: ${err.message}` });
  }
});

app.post("/api/finance/monthly-close", authRequired, pagePermissionAllowed("expenses"), rolesAllowed("admin", "manager", "director"), async (req, res) => {
  try {
    const month = String(req.body?.month_label || getMonthLabel()).trim();
    const exists = await query(`SELECT id FROM monthly_snapshots WHERE month_label = $1 AND snapshot_type = 'finance_close' LIMIT 1`, [month]);
    if (exists.rows.length) {
      return res.status(409).json({ message: "Bu finance oyi allaqachon yopilgan" });
    }
    const [expenseRes, budgetRes] = await Promise.all([
      query(`SELECT COALESCE(SUM(amount),0)::numeric AS total, COUNT(*)::int AS count FROM expenses WHERE to_char(expense_date,'YYYY-MM') = $1`, [month]),
      query(`SELECT COALESCE(SUM(limit_amount),0)::numeric AS total, COUNT(*)::int AS count FROM budgets WHERE month_label = $1`, [month])
    ]);
    const payload = {
      month_label: month,
      expense_total: Number(expenseRes.rows[0]?.total || 0),
      expense_count: Number(expenseRes.rows[0]?.count || 0),
      budget_total: Number(budgetRes.rows[0]?.total || 0),
      budget_count: Number(budgetRes.rows[0]?.count || 0)
    };
    const inserted = await query(
      `INSERT INTO monthly_snapshots (month_label, snapshot_type, payload_json, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [month, "finance_close", JSON.stringify(payload), req.user.id]
    );
    await logAction(req.user.id, "monthly_close", "expenses", null, payload);
    createTelegramEvent(buildPlatformTelegramTitle("🔒", "Finance oyi yopildi", "finance"), [
      "#finance #monthly_close",
      `Oy: ${month}`,
      `Harajat: ${formatTelegramMoney(payload.expense_total)}`,
      `Budjet: ${formatTelegramMoney(payload.budget_total)}`,
      `Yopdi: ${getActorName(req.user)}`
    ]);
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Finance oyini yopib bo'lmadi: ${err.message}` });
  }
});

app.post("/api/budgets", authRequired, async (req, res) => {
  try {
    const { month_label, category, limit_amount, notes } = req.body;
    const inserted = await query(
      `INSERT INTO budgets (month_label, category, limit_amount, notes, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [month_label || getMonthLabel(), category || "servis", Number(limit_amount || 0), notes || "", req.user.id]
    );
    await logAction(req.user.id, "create", "budgets", inserted.rows[0].id, { month_label: inserted.rows[0].month_label, category: inserted.rows[0].category });
    createTelegramEvent(buildPlatformTelegramTitle("📌", "Budget limit qo'shildi", "finance"), [
      "#finance #budget",
      `Oy: ${inserted.rows[0].month_label}`,
      `Kategoriya: ${inserted.rows[0].category}`,
      `Limit: ${formatTelegramMoney(inserted.rows[0].limit_amount)}`,
      `Kiritdi: ${getActorName(req.user)}`
    ]);
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Budjetni saqlab bo'lmadi: ${err.message}` });
  }
});

app.put("/api/budgets/:id", authRequired, async (req, res) => {
  try {
    const { month_label, category, limit_amount, notes } = req.body;
    const updated = await query(
      `UPDATE budgets SET month_label=$1, category=$2, limit_amount=$3, notes=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5 RETURNING *`,
      [month_label || getMonthLabel(), category || "servis", Number(limit_amount || 0), notes || "", req.params.id]
    );
    if (updated.rows[0]) {
      await logAction(req.user.id, "update", "budgets", Number(req.params.id), { month_label: updated.rows[0].month_label, category: updated.rows[0].category });
      createTelegramEvent(buildPlatformTelegramTitle("✏️", "Budget limit yangilandi", "finance"), [
        "#finance #budget",
        `Oy: ${updated.rows[0].month_label}`,
        `Kategoriya: ${updated.rows[0].category}`,
        `Limit: ${formatTelegramMoney(updated.rows[0].limit_amount)}`,
        `Yangiladi: ${getActorName(req.user)}`
      ]);
    }
    res.json(updated.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Budjetni yangilab bo'lmadi: ${err.message}` });
  }
});

app.delete("/api/budgets/:id", authRequired, async (req, res) => {
  try {
    const deleted = await query(`DELETE FROM budgets WHERE id = $1 RETURNING *`, [req.params.id]);
    if (!deleted.rows.length) {
      return res.status(404).json({ message: "Budjet topilmadi" });
    }
    await logAction(req.user.id, "delete", "budgets", Number(req.params.id), {});
    createTelegramEvent(buildPlatformTelegramTitle("🗑️", "Budget limit o'chirildi", "finance"), [
      "#finance #budget",
      `Oy: ${deleted.rows[0].month_label}`,
      `Kategoriya: ${deleted.rows[0].category}`,
      `O'chirdi: ${getActorName(req.user)}`
    ]);
    res.json({ message: "Budjet o'chirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Budjetni o'chirib bo'lmadi: ${err.message}` });
  }
});

app.get("/api/analytics/overview", authRequired, async (_, res) => {
  try {
    const [bonusByMonth, spendByMonth, contentByStatus, branchKpi, topUsers, budgetsRes, expenseTotals, workloadHeatmap, employeeKpi, moodSummary] = await Promise.all([
      query(`SELECT month_label, COALESCE(SUM(total_amount),0)::numeric AS total FROM bonus_items GROUP BY month_label ORDER BY month_label DESC LIMIT 6`),
      query(`SELECT to_char(COALESCE(start_date,end_date,CURRENT_DATE), 'YYYY-MM') AS month_label, COALESCE(SUM(spend),0)::numeric AS total FROM campaigns GROUP BY 1 ORDER BY 1 DESC LIMIT 6`),
      query(`SELECT status, COUNT(*)::int AS count FROM content_items GROUP BY status ORDER BY status`),
      query(`SELECT b.name, COALESCE(SUM(d.stories_count + d.posts_count),0)::int AS content_score, COALESCE(SUM(d.subscriber_count),0)::int AS subscriber_growth FROM branches b LEFT JOIN daily_branch_reports d ON d.branch_id = b.id GROUP BY b.id, b.name ORDER BY content_score DESC, subscriber_growth DESC LIMIT 8`),
      query(`SELECT u.full_name, COUNT(t.id)::int AS done_tasks, COALESCE(SUM(bi.total_amount),0)::numeric AS bonus_total FROM users u LEFT JOIN tasks t ON t.assignee_user_id = u.id AND t.status = 'done' LEFT JOIN bonus_items bi ON bi.user_id = u.id GROUP BY u.id, u.full_name ORDER BY done_tasks DESC, bonus_total DESC LIMIT 8`),
      query(`SELECT month_label, category, limit_amount FROM budgets ORDER BY month_label DESC, id DESC LIMIT 24`),
      query(`SELECT category, COALESCE(SUM(amount),0)::numeric AS total FROM expenses GROUP BY category ORDER BY total DESC`),
      query(`SELECT TO_CHAR(COALESCE(due_date, CURRENT_DATE), 'YYYY-MM-DD') AS day_label, COUNT(*)::int AS task_count FROM tasks GROUP BY 1 ORDER BY 1 DESC LIMIT 21`),
      query(`SELECT u.id, u.full_name, COUNT(t.id)::int AS total_tasks, COUNT(t.id) FILTER (WHERE t.status='done')::int AS done_tasks, COUNT(c.id)::int AS content_count, COALESCE(SUM(bi.total_amount),0)::numeric AS bonus_total FROM users u LEFT JOIN tasks t ON t.assignee_user_id = u.id LEFT JOIN content_items c ON c.assigned_user_id = u.id LEFT JOIN bonus_items bi ON bi.user_id = u.id GROUP BY u.id, u.full_name ORDER BY done_tasks DESC, content_count DESC`),
      query(`SELECT entry_date, ROUND(AVG(mood_score)::numeric, 2) AS avg_mood, COUNT(*)::int AS total_entries FROM team_mood_entries GROUP BY entry_date ORDER BY entry_date DESC LIMIT 14`)
    ]);
    res.json({ bonus_by_month: bonusByMonth.rows, spend_by_month: spendByMonth.rows, content_by_status: contentByStatus.rows, branch_kpi: branchKpi.rows, top_performers: topUsers.rows, budgets: budgetsRes.rows, expense_totals: expenseTotals.rows, workload_heatmap: workloadHeatmap.rows, employee_kpi: employeeKpi.rows, mood_summary: moodSummary.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Analyticsni olib bo'lmadi: ${err.message}` });
  }
});

app.get("/api/analytics/posting-insights", authRequired, async (_, res) => {
  try {
    const [byHour, byDay] = await Promise.all([
      query(`
        SELECT
          EXTRACT(HOUR FROM COALESCE(publish_date::timestamp, created_at))::int AS hour_label,
          COUNT(*)::int AS content_count,
          ROUND(AVG(COALESCE(reach_value, 0))::numeric, 2) AS avg_reach
        FROM content_items
        GROUP BY 1
        ORDER BY avg_reach DESC, content_count DESC
      `),
      query(`
        SELECT
          TO_CHAR(COALESCE(publish_date::timestamp, created_at), 'Dy') AS day_label,
          COUNT(*)::int AS content_count,
          ROUND(AVG(COALESCE(reach_value, 0))::numeric, 2) AS avg_reach
        FROM content_items
        GROUP BY 1
        ORDER BY avg_reach DESC, content_count DESC
      `)
    ]);

    res.json({
      by_hour: byHour.rows,
      by_day: byDay.rows,
      best_hour: byHour.rows[0] || null,
      best_day: byDay.rows[0] || null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Posting insight bo'lmadi: ${err.message}` });
  }
});

app.get("/api/reports/advanced", authRequired, async (req, res) => {
  try {
    const range = String(req.query.range || "monthly");
    const bucket = range === "daily" ? "YYYY-MM-DD" : range === "weekly" ? "IYYY-IW" : "YYYY-MM";
    const [reportsRes, tasksRes, expensesRes] = await Promise.all([
      query(`SELECT to_char(report_date, '${bucket}') AS bucket, COUNT(*)::int AS reports_count, COALESCE(SUM(stories_count + posts_count),0)::int AS content_total FROM daily_branch_reports GROUP BY 1 ORDER BY 1 DESC LIMIT 20`),
      query(`SELECT to_char(due_date, '${bucket}') AS bucket, COUNT(*)::int AS task_total, COUNT(*) FILTER (WHERE status='done')::int AS done_count FROM tasks WHERE due_date IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 20`),
      query(`SELECT to_char(expense_date, '${bucket}') AS bucket, COALESCE(SUM(amount),0)::numeric AS expense_total FROM expenses WHERE expense_date IS NOT NULL GROUP BY 1 ORDER BY 1 DESC LIMIT 20`)
    ]);
    res.json({ reports: reportsRes.rows, tasks: tasksRes.rows, expenses: expensesRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Advanced reportni olib bo'lmadi: ${err.message}` });
  }
});

app.get("/api/top-performers", authRequired, async (_, res) => {
  try {
    const [employees, branchesRes] = await Promise.all([
      query(`SELECT u.full_name, COUNT(t.id)::int AS done_tasks, COALESCE(SUM(bi.total_amount),0)::numeric AS bonus_total FROM users u LEFT JOIN tasks t ON t.assignee_user_id = u.id AND t.status='done' LEFT JOIN bonus_items bi ON bi.user_id = u.id GROUP BY u.id, u.full_name ORDER BY done_tasks DESC, bonus_total DESC LIMIT 5`),
      query(`SELECT b.name, COALESCE(SUM(d.stories_count + d.posts_count),0)::int AS content_total, COALESCE(SUM(d.subscriber_count),0)::int AS subscriber_total FROM branches b LEFT JOIN daily_branch_reports d ON d.branch_id = b.id GROUP BY b.id, b.name ORDER BY content_total DESC, subscriber_total DESC LIMIT 5`)
    ]);
    res.json({ employees: employees.rows, branches: branchesRes.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Top performerlarni olib bo'lmadi: ${err.message}` });
  }
});

app.get("/api/backup/export", authRequired, rolesAllowed("admin"), async (_, res) => {
  try {
    const tables = [
      "app_settings",
      "branches",
      "users",
      "campaigns",
      "content_items",
      "bonus_items",
      "daily_branch_reports",
      "expenses",
      "contest_expenses",
      "travel_expenses",
      "travel_plans",
      "tasks",
      "budgets",
      "comments",
      "messages",
      "notifications",
      "uploads"
    ];
    const payload = {};
    for (const table of tables) {
      payload[table] = (await query(`SELECT * FROM ${table}`)).rows;
    }
    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Backup export bo'lmadi: ${err.message}` });
  }
});

app.post("/api/backup/import", authRequired, rolesAllowed("admin"), async (req, res) => {
  const client = await getClient();
  try {
    const payload = req.body?.payload || req.body || {};
    const tables = [
      "app_settings",
      "branches",
      "users",
      "campaigns",
      "content_items",
      "bonus_items",
      "daily_branch_reports",
      "expenses",
      "contest_expenses",
      "travel_expenses",
      "travel_plans",
      "tasks",
      "budgets",
      "comments",
      "messages",
      "notifications",
      "uploads"
    ];

    await client.query("BEGIN");

    const deleteOrder = [...tables].reverse();
    for (const tableName of deleteOrder) {
      if (Array.isArray(payload[tableName])) {
        await client.query(`DELETE FROM ${tableName}`);
      }
    }

    for (const tableName of tables) {
      if (Array.isArray(payload[tableName])) {
        await insertBackupRows(client, tableName, payload[tableName]);
        await resetSequence(client, tableName);
      }
    }

    await client.query("COMMIT");
    await logAction(req.user.id, "import", "backup", null, { tables: Object.keys(payload) });
    await createTelegramEvent("Backup restore bajarildi", [
      `Admin: ${req.user.full_name || req.user.login || req.user.id}`,
      `Jadvallar: ${Object.keys(payload).join(", ")}`
    ]);
    res.json({ message: "Backup restore muvaffaqiyatli yakunlandi" });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ message: `Backup restore bo'lmadi: ${err.message}` });
  } finally {
    client.release();
  }
});

app.post("/api/backup/preview", authRequired, rolesAllowed("admin"), async (req, res) => {
  try {
    const payload = req.body?.payload || req.body || {};
    const preview = [];
    for (const [tableName, rows] of Object.entries(payload)) {
      if (!Array.isArray(rows)) continue;
      const currentCount = Number((await query(`SELECT COUNT(*)::int AS count FROM ${tableName}`)).rows[0]?.count || 0);
      preview.push({
        table: tableName,
        incoming_count: rows.length,
        current_count: currentCount,
        rows_to_replace: currentCount,
        rows_to_insert: rows.length
      });
    }
    res.json({
      tables: preview,
      total_tables: preview.length,
      total_replace: preview.reduce((sum, row) => sum + row.rows_to_replace, 0),
      total_insert: preview.reduce((sum, row) => sum + row.rows_to_insert, 0)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Backup preview bo'lmadi: ${err.message}` });
  }
});

app.get("/api/executive-summary", authRequired, async (_, res) => {
  try {
    const month = getMonthLabel();
    const [contentRes, bonusRes, expenseRes, taskRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM content_items WHERE plan_month = $1`, [month]),
      query(`SELECT COALESCE(SUM(total_amount),0)::numeric AS amount FROM bonus_items WHERE month_label = $1`, [month]),
      query(`SELECT COALESCE(SUM(amount),0)::numeric AS amount FROM expenses WHERE to_char(expense_date, 'YYYY-MM') = $1`, [month]),
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='done')::int AS done_count FROM tasks WHERE due_date IS NOT NULL AND to_char(due_date, 'YYYY-MM') = $1`, [month])
    ]);
    res.json({
      month_label: month,
      text: `${month} bo'yicha ${contentRes.rows[0]?.count || 0} ta kontent, ${taskRes.rows[0]?.done_count || 0}/${taskRes.rows[0]?.total || 0} ta vazifa, ${bonusRes.rows[0]?.amount || 0} bonus va ${expenseRes.rows[0]?.amount || 0} harajat qayd etildi.`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Executive summary bo'lmadi: ${err.message}` });
  }
});

app.get("/api/employee-kpi", authRequired, async (_, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.full_name,
        COUNT(t.id)::int AS total_tasks,
        COUNT(t.id) FILTER (WHERE t.status='done')::int AS done_tasks,
        COUNT(c.id)::int AS content_count,
        COUNT(tp.id)::int AS travel_count,
        COALESCE(SUM(bi.total_amount),0)::numeric AS bonus_total
      FROM users u
      LEFT JOIN tasks t ON t.assignee_user_id = u.id
      LEFT JOIN content_items c ON c.assigned_user_id = u.id
      LEFT JOIN travel_plans tp ON tp.created_by = u.id
      LEFT JOIN bonus_items bi ON bi.user_id = u.id
      GROUP BY u.id, u.full_name
      ORDER BY done_tasks DESC, content_count DESC, bonus_total DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Employee KPI bo'lmadi: ${err.message}` });
  }
});

app.get("/api/version-history/:entityType/:entityId", authRequired, async (req, res) => {
  try {
    const result = await query(
      `SELECT a.*, u.full_name
       FROM audit_logs a
       LEFT JOIN users u ON u.id = a.user_id
       WHERE a.entity_type = $1 AND a.entity_id = $2
       ORDER BY a.id DESC`,
      [req.params.entityType, Number(req.params.entityId)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Version history bo'lmadi: ${err.message}` });
  }
});

app.get("/api/health", authRequired, rolesAllowed("admin", "manager"), async (_, res) => {
  try {
    const [socketCount, notifCount, backupCount] = await Promise.all([
      Promise.resolve([...userSockets.values()].reduce((sum, set) => sum + set.size, 0)),
      query(`SELECT COUNT(*)::int AS count FROM notifications WHERE is_read = FALSE`),
      query(`SELECT COUNT(*)::int AS count FROM monthly_snapshots`)
    ]);
    res.json({
      socket_connections: socketCount,
      unread_notifications: Number(notifCount.rows[0]?.count || 0),
      monthly_snapshots: Number(backupCount.rows[0]?.count || 0),
      telegram_configured: !!(await getSettingsRow())?.telegram_bot_token,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Health page bo'lmadi: ${err.message}` });
  }
});

app.post("/api/monthly-close", authRequired, rolesAllowed("admin", "manager"), async (req, res) => {
  try {
    const month = req.body?.month_label || getMonthLabel();
    const [bonusRes, expenseRes, kpiRes] = await Promise.all([
      query(`SELECT COALESCE(SUM(total_amount),0)::numeric AS total FROM bonus_items WHERE month_label = $1`, [month]),
      query(`SELECT COALESCE(SUM(amount),0)::numeric AS total FROM expenses WHERE to_char(expense_date,'YYYY-MM') = $1`, [month]),
      query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status='done')::int AS done_count FROM tasks WHERE to_char(due_date,'YYYY-MM') = $1`, [month])
    ]);
    const snapshot = {
      month_label: month,
      bonus_total: Number(bonusRes.rows[0]?.total || 0),
      expense_total: Number(expenseRes.rows[0]?.total || 0),
      task_done: Number(kpiRes.rows[0]?.done_count || 0),
      task_total: Number(kpiRes.rows[0]?.total || 0)
    };
    const inserted = await query(
      `INSERT INTO monthly_snapshots (month_label, snapshot_type, payload_json, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [month, "monthly_close", JSON.stringify(snapshot), req.user.id]
    );
    await createTelegramEvent("Monthly close bajarildi", [
      `Oy: ${month}`,
      `Bonus: ${snapshot.bonus_total}`,
      `Harajat: ${snapshot.expense_total}`
    ]);
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Monthly close bo'lmadi: ${err.message}` });
  }
});

app.post("/api/settings/share-token", authRequired, rolesAllowed("admin", "manager"), async (_, res) => {
  try {
    const token = await ensurePublicShareToken();
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Share token bo'lmadi: ${err.message}` });
  }
});

app.get("/api/share/report/:token", async (req, res) => {
  try {
    const settings = await getSettingsRow();
    if (!settings?.public_share_token || settings.public_share_token !== req.params.token) {
      return res.status(403).json({ message: "Share token noto'g'ri" });
    }
    const month = getMonthLabel();
    const [contentRes, bonusRes, expenseRes] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM content_items WHERE plan_month = $1`, [month]),
      query(`SELECT COALESCE(SUM(total_amount),0)::numeric AS total FROM bonus_items WHERE month_label = $1`, [month]),
      query(`SELECT COALESCE(SUM(amount),0)::numeric AS total FROM expenses WHERE to_char(expense_date,'YYYY-MM') = $1`, [month])
    ]);
    res.json({
      company_name: settings.company_name || "aloo",
      month_label: month,
      content_count: Number(contentRes.rows[0]?.count || 0),
      bonus_total: Number(bonusRes.rows[0]?.total || 0),
      expense_total: Number(expenseRes.rows[0]?.total || 0)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Share report bo'lmadi: ${err.message}` });
  }
});

/* COMMENTS */

app.get("/api/comments/:entityType/:entityId", authRequired, async (req, res) => {
  try {
    const result = await query(
      `
      SELECT
        c.*,
        u.full_name AS author_name,
        u.avatar_url AS author_avatar
      FROM comments c
      LEFT JOIN users u ON u.id = c.author_user_id
      WHERE c.entity_type = $1 AND c.entity_id = $2
      ORDER BY c.id ASC
      `,
      [req.params.entityType, Number(req.params.entityId)]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Izohlarni olib boвЂlmadi: ${err.message}` });
  }
});

app.post("/api/comments", authRequired, async (req, res) => {
  try {
    const { entity_type, entity_id, body } = req.body;

    if (!entity_type || !entity_id || !body?.trim()) {
      return res.status(400).json({ message: "Entity va izoh matni majburiy" });
    }

    const inserted = await query(
      `
      INSERT INTO comments (entity_type, entity_id, body, author_user_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [entity_type, Number(entity_id), body.trim(), req.user.id]
    );

    const mentions = [...body.matchAll(/@([a-zA-Z0-9_]+)/g)].map((item) => item[1].toLowerCase());
    if (mentions.length) {
      const foundUsers = await query(
        `SELECT id, full_name, login, phone FROM users WHERE LOWER(COALESCE(login, '')) = ANY($1) OR LOWER(COALESCE(phone, '')) = ANY($1)`,
        [mentions]
      );
      for (const foundUser of foundUsers.rows) {
        if (Number(foundUser.id) === Number(req.user.id)) continue;
        await createNotification(
          foundUser.id,
          "Siz izohda tilga olindingiz",
          `${req.user.full_name || req.user.login} sizni ${entity_type} izohida eslatdi`,
          "info",
          "mention",
          `/${entity_type}`
        );
      }
    }

    await logAction(req.user.id, "comment", entity_type, Number(entity_id), {});
    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Izohni saqlab boвЂlmadi: ${err.message}` });
  }
});

app.delete("/api/comments/:id", authRequired, async (req, res) => {
  try {
    await query(`DELETE FROM comments WHERE id = $1`, [req.params.id]);
    res.json({ message: "Izoh oвЂchirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: `Izohni oвЂchirib boвЂlmadi: ${err.message}` });
  }
});

/* AUDIT */

app.get("/api/audit-logs", authRequired, async (_, res) => {
  try {
    const result = await query(
      `
      SELECT
        a.*,
        u.full_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.id DESC
      LIMIT 500
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Audit logni olib boвЂlmadi" });
  }
});

/* EXPORTS */

app.get("/api/export/users.xlsx", authRequired, async (_, res) => {
  try {
    const rows = (
      await query(`
        SELECT
          full_name,
          phone,
          login,
          role,
          department_role,
          is_active,
          created_at
        FROM users
        ORDER BY id DESC
      `)
    ).rows;

    await sendExcel(res, rows, "users.xlsx", "Users");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export xatoligi" });
  }
});

app.get("/api/export/content.xlsx", authRequired, async (_, res) => {
  try {
    const rows = (
      await query(`
        SELECT
          title,
          publish_date,
          status,
          platform,
          content_type,
          bonus_enabled,
          proposal_count,
          approved_count,
          plan_month
        FROM content_items
        ORDER BY id DESC
      `)
    ).rows;

    await sendExcel(res, rows, "content.xlsx", "Content");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export xatoligi" });
  }
});

app.get("/api/export/content-calendar.pdf", authRequired, pagePermissionAllowed("content"), async (req, res) => {
  try {
    const month = String(req.query.month || getMonthLabel()).trim();
    const rows = (
      await query(
        `
        SELECT
          title,
          publish_date,
          status,
          platform,
          content_type,
          rubric,
          video_type,
          content_template,
          approval_comment,
          final_url
        FROM content_items
        WHERE to_char(publish_date, 'YYYY-MM') = $1
        ORDER BY publish_date ASC NULLS LAST, id ASC
        `,
        [month]
      )
    ).rows;

    await logAction(req.user.id, "export", "content_items", null, { month_label: month, export_type: "calendar_pdf" });
    sendContentCalendarPdf(res, rows, month, `content-calendar-${month}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kontent kalendar PDF export xatoligi" });
  }
});

app.get("/api/export/bonuses.xlsx", authRequired, async (_, res) => {
  try {
    const rows = (
      await query(`
        SELECT
          month_label,
          work_date,
          content_title,
          content_type,
          proposal_count,
          approved_count,
          proposal_amount,
          approved_amount,
          total_amount
        FROM bonus_items
        ORDER BY id DESC
      `)
    ).rows;

    await sendExcel(res, rows, "bonuses.xlsx", "Bonuses");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export xatoligi" });
  }
});

app.get("/api/export/bonus-payroll.xlsx", authRequired, pagePermissionAllowed("bonus"), async (req, res) => {
  try {
    const month = String(req.query.month || getMonthLabel()).trim();
    const rows = (
      await query(
        `
        WITH participant_rows AS (
          SELECT
            month_label,
            COALESCE(u.full_name, 'Noma''lum') AS employee_name,
            content_title,
            content_type,
            proposal_count,
            approved_count,
            total_amount,
            paid_status
          FROM bonus_items bi
          LEFT JOIN users u ON u.id = bi.user_id
          WHERE bi.month_label = $1 AND bi.content_type <> 'video'
          UNION ALL
          SELECT
            month_label,
            COALESCE(ve.full_name, 'Noma''lum') AS employee_name,
            content_title,
            content_type,
            proposal_count,
            approved_count,
            total_amount,
            paid_status
          FROM bonus_items bi
          LEFT JOIN users ve ON ve.id = bi.video_editor_user_id
          WHERE bi.month_label = $1 AND bi.content_type = 'video'
          UNION ALL
          SELECT
            month_label,
            COALESCE(vf.full_name, 'Noma''lum') AS employee_name,
            content_title,
            content_type,
            proposal_count,
            approved_count,
            total_amount,
            paid_status
          FROM bonus_items bi
          LEFT JOIN users vf ON vf.id = bi.video_face_user_id
          WHERE bi.month_label = $1 AND bi.content_type = 'video'
        )
        SELECT
          month_label,
          employee_name,
          COUNT(*)::int AS content_count,
          SUM(proposal_count)::int AS proposal_count,
          SUM(approved_count)::int AS approved_count,
          SUM(total_amount)::numeric AS payroll_amount,
          CASE
            WHEN COUNT(*) FILTER (WHERE paid_status = 'paid') = COUNT(*) THEN 'paid'
            WHEN COUNT(*) FILTER (WHERE paid_status = 'approved') > 0 THEN 'approved'
            ELSE 'pending'
          END AS payment_status,
          '' AS card_or_account,
          '' AS signature
        FROM participant_rows
        WHERE employee_name <> 'Noma''lum'
        GROUP BY month_label, employee_name
        ORDER BY payroll_amount DESC, content_count DESC, employee_name ASC
        `,
        [month]
      )
    ).rows;

    await logAction(req.user.id, "export", "bonus_items", null, { month_label: month, export_type: "payroll" });
    createTelegramEvent(
      buildPlatformTelegramTitle("📤", "Bonus payroll export", "bonus"),
      [
        "#bonus #payroll #export",
        `📅 Oy: ${month}`,
        `👥 Hodimlar: ${rows.length}`,
        `👨‍💼 Export qildi: ${getActorName(req.user)}`
      ]
    );

    await sendExcel(res, rows, `bonus-payroll-${month}.xlsx`, "BonusPayroll");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Payroll export xatoligi" });
  }
});

app.get("/api/export/daily-reports.xlsx", authRequired, async (_, res) => {
  try {
    const rows = (
      await query(`
        SELECT
          d.report_date,
          b.name AS branch_name,
          stories_count,
          posts_count,
          subscriber_count,
          condition_text,
          notes
        FROM daily_branch_reports d
        LEFT JOIN branches b ON b.id = d.branch_id
        ORDER BY d.report_date DESC
      `)
    ).rows;

    await sendExcel(res, rows, "daily-reports.xlsx", "DailyReports");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export xatoligi" });
  }
});

app.get("/api/export/campaigns.xlsx", authRequired, async (_, res) => {
  try {
    const rows = (
      await query(`
        SELECT
          c.title,
          c.platform,
          b.name AS branch_name,
          c.start_at,
          c.end_at,
          c.start_date,
          c.end_date,
          c.daily_budget,
          c.budget,
          c.spend,
          c.status,
          c.notes
        FROM campaigns c
        LEFT JOIN branches b ON b.id = c.branch_id
        ORDER BY c.start_at DESC NULLS LAST, c.start_date DESC NULLS LAST, c.id DESC
      `)
    ).rows;

    await sendExcel(res, rows, "campaigns.xlsx", "Campaigns");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export xatoligi" });
  }
});

app.get("/api/export/expenses.xlsx", authRequired, pagePermissionAllowed("expenses"), async (req, res) => {
  try {
    const month = String(req.query.month || "").trim();
    const params = [];
    const monthWhere = month ? `WHERE to_char(expense_date, 'YYYY-MM') = $1` : "";
    if (month) params.push(month);
    const rows = (
      await query(
        `
        SELECT
          expense_date,
          title,
          vendor_name,
          card_holder,
          amount,
          currency,
          category,
          payment_type,
          notes
        FROM expenses
        ${monthWhere}
        ORDER BY expense_date DESC NULLS LAST, id DESC
        `,
        params
      )
    ).rows;

    await logAction(req.user.id, "export", "expenses", null, { month_label: month || "all", export_type: "xlsx" });
    createTelegramEvent(buildPlatformTelegramTitle("рџ“¤", "Finance Excel export", "finance"), [
      "#finance #expenses #export",
      `рџ“… Oy: ${month || "all"}`,
      `рџ§ѕ Yozuvlar: ${rows.length}`,
      `рџ‘ЁвЂЌрџ’ј Export qildi: ${getActorName(req.user)}`
    ]);

    await sendExcel(res, rows, `expenses-${month || "all"}.xlsx`, "Expenses");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Harajat Excel export xatoligi" });
  }
});

app.get("/api/export/daily-reports.pdf", authRequired, async (_, res) => {
  try {
    const rows = (
      await query(`
        SELECT
          d.report_date,
          b.name AS branch_name,
          stories_count,
          posts_count,
          subscriber_count,
          condition_text
        FROM daily_branch_reports d
        LEFT JOIN branches b ON b.id = d.branch_id
        ORDER BY d.report_date DESC
      `)
    ).rows;

    sendSimplePdf(res, "Kunlik filial hisobotlari", rows, "daily-reports.pdf");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Export xatoligi" });
  }
});

app.get("/api/export/expenses.pdf", authRequired, pagePermissionAllowed("expenses"), async (req, res) => {
  try {
    const month = String(req.query.month || "").trim();
    const params = [];
    const monthWhere = month ? `WHERE to_char(expense_date, 'YYYY-MM') = $1` : "";
    if (month) params.push(month);
    const rows = (
      await query(
        `
        SELECT
          expense_date,
          title,
          vendor_name,
          category,
          payment_type,
          amount,
          currency
        FROM expenses
        ${monthWhere}
        ORDER BY expense_date DESC NULLS LAST, id DESC
        `,
        params
      )
    ).rows;

    await logAction(req.user.id, "export", "expenses", null, { month_label: month || "all", export_type: "pdf" });
    createTelegramEvent(buildPlatformTelegramTitle("рџ“¤", "Finance PDF export", "finance"), [
      "#finance #expenses #export",
      `рџ“… Oy: ${month || "all"}`,
      `рџ§ѕ Yozuvlar: ${rows.length}`,
      `рџ‘ЁвЂЌрџ’ј Export qildi: ${getActorName(req.user)}`
    ]);

    sendSimplePdf(res, `Aloo SMM finance markazi ${month || ""}`.trim(), rows, `expenses-${month || "all"}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Harajat PDF export xatoligi" });
  }
});

app.get("/api/export/contest-expenses.pdf", authRequired, async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((item) => Number(item))
      .filter((item) => Number.isInteger(item) && item > 0);

    if (!ids.length) {
      return res.status(400).json({ message: "Chop etish uchun yozuv tanlang" });
    }

    const rows = (
      await query(
        `
        SELECT *
        FROM contest_expenses
        WHERE id = ANY($1)
        `,
        [ids]
      )
    ).rows;

    const rowsById = new Map(rows.map((row) => [Number(row.id), row]));
    const orderedRows = ids.map((id) => rowsById.get(id)).filter(Boolean);

    if (!orderedRows.length) {
      return res.status(404).json({ message: "Chop etish uchun yozuv topilmadi" });
    }

    await sendContestExpensePdf(res, orderedRows, "contest-expenses.pdf");
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Contest PDF export xatoligi" });
  }
});

app.get("/api/export/travel-expenses.pdf", authRequired, async (req, res) => {
  try {
    const month = String(req.query.month || "").trim();
    const dateFrom = normalizeDateOnly(String(req.query.date_from || "").trim());
    const dateTo = normalizeDateOnly(String(req.query.date_to || "").trim());
    const params = [];
    const conditions = [];
    let title = "Safar harajatlari hisobot";

    if (dateFrom) {
      params.push(dateFrom);
      conditions.push(`expense_date >= $${params.length}`);
    }

    if (dateTo) {
      params.push(dateTo);
      conditions.push(`expense_date <= $${params.length}`);
    }

    if (dateFrom || dateTo) {
      if (dateFrom && dateTo) {
        title = `${dateFrom} dan ${dateTo} gacha safar harajatlari hisobot`;
      } else if (dateFrom) {
        title = `${dateFrom} dan boshlab safar harajatlari hisobot`;
      } else if (dateTo) {
        title = `${dateTo} gacha safar harajatlari hisobot`;
      }
    } else if (month) {
      params.push(month);
      conditions.push(`to_char(expense_date, 'YYYY-MM') = $${params.length}`);
      title = `${month} safar harajatlari hisobot`;
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = (
      await query(
        `
        SELECT *
        FROM travel_expenses
        ${whereClause}
        ORDER BY sort_order ASC NULLS LAST, expense_date ASC NULLS LAST, id ASC
        `,
        params
      )
    ).rows;

    sendTravelExpensePdf(res, rows, `travel-expenses-${month || "all"}.pdf`, title);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Safar harajatlari PDF export xatoligi" });
  }
});

let campaignLifecycleTimer = null;

async function runStartupJobs() {
  try {
    await ensureRuntimeSchema();
    await ensureDefaultBranches();
  } catch (err) {
    console.error("startup schema error:", err.message);
    return;
  }

  syncCampaignLifecycleNotifications().catch((err) => {
    console.error("campaign lifecycle initial sync error:", err.message);
  });
  if (!campaignLifecycleTimer) {
    campaignLifecycleTimer = setInterval(() => {
      syncCampaignLifecycleNotifications().catch((err) => {
        console.error("campaign lifecycle timer error:", err.message);
      });
    }, 10000);
  }
}

httpServer.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
  runStartupJobs();
});
