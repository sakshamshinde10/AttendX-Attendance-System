import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors } from '../../constants/colors';
import { AttendanceBarChart } from '../../components/charts/AttendanceBarChart';

export const AnalyticsScreen = () => {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>System Analytics & Trends</Text>
      <Text style={styles.sub}>Overall campus attendance distribution across departments</Text>

      <Text style={styles.sectionHeader}>Weekly Check-in Distribution</Text>
      <AttendanceBarChart />

      <View style={styles.statsCard}>
        <Text style={styles.cardTitle}>Monthly Summary</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Average Attendance Rate:</Text>
          <Text style={styles.val}>91.4%</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Total Active Sessions:</Text>
          <Text style={styles.val}>348</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Proxy Rejections (BLE/QR):</Text>
          <Text style={[styles.val, { color: Colors.error }]}>42 Prevented</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16 },
  title: { fontSize: 24, fontWeight: '800', color: Colors.onSurface, marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.onSurfaceVariant, marginBottom: 20 },
  sectionHeader: { fontSize: 16, fontWeight: '700', color: Colors.onSurface, marginBottom: 12 },
  statsCard: { backgroundColor: Colors.surfaceContainerLow, borderRadius: 20, padding: 18, marginTop: 20, gap: 12 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: Colors.onSurface, marginBottom: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 14, color: Colors.onSurfaceVariant },
  val: { fontSize: 14, fontWeight: '700', color: Colors.onSurface },
});
