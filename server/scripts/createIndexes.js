import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDatabase } from '../config/db.js';
import User from '../models/User.js';
import Family from '../models/Family.js';
import FamilyMember from '../models/FamilyMember.js';
import Invitation from '../models/Invitation.js';
import Document from '../models/Document.js';
import DocumentVersion from '../models/DocumentVersion.js';
import Reminder from '../models/Reminder.js';
import Notification from '../models/Notification.js';
import ActivityLog from '../models/ActivityLog.js';

await connectDatabase();
try {
  const models = [User, Family, FamilyMember, Invitation, Document, DocumentVersion, Reminder, Notification, ActivityLog];
  await Promise.all(models.map((model) => model.createIndexes()));
  console.info('MongoDB indexes created.');
} finally { await mongoose.disconnect(); }
