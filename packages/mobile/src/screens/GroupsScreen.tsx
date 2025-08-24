import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { GroupsStackParamList } from '../navigation/GroupsStackNavigator';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { useGroups } from '../hooks/useGroups';
import { Group } from '../types';
import { formatCurrency } from '../utils/currency';
import { balanceService, groupService } from '../services/firestore';
import { useAlert } from '../components/AlertProvider';

interface GroupBalance {
  youOwe: number;
  owedToYou: number;
  netBalance: number;
  totalExpenses: number;
}

type GroupsScreenNavigationProp = StackNavigationProp<GroupsStackParamList, 'GroupsList'>;

export default function GroupsScreen() {
  const navigation = useNavigation<GroupsScreenNavigationProp>();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { groups, balance, loading, error, refreshGroups } = useGroups(user?.uid || null, user?.email || null);
  const [refreshing, setRefreshing] = useState(false);
  const [groupBalances, setGroupBalances] = useState<{ [groupId: string]: GroupBalance }>({});

  // Load group-specific balances
  useEffect(() => {
    if (!user?.email || groups.length === 0) return;
    
    const loadGroupBalances = async () => {
      const balances: { [groupId: string]: GroupBalance } = {};
      
      for (const group of groups) {
        try {
          const balance = await balanceService.calculateGroupBalance(group.id, user.email!);
          balances[group.id] = balance;
        } catch (error) {
          console.error(`Error calculating balance for group ${group.id}:`, error);
          balances[group.id] = { youOwe: 0, owedToYou: 0, netBalance: 0, totalExpenses: 0 };
        }
      }
      
      setGroupBalances(balances);
    };
    
    loadGroupBalances();
  }, [user?.email, groups]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshGroups();
      // Reload group balances after refreshing groups
      if (user?.email && groups.length > 0) {
        const balances: { [groupId: string]: GroupBalance } = {};
        for (const group of groups) {
          try {
            const balance = await balanceService.calculateGroupBalance(group.id, user.email!);
            balances[group.id] = balance;
          } catch (error) {
            console.error(`Error calculating balance for group ${group.id}:`, error);
            balances[group.id] = { youOwe: 0, owedToYou: 0, netBalance: 0, totalExpenses: 0 };
          }
        }
        setGroupBalances(balances);
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const handleGroupPress = (group: Group) => {
    navigation.navigate('GroupDetail', { groupId: group.id });
  };

  const handleGroupMenu = (group: Group) => {
    if (!user) return;
    
    const isCreator = group.createdBy === user.uid;
    
    if (!isCreator) {
      // Non-creators don't get a menu - they can just tap the card to view
      return;
    }
    
    const options = [
      { text: 'Edit Group', onPress: () => navigation.navigate('EditGroup', { groupId: group.id }) },
      { 
        text: 'Delete Group', 
        style: 'destructive', 
        onPress: () => {
          // Direct confirmation without another function call
          showAlert({
            title: 'Delete Group',
            message: `Are you sure you want to delete "${group.name}"? This action cannot be undone and will delete all expenses in this group.`,
            buttons: [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await groupService.deleteGroup(group.id);
                    // Immediately refresh - user sees group disappear as feedback
                    refreshGroups();
                  } catch (error) {
                    console.error('Error deleting group:', error);
                    showAlert({
                      title: 'Error',
                      message: 'Failed to delete group. Please try again.',
                    });
                  }
                }
              },
            ]
          });
        }
      }
    ];
    
    showAlert({
      title: 'Group Options',
      message: `What would you like to do with "${group.name}"?`,
      buttons: options
    });
  };

  // Removed handleDeleteGroup function - functionality moved inline to avoid double alerts

  const getGroupBalance = (group: Group): { amount: number; status: 'owed' | 'owing' | 'settled' } => {
    if (!user?.email) return { amount: 0, status: 'settled' };
    
    const balance = groupBalances[group.id];
    if (!balance) return { amount: 0, status: 'settled' };
    
    // Check if completely settled (both values are 0)
    if (balance.youOwe === 0 && balance.owedToYou === 0) {
      return { amount: 0, status: 'settled' };
    }
    
    // If net balance is positive, you're owed money
    if (balance.netBalance > 0) {
      return { amount: balance.owedToYou, status: 'owing' };
    }
    
    // If net balance is negative, you owe money
    if (balance.netBalance < 0) {
      return { amount: balance.youOwe, status: 'owed' };
    }
    
    return { amount: 0, status: 'settled' };
  };

  const getBalanceText = (balance: { amount: number; status: 'owed' | 'owing' | 'settled' }, totalAmount: number) => {
    // Don't show "All settled" if there are no expenses at all
    if (totalAmount === 0) return 'No expenses yet';
    if (balance.status === 'settled') return 'All settled ✅';
    if (balance.status === 'owing') return `You're owed: ${formatCurrency(balance.amount)}`;
    return `You owe: ${formatCurrency(balance.amount)}`;
  };

  const getBalanceColor = (status: 'owed' | 'owing' | 'settled') => {
    if (status === 'settled') return Colors.textSecondary;
    if (status === 'owing') return Colors.success;
    return Colors.error;
  };

  const getTotalAmount = (group: Group): number => {
    const balance = groupBalances[group.id];
    return balance?.totalExpenses || 0;
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load groups</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshGroups}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <Text style={styles.headerTitle}>Groups</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateGroup}>
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {loading && groups.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading groups...</Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No groups yet</Text>
            <Text style={styles.emptySubtext}>Create your first group to start splitting expenses</Text>
            <TouchableOpacity style={styles.createFirstButton} onPress={handleCreateGroup}>
              <Text style={styles.createFirstButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        ) : (
          groups.map((group) => {
            const groupBalance = getGroupBalance(group);
            const totalAmount = getTotalAmount(group);
            const isCreator = user?.uid === group.createdBy;
            
            return (
              <View key={group.id} style={styles.groupCard}>
                <TouchableOpacity
                  style={styles.groupMainArea}
                  onPress={() => handleGroupPress(group)}
                >
                  <View style={styles.groupIconContainer}>
                    <Text style={styles.groupIcon}>{group.emoji || '👥'}</Text>
                  </View>
                  <View style={styles.groupInfo}>
                    <View style={styles.groupNameContainer}>
                      <Text style={styles.groupName}>{group.name}</Text>
                      {isCreator && (
                        <View style={styles.creatorBadge}>
                          <Text style={styles.creatorBadgeText}>Owner</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.groupDetails}>
                      {formatCurrency(totalAmount)} • {group.memberEmails?.length || 0} people
                    </Text>
                    <Text style={[styles.groupBalance, { color: getBalanceColor(groupBalance.status) }]}>
                      {getBalanceText(groupBalance, totalAmount)}
                    </Text>
                  </View>
                </TouchableOpacity>
                {isCreator && (
                  <TouchableOpacity 
                    style={styles.menuButton} 
                    onPress={() => handleGroupMenu(group)}
                  >
                    <Text style={styles.menuButtonText}>⋯</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {/* Extra space at bottom for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    ...Typography.headingLarge,
    color: Colors.textPrimary,
    fontWeight: '700',
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.small,
  },
  addButtonText: {
    color: Colors.surface,
    fontSize: 20,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    marginBottom: Spacing.md,
    ...Shadows.medium,
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupMainArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  menuButton: {
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  menuButtonText: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
    transform: [{ rotate: '90deg' }],
  },
  groupIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  groupIcon: {
    fontSize: 24,
  },
  groupInfo: {
    flex: 1,
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs / 2,
  },
  groupName: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  creatorBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: Spacing.xs,
  },
  creatorBadgeText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '600',
    fontSize: 10,
  },
  groupDetails: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs / 2,
  },
  groupBalance: {
    ...Typography.caption,
    fontWeight: '600',
  },
  chevron: {
    marginLeft: Spacing.sm,
  },
  chevronText: {
    color: Colors.textSecondary,
    fontSize: 20,
    fontWeight: '300',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xxl * 2,
  },
  emptyText: {
    ...Typography.headingMedium,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.sm,
  },
  emptySubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  createFirstButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    ...Shadows.medium,
  },
  createFirstButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  retryButtonText: {
    ...Typography.caption,
    color: Colors.surface,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});