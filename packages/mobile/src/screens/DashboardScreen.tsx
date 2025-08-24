import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { useUserProfile, getUserDisplayName } from '../lib/shared';
import { useGroups } from '../hooks/useGroups';
import { useExpenses } from '../hooks/useExpenses';
import { getCategoryEmoji, getTimeAgo } from '../services/firestore';
import { formatCurrency, getCurrencyDisplayInfo } from '../utils/currency';

export default function DashboardScreen() {
  const { user } = useAuth();
  const { profile } = useUserProfile(user);
  const { groups, balance, loading: groupsLoading, refreshGroups } = useGroups(user?.uid || null, user?.email || null);
  const { expenses, loading: expensesLoading, refreshExpenses } = useExpenses(user?.uid || null);
  const [refreshing, setRefreshing] = useState(false);
  
  const currentHour = new Date().getHours();
  const getGreeting = () => {
    if (currentHour < 12) return 'Good morning';
    if (currentHour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const userName = getUserDisplayName(user, profile);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshGroups(), refreshExpenses()]);
    } finally {
      setRefreshing(false);
    }
  };


  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      {/* Greeting Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>{getGreeting()}, {userName}! 👋</Text>
      </View>

      {/* Quick Summary Card */}
      <View style={[styles.card, styles.summaryCard]}>
        <Text style={styles.cardTitle}>Quick Summary</Text>
        {groupsLoading && groups.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading balance...</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>You owe:</Text>
                <Text style={[styles.summaryAmount, styles.owedAmount]}>
                  {formatCurrency(balance.totalYouOwe)}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>You're owed:</Text>
                <Text style={[styles.summaryAmount, styles.owingAmount]}>
                  {formatCurrency(balance.totalOwedToYou)}
                </Text>
              </View>
            </View>
            <View style={styles.netContainer}>
              <Text style={styles.netLabel}>Net:</Text>
              <Text style={[
                styles.netAmount, 
                balance.netBalance >= 0 ? styles.positiveNet : styles.negativeNet
              ]}>
                {balance.netBalance >= 0 ? '+' : ''}{formatCurrency(Math.abs(balance.netBalance))} {balance.netBalance >= 0 ? '💚' : '💸'}
              </Text>
            </View>
          </>
        )}
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        
        {expensesLoading && expenses.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading recent activity...</Text>
          </View>
        ) : expenses.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recent activity</Text>
            <Text style={styles.emptySubtext}>Add your first expense to get started</Text>
          </View>
        ) : (
          expenses.map((expense: any) => {
            const userEmail = user?.email;
            if (!userEmail) return null;
            
            const amountYouPaid = expense.payers?.[userEmail] || 0;
            const isPaidByUser = amountYouPaid > 0;
            const userShare = expense.splitBetween?.includes(userEmail)
              ? (expense.splitType === 'equal'
                  ? expense.amount / expense.splitBetween.length
                  : expense.splitDetails?.[userEmail] || 0)
              : 0;
            
            return (
              <TouchableOpacity 
                key={expense.id} 
                style={[styles.card, styles.activityCard]}
                onPress={() => {
                  // TODO: Navigate to expense detail
                }}
              >
                <View style={styles.activityHeader}>
                  <Text style={styles.activityIcon}>
                    {getCategoryEmoji(expense.category || 'other')}
                  </Text>
                  <View style={styles.activityInfo}>
                    <Text style={styles.activityTitle}>{expense.description}</Text>
                    <Text style={styles.activitySubtitle}>
                      {formatCurrency(expense.amount)} • {expense.groupName ? `${expense.groupName}` : 'Group expense'}
                    </Text>
                    {isPaidByUser && amountYouPaid > userShare && (
                      <Text style={[styles.userSplitText, { color: Colors.success }]}>
                        You're owed {formatCurrency(amountYouPaid - userShare)}
                      </Text>
                    )}
                    {!isPaidByUser && userShare > 0 && (
                      <Text style={[styles.userSplitText, { color: Colors.error }]}>
                        Your share: {formatCurrency(userShare)}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.activityTime}>
                    {getTimeAgo(expense.createdAt)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Add Expense Button */}
      <TouchableOpacity style={styles.addButton}>
        <Text style={styles.addButtonText}>+ Add Expense</Text>
      </TouchableOpacity>

      {/* Extra space at bottom for tab bar */}
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
  header: {
    marginBottom: Spacing.lg,
  },
  greeting: {
    ...Typography.headingMedium,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.medium,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.medium,
  },
  summaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  cardTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    fontWeight: '600',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  summaryItem: {
    flex: 1,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs / 2,
  },
  summaryAmount: {
    ...Typography.headingSmall,
    fontWeight: '700',
  },
  owedAmount: {
    color: Colors.error,
  },
  owingAmount: {
    color: Colors.success,
  },
  netContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  netLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginRight: Spacing.sm,
  },
  netAmount: {
    ...Typography.headingSmall,
    fontWeight: '700',
  },
  positiveNet: {
    color: Colors.success,
  },
  negativeNet: {
    color: Colors.error,
  },
  loadingContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  emptyContainer: {
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  emptySubtext: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  userSplitText: {
    ...Typography.caption,
    fontWeight: '500',
    marginTop: Spacing.xs / 2,
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
  activityCard: {
    padding: Spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  activityIcon: {
    fontSize: 24,
    marginRight: Spacing.md,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs / 2,
  },
  activitySubtitle: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  activityTime: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  addButton: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.medium,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
    ...Shadows.medium,
  },
  addButtonText: {
    ...Typography.body,
    color: Colors.surface,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: Spacing.xl,
  },
});