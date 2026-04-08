import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Service } from '../models/Service';
import { User } from '../models/User';

export async function createBooking(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { service_id, date, timeSlot } = req.body;

  if (!service_id || !date || !timeSlot) { res.status(400).json({ error: 'service_id, date and timeSlot are required' }); return; }

  const service = await Service.findById(service_id);
  if (!service) { res.status(404).json({ error: 'Service not found' }); return; }
  if (service.status !== 'active' || !service.availability) { res.status(400).json({ error: 'Service is not available' }); return; }

  const bookingDate = new Date(date);
  const dateStart = new Date(bookingDate); dateStart.setUTCHours(0, 0, 0, 0);
  const dateEnd = new Date(dateStart); dateEnd.setUTCDate(dateEnd.getUTCDate() + 1);

  const duplicate = await Booking.findOne({
    service_id,
    timeSlot,
    date: { $gte: dateStart, $lt: dateEnd },
    status: { $in: ['Pending', 'Accepted', 'InProgress'] },
  });
  if (duplicate) { res.status(409).json({ error: 'A booking already exists for this service and time slot.' }); return; }

  const booking = await Booking.create({
    farmer_id: user.userId,
    service_id,
    provider_id: service.provider_id,
    status: 'Pending',
    date: bookingDate,
    timeSlot,
  });

  res.status(201).json({ booking });
}

export async function getBookings(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const bookings = await Booking.find({ farmer_id: user.userId })
    .populate('service_id', 'type price description averageRating')
    .populate('provider_id', 'name phone trust_score')
    .sort({ createdAt: -1 });
  res.json({ bookings });
}

export async function updateBooking(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;
  const { status, cancellationReason } = req.body;

  const booking = await Booking.findById(id);
  if (!booking) { res.status(404).json({ error: 'Booking not found' }); return; }

  const isFarmer = booking.farmer_id.toString() === user.userId;
  const isProvider = booking.provider_id.toString() === user.userId;
  if (!isFarmer && !isProvider) { res.status(403).json({ error: 'Not authorized' }); return; }

  booking.status = status;
  if (status === 'Cancelled') {
    booking.cancelledBy = user.role;
    booking.cancellationReason = cancellationReason ?? 'Cancelled by user';
  }
  await booking.save();
  res.json({ booking });
}
