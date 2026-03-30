const UZ_MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr"
];

const CONTENT_TYPE_LABELS = {
  post: "Post",
  story: "Story",
  reels: "Reels",
  video: "Video",
  "mobi-video": "Mobi-video",
  banner: "Banner",
  flayer: "Flayer",
  "dokon-dizayni": "Do'kon dizayni",
  "boshqa-ishlar": "Boshqa ishlar",
  "aloo-uz-sayti": "aloo.uz sayti",
  boshqalar: "Boshqalar"
};

const STATUS_META = {
  reja: { label: "Reja", bg: "#EEF4FF", fg: "#2C5DF8" },
  tasdiqlandi: { label: "Tasdiqlandi", bg: "#E8FFF2", fg: "#13975F" },
  jarayonda: { label: "Jarayonda", bg: "#FFF3E5", fg: "#D9822B" },
  tayyorlanmoqda: { label: "Tayyorlanmoqda", bg: "#FFF3E5", fg: "#D9822B" },
  tayyor: { label: "Tayyor", bg: "#EEF4FF", fg: "#4C68FF" },
  qayta_ishlash: { label: "Qayta ishlash", bg: "#FFF0F3", fg: "#D63D66" },
  rad_etildi: { label: "Rad etildi", bg: "#FFF0F3", fg: "#D63D66" },
  yakunlandi: { label: "Yakunlandi", bg: "#E8FFF2", fg: "#13975F" },
  joylangan: { label: "Joylandi", bg: "#E8FFF2", fg: "#13975F" },
  draft: { label: "Draft", bg: "#F5F7FB", fg: "#61708A" },
  approved: { label: "Tasdiqlangan", bg: "#E8FFF2", fg: "#13975F" }
};

export function safePermissions(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function canAccessPage(user, pageKey) {
  if (pageKey === "profile") return true;
  if (user?.role === "admin") return true;
  const permissions = safePermissions(user?.permissions_json);
  if (!permissions.length) {
    return ["dashboard", "profile"].includes(pageKey);
  }
  return permissions.includes(pageKey);
}

export function getMonthLabel(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getMonthTitle(monthLabel) {
  if (!monthLabel || !/^\d{4}-\d{2}$/.test(monthLabel)) return monthLabel || "-";
  const [year, month] = monthLabel.split("-");
  const label = UZ_MONTHS[Number(month) - 1] || month;
  return `${label} ${year}`;
}

export function formatDate(value) {
  if (!value) return "-";
  const stringValue = String(value).includes("T") ? String(value).slice(0, 10) : String(value);
  const parts = stringValue.split("-");
  if (parts.length === 3) {
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  }
  return stringValue;
}

export function formatMoney(value) {
  const amount = Number(value || 0);
  return `${amount.toLocaleString("en-US")} so'm`;
}

export function formatRoleLabel(role) {
  if (role === "director") return "rahbar";
  if (role === "manager") return "manager";
  if (role === "admin") return "admin";
  return role || "-";
}

export function formatContentType(value) {
  return CONTENT_TYPE_LABELS[value] || value || "-";
}

export function getStatusMeta(status) {
  return STATUS_META[status] || { label: status || "-", bg: "#F5F7FB", fg: "#61708A" };
}

export function rowMatchesSearch(row, fields = [], search = "") {
  const query = String(search || "").trim().toLowerCase();
  if (!query) return true;
  return fields.some((field) => String(row?.[field] || field || "").toLowerCase().includes(query));
}

export function sortByDateAsc(rows = [], key) {
  return [...rows].sort((a, b) => {
    const aValue = String(a?.[key] || "");
    const bValue = String(b?.[key] || "");
    return aValue.localeCompare(bValue) || Number(a?.id || 0) - Number(b?.id || 0);
  });
}
