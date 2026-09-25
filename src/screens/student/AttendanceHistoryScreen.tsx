import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors, Spacing, Shadows, Typography } from '../../constants/colors';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { attendanceApi } from '../../api/attendance.api';

export const AttendanceHistoryScreen = ({ navigation }: any) => {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const data = await attendanceApi.getStudentHistory(1, 50);
      setRecords(data.records || []);
    } catch (err) {
      console.warn('Failed to fetch history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'absent') return r.status === 'absent' || r.status === 'rejected';
    return r.status === filter;
  });

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '08 Sep';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' });
  };

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Attendance History"
        subtitle="Complete log of your class attendance"
        showBack={navigation.canGoBack()}
        onBack={() => navigation.goBack()}
      />

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'present', 'absent'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.activeFilterChip]}
            onPress={() => setFilter(f)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.filterChipText,
                filter === f && styles.activeFilterChipText,
              ]}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <LoadingSpinner fullScreen message="Loading history records..." />
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No attendance records"
          description={
            records.length === 0
              ? 'No attendance records have been logged yet. Once you scan in class, your history will appear here.'
              : 'No attendance records match the selected filter.'
          }
        />
      ) : (
        <FlatList
          data={filteredRecords}
          keyExtractor={(item) => item.id || item._id || String(Math.random())}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchHistory(true)}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => {
            const dateStr = formatDate(item.markedAt || item.marked_at);
            const subjectName = item.subject?.name || item.subject || 'Subject';
            const subCode = item.subject?.subject_code || item.subject?.subjectCode || '';
            const status = item.status || 'present';

            return (
              <View style={styles.tableRow}>
                <View style={styles.dateCol}>
                  <Text style={styles.dateText}>{dateStr}</Text>
                </View>

                <View style={styles.subjectCol}>
                  <Text style={styles.subjectNameText} numberOfLines={1}>
                    {subjectName}
                  </Text>
                  {subCode ? <Text style={styles.subCodeText}>{subCode}</Text> : null}
                </View>

                <View style={styles.statusCol}>
                  <StatusBadge status={status} />
                </View>
              </View>
            );
          }}
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  activeFilterChip: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeFilterChipText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  tableRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    ...Shadows.card,
  },
  dateCol: {
    width: 65,
    marginRight: Spacing.sm,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  subjectCol: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  subjectNameText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  subCodeText: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  statusCol: {
    alignItems: 'flex-end',
  },
});
