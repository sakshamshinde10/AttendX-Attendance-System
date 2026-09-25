import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface StatusBadgeProps {
  status:
    | 'attended'
    | 'present'
    | 'upcoming'
    | 'completed'
    | 'active'
    | 'live'
    | 'missed'
    | 'absent'
    | 'flagged'
    | 'rejected'
    | string;
  style?: ViewStyle;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, style }) => {
  const s = status?.toLowerCase() || '';

  let bg = Colors.surfaceVariant;
  let text = Colors.textSecondary;
  let border = Colors.border;
  let label = (status || '').toUpperCase();

  if (s === 'attended' || s === 'present' || s === 'completed') {
    bg = Colors.successLight;
    text = Colors.success;
    border = '#BBF7D0';
    label = s === 'completed' ? 'Completed' : 'Present';
  } else if (s === 'active' || s === 'live') {
    bg = Colors.primaryLight;
    text = Colors.primary;
    border = Colors.primaryContainer;
    label = 'Active';
  } else if (s === 'upcoming' || s === 'next') {
    bg = Colors.infoLight;
    text = Colors.info;
    border = '#BAE6FD';
    label = 'Upcoming';
  } else if (s === 'flagged' || s === 'review') {
    bg = Colors.warningLight;
    text = Colors.warning;
    border = '#FDE68A';
    label = 'Under Review';
  } else if (s === 'missed' || s === 'absent' || s === 'rejected') {
    bg = Colors.errorLight;
    text = Colors.error;
    border = '#FECACA';
    label = s === 'rejected' ? 'Rejected' : 'Absent';
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor: border }, style]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
