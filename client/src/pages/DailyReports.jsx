import React from "react";
import DataTable from "../components/ui/DataTable";

export default function DailyReports({ rows }) {
  return (
    <DataTable
      title="Kunlik filial hisobotlari"
      description="Mobilograf tomonidan kiritilgan story, post va reels hisobotlari"
      rows={rows}
      columns={[
        { key: "report_date", label: "Sana" },
        { key: "branch_name", label: "Filial" },
        { key: "user_name", label: "Hodim" },
        { key: "stories_count", label: "Stories" },
        { key: "posts_count", label: "Post" },
        { key: "reels_count", label: "Reels" },
        { key: "notes", label: "Izoh" }
      ]}
    />
  );
}
