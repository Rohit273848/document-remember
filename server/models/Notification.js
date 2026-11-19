import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', default: null },
  title: { type: String, required: true, maxlength: 160 }, message: { type: String, required: true, maxlength: 800 },
  notificationType: { type: String, enum: ['upcoming_expiry', 'expired_document', 'document_uploaded', 'document_updated', 'family_invitation', 'ownership_assigned', 'renewal_completed', 'member_update'], required: true },
  isRead: { type: Boolean, default: false, index: true }, dedupKey: { type: String, sparse: true, unique: true },
}, { timestamps: true });
schema.index({ userId: 1, createdAt: -1 });
export default mongoose.model('Notification', schema);
