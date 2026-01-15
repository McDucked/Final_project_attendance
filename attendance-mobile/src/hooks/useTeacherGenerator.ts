import { useState } from 'react';
import { generateTimeLimitedQR } from '../utils/qrCodeGenerator';
import { db } from '../config/firebase';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';

export function useTeacherGenerator() {
  const [lectureId, setLectureId] = useState('');
  const [duration, setDuration] = useState('60');
  const [qrString, setQrString] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleGenerate() {
    if (!lectureId) {
      setMessage('Enter a lecture ID');
      return;
    }
    setMessage(null);
    const dur = parseInt(duration || '60', 10) || 60;
    const generated = generateTimeLimitedQR(lectureId, dur);
    setQrString(generated);

    try {
      setSaving(true);
      const payload = JSON.parse(generated);
      await addDoc(collection(db, 'sessions'), payload);

      // Ensure the lecture document is stored using the provided lectureId
      // as the Firestore document ID so the mobile scanner can look it up
      // with `doc(db, 'lectures', lectureId)`.
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
  }

  return {
    lectureId,
    setLectureId,
    duration,
    setDuration,
    qrString,
    saving,
    message,
    setMessage,
    handleGenerate,
  } as const;
}
