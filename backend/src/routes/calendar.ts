/**
 * Calendar routes
 * POST /calendar/generate — Farmer only: enqueue a calendar generation job
 * GET  /calendar          — Farmer only: return current farming calendar
 *
 * Requirements: 16.1, 16.2, 16.3
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { farmerOnly } from '../middleware/rbac';
import { calendarQueue } from '../config/queue';
import { FarmingCalendar } from '../models/FarmingCalendar';

const router = Router();

/**
 * POST /calendar/generate
 * Farmer only — enqueue a 'generate' job for the authenticated farmer.
 * Body: { cropType: string, location: string }
 */
router.post(
  '/generate',
  authenticate,
  farmerOnly,
  async (req: Request, res: Response): Promise<void> => {
    const { cropType, location } = req.body;

    if (!cropType || !location) {
      res.status(400).json({ error: 'cropType and location are required' });
      return;
    }

    const farmerId = req.user!.userId;

    if (!calendarQueue) {
      res.status(503).json({ error: 'Calendar service unavailable (Redis not configured)' });
      return;
    }

    await calendarQueue.add('generate-calendar', {
      type: 'generate',
      farmerId,
      cropType,
      location,
    });

    res.status(202).json({ message: 'Calendar generation queued' });
  }
);

/**
 * GET /calendar
 * Farmer only — returns the authenticated farmer's current farming calendar.
 */
router.get(
  '/',
  authenticate,
  farmerOnly,
  async (req: Request, res: Response): Promise<void> => {
    const farmerId = req.user!.userId;

    try {
      const calendar = await FarmingCalendar.findOne({ farmer_id: farmerId }).lean();

      if (!calendar) {
        res.status(404).json({ error: 'No farming calendar found. Please generate one first.' });
        return;
      }

      res.json({ calendar });
    } catch (err) {
      console.error('[CalendarRoute] GET /calendar error:', err);
      res.status(500).json({ error: 'Failed to fetch calendar' });
    }
  }
);

export default router;
