import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboardApi, interviewApi } from '../api';
import { isMobileDevice } from '../utils/proctoring';

const DOMAINS = [
  { value: 'software_engineering', label: 'Software Engineering' },
  { value: 'data_analytics', label: 'Data Analytics' },
  { value: 'hr_behavioral', label: 'HR / Behavioral' },
  { value: 'business_analytics', label: 'Business Analytics' },
  { value: 'product_management', label: 'Product Management' },
  { value: 'marketing', label: 'Marketing' },
];

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('software_engineering');
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setIsMobile(isMobileDevice());
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await dashboardApi.get();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    if (isMobileDevice()) {
      alert('Mobile devices are not allowed for interviews.\n\nPlease use a desktop or laptop computer.');
      return;
    }

    setStarting(true);
    try {
      const res = await interviewApi.start(selectedDomain);
      navigate(`/interview/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Could not start interview');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading dashboard...</div>;
  }

  const credits = data?.current_month_credits || {};
  const user = data?.user || {};

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>
        Welcome{user.full_name ? `, ${user.full_name}` : ''}
      </h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>
        Track your progress and practice mock interviews
      </p>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        <StatCard
          title="Free Interviews Left"
          value={`${credits.free_interviews_remaining ?? 0} / 4`}
          subtitle={credits.bonus_unlocked ? 'Bonus unlocked!' : `${credits.progress_to_bonus ?? 0}% to bonus`}
          color="#4f46e5"
        />
        <StatCard
          title="Monthly Score"
          value={credits.total_score?.toFixed(0) ?? '0'}
          subtitle="Target: 250 for bonus"
          color="#0891b2"
        />
        <StatCard
          title="Avg Score"
          value={data?.average_score ?? '—'}
          subtitle={`${data?.total_interviews ?? 0} interviews completed`}
          color="#059669"
        />
        <StatCard
          title="Experience Tier"
          value={user.experience_tier?.replace('tier', 'Tier ') ?? '—'}
          subtitle="Change in profile later"
          color="#d97706"
        />
      </div>

      {/* Progress to Bonus */}
      <div style={cardStyle}>
        <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Progress to 5th Bonus Interview</h3>
        <div style={{ background: '#e2e8f0', borderRadius: 8, height: 12, overflow: 'hidden' }}>
          <div
            style={{
              width: `${Math.min(100, credits.progress_to_bonus || 0)}%`,
              height: '100%',
              background: credits.bonus_unlocked ? '#059669' : '#4f46e5',
              transition: 'width 0.5s',
            }}
          />
        </div>
        <p style={{ margin: '8px 0 0', fontSize: 13, color: '#64748b' }}>
          {credits.bonus_unlocked
            ? 'Bonus interview unlocked! You can take a 5th interview this month.'
            : `Accumulate >250 points across your 4 free interviews to unlock a bonus. Current: ${credits.total_score?.toFixed(0) || 0}`}
        </p>
      </div>

      {/* Mobile warning */}
      {isMobile && (
        <div style={{
          marginTop: 24,
          padding: 16,
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: 12,
          color: '#991b1b',
        }}>
          <strong>📱 Mobile device detected</strong>
          <p style={{ margin: '8px 0 0', fontSize: 14 }}>
            Interviews can only be taken on a desktop or laptop. Please switch to a computer to start an interview.
          </p>
        </div>
      )}

      {/* Start Interview */}
      <div style={{ ...cardStyle, marginTop: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Start New Mock Interview</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #e2e8f0',
              fontSize: 14,
              minWidth: 220,
            }}
          >
            {DOMAINS.map((d) => (
              <option key={d.value} value={d.value}>{d.label}</option>
            ))}
          </select>
          <button
            onClick={startInterview}
            disabled={starting || !credits.can_start_interview || isMobile}
            style={{
              padding: '10px 24px',
              borderRadius: 8,
              border: 'none',
              background: (credits.can_start_interview && !isMobile) ? '#4f46e5' : '#94a3b8',
              color: 'white',
              fontWeight: 600,
              cursor: (credits.can_start_interview && !isMobile) ? 'pointer' : 'not-allowed',
            }}
          >
            {isMobile ? 'Desktop Required' : starting ? 'Starting...' : credits.can_start_interview ? 'Start Interview' : 'Limit Reached'}
          </button>
        </div>
        {!credits.can_start_interview && !isMobile && (
          <p style={{ marginTop: 12, color: '#dc2626', fontSize: 14 }}>{credits.message}</p>
        )}
      </div>

      {/* Recent Interviews */}
      <div style={{ ...cardStyle, marginTop: 24 }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>Recent Interviews</h3>
        {data?.recent_interviews?.length === 0 ? (
          <p style={{ color: '#64748b' }}>No interviews yet. Start your first one above!</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data?.recent_interviews?.map((iv: any) => (
              <div
                key={iv.id}
                onClick={() => navigate(`/report/${iv.id}`)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: '#f8fafc',
                  borderRadius: 8,
                  cursor: 'pointer',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: '#1e293b' }}>
                    {iv.domain?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    {new Date(iv.completed_at || iv.created_at).toLocaleDateString()}
                  </div>
                </div>
                <div style={{
                  fontWeight: 700,
                  fontSize: 18,
                  color: (iv.total_score || 0) >= 70 ? '#059669' : (iv.total_score || 0) >= 50 ? '#d97706' : '#dc2626',
                }}>
                  {iv.total_score?.toFixed(0) ?? '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, color }: { title: string; value: string | number; subtitle: string; color: string }) {
  return (
    <div style={{ ...cardStyle, borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{value}</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>{subtitle}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};
