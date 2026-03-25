import jwt from "jsonwebtoken";
import { query } from "./db.js";

export function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      phone: user.phone,
      login: user.login,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export async function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await query(
      `SELECT id, full_name, phone, login, role, avatar_url, is_active
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({ message: "Foydalanuvchi topilmadi" });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({ message: "Akkaunt bloklangan" });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({ message: "Token xato yoki eskirgan" });
  }
}

export function rolesAllowed(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Token required" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Ruxsat yo‘q" });
    }

    next();
  };
}
