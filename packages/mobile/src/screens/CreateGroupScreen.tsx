import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAlert } from '../components/AlertProvider';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { groupService } from '../services/firestore';
import { Group } from '../types';
import { DEFAULT_CURRENCY, CURRENCIES } from '../utils/currency';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { GroupsStackParamList } from '../navigation/GroupsStackNavigator';

type CreateGroupScreenNavigationProp = StackNavigationProp<GroupsStackParamList, 'CreateGroup'>;

const GROUP_EMOJIS = ['👥', '🏠', '🌮', '🍕', '✈️', '🎬', '💰', '🛒', '🎉', '🏖️'];

export default function CreateGroupScreen() {
  const navigation = useNavigation<CreateGroupScreenNavigationProp>();
  const { user } = useAuth();
  const { showAlert } = useAlert();
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👥');
  const [currency] = useState(DEFAULT_CURRENCY); // TODO: Add currency selection
  const [creating, setCreating] = useState(false);
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const handleCreateGroup = async () => {
    if (!user) {
      showAlert({
        title: 'Error',
        message: 'You must be logged in to create a group',
      });
      return;
    }

    if (!groupName.trim()) {
      showAlert({
        title: 'Error',
        message: 'Please enter a group name',
      });
      return;
    }

    setCreating(true);
    try {
      const newGroup: any = {
        name: groupName.trim(),
        name_lowercase: groupName.trim().toLowerCase(),
        emoji: selectedEmoji,
        currency,
        createdBy: user.uid,
        members: [user.uid], // Will need to add member UIDs when implementing user lookup
        memberEmails: [user.email || '', ...memberEmails],
      };

      // Only add description if it has a value
      if (description.trim()) {
        newGroup.description = description.trim();
      }

      const groupId = await groupService.createGroup(newGroup);
      
      showAlert({
        title: 'Success!',
        message: 'Group created successfully',
        buttons: [
          {
            text: 'OK',
            onPress: () => {
              navigation.goBack();
              // TODO: Navigate to the new group detail screen
            }
          }
        ]
      });
    } catch (error) {
      console.error('Error creating group:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to create group. Please try again.',
      });
    } finally {
      setCreating(false);
    }
  };

  const addMember = () => {
    const email = newMemberEmail.trim().toLowerCase();
    
    if (!email) {
      showAlert({
        title: 'Error',
        message: 'Please enter an email address',
      });
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showAlert({
        title: 'Error',
        message: 'Please enter a valid email address',
      });
      return;
    }
    
    // Check if it's the user's own email
    if (email === user?.email?.toLowerCase()) {
      showAlert({
        title: 'Error',
        message: 'You cannot add yourself to the group',
      });
      return;
    }
    
    // Check if already added
    if (memberEmails.includes(email)) {
      showAlert({
        title: 'Error',
        message: 'This member is already added',
      });
      return;
    }
    
    setMemberEmails([...memberEmails, email]);
    setNewMemberEmail('');
  };

  const removeMember = (email: string) => {
    setMemberEmails(memberEmails.filter(m => m !== email));
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Group</Text>
        <TouchableOpacity 
          style={[styles.createButton, creating && styles.createButtonDisabled]} 
          onPress={handleCreateGroup}
          disabled={creating}
        >
          <Text style={styles.createButtonText}>
            {creating ? 'Creating...' : 'Create'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Group Icon Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Icon</Text>
          <View style={styles.emojiGrid}>
            {GROUP_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  selectedEmoji === emoji && styles.emojiButtonSelected
                ]}
                onPress={() => setSelectedEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Group Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Name *</Text>
          <TextInput
            style={styles.textInput}
            value={groupName}
            onChangeText={setGroupName}
            placeholder="e.g., Roommates, Trip to Paris..."
            placeholderTextColor={Colors.textSecondary}
            maxLength={50}
          />
          <Text style={styles.characterCount}>{groupName.length}/50</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Add a description for this group..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          <Text style={styles.characterCount}>{description.length}/200</Text>
        </View>

        {/* Members */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Members (Optional)</Text>
          
          {/* Add Member Input */}
          <View style={styles.addMemberContainer}>
            <TextInput
              style={[styles.textInput, styles.memberInput]}
              value={newMemberEmail}
              onChangeText={setNewMemberEmail}
              placeholder="Enter email address..."
              placeholderTextColor={Colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity 
              style={[styles.addButton, !newMemberEmail.trim() && styles.addButtonDisabled]} 
              onPress={addMember}
              disabled={!newMemberEmail.trim()}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Member List */}
          {memberEmails.length > 0 && (
            <View style={styles.membersList}>
              <Text style={styles.membersListTitle}>Added Members ({memberEmails.length})</Text>
              {memberEmails.map((email, index) => (
                <View key={index} style={styles.memberItem}>
                  <Text style={styles.memberEmail}>{email}</Text>
                  <TouchableOpacity 
                    style={styles.removeMemberButton} 
                    onPress={() => removeMember(email)}
                  >
                    <Text style={styles.removeMemberText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <Text style={styles.memberNote}>
            Members will be notified and can join the group when you create it
          </Text>
        </View>

        {/* Currency Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Currency</Text>
          <View style={styles.currencyContainer}>
            <Text style={styles.currencyText}>
              {CURRENCIES[currency].name} ({CURRENCIES[currency].symbol})
            </Text>
            <Text style={styles.currencyNote}>
              More currencies coming soon!
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    color: Colors.primary,
    fontWeight: '500',
  },
  headerTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  createButton: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  emojiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.border,
    ...Shadows.small,
  },
  emojiButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  emojiText: {
    fontSize: 24,
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  characterCount: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },
  addMemberContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  memberInput: {
    flex: 1,
    marginRight: Spacing.sm,
    marginBottom: 0,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minWidth: 60,
    alignItems: 'center',
    ...Shadows.small,
  },
  addButtonDisabled: {
    backgroundColor: Colors.textSecondary,
    opacity: 0.6,
  },
  addButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  membersList: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  membersListTitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.small,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
    ...Shadows.small,
  },
  memberEmail: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  removeMemberButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeMemberText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 16,
  },
  memberNote: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  currencyContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    ...Shadows.small,
  },
  currencyText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  currencyNote: {
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
  },
  infoText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '500',
  },
});