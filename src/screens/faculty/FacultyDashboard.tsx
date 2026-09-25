import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Shadows, Typography } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { facultyApi } from '../../api/faculty.api';
import { attendanceApi } from '../../api/attendance.api';
import { AppButton } from '../../components/ui/AppButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SectionHeader } from '../../components/ui/SectionHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const FacultyDashboard = ({ navigation }: any) => {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [flaggedRecords, setFlaggedRecords] = useState<any[]>([]);

  // Automatically refresh dashboard whenever returning to this screen
  useFocusEffect(
    useCallback(() => {
      fetchDashboard(true);
    }, [])
  );

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleEndActiveSession = (sessId?: string) => {
    Alert.alert(
      'End Attendance Session',
      'Are you sure you want to end this attendance session? Students will no longer be able to scan.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End Session',
          style: 'destructive',
          onPress: async () => {
            try {
              await attendanceApi.endSession(sessId || 'active');
              Alert.alert('Session Ended', 'Attendance session has been closed.');
              fetchDashboard(true);
            } catch (e: any) {
              Alert.alert('Error', e.message || 'Could not end session.');
            }
          },
        },
      ]
    );
  };

  const fetchDashboard = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await facultyApi.getDashboard();
      setDashboard(res.dashboard);

      if (res.dashboard?.activeSession?.id) {
        fetchFlaggedRecords(res.dashboard.activeSession.id);
      } else {
        setFlaggedRecords([]);
      }
    } catch (err) {
      console.warn('Failed to fetch faculty dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchFlaggedRecords = async (sessionId: string) => {
    try {
      const res = await facultyApi.getFlaggedRecords(sessionId);
      if (res.success) {
        setFlaggedRecords(res.records || []);
      }
    } catch (e) {
      console.warn('Could not fetch flagged records:', e);
    }
  };

  const handleReview = async (recordId: string, status: 'present' | 'rejected') => {
    try {
      await facultyApi.reviewRecord(recordId, status, `Reviewed by Dr. ${user?.name}`);
      Alert.alert('Status Updated', `Record marked as ${status}.`);
      setFlaggedRecords((prev) => prev.filter((r) => (r.id || r._id) !== recordId));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update record status.');
    }
  };

  const activeSession = dashboard?.activeSession;
  const todaySessions = dashboard?.todaySessions || [];
  const subjects = dashboard?.subjects || [];

  // Determine greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const profName = user?.name ? (user.name.startsWith('Dr.') || user.name.startsWith('Prof.') ? user.name : `Prof. ${user.name}`) : 'Professor';

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading dashboard..." />;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDashboard(true)}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome Header */}
        <View style={styles.headerSection}>
          <Text style={styles.greetingSub}>{greeting}</Text>
          <Text style={styles.profName}>{profName}</Text>
        </View>

        {/* Primary Action: Start Attendance */}
        <View style={styles.primaryActionCard}>
          <View style={styles.actionTextWrapper}>
            <Text style={styles.actionCardTitle}>Start Attendance</Text>
            <Text style={styles.actionCardSub}>
              Create a live session with rotating QR code
            </Text>
          </View>
          <AppButton
            title="+ Start Attendance"
            onPress={() => navigation.navigate('CreateSession')}
            size="md"
            style={styles.startBtn}
          />
        </View>

        {/* Active Session Rejoin Banner (if any) */}
        {activeSession && (
          <View style={styles.activeSessionBannerWrapper}>
            <TouchableOpacity
              style={styles.activeSessionBanner}
              onPress={() => navigation.navigate('ActiveQR', { session: activeSession })}
              activeOpacity={0.85}
            >
              <View style={styles.activeBannerTop}>
                <View style={styles.activeBadgeGroup}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.activeBannerTag}>SESSION IN PROGRESS</Text>
                </View>
                <Text style={styles.activePresentCount}>
                  {activeSession.presentCount || 0} Present
                </Text>
              </View>

              <Text style={styles.activeSubjectTitle}>
                {activeSession.subject?.name || 'Active Session'}
              </Text>
              <Text style={styles.rejoinHint}>Tap to view QR code & student roster →</Text>
            </TouchableOpacity>

            <View style={styles.activeBannerActions}>
              <TouchableOpacity
                style={styles.rejoinBtn}
                onPress={() => navigation.navigate('ActiveQR', { session: activeSession })}
                activeOpacity={0.8}
              >
                <Text style={styles.rejoinBtnText}>📡 Open QR / Scanner</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.endFromDashBtn}
                onPress={() => handleEndActiveSession(activeSession.id || activeSession._id)}
                activeOpacity={0.8}
              >
                <Text style={styles.endFromDashBtnText}>✕ End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Flagged Records Review Alert (if any) */}
        {flaggedRecords.length > 0 && (
          <View style={styles.flaggedSection}>
            <Text style={styles.flaggedSectionTitle}>
              ⚠️ Review Submissions ({flaggedRecords.length})
            </Text>
            {flaggedRecords.map((item) => {
              const id = item.id || item._id;
              return (
                <View key={id} style={styles.flaggedCard}>
                  <View style={styles.flaggedHeader}>
                    <Text style={styles.studentName}>{item.student?.name || 'Student'}</Text>
                    <StatusBadge status="flagged" />
                  </View>
                  <Text style={styles.flaggedMeta}>
                    Score: {item.verificationScore || 60}/100 •{' '}
                    {item.flaggedReasons?.[0] || 'Requires teacher confirmation'}
                  </Text>
                  <View style={styles.flaggedActionRow}>
                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReview(id, 'rejected')}
                    >
                      <Text style={styles.rejectText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleReview(id, 'present')}
                    >
                      <Text style={styles.approveText}>Approve Present</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Today's Sessions Section */}
        <SectionHeader
          title="Today's Sessions"
          actionText={todaySessions.length > 0 ? 'History' : undefined}
          onActionPress={() => navigation.navigate('Reports')}
        />

        {todaySessions.length > 0 ? (
          todaySessions.map((sess: any) => {
            const sid = sess.id || sess._id;
            const isCompleted = !sess.is_active;
            const startTimeStr = sess.start_time
              ? new Date(sess.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : '10:00 AM';

            return (
              <View key={sid} style={styles.sessionCard}>
                <View style={styles.sessionCardLeft}>
                  <Text style={styles.sessionSubject}>
                    {sess.subjects?.name || sess.subject?.name || 'Subject'}
                  </Text>
                  <Text style={styles.sessionClass}>
                    {sess.classes?.name || 'Year • Division'}
                  </Text>
                  <Text style={styles.sessionTime}>{startTimeStr}</Text>
                </View>
                <View style={styles.sessionCardRight}>
                  <StatusBadge status={isCompleted ? 'completed' : 'active'} />
                  {isCompleted && (
                    <Text style={styles.sessionPresentStats}>
                      {sess.present_count || 0} Present
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        ) : (
          <View style={styles.emptySessionCard}>
            <Text style={styles.emptySessionText}>No sessions conducted yet today.</Text>
            <Text style={styles.emptySessionSub}>
              Tap "+ Start Attendance" to begin a lecture session.
            </Text>
          </View>
        )}

        {/* Assigned Subjects Summary */}
        <SectionHeader title="My Assigned Subjects" />
        {subjects.length > 0 ? (
          <View style={styles.subjectsGrid}>
            {subjects.map((sub: any) => {
              const subId = sub.id || sub._id;
              return (
                <View key={subId} style={styles.subjectMiniCard}>
                  <Text style={styles.miniCode}>
                    {sub.subject_code || sub.subjectCode || 'SUB'}
                  </Text>
                  <Text style={styles.miniName} numberOfLines={2}>
                    {sub.name}
                  </Text>
                  <Text style={styles.miniDept}>
                    {sub.departments?.name || 'Department'}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <EmptyState
            icon="📚"
            title="No subjects assigned"
            description="Your assigned subjects will appear here."
          />
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
  greetingSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  profName: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginTop: 2,
  },
  primaryActionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  actionTextWrapper: {
    flex: 1,
    marginRight: Spacing.md,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  actionCardSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  startBtn: {
    paddingHorizontal: Spacing.md,
  },
  activeSessionBannerWrapper: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  activeSessionBanner: {
    padding: Spacing.md,
  },
  activeBannerActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    backgroundColor: '#F8FAFC',
  },
  rejoinBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderRightWidth: 1,
    borderRightColor: '#DBEAFE',
  },
  rejoinBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  endFromDashBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
  },
  endFromDashBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
  activeBannerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  activeBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  activeBannerTag: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  activePresentCount: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  activeSubjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  rejoinHint: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  flaggedSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  flaggedSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B45309',
    marginBottom: Spacing.sm,
  },
  flaggedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  flaggedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  flaggedMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginVertical: Spacing.xs,
  },
  flaggedActionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  rejectBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rejectText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  approveBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
  },
  approveText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  sessionCardLeft: {
    flex: 1,
  },
  sessionSubject: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  sessionClass: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  sessionTime: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  sessionCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  sessionPresentStats: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  emptySessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  emptySessionText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySessionSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  subjectsGrid: {
    gap: Spacing.sm,
  },
  subjectMiniCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    ...Shadows.card,
  },
  miniCode: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 2,
  },
  miniName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  miniDept: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
});
