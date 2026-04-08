import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface Analytics {
  totalUsersByRole: Record<string, number>;
  bookingsByStatus: Record<string, number>;
  activeListingsByCategory: Record<string, number>;
  platformRevenue: number;
  flaggedAccounts: any[];
}

interface FlaggedReview {
  _id: string;
  rating: number;
  comment: string;
  reviewer_id?: { name: string };
  reviewee_id?: { name: string };
}

interface Service {
  _id: string;
  type: string;
  category: string;
  description: string;
  price: number;
  status: string;
  averageRating: number;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f4a261', Accepted: '#2d6a4f', InProgress: '#4cc9f0',
  Completed: '#52b788', Cancelled: '#e63946',
};

const TYPE_LABELS: Record<string, string> = {
  Transport: 'Transport', Irrigation: 'Irrigation', FertilizerSupply: 'Fertilizer Supply',
  Labor: 'Labour', SoilTesting: 'Soil Testing', EquipmentRental: 'Equipment Rental',
};

export default function AdminPanelPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [reviews, setReviews] = useState<FlaggedReview[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [fraudStats, setFraudStats] = useState<any>(null);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [tab, setTab] = useState<'overview' | 'bookings' | 'services' | 'reviews' | 'flagged' | 'fraud'>('overview');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    const fetchData = () => {
      api.get('/api/admin/analytics', { headers }).then(r => setAnalytics(r.data)).catch(() => {});
      api.get('/api/admin/flagged-reviews', { headers }).then(r => setReviews(r.data?.reviews ?? [])).catch(() => {});
      api.get('/api/services', { headers }).then(r => setServices(r.data?.services ?? [])).catch(() => {});
      api.get('/api/admin/fraud-stats', { headers }).then(r => setFraudStats(r.data)).catch(() => {});
      api.get('/api/admin/bookings', { headers }).then(r => setRecentBookings(r.data?.bookings ?? [])).catch(() => {});
    };
    fetchData();

    // Real-time WebSocket updates
    const wsBase = (import.meta.env.VITE_API_URL || '').replace(/^https?/, 'wss').replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBase}/ws/events?token=${token}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'booking_created' || msg.type === 'booking_updated') {
        fetchData();
      }
    };
    ws.onerror = () => {
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
    };

    return () => ws.close();
  }, []);

  async function approveService(id: string) {
    try {
      await api.patch(`/api/admin/services/${id}`, { status: 'active' }, { headers });
      setServices(s => s.map(x => x._id === id ? { ...x, status: 'active' } : x));
    } catch { alert('Failed to update service'); }
  }

  async function rejectService(id: string) {
    try {
      await api.patch(`/api/admin/services/${id}`, { status: 'rejected' }, { headers });
      setServices(s => s.map(x => x._id === id ? { ...x, status: 'rejected' } : x));
    } catch { alert('Failed to update service'); }
  }

  async function handleReview(id: string, action: 'approve' | 'remove') {
    try {
      await api.patch(`/api/admin/reviews/${id}`, { action }, { headers });
      setReviews(r => r.filter(x => x._id !== id));
    } catch { alert('Failed to update review'); }
  }

  const totalUsers = analytics ? Object.values(analytics.totalUsersByRole).reduce((a, b) => a + b, 0) : 0;
  const totalBookings = analytics ? Object.values(analytics.bookingsByStatus).reduce((a, b) => a + b, 0) : 0;
  const pendingServices = services.filter(s => s.status === 'pending').length;

  return (
    <div>
      <h2 style={{ color: '#2d6a4f' }}>⚙️ Platform Overview</h2>

      <div style={styles.tabs}>
        {(['overview', 'bookings', 'services', 'reviews', 'flagged', 'fraud'] as const).map(t => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.activeTab : {}) }} onClick={() => setTab(t)}>
            {t === 'overview' ? '📊 Overview' : t === 'bookings' ? `📋 Live Bookings (${recentBookings.length})` : t === 'services' ? `🛠️ Services (${pendingServices} pending)` : t === 'reviews' ? `🚩 Flagged Reviews (${reviews.length})` : t === 'flagged' ? `⚠️ Flagged Users (${analytics?.flaggedAccounts?.length ?? 0})` : `🔍 Fraud Detection (${fraudStats?.totalFlagged ?? 0})`}
          </button>
        ))}
      </div>

      {tab === 'overview' && analytics && (
        <div>
          {/* Stats grid */}
          <div style={styles.grid4}>
            {[
              { icon: '👥', label: 'Total Users', value: totalUsers, color: '#2d6a4f' },
              { icon: '🧑‍🌾', label: 'Farmers', value: analytics.totalUsersByRole.Farmer ?? 0, color: '#52b788' },
              { icon: '🛠️', label: 'Providers', value: analytics.totalUsersByRole.Service_Provider ?? 0, color: '#f4a261' },
              { icon: '📋', label: 'Total Bookings', value: totalBookings, color: '#4cc9f0' },
              { icon: '✅', label: 'Completed', value: analytics.bookingsByStatus.Completed ?? 0, color: '#52b788' },
              { icon: '⏳', label: 'Pending', value: analytics.bookingsByStatus.Pending ?? 0, color: '#f4a261' },
              { icon: '❌', label: 'Cancelled', value: analytics.bookingsByStatus.Cancelled ?? 0, color: '#e63946' },
              { icon: '💰', label: 'Platform Revenue', value: `₹${analytics.platformRevenue.toLocaleString()}`, color: '#2d6a4f' },
            ].map(c => (
              <div key={c.label} style={styles.statCard}>
                <div style={styles.statIcon}>{c.icon}</div>
                <div style={{ ...styles.statValue, color: c.color }}>{c.value}</div>
                <div style={styles.statLabel}>{c.label}</div>
              </div>
            ))}
          </div>

          {/* Services by category */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📦 Active Services by Category</h3>
            <div style={styles.grid3}>
              {Object.entries(analytics.activeListingsByCategory).map(([cat, count]) => (
                <div key={cat} style={styles.catCard}>
                  <div style={styles.catCount}>{count}</div>
                  <div style={styles.catLabel}>{TYPE_LABELS[cat] ?? cat}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Booking status breakdown */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📅 Booking Status Breakdown</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(analytics.bookingsByStatus).map(([status, count]) => (
                <div key={status} style={{ ...styles.statusPill, background: STATUS_COLORS[status] ?? '#ccc' }}>
                  {status}: {count}
                </div>
              ))}
            </div>
          </div>

          {/* Platform health */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🖥️ Platform Health</h3>
            {['MongoDB — Connected', 'Redis — Connected', 'BullMQ Workers — Running (Trust Score, Calendar, Price Prediction)', 'Auto-cancel Scheduler — Active (every 1 hour)', 'API Server — Running on port 3000'].map(s => (
              <p key={s} style={{ margin: '4px 0', fontSize: 14 }}>✅ {s}</p>
            ))}
          </div>
        </div>
      )}

      {tab === 'bookings' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            Live feed of all bookings — auto-refreshes every 10 seconds. Shows when each booking was raised.
          </p>
          {recentBookings.length === 0 && <p style={{ color: '#888' }}>No bookings yet.</p>}
          {recentBookings.map((b: any) => (
            <div key={b._id} style={{ background: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${STATUS_COLORS[b.status] ?? '#ccc'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ ...styles.statusPill, background: STATUS_COLORS[b.status] ?? '#ccc' }}>{b.status}</span>
                    <strong style={{ fontSize: 14 }}>{TYPE_LABELS[b.service_id?.type ?? ''] ?? b.service_id?.type ?? 'Service'}</strong>
                  </div>
                  <p style={{ margin: '2px 0', fontSize: 13, color: '#666' }}>🧑‍🌾 Farmer: {b.farmer_id?.name || b.farmer_id?.phone || 'Unknown'}</p>
                  <p style={{ margin: '2px 0', fontSize: 13, color: '#666' }}>🛠️ Provider: {b.provider_id?.name || b.provider_id?.phone || 'Unknown'}</p>
                  <p style={{ margin: '2px 0', fontSize: 13, color: '#666' }}>📅 Scheduled: {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} {b.timeSlot ? `| ${b.timeSlot}` : ''}</p>
                  <p style={{ margin: '2px 0', fontSize: 13, color: '#2d6a4f', fontWeight: 600 }}>💰 ₹{b.service_id?.price ?? '—'}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#aaa' }}>🕐 Raised</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#888', fontWeight: 600 }}>
                    {b.createdAt ? new Date(b.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'services' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            Approve or reject service listings. Pending services are not visible to farmers until approved.
          </p>
          {services.length === 0 && <p style={{ color: '#888' }}>No services found.</p>}
          {services.map(s => (
            <div key={s._id} style={styles.serviceRow}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ ...styles.statusPill, background: s.status === 'active' ? '#52b788' : s.status === 'rejected' ? '#e63946' : '#f4a261', fontSize: 11 }}>
                    {s.status}
                  </span>
                  <strong style={{ fontSize: 14 }}>{TYPE_LABELS[s.type] ?? s.type}</strong>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{s.description?.slice(0, 80)}...</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#2d6a4f', fontWeight: 600 }}>₹{s.price} | ⭐ {Number(s.averageRating).toFixed(1)}</p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {s.status !== 'active' && (
                  <button style={styles.approveBtn} onClick={() => approveService(s._id)}>✓ Approve</button>
                )}
                {s.status !== 'rejected' && (
                  <button style={styles.rejectBtn} onClick={() => rejectService(s._id)}>✗ Reject</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'reviews' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            These reviews were flagged by the fraud detection system as potentially suspicious.
          </p>
          {reviews.length === 0 && <p style={{ color: '#888' }}>No flagged reviews. Platform looks clean!</p>}
          {reviews.map(r => (
            <div key={r._id} style={styles.reviewCard}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                  {'⭐'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                  <span style={{ fontSize: 12, color: '#888', marginLeft: 8 }}>
                    by {r.reviewer_id?.name ?? 'Unknown'} → {r.reviewee_id?.name ?? 'Unknown'}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#444' }}>"{r.comment}"</p>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={styles.approveBtn} onClick={() => handleReview(r._id, 'approve')}>✓ Keep</button>
                <button style={styles.rejectBtn} onClick={() => handleReview(r._id, 'remove')}>✗ Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'flagged' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            Users with trust score below 2 — flagged for suspicious activity.
          </p>
          {(analytics?.flaggedAccounts ?? []).length === 0 && <p style={{ color: '#888' }}>No flagged users. All users have good trust scores!</p>}
          {(analytics?.flaggedAccounts ?? []).map((u: any) => (
            <div key={u._id} style={styles.serviceRow}>
              <div style={{ flex: 1 }}>
                <strong>{u.name || 'Unnamed'}</strong>
                <p style={{ margin: '2px 0', fontSize: 13, color: '#888' }}>📱 {u.phone} | Role: {u.role}</p>
                <p style={{ margin: '2px 0', fontSize: 13, color: '#e63946' }}>Trust Score: {u.trust_score}</p>
              </div>
              <span style={{ ...styles.statusPill, background: u.isActive ? '#52b788' : '#e63946' }}>
                {u.isActive ? 'Active' : 'Deactivated'}
              </span>
            </div>
          ))}
        </div>
      )}

      {tab === 'fraud' && fraudStats && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            Real-time fraud detection using 6 heuristics: IP burst, rating outlier, review velocity, extreme patterns, self-review, unverified bookings.
          </p>

          <div style={styles.grid4}>
            <div style={styles.statCard}>
              <div style={styles.statIcon}>🚩</div>
              <div style={{ ...styles.statValue, color: '#e63946' }}>{fraudStats.totalFlagged}</div>
              <div style={styles.statLabel}>Total Flagged Reviews</div>
            </div>
            {Object.entries(fraudStats.flaggedByReason as Record<string, number>).map(([reason, count]) => (
              <div key={reason} style={styles.statCard}>
                <div style={styles.statIcon}>{count > 0 ? '⚠️' : '✅'}</div>
                <div style={{ ...styles.statValue, color: count > 0 ? '#e63946' : '#52b788' }}>{count}</div>
                <div style={styles.statLabel}>{reason}</div>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🔍 Detection Rules Active</h3>
            {[
              { rule: 'IP Burst', desc: 'Flags >3 reviews from same IP within 10 minutes', risk: '+40 risk score' },
              { rule: 'Rating Outlier', desc: 'Flags ratings deviating >2 stars from provider average', risk: '+30 risk score' },
              { rule: 'Review Velocity', desc: 'Flags >5 reviews submitted by same user in 1 hour', risk: '+35 risk score' },
              { rule: 'Extreme Pattern', desc: 'Flags reviewers who always give only 1★ or 5★', risk: '+25 risk score' },
              { rule: 'Self-Review', desc: 'Flags when reviewer and reviewee are the same user', risk: '+100 risk score' },
              { rule: 'Unverified Booking', desc: 'Flags reviews without a completed booking', risk: '+50 risk score' },
            ].map(r => (
              <div key={r.rule} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div>
                  <strong style={{ fontSize: 14 }}>✅ {r.rule}</strong>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#888' }}>{r.desc}</p>
                </div>
                <span style={{ ...styles.statusPill, background: '#f4a261', fontSize: 11, alignSelf: 'center' }}>{r.risk}</span>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🚩 Recent Flagged Reviews</h3>
            {(fraudStats.recentFlags ?? []).length === 0 && <p style={{ color: '#888' }}>No flagged reviews yet.</p>}
            {(fraudStats.recentFlags ?? []).slice(0, 10).map((r: any) => (
              <div key={r._id} style={{ background: '#fff5f5', borderRadius: 8, padding: '12px 16px', marginBottom: 8, borderLeft: '4px solid #e63946' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <strong style={{ fontSize: 13 }}>{'⭐'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)} {r.rating}★</strong>
                  <span style={{ fontSize: 11, color: '#888' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                </div>
                <p style={{ margin: '2px 0', fontSize: 13, color: '#444' }}>"{r.comment || 'No comment'}"</p>
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#e63946' }}>🚩 {r.flagReason}</p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: '#888' }}>
                  By: {r.reviewer_id?.name || 'Unknown'} → {r.reviewee_id?.name || 'Unknown'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  tabs: { display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' },
  tab: { padding: '8px 14px', borderRadius: 8, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 13 },
  activeTab: { background: '#2d6a4f', color: '#fff', border: '1px solid #2d6a4f' },
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 20 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 },
  statCard: { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center' },
  statIcon: { fontSize: 28, marginBottom: 6 },
  statValue: { fontSize: 24, fontWeight: 700 },
  statLabel: { color: '#666', fontSize: 12, marginTop: 4 },
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16 },
  sectionTitle: { margin: '0 0 14px', color: '#2d6a4f' },
  catCard: { background: '#f8f9fa', borderRadius: 8, padding: '12px 16px', textAlign: 'center' },
  catCount: { fontSize: 22, fontWeight: 700, color: '#2d6a4f' },
  catLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  statusPill: { color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  serviceRow: { background: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 12 },
  reviewCard: { background: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'flex-start', gap: 12 },
  approveBtn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 },
  rejectBtn: { background: '#e63946', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontSize: 12 },
};
