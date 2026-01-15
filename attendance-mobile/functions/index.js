const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// When a session is created, set lecture currentToken/status
exports.onSessionCreate = functions.firestore
  .document('sessions/{sessionId}')
  .onCreate(async (snap) => {
    const payload = snap.data();
    const lectureId = payload.lectureId;
    if (!lectureId) return null;

    const lectureRef = db.doc(`lectures/${lectureId}`);
    try {
      const lectureSnap = await lectureRef.get();
      if (lectureSnap.exists) {
        return lectureRef.update({
          currentToken: payload.token,
          status: 'active',
          tokenExpiresAt: payload.expiresAt
        });
      } else {
        return db.collection('lectures').add({
          name: lectureId,
          currentToken: payload.token,
          status: 'active',
          tokenExpiresAt: payload.expiresAt,
          date: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    } catch (err) {
      console.error('onSessionCreate error', err);
      return null;
    }
  });

// Scheduled cleanup: clear expired tokens on lectures
exports.cleanupExpired = functions.pubsub.schedule('every 1 minutes').onRun(async (context) => {
  const now = Date.now();
  try {
    const q = await db.collection('lectures').where('tokenExpiresAt', '<=', now).get();
    const batch = db.batch();
    q.forEach(docSnap => {
      batch.update(docSnap.ref, { currentToken: null, status: 'inactive', tokenExpiresAt: null });
    });
    return batch.commit();
  } catch (err) {
    console.error('cleanupExpired error', err);
    return null;
  }
});
