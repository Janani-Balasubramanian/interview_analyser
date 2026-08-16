import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';

interface Props { setAuth: (v: boolean) => void }

export default function Login({ setAuth }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('token', res.data.access_token);
      setAuth(true);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={wrap}>
      {/* Left — branding panel */}
      <div style={brandPanel}>
        <div style={{ maxWidth: 420 }}>
          <div style={logoRow}>
            <span style={{ fontSize: 36 }}>🎙️</span>
            <span style={{ fontSize: 22, fontWeight: 800, color: 'white' }}>InterviewAI</span>
          </div>
          <h1 style={{ color: 'white', fontSize: 36, fontWeight: 800, lineHeight: 1.2, margin: '32px 0 16px' }}>
            Ace your next<br />interview with AI
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 16, lineHeight: 1.7 }}>
            Voice-to-voice mock interviews, instant AI scoring, and detailed feedback — all free.
          </p>

          {/* Feature bullets */}
          <div style={{ marginTop: 36, display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['🎤', 'AI speaks questions — you answer by voice'],
              ['📊', 'Instant scoring on Technical, Communication & Confidence'],
              ['🛡️', 'Proctored environment mirrors real interviews'],
              ['🎁', '4 free interviews/month + bonus unlock'],
            ].map(([icon, text]) => (
              <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={featureDot}>{icon}</div>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={formPanel}>
        <div style={formCard} className="fade-up">
          <h2 style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 800, color: 'var(--text-1)' }}>Welcome back</h2>
          <p style={{ margin: '0 0 28px', color: 'var(--text-2)', fontSize: 14 }}>Sign in to continue your preparation</p>

          {error && <div style={errorBox}>{error}</div>}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Email address</label>
              <input className="field" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>Password</label>
              <input className="field" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 6, width: '100%', padding: '13px' }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>

          <p style={{ marginTop: 24, textAlign: 'center', fontSize: 14, color: 'var(--text-2)' }}>
            New here?{' '}
            <Link to="/register" style={{ color: 'var(--brand)', fontWeight: 700, textDecoration: 'none' }}>
              Create a free account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = { display: 'flex', minHeight: '100vh' };

const brandPanel: React.CSSProperties = {
  flex: '0 0 48%',
  background: 'linear-gradient(145deg, #6366f1 0%, #4f46e5 40%, #06b6d4 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '48px 56px',
};

const formPanel: React.CSSProperties = {
  flex: 1,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: '32px 24px',
  background: '#f8fafc',
};

const formCard: React.CSSProperties = {
  background: 'white', borderRadius: 20, padding: '44px 40px',
  width: '100%', maxWidth: 420,
  boxShadow: '0 8px 40px rgba(99,102,241,0.12)',
  border: '1px solid #e0e7ff',
};

const logoRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 10,
};

const featureDot: React.CSSProperties = {
  width: 38, height: 38, borderRadius: 10,
  background: 'rgba(255,255,255,0.15)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, flexShrink: 0,
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
