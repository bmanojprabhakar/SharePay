'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@sharepay/shared';
// import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Mail, Send, Copy, Check, AtSign } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const inviteFormSchema = z.object({
  emails: z.string().min(1, 'At least one email is required.'),
  message: z.string().optional(),
});

interface InviteDialogProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export function InviteDialog({ isOpen, setIsOpen }: InviteDialogProps) {
  const [user] = useAuthState(auth);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const form = useForm<z.infer<typeof inviteFormSchema>>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      emails: '',
      message: `Hi! I've been using SharePay to split expenses with friends and it's been really convenient. Would you like to join me? It makes managing shared costs so much easier!`,
    },
  });

  const generateInviteLink = () => {
    const baseUrl = window.location.origin;
    const inviteCode = btoa(`${user?.uid}-${Date.now()}`);
    return `${baseUrl}/register?invite=${inviteCode}&from=${encodeURIComponent(user?.email || '')}`;
  };

  const copyInviteLink = async () => {
    const link = generateInviteLink();
    setInviteLink(link);
    
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      toast({
        title: 'Link copied!',
        description: 'Invite link has been copied to your clipboard.',
      });
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to copy',
        description: 'Please copy the link manually.',
      });
    }
  };

  const handleEmailInvite = () => {
    const values = form.getValues();
    if (!user || !values.emails) return;

    const emailList = values.emails
      .split(/[,\\s\\n]+/)
      .map(email => email.trim())
      .filter(email => email && email.includes('@'));

    if (emailList.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid emails',
        description: 'Please enter at least one valid email address.',
      });
      return;
    }

    const inviteLink = generateInviteLink();
    const subject = `🎉 You're invited to SharePay!`;
    const body = `Hi!\n\n${user?.email} invited you to join SharePay - an easy way to split expenses with friends!\n\n${values.message || 'Join me on SharePay to make splitting bills simple and fair.'}\n\nClick here to get started: ${inviteLink}\n\nBest regards,\nSharePay Team`;

    // Open email client for each recipient
    emailList.forEach((email, index) => {
      setTimeout(() => {
        window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
      }, index * 500); // Delay to prevent browser blocking
    });

    toast({
      title: 'Email clients opened!',
      description: `Opened email composer for ${emailList.length} recipient${emailList.length > 1 ? 's' : ''}.`,
    });
  };

  const onSubmit = async (values: z.infer<typeof inviteFormSchema>) => {
    if (!user) return;

    setIsLoading(true);

    try {
      // Parse emails (support comma-separated, space-separated, or newline-separated)
      const emailList = values.emails
        .split(/[,\\s\\n]+/)
        .map(email => email.trim())
        .filter(email => email && email.includes('@'));

      if (emailList.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Invalid emails',
          description: 'Please enter at least one valid email address.',
        });
        setIsLoading(false);
        return;
      }

      const inviteLink = generateInviteLink();
      
      // For now, we'll just generate the invite link without storing in Firestore
      // In a production app, you would:
      // 1. Send actual emails via a service like SendGrid, Mailgun, etc.
      // 2. Store invite records in your database
      // 3. Track invite acceptance rates
      
      setInviteSent(true);
      setInviteLink(inviteLink);
      
      toast({
        title: 'Invite link created!',
        description: `Share this link with ${emailList.length} friend${emailList.length > 1 ? 's' : ''} to invite them.`,
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to create invite',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setInviteSent(false);
    setInviteLink('');
    setLinkCopied(false);
    form.reset();
  };

  if (inviteSent) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              Invites Created!
            </DialogTitle>
            <DialogDescription>
              Your invites have been created. Share this link with your friends to get them started.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Input
                value={inviteLink}
                readOnly
                className="flex-1"
              />
              <Button onClick={copyInviteLink} size="sm">
                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground space-y-2">
              <p>💡 <strong>Pro tip:</strong> Share this link via WhatsApp, text message, or any other way you prefer!</p>
              <p>🎯 <strong>How it works:</strong> When someone clicks this link, they'll see that you invited them and can register directly!</p>
            </div>
            
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" />
            Invite Friends
          </DialogTitle>
          <DialogDescription>
            Invite your friends to join SharePay and start splitting expenses together!
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Addresses</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Enter email addresses separated by commas or new lines&#10;e.g., friend1@example.com, friend2@example.com"
                      rows={3}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Add a personal touch to your invitation..."
                      rows={3}
                      className="resize-none"
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={copyInviteLink} className="flex-1">
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
              <Button type="button" variant="outline" onClick={handleEmailInvite} className="flex-1">
                <AtSign className="mr-2 h-4 w-4" />
                Send Emails
              </Button>
            </div>
            <Button type="submit" disabled={isLoading} className="w-full">
              <Send className="mr-2 h-4 w-4" />
              {isLoading ? 'Creating...' : 'Get Invite Link'}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}