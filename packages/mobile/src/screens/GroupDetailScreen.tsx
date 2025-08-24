import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useAlert } from '../components/AlertProvider';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { groupService, expenseService, balanceService } from '../services/firestore';
import { Group, Expense } from '../types';
import { GroupsStackParamList } from '../navigation/GroupsStackNavigator';
import { StackNavigationProp } from '@react-navigation/stack';
import { formatCurrency } from '../utils/currency';
import { getCategoryEmoji, getTimeAgo } from '../services/firestore';

type GroupDetailScreenRouteProp = RouteProp<GroupsStackParamList, 'GroupDetail'>;
type GroupDetailScreenNavigationProp = StackNavigationProp<GroupsStackParamList, 'GroupDetail'>;

interface GroupBalance {
  youOwe: number;
  owedToYou: number;
  netBalance: number;
  totalExpenses: number;
}

export default function GroupDetailScreen() {
  const route = useRoute<GroupDetailScreenRouteProp>();
  const navigation = useNavigation<GroupDetailScreenNavigationProp>();
  const { groupId } = route.params;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();

  const [group, setGroup] = useState<Group | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [balance, setBalance] = useState<GroupBalance>({ youOwe: 0, owedToYou: 0, netBalance: 0, totalExpenses: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadGroupData();
  }, [groupId, user]);

  const loadGroupData = async () => {
    if (!user?.email) {
      console.log('No user email, skipping load');
      setLoading(false);
      return;
    }
    
    console.log('Loading group data for:', groupId, 'user:', user.email);
    
    try {
      setLoading(true);
      
      // Load group data first
      const groupData = await groupService.getGroup(groupId);
      console.log('Group data loaded:', groupData);
      
      if (!groupData) {
        showAlert({
          title: 'Error',
          message: 'Group not found',
        });
        setLoading(false);
        return;
      }
      
      setGroup(groupData);
      
      // Load expenses and balance
      const [expensesData, balanceData] = await Promise.all([
        expenseService.getGroupExpenses(groupId, 50),
        balanceService.calculateGroupBalance(groupId, user.email)
      ]);
      
      console.log('Expenses loaded:', expensesData.length, 'Balance:', balanceData);
      
      setExpenses(expensesData);
      setBalance(balanceData);
      
    } catch (error) {
      console.error('Error loading group data:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load group details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadGroupData();
    setRefreshing(false);
  };

  const handleAddExpense = () => {
    navigation.navigate('AddExpense', { groupId });
  };

  const handleGroupMenu = () => {
    if (!user || !group) return;
    
    const isCreator = group.createdBy === user.uid;
    const options: any[] = [];
    
    if (isCreator) {
      options.push(
        { text: 'Edit Group', onPress: () => navigation.navigate('EditGroup', { groupId: group.id }) },
        { text: 'Delete Group', style: 'destructive', onPress: () => handleDeleteGroup() }
      );
    }
    
    options.push({ text: 'Cancel', style: 'cancel' });
    
    showAlert({
      title: 'Group Options',
      message: 'Choose an action:',
      buttons: options
    });
  };

  const handleDeleteGroup = () => {
    if (!user || !group || group.createdBy !== user.uid) {
      showAlert({
        title: 'Error',
        message: 'Only the group creator can delete this group',
      });
      return;
    }

    showAlert({
      title: 'Delete Group',
      message: `Are you sure you want to delete "${group.name}"? This action cannot be undone and will delete all expenses.`,
      buttons: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
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
            }
          }
        },
      ]
    });
  };

  const getBalanceText = () => {
    if (balance.totalExpenses === 0) return 'No expenses yet';
    if (balance.youOwe === 0 && balance.owedToYou === 0) return 'All settled ✅';
    if (balance.netBalance > 0) return `You're owed: ${formatCurrency(balance.owedToYou)}`;
    return `You owe: ${formatCurrency(balance.youOwe)}`;
  };

  const getBalanceColor = () => {
    if (balance.totalExpenses === 0 || (balance.youOwe === 0 && balance.owedToYou === 0)) return Colors.textSecondary;
    if (balance.netBalance > 0) return Colors.success;
    return Colors.error;
  };

  if (loading && !group) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading group details...</Text>
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
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.groupEmoji}>{group.emoji || '👥'}</Text>
          <Text style={styles.headerTitle}>{group.name}</Text>
        </View>
        <TouchableOpacity style={styles.menuButton} onPress={handleGroupMenu}>
          <Text style={styles.menuButtonText}>⋯</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Balance Summary */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <Text style={styles.balanceTitle}>Your Balance</Text>
            <Text style={[styles.balanceAmount, { color: getBalanceColor() }]}>
              {getBalanceText()}
            </Text>
          </View>
          
          {balance.totalExpenses > 0 && (
            <View style={styles.balanceDetails}>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Total expenses:</Text>
                <Text style={styles.balanceValue}>{formatCurrency(balance.totalExpenses)}</Text>
              </View>
              {balance.youOwe > 0 && (
                <View style={styles.balanceRow}>
                  <Text style={[styles.balanceLabel, { color: Colors.error }]}>You owe:</Text>
                  <Text style={[styles.balanceValue, { color: Colors.error }]}>{formatCurrency(balance.youOwe)}</Text>
                </View>
              )}
              {balance.owedToYou > 0 && (
                <View style={styles.balanceRow}>
                  <Text style={[styles.balanceLabel, { color: Colors.success }]}>Owed to you:</Text>
                  <Text style={[styles.balanceValue, { color: Colors.success }]}>{formatCurrency(balance.owedToYou)}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Group Info */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Group Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Members:</Text>
            <Text style={styles.infoValue}>{group.memberEmails?.length || 0}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created by:</Text>
            <Text style={styles.infoValue}>{isCreator ? 'You' : 'Another member'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Created:</Text>
            <Text style={styles.infoValue}>{group.createdAt.toLocaleDateString()}</Text>
          </View>
          {group.description && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Description:</Text>
              <Text style={styles.infoValue}>{group.description}</Text>
            </View>
          )}
        </View>

        {/* Add Expense Button */}
        <TouchableOpacity style={styles.addExpenseButton} onPress={handleAddExpense}>
          <Text style={styles.addExpenseButtonText}>+ Add Expense</Text>
        </TouchableOpacity>

        {/* Recent Expenses */}
        <View style={styles.expensesCard}>
          <Text style={styles.cardTitle}>Recent Expenses</Text>
          {loading ? (
            <Text style={styles.loadingText}>Loading expenses...</Text>
          ) : expenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No expenses yet</Text>
              <Text style={styles.emptySubtext}>Add your first expense to start tracking</Text>
            </View>
          ) : (
            expenses.slice(0, 10).map((expense) => (
              <View key={expense.id} style={styles.expenseItem}>
                <View style={styles.expenseIcon}>
                  <Text style={styles.expenseEmoji}>{getCategoryEmoji(expense.category || 'other')}</Text>
                </View>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                  <Text style={styles.expenseInfo}>
                    {getTimeAgo(expense.createdAt)} • {expense.createdBy}
                  </Text>
                </View>
                <Text style={styles.expenseAmount}>{formatCurrency(expense.amount)}</Text>
              </View>
            ))
          )}
        </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    minWidth: 60,
    alignItems: 'flex-start',
  },
  backButtonText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  groupEmoji: {
    fontSize: 24,
    marginRight: Spacing.sm,
  },
  headerTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  menuButton: {
    minWidth: 60,
    alignItems: 'flex-end',
    padding: Spacing.sm,
  },
  menuButtonText: {
    fontSize: 20,
    color: Colors.textSecondary,
    fontWeight: '600',
    transform: [{ rotate: '90deg' }],
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  balanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  balanceHeader: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  balanceTitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  balanceAmount: {
    ...Typography.headingMedium,
    fontWeight: '700',
  },
  balanceDetails: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  balanceLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  balanceValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  cardTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  infoLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  infoValue: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  addExpenseButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  addExpenseButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  expensesCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    ...Shadows.medium,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  expenseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  expenseEmoji: {
    fontSize: 20,
  },
  expenseDetails: {
    flex: 1,
  },
  expenseDescription: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: Spacing.xs / 2,
  },
  expenseInfo: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  expenseAmount: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
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
});