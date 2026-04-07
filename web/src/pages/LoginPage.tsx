import React, { useState } from 'react';
import api from '../api/axios';
import SplashAnimation from '../components/SplashAnimation';

type Role = 'Farmer' | 'Service_Provider' | 'Admin';
type Screen = 'login' | 'register' | 'verify' | 'forgot' | 'reset';

const ROLES: { value: Role; icon: string; label: string; color: string }[] = [
  { value: 'Farmer',           icon: '🧑‍🌾', label: 'Farmer',           color: '#2d6a4f' },
  { value: 'Service_Provider', icon: '🛠️',  label: 'Service Provider', color: '#e76f51' },
  { value: 'Admin',            icon: '⚙️',  label: 'Admin',            color: '#457b9d' },
];

export default function LoginPage() {
  const [splashDone, setSplashDone] = useState(true); // Skip splash in production
  const [screen, setScreen] = useState<Screen>('login');
  const [role, setRole] = useState<Role>('Farmer');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function reset(s: Screen) {
    setScreen(s); setError(''); setSuccess('');
    setOtp(''); setDevOtp(''); setPassword(''); setConfirmPassword(''); setNewPassword('');
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/login', { phone, password });
      localStorage.clear();
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      const r = res.data.user?.role;
      if (r === 'Service_Provider') window.location.replace('/provider');
      else if (r === 'Admin') window.location.replace('/admin');
      else window.location.replace('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/register', { phone, password, role, name });
      setDevOtp(res.data.devOtp ?? '');
      setSuccess('OTP sent to your phone.');
      setScreen('verify');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/verify-phone', { phone, otp });
      localStorage.clear();
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      const r = res.data.user?.role;
      if (r === 'Service_Provider') window.location.replace('/provider');
      else if (r === 'Admin') window.location.replace('/admin');
      else window.location.replace('/dashboard');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Verification failed');
    } finally { setLoading(false); }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/api/auth/forgot-password', { phone });
      setDevOtp(res.data.devOtp ?? '');
      setSuccess(res.data.message);
      setScreen('reset');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to send OTP');
    } finally { setLoading(false); }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/api/auth/reset-password', { phone, otp, newPassword });
      setSuccess('Password reset! Please login.');
      reset('login');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Reset failed');
    } finally { setLoading(false); }
  }

  if (!splashDone) return <SplashAnimation onDone={() => setSplashDone(true)} />;

  const accentColor = ROLES.find(r => r.value === role)?.color ?? '#2d6a4f';

  return (
    <div style={s.page}>
      <div style={s.bgOverlay} />
      {['🌾','🌿','🍃','🌾','🌻','🌾','🍀','🌿'].map((p, i) => (
        <span key={i} style={{ ...s.particle, left: `${8+i*12}%`, animationDelay: `${i*0.5}s`, animationDuration: `${4+i*0.4}s` }}>{p}</span>
      ))}

      <div style={s.content}>
        <div style={s.header}>
          <span style={s.logo}>🌾</span>
          <h1 style={s.title}>KisanServe</h1>
          <p style={s.subtitle}>Smart Farming Platform</p>
        </div>

        <div style={s.card}>

          {/* ── LOGIN ── */}
          {screen === 'login' && (
            <form onSubmit={handleLogin} style={s.form}>
              <h2 style={s.formTitle}>Welcome back</h2>

              <label style={s.label}>Phone number</label>
              <input style={s.input} type="tel" placeholder="+91 99999 99999"
                value={phone} onChange={e => setPhone(e.target.value)} required />

              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="Enter password"
                value={password} onChange={e => setPassword(e.target.value)} required />

              {error && <p style={s.error}>{error}</p>}

              <button style={{ ...s.btn, background: accentColor }} disabled={loading}>
                {loading ? '⏳ Logging in...' : 'Login →'}
              </button>

              <div style={s.links}>
                <button type="button" style={s.link} onClick={() => reset('forgot')}>Forgot password?</button>
                <button type="button" style={s.link} onClick={() => reset('register')}>New user? Register</button>
              </div>
            </form>
          )}

          {/* ── REGISTER ── */}
          {screen === 'register' && (
            <form onSubmit={handleRegister} style={s.form}>
              <h2 style={s.formTitle}>Create account</h2>

              <label style={s.label}>Your name</label>
              <input style={s.input} type="text" placeholder="Full name"
                value={name} onChange={e => setName(e.target.value)} />

              <label style={s.label}>Phone number</label>
              <input style={s.input} type="tel" placeholder="+91 99999 99999"
                value={phone} onChange={e => setPhone(e.target.value)} required />

              <label style={s.label}>Role</label>
              <div style={s.roleGrid}>
                {ROLES.map(r => (
                  <button key={r.value} type="button"
                    style={{ ...s.roleBtn, borderColor: role === r.value ? r.color : 'rgba(255,255,255,0.15)',
                      background: role === r.value ? `${r.color}33` : 'transparent' }}
                    onClick={() => setRole(r.value)}>
                    <span>{r.icon}</span> {r.label}
                  </button>
                ))}
              </div>

              <label style={s.label}>Password</label>
              <input style={s.input} type="password" placeholder="Min 6 characters"
                value={password} onChange={e => setPassword(e.target.value)} required />

              <label style={s.label}>Confirm password</label>
              <input style={s.input} type="password" placeholder="Repeat password"
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />

              {error && <p style={s.error}>{error}</p>}

              <button style={{ ...s.btn, background: accentColor }} disabled={loading}>
                {loading ? '⏳ Sending OTP...' : 'Register & Verify →'}
              </button>

              <div style={s.links}>
                <button type="button" style={s.link} onClick={() => reset('login')}>Already have an account? Login</button>
              </div>
            </form>
          )}

          {/* ── VERIFY PHONE (registration OTP) ── */}
          {screen === 'verify' && (
            <form onSubmit={handleVerify} style={s.form}>
              <h2 style={s.formTitle}>Verify your phone</h2>
              <p style={s.hint}>Enter the OTP sent to <strong style={{ color: '#95d5b2' }}>{phone}</strong></p>
              {devOtp && <div style={s.devOtp}>Dev OTP: <strong>{devOtp}</strong></div>}
              {success && <p style={s.successMsg}>{success}</p>}

              <input style={{ ...s.input, letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
                type="number" placeholder="• • • • • •"
                value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />

              {error && <p style={s.error}>{error}</p>}

              <button style={{ ...s.btn, background: accentColor }} disabled={loading || otp.length < 4}>
                {loading ? '⏳ Verifying...' : '✓ Confirm & Login'}
              </button>

              <div style={s.links}>
                <button type="button" style={s.link} onClick={() => reset('register')}>← Back</button>
              </div>
            </form>
          )}

          {/* ── FORGOT PASSWORD ── */}
          {screen === 'forgot' && (
            <form onSubmit={handleForgot} style={s.form}>
              <h2 style={s.formTitle}>Reset password</h2>
              <p style={s.hint}>Enter your phone number and we'll send an OTP.</p>

              <label style={s.label}>Phone number</label>
              <input style={s.input} type="tel" placeholder="+91 99999 99999"
                value={phone} onChange={e => setPhone(e.target.value)} required />

              {error && <p style={s.error}>{error}</p>}

              <button style={{ ...s.btn, background: accentColor }} disabled={loading}>
                {loading ? '⏳ Sending...' : 'Send OTP →'}
              </button>

              <div style={s.links}>
                <button type="button" style={s.link} onClick={() => reset('login')}>← Back to login</button>
              </div>
            </form>
          )}

          {/* ── RESET PASSWORD ── */}
          {screen === 'reset' && (
            <form onSubmit={handleReset} style={s.form}>
              <h2 style={s.formTitle}>Set new password</h2>
              {devOtp && <div style={s.devOtp}>Dev OTP: <strong>{devOtp}</strong></div>}
              {success && <p style={s.successMsg}>{success}</p>}

              <label style={s.label}>OTP</label>
              <input style={{ ...s.input, letterSpacing: 8, textAlign: 'center', fontSize: 22 }}
                type="number" placeholder="• • • • • •"
                value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} required />

              <label style={s.label}>New password</label>
              <input style={s.input} type="password" placeholder="Min 6 characters"
                value={newPassword} onChange={e => setNewPassword(e.target.value)} required />

              {error && <p style={s.error}>{error}</p>}

              <button style={{ ...s.btn, background: accentColor }} disabled={loading || otp.length < 4}>
                {loading ? '⏳ Resetting...' : 'Reset Password →'}
              </button>

              <div style={s.links}>
                <button type="button" style={s.link} onClick={() => reset('login')}>← Back to login</button>
              </div>
            </form>
          )}

        </div>
      </div>

      <style>{`
        @keyframes particleRise {
          0%   { transform: translateY(100px) rotate(0deg); opacity:0; }
          20%  { opacity:0.2; }
          100% { transform: translateY(-120px) rotate(360deg); opacity:0; }
        }
        @keyframes titleGlow {
          0%,100% { text-shadow: 0 0 20px rgba(82,183,136,0.6); }
          50%     { text-shadow: 0 0 40px rgba(149,213,178,0.9); }
        }
        @keyframes logoFloat {
          0%,100% { transform: translateY(0) rotate(-5deg); }
          50%     { transform: translateY(-10px) rotate(5deg); }
        }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a2e1a 0%, #1b4332 50%, #0d3320 100%)',
    fontFamily: 'sans-serif', overflow: 'hidden', position: 'relative',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  bgOverlay: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse at 50% 0%, rgba(82,183,136,0.15) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute', bottom: '5%', fontSize: 20, opacity: 0,
    animation: 'particleRise ease-in-out infinite', pointerEvents: 'none',
  },
  content: {
    position: 'relative', zIndex: 1, width: '100%', maxWidth: 440,
    padding: '32px 20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  header: { textAlign: 'center', marginBottom: 24 },
  logo: {
    fontSize: 56, display: 'block', marginBottom: 8,
    animation: 'logoFloat 3s ease-in-out infinite',
    filter: 'drop-shadow(0 0 16px rgba(82,183,136,0.8))',
  },
  title: { fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 4px', animation: 'titleGlow 2.5s ease-in-out infinite' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, letterSpacing: 2, margin: 0 },
  card: {
    width: '100%',
    background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)',
    borderRadius: 20, padding: '28px 28px 20px',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  formTitle: { color: '#fff', fontSize: 20, fontWeight: 700, margin: '0 0 4px' },
  label: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: -6 },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15,
    boxSizing: 'border-box', outline: 'none',
  },
  roleGrid: { display: 'flex', gap: 8 },
  roleBtn: {
    flex: 1, padding: '8px 4px', borderRadius: 8, border: '1px solid',
    color: '#fff', fontSize: 12, cursor: 'pointer', display: 'flex',
    flexDirection: 'column', alignItems: 'center', gap: 2, transition: 'all 0.15s',
  },
  btn: {
    width: '100%', padding: '12px', color: '#fff', border: 'none',
    borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
    marginTop: 4, boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  links: { display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginTop: 4 },
  link: { background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 12, padding: 0 },
  hint: { color: 'rgba(255,255,255,0.6)', fontSize: 13, margin: 0 },
  devOtp: {
    background: 'rgba(82,183,136,0.15)', borderRadius: 8, padding: '6px 10px',
    color: '#95d5b2', fontSize: 12, textAlign: 'center',
  },
  error: { color: '#ff6b6b', fontSize: 12, margin: 0 },
  successMsg: { color: '#95d5b2', fontSize: 12, margin: 0 },
};
