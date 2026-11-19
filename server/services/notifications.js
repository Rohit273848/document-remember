import Notification from '../models/Notification.js';
import FamilyMember from '../models/FamilyMember.js';

export async function notifyFamily({ familyId, documentId, title, message, notificationType, dedupPrefix }, session) {
  const members = await FamilyMember.find({ familyId, status: 'active' }).populate('userId', 'reminderPreferences language').session(session || null);
  const records = members.filter((m) => m.userId?.reminderPreferences?.inApp !== false).map((m) => ({
    userId: m.userId._id, familyId, documentId,
    ...(m.userId.language === 'hi' ? localizedHindiNotification(title, message, notificationType) : { title, message }),
    notificationType,
    dedupKey: dedupPrefix ? `${dedupPrefix}:${m.userId._id}` : undefined,
  }));
  if (!records.length) return [];
  const options = { ordered: false, ...(session ? { session } : {}) };
  try { return await Notification.insertMany(records, options); } catch (error) { if (error.code === 11000 || error.writeErrors?.every((e) => e.code === 11000)) return []; throw error; }
}

function localizedHindiNotification(title, message, notificationType) {
  const added = message.match(/^(.+) added (.+) to the family library\.$/);
  const assigned = message.match(/^(.+) assigned (.+) to a family member\.$/);
  const updated = message.match(/^(.+) updated (.+)\.$/);
  const renewed = message.match(/^(.+) uploaded a renewed (.+)\.$/);
  const joined = message.match(/^(.+) joined (.+)\.$/);
  if (notificationType === 'document_uploaded') return { title: 'नया दस्तावेज़ जोड़ा गया', message: added ? `${added[1]} ने ${added[2]} परिवार के दस्तावेज़ों में जोड़ा।` : message };
  if (notificationType === 'ownership_assigned') return { title: 'दस्तावेज़ की ज़िम्मेदारी दी गई', message: assigned ? `${assigned[1]} ने ${assigned[2]} परिवार के सदस्य को सौंपा।` : message };
  if (notificationType === 'document_updated') return { title: 'दस्तावेज़ की जानकारी बदली गई', message: updated ? `${updated[1]} ने ${updated[2]} की जानकारी बदली।` : message };
  if (notificationType === 'renewal_completed') return { title: 'दस्तावेज़ का नवीनीकरण हुआ', message: renewed ? `${renewed[1]} ने ${renewed[2]} का नवीनीकृत दस्तावेज़ अपलोड किया।` : message };
  if (notificationType === 'member_update') return { title: 'परिवार का नया सदस्य', message: joined ? `${joined[1]} ${joined[2]} में शामिल हुए।` : message };
  return { title, message };
}
