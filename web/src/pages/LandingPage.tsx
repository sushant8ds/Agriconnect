import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  desc: string;
  city: string;
  country: string;
  icon: string;
}

interface PlatformStats {
  farmers: number;
  providers: number;
  activeServices: number;
  completedBookings: number;
}

function weatherIcon(desc: string): string {
  const d = desc.toLowerCase();
  if (d.includes('rain') || d.includes('drizzle')) return '🌧️';
  if (d.includes('thunder')) return '⛈️';
  if (d.includes('snow')) return '❄️';
  if (d.includes('cloud')) return '⛅';
  if (d.includes('mist') || d.includes('fog') || d.includes('haze')) return '🌫️';
  return '☀️';
}

const features = [
  { icon: '🛒', title: 'Service Marketplace', desc: 'Find transport, irrigation, labor, soil testing and more — all near you.' },
  { icon: '🌿', title: 'Crop Doctor', desc: 'Upload a photo of your crop and get an AI-powered diagnosis instantly.' },
  { icon: '📍', title: 'Live GPS Tracking', desc: 'Track your service provider in real-time as they head to your farm.' },
  { icon: '🤖', title: 'AI Farming Assistant', desc: 'Ask anything about farming — pest control, fertilizers, government schemes.' },
  { icon: '📅', title: 'Farming Calendar', desc: 'Get a personalized schedule for irrigation, fertilizing, and harvest.' },
  { icon: '📊', title: 'Price Predictions', desc: 'Know when prices are rising or falling so you book at the right time.' },
];

const steps = [
  { num: '01', title: 'Sign Up', desc: 'Register with your phone number. No passwords needed — just OTP.' },
  { num: '02', title: 'Browse Services', desc: 'Find verified providers near you filtered by price, rating, and category.' },
  { num: '03', title: 'Book & Track', desc: 'Book in seconds and track your provider live on the map.' },
  { num: '04', title: 'Rate & Grow', desc: 'Leave feedback and build your trust score for better deals.' },
];

const stats = [
  { value: '10,000+', label: 'Farmers Served' },
  { value: '2,500+', label: 'Service Providers' },
  { value: '7', label: 'Languages Supported' },
  { value: '98%', label: 'Satisfaction Rate' },
];


const testimonials = [
  { name: 'Ramesh K.', role: 'Wheat Farmer, Punjab', text: 'KisanServe helped me find a tractor rental in 10 minutes. Used to take days calling around.', avatar: '👨‍🌾' },
  { name: 'Sunita P.', role: 'Rice Farmer, Maharashtra', text: 'The Crop Doctor feature saved my entire harvest. Identified a fungal infection before it spread.', avatar: '👩‍🌾' },
  { name: 'Mohan R.', role: 'Service Provider, Karnataka', text: 'My bookings doubled after joining KisanServe. The platform handles everything for me.', avatar: '🧑‍🔧' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Fetch real weather using browser geolocation
  useEffect(() => {
    if (!navigator.geolocation) {
      fetchWeatherByCity('New Delhi');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
      () => fetchWeatherByCity('New Delhi')
    );
  }, []);

  async function fetchWeatherByCoords(lat: number, lon: number) {
    try {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=bd5e378503939ddaee76f12ad7a97608&units=metric`
      );
      setWeather({
        temp: Math.round(res.data.main.temp),
        feelsLike: Math.round(res.data.main.feels_like),
        humidity: res.data.main.humidity,
        windSpeed: Math.round(res.data.wind.speed * 3.6), // m/s to km/h
        desc: res.data.weather[0].description,
        city: res.data.name,
        country: res.data.sys.country,
        icon: weatherIcon(res.data.weather[0].description),
      });
    } catch {
      setWeather({ temp: 28, feelsLike: 30, humidity: 60, windSpeed: 12, desc: 'clear sky', city: 'Your Location', country: '', icon: '☀️' });
    } finally {
      setWeatherLoading(false);
    }
  }

  async function fetchWeatherByCity(city: string) {
    try {
      const res = await axios.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=bd5e378503939ddaee76f12ad7a97608&units=metric`
      );
      setWeather({
        temp: Math.round(res.data.main.temp),
        feelsLike: Math.round(res.data.main.feels_like),
        humidity: res.data.main.humidity,
        windSpeed: Math.round(res.data.wind.speed * 3.6),
        desc: res.data.weather[0].description,
        city: res.data.name,
        country: res.data.sys.country,
        icon: weatherIcon(res.data.weather[0].description),
      });
    } catch {
      setWeather({ temp: 28, feelsLike: 30, humidity: 60, windSpeed: 12, desc: 'clear sky', city: city, country: 'IN', icon: '☀️' });
    } finally {
      setWeatherLoading(false);
    }
  }

  // Fetch real platform stats from backend
  useEffect(() => {
    axios.get('/api/stats')
      .then(res => setPlatformStats(res.data))
      .catch(() => setPlatformStats(null));
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveTestimonial(i => (i + 1) % testimonials.length), 4000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={s.page}>
      {/* ── Navbar ── */}
      <nav style={{ ...s.nav, ...(scrolled ? s.navScrolled : {}) }}>
        <span style={s.navBrand}>🌾 KisanServe</span>
        <div style={s.navLinks}>
          <a href="#features" style={s.navLink}>Features</a>
          <a href="#how" style={s.navLink}>How It Works</a>
          <a href="#testimonials" style={s.navLink}>Stories</a>
        </div>
        <div style={s.navActions}>
          <button style={s.navLoginBtn} onClick={() => navigate('/login')}>Login</button>
          <button style={s.navCta} onClick={() => navigate('/login')}>Get Started</button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={s.hero}>
        <div style={s.heroContent}>
          <h1 style={s.heroTitle}>
            Smart Farming,<br />
            <span style={s.heroAccent}>Connected Future</span>
          </h1>
          <p style={s.heroSub}>
            Book agricultural services, diagnose crop diseases with AI, track providers live,
            and get personalized farming advice — all in 7 Indian languages.
          </p>
          <div style={s.heroBtns}>
            <button style={s.heroPrimary} onClick={() => navigate('/login')}>
              Start for Free →
            </button>
            <button style={s.heroSecondary} onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}>
              See Features
            </button>
          </div>
          <div style={s.heroLangs}>
            {['EN', 'हिं', 'ಕನ್', 'मरा', 'తె', 'தமி', 'മല'].map(l => (
              <span key={l} style={s.langPill}>{l}</span>
            ))}
          </div>
        </div>
        <div style={s.heroVisual}>
          <div style={s.heroCard}>
            <div style={s.heroCardHeader}>🌾 Today's Farm Summary</div>

            {weatherLoading ? (
              <div style={s.weatherLoading}>📍 Detecting your location...</div>
            ) : (
              <>
                <div style={s.weatherMain}>
                  <span style={s.weatherBigIcon}>{weather?.icon}</span>
                  <div>
                    <div style={s.weatherTemp}>{weather?.temp}°C</div>
                    <div style={s.weatherCity}>📍 {weather?.city}{weather?.country ? `, ${weather.country}` : ''}</div>
                    <div style={s.weatherDesc}>{weather?.desc.charAt(0).toUpperCase()}{weather?.desc.slice(1)}</div>
                  </div>
                </div>
                <div style={s.heroCardDivider} />
                <div style={s.weatherGrid}>
                  <div style={s.weatherStat}>
                    <span style={s.weatherStatIcon}>🌡️</span>
                    <span style={s.weatherStatVal}>{weather?.feelsLike}°C</span>
                    <span style={s.weatherStatLabel}>Feels Like</span>
                  </div>
                  <div style={s.weatherStat}>
                    <span style={s.weatherStatIcon}>💧</span>
                    <span style={s.weatherStatVal}>{weather?.humidity}%</span>
                    <span style={s.weatherStatLabel}>Humidity</span>
                  </div>
                  <div style={s.weatherStat}>
                    <span style={s.weatherStatIcon}>💨</span>
                    <span style={s.weatherStatVal}>{weather?.windSpeed} km/h</span>
                    <span style={s.weatherStatLabel}>Wind</span>
                  </div>
                </div>
                <div style={s.heroCardDivider} />
                <div style={s.heroCardAlert}>
                  {platformStats
                    ? `🌱 ${platformStats.activeServices} active services near you`
                    : '🌱 Connect to see services near you'}
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={s.statsBar}>
        {[
          { value: platformStats ? platformStats.farmers.toLocaleString() : '...', label: 'Farmers Registered' },
          { value: platformStats ? platformStats.providers.toLocaleString() : '...', label: 'Service Providers' },
          { value: platformStats ? platformStats.activeServices.toLocaleString() : '...', label: 'Active Listings' },
          { value: platformStats ? platformStats.completedBookings.toLocaleString() : '...', label: 'Bookings Completed' },
        ].map(st => (
          <div key={st.label} style={s.statItem}>
            <span style={s.statValue}>{st.value}</span>
            <span style={s.statLabel}>{st.label}</span>
          </div>
        ))}
      </section>

      {/* ── Features ── */}
      <section id="features" style={s.section}>
        <div style={s.sectionInner}>
          <p style={s.sectionTag}>Everything You Need</p>
          <h2 style={s.sectionTitle}>Powerful Features for Modern Farmers</h2>
          <div style={s.featureGrid}>
            {features.map(f => (
              <div key={f.title} style={s.featureCard}>
                <div style={s.featureIcon}>{f.icon}</div>
                <h3 style={s.featureTitle}>{f.title}</h3>
                <p style={s.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how" style={{ ...s.section, background: '#f0faf4' }}>
        <div style={s.sectionInner}>
          <p style={s.sectionTag}>Simple Process</p>
          <h2 style={s.sectionTitle}>Get Started in Minutes</h2>
          <div style={s.stepsGrid}>
            {steps.map(st => (
              <div key={st.num} style={s.stepCard}>
                <div style={s.stepNum}>{st.num}</div>
                <h3 style={s.stepTitle}>{st.title}</h3>
                <p style={s.stepDesc}>{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" style={s.section}>
        <div style={s.sectionInner}>
          <p style={s.sectionTag}>Farmer Stories</p>
          <h2 style={s.sectionTitle}>Trusted by Farmers Across India</h2>
          <div style={s.testimonialWrap}>
            {testimonials.map((t, i) => (
              <div key={i} style={{ ...s.testimonialCard, ...(i === activeTestimonial ? s.testimonialActive : s.testimonialInactive) }}>
                <div style={s.testimonialAvatar}>{t.avatar}</div>
                <p style={s.testimonialText}>"{t.text}"</p>
                <div style={s.testimonialName}>{t.name}</div>
                <div style={s.testimonialRole}>{t.role}</div>
              </div>
            ))}
          </div>
          <div style={s.testimonialDots}>
            {testimonials.map((_, i) => (
              <button key={i} style={{ ...s.dot, ...(i === activeTestimonial ? s.dotActive : {}) }}
                onClick={() => setActiveTestimonial(i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={s.ctaSection}>
        <h2 style={s.ctaTitle}>Ready to Transform Your Farm?</h2>
        <p style={s.ctaSub}>Join thousands of farmers already using KisanServe. Free to get started.</p>
        <button style={s.ctaBtn} onClick={() => navigate('/login')}>Get Started for Free →</button>
      </section>

      {/* ── Footer ── */}
      <footer style={s.footer}>
        <div style={s.footerBrand}>🌾 KisanServe</div>
        <div style={s.footerSub}>Smart Farming Platform · Built for India</div>
        <div style={s.footerLinks}>
          <span style={s.footerLink}>Privacy</span>
          <span style={s.footerLink}>Terms</span>
          <span style={s.footerLink}>Contact</span>
        </div>
        <div style={s.footerCopy}>© 2024 KisanServe. All rights reserved.</div>
      </footer>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-10px); }
        }
        .feature-card:hover { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(45,106,79,0.15) !important; }
        .step-card:hover { border-color: #52b788 !important; }
        a { text-decoration: none; }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#fff', color: '#1a1a2e' },

  // Navbar
  nav: {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '16px 48px', transition: 'all 0.3s ease',
    background: 'transparent',
  },
  navScrolled: {
    background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
    boxShadow: '0 2px 20px rgba(0,0,0,0.08)', padding: '12px 48px',
  },
  navBrand: { fontSize: 22, fontWeight: 800, color: '#2d6a4f', letterSpacing: -0.5 },
  navLinks: { display: 'flex', gap: 32, alignItems: 'center' },
  navLink: { color: '#444', fontSize: 15, fontWeight: 500, cursor: 'pointer', transition: 'color 0.2s' },
  navActions: { display: 'flex', gap: 12, alignItems: 'center' },
  navLoginBtn: {
    background: 'none', border: '1.5px solid #2d6a4f', color: '#2d6a4f',
    borderRadius: 10, padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },
  navCta: {
    background: '#2d6a4f', border: 'none', color: '#fff',
    borderRadius: 10, padding: '8px 20px', cursor: 'pointer', fontSize: 14, fontWeight: 600,
  },

  // Hero
  hero: {
    minHeight: '100vh', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '100px 48px 60px',
    background: 'linear-gradient(135deg, #f0faf4 0%, #e8f5e9 50%, #fff 100%)',
    gap: 40,
  },
  heroContent: { flex: 1, maxWidth: 560, animation: 'fadeUp 0.8s ease forwards' },
  heroBadge: {
    display: 'inline-block', background: '#d8f3dc', color: '#2d6a4f',
    borderRadius: 20, padding: '6px 14px', fontSize: 13, fontWeight: 600, marginBottom: 20,
  },
  heroTitle: { fontSize: 52, fontWeight: 900, lineHeight: 1.15, marginBottom: 20, color: '#1a1a2e' },
  heroAccent: { color: '#2d6a4f' },
  heroSub: { fontSize: 17, color: '#555', lineHeight: 1.7, marginBottom: 32 },
  heroBtns: { display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' },
  heroPrimary: {
    background: '#2d6a4f', color: '#fff', border: 'none',
    borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
  heroSecondary: {
    background: '#fff', color: '#2d6a4f', border: '2px solid #2d6a4f',
    borderRadius: 12, padding: '14px 28px', fontSize: 16, fontWeight: 700, cursor: 'pointer',
  },
  heroLangs: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  langPill: {
    background: '#fff', border: '1px solid #b7e4c7', color: '#2d6a4f',
    borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600,
  },
  heroVisual: { flex: 1, display: 'flex', justifyContent: 'center', animation: 'float 4s ease-in-out infinite' },
  heroCard: {
    background: '#fff', borderRadius: 20, padding: 28,
    boxShadow: '0 20px 60px rgba(45,106,79,0.15)', minWidth: 280, maxWidth: 340,
    border: '1px solid #d8f3dc',
  },
  heroCardHeader: { fontSize: 15, fontWeight: 700, color: '#2d6a4f', marginBottom: 16 },
  heroCardDivider: { height: 1, background: '#e8f5e9', margin: '12px 0' },
  heroCardAlert: {
    background: '#d8f3dc', borderRadius: 10, padding: '10px 14px',
    fontSize: 13, color: '#2d6a4f', fontWeight: 600,
  },
  weatherLoading: { color: '#888', fontSize: 14, padding: '20px 0', textAlign: 'center' as const },
  weatherMain: { display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 },
  weatherBigIcon: { fontSize: 56, lineHeight: 1 },
  weatherTemp: { fontSize: 40, fontWeight: 900, color: '#1a1a2e', lineHeight: 1 },
  weatherCity: { fontSize: 14, fontWeight: 600, color: '#2d6a4f', marginTop: 4 },
  weatherDesc: { fontSize: 13, color: '#888', marginTop: 2, textTransform: 'capitalize' as const },
  weatherGrid: { display: 'flex', justifyContent: 'space-between', gap: 8 },
  weatherStat: {
    flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    background: '#f0faf4', borderRadius: 10, padding: '10px 6px', gap: 2,
  },
  weatherStatIcon: { fontSize: 18 },
  weatherStatVal: { fontSize: 14, fontWeight: 700, color: '#1a1a2e' },
  weatherStatLabel: { fontSize: 11, color: '#888' },
  // Stats
  statsBar: {
    display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap',
    background: '#2d6a4f', padding: '40px 48px', gap: 24,
  },
  statItem: { textAlign: 'center' as const },
  statValue: { display: 'block', fontSize: 36, fontWeight: 900, color: '#fff' },
  statLabel: { display: 'block', fontSize: 14, color: 'rgba(255,255,255,0.75)', marginTop: 4 },

  // Sections
  section: { padding: '80px 48px', background: '#fff' },
  sectionInner: { maxWidth: 1100, margin: '0 auto' },
  sectionTag: { color: '#52b788', fontWeight: 700, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 10 },
  sectionTitle: { fontSize: 36, fontWeight: 800, color: '#1a1a2e', marginBottom: 48, lineHeight: 1.2 },

  // Features
  featureGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24,
  },
  featureCard: {
    background: '#fff', border: '1.5px solid #e8f5e9', borderRadius: 16,
    padding: 28, transition: 'all 0.25s ease', cursor: 'default',
    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
  },
  featureIcon: { fontSize: 36, marginBottom: 14 },
  featureTitle: { fontSize: 17, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 },
  featureDesc: { fontSize: 14, color: '#666', lineHeight: 1.6 },

  // Steps
  stepsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 24,
  },
  stepCard: {
    background: '#fff', border: '1.5px solid #d8f3dc', borderRadius: 16,
    padding: 28, transition: 'border-color 0.2s',
  },
  stepNum: {
    fontSize: 40, fontWeight: 900, color: '#b7e4c7', lineHeight: 1, marginBottom: 12,
  },
  stepTitle: { fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 },
  stepDesc: { fontSize: 14, color: '#666', lineHeight: 1.6 },

  // Testimonials
  testimonialWrap: { display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' as const },
  testimonialCard: {
    background: '#fff', border: '1.5px solid #e8f5e9', borderRadius: 20,
    padding: 32, maxWidth: 340, textAlign: 'center' as const,
    transition: 'all 0.4s ease',
  },
  testimonialActive: { boxShadow: '0 12px 40px rgba(45,106,79,0.15)', borderColor: '#52b788', transform: 'scale(1.02)' },
  testimonialInactive: { opacity: 0.6 },
  testimonialAvatar: { fontSize: 48, marginBottom: 16 },
  testimonialText: { fontSize: 15, color: '#444', lineHeight: 1.7, marginBottom: 16, fontStyle: 'italic' },
  testimonialName: { fontSize: 15, fontWeight: 700, color: '#1a1a2e' },
  testimonialRole: { fontSize: 13, color: '#888', marginTop: 4 },
  testimonialDots: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 32 },
  dot: { width: 8, height: 8, borderRadius: '50%', background: '#d8f3dc', border: 'none', cursor: 'pointer' },
  dotActive: { background: '#2d6a4f', width: 24, borderRadius: 4 },

  // CTA
  ctaSection: {
    background: 'linear-gradient(135deg, #2d6a4f, #52b788)',
    padding: '80px 48px', textAlign: 'center' as const,
  },
  ctaTitle: { fontSize: 40, fontWeight: 900, color: '#fff', marginBottom: 16 },
  ctaSub: { fontSize: 17, color: 'rgba(255,255,255,0.85)', marginBottom: 36 },
  ctaBtn: {
    background: '#fff', color: '#2d6a4f', border: 'none',
    borderRadius: 14, padding: '16px 36px', fontSize: 17, fontWeight: 800, cursor: 'pointer',
  },

  // Footer
  footer: {
    background: '#1a1a2e', padding: '40px 48px', textAlign: 'center' as const,
  },
  footerBrand: { fontSize: 22, fontWeight: 800, color: '#52b788', marginBottom: 8 },
  footerSub: { fontSize: 13, color: '#888', marginBottom: 20 },
  footerLinks: { display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 20 },
  footerLink: { color: '#888', fontSize: 13, cursor: 'pointer' },
  footerCopy: { fontSize: 12, color: '#555' },
};
