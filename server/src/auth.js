import "dotenv/config";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

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

export function authRequired(req, res, next) {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Token required" });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
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

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Sizda bu amal uchun ruxsat yo'q" });
    }

    next();
  };
}
