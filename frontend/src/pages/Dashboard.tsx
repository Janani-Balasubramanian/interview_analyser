import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, interviewApi } from '../api';
import { isMobileDevice } from '../utils/proctoring';

const DOMAINS = [
  { value: 'software_engineering',  label: 'Software Engineering',  icon: '💻', color: '#6366f1' },
  { value: 'data_analytics',        label: 'Data Analytics',         icon: '📊', color: '#06b6d4' },
  { value: 'hr_behavioral',         label: 'HR / Behavioral',        icon: '🤝', color: '#10b981' },
  { value: 'business_analytics',    label: 'Business Analytics',     icon: '📈', color: '#f59e0b' },
  { value: 'product_management',    label: 'Product Management',     icon: '🗂️', color: '#8b5cf6' },
  { value: 'marketing',             label: 'Marketing',              icon: '📣', color: '#ec4899' },
];

export default function Dashboard() {
  const [data, setData]               = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [starting, setStarting]       = useState(false);
  const [selectedDomain, setSelected] = useState('software_engineering');
  const [isMobile, setIsMobile]       = useState(false);
  const navigate = useNavigate();

  useEffect(() => { setIsMobile(isMobileDevice()); loadDashboard(); }, []);

  const loadDashboard = async () => {
    try { const r = await dashboardApi.get(); setData(r.data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const startInterview = async () => {
    if (isMobileDevice()) { alert('Please use a desktop or laptop to take interviews.'); return; }
    setStarting(true);
    try { const r = await interviewApi.start(selectedDomain); navigate(`/interview/${r.data.id}`); }
    catch (err: any) { alert(err.response?.data?.detail || 'Could not start interview'); }
    finally { setStarting(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '4px solid #e0e7ff', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      <span style={{ color: 'var(--text-2)' }}>Loading your dashboard…</span>
    </div>
  );

  const credits = data?.current_month_credits || {};
  const user    = data?.user || {};
  const progress = Math.min(100, credits.progress_to_bonus || 0);
  const domainObj = DOMAINS.find(d => d.value === selectedDomain) || DOMAINS[0];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 20px' }}>

      {/* ── Hero greeting ─────────────────────────────────── */}
      <div style={heroBox} className="fade-up">
        <div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.7)', marginBottom: 4, fontWeight: 500 }}>
            {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
          </div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: 'white' }}>
            {user.full_name ? `Hey, ${user.full_name.split(' ')[0]} 👋` : 'Welcome back 👋'}
          </h1>
          <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,.75)', fontSize: 15 }}>
            Ready to sharpen your interview skills today?
          </p>
        </div>
        <div style={heroTier}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', marginBottom: 2 }}>YOUR LEVEL</div>
          <div style={{ fontWeight: 700, color: 'white', fontSize: 15 }}>
            {user.experience_tier === 'tier1' ? '🌱 Fresher' : user.experience_tier === 'tier2' ? '🚀 Mid-Level' : '⭐ Senior'}
          </div>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────── */}
      <div style={statsGrid} className="fade-up">
        <StatCard icon="🎯" title="Interviews Left" value={`${credits.free_interviews_remaining ?? 0}`} sub="of 4 this month" accent="#6366f1" />
        <StatCard icon="🏆" title="Monthly Score" value={credits.total_score?.toFixed(0) ?? '0'} sub="Target: 250 for bonus" accent="#06b6d4" />
        <StatCard icon="📉" title="Avg Score" value={data?.average_score != null ? `${Number(data.average_score).toFixed(0)}` : '—'} sub={`${data?.total_interviews ?? 0} total interviews`} accent="#10b981" />
        <StatCard icon="🎁" title="Bonus Status" value={credits.bonus_unlocked ? 'Unlocked!' : 'Locked'} sub={credits.bonus_unlocked ? 'Extra interview available' : `${progress.toFixed(0)}% to bonus`} accent="#f59e0b" />
      </div>

      {/* ── Progress bar ──────────────────────────────────── */}
      <div className="card fade-up" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-1)' }}>🏅 Progress to Bonus Interview</span>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{credits.total_score?.toFixed(0) ?? 0} / 250 pts</span>
        </div>
        <div style={{ background: '#e0e7ff', borderRadius: 999, height: 10, overflow: 'hidden' }}>
          <div style={{
            width: `${progress}%`, height: '100%', borderRadius: 999,
            background: credits.bonus_unlocked
              ? 'linear-gradient(90deg,#10b981,#059669)'
              : 'linear-gradient(90deg,#6366f1,#06b6d4)',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
          {credits.bonus_unlocked
            ? '🎉 Bonus unlocked! You can take a 5th interview this month.'
            : `Score over 250 total points across your 4 free interviews to unlock a bonus interview.`}
        </p>
      </div>

      {/* ── Mobile warning ────────────────────────────────── */}
      {isMobile && (
        <div style={{ marginBottom: 24, padding: 16, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, color: '#9a3412' }}>
          <strong>📱 Desktop required</strong>
          <p style={{ margin: '6px 0 0', fontSize: 14 }}>Interviews use your webcam and microphone — please switch to a desktop or laptop.</p>
        </div>
      )}

      {/* ── Start interview ───────────────────────────────── */}
      <div className="card fade-up" style={{ marginBottom: 24, background: 'linear-gradient(135deg,#fafafa,#f0f4ff)', border: '1px solid #e0e7ff' }}>
        <h3 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>
          🎙️ Start a New Voice Interview
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 14, color: 'var(--text-2)' }}>
          AI will ask 5 questions. You answer by voice. Get instant feedback on every answer.
        </p>

        {/* Domain cards */}
        <div style={domainGrid}>
          {DOMAINS.map(d => (
            <button key={d.value} onClick={() => setSelected(d.value)} style={{
              ...domainBtn,
              border: `2px solid ${selectedDomain === d.value ? d.color : 'transparent'}`,
              background: selectedDomain === d.value ? `${d.color}15` : 'white',
              transform: selectedDomain === d.value ? 'scale(1.03)' : 'scale(1)',
            }}>
              <span style={{ fontSize: 22 }}>{d.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: selectedDomain === d.value ? d.color : 'var(--text-2)', marginTop: 4 }}>
                {d.label}
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <button
            onClick={startInterview}
            disabled={starting || !credits.can_start_interview || isMobile}
            style={{
              padding: '13px 32px', borderRadius: 10, border: 'none',
              background: (credits.can_start_interview && !isMobile)
                ? `linear-gradient(135deg,${domainObj.color},${domainObj.color}cc)`
                : '#cbd5e1',
              color: 'white', fontWeight: 700, fontSize: 15, cursor: (credits.can_start_interview && !isMobile) ? 'pointer' : 'not-allowed',
              boxShadow: (credits.can_start_interview && !isMobile) ? `0 4px 14px ${domainObj.color}55` : 'none',
              transition: 'all .2s',
            }}
          >
            {isMobile ? '🖥️ Desktop Required' : starting ? '⏳ Starting…' : credits.can_start_interview ? `🎙️ Start ${domainObj.label}` : '🔒 Limit Reached'}
          </button>

          {!credits.can_start_interview && !isMobile && (
            <span style={{ fontSize: 13, color: '#dc2626' }}>{credits.message}</span>
          )}
        </div>
      </div>

      {/* ── Recent interviews ─────────────────────────────── */}
      <div className="card fade-up">
        <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: 'var(--text-1)' }}>
          📋 Recent Interviews
        </h3>
        {!data?.recent_interviews?.length ? (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎤</div>
            <div style={{ fontWeight: 600, color: 'var(--text-2)', marginBottom: 4 }}>No interviews yet</div>
            <div style={{ fontSize: 14 }}>Start your first one above to see results here</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.recent_interviews.map((iv: any) => {
              const score = iv.total_score ?? 0;
              const sc = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
              const domain = DOMAINS.find(d => d.value === iv.domain);
              return (
                <div key={iv.id} onClick={() => navigate(`/report/${iv.id}`)} style={recentRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${domain?.color ?? '#6366f1'}18`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                      {domain?.icon ?? '💼'}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-1)', fontSize: 14 }}>
                        {iv.domain?.replace(/_/g,' ').replace(/\b\w/g,(l:string)=>l.toUpperCase())}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
                        {new Date(iv.completed_at || iv.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 800, fontSize: 20, color: sc }}>{score.toFixed(0)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>/ 100</div>
                    </div>
                    <div style={{ color: 'var(--text-3)', fontSize: 18 }}>›</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, sub, accent }: { icon:string; title:string; value:string; sub:string; accent:string }) {
  return (
    <div className="card fade-up" style={{ borderTop: `3px solid ${accent}`, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</span>
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 6 }}>{sub}</div>
    </div>
  );
}

const heroBox: React.CSSProperties = {
  background: 'linear-gradient(135deg,#6366f1 0%,#4f46e5 50%,#06b6d4 100%)',
  borderRadius: 20, padding: '28px 32px', marginBottom: 24,
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  boxShadow: '0 8px 32px rgba(99,102,241,.3)',
};
const heroTier: React.CSSProperties = {
  background: 'rgba(255,255,255,.15)', borderRadius: 12,
  padding: '10px 20px', textAlign: 'center',
};
const statsGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))',
  gap: 16, marginBottom: 24,
};
const domainGrid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 10,
};
const domainBtn: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '14px 8px', borderRadius: 12, cursor: 'pointer',
  transition: 'all .18s', boxShadow: '0 1px 4px rgba(0,0,0,.07)',
};
const recentRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 14px', background: '#f8fafc', borderRadius: 10,
  cursor: 'pointer', transition: 'background .15s',
  border: '1px solid transparent',
};
