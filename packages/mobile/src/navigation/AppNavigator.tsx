import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text } from 'react-native';
import { Colors } from '../constants/theme';

// Import screens
import DashboardScreen from '../screens/DashboardScreen';
import GroupsStackNavigator from './GroupsStackNavigator';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const AnalyticsScreen = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>Analytics Screen</Text>
  </View>
);


export default function AppNavigator() {
  return (
    <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            paddingTop: 8,
            paddingBottom: 8,
            height: 80,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '500',
            marginTop: 4,
          },
          headerStyle: {
            backgroundColor: Colors.surface,
            borderBottomColor: Colors.border,
          },
          headerTitleStyle: {
            color: Colors.textPrimary,
            fontSize: 18,
            fontWeight: '600',
          },
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size, focused }) => (
              <Text style={{ fontSize: size, color }}>
                {focused ? '🏠' : '🏠'}
              </Text>
            ),
            headerTitle: 'SharePay',
          }}
        />
        <Tab.Screen
          name="Groups"
          component={GroupsStackNavigator}
          options={{
            tabBarLabel: 'Groups',
            tabBarIcon: ({ color, size, focused }) => (
              <Text style={{ fontSize: size, color }}>
                {focused ? '👥' : '👥'}
              </Text>
            ),
            headerShown: false,
          }}
        />
        <Tab.Screen
          name="Analytics"
          component={AnalyticsScreen}
          options={{
            tabBarLabel: 'Analytics',
            tabBarIcon: ({ color, size, focused }) => (
              <Text style={{ fontSize: size, color }}>
                {focused ? '📊' : '📊'}
              </Text>
            ),
          }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileScreen}
          options={{
            tabBarLabel: 'Profile',
            tabBarIcon: ({ color, size, focused }) => (
              <Text style={{ fontSize: size, color }}>
                {focused ? '👤' : '👤'}
              </Text>
            ),
          }}
        />
      </Tab.Navigator>
  );
}