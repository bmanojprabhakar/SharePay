'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail } from 'lucide-react';
import Link from 'next/link';
import { PasswordInput } from '@/components/password-input';
import { Separator } from '@/components/ui/separator';
import {
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { AUTH_CONFIG } from '@/lib/auth-config';

function GoogleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18">
      <title>Google</title>
      <path
        fill="#4285F4"
        d="M17.64,9.20455c0-.63864-.05727-1.25455-.16818-1.84091H9v3.48182h4.84364c-.20864,1.125-.84182,2.07818-1.79591,2.71636v2.25818h2.90864C16.99955,14.19682,17.64,11.9,17.64,9.20455Z"
      />
      <path
        fill="#34A853"
        d="M9,18c2.43,0,4.46727-.80545,5.95636-2.18182l-2.90864-2.25818c-.80545,.54-1.83727,.86182-2.93318,.86182-2.27182,0-4.18773-1.52727-4.88773-3.57273H1.07182v2.33182C2.55182,16.29955,5.52182,18,9,18Z"
      />
      <path
        fill="#FBBC05"
        d="M4.11227,10.795c-.14-.42-.22-0.88-.22-1.35s0.08-0.93,0.22-1.35V5.76318H1.07182C0.38591,7.1,0,8.2,0,9.45s0.38591,2.35,1.07182,3.68182L4.11227,10.795Z"
      />
      <path
        fill="#EA4335"
        d="M9,3.54545c1.32182,0,2.50773,.45455,3.44091,1.34591L15.32182,2.18C13.83273,0.81955,11.55,0,9,0,5.52182,0,2.55182,1.70045,1.07182,4.41818L4.11227,6.75C4.81227,4.70455,6.72818,3.54545,9,3.54545Z"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Check if email is verified (unless in development mode)
      const shouldSkipVerification = AUTH_CONFIG.shouldSkipVerification(email);
      if (!user.emailVerified && !shouldSkipVerification) {
        toast({
          variant: 'destructive',
          title: 'Email not verified',
          description: 'Please verify your email before signing in.',
        });
        router.push('/verify-email');
        return;
      }
      
      router.push('/dashboard');
    } catch (error: any) {
      let errorMessage = error.message;
      
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email address.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Sign in failed',
        description: errorMessage,
      });
    }
  };

  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    
    try {
      auth.useDeviceLanguage();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      
      // Google accounts are automatically verified
      // But check just in case
      if (!user.emailVerified) {
        toast({
          variant: 'destructive',
          title: 'Email not verified',
          description: 'Please verify your email before continuing.',
        });
        router.push('/verify-email');
        return;
      }
      
      router.push('/dashboard');
    } catch (error: any) {
      let errorMessage = error.message;
      
      if (error.code === 'auth/popup-closed-by-user') {
        errorMessage = 'Sign in was cancelled.';
      } else if (error.code === 'auth/popup-blocked') {
        errorMessage = 'Popup was blocked. Please allow popups and try again.';
      }
      
      toast({
        variant: 'destructive',
        title: 'Google sign in failed',
        description: errorMessage,
      });
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSignIn}>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <PasswordInput
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </div>
        </form>
        <Separator className="my-6" />
        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
          <GoogleIcon />
          Sign in with Google
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{' '}
          <Link
            href="/register"
            className="font-medium text-primary hover:underline"
          >
            Sign Up
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
