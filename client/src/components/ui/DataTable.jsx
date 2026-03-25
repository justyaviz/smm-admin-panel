import React from "react";

export default function DataTable({ title, description, rows, columns, right }) {
  return (
    <div className="card table-card fade-up">
      <div className="section-head">
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {right}
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {columns.map((col) => <th key={col.key}>{col.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows?.length ? rows.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map((col) => <td key={col.key}>{row[col.key] ?? "-"}</td>)}
              </tr>
            )) : (
              <tr><td className="empty-cell" colSpan={columns.length}>Hozircha ma’lumot yo‘q</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
