import { AppError } from '../utils/errors.js';
export function notFound(_req, _res, next) { next(new AppError('The requested page was not found.', 404, 'NOT_FOUND')); }
export function errorHandler(err, _req, res, _next) {
  if (err?.message?.includes('CORS')) err = new AppError(err.message, 403, 'CORS_FORBIDDEN');
  if (err?.name === 'ValidationError') err = new AppError(Object.values(err.errors).map((item) => item.message).join(', '), 400, 'VALIDATION_ERROR');
  if (err?.code === 11000) err = new AppError('That record already exists.', 409, 'DUPLICATE_RECORD');
  if (err?.name === 'CastError') err = new AppError('The requested record was not found.', 404, 'NOT_FOUND');
  if (err?.name === 'MulterError') err = new AppError(err.code === 'LIMIT_FILE_SIZE' ? 'File is larger than the upload limit.' : 'File upload failed validation.', 400, 'UPLOAD_ERROR');
  const status = err.statusCode || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({ error: { message: status >= 500 ? 'Something went wrong. Please try again.' : err.message, code: err.code || 'INTERNAL_ERROR' } });
}
