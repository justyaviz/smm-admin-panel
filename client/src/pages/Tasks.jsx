import React from "react";
import DataTable from "../components/ui/DataTable";

export default function TasksPage({ rows }) {
  return (
    <DataTable
      title="Vazifalar"
      description="Muddat, muhimlik va bajarilish holati"
      rows={rows}
      columns={[
        { key: "title", label: "Vazifa" },
        { key: "status", label: "Holat" },
        { key: "priority", label: "Muhimlik" },
        { key: "due_date", label: "Muddat" }
      ]}
    />
  );
}
