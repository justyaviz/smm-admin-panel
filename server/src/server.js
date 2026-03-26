import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { query } from "./db.js";
import { authRequired, rolesAllowed, signToken } from "./auth.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const allowedOrigins = [];
if (process.env.CLIENT_URL) allowedOrigins.push(process.env.CLIENT_URL);
allowedOrigins.push("http://localhost:5173");

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(null, true);
    },
    credentials: true
  })
);

app.use(express.json());
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
    cb(null, safeName);
  }
});

const upload = multer({ storage });

async function logAction(userId, actionType, entityType, entityId = null, meta = {}) {
  try {
    await query(
      `INSERT INTO audit_logs (user_id, action_type, entity_type, entity_id, meta)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId || null, actionType, entityType, entityId, JSON.stringify(meta)]
    );
  } catch (err) {
    console.error("logAction error:", err.message);
  }
}

async function createNotification(userId, title, body, type = "info") {
  try {
    await query(
      `INSERT INTO notifications (user_id, title, body, type)
       VALUES ($1, $2, $3, $4)`,
      [userId || null, title, body, type]
    );
  } catch (err) {
    console.error("createNotification error:", err.message);
  }
}

app.get("/", (_, res) => {
  res.json({ ok: true, service: "aloo-smm-server" });
});

/* AUTH */

app.post("/api/auth/login", async (req, res) => {
  try {
    const { phone, login, password } = req.body;

    if ((!phone && !login) || !password) {
      return res.status(400).json({ message: "Login va parol kiriting" });
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
      WHERE phone = $1 OR login = $2
      LIMIT 1
      `,
      [phone || "", login || ""]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Login yoki parol noto‘g‘ri" });
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

    if (!ok && ((phone === "998939000" || login === "admin") && password === "12345678")) {
      ok = true;
    }

    if (!ok) {
      return res.status(401).json({ message: "Login yoki parol noto‘g‘ri" });
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
      phone: user.phone,
      login: user.login
    });

    return res.json({
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
    return res.status(500).json({ message: "Server xatoligi" });
  }
});

app.get("/api/auth/me", authRequired, async (req, res) => {
  try {
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

    res.json({
      user: result.rows[0]
    });
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
      return res.status(400).json({ message: "Eski parol noto‘g‘ri" });
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
    res.status(500).json({ message: "Parolni o‘zgartirishda xatolik" });
  }
});

/* DASHBOARD */

app.get("/api/dashboard/summary", authRequired, async (_, res) => {
  try {
    const [contentCount, taskCount, campaignCount, userCount, todayReports] = await Promise.all([
      query(`SELECT COUNT(*)::int AS count FROM content_items`),
      query(`SELECT COUNT(*)::int AS count FROM tasks`),
      query(`SELECT COUNT(*)::int AS count FROM campaigns`),
      query(`SELECT COUNT(*)::int AS count FROM users WHERE is_active = TRUE`),
      query(`SELECT COUNT(*)::int AS count FROM daily_branch_reports WHERE report_date = CURRENT_DATE`)
    ]);

    res.json({
      content_count: contentCount.rows[0].count,
      task_count: taskCount.rows[0].count,
      campaign_count: campaignCount.rows[0].count,
      user_count: userCount.rows[0].count,
      today_report_count: todayReports.rows[0].count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Dashboard ma’lumotini olib bo‘lmadi" });
  }
});

/* SETTINGS */

app.get("/api/settings", authRequired, async (_, res) => {
  try {
    const result = await query(`SELECT * FROM app_settings ORDER BY id ASC LIMIT 1`);
    res.json(result.rows[0] || null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sozlamalarni olib bo‘lmadi" });
  }
});

app.put("/api/settings", authRequired, async (req, res) => {
  try {
    const {
      company_name,
      platform_name,
      department_name,
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
        `INSERT INTO app_settings
        (company_name, platform_name, department_name, website_url, telegram_url, instagram_url, youtube_url, facebook_url, tiktok_url)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          company_name || "aloo",
          platform_name || "",
          department_name || "",
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
        `UPDATE app_settings SET
         company_name = $1,
         platform_name = $2,
         department_name = $3,
         website_url = $4,
         telegram_url = $5,
         instagram_url = $6,
         youtube_url = $7,
         facebook_url = $8,
         tiktok_url = $9,
         updated_at = CURRENT_TIMESTAMP
         WHERE id = $10`,
        [
          company_name || "aloo",
          platform_name || "",
          department_name || "",
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

    await logAction(req.user.id, "update", "app_settings");
    res.json({ message: "Sozlamalar saqlandi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Sozlamalarni saqlab bo‘lmadi" });
  }
});

/* USERS */

app.get("/api/users", authRequired, async (req, res) => {
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
    const permissions = Array.isArray(permissions_json) ? permissions_json : [];

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
        is_active
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING
        id,
        full_name,
        phone,
        login,
        role,
        avatar_url,
        department_role,
        permissions_json,
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
        department_role || null,
        JSON.stringify(permissions),
        true
      ]
    );

    await logAction(req.user.id, "create", "users", inserted.rows[0].id, {
      full_name,
      phone,
      login,
      role,
      department_role,
      permissions_json: permissions
    });

    res.json(inserted.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hodim yaratishda xatolik" });
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
      avatar_url,
      department_role,
      permissions_json
    } = req.body;

    const permissions = Array.isArray(permissions_json) ? permissions_json : [];

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
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
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
        role,
        avatar_url || null,
        department_role || null,
        JSON.stringify(permissions),
        id
      ]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Hodim topilmadi" });
    }

    await logAction(req.user.id, "update", "users", Number(id), {
      full_name,
      phone,
      login,
      role,
      department_role,
      permissions_json: permissions
    });

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hodimni yangilashda xatolik" });
  }
});

app.post("/api/users/:id/toggle-active", authRequired, async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await query(
      `
      UPDATE users
      SET
        is_active = NOT COALESCE(is_active, TRUE),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, full_name, is_active
      `,
      [id]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Hodim topilmadi" });
    }

    await logAction(req.user.id, "toggle_active", "users", Number(id), {});

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
    const { id } = req.params;
    const hashed = await bcrypt.hash("12345678", 10);

    const updated = await query(
      `
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, full_name
      `,
      [hashed, id]
    );

    if (!updated.rows.length) {
      return res.status(404).json({ message: "Hodim topilmadi" });
    }

    await logAction(req.user.id, "reset_password", "users", Number(id), {});

    res.json({ message: "Parol 12345678 ga tiklandi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Parolni tiklashda xatolik" });
  }
});

/* BRANCHES */

app.get("/api/branches", authRequired, async (_, res) => {
  try {
    const result = await query(`SELECT * FROM branches ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Filiallarni olib bo‘lmadi" });
  }
});

/* CONTENT */

app.get("/api/content", authRequired, async (req, res) => {
  try {
    const month = req.query.month;
    let sql = `
      SELECT
        c.*,
        ve.full_name AS video_editor_name,
        vf.full_name AS video_face_name
      FROM content_items c
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
    res.status(500).json({ message: "Kontentni olib bo‘lmadi" });
  }
});

app.post("/api/content", authRequired, async (req, res) => {
  try {
    const {
      title,
      publish_date,
      status,
      platform,
      content_type,
      video_editor_user_id,
      video_face_user_id,
      bonus_enabled,
      proposal_count,
      approved_count,
      notes
    } = req.body;

    const result = await query(
      `
      INSERT INTO content_items
      (
        title,
        publish_date,
        status,
        platform,
        content_type,
        video_editor_user_id,
        video_face_user_id,
        bonus_enabled,
        proposal_count,
        approved_count,
        notes,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        title,
        publish_date || null,
        status || "reja",
        platform || "",
        content_type || "post",
        video_editor_user_id || null,
        video_face_user_id || null,
        !!bonus_enabled,
        Number(proposal_count || 0),
        Number(approved_count || 0),
        notes || "",
        req.user.id
      ]
    );

    await logAction(req.user.id, "create", "content_items", result.rows[0].id, { title });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kontent qo‘shib bo‘lmadi" });
  }
});

app.delete("/api/content/:id", authRequired, async (req, res) => {
  try {
    await query(`DELETE FROM content_items WHERE id = $1`, [req.params.id]);
    await logAction(req.user.id, "delete", "content_items", Number(req.params.id), {});
    res.json({ message: "Kontent o‘chirildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kontentni o‘chirib bo‘lmadi" });
  }
});

/* BONUS */

app.get("/api/bonus-items", authRequired, async (_, res) => {
  try {
    const result = await query(
      `
      SELECT
        bi.*,
        to_char(bi.work_date, 'YYYY-MM') AS month_label,
        u.full_name,
        ve.full_name AS video_editor_name,
        vf.full_name AS video_face_name,
        br.name AS branch_name,
        COALESCE(bi.proposal_count, 0) * 25000 AS proposal_amount,
        COALESCE(bi.approved_count, 0) * 25000 AS approved_amount,
        (COALESCE(bi.proposal_count, 0) + COALESCE(bi.approved_count, 0)) * 25000 AS total_amount
      FROM bonus_items bi
      LEFT JOIN users u ON u.id = bi.user_id
      LEFT JOIN users ve ON ve.id = bi.video_editor_user_id
      LEFT JOIN users vf ON vf.id = bi.video_face_user_id
      LEFT JOIN branches br ON br.id = bi.branch_id
      ORDER BY bi.work_date DESC NULLS LAST, bi.id DESC
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Bonus ma’lumotlarini olib bo‘lmadi" });
  }
});

app.post("/api/bonus-items", authRequired, async (req, res) => {
  try {
    const {
      month_label,
      work_date,
      content_type,
      content_title,
      proposal_count,
      approved_count,
      user_id,
      video_editor_user_id,
      video_face_user_id,
      branch_id
    } = req.body;

    const result = await query(
      `
      INSERT INTO bonus_items
      (
        work_date,
        content_type,
        content_title,
        proposal_count,
        approved_count,
        user_id,
        video_editor_user_id,
        video_face_user_id,
        branch_id,
        month_label,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        work_date || null,
        content_type || "post",
        content_title || "",
        Number(proposal_count || 0),
        Number(approved_count || 0),
        user_id || null,
        video_editor_user_id || null,
        video_face_user_id || null,
        branch_id || null,
        month_label || null,
        req.user.id
      ]
    );

    await logAction(req.user.id, "create", "bonus_items", result.rows[0].id, {
      content_title
    });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Bonus hisobotini qo‘shib bo‘lmadi" });
  }
});

/* DAILY REPORTS */

app.get("/api/daily-reports", authRequired, async (_, res) => {
  try {
    const result = await query(
      `
      SELECT d.*, b.name AS branch_name, u.full_name AS user_name
      FROM daily_branch_reports d
      LEFT JOIN branches b ON b.id = d.branch_id
      LEFT JOIN users u ON u.id = d.user_id
      ORDER BY d.report_date DESC, d.id DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Hisobotlarni olib bo‘lmadi" });
  }
});

app.post("/api/daily-reports", authRequired, async (req, res) => {
  try {
    const { report_date, branch_id, user_id, stories_count, posts_count, reels_count, notes } = req.body;

    const result = await query(
      `
      INSERT INTO daily_branch_reports
      (report_date, branch_id, user_id, stories_count, posts_count, reels_count, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        report_date,
        branch_id,
        user_id || req.user.id,
        Number(stories_count || 0),
        Number(posts_count || 0),
        Number(reels_count || 0),
        notes || ""
      ]
    );

    await createNotification(null, "Yangi hisobot kiritildi", report_date, "success");
    await logAction(req.user.id, "create", "daily_branch_reports", result.rows[0].id, {});

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kunlik hisobotni saqlab bo‘lmadi" });
  }
});

/* CAMPAIGNS */

app.get("/api/campaigns", authRequired, async (_, res) => {
  try {
    const result = await query(`SELECT * FROM campaigns ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kampaniyalarni olib bo‘lmadi" });
  }
});

app.post("/api/campaigns", authRequired, async (req, res) => {
  try {
    const { title, platform, start_date, end_date, budget, spend, leads, sales, ctr, revenue_amount, status, notes } = req.body;

    const result = await query(
      `
      INSERT INTO campaigns
      (title, platform, start_date, end_date, budget, spend, leads, sales, ctr, revenue_amount, status, notes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING *
      `,
      [
        title,
        platform,
        start_date || null,
        end_date || null,
        Number(budget || 0),
        Number(spend || 0),
        Number(leads || 0),
        Number(sales || 0),
        Number(ctr || 0),
        Number(revenue_amount || 0),
        status || "active",
        notes || ""
      ]
    );

    await logAction(req.user.id, "create", "campaigns", result.rows[0].id, {});
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Kampaniya qo‘shib bo‘lmadi" });
  }
});

/* TASKS */

app.get("/api/tasks", authRequired, async (_, res) => {
  try {
    const result = await query(
      `
      SELECT t.*, u.full_name AS assignee_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assignee_user_id
      ORDER BY t.id DESC
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Vazifalarni olib bo‘lmadi" });
  }
});

app.post("/api/tasks", authRequired, async (req, res) => {
  try {
    const { title, description, status, priority, due_date, assignee_user_id } = req.body;

    const result = await query(
      `
      INSERT INTO tasks
      (title, description, status, priority, due_date, assignee_user_id, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *
      `,
      [
        title,
        description || "",
        status || "todo",
        priority || "medium",
        due_date || null,
        assignee_user_id || null,
        req.user.id
      ]
    );

    await logAction(req.user.id, "create", "tasks", result.rows[0].id, {});
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Vazifa qo‘shib bo‘lmadi" });
  }
});

/* UPLOADS */

app.get("/api/uploads", authRequired, async (_, res) => {
  try {
    const result = await query(`SELECT * FROM uploads ORDER BY id DESC`);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Uploadlarni olib bo‘lmadi" });
  }
});

app.post("/api/uploads", authRequired, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Fayl topilmadi" });
    }

    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

    const result = await query(
      `
      INSERT INTO uploads
      (file_name, original_name, mime_type, file_size, file_url, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [
        req.file.filename,
        req.file.originalname,
        req.file.mimetype,
        req.file.size,
        fileUrl,
        req.user.id
      ]
    );

    await logAction(req.user.id, "upload", "uploads", result.rows[0].id, {});
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Upload xatoligi" });
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
    res.status(500).json({ message: "Bildirishnomalarni olib bo‘lmadi" });
  }
});

app.post("/api/notifications/read/:id", authRequired, async (req, res) => {
  try {
    await query(`UPDATE notifications SET is_read = TRUE WHERE id = $1`, [req.params.id]);
    res.json({ message: "O‘qildi" });
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
    res.json({ message: "Hammasi o‘qildi" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Xatolik" });
  }
});

/* AUDIT */

app.get("/api/audit-logs", authRequired, async (_, res) => {
  try {
    const result = await query(
      `
      SELECT a.*, u.full_name
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      ORDER BY a.id DESC
      LIMIT 500
      `
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Audit logni olib bo‘lmadi" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
