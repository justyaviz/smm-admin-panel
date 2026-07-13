export const reportTypeLabels = {
  full: 'To‘liq SMM hisoboti',
  summary: 'Umumiy ko‘rsatkichlar',
  platforms: 'Platformalar tahlili',
  branches: 'Filiallar tahlili',
  campaigns: 'Kampaniyalar tahlili',
  content: 'Kontent hisoboti',
};

export const formatLabels = { xlsx: 'Excel (.xlsx)', pdf: 'PDF', csv: 'CSV' };

export function formatNumber(value) {
  return new Intl.NumberFormat('uz-UZ').format(Number(value || 0));
}

export function formatCompact(value) {
  return new Intl.NumberFormat('uz-UZ', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
}

export function formatMoney(value) {
  return `${new Intl.NumberFormat('uz-UZ', { notation: Number(value || 0) > 999999 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(Number(value || 0))} so‘m`;
}

export function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function monthRange() {
  const now = new Date();
  return {
    dateFrom: new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10),
    dateTo: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10),
  };
}
