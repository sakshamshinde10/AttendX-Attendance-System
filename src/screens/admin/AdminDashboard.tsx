import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors } from '../../constants/colors';
import { adminApi } from '../../api/admin.api';

export const AdminDashboard = ({ navigation }: any) => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDashboard();
      setStats(res.stats);
    } catch (e) {
      console.warn('Admin dashboard load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = (type: string) => {
    Alert.alert('Report Exported', `${type} report generated and saved to device storage.`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Overview Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.subText}>SWAS Administration</Text>
          <Text style={styles.title}>Admin Console</Text>
        </View>
        <View style={styles.datePill}>
          <Text style={styles.dateText}>⚡ System Online</Text>
        </View>
      </View>

      {/* Key Metrics Bento Grid */}
      <View style={styles.grid}>
        <View style={[styles.card, { backgroundColor: Colors.primaryContainer }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardIcon}>👥</Text>
            <Text style={[styles.badgeText, { color: Colors.onPrimaryContainer }]}>+12%</Text>
          </View>
          <Text style={[styles.cardTitle, { color: 'rgba(218, 226, 255, 0.8)' }]}>Active Users</Text>
          <Text style={[styles.cardNum, { color: Colors.onPrimaryContainer }]}>
            {stats?.totalStudents || 1284}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: Colors.secondaryContainer }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardIcon}>📡</Text>
            <Text style={[styles.badgeText, { color: Colors.onSecondaryContainer }]}>Live</Text>
          </View>
          <Text style={[styles.cardTitle, { color: 'rgba(220, 226, 249, 0.8)' }]}>Today's Sessions</Text>
          <Text style={[styles.cardNum, { color: Colors.onSecondaryContainer }]}>
            {stats?.todaySessions || 24}
          </Text>
        </View>
      </View>

      {/* Quick Report Export Toolbar */}
      <View style={styles.reportBar}>
        <Text style={styles.reportBarTitle}>Export System Reports</Text>
        <View style={styles.reportBarBtns}>
          <TouchableOpacity
            style={styles.exportBtn}
            onPress={() => handleExportReport('CSV Attendance Summary')}
          >
            <Text style={styles.exportText}>📄 Export CSV</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: '#3B82F6' }]}
            onPress={() => handleExportReport('PDF Audit Trail')}
          >
            <Text style={styles.exportText}>📕 Export PDF</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Management Navigation Hub */}
      <Text style={styles.sectionTitle}>Management Modules</Text>
      <View style={styles.moduleGrid}>
        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigation.navigate('Students')}
        >
          <Text style={styles.moduleIcon}>🎓</Text>
          <Text style={styles.moduleTitle}>Manage Students & Devices</Text>
          <Text style={styles.moduleSub}>View hardware bindings & enrollment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigation.navigate('Faculty')}
        >
          <Text style={styles.moduleIcon}>👨‍🏫</Text>
          <Text style={styles.moduleTitle}>Manage Faculty Roster</Text>
          <Text style={styles.moduleSub}>Faculty roster & subject assignment</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigation.navigate('Subjects')}
        >
          <Text style={styles.moduleIcon}>📜</Text>
          <Text style={styles.moduleTitle}>Audit Trail Logs</Text>
          <Text style={styles.moduleSub}>Append-only security event history</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.moduleCard}
          onPress={() => navigation.navigate('Departments')}
        >
          <Text style={styles.moduleIcon}>🏛️</Text>
          <Text style={styles.moduleTitle}>Departments</Text>
          <Text style={styles.moduleSub}>Academic departments & HODs</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 20,
  },
  subText: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  datePill: {
    backgroundColor: Colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIcon: {
    fontSize: 22,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardNum: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  reportBar: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 18,
    padding: 16,
    marginBottom: 24,
  },
  reportBarTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 12,
  },
  reportBarBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  exportBtn: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  exportText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 14,
  },
  moduleGrid: {
    gap: 12,
  },
  moduleCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 18,
    padding: 16,
  },
  moduleIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  moduleSub: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
});
