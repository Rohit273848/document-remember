import mongoose from 'mongoose';
const schema = new mongoose.Schema({
  documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document', required: true, index: true },
  versionNumber: { type: Number, required: true }, storageAssetId: { type: String, required: true },
  storageResourceType: { type: String, enum: ['image', 'raw'], default: 'raw' },
  expiryDate: { type: Date, required: true }, uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadedAt: { type: Date, default: Date.now }, changeDescription: { type: String, trim: true, maxlength: 500, default: '' },
  status: { type: String, enum: ['current', 'archived'], default: 'current' }, mimeType: String, fileName: String, fileExtension: String, fileSize: Number,
}, { timestamps: true });
schema.index({ documentId: 1, versionNumber: 1 }, { unique: true });
export default mongoose.model('DocumentVersion', schema);
