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

interface RegisterScreenProps {
  onSignIn: () => void;
  onBack: () => void;
}

export default function RegisterScreen({ onSignIn, onBack }: RegisterScreenProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  
  const { signUp, loading, error, clearError } = useAuth();

  useEffect(() => {
    if (error) {
      Alert.alert('Registration Error', error, [{ text: 'OK', onPress: clearError }]);
    }
  }, [error]);

  const validateForm = () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return false;
    }

    if (name.trim().length < 2) {
      Alert.alert('Error', 'Name must be at least 2 characters long');
      return false;
    }

    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }

    if (!password) {
      Alert.alert('Error', 'Please enter a password');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return false;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }

    if (!agreedToTerms) {
      Alert.alert('Error', 'Please agree to the Terms of Service and Privacy Policy');
      return false;
    }

    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      await signUp(formData.email.trim(), formData.password, formData.name.trim());
      Alert.alert(
        'Success!',
        'Your account has been created successfully. Welcome to SharePay!',
        [{ text: 'OK' }]
      );
    } catch (error) {
      // Error is handled by useAuth hook
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join SharePay and start splitting expenses</Text>
      </View>

      <View style={styles.form}>
        <Input
          label="Full Name"
          placeholder="Enter your full name"
          value={formData.name}
          onChangeText={(value) => updateFormData('name', value)}
          autoCapitalize="words"
          leftIcon={<Text style={styles.inputIcon}>👤</Text>}
        />

        <Input
          label="Email"
          placeholder="Enter your email"
          value={formData.email}
          onChangeText={(value) => updateFormData('email', value)}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          leftIcon={<Text style={styles.inputIcon}>📧</Text>}
        />

        <Input
          label="Password"
          placeholder="Create a password"
          value={formData.password}
          onChangeText={(value) => updateFormData('password', value)}
          secureTextEntry
          autoCapitalize="none"
          leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
        />

        <Input
          label="Confirm Password"
          placeholder="Confirm your password"
          value={formData.confirmPassword}
          onChangeText={(value) => updateFormData('confirmPassword', value)}
          secureTextEntry
          autoCapitalize="none"
          leftIcon={<Text style={styles.inputIcon}>🔒</Text>}
        />

        <View style={styles.passwordRequirements}>
          <Text style={styles.requirementsTitle}>Password Requirements:</Text>
          <View style={styles.requirement}>
            <Text style={[
              styles.requirementBullet,
              formData.password.length >= 6 && styles.requirementMet
            ]}>
              •
            </Text>
            <Text style={[
              styles.requirementText,
              formData.password.length >= 6 && styles.requirementMet
            ]}>
              At least 6 characters
            </Text>
          </View>
          <View style={styles.requirement}>
            <Text style={[
              styles.requirementBullet,
              /[A-Z]/.test(formData.password) && styles.requirementMet
            ]}>
              •
            </Text>
            <Text style={[
              styles.requirementText,
              /[A-Z]/.test(formData.password) && styles.requirementMet
            ]}>
              One uppercase letter (recommended)
            </Text>
          </View>
          <View style={styles.requirement}>
            <Text style={[
              styles.requirementBullet,
              /[0-9]/.test(formData.password) && styles.requirementMet
            ]}>
              •
            </Text>
            <Text style={[
              styles.requirementText,
              /[0-9]/.test(formData.password) && styles.requirementMet
            ]}>
              One number (recommended)
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.termsCheckbox}
          onPress={() => setAgreedToTerms(!agreedToTerms)}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
            {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
          </View>
          <View style={styles.termsText}>
            <Text style={styles.termsTextNormal}>I agree to the </Text>
            <TouchableOpacity>
              <Text style={styles.termsTextLink}>Terms of Service</Text>
            </TouchableOpacity>
            <Text style={styles.termsTextNormal}> and </Text>
            <TouchableOpacity>
              <Text style={styles.termsTextLink}>Privacy Policy</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        <Button
          title="Create Account"
          onPress={handleSignUp}
          variant="primary"
          size="large"
          loading={loading}
          style={styles.signUpButton}
        />
      </View>

      <View style={styles.footer}>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          title="Sign up with Google"
          onPress={() => Alert.alert('Coming Soon', 'Google Sign-Up will be available in the next update')}
          variant="outline"
          size="large"
          icon={<Text style={styles.googleIcon}>🔵</Text>}
          style={styles.googleButton}
        />

        <View style={styles.signInPrompt}>
          <Text style={styles.signInPromptText}>Already have an account? </Text>
          <TouchableOpacity onPress={onSignIn}>
            <Text style={styles.signInLink}>Sign in</Text>
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
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.lg,
  },
  inputIcon: {
    fontSize: 18,
  },
  passwordRequirements: {
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  requirementsTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  requirement: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs / 2,
  },
  requirementBullet: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginRight: Spacing.xs,
    width: 12,
  },
  requirementText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    flex: 1,
  },
  requirementMet: {
    color: Colors.success,
  },
  termsCheckbox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.lg,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 4,
    marginRight: Spacing.sm,
    marginTop: 2,
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
  termsText: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  termsTextNormal: {
    ...Typography.caption,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  termsTextLink: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '500',
    lineHeight: 18,
  },
  signUpButton: {
    marginBottom: Spacing.md,
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
  signInPrompt: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInPromptText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  signInLink: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
});