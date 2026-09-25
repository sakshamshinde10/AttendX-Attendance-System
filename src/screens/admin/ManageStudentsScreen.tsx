import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { adminApi } from '../../api/admin.api';
import { authApi } from '../../api/auth.api';

const ACADEMIC_YEARS = [
  { label: '1st Year', value: 1 },
  { label: '2nd Year', value: 2 },
  { label: '3rd Year', value: 3 },
  { label: '4th Year', value: 4 },
];

const SEMESTERS = [
  { label: 'Semester 1', value: 1 },
  { label: 'Semester 2', value: 2 },
  { label: 'Semester 3', value: 3 },
  { label: 'Semester 4', value: 4 },
  { label: 'Semester 5', value: 5 },
  { label: 'Semester 6', value: 6 },
  { label: 'Semester 7', value: 7 },
  { label: 'Semester 8', value: 8 },
];

const DIVISIONS = ['A', 'B', 'C', 'D'];

export const ManageStudentsScreen = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Filters State
  const [filterDept, setFilterDept] = useState<string>('ALL');
  const [filterYear, setFilterYear] = useState<number | 'ALL'>('ALL');
  const [filterSemester, setFilterSemester] = useState<number | 'ALL'>('ALL');
  const [filterDivision, setFilterDivision] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Add student form state
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRollNumber, setFormRollNumber] = useState('');
  const [formStudentId, setFormStudentId] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formYear, setFormYear] = useState<number | null>(null);
  const [formSemester, setFormSemester] = useState<number | null>(null);
  const [formDivision, setFormDivision] = useState('');

  const fetchDepartments = async () => {
    try {
      const res = await authApi.getDepartments();
      if (res.success && res.departments?.length > 0) {
        setDepartments(res.departments);
      }
    } catch (e) {
      console.warn('Fetch departments error:', e);
    }
  };

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { limit: 100 };
      if (filterDept !== 'ALL') params.department = filterDept;
      if (filterYear !== 'ALL') params.year = filterYear;
      if (filterSemester !== 'ALL') params.semester = filterSemester;
      if (filterDivision !== 'ALL') params.division = filterDivision;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await adminApi.getStudents(params);
      setStudents(res.students || []);
    } catch (e) {
      console.warn('Fetch students error:', e);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [filterDept, filterYear, filterSemester, filterDivision, searchQuery]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const hasActiveFilters =
    filterDept !== 'ALL' ||
    filterYear !== 'ALL' ||
    filterSemester !== 'ALL' ||
    filterDivision !== 'ALL' ||
    searchQuery.trim().length > 0;

  const clearAllFilters = () => {
    setFilterDept('ALL');
    setFilterYear('ALL');
    setFilterSemester('ALL');
    setFilterDivision('ALL');
    setSearchQuery('');
  };

  const resetForm = () => {
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRollNumber('');
    setFormStudentId('');
    setFormPhone('');
    setFormDeptId('');
    setFormYear(null);
    setFormSemester(null);
    setFormDivision('');
  };

  const handleAddStudent = async () => {
    if (!formName.trim() || !formEmail.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Name and Email.');
      return;
    }
    if (!formDeptId) {
      Alert.alert('Department Required', 'Please select a department.');
      return;
    }
    if (!formYear) {
      Alert.alert('Year Required', 'Please select an academic year.');
      return;
    }

    try {
      setSubmitting(true);
      const semester = formSemester || (formYear ? formYear * 2 - 1 : undefined);
      await adminApi.createStudent({
        name: formName.trim(),
        email: formEmail.trim(),
        password: formPassword.trim() || 'password123',
        rollNumber: formRollNumber.trim() || undefined,
        studentId: formStudentId.trim() || undefined,
        department: formDeptId,
        year: formYear,
        semester,
        division: formDivision || undefined,
        phone: formPhone.trim() || undefined,
      });
      Alert.alert('Success', 'Student account created successfully!');
      setAddModalVisible(false);
      resetForm();
      fetchStudents();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to create student';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Student Roster</Text>
          <Text style={styles.subtitle}>
            {students.length} {students.length === 1 ? 'student' : 'students'} found
          </Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddModalVisible(true)}>
          <Text style={styles.addText}>+ Add Student</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, roll no, student ID..."
            placeholderTextColor={Colors.onSurfaceVariant}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <Text style={styles.searchClearText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Section */}
      <View style={styles.filterContainer}>
        {/* Department Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Dept:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterDept === 'ALL' && styles.filterChipActive]}
              onPress={() => setFilterDept('ALL')}
            >
              <Text style={[styles.filterChipText, filterDept === 'ALL' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {departments.map((d) => {
              const dId = d.id || d._id;
              const isActive = filterDept === dId;
              return (
                <TouchableOpacity
                  key={dId}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilterDept(dId)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {d.code || d.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Year Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Year:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterYear === 'ALL' && styles.filterChipActive]}
              onPress={() => {
                setFilterYear('ALL');
              }}
            >
              <Text style={[styles.filterChipText, filterYear === 'ALL' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {ACADEMIC_YEARS.map((y) => {
              const isActive = filterYear === y.value;
              return (
                <TouchableOpacity
                  key={y.value}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilterYear(y.value)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {y.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Semester Filter */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Sem:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterSemester === 'ALL' && styles.filterChipActive]}
              onPress={() => setFilterSemester('ALL')}
            >
              <Text style={[styles.filterChipText, filterSemester === 'ALL' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {SEMESTERS.map((s) => {
              const isActive = filterSemester === s.value;
              return (
                <TouchableOpacity
                  key={s.value}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilterSemester(s.value)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Division Filter & Clear Actions */}
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Div:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
            <TouchableOpacity
              style={[styles.filterChip, filterDivision === 'ALL' && styles.filterChipActive]}
              onPress={() => setFilterDivision('ALL')}
            >
              <Text style={[styles.filterChipText, filterDivision === 'ALL' && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {DIVISIONS.map((div) => {
              const isActive = filterDivision === div;
              return (
                <TouchableOpacity
                  key={div}
                  style={[styles.filterChip, isActive && styles.filterChipActive]}
                  onPress={() => setFilterDivision(div)}
                >
                  <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                    Div {div}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {hasActiveFilters && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearAllFilters}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Student List */}
      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : students.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🎓</Text>
          <Text style={styles.emptyTitle}>No students match criteria</Text>
          <Text style={styles.emptySubtitle}>Try adjusting or clearing your filters.</Text>
          {hasActiveFilters && (
            <TouchableOpacity style={styles.resetBtn} onPress={clearAllFilters}>
              <Text style={styles.resetBtnText}>Reset All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={students}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const rollNo = item.rollNumber || item.roll_number;
            const stuId = item.studentId || item.student_id;
            const yearStr = item.year ? `${item.year === 1 ? '1st' : item.year === 2 ? '2nd' : item.year === 3 ? '3rd' : '4th'} Year` : null;
            const semStr = item.semester ? `Sem ${item.semester}` : null;
            const divStr = item.division ? `Div ${item.division}` : null;
            const deptName = item.department?.name || item.departments?.name || item.departments?.code || 'Department';

            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.name}>{item.name}</Text>
                    {rollNo && (
                      <View style={styles.rollBadge}>
                        <Text style={styles.rollBadgeText}>Roll #{rollNo}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.email}>{item.email}</Text>

                  {/* Badges */}
                  <View style={styles.academicRow}>
                    {stuId && (
                      <View style={styles.idBadge}>
                        <Text style={styles.idBadgeText}>ID: {stuId}</Text>
                      </View>
                    )}
                    {yearStr && (
                      <View style={styles.academicBadge}>
                        <Text style={styles.academicBadgeText}>{yearStr}</Text>
                      </View>
                    )}
                    {semStr && (
                      <View style={styles.academicBadge}>
                        <Text style={styles.academicBadgeText}>{semStr}</Text>
                      </View>
                    )}
                    {divStr && (
                      <View style={styles.academicBadge}>
                        <Text style={styles.academicBadgeText}>{divStr}</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.dept}>{deptName}</Text>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Add Student Modal */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setAddModalVisible(false);
          resetForm();
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Student</Text>
              <TouchableOpacity
                onPress={() => {
                  setAddModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.modalForm}>
              {/* Name */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Full Name *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="e.g. Aarav Patil"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Email *</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="student@college.edu"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={formEmail}
                  onChangeText={setFormEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              {/* Department */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Department *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {departments.map((dept) => {
                    const deptId = dept.id || dept._id;
                    const isSelected = formDeptId === deptId;
                    return (
                      <TouchableOpacity
                        key={deptId}
                        style={[styles.selectChip, isSelected && styles.activeSelectChip]}
                        onPress={() => setFormDeptId(deptId)}
                      >
                        <Text style={[styles.selectChipText, isSelected && styles.activeSelectChipText]}>
                          {dept.code || dept.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Academic Year */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Academic Year *</Text>
                <View style={styles.yearRow}>
                  {ACADEMIC_YEARS.map((yr) => {
                    const isSelected = formYear === yr.value;
                    return (
                      <TouchableOpacity
                        key={yr.value}
                        style={[styles.yearChip, isSelected && styles.activeYearChip]}
                        onPress={() => {
                          setFormYear(yr.value);
                          setFormSemester(yr.value * 2 - 1);
                        }}
                      >
                        <Text style={[styles.yearChipText, isSelected && styles.activeYearChipText]}>
                          {yr.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Semester */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Semester (Optional)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                  {SEMESTERS.map((sem) => {
                    const isSelected = formSemester === sem.value;
                    return (
                      <TouchableOpacity
                        key={sem.value}
                        style={[styles.selectChip, isSelected && styles.activeSelectChip]}
                        onPress={() => setFormSemester(isSelected ? null : sem.value)}
                      >
                        <Text style={[styles.selectChipText, isSelected && styles.activeSelectChipText]}>
                          {sem.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Division */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Division <Text style={{ color: Colors.onSurfaceVariant, fontWeight: '400' }}>(Optional)</Text>
                </Text>
                <View style={styles.divRow}>
                  {DIVISIONS.map((div) => {
                    const isSelected = formDivision === div;
                    return (
                      <TouchableOpacity
                        key={div}
                        style={[styles.divChip, isSelected && styles.activeDivChip]}
                        onPress={() => setFormDivision(isSelected ? '' : div)}
                      >
                        <Text style={[styles.divChipText, isSelected && styles.activeDivChipText]}>
                          {div}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Roll Number & Student ID */}
              <View style={styles.formRowTwo}>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Roll Number</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 1 or 42"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    value={formRollNumber}
                    onChangeText={setFormRollNumber}
                  />
                </View>
                <View style={[styles.fieldGroup, { flex: 1 }]}>
                  <Text style={styles.fieldLabel}>Student ID</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. STU001"
                    placeholderTextColor={Colors.onSurfaceVariant}
                    value={formStudentId}
                    onChangeText={setFormStudentId}
                    autoCapitalize="characters"
                  />
                </View>
              </View>

              {/* Phone */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Phone</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="+91 9876543210"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                />
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Password <Text style={{ color: Colors.onSurfaceVariant, fontWeight: '400' }}>(default: password123)</Text>
                </Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Min 6 characters"
                  placeholderTextColor={Colors.onSurfaceVariant}
                  value={formPassword}
                  onChangeText={setFormPassword}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                onPress={handleAddStudent}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Student Account</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 20, fontWeight: '800', color: Colors.onSurface },
  subtitle: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  addBtn: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
  },
  addText: { color: Colors.onPrimaryContainer, fontWeight: '700', fontSize: 12 },

  // Search
  searchSection: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  searchClearBtn: {
    padding: 4,
  },
  searchClearText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Filters Container
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 6,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textSecondary,
    width: 38,
  },
  filterChipRow: {
    gap: 6,
    alignItems: 'center',
    paddingVertical: 2,
  },
  filterChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: Colors.errorLight,
  },
  clearBtnText: {
    fontSize: 11,
    color: Colors.error,
    fontWeight: '700',
  },

  // List
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  email: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  academicRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  rollBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rollBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  idBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  academicBadge: {
    backgroundColor: '#F0F9FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  academicBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#0369A1',
  },
  dept: { fontSize: 12, color: Colors.textSecondary, marginTop: 6, fontWeight: '500' },

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyIcon: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: 16 },
  resetBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  closeBtn: {
    fontSize: 18,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  modalForm: {
    padding: 20,
    gap: 14,
  },
  fieldGroup: {
    gap: 6,
  },
  formRowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  modalInput: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: Colors.onSurface,
    fontSize: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  selectChip: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeSelectChip: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  selectChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  activeSelectChipText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  yearRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  yearChip: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeYearChip: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  yearChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  activeYearChipText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  divRow: {
    flexDirection: 'row',
    gap: 8,
  },
  divChip: {
    flex: 1,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeDivChip: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  divChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  activeDivChipText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});

