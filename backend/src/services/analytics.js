import { pool } from '../db/pool.js';

export function normalizeAnalyticsFilters(input = {}) {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const last = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const asDate = (value, fallback) => {
    if (!value) return fallback;
    const parsed = new Date(`${String(value).slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString().slice(0, 10);
  };
  const dateFrom = asDate(input.dateFrom || input.from, first.toISOString().slice(0, 10));
  const dateTo = asDate(input.dateTo || input.to, last.toISOString().slice(0, 10));
  return {
    dateFrom: dateFrom <= dateTo ? dateFrom : dateTo,
    dateTo: dateTo >= dateFrom ? dateTo : dateFrom,
    platformId: Number(input.platformId) > 0 ? Number(input.platformId) : null,
    branchId: Number(input.branchId) > 0 ? Number(input.branchId) : null,
  };
}

function metricsFromRow(row = {}) {
  const summary = {
    records: Number(row.records || 0),
    reach: Number(row.reach || 0),
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    engagement: Number(row.engagement || 0),
    messages: Number(row.messages || 0),
    videoViews: Number(row.video_views || 0),
    followersGained: Number(row.followers_gained || 0),
    leads: Number(row.leads || 0),
    salesCount: Number(row.sales_count || 0),
    salesValue: Number(row.sales_value || 0),
    spend: Number(row.spend || 0),
  };
  summary.ctr = summary.impressions > 0 ? Number(((summary.clicks / summary.impressions) * 100).toFixed(2)) : 0;
  summary.cpm = summary.impressions > 0 ? Number(((summary.spend / summary.impressions) * 1000).toFixed(2)) : 0;
  summary.cpc = summary.clicks > 0 ? Number((summary.spend / summary.clicks).toFixed(2)) : 0;
  summary.cpl = summary.leads > 0 ? Number((summary.spend / summary.leads).toFixed(2)) : 0;
  summary.engagementRate = summary.reach > 0 ? Number(((summary.engagement / summary.reach) * 100).toFixed(2)) : 0;
  summary.roas = summary.spend > 0 ? Number((summary.salesValue / summary.spend).toFixed(2)) : 0;
  return summary;
}

function buildDailyWhere(filters, alias = 'm') {
  const params = [filters.dateFrom, filters.dateTo];
  const conditions = [`${alias}.metric_date BETWEEN $1 AND $2`];
  if (filters.platformId) { params.push(filters.platformId); conditions.push(`${alias}.platform_id = $${params.length}`); }
  if (filters.branchId) { params.push(filters.branchId); conditions.push(`${alias}.branch_id = $${params.length}`); }
  return { where: conditions.join(' AND '), params };
}

function buildRangeWhere(filters, alias, startColumn = 'start_date', endColumn = 'end_date') {
  const params = [filters.dateFrom, filters.dateTo];
  const conditions = [`COALESCE(${alias}.${endColumn}, ${alias}.${startColumn}, CURRENT_DATE) >= $1::date`, `COALESCE(${alias}.${startColumn}, ${alias}.${endColumn}, CURRENT_DATE) <= $2::date`];
  if (filters.platformId) {
    params.push(filters.platformId);
    conditions.push(`${alias}.platform_id = $${params.length}`);
  }
  if (filters.branchId) {
    params.push(filters.branchId);
    conditions.push(`${alias}.branch_id = $${params.length}`);
  }
  return { where: conditions.join(' AND '), params };
}

async function getDailyAnalytics(filters) {
  const { where, params } = buildDailyWhere(filters);
  const totals = await pool.query(`
    SELECT COUNT(*)::int AS records,
      COALESCE(SUM(reach),0)::bigint AS reach,
      COALESCE(SUM(impressions),0)::bigint AS impressions,
      COALESCE(SUM(clicks),0)::bigint AS clicks,
      COALESCE(SUM(engagement),0)::bigint AS engagement,
      COALESCE(SUM(messages),0)::bigint AS messages,
      COALESCE(SUM(video_views),0)::bigint AS video_views,
      COALESCE(SUM(followers_gained),0)::bigint AS followers_gained,
      COALESCE(SUM(leads),0)::bigint AS leads,
      COALESCE(SUM(sales_count),0)::bigint AS sales_count,
      COALESCE(SUM(sales_value),0)::numeric AS sales_value,
      COALESCE(SUM(spend),0)::numeric AS spend
    FROM analytics_daily_metrics m WHERE ${where}
  `, params);
  if (Number(totals.rows[0].records) === 0) return null;

  const [trend, platforms, branches] = await Promise.all([
    pool.query(`
      SELECT metric_date AS date,
        SUM(reach)::bigint AS reach, SUM(impressions)::bigint AS impressions,
        SUM(clicks)::bigint AS clicks, SUM(engagement)::bigint AS engagement,
        SUM(messages)::bigint AS messages, SUM(leads)::bigint AS leads,
        SUM(sales_count)::bigint AS sales_count, SUM(sales_value)::numeric AS sales_value,
        SUM(spend)::numeric AS spend
      FROM analytics_daily_metrics m WHERE ${where}
      GROUP BY metric_date ORDER BY metric_date
    `, params),
    pool.query(`
      SELECT p.id, p.code, p.name, p.color,
        COUNT(m.id)::int AS records,
        COALESCE(SUM(m.reach),0)::bigint AS reach,
        COALESCE(SUM(m.impressions),0)::bigint AS impressions,
        COALESCE(SUM(m.clicks),0)::bigint AS clicks,
        COALESCE(SUM(m.engagement),0)::bigint AS engagement,
        COALESCE(SUM(m.messages),0)::bigint AS messages,
        COALESCE(SUM(m.leads),0)::bigint AS leads,
        COALESCE(SUM(m.sales_count),0)::bigint AS sales_count,
        COALESCE(SUM(m.sales_value),0)::numeric AS sales_value,
        COALESCE(SUM(m.spend),0)::numeric AS spend
      FROM platforms p
      JOIN analytics_daily_metrics m ON m.platform_id = p.id
      WHERE ${where}
      GROUP BY p.id, p.code, p.name, p.color, p.sort_order ORDER BY reach DESC, p.sort_order
    `, params),
    pool.query(`
      SELECT b.id, b.code, b.name, b.region,
        COUNT(m.id)::int AS records,
        COALESCE(SUM(m.reach),0)::bigint AS reach,
        COALESCE(SUM(m.impressions),0)::bigint AS impressions,
        COALESCE(SUM(m.clicks),0)::bigint AS clicks,
        COALESCE(SUM(m.engagement),0)::bigint AS engagement,
        COALESCE(SUM(m.messages),0)::bigint AS messages,
        COALESCE(SUM(m.leads),0)::bigint AS leads,
        COALESCE(SUM(m.sales_count),0)::bigint AS sales_count,
        COALESCE(SUM(m.sales_value),0)::numeric AS sales_value,
        COALESCE(SUM(m.spend),0)::numeric AS spend
      FROM branches b
      JOIN analytics_daily_metrics m ON m.branch_id = b.id
      WHERE ${where}
      GROUP BY b.id, b.code, b.name, b.region, b.sort_order ORDER BY reach DESC, b.sort_order
    `, params),
  ]);

  return {
    source: 'daily_metrics',
    summary: metricsFromRow(totals.rows[0]),
    trend: trend.rows.map((row) => ({ ...metricsFromRow(row), date: row.date })),
    platforms: platforms.rows.map((row) => ({ ...metricsFromRow(row), id: Number(row.id), code: row.code, name: row.name, color: row.color })),
    branches: branches.rows.map((row) => ({ ...metricsFromRow(row), id: Number(row.id), code: row.code, name: row.name, region: row.region })),
  };
}

async function getFallbackAnalytics(filters) {
  const adRange = buildRangeWhere(filters, 't');
  const adTotals = await pool.query(`
    SELECT COUNT(*)::int AS records,
      COALESCE(SUM(reach),0)::bigint AS reach,
      COALESCE(SUM(impressions),0)::bigint AS impressions,
      COALESCE(SUM(clicks),0)::bigint AS clicks,
      0::bigint AS engagement,
      COALESCE(SUM(messages),0)::bigint AS messages,
      0::bigint AS video_views,
      0::bigint AS followers_gained,
      COALESCE(SUM(messages),0)::bigint AS leads,
      COALESCE(SUM(sales_count),0)::bigint AS sales_count,
      0::numeric AS sales_value,
      COALESCE(SUM(spend),0)::numeric AS spend
    FROM target_ads t WHERE ${adRange.where}
  `, adRange.params);

  const campaignParams = [filters.dateFrom, filters.dateTo];
  const campaignConditions = [
    `COALESCE(c.end_date, c.start_date, CURRENT_DATE) >= $1::date`,
    `COALESCE(c.start_date, c.end_date, CURRENT_DATE) <= $2::date`,
  ];
  if (filters.platformId) { campaignParams.push(filters.platformId); campaignConditions.push(`EXISTS (SELECT 1 FROM campaign_platforms cp WHERE cp.campaign_id = c.id AND cp.platform_id = $${campaignParams.length})`); }
  if (filters.branchId) { campaignParams.push(filters.branchId); campaignConditions.push(`EXISTS (SELECT 1 FROM campaign_branches cb WHERE cb.campaign_id = c.id AND cb.branch_id = $${campaignParams.length})`); }
  const campaignWhere = campaignConditions.join(' AND ');
  const campaignTotals = await pool.query(`
    SELECT COUNT(*)::int AS records,
      COALESCE(SUM(reach),0)::bigint AS reach,
      COALESCE(SUM(impressions),0)::bigint AS impressions,
      COALESCE(SUM(clicks),0)::bigint AS clicks,
      COALESCE(SUM(engagement),0)::bigint AS engagement,
      COALESCE(SUM(messages),0)::bigint AS messages,
      COALESCE(SUM(video_views),0)::bigint AS video_views,
      0::bigint AS followers_gained,
      COALESCE(SUM(messages),0)::bigint AS leads,
      COALESCE(SUM(sales_count),0)::bigint AS sales_count,
      COALESCE(SUM(sales_value),0)::numeric AS sales_value,
      COALESCE(SUM(spend),0)::numeric AS spend
    FROM campaigns c WHERE ${campaignWhere}
  `, campaignParams);

  const adRow = adTotals.rows[0];
  const campaignRow = campaignTotals.rows[0];
  const useAds = Number(adRow.records) > 0;
  const combined = {
    ...(useAds ? adRow : campaignRow),
    engagement: campaignRow.engagement,
    video_views: campaignRow.video_views,
    sales_value: campaignRow.sales_value,
    leads: useAds ? adRow.messages : campaignRow.messages,
  };

  const [trend, platforms, branches] = await Promise.all([
    pool.query(`
      SELECT COALESCE(t.start_date, t.created_at::date) AS date,
        SUM(t.reach)::bigint AS reach, SUM(t.impressions)::bigint AS impressions,
        SUM(t.clicks)::bigint AS clicks, 0::bigint AS engagement,
        SUM(t.messages)::bigint AS messages, SUM(t.messages)::bigint AS leads,
        SUM(t.sales_count)::bigint AS sales_count, 0::numeric AS sales_value,
        SUM(t.spend)::numeric AS spend
      FROM target_ads t WHERE ${adRange.where}
      GROUP BY COALESCE(t.start_date, t.created_at::date) ORDER BY date
    `, adRange.params),
    pool.query(`
      SELECT p.id, p.code, p.name, p.color, COUNT(t.id)::int AS records,
        COALESCE(SUM(t.reach),0)::bigint AS reach, COALESCE(SUM(t.impressions),0)::bigint AS impressions,
        COALESCE(SUM(t.clicks),0)::bigint AS clicks, 0::bigint AS engagement,
        COALESCE(SUM(t.messages),0)::bigint AS messages, COALESCE(SUM(t.messages),0)::bigint AS leads,
        COALESCE(SUM(t.sales_count),0)::bigint AS sales_count, 0::numeric AS sales_value,
        COALESCE(SUM(t.spend),0)::numeric AS spend
      FROM platforms p JOIN target_ads t ON t.platform_id = p.id
      WHERE ${adRange.where}
      GROUP BY p.id, p.code, p.name, p.color, p.sort_order ORDER BY reach DESC, p.sort_order
    `, adRange.params),
    pool.query(`
      SELECT b.id, b.code, b.name, b.region, COUNT(t.id)::int AS records,
        COALESCE(SUM(t.reach),0)::bigint AS reach, COALESCE(SUM(t.impressions),0)::bigint AS impressions,
        COALESCE(SUM(t.clicks),0)::bigint AS clicks, 0::bigint AS engagement,
        COALESCE(SUM(t.messages),0)::bigint AS messages, COALESCE(SUM(t.messages),0)::bigint AS leads,
        COALESCE(SUM(t.sales_count),0)::bigint AS sales_count, 0::numeric AS sales_value,
        COALESCE(SUM(t.spend),0)::numeric AS spend
      FROM branches b JOIN target_ads t ON t.branch_id = b.id
      WHERE ${adRange.where}
      GROUP BY b.id, b.code, b.name, b.region, b.sort_order ORDER BY reach DESC, b.sort_order
    `, adRange.params),
  ]);

  return {
    source: 'campaigns_and_ads',
    summary: metricsFromRow(combined),
    trend: trend.rows.map((row) => ({ ...metricsFromRow(row), date: row.date })),
    platforms: platforms.rows.map((row) => ({ ...metricsFromRow(row), id: Number(row.id), code: row.code, name: row.name, color: row.color })),
    branches: branches.rows.map((row) => ({ ...metricsFromRow(row), id: Number(row.id), code: row.code, name: row.name, region: row.region })),
  };
}

export async function getAnalyticsOverview(rawFilters = {}) {
  const filters = normalizeAnalyticsFilters(rawFilters);
  const base = await getDailyAnalytics(filters) || await getFallbackAnalytics(filters);

  const campaignParams = [filters.dateFrom, filters.dateTo];
  const campaignConditions = [
    `COALESCE(c.end_date, c.start_date, CURRENT_DATE) >= $1::date`,
    `COALESCE(c.start_date, c.end_date, CURRENT_DATE) <= $2::date`,
  ];
  if (filters.platformId) { campaignParams.push(filters.platformId); campaignConditions.push(`EXISTS (SELECT 1 FROM campaign_platforms cp WHERE cp.campaign_id = c.id AND cp.platform_id = $${campaignParams.length})`); }
  if (filters.branchId) { campaignParams.push(filters.branchId); campaignConditions.push(`EXISTS (SELECT 1 FROM campaign_branches cb WHERE cb.campaign_id = c.id AND cb.branch_id = $${campaignParams.length})`); }

  const [topCampaigns, contentPerformance] = await Promise.all([
    pool.query(`
      SELECT c.id, c.name, c.status, c.objective, c.reach, c.impressions, c.clicks, c.engagement,
        c.messages, c.sales_count, c.sales_value, c.spend,
        CASE WHEN c.spend > 0 THEN ROUND(c.sales_value / c.spend, 2) ELSE 0 END AS roas
      FROM campaigns c WHERE ${campaignConditions.join(' AND ')}
      ORDER BY c.sales_value DESC, c.reach DESC LIMIT 10
    `, campaignParams),
    pool.query(`
      SELECT p.id, p.name, p.color,
        COUNT(ci.id)::int AS total,
        COUNT(ci.id) FILTER (WHERE ci.status = 'published')::int AS published,
        COUNT(ci.id) FILTER (WHERE ci.status IN ('approved','scheduled'))::int AS scheduled
      FROM platforms p
      LEFT JOIN content_items ci ON ci.platform_id = p.id
        AND COALESCE(ci.published_at, ci.publish_at, ci.created_at)::date BETWEEN $1::date AND $2::date
        ${filters.branchId ? 'AND ci.branch_id = $3' : ''}
      WHERE p.is_active = TRUE ${filters.platformId ? `AND p.id = $${filters.branchId ? 4 : 3}` : ''}
      GROUP BY p.id, p.name, p.color, p.sort_order ORDER BY total DESC, p.sort_order
    `, [filters.dateFrom, filters.dateTo, ...(filters.branchId ? [filters.branchId] : []), ...(filters.platformId ? [filters.platformId] : [])]),
  ]);

  return {
    filters,
    source: base.source,
    summary: base.summary,
    trend: base.trend,
    platforms: base.platforms,
    branches: base.branches,
    topCampaigns: topCampaigns.rows.map((row) => ({
      id: Number(row.id), name: row.name, status: row.status, objective: row.objective,
      reach: Number(row.reach || 0), impressions: Number(row.impressions || 0), clicks: Number(row.clicks || 0),
      engagement: Number(row.engagement || 0), messages: Number(row.messages || 0), salesCount: Number(row.sales_count || 0),
      salesValue: Number(row.sales_value || 0), spend: Number(row.spend || 0), roas: Number(row.roas || 0),
    })),
    contentPerformance: contentPerformance.rows.map((row) => ({ id: Number(row.id), name: row.name, color: row.color, total: row.total, published: row.published, scheduled: row.scheduled })),
  };
}
