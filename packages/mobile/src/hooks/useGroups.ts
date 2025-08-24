import { useState, useEffect } from 'react';
import { Group, UserBalance } from '../types';
import { groupService, balanceService } from '../services/firestore';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface UseGroupsResult {
  groups: Group[];
  balance: UserBalance;
  loading: boolean;
  error: string | null;
  refreshGroups: () => Promise<void>;
}

export const useGroups = (userId: string | null, userEmail: string | null): UseGroupsResult => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [balance, setBalance] = useState<UserBalance>({ totalYouOwe: 0, totalOwedToYou: 0, netBalance: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGroups = async () => {
    if (!userId || !userEmail) {
      setGroups([]);
      setBalance({ totalYouOwe: 0, totalOwedToYou: 0, netBalance: 0 });
      setLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Set up real-time listener for groups
      const groupsQuery = query(
        collection(db, 'groups'), 
        where('members', 'array-contains', userId)
      );
      
      const unsubscribe = onSnapshot(groupsQuery, async (snapshot) => {
        const groupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        })) as Group[];
        
        // Sort by updatedAt
        groupsData.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        
        setGroups(groupsData);
        
        // Calculate balance for updated groups
        try {
          const userBalance = await balanceService.calculateUserBalance(userId, userEmail);
          setBalance(userBalance);
        } catch (balanceError) {
          console.error('Error calculating balance:', balanceError);
        }
        
        setLoading(false);
      }, (error) => {
        console.error('Error in groups subscription:', error);
        setError('Failed to load groups');
        setLoading(false);
      });
      
      // Return unsubscribe function
      return unsubscribe;
      
    } catch (err) {
      console.error('Error setting up groups subscription:', err);
      setError('Failed to load groups');
      setLoading(false);
    }
  };

  const refreshGroups = async () => {
    setLoading(true);
    await loadGroups();
  };

  useEffect(() => {
    if (!userId || !userEmail) return;
    
    let unsubscribe: (() => void) | undefined;
    
    const setupListener = async () => {
      unsubscribe = await loadGroups() as (() => void) | undefined;
    };
    
    setupListener();
    
    // Cleanup subscription on unmount or dependency change
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [userId, userEmail]);

  return {
    groups,
    balance,
    loading,
    error,
    refreshGroups,
  };
};