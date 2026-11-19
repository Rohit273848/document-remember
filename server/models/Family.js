import mongoose from 'mongoose';
const familySchema = new mongoose.Schema({
  familyName: { type: String, required: true, trim: true, maxlength: 100 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  backupPersonId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  timezone: { type: String, default: 'Asia/Kolkata' },
}, { timestamps: true });
export default mongoose.model('Family', familySchema);
