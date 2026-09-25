import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Shadows, Typography } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { attendanceApi } from '../../api/attendance.api';
import { AttendanceCard } from '../../components/ui/AttendanceCard';
import { AppButton } from '../../components/ui/AppButton';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export const StudentDashboard = ({ navigation }: any) => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [recentRecords, setRecentRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [statsRes, historyRes] = await Promise.all([
        attendanceApi.getStudentStats().catch(() => null),
        attendanceApi.getStudentHistory(1, 5).catch(() => ({ records: [] })),
      ]);

      if (statsRes) setStats(statsRes);
      if (historyRes?.records) setRecentRecords(historyRes.records);
    } catch (err) {
      console.warn('Failed to fetch student data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const studentName = user?.name || 'Student';

  const overallPercentage = stats?.overallPercentage ?? 0;
  const totalPresent = stats?.totalPresent ?? 0;
  const totalSessions = stats?.totalSessions ?? 0;
  const subjectStats: any[] = stats?.subjectStats || [];

  const formatRelativeDate = (dateStr?: string) => {
    if (!dateStr) return 'Today';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading attendance records..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchStudentData(true)}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Section */}
        <View style={styles.headerSection}>
          <Text style={styles.greetingText}>{greeting}</Text>
          <Text style={styles.studentNameText}>{studentName}</Text>
        </View>

        {/* Overall Attendance Card */}
        <AttendanceCard
          percentage={overallPercentage}
          attendedLectures={totalPresent}
          totalLectures={totalSessions}
          style={styles.overallCard}
        />

        {/* Quick Action: Scan Attendance */}
        <View style={styles.quickActionSection}>
          <Text style={styles.quickActionTitle}>Quick Action</Text>
          <AppButton
            title="Scan Attendance"
            onPress={() => navigation.navigate('Scanner')}
            size="lg"
            icon={<Text style={styles.btnIcon}>📷</Text>}
            style={styles.scanBtn}
          />
        </View>

        {/* Subject Attendance Section */}
        <SectionHeader
          title="Subject Attendance"
          actionText={subjectStats.length > 0 ? 'View All' : undefined}
          onActionPress={() => navigation.navigate('History')}
        />

        {subjectStats.length > 0 ? (
          <View style={styles.subjectListCard}>
            {subjectStats.map((item: any, idx: number) => {
              const subName = item.subject?.name || 'Subject';
              const pct = item.percentage ?? 0;
              const isLast = idx === subjectStats.length - 1;

              return (
                <View
                  key={item.subject?.id || idx}
                  style={[styles.subjectRow, isLast && styles.noBorder]}
                >
                  <View style={styles.subjectInfo}>
                    <Text style={styles.subjectNameText} numberOfLines={1}>
                      {subName}
                    </Text>
                    <Text style={styles.subjectCountText}>
                      {item.presentCount} of {item.totalSessions} lectures
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.subjectPercentageText,
                      { color: pct >= 75 ? Colors.primary : Colors.error },
                    ]}
                  >
                    {Math.round(pct)}%
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No subject attendance data yet.</Text>
            <Text style={styles.emptyCardSub}>
              Attendance percentages will calculate automatically as you scan session QR codes.
            </Text>
          </View>
        )}

        {/* Recent Attendance Section */}
        <SectionHeader
          title="Recent Attendance"
          actionText={recentRecords.length > 0 ? 'Full History' : undefined}
          onActionPress={() => navigation.navigate('History')}
        />

        {recentRecords.length > 0 ? (
          <View style={styles.recentListCard}>
            {recentRecords.map((record: any, idx: number) => {
              const subName = record.subject?.name || 'Subject';
              const timeLabel = formatRelativeDate(record.markedAt || record.marked_at);
              const isPresent = record.status === 'present';
              const isLast = idx === recentRecords.length - 1;

              return (
                <View
                  key={record.id || record._id || idx}
                  style={[styles.recentRow, isLast && styles.noBorder]}
                >
                  <View style={styles.recentLeft}>
                    <Text style={styles.recentSubjectText} numberOfLines={1}>
                      {subName}
                    </Text>
                    <Text style={styles.recentDateText}>{timeLabel}</Text>
                  </View>
                  <StatusBadge status={isPresent ? 'present' : record.status || 'absent'} />
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>No recent attendance records.</Text>
            <Text style={styles.emptyCardSub}>
              Mark your attendance in class using the "Scan Attendance" button above.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  headerSection: {
    marginBottom: Spacing.lg,
  },
  greetingText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  studentNameText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  overallCard: {
    marginBottom: Spacing.xl,
  },
  quickActionSection: {
    marginBottom: Spacing.xl,
  },
  quickActionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  scanBtn: {
    backgroundColor: Colors.primary,
  },
  btnIcon: {
    fontSize: 18,
    marginRight: 4,
  },
  subjectListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    ...Shadows.card,
  },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  subjectInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  subjectNameText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  subjectCountText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subjectPercentageText: {
    fontSize: 16,
    fontWeight: '700',
  },
  recentListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    ...Shadows.card,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  recentLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  recentSubjectText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  recentDateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  emptyCardSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
});
