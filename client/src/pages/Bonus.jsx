import React from "react";
import DataTable from "../components/ui/DataTable";

export default function Bonus({ bonuses }) {
  const total = (bonuses || []).reduce((sum, row) => sum + Number(row.total_amount || 0), 0);
  return (
    <div className="page-grid">
      <div className="card fade-up">
        <div className="section-head">
          <div>
            <h2>Bonus tizimi</h2>
            <p>Soni × 25,000 so‘m formulasi asosida avtomatik hisoblanadi</p>
          </div>
          <div className="bonus-head-total">Jami: {total.toLocaleString()} so‘m</div>
        </div>
      </div>
      <DataTable
        title="Bonuslar ro‘yxati"
        rows={bonuses}
        columns={[
          { key: "full_name", label: "Hodim" },
          { key: "month_label", label: "Oy" },
          { key: "total_units", label: "Soni" },
          { key: "unit_price", label: "Birlik narx" },
          { key: "total_amount", label: "Jami summa" }
        ]}
      />
    </div>
  );
}
