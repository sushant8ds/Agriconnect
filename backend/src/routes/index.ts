import { Router } from 'express';
import axios from 'axios';
import authRoutes from './auth';
import serviceRoutes from './services';
import bookingRoutes from './bookings';
import feedbackRoutes from './feedback';
import providerRoutes from './provider';
import adminRoutes from './admin';
import chatbotRoutes from './chatbot';
import cropDoctorRoutes from './cropDoctor';
import recommendationRoutes from './recommendations';
import calendarRoutes from './calendar';
import statsRoutes from './stats';
import alertRoutes from './alerts';
import { getPublicKnowledge } from '../controllers/adminController';

const router = Router();

router.use('/auth', authRoutes);
router.use('/services', serviceRoutes);
router.use('/stats', statsRoutes);
router.use('/bookings', bookingRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/provider', providerRoutes);
router.use('/admin', adminRoutes);
router.use('/chatbot', chatbotRoutes);
router.use('/crop-doctor', cropDoctorRoutes);
router.use('/recommendations', recommendationRoutes);
router.use('/calendar', calendarRoutes);
router.use('/alerts', alertRoutes);

// Weather proxy — avoids CORS issues when calling OpenWeatherMap from the browser
router.get('/weather', async (req, res) => {
  try {
    const apiKey = process.env.WEATHER_API_KEY || 'bd5e378503939ddaee76f12ad7a97608';
    const baseUrl = process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5';
    const { lat, lon, city } = req.query as { lat?: string; lon?: string; city?: string };

    let url: string;
    if (lat && lon) {
      url = `${baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
    } else if (city) {
      url = `${baseUrl}/weather?q=${city}&appid=${apiKey}&units=metric`;
    } else {
      res.status(400).json({ error: 'lat/lon or city required' });
      return;
    }

    const response = await axios.get(url);
    res.json(response.data);
  } catch (err: any) {
    res.status(err.response?.status || 500).json({ error: 'Weather fetch failed' });
  }
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
