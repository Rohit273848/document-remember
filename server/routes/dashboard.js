import { Router } from 'express';
import { authenticate, requireFamily } from '../middleware/auth.js';
import * as dashboard from '../controllers/dashboard.js';
import { upcomingDocuments } from '../controllers/documents.js';
const router = Router(); router.use(authenticate, requireFamily());
router.get('/summary', dashboard.summary); router.get('/category-stats', dashboard.categoryStats); router.get('/status-stats', dashboard.statusStats);
router.get('/upcoming-renewals', upcomingDocuments);
router.get('/renewal-trends', dashboard.renewalTrends); router.get('/recent-activity', dashboard.recentActivity);
export default router;
