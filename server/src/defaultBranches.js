export const DEFAULT_BRANCHES = [
  { name: "Bosh ofis", city: "Bosh ofis" },
  { name: "Ohangaron", city: "Ohangaron" },
  { name: "Angren", city: "Angren" },
  { name: "Chirchiq", city: "Chirchiq" },
  { name: "Guliston", city: "Guliston" },
  { name: "Jarqo'rg'on", city: "Jarqo'rg'on" },
  { name: "Sherobod", city: "Sherobod" },
  { name: "Qibray", city: "Qibray" },
  { name: "G'azalkent", city: "G'azalkent" },
  { name: "Olmaliq", city: "Olmaliq" },
  { name: "Piskent", city: "Piskent" },
  { name: "Oqqo'rg'on", city: "Oqqo'rg'on" },
  { name: "Chinoz", city: "Chinoz" },
  { name: "Sho'rchi", city: "Sho'rchi" },
  { name: "Parkent", city: "Parkent" }
];

export const DEFAULT_BRANCH_NAMES = DEFAULT_BRANCHES.map((branch) => branch.name);

export function buildBranchOrderSql(columnName = "name") {
  const caseSql = DEFAULT_BRANCH_NAMES
    .map((name, index) => `WHEN '${name.replace(/'/g, "''")}' THEN ${index + 1}`)
    .join(" ");

  return `CASE ${columnName} ${caseSql} ELSE 999 END, ${columnName} ASC`;
}
