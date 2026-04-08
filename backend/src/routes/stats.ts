import { Router, Request, Response } from 'express';
import { User } from '../models/User';
import { Service } from '../models/Service';
import { Booking } from '../models/Booking';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const [farmers, providers, activeServices, completedBookings] = await Promise.all([
      User.countDocuments({ role: 'Farmer' }),
      User.countDocuments({ role: 'Service_Provider' }),
      Service.countDocuments({ status: 'active' }),
      Booking.countDocuments({ status: 'Completed' }),
    ]);
    res.json({ farmers, providers, activeServices, completedBookings });
  } catch {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

export default router;
