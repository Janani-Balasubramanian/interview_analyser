import { Outlet, Link, useNavigate } from 'react-router-dom';

interface Props {
  setAuth: (v: boolean) => void;
}

export default function Layout({ setAuth }: Props) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    setAuth(false);
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>
      <header style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        padding: '12px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Link to="/" style={{ fontWeight: 700, fontSize: 18, color: '#4f46e5', textDecoration: 'none' }}>
          AI Interview Analyzer
        </Link>
        <nav style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <Link to="/" style={{ color: '#475569', textDecoration: 'none', fontSize: 14 }}>Dashboard</Link>
          <button
            onClick={logout}
            style={{
              background: 'none',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              padding: '6px 14px',
              cursor: 'pointer',
              fontSize: 14,
              color: '#64748b',
            }}
          >
            Logout
          </button>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
