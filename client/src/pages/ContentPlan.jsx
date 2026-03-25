import React from "react";
import DataTable from "../components/ui/DataTable";

export default function ContentPlan({ rows }) {
  return (
    <DataTable
      title="Kontent reja"
      description="Platforma, turi, holati va sanasi"
      rows={rows}
      columns={[
        { key: "title", label: "Sarlavha" },
        { key: "platform", label: "Platforma" },
        { key: "content_type", label: "Turi" },
        { key: "status", label: "Holat" },
        { key: "publish_date", label: "Sana" }
      ]}
    />
  );
}
