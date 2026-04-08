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

app.use(helmet());

// CORS — wildcard forbidden in production with credentials
const corsOrigin: string | string[] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : '*'; // Allow all in dev; set CORS_ORIGIN in Render for production

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
app.use(responseTime);
app.use('/api', routes);
app.use(errorHandler);

async function bootstrap(): Promise<void> {
  await connectDB();
  await connectRedis();
  await startSchedulers();

  // Skip seeding in production — avoids destroying real data on cold start
  if (process.env.NODE_ENV !== 'production') {
    await seedAllData();
  }

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
