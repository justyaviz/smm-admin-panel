import React from "react";

export default function StatCard({ icon: Icon, title, value, note, accent = "blue" }) {
  return (
    <div className="stat-card fade-up">
      <div className="stat-top">
        <div className={`stat-icon ${accent}`}>{Icon ? <Icon size={17} /> : null}</div>
        <div className="stat-chip">Jonli</div>
      </div>
      <div className="stat-title">{title}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-note">{note}</div>
    </div>
  );
}
