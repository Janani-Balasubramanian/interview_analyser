import { useEffect, useState, useRef, useCallback } from 'react';
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

// ── Web Speech API types ────────────────────────────────────────────
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

type VoicePhase =
  | 'idle'          // waiting to start
  | 'ai_speaking'   // TTS playing the question
  | 'listening'     // STT recording user answer
  | 'processing'    // submitting to backend
  | 'feedback'      // playing back score feedback via TTS
  | 'finished';     // all questions done

export default function Interview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // ── Core state ────────────────────────────────────────────────────
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [liveTranscript, setLiveTranscript] = useState('');   // shown while mic is live
  const [finalTranscript, setFinalTranscript] = useState(''); // confirmed transcript
  const [answersGiven, setAnswersGiven] = useState(0);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState('');             // small status hint

  // ── Proctoring ────────────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(false);
  const [tabViolations, setTabViolations] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [copyAttempts, setCopyAttempts] = useState(0);
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [isTabAway, setIsTabAway] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [interviewBlocked, setInterviewBlocked] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [setupDone, setSetupDone] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fsCleanup = useRef<(() => void) | null>(null);
  const tabCleanup = useRef<(() => void) | null>(null);
  const copyCleanup = useRef<(() => void) | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const phaseRef = useRef<VoicePhase>('idle');

  // Keep phaseRef in sync so callbacks always see the latest phase
  useEffect(() => { phaseRef.current = phase; }, [phase]);

  // ─── Mobile check ─────────────────────────────────────────────────
  useEffect(() => {
    const mobile = isMobileDevice();
    setIsMobile(mobile);
    if (mobile) {
      setInterviewBlocked(true);
      setWarningMessage('Mobile devices are not allowed. Please use a desktop or laptop.');
    }
  }, []);

  // ─── Webcam ───────────────────────────────────────────────────────
  useEffect(() => {
    if (isMobile || interviewBlocked) return;
    let active = true;
    (async () => {
      const stream = await requestWebcam();
      if (!active) { stream?.getTracks().forEach(t => t.stop()); return; }
      if (stream) {
        streamRef.current = stream;
        setWebcamEnabled(true);
        if (videoRef.current) videoRef.current.srcObject = stream;
      } else {
        setWebcamEnabled(false);
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [isMobile, interviewBlocked]);

  useEffect(() => {
    if (videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current;
  }, [webcamEnabled, loading, setupDone]);

  // ─── Load questions ───────────────────────────────────────────────
  useEffect(() => {
    if (id && !isMobile) loadQuestions();
  }, [id, isMobile]);

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

  // ─── TTS: speak text, return promise that resolves when done ──────
  const speak = useCallback((text: string): Promise<void> => {
    return new Promise(resolve => {
      if (!window.speechSynthesis) { resolve(); return; }
      window.speechSynthesis.cancel();
      const utt = new SpeechSynthesisUtterance(text);
      utt.lang = 'en-US';
      utt.rate = 0.92;
      utt.pitch = 1.05;
      // Prefer a natural-sounding voice if available
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v =>
        v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha'))
      );
      if (preferred) utt.voice = preferred;
      utt.onend = () => resolve();
      utt.onerror = () => resolve();
      window.speechSynthesis.speak(utt);
    });
  }, []);

  // ─── STT: start recording, collect transcript ─────────────────────
  const startListening = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        resolve('');
        return;
      }
      const rec = new SR();
      recognitionRef.current = rec;
      rec.lang = 'en-US';
      rec.continuous = true;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      let full = '';
      setLiveTranscript('');

      rec.onresult = (e: SpeechRecognitionEvent) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const t = e.results[i][0].transcript;
          if (e.results[i].isFinal) full += t + ' ';
          else interim = t;
        }
        setLiveTranscript(full + interim);
      };

      rec.onerror = () => {
        setLiveTranscript(full);
        resolve(full.trim());
      };

      rec.onend = () => {
        setLiveTranscript(full);
        resolve(full.trim());
      };

      rec.start();
    });
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }, []);

  // ─── Main interview loop: speak → listen → submit ─────────────────
  const runQuestion = useCallback(async (idx: number, qs: any[]) => {
    if (idx >= qs.length) return;
    const q = qs[idx];

    // 1. AI speaks the question (no text shown)
    setPhase('ai_speaking');
    setStatusMsg('🎤 AI is asking a question...');
    setLiveTranscript('');
    setFinalTranscript('');
    await speak(q.question_text);

    if (phaseRef.current === 'finished') return; // blocked

    // 2. Start recording user's voice answer
    setPhase('listening');
    setStatusMsg('🎙️ Listening... speak your answer now');

    // Auto-stop after 60 seconds
    const autoStop = setTimeout(() => stopListening(), 60000);
    const transcript = await startListening();
    clearTimeout(autoStop);

    setFinalTranscript(transcript);
    setLiveTranscript('');

    if (!transcript || phaseRef.current === 'finished') {
      // Skip empty answer, move on
      setAnswersGiven(a => a + 1);
      await speak("I didn't catch that. Moving to the next question.");
      if (idx < qs.length - 1) {
        setCurrentIdx(idx + 1);
        runQuestion(idx + 1, qs);
      } else {
        setPhase('finished');
        setStatusMsg('');
      }
      return;
    }

    // 3. Submit answer to backend
    setPhase('processing');
    setStatusMsg('⏳ Evaluating your answer...');

    try {
      const res = await interviewApi.submitAnswer(Number(id), {
        question_id: q.id,
        transcript,
      });
      const { score, feedback } = res.data;
      setLastScore(score);
      setAnswersGiven(a => a + 1);

      // 4. AI speaks back the score
      setPhase('feedback');
      const fbText = `Your score for that answer is ${Math.round(score)} out of 100. ${feedback}`;
      setStatusMsg(`Score: ${Math.round(score)}/100`);
      await speak(fbText);

      // 5. Move to next question or finish
      if (idx < qs.length - 1) {
        setCurrentIdx(idx + 1);
        await speak('Moving to the next question.');
        runQuestion(idx + 1, qs);
      } else {
        setPhase('finished');
        setStatusMsg('All questions answered!');
        await speak('You have answered all questions. Great job! Finishing the interview now.');
        finishInterview();
      }
    } catch {
      await speak('There was an error submitting your answer. Moving to the next question.');
      setAnswersGiven(a => a + 1);
      if (idx < qs.length - 1) {
        setCurrentIdx(idx + 1);
        runQuestion(idx + 1, qs);
      } else {
        setPhase('finished');
        finishInterview();
      }
    }
  }, [id, speak, startListening, stopListening]);

  // ─── Start monitors + kick off interview loop ─────────────────────
  const startInterview = () => {
    if (isMobile || interviewBlocked || questions.length === 0) return;

    const fs = createFullscreenMonitor((count) => {
      setFullscreenExits(count);
      if (count === 1) { setShowWarning(true); setWarningMessage('You exited fullscreen. Please stay in fullscreen.'); }
      else if (count >= MAX_FULLSCREEN_EXITS) { setInterviewBlocked(true); stopListening(); window.speechSynthesis?.cancel(); setWarningMessage(`Interview terminated: Too many fullscreen exits.`); }
    });
    fsCleanup.current = fs.cleanup;

    tabCleanup.current = createTabMonitor((info: TabViolation) => {
      setTabViolations(info.count);
      setIsTabAway(info.lastLeftAt !== null);
      if (info.count === 1) { setShowWarning(true); setWarningMessage('Warning: Tab switch detected.'); }
      else if (info.count >= MAX_TAB_SWITCHES) { setInterviewBlocked(true); stopListening(); window.speechSynthesis?.cancel(); setWarningMessage(`Interview terminated: Too many tab switches.`); }
    });

    copyCleanup.current = createCopyPasteGuard((count) => {
      setCopyAttempts(count);
      if (count >= MAX_COPY_ATTEMPTS) { setInterviewBlocked(true); stopListening(); window.speechSynthesis?.cancel(); }
    });

    setSetupDone(true);
    runQuestion(0, questions);
  };

  // ─── Complete interview ───────────────────────────────────────────
  const finishInterview = async () => {
    window.speechSynthesis?.cancel();
    stopListening();
    try {
      await interviewApi.complete(Number(id), {
        tab_switches: tabViolations,
        fullscreen_exits: fullscreenExits,
        copy_paste_attempts: copyAttempts,
        webcam_enabled: webcamEnabled,
        proctoring_flags: { max_tab_switches: MAX_TAB_SWITCHES, max_fullscreen_exits: MAX_FULLSCREEN_EXITS },
      });
      fsCleanup.current?.();
      navigate(`/report/${id}`);
    } catch {
      navigate(`/report/${id}`);
    }
  };

  // ─── Cleanup on unmount ───────────────────────────────────────────
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
      stopListening();
      fsCleanup.current?.();
      tabCleanup.current?.();
      copyCleanup.current?.();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [stopListening]);

  // ══════════════════════════════════════════════════════════════════
  // Render
  // ══════════════════════════════════════════════════════════════════

  if (isMobile) {
    return (
      <div style={centreStyle}>
        <div style={cardBoxStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📱❌</div>
          <h2 style={{ margin: '0 0 12px', color: '#dc2626' }}>Mobile Not Allowed</h2>
          <p style={{ color: '#64748b' }}>Please use a desktop or laptop computer.</p>
          <button onClick={() => navigate('/')} style={btnPrimary}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  if (interviewBlocked) {
    return (
      <div style={centreStyle}>
        <div style={cardBoxStyle}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ margin: '0 0 12px', color: '#dc2626' }}>Interview Terminated</h2>
          <p style={{ color: '#64748b', marginBottom: 8 }}>{warningMessage}</p>
          <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 24 }}>
            <div>Tab switches: {tabViolations}</div>
            <div>Fullscreen exits: {fullscreenExits}</div>
          </div>
          <button onClick={() => navigate('/')} style={btnPrimary}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // Setup / permission screen
  if (!setupDone && !loading) {
    return (
      <div style={centreStyle}>
        <div style={{ ...cardBoxStyle, maxWidth: 500 }}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🎙️</div>
          <h2 style={{ margin: '0 0 8px', fontSize: 22 }}>Voice Interview</h2>
          <p style={{ color: '#475569', lineHeight: 1.7, marginBottom: 20 }}>
            This is a <strong>100% voice-based</strong> interview.
            <br />No questions are shown on screen.
          </p>

          <div style={rulesBox}>
            {[
              '🎤 The AI will <strong>speak</strong> each question',
              '🗣️ You <strong>speak</strong> your answer aloud',
              '🤖 AI scores and <strong>speaks back</strong> your result',
              '📷 Your webcam must stay on',
              '🖥️ Stay in fullscreen — no tab switching',
              '🚫 5 questions total, no text input needed',
            ].map((r, i) => (
              <div key={i} style={ruleItem}
                dangerouslySetInnerHTML={{ __html: r }} />
            ))}
          </div>

          {!webcamEnabled && (
            <div style={warnBox}>⚠️ Camera access is required. Please allow it and refresh.</div>
          )}

          <button
            onClick={startInterview}
            disabled={questions.length === 0}
            style={{ ...btnPrimary, padding: '14px 40px', fontSize: 16, marginTop: 8 }}
          >
            🎙️ Start Voice Interview
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Preparing interview...</div>;
  }

  // ── Live interview screen ────────────────────────────────────────
  return (
    <div style={liveWrap}>
      {/* Webcam — fixed bottom-right */}
      <div style={camBox}>
        <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={camLabel}>{webcamEnabled ? '● Live' : 'Camera off'}</div>
      </div>

      {/* Tab-away overlay */}
      {isTabAway && (
        <div style={awayOverlay}>
          <div style={{ textAlign: 'center', color: 'white' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>👀</div>
            <h3 style={{ margin: 0 }}>Return to the interview</h3>
          </div>
        </div>
      )}

      {/* Proctoring warning banner */}
      {showWarning && (
        <div style={warnBanner}>
          <span>⚠️ {warningMessage}</span>
          <button onClick={() => setShowWarning(false)} style={closeBtn}>✕</button>
        </div>
      )}

      {/* Centre panel */}
      <div style={centrePanel}>

        {/* Progress */}
        <div style={progressRow}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Question {Math.min(currentIdx + 1, questions.length)} of {questions.length}
          </span>
          <span style={{ fontSize: 13, color: tabViolations > 0 ? '#dc2626' : '#94a3b8' }}>
            Tabs: {tabViolations}/{MAX_TAB_SWITCHES}
          </span>
        </div>
        <div style={progressBarBg}>
          <div style={{ ...progressBarFill, width: `${((currentIdx) / questions.length) * 100}%` }} />
        </div>

        {/* AI avatar + status */}
        <div style={aiBox}>
          <div style={aiOrb}>
            {phase === 'ai_speaking' && <div style={aiRing} />}
            <span style={{ fontSize: 28 }}>🤖</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>AI Interviewer</div>
            <div style={{ fontSize: 13, color: phaseColors[phase] }}>{phaseLabel[phase]}</div>
          </div>
          {/* Sound wave when AI speaking */}
          {phase === 'ai_speaking' && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 3, alignItems: 'center' }}>
              {[1,2,3,4,3,2,1].map((h, i) => (
                <span key={i} style={wave(h, i)} />
              ))}
            </div>
          )}
        </div>

        {/* User mic visualizer */}
        {phase === 'listening' && (
          <div style={micBox}>
            <div style={micOrb}>
              <span style={{ fontSize: 32 }}>🎙️</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#059669', fontWeight: 600, marginBottom: 6 }}>
                Listening — speak clearly
              </div>
              {/* Live transcript preview — subtle, small */}
              {liveTranscript && (
                <div style={liveBox}>{liveTranscript}</div>
              )}
              {!liveTranscript && (
                <div style={{ ...liveBox, color: '#94a3b8', fontStyle: 'italic' }}>
                  Waiting for your voice...
                </div>
              )}
              <button onClick={stopListening} style={btnStop}>
                ✓ Done speaking
              </button>
            </div>
          </div>
        )}

        {/* Processing / feedback status */}
        {(phase === 'processing' || phase === 'feedback') && (
          <div style={statusBox}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>
              {phase === 'processing' ? '⏳' : '📊'}
            </div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{statusMsg}</div>
            {lastScore !== null && phase === 'feedback' && (
              <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor(lastScore), marginTop: 8 }}>
                {Math.round(lastScore)}<span style={{ fontSize: 18, color: '#94a3b8' }}>/100</span>
              </div>
            )}
          </div>
        )}

        {/* Idle / waiting state */}
        {phase === 'idle' && (
          <div style={statusBox}>
            <div style={{ color: '#64748b' }}>Starting interview...</div>
          </div>
        )}

        {/* Finished */}
        {phase === 'finished' && (
          <div style={statusBox}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>All done!</div>
            <button onClick={finishInterview} style={{ ...btnPrimary, background: '#059669' }}>
              View Your Report
            </button>
          </div>
        )}

        {/* Hint bar */}
        <div style={hintBar}>
          🔇 No question text is shown — this is a pure voice interview
        </div>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────
const scoreColor = (s: number) => s >= 70 ? '#059669' : s >= 50 ? '#d97706' : '#dc2626';

const phaseLabel: Record<VoicePhase, string> = {
  idle: 'Preparing...',
  ai_speaking: 'Speaking question...',
  listening: 'Listening to you',
  processing: 'Scoring your answer...',
  feedback: 'Giving feedback...',
  finished: 'Interview complete',
};
const phaseColors: Record<VoicePhase, string> = {
  idle: '#94a3b8',
  ai_speaking: '#4f46e5',
  listening: '#059669',
  processing: '#d97706',
  feedback: '#0891b2',
  finished: '#059669',
};

// ── Styles ───────────────────────────────────────────────────────────
const centreStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', padding: 20,
};
const cardBoxStyle: React.CSSProperties = {
  background: 'white', borderRadius: 20, padding: '40px 36px', maxWidth: 460,
  textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
};
const rulesBox: React.CSSProperties = {
  background: '#f8fafc', borderRadius: 12, padding: '16px 20px',
  textAlign: 'left', marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10,
};
const ruleItem: React.CSSProperties = { fontSize: 14, color: '#334155', lineHeight: 1.5 };
const warnBox: React.CSSProperties = {
  background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8,
  fontSize: 13, marginBottom: 16,
};
const btnPrimary: React.CSSProperties = {
  padding: '11px 28px', borderRadius: 10, border: 'none', background: '#4f46e5',
  color: 'white', fontWeight: 700, cursor: 'pointer', fontSize: 15,
};
const btnStop: React.CSSProperties = {
  marginTop: 10, padding: '8px 20px', borderRadius: 8, border: '2px solid #059669',
  background: 'white', color: '#059669', fontWeight: 600, cursor: 'pointer', fontSize: 13,
};
const liveWrap: React.CSSProperties = {
  minHeight: '100vh', background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', padding: 16,
};
const camBox: React.CSSProperties = {
  position: 'fixed', bottom: 20, right: 20, width: 180, height: 135, borderRadius: 12,
  overflow: 'hidden', border: '2px solid #4f46e5', boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
  zIndex: 50, background: '#0f172a',
};
const camLabel: React.CSSProperties = {
  position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center',
  fontSize: 10, color: 'white', fontWeight: 700, textShadow: '0 1px 3px black',
};
const awayOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.95)', zIndex: 9999,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};
const warnBanner: React.CSSProperties = {
  position: 'fixed', top: 12, left: '50%', transform: 'translateX(-50%)',
  background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10,
  padding: '10px 20px', zIndex: 200, display: 'flex', alignItems: 'center', gap: 12,
  fontSize: 14, color: '#dc2626', boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
};
const closeBtn: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 16, cursor: 'pointer', color: '#94a3b8',
};
const centrePanel: React.CSSProperties = {
  width: '100%', maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 20,
};
const progressRow: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: 13,
};
const progressBarBg: React.CSSProperties = {
  background: '#334155', borderRadius: 6, height: 6, overflow: 'hidden',
};
const progressBarFill: React.CSSProperties = {
  height: '100%', background: '#4f46e5', borderRadius: 6, transition: 'width 0.4s',
};
const aiBox: React.CSSProperties = {
  background: '#1e293b', borderRadius: 16, padding: '20px 24px',
  display: 'flex', alignItems: 'center', gap: 16, border: '1px solid #334155',
};
const aiOrb: React.CSSProperties = {
  width: 56, height: 56, borderRadius: '50%', background: '#312e81',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  position: 'relative', flexShrink: 0,
};
const aiRing: React.CSSProperties = {
  position: 'absolute', inset: -6, borderRadius: '50%',
  border: '2px solid #818cf8', opacity: 0.6,
  animation: 'pulse-ring 1.2s ease-in-out infinite',
};
const micBox: React.CSSProperties = {
  background: '#064e3b', borderRadius: 16, padding: '20px 24px',
  display: 'flex', alignItems: 'flex-start', gap: 16, border: '1px solid #065f46',
};
const micOrb: React.CSSProperties = {
  width: 56, height: 56, borderRadius: '50%', background: '#059669',
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  animation: 'mic-pulse 1s ease-in-out infinite alternate',
};
const liveBox: React.CSSProperties = {
  fontSize: 13, color: '#a7f3d0', lineHeight: 1.5,
  maxHeight: 80, overflow: 'hidden', background: '#065f46',
  borderRadius: 8, padding: '8px 12px',
};
const statusBox: React.CSSProperties = {
  background: '#1e293b', borderRadius: 16, padding: '28px 24px',
  textAlign: 'center', border: '1px solid #334155', color: '#e2e8f0',
};
const hintBar: React.CSSProperties = {
  textAlign: 'center', fontSize: 12, color: '#475569', padding: '8px 0',
};
const wave = (h: number, i: number): React.CSSProperties => ({
  display: 'inline-block', width: 3, background: '#818cf8', borderRadius: 2,
  height: 6 + h * 4,
  animation: `wave-bar 0.5s ease-in-out ${i * 0.07}s infinite alternate`,
});
