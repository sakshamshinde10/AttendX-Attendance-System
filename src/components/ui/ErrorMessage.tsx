import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Spacing } from '../../constants/colors';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  style?: ViewStyle;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry, style }) => {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>⚠️</Text>
      <View style={styles.textContainer}>
        <Text style={styles.message}>{message}</Text>
        {onRetry && (
          <TouchableOpacity onPress={onRetry} activeOpacity={0.7} style={styles.retryBtn}>
            <Text style={styles.retryText}>Try Again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.errorLight,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    padding: Spacing.md,
    marginVertical: Spacing.sm,
  },
  icon: {
    fontSize: 16,
    marginRight: Spacing.sm,
    marginTop: 1,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '500',
    lineHeight: 18,
  },
  retryBtn: {
    marginTop: Spacing.xs,
  },
  retryText: {
    fontSize: 13,
    color: Colors.error,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
