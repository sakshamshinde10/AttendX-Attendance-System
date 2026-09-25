import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { AdminDashboard } from '../screens/admin/AdminDashboard';
import { ManageStudentsScreen } from '../screens/admin/ManageStudentsScreen';
import { ManageFacultyScreen } from '../screens/admin/ManageFacultyScreen';
import { ManageSubjectsScreen } from '../screens/admin/ManageSubjectsScreen';
import { ManageDepartmentsScreen } from '../screens/admin/ManageDepartmentsScreen';
import { DepartmentDetailsScreen } from '../screens/admin/DepartmentDetailsScreen';
import { AnalyticsScreen } from '../screens/admin/AnalyticsScreen';
import { NotificationsScreen } from '../screens/admin/NotificationsScreen';

const Stack = createStackNavigator();

export const AdminNavigator = () => {
  return (
    <Stack.Navigator id="AdminStack" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      <Stack.Screen name="Students" component={ManageStudentsScreen} />
      <Stack.Screen name="Faculty" component={ManageFacultyScreen} />
      <Stack.Screen name="Subjects" component={ManageSubjectsScreen} />
      <Stack.Screen name="Departments" component={ManageDepartmentsScreen} />
      <Stack.Screen name="DepartmentDetails" component={DepartmentDetailsScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
    </Stack.Navigator>
  );
};
