import { Redirect } from 'expo-router';
import { auth } from '../src/config/firebase';

export default function IndexRedirect() {
  const user = auth.currentUser;
  
  if (!user || !user.email) {
    return <Redirect href="/login" />;
  }
  
  return <Redirect href="/(tabs)" />;
}
