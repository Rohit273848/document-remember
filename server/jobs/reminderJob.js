import cron from 'node-cron';
import { processDueReminders, processExpiredDocumentNotices } from '../services/reminders.js';

export function startReminderJobs() {
  const run = async () => {
    try { const sent = await processDueReminders(); if (sent) console.info(`Processed ${sent} due reminder(s)`); }
    catch (error) { console.error('Reminder processing failed:', error); }
  };
  const expired = async () => {
    try { const count = await processExpiredDocumentNotices(); if (count) console.info(`Created ${count} expired document notice(s)`); }
    catch (error) { console.error('Expired document notices failed:', error); }
  };
  cron.schedule('*/15 * * * *', run, { timezone: 'UTC' });
  cron.schedule('10 * * * *', expired, { timezone: 'UTC' });
  void run(); void expired();
}
