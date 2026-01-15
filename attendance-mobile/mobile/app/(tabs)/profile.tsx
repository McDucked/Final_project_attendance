import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, Appbar, Divider, Avatar } from 'react-native-paper';
import { auth, db } from '../../../src/config/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const [userData, setUserData] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0 });

  useEffect(() => {
    loadUserData();
    loadStats();
  }, []);
  const loadUserData = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        setUserData(userDoc.data());
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const q = query(
        collection(db, 'attendance'),
        where('studentId', '==', user.uid)
      );

      const querySnapshot = await getDocs(q);
      const total = querySnapshot.size;

      setStats({ total });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.replace('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = () => {
    if (!userData?.name) return '?';
    const names = userData.name.split(' ');
    return names.map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Profilis" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Text 
              size={80} 
              label={getInitials()} 
              style={styles.avatar}
            />
            <Title style={styles.name}>{userData?.name || 'Vartotojas'}</Title>
            <Paragraph style={styles.email}>{auth.currentUser?.email}</Paragraph>
            {userData?.studentId && (
              <Paragraph style={styles.studentId}>ID: {userData.studentId}</Paragraph>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.statsCard}>
          <Card.Content>
            <Title style={styles.statsTitle}>Dalyvavimų statistika</Title>
            <Divider style={styles.divider} />
            
            <View style={styles.statRow}>
              <Paragraph style={styles.statLabel}>Užfiksuota dalyvavimų:</Paragraph>
              <Title style={styles.statValue}>{stats.total}</Title>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.infoCard}>
          <Card.Content>
            <Title style={styles.infoTitle}>Kaip veikia?</Title>
            <Divider style={styles.divider} />
            
            <Paragraph style={styles.infoParagraph}>
              • Dėstytojas sukuria QR kodą paskaitos metu
            </Paragraph>
            <Paragraph style={styles.infoParagraph}>
              • Nuskenuokite QR kodą savo telefonu
            </Paragraph>
            <Paragraph style={styles.infoParagraph}>
              • Dalyvavimas bus automatiškai užfiksuotas
            </Paragraph>
            <Paragraph style={styles.infoParagraph}>
              • Peržiūrėkite savo dalyvavimus sąraše arba kalendoriuje
            </Paragraph>
          </Card.Content>
        </Card>

        <Button 
          mode="contained" 
          onPress={handleLogout}
          style={styles.logoutButton}
          icon="logout"
        >
          Atsijungti
        </Button>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 15,
  },
  profileCard: {
    marginBottom: 15,
    elevation: 3,
  },
  profileContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    marginBottom: 15,
    backgroundColor: '#6200ee',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  studentId: {
    fontSize: 12,
    color: '#999',
  },
  statsCard: {
    marginBottom: 15,
    elevation: 3,
  },
  statsTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  divider: {
    marginBottom: 15,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  statLabel: {
    fontSize: 16,
    color: '#666',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  verified: {
    color: '#4caf50',
  },
  pending: {
    color: '#ff9800',
  },
  infoCard: {
    marginBottom: 15,
  },
  infoTitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  infoParagraph: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  logoutButton: {
    marginTop: 10,
    marginBottom: 30,
  },
});
