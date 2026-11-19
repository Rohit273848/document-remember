import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import familyRoutes from './routes/families.js';
import invitationRoutes from './routes/invitations.js';
import documentRoutes from './routes/documents.js';
import dashboardRoutes from './routes/dashboard.js';
import reminderRoutes from './routes/reminders.js';
import notificationRoutes from './routes/notifications.js';
import activityRoutes from './routes/activity.js';
import userRoutes from './routes/users.js';

const app = express();
app.disable('x-powered-by');
app.use(helmet());
const allowedOrigins = [env.CLIENT_ORIGIN, 'http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174'];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || (env.NODE_ENV === 'development' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '100kb' })); app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use((req, _res, next) => {
  const scrub = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) delete value[key]; else scrub(value[key]);
    }
  };
  scrub(req.body); scrub(req.params); scrub(req.query); next();
});
app.use('/api', rateLimit({ windowMs: 15 * 60_000, limit: 400, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'hearth-api' }));
app.use('/api/auth', authRoutes); app.use('/api/families', familyRoutes); app.use('/api/invitations', invitationRoutes);
app.use('/api/documents', documentRoutes); app.use('/api/dashboard', dashboardRoutes); app.use('/api/reminders', reminderRoutes);
app.use('/api/notifications', notificationRoutes); app.use('/api/activity', activityRoutes);
app.use('/api/users', userRoutes);
app.use(notFound); app.use(errorHandler);
export default app;
