import Notification from '../models/Notification.js';
import FamilyMember from '../models/FamilyMember.js';
import { asyncHandler, AppError } from '../utils/errors.js';
export const listNotifications = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1); const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const memberships = await FamilyMember.find({ userId: req.user.id, status: 'active' }).select('familyId');
  const activeFamilies = memberships.map((item) => item.familyId);
  const filter = { userId: req.user.id, familyId: req.query.familyId ? { $in: activeFamilies.filter((id) => String(id) === req.query.familyId) } : { $in: activeFamilies } };
  const [notifications, total, unread] = await Promise.all([Notification.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).populate('documentId', 'title'), Notification.countDocuments(filter), Notification.countDocuments({ ...filter, isRead: false })]);
  res.json({ notifications, total, unread, page, pages: Math.ceil(total / limit) });
});
export const readNotification = asyncHandler(async (req, res) => {
  const memberships = await FamilyMember.find({ userId: req.user.id, status: 'active' }).select('familyId');
  const item = await Notification.findOneAndUpdate({ _id: req.params.id, userId: req.user.id, familyId: { $in: memberships.map((m) => m.familyId) } }, { $set: { isRead: true } }, { new: true });
  if (!item) throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND'); res.json({ notification: item });
});
export const readAllNotifications = asyncHandler(async (req, res) => {
  const memberships = await FamilyMember.find({ userId: req.user.id, status: 'active' }).select('familyId');
  const familyIds = memberships.map((m) => m.familyId);
  await Notification.updateMany({ userId: req.user.id, familyId: { $in: req.body?.familyId ? familyIds.filter((id) => String(id) === req.body.familyId) : familyIds }, isRead: false }, { $set: { isRead: true } }); res.status(204).end();
});
