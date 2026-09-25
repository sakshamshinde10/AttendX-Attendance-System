import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing, Shadows } from '../../constants/colors';

interface AttendanceCardProps {
  title?: string;
  percentage: number;
  attendedLectures: number;
  totalLectures: number;
  style?: ViewStyle;
}

export const AttendanceCard: React.FC<AttendanceCardProps> = ({
  title = 'Overall Attendance',
  percentage,
  attendedLectures,
  totalLectures,
  style,
}) => {
  const getProgressColor = (pct: number) => {
    if (pct >= 85) return Colors.success;
    if (pct >= 75) return Colors.warning;
    return Colors.error;
  };

  const progressColor = getProgressColor(percentage);

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.centerSection}>
        <Text style={[styles.percentage, { color: progressColor }]}>
          {Math.round(percentage)}%
        </Text>
        <Text style={styles.subtitle}>
          {attendedLectures} of {totalLectures} lectures
        </Text>
      </View>

      {/* Clean Linear Progress Bar */}
      <View style={styles.track}>
        <View
          style={[
            styles.bar,
            {
              width: `${Math.min(Math.max(percentage, 0), 100)}%`,
              backgroundColor: progressColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  centerSection: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  percentage: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    fontWeight: '500',
  },
  track: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    marginTop: Spacing.lg,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 3,
  },
});
