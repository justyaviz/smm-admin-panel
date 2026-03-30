import "dotenv/config";
import jwt from "jsonwebtoken";
import { query } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

function safePermissions(raw) {
  return Array.isArray(raw) ? raw : [];
}

function roleAllowed(userRole, roles = []) {
  if (roles.includes(userRole)) return true;
  if (userRole === "director" && roles.includes("manager")) return true;
  return false;
}

export function hasPermission(user, permission) {
  if (user?.role === "admin") return true;
  return safePermissions(user?.permissions_json).includes(permission);
}

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      full_name: user.full_name,
      phone: user.phone,
      login: user.login,
      role: user.role,
      avatar_url: user.avatar_url,
      department_role: user.department_role,
      permissions_json: user.permissions_json,
      is_active: user.is_active
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

export async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
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
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Foydalanuvchi topilmadi" });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: "Akkaunt bloklangan" });
    }

    req.user = {
      ...user,
      permissions_json: safePermissions(user.permissions_json)
    };
    next();
  } catch {
    return res.status(401).json({ message: "Token invalid" });
  }
}

export function rolesAllowed(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Token required" });
    }

    if (!roleAllowed(req.user.role, roles)) {
      return res.status(403).json({ message: "Sizda bu amal uchun ruxsat yo'q" });
    }

    next();
  };
}

export function pagePermissionAllowed(pageKey) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Token required" });
    }

    if (!hasPermission(req.user, pageKey)) {
      return res.status(403).json({ message: "Sizda bu sahifaga ruxsat yo'q" });
    }

    next();
  };
}

export function actionPermissionAllowed(pageKey, action) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Token required" });
    }

    if (!hasPermission(req.user, `${pageKey}_${action}`)) {
      return res.status(403).json({ message: "Sizda bu amal uchun ruxsat yo'q" });
    }

    next();
  };
}
