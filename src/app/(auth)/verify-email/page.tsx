'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Mail, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { sendEmailVerification, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      setUserEmail(user.email || '');
      
      // If user is already verified, create user document and redirect
      if (user.emailVerified) {
        console.log('✅ User already verified, checking for user document...');
        
        // Get pending user data from localStorage
        const pendingUserDataStr = localStorage.getItem('pendingUserData');
        if (pendingUserDataStr) {
          try {
            const pendingUserData = JSON.parse(pendingUserDataStr);
            
            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
              name: pendingUserData.name,
              email: pendingUserData.email,
              countryCode: pendingUserData.countryCode,
              mobile: pendingUserData.mobile,
              emailVerified: true,
              createdAt: new Date().toISOString(),
              registeredAt: pendingUserData.registeredAt,
              invitedBy: pendingUserData.invitedBy,
              inviteCode: pendingUserData.inviteCode,
            });
            
            // Clear pending data
            localStorage.removeItem('pendingUserData');
            console.log('✅ User document created automatically and pending data cleared');
            
          } catch (error) {
            console.error('Error creating user document automatically:', error);
          }
        }
        
        router.push('/dashboard');
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleResendVerification = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/login');
      return;
    }

    setIsLoading(true);
    
    try {
      await sendEmailVerification(user);
      toast({
        title: 'Verification email sent!',
        description: 'Please check your email for the verification link.',
      });
    } catch (error: any) {
      let errorMessage = 'Failed to send verification email. Please try again.';
      
      if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please wait before trying again.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckVerification = async () => {
    const user = auth.currentUser;
    if (!user) {
      router.push('/login');
      return;
    }

    // Reload user to get latest verification status
    await user.reload();
    
    if (user.emailVerified) {
      console.log('✅ Email verified! Creating user document in Firestore...');
      
      // Get pending user data from localStorage
      const pendingUserDataStr = localStorage.getItem('pendingUserData');
      if (pendingUserDataStr) {
        try {
          const pendingUserData = JSON.parse(pendingUserDataStr);
          
          // Create user document in Firestore now that email is verified
          await setDoc(doc(db, 'users', user.uid), {
            name: pendingUserData.name,
            email: pendingUserData.email,
            countryCode: pendingUserData.countryCode,
            mobile: pendingUserData.mobile,
            emailVerified: true,
            createdAt: new Date().toISOString(),
            registeredAt: pendingUserData.registeredAt,
            invitedBy: pendingUserData.invitedBy,
            inviteCode: pendingUserData.inviteCode,
          });
          
          // Clear pending data
          localStorage.removeItem('pendingUserData');
          console.log('✅ User document created in Firestore and pending data cleared');
          
        } catch (error) {
          console.error('Error creating user document:', error);
          // Continue anyway - user is verified
        }
      } else {
        console.log('ℹ️ No pending user data found, user document may already exist');
      }
      
      toast({
        title: 'Email verified!',
        description: 'Your email has been successfully verified.',
      });
      router.push('/dashboard');
    } else {
      toast({
        variant: 'destructive',
        title: 'Not verified yet',
        description: 'Please check your email and click the verification link.',
      });
    }
  };

  const handleSignOut = async () => {
    try {
      // Clear any pending user data since user is giving up on verification
      localStorage.removeItem('pendingUserData');
      console.log('🗑️ Cleared pending user data on sign out');
      
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Mail className="h-12 w-12 text-blue-500" />
        <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
        <CardDescription>
          We've sent a verification link to <strong>{userEmail}</strong>. 
          Please check your email and click the link to verify your account.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={handleCheckVerification} className="w-full">
          <RefreshCw className="mr-2 h-4 w-4" />
          I've Verified My Email
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleResendVerification} 
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Resend Verification Email'}
        </Button>
        
        <div className="text-center text-sm text-muted-foreground">
          <p className="mb-2">Didn't receive the email? Check your spam folder.</p>
          <Button variant="link" onClick={handleSignOut} className="p-0 h-auto text-sm">
            Sign out and try with a different email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}