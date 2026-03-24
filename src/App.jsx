import { useState } from "react";

export default function App() {
  const [open, setOpen] = useState("Kontent reja");

  const menu = [
    "Kontent reja",
    "Syomka",
    "Ijtimoiy tarmoqlar",
    "Oylik hisobotlar",
    "Bonus tizimi",
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "Arial, sans-serif", background: "#f5f7fb" }}>
      <div style={{ width: 260, background: "#eef2f7", padding: 20, borderRight: "1px solid #ddd" }}>
        <h2 style={{ marginTop: 0 }}>E-ONE</h2>
        <p style={{ fontWeight: "bold" }}>SMM (media)</p>

        {menu.map((item) => (
          <div
            key={item}
            onClick={() => setOpen(item)}
            style={{
              padding: 12,
              marginBottom: 8,
              cursor: "pointer",
              background: open === item ? "#1690F5" : "#fff",
              color: open === item ? "#fff" : "#111",
              borderRadius: 12,
              boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
            }}
          >
            {item}
          </div>
        ))}
      </div>

      <div style={{ flex: 1, padding: 24 }}>
        <h1 style={{ marginTop: 0 }}>SMM Admin Panel</h1>
        <h2>{open}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(220px, 1fr))", gap: 16 }}>
          <div style={card}>Kontent topshiriqlari</div>
          <div style={card}>Syomka rejasi</div>
          <div style={card}>Ijtimoiy tarmoq statistikasi</div>
          <div style={card}>Bonus va hisobotlar</div>
        </div>
      </div>
    </div>
  );
}

const card = {
  background: "#fff",
  borderRadius: 18,
  padding: 20,
  boxShadow: "0 6px 18px rgba(0,0,0,0.08)"
};
