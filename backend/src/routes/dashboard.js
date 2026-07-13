import { Router } from 'express';
import { pool } from '../db/pool.js';
import { authRequired, permissionRequired } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authRequired, permissionRequired('dashboard.view'), async (_request, response, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COUNT(*)::int AS total_posts,
        COUNT(*) FILTER (WHERE status IN ('approved','scheduled'))::int AS scheduled_posts,
        COUNT(*) FILTER (WHERE status = 'draft')::int AS drafts,
        COUNT(*) FILTER (WHERE status = 'review')::int AS in_review,
        COUNT(*) FILTER (WHERE status = 'published')::int AS published,
        COUNT(*) FILTER (WHERE publish_at >= date_trunc('week', NOW()) AND publish_at < date_trunc('week', NOW()) + interval '7 days')::int AS this_week
      FROM content_items
    `);
    const branchResult = await pool.query('SELECT COUNT(*)::int AS count FROM branches WHERE is_active = TRUE');
    const platformResult = await pool.query(`
      SELECT p.name, p.color, COUNT(c.id)::int AS count
      FROM platforms p
      LEFT JOIN content_items c ON c.platform_id = p.id
      WHERE p.is_active = TRUE
      GROUP BY p.id, p.name, p.color, p.sort_order
      ORDER BY p.sort_order
    `);
    const campaignResult = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE status = 'active')::int AS active,
             COALESCE(SUM(spend),0)::numeric AS spend,
             COALESCE(SUM(reach),0)::bigint AS reach
      FROM campaigns
    `);
    const adResult = await pool.query(`
      SELECT COUNT(*) FILTER (WHERE status = 'active')::int AS active,
             COALESCE(SUM(clicks),0)::bigint AS clicks,
             COALESCE(SUM(impressions),0)::bigint AS impressions
      FROM target_ads
    `);

    response.json({
      updatedAt: new Date().toISOString(),
      metrics: {
        totalPosts: rows[0].total_posts,
        scheduledPosts: rows[0].scheduled_posts,
        drafts: rows[0].drafts,
        inReview: rows[0].in_review,
        published: rows[0].published,
        thisWeek: rows[0].this_week,
        activeBranches: branchResult.rows[0].count,
      },
      platformCounts: platformResult.rows,
      marketing: {
        activeCampaigns: campaignResult.rows[0].active,
        campaignSpend: Number(campaignResult.rows[0].spend),
        campaignReach: Number(campaignResult.rows[0].reach),
        activeAds: adResult.rows[0].active,
        adClicks: Number(adResult.rows[0].clicks),
        adImpressions: Number(adResult.rows[0].impressions),
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
