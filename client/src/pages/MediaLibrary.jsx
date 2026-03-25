import React, { useState } from "react";
import { Upload, Image as ImageIcon } from "lucide-react";
import { api } from "../api";

export default function MediaLibraryPage({ uploads, onToast, reload }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);
      await api.upload(formData);
      await reload();
      setFile(null);
      onToast("Fayl yuklandi ✅", "success");
    } catch (err) {
      onToast(err.message || "Faylni yuklab bo‘lmadi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <div className="section-head">
          <div>
            <div className="section-label">Media</div>
            <h2>Media kutubxona</h2>
            <p>Rasm, video, PDF, Excel va boshqa fayllarni yuklash.</p>
          </div>
        </div>

        <form className="upload-box" onSubmit={handleUpload}>
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          <button className="btn primary" type="submit" disabled={saving || !file}>
            <Upload size={16} />
            {saving ? "Yuklanmoqda..." : "Yuklash"}
          </button>
        </form>
      </div>

      <div className="card">
        <div className="section-head">
          <div>
            <h2>Yuklangan fayllar</h2>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Fayl</th>
                <th>Turi</th>
                <th>Hajmi</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {uploads.length ? (
                uploads.map((row) => (
                  <tr key={row.id}>
                    <td>{row.original_name}</td>
                    <td>{row.mime_type}</td>
                    <td>{row.file_size}</td>
                    <td>
                      <a href={row.file_url} target="_blank" rel="noreferrer">Ochish</a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="empty-cell">Hozircha fayl yo‘q</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
