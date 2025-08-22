
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { X } from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  addDoc,
  collection,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore';


const formSchema = z.object({
  name: z.string().min(1, 'Group name is required.'),
  members: z.array(z.string().email()).min(1, 'At least one member is required.'),
});

export default function CreateGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      members: [],
    },
  });

  useEffect(() => {
    if (user?.email && !memberEmails.includes(user.email)) {
        setMemberEmails([user.email]);
    }
  }, [user, memberEmails]);

  useEffect(() => {
    form.setValue('members', memberEmails);
  }, [memberEmails, form]);


  const handleAddMember = () => {
    if (emailInput && !memberEmails.includes(emailInput)) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
        toast({
          variant: 'destructive',
          title: 'Invalid Email',
          description: 'Please enter a valid email address.',
        });
        return;
      }
      setMemberEmails([...memberEmails, emailInput]);
      setEmailInput('');
    }
  };

  const handleRemoveMember = (emailToRemove: string) => {
    if (emailToRemove === user?.email) {
        toast({
            variant: 'destructive',
            title: 'Cannot remove yourself',
            description: 'You are the group creator and cannot be removed.',
        });
        return;
    }
    setMemberEmails(memberEmails.filter((email) => email !== emailToRemove));
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.uid) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const unregisteredMembers = [];
      const usersQuery = query(collection(db, 'users'), where('email', 'in', values.members));
      const usersSnapshot = await getDocs(usersQuery);
      const registeredEmails = usersSnapshot.docs.map(doc => doc.data().email);
      const registeredUids = usersSnapshot.docs.map(doc => doc.id);
      
      for (const member of values.members) {
        if (!registeredEmails.includes(member)) {
          unregisteredMembers.push(member);
        }
      }

      if (unregisteredMembers.length > 0) {
        toast({
          variant: 'destructive',
          title: 'Unregistered Members',
          description: `The following members are not registered: ${unregisteredMembers.join(', ')}. Please ask them to register first.`,
        });
        setIsSubmitting(false);
        return;
      }
      
      if (!registeredUids.includes(user.uid)) {
        registeredUids.push(user.uid);
      }
      
      await addDoc(collection(db, 'groups'), {
        name: values.name,
        name_lowercase: values.name.toLowerCase(), 
        members: registeredUids,
        memberEmails: values.members,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({
          title: 'Group created!',
          description: 'Your new group has been successfully created.',
      });
      router.push('/groups');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Uh oh! Something went wrong.',
        description: `An error occurred: ${error.message}`,
      });
    } finally {
        setIsSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create a New Group</CardTitle>
        <CardDescription>
          Name your group and invite friends to start splitting bills.
        </CardDescription>
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
                    <Input placeholder="e.g., Goa Trip or Apartment Mates" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
                <FormLabel>Invite Members</FormLabel>
                <div className="flex gap-2">
                    <Input
                        type="email"
                        placeholder="Enter friend's email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddMember(); }}}
                    />
                    <Button type="button" onClick={handleAddMember}>Add</Button>
                </div>
                <FormDescription>
                    Add registered users to your group. You are automatically included.
                </FormDescription>
                 <FormMessage>
                    {form.formState.errors.members?.message}
                  </FormMessage>

                <div className="space-y-2 pt-2">
                    {memberEmails.map(email => (
                        <div key={email} className="flex items-center justify-between bg-muted p-2 rounded-md text-sm">
                           <span>{email}</span>
                           <Button
                             type="button"
                             variant="ghost"
                             size="icon"
                             className="h-6 w-6"
                             onClick={() => handleRemoveMember(email)}
                             disabled={email === user?.email}
                           >
                            <X className="h-4 w-4" />
                           </Button>
                        </div>
                    ))}
                </div>
            </FormItem>

            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Group...' : 'Create Group'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
