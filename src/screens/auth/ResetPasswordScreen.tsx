import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Colors } from '../../constants/colors';
import { authApi } from '../../api/auth.api';

export const ResetPasswordScreen = ({ route, navigation }: any) => {
  const tokenFromNav = route.params?.token || '';
  const [token, setToken] = useState(tokenFromNav);
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!token || !newPassword) {
      Alert.alert('Error', 'Please fill in token and new password');
      return;
    }

    try {
      setLoading(true);
      const res = await authApi.resetPassword(token, newPassword);
      if (res.success) {
        Alert.alert('Success', 'Your password has been reset successfully!', [
          { text: 'Login Now', onPress: () => navigation.navigate('Login') },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>Enter the reset token and your new password</Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Reset Token</Text>
        <TextInput
          style={styles.input}
          placeholder="Paste reset token"
          placeholderTextColor={Colors.onSurfaceVariant}
          value={token}
          onChangeText={setToken}
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          placeholder="Minimum 6 characters"
          placeholderTextColor={Colors.onSurfaceVariant}
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
        />
      </View>

      <TouchableOpacity
        style={[styles.btn, loading && { opacity: 0.7 }]}
        onPress={handleReset}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color={Colors.onPrimary} />
        ) : (
          <Text style={styles.btnText}>Set New Password</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 24,
  },
  inputGroup: {
    gap: 6,
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurface,
  },
  input: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.onSurface,
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  btn: {
    backgroundColor: Colors.primary,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  btnText: {
    color: Colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
