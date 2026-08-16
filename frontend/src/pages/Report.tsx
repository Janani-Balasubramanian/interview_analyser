import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { interviewApi } from '../api';

const DOMAIN_META: Record<string, { icon: string; color: string }> = {
  software_engineering: { icon: '💻', color: '#6366f1' },
  data_analytics:       { icon: '📊', color: '#06b6d4' },
  hr_behavioral:        { icon: '🤝', color: '#10b981' },
  business_analytics:   { icon: '📈', color: '#f59e0b' },
  product_management:   { icon: '🗂️', color: '#8b5cf6' },
  marketing:            { icon: '📣', color: '#ec4899' },
};

export default function Report() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (id) loadReport(); }, [id]);

  const loadReport = async () => {
    try { const r = await interviewApi.get(Number(id)); setReport(r.data); }
    catch { alert('Failed to load report'); navigate('/'); }
    finally { setLoading(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 44, height: 44, border: '4px solid #e0e7ff', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />
      <span style={{ color: 'var(--text-2)' }}>Building your report…</span>
    </div>
  );
  if (!report) return null;

  const total = report.total_score ?? 0;
  const integrity = report.integrity_score ?? 100;
  const meta = DOMAIN_META[report.domain] ?? { icon: '💼', color: '#6366f1' };
  const grade = total >= 85 ? { label: 'Excellent', color: '#10b981', bg: '#d1fae5' }
              : total >= 70 ? { label: 'Good',      color: '#06b6d4', bg: '#cffafe' }
              : total >= 55 ? { label: 'Fair',       color: '#f59e0b', bg: '#fef3c7' }
              :               { label: 'Needs Work', color: '#ef4444', bg: '#fee2e2' };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 20px' }} className="fade-up">
      {/* Back */}
      <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--brand)', fontSize: 14, fontWeight: 600, textDecoration: 'none', marginBottom: 24 }}>
        ← Back to Dashboard
      </Link>

      {/* ── Hero score card ───────────────────────────────── */}
      <div style={{ ...heroCard, background: `linear-gradient(135deg,${meta.color} 0%,${meta.color}bb 100%)` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
            {meta.icon}
          </div>
          <div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Interview Report</div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>
              {report.domain?.replace(/_/g,' ').replace(/\b\w/g,(l:string)=>l.toUpperCase())}
            </div>
          </div>
          <div style={{ marginLeft: 'auto', background: grade.bg, color: grade.color, borderRadius: 999, padding: '4px 14px', fontSize: 13, fontWeight: 700 }}>
            {grade.label}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: 'white', lineHeight: 1 }}>{total.toFixed(0)}</div>
          <div style={{ color: 'rgba(255,255,255,.6)', fontSize: 22, paddingBottom: 10 }}>/100</div>
        </div>
        <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 13, marginTop: 6 }}>
          {new Date(report.completed_at || report.created_at).toLocaleString('en-US',{ dateStyle:'medium', timeStyle:'short' })}
        </div>
      </div>

      {/* ── Dimension scores ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <DimCard label="Technical" score={report.technical_score} icon="🔬" color="#6366f1" />
        <DimCard label="Communication" score={report.communication_score} icon="💬" color="#06b6d4" />
        <DimCard label="Confidence" score={report.confidence_score} icon="⚡" color="#f59e0b" />
      </div>

      {/* ── Feedback ──────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 20 }}>💡</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>AI Feedback</h3>
        </div>
        <p style={{ margin: 0, lineHeight: 1.8, color: 'var(--text-2)', fontSize: 15 }}>{report.feedback_summary}</p>
      </div>

      {/* ── Recommendations ───────────────────────────────── */}
      {report.detailed_feedback?.recommendations?.length > 0 && (
        <div className="card" style={{ marginBottom: 20, background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1px solid #bbf7d0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 20 }}>🎯</span>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#065f46' }}>How to Improve</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {report.detailed_feedback.recommendations.map((r: string, i: number) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#10b981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <span style={{ fontSize: 14, color: '#134e3a', lineHeight: 1.6 }}>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Integrity ─────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 20 }}>🛡️</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Integrity Report</h3>
          <div style={{ marginLeft: 'auto', fontWeight: 800, fontSize: 22,
            color: integrity >= 80 ? '#10b981' : integrity >= 50 ? '#f59e0b' : '#ef4444' }}>
            {Math.round(integrity)}<span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 400 }}>/100</span>
          </div>
        </div>

        {/* Integrity bar */}
        <div style={{ background: '#e2e8f0', borderRadius: 999, height: 8, overflow: 'hidden', marginBottom: 14 }}>
          <div style={{
            width: `${integrity}%`, height: '100%', borderRadius: 999,
            background: integrity >= 80 ? 'linear-gradient(90deg,#10b981,#059669)' : integrity >= 50 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)',
            transition: 'width .6s',
          }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
          {[
            ['Tab switches', report.tab_switches ?? 0, report.tab_switches > 0],
            ['Fullscreen exits', report.fullscreen_exits ?? 0, report.fullscreen_exits > 0],
            ['Copy/paste attempts', report.copy_paste_attempts ?? 0, report.copy_paste_attempts > 0],
            ['Webcam', report.webcam_enabled ? 'On ✓' : 'Off ✗', !report.webcam_enabled],
          ].map(([label, val, bad]) => (
            <div key={String(label)} style={{ background: bad ? '#fef2f2' : '#f0fdf4', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{label}</span>
              <strong style={{ fontSize: 14, color: bad ? '#dc2626' : '#059669' }}>{String(val)}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ───────────────────────────────────────────── */}
      <div style={{ textAlign: 'center' }}>
        <button onClick={() => navigate('/')} className="btn-primary" style={{ padding: '14px 36px', fontSize: 16 }}>
          🎙️ Practice Again
        </button>
      </div>
    </div>
  );
}

function DimCard({ label, score, icon, color }: { label: string; score?: number; icon: string; color: string }) {
  const s = score ?? 0;
  const pct = s;
  return (
    <div className="card" style={{ textAlign: 'center', padding: '20px 16px' }}>
      <div style={{ fontSize: 24, marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, marginBottom: 8 }}>{label}</div>
      {/* Mini arc indicator */}
      <div style={{ position: 'relative', width: 64, height: 64, margin: '0 auto 8px' }}>
        <svg viewBox="0 0 64 64" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="32" cy="32" r="26" fill="none" stroke="#e0e7ff" strokeWidth="6" />
          <circle cx="32" cy="32" r="26" fill="none" stroke={color} strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 26}`}
            strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset .8s ease' }}
          />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color }}>
          {s.toFixed(0)}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-3)' }}>out of 100</div>
    </div>
  );
}

const heroCard: React.CSSProperties = {
  borderRadius: 20, padding: '28px 32px', marginBottom: 20,
  boxShadow: '0 8px 32px rgba(0,0,0,.15)',
};
