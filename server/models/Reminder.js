import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  milestone: { type: Number, required: true }, scheduledAt: { type: Date, required: true, index: true }, sentAt: Date,
  deliveryStatus: { type: String, enum: ['pending', 'processing', 'delivered', 'failed', 'cancelled'], default: 'pending', index: true },
  expiryDateSnapshot: { type: Date, required: true }, uniqueReminderKey: { type: String, required: true, unique: true },
  attempts: { type: Number, default: 0 }, lockUntil: Date, lastError: { type: String, maxlength: 300 }, isRead: { type: Boolean, default: false },
  emailDeliveryStatus: { type: String, enum: ['pending', 'sent', 'failed', 'skipped'], default: 'pending' },
  inAppDeliveryStatus: { type: String, enum: ['pending', 'delivered', 'failed', 'skipped'], default: 'pending' },
}, { timestamps: true });
schema.index({ deliveryStatus: 1, scheduledAt: 1 });
export default mongoose.model('Reminder', schema);
