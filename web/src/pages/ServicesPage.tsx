import React, { useEffect, useState, useRef } from 'react';
import api from '../api/axios';
import { cacheServices, getCachedServices, isOnline, enqueueBooking } from '../store/offlineStore';

interface Service {
  _id?: string;
  id?: string;
  type: string;
  category: string;
  description: string;
  price: number;
  averageRating?: number;
  average_rating?: number;
  ratingCount?: number;
  rating_count?: number;
  priceTrend?: string;
  price_trend?: string;
  optimalBookingWindow?: string;
  optimal_booking_window?: string;
  provider_id?: { name?: string; trust_score?: number };
  providerName?: string;
}

interface BookingForm {
  service: Service;
  date: string;
  timeSlot: string;
  farmAddress: string;
  cropType: string;
  areaAcres: string;
  specialInstructions: string;
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
const CROP_TYPES = ['Wheat', 'Rice', 'Maize', 'Cotton', 'Sugarcane', 'Soybean', 'Groundnut', 'Tomato', 'Onion', 'Potato', 'Other'];

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [filtered, setFiltered] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [booked, setBooked] = useState<Record<string, boolean>>({});
  const [offlineMsg, setOfflineMsg] = useState('');
  const [modal, setModal] = useState<BookingForm | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function loadServices() {
    if (!isOnline()) {
      const cached = getCachedServices();
      setServices(cached);
      setFiltered(cached);
      setOfflineMsg('📵 Offline — showing cached services');
      setLoading(false);
      return;
    }
    api.get('/api/services', { headers })
      .then(r => {
        const list = r.data?.services ?? [];
        setServices(list);
        applyFilters(activeCategory, searchQuery, list);
        cacheServices(list);
      })
      .catch(() => {
        const cached = getCachedServices();
        setServices(cached);
        setFiltered(cached);
        setOfflineMsg('⚠️ Using cached data');
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadServices();
    // Real-time polling every 30 seconds
    pollRef.current = setInterval(loadServices, 30000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  function applyFilters(cat: string, query: string, list?: Service[]) {
    let result = list ?? services;
    if (cat !== 'All') result = result.filter(s => s.type === cat || s.category === cat);
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(s =>
        s.description?.toLowerCase().includes(q) ||
        (CATEGORY_LABELS[s.type] ?? s.type).toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }

  function openBookingModal(s: Service) {
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    setModal({
      service: s,
      date: tomorrow,
      timeSlot: '10:00-12:00',
      farmAddress: '',
      cropType: 'Wheat',
      areaAcres: '',
      specialInstructions: '',
    });
    setBookingSuccess(false);
  }

  async function confirmBooking() {
    if (!modal) return;
    const sid = modal.service._id ?? modal.service.id ?? '';

    if (!isOnline()) {
      enqueueBooking({ service_id: sid, date: modal.date, timeSlot: modal.timeSlot });
      setBooked(b => ({ ...b, [sid]: true }));
      setOfflineMsg('📵 Booking queued — will sync when online');
      setModal(null);
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/api/bookings', {
        service_id: sid,
        date: new Date(modal.date).toISOString(),
        timeSlot: modal.timeSlot,
        farmAddress: modal.farmAddress,
        cropType: modal.cropType,
        areaAcres: modal.areaAcres ? Number(modal.areaAcres) : undefined,
        specialInstructions: modal.specialInstructions,
      }, { headers });
      setBooked(b => ({ ...b, [sid]: true }));
      setBookingSuccess(true);
      setTimeout(() => setModal(null), 2000);
    } catch (e: any) {
      alert(e.response?.data?.error || 'Booking failed');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p style={{ color: '#888', marginTop: 24 }}>Loading services...</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <h2 style={{ color: '#2d6a4f', margin: 0 }}>🛒 Available Services</h2>
        <span style={{ fontSize: 12, color: '#aaa' }}>🔄 Auto-refreshes every 30s</span>
      </div>

      <div style={styles.filterRow}>
        {CATEGORIES.map(cat => (
          <button key={cat}
            style={{ ...styles.filterBtn, ...(activeCategory === cat ? styles.activeFilter : {}) }}
            onClick={() => { setActiveCategory(cat); applyFilters(cat, searchQuery); }}>
            {CATEGORY_ICONS[cat] ?? ''} {cat === 'All' ? 'All' : CATEGORY_LABELS[cat] ?? cat}
          </button>
        ))}
      </div>

      {offlineMsg && (
        <div style={{ background: '#fff3cd', borderRadius: 8, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#856404', fontWeight: 600 }}>
          {offlineMsg}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14 }}
          placeholder="🔍 Search services..."
          value={searchQuery}
          onChange={e => { setSearchQuery(e.target.value); applyFilters(activeCategory, e.target.value); }}
        />
        {searchQuery && (
          <button style={{ background: '#e63946', color: '#fff', border: 'none', borderRadius: 10, padding: '0 14px', cursor: 'pointer' }}
            onClick={() => { setSearchQuery(''); applyFilters(activeCategory, ''); }}>✕</button>
        )}
      </div>

      {filtered.length === 0 && (
        <div style={styles.empty}><p>No services found. Try a different category or check back soon.</p></div>
      )}

      <div style={styles.grid}>
        {filtered.map(s => {
          const sid = s._id ?? s.id ?? '';
          const providerName = (s.provider_id as any)?.name ?? s.providerName;
          const trustScore = (s.provider_id as any)?.trust_score;
          return (
            <div key={sid} style={styles.card}>
              <div style={styles.cardHeader}>
                <span style={styles.icon}>{CATEGORY_ICONS[s.type] ?? '📦'}</span>
                <span style={styles.categoryBadge}>{CATEGORY_LABELS[s.type] ?? s.type}</span>
              </div>
              <h3 style={styles.title}>{s.description?.split('.')[0] ?? s.type}</h3>
              <p style={styles.desc}>{s.description}</p>
              {providerName && <p style={styles.meta}>🏢 {providerName}{trustScore != null ? ` · ⭐ ${trustScore}` : ''}</p>}
              {(s.averageRating ?? s.average_rating) != null && (
                <p style={styles.meta}>⭐ {Number(s.averageRating ?? s.average_rating).toFixed(1)} ({s.ratingCount ?? s.rating_count ?? 0} reviews)</p>
              )}
              <p style={styles.price}>₹{s.price}</p>
              <button
                style={booked[sid] ? styles.bookedBtn : styles.bookBtn}
                onClick={() => !booked[sid] && openBookingModal(s)}
                disabled={booked[sid]}>
                {booked[sid] ? '✓ Booked' : 'Book Now'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Booking Modal */}
      {modal && (
        <div style={styles.overlay} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={styles.modal}>
            {bookingSuccess ? (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: 48 }}>✅</div>
                <h3 style={{ color: '#2d6a4f', margin: '12px 0 4px' }}>Booking Confirmed!</h3>
                <p style={{ color: '#666', fontSize: 14 }}>The provider will review and accept your request.</p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: 0, color: '#1b4332' }}>
                      {CATEGORY_ICONS[modal.service.type]} {CATEGORY_LABELS[modal.service.type] ?? modal.service.type}
                    </h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, color: '#888' }}>{modal.service.description}</p>
                  </div>
                  <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
                </div>

                <div style={styles.summaryBox}>
                  <span style={{ fontWeight: 700, color: '#2d6a4f', fontSize: 18 }}>₹{modal.service.price}</span>
                  {(modal.service.provider_id as any)?.name && (
                    <span style={{ fontSize: 13, color: '#666', marginLeft: 12 }}>🏢 {(modal.service.provider_id as any).name}</span>
                  )}
                </div>

                <div style={styles.formGrid}>
                  <div>
                    <label style={styles.label}>📅 Date</label>
                    <input type="date" style={styles.input}
                      min={new Date().toISOString().split('T')[0]}
                      value={modal.date}
                      onChange={e => setModal(m => m ? { ...m, date: e.target.value } : m)} />
                  </div>
                  <div>
                    <label style={styles.label}>⏰ Time Slot</label>
                    <select style={styles.input}
                      value={modal.timeSlot}
                      onChange={e => setModal(m => m ? { ...m, timeSlot: e.target.value } : m)}>
                      {TIME_SLOTS.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                </div>

                <label style={styles.label}>🌾 Crop Type</label>
                <select style={styles.input}
                  value={modal.cropType}
                  onChange={e => setModal(m => m ? { ...m, cropType: e.target.value } : m)}>
                  {CROP_TYPES.map(c => <option key={c}>{c}</option>)}
                </select>

                <label style={styles.label}>📐 Area (in acres)</label>
                <input type="number" style={styles.input} placeholder="e.g. 2.5"
                  value={modal.areaAcres}
                  onChange={e => setModal(m => m ? { ...m, areaAcres: e.target.value } : m)} />

                <label style={styles.label}>📍 Farm Address</label>
                <input type="text" style={styles.input} placeholder="Village, Taluk, District"
                  value={modal.farmAddress}
                  onChange={e => setModal(m => m ? { ...m, farmAddress: e.target.value } : m)} />

                <label style={styles.label}>📝 Special Instructions (optional)</label>
                <textarea style={{ ...styles.input, height: 70, resize: 'vertical' as const }}
                  placeholder="Any specific requirements for the provider..."
                  value={modal.specialInstructions}
                  onChange={e => setModal(m => m ? { ...m, specialInstructions: e.target.value } : m)} />

                <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                  <button style={{ ...styles.bookBtn, flex: 1, padding: 12, fontSize: 15, opacity: submitting ? 0.7 : 1 }}
                    onClick={confirmBooking} disabled={submitting}>
                    {submitting ? 'Booking...' : '✓ Confirm Booking'}
                  </button>
                  <button style={{ ...styles.cancelBtn, flex: 0 }} onClick={() => setModal(null)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  filterRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
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
  bookBtn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', cursor: 'pointer', fontWeight: 600, fontSize: 14, marginTop: 4 },
  bookedBtn: { background: '#52b788', color: '#fff', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 600, fontSize: 14, marginTop: 4 },
  cancelBtn: { background: '#f0f0f0', color: '#444', border: 'none', borderRadius: 8, padding: '12px 18px', cursor: 'pointer', fontWeight: 600, fontSize: 14 },
  empty: { background: '#fff3cd', borderRadius: 8, padding: 16, color: '#856404' },
  overlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 },
  modal: { background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' as const, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
  summaryBox: { background: '#f0faf4', border: '1px solid #b7e4c7', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', alignItems: 'center' },
  formGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 4 },
  label: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, marginTop: 10 },
  input: { width: '100%', padding: '9px 12px', fontSize: 13, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' as const },
};
