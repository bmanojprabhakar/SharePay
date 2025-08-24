import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAlert } from '../components/AlertProvider';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { groupService } from '../services/firestore';
import { Group } from '../types';
import { GroupsStackParamList } from '../navigation/GroupsStackNavigator';
import { StackNavigationProp } from '@react-navigation/stack';

type EditGroupScreenRouteProp = RouteProp<GroupsStackParamList, 'EditGroup'>;
type EditGroupScreenNavigationProp = StackNavigationProp<GroupsStackParamList, 'EditGroup'>;

const GROUP_EMOJIS = ['👥', '🏠', '🌮', '🍕', '✈️', '🎬', '💰', '🛒', '🎉', '🏖️'];

export default function EditGroupScreen() {
  const route = useRoute<EditGroupScreenRouteProp>();
  const navigation = useNavigation<EditGroupScreenNavigationProp>();
  const { groupId } = route.params;
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupName, setGroupName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('👥');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  
  // Track changes locally until save
  const [pendingMemberEmails, setPendingMemberEmails] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const loadGroup = async () => {
    try {
      setLoading(true);
      const groupData = await groupService.getGroup(groupId);
      if (groupData) {
        setGroup(groupData);
        setGroupName(groupData.name);
        setDescription(groupData.description || '');
        setSelectedEmoji(groupData.emoji || '👥');
        setPendingMemberEmails(groupData.memberEmails || []);
        setHasChanges(false);
      }
    } catch (error) {
      console.error('Error loading group:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load group details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGroup = async () => {
    if (!user || !group) {
      showAlert({
        title: 'Error',
        message: 'Unable to save group',
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

    // Check if user is the creator
    if (group.createdBy !== user.uid) {
      showAlert({
        title: 'Error',
        message: 'Only the group creator can edit this group',
      });
      return;
    }

    setSaving(true);
    try {
      // Update group info
      const updates: any = {
        name: groupName.trim(),
        emoji: selectedEmoji,
        memberEmails: pendingMemberEmails,
      };

      // Only add description if it has a value
      if (description.trim()) {
        updates.description = description.trim();
      }

      await groupService.updateGroup(groupId, updates);

      // Update local state
      const updatedGroup = { ...group, ...updates };
      setGroup(updatedGroup);
      setHasChanges(false);

      showAlert({
        title: 'Success!',
        message: 'Group updated successfully',
        buttons: [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          }
        ]
      });
    } catch (error) {
      console.error('Error updating group:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to update group. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = () => {
    if (!user || !group) return;

    // Check if user is the creator
    if (group.createdBy !== user.uid) {
      showAlert({
        title: 'Error',
        message: 'Only the group creator can delete this group',
      });
      return;
    }

    showAlert({
      title: 'Delete Group',
      message: `Are you sure you want to delete "${group.name}"? This action cannot be undone and will delete all expenses in this group.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: confirmDeleteGroup,
        },
      ]
    });
  };

  const confirmDeleteGroup = async () => {
    if (!group) return;

    setDeleting(true);
    try {
      await groupService.deleteGroup(group.id);
      // Navigate back immediately - deletion success is evident
      navigation.goBack();
    } catch (error) {
      console.error('Error deleting group:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to delete group. Please try again.',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleAddMember = async () => {
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
    if (pendingMemberEmails.includes(email)) {
      showAlert({
        title: 'Error',
        message: 'This member is already in the group',
      });
      return;
    }
    
    try {
      // Check if user exists in Firestore
      const userExists = await groupService.checkUserExists(email);
      if (!userExists) {
        showAlert({
          title: 'User Not Found',
          message: `User with email ${email} not found. They need to sign up for SharePay first.`,
        });
        return;
      }
      
      // Add to pending list (will be saved when user clicks Save)
      setPendingMemberEmails([...pendingMemberEmails, email]);
      setHasChanges(true);
      setShowAddMember(false);
      setNewMemberEmail('');
      
      showAlert({
        title: 'Member Added',
        message: 'Member will be added when you save the group.',
      });
    } catch (error) {
      console.error('Error checking user:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to validate member. Please try again.',
      });
    }
  };

  const handleRemoveMember = (email: string) => {
    // Remove from pending list immediately (will be saved when user clicks Save)
    setPendingMemberEmails(pendingMemberEmails.filter(memberEmail => memberEmail !== email));
    setHasChanges(true);
    
    showAlert({
      title: 'Member Removed',
      message: 'Member will be removed when you save the group.',
    });
  };
  
  const handleCancelChanges = () => {
    if (hasChanges) {
      showAlert({
        title: 'Discard Changes?',
        message: 'You have unsaved changes. Are you sure you want to discard them?',
        buttons: [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => {
              // Reset all fields to original values
              if (group) {
                setGroupName(group.name);
                setDescription(group.description || '');
                setSelectedEmoji(group.emoji || '👥');
                setPendingMemberEmails(group.memberEmails || []);
                setHasChanges(false);
              }
              navigation.goBack();
            }
          }
        ]
      });
    } else {
      navigation.goBack();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading group...</Text>
      </View>
    );
  }

  if (!group || !user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Group not found</Text>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCreator = group.createdBy === user.uid;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancelChanges}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Group</Text>
        {isCreator && (
          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSaveGroup}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        )}
        {!isCreator && <View style={styles.spacer} />}
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {!isCreator && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              ℹ️ Only the group creator can edit this group
            </Text>
          </View>
        )}

        {/* Group Icon Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Icon</Text>
          <View style={styles.emojiGrid}>
            {GROUP_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  selectedEmoji === emoji && styles.emojiButtonSelected,
                  !isCreator && styles.emojiButtonDisabled
                ]}
                onPress={() => {
                  if (isCreator) {
                    setSelectedEmoji(emoji);
                    setHasChanges(true);
                  }
                }}
                disabled={!isCreator}
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
            style={[
              styles.textInput,
              !isCreator && styles.textInputDisabled
            ]}
            value={groupName}
            onChangeText={(text) => {
              setGroupName(text);
              setHasChanges(true);
            }}
            placeholder="e.g., Roommates, Trip to Paris..."
            placeholderTextColor={Colors.textSecondary}
            maxLength={50}
            editable={isCreator}
          />
          <Text style={styles.characterCount}>{groupName.length}/50</Text>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <TextInput
            style={[
              styles.textInput, 
              styles.textArea,
              !isCreator && styles.textInputDisabled
            ]}
            value={description}
            onChangeText={(text) => {
              setDescription(text);
              setHasChanges(true);
            }}
            placeholder="Add a description for this group..."
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={3}
            maxLength={200}
            editable={isCreator}
          />
          <Text style={styles.characterCount}>{description.length}/200</Text>
        </View>

        {/* Members Management - Only for creators */}
        {isCreator && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members ({pendingMemberEmails.length})</Text>
            <View style={styles.membersList}>
              {pendingMemberEmails.map((email, index) => (
                <View key={index} style={styles.memberItem}>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberEmail}>{email}</Text>
                    <Text style={styles.memberRole}>
                      {email === user?.email ? 'You (Owner)' : 'Member'}
                    </Text>
                  </View>
                  {email !== user?.email && (
                    <TouchableOpacity 
                      style={styles.removeMemberButton}
                      onPress={() => handleRemoveMember(email)}
                    >
                      <Text style={styles.removeMemberText}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </View>
            
            <TouchableOpacity 
              style={styles.addMemberButton}
              onPress={() => setShowAddMember(!showAddMember)}
            >
              <Text style={styles.addMemberButtonText}>+ Add Member</Text>
            </TouchableOpacity>

            {showAddMember && (
              <View style={styles.addMemberContainer}>
                <TextInput
                  style={styles.textInput}
                  value={newMemberEmail}
                  onChangeText={setNewMemberEmail}
                  placeholder="Enter email address..."
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <View style={styles.addMemberActions}>
                  <TouchableOpacity 
                    style={styles.memberCancelButton}
                    onPress={() => {
                      setShowAddMember(false);
                      setNewMemberEmail('');
                    }}
                  >
                    <Text style={styles.memberCancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.addButton, !newMemberEmail.trim() && styles.addButtonDisabled]}
                    onPress={handleAddMember}
                    disabled={!newMemberEmail.trim()}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Group Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Group Information</Text>
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Members:</Text>
            <Text style={styles.infoValue}>{group.memberEmails?.length || 0}</Text>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Created by:</Text>
            <Text style={styles.infoValue}>
              {isCreator ? 'You' : 'Another member'}
            </Text>
          </View>
          <View style={styles.infoContainer}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>
              {group.createdAt.toLocaleDateString()}
            </Text>
          </View>
        </View>

        {/* Delete Button - Only for creators */}
        {isCreator && (
          <View style={styles.section}>
            <TouchableOpacity 
              style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
              onPress={handleDeleteGroup}
              disabled={deleting}
            >
              <Text style={styles.deleteButtonText}>
                {deleting ? 'Deleting...' : 'Delete Group'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.deleteWarning}>
              This will permanently delete the group and all expenses. This action cannot be undone.
            </Text>
          </View>
        )}
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
  saveButton: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  spacer: {
    minWidth: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  backButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  backButtonText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '600',
  },
  warningContainer: {
    backgroundColor: Colors.warning + '10',
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    marginBottom: Spacing.lg,
  },
  warningText: {
    ...Typography.caption,
    color: Colors.warning,
    fontWeight: '500',
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
  emojiButtonDisabled: {
    opacity: 0.6,
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
  textInputDisabled: {
    backgroundColor: Colors.background,
    opacity: 0.6,
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
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    ...Shadows.medium,
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  deleteWarning: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  membersList: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.small,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
    ...Shadows.small,
  },
  memberInfo: {
    flex: 1,
  },
  memberEmail: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: Spacing.xs / 2,
  },
  memberRole: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  removeMemberButton: {
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.small,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  removeMemberText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '600',
  },
  addMemberButton: {
    backgroundColor: Colors.primary + '20',
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    marginBottom: Spacing.md,
  },
  addMemberButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '600',
  },
  addMemberContainer: {
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  addMemberActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  memberCancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  memberCancelButtonText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.small,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
});