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
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
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
  console.log(`Supabase: ${process.env.SUPABASE_URL}`);
});

export default app;
