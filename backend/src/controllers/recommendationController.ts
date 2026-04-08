import { Request, Response } from 'express';
import { Booking } from '../models/Booking';
import { Service } from '../models/Service';

export async function getRecommendations(req: Request, res: Response): Promise<void> {
  const user = req.user!;

  const completedBookings = await Booking.find({ farmer_id: user.userId, status: 'Completed' })
    .populate('service_id', 'category');

  const categoryCounts: Record<string, number> = {};
  for (const b of completedBookings) {
    const cat = (b.service_id as any)?.category;
    if (cat) categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
  }
  const preferredCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c);

  const services = await Service.find({ status: 'active', availability: true })
    .populate('provider_id', 'name trust_score')
    .lean();

  const ranked = [...services].sort((a, b) => {
    const aIdx = preferredCategories.indexOf(a.category);
    const bIdx = preferredCategories.indexOf(b.category);
    if (aIdx !== bIdx) {
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    }
    if (b.averageRating !== a.averageRating) return b.averageRating - a.averageRating;
    return ((b.provider_id as any)?.trust_score ?? 0) - ((a.provider_id as any)?.trust_score ?? 0);
  });

  res.json({ recommendations: ranked.slice(0, 10) });
}

export function invalidateRecommendationCache() {
  // no-op
}
