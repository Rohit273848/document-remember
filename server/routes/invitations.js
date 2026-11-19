import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../utils/errors.js';
import * as families from '../controllers/families.js';
const router = Router(); router.use(authenticate);
router.get('/', families.myInvitations);
router.post('/:token/accept', families.acceptInvitation);
router.post('/:token/reject', families.rejectInvitation);
export default router;
