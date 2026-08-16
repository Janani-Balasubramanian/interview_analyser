import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';

interface Props { setAuth: (v: boolean) => void }

const TIERS = [
  { value: 'tier1', label: '🌱 Tier 1 — Fresher (0–2 years)' },
  { value: 'tier2', label: '🚀 Tier 2 — Mid-Level (2–10 years)' },
  { value: 'tier3', label: '⭐ Tier 3 — Senior (10+ years)' },
];

export default function Register({ setAuth }: Props) {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', experience_tier: 'tier1' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.register(form);
      const res = await authApi.login(form.email, form.password);
      localStorage.setItem('token', res.data.access_token);
      setAuth(true);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrap}>
      {/* Left panel */}
      <div style={brandPanel}>
        <div style={{ maxWidth: 400 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
            <span style={{ fontSize: 36 }}>🎙️</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>InterviewAI</span>
          </div>
          <h1 style={{ color: 'white', fontSize: 34, fontWeight: 800, lineHeight: 1.25, margin: '0 0 16px' }}>
            Start practising.<br />Get hired faster.
          </h1>
          <p style={{ color: 'rgba(255,255,255,.75)', fontSize: 15, lineHeight: 1.7 }}>
            Create your free account and get 4 mock interviews every month with real AI feedback.
          </p>

          {/* Steps */}
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 20 }}>
            {[
              ['1', 'Choose your domain & experience tier'],
              ['2', 'AI asks questions — you answer by voice'],
              ['3', 'Get your score + improvement tips instantly'],
            ].map(([num, text]) => (
              <div key={num} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={stepBubble}>{num}</div>
                <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 14, paddingTop: 2 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={formPanel}>
        <div style={formCard} className="fade-up">
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800, color: 'var(--text-1)' }}>Create your account</h2>
          <p style={{ margin: '0 0 28px', color: 'var(--text-2)', fontSize: 14 }}>It's free — no credit card needed</p>

          {error && <div style={errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Full name</label>
              <input className="field" placeholder="Jane Doe"
                value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div>
              <label style={labelStyle}>Email address</label>
              <input className="field" type="email" placeholder="you@example.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input className="field" type="password" placeholder="At least 6 characters"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>
            <div>
              <label style={labelStyle}>Experience level</label>
              <select className="field" value={form.experience_tier}
                onChange={e => setForm({ ...form, experience_tier: e.target.value })}>
                {TIERS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 6, width: '100%', padding: '13px' }}>
              {loading ? 'Creating account…' : 'Create Free Account →'}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-2)' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties        = { display: 'flex', minHeight: '100vh' };
const brandPanel: React.CSSProperties  = {
  flex: '0 0 48%',
  background: 'linear-gradient(145deg,#6366f1 0%,#4f46e5 40%,#06b6d4 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '48px 56px',
};
const formPanel: React.CSSProperties   = {
  flex: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '32px 24px', background: '#f8fafc',
};
const formCard: React.CSSProperties    = {
  background: 'white', borderRadius: 20, padding: '44px 40px',
  width: '100%', maxWidth: 420,
  boxShadow: '0 8px 40px rgba(99,102,241,0.12)',
  border: '1px solid #e0e7ff',
};
const stepBubble: React.CSSProperties  = {
  width: 30, height: 30, borderRadius: '50%',
  background: 'rgba(255,255,255,0.2)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 13, fontWeight: 800, color: 'white', flexShrink: 0,
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 13, fontWeight: 600,
  color: 'var(--text-2)', marginBottom: 6,
};
const errorBox: React.CSSProperties = {
  background: '#fef2f2', color: '#dc2626',
  border: '1px solid #fecaca',
  padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14,
};
