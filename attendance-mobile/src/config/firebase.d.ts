import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Database } from 'firebase/database';

export const auth: Auth;
export const db: Firestore;
export const realtimeDb: Database;
export default {} as any;
