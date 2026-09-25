import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { authApi } from '../../api/auth.api';

const ACADEMIC_YEARS = [
  { label: '1st Year', subtitle: 'FE', value: 1 },
  { label: '2nd Year', subtitle: 'SE', value: 2 },
  { label: '3rd Year', subtitle: 'TE', value: 3 },
  { label: '4th Year', subtitle: 'BE', value: 4 },
];

const DIVISIONS = ['A', 'B', 'C', 'D'];

export const RegisterScreen = ({ navigation }: any) => {
  const [role, setRole] = useState<'student' | 'faculty'>('student');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [subjects, setSubjects] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await authApi.getDepartments();
      if (res.success && res.departments?.length > 0) {
        setDepartments(res.departments);
        // Do NOT auto-select: let student consciously pick their department
      }
    } catch (e) {
      console.warn('Could not load departments:', e);
    }
  };

  const handleRoleSwitch = (newRole: 'student' | 'faculty') => {
    setRole(newRole);
    setErrorMessage('');
    setSelectedYear(null);
    setSelectedDivision('');
    // Keep department selection across role switch so user doesn't need to re-pick
  };

  const handleRegister = async () => {
    setErrorMessage('');

    if (!name.trim() || !email.trim() || !password) {
      const msg = 'Please fill in all required fields (Name, Email, Password).';
      setErrorMessage(msg);
      Alert.alert('Missing Fields', msg);
      return;
    }

    if (password.length < 6) {
      const msg = 'Password must be at least 6 characters long.';
      setErrorMessage(msg);
      Alert.alert('Weak Password', msg);
      return;
    }

    if (!selectedDeptId) {
      const msg = 'Please select your department.';
      setErrorMessage(msg);
      Alert.alert('Department Required', msg);
      return;
    }

    if (role === 'student' && !selectedYear) {
      const msg = 'Please select your academic year.';
      setErrorMessage(msg);
      Alert.alert('Year Required', msg);
      return;
    }

    try {
      setLoading(true);

      // Default semester from year: odd semester (year * 2 - 1)
      const semester = selectedYear ? (selectedYear * 2) - 1 : undefined;

      const res = await authApi.register({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        department: selectedDeptId || undefined,
        phone: phone.trim() || undefined,
        studentId: role === 'student' ? studentId.trim() : undefined,
        subjects: role === 'faculty' ? subjects : undefined,
        year: role === 'student' ? selectedYear ?? undefined : undefined,
        semester: role === 'student' ? semester : undefined,
        division: role === 'student' && selectedDivision ? selectedDivision : undefined,
      });

      if (res.success) {
        setErrorMessage('');
        if (role === 'faculty') {
          Alert.alert(
            'Teacher Registration Received ⏳',
            res.message || 'Your teacher account was created! An Administrator must approve your account before you can log in.',
            [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
          );
        } else {
          const yearLabel = ACADEMIC_YEARS.find(y => y.value === selectedYear)?.label ?? '';
          const deptName = departments.find(d => (d.id || d._id) === selectedDeptId)?.name ?? '';
          Alert.alert(
            'Student Account Created 🎉',
            `Account created successfully!\nStudent ID: ${res.user?.studentId || 'Assigned'}\nDepartment: ${deptName}\nYear: ${yearLabel}`,
            [{ text: 'Sign In Now', onPress: () => navigation.navigate('Login') }]
          );
        }
      }
    } catch (err: any) {
      let msg = err.response?.data?.message || err.message || 'Failed to register';
      if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
        msg = err.response.data.errors.map((e: any) => `• ${e.message}`).join('\n');
      }
      setErrorMessage(msg);
      Alert.alert('Registration Notice', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backText}>← Back to Login</Text>
      </TouchableOpacity>

      <View style={styles.header}>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Register to access AttendX system</Text>
      </View>

      {/* Role Selection Tabs */}
      <View style={styles.roleContainer}>
        <TouchableOpacity
          style={[styles.roleTab, role === 'student' && styles.activeRoleTab]}
          onPress={() => handleRoleSwitch('student')}
        >
          <Text style={[styles.roleText, role === 'student' && styles.activeRoleText]}>🎓 Student</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleTab, role === 'faculty' && styles.activeRoleTab]}
          onPress={() => handleRoleSwitch('faculty')}
        >
          <Text style={[styles.roleText, role === 'faculty' && styles.activeRoleText]}>👨‍🏫 Teacher / Faculty</Text>
        </TouchableOpacity>
      </View>

      {/* Admin Approval Notice for Faculty */}
      {role === 'faculty' && (
        <View style={styles.approvalNotice}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <Text style={styles.noticeText}>
            Teacher accounts require <Text style={{ fontWeight: '700' }}>Admin Approval</Text> before login is allowed.
          </Text>
        </View>
      )}

      {/* Inline Error Banner */}
      {!!errorMessage && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        </View>
      )}

      <View style={styles.form}>
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            placeholder={role === 'student' ? 'Alex Johnson' : 'Dr. Sarah Connor'}
            placeholderTextColor={Colors.onSurfaceVariant}
            value={name}
            onChangeText={(t) => { setName(t); setErrorMessage(''); }}
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder={role === 'student' ? 'student@college.edu' : 'teacher@college.edu'}
            placeholderTextColor={Colors.onSurfaceVariant}
            value={email}
            onChangeText={(t) => { setEmail(t); setErrorMessage(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Department Selector — required for both roles */}
        <View style={styles.inputGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Department *</Text>
            {!selectedDeptId && (
              <Text style={styles.requiredHint}>Required</Text>
            )}
          </View>
          {departments.length === 0 ? (
            <Text style={styles.helperLabel}>Loading departments…</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {departments.map((dept) => {
                const deptId = dept.id || dept._id;
                const isSelected = selectedDeptId === deptId;
                return (
                  <TouchableOpacity
                    key={deptId}
                    style={[styles.chip, isSelected && styles.activeChip]}
                    onPress={() => { setSelectedDeptId(deptId); setErrorMessage(''); }}
                  >
                    <Text style={[styles.chipText, isSelected && styles.activeChipText]}>
                      {dept.code}
                    </Text>
                    <Text style={[styles.chipSubText, isSelected && styles.activeChipSubText]}>
                      {dept.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Student-specific: Academic Year (required) */}
        {role === 'student' && (
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Academic Year *</Text>
              {!selectedYear && (
                <Text style={styles.requiredHint}>Required</Text>
              )}
            </View>
            <View style={styles.yearGrid}>
              {ACADEMIC_YEARS.map((yr) => {
                const isSelected = selectedYear === yr.value;
                return (
                  <TouchableOpacity
                    key={yr.value}
                    style={[styles.yearChip, isSelected && styles.activeYearChip]}
                    onPress={() => { setSelectedYear(yr.value); setErrorMessage(''); }}
                  >
                    <Text style={[styles.yearChipLabel, isSelected && styles.activeYearChipLabel]}>
                      {yr.label}
                    </Text>
                    <Text style={[styles.yearChipSub, isSelected && styles.activeYearChipSub]}>
                      {yr.subtitle}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Student-specific: Division (optional) */}
        {role === 'student' && (
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Division</Text>
              <Text style={styles.helperLabel}>Optional</Text>
            </View>
            <View style={styles.divisionRow}>
              {DIVISIONS.map((div) => {
                const isSelected = selectedDivision === div;
                return (
                  <TouchableOpacity
                    key={div}
                    style={[styles.divisionChip, isSelected && styles.activeDivisionChip]}
                    onPress={() => setSelectedDivision(isSelected ? '' : div)}
                  >
                    <Text style={[styles.divisionChipText, isSelected && styles.activeDivisionChipText]}>
                      Div {div}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Student-specific: Student ID */}
        {role === 'student' && (
          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Student ID / Roll No.</Text>
              <Text style={styles.helperLabel}>Auto-generated if empty</Text>
            </View>
            <TextInput
              style={styles.input}
              placeholder="e.g. STU2026001 (Optional)"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={studentId}
              onChangeText={(t) => { setStudentId(t); setErrorMessage(''); }}
              autoCapitalize="characters"
            />
          </View>
        )}

        {/* Faculty-specific: Subjects Teaching */}
        {role === 'faculty' && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subjects Teaching *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Data Structures, Database Systems, Wireless Networks"
              placeholderTextColor={Colors.onSurfaceVariant}
              value={subjects}
              onChangeText={(t) => { setSubjects(t); setErrorMessage(''); }}
            />
          </View>
        )}

        {/* Phone Number */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            placeholder="+91 9876543210"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={phone}
            onChangeText={(t) => { setPhone(t); setErrorMessage(''); }}
            keyboardType="phone-pad"
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Minimum 6 characters"
            placeholderTextColor={Colors.onSurfaceVariant}
            value={password}
            onChangeText={(t) => { setPassword(t); setErrorMessage(''); }}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.registerBtn, loading && { opacity: 0.7 }]}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={Colors.onPrimary} />
          ) : (
            <Text style={styles.registerBtnText}>
              {role === 'student' ? 'Create Student Account' : 'Submit Teacher Account Request'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginLink}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  backBtn: {
    marginBottom: 16,
  },
  backText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeRoleTab: {
    backgroundColor: Colors.primaryContainer,
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  activeRoleText: {
    color: Colors.onPrimaryContainer,
  },
  approvalNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 180, 0, 0.12)',
    borderColor: 'rgba(255, 180, 0, 0.3)',
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  noticeIcon: {
    fontSize: 18,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#ffc107',
    lineHeight: 18,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 80, 80, 0.15)',
    borderColor: '#ff5555',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  helperLabel: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  requiredHint: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.error,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.onSurface,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  // Department chips (horizontal scroll)
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    alignItems: 'center',
    minWidth: 70,
  },
  activeChip: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  chipText: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  activeChipText: {
    color: Colors.onPrimaryContainer,
  },
  chipSubText: {
    color: Colors.onSurfaceVariant,
    fontSize: 10,
    fontWeight: '400',
  },
  activeChipSubText: {
    color: Colors.onPrimaryContainer,
    opacity: 0.8,
  },
  // Academic Year grid (2×2)
  yearGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  yearChip: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeYearChip: {
    backgroundColor: Colors.primaryContainer,
    borderColor: Colors.primary,
  },
  yearChipLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    marginBottom: 2,
  },
  activeYearChipLabel: {
    color: Colors.onPrimaryContainer,
  },
  yearChipSub: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.onSurfaceVariant,
    opacity: 0.7,
  },
  activeYearChipSub: {
    color: Colors.onPrimaryContainer,
    opacity: 0.8,
  },
  // Division row
  divisionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  divisionChip: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerHigh,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  activeDivisionChip: {
    backgroundColor: Colors.secondaryContainer,
    borderColor: Colors.secondary,
  },
  divisionChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  activeDivisionChipText: {
    color: Colors.onSecondaryContainer,
    fontWeight: '700',
  },
  // Register button
  registerBtn: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  registerBtnText: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 28,
  },
  footerText: {
    color: Colors.onSurfaceVariant,
    fontSize: 14,
  },
  loginLink: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
