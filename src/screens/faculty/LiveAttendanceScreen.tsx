import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { attendanceApi } from '../../api/attendance.api';

const STATUS_COLORS: Record<string, string> = {
  present: '#10B981',
  flagged: '#F59E0B',
  rejected: '#EF4444',
};

const getInitials = (name: string) =>
  name
    ? name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'ST';

export const LiveAttendanceScreen = ({ route, navigation }: any) => {
  const session = route.params?.session || {};
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleEndSession = () => {
    Alert.alert(
      'End Attendance Session',
      'Are you sure you want to end this attendance session?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              const sessId = session.id || session._id || 'active';
              await attendanceApi.endSession(sessId);
            } catch (e) {
              console.warn('End session error:', e);
            }
            if (navigation.canGoBack()) {
              navigation.goBack();
            } else {
              navigation.navigate('FacultyTabs', { screen: 'Dashboard' });
            }
          },
        },
      ]
    );
  };

  const fetchRecords = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      if (session.id) {
        const res = await attendanceApi.getSessionRecords(session.id);
        setRecords(res.records || []);
        setLastUpdated(new Date());
      }
    } catch (e) {
      console.warn('Fetch live records error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [session.id]);

  useEffect(() => {
    fetchRecords();
    // Auto-refresh every 5 seconds for live updates
    const interval = setInterval(() => fetchRecords(), 5000);
    return () => clearInterval(interval);
  }, [fetchRecords]);

  const presentCount = records.filter((r) => r.status === 'present').length;
  const flaggedCount = records.filter((r) => r.status === 'flagged').length;

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const student = item.users || item.student || {};
    const statusColor = STATUS_COLORS[item.status] || Colors.primary;
    const rssi = item.ble_rssi ?? item.bleRSSI;
    const score = item.verification_score ?? item.verificationScore;

    return (
      <View style={styles.studentCard}>
        <Text style={styles.rollNo}>#{index + 1}</Text>

        {student.profile_pic ? (
          <Image source={{ uri: student.profile_pic }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: Colors.primaryContainer }]}>
            <Text style={styles.initials}>{getInitials(student.name || 'ST')}</Text>
          </View>
        )}

        <View style={styles.info}>
          <Text style={styles.name}>{student.name || 'Student'}</Text>
          <Text style={styles.time}>
            🕒 {new Date(item.marked_at || item.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <View style={styles.rightSide}>
          {rssi != null && (
            <Text style={styles.rssiText}>{rssi} dBm</Text>
          )}
          {score != null && (
            <Text style={styles.scoreText}>Score: {Math.round(score)}</Text>
          )}
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20`, borderColor: statusColor }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {(item.status || 'present').toUpperCase()}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← QR</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Live Attendance</Text>
          <Text style={styles.sub}>{session.subject?.name || 'Session'}</Text>
        </View>
        <TouchableOpacity onPress={handleEndSession} style={styles.liveEndBtn} activeOpacity={0.8}>
          <Text style={styles.liveEndText}>End Session</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
          <Text style={[styles.statNum, { color: '#10B981' }]}>{presentCount}</Text>
          <Text style={[styles.statLabel, { color: '#10B981' }]}>Present</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
          <Text style={[styles.statNum, { color: '#F59E0B' }]}>{flaggedCount}</Text>
          <Text style={[styles.statLabel, { color: '#F59E0B' }]}>Flagged</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: Colors.surfaceContainerHigh }]}>
          <Text style={[styles.statNum, { color: Colors.onSurface }]}>{records.length}</Text>
          <Text style={[styles.statLabel, { color: Colors.onSurfaceVariant }]}>Total</Text>
        </View>
        {lastUpdated && (
          <Text style={styles.updatedText}>
            Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </Text>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : records.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>Waiting for Students</Text>
          <Text style={styles.emptyDesc}>Students will appear here as they scan the QR code.</Text>
        </View>
      ) : (
        <FlatList
          data={records}
          keyExtractor={(item) => item.id || item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchRecords(true)}
              tintColor={Colors.primary}
            />
          }
          renderItem={renderItem}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  backBtn: {
    paddingRight: 12,
  },
  backText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  sub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  liveEndBtn: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  liveEndText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10B981',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 10,
    flexWrap: 'wrap',
  },
  statChip: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    alignItems: 'center',
  },
  statNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  updatedText: {
    fontSize: 10,
    color: Colors.outline,
    marginLeft: 'auto',
  },
  listContent: {
    padding: 16,
    gap: 8,
  },
  studentCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rollNo: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.outline,
    width: 28,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onPrimaryContainer,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  time: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  rightSide: {
    alignItems: 'flex-end',
    gap: 3,
  },
  rssiText: {
    fontSize: 11,
    color: Colors.secondary,
    fontWeight: '600',
  },
  scoreText: {
    fontSize: 10,
    color: Colors.onSurfaceVariant,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
});
