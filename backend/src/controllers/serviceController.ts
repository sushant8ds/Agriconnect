import { Request, Response } from 'express';
import { Service } from '../models/Service';
import { Booking } from '../models/Booking';

export async function listServices(req: Request, res: Response): Promise<void> {
  const { category, minPrice, maxPrice, minRating, sortBy } = req.query as Record<string, string>;

  const filter: Record<string, unknown> = { status: 'active', availability: true };
  if (category) filter.category = category;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) (filter.price as any).$gte = parseFloat(minPrice);
    if (maxPrice) (filter.price as any).$lte = parseFloat(maxPrice);
  }
  if (minRating) filter.averageRating = { $gte: parseFloat(minRating) };

  let query = Service.find(filter).populate('provider_id', 'name trust_score');
  if (sortBy === 'price') query = query.sort({ price: 1 });
  else if (sortBy === 'rating') query = query.sort({ averageRating: -1 });

  const services = await query.lean();
  res.json({ services });
}

export async function createService(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { type, price, availability, description, lat, lng } = req.body;

  if (!type || !price) { res.status(400).json({ error: 'type and price are required' }); return; }

  const service = await Service.create({
    provider_id: user.userId,
    type,
    category: type,
    price: parseFloat(price),
    availability: availability ?? true,
    description,
    status: 'pending',
    location: {
      type: 'Point',
      coordinates: [parseFloat(lng ?? '0'), parseFloat(lat ?? '0')],
    },
  });

  res.status(201).json({ service });
}

export async function updateService(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  const service = await Service.findById(id);
  if (!service) { res.status(404).json({ error: 'Service not found' }); return; }
  if (service.provider_id.toString() !== user.userId) { res.status(403).json({ error: 'Not authorized' }); return; }

  Object.assign(service, req.body);
  await service.save();
  res.json({ service });
}

export async function deleteService(req: Request, res: Response): Promise<void> {
  const user = req.user!;
  const { id } = req.params;

  const service = await Service.findById(id);
  if (!service) { res.status(404).json({ error: 'Service not found' }); return; }
  if (service.provider_id.toString() !== user.userId) { res.status(403).json({ error: 'Not authorized' }); return; }

  await Booking.updateMany(
    { service_id: id, status: { $in: ['Pending', 'Accepted'] } },
    { status: 'Cancelled', cancelledBy: 'system', cancellationReason: 'Service was deleted' }
  );
  await service.deleteOne();
  res.json({ message: 'Service deleted' });
}
