import { useState } from "react";

export default function App() {
  const [open, setOpen] = useState("content");

  const menu = [
    "Kontent reja",
    "Syomka",
    "Ijtimoiy tarmoqlar",
    "Oylik hisobotlar",
    "Bonus tizimi",
  ];

  return (
    <div style={{ display: "flex", height: "100vh", fontFamily: "sans-serif" }}>
      {/* Sidebar */}
      <div style={{ width: 250, background: "#f3f4f6", padding: 20 }}>
        <h2>E-ONE</h2>

        <p><b>SMM (media)</b></p>

        {menu.map((item, i) => (
          <div
            key={i}
            onClick={() => setOpen(item)}
            style={{
              padding: 10,
              margin: "5px 0",
              cursor: "pointer",
              background: open === item ? "#1690F5" : "#fff",
              color: open === item ? "#fff" : "#000",
              borderRadius: 10,
            }}
          >
            {item}
          </div>
        ))}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: 20 }}>
        <h1>SMM Admin Panel</h1>
        <h2>{open}</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div style={card}>Payme nasiya — 38%</div>
          <div style={card}>Uzum nasiya — 44%</div>
          <div style={card}>Open — 40%</div>
          <div style={card}>ZoodPay — 41%</div>
        </div>
      </div>
    </div>
  );
}

const card = {
  background: "#fff",
  padding: 20,
  borderRadius: 20,
  boxShadow: "0 5px 15px rgba(0,0,0,0.1)",
};
