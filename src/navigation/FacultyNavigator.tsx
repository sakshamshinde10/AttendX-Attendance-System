import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { FacultyDashboard } from '../screens/faculty/FacultyDashboard';
import { CreateSessionScreen } from '../screens/faculty/CreateSessionScreen';
import { ActiveQRScreen } from '../screens/faculty/ActiveQRScreen';
import { LiveAttendanceScreen } from '../screens/faculty/LiveAttendanceScreen';
import { FacultyReportsScreen } from '../screens/faculty/ReportsScreen';
import { FacultyProfileScreen } from '../screens/faculty/ProfileScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

const FacultyTabs = () => {
  const insets = useSafeAreaInsets();
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 8 : 4);

  return (
    <Tab.Navigator
      id="FacultyBottomTabs"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: Colors.border,
          height: 56 + bottomInset,
          paddingBottom: bottomInset,
          paddingTop: 6,
          elevation: 8,
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.05,
          shadowRadius: 4,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={FacultyDashboard}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>🏠</Text>
          ),
        }}
      />
      <Tab.Screen
        name="CreateSessionTab"
        component={CreateSessionScreen}
        options={{
          tabBarLabel: 'Session',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📡</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Reports"
        component={FacultyReportsScreen}
        options={{
          tabBarLabel: 'Reports',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>📊</Text>
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={FacultyProfileScreen}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ focused }) => (
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>👤</Text>
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const FacultyNavigator = () => {
  return (
    <Stack.Navigator id="FacultyStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FacultyTabs" component={FacultyTabs} />
      <Stack.Screen name="CreateSession" component={CreateSessionScreen} />
      <Stack.Screen name="ActiveQR" component={ActiveQRScreen} />
      <Stack.Screen name="LiveAttendance" component={LiveAttendanceScreen} />
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  tabIcon: {
    fontSize: 20,
  },
  tabIconActive: {
    transform: [{ scale: 1.1 }],
  },
});
