import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Spacing, Shadows, Typography } from '../../constants/colors';
import { AppButton } from '../../components/ui/AppButton';

export const AttendanceSuccessScreen = ({ route, navigation }: any) => {
  const record = route.params?.record || {};
  const isOfflineQueued = route.params?.isOfflineQueued === true;

  const subject = record.subject || 'Database Management System';
  const lectureNum = record.lectureNumber || record.lecture_number || '05';
  const timeStr = record.markedAt || record.marked_at
    ? new Date(record.markedAt || record.marked_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successCard}>
          {/* Check circle — orange if offline, green if online */}
          <View style={[styles.checkCircle, isOfflineQueued && styles.checkCircleOffline]}>
            <Text style={styles.checkIcon}>{isOfflineQueued ? '📶' : '✓'}</Text>
          </View>

          <Text style={styles.title}>
            {isOfflineQueued ? 'Attendance Saved Offline' : 'Attendance Marked'}
          </Text>

          {isOfflineQueued && (
            <View style={styles.offlineBanner}>
              <Text style={styles.offlineBannerText}>
                📡 You're offline — attendance has been saved locally and will sync automatically when internet is available.
              </Text>
            </View>
          )}

          <View style={styles.detailsGroup}>
            <Text style={styles.subjectText}>{subject}</Text>
            <Text style={styles.lectureText}>Lecture {lectureNum}</Text>
          </View>

          <Text style={styles.timeText}>{timeStr}</Text>

          <View style={[styles.verificationBadge, isOfflineQueued && styles.verificationBadgeOffline]}>
            <Text style={styles.verificationText}>
              {isOfflineQueued ? 'Pending Sync' : 'Verification Complete'}
            </Text>
          </View>

          <AppButton
            title="Back to Dashboard"
            onPress={() => navigation.navigate('StudentTabs', { screen: 'Home' })}
            size="lg"
            style={styles.backBtn}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.xxxl,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    ...Shadows.card,
  },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.successLight,
    borderWidth: 2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  checkIcon: {
    fontSize: 32,
    color: Colors.success,
    fontWeight: '700',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.lg,
  },
  detailsGroup: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  subjectText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  lectureText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  verificationBadge: {
    backgroundColor: Colors.surfaceVariant,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.xxl,
  },
  verificationText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  backBtn: {
    width: '100%',
  },
  checkCircleOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    width: '100%',
  },
  offlineBannerText: {
    fontSize: 13,
    color: '#92400E',
    lineHeight: 20,
    textAlign: 'center',
  },
  verificationBadgeOffline: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FCD34D',
  },
});
