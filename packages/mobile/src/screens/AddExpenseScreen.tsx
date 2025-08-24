import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { RouteProp, useRoute, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../constants/theme';
import { useAuth } from '../hooks/useAuth';
import { useAlert } from '../components/AlertProvider';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Select, { SelectOption } from '../components/ui/Select';
import RadioGroup, { RadioOption } from '../components/ui/RadioGroup';
import Checkbox from '../components/ui/Checkbox';
import { GroupsStackParamList } from '../navigation/GroupsStackNavigator';
import { Group, Expense } from '../types';
import { groupService, expenseService } from '../services/firestore';
import { EXPENSE_CATEGORIES, DEFAULT_CATEGORY } from '@sharepay/shared';

type AddExpenseScreenRouteProp = RouteProp<GroupsStackParamList, 'AddExpense'>;
type AddExpenseScreenNavigationProp = StackNavigationProp<GroupsStackParamList, 'AddExpense'>;

interface Member {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
}

interface MultiplePayer {
  email: string;
  amount: number;
}

interface UnequalSplit {
  email: string;
  amount: number;
}

export default function AddExpenseScreen() {
  const route = useRoute<AddExpenseScreenRouteProp>();
  const navigation = useNavigation<AddExpenseScreenNavigationProp>();
  const { groupId, expenseToEdit } = route.params || {};
  const { user } = useAuth();
  const { showAlert } = useAlert();

  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(DEFAULT_CATEGORY);
  const [notes, setNotes] = useState('');
  const [isMultiPayer, setIsMultiPayer] = useState(false);
  const [paidBySingle, setPaidBySingle] = useState('');
  const [paidByMultiple, setPaidByMultiple] = useState<MultiplePayer[]>([]);
  const [splitType, setSplitType] = useState<'equal' | 'unequal'>('equal');
  const [splitBetween, setSplitBetween] = useState<string[]>([]);
  const [unequalSplitDetails, setUnequalSplitDetails] = useState<UnequalSplit[]>([]);

  // Validation errors
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadGroupData();
  }, [groupId]);

  useEffect(() => {
    if (members.length > 0) {
      initializeForm();
    }
  }, [members, expenseToEdit]);

  useEffect(() => {
    // Update unequal split details when split type or amount changes
    if (splitType === 'equal' && splitBetween.length > 0 && amount) {
      const numericAmount = parseFloat(amount);
      if (!isNaN(numericAmount)) {
        const sharePerPerson = numericAmount / splitBetween.length;
        setUnequalSplitDetails(prev =>
          prev.map(detail => ({
            ...detail,
            amount: splitBetween.includes(detail.email) ? sharePerPerson : 0,
          }))
        );
      }
    }
  }, [splitType, amount, splitBetween]);

  const loadGroupData = async () => {
    if (!groupId || !user?.email) return;

    try {
      setLoading(true);
      const groupData = await groupService.getGroup(groupId);
      
      if (!groupData) {
        showAlert({
          title: 'Error',
          message: 'Group not found',
        });
        navigation.goBack();
        return;
      }

      setGroup(groupData);
      
      // Create members list from group data
      const membersList: Member[] = groupData.memberEmails.map((email, index) => ({
        id: groupData.members[index] || email,
        email,
        name: email.split('@')[0],
      }));
      
      setMembers(membersList);
    } catch (error) {
      console.error('Error loading group:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to load group data',
      });
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const initializeForm = () => {
    const memberEmails = members.map(m => m.email);

    if (expenseToEdit) {
      // Initialize for editing
      const payerEmails = Object.keys(expenseToEdit.payers || {});
      const isEditMultiPayer = payerEmails.length > 1;

      setDescription(expenseToEdit.description);
      setAmount(expenseToEdit.amount.toString());
      setCategory(expenseToEdit.category || DEFAULT_CATEGORY);
      setNotes(expenseToEdit.notes || '');
      setIsMultiPayer(isEditMultiPayer);
      setPaidBySingle(!isEditMultiPayer ? payerEmails[0] : user?.email || '');
      setPaidByMultiple(memberEmails.map(email => ({
        email,
        amount: expenseToEdit.payers?.[email] || 0
      })));
      setSplitType(expenseToEdit.splitType === 'payment' ? 'equal' : expenseToEdit.splitType);
      setSplitBetween(expenseToEdit.splitBetween);
      setUnequalSplitDetails(memberEmails.map(email => ({
        email,
        amount: expenseToEdit.splitType === 'unequal'
          ? (expenseToEdit.splitDetails?.[email] || 0)
          : (expenseToEdit.splitBetween.includes(email) ? expenseToEdit.amount / expenseToEdit.splitBetween.length : 0)
      })));
    } else {
      // Initialize for new expense
      setDescription('');
      setAmount('');
      setCategory(DEFAULT_CATEGORY);
      setNotes('');
      setIsMultiPayer(false);
      setPaidBySingle(user?.email || '');
      setPaidByMultiple(memberEmails.map(email => ({ email, amount: 0 })));
      setSplitType('equal');
      setSplitBetween(memberEmails);
      setUnequalSplitDetails(memberEmails.map(email => ({ email, amount: 0 })));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!description.trim()) {
      newErrors.description = 'Description is required';
    }

    const numericAmount = parseFloat(amount);
    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (isMultiPayer) {
      const totalPaid = paidByMultiple.reduce((sum, item) => sum + (item.amount || 0), 0);
      if (Math.abs(totalPaid - numericAmount) > 0.01) {
        newErrors.paidByMultiple = 'The sum of payments must equal the total expense amount';
      }
    } else if (!paidBySingle) {
      newErrors.paidBySingle = 'A payer is required';
    }

    if (splitBetween.length === 0) {
      newErrors.splitBetween = 'You must select at least one member to split with';
    }

    if (splitType === 'unequal') {
      const totalSplit = unequalSplitDetails.reduce((sum, item) => sum + (item.amount || 0), 0);
      if (Math.abs(totalSplit - numericAmount) > 0.01) {
        newErrors.unequalSplitDetails = 'The sum of unequal splits must equal the total expense amount';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !user) return;

    try {
      setSubmitting(true);

      const numericAmount = parseFloat(amount);
      let payers: { [key: string]: number } = {};

      if (isMultiPayer) {
        payers = paidByMultiple.reduce((acc, item) => {
          if (item.amount > 0) {
            acc[item.email] = item.amount;
          }
          return acc;
        }, {} as { [key: string]: number });
      } else {
        payers[paidBySingle] = numericAmount;
      }

      const expenseData: any = {
        description: description.trim(),
        amount: numericAmount,
        category,
        notes: notes.trim(),
        payers,
        splitType,
        splitBetween,
        createdBy: user.email,
      };

      if (splitType === 'unequal') {
        expenseData.splitDetails = unequalSplitDetails.reduce((acc, item) => {
          if (splitBetween.includes(item.email)) {
            acc[item.email] = item.amount;
          }
          return acc;
        }, {} as { [key: string]: number });
      }

      if (expenseToEdit) {
        await expenseService.updateExpense(groupId, expenseToEdit.id, expenseData);
        showAlert({
          title: 'Success',
          message: 'Expense updated successfully',
        });
      } else {
        await expenseService.addExpense(groupId, expenseData);
        showAlert({
          title: 'Success',
          message: 'Expense added successfully',
        });
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving expense:', error);
      showAlert({
        title: 'Error',
        message: 'Failed to save expense. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions: SelectOption[] = EXPENSE_CATEGORIES.map(cat => ({
    label: cat.label,
    value: cat.value,
    icon: cat.icon,
  }));

  const payerOptions: SelectOption[] = members.map(member => ({
    label: member.email === user?.email ? 'You' : (member.name || member.email.split('@')[0]),
    value: member.email,
  }));

  const splitOptions: RadioOption[] = [
    { label: 'Equally', value: 'equal' },
    { label: 'Unequally', value: 'unequal' },
  ];

  const totalPaid = paidByMultiple.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalUnequalSplit = unequalSplitDetails.reduce((sum, item) => sum + (item.amount || 0), 0);
  const numericAmount = parseFloat(amount) || 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.headerButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {expenseToEdit ? 'Edit Expense' : 'Add Expense'}
          </Text>
          <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
            <Text style={[styles.headerButton, styles.saveButton]}>
              {submitting ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          {/* Basic Info */}
          <View style={styles.section}>
            <Input
              label="Description"
              placeholder="e.g., Dinner, Movie Tickets"
              value={description}
              onChangeText={setDescription}
              error={errors.description}
            />

            <Input
              label="Amount (₹)"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              error={errors.amount}
            />

            <Select
              label="Category"
              value={category}
              onValueChange={setCategory}
              options={categoryOptions}
              placeholder="Select category"
            />

            <Input
              label="Notes (Optional)"
              placeholder="Add any additional details..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Paid By Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Paid By</Text>
              <TouchableOpacity onPress={() => setIsMultiPayer(!isMultiPayer)}>
                <Text style={styles.toggleButton}>
                  {isMultiPayer ? 'Single Payer' : 'Multiple Payers'}
                </Text>
              </TouchableOpacity>
            </View>

            {isMultiPayer ? (
              <View>
                {members.map((member, index) => (
                  <View key={member.id} style={styles.payerRow}>
                    <Text style={styles.memberName}>
                      {member.email === user?.email ? 'You' : (member.name || member.email.split('@')[0])}
                    </Text>
                    <Input
                      value={paidByMultiple[index]?.amount?.toString() || '0'}
                      onChangeText={(text) => {
                        const newPaidBy = [...paidByMultiple];
                        newPaidBy[index] = {
                          ...newPaidBy[index],
                          amount: parseFloat(text) || 0
                        };
                        setPaidByMultiple(newPaidBy);
                      }}
                      keyboardType="numeric"
                      placeholder="0.00"
                      style={styles.amountInput}
                    />
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Total:</Text>
                  <Text style={styles.totalAmount}>
                    ₹{totalPaid.toFixed(2)} / ₹{numericAmount.toFixed(2)}
                  </Text>
                </View>
                {errors.paidByMultiple && (
                  <Text style={styles.errorText}>{errors.paidByMultiple}</Text>
                )}
              </View>
            ) : (
              <Select
                value={paidBySingle}
                onValueChange={setPaidBySingle}
                options={payerOptions}
                placeholder="Select who paid"
                error={errors.paidBySingle}
              />
            )}
          </View>

          {/* Split Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Split Method</Text>
            <RadioGroup
              value={splitType}
              onValueChange={(value) => setSplitType(value as 'equal' | 'unequal')}
              options={splitOptions}
              direction="row"
            />
          </View>

          {/* Split Between */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Split Between</Text>
            
            {members.map((member, index) => (
              <View key={member.id} style={styles.splitRow}>
                <Checkbox
                  checked={splitBetween.includes(member.email)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSplitBetween([...splitBetween, member.email]);
                    } else {
                      setSplitBetween(splitBetween.filter(email => email !== member.email));
                    }
                  }}
                  label={member.email === user?.email ? 'You' : (member.name || member.email.split('@')[0])}
                />
                
                {splitType === 'unequal' && splitBetween.includes(member.email) && (
                  <Input
                    value={unequalSplitDetails[index]?.amount?.toString() || '0'}
                    onChangeText={(text) => {
                      const newSplitDetails = [...unequalSplitDetails];
                      newSplitDetails[index] = {
                        ...newSplitDetails[index],
                        amount: parseFloat(text) || 0
                      };
                      setUnequalSplitDetails(newSplitDetails);
                    }}
                    keyboardType="numeric"
                    placeholder="0.00"
                    style={styles.splitAmountInput}
                  />
                )}
              </View>
            ))}

            {splitType === 'unequal' && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>
                  ₹{totalUnequalSplit.toFixed(2)} / ₹{numericAmount.toFixed(2)}
                </Text>
              </View>
            )}

            {errors.splitBetween && (
              <Text style={styles.errorText}>{errors.splitBetween}</Text>
            )}
            {errors.unequalSplitDetails && (
              <Text style={styles.errorText}>{errors.unequalSplitDetails}</Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerButton: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
  saveButton: {
    fontWeight: '600',
  },
  headerTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: Spacing.md,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    ...Typography.headingSmall,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  toggleButton: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '500',
  },
  payerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  memberName: {
    ...Typography.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  amountInput: {
    width: 120,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  totalLabel: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  totalAmount: {
    ...Typography.body,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  splitAmountInput: {
    width: 100,
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});