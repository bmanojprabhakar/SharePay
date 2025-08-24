import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Colors } from '../constants/theme';

// Import screens
import GroupsScreen from '../screens/GroupsScreen';
import CreateGroupScreen from '../screens/CreateGroupScreen';
import EditGroupScreen from '../screens/EditGroupScreen';
import GroupDetailScreen from '../screens/GroupDetailScreen';
import AddExpenseScreen from '../screens/AddExpenseScreen';

export type GroupsStackParamList = {
  GroupsList: undefined;
  CreateGroup: undefined;
  EditGroup: { groupId: string };
  GroupDetail: { groupId: string };
  AddExpense: { groupId: string; expenseToEdit?: any };
};

const Stack = createStackNavigator<GroupsStackParamList>();

export default function GroupsStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: Colors.surface,
          borderBottomColor: Colors.border,
        },
        headerTitleStyle: {
          color: Colors.textPrimary,
          fontSize: 18,
          fontWeight: '600',
        },
        headerTintColor: Colors.primary,
      }}
    >
      <Stack.Screen 
        name="GroupsList" 
        component={GroupsScreen}
        options={{ 
          headerShown: false // GroupsScreen has its own header
        }}
      />
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroupScreen}
        options={{
          title: 'Create Group',
          presentation: 'modal',
          headerShown: false, // CreateGroupScreen has its own header
        }}
      />
      <Stack.Screen 
        name="EditGroup" 
        component={EditGroupScreen}
        options={{
          title: 'Edit Group',
          presentation: 'modal',
          headerShown: false, // EditGroupScreen has its own header
        }}
      />
      <Stack.Screen 
        name="GroupDetail" 
        component={GroupDetailScreen}
        options={{
          title: 'Group Details',
          headerShown: false, // GroupDetailScreen has its own header
        }}
      />
      <Stack.Screen 
        name="AddExpense" 
        component={AddExpenseScreen}
        options={{
          title: 'Add Expense',
          presentation: 'modal',
          headerShown: false, // AddExpenseScreen has its own header
        }}
      />
    </Stack.Navigator>
  );
}