import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../constants/colors';

interface BarData {
  day: string;
  heightPct: number; // 0 to 100
  isActive?: boolean;
}

const DEFAULT_DAYS: BarData[] = [
  { day: 'M', heightPct: 40 },
  { day: 'T', heightPct: 80 },
  { day: 'W', heightPct: 60 },
  { day: 'T', heightPct: 95, isActive: true },
  { day: 'F', heightPct: 30 },
  { day: 'S', heightPct: 20 },
  { day: 'S', heightPct: 10 },
];

export const AttendanceBarChart = ({ data = DEFAULT_DAYS }: { data?: BarData[] }) => {
  return (
    <View style={styles.container}>
      <View style={styles.barsRow}>
        {data.map((item, index) => (
          <View key={index} style={styles.barColumn}>
            <View
              style={[
                styles.barFill,
                {
                  height: `${item.heightPct}%`,
                  backgroundColor: item.isActive ? Colors.primary : 'rgba(178, 197, 255, 0.2)',
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labelsRow}>
        {data.map((item, index) => (
          <Text
            key={index}
            style={[
              styles.dayLabel,
              item.isActive && { color: Colors.primary, fontWeight: '700' },
            ]}
          >
            {item.day}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    padding: 16,
  },
  barsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 70,
    gap: 8,
  },
  barColumn: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
    borderRadius: 8,
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
});
