import React, { useState } from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: ({ current, next, layouts }) => {
          return {
            cardStyle: {
              transform: [
                {
                  translateX: current.progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [layouts.screen.width, 0],
                  }),
                },
              ],
            },
          };
        },
      }}
    >
      <Stack.Screen name="Welcome">
        {({ navigation }) => (
          <WelcomeScreen
            onGetStarted={() => navigation.navigate('Register')}
            onSignIn={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>
      
      <Stack.Screen name="Login">
        {({ navigation }) => (
          <LoginScreen
            onForgotPassword={() => navigation.navigate('ForgotPassword')}
            onSignUp={() => navigation.navigate('Register')}
            onBack={() => navigation.navigate('Welcome')}
          />
        )}
      </Stack.Screen>
      
      <Stack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onSignIn={() => navigation.navigate('Login')}
            onBack={() => navigation.navigate('Welcome')}
          />
        )}
      </Stack.Screen>
      
      <Stack.Screen name="ForgotPassword">
        {({ navigation }) => (
          <ForgotPasswordScreen
            onBack={() => navigation.navigate('Login')}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}