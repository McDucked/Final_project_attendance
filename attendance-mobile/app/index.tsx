import React, { useEffect } from 'react';
import { View, StyleSheet, Button, Text, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../src/config/firebase';

export default function ModeChooser() {
  const router = useRouter();

  useEffect(() => {
    // Auto-redirect: web -> teacher, native (Expo Go) -> student tabs
    if (Platform.OS === 'web') {
      router.replace('/teacher-login');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      router.replace('/login');
    } else {
      router.replace('/(tabs)');
    }
  }, []);

  const goStudent = () => router.push('/(tabs)');
  const goTeacher = () => router.push('/teacher');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paleidžiama...</Text>
      <View style={styles.button}>
        <Button title="Student App" onPress={goStudent} />
      </View>
      <View style={styles.button}>
        <Button title="Teacher (Web)" onPress={goTeacher} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, textAlign: 'center', marginBottom: 24 },
  button: { marginVertical: 8 },
});
