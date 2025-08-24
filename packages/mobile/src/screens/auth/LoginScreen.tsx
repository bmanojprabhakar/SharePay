import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';
import * as LocalAuthentication from 'expo-local-authentication';

interface LoginScreenProps {
  onForgotPassword: () => void;
  onSignUp: () => void;
  onBack: () => void;
}

export default function LoginScreen({
  onForgotPassword,
  onSignUp,
  onBack,
}: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  
  const { signIn, authenticateWithBiometrics, loading, error, clearError } = useAuth();

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Login Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const checkBiometricAvailability = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(hasHardware && isEnrolled);
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }

    try {
      await signIn(email.trim(), password, rememberMe);
    } catch (error) {
      // Error is handled by useAuth hook
    }
  };

  const handleBiometricAuth = async () => {
    try {
      const success = await authenticateWithBiometrics();
      if (!success) {
        Alert.alert(
          'Biometric Authentication',
          'Authentication failed or no stored credentials found'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Biometric authentication failed');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Email"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          leftIcon={<Text style={styles.inputIcon}>📧</Text>}
        />

        <Input
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
          leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
        />

        <View style={styles.options}>
          <TouchableOpacity
            style={styles.rememberMe}
            onPress={() => setRememberMe(!rememberMe)}
          >
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
              {rememberMe && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.rememberMeText}>Remember me</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onForgotPassword}>
            <Text style={styles.forgotPassword}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        <Button
          title="Sign In"
          onPress={handleSignIn}
          variant="primary"
          size="large"
          loading={loading}
          style={styles.signInButton}
        />

        {biometricAvailable && (
          <Button
            title="Sign in with Biometrics"
            onPress={handleBiometricAuth}
            variant="outline"
            size="large"
            icon={<Text style={styles.biometricIcon}>👆</Text>}
            style={styles.biometricButton}
          />
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title="Sign in with Google"
          onPress={() => Alert.alert('Coming Soon', 'Google Sign-In will be available in the next update')}
          variant="outline"
          size="large"
          icon={<Text style={styles.googleIcon}>🔵</Text>}
          style={styles.googleButton}
        />

        <View style={styles.signUpPrompt}>
          <Text style={styles.signUpPromptText}>Don't have an account? </Text>
          <TouchableOpacity onPress={onSignUp}>
            <Text style={styles.signUpLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xxl,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
  title: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  form: {
    flex: 1,
    marginBottom: Spacing.xl,
  },
  inputIcon: {
    fontSize: 18,
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: {
    color: Colors.surface,
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberMeText: {
    ...Typography.caption,
    color: Colors.textPrimary,
  },
  forgotPassword: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '500',
  },
  signInButton: {
    marginBottom: Spacing.md,
  },
  biometricButton: {
    marginBottom: Spacing.lg,
  },
  biometricIcon: {
    fontSize: 18,
  },
  footer: {},
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.md,
  },
  googleButton: {
    marginBottom: Spacing.lg,
  },
  googleIcon: {
    fontSize: 18,
  },
  signUpPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpPromptText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  signUpLink: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
});