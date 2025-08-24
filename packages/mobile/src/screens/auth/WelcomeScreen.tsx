import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Colors, Typography, Spacing } from '../../constants/theme';
import Button from '../../components/ui/Button';

interface WelcomeScreenProps {
  onGetStarted: () => void;
  onSignIn: () => void;
}

export default function WelcomeScreen({ onGetStarted, onSignIn }: WelcomeScreenProps) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>💰</Text>
        </View>
        <Text style={styles.title}>SharePay</Text>
        <Text style={styles.subtitle}>Split expenses made simple</Text>
      </View>

      <View style={styles.features}>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>📊</Text>
          <Text style={styles.featureText}>Track expenses</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>⚖️</Text>
          <Text style={styles.featureText}>Split bills fairly</Text>
        </View>
        <View style={styles.feature}>
          <Text style={styles.featureIcon}>💸</Text>
          <Text style={styles.featureText}>Settle up easily</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          title="Get Started"
          onPress={onGetStarted}
          variant="primary"
          size="large"
          style={styles.primaryButton}
        />
        <Button
          title="I have an account"
          onPress={onSignIn}
          variant="outline"
          size="large"
          style={styles.secondaryButton}
        />
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Join thousands of users who trust SharePay for expense sharing
        </Text>
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xxl * 2,
  },
  logo: {
    width: 120,
    height: 120,
    backgroundColor: Colors.primary,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  logoText: {
    fontSize: 48,
  },
  title: {
    ...Typography.headingLarge,
    fontSize: 36,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.headingSmall,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  features: {
    marginBottom: Spacing.xxl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  featureText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  actions: {
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    marginBottom: Spacing.md,
  },
  secondaryButton: {
    marginBottom: Spacing.md,
  },
  footer: {
    alignItems: 'center',
    paddingTop: Spacing.lg,
  },
  footerText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});