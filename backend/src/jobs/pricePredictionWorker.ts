/**
 * Price Prediction Worker
 * BullMQ worker that processes price prediction update jobs.
 * Requirements: 20.1, 20.4
 */

import { Worker } from 'bullmq';
import { redisConnection } from '../config/queue';
import { updatePricePredictions } from '../services/pricePredictionService';

export function startPricePredictionWorker(): Worker | null {
  if (!redisConnection) return null;
  const worker = new Worker(
    'price-prediction',
    async (job) => {
      console.log(`[PricePredictionWorker] Processing job ${job.id}: ${job.name}`);
      await updatePricePredictions();
      console.log(`[PricePredictionWorker] Job ${job.id} completed.`);
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => {
    console.error(`[PricePredictionWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[PricePredictionWorker] Worker started on queue: price-prediction');
  return worker;
}
