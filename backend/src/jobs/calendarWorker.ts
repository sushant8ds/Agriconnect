/**
 * Calendar Worker — BullMQ worker for farming-calendar queue.
 * Job types: 'generate', 'notify', 'refresh'
 * Requirements: 16.1, 16.2, 16.3
 */

import { Worker } from 'bullmq';
import { redisConnection } from '../config/queue';
import { generateCalendar, refreshCalendarIfWeatherChanged } from '../services/calendarService';
import { sendPushNotification } from '../services/notificationService';
import { FarmingCalendar } from '../models/FarmingCalendar';

const MS_IN_24H = 24 * 60 * 60 * 1000;

export function startCalendarWorker(): Worker | null {
  if (!redisConnection) return null;
  const worker = new Worker(
    'farming-calendar',
    async (job) => {
      const { type } = job.data as { type: string };

      switch (type) {
        case 'generate': {
          const { farmerId, cropType, location } = job.data as {
            farmerId: string;
            cropType: string;
            location: string;
          };
          await generateCalendar(farmerId, cropType, location);
          console.log(`[CalendarWorker] generate job done for farmer=${farmerId}`);
          break;
        }

        case 'notify': {
          const { farmerId } = job.data as { farmerId: string };
          const calendar = await FarmingCalendar.findOne({ farmer_id: farmerId }).lean();
          if (!calendar) {
            console.log(`[CalendarWorker] No calendar for farmer=${farmerId} — skipping notify`);
            break;
          }

          const now = Date.now();
          const upcoming = calendar.scheduleJson.filter((entry) => {
            const eventTime = new Date(entry.date).getTime();
            return eventTime > now && eventTime <= now + MS_IN_24H;
          });

          for (const entry of upcoming) {
            await sendPushNotification(
              farmerId,
              `Upcoming: ${entry.activity}`,
              entry.notes || `Scheduled for ${new Date(entry.date).toLocaleDateString()}`
            );
          }

          console.log(`[CalendarWorker] notify job done for farmer=${farmerId}, ${upcoming.length} event(s) sent`);
          break;
        }

        case 'refresh': {
          const { farmerId } = job.data as { farmerId: string };
          await refreshCalendarIfWeatherChanged(farmerId);
          console.log(`[CalendarWorker] refresh job done for farmer=${farmerId}`);
          break;
        }

        case '__batch_notify__': {
          const { FarmingCalendar: FC } = await import('../models/FarmingCalendar');
          const calendars = await FC.find({}).select('farmer_id').lean();
          const { calendarQueue } = await import('../config/queue');
          if (!calendarQueue) break;
          for (const cal of calendars) {
            await calendarQueue.add('notify-farmer', {
              type: 'notify',
              farmerId: cal.farmer_id.toString(),
            });
          }
          console.log(`[CalendarWorker] Batch notify enqueued for ${calendars.length} farmer(s)`);
          break;
        }

        default:
          console.warn(`[CalendarWorker] Unknown job type: ${type}`);
      }
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => {
    console.error(`[CalendarWorker] Job ${job?.id} (type=${job?.data?.type}) failed:`, err.message);
  });

  console.log('[CalendarWorker] Worker started on queue: farming-calendar');
  return worker;
}
