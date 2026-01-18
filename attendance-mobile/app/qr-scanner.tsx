import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { Button, ActivityIndicator, Appbar, Snackbar } from 'react-native-paper';
import { auth, db } from '../src/config/firebase';
import { doc, getDoc, addDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function QRScannerScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '' });

  useEffect(() => {
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(cameraStatus === 'granted');
  };

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setLoading(true);

    try {
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch {
        setSnackbar({ visible: true, message: 'Neteisingas QR kodo formatas' });
        setLoading(false);
        setTimeout(() => setScanned(false), 2000);
        return;
      }

      const { lectureId, token, expiresAt } = qrData;

      // Check if QR code has expired
      const now = Date.now();
      if (!expiresAt || now > expiresAt) {
        setSnackbar({ visible: true, message: 'QR kodas nebegalioja' });
        setLoading(false);
        setTimeout(() => setScanned(false), 2000);
        return;
      }

      // Verify lecture exists and is active
      const lectureDoc = await getDoc(doc(db, 'lectures', lectureId));
      
      if (!lectureDoc.exists()) {
        setSnackbar({ visible: true, message: 'Paskaita nerasta' });
        setLoading(false);
        setTimeout(() => setScanned(false), 2000);
        return;
      }

      const lectureData = lectureDoc.data();
      
      if (lectureData.status !== 'active') {
        setSnackbar({ visible: true, message: 'Paskaita jau pasibaigė' });
        setLoading(false);
        setTimeout(() => setScanned(false), 2000);
        return;
      }

      // Verify token matches
      if (lectureData.currentToken !== token) {
        setSnackbar({ visible: true, message: 'Neteisingas QR kodas' });
        setLoading(false);
        setTimeout(() => setScanned(false), 2000);
        return;
      }

      // Require logged-in user
      const uid = auth.currentUser?.uid;
      if (!uid) {
        setSnackbar({ visible: true, message: 'Prašome prisijungti prieš skenuojant' });
        setLoading(false);
        setTimeout(() => setScanned(false), 2000);
        return;
      }

      // Check if already attended (token match or same-day attendance)
      const existingAttendance = await checkExistingAttendance(lectureId, token);
      if (existingAttendance) {
        setSnackbar({ visible: true, message: 'Dalyvavimas jau užfiksuotas' });
        setLoading(false);
        setTimeout(() => setScanned(false), 2000);
        return;
      }

      // Record attendance
      await addDoc(collection(db, 'attendance'), {
        lectureId: lectureId,
        lectureName: lectureData.name || 'Paskaita',
        studentId: uid,
        timestamp: serverTimestamp(),
        method: 'qr',
        token: token,
      });

      Alert.alert(
        'Sėkmė!',
        'Dalyvavimas užfiksuotas',
        [{ text: 'OK', onPress: () => router.back() }]
      );

    } catch (error: any) {
      console.error('Error recording attendance:', error);
      setSnackbar({ visible: true, message: 'Klaida: ' + error.message });
      setTimeout(() => setScanned(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingAttendance = async (lectureId: string, token?: string) => {
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) return false;

      // 1) If token provided, prefer exact token match (same session)
      if (token) {
        const tq = query(
          collection(db, 'attendance'),
          where('lectureId', '==', lectureId),
          where('studentId', '==', uid),
          where('token', '==', token)
        );
        const tsnap = await getDocs(tq);
        if (!tsnap.empty) return true;
      }

      // 2) Fetch all attendances for this lecture+student and check client-side for same-day
      const fallbackQ = query(
        collection(db, 'attendance'),
        where('lectureId', '==', lectureId),
        where('studentId', '==', uid)
      );
      const fbSnap = await getDocs(fallbackQ);
      const now = new Date();
      for (const docSnap of fbSnap.docs) {
        const data = docSnap.data();
        const tsVal = data.timestamp;
        let dt: Date | null = null;
        if (tsVal && typeof tsVal === 'object' && typeof tsVal.toDate === 'function') {
          dt = tsVal.toDate();
        } else if (typeof tsVal === 'string') {
          const parsed = new Date(tsVal);
          if (!isNaN(parsed.getTime())) dt = parsed;
        }
        if (dt) {
          if (
            dt.getFullYear() === now.getFullYear() &&
            dt.getMonth() === now.getMonth() &&
            dt.getDate() === now.getDate()
          ) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking attendance:', error);
      return false;
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Skenuoti QR kodą" />
        </Appbar.Header>
        <View style={styles.content}>
          <Text style={styles.text}>Reikalingas leidimas naudoti kamerą</Text>
          <Button mode="contained" onPress={requestPermissions}>
            Suteikti leidimus
          </Button>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Skenuoti QR kodą" />
      </Appbar.Header>

      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Fiksuojama...</Text>
            </View>
          )}
        </View>
      </CameraView>

      {scanned && !loading && (
        <Button
          mode="contained"
          onPress={() => setScanned(false)}
          style={styles.rescanButton}
        >
          Skenuoti dar kartą
        </Button>
      )}

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar({ ...snackbar, visible: false })}
        duration={3000}
      >
        {snackbar.message}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
  },
  text: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  rescanButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
  },
});
