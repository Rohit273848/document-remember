import 'dotenv/config';
import mongoose from 'mongoose';
import { env } from './config/env.js';
import { connectDatabase } from './config/db.js';
import app from './app.js';
import { startReminderJobs } from './jobs/reminderJob.js';

await connectDatabase();
const server = app.listen(env.PORT, '0.0.0.0', () => {
  console.info(`Hearth API listening on port ${env.PORT}`);
  startReminderJobs();
});
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Hearth API could not start: port ${env.PORT} is already in use. Stop the other API process (usually with Ctrl+C in its terminal), then start Hearth once.`);
  } else {
    console.error('Hearth API failed to start:', error.message);
  }
  mongoose.disconnect().finally(() => { process.exitCode = 1; });
});
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
