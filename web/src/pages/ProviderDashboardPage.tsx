import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface Booking {
  _id: string;
  farmer_id?: { name: string; phone: string };
  service_id?: { type: string; price: number };
  status: string;
  date: string;
  timeSlot?: string;
}

interface Earnings {
  totalEarnings: number;
  completedBookings: number;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f4a261', Accepted: '#2d6a4f', InProgress: '#4cc9f0',
  Completed: '#52b788', Cancelled: '#e63946',
};

const TYPE_LABELS: Record<string, string> = {
  Transport: 'Transport', Irrigation: 'Irrigation', FertilizerSupply: 'Fertilizer Supply',
  Labor: 'Labour', SoilTesting: 'Soil Testing', EquipmentRental: 'Equipment Rental',
};

const SERVICE_TYPES = ['Transport', 'Irrigation', 'FertilizerSupply', 'Labor', 'SoilTesting', 'EquipmentRental'];

export default function ProviderDashboardPage() {
  const [grouped, setGrouped] = useState<Record<string, Booking[]>>({});
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [tab, setTab] = useState<'overview' | 'pending' | 'active' | 'history' | 'add'>('overview');
  const [form, setForm] = useState({ description: '', type: 'Transport', price: '' });
  const [msg, setMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })();

  useEffect(() => {
    axios.get('/api/provider/bookings', { headers })
      .then(r => setGrouped(r.data ?? {}))
      .catch(() => {});
    axios.get('/api/provider/earnings', { headers })
      .then(r => setEarnings(r.data))
      .catch(() => {});
  }, []);

  const allBookings = (Object.values(grouped) as Booking[][]).flat();
  const pending = grouped['Pending'] ?? [];
  const active = [...(grouped['Accepted'] ?? []), ...(grouped['InProgress'] ?? [])];
  const history = [...(grouped['Completed'] ?? []), ...(grouped['Cancelled'] ?? [])];

  async function updateBooking(id: string, status: string) {
    try {
      await axios.patch(`/api/bookings/${id}`, { status }, { headers });
      // Refresh bookings
      const r = await axios.get('/api/provider/bookings', { headers });
      setGrouped(r.data ?? {});
      const e = await axios.get('/api/provider/earnings', { headers });
      setEarnings(e.data);
    } catch { alert('Failed to update booking'); }
  }

  async function addService() {
    if (!form.price || !form.description) return;
    try {
      await axios.post('/api/services', {
        type: form.type,
        price: Number(form.price),
        description: form.description,
        location: { lng: 77.5946, lat: 12.9716 },
      }, { headers });
      setMsg('✅ Service submitted for admin approval!');
      setForm({ description: '', type: 'Transport', price: '' });
    } catch (e: any) {
      setMsg('❌ ' + (e.response?.data?.error || 'Failed to add service'));
    }
  }

  function BookingCard({ b, showActions }: { b: Booking; showActions?: boolean }) {
    return (
      <div style={styles.bookingCard}>
        <div style={styles.bcRow}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ ...styles.pill, background: STATUS_COLORS[b.status] ?? '#ccc' }}>{b.status}</span>
              <strong style={{ fontSize: 14 }}>{TYPE_LABELS[b.service_id?.type ?? ''] ?? b.service_id?.type ?? 'Service'}</strong>
            </div>
            <p style={styles.sub}>👤 {b.farmer_id?.name || b.farmer_id?.phone || 'Farmer'}</p>
            <p style={styles.sub}>📅 {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} {b.timeSlot ? `| ${b.timeSlot}` : ''}</p>
            <p style={styles.sub}>💰 ₹{b.service_id?.price ?? '—'}</p>
          </div>
          {showActions && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {b.status === 'Pending' && <>
                <button style={styles.greenBtn} onClick={() => updateBooking(b._id, 'Accepted')}>✓ Accept</button>
                <button style={styles.redBtn} onClick={() => updateBooking(b._id, 'Cancelled')}>✗ Decline</button>
              </>}
              {b.status === 'Accepted' && (
                <button style={styles.greenBtn} onClick={() => updateBooking(b._id, 'InProgress')}>▶ Start Work</button>
              )}
              {b.status === 'InProgress' && (
                <button style={styles.greenBtn} onClick={() => updateBooking(b._id, 'Completed')}>✓ Mark Done</button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <p style={{ color: '#666', marginBottom: 20 }}>Welcome, {user.name || 'Provider'}! Manage your services and bookings.</p>

      <div style={styles.tabs}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'pending', label: `⏳ Pending (${pending.length})` },
          { key: 'active', label: `▶ Active (${active.length})` },
          { key: 'history', label: `📋 History (${history.length})` },
          { key: 'add', label: '➕ Add Service' },
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
              { icon: '📋', label: 'Total Bookings', value: allBookings.length, color: '#2d6a4f' },
              { icon: '⏳', label: 'Pending', value: pending.length, color: '#f4a261' },
              { icon: '▶', label: 'In Progress', value: active.length, color: '#4cc9f0' },
              { icon: '✅', label: 'Completed', value: grouped['Completed']?.length ?? 0, color: '#52b788' },
              { icon: '❌', label: 'Cancelled', value: grouped['Cancelled']?.length ?? 0, color: '#e63946' },
              { icon: '💰', label: 'Total Earnings', value: `₹${(earnings?.totalEarnings ?? 0).toLocaleString()}`, color: '#2d6a4f' },
            ].map(c => (
              <div key={c.label} style={styles.statCard}>
                <div style={styles.statIcon}>{c.icon}</div>
                <div style={{ ...styles.statValue, color: c.color }}>{c.value}</div>
                <div style={styles.statLabel}>{c.label}</div>
              </div>
            ))}
          </div>

          {pending.length > 0 && (
            <div style={styles.section}>
              <h3 style={styles.sectionTitle}>⏳ Needs Your Response</h3>
              {pending.slice(0, 3).map(b => <BookingCard key={b._id} b={b} showActions />)}
              {pending.length > 3 && <p style={{ color: '#888', fontSize: 13 }}>+{pending.length - 3} more pending bookings</p>}
            </div>
          )}

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📈 Booking Status Breakdown</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {Object.entries(grouped).map(([status, bks]) => bks.length > 0 && (
                <div key={status} style={{ ...styles.pill, background: STATUS_COLORS[status] ?? '#ccc', fontSize: 13, padding: '6px 14px' }}>
                  {status}: {bks.length}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'pending' && (
        <div style={{ marginTop: 8 }}>
          {pending.length === 0 ? <p style={{ color: '#888' }}>No pending bookings. All caught up!</p>
            : pending.map(b => <BookingCard key={b._id} b={b} showActions />)}
        </div>
      )}

      {tab === 'active' && (
        <div style={{ marginTop: 8 }}>
          {active.length === 0 ? <p style={{ color: '#888' }}>No active bookings right now.</p>
            : active.map(b => <BookingCard key={b._id} b={b} showActions />)}
        </div>
      )}

      {tab === 'history' && (
        <div style={{ marginTop: 8 }}>
          {history.length === 0 ? <p style={{ color: '#888' }}>No completed or cancelled bookings yet.</p>
            : history.map(b => <BookingCard key={b._id} b={b} />)}
        </div>
      )}

      {tab === 'add' && (
        <div style={styles.formCard}>
          <h3 style={{ marginTop: 0, color: '#2d6a4f' }}>Add New Service Listing</h3>
          <p style={{ color: '#888', fontSize: 13, marginBottom: 16 }}>
            New services require admin approval before they appear to farmers.
          </p>
          <label style={styles.label}>Service Type</label>
          <select style={styles.input} value={form.type} onChange={e => setForm(x => ({ ...x, type: e.target.value }))}>
            {SERVICE_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
          </select>
          <label style={styles.label}>Description</label>
          <textarea style={{ ...styles.input, height: 90, resize: 'vertical' as const }}
            placeholder="e.g. Tractor ploughing for 1 acre, deep soil preparation included"
            value={form.description} onChange={e => setForm(x => ({ ...x, description: e.target.value }))} />
          <label style={styles.label}>Price (₹)</label>
          <input style={styles.input} type="number" placeholder="e.g. 1500"
            value={form.price} onChange={e => setForm(x => ({ ...x, price: e.target.value }))} />
          <button style={{ ...styles.greenBtn, width: '100%', padding: 12, fontSize: 15, marginTop: 4 }}
            onClick={addService} disabled={!form.price || !form.description}>
            Submit for Approval
          </button>
          {msg && <p style={{ marginTop: 12, fontSize: 14, color: msg.startsWith('✅') ? '#2d6a4f' : '#e63946' }}>{msg}</p>}
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
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16 },
  sectionTitle: { margin: '0 0 14px', color: '#2d6a4f' },
  bookingCard: { background: '#fff', borderRadius: 10, padding: 16, marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' },
  bcRow: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  pill: { color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  sub: { margin: '2px 0', fontSize: 13, color: '#888' },
  greenBtn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  redBtn: { background: '#e63946', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 },
  formCard: { background: '#fff', borderRadius: 12, padding: 24, maxWidth: 500, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 },
  input: { width: '100%', padding: '10px 14px', fontSize: 14, borderRadius: 8, border: '1px solid #ccc', marginBottom: 14, boxSizing: 'border-box' as const },
};
