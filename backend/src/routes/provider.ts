import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { providerOnly } from '../middleware/rbac';
import { getProviderBookings, getProviderEarnings, getProviderServices } from '../controllers/providerController';
import { Booking } from '../models/Booking';
import { Service } from '../models/Service';

const router = Router();

router.get('/bookings', authenticate, providerOnly, getProviderBookings);
router.get('/earnings', authenticate, providerOnly, getProviderEarnings);
router.get('/services', authenticate, providerOnly, getProviderServices);

// Debug endpoint — shows what provider_id is in the JWT vs what's in the DB
// Remove this once the issue is confirmed fixed
router.get('/debug', authenticate, providerOnly, async (req, res) => {
  const user = req.user!;
  const myServices = await Service.find({ provider_id: user.userId }, '_id type status provider_id');
  const myBookings = await Booking.find({ provider_id: user.userId }, '_id status date provider_id').limit(10);
  const allBookings = await Booking.find({}, '_id status provider_id').limit(10);
  res.json({
    myUserId: user.userId,
    myRole: user.role,
    myServicesCount: myServices.length,
    myServices,
    myBookingsCount: myBookings.length,
    myBookings,
    allBookingsSample: allBookings,
  });
});

export default router;
