import React, { useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const BELGAUM = { lat: 15.8497, lng: 74.4977 };

interface Booking {
  _id: string;
  service_id?: { type: string; price: number };
  provider_id?: { name: string; phone: string };
  status: string;
  date: string;
}

interface ProviderLocation {
  lat: number;
  lng: number;
  timestamp: number;
  stale: boolean;
}

export default function GpsTrackerPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const demoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [location, setLocation] = useState<ProviderLocation | null>(null);
  const [wsStatus, setWsStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [demoMode, setDemoMode] = useState(false);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    axios.get('/api/bookings', { headers })
      .then(r => {
        const all = Array.isArray(r.data) ? r.data : [];
        setBookings(all.filter((b: Booking) => ['Accepted', 'InProgress'].includes(b.status)));
      }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    import('leaflet').then(L => {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });
      const map = L.map(mapRef.current!).setView([BELGAUM.lat, BELGAUM.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors', maxZoom: 19,
      }).addTo(map);

      L.marker([BELGAUM.lat, BELGAUM.lng]).addTo(map)
        .bindPopup('<b>📍 Belagavi (Belgaum)</b><br>Karnataka, India').openPopup();

      const providers = [
        { lat: 15.8550, lng: 74.5050, name: 'Ramesh Tractor', color: '#f4a261' },
        { lat: 15.8420, lng: 74.4850, name: 'Green Irrigation', color: '#4cc9f0' },
        { lat: 15.8600, lng: 74.4900, name: 'Kisan Labour', color: '#52b788' },
        { lat: 15.8350, lng: 74.5100, name: 'Soil Care', color: '#8338ec' },
        { lat: 15.8480, lng: 74.5200, name: 'AgriEquip', color: '#e63946' },
      ];
      providers.forEach(p => {
        const icon = L.divIcon({
          html: `<div style="background:${p.color};color:#fff;padding:3px 7px;border-radius:12px;font-size:10px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🛠️ ${p.name}</div>`,
          className: '', iconAnchor: [0, 0],
        });
        L.marker([p.lat, p.lng], { icon }).addTo(map)
          .bindPopup(`<b>${p.name}</b><br>📍 Belagavi area`);
      });
      mapInstanceRef.current = map;
    });
    return () => {
      if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; }
    };
  }, []);

  useEffect(() => {
    if (!location || !mapInstanceRef.current) return;
    import('leaflet').then(L => {
      const icon = L.divIcon({
        html: `<div style="background:${location.stale ? '#888' : '#e63946'};color:#fff;padding:8px;border-radius:50%;font-size:20px;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${location.stale ? '📍' : '🚜'}</div>`,
        className: '', iconAnchor: [20, 20],
      });
      if (markerRef.current) {
        markerRef.current.setLatLng([location.lat, location.lng]);
        markerRef.current.setIcon(icon);
      } else {
        markerRef.current = L.marker([location.lat, location.lng], { icon })
          .addTo(mapInstanceRef.current)
          .bindPopup(`<b>🚜 Provider</b><br>${location.stale ? '⚠️ Last known' : '✅ Live'}`);
      }
      mapInstanceRef.current.panTo([location.lat, location.lng]);
    });
  }, [location]);

  function startDemo() {
    setDemoMode(true);
    setWsStatus('connected');
    let step = 0;
    const path = [
      { lat: 15.8497, lng: 74.4977 }, { lat: 15.8510, lng: 74.5010 },
      { lat: 15.8530, lng: 74.5050 }, { lat: 15.8550, lng: 74.5080 },
      { lat: 15.8570, lng: 74.5100 }, { lat: 15.8560, lng: 74.5130 },
      { lat: 15.8540, lng: 74.5110 }, { lat: 15.8520, lng: 74.5090 },
      { lat: 15.8500, lng: 74.5060 }, { lat: 15.8497, lng: 74.4977 },
    ];
    demoIntervalRef.current = setInterval(() => {
      setLocation({ lat: path[step % path.length].lat, lng: path[step % path.length].lng, timestamp: Date.now(), stale: false });
      step++;
    }, 2000);
  }

  function stopDemo() {
    setDemoMode(false);
    setWsStatus('disconnected');
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    if (markerRef.current && mapInstanceRef.current) { markerRef.current.remove(); markerRef.current = null; }
    setLocation(null);
  }

  function connectWs(booking: Booking) {
    if (wsRef.current) wsRef.current.close();
    setWsStatus('connecting');
    setSelectedBooking(booking);
    const ws = new WebSocket(`ws://localhost:3000/ws/tracking/${booking._id}?token=${token}`);
    wsRef.current = ws;
    ws.onopen = () => setWsStatus('connected');
    ws.onmessage = e => {
      try {
        const d = JSON.parse(e.data);
        if (d.type === 'location') setLocation({ lat: d.lat, lng: d.lng, timestamp: d.timestamp, stale: d.stale });
      } catch {}
    };
    ws.onerror = () => setWsStatus('error');
    ws.onclose = () => setWsStatus('disconnected');
  }

  useEffect(() => () => {
    if (demoIntervalRef.current) clearInterval(demoIntervalRef.current);
    if (wsRef.current) wsRef.current.close();
  }, []);

  const statusColor = { disconnected: '#888', connecting: '#f4a261', connected: '#52b788', error: '#e63946' };
  const statusLabel = { disconnected: '⚫ Disconnected', connecting: '🟡 Connecting...', connected: '🟢 Live Tracking', error: '🔴 Error' };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#2d6a4f', margin: '0 0 12px' }}>📍 GPS Tracker</h2>
      <p style={{ color: '#666', fontSize: 13, margin: '0 0 12px' }}>Belagavi, Karnataka — Real-time provider tracking</p>

      {/* Status bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', borderRadius: 10, padding: '10px 14px', marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColor[wsStatus] }} />
        <span style={{ fontSize: 13, fontWeight: 600, color: statusColor[wsStatus] }}>{statusLabel[wsStatus]}</span>
        {location && !location.stale && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#888' }}>
            {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
          </span>
        )}
      </div>

      {/* Map — full width, tall on mobile */}
      <div style={{ borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 16px rgba(0,0,0,0.12)', marginBottom: 16 }}>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <div ref={mapRef} style={{ height: 320, width: '100%' }} />
      </div>

      {/* Demo button */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#2d6a4f', marginBottom: 6 }}>🎮 Demo Mode</div>
        <p style={{ fontSize: 12, color: '#888', margin: '0 0 10px' }}>Watch a provider move around Belagavi in real-time</p>
        {!demoMode
          ? <button style={btn.green} onClick={startDemo}>▶ Start Demo Tracking</button>
          : <button style={btn.red} onClick={stopDemo}>⏹ Stop Demo</button>
        }
      </div>

      {/* Live location card */}
      {location && (
        <div style={{ background: '#d8f3dc', borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#1b4332', marginBottom: 6 }}>
            {location.stale ? '⚠️ Last Known Location' : '📡 Live Location'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div style={locCard}>
              <div style={{ fontSize: 10, color: '#666' }}>LATITUDE</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{location.lat.toFixed(6)}</div>
            </div>
            <div style={locCard}>
              <div style={{ fontSize: 10, color: '#666' }}>LONGITUDE</div>
              <div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{location.lng.toFixed(6)}</div>
            </div>
          </div>
          <div style={{ fontSize: 11, color: '#666', marginTop: 6 }}>
            Updated: {new Date(location.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Active bookings */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#2d6a4f', marginBottom: 10 }}>📋 Active Bookings</div>
        {bookings.length === 0
          ? <p style={{ fontSize: 13, color: '#888', margin: 0 }}>No active bookings. Book a service to track the provider.</p>
          : bookings.map(b => (
            <div key={b._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.service_id?.type ?? 'Service'}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{b.provider_id?.name ?? 'Provider'} · {b.status}</div>
              </div>
              <button style={{ ...btn.green, padding: '6px 12px', fontSize: 12 }} onClick={() => connectWs(b)}>
                {selectedBooking?._id === b._id ? '📡 Tracking' : '▶ Track'}
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
}

const btn: Record<string, React.CSSProperties> = {
  green: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, width: '100%' },
  red: { background: '#e63946', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13, width: '100%' },
};

const locCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '8px 10px',
};
