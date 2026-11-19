import { Router } from 'express';
import { authenticate, requireFamily } from '../middleware/auth.js';
import { listActivity } from '../controllers/activity.js';
const router = Router(); router.use(authenticate, requireFamily()); router.get('/', listActivity); export default router;
