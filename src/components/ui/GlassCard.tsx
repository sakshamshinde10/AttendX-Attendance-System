import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface GlassCardProps {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  variant?: 'low' | 'normal' | 'high' | 'lowest';
}

export const GlassCard = ({ children, style, variant = 'normal' }: GlassCardProps) => {
  const getBgColor = () => {
    switch (variant) {
      case 'lowest':
        return Colors.surfaceContainerLowest;
      case 'low':
        return Colors.surfaceContainerLow;
      case 'high':
        return Colors.surfaceContainerHigh;
      default:
        return Colors.surfaceContainer;
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: getBgColor() }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
});
