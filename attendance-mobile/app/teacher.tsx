import React from 'react';
import { View, StyleSheet, Text, TextInput, Button, ScrollView, Platform } from 'react-native';
import { useTeacherGenerator } from '../src/hooks/useTeacherGenerator';

export default function TeacherScreen() {
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Teacher — Generate QR for Lecture</Text>

      <TextInput
        style={styles.input}
        placeholder="Lecture ID"
        value={lectureId}
        onChangeText={setLectureId}
      />

      <TextInput
        style={styles.input}
        placeholder="Duration (seconds)"
        value={duration}
        keyboardType="numeric"
        onChangeText={setDuration}
      />

      <View style={styles.button}>
        <Button title={saving ? 'Saving...' : 'Generate QR'} onPress={handleGenerate} disabled={saving} />
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      {qrString ? (
        <View style={styles.qrContainer}>
          {QRCode ? (
            <View style={styles.qrImageWrap}>
              <QRCode value={qrString} size={180} />
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
  container: { padding: 16, flexGrow: 1, backgroundColor: '#ffffff' },
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
  button: { marginVertical: 8 },
  message: { marginTop: 8, color: '#1a73e8' },
  qrContainer: { marginTop: 16, padding: 12, backgroundColor: '#ffffff', borderRadius: 8, borderWidth: 1, borderColor: '#ececec' },
  qrText: { fontFamily: Platform.OS === 'web' ? 'monospace' : undefined, color: '#111111' },
  hint: { marginTop: 8, color: '#333333' },
  note: { marginTop: 12, color: '#666666' },
});
