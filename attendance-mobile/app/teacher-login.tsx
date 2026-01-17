import React, { useState } from 'react';
import { Platform, View, Text, StyleSheet } from 'react-native';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../src/config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function TeacherLogin() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.notice}>Šis prisijungimo puslapis skirtas tik dėstytojams per naršyklę. Naudokite mobilų aplikaciją kaip studentas.</Text>
      </View>
    );
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setMessage(null);

    if (!email || !password) {
      setMessage('Prašome įvesti el. paštą ir slaptažodį');
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userSnap = await getDoc(doc(db, 'users', cred.user.uid));

      if (!userSnap.exists() || (userSnap.data() as any).role !== 'teacher') {
        await signOut(auth);
        setMessage('Reikalinga dėstytojo paskyra.');
        setLoading(false);
        return;
      }

      router.replace('/teacher');
    } catch (err: any) {
      console.error('Teacher login error', err);
      const code = err?.code;
      let text = 'Prisijungimo klaida';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password') text = 'Neteisingas el. paštas arba slaptažodis';
      else if (code === 'auth/invalid-email') text = 'Neteisingas el. pašto formatas';
      setMessage(`${text} ${code ? `(${code})` : ''}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={webStyles.page}>
      <div style={webStyles.card}>
        <h2 style={{ marginBottom: 8 }}>Dėstytojo prisijungimas</h2>
        {message ? <div style={webStyles.error}>{message}</div> : null}
        <form onSubmit={handleSubmit} style={webStyles.form}>
          <label style={webStyles.label}>
            El. paštas
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={webStyles.input}
              autoComplete="username"
            />
          </label>

          <label style={webStyles.label}>
            Slaptažodis
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={webStyles.input}
              autoComplete="current-password"
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center', marginTop: 12 }}>
            <button type="submit" style={webStyles.button} disabled={loading}>{loading ? 'Kraunama...' : 'Prisijungti'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  notice: { fontSize: 16, color: '#333' },
});

const webStyles: { [k: string]: React.CSSProperties } = {
  page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' },
  card: { width: 420, padding: 24, borderRadius: 8, background: '#fff', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' },
  form: { display: 'flex', flexDirection: 'column' },
  label: { marginBottom: 10, display: 'flex', flexDirection: 'column', fontSize: 14, color: '#222' },
  input: { marginTop: 6, padding: '10px 12px', fontSize: 14, borderRadius: 6, border: '1px solid #ccc' },
  button: { padding: '10px 16px', background: '#6200ee', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' },
  link: { padding: '8px 12px', background: 'transparent', color: '#6200ee', border: 'none', cursor: 'pointer', textDecoration: 'underline' },
  error: { marginBottom: 8, color: '#b00020' },
};
