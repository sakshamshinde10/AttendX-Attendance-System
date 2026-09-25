import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { Colors, Spacing, Shadows } from '../../constants/colors';
import { attendanceApi } from '../../api/attendance.api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getAttendanceColor = (pct: number | null) => {
  if (pct === null) return Colors.textTertiary;
  if (pct >= 75) return Colors.success;
  if (pct >= 60) return '#D97706'; // amber
  return Colors.error;
};

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ProgressBar = ({ percentage }: { percentage: number | null }) => {
  const pct = percentage ?? 0;
  const clampedPct = Math.min(100, Math.max(0, pct));
  const color = getAttendanceColor(percentage);
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${clampedPct}%` as any, backgroundColor: color },
        ]}
      />
    </View>
  );
};

const SkeletonCard = () => (
  <View style={[styles.subjectCard, { opacity: 0.5 }]}>
    <View style={styles.skeletonLine} />
    <View style={[styles.skeletonLine, { width: '50%', marginTop: 6 }]} />
    <View style={[styles.skeletonLine, { marginTop: 12 }]} />
  </View>
);

// ─── Subject Detail Modal ─────────────────────────────────────────────────────

interface SubjectDetailModalProps {
  visible: boolean;
  subjectId: string | null;
  onClose: () => void;
}

const SubjectDetailModal = ({ visible, subjectId, onClose }: SubjectDetailModalProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && subjectId) {
      fetchHistory();
    } else {
      setData(null);
      setError(null);
    }
  }, [visible, subjectId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await attendanceApi.getSubjectHistory(subjectId!);
      setData(res);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load lecture history.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {data?.subject?.name || 'Subject Details'}
            </Text>
            {data?.subject?.code ? (
              <Text style={styles.modalSubtitle}>{data.subject.code}</Text>
            ) : null}
          </View>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} accessibilityLabel="Close">
            <Text style={styles.modalCloseBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.modalLoadingContainer}>
            <ActivityIndicator color={Colors.primary} size="large" />
            <Text style={styles.modalLoadingText}>Loading lecture history...</Text>
          </View>
        ) : error ? (
          <View style={styles.modalLoadingContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchHistory}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : data ? (
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* Attendance Summary */}
            <View style={styles.modalSummaryCard}>
              <View style={styles.modalSummaryRow}>
                <View style={styles.modalSummaryItem}>
                  <Text style={styles.modalSummaryValue}>
                    {data.totalLectures > 0
                      ? `${data.percentage !== null ? `${data.percentage}%` : '—'}`
                      : '—'}
                  </Text>
                  <Text style={styles.modalSummaryLabel}>Attendance</Text>
                </View>
                <View style={styles.modalSummaryDivider} />
                <View style={styles.modalSummaryItem}>
                  <Text style={styles.modalSummaryValue}>{data.presentCount}</Text>
                  <Text style={styles.modalSummaryLabel}>Present</Text>
                </View>
                <View style={styles.modalSummaryDivider} />
                <View style={styles.modalSummaryItem}>
                  <Text style={styles.modalSummaryValue}>{data.totalLectures}</Text>
                  <Text style={styles.modalSummaryLabel}>Conducted</Text>
                </View>
              </View>
              {data.totalLectures > 0 && (
                <ProgressBar percentage={data.percentage} />
              )}
              <Text style={styles.modalSemesterTag}>
                {data.profile?.yearLabel} • {data.profile?.semesterLabel}
              </Text>
            </View>

            {/* Lecture History */}
            <Text style={styles.sectionTitle}>Lecture History</Text>

            {data.lectures.length === 0 ? (
              <View style={styles.emptyLecturesContainer}>
                <Text style={styles.emptyLecturesIcon}>📋</Text>
                <Text style={styles.emptyLecturesText}>No lectures conducted yet</Text>
              </View>
            ) : (
              data.lectures.map((lecture: any, index: number) => {
                const isPresent = lecture.status === 'Present';
                return (
                  <View key={lecture.sessionId} style={styles.lectureRow}>
                    <View style={[styles.lectureStatusDot, { backgroundColor: isPresent ? Colors.success : Colors.error }]} />
                    <View style={styles.lectureInfo}>
                      <Text style={styles.lectureLabel}>{lecture.lectureLabel}</Text>
                      {lecture.topic ? (
                        <Text style={styles.lectureTopic} numberOfLines={1}>{lecture.topic}</Text>
                      ) : null}
                    </View>
                    <View style={styles.lectureRight}>
                      <Text style={styles.lectureDate}>{formatDate(lecture.date)}</Text>
                      <View style={[styles.statusPill, { backgroundColor: isPresent ? Colors.successLight : Colors.errorLight }]}>
                        <Text style={[styles.statusPillText, { color: isPresent ? Colors.success : Colors.error }]}>
                          {lecture.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
};

// ─── Main ReportsScreen ───────────────────────────────────────────────────────

export const StudentReportsScreen = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const res = await attendanceApi.getStudentStats();
      setStats(res);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Unable to load attendance data.';
      setError(msg);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const openSubjectDetail = (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setModalVisible(true);
  };

  // ── Loading state ──
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Attendance Report</Text>
          <Text style={styles.screenSubtitle}>Current Semester</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.loadingText}>Loading your current semester attendance...</Text>
        </View>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </View>
    );
  }

  // ── Error state ──
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Attendance Report</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to load attendance</Text>
          <Text style={styles.errorMessage}>Please check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchStats()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const profile = stats?.profile;
  const subjectStats: any[] = stats?.subjectStats || [];
  const overallPct = stats?.overallPercentage;
  const totalPresent = stats?.totalPresent ?? 0;
  const totalConducted = stats?.totalConducted ?? 0;
  const recentAttendance: any[] = stats?.recentAttendance || [];

  // ── No subjects state ──
  if (!stats?.hasSubjects || subjectStats.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchStats(true)} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Attendance Report</Text>
          <Text style={styles.screenSubtitle}>Current Semester</Text>
          {profile && (
            <Text style={styles.screenMeta}>
              {profile.yearLabel} • {profile.semesterLabel}
            </Text>
          )}
          {profile?.departmentName && (
            <Text style={styles.screenDept}>{profile.departmentName}</Text>
          )}
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyTitle}>No subjects found</Text>
          <Text style={styles.emptyMessage}>
            We couldn't find subjects for your current semester.{'\n'}Please contact the administrator if this seems incorrect.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const overallColor = getAttendanceColor(overallPct);

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchStats(true)} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Screen Header ── */}
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>Attendance Report</Text>
          <Text style={styles.screenSubtitle}>Current Semester</Text>
          {profile && (
            <Text style={styles.screenMeta}>
              {profile.yearLabel} • {profile.semesterLabel}
            </Text>
          )}
          {profile?.departmentName && (
            <Text style={styles.screenDept}>{profile.departmentName}</Text>
          )}
        </View>

        {/* ── Overall Attendance Card ── */}
        <View style={styles.overallCard}>
          <Text style={styles.overallCardLabel}>Overall Attendance</Text>
          <Text style={[styles.overallPct, { color: overallColor }]}>
            {overallPct !== null ? `${overallPct}%` : '—'}
          </Text>
          <Text style={styles.overallLectures}>
            {totalPresent} / {totalConducted} lectures
          </Text>
          {totalConducted > 0 && <ProgressBar percentage={overallPct} />}
          {overallPct !== null && (
            <View style={[styles.statusChip, { backgroundColor: overallPct >= 75 ? Colors.successLight : Colors.errorLight }]}>
              <Text style={[styles.statusChipText, { color: overallPct >= 75 ? Colors.success : Colors.error }]}>
                {overallPct >= 75 ? '✓ Good Standing' : '⚠ Needs Attention'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Subject-wise Attendance ── */}
        <Text style={styles.sectionTitle}>Subject-wise Attendance</Text>

        {subjectStats.map((item: any) => {
          const pct = item.percentage;
          const color = getAttendanceColor(pct);
          const subjectName = item.subject?.name || 'Subject';
          const subjectCode = item.subject?.subjectCode || item.subject?.code || '';

          return (
            <TouchableOpacity
              key={item.subject?.id}
              style={styles.subjectCard}
              onPress={() => openSubjectDetail(item.subject?.id)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={`${subjectName}, ${pct !== null ? `${pct}%` : 'no lectures yet'}, tap to view details`}
            >
              <View style={styles.subjectCardTop}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.subjectName} numberOfLines={1}>{subjectName}</Text>
                  {subjectCode ? <Text style={styles.subjectCode}>{subjectCode}</Text> : null}
                  <Text style={styles.subjectLectures}>
                    {item.presentCount} / {item.totalConducted} lectures
                  </Text>
                </View>
                <View style={styles.subjectPctBox}>
                  <Text style={[styles.subjectPct, { color }]}>
                    {pct !== null ? `${pct}%` : '—'}
                  </Text>
                  <Text style={[styles.subjectStatusLabel, { color }]}>
                    {item.statusLabel}
                  </Text>
                </View>
              </View>

              {item.totalConducted > 0 ? (
                <ProgressBar percentage={pct} />
              ) : (
                <Text style={styles.noLecturesText}>No lectures conducted yet</Text>
              )}

              <Text style={styles.viewDetailHint}>Tap to view lecture history →</Text>
            </TouchableOpacity>
          );
        })}

        {/* ── Recent Attendance ── */}
        {recentAttendance.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Attendance</Text>
            <View style={styles.recentCard}>
              {recentAttendance.map((item: any, index: number) => {
                const isPresent = item.status === 'Present';
                const isLast = index === recentAttendance.length - 1;
                return (
                  <View key={item.id} style={[styles.recentRow, !isLast && styles.recentRowBorder]}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.recentSubject} numberOfLines={1}>{item.subjectName}</Text>
                      <Text style={styles.recentCode}>{item.subjectCode}</Text>
                    </View>
                    <Text style={styles.recentDate}>{formatDate(item.date)}</Text>
                    <View style={[styles.statusPill, { backgroundColor: isPresent ? Colors.successLight : Colors.errorLight }]}>
                      <Text style={[styles.statusPillText, { color: isPresent ? Colors.success : Colors.error }]}>
                        {item.status}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>

      {/* ── Subject Detail Modal ── */}
      <SubjectDetailModal
        visible={modalVisible}
        subjectId={selectedSubjectId}
        onClose={() => {
          setModalVisible(false);
          setSelectedSubjectId(null);
        }}
      />
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  // ── Header ──
  screenHeader: {
    marginBottom: Spacing.xl,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  screenMeta: {
    fontSize: 13,
    color: Colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
  screenDept: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 1,
  },

  // ── Loading / Skeleton ──
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  skeletonLine: {
    height: 14,
    backgroundColor: Colors.border,
    borderRadius: 6,
    width: '80%',
  },

  // ── Error ──
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  errorIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },

  // ── Empty ──
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyMessage: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
  },

  // ── Overall Card ──
  overallCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadows.card,
  },
  overallCardLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  overallPct: {
    fontSize: 52,
    fontWeight: '800',
    letterSpacing: -2,
  },
  overallLectures: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
    marginBottom: 12,
  },
  statusChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 100,
    marginTop: 12,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '700',
  },

  // ── Section Title ──
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    marginTop: 4,
  },

  // ── Subject Cards ──
  subjectCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  subjectCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
  },
  subjectCode: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  subjectLectures: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 5,
  },
  subjectPctBox: {
    alignItems: 'flex-end',
  },
  subjectPct: {
    fontSize: 22,
    fontWeight: '800',
  },
  subjectStatusLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  noLecturesText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  viewDetailHint: {
    fontSize: 11,
    color: Colors.primary,
    marginTop: 8,
    textAlign: 'right',
    fontWeight: '500',
  },

  // ── Progress Bar ──
  progressTrack: {
    height: 5,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // ── Recent Attendance ──
  recentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.card,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  recentRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  recentSubject: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  recentCode: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  recentDate: {
    fontSize: 12,
    color: Colors.textSecondary,
    minWidth: 64,
    textAlign: 'right',
  },

  // ── Status Pills ──
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 60,
    alignItems: 'center',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },

  // ── Retry Button ──
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Modal ──
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
    marginTop: -2,
  },
  modalCloseBtnText: {
    fontSize: 18,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  modalLoadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  modalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalContent: {
    padding: Spacing.lg,
    paddingBottom: 40,
  },
  modalSummaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  modalSummaryItem: {
    alignItems: 'center',
  },
  modalSummaryValue: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.text,
  },
  modalSummaryLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  modalSummaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  modalSemesterTag: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
  },

  // ── Lecture History ──
  lectureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 10,
  },
  lectureStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  lectureInfo: {
    flex: 1,
  },
  lectureLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  lectureTopic: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  lectureRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  lectureDate: {
    fontSize: 11,
    color: Colors.textSecondary,
  },
  emptyLecturesContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyLecturesIcon: {
    fontSize: 36,
    marginBottom: 8,
  },
  emptyLecturesText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
