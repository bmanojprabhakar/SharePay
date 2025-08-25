
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  doc,
  onSnapshot,
  query,
  orderBy,
  collection,
  deleteDoc,
  where,
  getDocs,
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserAvatar } from '@/components/user-avatar';
import { Plus, Users, ArrowLeft, MoreVertical, Edit, Trash2, FileText, MessageSquare, ChevronDown, ChevronUp, BarChart3, TrendingUp, Crown, Search } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { getCategoryByValue } from '@/lib/expense-categories';
import { AddExpenseDialog } from '@/components/add-expense-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { SettleUpDialog } from '@/components/settle-up-dialog';
import { ImportExportDialog } from '@/components/import-export-dialog';
import { addDoc, collection as firestoreCollection } from 'firebase/firestore';
import { format, parseISO, isValid } from 'date-fns';
import { formatAmount } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface Member {
    id: string;
    email?: string;
    name?: string;
    displayName?: string;
    photoURL?: string;
}

interface Expense {
    id:string;
    description: string;
    amount: number;
    category?: string;
    notes?: string;
    expenseDate?: string;
    payers: { [email: string]: number };
    splitBetween: string[];
    splitType: 'equal' | 'unequal' | 'payment';
    splitDetails?: { [email: string]: number };
    createdAt?: any;
    createdBy: string;
}

interface Balances {
    youOwe: number;
    youAreOwed: number;
    netBalance: number;
}

export default function GroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const [user, loadingUser] = useAuthState(auth);
  const [group, setGroup] = useState<any | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [isSettleUpOpen, setIsSettleUpOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'group' | 'expense', id: string, name: string} | null>(null);
  const [memberDisplayMode, setMemberDisplayMode] = useState<'spent' | 'incurred'>('incurred');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [expenseSearchTerm, setExpenseSearchTerm] = useState('');
  const [currentExpensePage, setCurrentExpensePage] = useState(1);
  const expensesPerPage = 10;
  const { toast } = useToast();

  // Import handler for CSV expenses
  const handleImportExpenses = async (firestoreExpenses: any[]) => {
    try {
      const expensesCollection = firestoreCollection(db, 'groups', groupId, 'expenses');
      
      // Add each expense to Firestore with detailed logging
      for (let i = 0; i < firestoreExpenses.length; i++) {
        const expense = firestoreExpenses[i];
        
        try {
          // Log the expense data for debugging
          console.log(`Processing expense ${i + 1}/${firestoreExpenses.length}:`, expense);
          
          // Validate and clean the expense data
          const cleanedExpense = {
            description: expense.description || '',
            amount: Number(expense.amount) || 0,
            payers: expense.payers || {},
            splitBetween: expense.splitBetween || [],
            splitType: expense.splitType || 'equal',
            splitDetails: expense.splitDetails || undefined,
            createdAt: expense.createdAt instanceof Date ? expense.createdAt : new Date(),
            createdBy: expense.createdBy || '',
            category: expense.category || undefined,
            notes: expense.notes || undefined,
            expenseDate: expense.expenseDate || undefined,
          };
          
          // Remove undefined values to avoid Firestore issues
          Object.keys(cleanedExpense).forEach(key => {
            if (cleanedExpense[key as keyof typeof cleanedExpense] === undefined) {
              delete cleanedExpense[key as keyof typeof cleanedExpense];
            }
          });
          
          console.log(`Cleaned expense data:`, cleanedExpense);
          
          await addDoc(expensesCollection, cleanedExpense);
          console.log(`Successfully added expense ${i + 1}`);
        } catch (expenseError) {
          console.error(`Error adding expense ${i + 1}:`, expenseError);
          console.error(`Problematic expense data:`, expense);
          throw new Error(`Failed to import expense ${i + 1}: ${expenseError instanceof Error ? expenseError.message : 'Unknown error'}`);
        }
      }

      toast({
        title: 'Import successful',
        description: `Successfully imported ${firestoreExpenses.length} expense${firestoreExpenses.length !== 1 ? 's' : ''}.`,
      });
    } catch (error) {
      console.error('Import failed with error:', error);
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Failed to import expenses. Please try again.',
      });
      throw error;
    }
  };

  useEffect(() => {
    if (!user || !groupId) return;

    const groupDocRef = doc(db, 'groups', groupId);
    const unsubscribeGroup = onSnapshot(groupDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() } as any;
        if (!groupData.members?.includes(user.uid)) {
          toast({ variant: 'destructive', title: 'Unauthorized', description: 'You are not a member of this group.' });
          router.push('/groups');
          return;
        }
        setGroup(groupData);
        
        // Fetch detailed member information including names
        const fetchMemberDetails = async () => {
          const memberDetails = await Promise.all(
            groupData.memberEmails.map(async (email: string) => {
              try {
                // Query users collection to get user details by email
                const userQuery = query(collection(db, 'users'), where('email', '==', email));
                const userSnapshot = await getDocs(userQuery);
                
                if (!userSnapshot.empty) {
                  const userData = userSnapshot.docs[0].data();
                  return {
                    id: email,
                    email: email,
                    name: userData.name || undefined,
                    displayName: userData.name || undefined, // For UserAvatar compatibility
                    photoURL: userData.photoURL || undefined, // Include photoURL
                  };
                } else {
                  // Fallback for users without documents
                  return {
                    id: email,
                    email: email,
                    name: undefined,
                    displayName: undefined,
                  };
                }
              } catch (error) {
                return {
                  id: email,
                  email: email,
                  name: undefined,
                  displayName: undefined,
                };
              }
            })
          );
          setMembers(memberDetails);
        };
        
        fetchMemberDetails();
      } else {
        toast({ variant: 'destructive', title: 'Not Found', description: 'This group does not exist.' });
        router.push('/groups');
      }
      setLoading(false);
    }, (error) => {
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load group data.' });
        setLoading(false);
        router.push('/groups');
    });

    const expensesQuery = query(collection(db, 'groups', groupId, 'expenses'), orderBy('createdAt', 'desc'));
    const unsubscribeExpenses = onSnapshot(expensesQuery, (querySnapshot) => {
        const expensesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
        setExpenses(expensesData);
    }, (error) => {
        // Error handled silently
    });

    return () => {
      unsubscribeGroup();
      unsubscribeExpenses();
    };
  }, [groupId, user, router, toast]);

  const groupBalances = useMemo<Balances>(() => {
    if (!user || !user.email || expenses.length === 0) {
        return { youOwe: 0, youAreOwed: 0, netBalance: 0 };
    }

    let totalOwedToYou = 0;
    let totalYouOwe = 0;

    expenses.forEach(expense => {
      if (expense.splitType === 'payment') {
        const amountYouPaid = expense.payers?.[user.email!] ?? 0;
        const amountYouReceived = expense.splitDetails?.[user.email!] ?? 0;
        totalYouOwe -= amountYouPaid;
        totalOwedToYou -= amountYouReceived;
        return;
      }
        const userShare = expense.splitBetween.includes(user.email!)
            ? (expense.splitType === 'equal'
                ? expense.amount / expense.splitBetween.length
                : expense.splitDetails?.[user.email!] ?? 0)
            : 0;

        const amountYouPaid = expense.payers?.[user.email!] ?? 0;

        if (amountYouPaid > userShare) {
            totalOwedToYou += amountYouPaid - userShare;
        } else if (userShare > amountYouPaid) {
            totalYouOwe += userShare - amountYouPaid;
        }
    });

    const netBalance = totalOwedToYou - totalYouOwe;

    return { youOwe: totalYouOwe, youAreOwed: totalOwedToYou, netBalance };

  }, [expenses, user]);

  const isCreator = useMemo(() => user?.uid === group?.createdBy, [user, group]);

  const isSettleUpDisabled = useMemo(() => {
    return Math.abs(groupBalances.netBalance) < 0.01 && groupBalances.youAreOwed < 0.01 && groupBalances.youOwe < 0.01;
  }, [groupBalances]);

  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: Expense[] } = {};
    
    // Filter expenses based on search term
    const filteredExpenses = expenses.filter(expense => {
      if (!expenseSearchTerm.trim()) return true;
      
      const searchLower = expenseSearchTerm.toLowerCase();
      const categoryInfo = getCategoryByValue(expense.category || 'others');
      
      return (
        expense.description.toLowerCase().includes(searchLower) ||
        expense.notes?.toLowerCase().includes(searchLower) ||
        categoryInfo.label.toLowerCase().includes(searchLower) ||
        expense.amount.toString().includes(expenseSearchTerm)
      );
    });
    
    filteredExpenses.forEach(expense => {
      let dateKey: string;
      
      // Only use expenseDate if it exists and is valid
      if (expense.expenseDate && expense.expenseDate.trim() !== '') {
        try {
          const parsedDate = parseISO(expense.expenseDate);
          if (isValid(parsedDate)) {
            dateKey = format(parsedDate, 'yyyy-MM-dd');
          } else {
            dateKey = 'Unknown Date';
          }
        } catch {
          dateKey = 'Unknown Date';
        }
      } 
      // Otherwise, put in Unknown Date group
      else {
        dateKey = 'Unknown Date';
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(expense);
    });
    
    // Sort dates in descending order, with "Unknown Date" at the end
    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
      return b.localeCompare(a);
    });
    
    return sortedDates.map(date => ({
      date,
      displayDate: date === 'Unknown Date' ? 'Unknown Date' : format(parseISO(date), 'MMMM dd, yyyy'),
      expenses: groups[date]
    }));
  }, [expenses, expenseSearchTerm]);

  // Flatten grouped expenses for pagination
  const allFilteredExpenses = useMemo(() => {
    return groupedExpenses.flatMap(group => 
      group.expenses.map(expense => ({
        ...expense,
        dateGroup: group.date,
        displayDate: group.displayDate
      }))
    );
  }, [groupedExpenses]);

  // Pagination logic for expenses
  const totalExpensePages = Math.ceil(allFilteredExpenses.length / expensesPerPage);
  const startExpenseIndex = (currentExpensePage - 1) * expensesPerPage;
  const endExpenseIndex = startExpenseIndex + expensesPerPage;
  const currentPageExpenses = allFilteredExpenses.slice(startExpenseIndex, endExpenseIndex);

  // Regroup paginated expenses by date
  const paginatedGroupedExpenses = useMemo(() => {
    const groups: { [key: string]: { date: string; displayDate: string; expenses: any[] } } = {};
    
    currentPageExpenses.forEach(expense => {
      if (!groups[expense.dateGroup]) {
        groups[expense.dateGroup] = {
          date: expense.dateGroup,
          displayDate: expense.displayDate,
          expenses: []
        };
      }
      groups[expense.dateGroup].expenses.push(expense);
    });
    
    // Sort dates in descending order, with "Unknown Date" at the end
    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === 'Unknown Date') return 1;
      if (b === 'Unknown Date') return -1;
      return b.localeCompare(a);
    });
    
    return sortedDates.map(date => groups[date]);
  }, [currentPageExpenses]);

  const handleExpensePageChange = (page: number) => {
    setCurrentExpensePage(page);
  };

  const memberExpenditures = useMemo(() => {
    const expenditures: { [email: string]: number } = {};
    
    // Initialize all members with 0
    members.forEach(member => {
      if (member.email) {
        expenditures[member.email] = 0;
      }
    });
    
    // Calculate expenditures for each member (what they spent)
    expenses.forEach(expense => {
      // Only count actual expenses, not payments
      if (expense.splitType !== 'payment' && expense.payers) {
        Object.entries(expense.payers).forEach(([email, amount]) => {
          if (expenditures.hasOwnProperty(email)) {
            expenditures[email] += amount;
          }
        });
      }
    });
    
    return expenditures;
  }, [expenses, members]);

  const memberIncurredExpenses = useMemo(() => {
    const incurred: { [email: string]: number } = {};
    
    // Initialize all members with 0
    members.forEach(member => {
      if (member.email) {
        incurred[member.email] = 0;
      }
    });
    
    // Calculate incurred expenses for each member (their share of expenses)
    expenses.forEach(expense => {
      // Only count actual expenses, not payments
      if (expense.splitType !== 'payment') {
        expense.splitBetween.forEach(email => {
          if (incurred.hasOwnProperty(email)) {
            let memberShare = 0;
            
            if (expense.splitType === 'equal') {
              memberShare = expense.amount / expense.splitBetween.length;
            } else if (expense.splitType === 'unequal' && expense.splitDetails) {
              memberShare = expense.splitDetails[email] || 0;
            }
            
            incurred[email] += memberShare;
          }
        });
      }
    });
    
    return incurred;
  }, [expenses, members]);

  const groupAnalytics = useMemo(() => {
    const actualExpenses = expenses.filter(e => e.splitType !== 'payment');
    
    if (actualExpenses.length === 0) {
      return {
        totalExpenses: 0,
        averageExpense: 0,
        expenseCount: 0,
        categoryBreakdown: {},
        monthlyTrends: {},
        topSpender: null as { name: string; amount: number } | null,
        topExpense: null as { name: string; amount: number } | null,
        mostActiveCategory: null as string | null,
        mostActiveCategoryAmount: 0,
      };
    }

    // Category breakdown
    const categoryTotals: { [key: string]: number } = {};
    actualExpenses.forEach(expense => {
      const category = expense.category || 'others';
      categoryTotals[category] = (categoryTotals[category] || 0) + expense.amount;
    });

    // Monthly trends (last 6 months)
    const monthlyTotals: { [key: string]: number } = {};
    actualExpenses.forEach(expense => {
      let monthKey: string;
      
      if (expense.expenseDate) {
        try {
          const date = parseISO(expense.expenseDate);
          if (isValid(date)) {
            monthKey = format(date, 'yyyy-MM');
          } else {
            monthKey = 'Unknown';
          }
        } catch {
          monthKey = 'Unknown';
        }
      } else if (expense.createdAt?.toDate) {
        monthKey = format(expense.createdAt.toDate(), 'yyyy-MM');
      } else {
        monthKey = 'Unknown';
      }
      
      monthlyTotals[monthKey] = (monthlyTotals[monthKey] || 0) + expense.amount;
    });

    // Find top spender by total amount spent
    let topSpender: { name: string; amount: number } | null = null;
    let maxSpent = 0;
    Object.entries(memberExpenditures).forEach(([email, amount]) => {
      if (amount > maxSpent) {
        maxSpent = amount;
        const member = members.find(m => m.email === email);
        topSpender = {
          name: member?.email === user?.email ? 'You' : (member?.name || member?.email?.split('@')[0] || 'Unknown'),
          amount
        };
      }
    });

    // Find top expense by amount
    let topExpense: { name: string; amount: number } | null = null;
    let maxExpenseAmount = 0;
    actualExpenses.forEach(expense => {
      if (expense.amount > maxExpenseAmount) {
        maxExpenseAmount = expense.amount;
        topExpense = {
          name: expense.description,
          amount: expense.amount
        };
      }
    });

    // Most active category
    const mostActiveCategory = Object.entries(categoryTotals).reduce((prev, current) => 
      current[1] > prev[1] ? current : prev, ['others', 0]
    );

    const totalAmount = actualExpenses.reduce((sum, e) => sum + e.amount, 0);

    return {
      totalExpenses: totalAmount,
      averageExpense: totalAmount / actualExpenses.length,
      expenseCount: actualExpenses.length,
      categoryBreakdown: categoryTotals,
      monthlyTrends: monthlyTotals,
      topSpender,
      topExpense,
      mostActiveCategory: mostActiveCategory[0],
      mostActiveCategoryAmount: mostActiveCategory[1],
    };
  }, [expenses, members, memberExpenditures, user]);

  const getPayerDescription = (payers: { [email: string]: number }): string => {
    if (!payers) return 'no one';
    const payerEmails = Object.keys(payers);
    if (payerEmails.length === 0) return 'no one';
    if (payerEmails.length === 1) {
        const payerEmail = payerEmails[0];
        if (payerEmail === user?.email) {
            return 'You';
        } else {
            const memberData = members.find(m => m.email === payerEmail);
            return memberData?.name || memberData?.email?.split('@')[0] || payerEmail.split('@')[0];
        }
    }
    return `${payerEmails.length} people`;
  };

  const handleOpenEditDialog = (expense: Expense) => {
    setEditingExpense(expense);
    setIsAddExpenseOpen(true);
  }

  const handleOpenAddDialog = () => {
    setEditingExpense(null);
    setIsAddExpenseOpen(true);
  }

  const handleDeleteClick = (item: {type: 'group' | 'expense', id: string, name: string}) => {
    setItemToDelete(item);
    setShowDeleteAlert(true);
  };


  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;

    const {type, id, name} = itemToDelete;

    try {
        if (type === 'group') {
            await deleteDoc(doc(db, 'groups', id));
            toast({
                title: 'Group Deleted',
                description: `Group "${name}" has been deleted.`,
            });
            router.push('/groups');
        } else if (type === 'expense') {
            await deleteDoc(doc(db, 'groups', groupId, 'expenses', id));
             toast({
                title: 'Expense Deleted',
                description: `Expense "${name}" has been deleted.`,
            });
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: `Error deleting ${type}`,
            description: error.message,
        });
    } finally {
        setShowDeleteAlert(false);
        setItemToDelete(null);
    }
  };


  if (loading || loadingUser) {
    return <p>Loading group details...</p>;
  }

  if (!group) {
    return null;
  }

  return (
    <>
    <AddExpenseDialog
        isOpen={isAddExpenseOpen}
        setIsOpen={setIsAddExpenseOpen}
        groupId={groupId}
        members={members}
        expenseToEdit={editingExpense}
    />
    <SettleUpDialog
        isOpen={isSettleUpOpen}
        setIsOpen={setIsSettleUpOpen}
        groupId={groupId}
        members={members}
        expenses={expenses}
    />
    <div className="flex flex-col gap-6 sm:gap-8 w-full max-w-full px-1 sm:px-0">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/groups')} className="shrink-0">
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl sm:text-2xl font-semibold md:text-3xl truncate">{group.name}</h1>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-2">
            <Button onClick={handleOpenAddDialog} className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
            </Button>
            <Button variant="outline" onClick={() => setIsImportExportOpen(true)} className="w-full sm:w-auto">
            <FileText className="mr-2 h-4 w-4" />
            Import/Export
            </Button>
            {isCreator && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon" className="shrink-0">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[160px]">
                         <DropdownMenuItem onSelect={() => router.push(`/groups/${group.id}/edit`)}>
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => handleDeleteClick({type: 'group', id: group.id, name: group.name})} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
      </header>
      
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
                        <CardTitle>Expenses</CardTitle>
                        <div className="relative max-w-full sm:max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                            <Input
                                placeholder="Search expenses..."
                                value={expenseSearchTerm}
                                onChange={(e) => {
                                    setExpenseSearchTerm(e.target.value);
                                    setCurrentExpensePage(1); // Reset to first page when searching
                                }}
                                className="pl-10 pr-4"
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {expenses.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No expenses yet.</p>
                            <p className="text-muted-foreground">Click "Add Expense" to get started.</p>
                        </div>
                    ) : groupedExpenses.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No expenses match your search.</p>
                            <Button 
                                variant="outline" 
                                onClick={() => {
                                    setExpenseSearchTerm('');
                                    setCurrentExpensePage(1);
                                }}
                                className="mt-2"
                            >
                                Clear Search
                            </Button>
                        </div>
                    ) : (
                        <>
                        <div className="space-y-6">
                            {paginatedGroupedExpenses.map(group => (
                                <div key={group.date}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <h4 className="text-sm font-semibold text-muted-foreground">{group.displayDate}</h4>
                                        <div className="flex-1 h-px bg-border"></div>
                                        <span className="text-xs text-muted-foreground">{group.expenses.length} expense{group.expenses.length !== 1 ? 's' : ''}</span>
                                    </div>
                                    <ul className="space-y-3">
                                        {group.expenses.map(expense => {
                                            const category = getCategoryByValue(expense.category || 'others');
                                            return (
                                            <li key={expense.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between p-3 sm:p-4 bg-muted/50 rounded-md gap-3 sm:gap-4 overflow-hidden">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-lg">{category.icon}</span>
                                                        <p className="font-medium truncate">{expense.description}</p>
                                                        <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                                                            {category.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-muted-foreground mb-1 break-words">
                                                      {expense.splitType === 'payment' ? 'Payment' : `Paid by ${getPayerDescription(expense.payers)} and split between ${expense.splitBetween.length} people`}
                                                    </p>
                                                    {expense.notes && (
                                                        <div className="flex items-start gap-1 mt-2">
                                                            <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                            <p className="text-xs text-muted-foreground italic break-words">{expense.notes}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between sm:justify-start sm:gap-4 sm:ml-4">
                                                    <p className="font-semibold text-lg">₹{expense.amount.toFixed(2)}</p>
                                                    {expense.splitType !== 'payment' && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-8 sm:w-8 shrink-0">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="min-w-[140px]">
                                                                <DropdownMenuItem onSelect={() => handleOpenEditDialog(expense)}>
                                                                    <Edit className="mr-2 h-4 w-4" />
                                                                    <span>Edit</span>
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleDeleteClick({type: 'expense', id: expense.id, name: expense.description})} className="text-destructive focus:text-destructive">
                                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                                    <span>Delete</span>
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                            </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            ))}
                        </div>
                        
                        {totalExpensePages > 1 && (
                            <div className="mt-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 pagination-scroll">
                                <Pagination className="min-w-max mx-0 justify-start">
                                    <PaginationContent className="flex-nowrap">
                                    <PaginationItem>
                                        <PaginationPrevious 
                                            href="#" 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (currentExpensePage > 1) handleExpensePageChange(currentExpensePage - 1);
                                            }}
                                            className={currentExpensePage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    
                                    {Array.from({ length: Math.min(5, totalExpensePages) }, (_, i) => {
                                        let page;
                                        if (totalExpensePages <= 5) {
                                            page = i + 1;
                                        } else if (currentExpensePage <= 3) {
                                            page = i + 1;
                                        } else if (currentExpensePage >= totalExpensePages - 2) {
                                            page = totalExpensePages - 4 + i;
                                        } else {
                                            page = currentExpensePage - 2 + i;
                                        }
                                        return page;
                                    }).map((page) => (
                                        <PaginationItem key={page}>
                                            <PaginationLink
                                                href="#"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    handleExpensePageChange(page);
                                                }}
                                                isActive={currentExpensePage === page}
                                                className="cursor-pointer"
                                            >
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    
                                    <PaginationItem>
                                        <PaginationNext 
                                            href="#" 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                if (currentExpensePage < totalExpensePages) handleExpensePageChange(currentExpensePage + 1);
                                            }}
                                            className={currentExpensePage >= totalExpensePages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                                        />
                                    </PaginationItem>
                                    </PaginationContent>
                                </Pagination>
                            </div>
                        )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-muted-foreground" />
                                Members
                            </CardTitle>
                            <CardDescription>{members.length} member{members.length > 1 && 's'}</CardDescription>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs">
                            <span className={memberDisplayMode === 'spent' ? 'text-foreground font-medium' : 'text-muted-foreground'}>Spent</span>
                            <Switch 
                                className="h-3.5 w-10"
                                checked={memberDisplayMode === 'incurred'}
                                onCheckedChange={(checked) => setMemberDisplayMode(checked ? 'incurred' : 'spent')}
                            />
                            <span className={memberDisplayMode === 'incurred' ? 'text-foreground font-medium' : 'text-muted-foreground'}>Incurred</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {members.map(member => {
                            const memberEmail = member.email || '';
                            const displayAmount = memberDisplayMode === 'spent' 
                                ? memberExpenditures[memberEmail] || 0
                                : memberIncurredExpenses[memberEmail] || 0;
                            const displayLabel = memberDisplayMode === 'spent' ? 'spent' : 'incurred';
                            
                            return (
                                <li key={member.id} className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <UserAvatar user={member} size="md" className="h-9 w-9" />
                                        <span className="font-medium text-sm">
                                          {member.email === user?.email ? 'You' : (member.name || member.email?.split('@')[0] || 'Unknown')}
                                        </span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-medium text-muted-foreground">
                                            ₹{formatAmount(displayAmount)}
                                        </span>
                                        <div className="text-xs text-muted-foreground">{displayLabel}</div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="cursor-pointer" onClick={() => setShowAnalytics(!showAnalytics)}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-muted-foreground" />
                            <CardTitle className="text-base">Analytics</CardTitle>
                        </div>
                        {showAnalytics ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </CardHeader>
                {showAnalytics && (
                    <CardContent className="space-y-4">
                        {groupAnalytics.expenseCount === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No expenses to analyze yet.</p>
                        ) : (
                            <>
                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Total Expenses</p>
                                        <p className="text-lg font-semibold">₹{formatAmount(groupAnalytics.totalExpenses)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Top Spend Amount</p>
                                        <p className="text-lg font-semibold">₹{formatAmount(groupAnalytics.topExpense?.amount || 0)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Top Spend Name</p>
                                        <p className="text-lg font-semibold">{groupAnalytics.topExpense?.name && groupAnalytics.topExpense.name.length > 12 ? groupAnalytics.topExpense.name.substring(0, 12) + '...' : (groupAnalytics.topExpense?.name || 'N/A')}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-xs text-muted-foreground">Top Spender</p>
                                        <div className="flex items-center gap-1">
                                            <Crown className="h-3 w-3 text-yellow-500" />
                                            <p className="text-sm font-medium">{groupAnalytics.topSpender?.name || 'N/A'}</p>
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                {/* Category Breakdown */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                                        <h4 className="text-sm font-medium">Spending by Category</h4>
                                    </div>
                                    {Object.entries(groupAnalytics.categoryBreakdown)
                                        .sort(([,a], [,b]) => b - a)
                                        .slice(0, 5)
                                        .map(([category, amount]) => {
                                            const percentage = (amount / groupAnalytics.totalExpenses) * 100;
                                            const categoryInfo = getCategoryByValue(category);
                                            return (
                                                <div key={category} className="space-y-1">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <span>{categoryInfo.icon}</span>
                                                            <span>{categoryInfo.label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-muted-foreground">₹{formatAmount(amount)}</span>
                                                            <span className="text-xs text-muted-foreground">{percentage.toFixed(0)}%</span>
                                                        </div>
                                                    </div>
                                                    <Progress value={percentage} className="h-1.5" />
                                                </div>
                                            );
                                        })}
                                </div>

                                {/* Monthly Trends */}
                                {Object.keys(groupAnalytics.monthlyTrends).length > 1 && (
                                    <>
                                        <Separator />
                                        <div className="space-y-3">
                                            <h4 className="text-sm font-medium flex items-center gap-2">
                                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                                Monthly Spending
                                            </h4>
                                            <div className="space-y-2">
                                                {Object.entries(groupAnalytics.monthlyTrends)
                                                    .filter(([month]) => month !== 'Unknown')
                                                    .sort(([a], [b]) => b.localeCompare(a))
                                                    .slice(0, 6)
                                                    .map(([month, amount]) => {
                                                        const maxAmount = Math.max(...Object.values(groupAnalytics.monthlyTrends));
                                                        const percentage = (amount / maxAmount) * 100;
                                                        const displayMonth = format(parseISO(month + '-01'), 'MMM yyyy');
                                                        return (
                                                            <div key={month} className="space-y-1">
                                                                <div className="flex justify-between text-sm">
                                                                    <span>{displayMonth}</span>
                                                                    <span className="text-muted-foreground">₹{formatAmount(amount)}</span>
                                                                </div>
                                                                <Progress value={percentage} className="h-1.5" />
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </CardContent>
                )}
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle>Group Balances</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex justify-between text-green-600">
                        <span>You are owed:</span>
                        <span className="font-bold">₹{groupBalances.youAreOwed.toFixed(2)}</span>
                    </div>
                     <div className="flex justify-between text-red-600">
                        <span>You owe:</span>
                        <span className="font-bold">₹{groupBalances.youOwe.toFixed(2)}</span>
                    </div>
                    <Separator />
                     <div className="flex justify-between font-semibold">
                        <span>Net Balance:</span>
                        <span className={groupBalances.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {groupBalances.netBalance >= 0 ? `+₹${groupBalances.netBalance.toFixed(2)}` : `-₹${Math.abs(groupBalances.netBalance).toFixed(2)}`}
                        </span>
                    </div>
                    <Button className="w-full mt-2" disabled={isSettleUpDisabled} onClick={() => setIsSettleUpOpen(true)}>Settle Up</Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </div>
    <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    {itemToDelete?.type} "{itemToDelete?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive hover:bg-destructive/90">
                    Delete
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <ImportExportDialog
        isOpen={isImportExportOpen}
        setIsOpen={setIsImportExportOpen}
        groupId={groupId}
        groupName={group?.name || 'Group'}
        currentUserEmail={user?.email || ''}
        expenses={expenses.map(expense => ({
          ...expense,
          createdAt: expense.createdAt?.toDate?.() || new Date(expense.createdAt),
        }))}
        onImportSuccess={handleImportExpenses}
    />
    </>
  );
}
