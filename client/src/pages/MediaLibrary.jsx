import React from "react";
import DataTable from "../components/ui/DataTable";

export default function MediaLibrary({ rows }) {
  return (
    <DataTable
      title="Media kutubxona"
      description="Rasm, video, PDF, Excel va boshqa fayllar"
      rows={rows}
      columns={[
        { key: "original_name", label: "Fayl" },
        { key: "mime_type", label: "Turi" },
        { key: "file_size", label: "Hajmi" },
        { key: "file_url", label: "Link" }
      ]}
    />
  );
}
