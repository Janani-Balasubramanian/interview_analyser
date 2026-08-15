import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { interviewApi } from '../api';
import {
  isMobileDevice,
  createTabMonitor,
  createFullscreenMonitor,
  createCopyPasteGuard,
  requestWebcam,
} from '../utils/proctoring';
import type { TabViolation } from '../utils/proctoring';

const MAX_TAB_SWITCHES = 3;
const MAX_FULLSCREEN_EXITS = 3;
const MAX_COPY_ATTEMPTS = 5;

export default function Interview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastFeedback, setLastFeedback] = useState<any>(null);
  const [answersGiven, setAnswersGiven] = useState(0);
  const [aiSpeaking, setAiSpeaking] = useState(false);

  // Proctoring
  const [isMobile, setIsMobile] = useState(false);
  const [tabViolations, setTabViolations] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [isTabAway, setIsTabAway] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [interviewBlocked, setInterviewBlocked] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [needsFullscreenClick, setNeedsFullscreenClick] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fsCleanup = useRef<(() => void) | null>(null);
  const tabCleanup = useRef<(() => void) | null>(null);
  const copyCleanup = useRef<(() => void) | null>(null);

  // ─── Mobile ───────────────────────────────────────────────────────
  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    if (mobile) {
      setInterviewBlocked(true);
      setWarningMessage('Mobile devices are not allowed. Please use a desktop or laptop.');
    }
  }, []);

  // ─── Webcam (USER only – AI has no video) ─────────────────────────
  useEffect(() => {
    if (isMobile || interviewBlocked) return;
    let active = true;

    (async () => {
      const stream = await requestWebcam();
      if (!active) {
        stream?.getTracks().forEach((t) => t.stop());
        return;
      }
      if (stream) {
        streamRef.current = stream;
        setWebcamEnabled(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } else {
        setWebcamEnabled(false);
        setShowWarning(true);
        setWarningMessage('Webcam is required. Please allow camera access and refresh.');
      }
    })();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [isMobile, interviewBlocked]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [webcamEnabled, loading, needsFullscreenClick]);

  // ─── Load questions ───────────────────────────────────────────────
  useEffect(() => {
    if (id && !isMobile) loadQuestions();
  }, [id, isMobile]);

  // ─── AI speaks the question (text-to-speech, no AI video) ─────────
  const speakQuestion = (text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    setAiSpeaking(true);
    utterance.onend = () => setAiSpeaking(false);
    utterance.onerror = () => setAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  // Speak when question changes
  useEffect(() => {
    if (!needsFullscreenClick && questions.length > 0 && !lastFeedback) {
      const q = questions[currentIdx];
      if (q?.question_text) {
        // Small delay so UI is ready
        const t = setTimeout(() => speakQuestion(q.question_text), 600);
        return () => clearTimeout(t);
      }
    }
  }, [currentIdx, needsFullscreenClick, questions, lastFeedback]);

  const startMonitors = () => {
    if (isMobile || interviewBlocked) return;

    const fs = createFullscreenMonitor((count) => {
      setFullscreenExits(count);
      if (count === 1) {
        setShowWarning(true);
        setWarningMessage('You exited fullscreen. Please stay in fullscreen.');
      } else if (count >= MAX_FULLSCREEN_EXITS) {
        setInterviewBlocked(true);
        setWarningMessage(`Interview terminated: Too many fullscreen exits (${count}).`);
      }
    });
    fsCleanup.current = fs.cleanup;

    tabCleanup.current = createTabMonitor((info: TabViolation) => {
      setTabViolations(info.count);
      setIsTabAway(info.lastLeftAt !== null);
      if (info.count === 1) {
        setShowWarning(true);
        setWarningMessage('Warning: Tab switch detected. Stay on this page.');
      } else if (info.count === 2) {
        setShowWarning(true);
        setWarningMessage(`Second warning! ${info.count} tab switches.`);
      } else if (info.count >= MAX_TAB_SWITCHES) {
        setInterviewBlocked(true);
        setWarningMessage(`Interview terminated due to ${info.count} tab switches.`);
      }
    });

    copyCleanup.current = createCopyPasteGuard((count) => {
      setCopyAttempts(count);
      setShowWarning(true);
      setWarningMessage(`Copy/paste blocked (attempt ${count}).`);
      if (count >= MAX_COPY_ATTEMPTS) {
        setInterviewBlocked(true);
        setWarningMessage(`Interview terminated: Too many copy/paste attempts.`);
      }
    });

    setNeedsFullscreenClick(false);
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      fsCleanup.current?.();
      tabCleanup.current?.();
      copyCleanup.current?.();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const loadQuestions = async () => {
    try {
      const res = await interviewApi.getQuestions(Number(id), 5);
      setQuestions(res.data);
    } catch {
      alert('Failed to load questions');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (interviewBlocked) return;
    if (!transcript.trim()) {
      alert('Please type your answer');
      return;
    }
    window.speechSynthesis?.cancel();
    setAiSpeaking(false);
    setSubmitting(true);
    try {
      const res = await interviewApi.submitAnswer(Number(id), {
        question_id: questions[currentIdx].id,
        transcript: transcript.trim(),
      });
      setLastFeedback(res.data);
      setAnswersGiven((a) => a + 1);
      setTranscript('');
      if (currentIdx < questions.length - 1) {
        setTimeout(() => {
          setCurrentIdx((i) => i + 1);
          setLastFeedback(null);
        }, 2800);
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  const finishInterview = async () => {
    window.speechSynthesis?.cancel();
    try {
      await interviewApi.complete(Number(id), {
        tab_switches: tabViolations,
        fullscreen_exits: fullscreenExits,
        copy_paste_attempts: copyAttempts,
        webcam_enabled: webcamEnabled,
        proctoring_flags: {
          max_tab_switches: MAX_TAB_SWITCHES,
          max_fullscreen_exits: MAX_FULLSCREEN_EXITS,
          max_copy_attempts: MAX_COPY_ATTEMPTS,
        },
      });
      fsCleanup.current?.();
      navigate(`/report/${id}`);
    } catch {
      alert('Failed to complete interview');
    }
  };

  const replayQuestion = () => {
    if (questions[currentIdx]?.question_text) {
      speakQuestion(questions[currentIdx].question_text);
    }
  };

  // ─── Screens ──────────────────────────────────────────────────────
  if (isMobile) {
    return (
      <div style={blockedScreenStyle}>
        <div style={blockedCardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📱❌</div>
          <h2 style={{ margin: '0 0 12px', color: '#dc2626' }}>Mobile Not Allowed</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 24 }}>
            Please use a desktop or laptop computer.
          </p>
          <button onClick={() => navigate('/')} style={primaryBtn}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (interviewBlocked && !isMobile) {
    return (
      <div style={blockedScreenStyle}>
        <div style={blockedCardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ margin: '0 0 12px', color: '#dc2626' }}>Interview Terminated</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 8 }}>{warningMessage}</p>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
            <div>Tab switches: {tabViolations}</div>
            <div>Fullscreen exits: {fullscreenExits}</div>
            <div>Copy/paste attempts: {copyAttempts}</div>
          </div>
          <button onClick={() => navigate('/')} style={primaryBtn}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (needsFullscreenClick && !loading) {
    return (
      <div style={blockedScreenStyle}>
        <div style={blockedCardStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎥</div>
          <h2 style={{ margin: '0 0 12px' }}>Interview Setup</h2>
          <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: 12 }}>
            This is a <strong>video interview</strong>. Only <strong>you</strong> will be on camera.
            The AI interviewer will ask questions by voice and text — there is no AI video avatar.
          </p>
          <ul style={{ textAlign: 'left', color: '#64748b', fontSize: 14, lineHeight: 1.8, marginBottom: 24 }}>
            <li>Your webcam must stay on</li>
            <li>AI will speak each question (no AI face/video)</li>
            <li>Stay in fullscreen</li>
            <li>Do not switch tabs or copy/paste</li>
          </ul>
          <button onClick={startMonitors} style={{ ...primaryBtn, padding: '14px 32px', fontSize: 16 }}>
            Turn on Camera & Start Interview
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center' }}>Loading interview...</div>;
  }

  if (questions.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center' }}>No questions available.</div>;
  }

  const q = questions[currentIdx];
  const isLast = currentIdx === questions.length - 1;
  const allAnswered = answersGiven >= questions.length;

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px', position: 'relative' }}>
      {/* USER webcam only – large preview (like a real interview) */}
      <div style={userVideoStyle}>
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={videoLabelStyle}>
          {webcamEnabled ? 'You (Live)' : 'Camera off'}
        </div>
      </div>

      {/* AI interviewer panel – NO video, only text + voice */}
      <div style={aiPanelStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={aiAvatarStyle}>AI</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>AI Interviewer</div>
            <div style={{ fontSize: 12, color: aiSpeaking ? '#4f46e5' : '#94a3b8' }}>
              {aiSpeaking ? 'Speaking...' : 'Listening'}
            </div>
          </div>
          {aiSpeaking && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
              <span style={waveBar(1)} /><span style={waveBar(2)} /><span style={waveBar(3)} />
            </div>
          )}
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>
          No AI video — only you are on camera. The AI asks questions by voice and text.
        </p>
      </div>

      {showWarning && (
        <div style={warningBannerStyle}>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#dc2626' }}>⚠️ Proctoring Alert</strong>
            <p style={{ margin: '4px 0 0', fontSize: 14 }}>{warningMessage}</p>
          </div>
          <button onClick={() => setShowWarning(false)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
        </div>
      )}

      {isTabAway && (
        <div style={awayOverlayStyle}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👀</div>
            <h3 style={{ margin: 0 }}>Please return to the interview</h3>
            <p style={{ opacity: 0.8 }}>You must stay visible on camera</p>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Live Interview</h2>
        <div style={{ display: 'flex', gap: 10, fontSize: 12, color: '#64748b' }}>
          <span style={{ color: tabViolations > 0 ? '#dc2626' : undefined }}>Tabs {tabViolations}/{MAX_TAB_SWITCHES}</span>
          <span style={{ color: fullscreenExits > 0 ? '#dc2626' : undefined }}>FS {fullscreenExits}/{MAX_FULLSCREEN_EXITS}</span>
          <span>Q {currentIdx + 1}/{questions.length}</span>
        </div>
      </div>

      <div style={{ background: '#e2e8f0', borderRadius: 8, height: 6, marginBottom: 20 }}>
        <div style={{
          width: `${((currentIdx + (lastFeedback ? 1 : 0)) / questions.length) * 100}%`,
          height: '100%', background: '#4f46e5', borderRadius: 8, transition: 'width 0.3s',
        }} />
      </div>

      {/* Question from AI */}
      <div style={cardStyle}>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
          AI Interviewer asks · {q.domain?.replace(/_/g, ' ')}
        </div>
        <h3 style={{ margin: '0 0 16px', fontSize: 18, lineHeight: 1.5, color: '#1e293b' }}>
          {q.question_text}
        </h3>
        <button onClick={replayQuestion} disabled={aiSpeaking} style={secondaryBtn}>
          {aiSpeaking ? 'AI is speaking...' : '🔊 Replay question'}
        </button>

        {!lastFeedback ? (
          <div style={{ marginTop: 20 }}>
            <label style={{ fontSize: 13, color: '#64748b', display: 'block', marginBottom: 6 }}>
              Your answer (type while on camera)
            </label>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Speak or type your answer here..."
              rows={6}
              disabled={interviewBlocked}
              onPaste={(e) => e.preventDefault()}
              onCopy={(e) => e.preventDefault()}
              onCut={(e) => e.preventDefault()}
              style={{
                width: '100%', padding: 14, borderRadius: 8, border: '1px solid #e2e8f0',
                fontSize: 15, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <div style={{ marginTop: 14 }}>
              <button onClick={submitAnswer} disabled={submitting || !transcript.trim() || interviewBlocked} style={primaryBtn}>
                {submitting ? 'Evaluating...' : 'Submit Answer'}
              </button>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 16, background: '#f0fdf4', borderRadius: 8, padding: 16, border: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: '#059669', marginBottom: 8 }}>
              Score: {lastFeedback.score}/100
            </div>
            <p style={{ margin: 0, color: '#166534', lineHeight: 1.5 }}>{lastFeedback.feedback}</p>
            {!isLast && <p style={{ marginTop: 12, fontSize: 13, color: '#64748b' }}>Next question coming...</p>}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 12, color: '#64748b' }}>
        <strong>Format:</strong> Only you are on video. AI asks by voice + text (no AI camera). Stay in fullscreen.
      </div>

      {(allAnswered || (isLast && lastFeedback)) && (
        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <button onClick={finishInterview} style={{ ...primaryBtn, background: '#059669', padding: '14px 32px' }}>
            Finish Interview & View Report
          </button>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
};
const primaryBtn: React.CSSProperties = {
  padding: '10px 24px', borderRadius: 8, border: 'none', background: '#4f46e5',
  color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: 15,
};
const secondaryBtn: React.CSSProperties = {
  padding: '6px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: 'white',
  color: '#475569', fontSize: 13, cursor: 'pointer',
};
const blockedScreenStyle: React.CSSProperties = {
  minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
};
const blockedCardStyle: React.CSSProperties = {
  background: 'white', borderRadius: 16, padding: 40, maxWidth: 460, textAlign: 'center',
  boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
};
const warningBannerStyle: React.CSSProperties = {
  position: 'sticky', top: 0, zIndex: 100, background: '#fef2f2', border: '1px solid #fecaca',
  borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start',
};
const awayOverlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.92)', zIndex: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const userVideoStyle: React.CSSProperties = {
  position: 'fixed', bottom: 16, right: 16, width: 200, height: 150, borderRadius: 12,
  overflow: 'hidden', border: '3px solid #4f46e5', boxShadow: '0 8px 30px rgba(0,0,0,0.3)',
  zIndex: 50, background: '#0f172a',
};
const videoLabelStyle: React.CSSProperties = {
  position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center',
  fontSize: 11, color: 'white', fontWeight: 600, textShadow: '0 1px 3px black',
};
const aiPanelStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
  borderRadius: 12, padding: 16, marginBottom: 16, border: '1px solid #c7d2fe',
};
const aiAvatarStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: '50%', background: '#4f46e5', color: 'white',
  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14,
};
const waveBar = (n: number): React.CSSProperties => ({
  display: 'inline-block', width: 3, height: 12 + n * 4, background: '#4f46e5', borderRadius: 2,
  animation: `pulse 0.6s ease-in-out ${n * 0.15}s infinite alternate`,
});
