import React, { useState } from "react";
import Modal from "../components/ui/Modal";
import { api } from "../api";

export default function UsersPage({ users, onSaved, reload }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    login: "",
    password: "",
    role: "viewer"
  });

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  async function submit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      await api.create("users", form);
      onSaved("Saqlandi ✅");
      setOpen(false);
      setForm({
        full_name: "",
        phone: "",
        login: "",
        password: "",
        role: "viewer"
      });
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
            <div className="section-label">Jamoa</div>
            <h2>Hodimlar</h2>
            <p>Role system: admin, manager, editor, mobilograf, viewer.</p>
          </div>
          <button className="btn primary" type="button" onClick={() => setOpen(true)}>
            Hodim qo‘shish
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Ism</th>
                <th>Telefon</th>
                <th>Login</th>
                <th>Rol</th>
              </tr>
            </thead>
            <tbody>
              {users?.length ? (
                users.map((row) => (
                  <tr key={row.id}>
                    <td>{row.full_name}</td>
                    <td>{row.phone}</td>
                    <td>{row.login || "-"}</td>
                    <td>{row.role
