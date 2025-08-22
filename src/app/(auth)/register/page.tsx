
'use client';

import { Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import { Mail, Check, User } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PasswordInput } from '@/components/password-input';
import { PasswordRules, isPasswordValid } from '@/components/password-rules';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { AUTH_CONFIG } from '@/lib/auth-config';
import { doc, setDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { UserPlus, Gift } from 'lucide-react';

const formSchema = z
  .object({
    name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
    email: z.string().email({ message: 'Please enter a valid email.' }),
    countryCode: z.string(),
    mobile: z.string(),
    password: z
      .string()
      .refine((password) => isPasswordValid(password), {
        message: 'Password must meet all requirements above.',
      }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((data) => /^\d{10}$/.test(data.mobile) || data.mobile === '', {
    message: 'Mobile must be 10 digits.',
    path: ['mobile'],
  });

function RegisterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [inviteInfo, setInviteInfo] = useState<{from: string, code: string} | null>(null);
  const [forceEmailVerification, setForceEmailVerification] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      countryCode: '+91',
      mobile: '',
      password: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    const inviteCode = searchParams.get('invite');
    const fromEmail = searchParams.get('from');
    
    if (inviteCode && fromEmail) {
      setInviteInfo({ code: inviteCode, from: decodeURIComponent(fromEmail) });
      toast({
        title: '🎉 You\'ve been invited!',
        description: `${decodeURIComponent(fromEmail)} invited you to join SharePay!`,
      });
    }
  }, [searchParams, toast]);

  async function checkMobileExists(countryCode: string, mobile: string) {
    if (!mobile) return false;
    
    const mobileQuery = query(
      collection(db, 'users'),
      where('countryCode', '==', countryCode),
      where('mobile', '==', mobile)
    );
    
    const querySnapshot = await getDocs(mobileQuery);
    return !querySnapshot.empty;
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      console.log('🔄 Starting registration process for:', values.email);
      
      // Skip mobile check during registration - we'll handle duplicates after auth
      // Mobile number uniqueness will be enforced by Firestore unique constraints if needed

      console.log('🔐 Creating user with email and password...');
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );
      const user = userCredential.user;
      console.log('✅ User created successfully:', user.uid);

      const shouldSkipVerification = forceEmailVerification ? false : AUTH_CONFIG.shouldSkipVerification(values.email);

      // Send email verification only if not in development mode
      if (!shouldSkipVerification) {
        console.log('📧 Sending email verification...');
        console.log('User object:', user);
        console.log('User email:', user.email);
        console.log('User emailVerified:', user.emailVerified);
        
        try {
          await sendEmailVerification(user);
          console.log('✅ Email verification sent successfully');
          console.log('📧 Check your email (including spam folder) for the verification link');
        } catch (emailError: any) {
          console.error('❌ Failed to send email verification:', emailError);
          console.error('Email error code:', emailError.code);
          console.error('Email error message:', emailError.message);
          
          // Show user-friendly error
          toast({
            variant: 'destructive',
            title: 'Email verification failed',
            description: 'Failed to send verification email. Please try again or contact support.',
          });
        }
        
        // Store user data temporarily until email verification
        const pendingUserData = {
          name: values.name,
          email: values.email,
          countryCode: values.countryCode,
          mobile: values.mobile,
          invitedBy: inviteInfo?.from || null,
          inviteCode: inviteInfo?.code || null,
          registeredAt: new Date().toISOString(),
        };
        localStorage.setItem('pendingUserData', JSON.stringify(pendingUserData));
        console.log('💾 User data stored temporarily until email verification');
      } else {
        // For development mode, create user document immediately
        console.log('📄 Creating user document in Firestore (dev mode)...');
        await setDoc(doc(db, 'users', user.uid), {
          name: values.name,
          email: values.email,
          countryCode: values.countryCode,
          mobile: values.mobile,
          emailVerified: true,
          createdAt: new Date().toISOString(),
          invitedBy: inviteInfo?.from || null,
          inviteCode: inviteInfo?.code || null,
        });
        console.log('✅ User document created in Firestore');
      }

      // Log invite acceptance (optional - for analytics)
      if (inviteInfo) {
        console.log('User registered via invite:', {
          newUser: values.email,
          invitedBy: inviteInfo.from,
          inviteCode: inviteInfo.code
        });
        // In a production app, you might want to:
        // - Send a notification to the inviter
        // - Track referral analytics
        // - Award referral bonuses
      }

      if (shouldSkipVerification) {
        toast({
          title: inviteInfo ? '🎉 Welcome to SharePay!' : 'Account created!',
          description: inviteInfo 
            ? `Thanks for joining via ${inviteInfo.from}'s invitation! Development mode: Email verification skipped.`
            : 'Development mode: Email verification skipped.',
        });
        router.push('/dashboard');
      } else {
        toast({
          title: inviteInfo ? '🎉 Welcome to SharePay!' : 'Account created!',
          description: inviteInfo
            ? `Thanks for joining via ${inviteInfo.from}'s invitation! Please check your email to verify your account. If you don't see it within a few minutes, check your spam folder.`
            : 'Please check your email to verify your account. If you don\'t see it within a few minutes, check your spam folder.',
        });
        router.push('/verify-email');
      }

    } catch (error: any) {
      console.error('❌ Registration error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      let errorMessage = error.message;
      let toastTitle = 'Registration failed';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered. Please sign in instead.';
        toastTitle = 'Email already in use';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please choose a stronger password.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      }
      
      toast({
        variant: 'destructive',
        title: toastTitle,
        description: errorMessage,
      });
      
      // Don't redirect to dashboard on registration errors
      return;
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        {inviteInfo && (
          <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-center gap-2 text-blue-700 mb-1">
              <Gift className="h-4 w-4" />
              <span className="text-sm font-medium">You're Invited!</span>
            </div>
            <p className="text-xs text-blue-600">
              {inviteInfo.from} invited you to join SharePay
            </p>
          </div>
        )}
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          {inviteInfo && <UserPlus className="h-6 w-6 text-blue-500" />}
          Create an Account
        </CardTitle>
        <CardDescription>
          {inviteInfo 
            ? 'Join SharePay and start splitting expenses with your friends!' 
            : 'Enter your details to create a new account'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="John Doe"
                        {...field}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        placeholder="name@example.com"
                        {...field}
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              name="mobile"
              control={form.control}
              render={() => (
                <FormItem>
                  <FormLabel>Mobile</FormLabel>
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="countryCode"
                      render={({ field }) => (
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Code" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="+91">+91</SelectItem>
                            <SelectItem value="+1">+1</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormControl>
                          <Input placeholder="10 digit number" {...field} />
                        </FormControl>
                      )}
                    />
                  </div>
                  <FormMessage>
                    {form.formState.errors.mobile?.message}
                  </FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => {
                const passwordValue = field.value || '';
                const isValid = isPasswordValid(passwordValue);
                const shouldShowRules = isPasswordFocused || (!isValid && passwordValue.length > 0);
                
                return (
                  <FormItem>
                    <div className="flex items-center gap-2">
                      <FormLabel>Password</FormLabel>
                      {isValid && (
                        <Check className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <FormControl>
                      <PasswordInput 
                        placeholder="••••••••" 
                        {...field}
                        onFocus={() => setIsPasswordFocused(true)}
                        onBlur={() => setIsPasswordFocused(false)}
                      />
                    </FormControl>
                    {shouldShowRules && (
                      <PasswordRules password={passwordValue} />
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <PasswordInput placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {process.env.NODE_ENV === 'development' && (
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="force-verification" 
                  checked={forceEmailVerification}
                  onCheckedChange={(checked) => setForceEmailVerification(checked as boolean)}
                />
                <label 
                  htmlFor="force-verification" 
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Force email verification (for testing)
                </label>
              </div>
            )}
            <Button type="submit" className="w-full">
              Create Account
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Sign In
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
