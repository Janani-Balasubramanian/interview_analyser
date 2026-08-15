/**
 * Proctoring utilities for the interview platform
 * - Mobile detection
 * - Tab switching / window blur
 * - Fullscreen enforcement
 * - Copy-paste detection
 * - Webcam check
 */

export function isMobileDevice(): boolean {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth <= 768;

  return mobileRegex.test(ua) || (isTouch && isSmallScreen);
}

export type TabViolation = {
  count: number;
  lastLeftAt: number | null;
  totalTimeAwayMs: number;
};

export function createTabMonitor(onViolation: (info: TabViolation) => void) {
  let count = 0;
  let lastLeftAt: number | null = null;
  let totalTimeAwayMs = 0;
  let isAway = false;

  const handleVisibility = () => {
    if (document.hidden) {
      if (!isAway) {
        isAway = true;
        lastLeftAt = Date.now();
        count += 1;
        onViolation({ count, lastLeftAt, totalTimeAwayMs });
      }
    } else {
      if (isAway && lastLeftAt) {
        totalTimeAwayMs += Date.now() - lastLeftAt;
        isAway = false;
        onViolation({ count, lastLeftAt: null, totalTimeAwayMs });
      }
    }
  };

  const handleBlur = () => {
    if (!document.hidden && !isAway) {
      isAway = true;
      lastLeftAt = Date.now();
      count += 1;
      onViolation({ count, lastLeftAt, totalTimeAwayMs });
    }
  };

  const handleFocus = () => {
    if (isAway && lastLeftAt) {
      totalTimeAwayMs += Date.now() - lastLeftAt;
      isAway = false;
      onViolation({ count, lastLeftAt: null, totalTimeAwayMs });
    }
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('blur', handleBlur);
    window.removeEventListener('focus', handleFocus);
  };
}

/** Request fullscreen and monitor exits */
export function createFullscreenMonitor(onExit: (exitCount: number) => void) {
  let exitCount = 0;

  const requestFs = async () => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
      else if ((el as any).msRequestFullscreen) await (el as any).msRequestFullscreen();
    } catch (e) {
      console.warn('Fullscreen request failed', e);
    }
  };

  const handleFsChange = () => {
    const isFs = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    );
    if (!isFs) {
      exitCount += 1;
      onExit(exitCount);
      setTimeout(() => {
        requestFs();
      }, 800);
    }
  };

  document.addEventListener('fullscreenchange', handleFsChange);
  document.addEventListener('webkitfullscreenchange', handleFsChange);
  document.addEventListener('msfullscreenchange', handleFsChange);

  requestFs();

  return {
    requestFs,
    cleanup: () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('msfullscreenchange', handleFsChange);
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => {});
      }
    },
  };
}

/** Strict copy-paste & shortcut blocker */
export function createCopyPasteGuard(onAttempt: (count: number) => void) {
  let count = 0;

  const block = (e: Event) => {
    e.preventDefault();
    count += 1;
    onAttempt(count);
  };

  const keyHandler = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    const isBlockedCombo =
      (e.ctrlKey || e.metaKey) &&
      ['c', 'v', 'x', 'a', 'u', 's', 'p', 't', 'n', 'w'].includes(key);

    const isDevTools =
      e.key === 'F12' ||
      ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(key));

    if (isBlockedCombo || isDevTools) {
      e.preventDefault();
      count += 1;
      onAttempt(count);
    }
  };

  document.addEventListener('copy', block);
  document.addEventListener('cut', block);
  document.addEventListener('paste', block);
  document.addEventListener('contextmenu', block);
  document.addEventListener('keydown', keyHandler);

  return () => {
    document.removeEventListener('copy', block);
    document.removeEventListener('cut', block);
    document.removeEventListener('paste', block);
    document.removeEventListener('contextmenu', block);
    document.removeEventListener('keydown', keyHandler);
  };
}

/** Basic webcam check */
export async function requestWebcam(): Promise<MediaStream | null> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } },
      audio: false,
    });
    return stream;
  } catch (err) {
    console.warn('Webcam access denied or unavailable', err);
    return null;
  }
}
