import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../../constants/colors';
import { facultyApi } from '../../api/faculty.api';
import { attendanceApi } from '../../api/attendance.api';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';
import { AppInput } from '../../components/ui/AppInput';
import { AppButton } from '../../components/ui/AppButton';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

const ACADEMIC_YEARS: DropdownItem[] = [
  { label: '1st Year', value: 1, subtitle: 'FE / 1st Year Engineering' },
  { label: '2nd Year', value: 2, subtitle: 'SE / 2nd Year Engineering' },
  { label: '3rd Year', value: 3, subtitle: 'TE / 3rd Year Engineering' },
  { label: '4th Year', value: 4, subtitle: 'BE / 4th Year Engineering' },
];

const DIVISIONS: DropdownItem[] = [
  { label: 'Division A', value: 'A' },
  { label: 'Division B', value: 'B' },
  { label: 'Division C', value: 'C' },
  { label: 'Division D', value: 'D' },
];

// Valid semesters per year
const YEAR_SEMESTER_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

const getSemesterDropdownItems = (year: number | null): DropdownItem[] => {
  if (!year) return [];
  const semesters = YEAR_SEMESTER_MAP[year] || [];
  return semesters.map((s) => ({ label: `Semester ${s}`, value: s }));
};

export const CreateSessionScreen = ({ navigation }: any) => {
  // Data states
  const [subjects, setSubjects] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [existingActiveSession, setExistingActiveSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Form states
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>('A');
  const [lectureNumber, setLectureNumber] = useState('01');
  const [topic, setTopic] = useState('');
  const [room, setRoom] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Check for existing active session on screen focus
  useFocusEffect(
    useCallback(() => {
      checkActiveSession();
    }, [])
  );

  useEffect(() => {
    loadFormData();
  }, []);

  const checkActiveSession = async () => {
    try {
      const res = await attendanceApi.getActiveSession();
      if (res?.session && res.session.id) {
        setExistingActiveSession(res.session);
      } else {
        setExistingActiveSession(null);
      }
    } catch (e) {
      // Silently handle
    }
  };

  const handleEndExistingSession = async () => {
    try {
      setStarting(true);
      await attendanceApi.endSession('active');
      setExistingActiveSession(null);
      Alert.alert('Session Ended', 'The previous attendance session has been closed. You may now start a new one.');
      checkActiveSession();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not end previous session.');
    } finally {
      setStarting(false);
    }
  };

  const loadFormData = async () => {
    try {
      setLoading(true);
      setServerError(null);

      const [subsRes, deptsRes, activeRes] = await Promise.all([
        facultyApi.getMySubjects(),
        facultyApi.getDepartments().catch(() => ({ success: true, departments: [] })),
        attendanceApi.getActiveSession().catch(() => ({ success: true, session: null })),
      ]);

      const subList = subsRes.subjects || [];
      const deptList = deptsRes.departments || [];

      setSubjects(subList);
      setDepartments(deptList);

      if (activeRes?.session?.id) {
        setExistingActiveSession(activeRes.session);
      } else {
        setExistingActiveSession(null);
      }

      // Auto-select first subject if available
      if (subList.length > 0) {
        const firstSub = subList[0];
        const firstSubId = firstSub.id || firstSub._id;
        setSelectedSubjectId(firstSubId);

        // Pre-fill department from subject if available
        const deptId = firstSub.department_id || firstSub.department?.id || (deptList[0]?.id || '');
        if (deptId) setSelectedDeptId(deptId);

        // Pre-fill year from subject if available
        if (firstSub.year) {
          setSelectedYear(firstSub.year);
        } else {
          setSelectedYear(3); // Default to 3rd Year
        }
      } else if (deptList.length > 0) {
        setSelectedDeptId(deptList[0].id || deptList[0]._id);
      }
    } catch (err: any) {
      console.warn('Load session options error:', err);
      setServerError('Unable to load subjects. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  // Cascading update when subject changes
  const handleSubjectSelect = (item: DropdownItem) => {
    const subId = String(item.value);
    setSelectedSubjectId(subId);
    setErrors((prev) => ({ ...prev, subject: '' }));

    const found = subjects.find((s) => (s.id || s._id) === subId);
    if (found) {
      const deptId = found.department_id || found.department?.id;
      if (deptId) {
        setSelectedDeptId(deptId);
        setErrors((prev) => ({ ...prev, department: '' }));
      }
      if (found.year) {
        setSelectedYear(found.year);
        setErrors((prev) => ({ ...prev, year: '' }));
      }
      // Auto-set semester from subject
      if (found.semester) {
        setSelectedSemester(found.semester);
        setErrors((prev) => ({ ...prev, semester: '' }));
      } else if (found.year) {
        // Default to odd semester for the year
        const defaultSem = (found.year * 2) - 1;
        setSelectedSemester(defaultSem);
      }
    }
  };

  // When year changes, auto-select the odd semester for that year
  const handleYearSelect = (item: DropdownItem) => {
    const yr = Number(item.value);
    setSelectedYear(yr);
    setErrors((prev) => ({ ...prev, year: '' }));
    // Default to odd semester for chosen year
    const defaultSem = (yr * 2) - 1;
    setSelectedSemester(defaultSem);
    setErrors((prev) => ({ ...prev, semester: '' }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!selectedSubjectId) newErrors.subject = 'Please select a subject.';
    if (!selectedDeptId) newErrors.department = 'Please select a department.';
    if (!selectedYear) newErrors.year = 'Please select an academic year.';
    if (!selectedSemester) newErrors.semester = 'Please select a semester.';
    if (!selectedDivision) newErrors.division = 'Please select a division.';
    if (!lectureNumber.trim()) newErrors.lectureNumber = 'Please enter a lecture number.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleStartSession = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setStarting(true);
      setServerError(null);

      const res = await attendanceApi.startSession({
        subjectId: selectedSubjectId,
        departmentId: selectedDeptId,
        year: selectedYear || 1,
        semester: selectedSemester || ((selectedYear || 1) * 2 - 1),
        division: selectedDivision,
        lectureNumber: lectureNumber.trim(),
        topic: topic.trim(),
        location: room.trim() ? { room: room.trim() } : {},
      });

      if (res.success) {
        navigation.navigate('ActiveQR', { session: res.session });
      } else {
        setServerError(res.message || 'Unable to start attendance session.');
      }
    } catch (err: any) {
      console.error('Start session error:', err?.response?.data || err.message);
      const msg =
        err?.response?.data?.message ||
        'Unable to start attendance session. Please check your connection.';
      setServerError(msg);

      if (msg.toLowerCase().includes('already have an active session')) {
        Alert.alert(
          'Active Session in Progress',
          'You already have an active attendance session running.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Return to Active Session',
              onPress: async () => {
                const act = await attendanceApi.getActiveSession();
                if (act?.session) {
                  navigation.navigate('ActiveQR', { session: act.session });
                }
              },
            },
            {
              text: 'End Session Now',
              style: 'destructive',
              onPress: handleEndExistingSession,
            },
          ]
        );
      } else {
        Alert.alert('Session Error', msg);
      }
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading subjects & departments..." />;
  }

  if (subjects.length === 0) {
    return (
      <View style={styles.container}>
        <ScreenHeader title="Start Attendance" showBack onBack={() => navigation.goBack()} />
        <EmptyState
          icon="📚"
          title="No subjects assigned"
          description="No subjects have been assigned to you yet. Please contact your college administrator to assign subjects to your account."
          actionText="Refresh"
          onAction={loadFormData}
        />
      </View>
    );
  }

  // Map subjects for dropdown
  const subjectDropdownItems: DropdownItem[] = subjects.map((sub) => ({
    label: sub.name,
    value: sub.id || sub._id,
    subtitle: sub.subjectCode || sub.subject_code ? `Code: ${sub.subjectCode || sub.subject_code}` : undefined,
  }));

  // Map departments for dropdown
  const departmentDropdownItems: DropdownItem[] = departments.map((d) => ({
    label: d.name,
    value: d.id || d._id,
    subtitle: d.code ? `Code: ${d.code}` : undefined,
  }));

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScreenHeader
        title="Start Attendance"
        subtitle="Create a live attendance session"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {serverError && (
          <ErrorMessage message={serverError} onRetry={loadFormData} style={styles.errorBanner} />
        )}

        {/* Existing Active Session Alert Card */}
        {existingActiveSession && (
          <View style={styles.activeNoticeCard}>
            <View style={styles.activeNoticeHeader}>
              <View style={styles.activeNoticeDot} />
              <Text style={styles.activeNoticeTitle}>SESSION ALREADY ACTIVE</Text>
            </View>
            <Text style={styles.activeNoticeSubject}>
              {existingActiveSession.subject?.name || 'Active Attendance Session'}
            </Text>
            <Text style={styles.activeNoticeDesc}>
              You currently have an attendance session in progress. You can return to the active QR & Bluetooth scanner screen, or end it here.
            </Text>
            <View style={styles.activeNoticeActions}>
              <TouchableOpacity
                style={styles.activeNoticeRejoinBtn}
                onPress={() => navigation.navigate('ActiveQR', { session: existingActiveSession })}
                activeOpacity={0.8}
              >
                <Text style={styles.activeNoticeRejoinText}>📡 Return to Active Session</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.activeNoticeEndBtn}
                onPress={handleEndExistingSession}
                activeOpacity={0.8}
              >
                <Text style={styles.activeNoticeEndText}>✕ End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Form Container */}
        <View style={styles.formCard}>
          {/* 1. Subject Dropdown */}
          <Dropdown
            label="Subject"
            required
            placeholder="Select a subject"
            items={subjectDropdownItems}
            selectedValue={selectedSubjectId}
            onSelect={handleSubjectSelect}
            error={errors.subject}
            emptyText="No subjects assigned to your account."
          />

          {/* 2. Department Dropdown */}
          <Dropdown
            label="Department"
            required
            placeholder="Select department"
            items={departmentDropdownItems}
            selectedValue={selectedDeptId}
            onSelect={(item) => {
              setSelectedDeptId(String(item.value));
              setErrors((prev) => ({ ...prev, department: '' }));
            }}
            error={errors.department}
          />

          {/* 3. Academic Year Dropdown */}
          <Dropdown
            label="Academic Year"
            required
            placeholder="Select academic year"
            items={ACADEMIC_YEARS}
            selectedValue={selectedYear}
            onSelect={handleYearSelect}
            error={errors.year}
          />

          {/* 4. Semester Dropdown — filtered by selected year */}
          <Dropdown
            label="Semester"
            required
            placeholder={selectedYear ? 'Select semester' : 'Select year first'}
            items={getSemesterDropdownItems(selectedYear)}
            selectedValue={selectedSemester}
            onSelect={(item) => {
              setSelectedSemester(Number(item.value));
              setErrors((prev) => ({ ...prev, semester: '' }));
            }}
            error={errors.semester}
          />

          {/* 5. Division Dropdown */}
          <Dropdown
            label="Division"
            required
            placeholder="Select division"
            items={DIVISIONS}
            selectedValue={selectedDivision}
            onSelect={(item) => {
              setSelectedDivision(String(item.value));
              setErrors((prev) => ({ ...prev, division: '' }));
            }}
            error={errors.division}
          />

          {/* 5. Lecture Number Input */}
          <AppInput
            label="Lecture Number"
            required
            placeholder="e.g. 05"
            value={lectureNumber}
            onChangeText={(text) => {
              setLectureNumber(text);
              if (text.trim()) setErrors((prev) => ({ ...prev, lectureNumber: '' }));
            }}
            keyboardType="number-pad"
            error={errors.lectureNumber}
          />

          {/* 6. Topic Input */}
          <AppInput
            label="Topic"
            placeholder="e.g. Normalization (Optional)"
            value={topic}
            onChangeText={setTopic}
            helperText="Enter the topic or module being covered today"
          />

          {/* Room / Location Input (Optional) */}
          <AppInput
            label="Classroom / Lab"
            placeholder="e.g. Lab 304 (Optional)"
            value={room}
            onChangeText={setRoom}
          />

          {/* 7. Start Session Action */}
          <AppButton
            title="Start Session"
            onPress={handleStartSession}
            loading={starting}
            size="lg"
            style={styles.startBtn}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  errorBanner: {
    marginBottom: Spacing.md,
  },
  activeNoticeCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#93C5FD',
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  activeNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  activeNoticeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  activeNoticeTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  activeNoticeSubject: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  activeNoticeDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 16,
    marginBottom: Spacing.sm,
  },
  activeNoticeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  activeNoticeRejoinBtn: {
    flex: 1.2,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNoticeRejoinText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeNoticeEndBtn: {
    flex: 0.8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeNoticeEndText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    marginTop: Spacing.xs,
  },
  startBtn: {
    marginTop: Spacing.md,
  },
});
