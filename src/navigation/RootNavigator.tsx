import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/colors';
import { AuthNavigator } from './AuthNavigator';
import { StudentNavigator } from './StudentNavigator';
import { FacultyNavigator } from './FacultyNavigator';
import { AdminNavigator } from './AdminNavigator';
import { AppHeader } from '../components/ui/AppHeader';

export const RootNavigator = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderRoleNavigator = () => {
    if (!user) {
      return <AuthNavigator />;
    }

    switch (user.role) {
      case 'student':
        return (
          <View style={styles.flexContainer}>
            <AppHeader title="WAMC Portal" />
            <StudentNavigator />
          </View>
        );
      case 'faculty':
        return (
          <View style={styles.flexContainer}>
            <AppHeader title="Faculty Portal" />
            <FacultyNavigator />
          </View>
        );
      case 'admin':
        return (
          <View style={styles.flexContainer}>
            <AppHeader title="Admin Portal" />
            <AdminNavigator />
          </View>
        );
      default:
        return <AuthNavigator />;
    }
  };

  return (
    <NavigationContainer>
      <View style={styles.flexContainer}>{renderRoleNavigator()}</View>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  flexContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
