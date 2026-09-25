import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Shadows, Typography } from '../../constants/colors';
import { API_BASE_URL, STORAGE_KEYS } from '../../constants/config';
import { facultyApi } from '../../api/faculty.api';
import { attendanceApi } from '../../api/attendance.api';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { AppButton } from '../../components/ui/AppButton';

export const FacultyReportsScreen = () => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Session details modal
  const [activeModalSession, setActiveModalSession] = useState<any>(null);
  const [modalRecords, setModalRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);
  const [rosterSummary, setRosterSummary] = useState<any>(null);

  // Overall Attendance modal
  const [overallModalVisible, setOverallModalVisible] = useState(false);
  const [overallSubjectId, setOverallSubjectId] = useState('');
  const [overallYear, setOverallYear] = useState('');
  const [overallSemester, setOverallSemester] = useState('');
  const [overallDivision, setOverallDivision] = useState('');
  const [exportingOverall, setExportingOverall] = useState(false);
  const [subjectsList, setSubjectsList] = useState<any[]>([]);

  useEffect(() => {
    loadSessions();
    loadSubjects();
  }, []);

  const loadSessions = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await facultyApi.getSessionHistory(1, 30);
      setSessions(res.sessions || []);
    } catch (err) {
      console.warn('Failed to load session history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadSubjects = async () => {
    try {
      const res = await facultyApi.getMySubjects();
      setSubjectsList(res.subjects || []);
    } catch (_) {}
  };

  const handleOpenDetails = async (sess: any) => {
    setActiveModalSession(sess);
    setModalRecords([]);
    setRosterSummary(null);
    setLoadingRecords(true);

    try {
      const sessId = sess.id || sess._id;
      // Fetch both raw records and complete class roster with present/absent stats
      const [recordsRes, rosterRes] = await Promise.all([
        attendanceApi.getSessionRecords(sessId).catch(() => ({ records: [] })),
        attendanceApi.getSessionRosterAttendance(sessId).catch(() => null),
      ]);

      setModalRecords(recordsRes.records || []);
      if (rosterRes && rosterRes.success) {
        setRosterSummary(rosterRes.sessionInfo);
      }
    } catch (e) {
      console.warn('Failed to load session records:', e);
    } finally {
      setLoadingRecords(false);
    }
  };

  const escapeCsv = (str: any) => {
    if (str == null) return '';
    const text = String(str);
    if (text.includes(',') || text.includes('"') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const handleDownloadCSV = async (sessId: string) => {
    try {
      setExportingCSV(true);

      // 1. Fetch complete class roster from Supabase
      const res = await attendanceApi.getSessionRosterAttendance(sessId);

      if (!res || !res.success) {
        Alert.alert('Download Error', 'Unable to generate attendance CSV.\nPlease try again.');
        return;
      }

      const roster = res.roster || [];
      if (roster.length === 0) {
        Alert.alert('Empty Roster', 'No students found for this class.');
        return;
      }

      // 2. Generate CSV String — exact 5 required columns only
      const headers = [
        'Roll Number',
        'Student ID',
        'Student Name',
        'Attendance',
        'QR Scan Time',
      ].join(',');

      const rows = roster.map((r: any) =>
        [
          escapeCsv(r.rollNumber || r.rollNo || ''),
          escapeCsv(r.studentId || ''),
          escapeCsv(r.studentName || ''),
          escapeCsv(r.attendance || r.status || 'Absent'),
          escapeCsv(r.scanTime || ''),
        ].join(',')
      );

      const csvContent = [headers, ...rows].join('\r\n');

      // 3. Meaningful safe filename: WAMC_<Subject>_Lecture_<Num>_<Date>.csv
      const info = res.sessionInfo || {};
      const subjectTag = (info.subjectCode || info.subject || 'DBMS').replace(/[^a-zA-Z0-9_-]/g, '_');
      const lectureTag = String(info.lectureNumber || '01').padStart(2, '0');
      const dateTag = info.date || new Date().toISOString().split('T')[0];
      const filename = `WAMC_${subjectTag}_Lecture_${lectureTag}_${dateTag}.csv`;

      // 4. Platform-specific export (Expo Go & Web compatible)
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Download Attendance CSV',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('CSV Saved', `Attendance CSV saved as ${filename}`);
        }
      }
    } catch (err: any) {
      console.error('Download CSV error:', err);
      Alert.alert('Download Error', 'Unable to generate attendance CSV.\nPlease try again.');
    } finally {
      setExportingCSV(false);
    }
  };

  /**
   * Download Overall Attendance CSV — 7 columns
   * Roll Number, Student ID, Student Name, Total Lectures, Present, Absent, Attendance %
   */
  const handleDownloadOverallCSV = async () => {
    if (!overallSubjectId) {
      Alert.alert('Select Subject', 'Please select a subject first.');
      return;
    }
    try {
      setExportingOverall(true);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

      // Build query params
      const params: Record<string, string> = { subjectId: overallSubjectId };
      if (overallYear) params.year = overallYear;
      if (overallSemester) params.semester = overallSemester;
      if (overallDivision) params.division = overallDivision;

      const queryString = Object.entries(params)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

      const endpoint = `${API_BASE_URL}/reports/overall?${queryString}`;

      const res = await fetch(endpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (!data.success) {
        Alert.alert('Error', data.message || 'Could not fetch overall attendance.');
        return;
      }

      const rows: string[] = data.rows || [];
      if (rows.length === 0) {
        Alert.alert('No Data', 'No students found for this subject and class combination.');
        return;
      }

      const headers = 'Roll Number,Student ID,Student Name,Total Lectures,Present,Absent,Attendance %';
      const csvRows = (data.rows as any[]).map((r: any) =>
        [
          escapeCsv(r.rollNumber || ''),
          escapeCsv(r.studentId || ''),
          escapeCsv(r.studentName || ''),
          escapeCsv(r.totalLectures ?? 0),
          escapeCsv(r.present ?? 0),
          escapeCsv(r.absent ?? 0),
          escapeCsv(r.attendancePercentage || '0%'),
        ].join(',')
      );

      const csvContent = [headers, ...csvRows].join('\r\n');
      const meta = data.meta || {};
      const subTag = (meta.subjectCode || meta.subjectName || 'Subject').replace(/[^a-zA-Z0-9_-]/g, '_');
      const dateTag = new Date().toISOString().split('T')[0];
      const filename = `WAMC_Overall_${subTag}_${dateTag}.csv`;

      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const fileUri = `${FileSystem.documentDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, csvContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/csv',
            dialogTitle: 'Overall Attendance CSV',
            UTI: 'public.comma-separated-values-text',
          });
        } else {
          Alert.alert('Saved', `Overall attendance saved as ${filename}`);
        }
      }

      setOverallModalVisible(false);
    } catch (err: any) {
      console.error('Overall CSV error:', err);
      Alert.alert('Error', err.message || 'Failed to download overall attendance.');
    } finally {
      setExportingOverall(false);
    }
  };

  const handleDownloadReport = async (sessId: string, type: 'pdf' | 'excel') => {
    if (Platform.OS === 'web') {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const endpoint =
        type === 'pdf'
          ? `${API_BASE_URL}/reports/session/${sessId}/pdf`
          : `${API_BASE_URL}/reports/session/${sessId}/excel`;
      window.open(`${endpoint}?token=${token}`, '_blank');
      return;
    }

    try {
      setExporting(true);
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const ext = type === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `attendance_${sessId.slice(0, 8)}.${ext}`;
      const fileUri = `${FileSystem.documentDirectory}${filename}`;
      const endpoint =
        type === 'pdf'
          ? `${API_BASE_URL}/reports/session/${sessId}/pdf`
          : `${API_BASE_URL}/reports/session/${sessId}/excel`;

      const result = await FileSystem.downloadAsync(endpoint, fileUri, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (result.status === 200) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(result.uri, {
            mimeType:
              type === 'pdf'
                ? 'application/pdf'
                : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            dialogTitle: `Share Attendance ${type.toUpperCase()}`,
          });
        } else {
          Alert.alert('Downloaded', `Report saved as ${filename}`);
        }
      } else {
        Alert.alert('Error', `Server returned error (${result.status}).`);
      }
    } catch (e: any) {
      console.error('Export error:', e);
      Alert.alert('Export Failed', e.message || 'Could not export report.');
    } finally {
      setExporting(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Recent';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  };

  if (loading && !refreshing) {
    return <LoadingSpinner fullScreen message="Loading session history..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="Session History" subtitle="Previous attendance sessions & reports" />

      {/* Overall Attendance Download Button */}
      <TouchableOpacity
        style={styles.overallBtn}
        onPress={() => setOverallModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.overallBtnIcon}>📊</Text>
        <Text style={styles.overallBtnText}>Download Overall Attendance</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadSessions(true)}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionHeader}>Previous Sessions</Text>

        {sessions.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No attendance sessions yet"
            description="Completed attendance sessions will appear here with detailed student attendance counts."
          />
        ) : (
          sessions.map((sess: any) => {
            const sid = sess.id || sess._id;
            const subjectName = sess.subjects?.name || sess.subject?.name || 'Subject';
            const yearStr = sess.class?.year ? `${sess.class.year}th Year` : sess.location?.year ? `${sess.location.year}th Year` : 'Academic Year';
            const divStr = sess.class?.division || sess.location?.division || 'A';
            const dateStr = formatDate(sess.start_time);
            const present = sess.presentCount || sess.present_count || 0;
            const total = sess.totalStudents || 42;

            return (
              <TouchableOpacity
                key={sid}
                style={styles.sessionCard}
                onPress={() => handleOpenDetails(sess)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.leftInfo}>
                    <Text style={styles.subjectTitle}>{subjectName}</Text>
                    <Text style={styles.classDetails}>
                      {yearStr} • Division {divStr}
                    </Text>
                  </View>
                  <View style={styles.dateBadge}>
                    <Text style={styles.dateText}>{dateStr}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.attendanceRow}>
                    <Text style={styles.presentCountText}>
                      <Text style={styles.boldNum}>{present}</Text> / {total} Present
                    </Text>
                  </View>
                  <Text style={styles.viewDetailsText}>View Details →</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Detailed Session Modal - Conditionally mounted to prevent touch interception */}
      {!!activeModalSession && (
        <Modal
          visible={!!activeModalSession}
          transparent
          animationType="slide"
          onRequestClose={() => setActiveModalSession(null)}
          statusBarTranslucent
        >
          <View style={styles.modalOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={() => setActiveModalSession(null)}
            />
            <View style={styles.modalSheet} pointerEvents="auto">
              <View style={styles.modalHeader}>
                <View style={{ flex: 1, marginRight: Spacing.sm }}>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    Attendance — {activeModalSession?.subjects?.subject_code || activeModalSession?.subjects?.name || 'Session'}
                  </Text>
                  <Text style={styles.modalSub}>
                    {activeModalSession?.class?.year || activeModalSession?.location?.year || 3}rd Year • {activeModalSession?.class?.departments?.name || activeModalSession?.location?.departmentName || 'Computer Engineering'}
                  </Text>
                  <Text style={styles.modalSubDivision}>
                    Division {activeModalSession?.class?.division || activeModalSession?.location?.division || 'A'}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setActiveModalSession(null)}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Attendance Count Overview & Prominent CSV Download Button */}
              <View style={styles.csvDownloadBanner}>
                <View style={styles.csvStatsRow}>
                  <Text style={styles.presentCountHeadline}>
                    Present:{' '}
                    <Text style={styles.presentBoldHeadline}>
                      {rosterSummary ? rosterSummary.presentCount : (activeModalSession?.presentCount || activeModalSession?.present_count || 0)}
                    </Text>{' '}
                    /{' '}
                    <Text style={styles.totalMutedHeadline}>
                      {rosterSummary ? rosterSummary.totalStudents : (activeModalSession?.totalStudents || 42)}
                    </Text>
                  </Text>
                  {rosterSummary?.absentCount !== undefined && (
                    <Text style={styles.absentCountSub}>
                      ({rosterSummary.absentCount} Absent)
                    </Text>
                  )}
                </View>

                <TouchableOpacity
                  style={[styles.csvBtn, exportingCSV && styles.btnDisabled]}
                  onPress={() => handleDownloadCSV(activeModalSession.id || activeModalSession._id)}
                  disabled={exportingCSV}
                  activeOpacity={0.8}
                >
                  <Text style={styles.csvBtnIcon}>📥</Text>
                  <Text style={styles.csvBtnText}>
                    {exportingCSV ? 'Generating attendance...' : 'Download CSV'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Optional Quick Export PDF / Excel */}
              <View style={styles.exportRow}>
                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={() => handleDownloadReport(activeModalSession.id || activeModalSession._id, 'pdf')}
                  disabled={exporting}
                >
                  <Text style={styles.exportBtnText}>📄 PDF Report</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.exportBtn}
                  onPress={() => handleDownloadReport(activeModalSession.id || activeModalSession._id, 'excel')}
                  disabled={exporting}
                >
                  <Text style={styles.exportBtnText}>📊 Excel Report</Text>
                </TouchableOpacity>
              </View>

              {/* Student Roster Header */}
              <View style={styles.rosterSectionHeader}>
                <Text style={styles.rosterSectionTitle}>Recorded Attendance</Text>
                <Text style={styles.rosterCountBadge}>{modalRecords.length} Scanned</Text>
              </View>

              {/* Student List */}
              {loadingRecords ? (
                <LoadingSpinner message="Loading attendance..." style={{ padding: Spacing.xl }} />
              ) : modalRecords.length === 0 ? (
                <View style={styles.emptyRoster}>
                  <Text style={styles.emptyRosterText}>No QR attendance entries recorded yet.</Text>
                  <Text style={styles.emptyRosterSub}>
                    CSV will include full class roster with all students marked ABSENT.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={modalRecords}
                  keyExtractor={(item) => item.id || item._id}
                  contentContainerStyle={styles.rosterList}
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <View style={styles.rosterItem}>
                      <View style={styles.rosterItemLeft}>
                        <Text style={styles.rosterStudentName}>
                          {item.users?.name || item.student?.name || 'Student'}
                        </Text>
                        <Text style={styles.rosterStudentEmail}>
                          {item.users?.email || item.student?.email || ''}
                          {item.users?.student_id ? ` • ${item.users.student_id}` : ''}
                        </Text>
                      </View>
                      <StatusBadge status={item.status} />
                    </View>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      )}

      {/* Overall Attendance Configuration Modal */}
      <Modal
        visible={overallModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOverallModalVisible(false)}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setOverallModalVisible(false)}
          />
          <View style={[styles.modalSheet, { paddingBottom: 32 }]} pointerEvents="auto">
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Download Overall Attendance</Text>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setOverallModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: Spacing.lg }}>
              <Text style={styles.overallFieldLabel}>Subject *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.overallChipRow}>
                {subjectsList.map((s: any) => {
                  const id = s.id || s._id;
                  const active = overallSubjectId === id;
                  return (
                    <TouchableOpacity
                      key={id}
                      style={[styles.overallChip, active && styles.overallChipActive]}
                      onPress={() => setOverallSubjectId(id)}
                    >
                      <Text style={[styles.overallChipText, active && styles.overallChipTextActive]}>
                        {s.name || s.subject_name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.overallFieldLabel, { marginTop: Spacing.md }]}>Year (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.overallChipRow}>
                {['', '1', '2', '3', '4'].map((y) => (
                  <TouchableOpacity
                    key={y || 'all'}
                    style={[styles.overallChip, overallYear === y && styles.overallChipActive]}
                    onPress={() => setOverallYear(y)}
                  >
                    <Text style={[styles.overallChipText, overallYear === y && styles.overallChipTextActive]}>
                      {y === '' ? 'All' : `Year ${y}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.overallFieldLabel, { marginTop: Spacing.md }]}>Semester (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.overallChipRow}>
                {['', '1', '2', '3', '4', '5', '6', '7', '8'].map((s) => (
                  <TouchableOpacity
                    key={s || 'all'}
                    style={[styles.overallChip, overallSemester === s && styles.overallChipActive]}
                    onPress={() => setOverallSemester(s)}
                  >
                    <Text style={[styles.overallChipText, overallSemester === s && styles.overallChipTextActive]}>
                      {s === '' ? 'All' : `Sem ${s}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={[styles.overallFieldLabel, { marginTop: Spacing.md }]}>Division (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.overallChipRow}>
                {['', 'A', 'B', 'C', 'D'].map((d) => (
                  <TouchableOpacity
                    key={d || 'all'}
                    style={[styles.overallChip, overallDivision === d && styles.overallChipActive]}
                    onPress={() => setOverallDivision(d)}
                  >
                    <Text style={[styles.overallChipText, overallDivision === d && styles.overallChipTextActive]}>
                      {d === '' ? 'All' : `Div ${d}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={[styles.csvBtn, { marginTop: Spacing.xl }, exportingOverall && styles.btnDisabled]}
                onPress={handleDownloadOverallCSV}
                disabled={exportingOverall || !overallSubjectId}
                activeOpacity={0.8}
              >
                <Text style={styles.csvBtnIcon}>📥</Text>
                <Text style={styles.csvBtnText}>
                  {exportingOverall ? 'Generating...' : 'Download Overall CSV (7 Columns)'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  overallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: Spacing.lg,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  overallBtnIcon: {
    fontSize: 16,
  },
  overallBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4F46E5',
  },
  overallFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  overallChipRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  overallChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginRight: Spacing.xs,
  },
  overallChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  overallChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  overallChipTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  sectionHeader: {
    ...Typography.sectionTitle,
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  sessionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  leftInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  subjectTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  classDetails: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  dateBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  dateText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  attendanceRow: {},
  presentCountText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  boldNum: {
    fontWeight: '700',
    color: Colors.primary,
  },
  viewDetailsText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Modal styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '80%',
    paddingBottom: Spacing.xl,
    ...Shadows.modal,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  modalSub: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
  modalSubDivision: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 1,
    fontWeight: '500',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  csvDownloadBanner: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  csvStatsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.xs + 2,
    marginBottom: Spacing.sm,
  },
  presentCountHeadline: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  presentBoldHeadline: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  totalMutedHeadline: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  absentCountSub: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '500',
  },
  csvBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs + 2,
  },
  csvBtnIcon: {
    fontSize: 16,
  },
  csvBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  exportRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  exportBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  rosterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  rosterSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  rosterCountBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  rosterList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  rosterItemLeft: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  rosterStudentName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  rosterStudentEmail: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  emptyRoster: {
    padding: Spacing.xxl,
    alignItems: 'center',
  },
  emptyRosterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyRosterSub: {
    fontSize: 12,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
