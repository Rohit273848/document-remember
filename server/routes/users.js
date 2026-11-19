import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../utils/validation.js';
import { profileSchema, changePasswordSchema } from '../validators/schemas.js';
import * as auth from '../controllers/auth.js';
const router = Router(); router.use(authenticate);
router.get('/profile', auth.getProfile); router.put('/profile', validate(profileSchema), auth.updateProfile); router.put('/change-password', validate(changePasswordSchema), auth.changePassword);
export default router;
