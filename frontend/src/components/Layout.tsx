import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';

interface Props { setAuth: (v: boolean) => void }

export default function Layout({ setAuth }: Props) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const logout = () => {
    localStorage.removeItem('token');
    setAuth(false);
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--surface-2)' }}>
      {/* ── Nav ───────────────────────────────────────────── */}
      <header style={navStyle}>
        <div style={navInner}>
          {/* Logo */}
          <Link to="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={logoMark}>🎙️</div>
            <span style={{ fontWeight: 800, fontSize: 17, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              InterviewAI
            </span>
          </Link>

          {/* Links */}
          <nav style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <NavLink to="/" active={pathname === '/'}>Dashboard</NavLink>
            <button onClick={logout} className="btn-ghost" style={{ fontSize: 13, padding: '6px 14px' }}>
              Sign out
            </button>
          </nav>
        </div>
      </header>

      <main style={{ paddingTop: 64 }}>
        <Outlet />
      </main>
    </div>
  );
}

function NavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link to={to} style={{
      textDecoration: 'none',
      padding: '6px 14px',
      borderRadius: 8,
      fontSize: 14,
      fontWeight: active ? 600 : 400,
      color: active ? '#6366f1' : '#475569',
      background: active ? '#e0e7ff' : 'transparent',
      transition: 'all .15s',
    }}>
      {children}
    </Link>
  );
}

const navStyle: React.CSSProperties = {
  position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid #e2e8f0',
  height: 64,
  display: 'flex', alignItems: 'center',
};
const navInner: React.CSSProperties = {
  width: '100%', maxWidth: 1200,
  margin: '0 auto', padding: '0 24px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const logoMark: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 10,
  background: 'linear-gradient(135deg,#6366f1,#06b6d4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18,
};
