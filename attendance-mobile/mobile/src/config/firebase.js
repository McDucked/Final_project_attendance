import { initializeApp } from 'firebase/app';
import { initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyC1PqA4Jw2pGjwKSjJsLfMyNAMJJS5gqiY",
  authDomain: "final-project-2b4d0.firebaseapp.com",
  projectId: "final-project-2b4d0",
  storageBucket: "final-project-2b4d0.firebasestorage.app",
  messagingSenderId: "880684191796",
  appId: "1:880684191796:web:7d66c269bf78ac2997ba61"
};

const app = initializeApp(firebaseConfig);
let auth;
try {
  // Try to use React Native persistence when available (native apps)
  const rnAuth = require('firebase/auth/react-native');
  const getReactNativePersistence = rnAuth && (rnAuth.getReactNativePersistence || rnAuth.default?.getReactNativePersistence);
  if (typeof getReactNativePersistence === 'function') {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage)
    });
  } else {
    auth = initializeAuth(app);
  }
} catch (e) {
  // Fallback for web or environments where react-native persistence is unavailable
  auth = initializeAuth(app);
}
const db = getFirestore(app);
const realtimeDb = getDatabase(app);

export { auth, db, realtimeDb };
export default app;
