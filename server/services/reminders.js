import Reminder from '../models/Reminder.js';
import FamilyMember from '../models/FamilyMember.js';
import Document from '../models/Document.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { buildReminderEmail, sendEmail } from './email.js';
import { env, mailConfigured } from '../config/env.js';
import { recordActivity } from './activity.js';
import { reminderTime, dateKey, isExpired } from '../utils/date.js';

const SIX_MONTH_TYPES = /passport|visa/i;
export async function scheduleDocumentReminders(document, family, session) {
  const recipients = await FamilyMember.find({ familyId: family._id, status: 'active' }).select('userId').session(session || null);
  const milestones = new Set(document.reminderSettings?.milestones || [90, 30, 7, 1, 0]);
  if (document.reminderSettings?.sixMonthAdvance || SIX_MONTH_TYPES.test(document.title)) milestones.add(180);
  const now = new Date(); const records = [];
  for (const member of recipients) for (const milestone of milestones) {
    if (![180, 90, 30, 7, 1, 0].includes(milestone)) continue;
    const scheduledAt = reminderTime(document.expiryDate, milestone, family.timezone);
    if (scheduledAt <= now || isExpired(document.expiryDate, family.timezone)) continue;
    records.push({ familyId: family._id, documentId: document._id, recipientId: member.userId, milestone, scheduledAt, expiryDateSnapshot: document.expiryDate,
      uniqueReminderKey: `${document._id}:${dateKey(document.expiryDate)}:${milestone}:${member.userId}` });
  }
  if (!records.length) return;
  const existing = await Reminder.find({ uniqueReminderKey: { $in: records.map((item) => item.uniqueReminderKey) } }).select('uniqueReminderKey deliveryStatus').session(session || null);
  const byKey = new Map(existing.map((item) => [item.uniqueReminderKey, item]));
  const inserts = [];
  const updates = [];
  for (const record of records) {
    const item = byKey.get(record.uniqueReminderKey);
    if (!item) inserts.push(record);
    else if (['pending', 'cancelled'].includes(item.deliveryStatus)) updates.push({ updateOne: { filter: { _id: item._id, deliveryStatus: item.deliveryStatus }, update: { $set: { scheduledAt: record.scheduledAt, expiryDateSnapshot: record.expiryDateSnapshot, deliveryStatus: 'pending', lockUntil: null } } } });
  }
  if (updates.length) await Reminder.bulkWrite(updates, { ...(session ? { session } : {}) });
  if (inserts.length) {
    try { await Reminder.insertMany(inserts, { ordered: false, ...(session ? { session } : {}) }); }
    catch (error) { if (error.code !== 11000 && !error.writeErrors?.every((e) => e.code === 11000)) throw error; }
  }
}

export async function rescheduleDocumentReminders(document, family, session) {
  await Reminder.updateMany({ documentId: document._id, deliveryStatus: 'pending' }, { $set: { deliveryStatus: 'cancelled' } }, session ? { session } : {});
  await scheduleDocumentReminders(document, family, session);
}

export async function processDueReminders() {
  let processed = 0;
  for (;;) {
    const now = new Date();
    const reminder = await Reminder.findOneAndUpdate({
      scheduledAt: { $lte: now },
      $or: [{ deliveryStatus: 'pending' }, { deliveryStatus: 'processing', lockUntil: { $lt: now } }],
    }, { $set: { deliveryStatus: 'processing', lockUntil: new Date(now.getTime() + 5 * 60_000) }, $inc: { attempts: 1 } }, { sort: { scheduledAt: 1 }, new: true });
    if (!reminder) break;
    try {
      const [doc, user] = await Promise.all([Document.findById(reminder.documentId).populate('ownerId', 'name'), User.findById(reminder.recipientId)]);
      if (!doc || doc.status !== 'active' || doc.expiryDate.getTime() !== reminder.expiryDateSnapshot.getTime()) {
        reminder.deliveryStatus = 'cancelled'; reminder.lockUntil = undefined; await reminder.save(); processed++; continue;
      }
      const hindi = user?.language === 'hi';
      const date = new Intl.DateTimeFormat(hindi ? 'hi-IN' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(doc.expiryDate);
      const subject = hindi ? `नवीनीकरण रिमाइंडर: ${doc.title}` : `Renewal reminder: ${doc.title}`;
      const message = hindi
        ? reminder.milestone === 0 ? `${doc.title} की नवीनीकरण तारीख़ आज (${date}) है।` : reminder.milestone === 1 ? `${doc.title} की समय-सीमा कल (${date}) है।` : `${doc.title} की समय-सीमा ${reminder.milestone} दिन बाद (${date}) है।`
        : reminder.milestone === 0 ? `${doc.title} is due today (${date}).` : reminder.milestone === 1 ? `${doc.title} expires tomorrow (${date}).` : `${doc.title} expires in ${reminder.milestone} days (${date}).`;
      let mailError; let delivered = false;
      if (user?.reminderPreferences?.email) {
        if (!mailConfigured) reminder.emailDeliveryStatus = 'skipped';
        else if (reminder.emailDeliveryStatus !== 'sent') {
          try { const mail = buildReminderEmail({ documentTitle: doc.title, message, url: `${env.APP_URL.replace(/\/$/, '')}/documents/${doc._id}`, language: user?.language }); const outcome = await sendEmail({ to: user.email, ...mail }); reminder.emailDeliveryStatus = outcome.skipped ? 'skipped' : 'sent'; delivered ||= Boolean(outcome.sent); await reminder.save(); }
          catch (error) { mailError = error.message; reminder.emailDeliveryStatus = 'failed'; await reminder.save(); }
        } else delivered = true;
      } else reminder.emailDeliveryStatus = 'skipped';
      if (user?.reminderPreferences?.inApp) {
        try { await Notification.updateOne({ dedupKey: `reminder:${reminder.uniqueReminderKey}` }, { $setOnInsert: {
          userId: user._id, familyId: reminder.familyId, documentId: doc._id, title: subject, message, notificationType: 'upcoming_expiry', isRead: false, dedupKey: `reminder:${reminder.uniqueReminderKey}`,
        } }, { upsert: true }); } catch (error) { if (error.code !== 11000) throw error; }
        reminder.inAppDeliveryStatus = 'delivered'; delivered = true;
      } else reminder.inAppDeliveryStatus = 'skipped';
      reminder.deliveryStatus = delivered ? 'delivered' : reminder.attempts >= 3 ? 'failed' : 'pending';
      reminder.lastError = mailError?.slice(0, 300); if (delivered) reminder.sentAt = new Date(); reminder.lockUntil = undefined;
      await reminder.save(); processed++;
      if (delivered) await recordActivity({ familyId: reminder.familyId, userId: null, action: 'reminder_delivered', entityType: 'document', entityId: doc._id, description: `Sent a renewal reminder for ${doc.title}` }).catch((error) => console.error('Reminder activity log failed:', error.message));
    } catch (error) {
      reminder.deliveryStatus = reminder.attempts >= 3 ? 'failed' : 'pending'; reminder.lastError = error.message.slice(0, 300); reminder.lockUntil = undefined; await reminder.save();
    }
  }
  return processed;
}

export async function processExpiredDocumentNotices() {
  const docs = await Document.find({ status: 'active' }).populate('familyId', 'timezone familyName');
  let count = 0;
  for (const doc of docs) {
    if (!isExpired(doc.expiryDate, doc.familyId.timezone)) continue;
    const members = await FamilyMember.find({ familyId: doc.familyId._id, status: 'active' }).populate('userId', 'reminderPreferences language');
    const records = members.filter((m) => m.userId?.reminderPreferences?.inApp !== false).map((m) => {
      const hindi = m.userId?.language === 'hi';
      const date = hindi ? new Intl.DateTimeFormat('hi-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(doc.expiryDate) : dateKey(doc.expiryDate);
      return { userId: m.userId._id, familyId: doc.familyId._id, documentId: doc._id, title: hindi ? `${doc.title} की समय-सीमा बीत गई` : `${doc.title} has expired`, message: hindi ? `${doc.title} की समय-सीमा ${date} को बीत गई। परिवार का रिकॉर्ड सही रखने के लिए नवीनीकृत दस्तावेज़ अपलोड करें।` : `${doc.title} expired on ${dateKey(doc.expiryDate)}. Upload the renewed document to keep your family's records current.`, notificationType: 'expired_document', dedupKey: `expired:${doc._id}:${dateKey(doc.expiryDate)}:${m.userId._id}` };
    });
    if (records.length) try { await Notification.insertMany(records, { ordered: false }); count += records.length; } catch (error) { if (error.code !== 11000 && !error.writeErrors?.every((e) => e.code === 11000)) throw error; }
  }
  return count;
}
