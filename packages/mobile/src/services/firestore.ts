import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Group, Expense, UserBalance } from '../types';

// Collections
const GROUPS_COLLECTION = 'groups';
const USERS_COLLECTION = 'users';

// Group Services
export const groupService = {
  // Get all groups for a user (matching web app structure)
  getUserGroups: async (userId: string): Promise<Group[]> => {
    try {
      // Query groups where user is a member (using members array of UIDs)
      const groupsQuery = query(
        collection(db, GROUPS_COLLECTION),
        where('members', 'array-contains', userId)
      );
      const snapshot = await getDocs(groupsQuery);
      
      const userGroups = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Group[];
      
      // Sort by updatedAt in memory to avoid index requirements
      return userGroups.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  },

  // Get a specific group
  getGroup: async (groupId: string): Promise<Group | null> => {
    try {
      const groupDoc = await getDoc(doc(db, GROUPS_COLLECTION, groupId));
      if (!groupDoc.exists()) return null;
      
      return {
        id: groupDoc.id,
        ...groupDoc.data(),
        createdAt: groupDoc.data().createdAt?.toDate() || new Date(),
        updatedAt: groupDoc.data().updatedAt?.toDate() || new Date(),
      } as Group;
    } catch (error) {
      console.error('Error getting group:', error);
      return null;
    }
  },

  // Create a new group (matching web app structure)
  createGroup: async (groupData: any): Promise<string> => {
    try {
      // Filter out undefined values to avoid Firestore errors
      const cleanData = Object.fromEntries(
        Object.entries(groupData).filter(([_, value]) => value !== undefined)
      );
      
      const docRef = await addDoc(collection(db, GROUPS_COLLECTION), {
        ...cleanData,
        name_lowercase: groupData.name.toLowerCase(),
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  },

  // Update a group
  updateGroup: async (groupId: string, updates: any): Promise<void> => {
    try {
      // Filter out undefined values to avoid Firestore errors
      const cleanUpdates = Object.fromEntries(
        Object.entries(updates).filter(([_, value]) => value !== undefined)
      );
      
      const updateData: any = {
        ...cleanUpdates,
        updatedAt: Timestamp.now(),
      };
      
      if (updates.name) {
        updateData.name_lowercase = updates.name.toLowerCase();
      }
      
      await updateDoc(doc(db, GROUPS_COLLECTION, groupId), updateData);
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  },

  // Check if user exists in Firestore
  checkUserExists: async (email: string): Promise<boolean> => {
    try {
      // Query users collection to check if user with this email exists
      const usersQuery = query(
        collection(db, USERS_COLLECTION),
        where('email', '==', email.toLowerCase())
      );
      const snapshot = await getDocs(usersQuery);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  },

  // Add member to group (web app style)
  addMemberToGroup: async (groupId: string, userEmail: string): Promise<void> => {
    try {
      // First check if user exists
      const userExists = await groupService.checkUserExists(userEmail);
      if (!userExists) {
        throw new Error(`User with email ${userEmail} not found. They need to sign up for SharePay first.`);
      }

      const groupRef = doc(db, GROUPS_COLLECTION, groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists()) {
        const data = groupDoc.data();
        const currentMemberEmails = data.memberEmails || [];
        
        if (!currentMemberEmails.includes(userEmail)) {
          // For now, we'll add the email and a placeholder userId
          // In a real app, we'd look up the actual userId from the users collection
          await updateDoc(groupRef, {
            members: [...(data.members || []), `user_${userEmail}`], // Placeholder
            memberEmails: [...currentMemberEmails, userEmail],
            updatedAt: Timestamp.now(),
          });
        }
      }
    } catch (error) {
      console.error('Error adding member to group:', error);
      throw error;
    }
  },

  // Delete a group and all its expenses
  deleteGroup: async (groupId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      // First, delete all expenses in the group
      const expensesQuery = query(collection(db, GROUPS_COLLECTION, groupId, 'expenses'));
      const expensesSnapshot = await getDocs(expensesQuery);
      
      expensesSnapshot.docs.forEach((expenseDoc) => {
        batch.delete(expenseDoc.ref);
      });
      
      // Then delete the group itself
      batch.delete(doc(db, GROUPS_COLLECTION, groupId));
      
      await batch.commit();
      console.log('Group and all expenses deleted successfully');
    } catch (error) {
      console.error('Error deleting group:', error);
      throw error;
    }
  },

  // Remove member from group
  removeMemberFromGroup: async (groupId: string, userEmail: string, userId: string): Promise<void> => {
    try {
      const groupRef = doc(db, GROUPS_COLLECTION, groupId);
      const groupDoc = await getDoc(groupRef);
      
      if (groupDoc.exists()) {
        const data = groupDoc.data();
        const currentMembers = data.members || [];
        const currentMemberEmails = data.memberEmails || [];
        
        await updateDoc(groupRef, {
          members: currentMembers.filter((id: string) => id !== userId),
          memberEmails: currentMemberEmails.filter((email: string) => email !== userEmail),
          updatedAt: Timestamp.now(),
        });
      }
    } catch (error) {
      console.error('Error removing member from group:', error);
      throw error;
    }
  },

  // Subscribe to group changes
  subscribeToGroup: (groupId: string, callback: (group: Group | null) => void) => {
    return onSnapshot(doc(db, GROUPS_COLLECTION, groupId), (doc) => {
      if (doc.exists()) {
        const group = {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        } as Group;
        callback(group);
      } else {
        callback(null);
      }
    });
  },
};

// Expense Services (matching web app sub-collection structure)
export const expenseService = {
  // Get expenses for a group from sub-collection
  getGroupExpenses: async (groupId: string, limitCount = 20): Promise<Expense[]> => {
    try {
      // Query sub-collection: /groups/{groupId}/expenses
      const expensesQuery = query(
        collection(db, GROUPS_COLLECTION, groupId, 'expenses'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      const snapshot = await getDocs(expensesQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Expense[];
    } catch (error) {
      console.error('Error getting group expenses:', error);
      return [];
    }
  },

  // Get recent expenses for a user across all groups
  getRecentExpenses: async (userId: string, limitCount = 10): Promise<Expense[]> => {
    try {
      // Get user's groups first
      const userGroups = await groupService.getUserGroups(userId);
      
      if (userGroups.length === 0) return [];
      
      // Fetch expenses from all groups' sub-collections
      const allExpenses: Expense[] = [];
      
      for (const group of userGroups) {
        try {
          const expensesQuery = query(
            collection(db, GROUPS_COLLECTION, group.id, 'expenses'),
            orderBy('createdAt', 'desc'),
            limit(limitCount) // Get recent from each group
          );
          const snapshot = await getDocs(expensesQuery);
          const groupExpenses = snapshot.docs.map(doc => ({
            id: doc.id,
            groupId: group.id, // Add groupId for context
            groupName: group.name, // Add group name for display
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
          })) as (Expense & { groupId: string; groupName: string })[];
          
          allExpenses.push(...groupExpenses);
        } catch (error) {
          console.error(`Error getting expenses for group ${group.id}:`, error);
          // Continue with other groups even if one fails
        }
      }
      
      // Sort all expenses by createdAt and limit
      return allExpenses
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, limitCount);
    } catch (error) {
      console.error('Error getting recent expenses:', error);
      return [];
    }
  },

  // Create a new expense in sub-collection
  createExpense: async (groupId: string, expenseData: Omit<Expense, 'id' | 'createdAt'>): Promise<string> => {
    try {
      const batch = writeBatch(db);
      
      // Add expense to sub-collection
      const expenseRef = doc(collection(db, GROUPS_COLLECTION, groupId, 'expenses'));
      batch.set(expenseRef, {
        ...expenseData,
        createdAt: Timestamp.now(),
      });
      
      // Update group's updatedAt
      const groupRef = doc(db, GROUPS_COLLECTION, groupId);
      batch.update(groupRef, {
        updatedAt: Timestamp.now(),
      });
      
      await batch.commit();
      return expenseRef.id;
    } catch (error) {
      console.error('Error creating expense:', error);
      throw error;
    }
  },

  // Add expense (alias for createExpense for consistency with AddExpenseScreen)
  addExpense: async (groupId: string, expenseData: any): Promise<string> => {
    return expenseService.createExpense(groupId, expenseData);
  },

  // Update an existing expense
  updateExpense: async (groupId: string, expenseId: string, updates: any): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      // Update expense in sub-collection
      const expenseRef = doc(db, GROUPS_COLLECTION, groupId, 'expenses', expenseId);
      batch.update(expenseRef, {
        ...updates,
        updatedAt: Timestamp.now(),
      });
      
      // Update group's updatedAt
      const groupRef = doc(db, GROUPS_COLLECTION, groupId);
      batch.update(groupRef, {
        updatedAt: Timestamp.now(),
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error updating expense:', error);
      throw error;
    }
  },

  // Delete an expense
  deleteExpense: async (groupId: string, expenseId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);
      
      // Delete expense from sub-collection
      const expenseRef = doc(db, GROUPS_COLLECTION, groupId, 'expenses', expenseId);
      batch.delete(expenseRef);
      
      // Update group's updatedAt
      const groupRef = doc(db, GROUPS_COLLECTION, groupId);
      batch.update(groupRef, {
        updatedAt: Timestamp.now(),
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error deleting expense:', error);
      throw error;
    }
  },
};

// User Balance Service (matching web app calculation logic)
export const balanceService = {
  // Calculate user's total balance across all groups
  calculateUserBalance: async (userId: string, userEmail: string): Promise<UserBalance> => {
    try {
      const userGroups = await groupService.getUserGroups(userId);
      let totalYouOwe = 0;
      let totalOwedToYou = 0;
      
      for (const group of userGroups) {
        try {
          // Get all expenses for this group
          const expenses = await expenseService.getGroupExpenses(group.id);
          
          // Calculate balance for this group using web app logic
          expenses.forEach(expense => {
            if (expense.splitType === 'payment') {
              const amountYouPaid = expense.payers?.[userEmail] ?? 0;
              const amountYouReceived = expense.splitDetails?.[userEmail] ?? 0;
              totalYouOwe -= amountYouPaid;
              totalOwedToYou -= amountYouReceived;
              return;
            }
            
            const userShare = expense.splitBetween.includes(userEmail)
              ? (expense.splitType === 'equal'
                  ? expense.amount / expense.splitBetween.length
                  : expense.splitDetails?.[userEmail] ?? 0)
              : 0;

            const amountYouPaid = expense.payers?.[userEmail] ?? 0;

            if (amountYouPaid > userShare) {
              totalOwedToYou += amountYouPaid - userShare;
            } else {
              totalYouOwe += userShare - amountYouPaid;
            }
          });
        } catch (error) {
          console.error(`Error calculating balance for group ${group.id}:`, error);
          // Continue with other groups
        }
      }
      
      return {
        totalYouOwe: Math.max(0, totalYouOwe), // Ensure no negative values
        totalOwedToYou: Math.max(0, totalOwedToYou),
        netBalance: totalOwedToYou - totalYouOwe,
      };
    } catch (error) {
      console.error('Error calculating user balance:', error);
      return { totalYouOwe: 0, totalOwedToYou: 0, netBalance: 0 };
    }
  },

  // Calculate user's balance for a specific group
  calculateGroupBalance: async (groupId: string, userEmail: string): Promise<{ youOwe: number; owedToYou: number; netBalance: number; totalExpenses: number }> => {
    try {
      const expenses = await expenseService.getGroupExpenses(groupId);
      let totalYouOwe = 0;
      let totalOwedToYou = 0;
      let totalExpenses = 0;
      
      expenses.forEach(expense => {
        totalExpenses += expense.amount;
        
        if (expense.splitType === 'payment') {
          const amountYouPaid = expense.payers?.[userEmail] ?? 0;
          const amountYouReceived = expense.splitDetails?.[userEmail] ?? 0;
          totalYouOwe -= amountYouPaid;
          totalOwedToYou -= amountYouReceived;
          return;
        }
        
        const userShare = expense.splitBetween.includes(userEmail)
          ? (expense.splitType === 'equal'
              ? expense.amount / expense.splitBetween.length
              : expense.splitDetails?.[userEmail] ?? 0)
          : 0;

        const amountYouPaid = expense.payers?.[userEmail] ?? 0;

        if (amountYouPaid > userShare) {
          totalOwedToYou += amountYouPaid - userShare;
        } else {
          totalYouOwe += userShare - amountYouPaid;
        }
      });
      
      return {
        youOwe: Math.max(0, totalYouOwe),
        owedToYou: Math.max(0, totalOwedToYou),
        netBalance: totalOwedToYou - totalYouOwe,
        totalExpenses,
      };
    } catch (error) {
      console.error(`Error calculating balance for group ${groupId}:`, error);
      return { youOwe: 0, owedToYou: 0, netBalance: 0, totalExpenses: 0 };
    }
  },
};

// Helper function to get category emoji
export const getCategoryEmoji = (category: string): string => {
  const categoryEmojis: { [key: string]: string } = {
    food: '🍽️',
    transport: '🚗',
    entertainment: '🎬',
    groceries: '🛒',
    utilities: '⚡',
    travel: '✈️',
    shopping: '🛍️',
    other: '💰',
  };
  return categoryEmojis[category] || '💰';
};

// Helper function to format time ago
export const getTimeAgo = (date: Date): string => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  
  if (minutes < 60) {
    return `${minutes} minutes ago`;
  } else if (hours < 24) {
    return `${hours} hours ago`;
  } else if (days === 1) {
    return 'Yesterday';
  } else {
    return `${days} days ago`;
  }
};