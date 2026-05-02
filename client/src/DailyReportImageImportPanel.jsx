import React, { useState } from "react";
import { Upload } from "lucide-react";
import { api } from "./api";

const panelStyle = {
  display: "grid",
  gap: "18px"
};

const statusStyle = {
  border: "1px solid rgba(59, 130, 246, 0.18)",
  background: "rgba(59, 130, 246, 0.08)",
  borderRadius: "18px",
  padding: "16px 18px"
};

export default function DailyReportImageImportPanel({ onToast, reload }) {
  const [contentImage, setContentImage] = useState(null);
  const [metricsImage, setMetricsImage] = useState(null);
  const [fallbackDate, setFallbackDate] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);

  async function handleImport(event) {
    event.preventDefault();

    if (!contentImage || !metricsImage) {
      onToast("2 ta rasm yuklang", "error");
      return;
    }

    try {
      setProcessing(true);
      setResult(null);

      const formData = new FormData();
      formData.append("content_image", contentImage);
      formData.append("metrics_image", metricsImage);
      if (fallbackDate) {
        formData.append("report_date", fallbackDate);
      }

      const data = await api.postForm("/api/daily-reports/import-images", formData);
      await reload();
      setResult(data);
      onToast(`${data.imported_count || 0} ta filial hisobotiga yozildi`, "success");
      setContentImage(null);
      setMetricsImage(null);
    } catch (err) {
      onToast(err.message || "Rasmlar orqali to'ldirib bo'lmadi", "error");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="card">
      <div className="section-title-row">
        <div>
          <h2>Rasm orqali to'ldirish</h2>
          <p>2 ta screenshot yuklang: 1) post/story jadvali, 2) obunachi va ahvat jadvali.</p>
        </div>
        <div className="toolbar-actions">
          <span className="pill-chip info">
            <Upload size={14} />
            OCR import
          </span>
        </div>
      </div>

      <form className="form-grid" onSubmit={handleImport} style={panelStyle}>
        <label>
          <span>Post va story rasmi</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setContentImage(event.target.files?.[0] || null)}
            required
          />
        </label>

        <label>
          <span>Obunachi va ahvat rasmi</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => setMetricsImage(event.target.files?.[0] || null)}
            required
          />
        </label>

        <label>
          <span>Sana topilmasa ishlatiladigan sana</span>
          <input type="date" value={fallbackDate} onChange={(event) => setFallbackDate(event.target.value)} />
          <small className="field-note">OCR rasmdan sanani topolmasa shu maydon ishlatiladi.</small>
        </label>

        <div className="full-col toolbar-actions" style={{ justifyContent: "flex-start" }}>
          <button type="submit" className="btn primary" disabled={processing}>
            {processing ? (
              <>
                <Upload size={16} />
                Jarayonda...
              </>
            ) : (
              <>
                <Upload size={16} />
                Rasmlar bilan to'ldirish
              </>
            )}
          </button>
        </div>
      </form>

      {processing ? (
        <div style={statusStyle}>
          <strong>Jarayonda...</strong>
          <div style={{ marginTop: 6 }}>Rasmlar o'qilyapti, filiallar avtomatik to'ldirilmoqda.</div>
        </div>
      ) : null}

      {result ? (
        <div style={statusStyle}>
          <strong>Import yakunlandi</strong>
          <div style={{ marginTop: 6 }}>
            Sana: {result.report_date} | Yozilgan filiallar: {result.imported_count || 0}
          </div>
          <div style={{ marginTop: 6 }}>
            Post/story topildi: {result.parsed_content_branches || 0} | Obunachi/ahvat topildi: {result.parsed_audience_branches || 0}
          </div>
          {Array.isArray(result.warnings) && result.warnings.length ? (
            <div style={{ marginTop: 10 }}>
              {result.warnings.map((warning, index) => (
                <div key={`${warning}-${index}`} style={{ color: "#b45309", marginTop: 4 }}>
                  {warning}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
