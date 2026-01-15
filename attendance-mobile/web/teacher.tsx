import React from 'react';
import QRCode from 'react-qr-code';
import { useTeacherGenerator } from '../src/hooks/useTeacherGenerator';

export default function TeacherPage() {
  const {
    lectureId,
    setLectureId,
    duration,
    setDuration,
    qrString,
    saving,
    message,
    handleGenerate,
  } = useTeacherGenerator();

  return (
    <div style={{ padding: 16 }}>
      <h2>Teacher — Generate QR for Lecture</h2>
      <div style={{ marginBottom: 8 }}>
        <input placeholder="Lecture ID" value={lectureId} onChange={(e) => setLectureId(e.target.value)} />
      </div>
      <div style={{ marginBottom: 8 }}>
        <input placeholder="Duration (seconds)" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </div>
      <button onClick={handleGenerate} disabled={saving}>{saving ? 'Saving...' : 'Generate QR'}</button>

      {message ? <div style={{ marginTop: 8 }}>{message}</div> : null}

      {qrString ? (
        <div style={{ marginTop: 16 }}>
          <QRCode value={qrString} />
          <div style={{ marginTop: 8, color: '#555' }}>Scan this QR with student app to mark attendance.</div>
        </div>
      ) : null}
    </div>
  );
}
