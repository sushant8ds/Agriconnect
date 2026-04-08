import { Request, Response } from 'express';
import { User } from '../models/User';
import { Service } from '../models/Service';
import { Booking } from '../models/Booking';
import { Feedback } from '../models/Feedback';
import { sendPushNotification } from '../services/notificationService';

/**
 * PATCH /admin/users/:id
 * Activate or deactivate a user account.
 * If deactivating a Service_Provider, cancel all Pending/Accepted bookings
 * and notify affected Farmers.
 * Requirements: 9.1, 9.2
 */
export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { isActive } = req.body as { isActive?: boolean };

  if (typeof isActive !== 'boolean') {
    res.status(400).json({ error: 'isActive must be a boolean' });
    return;
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }

  const wasActive = user.isActive;
  user.isActive = isActive;
  await user.save();

  // If deactivating a Service_Provider, cancel their open bookings (Req 9.2)
  if (!isActive && wasActive && user.role === 'Service_Provider') {
    const openBookings = await Booking.find({
      provider_id: user._id,
      status: { $in: ['Pending', 'Accepted'] },
    });

    for (const booking of openBookings) {
      booking.status = 'Cancelled';
      booking.cancelledBy = 'system';
      booking.cancellationReason = 'Service provider account was deactivated';
      await booking.save();

      await sendPushNotification(
        booking.farmer_id.toString(),
        'Booking Cancelled',
        'Your booking has been cancelled because the service provider account was deactivated.'
      );
    }
  }

  res.json({ user });
}

/**
 * PATCH /admin/services/:id
 * Update the status of a service listing (approve, reject, etc.).
 * Requirements: 9.3
 */
export async function updateServiceStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body as { status?: string };

  const validStatuses = ['active', 'pending', 'rejected'];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
    return;
  }

  const service = await Service.findById(id);
  if (!service) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }

  service.status = status as 'active' | 'pending' | 'rejected';
  await service.save();

  res.json({ service });
}

/**
 * GET /admin/flagged-reviews
 * Return all feedback documents flagged for review.
 * Requirements: 9.4
 */
export async function getFlaggedReviews(req: Request, res: Response): Promise<void> {
  const reviews = await Feedback.find({ is_flagged: true })
    .populate('reviewer_id', 'name')
    .populate('reviewee_id', 'name')
    .populate('booking_id');

  res.json({ reviews });
}

/**
 * PATCH /admin/reviews/:id
 * Approve (unflag) or remove a flagged review.
 * If approved, recalculate the provider's average rating.
 * Requirements: 9.4
 */
export async function updateReviewStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { action } = req.body as { action?: string };

  if (!action || !['approve', 'remove'].includes(action)) {
    res.status(400).json({ error: 'action must be "approve" or "remove"' });
    return;
  }

  const feedback = await Feedback.findById(id);
  if (!feedback) {
    res.status(404).json({ error: 'Review not found' });
    return;
  }

  if (action === 'remove') {
    await feedback.deleteOne();
    res.json({ message: 'Review removed' });
    return;
  }

  // approve: unflag and recalculate provider average rating
  feedback.is_flagged = false;
  await feedback.save();

  // Recalculate average rating for the reviewee (provider)
  const [agg] = await Feedback.aggregate<{ avgRating: number; count: number }>([
    { $match: { reviewee_id: feedback.reviewee_id, is_flagged: { $ne: true } } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  if (agg) {
    const newAvg = Math.round(agg.avgRating * 10) / 10;
    await Service.updateMany(
      { provider_id: feedback.reviewee_id },
      { $set: { averageRating: newAvg, ratingCount: agg.count } }
    );
  }

  res.json({ feedback });
}

/**
 * GET /admin/analytics
 * Platform analytics: users by role, bookings by status, active listings by category,
 * platform revenue for a date range, and flagged accounts (trust_score < 2).
 * Requirements: 9.5, 9.6, 19.4
 */
export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const { startDate, endDate } = req.query as { startDate?: string; endDate?: string };

  const dateFilter: Record<string, Date> = {};
  if (startDate) dateFilter.$gte = new Date(startDate);
  if (endDate) dateFilter.$lte = new Date(endDate);
  const hasDateFilter = Object.keys(dateFilter).length > 0;

  // Total users by role
  const usersByRoleAgg = await User.aggregate<{ _id: string; count: number }>([
    { $group: { _id: '$role', count: { $sum: 1 } } },
  ]);
  const totalUsersByRole: Record<string, number> = { Farmer: 0, Service_Provider: 0, Admin: 0 };
  for (const entry of usersByRoleAgg) {
    totalUsersByRole[entry._id] = entry.count;
  }

  // Bookings by status
  const bookingsByStatusAgg = await Booking.aggregate<{ _id: string; count: number }>([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const bookingsByStatus: Record<string, number> = {
    Pending: 0, Accepted: 0, InProgress: 0, Completed: 0, Cancelled: 0,
  };
  for (const entry of bookingsByStatusAgg) {
    bookingsByStatus[entry._id] = entry.count;
  }

  // Active listings by category
  const listingsByCategoryAgg = await Service.aggregate<{ _id: string; count: number }>([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const activeListingsByCategory: Record<string, number> = {};
  for (const entry of listingsByCategoryAgg) {
    activeListingsByCategory[entry._id] = entry.count;
  }

  // Platform revenue: sum of prices from Completed bookings in date range
  const revenueMatch: Record<string, unknown> = { status: 'Completed' };
  if (hasDateFilter) revenueMatch.createdAt = dateFilter;

  const revenueAgg = await Booking.aggregate<{ totalRevenue: number }>([
    { $match: revenueMatch },
    {
      $lookup: {
        from: 'services',
        localField: 'service_id',
        foreignField: '_id',
        as: 'service',
      },
    },
    { $unwind: '$service' },
    { $group: { _id: null, totalRevenue: { $sum: '$service.price' } } },
  ]);
  const platformRevenue = revenueAgg[0]?.totalRevenue ?? 0;

  // Flagged accounts: users with trust_score < 2 (Req 9.6, 19.4)
  const flaggedAccounts = await User.find({ trust_score: { $lt: 2 } }).select(
    'name phone role trust_score isActive'
  );

  res.json({
    totalUsersByRole,
    bookingsByStatus,
    activeListingsByCategory,
    platformRevenue,
    flaggedAccounts,
  });
}

/**
 * GET /admin/bookings
 * All bookings sorted by newest first, with farmer/provider/service populated.
 */
export async function getAllBookings(req: Request, res: Response): Promise<void> {
  try {
    const bookings = await Booking.find()
      .populate('farmer_id', 'name phone')
      .populate('provider_id', 'name phone')
      .populate('service_id', 'type price')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
}
