import { useEffect, useState } from "react";
import { api } from "../api";

export default function KPI() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.kpiSummary().then(setData);
  }, []);

  if (!data) return <div>Loading...</div>;

  return (
    <div className="grid gap-4">
      <h2>KPI va natijalar</h2>

      <div className="grid grid-cols-4 gap-4">
        <div className="card">Umumiy KPI: {data.total_kpi}%</div>
        <div className="card">Kontent: {data.content_score}%</div>
        <div className="card">Output: {data.output_score}%</div>
        <div className="card">Intizom: {data.discipline_score}%</div>
      </div>
    </div>
  );
}
