import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as notifications from '../controllers/notifications.js';
const router = Router(); router.use(authenticate);
router.get('/', notifications.listNotifications); router.put('/read-all', notifications.readAllNotifications); router.put('/:id/read', notifications.readNotification);
export default router;
