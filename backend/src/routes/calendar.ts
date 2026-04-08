import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { farmerOnly } from '../middleware/rbac';
import { FarmingCalendar } from '../models/FarmingCalendar';

const router = Router();

router.post('/generate', authenticate, farmerOnly, async (req: Request, res: Response): Promise<void> => {
  const { cropType, location } = req.body;
  if (!cropType || !location) { res.status(400).json({ error: 'cropType and location are required' }); return; }

  const farmerId = req.user!.userId;
  const schedule = [
    { activity: 'Irrigation', date: new Date(Date.now() + 2 * 86400000).toISOString(), notes: `Water ${cropType} fields` },
    { activity: 'Fertilizer', date: new Date(Date.now() + 7 * 86400000).toISOString(), notes: 'Apply NPK fertilizer' },
    { activity: 'Harvest Check', date: new Date(Date.now() + 14 * 86400000).toISOString(), notes: 'Inspect crop readiness' },
  ];

  const calendar = await FarmingCalendar.findOneAndUpdate(
    { farmer_id: farmerId },
    { farmer_id: farmerId, cropType, location, scheduleJson: schedule, lastUpdated: new Date() },
    { upsert: true, new: true }
  );

  res.status(201).json({ calendar });
});

router.get('/', authenticate, farmerOnly, async (req: Request, res: Response): Promise<void> => {
  const calendar = await FarmingCalendar.findOne({ farmer_id: req.user!.userId });
  if (!calendar) { res.status(404).json({ error: 'No calendar found. Please generate one first.' }); return; }
  res.json({ calendar });
});

export default router;
