import mongoose from 'mongoose';
import Document from '../models/Document.js';
import FamilyMember from '../models/FamilyMember.js';
import ActivityLog from '../models/ActivityLog.js';
import { isExpired, localDateKey, addCivilDays, dateBoundary } from '../utils/date.js';
import { asyncHandler } from '../utils/errors.js';

const scope = (req) => {
  const familyObjectId = new mongoose.Types.ObjectId(req.family._id || req.family.id);
  const ownerObjectId = req.member.role === 'owner' ? new mongoose.Types.ObjectId(req.user._id || req.user.id) : null;
  return { familyId: familyObjectId, status: 'active', ...(ownerObjectId ? { ownerId: ownerObjectId } : {}) };
};
export const summary = asyncHandler(async (req, res) => {
  const filter = scope(req); const [docs, members, recent] = await Promise.all([
    Document.find(filter).select('expiryDate').lean(), FamilyMember.countDocuments({ familyId: req.family.id, status: 'active' }),
    ActivityLog.find({ familyId: req.family.id }).populate('userId', 'name').sort({ createdAt: -1 }).limit(6).lean(),
  ]);
  const expired = docs.filter((doc) => isExpired(doc.expiryDate, req.family.timezone)).length;
  const todayKey = localDateKey(req.family.timezone); const horizon = dateBoundary(addCivilDays(todayKey, 30)); const immediateHorizon = dateBoundary(addCivilDays(todayKey, 7));
  const upcoming = docs.filter((doc) => !isExpired(doc.expiryDate, req.family.timezone) && doc.expiryDate <= horizon).length;
  const immediate = docs.filter((doc) => !isExpired(doc.expiryDate, req.family.timezone) && doc.expiryDate <= immediateHorizon).length;
  res.json({ summary: { total: docs.length, active: docs.length - expired, expired, upcoming, immediate, members }, recentActivity: recent });
});
export const categoryStats = asyncHandler(async (req, res) => {
  const rows = await Document.aggregate([{ $match: scope(req) }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
  res.json({ categories: rows.map((row) => ({ name: row._id, value: row.count })) });
});
export const statusStats = asyncHandler(async (req, res) => {
  const docs = await Document.find(scope(req)).select('expiryDate').lean();
  const expired = docs.filter((doc) => isExpired(doc.expiryDate, req.family.timezone)).length;
  const todayKey = localDateKey(req.family.timezone); const horizon = dateBoundary(addCivilDays(todayKey, 30));
  const upcoming = docs.filter((doc) => !isExpired(doc.expiryDate, req.family.timezone) && doc.expiryDate <= horizon).length;
  res.json({ statuses: [{ name: 'On track', value: docs.length - expired - upcoming }, { name: 'Due soon', value: upcoming }, { name: 'Expired', value: expired }] });
});
export const renewalTrends = asyncHandler(async (req, res) => {
  const todayKey = localDateKey(req.family.timezone); const now = dateBoundary(todayKey); const end = dateBoundary(addCivilDays(todayKey, 366));
  const rows = await Document.aggregate([{ $match: { ...scope(req), expiryDate: { $gte: now, $lte: end } } }, { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$expiryDate' } }, count: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
  res.json({ trends: rows.map((row) => ({ month: row._id, renewals: row.count })) });
});
export const recentActivity = asyncHandler(async (req, res) => { const activity = await ActivityLog.find({ familyId: req.family.id }).populate('userId', 'name').sort({ createdAt: -1 }).limit(30); res.json({ activity }); });
