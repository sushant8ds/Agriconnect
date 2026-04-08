import { Request, Response } from 'express';
import { Feedback } from '../models/Feedback';
import { Booking } from '../models/Booking';
import { Service } from '../models/Service';

export async function submitFeedback(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { booking_id, reviewee_id, rating, comment } = req.body;

  if (!booking_id || !reviewee_id || !rating) { res.status(400).json({ error: 'booking_id, reviewee_id and rating are required' }); return; }
  if (rating < 1 || rating > 5) { res.status(400).json({ error: 'Rating must be between 1 and 5' }); return; }
  if (user.userId === reviewee_id) { res.status(400).json({ error: 'Cannot review yourself' }); return; }

  const booking = await Booking.findById(booking_id);
  if (!booking || booking.status !== 'Completed') { res.status(400).json({ error: 'Can only review completed bookings' }); return; }

  const existing = await Feedback.findOne({ booking_id, reviewer_id: user.userId });
  if (existing) { res.status(409).json({ error: 'You have already reviewed this booking' }); return; }

  const feedback = await Feedback.create({
    booking_id,
    reviewer_id: user.userId,
    reviewee_id,
    rating,
    comment,
  });

  // Update average rating on provider's services
  const allFeedback = await Feedback.find({ reviewee_id, is_flagged: false });
  if (allFeedback.length > 0) {
    const avg = allFeedback.reduce((s, f) => s + f.rating, 0) / allFeedback.length;
    await Service.updateMany(
      { provider_id: reviewee_id },
      { averageRating: Math.round(avg * 10) / 10, ratingCount: allFeedback.length }
    );
  }

  res.status(201).json({ feedback });
}

export async function getFeedback(req: Request, res: Response): Promise<void> {
  const { userId } = req.params;
  const feedback = await Feedback.find({ reviewee_id: userId, is_flagged: false })
    .populate('reviewer_id', 'name')
    .sort({ createdAt: -1 });
  res.json({ feedback });
}
