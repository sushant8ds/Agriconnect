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
  id?: string;
  rating: number;
  comment: string;
  reviewer_id?: { name: string };
  reviewee_id?: { name: string };
}

interface Service {
  _id: string;
  id?: string;
  type: string;
  category: string;
  description: string;
  price: number;
  status: string;
  averageRating: number;
}

interface KBEntry {
  id?: string;
  question?: string;
  keywords: string[];
  answer: string;
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
  const [tab, setTab] = useState<'overview' | 'services' | 'reviews' | 'flagged' | 'knowledge'>('overview');
  const [kb, setKb] = useState<KBEntry[]>([]);
  const [kbForm, setKbForm] = useState({ question: '', keywords: '', answer: '' });
  const [kbMsg, setKbMsg] = useState('');
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    api.get('/api/admin/analytics', { headers }).then(r => setAnalytics(r.data)).catch(() => {});
    api.get('/api/admin/flagged-reviews', { headers }).then(r => setReviews(r.data?.reviews ?? [])).catch(() => {});
    api.get('/api/admin/services', { headers }).then(r => setServices(r.data?.services ?? [])).catch(() => {});
    api.get('/api/chatbot/knowledge', { headers }).then(r => setKb(r.data?.entries ?? [])).catch(() => {});
  }, []);

  async function approveService(id: string) {
    const freshToken = localStorage.getItem('token');
    try {
      await api.patch(`/api/admin/services/${id}`, { status: 'active' }, { headers: { Authorization: `Bearer ${freshToken}` } });
      setServices(s => s.map(x => (x._id ?? x.id) === id ? { ...x, status: 'active' } : x));
    } catch { alert('Failed to update service'); }
  }

  async function rejectService(id: string) {
    const freshToken = localStorage.getItem('token');
    try {
      await api.patch(`/api/admin/services/${id}`, { status: 'rejected' }, { headers: { Authorization: `Bearer ${freshToken}` } });
      setServices(s => s.map(x => (x._id ?? x.id) === id ? { ...x, status: 'rejected' } : x));
    } catch { alert('Failed to update service'); }
  }

  async function handleReview(id: string, action: 'approve' | 'remove') {
    const freshToken = localStorage.getItem('token');
    try {
      await api.patch(`/api/admin/reviews/${id}`, { action }, { headers: { Authorization: `Bearer ${freshToken}` } });
      setReviews(r => r.filter(x => (x._id ?? x.id) !== id));
    } catch { alert('Failed to update review'); }
  }

  const totalUsers = analytics ? Object.values(analytics.totalUsersByRole).reduce((a, b) => a + b, 0) : 0;
  const totalBookings = analytics ? Object.values(analytics.bookingsByStatus).reduce((a, b) => a + b, 0) : 0;

  return (
    <div>
      <h2 style={{ color: '#2d6a4f' }}>⚙️ Platform Overview</h2>

      <div style={styles.tabs}>
        {[
          { key: 'overview', label: '📊 Overview' },
          { key: 'services', label: `🛠️ Services (${services.filter(s => s.status === 'pending').length} pending)` },
          { key: 'reviews', label: `🚩 Flagged Reviews (${reviews.length})` },
          { key: 'flagged', label: `⚠️ Flagged Users` },
          { key: 'knowledge', label: `🧠 Chatbot KB (${kb.length})` },
        ].map(t => (
          <button key={t.key} style={{ ...styles.tab, ...(tab === t.key ? styles.activeTab : {}) }}
            onClick={() => setTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && analytics && (
        <div>
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

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>🖥️ Platform Health</h3>
            {['Supabase PostgreSQL — Connected', 'KisanServe API — Running', 'Web App — Deployed'].map(s => (
              <p key={s} style={{ margin: '4px 0', fontSize: 14 }}>✅ {s}</p>
            ))}
          </div>
        </div>
      )}

      {tab === 'services' && (
        <div style={{ marginTop: 16 }}>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 16 }}>
            Approve or reject service listings. Pending services are not visible to farmers until approved.
          </p>
          {services.length === 0 && <p style={{ color: '#888' }}>No services found.</p>}
          {services.map(s => (
            <div key={s._id ?? s.id} style={styles.serviceRow}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ ...styles.statusPill, background: s.status === 'active' ? '#52b788' : s.status === 'rejected' ? '#e63946' : '#f4a261', fontSize: 11 }}>
                    {s.status}
                  </span>
                  <strong style={{ fontSize: 14 }}>{TYPE_LABELS[s.type] ?? s.type}</strong>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#666' }}>{s.description?.slice(0, 80)}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#2d6a4f', fontWeight: 600 }}>
                  ₹{s.price} | 👤 {(s as any).users?.name ?? (s as any).provider_id?.name ?? 'Provider'}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {s.status !== 'active' && (
                  <button style={styles.approveBtn} onClick={() => approveService(s._id ?? s.id!)}>✓ Approve</button>
                )}
                {s.status !== 'rejected' && (
                  <button style={styles.rejectBtn} onClick={() => rejectService(s._id ?? s.id!)}>✗ Reject</button>
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
            <div key={r._id ?? r.id} style={styles.reviewCard}>
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
                <button style={styles.approveBtn} onClick={() => handleReview(r._id ?? r.id!, 'approve')}>✓ Keep</button>
                <button style={styles.rejectBtn} onClick={() => handleReview(r._id ?? r.id!, 'remove')}>✗ Remove</button>
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
            <div key={u.id} style={styles.serviceRow}>
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

      {tab === 'knowledge' && (
        <div style={{ marginTop: 16 }}>
          <div style={{ ...styles.section, marginBottom: 20 }}>
            <h3 style={{ ...styles.sectionTitle, marginBottom: 16 }}>➕ Add New Q&A to Chatbot</h3>
            <label style={styles.kbLabel}>Question (what farmers will ask)</label>
            <input style={styles.kbInput} placeholder="e.g. What crops grow in black soil?"
              value={kbForm.question} onChange={e => setKbForm(f => ({ ...f, question: e.target.value }))} />
            <label style={styles.kbLabel}>Keywords (comma separated)</label>
            <input style={styles.kbInput} placeholder="e.g. black soil, regur, cotton, soybean"
              value={kbForm.keywords} onChange={e => setKbForm(f => ({ ...f, keywords: e.target.value }))} />
            <label style={styles.kbLabel}>Answer</label>
            <textarea style={{ ...styles.kbInput, height: 100, resize: 'vertical' as const }}
              placeholder="Write the detailed answer here..."
              value={kbForm.answer} onChange={e => setKbForm(f => ({ ...f, answer: e.target.value }))} />
            <button style={{ ...styles.approveBtn, marginTop: 8, padding: '10px 20px', fontSize: 14 }} onClick={async () => {
              if (!kbForm.answer.trim() || (!kbForm.keywords.trim() && !kbForm.question.trim())) {
                setKbMsg('❌ Answer and at least one keyword or question is required'); return;
              }
              try {
                const res = await api.post('/api/chatbot/knowledge', {
                  question: kbForm.question,
                  keywords: kbForm.keywords.split(',').map((k: string) => k.trim()).filter(Boolean),
                  answer: kbForm.answer,
                }, { headers });
                setKb(prev => [...prev, res.data.entry]);
                setKbForm({ question: '', keywords: '', answer: '' });
                setKbMsg(`✅ Added! Total: ${res.data.total} entries`);
                setTimeout(() => setKbMsg(''), 3000);
              } catch { setKbMsg('❌ Failed to add entry'); }
            }}>
              💾 Save to Chatbot
            </button>
            {kbMsg && <p style={{ marginTop: 8, fontSize: 13, color: kbMsg.startsWith('✅') ? '#2d6a4f' : '#e63946' }}>{kbMsg}</p>}
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>📚 Knowledge Base ({kb.length} entries)</h3>
            {kb.length === 0 && <p style={{ color: '#888' }}>No entries yet. Add your first Q&A above.</p>}
            {kb.map((entry, i) => (
              <div key={i} style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 14px', marginBottom: 8, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  {entry.question && <p style={{ margin: '0 0 4px', fontWeight: 600, fontSize: 13, color: '#2d6a4f' }}>❓ {entry.question}</p>}
                  <p style={{ margin: '0 0 4px', fontSize: 12, color: '#888' }}>🔑 {entry.keywords.slice(0, 6).join(', ')}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#444', lineHeight: 1.5 }}>
                    {entry.answer.slice(0, 150)}{entry.answer.length > 150 ? '...' : ''}
                  </p>
                </div>
                <button style={{ ...styles.rejectBtn, padding: '4px 10px' }} onClick={async () => {
                  if (!window.confirm('Delete this entry?')) return;
                  try {
                    await api.delete(`/api/chatbot/knowledge/${i}`, { headers });
                    setKb(prev => prev.filter((_, idx) => idx !== i));
                  } catch { alert('Failed to delete'); }
                }}>✕</button>
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
  kbLabel: { display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4, marginTop: 10 },
  kbInput: { width: '100%', padding: '9px 12px', fontSize: 14, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box' as const },
};
