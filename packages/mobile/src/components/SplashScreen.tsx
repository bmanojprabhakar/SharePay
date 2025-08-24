import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Colors, Typography, Spacing } from '../constants/theme';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const animationComplete = useRef(false);

  useEffect(() => {
    // Start logo animation with basic Animated API (no reanimated dependency)
    Animated.sequence([
      // Logo fade in and scale up
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false, // Use JS driver to avoid reanimated issues
        }),
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
      ]),
      // Wait a bit
      Animated.delay(300),
      // Tagline fade in
      Animated.timing(taglineOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
      // Wait and finish
      Animated.delay(800),
    ]).start(() => {
      if (!animationComplete.current) {
        animationComplete.current = true;
        // Use requestAnimationFrame to ensure this runs after the render phase
        requestAnimationFrame(() => {
          onFinish();
        });
      }
    });

    return () => {
      // Clean up animation on unmount
      logoOpacity.stopAnimation();
      logoScale.stopAnimation();
      taglineOpacity.stopAnimation();
    };
  }, [logoOpacity, logoScale, taglineOpacity, onFinish]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <View style={styles.logo}>
          <Text style={styles.logoText}>💰</Text>
        </View>
        <Text style={styles.appName}>SharePay</Text>
      </Animated.View>

      <Animated.View style={[styles.taglineContainer, { opacity: taglineOpacity }]}>
        <Text style={styles.tagline}>Split expenses made simple</Text>
        <View style={styles.features}>
          <Text style={styles.feature}>• Track expenses</Text>
          <Text style={styles.feature}>• Split bills fairly</Text>
          <Text style={styles.feature}>• Settle up easily</Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  logo: {
    width: 120,
    height: 120,
    backgroundColor: Colors.surface,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    shadowColor: Colors.shadow,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 16,
  },
  logoText: {
    fontSize: 48,
  },
  appName: {
    ...Typography.headingLarge,
    fontSize: 32,
    color: Colors.surface,
    fontWeight: 'bold',
  },
  taglineContainer: {
    alignItems: 'center',
  },
  tagline: {
    ...Typography.headingSmall,
    color: Colors.surface,
    opacity: 0.9,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  features: {
    alignItems: 'flex-start',
  },
  feature: {
    ...Typography.body,
    color: Colors.surface,
    opacity: 0.8,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
});