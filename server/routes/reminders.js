import { Router } from 'express';
import { authenticate, requireFamily } from '../middleware/auth.js';
import * as reminders from '../controllers/reminders.js';
const router = Router(); router.use(authenticate, requireFamily());
router.get('/', reminders.listReminders); router.get('/upcoming', (req, res, next) => { req.query.upcoming = 'true'; next(); }, reminders.listReminders);
router.put('/:id', reminders.markReminderRead); router.post('/:id/mark-read', reminders.markReminderRead);
export default router;
