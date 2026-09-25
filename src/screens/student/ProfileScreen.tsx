import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Alert } from 'react-native';
import { Colors, Spacing, Shadows, Typography } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { ScreenHeader } from '../../components/ui/ScreenHeader';
import { AppButton } from '../../components/ui/AppButton';
import { getProfileAvatar } from '../../utils/avatarUtils';

// ─── Academic helpers ──────────────────────────────────────────────────────────

const getYearLabel = (year: number | null | undefined): string => {
  switch (year) {
    case 1: return '1st Year';
    case 2: return '2nd Year';
    case 3: return '3rd Year';
    case 4: return '4th Year';
    default: return '—';
  }
};

export const ProfileScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // ── All values derived from the authenticated user object (single source of truth) ──
  const deptName =
    user?.departments?.name ||
    user?.department?.name ||
    null;

  // Roll Number and Student ID are SEPARATE identifiers
  const rollNumber = user?.roll_number || user?.rollNumber || null;
  const studentId  = user?.student_id  || user?.studentId  || null;

  const yearLabel = getYearLabel(user?.year);
  const divisionLabel = user?.division ? `Division ${user.division}` : null;
  const yearDivision = yearLabel !== '—' && divisionLabel
    ? `${yearLabel} • ${divisionLabel}`
    : yearLabel !== '—'
    ? yearLabel
    : divisionLabel ?? '—';

  const semesterLabel = user?.semester ? `Semester ${user.semester}` : '—';

  // ── Incomplete profile warning ──
  const isProfileIncomplete =
    !deptName || !user?.year || !user?.division || !user?.semester;

  return (
    <View style={styles.container}>
      <ScreenHeader title="Profile" subtitle="Student account information" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Incomplete Profile Banner */}
        {isProfileIncomplete && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Academic profile is incomplete. Contact your administrator to set your department, year, semester, and division.
            </Text>
          </View>
        )}

        {/* User Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Image
              source={getProfileAvatar(user?.profilePic, user?.gender)}
              style={styles.avatar}
            />
          </View>
          <Text style={styles.name}>{user?.name ?? '—'}</Text>
          <Text style={styles.email}>{user?.email ?? '—'}</Text>

          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>STUDENT</Text>
          </View>
        </View>

        {/* Academic Details Card */}
        <View style={styles.detailsCard}>
          <DetailRow label="Roll Number" value={rollNumber ?? '—'} />
          <Divider />
          <DetailRow label="Student ID" value={studentId ?? '—'} />
          <Divider />
          <DetailRow label="Department" value={deptName ?? '—'} />
          <Divider />
          <DetailRow label="Year / Class" value={yearDivision} />
          <Divider />
          <DetailRow label="Semester" value={semesterLabel} />
          <Divider />
          <DetailRow label="Role" value="Student" />
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

// ─── Sub-components ───────────────────────────────────────────────────────────

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text style={styles.detailValue} numberOfLines={2}>{value}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCD34D',
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  warningIcon: {
    fontSize: 16,
    marginTop: 1,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    lineHeight: 19,
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
  logoutBtn: {
    marginTop: Spacing.sm,
  },
});
