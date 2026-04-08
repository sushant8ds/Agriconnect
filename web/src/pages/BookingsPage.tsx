import React, { useEffect, useState } from 'react';
import api from '../api/axios';

interface Booking {
  _id: string;
  service_id?: { type: string; price: number; description: string };
  provider_id?: { name: string; phone: string };
  status: string;
  date: string;
  timeSlot?: string;
  createdAt?: string;
  cancellationReason?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: '#f4a261', Accepted: '#2d6a4f', InProgress: '#4cc9f0',
  Completed: '#52b788', Cancelled: '#e63946',
};

const TYPE_LABELS: Record<string, string> = {
  Transport: '🚛 Transport', Irrigation: '💧 Irrigation',
  FertilizerSupply: '🌱 Fertilizer', Labor: '👷 Labour',
  SoilTesting: '🧪 Soil Testing', EquipmentRental: '⚙️ Equipment',
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState<Record<string, string>>({});
  const [cancelling, setCancelling] = useState<Record<string, boolean>>({});
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  const fetchBookings = () => {
    api.get('/api/bookings', { headers })
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBookings();
    // Real-time WebSocket
    const wsBase = (import.meta.env.VITE_API_URL || '').replace(/^https?/, 'wss').replace(/^http/, 'ws');
    const ws = new WebSocket(`${wsBase}/ws/events?token=${token}`);
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'booking_created' || msg.type === 'booking_updated') fetchBookings();
    };
    return () => ws.close();
  }, []);

  async function cancelBooking(id: string) {
    setCancelling(c => ({ ...c, [id]: true }));
    try {
      await api.patch(`/api/bookings/${id}`, {
        status: 'Cancelled',
        cancellationReason: cancelReason[id] || 'Cancelled by farmer',
      }, { headers });
      fetchBookings();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to cancel booking');
    } finally {
      setCancelling(c => ({ ...c, [id]: false }));
    }
  }

  if (loading) return <p style={{ color: '#888', marginTop: 24 }}>Loading bookings...</p>;

  const active = bookings.filter(b => ['Pending', 'Accepted', 'InProgress'].includes(b.status));
  const past = bookings.filter(b => ['Completed', 'Cancelled'].includes(b.status));

  return (
    <div>
      <h2 style={{ color: '#2d6a4f' }}>📋 My Bookings</h2>

      {bookings.length === 0 && (
        <div style={{ background: '#f8f9fa', borderRadius: 12, padding: 24, textAlign: 'center', color: '#888' }}>
          No bookings yet. Go to Services to book one.
        </div>
      )}

      {active.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ color: '#2d6a4f', marginBottom: 12 }}>⏳ Active Bookings</h3>
          {active.map(b => <BookingCard key={b._id} b={b} onCancel={cancelBooking} cancelReason={cancelReason} setCancelReason={setCancelReason} cancelling={cancelling} />)}
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h3 style={{ color: '#666', marginBottom: 12 }}>📁 Past Bookings</h3>
          {past.map(b => <BookingCard key={b._id} b={b} onCancel={cancelBooking} cancelReason={cancelReason} setCancelReason={setCancelReason} cancelling={cancelling} />)}
        </div>
      )}
    </div>
  );
}

function BookingCard({ b, onCancel, cancelReason, setCancelReason, cancelling }: {
  b: Booking;
  onCancel: (id: string) => void;
  cancelReason: Record<string, string>;
  setCancelReason: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  cancelling: Record<string, boolean>;
}) {
  const [showCancel, setShowCancel] = useState(false);
  const canCancel = ['Pending', 'Accepted'].includes(b.status);

  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 20, marginBottom: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', borderLeft: `4px solid ${STATUS_COLORS[b.status] ?? '#ccc'}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ background: STATUS_COLORS[b.status] ?? '#ccc', color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
              {b.status}
            </span>
            <strong style={{ fontSize: 15 }}>{TYPE_LABELS[b.service_id?.type ?? ''] ?? b.service_id?.type ?? 'Service'}</strong>
          </div>
          {b.provider_id?.name && <p style={s.meta}>🛠️ Provider: {b.provider_id.name} · {b.provider_id.phone}</p>}
          <p style={s.meta}>📅 Scheduled: {new Date(b.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} {b.timeSlot ? `| ${b.timeSlot}` : ''}</p>
          {b.service_id?.price && <p style={s.meta}>💰 ₹{b.service_id.price}</p>}
          {b.createdAt && <p style={{ ...s.meta, color: '#aaa', fontSize: 11 }}>🕐 Booked: {new Date(b.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>}
          {b.cancellationReason && <p style={{ ...s.meta, color: '#e63946' }}>Reason: {b.cancellationReason}</p>}
        </div>

        {canCancel && (
          <button style={{ background: '#e63946', color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            onClick={() => setShowCancel(!showCancel)}>
            {showCancel ? '← Back' : '✗ Cancel'}
          </button>
        )}
      </div>

      {showCancel && canCancel && (
        <div style={{ marginTop: 12, background: '#fff5f5', borderRadius: 8, padding: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: 13, color: '#e63946', fontWeight: 600 }}>Cancel this booking?</p>
          <input style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' as const }}
            placeholder="Reason (optional)"
            value={cancelReason[b._id] || ''}
            onChange={e => setCancelReason(r => ({ ...r, [b._id]: e.target.value }))} />
          <button style={{ background: '#e63946', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
            onClick={() => onCancel(b._id)} disabled={cancelling[b._id]}>
            {cancelling[b._id] ? 'Cancelling...' : 'Confirm Cancel'}
          </button>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  meta: { margin: '2px 0', fontSize: 13, color: '#666' },
};
