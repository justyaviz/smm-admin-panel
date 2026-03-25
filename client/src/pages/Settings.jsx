import React, { useEffect, useState } from "react";

export default function SettingsPage({ settings, onSave, theme, setTheme, saving }) {
  const [form, setForm] = useState(settings || {});

  useEffect(() => {
    setForm(settings || {});
  }, [settings]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="page-grid">
      <div className="card fade-up">
        <div className="section-head">
          <div>
            <div className="section-label">Brandbook</div>
            <h2>Ko‘rinish va ranglar</h2>
            <p>aloo brend qoidalariga mos ranglar va vizual uslub</p>
          </div>
          <button className="theme-toggle" type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>{theme === "dark" ? "☀" : "☾"}</button>
        </div>
        <div className="chips-row">
          <span className="color-pill blue">#1690F5</span>
          <span className="color-pill black">#101010</span>
          <span className="color-pill white">#FFFFFF</span>
        </div>
      </div>
      <div className="card fade-up">
        <div className="section-head"><div><h2>Asosiy sozlamalar</h2><p>Platforma ma’lumotlarini yangilang</p></div></div>
        <div className="form-grid">
          <label><span>Kompaniya nomi</span><input value={form.company_name || ""} onChange={(e) => setField("company_name", e.target.value)} /></label>
          <label><span>Platforma nomi</span><input value={form.platform_name || ""} onChange={(e) => setField("platform_name", e.target.value)} /></label>
          <label><span>Bo‘lim</span><input value={form.department_name || ""} onChange={(e) => setField("department_name", e.target.value)} /></label>
          <label><span>Websayt</span><input value={form.website_url || ""} onChange={(e) => setField("website_url", e.target.value)} /></label>
          <label><span>Telegram</span><input value={form.telegram_url || ""} onChange={(e) => setField("telegram_url", e.target.value)} /></label>
          <label><span>Instagram</span><input value={form.instagram_url || ""} onChange={(e) => setField("instagram_url", e.target.value)} /></label>
          <label><span>YouTube</span><input value={form.youtube_url || ""} onChange={(e) => setField("youtube_url", e.target.value)} /></label>
          <label><span>Facebook</span><input value={form.facebook_url || ""} onChange={(e) => setField("facebook_url", e.target.value)} /></label>
          <label><span>TikTok</span><input value={form.tiktok_url || ""} onChange={(e) => setField("tiktok_url", e.target.value)} /></label>
        </div>
        <button className="btn primary mt16" onClick={() => onSave(form)} disabled={saving}>{saving ? "Saqlanmoqda..." : "Saqlash"}</button>
      </div>
    </div>
  );
}
