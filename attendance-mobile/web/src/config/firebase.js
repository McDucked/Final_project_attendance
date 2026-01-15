import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC1PqA4Jw2pGjwKSjJsLfMyNAMJJS5gqiY",
  authDomain: "final-project-2b4d0.firebaseapp.com",
  projectId: "final-project-2b4d0",
  storageBucket: "final-project-2b4d0.appspot.com",
  messagingSenderId: "880684191796",
  appId: "1:880684191796:web:7d66c269bf78ac2997ba61"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

export { auth, db, realtimeDb };
export default app;
