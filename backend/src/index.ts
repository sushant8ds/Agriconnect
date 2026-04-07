/**
 * Security Audit — KisanServe Platform
 *
 * Measures in place:
 * - JWT short-lived tokens (15min) + refresh tokens (7d)
 * - OTP rate limiting (5/hour via Redis)
 * - Account lockout after 3 failed OTP attempts (15min)
 * - RBAC on all protected endpoints
 * - Input sanitization (NoSQL injection + XSS)
 * - Helmet.js security headers
 * - HTTPS enforced at load balancer level (documented in design.md)
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { startSchedulers } from './jobs/schedulers';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { responseTime } from './middleware/responseTime';
import { setupGpsTracking } from './services/gpsTracker';
import { sanitizeInput } from './middleware/sanitize';
import { seedAllData } from './scripts/seedAll';

const app = express();
const PORT = process.env.PORT || 3000;

// Security & parsing middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Input sanitization — NoSQL injection + XSS prevention
app.use(sanitizeInput);

// Response time logging
app.use(responseTime);

// API routes
app.use('/api', routes);

// Global error handler
app.use(errorHandler);

async function bootstrap(): Promise<void> {
  await connectDB();
  await connectRedis();
  await startSchedulers();
  await seedAllData();

  const server = app.listen(PORT, () => {
    console.log(`KisanServe API running on port ${PORT}`);
  });

  setupGpsTracking(server);
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
