import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  invitedEmail: { type: String, required: true, lowercase: true, trim: true },
  invitedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedRole: { type: String, enum: ['owner', 'backup'], default: 'owner' }, invitationTokenHash: { type: String, required: true, select: false },
  expiresAt: { type: Date, required: true, index: true }, status: { type: String, enum: ['pending', 'accepted', 'rejected', 'expired', 'revoked'], default: 'pending' },
}, { timestamps: true });
schema.index({ familyId: 1, invitedEmail: 1, status: 1 });
export default mongoose.model('Invitation', schema);
