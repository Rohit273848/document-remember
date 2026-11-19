import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['keeper', 'owner', 'backup'], default: 'owner' },
  status: { type: String, enum: ['active', 'removed'], default: 'active' }, joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });
schema.index({ familyId: 1, userId: 1 }, { unique: true });
export default mongoose.model('FamilyMember', schema);
