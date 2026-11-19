import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import Joi from 'joi';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config();
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
}

const schema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(4000), CLIENT_ORIGIN: Joi.string().default('http://localhost:5173'),
  APP_URL: Joi.string().uri().default('http://localhost:5173'), MONGODB_URI: Joi.string().required(),
  JWT_SECRET: Joi.string().min(32).required(), JWT_EXPIRES_IN: Joi.string().default('7d'),
  COOKIE_NAME: Joi.string().default('family_session'), DEFAULT_TIMEZONE: Joi.string().default('Asia/Kolkata'),
  MAX_UPLOAD_MB: Joi.number().min(1).max(50).default(15),
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').default(''), CLOUDINARY_API_KEY: Joi.string().allow('').default(''), CLOUDINARY_API_SECRET: Joi.string().allow('').default(''),
  SMTP_HOST: Joi.string().allow('').default(''), SMTP_PORT: Joi.number().default(587), SMTP_SECURE: Joi.boolean().truthy('true').falsy('false').default(false),
  SMTP_USER: Joi.string().allow('').default(''), SMTP_PASSWORD: Joi.string().allow('').default(''), EMAIL_FROM: Joi.string().default('Family Documents <no-reply@example.com>'),
}).unknown(true);

const { value, error } = schema.validate(process.env, { abortEarly: false, convert: true });
if (error) throw new Error(`Invalid environment configuration: ${error.details.map((d) => d.message).join('; ')}`);
export const env = value;
export const mailConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASSWORD);
export const cloudinaryConfigured = Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);
