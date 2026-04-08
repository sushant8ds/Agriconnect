import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

interface Booking {
  _id: string;
  service?: { title: string };
  status: string;
  scheduledAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: '#f4a261',
  confirmed: '#2d6a4f',
  completed: '#52b788',
  cancelled: '#e63946',
};

export default function BookingsPage() {
  const { t } = useTranslation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    api.get('/api/bookings', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => setBookings(Array.isArray(r.data) ? r.data : []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2 style={{ color: '#2d6a4f' }}>{t('bookings.title', 'My Bookings')}</h2>
      {bookings.length === 0 && <p style={{ color: '#888' }}>No bookings yet. Go to Services to book one.</p>}
      <div style={styles.list}>
        {bookings.map(b => (
          <div key={b._id} style={styles.card}>
            <div style={styles.row}>
              <span style={styles.serviceName}>{b.service?.title ?? 'Service'}</span>
              <span style={{ ...styles.badge, background: STATUS_COLORS[b.status] ?? '#ccc' }}>{b.status}</span>
            </div>
            <p style={styles.date}>📅 {new Date(b.scheduledAt).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  list: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)' },
  row: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontWeight: 600, fontSize: 16 },
  badge: { color: '#fff', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  date: { color: '#888', marginTop: 8, fontSize: 13 },
};
