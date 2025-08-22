'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { onAuthStateChanged, updateEmail, User, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '@sharepay/shared';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
import { User as UserIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getUserFriendlyErrorMessage, getErrorTitle } from '@sharepay/shared';
import { useRouter } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PasswordInput } from '@/components/password-input';
import { PasswordRules, isPasswordValid } from '@/components/password-rules';

const profileSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email.' }),
  countryCode: z.string(),
  mobile: z.string().refine((data) => /^\d{10}$/.test(data) || data === '', {
    message: 'Mobile must be 10 digits.',
  }),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, { message: 'Current password is required.' }),
    newPassword: z
      .string()
      .refine((password) => isPasswordValid(password), {
        message: 'Password must meet all requirements above.',
      }),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match.',
    path: ['confirmNewPassword'],
  });

export default function ProfilePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      email: '',
      countryCode: '+91',
      mobile: '',
    },
  });

  const passwordForm = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmNewPassword: '',
    },
  });

  const fetchUserData = async (firebaseUser: User) => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      const userData = userDoc.data();
      form.reset({
        name: userData.name || firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        countryCode: userData.countryCode || '+91',
        mobile: userData.mobile || '',
      });
    } else {
       // if the document doesn't exist, maybe it's a new user from Google Sign In
       // Let's create it.
       const userData = {
        name: firebaseUser.displayName || '',
        email: firebaseUser.email || '',
        countryCode: '',
        mobile: '',
       };
       await setDoc(userDocRef, userData);
       form.reset(userData);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserData(currentUser);
      } else {
        router.push('/login');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  async function checkMobileExists(countryCode: string, mobile: string, currentUserId: string) {
    if (!mobile) return false;
    
    const mobileQuery = query(
      collection(db, 'users'),
      where('countryCode', '==', countryCode),
      where('mobile', '==', mobile)
    );
    
    const querySnapshot = await getDocs(mobileQuery);
    // Check if mobile exists for a different user
    return querySnapshot.docs.some(doc => doc.id !== currentUserId);
  }

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'You must be logged in to update your profile.',
      });
      return;
    }

    try {
      // Check if mobile number already exists for another user
      if (values.mobile) {
        const mobileExists = await checkMobileExists(values.countryCode, values.mobile, user.uid);
        if (mobileExists) {
          toast({
            variant: 'destructive',
            title: 'Mobile number already exists',
            description: 'This mobile number is already registered by another user. Please use a different number.',
          });
          return;
        }
      }

      if (values.email !== user.email) {
        await updateEmail(user, values.email);
      }
      
      const userDocRef = doc(db, 'users', user.uid);
      await updateDoc(userDocRef, {
        name: values.name,
        countryCode: values.countryCode,
        mobile: values.mobile,
        email: values.email,
      });

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      });
      setIsEditing(false);
      await auth.currentUser?.reload();
      setUser(auth.currentUser);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: getErrorTitle('profile'),
        description: getUserFriendlyErrorMessage(error),
      });
    }
  }

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      fetchUserData(user);
    }
  };

  async function onPasswordSubmit(values: z.infer<typeof changePasswordSchema>) {
    if (!user || !user.email) {
      toast({
        variant: 'destructive',
        title: 'Not authenticated',
        description: 'You must be logged in to change your password.',
      });
      return;
    }

    try {
      // Re-authenticate user with current password
      const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, values.newPassword);

      toast({
        title: 'Password Changed',
        description: 'Your password has been updated successfully.',
      });
      
      setIsChangingPassword(false);
      passwordForm.reset();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Password change failed',
        description: getUserFriendlyErrorMessage(error),
      });
    }
  }

  const handlePasswordCancel = () => {
    setIsChangingPassword(false);
    passwordForm.reset();
  };

  if (loading) {
    return <p>Loading profile...</p>;
  }

  return (
    <div className="flex flex-col items-center py-12 space-y-6">
      {/* Profile Information Card */}
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>
              View and update your account details.
            </CardDescription>
          </div>
          {!isEditing && (
            <Button variant="outline" onClick={() => setIsEditing(true)}>
              Edit
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <FormLabel>Full Name</FormLabel>
                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="John Doe" {...field} className="pl-10" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{form.getValues('name') || 'Not provided'}</p>
                )}
              </div>
              <div className="space-y-2">
                <FormLabel>Email</FormLabel>
                {isEditing ? (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder="your.email@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{form.getValues('email')}</p>
                )}
              </div>
              <div className="space-y-2">
                <FormLabel>Mobile Number</FormLabel>
                {isEditing ? (
                  <div className="flex gap-2">
                    <FormField
                      control={form.control}
                      name="countryCode"
                      render={({ field }) => (
                        <FormItem>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!isEditing}
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
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="mobile"
                      render={({ field }) => (
                        <FormItem className="w-full">
                          <FormControl>
                            <Input
                              placeholder="10 digit number"
                              {...field}
                              readOnly={!isEditing}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {form.getValues('mobile') ? `${form.getValues('countryCode')} ${form.getValues('mobile')}` : 'Not provided'}
                  </p>
                )}
                 <FormMessage>
                    {form.formState.errors.mobile?.message}
                  </FormMessage>
              </div>

              {isEditing && (
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handleCancel}>
                    Cancel
                  </Button>
                  <Button type="submit">Update Profile</Button>
                </div>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Change Password Card */}
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account password with a strong new password.
            </CardDescription>
          </div>
          {!isChangingPassword && (
            <Button variant="outline" onClick={() => setIsChangingPassword(true)}>
              Change Password
            </Button>
          )}
        </CardHeader>
        {isChangingPassword && (
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => {
                    const passwordValue = field.value || '';
                    const isValid = isPasswordValid(passwordValue);
                    const shouldShowRules = isPasswordFocused || (!isValid && passwordValue.length > 0);
                    
                    return (
                      <FormItem>
                        <div className="flex items-center gap-2">
                          <FormLabel>New Password</FormLabel>
                          {isValid && (
                            <span className="text-green-600 text-sm">✓</span>
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
                  control={passwordForm.control}
                  name="confirmNewPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <PasswordInput placeholder="••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={handlePasswordCancel}>
                    Cancel
                  </Button>
                  <Button type="submit">Change Password</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
