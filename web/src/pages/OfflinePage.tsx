import React, { useEffect, useState } from 'react';
import {
  isOnline, getQueue, getCachedServices, getCachedBookings, getCachedAlerts,
  getLastSync, syncQueue, clearSyncedItems, removeFromQueue, QueuedBooking,
  cacheServices, cacheBookings, cacheAlerts,
} from '../store/offlineStore';
import api from '../api/axios';

const STATUS_COLORS: Record<string, string> = {
  pending: '#f4a261', syncing: '#4cc9f0', synced: '#52b788', failed: '#e63946',
};

export default function OfflinePage() {
  const [online, setOnline] = useState(isOnline());
  const [queue, setQueue] = useState<QueuedBooking[]>([]);
  const [cachedServices, setCachedServices] = useState(0);
  const [cachedBookings, setCachedBookings] = useState(0);
  const [cachedAlerts, setCachedAlerts] = useState(0);
  const [lastSync, setLastSyncTime] = useState<number | null>(getLastSync());
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState('');
  const [caching, setCaching] = useState(false);
  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  function refresh() {
    setQueue(getQueue());
    setCachedServices(getCachedServices().length);
    setCachedBookings(getCachedBookings().length);
    setCachedAlerts(getCachedAlerts().length);
    setLastSyncTime(getLastSync());
    setOnline(isOnline());
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 2000);
    const onOnline = () => { setOnline(true); refresh(); };
    const onOffline = () => { setOnline(false); refresh(); };
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  async function cacheNow() {
    if (!token) return;
    setCaching(true);
    try {
      const [sRes, bRes, aRes] = await Promise.allSettled([
        axios.get('/api/services', { headers }),
        axios.get('/api/bookings', { headers }),
        axios.get('/api/alerts', { headers }),
      ]);
      if (sRes.status === 'fulfilled') cacheServices(sRes.value.data?.services ?? []);
      if (bRes.status === 'fulfilled') cacheBookings(Array.isArray(bRes.value.data) ? bRes.value.data : []);
      if (aRes.status === 'fulfilled') cacheAlerts(aRes.value.data?.alerts ?? []);
      refresh();
    } finally { setCaching(false); }
  }

  async function syncNow() {
    if (!token) return;
    setSyncing(true);
    setSyncResult('');
    const result = await syncQueue(token);
    setSyncing(false);
    setSyncResult(`✅ Synced ${result.synced}, ❌ Failed ${result.failed}`);
    refresh();
  }

  const pending = queue.filter(i => i.status === 'pending').length;
  const failed = queue.filter(i => i.status === 'failed').length;
  const synced = queue.filter(i => i.status === 'synced').length;

  return (
    <div>
      <h2 style={{ color: '#2d6a4f' }}>📦 Offline Store</h2>
      <p style={{ color: '#666', marginBottom: 20 }}>
        Data is cached locally so you can browse services and queue bookings without internet. Everything syncs automatically when you come back online.
      </p>

      {/* Connection status */}
      <div style={{ ...styles.statusBanner, background: online ? '#d8f3dc' : '#ffe5e5', borderLeft: `4px solid ${online ? '#52b788' : '#e63946'}` }}>
        <span style={{ fontSize: 20 }}>{online ? '🟢' : '🔴'}</span>
        <div>
          <strong style={{ color: online ? '#1b4332' : '#c1121f' }}>
            {online ? 'Online — Connected to server' : 'Offline — Using cached data'}
          </strong>
          {lastSync && <p style={{ margin: '2px 0 0', fontSize: 12, color: '#666' }}>
            Last synced: {new Date(lastSync).toLocaleString()}
          </p>}
        </div>
      </div>

      <div style={styles.grid}>
        {/* Cache stats */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>💾 Cached Data</h3>
          {[
            { icon: '🛒', label: 'Services', count: cachedServices },
            { icon: '📋', label: 'Bookings', count: cachedBookings },
            { icon: '🔔', label: 'Alerts', count: cachedAlerts },
          ].map(c => (
            <div key={c.label} style={styles.cacheRow}>
              <span>{c.icon} {c.label}</span>
              <span style={{ ...styles.pill, background: c.count > 0 ? '#2d6a4f' : '#ccc' }}>
                {c.count} items
              </span>
            </div>
          ))}
          <button style={{ ...styles.btn, marginTop: 12, opacity: caching ? 0.7 : 1 }}
            onClick={cacheNow} disabled={caching || !online}>
            {caching ? '⏳ Caching...' : '📥 Cache Data Now'}
          </button>
          {!online && <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Go online to refresh cache</p>}
        </div>

        {/* Queue stats */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📤 Sync Queue</h3>
          {[
            { label: 'Pending', count: pending, color: '#f4a261' },
            { label: 'Failed', count: failed, color: '#e63946' },
            { label: 'Synced', count: synced, color: '#52b788' },
          ].map(s => (
            <div key={s.label} style={styles.cacheRow}>
              <span>{s.label} bookings</span>
              <span style={{ ...styles.pill, background: s.count > 0 ? s.color : '#ccc' }}>{s.count}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button style={{ ...styles.btn, flex: 1, opacity: syncing || !online ? 0.7 : 1 }}
              onClick={syncNow} disabled={syncing || !online || (pending + failed === 0)}>
              {syncing ? '🔄 Syncing...' : '🔄 Sync Now'}
            </button>
            {synced > 0 && (
              <button style={{ ...styles.greyBtn, flex: 1 }} onClick={() => { clearSyncedItems(); refresh(); }}>
                🗑️ Clear Synced
              </button>
            )}
          </div>
          {syncResult && <p style={{ fontSize: 13, marginTop: 8, color: '#2d6a4f' }}>{syncResult}</p>}
          {!online && <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>Go online to sync</p>}
        </div>
      </div>

      {/* Queue details */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>📋 Queued Bookings</h3>
        {queue.length === 0 && (
          <p style={{ color: '#888', fontSize: 14 }}>No queued bookings. When you book a service offline, it appears here.</p>
        )}
        {queue.map(item => (
          <div key={item.id} style={styles.queueItem}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ ...styles.pill, background: STATUS_COLORS[item.status] ?? '#ccc', fontSize: 11 }}>
                  {item.status}
                </span>
                <strong style={{ fontSize: 13 }}>Service ID: {item.service_id.slice(-8)}...</strong>
              </div>
              <p style={styles.sub}>📅 {new Date(item.date).toLocaleDateString()} | {item.timeSlot}</p>
              <p style={styles.sub}>⏰ Queued: {new Date(item.queuedAt).toLocaleString()}</p>
              {item.error && <p style={{ ...styles.sub, color: '#e63946' }}>❌ {item.error}</p>}
            </div>
            {(item.status === 'synced' || item.status === 'failed') && (
              <button style={styles.removeBtn} onClick={() => { removeFromQueue(item.id); refresh(); }}>✕</button>
            )}
          </div>
        ))}
      </div>

      {/* How it works */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>ℹ️ How Offline Mode Works</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            { icon: '📥', title: 'Auto-Cache', desc: 'Services, bookings, and alerts are cached when you load each page online' },
            { icon: '📵', title: 'Offline Browse', desc: 'Browse cached services and view your bookings without internet' },
            { icon: '📤', title: 'Queue Bookings', desc: 'Book services offline — they queue locally and sync when you reconnect' },
            { icon: '🔄', title: 'Auto-Sync', desc: 'Queued bookings sync automatically the moment internet is restored' },
          ].map(h => (
            <div key={h.title} style={styles.howCard}>
              <div style={{ fontSize: 24, marginBottom: 6 }}>{h.icon}</div>
              <strong style={{ fontSize: 13, color: '#1b4332' }}>{h.title}</strong>
              <p style={{ fontSize: 12, color: '#666', margin: '4px 0 0' }}>{h.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Test offline mode */}
      <div style={{ ...styles.section, background: '#fff3cd', border: '1px solid #ffc107' }}>
        <h3 style={{ ...styles.sectionTitle, color: '#856404' }}>🧪 Test Offline Mode</h3>
        <p style={{ fontSize: 13, color: '#856404', margin: 0 }}>
          To test: Open Chrome DevTools → Network tab → Select "Offline" from the throttle dropdown. Then try browsing services or booking — it will use cached data and queue the booking. Switch back to "Online" to see auto-sync.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  statusBanner: { display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', borderRadius: 10, marginBottom: 20 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 },
  section: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 16 },
  sectionTitle: { margin: '0 0 14px', color: '#2d6a4f', fontSize: 15 },
  cacheRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 14 },
  pill: { color: '#fff', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 },
  btn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  greyBtn: { background: '#888', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  queueItem: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 0', borderBottom: '1px solid #f0f0f0' },
  sub: { margin: '2px 0', fontSize: 12, color: '#888' },
  removeBtn: { background: '#eee', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', color: '#666' },
  howCard: { background: '#f8f9fa', borderRadius: 8, padding: 14 },
};
