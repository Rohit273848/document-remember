import Reminder from '../models/Reminder.js';
import { asyncHandler, AppError } from '../utils/errors.js';
export const listReminders = asyncHandler(async (req, res) => {
  const filter = { familyId: req.family.id, recipientId: req.user.id, deliveryStatus: { $in: ['pending', 'delivered', 'failed'] } };
  if (req.query.upcoming === 'true') filter.deliveryStatus = 'pending';
  if (req.member.role === 'owner') filter.recipientId = req.user.id;
  const reminders = await Reminder.find(filter).populate('documentId', 'title category expiryDate status').sort({ scheduledAt: 1 }).limit(100);
  res.json({ reminders });
});
export const markReminderRead = asyncHandler(async (req, res) => { const item = await Reminder.findOneAndUpdate({ _id: req.params.id, familyId: req.family.id, recipientId: req.user.id }, { $set: { isRead: true } }, { new: true }); if (!item) throw new AppError('Reminder not found.', 404, 'REMINDER_NOT_FOUND'); res.json({ reminder: item }); });
