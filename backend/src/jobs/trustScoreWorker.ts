/**
 * Trust Score Worker
 * BullMQ worker that processes trust score recalculation jobs.
 * Requirements: 19.1, 19.2
 */

import { Worker } from 'bullmq';
import { redisConnection } from '../config/queue';
import { calculateTrustScore } from '../services/trustScoreService';

export function startTrustScoreWorker(): Worker | null {
  if (!redisConnection) return null;
  const worker = new Worker(
    'trust-score',
    async (job) => {
      const { userId } = job.data as { userId: string };
      const score = await calculateTrustScore(userId);
      console.log(`[TrustScoreWorker] Job ${job.id} completed. User ${userId} score: ${score}`);
    },
    { connection: redisConnection }
  );

  worker.on('failed', (job, err) => {
    console.error(`[TrustScoreWorker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[TrustScoreWorker] Worker started on queue: trust-score');
  return worker;
}
