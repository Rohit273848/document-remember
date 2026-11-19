import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import FamilyMember from '../models/FamilyMember.js';
import { env } from '../config/env.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.cookies?.[env.COOKIE_NAME] || req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) throw new AppError('Please sign in to continue.', 401, 'UNAUTHENTICATED');
  let payload;
  try { payload = jwt.verify(token, env.JWT_SECRET); } catch { throw new AppError('Your session has expired. Please sign in again.', 401, 'INVALID_SESSION'); }
  const user = await User.findById(payload.sub);
  if (!user) throw new AppError('This account is no longer available.', 401, 'INVALID_SESSION');
  req.user = user; next();
});

export const requireFamily = (param = 'familyId') => asyncHandler(async (req, _res, next) => {
  const familyId = req.params[param] || req.query.familyId || req.body.familyId;
  if (!familyId) throw new AppError('Choose a family workspace first.', 400, 'FAMILY_REQUIRED');
  const member = await FamilyMember.findOne({ familyId, userId: req.user.id, status: 'active' }).populate('familyId');
  if (!member) throw new AppError('You do not have access to this family workspace.', 403, 'FAMILY_FORBIDDEN');
  req.member = member; req.family = member.familyId; next();
});
export const allowRoles = (...roles) => (req, _res, next) => roles.includes(req.member.role) ? next() : next(new AppError('Your family role does not allow this action.', 403, 'ROLE_FORBIDDEN'));
