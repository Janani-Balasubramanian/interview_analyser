import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { interviewApi } from '../api';

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadReport();
  }, [id]);

  const loadReport = async () => {
    try {
      const res = await interviewApi.get(Number(id));
      setReport(res.data);
    } catch (err) {
      alert('Failed to load report');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading report...</div>;
  if (!report) return null;

  const scoreColor = (s: number) =>
    s >= 70 ? '#059669' : s >= 50 ? '#d97706' : '#dc2626';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px 16px' }}>
      <Link to="/" style={{ color: '#4f46e5', textDecoration: 'none', fontSize: 14 }}>← Back to Dashboard</Link>
      
      <h1 style={{ fontSize: 28, fontWeight: 700, margin: '16px 0 8px' }}>Interview Report</h1>
      <p style={{ color: '#64748b', marginBottom: 32 }}>
        {report.domain?.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())} ·{' '}
        {new Date(report.completed_at || report.created_at).toLocaleString()}
      </p>

      {/* Overall Score */}
      <div style={{ ...cardStyle, textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>Overall Score</div>
        <div style={{ fontSize: 56, fontWeight: 800, color: scoreColor(report.total_score || 0) }}>
          {report.total_score?.toFixed(0) ?? '—'}
        </div>
        <div style={{ fontSize: 14, color: '#64748b' }}>out of 100</div>
      </div>

      {/* Dimension Scores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        <ScoreBox label="Technical" score={report.technical_score} />
        <ScoreBox label="Communication" score={report.communication_score} />
        <ScoreBox label="Confidence" score={report.confidence_score} />
      </div>

      {/* Summary */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px' }}>Feedback Summary</h3>
        <p style={{ margin: 0, lineHeight: 1.6, color: '#334155' }}>{report.feedback_summary}</p>
      </div>

      {/* Integrity / Proctoring */}
      <div style={{ ...cardStyle, marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 12px' }}>Integrity Report</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div style={{
            fontSize: 32, fontWeight: 800,
            color: (report.integrity_score ?? 100) >= 80 ? '#059669' : (report.integrity_score ?? 100) >= 50 ? '#d97706' : '#dc2626',
          }}>
            {report.integrity_score != null ? Math.round(report.integrity_score) : '—'}
          </div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Integrity Score (100 = clean)</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, fontSize: 14 }}>
          <div>Tab switches: <strong>{report.tab_switches ?? 0}</strong></div>
          <div>Fullscreen exits: <strong>{report.fullscreen_exits ?? 0}</strong></div>
          <div>Copy/paste attempts: <strong>{report.copy_paste_attempts ?? 0}</strong></div>
          <div>Webcam: <strong>{report.webcam_enabled ? 'Enabled ✓' : 'Not enabled ✗'}</strong></div>
        </div>
      </div>

      {/* Recommendations */}
      {report.detailed_feedback?.recommendations && (
        <div style={cardStyle}>
          <h3 style={{ margin: '0 0 12px' }}>Recommendations</h3>
          <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8, color: '#334155' }}>
            {report.detailed_feedback.recommendations.map((r: string, i: number) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 32, textAlign: 'center' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '12px 28px',
            borderRadius: 8,
            border: 'none',
            background: '#4f46e5',
            color: 'white',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

function ScoreBox({ label, score }: { label: string; score?: number }) {
  const s = score ?? 0;
  const color = s >= 70 ? '#059669' : s >= 50 ? '#d97706' : '#dc2626';
  return (
    <div style={{ ...cardStyle, textAlign: 'center' }}>
      <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{s.toFixed(0)}</div>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: 12,
  padding: 20,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};
