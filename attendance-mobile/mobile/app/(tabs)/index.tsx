import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, ScrollView } from 'react-native';
import { Card, Title, Paragraph, FAB, Appbar, Chip, SegmentedButtons } from 'react-native-paper';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { auth, db } from '../../../src/config/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

// Configure Lithuanian locale for calendar
LocaleConfig.locales['lt'] = {
  monthNames: [
    'Sausis', 'Vasaris', 'Kovas', 'Balandis', 'Gegužė', 'Birželis',
    'Liepa', 'Rugpjūtis', 'Rugsėjis', 'Spalis', 'Lapkritis', 'Gruodis'
  ],
  monthNamesShort: ['Sau.', 'Vas.', 'Kov.', 'Bal.', 'Geg.', 'Bir.', 'Lie.', 'Rugp.', 'Rugs.', 'Spal.', 'Lap.', 'Gr.'],
  dayNames: ['Sekmadienis', 'Pirmadienis', 'Antradienis', 'Trečiadienis', 'Ketvirtadienis', 'Penktadienis', 'Šeštadienis'],
  dayNamesShort: ['S', 'P', 'A', 'T', 'K', 'Pn', 'Š'],
  today: 'Šiandien'
};
LocaleConfig.defaultLocale = 'lt';

const toDate = (ts: any) => {
  if (!ts) return new Date();
  if (typeof (ts as any)?.toDate === 'function') return (ts as any).toDate();
  if (typeof ts === 'number') return new Date(ts);
  return new Date(ts);
};
export default function HomeScreen() {
  const router = useRouter();
  const [attendances, setAttendances] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'calendar'
  const [selectedDate, setSelectedDate] = useState('');
  const [markedDates, setMarkedDates] = useState<any>({});

  useEffect(() => {
    loadAttendances();
  }, []);

  const loadAttendances = async () => {
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Get student's attendances
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('studentId', '==', user.uid)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendancesList: any[] = [];
      const attendedLectureIds = new Set<string>();
      const dates: any = {};
      
      attendanceSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const attendance = {
          id: docSnapshot.id,
          ...data,
        };
        attendancesList.push(attendance);
        attendedLectureIds.add(data.lectureId);
        
        // Mark attended dates on calendar with green dot
        const date = toDate(data.timestamp);
        const dateString = date.toISOString().split('T')[0];
        
        if (!dates[dateString]) {
          dates[dateString] = {
            marked: true,
            dots: [{ color: '#4CAF50' }],
            attendances: [],
            missedLectures: []
          };
        } else if (!dates[dateString].dots.some((d: any) => d.color === '#4CAF50')) {
          dates[dateString].dots.push({ color: '#4CAF50' });
        }
        dates[dateString].attendances.push(attendance);
      });

      // Get all lectures to find missed ones
      try {
        const lecturesQuery = query(collection(db, 'lectures'));
        const lecturesSnapshot = await getDocs(lecturesQuery);
        
        lecturesSnapshot.forEach((docSnapshot) => {
          const lectureData = docSnapshot.data();
          const lectureId = docSnapshot.id;
        
        // Check if student didn't attend this lecture
          if (!attendedLectureIds.has(lectureId) && lectureData.date) {
          const lectureDate = toDate(lectureData.date);
          const dateString = lectureDate.toISOString().split('T')[0];
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // Only mark as missed if lecture date has passed
          if (lectureDate < today) {
            if (!dates[dateString]) {
              dates[dateString] = {
                marked: true,
                dots: [{ color: '#F44336' }],
                attendances: [],
                missedLectures: []
              };
            } else if (!dates[dateString].dots.some((d: any) => d.color === '#F44336')) {
              dates[dateString].dots.push({ color: '#F44336' });
            }
            
            dates[dateString].missedLectures.push({
              id: lectureId,
              name: lectureData.name || 'Paskaita',
              date: lectureData.date
            });
          }
        }
        });
      } catch (lecturesError) {
        console.error('Error loading lectures:', lecturesError);
      }
      
      // Sort in JavaScript instead of Firestore
      attendancesList.sort((a, b) => {
        return toDate(b.timestamp).getTime() - toDate(a.timestamp).getTime();
      });
      
      setAttendances(attendancesList);
      setMarkedDates(dates);
    } catch (error) {
      console.error('Error loading attendances:', error);
    } finally {
      setLoading(false);
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

  const renderAttendanceItem = ({ item }: { item: any }) => {
    const date = toDate(item.timestamp);
    return (
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Title numberOfLines={1} style={styles.cardTitle}>
              {item.lectureName || 'Paskaita'}
            </Title>
            <Chip mode="flat" style={styles.attendedChip} textStyle={styles.chipText}>
              Dalyvavo
            </Chip>
          </View>
          <Paragraph style={styles.dateText}>
            {date.toLocaleDateString('lt-LT')} {date.toLocaleTimeString('lt-LT', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Paragraph>
          <Paragraph style={styles.subtitle}>
            Metodas: {item.method === 'qr' ? 'QR kodas' : 'Rankinis'}
          </Paragraph>
        </Card.Content>
      </Card>
    );
  };

  const getFilteredAttendances = () => {
    if (!selectedDate) return attendances;
    
    return attendances.filter(item => {
      const itemDate = toDate(item.timestamp).toISOString().split('T')[0];
      return itemDate === selectedDate;
    });
  };

  const handleDayPress = (day: any) => {
    setSelectedDate(day.dateString);
  };

  const renderCalendarView = () => {
    const filteredAttendances = getFilteredAttendances();
    
    return (
      <ScrollView 
        style={styles.calendarContainer}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadAttendances} />
        }
      >
        <Calendar
          markedDates={{
            ...markedDates,
            ...(selectedDate && {
              [selectedDate]: {
                ...markedDates[selectedDate],
                selected: true,
                selectedColor: '#2196F3',
              }
            })
          }}
          onDayPress={handleDayPress}
          theme={{
            todayTextColor: '#2196F3',
            arrowColor: '#2196F3',
            monthTextColor: '#2196F3',
            textMonthFontWeight: 'bold',
          }}
        />
        
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
            <Paragraph style={styles.legendText}>Dalyvavo</Paragraph>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#F44336' }]} />
            <Paragraph style={styles.legendText}>Nedalyvavo</Paragraph>
          </View>
        </View>

        {selectedDate && (
          <View style={styles.selectedDateContainer}>
            <Title style={styles.selectedDateTitle}>
              {new Date(selectedDate).toLocaleDateString('lt-LT', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </Title>
            
            {/* Show attended lectures */}
            {filteredAttendances.length > 0 && (
              <>
                <Title style={styles.sectionTitle}>Dalyvavo:</Title>
                {filteredAttendances.map(item => (
                  <View key={item.id}>
                    {renderAttendanceItem({ item })}
                  </View>
                ))}
              </>
            )}
            
            {/* Show missed lectures */}
            {markedDates[selectedDate]?.missedLectures?.length > 0 && (
              <>
                <Title style={styles.sectionTitleMissed}>Nedalyvavo:</Title>
                {markedDates[selectedDate].missedLectures.map((lecture: any) => (
                  <Card key={lecture.id} style={styles.missedCard}>
                    <Card.Content>
                      <View style={styles.cardHeader}>
                        <Title numberOfLines={1} style={styles.cardTitle}>
                          {lecture.name}
                        </Title>
                        <Chip mode="flat" style={styles.missedChip} textStyle={styles.missedChipText}>
                          Nedalyvavo
                        </Chip>
                      </View>
                      <Paragraph style={styles.dateText}>
                        {new Date(lecture.date).toLocaleDateString('lt-LT')} {new Date(lecture.date).toLocaleTimeString('lt-LT', { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </Paragraph>
                    </Card.Content>
                  </Card>
                ))}
              </>
            )}
            
            {filteredAttendances.length === 0 && (!markedDates[selectedDate]?.missedLectures || markedDates[selectedDate].missedLectures.length === 0) && (
              <Paragraph style={styles.noAttendancesText}>
                Šią dieną paskaitų nėra
              </Paragraph>
            )}
          </View>
        )}

        {!selectedDate && attendances.length > 0 && (
          <View style={styles.hintContainer}>
            <Paragraph style={styles.hintText}>
              Paspauskite ant datos, kad pamatytumėte tos dienos dalyvavimus
            </Paragraph>
          </View>
        )}

        {!selectedDate && attendances.length === 0 && (
          <View style={styles.emptyContainer}>
            <Title style={styles.emptyTitle}>Dalyvavimų dar nėra</Title>
            <Paragraph style={styles.emptyHint}>
              Nuskenuokite dėstytojo QR kodą paskaitos metu
            </Paragraph>
          </View>
        )}
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Mano Dalyvavimai" />
        <Appbar.Action icon="refresh" onPress={loadAttendances} />
      </Appbar.Header>

      <SegmentedButtons
        value={viewMode}
        onValueChange={setViewMode}
        buttons={[
          {
            value: 'list',
            label: 'Sąrašas',
            icon: 'format-list-bulleted',
            style: viewMode === 'list' ? styles.selectedButton : styles.unselectedButton,
            labelStyle: viewMode === 'list' ? styles.selectedLabel : styles.unselectedLabel,
          },
          {
            value: 'calendar',
            label: 'Kalendorius',
            icon: 'calendar',
            style: viewMode === 'calendar' ? styles.selectedButton : styles.unselectedButton,
            labelStyle: viewMode === 'calendar' ? styles.selectedLabel : styles.unselectedLabel,
          },
        ]}
        style={styles.segmentedButtons}
      />

      {viewMode === 'list' ? (
        <FlatList
          data={attendances}
          renderItem={renderAttendanceItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadAttendances} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Title style={styles.emptyTitle}>Dalyvavimų dar nėra</Title>
              <Paragraph style={styles.emptyHint}>
                Nuskenuokite dėstytojo QR kodą paskaitos metu
              </Paragraph>
            </View>
          }
        />
      ) : (
        renderCalendarView()
      )}

      <FAB
        icon="qrcode-scan"
        style={styles.fab}
        onPress={() => router.push('/qr-scanner')}
        label="Skenuoti QR"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  segmentedButtons: {
    margin: 15,
    marginBottom: 10,
  },
  selectedButton: {
    backgroundColor: '#2196F3',
  },
  unselectedButton: {
    backgroundColor: '#fff',
  },
  selectedLabel: {
    color: '#fff',
    fontWeight: 'bold',
  },
  unselectedLabel: {
    color: '#000',
    fontWeight: 'normal',
  },
  list: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
    elevation: 3,
  },
  missedCard: {
    marginBottom: 15,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#F44336',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  cardTitle: {
    flex: 1,
    marginRight: 8,
  },
  attendedChip: {
    height: 28,
    backgroundColor: '#E8F5E9',
  },
  missedChip: {
    height: 28,
    backgroundColor: '#FFEBEE',
  },
  chipText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: 'bold',
  },
  missedChipText: {
    fontSize: 11,
    color: '#C62828',
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: 10,
    color: '#999',
    textAlign: 'center',
  },
  calendarContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  selectedDateContainer: {
    padding: 15,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 15,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitleMissed: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#F44336',
    marginTop: 20,
    marginBottom: 10,
  },
  noAttendancesText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 14,
  },
  hintContainer: {
    padding: 20,
    alignItems: 'center',
  },
  hintText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
  },
});
