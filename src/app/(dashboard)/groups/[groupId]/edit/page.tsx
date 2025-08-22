
'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyErrorMessage, getErrorTitle } from '@/utils/error-messages';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { auth, db } from '@/lib/firebase';
import { useRouter, useParams } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { X, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, arrayUnion, arrayRemove } from 'firebase/firestore';

const formSchema = z.object({
  name: z.string().min(1, 'Group name is required.'),
});

export default function EditGroupPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.groupId as string;
  const { toast } = useToast();
  const [user, loadingUser] = useAuthState(auth);
  const [group, setGroup] = useState<any>(null);
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [memberDetails, setMemberDetails] = useState<{[email: string]: {name?: string}}>({});
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  const fetchGroupData = useCallback(async () => {
    if (!user || !groupId) return;
    setIsLoading(true);
    const groupDocRef = doc(db, 'groups', groupId);
    try {
      const groupDocSnap = await getDoc(groupDocRef);
      if (groupDocSnap.exists()) {
        const groupData = groupDocSnap.data();
        if (!groupData.members.includes(user.uid)) {
          toast({
            variant: 'destructive',
            title: 'Unauthorized',
            description: 'You are not a member of this group.',
          });
          router.push(`/groups`);
          return;
        }
        setGroup(groupData);
        form.setValue('name', groupData.name);
        setMemberEmails(groupData.memberEmails || []);
        
        // Fetch member names
        const fetchMemberDetails = async () => {
          const details: {[email: string]: {name?: string}} = {};
          await Promise.all((groupData.memberEmails || []).map(async (email: string) => {
            try {
              const userQuery = query(collection(db, 'users'), where('email', '==', email));
              const userSnapshot = await getDocs(userQuery);
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data();
                details[email] = { name: userData.name };
              }
            } catch (error) {
              // Error handled silently
            }
          }));
          setMemberDetails(details);
        };
        
        fetchMemberDetails();
      } else {
        toast({
          variant: 'destructive',
          title: 'Not Found',
          description: 'This group does not exist.',
        });
        router.push('/groups');
      }
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load group data.',
      });
    } finally {
        setIsLoading(false);
    }
  }, [user, groupId, router, toast, form]);

  useEffect(() => {
    if(!loadingUser) {
        fetchGroupData();
    }
  }, [loadingUser, fetchGroupData]);

  const handleAddMember = async () => {
    if (!emailInput) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
        toast({ variant: 'destructive', title: 'Invalid Email' });
        return;
    }
    if (memberEmails.includes(emailInput)) {
        toast({ variant: 'destructive', title: 'Member already exists' });
        return;
    }

    try {
        // Check if user is registered
        const usersQuery = query(collection(db, 'users'), where('email', '==', emailInput));
        const usersSnapshot = await getDocs(usersQuery);

        if (usersSnapshot.empty) {
            toast({
                variant: 'destructive',
                title: 'Unregistered User',
                description: `User with email ${emailInput} is not registered. Please ask them to register first.`,
            });
            return;
        }
        
        const newMemberDoc = usersSnapshot.docs[0];

        const groupDocRef = doc(db, 'groups', groupId);
        await updateDoc(groupDocRef, {
            members: arrayUnion(newMemberDoc.id),
            memberEmails: arrayUnion(emailInput),
        });
        
        setMemberEmails([...memberEmails, emailInput]);
        // Update member details with the new member's info
        const userData = newMemberDoc.data();
        setMemberDetails(prev => ({
            ...prev,
            [emailInput]: { name: userData.name }
        }));
        setEmailInput('');
        toast({ title: 'Member Added', description: `${emailInput} has been added to the group.` });
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: getErrorTitle('group'),
            description: getUserFriendlyErrorMessage(error),
        });
    }
  };


  const handleRemoveMember = async (emailToRemove: string) => {
    if (emailToRemove === user?.email) {
      toast({ variant: 'destructive', title: 'Cannot remove yourself' });
      return;
    }
    
    // Find the user's UID to remove from the 'members' array
    const usersQuery = query(collection(db, 'users'), where('email', '==', emailToRemove));
    const usersSnapshot = await getDocs(usersQuery);

    if (usersSnapshot.empty) {
      toast({
          variant: 'destructive',
          title: 'User not found',
          description: `Could not find user with email ${emailToRemove}.`,
      });
      return;
    }

    const memberToRemoveDoc = usersSnapshot.docs[0];
    const memberUidToRemove = memberToRemoveDoc.id;

    try {
        const groupDocRef = doc(db, 'groups', groupId);
        await updateDoc(groupDocRef, {
            members: arrayRemove(memberUidToRemove),
            memberEmails: arrayRemove(emailToRemove),
        });

        setMemberEmails(memberEmails.filter((email) => email !== emailToRemove));
        toast({ title: 'Member Removed', description: `${emailToRemove} has been removed.` });
    } catch (error: any) {
         toast({
            variant: 'destructive',
            title: getErrorTitle('group'),
            description: getUserFriendlyErrorMessage(error),
        });
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const groupDocRef = doc(db, 'groups', groupId);
      await updateDoc(groupDocRef, {
        name: values.name,
        name_lowercase: values.name.toLowerCase(),
      });
      toast({
        title: 'Group updated!',
        description: 'Your group name has been successfully updated.',
      });
      router.push(`/groups/${groupId}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: getErrorTitle('group'),
        description: getUserFriendlyErrorMessage(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  if (isLoading || loadingUser) {
    return <p>Loading group information...</p>;
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center gap-4 mb-2">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle>Edit Group</CardTitle>
            <CardDescription>
              Update your group's name and members.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Goa Trip or Apartment Mates"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormLabel>Manage Members</FormLabel>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Enter friend's email to add"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddMember}>
                  Add
                </Button>
              </div>
              <FormDescription>
                Add or remove members from the group. Only registered users can be added.
              </FormDescription>

              <div className="space-y-2 pt-2">
                {memberEmails.map((email) => (
                  <div
                    key={email}
                    className="flex items-center justify-between bg-muted p-2 rounded-md text-sm"
                  >
                     <div className="flex flex-col">
                      <span>{email === user?.email ? 'You' : (memberDetails[email]?.name || email.split('@')[0])}</span>
                    </div>
                      {email !== user?.email && group?.createdBy === user?.uid && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleRemoveMember(email)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/groups/${groupId}`)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
