import React from "react";
import { LogOut, Search, ChevronRight } from "lucide-react";

export default function Sidebar({ menu, active, setActive, search, setSearch, onLogout }) {
  return (
    <aside className="sidebar fade-side">
      <div className="brand-block">
        <div className="brand-mark">a</div>
        <div>
          <div className="brand-name">aloo</div>
          <div className="brand-desc">SMM jamoasi platformasi</div>
        </div>
      </div>

      <div className="sidebar-search">
        <Search size={16} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Qidiruv..." />
      </div>

      <div className="menu-list">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.id} type="button" className={`menu-btn ${active === item.id ? "active" : ""}`} onClick={() => setActive(item.id)}>
              <Icon size={16} />
              <span>{item.title}</span>
              <ChevronRight size={14} className="menu-arrow" />
            </button>
          );
        })}
      </div>

      <button type="button" className="logout-btn" onClick={onLogout}>
        <LogOut size={16} /> Chiqish
      </button>
    </aside>
  );
}
