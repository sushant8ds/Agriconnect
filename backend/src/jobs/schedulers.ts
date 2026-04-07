/**
 * Schedulers — registers recurring BullMQ jobs.
 * Gracefully skips if Redis is not configured.
 */

import { bookingAutoCancel, calendarQueue, pricePredictionQueue } from '../config/queue';
import { startAutoCancelWorker } from './autoCancelBookings';
import { startTrustScoreWorker } from './trustScoreWorker';
import { startCalendarWorker } from './calendarWorker';
import { startPricePredictionWorker } from './pricePredictionWorker';

const MS_IN_24H = 24 * 60 * 60 * 1000;

export async function startSchedulers(): Promise<void> {
  if (!bookingAutoCancel || !calendarQueue || !pricePredictionQueue) {
    console.log('[Schedulers] Redis not configured — background jobs disabled.');
    return;
  }

  try {
    startAutoCancelWorker();
    startTrustScoreWorker();
    startCalendarWorker();
    startPricePredictionWorker();

    await bookingAutoCancel.add(
      'check-pending-bookings',
      {},
      { jobId: 'auto-cancel-pending', repeat: { every: 3600000 } }
    );
    console.log('[Schedulers] Auto-cancel scheduler started (every 1 hour).');

    await calendarQueue.add(
      'check-all-farmer-calendars',
      { type: '__batch_notify__' },
      { jobId: 'calendar-daily-notify', repeat: { every: MS_IN_24H } }
    );
    console.log('[Schedulers] Calendar daily-notify scheduler started (every 24 hours).');

    await pricePredictionQueue.add(
      'update-predictions',
      {},
      { jobId: 'price-prediction-daily', repeat: { every: 86400000 } }
    );
    console.log('[Schedulers] Price prediction scheduler started (every 24 hours).');
  } catch (err) {
    console.warn('[Schedulers] Failed to start schedulers (non-fatal):', (err as Error).message);
  }
}
