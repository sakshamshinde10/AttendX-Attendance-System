import { useState, useEffect, useRef } from 'react';
import { QR_EXPIRY_SECONDS } from '../constants/config';

export const useQRTimer = (onExpire?: () => void) => {
  const [timeLeft, setTimeLeft] = useState(QR_EXPIRY_SECONDS);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, []);

  const startTimer = () => {
    stopTimer();
    setTimeLeft(QR_EXPIRY_SECONDS);
    setProgress(100);

    const startTime = Date.now();
    const durationMs = QR_EXPIRY_SECONDS * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingMs = Math.max(0, durationMs - elapsed);
      const seconds = Math.ceil(remainingMs / 1000);

      setTimeLeft(seconds);
      setProgress((remainingMs / durationMs) * 100);

      if (remainingMs <= 0) {
        stopTimer();
        if (onExpire) onExpire();
        // Auto reset
        startTimer();
      }
    }, 500);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetTimer = () => {
    startTimer();
  };

  return { timeLeft, progress, resetTimer };
};
