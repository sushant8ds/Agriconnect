import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { useTranslation } from 'react-i18next';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ServicesPage from './pages/ServicesPage';
import BookingsPage from './pages/BookingsPage';
import ChatbotPage from './pages/ChatbotPage';
import ProviderDashboardPage from './pages/ProviderDashboardPage';
import AdminPanelPage from './pages/AdminPanelPage';
import CropDoctorPage from './pages/CropDoctorPage';
import GpsTrackerPage from './pages/GpsTrackerPage';
import OfflinePage from './pages/OfflinePage';
import IrrigationAdvisorPage from './pages/IrrigationAdvisorPage';
import OfflineIndicator from './components/OfflineIndicator';
import ChatWidget from './components/ChatWidget';

function getUser() {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

// Handle 404.html redirect for SPA routing on static hosts
function SpaRedirectHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    // Check sessionStorage first (set by 404.html)
    const stored = sessionStorage.getItem('spa_redirect');
    if (stored && stored !== '/') {
      sessionStorage.removeItem('spa_redirect');
      navigate(stored, { replace: true });
      return;
    }
    // Fallback: check query param
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get('redirect');
    if (redirect && redirect !== '/') {
      navigate(redirect, { replace: true });
    }
  }, []);
  return null;
}

function getHome(role?: string) {
  if (role === 'Service_Provider') return '/provider';
  if (role === 'Admin') return '/admin';
  return '/dashboard';
}

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'mr', label: 'मराठी' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'ml', label: 'മലയാളം' },
];

// Top bar for Farmer — red logout + language dropdown
function FarmerTopBar() {
  const user = getUser();
  const { i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <div style={topBar.bar}>
      <Link to="/" style={{ ...topBar.brand, textDecoration: 'none' }}>🌾 KisanServe</Link>
      <div style={topBar.right}>
        <div style={{ position: 'relative' }}>
          <button style={topBar.langBtn} onClick={() => setLangOpen(o => !o)}>
            🌐 {currentLang.label} ▾
          </button>
          {langOpen && (
            <div style={topBar.dropdown}>
              {LANGUAGES.map(l => (
                <button key={l.code} style={{ ...topBar.dropItem, fontWeight: l.code === i18n.language ? 700 : 400 }}
                  onClick={() => { i18n.changeLanguage(l.code); setLangOpen(false); }}>
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button style={topBar.logoutBtn}
          onClick={() => { localStorage.clear(); window.location.replace('/login'); }}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

// Simple top bar for Provider/Admin
function SimpleTopBar({ title }: { title: string }) {
  const { i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  return (
    <div style={{ ...topBar.bar, background: '#1b4332' }}>
      <Link to="/" style={{ ...topBar.brand, textDecoration: 'none' }}>{title}</Link>
      <div style={topBar.right}>
        <div style={{ position: 'relative' }}>
          <button style={topBar.langBtn} onClick={() => setLangOpen(o => !o)}>
            🌐 {currentLang.label} ▾
          </button>
          {langOpen && (
            <div style={topBar.dropdown}>
              {LANGUAGES.map(l => (
                <button key={l.code} style={{ ...topBar.dropItem, fontWeight: l.code === i18n.language ? 700 : 400 }}
                  onClick={() => { i18n.changeLanguage(l.code); setLangOpen(false); }}>
                  {l.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button style={topBar.logoutBtn}
          onClick={() => { localStorage.clear(); window.location.replace('/login'); }}>
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

// Bottom nav grid for Farmer
function FarmerBottomNav() {
  const location = useLocation();
  const nav = [
    { href: '/dashboard', icon: '🏠', label: 'Home' },
    { href: '/services', icon: '🛒', label: 'Services' },
    { href: '/bookings', icon: '📋', label: 'Bookings' },
    { href: '/irrigation', icon: '💧', label: 'Irrigation' },
    { href: '/crop-doctor', icon: '🌿', label: 'Crop Doctor' },
    { href: '/gps-tracker', icon: '📍', label: 'GPS' },
    { href: '/offline', icon: '📦', label: 'Offline' },
  ];

  return (
    <div style={bottomNav.bar}>
      {nav.map(n => {
        const active = location.pathname === n.href;
        return (
          <Link key={n.href} to={n.href} style={{ ...bottomNav.item, ...(active ? bottomNav.active : {}) }}>
            <span style={bottomNav.icon}>{n.icon}</span>
            <span style={bottomNav.label}>{n.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

function PrivateRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const token = localStorage.getItem('token');
  const user = getUser();
  if (!token) return <Navigate to="/login" />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to={getHome(user.role)} />;
  return <>{children}</>;
}

function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <FarmerTopBar />
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '16px 12px 100px' }}>
        {children}
      </div>
      <ChatWidget />
      <FarmerBottomNav />
    </>
  );
}

export default function App() {
  const user = getUser();
  const role = user?.role;

  return (
    <BrowserRouter>
      <SpaRedirectHandler />
      <OfflineIndicator />
      {role === 'Service_Provider' && <SimpleTopBar title="🌾 KisanServe" />}
      {role === 'Admin' && <SimpleTopBar title="🌾 KisanServe" />}
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LandingPage />} />

        {/* Farmer routes — wrapped in FarmerLayout */}
        <Route path="/dashboard" element={<PrivateRoute roles={['Farmer']}><FarmerLayout><DashboardPage /></FarmerLayout></PrivateRoute>} />
        <Route path="/services" element={<PrivateRoute roles={['Farmer']}><FarmerLayout><ServicesPage /></FarmerLayout></PrivateRoute>} />
        <Route path="/bookings" element={<PrivateRoute roles={['Farmer']}><FarmerLayout><BookingsPage /></FarmerLayout></PrivateRoute>} />
        <Route path="/chatbot" element={<PrivateRoute roles={['Farmer', 'Service_Provider']}><FarmerLayout><ChatbotPage /></FarmerLayout></PrivateRoute>} />
        <Route path="/crop-doctor" element={<PrivateRoute roles={['Farmer']}><FarmerLayout><CropDoctorPage /></FarmerLayout></PrivateRoute>} />
        <Route path="/gps-tracker" element={<PrivateRoute roles={['Farmer']}><FarmerLayout><GpsTrackerPage /></FarmerLayout></PrivateRoute>} />
        <Route path="/offline" element={<PrivateRoute roles={['Farmer']}><FarmerLayout><OfflinePage /></FarmerLayout></PrivateRoute>} />
        <Route path="/irrigation" element={<PrivateRoute roles={['Farmer']}><FarmerLayout><IrrigationAdvisorPage /></FarmerLayout></PrivateRoute>} />

        {/* Provider & Admin — simple layout */}
        <Route path="/provider" element={<PrivateRoute roles={['Service_Provider']}><div style={{ maxWidth: 1000, margin: '24px auto', padding: '0 16px' }}><ProviderDashboardPage /></div></PrivateRoute>} />
        <Route path="/admin" element={<PrivateRoute roles={['Admin']}><div style={{ maxWidth: 1100, margin: '24px auto', padding: '0 16px' }}><AdminPanelPage /></div></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const topBar: Record<string, React.CSSProperties> = {
  bar: {
    position: 'sticky', top: 0, zIndex: 100,
    background: '#2d6a4f', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '10px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  },
  brand: { fontSize: 18, fontWeight: 700 },
  right: { display: 'flex', alignItems: 'center', gap: 8 },
  langBtn: {
    background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
    color: '#fff', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12,
  },
  dropdown: {
    position: 'absolute', top: '110%', right: 0, background: '#fff',
    borderRadius: 10, boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
    minWidth: 140, zIndex: 200, overflow: 'hidden',
  },
  dropItem: {
    display: 'block', width: '100%', padding: '10px 16px',
    background: 'none', border: 'none', textAlign: 'left',
    cursor: 'pointer', fontSize: 14, color: '#333',
  },
  logoutBtn: {
    background: '#e63946', border: 'none', color: '#fff',
    borderRadius: 8, padding: '6px 12px', cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
  },
};

const bottomNav: Record<string, React.CSSProperties> = {
  bar: {
    position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
    background: '#fff', borderTop: '1px solid #e0e0e0',
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    padding: '6px 0 8px', boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
  },
  item: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    textDecoration: 'none', color: '#888', flex: 1, padding: '4px 0',
  },
  active: { color: '#2d6a4f' },
  icon: { fontSize: 22, lineHeight: 1 },
  label: { fontSize: 10, marginTop: 2, fontWeight: 500 },
};
