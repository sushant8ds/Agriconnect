import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index';
import { errorHandler } from './middleware/errorHandler';
import { responseTime } from './middleware/responseTime';
import { sanitizeInput } from './middleware/sanitize';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

// CORS — wildcard is forbidden in production (credentials: true + '*' is rejected by browsers)
const corsOrigin: string | string[] = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : process.env.NODE_ENV === 'production'
    ? (() => { throw new Error('CORS_ORIGIN must be set in production'); })()
    : '*';

app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(sanitizeInput);
app.use(responseTime);
app.use('/api', routes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`KisanServe API running on port ${PORT}`);
});

export default app;
