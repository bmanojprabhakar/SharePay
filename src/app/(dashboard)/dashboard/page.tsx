
'use client';

import { UserAvatar } from '@/components/user-avatar';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Plus, Users, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { db, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SelectGroupDialog } from '@/components/select-group-dialog';
import { getCategoryByValue } from '@/lib/expense-categories';
import { InviteDialog } from '@/components/invite-dialog';


interface Expense {
  id: string;
  description: string;
  amount: number;
  category?: string;
  notes?: string;
  payers: { [email: string]: number };
  splitBetween: string[];
  splitType: 'equal' | 'unequal';
  splitDetails?: { [email: string]: number };
  createdAt?: { toDate: () => Date };
  createdBy: string;
  groupName?: string;
}

interface Balances {
  totalBalance: number;
  youOwe: number;
  youAreOwed: number;
}

interface Group {
  id: string;
  name: string;
  memberEmails: string[];
  members: string[];
}


export default function DashboardPage() {
  const [user, loadingUser] = useAuthState(auth);
  const [balances, setBalances] = useState<Balances>({ totalBalance: 0, youOwe: 0, youAreOwed: 0 });
  const [recentActivity, setRecentActivity] = useState<Expense[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<string[]>([]);
  const [friendsDetails, setFriendsDetails] = useState<{[email: string]: {name?: string}}>({});
  const [allUserDetails, setAllUserDetails] = useState<{[email: string]: {name?: string}}>({});
  const [loadingData, setLoadingData] = useState(true);
  const [isSelectGroupOpen, setIsSelectGroupOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);

  useEffect(() => {
    if (loadingUser) return;
    if (!user) {
      setLoadingData(false);
      return;
    }

    const fetchData = async () => {
      setLoadingData(true);
      try {
        // Fetch groups the user is part of using their UID
        const groupsQuery = query(collection(db, 'groups'), where('members', 'array-contains', user.uid));
        const groupsSnapshot = await getDocs(groupsQuery);
        const userGroups = groupsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Group));
        setGroups(userGroups);

        let allExpenses: Expense[] = [];
        let allMemberEmails = new Set<string>();

        for (const group of userGroups) {
          group.memberEmails.forEach(email => allMemberEmails.add(email));
          const expensesQuery = query(collection(db, 'groups', group.id, 'expenses'), orderBy('createdAt', 'desc'), limit(10));
          const expensesSnapshot = await getDocs(expensesQuery);
          const groupExpenses = expensesSnapshot.docs.map(doc => ({
            id: doc.id,
            groupName: group.name,
            ...doc.data()
          } as Expense));
          allExpenses = [...allExpenses, ...groupExpenses];
        }

        allExpenses.sort((a, b) => (b.createdAt?.toDate()?.getTime() || 0) - (a.createdAt?.toDate()?.getTime() || 0));
        setRecentActivity(allExpenses.slice(0, 5));

        if (user.email) {
          let totalOwedToYou = 0;
          let totalYouOwe = 0;

          allExpenses.forEach(expense => {
            if (!expense.payers || !expense.splitBetween) return;

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

          setBalances({
            youOwe: totalYouOwe,
            youAreOwed: totalOwedToYou,
            totalBalance: totalOwedToYou - totalYouOwe,
          });
        }
        if (user.email) {
          allMemberEmails.delete(user.email);
        }
        const friendsEmails = Array.from(allMemberEmails).slice(0, 5);
        setFriends(friendsEmails);
        
        // Collect all unique emails from recent activity payers as well
        const allUniqueEmails = new Set<string>(allMemberEmails);
        allExpenses.forEach(expense => {
          Object.keys(expense.payers || {}).forEach(payerEmail => {
            allUniqueEmails.add(payerEmail);
          });
        });
        
        // Remove current user's email
        if (user.email) {
          allUniqueEmails.delete(user.email);
        }
        
        // Fetch details for all users
        const fetchAllUserDetails = async () => {
          const details: {[email: string]: {name?: string}} = {};
          await Promise.all(Array.from(allUniqueEmails).map(async (email: string) => {
            try {
              const userQuery = query(collection(db, 'users'), where('email', '==', email));
              const userSnapshot = await getDocs(userQuery);
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                details[email] = { name: userData.name };
              }
            } catch (error) {
              console.error(`Error fetching details for ${email}:`, error);
            }
          }));
          setAllUserDetails(details);
          // Also set friends details as a subset
          const friendsDetailsSubset: {[email: string]: {name?: string}} = {};
          friendsEmails.forEach(email => {
            friendsDetailsSubset[email] = details[email] || {};
          });
          setFriendsDetails(friendsDetailsSubset);
        };
        
        fetchAllUserDetails();

      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, [user, loadingUser]);

  const getPayerDescription = (payers: { [email: string]: number }): string => {
    if (!payers) return 'no one';
    const payerEmails = Object.keys(payers);
    if (payerEmails.length === 0) return 'no one';

    if (payerEmails.length === 1) {
      const payerEmail = payerEmails[0];
      const isYou = payerEmail === user?.email;
      if (isYou) {
        return 'You';
      } else {
        const payerName = allUserDetails[payerEmail]?.name || payerEmail.split('@')[0];
        return payerName;
      }
    }
    
    const firstPayerEmail = payerEmails[0];
    const firstPayerName = allUserDetails[firstPayerEmail]?.name || firstPayerEmail.split('@')[0];
    return `${firstPayerName} and ${payerEmails.length - 1} others`;
  };

  const getActivityDescription = (activity: Expense): string => {
    const payerDesc = getPayerDescription(activity.payers);
    if (payerDesc === 'You') {
      return `You paid ₹${activity.amount.toFixed(2)} for "${activity.description}" in ${activity.groupName}`;
    } else {
      const amountYouPaid = activity.payers?.[user?.email ?? ''] ?? 0;
      if (amountYouPaid > 0) {
        return `${payerDesc} paid ₹${activity.amount.toFixed(2)} (you paid ₹${amountYouPaid.toFixed(2)}) for "${activity.description}" in ${activity.groupName}`;
      } else {
        return `${payerDesc} paid ₹${activity.amount.toFixed(2)} for "${activity.description}" in ${activity.groupName}`;
      }
    }
  };


  if (loadingUser || loadingData) {
    return <p>Loading dashboard...</p>
  }

  return (
    <TooltipProvider>
      <SelectGroupDialog isOpen={isSelectGroupOpen} setIsOpen={setIsSelectGroupOpen} groups={groups} />
      <InviteDialog isOpen={isInviteOpen} setIsOpen={setIsInviteOpen} />
      <div className="flex flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold md:text-3xl">Dashboard</h1>
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="inline-block">
                  <Button onClick={() => setIsSelectGroupOpen(true)} disabled={groups.length === 0}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </div>
              </TooltipTrigger>
              {groups.length === 0 && (
                <TooltipContent>
                  <p>You must join or create a group to add an expense.</p>
                </TooltipContent>
              )}
            </Tooltip>
            <Button 
              variant="outline" 
              onClick={() => setIsInviteOpen(true)}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Friends
            </Button>
            <Button variant="outline" asChild>
              <Link href="/groups/create">Create Group</Link>
            </Button>
          </div>
        </header>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold ${balances.totalBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {balances.totalBalance >= 0 ? `+₹${balances.totalBalance.toFixed(2)}` : `-₹${Math.abs(balances.totalBalance).toFixed(2)}`}
              </div>
              <p className="text-xs text-muted-foreground">
                {balances.totalBalance >= 0 ? 'You are owed overall' : 'You owe overall'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                You Owe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">₹{balances.youOwe.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Across all groups</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                You Are Owed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">₹{balances.youAreOwed.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Across all groups</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivity.length > 0 ? (
                  <ul className="space-y-4">
                    {recentActivity.map((activity) => {
                      const category = getCategoryByValue(activity.category || 'others');
                      return (
                        <li key={activity.id} className="flex items-center gap-4">
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted border">
                            <span className="text-lg">{category.icon}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">{activity.description}</p>
                              <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                {category.label}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {getActivityDescription(activity)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.createdAt ? formatDistanceToNow(activity.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No recent activity to show.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-8">
            <Card>
              <CardHeader className='flex-row items-center justify-between'>
                <CardTitle>Groups</CardTitle>
                <Button asChild variant='link' className='-mr-4'>
                  <Link href="/groups">View all</Link>
                </Button>
              </CardHeader>
              <CardContent>
                {groups.length > 0 ? (
                  <ul className="space-y-4">
                    {groups.slice(0, 5).map((group) => (
                      <li key={group.id} className="flex items-center justify-between">
                        <Link href={`/groups/${group.id}`} className="flex items-center gap-4 hover:underline">
                          <div className="p-3 bg-muted rounded-md">
                            <Users className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium">{group.name}</p>
                            <p className="text-sm text-muted-foreground">{group.memberEmails.length} members</p>
                          </div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">No groups yet.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className='flex-row items-center justify-between'>
                <CardTitle>Friends</CardTitle>
                <Button variant='link' className='-mr-4' disabled>View all</Button>
              </CardHeader>
              <CardContent>
                {friends.length > 0 ? (
                  <ul className="space-y-4">
                    {friends.map((friendEmail, index) => (
                      <li key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <UserAvatar
                            user={{ 
                              email: friendEmail,
                              name: friendsDetails[friendEmail]?.name,
                              displayName: friendsDetails[friendEmail]?.name
                            }}
                            size="md"
                            className="h-10 w-10"
                          />
                          <p className="font-medium">{friendsDetails[friendEmail]?.name || friendEmail.split('@')[0]}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">No friends added yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
