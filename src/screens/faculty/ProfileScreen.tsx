import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { Colors, Spacing, Shadows, Typography } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { facultyApi } from '../../api/faculty.api';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { AppButton } from '../../components/ui/AppButton';
import { getProfileAvatar } from '../../utils/avatarUtils';

export const FacultyProfileScreen = () => {
  const { user, logout } = useAuth();
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    loadSubjects();
  }, []);

  const loadSubjects = async () => {
    try {
      const res = await facultyApi.getMySubjects();
      setSubjects(res.subjects || []);
    } catch (e) {
      console.warn('Failed to load profile subjects:', e);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const deptName = user?.departments?.name || user?.department?.name || user?.department || 'Department of Computer Engineering';

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" subtitle="Faculty account details" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={getProfileAvatar(user?.profilePic, user?.gender)}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.name}>{user?.name || 'Professor'}</Text>
          <Text style={styles.email}>{user?.email}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>FACULTY</Text>
          </View>
        </View>

        {/* Academic Details */}
        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Department</Text>
            <Text style={styles.detailValue}>{deptName}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Role</Text>
            <Text style={styles.detailValue}>Faculty / Professor</Text>
          </View>

          {user?.phone ? (
            <>
              <View style={styles.divider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{user.phone}</Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Assigned Subjects */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardHeaderTitle}>Assigned Subjects</Text>
          {subjects.length > 0 ? (
            subjects.map((s: any, idx: number) => {
              const sid = s.id || s._id || idx;
              return (
                <View key={sid} style={styles.subjectItem}>
                  <Text style={styles.subjectCode}>{s.subjectCode || s.subject_code || 'SUB'}</Text>
                  <Text style={styles.subjectName}>{s.name}</Text>
                </View>
              );
            })
          ) : (
            <Text style={styles.emptySubjectText}>No assigned subjects listed.</Text>
          )}
        </View>

        {/* Sign Out Button */}
        <AppButton
          title="Sign Out"
          variant="secondary"
          onPress={handleLogout}
          size="lg"
          style={styles.logoutBtn}
          textStyle={{ color: Colors.error }}
        />
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xxxl,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  avatarWrap: {
    marginBottom: Spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.primaryContainer,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  email: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    maxWidth: '60%',
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  subjectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  subjectCode: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subjectName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  emptySubjectText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  logoutBtn: {
    marginTop: Spacing.sm,
  },
});
