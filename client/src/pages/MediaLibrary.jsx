import React, { useState } from "react";
import Modal from "../components/ui/Modal";
import { api } from "../api";

export default function MediaLibraryPage({ uploads, onSaved, reload }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!file) return;

    try {
      setSaving(true);
      const formData = new FormData();
      formData.append("file", file);
      await api.upload(formData);
      onSaved("Saqlandi ✅");
      setOpen(false);
      setFile(null);
      await reload();
    } catch (e2) {
      onSaved(e2.message || "Xatolik yuz berdi", "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-grid">
      <div className="card">
        <div className="page-toolbar">
          <div>
            <div className="section-label">Media kutubxona</div>
            <h2>Fayllar</h2>
            <p>Rasm, video, PDF va Excel fayllarni yuklash va saqlash.</p>
          </div>
          <button className="btn primary" type="button" onClick={() => setOpen(true)}>
            Fayl yuklash
          </button>
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
              {uploads?.length ? (
                uploads.map((row) => (
                  <tr key={row.id}>
                    <td>{row.original_name}</td>
                    <td>{row.mime_type}</td>
                    <td>{row.file_size}</td>
                    <td>
                      <a href={row.file_url} target="_blank" rel="noreferrer">
                        Ochish
                      </a>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="empty-cell">
                    Hozircha fayl yo‘q
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={open} title="Fayl yuklash" onClose={() => setOpen(false)} width={560}>
        <form className="upload-form" onSubmit={submit}>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
              Bekor qilish
            </button>
            <button type="submit" className="btn primary" disabled={saving || !file}>
              {saving ? "Yuklanmoqda..." : "Yuklash"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
