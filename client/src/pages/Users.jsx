import React from "react";
import DataTable from "../components/ui/DataTable";

export default function UsersPage({ rows }) {
  return (
    <DataTable
      title="Hodimlar"
      description="Rol, login va telefon ma’lumotlari"
      rows={rows}
      columns={[
        { key: "full_name", label: "Ism" },
        { key: "phone", label: "Telefon" },
        { key: "login", label: "Login" },
        { key: "role", label: "Rol" }
      ]}
    />
  );
}
