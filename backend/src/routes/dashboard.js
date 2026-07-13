import { Router } from 'express';
import { authRequired } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authRequired, (request, response) => {
  response.json({
    updatedAt: new Date().toISOString(),
    metrics: {
      totalPosts: 248,
      activeCampaigns: 12,
      adBudget: 23_450_000,
      totalReach: 1_245_300,
      videoViews: 856_210,
      activeBranches: 24,
    },
  });
});

export default router;
