import ActivityLog from '../models/ActivityLog.js';
export const recordActivity = (data, session) => ActivityLog.create([data], session ? { session } : {});
