import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, TextInput, Button, ScrollView, Platform, TouchableOpacity, Modal } from 'react-native';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '../src/config/firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { useTeacherGenerator } from '../src/hooks/useTeacherGenerator';

export default function TeacherScreen() {
  const {
    lectureId,
    setLectureId,
    qrString,
    saving,
    message,
    handleGenerate,
    stopPublishing,
  } = useTeacherGenerator();

  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [lectures, setLectures] = useState<Array<{ id: string; name?: string }>>([]);
  const [showLectureList, setShowLectureList] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace(Platform.OS === 'web' ? '/teacher-login' : '/login');
        setCheckingAuth(false);
        return;
      }

      try {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        const role = userSnap.exists() ? (userSnap.data() as any).role : null;

        if (role !== 'teacher') {
          await signOut(auth);
          // Inform and redirect
          // eslint-disable-next-line no-alert
          alert('Šiai daliai prieiti reikia dėstytojo paskyros');
          router.replace(Platform.OS === 'web' ? '/teacher-login' : '/login');
          setCheckingAuth(false);
          return;
        }
      } catch (e) {
        console.error('Role check failed', e);
        await signOut(auth);
        router.replace(Platform.OS === 'web' ? '/teacher-login' : '/login');
      }

      setCheckingAuth(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadLectures = async () => {
      try {
        const q = collection(db, 'lectures');
        const snap = await getDocs(q);
        if (!mounted) return;
        const items: Array<{ id: string; name?: string }> = [];
        snap.forEach((d) => items.push({ id: d.id, name: (d.data() as any).name }));
        setLectures(items);
      } catch (e) {
        console.error('Failed to load lectures', e);
      }
    };

    loadLectures();
    return () => { mounted = false; };
  }, []);

  // Conditionally load QR component only on web to avoid native bundle issues
  let QRCode: any = null;
  if (Platform.OS === 'web') {
    try {
      // require react-qr-code for web
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      QRCode = require('react-qr-code').default;
    } catch (e) {
      QRCode = null;
    }
  }

  const qrSize = Platform.OS === 'web' ? 320 : 180;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {checkingAuth ? (
        <Text style={{ marginTop: 20 }}>Tikrinu prisijungimą...</Text>
      ) : null}
      <View style={styles.logoutWrap}>
        <Button
          title="Atsijungti"
          onPress={async () => {
            try {
              await signOut(auth);
            } catch (e) {
              console.error('Logout failed', e);
            }
            router.replace(Platform.OS === 'web' ? '/teacher-login' : '/login');
          }}
        />
      </View>
      <Text style={styles.title}>Teacher — Generate QR for Lecture</Text>

      <View style={styles.selectorWrap}>
        <Text style={styles.selectorLabel}>Paskaita</Text>
        <TouchableOpacity
          activeOpacity={0.8}
          style={styles.selectorBox}
          onPress={() => setShowLectureList((s) => !s)}
        >
          <Text style={styles.selectorText}>{lectureId ? lectureId : 'Pasirinkite paskaitą'}</Text>
        </TouchableOpacity>

        {showLectureList && (
          <Modal
            visible={showLectureList}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowLectureList(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Pasirinkite paskaitą</Text>
                <ScrollView style={styles.lectureScroll}>
                  {lectures.length === 0 ? (
                    <Text style={styles.smallText}>Nėra paskaitų</Text>
                  ) : (
                    lectures.map((l) => (
                      <TouchableOpacity
                        key={l.id}
                        style={styles.lectureItem}
                        onPress={() => {
                          setLectureId(l.id);
                          setShowLectureList(false);
                        }}
                      >
                        <Text style={styles.lectureText}>{l.name || l.id}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                <View style={{ marginTop: 12 }}>
                  <Button title="Uždaryti" onPress={() => setShowLectureList(false)} />
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>

      {/* Duration is fixed; teachers cannot set it manually anymore */}

      <View style={styles.buttonRow}>
        <View style={styles.button}>
          <Button title={saving ? 'Saving...' : 'Generate QR'} onPress={handleGenerate} disabled={saving} />
        </View>
        {qrString ? (
          <View style={styles.button}>
            <Button title="Stop Session" onPress={stopPublishing} color="#b00020" />
          </View>
        ) : null}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {qrString ? (
        <View style={styles.qrContainer}>
          {QRCode ? (
            <View style={styles.qrImageWrap}>
              <QRCode value={qrString} size={qrSize} />
            </View>
          ) : (
            <Text selectable style={styles.qrText}>{qrString}</Text>
          )}
          <Text style={styles.hint}>Scan this QR with the student app to mark attendance.</Text>
        </View>
      ) : null}

      {Platform.OS === 'web' && (
        <Text style={styles.note}>Running on web — QR shown as JSON string for copy/scan.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1, backgroundColor: '#ffffff', alignItems: 'center' },
  title: { fontSize: 20, marginBottom: 12, color: '#111111' },
  input: {
    borderWidth: 1,
    borderColor: '#bdbdbd',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#ffffff',
    color: '#111111',
  },
  button: { marginVertical: 8, marginRight: 8 },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  message: { marginTop: 8, color: '#1a73e8' },
  qrContainer: { marginTop: 24, padding: 18, backgroundColor: '#ffffff', borderRadius: 12, borderWidth: 1, borderColor: '#ececec', alignItems: 'center', justifyContent: 'center' },
  qrImageWrap: { alignItems: 'center', justifyContent: 'center' },
  qrText: { fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, color: '#111111', textAlign: 'center' },
  hint: { marginTop: 8, color: '#333333' },
  note: { marginTop: 12, color: '#666666' },
  logoutWrap: { alignSelf: 'flex-end', marginBottom: 8 },
  selectorWrap: { width: '100%', marginBottom: 8, alignItems: 'center', position: 'relative' },
  selectorLabel: { marginBottom: 6, color: '#444' },
  selectorBox: { width: '20%', paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: '#d0d7de', borderRadius: 8, backgroundColor: '#ffffff', alignItems: 'center' },
  selectorText: { color: '#111' },
  lectureList: { position: 'absolute', top: 64, width: '20%', backgroundColor: '#ffffff', opacity: 1, borderRadius: 8, borderWidth: 1, borderColor: '#e6e9ee', maxHeight: 240, zIndex: 100000, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.12, shadowRadius: 18, elevation: 20, overflow: 'hidden' as any },
  lectureScroll: { paddingVertical: 4, backgroundColor: '#ffffff' },
  lectureItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', backgroundColor: '#ffffff' },
  lectureText: { color: '#111' },
  smallText: { color: '#777', padding: 12 },
  modalOverlay: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', maxWidth: 560, maxHeight: '70%', backgroundColor: '#fff', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#e6e9ee' },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 8, textAlign: 'center' },
});
