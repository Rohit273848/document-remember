import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, action: { type: String, required: true },
  entityType: { type: String, required: true }, entityId: { type: mongoose.Schema.Types.ObjectId },
  description: { type: String, required: true, maxlength: 500 },
}, { timestamps: { createdAt: true, updatedAt: false } });
schema.index({ familyId: 1, createdAt: -1 });
export default mongoose.model('ActivityLog', schema);
