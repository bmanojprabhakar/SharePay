
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
import { auth, db } from '@sharepay/shared';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useState } from 'react';
import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';


const formSchema = z.object({
  name: z.string().min(1, 'Group name is required.'),
});

export default function CreateGroupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user || !user.uid || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
      });
      return;
    }
    
    setIsSubmitting(true);

    try {
      const newGroupRef = await addDoc(collection(db, 'groups'), {
        name: values.name,
        name_lowercase: values.name.toLowerCase(), 
        members: [user.uid],
        memberEmails: [user.email],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      });

      toast({
          title: 'Group created!',
          description: 'Now you can add members to your new group.',
      });
      router.push(`/groups/${newGroupRef.id}/edit`);
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
          Give your group a name. You can add members on the next screen.
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
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating Group...' : 'Create Group and Add Members'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
