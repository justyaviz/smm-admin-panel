import React from "react";
import { Bell, Moon, SunMedium, User } from "lucide-react";

export default function Topbar({ title, user, notificationsCount, theme, setTheme }) {
  return (
    <div className="topbar fade-up">
      <div>
        <div className="small-label">aloo platforma</div>
        <h1>{title}</h1>
      </div>
      <div className="topbar-right">
        <div className="notif-pill"><Bell size={16} /> {notificationsCount}</div>
        <button className="theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? <SunMedium size={16} /> : <Moon size={16} />}</button>
        <div className="user-chip"><User size={16} /> <span>{user?.full_name || "Foydalanuvchi"}</span></div>
      </div>
    </div>
  );
}
