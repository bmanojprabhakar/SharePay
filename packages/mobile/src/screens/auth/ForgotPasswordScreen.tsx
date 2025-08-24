import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../hooks/useAuth';

interface ForgotPasswordScreenProps {
  onBack: () => void;
}

export default function ForgotPasswordScreen({ onBack }: ForgotPasswordScreenProps) {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  
  const { resetPassword, loading, error, clearError } = useAuth();

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await resetPassword(email.trim());
      setEmailSent(true);
    } catch (error) {
      // Error is handled by useAuth hook
    }
  };

  const handleResendEmail = () => {
    setEmailSent(false);
    handleResetPassword();
  };

  if (emailSent) {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Back to Sign In</Text>
          </TouchableOpacity>

          <View style={styles.successContainer}>
            <View style={styles.successIcon}>
              <Text style={styles.successIconText}>📧</Text>
            </View>
            
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.description}>
              We've sent a password reset link to{'\n'}
              <Text style={styles.email}>{email}</Text>
            </Text>

            <View style={styles.instructions}>
              <Text style={styles.instructionText}>
                1. Check your email inbox (and spam folder)
              </Text>
              <Text style={styles.instructionText}>
                2. Click the reset password link
              </Text>
              <Text style={styles.instructionText}>
                3. Follow the instructions to create a new password
              </Text>
              <Text style={styles.instructionText}>
                4. Return to the app and sign in
              </Text>
            </View>

            <Button
              title="Resend Email"
              onPress={handleResendEmail}
              variant="outline"
              size="large"
              loading={loading}
              style={styles.resendButton}
            />

            <TouchableOpacity onPress={onBack} style={styles.backToSignInButton}>
              <Text style={styles.backToSignInText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.description}>
            Don't worry! Enter your email address and we'll send you a link to reset your password.
          </Text>
        </View>

        <View style={styles.form}>
          <Input
            label="Email Address"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            leftIcon={<Text style={styles.inputIcon}>📧</Text>}
          />

          <Button
            title="Send Reset Link"
            onPress={handleResetPassword}
            variant="primary"
            size="large"
            loading={loading}
            style={styles.sendButton}
          />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Remember your password?{' '}
          </Text>
          <TouchableOpacity onPress={onBack}>
            <Text style={styles.signInLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
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
  header: {
    marginBottom: Spacing.xxl,
  },
  title: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: Spacing.md,
  },
  description: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  form: {
    flex: 1,
  },
  inputIcon: {
    fontSize: 18,
  },
  sendButton: {
    marginTop: Spacing.lg,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  footerText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  signInLink: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  successIcon: {
    width: 80,
    height: 80,
    backgroundColor: Colors.success,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  successIconText: {
    fontSize: 32,
  },
  email: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  instructions: {
    alignSelf: 'stretch',
    marginVertical: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  instructionText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  resendButton: {
    marginBottom: Spacing.lg,
    alignSelf: 'stretch',
  },
  backToSignInButton: {
    paddingVertical: Spacing.md,
  },
  backToSignInText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
});