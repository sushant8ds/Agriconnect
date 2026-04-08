import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Service } from '../models/Service';

export async function getProviderBookings(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const bookings = await Booking.find({ provider_id: user.userId })
    .populate('service_id', 'type price description')
    .populate('farmer_id', 'name phone trust_score')
    .sort({ createdAt: -1 });

  const grouped: Record<string, unknown[]> = { Pending: [], Accepted: [], InProgress: [], Completed: [], Cancelled: [] };
  for (const b of bookings) grouped[b.status]?.push(b);

  res.json({ bookings: grouped });
}

export async function getProviderEarnings(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const completed = await Booking.find({ provider_id: user.userId, status: 'Completed' })
    .populate('service_id', 'price');

  const totalRevenue = completed.reduce((sum, b) => {
    const svc = b.service_id as any;
    return sum + (svc?.price ?? 0);
  }, 0);

  res.json({ totalRevenue, completedBookings: completed.length });
}

export async function getProviderServices(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const services = await Service.find({ provider_id: user.userId });
  res.json({ services });
}
