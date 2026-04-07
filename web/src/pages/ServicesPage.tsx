import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Service {
  _id: string;
  type: string;
  category: string;
  description: string;
  price: number;
  averageRating?: number;
  ratingCount?: number;
  priceTrend?: string;
  optimalBookingWindow?: string;
  providerName?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Transport: '🚛', Irrigation: '💧', FertilizerSupply: '🌱',
  Labor: '👷', SoilTesting: '🧪', EquipmentRental: '⚙️',
};

const CATEGORY_LABELS: Record<string, string> = {
  Transport: 'Transport', Irrigation: 'Irrigation',
  FertilizerSupply: 'Fertilizer Supply', Labor: 'Labour',
  SoilTesting: 'Soil Testing', EquipmentRental: 'Equipment Rental',
};

const CATEGORIES = ['All', 'Transport', 'Irrigation', 'FertilizerSupply', 'Labor', 'SoilTesting', 'EquipmentRental'];
const TIME_SLOTS = ['08:00-10:00', '10:00-12:00', '12:00-14:00', '14:00-16:00', '16:00-18:00'];

import { cacheServices, getCachedServices, isOnline, enqueueBooking } from '../store/offlineStore';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [filtered, setFiltered] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [booked, setBooked] = useState<Record<string, boolean>>({});
  const [bookingDate, setBookingDate] = useState<Record<string, string>>({});
  const [timeSlot, setTimeSlot] = useState<Record<string, string>>({});
  const [offlineMsg, setOfflineMsg] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (isOnline()) {
      axios.get('/api/services', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => {
          const list = r.data?.services ?? [];
          setServices(list);
          setFiltered(list);
          cacheServices(list); // cache for offline use
        })
        .catch(() => {
          const cached = getCachedServices();
          setServices(cached);
          setFiltered(cached);
          setOfflineMsg('⚠️ Using cached data');
        })
        .finally(() => setLoading(false));
    } else {
      const cached = getCachedServices();
      setServices(cached);
      setFiltered(cached);
      setOfflineMsg('📵 Offline — showing cached services');
      setLoading(false);
    }
  }, []);

  function filterCategory(cat: string) {
    setActiveCategory(cat);
    applyFilters(cat, searchQuery);
  }

  function applyFilters(cat: string, query: string) {
    let result = services;
    if (cat !== 'All') result = result.filter(s => s.type === cat || s.category === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(s =>
        s.description?.toLowerCase().includes(q) ||
        (CATEGORY_LABELS[s.type] ?? s.type).toLowerCase().includes(q) ||
        s.providerName?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }

  async function book(serviceId: string) {
    const token = localStorage.getItem('token');
    const date = bookingDate[serviceId] || new Date(Date.now() + 86400000).toISOString();
    const slot = timeSlot[serviceId] || '10:00-12:00';

    if (!isOnline()) {
      // Queue for later sync
      enqueueBooking({ service_id: serviceId, date, timeSlot: slot });
      setBooked(b => ({ ...b, [serviceId]: true }));
      setOfflineMsg('📵 Booking queued — will sync when online');
      return;
    }

    try {
      await axios.post('/api/bookings',
        { service_id: serviceId, date, timeSlot: slot },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBooked(b => ({ ...b, [serviceId]: true }));
    } catch (e: any) {
      alert(e.response?.data?.error || 'Booking failed');
    }
  }

  if (loading) return <p style={{ color: '#888', marginTop: 24 }}>Loading services...</p>;

  return (
    <div>
      <h2 style={{ color: '#2d6a4f' }}>🛒 Available Services</h2>

      <div style={styles.filterRow}>
        {CATEGORIES.map(cat => (
          <button key={cat}
            style={{ ...styles.filterBtn, ...(activeCategory === cat ? styles.activeFilter : {}) }}
            onClick={() => filterCategory(cat)}>
            {CATEGORY_ICONS[cat] ?? ''} {cat === 'All' ? 'All' : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {offlineMsg && (
        <div style={{ background: '#fff3cd', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#856404', fontWeight: 600 }}>
          {offlineMsg}
        </div>
      )}

      {/* Search bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, outline: 'none' }}
          placeholder="🔍 Search services (e.g. tractor, irrigation, labour...)"
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); applyFilters(activeCategory, e.target.value); }}
        />
        {searchQuery && (
          <button style={{ background: '#e63946', color: '#fff', border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer', fontSize: 13 }}
            onClick={() => { setSearchQuery(''); applyFilters(activeCategory, ''); }}>
            ✕
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <div style={styles.empty}>
          <p>No services found. Backend is seeding data — refresh in a moment.</p>
        </div>
      )}

      <div style={styles.grid}>
        {filtered.map(s => (
          <div key={s._id} style={styles.card}>
            <div style={styles.cardHeader}>
              <span style={styles.icon}>{CATEGORY_ICONS[s.type] ?? CATEGORY_ICONS[s.category] ?? '📦'}</span>
              <span style={styles.categoryBadge}>{CATEGORY_LABELS[s.type] ?? s.type}</span>
            </div>

            <h3 style={styles.title}>{s.description?.split('.')[0] ?? s.type}</h3>
            <p style={styles.desc}>{s.description}</p>

            {s.providerName && <p style={styles.meta}>🏢 {s.providerName}</p>}

            {s.averageRating !== undefined && (
              <p style={styles.meta}>
                ⭐ {Number(s.averageRating).toFixed(1)} ({s.ratingCount ?? 0} reviews)
                {s.priceTrend && (
                  <span style={{ marginLeft: 8, color: s.priceTrend === 'rising' ? '#e63946' : s.priceTrend === 'falling' ? '#2d6a4f' : '#888' }}>
                    {s.priceTrend === 'rising' ? '📈' : s.priceTrend === 'falling' ? '📉' : '➡️'} {s.priceTrend}
                  </span>
                )}
              </p>
            )}

            {s.optimalBookingWindow && (
              <p style={styles.meta}>🗓️ Best time: {s.optimalBookingWindow}</p>
            )}

            <p style={styles.price}>₹{s.price}</p>

            {!booked[s._id] && (
              <>
                <input type="date" style={styles.input}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => setBookingDate(d => ({ ...d, [s._id]: new Date(e.target.value).toISOString() }))} />
                <select style={styles.input}
                  value={timeSlot[s._id] || '10:00-12:00'}
                  onChange={e => setTimeSlot(t => ({ ...t, [s._id]: e.target.value }))}>
                  {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                </select>
              </>
            )}

            <button
              style={booked[s._id] ? styles.bookedBtn : styles.bookBtn}
              onClick={() => book(s._id)}
              disabled={booked[s._id]}>
              {booked[s._id] ? '✓ Booked Successfully' : 'Book Now'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  filterBtn: { padding: '6px 14px', borderRadius: 20, border: '1px solid #ccc', background: '#fff', cursor: 'pointer', fontSize: 13 },
  activeFilter: { background: '#2d6a4f', color: '#fff', border: '1px solid #2d6a4f' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', gap: 6 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  icon: { fontSize: 28 },
  categoryBadge: { fontSize: 11, background: '#d8f3dc', color: '#2d6a4f', padding: '2px 10px', borderRadius: 20, fontWeight: 600 },
  title: { margin: 0, fontSize: 15, color: '#1b4332', fontWeight: 600 },
  desc: { color: '#666', fontSize: 13, margin: 0, lineHeight: 1.5 },
  meta: { fontSize: 12, color: '#888', margin: 0 },
  price: { fontSize: 22, fontWeight: 700, color: '#2d6a4f', margin: '4px 0' },
  input: { width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #ccc', fontSize: 13, boxSizing: 'border-box' },
  bookBtn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginTop: 4 },
  bookedBtn: { background: '#52b788', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 600, fontSize: 14, marginTop: 4 },
  empty: { background: '#fff3cd', borderRadius: 8, padding: 16, color: '#856404' },
};
