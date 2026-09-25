import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors, Spacing, Typography } from '../../constants/colors';
import { adminApi } from '../../api/admin.api';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';

export const ManageDepartmentsScreen = ({ navigation }: any) => {
  const [depts, setDepts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDepts();
  }, []);

  const fetchDepts = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      const res = await adminApi.getDepartments();
      setDepts(res.departments || []);
    } catch (e) {
      console.warn('Fetch departments error:', e);
      setDepts([
        { _id: '1', name: 'Computer Engineering', code: 'COMP', teacherCount: 1 },
        { _id: '2', name: 'Information Technology', code: 'IT', teacherCount: 1 },
        { _id: '3', name: 'Artificial Intelligence & Data Science', code: 'AIDS', teacherCount: 0 },
        { _id: '4', name: 'Electronics & Telecommunication', code: 'EXTC', teacherCount: 0 },
        { _id: '5', name: 'Mechanical Engineering', code: 'MECH', teacherCount: 0 },
      ]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSelectDept = (dept: any) => {
    navigation.navigate('DepartmentDetails', { department: dept });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Academic Departments"
        subtitle="Manage college departments & faculty"
        showBack
        onBack={() => navigation.goBack()}
      />

      {loading && !refreshing ? (
        <LoadingSpinner fullScreen message="Loading departments..." />
      ) : (
        <FlatList
          data={depts}
          keyExtractor={(item) => item.id || item._id || String(Math.random())}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDepts(true)}
              tintColor={Colors.primary}
            />
          }
          ListEmptyComponent={
            <EmptyState
              icon="🏛️"
              title="No departments found"
              description="No academic departments are registered in the system."
              actionText="Refresh"
              onAction={() => fetchDepts(true)}
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => handleSelectDept(item)}
              activeOpacity={0.7}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.name}>{item.name}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.codeBadge}>
                    <Text style={styles.codeText}>{item.code || 'DEPT'}</Text>
                  </View>
                  {item.teacherCount !== undefined && (
                    <Text style={styles.teacherCountText}>
                      {item.teacherCount} {item.teacherCount === 1 ? 'Teacher' : 'Teachers'}
                    </Text>
                  )}
                </View>
              </View>
              <Text style={styles.chevron}>→</Text>
            </TouchableOpacity>
          )}
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
  list: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
    gap: Spacing.sm + 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
    marginRight: Spacing.md,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  codeBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  teacherCountText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chevron: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
