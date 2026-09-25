import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/colors';
import { adminApi } from '../../api/admin.api';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorMessage } from '../../components/ui/ErrorMessage';

export const DepartmentDetailsScreen = ({ route, navigation }: any) => {
  const initialDept = route.params?.department || {};
  const deptId = initialDept.id || initialDept._id;

  const [department, setDepartment] = useState<any>(initialDept);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDepartmentTeachers = useCallback(
    async (isRefresh = false) => {
      if (!deptId) {
        setError('Invalid department identifier.');
        setLoading(false);
        return;
      }

      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);

        const res = await adminApi.getDepartmentTeachers(deptId);
        if (res.success) {
          if (res.department) {
            setDepartment(res.department);
          }
          setTeachers(res.teachers || []);
        } else {
          setError(res.message || 'Unable to load teachers.');
        }
      } catch (err: any) {
        console.warn('Load department teachers error:', err);
        setError('Unable to load teachers.\n\nPlease try again.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [deptId]
  );

  useEffect(() => {
    fetchDepartmentTeachers();
  }, [fetchDepartmentTeachers]);

  const deptName = department.name || 'Department Details';
  const deptCode = department.code || '';
  const teacherCount = teachers.length;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Department Details"
        subtitle="Teachers & departmental info"
        showBack
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchDepartmentTeachers(true)}
            tintColor={Colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Department Overview Banner */}
        <View style={styles.deptCard}>
          <Text style={styles.deptName}>{deptName}</Text>
          <View style={styles.metaRow}>
            {deptCode ? (
              <Text style={styles.deptMetaText}>
                Department Code:{' '}
                <Text style={styles.boldText}>{deptCode}</Text>
              </Text>
            ) : null}
            <Text style={styles.deptMetaText}>
              Total Teachers:{' '}
              <Text style={styles.boldText}>{teacherCount}</Text>
            </Text>
          </View>
          {department.description ? (
            <Text style={styles.deptDescription}>{department.description}</Text>
          ) : null}
        </View>

        {/* Teachers Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Teachers</Text>
          {!loading && !error && (
            <Text style={styles.teacherCountPill}>
              {teacherCount} {teacherCount === 1 ? 'Teacher' : 'Teachers'}
            </Text>
          )}
        </View>

        {/* Loading State */}
        {loading && !refreshing && (
          <View style={styles.loadingContainer}>
            <LoadingSpinner message="Loading teachers..." />
          </View>
        )}

        {/* Error State */}
        {!loading && error && (
          <ErrorMessage
            message={error}
            onRetry={() => fetchDepartmentTeachers()}
            style={styles.errorContainer}
          />
        )}

        {/* Empty State */}
        {!loading && !error && teachers.length === 0 && (
          <View style={styles.emptyContainer}>
            <EmptyState
              icon="👨‍🏫"
              title="No teachers assigned"
              description="Teachers belonging to this department will appear here."
              actionText="Refresh"
              onAction={() => fetchDepartmentTeachers()}
            />
          </View>
        )}

        {/* Minimal Clean Teacher List */}
        {!loading && !error && teachers.length > 0 && (
          <View style={styles.teacherList}>
            {teachers.map((teacher, index) => {
              const tid = teacher.id || teacher._id || String(index);
              const isLast = index === teachers.length - 1;

              return (
                <View key={tid}>
                  <View style={styles.teacherRow}>
                    <View style={styles.teacherInfo}>
                      <Text style={styles.teacherName}>{teacher.name}</Text>
                      <Text style={styles.teacherEmail}>{teacher.email}</Text>
                      {teacher.subjects && teacher.subjects.length > 0 && (
                        <Text style={styles.teacherSubjects} numberOfLines={1}>
                          Subjects: {teacher.subjects.join(', ')}
                        </Text>
                      )}
                    </View>
                    {teacher.phone ? (
                      <Text style={styles.teacherPhone}>{teacher.phone}</Text>
                    ) : null}
                  </View>
                  {!isLast && <View style={styles.divider} />}
                </View>
              );
            })}
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
    paddingBottom: Spacing.xxxl,
  },
  deptCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
  deptName: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs + 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginTop: Spacing.xs,
  },
  deptMetaText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  boldText: {
    color: Colors.text,
    fontWeight: '700',
  },
  deptDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    lineHeight: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  teacherCountPill: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 6,
  },
  loadingContainer: {
    paddingVertical: Spacing.xxxl,
    alignItems: 'center',
  },
  errorContainer: {
    marginVertical: Spacing.lg,
  },
  emptyContainer: {
    marginTop: Spacing.md,
  },
  teacherList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.lg,
  },
  teacherRow: {
    paddingVertical: Spacing.md + 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teacherInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  teacherName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  teacherEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  teacherSubjects: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 3,
  },
  teacherPhone: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
});
