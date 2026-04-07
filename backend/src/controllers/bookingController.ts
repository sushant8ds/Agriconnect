import { Request, Response } from 'express';
import { Booking, BookingStatus } from '../models/Booking';
import { Service } from '../models/Service';
import { sendPushNotification } from '../services/notificationService';
import { invalidateRecommendationCache } from './recommendationController';
import { trustScoreQueue } from '../config/queue';
import { closeTrackingRoom } from '../services/gpsTracker';

/**
 * POST /bookings
 * Creates a new booking for the authenticated Farmer.
 * Requirements: 3.1, 3.7
 */
export async function createBooking(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { service_id, date, timeSlot } = req.body as {
    service_id?: string;
    date?: string;
    timeSlot?: string;
  };

  // Validate required fields
  if (!service_id || !date || !timeSlot) {
    res.status(400).json({ error: 'Missing required fields: service_id, date, timeSlot' });
    return;
  }

  // Parse and validate date
  const bookingDate = new Date(date);
  if (isNaN(bookingDate.getTime())) {
    res.status(400).json({ error: 'Invalid date format. Use ISO 8601 string.' });
    return;
  }

  // Validate service exists and is active/available (Requirement 3.1)
  const service = await Service.findById(service_id);
  if (!service) {
    res.status(404).json({ error: 'Service not found' });
    return;
  }
  if (service.status !== 'active' || !service.availability) {
    res.status(400).json({ error: 'Service is not available for booking' });
    return;
  }

  // Check for duplicate active booking (Requirement 3.7)
  const dateStart = new Date(bookingDate);
  dateStart.setUTCHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart);
  dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);

  const duplicate = await Booking.findOne({
    service_id,
    timeSlot,
    date: { $gte: dateStart, $lt: dateEnd },
    status: { $in: ['Pending', 'Accepted', 'InProgress'] },
  });

  if (duplicate) {
    res.status(409).json({ error: 'A booking already exists for this service and time slot.' });
    return;
  }

  // Create booking with status Pending (Requirement 3.1)
  const booking = await Booking.create({
    farmer_id: user.userId,
    service_id,
    provider_id: service.provider_id,
    status: 'Pending',
    date: bookingDate,
    timeSlot,
  });

  // Notify the Service_Provider (Requirement 3.1)
  await sendPushNotification(
    service.provider_id.toString(),
    'New Booking Request',
    `You have a new booking request for ${service.type} on ${bookingDate.toISOString().split('T')[0]}`
  );

  res.status(201).json({ booking });
}

/**
 * PATCH /bookings/:id
 * Updates booking status with valid state machine transitions.
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */
export async function updateBookingStatus(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;
  const { status, cancellationReason } = req.body as {
    status?: string;
    cancellationReason?: string;
  };

  if (!status) {
    res.status(400).json({ error: 'Missing required field: status' });
    return;
  }

  const booking = await Booking.findById(id);
  if (!booking) {
    res.status(404).json({ error: 'Booking not found' });
    return;
  }

  const farmerId = booking.farmer_id.toString();
  const providerId = booking.provider_id.toString();
  const callerId = user.userId;
  const callerRole = user.role;

  // Verify caller is the farmer or provider of this booking
  if (callerId !== farmerId && callerId !== providerId) {
    res.status(403).json({ error: 'Access denied. You are not a party to this booking.' });
    return;
  }

  const currentStatus = booking.status as BookingStatus;
  const newStatus = status as BookingStatus;

  // Validate allowed transitions per role
  const isProvider = callerRole === 'Service_Provider' && callerId === providerId;
  const isFarmer = callerRole === 'Farmer' && callerId === farmerId;

  const validTransitions: Record<string, { from: BookingStatus[]; allowedFor: string[] }> = {
    Accepted:   { from: ['Pending'],              allowedFor: ['provider'] },
    InProgress: { from: ['Accepted'],             allowedFor: ['provider'] },
    Completed:  { from: ['InProgress'],           allowedFor: ['provider'] },
    Cancelled:  { from: ['Pending', 'Accepted'],  allowedFor: ['farmer', 'provider'] },
  };

  const rule = validTransitions[newStatus];
  if (!rule) {
    res.status(400).json({ error: `Invalid target status: ${newStatus}` });
    return;
  }

  if (!rule.from.includes(currentStatus)) {
    res.status(400).json({
      error: `Cannot transition from ${currentStatus} to ${newStatus}`,
    });
    return;
  }

  const callerKey = isProvider ? 'provider' : isFarmer ? 'farmer' : null;
  if (!callerKey || !rule.allowedFor.includes(callerKey)) {
    res.status(403).json({
      error: `Your role is not permitted to set status to ${newStatus}`,
    });
    return;
  }

  // Apply transition
  booking.status = newStatus;

  if (newStatus === 'Cancelled') {
    booking.cancelledBy = callerKey;
    if (cancellationReason) {
      booking.cancellationReason = cancellationReason;
    }
    // Requirement 11.2: stop GPS tracking
    closeTrackingRoom(id);
  }

  if (newStatus === 'Completed') {
    booking.feedbackPromptSent = true;
    // Invalidate recommendation cache so next request reflects new history (Requirement 10.3)
    await invalidateRecommendationCache(farmerId);
    // Requirement 11.2: stop GPS tracking
    closeTrackingRoom(id);
  }

  await booking.save();

  // Send notifications
  if (newStatus === 'Accepted') {
    // Requirement 3.2: notify farmer
    await sendPushNotification(
      farmerId,
      'Booking Accepted',
      'Your booking has been accepted'
    );
  } else if (newStatus === 'Completed') {
    // Requirement 3.4: prompt farmer to rate
    await sendPushNotification(
      farmerId,
      'Booking Completed',
      'Your booking is complete. Please rate your experience.'
    );
    // Requirement 19.2: recalculate trust scores asynchronously
    if (trustScoreQueue) {
      await trustScoreQueue.add('recalculate', { userId: farmerId });
      await trustScoreQueue.add('recalculate', { userId: providerId });
    }
  } else if (newStatus === 'Cancelled') {
    // Requirement 3.5: notify the OTHER party
    const notifyUserId = callerKey === 'farmer' ? providerId : farmerId;
    const notifyTitle = 'Booking Cancelled';
    const notifyBody = cancellationReason
      ? `A booking has been cancelled. Reason: ${cancellationReason}`
      : 'A booking has been cancelled.';
    await sendPushNotification(notifyUserId, notifyTitle, notifyBody);
    // Requirement 19.2: recalculate trust scores asynchronously
    if (trustScoreQueue) {
      await trustScoreQueue.add('recalculate', { userId: farmerId });
      await trustScoreQueue.add('recalculate', { userId: providerId });
    }
  }

  res.status(200).json({ booking });
}

/**
 * GET /bookings
 * Returns all bookings for the authenticated Farmer, sorted newest first.
 */
export async function getFarmerBookings(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const bookings = await Booking.find({ farmer_id: user.userId })
    .populate('service_id', 'type price description averageRating')
    .populate('provider_id', 'name phone')
    .sort({ createdAt: -1 })
    .lean();
  res.status(200).json(bookings);
}
