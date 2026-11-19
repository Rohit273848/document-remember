import Document, { CATEGORIES } from '../models/Document.js';
import DocumentVersion from '../models/DocumentVersion.js';
import Reminder from '../models/Reminder.js';
import FamilyMember from '../models/FamilyMember.js';
import { uploadPrivateFile, createPrivateDownloadUrl } from '../services/storage.js';
import { recordActivity } from '../services/activity.js';
import { notifyFamily } from '../services/notifications.js';
import { scheduleDocumentReminders, rescheduleDocumentReminders } from '../services/reminders.js';
import { parseDateOnly, isExpired, dateKey, localDateKey, addCivilDays, dateBoundary } from '../utils/date.js';
import { inTransaction } from '../utils/transaction.js';
import { asyncHandler, AppError } from '../utils/errors.js';

function normalizeFields(body) {
  let milestones = body.milestones ?? [90, 30, 7, 1, 0];
  if (typeof milestones === 'string') { try { milestones = JSON.parse(milestones); } catch { milestones = milestones.split(',').map(Number); } }
  if (!Array.isArray(milestones)) throw new AppError('Reminder choices are invalid.', 400, 'VALIDATION_ERROR');
  return { ...body, issueDate: parseDateOnly(body.issueDate), expiryDate: parseDateOnly(body.expiryDate), milestones: [...new Set(milestones.map(Number))], sixMonthAdvance: body.sixMonthAdvance === true || body.sixMonthAdvance === 'true' };
}
function toClient(doc, zone) {
  const item = doc.toObject ? doc.toObject() : doc;
  return { ...item, displayStatus: item.status === 'archived' ? 'archived' : isExpired(item.expiryDate, zone) ? 'expired' : 'active', expiryDateOnly: dateKey(item.expiryDate) };
}
async function getAuthorizedDocument(req, { includeArchived = false } = {}) {
  const query = { _id: req.params.id, familyId: req.family.id, ...(includeArchived ? {} : { status: 'active' }) };
  const doc = await Document.findOne(query).populate('ownerId', 'name email');
  if (!doc) throw new AppError('Document not found.', 404, 'DOCUMENT_NOT_FOUND');
  if (req.member.role === 'owner' && String(doc.ownerId?._id || doc.ownerId) !== String(req.user.id)) throw new AppError('This document is not assigned to you.', 403, 'DOCUMENT_FORBIDDEN');
  return doc;
}
const fileMeta = (file, stored) => ({ storageProvider: 'cloudinary', storageAssetId: stored.assetId, storageResourceType: stored.resourceType, mimeType: file.mimetype, fileSize: file.size, fileName: file.originalname.replace(/[\\/]/g, '').slice(0, 180), fileExtension: stored.ext });

export const categories = (_req, res) => res.json({ categories: CATEGORIES });
export const listDocuments = asyncHandler(async (req, res) => {
  const { q, category, ownerId, status, page = 1, limit = 20 } = req.query;
  const filter = { familyId: req.family.id, ...(status === 'archived' ? { status: 'archived' } : { status: 'active' }), ...(category ? { category } : {}), ...(ownerId ? { ownerId } : {}) };
  if (req.member.role === 'owner') filter.ownerId = req.user.id;
  if (q) { const safeQuery = q.slice(0, 80).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); filter.$or = [{ title: { $regex: safeQuery, $options: 'i' } }, { category: { $regex: safeQuery, $options: 'i' } }, { issuingAuthority: { $regex: safeQuery, $options: 'i' } }]; }
  const pageNum = Math.max(1, Number(page) || 1); const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const [docs, total] = await Promise.all([Document.find(filter).populate('ownerId', 'name email').sort({ expiryDate: 1, createdAt: -1 }).skip((pageNum - 1) * pageSize).limit(pageSize), Document.countDocuments(filter)]);
  res.json({ documents: docs.map((doc) => toClient(doc, req.family.timezone)), page: pageNum, limit: pageSize, total, pages: Math.ceil(total / pageSize) });
});
export const createDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Choose a file to upload.', 400, 'FILE_REQUIRED');
  const fields = normalizeFields(req.body);
  const owner = await FamilyMember.findOne({ familyId: req.family.id, userId: fields.ownerId, status: 'active' });
  if (!owner) throw new AppError('Choose an active member of this family as the document owner.', 400, 'INVALID_OWNER');
  const stored = await uploadPrivateFile(req.file);
  try {
    const document = await inTransaction(async (session) => {
      const [doc] = await Document.create([{
        familyId: req.family.id, ownerId: fields.ownerId, uploadedBy: req.user.id, title: fields.title, category: fields.category,
        description: fields.description || '', documentNumber: fields.documentNumber || '', issuingAuthority: fields.issuingAuthority || '', issueDate: fields.issueDate, expiryDate: fields.expiryDate,
        reminderSettings: { milestones: fields.milestones, sixMonthAdvance: fields.sixMonthAdvance }, ...fileMeta(req.file, stored),
      }], { session });
      await DocumentVersion.create([{ documentId: doc.id, versionNumber: 1, storageAssetId: stored.assetId, storageResourceType: stored.resourceType, expiryDate: fields.expiryDate, uploadedBy: req.user.id, changeDescription: 'Original document', status: 'current', mimeType: req.file.mimetype, fileName: req.file.originalname, fileExtension: stored.ext, fileSize: stored.bytes }], { session });
      await scheduleDocumentReminders(doc, req.family, session);
      await recordActivity({ familyId: req.family.id, userId: req.user.id, action: 'document_created', entityType: 'document', entityId: doc.id, description: `Added ${doc.title}` }, session);
      await notifyFamily({ familyId: req.family.id, documentId: doc.id, title: 'A document was added', message: `${req.user.name} added ${doc.title} to the family library.`, notificationType: 'document_uploaded' }, session);
      return doc;
    });
    res.status(201).json({ document: toClient(document, req.family.timezone) });
  } catch (error) { const { deletePrivateFile } = await import('../services/storage.js'); await deletePrivateFile(stored.assetId, stored.resourceType).catch(() => {}); throw error; }
});
export const getDocument = asyncHandler(async (req, res) => { const doc = await getAuthorizedDocument(req, { includeArchived: true }); res.json({ document: toClient(doc, req.family.timezone) }); });
export const updateDocument = asyncHandler(async (req, res) => {
  const doc = await getAuthorizedDocument(req);
  if (req.member.role === 'owner' && Object.keys(req.body).some((key) => !['description', 'documentNumber', 'issuingAuthority', 'issueDate', 'expiryDate'].includes(key))) throw new AppError('Only a Family Keeper or Backup Person can change document details.', 403, 'ROLE_FORBIDDEN');
  const fields = normalizeFields(req.body);
  if (fields.ownerId && !await FamilyMember.exists({ familyId: req.family.id, userId: fields.ownerId, status: 'active' })) throw new AppError('Choose an active member of this family as the document owner.', 400, 'INVALID_OWNER');
  const oldExpiry = doc.expiryDate.getTime(); const oldOwnerId = String(doc.ownerId?._id || doc.ownerId);
  for (const key of ['title', 'ownerId', 'category', 'description', 'documentNumber', 'issuingAuthority']) if (key in fields) doc[key] = fields[key];
  if ('issueDate' in req.body) doc.issueDate = fields.issueDate;
  if ('expiryDate' in req.body) doc.expiryDate = fields.expiryDate;
  if ('milestones' in req.body || 'sixMonthAdvance' in req.body) doc.reminderSettings = { milestones: fields.milestones, sixMonthAdvance: fields.sixMonthAdvance };
  await inTransaction(async (session) => {
    await doc.save({ session });
    const ownerChanged = oldOwnerId !== String(doc.ownerId?._id || doc.ownerId);
    if (oldExpiry !== doc.expiryDate.getTime() || ownerChanged || 'milestones' in req.body || 'sixMonthAdvance' in req.body) await rescheduleDocumentReminders(doc, req.family, session);
    await recordActivity({ familyId: req.family.id, userId: req.user.id, action: 'document_updated', entityType: 'document', entityId: doc.id, description: `Updated ${doc.title}` }, session);
    await notifyFamily({ familyId: req.family.id, documentId: doc.id, title: ownerChanged ? 'Document owner assigned' : 'Document details updated', message: ownerChanged ? `${req.user.name} assigned ${doc.title} to a family member.` : `${req.user.name} updated ${doc.title}.`, notificationType: ownerChanged ? 'ownership_assigned' : 'document_updated' }, session);
  });
  res.json({ document: toClient(doc, req.family.timezone) });
});
export const archiveDocument = asyncHandler(async (req, res) => {
  const doc = await getAuthorizedDocument(req);
  if (req.member.role === 'owner') throw new AppError('Only a Family Keeper or Backup Person can archive documents.', 403, 'ROLE_FORBIDDEN');
  doc.status = 'archived'; doc.deletedAt = new Date();
  await inTransaction(async (session) => { await doc.save({ session }); await Reminder.updateMany({ documentId: doc.id, deliveryStatus: 'pending' }, { $set: { deliveryStatus: 'cancelled' } }, { session }); await recordActivity({ familyId: req.family.id, userId: req.user.id, action: 'document_archived', entityType: 'document', entityId: doc.id, description: `Archived ${doc.title}` }, session); });
  res.status(204).end();
});
export const downloadDocument = asyncHandler(async (req, res) => { const doc = await getAuthorizedDocument(req, { includeArchived: true }); const attachment = req.query.attachment === 'true'; const url = await createPrivateDownloadUrl(doc.storageAssetId, doc.fileExtension, attachment, doc.storageResourceType || 'raw'); res.json({ url, expiresIn: 300, fileName: doc.fileName, mimeType: doc.mimeType }); });
export const listVersions = asyncHandler(async (req, res) => { const doc = await getAuthorizedDocument(req, { includeArchived: true }); const versions = await DocumentVersion.find({ documentId: doc.id }).populate('uploadedBy', 'name').sort({ versionNumber: -1 }); res.json({ versions }); });
export const downloadVersion = asyncHandler(async (req, res) => {
  const doc = await getAuthorizedDocument(req, { includeArchived: true });
  const version = await DocumentVersion.findOne({ documentId: doc.id, versionNumber: Number(req.params.versionNumber) });
  if (!version) throw new AppError('Document version not found.', 404, 'VERSION_NOT_FOUND');
  const attachment = req.query.attachment === 'true'; const url = await createPrivateDownloadUrl(version.storageAssetId, version.fileExtension, attachment, version.storageResourceType || 'raw');
  res.json({ url, expiresIn: 300, fileName: version.fileName, mimeType: version.mimeType });
});
export const renewDocument = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError('Choose the renewed document file.', 400, 'FILE_REQUIRED');
  const doc = await getAuthorizedDocument(req);
  const fields = normalizeFields({ ...req.body, ownerId: doc.ownerId._id });
  const stored = await uploadPrivateFile(req.file); const nextVersion = doc.currentVersion + 1;
  try {
    await inTransaction(async (session) => {
      await DocumentVersion.updateOne({ documentId: doc.id, versionNumber: doc.currentVersion }, { $set: { status: 'archived' } }, { session });
      await DocumentVersion.create([{ documentId: doc.id, versionNumber: nextVersion, storageAssetId: stored.assetId, storageResourceType: stored.resourceType, expiryDate: fields.expiryDate, uploadedBy: req.user.id, changeDescription: req.body.changeDescription || 'Renewed document', status: 'current', mimeType: req.file.mimetype, fileName: req.file.originalname, fileExtension: stored.ext, fileSize: stored.bytes }], { session });
      doc.currentVersion = nextVersion; doc.expiryDate = fields.expiryDate; doc.uploadedBy = req.user.id; Object.assign(doc, fileMeta(req.file, stored));
      await doc.save({ session }); await rescheduleDocumentReminders(doc, req.family, session);
      await recordActivity({ familyId: req.family.id, userId: req.user.id, action: 'document_renewed', entityType: 'document', entityId: doc.id, description: `Renewed ${doc.title} with version ${nextVersion}` }, session);
      await notifyFamily({ familyId: req.family.id, documentId: doc.id, title: 'Document renewed', message: `${req.user.name} uploaded a renewed ${doc.title}.`, notificationType: 'renewal_completed' }, session);
    });
    res.json({ document: toClient(doc, req.family.timezone), message: 'Renewed document saved. The previous version remains in the history.' });
  } catch (error) { const { deletePrivateFile } = await import('../services/storage.js'); await deletePrivateFile(stored.assetId, stored.resourceType).catch(() => {}); throw error; }
});
function datedDocuments(req, expired) {
  const today = dateBoundary(localDateKey(req.family.timezone)); const end = dateBoundary(addCivilDays(localDateKey(req.family.timezone), 366));
  const filter = { familyId: req.family.id, status: 'active', expiryDate: expired ? { $lt: today } : { $gte: today, $lte: end } };
  if (req.member.role === 'owner') filter.ownerId = req.user.id;
  return Document.find(filter).populate('ownerId', 'name email').sort({ expiryDate: expired ? -1 : 1 });
}
export const upcomingDocuments = asyncHandler(async (req, res) => { const docs = await datedDocuments(req, false); res.json({ documents: docs.map((doc) => toClient(doc, req.family.timezone)) }); });
export const expiredDocuments = asyncHandler(async (req, res) => { const docs = await datedDocuments(req, true); res.json({ documents: docs.map((doc) => toClient(doc, req.family.timezone)) }); });
