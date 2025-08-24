
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, DocumentData, deleteDoc, doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { Plus, ArrowRight, MoreVertical, Edit, Trash2, Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
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
} from "@/components/ui/alert-dialog"
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { getUserFriendlyErrorMessage, getErrorTitle } from '@/utils/error-messages';
import { formatAmount } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Input } from '@/components/ui/input';

interface Balances {
    youOwe: number;
    youAreOwed: number;
}

export default function GroupsPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [groups, setGroups] = useState<DocumentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<DocumentData | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [balances, setBalances] = useState<{[key: string]: Balances}>({});
  const [totalExpenditures, setTotalExpenditures] = useState<{[key: string]: number}>({});
  const [currentPage, setCurrentPage] = useState(1);
  const groupsPerPage = 6;
  const [searchTerm, setSearchTerm] = useState('');

  const calculateBalances = useCallback((expenses: DocumentData[], userEmail: string): Balances => {
    let totalOwedToYou = 0;
    let totalYouOwe = 0;

    expenses.forEach(expense => {
      if (!expense.payers) return;
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

    return { youOwe: totalYouOwe, youAreOwed: totalOwedToYou };
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
    const unsubscribeGroups = onSnapshot(q, (querySnapshot) => {
        const groupsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setGroups(groupsData);
        setLoading(false);
    }, (error) => {
        toast({
            variant: 'destructive',
            title: 'Error fetching data',
            description: 'Could not fetch groups.'
        });
        setLoading(false);
    });

    return () => unsubscribeGroups();

  }, [user, toast]);

  useEffect(() => {
    if (!user?.email || groups.length === 0) return;

    const unsubscribers: Unsubscribe[] = [];
    const newBalances: {[key: string]: Balances} = {};
    const newTotalExpenditures: {[key: string]: number} = {};

    groups.forEach(group => {
      const expensesQuery = query(collection(db, 'groups', group.id, 'expenses'));
      const unsubscribe = onSnapshot(expensesQuery, (expensesSnapshot) => {
        const expensesData = expensesSnapshot.docs.map(doc => doc.data());
        if (user.email) {
          newBalances[group.id] = calculateBalances(expensesData, user.email);
          
          // Calculate total expenditure for this group
          const totalExpenditure = expensesData
            .filter(expense => expense.splitType !== 'payment') // Exclude payments from total
            .reduce((sum, expense) => sum + (expense.amount || 0), 0);
          newTotalExpenditures[group.id] = totalExpenditure;
          
          setBalances({...newBalances});
          setTotalExpenditures({...newTotalExpenditures});
        }
      });
      unsubscribers.push(unsubscribe);
    });
    
    return () => unsubscribers.forEach(unsub => unsub());

  }, [groups, user, calculateBalances]);


  const handleDeleteClick = (group: DocumentData) => {
    setGroupToDelete(group);
    setShowDeleteAlert(true);
  };

  const handleConfirmDelete = async () => {
    if (!groupToDelete) return;

    try {
        await deleteDoc(doc(db, 'groups', groupToDelete.id));
        toast({
            title: 'Group Deleted',
            description: `Group "${groupToDelete.name}" has been deleted.`,
        });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: getErrorTitle('delete'),
            description: getUserFriendlyErrorMessage(error),
        });
    } finally {
        setShowDeleteAlert(false);
        setGroupToDelete(null);
    }
  };


  // Filter groups based on search term
  const filteredGroups = groups.filter(group => 
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.memberEmails?.some((email: string) => 
      email.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredGroups.length / groupsPerPage);
  const startIndex = (currentPage - 1) * groupsPerPage;
  const endIndex = startIndex + groupsPerPage;
  const currentGroups = filteredGroups.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  if (loadingUser || loading) {
    return <div>Loading groups...</div>;
  }

  return (
    <>
    <div className="flex flex-col gap-8">
      <header className="space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h1 className="text-2xl font-semibold md:text-3xl">Groups</h1>
          <Button asChild>
            <Link href="/groups/create">
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Link>
          </Button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
        </div>
      </header>
      
      {groups.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No groups yet</CardTitle>
            <CardDescription>Get started by creating a new group.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/groups/create">
                <Plus className="mr-2 h-4 w-4" />
                Create Group
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : filteredGroups.length === 0 ? (
        <Card className="text-center py-12">
          <CardHeader>
            <CardTitle>No groups found</CardTitle>
            <CardDescription>No groups match your search criteria. Try adjusting your search term.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => handleSearchChange('')}>
              Clear Search
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {currentGroups.map((group) => (
            <Card key={group.id} className="hover:shadow-lg transition-shadow h-full flex flex-col">
              <CardHeader className="flex-row items-start justify-between">
                <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>
                            <Link href={`/groups/${group.id}`} className="hover:underline">
                                {group.name}
                            </Link>
                        </CardTitle>
                        <CardDescription>
                            {group.memberEmails?.length || 0} member{group.memberEmails?.length !== 1 && 's'}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200 ml-2 shrink-0">
                        ₹{formatAmount(totalExpenditures[group.id] || 0)}
                      </Badge>
                    </div>
                </div>
                 {user?.uid === group.createdBy && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 -mt-2 -mr-2">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                             <DropdownMenuItem onSelect={() => router.push(`/groups/${group.id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleDeleteClick(group)} className="text-destructive focus:text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                 )}
              </CardHeader>
              <CardContent className="flex-grow flex items-end justify-between">
                <div>
                  <p className="text-sm text-green-500">You are owed: ₹{balances[group.id]?.youAreOwed.toFixed(2) || '0.00'}</p>
                  <p className="text-sm text-red-500">You owe: ₹{balances[group.id]?.youOwe.toFixed(2) || '0.00'}</p>
                </div>
                <Link href={`/groups/${group.id}`}>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {totalPages > 1 && (
          <Pagination className="mt-8">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  href="#" 
                  onClick={(e) => {
                    e.preventDefault();
                    if (currentPage > 1) handlePageChange(currentPage - 1);
                  }}
                  className={currentPage <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page);
                    }}
                    isActive={currentPage === page}
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
                    if (currentPage < totalPages) handlePageChange(currentPage + 1);
                  }}
                  className={currentPage >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
        </>
      )}
    </div>
    <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the
                    group "{groupToDelete?.name}" and all of its expenses.
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
    </>
  );
}
