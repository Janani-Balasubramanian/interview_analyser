import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api';

interface Props {
  setAuth: (v: boolean) => void;
}

const TIERS = [
  { value: 'tier1', label: 'Tier 1 – Freshers (0–2 years)' },
  { value: 'tier2', label: 'Tier 2 – Mid-Level (2–10 years)' },
  { value: 'tier3', label: 'Tier 3 – Senior (>10 years)' },
];

export default function Register({ setAuth }: Props) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    experience_tier: 'tier1',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.register(form);
      // Auto login
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
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Create Account</h1>
        <p style={styles.subtitle}>Start practicing interviews for free</p>
        
        {error && <div style={styles.error}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            placeholder="Full Name"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            style={styles.input}
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password (min 6 chars)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={6}
            style={styles.input}
          />
          <select
            value={form.experience_tier}
            onChange={(e) => setForm({ ...form, experience_tier: e.target.value })}
            style={styles.input}
          >
            {TIERS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
        
        <p style={styles.footer}>
          Already have an account? <Link to="/login" style={styles.link}>Sign In</Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: 20,
  },
  card: {
    background: 'white',
    borderRadius: 16,
    padding: '40px 32px',
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  },
  title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b', textAlign: 'center' },
  subtitle: { margin: '8px 0 24px', color: '#64748b', textAlign: 'center', fontSize: 14 },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 16px',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    fontSize: 15,
    outline: 'none',
  },
  button: {
    marginTop: 8,
    padding: '12px',
    borderRadius: 8,
    border: 'none',
    background: '#4f46e5',
    color: 'white',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    background: '#fef2f2',
    color: '#dc2626',
    padding: '10px 14px',
    borderRadius: 8,
    marginBottom: 16,
    fontSize: 14,
  },
  footer: { marginTop: 24, textAlign: 'center', fontSize: 14, color: '#64748b' },
  link: { color: '#4f46e5', fontWeight: 600, textDecoration: 'none' },
};
