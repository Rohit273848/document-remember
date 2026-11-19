import mongoose from 'mongoose';

export const CATEGORIES = {
  'ID & Travel': ['Passport', 'Visa', 'ID Card', 'Driving Licence'],
  Vehicles: ['Vehicle Registration', 'Vehicle Insurance', 'Pollution Certificate', 'Vehicle Service Records'],
  'Insurance & Health': ['Health Insurance', 'Life Insurance', 'Home Insurance', 'Vaccination Records'],
  Home: ['Rent Agreement', 'Property Tax', 'Home Warranty'],
  'Money & Tax': ['Tax Filing', 'Deposits', 'Loans', 'Subscriptions'],
  'School & Work': ['Admission Documents', 'Examination Forms', 'Contracts', 'Scholarships'],
};
const schema = new mongoose.Schema({
  familyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Family', required: true, index: true },
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, maxlength: 140 }, category: { type: String, required: true, enum: Object.keys(CATEGORIES) },
  description: { type: String, trim: true, maxlength: 2000, default: '' }, documentNumber: { type: String, trim: true, maxlength: 120, default: '' },
  issuingAuthority: { type: String, trim: true, maxlength: 140, default: '' }, issueDate: Date, expiryDate: { type: Date, required: true, index: true },
  reminderSettings: { milestones: { type: [Number], default: [90, 30, 7, 1, 0] }, sixMonthAdvance: { type: Boolean, default: false } },
  storageProvider: { type: String, enum: ['cloudinary'], default: 'cloudinary' }, storageAssetId: { type: String, required: true },
  storageResourceType: { type: String, enum: ['image', 'raw'], default: 'raw' },
  mimeType: { type: String, required: true }, fileSize: { type: Number, required: true }, fileName: { type: String, required: true }, fileExtension: { type: String, required: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active', index: true }, currentVersion: { type: Number, default: 1 },
  deletedAt: { type: Date, default: null },
}, { timestamps: true });
schema.index({ familyId: 1, status: 1, expiryDate: 1 });
export default mongoose.model('Document', schema);
