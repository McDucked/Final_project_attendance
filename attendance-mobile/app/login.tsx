import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform, 
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
  Text,
  TouchableOpacity
} from 'react-native';
import { TextInput, Button, Title } from 'react-native-paper';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../src/config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const router = useRouter();
  useEffect(() => {
    // If someone opens the mobile login route on web, redirect to teacher-login
    if (Platform.OS === 'web') {
      router.replace('/teacher-login');
    }
  }, []);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState({ visible: false, message: '', type: 'error' as 'error' | 'success' });

  const showError = (message: string) => {
    Keyboard.dismiss();
    setBanner({ visible: true, message, type: 'error' });
    setTimeout(() => setBanner(prev => ({ ...prev, visible: false })), 4000);
  };

  const showSuccess = (message: string) => {
    Keyboard.dismiss();
    setBanner({ visible: true, message, type: 'success' });
    setTimeout(() => setBanner(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      showError('Prašome užpildyti visus laukus');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      // Fetch user role from Firestore
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        // No user doc -> sign out and show error
        await signOut(auth);
        showError('Vartotojo informacija nerasta. Kreipkitės į administratorių.');
        return;
      }

      const userData = userSnap.data() as any;
      const role = userData?.role;

      if (role !== 'student') {
        await signOut(auth);
        showError('Šiai platformai reikia studento paskyros');
        return;
      }

      router.replace('/');
    } catch (error: any) {
      console.error('Login error', error);
      let errorMessage = 'Prisijungimo klaida';

      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Neteisingas el. paštas arba slaptažodis';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Neteisingas el. pašto formatas';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Per daug bandymų. Pabandykite vėliau';
      }

      // Append raw error code for debugging
      showError(`${errorMessage} (${error.code || 'unknown'})`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password || !name) {
      showError('Prašome užpildyti visus laukus');
      return;
    }

    if (password.length < 6) {
      showError('Slaptažodis turi būti bent 6 simbolių');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Mobile app - only for students
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: email,
        name: name,
        role: 'student', // Always student
        createdAt: new Date().toISOString(),
      });

      showSuccess('Registracija sėkminga!');
      
      setTimeout(() => {
        router.replace('/');
      }, 1000);
    } catch (error: any) {
      console.error('Register error', error);
      let errorMessage = 'Registracijos klaida';

      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Toks el. paštas jau registruotas';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Neteisingas el. pašto formatas';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Per silpnas slaptažodis';
      }

      showError(`${errorMessage} (${error.code || 'unknown'})`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {banner.visible && (
          <View style={[
            styles.banner,
            banner.type === 'error' ? styles.bannerError : styles.bannerSuccess
          ]}>
            <Text style={styles.bannerText}>{banner.message}</Text>
            <TouchableOpacity
              onPress={() => setBanner(prev => ({ ...prev, visible: false }))}
              style={styles.bannerClose}
            >
              <Text style={styles.bannerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Title style={styles.title}>
              Dalyvavimo Sistema
            </Title>
            <Title style={styles.subtitle}>
              {isRegister ? 'Registracija' : 'Prisijungimas'}
            </Title>

            {isRegister && (
              <TextInput
                label="Vardas Pavardė"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                autoCapitalize="words"
                returnKeyType="next"
                outlineStyle={styles.inputOutline}
                contentStyle={styles.inputContent}
                textColor="#1a1a1a"
                placeholderTextColor="#666"
                outlineColor="#bbb"
                activeOutlineColor="#6200ee"
              />
            )}

            <TextInput
              label="El. paštas"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              outlineStyle={styles.inputOutline}
              contentStyle={styles.inputContent}
              textColor="#1a1a1a"
              placeholderTextColor="#666"
              outlineColor="#bbb"
              activeOutlineColor="#6200ee"
            />

            <TextInput
              label="Slaptažodis"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              style={styles.input}
              secureTextEntry
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={isRegister ? handleRegister : handleLogin}
              outlineStyle={styles.inputOutline}
              contentStyle={styles.inputContent}
              textColor="#1a1a1a"
              placeholderTextColor="#666"
              outlineColor="#bbb"
              activeOutlineColor="#6200ee"
            />

            <Button
              mode="contained"
              onPress={isRegister ? handleRegister : handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              {isRegister ? 'Registruotis' : 'Prisijungti'}
            </Button>

            <Button
              mode="text"
              onPress={() => setIsRegister(!isRegister)}
              style={styles.switchButton}
            >
              {isRegister 
                ? 'Jau turite paskyrą? Prisijunkite' 
                : 'Neturite paskyros? Registruokitės'}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  banner: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 999,
    elevation: 10,
    marginHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  bannerError: {
    backgroundColor: '#f44336',
  },
  bannerSuccess: {
    backgroundColor: '#4caf50',
  },
  bannerText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  bannerClose: {
    padding: 8,
    marginLeft: 8,
  },
  bannerCloseText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bannerContent: {
    paddingVertical: 8,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    minHeight: 500,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#666',
  },
  input: {
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  inputOutline: {
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#999',
  },
  inputContent: {
    paddingVertical: 8,
    color: '#1a1a1a',
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  switchButton: {
    marginTop: 15,
  },
});
