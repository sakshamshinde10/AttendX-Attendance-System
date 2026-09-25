import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, Shadows, Typography } from '../../constants/colors';
import { useAuth } from '../../hooks/useAuth';
import { AppInput } from '../../components/ui/AppInput';
import { AppButton } from '../../components/ui/AppButton';

export const LoginScreen = ({ navigation }: any) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'faculty' | 'admin'>('student');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Incomplete Form', 'Please enter your email and password.');
      return;
    }

    try {
      setLoading(true);
      await login({ email, password });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Invalid credentials';
      Alert.alert('Sign In Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoRole: 'student' | 'faculty' | 'admin') => {
    setRole(demoRole);
    if (demoRole === 'admin') {
      setEmail('admin@example.com');
      setPassword('password123');
    } else if (demoRole === 'faculty') {
      setEmail('teacher@college.edu');
      setPassword('password123');
    } else if (demoRole === 'student') {
      setEmail('student@college.edu');
      setPassword('password123');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* College Portal Branding */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoIcon}>🎓</Text>
          </View>
          <Text style={styles.title}>WAMC Attendance</Text>
          <Text style={styles.subtitle}>Sign in to your college account</Text>
        </View>

        <View style={styles.card}>
          {/* Role Selector Tabs */}
          <View style={styles.roleContainer}>
            {(['student', 'faculty', 'admin'] as const).map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.roleTab, role === r && styles.activeRoleTab]}
                onPress={() => setRole(r)}
                activeOpacity={0.7}
              >
                <Text style={[styles.roleText, role === r && styles.activeRoleText]}>
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form Fields */}
          <AppInput
            label="Email Address"
            placeholder="e.g. student@college.edu"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <AppInput
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => navigation.navigate('ForgotPassword')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <AppButton
            title={`Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
            onPress={handleLogin}
            loading={loading}
            size="lg"
            style={styles.loginBtn}
          />

          {/* Quick Demo Credentials for Fast Testing */}
          <View style={styles.demoBox}>
            <Text style={styles.demoTitle}>Quick Demo Fill:</Text>
            <View style={styles.demoChips}>
              <TouchableOpacity
                style={[styles.chip, role === 'student' && styles.activeChip]}
                onPress={() => handleQuickDemo('student')}
              >
                <Text style={[styles.chipText, role === 'student' && styles.activeChipText]}>
                  Student
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, role === 'faculty' && styles.activeChip]}
                onPress={() => handleQuickDemo('faculty')}
              >
                <Text style={[styles.chipText, role === 'faculty' && styles.activeChipText]}>
                  Teacher
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.chip, role === 'admin' && styles.activeChip]}
                onPress={() => handleQuickDemo('admin')}
              >
                <Text style={[styles.chipText, role === 'admin' && styles.activeChipText]}>
                  Admin
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Register</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.xxxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  logoBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryContainer,
  },
  logoIcon: {
    fontSize: 28,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    ...Shadows.card,
  },
  roleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 8,
    padding: 3,
    marginBottom: Spacing.lg,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeRoleTab: {
    backgroundColor: '#FFFFFF',
    ...Shadows.card,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  activeRoleText: {
    color: Colors.primary,
    fontWeight: '700',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginBottom: Spacing.lg,
    marginTop: -Spacing.xs,
  },
  forgotText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  loginBtn: {
    width: '100%',
  },
  demoBox: {
    marginTop: Spacing.xl,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  demoChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  activeChip: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  activeChipText: {
    color: Colors.primary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
  footerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
});
