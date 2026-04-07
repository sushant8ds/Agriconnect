/**
 * Auto-cancel Pending bookings not responded to within 24 hours.
 * Requirements: 3.6
 */

import { Worker } from 'bullmq';
import { redisConnection } from '../config/queue';
import { Booking } from '../models/Booking';
import { sendPushNotification } from '../services/notificationService';

export function startAutoCancelWorker(): Worker | null {
  if (!redisConnection) return null;
  const worker = new Worker(
    'booking-auto-cancel',
    async (job) => {
      if (job.name !== 'check-pending-bookings') return;

      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const expiredBookings = await Booking.find({
        status: 'Pending',
        createdAt: { $lt: cutoff },
      });

      let cancelledCount = 0;

      for (const booking of expiredBookings) {
        booking.status = 'Cancelled';
        booking.cancelledBy = 'system';
        booking.cancellationReason = 'Provider did not respond within 24 hours';
        await booking.save();

        await sendPushNotification(
          booking.farmer_id.toString(),
          'Booking Auto-Cancelled',
          'Your booking was automatically cancelled as the provider did not respond within 24 hours.'
        );

        cancelledCount++;
      }

      console.log(`[AutoCancelWorker] Cancelled ${cancelledCount} pending booking(s).`);
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => {
    console.error(`[AutoCancelWorker] Job ${job?.id} failed:`, err);
  });

  return worker;
}
