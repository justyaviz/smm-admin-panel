import React, { useEffect, useMemo, useState } from "react";
import { Eye, Pencil, Trash2, X } from "lucide-react";
import { api } from "./api";

const UZBEKISTAN_REGIONS = [
  "Toshkent shahri",
  "Toshkent viloyati",
  "Samarqand",
  "Buxoro",
  "Andijon",
  "Farg'ona",
  "Namangan",
  "Qashqadaryo",
  "Surxondaryo",
  "Jizzax",
  "Sirdaryo",
  "Navoiy",
  "Xorazm",
  "Qoraqalpog'iston"
];

function formatDate(value) {
  if (!value) return "-";
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    if (value.includes("T")) return value.slice(0, 10);
    return value;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toISOString().slice(0, 10);
}

function getMonthLabel(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function getMonthTitle(monthLabel) {
  const [year, month] = String(monthLabel || getMonthLabel()).split("-");
  const names = {
    "01": "Yanvar",
    "02": "Fevral",
    "03": "Mart",
    "04": "Aprel",
    "05": "May",
    "06": "Iyun",
    "07": "Iyul",
    "08": "Avgust",
    "09": "Sentabr",
    "10": "Oktabr",
    "11": "Noyabr",
    "12": "Dekabr"
  };
  return `${names[month] || month} ${year || ""}`.trim();
}

function getDateSortValue(value, fallback = Number.POSITIVE_INFINITY) {
  if (!value) return fallback;
  const normalized = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value}T00:00:00`
    : value;
  const time = new Date(normalized).getTime();
  return Number.isNaN(time) ? fallback : time;
}

function sortRowsByDate(rows = [], dateKey = "expense_date", direction = "asc") {
  const fallback = direction === "desc" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
  return [...(rows || [])].sort((a, b) => {
    const aTime = getDateSortValue(a?.[dateKey], fallback);
    const bTime = getDateSortValue(b?.[dateKey], fallback);
    if (aTime === bTime) return Number(a?.id || 0) - Number(b?.id || 0);
    return direction === "desc" ? bTime - aTime : aTime - bTime;
  });
}

function SectionTitle({ title, desc, right }) {
  return (
    <div className="section-title-row">
      <div>
        <h2>{title}</h2>
        {desc ? <p>{desc}</p> : null}
      </div>
      {right}
    </div>
  );
}

function StatCard({ title, value, hint, tone = "default" }) {
  return (
    <div className={`stat-card stat-card-${tone}`}>
      <span className={`stat-card-indicator stat-card-indicator-${tone}`} />
      <div className="stat-card-title">{title}</div>
      <div className="stat-card-value">{value}</div>
      {hint ? <div className="stat-card-hint">{hint}</div> : null}
    </div>
  );
}

function Modal({ open, onClose, title, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="modal-wrap">
      <div className="modal-backdrop" onClick={onClose} />
      <div className={`modal-card ${wide ? "wide" : ""}`}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

function IconActions({ onView, onEdit, onDelete }) {
  return (
    <div className="icon-actions">
      {onView ? (
        <button type="button" className="icon-btn" onClick={onView} title="Ko'rish">
          <Eye size={16} />
        </button>
      ) : null}
      {onEdit ? (
        <button type="button" className="icon-btn" onClick={onEdit} title="Tahrirlash">
          <Pencil size={16} />
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="icon-btn danger" onClick={onDelete} title="O'chirish">
          <Trash2 size={16} />
        </button>
      ) : null}
    </div>
  );
}

export default function ContestExpensesPanel({ contestExpenses = [], onToast, reload }) {
  const emptyContestForm = {
    expense_date: "",
    contest_name: "",
    prize_name: "",
    prize_image_url: "",
    winner_location: "",
    winner_region: UZBEKISTAN_REGIONS[0],
    winner_name: "",
    winner_phone: "",
    proof_image_url: ""
  };

  const [contestForm, setContestForm] = useState(emptyContestForm);
  const [contestSaving, setContestSaving] = useState(false);
  const [contestEditRow, setContestEditRow] = useState(null);
  const [contestViewRow, setContestViewRow] = useState(null);
  const [contestMonthFilter, setContestMonthFilter] = useState(getMonthLabel());
  const [prizeImageFile, setPrizeImageFile] = useState(null);
  const [proofImageFile, setProofImageFile] = useState(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedContestIds, setSelectedContestIds] = useState([]);

  const setContestField = (key, value) => setContestForm((prev) => ({ ...prev, [key]: value }));

  function resetContestForm() {
    setContestForm(emptyContestForm);
    setContestEditRow(null);
    setPrizeImageFile(null);
    setProofImageFile(null);
  }

  function startContestEdit(row) {
    setContestEditRow(row);
    setContestForm({
      expense_date: formatDate(row.expense_date) === "-" ? "" : formatDate(row.expense_date),
      contest_name: row.contest_name || "",
      prize_name: row.prize_name || "",
      prize_image_url: row.prize_image_url || "",
      winner_location: row.winner_location || "",
      winner_region: row.winner_region || UZBEKISTAN_REGIONS[0],
      winner_name: row.winner_name || "",
      winner_phone: row.winner_phone || "",
      proof_image_url: row.proof_image_url || ""
    });
    setPrizeImageFile(null);
    setProofImageFile(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function uploadContestImage(file, versionLabel) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder_name", "contest-expenses");
    formData.append("version_label", versionLabel);
    formData.append("tags_json", JSON.stringify(["contest-expense", versionLabel]));
    const uploaded = await api.upload(formData);
    return uploaded?.file_url || "";
  }

  async function handleContestSubmit(e) {
    e.preventDefault();
    try {
      setContestSaving(true);

      let prizeImageUrl = contestForm.prize_image_url || "";
      let proofImageUrl = contestForm.proof_image_url || "";

      if (prizeImageFile) {
        prizeImageUrl = await uploadContestImage(prizeImageFile, "prize-image");
      }
      if (proofImageFile) {
        proofImageUrl = await uploadContestImage(proofImageFile, "proof-image");
      }

      const payload = {
        ...contestForm,
        prize_image_url: prizeImageUrl || null,
        proof_image_url: proofImageUrl || null
      };

      if (contestEditRow?.id) {
        await api.update("contest-expenses", contestEditRow.id, payload);
        onToast("Konkurs harajati yangilandi", "success");
      } else {
        await api.create("contest-expenses", payload);
        onToast("Konkurs harajati saqlandi", "success");
      }

      await reload();
      resetContestForm();
    } catch (err) {
      onToast(err.message || "Konkurs harajatini saqlab bo'lmadi", "error");
    } finally {
      setContestSaving(false);
    }
  }

  async function removeContestRow(id) {
    if (!window.confirm("Konkurs harajati rostdan ham o'chirilsinmi?")) return;
    try {
      await api.remove("contest-expenses", id);
      await reload();
      onToast("Konkurs harajati o'chirildi", "success");
    } catch (err) {
      onToast(err.message || "Konkurs harajatini o'chirib bo'lmadi", "error");
    }
  }

  async function printContestExpenses() {
    if (!selectedContestIds.length) {
      onToast("Chop etish uchun kamida bitta yozuv tanlang", "error");
      return;
    }
    try {
      await api.exportFile(
        `/api/export/contest-expenses.pdf?ids=${encodeURIComponent(selectedContestIds.join(","))}`,
        `contest-expenses-${contestMonthFilter}.pdf`
      );
      onToast("PDF tayyorlandi", "success");
      setPrintModalOpen(false);
    } catch (err) {
      onToast(err.message || "PDF tayyorlab bo'lmadi", "error");
    }
  }

  const contestMonthOptions = [...new Set([
    getMonthLabel(),
    ...contestExpenses.map((item) => formatDate(item.expense_date).slice(0, 7)).filter((item) => item && item !== "-")
  ])];

  const filteredContestExpenses = useMemo(() => sortRowsByDate(
    contestExpenses.filter((item) => !contestMonthFilter || formatDate(item.expense_date).startsWith(contestMonthFilter)),
    "expense_date"
  ), [contestExpenses, contestMonthFilter]);

  const contestStats = {
    rows: filteredContestExpenses.length,
    prizeImages: filteredContestExpenses.filter((item) => item.prize_image_url).length,
    proofImages: filteredContestExpenses.filter((item) => item.proof_image_url).length
  };

  useEffect(() => {
    if (printModalOpen) {
      setSelectedContestIds(filteredContestExpenses.map((row) => row.id));
    }
  }, [printModalOpen, filteredContestExpenses]);

  const renderContestImage = (url, alt) => (
    url ? (
      <a href={url} target="_blank" rel="noreferrer">
        <img
          src={url}
          alt={alt}
          style={{
            width: "100%",
            maxWidth: 180,
            height: 110,
            objectFit: "cover",
            borderRadius: 14,
            border: "1px solid var(--border)"
          }}
        />
      </a>
    ) : <div className="empty-block">Hozircha rasm yo'q</div>
  );

  return (
    <>
      <div className="card">
        <SectionTitle
          title={contestEditRow ? "Konkurs harajatini tahrirlash" : "Konkurs harajatini qo'shish"}
          desc="Sovga, g'olib va tasdiq rasmini bir joyda yuritish uchun"
          right={contestEditRow ? <button type="button" className="btn secondary" onClick={resetContestForm}>Bekor qilish</button> : null}
        />
        <form className="form-grid" onSubmit={handleContestSubmit}>
          <label><span>Sana</span><input type="date" value={contestForm.expense_date} onChange={(e) => setContestField("expense_date", e.target.value)} required /></label>
          <label><span>Konkurs nomi</span><input value={contestForm.contest_name} onChange={(e) => setContestField("contest_name", e.target.value)} required /></label>
          <label><span>Sovga nomi</span><input value={contestForm.prize_name} onChange={(e) => setContestField("prize_name", e.target.value)} required /></label>
          <label><span>Qayerga</span><input value={contestForm.winner_location} onChange={(e) => setContestField("winner_location", e.target.value)} placeholder="Shahar, tuman yoki manzil" /></label>
          <label><span>Viloyat</span><select value={contestForm.winner_region} onChange={(e) => setContestField("winner_region", e.target.value)}>{UZBEKISTAN_REGIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label><span>Yutib olgan shaxs</span><input value={contestForm.winner_name} onChange={(e) => setContestField("winner_name", e.target.value)} required /></label>
          <label><span>Telefon raqam</span><input value={contestForm.winner_phone} onChange={(e) => setContestField("winner_phone", e.target.value)} placeholder="+998..." required /></label>
          <div />
          <label className="full-col">
            <span>Sovga rasmi</span>
            <input type="file" accept="image/*" onChange={(e) => setPrizeImageFile(e.target.files?.[0] || null)} />
            {prizeImageFile ? <div className="muted-inline">Tanlandi: {prizeImageFile.name}</div> : null}
            <div style={{ marginTop: 10 }}>{renderContestImage(contestForm.prize_image_url, "Sovga rasmi")}</div>
          </label>
          <label className="full-col">
            <span>Tasdiq uchun rasm</span>
            <input type="file" accept="image/*" onChange={(e) => setProofImageFile(e.target.files?.[0] || null)} />
            {proofImageFile ? <div className="muted-inline">Tanlandi: {proofImageFile.name}</div> : null}
            <div style={{ marginTop: 10 }}>{renderContestImage(contestForm.proof_image_url, "Tasdiq rasmi")}</div>
          </label>
          <button className="btn primary" type="submit" disabled={contestSaving}>{contestSaving ? "Saqlanmoqda..." : contestEditRow ? "Yangilash" : "Saqlash"}</button>
        </form>
      </div>

      <div className="stats-grid">
        <StatCard title="Konkurs yozuvlari" value={contestStats.rows} hint={getMonthTitle(contestMonthFilter)} tone="info" />
        <StatCard title="Sovga rasmi bor" value={contestStats.prizeImages} hint="biriktirilgan yozuvlar" tone="success" />
        <StatCard title="Tasdiq rasmi bor" value={contestStats.proofImages} hint="PDF uchun tayyor" tone="warning" />
      </div>

      <div className="card">
        <SectionTitle
          title="Konkurs harajatlari ro'yxati"
          desc={getMonthTitle(contestMonthFilter)}
          right={
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <select value={contestMonthFilter} onChange={(e) => setContestMonthFilter(e.target.value)}>
                {contestMonthOptions.map((item) => <option key={item} value={item}>{getMonthTitle(item)}</option>)}
              </select>
              <button type="button" className="btn secondary" onClick={() => setPrintModalOpen(true)}>Chop etish</button>
            </div>
          }
        />
        <div className="table-wrap desktop-table">
          <table>
            <thead><tr><th>Sana</th><th>Konkurs</th><th>Sovga</th><th>Hudud</th><th>G'olib</th><th>Rasmlar</th><th>Amallar</th></tr></thead>
            <tbody>
              {filteredContestExpenses.length ? filteredContestExpenses.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.expense_date)}</td>
                  <td>{row.contest_name}</td>
                  <td>{row.prize_name}</td>
                  <td>
                    <div>{row.winner_region}</div>
                    <div className="muted-inline">{row.winner_location || "-"}</div>
                  </td>
                  <td>
                    <div>{row.winner_name}</div>
                    <div className="muted-inline">{row.winner_phone}</div>
                  </td>
                  <td>
                    <div className="table-badge-stack">
                      <span className={row.prize_image_url ? "mini-badge success" : "mini-badge default"}>Sovga</span>
                      <span className={row.proof_image_url ? "mini-badge info" : "mini-badge default"}>Tasdiq</span>
                    </div>
                  </td>
                  <td><IconActions onView={() => setContestViewRow(row)} onEdit={() => startContestEdit(row)} onDelete={() => removeContestRow(row.id)} /></td>
                </tr>
              )) : <tr><td colSpan="7" className="empty-cell">Bu oy uchun konkurs harajati yo'q</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="mobile-card-list">
          {filteredContestExpenses.length ? filteredContestExpenses.map((row) => (
            <div key={row.id} className="mobile-record-card">
              <div className="mobile-record-head">
                <div className="mobile-record-title">
                  <strong>{row.contest_name}</strong>
                  <span>{formatDate(row.expense_date)}</span>
                </div>
                <div className="table-badge-stack">
                  <span className={row.prize_image_url ? "mini-badge success" : "mini-badge default"}>Sovga</span>
                  <span className={row.proof_image_url ? "mini-badge info" : "mini-badge default"}>Tasdiq</span>
                </div>
              </div>
              <div className="mobile-record-grid">
                <div className="mobile-record-field">
                  <label>Sovga</label>
                  <div>{row.prize_name}</div>
                </div>
                <div className="mobile-record-field">
                  <label>G'olib</label>
                  <div>{row.winner_name}</div>
                </div>
                <div className="mobile-record-field">
                  <label>Telefon</label>
                  <div>{row.winner_phone}</div>
                </div>
                <div className="mobile-record-field">
                  <label>Hudud</label>
                  <div>{row.winner_region}</div>
                </div>
              </div>
              <div className="mobile-record-actions">
                <IconActions onView={() => setContestViewRow(row)} onEdit={() => startContestEdit(row)} onDelete={() => removeContestRow(row.id)} />
              </div>
            </div>
          )) : <div className="mobile-record-card empty">Bu oy uchun konkurs harajati yo'q</div>}
        </div>
      </div>

      <Modal open={!!contestViewRow} onClose={() => setContestViewRow(null)} title="Konkurs harajati tafsiloti" wide>
        {contestViewRow ? <div className="detail-grid">
          <div><strong>Sana:</strong> {formatDate(contestViewRow.expense_date)}</div>
          <div><strong>Konkurs nomi:</strong> {contestViewRow.contest_name}</div>
          <div><strong>Sovga nomi:</strong> {contestViewRow.prize_name}</div>
          <div><strong>Qayerga:</strong> {contestViewRow.winner_location || "-"}</div>
          <div><strong>Viloyat:</strong> {contestViewRow.winner_region}</div>
          <div><strong>G'olib:</strong> {contestViewRow.winner_name}</div>
          <div><strong>Telefon:</strong> {contestViewRow.winner_phone}</div>
          <div className="full-col">
            <strong>Sovga rasmi</strong>
            <div style={{ marginTop: 10 }}>{renderContestImage(contestViewRow.prize_image_url, "Sovga rasmi")}</div>
          </div>
          <div className="full-col">
            <strong>Tasdiq uchun rasm</strong>
            <div style={{ marginTop: 10 }}>{renderContestImage(contestViewRow.proof_image_url, "Tasdiq rasmi")}</div>
          </div>
        </div> : null}
      </Modal>

      <Modal open={printModalOpen} onClose={() => setPrintModalOpen(false)} title="Konkurs harajatlarini chop etish" wide>
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button type="button" className="btn secondary" onClick={() => setSelectedContestIds(filteredContestExpenses.map((row) => row.id))}>Hammasini tanlash</button>
            <button type="button" className="btn secondary" onClick={() => setSelectedContestIds([])}>Tozalash</button>
          </div>
          <div className="discussion-list" style={{ maxHeight: 360 }}>
            {filteredContestExpenses.length ? filteredContestExpenses.map((row, index) => (
              <label key={row.id} className="discussion-item" style={{ display: "grid", gridTemplateColumns: "20px 1fr", gap: 12, alignItems: "start", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={selectedContestIds.includes(row.id)}
                  onChange={(e) => {
                    setSelectedContestIds((prev) => (
                      e.target.checked
                        ? [...new Set([...prev, row.id])]
                        : prev.filter((item) => item !== row.id)
                    ));
                  }}
                />
                <div>
                  <strong>{`Yozuv ${index + 1}`}</strong>
                  <div>{row.contest_name} - {row.prize_name}</div>
                  <span>{formatDate(row.expense_date)} | {row.winner_name} | {row.winner_region}</span>
                </div>
              </label>
            )) : <div className="empty-block">Chop etish uchun yozuv yo'q</div>}
          </div>
          <button type="button" className="btn primary" onClick={printContestExpenses}>PDF chop etish</button>
        </div>
      </Modal>
    </>
  );
}
