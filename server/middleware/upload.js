import multer from 'multer';
import { env } from '../config/env.js';
import { AppError } from '../utils/errors.js';

const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const extensions = { 'application/pdf': ['pdf'], 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'] };
const multerUpload = multer({
  storage: multer.memoryStorage(), limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter(_req, file, callback) { if (!allowed.has(file.mimetype)) return callback(new AppError('Upload a PDF, JPG, PNG or WebP file.', 415, 'UNSUPPORTED_FILE')); callback(null, true); },
}).single('file');

function matchesFileSignature(file) {
  const bytes = file.buffer;
  if (file.mimetype === 'application/pdf') return bytes.subarray(0, 5).toString() === '%PDF-';
  if (file.mimetype === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.mimetype === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (file.mimetype === 'image/webp') return bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  return false;
}
export function uploadDocument(req, res, next) {
  multerUpload(req, res, (error) => {
    if (error) return next(error);
    if (req.file && !matchesFileSignature(req.file)) return next(new AppError('The file contents do not match the selected file type.', 415, 'FILE_SIGNATURE_INVALID'));
    if (req.file) {
      const extension = req.file.originalname.split('.').pop()?.toLowerCase();
      if (extension && extension !== req.file.originalname.toLowerCase() && !extensions[req.file.mimetype]?.includes(extension)) return next(new AppError('The file name extension does not match its contents.', 415, 'FILE_EXTENSION_INVALID'));
    }
    next();
  });
}
