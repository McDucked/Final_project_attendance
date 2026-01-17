import { useState, useRef, useEffect } from 'react';
import { generateTimeLimitedQR } from '../utils/qrCodeGenerator';
import { db } from '../config/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export function useTeacherGenerator() {
  const [lectureId, setLectureId] = useState('');
  // fixed duration (seconds) — no longer configurable by teacher UI
  const FIXED_DURATION = 60;
  const [qrString, setQrString] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  async function handleGenerate() {
    if (!lectureId) {
      setMessage('Enter a lecture ID');
      return;
    }
    setMessage(null);
    const dur = FIXED_DURATION;
    // Helper to generate and publish one QR
    const publishOnce = async () => {
      const generated = generateTimeLimitedQR(lectureId, dur);
      setQrString(generated);

      try {
        setSaving(true);
        const payload = JSON.parse(generated);
        await addDoc(collection(db, 'sessions'), payload);

        await setDoc(
          doc(db, 'lectures', lectureId),
          {
            name: lectureId,
            currentToken: payload.token,
            status: 'active',
            tokenExpiresAt: payload.expiresAt,
            date: new Date().toISOString(),
          },
          { merge: true }
        );

        setMessage('Session published');
      } catch (_err) {
        setMessage('Failed to save session');
      } finally {
        setSaving(false);
      }
    };

    // Publish immediately
    await publishOnce();

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start auto-refresh every 10 seconds
    const id = setInterval(() => {
      // fire and forget
      publishOnce();
    }, 10000) as unknown as number;

    intervalRef.current = id;
  }

  // Stop automatic publishing (e.g., end session)
  function stopPublishing() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setQrString(null);
    setMessage('Session stopped');
  }

  return {
    lectureId,
    setLectureId,
    qrString,
    saving,
    message,
    setMessage,
    handleGenerate,
    stopPublishing,
  } as const;
}
