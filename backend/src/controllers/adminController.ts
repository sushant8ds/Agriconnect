import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export async function getAllServices(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabase
    .from('services')
    .select('*, users!provider_id(name, phone)')
    .order('created_at', { ascending: false });
  if (error) { res.status(500).json({ error: 'Failed to fetch services' }); return; }
  res.json({ services: data });
}

export async function updateUserStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { isActive } = req.body;
  if (typeof isActive !== 'boolean') { res.status(400).json({ error: 'isActive must be a boolean' }); return; }

  const { data, error } = await supabase.from('users').update({ is_active: isActive }).eq('id', id).select().single();
  if (error || !data) { res.status(404).json({ error: 'User not found' }); return; }

  if (!isActive && data.role === 'Service_Provider') {
    await supabase.from('bookings').update({ status: 'Cancelled', cancelled_by: 'system', cancellation_reason: 'Provider account deactivated' })
      .eq('provider_id', id).in('status', ['Pending', 'Accepted']);
  }
  res.json({ user: data });
}

export async function updateServiceStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active','pending','rejected'].includes(status)) { res.status(400).json({ error: 'Invalid status' }); return; }

  const { data, error } = await supabase.from('services').update({ status }).eq('id', id).select().single();
  if (error || !data) { res.status(404).json({ error: 'Service not found' }); return; }
  res.json({ service: data });
}

export async function getFlaggedReviews(req: Request, res: Response): Promise<void> {
  const { data, error } = await supabase.from('feedback').select('*, users!reviewer_id(name), users!reviewee_id(name)').eq('is_flagged', true);
  if (error) { res.status(500).json({ error: 'Failed to fetch flagged reviews' }); return; }
  res.json({ reviews: data });
}

export async function updateReviewStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { action } = req.body;
  if (!['approve','remove'].includes(action)) { res.status(400).json({ error: 'action must be approve or remove' }); return; }

  if (action === 'remove') {
    await supabase.from('feedback').delete().eq('id', id);
    res.json({ message: 'Review removed' });
    return;
  }
  const { data } = await supabase.from('feedback').update({ is_flagged: false }).eq('id', id).select().single();
  res.json({ feedback: data });
}

export async function getAnalytics(req: Request, res: Response): Promise<void> {
  const [farmers, providers, admins, bookingsByStatus, activeListings, revenue] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'Farmer'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'Service_Provider'),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'Admin'),
    supabase.from('bookings').select('status'),
    supabase.from('services').select('category').eq('status', 'active'),
    supabase.from('bookings').select('services(price)').eq('status', 'Completed'),
  ]);

  const bookingCounts: Record<string, number> = { Pending: 0, Accepted: 0, InProgress: 0, Completed: 0, Cancelled: 0 };
  for (const b of bookingsByStatus.data ?? []) bookingCounts[b.status] = (bookingCounts[b.status] ?? 0) + 1;

  const categoryCounts: Record<string, number> = {};
  for (const s of activeListings.data ?? []) categoryCounts[s.category] = (categoryCounts[s.category] ?? 0) + 1;

  const platformRevenue = (revenue.data ?? []).reduce((sum: number, b: any) => sum + (b.services?.price ?? 0), 0);

  res.json({
    totalUsersByRole: { Farmer: farmers.count ?? 0, Service_Provider: providers.count ?? 0, Admin: admins.count ?? 0 },
    bookingsByStatus: bookingCounts,
    activeListingsByCategory: categoryCounts,
    platformRevenue,
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
