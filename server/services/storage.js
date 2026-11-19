import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { cloudinary } from '../config/cloudinary.js';
import { cloudinaryConfigured } from '../config/env.js';
import { AppError } from '../utils/errors.js';

export function getStorageResourceType(mimeType) {
  return mimeType?.startsWith('image/') ? 'image' : 'raw';
}

export function uploadPrivateFile(file) {
  if (!cloudinaryConfigured) throw new AppError('Private file storage is not configured. Add your Cloudinary credentials to the environment.', 503, 'STORAGE_NOT_CONFIGURED');
  return new Promise((resolve, reject) => {
    let settled = false;
    const ext = ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' })[file.mimetype];
    const resourceType = getStorageResourceType(file.mimetype);
    const publicId = resourceType === 'raw' ? `${randomUUID()}.${ext}` : randomUUID();
    const fail = (error) => {
      if (settled) return;
      settled = true;
      console.error('Cloudinary document upload failed:', {
        resourceType,
        httpCode: error?.http_code,
        message: String(error?.message || error || 'Unknown Cloudinary error').slice(0, 400),
      });
      reject(new AppError('The secure document upload failed. Please try again.', 502, 'STORAGE_UPLOAD_FAILED'));
    };
    const stream = cloudinary.uploader.upload_stream({
      resource_type: resourceType, type: 'authenticated', folder: 'family-documents',
      public_id: publicId, overwrite: false, use_filename: false, unique_filename: false,
    }, (error, result) => {
      if (error) return fail(error);
      if (settled) return;
      settled = true;
      resolve({ assetId: result.public_id, ext, bytes: result.bytes, resourceType });
    });
    stream.on('error', fail);
    Readable.from(file.buffer).pipe(stream);
  });
}
export async function createPrivateDownloadUrl(assetId, ext, attachment = false, resourceType = 'raw') {
  if (!cloudinaryConfigured) throw new AppError('Private file storage is not configured.', 503, 'STORAGE_NOT_CONFIGURED');
  const expires_at = Math.floor(Date.now() / 1000) + 300;
  return cloudinary.utils.private_download_url(assetId, ext, { resource_type: resourceType, type: 'authenticated', expires_at, attachment });
}
export async function deletePrivateFile(assetId, resourceType = 'raw') {
  if (cloudinaryConfigured && assetId) await cloudinary.uploader.destroy(assetId, { resource_type: resourceType, type: 'authenticated', invalidate: true });
}
