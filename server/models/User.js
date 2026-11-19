import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
  passwordHash: { type: String, required: true, select: false },
  profileImage: { type: String, default: '' },
  language: { type: String, enum: ['en', 'hi'], default: 'en' },
  timezone: { type: String, default: 'Asia/Kolkata' },
  reminderPreferences: { email: { type: Boolean, default: true }, inApp: { type: Boolean, default: true } },
  resetTokenHash: { type: String, select: false }, resetTokenExpiresAt: { type: Date, select: false },
}, { timestamps: true, toJSON: { transform(_doc, ret) { delete ret.passwordHash; delete ret.resetTokenHash; delete ret.resetTokenExpiresAt; return ret; } } });

export default mongoose.model('User', userSchema);
