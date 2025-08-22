
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
import { Plus, Users, ArrowLeft, MoreVertical, Edit, Trash2, FileText, MessageSquare } from 'lucide-react';
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

interface Member {
    id: string;
    email?: string;
    photoURL?: string;
}

interface Expense {
    id:string;
    description: string;
    amount: number;
    category?: string;
    notes?: string;
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
  const { toast } = useToast();

  // Import handler for CSV expenses
  const handleImportExpenses = async (firestoreExpenses: any[]) => {
    try {
      const expensesCollection = firestoreCollection(db, 'groups', groupId, 'expenses');
      
      // Add each expense to Firestore
      for (const expense of firestoreExpenses) {
        await addDoc(expensesCollection, {
          ...expense,
          createdAt: expense.createdAt || new Date(),
        });
      }

      toast({
        title: 'Import successful',
        description: `Successfully imported ${firestoreExpenses.length} expense${firestoreExpenses.length !== 1 ? 's' : ''}.`,
      });
    } catch (error) {
      console.error('Error importing expenses:', error);
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description: 'Failed to import expenses. Please try again.',
      });
      throw error;
    }
  };

  useEffect(() => {
    if (!user || !groupId) return;

    const groupDocRef = doc(db, 'groups', groupId);
    const unsubscribeGroup = onSnapshot(groupDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const groupData = { id: docSnap.id, ...docSnap.data() };
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
                    name: userData.name || null,
                    displayName: userData.name || null, // For UserAvatar compatibility
                  };
                } else {
                  // Fallback for users without documents
                  return {
                    id: email,
                    email: email,
                    name: null,
                    displayName: null,
                  };
                }
              } catch (error) {
                console.error(`Error fetching user data for ${email}:`, error);
                return {
                  id: email,
                  email: email,
                  name: null,
                  displayName: null,
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
        console.error("Error listening to group changes:", error);
        toast({ variant: 'destructive', title: 'Error', description: 'Could not load group data.' });
        setLoading(false);
        router.push('/groups');
    });

    const expensesQuery = query(collection(db, 'groups', groupId, 'expenses'), orderBy('createdAt', 'desc'));
    const unsubscribeExpenses = onSnapshot(expensesQuery, (querySnapshot) => {
        const expensesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
        setExpenses(expensesData);
    }, (error) => {
        console.error("Error listening to expenses:", error);
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
        } else {
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
            return memberData?.name || payerEmail.split('@')[0];
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
    <div className="flex flex-col gap-8">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/groups')}>
                <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-semibold md:text-3xl">{group.name}</h1>
        </div>
        <div className="flex items-center gap-2">
            <Button onClick={handleOpenAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
            </Button>
            <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Import/Export
            </Button>
            {isCreator && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
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
      
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
            <Card>
                <CardHeader>
                    <CardTitle>Expenses</CardTitle>
                </CardHeader>
                <CardContent>
                    {expenses.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-muted-foreground">No expenses yet.</p>
                            <p className="text-muted-foreground">Click "Add Expense" to get started.</p>
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {expenses.map(expense => {
                                const category = getCategoryByValue(expense.category || 'others');
                                return (
                                <li key={expense.id} className="flex items-start justify-between p-4 bg-muted/50 rounded-md">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-lg">{category.icon}</span>
                                            <p className="font-medium">{expense.description}</p>
                                            <span className="text-xs px-2 py-1 bg-muted rounded-full text-muted-foreground">
                                                {category.label}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground mb-1">
                                          {expense.splitType === 'payment' ? 'Payment' : `Paid by ${getPayerDescription(expense.payers)} and split between ${expense.splitBetween.length} people`}
                                        </p>
                                        {expense.notes && (
                                            <div className="flex items-start gap-1 mt-2">
                                                <MessageSquare className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                                                <p className="text-xs text-muted-foreground italic">{expense.notes}</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 ml-4">
                                        <p className="font-semibold text-lg">₹{expense.amount.toFixed(2)}</p>
                                        {expense.splitType !== 'payment' && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
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
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="space-y-8">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        Group Members
                    </CardTitle>
                    <CardDescription>{members.length} member{members.length > 1 && 's'}</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-4">
                        {members.map(member => (
                            <li key={member.id} className="flex items-center gap-3">
                                <UserAvatar user={member} size="md" className="h-9 w-9" />
                                <span className="font-medium text-sm">
                                  {member.email === user?.email ? 'You' : (member.name || member.email.split('@')[0])}
                                </span>
                            </li>
                        ))}
                    </ul>
                </CardContent>
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
