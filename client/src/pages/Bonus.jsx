import { useEffect, useState } from "react";
import { api } from "../api";

export default function Bonus() {
  const [data, setData] = useState([]);

  useEffect(() => {
    load();
  }, []);

  function load() {
    api.bonusItems().then(setData);
  }

  return (
    <div>
      <h2>Bonus tizimi</h2>

      <button onClick={() => api.exportExcel("/api/export/bonuses.xlsx")}>
        Excel yuklash
      </button>

      <table>
        <thead>
          <tr>
            <th>Sana</th>
            <th>Filial</th>
            <th>Hodim</th>
            <th>Turi</th>
            <th>Soni</th>
            <th>Summa</th>
          </tr>
        </thead>
        <tbody>
          {data.map((x) => (
            <tr key={x.id}>
              <td>{x.work_date}</td>
              <td>{x.branch_name}</td>
              <td>{x.full_name}</td>
              <td>{x.content_type}</td>
              <td>{x.units}</td>
              <td>{x.amount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
