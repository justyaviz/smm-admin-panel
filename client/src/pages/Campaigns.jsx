import React, { useState } from "react";
import { Megaphone, Plus } from "lucide-react";
import { api } from "../api";

export default function CampaignsPage({ campaigns, onToast, reload }) {
  const [form, setForm] = useState({
    title: "",
    platform: "",
    start_date: "",
    end_date: "",
    budget: 0,
    spend: 0,
    leads: 0,
    sales: 0,
    ctr: 0,
    revenue_amount: 0,
    status: "active",
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  const setField = (key, value) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("campaigns", form);
      await reload();
      setForm({
        title: "",
        platform: "",
        start_date: "",
        end_date: "",
        budget: 0,
        spend: 0,
        leads: 0,
        sales: 0,
        ctr: 0,
        revenue_amount: 0,
        status: "active",
        notes: ""
      });
      onToast("Kampaniya saqlandi ✅", "success");
    } catch (err) {
      onToast(err.message || "Kampaniyani saqlab bo‘lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <div className="section-head">
          <div>
            <div className="section-label">Marketing</div>
            <h2>Reklama kampaniyasi kiritish</h2>
          </div>
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            <span>Kampaniya nomi</span>
            <input value={form.title} onChange={(e) => setField("title", e.target.value)} required />
          </label>

          <label>
            <span>Platforma</span>
            <input value={form.platform} onChange={(e) => setField("platform", e.target.value)} required />
          </label>

          <label>
            <span>Start sana</span>
            <input type="date" value={form.start_date} onChange={(e) => setField("start_date", e.target.value)} />
          </label>

          <label>
            <span>End sana</span>
            <input type="date" value={form.end_date} onChange={(e) => setField("end_date", e.target.value)} />
          </label>

          <label>
            <span>Byudjet</span>
            <input type="number" value={form.budget} onChange={(e) => setField("budget", Number(e.target.value))} />
          </label>

          <label>
            <span>Sarf</span>
            <input type="number" value={form.spend} onChange={(e) => setField("spend", Number(e.target.value))} />
          </label>

          <label>
            <span>Lead</span>
            <input type="number" value={form.leads} onChange={(e) => setField("leads", Number(e.target.value))} />
          </label>

          <label>
            <span>Sotuv</span>
            <input type="number" value={form.sales} onChange={(e) => setField("sales", Number(e.target.value))} />
          </label>

          <label>
            <span>CTR</span>
            <input type="number" value={form.ctr} onChange={(e) => setField("ctr", Number(e.target.value))} />
          </label>

          <label>
            <span>Daromad</span>
            <input type="number" value={form.revenue_amount} onChange={(e) => setField("revenue_amount", Number(e.target.value))} />
          </label>

          <label>
            <span>Status</span>
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="done">done</option>
            </select>
          </label>

          <label className="full-col">
            <span>Izoh</span>
            <input value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
          </label>

          <button className="btn primary" type="submit" disabled={saving}>
            <Plus size={16} />
            {saving ? "Saqlanmoqda..." : "Kampaniya qo‘shish"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Kampaniyalar ro‘yxati</h2>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Kampaniya</th>
                <th>Platforma</th>
                <th>Byudjet</th>
                <th>Sarf</th>
                <th>ROI</th>
                <th>CTR</th>
                <th>CPA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.length ? (
                campaigns.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>{row.platform}</td>
                    <td>{row.budget}</td>
                    <td>{row.spend}</td>
                    <td>{row.roi}</td>
                    <td>{row.ctr}</td>
                    <td>{row.cpa}</td>
                    <td>{row.status}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty-cell">Hozircha kampaniya yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
