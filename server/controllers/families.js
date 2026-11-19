import crypto from 'node:crypto';
import mongoose from 'mongoose';
import Family from '../models/Family.js';
import FamilyMember from '../models/FamilyMember.js';
import Invitation from '../models/Invitation.js';
import User from '../models/User.js';
import { env, mailConfigured } from '../config/env.js';
import { sendEmail } from '../services/email.js';
import { recordActivity } from '../services/activity.js';
import { notifyFamily } from '../services/notifications.js';
import { randomToken, hashToken } from '../utils/tokens.js';
import { inTransaction } from '../utils/transaction.js';
import { asyncHandler, AppError } from '../utils/errors.js';
import Document from '../models/Document.js';
import Reminder from '../models/Reminder.js';
import { rescheduleDocumentReminders, scheduleDocumentReminders } from '../services/reminders.js';

function validTimezone(zone) { try { Intl.DateTimeFormat('en-US', { timeZone: zone }).format(); return true; } catch { return false; } }

export const listFamilies = asyncHandler(async (req, res) => {
  const memberships = await FamilyMember.find({ userId: req.user.id, status: 'active' }).populate('familyId', 'familyName timezone backupPersonId createdAt');
  res.json({ families: memberships.map((m) => ({ ...m.familyId.toJSON(), role: m.role, memberId: m.id })) });
});
export const createFamily = asyncHandler(async (req, res) => {
  if (req.body.timezone && !validTimezone(req.body.timezone)) throw new AppError('Choose a valid time zone.', 400, 'INVALID_TIMEZONE');
  const family = await inTransaction(async (session) => {
    const [created] = await Family.create([{ familyName: req.body.familyName, timezone: req.body.timezone || req.user.timezone || env.DEFAULT_TIMEZONE, createdBy: req.user.id }], { session });
    await FamilyMember.create([{ familyId: created.id, userId: req.user.id, role: 'keeper' }], { session });
    await recordActivity({ familyId: created.id, userId: req.user.id, action: 'family_created', entityType: 'family', entityId: created.id, description: `Created the ${created.familyName} family workspace` }, session);
    return created;
  });
  res.status(201).json({ family });
});
export const updateFamily = asyncHandler(async (req, res) => {
  if (req.body.timezone && !validTimezone(req.body.timezone)) throw new AppError('Choose a valid time zone.', 400, 'INVALID_TIMEZONE');
  const oldTimezone = req.family.timezone; Object.assign(req.family, req.body);
  await inTransaction(async (session) => {
    await req.family.save({ session });
    if (req.body.timezone && req.body.timezone !== oldTimezone) {
      const docs = await Document.find({ familyId: req.family.id, status: 'active' }).session(session);
      for (const doc of docs) await rescheduleDocumentReminders(doc, req.family, session);
    }
    await recordActivity({ familyId: req.family.id, userId: req.user.id, action: 'family_updated', entityType: 'family', entityId: req.family.id, description: 'Updated family workspace settings' }, session);
  });
  res.json({ family: req.family });
});
export const listMembers = asyncHandler(async (req, res) => {
  const members = await FamilyMember.find({ familyId: req.family.id, status: 'active' }).populate('userId', 'name email profileImage').sort({ joinedAt: 1 });
  res.json({ members: members.map((m) => ({ id: m.id, role: m.role, joinedAt: m.joinedAt, user: m.userId, isBackup: String(req.family.backupPersonId) === String(m.userId.id) })) });
});
export const inviteMember = asyncHandler(async (req, res) => {
  const email = req.body.email.toLowerCase();
  const user = await User.findOne({ email });
  if (user && await FamilyMember.exists({ familyId: req.family.id, userId: user.id, status: 'active' })) throw new AppError('This person is already part of the family.', 409, 'ALREADY_MEMBER');
  if (await Invitation.exists({ familyId: req.family.id, invitedEmail: email, status: 'pending', expiresAt: { $gt: new Date() } })) throw new AppError('An invitation is already waiting for this email.', 409, 'INVITATION_PENDING');
  const token = randomToken();
  const invitation = await Invitation.create({ familyId: req.family.id, invitedEmail: email, invitedBy: req.user.id, assignedRole: req.body.role, invitationTokenHash: hashToken(token), expiresAt: new Date(Date.now() + 7 * 86400_000) });
  const inviteLink = `${env.APP_URL}/invitations/accept?token=${token}`;
  let emailSent = false;
  if (mailConfigured) {
    try { await sendEmail({ to: email, subject: `You're invited to ${req.family.familyName} on Hearth`, text: `${req.user.name} invited you to join ${req.family.familyName}. Sign in or create an account, then accept here: ${inviteLink}` }); emailSent = true; }
    catch (error) { console.error('Family invitation email failed:', error.message); }
  }
  await recordActivity({ familyId: req.family.id, userId: req.user.id, action: 'member_invited', entityType: 'invitation', entityId: invitation.id, description: `Invited ${email} to join the family` });
  res.status(201).json({ invitation: { id: invitation.id, invitedEmail: email, assignedRole: invitation.assignedRole, expiresAt: invitation.expiresAt, status: invitation.status }, inviteLink, emailSent });
});
async function resolveInvitation(token, user) {
  const query = mongoose.isValidObjectId(token) ? { _id: token } : { invitationTokenHash: hashToken(token) };
  const invite = await Invitation.findOne({ ...query, status: 'pending', expiresAt: { $gt: new Date() } }).populate('familyId');
  if (!invite) throw new AppError('This invitation is invalid or has expired.', 404, 'INVITATION_INVALID');
  if (invite.invitedEmail !== user.email) throw new AppError('Sign in with the email address that received this invitation.', 403, 'INVITATION_EMAIL_MISMATCH');
  return invite;
}
export const acceptInvitation = asyncHandler(async (req, res) => {
  const invitation = await resolveInvitation(req.params.token, req.user);
  await inTransaction(async (session) => {
    if (invitation.assignedRole === 'backup') {
      const oldBackup = invitation.familyId.backupPersonId;
      if (oldBackup && String(oldBackup) !== String(req.user.id)) await FamilyMember.updateOne({ familyId: invitation.familyId.id, userId: oldBackup }, { $set: { role: 'owner' } }, { session });
      invitation.familyId.backupPersonId = req.user.id; await invitation.familyId.save({ session });
    }
    await FamilyMember.updateOne({ familyId: invitation.familyId.id, userId: req.user.id }, { $set: { role: invitation.assignedRole, status: 'active', joinedAt: new Date() } }, { upsert: true, session });
    invitation.status = 'accepted'; await invitation.save({ session });
    const docs = await Document.find({ familyId: invitation.familyId.id, status: 'active' }).session(session);
    for (const doc of docs) await scheduleDocumentReminders(doc, invitation.familyId, session);
    await recordActivity({ familyId: invitation.familyId.id, userId: req.user.id, action: 'member_joined', entityType: 'family', entityId: invitation.familyId.id, description: `${req.user.name} joined the family` }, session);
    await notifyFamily({ familyId: invitation.familyId.id, title: 'A family member joined', message: `${req.user.name} joined ${invitation.familyId.familyName}.`, notificationType: 'member_update' }, session);
  });
  res.json({ family: invitation.familyId, message: 'You joined the family workspace.' });
});
export const rejectInvitation = asyncHandler(async (req, res) => { const invitation = await resolveInvitation(req.params.token, req.user); invitation.status = 'rejected'; await invitation.save(); res.json({ message: 'Invitation declined.' }); });
export const changeMemberRole = asyncHandler(async (req, res) => {
  const member = await FamilyMember.findOne({ _id: req.params.memberId, familyId: req.family.id, status: 'active' });
  if (!member) throw new AppError('Family member not found.', 404, 'MEMBER_NOT_FOUND');
  if (String(member.userId) === String(req.user.id) && req.body.role !== 'keeper') throw new AppError('You cannot remove your own keeper access.', 400, 'SELF_ROLE_CHANGE');
  const oldRole = member.role;
  await inTransaction(async (session) => {
    if (oldRole === 'keeper' && req.body.role !== 'keeper' && await FamilyMember.countDocuments({ familyId: req.family.id, role: 'keeper', status: 'active' }).session(session) <= 1) throw new AppError('A family must have at least one Family Keeper.', 400, 'LAST_KEEPER');
    if (req.body.role === 'backup') {
      const oldBackup = req.family.backupPersonId;
      if (oldBackup && String(oldBackup) !== String(member.userId)) await FamilyMember.updateOne({ familyId: req.family.id, userId: oldBackup }, { $set: { role: 'owner' } }, { session });
      req.family.backupPersonId = member.userId; await req.family.save({ session });
    } else if (String(req.family.backupPersonId) === String(member.userId)) { req.family.backupPersonId = null; await req.family.save({ session }); }
    member.role = req.body.role; await member.save({ session });
    await recordActivity({ familyId: req.family.id, userId: req.user.id, action: 'role_changed', entityType: 'family_member', entityId: member.id, description: `Updated a family member's role to ${req.body.role}` }, session);
  });
  res.json({ member: { id: member.id, role: member.role } });
});
export const removeMember = asyncHandler(async (req, res) => {
  const member = await FamilyMember.findOne({ _id: req.params.memberId, familyId: req.family.id, status: 'active' });
  if (!member) throw new AppError('Family member not found.', 404, 'MEMBER_NOT_FOUND');
  if (String(member.userId) === String(req.user.id)) throw new AppError('You cannot remove yourself from this workspace.', 400, 'SELF_REMOVE');
  await inTransaction(async (session) => {
    if (member.role === 'keeper' && await FamilyMember.countDocuments({ familyId: req.family.id, role: 'keeper', status: 'active' }).session(session) <= 1) throw new AppError('Assign another Family Keeper before removing this person.', 400, 'LAST_KEEPER');
    member.status = 'removed'; await member.save({ session });
    await Reminder.updateMany({ familyId: req.family.id, recipientId: member.userId, deliveryStatus: 'pending' }, { $set: { deliveryStatus: 'cancelled' } }, { session });
    if (String(req.family.backupPersonId) === String(member.userId)) { req.family.backupPersonId = null; await req.family.save({ session }); }
    await recordActivity({ familyId: req.family.id, userId: req.user.id, action: 'member_removed', entityType: 'family_member', entityId: member.id, description: 'Removed a member from the family workspace' }, session);
  });
  res.status(204).end();
});
export const listInvitations = asyncHandler(async (req, res) => {
  await Invitation.updateMany({ familyId: req.family.id, status: 'pending', expiresAt: { $lte: new Date() } }, { $set: { status: 'expired' } });
  const invitations = await Invitation.find({ familyId: req.family.id }).select('-invitationTokenHash').sort({ createdAt: -1 }); res.json({ invitations });
});
export const myInvitations = asyncHandler(async (req, res) => {
  const invitations = await Invitation.find({ invitedEmail: req.user.email, status: 'pending', expiresAt: { $gt: new Date() } }).populate('familyId', 'familyName').select('-invitationTokenHash'); res.json({ invitations });
});
