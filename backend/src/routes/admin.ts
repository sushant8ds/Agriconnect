import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { adminOnly } from '../middleware/rbac';
import {
  updateUserStatus,
  updateServiceStatus,
  getFlaggedReviews,
  updateReviewStatus,
  getAnalytics,
  getAllServices,
  getAllBookings,
  getKnowledge,
  addKnowledge,
  deleteKnowledge,
} from '../controllers/adminController';
import { getFraudStats } from '../services/fraudDetector';

const router = Router();

router.use(authenticate, adminOnly);
router.get('/services', getAllServices);
router.patch('/users/:id', updateUserStatus);
router.patch('/services/:id', updateServiceStatus);
router.get('/flagged-reviews', getFlaggedReviews);
router.patch('/reviews/:id', updateReviewStatus);
router.get('/analytics', getAnalytics);
router.get('/bookings', getAllBookings);
router.get('/knowledge', getKnowledge);
router.post('/knowledge', addKnowledge);
router.delete('/knowledge/:id', deleteKnowledge);
router.get('/fraud-stats', async (req, res) => {
  try {
    const stats = await getFraudStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch fraud stats' });
  }
});

export default router;
