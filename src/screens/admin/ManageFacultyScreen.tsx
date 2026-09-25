import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { adminApi } from '../../api/admin.api';
import { Dropdown, DropdownItem } from '../../components/ui/Dropdown';

// Canonical mapping: Academic Year -> valid Semesters
const YEAR_SEMESTER_MAP: Record<number, number[]> = {
  1: [1, 2],
  2: [3, 4],
  3: [5, 6],
  4: [7, 8],
};

const YEAR_OPTIONS: DropdownItem[] = [
  { label: 'All Years', value: 'ALL' },
  { label: '1st Year', value: 1 },
  { label: '2nd Year', value: 2 },
  { label: '3rd Year', value: 3 },
  { label: '4th Year', value: 4 },
];

export const ManageFacultyScreen = () => {
  const [tab, setTab] = useState<'approved' | 'pending'>('approved');
  const [activeFaculty, setActiveFaculty] = useState<any[]>([]);
  const [pendingFaculty, setPendingFaculty] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter dropdown data sources
  const [departments, setDepartments] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  // Selected filter states for main list
  const [selectedDept, setSelectedDept] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string | number>('ALL');
  const [selectedSemester, setSelectedSemester] = useState<string | number>('ALL');
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Subject Assignment Modal State
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [assignModalDept, setAssignModalDept] = useState<string>('ALL');
  const [assignModalYear, setAssignModalYear] = useState<string | number>('ALL');
  const [assignModalSubjects, setAssignModalSubjects] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Fetch departments on mount
  useEffect(() => {
    loadDepartments();
  }, []);

  // Fetch subjects whenever department, year, or semester changes
  useEffect(() => {
    loadSubjects();
  }, [selectedDept, selectedYear, selectedSemester]);

  // Fetch faculty list whenever filters change
  useEffect(() => {
    fetchFacultyData();
  }, [selectedDept, selectedYear, selectedSemester, selectedSubject]);

  // Fetch subjects for Assign Modal when filters change
  useEffect(() => {
    if (assignModalVisible) {
      loadModalSubjects();
    }
  }, [assignModalVisible, assignModalDept, assignModalYear]);

  const loadDepartments = async () => {
    try {
      const res = await adminApi.getDepartments();
      setDepartments(res.departments || []);
    } catch (e) {
      console.warn('Error fetching departments:', e);
    }
  };

  const loadSubjects = async () => {
    try {
      const params: any = {};
      if (selectedDept !== 'ALL') params.department = selectedDept;
      if (selectedYear !== 'ALL') params.year = selectedYear;
      if (selectedSemester !== 'ALL') params.semester = selectedSemester;

      const res = await adminApi.getSubjects(params);
      setSubjects(res.subjects || []);
    } catch (e) {
      console.warn('Error fetching subjects:', e);
    }
  };

  const loadModalSubjects = async () => {
    try {
      setAssignLoading(true);
      const params: any = {};
      if (assignModalDept !== 'ALL') params.department = assignModalDept;
      if (assignModalYear !== 'ALL') params.year = assignModalYear;

      const res = await adminApi.getSubjects(params);
      setAssignModalSubjects(res.subjects || []);
    } catch (e) {
      console.warn('Error loading modal subjects:', e);
    } finally {
      setAssignLoading(false);
    }
  };

  const fetchFacultyData = async () => {
    try {
      setLoading(true);

      const filterParams: any = {};
      if (selectedDept !== 'ALL') filterParams.department = selectedDept;
      if (selectedYear !== 'ALL') filterParams.year = selectedYear;
      if (selectedSemester !== 'ALL') filterParams.semester = selectedSemester;
      if (selectedSubject !== 'ALL') filterParams.subject = selectedSubject;

      // Fetch independently so a failure in one doesn't block the other
      let allFaculty: any[] = [];
      let pendingList: any[] = [];

      try {
        const allRes = await adminApi.getFaculty(filterParams);
        allFaculty = (allRes.faculty || []).filter((f: any) => f.isApproved !== false);
      } catch (e) {
        console.warn('Error fetching approved faculty:', e);
      }

      try {
        const pendingRes = await adminApi.getPendingFaculty();
        pendingList = pendingRes.pendingFaculty || [];
      } catch (e) {
        console.warn('Error fetching pending faculty:', e);
      }

      setActiveFaculty(allFaculty);
      setPendingFaculty(pendingList);
    } catch (e) {
      console.error('Error fetching faculty data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Build Department dropdown items
  const departmentOptions: DropdownItem[] = [
    { label: 'All Departments', value: 'ALL' },
    ...departments.map((d) => ({
      label: d.name || d.code,
      value: d.id || d._id,
      subtitle: d.code,
    })),
  ];

  // Build Semester dropdown items based on selected Year
  const semesterOptions: DropdownItem[] = (() => {
    const list: DropdownItem[] = [{ label: 'All Semesters', value: 'ALL' }];

    if (selectedYear !== 'ALL' && typeof selectedYear === 'number') {
      const validSems = YEAR_SEMESTER_MAP[selectedYear] || [];
      validSems.forEach((s) => {
        list.push({ label: `Semester ${s}`, value: s });
      });
    } else {
      for (let s = 1; s <= 8; s++) {
        list.push({ label: `Semester ${s}`, value: s });
      }
    }
    return list;
  })();

  // Build Subject dropdown items
  const subjectOptions: DropdownItem[] = [
    { label: 'All Subjects', value: 'ALL' },
    ...subjects.map((s) => ({
      label: s.name,
      value: s.id || s._id,
      subtitle: s.subjectCode ? `${s.subjectCode} • Year ${s.year || '?'}` : undefined,
    })),
  ];

  const handleYearSelect = (item: DropdownItem) => {
    setSelectedYear(item.value);
    if (item.value !== 'ALL' && typeof item.value === 'number') {
      const validSems = YEAR_SEMESTER_MAP[item.value] || [];
      if (selectedSemester !== 'ALL' && !validSems.includes(selectedSemester as number)) {
        setSelectedSemester('ALL');
      }
    }
    setSelectedSubject('ALL');
  };

  const handleDeptSelect = (item: DropdownItem) => {
    setSelectedDept(item.value as string);
    setSelectedSubject('ALL');
  };

  const handleSemSelect = (item: DropdownItem) => {
    setSelectedSemester(item.value);
    setSelectedSubject('ALL');
  };

  const handleSubjectSelect = (item: DropdownItem) => {
    setSelectedSubject(item.value as string);
  };

  const handleResetFilters = () => {
    setSelectedDept('ALL');
    setSelectedYear('ALL');
    setSelectedSemester('ALL');
    setSelectedSubject('ALL');
  };

  const hasActiveFilters =
    selectedDept !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedSemester !== 'ALL' ||
    selectedSubject !== 'ALL';

  const handleApprove = async (teacher: any) => {
    Alert.alert(
      'Approve Teacher Account',
      `Are you sure you want to approve ${teacher.name} (${teacher.email})?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await adminApi.approveFaculty(teacher._id);
              Alert.alert('Approved!', res.message || 'Teacher account approved.');
              fetchFacultyData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to approve account');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async (teacher: any) => {
    Alert.alert(
      'Reject Registration',
      `Are you sure you want to reject and delete registration for ${teacher.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject & Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const res = await adminApi.rejectFaculty(teacher._id);
              Alert.alert('Rejected', res.message || 'Registration request removed.');
              fetchFacultyData();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to reject account');
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  // Open Subject Assignment Modal for a Teacher
  const handleOpenAssignModal = (faculty: any) => {
    setSelectedFaculty(faculty);
    const facultyDeptId = faculty.department_id || faculty.department?.id || 'ALL';
    setAssignModalDept(facultyDeptId);
    setAssignModalYear('ALL');
    setAssignModalVisible(true);
  };

  // Assign a subject to the currently selected teacher
  const handleAssignSubject = async (subject: any) => {
    if (!selectedFaculty) return;
    try {
      setAssignLoading(true);
      await adminApi.assignSubject(selectedFaculty._id || selectedFaculty.id, subject._id || subject.id);
      Alert.alert('Assigned! ✅', `Assigned '${subject.name}' to ${selectedFaculty.name}`);
      await fetchFacultyData();

      // Update selectedFaculty local reference so modal UI updates immediately
      setSelectedFaculty((prev: any) => {
        if (!prev) return prev;
        const assigned = prev.assignedSubjects || [];
        const exists = assigned.some((s: any) => (s.id || s._id) === (subject.id || subject._id));
        if (exists) return prev;
        return {
          ...prev,
          assignedSubjects: [
            ...assigned,
            {
              id: subject.id || subject._id,
              _id: subject.id || subject._id,
              name: subject.name,
              subjectCode: subject.subjectCode || subject.subject_code,
              year: subject.year,
              semester: subject.semester,
              departmentName: subject.departmentName || '',
              lecturesConducted: 0,
            },
          ],
        };
      });
    } catch (err: any) {
      Alert.alert('Assignment Error', err.response?.data?.message || err.message || 'Failed to assign subject');
    } finally {
      setAssignLoading(false);
    }
  };

  // Unassign a subject from a teacher
  const handleUnassignSubject = async (faculty: any, subject: any) => {
    const facultyId = faculty._id || faculty.id;
    const subjectId = subject._id || subject.id;

    Alert.alert(
      'Unassign Subject',
      `Are you sure you want to unassign '${subject.name || subject.subjectCode}' from ${faculty.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unassign',
          style: 'destructive',
          onPress: async () => {
            try {
              setAssignLoading(true);
              await adminApi.unassignSubject(facultyId, subjectId);
              Alert.alert('Unassigned', `Removed '${subject.name || subject.subjectCode}' from ${faculty.name}`);
              await fetchFacultyData();

              if (selectedFaculty && (selectedFaculty._id || selectedFaculty.id) === facultyId) {
                setSelectedFaculty((prev: any) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    assignedSubjects: (prev.assignedSubjects || []).filter(
                      (s: any) => (s.id || s._id) !== subjectId
                    ),
                  };
                });
              }
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || err.message || 'Failed to unassign subject');
            } finally {
              setAssignLoading(false);
            }
          },
        },
      ]
    );
  };

  const currentList = tab === 'approved' ? activeFaculty : pendingFaculty;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Faculty & Teacher Management</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'approved' && styles.activeTabBtn]}
          onPress={() => setTab('approved')}
        >
          <Text style={[styles.tabText, tab === 'approved' && styles.activeTabText]}>
            ✅ Approved Teachers ({activeFaculty.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, tab === 'pending' && styles.activeTabBtn]}
          onPress={() => setTab('pending')}
        >
          <Text style={[styles.tabText, tab === 'pending' && styles.activeTabText]}>
            ⏳ Pending ({pendingFaculty.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Cascading Filter Bar (Available on Approved Teachers Tab) */}
      {tab === 'approved' && (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <TouchableOpacity
              style={styles.filterToggleBtn}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Text style={styles.filterToggleText}>
                🔍 Academic Filters {showFilters ? '▲' : '▼'}
                {hasActiveFilters ? ' (Active)' : ''}
              </Text>
            </TouchableOpacity>

            {hasActiveFilters && (
              <TouchableOpacity onPress={handleResetFilters}>
                <Text style={styles.resetFilterText}>Reset All</Text>
              </TouchableOpacity>
            )}
          </View>

          {showFilters && (
            <View style={styles.dropdownGrid}>
              <View style={styles.dropdownCol}>
                <Dropdown
                  label="Department"
                  items={departmentOptions}
                  selectedValue={selectedDept}
                  onSelect={handleDeptSelect}
                  containerStyle={styles.filterDropdown}
                />
              </View>

              <View style={styles.dropdownCol}>
                <Dropdown
                  label="Year"
                  items={YEAR_OPTIONS}
                  selectedValue={selectedYear}
                  onSelect={handleYearSelect}
                  containerStyle={styles.filterDropdown}
                />
              </View>

              <View style={styles.dropdownCol}>
                <Dropdown
                  label="Semester"
                  items={semesterOptions}
                  selectedValue={selectedSemester}
                  onSelect={handleSemSelect}
                  containerStyle={styles.filterDropdown}
                />
              </View>

              <View style={styles.dropdownCol}>
                <Dropdown
                  label="Subject"
                  items={subjectOptions}
                  selectedValue={selectedSubject}
                  onSelect={handleSubjectSelect}
                  containerStyle={styles.filterDropdown}
                  placeholder="All Subjects"
                />
              </View>
            </View>
          )}
        </View>
      )}

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
      ) : currentList.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>{tab === 'pending' ? '🎉' : '👨‍🏫'}</Text>
          <Text style={styles.emptyText}>
            {tab === 'pending'
              ? 'No pending teacher approval requests'
              : hasActiveFilters
              ? 'No teachers match the selected academic filters'
              : 'No approved teachers registered yet'}
          </Text>
          {hasActiveFilters && tab === 'approved' && (
            <TouchableOpacity style={styles.clearFiltersBtn} onPress={handleResetFilters}>
              <Text style={styles.clearFiltersText}>Clear Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => item._id || item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const assigned: any[] = item.assignedSubjects || [];
            const yearsTaught: number[] = item.yearsTaught || [];
            const semestersTaught: number[] = item.semestersTaught || [];
            const totalLectures = item.totalLecturesConducted || 0;

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.email}>{item.email}</Text>
                    {item.phone && <Text style={styles.meta}>📞 {item.phone}</Text>}
                  </View>
                  {tab === 'pending' ? (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingBadgeText}>Pending Approval</Text>
                    </View>
                  ) : (
                    <View style={styles.lectureBadge}>
                      <Text style={styles.lectureBadgeText}>🎙️ {totalLectures} Lectures</Text>
                    </View>
                  )}
                </View>

                {/* Department Info & Stats */}
                <View style={styles.detailsRow}>
                  <View style={styles.deptRow}>
                    <Text style={styles.dept}>
                      🏛️ Dept:{' '}
                      <Text style={styles.boldText}>
                        {item.department?.name || item.departments?.name || item.department?.code || 'General'}
                      </Text>
                    </Text>

                    {tab === 'approved' && (
                      <TouchableOpacity
                        style={styles.assignSubjectActionBtn}
                        onPress={() => handleOpenAssignModal(item)}
                      >
                        <Text style={styles.assignSubjectActionText}>➕ Assign Subject</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Year / Semester Badges */}
                  {(yearsTaught.length > 0 || semestersTaught.length > 0) && (
                    <View style={styles.tagRow}>
                      {yearsTaught.map((y) => (
                        <View key={`y-${y}`} style={styles.yearChip}>
                          <Text style={styles.yearChipText}>Year {y}</Text>
                        </View>
                      ))}
                      {semestersTaught.map((s) => (
                        <View key={`s-${s}`} style={styles.semChip}>
                          <Text style={styles.semChipText}>Sem {s}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Assigned Subjects & Lectures Conducted Per Subject */}
                  {assigned.length > 0 ? (
                    <View style={styles.subjectsContainer}>
                      <Text style={styles.subjectsTitle}>
                        📚 Assigned Subjects ({assigned.length}):
                      </Text>
                      <View style={styles.subjectChips}>
                        {assigned.map((sub, idx) => (
                          <View key={sub.id || idx} style={styles.subjectBadge}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Text style={styles.subjectBadgeCode}>{sub.subjectCode || sub.name}</Text>
                              {sub.year && <Text style={styles.subjectBadgeMeta}>Y{sub.year}</Text>}
                              {sub.semester && <Text style={styles.subjectBadgeMeta}>S{sub.semester}</Text>}
                              <Text style={styles.subjectLectureCount}>
                                • 🎙️ {sub.lecturesConducted || 0}
                              </Text>
                            </View>

                            {tab === 'approved' && (
                              <TouchableOpacity
                                style={styles.chipRemoveBtn}
                                onPress={() => handleUnassignSubject(item, sub)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                              >
                                <Text style={styles.chipRemoveText}>✕</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        ))}
                      </View>
                    </View>
                  ) : (
                    <View style={styles.noSubjectsRow}>
                      <Text style={styles.noSubjectsText}>No subjects assigned yet.</Text>
                      {tab === 'approved' && (
                        <TouchableOpacity onPress={() => handleOpenAssignModal(item)}>
                          <Text style={styles.assignNowText}>+ Assign Now</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {tab === 'pending' && (
                  <View style={styles.actionContainer}>
                    <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                      <Text style={styles.approveBtnText}>✅ Approve Account</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleReject(item)}>
                      <Text style={styles.rejectBtnText}>❌ Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          }}
        />
      )}

      {/* ─── SUBJECT ASSIGNMENT MODAL ─────────────────────────────────────── */}
      <Modal
        visible={assignModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Assign Curriculum Subjects</Text>
                <Text style={styles.modalSubtitle}>
                  Teacher: <Text style={{ color: Colors.primary, fontWeight: '700' }}>{selectedFaculty?.name}</Text>
                </Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setAssignModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Modal Filters: Department & Year */}
            <View style={styles.modalFiltersRow}>
              <View style={{ flex: 1.2 }}>
                <Dropdown
                  label="Department"
                  items={departmentOptions}
                  selectedValue={assignModalDept}
                  onSelect={(d) => setAssignModalDept(d.value as string)}
                  containerStyle={styles.filterDropdown}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Dropdown
                  label="Year"
                  items={YEAR_OPTIONS}
                  selectedValue={assignModalYear}
                  onSelect={(y) => setAssignModalYear(y.value)}
                  containerStyle={styles.filterDropdown}
                />
              </View>
            </View>

            {/* Subjects List */}
            <Text style={styles.modalListHeader}>
              Available Subjects ({assignModalSubjects.length}):
            </Text>

            {assignLoading ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 30 }} />
            ) : assignModalSubjects.length === 0 ? (
              <View style={styles.modalEmpty}>
                <Text style={styles.modalEmptyText}>No subjects match the selected filters.</Text>
              </View>
            ) : (
              <FlatList
                data={assignModalSubjects}
                keyExtractor={(sub) => sub._id || sub.id}
                style={{ maxHeight: 380 }}
                contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                renderItem={({ item: sub }) => {
                  const isAssigned = (selectedFaculty?.assignedSubjects || []).some(
                    (s: any) => (s.id || s._id) === (sub.id || sub._id)
                  );

                  return (
                    <View style={styles.modalSubCard}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.modalSubName}>{sub.name}</Text>
                        <View style={styles.modalSubMeta}>
                          <Text style={styles.modalSubCode}>{sub.subjectCode || sub.subject_code}</Text>
                          <Text style={styles.modalSubTag}>Year {sub.year} • Sem {sub.semester}</Text>
                        </View>
                      </View>

                      {isAssigned ? (
                        <TouchableOpacity
                          style={styles.modalRemoveBtn}
                          onPress={() => handleUnassignSubject(selectedFaculty, sub)}
                        >
                          <Text style={styles.modalRemoveBtnText}>✓ Assigned (Remove)</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          style={styles.modalAssignBtn}
                          onPress={() => handleAssignSubject(sub)}
                        >
                          <Text style={styles.modalAssignBtnText}>+ Assign</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', color: Colors.onSurface },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceContainerHigh,
    marginHorizontal: 16,
    borderRadius: 12,
    padding: 4,
    marginVertical: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTabBtn: {
    backgroundColor: Colors.primaryContainer,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  activeTabText: {
    color: Colors.onPrimaryContainer,
    fontWeight: '700',
  },
  filterSection: {
    backgroundColor: Colors.surfaceContainerLow,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterToggleBtn: {
    paddingVertical: 4,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  resetFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.error,
  },
  dropdownGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  dropdownCol: {
    flex: 1,
    minWidth: 140,
  },
  filterDropdown: {
    marginBottom: 4,
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  name: { fontSize: 16, fontWeight: '700', color: Colors.onSurface },
  email: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 2 },
  meta: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 4 },
  pendingBadge: {
    backgroundColor: 'rgba(255, 180, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pendingBadgeText: {
    color: '#ffc107',
    fontSize: 11,
    fontWeight: '700',
  },
  lectureBadge: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  lectureBadgeText: {
    color: '#64b5f6',
    fontSize: 12,
    fontWeight: '700',
  },
  detailsRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    gap: 8,
  },
  deptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dept: { fontSize: 13, color: Colors.onSurfaceVariant },
  boldText: { color: Colors.onSurface, fontWeight: '600' },
  assignSubjectActionBtn: {
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
  },
  assignSubjectActionText: {
    color: '#64b5f6',
    fontSize: 11,
    fontWeight: '700',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  yearChip: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  yearChipText: {
    color: Colors.onPrimaryContainer,
    fontSize: 11,
    fontWeight: '700',
  },
  semChip: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  semChipText: {
    color: Colors.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  subjectsContainer: {
    marginTop: 4,
  },
  subjectsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 6,
  },
  subjectChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  subjectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 6,
  },
  subjectBadgeCode: {
    color: Colors.onSurface,
    fontSize: 11,
    fontWeight: '700',
  },
  subjectBadgeMeta: {
    color: Colors.primary,
    fontSize: 10,
    fontWeight: '600',
  },
  subjectLectureCount: {
    color: '#81c784',
    fontSize: 10,
    fontWeight: '700',
  },
  chipRemoveBtn: {
    backgroundColor: 'rgba(255, 82, 82, 0.2)',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    marginLeft: 2,
  },
  chipRemoveText: {
    color: '#ff5252',
    fontSize: 10,
    fontWeight: '800',
  },
  noSubjectsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  noSubjectsText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    fontStyle: 'italic',
  },
  assignNowText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  actionContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  approveBtn: {
    flex: 1,
    backgroundColor: '#2e7d32',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  rejectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(211, 47, 47, 0.15)',
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectBtnText: {
    color: '#ff5252',
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },
  clearFiltersBtn: {
    marginTop: 16,
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  clearFiltersText: {
    color: Colors.onPrimaryContainer,
    fontSize: 13,
    fontWeight: '700',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surfaceContainerLow,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  modalSubtitle: {
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    marginTop: 4,
  },
  modalCloseBtn: {
    backgroundColor: Colors.surfaceContainerHigh,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCloseText: {
    color: Colors.onSurface,
    fontSize: 14,
    fontWeight: '700',
  },
  modalFiltersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  modalListHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    marginBottom: 10,
  },
  modalEmpty: {
    paddingVertical: 30,
    alignItems: 'center',
  },
  modalEmptyText: {
    color: Colors.onSurfaceVariant,
    fontSize: 13,
    fontStyle: 'italic',
  },
  modalSubCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerHigh,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  modalSubName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  modalSubMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  modalSubCode: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  modalSubTag: {
    fontSize: 11,
    color: Colors.onSurfaceVariant,
  },
  modalAssignBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  modalAssignBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalRemoveBtn: {
    backgroundColor: 'rgba(46, 125, 50, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2e7d32',
  },
  modalRemoveBtnText: {
    color: '#81c784',
    fontSize: 11,
    fontWeight: '700',
  },
});
