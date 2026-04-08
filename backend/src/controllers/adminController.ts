import { Request, Response } from 'express';
import { User } from '../models/User';
import { Service } from '../models/Service';
import { Booking } from '../models/Booking';
import { Feedback } from '../models/Feedback';
import { KnowledgeEntry } from '../models/KnowledgeEntry';

export async function getAllServices(req: Request, res: Response): Promise<void> {
  const services = await Service.find().populate('provider_id', 'name phone').sort({ createdAt: -1 });
  res.json({ services });
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') { res.status(400).json({ error: 'isActive must be a boolean' }); return; }

  const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
  if (!user) { res.status(404).json({ error: 'User not found' }); return; }

  if (!isActive && user.role === 'Service_Provider') {
    await Booking.updateMany(
      { provider_id: id, status: { $in: ['Pending', 'Accepted'] } },
      { status: 'Cancelled', cancelledBy: 'system', cancellationReason: 'Provider account deactivated' }
    );
  }
  res.json({ user });
}

export async function updateServiceStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'pending', 'rejected'].includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }

  const service = await Service.findByIdAndUpdate(id, { status }, { new: true });
  if (!service) { res.status(404).json({ error: 'Service not found' }); return; }
  res.json({ service });
}

export async function getFlaggedReviews(req: Request, res: Response): Promise<void> {
  const reviews = await Feedback.find({ is_flagged: true })
    .populate('reviewer_id', 'name')
    .populate('reviewee_id', 'name');
  res.json({ reviews });
}

export async function updateReviewStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { action } = req.body;
  if (!['approve', 'remove'].includes(action)) { res.status(400).json({ error: 'action must be approve or remove' }); return; }

  if (action === 'remove') {
    await Feedback.findByIdAndDelete(id);
    res.json({ message: 'Review removed' });
    return;
  }
  const feedback = await Feedback.findByIdAndUpdate(id, { is_flagged: false }, { new: true });
  res.json({ feedback });
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const [farmerCount, providerCount, adminCount, bookings, activeServices, completedBookings] = await Promise.all([
    User.countDocuments({ role: 'Farmer' }),
    User.countDocuments({ role: 'Service_Provider' }),
    User.countDocuments({ role: 'Admin' }),
    Booking.find({}, 'status'),
    Service.find({ status: 'active' }, 'category'),
    Booking.find({ status: 'Completed' }).populate('service_id', 'price'),
  ]);

  const bookingCounts: Record<string, number> = { Pending: 0, Accepted: 0, InProgress: 0, Completed: 0, Cancelled: 0 };
  for (const b of bookings) bookingCounts[b.status] = (bookingCounts[b.status] ?? 0) + 1;

  const categoryCounts: Record<string, number> = {};
  for (const s of activeServices) categoryCounts[s.category] = (categoryCounts[s.category] ?? 0) + 1;

  const platformRevenue = completedBookings.reduce((sum, b) => {
    const svc = b.service_id as any;
    return sum + (svc?.price ?? 0);
  }, 0);

  const flaggedAccounts = await User.find({ trust_score: { $lt: 2 } }, 'name phone role trust_score isActive');

  res.json({
    totalUsersByRole: { Farmer: farmerCount, Service_Provider: providerCount, Admin: adminCount },
    bookingsByStatus: bookingCounts,
    activeListingsByCategory: categoryCounts,
    platformRevenue,
    flaggedAccounts,
  });
}

export async function getAllBookings(req: Request, res: Response): Promise<void> {
  const bookings = await Booking.find()
    .populate('farmer_id', 'name phone')
    .populate('provider_id', 'name phone')
    .populate('service_id', 'type price')
    .sort({ createdAt: -1 })
    .limit(200);
  res.json({ bookings });
}

export async function getKnowledge(_req: Request, res: Response): Promise<void> {
  try {
    const entries = await KnowledgeEntry.find({ isActive: true }).sort({ createdAt: -1 });
    res.json({ entries });
  } catch { res.status(500).json({ error: 'Failed to fetch knowledge' }); }
}

export async function addKnowledge(req: Request, res: Response): Promise<void> {
  try {
    const { keywords, disease, crop, severity, treatment, prevention } = req.body;
    if (!keywords || !disease || !treatment || !prevention) {
      res.status(400).json({ error: 'keywords, disease, treatment, prevention are required' });
      return;
    }
    const entry = await KnowledgeEntry.create({
      keywords: Array.isArray(keywords) ? keywords : keywords.split(',').map((k: string) => k.trim()),
      disease, crop: crop || 'All Crops', severity: severity || 'Medium', treatment, prevention,
      addedBy: 'Admin',
    });
    res.status(201).json({ entry });
  } catch { res.status(500).json({ error: 'Failed to add knowledge entry' }); }
}

export async function deleteKnowledge(req: Request, res: Response): Promise<void> {
  try {
    await KnowledgeEntry.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Entry removed' });
  } catch { res.status(500).json({ error: 'Failed to remove entry' }); }
}

export async function getPublicKnowledge(_req: Request, res: Response): Promise<void> {
  try {
    const entries = await KnowledgeEntry.find({ isActive: true }).lean();
    res.json({ entries });
  } catch { res.status(500).json({ error: 'Failed to fetch knowledge' }); }
}
