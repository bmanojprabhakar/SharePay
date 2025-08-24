import { useState, useEffect } from 'react';
import { Expense } from '../types';
import { expenseService } from '../services/firestore';

interface UseExpensesResult {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  refreshExpenses: () => Promise<void>;
}

export const useExpenses = (userId: string | null): UseExpensesResult => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = async () => {
    if (!userId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const recentExpenses = await expenseService.getRecentExpenses(userId, 10);
      setExpenses(recentExpenses);
    } catch (err) {
      console.error('Error loading expenses:', err);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const refreshExpenses = async () => {
    setLoading(true);
    await loadExpenses();
  };

  useEffect(() => {
    loadExpenses();
  }, [userId]);

  return {
    expenses,
    loading,
    error,
    refreshExpenses,
  };
};