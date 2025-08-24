import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile } from '../lib/shared';
import Button from '../components/ui/Button';

export default function ProfileScreen() {
  const { user, signOut, loading } = useAuth();
  const { profile } = useUserProfile(user);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={[styles.card, styles.userCard]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.name || user?.email || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>
        
        <Text style={styles.userName}>{profile?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{profile?.email || user?.email || ''}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        <TouchableOpacity style={[styles.card, styles.menuItem]}>
          <Text style={styles.menuText}>📧</Text>
          <Text style={styles.menuLabel}>Email Settings</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.menuItem]}>
          <Text style={styles.menuText}>🔔</Text>
          <Text style={styles.menuLabel}>Notifications</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.menuItem]}>
          <Text style={styles.menuText}>🔐</Text>
          <Text style={styles.menuLabel}>Privacy & Security</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        
        <TouchableOpacity style={[styles.card, styles.menuItem]}>
          <Text style={styles.menuText}>❓</Text>
          <Text style={styles.menuLabel}>Help Center</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.menuItem]}>
          <Text style={styles.menuText}>💬</Text>
          <Text style={styles.menuLabel}>Contact Support</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.card, styles.menuItem]}>
          <Text style={styles.menuText}>⭐</Text>
          <Text style={styles.menuLabel}>Rate SharePay</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Button
        title="Sign Out"
        onPress={handleSignOut}
        variant="outline"
        size="large"
        loading={loading}
        style={styles.signOutButton}
      />

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  userCard: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    ...Typography.headingLarge,
    color: Colors.surface,
    fontWeight: 'bold',
  },
  userName: {
    ...Typography.headingMedium,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  userEmail: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  menuText: {
    fontSize: 20,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  menuLabel: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
    fontWeight: '500',
  },
  menuArrow: {
    ...Typography.headingMedium,
    color: Colors.textSecondary,
    fontWeight: '300',
  },
  signOutButton: {
    marginTop: Spacing.md,
    borderColor: Colors.error,
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});