import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from './src/hooks/useAuth';
import SplashScreen from './src/components/SplashScreen';
import AppNavigator from './src/navigation/AppNavigator';
import AuthNavigator from './src/navigation/AuthNavigator';
import { AlertProvider } from './src/components/AlertProvider';
import * as ExpoSplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
ExpoSplashScreen.preventAutoHideAsync();

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [splashComplete, setSplashComplete] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Hide native splash immediately
        await ExpoSplashScreen.hideAsync();
        
        // Wait for a minimum time and auth to load
        await new Promise(resolve => {
          const timer = setTimeout(resolve, 2500); // Minimum splash time
          if (!loading) clearTimeout(timer);
          return timer;
        });
        
        setIsReady(true);
      } catch (error) {
        console.error('App initialization error:', error);
        setIsReady(true);
      }
    };

    initializeApp();
  }, [loading]);

  const handleSplashFinish = () => {
    setSplashComplete(true);
  };

  // Show splash screen until both ready and animation complete
  if (!isReady || !splashComplete) {
    return (
      <>
        <SplashScreen onFinish={handleSplashFinish} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <AlertProvider>
      <NavigationContainer>
        <StatusBar style="dark" backgroundColor="#F8FAFC" />
        {user ? <AppNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </AlertProvider>
  );
}
