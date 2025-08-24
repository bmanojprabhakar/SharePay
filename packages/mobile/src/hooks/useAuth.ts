import { useState, useEffect } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
  AuthError,
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

interface AuthActions {
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearError: () => void;
  authenticateWithBiometrics: () => Promise<boolean>;
  setupBiometricAuth: (email: string, password: string) => Promise<void>;
}

const BIOMETRIC_CREDENTIALS_KEY = 'biometric_credentials';

export function useAuth(): AuthState & AuthActions {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const getAuthErrorMessage = (error: AuthError): string => {
    switch (error.code) {
      case 'auth/invalid-email':
        return 'Invalid email address';
      case 'auth/user-disabled':
        return 'This account has been disabled';
      case 'auth/user-not-found':
        return 'No account found with this email';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-credential':
        return 'Invalid email or password';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  const signIn = async (email: string, password: string, rememberMe = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      if (rememberMe) {
        // Store credentials for biometric auth
        await setupBiometricAuth(email, password);
      }
      
      setUser(result.user);
    } catch (err) {
      const error = err as AuthError;
      setError(getAuthErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update user profile with name
      await updateProfile(result.user, {
        displayName: name,
      });
      
      setUser(result.user);
    } catch (err) {
      const error = err as AuthError;
      setError(getAuthErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await firebaseSignOut(auth);
      setUser(null);
    } catch (err) {
      const error = err as AuthError;
      setError(getAuthErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      setError(null);
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      const error = err as AuthError;
      setError(getAuthErrorMessage(error));
      throw error;
    }
  };

  const clearError = () => {
    setError(null);
  };

  const authenticateWithBiometrics = async (): Promise<boolean> => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return false;
      }

      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      if (supportedTypes.length === 0) {
        return false;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Sign in to SharePay',
        cancelLabel: 'Cancel',
        fallbackLabel: 'Use Password',
      });

      if (result.success) {
        // Try to get stored credentials and sign in
        const credentials = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
        if (credentials) {
          const { email, password } = JSON.parse(credentials);
          await signIn(email, password);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  const setupBiometricAuth = async (email: string, password: string) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      if (!hasHardware) {
        return;
      }

      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      if (!isEnrolled) {
        return;
      }

      // Store credentials securely
      const credentials = JSON.stringify({ email, password });
      await SecureStore.setItemAsync(BIOMETRIC_CREDENTIALS_KEY, credentials);
    } catch (error) {
      console.error('Setup biometric auth error:', error);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    clearError,
    authenticateWithBiometrics,
    setupBiometricAuth,
  };
}