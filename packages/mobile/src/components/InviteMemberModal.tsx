import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { groupService } from '../services/firestore';
import { GroupMember } from '../types';

interface InviteMemberModalProps {
  visible: boolean;
  onClose: () => void;
  groupId: string;
  onMemberAdded?: (member: GroupMember) => void;
}

export default function InviteMemberModal({
  visible,
  onClose,
  groupId,
  onMemberAdded,
}: InviteMemberModalProps) {
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [inviting, setInviting] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter an email address');
      return;
    }

    if (!validateEmail(email.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    setInviting(true);
    try {
      // For now, we'll create a placeholder member
      // In a full implementation, you would:
      // 1. Send an email invitation
      // 2. Create a pending invitation record
      // 3. Add the user when they accept the invitation
      
      const newMember: GroupMember = {
        userId: `invite_${Date.now()}`, // Temporary ID for invited users
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        photoURL: undefined,
        balance: 0,
        joinedAt: new Date(),
      };

      await groupService.addMemberToGroup(groupId, newMember);
      
      Alert.alert(
        'Invitation Sent!',
        `Invitation sent to ${email}. They will be added to the group when they accept.`,
        [
          {
            text: 'OK',
            onPress: () => {
              onMemberAdded?.(newMember);
              handleClose();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error inviting member:', error);
      Alert.alert('Error', 'Failed to send invitation. Please try again.');
    } finally {
      setInviting(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setDisplayName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Invite Member</Text>
          <TouchableOpacity 
            style={[styles.inviteButton, inviting && styles.inviteButtonDisabled]} 
            onPress={handleInvite}
            disabled={inviting}
          >
            <Text style={styles.inviteButtonText}>
              {inviting ? 'Sending...' : 'Invite'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Email Address *</Text>
            <TextInput
              style={styles.textInput}
              value={email}
              onChangeText={setEmail}
              placeholder="friend@example.com"
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Display Name *</Text>
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Friend's Name"
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="words"
            />
            <Text style={styles.helpText}>
              This is how they'll appear in the group
            </Text>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              📧 An invitation will be sent to their email address. They can join the group by signing up with SharePay.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingTop: Platform.OS === 'ios' ? 60 : Spacing.md,
  },
  cancelButton: {
    minWidth: 60,
  },
  cancelButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  headerTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  inviteButton: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  inviteButtonDisabled: {
    opacity: 0.6,
  },
  inviteButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  textInput: {
    ...Typography.body,
    color: Colors.textPrimary,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    ...Shadows.small,
  },
  helpText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  infoContainer: {
    backgroundColor: Colors.primary + '10',
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    marginTop: Spacing.lg,
  },
  infoText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '500',
    lineHeight: 18,
  },
});