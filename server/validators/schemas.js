import Joi from 'joi';
import { CATEGORIES } from '../models/Document.js';

const category = Joi.string().valid(...Object.keys(CATEGORIES));
const dateOnly = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/);
export const registerSchema = Joi.object({ name: Joi.string().trim().min(2).max(100).required(), email: Joi.string().email().max(254).required(), password: Joi.string().min(10).max(100).required(), language: Joi.string().valid('en', 'hi').default('en') });
export const loginSchema = Joi.object({ email: Joi.string().email().required(), password: Joi.string().required() });
export const familySchema = Joi.object({ familyName: Joi.string().trim().min(2).max(100).required(), timezone: Joi.string().max(100) });
export const familyUpdateSchema = Joi.object({ familyName: Joi.string().trim().min(2).max(100), timezone: Joi.string().max(100) }).min(1);
export const inviteSchema = Joi.object({ email: Joi.string().email().required(), role: Joi.string().valid('owner', 'backup').default('owner') });
export const roleSchema = Joi.object({ role: Joi.string().valid('keeper', 'owner', 'backup').required() });
export const documentSchema = Joi.object({
  familyId: Joi.string().hex().length(24), ownerId: Joi.string().hex().length(24).required(), title: Joi.string().trim().min(1).max(140).required(),
  category: category.required(), description: Joi.string().allow('').max(2000), documentNumber: Joi.string().allow('').max(120), issuingAuthority: Joi.string().allow('').max(140),
  issueDate: dateOnly.allow('', null), expiryDate: dateOnly.required(), milestones: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.number().valid(180, 90, 30, 7, 1, 0))), sixMonthAdvance: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')),
});
export const documentUpdateSchema = Joi.object({ title: Joi.string().trim().min(1).max(140), ownerId: Joi.string().hex().length(24), category, description: Joi.string().allow('').max(2000), documentNumber: Joi.string().allow('').max(120), issuingAuthority: Joi.string().allow('').max(140), issueDate: dateOnly.allow('', null), expiryDate: dateOnly, milestones: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.number().valid(180, 90, 30, 7, 1, 0))), sixMonthAdvance: Joi.alternatives().try(Joi.boolean(), Joi.string().valid('true', 'false')) }).min(1);
export const renewSchema = Joi.object({ expiryDate: dateOnly.required(), changeDescription: Joi.string().allow('').max(500).default('') });
export const profileSchema = Joi.object({ name: Joi.string().trim().min(2).max(100), timezone: Joi.string().max(100), language: Joi.string().valid('en', 'hi'), reminderPreferences: Joi.object({ email: Joi.boolean(), inApp: Joi.boolean() }) }).min(1);
export const changePasswordSchema = Joi.object({ currentPassword: Joi.string().required(), newPassword: Joi.string().min(10).max(100).required() });
export const forgotSchema = Joi.object({ email: Joi.string().email().required() });
export const resetSchema = Joi.object({ token: Joi.string().required(), password: Joi.string().min(10).max(100).required() });
