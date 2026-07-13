export const objectiveLabels = {
  awareness: 'Brend xabardorligi',
  traffic: 'Trafik',
  engagement: 'Engagement',
  messages: 'Xabarlar',
  video_views: 'Video ko‘rishlar',
  sales: 'Sotuvlar',
  promo: 'Promo kampaniya',
};

export const campaignStatusLabels = {
  draft: 'Draft', planned: 'Rejada', active: 'Faol', paused: 'To‘xtatilgan', completed: 'Yakunlangan', cancelled: 'Bekor qilingan',
};

export const adStatusLabels = {
  draft: 'Draft', active: 'Faol', paused: 'To‘xtatilgan', completed: 'Yakunlangan', cancelled: 'Bekor qilingan',
};

export function formatMoney(value) {
  return `${new Intl.NumberFormat('uz-UZ').format(Math.round(Number(value || 0)))} so‘m`;
}

export function formatCompact(value) {
  return new Intl.NumberFormat('uz-UZ', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value || 0));
}

export function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('uz-UZ', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}
