import React from "react";
import DataTable from "../components/ui/DataTable";

export default function Campaigns({ rows }) {
  return (
    <DataTable
      title="Reklama kampaniyalari"
      description="Byudjet, sarf, lead va ROI ko‘rsatkichlari"
      rows={rows}
      columns={[
        { key: "title", label: "Kampaniya" },
        { key: "platform", label: "Platforma" },
        { key: "budget", label: "Byudjet" },
        { key: "spend", label: "Sarf" },
        { key: "leads", label: "Lead" },
        { key: "roi", label: "ROI" },
        { key: "status", label: "Holat" }
      ]}
    />
  );
}
