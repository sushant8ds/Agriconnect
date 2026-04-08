import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';

type Role = 'Farmer' | 'Service_Provider' | 'Admin';
type Mode = 'login' | 'register' | 'forgot' | 'reset';

const ROLES: { value: Role; icon: string; label: string; color: string }[] = [
  { value: 'Farmer',           icon: '🧑‍🌾', label: 'Farmer',           color: '#2d6a4f' },
  { value: 'Service_Provider', icon: '🛠️',  label: 'Service Provider', color: '#e76f51' },
  { value: 'Admin',            icon: '⚙️',  label: 'Admin',            color: '#457b9d' },
];

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('login');
  const [selectedRole, setSelectedRole] = useState<Role>('Farmer');
  const [form, setForm] = useState({ name: '', phone: '', password: '', otp: '', newPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const role = ROLES.find(r => r.value === selectedRole)!;

  function update(patch: Partial<typeof form>) {
    setForm(f => ({ ...f, ...patch }));
    setError(''); setSuccess('');
  }

  function switchMode(m: Mode) {
    setMode(m); setError(''); setSuccess('');
    setForm({ name: '', phone: '', password: '', otp: '', newPassword: '' });
  }

  async function submit() {
    setLoading(true); setError(''); setSuccess('');
    try {
      if (mode === 'login' || mode === 'register') {
        const endpoint = mode === 'register' ? '/api/auth/register' : '/api/auth/login';
        const payload = mode === 'register'
          ? { name: form.name, phone: form.phone, password: form.password, role: selectedRole }
          : { phone: form.phone, password: form.password, role: selectedRole };

        const res = await api.post(endpoint, payload);
        localStorage.clear();
        localStorage.setItem('token', res.data.accessToken);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        const r = res.data.user?.role;
        navigate(r === 'Service_Provider' ? '/provider' : r === 'Admin' ? '/admin' : '/dashboard', { replace: true });

      } else if (mode === 'forgot') {
        const res = await api.post('/api/auth/forgot-password', { phone: form.phone });
        const data = res.data;
        if (data.otp) {
          setSuccess(`OTP generated: ${data.otp} (Twilio not configured — use this code)`);
        } else {
          setSuccess('OTP sent to your phone! Valid for 10 minutes.');
        }
        setMode('reset');

      } else if (mode === 'reset') {
        await api.post('/api/auth/reset-password', {
          phone: form.phone,
          otp: form.otp,
          newPassword: form.newPassword,
        });
        setSuccess('Password reset successfully! You can now log in.');
        setTimeout(() => switchMode('login'), 2000);
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  const isForgotReset = mode === 'forgot' || mode === 'reset';

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

        {!isForgotReset && (
          <div style={s.modeToggle}>
            <button style={{ ...s.modeBtn, ...(mode === 'login' ? s.modeBtnActive : {}) }} onClick={() => switchMode('login')}>Login</button>
            <button style={{ ...s.modeBtn, ...(mode === 'register' ? s.modeBtnActive : {}) }} onClick={() => switchMode('register')}>Register</button>
          </div>
        )}

        {isForgotReset && (
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
              {mode === 'forgot' ? '🔑 Reset your password' : '✅ Enter OTP & new password'}
            </span>
          </div>
        )}

        <div style={s.card}>
          {!isForgotReset && (
            <>
              <div style={s.roleRow}>
                {ROLES.map(r => (
                  <button key={r.value}
                    style={{ ...s.roleBtn, ...(selectedRole === r.value ? { background: r.color, borderColor: r.color, color: '#fff', transform: 'scale(1.04)' } : {}) }}
                    onClick={() => setSelectedRole(r.value)}>
                    <span style={{ fontSize: 22 }}>{r.icon}</span>
                    <span style={{ fontSize: 12, fontWeight: 700 }}>{r.label}</span>
                  </button>
                ))}
              </div>
              <div style={s.divider} />
            </>
          )}

          {mode === 'register' && (
            <input style={s.input} type="text" placeholder="Full Name"
              value={form.name} onChange={e => update({ name: e.target.value })} />
          )}

          {(mode === 'login' || mode === 'register' || mode === 'forgot' || mode === 'reset') && (
            <input style={s.input} type="tel" placeholder="Phone number (e.g. 7892489279)"
              value={form.phone} onChange={e => update({ phone: e.target.value })} />
          )}

          {mode === 'reset' && (
            <input style={s.input} type="text" placeholder="Enter 6-digit OTP"
              value={form.otp} onChange={e => update({ otp: e.target.value })}
              maxLength={6} inputMode="numeric" />
          )}

          {(mode === 'login' || mode === 'register') && (
            <div style={{ position: 'relative' }}>
              <input style={{ ...s.input, paddingRight: 44 }}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (min 6 characters)"
                value={form.password}
                onChange={e => update({ password: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && submit()} />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPassword(v => !v)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          )}

          {mode === 'reset' && (
            <div style={{ position: 'relative' }}>
              <input style={{ ...s.input, paddingRight: 44 }}
                type={showPassword ? 'text' : 'password'}
                placeholder="New password (min 6 characters)"
                value={form.newPassword}
                onChange={e => update({ newPassword: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && submit()} />
              <button type="button" style={s.eyeBtn} onClick={() => setShowPassword(v => !v)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          )}

          {error && <p style={s.error}>{error}</p>}
          {success && <p style={s.successMsg}>{success}</p>}

          <button style={{ ...s.btn, background: isForgotReset ? '#457b9d' : role.color, opacity: loading ? 0.6 : 1 }}
            onClick={submit} disabled={loading}>
            {loading ? '⏳ Please wait...' :
              mode === 'register' ? `Register as ${role.label}` :
              mode === 'login' ? `Login as ${role.label}` :
              mode === 'forgot' ? 'Send OTP' :
              'Reset Password'}
          </button>

          {mode === 'login' && (
            <p style={s.switchText}>
              <span style={{ color: '#74c0fc', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => switchMode('forgot')}>
                Forgot password?
              </span>
            </p>
          )}

          {(mode === 'forgot' || mode === 'reset') && (
            <p style={s.switchText}>
              <span style={{ color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                onClick={() => switchMode('login')}>
                ← Back to login
              </span>
            </p>
          )}

          {(mode === 'login' || mode === 'register') && (
            <p style={s.switchText}>
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <span style={{ color: role.color, cursor: 'pointer', fontWeight: 700 }}
                onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
                {mode === 'login' ? 'Register' : 'Login'}
              </span>
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes particleRise {
          0%   { transform: translateY(100px) rotate(0deg); opacity:0; }
          20%  { opacity:0.2; }
          100% { transform: translateY(-120px) rotate(360deg); opacity:0; }
        }
        @keyframes logoFloat {
          0%,100% { transform: translateY(0) rotate(-5deg); }
          50%     { transform: translateY(-10px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a2e1a 0%, #1b4332 50%, #0d3320 100%)',
    fontFamily: 'Inter, sans-serif', overflow: 'hidden', position: 'relative',
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
  header: { textAlign: 'center', marginBottom: 20 },
  logo: {
    fontSize: 56, display: 'block', marginBottom: 8,
    animation: 'logoFloat 3s ease-in-out infinite',
    filter: 'drop-shadow(0 0 16px rgba(82,183,136,0.8))',
  },
  title: { fontSize: 36, fontWeight: 900, color: '#fff', margin: '0 0 4px' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, letterSpacing: 2, margin: 0 },
  modeToggle: {
    display: 'flex', background: 'rgba(255,255,255,0.08)', borderRadius: 12,
    padding: 4, marginBottom: 20, width: '100%',
  },
  modeBtn: {
    flex: 1, padding: '10px', background: 'none', border: 'none',
    color: 'rgba(255,255,255,0.6)', borderRadius: 10, cursor: 'pointer',
    fontSize: 14, fontWeight: 600,
  },
  modeBtnActive: { background: 'rgba(255,255,255,0.15)', color: '#fff' },
  card: {
    width: '100%',
    background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)',
    borderRadius: 20, padding: '24px 24px 20px',
    border: '1px solid rgba(255,255,255,0.12)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  roleRow: { display: 'flex', gap: 8 },
  roleBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
    padding: '12px 6px', background: 'rgba(255,255,255,0.05)',
    border: '2px solid rgba(255,255,255,0.15)', borderRadius: 12,
    color: 'rgba(255,255,255,0.7)', cursor: 'pointer',
  },
  divider: { height: 1, background: 'rgba(255,255,255,0.1)' },
  input: {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.2)',
    background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 15,
    boxSizing: 'border-box', outline: 'none',
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 18, padding: 0, lineHeight: 1,
  },
  btn: {
    width: '100%', padding: '13px', color: '#fff', border: 'none',
    borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
  },
  switchText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', margin: 0 },
  error: { color: '#ff6b6b', fontSize: 13, margin: 0, textAlign: 'center' },
  successMsg: { color: '#52b788', fontSize: 13, margin: 0, textAlign: 'center', fontWeight: 600 },
};
