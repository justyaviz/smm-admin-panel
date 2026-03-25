import React from "react";
import DataTable from "../components/ui/DataTable";

export default function BranchesPage({ rows }) {
  return (
    <DataTable
      title="Filiallar"
      description="Shahar, manager va aloqa ma’lumotlari"
      rows={rows}
      columns={[
        { key: "name", label: "Filial" },
        { key: "city", label: "Shahar" },
        { key: "manager_name", label: "Manager" },
        { key: "phone", label: "Telefon" }
      ]}
    />
  );
}
