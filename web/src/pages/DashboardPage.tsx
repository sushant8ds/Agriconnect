import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface Booking {
  id: string;
  service_id?: { type: string; price: number; description: string; averageRating: number };
  provider_id?: { name: string; phone: string };
  status: string;
  date: string;
  timeSlot?: string;
}

interface Alert {
  id: string;
  type: string;
  message: string;
  targetLocation: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f4a261', Accepted: '#2d6a4f', InProgress: '#4cc9f0',
  Completed: '#52b788', Cancelled: '#e63946',
};

const TYPE_LABELS: Record<string, string> = {
  Transport: 'Transport', Irrigation: 'Irrigation', FertilizerSupply: 'Fertilizer Supply',
  Labor: 'Labour', SoilTesting: 'Soil Testing', EquipmentRental: 'Equipment Rental',
};

const ALERT_ICONS: Record<string, string> = {
  weather: '🌦️', marketPrice: '💰', governmentScheme: '📢', emergency: '🚨',
};

export default function DashboardPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tab, setTab] = useState<'overview' | 'bookings' | 'alerts'>('overview');
  const [feedbackForm, setFeedbackForm] = useState<{ bookingId: string; rating: number; comment: string } | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  useEffect(() => {
    api.get('/api/bookings', { headers })
      .then(r => setBookings(Array.isArray(r.data?.bookings) ? r.data.bookings : []))
      .catch(() => {});
    api.get('/api/alerts', { headers })
      .then(r => setAlerts(r.data?.alerts ?? []))
      .catch(() => {});
  }, []);

  async function cancelBooking(id: string) {
    if (!window.confirm('Cancel this booking?')) return;
    try {
      await api.patch(`/api/bookings/${id}`, { status: 'Cancelled', cancellationReason: 'Cancelled by farmer' }, { headers });
      setBookings(b => b.map(x => x.id === id ? { ...x, status: 'Cancelled' } : x));
    } catch (e: any) { alert(e.response?.data?.error || 'Failed to cancel'); }
  }

  async function submitFeedback() {
    if (!feedbackForm) return;
    try {
      await api.post('/api/feedback', {
        booking_id: feedbackForm.bookingId,
        rating: feedbackForm.rating,
        comment: feedbackForm.comment,
      }, { headers });
      setFeedbackMsg('✅ Feedback submitted!');
      setTimeout(() => { setFeedbackForm(null); setFeedbackMsg(''); }, 2000);
    } catch (e: any) {
      setFeedbackMsg('❌ ' + (e.response?.data?.error || 'Failed to submit'));
    }
  }

  const pending = bookings.filter(b => b.status === 'Pending').length;
  const active = bookings.filter(b => ['Accepted', 'InProgress'].includes(b.status)).length;
  const completed = bookings.filter(b => b.status === 'Completed').length;
  const totalSpent = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + (b.service_id?.price ?? 0), 0);

  function BookingCard({ b }: { b: Booking }) {
    return (
      <div style={styles.bookingCard}>
        <div style={styles.bcRow}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ ...styles.pill, background: STATUS_COLORS[b.status] ?? '#ccc' }}>{b.status}</span>
              <strong style={{ fontSize: 14 }}>{TYPE_LABELS[b.service_id?.type ?? ''] ?? b.service_id?.type ?? 'Service'}</strong>
            </div>
            <p style={styles.sub}>🏢 {b.provider_id?.name || 'Provider'}</p>
            <p style={styles.sub}>📅 {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} {b.timeSlot ? `| ${b.timeSlot}` : ''}</p>
            <p style={styles.sub}>💰 ₹{b.service_id?.price ?? '—'}</p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {b.status === 'Pending' && (
              <button style={styles.redBtn} onClick={() => cancelBooking(b.id)}>✗ Cancel</button>
            )}
            {b.status === 'Completed' && (
              <button style={styles.greenBtn} onClick={() => setFeedbackForm({ bookingId: b.id, rating: 5, comment: '' })}>
                ⭐ Rate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: '#2d6a4f' }}>🧑‍🌾 Farmer Dashboard</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>Welcome, {user.name || 'Farmer'}! Here's your farming overview.</p>

      <div style={styles.tabs}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'bookings', label: `📋 My Bookings (${bookings.length})` },
          { key: 'alerts', label: `🔔 Alerts (${alerts.length})` },
        ].map(t => (
          <button key={t.key} style={{ ...styles.tab, ...(tab === t.key ? styles.activeTab : {}) }}
            onClick={() => setTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div>
          <div style={styles.grid4}>
            {[
              { icon: '📋', label: 'Total Bookings', value: bookings.length, color: '#2d6a4f' },
              { icon: '⏳', label: 'Pending', value: pending, color: '#f4a261' },
              { icon: '▶', label: 'In Progress', value: active, color: '#4cc9f0' },
              { icon: '✅', label: 'Completed', value: completed, color: '#52b788' },
              { icon: '💰', label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, color: '#2d6a4f' },
              { icon: '🔔', label: 'Active Alerts', value: alerts.length, color: '#e63946' },
            ].map(c => (
              <div key={c.label} style={styles.statCard}>
                <div style={styles.statIcon}>{c.icon}</div>
                <div style={{ ...styles.statValue, color: c.color }}>{c.value}</div>
                <div style={styles.statLabel}>{c.label}</div>
              </div>
            ))}
          </div>

          <div style={styles.row}>
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🚀 Quick Actions</h3>
              {[
                { href: '/services', icon: '🛒', label: 'Browse & Book Services', desc: 'Find transport, irrigation, labour and more' },
                { href: '/chatbot', icon: '🤖', label: 'Ask AI Assistant', desc: 'Get instant farming advice' },
                { href: '/crop-doctor', icon: '🌿', label: 'Diagnose Crop Disease', desc: 'Identify and treat crop problems' },
              ].map(a => (
                <a key={a.href} href={a.href} style={styles.actionCard}>
                  <span style={styles.actionIcon}>{a.icon}</span>
                  <div>
                    <div style={styles.actionLabel}>{a.label}</div>
                    <div style={styles.actionDesc}>{a.desc}</div>
                  </div>
                </a>
              ))}
            </div>

            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>🔔 Recent Alerts</h3>
              {alerts.length === 0 && <p style={{ color: '#888', fontSize: 14 }}>No active alerts for your area.</p>}
              {alerts.slice(0, 4).map(a => (
                <div key={a.id} style={{ ...styles.alertCard, borderLeft: `4px solid ${a.type === 'emergency' ? '#e63946' : a.type === 'weather' ? '#4cc9f0' : '#f4a261'}` }}>
                  <div style={styles.alertType}>{ALERT_ICONS[a.type] ?? '📢'} {a.type}</div>
                  <div style={styles.alertMsg}>{a.message}</div>
                </div>
              ))}
            </div>
          </div>

          {bookings.filter(b => b.status === 'Pending').length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>⏳ Awaiting Confirmation</h3>
              {bookings.filter(b => b.status === 'Pending').slice(0, 3).map(b => <BookingCard key={b.id} b={b} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'bookings' && (
        <div style={{ marginTop: 8 }}>
          {bookings.length === 0 && (
            <div style={styles.emptyState}>
              <p style={{ fontSize: 16, color: '#666' }}>No bookings yet.</p>
              <a href="/services" style={styles.greenBtn}>Browse Services →</a>
            </div>
          )}
          {bookings.map(b => <BookingCard key={b.id} b={b} />)}
        </div>
      )}

      {tab === 'alerts' && (
        <div style={{ marginTop: 8 }}>
          {alerts.length === 0 && <p style={{ color: '#888' }}>No active alerts for your area.</p>}
          {alerts.map(a => (
            <div key={a.id} style={{ ...styles.alertCard, borderLeft: `4px solid ${a.type === 'emergency' ? '#e63946' : a.type === 'weather' ? '#4cc9f0' : '#f4a261'}`, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ ...styles.pill, background: a.type === 'emergency' ? '#e63946' : a.type === 'weather' ? '#4cc9f0' : '#f4a261', fontSize: 11 }}>
                  {ALERT_ICONS[a.type]} {a.type}
                </span>
                <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(a.createdAt).toLocaleDateString()}</span>
              </div>
              <p style={{ margin: 0, fontSize: 14, color: '#333', lineHeight: 1.5 }}>{a.message}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#888' }}>📍 {a.targetLocation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Feedback Modal */}
      {feedbackForm && (
        <div style={styles.overlay}>
          <div style={styles.modal}>
            <h3 style={{ marginTop: 0, color: '#2d6a4f' }}>⭐ Rate this Service</h3>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} style={{ ...styles.starBtn, background: n <= feedbackForm.rating ? '#f4a261' : '#eee', color: n <= feedbackForm.rating ? '#fff' : '#666' }}
                  onClick={() => setFeedbackForm(f => f ? { ...f, rating: n } : f)}>
                  {n}⭐
                </button>
              ))}
            </div>
            <textarea style={{ ...styles.input, height: 80 }}
              placeholder="Share your experience (optional)"
              value={feedbackForm.comment}
              onChange={e => setFeedbackForm(f => f ? { ...f, comment: e.target.value } : f)} />
            {feedbackMsg && <p style={{ color: feedbackMsg.startsWith('✅') ? '#2d6a4f' : '#e63946', fontSize: 14 }}>{feedbackMsg}</p>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={{ ...styles.greenBtn, flex: 1, padding: 10 }} onClick={submitFeedback}>Submit</button>
              <button style={{ ...styles.redBtn, flex: 1, padding: 10 }} onClick={() => setFeedbackForm(null)}>Cancel</button>
            </div>
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
  grid4: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 },
  statCard: { background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', textAlign: 'center' },
  statIcon: { fontSize: 28, marginBottom: 6 },
  statValue: { fontSize: 22, fontWeight: 700 },
  statLabel: { color: '#666', fontSize: 12, marginTop: 4 },
  row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16 },
  sectionTitle: { margin: '0 0 14px', color: '#2d6a4f' },
  actionCard: { display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #f0f0f0', textDecoration: 'none', color: 'inherit' },
  actionIcon: { fontSize: 26, minWidth: 32 },
  actionLabel: { fontWeight: 600, fontSize: 14, color: '#1b4332' },
  actionDesc: { fontSize: 12, color: '#888', marginTop: 2 },
  alertCard: { background: '#f8f9fa', borderRadius: 8, padding: '10px 14px', marginBottom: 8 },
  alertType: { fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, color: '#666', marginBottom: 4 },
  alertMsg: { fontSize: 13, color: '#444', lineHeight: 1.4 },
  bookingCard: { background: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  bcRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  pill: { color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  sub: { margin: '2px 0', fontSize: 13, color: '#888' },
  greenBtn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, textDecoration: 'none', display: 'inline-block' },
  redBtn: { background: '#e63946', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  emptyState: { textAlign: 'center', padding: 40 },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modal: { background: '#fff', borderRadius: 12, padding: 24, width: 400, maxWidth: '90vw' },
  starBtn: { border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontWeight: 600 },
  input: { width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8, border: '1px solid #ccc', marginBottom: 12, boxSizing: 'border-box' as const },
};
