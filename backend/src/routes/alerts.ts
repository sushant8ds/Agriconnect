import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { Alert } from '../models/Alert';

const router = Router();

router.get('/', authenticate, async (req: Request, res: Response) => {
  const alerts = await Alert.find({ isActive: true }).sort({ createdAt: -1 }).limit(20);
  res.json({ alerts });
});

router.post('/', authenticate, async (req: Request, res: Response) => {
  const { type, message, targetLocation, expiresAt } = req.body;
  try {
    const alert = await Alert.create({ type, message, targetLocation, expiresAt });
    res.status(201).json({ alert });
  } catch {
    res.status(500).json({ error: 'Failed to create alert' });
  }
});

export default router;
