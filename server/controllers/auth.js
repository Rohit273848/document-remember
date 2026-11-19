import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import FamilyMember from '../models/FamilyMember.js';
import { env, mailConfigured } from '../config/env.js';
import { sendEmail } from '../services/email.js';
import { hashToken, randomToken } from '../utils/tokens.js';
import { asyncHandler, AppError } from '../utils/errors.js';

function issueSession(user, res) {
  const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN, issuer: 'hearth-family-documents' });
  const isProduction = env.NODE_ENV === 'production';
  res.cookie(env.COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  return token;
}
async function memberships(userId) {
  return FamilyMember.find({ userId, status: 'active' }).populate('familyId', 'familyName timezone backupPersonId').lean();
}
export const register = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  if (await User.exists({ email })) throw new AppError('An account with this email already exists.', 409, 'EMAIL_IN_USE');
  const user = await User.create({ name: req.body.name, email, language: req.body.language || 'en', timezone: env.DEFAULT_TIMEZONE, passwordHash: await bcrypt.hash(req.body.password, 12) });
  const token = issueSession(user, res);
  res.status(201).json({ user: user.toJSON(), families: [], token });
});
export const login = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() }).select('+passwordHash');
  if (!user || !(await bcrypt.compare(req.body.password, user.passwordHash))) throw new AppError('Email or password is incorrect.', 401, 'INVALID_CREDENTIALS');
  const token = issueSession(user, res);
  res.json({ user: user.toJSON(), families: await memberships(user.id), token });
});
export const logout = (_req, res) => {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie(env.COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
  });
  res.status(204).end();
};
export const me = asyncHandler(async (req, res) => res.json({ user: req.user.toJSON(), families: await memberships(req.user.id) }));
export const forgotPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ email: req.body.email.toLowerCase() });
  if (user && mailConfigured) {
    const token = randomToken(); user.resetTokenHash = hashToken(token); user.resetTokenExpiresAt = new Date(Date.now() + 30 * 60_000); await user.save();
    try { await sendEmail({ to: user.email, subject: 'Reset your Hearth password', text: `Use this secure link within 30 minutes to reset your password: ${env.APP_URL}/reset-password?token=${token}` }); }
    catch (error) { console.error('Password reset email failed:', error.message); }
  }
  res.json({ message: 'If an account exists for that email, a reset link will arrive shortly.' });
});
export const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ resetTokenHash: hashToken(req.body.token), resetTokenExpiresAt: { $gt: new Date() } }).select('+resetTokenHash +resetTokenExpiresAt');
  if (!user) throw new AppError('This password reset link is invalid or has expired.', 400, 'RESET_LINK_INVALID');
  user.passwordHash = await bcrypt.hash(req.body.password, 12); user.resetTokenHash = undefined; user.resetTokenExpiresAt = undefined; await user.save();
  res.json({ message: 'Password updated. You can now sign in.' });
});
export const getProfile = asyncHandler(async (req, res) => res.json({ user: req.user.toJSON() }));
export const updateProfile = asyncHandler(async (req, res) => {
  if (req.body.timezone) { try { Intl.DateTimeFormat('en-US', { timeZone: req.body.timezone }).format(); } catch { throw new AppError('Choose a valid time zone.', 400, 'INVALID_TIMEZONE'); } }
  Object.assign(req.user, req.body); await req.user.save(); res.json({ user: req.user.toJSON() });
});
export const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) throw new AppError('Your current password is incorrect.', 400, 'PASSWORD_MISMATCH');
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12); await user.save(); res.status(204).end();
});
